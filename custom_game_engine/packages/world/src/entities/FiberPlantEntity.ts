import type { WorldMutator, PositionComponent, TagsComponent } from '@ai-village/core';
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
  // Check if a fiber plant already exists at this position (prevent duplicates on reload)
  const existingEntities = world.query()
    .with('position')
    .with('tags')
    .executeEntities();

  for (const existing of existingEntities) {
    const pos = existing.getComponent<PositionComponent>('position');
    const tags = existing.getComponent<TagsComponent>('tags');

    if (pos && tags &&
        Math.abs(pos.x - x) < 0.1 && Math.abs(pos.y - y) < 0.1 &&
        tags.tags?.includes('fiber')) {
      // Fiber plant already exists at this position
      return existing.id;
    }
  }

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
  world.addEntity(entity);

  return entity.id;
}
