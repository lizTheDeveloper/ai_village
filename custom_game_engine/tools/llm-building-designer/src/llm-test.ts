/**
 * LLM Building Designer - Self-Test
 *
 * This script simulates an LLM designing buildings and validates them.
 * Run with: npx ts-node src/llm-test.ts
 */

import { VoxelBuildingDefinition } from './types';
import { validateBuilding } from './validator';
import { visualizeAnalysis, visualizePathfinding, summarizeBuilding } from './visualizer';

// =============================================================================
// LLM DESIGNS A BUILDING
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('  LLM BUILDING DESIGNER - SELF TEST');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Attempt 1: Design a tavern
console.log('ATTEMPT 1: Designing a tavern...');
console.log('');

const tavernAttempt1: VoxelBuildingDefinition = {
  id: 'village_tavern',
  name: 'The Rusty Anchor Tavern',
  description: 'A cozy tavern where villagers gather to share stories and ale.',
  category: 'commercial',
  tier: 3,
  layout: [
    '##############',
    '#............#',
    '#..TT....TT..#',
    '#..TT....TT..#',
    'W............W',
    '#....CCCC....#',
    '#....CCCC....#',
    '#............#',
    '#............D',
    '##############',
  ],
  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },
  functionality: [
    { type: 'mood_aura', params: { bonus: 10, radius: 5 } },
    { type: 'storage', params: { capacity: 50, itemTypes: ['food', 'drink'] } },
  ],
  capacity: 20,
  style: 'rustic',
  lore: 'A favorite gathering spot where tales of adventure are shared over hearty meals.',
};

console.log(visualizeAnalysis(tavernAttempt1));
console.log('');

// Check if valid
const result1 = validateBuilding(tavernAttempt1);
if (!result1.isValid) {
  console.log('⚠ Building has errors. Let me fix them...');
  console.log('');
}

// =============================================================================
// ATTEMPT 2: Design a blacksmith forge
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('ATTEMPT 2: Designing a blacksmith forge...');
console.log('');

const forgeAttempt: VoxelBuildingDefinition = {
  id: 'blacksmith_forge',
  name: 'Iron Heart Forge',
  description: 'A sturdy forge where weapons and tools are crafted.',
  category: 'production',
  tier: 3,
  layout: [
    '###########',
    '#.KK...SS.#',
    '#.KK...SS.#',
    'W.........W',
    '#.........#',
    '####...####',
    '   #...#   ',
    '   #...#   ',
    '   #...D   ',
    '   #####   ',
  ],
  materials: {
    wall: 'stone',
    floor: 'stone',
    door: 'metal',
  },
  functionality: [
    { type: 'crafting', params: { speed: 1.5, recipes: ['weapons', 'tools', 'armor'] } },
  ],
  capacity: 3,
  style: 'dwarven',
  lore: 'The rhythmic clang of hammer on anvil echoes through the village.',
};

console.log(visualizeAnalysis(forgeAttempt));
console.log('');
console.log(visualizePathfinding(forgeAttempt));
console.log('');

// =============================================================================
// ATTEMPT 3: Design a library
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('ATTEMPT 3: Designing a village library...');
console.log('');

const libraryAttempt: VoxelBuildingDefinition = {
  id: 'village_library',
  name: 'Hall of Knowledge',
  description: 'A quiet sanctuary filled with books and scrolls.',
  category: 'research',
  tier: 4,
  layout: [
    '################',
    '#..SS....SS....#',
    '#..SS....SS....#',
    '#..............#',
    'W..TT....TT....W',
    '#..............#',
    '#..SS....SS....#',
    '#..SS....SS....#',
    '#..............#',
    'W..TT....TT....W',
    '#..............#',
    '#..............#',
    '#######D########',
  ],
  materials: {
    wall: 'stone',
    floor: 'wood',
    door: 'wood',
  },
  functionality: [
    { type: 'research', params: { bonus: 2.0, fields: ['all'] } },
    { type: 'mood_aura', params: { bonus: 5, radius: 3 } },
  ],
  capacity: 10,
  style: 'ancient',
  lore: 'Generations of knowledge are preserved within these walls.',
};

console.log(visualizeAnalysis(libraryAttempt));
console.log('');

// =============================================================================
// ATTEMPT 4: Design an INVALID building (to show error detection)
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('ATTEMPT 4: Intentionally flawed building to test validation...');
console.log('');

const flawedBuilding: VoxelBuildingDefinition = {
  id: 'flawed_building',
  name: 'Problematic Structure',
  description: 'This building has several design flaws.',
  category: 'residential',
  tier: 2,
  layout: [
    '###########',
    '#....#....#',  // Two rooms
    '#....#....#',  // No door between them!
    '#....#....#',
    '###########',  // No entrance at all!
  ],
  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },
  functionality: [],
  capacity: 2,
};

console.log(visualizeAnalysis(flawedBuilding));
console.log('');

// =============================================================================
// SUMMARY
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('SUMMARY OF ALL BUILDINGS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const buildings = [tavernAttempt1, forgeAttempt, libraryAttempt, flawedBuilding];
for (const building of buildings) {
  console.log(summarizeBuilding(building));
  console.log('');
}
