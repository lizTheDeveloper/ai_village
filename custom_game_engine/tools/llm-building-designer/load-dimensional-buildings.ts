/**
 * Load and register dimensional buildings from JSON for testing.
 * Run this in browser console or call from main.ts to test dimensional rendering.
 *
 * Usage in browser console:
 *   await loadDimensionalBuildings();
 *   // Then place a building entity at a position
 */

import { buildingBlueprintRegistry, type BuildingBlueprint } from '@ai-village/core';
import dimensionalBuildingsData from './dimensional-buildings-game-format.json';

interface DimensionalBuildingsJSON {
  elven: BuildingBlueprint[];
  centaur: BuildingBlueprint[];
  high_fae_10d: BuildingBlueprint[];
  exotic: BuildingBlueprint[];
}

/**
 * Load all dimensional buildings into the registry.
 * Returns count of loaded buildings.
 */
export function loadDimensionalBuildings(): number {
  const data = dimensionalBuildingsData as DimensionalBuildingsJSON;
  let count = 0;

  // Load each category
  for (const category of ['elven', 'centaur', 'high_fae_10d', 'exotic'] as const) {
    const buildings = data[category];
    if (buildings && Array.isArray(buildings)) {
      for (const building of buildings) {
        try {
          buildingBlueprintRegistry.register(building);
          console.log(`✓ Registered: ${building.name} (${building.id})`);
          count++;
        } catch (error) {
          console.error(`✗ Failed to register ${building.id}:`, error);
        }
      }
    }
  }

  console.log(`\n📦 Loaded ${count} dimensional buildings`);
  return count;
}

/**
 * Get a list of all dimensional buildings (4D/5D/6D only).
 */
export function getDimensionalBuildingIds(): Array<{ id: string; name: string; dimension: string }> {
  const data = dimensionalBuildingsData as DimensionalBuildingsJSON;
  const dimensional: Array<{ id: string; name: string; dimension: string }> = [];

  for (const category of ['high_fae_10d', 'exotic'] as const) {
    const buildings = data[category];
    if (buildings && Array.isArray(buildings)) {
      for (const building of buildings) {
        if (building.dimensional) {
          let dimension = '3D';
          if (building.dimensional.w_axis) dimension = '4D';
          else if (building.dimensional.v_axis) dimension = '5D';
          else if (building.dimensional.u_axis) dimension = '6D';

          dimensional.push({
            id: building.id,
            name: building.name,
            dimension
          });
        }
      }
    }
  }

  return dimensional;
}

/**
 * Browser console helper to place a dimensional building for testing.
 * Usage: placeDimensionalBuilding('tesseract_research_lab_01', 100, 100)
 */
export function placeDimensionalBuilding(buildingId: string, x: number, y: number): string | null {
  // This would be called from the browser where 'game' is available
  if (typeof window === 'undefined' || !(window as any).game) {
    console.error('Must be run in browser with game instance available');
    return null;
  }

  const game = (window as any).game;
  const world = game.world;

  // Create entity
  const entity = world.createEntity();
  entity.addComponent({ type: 'position', x, y, z: 0 });
  entity.addComponent({
    type: 'building',
    buildingType: buildingId,
    isComplete: true,
    progress: 100
  });
  entity.addComponent({
    type: 'renderable',
    spriteId: 'building-placeholder',
    visible: true
  });

  console.log(`✓ Placed ${buildingId} at (${x}, ${y})`);
  console.log(`  Entity ID: ${entity.id}`);
  console.log(`  Use game.setSelectedAgent('${entity.id}') to select it`);

  return entity.id;
}

// Auto-load in browser
if (typeof window !== 'undefined') {
  (window as any).loadDimensionalBuildings = loadDimensionalBuildings;
  (window as any).getDimensionalBuildingIds = getDimensionalBuildingIds;
  (window as any).placeDimensionalBuilding = placeDimensionalBuilding;

  console.log('Dimensional building helpers loaded:');
  console.log('  loadDimensionalBuildings() - Load all buildings');
  console.log('  getDimensionalBuildingIds() - List dimensional buildings');
  console.log('  placeDimensionalBuilding(id, x, y) - Place a building for testing');
}
