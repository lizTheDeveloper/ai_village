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
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { getCircadian, getBuilding, getPosition, getNeeds } from '../../utils/componentHelpers.js';
import { safeUpdateComponent } from '../../utils/componentUtils.js';

/**
 * SeekSleepBehavior - Find a bed/bedroll and go to sleep
 */
export class SeekSleepBehavior extends BaseBehavior {
  readonly name = 'seek_sleep' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Disable steering system
    this.disableSteering(entity);

    const position = entity.getComponent<PositionComponent>('position');
    const circadian = getCircadian(entity);

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
      return;
    }

    // Find nearest bed or bedroll
    const sleepLocation = this.findNearestBed(world, position);

    if (sleepLocation) {
      const bedPos = (sleepLocation as EntityImpl).getComponent<PositionComponent>('position')!;

      // Move toward bed (with arrival slowdown)
      const distance = this.moveToward(entity, bedPos);

      if (distance <= 1.5) {
        // Close enough - start sleeping
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

  private findNearestBed(world: World, position: PositionComponent): Entity | null {
    const beds = world.query().with('building').with('position').executeEntities();
    let nearest: Entity | null = null;
    let nearestDist = Infinity;

    for (const bed of beds) {
      const building = getBuilding(bed);
      const bedPos = getPosition(bed);

      if (!building || !bedPos) continue;

      if (building.buildingType === 'bed' || building.buildingType === 'bedroll') {
        const dist = this.distance(position, bedPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = bed;
        }
      }
    }

    return nearest;
  }

  private startSleeping(entity: EntityImpl, world: World, location: Entity | null): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const quality = this.calculateSleepQuality(location);

    // Update circadian component (preserve class methods)
    safeUpdateComponent<CircadianComponent>(entity, 'circadian', () => ({
      isSleeping: true,
      sleepStartTime: world.tick,
      sleepLocation: location,
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
        if (building.buildingType === 'bed') {
          quality += 0.4; // Bed: 0.9 total
        } else if (building.buildingType === 'bedroll') {
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
      safeUpdateComponent<CircadianComponent>(entity, 'circadian', () => ({
        isSleeping: true,
        sleepStartTime: world.tick,
        sleepLocation: null,
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

      // Wake conditions (same as SleepSystem.shouldWake):
      // 1. Energy fully restored
      const energyFull = needs.energy >= 100;
      // 2. Urgent hunger
      const urgentNeed = needs.hunger < 10;
      // 3. Well rested with depleted sleep drive
      const wellRestedAndSatisfied = needs.energy >= 70 && circadian.sleepDrive < 10;
      // 4. Maximum sleep duration (12 hours)
      const maxSleepReached = hoursAsleep >= 12;
      // 5. Minimum 4 hours passed with reasonable energy
      const minimumMetWithEnergy = hoursAsleep >= 4 && needs.energy >= 50;

      if (energyFull || urgentNeed || wellRestedAndSatisfied || maxSleepReached || minimumMetWithEnergy) {
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
