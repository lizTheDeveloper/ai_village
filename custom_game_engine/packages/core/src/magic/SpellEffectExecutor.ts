/**
 * SpellEffectExecutor - Core system for applying spell effects to entities
 *
 * This is the central execution engine for all spell effects. It:
 * - Calculates scaled effect values based on caster stats
 * - Applies effects to target entities
 * - Manages active effects and their durations
 * - Handles effect stacking and interactions
 * - Emits events for UI and other systems
 *
 * The executor delegates to specialized appliers for each effect category.
 */

import type { Entity } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { MagicComponent } from '../components/MagicComponent.js';
import type {
  SpellEffect,
  DamageEffect,
  HealingEffect,
  ProtectionEffect,
  SummonEffect,
  EffectApplicationResult,
  ActiveEffect,
  EffectEvent,
  EffectEventListener,
  ScaledValue,
} from './SpellEffect.js';
import { calculateScaledValue } from './SpellEffect.js';
import type { SpellDefinition } from './SpellRegistry.js';
import { SpellEffectRegistry } from './SpellEffectRegistry.js';
import type { StateMutatorSystem } from '../systems/StateMutatorSystem.js';

// ============================================================================
// Effect Applier Interface
// ============================================================================

/**
 * Interface for category-specific effect appliers.
 * Each effect category has its own applier that knows how to apply that type of effect.
 */
export interface EffectApplier<T extends SpellEffect = SpellEffect> {
  /** Category this applier handles */
  readonly category: T['category'];

  /**
   * Apply the effect to a target entity.
   * Returns the result of the application.
   */
  apply(
    effect: T,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult;

  /**
   * Process a tick for an active effect (for duration effects).
   * Called every game tick for active effects of this category.
   */
  tick?(
    activeEffect: ActiveEffect,
    effect: T,
    target: Entity,
    world: World,
    context: EffectContext
  ): void;

  /**
   * Remove an effect from a target (cleanup when expired or dispelled).
   */
  remove?(
    activeEffect: ActiveEffect,
    effect: T,
    target: Entity,
    world: World
  ): void;
}

/**
 * Context passed to effect appliers.
 */
export interface EffectContext {
  /** Current game tick */
  tick: number;

  /** Spell that triggered this effect */
  spell: SpellDefinition;

  /** Caster's magic component */
  casterMagic: MagicComponent;

  /** Scaled values for this effect */
  scaledValues: Map<string, ScaledValue>;

  /** Whether this is a critical hit */
  isCrit: boolean;

  /** Power multiplier from paradigm/combos */
  powerMultiplier: number;

  /** Active paradigm ID */
  paradigmId?: string;

  /** StateMutatorSystem for gradual effect registration (required for DoT/HoT effects) */
  stateMutatorSystem: StateMutatorSystem | null;

  /** FireSpreadSystem for fire ignition (required for fire damage effects) */
  fireSpreadSystem: any | null; // Using 'any' to avoid circular dependency with FireSpreadSystem
}

// ============================================================================
// SpellEffectExecutor
// ============================================================================

export class SpellEffectExecutor {
  private static instance: SpellEffectExecutor | null = null;

  /** Registered effect appliers by category */
  private appliers: Map<string, EffectApplier> = new Map();

  /** Active effects on entities (entityId -> instanceId -> ActiveEffect) */
  private activeEffects: Map<string, Map<string, ActiveEffect>> = new Map();

  /** Event listeners */
  private listeners: Set<EffectEventListener> = new Set();

  /** Instance counter for unique effect instance IDs */
  private instanceCounter: number = 0;

  /** StateMutatorSystem for gradual effects */
  private stateMutatorSystem: StateMutatorSystem | null = null;

  /** FireSpreadSystem for fire ignition effects */
  private fireSpreadSystem: any | null = null;

  private constructor() {}

  static getInstance(): SpellEffectExecutor {
    if (!SpellEffectExecutor.instance) {
      SpellEffectExecutor.instance = new SpellEffectExecutor();
    }
    return SpellEffectExecutor.instance;
  }

  static resetInstance(): void {
    SpellEffectExecutor.instance = null;
  }

  /**
   * Set the StateMutatorSystem for gradual effect processing.
   * Must be called during MagicSystem initialization.
   */
  setStateMutatorSystem(system: StateMutatorSystem): void {
    if (this.stateMutatorSystem !== null) {
      throw new Error('[SpellEffectExecutor] StateMutatorSystem already set');
    }
    this.stateMutatorSystem = system;
  }

  /**
   * Set the FireSpreadSystem for fire ignition effects.
   * Must be called during MagicSystem initialization.
   */
  setFireSpreadSystem(system: any): void {
    if (this.fireSpreadSystem !== null) {
      throw new Error('[SpellEffectExecutor] FireSpreadSystem already set');
    }
    this.fireSpreadSystem = system;
  }

  // ========== Applier Registration ==========

  /**
   * Register an effect applier for a specific category.
   */
  registerApplier<T extends SpellEffect>(applier: EffectApplier<T>): void {
    if (this.appliers.has(applier.category)) {
      // Silently skip if already registered (for test compatibility)
      return;
    }
    this.appliers.set(applier.category, applier as EffectApplier);
  }

  /**
   * Get the applier for a specific category.
   */
  getApplier(category: string): EffectApplier | undefined {
    return this.appliers.get(category);
  }

  /**
   * Check if an applier exists for a category.
   */
  hasApplier(category: string): boolean {
    return this.appliers.has(category);
  }

  // ========== Effect Execution ==========

  /**
   * Execute a spell effect on a target.
   */
  executeEffect(
    effectId: string,
    caster: Entity,
    target: Entity,
    spell: SpellDefinition,
    world: World,
    tick: number,
    powerMultiplier: number = 1.0
  ): EffectApplicationResult {
    // Get effect definition
    const registry = SpellEffectRegistry.getInstance();
    const effect = registry.getEffect(effectId);

    if (!effect) {
      return {
        success: false,
        effectId,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: `Effect '${effectId}' not found in registry`,
        appliedAt: tick,
        casterId: caster.id,
        spellId: spell.id,
      };
    }

    // Get applier for this effect category
    const applier = this.appliers.get(effect.category);
    if (!applier) {
      return {
        success: false,
        effectId,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: `No applier registered for category '${effect.category}'`,
        appliedAt: tick,
        casterId: caster.id,
        spellId: spell.id,
      };
    }

    // Get caster's magic component
    const casterMagic = caster.components.get('magic') as MagicComponent | undefined;
    if (!casterMagic) {
      return {
        success: false,
        effectId,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Caster has no magic component',
        appliedAt: tick,
        casterId: caster.id,
        spellId: spell.id,
      };
    }

    // Calculate scaled values
    const scaledValues = this.calculateAllScaledValues(effect, casterMagic, spell);

    // Determine if critical hit
    const isCrit = this.rollCrit(effect, casterMagic);

    // Build context
    // Note: stateMutatorSystem may be null if not initialized, but the appliers
    // will fail fast with a clear error if they need it for DoT/HoT effects
    const context: EffectContext = {
      tick,
      spell,
      casterMagic,
      scaledValues,
      isCrit,
      powerMultiplier,
      paradigmId: casterMagic.activeParadigmId,
      stateMutatorSystem: this.stateMutatorSystem,
      fireSpreadSystem: this.fireSpreadSystem,
    };

    // Apply the effect
    const result = applier.apply(effect, caster, target, world, context);

    // If successful and has duration, track as active effect
    if (result.success && effect.duration !== undefined) {
      this.addActiveEffect(target.id, {
        instanceId: this.generateInstanceId(),
        effectId: effect.id,
        spellId: spell.id,
        casterId: caster.id,
        appliedAt: tick,
        expiresAt: tick + effect.duration,
        stacks: 1,
        appliedValues: result.appliedValues,
        paused: false,
        paradigmId: casterMagic.activeParadigmId,
      });
    }

    // Emit event
    this.emit({ type: 'effect_applied', result });

    return result;
  }

  /**
   * Execute multiple effects from a spell (for composite spells).
   */
  executeEffects(
    effectIds: string[],
    caster: Entity,
    target: Entity,
    spell: SpellDefinition,
    world: World,
    tick: number,
    powerMultiplier: number = 1.0
  ): EffectApplicationResult[] {
    return effectIds.map(effectId =>
      this.executeEffect(effectId, caster, target, spell, world, tick, powerMultiplier)
    );
  }

  // ========== Active Effect Management ==========

  /**
   * Process all active effects for a game tick.
   */
  processTick(world: World, tick: number): void {
    const expiredEffects: Array<{ entityId: string; instanceId: string }> = [];

    for (const [entityId, effects] of this.activeEffects) {
      const entity = world.getEntity(entityId);
      if (!entity) {
        // Entity no longer exists, remove all effects
        this.activeEffects.delete(entityId);
        continue;
      }

      for (const [instanceId, activeEffect] of effects) {
        // Check expiration
        if (activeEffect.expiresAt !== undefined && tick >= activeEffect.expiresAt) {
          expiredEffects.push({ entityId, instanceId });
          continue;
        }

        // Skip paused effects
        if (activeEffect.paused) continue;

        // Get effect definition and applier
        const effect = SpellEffectRegistry.getInstance().getEffect(activeEffect.effectId);
        if (!effect) continue;

        const applier = this.appliers.get(effect.category);
        if (!applier?.tick) continue;

        // Build minimal context for tick
        const caster = world.getEntity(activeEffect.casterId);
        const casterMagic = caster?.components.get('magic') as MagicComponent | undefined;

        const context: EffectContext = {
          tick,
          spell: { id: activeEffect.spellId } as SpellDefinition,
          casterMagic: casterMagic ?? {} as MagicComponent,
          scaledValues: new Map(),
          isCrit: false,
          powerMultiplier: 1.0,
          paradigmId: activeEffect.paradigmId,
          stateMutatorSystem: null,
          fireSpreadSystem: null,
        };

        // Process tick
        applier.tick(activeEffect, effect, entity, world, context);
      }
    }

    // Remove expired effects
    for (const { entityId, instanceId } of expiredEffects) {
      this.removeActiveEffect(entityId, instanceId, world);
      this.emit({ type: 'effect_expired', instanceId, targetId: entityId });
    }
  }

  /**
   * Get all active effects on an entity.
   */
  getActiveEffects(entityId: string): ActiveEffect[] {
    const effects = this.activeEffects.get(entityId);
    return effects ? Array.from(effects.values()) : [];
  }

  /**
   * Get active effects of a specific type on an entity.
   */
  getActiveEffectsByCategory(entityId: string, category: string): ActiveEffect[] {
    const effects = this.getActiveEffects(entityId);
    return effects.filter(e => {
      const def = SpellEffectRegistry.getInstance().getEffect(e.effectId);
      return def?.category === category;
    });
  }

  /**
   * Check if entity has a specific active effect.
   */
  hasActiveEffect(entityId: string, effectId: string): boolean {
    const effects = this.activeEffects.get(entityId);
    if (!effects) return false;

    for (const effect of effects.values()) {
      if (effect.effectId === effectId) return true;
    }
    return false;
  }

  /**
   * Dispel an active effect.
   */
  dispelEffect(
    entityId: string,
    instanceId: string,
    dispellerId: string,
    world: World
  ): boolean {
    const effects = this.activeEffects.get(entityId);
    if (!effects) return false;

    const activeEffect = effects.get(instanceId);
    if (!activeEffect) return false;

    // Check if dispellable
    const effect = SpellEffectRegistry.getInstance().getEffect(activeEffect.effectId);
    if (!effect?.dispellable) return false;

    this.removeActiveEffect(entityId, instanceId, world);
    this.emit({ type: 'effect_dispelled', instanceId, targetId: entityId, dispellerId });
    return true;
  }

  /**
   * Dispel all effects of a category on an entity.
   */
  dispelCategory(
    entityId: string,
    category: string,
    dispellerId: string,
    world: World
  ): number {
    const effects = this.getActiveEffectsByCategory(entityId, category);
    let dispelled = 0;

    for (const effect of effects) {
      if (this.dispelEffect(entityId, effect.instanceId, dispellerId, world)) {
        dispelled++;
      }
    }

    return dispelled;
  }

  /**
   * Remove all effects from an entity.
   */
  clearAllEffects(entityId: string, world: World): void {
    const effects = this.activeEffects.get(entityId);
    if (!effects) return;

    for (const instanceId of effects.keys()) {
      this.removeActiveEffect(entityId, instanceId, world);
    }
  }

  private addActiveEffect(entityId: string, activeEffect: ActiveEffect): void {
    if (!this.activeEffects.has(entityId)) {
      this.activeEffects.set(entityId, new Map());
    }

    const effects = this.activeEffects.get(entityId)!;
    const effect = SpellEffectRegistry.getInstance().getEffect(activeEffect.effectId);

    // Handle stacking
    if (effect?.stackable) {
      // Find existing effect of same type
      for (const [instanceId, existing] of effects) {
        if (existing.effectId === activeEffect.effectId) {
          const maxStacks = effect.maxStacks ?? 99;
          if (existing.stacks < maxStacks) {
            existing.stacks++;
            existing.expiresAt = activeEffect.expiresAt; // Refresh duration
            this.emit({
              type: 'effect_stacked',
              instanceId,
              targetId: entityId,
              newStacks: existing.stacks,
            });
            return;
          }
        }
      }
    }

    effects.set(activeEffect.instanceId, activeEffect);
  }

  private removeActiveEffect(entityId: string, instanceId: string, world: World): void {
    const effects = this.activeEffects.get(entityId);
    if (!effects) return;

    const activeEffect = effects.get(instanceId);
    if (!activeEffect) return;

    // Call applier's remove method
    const effect = SpellEffectRegistry.getInstance().getEffect(activeEffect.effectId);
    if (effect) {
      const applier = this.appliers.get(effect.category);
      const entity = world.getEntity(entityId);
      if (applier?.remove && entity) {
        applier.remove(activeEffect, effect, entity, world);
      }
    }

    effects.delete(instanceId);

    if (effects.size === 0) {
      this.activeEffects.delete(entityId);
    }
  }

  // ========== Helper Methods ==========

  private calculateAllScaledValues(
    effect: SpellEffect,
    casterMagic: MagicComponent,
    spell: SpellDefinition
  ): Map<string, ScaledValue> {
    const values = new Map<string, ScaledValue>();

    const context = {
      proficiency: this.getSpellProficiency(casterMagic, spell.id),
      techniqueProficiency: casterMagic.techniqueProficiency[spell.technique] ?? 0,
      formProficiency: casterMagic.formProficiency[spell.form] ?? 0,
      level: this.calculateCasterLevel(casterMagic),
      paradigmId: casterMagic.activeParadigmId,
    };

    // Calculate scaling for different effect types
    switch (effect.category) {
      case 'damage': {
        const dmgEffect = effect as DamageEffect;
        values.set('damage', calculateScaledValue(dmgEffect.damageScaling, context));
        break;
      }
      case 'healing': {
        const healEffect = effect as HealingEffect;
        values.set('healing', calculateScaledValue(healEffect.healingScaling, context));
        break;
      }
      case 'protection': {
        const protEffect = effect as ProtectionEffect;
        if (protEffect.absorptionScaling) {
          values.set('absorption', calculateScaledValue(protEffect.absorptionScaling, context));
        }
        break;
      }
      case 'summon': {
        const summonEffect = effect as SummonEffect;
        values.set('count', calculateScaledValue(summonEffect.summonCount, context));
        values.set('level', calculateScaledValue(summonEffect.summonLevel, context));
        break;
      }
      // Add more categories as needed
    }

    return values;
  }

  private getSpellProficiency(magic: MagicComponent, spellId: string): number {
    const known = magic.knownSpells.find(k => k.spellId === spellId);
    return known?.proficiency ?? 0;
  }

  private calculateCasterLevel(magic: MagicComponent): number {
    // Calculate level based on total spells cast or other factors
    return Math.floor(Math.log2(magic.totalSpellsCast + 1));
  }

  private rollCrit(effect: SpellEffect, casterMagic: MagicComponent): boolean {
    if (effect.category !== 'damage') return false;
    const dmgEffect = effect as DamageEffect;
    if (!dmgEffect.canCrit) return false;

    // Base 5% crit chance, increased by proficiency
    const critChance = 0.05 + (casterMagic.totalSpellsCast / 10000);
    return Math.random() < critChance;
  }

  private generateInstanceId(): string {
    return `effect_${++this.instanceCounter}_${Date.now()}`;
  }

  // ========== Event Handling ==========

  addEventListener(listener: EffectEventListener): void {
    this.listeners.add(listener);
  }

  removeEventListener(listener: EffectEventListener): void {
    this.listeners.delete(listener);
  }

  private emit(event: EffectEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // ========== Serialization ==========

  serializeActiveEffects(): Record<string, ActiveEffect[]> {
    const result: Record<string, ActiveEffect[]> = {};
    for (const [entityId, effects] of this.activeEffects) {
      result[entityId] = Array.from(effects.values());
    }
    return result;
  }

  deserializeActiveEffects(data: Record<string, ActiveEffect[]>): void {
    for (const [entityId, effects] of Object.entries(data)) {
      const effectMap = new Map<string, ActiveEffect>();
      for (const effect of effects) {
        effectMap.set(effect.instanceId, effect);
        // Update instance counter to avoid collisions
        const match = effect.instanceId.match(/effect_(\d+)_/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > this.instanceCounter) {
            this.instanceCounter = num;
          }
        }
      }
      this.activeEffects.set(entityId, effectMap);
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function getEffectExecutor(): SpellEffectExecutor {
  return SpellEffectExecutor.getInstance();
}

export function registerEffectApplier<T extends SpellEffect>(applier: EffectApplier<T>): void {
  SpellEffectExecutor.getInstance().registerApplier(applier);
}

export function executeSpellEffect(
  effectId: string,
  caster: Entity,
  target: Entity,
  spell: SpellDefinition,
  world: World,
  tick: number,
  powerMultiplier: number = 1.0
): EffectApplicationResult {
  return SpellEffectExecutor.getInstance().executeEffect(
    effectId, caster, target, spell, world, tick, powerMultiplier
  );
}
