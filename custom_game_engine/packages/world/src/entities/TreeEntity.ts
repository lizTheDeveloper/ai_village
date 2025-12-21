import type { WorldMutator } from '@ai-village/core';
import {
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createResourceComponent,
} from '@ai-village/core';

/**
 * Create a tree entity at the specified position.
 */
export function createTree(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (trees are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('tree', 'object'));

  // Tags
  entity.addComponent(createTagsComponent('tree', 'obstacle', 'harvestable'));

  // Resource - trees provide food (berries, fruit)
  entity.addComponent(createResourceComponent('food', 100, 0.5)); // 100 food, regenerates 0.5/sec

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
