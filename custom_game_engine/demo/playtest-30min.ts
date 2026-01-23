/**
 * 30-Minute Automated Playtest with Angel Supervision
 *
 * This runs a full game session and analyzes:
 * - Can agents build buildings?
 * - Do they learn skills on their own?
 * - Does the town grow?
 * - Is the game fun to watch?
 * - What's broken?
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
  BuildingType,
  ComponentType as CT,
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

// ============================================================================
// TYPES
// ============================================================================

interface PlaytestSnapshot {
  timestamp: number;
  tick: number;
  gameTime: string;
  population: number;
  agents: Array<{
    id: string;
    name: string;
    behavior: string;
    health: number;
    hunger: number;
    skillsLearned: string[];
    buildingsCreated: number;
  }>;
  buildings: Array<{
    type: string;
    position: { x: number; y: number };
    health: number;
  }>;
  resources: Record<string, number>;
  interactions: {
    conversationsCount: number;
    resourcesGathered: number;
    buildingsBuilt: number;
  };
}

interface AngelInteraction {
  timestamp: number;
  playerMessage: string;
  angelResponse: string;
  eventsTriggered: string[];
}

// ============================================================================
// HEADLESS GAME LOOP
// ============================================================================

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

  get actionRegistry() {
    return this.gameLoop.actionRegistry;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.lastTime = Date.now();

    console.log('[Playtest] Initializing systems...');
    const systems = this.gameLoop.systemRegistry.getSorted();
    for (const system of systems) {
      if (system.initialize) {
        await system.initialize(this.gameLoop.world, (this.gameLoop as any).eventBus);
      }
    }
    console.log(`[Playtest] Initialized ${systems.length} systems`);

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

    console.log(`[Playtest] Game loop started at ${this.targetFps} TPS`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    console.log('[Playtest] Game loop stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}

// ============================================================================
// SETUP
// ============================================================================

async function setupGameSystems(
  gameLoop: GameLoop,
  llmQueue: LLMDecisionQueue | null,
  promptBuilder: StructuredPromptBuilder | null,
  sessionId: string,
  chunkManager: ChunkManager,
  terrainGenerator: TerrainGenerator
) {
  registerDefaultMaterials();
  initializeDefaultRecipes(globalRecipeRegistry);
  registerDefaultResearch();

  const plantSystems = {
    PlantSystem,
    PlantDiscoverySystem,
    PlantDiseaseSystem,
    WildPlantPopulationSystem,
  };

  const result = registerAllSystems(gameLoop, {
    llmQueue: llmQueue || undefined,
    promptBuilder: promptBuilder || undefined,
    gameSessionId: sessionId,
    metricsServerUrl: 'ws://localhost:8765',
    enableMetrics: true,
    plantSystems,
    enableAutoSave: false,
    chunkManager,
    terrainGenerator,
  });

  result.plantSystem.setSpeciesLookup(getPlantSpecies);

  gameLoop.actionRegistry.register(new TillActionHandler(result.soilSystem));
  gameLoop.actionRegistry.register(new PlantActionHandler());
  gameLoop.actionRegistry.register(new GatherSeedsActionHandler());
  gameLoop.actionRegistry.register(new HarvestActionHandler());

  const craftingSystem = new CraftingSystem();
  craftingSystem.setRecipeRegistry(globalRecipeRegistry);
  gameLoop.systemRegistry.register(craftingSystem);

  const experimentationSystem = gameLoop.systemRegistry.get('experimentation');
  if (experimentationSystem instanceof ExperimentationSystem) {
    experimentationSystem.setRecipeRegistry(globalRecipeRegistry);
  }

  const metricsSystem = result.metricsSystem;
  if (metricsSystem) {
    const streamClient = metricsSystem.getStreamClient();
    if (streamClient) {
      const liveEntityAPI = new LiveEntityAPI(gameLoop.world);
      if (promptBuilder) {
        liveEntityAPI.setPromptBuilder(promptBuilder);
      }
      const talkerPromptBuilder = new TalkerPromptBuilder();
      const executorPromptBuilder = new ExecutorPromptBuilder();
      liveEntityAPI.setTalkerPromptBuilder(talkerPromptBuilder);
      liveEntityAPI.setExecutorPromptBuilder(executorPromptBuilder);
      liveEntityAPI.attach(streamClient);
      console.log('[Playtest] Live Entity API attached');
    }
  }

  result.governanceDataSystem.initialize(gameLoop.world, gameLoop.world.eventBus);

  return { soilSystem: result.soilSystem, craftingSystem, result, metricsSystem: metricsSystem! };
}

function createInitialBuildings(world: World) {
  const worldMutator = world as unknown as WorldMutator;

  const campfire = new EntityImpl(createEntityId(), world.tick);
  campfire.addComponent(createBuildingComponent(BuildingType.Campfire, 1, 100));
  campfire.addComponent(createPositionComponent(-3, -3));
  campfire.addComponent(createRenderableComponent('campfire', 'objects'));
  (worldMutator as any)._addEntity(campfire);

  const tent = new EntityImpl(createEntityId(), world.tick);
  tent.addComponent(createBuildingComponent(BuildingType.Tent, 1, 100));
  tent.addComponent(createPositionComponent(3, -3));
  tent.addComponent(createRenderableComponent('tent', 'objects'));
  (worldMutator as any)._addEntity(tent);

  const storage = new EntityImpl(createEntityId(), world.tick);
  storage.addComponent(createBuildingComponent(BuildingType.StorageChest, 1, 100));
  storage.addComponent(createPositionComponent(0, -5));
  storage.addComponent(createRenderableComponent('storage-chest', 'objects'));
  const inv = createInventoryComponent(20, 500);
  inv.slots[0] = { itemId: 'wood', quantity: 50 };
  storage.addComponent(inv);
  (worldMutator as any)._addEntity(storage);
}

function createInitialAgents(world: World, count: number = 8) {
  const worldMutator = world as unknown as WorldMutator;
  const agentIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (i % 3 - 1) * 2 + Math.random() * 0.5;
    const y = (Math.floor(i / 3) - 0.5) * 2 + Math.random() * 0.5;
    const agentId = createLLMAgent(worldMutator, x, y, 2.0);
    agentIds.push(agentId);
  }
  return agentIds;
}

function createInitialPlants(world: World) {
  const worldMutator = world as unknown as WorldMutator;
  const wildSpecies = getWildSpawnableSpecies();
  for (let i = 0; i < 25; i++) {
    const x = -15 + Math.random() * 30;
    const y = -15 + Math.random() * 30;
    const species = wildSpecies[Math.floor(Math.random() * wildSpecies.length)]!;

    const plantEntity = new EntityImpl(createEntityId(), world.tick);
    const plantComponent = new PlantComponent({
      speciesId: species.id,
      position: { x, y },
      stage: 'mature',
      stageProgress: 0,
      age: 20,
      generation: 0,
      health: 80 + Math.random() * 20,
      hydration: 50 + Math.random() * 30,
      nutrition: 50 + Math.random() * 30,
      genetics: { ...species.baseGenetics },
      seedsProduced: Math.floor(species.seedsPerPlant * species.baseGenetics.yieldAmount),
      fruitCount: (species.id === 'blueberry-bush' || species.id === 'raspberry-bush' || species.id === 'blackberry-bush') ? 8 : 0,
    });
    (plantComponent as any).entityId = plantEntity.id;
    plantEntity.addComponent(plantComponent);
    plantEntity.addComponent(createPositionComponent(x, y));
    plantEntity.addComponent(createRenderableComponent(species.id, 'terrain'));
    (worldMutator as any)._addEntity(plantEntity);
  }
}

function createInitialAnimals(world: World, spawning: WildAnimalSpawningSystem) {
  const animals = [
    { species: 'chicken', position: { x: 3, y: 2 } },
    { species: 'rabbit', position: { x: 5, y: -2 } },
  ];
  for (const a of animals) {
    try {
      spawning.spawnSpecificAnimal(world, a.species, a.position);
    } catch (e) {
      console.error(`Failed to spawn ${a.species}:`, e);
    }
  }
}

async function setupLLMProvider() {
  const cloudProviders: LLMProvider[] = [];

  const groqApiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3-32b';

  if (groqApiKey) {
    try {
      console.log(`[Playtest] Groq API available with model: ${groqModel}`);
      const groqProvider = new OpenAICompatProvider(
        groqModel,
        'https://api.groq.com/openai/v1',
        groqApiKey
      );
      cloudProviders.push(groqProvider);
    } catch (e) {
      console.error('[Playtest] Groq setup failed:', e);
    }
  }

  const cerebrasApiKey = process.env.CEREBRAS_API_KEY;
  const cerebrasModel = process.env.CEREBRAS_MODEL || 'llama-3.3-70b';

  if (cerebrasApiKey) {
    try {
      console.log(`[Playtest] Cerebras API available with model: ${cerebrasModel}`);
      const cerebrasProvider = new OpenAICompatProvider(
        cerebrasModel,
        'https://api.cerebras.ai/v1',
        cerebrasApiKey
      );
      cloudProviders.push(cerebrasProvider);
    } catch (e) {
      console.error('[Playtest] Cerebras setup failed:', e);
    }
  }

  if (cloudProviders.length > 0) {
    let provider: LLMProvider;
    if (cloudProviders.length === 1) {
      provider = cloudProviders[0]!;
      console.log(`[Playtest] Using single cloud provider: ${provider.getModelName()}`);
    } else {
      provider = new FallbackProvider(cloudProviders, {
        retryAfterMs: 60000,
        maxConsecutiveFailures: 3,
        logFallbacks: true,
      });
      console.log(`[Playtest] Using Groq as primary, Cerebras as fallback (${cloudProviders.length} providers)`);
    }

    const maxConcurrent = 50;
    console.log(`[Playtest] Max concurrent LLM requests: ${maxConcurrent}`);

    const queue = new LLMDecisionQueue(provider, maxConcurrent);

    if (groqApiKey) {
      const highTierProvider = new OpenAICompatProvider(
        'openai/gpt-oss-120b',
        'https://api.groq.com/openai/v1',
        groqApiKey
      );
      queue.setTierProvider('high', highTierProvider);
      console.log('[Playtest] High tier: openai/gpt-oss-120b on Groq');
    }

    return {
      provider,
      queue,
      promptBuilder: new StructuredPromptBuilder(),
    };
  }

  console.warn('[Playtest] No LLM provider - running scripted');
  return { provider: null, queue: null, promptBuilder: null };
}

// ============================================================================
// SNAPSHOT & ANALYSIS
// ============================================================================

function captureSnapshot(world: World): PlaytestSnapshot {
  const agents = world.query().with(CT.Agent).with(CT.Position).executeEntities();
  const buildings = world.query().with(CT.Building).executeEntities();
  const storage = world.query().with(CT.Inventory).with(CT.Building).executeEntities();

  const timeEntity = world.getSingleton('time');
  const timeComp = timeEntity?.getComponent(CT.Time) as any;

  const agentData = agents.map(agent => {
    const agentComp = agent.getComponent(CT.Agent) as any;
    const needs = agent.getComponent(CT.Needs) as any;
    const skills = agent.getComponent(CT.Skills) as any;
    const memory = agent.getComponent(CT.Memory) as any;
    const identity = agent.getComponent(CT.Identity) as any;

    return {
      id: agent.id,
      name: identity?.name || 'Unknown',
      behavior: agentComp?.currentBehavior || 'idle',
      health: needs?.health || 100,
      hunger: needs?.hunger || 100,
      skillsLearned: skills ? Object.keys(skills.levels || {}).filter(s => (skills.levels[s] || 0) > 0) : [],
      buildingsCreated: memory?.stats?.buildingsCreated || 0,
    };
  });

  const buildingData = buildings.map(building => {
    const buildingComp = building.getComponent(CT.Building) as any;
    const position = building.getComponent(CT.Position) as any;
    return {
      type: buildingComp?.buildingType || 'unknown',
      position: { x: position?.x || 0, y: position?.y || 0 },
      health: buildingComp?.health || 100,
    };
  });

  // Count resources in storage
  const resources: Record<string, number> = {};
  for (const storageEntity of storage) {
    const inv = storageEntity.getComponent(CT.Inventory) as any;
    if (inv && inv.slots) {
      for (const slot of inv.slots) {
        if (slot) {
          resources[slot.itemId] = (resources[slot.itemId] || 0) + slot.quantity;
        }
      }
    }
  }

  return {
    timestamp: Date.now(),
    tick: world.tick,
    gameTime: timeComp ? `${Math.floor(timeComp.hourOfDay)}:${String(Math.floor((timeComp.hourOfDay % 1) * 60)).padStart(2, '0')}` : 'unknown',
    population: agents.length,
    agents: agentData,
    buildings: buildingData,
    resources,
    interactions: {
      conversationsCount: 0, // TODO: track via events
      resourcesGathered: 0,  // TODO: track via events
      buildingsBuilt: buildingData.length,
    },
  };
}

async function talkToAngel(world: World, message: string): Promise<{ response: string; events: string[] }> {
  const responses: string[] = [];
  const events: string[] = [];

  return new Promise((resolve) => {
    let lastResponseTime = 0;
    let resolved = false;

    const messageHandler = (event: any) => {
      const data = event.data as { roomId: string; senderName: string; message: string; senderId: string };
      if (data.roomId === 'divine_chat' && data.senderId !== 'player') {
        responses.push(data.message);
        lastResponseTime = Date.now();
      }
    };

    const eventHandler = (event: any) => {
      if (event.source === 'admin_angel' || event.type?.startsWith('admin_angel:') ||
          event.type?.startsWith('divine_power:') || event.type?.startsWith('deity:') ||
          event.type?.startsWith('time:') || event.type === 'universe:fork_requested') {
        events.push(event.type);
      }
    };

    world.eventBus.on('chat:send_message', messageHandler);
    const originalEmit = world.eventBus.emit.bind(world.eventBus);
    (world.eventBus as any).emit = (event: any) => {
      eventHandler(event);
      return originalEmit(event);
    };

    // Send message
    world.eventBus.emit({
      type: 'chat:message_sent',
      data: {
        roomId: 'divine_chat',
        senderId: 'player',
        senderName: 'Player',
        content: message,
      },
      source: 'player',
    });

    // Wait for response (up to 20 seconds)
    const checker = setInterval(() => {
      if (responses.length > 0 && lastResponseTime > 0 && Date.now() - lastResponseTime > 2000) {
        cleanup();
      }
    }, 500);

    function cleanup() {
      if (resolved) return;
      resolved = true;
      clearInterval(checker);
      world.eventBus.off('chat:send_message', messageHandler);
      resolve({ response: responses.join(' '), events });
    }

    setTimeout(() => cleanup(), 20000);
  });
}

// ============================================================================
// MAIN PLAYTEST
// ============================================================================

async function main() {
  const sessionId = `playtest_30min_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log('='.repeat(80));
  console.log('30-MINUTE AUTOMATED PLAYTEST');
  console.log('='.repeat(80));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Duration: 30 minutes (36,000 ticks at 20 TPS)`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('');

  const { queue, promptBuilder } = await setupLLMProvider();

  const baseGameLoop = new GameLoop();
  const headlessLoop = new HeadlessGameLoop(baseGameLoop);

  const blueprintRegistry = new BuildingBlueprintRegistry();
  blueprintRegistry.registerDefaults();
  blueprintRegistry.registerExampleBuildings();
  (baseGameLoop.world as any).buildingRegistry = blueprintRegistry;

  const terrainGenerator = new TerrainGenerator('playtest-demo');
  const chunkManager = new ChunkManager(3);
  (baseGameLoop.world as any).setChunkManager(chunkManager);
  (baseGameLoop.world as any).setTerrainGenerator(terrainGenerator);

  const worldEntity = new EntityImpl(createEntityId(), baseGameLoop.world.tick);
  worldEntity.addComponent(createTimeComponent(6, 600));
  worldEntity.addComponent(createWeatherComponent('clear', 0, 120));
  worldEntity.addComponent(createNamedLandmarksComponent());
  (baseGameLoop.world as any)._addEntity(worldEntity);
  (baseGameLoop.world as any)._worldEntityId = worldEntity.id;

  console.log('[Playtest] Registering systems...');
  const { result } = await setupGameSystems(baseGameLoop, queue, promptBuilder, sessionId, chunkManager, terrainGenerator);

  console.log('[Playtest] Creating entities...');
  createInitialBuildings(baseGameLoop.world);
  createInitialAgents(baseGameLoop.world, 8);
  createInitialPlants(baseGameLoop.world);
  createInitialAnimals(baseGameLoop.world, result.wildAnimalSpawning);

  console.log('[Playtest] Starting game loop...');
  await headlessLoop.start();

  // Get angel info
  const angels = baseGameLoop.world.query().with(CT.AdminAngel).executeEntities();
  const angelEntity = angels[0];
  const angelComp = angelEntity?.getComponent(CT.AdminAngel) as any;
  const angelName = angelComp?.name || 'Angel';
  console.log(`[Playtest] Angel "${angelName}" is supervising`);
  console.log('');

  // Playtest data collection
  const snapshots: PlaytestSnapshot[] = [];
  const angelInteractions: AngelInteraction[] = [];

  // Initial greeting to angel
  console.log('[Playtest] Greeting angel...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Let angel greet first
  const greeting = await talkToAngel(baseGameLoop.world, "hey! i'm running a 30 minute playtest. can you supervise and tell me how things are going?");
  angelInteractions.push({
    timestamp: Date.now(),
    playerMessage: "hey! i'm running a 30 minute playtest. can you supervise and tell me how things are going?",
    angelResponse: greeting.response,
    eventsTriggered: greeting.events,
  });
  console.log(`[${angelName}]: ${greeting.response}`);
  console.log('');

  // Capture snapshots every 5 minutes
  const SNAPSHOT_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const TOTAL_DURATION = 30 * 60 * 1000; // 30 minutes
  const startTime = Date.now();

  let lastSnapshotTime = startTime;
  let lastAngelCheckTime = startTime;

  const monitorInterval = setInterval(async () => {
    const elapsed = Date.now() - startTime;

    // Capture snapshot every 5 minutes
    if (Date.now() - lastSnapshotTime >= SNAPSHOT_INTERVAL) {
      console.log(`[Playtest] === ${Math.floor(elapsed / 60000)} minutes elapsed ===`);
      const snapshot = captureSnapshot(baseGameLoop.world);
      snapshots.push(snapshot);
      console.log(`[Playtest] Population: ${snapshot.population}`);
      console.log(`[Playtest] Buildings: ${snapshot.buildings.length}`);
      console.log(`[Playtest] Resources: ${Object.keys(snapshot.resources).length} types`);
      console.log(`[Playtest] Agents with skills: ${snapshot.agents.filter(a => a.skillsLearned.length > 0).length}`);

      lastSnapshotTime = Date.now();
    }

    // Ask angel for status every 10 minutes
    if (Date.now() - lastAngelCheckTime >= 10 * 60 * 1000) {
      console.log(`[Playtest] Checking with angel...`);
      const angelResponse = await talkToAngel(baseGameLoop.world, "how are things going? any issues or cool stuff happening?");
      angelInteractions.push({
        timestamp: Date.now(),
        playerMessage: "how are things going? any issues or cool stuff happening?",
        angelResponse: angelResponse.response,
        eventsTriggered: angelResponse.events,
      });
      console.log(`[${angelName}]: ${angelResponse.response}`);
      console.log('');
      lastAngelCheckTime = Date.now();
    }

    // End after 30 minutes
    if (elapsed >= TOTAL_DURATION) {
      clearInterval(monitorInterval);
      await finishPlaytest();
    }
  }, 10000); // Check every 10 seconds

  async function finishPlaytest() {
    console.log('');
    console.log('[Playtest] === 30 MINUTES COMPLETE ===');
    console.log('[Playtest] Generating final report...');

    // Final snapshot
    const finalSnapshot = captureSnapshot(baseGameLoop.world);
    snapshots.push(finalSnapshot);

    // Ask angel for final thoughts
    const finalAngel = await talkToAngel(baseGameLoop.world, "ok, 30 minutes is up! what's your overall assessment? did the agents do well? any problems?");
    angelInteractions.push({
      timestamp: Date.now(),
      playerMessage: "ok, 30 minutes is up! what's your overall assessment? did the agents do well? any problems?",
      angelResponse: finalAngel.response,
      eventsTriggered: finalAngel.events,
    });

    headlessLoop.stop();

    // Generate report
    console.log('');
    console.log('='.repeat(80));
    console.log('PLAYTEST REPORT');
    console.log('='.repeat(80));
    console.log('');

    console.log('## Summary');
    console.log(`Session: ${sessionId}`);
    console.log(`Duration: 30 minutes (${baseGameLoop.world.tick} ticks)`);
    console.log(`Snapshots captured: ${snapshots.length}`);
    console.log('');

    console.log('## Population Progression');
    for (const snapshot of snapshots) {
      const minutesElapsed = Math.floor((snapshot.timestamp - startTime) / 60000);
      console.log(`  ${minutesElapsed}min: ${snapshot.population} agents, ${snapshot.buildings.length} buildings`);
    }
    console.log('');

    console.log('## Agent Skills & Learning');
    const agentsWithSkills = finalSnapshot.agents.filter(a => a.skillsLearned.length > 0);
    console.log(`Agents that learned skills: ${agentsWithSkills.length}/${finalSnapshot.population}`);
    if (agentsWithSkills.length > 0) {
      const allSkills = new Set(agentsWithSkills.flatMap(a => a.skillsLearned));
      console.log(`Unique skills learned: ${Array.from(allSkills).join(', ')}`);
    }
    console.log('');

    console.log('## Building Construction');
    const buildingsBuilt = finalSnapshot.buildings.length - 3; // Minus starting buildings
    console.log(`New buildings constructed: ${buildingsBuilt}`);
    if (buildingsBuilt > 0) {
      const buildingTypes = finalSnapshot.buildings.reduce((acc, b) => {
        acc[b.type] = (acc[b.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`Building types: ${JSON.stringify(buildingTypes, null, 2)}`);
    }
    console.log('');

    console.log('## Resources & Economy');
    console.log(`Resource types in storage: ${Object.keys(finalSnapshot.resources).length}`);
    if (Object.keys(finalSnapshot.resources).length > 0) {
      console.log(`Resources: ${JSON.stringify(finalSnapshot.resources, null, 2)}`);
    }
    console.log('');

    console.log('## Angel Interactions');
    console.log(`Messages exchanged: ${angelInteractions.length}`);
    for (const interaction of angelInteractions) {
      const minutesElapsed = Math.floor((interaction.timestamp - startTime) / 60000);
      console.log(`\n[${minutesElapsed}min] Player: ${interaction.playerMessage}`);
      console.log(`[${minutesElapsed}min] ${angelName}: ${interaction.angelResponse}`);
      if (interaction.eventsTriggered.length > 0) {
        console.log(`           Commands: ${interaction.eventsTriggered.join(', ')}`);
      }
    }
    console.log('');

    console.log('## Final Assessment');
    console.log(`Angel's verdict: ${finalAngel.response}`);
    console.log('');

    console.log('## Issues Identified');
    const issues: string[] = [];
    if (buildingsBuilt === 0) {
      issues.push('❌ No new buildings constructed - agents may not be able to build');
    } else {
      console.log('✓ Agents successfully built new buildings');
    }

    if (agentsWithSkills.length === 0) {
      issues.push('❌ No agents learned skills - learning system may not be working');
    } else {
      console.log(`✓ ${agentsWithSkills.length} agents learned skills autonomously`);
    }

    if (Object.keys(finalSnapshot.resources).length <= 1) {
      issues.push('❌ Very few resource types gathered - resource gathering may be limited');
    } else {
      console.log(`✓ Agents gathered ${Object.keys(finalSnapshot.resources).length} different resource types`);
    }

    if (finalSnapshot.population < 5) {
      issues.push('⚠️  Population declined significantly - agents may be dying');
    } else if (finalSnapshot.population === 8) {
      console.log('✓ Population stable (no deaths)');
    }

    if (issues.length > 0) {
      console.log('');
      console.log('Issues Found:');
      for (const issue of issues) {
        console.log(`  ${issue}`);
      }
    }
    console.log('');

    console.log('## Is This Game Fun?');
    console.log('Based on observable behavior:');
    console.log(`  Autonomy: ${agentsWithSkills.length > 0 ? 'HIGH - agents learning on their own' : 'LOW - no autonomous learning'}`);
    console.log(`  Progression: ${buildingsBuilt > 0 ? 'YES - town is growing' : 'NO - no growth observed'}`);
    console.log(`  Emergent gameplay: ${angelInteractions.some(i => i.angelResponse.toLowerCase().includes('cool') || i.angelResponse.toLowerCase().includes('interesting')) ? 'YES - angel noticed interesting events' : 'UNKNOWN - need longer observation'}`);
    console.log('');

    console.log('='.repeat(80));
    console.log(`Full metrics: curl "http://localhost:8766/dashboard?session=${sessionId}"`);
    console.log('='.repeat(80));

    process.exit(0);
  }

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\n[Playtest] Interrupted - generating report...');
    await finishPlaytest();
  });
  process.on('SIGTERM', async () => {
    console.log('\n[Playtest] Terminated - generating report...');
    await finishPlaytest();
  });
}

main().catch((error) => {
  console.error('[Playtest] Fatal error:', error);
  process.exit(1);
});
