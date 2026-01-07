/**
 * Test script to verify LLM decisions are being made
 */

import { World } from '../packages/core/src/ecs/World.js';
import { AgentBrainSystem } from '../packages/core/src/systems/AgentBrainSystem.js';
import { LLMScheduler, LLMDecisionQueue } from '../packages/llm/src/index.js';
import { ScheduledDecisionProcessor } from '../packages/core/src/decision/ScheduledDecisionProcessor.js';
import { CT } from '../packages/core/src/components/index.js';

async function testLLMDecisions() {
  console.log('[Test] Creating world and systems...');

  const world = new World();
  const llmQueue = new LLMDecisionQueue();
  const scheduler = new LLMScheduler(llmQueue);
  const scheduledProcessor = new ScheduledDecisionProcessor(scheduler);

  // Create AgentBrainSystem with scheduler
  const brainSystem = new AgentBrainSystem(
    llmQueue,
    undefined,
    undefined,
    scheduledProcessor
  );

  // Create a test agent
  const agent = world.createEntity();
  agent.addComponent({
    type: CT.Agent,
    behavior: 'idle',
    behaviorState: {},
    useLLM: true,
    llmCooldown: 0,
    lastLLMRequest: 0,
    thinkInterval: 20,
    lastThinkTick: 0,
  });

  agent.addComponent({
    type: CT.Position,
    x: 50,
    y: 50,
    z: 0,
  });

  agent.addComponent({
    type: CT.Movement,
    vx: 0,
    vy: 0,
    vz: 0,
    speed: 2,
    isMoving: false,
  });

  agent.addComponent({
    type: CT.Identity,
    name: 'Test Agent',
    species: 'human',
    age: 25,
    gender: 'neutral',
  });

  agent.addComponent({
    type: CT.Needs,
    hunger: 0.8,
    energy: 0.8,
    temperature: 1.0,
  });

  console.log('[Test] Agent created with ID:', agent.id);
  console.log('[Test] Agent useLLM:', agent.getComponent(CT.Agent).useLLM);

  // Get initial metrics
  const initialMetrics = scheduler.getMetrics();
  console.log('[Test] Initial scheduler metrics:', initialMetrics);

  // Run brain system update
  console.log('[Test] Running brain system update (this should NOT make LLM call - sync only)...');
  world.tick = 20; // Make sure think interval is met
  brainSystem.update(world, [agent], 0);

  // Check metrics after sync update
  const afterSyncMetrics = scheduler.getMetrics();
  console.log('[Test] Metrics after sync update:', afterSyncMetrics);
  console.log('[Test] Total requests made:', afterSyncMetrics.totalRequests);

  if (afterSyncMetrics.totalRequests === 0) {
    console.log('\n❌ CONFIRMED: Sync process() method does NOT make LLM calls');
    console.log('   This is why agents are not making decisions!\n');
  }

  // Now try the async method directly
  console.log('[Test] Testing processAsync() directly...');
  try {
    const asyncResult = await scheduledProcessor.processAsync(
      agent as any,
      world,
      agent.getComponent(CT.Agent)
    );

    console.log('[Test] Async result:', asyncResult);

    const finalMetrics = scheduler.getMetrics();
    console.log('[Test] Final metrics after async call:', finalMetrics);
    console.log('[Test] Total requests made:', finalMetrics.totalRequests);

    if (finalMetrics.totalRequests > 0) {
      console.log('\n✅ CONFIRMED: processAsync() DOES make LLM calls');
      console.log('   AgentBrainSystem needs to use async method!\n');
    }
  } catch (error) {
    console.error('[Test] Async call failed:', error);
  }
}

testLLMDecisions().catch(console.error);
