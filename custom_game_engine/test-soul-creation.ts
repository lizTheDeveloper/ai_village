/**
 * Integration test for Soul Creation System
 *
 * This script runs the soul creation ceremony in isolation and prints
 * the conversation between the Three Fates (Weaver, Spinner, Cutter).
 *
 * Run with: npx tsx test-soul-creation.ts
 */

import 'dotenv/config';
import { World } from './packages/core/src/ecs/World.js';
import { EventBusImpl } from './packages/core/src/events/EventBus.js';
import { SoulCreationSystem } from './packages/core/src/systems/SoulCreationSystem.js';
import { OpenAICompatProvider } from './packages/llm/src/OpenAICompatProvider.js';
import type { SoulCreationContext } from './packages/core/src/divinity/SoulCreationCeremony.js';

async function main() {
  console.log('='.repeat(80));
  console.log('SOUL CREATION CEREMONY TEST');
  console.log('='.repeat(80));
  console.log();

  // Create minimal world
  const eventBus = new EventBusImpl();
  const world = new World(eventBus);

  // Create soul creation system
  const soulSystem = new SoulCreationSystem();

  // Set up LLM provider (Groq with llama-3.3-70b-versatile)
  const apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) {
    console.error('ERROR: GROQ_API_KEY environment variable not set');
    process.exit(1);
  }

  const llmProvider = new OpenAICompatProvider(
    'llama-3.3-70b-versatile',
    'https://api.groq.com/openai/v1',
    apiKey
  );
  soulSystem.setLLMProvider(llmProvider);
  soulSystem.setUseLLM(true);

  console.log('📋 LLM Provider: Groq (llama-3.3-70b-versatile)');
  console.log('🌐 LLM Base URL: https://api.groq.com/openai/v1');
  console.log();

  // Listen to ceremony events
  const transcript: Array<{ speaker: string; text: string; topic: string }> = [];

  eventBus.subscribe('soul:ceremony_started', (event) => {
    console.log('🌟 CEREMONY BEGINS');
    console.log('   Context:', event.data.context);
    console.log();
  });

  eventBus.subscribe('soul:fate_speaks', (event) => {
    const speaker = event.data.speaker;
    const symbol = speaker === 'weaver' ? '🧵' : speaker === 'spinner' ? '🌀' : '✂️';
    const speakerName = speaker.toUpperCase();

    console.log(`${symbol} ${speakerName}:`);
    console.log(`   "${event.data.text}"`);
    console.log(`   [Topic: ${event.data.topic}]`);
    console.log();

    transcript.push({
      speaker: speakerName,
      text: event.data.text,
      topic: event.data.topic,
    });
  });

  eventBus.subscribe('soul:ceremony_complete', (event) => {
    console.log('✨ CEREMONY COMPLETE');
    console.log();
    console.log('📜 SOUL ATTRIBUTES:');
    console.log('   Purpose:', event.data.purpose);
    console.log('   Interests:', event.data.interests.join(', '));
    console.log('   Destiny:', event.data.destiny);
    console.log('   Archetype:', event.data.archetype);
    console.log();
    console.log('='.repeat(80));
  });

  // Define context for soul creation
  const context: SoulCreationContext = {
    culture: 'The First Village',
    cosmicAlignment: 0.6, // Slightly blessed
    isReforging: false,
    ceremonyRealm: 'tapestry_of_fate',
    worldEvents: ['The first village is being founded', 'Spring has just begun'],
  };

  // Request soul creation
  console.log('🎭 Requesting soul creation for a founding villager...');
  console.log();

  const soulCreated = new Promise<string>((resolve) => {
    soulSystem.requestSoulCreation(context, (soulEntityId) => {
      resolve(soulEntityId);
    });
  });

  // Run the system until ceremony completes
  let ticks = 0;
  const maxTicks = 100; // Prevent infinite loop

  while (ticks < maxTicks) {
    soulSystem.update(world as any, [], 1);

    // Wait a bit for async LLM calls
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if ceremony is complete
    if (soulSystem.getPendingCeremoniesCount() === 0) {
      break;
    }

    ticks++;
  }

  // Wait for soul creation to complete
  const soulId = await soulCreated;

  console.log('Soul Entity ID:', soulId);
  console.log();

  // Get the created soul entity
  const soul = world.getEntity(soulId);
  if (soul) {
    const soulIdentity = soul.components.get('soul_identity');
    const incarnation = soul.components.get('incarnation');
    const creationEvent = soul.components.get('soul_creation_event');

    console.log('📊 DETAILED SOUL INSPECTION:');
    console.log();
    console.log('Soul Identity Component:');
    console.log(JSON.stringify(soulIdentity, null, 2));
    console.log();
    console.log('Incarnation Component:');
    console.log(JSON.stringify(incarnation, null, 2));
    console.log();
    console.log('Creation Event Component:');
    console.log(JSON.stringify(creationEvent, null, 2));
  }

  console.log();
  console.log('='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

// Run the test
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
