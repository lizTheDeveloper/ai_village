/**
 * Improved building designs that actually look like houses
 */

import { visualizeGrid, visualizeAnalysis } from './custom_game_engine/tools/llm-building-designer/src/visualizer.js';
import type { VoxelBuildingDefinition } from './custom_game_engine/tools/llm-building-designer/src/types.js';

const improvedBuildings: VoxelBuildingDefinition[] = [
  {
    name: 'Improved Small House (5x5)',
    category: 'residential',
    tier: 1,
    layout: [
      '#####',
      '#...#',
      'W...D',  // Door centered on right wall with window
      '#...#',
      '#####',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Improved Medium House with Porch (7x5)',
    category: 'residential',
    tier: 2,
    layout: [
      '  ###  ',
      '  D.#  ',  // Front porch area
      '#####W#',
      '#.....#',
      '#######',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Cozy Cottage (6x6)',
    category: 'residential',
    tier: 2,
    layout: [
      '######',
      '#W..W#',  // Windows on both sides
      '#....#',
      '#....D',  // Door on right side
      '#....#',
      '######',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Stone Cottage with Windows (5x5)',
    category: 'residential',
    tier: 2,
    layout: [
      '#####',
      'W...W',  // Symmetrical windows
      '#...#',
      '#...#',
      '##D##',  // Centered door at bottom
    ],
    materials: {
      wall: 'stone',
      floor: 'stone_floor',
    },
  },
  {
    name: 'Manor House (8x6)',
    category: 'residential',
    tier: 3,
    layout: [
      '########',
      'W......W',  // Wide windows
      '#......#',
      '#......#',
      '#......#',
      '###DD###',  // Double door entrance
    ],
    materials: {
      wall: 'stone',
      floor: 'marble_floor',
    },
  },
  {
    name: 'Multi-Room House (7x7)',
    category: 'residential',
    tier: 3,
    layout: [
      '#######',
      'W.#...W',  // Two rooms separated by wall
      '#.#...#',
      '#.D...#',  // Internal door
      '#.....#',
      '#.....#',
      '###D###',  // Centered entrance
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Actual Guard Tower (4x4x3 floors)',
    category: 'community',
    tier: 2,
    layout: [
      '####',
      'W..W',  // Windows for visibility
      'W..W',  // Multiple windows
      '##D#',  // Bottom entrance
    ],
    materials: {
      wall: 'stone',
      floor: 'stone_floor',
    },
    floors: [
      {
        level: 1,
        name: 'Second Floor',
        layout: [
          '####',
          'W..W',
          'W..W',
          '####',
        ],
        ceilingHeight: 3,
      },
      {
        level: 2,
        name: 'Tower Top',
        layout: [
          'WWWW',  // Open-air observation deck with low walls
          'W..W',
          'W..W',
          'WWWW',
        ],
        ceilingHeight: 4,
      },
    ],
  },
];

console.log('═══════════════════════════════════════════════════════');
console.log('           IMPROVED BUILDING DESIGNS                   ');
console.log('═══════════════════════════════════════════════════════\n');

for (const building of improvedBuildings) {
  console.log('\n' + '═'.repeat(60));
  console.log(visualizeAnalysis(building));
  console.log('═'.repeat(60) + '\n');
}
