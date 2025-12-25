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
 * Create a leaf pile entity at the specified position.
 * Leaf piles provide leaves for building lean-tos and other structures.
 */
export function createLeafPile(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (leaf piles are NOT solid - you can walk through them)
  entity.addComponent(createPhysicsComponent(false, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('leaves', 'object'));

  // Tags
  entity.addComponent(createTagsComponent('leaves', 'harvestable'));

  // Resource - leaf piles provide leaves
  entity.addComponent(createResourceComponent('leaves', 30, 0.2)); // 30 leaves, regenerates 0.2/sec

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
