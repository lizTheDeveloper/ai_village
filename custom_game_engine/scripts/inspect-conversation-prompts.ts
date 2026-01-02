/**
 * Conversation Prompt Inspection Script
 *
 * Shows the enhanced conversation prompts with age-based styles and interests.
 * This demonstrates Phase 5 without requiring a full build or LLM calls.
 *
 * Run with: npx tsx scripts/inspect-conversation-prompts.ts
 */

import { World } from '../packages/core/src/ecs/World.js';
import { EntityImpl } from '../packages/core/src/ecs/Entity.js';
import { ComponentType as CT } from '../packages/core/src/types/ComponentType.js';
import type { AgeCategory } from '../packages/core/src/components/AgentComponent.js';
import type { TopicId } from '../packages/core/src/components/InterestsComponent.js';
import { createInterestsComponent } from '../packages/core/src/components/InterestsComponent.js';
import { StructuredPromptBuilder } from '../packages/llm/src/StructuredPromptBuilder.js';

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
    expectedBehavior: 'Elder should give wise, patient answer about death. Should show depth capacity difference.',
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
    expectedBehavior: 'Adult should try to guide teen while respecting their questioning nature. No shared interests creates tension.',
  },
  {
    name: 'Elders discuss Philosophy - Shared Interests!',
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
    expectedBehavior: 'Deep philosophical exchange. Should show shared interest in meaning_of_life. High depth capacity.',
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
 * Run a single conversation scenario and show the prompt.
 */
function inspectScenario(scenario: typeof scenarios[0]) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SCENARIO: ${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Expected: ${scenario.expectedBehavior}\n`);

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

  console.log(`ENHANCED PROMPT FOR ${scenario.agent2.name} (${scenario.agent2.age}):`);
  console.log(`${'-'.repeat(80)}`);
  console.log(fullPrompt);
  console.log(`${'-'.repeat(80)}\n`);

  // Highlight key Phase 5 features in the prompt
  console.log(`KEY PHASE 5 FEATURES IN PROMPT:`);
  if (fullPrompt.includes('Conversation Style')) {
    console.log(`✓ Age-based conversation style included`);
  }
  if (fullPrompt.includes('Shared Interests')) {
    console.log(`✓ Shared interests detected and highlighted`);
  }
  if (fullPrompt.includes(`You'd Like to Discuss`) || fullPrompt.includes(`wondering`)) {
    console.log(`✓ Discussion hunger and questions included`);
  }
  if (fullPrompt.includes('craving a meaningful conversation')) {
    console.log(`✓ Depth hunger indicator present`);
  }
  if (fullPrompt.includes('interested in:')) {
    console.log(`✓ Partner interests shown`);
  }
  console.log('');
}

/**
 * Main execution.
 */
function main() {
  console.log(`\n${'#'.repeat(80)}`);
  console.log(`CONVERSATION PROMPT INSPECTION - Phase 5`);
  console.log(`Demonstrates enhanced conversation context with:
  - Age-based conversation styles (child/teen/adult/elder)
  - Shared interests detection
  - Discussion hunger and depth craving
  - Partner context and relationship info`);
  console.log(`${'#'.repeat(80)}\n`);

  // Run each scenario
  for (const scenario of scenarios) {
    inspectScenario(scenario);
  }

  console.log(`\n${'#'.repeat(80)}`);
  console.log(`INSPECTION COMPLETE`);
  console.log(`\nNext Steps:
  - Run actual game to see these prompts drive LLM conversations
  - Check conversation quality metrics after conversations end
  - Observe if shared interests lead to deeper exchanges`);
  console.log(`${'#'.repeat(80)}\n`);
}

main();
