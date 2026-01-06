/**
 * Test script for TalkerPromptBuilder and ExecutorPromptBuilder
 *
 * Runs without a full game to verify the prompt builders work correctly.
 */

import { GameLoop, EntityImpl, type World, BuildingBlueprintRegistry } from './packages/core/src/index.ts';
import { TalkerPromptBuilder, ExecutorPromptBuilder } from './packages/llm/src/index.ts';

// Create minimal world
const gameLoop = new GameLoop();
const world = gameLoop.world;

// Add building registry (required for ExecutorPromptBuilder)
const blueprintRegistry = new BuildingBlueprintRegistry();
blueprintRegistry.registerDefaults(); // Register some default buildings
(world as any).buildingRegistry = blueprintRegistry;

// Create minimal agent entity with required components
const agent = world.createEntity() as EntityImpl;

agent.addComponent({
  type: 'identity',
  name: 'TestAgent',
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

// Create a proper GoalsComponent instance with new structure
const goalsComponent = {
  type: 'goals',
  goals: [
    {
      id: 'goal_1',
      category: 'security' as const,
      description: 'Find food',
      motivation: 'To survive and thrive',
      progress: 0.3,
      milestones: [],
      createdAt: Date.now(),
      targetCompletionDays: 1,
      completed: false,
    },
    {
      id: 'goal_2',
      category: 'social' as const,
      description: 'Make friends',
      motivation: 'To build a community',
      progress: 0.1,
      milestones: [],
      createdAt: Date.now(),
      targetCompletionDays: 7,
      completed: false,
    },
  ],
};
agent.addComponent(goalsComponent);

agent.addComponent({
  type: 'episodic_memory',
  version: 1,
  memories: [
    {
      event: 'met_agent',
      description: 'Met a friendly stranger named Bob',
      timestamp: Date.now() - 3600000,
      importance: 0.7,
      location: { x: 0, y: 0 },
    },
  ],
});

console.log('='.repeat(80));
console.log('TESTING TALKER PROMPT BUILDER');
console.log('='.repeat(80));
console.log();

try {
  const talkerBuilder = new TalkerPromptBuilder();
  const talkerPrompt = talkerBuilder.buildPrompt(agent, world);

  console.log('✅ TalkerPromptBuilder successfully generated prompt');
  console.log();
  console.log('First 1000 characters:');
  console.log('-'.repeat(80));
  console.log(talkerPrompt.substring(0, 1000));
  console.log();
  console.log(`Total prompt length: ${talkerPrompt.length} characters`);
  console.log();

  // Check for expected sections
  const expectedSections = [
    '--- Social Context ---',
    '--- Environment ---',
    'What You Can Do:',
  ];

  for (const section of expectedSections) {
    if (talkerPrompt.includes(section)) {
      console.log(`✅ Contains section: "${section}"`);
    } else {
      console.log(`❌ Missing section: "${section}"`);
    }
  }
} catch (error) {
  console.error('❌ TalkerPromptBuilder failed:');
  console.error(error);
}

console.log();
console.log('='.repeat(80));
console.log('TESTING EXECUTOR PROMPT BUILDER');
console.log('='.repeat(80));
console.log();

try {
  const executorBuilder = new ExecutorPromptBuilder();
  const executorPrompt = executorBuilder.buildPrompt(agent, world);

  console.log('✅ ExecutorPromptBuilder successfully generated prompt');
  console.log();
  console.log('First 1000 characters:');
  console.log('-'.repeat(80));
  console.log(executorPrompt.substring(0, 1000));
  console.log();
  console.log(`Total prompt length: ${executorPrompt.length} characters`);
  console.log();

  // Check for expected sections
  const expectedSections = [
    'Your Goals:',
    'What You Can Do:',
    'set_priorities',
    'plan_build',
  ];

  for (const section of expectedSections) {
    if (executorPrompt.includes(section)) {
      console.log(`✅ Contains section: "${section}"`);
    } else {
      console.log(`❌ Missing section: "${section}"`);
    }
  }
} catch (error) {
  console.error('❌ ExecutorPromptBuilder failed:');
  console.error(error);
}

console.log();
console.log('='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
