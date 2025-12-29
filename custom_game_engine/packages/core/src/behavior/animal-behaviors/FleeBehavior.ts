/**
 * FleeBehavior - Fleeing behavior for prey animals
 *
 * Animals use this behavior to flee from threats like predators or
 * aggressive agents.
 *
 * Part of Phase 5 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AnimalComponent } from '../../components/AnimalComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import { BaseAnimalBehavior, type AnimalBehaviorResult } from './AnimalBehavior.js';

/** How far to flee from threat */
const FLEE_DISTANCE = 15;

/** Threshold distance to consider safe */
const SAFE_DISTANCE = 25;

/** Detection range for threats */
const THREAT_DETECTION_RANGE = 20;

/**
 * FleeBehavior - Runs away from threats
 *
 * Usage:
 * ```typescript
 * const flee = new FleeBehavior();
 *
 * if (flee.canStart(entity, animal)) {
 *   const result = flee.execute(entity, world, animal);
 * }
 * ```
 */
export class FleeBehavior extends BaseAnimalBehavior {
  readonly name = 'fleeing' as const;

  private readonly fleeSpeed: number;

  constructor(fleeSpeed: number = 1.5) {
    super();
    this.fleeSpeed = fleeSpeed;
  }

  /**
   * Execute fleeing behavior.
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

    // Find nearest threat
    const threat = this.findNearestThreat(entity, world, position, animal);

    if (!threat) {
      // No threat visible - calm down and stop fleeing
      this.stopMovement(entity);
      return {
        complete: true,
        newState: 'idle',
        reason: 'No threat detected',
      };
    }

    const threatPos = (threat as EntityImpl).getComponent<PositionComponent>('position');
    if (!threatPos) {
      return { complete: true, reason: 'Threat has no position' };
    }

    const distToThreat = this.distance(position, threatPos);

    // If we're far enough, stop fleeing
    if (distToThreat >= SAFE_DISTANCE) {
      this.stopMovement(entity);
      // Reduce stress gradually
      entity.updateComponent('animal', (current: AnimalComponent) => ({
        ...current,
        stress: Math.max(0, current.stress - 5),
        state: 'idle' as const,
      }));
      return {
        complete: true,
        newState: 'idle',
        reason: 'Reached safe distance',
      };
    }

    // Calculate flee direction (away from threat)
    const fleeTarget = this.calculateFleeTarget(position, threatPos);

    // Move away at high speed
    this.moveToward(entity, fleeTarget, this.fleeSpeed);

    // Increase stress while fleeing
    entity.updateComponent('animal', (current: AnimalComponent) => ({
      ...current,
      stress: Math.min(100, current.stress + 2),
      state: 'fleeing' as const,
    }));

    // Emit fleeing event
    world.eventBus.emit({
      type: 'animal:fleeing',
      source: entity.id,
      data: {
        animalId: animal.id,
        threatId: threat.id,
        distanceToThreat: distToThreat,
      },
    });

    return { complete: false, reason: `Fleeing from threat at distance ${distToThreat.toFixed(1)}` };
  }

  /**
   * Check if fleeing behavior can start.
   */
  canStart(_entity: EntityImpl, animal: AnimalComponent): boolean {
    // Can flee if stressed or wild (untamed animals flee from humans)
    return animal.stress > 50 || (animal.wild && animal.trustLevel < 30);
  }

  /**
   * Get priority - fleeing is highest priority for prey.
   */
  getPriority(animal: AnimalComponent): number {
    // Fleeing is critical when stressed
    // 0-50 stress: 0-25 priority
    // 50-80 stress: 25-75 priority (moderate threat)
    // 80-100 stress: 75-100 priority (critical)
    if (animal.stress <= 50) return animal.stress * 0.5;
    if (animal.stress <= 80) return 25 + ((animal.stress - 50) / 30) * 50;
    return 75 + ((animal.stress - 80) / 20) * 25;
  }

  /**
   * Find nearest threat to the animal.
   * Threats include: predator animals, aggressive agents, loud noises
   */
  private findNearestThreat(
    self: EntityImpl,
    world: World,
    position: PositionComponent,
    animal: AnimalComponent
  ): Entity | null {
    let nearest: Entity | null = null;
    let nearestDist = Infinity;

    // Check for threatening agents (humans)
    if (animal.wild && animal.trustLevel < 50) {
      const agents = world.query().with('agent').with('position').executeEntities();

      for (const agentEntity of agents) {
        const agentPos = (agentEntity as EntityImpl).getComponent<PositionComponent>('position');
        if (!agentPos) continue;

        const dist = this.distance(position, agentPos);

        if (dist <= THREAT_DETECTION_RANGE && dist < nearestDist) {
          nearest = agentEntity;
          nearestDist = dist;
        }
      }
    }

    // Check for predator animals (different species that are predatory)
    const animals = world.query().with('animal').with('position').executeEntities();

    for (const otherAnimal of animals) {
      if (otherAnimal.id === self.id) continue;

      const otherAnimalComp = (otherAnimal as EntityImpl).getComponent<AnimalComponent>('animal');
      const otherPos = (otherAnimal as EntityImpl).getComponent<PositionComponent>('position');

      if (!otherAnimalComp || !otherPos) continue;

      // Check if this is a predator to our species
      if (this.isPredator(otherAnimalComp, animal)) {
        const dist = this.distance(position, otherPos);

        if (dist <= THREAT_DETECTION_RANGE && dist < nearestDist) {
          nearest = otherAnimal;
          nearestDist = dist;
        }
      }
    }

    return nearest;
  }

  /**
   * Check if another animal is a predator to this one.
   */
  private isPredator(other: AnimalComponent, self: AnimalComponent): boolean {
    // Simple predator-prey relationships
    const predatorPreyMap: Record<string, string[]> = {
      wolf: ['chicken', 'rabbit', 'sheep'],
      fox: ['chicken', 'rabbit'],
      hawk: ['chicken', 'rabbit'],
    };

    const prey = predatorPreyMap[other.speciesId];
    return prey ? prey.includes(self.speciesId) : false;
  }

  /**
   * Calculate target position to flee to (away from threat).
   */
  private calculateFleeTarget(
    position: PositionComponent,
    threatPos: PositionComponent
  ): { x: number; y: number } {
    // Direction away from threat
    const dx = position.x - threatPos.x;
    const dy = position.y - threatPos.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // Normalize and scale by flee distance
    return {
      x: position.x + (dx / len) * FLEE_DISTANCE,
      y: position.y + (dy / len) * FLEE_DISTANCE,
    };
  }
}
