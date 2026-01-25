import type { WorldMutator, PositionComponent, TagsComponent, ResourceType } from '@ai-village/core';
import {
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createResourceComponent,
} from '@ai-village/core';

// Rock type definitions with biome-appropriate properties
// All provide 'stone' resource but with varying amounts based on hardness
const ROCK_TYPES: Record<string, { id: string; name: string; resource: ResourceType; amount: number }> = {
  'granite': { id: 'granite', name: 'Granite', resource: 'stone', amount: 120 },    // Hard igneous
  'limestone': { id: 'limestone', name: 'Limestone', resource: 'stone', amount: 100 }, // Soft sedimentary
  'sandstone': { id: 'sandstone', name: 'Sandstone', resource: 'stone', amount: 80 },  // Soft sedimentary
  'basalt': { id: 'basalt', name: 'Basalt', resource: 'stone', amount: 140 },       // Very hard volcanic
  'slate': { id: 'slate', name: 'Slate', resource: 'stone', amount: 90 },           // Metamorphic
  'shale': { id: 'shale', name: 'Shale', resource: 'stone', amount: 70 },           // Soft sedimentary
  'marble': { id: 'marble', name: 'Marble', resource: 'stone', amount: 110 },       // Metamorphic
  'rock': { id: 'rock', name: 'Rock', resource: 'stone', amount: 100 },             // Fallback generic
};

/**
 * Create a rock entity at the specified position.
 *
 * @param world - World mutator
 * @param x - X position
 * @param y - Y position
 * @param rockType - Type of rock (granite, limestone, sandstone, basalt, slate, shale, marble)
 */
export function createRock(world: WorldMutator, x: number, y: number, rockType?: string): string {
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

  // Get rock type info
  const rockKey = rockType ?? 'rock';
  const rockInfo = ROCK_TYPES[rockKey] ?? ROCK_TYPES['rock']!;

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (rocks are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable - use rock type as sprite ID
  entity.addComponent(createRenderableComponent(rockInfo.id, 'object'));

  // Tags - include specific rock type
  entity.addComponent(createTagsComponent('rock', rockInfo.id, 'obstacle', 'minable'));

  // Resource - amount varies by rock type
  entity.addComponent(createResourceComponent(rockInfo.resource, rockInfo.amount, 0.1));

  // Add to world
  world.addEntity(entity);

  return entity.id;
}
