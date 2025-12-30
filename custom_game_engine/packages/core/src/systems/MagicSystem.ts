/**
 * MagicSystem - Processes spell casting and magic effects
 *
 * Integrates the magic infrastructure (MagicComponent, MagicParadigm, etc.)
 * into the actual game loop. Handles:
 * - Mana regeneration
 * - Cooldown tracking
 * - Spell casting (via external calls from behaviors/actions)
 * - Effect application
 * - Paradigm-specific rules
 *
 * Part of Phase 30: Magic System
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type {
  MagicComponent,
  ComposedSpell,
  MagicSourceId,
} from '../components/MagicComponent.js';
import { getAvailableMana, canCastSpell } from '../components/MagicComponent.js';
import type { EventBus } from '../events/EventBus.js';
import { SpellEffectExecutor } from '../magic/SpellEffectExecutor.js';
import { SpellRegistry, type SpellDefinition } from '../magic/SpellRegistry.js';
import { initializeMagicSystem as initMagicInfrastructure } from '../magic/InitializeMagicSystem.js';
import { costCalculatorRegistry } from '../magic/costs/CostCalculatorRegistry.js';
import { createDefaultContext, type CastingContext } from '../magic/costs/CostCalculator.js';
import { costRecoveryManager } from '../magic/costs/CostRecoveryManager.js';

/**
 * MagicSystem - Process magic casting and effects
 *
 * Priority: 15 (after AgentBrain at 10, before Movement at 20)
 */
export class MagicSystem implements System {
  public readonly id: SystemId = 'magic';
  public readonly priority = 15;
  public readonly requiredComponents = [CT.Magic] as const;

  private world: World | null = null;
  private initialized = false;

  // Cooldown tracking: entityId -> { spellId -> tickWhenAvailable }
  private cooldowns: Map<string, Map<string, number>> = new Map();

  // Effect executor for applying spell effects
  private effectExecutor: SpellEffectExecutor | null = null;

  initialize(world: World, _eventBus: EventBus): void {
    this.world = world;

    // Initialize magic infrastructure (effect appliers, registries, etc.)
    if (!this.initialized) {
      initMagicInfrastructure();
      this.effectExecutor = SpellEffectExecutor.getInstance();
      this.initialized = true;
    }

    // Subscribe to spell learning events
    world.eventBus.subscribe('magic:spell_learned', (event) => {
      const { entityId, spellId } = event.data;
      const entity = world.getEntity(entityId);
      if (entity) {
        this.learnSpell(entity as EntityImpl, spellId, 0);
      }
    });

    // Subscribe to mana grant events (divine intervention, testing, etc.)
    world.eventBus.subscribe('magic:grant_mana', (event) => {
      const { entityId, source, amount } = event.data;
      const entity = world.getEntity(entityId);
      if (entity) {
        this.grantMana(entity as EntityImpl, source, amount);
      }
    });
  }

  /**
   * Update - process mana regeneration, cooldowns, and active effects
   */
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      this.processMagicEntity(impl, world, deltaTime);
    }

    // Process active spell effects (duration, ticks, expiration)
    if (this.effectExecutor) {
      this.effectExecutor.processTick(world, world.tick);
    }
  }

  /**
   * Process a single entity with magic
   */
  private processMagicEntity(entity: EntityImpl, _world: World, deltaTime: number): void {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic || !magic.magicUser) return;

    // Use CostRecoveryManager for all resource regeneration
    this.applyMagicRegeneration(entity, magic, deltaTime);
  }

  /**
   * Apply passive regeneration using CostRecoveryManager.
   * Handles both mana pools and paradigm-specific resource pools.
   */
  private applyMagicRegeneration(entity: EntityImpl, magic: MagicComponent, deltaTime: number): void {
    // Clone the magic component to apply changes
    const updatedMagic = { ...magic };

    // Deep clone mana pools and resource pools for mutation
    updatedMagic.manaPools = magic.manaPools.map(pool => ({ ...pool }));
    updatedMagic.resourcePools = { ...magic.resourcePools };
    for (const key of Object.keys(updatedMagic.resourcePools)) {
      const pool = updatedMagic.resourcePools[key as keyof typeof updatedMagic.resourcePools];
      if (pool) {
        updatedMagic.resourcePools[key as keyof typeof updatedMagic.resourcePools] = { ...pool };
      }
    }

    // Apply passive regeneration via CostRecoveryManager
    costRecoveryManager.applyPassiveRegeneration(updatedMagic, deltaTime);

    // Check if anything changed
    const manaChanged = magic.manaPools.some((pool, i) =>
      pool.current !== updatedMagic.manaPools[i]?.current
    );

    const resourceChanged = Object.keys(magic.resourcePools).some(key => {
      const oldPool = magic.resourcePools[key as keyof typeof magic.resourcePools];
      const newPool = updatedMagic.resourcePools[key as keyof typeof updatedMagic.resourcePools];
      return oldPool?.current !== newPool?.current;
    });

    if (manaChanged || resourceChanged) {
      entity.updateComponent<MagicComponent>(CT.Magic, () => updatedMagic);
    }
  }

  /**
   * Cast a spell from an entity
   *
   * This is called externally (e.g., from an action or behavior)
   * Returns true if spell was cast successfully
   */
  castSpell(
    caster: EntityImpl,
    world: World,
    spellId: string,
    targetEntityId?: string,
    targetPosition?: { x: number; y: number }
  ): boolean {
    const magic = caster.getComponent<MagicComponent>(CT.Magic);
    if (!magic) {
      return false;
    }

    // Find the spell in SpellRegistry
    const spellRegistry = SpellRegistry.getInstance();
    const spell = spellRegistry.getSpell(spellId);
    if (!spell) {
      console.error(`[MagicSystem] Spell not found in registry: ${spellId}`);
      return false;
    }

    // Check if entity knows the spell
    const knownSpell = magic.knownSpells.find((s) => s.spellId === spellId);
    if (!knownSpell) {
      return false;
    }

    // Check cooldown
    if (this.isOnCooldown(caster.id, spellId, world.tick)) {
      return false;
    }

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
      // Create casting context
      const context: CastingContext = createDefaultContext(world.tick);
      context.casterId = caster.id;
      context.targetId = targetEntityId;

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
          world.eventBus.emit({
            type: 'magic:terminal_warning',
            source: caster.id,
            data: {
              spellId,
              warning: affordability.warning,
            },
          });
          // Still allow casting - player chose to risk it
        }

        // Deduct costs using paradigm calculator
        const result = calculator.deductCosts(costs, magic, { id: paradigmId } as any);
        deductionSuccess = result.success;
        terminal = result.terminal;

        // Handle terminal effects
        if (result.terminal && result.terminalEffect) {
          world.eventBus.emit({
            type: 'magic:terminal_effect',
            source: caster.id,
            data: {
              spellId,
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
        this.deductMana(caster, spell.source, spell.manaCost);
        deductionSuccess = true;
      }
    } else {
      // No paradigm calculator - use simple mana deduction
      const canCast = canCastSpell(magic, composedSpell);
      if (!canCast.canCast) {
        return false;
      }
      this.deductMana(caster, spell.source, spell.manaCost);
      deductionSuccess = true;
    }

    if (!deductionSuccess) {
      return false;
    }

    // Apply cooldown
    this.setCooldown(caster.id, spellId, world.tick + spell.castTime);

    // Increment proficiency and cast count
    this.updateSpellProficiency(caster, knownSpell);

    // Apply spell effect using the effect executor
    this.applySpellEffect(caster, spell, world, targetEntityId, targetPosition);

    // Emit event
    world.eventBus.emit({
      type: 'magic:spell_cast',
      source: caster.id,
      data: {
        spellId,
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

    return true;
  }

  /**
   * Deduct mana from a specific pool
   */
  private deductMana(entity: EntityImpl, source: MagicSourceId, amount: number): void {
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const updatedPools = current.manaPools.map((pool) => {
        if (pool.source === source) {
          return {
            ...pool,
            current: Math.max(0, pool.current - amount),
          };
        }
        return pool;
      });

      return {
        ...current,
        manaPools: updatedPools,
      };
    });
  }

  /**
   * Check if a spell is on cooldown
   */
  private isOnCooldown(entityId: string, spellId: string, currentTick: number): boolean {
    const entityCooldowns = this.cooldowns.get(entityId);
    if (!entityCooldowns) return false;

    const availableTick = entityCooldowns.get(spellId);
    if (!availableTick) return false;

    return currentTick < availableTick;
  }

  /**
   * Set cooldown for a spell
   */
  private setCooldown(entityId: string, spellId: string, availableTick: number): void {
    if (!this.cooldowns.has(entityId)) {
      this.cooldowns.set(entityId, new Map());
    }

    this.cooldowns.get(entityId)!.set(spellId, availableTick);
  }

  /**
   * Update spell proficiency after casting
   */
  private updateSpellProficiency(caster: EntityImpl, knownSpell: { spellId: string }): void {
    caster.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const updated = current.knownSpells.map((s) => {
        if (s.spellId === knownSpell.spellId) {
          return {
            ...s,
            timesCast: s.timesCast + 1,
            proficiency: Math.min(100, s.proficiency + 0.5), // Gain 0.5 proficiency per cast
            lastCast: this.world?.tick,
          };
        }
        return s;
      });

      return {
        ...current,
        knownSpells: updated,
      };
    });
  }

  /**
   * Apply spell effect to target(s)
   *
   * Uses the SpellEffectExecutor to apply effects based on spell.effectId.
   * The executor delegates to category-specific appliers (damage, healing, etc.)
   */
  private applySpellEffect(
    caster: EntityImpl,
    spell: SpellDefinition,
    world: World,
    targetEntityId?: string,
    _targetPosition?: { x: number; y: number }
  ): void {
    if (!this.effectExecutor) {
      console.error('[MagicSystem] Effect executor not initialized');
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
        console.error(`[MagicSystem] Target entity not found: ${targetEntityId}`);
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
      console.error(`[MagicSystem] Failed to apply effect: ${result.error}`);
    }
  }

  /**
   * Learn a new spell
   */
  learnSpell(entity: EntityImpl, spellId: string, initialProficiency: number = 0): boolean {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return false;

    // Check if already known
    if (magic.knownSpells.some((s) => s.spellId === spellId)) {
      return false;
    }

    // Add to known spells
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
      ...current,
      knownSpells: [
        ...current.knownSpells,
        {
          spellId,
          proficiency: initialProficiency,
          timesCast: 0,
        },
      ],
    }));

    return true;
  }

  /**
   * Grant mana to an entity (for testing, or divine intervention)
   */
  grantMana(entity: EntityImpl, source: MagicSourceId, amount: number): void {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return;

    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const updatedPools = current.manaPools.map((pool) => {
        if (pool.source === source) {
          return {
            ...pool,
            current: Math.min(pool.maximum, pool.current + amount),
          };
        }
        return pool;
      });

      return {
        ...current,
        manaPools: updatedPools,
      };
    });
  }

  /**
   * Register a spell in the spell registry.
   * Delegates to SpellRegistry for centralized spell management.
   */
  registerSpell(spell: SpellDefinition): void {
    SpellRegistry.getInstance().register(spell);
  }

  /**
   * Get available mana for a specific source
   */
  getAvailableMana(entity: Entity, source: MagicSourceId): number {
    const magic = (entity as EntityImpl).getComponent<MagicComponent>(CT.Magic);
    if (!magic) return 0;
    return getAvailableMana(magic, source);
  }

  /**
   * Get active effects on an entity
   */
  getActiveEffects(entityId: string): string[] {
    if (!this.effectExecutor) return [];
    return this.effectExecutor.getActiveEffects(entityId).map(e => e.effectId);
  }

  /**
   * Dispel a specific effect from an entity
   */
  dispelEffect(entityId: string, effectInstanceId: string, dispellerId: string): boolean {
    if (!this.effectExecutor || !this.world) return false;
    return this.effectExecutor.dispelEffect(entityId, effectInstanceId, dispellerId, this.world);
  }
}
