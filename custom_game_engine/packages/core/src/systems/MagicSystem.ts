/**
 * MagicSystem - Orchestrates magic subsystems
 *
 * This system acts as a thin orchestration layer that delegates to specialized managers:
 * - SkillTreeManager: XP grants, node unlocking, spell unlocks from skill trees
 * - SpellProficiencyManager: Learning spells, tracking proficiency
 * - ManaRegenerationManager: Mana/resource regeneration, faith/favor sync
 * - DivineSpellManager: Prayer-based spell unlocking
 * - SpellCastingManager: Spell casting, cooldowns, effect application
 * - SpellValidator: Validation of spell casting preconditions
 *
 * Refactored from 1,555-line god object to focused orchestrator.
 *
 * Part of Phase 30: Magic System
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { MagicComponent, MagicSourceId } from '../components/MagicComponent.js';
import { getAvailableMana } from '../components/MagicComponent.js';
import type { ManaPoolsComponent } from '../magic/managers/ManaRegenerationManager.js';
import type { ParadigmStateComponent } from '../magic/managers/ManaRegenerationManager.js';
import type { EventBus } from '../events/EventBus.js';
import { SpellEffectExecutor } from '../magic/SpellEffectExecutor.js';
import { SpellRegistry, type SpellDefinition } from '../magic/SpellRegistry.js';
import { initializeMagicSystem as initMagicInfrastructure, getTerminalEffectHandler } from '../magic/InitializeMagicSystem.js';
import type { StateMutatorSystem } from './StateMutatorSystem.js';

// Import all managers
import { SkillTreeManager } from '../magic/managers/SkillTreeManager.js';
import { SpellProficiencyManager } from '../magic/managers/SpellProficiencyManager.js';
import { ManaRegenerationManager } from '../magic/managers/ManaRegenerationManager.js';
import { DivineSpellManager } from '../magic/managers/DivineSpellManager.js';
import { SpellCastingManager } from '../magic/managers/SpellCastingManager.js';
import { SpellValidator } from '../magic/validation/SpellValidator.js';

// Import migration utility
import { migrateAllMagicComponents } from '../magic/MagicComponentMigration.js';

/**
 * MagicSystem - Process magic casting and effects
 *
 * Priority: 15 (after AgentBrain at 10, before Movement at 20)
 */
export class MagicSystem extends BaseSystem {
  public readonly id: SystemId = 'magic';
  public readonly priority = 15;
  public readonly requiredComponents = [CT.Magic] as const;
  // Only run when magic components exist (O(1) activation check)
  public readonly activationComponents = [CT.Magic] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private initialized = false;

  // Infrastructure
  private effectExecutor: SpellEffectExecutor | null = null;
  private stateMutatorSystem: StateMutatorSystem | null = null;

  // Managers (Phase 3: extracted from god object)
  private skillTreeManager: SkillTreeManager | null = null;
  private proficiencyManager: SpellProficiencyManager | null = null;
  private regenManager: ManaRegenerationManager | null = null;
  private divineManager: DivineSpellManager | null = null;
  private castingManager: SpellCastingManager | null = null;
  private validator: SpellValidator | null = null;

  protected onInitialize(world: World, eventBus: EventBus): void {
    // Initialize magic infrastructure (effect appliers, registries, etc.)
    if (!this.initialized) {
      // Auto-migrate all entities from monolithic MagicComponent to split components
      // This ensures backward compatibility with old saves
      const migratedCount = migrateAllMagicComponents(world, false); // Keep old component for now
      if (migratedCount > 0) {
        console.warn(`[MagicSystem] Auto-migrated ${migratedCount} entities to split magic components`);
      }

      initMagicInfrastructure(world);
      this.effectExecutor = SpellEffectExecutor.getInstance();
      this.initialized = true;

      // Initialize terminal effect handler with event bus
      const terminalHandler = getTerminalEffectHandler();
      if (terminalHandler) {
        terminalHandler.initialize(eventBus);
      }

      // Get StateMutatorSystem from world for gradual effects
      this.stateMutatorSystem = world.getSystem('state_mutator') as StateMutatorSystem | null;
      const fireSpreadSystem = world.getSystem('fire_spread');

      // Pass to effect executor
      if (this.effectExecutor && this.stateMutatorSystem) {
        this.effectExecutor.setStateMutatorSystem(this.stateMutatorSystem);
      }
      if (this.effectExecutor && fireSpreadSystem) {
        this.effectExecutor.setFireSpreadSystem(fireSpreadSystem);
      }

      // Initialize managers
      this.skillTreeManager = new SkillTreeManager();
      this.proficiencyManager = new SpellProficiencyManager();
      this.regenManager = new ManaRegenerationManager();
      this.divineManager = new DivineSpellManager();
      this.castingManager = new SpellCastingManager();
      this.validator = new SpellValidator();

      // Wire up manager dependencies
      this.skillTreeManager.initialize(world, eventBus);
      this.proficiencyManager.initialize(eventBus);
      this.divineManager.initialize(eventBus);
      this.castingManager.initialize(this.effectExecutor, eventBus);

      // Wire validator to skill tree manager
      this.validator.initialize((entity, spell) => {
        return this.skillTreeManager!.checkSkillTreeRequirements(entity, spell);
      });

      // Wire up event handlers
      this.wireEventHandlers(world, eventBus);
    }
  }

  /**
   * Wire up event handlers that delegate to managers.
   */
  private wireEventHandlers(world: World, eventBus: EventBus): void {
    // Spell learning events
    eventBus.subscribe('magic:spell_learned', (event) => {
      const { entityId, spellId, proficiency } = event.data;
      const entity = world.getEntity(entityId);
      if (entity && this.proficiencyManager) {
        this.proficiencyManager.learnSpell(entity as EntityImpl, spellId, proficiency ?? 0);
      }
    });

    // Mana grant events (divine intervention, testing, etc.)
    eventBus.subscribe('magic:grant_mana', (event) => {
      const { entityId, source, amount } = event.data;
      const entity = world.getEntity(entityId);
      if (entity && this.regenManager) {
        this.regenManager.grantMana(entity as EntityImpl, source, amount);
      }
    });

    // Skill tree node unlock events
    eventBus.subscribe<'magic:skill_node_unlocked'>('magic:skill_node_unlocked', (event) => {
      const { agentId, skillTree, nodeId } = event.data;
      const entity = world.getEntity(agentId);
      if (entity && this.skillTreeManager && this.proficiencyManager) {
        this.skillTreeManager.handleSkillNodeUnlocked(
          entity as EntityImpl,
          skillTree,
          nodeId,
          (e, spellId, prof) => this.proficiencyManager!.learnSpell(e, spellId, prof)
        );
      }
    });

    // Skill tree XP grant events
    eventBus.subscribe('magic:grant_skill_xp' as keyof import('../events/EventMap.js').GameEventMap, (event) => {
      const data = event.data as unknown as { entityId: string; paradigmId: string; xpAmount: number };
      const { entityId, paradigmId, xpAmount } = data;
      const entity = world.getEntity(entityId);
      if (entity && this.skillTreeManager) {
        this.skillTreeManager.grantSkillXP(entity as EntityImpl, paradigmId, xpAmount);
      }
    });

    // Spell cast events for XP tracking and proficiency updates
    eventBus.subscribe('magic:spell_cast', (event) => {
      const casterId = event.source;
      if (typeof casterId !== 'string') return;

      const caster = world.getEntity(casterId);
      if (!caster) return;

      const { paradigm, manaCost, spellId } = event.data;
      const paradigmId = paradigm ?? 'academic';

      // Grant skill tree XP based on spell cost
      if (this.skillTreeManager) {
        const xpGained = Math.ceil((manaCost ?? 10) * 0.1);
        this.skillTreeManager.grantSkillXP(caster as EntityImpl, paradigmId, xpGained);
      }

      // Update spell proficiency
      if (this.proficiencyManager) {
        this.proficiencyManager.incrementSpellProficiency(caster as EntityImpl, spellId);
      }
    });

    // Prayer answered events to unlock divine spells
    eventBus.subscribe('prayer:answered', (event) => {
      const { agentId, deityId, responseType } = event.data;
      const agent = world.getEntity(agentId);
      if (!agent || !this.divineManager || !this.proficiencyManager) return;

      this.divineManager.handlePrayerAnswered(
        agent as EntityImpl,
        deityId,
        responseType,
        (e, spellId, prof) => this.proficiencyManager!.learnSpell(e, spellId, prof)
      );
    });
  }

  /**
   * Update - process mana regeneration, cooldowns, and active effects
   */
  protected onUpdate(ctx: SystemContext): void {
    // Update current tick for proficiency manager
    if (this.proficiencyManager) {
      this.proficiencyManager.setCurrentTick(ctx.tick);
    }

    // Process each entity with magic
    for (const entity of ctx.activeEntities) {
      this.processMagicEntity(entity, ctx.deltaTime);
    }

    // Process active spell casts (multi-tick spells)
    if (this.castingManager && this.proficiencyManager && this.skillTreeManager) {
      this.castingManager.tickAllActiveCasts(
        ctx.world,
        (e, s) => this.proficiencyManager!.updateSpellProficiency(e, s),
        (e, p, x) => this.skillTreeManager!.grantSkillXP(e, p, x)
      );
    }

    // Process active spell effects (duration, ticks, expiration)
    if (this.effectExecutor) {
      this.effectExecutor.processTick(ctx.world, ctx.tick);
    }
  }

  /**
   * Process a single entity with magic.
   * Delegates to regeneration manager.
   */
  private processMagicEntity(entity: EntityImpl, deltaTime: number): void {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic || !magic.magicUser || !this.regenManager) return;

    const manaPools = entity.getComponent(CT.ManaPoolsComponent);
    if (!manaPools) return;

    // Apply regeneration via manager
    this.regenManager.applyMagicRegeneration(entity, manaPools as unknown as ManaPoolsComponent, deltaTime);

    const paradigmState = entity.getComponent(CT.ParadigmStateComponent);
    if (!paradigmState) return;

    // Sync faith/favor for divine users
    this.regenManager.syncFaithAndFavor(entity, manaPools as unknown as ManaPoolsComponent, paradigmState as unknown as ParadigmStateComponent);
  }

  // =========================================================================
  // Public API - Delegates to Managers
  // =========================================================================

  /**
   * Cast a spell from an entity.
   * Delegates to SpellCastingManager.
   */
  castSpell(
    caster: EntityImpl,
    world: World,
    spellId: string,
    targetEntityId?: string,
    targetPosition?: { x: number; y: number }
  ): boolean {
    if (!this.castingManager || !this.regenManager || !this.proficiencyManager || !this.skillTreeManager) {
      return false;
    }

    return this.castingManager.castSpell(
      caster,
      world,
      spellId,
      targetEntityId,
      targetPosition,
      (e, s, a) => this.regenManager!.deductMana(e, s, a),
      (e, s) => this.proficiencyManager!.updateSpellProficiency(e, s),
      (e, p, x) => this.skillTreeManager!.grantSkillXP(e, p, x)
    );
  }

  /**
   * Learn a new spell.
   * Delegates to SpellProficiencyManager.
   */
  learnSpell(entity: EntityImpl, spellId: string, initialProficiency: number = 0): boolean {
    if (!this.proficiencyManager) return false;
    return this.proficiencyManager.learnSpell(entity, spellId, initialProficiency);
  }

  /**
   * Grant mana to an entity.
   * Delegates to ManaRegenerationManager.
   */
  grantMana(entity: EntityImpl, source: MagicSourceId, amount: number): void {
    if (this.regenManager) {
      this.regenManager.grantMana(entity, source, amount);
    }
  }

  /**
   * Grant skill XP to an entity for a specific paradigm.
   * Delegates to SkillTreeManager.
   */
  grantSkillXP(entity: EntityImpl, paradigmId: string, xpAmount: number): void {
    if (this.skillTreeManager) {
      this.skillTreeManager.grantSkillXP(entity, paradigmId, xpAmount);
    }
  }

  /**
   * Unlock a skill tree node for an entity.
   * Delegates to SkillTreeManager.
   */
  unlockSkillNode(entity: EntityImpl, paradigmId: string, nodeId: string, xpCost: number): boolean {
    if (!this.skillTreeManager) return false;
    return this.skillTreeManager.unlockSkillNode(entity, paradigmId, nodeId, xpCost);
  }

  /**
   * Register a spell in the spell registry.
   * Delegates to SpellRegistry for centralized spell management.
   */
  registerSpell(spell: SpellDefinition): void {
    SpellRegistry.getInstance().register(spell);
  }

  /**
   * Get available mana for a specific source.
   */
  getAvailableMana(entity: Entity, source: MagicSourceId): number {
    const magic = (entity as EntityImpl).getComponent<MagicComponent>(CT.Magic);
    if (!magic) return 0;
    return getAvailableMana(magic, source);
  }

  /**
   * Get active effects on an entity.
   */
  getActiveEffects(entityId: string): string[] {
    if (!this.effectExecutor) return [];
    return this.effectExecutor.getActiveEffects(entityId).map(e => e.effectId);
  }

  /**
   * Dispel a specific effect from an entity.
   */
  dispelEffect(entityId: string, effectInstanceId: string, dispellerId: string): boolean {
    if (!this.effectExecutor || !this.world) return false;
    return this.effectExecutor.dispelEffect(entityId, effectInstanceId, dispellerId, this.world);
  }

  /**
   * Check if an entity meets skill tree requirements for a spell.
   * Delegates to SkillTreeManager.
   */
  checkSkillTreeRequirements(entity: EntityImpl, spellId: string): boolean {
    if (!this.skillTreeManager) return true;

    const spellRegistry = SpellRegistry.getInstance();
    const spell = spellRegistry.getSpell(spellId);
    if (!spell) return false;

    return this.skillTreeManager.checkSkillTreeRequirements(entity, spell);
  }

  /**
   * Get unlocked spells for an entity from skill trees.
   * Delegates to SkillTreeManager.
   */
  getUnlockedSpellsFromSkillTrees(entity: EntityImpl): string[] {
    if (!this.skillTreeManager) return [];
    return this.skillTreeManager.getUnlockedSpellsFromSkillTrees(entity);
  }

  /**
   * Get skill tree progression for an entity.
   * Delegates to SkillTreeManager.
   */
  getSkillTreeProgress(entity: EntityImpl, paradigmId: string): {
    xp: number;
    unlockedNodes: string[];
    availableNodes: string[];
    totalNodes: number;
  } | undefined {
    if (!this.skillTreeManager) return undefined;
    return this.skillTreeManager.getSkillTreeProgress(entity, paradigmId);
  }
}
