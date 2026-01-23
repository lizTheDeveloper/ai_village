/**
 * Test script: Verify angel chat works in headless mode with high-tier LLM routing.
 * Uses a spy provider to definitively verify which model is called.
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
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '@ai-village/llm';

/**
 * SpyProvider wraps another provider to record which model was actually called.
 */
class SpyProvider implements LLMProvider {
  private inner: LLMProvider;
  public calls: Array<{ model: string; promptLength: number; timestamp: number }> = [];

  constructor(inner: LLMProvider) {
    this.inner = inner;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = this.inner.getModelName();
    console.log(`[SPY] >>> generate() called on model: ${model}, prompt length: ${request.prompt.length}`);
    this.calls.push({ model, promptLength: request.prompt.length, timestamp: Date.now() });
    const response = await this.inner.generate(request);
    console.log(`[SPY] <<< response from ${model}: "${response.text.substring(0, 100)}..."`);
    return response;
  }

  getModelName(): string { return this.inner.getModelName(); }
  async isAvailable(): Promise<boolean> { return this.inner.isAvailable(); }
  getPricing(): ProviderPricing { return this.inner.getPricing(); }
  getProviderId(): string { return this.inner.getProviderId(); }
}

async function main() {
  console.log('=== ANGEL CHAT TEST (with spy provider) ===\n');

  // Setup LLM provider
  const groqApiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3-32b';
  const cerebrasApiKey = process.env.CEREBRAS_API_KEY;
  const cerebrasModel = process.env.CEREBRAS_MODEL || 'llama-3.3-70b';

  const cloudProviders: LLMProvider[] = [];
  if (groqApiKey) {
    console.log(`[Test] Groq available: ${groqModel}`);
    cloudProviders.push(new OpenAICompatProvider(groqModel, 'https://api.groq.com/openai/v1', groqApiKey));
  }
  if (cerebrasApiKey) {
    console.log(`[Test] Cerebras available: ${cerebrasModel}`);
    cloudProviders.push(new OpenAICompatProvider(cerebrasModel, 'https://api.cerebras.ai/v1', cerebrasApiKey));
  }

  if (cloudProviders.length === 0) {
    console.error('[Test] ERROR: No LLM API keys configured. Set GROQ_API_KEY or CEREBRAS_API_KEY.');
    process.exit(1);
  }

  let provider: LLMProvider;
  if (cloudProviders.length === 1) {
    provider = cloudProviders[0]!;
  } else {
    provider = new FallbackProvider(cloudProviders, { retryAfterMs: 60000, maxConsecutiveFailures: 3, logFallbacks: true });
  }

  // Wrap default provider in spy
  const defaultSpy = new SpyProvider(provider);
  const queue = new LLMDecisionQueue(defaultSpy, 50);

  // Register high-tier provider for angel (openai/gpt-oss-120b) - also wrapped in spy
  let highTierSpy: SpyProvider | null = null;
  if (groqApiKey) {
    const highTierProvider = new OpenAICompatProvider(
      'openai/gpt-oss-120b',
      'https://api.groq.com/openai/v1',
      groqApiKey
    );
    highTierSpy = new SpyProvider(highTierProvider);
    queue.setTierProvider('high', highTierSpy);
    console.log('[Test] High tier registered: openai/gpt-oss-120b (wrapped in spy)');
  }

  // Create minimal game world
  const gameLoop = new GameLoop();

  // Add time entity (needed for game state summary)
  const worldEntity = new EntityImpl(createEntityId(), gameLoop.world.tick);
  worldEntity.addComponent(createTimeComponent(12, 600));
  (gameLoop.world as any)._addEntity(worldEntity);
  (gameLoop.world as any)._worldEntityId = worldEntity.id;

  // Register ONLY the AdminAngelSystem
  console.log('[Test] Registering AdminAngelSystem...');
  const angelSystem = new AdminAngelSystem({ llmQueue: queue });
  gameLoop.systemRegistry.register(angelSystem);

  // Initialize the system (this calls onInitialize → spawns angel + subscribes to events)
  console.log('[Test] Initializing...');
  const systems = gameLoop.systemRegistry.getSorted();
  for (const system of systems) {
    if (system.initialize) {
      await system.initialize(gameLoop.world, (gameLoop as any).eventBus);
    }
  }
  console.log(`[Test] Initialized ${systems.length} systems`);

  // Verify angel entity was created
  const angels = gameLoop.world.query().with(CT.AdminAngel).executeEntities();
  if (angels.length === 0) {
    console.error('[Test] FAILED: No angel entity created. onInitialize was not called.');
    process.exit(1);
  }
  const angelEntity = angels[0]!;
  const angelComp = angelEntity.getComponent(CT.AdminAngel) as any;
  console.log(`[Test] Angel spawned: "${angelComp.name}" (${angelEntity.id})`);
  console.log(`[Test] Angel active: ${angelComp.active}`);

  // Wait for the angel's initial greeting messages to pass
  // spawnAdminAngel sends "hey" at 500ms and "welcome..." at 1500ms
  // We need to run ticks during the wait so events get flushed through the event bus
  console.log('[Test] Running ticks for 3s to flush angel greeting messages...');
  let greetingMessages: string[] = [];
  gameLoop.world.eventBus.on('chat:send_message', (event) => {
    const data = event.data as { roomId: string; senderName: string; message: string };
    if (data.roomId === 'divine_chat') {
      greetingMessages.push(data.message);
      console.log(`[Test] (greeting): "${data.message}"`);
    }
  });
  const greetingTickInterval = setInterval(() => {
    (gameLoop as any).tick(0.05);
  }, 50);
  await new Promise(resolve => setTimeout(resolve, 3000));
  clearInterval(greetingTickInterval);
  console.log(`[Test] Got ${greetingMessages.length} greeting messages, now testing LLM response...`);

  // Now listen for angel chat responses (after greetings are done)
  let playerMessageSent = false;
  const responsePromise = new Promise<string>((resolve) => {
    gameLoop.world.eventBus.on('chat:send_message', (event) => {
      const data = event.data as { roomId: string; senderName: string; message: string };
      if (data.roomId === 'divine_chat' && playerMessageSent) {
        console.log(`\n[Angel "${data.senderName}"]: ${data.message}`);
        resolve(data.message);
      } else if (data.roomId === 'divine_chat') {
        console.log(`[Test] (greeting, ignoring): "${data.message}"`);
      }
    });
  });

  // Send test message to angel
  const testMessage = 'hey! what can you help me with in this game?';
  console.log(`\n[Player]: ${testMessage}`);
  console.log('[Test] Waiting for angel LLM response (tier: high, may take 5-60s)...\n');

  playerMessageSent = true;
  gameLoop.world.eventBus.emit({
    type: 'chat:message_sent',
    data: {
      roomId: 'divine_chat',
      senderId: 'player',
      senderName: 'Player',
      content: testMessage,
    },
    source: 'player',
  });

  // Run ticks while waiting for response (angel processes on update)
  // Need enough ticks for throttleInterval=20 to pass
  const tickInterval = setInterval(() => {
    (gameLoop as any).tick(0.05);
  }, 50);

  // Wait for response with timeout
  const timeout = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: No angel response after 60s')), 60000);
  });

  try {
    const response = await Promise.race([responsePromise, timeout]);
    console.log('\n=== RESULTS ===');
    console.log(`Angel responded: "${response.substring(0, 200)}"`);
    console.log(`\nDefault provider calls: ${defaultSpy.calls.length}`);
    for (const call of defaultSpy.calls) {
      console.log(`  - model: ${call.model}, prompt: ${call.promptLength} chars`);
    }
    console.log(`High-tier provider calls: ${highTierSpy?.calls.length ?? 'N/A'}`);
    if (highTierSpy) {
      for (const call of highTierSpy.calls) {
        console.log(`  - model: ${call.model}, prompt: ${call.promptLength} chars`);
      }
    }

    if (highTierSpy && highTierSpy.calls.length > 0) {
      console.log('\n=== TEST PASSED: Angel used HIGH-TIER model (openai/gpt-oss-120b) ===');
    } else if (defaultSpy.calls.length > 0) {
      console.log('\n=== TEST PARTIAL: Angel responded but used DEFAULT model ===');
      console.log('Tier routing may not be working correctly.');
    } else {
      console.log('\n=== TEST UNCLEAR: Angel responded but neither spy was called ===');
      console.log('The response may have come through a different path.');
    }
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error((error as Error).message);
    // Debug info
    const angel = angelEntity.getComponent(CT.AdminAngel) as any;
    console.error(`Pending messages: ${angel?.pendingPlayerMessages?.length}`);
    console.error(`Awaiting response: ${angel?.awaitingResponse}`);
    console.error(`Default spy calls: ${defaultSpy.calls.length}`);
    console.error(`High-tier spy calls: ${highTierSpy?.calls.length ?? 'N/A'}`);
  } finally {
    clearInterval(tickInterval);
    // Give time for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('[Test] Fatal error:', error);
  process.exit(1);
});
