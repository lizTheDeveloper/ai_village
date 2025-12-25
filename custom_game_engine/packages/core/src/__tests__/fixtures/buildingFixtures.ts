/**
 * Common building configurations for tests
 */

export interface BuildingConfig {
  type: string;
  variant?: string;
  fuel?: number;
  durability?: number;
  occupancy?: number;
}

/**
 * Shelter building (basic protection)
 */
export const SHELTER_CONFIG: BuildingConfig = {
  type: 'shelter',
  variant: 'basic',
  durability: 100,
  occupancy: 0,
};

/**
 * Bed building (for sleeping)
 */
export const BED_CONFIG: BuildingConfig = {
  type: 'bed',
  variant: 'basic',
  durability: 100,
  occupancy: 0,
};

/**
 * Workbench building (for crafting)
 */
export const WORKBENCH_CONFIG: BuildingConfig = {
  type: 'workbench',
  variant: 'basic',
  durability: 100,
};

/**
 * Furnace building (for smelting)
 */
export const FURNACE_CONFIG: BuildingConfig = {
  type: 'furnace',
  variant: 'basic',
  durability: 100,
  fuel: 0,
};

/**
 * Storage building (for items)
 */
export const STORAGE_CONFIG: BuildingConfig = {
  type: 'storage',
  variant: 'chest',
  durability: 100,
};

/**
 * Animal housing (for livestock)
 */
export const ANIMAL_HOUSING_CONFIG: BuildingConfig = {
  type: 'animalHousing',
  variant: 'coop',
  durability: 100,
  occupancy: 0,
};
