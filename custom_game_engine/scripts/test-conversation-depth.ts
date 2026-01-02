/**
 * Conversation Depth Inspection Script
 *
 * Tests Phase 5: LLM Prompt Integration by running actual conversations
 * with different age/interest combinations and inspecting the LLM outputs.
 *
 * Run with: npx tsx scripts/test-conversation-depth.ts
 */

import { World } from '../packages/core/src/ecs/World.js';
import { EntityImpl } from '../packages/core/src/ecs/Entity.js';
import { ComponentType as CT } from '../packages/core/src/types/ComponentType.js';
import type { AgeCategory } from '../packages/core/src/components/AgentComponent.js';
import type { TopicId } from '../packages/core/src/components/InterestsComponent.js';
import { createInterestsComponent } from '../packages/core/src/components/InterestsComponent.js';
import { StructuredPromptBuilder } from '../packages/llm/src/StructuredPromptBuilder.js';
import { OpenAICompatProvider } from '../packages/llm/src/OpenAICompatProvider.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test scenarios combining different ages and interests.
 */
const scenarios = [
  {
    name: 'Child asks Elder about Death',
    agent1: {
      name: 'Little Timmy',
      age: 'child' as AgeCategory,
      interests: [
        { topic: 'the_gods' as TopicId, intensity: 0.7, discussionHunger: 0.8, source: 'question' as const, question: 'What happens when we die?' },
      ],
    },
    agent2: {
      name: 'Elder Sage',
      age: 'elder' as AgeCategory,
      interests: [
        { topic: 'mortality' as TopicId, intensity: 0.9, discussionHunger: 0.3, source: 'personality' as const },
        { topic: 'the_gods' as TopicId, intensity: 0.8, discussionHunger: 0.2, source: 'personality' as const },
      ],
    },
    initialMessage: 'Hello, Elder Sage. Can I ask you something?',
  },
  {
    name: 'Teen challenges Adult',
    agent1: {
      name: 'Rebellious Riley',
      age: 'teen' as AgeCategory,
      interests: [
        { topic: 'friendship' as TopicId, intensity: 0.9, discussionHunger: 0.7, source: 'social' as const },
        { topic: 'right_and_wrong' as TopicId, intensity: 0.6, discussionHunger: 0.8, source: 'question' as const, question: 'Why do the elders make all the rules?' },
      ],
    },
    agent2: {
      name: 'Builder Marcus',
      age: 'adult' as AgeCategory,
      interests: [
        { topic: 'building' as TopicId, intensity: 0.8, discussionHunger: 0.2, source: 'skill' as const },
        { topic: 'work' as TopicId, intensity: 0.7, discussionHunger: 0.4, source: 'skill' as const },
      ],
    },
    initialMessage: `I don't get why we have to do it the old way.`,
  },
  {
    name: 'Elders discuss Philosophy',
    agent1: {
      name: 'Wise Willow',
      age: 'elder' as AgeCategory,
      interests: [
        { topic: 'meaning_of_life' as TopicId, intensity: 0.9, discussionHunger: 0.9, source: 'personality' as const },
        { topic: 'afterlife' as TopicId, intensity: 0.8, discussionHunger: 0.7, source: 'personality' as const },
      ],
    },
    agent2: {
      name: 'Elder Oak',
      age: 'elder' as AgeCategory,
      interests: [
        { topic: 'fate_and_destiny' as TopicId, intensity: 0.9, discussionHunger: 0.8, source: 'personality' as const },
        { topic: 'meaning_of_life' as TopicId, intensity: 0.7, discussionHunger: 0.6, source: 'personality' as const },
      ],
    },
    initialMessage: 'I have been pondering the nature of purpose lately.',
  },
  {
    name: 'Adults share Craft Knowledge',
    agent1: {
      name: 'Farmer Fiona',
      age: 'adult' as AgeCategory,
      interests: [
        { topic: 'farming' as TopicId, intensity: 0.9, discussionHunger: 0.5, source: 'skill' as const },
        { topic: 'plants' as TopicId, intensity: 0.7, discussionHunger: 0.6, source: 'skill' as const },
      ],
    },
    agent2: {
      name: 'Cook Clara',
      age: 'adult' as AgeCategory,
      interests: [
        { topic: 'cooking' as TopicId, intensity: 0.9, discussionHunger: 0.4, source: 'skill' as const },
        { topic: 'food' as TopicId, intensity: 0.8, discussionHunger: 0.7, source: 'practical' as const },
      ],
    },
    initialMessage: 'The harvest was good this season.',
  },
];

/**
 * Create a test agent with specified properties.
 */
function createTestAgent(
  world: World,
  name: string,
  ageCategory: AgeCategory,
  interests: Array<{ topic: TopicId; intensity: number; discussionHunger: number; source: string; question?: string }>
): EntityImpl {
  const agent = new EntityImpl(world);

  // Identity
  agent.addComponent({
    type: CT.Identity,
    name,
    appearance: `A ${ageCategory}`,
  });

  // Agent
  agent.addComponent({
    type: CT.Agent,
    behavior: 'talk',
    behaviorState: {},
    thinkInterval: 100,
    lastThinkTick: 0,
    useLLM: true,
    llmCooldown: 0,
    ageCategory,
    birthTick: 0,
  });

  // Interests with discussion hunger
  const interestsComponent = createInterestsComponent();
  interestsComponent.interests = interests.map((i: any) => ({
    topic: i.topic,
    intensity: i.intensity,
    discussionHunger: i.discussionHunger,
    lastDiscussed: 0,
    source: i.source,
    knownEnthusiasts: [],
    ...(i.question ? { question: i.question } : {}),
  }));
  // Set depth hunger based on highest discussion hunger
  interestsComponent.depthHunger = Math.max(...interests.map(i => i.discussionHunger));
  agent.addComponent(interestsComponent);

  // Personality
  agent.addComponent({
    type: CT.Personality,
    openness: 0.7,
    conscientiousness: 0.6,
    extraversion: 0.5,
    agreeableness: 0.7,
    neuroticism: 0.4,
    workEthic: 0.6,
    creativity: 0.5,
    generosity: 0.6,
    leadership: 0.5,
    spirituality: ageCategory === 'elder' ? 0.8 : 0.5,
  });

  // Conversation
  agent.addComponent({
    type: CT.Conversation,
    partnerId: null,
    messages: [],
    maxMessages: 20,
    startedAt: 0,
    lastMessageAt: 0,
    isActive: false,
  });

  // Position (required for entity)
  agent.addComponent({
    type: CT.Position,
    x: 0,
    y: 0,
  });

  return agent;
}

/**
 * Run a single conversation scenario.
 */
async function runScenario(scenario: typeof scenarios[0], provider: OpenAICompatProvider) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SCENARIO: ${scenario.name}`);
  console.log(`${'='.repeat(80)}\n`);

  const world = new World({ gameId: 'test', seed: 123 });

  // Create agents
  const agent1 = createTestAgent(
    world,
    scenario.agent1.name,
    scenario.agent1.age,
    scenario.agent1.interests
  );
  const agent2 = createTestAgent(
    world,
    scenario.agent2.name,
    scenario.agent2.age,
    scenario.agent2.interests
  );

  // Start conversation
  const conv1 = agent1.components.get(CT.Conversation);
  const conv2 = agent2.components.get(CT.Conversation);

  if (conv1 && conv2) {
    conv1.isActive = true;
    conv1.partnerId = agent2.id;
    conv1.startedAt = world.tick;

    conv2.isActive = true;
    conv2.partnerId = agent1.id;
    conv2.startedAt = world.tick;

    // Agent1 speaks first
    conv1.messages.push({
      speakerId: agent1.id,
      message: scenario.initialMessage,
      tick: world.tick,
    });
    conv2.messages.push({
      speakerId: agent1.id,
      message: scenario.initialMessage,
      tick: world.tick,
    });
  }

  // Build and show prompt for agent2's response
  const promptBuilder = new StructuredPromptBuilder();
  const fullPrompt = promptBuilder.buildPrompt(agent2, world);

  console.log(`PROMPT FOR ${scenario.agent2.name}:`);
  console.log(`${'-'.repeat(80)}`);
  console.log(fullPrompt);
  console.log(`${'-'.repeat(80)}\n`);

  // Get LLM response
  try {
    console.log(`GETTING RESPONSE FROM GROQ...\n`);
    const response = await provider.generateResponse(fullPrompt);

    console.log(`${scenario.agent2.name}'S RESPONSE:`);
    console.log(`${'-'.repeat(80)}`);
    console.log(JSON.stringify(response, null, 2));
    console.log(`${'-'.repeat(80)}\n`);

    // Extract speaking text if available
    if (response.speaking) {
      console.log(`SPOKEN TEXT: "${response.speaking}"\n`);
    }
  } catch (error) {
    console.error(`ERROR: Failed to get LLM response:`, error);
  }
}

/**
 * Main execution.
 */
async function main() {
  console.log(`\n${'#'.repeat(80)}`);
  console.log(`CONVERSATION DEPTH INSPECTION - Phase 5 Test`);
  console.log(`${'#'.repeat(80)}\n`);

  // Check for Groq API key
  if (!process.env.GROQ_API_KEY) {
    console.error('ERROR: GROQ_API_KEY not found in environment variables.');
    console.error('Please add it to your .env file.');
    process.exit(1);
  }

  // Initialize Groq provider (OpenAI-compatible)
  const provider = new OpenAICompatProvider({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile', // Fast and good for conversation
  });

  // Run each scenario
  for (const scenario of scenarios) {
    await runScenario(scenario, provider);

    // Small delay between scenarios
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'#'.repeat(80)}`);
  console.log(`INSPECTION COMPLETE`);
  console.log(`${'#'.repeat(80)}\n`);
}

main().catch(console.error);
