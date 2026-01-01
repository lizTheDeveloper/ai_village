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

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { AfterlifeComponent } from '../components/AfterlifeComponent.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import type { TimeComponent } from './TimeSystem.js';

// Decay/recovery rates per game minute
const BASE_COHERENCE_DECAY = 0.0001;      // Very slow - takes ~7000 game minutes to fade
const BASE_TETHER_DECAY = 0.00005;        // Even slower - maintained by remembrance
const SOLITUDE_INCREASE = 0.0002;         // Loneliness builds
const PEACE_GAIN = 0.00005;               // Very slow peace gain if no unfinished business
const FORGOTTEN_THRESHOLD_TICKS = 12000;  // ~10 minutes at 20 TPS before "forgotten" penalty

export class AfterlifeNeedsSystem implements System {
  public readonly id: SystemId = 'afterlife_needs';
  public readonly priority: number = 16;  // Right after NeedsSystem (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['afterlife', 'realm_location'];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get current game tick for forgotten calculation
    const currentTick = world.tick;
    let gameMinutesElapsed = 0;

    // Get time component for day length calculation
    const timeEntities = world.query().with('time').executeEntities();
    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0] as EntityImpl;
      const timeComp = timeEntity.getComponent<TimeComponent>('time');
      if (timeComp) {
        // Calculate game minutes elapsed
        const effectiveDayLength = timeComp.dayLength / timeComp.speedMultiplier;
        const hoursElapsed = (deltaTime / effectiveDayLength) * 24;
        gameMinutesElapsed = hoursElapsed * 60;
      }
    }

    // Fallback if no time system
    if (gameMinutesElapsed === 0) {
      gameMinutesElapsed = deltaTime / 60;
    }

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const afterlife = impl.getComponent<AfterlifeComponent>('afterlife');
      const realmLocation = impl.getComponent<RealmLocationComponent>('realm_location');

      if (!afterlife || !realmLocation) continue;

      // Only process entities in the underworld
      if (realmLocation.currentRealmId !== 'underworld') continue;

      // Skip if already passed on or a shade
      if (afterlife.hasPassedOn || afterlife.isShade) continue;

      // Apply time dilation from realm (underworld is 4x slower)
      const adjustedMinutes = gameMinutesElapsed * realmLocation.timeDilation;

      // ========================================================================
      // Coherence Decay
      // ========================================================================
      let coherenceDecay = BASE_COHERENCE_DECAY * adjustedMinutes;

      // Loneliness accelerates coherence decay
      if (afterlife.solitude > 0.7) {
        coherenceDecay *= 1.5;
      }

      // Being an ancestor kami slows decay (tended by worship)
      if (afterlife.isAncestorKami) {
        coherenceDecay *= 0.5;
      }

      afterlife.coherence = Math.max(0, afterlife.coherence - coherenceDecay);

      // ========================================================================
      // Tether Decay
      // ========================================================================
      let tetherDecay = BASE_TETHER_DECAY * adjustedMinutes;

      // Check if forgotten (no remembrance in a while)
      const ticksSinceRemembered = currentTick - afterlife.lastRememberedTick;
      if (ticksSinceRemembered > FORGOTTEN_THRESHOLD_TICKS) {
        tetherDecay *= 2;  // Forgotten souls fade faster
      }

      // Ancestor kami have stable tether (maintained by shrine)
      if (afterlife.isAncestorKami) {
        tetherDecay *= 0.25;
      }

      afterlife.tether = Math.max(0, afterlife.tether - tetherDecay);

      // ========================================================================
      // Solitude Increases
      // ========================================================================
      let solitudeIncrease = SOLITUDE_INCREASE * adjustedMinutes;

      // Ancestor kami are less lonely (connected to family)
      if (afterlife.isAncestorKami) {
        solitudeIncrease *= 0.5;
      }

      afterlife.solitude = Math.min(1, afterlife.solitude + solitudeIncrease);

      // ========================================================================
      // Peace Changes
      // ========================================================================
      if (afterlife.unfinishedGoals.length === 0) {
        // No unfinished business - peace slowly increases
        afterlife.peace = Math.min(1, afterlife.peace + PEACE_GAIN * adjustedMinutes);
      } else {
        // Unfinished business - peace slowly decreases (restlessness)
        afterlife.peace = Math.max(0, afterlife.peace - PEACE_GAIN * 0.5 * adjustedMinutes);
      }

      // ========================================================================
      // State Transitions
      // ========================================================================

      // Check for shade transformation
      if (afterlife.coherence < 0.1 && !afterlife.isShade) {
        afterlife.isShade = true;

        // Emit shade transformation event
        world.eventBus.emit({
          type: 'soul:became_shade',
          source: entity.id,
          data: {
            entityId: entity.id,
            timeSinceDeath: currentTick - afterlife.deathTick,
          },
        });
      }

      // Check for passing on
      if (afterlife.tether < 0.1 && afterlife.peace > 0.8 && !afterlife.hasPassedOn) {
        afterlife.hasPassedOn = true;

        // Emit passing event
        world.eventBus.emit({
          type: 'soul:passed_on',
          source: entity.id,
          data: {
            entityId: entity.id,
            timeSinceDeath: currentTick - afterlife.deathTick,
            wasAncestorKami: afterlife.isAncestorKami,
          },
        });
      }

      // Update restless state
      afterlife.isRestless = afterlife.peace < 0.2 && !afterlife.isShade && !afterlife.hasPassedOn;

      // Emit restless event on transition
      if (afterlife.isRestless && afterlife.peace === 0.2 - PEACE_GAIN * 0.5 * adjustedMinutes) {
        world.eventBus.emit({
          type: 'soul:became_restless',
          source: entity.id,
          data: {
            entityId: entity.id,
            unfinishedGoals: afterlife.unfinishedGoals,
          },
        });
      }
    }
  }
}
