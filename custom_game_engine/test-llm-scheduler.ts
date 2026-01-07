/**
 * Test script for LLM Scheduler
 *
 * Verifies the three-layer decision architecture coordination.
 */

import {
  GameLoop,
  EntityImpl,
  type World,
  BuildingBlueprintRegistry,
} from './packages/core/src/index.ts';
import { LLMScheduler, type LLMDecisionQueue } from './packages/llm/src/index.ts';

/**
 * Mock LLMDecisionQueue for testing
 */
class MockLLMDecisionQueue implements LLMDecisionQueue {
  private callCount = 0;
  private lastPrompt = '';

  async requestDecision(agentId: string, prompt: string): Promise<string> {
    this.callCount++;
    this.lastPrompt = prompt;
    return JSON.stringify({
      action: 'wander',
      thinking: 'Mock response from queue',
    });
  }

  getQueueSize(): number {
    return 0;
  }

  getActiveCount(): number {
    return 0;
  }

  getCallCount(): number {
    return this.callCount;
  }

  getLastPrompt(): string {
    return this.lastPrompt;
  }
}

// Create minimal world
const gameLoop = new GameLoop();
const world = gameLoop.world;

// Add building registry (required for ExecutorPromptBuilder)
const blueprintRegistry = new BuildingBlueprintRegistry();
blueprintRegistry.registerDefaults();
(world as any).buildingRegistry = blueprintRegistry;

// Create test agent
function createTestAgent(world: World, name: string): EntityImpl {
  const agent = world.createEntity() as EntityImpl;

  agent.addComponent({
    type: 'identity',
    name,
    species: 'human',
    version: 1,
  });

  agent.addComponent({
    type: 'personality',
    version: 1,
    openness: 0.7,
    conscientiousness: 0.6,
    extraversion: 0.8,
    agreeableness: 0.5,
    neuroticism: 0.3,
    curiosity: 0.7,
    courage: 0.6,
    spirituality: 0.5,
    competitiveness: 0.4,
    empathy: 0.6,
    assertiveness: 0.7,
  });

  agent.addComponent({
    type: 'needs',
    version: 1,
    hunger: 0.5,
    energy: 0.6,
    temperature: 0.7,
    socialDepth: 0.4,
    socialBreadth: 0.5,
  });

  agent.addComponent({
    type: 'vision',
    version: 1,
    range: 15,
    seenAgents: [],
    seenResources: [],
    seenPlants: [],
    heardSpeech: [],
    terrainDescription: 'You are in a grassy clearing.',
  });

  agent.addComponent({
    type: 'agent',
    version: 1,
    behavior: 'idle',
    behaviorState: {},
    useLLM: true,
    priorities: {
      gathering: 0.5,
      building: 0.3,
      farming: 0.2,
      social: 0.7,
    },
  });

  return agent;
}

console.log('='.repeat(80));
console.log('TESTING LLM SCHEDULER');
console.log('='.repeat(80));
console.log();

// Create mock queue and scheduler
const mockQueue = new MockLLMDecisionQueue();
const scheduler = new LLMScheduler(mockQueue);

console.log('✅ LLMScheduler created successfully');
console.log();

// Test 1: Layer selection for critical needs
console.log('Test 1: Layer Selection - Critical Needs');
console.log('-'.repeat(80));

const agentCritical = createTestAgent(world, 'TestAgentCritical');
const needsComp = agentCritical.components.get('needs') as any;
needsComp.hunger = 0.1; // Critical hunger
needsComp.energy = 0.8;

const selectionCritical = scheduler.selectLayer(agentCritical, world);
console.log(`Layer: ${selectionCritical.layer}`);
console.log(`Reason: ${selectionCritical.reason}`);
console.log(`Urgency: ${selectionCritical.urgency}`);

if (selectionCritical.layer === 'autonomic' && selectionCritical.urgency === 10) {
  console.log('✅ Correctly selected autonomic layer for critical needs');
} else {
  console.log('❌ Failed to select autonomic layer for critical needs');
}
console.log();

// Test 2: Layer selection for active conversation
console.log('Test 2: Layer Selection - Active Conversation');
console.log('-'.repeat(80));

const agentTalking = createTestAgent(world, 'TestAgentTalking');
const needsComp2 = agentTalking.components.get('needs') as any;
needsComp2.hunger = 0.8; // Not critical
needsComp2.energy = 0.8;

agentTalking.addComponent({
  type: 'conversation',
  version: 1,
  activeConversation: 'conv_123',
  participants: ['agent_1', 'agent_2'],
  messages: [],
  lastSpeakTime: Date.now(),
});

const selectionTalking = scheduler.selectLayer(agentTalking, world);
console.log(`Layer: ${selectionTalking.layer}`);
console.log(`Reason: ${selectionTalking.reason}`);
console.log(`Urgency: ${selectionTalking.urgency}`);

if (selectionTalking.layer === 'talker' && selectionTalking.urgency === 8) {
  console.log('✅ Correctly selected talker layer for active conversation');
} else {
  console.log('❌ Failed to select talker layer for active conversation');
}
console.log();

// Test 3: Layer selection for task completion
console.log('Test 3: Layer Selection - Task Completion');
console.log('-'.repeat(80));

const agentTaskComplete = createTestAgent(world, 'TestAgentTaskComplete');
const needsComp3 = agentTaskComplete.components.get('needs') as any;
needsComp3.hunger = 0.8;
needsComp3.energy = 0.8;

const agentComp = agentTaskComplete.components.get('agent') as any;
agentComp.behaviorCompleted = true;

const selectionTaskComplete = scheduler.selectLayer(agentTaskComplete, world);
console.log(`Layer: ${selectionTaskComplete.layer}`);
console.log(`Reason: ${selectionTaskComplete.reason}`);
console.log(`Urgency: ${selectionTaskComplete.urgency}`);

if (selectionTaskComplete.layer === 'executor' && selectionTaskComplete.urgency === 7) {
  console.log('✅ Correctly selected executor layer for task completion');
} else {
  console.log('❌ Failed to select executor layer for task completion');
}
console.log();

// Test 4: Layer selection for idle
console.log('Test 4: Layer Selection - Idle Agent');
console.log('-'.repeat(80));

const agentIdle = createTestAgent(world, 'TestAgentIdle');
const needsComp4 = agentIdle.components.get('needs') as any;
needsComp4.hunger = 0.8;
needsComp4.energy = 0.8;

const selectionIdle = scheduler.selectLayer(agentIdle, world);
console.log(`Layer: ${selectionIdle.layer}`);
console.log(`Reason: ${selectionIdle.reason}`);
console.log(`Urgency: ${selectionIdle.urgency}`);

if (selectionIdle.layer === 'executor' && selectionIdle.urgency === 5) {
  console.log('✅ Correctly selected executor layer for idle agent');
} else {
  console.log('❌ Failed to select executor layer for idle agent');
}
console.log();

// Test 5: Request decision (async)
console.log('Test 5: Request Decision');
console.log('-'.repeat(80));

const agentRequest = createTestAgent(world, 'TestAgentRequest');
const needsComp5 = agentRequest.components.get('needs') as any;
needsComp5.hunger = 0.1; // Critical - should select autonomic

try {
  const result = await scheduler.requestDecision(agentRequest, world);

  if (result) {
    console.log(`Layer selected: ${result.layer}`);
    console.log(`Reason: ${result.reason}`);
    console.log(`Response received: ${result.response.substring(0, 100)}...`);
    console.log(`Mock queue call count: ${mockQueue.getCallCount()}`);

    if (result.layer === 'autonomic' && mockQueue.getCallCount() === 1) {
      console.log('✅ Successfully requested decision via autonomic layer');
    } else {
      console.log('❌ Decision request failed');
    }
  } else {
    console.log('❌ Decision request returned null');
  }
} catch (error) {
  console.error('❌ Error requesting decision:', error);
}
console.log();

// Test 6: Cooldown enforcement
console.log('Test 6: Cooldown Enforcement');
console.log('-'.repeat(80));

const agentCooldown = createTestAgent(world, 'TestAgentCooldown');
const needsComp6 = agentCooldown.components.get('needs') as any;
needsComp6.hunger = 0.1; // Critical

try {
  // First request should succeed
  const result1 = await scheduler.requestDecision(agentCooldown, world);
  console.log(`First request: ${result1 ? 'success' : 'null'}`);

  // Immediate second request should be blocked by cooldown
  const result2 = await scheduler.requestDecision(agentCooldown, world);
  console.log(`Second request (immediate): ${result2 ? 'success' : 'null (cooldown)'}`);

  if (result1 && !result2) {
    console.log('✅ Cooldown enforcement working correctly');
  } else {
    console.log('❌ Cooldown enforcement not working');
  }
} catch (error) {
  console.error('❌ Error testing cooldown:', error);
}
console.log();

// Test 7: Check time until ready
console.log('Test 7: Time Until Ready');
console.log('-'.repeat(80));

const timeUntilReady = scheduler.getTimeUntilReady(agentCooldown.id, 'autonomic');
console.log(`Time until autonomic ready: ${timeUntilReady}ms`);

if (timeUntilReady > 0 && timeUntilReady <= 1000) {
  console.log('✅ Time until ready calculation working');
} else {
  console.log('❌ Time until ready calculation incorrect');
}
console.log();

// Test 8: Layer configuration
console.log('Test 8: Layer Configuration');
console.log('-'.repeat(80));

const autonomicConfig = scheduler.getLayerConfig('autonomic');
const talkerConfig = scheduler.getLayerConfig('talker');
const executorConfig = scheduler.getLayerConfig('executor');

console.log('Autonomic config:', autonomicConfig);
console.log('Talker config:', talkerConfig);
console.log('Executor config:', executorConfig);

if (
  autonomicConfig.cooldownMs === 1000 &&
  talkerConfig.cooldownMs === 5000 &&
  executorConfig.cooldownMs === 10000
) {
  console.log('✅ Layer configurations correct');
} else {
  console.log('❌ Layer configurations incorrect');
}
console.log();

// Test 9: Reset cooldowns
console.log('Test 9: Reset Cooldowns');
console.log('-'.repeat(80));

scheduler.resetCooldowns(agentCooldown.id, 'autonomic');
const isReady = scheduler.isLayerReady(agentCooldown.id, 'autonomic');
console.log(`After reset, is autonomic ready? ${isReady}`);

if (isReady) {
  console.log('✅ Reset cooldowns working correctly');
} else {
  console.log('❌ Reset cooldowns not working');
}
console.log();

console.log('='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
