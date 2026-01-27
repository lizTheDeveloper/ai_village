/**
 * SoulEffectApplier - Handles soul manipulation effects
 *
 * Applies soul magic effects including:
 * - Soul damage (integrity reduction)
 * - Soul healing (integrity restoration)
 * - Soul binding (attaching soul to caster)
 * - Soul freeing (removing bindings)
 * - Soul transfer (swapping souls between bodies)
 * - Soul detection (perceiving souls)
 * - Resurrection (bringing dead back to life)
 * - Undead interaction (affects undead flag support)
 * - Paradigm restrictions (some paradigms may prohibit soul magic)
 */

import type { Entity, Component } from '@ai-village/core';
import type { World } from '@ai-village/core';
import { EntityImpl } from '@ai-village/core';
import type {
  SoulEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import type { PerceptionEffectsComponent, NeedsComponentWithHealth, StatusEffectsComponent } from '../types/ComponentTypes.js';

// ============================================================================
// Soul Component Interface
// ============================================================================

/**
 * Soul component structure
 * Stores soul state for entities
 */
interface SoulComponent {
  type: 'soul';
  /** Soul integrity (0-100, 0 = soul destroyed) */
  integrity: number;
  /** Whether soul is bound to another entity */
  bound: boolean;
  /** Entity ID this soul is bound to */
  boundTo?: string;
  /** Tick when binding expires */
  bindExpires?: number;
  /** Soul essence identifier (for transfer tracking) */
  essence?: string;
  /** Whether this is an undead soul */
  undead?: boolean;
  /** Whether soul has departed from body */
  departed?: boolean;
  /** Tick when entity died */
  timeOfDeath?: number;
}

// ============================================================================
// SoulEffectApplier
// ============================================================================

class SoulEffectApplier implements EffectApplier<SoulEffect> {
  readonly category = 'soul' as const;

  apply(
    effect: SoulEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const appliedValues: Record<string, any> = {};

    // Check paradigm restrictions
    const paradigmError = this.checkParadigmRestrictions(effect, context);
    if (paradigmError) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: paradigmError,
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Check if target has soul (except for detect, which doesn't require it)
    const soul = target.components.get('soul') as SoulComponent | undefined;
    if (!soul && effect.soulType !== 'detect') {
      // Check if target is explicitly soulless
      const tags = target.components.get('tags') as string[] | undefined;
      if (tags && (tags.includes('soulless') || tags.includes('construct'))) {
        return {
          success: false,
          effectId: effect.id,
          targetId: target.id,
          appliedValues: {},
          resisted: false,
          error: 'Target is soulless and cannot be affected by soul magic',
          appliedAt: context.tick,
          casterId: caster.id,
          spellId: context.spell.id,
        };
      }

      // Target lacks soul component but isn't explicitly soulless
      // Handle gracefully - not all entities have souls
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target lacks soul component',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Check undead restrictions
    if (soul && soul.undead && !effect.affectsUndead) {
      const tags = target.components.get('tags') as string[] | undefined;
      if (tags && tags.includes('undead')) {
        return {
          success: false,
          effectId: effect.id,
          targetId: target.id,
          appliedValues: {},
          resisted: false,
          error: 'This effect cannot affect undead souls',
          appliedAt: context.tick,
          casterId: caster.id,
          spellId: context.spell.id,
        };
      }
    }

    // Apply effect based on soul type
    switch (effect.soulType) {
      case 'damage':
        return this.applySoulDamage(effect, caster, target, soul!, context, appliedValues);

      case 'heal':
        return this.applySoulHealing(effect, caster, target, soul!, context, appliedValues);

      case 'bind':
        return this.applySoulBinding(effect, caster, target, soul!, context, appliedValues);

      case 'free':
        return this.applySoulFreeing(effect, caster, target, soul!, context, appliedValues);

      case 'transfer':
        return this.applySoulTransfer(effect, caster, target, world, context, appliedValues);

      case 'detect':
        return this.applySoulDetection(effect, caster, target, context, appliedValues);

      case 'resurrect':
        return this.applyResurrection(effect, caster, target, soul!, context, appliedValues);

      default:
        return {
          success: false,
          effectId: effect.id,
          targetId: target.id,
          appliedValues: {},
          resisted: false,
          error: `Unknown soul effect type: ${effect.soulType}`,
          appliedAt: context.tick,
          casterId: caster.id,
          spellId: context.spell.id,
        };
    }
  }

  tick(
    _activeEffect: ActiveEffect,
    _effect: SoulEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // Soul effects are typically instant or passive
    // Expiration is handled by the SpellEffectExecutor
  }

  remove(
    _activeEffect: ActiveEffect,
    _effect: SoulEffect,
    _target: Entity,
    _world: World
  ): void {
    // Cleanup is typically handled by specific effect types
    // Most soul effects are permanent or expire naturally
  }

  // ========== Helper Methods ==========

  /**
   * Check if caster's paradigm allows soul manipulation
   */
  private checkParadigmRestrictions(
    _effect: SoulEffect,
    context: EffectContext
  ): string | null {
    // Check if paradigm prohibits soul magic
    const paradigmId = context.casterMagic?.activeParadigmId;
    if (paradigmId === 'scientific') {
      return 'Soul manipulation is prohibited by the scientific paradigm';
    }
    return null;
  }

  /**
   * Apply soul damage effect
   */
  private applySoulDamage(
    effect: SoulEffect,
    caster: Entity,
    target: Entity,
    soul: SoulComponent,
    context: EffectContext,
    appliedValues: Record<string, any>
  ): EffectApplicationResult {
    // Get scaled damage value
    const damageValue = context.scaledValues.get('damage');
    const damage = damageValue?.value ?? effect.soulDamage?.base ?? 0;

    // Apply damage to soul integrity
    const integrityBefore = soul.integrity;
    soul.integrity = Math.max(0, soul.integrity - damage);
    const integrityAfter = soul.integrity;

    appliedValues.damage = damage;
    appliedValues.integrityBefore = integrityBefore;
    appliedValues.integrityAfter = integrityAfter;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Apply soul healing effect
   */
  private applySoulHealing(
    effect: SoulEffect,
    caster: Entity,
    target: Entity,
    soul: SoulComponent,
    context: EffectContext,
    appliedValues: Record<string, any>
  ): EffectApplicationResult {
    // Get scaled healing value
    const healingValue = context.scaledValues.get('healing');
    const healing = healingValue?.value ?? Math.abs(effect.soulDamage?.base ?? 0);

    // Apply healing to soul integrity
    const integrityBefore = soul.integrity;
    soul.integrity = Math.min(100, soul.integrity + healing);
    const integrityAfter = soul.integrity;

    appliedValues.healing = healing;
    appliedValues.integrityBefore = integrityBefore;
    appliedValues.integrityAfter = integrityAfter;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Apply soul binding effect
   */
  private applySoulBinding(
    effect: SoulEffect,
    caster: Entity,
    target: Entity,
    soul: SoulComponent,
    context: EffectContext,
    appliedValues: Record<string, any>
  ): EffectApplicationResult {
    // Bind soul to caster
    soul.bound = true;
    soul.boundTo = caster.id;

    // Calculate expiration time
    if (effect.duration) {
      soul.bindExpires = context.tick + effect.duration;
      appliedValues.bindExpires = soul.bindExpires;
    }

    appliedValues.boundTo = caster.id;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      remainingDuration: effect.duration,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Apply soul freeing effect
   */
  private applySoulFreeing(
    effect: SoulEffect,
    caster: Entity,
    target: Entity,
    soul: SoulComponent,
    context: EffectContext,
    appliedValues: Record<string, any>
  ): EffectApplicationResult {
    // Free the soul
    const wasBound = soul.bound;
    const boundTo = soul.boundTo;

    soul.bound = false;
    soul.boundTo = undefined;
    soul.bindExpires = undefined;

    appliedValues.wasBound = wasBound;
    appliedValues.freedFrom = boundTo;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Apply soul transfer effect (swap souls between bodies)
   */
  private applySoulTransfer(
    effect: SoulEffect,
    source: Entity,
    targetBody: Entity,
    _world: World,
    context: EffectContext,
    appliedValues: Record<string, any>
  ): EffectApplicationResult {
    // Get souls from both entities
    const sourceSoul = source.components.get('soul') as SoulComponent | undefined;
    const targetSoul = targetBody.components.get('soul') as SoulComponent | undefined;

    if (!sourceSoul || !targetSoul) {
      return {
        success: false,
        effectId: effect.id,
        targetId: targetBody.id,
        appliedValues: {},
        resisted: false,
        error: 'Both entities must have souls for transfer',
        appliedAt: context.tick,
        casterId: source.id,
        spellId: context.spell.id,
      };
    }

    // Swap soul essences
    const tempEssence = sourceSoul.essence;
    sourceSoul.essence = targetSoul.essence;
    targetSoul.essence = tempEssence;

    appliedValues.sourceEssence = sourceSoul.essence;
    appliedValues.targetEssence = targetSoul.essence;

    return {
      success: true,
      effectId: effect.id,
      targetId: targetBody.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: source.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Apply soul detection effect
   */
  private applySoulDetection(
    effect: SoulEffect,
    caster: Entity,
    target: Entity,
    context: EffectContext,
    appliedValues: Record<string, any>
  ): EffectApplicationResult {
    // Add or enhance perception_effects component on caster
    const perceptionEffects = caster.components.get('perception_effects') as PerceptionEffectsComponent | undefined;
    if (!perceptionEffects) {
      // Component doesn't exist - would need world to add it
      // Skip for now, component should be added elsewhere
      appliedValues.detectionRange = effect.range ?? 50;
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues,
        resisted: false,
        error: 'Caster lacks perception_effects component',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Enable soul detection
    perceptionEffects.detectsSouls = true;
    perceptionEffects.soulDetectionRange = effect.range ?? 50;

    // Track expiration
    if (effect.duration) {
      perceptionEffects.soulDetectionExpires = context.tick + effect.duration;
      appliedValues.expiresAt = perceptionEffects.soulDetectionExpires;
    }

    appliedValues.detectionRange = perceptionEffects.soulDetectionRange;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      remainingDuration: effect.duration,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Apply resurrection effect
   */
  private applyResurrection(
    effect: SoulEffect,
    caster: Entity,
    target: Entity,
    soul: SoulComponent,
    context: EffectContext,
    appliedValues: Record<string, any>
  ): EffectApplicationResult {
    // Check if resurrection is allowed
    if (!effect.canResurrect) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'This effect cannot resurrect',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Return soul to body
    soul.departed = false;

    // Restore health
    const needs = target.components.get('needs') as NeedsComponentWithHealth | undefined;
    if (needs) {
      const restoredHealth = needs.maxHealth ? needs.maxHealth * 0.25 : 25;
      needs.health = restoredHealth;
      appliedValues.restoredHealth = restoredHealth;
    }

    // Remove death status
    const statusEffects = target.components.get('status_effects') as StatusEffectsComponent | undefined;
    if (statusEffects) {
      statusEffects.isDead = false;
    }

    appliedValues.resurrected = true;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const soulEffectApplier = new SoulEffectApplier();

export { SoulEffectApplier };
export type { SoulComponent };
