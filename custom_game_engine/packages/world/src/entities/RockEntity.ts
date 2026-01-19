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
 * Create a rock entity at the specified position.
 */
export function createRock(world: WorldMutator, x: number, y: number): string {
  // Check if a rock already exists at this position (prevent duplicates on reload)
  const existingEntities = world.query()
    .with('position')
    .with('tags')
    .executeEntities();

  for (const existing of existingEntities) {
    const pos = existing.getComponent<PositionComponent>('position');
    const tags = existing.getComponent<TagsComponent>('tags');

    if (pos && tags &&
        Math.abs(pos.x - x) < 0.1 && Math.abs(pos.y - y) < 0.1 &&
        tags.tags?.includes('rock')) {
      // Rock already exists at this position
      return existing.id;
    }
  }

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

  // Add to world (WorldMutator._addEntity is internal)
  (world as unknown as { _addEntity(entity: EntityImpl): void })._addEntity(entity);

  return entity.id;
}
