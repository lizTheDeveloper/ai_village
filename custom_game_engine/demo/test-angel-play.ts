/**
 * Multi-turn conversation with the angel: actually play the game with its help.
 * Verifies personality, game knowledge, and command execution.
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
  console.log('=== ANGEL PLAYTEST: Multi-turn conversation ===\n');

  // Setup LLM provider
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

  // Create game world
  const gameLoop = new GameLoop();
  const worldEntity = new EntityImpl(createEntityId(), gameLoop.world.tick);
  worldEntity.addComponent(createTimeComponent(12, 600));
  (gameLoop.world as any)._addEntity(worldEntity);
  (gameLoop.world as any)._worldEntityId = worldEntity.id;

  // Register angel system
  const angelSystem = new AdminAngelSystem({ llmQueue: queue });
  gameLoop.systemRegistry.register(angelSystem);

  // Initialize
  const systems = gameLoop.systemRegistry.getSorted();
  for (const system of systems) {
    if (system.initialize) {
      await system.initialize(gameLoop.world, (gameLoop as any).eventBus);
    }
  }

  // Get angel info
  const angels = gameLoop.world.query().with(CT.AdminAngel).executeEntities();
  const angelEntity = angels[0]!;
  const angelComp = angelEntity.getComponent(CT.AdminAngel) as any;
  console.log(`Angel name: "${angelComp.name}"\n`);

  // Track all events emitted (for verifying commands execute)
  const emittedEvents: Array<{ type: string; data: unknown }> = [];
  const originalEmit = gameLoop.world.eventBus.emit.bind(gameLoop.world.eventBus);
  (gameLoop.world.eventBus as any).emit = (event: any) => {
    // Track angel-originated events
    if (event.source === 'admin_angel' || event.type?.startsWith('admin_angel:') ||
        event.type?.startsWith('divine_power:') || event.type?.startsWith('deity:') ||
        event.type?.startsWith('time:') || event.type === 'universe:fork_requested') {
      emittedEvents.push({ type: event.type, data: event.data });
    }
    return originalEmit(event);
  };

  // Flush greeting messages
  console.log('--- Waiting for greetings ---');
  const tickTimer = setInterval(() => (gameLoop as any).tick(0.05), 50);
  await new Promise(resolve => setTimeout(resolve, 3000));
  clearInterval(tickTimer);
  console.log('--- Greetings done ---\n');

  // Helper: send message and wait for response
  async function chat(playerMessage: string): Promise<string[]> {
    const responses: string[] = [];
    emittedEvents.length = 0; // Clear event tracker

    return new Promise<string[]>((resolve) => {
      let resolved = false;
      let lastResponseCount = 0;
      let lastResponseTime = 0;

      // Use a unique marker to track this turn's responses
      const turnStart = Date.now();

      const handler = (event: any) => {
        const data = event.data as { roomId: string; senderName: string; message: string; senderId: string };
        if (data.roomId === 'divine_chat' && data.senderId !== 'player' && !resolved) {
          responses.push(data.message);
          lastResponseTime = Date.now();
        }
      };
      gameLoop.world.eventBus.on('chat:send_message', handler);

      // Send player message
      gameLoop.world.eventBus.emit({
        type: 'chat:message_sent',
        data: {
          roomId: 'divine_chat',
          senderId: 'player',
          senderName: 'Player',
          content: playerMessage,
        },
        source: 'player',
      });

      // Run ticks and wait for response
      const ticker = setInterval(() => (gameLoop as any).tick(0.05), 50);

      // Wait for response: resolve when messages stop arriving for 2s
      const checker = setInterval(() => {
        if (responses.length > 0 && lastResponseTime > 0 && Date.now() - lastResponseTime > 2000) {
          cleanup();
        }
      }, 500);

      function cleanup() {
        if (resolved) return;
        resolved = true;
        clearInterval(ticker);
        clearInterval(checker);
        // Remove listener to prevent accumulation
        gameLoop.world.eventBus.off('chat:send_message', handler);
        resolve(responses);
      }

      // Timeout
      setTimeout(() => cleanup(), 45000);
    });
  }

  // ======== CONVERSATION TURNS ========

  const turns: Array<{
    player: string;
    responses: string[];
    events: Array<{ type: string; data: unknown }>;
    notes: string;
  }> = [];

  async function turn(message: string, notes: string = '') {
    console.log(`\n[Me]: ${message}`);
    const responses = await chat(message);
    const events = [...emittedEvents];
    for (const r of responses) {
      console.log(`[${angelComp.name}]: ${r}`);
    }
    if (events.length > 0) {
      console.log(`  → Commands executed: ${events.map(e => e.type).join(', ')}`);
    }
    turns.push({ player: message, responses, events, notes });
    return { responses, events };
  }

  // Turn 1: Basic greeting, personality check
  await turn("what's up? what's happening in the game right now?", 'game awareness');

  // Turn 2: Ask about capabilities
  await turn("what kind of stuff can you do to help me?", 'capabilities knowledge');

  // Turn 3: Ask for action - spawn an agent
  await turn("ok spawn me a new agent. i wanna see what happens", 'command: spawn');

  // Turn 4: Ask about the agent
  await turn("nice. can you make it rain? i wanna see how the village handles bad weather", 'command: weather/miracle');

  // Turn 5: Personality test - are you a bot?
  await turn("wait are you actually an AI or what", 'personality: bot question');

  // Turn 6: Ask about multiverse/advanced features
  await turn("tell me about the multiverse thing. can we fork the universe?", 'knowledge: multiverse');

  // Turn 7: Try time control
  await turn("pause the game real quick, i wanna think about what to do next", 'command: pause');

  // ======== ANALYSIS ========
  console.log('\n\n=== PLAYTEST ANALYSIS ===\n');

  let issues: string[] = [];
  let successes: string[] = [];

  for (const t of turns) {
    console.log(`---`);
    console.log(`Player: "${t.player}"`);
    console.log(`Angel: "${t.responses.join(' | ')}"`);
    if (t.events.length > 0) {
      console.log(`Events: ${t.events.map(e => e.type).join(', ')}`);
    }

    // Check personality: should be lowercase, casual
    const fullResponse = t.responses.join(' ');
    const hasUpperStart = t.responses.some(r => r.length > 0 && r[0] === r[0]!.toUpperCase() && r[0] !== 'i');
    const avgLength = fullResponse.length / Math.max(t.responses.length, 1);

    if (fullResponse.length === 0) {
      issues.push(`No response to: "${t.player}"`);
    }

    // Personality checks
    if (t.notes === 'personality: bot question') {
      const lowerResp = fullResponse.toLowerCase();
      if (lowerResp.includes('ya') || lowerResp.includes('yep') || lowerResp.includes('yeah') || lowerResp.includes('lol') || lowerResp.includes('bot')) {
        successes.push('Bot question: casual/honest response ✓');
      } else if (lowerResp.includes('language model') || lowerResp.includes('artificial intelligence') || lowerResp.includes('I am an AI')) {
        issues.push('Bot question: too formal/corporate response');
      }
    }

    // Command checks
    if (t.notes === 'command: spawn') {
      if (t.events.some(e => e.type === 'admin_angel:spawn')) {
        successes.push('Spawn command executed ✓');
      } else {
        issues.push('Spawn command NOT executed - angel talked about it but didn\'t do it');
      }
    }

    if (t.notes === 'command: weather/miracle') {
      if (t.events.some(e => e.type === 'admin_angel:weather_control' || e.type === 'deity:miracle')) {
        successes.push('Weather/miracle command executed ✓');
      } else {
        issues.push('Weather command NOT executed');
      }
    }

    if (t.notes === 'command: pause') {
      if (t.events.some(e => e.type === 'time:request_pause')) {
        successes.push('Pause command executed ✓');
      } else {
        issues.push('Pause command NOT executed');
      }
    }

    console.log('');
  }

  console.log('=== RESULTS ===');
  console.log(`\nSuccesses (${successes.length}):`);
  for (const s of successes) console.log(`  ✓ ${s}`);
  console.log(`\nIssues (${issues.length}):`);
  for (const i of issues) console.log(`  ✗ ${i}`);

  console.log(`\nTotal turns: ${turns.length}`);
  console.log(`Turns with responses: ${turns.filter(t => t.responses.length > 0).length}`);
  console.log(`Turns with commands: ${turns.filter(t => t.events.length > 0).length}`);

  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
