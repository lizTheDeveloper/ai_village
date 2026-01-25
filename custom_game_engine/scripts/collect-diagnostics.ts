/**
 * Collect diagnostics by running a mini game simulation
 */

import {
  GameLoop,
  EventBusImpl,
  World,
  SystemRegistry,
  diagnosticsHarness,
  wrapEntity,
  wrapWorld,
  createEntityId,
  EntityImpl,
  registerAllSystems,
} from '../packages/core/src/index.js';
import { ChunkManager } from '../packages/world/src/index.js';

console.log('========================================');
console.log('COLLECTING DIAGNOSTICS FROM REAL SYSTEMS');
console.log('========================================\n');

// Enable diagnostics
diagnosticsHarness.setEnabled(true);
diagnosticsHarness.clear();
console.log('✅ Diagnostics enabled\n');

// Create minimal game setup
const eventBus = new EventBusImpl();
const chunkManager = new ChunkManager({ seed: 12345, chunkSize: 32 });
const systemRegistry = new SystemRegistry();
const world = new World(eventBus, chunkManager, systemRegistry);

// Register core systems
console.log('Registering systems...');
const registrationResult = registerAllSystems(
  { world, systemRegistry } as any,
  {
    llmQueue: undefined,
    plantSystems: { enabled: false },
    introspection: { enabled: false },
  }
);

console.log(`Registered ${registrationResult.registeredCount} systems\n`);

// Create a few test entities
console.log('Creating test entities...');
for (let i = 0; i < 5; i++) {
  const entity = new EntityImpl(createEntityId(), eventBus);

  // Add some basic components
  entity.addComponent({
    type: 'position',
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: 0,
  });

  entity.addComponent({
    type: 'renderable',
    sprite: 'test_sprite',
    layer: 0,
  });

  world.addEntity(entity);
}

console.log(`Created ${world.entities.size} entities\n`);

// Run simulation for a few ticks
console.log('Running simulation for 10 ticks...');
for (let tick = 0; tick < 10; tick++) {
  world.advanceTick();
  systemRegistry.updateAll(world);
}
console.log('Simulation complete\n');

// Collect diagnostics
console.log('========================================');
console.log('DIAGNOSTICS RESULTS');
console.log('========================================\n');

const summary = diagnosticsHarness.getSummary();
console.log(`Total Unique Issues: ${summary.totalIssues}`);

if (summary.totalIssues === 0) {
  console.log('\n✅ No issues detected! All systems are using correct property names.\n');
  process.exit(0);
}

console.log(`\nBy Type:`);
for (const [type, count] of Object.entries(summary.byType)) {
  console.log(`  ${type}: ${count} occurrences`);
}

console.log(`\nBy Severity:`);
for (const [severity, count] of Object.entries(summary.bySeverity)) {
  console.log(`  ${severity}: ${count} occurrences`);
}

console.log(`\n========================================`);
console.log('ALL ISSUES (sorted by frequency)');
console.log('========================================\n');

const issues = diagnosticsHarness.getIssues();
for (const issue of issues.slice(0, 20)) { // Top 20
  console.log(`[${issue.severity.toUpperCase()}] ${issue.objectType}.${issue.property}`);
  console.log(`  Count: ${issue.count}`);
  if (issue.objectId) {
    console.log(`  Object ID: ${issue.objectId}`);
  }
  if (issue.context?.suggestions && issue.context.suggestions.length > 0) {
    console.log(`  💡 Suggestions: ${issue.context.suggestions.join(', ')}`);
  }
  if (issue.stackTrace) {
    const firstLine = issue.stackTrace.split('\n')[0];
    console.log(`  📍 ${firstLine.trim()}`);
  }
  console.log('');
}

// Export to file
const exportData = diagnosticsHarness.export();
const fs = await import('fs');
fs.writeFileSync('diagnostics-report.json', exportData);
console.log('========================================');
console.log('Full report saved to: diagnostics-report.json');
console.log('========================================');
