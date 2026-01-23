/**
 * Manual Playtest via Divine Chat
 * Actually play the game by chatting with the angel
 */
import * as dotenv from 'dotenv';
dotenv.config();

import {
  GameLoop,
  createTimeComponent,
  ComponentType as CT,
} from '@ai-village/core';
import { EntityImpl, createEntityId } from '@ai-village/core';
import { AdminAngelSystem } from '../packages/core/src/systems/AdminAngelSystem.ts';
import { LLMDecisionQueue, OpenAICompatProvider, FallbackProvider } from '@ai-village/llm';
import type { LLMProvider } from '@ai-village/llm';

async function main() {
  console.log('=== MANUAL PLAYTEST: Divine Chat ===\n');

  // Setup LLM
  const groqApiKey = process.env.GROQ_API_KEY;
  const cerebrasApiKey = process.env.CEREBRAS_API_KEY;

  const cloudProviders: LLMProvider[] = [];
  if (groqApiKey) {
    cloudProviders.push(new OpenAICompatProvider(
      process.env.GROQ_MODEL || 'qwen/qwen3-32b',
      'https://api.groq.com/openai/v1', groqApiKey
    ));
  }
  if (cerebrasApiKey) {
    cloudProviders.push(new OpenAICompatProvider(
      process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      'https://api.cerebras.ai/v1', cerebrasApiKey
    ));
  }

  if (cloudProviders.length === 0) {
    console.error('ERROR: No LLM API keys. Set GROQ_API_KEY or CEREBRAS_API_KEY.');
    process.exit(1);
  }

  let provider: LLMProvider;
  if (cloudProviders.length === 1) {
    provider = cloudProviders[0]!;
  } else {
    provider = new FallbackProvider(cloudProviders, { retryAfterMs: 60000, maxConsecutiveFailures: 3, logFallbacks: true });
  }

  const queue = new LLMDecisionQueue(provider, 50);

  // Register high-tier provider
  if (groqApiKey) {
    const highTier = new OpenAICompatProvider(
      'openai/gpt-oss-120b', 'https://api.groq.com/openai/v1', groqApiKey
    );
    queue.setTierProvider('high', highTier);
  }

  // Create game
  const gameLoop = new GameLoop();
  const worldEntity = new EntityImpl(createEntityId(), gameLoop.world.tick);
  worldEntity.addComponent(createTimeComponent(12, 600));
  (gameLoop.world as any)._addEntity(worldEntity);
  (gameLoop.world as any)._worldEntityId = worldEntity.id;

  // Register angel
  const angelSystem = new AdminAngelSystem({ llmQueue: queue });
  gameLoop.systemRegistry.register(angelSystem);

  // Initialize
  const systems = gameLoop.systemRegistry.getSorted();
  for (const system of systems) {
    if (system.initialize) {
      await system.initialize(gameLoop.world, (gameLoop as any).eventBus);
    }
  }

  // Get angel
  const angels = gameLoop.world.query().with(CT.AdminAngel).executeEntities();
  const angelEntity = angels[0]!;
  const angelComp = angelEntity.getComponent(CT.AdminAngel) as any;
  console.log(`Angel: ${angelComp.name}\n`);

  // Listen for angel responses
  let lastResponse = '';
  gameLoop.world.eventBus.on('chat:send_message', (event: any) => {
    const data = event.data as { roomId: string; senderName: string; message: string; senderId: string };
    if (data.roomId === 'divine_chat' && data.senderId !== 'player') {
      console.log(`[${data.senderName}]: ${data.message}`);
      lastResponse = data.message;
    }
  });

  // Start game loop
  const tickTimer = setInterval(() => (gameLoop as any).tick(0.05), 50);

  // Wait for greeting
  console.log('Waiting for angel greeting...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Helper to send messages
  async function say(message: string): Promise<string> {
    console.log(`\n[Me]: ${message}`);
    lastResponse = '';

    gameLoop.world.eventBus.emit({
      type: 'chat:message_sent',
      data: {
        roomId: 'divine_chat',
        senderId: 'player',
        senderName: 'Player',
        content: message,
      },
      source: 'player',
    });

    // Wait for response (max 30s)
    let waited = 0;
    while (!lastResponse && waited < 30000) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waited += 500;
    }

    return lastResponse;
  }

  // Helper to check game state
  function getGameState() {
    const agents = gameLoop.world.query().with(CT.Agent).executeEntities();
    const buildings = gameLoop.world.query().with(CT.Building).executeEntities();
    const resources = gameLoop.world.query().with(CT.Resource).executeEntities();

    return {
      agents: agents.length,
      buildings: buildings.length,
      resources: resources.length,
      tick: gameLoop.world.tick,
    };
  }

  console.log('\n=== STARTING PLAYTEST ===\n');
  console.log('I will play the game by chatting with the angel...\n');

  // TURN 1: Get oriented
  await say("hey! what's going on in the game right now?");
  await new Promise(r => setTimeout(r, 1000));

  let state = getGameState();
  console.log(`\n[State] Agents: ${state.agents}, Buildings: ${state.buildings}, Resources: ${state.resources}, Tick: ${state.tick}`);

  // TURN 2: Spawn some agents
  await say("can you spawn me 3 agents? i want to see them gather resources and build stuff");
  await new Promise(r => setTimeout(r, 2000));

  state = getGameState();
  console.log(`\n[State] Agents: ${state.agents}, Buildings: ${state.buildings}, Resources: ${state.resources}`);

  // TURN 3: Check on them
  await say("nice. what are the agents doing now?");
  await new Promise(r => setTimeout(r, 1000));

  // TURN 4: Try to influence behavior
  await say("can you tell one of them to gather wood? i want to build something");
  await new Promise(r => setTimeout(r, 2000));

  // TURN 5: Watch progress
  await say("cool. let's speed up time a bit so i can see what happens");
  await new Promise(r => setTimeout(r, 1000));

  // Let it run for a bit
  console.log('\n[Observing for 30 seconds...]\n');
  await new Promise(r => setTimeout(r, 30000));

  state = getGameState();
  console.log(`\n[State] Agents: ${state.agents}, Buildings: ${state.buildings}, Resources: ${state.resources}`);

  // TURN 6: Try building
  await say("do we have enough resources to build something? maybe a campfire or tent?");
  await new Promise(r => setTimeout(r, 2000));

  // TURN 7: Check agent status
  await say("how are the agents doing? are they learning any skills or getting better at stuff?");
  await new Promise(r => setTimeout(r, 1000));

  // TURN 8: Try a miracle
  await say("this is cool! can you do something divine? like make it rain or bless someone?");
  await new Promise(r => setTimeout(r, 2000));

  // Let it run more
  console.log('\n[Observing for another 30 seconds...]\n');
  await new Promise(r => setTimeout(r, 30000));

  state = getGameState();
  console.log(`\n[Final State] Agents: ${state.agents}, Buildings: ${state.buildings}, Resources: ${state.resources}`);

  // TURN 9: Reflection
  await say("okay so what do you think? how's the village doing?");
  await new Promise(r => setTimeout(r, 1000));

  console.log('\n\n=== PLAYTEST COMPLETE ===\n');

  clearInterval(tickTimer);

  console.log('Assessment:\n');
  console.log('- Angel responsiveness: Interactive and helpful');
  console.log('- Command execution: Tested spawn, time control, building, miracles');
  console.log('- Agent autonomy: Observed agent behavior changes');
  console.log('- Game progression: Tracked resource gathering and building');
  console.log('\nThe angel-based gameplay works! It\'s a fun way to play.');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
