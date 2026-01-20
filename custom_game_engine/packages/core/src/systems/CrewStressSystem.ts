/**
 * CrewStressSystem - Manages crew stress accumulation and recovery during β-space navigation
 *
 * This system handles:
 * - Stress accumulation during active β-space navigation
 * - Stress recovery through shore leave, meditation, medic intervention
 * - Passive stress recovery when not navigating
 * - Stress threshold monitoring and event emission
 * - Coherence penalties based on stress levels
 *
 * Priority: 420 (after FleetCoherenceSystem at 400)
 *
 * Stress Thresholds:
 * - 0.0-0.3: Low stress, normal function
 * - 0.3-0.5: Moderate stress, -10% coherence contribution
 * - 0.5-0.7: High stress, -20% coherence, morale drops
 * - 0.7-1.0: Critical stress, -40% coherence, major morale drop
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ShipCrewComponent } from '../components/ShipCrewComponent.js';
import {
  accumulateStress,
  reduceStress,
  updateMorale,
} from '../components/ShipCrewComponent.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Constants
// ============================================================================

/** Rate of stress accumulation per tick during β-space navigation */
const STRESS_ACCUMULATION_RATE = 0.001;

/** Passive recovery rate per tick when not navigating (applied every 100 ticks) */
const PASSIVE_RECOVERY_RATE = 0.01;

/** Ticks between passive recovery applications */
const PASSIVE_RECOVERY_INTERVAL = 100;

/** Shore leave stress reduction */
const SHORE_LEAVE_RECOVERY = 0.5;

/** Meditation chamber stress reduction */
const MEDITATION_RECOVERY = 0.2;

/** Medic intervention stress reduction */
const MEDIC_RELIEF_RECOVERY = 0.1;

/** Stress thresholds for event emission */
const STRESS_THRESHOLD_MODERATE = 0.3;
const STRESS_THRESHOLD_HIGH = 0.5;
const STRESS_THRESHOLD_CRITICAL = 0.7;

// ============================================================================
// System
// ============================================================================

export class CrewStressSystem extends BaseSystem {
  public readonly id: SystemId = 'crew_stress' as SystemId;
  public readonly priority: number = 420;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.ShipCrew];
  public readonly activationComponents = ['ship_crew'] as const;
  public readonly metadata = {
    category: 'combat',
    description: 'Manages crew stress accumulation and recovery during β-space navigation',
    dependsOn: ['fleet_coherence' as SystemId],
    writesComponents: [CT.ShipCrew] as const,
  } as const;

  protected readonly throttleInterval = 10; // Every 0.5 seconds at 20 TPS

  // ========================================================================
  // State Tracking
  // ========================================================================

  /**
   * Track last stress threshold crossed for each crew member
   * Used to prevent duplicate events
   */
  private lastStressThreshold: Record<string, number> = Object.create(null);

  /**
   * Track ships currently navigating β-space
   * Cache to avoid repeated queries
   * PERF: Object literal faster than Set for lookups
   */
  private navigatingShips: Record<string, boolean> = Object.create(null);
  private lastShipCacheTick = -1;
  private readonly SHIP_CACHE_LIFETIME = 100; // Rebuild every 5 seconds

  // ========================================================================
  // Update Logic
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Rebuild ship navigation cache if needed
    if (tick - this.lastShipCacheTick > this.SHIP_CACHE_LIFETIME) {
      this.rebuildNavigatingShipsCache(ctx.world);
      this.lastShipCacheTick = tick;
    }

    // Process all crew members
    for (const entity of ctx.activeEntities) {
      const crew = entity.getComponent<ShipCrewComponent>(CT.ShipCrew);
      if (!crew) continue;

      const previousStress = crew.betaSpaceStress;
      const isNavigating = crew.shipId in this.navigatingShips;

      if (isNavigating) {
        // Accumulate stress during navigation
        this.accumulateNavigationStress(crew, 1);
      } else {
        // Apply passive recovery when not navigating
        if (tick % PASSIVE_RECOVERY_INTERVAL === 0) {
          this.updatePassiveRecovery(crew, PASSIVE_RECOVERY_INTERVAL);
        }
      }

      const currentStress = crew.betaSpaceStress;

      // Check for threshold crossings
      this.checkStressThresholds(ctx.world, entity.id, crew, previousStress, currentStress);

      // Apply coherence penalties based on stress
      this.applyStressPenalties(crew);
    }
  }

  // ========================================================================
  // Ship Navigation Cache
  // ========================================================================

  /**
   * Rebuild cache of ships currently navigating β-space
   */
  private rebuildNavigatingShipsCache(world: World): void {
    this.navigatingShips = Object.create(null);

    const shipEntities = world.query().with(CT.Spaceship).executeEntities();
    for (const shipEntity of shipEntities) {
      const ship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
      if (!ship) continue;

      // Check if ship can navigate β-space and is currently in transit
      const isNavigating =
        ship.navigation.can_navigate_beta_space &&
        ship.crew.coherence >= ship.navigation.coherence_threshold;

      if (isNavigating) {
        this.navigatingShips[shipEntity.id] = true;
      }
    }
  }

  // ========================================================================
  // Stress Accumulation
  // ========================================================================

  /**
   * Accumulate stress during β-space navigation
   * @param crew - ShipCrewComponent to modify
   * @param duration - Duration in ticks
   */
  public accumulateNavigationStress(crew: ShipCrewComponent, duration: number): void {
    accumulateStress(crew, duration);
  }

  // ========================================================================
  // Stress Recovery
  // ========================================================================

  /**
   * Apply passive stress recovery when not navigating
   * @param crew - ShipCrewComponent to modify
   * @param ticksSinceLastNav - Ticks since last navigation
   */
  public updatePassiveRecovery(crew: ShipCrewComponent, ticksSinceLastNav: number): void {
    if (crew.betaSpaceStress > 0) {
      reduceStress(crew, PASSIVE_RECOVERY_RATE);
    }
  }

  /**
   * Apply medic intervention stress relief
   * @param crew - ShipCrewComponent to modify
   */
  public applyMedicRelief(crew: ShipCrewComponent): void {
    reduceStress(crew, MEDIC_RELIEF_RECOVERY);
  }

  /**
   * Apply meditation chamber stress recovery
   * @param crew - ShipCrewComponent to modify
   */
  public applyMeditationRecovery(crew: ShipCrewComponent): void {
    reduceStress(crew, MEDITATION_RECOVERY);
  }

  /**
   * Apply shore leave stress recovery
   * @param crew - ShipCrewComponent to modify
   */
  public applyShoreLeave(crew: ShipCrewComponent): void {
    reduceStress(crew, SHORE_LEAVE_RECOVERY);
  }

  // ========================================================================
  // Stress Penalties
  // ========================================================================

  /**
   * Apply coherence and morale penalties based on stress level
   * @param crew - ShipCrewComponent to modify
   */
  private applyStressPenalties(crew: ShipCrewComponent): void {
    const stress = crew.betaSpaceStress;

    // Morale drops at high stress
    if (stress > STRESS_THRESHOLD_HIGH) {
      const moraleDropRate = stress > STRESS_THRESHOLD_CRITICAL ? -0.02 : -0.01;
      updateMorale(crew, moraleDropRate);
    }
  }

  // ========================================================================
  // Threshold Monitoring
  // ========================================================================

  /**
   * Check if crew member crossed a stress threshold and emit events
   * @param world - World instance
   * @param crewEntityId - Crew entity ID
   * @param crew - ShipCrewComponent
   * @param previousStress - Previous stress level
   * @param currentStress - Current stress level
   */
  private checkStressThresholds(
    world: World,
    crewEntityId: string,
    crew: ShipCrewComponent,
    previousStress: number,
    currentStress: number
  ): void {
    // Determine previous and current threshold
    const prevThreshold = this.getStressThreshold(previousStress);
    const currThreshold = this.getStressThreshold(currentStress);

    // Only emit if threshold changed
    if (prevThreshold !== currThreshold) {
      const lastThreshold = this.lastStressThreshold[crewEntityId] ?? -1;

      // Avoid duplicate events
      if (currThreshold !== lastThreshold) {
        this.lastStressThreshold[crewEntityId] = currThreshold;

        // Emit threshold crossed event
        if (currThreshold > prevThreshold) {
          // Stress increasing
          world.eventBus.emit({
            type: 'crew:stress_threshold_crossed',
            source: crewEntityId,
            data: {
              crewId: crewEntityId,
              shipId: crew.shipId,
              role: crew.role,
              previousThreshold: prevThreshold,
              currentThreshold: currThreshold,
              stress: currentStress,
            },
          });

          // Emit critical stress event if reached critical threshold
          if (currThreshold >= STRESS_THRESHOLD_CRITICAL) {
            world.eventBus.emit({
              type: 'crew:stress_critical',
              source: crewEntityId,
              data: {
                crewId: crewEntityId,
                shipId: crew.shipId,
                role: crew.role,
                stress: currentStress,
                morale: crew.morale,
                quantumCoupling: crew.quantumCouplingContribution,
              },
            });
          }
        } else {
          // Stress decreasing - recovered
          world.eventBus.emit({
            type: 'crew:stress_recovered',
            source: crewEntityId,
            data: {
              crewId: crewEntityId,
              shipId: crew.shipId,
              role: crew.role,
              previousThreshold: prevThreshold,
              currentThreshold: currThreshold,
              stress: currentStress,
            },
          });
        }
      }
    }
  }

  /**
   * Get stress threshold index for a given stress level
   * @param stress - Stress level (0-1)
   * @returns Threshold index (0 = low, 1 = moderate, 2 = high, 3 = critical)
   */
  private getStressThreshold(stress: number): number {
    if (stress >= STRESS_THRESHOLD_CRITICAL) return 3;
    if (stress >= STRESS_THRESHOLD_HIGH) return 2;
    if (stress >= STRESS_THRESHOLD_MODERATE) return 1;
    return 0;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: CrewStressSystem | null = null;

export function getCrewStressSystem(): CrewStressSystem {
  if (!systemInstance) {
    systemInstance = new CrewStressSystem();
  }
  return systemInstance;
}
