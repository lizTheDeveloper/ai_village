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

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type {
  MagicComponent,
  ComposedSpell,
  MagicSourceId,
} from '../components/MagicComponent.js';
import type { CastingState } from './CastingState.js';
import { createCastingState, isCastingActive } from './CastingState.js';
import { getAvailableMana, canCastSpell } from '../components/MagicComponent.js';
import type { EventBus } from '../events/EventBus.js';
import { SpellEffectExecutor } from '../magic/SpellEffectExecutor.js';
import { SpellRegistry, type SpellDefinition } from '../magic/SpellRegistry.js';
import { initializeMagicSystem as initMagicInfrastructure, getTerminalEffectHandler } from '../magic/InitializeMagicSystem.js';
import { costCalculatorRegistry } from '../magic/costs/CostCalculatorRegistry.js';
import { createDefaultContext, type CastingContext } from '../magic/costs/CostCalculator.js';
import { costRecoveryManager } from '../magic/costs/CostRecoveryManager.js';
import { MagicSkillTreeRegistry } from '../magic/MagicSkillTreeRegistry.js';
import { evaluateNode, type EvaluationContext } from '../magic/MagicSkillTreeEvaluator.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { BodyComponent } from '../components/BodyComponent.js';
import type { StateMutatorSystem } from './StateMutatorSystem.js';
import type { MagicParadigm } from '../magic/MagicParadigm.js';

/**
 * MagicSystem - Process magic casting and effects
 *
 * Priority: 15 (after AgentBrain at 10, before Movement at 20)
 */
export class MagicSystem extends BaseSystem {
  public readonly id: SystemId = 'magic';
  public readonly priority = 15;
  public readonly requiredComponents = [CT.Magic] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private initialized = false;

  // Cooldown tracking: entityId -> { spellId -> tickWhenAvailable }
  private cooldowns: Map<string, Map<string, number>> = new Map();

  // Effect executor for applying spell effects
  private effectExecutor: SpellEffectExecutor | null = null;

  // Skill tree registry for progression-gated spells
  private skillTreeRegistry: MagicSkillTreeRegistry | null = null;

  // StateMutatorSystem for gradual effects
  private stateMutatorSystem: StateMutatorSystem | null = null;

  protected onInitialize(world: World, eventBus: EventBus): void {
    // Initialize magic infrastructure (effect appliers, registries, etc.)
    if (!this.initialized) {
      // Pass world to enable terminal effect handling
      initMagicInfrastructure(world);
      this.effectExecutor = SpellEffectExecutor.getInstance();
      this.skillTreeRegistry = MagicSkillTreeRegistry.getInstance();
      this.initialized = true;

      // Initialize terminal effect handler with event bus
      const terminalHandler = getTerminalEffectHandler();
      if (terminalHandler) {
        terminalHandler.initialize(eventBus);
      }

      // Get StateMutatorSystem from world for gradual effects
      this.stateMutatorSystem = world.getSystem('state_mutator') as StateMutatorSystem | null;

      // Get FireSpreadSystem for fire ignition effects
      const fireSpreadSystem = world.getSystem('fire_spread');

      // Pass to effect executor
      if (this.effectExecutor && this.stateMutatorSystem) {
        this.effectExecutor.setStateMutatorSystem(this.stateMutatorSystem);
      }
      if (this.effectExecutor && fireSpreadSystem) {
        this.effectExecutor.setFireSpreadSystem(fireSpreadSystem);
      }
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

    // Subscribe to skill tree node unlock events
    world.eventBus.subscribe<'magic:skill_node_unlocked'>('magic:skill_node_unlocked', (event) => {
      const { agentId, skillTree, nodeId } = event.data;
      const entity = world.getEntity(agentId);
      if (entity) {
        this.handleSkillNodeUnlocked(entity as EntityImpl, skillTree, nodeId);
      }
    });

    // Subscribe to skill tree XP grant events (custom event not in EventMap)
    // Note: 'magic:grant_skill_xp' is not defined in EventMap, so we handle the type mismatch
    // by using a type assertion on the handler's event data
    world.eventBus.subscribe('magic:grant_skill_xp' as keyof import('../events/EventMap.js').GameEventMap, (event) => {
      const data = event.data as unknown as { entityId: string; paradigmId: string; xpAmount: number };
      const { entityId, paradigmId, xpAmount } = data;
      const entity = world.getEntity(entityId);
      if (entity) {
        this.grantSkillXP(entity as EntityImpl, paradigmId, xpAmount);
      }
    });

    // Subscribe to spell_cast events for XP tracking and statistics
    world.eventBus.subscribe('magic:spell_cast', (event) => {
      // Get the caster entity from the event source
      const casterId = event.source;
      if (typeof casterId !== 'string') return;

      const caster = world.getEntity(casterId);
      if (!caster) return;

      const { paradigm, manaCost } = event.data;
      const paradigmId = paradigm ?? 'academic';

      // Grant skill tree XP based on spell cost
      const xpGained = Math.ceil((manaCost ?? 10) * 0.1);
      this.grantSkillXP(caster as EntityImpl, paradigmId, xpGained);

      // Update spell proficiency
      this.incrementSpellProficiency(caster as EntityImpl, event.data.spellId);
    });

    // Subscribe to prayer:answered events to unlock divine spells for faithful believers
    world.eventBus.subscribe('prayer:answered', (event) => {
      const { agentId, deityId, responseType } = event.data;
      const agent = world.getEntity(agentId);
      if (!agent) return;

      // Handle divine spell unlocks for the faithful
      this.handlePrayerAnswered(agent as EntityImpl, deityId, responseType);
    });
  }

  /**
   * Increment proficiency for a spell after casting.
   */
  private incrementSpellProficiency(entity: EntityImpl, spellId: string): void {
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const knownSpells = current.knownSpells.map(spell => {
        if (spell.spellId === spellId) {
          return {
            ...spell,
            timesCast: spell.timesCast + 1,
            proficiency: Math.min(100, spell.proficiency + 0.5), // Slow increase
            lastCast: this.world?.tick,
          };
        }
        return spell;
      });
      return {
        ...current,
        knownSpells,
        totalSpellsCast: current.totalSpellsCast + 1,
      };
    });
  }

  /**
   * Handle a prayer being answered - potentially unlock divine spells for the believer.
   *
   * Faith thresholds for spell unlocks:
   * - 0.3 faith: divine_heal (basic healing)
   * - 0.5 faith: divine_blessing (protection)
   * - 0.7 faith: divine_regeneration (sustained healing)
   * - 0.8 faith: divine_smite (offensive divine power)
   * - 0.9 faith: divine_sanctuary (powerful protection)
   *
   * Each answered prayer also increases the chance of spell revelation.
   */
  private handlePrayerAnswered(entity: EntityImpl, deityId: string, responseType: string): void {
    const spiritual = entity.getComponent<SpiritualComponent>(CT.Spiritual);
    if (!spiritual) return;

    // Get or check for MagicComponent
    let magic = entity.getComponent<MagicComponent>(CT.Magic);

    // If no magic component and faith is high enough, initialize one for divine paradigm
    if (!magic && spiritual.faith >= 0.3) {
      const newMagic: MagicComponent = {
        type: 'magic',
        magicUser: true,
        homeParadigmId: 'divine',
        activeParadigmId: 'divine',
        knownParadigmIds: ['divine'],
        paradigmState: {},
        manaPools: [],
        resourcePools: {
          favor: {
            type: 'favor',
            current: Math.floor(spiritual.faith * 100),
            maximum: 100,
            regenRate: 1,
            locked: 0,
          },
        },
        knownSpells: [],
        activeEffects: [],
        techniqueProficiency: {},
        formProficiency: {},
        casting: false,
        totalSpellsCast: 0,
        totalMishaps: 0,
        version: 1,
      };
      entity.addComponent(newMagic);
      magic = newMagic;
    }

    if (!magic) return;

    // Ensure divine paradigm is known
    if (!magic.knownParadigmIds.includes('divine')) {
      entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
        ...current,
        knownParadigmIds: [...current.knownParadigmIds, 'divine'],
      }));
    }

    // Divine spell unlock thresholds
    const spellThresholds: Array<{ spellId: string; faithRequired: number; description: string }> = [
      { spellId: 'divine_heal', faithRequired: 0.3, description: 'Divine Healing' },
      { spellId: 'divine_blessing', faithRequired: 0.5, description: 'Divine Blessing' },
      { spellId: 'divine_regeneration', faithRequired: 0.7, description: 'Blessed Regeneration' },
      { spellId: 'divine_smite', faithRequired: 0.8, description: 'Divine Smite' },
      { spellId: 'divine_sanctuary', faithRequired: 0.9, description: 'Sanctuary' },
    ];

    // Visions are more powerful revelations than signs
    const visionMultiplier = responseType === 'vision' ? 1.2 : 1.0;
    const effectiveFaith = spiritual.faith * visionMultiplier;

    // Check which spells should be unlocked
    for (const threshold of spellThresholds) {
      if (effectiveFaith >= threshold.faithRequired) {
        // Check if spell is already known
        const alreadyKnown = magic.knownSpells.some(s => s.spellId === threshold.spellId);
        if (!alreadyKnown) {
          // Check prerequisites (divine_regeneration requires divine_heal, divine_sanctuary requires divine_blessing)
          const prereqMet = this.checkDivinePrerequisites(magic, threshold.spellId);
          if (prereqMet) {
            // Small random chance per answered prayer to receive divine revelation
            // Higher faith = higher chance
            const revelationChance = 0.1 + (effectiveFaith * 0.3);
            if (Math.random() < revelationChance) {
              this.learnSpell(entity, threshold.spellId, 10); // Start with 10 proficiency for divine gift

              // Emit divine revelation event
              this.world?.eventBus.emit<'magic:spell_learned'>({
                type: 'magic:spell_learned',
                source: entity.id,
                data: {
                  entityId: entity.id,
                  spellId: threshold.spellId,
                  proficiency: 10,
                },
              });
            }
          }
        }
      }
    }
  }

  /**
   * Check if prerequisites are met for a divine spell.
   */
  private checkDivinePrerequisites(magic: MagicComponent, spellId: string): boolean {
    const prerequisites: Record<string, string[]> = {
      'divine_heal': [], // No prerequisites
      'divine_blessing': [], // No prerequisites
      'divine_regeneration': ['divine_heal'],
      'divine_smite': [], // No prerequisites (different school)
      'divine_sanctuary': ['divine_blessing'],
    };

    const required = prerequisites[spellId] ?? [];
    for (const prereq of required) {
      if (!magic.knownSpells.some(s => s.spellId === prereq)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Update - process mana regeneration, cooldowns, and active effects
   */
  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      this.processMagicEntity(entity, ctx.world, ctx.deltaTime);
    }

    // Process active spell casts (multi-tick spells)
    this.tickAllActiveCasts(ctx.world);

    // Process active spell effects (duration, ticks, expiration)
    if (this.effectExecutor) {
      this.effectExecutor.processTick(ctx.world, ctx.tick);
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

    // Sync faith/favor between SpiritualComponent and MagicComponent
    this.syncFaithAndFavor(entity, magic);
  }

  /**
   * Synchronize faith (SpiritualComponent) with divine favor (MagicComponent).
   * This ensures bidirectional consistency:
   * - Changes to divine favor affect agent's faith
   * - Changes to faith affect divine magic costs
   */
  private syncFaithAndFavor(entity: EntityImpl, magic: MagicComponent): void {
    // Only sync for divine paradigm users
    if (magic.activeParadigmId !== 'divine' && !magic.knownParadigmIds.includes('divine')) {
      return;
    }

    const spiritual = entity.getComponent<SpiritualComponent>(CT.Spiritual);
    if (!spiritual) return;

    const favorPool = magic.resourcePools.favor;
    if (!favorPool) return;

    // Calculate normalized favor (0-1)
    const normalizedFavor = favorPool.maximum > 0 ? favorPool.current / favorPool.maximum : 0;

    // Calculate expected faith based on favor (with some tolerance)
    // High favor = high faith, but not 1:1 (favor can be higher with more experience)
    const expectedFaith = Math.min(1.0, normalizedFavor * 0.8 + 0.1);

    // If faith and favor are significantly different, sync them
    const faithDiff = Math.abs(spiritual.faith - expectedFaith);
    const favorDiff = Math.abs(normalizedFavor - spiritual.faith);

    if (faithDiff > 0.1 || favorDiff > 0.1) {
      // Average the two to create smooth sync (neither dominates)
      const syncedValue = (spiritual.faith + expectedFaith) / 2;

      // Update spiritual component if faith changed
      if (Math.abs(spiritual.faith - syncedValue) > 0.01) {
        entity.updateComponent<SpiritualComponent>(CT.Spiritual, (current) => ({
          ...current,
          faith: Math.max(0, Math.min(1.0, syncedValue)),
        }));
      }

      // Update magic component if favor needs adjustment
      const targetFavor = syncedValue * favorPool.maximum;
      if (Math.abs(favorPool.current - targetFavor) > 1) {
        entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
          const updatedPools = { ...current.resourcePools };
          if (updatedPools.favor) {
            updatedPools.favor = {
              ...updatedPools.favor,
              current: targetFavor,
            };
          }
          return {
            ...current,
            resourcePools: updatedPools,
          };
        });
      }
    }
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
      console.error(`[MagicSystem] No cost calculator for paradigm: ${paradigmId}`);
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
        console.error('[MagicSystem] Failed to lock resources for cast');
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
   */
  private tickCast(castState: CastingState, caster: EntityImpl, world: World): void {
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
      this.completeCast(castState, caster, world);
    }
  }

  /**
   * Complete a successful cast.
   * Unlocks resources and applies spell effects.
   *
   * @param castState The casting state
   * @param caster The caster entity
   * @param world The game world
   */
  private completeCast(castState: CastingState, caster: EntityImpl, world: World): void {
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
      world.eventBus.emit({
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
      if (knownSpell) {
        this.updateSpellProficiency(caster, knownSpell);
      }

      // Grant skill tree XP
      const xpGained = Math.ceil(spell.manaCost * 0.1);
      this.grantSkillXP(caster, paradigmId, xpGained);

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
    if (this.world) {
      this.world.eventBus.emit({
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
  }

  /**
   * Tick all active casts forward.
   * Called by MagicSystem.update() each tick.
   *
   * @param world The game world
   */
  private tickAllActiveCasts(world: World): void {
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
        this.tickCast(magic.castingState, impl, world);
      }
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

    // Validate target entity exists if targetEntityId is provided
    if (targetEntityId) {
      const targetEntity = world.getEntity(targetEntityId);
      if (!targetEntity) {
        console.error(`[MagicSystem] Target entity not found: ${targetEntityId}`);
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
        // Create minimal paradigm interface for deduction
        const paradigmStub: Pick<MagicParadigm, 'id'> = { id: paradigmId };
        const result = calculator.deductCosts(costs, magic, paradigmStub as MagicParadigm);
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

    // Grant skill tree XP for casting (based on mana cost)
    const xpGained = Math.ceil(spell.manaCost * 0.1); // 10% of mana cost as XP
    this.grantSkillXP(caster, paradigmId, xpGained);

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

    // Get spell info from registry for the event
    const spellRegistry = SpellRegistry.getInstance();
    const spellDef = spellRegistry.getSpell(spellId);
    const paradigmId = spellDef?.paradigmId ?? magic.activeParadigmId ?? 'academic';

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

    // Emit spell learned confirmation event
    this.world?.eventBus.emit<'magic:spell_learned'>({
      type: 'magic:spell_learned',
      source: entity.id,
      data: {
        entityId: entity.id,
        spellId,
        proficiency: initialProficiency,
      },
    });

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

  // =========================================================================
  // Skill Tree Integration
  // =========================================================================

  /**
   * Handle when a skill node is unlocked.
   * Checks if the node grants spells and auto-learns them.
   */
  private handleSkillNodeUnlocked(entity: EntityImpl, paradigmId: string, nodeId: string): void {
    if (!this.skillTreeRegistry) return;

    const node = this.skillTreeRegistry.getNode(paradigmId, nodeId);
    if (!node) return;

    // Check node effects for spell unlocks
    for (const effect of node.effects) {
      const spellId = effect.target?.spellId;
      if (effect.type === 'unlock_spell' && spellId) {
        // Auto-learn the unlocked spell
        this.learnSpell(entity, spellId, effect.baseValue ?? 0);

        // Emit spell unlocked event
        this.world?.eventBus.emit<'magic:spell_unlocked_from_skill_tree'>({
          type: 'magic:spell_unlocked_from_skill_tree',
          source: entity.id,
          data: {
            spellId,
            agentId: entity.id,
            nodeId,
          },
        });
      }
    }
  }

  /**
   * Build an EvaluationContext for skill tree evaluation.
   */
  private buildEvaluationContext(
    entity: EntityImpl,
    paradigmId: string,
    state: { xp: number; unlockedNodes: string[]; nodeProgress: Record<string, number> }
  ): EvaluationContext | undefined {
    if (!this.world) return undefined;

    const magic = entity.getComponent<MagicComponent>(CT.Magic);

    // Build MagicSkillProgress from the state
    const progress = {
      paradigmId,
      treeVersion: 1,
      unlockedNodes: state.unlockedNodes.reduce((acc, nodeId) => {
        acc[nodeId] = 1; // Level 1 for unlocked nodes
        return acc;
      }, {} as Record<string, number>),
      totalXpEarned: state.xp,
      availableXp: state.xp,
      discoveries: {},
      relationships: {},
      milestones: {},
    };

    return {
      world: this.world,
      agentId: entity.id,
      progress,
      magicComponent: magic ? {
        paradigmState: magic.paradigmState as Record<string, unknown>,
        techniqueProficiency: magic.techniqueProficiency as Record<string, number>,
        formProficiency: magic.formProficiency as Record<string, number>,
        corruption: magic.corruption,
        favorLevel: magic.favorLevel,
        manaPools: magic.manaPools.map(p => ({
          source: p.source,
          current: p.current,
          maximum: p.maximum,
        })),
        resourcePools: Object.fromEntries(
          Object.entries(magic.resourcePools).map(([key, pool]) => [
            key,
            { current: pool?.current ?? 0, maximum: pool?.maximum ?? 100 },
          ])
        ),
      } : undefined,
    };
  }

  /**
   * Grant skill XP to an entity for a specific paradigm.
   */
  grantSkillXP(entity: EntityImpl, paradigmId: string, xpAmount: number): void {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return;

    // Update skill tree state in magic component
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const skillTreeState = current.skillTreeState ?? {};
      const paradigmState = skillTreeState[paradigmId] ?? { xp: 0, unlockedNodes: [], nodeProgress: {} };

      return {
        ...current,
        skillTreeState: {
          ...skillTreeState,
          [paradigmId]: {
            ...paradigmState,
            xp: paradigmState.xp + xpAmount,
          },
        },
      };
    });

    // Check for newly unlockable nodes
    this.checkSkillTreeUnlocks(entity, paradigmId);
  }

  /**
   * Check if any skill tree nodes can be unlocked with current XP.
   */
  private checkSkillTreeUnlocks(entity: EntityImpl, paradigmId: string): void {
    if (!this.skillTreeRegistry || !this.world) return;

    const tree = this.skillTreeRegistry.getTree(paradigmId);
    if (!tree) return;

    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic?.skillTreeState?.[paradigmId]) return;

    const state = magic.skillTreeState[paradigmId];
    if (!state) return;

    // Build evaluation context
    const evalContext = this.buildEvaluationContext(entity, paradigmId, state);
    if (!evalContext) return;

    // Check each node for unlockability
    for (const node of tree.nodes) {
      // Skip already unlocked nodes
      if (state.unlockedNodes.includes(node.id)) continue;

      // Check if node can be unlocked
      const evaluation = evaluateNode(node, tree, evalContext);

      if (evaluation.canPurchase && evaluation.visible) {
        // Check if have enough XP
        if (state.xp >= node.xpCost) {
          // Auto-unlock available nodes (or could require player action)
          this.unlockSkillNode(entity, paradigmId, node.id, node.xpCost);
        }
      }
    }
  }

  /**
   * Unlock a skill tree node for an entity.
   */
  unlockSkillNode(entity: EntityImpl, paradigmId: string, nodeId: string, xpCost: number): boolean {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic?.skillTreeState?.[paradigmId]) return false;

    const state = magic.skillTreeState[paradigmId];
    if (!state || state.xp < xpCost) return false;
    if (state.unlockedNodes.includes(nodeId)) return false;

    // Deduct XP and add node to unlocked list
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const skillTreeState = current.skillTreeState ?? {};
      const paradigmState = skillTreeState[paradigmId] ?? { xp: 0, unlockedNodes: [], nodeProgress: {} };

      return {
        ...current,
        skillTreeState: {
          ...skillTreeState,
          [paradigmId]: {
            ...paradigmState,
            xp: paradigmState.xp - xpCost,
            unlockedNodes: [...paradigmState.unlockedNodes, nodeId],
          },
        },
      };
    });

    // Emit unlock event (triggers handleSkillNodeUnlocked)
    this.world?.eventBus.emit<'magic:skill_node_unlocked'>({
      type: 'magic:skill_node_unlocked',
      source: entity.id,
      data: {
        nodeId,
        agentId: entity.id,
        skillTree: paradigmId,
      },
    });

    return true;
  }

  /**
   * Check if an entity meets skill tree requirements for a spell.
   */
  checkSkillTreeRequirements(entity: EntityImpl, spellId: string): boolean {
    if (!this.skillTreeRegistry) return true; // No registry = no requirements

    const spellRegistry = SpellRegistry.getInstance();
    const spell = spellRegistry.getSpell(spellId);
    if (!spell) return false;

    // Check if spell has skill tree requirements
    const paradigmId = spell.paradigmId ?? 'academic';
    const tree = this.skillTreeRegistry.getTree(paradigmId);
    if (!tree) return true; // No tree = no requirements

    // Find nodes that unlock this spell
    const unlockingNodes = tree.nodes.filter(node =>
      node.effects.some(e => e.type === 'unlock_spell' && e.target?.spellId === spellId)
    );

    if (unlockingNodes.length === 0) return true; // Spell not gated by skill tree

    // Check if entity has unlocked any of these nodes
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic?.skillTreeState?.[paradigmId]) return false;

    const state = magic.skillTreeState[paradigmId];
    return unlockingNodes.some(node => state?.unlockedNodes.includes(node.id));
  }

  /**
   * Get unlocked spells for an entity from skill trees.
   */
  getUnlockedSpellsFromSkillTrees(entity: EntityImpl): string[] {
    if (!this.skillTreeRegistry) return [];

    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic?.skillTreeState) return [];

    const unlockedSpells: string[] = [];

    for (const [paradigmId, state] of Object.entries(magic.skillTreeState)) {
      if (!state) continue;

      const tree = this.skillTreeRegistry.getTree(paradigmId);
      if (!tree) continue;

      for (const nodeId of state.unlockedNodes) {
        const node = tree.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        for (const effect of node.effects) {
          const spellId = effect.target?.spellId;
          if (effect.type === 'unlock_spell' && spellId) {
            unlockedSpells.push(spellId);
          }
        }
      }
    }

    return unlockedSpells;
  }

  /**
   * Get skill tree progression for an entity.
   */
  getSkillTreeProgress(entity: EntityImpl, paradigmId: string): {
    xp: number;
    unlockedNodes: string[];
    availableNodes: string[];
    totalNodes: number;
  } | undefined {
    if (!this.skillTreeRegistry || !this.world) return undefined;

    const tree = this.skillTreeRegistry.getTree(paradigmId);
    if (!tree) return undefined;

    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    const state = magic?.skillTreeState?.[paradigmId] ?? { xp: 0, unlockedNodes: [], nodeProgress: {} };

    // Build evaluation context
    const evalContext = this.buildEvaluationContext(entity, paradigmId, state);
    if (!evalContext) return undefined;

    // Find available nodes
    const availableNodes: string[] = [];
    for (const node of tree.nodes) {
      if (state.unlockedNodes.includes(node.id)) continue;

      const evaluation = evaluateNode(node, tree, evalContext);
      if (evaluation.canPurchase && evaluation.visible && state.xp >= node.xpCost) {
        availableNodes.push(node.id);
      }
    }

    return {
      xp: state.xp,
      unlockedNodes: state.unlockedNodes,
      availableNodes,
      totalNodes: tree.nodes.length,
    };
  }
}
