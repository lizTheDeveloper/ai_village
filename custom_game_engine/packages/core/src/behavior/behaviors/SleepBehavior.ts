/**
 * SleepBehavior - Sleep-related behaviors for agents
 *
 * Includes:
 * - SeekSleepBehavior: Find a bed and go to sleep
 * - ForcedSleepBehavior: Collapse from exhaustion
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { CircadianComponent } from '../../components/CircadianComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { getCircadian, getBuilding, getPosition, getNeeds, getAgent } from '../../utils/componentHelpers.js';
import { safeUpdateComponent } from '../../utils/componentUtils.js';
import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';
import { assignBed } from '../../components/AgentComponent.js';

// Chunk spatial query injection for efficient nearby entity lookups
let chunkSpatialQuery: any | null = null;

export function injectChunkSpatialQueryToSleep(spatialQuery: any): void {
  chunkSpatialQuery = spatialQuery;
  console.log('[SleepBehavior] ChunkSpatialQuery injected for efficient bed lookups');
}

/**
 * SeekSleepBehavior - Find a bed/bedroll and go to sleep
 */
export class SeekSleepBehavior extends BaseBehavior {
  readonly name = 'seek_sleep' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Disable steering system
    this.disableSteering(entity);

    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const circadian = getCircadian(entity);
    const agent = getAgent(entity);

    if (!position) {
      return { complete: true, reason: 'Missing required components' };
    }

    if (!circadian) {
      // No circadian component, just idle
      this.stopAllMovement(entity);
      return { complete: true, reason: 'No circadian component' };
    }

    // Already sleeping - SleepSystem handles wake conditions
    if (circadian.isSleeping) {
      this.stopAllMovement(entity);
      return { complete: true, reason: 'sleep_complete' };
    }

    // First, check for assigned bed
    let sleepLocation: Entity | null = null;

    if (agent?.assignedBed) {
      // Try to use assigned bed
      const assignedBedEntity = world.entities.get(agent.assignedBed);
      if (assignedBedEntity) {
        const bedBuilding = getBuilding(assignedBedEntity);
        // Verify bed still exists and is complete
        if (bedBuilding?.isComplete) {
          sleepLocation = assignedBedEntity;
        } else {
          // Bed was destroyed or incomplete - clear assignment
          this.clearBedAssignment(entity, world);
        }
      } else {
        // Bed entity no longer exists - clear assignment
        this.clearBedAssignment(entity, world);
      }
    }

    // If no assigned bed (or it was cleared), find nearest available bed
    if (!sleepLocation) {
      sleepLocation = this.findNearestBed(world, position, entity.id);
    }

    if (sleepLocation) {
      const bedPos = (sleepLocation as EntityImpl).getComponent<PositionComponent>(ComponentType.Position)!;

      // Move toward bed (with arrival slowdown)
      const distance = this.moveToward(entity, bedPos);

      if (distance <= 1.5) {
        // Close enough - start sleeping and claim bed if unclaimed
        this.stopAllMovement(entity);
        this.startSleeping(entity, world, sleepLocation);
        return { complete: true, reason: 'Started sleeping in bed' };
      }
    } else {
      // No bed found - sleep on ground
      this.startSleeping(entity, world, null);
      return { complete: true, reason: 'Started sleeping on ground' };
    }
  }

  /**
   * Clear bed assignment when bed is destroyed or invalid.
   */
  private clearBedAssignment(entity: EntityImpl, _world: World): void {
    safeUpdateComponent<AgentComponent>(entity, ComponentType.Agent, () => ({
      assignedBed: undefined,
      // Also clear bed from assignedLocations
      assignedLocations: (() => {
        const agent = getAgent(entity);
        if (agent?.assignedLocations) {
          const locations = { ...agent.assignedLocations };
          delete locations['bed'];
          return Object.keys(locations).length > 0 ? locations : undefined;
        }
        return undefined;
      })(),
    }));
  }

  /**
   * Find nearest available bed for this agent.
   *
   * Priority:
   * 1. Beds owned by this agent (should already be handled by assignedBed)
   * 2. Unclaimed beds (no owner)
   * 3. If no unclaimed beds, fall back to any bed (agent will sleep on ground near it)
   */
  private findNearestBed(world: World, position: PositionComponent, agentId: string): Entity | null {
    const BED_SEARCH_RADIUS = 50; // Search within 50 tiles for beds
    let nearestUnclaimed: Entity | null = null;
    let nearestUnclaimedDist = Infinity;
    let nearestOwned: Entity | null = null;
    let nearestOwnedDist = Infinity;

    if (chunkSpatialQuery) {
      // Use ChunkSpatialQuery for efficient nearby lookups
      const buildingsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        BED_SEARCH_RADIUS,
        [ComponentType.Building]
      );

      for (const { entity: bed, distance } of buildingsInRadius) {
        const building = getBuilding(bed);
        const bedPos = getPosition(bed);

        if (!building || !bedPos) continue;
        if (!building.isComplete) continue; // Only complete beds

        if (building.buildingType === BuildingType.Bed || building.buildingType === BuildingType.Bedroll) {
          // Check ownership
          if (building.ownerId === agentId) {
            // This agent owns this bed
            if (distance < nearestOwnedDist) {
              nearestOwnedDist = distance;
              nearestOwned = bed;
            }
          } else if (!building.ownerId || building.accessType === 'communal') {
            // Unclaimed or communal bed
            if (distance < nearestUnclaimedDist) {
              nearestUnclaimedDist = distance;
              nearestUnclaimed = bed;
            }
          }
          // Skip beds owned by other agents
        }
      }
    } else {
      // Fallback to global query
      const beds = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();

      for (const bed of beds) {
        const building = getBuilding(bed);
        const bedPos = getPosition(bed);

        if (!building || !bedPos) continue;
        if (!building.isComplete) continue; // Only complete beds

        const dist = this.distance(position, bedPos);

        // Only consider beds within search radius for performance
        if (dist > BED_SEARCH_RADIUS) continue;

        if (building.buildingType === BuildingType.Bed || building.buildingType === BuildingType.Bedroll) {
          // Check ownership
          if (building.ownerId === agentId) {
            // This agent owns this bed
            if (dist < nearestOwnedDist) {
              nearestOwnedDist = dist;
              nearestOwned = bed;
            }
          } else if (!building.ownerId || building.accessType === 'communal') {
            // Unclaimed or communal bed
            if (dist < nearestUnclaimedDist) {
              nearestUnclaimedDist = dist;
              nearestUnclaimed = bed;
            }
          }
          // Skip beds owned by other agents
        }
      }
    }

    // Return owned bed first (though this is usually handled by assignedBed)
    // Then unclaimed/communal
    return nearestOwned ?? nearestUnclaimed;
  }

  private startSleeping(entity: EntityImpl, world: World, location: Entity | null): void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const quality = this.calculateSleepQuality(location);
    const agent = getAgent(entity);

    // Claim bed if it's unclaimed and agent doesn't already have an assigned bed
    if (location && agent) {
      const bedBuilding = getBuilding(location);
      const bedPos = getPosition(location);

      // Check if this bed can be claimed
      if (bedBuilding && bedPos && !bedBuilding.ownerId && !agent.assignedBed) {
        // Claim the bed - set ownership on building
        safeUpdateComponent<BuildingComponent>(location as EntityImpl, ComponentType.Building, () => ({
          ownerId: entity.id,
          accessType: 'personal',
        }));

        // Assign bed to agent
        const updatedAgent = assignBed(agent, location.id, bedPos.x, bedPos.y, world.tick);
        safeUpdateComponent<AgentComponent>(entity, ComponentType.Agent, () => ({
          assignedBed: updatedAgent.assignedBed,
          assignedLocations: updatedAgent.assignedLocations,
        }));

        // Emit bed claimed event
        world.eventBus.emit({
          type: 'building:claimed',
          source: entity.id,
          data: {
            agentId: entity.id,
            buildingId: location.id,
            buildingType: bedBuilding.buildingType,
            timestamp: world.tick,
          },
        });
      }
    }

    // Update circadian component (preserve class methods)
    safeUpdateComponent<CircadianComponent>(entity, ComponentType.Circadian, () => ({
      isSleeping: true,
      sleepStartTime: world.tick,
      sleepLocationId: location ? location.id : null,
      sleepQuality: quality,
      sleepDurationHours: 0,
    }));

    // Emit events
    world.eventBus.emit({
      type: 'agent:sleeping',
      source: entity.id,
      data: {
        agentId: entity.id,
        entityId: entity.id,
        location: { x: position.x, y: position.y },
        timestamp: world.tick,
      },
    });

    world.eventBus.emit({
      type: 'agent:sleep_start',
      source: entity.id,
      data: {
        agentId: entity.id,
        timestamp: world.tick,
      },
    });

    // Stop moving and mark complete
    this.stopMovement(entity);
    this.complete(entity);
  }

  private calculateSleepQuality(location: Entity | null): number {
    let quality = 0.5; // Base quality (ground)

    if (location) {
      const building = getBuilding(location);
      if (building) {
        if (building.buildingType === BuildingType.Bed) {
          quality += 0.4; // Bed: 0.9 total
        } else if (building.buildingType === BuildingType.Bedroll) {
          quality += 0.2; // Bedroll: 0.7 total
        } else {
          quality += 0.1; // Other building: 0.6 total
        }
      }
    }

    return Math.max(0.1, Math.min(1.0, quality));
  }
}

/**
 * ForcedSleepBehavior - Collapse and sleep immediately
 *
 * Used when agent is critically exhausted and must sleep now.
 * The behavior checks wake conditions and returns completion when the agent
 * should wake up - this allows the behavior system to properly transition.
 */
export class ForcedSleepBehavior extends BaseBehavior {
  readonly name = 'forced_sleep' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const circadian = getCircadian(entity);
    const needs = getNeeds(entity);

    if (!circadian) {
      this.stopMovement(entity);
      return { complete: true, reason: 'No circadian component' };
    }

    // If not already sleeping, collapse
    if (!circadian.isSleeping) {
      const quality = 0.5; // Poor quality when collapsed

      // Update circadian (preserve class methods)
      safeUpdateComponent<CircadianComponent>(entity, ComponentType.Circadian, () => ({
        isSleeping: true,
        sleepStartTime: world.tick,
        sleepLocationId: null,
        sleepQuality: quality,
        sleepDurationHours: 0,
      }));

      world.eventBus.emit({
        type: 'agent:collapsed',
        source: entity.id,
        data: {
          agentId: entity.id,
          reason: 'exhaustion',
          entityId: entity.id,
        },
      });

      world.eventBus.emit({
        type: 'agent:sleep_start',
        source: entity.id,
        data: {
          agentId: entity.id,
          timestamp: world.tick,
        },
      });
    }

    // Stop moving
    this.stopMovement(entity);

    // Check wake conditions - behavior should complete when agent is ready to wake
    // This allows the behavior system to transition properly instead of staying stuck
    if (needs && circadian.isSleeping) {
      const hoursAsleep = circadian.sleepDurationHours;

      // Wake conditions (must match SleepSystem.shouldWake):
      // NeedsComponent uses 0-1 scale (1.0 = 100%, 0.1 = 10%)
      // 1. Energy fully restored (100%) - primary wake condition
      const energyFull = needs.energy >= 1.0;
      // 2. Urgent hunger (< 10%) - emergency wake
      const urgentNeed = needs.hunger < 0.1;
      // 3. Maximum sleep duration (12 hours) - prevent oversleeping
      const maxSleepReached = hoursAsleep >= 12;

      // Note: Removed "wellRestedAndSatisfied" and "minimumMetWithEnergy" conditions
      // User requested agents wake at 100% energy, not prematurely
      if (energyFull || urgentNeed || maxSleepReached) {
        // Signal completion - SleepSystem will handle the actual wake transition
        return { complete: true, reason: 'Wake conditions met' };
      }
    }

    // Continue sleeping - return void to keep behavior active
  }
}

/**
 * Standalone functions for BehaviorRegistry.
 */
export function seekSleepBehavior(entity: EntityImpl, world: World): void {
  const behavior = new SeekSleepBehavior();
  behavior.execute(entity, world);
}

export function forcedSleepBehavior(entity: EntityImpl, world: World): void {
  const behavior = new ForcedSleepBehavior();
  behavior.execute(entity, world);
}
