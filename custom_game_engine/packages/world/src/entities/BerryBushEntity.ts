import type { WorldMutator } from '@ai-village/core';
import {
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createResourceComponent,
  PlantComponent,
} from '@ai-village/core';
import { BERRY_BUSH } from '../plant-species/wild-plants.js';

/**
 * Create a berry bush entity at the specified position.
 * Berry bushes provide food for agents to harvest.
 */
export function createBerryBush(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (berry bushes are NOT solid - you can walk through them)
  entity.addComponent(createPhysicsComponent(false, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('berry-bush', 'object'));

  // Tags
  entity.addComponent(createTagsComponent('berries', 'harvestable', 'food'));

  // Resource - berry bushes provide food
  entity.addComponent(createResourceComponent('food', 20, 0.3)); // 20 food, regenerates 0.3/sec

  // Plant - berry bushes are mature wild plants
  entity.addComponent(new PlantComponent({
    speciesId: 'berry-bush',
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 80,
    nutrition: 80,
    // Harvest behavior from species - berry bushes regrow after picking
    harvestDestroysPlant: BERRY_BUSH.harvestDestroysPlant ?? true,
    harvestResetStage: BERRY_BUSH.harvestResetStage ?? 'fruiting',
  }));

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
