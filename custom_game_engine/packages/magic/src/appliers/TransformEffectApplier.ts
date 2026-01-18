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
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const appliedValues: Record<string, any> = {};

    // Create appearance component if missing (defensive programming)
    interface AppearanceComponent {
      type: 'appearance';
      form: string;
      size: number;
      material: string;
      alignment?: string;
      species?: string;
    }

    let appearance = target.components.get('appearance') as AppearanceComponent | undefined;
    if (!appearance) {
      appearance = { type: 'appearance', form: 'default', size: 1.0, material: 'flesh' };
      world.addComponent(target.id, appearance);
    }

    // Store original form for restoration
    if (!this.originalForms.has(target.id)) {
      this.originalForms.set(target.id, { ...appearance });
    }

    // Apply transformation based on type
    switch (effect.transformType) {
      case 'form': {
        // Polymorph - change entity's form
        // Support both 'targetState' and 'newForm' properties
        const effectWithExtras = effect as TransformEffect & { newForm?: string };
        const newForm = effect.targetState || effectWithExtras.newForm;
        if (newForm) {
          appearance.form = newForm;
          appliedValues.newForm = newForm;
          const originalForm = this.originalForms.get(target.id) as AppearanceComponent | undefined;
          appliedValues.oldForm = originalForm?.form || 'unknown';
        }
        break;
      }

      case 'size': {
        // Enlarge/Reduce
        const originalSize = appearance.size || 1.0;
        const sizeMultiplier = parseFloat(effect.targetState) || 1.0;
        appearance.size = originalSize * sizeMultiplier;

        appliedValues.sizeMultiplier = sizeMultiplier;
        appliedValues.newSize = appearance.size;
        break;
      }

      case 'material': {
        // Petrify, Gaseous Form, etc.
        appearance.material = effect.targetState;

        appliedValues.newMaterial = effect.targetState;
        const originalForm = this.originalForms.get(target.id) as AppearanceComponent | undefined;
        appliedValues.oldMaterial = originalForm?.material || 'flesh';
        break;
      }

      case 'alignment': {
        // Alignment change
        appliedValues.newAlignment = effect.targetState;
        const originalForm = this.originalForms.get(target.id) as AppearanceComponent | undefined;
        appliedValues.oldAlignment = originalForm?.alignment || 'neutral';
        break;
      }

      case 'species': {
        // Species change (polymorph)
        appliedValues.newSpecies = effect.targetState;
        const originalForm = this.originalForms.get(target.id) as AppearanceComponent | undefined;
        appliedValues.oldSpecies = originalForm?.species || 'unknown';
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
      interface AppearanceComponent {
        type: 'appearance';
        form: string;
        size: number;
        material: string;
        alignment?: string;
        species?: string;
      }
      const appearance = target.components.get('appearance') as AppearanceComponent | undefined;
      if (appearance) {
        // Restore all original appearance properties
        Object.assign(appearance, originalForm);
      }
      this.originalForms.delete(target.id);
    }
  }
}
