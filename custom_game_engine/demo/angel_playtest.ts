/**
 * Automated Angel Playtest Script
 * Tests Phase 3 (Typing Indicators), Phase 1 (Emergent Narrative), and Phase 2 (Goals)
 */

import { GameLoop } from '../packages/core/src/ecs/GameLoop.js';
import { HeadlessGameLoop } from './headless.js';
import { EntityImpl } from '../packages/core/src/ecs/EntityImpl.js';
import { createEntityId } from '../packages/core/src/ecs/Entity.js';
import { createTimeComponent } from '../packages/world/src/components/TimeComponent.js';
import { createWeatherComponent } from '../packages/environment/src/components/WeatherComponent.js';
import { createNamedLandmarksComponent } from '../packages/world/src/components/NamedLandmarksComponent.js';
import { ChunkManager } from '../packages/world/src/chunks/ChunkManager.js';
import { TerrainGenerator } from '../packages/world/src/terrain/TerrainGenerator.js';
import { BuildingBlueprintRegistry } from '../packages/building-designer/src/BuildingBlueprintRegistry.js';

// Import setup functions from headless.ts
import {
  setupLLMProvider,
  setupGameSystems,
  createInitialBuildings,
  createInitialAgents,
  createInitialPlants,
  createInitialAnimals
} from './headless.js';

async function runPlaytest() {
  const sessionId = `angel_playtest_${Date.now()}`;
  const agentCount = 3;

  console.log('='.repeat(70));
  console.log('ANGEL FEATURES PLAYTEST');
  console.log('='.repeat(70));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Agent count: ${agentCount}`);
  console.log('');
  console.log('Testing:');
  console.log('  1. Typing Indicators (Phase 3)');
  console.log('  2. Emergent Narrative System (Phase 1)');
  console.log('  3. Angel Goal System (Phase 2)');
  console.log('='.repeat(70));
  console.log('');

  const { queue, promptBuilder } = await setupLLMProvider();

  const baseGameLoop = new GameLoop();
  const headlessLoop = new HeadlessGameLoop(baseGameLoop);

  // Setup world
  const blueprintRegistry = new BuildingBlueprintRegistry();
  blueprintRegistry.registerDefaults();
  blueprintRegistry.registerExampleBuildings();
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

  console.log('[Playtest] Setting up systems...');
  const { result } = await setupGameSystems(baseGameLoop, queue, promptBuilder, sessionId, chunkManager, terrainGenerator);

  console.log('[Playtest] Creating entities...');
  createInitialBuildings(baseGameLoop.world);
  createInitialAgents(baseGameLoop.world, agentCount);
  createInitialPlants(baseGameLoop.world);
  createInitialAnimals(baseGameLoop.world, result.wildAnimalSpawning);

  // Track test results
  let typingIndicatorSeen = false;
  let narrativePatternSeen = false;
  let goalsSeen = false;
  let divinePowerSeen = false;
  const angelResponses: string[] = [];

  // Listen for typing indicators
  baseGameLoop.world.eventBus.on('chat:typing_indicator', (event: any) => {
    typingIndicatorSeen = true;
    console.log(`\n✓ [TYPING INDICATOR] ${event.data.senderName} is typing...`);
  });

  // Listen for angel messages
  baseGameLoop.world.eventBus.on('chat:send_message', (event: any) => {
    const data = event.data as { roomId: string; senderName: string; message: string; senderId: string };
    if (data.roomId === 'divine_chat') {
      const msg = data.message;
      angelResponses.push(msg);
      console.log(`\n[Angel ${data.senderName}]: ${msg}`);

      // Check for narrative/pattern keywords
      if (/pattern|mystery|mysteries|strange|curious|noticed|emerging/i.test(msg)) {
        narrativePatternSeen = true;
        console.log('  → ✓ Narrative/pattern detection found!');
      }

      // Check for goals keywords
      if (/goal|objective|purpose|intention|plan|trying to/i.test(msg)) {
        goalsSeen = true;
        console.log('  → ✓ Goals mentioned!');
      }

      // Check for divine power keywords
      if (/divine power|power level|energy|capacity|points/i.test(msg)) {
        divinePowerSeen = true;
        console.log('  → ✓ Divine power mentioned!');
      }
    }
  });

  console.log('[Playtest] Starting game loop...');
  await headlessLoop.start();

  console.log('[Playtest] Waiting 30 seconds for world initialization...\n');
  await sleep(30000);

  // Test 1: Narrative/mysteries query
  console.log('\n--- TEST 1: Narrative/Mysteries Query ---');
  sendMessage(baseGameLoop, "what's happening? any mysteries?");
  await sleep(20000);

  // Test 2: Goals query
  console.log('\n--- TEST 2: Goals Query ---');
  sendMessage(baseGameLoop, "what are your goals right now?");
  await sleep(20000);

  // Test 3: Divine power query
  console.log('\n--- TEST 3: Divine Power Query ---');
  sendMessage(baseGameLoop, "how much divine power do you have?");
  await sleep(20000);

  // Test 4: General query for more context
  console.log('\n--- TEST 4: World Query ---');
  sendMessage(baseGameLoop, "tell me about the world");
  await sleep(20000);

  // Shutdown
  console.log('\n[Playtest] Shutting down...');
  headlessLoop.stop();

  // Print results
  console.log('\n');
  console.log('='.repeat(70));
  console.log('PLAYTEST RESULTS');
  console.log('='.repeat(70));
  console.log('');

  console.log('Feature Tests:');
  console.log(`  Typing Indicators (Phase 3):      ${typingIndicatorSeen ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`  Narrative Patterns (Phase 1):     ${narrativePatternSeen ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`  Goals System (Phase 2):           ${goalsSeen ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`  Divine Power (Phase 2):           ${divinePowerSeen ? '✓ PASSED' : '✗ FAILED'}`);
  console.log('');

  console.log(`Total Angel Responses: ${angelResponses.length}`);
  console.log('');

  if (angelResponses.length > 0) {
    console.log('Angel Response Excerpts:');
    angelResponses.forEach((response, i) => {
      const excerpt = response.length > 200 ? response.substring(0, 200) + '...' : response;
      console.log(`\n${i + 1}. "${excerpt}"`);
    });
  }

  console.log('');
  console.log('='.repeat(70));

  process.exit(0);
}

function sendMessage(gameLoop: GameLoop, message: string): void {
  console.log(`[You]: ${message}`);
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
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runPlaytest().catch((error) => {
  console.error('[Playtest] Fatal error:', error);
  process.exit(1);
});
