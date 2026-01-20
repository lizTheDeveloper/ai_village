/**
 * Import LLM-generated buildings into game format
 *
 * Converts VoxelBuildingDefinition (LLM designer format) to BuildingBlueprint (game format)
 */

import { VoxelBuildingDefinition } from './types';
import * as fs from 'fs';
import * as path from 'path';

interface BuildingBlueprint {
  id: string;
  name: string;
  description: string;
  category: string;
  width: number;
  height: number;
  resourceCost: Array<{ resourceId: string; amountRequired: number }>;
  techRequired: string[];
  terrainRequired: string[];
  terrainForbidden: string[];
  unlocked: boolean;
  buildTime: number;
  tier: number;
  functionality: any[];
  canRotate: boolean;
  rotationAngles: number[];
  snapToGrid: boolean;
  requiresFoundation: boolean;
  layout?: string[];
  materials?: {
    wall: string;
    floor: string;
    door: string;
  };
  capacity?: number;
}

/**
 * Calculate resource cost based on materials and tile counts
 */
function calculateResourceCost(
  building: VoxelBuildingDefinition,
  tileCounts: { walls: number; floors: number; doors: number; windows: number }
): Array<{ resourceId: string; amountRequired: number }> {
  const resources: Record<string, number> = {};

  // Map exotic materials to base materials for resource cost
  const materialToResource: Record<string, string> = {
    // Standard materials map to themselves
    wood: 'wood',
    stone: 'stone',
    metal: 'metal',
    glass: 'glass',
    brick: 'stone', // brick requires stone
    tile: 'stone',
    marble: 'stone',
    granite: 'stone',
    sandstone: 'stone',
    iron: 'metal',
    steel: 'metal',
    copper: 'metal',
    bronze: 'metal',

    // Organic materials
    fungus: 'wood',
    living_wood: 'wood',
    bamboo: 'wood',
    thatch: 'wood',
    reed: 'wood',

    // Exotic materials - use closest base material
    ice: 'water',
    crystal: 'glass',
    obsidian: 'stone',
    gingerbread: 'wood', // food materials -> wood equivalent
    candy: 'wood',
    chocolate: 'wood',
    bone: 'stone',

    // Magical materials - high cost
    starlight: 'magic',
    enchanted_wood: 'wood',
    darksteel: 'metal',
    stygian_iron: 'metal',
  };

  // Get resource for wall material
  const wallResource = materialToResource[building.materials.wall] || 'wood';
  const floorResource = materialToResource[building.materials.floor] || 'wood';
  const doorResource = materialToResource[building.materials.door] || 'wood';

  // Calculate costs (2 resources per tile)
  resources[wallResource] = (resources[wallResource] || 0) + tileCounts.walls * 2;
  resources[floorResource] = (resources[floorResource] || 0) + tileCounts.floors * 2;
  resources[doorResource] = (resources[doorResource] || 0) + tileCounts.doors * 5; // doors cost more
  resources['glass'] = (resources['glass'] || 0) + tileCounts.windows * 3;

  return Object.entries(resources).map(([resourceId, amountRequired]) => ({
    resourceId,
    amountRequired,
  }));
}

/**
 * Count tiles in layout
 */
function countTiles(layout: string[]): {
  walls: number;
  floors: number;
  doors: number;
  windows: number;
} {
  const counts = { walls: 0, floors: 0, doors: 0, windows: 0 };

  for (const row of layout) {
    for (const char of row) {
      if (char === '#') counts.walls++;
      else if (char === '.') counts.floors++;
      else if (char === 'D') counts.doors++;
      else if (char === 'W') counts.windows++;
      else if (['B', 'T', 'S', 'K', 'C'].includes(char)) counts.floors++; // furniture counts as floor
    }
  }

  return counts;
}

/**
 * Get a layout to count from (handles dimensional buildings)
 */
function getLayoutForCounting(building: any): string[] {
  // Try main layout first
  if (building.layout && Array.isArray(building.layout)) {
    return building.layout;
  }

  // Try dimensional structures
  if (building.dimensional) {
    if (building.dimensional.w_axis?.sliceLayouts?.[0]) {
      return building.dimensional.w_axis.sliceLayouts[0];
    }
    if (building.dimensional.v_axis?.phaseLayouts?.[0]) {
      return building.dimensional.v_axis.phaseLayouts[0];
    }
    if (building.dimensional.u_axis?.stateLayouts?.[0]) {
      return building.dimensional.u_axis.stateLayouts[0];
    }
  }

  // Fallback to empty layout
  return ['#####', '#...#', '#...#', '#...#', '#####'];
}

/**
 * Convert VoxelBuildingDefinition to BuildingBlueprint
 */
export function convertToGameFormat(building: VoxelBuildingDefinition): BuildingBlueprint {
  const layoutForCounting = getLayoutForCounting(building);
  const tileCounts = countTiles(layoutForCounting);
  const resourceCost = calculateResourceCost(building, tileCounts);

  // Calculate build time based on tier and size
  const tileCount = tileCounts.walls + tileCounts.floors + tileCounts.doors + tileCounts.windows;
  const buildTime = Math.ceil(tileCount * building.tier * 2); // ~seconds

  return {
    id: building.id,
    name: building.name,
    description: building.description || '',
    category: building.category,
    width: Math.max(...building.layout.map((row) => row.length)),
    height: building.layout.length,
    resourceCost,
    techRequired: [],
    terrainRequired: [],
    terrainForbidden: ['water'], // most buildings can't be built on water
    unlocked: building.tier <= 2, // auto-unlock tier 1-2
    buildTime,
    tier: building.tier,
    functionality: building.functionality || [],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: building.tier >= 3,
    layout: building.layout,
    materials: building.materials,
    capacity: building.capacity,
  };
}

/**
 * Import buildings from generated-buildings.json into game format
 */
export function importBuildings(
  sourceFile: string = 'generated-buildings.json',
  outputFile: string = 'generated-buildings-game-format.json'
): void {
  const sourcePath = path.join(__dirname, '..', sourceFile);
  const outputPath = path.join(__dirname, '..', outputFile);

  // Load generated buildings
  const buildings: VoxelBuildingDefinition[] = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

  // Convert to game format
  const gameBuildings: BuildingBlueprint[] = buildings.map(convertToGameFormat);

  // Write output
  const output = {
    buildings: gameBuildings,
    metadata: {
      source: 'LLM Building Designer',
      generatedAt: new Date().toISOString(),
      count: gameBuildings.length,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Converted ${gameBuildings.length} buildings to game format`);
  console.log(`📁 Output: ${outputFile}\n`);
  console.log('Buildings converted:');
  gameBuildings.forEach((b) => {
    console.log(`  - ${b.name} (${b.id}) [Tier ${b.tier}, ${b.width}x${b.height}]`);
  });

  console.log('\n📋 To import into game:');
  console.log('   1. Copy buildings from generated-buildings-game-format.json');
  console.log('   2. Add to packages/core/data/buildings.json');
  console.log('   3. Buildings will auto-load via StandardVoxelBuildings.ts\n');
}

/**
 * CLI usage
 */
if (require.main === module) {
  importBuildings();
}
