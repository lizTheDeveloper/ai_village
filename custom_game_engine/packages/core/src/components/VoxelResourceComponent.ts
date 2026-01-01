/**
 * VoxelResourceComponent - Height-based resource system for tile-based voxel buildings.
 *
 * Resources (trees, rocks, ore veins) have a Z-axis height. Harvesting removes
 * one level at a time, or the entire structure can fall if the base is cut.
 *
 * Key mechanic: Cut from top → levels removed one by one. Cut from base → entire
 * structure falls, dropping all resources at once. This encourages strategic harvesting.
 *
 * Example: A 4-level tree with 4 blocks per level = 16 total wood blocks.
 */
import type { Component } from '../ecs/Component.js';

/** Types of voxel resources */
export type VoxelResourceType = 'tree' | 'rock' | 'ore_vein' | 'crystal' | 'coral';

/**
 * VoxelResourceComponent for physical 1:1 resource mapping.
 * Replaces ResourceComponent for natural resources that should
 * have height-based harvesting mechanics.
 */
export interface VoxelResourceComponent extends Component {
  type: 'voxel_resource';

  /** Type of voxel resource */
  resourceType: VoxelResourceType;

  /** Material dropped when harvested (e.g., 'oak_wood', 'granite', 'iron_ore') */
  material: string;

  /** Current height in levels (decreases as harvested from top) */
  height: number;

  /** Original/maximum height */
  maxHeight: number;

  /** Number of resource blocks dropped per level harvested */
  blocksPerLevel: number;

  /**
   * Structural stability (0-100).
   * Decreases when lower levels are damaged.
   * When stability < 30 and base is cut, structure falls.
   */
  stability: number;

  /** Whether the structure is currently falling */
  isFalling: boolean;

  /** Direction the structure is falling (if isFalling is true) */
  fallDirection?: { x: number; y: number };

  /**
   * Position of the last harvester.
   * Used to calculate fall direction (falls away from harvester).
   */
  lastHarvesterPosition?: { x: number; y: number };

  /** Regeneration rate (levels per game hour, 0 = no regeneration) */
  regenerationRate: number;

  /** Game tick when last harvested */
  lastHarvestTick: number;

  /** Whether this resource can be harvested */
  harvestable: boolean;

  /**
   * Gathering difficulty multiplier.
   * 1.0 = normal, higher = takes longer to harvest each level.
   */
  gatherDifficulty: number;
}

/**
 * Create a voxel resource component with sensible defaults.
 *
 * @param resourceType - Type of resource (tree, rock, etc.)
 * @param material - Material ID for dropped resources
 * @param height - Initial height in levels
 * @param blocksPerLevel - Resources dropped per level (default: 4)
 * @param regenerationRate - Levels per game hour (default: 0, no regen)
 * @param gatherDifficulty - Harvest time multiplier (default: 1.0)
 */
export function createVoxelResourceComponent(
  resourceType: VoxelResourceType,
  material: string,
  height: number,
  blocksPerLevel: number = 4,
  regenerationRate: number = 0,
  gatherDifficulty: number = 1.0
): VoxelResourceComponent {
  return {
    type: 'voxel_resource',
    version: 1,
    resourceType,
    material,
    height,
    maxHeight: height,
    blocksPerLevel,
    stability: 100,
    isFalling: false,
    regenerationRate,
    lastHarvestTick: 0,
    harvestable: true,
    gatherDifficulty,
  };
}

/**
 * Create a tree voxel resource.
 * Trees have height 3-6 levels and provide 4 wood per level.
 *
 * @param height - Tree height in levels (default: 4)
 * @param material - Wood type (default: 'wood')
 */
export function createTreeVoxelResource(
  height: number = 4,
  material: string = 'wood'
): VoxelResourceComponent {
  return createVoxelResourceComponent('tree', material, height, 4, 0.01, 1.0);
}

/**
 * Create a rock voxel resource.
 * Rocks are shorter and denser, providing more resources per level.
 *
 * @param height - Rock height in levels (default: 2)
 * @param material - Stone type (default: 'stone')
 */
export function createRockVoxelResource(
  height: number = 2,
  material: string = 'stone'
): VoxelResourceComponent {
  return createVoxelResourceComponent('rock', material, height, 8, 0, 2.0);
}

/**
 * Create an ore vein voxel resource.
 * Ore veins are underground and have high gather difficulty.
 *
 * @param height - Vein depth in levels (default: 3)
 * @param material - Ore type (e.g., 'iron_ore', 'copper_ore')
 */
export function createOreVeinVoxelResource(
  height: number = 3,
  material: string = 'iron_ore'
): VoxelResourceComponent {
  return createVoxelResourceComponent('ore_vein', material, height, 2, 0, 5.0);
}

/**
 * Calculate total resources available from a voxel resource.
 */
export function calculateTotalResources(voxel: VoxelResourceComponent): number {
  return voxel.height * voxel.blocksPerLevel;
}

/**
 * Check if a voxel resource has been depleted.
 */
export function isVoxelDepleted(voxel: VoxelResourceComponent): boolean {
  return voxel.height <= 0;
}

/**
 * Check if a voxel resource is structurally unstable (about to fall).
 */
export function isVoxelUnstable(voxel: VoxelResourceComponent): boolean {
  return voxel.stability < 30 && voxel.height > 0;
}
