/**
 * TransformEffectApplier - Handles transformation and polymorph effects
 *
 * This applier manages entity transformations including:
 * - Form changes (polymorph)
 * - Size changes (enlarge/reduce)
 * - Material changes (petrify, gaseous form)
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  TransformEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';

/**
 * Transform applier implementation.
 */
export class TransformEffectApplier implements EffectApplier<TransformEffect> {
  readonly category = 'transform' as const;

  // Store original forms for restoration
  private originalForms: Map<string, any> = new Map();

  apply(
    effect: TransformEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const appliedValues: Record<string, any> = {};

    // Store original form for restoration
    const appearance = target.components.get('appearance') as any;
    if (appearance && !this.originalForms.has(target.id)) {
      this.originalForms.set(target.id, { ...appearance });
    }

    // Apply transformation based on type
    switch (effect.transformType) {
      case 'form': {
        // Polymorph - change entity's form
        const targetAppearance = (target.components.get('appearance') as any) || {};
        targetAppearance.form = effect.targetState;

        appliedValues.newForm = effect.targetState;
        appliedValues.oldForm = this.originalForms.get(target.id)?.form || 'unknown';
        break;
      }

      case 'size': {
        // Enlarge/Reduce
        const targetAppearance = (target.components.get('appearance') as any) || {};
        const originalSize = targetAppearance.size || 1.0;
        const sizeMultiplier = parseFloat(effect.targetState) || 1.0;
        targetAppearance.size = originalSize * sizeMultiplier;

        appliedValues.sizeMultiplier = sizeMultiplier;
        appliedValues.newSize = targetAppearance.size;
        break;
      }

      case 'material': {
        // Petrify, Gaseous Form, etc.
        const targetAppearance = (target.components.get('appearance') as any) || {};
        targetAppearance.material = effect.targetState;

        appliedValues.newMaterial = effect.targetState;
        appliedValues.oldMaterial = this.originalForms.get(target.id)?.material || 'flesh';
        break;
      }

      case 'alignment': {
        // Alignment change
        appliedValues.newAlignment = effect.targetState;
        appliedValues.oldAlignment = this.originalForms.get(target.id)?.alignment || 'neutral';
        break;
      }

      case 'species': {
        // Species change (polymorph)
        appliedValues.newSpecies = effect.targetState;
        appliedValues.oldSpecies = this.originalForms.get(target.id)?.species || 'unknown';
        break;
      }

      default: {
        return {
          success: false,
          effectId: effect.id,
          targetId: target.id,
          appliedValues: {},
          resisted: false,
          error: `Unknown transform type: ${effect.transformType}`,
          appliedAt: context.tick,
          casterId: caster.id,
          spellId: context.spell.id,
        };
      }
    }

    // Apply stat changes if specified
    if (effect.statChanges && effect.statChanges.length > 0) {
      appliedValues.statChangesCount = effect.statChanges.length;
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
    };
  }

  tick(
    _activeEffect: ActiveEffect,
    _effect: TransformEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // Transformations don't typically need tick processing
    // but we could check for conditions that break the transformation early
  }

  remove(
    _activeEffect: ActiveEffect,
    _effect: TransformEffect,
    target: Entity,
    _world: World
  ): void {
    // Restore original form
    const originalForm = this.originalForms.get(target.id);
    if (originalForm) {
      const appearance = target.components.get('appearance') as any;
      if (appearance) {
        // Restore all original appearance properties
        Object.assign(appearance, originalForm);
      }
      this.originalForms.delete(target.id);
    }
  }
}
