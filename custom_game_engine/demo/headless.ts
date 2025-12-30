/**
 * Headless Game Entry Point
 *
 * This file is meant to be run with tsx from the demo folder where
 * workspace resolution works properly.
 *
 * Usage from custom_game_engine/:
 *   npx tsx demo/headless.ts --session-id=my_session_123
 */

import {
  GameLoop,
  AgentBrainSystem,
  MovementSystem,
  NeedsSystem,
  MemorySystem,
  MemoryFormationSystem,
  MemoryConsolidationSystem,
  ReflectionSystem,
  JournalingSystem,
  CommunicationSystem,
  BuildingSystem,
  ResourceGatheringSystem,
  BuildingBlueprintRegistry,
  registerShopBlueprints,
  TemperatureSystem,
  WeatherSystem,
  SoilSystem,
  PlantSystem,
  PlantComponent,
  TimeSystem,
  SleepSystem,
  AnimalSystem,
  AnimalProductionSystem,
  TamingSystem,
  WildAnimalSpawningSystem,
  AnimalBrainSystem,
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
  SteeringSystem,
  ExplorationSystem,
  LandmarkNamingSystem,
  VerificationSystem,
  SocialGradientSystem,
  BeliefFormationSystem,
  BeliefGenerationSystem,
  PrayerSystem,
  PrayerAnsweringSystem,
  MythGenerationSystem,
  SpatialMemoryQuerySystem,
  DeityEmergenceSystem,
  AIGodBehaviorSystem,
  TempleSystem,
  PriesthoodSystem,
  RitualSystem,
  HolyTextSystem,
  AvatarSystem,
  AngelSystem,
  SchismSystem,
  SyncretismSystem,
  ReligiousCompetitionSystem,
  ConversionWarfareSystem,
  TerrainModificationSystem,
  SpeciesCreationSystem,
  DivineWeatherControl,
  MassEventSystem,
  CraftingSystem,
  initializeDefaultRecipes,
  globalRecipeRegistry,
  SkillSystem,
  CookingSystem,
  IdleBehaviorSystem,
  GoalGenerationSystem,
  TradingSystem,
  MarketEventSystem,
  ResearchSystem,
  registerDefaultResearch,
  MetricsCollectionSystem,
  LiveEntityAPI,
  GovernanceDataSystem,
  registerDefaultMaterials,
} from '../packages/core/src/index.ts';

import {
  OllamaProvider,
  OpenAICompatProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  type LLMProvider,
} from '../packages/llm/src/index.ts';

import {
  createLLMAgent,
  getPlantSpecies,
  getWildSpawnableSpecies,
} from '../packages/world/src/index.ts';

// ============================================================================
// HEADLESS GAME LOOP
// ============================================================================

class HeadlessGameLoop {
  private gameLoop: GameLoop;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private targetFps = 30;
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

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = Date.now();

    const frameTime = 1000 / this.targetFps;
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      try {
        (this.gameLoop as any).tick(deltaTime);
      } catch (error) {
        console.error('[HeadlessGame] Error in game tick:', error);
      }
    }, frameTime);

    console.log(`[HeadlessGame] Started at ${this.targetFps} FPS`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    console.log('[HeadlessGame] Stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}

// ============================================================================
// SYSTEM REGISTRATION
// ============================================================================

async function registerAllSystems(
  gameLoop: GameLoop,
  llmQueue: LLMDecisionQueue | null,
  promptBuilder: StructuredPromptBuilder | null,
  sessionId: string
): Promise<{
  soilSystem: SoilSystem;
  plantSystem: PlantSystem;
  craftingSystem: CraftingSystem;
  wildAnimalSpawning: WildAnimalSpawningSystem;
  metricsSystem: MetricsCollectionSystem;
}> {
  // Core systems
  gameLoop.systemRegistry.register(new TimeSystem());
  gameLoop.systemRegistry.register(new WeatherSystem());
  gameLoop.systemRegistry.register(new TemperatureSystem());

  const soilSystem = new SoilSystem();
  gameLoop.systemRegistry.register(soilSystem);

  // Action handlers
  gameLoop.actionRegistry.register(new TillActionHandler(soilSystem));
  gameLoop.actionRegistry.register(new PlantActionHandler());
  gameLoop.actionRegistry.register(new GatherSeedsActionHandler());
  gameLoop.actionRegistry.register(new HarvestActionHandler());

  // Plant system
  const plantSystem = new PlantSystem(gameLoop.world.eventBus);
  plantSystem.setSpeciesLookup(getPlantSpecies);
  gameLoop.systemRegistry.register(plantSystem);

  // Animal systems
  gameLoop.systemRegistry.register(new AnimalBrainSystem());
  gameLoop.systemRegistry.register(new AnimalSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new AnimalProductionSystem(gameLoop.world.eventBus));
  const wildAnimalSpawning = new WildAnimalSpawningSystem();
  gameLoop.systemRegistry.register(wildAnimalSpawning);

  // Idle Behaviors & Goals
  gameLoop.systemRegistry.register(new IdleBehaviorSystem());
  gameLoop.systemRegistry.register(new GoalGenerationSystem(gameLoop.world.eventBus));

  // AI system
  gameLoop.systemRegistry.register(new AgentBrainSystem(llmQueue, promptBuilder));

  // Navigation & Exploration
  gameLoop.systemRegistry.register(new SocialGradientSystem());
  gameLoop.systemRegistry.register(new ExplorationSystem());
  gameLoop.systemRegistry.register(new LandmarkNamingSystem(llmQueue));
  gameLoop.systemRegistry.register(new SteeringSystem());
  gameLoop.systemRegistry.register(new VerificationSystem());
  gameLoop.systemRegistry.register(new CommunicationSystem());
  gameLoop.systemRegistry.register(new NeedsSystem());
  gameLoop.systemRegistry.register(new SleepSystem());
  gameLoop.systemRegistry.register(new TamingSystem());
  gameLoop.systemRegistry.register(new BuildingSystem());

  // Materials & Crafting
  registerDefaultMaterials();
  initializeDefaultRecipes(globalRecipeRegistry);
  const craftingSystem = new CraftingSystem();
  craftingSystem.setRecipeRegistry(globalRecipeRegistry);
  gameLoop.systemRegistry.register(craftingSystem);

  // Skill systems
  gameLoop.systemRegistry.register(new SkillSystem());
  const cookingSystem = new CookingSystem();
  cookingSystem.setRecipeRegistry(globalRecipeRegistry);
  gameLoop.systemRegistry.register(cookingSystem);

  // Trading & Market
  gameLoop.systemRegistry.register(new TradingSystem());
  const marketEventSystem = new MarketEventSystem(gameLoop.world.eventBus);
  gameLoop.systemRegistry.register(marketEventSystem);

  // Research
  const researchSystem = new ResearchSystem();
  gameLoop.systemRegistry.register(researchSystem);
  registerDefaultResearch();

  // Resource gathering & Movement
  gameLoop.systemRegistry.register(new ResourceGatheringSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new MovementSystem());

  // Memory systems
  gameLoop.systemRegistry.register(new MemorySystem());
  gameLoop.systemRegistry.register(new MemoryFormationSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new SpatialMemoryQuerySystem());
  gameLoop.systemRegistry.register(new MemoryConsolidationSystem(gameLoop.world.eventBus));

  // Belief & Divinity
  gameLoop.systemRegistry.register(new BeliefFormationSystem());
  gameLoop.systemRegistry.register(new BeliefGenerationSystem());
  gameLoop.systemRegistry.register(new PrayerSystem());
  gameLoop.systemRegistry.register(new PrayerAnsweringSystem());
  gameLoop.systemRegistry.register(new MythGenerationSystem());
  gameLoop.systemRegistry.register(new DeityEmergenceSystem());
  gameLoop.systemRegistry.register(new AIGodBehaviorSystem());
  gameLoop.systemRegistry.register(new TempleSystem());
  gameLoop.systemRegistry.register(new PriesthoodSystem());
  gameLoop.systemRegistry.register(new RitualSystem());
  gameLoop.systemRegistry.register(new HolyTextSystem());
  gameLoop.systemRegistry.register(new AvatarSystem());
  gameLoop.systemRegistry.register(new AngelSystem());
  gameLoop.systemRegistry.register(new SchismSystem());
  gameLoop.systemRegistry.register(new SyncretismSystem());
  gameLoop.systemRegistry.register(new ReligiousCompetitionSystem());
  gameLoop.systemRegistry.register(new ConversionWarfareSystem());
  gameLoop.systemRegistry.register(new TerrainModificationSystem());
  gameLoop.systemRegistry.register(new SpeciesCreationSystem());
  gameLoop.systemRegistry.register(new DivineWeatherControl());
  gameLoop.systemRegistry.register(new MassEventSystem());

  // Reflection & Journaling
  gameLoop.systemRegistry.register(new ReflectionSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new JournalingSystem(gameLoop.world.eventBus));

  // Governance
  const governanceDataSystem = new GovernanceDataSystem();
  governanceDataSystem.initialize(gameLoop.world, gameLoop.world.eventBus);
  gameLoop.systemRegistry.register(governanceDataSystem);

  // Metrics system with provided session ID
  const metricsSystem = new MetricsCollectionSystem(gameLoop.world, {
    enabled: true,
    streaming: true,
    streamConfig: {
      serverUrl: 'ws://localhost:8765',
      batchSize: 10,
      flushInterval: 5000,
      gameSessionId: sessionId,
    },
  });
  gameLoop.systemRegistry.register(metricsSystem);

  // Live Entity API
  const streamClient = metricsSystem.getStreamClient();
  if (streamClient) {
    const liveEntityAPI = new LiveEntityAPI(gameLoop.world);
    if (promptBuilder) {
      liveEntityAPI.setPromptBuilder(promptBuilder);
    }
    liveEntityAPI.attach(streamClient);
    console.log('[HeadlessGame] Live Entity API attached');
  }

  return { soilSystem, plantSystem, craftingSystem, wildAnimalSpawning, metricsSystem };
}

// ============================================================================
// ENTITY CREATION
// ============================================================================

function createInitialBuildings(world: WorldMutator) {
  const campfire = new EntityImpl(createEntityId(), (world as any)._tick);
  campfire.addComponent(createBuildingComponent('campfire', 1, 100));
  campfire.addComponent(createPositionComponent(-3, -3));
  campfire.addComponent(createRenderableComponent('campfire', 'object'));
  (world as any)._addEntity(campfire);

  const tent = new EntityImpl(createEntityId(), (world as any)._tick);
  tent.addComponent(createBuildingComponent('tent', 1, 100));
  tent.addComponent(createPositionComponent(3, -3));
  tent.addComponent(createRenderableComponent('tent', 'object'));
  (world as any)._addEntity(tent);

  const storage = new EntityImpl(createEntityId(), (world as any)._tick);
  storage.addComponent(createBuildingComponent('storage-chest', 1, 100));
  storage.addComponent(createPositionComponent(0, -5));
  storage.addComponent(createRenderableComponent('storage-chest', 'object'));
  const inv = createInventoryComponent(20, 500);
  inv.slots[0] = { itemId: 'wood', quantity: 50 };
  storage.addComponent(inv);
  (world as any)._addEntity(storage);
}

function createInitialAgents(world: WorldMutator, count: number = 5) {
  const agentIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (i % 3 - 1) * 2 + Math.random() * 0.5;
    const y = (Math.floor(i / 3) - 0.5) * 2 + Math.random() * 0.5;
    const agentId = createLLMAgent(world, x, y, 2.0);
    agentIds.push(agentId);
  }
  return agentIds;
}

function createInitialPlants(world: WorldMutator) {
  const wildSpecies = getWildSpawnableSpecies();
  for (let i = 0; i < 25; i++) {
    const x = -15 + Math.random() * 30;
    const y = -15 + Math.random() * 30;
    const species = wildSpecies[Math.floor(Math.random() * wildSpecies.length)]!;
    const stage = 'mature';

    const plantEntity = new EntityImpl(createEntityId(), (world as any)._tick);
    const plantComponent = new PlantComponent({
      speciesId: species.id,
      position: { x, y },
      stage,
      stageProgress: 0,
      age: 20,
      generation: 0,
      health: 80 + Math.random() * 20,
      hydration: 50 + Math.random() * 30,
      nutrition: 50 + Math.random() * 30,
      genetics: { ...species.baseGenetics },
      seedsProduced: Math.floor(species.seedsPerPlant * species.baseGenetics.yieldAmount),
      fruitCount: species.id === 'berry-bush' ? 8 : 0,
    });
    (plantComponent as any).entityId = plantEntity.id;
    plantEntity.addComponent(plantComponent);
    plantEntity.addComponent(createPositionComponent(x, y));
    plantEntity.addComponent(createRenderableComponent(species.id, 'plant'));
    (world as any)._addEntity(plantEntity);
  }
}

function createInitialAnimals(world: WorldMutator, spawning: WildAnimalSpawningSystem) {
  const animals = [
    { species: 'chicken', position: { x: 3, y: 2 } },
    { species: 'sheep', position: { x: -4, y: 3 } },
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

// ============================================================================
// LLM SETUP
// ============================================================================

async function setupLLMProvider(): Promise<{
  provider: LLMProvider | null;
  queue: LLMDecisionQueue | null;
  promptBuilder: StructuredPromptBuilder | null;
}> {
  const isMac = process.platform === 'darwin';

  if (isMac) {
    try {
      const resp = await fetch('http://localhost:8080/v1/models');
      if (resp.ok) {
        console.log('[HeadlessGame] Using MLX server');
        const provider = new OpenAICompatProvider({
          baseUrl: 'http://localhost:8080',
          model: 'mlx-community/Qwen3-4B-Instruct-4bit',
        });
        return {
          provider,
          queue: new LLMDecisionQueue(provider, { maxConcurrent: 3 }),
          promptBuilder: new StructuredPromptBuilder(),
        };
      }
    } catch {
      console.log('[HeadlessGame] MLX not available');
    }
  }

  try {
    const resp = await fetch('http://localhost:11434/api/tags');
    if (resp.ok) {
      console.log('[HeadlessGame] Using Ollama');
      const provider = new OllamaProvider({ model: 'qwen3:1.7b' });
      return {
        provider,
        queue: new LLMDecisionQueue(provider, { maxConcurrent: 3 }),
        promptBuilder: new StructuredPromptBuilder(),
      };
    }
  } catch {
    console.log('[HeadlessGame] Ollama not available');
  }

  console.warn('[HeadlessGame] No LLM provider - running scripted');
  return { provider: null, queue: null, promptBuilder: null };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  let sessionId = `headless_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let agentCount = 5;

  for (const arg of args) {
    if (arg.startsWith('--session-id=')) sessionId = arg.split('=')[1]!;
    if (arg.startsWith('--agents=')) agentCount = parseInt(arg.split('=')[1]!, 10);
  }

  console.log('='.repeat(60));
  console.log('HEADLESS GAME SERVER');
  console.log('='.repeat(60));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Agent count: ${agentCount}`);
  console.log('');

  const { queue, promptBuilder } = await setupLLMProvider();

  const baseGameLoop = new GameLoop();
  const headlessLoop = new HeadlessGameLoop(baseGameLoop);

  // Register building blueprints (same as main.ts)
  const blueprintRegistry = new BuildingBlueprintRegistry();
  blueprintRegistry.registerDefaults();
  blueprintRegistry.registerExampleBuildings();
  registerShopBlueprints(blueprintRegistry);
  (baseGameLoop.world as any).buildingRegistry = blueprintRegistry;

  const worldEntity = new EntityImpl(createEntityId(), baseGameLoop.world.tick);
  worldEntity.addComponent(createTimeComponent(6, 600)); // Start at 6 AM, 600 ticks
  worldEntity.addComponent(createWeatherComponent('clear', 0, 120)); // Clear weather
  worldEntity.addComponent(createNamedLandmarksComponent());
  (baseGameLoop.world as any)._addEntity(worldEntity);
  (baseGameLoop.world as any)._worldEntityId = worldEntity.id;

  console.log('[HeadlessGame] Registering systems...');
  const { wildAnimalSpawning } = await registerAllSystems(baseGameLoop, queue, promptBuilder, sessionId);

  console.log('[HeadlessGame] Creating entities...');
  createInitialBuildings(baseGameLoop.world);
  createInitialAgents(baseGameLoop.world, agentCount);
  createInitialPlants(baseGameLoop.world);
  createInitialAnimals(baseGameLoop.world, wildAnimalSpawning);

  console.log('[HeadlessGame] Starting game loop...');
  headlessLoop.start();

  const shutdown = () => {
    console.log('\n[HeadlessGame] Shutting down...');
    headlessLoop.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('[HeadlessGame] Game running. Press Ctrl+C to stop.');
  console.log(`[HeadlessGame] Dashboard: curl "http://localhost:8766/dashboard?session=${sessionId}"`);
}

main().catch((error) => {
  console.error('[HeadlessGame] Fatal error:', error);
  process.exit(1);
});
