import type { Component } from '../ecs/Component.js';

export type BuildingType = 'campfire' | 'lean-to' | 'storage-box';

export interface BuildingComponent extends Component {
  type: 'building';
  buildingType: BuildingType;
  tier: number; // Building quality/advancement level (1-3)
  progress: number; // Construction progress (0-100)
  isComplete: boolean; // Whether construction is finished
  blocksMovement: boolean; // Whether entities can walk through it
  providesWarmth: boolean; // Whether it provides warmth (campfire)
  providesShelter: boolean; // Whether it provides shelter (lean-to)
  storageCapacity: number; // How many items it can store (storage-box)
}

export function createBuildingComponent(
  buildingType: BuildingType,
  tier: number = 1,
  progress: number = 0
): BuildingComponent {
  // Configure properties based on building type
  let blocksMovement = true;
  let providesWarmth = false;
  let providesShelter = false;
  let storageCapacity = 0;

  switch (buildingType) {
    case 'campfire':
      blocksMovement = false; // Can walk through campfire
      providesWarmth = true;
      break;
    case 'lean-to':
      providesShelter = true;
      break;
    case 'storage-box':
      storageCapacity = 10 * tier; // 10 items per tier
      break;
  }

  return {
    type: 'building',
    version: 1,
    buildingType,
    tier: Math.max(1, Math.min(3, tier)),
    progress: Math.max(0, Math.min(100, progress)),
    isComplete: progress >= 100,
    blocksMovement,
    providesWarmth,
    providesShelter,
    storageCapacity,
  };
}

/**
 * Check if building is under construction.
 */
export function isUnderConstruction(building: BuildingComponent): boolean {
  return building.progress < 100;
}

/**
 * Get the amount of work needed to complete construction.
 */
export function getRemainingWork(building: BuildingComponent): number {
  return Math.max(0, 100 - building.progress);
}
