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
 * Create a fiber plant entity at the specified position.
 * Fiber plants (like flax or hemp) provide fiber for crafting rope, cloth, and bedding.
 */
export function createFiberPlant(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (fiber plants are NOT solid - you can walk through them)
  entity.addComponent(createPhysicsComponent(false, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('fiber', 'object'));

  // Tags
  entity.addComponent(createTagsComponent('fiber', 'harvestable'));

  // Resource - fiber plants provide fiber
  entity.addComponent(createResourceComponent('fiber', 40, 0.3)); // 40 fiber, regenerates 0.3/sec

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
