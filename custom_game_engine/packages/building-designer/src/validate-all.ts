/**
 * Validate all crafting buildings and report issues
 */

import { validateBuilding } from './validator';
import { visualizeGrid } from './visualizer';
import { ALL_CRAFTING_BUILDINGS } from './crafting-buildings-data';
import { ALL_BUILDINGS } from './building-library-data';
import { VoxelBuildingDefinition } from './types';

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('  VALIDATING ALL BUILDINGS');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');

interface BuildingIssue {
  building: VoxelBuildingDefinition;
  problems: string[];
}

function validateBuildingSet(buildings: VoxelBuildingDefinition[], setName: string): BuildingIssue[] {
  console.log(`\n=== ${setName} (${buildings.length} buildings) ===\n`);

  const issues: BuildingIssue[] = [];

  for (const building of buildings) {
    const result = validateBuilding(building);

    const problems: string[] = [];

    // Check for errors
    if (!result.isValid) {
      const errors = result.issues.filter(i => i.severity === 'error').map(i => i.message);
      problems.push(...errors.map(e => `ERROR: ${e}`));
    }

    // Check for warnings
    const warnings = result.issues.filter(i => i.severity === 'warning').map(i => i.message);
    problems.push(...warnings.map(w => `Warning: ${w}`));

    // Check entrance count
    if (result.pathfinding.entrances.length === 0) {
      problems.push('NO ENTRANCE - building is inaccessible!');
    }

    // Check rooms
    if (result.rooms.length === 0 && result.tileCounts.floors > 0) {
      problems.push('No rooms detected despite having floor tiles');
    }

    // Check for very small buildings
    if (result.tileCounts.floors < 4) {
      problems.push(`Very small interior: only ${result.tileCounts.floors} floor tiles`);
    }

    // Check dead ends (could trap villagers)
    if (result.pathfinding.deadEnds.length > 3) {
      problems.push(`Many dead ends (${result.pathfinding.deadEnds.length}) - may trap villagers`);
    }

    // Print status
    const status = problems.length === 0 ? '✓' : (result.isValid ? '⚠' : '✗');
    console.log(`${status} ${building.name.padEnd(28)} | T${building.tier} | ${result.tileCounts.floors.toString().padStart(3)} floor | ${result.pathfinding.entrances.length} door | ${result.rooms.length} room`);

    if (problems.length > 0) {
      for (const p of problems) {
        console.log(`    → ${p}`);
      }
      issues.push({ building, problems });
    }
  }

  return issues;
}

// Validate crafting buildings
const craftingIssues = validateBuildingSet(ALL_CRAFTING_BUILDINGS, 'CRAFTING BUILDINGS');

// Validate village buildings
const villageIssues = validateBuildingSet(ALL_BUILDINGS, 'VILLAGE BUILDINGS');

const allIssues = [...craftingIssues, ...villageIssues];

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log(`  SUMMARY: ${ALL_CRAFTING_BUILDINGS.length + ALL_BUILDINGS.length} buildings checked`);
console.log(`  Issues found: ${allIssues.length} buildings with problems`);
console.log('═══════════════════════════════════════════════════════════════════════');

// Show detailed view of problem buildings
if (allIssues.length > 0) {
  console.log('\n\n=== DETAILED VIEW OF PROBLEM BUILDINGS ===\n');

  for (const { building, problems } of allIssues) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${building.name} (${building.id})`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`Tier: ${building.tier} | Category: ${building.category} | Species: ${building.species || 'medium'}`);
    console.log('');
    console.log('Layout:');
    console.log(visualizeGrid(building));
    console.log('');
    console.log('Problems:');
    for (const p of problems) {
      console.log(`  - ${p}`);
    }
  }
}
