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
      const velocity = impl.getComponent<VelocityComponent>('velocity');
      if (velocity && (velocity.vx !== undefined || velocity.vy !== undefined)) {
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

      // Check collision at new position
      if (this.isPositionValid(world, entity.id, newX, newY)) {
        // Update position
        const newChunkX = Math.floor(newX / 32);
        const newChunkY = Math.floor(newY / 32);

        impl.updateComponent<PositionComponent>('position', (current) => ({
          ...current,
          x: newX,
          y: newY,
          chunkX: newChunkX,
          chunkY: newChunkY,
        }));
      } else {
        // Collision detected - try to navigate around obstacle
        // Simple obstacle avoidance: try perpendicular directions
        const perpX1 = -deltaY; // Rotate 90° left
        const perpY1 = deltaX;
        const perpX2 = deltaY;  // Rotate 90° right
        const perpY2 = -deltaX;

        const alt1X = position.x + perpX1;
        const alt1Y = position.y + perpY1;
        const alt2X = position.x + perpX2;
        const alt2Y = position.y + perpY2;

        // Try moving perpendicular to obstacle
        if (this.isPositionValid(world, entity.id, alt1X, alt1Y)) {
          const newChunkX = Math.floor(alt1X / 32);
          const newChunkY = Math.floor(alt1Y / 32);
          impl.updateComponent<PositionComponent>('position', (current) => ({
            ...current,
            x: alt1X,
            y: alt1Y,
            chunkX: newChunkX,
            chunkY: newChunkY,
          }));
        } else if (this.isPositionValid(world, entity.id, alt2X, alt2Y)) {
          const newChunkX = Math.floor(alt2X / 32);
          const newChunkY = Math.floor(alt2Y / 32);
          impl.updateComponent<PositionComponent>('position', (current) => ({
            ...current,
            x: alt2X,
            y: alt2Y,
            chunkX: newChunkX,
            chunkY: newChunkY,
          }));
        } else {
          // Can't move in any direction - stop movement
          impl.updateComponent<MovementComponent>('movement', (current) => ({
            ...current,
            velocityX: 0,
            velocityY: 0,
          }));
          // Also sync back to VelocityComponent to prevent SteeringSystem from
          // restoring the old velocity on the next frame
          if (velocity) {
            impl.updateComponent<VelocityComponent>('velocity', (current) => ({
              ...current,
              vx: 0,
              vy: 0,
            }));
          }
        }
      }
    }
  }

  private isPositionValid(
    world: World,
    entityId: string,
    x: number,
    y: number
  ): boolean {
    // Check collision with physics entities
    const physicsQuery = world.query().with('position').with('physics');
    const physicsEntities = physicsQuery.executeEntities();

    for (const entity of physicsEntities) {
      // Skip self
      if (entity.id === entityId) {
        continue;
      }

      const impl = entity as EntityImpl;
      const pos = impl.getComponent<PositionComponent>('position')!;
      const physics = impl.getComponent<PhysicsComponent>('physics')!;

      // Skip non-solid entities
      if (!physics.solid) {
        continue;
      }

      // Simple AABB collision check (treating entities as points for now)
      // In the future, we'd use physics.width and physics.height
      const distance = Math.sqrt(
        Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2)
      );

      // Collision if within 0.5 tiles
      if (distance < 0.5) {
        return false;
      }
    }

    // Check collision with buildings that block movement
    const buildingQuery = world.query().with('position').with('building');
    const buildings = buildingQuery.executeEntities();

    for (const building of buildings) {
      const impl = building as EntityImpl;
      const buildingComp = impl.getComponent<BuildingComponent>('building')!;

      // Skip buildings that don't block movement (e.g., campfires)
      if (!buildingComp.blocksMovement) {
        continue;
      }

      const pos = impl.getComponent<PositionComponent>('position')!;

      // Check distance to building
      const distance = Math.sqrt(
        Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2)
      );

      // Collision if within 0.5 tiles
      if (distance < 0.5) {
        return false;
      }
    }

    return true;
  }
}
