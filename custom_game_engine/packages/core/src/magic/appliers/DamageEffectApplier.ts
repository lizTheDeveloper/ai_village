/**
 * DamageEffectApplier - Handles damage spell effects
 *
 * Applies damage to target entities with support for:
 * - Critical hits
 * - Damage type resistances
 * - Armor reduction
 * - Penetration mechanics
 * - Damage over time (DoT)
 * - On-hit secondary effects
 */

import type { Entity } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type {
  DamageEffect,
  EffectApplicationResult,
  ActiveEffect,
  DamageType,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import { SpellEffectRegistry } from '../SpellEffectRegistry.js';
import { createDamageEffect } from '../SpellEffect.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { EquipmentSlotsComponent } from '../../components/EquipmentSlotsComponent.js';
import type { ArmorTrait } from '../../items/traits/ArmorTrait.js';
import { itemRegistry } from '../../items/ItemRegistry.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

// ============================================================================
// DamageEffectApplier
// ============================================================================

class DamageEffectApplierClass implements EffectApplier<DamageEffect> {
  public readonly category = 'damage' as const;

  /**
   * Apply damage to a target entity.
   */
  apply(
    effect: DamageEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {

    // Get scaled damage value
    const scaledDamage = context.scaledValues.get('damage');
    if (!scaledDamage) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No damage scaling found in context',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    let finalDamage = scaledDamage.value;

    // Apply critical hit multiplier
    if (context.isCrit) {
      const critMultiplier = effect.critMultiplier ?? 2.0;
      finalDamage *= critMultiplier;
    }

    // Apply power multiplier from combos/paradigms
    finalDamage *= context.powerMultiplier;

    // Calculate resistance
    const resistanceAmount = this.calculateResistance(target, effect.damageType, world);
    let resistedDamage = 0;

    // Apply penetration (bypasses some resistance)
    const effectiveResistance = effect.penetration
      ? resistanceAmount * (1 - effect.penetration / 100)
      : resistanceAmount;

    resistedDamage = finalDamage * effectiveResistance;
    finalDamage -= resistedDamage;

    // Apply armor reduction (if not ignored)
    let armorReduction = 0;
    if (!effect.ignoresArmor) {
      armorReduction = this.calculateArmorReduction(target, effect.damageType, finalDamage, world);
      finalDamage -= armorReduction;
    }

    // Ensure damage is not negative
    finalDamage = Math.max(0, finalDamage);

    // NEW: Check if this is a DoT effect (has duration)
    if (effect.duration && effect.duration > 0) {
      // This is a damage-over-time effect - use StateMutatorSystem
      return this.applyDamageOverTime(
        effect,
        caster,
        target,
        finalDamage,
        scaledDamage.value,
        effectiveResistance,
        resistedDamage,
        armorReduction,
        context
      );
    }

    // EXISTING: Instant damage (no duration)
    const damageApplied = this.applyDamageToTarget(target, finalDamage);

    // NEW: Fire damage ignition (Trogdor burnination!)
    // If this is fire damage and FireSpreadSystem is available, ignite the target
    if (effect.damageType === 'fire' && context.fireSpreadSystem && finalDamage > 0) {
      // Calculate burn intensity based on damage dealt (0-100 scale)
      const burnIntensity = Math.min(100, (finalDamage / 100) * 100);

      // Calculate burn duration based on spell tags
      // 'breath_weapon' and 'legendary' effects burn longer
      let burnDuration = 200; // Default: 10 seconds at 20 TPS
      if (effect.tags?.includes('breath_weapon') || effect.tags?.includes('legendary')) {
        burnDuration = 400; // 20 seconds for dragon breath
      }
      if (effect.tags?.includes('burnination')) {
        burnDuration = 600; // 30 seconds for TROGDOR!
      }

      // Ignite the target
      const source = effect.tags?.includes('breath_weapon') ? 'breath' : 'spell';
      context.fireSpreadSystem.igniteEntity(world, target, burnIntensity, burnDuration, source);

      // Also ignite tiles around the target if this is Trogdor's breath or similar AoE fire
      if (effect.tags?.includes('burnination') || effect.targetType === 'cone') {
        const position = target.getComponent<PositionComponent>(CT.Position);
        if (position && world.getTileAt) {
          // Ignite tile at target position
          context.fireSpreadSystem.igniteTile(
            world,
            Math.floor(position.x),
            Math.floor(position.y),
            burnIntensity * 0.8, // Tiles burn slightly less intensely
            burnDuration,
            source
          );
        }
      }
    }

    // Handle on-hit effects
    if (effect.onHitEffects && effect.onHitEffects.length > 0) {
      this.applyOnHitEffects(effect.onHitEffects, caster, target, world, context);
    }

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        baseDamage: scaledDamage.value,
        finalDamage: damageApplied,
        critMultiplier: context.isCrit ? (effect.critMultiplier ?? 2.0) : 1.0,
        resistanceAmount: effectiveResistance,
        resistedDamage,
        armorReduction,
        powerMultiplier: context.powerMultiplier,
      },
      resisted: effectiveResistance > 0,
      resistanceApplied: effectiveResistance,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Apply damage over time using StateMutatorSystem.
   * Registers a delta that gradually reduces health over the effect duration.
   */
  private applyDamageOverTime(
    effect: DamageEffect,
    caster: Entity,
    target: Entity,
    finalDamage: number,
    baseDamage: number,
    effectiveResistance: number,
    resistedDamage: number,
    armorReduction: number,
    context: EffectContext
  ): EffectApplicationResult {
    // StateMutatorSystem is required for DoT effects - fail fast if not available
    if (!context.stateMutatorSystem) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: '[DamageEffectApplier] StateMutatorSystem not initialized. Cannot apply damage-over-time effects.',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Calculate damage per minute from total damage and duration
    const durationInTicks = effect.duration!;
    const durationInMinutes = durationInTicks / 1200; // 1200 ticks per game minute at 20 TPS
    const damagePerMinute = finalDamage / durationInMinutes;

    // Convert damage (0-100 scale) to health loss (0-1 scale)
    const healthLossPerMinute = damagePerMinute / 100;

    // Register delta with StateMutatorSystem
    const cleanupFn = context.stateMutatorSystem.registerDelta({
      entityId: target.id,
      componentType: CT.Needs,
      field: 'health',
      deltaPerMinute: -healthLossPerMinute, // Negative for damage
      min: 0, // Can't go below 0 health
      source: `magic:${context.spell.id}:${effect.id}`,
      expiresAtTick: context.tick + durationInTicks,
    });

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        baseDamage,
        finalDamage, // Total damage that will be applied over duration
        critMultiplier: context.isCrit ? (effect.critMultiplier ?? 2.0) : 1.0,
        resistanceAmount: effectiveResistance,
        resistedDamage,
        armorReduction,
        powerMultiplier: context.powerMultiplier,
        damagePerMinute,
        durationInTicks,
      },
      resisted: effectiveResistance > 0,
      resistanceApplied: effectiveResistance,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      cleanupFn, // Store cleanup function for dispel support
    };
  }

  /**
   * Process damage over time tick.
   */
  tick(
    _activeEffect: ActiveEffect,
    _effect: DamageEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // DoT effects would be handled here
    // For now, damage effects are typically instant
    // Future: Implement burning, bleeding, poison DoT
  }

  /**
   * Remove damage effect (cleanup).
   */
  remove(
    _activeEffect: ActiveEffect,
    _effect: DamageEffect,
    _target: Entity,
    _world: World
  ): void {
    // No cleanup needed for instant damage
    // Future: Remove DoT status icons
  }

  // ========== Helper Methods ==========

  /**
   * Calculate target's resistance to a damage type.
   * Returns 0-1 where 0 = no resistance, 1 = immune.
   */
  private calculateResistance(target: Entity, damageType: DamageType, _world: World): number {
    let totalResistance = 0;

    // Check equipped armor for resistances
    const equipment = target.getComponent<EquipmentSlotsComponent>('equipment_slots');
    if (equipment) {
      // Check each equipped item for armor traits
      for (const [_slot, equippedItem] of Object.entries(equipment.slots)) {
        if (equippedItem) {
          const itemDef = itemRegistry.get(equippedItem.definitionId);
          if (itemDef && itemDef.traits?.armor) {
            const armorTrait = itemDef.traits.armor as ArmorTrait;
            // Type guard for resistances - they may not exist on all armor
            if (armorTrait.resistances && damageType in armorTrait.resistances) {
              const resistances = armorTrait.resistances as Record<DamageType, number>;
              totalResistance += resistances[damageType] ?? 0;
            }
          }
        }
      }
    }

    // Future: Add resistances from buffs, racial traits, etc.

    // Cap at 95% resistance (can't be fully immune without 'true' immunity)
    return Math.min(totalResistance, 0.95);
  }

  /**
   * Calculate armor reduction for damage.
   * Returns flat damage reduction amount.
   */
  private calculateArmorReduction(
    target: Entity,
    _damageType: DamageType,
    damage: number,
    _world: World
  ): number {
    let totalDefense = 0;

    // Check equipped armor for defense
    const equipment = target.getComponent<EquipmentSlotsComponent>('equipment_slots');
    if (equipment) {
      // Sum defense from all equipped armor
      for (const [_slot, equippedItem] of Object.entries(equipment.slots)) {
        if (equippedItem) {
          const itemDef = itemRegistry.get(equippedItem.definitionId);
          if (itemDef && itemDef.traits?.armor) {
            const armorTrait = itemDef.traits.armor as ArmorTrait;
            // Effective defense considers item durability
            totalDefense += armorTrait.defense * equippedItem.durability;
          }
        }
      }
    }

    // Convert defense to damage reduction (diminishing returns)
    // Formula: reduction = defense / (defense + 100)
    const reductionPercent = totalDefense / (totalDefense + 100);
    const reduction = damage * reductionPercent;

    return Math.min(reduction, damage * 0.75); // Cap at 75% reduction from armor
  }

  /**
   * Apply damage to target's health.
   */
  private applyDamageToTarget(target: Entity, damage: number): number {
    const needs = target.getComponent<NeedsComponent>('needs');
    if (!needs) {
      // No health component, can't apply damage
      return 0;
    }

    // Convert damage to health reduction (damage is typically 0-100 scale)
    const healthLoss = damage / 100;
    const oldHealth = needs.health;
    needs.health = Math.max(0, needs.health - healthLoss);

    return oldHealth - needs.health;
  }

  /**
   * Apply on-hit secondary effects.
   */
  private applyOnHitEffects(
    effectIds: string[],
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): void {
    const executor = require('../SpellEffectExecutor.js').SpellEffectExecutor.getInstance();

    for (const effectId of effectIds) {
      executor.executeEffect(
        effectId,
        caster,
        target,
        context.spell,
        world,
        context.tick,
        context.powerMultiplier
      );
    }
  }
}

export const DamageEffectApplier = new DamageEffectApplierClass();

// ============================================================================
// Registration Function
// ============================================================================

export function registerDamageEffectApplier(): void {
  const executor = require('../SpellEffectExecutor.js').SpellEffectExecutor.getInstance();
  executor.registerApplier(DamageEffectApplier);
}

// ============================================================================
// Built-in Damage Effects
// ============================================================================

/**
 * Ignite effect - Low fire damage with potential burning DoT
 */
export const IGNITE_EFFECT = createDamageEffect(
  'ignite',
  'Ignite',
  'fire',
  15,
  5,
  {
    description: 'Sets the target ablaze with flames',
    targetType: 'single',
    canCrit: true,
    critMultiplier: 2.0,
    ignoresArmor: false,
    onHitEffects: [], // Future: Add 'burning' DoT effect
    form: 'fire',
    technique: 'destroy',
  }
);

/**
 * Fireball effect - High fire damage, area effect
 */
export const FIREBALL_EFFECT = createDamageEffect(
  'fireball',
  'Fireball',
  'fire',
  50,
  20,
  {
    description: 'Hurls a massive ball of fire that explodes on impact',
    targetType: 'area',
    canCrit: true,
    critMultiplier: 2.5,
    ignoresArmor: false,
    penetration: 20,
    form: 'fire',
    technique: 'destroy',
    tags: ['fire', 'damage', 'aoe', 'explosive'],
  }
);

/**
 * Frostbolt effect - Medium ice damage with slowing
 */
export const FROSTBOLT_EFFECT = createDamageEffect(
  'frostbolt',
  'Frostbolt',
  'ice',
  30,
  15,
  {
    description: 'Launches a bolt of freezing energy',
    targetType: 'single',
    canCrit: true,
    critMultiplier: 2.0,
    ignoresArmor: false,
    onHitEffects: [], // Future: Add 'slowed' debuff
    form: 'water',
    technique: 'destroy',
    tags: ['ice', 'damage', 'slow'],
  }
);

/**
 * Lightning Bolt effect - High lightning damage with chain potential
 */
export const LIGHTNING_BOLT_EFFECT = createDamageEffect(
  'lightning_bolt',
  'Lightning Bolt',
  'lightning',
  55,
  25,
  {
    description: 'Strikes with the fury of a thunderstorm',
    targetType: 'chain',
    canCrit: true,
    critMultiplier: 3.0,
    ignoresArmor: true,
    penetration: 50,
    form: 'air',
    technique: 'destroy',
    tags: ['lightning', 'damage', 'chain', 'instant'],
  }
);

/**
 * Acid Splash effect - Medium acid damage with armor reduction
 */
export const ACID_SPLASH_EFFECT = createDamageEffect(
  'acid_splash',
  'Acid Splash',
  'acid',
  25,
  10,
  {
    description: 'Splashes the target with corrosive acid',
    targetType: 'single',
    canCrit: true,
    critMultiplier: 2.0,
    ignoresArmor: false,
    onHitEffects: [], // Future: Add 'corroded armor' debuff
    form: 'water',
    technique: 'destroy',
    tags: ['acid', 'damage', 'armor_reduction'],
  }
);

/**
 * Force Blast effect - Medium force damage with knockback
 */
export const FORCE_BLAST_EFFECT = createDamageEffect(
  'force_blast',
  'Force Blast',
  'force',
  35,
  12,
  {
    description: 'Blasts the target with pure magical force',
    targetType: 'single',
    canCrit: true,
    critMultiplier: 2.0,
    ignoresArmor: true,
    onHitEffects: [], // Future: Add 'knockback' control effect
    technique: 'destroy',
    tags: ['force', 'damage', 'knockback'],
  }
);

// ============================================================================
// Effect Registration
// ============================================================================

/**
 * Register all built-in damage effects.
 */
export function registerBuiltInDamageEffects(): void {
  const registry = SpellEffectRegistry.getInstance();

  registry.register(IGNITE_EFFECT);
  registry.register(FIREBALL_EFFECT);
  registry.register(FROSTBOLT_EFFECT);
  registry.register(LIGHTNING_BOLT_EFFECT);
  registry.register(ACID_SPLASH_EFFECT);
  registry.register(FORCE_BLAST_EFFECT);
}

/**
 * Initialize the damage effect system.
 * Call this during game startup.
 */
export function initializeDamageEffects(): void {
  registerDamageEffectApplier();
  registerBuiltInDamageEffects();
}
