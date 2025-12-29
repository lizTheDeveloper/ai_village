import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { PhysicsComponent } from '../components/PhysicsComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { VelocityComponent } from '../components/VelocityComponent.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';

interface TimeComponent {
  speedMultiplier?: number;
}

export class MovementSystem implements System {
  public readonly id: SystemId = 'movement';
  public readonly priority: number = 20; // Run after AI
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    'movement',
    'position',
  ];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get time acceleration multiplier from TimeComponent
    const timeEntities = world.query().with('time').executeEntities();
    let timeSpeedMultiplier = 1.0;
    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0] as EntityImpl;
      const timeComp = timeEntity.getComponent('time') as TimeComponent | undefined;
      if (timeComp && timeComp.speedMultiplier) {
        timeSpeedMultiplier = timeComp.speedMultiplier;
      }
    }

    // Filter entities with required components
    const movementEntities = entities.filter(e =>
      e.components.has('movement') && e.components.has('position')
    );

    for (const entity of movementEntities) {
      const impl = entity as EntityImpl;
      const movement = impl.getComponent<MovementComponent>('movement')!;
      const position = impl.getComponent<PositionComponent>('position')!

      // Sync velocity component to movement component (for SteeringSystem integration)
      // Only sync when steering is active - when steering is 'none', behaviors control velocity directly
      const velocity = impl.getComponent<VelocityComponent>('velocity');
      const steering = impl.getComponent('steering') as { behavior?: string } | undefined;
      const steeringActive = steering && steering.behavior && steering.behavior !== 'none';

      if (steeringActive && velocity && (velocity.vx !== undefined || velocity.vy !== undefined)) {
        impl.updateComponent<MovementComponent>('movement', (current) => ({
          ...current,
          velocityX: velocity.vx ?? current.velocityX,
          velocityY: velocity.vy ?? current.velocityY,
        }));
        // Re-get movement after update
        const updatedMovement = impl.getComponent<MovementComponent>('movement')!;
        Object.assign(movement, updatedMovement);
      }

      // Skip if sleeping - agents cannot move while asleep
      const circadian = impl.getComponent<CircadianComponent>('circadian');
      if (circadian && circadian.isSleeping) {
        // Force velocity to 0 while sleeping
        if (movement.velocityX !== 0 || movement.velocityY !== 0) {
          impl.updateComponent<MovementComponent>('movement', (current) => ({
            ...current,
            velocityX: 0,
            velocityY: 0,
          }));
          // Also sync to VelocityComponent
          if (velocity) {
            impl.updateComponent<VelocityComponent>('velocity', (current) => ({
              ...current,
              vx: 0,
              vy: 0,
            }));
          }
        }
        continue;
      }

      // Skip if not moving
      if (movement.velocityX === 0 && movement.velocityY === 0) {
        continue;
      }

      // Apply fatigue penalty based on energy level
      let speedMultiplier = 1.0;
      const needs = impl.getComponent<NeedsComponent>('needs');
      if (needs && needs.energy !== undefined) {
        const energy = needs.energy;

        // Per work order:
        // Energy 100-70: No penalty
        // Energy 70-50: -10% movement for work, no movement penalty
        // Energy 50-30: -20% movement speed
        // Energy 30-10: -40% movement speed
        // Energy 10-0: -60% movement speed

        if (energy < 10) {
          speedMultiplier = 0.4; // -60% speed
        } else if (energy < 30) {
          speedMultiplier = 0.6; // -40% speed
        } else if (energy < 50) {
          speedMultiplier = 0.8; // -20% speed
        }
        // else: no penalty (100%)
      }

      // Calculate new position using deltaTime and time acceleration
      // Velocity is in tiles/second, deltaTime is in seconds
      // Apply both fatigue penalty and time acceleration
      const deltaX = movement.velocityX * speedMultiplier * deltaTime * timeSpeedMultiplier;
      const deltaY = movement.velocityY * speedMultiplier * deltaTime * timeSpeedMultiplier;
      const newX = position.x + deltaX;
      const newY = position.y + deltaY;

      // Check for hard collisions (buildings) - these block completely
      if (this.hasHardCollision(world, entity.id, newX, newY)) {
        // Try perpendicular directions to slide along walls
        const perpX1 = -deltaY;
        const perpY1 = deltaX;
        const perpX2 = deltaY;
        const perpY2 = -deltaX;

        const alt1X = position.x + perpX1;
        const alt1Y = position.y + perpY1;
        const alt2X = position.x + perpX2;
        const alt2Y = position.y + perpY2;

        if (!this.hasHardCollision(world, entity.id, alt1X, alt1Y)) {
          this.updatePosition(impl, alt1X, alt1Y);
        } else if (!this.hasHardCollision(world, entity.id, alt2X, alt2Y)) {
          this.updatePosition(impl, alt2X, alt2Y);
        } else {
          // Completely blocked by buildings - stop
          this.stopEntity(impl, velocity);
        }
      } else {
        // Check for soft collisions (other agents) - these slow but don't block
        const softCollisionPenalty = this.getSoftCollisionPenalty(world, entity.id, newX, newY);

        // Apply soft collision penalty (agents can push through each other, just slower)
        const adjustedDeltaX = deltaX * softCollisionPenalty;
        const adjustedDeltaY = deltaY * softCollisionPenalty;
        const adjustedNewX = position.x + adjustedDeltaX;
        const adjustedNewY = position.y + adjustedDeltaY;

        // Final check that adjusted position doesn't hit a building
        if (!this.hasHardCollision(world, entity.id, adjustedNewX, adjustedNewY)) {
          this.updatePosition(impl, adjustedNewX, adjustedNewY);
        } else {
          // The adjusted position would hit a building - try original with penalty
          this.updatePosition(impl, newX, newY);
        }
      }
    }
  }

  private updatePosition(impl: EntityImpl, x: number, y: number): void {
    const newChunkX = Math.floor(x / 32);
    const newChunkY = Math.floor(y / 32);
    impl.updateComponent<PositionComponent>('position', (current) => ({
      ...current,
      x,
      y,
      chunkX: newChunkX,
      chunkY: newChunkY,
    }));
  }

  private stopEntity(impl: EntityImpl, velocity: VelocityComponent | undefined): void {
    impl.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));
    if (velocity) {
      impl.updateComponent<VelocityComponent>('velocity', (current) => ({
        ...current,
        vx: 0,
        vy: 0,
      }));
    }
  }

  /**
   * Check for hard collisions (buildings) - these block movement completely
   */
  private hasHardCollision(
    world: World,
    _entityId: string,
    x: number,
    y: number
  ): boolean {
    const buildingQuery = world.query().with('position').with('building');
    const buildings = buildingQuery.executeEntities();

    for (const building of buildings) {
      const impl = building as EntityImpl;
      const buildingComp = impl.getComponent<BuildingComponent>('building')!;

      if (!buildingComp.blocksMovement) {
        continue;
      }

      const pos = impl.getComponent<PositionComponent>('position')!;
      const distance = Math.sqrt(
        Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2)
      );

      if (distance < 0.5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate soft collision penalty from nearby agents/physics entities.
   * Returns a multiplier between 0.2 (very crowded) and 1.0 (no collision).
   * Agents can push through each other but move slower when overlapping.
   */
  private getSoftCollisionPenalty(
    world: World,
    entityId: string,
    x: number,
    y: number
  ): number {
    const physicsQuery = world.query().with('position').with('physics');
    const physicsEntities = physicsQuery.executeEntities();

    let penalty = 1.0;
    const softCollisionRadius = 0.8; // Start slowing at this distance
    const minPenalty = 0.2; // Never slow below 20% speed

    for (const entity of physicsEntities) {
      if (entity.id === entityId) {
        continue;
      }

      const impl = entity as EntityImpl;
      const pos = impl.getComponent<PositionComponent>('position')!;
      const physics = impl.getComponent<PhysicsComponent>('physics')!;

      if (!physics.solid) {
        continue;
      }

      const distance = Math.sqrt(
        Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2)
      );

      // Apply graduated slowdown based on proximity
      if (distance < softCollisionRadius) {
        // Linear interpolation: at distance 0 -> minPenalty, at softCollisionRadius -> 1.0
        const proximityFactor = distance / softCollisionRadius;
        const thisPenalty = minPenalty + (1 - minPenalty) * proximityFactor;
        penalty = Math.min(penalty, thisPenalty);
      }
    }

    return penalty;
  }
}
