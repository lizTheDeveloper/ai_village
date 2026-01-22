/**
 * AfterlifeNeedsSystem - Manages spiritual needs decay and recovery for souls
 *
 * This system processes entities in the Underworld, updating their afterlife needs:
 * - Coherence decays slowly (faster with high solitude)
 * - Tether decays based on time since remembered
 * - Solitude increases without interaction
 * - Peace increases if no unfinished goals
 *
 * State transitions:
 * - coherence < 0.1 → isShade = true (lost identity)
 * - tether < 0.1 && peace > 0.8 → hasPassedOn = true (departed)
 * - peace < 0.2 → isRestless = true (may haunt)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { Entity } from '../ecs/Entity.js';
import type { AfterlifeComponent } from '../components/AfterlifeComponent.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import { setMutationRate, MUTATION_PATHS } from '../components/MutationVectorComponent.js';

// Decay/recovery rates per game minute
const BASE_COHERENCE_DECAY = 0.0001;      // Very slow - takes ~7000 game minutes to fade
const BASE_TETHER_DECAY = 0.00005;        // Even slower - maintained by remembrance
const SOLITUDE_INCREASE = 0.0002;         // Loneliness builds
const PEACE_GAIN = 0.00005;               // Very slow peace gain if no unfinished business
const FORGOTTEN_THRESHOLD_TICKS = 12000;  // ~10 minutes at 20 TPS before "forgotten" penalty

export class AfterlifeNeedsSystem extends BaseSystem {
  public readonly id: SystemId = 'afterlife_needs';
  public readonly priority: number = 16;  // Right after NeedsSystem (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['afterlife', 'realm_location'];
  // Only run when afterlife components exist (O(1) activation check)
  public readonly activationComponents = ['afterlife'] as const;
  protected readonly throttleInterval = 20; // NORMAL - 1 second

  private lastDeltaUpdateTick = 0;
  private readonly DELTA_UPDATE_INTERVAL = 1200; // 1 game minute

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;
    const shouldUpdateDeltas = currentTick - this.lastDeltaUpdateTick >= this.DELTA_UPDATE_INTERVAL;

    for (const entity of ctx.activeEntities) {
      const afterlife = entity.getComponent<AfterlifeComponent>('afterlife');
      const realmLocation = entity.getComponent<RealmLocationComponent>('realm_location');

      if (!afterlife || !realmLocation) continue;

      // Only process entities in the underworld
      if (realmLocation.currentRealmId !== 'underworld') continue;

      // Skip if already passed on or a shade
      if (afterlife.hasPassedOn || afterlife.isShade) continue;

      // Update afterlife need delta rates once per game minute
      if (shouldUpdateDeltas) {
        this.updateAfterlifeDeltas(entity, afterlife, realmLocation, currentTick);
      }

      // ========================================================================
      // State Transitions (discrete events - keep as direct mutations)
      // ========================================================================

      // Check for shade transformation
      if (afterlife.coherence < 0.1 && !afterlife.isShade) {
        afterlife.isShade = true;

        // Emit shade transformation event
        ctx.emit('soul:became_shade', {
          entityId: entity.id,
          timeSinceDeath: currentTick - afterlife.deathTick,
        }, entity.id);
      }

      // Check for passing on
      if (afterlife.tether < 0.1 && afterlife.peace > 0.8 && !afterlife.hasPassedOn) {
        afterlife.hasPassedOn = true;

        // Emit passing event
        ctx.emit('soul:passed_on', {
          entityId: entity.id,
          timeSinceDeath: currentTick - afterlife.deathTick,
          wasAncestorKami: afterlife.isAncestorKami,
        }, entity.id);
      }

      // Update restless state
      afterlife.isRestless = afterlife.peace < 0.2 && !afterlife.isShade && !afterlife.hasPassedOn;

      // Emit restless event on transition
      if (afterlife.isRestless) {
        ctx.emit('soul:became_restless', {
          entityId: entity.id,
          unfinishedGoals: afterlife.unfinishedGoals,
        }, entity.id);
      }
    }

    if (shouldUpdateDeltas) {
      this.lastDeltaUpdateTick = currentTick;
    }
  }

  /**
   * Update afterlife need mutation rates for a soul entity.
   * Sets mutation rates on entity's MutationVectorComponent.
   */
  private updateAfterlifeDeltas(
    entity: Entity,
    afterlife: AfterlifeComponent,
    realmLocation: RealmLocationComponent,
    currentTick: number
  ): void {
    // Apply time dilation from realm (underworld is 4x slower)
    const timeDilation = realmLocation.timeDilation;

    // ========================================================================
    // Coherence Decay
    // ========================================================================
    let coherenceDecayRate = -BASE_COHERENCE_DECAY;

    // Loneliness accelerates coherence decay
    if (afterlife.solitude > 0.7) {
      coherenceDecayRate *= 1.5;
    }

    // Being an ancestor kami slows decay (tended by worship)
    if (afterlife.isAncestorKami) {
      coherenceDecayRate *= 0.5;
    }

    // Apply time dilation and convert from per-minute to per-second
    coherenceDecayRate *= timeDilation / 60;

    setMutationRate(entity, MUTATION_PATHS.AFTERLIFE_COHERENCE, coherenceDecayRate, {
      min: 0,
      max: 1,
      source: 'afterlife_needs',
    });

    // ========================================================================
    // Tether Decay
    // ========================================================================
    let tetherDecayRate = -BASE_TETHER_DECAY;

    // Check if forgotten (no remembrance in a while)
    const ticksSinceRemembered = currentTick - afterlife.lastRememberedTick;
    if (ticksSinceRemembered > FORGOTTEN_THRESHOLD_TICKS) {
      tetherDecayRate *= 2; // Forgotten souls fade faster
    }

    // Ancestor kami have stable tether (maintained by shrine)
    if (afterlife.isAncestorKami) {
      tetherDecayRate *= 0.25;
    }

    // Apply time dilation and convert from per-minute to per-second
    tetherDecayRate *= timeDilation / 60;

    setMutationRate(entity, MUTATION_PATHS.AFTERLIFE_TETHER, tetherDecayRate, {
      min: 0,
      max: 1,
      source: 'afterlife_needs',
    });

    // ========================================================================
    // Solitude Increases
    // ========================================================================
    let solitudeRate = SOLITUDE_INCREASE;

    // Ancestor kami are less lonely (connected to family)
    if (afterlife.isAncestorKami) {
      solitudeRate *= 0.5;
    }

    // Apply time dilation and convert from per-minute to per-second
    solitudeRate *= timeDilation / 60;

    setMutationRate(entity, MUTATION_PATHS.AFTERLIFE_SOLITUDE, solitudeRate, {
      min: 0,
      max: 1,
      source: 'afterlife_needs',
    });

    // ========================================================================
    // Peace Changes
    // ========================================================================
    let peaceRate: number;

    if (afterlife.unfinishedGoals.length === 0) {
      // No unfinished business - peace slowly increases
      peaceRate = PEACE_GAIN;
    } else {
      // Unfinished business - peace slowly decreases (restlessness)
      peaceRate = -PEACE_GAIN * 0.5;
    }

    // Apply time dilation and convert from per-minute to per-second
    peaceRate *= timeDilation / 60;

    setMutationRate(entity, MUTATION_PATHS.AFTERLIFE_PEACE, peaceRate, {
      min: 0,
      max: 1,
      source: 'afterlife_needs',
    });
  }
}
