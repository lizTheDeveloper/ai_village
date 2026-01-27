/**
 * PerceptionEffectApplier - Handles perception, detection, and vision enhancement effects
 *
 * This applier grants enhanced perception abilities like:
 * - Detecting invisible/hidden entities
 * - Sensing magic auras and identifying schools
 * - Enhanced vision range (darkvision, truesight)
 * - Detecting specific entity types (alignment, life, etc.)
 * - Multiple simultaneous detection abilities
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  PerceptionEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';

// ============================================================================
// Perception State Tracking
// ============================================================================

/**
 * State for active perception effects.
 * Stored in appliedValues of ActiveEffect.
 */
interface PerceptionState {
  /** Detection range in tiles */
  detectionRange?: number;
  /** Vision range bonus */
  visionRangeBonus?: number;
  /** Effect duration in ticks */
  duration: number;
  /** Detection type enabled */
  detectionType?: string;
  /** Whether this grants darkvision */
  hasDarkvision?: boolean;
  /** Whether this grants truesight */
  hasTruesight?: boolean;
  /** Whether this identifies magic details */
  identifyDetails?: boolean;
}

/**
 * Perception component structure
 * Added to entities to track active perception abilities
 */
interface PerceptionComponent {
  type: 'perception';
  /** Base vision range */
  visionRange?: number;
  /** Active detection types */
  detectionTypes: string[];
  /** Whether entity has darkvision */
  hasDarkvision?: boolean;
  /** Whether entity has truesight */
  hasTruesight?: boolean;
  /** Active perception effects with expiration */
  activePerceptions?: Array<{
    perceptionType: string;
    range: number;
    expiresAt?: number;
    effectId: string;
    identifyDetails?: boolean;
  }>;
}

// ============================================================================
// PerceptionEffectApplier
// ============================================================================

class PerceptionEffectApplier implements EffectApplier<PerceptionEffect> {
  readonly category = 'perception' as const;

  apply(
    effect: PerceptionEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const appliedValues: Record<string, number> = {};

    // Check if target has perception component
    const perceptionRaw = target.components.get('perception');
    let perception: PerceptionComponent | undefined;
    if (perceptionRaw && typeof perceptionRaw === 'object' && 'type' in perceptionRaw && (perceptionRaw as { type: unknown }).type === 'perception') {
      perception = perceptionRaw as unknown as PerceptionComponent;
    }
    if (!perception) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target lacks perception component',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Ensure perception component has required arrays
    if (!perception.detectionTypes) {
      perception.detectionTypes = [];
    }
    if (!perception.activePerceptions) {
      perception.activePerceptions = [];
    }

    // Determine perception type from effect (extending PerceptionEffect interface)
    interface ExtendedPerceptionEffect extends PerceptionEffect {
      perceptionType?: string;
      detectionRange?: number;
      visionRangeBonus?: number;
      identifyDetails?: boolean;
      detectionTypes?: string[];
    }
    const extendedEffect = effect as ExtendedPerceptionEffect;
    const perceptionType = extendedEffect.perceptionType || 'unknown';

    // Calculate detection range with scaling
    let detectionRange = 0;
    if (extendedEffect.detectionRange !== undefined) {
      const scaled = context.scaledValues.get('detection_range');
      if (scaled) {
        detectionRange = scaled.value;
        appliedValues.detectionRange = detectionRange;
      } else {
        detectionRange = extendedEffect.detectionRange;
        appliedValues.detectionRange = detectionRange;
      }
    }

    // Calculate vision range bonus with scaling
    let visionRangeBonus = 0;
    if (extendedEffect.visionRangeBonus !== undefined) {
      const scaled = context.scaledValues.get('vision_range');
      if (scaled) {
        visionRangeBonus = scaled.value;
        appliedValues.visionRangeBonus = visionRangeBonus;
      } else {
        visionRangeBonus = extendedEffect.visionRangeBonus;
        appliedValues.visionRangeBonus = visionRangeBonus;
      }
    }

    // Get duration with scaling
    let duration = effect.duration || 0;
    const scaledDuration = context.scaledValues.get('duration');
    if (scaledDuration) {
      duration = scaledDuration.value;
    }
    // Always set duration in appliedValues
    appliedValues.duration = duration;

    // Calculate expiration time
    const expiresAt = duration > 0 ? context.tick + duration : undefined;

    // Apply perception type-specific logic
    switch (perceptionType) {
      case 'detect_invisible':
        if (!perception.detectionTypes.includes('invisible')) {
          perception.detectionTypes.push('invisible');
        }
        perception.activePerceptions.push({
          perceptionType: 'invisible',
          range: detectionRange,
          expiresAt,
          effectId: effect.id,
        });
        break;

      case 'detect_hidden':
        if (!perception.detectionTypes.includes('hidden')) {
          perception.detectionTypes.push('hidden');
        }
        perception.activePerceptions.push({
          perceptionType: 'hidden',
          range: detectionRange,
          expiresAt,
          effectId: effect.id,
        });
        break;

      case 'detect_alignment':
        if (!perception.detectionTypes.includes('alignment')) {
          perception.detectionTypes.push('alignment');
        }
        perception.activePerceptions.push({
          perceptionType: 'alignment',
          range: detectionRange,
          expiresAt,
          effectId: effect.id,
        });
        break;

      case 'detect_magic':
        if (!perception.detectionTypes.includes('magic')) {
          perception.detectionTypes.push('magic');
        }
        perception.activePerceptions.push({
          perceptionType: 'magic',
          range: detectionRange,
          expiresAt,
          effectId: effect.id,
        });
        break;

      case 'identify_magic':
        if (!perception.detectionTypes.includes('magic')) {
          perception.detectionTypes.push('magic');
        }
        const identifyDetails = extendedEffect.identifyDetails || false;
        perception.activePerceptions.push({
          perceptionType: 'magic',
          range: detectionRange,
          expiresAt,
          effectId: effect.id,
          identifyDetails,
        });
        appliedValues.identifyDetails = identifyDetails ? 1 : 0;
        break;

      case 'enhanced_vision':
        // Vision range bonus is already tracked
        break;

      case 'darkvision':
        perception.hasDarkvision = true;
        perception.activePerceptions.push({
          perceptionType: 'darkvision',
          range: visionRangeBonus || detectionRange,
          expiresAt,
          effectId: effect.id,
        });
        break;

      case 'truesight':
        perception.hasTruesight = true;
        // Truesight includes multiple detection types
        const truesightTypes = ['invisible', 'illusion', 'shapeshifter'];
        for (const type of truesightTypes) {
          if (!perception.detectionTypes.includes(type)) {
            perception.detectionTypes.push(type);
          }
        }
        perception.activePerceptions.push({
          perceptionType: 'truesight',
          range: detectionRange,
          expiresAt,
          effectId: effect.id,
        });
        break;

      case 'multi_detection':
        // Handle multiple detection types simultaneously
        const detectionTypes = extendedEffect.detectionTypes || [];
        for (const type of detectionTypes) {
          if (!perception.detectionTypes.includes(type)) {
            perception.detectionTypes.push(type);
          }
        }
        perception.activePerceptions.push({
          perceptionType: 'multi',
          range: detectionRange,
          expiresAt,
          effectId: effect.id,
        });
        break;

      default:
        // Generic detection type
        if (!perception.detectionTypes.includes(perceptionType)) {
          perception.detectionTypes.push(perceptionType);
        }
        perception.activePerceptions.push({
          perceptionType,
          range: detectionRange,
          expiresAt,
          effectId: effect.id,
        });
        break;
    }

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      remainingDuration: duration,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  tick(
    _activeEffect: ActiveEffect,
    _effect: PerceptionEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // Perception effects are typically passive
    // Expiration is handled by the SpellEffectExecutor
  }

  remove(
    activeEffect: ActiveEffect,
    _effect: PerceptionEffect,
    target: Entity,
    _world: World
  ): void {
    // Clean up perception state when effect expires or is dispelled
    const perceptionRaw = target.components.get('perception');
    if (!perceptionRaw || typeof perceptionRaw !== 'object' || !('type' in perceptionRaw) || (perceptionRaw as { type: unknown }).type !== 'perception') {
      return;
    }
    const perception = perceptionRaw as unknown as PerceptionComponent;

    // Remove the specific perception entry
    if (perception.activePerceptions) {
      const index = perception.activePerceptions.findIndex(
        (p) => p.effectId === activeEffect.effectId && p.expiresAt === activeEffect.expiresAt
      );
      if (index !== -1) {
        const removed = perception.activePerceptions[index];
        if (!removed) return; // Should never happen, but satisfies TypeScript

        perception.activePerceptions.splice(index, 1);

        // Remove detection type if no other effects provide it
        const removedType = removed.perceptionType;
        const stillHasType = perception.activePerceptions.some(
          (p) => p.perceptionType === removedType || p.perceptionType === 'multi' || p.perceptionType === 'truesight'
        );

        if (!stillHasType && perception.detectionTypes) {
          const typeIndex = perception.detectionTypes.indexOf(removedType);
          if (typeIndex !== -1) {
            perception.detectionTypes.splice(typeIndex, 1);
          }
        }

        // Remove special flags if effect provided them
        if (removedType === 'darkvision') {
          const stillHasDarkvision = perception.activePerceptions.some((p) => p.perceptionType === 'darkvision');
          if (!stillHasDarkvision) {
            perception.hasDarkvision = false;
          }
        }

        if (removedType === 'truesight') {
          const stillHasTruesight = perception.activePerceptions.some((p) => p.perceptionType === 'truesight');
          if (!stillHasTruesight) {
            perception.hasTruesight = false;
            // Remove truesight detection types
            const truesightTypes = ['invisible', 'illusion', 'shapeshifter'];
            for (const type of truesightTypes) {
              const stillHasDetection = perception.activePerceptions.some(
                (p) => p.perceptionType === type
              );
              if (!stillHasDetection && perception.detectionTypes) {
                const idx = perception.detectionTypes.indexOf(type);
                if (idx !== -1) {
                  perception.detectionTypes.splice(idx, 1);
                }
              }
            }
          }
        }
      }
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export const perceptionEffectApplier = new PerceptionEffectApplier();

export { PerceptionEffectApplier };
export type { PerceptionState, PerceptionComponent };
