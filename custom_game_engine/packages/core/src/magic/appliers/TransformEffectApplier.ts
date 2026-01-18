/**
 * TransformEffectApplier - Handles transformation and polymorph effects
 *
 * This applier manages entity transformations including:
 * - Form changes (polymorph)
 * - Size changes (enlarge/reduce)
 * - Material changes (petrify, gaseous form)
 */

import type { Entity } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type {
  TransformEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';

// Interface for stored appearance data
interface StoredAppearance {
  form?: string;
  size?: number;
  material?: string;
  alignment?: string;
  species?: string;
}

/**
 * Transform applier implementation.
 */
export class TransformEffectApplier implements EffectApplier<TransformEffect> {
  readonly category = 'transform' as const;

  // Store original forms for restoration
  private originalForms: Map<string, StoredAppearance> = new Map();

  apply(
    effect: TransformEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Use numeric encoding for string values in appliedValues
    const appliedValues: Record<string, number> = {};

    // Store original form for restoration
    // Note: Using type guard pattern since appearance component structure is dynamic
    const appearance = target.components.get('appearance');
    if (appearance && !this.originalForms.has(target.id)) {
      const stored: StoredAppearance = {};
      if ('form' in appearance) stored.form = appearance.form as string;
      if ('size' in appearance) stored.size = appearance.size as number;
      if ('material' in appearance) stored.material = appearance.material as string;
      if ('alignment' in appearance) stored.alignment = appearance.alignment as string;
      if ('species' in appearance) stored.species = appearance.species as string;
      this.originalForms.set(target.id, stored);
    }

    // Apply transformation based on type
    switch (effect.transformType) {
      case 'form': {
        // Polymorph - change entity's form
        const targetAppearance = target.components.get('appearance');
        if (targetAppearance && 'form' in targetAppearance) {
          (targetAppearance as { form: string }).form = effect.targetState;
        }

        appliedValues.formChanged = 1;
        break;
      }

      case 'size': {
        // Enlarge/Reduce
        const targetAppearance = target.components.get('appearance');
        if (targetAppearance && 'size' in targetAppearance) {
          const originalSize = (targetAppearance as { size: number }).size || 1.0;
          const sizeMultiplier = parseFloat(effect.targetState) || 1.0;
          (targetAppearance as { size: number }).size = originalSize * sizeMultiplier;

          appliedValues.sizeMultiplier = sizeMultiplier;
          appliedValues.newSize = originalSize * sizeMultiplier;
        }
        break;
      }

      case 'material': {
        // Petrify, Gaseous Form, etc.
        const targetAppearance = target.components.get('appearance');
        if (targetAppearance && 'material' in targetAppearance) {
          (targetAppearance as { material: string }).material = effect.targetState;
        }

        appliedValues.materialChanged = 1;
        break;
      }

      case 'alignment': {
        // Alignment change
        appliedValues.alignmentChanged = 1;
        break;
      }

      case 'species': {
        // Species change (polymorph)
        appliedValues.speciesChanged = 1;
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
      const appearance = target.components.get('appearance');
      if (appearance) {
        // Restore all original appearance properties using type guards
        if (originalForm.form !== undefined && 'form' in appearance) {
          (appearance as { form: string }).form = originalForm.form;
        }
        if (originalForm.size !== undefined && 'size' in appearance) {
          (appearance as { size: number }).size = originalForm.size;
        }
        if (originalForm.material !== undefined && 'material' in appearance) {
          (appearance as { material: string }).material = originalForm.material;
        }
        if (originalForm.alignment !== undefined && 'alignment' in appearance) {
          (appearance as { alignment: string }).alignment = originalForm.alignment;
        }
        if (originalForm.species !== undefined && 'species' in appearance) {
          (appearance as { species: string }).species = originalForm.species;
        }
      }
      this.originalForms.delete(target.id);
    }
  }
}
