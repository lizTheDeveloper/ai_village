/**
 * Validate generated buildings
 */

import { validateBuilding, formatValidationResult } from './validator';
import { VoxelBuildingDefinition } from './types';
import * as fs from 'fs';
import * as path from 'path';

// Load generated buildings
const buildingsPath = path.join(__dirname, '..', 'generated-buildings.json');
const buildings: VoxelBuildingDefinition[] = JSON.parse(
  fs.readFileSync(buildingsPath, 'utf-8')
);

console.log(`\n${'='.repeat(80)}`);
console.log('VALIDATING GENERATED BUILDINGS');
console.log(`${'='.repeat(80)}\n`);

let validCount = 0;
let invalidCount = 0;

for (const building of buildings) {
  const result = validateBuilding(building);

  console.log(`\n${building.name} (${building.id})`);
  console.log(`Category: ${building.category} | Tier: ${building.tier}`);
  console.log(`Materials: ${building.materials.wall}/${building.materials.floor}/${building.materials.door}`);
  console.log(`Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);

  if (result.isValid) {
    validCount++;
  } else {
    invalidCount++;
    console.log('\nIssues:');
    console.log(formatValidationResult(result));
  }

  console.log(`${'-'.repeat(80)}`);
}

console.log(`\n${'='.repeat(80)}`);
console.log(`SUMMARY: ${validCount} valid, ${invalidCount} invalid`);
console.log(`${'='.repeat(80)}\n`);

if (invalidCount > 0) {
  process.exit(1);
}
