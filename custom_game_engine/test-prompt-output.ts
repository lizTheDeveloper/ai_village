/**
 * Test script to inspect what the Executor prompt actually looks like
 */

import { EntityImpl, WorldImpl } from './packages/core/src/index.js';
import { ExecutorPromptBuilder } from './packages/llm/src/ExecutorPromptBuilder.js';

// Create minimal test world
const world = new WorldImpl();

// Create test agent with vision of resources
const agent = new EntityImpl('test-agent', 0);

// Add required components
agent.addComponent({
  type: 'identity',
  name: 'Test Agent',
  race: 'human',
  gender: 'male',
  profession: 'wanderer',
});

agent.addComponent({
  type: 'agent',
  behavior: 'idle',
  behaviorState: {},
  useLLM: true,
});

agent.addComponent({
  type: 'position',
  x: 100,
  y: 100,
  z: 0,
});

agent.addComponent({
  type: 'needs',
  hunger: 0.8,
  energy: 0.7,
  temperature: 0.9,
});

// Create some resources in world
const berry1 = new EntityImpl('berry-1', 0);
berry1.addComponent({ type: 'position', x: 102, y: 102, z: 0 });
berry1.addComponent({ type: 'resource', resourceType: 'berry', amount: 1 });
(world as any)._entities.set(berry1.id, berry1);

const berry2 = new EntityImpl('berry-2', 0);
berry2.addComponent({ type: 'position', x: 103, y: 101, z: 0 });
berry2.addComponent({ type: 'resource', resourceType: 'berry', amount: 1 });
(world as any)._entities.set(berry2.id, berry2);

const wood1 = new EntityImpl('wood-1', 0);
wood1.addComponent({ type: 'position', x: 101, y: 103, z: 0 });
wood1.addComponent({ type: 'resource', resourceType: 'wood', amount: 1 });
(world as any)._entities.set(wood1.id, wood1);

// Add vision component showing these resources
agent.addComponent({
  type: 'vision',
  seenResources: ['berry-1', 'berry-2', 'wood-1'],
  seenPlants: [],
  seenAgents: [],
  seenBuildings: [],
  terrainDescription: 'grassy field',
});

(world as any)._entities.set(agent.id, agent);

// Build prompt
const builder = new ExecutorPromptBuilder();
const prompt = builder.buildPrompt(agent as any, world);

console.log('=== EXECUTOR PROMPT TEST ===\n');
console.log(prompt);
console.log('\n=== END PROMPT ===');

// Now test with NO resources
const agent2 = new EntityImpl('test-agent-2', 0);
agent2.addComponent({
  type: 'identity',
  name: 'Test Agent 2',
  race: 'human',
  gender: 'female',
  profession: 'wanderer',
});

agent2.addComponent({
  type: 'agent',
  behavior: 'idle',
  behaviorState: {},
  useLLM: true,
});

agent2.addComponent({
  type: 'position',
  x: 200,
  y: 200,
  z: 0,
});

agent2.addComponent({
  type: 'needs',
  hunger: 0.8,
  energy: 0.7,
  temperature: 0.9,
});

agent2.addComponent({
  type: 'vision',
  seenResources: [],
  seenPlants: [],
  seenAgents: [],
  seenBuildings: [],
  terrainDescription: 'empty grassland',
});

const prompt2 = builder.buildPrompt(agent2 as any, world);

console.log('\n\n=== EXECUTOR PROMPT TEST (NO RESOURCES) ===\n');
console.log(prompt2);
console.log('\n=== END PROMPT ===');
