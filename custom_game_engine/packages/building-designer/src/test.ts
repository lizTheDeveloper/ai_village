/**
 * LLM Building Designer - Test Suite
 *
 * Run with: npx ts-node src/test.ts
 */

import {
  validateBuilding,
  formatValidationResult,
  visualizeBuilding,
  ALL_VALID_EXAMPLES,
  ALL_INVALID_EXAMPLES,
  VoxelBuildingDefinition,
} from './index';

// =============================================================================
// TEST UTILITIES
// =============================================================================

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passCount++;
    console.log(`  PASS: ${name}`);
  } catch (error) {
    failCount++;
    console.log(`  FAIL: ${name}`);
    console.log(`        ${error}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value: boolean, message?: string): void {
  if (!value) {
    throw new Error(message || 'Expected true, got false');
  }
}

function assertFalse(value: boolean, message?: string): void {
  if (value) {
    throw new Error(message || 'Expected false, got true');
  }
}

// =============================================================================
// TESTS
// =============================================================================

function runTests(): void {
  console.log('\n=== LLM Building Designer Test Suite ===\n');

  // Test valid buildings
  console.log('Testing valid buildings...');
  for (const building of ALL_VALID_EXAMPLES) {
    test(`${building.name} should be valid`, () => {
      const result = validateBuilding(building);
      assertTrue(result.isValid, `Building "${building.name}" should be valid but has errors: ${result.issues.filter(i => i.severity === 'error').map(i => i.message).join(', ')}`);
    });
  }

  console.log('\nTesting invalid buildings...');
  for (const building of ALL_INVALID_EXAMPLES) {
    test(`${building.name} should be invalid`, () => {
      const result = validateBuilding(building);
      assertFalse(result.isValid, `Building "${building.name}" should be invalid but passed validation`);
    });
  }

  // Test specific validation checks
  console.log('\nTesting specific validation features...');

  test('Should detect no entrance', () => {
    const building: VoxelBuildingDefinition = {
      id: 'test_no_entrance',
      name: 'Test',
      description: 'Test',
      category: 'residential',
      tier: 1,
      layout: ['###', '#.#', '###'],
      materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
      functionality: [],
      capacity: 1,
    };
    const result = validateBuilding(building);
    assertTrue(
      result.issues.some(i => i.type === 'no_entrance'),
      'Should detect no entrance'
    );
  });

  test('Should detect unreachable rooms', () => {
    const building: VoxelBuildingDefinition = {
      id: 'test_unreachable',
      name: 'Test',
      description: 'Test',
      category: 'residential',
      tier: 1,
      layout: [
        '##########',
        '#...#....#',
        '#...#....D',
        '##########',
      ],
      materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
      functionality: [],
      capacity: 1,
    };
    const result = validateBuilding(building);
    assertTrue(
      result.issues.some(i => i.type === 'unreachable_room'),
      'Should detect unreachable room'
    );
  });

  test('Should detect rooms correctly', () => {
    // Note: Rooms connected by doors are treated as one room during flood fill
    // because doors are walkable. Separate rooms need walls between them.
    const building: VoxelBuildingDefinition = {
      id: 'test_rooms',
      name: 'Test',
      description: 'Test',
      category: 'residential',
      tier: 2,
      layout: [
        '###########',
        '#....#....#',
        '#....#....D',
        '###########',
      ],
      materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
      functionality: [],
      capacity: 2,
    };
    const result = validateBuilding(building);
    // Two rooms separated by a full wall - left room is unreachable
    assertEqual(result.rooms.length, 2, 'Should detect 2 rooms');
  });

  test('Should calculate tile counts', () => {
    const building: VoxelBuildingDefinition = {
      id: 'test_counts',
      name: 'Test',
      description: 'Test',
      category: 'residential',
      tier: 1,
      layout: [
        '#####',
        '#...#',
        '#...D',
        '#####',
      ],
      materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
      functionality: [],
      capacity: 1,
    };
    const result = validateBuilding(building);
    // 5+5 (top/bottom rows) + 1+1 (sides row 2) + 1 (side row 3) = 13 walls (one is door)
    assertEqual(result.tileCounts.walls, 13, 'Should count 13 walls');
    assertEqual(result.tileCounts.floors, 6, 'Should count 6 floors');
    assertEqual(result.tileCounts.doors, 1, 'Should count 1 door');
  });

  test('Should detect windows in walls', () => {
    const building: VoxelBuildingDefinition = {
      id: 'test_windows',
      name: 'Test',
      description: 'Test',
      category: 'residential',
      tier: 2,
      layout: [
        '#####',
        'W...W',
        '#...D',
        '#####',
      ],
      materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
      functionality: [],
      capacity: 1,
    };
    const result = validateBuilding(building);
    assertEqual(result.tileCounts.windows, 2, 'Should count 2 windows');
    assertTrue(result.isValid, 'Building with properly placed windows should be valid');
  });

  test('Should warn about misplaced windows', () => {
    const building: VoxelBuildingDefinition = {
      id: 'test_bad_window',
      name: 'Test',
      description: 'Test',
      category: 'residential',
      tier: 2,
      layout: [
        '#####',
        '#.W.#', // Window in the middle of floor, not in wall
        '#...D',
        '#####',
      ],
      materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
      functionality: [],
      capacity: 1,
    };
    const result = validateBuilding(building);
    // This should generate a warning about the window placement
    assertTrue(
      result.issues.some(i => i.message.includes('Window')),
      'Should warn about misplaced window'
    );
  });

  test('Should calculate resource costs', () => {
    const building: VoxelBuildingDefinition = {
      id: 'test_costs',
      name: 'Test',
      description: 'Test',
      category: 'residential',
      tier: 1,
      layout: [
        '###',
        '#.D',
        '###',
      ],
      materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
      functionality: [],
      capacity: 1,
    };
    const result = validateBuilding(building);
    assertTrue(result.resourceCost.wood > 0, 'Should calculate wood cost');
    assertTrue(result.resourceCost.dirt > 0, 'Should calculate dirt cost');
  });

  test('Should identify entrances correctly', () => {
    const building: VoxelBuildingDefinition = {
      id: 'test_entrances',
      name: 'Test',
      description: 'Test',
      category: 'storage',
      tier: 2,
      layout: [
        '######',
        'D....D',
        '######',
      ],
      materials: { wall: 'wood', floor: 'dirt', door: 'wood' },
      functionality: [],
      capacity: 1,
    };
    const result = validateBuilding(building);
    assertEqual(result.pathfinding.entrances.length, 2, 'Should identify 2 entrances');
  });

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total:  ${passCount + failCount}`);

  if (failCount > 0) {
    console.log('\nSome tests failed!');
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
  }
}

// =============================================================================
// DEMO MODE
// =============================================================================

function runDemo(): void {
  console.log('\n=== LLM Building Designer Demo ===\n');

  // Pick a sample building
  const building = ALL_VALID_EXAMPLES[4]; // House with rooms

  console.log(visualizeBuilding(building));
  console.log('\n');
  console.log(formatValidationResult(validateBuilding(building)));

  console.log('\n--- Invalid Building Example ---\n');

  const invalidBuilding = ALL_INVALID_EXAMPLES[1]; // Unreachable room
  console.log(visualizeBuilding(invalidBuilding));
  console.log('\n');
  console.log(formatValidationResult(validateBuilding(invalidBuilding)));
}

// =============================================================================
// MAIN
// =============================================================================

const args = process.argv.slice(2);
if (args.includes('--demo')) {
  runDemo();
} else {
  runTests();
}
