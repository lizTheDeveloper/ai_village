/**
 * RestBehavior - Resting and sleeping behavior for animals
 *
 * Animals use this behavior when they need to rest or sleep to restore
 * energy. Tamed animals will prefer to rest in their housing.
 *
 * Part of Phase 5 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AnimalComponent } from '../../components/AnimalComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import { BaseAnimalBehavior, type AnimalBehaviorResult } from './AnimalBehavior.js';

/** Energy recovery rate per second when resting */
const REST_ENERGY_RATE = 5;

/** Energy recovery rate per second when sleeping */
const SLEEP_ENERGY_RATE = 10;

/**
 * RestBehavior - Finds a safe spot and rests
 *
 * Usage:
 * ```typescript
 * const rest = new RestBehavior();
 *
 * if (rest.canStart(entity, animal)) {
 *   const result = rest.execute(entity, world, animal);
 * }
 * ```
 */
export class RestBehavior extends BaseAnimalBehavior {
  readonly name = 'sleeping' as const;

  /**
   * Execute resting behavior.
   */
  execute(
    entity: EntityImpl,
    world: World,
    animal: AnimalComponent
  ): AnimalBehaviorResult {
    const position = entity.getComponent<PositionComponent>('position');
    if (!position) {
      return { complete: true, reason: 'No position component' };
    }

    // Check if we're fully rested
    if (animal.energy >= 95) {
      this.stopMovement(entity);
      return { complete: true, newState: 'idle', reason: 'Fully rested' };
    }

    // If tamed and has housing, try to go there
    if (!animal.wild && animal.housingBuildingId) {
      const housing = world.getEntity(animal.housingBuildingId);
      if (housing) {
        const housingPos = (housing as EntityImpl).getComponent<PositionComponent>('position');

        if (housingPos && !this.hasReached(entity, housingPos, 3.0)) {
          // Move to housing
          this.moveToward(entity, housingPos, 0.5);
          return { complete: false, reason: 'Moving to housing' };
        }
      }
    }

    // We're at rest location or don't have housing - rest here
    this.stopMovement(entity);
    this.rest(entity, animal, world);

    return { complete: false, newState: 'sleeping', reason: 'Resting' };
  }

  /**
   * Check if resting behavior can start.
   */
  canStart(_entity: EntityImpl, animal: AnimalComponent): boolean {
    // Can rest if tired
    return animal.energy < 40;
  }

  /**
   * Get priority based on energy level.
   */
  getPriority(animal: AnimalComponent): number {
    // Lower energy = higher priority
    // 40+ energy: 0 priority (not tired)
    // 20-40 energy: 10-30 priority (tired)
    // 0-20 energy: 30-50 priority (exhausted)
    if (animal.energy >= 40) return 0;
    if (animal.energy >= 20) return 10 + ((40 - animal.energy) / 20) * 20;
    return 30 + ((20 - animal.energy) / 20) * 20;
  }

  /**
   * Perform resting actions.
   */
  private rest(
    entity: EntityImpl,
    animal: AnimalComponent,
    world: World
  ): void {
    // Determine if fully sleeping or just resting
    const isSleeping = animal.energy < 20;
    const recoveryRate = isSleeping ? SLEEP_ENERGY_RATE : REST_ENERGY_RATE;

    // Update animal state
    entity.updateComponent('animal', (current: AnimalComponent) => ({
      ...current,
      energy: Math.min(100, current.energy + recoveryRate * 0.05), // 0.05 = deltaTime at 20 TPS
      stress: Math.max(0, current.stress - 2 * 0.05), // Reduce stress while resting
      state: 'sleeping' as const,
    }));

    // Emit resting event
    world.eventBus.emit({
      type: 'animal:resting',
      source: entity.id,
      data: {
        animalId: animal.id,
        energyLevel: animal.energy,
        isSleeping,
        inHousing: !!animal.housingBuildingId,
      },
    });
  }
}

/**
 * IdleBehavior - Default behavior when no other behavior is active
 *
 * Animals wander slowly or stand still.
 */
export class IdleBehavior extends BaseAnimalBehavior {
  readonly name = 'idle' as const;

  // Per-entity wander targets (keyed by entity ID)
  // This is necessary because all animals share the same IdleBehavior instance
  private wanderTargets: Map<string, { x: number; y: number }> = new Map();

  /**
   * Execute idle behavior.
   */
  execute(
    entity: EntityImpl,
    _world: World,
    animal: AnimalComponent
  ): AnimalBehaviorResult {
    const position = entity.getComponent<PositionComponent>('position');
    if (!position) {
      return { complete: true, reason: 'No position component' };
    }

    // Check if we should do something else
    if (animal.hunger > 50) {
      return { complete: true, newState: 'foraging', reason: 'Getting hungry' };
    }
    if (animal.energy < 30) {
      return { complete: true, newState: 'sleeping', reason: 'Getting tired' };
    }
    if (animal.thirst > 60) {
      return { complete: true, newState: 'drinking', reason: 'Getting thirsty' };
    }

    // Get this entity's wander target
    let wanderTarget = this.wanderTargets.get(entity.id);

    // Random wandering - pick new target if needed
    if (!wanderTarget || this.hasReached(entity, wanderTarget, 1.0) || Math.random() < 0.01) {
      // Pick a new random target nearby
      wanderTarget = {
        x: position.x + (Math.random() - 0.5) * 10,
        y: position.y + (Math.random() - 0.5) * 10,
      };
      this.wanderTargets.set(entity.id, wanderTarget);
    }

    // Move slowly toward wander target
    this.moveToward(entity, wanderTarget, 0.3);

    return { complete: false, reason: 'Wandering' };
  }

  /**
   * Idle can always start.
   */
  canStart(_entity: EntityImpl, _animal: AnimalComponent): boolean {
    return true;
  }

  /**
   * Idle has lowest priority.
   */
  getPriority(_animal: AnimalComponent): number {
    return 0;
  }
}
