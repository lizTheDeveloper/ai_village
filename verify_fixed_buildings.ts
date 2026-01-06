/**
 * Verify the fixed building designs
 */

import { visualizeGrid, visualizeAnalysis } from './custom_game_engine/tools/llm-building-designer/src/visualizer.js';
import type { VoxelBuildingDefinition } from './custom_game_engine/tools/llm-building-designer/src/types.js';

// Updated buildings from TileBasedBlueprintRegistry
const fixedBuildings: VoxelBuildingDefinition[] = [
  {
    name: 'Small House (FIXED)',
    category: 'residential',
    tier: 1,
    layout: [
      '#####',
      '#...#',
      'W...D',
      '#...#',
      '#####',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Cozy Cottage (FIXED)',
    category: 'residential',
    tier: 2,
    layout: [
      '######',
      '#....#',
      'W....W',
      '#....#',
      '#....#',
      '###D##',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Workshop (FIXED)',
    category: 'production',
    tier: 2,
    layout: [
      '#####',
      'W...W',
      '#...#',
      '#...#',
      '##D##',
    ],
    materials: {
      wall: 'stone',
      floor: 'stone_floor',
    },
  },
  {
    name: 'Barn (FIXED)',
    category: 'farming',
    tier: 3,
    layout: [
      '######',
      'W....W',
      'D....D',
      'W....W',
      '######',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Stone House (FIXED)',
    category: 'residential',
    tier: 3,
    layout: [
      '#####',
      'W...W',
      '#...#',
      '#...#',
      '##D##',
    ],
    materials: {
      wall: 'stone',
      floor: 'stone_floor',
    },
  },
  {
    name: 'Guard Tower (FIXED)',
    category: 'community',
    tier: 2,
    layout: [
      '####',
      'W..W',
      'W..W',
      '##D#',
    ],
    materials: {
      wall: 'stone',
      floor: 'stone_floor',
    },
  },
  {
    name: 'Longhouse (FIXED)',
    category: 'residential',
    tier: 3,
    layout: [
      '########',
      'W......W',
      'W......W',
      '###DD###',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
];

console.log('═══════════════════════════════════════════════════════');
console.log('           FIXED BUILDING VISUALIZATIONS               ');
console.log('═══════════════════════════════════════════════════════\n');

for (const building of fixedBuildings) {
  console.log('\n' + '═'.repeat(60));
  console.log(visualizeAnalysis(building));
  console.log('═'.repeat(60) + '\n');
}

// Summary
console.log('\n\n' + '═'.repeat(60));
console.log('SUMMARY OF IMPROVEMENTS');
console.log('═'.repeat(60));
console.log('\n✅ Small House: 3x3 (1 tile) → 5x5 (9 tiles) + window');
console.log('✅ Medium House: 5x4 (6 tiles) → 6x6 (16 tiles) + 2 windows + centered door');
console.log('✅ Workshop: 4x4 (4 tiles) → 5x5 (9 tiles) + 2 windows + centered door');
console.log('✅ Barn: 6x5 (12 tiles) → Added 4 windows for ventilation');
console.log('✅ Stone House: 4x4 (3 tiles) → 5x5 (9 tiles) + 2 windows + centered door');
console.log('✅ Guard Tower: 3x3 (1 tile) → 4x4 (4 tiles) + 4 windows for visibility');
console.log('✅ Longhouse: 8x4 (12 tiles) → Added 4 windows + double door entrance\n');
