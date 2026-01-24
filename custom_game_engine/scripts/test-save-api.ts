/**
 * Test script for Save/Load/Fork API
 * Creates sample saves to test the HTTP API endpoints
 */

import { World } from '../packages/core/src/ecs/World.js';
import { EventBusImpl } from '../packages/core/src/events/EventBus.js';
import { SaveStateManager } from '../packages/core/src/persistence/SaveStateManager.js';

async function createTestSaves() {
  console.log('[Test] Creating sample saves for API testing...\n');

  const saveManager = new SaveStateManager('saves');
  await saveManager.initialize();

  // Create a simple test world
  const eventBus = new EventBusImpl();
  const world = new World(eventBus);

  // Create 3 test saves for session "test_game"
  const sessionId = 'test_game';

  console.log(`[Test] Creating saves for session: ${sessionId}`);

  // Save 1
  const save1 = await saveManager.saveState(world, sessionId, {
    saveName: 'checkpoint_1',
    description: 'First checkpoint - game start',
  });
  console.log(`✓ Created save: ${save1.saveName} (Day ${save1.day})`);

  // Save 2
  const save2 = await saveManager.saveState(world, sessionId, {
    saveName: 'checkpoint_2',
    description: 'Second checkpoint - midgame',
  });
  console.log(`✓ Created save: ${save2.saveName} (Day ${save2.day})`);

  // Save 3 (auto-increment)
  const save3 = await saveManager.saveState(world, sessionId, {
    description: 'Auto-numbered save',
    autoIncrement: true,
  });
  console.log(`✓ Created save: ${save3.saveName} (Day ${save3.day})`);

  console.log('\n[Test] Sample saves created successfully!');
  console.log('\nYou can now test the API with:');
  console.log('  curl "http://localhost:8766/api/saves?session=test_game"');
}

createTestSaves().catch(err => {
  console.error('[Test] Error:', err);
  process.exit(1);
});
