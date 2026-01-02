/**
 * Test script demonstrating full save/load cycle
 * Creates a world with entities, saves it, loads it back, and verifies state
 */

import { WorldImpl } from '../packages/core/src/ecs/World.js';
import { EventBusImpl } from '../packages/core/src/events/EventBus.js';
import { SaveStateManager } from '../packages/core/src/persistence/SaveStateManager.js';
import { ComponentType as CT } from '../packages/core/src/types/ComponentType.js';

async function testSaveLoadCycle() {
  console.log('=== Save/Load Cycle Test ===\n');

  const saveManager = new SaveStateManager('saves');
  await saveManager.initialize();

  // Step 1: Create a world with some entities
  console.log('[1] Creating original world...');
  const eventBus1 = new EventBusImpl();
  const world1 = new WorldImpl(eventBus1);

  // Create a time entity
  const timeEntity = world1.createEntity();
  timeEntity.addComponent({
    type: CT.Time,
    version: 1,
    currentDay: 5,
    tickCount: 2400,
    ticksPerDay: 480,
  } as any);

  // Create 3 test agents
  for (let i = 0; i < 3; i++) {
    const agent = world1.createEntity();
    agent.addComponent({
      type: CT.Agent,
      version: 1,
      name: `TestAgent_${i}`,
      useLLM: false,
    } as any);
    agent.addComponent({
      type: CT.Position,
      version: 1,
      x: i * 10,
      y: i * 5,
      z: 0,
    } as any);
  }

  const agentCount1 = world1.query().with(CT.Agent).executeEntities().length;
  console.log(`   ✓ Created ${agentCount1} agents`);
  console.log(`   ✓ Time: Day ${timeEntity.getComponent(CT.Time)?.currentDay}, Tick ${timeEntity.getComponent(CT.Time)?.tickCount}\n`);

  // Step 2: Save the world
  console.log('[2] Saving world state...');
  const sessionId = 'save_load_test';
  const saveMetadata = await saveManager.saveState(world1, sessionId, {
    saveName: 'test_checkpoint',
    description: 'Test save with 3 agents on day 5',
  });
  console.log(`   ✓ Saved: ${saveMetadata.saveName}`);
  console.log(`   ✓ Day: ${saveMetadata.day}, Tick: ${saveMetadata.tick}`);
  console.log(`   ✓ Agent count: ${saveMetadata.agentCount}\n`);

  // Step 3: Load the save
  console.log('[3] Loading saved state...');
  const loadedState = await saveManager.loadState(sessionId, 'test_checkpoint');
  console.log(`   ✓ Loaded: ${loadedState.metadata.saveName}`);
  console.log(`   ✓ Timestamp: ${new Date(loadedState.metadata.timestamp).toISOString()}\n`);

  // Step 4: Restore world from save
  console.log('[4] Restoring world from save...');
  const world2 = await saveManager.restoreWorld(loadedState);

  const agentCount2 = world2.query().with(CT.Agent).executeEntities().length;
  const timeEntities2 = world2.query().with(CT.Time).executeEntities();
  const timeComp2 = timeEntities2[0]?.getComponent(CT.Time) as any;

  console.log(`   ✓ Restored ${agentCount2} agents`);
  console.log(`   ✓ Time: Day ${timeComp2?.currentDay}, Tick ${timeComp2?.tickCount}\n`);

  // Step 5: Verify data matches
  console.log('[5] Verifying restored state...');
  const agents2 = world2.query().with(CT.Agent).executeEntities();
  let allMatch = true;

  for (let i = 0; i < agents2.length; i++) {
    const agent = agents2[i];
    const agentComp = agent?.getComponent(CT.Agent) as any;
    const posComp = agent?.getComponent(CT.Position) as any;

    const expectedName = `TestAgent_${i}`;
    const expectedX = i * 10;
    const expectedY = i * 5;

    const nameMatch = agentComp?.name === expectedName;
    const posMatch = posComp?.x === expectedX && posComp?.y === expectedY;

    console.log(`   ${nameMatch && posMatch ? '✓' : '✗'} ${agentComp?.name} at (${posComp?.x}, ${posComp?.y})`);

    if (!nameMatch || !posMatch) {
      allMatch = false;
    }
  }

  console.log();

  if (allMatch && agentCount1 === agentCount2 && timeComp2?.currentDay === 5) {
    console.log('✅ SUCCESS: All data restored correctly!\n');
  } else {
    console.log('❌ FAILURE: Data mismatch detected!\n');
    process.exit(1);
  }

  // Step 6: List all saves for this session
  console.log('[6] Listing all saves...');
  const saves = await saveManager.listSaves(sessionId);
  console.log(`   Found ${saves.length} save(s):`);
  for (const save of saves) {
    console.log(`   - ${save.saveName}: Day ${save.day}, ${save.agentCount} agents, ${(save.size / 1024).toFixed(2)} KB`);
  }

  console.log('\n=== Save/Load Cycle Test Complete ===');
}

testSaveLoadCycle().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
