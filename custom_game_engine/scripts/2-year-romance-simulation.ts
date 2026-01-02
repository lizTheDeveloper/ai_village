/**
 * 2-Year NPC Romance & Reproduction Simulation
 *
 * Tests autonomous courtship, falling in love, and reproduction over 2 in-game years.
 *
 * Time calculations:
 * - 1 game day = 48 seconds (at 1x speed)
 * - 2 years = 730 days = ~35,040 seconds (~9.7 hours at 1x)
 * - At 10x speed: ~58 minutes
 * - At 20x speed: ~29 minutes
 *
 * Run with:
 *   npx tsx scripts/2-year-romance-simulation.ts --speed=10 --agents=20
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
  TemperatureSystem,
  WeatherSystem,
  SoilSystem,
  PlantSystem,
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
  // ROMANCE & REPRODUCTION SYSTEMS
  CourtshipSystem,
  ReproductionSystem,
} from '../packages/core/src/index.js';

import {
  OllamaProvider,
  OpenAICompatProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  type LLMProvider,
} from '../packages/llm/src/index.js';

import {
  createLLMAgent,
  getPlantSpecies,
  getWildSpawnableSpecies,
} from '../packages/world/src/index.js';

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
        console.error('[RomanceSimulation] Error in game tick:', error);
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

  setSpeed(multiplier: number): void {
    this.gameLoop.setSpeed(multiplier);
  }

  isRunning(): boolean {
    return this.running;
  }
}

// ============================================================================
// SYSTEM REGISTRATION WITH ROMANCE SYSTEMS
// ============================================================================

async function registerAllSystems(
  gameLoop: GameLoop,
  llmQueue: LLMDecisionQueue | null,
  promptBuilder: StructuredPromptBuilder | null,
  sessionId: string
): Promise<{
  soilSystem: SoilSystem;
  plantSystem: PlantSystem;
  courtshipSystem: CourtshipSystem;
  reproductionSystem: ReproductionSystem;
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
  gameLoop.systemRegistry.register(new WildAnimalSpawningSystem());

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
  gameLoop.systemRegistry.register(new TradingSystem());
  gameLoop.systemRegistry.register(new MarketEventSystem(gameLoop.world.eventBus));

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

  // Divinity systems
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
  gameLoop.systemRegistry.register(new ReflectionSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new JournalingSystem(gameLoop.world.eventBus));

  // ======================================================================
  // ROMANCE & REPRODUCTION SYSTEMS - THE STARS OF THIS SIMULATION!
  // ======================================================================

  console.log('[RomanceSimulation] ❤️  Registering Romance & Reproduction systems...');

  const reproductionSystem = new ReproductionSystem();
  gameLoop.systemRegistry.register(reproductionSystem);

  const courtshipSystem = new CourtshipSystem();
  gameLoop.systemRegistry.register(courtshipSystem);

  // Governance data system
  const governanceDataSystem = new GovernanceDataSystem();
  governanceDataSystem.initialize(gameLoop.world, gameLoop.world.eventBus);
  gameLoop.systemRegistry.register(governanceDataSystem);

  // Metrics system
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
  }

  return {
    soilSystem,
    plantSystem,
    courtshipSystem,
    reproductionSystem,
    metricsSystem,
  };
}

// ============================================================================
// ENTITY CREATION
// ============================================================================

function createInitialBuildings(world: WorldMutator) {
  const campfireEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  campfireEntity.addComponent(createBuildingComponent('campfire', 1, 100));
  campfireEntity.addComponent(createPositionComponent(-3, -3));
  campfireEntity.addComponent(createRenderableComponent('campfire', 'object'));
  (world as any)._addEntity(campfireEntity);

  const tentEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  tentEntity.addComponent(createBuildingComponent('tent', 1, 100));
  tentEntity.addComponent(createPositionComponent(3, -3));
  tentEntity.addComponent(createRenderableComponent('tent', 'object'));
  (world as any)._addEntity(tentEntity);

  const storageEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  storageEntity.addComponent(createBuildingComponent('storage-chest', 1, 100));
  storageEntity.addComponent(createPositionComponent(0, -5));
  storageEntity.addComponent(createRenderableComponent('storage-chest', 'object'));
  const storageInventory = createInventoryComponent(20, 500);
  storageInventory.slots[0] = { itemId: 'wood', quantity: 50 };
  storageEntity.addComponent(storageInventory);
  (world as any)._addEntity(storageEntity);
}

function createInitialAgents(world: WorldMutator, agentCount: number = 20) {
  const centerX = 0;
  const centerY = 0;
  const spread = 3;
  const agentIds: string[] = [];

  for (let i = 0; i < agentCount; i++) {
    const angle = (i / agentCount) * 2 * Math.PI;
    const radius = 5 + Math.random() * 3;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    const agentId = createLLMAgent(world, x, y, 2.0);
    agentIds.push(agentId);
  }

  return agentIds;
}

async function createInitialPlants(world: WorldMutator) {
  const wildSpecies = getWildSpawnableSpecies();
  const plantCount = 40;

  for (let i = 0; i < plantCount; i++) {
    const x = -20 + Math.random() * 40;
    const y = -20 + Math.random() * 40;
    const species = wildSpecies[Math.floor(Math.random() * wildSpecies.length)];
    if (!species) continue;

    const isEdibleSpecies = species.id === 'berry-bush';
    const stage = isEdibleSpecies ? 'mature' : 'vegetative';
    const age = stage === 'mature' ? 20 : 10;
    const initialFruit = (stage === 'mature' && isEdibleSpecies) ? 10 + Math.floor(Math.random() * 10) : 0;

    const plantEntity = new EntityImpl(createEntityId(), (world as any)._tick);
    const PlantComponent = (await import('../packages/core/src/components/PlantComponent.js')).PlantComponent;
    const plantComponent = new PlantComponent({
      speciesId: species.id,
      position: { x, y },
      stage,
      stageProgress: 0.5,
      age,
      generation: 0,
      health: 80 + Math.random() * 20,
      hydration: 60 + Math.random() * 30,
      nutrition: 60 + Math.random() * 30,
      genetics: { ...species.baseGenetics },
      seedsProduced: 0,
      fruitCount: initialFruit,
    });

    (plantComponent as any).entityId = plantEntity.id;
    plantEntity.addComponent(plantComponent);
    plantEntity.addComponent(createPositionComponent(x, y));
    plantEntity.addComponent(createRenderableComponent(species.id, 'plant'));
    (world as any)._addEntity(plantEntity);
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

  if (isMac) {
    try {
      const response = await fetch('http://localhost:8080/v1/models', { method: 'GET' });
      if (response.ok) {
        console.log('[RomanceSimulation] Using MLX server');
        const provider = new OpenAICompatProvider({
          baseUrl: 'http://localhost:8080',
          model: 'mlx-community/Qwen3-4B-Instruct-4bit',
        });
        const queue = new LLMDecisionQueue(provider, 3);
        const promptBuilder = new StructuredPromptBuilder();
        return { provider, queue, promptBuilder };
      }
    } catch {
      console.log('[RomanceSimulation] MLX not available, trying Ollama');
    }
  }

  try {
    const response = await fetch('http://localhost:11434/api/tags', { method: 'GET' });
    if (response.ok) {
      console.log('[RomanceSimulation] Using Ollama');
      const provider = new OllamaProvider({ model: 'qwen3:1.7b' });
      const queue = new LLMDecisionQueue(provider, 3);
      const promptBuilder = new StructuredPromptBuilder();
      return { provider, queue, promptBuilder };
    }
  } catch {
    console.log('[RomanceSimulation] Ollama not available');
  }

  console.warn('[RomanceSimulation] No LLM provider available - running in scripted mode');
  return { provider: null, queue: null, promptBuilder: null };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  let sessionId = `romance_sim_${Date.now()}`;
  let agentCount = 20;
  let speedMultiplier = 10;

  for (const arg of args) {
    if (arg.startsWith('--session-id=')) {
      sessionId = arg.split('=')[1]!;
    } else if (arg.startsWith('--agents=')) {
      agentCount = parseInt(arg.split('=')[1]!, 10);
    } else if (arg.startsWith('--speed=')) {
      speedMultiplier = parseInt(arg.split('=')[1]!, 10);
    }
  }

  console.log('='.repeat(70));
  console.log('❤️  2-YEAR ROMANCE & REPRODUCTION SIMULATION ❤️');
  console.log('='.repeat(70));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Agent count: ${agentCount}`);
  console.log(`Speed: ${speedMultiplier}x`);
  console.log('');
  console.log('📊 Time Calculation:');
  console.log(`  - 1 game day = 48 seconds (at 1x speed)`);
  console.log(`  - 2 years = 730 days = ${(730 * 48 / 60).toFixed(1)} minutes at 1x`);
  console.log(`  - At ${speedMultiplier}x: ${(730 * 48 / 60 / speedMultiplier).toFixed(1)} minutes`);
  console.log('');

  const { queue: llmQueue, promptBuilder } = await setupLLMProvider();

  const baseGameLoop = new GameLoop();
  const headlessLoop = new HeadlessGameLoop(baseGameLoop);

  const worldEntity = new EntityImpl(createEntityId(), baseGameLoop.world.tick);
  worldEntity.addComponent(createTimeComponent());
  worldEntity.addComponent(createWeatherComponent('clear', 0, 0));
  worldEntity.addComponent(createNamedLandmarksComponent());
  (baseGameLoop.world as any)._addEntity(worldEntity);
  (baseGameLoop.world as any)._worldEntityId = worldEntity.id;

  console.log('[RomanceSimulation] Registering systems...');
  await registerAllSystems(baseGameLoop, llmQueue, promptBuilder, sessionId);

  console.log('[RomanceSimulation] Creating initial entities...');
  createInitialBuildings(baseGameLoop.world);
  createInitialAgents(baseGameLoop.world, agentCount);
  await createInitialPlants(baseGameLoop.world);

  console.log('[RomanceSimulation] Setting speed to', speedMultiplier, 'x');
  headlessLoop.setSpeed(speedMultiplier);

  console.log('[RomanceSimulation] Starting simulation...');
  headlessLoop.start();

  console.log('');
  console.log('✨ Simulation running! ✨');
  console.log('');
  console.log('📊 Monitor the simulation:');
  console.log(`   curl "http://localhost:8766/dashboard?session=${sessionId}"`);
  console.log('');
  console.log('Press Ctrl+C to stop.');

  const shutdown = () => {
    console.log('\n[RomanceSimulation] Shutting down...');
    headlessLoop.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[RomanceSimulation] Fatal error:', error);
  process.exit(1);
});
