/**
 * HealingEffectApplier - Handles healing and restoration effects
 *
 * This applier processes healing effects including:
 * - Instant healing
 * - Heal over time (HoT)
 * - Multi-resource restoration (health, mana, stamina)
 * - Condition curing (poison, disease, etc)
 * - Overheal mechanics (temporary HP)
 */

import type { Entity } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type {
  HealingEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import { createHealingEffect } from '../SpellEffect.js';
import { SpellEffectRegistry } from '../SpellEffectRegistry.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { setMutationRate, clearMutationRate } from '../../components/MutationVectorComponent.js';

// ============================================================================
// Helper Interfaces
// ============================================================================

/** Extended needs component for overheal mechanics */
interface ExtendedNeedsComponent extends NeedsComponent {
  /** Temporary HP from overheal */
  temporaryHealth?: number;
  /** Mana resource (if magic system is integrated) */
  mana?: number;
  /** Maximum mana */
  maxMana?: number;
  /** Stamina resource */
  stamina?: number;
  /** Maximum stamina */
  maxStamina?: number;
  /** Active conditions (poison, disease, etc) */
  conditions?: Set<string>;
}

// ============================================================================
// HealingEffectApplier
// ============================================================================

class HealingEffectApplier implements EffectApplier<HealingEffect> {
  readonly category = 'healing' as const;

  /**
   * Apply healing effect to target.
   */
  apply(
    effect: HealingEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const needs = target.components.get('needs') as ExtendedNeedsComponent | undefined;

    if (!needs) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target has no needs component',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get scaled healing value
    const scaledHealing = context.scaledValues.get('healing');
    if (!scaledHealing) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No healing scaling data available',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Calculate final healing amount
    let healingAmount = scaledHealing.value * context.powerMultiplier;

    // Apply critical multiplier if crit
    if (context.isCrit) {
      healingAmount *= 1.5; // Healing crits are 1.5x instead of 2x
    }

    const appliedValues: Record<string, number> = {};

    // NEW: Check if this is a HoT effect (overtime with duration)
    if (effect.overtime && effect.duration && effect.duration > 0) {
      // This is a heal-over-time effect - use StateMutatorSystem
      return this.applyHealOverTime(
        effect,
        caster,
        target,
        healingAmount,
        scaledHealing.value,
        context
      );
    }

    // EXISTING: Apply instant healing or legacy HoT (without StateMutatorSystem)
    if (effect.overtime) {
      // Legacy HoT: Store per-tick amount for tick() method (fallback)
      appliedValues.healingPerTick = healingAmount / (effect.duration ?? 1);
      appliedValues.resourceType = this.resourceTypeToNumber(effect.resourceType);
    } else {
      // Instant healing
      this.applyInstantHealing(
        needs,
        healingAmount,
        effect.resourceType,
        effect.canOverheal,
        appliedValues
      );
    }

    // Cure conditions if specified
    if (effect.curesConditions && effect.curesConditions.length > 0) {
      this.cureConditions(needs, effect.curesConditions, appliedValues);
    }

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      remainingDuration: effect.duration,
    };
  }

  /**
   * Apply heal over time using StateMutatorSystem.
   * Registers a mutation rate that gradually increases health/mana/stamina over the effect duration.
   */
  private applyHealOverTime(
    effect: HealingEffect,
    caster: Entity,
    target: Entity,
    totalHealing: number,
    baseHealing: number,
    context: EffectContext
  ): EffectApplicationResult {
    // Calculate duration and rate
    const durationInTicks = effect.duration!;
    const durationInSeconds = durationInTicks / 20; // 20 TPS
    const healingPerSecond = totalHealing / durationInSeconds;

    const appliedValues: Record<string, number> = {
      totalHealing,
      healingPerSecond,
      durationInTicks,
    };

    const source = `magic:${context.spell.id}:${effect.id}`;

    // Register mutation rate(s) based on resource type
    switch (effect.resourceType) {
      case 'health': {
        // Convert healing (0-100 scale) to health gain (0-1 scale)
        const healthGainPerSecond = healingPerSecond / 100;
        setMutationRate(target, 'needs.health', healthGainPerSecond, {
          min: 0,
          max: 1.0, // Health is 0-1 scale
          source,
          expiresAt: context.tick + durationInTicks,
          totalAmount: totalHealing / 100, // Total amount in 0-1 scale
        });
        appliedValues.healthPerSecond = healthGainPerSecond;
        break;
      }

      case 'mana': {
        const needs = target.components.get('needs') as ExtendedNeedsComponent | undefined;
        const maxMana = needs?.maxMana ?? 100;
        const manaGainPerSecond = healingPerSecond / maxMana; // Normalize to 0-1
        setMutationRate(target, 'needs.mana', manaGainPerSecond, {
          min: 0,
          max: 1.0,
          source,
          expiresAt: context.tick + durationInTicks,
          totalAmount: totalHealing / maxMana, // Total amount in 0-1 scale
        });
        appliedValues.manaPerSecond = manaGainPerSecond;
        break;
      }

      case 'stamina': {
        const needs = target.components.get('needs') as ExtendedNeedsComponent | undefined;
        const maxStamina = needs?.maxStamina ?? 100;
        const staminaGainPerSecond = healingPerSecond / maxStamina; // Normalize to 0-1
        setMutationRate(target, 'needs.stamina', staminaGainPerSecond, {
          min: 0,
          max: 1.0,
          source,
          expiresAt: context.tick + durationInTicks,
          totalAmount: totalHealing / maxStamina, // Total amount in 0-1 scale
        });
        appliedValues.staminaPerSecond = staminaGainPerSecond;
        break;
      }

      case 'all': {
        // Split healing across all resources
        const splitHealing = healingPerSecond / 3;
        const needs = target.components.get('needs') as ExtendedNeedsComponent | undefined;

        // Health
        const healthGainPerSecond = splitHealing / 100;
        setMutationRate(target, 'needs.health', healthGainPerSecond, {
          min: 0,
          max: 1.0,
          source: `${source}:health`,
          expiresAt: context.tick + durationInTicks,
          totalAmount: (totalHealing / 3) / 100,
        });

        // Mana
        const maxMana = needs?.maxMana ?? 100;
        const manaGainPerSecond = splitHealing / maxMana;
        setMutationRate(target, 'needs.mana', manaGainPerSecond, {
          min: 0,
          max: 1.0,
          source: `${source}:mana`,
          expiresAt: context.tick + durationInTicks,
          totalAmount: (totalHealing / 3) / maxMana,
        });

        // Stamina
        const maxStamina = needs?.maxStamina ?? 100;
        const staminaGainPerSecond = splitHealing / maxStamina;
        setMutationRate(target, 'needs.stamina', staminaGainPerSecond, {
          min: 0,
          max: 1.0,
          source: `${source}:stamina`,
          expiresAt: context.tick + durationInTicks,
          totalAmount: (totalHealing / 3) / maxStamina,
        });

        appliedValues.healthPerSecond = healthGainPerSecond;
        appliedValues.manaPerSecond = manaGainPerSecond;
        appliedValues.staminaPerSecond = staminaGainPerSecond;
        break;
      }
    }

    // Cleanup function for dispel support
    const cleanupFn = () => {
      // Clear all mutations from this source
      const mv = target.getComponent('mutation_vector');
      if (mv && mv.fields) {
        for (const [fieldPath, field] of Object.entries(mv.fields)) {
          if (field.source === source || field.source.startsWith(`${source}:`)) {
            clearMutationRate(target, fieldPath);
          }
        }
      }
    };

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      cleanupFn, // For dispel support
    };
  }

  /**
   * Process tick for heal-over-time effects.
   */
  tick(
    activeEffect: ActiveEffect,
    effect: HealingEffect,
    target: Entity,
    _world: World,
    context: EffectContext
  ): void {
    if (!effect.overtime || !effect.tickInterval) return;

    const needs = target.components.get('needs') as ExtendedNeedsComponent | undefined;
    if (!needs) return;

    // Check if it's time to tick
    const ticksSinceApplied = context.tick - activeEffect.appliedAt;
    if (ticksSinceApplied % effect.tickInterval !== 0) return;

    const healingPerTick = activeEffect.appliedValues.healingPerTick ?? 0;
    const resourceType = this.numberToResourceType(
      activeEffect.appliedValues.resourceType ?? 0
    );

    const appliedValues: Record<string, number> = {};
    this.applyInstantHealing(
      needs,
      healingPerTick,
      resourceType,
      effect.canOverheal,
      appliedValues
    );

    // Emit tick event if any healing was applied
    if (Object.keys(appliedValues).length > 0) {
      // Event emission would go through the executor
      // For now, just apply the healing
    }
  }

  /**
   * Remove effect when expired or dispelled.
   */
  remove(
    _activeEffect: ActiveEffect,
    _effect: HealingEffect,
    _target: Entity,
    _world: World
  ): void {
    // Healing effects typically don't need cleanup
    // Overheal might decay naturally in other systems
  }

  // ========== Helper Methods ==========

  /**
   * Apply instant healing to a target.
   */
  private applyInstantHealing(
    needs: ExtendedNeedsComponent,
    healingAmount: number,
    resourceType: HealingEffect['resourceType'],
    canOverheal: boolean,
    appliedValues: Record<string, number>
  ): void {
    switch (resourceType) {
      case 'health':
        this.healResource(needs, 'health', healingAmount, canOverheal, 1.0, appliedValues);
        break;

      case 'mana':
        this.healResource(
          needs,
          'mana',
          healingAmount,
          false, // Mana typically doesn't overheal
          needs.maxMana ?? 1.0,
          appliedValues
        );
        break;

      case 'stamina':
        this.healResource(
          needs,
          'stamina',
          healingAmount,
          false, // Stamina typically doesn't overheal
          needs.maxStamina ?? 1.0,
          appliedValues
        );
        break;

      case 'all':
        // Split healing across all resources
        const splitAmount = healingAmount / 3;
        this.healResource(needs, 'health', splitAmount, canOverheal, 1.0, appliedValues);
        this.healResource(
          needs,
          'mana',
          splitAmount,
          false,
          needs.maxMana ?? 1.0,
          appliedValues
        );
        this.healResource(
          needs,
          'stamina',
          splitAmount,
          false,
          needs.maxStamina ?? 1.0,
          appliedValues
        );
        break;
    }
  }

  /**
   * Heal a specific resource.
   * Note: amount and maxValue should be on the same scale (typically 0-100 in tests, 0-1 in production)
   */
  private healResource(
    needs: ExtendedNeedsComponent,
    resource: 'health' | 'mana' | 'stamina',
    amount: number,
    canOverheal: boolean,
    maxValue: number,
    appliedValues: Record<string, number>
  ): void {
    // Type-safe property access - avoid dynamic property access
    let currentValue: number;
    switch (resource) {
      case 'health':
        currentValue = needs.health ?? 0;
        break;
      case 'mana':
        currentValue = needs.mana ?? 0;
        break;
      case 'stamina':
        currentValue = needs.stamina ?? 0;
        break;
    }

    const newValue = Math.min(currentValue + amount, maxValue);
    const actualHealing = newValue - currentValue;

    if (actualHealing > 0) {
      // Type-safe property mutation - use switch instead of dynamic access
      switch (resource) {
        case 'health':
          needs.health = newValue;
          break;
        case 'mana':
          needs.mana = newValue;
          break;
        case 'stamina':
          needs.stamina = newValue;
          break;
      }
      appliedValues[resource] = actualHealing;
    }

    // Handle overheal
    if (canOverheal && resource === 'health') {
      const overflow = (currentValue + amount) - maxValue;
      if (overflow > 0) {
        const currentTemp = needs.temporaryHealth ?? 0;
        const maxTemp = maxValue * 0.5; // Cap temporary HP at 50% of max health
        const newTemp = Math.min(currentTemp + overflow, maxTemp);
        needs.temporaryHealth = newTemp;
        appliedValues.temporaryHealth = newTemp - currentTemp;
      }
    }
  }

  /**
   * Cure conditions from target.
   */
  private cureConditions(
    needs: ExtendedNeedsComponent,
    conditions: string[],
    appliedValues: Record<string, number>
  ): void {
    if (!needs.conditions) {
      needs.conditions = new Set();
    }

    let curedCount = 0;
    for (const condition of conditions) {
      if (needs.conditions.has(condition)) {
        needs.conditions.delete(condition);
        curedCount++;
      }
    }

    if (curedCount > 0) {
      appliedValues.conditionsCured = curedCount;
    }
  }

  /**
   * Convert resource type enum to number for storage.
   */
  private resourceTypeToNumber(resourceType: HealingEffect['resourceType']): number {
    switch (resourceType) {
      case 'health':
        return 0;
      case 'mana':
        return 1;
      case 'stamina':
        return 2;
      case 'all':
        return 3;
    }
  }

  /**
   * Convert number back to resource type enum.
   */
  private numberToResourceType(num: number): HealingEffect['resourceType'] {
    switch (num) {
      case 0:
        return 'health';
      case 1:
        return 'mana';
      case 2:
        return 'stamina';
      case 3:
        return 'all';
      default:
        return 'health';
    }
  }
}

// ============================================================================
// Built-in Healing Effect Definitions
// ============================================================================

/**
 * Basic instant heal - restores health
 */
export const healEffect = createHealingEffect(
  'heal_effect',
  'Heal',
  50,
  1,
  {
    description: 'Restores 50 health to target.',
    tags: ['heal', 'instant', 'basic'],
  }
);

/**
 * Regeneration - heal over time
 */
export const regenerateEffect = createHealingEffect(
  'regenerate_effect',
  'Regeneration',
  100,
  1,
  {
    description: 'Restores health over time.',
    overtime: true,
    duration: 300, // 5 minutes at 60 ticks/sec
    tickInterval: 60, // Tick once per second
    tags: ['heal', 'hot', 'regeneration'],
  }
);

/**
 * Mana restoration
 */
export const manaRestoreEffect = createHealingEffect(
  'mana_restore_effect',
  'Mana Restoration',
  75,
  0,
  {
    description: 'Restores mana to target.',
    resourceType: 'mana',
    targetType: 'self',
    tags: ['mana', 'restore', 'instant'],
  }
);

/**
 * Cure poison - heals and removes poison condition
 */
export const curePoisonEffect = createHealingEffect(
  'cure_poison_effect',
  'Cure Poison',
  30,
  1,
  {
    description: 'Heals target and cures poison.',
    curesConditions: ['poison', 'venom'],
    tags: ['heal', 'cure', 'poison'],
  }
);

/**
 * Full restore - restores all resources
 */
export const fullRestoreEffect = createHealingEffect(
  'full_restore_effect',
  'Full Restoration',
  150,
  1,
  {
    description: 'Fully restores health, mana, and stamina.',
    resourceType: 'all',
    tags: ['heal', 'restore', 'powerful'],
    healingScaling: {
      base: 150,
      perProficiency: 1.0,
      perForm: 0.5,
      maximum: 500,
    },
  }
);

/**
 * Minor heal - small instant heal
 */
export const minorHealEffect = createHealingEffect(
  'minor_heal_effect',
  'Minor Heal',
  20,
  1,
  {
    description: 'Restores a small amount of health.',
    tags: ['heal', 'instant', 'minor'],
    healingScaling: {
      base: 20,
      perProficiency: 0.2,
      maximum: 60,
    },
  }
);

// ============================================================================
// Registration
// ============================================================================

/**
 * Singleton instance
 */
export const healingEffectApplier = new HealingEffectApplier();

/**
 * Register the healing effect applier with the executor.
 */
export function registerHealingEffectApplier(): void {
  const { registerEffectApplier } = require('../SpellEffectExecutor.js');
  registerEffectApplier(healingEffectApplier);
}

/**
 * Register all built-in healing effects.
 */
export function registerBuiltInHealingEffects(): void {
  const registry = SpellEffectRegistry.getInstance();

  registry.register(healEffect);
  registry.register(regenerateEffect);
  registry.register(manaRestoreEffect);
  registry.register(curePoisonEffect);
  registry.register(fullRestoreEffect);
  registry.register(minorHealEffect);
}

/**
 * Register both applier and built-in effects.
 */
export function registerHealingSystem(): void {
  registerHealingEffectApplier();
  registerBuiltInHealingEffects();
}
