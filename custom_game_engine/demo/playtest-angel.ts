/**
 * Automated Playtest for Angel Chat Companion
 *
 * Tests the three improvements:
 * 1. Command feedback visibility
 * 2. Proactive observations
 * 3. Structured query responses
 */

import * as dotenv from 'dotenv';
dotenv.config();

import {
  GameLoop,
  BuildingBlueprintRegistry,
  SoilSystem,
  PlantComponent,
  WildAnimalSpawningSystem,
  TillActionHandler,
  PlantActionHandler,
  GatherSeedsActionHandler,
  HarvestActionHandler,
  createTimeComponent,
  createBuildingComponent,
  createPositionComponent,
  createRenderableComponent,
  createWeatherComponent,
  createInventoryComponent,
  createNamedLandmarksComponent,
  EntityImpl,
  createEntityId,
  type World,
  type WorldMutator,
  CraftingSystem,
  initializeDefaultRecipes,
  globalRecipeRegistry,
  CookingSystem,
  ExperimentationSystem,
  registerDefaultResearch,
  MetricsCollectionSystem,
  registerDefaultMaterials,
  registerAllSystems,
  type SystemRegistrationResult,
  type PlantSystemsConfig,
  BuildingType,
} from '@ai-village/core';

import { LiveEntityAPI } from '@ai-village/metrics';

import {
  PlantSystem,
  PlantDiscoverySystem,
  PlantDiseaseSystem,
  WildPlantPopulationSystem,
} from '@ai-village/botany';

import {
  OllamaProvider,
  OpenAICompatProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  TalkerPromptBuilder,
  ExecutorPromptBuilder,
  FallbackProvider,
  type LLMProvider,
} from '@ai-village/llm';

import {
  getPlantSpecies,
  getWildSpawnableSpecies,
  ChunkManager,
  TerrainGenerator,
} from '@ai-village/world';

import { createLLMAgent } from '@ai-village/agents';

// Import from headless.ts
class HeadlessGameLoop {
  private gameLoop: GameLoop;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private targetFps = 20;
  private lastTime = Date.now();
  private running = false;

  constructor(gameLoop: GameLoop) {
    this.gameLoop = gameLoop;
  }

  get world(): World {
    return this.gameLoop.world;
  }

  get systemRegistry() {
    return this.gameLoop.systemRegistry;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.lastTime = Date.now();

    // Initialize all systems (don't call GameLoop.start() as it uses requestAnimationFrame)
    const systems = this.gameLoop.systemRegistry.getSorted();
    for (const system of systems) {
      if (system.initialize) {
        await system.initialize(this.gameLoop.world, (this.gameLoop as any).eventBus);
      }
    }

    const frameTime = 1000 / this.targetFps;
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      try {
        (this.gameLoop as any).tick(deltaTime);
      } catch (error) {
        console.error('[Playtest] Error in game tick:', error);
      }
    }, frameTime);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
  }
}

// Setup functions from headless.ts (simplified)
async function setupLLMProvider() {
  const groqKey = process.env['GROQ_API_KEY'];
  const cerebrasKey = process.env['CEREBRAS_API_KEY'];

  if (groqKey && cerebrasKey) {
    const groq = new OpenAICompatProvider(
      'https://api.groq.com/openai/v1',
      groqKey,
      'llama-3.3-70b-versatile',
      'groq'
    );
    const cerebras = new OpenAICompatProvider(
      'https://api.cerebras.ai/v1',
      cerebrasKey,
      'qwen-3-32b',
      'cerebras'
    );
    const fallback = new FallbackProvider([groq, cerebras]);
    return {
      queue: new LLMDecisionQueue(fallback, 50),
      promptBuilder: new StructuredPromptBuilder(),
    };
  }

  throw new Error('No LLM provider configured');
}

async function main() {
  console.log('='.repeat(80));
  console.log('ANGEL CHAT PLAYTEST');
  console.log('='.repeat(80));
  console.log('Testing: Command Feedback, Proactive Observations, Structured Queries\n');

  const sessionId = `playtest_${Date.now()}`;
  const { queue, promptBuilder } = await setupLLMProvider();

  const baseGameLoop = new GameLoop();
  const headlessLoop = new HeadlessGameLoop(baseGameLoop);

  // Minimal setup
  const blueprintRegistry = new BuildingBlueprintRegistry();
  blueprintRegistry.registerDefaults();
  (baseGameLoop.world as any).buildingRegistry = blueprintRegistry;

  const terrainGenerator = new TerrainGenerator('playtest');
  const chunkManager = new ChunkManager(3);
  (baseGameLoop.world as any).setChunkManager(chunkManager);
  (baseGameLoop.world as any).setTerrainGenerator(terrainGenerator);

  const worldEntity = new EntityImpl(createEntityId(), baseGameLoop.world.tick);
  worldEntity.addComponent(createTimeComponent(6, 600));
  worldEntity.addComponent(createWeatherComponent('clear', 0, 120));
  worldEntity.addComponent(createNamedLandmarksComponent());
  (baseGameLoop.world as any)._addEntity(worldEntity);
  (baseGameLoop.world as any)._worldEntityId = worldEntity.id;

  console.log('[Setup] Registering systems...');

  registerDefaultMaterials();
  initializeDefaultRecipes(globalRecipeRegistry);
  registerDefaultResearch();

  const plantSystems: PlantSystemsConfig = {
    PlantSystem,
    PlantDiscoverySystem,
    PlantDiseaseSystem,
    WildPlantPopulationSystem,
  };

  const result = registerAllSystems(baseGameLoop, {
    llmQueue: queue,
    promptBuilder,
    gameSessionId: sessionId,
    metricsServerUrl: 'ws://localhost:8765',
    enableMetrics: true,
    plantSystems,
    enableAutoSave: false,
    chunkManager,
    terrainGenerator,
  });

  result.plantSystem.setSpeciesLookup(getPlantSpecies);

  console.log('[Setup] Creating 3 test agents...');
  // Create minimal agents
  for (let i = 0; i < 3; i++) {
    const agent = createLLMAgent(
      baseGameLoop.world,
      { x: i * 5, y: 0, z: 0 },
      `TestAgent${i}`
    );
  }

  console.log('[Setup] Starting game loop...');
  await headlessLoop.start();

  // Test conversation log
  const testLog: Array<{ timestamp: number; speaker: string; message: string }> = [];
  let angelResponseCount = 0;
  let systemFeedbackCount = 0;
  let proactiveObservationCount = 0;

  // Listen for angel responses
  baseGameLoop.world.eventBus.on('chat:send_message', (event) => {
    const data = event.data as { roomId: string; senderName: string; message: string; senderId: string };
    if (data.roomId === 'divine_chat') {
      const msg = `[Angel ${data.senderName}]: ${data.message}`;
      console.log(`\n${msg}`);
      testLog.push({ timestamp: Date.now(), speaker: `Angel ${data.senderName}`, message: data.message });
      angelResponseCount++;

      // Check if message was unprompted (proactive)
      const lastPlayer = testLog.filter(l => l.speaker === 'Player').pop();
      if (!lastPlayer || Date.now() - lastPlayer.timestamp > 10000) {
        console.log('[TEST] ✓ Proactive observation detected!');
        proactiveObservationCount++;
      }
    }
  });

  // Listen for system feedback
  baseGameLoop.world.eventBus.on('admin_angel:command_result', (event) => {
    const data = event.data as { command: string; success: boolean; result?: string; error?: string };
    const msg = data.success ? `[System]: ${data.result}` : `[System Error]: ${data.error}`;
    console.log(`\n${msg}`);
    testLog.push({ timestamp: Date.now(), speaker: 'System', message: msg });
    systemFeedbackCount++;
  });

  // Helper to send message
  const sendMessage = (content: string) => {
    console.log(`\n[You]: ${content}`);
    testLog.push({ timestamp: Date.now(), speaker: 'Player', message: content });
    baseGameLoop.world.eventBus.emit({
      type: 'chat:message_sent',
      data: {
        roomId: 'divine_chat',
        senderId: 'player',
        senderName: 'Player',
        content,
      },
      source: 'player',
    });
  };

  // Helper to wait
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: COMMAND FEEDBACK');
  console.log('='.repeat(80));

  await wait(3000); // Let angel greet

  console.log('\n[Test 1.1] Pause command');
  sendMessage('Can you pause the game?');
  await wait(8000); // Wait for response

  console.log('\n[Test 1.2] Resume command');
  sendMessage('Resume please');
  await wait(8000);

  console.log('\n[Test 1.3] Spawn command');
  sendMessage('Spawn a new agent');
  await wait(8000);

  console.log('\n\n' + '='.repeat(80));
  console.log('TEST 2: STRUCTURED QUERIES');
  console.log('='.repeat(80));

  console.log('\n[Test 2.1] Hunger query');
  sendMessage("Who's the hungriest?");
  await wait(8000);

  console.log('\n[Test 2.2] Activity query');
  sendMessage("What's everyone doing?");
  await wait(8000);

  console.log('\n[Test 2.3] Problems query');
  sendMessage('Any problems?');
  await wait(8000);

  console.log('\n\n' + '='.repeat(80));
  console.log('TEST 3: PROACTIVE OBSERVATIONS');
  console.log('='.repeat(80));

  console.log('\n[Test 3.1] Waiting 60 seconds for unprompted observations...');
  await wait(60000);

  console.log('\n\n' + '='.repeat(80));
  console.log('PLAYTEST RESULTS');
  console.log('='.repeat(80));

  console.log(`\nTotal angel responses: ${angelResponseCount}`);
  console.log(`System feedback messages: ${systemFeedbackCount}`);
  console.log(`Proactive observations: ${proactiveObservationCount}`);

  console.log('\n--- Full Conversation Log ---');
  for (const entry of testLog) {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    console.log(`[${time}] ${entry.speaker}: ${entry.message}`);
  }

  console.log('\n--- Analysis ---');

  // Check for command visibility in responses
  const commandTests = testLog.filter(l =>
    l.speaker.startsWith('Angel') &&
    (l.message.includes('[pause]') || l.message.includes('[resume]') || l.message.includes('[spawn'))
  );
  console.log(`\n✓ Commands visible in responses: ${commandTests.length > 0 ? 'YES' : 'NO'}`);
  if (commandTests.length > 0) {
    console.log('  Examples:');
    commandTests.forEach(t => console.log(`    - ${t.message.substring(0, 100)}...`));
  }

  console.log(`\n✓ System feedback working: ${systemFeedbackCount > 0 ? 'YES' : 'NO'}`);

  console.log(`\n✓ Proactive observations: ${proactiveObservationCount > 0 ? 'YES' : 'NO'}`);
  if (proactiveObservationCount > 0) {
    console.log(`  Detected ${proactiveObservationCount} unprompted messages`);
  }

  // Check for structured data in query responses
  const queryResponses = testLog.slice(testLog.findIndex(l => l.message.includes('hungriest')));
  const hasPercentages = queryResponses.some(l => l.message.includes('%'));
  const hasNumbers = queryResponses.some(l => /\d+/.test(l.message));
  console.log(`\n✓ Structured query responses contain data: ${hasPercentages || hasNumbers ? 'YES' : 'NO'}`);

  console.log('\n='.repeat(80));
  console.log('Playtest complete. Shutting down...');
  headlessLoop.stop();
  process.exit(0);
}

main().catch((error) => {
  console.error('[Playtest] Fatal error:', error);
  process.exit(1);
});
