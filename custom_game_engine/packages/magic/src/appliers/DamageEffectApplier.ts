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

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  DamageEffect,
  EffectApplicationResult,
  ActiveEffect,
  DamageType,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import { SpellEffectRegistry } from '../SpellEffectRegistry.js';
import { createDamageEffect } from '../SpellEffect.js';
import type { NeedsComponent } from '@ai-village/core';
import type { EquipmentComponent } from '@ai-village/core';
import type { ArmorTrait } from '@ai-village/core';
import { itemRegistry } from '@ai-village/core';

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

    // Apply damage to target
    const damageApplied = this.applyDamageToTarget(target, finalDamage);

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
    const equipment = target.getComponent<EquipmentComponent>('equipment');
    if (equipment) {
      // Check each equipped item for armor traits
      for (const [_slot, equippedItem] of Object.entries(equipment.equipped)) {
        if (equippedItem) {
          const itemDef = itemRegistry.get(equippedItem.itemId);
          if (itemDef && itemDef.traits?.armor) {
            const armorTrait = itemDef.traits.armor;

            // Get resistance for this damage type
            // Note: ArmorTrait uses weapon DamageType, which may differ from spell DamageType
            // Use dynamic access with type guard for cross-system compatibility
            let resistance = 0;
            if (armorTrait.resistances && damageType in armorTrait.resistances) {
              const resistances = armorTrait.resistances as Partial<Record<string, number>>;
              resistance = resistances[damageType] ?? 0;
            }

            totalResistance += resistance;
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
    const equipment = target.getComponent<EquipmentComponent>('equipment');
    if (equipment) {
      // Sum defense from all equipped armor
      for (const [_slot, equippedItem] of Object.entries(equipment.equipped)) {
        if (equippedItem) {
          const itemDef = itemRegistry.get(equippedItem.itemId);
          if (itemDef && itemDef.traits?.armor) {
            const armorTrait = itemDef.traits.armor;
            // Note: Durability tracking is not yet implemented in EquipmentSlot
            // Using full defense for now
            totalDefense += armorTrait.defense;
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

/**
 * Trogdor Fire Breath - BURNINATION!
 * Natural breath weapon that burninates the countryside, the peasants, and their THATCHED-ROOF COTTAGES!
 */
export const TROGDOR_FIRE_BREATH = createDamageEffect(
  'trogdor_fire_breath',
  'Burnination',
  'fire',
  75,  // High base damage - he's THE Burninator
  15,  // Range in tiles - cone of fire
  {
    description: 'TROGDOR burninates the countryside, the peasants, and their THATCHED-ROOF COTTAGES!',
    targetType: 'cone',
    canCrit: true,
    critMultiplier: 3.0, // Epic burnination crits
    ignoresArmor: true, // Fire goes through armor
    penetration: 50,
    form: 'fire',
    technique: 'destroy',
    tags: ['breath_weapon', 'burnination', 'legendary', 'natural_ability'],
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
  registry.register(TROGDOR_FIRE_BREATH);
}

/**
 * Initialize the damage effect system.
 * Call this during game startup.
 */
export function initializeDamageEffects(): void {
  registerDamageEffectApplier();
  registerBuiltInDamageEffects();
}
