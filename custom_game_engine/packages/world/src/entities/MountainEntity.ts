import type { WorldMutator } from '@ai-village/core';
import {
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
} from '@ai-village/core';

/**
 * Create a mountain entity at the specified position.
 * Mountains are tall terrain features with varying heights.
 * @param z Height of the mountain peak (higher = taller mountain)
 */
export function createMountain(world: WorldMutator, x: number, y: number, z: number = 3): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position with height
  entity.addComponent(createPositionComponent(x, y, z));

  // Physics (mountains are solid obstacles, bigger footprint for tall ones)
  const size = Math.max(1, Math.ceil(z / 3));
  entity.addComponent(createPhysicsComponent(true, size, size));

  // Renderable
  entity.addComponent(createRenderableComponent('mountain', 'terrain'));

  // Tags
  entity.addComponent(createTagsComponent('mountain', 'obstacle', 'terrain', 'landmark'));

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
