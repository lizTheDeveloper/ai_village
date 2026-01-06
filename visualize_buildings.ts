/**
 * Visualize all standard buildings using the LLM ASCII visualizer
 */

import { visualizeGrid, visualizeAnalysis } from './custom_game_engine/tools/llm-building-designer/src/visualizer.js';
import type { VoxelBuildingDefinition } from './custom_game_engine/tools/llm-building-designer/src/types.js';

// Buildings from TileBasedBlueprintRegistry
const buildings: VoxelBuildingDefinition[] = [
  {
    name: 'Small House',
    category: 'residential',
    tier: 1,
    layout: [
      '###',
      '#.D',
      '###',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Medium House',
    category: 'residential',
    tier: 2,
    layout: [
      '#####',
      '#...D',
      '#...#',
      '#####',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Workshop',
    category: 'production',
    tier: 2,
    layout: [
      '#W##',
      '#..D',
      '#..#',
      '####',
    ],
    materials: {
      wall: 'stone',
      floor: 'stone_floor',
    },
  },
  {
    name: 'Storage Shed',
    category: 'storage',
    tier: 1,
    layout: [
      '###',
      'D.#',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Barn',
    category: 'farming',
    tier: 3,
    layout: [
      '######',
      '#....#',
      'D....D',
      '#....#',
      '######',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
  {
    name: 'Stone House',
    category: 'residential',
    tier: 3,
    layout: [
      '####',
      '#W.#',
      '#..D',
      '####',
    ],
    materials: {
      wall: 'stone',
      floor: 'stone_floor',
    },
  },
  {
    name: 'Guard Tower',
    category: 'community',
    tier: 2,
    layout: [
      '###',
      '#.#',
      '#D#',
    ],
    materials: {
      wall: 'stone',
      floor: 'stone_floor',
    },
  },
  {
    name: 'Longhouse',
    category: 'residential',
    tier: 3,
    layout: [
      '########',
      '#......D',
      '#......#',
      '########',
    ],
    materials: {
      wall: 'wood',
      floor: 'wood_floor',
    },
  },
];

console.log('═══════════════════════════════════════════════════════');
console.log('           STANDARD BUILDING VISUALIZATIONS            ');
console.log('═══════════════════════════════════════════════════════\n');

for (const building of buildings) {
  console.log('\n' + '═'.repeat(60));
  console.log(visualizeAnalysis(building));
  console.log('═'.repeat(60) + '\n');
}
