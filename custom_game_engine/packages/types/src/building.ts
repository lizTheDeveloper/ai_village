/**
 * Building tile structures for voxel buildings.
 * Shared between core, world, and building-designer packages.
 */

/**
 * Wall tile structure for voxel buildings.
 */
export interface IWallTile {
  material: string;
  condition: number;
  insulation: number;
  constructionProgress?: number;
}

/**
 * Door tile structure for voxel buildings.
 */
export interface IDoorTile {
  material: string;
  state: 'open' | 'closed' | 'locked';
  lastOpened?: number;
  constructionProgress?: number;
}

/**
 * Window tile structure for voxel buildings.
 */
export interface IWindowTile {
  material: string;
  condition: number;
  lightsThrough: boolean;
  constructionProgress?: number;
}

/**
 * Blueprint resource cost.
 */
export interface BlueprintResourceCost {
  resourceId: string;
  amountRequired: number;
}

/**
 * Blueprint skill requirement.
 */
export interface BlueprintSkillRequirement {
  skill: string;
  level: number;
}

/**
 * Building blueprint interface - minimal definition to avoid circular deps.
 */
export interface IBlueprint {
  id: string;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  floors?: unknown[];
  resourceCost: BlueprintResourceCost[];
  skillRequired?: BlueprintSkillRequirement;
}

/**
 * Building registry interface.
 */
export interface IBuildingRegistry {
  tryGet(blueprintId: string): IBlueprint | undefined;
  getAll(): IBlueprint[];
  getByCategory(category: string): IBlueprint[];
}
