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
 * @param z Height of the tree (0 = ground, positive = taller tree)
 */
export function createTree(world: WorldMutator, x: number, y: number, z: number = 0): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position with height
  entity.addComponent(createPositionComponent(x, y, z));

  // Physics (trees are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('tree', 'object'));

  // Tags
  entity.addComponent(createTagsComponent('tree', 'obstacle', 'harvestable'));

  // Resource - trees provide wood
  entity.addComponent(createResourceComponent('wood', 100, 0.5)); // 100 wood, regenerates 0.5/sec

  // Plant - trees are mature wild plants
  // Shade radius scales with height: z=0 (saplings) provide little shade, z=5+ (tall trees) provide good shade
  const providesShade = z >= 1; // Trees provide shade when at least 1 unit tall
  const shadeRadius = Math.min(5, Math.max(2, z + 1)); // Radius 2-5 tiles based on height

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
    // Shade properties based on tree height
    providesShade,
    shadeRadius,
  }));

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
