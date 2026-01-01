/**
 * Headless Game Server
 *
 * Runs the game simulation without rendering, connecting to the metrics server
 * for monitoring and control. Can be spawned by the dashboard.
 *
 * Usage:
 *   npx tsx scripts/headless-game.ts --session-id=my_session_123
 */

// Use relative imports to source files (same pattern as metrics-server.ts)
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
} from '../packages/core/src/index.js';

import {
  OllamaProvider,
  OpenAICompatProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  type LLMProvider,
} from '../packages/llm/src/index.js';

import {
  TerrainGenerator,
  ChunkManager,
  createLLMAgent,
  createBerryBush,
  getPlantSpecies,
  getWildSpawnableSpecies,
} from '../packages/world/src/index.js';

// ============================================================================
// HEADLESS GAME LOOP
// ============================================================================

/**
 * A game loop that runs without browser APIs, using setInterval.
 * Wraps the standard GameLoop but replaces requestAnimationFrame.
 */
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
        // Call the game loop's tick method directly
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

  setSpeed(multiplier: number): void {
    this.gameLoop.setSpeed(multiplier);
    console.log(`[HeadlessGame] Speed set to ${multiplier}x`);
  }

  isRunning(): boolean {
    return this.running;
  }
}

// ============================================================================
// SYSTEM REGISTRATION (from demo/main.ts)
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
  governanceDataSystem: GovernanceDataSystem;
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

  // Idle Behaviors & Personal Goals
  gameLoop.systemRegistry.register(new IdleBehaviorSystem());
  gameLoop.systemRegistry.register(new GoalGenerationSystem(gameLoop.world.eventBus));

  // AI system
  gameLoop.systemRegistry.register(new AgentBrainSystem(llmQueue, promptBuilder));

  // Navigation & Exploration systems
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

  // Materials
  registerDefaultMaterials();

  // Crafting system
  initializeDefaultRecipes(globalRecipeRegistry);
  const craftingSystem = new CraftingSystem();
  craftingSystem.setRecipeRegistry(globalRecipeRegistry);
  gameLoop.systemRegistry.register(craftingSystem);
  (gameLoop.world as any).craftingSystem = craftingSystem;

  // Skill systems
  gameLoop.systemRegistry.register(new SkillSystem());
  const cookingSystem = new CookingSystem();
  cookingSystem.setRecipeRegistry(globalRecipeRegistry);
  gameLoop.systemRegistry.register(cookingSystem);

  // Trading system
  const tradingSystem = new TradingSystem();
  gameLoop.systemRegistry.register(tradingSystem);

  // Market events
  const marketEventSystem = new MarketEventSystem(gameLoop.world.eventBus);
  gameLoop.systemRegistry.register(marketEventSystem);
  (gameLoop.world as any).marketEventSystem = marketEventSystem;

  // Research system
  const researchSystem = new ResearchSystem();
  gameLoop.systemRegistry.register(researchSystem);
  registerDefaultResearch();

  // Resource gathering
  gameLoop.systemRegistry.register(new ResourceGatheringSystem(gameLoop.world.eventBus));

  // Movement and memory
  gameLoop.systemRegistry.register(new MovementSystem());
  gameLoop.systemRegistry.register(new MemorySystem());
  gameLoop.systemRegistry.register(new MemoryFormationSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new SpatialMemoryQuerySystem());
  gameLoop.systemRegistry.register(new MemoryConsolidationSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new BeliefFormationSystem());
  gameLoop.systemRegistry.register(new BeliefGenerationSystem());
  gameLoop.systemRegistry.register(new PrayerSystem());
  gameLoop.systemRegistry.register(new PrayerAnsweringSystem());
  gameLoop.systemRegistry.register(new MythGenerationSystem());

  // Divinity Phase 4: Emergent Gods
  gameLoop.systemRegistry.register(new DeityEmergenceSystem());
  gameLoop.systemRegistry.register(new AIGodBehaviorSystem());

  // Divinity Phase 5: Religious Institutions
  gameLoop.systemRegistry.register(new TempleSystem());
  gameLoop.systemRegistry.register(new PriesthoodSystem());
  gameLoop.systemRegistry.register(new RitualSystem());
  gameLoop.systemRegistry.register(new HolyTextSystem());

  // Divinity Phase 6: Avatar System
  gameLoop.systemRegistry.register(new AvatarSystem());

  // Divinity Phase 7: Angels
  gameLoop.systemRegistry.register(new AngelSystem());

  // Divinity Phase 8: Advanced Theology
  gameLoop.systemRegistry.register(new SchismSystem());
  gameLoop.systemRegistry.register(new SyncretismSystem());
  gameLoop.systemRegistry.register(new ReligiousCompetitionSystem());
  gameLoop.systemRegistry.register(new ConversionWarfareSystem());

  // Divinity Phase 9: World Impact
  gameLoop.systemRegistry.register(new TerrainModificationSystem());
  gameLoop.systemRegistry.register(new SpeciesCreationSystem());
  gameLoop.systemRegistry.register(new DivineWeatherControl());
  gameLoop.systemRegistry.register(new MassEventSystem());

  gameLoop.systemRegistry.register(new ReflectionSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new JournalingSystem(gameLoop.world.eventBus));

  // Governance data system
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

  // Set up Live Entity API
  const streamClient = metricsSystem.getStreamClient();
  if (streamClient) {
    const liveEntityAPI = new LiveEntityAPI(gameLoop.world);
    if (promptBuilder) {
      liveEntityAPI.setPromptBuilder(promptBuilder);
    }
    liveEntityAPI.attach(streamClient);
    console.log('[HeadlessGame] Live Entity API attached for dashboard queries');
  }

  return {
    soilSystem,
    plantSystem,
    craftingSystem,
    wildAnimalSpawning,
    governanceDataSystem,
    metricsSystem,
  };
}

// ============================================================================
// ENTITY CREATION (from demo/main.ts)
// ============================================================================

function createInitialBuildings(world: WorldMutator) {
  // Campfire
  const campfireEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  campfireEntity.addComponent(createBuildingComponent('campfire', 1, 100));
  campfireEntity.addComponent(createPositionComponent(-3, -3));
  campfireEntity.addComponent(createRenderableComponent('campfire', 'object'));
  (world as any)._addEntity(campfireEntity);

  // Tent
  const tentEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  tentEntity.addComponent(createBuildingComponent('tent', 1, 100));
  tentEntity.addComponent(createPositionComponent(3, -3));
  tentEntity.addComponent(createRenderableComponent('tent', 'object'));
  (world as any)._addEntity(tentEntity);

  // Storage chest with initial resources
  const storageEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  storageEntity.addComponent(createBuildingComponent('storage-chest', 1, 100));
  storageEntity.addComponent(createPositionComponent(0, -5));
  storageEntity.addComponent(createRenderableComponent('storage-chest', 'object'));
  const storageInventory = createInventoryComponent(20, 500);
  storageInventory.slots[0] = { itemId: 'wood', quantity: 50 };
  storageEntity.addComponent(storageInventory);
  (world as any)._addEntity(storageEntity);
}

function createInitialAgents(world: WorldMutator, agentCount: number = 5) {
  const centerX = 0;
  const centerY = 0;
  const spread = 2;
  const agentIds: string[] = [];

  for (let i = 0; i < agentCount; i++) {
    const offsetX = (i % 3) - 1;
    const offsetY = Math.floor(i / 3) - 0.5;
    const x = centerX + offsetX * spread + Math.random() * 0.5;
    const y = centerY + offsetY * spread + Math.random() * 0.5;

    const agentId = createLLMAgent(world, x, y, 2.0);
    agentIds.push(agentId);
  }

  // Make one agent a leader
  const leaderIndex = Math.floor(Math.random() * agentIds.length);
  const leaderEntity = world.getEntity(agentIds[leaderIndex]!);
  if (leaderEntity) {
    const leader = leaderEntity as EntityImpl;
    leader.updateComponent('personality', (p: any) => ({
      ...p,
      leadership: 0.95,
      extraversion: Math.max(p.extraversion, 0.75),
      conscientiousness: Math.max(p.conscientiousness, 0.70),
    }));
  }

  return agentIds;
}

function createInitialPlants(world: WorldMutator) {
  const wildSpecies = getWildSpawnableSpecies();
  const plantCount = 25;

  for (let i = 0; i < plantCount; i++) {
    const x = -15 + Math.random() * 30;
    const y = -15 + Math.random() * 30;
    const species = wildSpecies[Math.floor(Math.random() * wildSpecies.length)]!;
    const isEdibleSpecies = species.id === 'berry-bush';

    let stage: 'sprout' | 'vegetative' | 'mature' | 'seeding' = 'mature';
    let stageProgress = 0;
    let age = 20;

    if (i < 5) {
      stage = i < 2 ? 'seeding' : 'mature';
      age = i < 2 ? 25 : 20;
      stageProgress = i < 2 ? 0.3 : 0.9;
    } else if (isEdibleSpecies) {
      stage = 'mature';
    } else {
      const stages: Array<'sprout' | 'vegetative' | 'mature'> = ['sprout', 'vegetative', 'vegetative', 'mature', 'mature'];
      stage = stages[Math.floor(Math.random() * stages.length)]!;
      age = stage === 'mature' ? 20 : (stage === 'vegetative' ? 10 : 5);
    }

    const yieldAmount = species.baseGenetics.yieldAmount;
    const initialSeeds = stage === 'seeding'
      ? Math.floor(species.seedsPerPlant * yieldAmount * 2)
      : (stage === 'mature' ? Math.floor(species.seedsPerPlant * yieldAmount) : 0);

    const initialFruit = (stage === 'mature' && isEdibleSpecies) ? 6 + Math.floor(Math.random() * 7) : 0;

    const plantEntity = new EntityImpl(createEntityId(), (world as any)._tick);
    const plantComponent = new PlantComponent({
      speciesId: species.id,
      position: { x, y },
      stage,
      stageProgress,
      age,
      generation: 0,
      health: 80 + Math.random() * 20,
      hydration: 50 + Math.random() * 30,
      nutrition: 50 + Math.random() * 30,
      genetics: { ...species.baseGenetics },
      seedsProduced: initialSeeds,
      fruitCount: initialFruit,
    });

    (plantComponent as any).entityId = plantEntity.id;
    plantEntity.addComponent(plantComponent);
    plantEntity.addComponent(createPositionComponent(x, y));
    plantEntity.addComponent(createRenderableComponent(species.id, 'plant'));
    (world as any)._addEntity(plantEntity);
  }
}

function createInitialAnimals(world: WorldMutator, spawningSystem: WildAnimalSpawningSystem) {
  const animalsToSpawn = [
    { species: 'chicken', position: { x: 3, y: 2 } },
    { species: 'sheep', position: { x: -4, y: 3 } },
    { species: 'rabbit', position: { x: 5, y: -2 } },
    { species: 'rabbit', position: { x: -3, y: -4 } },
  ];

  for (const animalData of animalsToSpawn) {
    try {
      spawningSystem.spawnSpecificAnimal(world, animalData.species, animalData.position);
    } catch (error) {
      console.error(`[HeadlessGame] Failed to spawn ${animalData.species}:`, error);
    }
  }
}

// ============================================================================
// LLM PROVIDER SETUP
// ============================================================================

async function setupLLMProvider(): Promise<{
  provider: LLMProvider | null;
  queue: LLMDecisionQueue | null;
  promptBuilder: StructuredPromptBuilder | null;
}> {
  const isMac = process.platform === 'darwin';

  // Try MLX first on macOS, then Ollama
  if (isMac) {
    try {
      const response = await fetch('http://localhost:8080/v1/models', { method: 'GET' });
      if (response.ok) {
        console.log('[HeadlessGame] Using MLX server');
        const provider = new OpenAICompatProvider({
          baseUrl: 'http://localhost:8080',
          model: 'mlx-community/Qwen3-4B-Instruct-4bit',
        });
        const queue = new LLMDecisionQueue(provider, 3);
        const promptBuilder = new StructuredPromptBuilder();
        return { provider, queue, promptBuilder };
      }
    } catch {
      console.log('[HeadlessGame] MLX not available, trying Ollama');
    }
  }

  // Try Ollama
  try {
    const response = await fetch('http://localhost:11434/api/tags', { method: 'GET' });
    if (response.ok) {
      console.log('[HeadlessGame] Using Ollama');
      const provider = new OllamaProvider({ model: 'qwen3:1.7b' });
      const queue = new LLMDecisionQueue(provider, 3);
      const promptBuilder = new StructuredPromptBuilder();
      return { provider, queue, promptBuilder };
    }
  } catch {
    console.log('[HeadlessGame] Ollama not available');
  }

  console.warn('[HeadlessGame] No LLM provider available - running in scripted mode');
  return { provider: null, queue: null, promptBuilder: null };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);
  let sessionId = `headless_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let agentCount = 5;

  for (const arg of args) {
    if (arg.startsWith('--session-id=')) {
      sessionId = arg.split('=')[1]!;
    } else if (arg.startsWith('--agents=')) {
      agentCount = parseInt(arg.split('=')[1]!, 10);
    }
  }

  console.log('='.repeat(60));
  console.log('HEADLESS GAME SERVER');
  console.log('='.repeat(60));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Agent count: ${agentCount}`);
  console.log('');

  // Set up LLM provider
  const { queue: llmQueue, promptBuilder } = await setupLLMProvider();

  // Create game loop
  const baseGameLoop = new GameLoop();
  const headlessLoop = new HeadlessGameLoop(baseGameLoop);

  // Building blueprints are auto-registered by World when needed
  // No need to manually register here

  // Set up world entity
  const worldEntity = new EntityImpl(createEntityId(), baseGameLoop.world.tick);
  worldEntity.addComponent(createTimeComponent());
  worldEntity.addComponent(createWeatherComponent());
  worldEntity.addComponent(createNamedLandmarksComponent());
  (baseGameLoop.world as any)._addEntity(worldEntity);
  (baseGameLoop.world as any)._worldEntityId = worldEntity.id;

  // Register all systems
  console.log('[HeadlessGame] Registering systems...');
  const { wildAnimalSpawning, metricsSystem } = await registerAllSystems(
    baseGameLoop,
    llmQueue,
    promptBuilder,
    sessionId
  );

  // Create initial entities
  console.log('[HeadlessGame] Creating initial entities...');
  createInitialBuildings(baseGameLoop.world);
  createInitialAgents(baseGameLoop.world, agentCount);
  createInitialPlants(baseGameLoop.world);
  createInitialAnimals(baseGameLoop.world, wildAnimalSpawning);

  // Start the game
  console.log('[HeadlessGame] Starting game loop...');
  headlessLoop.start();

  // Handle shutdown
  const shutdown = () => {
    console.log('\n[HeadlessGame] Shutting down...');
    headlessLoop.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  console.log('[HeadlessGame] Game running. Press Ctrl+C to stop.');
  console.log(`[HeadlessGame] View dashboard: curl "http://localhost:8766/dashboard?session=${sessionId}"`);
}

main().catch((error) => {
  console.error('[HeadlessGame] Fatal error:', error);
  process.exit(1);
});
