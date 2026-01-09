/**
 * Headless Game Server
 *
 * Runs the game simulation without rendering, connecting to the metrics server
 * for monitoring and control. Can be spawned by the dashboard.
 *
 * Usage:
 *   npx tsx scripts/headless-game.ts --session-id=my_session_123
 */

// Load environment variables from .env file
import 'dotenv/config';

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
  CourtshipSystem,
  ReproductionSystem,
  StateMutatorSystem,
} from '../packages/core/src/index.js';

import {
  OllamaProvider,
  OpenAICompatProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  LLMScheduler,
  type LLMProvider,
} from '../packages/llm/src/index.js';

import { ScheduledDecisionProcessor } from '../packages/core/src/decision/ScheduledDecisionProcessor.js';

import {
  derivePrioritiesFromSkills,
  generateRandomName,
  generateRandomStartingSkills,
} from '../packages/core/src/components/index.js';

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

  // StateMutatorSystem - Batched vector updates (required by many systems)
  const stateMutator = new StateMutatorSystem();
  gameLoop.systemRegistry.register(stateMutator);

  // TemperatureSystem - Uses StateMutatorSystem
  const temperatureSystem = new TemperatureSystem();
  temperatureSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(temperatureSystem);

  const soilSystem = new SoilSystem();
  gameLoop.systemRegistry.register(soilSystem);

  // Action handlers
  gameLoop.actionRegistry.register(new TillActionHandler(soilSystem));
  gameLoop.actionRegistry.register(new PlantActionHandler());
  gameLoop.actionRegistry.register(new GatherSeedsActionHandler());
  gameLoop.actionRegistry.register(new HarvestActionHandler());

  // Plant system - Uses StateMutatorSystem
  const plantSystem = new PlantSystem(gameLoop.world.eventBus);
  plantSystem.setSpeciesLookup(getPlantSpecies);
  plantSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(plantSystem);

  // Animal systems
  gameLoop.systemRegistry.register(new AnimalBrainSystem());
  const animalSystem = new AnimalSystem(gameLoop.world.eventBus);
  animalSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(animalSystem);
  gameLoop.systemRegistry.register(new AnimalProductionSystem(gameLoop.world.eventBus));
  const wildAnimalSpawning = new WildAnimalSpawningSystem();
  gameLoop.systemRegistry.register(wildAnimalSpawning);

  // Idle Behaviors & Personal Goals
  gameLoop.systemRegistry.register(new IdleBehaviorSystem());
  gameLoop.systemRegistry.register(new GoalGenerationSystem(gameLoop.world.eventBus));

  // AI system - Using ScheduledDecisionProcessor with three-layer LLM architecture
  // This enables intelligent layer selection: Autonomic (survival), Talker (goals/social), Executor (tasks)
  const llmScheduler = new LLMScheduler(llmQueue);
  const scheduledProcessor = new ScheduledDecisionProcessor(llmScheduler, llmQueue);
  gameLoop.systemRegistry.register(new AgentBrainSystem(llmQueue, promptBuilder, undefined, scheduledProcessor));

  // Navigation & Exploration systems
  gameLoop.systemRegistry.register(new SocialGradientSystem());
  gameLoop.systemRegistry.register(new ExplorationSystem());
  gameLoop.systemRegistry.register(new LandmarkNamingSystem(llmQueue));
  gameLoop.systemRegistry.register(new SteeringSystem());
  gameLoop.systemRegistry.register(new VerificationSystem());
  gameLoop.systemRegistry.register(new CommunicationSystem());

  // NeedsSystem - Uses StateMutatorSystem for batched decay
  const needsSystem = new NeedsSystem();
  needsSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(needsSystem);

  // SleepSystem - Uses StateMutatorSystem for batched sleep updates
  const sleepSystem = new SleepSystem();
  sleepSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(sleepSystem);

  gameLoop.systemRegistry.register(new TamingSystem());
  gameLoop.systemRegistry.register(new BuildingSystem());

  // Materials
  registerDefaultMaterials();

  // Crafting system
  initializeDefaultRecipes(globalRecipeRegistry);
  const craftingSystem = new CraftingSystem();
  craftingSystem.setRecipeRegistry(globalRecipeRegistry);
  gameLoop.systemRegistry.register(craftingSystem);
  // Note: craftingSystem is accessible via systemRegistry, not directly on world

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
  // Note: marketEventSystem is accessible via systemRegistry, not directly on world

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

  // Romance & Reproduction systems
  gameLoop.systemRegistry.register(new CourtshipSystem());
  gameLoop.systemRegistry.register(new ReproductionSystem());

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

  // Research bench for testing research system
  const researchBenchEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  researchBenchEntity.addComponent(createBuildingComponent('research-bench', 1, 100));
  researchBenchEntity.addComponent(createPositionComponent(5, 0));
  researchBenchEntity.addComponent(createRenderableComponent('research-bench', 'object'));
  (world as any)._addEntity(researchBenchEntity);
  console.log('[HeadlessGame] Created research bench at (5, 0) for testing');
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

    // Create LLM agent with farming skills
    const agentId = createLLMAgent(world, x, y, 2.0);
    const entity = world.getEntity(agentId);

    if (entity) {
      const agentEntity = entity as EntityImpl;

      // Get personality component (created by createLLMAgent)
      const personality = agentEntity.getComponent('personality');
      if (!personality) {
        throw new Error(`Agent ${agentId} missing personality component`);
      }

      // Generate farming-focused skills based on personality
      const skills = generateRandomStartingSkills(personality);
      skills.levels.farming = 3 + Math.floor(Math.random() * 2); // 3-4 farming skill
      skills.levels.gathering = 2 + Math.floor(Math.random() * 2); // 2-3 gathering skill
      skills.levels.building = 1 + Math.floor(Math.random() * 2); // 1-2 building skill

      // Give first agent research skills for testing research system
      if (i === 0) {
        skills.levels.research = 3; // Level 3 research (can see and use research action)
        console.log(`[HeadlessGame] Gave agent ${i} research level 3 for testing`);
      }

      // Update skills component
      agentEntity.updateComponent('skills', () => skills);

      // Derive priorities from farming skills (gives high farming priority)
      const priorities = derivePrioritiesFromSkills(skills);

      // Convert to LLM agent with farming priorities (full tier)
      agentEntity.updateComponent('agent', (current: any) => ({
        ...current,
        useLLM: true, // Use LLM for decision making
        tier: 'full', // Full tier = maximum LLM usage (idle: 5s, periodic: 5min, task complete)
        priorities, // Farming will be high priority
        thinkInterval: 40, // Think every 2 seconds
      }));

      // Give starting seeds to kickstart farming
      agentEntity.updateComponent('inventory', (inv: any) => {
        const inventory = { ...inv };
        // Add berry seeds
        const seedSlot = inventory.slots.find((s: any) => !s.itemId);
        if (seedSlot) {
          seedSlot.itemId = 'seed:berry-bush';
          seedSlot.quantity = 5;
        }
        return inventory;
      });
    }

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

function createInitialPlants(world: WorldMutator, agentCount: number = 5) {
  const wildSpecies = getWildSpawnableSpecies();
  // Scale berry bushes with NPC count: 4 berry bushes per NPC + some variety plants
  const berryBushCount = agentCount * 4;
  const varietyPlantCount = Math.floor(agentCount * 0.5);
  const plantCount = berryBushCount + varietyPlantCount;

  for (let i = 0; i < plantCount; i++) {
    const x = -15 + Math.random() * 30;
    const y = -15 + Math.random() * 30;

    // First 80% of plants are berry bushes, rest are variety
    const forceBerryBush = i < berryBushCount;
    let species;
    if (forceBerryBush) {
      species = wildSpecies.find(s => s.id === 'berry-bush')!;
    } else {
      species = wildSpecies[Math.floor(Math.random() * wildSpecies.length)]!;
    }
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

    // Start berry bushes with LOTS of fruit to sustain NPCs while planted crops grow
    const initialFruit = (stage === 'mature' && isEdibleSpecies) ? 20 + Math.floor(Math.random() * 20) : 0;

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

/**
 * Create pregenerated farms for larger settlements
 * Organized rows of mature berry bushes to sustain NPCs
 */
function createPregeneratedFarms(world: WorldMutator, agentCount: number = 5) {
  const wildSpecies = getWildSpawnableSpecies();
  const berryBushSpecies = wildSpecies.find(s => s.id === 'berry-bush');
  if (!berryBushSpecies) {
    throw new Error('Berry bush species not found');
  }

  // Scale farm size: 10 berry bushes per NPC for sustainable food production
  const bushesPerNPC = 10;
  const totalBushes = agentCount * bushesPerNPC;

  // Organize bushes in rows (grid layout like a real farm)
  const bushesPerRow = Math.ceil(Math.sqrt(totalBushes));
  const farmOriginX = 1; // Farm RIGHT AT SPAWN for immediate access
  const farmOriginY = 1;
  const spacing = 2.0; // Tighter spacing for dense farm

  let bushesCreated = 0;
  for (let row = 0; row < bushesPerRow && bushesCreated < totalBushes; row++) {
    for (let col = 0; col < bushesPerRow && bushesCreated < totalBushes; col++) {
      const x = farmOriginX + (col * spacing);
      const y = farmOriginY + (row * spacing);

      // All bushes are mature with abundant fruit
      const initialFruit = 40 + Math.floor(Math.random() * 21); // 40-60 berries per bush

      const plantEntity = new EntityImpl(createEntityId(), (world as any)._tick);
      const plantComponent = new PlantComponent({
        speciesId: 'berry-bush',
        position: { x, y },
        stage: 'mature',
        stageProgress: 0.8 + Math.random() * 0.2,
        age: 20 + Math.floor(Math.random() * 10),
        generation: 0,
        health: 90 + Math.random() * 10,
        hydration: 70 + Math.random() * 20,
        nutrition: 70 + Math.random() * 20,
        genetics: { ...berryBushSpecies.baseGenetics },
        seedsProduced: Math.floor(berryBushSpecies.seedsPerPlant * berryBushSpecies.baseGenetics.yieldAmount),
        fruitCount: initialFruit,
      });

      (plantComponent as any).entityId = plantEntity.id;
      plantEntity.addComponent(plantComponent);
      plantEntity.addComponent(createPositionComponent(x, y));
      plantEntity.addComponent(createRenderableComponent('berry-bush', 'plant'));
      (world as any)._addEntity(plantEntity);

      bushesCreated++;
    }
  }

  return {
    totalBushes: bushesCreated,
    estimatedBerries: bushesCreated * 50, // Average 50 berries per bush
    farmArea: { x: farmOriginX, y: farmOriginY, width: bushesPerRow * spacing, height: bushesPerRow * spacing },
  };
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

  // Try Groq first (from .env file)
  const groqApiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (groqApiKey) {
    try {
      console.log(`[HeadlessGame] Using Groq API with model: ${groqModel}`);
      const provider = new OpenAICompatProvider(
        groqModel,
        'https://api.groq.com/openai/v1',
        groqApiKey
      );
      const queue = new LLMDecisionQueue(provider, 3);
      const promptBuilder = new StructuredPromptBuilder();
      return { provider, queue, promptBuilder };
    } catch (error) {
      console.error('[HeadlessGame] Groq setup failed:', error);
    }
  }

  // Try MLX on macOS
  if (isMac) {
    try {
      const response = await fetch('http://localhost:8080/v1/models', { method: 'GET' });
      if (response.ok) {
        console.log('[HeadlessGame] Using MLX server');
        const provider = new OpenAICompatProvider(
          'mlx-community/Qwen3-4B-Instruct-4bit',
          'http://localhost:8080',
          '' // No API key for local MLX
        );
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
      const provider = new OllamaProvider({ model: 'qwen3:4b' });
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

  // Generate terrain (required for farming system to calculate tillable tiles)
  console.log('[HeadlessGame] Generating terrain...');
  const terrainGenerator = new TerrainGenerator('headless-farming-sim');
  const chunkManager = new ChunkManager(3); // Render distance 3

  // Generate initial 3x3 chunk grid around spawn
  for (let cy = -1; cy <= 1; cy++) {
    for (let cx = -1; cx <= 1; cx++) {
      const chunk = chunkManager.getChunk(cx, cy);
      terrainGenerator.generateChunk(chunk, baseGameLoop.world);
    }
  }

  // Attach terrain to world (enables world.getTileAt())
  (baseGameLoop.world as any).setChunkManager(chunkManager);
  (baseGameLoop.world as any).setTerrainGenerator(terrainGenerator);
  console.log('[HeadlessGame] Terrain ready - farming utilities can now detect tillable grass');

  // Set up building registry (for building placement/validation)
  const blueprintRegistry = new BuildingBlueprintRegistry();
  registerShopBlueprints(blueprintRegistry);
  (baseGameLoop.world as any).buildingRegistry = blueprintRegistry;

  // Set up world entity
  const worldEntity = new EntityImpl(createEntityId(), baseGameLoop.world.tick);
  worldEntity.addComponent(createTimeComponent());
  worldEntity.addComponent(createWeatherComponent('clear', 0, 0)); // Start with clear weather
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
  createInitialPlants(baseGameLoop.world, agentCount);

  // Create pregenerated farms for larger settlements
  const farmStats = createPregeneratedFarms(baseGameLoop.world, agentCount);
  console.log(`[HeadlessGame] Created pregenerated farm: ${farmStats.totalBushes} berry bushes (~${farmStats.estimatedBerries} berries)`);

  createInitialAnimals(baseGameLoop.world, wildAnimalSpawning);

  // Validate and fix broken plants
  console.log('[HeadlessGame] Validating plants...');
  const { validateAndFixPlants } = await import('./fix-broken-plants.js');
  const plantValidation = validateAndFixPlants(baseGameLoop.world);
  if (plantValidation.broken > 0) {
    console.log(`[HeadlessGame] Removed ${plantValidation.broken} broken plants`);
  }

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
