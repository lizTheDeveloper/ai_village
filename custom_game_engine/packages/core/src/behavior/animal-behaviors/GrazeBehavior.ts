/**
 * GrazeBehavior - Foraging and eating behavior for herbivore animals
 *
 * Animals use this behavior to find edible plants and graze on them.
 * Uses the shared PlantTargeting service to find food sources.
 *
 * Part of Phase 5 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AnimalComponent } from '../../components/AnimalComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { PlantComponent } from '../../components/PlantComponent.js';
import { BaseAnimalBehavior, type AnimalBehaviorResult } from './AnimalBehavior.js';

/** Species of plants that animals can graze on */
const GRAZEABLE_SPECIES = ['grass', 'blueberry-bush', 'raspberry-bush', 'blackberry-bush', 'clover', 'wildflower'];

/** Stages of plants that can be grazed */
const GRAZEABLE_STAGES = ['mature', 'fruiting', 'seeding'];

/**
 * GrazeBehavior - Finds and eats edible plants
 *
 * Usage:
 * ```typescript
 * const graze = new GrazeBehavior();
 *
 * if (graze.canStart(entity, animal)) {
 *   const result = graze.execute(entity, world, animal);
 * }
 * ```
 */
export class GrazeBehavior extends BaseAnimalBehavior {
  readonly name = 'foraging' as const;

  private readonly detectionRange: number;
  private readonly eatRate: number;

  constructor(detectionRange: number = 20, eatRate: number = 5) {
    super();
    this.detectionRange = detectionRange;
    this.eatRate = eatRate; // Hunger reduction per second when eating
  }

  /**
   * Execute grazing behavior.
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

    // Check if we're full
    if (animal.hunger < 20) {
      this.stopMovement(entity);
      return { complete: true, newState: 'idle', reason: 'No longer hungry' };
    }

    // Find nearest edible plant
    const target = this.findNearestEdiblePlant(world, position);

    if (!target) {
      // No food found - wander to explore
      return { complete: false, newState: 'idle', reason: 'No food source visible' };
    }

    const targetPos = (target as EntityImpl).getComponent<PositionComponent>('position');
    if (!targetPos) {
      return { complete: false, reason: 'Target has no position' };
    }

    // Are we close enough to eat?
    if (this.hasReached(entity, targetPos, 2.0)) {
      // Eating - reduce hunger
      this.stopMovement(entity);
      this.eat(entity, animal, target as EntityImpl, world);
      return { complete: false, newState: 'eating', reason: 'Eating' };
    }

    // Move toward food
    this.moveToward(entity, targetPos, 0.8);
    return { complete: false, reason: 'Moving toward food' };
  }

  /**
   * Check if grazing behavior can start.
   */
  canStart(_entity: EntityImpl, animal: AnimalComponent): boolean {
    // Can graze if hungry
    return animal.hunger > 40;
  }

  /**
   * Get priority based on hunger level.
   */
  getPriority(animal: AnimalComponent): number {
    // Higher hunger = higher priority
    // 0-40 hunger: 0 priority (not hungry)
    // 40-70 hunger: 10-30 priority (moderate)
    // 70-100 hunger: 30-50 priority (critical)
    if (animal.hunger <= 40) return 0;
    if (animal.hunger <= 70) return 10 + ((animal.hunger - 40) / 30) * 20;
    return 30 + ((animal.hunger - 70) / 30) * 20;
  }

  /**
   * Find nearest edible plant within detection range.
   */
  private findNearestEdiblePlant(
    world: World,
    position: PositionComponent
  ): EntityImpl | null {
    const plants = world.query().with('plant').with('position').executeEntities();

    let nearest: EntityImpl | null = null;
    let nearestDist = Infinity;

    for (const plantEntity of plants) {
      const plant = plantEntity as EntityImpl;
      const plantComp = plant.getComponent<PlantComponent>('plant');
      const plantPos = plant.getComponent<PositionComponent>('position');

      if (!plantComp || !plantPos) continue;

      // Check if edible
      if (!GRAZEABLE_SPECIES.includes(plantComp.speciesId)) continue;
      if (!GRAZEABLE_STAGES.includes(plantComp.stage)) continue;

      const dist = this.distance(position, plantPos);

      if (dist <= this.detectionRange && dist < nearestDist) {
        nearest = plant;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  /**
   * Eat from a plant.
   */
  private eat(
    entity: EntityImpl,
    animal: AnimalComponent,
    plant: EntityImpl,
    world: World
  ): void {
    const plantComp = plant.getComponent<PlantComponent>('plant');
    if (!plantComp) return;

    // Reduce animal hunger
    entity.updateComponent('animal', (current: AnimalComponent) => ({
      ...current,
      hunger: Math.max(0, current.hunger - this.eatRate * 0.05), // 0.05 = deltaTime at 20 TPS
      state: 'eating' as const,
    }));

    // Consume plant resources (if it has at least 1 whole fruit)
    // REQUIREMENT: Can't gather less than 1 whole fruit - only consume if available
    // PlantComponent is a class, so update directly
    if (plantComp.fruitCount >= 1) {
      plantComp.fruitCount = plantComp.fruitCount - 1;
    }

    // Emit grazing event
    world.eventBus.emit({
      type: 'animal:grazing',
      source: entity.id,
      data: {
        animalId: animal.id,
        plantId: plant.id,
        speciesId: animal.speciesId,
      },
    });
  }
}
