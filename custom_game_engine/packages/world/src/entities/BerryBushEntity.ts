import type { WorldMutator } from '@ai-village/core';
import {
  EntityImpl,
  WorldImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createResourceComponent,
  PlantComponent,
} from '@ai-village/core';
import { BLUEBERRY_BUSH, RASPBERRY_BUSH, BLACKBERRY_BUSH } from '../plant-species/wild-plants.js';

/**
 * Create a berry bush entity at the specified position.
 * Creates blueberry, raspberry, or blackberry bushes randomly.
 */
export function createBerryBush(world: WorldMutator, x: number, y: number): string {
  // Randomly choose berry type
  const berryTypes = [
    { species: BLUEBERRY_BUSH, id: 'blueberry-bush', sprite: 'blueberry-bush', nutrition: 25 },
    { species: RASPBERRY_BUSH, id: 'raspberry-bush', sprite: 'raspberry-bush', nutrition: 22 },
    { species: BLACKBERRY_BUSH, id: 'blackberry-bush', sprite: 'blackberry-bush', nutrition: 26 },
  ] as const;
  const berryType = berryTypes[Math.floor(Math.random() * berryTypes.length)]!; // Non-null assertion - array is never empty

  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (berry bushes are NOT solid - you can walk through them)
  entity.addComponent(createPhysicsComponent(false, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent(berryType.sprite, 'object'));

  // Tags
  entity.addComponent(createTagsComponent('berries', 'harvestable', 'food'));

  // Resource - berry bushes provide food
  entity.addComponent(createResourceComponent('food', berryType.nutrition, 0.3)); // regenerates 0.3/sec

  // Plant - berry bushes are mature wild plants
  entity.addComponent(new PlantComponent({
    speciesId: berryType.id,
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 80,
    nutrition: 80,
    // Harvest behavior from species - berry bushes regrow after picking
    harvestDestroysPlant: berryType.species.harvestDestroysPlant ?? true,
    harvestResetStage: berryType.species.harvestResetStage ?? 'fruiting',
  }));

  // Add to world
  // Cast required: WorldMutator interface doesn't expose _addEntity (internal method)
  (world as WorldImpl)._addEntity(entity);

  return entity.id;
}
