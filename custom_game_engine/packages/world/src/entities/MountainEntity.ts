import type { WorldMutator, PositionComponent, TagsComponent } from '@ai-village/core';
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
  // Check if a mountain already exists at this position (prevent duplicates on reload)
  const existingEntities = world.query()
    .with('position')
    .with('tags')
    .executeEntities();

  for (const existing of existingEntities) {
    const pos = existing.getComponent<PositionComponent>('position');
    const tags = existing.getComponent<TagsComponent>('tags');

    if (pos && tags &&
        Math.abs(pos.x - x) < 0.1 && Math.abs(pos.y - y) < 0.1 &&
        tags.tags?.includes('mountain')) {
      // Mountain already exists at this position
      return existing.id;
    }
  }

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
  world.addEntity(entity);

  return entity.id;
}
