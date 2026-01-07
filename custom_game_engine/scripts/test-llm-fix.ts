/**
 * Test script to verify LLM decisions are actually being made after the fix
 */

import { WorldImpl } from '../packages/core/src/ecs/World.js';
import { AgentBrainSystem } from '../packages/core/src/systems/AgentBrainSystem.js';
import { LLMScheduler, LLMDecisionQueue } from '../packages/llm/src/index.js';
import { ScheduledDecisionProcessor } from '../packages/core/src/decision/ScheduledDecisionProcessor.js';
import { ComponentType as CT } from '../packages/core/src/types/ComponentType.js';
import { OpenAICompatProvider } from '../packages/llm/src/OpenAICompatProvider.js';
import { EventBusImpl } from '../packages/core/src/events/EventBus.js';

async function testLLMFix() {
  console.log('\n=== Testing LLM Decision Fix ===\n');

  // Create world and systems
  const eventBus = new EventBusImpl();
  const world = new WorldImpl(eventBus);

  // Initialize LLM provider
  const provider = new OpenAICompatProvider({
    apiKey: process.env.GROQ_API_KEY || '',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  });

  const llmQueue = new LLMDecisionQueue(provider, 2);
  const scheduler = new LLMScheduler(llmQueue);
  const scheduledProcessor = new ScheduledDecisionProcessor(scheduler, llmQueue);

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
    thinkInterval: 1,  // Think every tick for fast testing
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
    hunger: 0.9,  // High hunger (satisfied) - prevents autonomic override
    energy: 0.9,  // High energy (satisfied) - prevents autonomic override
    temperature: 1.0,
  });

  console.log(`[Test] Agent created: ${agent.id}`);
  console.log(`[Test] Agent useLLM: ${agent.getComponent(CT.Agent).useLLM}`);
  console.log(`[Test] Using scheduler: ${(brainSystem as any).useScheduler}\n`);

  // Get initial metrics
  const initialMetrics = scheduler.getMetrics();
  console.log('[Test] Initial scheduler metrics:', {
    totalRequests: initialMetrics.totalRequests,
    successfulCalls: initialMetrics.successfulCalls,
  });

  // Simulate game ticks
  console.log('\n[Test] Running 3 game ticks...\n');

  for (let i = 0; i < 3; i++) {
    // Manually increment tick (cast to any to bypass readonly private property)
    (world as any)._tick = i + 1;
    console.log(`[Test] Tick ${world.tick}:`);

    // Update brain system
    brainSystem.update(world, [agent], 0);

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check metrics
    const currentMetrics = scheduler.getMetrics();
    console.log(`  - Requests: ${currentMetrics.totalRequests}, Successful: ${currentMetrics.successfulCalls}`);

    // Check agent behavior
    const currentAgent = agent.getComponent(CT.Agent);
    console.log(`  - Agent behavior: ${currentAgent.behavior}`);
  }

  // Wait for pending LLM calls to complete
  console.log('\n[Test] Waiting 5 seconds for LLM responses...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Final metrics
  const finalMetrics = scheduler.getMetrics();
  console.log('[Test] Final scheduler metrics:', {
    totalRequests: finalMetrics.totalRequests,
    successfulCalls: finalMetrics.successfulCalls,
    failedCalls: finalMetrics.failedCalls,
    layerSelections: finalMetrics.layerSelections,
  });

  // Check final agent state
  const finalAgent = agent.getComponent(CT.Agent);
  console.log('\n[Test] Final agent state:', {
    behavior: finalAgent.behavior,
    behaviorState: finalAgent.behaviorState,
  });

  // Verify results
  console.log('\n=== Test Results ===\n');

  if (finalMetrics.totalRequests > 0) {
    console.log('✅ LLM requests were made!');
    console.log(`   Total requests: ${finalMetrics.totalRequests}`);
    console.log(`   Successful calls: ${finalMetrics.successfulCalls}`);

    if (finalMetrics.successfulCalls > 0) {
      console.log('✅ LLM calls completed successfully!');

      if (finalAgent.behavior !== 'idle') {
        console.log('✅ Agent behavior was updated by LLM!');
        console.log(`   New behavior: ${finalAgent.behavior}`);
      } else {
        console.log('⚠️  Agent behavior not changed (may still be on cooldown or idle was chosen)');
      }
    } else {
      console.log('❌ No successful LLM calls (check API key and network)');
    }
  } else {
    console.log('❌ NO LLM requests were made - fix did not work!');
  }

  console.log('\n=== Test Complete ===\n');
  process.exit(0);
}

testLLMFix().catch((error) => {
  console.error('\n[Test] Error:', error);
  process.exit(1);
});
