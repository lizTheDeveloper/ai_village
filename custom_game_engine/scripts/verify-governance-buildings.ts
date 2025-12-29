/**
 * Verify governance buildings are registered in BuildingBlueprintRegistry.
 */

import { BuildingBlueprintRegistry } from '../packages/core/src/buildings/BuildingBlueprintRegistry.js';

const registry = new BuildingBlueprintRegistry();
registry.registerDefaults();

const governanceBuildings = [
  'town_hall',
  'census_bureau',
  'granary',
  'weather_station',
  'health_clinic',
  'meeting_hall',
  'watchtower',
  'labor_guild',
  'archive',
];

console.log('Verifying governance buildings...\n');

let allFound = true;

for (const id of governanceBuildings) {
  try {
    const blueprint = registry.get(id);
    console.log(`✓ ${blueprint.name} (id: ${id})`);
    console.log(`  Category: ${blueprint.category}`);
    console.log(`  Unlocked: ${blueprint.unlocked}`);
    console.log(`  Cost: ${blueprint.resourceCost.map(c => `${c.amountRequired} ${c.resourceId}`).join(', ')}`);
    console.log();
  } catch (error) {
    console.log(`✗ ${id} NOT FOUND`);
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    console.log();
    allFound = false;
  }
}

// Check category breakdown
console.log('\n=== Category Breakdown ===');
const categories = ['community', 'storage', 'research'];
for (const cat of categories) {
  const buildings = registry.getByCategory(cat as any);
  console.log(`\n${cat}:`);
  buildings.forEach(b => {
    const isGovernance = governanceBuildings.includes(b.id);
    console.log(`  ${isGovernance ? '🏛️' : '  '} ${b.name} (${b.id}) - unlocked: ${b.unlocked}`);
  });
}

console.log('\n=== Summary ===');
if (allFound) {
  console.log('✓ All governance buildings are registered!');
  process.exit(0);
} else {
  console.log('✗ Some governance buildings are missing!');
  process.exit(1);
}
