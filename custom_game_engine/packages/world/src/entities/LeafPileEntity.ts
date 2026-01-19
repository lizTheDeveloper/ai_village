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
 * Create a leaf pile entity at the specified position.
 * Leaf piles provide leaves for building lean-tos and other structures.
 */
export function createLeafPile(world: WorldMutator, x: number, y: number): string {
  // Check if a leaf pile already exists at this position (prevent duplicates on reload)
  const existingEntities = world.query()
    .with('position')
    .with('tags')
    .executeEntities();

  for (const existing of existingEntities) {
    const pos = existing.getComponent<PositionComponent>('position');
    const tags = existing.getComponent<TagsComponent>('tags');

    if (pos && tags &&
        Math.abs(pos.x - x) < 0.1 && Math.abs(pos.y - y) < 0.1 &&
        tags.tags?.includes('leaves')) {
      // Leaf pile already exists at this position
      return existing.id;
    }
  }

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

  // Add to world (WorldMutator._addEntity is internal)
  (world as unknown as { _addEntity(entity: EntityImpl): void })._addEntity(entity);

  return entity.id;
}
