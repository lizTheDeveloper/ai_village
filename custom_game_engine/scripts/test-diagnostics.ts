/**
 * Test script to demonstrate diagnostics harness catching real issues
 */

import { diagnosticsHarness, wrapEntity, wrapComponent, wrapObject } from '../packages/core/src/index.js';
import { EntityImpl, createEntityId } from '../packages/core/src/ecs/Entity.js';
import { EventBusImpl } from '../packages/core/src/events/EventBus.js';

console.log('========================================');
console.log('DIAGNOSTICS HARNESS TEST');
console.log('========================================\n');

// Enable diagnostics
diagnosticsHarness.setEnabled(true);
diagnosticsHarness.clear();
console.log('✅ Diagnostics enabled\n');

// Test 1: Undefined property access on Entity
console.log('TEST 1: Undefined property on Entity');
console.log('--------------------------------------');
const eventBus = new EventBusImpl();
const entity = new EntityImpl(createEntityId(), eventBus);
const wrappedEntity = wrapEntity(entity);

try {
  // This should trigger a diagnostic issue
  const badValue = (wrappedEntity as any).nonExistentProperty;
  console.log('Accessed non-existent property (should be tracked)\n');
} catch (e) {
  console.error('Error:', e);
}

// Test 2: Undefined method call
console.log('TEST 2: Undefined method on Entity');
console.log('--------------------------------------');
try {
  const badMethod = (wrappedEntity as any).invalidMethod;
  console.log('Accessed non-existent method (should be tracked)\n');
} catch (e) {
  console.error('Error:', e);
}

// Test 3: Component with typo
console.log('TEST 3: Component property typo');
console.log('--------------------------------------');
const component = { type: 'position', x: 10, y: 20 };
const wrappedComp = wrapComponent(component, 'position', entity.id);

try {
  // Typo: "postion" instead of "position"
  const badField = (wrappedComp as any).z; // Non-existent field
  console.log('Accessed non-existent component field (should be tracked)\n');
} catch (e) {
  console.error('Error:', e);
}

// Test 4: Generic object with typo (should suggest correction)
console.log('TEST 4: Object with typo (should suggest correct property)');
console.log('--------------------------------------');
const testObj = {
  validMethod: () => 'test',
  anotherMethod: () => 'test2',
  propertyName: 'value'
};
const wrappedObj = wrapObject(testObj, 'TestObject', 'test-123');

try {
  // Typo: "valdMethod" instead of "validMethod"
  const typo = (wrappedObj as any).valdMethod;
  console.log('Accessed typo property (should suggest validMethod)\n');
} catch (e) {
  console.error('Error:', e);
}

// Test 5: Frequent access (deduplication test)
console.log('TEST 5: Frequent access (deduplication)');
console.log('--------------------------------------');
for (let i = 0; i < 10; i++) {
  const freq = (wrappedObj as any).frequentError;
}
console.log('Accessed same property 10 times (should deduplicate to count=10)\n');

// Display results
console.log('========================================');
console.log('DIAGNOSTICS RESULTS');
console.log('========================================\n');

const summary = diagnosticsHarness.getSummary();
console.log(`Total Unique Issues: ${summary.totalIssues}`);
console.log(`\nBy Type:`);
for (const [type, count] of Object.entries(summary.byType)) {
  console.log(`  ${type}: ${count} occurrences`);
}

console.log(`\nBy Severity:`);
for (const [severity, count] of Object.entries(summary.bySeverity)) {
  console.log(`  ${severity}: ${count} occurrences`);
}

console.log(`\n========================================`);
console.log('TOP ISSUES (by frequency)');
console.log('========================================\n');

const issues = diagnosticsHarness.getIssues();
for (const issue of issues) {
  console.log(`[${issue.type}] ${issue.objectType}.${issue.property}`);
  console.log(`  Count: ${issue.count}`);
  console.log(`  Severity: ${issue.severity}`);
  if (issue.context?.suggestions && issue.context.suggestions.length > 0) {
    console.log(`  Suggestions: ${issue.context.suggestions.join(', ')}`);
  }
  console.log('');
}

console.log('========================================');
console.log('Export JSON example:');
console.log('========================================');
const exportData = diagnosticsHarness.export();
console.log(exportData);

console.log('\n✅ Diagnostics test complete!');
console.log('\nNote: In the browser, use window.game.diagnostics.enable() to track real issues');
console.log('Then visit http://localhost:8766/admin → Diagnostics tab (after metrics server restart)');
