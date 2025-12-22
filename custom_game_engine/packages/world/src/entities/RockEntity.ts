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
 * Create a rock entity at the specified position.
 */
export function createRock(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (rocks are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('rock', 'object'));

  // Tags
  entity.addComponent(createTagsComponent('rock', 'obstacle', 'minable'));

  // Resource - rocks provide stone
  entity.addComponent(createResourceComponent('stone', 100, 0.1)); // 100 stone, regenerates 0.1/sec

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
