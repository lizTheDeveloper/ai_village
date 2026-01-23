/**
 * Resource Gathering Verification Script
 * Tracks whether agents can successfully find and gather resources after spatial indexing fix
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { HeadlessGameLoop } from './headless.js';

async function main() {
  console.log('=== RESOURCE GATHERING VERIFICATION ===\n');

  // Track resource gathering attempts
  const gatheringAttempts: Array<{
    tick: bigint;
    agentName: string;
    resourceType: string;
    success: boolean;
    distance?: number;
  }> = [];

  // Track inventory changes
  const inventoryChanges: Array<{
    tick: bigint;
    agentName: string;
    itemId: string;
    quantity: number;
  }> = [];

  const gameLoop = new HeadlessGameLoop();
  await gameLoop.start();

  // Hook into event bus to track gathering events
  (gameLoop.world.eventBus as any).on('resource:gathered', (event: any) => {
    const { agentName, resourceType, quantity } = event.data;
    gatheringAttempts.push({
      tick: gameLoop.world.tick,
      agentName,
      resourceType,
      success: true,
    });
    inventoryChanges.push({
      tick: gameLoop.world.tick,
      agentName,
      itemId: resourceType,
      quantity,
    });
  });

  (gameLoop.world.eventBus as any).on('behavior:gather_failed', (event: any) => {
    const { agentName, reason } = event.data;
    gatheringAttempts.push({
      tick: gameLoop.world.tick,
      agentName,
      resourceType: 'unknown',
      success: false,
    });
  });

  // Run for 5 minutes
  console.log('Running game for 5 minutes to verify resource gathering...\n');
  const startTime = Date.now();
  const duration = 5 * 60 * 1000; // 5 minutes

  let lastReport = Date.now();
  while (Date.now() - startTime < duration) {
    await gameLoop.tick(0.05);

    // Report every 60 seconds
    if (Date.now() - lastReport >= 60000) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const successfulGathers = gatheringAttempts.filter(a => a.success).length;
      const failedGathers = gatheringAttempts.filter(a => !a.success).length;
      console.log(`[${elapsed}s] Successful gathers: ${successfulGathers}, Failed: ${failedGathers}`);
      lastReport = Date.now();
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Final report
  console.log('\n=== VERIFICATION RESULTS ===\n');

  const successfulGathers = gatheringAttempts.filter(a => a.success);
  const failedGathers = gatheringAttempts.filter(a => !a.success);

  console.log(`Total gathering attempts: ${gatheringAttempts.length}`);
  console.log(`✓ Successful: ${successfulGathers.length}`);
  console.log(`✗ Failed: ${failedGathers.length}`);
  console.log(`Success rate: ${((successfulGathers.length / Math.max(gatheringAttempts.length, 1)) * 100).toFixed(1)}%\n`);

  if (successfulGathers.length > 0) {
    console.log('Sample successful gathers:');
    for (const gather of successfulGathers.slice(0, 5)) {
      console.log(`  - ${gather.agentName} gathered ${gather.resourceType} at tick ${gather.tick}`);
    }
  }

  if (inventoryChanges.length > 0) {
    console.log('\nInventory changes detected:');
    const byAgent = new Map<string, Map<string, number>>();
    for (const change of inventoryChanges) {
      if (!byAgent.has(change.agentName)) {
        byAgent.set(change.agentName, new Map());
      }
      const items = byAgent.get(change.agentName)!;
      items.set(change.itemId, (items.get(change.itemId) || 0) + change.quantity);
    }

    for (const [agentName, items] of byAgent.entries()) {
      const itemsList = Array.from(items.entries()).map(([id, qty]) => `${id}:${qty}`).join(', ');
      console.log(`  ${agentName}: ${itemsList}`);
    }
  }

  console.log('\n=== VERDICT ===');
  if (successfulGathers.length > 0) {
    console.log('✓ PASS: Agents can successfully find and gather resources!');
    console.log('  The spatial indexing fix is working correctly.');
  } else if (gatheringAttempts.length === 0) {
    console.log('⚠ INCONCLUSIVE: No gathering attempts detected.');
    console.log('  Agents may not have decided to gather yet.');
  } else {
    console.log('✗ FAIL: All gathering attempts failed.');
    console.log('  The spatial indexing issue may still exist.');
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
