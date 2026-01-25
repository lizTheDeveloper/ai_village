/**
 * MentalEffectApplier - Handles mental spell effects
 *
 * Applies mental effects to target entities with support for:
 * - Fear (flee from caster)
 * - Charm (become friendly)
 * - Confusion (random actions)
 * - Domination (direct control)
 * - Memory modification (permanent memory changes)
 * - Illusion (false sensory input)
 * - Telepathy (mental communication link)
 * - Willpower resistance checks
 * - Mindless immunity (constructs, etc.)
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  MentalEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import type {
  BehaviorComponent,
  MentalEffectsComponent,
  PerceptionEffectsComponent,
  StatsComponent,
} from '../types/ComponentTypes.js';

// ============================================================================
// MentalEffectApplier
// ============================================================================

class MentalEffectApplierClass implements EffectApplier<MentalEffect> {
  public readonly category = 'mental' as const;

  /**
   * Apply mental effect to a target entity.
   */
  apply(
    effect: MentalEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Check if target is mindless (constructs, undead, etc.)
    const tags = target.components.get('tags') as string[] | undefined;
    if (tags && (tags.includes('mindless') || tags.includes('construct'))) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target is mindless and immune to mental effects',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get scaled mental strength value
    const strengthValue = context.scaledValues.get('strength');
    const mentalStrength = strengthValue?.value ?? effect.mentalStrength.base;

    // Perform willpower resistance check
    const stats = target.components.get('stats') as StatsComponent | undefined;
    const willpower = stats?.willpower ?? 10;

    // Resistance check: willpower must exceed 80% of mental strength to resist
    if (willpower > mentalStrength * 0.8) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {
          mentalStrength,
          willpower,
        },
        resisted: true,
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Apply the mental effect based on type
    switch (effect.mentalType) {
      case 'fear':
        this.applyFear(effect, caster, target, context);
        break;

      case 'charm':
        this.applyCharm(effect, caster, target, context);
        break;

      case 'confuse':
        this.applyConfusion(effect, caster, target, context);
        break;

      case 'dominate':
        this.applyDomination(effect, caster, target, context);
        break;

      case 'memory':
        this.applyMemoryModification(effect, caster, target, context);
        break;

      case 'illusion':
        this.applyIllusion(effect, caster, target, context);
        break;

      case 'telepathy':
        this.applyTelepathy(effect, caster, target, context);
        break;
    }

    // Calculate remaining duration (memory is permanent)
    const remainingDuration = effect.mentalType === 'memory'
      ? undefined
      : effect.duration;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        mentalStrength,
        willpower,
        strength: mentalStrength,
      },
      resisted: false,
      remainingDuration,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Tick handler for mental effects (cleanup expired effects).
   */
  tick(
    _activeEffect: ActiveEffect,
    _effect: MentalEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // Mental effects are typically handled by behavior systems
    // No per-tick processing needed
  }

  /**
   * Remove mental effect (cleanup).
   */
  remove(
    _activeEffect: ActiveEffect,
    _effect: MentalEffect,
    _target: Entity,
    _world: World
  ): void {
    // Cleanup would be handled by behavior systems
    // when checking effect expiration
  }

  // ========== Helper Methods ==========

  /**
   * Apply fear effect - target flees from caster.
   */
  private applyFear(
    _effect: MentalEffect,
    caster: Entity,
    target: Entity,
    _context: EffectContext
  ): void {
    let behavior = target.components.get('behavior') as BehaviorComponent | undefined;
    if (!behavior) {
      behavior = { type: 'behavior', currentBehavior: 'flee' };
      target.addComponent(behavior as Component);
    } else {
      behavior.currentBehavior = 'flee';
      behavior.fleeFrom = caster.id;
    }
  }

  /**
   * Apply charm effect - target becomes friendly to caster.
   */
  private applyCharm(
    effect: MentalEffect,
    caster: Entity,
    target: Entity,
    _context: EffectContext
  ): void {
    let mentalEffects = target.components.get('mental_effects') as MentalEffectsComponent | undefined;
    if (!mentalEffects) {
      mentalEffects = { type: 'mental_effects', charmedBy: caster.id, aware: !effect.subtle };
      target.addComponent(mentalEffects as Component);
    } else {
      mentalEffects.charmedBy = caster.id;
      mentalEffects.aware = !effect.subtle; // Subtle = unaware
    }
  }

  /**
   * Apply confusion effect - target takes random actions.
   */
  private applyConfusion(
    effect: MentalEffect,
    _caster: Entity,
    target: Entity,
    context: EffectContext
  ): void {
    let behavior = target.components.get('behavior') as BehaviorComponent | undefined;
    if (!behavior) {
      behavior = {
        type: 'behavior',
        currentBehavior: 'confused',
        confused: true,
        confusedUntil: context.tick + (effect.duration ?? 0)
      };
      target.addComponent(behavior as Component);
    } else {
      behavior.confused = true;
      behavior.confusedUntil = context.tick + (effect.duration ?? 0);
    }
  }

  /**
   * Apply domination effect - caster can directly control target.
   */
  private applyDomination(
    effect: MentalEffect,
    caster: Entity,
    target: Entity,
    context: EffectContext
  ): void {
    let mentalEffects = target.components.get('mental_effects') as MentalEffectsComponent | undefined;
    if (!mentalEffects) {
      mentalEffects = {
        type: 'mental_effects',
        dominatedBy: caster.id,
        dominationEnds: context.tick + (effect.duration ?? 0)
      };
      target.addComponent(mentalEffects as Component);
    } else {
      mentalEffects.dominatedBy = caster.id;
      mentalEffects.dominationEnds = context.tick + (effect.duration ?? 0);
    }
  }

  /**
   * Apply memory modification - permanently alter target's memories.
   */
  private applyMemoryModification(
    _effect: MentalEffect,
    caster: Entity,
    target: Entity,
    _context: EffectContext
  ): void {
    interface MemoryComponent extends Component {
      type: 'memory';
      modified?: boolean;
      modifiedBy?: string;
      [key: string]: unknown;
    }

    let memory = target.components.get('memory') as MemoryComponent | undefined;
    if (!memory) {
      memory = {
        type: 'memory',
        modified: true,
        modifiedBy: caster.id
      };
      target.addComponent(memory);
    } else {
      memory.modified = true;
      memory.modifiedBy = caster.id;
    }
  }

  /**
   * Apply illusion effect - create false sensory input.
   */
  private applyIllusion(
    effect: MentalEffect,
    caster: Entity,
    target: Entity,
    context: EffectContext
  ): void {
    // Get scaled strength value
    const strengthValue = context.scaledValues.get('strength');
    const mentalStrength = strengthValue?.value ?? effect.mentalStrength.base;

    let perceptionEffects = target.components.get('perception_effects') as PerceptionEffectsComponent | undefined;
    if (!perceptionEffects) {
      perceptionEffects = {
        type: 'perception_effects',
        illusions: [{
          content: effect.illusionContent,
          strength: mentalStrength,
          casterId: caster.id,
        }]
      };
      target.addComponent(perceptionEffects as Component);
    } else {
      if (!perceptionEffects.illusions) {
        perceptionEffects.illusions = [];
      }
      perceptionEffects.illusions.push({
        content: effect.illusionContent,
        strength: mentalStrength,
        casterId: caster.id,
      });
    }
  }

  /**
   * Apply telepathy effect - create mental communication link.
   */
  private applyTelepathy(
    _effect: MentalEffect,
    caster: Entity,
    target: Entity,
    _context: EffectContext
  ): void {
    let mentalEffects = target.components.get('mental_effects') as MentalEffectsComponent | undefined;
    if (!mentalEffects) {
      mentalEffects = {
        type: 'mental_effects',
        linkedTo: [caster.id],
        linkType: 'telepathy'
      };
      target.addComponent(mentalEffects as Component);
    } else {
      if (!mentalEffects.linkedTo) {
        mentalEffects.linkedTo = [];
      }
      mentalEffects.linkedTo.push(caster.id);
      mentalEffects.linkType = 'telepathy';
    }
  }
}

export const MentalEffectApplier = new MentalEffectApplierClass();

// ============================================================================
// Registration Function
// ============================================================================

export function registerMentalEffectApplier(): void {
  const executor = require('../SpellEffectExecutor.js').SpellEffectExecutor.getInstance();
  executor.registerApplier(MentalEffectApplier);
}

/**
 * Initialize the mental effect system.
 * Call this during game startup.
 */
export function initializeMentalEffects(): void {
  registerMentalEffectApplier();
}
