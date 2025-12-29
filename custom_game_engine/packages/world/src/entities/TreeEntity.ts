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
import { TREE } from '../plant-species/wild-plants.js';

/**
 * Create a tree entity at the specified position.
 */
export function createTree(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (trees are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('tree', 'object'));

  // Tags
  entity.addComponent(createTagsComponent('tree', 'obstacle', 'harvestable'));

  // Resource - trees provide wood
  entity.addComponent(createResourceComponent('wood', 100, 0.5)); // 100 wood, regenerates 0.5/sec

  // Plant - trees are mature wild plants
  entity.addComponent(new PlantComponent({
    speciesId: 'tree',
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 80,
    nutrition: 80,
    // Harvest behavior from species - trees regrow fruit after picking
    harvestDestroysPlant: TREE.harvestDestroysPlant ?? true,
    harvestResetStage: TREE.harvestResetStage ?? 'fruiting',
  }));

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
