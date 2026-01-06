/**
 * Multi-Floor & Compositional Building Demo
 *
 * Demonstrates:
 * 1. Floor slicer visualization
 * 2. Species height requirements
 * 3. Ceiling comfort analysis
 * 4. Compositional module system
 *
 * Run with: npx ts-node src/multifloor-demo.ts
 */

import { VoxelBuildingDefinition } from './types';
import {
  visualizeAllFloors,
  visualizeCrossSection,
  visualizeCeilingComfort,
} from './visualizer';
import {
  expandComposition,
  BUILDING_TEMPLATES,
  MODULE_DESCRIPTIONS,
} from './composer';
import { validateBuilding } from './validator';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  MULTI-FLOOR & COMPOSITIONAL BUILDING DEMO');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// =============================================================================
// DEMO 1: Multi-Floor Building with Floor Slicer
// =============================================================================

console.log('DEMO 1: Multi-Floor Tavern with Inn Rooms');
console.log('─'.repeat(50));
console.log('');

const multiFloorTavern: VoxelBuildingDefinition = {
  id: 'multifloor_tavern',
  name: 'The Sleepy Dragon Inn',
  description: 'A two-story tavern with guest rooms upstairs.',
  category: 'commercial',
  tier: 4,
  species: 'medium', // Human-sized (2 voxel height)
  layout: [
    '##############',
    '#....CCCC....#',
    '#............#',
    'W..TT..TT....W',
    '#..TT..TT....#',
    '#............#',
    '#......^.....#',  // Stairs up
    '#............D',
    '##############',
  ],
  floors: [
    {
      level: 1,
      name: 'Guest Rooms',
      ceilingHeight: 4, // Standard human ceiling
      layout: [
        '##############',
        '#BB.#BB.#BB.##',
        '#...D...D...##',
        'W...#...#...##',
        '####D####...##',
        '#...........##',
        '#...v.......##',  // Stairs down
        '#...........##',
        '##############',
      ],
    },
  ],
  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },
  functionality: [
    { type: 'sleeping', params: { beds: 6 } },
    { type: 'mood_aura', params: { bonus: 10 } },
  ],
  capacity: 20,
  style: 'rustic',
};

// Show all floors
console.log(visualizeAllFloors(multiFloorTavern));
console.log('');

// Show cross-section at stairwell location (x=5)
console.log(visualizeCrossSection(multiFloorTavern, 5));
console.log('');

// =============================================================================
// DEMO 2: Species Height Requirements
// =============================================================================

console.log('');
console.log('DEMO 2: Ceiling Comfort for Different Species');
console.log('─'.repeat(50));
console.log('');

// Building for tiny creatures
const fairyHome: VoxelBuildingDefinition = {
  id: 'fairy_home',
  name: 'Dewdrop Cottage',
  description: 'A tiny home for fairy folk.',
  category: 'residential',
  tier: 1,
  species: 'tiny', // 0.5 voxel height
  layout: [
    '#####',
    '#...#',
    '#.B.D',
    '#...#',
    '#####',
  ],
  floors: [
    {
      level: 0,
      name: 'Main Room',
      layout: ['#####', '#...#', '#.B.D', '#...#', '#####'],
      ceilingHeight: 1.5, // Perfect for fairies
    },
  ],
  materials: { wall: 'wood', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'sleeping', params: { beds: 1 } }],
  capacity: 2,
};

console.log('Fairy Home (ceiling: 1.5 voxels):');
console.log(visualizeCeilingComfort(fairyHome));

// Show comfort for different species visiting
console.log('How would different species feel in this fairy home?');
console.log('');
console.log('  Fairy (0.5 voxels): ' + 'Comfortable - normal living space');
console.log('  Gnome (1 voxel): ' + 'Snug - tight fit, claustrophobic');
console.log('  Human (2 voxels): ' + 'Cramped - must duck constantly!');
console.log('');

// =============================================================================
// DEMO 3: Compositional Module System
// =============================================================================

console.log('');
console.log('DEMO 3: Compositional Building (Module System)');
console.log('─'.repeat(50));
console.log('');

console.log('Available Modules for LLMs:');
for (const [type, description] of Object.entries(MODULE_DESCRIPTIONS)) {
  console.log(`  ${type.padEnd(18)} - ${description}`);
}
console.log('');

console.log('Building a workshop using composition:');
console.log('');
console.log('  modules: [');
console.log('    { type: "entrance_hall", size: "small", connections: ["east"] },');
console.log('    { type: "workshop", size: "large", connections: ["west", "east"] },');
console.log('    { type: "storage_room", size: "medium", connections: ["west"] }');
console.log('  ]');
console.log('');

// Generate the workshop from composition
const workshopComposition = BUILDING_TEMPLATES.workshop_building();
const workshopLayout = expandComposition(workshopComposition);

console.log('Expanded Layout:');
for (let y = 0; y < workshopLayout.length; y++) {
  console.log(`  ${y.toString().padStart(2, '0')}: ${workshopLayout[y]}`);
}
console.log('');

// Validate the generated building
const workshopBuilding: VoxelBuildingDefinition = {
  id: 'composed_workshop',
  name: 'Composed Workshop',
  description: 'A workshop built using the compositional system.',
  category: 'production',
  tier: 3,
  layout: workshopLayout,
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [{ type: 'crafting', params: { speed: 1.5 } }],
  capacity: 5,
};

const result = validateBuilding(workshopBuilding);
console.log(`Validation: ${result.isValid ? 'VALID ✓' : 'INVALID ✗'}`);
console.log(`  Walls: ${result.tileCounts.walls}`);
console.log(`  Floors: ${result.tileCounts.floors}`);
console.log(`  Doors: ${result.tileCounts.doors}`);
console.log(`  Rooms: ${result.rooms.length}`);
console.log('');

// =============================================================================
// DEMO 4: Dwarf vs Elf Building Comparison
// =============================================================================

console.log('');
console.log('DEMO 4: Dwarf Hall vs Elven Tower');
console.log('─'.repeat(50));
console.log('');

const dwarfHall: VoxelBuildingDefinition = {
  id: 'dwarf_hall',
  name: 'Stonefist Hall',
  description: 'A sturdy dwarf meeting hall.',
  category: 'community',
  tier: 3,
  species: 'short', // Dwarves are 1.5 voxels
  layout: [
    '###########',
    '#.........#',
    '#..KKK....#',
    'W.........W',
    '#..TTT....#',
    '#.........#',
    '#####D#####',
  ],
  floors: [
    {
      level: 0,
      name: 'Great Hall',
      layout: ['###########', '#.........#', '#..KKK....#', 'W.........W', '#..TTT....#', '#.........#', '#####D#####'],
      ceilingHeight: 3, // Comfortable for dwarves
    },
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [{ type: 'mood_aura', params: { bonus: 15 } }],
  capacity: 30,
  style: 'dwarven',
};

const elvenTower: VoxelBuildingDefinition = {
  id: 'elven_tower',
  name: 'Starlight Spire',
  description: 'An elegant elven tower.',
  category: 'research',
  tier: 4,
  species: 'tall', // Elves are 2.5 voxels
  layout: [
    '  #####  ',
    ' ##...## ',
    '##.....##',
    '#...^...#',
    'W.......W',
    '#.......#',
    '##.....##',
    ' ##...## ',
    '  ##D##  ',
  ],
  floors: [
    {
      level: 0,
      name: 'Ground Floor',
      layout: ['  #####  ', ' ##...## ', '##.....##', '#...^...#', 'W.......W', '#.......#', '##.....##', ' ##...## ', '  ##D##  '],
      ceilingHeight: 6, // Tall and airy for elves
    },
    {
      level: 1,
      name: 'Observatory',
      ceilingHeight: 8, // Extra tall for stargazing
      layout: [
        '  #####  ',
        ' ##...## ',
        '##..S..##',
        '#..SSS..#',
        'W...v...W',
        '#.......#',
        '##.....##',
        ' ##...## ',
        '  #####  ',
      ],
    },
  ],
  materials: { wall: 'glass', floor: 'wood', door: 'wood' },
  functionality: [{ type: 'research', params: { bonus: 2.0 } }],
  capacity: 10,
  style: 'elven',
};

console.log('Dwarf Hall - Ceiling Comfort:');
console.log(visualizeCeilingComfort(dwarfHall));

console.log('Elven Tower - Ceiling Comfort:');
console.log(visualizeCeilingComfort(elvenTower));

console.log('What if a dwarf visits the elven tower?');
// Dwarf height is 1.5, elven tower ceiling is 6-8
console.log('  Dwarf (1.5 voxels) in Elven Observatory (8v ceiling):');
console.log('    Ratio: 5.3x creature height');
console.log('    🏛️ CAVERNOUS: Grand cathedral-like space');
console.log('    Mood modifier: +10 (impressive but maybe intimidating!)');
console.log('');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  DEMO COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
