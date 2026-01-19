/**
 * SpellCastingManager - Manages spell casting, cooldowns, and effect application
 *
 * Handles:
 * - Instant spell casts (castTime = 0)
 * - Multi-tick spell casts (castTime > 0)
 * - Casting state machine (begin, tick, complete, cancel)
 * - Cooldown tracking
 * - Effect application via SpellEffectExecutor
 * - Cost calculation and deduction
 *
 * Extracted from MagicSystem to reduce god object complexity.
 */

import type { World, Entity, EntityImpl } from '../../ecs/index.js';
import type { EventBus } from '../../events/EventBus.js';
import type { ManaPoolsComponent } from '../../components/ManaPoolsComponent.js';
import type { SpellKnowledgeComponent } from '../../components/SpellKnowledgeComponent.js';
import type { CastingStateComponent } from '../../components/CastingStateComponent.js';
import type { ParadigmStateComponent } from '../../components/ParadigmStateComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { SpiritualComponent } from '../../components/SpiritualComponent.js';
import type { BodyComponent } from '../../components/BodyComponent.js';
import type { MagicComponent, MagicSourceId, ComposedSpell } from '../../components/MagicComponent.js';
import type { CastingState } from '../../systems/CastingState.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { createCastingState, isCastingActive } from '../../systems/CastingState.js';
import { canCastSpell } from '../../components/MagicComponent.js';
import { SpellEffectExecutor } from '../SpellEffectExecutor.js';
import { SpellRegistry, type SpellDefinition } from '../SpellRegistry.js';
import { costCalculatorRegistry } from '../costs/CostCalculatorRegistry.js';
import { createDefaultContext, type CastingContext } from '../costs/CostCalculator.js';
import type { MagicParadigm } from '../MagicParadigm.js';

/**
 * Manages spell casting mechanics.
 *
 * Supports two casting modes:
 * 1. Instant casts (castTime = 0): Immediate effect
 * 2. Multi-tick casts (castTime > 0): Progressive casting with interruption
 */
export class SpellCastingManager {
  // Cooldown tracking: entityId -> { spellId -> tickWhenAvailable }
  private cooldowns: Map<string, Map<string, number>> = new Map();

  private effectExecutor: SpellEffectExecutor | null = null;
  private eventBus: EventBus | null = null;

  /**
   * Initialize the manager with effect executor and event bus.
   */
  initialize(effectExecutor: SpellEffectExecutor, eventBus: EventBus): void {
    this.effectExecutor = effectExecutor;
    this.eventBus = eventBus;
  }

  // =========================================================================
  // Main Spell Casting Entry Point
  // =========================================================================

  /**
   * Cast a spell from an entity.
   *
   * This is called externally (e.g., from an action or behavior)
   * Returns true if spell was cast successfully.
   *
   * @param caster The entity casting the spell
   * @param world The game world
   * @param spellId The spell to cast
   * @param targetEntityId Optional target entity ID
   * @param targetPosition Optional target position
   * @param manaDeductionCallback Callback to deduct mana (from ManaRegenerationManager)
   * @param proficiencyCallback Callback to update proficiency (from SpellProficiencyManager)
   * @param skillXPCallback Callback to grant XP (from SkillTreeManager)
   * @returns True if spell was cast successfully
   */
  castSpell(
    caster: EntityImpl,
    world: World,
    spellId: string,
    targetEntityId?: string,
    targetPosition?: { x: number; y: number },
    manaDeductionCallback?: (entity: EntityImpl, source: MagicSourceId, amount: number) => void,
    proficiencyCallback?: (entity: EntityImpl, knownSpell: { spellId: string }) => void,
    skillXPCallback?: (entity: EntityImpl, paradigmId: string, xpAmount: number) => void
  ): boolean {
    const magic = caster.getComponent<MagicComponent>(CT.Magic);
    if (!magic) {
      return false;
    }

    // Find the spell in SpellRegistry
    const spellRegistry = SpellRegistry.getInstance();
    const spell = spellRegistry.getSpell(spellId);
    if (!spell) {
      console.error(`[SpellCastingManager] Spell not found in registry: ${spellId}`);
      return false;
    }

    // Check if entity knows the spell
    const knownSpell = magic.knownSpells.find((s) => s.spellId === spellId);
    if (!knownSpell) {
      return false;
    }

    // Validate target entity exists if targetEntityId is provided
    if (targetEntityId) {
      const targetEntity = world.getEntity(targetEntityId);
      if (!targetEntity) {
        console.error(`[SpellCastingManager] Target entity not found: ${targetEntityId}`);
        return false;
      }
    }

    // Check cooldown
    if (this.isOnCooldown(caster.id, spellId, world.tick)) {
      return false;
    }

    // Handle multi-tick casts (castTime > 0)
    if (spell.castTime && spell.castTime > 0) {
      const castState = this.beginCast(caster, world, spell, targetEntityId, targetPosition);
      return castState !== null;
    }

    // Handle instant casts (castTime = 0 or undefined)
    return this.executeInstantCast(
      caster,
      world,
      spell,
      knownSpell,
      targetEntityId,
      targetPosition,
      manaDeductionCallback,
      proficiencyCallback,
      skillXPCallback
    );
  }

  // =========================================================================
  // Instant Cast Logic
  // =========================================================================

  /**
   * Execute an instant spell cast (castTime = 0).
   */
  private executeInstantCast(
    caster: EntityImpl,
    world: World,
    spell: SpellDefinition,
    knownSpell: { spellId: string },
    targetEntityId?: string,
    targetPosition?: { x: number; y: number },
    manaDeductionCallback?: (entity: EntityImpl, source: MagicSourceId, amount: number) => void,
    proficiencyCallback?: (entity: EntityImpl, knownSpell: { spellId: string }) => void,
    skillXPCallback?: (entity: EntityImpl, paradigmId: string, xpAmount: number) => void
  ): boolean {
    const magic = caster.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return false;

    // Build a ComposedSpell-compatible object for cost calculation
    const composedSpell: ComposedSpell = {
      id: spell.id,
      name: spell.name,
      technique: spell.technique,
      form: spell.form,
      source: spell.source,
      manaCost: spell.manaCost,
      castTime: spell.castTime,
      range: spell.range,
      duration: spell.duration,
      effectId: spell.effectId,
    };

    // Use paradigm-specific cost calculator if available
    const paradigmId = spell.paradigmId ?? 'academic';
    let deductionSuccess = false;
    let terminal = false;

    if (costCalculatorRegistry.has(paradigmId)) {
      // Create casting context with spiritual and body components
      const context: CastingContext = createDefaultContext(world.tick);
      context.casterId = caster.id;
      context.targetId = targetEntityId;
      context.spiritualComponent = caster.getComponent<SpiritualComponent>(CT.Spiritual);
      context.bodyComponent = caster.getComponent<BodyComponent>(CT.Body);

      try {
        const calculator = costCalculatorRegistry.get(paradigmId);

        // Calculate costs
        const costs = calculator.calculateCosts(composedSpell, magic, context);

        // Check affordability
        const affordability = calculator.canAfford(costs, magic);
        if (!affordability.canAfford) {
          return false;
        }

        // Warn about terminal effects
        if (affordability.wouldBeTerminal) {
          this.eventBus?.emit({
            type: 'magic:terminal_warning',
            source: caster.id,
            data: {
              spellId: spell.id,
              warning: affordability.warning,
            },
          });
          // Still allow casting - player chose to risk it
        }

        // Deduct costs using paradigm calculator
        // Create minimal paradigm interface for deduction
        const paradigmStub: Pick<MagicParadigm, 'id'> = { id: paradigmId };
        const result = calculator.deductCosts(costs, magic, paradigmStub as MagicParadigm);
        deductionSuccess = result.success;
        terminal = result.terminal;

        // Handle terminal effects
        if (result.terminal && result.terminalEffect) {
          this.eventBus?.emit({
            type: 'magic:terminal_effect',
            source: caster.id,
            data: {
              spellId: spell.id,
              effect: result.terminalEffect,
            },
          });
        }

        // Update the component with new resource values
        caster.updateComponent<MagicComponent>(CT.Magic, () => magic);
      } catch (e) {
        // Fall back to simple mana deduction
        const canCast = canCastSpell(magic, composedSpell);
        if (!canCast.canCast) {
          return false;
        }
        if (manaDeductionCallback) {
          manaDeductionCallback(caster, spell.source, spell.manaCost);
        }
        deductionSuccess = true;
      }
    } else {
      // No paradigm calculator - use simple mana deduction
      const canCast = canCastSpell(magic, composedSpell);
      if (!canCast.canCast) {
        return false;
      }
      if (manaDeductionCallback) {
        manaDeductionCallback(caster, spell.source, spell.manaCost);
      }
      deductionSuccess = true;
    }

    if (!deductionSuccess) {
      return false;
    }

    // Apply cooldown
    this.setCooldown(caster.id, spell.id, world.tick + spell.castTime);

    // Increment proficiency and cast count
    if (proficiencyCallback) {
      proficiencyCallback(caster, knownSpell);
    }

    // Apply spell effect using the effect executor
    this.applySpellEffect(caster, spell, world, targetEntityId, targetPosition);

    // Emit event
    this.eventBus?.emit({
      type: 'magic:spell_cast',
      source: caster.id,
      data: {
        spellId: spell.id,
        spell: spell.name,
        technique: spell.technique,
        form: spell.form,
        paradigm: paradigmId,
        manaCost: spell.manaCost,
        targetEntityId,
        targetPosition,
        wasTerminal: terminal,
      },
    });

    // Increment total spells cast
    caster.updateComponent<MagicComponent>(CT.Magic, (current) => ({
      ...current,
      totalSpellsCast: current.totalSpellsCast + 1,
    }));

    // Grant skill tree XP for casting (based on mana cost)
    if (skillXPCallback) {
      const xpGained = Math.ceil(spell.manaCost * 0.1); // 10% of mana cost as XP
      skillXPCallback(caster, paradigmId, xpGained);
    }

    return true;
  }

  // =========================================================================
  // Multi-Tick Casting State Machine
  // =========================================================================

  /**
   * Begin a multi-tick spell cast.
   * Locks resources immediately and creates a CastingState to track progress.
   *
   * @param caster The entity casting the spell
   * @param world The game world
   * @param spell The spell being cast
   * @param targetEntityId Optional target entity ID
   * @param targetPosition Optional target position
   * @returns The casting state, or null if cast failed to start
   */
  private beginCast(
    caster: EntityImpl,
    world: World,
    spell: SpellDefinition,
    targetEntityId?: string,
    targetPosition?: { x: number; y: number }
  ): CastingState | null {
    const magic = caster.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return null;

    // Build a ComposedSpell for cost calculation
    const composedSpell: ComposedSpell = {
      id: spell.id,
      name: spell.name,
      technique: spell.technique,
      form: spell.form,
      source: spell.source,
      manaCost: spell.manaCost,
      castTime: spell.castTime,
      range: spell.range,
      duration: spell.duration,
      effectId: spell.effectId,
    };

    // Use paradigm-specific cost calculator
    const paradigmId = spell.paradigmId ?? 'academic';

    if (!costCalculatorRegistry.has(paradigmId)) {
      console.error(`[SpellCastingManager] No cost calculator for paradigm: ${paradigmId}`);
      return null;
    }

    const calculator = costCalculatorRegistry.get(paradigmId);

    // Create casting context
    const context: CastingContext = createDefaultContext(world.tick);
    context.casterId = caster.id;
    context.targetId = targetEntityId;
    context.spiritualComponent = caster.getComponent<SpiritualComponent>(CT.Spiritual);
    context.bodyComponent = caster.getComponent<BodyComponent>(CT.Body);

    // Calculate costs
    const costs = calculator.calculateCosts(composedSpell, magic, context);

    // Check affordability
    const affordability = calculator.canAfford(costs, magic);
    if (!affordability.canAfford) {
      return null;
    }

    // Lock resources (if calculator supports it)
    let lockedCosts = costs;
    if (calculator.lockCosts) {
      const lockResult = calculator.lockCosts(costs, magic);
      if (!lockResult.success) {
        console.error('[SpellCastingManager] Failed to lock resources for cast');
        return null;
      }
      lockedCosts = lockResult.deducted;
    } else {
      // Fallback: use regular deduction (no locking)
      // Create minimal paradigm interface for deduction
      const paradigmStub: Pick<MagicParadigm, 'id'> = { id: paradigmId };
      const deductResult = calculator.deductCosts(costs, magic, paradigmStub as MagicParadigm);
      if (!deductResult.success) {
        return null;
      }
      lockedCosts = deductResult.deducted;
    }

    // Get caster position for movement interruption tracking
    const position = caster.getComponent<PositionComponent>(CT.Position);

    // Create casting state
    const castState = createCastingState(
      spell.id,
      caster.id,
      spell.castTime,
      world.tick,
      lockedCosts,
      targetEntityId,
      targetPosition,
      position ? { x: position.x, y: position.y } : undefined
    );

    // Update magic component with casting state AND persisted locked resources
    // The lockCosts() call above mutated the magic object, so we need to preserve those changes
    caster.updateComponent<MagicComponent>(CT.Magic, () => ({
      ...magic,
      casting: true,
      currentSpellId: spell.id,
      castProgress: 0,
      castingState: castState,
    }));

    return castState;
  }

  /**
   * Tick an active cast forward by one tick.
   * Checks for interruption conditions and updates progress.
   *
   * @param castState The casting state to tick
   * @param caster The caster entity
   * @param world The game world
   * @param proficiencyCallback Callback to update proficiency
   * @param skillXPCallback Callback to grant XP
   */
  tickCast(
    castState: CastingState,
    caster: EntityImpl,
    world: World,
    proficiencyCallback?: (entity: EntityImpl, knownSpell: { spellId: string }) => void,
    skillXPCallback?: (entity: EntityImpl, paradigmId: string, xpAmount: number) => void
  ): void {
    // Don't tick if already failed or completed
    if (!isCastingActive(castState)) return;

    const magic = caster.getComponent<MagicComponent>(CT.Magic);
    if (!magic) {
      this.cancelCast(castState, caster, 'caster_lost_magic');
      return;
    }

    // Check interruption conditions

    // 1. Check if caster died
    const needs = caster.getComponent<NeedsComponent>(CT.Needs);
    if (needs && needs.health <= 0) {
      this.cancelCast(castState, caster, 'caster_died');
      return;
    }

    // 2. Check if caster moved (if tracking movement)
    if (castState.casterMovedFrom) {
      const currentPos = caster.getComponent<PositionComponent>(CT.Position);
      if (currentPos) {
        const dx = currentPos.x - castState.casterMovedFrom.x;
        const dy = currentPos.y - castState.casterMovedFrom.y;
        const distSquared = dx * dx + dy * dy;

        // Interrupt if moved more than 1 tile
        if (distSquared > 1) {
          this.cancelCast(castState, caster, 'movement_interrupted');
          return;
        }
      }
    }

    // 3. Check if resources were depleted externally during cast
    // We check BOTH conditions:
    // - For manaPools: current < locked (detects partial depletion)
    // - For all pools: current < 0 (detects over-depletion)
    for (const cost of castState.lockedResources) {
      if (cost.type === 'mana') {
        // For mana, check manaPools with the stricter "current < locked" rule
        // This matches test expectations for mana-specific depletion detection
        if (magic.manaPools && magic.manaPools.length > 0) {
          const manaPool = magic.manaPools.find(
            p => p.source === magic.primarySource || p.source === 'arcane'
          );
          if (manaPool && manaPool.current < manaPool.locked) {
            this.cancelCast(castState, caster, 'resource_depleted_during_cast');
            return;
          }
        }
        continue;
      }

      // Non-mana costs: only cancel if went negative (over-depleted)
      // This is more permissive than mana since we expect current < locked after locking
      const pool = magic.resourcePools[cost.type];
      if (pool && pool.current < 0) {
        this.cancelCast(castState, caster, 'resource_depleted_during_cast');
        return;
      }
    }

    // 4. Check if target entity still exists (if targeting an entity)
    if (castState.targetEntityId) {
      const targetEntity = world.getEntity(castState.targetEntityId);
      if (!targetEntity) {
        this.cancelCast(castState, caster, 'target_lost');
        return;
      }

      // Check if target died
      const targetNeeds = targetEntity.getComponent<NeedsComponent>(CT.Needs);
      if (targetNeeds && targetNeeds.health <= 0) {
        this.cancelCast(castState, caster, 'target_died');
        return;
      }
    }

    // No interruptions - increment progress
    castState.progress++;

    // Update cast progress percentage
    const progressPercent = castState.duration > 0 ? castState.progress / castState.duration : 1;
    caster.updateComponent<MagicComponent>(CT.Magic, (current) => ({
      ...current,
      castProgress: progressPercent,
    }));

    // Check if cast completed
    if (castState.progress >= castState.duration) {
      this.completeCast(castState, caster, world, proficiencyCallback, skillXPCallback);
    }
  }

  /**
   * Complete a successful cast.
   * Unlocks resources and applies spell effects.
   *
   * @param castState The casting state
   * @param caster The caster entity
   * @param world The game world
   * @param proficiencyCallback Callback to update proficiency
   * @param skillXPCallback Callback to grant XP
   */
  private completeCast(
    castState: CastingState,
    caster: EntityImpl,
    world: World,
    proficiencyCallback?: (entity: EntityImpl, knownSpell: { spellId: string }) => void,
    skillXPCallback?: (entity: EntityImpl, paradigmId: string, xpAmount: number) => void
  ): void {
    castState.completed = true;

    const magic = caster.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return;

    // Unlock resources (they've already been spent)
    const paradigmId = magic.activeParadigmId ?? 'academic';
    if (costCalculatorRegistry.has(paradigmId)) {
      const calculator = costCalculatorRegistry.get(paradigmId);

      // Unlock without restoring (resources were consumed)
      for (const cost of castState.lockedResources) {
        // For mana costs, unlock in both resourcePools and manaPools (dual sync)
        if (cost.type === 'mana') {
          // Unlock in resourcePool.mana if it exists
          const pool = magic.resourcePools[cost.type];
          if (pool) {
            pool.locked = Math.max(0, pool.locked - cost.amount);
          }

          // ALSO unlock in manaPools if it exists
          if (magic.manaPools) {
            const manaPool = magic.manaPools.find(
              p => p.source === magic.primarySource || p.source === 'arcane'
            );
            if (manaPool) {
              manaPool.locked = Math.max(0, manaPool.locked - cost.amount);
            }
          }
        } else {
          // Non-mana costs: just unlock from resourcePools
          const pool = magic.resourcePools[cost.type];
          if (pool) {
            pool.locked = Math.max(0, pool.locked - cost.amount);
          }
        }
      }
    }

    // Apply spell effect
    const spellRegistry = SpellRegistry.getInstance();
    const spell = spellRegistry.getSpell(castState.spellId);
    if (spell) {
      this.applySpellEffect(
        caster,
        spell,
        world,
        castState.targetEntityId,
        castState.targetPosition
      );

      // Emit spell cast event
      this.eventBus?.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: spell.id,
          spell: spell.name,
          technique: spell.technique,
          form: spell.form,
          paradigm: paradigmId,
          manaCost: spell.manaCost,
          targetEntityId: castState.targetEntityId,
          targetPosition: castState.targetPosition,
          wasTerminal: false,
        },
      });

      // Update proficiency
      const knownSpell = magic.knownSpells.find((s) => s.spellId === spell.id);
      if (knownSpell && proficiencyCallback) {
        proficiencyCallback(caster, knownSpell);
      }

      // Grant skill tree XP
      if (skillXPCallback) {
        const xpGained = Math.ceil(spell.manaCost * 0.1);
        skillXPCallback(caster, paradigmId, xpGained);
      }

      // Increment total spells cast
      caster.updateComponent<MagicComponent>(CT.Magic, (current) => ({
        ...current,
        totalSpellsCast: current.totalSpellsCast + 1,
      }));
    }

    // Clear casting state
    caster.updateComponent<MagicComponent>(CT.Magic, (current) => ({
      ...current,
      casting: false,
      currentSpellId: undefined,
      castProgress: undefined,
      castingState: null,
    }));
  }

  /**
   * Cancel an active cast and restore locked resources.
   *
   * @param castState The casting state
   * @param caster The caster entity
   * @param reason The reason for cancellation
   */
  private cancelCast(castState: CastingState, caster: EntityImpl, reason: string): void {
    castState.failed = true;
    castState.failureReason = reason;

    const magic = caster.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return;

    // Restore locked resources
    const paradigmId = magic.activeParadigmId ?? 'academic';
    if (costCalculatorRegistry.has(paradigmId)) {
      const calculator = costCalculatorRegistry.get(paradigmId);
      if (calculator.restoreLockedCosts) {
        calculator.restoreLockedCosts(castState.lockedResources, magic);
      }
    }

    // Clear casting state
    caster.updateComponent<MagicComponent>(CT.Magic, (current) => ({
      ...current,
      casting: false,
      currentSpellId: undefined,
      castProgress: undefined,
      castingState: null,
    }));

    // Emit cancellation event
    this.eventBus?.emit({
      type: 'magic:cast_cancelled',
      source: caster.id,
      data: {
        spellId: castState.spellId,
        reason,
        progress: castState.progress,
        duration: castState.duration,
      },
    });
  }

  /**
   * Tick all active casts forward.
   * Called by MagicSystem.update() each tick.
   *
   * @param world The game world
   * @param proficiencyCallback Callback to update proficiency
   * @param skillXPCallback Callback to grant XP
   */
  tickAllActiveCasts(
    world: World,
    proficiencyCallback?: (entity: EntityImpl, knownSpell: { spellId: string }) => void,
    skillXPCallback?: (entity: EntityImpl, paradigmId: string, xpAmount: number) => void
  ): void {
    // Find all entities currently casting
    const castingEntities = world.query()
      .with(CT.Magic)
      .executeEntities()
      .filter(entity => {
        const magic = (entity as EntityImpl).getComponent<MagicComponent>(CT.Magic);
        return magic?.casting && magic?.castingState;
      });

    // Tick each active cast
    for (const entity of castingEntities) {
      const impl = entity as EntityImpl;
      const magic = impl.getComponent<MagicComponent>(CT.Magic);
      if (magic?.castingState) {
        this.tickCast(magic.castingState, impl, world, proficiencyCallback, skillXPCallback);
      }
    }
  }

  // =========================================================================
  // Effect Application
  // =========================================================================

  /**
   * Apply spell effect to target(s).
   *
   * Uses the SpellEffectExecutor to apply effects based on spell.effectId.
   * The executor delegates to category-specific appliers (damage, healing, etc.)
   *
   * @param caster The caster entity
   * @param spell The spell definition
   * @param world The game world
   * @param targetEntityId Optional target entity ID
   * @param _targetPosition Optional target position (currently unused)
   */
  private applySpellEffect(
    caster: EntityImpl,
    spell: SpellDefinition,
    world: World,
    targetEntityId?: string,
    _targetPosition?: { x: number; y: number }
  ): void {
    if (!this.effectExecutor) {
      console.error('[SpellCastingManager] Effect executor not initialized');
      return;
    }

    if (!spell.effectId) {
      // Spell has no effect - might be a passive or utility spell
      return;
    }

    // Determine target entity
    let target: Entity;
    if (targetEntityId) {
      const targetEntity = world.getEntity(targetEntityId);
      if (!targetEntity) {
        console.error(`[SpellCastingManager] Target entity not found: ${targetEntityId}`);
        return;
      }
      target = targetEntity;
    } else {
      // Self-targeting spell
      target = caster;
    }

    // Execute the effect using the effect executor
    const result = this.effectExecutor.executeEffect(
      spell.effectId,
      caster,
      target,
      spell,
      world,
      world.tick,
      1.0 // Power multiplier (could be modified by combos, etc.)
    );

    if (!result.success) {
      console.error(`[SpellCastingManager] Failed to apply effect: ${result.error}`);
    }
  }

  // =========================================================================
  // Cooldown Management
  // =========================================================================

  /**
   * Check if a spell is on cooldown.
   *
   * @param entityId The entity ID
   * @param spellId The spell ID
   * @param currentTick The current game tick
   * @returns True if spell is on cooldown
   */
  private isOnCooldown(entityId: string, spellId: string, currentTick: number): boolean {
    const entityCooldowns = this.cooldowns.get(entityId);
    if (!entityCooldowns) return false;

    const availableTick = entityCooldowns.get(spellId);
    if (!availableTick) return false;

    return currentTick < availableTick;
  }

  /**
   * Set cooldown for a spell.
   *
   * @param entityId The entity ID
   * @param spellId The spell ID
   * @param availableTick The tick when spell will be available again
   */
  private setCooldown(entityId: string, spellId: string, availableTick: number): void {
    if (!this.cooldowns.has(entityId)) {
      this.cooldowns.set(entityId, new Map());
    }

    this.cooldowns.get(entityId)!.set(spellId, availableTick);
  }

  // =========================================================================
  // Public API (for queries)
  // =========================================================================

  /**
   * Check if a spell is on cooldown (public API).
   */
  public checkCooldown(entityId: string, spellId: string, currentTick: number): boolean {
    return this.isOnCooldown(entityId, spellId, currentTick);
  }
}
