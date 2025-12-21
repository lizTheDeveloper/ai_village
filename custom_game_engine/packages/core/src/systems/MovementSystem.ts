import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { PhysicsComponent } from '../components/PhysicsComponent.js';

export class MovementSystem implements System {
  public readonly id: SystemId = 'movement';
  public readonly priority: number = 20; // Run after AI
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    'movement',
    'position',
  ];

  update(world: World, entities: ReadonlyArray<Entity>): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const movement = impl.getComponent<MovementComponent>('movement')!;
      const position = impl.getComponent<PositionComponent>('position')!;

      // Skip if not moving
      if (movement.velocityX === 0 && movement.velocityY === 0) {
        continue;
      }

      // Calculate new position (velocity is in tiles per second, tick is 1/20th second)
      const deltaX = movement.velocityX / 20;
      const deltaY = movement.velocityY / 20;
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
        // Collision detected - stop movement
        impl.updateComponent<MovementComponent>('movement', (current) => ({
          ...current,
          velocityX: 0,
          velocityY: 0,
        }));
      }
    }
  }

  private isPositionValid(
    world: World,
    entityId: string,
    x: number,
    y: number
  ): boolean {
    // Get all entities with physics
    const query = world.query().with('position').with('physics');
    const entities = query.executeEntities();

    for (const entity of entities) {
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

    return true;
  }
}
