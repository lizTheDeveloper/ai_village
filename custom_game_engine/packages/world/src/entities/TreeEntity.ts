import type { WorldMutator } from '@ai-village/core';
import {
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createResourceComponent,
  createTreeVoxelResource,
  PlantComponent,
} from '@ai-village/core';
import { TREE } from '../plant-species/wild-plants.js';

/**
 * Create a tree entity at the specified position.
 *
 * @param world - World mutator for entity creation
 * @param x - X position
 * @param y - Y position
 * @param z - Z position (elevation, default 0)
 * @param options - Additional tree options
 * @param options.useVoxelResource - Use voxel resource system (height-based harvesting)
 * @param options.treeHeight - Height in levels for voxel trees (default: 4)
 * @param options.woodMaterial - Wood material type (default: 'wood')
 */
export function createTree(
  world: WorldMutator,
  x: number,
  y: number,
  z: number = 0,
  options?: {
    useVoxelResource?: boolean;
    treeHeight?: number;
    woodMaterial?: string;
  }
): string {
  const entity = new EntityImpl(createEntityId(), world.tick);
  const useVoxel = options?.useVoxelResource ?? false;
  const treeHeight = options?.treeHeight ?? 4;
  const woodMaterial = options?.woodMaterial ?? 'wood';

  // Position with height
  entity.addComponent(createPositionComponent(x, y, z));

  // Physics (trees are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable - sprite varies by tree height for voxel trees
  const sprite = useVoxel ? `tree_h${treeHeight}` : 'tree';
  entity.addComponent(createRenderableComponent(sprite, 'object'));

  // Tags - add voxel tag if using voxel system
  const tags = useVoxel
    ? ['tree', 'obstacle', 'harvestable', 'voxel']
    : ['tree', 'obstacle', 'harvestable'];
  entity.addComponent(createTagsComponent(...tags));

  // Resource system - choose between legacy and voxel
  if (useVoxel) {
    // Voxel Resource - 1:1 physical mapping
    // treeHeight levels * 4 blocks/level = total wood blocks
    // Example: height=4 tree provides 16 wood blocks
    entity.addComponent(createTreeVoxelResource(treeHeight, woodMaterial));
  } else {
    // Legacy Resource - arbitrary amount with regeneration
    entity.addComponent(createResourceComponent('wood', 100, 0.5));
  }

  // Plant - trees are mature wild plants
  // Shade radius scales with height
  const effectiveHeight = useVoxel ? treeHeight : (z >= 1 ? z : 1);
  const providesShade = effectiveHeight >= 1;
  const shadeRadius = Math.min(5, Math.max(2, effectiveHeight + 1));

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

/**
 * Create a voxel-based tree with height-based harvesting.
 * This is a convenience wrapper around createTree with voxel options.
 *
 * @param world - World mutator
 * @param x - X position
 * @param y - Y position
 * @param height - Tree height in levels (3-6 typical, default: 4)
 * @param material - Wood material type (default: 'wood')
 */
export function createVoxelTree(
  world: WorldMutator,
  x: number,
  y: number,
  height: number = 4,
  material: string = 'wood'
): string {
  return createTree(world, x, y, 0, {
    useVoxelResource: true,
    treeHeight: height,
    woodMaterial: material,
  });
}
