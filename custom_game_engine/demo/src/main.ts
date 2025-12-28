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
  SeedGatheringSystem,
  BuildingBlueprintRegistry,
  registerShopBlueprints,
  PlacementValidator,
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
  FERTILIZERS,
  createBuildingComponent,
  createPositionComponent,
  createRenderableComponent,
  createWeatherComponent,
  createInventoryComponent,
  EntityImpl,
  createEntityId,
  type World,
  type WorldMutator,
  // Navigation & Exploration systems
  SteeringSystem,
  ExplorationSystem,
  VerificationSystem,
  SocialGradientSystem,
  BeliefFormationSystem,
  SpatialMemoryQuerySystem,
  // Crafting systems (Phase 10)
  CraftingSystem,
  initializeDefaultRecipes,
  globalRecipeRegistry,
  // Trading system (Phase 12.7)
  TradingSystem,
  // Market Events system (Phase 12.8)
  MarketEventSystem,
  // Phase 13: Research & Discovery
  ResearchSystem,
  registerDefaultResearch,
  // Metrics Collection System (with streaming support)
  MetricsCollectionSystem,
} from '@ai-village/core';
import {
  Renderer,
  InputHandler,
  KeyboardRegistry,
  BuildingPlacementUI,
  AgentInfoPanel,
  AnimalInfoPanel,
  TileInspectorPanel,
  PlantInfoPanel,
  ResourcesPanel,
  SettingsPanel,
  MemoryPanel,
  RelationshipsPanel,
  NotificationsPanel,
  InventoryUI,
  CraftingPanelUI,
  ControlsPanel,
  EconomyPanel,
  WindowManager,
  MenuBar,
  AgentInfoPanelAdapter,
  AnimalInfoPanelAdapter,
  PlantInfoPanelAdapter,
  MemoryPanelAdapter,
  RelationshipsPanelAdapter,
  ResourcesPanelAdapter,
  SettingsPanelAdapter,
  TileInspectorPanelAdapter,
  InventoryUIAdapter,
  CraftingPanelUIAdapter,
  NotificationsPanelAdapter,
  EconomyPanelAdapter,
  ShopPanel,
  ShopPanelAdapter,
} from '@ai-village/renderer';
import {
  OllamaProvider,
  OpenAICompatProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  LoadBalancingProvider,
  promptLogger,
  type LLMProvider,
} from '@ai-village/llm';
import { TerrainGenerator, ChunkManager, createLLMAgent, createBerryBush } from '@ai-village/world';

/**
 * Phase 10 Demo (Sleep & Circadian Rhythm)
 * Tests day/night cycle, energy system, sleep behavior, and circadian rhythms.
 */

/**
 * Create initial buildings for playtest verification.
 * Per work order: "At least one building should be visible in the world"
 *
 * Uses the same pattern as createLLMAgent/createWanderingAgent:
 * 1. Create EntityImpl directly
 * 2. Add components
 * 3. Add to world using _addEntity
 */
function createInitialBuildings(world: WorldMutator) {
  // Create a completed campfire (provides warmth)
  // Position: Near spawn point (-3, -3) - offset from camera center to avoid overlapping agents
  const campfireEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  campfireEntity.addComponent(createBuildingComponent('campfire', 1, 100)); // 100% complete
  campfireEntity.addComponent(createPositionComponent(-3, -3));
  campfireEntity.addComponent(createRenderableComponent('campfire', 'object')); // Make it visible
  (world as any)._addEntity(campfireEntity);

  // Create a completed tent (provides shelter)
  // Position: Near campfire (3, -3)
  const tentEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  tentEntity.addComponent(createBuildingComponent('tent', 1, 100)); // 100% complete
  tentEntity.addComponent(createPositionComponent(3, -3));
  tentEntity.addComponent(createRenderableComponent('tent', 'object')); // Make it visible
  (world as any)._addEntity(tentEntity);

  // Create a completed storage-chest for agents to deposit items
  // Position: Near village (0, -5)
  const storageEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  storageEntity.addComponent(createBuildingComponent('storage-chest', 1, 100)); // 100% complete
  storageEntity.addComponent(createPositionComponent(0, -5));
  storageEntity.addComponent(createRenderableComponent('storage-chest', 'object')); // Make it visible
  const storageInventory = createInventoryComponent(20, 500); // Storage chest: 20 slots, 500 weight
  // Add starting resources: 50 wood
  storageInventory.slots[0] = { itemId: 'wood', quantity: 50 };
  storageEntity.addComponent(storageInventory);
  (world as any)._addEntity(storageEntity);

  // Create a building under construction (50% complete) for testing construction
  // Position: West of village (-8, 0)
  const constructionEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  constructionEntity.addComponent(createBuildingComponent('storage-box', 1, 50)); // 50% complete storage-box
  constructionEntity.addComponent(createPositionComponent(-8, 0));
  constructionEntity.addComponent(createRenderableComponent('storage-box', 'object')); // Make it visible
  constructionEntity.addComponent(createInventoryComponent(10, 200)); // Storage box: 10 slots, 200 weight
  (world as any)._addEntity(constructionEntity);
}

/**
 * Create initial agents for testing.
 * Spawns 10 LLM agents in a cluster near the campfire.
 */
function createInitialAgents(world: WorldMutator, dungeonMasterPrompt?: string) {
  const agentCount = 10;
  const centerX = 0; // Near camera center at (0, 0) for easier clicking
  const centerY = 0;
  const spread = 2; // Spread agents in a small area

  const agentIds: string[] = [];

  for (let i = 0; i < agentCount; i++) {
    // Distribute agents in a small cluster
    const offsetX = (i % 4) - 1.5; // -1.5 to 1.5
    const offsetY = Math.floor(i / 4) - 1; // -1 to 1.5
    const x = centerX + offsetX * spread + Math.random() * 0.5;
    const y = centerY + offsetY * spread + Math.random() * 0.5;

    const agentId = createLLMAgent(world, x, y, 2.0, dungeonMasterPrompt);
    agentIds.push(agentId);
  }

  // Choose one random agent to be the leader
  const leaderIndex = Math.floor(Math.random() * agentIds.length);
  const leaderId = agentIds[leaderIndex];
  const leaderEntity = world.getEntity(leaderId);

  if (leaderEntity) {
    // Update the leader's personality with high leadership trait
    const currentPersonality = leaderEntity.getComponent('personality') as any;
    if (currentPersonality) {
      leaderEntity.updateComponent('personality', (p: any) => ({
        ...p,
        leadership: 95, // Very high leadership
        extraversion: Math.max(p.extraversion, 75), // Leaders tend to be more social
        conscientiousness: Math.max(p.conscientiousness, 70), // Leaders tend to be organized
      }));
    }
  }
}

/**
 * Create initial wild plants for Phase 9 testing.
 * Spawns grass, wildflowers, and berry bushes across the terrain.
 */
async function createInitialPlants(world: WorldMutator) {
  // Import plant components and species
  const { PlantComponent } = await import('@ai-village/core');
  const { getWildSpawnableSpecies } = await import('@ai-village/world');

  const wildSpecies = getWildSpawnableSpecies();

  // Spawn 20-30 wild plants scattered across the terrain
  const plantCount = 25;
  for (let i = 0; i < plantCount; i++) {
    // Random position in the visible area (-20 to 20)
    const x = -15 + Math.random() * 30;
    const y = -15 + Math.random() * 30;

    // Pick a random wild species (grass, wildflower, berry bush)
    const species = wildSpecies[Math.floor(Math.random() * wildSpecies.length)];

    // Edible plants (berry bushes) always spawn mature at game start so agents have food
    // Non-edible plants can vary for visual diversity
    const isEdibleSpecies = species.id === 'berry-bush';

    // For seed system testing: create some plants in seeding stage or near transition
    // First 5 plants: mix of seeding (for immediate dispersal) and near-transition (for observation)
    let stage: 'sprout' | 'vegetative' | 'mature' | 'seeding';
    let stageProgress = 0;
    let age = 20;

    if (i < 5) {
      // First 5 plants are in varied states to demonstrate seed mechanics
      if (i < 2) {
        // First 2: already in seeding stage (will disperse seeds immediately)
        stage = 'seeding';
        age = 25;
        stageProgress = 0.3; // Partway through seeding stage
      } else {
        // Next 3: mature and near transition (will transition soon)
        stage = 'mature';
        age = 20;
        stageProgress = 0.9; // 90% of the way to seeding - will transition in ~1-2 game hours
      }
    } else if (isEdibleSpecies) {
      stage = 'mature'; // Always mature for food
      age = 20;
      stageProgress = 0;
    } else {
      // Non-edible: random stage for variety
      const stages: Array<'sprout' | 'vegetative' | 'mature'> = ['sprout', 'vegetative', 'vegetative', 'mature', 'mature'];
      stage = stages[Math.floor(Math.random() * stages.length)] as any;
      age = stage === 'mature' ? 20 : (stage === 'vegetative' ? 10 : 5);
      stageProgress = 0;
    }

    // Calculate initial seeds based on stage
    // Seeding stage would have produced seeds at mature AND when transitioning to seeding
    const yieldAmount = species.baseGenetics.yieldAmount;
    const initialSeeds = stage === 'seeding'
      ? Math.floor(species.seedsPerPlant * yieldAmount * 2) // Double seeds for seeding stage
      : (stage === 'mature' ? Math.floor(species.seedsPerPlant * yieldAmount) : 0);

    // Calculate initial fruitCount for mature berry bushes
    // Berry bushes spawn 6-12 flowers that become fruit
    // Mature bushes would have gone through flowering → fruiting transition
    const initialFruit = (stage === 'mature' && isEdibleSpecies)
      ? 6 + Math.floor(Math.random() * 7) // 6-12 fruit (same as flower spawn range)
      : 0;

    // Create plant entity
    const plantEntity = new EntityImpl(createEntityId(), (world as any)._tick);
    const plantComponent = new PlantComponent({
      speciesId: species.id,
      position: { x, y },
      stage,
      stageProgress, // Set explicit progress for seed testing
      age,
      generation: 0,
      health: 80 + Math.random() * 20,
      hydration: 50 + Math.random() * 30,
      nutrition: 50 + Math.random() * 30,
      genetics: { ...species.baseGenetics }, // Use species' base genetics
      seedsProduced: initialSeeds, // Pre-populate seeds for mature/seeding plants
      fruitCount: initialFruit // Pre-populate fruit for mature edible plants
    });

    // Store entity ID on plant for logging
    (plantComponent as any).entityId = plantEntity.id;

    plantEntity.addComponent(plantComponent);
    plantEntity.addComponent(createPositionComponent(x, y));
    plantEntity.addComponent(createRenderableComponent(species.id, 'plant'));
    (world as any)._addEntity(plantEntity);
  }
}

/**
 * Create initial wild animals for Phase 11 testing.
 * Uses WildAnimalSpawningSystem to spawn animals in chunks around the origin.
 * This function is called during demo initialization, not during normal chunk generation.
 */
async function createInitialAnimals(world: WorldMutator, spawningSystem: WildAnimalSpawningSystem) {
  // Spawn animals close to the origin (0, 0) where agents and camera start
  // This ensures they are visible immediately when the game loads
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
      console.error(`Failed to spawn ${animalData.species}:`, error);
    }
  }
}

// Helper functions for time manipulation (duplicated from TimeSystem for debug controls)
type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

function calculatePhase(timeOfDay: number): DayPhase {
  if (timeOfDay >= 5 && timeOfDay < 7) return 'dawn';
  if (timeOfDay >= 7 && timeOfDay < 17) return 'day';
  if (timeOfDay >= 17 && timeOfDay < 19) return 'dusk';
  return 'night'; // 19:00-5:00
}

function calculateLightLevel(timeOfDay: number, phase: DayPhase): number {
  switch (phase) {
    case 'dawn': {
      // 5:00-7:00: 0.3 → 1.0
      const progress = (timeOfDay - 5) / 2; // 0 to 1
      return 0.3 + (0.7 * progress);
    }
    case 'day':
      return 1.0;
    case 'dusk': {
      // 17:00-19:00: 1.0 → 0.1
      const progress = (timeOfDay - 17) / 2; // 0 to 1
      return 1.0 - (0.9 * progress);
    }
    case 'night':
      return 0.1;
  }
}

async function main() {
  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Create game loop
  const gameLoop = new GameLoop();

  // Create settings panel (ESC to toggle)
  const settingsPanel = new SettingsPanel();

  // If this is the first run (no DM prompt set), show settings and wait
  if (settingsPanel.getIsFirstRun()) {
    // Show settings modal and wait for configuration
    await new Promise<void>((resolve) => {
      const originalCallback = settingsPanel['onSettingsChange'];
      settingsPanel.setOnSettingsChange((newSettings) => {
        // Restore original callback for subsequent changes
        if (originalCallback) {
          settingsPanel.setOnSettingsChange(originalCallback);
        }
        resolve();
      });
      settingsPanel.show();
    });
  }

  const settings = settingsPanel.getSettings();

  // Create LLM provider based on settings
  let llmProvider: LLMProvider;
  if (settings.llm.provider === 'openai-compat') {
    llmProvider = new OpenAICompatProvider(
      settings.llm.model,
      settings.llm.baseUrl,
      settings.llm.apiKey
    );
  } else {
    llmProvider = new OllamaProvider(settings.llm.model, settings.llm.baseUrl);
  }

  // Check if provider is available before creating queue
  const isLLMAvailable = await llmProvider.isAvailable();
  let llmQueue: LLMDecisionQueue | null = null;
  let promptBuilder: StructuredPromptBuilder | null = null;

  if (isLLMAvailable) {
    // Use maxConcurrent=1 for turn-based conversation (prevents rate limiting and allows agents to hear each other's responses)
    llmQueue = new LLMDecisionQueue(llmProvider, 1);
    promptBuilder = new StructuredPromptBuilder();
  } else {
    console.warn(`[DEMO] LLM not available at ${settings.llm.baseUrl} - agents will use scripted behavior only`);
    console.warn('[DEMO] Press ESC to open settings and configure LLM provider');
  }

  // Handle settings changes (requires page reload for clean state)
  settingsPanel.setOnSettingsChange((newSettings) => {
    window.location.reload();
  });

  // Register systems (order: Time -> Weather -> Temperature -> Soil -> Plant -> Animal -> AnimalProduction -> AI -> Communication -> Needs -> Sleep -> Taming -> Building -> ResourceGathering -> Movement -> Memory)
  gameLoop.systemRegistry.register(new TimeSystem());
  gameLoop.systemRegistry.register(new WeatherSystem());
  gameLoop.systemRegistry.register(new TemperatureSystem());
  const soilSystemInstance = new SoilSystem();
  gameLoop.systemRegistry.register(soilSystemInstance);

  // Register action handlers
  gameLoop.actionRegistry.register(new TillActionHandler(soilSystemInstance));
  gameLoop.actionRegistry.register(new PlantActionHandler());
  gameLoop.actionRegistry.register(new GatherSeedsActionHandler());
  gameLoop.actionRegistry.register(new HarvestActionHandler());

  // Register PlantSystem and inject species lookup
  const plantSystem = new PlantSystem(gameLoop.world.eventBus);
  const { getPlantSpecies } = await import('@ai-village/world');
  plantSystem.setSpeciesLookup(getPlantSpecies);
  gameLoop.systemRegistry.register(plantSystem);

  // Register Animal systems (after environment systems, before AI)
  // AnimalBrainSystem handles behavior execution (priority 12)
  // AnimalSystem handles needs/lifecycle (priority 15)
  gameLoop.systemRegistry.register(new AnimalBrainSystem());
  gameLoop.systemRegistry.register(new AnimalSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new AnimalProductionSystem(gameLoop.world.eventBus));
  const wildAnimalSpawning = new WildAnimalSpawningSystem();
  gameLoop.systemRegistry.register(wildAnimalSpawning);

  gameLoop.systemRegistry.register(new AgentBrainSystem(llmQueue, promptBuilder));
  // Navigation & Exploration systems (after AI, before Movement)
  gameLoop.systemRegistry.register(new SocialGradientSystem());
  gameLoop.systemRegistry.register(new ExplorationSystem());
  gameLoop.systemRegistry.register(new SteeringSystem());
  gameLoop.systemRegistry.register(new VerificationSystem());
  gameLoop.systemRegistry.register(new CommunicationSystem());
  gameLoop.systemRegistry.register(new NeedsSystem());
  gameLoop.systemRegistry.register(new SleepSystem());
  gameLoop.systemRegistry.register(new TamingSystem());
  gameLoop.systemRegistry.register(new BuildingSystem());

  // Initialize crafting system with recipes (Phase 10)
  initializeDefaultRecipes(globalRecipeRegistry);
  const craftingSystem = new CraftingSystem();
  craftingSystem.setRecipeRegistry(globalRecipeRegistry);
  gameLoop.systemRegistry.register(craftingSystem);
  // Make crafting system accessible on world for behaviors
  (gameLoop.world as any).craftingSystem = craftingSystem;

  // Register TradingSystem (Phase 12.7)
  const tradingSystem = new TradingSystem();
  gameLoop.systemRegistry.register(tradingSystem);

  // Register MarketEventSystem (Phase 12.8)
  const marketEventSystem = new MarketEventSystem(gameLoop.world.eventBus);
  gameLoop.systemRegistry.register(marketEventSystem);
  // Make market event system accessible for trading system integration
  (gameLoop.world as any).marketEventSystem = marketEventSystem;

  // Register ResearchSystem (Phase 13)
  const researchSystem = new ResearchSystem();
  gameLoop.systemRegistry.register(researchSystem);
  // Initialize default research tech tree
  registerDefaultResearch();

  gameLoop.systemRegistry.register(new ResourceGatheringSystem(gameLoop.world.eventBus));

  // Register SeedGatheringSystem and inject species data
  const seedGatheringSystem = new SeedGatheringSystem();
  // Register plant species so the system can calculate seed yields
  const { GRASS, BERRY_BUSH, WILDFLOWER } = await import('@ai-village/world');
  seedGatheringSystem.registerPlantSpecies(GRASS);
  seedGatheringSystem.registerPlantSpecies(BERRY_BUSH);
  seedGatheringSystem.registerPlantSpecies(WILDFLOWER);
  gameLoop.systemRegistry.register(seedGatheringSystem);

  gameLoop.systemRegistry.register(new MovementSystem());
  gameLoop.systemRegistry.register(new MemorySystem());

  // Register episodic memory systems (Phase 10)
  gameLoop.systemRegistry.register(new MemoryFormationSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new SpatialMemoryQuerySystem());
  gameLoop.systemRegistry.register(new MemoryConsolidationSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new BeliefFormationSystem());
  gameLoop.systemRegistry.register(new ReflectionSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new JournalingSystem(gameLoop.world.eventBus));

  // Metrics Collection System with streaming to metrics server
  // Start the metrics server with: npm run metrics-server
  const metricsSystem = new MetricsCollectionSystem(gameLoop.world, {
    enabled: true,
    streaming: true,
    streamConfig: {
      serverUrl: 'ws://localhost:8765',
      batchSize: 10,
      flushInterval: 5000,
    },
  });
  gameLoop.systemRegistry.register(metricsSystem);

  // Create renderer
  const renderer = new Renderer(canvas);

  // Create input handler
  const inputHandler = new InputHandler(canvas, renderer.getCamera());

  // Create keyboard registry
  const keyboardRegistry = new KeyboardRegistry();

  // Register debug keyboard shortcuts
  keyboardRegistry.register('toggle_temperature', {
    key: 'T',
    shift: true,
    description: 'Toggle temperature overlay on tiles',
    category: 'Debug',
    handler: () => {
      renderer.toggleTemperatureOverlay();
      const enabled = renderer.isTemperatureOverlayEnabled();
      showNotification(
        enabled ? '🌡️ Temperature overlay ON' : '🌡️ Temperature overlay OFF',
        '#4FC3F7'
      );
      return true;
    },
  });

  // Create building placement system
  const blueprintRegistry = new BuildingBlueprintRegistry();
  blueprintRegistry.registerDefaults();
  blueprintRegistry.registerTier2Stations(); // Phase 10: Crafting Stations
  blueprintRegistry.registerTier3Stations(); // Phase 10: Advanced Crafting Stations
  blueprintRegistry.registerExampleBuildings(); // Examples for all 8 categories and 8 functions
  registerShopBlueprints(blueprintRegistry); // Phase 12.4: Shop Buildings
  // Make building registry accessible on world for behaviors (BuildBehavior needs this)
  (gameLoop.world as any).buildingRegistry = blueprintRegistry;

  const placementValidator = new PlacementValidator();

  const placementUI = new BuildingPlacementUI({
    registry: blueprintRegistry,
    validator: placementValidator,
    camera: renderer.getCamera(),
    eventBus: gameLoop.world.eventBus,
  });

  // Create agent info panel
  const agentInfoPanel = new AgentInfoPanel();

  // Set up reset priorities callback
  agentInfoPanel.setOnResetPriorities((entityId: string) => {
    const entity = gameLoop.world.getEntity(entityId);
    if (!entity) {
      console.warn('[Main] Cannot reset priorities: entity not found', entityId);
      return;
    }

    const entityImpl = entity as EntityImpl;
    const agent = entityImpl.getComponent('agent');
    if (!agent) {
      console.warn('[Main] Cannot reset priorities: no agent component', entityId);
      return;
    }

    // Reset all priorities to default balanced values
    entityImpl.updateComponent('agent', (current: any) => ({
      ...current,
      priorities: {
        gathering: 0.2,
        building: 0.2,
        farming: 0.2,
        social: 0.2,
        exploration: 0.2,
        rest: 0.2,
      },
    }));
  });

  // Create animal info panel
  const animalInfoPanel = new AnimalInfoPanel();

  // Create plant info panel
  const plantInfoPanel = new PlantInfoPanel();

  // Create resources panel (R to toggle)
  const resourcesPanel = new ResourcesPanel();

  // Create memory panel (M to toggle) - for playtesting Phase 10 episodic memory
  const memoryPanel = new MemoryPanel();

  // Create relationships panel (R to toggle) - social relationships and trust
  const relationshipsPanel = new RelationshipsPanel();

  // Create notifications panel (N to toggle) - persistent notifications log
  const notificationsPanel = new NotificationsPanel();

  // Create economy panel (E to toggle) - economy dashboard
  const economyPanel = new EconomyPanel();

  // Create shop panel (Phase 12.7) - trading interface
  const shopPanel = new ShopPanel();

  // Create inventory UI (I or Tab to toggle) - Phase 10 full-featured inventory
  const inventoryUI = new InventoryUI(canvas, gameLoop.world);

  // Create crafting UI (C to toggle) - Phase 10 crafting system
  const craftingUI = new CraftingPanelUI(gameLoop.world, canvas);

  // Generate terrain with trees and rocks first (so we can create tile inspector)
  const terrainGenerator = new TerrainGenerator('phase8-demo');
  const chunkManager = new ChunkManager(3); // Load 3 chunks in each direction

  // Generate a 3x3 grid of chunks around spawn (0,0)
  // Each chunk is 32x32 tiles
  for (let cy = -1; cy <= 1; cy++) {
    for (let cx = -1; cx <= 1; cx++) {
      const chunk = chunkManager.getChunk(cx, cy);
      terrainGenerator.generateChunk(chunk, gameLoop.world as WorldMutator);
    }
  }

  // Set chunk manager and terrain generator on world so getTileAt can access tiles
  // This fixes the tile lookup failure in ActionQueue validation
  (gameLoop.world as any).setChunkManager(chunkManager);
  (gameLoop.world as any).setTerrainGenerator(terrainGenerator);

  // Create tile inspector panel (now that chunkManager exists)
  const tileInspectorPanel = new TileInspectorPanel(
    gameLoop.world.eventBus,
    renderer.getCamera(),
    chunkManager,
    terrainGenerator // Pass terrainGenerator to ensure chunks are generated when accessed
  );

  // ===== WINDOW MANAGER SETUP =====
  // Create WindowManager to manage all UI panels
  const windowManager = new WindowManager(canvas);

  // Create MenuBar for window management
  const menuBar = new MenuBar(windowManager, canvas);

  // Set renderer for view toggle buttons
  menuBar.setRenderer(renderer);

  // Create adapters for all panels
  const agentInfoAdapter = new AgentInfoPanelAdapter(agentInfoPanel);
  const animalInfoAdapter = new AnimalInfoPanelAdapter(animalInfoPanel);
  const plantInfoAdapter = new PlantInfoPanelAdapter(plantInfoPanel);
  const memoryAdapter = new MemoryPanelAdapter(memoryPanel);
  const relationshipsAdapter = new RelationshipsPanelAdapter(relationshipsPanel);
  const resourcesAdapter = new ResourcesPanelAdapter(resourcesPanel);
  const notificationsAdapter = new NotificationsPanelAdapter(notificationsPanel);
  const economyAdapter = new EconomyPanelAdapter(economyPanel);
  const shopAdapter = new ShopPanelAdapter(shopPanel);
  const settingsAdapter = new SettingsPanelAdapter(settingsPanel);
  const tileInspectorAdapter = new TileInspectorPanelAdapter(tileInspectorPanel);
  const inventoryAdapter = new InventoryUIAdapter(inventoryUI);
  const craftingAdapter = new CraftingPanelUIAdapter(craftingUI);

  // Get CSS/logical dimensions (not physical canvas pixels which include DPI scaling)
  const canvasRect = canvas.getBoundingClientRect();
  const logicalWidth = canvasRect.width;
  const logicalHeight = canvasRect.height;

  // Initialize WindowManager with logical dimensions (fixes DPI mismatch)
  windowManager.handleCanvasResize(logicalWidth, logicalHeight);

  // Register windows with default positions using logical coordinates
  // Top-left zone: Agent Info (context-sensitive, shown when agent selected)
  windowManager.registerWindow('agent-info', agentInfoAdapter, {
    defaultX: 10,
    defaultY: 10,
    defaultWidth: 360,
    defaultHeight: 530,
    isDraggable: true,
    isResizable: true,
    minWidth: 300,
    minHeight: 400,
    showInWindowList: true,
    keyboardShortcut: 'A',
  });

  // Top-right zone: Animal Info (context-sensitive, shown when animal selected)
  windowManager.registerWindow('animal-info', animalInfoAdapter, {
    defaultX: logicalWidth - 320,
    defaultY: 10,
    defaultWidth: 300,
    defaultHeight: 400,
    isDraggable: true,
    isResizable: true,
    minWidth: 250,
    minHeight: 300,
    showInWindowList: true,
  });

  // Top-right zone: Plant Info (context-sensitive, shown when plant selected)
  windowManager.registerWindow('plant-info', plantInfoAdapter, {
    defaultX: logicalWidth - 340,
    defaultY: 50,
    defaultWidth: 320,
    defaultHeight: 480,
    isDraggable: true,
    isResizable: true,
    minWidth: 250,
    minHeight: 350,
    showInWindowList: true,
  });

  // Top-right zone: Resources Panel
  windowManager.registerWindow('resources', resourcesAdapter, {
    defaultX: logicalWidth - 260,
    defaultY: 10,
    defaultWidth: 250,
    defaultHeight: 200,
    isDraggable: true,
    isResizable: true,
    minWidth: 200,
    minHeight: 150,
    showInWindowList: true,
    keyboardShortcut: 'R',
  });

  // Bottom-left zone: Memory Panel
  windowManager.registerWindow('memory', memoryAdapter, {
    defaultX: 10,
    defaultY: logicalHeight - 610,
    defaultWidth: 400,
    defaultHeight: 600,
    isDraggable: true,
    isResizable: true,
    minWidth: 300,
    minHeight: 400,
    showInWindowList: true,
    keyboardShortcut: 'M',
  });

  // Relationships Panel (next to memory panel)
  windowManager.registerWindow('relationships', relationshipsAdapter, {
    defaultX: 420,
    defaultY: logicalHeight - 510,
    defaultWidth: 380,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 300,
    minHeight: 350,
    showInWindowList: true,
    keyboardShortcut: 'L',
  });

  // Bottom-right zone: Tile Inspector Panel
  windowManager.registerWindow('tile-inspector', tileInspectorAdapter, {
    defaultX: logicalWidth - 320,
    defaultY: logicalHeight - 410,
    defaultWidth: 300,
    defaultHeight: 400,
    isDraggable: true,
    isResizable: true,
    minWidth: 250,
    minHeight: 300,
    showInWindowList: true,
    keyboardShortcut: 'T',
  });

  // Center/Modal: Inventory (full-screen modal)
  windowManager.registerWindow('inventory', inventoryAdapter, {
    defaultX: 100,
    defaultY: 50,
    defaultWidth: logicalWidth - 200,
    defaultHeight: logicalHeight - 100,
    isDraggable: true,
    isResizable: true,
    minWidth: 400,
    minHeight: 300,
    isModal: true,
    showInWindowList: true,
    keyboardShortcut: 'I',
  });

  // Top-left zone: Settings Panel
  windowManager.registerWindow('settings', settingsAdapter, {
    defaultX: 10,
    defaultY: 10,
    defaultWidth: 400,
    defaultHeight: 300,
    isDraggable: true,
    isResizable: true,
    minWidth: 350,
    minHeight: 250,
    isModal: true,
    showInWindowList: true,
    keyboardShortcut: 'Escape',
  });

  // Center/Modal: Crafting Panel
  windowManager.registerWindow('crafting', craftingAdapter, {
    defaultX: 100,
    defaultY: 80,
    defaultWidth: 800,
    defaultHeight: 600,
    isDraggable: true,
    isResizable: true,
    minWidth: 600,
    minHeight: 400,
    isModal: true,
    showInWindowList: true,
    keyboardShortcut: 'C',
  });

  // Bottom-right: Notifications Panel (persistent notification log)
  windowManager.registerWindow('notifications', notificationsAdapter, {
    defaultX: logicalWidth - 420,
    defaultY: logicalHeight - 350,
    defaultWidth: 400,
    defaultHeight: 300,
    isDraggable: true,
    isResizable: true,
    minWidth: 300,
    minHeight: 200,
    showInWindowList: true,
    keyboardShortcut: 'N',
  });

  // Economy Panel (E to toggle) - market and economy dashboard
  windowManager.registerWindow('economy', economyAdapter, {
    defaultX: logicalWidth - 420,
    defaultY: logicalHeight - 520,
    defaultWidth: 400,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 350,
    minHeight: 400,
    showInWindowList: true,
    keyboardShortcut: 'E',
  });

  // Shop Panel (Phase 12.7) - trading interface (modal, centered)
  windowManager.registerWindow('shop', shopAdapter, {
    defaultX: (logicalWidth - 500) / 2,
    defaultY: (logicalHeight - 600) / 2,
    defaultWidth: 500,
    defaultHeight: 600,
    isDraggable: false,
    isModal: true,
    showInWindowList: false, // Opened on demand when clicking shops
  });

  // Controls/Help Panel - shows all keybindings
  const controlsPanel = new ControlsPanel(windowManager);
  windowManager.registerWindow('controls', controlsPanel, {
    defaultX: 10,
    defaultY: 50,
    defaultWidth: 300,
    defaultHeight: 500,
    isDraggable: true,
    isResizable: true,
    minWidth: 250,
    minHeight: 350,
    showInWindowList: true,
    keyboardShortcut: 'H',
  });

  // Load saved window positions from localStorage
  windowManager.loadLayout();

  // Listen for auto-close events to show notifications
  windowManager.on('window:auto-closed', (event: any) => {
    showNotification(`Closed "${event.windowTitle}" to make space`, '#FFA500');
  });

  // Add mouseup listener to end window dragging
  window.addEventListener('mouseup', () => {
    windowManager.handleDragEnd();
  });

  // Handle canvas resize for WindowManager
  window.addEventListener('resize', () => {
    const rect = canvas.getBoundingClientRect();
    windowManager.handleCanvasResize(rect.width, rect.height);
  });

  // Get SoilSystem instance to handle tile actions
  const soilSystem = gameLoop.systemRegistry
    .getSorted()
    .find((s) => s.id === 'soil') as any;

  if (!soilSystem) {
    console.warn('[Main] SoilSystem not found - soil actions will not work');
  }

  // Set up event listeners for soil actions from the UI
  const CHUNK_SIZE = 32;

  // Create notification display element
  const notificationEl = document.createElement('div');
  notificationEl.style.position = 'fixed';
  notificationEl.style.top = '50%';
  notificationEl.style.left = '50%';
  notificationEl.style.transform = 'translate(-50%, -50%)';
  notificationEl.style.padding = '20px 40px';
  notificationEl.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  notificationEl.style.color = '#FFFFFF';
  notificationEl.style.fontFamily = 'monospace';
  notificationEl.style.fontSize = '16px';
  notificationEl.style.borderRadius = '8px';
  notificationEl.style.border = '2px solid #8B4513';
  notificationEl.style.display = 'none';
  notificationEl.style.zIndex = '10000';
  notificationEl.style.pointerEvents = 'none';
  document.body.appendChild(notificationEl);

  let notificationTimeout: number | null = null;

  function showNotification(message: string, color: string = '#FFFFFF') {
    // Clear any existing timeout to prevent flickering
    if (notificationTimeout !== null) {
      clearTimeout(notificationTimeout);
    }

    notificationEl.textContent = message;
    notificationEl.style.borderColor = color;
    notificationEl.style.display = 'block';
    notificationEl.style.visibility = 'visible';  // Ensure visibility
    notificationEl.style.opacity = '1';  // Ensure opacity

    // Make error notifications more prominent
    if (color === '#FF0000') {
      notificationEl.style.fontSize = '18px';
      notificationEl.style.fontWeight = 'bold';
      notificationEl.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.5)';
    } else {
      notificationEl.style.fontSize = '16px';
      notificationEl.style.fontWeight = 'normal';
      notificationEl.style.boxShadow = 'none';
    }

    // Show error notifications longer (3s), success notifications normal duration (2s)
    const duration = color === '#FF0000' ? 3000 : 2000;

    notificationTimeout = window.setTimeout(() => {
      notificationEl.style.display = 'none';
      notificationTimeout = null;
    }, duration);
  }

  gameLoop.world.eventBus.subscribe('action:till', (event: any) => {
    const { x, y, agentId: requestedAgentId } = event.data;

    // Constant for max tilling distance (must be adjacent: distance ≤ √2 ≈ 1.414)
    const MAX_TILL_DISTANCE = Math.sqrt(2);

    // Use agentId from event data (autonomous tilling), or selected agent, or find nearest
    let agentId = requestedAgentId || agentInfoPanel.getSelectedEntity()?.id;
    let agentDistance = 0;

    if (!agentId) {
      // Find nearest agent to the target tile
      const agents = gameLoop.world.query().with('agent').with('position').executeEntities();
      let nearestAgent: any = null;
      let nearestDistance = Infinity;

      for (const agent of agents) {
        const pos = agent.getComponent('position') as any;
        if (pos) {
          const dx = pos.x - x;
          const dy = pos.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestAgent = agent;
          }
        }
      }

      if (nearestAgent) {
        agentId = nearestAgent.id;
        agentDistance = nearestDistance;
      } else {
        console.error(`[Main] Cannot till - no agents available`);
        showNotification('No agent available to till', '#FF0000');
        return;
      }
    } else {
      // Calculate distance for selected/requested agent
      const agent = gameLoop.world.getEntity(agentId);
      if (agent) {
        const pos = agent.getComponent('position') as any;
        if (pos) {
          const dx = pos.x - x;
          const dy = pos.y - y;
          agentDistance = Math.sqrt(dx * dx + dy * dy);
        }
      }
    }

    // Note: Distance check removed - pathfinding will handle movement if agent is far away
    // The check at line 653 below will trigger pathfinding if needed

    // Ensure chunk is generated before submitting action
    // This prevents errors when TillActionHandler tries to access the tile
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunk = chunkManager.getChunk(chunkX, chunkY);

    if (!chunk) {
      console.error(`[Main] Cannot till - chunk not found at (${chunkX}, ${chunkY})`);
      showNotification(`Cannot till - chunk not found`, '#FF0000');
      return;
    }

    // Generate chunk if needed (ensures biome data exists)
    if (!chunk.generated) {
      terrainGenerator.generateChunk(chunk, gameLoop.world as any);
    }

    // Check if agent is close enough to till (distance <= √2)
    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) {
      console.error(`[Main] Agent ${agentId} not found`);
      showNotification('Agent not found', '#FF0000');
      return;
    }

    const agentPos = agent.getComponent('position') as any;
    if (!agentPos) {
      console.error(`[Main] Agent ${agentId} has no position`);
      showNotification('Agent has no position', '#FF0000');
      return;
    }

    const dx = x - agentPos.x;
    const dy = y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MAX_TILL_DISTANCE) {
      // Agent is too far - TELEPORT them to an adjacent tile
      // This avoids pathfinding issues and ensures tilling always works

      // Find best adjacent position (closest to agent's current position)
      const adjacentOffsets = [
        { dx: 1, dy: 0 },   // right
        { dx: 0, dy: 1 },   // down
        { dx: -1, dy: 0 },  // left
        { dx: 0, dy: -1 },  // up
        { dx: 1, dy: 1 },   // diagonal down-right
        { dx: -1, dy: 1 },  // diagonal down-left
        { dx: 1, dy: -1 },  // diagonal up-right
        { dx: -1, dy: -1 }, // diagonal up-left
      ];

      let bestPos = { x: x + 1, y }; // default: to the right
      let bestDist = Infinity;

      for (const offset of adjacentOffsets) {
        const adjX = x + offset.dx;
        const adjY = y + offset.dy;
        const adjDx = adjX - agentPos.x;
        const adjDy = adjY - agentPos.y;
        const adjDist = Math.sqrt(adjDx * adjDx + adjDy * adjDy);

        if (adjDist < bestDist) {
          bestDist = adjDist;
          bestPos = { x: adjX, y: adjY };
        }
      }

      // Teleport agent to adjacent position (update position directly)
      const newChunkX = Math.floor(bestPos.x / 32);
      const newChunkY = Math.floor(bestPos.y / 32);
      agent.updateComponent('position', (current: any) => ({
        ...current,
        x: bestPos.x,
        y: bestPos.y,
        chunkX: newChunkX,
        chunkY: newChunkY,
      }));

      // Stop any existing movement
      agent.updateComponent('movement', (current: any) => ({
        ...current,
        targetX: null,
        targetY: null,
        velocityX: 0,
        velocityY: 0,
        isMoving: false,
      }));

      showNotification(`Agent moved to tile`, '#8B4513');

      // Now agent is adjacent - submit till action immediately
      // Fall through to the submission code below
    }

    // Agent is already adjacent - submit till action immediately
    try {
      const actionId = gameLoop.actionQueue.submit({
        type: 'till',
        actorId: agentId,
        targetPosition: { x, y },
        parameters: {},
        priority: 1,
      });

      // Get duration directly from the action handler to ensure consistency
      // This avoids duplicating logic and prevents UI/backend mismatches
      const tillHandler = gameLoop.actionQueue.getHandler('till');
      let durationSeconds = 20; // Fallback if handler not found

      if (tillHandler && typeof tillHandler.getDuration === 'function') {
        const durationTicks = tillHandler.getDuration(
          { id: actionId, type: 'till', actorId: agentId, targetPosition: { x, y }, status: 'pending' },
          gameLoop.world
        );
        durationSeconds = durationTicks / 20; // Convert ticks to seconds (20 TPS)
      } else {
        console.warn(`[Main] Could not get duration from till handler, using fallback: ${durationSeconds}s`);
      }

      showNotification(`Agent will till tile at (${x}, ${y}) (${durationSeconds}s)`, '#8B4513');
    } catch (err: any) {
      console.error(`[Main] Failed to submit till action: ${err.message}`);
      showNotification(`Failed to queue tilling: ${err.message}`, '#FF0000');
    }
  });

  // Handle action:plant event - submit plant action to ActionQueue
  gameLoop.world.eventBus.subscribe('action:plant', (event: any) => {
    const { x, y, agentId, seedType, speciesId } = event.data;

    // Verify agent exists
    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) {
      console.error(`[Main] Agent ${agentId} not found for planting`);
      return;
    }

    // Check agent is adjacent (distance <= √2)
    const agentPos = agent.getComponent('position') as any;
    if (!agentPos) {
      console.error(`[Main] Agent ${agentId} has no position`);
      return;
    }

    const dx = x - agentPos.x;
    const dy = y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MAX_PLANT_DISTANCE = Math.sqrt(2);

    if (distance > MAX_PLANT_DISTANCE) {
      console.warn(`[Main] Agent ${agentId.slice(0, 8)} is too far from plant target (${distance.toFixed(2)} > ${MAX_PLANT_DISTANCE.toFixed(2)})`);
      // Don't fail - the behavior should handle movement
      return;
    }

    // Submit plant action to ActionQueue
    try {
      const actionId = gameLoop.actionQueue.submit({
        type: 'plant',
        actorId: agentId,
        targetPosition: { x, y },
        parameters: { seedType },
        priority: 1,
      });

      // Get duration from handler
      const plantHandler = gameLoop.actionQueue.getHandler('plant');
      let durationSeconds = 3; // Fallback

      if (plantHandler && typeof plantHandler.getDuration === 'function') {
        const durationTicks = plantHandler.getDuration(
          { id: actionId, type: 'plant', actorId: agentId, targetPosition: { x, y }, status: 'pending' } as any,
          gameLoop.world
        );
        durationSeconds = durationTicks / 20;
      }

      showNotification(`Planting ${speciesId || 'seed'} at (${x}, ${y}) (${durationSeconds}s)`, '#228B22');
    } catch (err: any) {
      console.error(`[Main] Failed to submit plant action: ${err.message}`);
      showNotification(`Failed to queue planting: ${err.message}`, '#FF0000');
    }
  });

  gameLoop.world.eventBus.subscribe('action:gather_seeds', (event: any) => {
    const { agentId, plantId } = event.data;

    const MAX_GATHER_DISTANCE = Math.sqrt(2); // Must be adjacent (including diagonal)

    // Verify agent exists
    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) {
      console.error(`[Main] Agent ${agentId} not found for seed gathering`);
      return;
    }

    // Verify plant exists
    const plant = gameLoop.world.getEntity(plantId);
    if (!plant) {
      console.error(`[Main] Plant ${plantId} not found for seed gathering`);
      return;
    }

    // Get agent and plant positions
    const agentPos = agent.getComponent('position') as any;
    const plantPos = plant.getComponent('position') as any;

    if (!agentPos || !plantPos) {
      console.error(`[Main] Agent or plant missing position component`);
      return;
    }

    // Check if agent is close enough to gather
    const dx = plantPos.x - agentPos.x;
    const dy = plantPos.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MAX_GATHER_DISTANCE) {
      // Agent is too far - teleport them to an adjacent position

      // Find best adjacent position (closest to agent's current position)
      const adjacentOffsets = [
        { dx: 1, dy: 0 },   // right
        { dx: 0, dy: 1 },   // down
        { dx: -1, dy: 0 },  // left
        { dx: 0, dy: -1 },  // up
        { dx: 1, dy: 1 },   // diagonal down-right
        { dx: -1, dy: 1 },  // diagonal down-left
        { dx: 1, dy: -1 },  // diagonal up-right
        { dx: -1, dy: -1 }, // diagonal up-left
      ];

      let bestPos = { x: plantPos.x + 1, y: plantPos.y }; // default: to the right
      let bestDist = Infinity;

      for (const offset of adjacentOffsets) {
        const adjX = plantPos.x + offset.dx;
        const adjY = plantPos.y + offset.dy;
        const adjDx = adjX - agentPos.x;
        const adjDy = adjY - agentPos.y;
        const adjDist = Math.sqrt(adjDx * adjDx + adjDy * adjDy);

        if (adjDist < bestDist) {
          bestDist = adjDist;
          bestPos = { x: adjX, y: adjY };
        }
      }

      // Teleport agent to adjacent position
      const newChunkX = Math.floor(bestPos.x / 32);
      const newChunkY = Math.floor(bestPos.y / 32);
      agent.updateComponent('position', (current: any) => ({
        ...current,
        x: bestPos.x,
        y: bestPos.y,
        chunkX: newChunkX,
        chunkY: newChunkY,
      }));

      // Stop any existing movement
      agent.updateComponent('movement', (current: any) => ({
        ...current,
        targetX: null,
        targetY: null,
        velocityX: 0,
        velocityY: 0,
        isMoving: false,
      }));
    }

    // Agent is now adjacent - submit gather_seeds action to ActionQueue
    try {
      const actionId = gameLoop.actionQueue.submit({
        type: 'gather_seeds',
        actorId: agentId,
        targetId: plantId,
        parameters: {},
        priority: 1,
      });

      // Get duration from handler
      const gatherSeedsHandler = gameLoop.actionQueue.getHandler('gather_seeds');
      let durationSeconds = 5; // Fallback

      if (gatherSeedsHandler && typeof gatherSeedsHandler.getDuration === 'function') {
        const durationTicks = gatherSeedsHandler.getDuration(
          { id: actionId, type: 'gather_seeds', actorId: agentId, targetId: plantId, status: 'pending' },
          gameLoop.world
        );
        durationSeconds = durationTicks / 20; // Convert ticks to seconds (20 TPS)
      }

      const plantComponent = plant.getComponent('plant') as any;
      const speciesName = plantComponent?.speciesId || 'plant';
      showNotification(`Agent gathering seeds from ${speciesName} (${durationSeconds}s)`, '#228B22');
    } catch (err: any) {
      console.error(`[Main] Failed to submit gather_seeds action: ${err.message}`);
      showNotification(`Failed to gather seeds: ${err.message}`, '#FF0000');
    }
  });

  gameLoop.world.eventBus.subscribe('action:harvest', (event: any) => {
    const { agentId, plantId } = event.data;

    // Verify agent exists
    const agent = gameLoop.world.getEntity(agentId);
    if (!agent) {
      console.error(`[Main] Agent ${agentId} not found for harvesting`);
      return;
    }

    // Verify plant exists
    const plant = gameLoop.world.getEntity(plantId);
    if (!plant) {
      console.error(`[Main] Plant ${plantId} not found for harvesting`);
      return;
    }

    // Submit harvest action to ActionQueue
    try {
      const actionId = gameLoop.actionQueue.submit({
        type: 'harvest',
        actorId: agentId,
        targetId: plantId,
        parameters: {},
        priority: 1,
      });

      // Get duration from handler
      const harvestHandler = gameLoop.actionQueue.getHandler('harvest');
      let durationSeconds = 8; // Fallback

      if (harvestHandler && typeof harvestHandler.getDuration === 'function') {
        const durationTicks = harvestHandler.getDuration(
          { id: actionId, type: 'harvest', actorId: agentId, targetId: plantId, status: 'pending' },
          gameLoop.world
        );
        durationSeconds = durationTicks / 20; // Convert ticks to seconds (20 TPS)
      }

      const plantComponent = plant.getComponent('plant') as any;
      const speciesName = plantComponent?.speciesId || 'plant';
      showNotification(`Agent harvesting ${speciesName} (${durationSeconds}s)`, '#FF8C00');
    } catch (err: any) {
      console.error(`[Main] Failed to submit harvest action: ${err.message}`);
      showNotification(`Failed to harvest: ${err.message}`, '#FF0000');
    }
  });

  gameLoop.world.eventBus.subscribe('action:water', (event: any) => {
    if (!soilSystem) return;

    const { x, y } = event.data;

    // Get the tile from chunk manager
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = chunkManager.getChunk(chunkX, chunkY);
    if (!chunk) {
      console.error(`[Main] Cannot water - chunk not found at (${chunkX}, ${chunkY})`);
      showNotification(`Cannot water - chunk not found`, '#FF0000');
      return;
    }

    // Generate chunk if not already generated (ensures biome data)
    if (!chunk.generated) {
      terrainGenerator.generateChunk(chunk, gameLoop.world as any);
    }

    const tileIndex = localY * CHUNK_SIZE + localX;
    const tile = chunk.tiles[tileIndex];

    if (!tile) {
      console.error(`[Main] Cannot water - tile not found at (${x}, ${y})`);
      showNotification(`Cannot water - tile not found`, '#FF0000');
      return;
    }

    try {
      soilSystem.waterTile(gameLoop.world, tile, x, y);
      showNotification(`Watered tile at (${x}, ${y})`, '#1E90FF');

      // Refetch tile from chunk manager to get latest state after mutation
      const refreshedTile = chunk.tiles[tileIndex];
      if (refreshedTile) {
        tileInspectorPanel.setSelectedTile(refreshedTile, x, y);
      }
    } catch (err: any) {
      console.error(`[Main] Failed to water tile: ${err.message}`);
      showNotification(`Failed to water: ${err.message}`, '#FF0000');
    }
  });

  gameLoop.world.eventBus.subscribe('action:fertilize', (event: any) => {
    if (!soilSystem) return;

    const { x, y, fertilizerType } = event.data;

    // Get the tile from chunk manager
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = chunkManager.getChunk(chunkX, chunkY);
    if (!chunk) {
      console.error(`[Main] Cannot fertilize - chunk not found at (${chunkX}, ${chunkY})`);
      showNotification(`Cannot fertilize - chunk not found`, '#FF0000');
      return;
    }

    // Generate chunk if not already generated (ensures biome data)
    if (!chunk.generated) {
      terrainGenerator.generateChunk(chunk, gameLoop.world as any);
    }

    const tileIndex = localY * CHUNK_SIZE + localX;
    const tile = chunk.tiles[tileIndex];

    if (!tile) {
      console.error(`[Main] Cannot fertilize - tile not found at (${x}, ${y})`);
      showNotification(`Cannot fertilize - tile not found`, '#FF0000');
      return;
    }

    const fertilizer = FERTILIZERS[fertilizerType];

    if (!fertilizer) {
      console.error(`[Main] Unknown fertilizer type: ${fertilizerType}`);
      showNotification(`Unknown fertilizer: ${fertilizerType}`, '#FF0000');
      return;
    }

    try {
      soilSystem.fertilizeTile(gameLoop.world, tile, x, y, fertilizer);
      showNotification(`Applied ${fertilizerType} at (${x}, ${y})`, '#FFD700');

      // Refetch tile from chunk manager to get latest state after mutation
      const refreshedTile = chunk.tiles[tileIndex];
      if (refreshedTile) {
        tileInspectorPanel.setSelectedTile(refreshedTile, x, y);
      }
    } catch (err: any) {
      console.error(`[Main] Failed to fertilize tile: ${err.message}`);
      showNotification(`Failed to fertilize: ${err.message}`, '#FF0000');
    }
  });

  // Listen for action completion and failure events for debugging
  gameLoop.world.eventBus.subscribe('agent:action:completed', (event: any) => {
    const { actionType, actionId, success, reason } = event.data;

    if (actionType === 'till') {
      if (success) {
        showNotification('Tilling completed!', '#8B4513');
      } else {
        console.error(`[Main] ❌ Tilling action ${actionId} failed: ${reason}`);
        showNotification(`Tilling failed: ${reason}`, '#FF0000');
      }
    }
  });

  gameLoop.world.eventBus.subscribe('agent:action:started', (event: any) => {
    const { actionType, actionId } = event.data;
  });

  gameLoop.world.eventBus.subscribe('agent:action:failed', (event: any) => {
    console.error('[Main] ❌ Action failed:', event);
    const { actionType, actionId, reason } = event.data;

    if (actionType === 'till') {
      console.error(`[Main] ❌ Tilling action ${actionId} failed validation: ${reason}`);
      showNotification(`Cannot till: ${reason}`, '#FF0000');
    } else {
      showNotification(`Action failed: ${reason}`, '#FF0000');
    }
  });

  // Listen for soil events and show floating text
  gameLoop.world.eventBus.subscribe('soil:tilled', (event: any) => {
    const { position, fertility, biome } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add('Tilled', position.x * 16, position.y * 16, '#8B4513', 1500);

    // Add dust particle effect for visual feedback
    const particleRenderer = renderer.getParticleRenderer();
    // Position particles at tile center (world coordinates in pixels)
    const tileCenterX = position.x * 16 + 8; // Tile pixel position + half tile size
    const tileCenterY = position.y * 16 + 8;
    particleRenderer.createDustCloud(tileCenterX, tileCenterY, 25); // 25 dust particles (increased from 12 for better visibility)

    // Refresh tile inspector if this tile is currently selected
    const chunkX = Math.floor(position.x / CHUNK_SIZE);
    const chunkY = Math.floor(position.y / CHUNK_SIZE);
    const localX = ((position.x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((position.y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = chunkManager.getChunk(chunkX, chunkY);
    if (chunk) {
      const tileIndex = localY * CHUNK_SIZE + localX;
      const refreshedTile = chunk.tiles[tileIndex];
      if (refreshedTile) {
        tileInspectorPanel.setSelectedTile(refreshedTile, position.x, position.y);
      }
    }
  });

  gameLoop.world.eventBus.subscribe('soil:watered', (event: any) => {
    const { position } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add('+Water', position.x * 16, position.y * 16, '#1E90FF', 1500);
  });

  gameLoop.world.eventBus.subscribe('soil:fertilized', (event: any) => {
    const { position, fertilizerType } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add(`+${fertilizerType}`, position.x * 16, position.y * 16, '#FFD700', 1500);
  });

  // Listen for resource gathering events and show floating text
  gameLoop.world.eventBus.subscribe('resource:gathered', (event: any) => {
    const { agentId, resourceType, amount, sourceEntityId } = event.data;

    // Get the source entity (tree/rock) position
    const sourceEntity = gameLoop.world.getEntity(sourceEntityId);
    if (!sourceEntity) return;

    const position = sourceEntity.components.get('position') as { x: number; y: number } | undefined;
    if (!position) return;

    // Determine color and icon based on resource type
    const resourceColors: Record<string, string> = {
      wood: '#8B4513',
      stone: '#A0A0A0',
      food: '#00FF00',
      water: '#1E90FF',
    };

    const resourceIcons: Record<string, string> = {
      wood: '🪵',
      stone: '🪨',
      food: '🍎',
      water: '💧',
    };

    const color = resourceColors[resourceType] || '#FFFFFF';
    const icon = resourceIcons[resourceType] || '';
    const text = `+${amount} ${icon}`;

    // Add floating text at resource location
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add(text, position.x * 16, position.y * 16, color, 2000);
  });

  // Listen for plant lifecycle events and show floating text
  gameLoop.world.eventBus.subscribe('plant:stageChanged', (event: any) => {
    const { newStage, position } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();

    const stageEmojis: Record<string, string> = {
      'germinating': '🌱',
      'sprout': '🌱',
      'vegetative': '🌿',
      'flowering': '🌸',
      'fruiting': '🍇',
      'mature': '🌾',
      'seeding': '🌾',
      'senescence': '🍂',
      'decay': '🥀',
      'dead': '💀'
    };

    const emoji = stageEmojis[newStage] || '🌿';
    floatingTextRenderer.add(`${emoji} ${newStage}`, position.x * 16, position.y * 16, '#FFD700', 2000);
  });

  gameLoop.world.eventBus.subscribe('seed:dispersed', (event: any) => {
    const { position, speciesId, seed } = event.data;

    // REQUIRED: seed must be present in event data
    if (!seed) {
      throw new Error(`seed:dispersed event missing required seed object for ${speciesId} at (${position.x}, ${position.y})`);
    }
    if (!seed.genetics) {
      throw new Error(`seed:dispersed event seed missing required genetics for ${speciesId}`);
    }

    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add('🌰 Seed', position.x * 16, position.y * 16, '#8B4513', 1500);

    // Create a new plant entity from the dispersed seed
    // Dispersed seeds start in 'seed' stage and will germinate naturally
    const worldMutator = (gameLoop as any)._getWorldMutator();
    const plantEntity = worldMutator.createEntity();

    // Add PlantComponent with inherited genetics from seed
    const plantComponent = new PlantComponent({
      speciesId: speciesId,
      position: { x: position.x, y: position.y },
      stage: 'seed',
      age: 0,
      generation: seed.generation,
      genetics: seed.genetics,
      seedsProduced: 0,
      health: 100,
      hydration: 50,
      nutrition: 70,
    });
    worldMutator.addComponent(plantEntity.id, plantComponent);

    // Add PositionComponent
    const positionComponent = createPositionComponent({
      x: position.x,
      y: position.y,
    });
    worldMutator.addComponent(plantEntity.id, positionComponent);
  });

  gameLoop.world.eventBus.subscribe('seed:germinated', (event: any) => {
    const { position } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add('🌱 Germinated!', position.x * 16, position.y * 16, '#32CD32', 2000);
  });

  // Handle seed:planted event - create plant from agent-planted seed
  gameLoop.world.eventBus.subscribe('seed:planted', (event: any) => {
    const { speciesId, position, actorId } = event.data;
    const worldMutator = gameLoop.world as WorldMutator;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();

    // Get species data for proper plant initialization
    const species = getPlantSpecies(speciesId);
    if (!species) {
      console.warn(`[Main] Unknown plant species: ${speciesId}, using default settings`);
    }

    // Create plant entity
    const plantEntity = worldMutator.createEntity(`plant-${speciesId}-${Date.now()}`);

    // Add PlantComponent (starts at 'seed' stage)
    const plantComponent = new PlantComponent({
      speciesId,
      position: { x: position.x, y: position.y },
      stage: 'seed',
      stageProgress: 0,
      age: 0,
      generation: 0,
      health: 100, // Freshly planted seeds start healthy
      hydration: 70, // Tilled soil has decent moisture
      nutrition: 80, // Tilled soil has nutrients
    });
    worldMutator.addComponent(plantEntity.id, plantComponent);

    // Add PositionComponent
    const positionComponent = createPositionComponent({
      x: position.x,
      y: position.y,
    });
    worldMutator.addComponent(plantEntity.id, positionComponent);

    // Show floating text
    floatingTextRenderer.add('🌱 Planted!', position.x * 16, position.y * 16, '#228B22', 1500);
  });

  gameLoop.world.eventBus.subscribe('seed:gathered', (event: any) => {
    const { seedCount, speciesId, plantId } = event.data;
    // Notification moved to items:deposited - only show floating text here

    // Show floating text at plant position
    if (plantId) {
      const plant = gameLoop.world.getEntity(plantId);
      if (plant) {
        const position = plant.getComponent('position');
        if (position) {
          const floatingTextRenderer = renderer.getFloatingTextRenderer();
          floatingTextRenderer.add(`🌰 +${seedCount}`, (position as any).x * 16, (position as any).y * 16, '#8B4513', 2000);
        }
      }
    }
  });

  gameLoop.world.eventBus.subscribe('seed:harvested', (event: any) => {
    const { seedsHarvested, speciesId, generation, plantId } = event.data;
    // Notification moved to items:deposited - only show floating text here

    // Show floating text at plant position
    if (plantId) {
      const plant = gameLoop.world.getEntity(plantId);
      if (plant) {
        const position = plant.getComponent('position');
        if (position) {
          const floatingTextRenderer = renderer.getFloatingTextRenderer();
          floatingTextRenderer.add(`🌾 +${seedsHarvested} seeds`, (position as any).x * 16, (position as any).y * 16, '#FFD700', 2000);
        }
      }
    }
  });

  gameLoop.world.eventBus.subscribe('plant:healthChanged', (event: any) => {
    const { health, position, cause } = event.data;
    if (health < 30) {
      const floatingTextRenderer = renderer.getFloatingTextRenderer();
      floatingTextRenderer.add(`⚠️ Health: ${Math.round(health)}`, position.x * 16, position.y * 16, '#FF4500', 2000);
    }
  });

  gameLoop.world.eventBus.subscribe('plant:died', (event: any) => {
    const { position } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add('💀 Died', position.x * 16, position.y * 16, '#888888', 2000);
  });

  // Listen for item deposit events and add to notifications panel (accrued per agent)
  gameLoop.world.eventBus.subscribe('items:deposited', (event: any) => {
    const { agentId, items } = event.data;

    // Get agent name if available
    const agent = gameLoop.world.getEntity(agentId);
    const identity = agent?.getComponent('identity') as { name: string } | undefined;
    const agentName = identity?.name || `Agent ${agentId.slice(0, 6)}`;

    // Add deposit (accrues with previous deposits from this agent)
    notificationsPanel.addDeposit(agentName, items);
  });

  // Debug time controls state
  let timeSpeedMultiplier = 1.0;
  let originalDayLength = 600; // 10 min/day default

  // Wire up input handling for placement UI, agent selection, and tile selection
  inputHandler.setCallbacks({
    onKeyDown: (key, shiftKey, ctrlKey) => {
      // Check keyboard registry first
      if (keyboardRegistry.handleKey(key, shiftKey, ctrlKey)) {
        return true;
      }

      // ESC - Close inventory first (if open), otherwise toggle settings panel
      if (key === 'Escape') {
        if (inventoryUI.isOpen()) {
          windowManager.hideWindow('inventory');
          return true;
        }
        windowManager.toggleWindow('settings');
        return true;
      }

      // R - Toggle resources panel
      if (key === 'r' || key === 'R') {
        windowManager.toggleWindow('resources');
        return true;
      }

      // M - Toggle memory panel
      if (key === 'm' || key === 'M') {
        windowManager.toggleWindow('memory');
        return true;
      }

      // T - Toggle tile inspector panel
      if (key === 't' || key === 'T') {
        windowManager.toggleWindow('tile-inspector');
        return true;
      }

      // C - Toggle crafting panel
      if (key === 'c' || key === 'C') {
        windowManager.toggleWindow('crafting');
        const visible = windowManager.getWindow('crafting')?.visible ?? false;
        // Set active agent when opening
        if (visible) {
          const selectedEntityId = agentInfoPanel.getSelectedEntityId();
          if (selectedEntityId) {
            craftingUI.setActiveAgent(selectedEntityId);
          }
        }
        return true;
      }

      // I or Tab - Toggle inventory (Phase 10)
      if (key === 'i' || key === 'I' || key === 'Tab') {
        windowManager.toggleWindow('inventory');
        return true;
      }

      // H - Toggle controls/help panel
      if (key === 'h' || key === 'H') {
        windowManager.toggleWindow('controls');
        return true;
      }

      // E - Toggle economy dashboard
      if (key === 'e' || key === 'E') {
        windowManager.toggleWindow('economy');
        return true;
      }

      // Check if placement UI handles the key first
      const handled = placementUI.handleKeyDown(key, shiftKey);
      if (handled) {
        return true;
      }

      // DEBUG TIME CONTROLS
      // Get time entity for time manipulation
      const timeEntities = gameLoop.world.query().with('time').executeEntities();
      const timeEntity = timeEntities.length > 0 ? timeEntities[0] as EntityImpl : null;
      const timeComp = timeEntity?.getComponent<any>('time');

      // TIME-SKIP CONTROLS (Shift + 1/2/3)
      if (shiftKey) {
        // Shift+1 - Skip 1 hour
        if (key === '1') {
          if (!timeComp) {
            throw new Error('[TimeControls] Cannot skip time: time component not found');
          }
          const newTime = (timeComp.timeOfDay + 1) % 24;
          const newPhase = calculatePhase(newTime);
          const newLightLevel = calculateLightLevel(newTime, newPhase);

          (timeComp as any).timeOfDay = newTime;
          (timeComp as any).phase = newPhase;
          (timeComp as any).lightLevel = newLightLevel;

          showNotification(`⏩ Skipped 1 hour → ${Math.floor(newTime)}:00`, '#FFA500');
          return true;
        }

        // Shift+2 - Skip 1 day
        if (key === '2') {
          if (!timeComp) {
            throw new Error('[TimeControls] Cannot skip time: time component not found');
          }
          const currentTime = timeComp.timeOfDay;

          // Trigger day change event
          gameLoop.world.eventBus.emit({
            type: 'time:day_changed',
            source: timeEntity!.id,
            data: { newDay: Math.floor((gameLoop.world.tick * 0.1) / timeComp.dayLength) + 1 },
          });

          showNotification(`⏩ Skipped 1 day`, '#FF8C00');
          return true;
        }

        // Shift+3 - Skip 7 days
        if (key === '3') {
          if (!timeComp) {
            throw new Error('[TimeControls] Cannot skip time: time component not found');
          }
          const currentTime = timeComp.timeOfDay;

          // Trigger 7 day change events
          for (let i = 0; i < 7; i++) {
            gameLoop.world.eventBus.emit({
              type: 'time:day_changed',
              source: timeEntity!.id,
              data: { newDay: Math.floor((gameLoop.world.tick * 0.1) / timeComp.dayLength) + 1 + i },
            });
          }

          showNotification(`⏩ Skipped 7 days`, '#FF4500');
          return true;
        }
      } else {
        // SPEED CONTROLS (1/2/3/4 without Shift)
        // 1 - Normal speed (1x)
        if (key === '1') {
          if (!timeComp) {
            throw new Error('[TimeControls] Cannot set speed: time component not found');
          }
          timeEntity!.updateComponent('time', (current: any) => ({
            ...current,
            speedMultiplier: 1,
          }));

          showNotification(`⏱️ Time speed: 1x`, '#00CED1');
          return true;
        }

        // 2 - Medium speed (2x)
        if (key === '2') {
          if (!timeComp) {
            throw new Error('[TimeControls] Cannot set speed: time component not found');
          }
          timeEntity!.updateComponent('time', (current: any) => ({
            ...current,
            speedMultiplier: 2,
          }));

          showNotification(`⏱️ Time speed: 2x`, '#00CED1');
          return true;
        }

        // 3 - Fast speed (4x - Rimworld max)
        if (key === '3') {
          if (!timeComp) {
            throw new Error('[TimeControls] Cannot set speed: time component not found');
          }
          timeEntity!.updateComponent('time', (current: any) => ({
            ...current,
            speedMultiplier: 4,
          }));

          showNotification(`⏱️ Time speed: 4x`, '#00CED1');
          return true;
        }

        // 4 - Dev/Testing speed (8x)
        if (key === '4') {
          if (!timeComp) {
            throw new Error('[TimeControls] Cannot set speed: time component not found');
          }
          timeEntity!.updateComponent('time', (current: any) => ({
            ...current,
            speedMultiplier: 8,
          }));

          showNotification(`⏱️ Time speed: 8x`, '#00CED1');
          return true;
        }
      }

      // N - Trigger test memory event for selected agent (for testing episodic memory)
      if (key === 'n' || key === 'N') {
        const selectedEntity = agentInfoPanel.getSelectedEntity();
        if (selectedEntity && selectedEntity.components.has('agent')) {
          // Emit a test event with high significance to trigger memory formation
          gameLoop.world.eventBus.emit({
            type: 'test:event',
            source: 'debug',
            data: {
              agentId: selectedEntity.id,
              summary: 'Test memory event triggered manually',
              emotionalIntensity: 0.8,
              novelty: 0.9,
              goalRelevance: 0.7,
              timestamp: Date.now(),
            },
          });
          showNotification(`🧠 Test memory event triggered`, '#9370DB');
        } else {
          showNotification(`⚠️ Select an agent first (click one)`, '#FFA500');
        }
        return true;
      }

      // Q - Queue test behaviors for selected agent (for testing behavior queue)
      if (key === 'q' || key === 'Q') {
        const selectedEntityId = agentInfoPanel.getSelectedEntityId();
        if (selectedEntityId) {
          const selectedEntity = gameLoop.world.getEntity(selectedEntityId);
          if (selectedEntity && selectedEntity.components.has('agent')) {
            const agent = selectedEntity.components.get('agent') as any;

            // Import queue helper functions
            import('@ai-village/core').then(({ queueBehavior }) => {
              // Queue a sequence of test behaviors
              let updatedAgent = queueBehavior(agent, 'gather', {
                label: 'Gather resources',
                priority: 'normal',
              });

              updatedAgent = queueBehavior(updatedAgent, 'deposit_items', {
                label: 'Deposit at storage',
                priority: 'normal',
              });

              updatedAgent = queueBehavior(updatedAgent, 'till', {
                label: 'Till soil',
                priority: 'normal',
              });

              updatedAgent = queueBehavior(updatedAgent, 'farm', {
                label: 'Plant seeds',
                priority: 'normal',
                repeats: 3,
              });

              // Update the agent component
              selectedEntity.components.set('agent', updatedAgent);

              showNotification(`📋 Queued 4 test behaviors`, '#9370DB');
            }).catch(err => {
              console.error('[DEBUG] Failed to import queueBehavior:', err);
              showNotification(`❌ Failed to queue behaviors`, '#FF0000');
            });
          } else {
            showNotification(`⚠️ Please select an agent`, '#FFA500');
          }
        } else {
          showNotification(`⚠️ Select an agent first (click one)`, '#FFA500');
        }
        return true;
      }

      // C - Clear behavior queue for selected agent
      if (key === 'c' || key === 'C') {
        const selectedEntityId = agentInfoPanel.getSelectedEntityId();
        if (selectedEntityId) {
          const selectedEntity = gameLoop.world.getEntity(selectedEntityId);
          if (selectedEntity && selectedEntity.components.has('agent')) {
            const agent = selectedEntity.components.get('agent') as any;

            // Import queue helper functions
            import('@ai-village/core').then(({ clearBehaviorQueue }) => {
              const updatedAgent = clearBehaviorQueue(agent);
              selectedEntity.components.set('agent', updatedAgent);

              showNotification(`🗑️ Behavior queue cleared`, '#9370DB');
            }).catch(err => {
              console.error('[DEBUG] Failed to import clearBehaviorQueue:', err);
              showNotification(`❌ Failed to clear queue`, '#FF0000');
            });
          } else {
            showNotification(`⚠️ Please select an agent`, '#FFA500');
          }
        } else {
          showNotification(`⚠️ Select an agent first (click one)`, '#FFA500');
        }
        return true;
      }

      // P - Spawn test plant at advanced stage (for testing)
      if (key === 'p' || key === 'P') {
        (async () => {
          // Get camera center position for spawn
          const camera = renderer.getCamera();
          const spawnX = Math.round(camera.x / 16);
          const spawnY = Math.round(camera.y / 16);

          // Import plant components
          const { PlantComponent } = await import('@ai-village/core');
          const { getPlantSpecies } = await import('@ai-village/world');

          // Cycle through stages: mature → seeding → senescence
          const testStages: Array<'mature' | 'seeding' | 'senescence'> = ['mature', 'seeding', 'senescence'];
          const stage = testStages[Math.floor(Math.random() * testStages.length)];

          // Create berry bush at advanced stage
          const speciesId = 'berry-bush';
          const species = getPlantSpecies(speciesId);

          // Calculate appropriate seeds for the stage
          // Plants at mature/seeding stages would have produced seeds via stage transitions
          const yieldAmount = species.baseGenetics.yieldAmount;
          let initialSeeds = 0;
          if (stage === 'mature') {
            // Would have produced seeds when transitioning to mature
            initialSeeds = Math.floor(species.seedsPerPlant * yieldAmount);
          } else if (stage === 'seeding') {
            // Would have produced seeds at mature AND when transitioning to seeding
            initialSeeds = Math.floor(species.seedsPerPlant * yieldAmount * 2);
          }

          const plantEntity = new EntityImpl(createEntityId(), (gameLoop.world as any)._tick);
          const plantComponent = new PlantComponent({
            speciesId,
            position: { x: spawnX, y: spawnY },
            stage,
            age: stage === 'senescence' ? 60 : (stage === 'seeding' ? 50 : 40),
            generation: 0,
            health: 90,
            hydration: 70,
            nutrition: 60,
            genetics: { ...species.baseGenetics }, // Use species genetics
            seedsProduced: initialSeeds // Initialize with appropriate seeds for stage
          });

          // Store entity ID on plant for PlantSystem logging
          (plantComponent as any).entityId = plantEntity.id;

          plantEntity.addComponent(plantComponent);
          plantEntity.addComponent(createPositionComponent(spawnX, spawnY));
          plantEntity.addComponent(createRenderableComponent(speciesId, 'plant'));
          (gameLoop.world as any)._addEntity(plantEntity);

          showNotification(`🌱 Spawned ${species.name} (${stage})`, '#32CD32');
        })();
        return true;
      }

      // Handle soil action keyboard shortcuts (T/W/F) if a tile is selected
      const selectedTile = tileInspectorPanel.getSelectedTile();

      // T key - Till tile
      if (key === 't' || key === 'T') {
        if (!selectedTile) {
          console.warn('[Main] ⚠️ Cannot till - no tile selected. RIGHT-CLICK a grass tile first to select it.');
          showNotification('⚠️ Right-click a grass tile first to select it', '#FFA500');
          return true;
        }

        const { tile, x, y } = selectedTile;

        if (tile.tilled && tile.plantability > 0) {
          console.error(`[Main] ❌ ERROR: Tile at (${x}, ${y}) is already tilled. Plantability: ${tile.plantability}/3 uses remaining.`);
          showNotification(`⚠️ Tile already tilled (${tile.plantability}/3 uses left). Wait until depleted.`, '#FF0000');
          return true;
        }

        if (tile.terrain !== 'grass' && tile.terrain !== 'dirt') {
          console.warn(`[Main] ⚠️ Cannot till ${tile.terrain} at (${x}, ${y}). Only grass and dirt can be tilled.`);
          showNotification(`⚠️ Cannot till ${tile.terrain} (only grass/dirt)`, '#FF0000');
          return true;
        }

        gameLoop.world.eventBus.emit({ type: 'action:till', source: 'ui', data: { x, y } });
        return true;
      }

      // W key - Water tile (only if tile is selected)
      if ((key === 'w' || key === 'W') && !shiftKey && selectedTile) {
        const { tile, x, y } = selectedTile;
        if (tile.moisture < 100) {
          gameLoop.world.eventBus.emit({ type: 'action:water', source: 'ui', data: { x, y } });
          return true;
        }
      }

      // F key - Fertilize tile (only if tile is selected)
      if ((key === 'f' || key === 'F') && selectedTile) {
        const { tile, x, y } = selectedTile;
        if (tile.fertility < 100) {
          gameLoop.world.eventBus.emit({ type: 'action:fertilize', source: 'ui', data: { x, y, fertilizerType: 'compost' } });
          return true;
        }
      }

      return false;
    },
    onMouseClick: (screenX, screenY, button) => {
      const rect = canvas.getBoundingClientRect();

      // Left click only for window management and menu bar
      if (button === 0) {
        // Check MenuBar first (it's on top)
        const menuHandled = menuBar.handleClick(screenX, screenY);
        if (menuHandled) {
          return true;
        }

        // Try to start drag on window title bar
        const dragStarted = windowManager.handleDragStart(screenX, screenY);
        if (dragStarted) {
          return true;
        }

        // Check if WindowManager handles the click (title bar buttons, window focus)
        const windowHandled = windowManager.handleClick(screenX, screenY);
        if (windowHandled) {
          return true;
        }
      }

      // Check if placement UI handles the click
      const placementHandled = placementUI.handleClick(screenX, screenY, button);
      if (placementHandled) {
        return true;
      }

      // Check if shop panel handles the click (modal)
      if (shopPanel.isVisible()) {
        const rect = canvas.getBoundingClientRect();
        const shopHandled = shopPanel.handleClick(screenX, screenY, gameLoop.world, rect.width, rect.height);
        if (shopHandled) {
          return true;
        }
      }

      // Right click - select tile
      if (button === 2) {
        const tileData = tileInspectorPanel.findTileAtScreenPosition(screenX, screenY, gameLoop.world);
        if (tileData) {
          tileInspectorPanel.setSelectedTile(tileData.tile, tileData.x, tileData.y);
          windowManager.showWindow('tile-inspector');
          return true;
        } else {
          // No tile found - deselect
          tileInspectorPanel.setSelectedTile(null);
          windowManager.hideWindow('tile-inspector');
        }
        return true; // Always consume right clicks
      }

      // Left click - select agent, animal, plant, resource, or shop
      if (button === 0) {
        const entity = renderer.findEntityAtScreenPosition(screenX, screenY, gameLoop.world);
        if (entity) {
          const hasAgent = entity.components.has('agent');
          const hasAnimal = entity.components.has('animal');
          const hasPlant = entity.components.has('plant');
          const hasResource = entity.components.has('resource');
          const hasShop = entity.components.has('shop');
          const hasBuilding = entity.components.has('building');

          // Check for shops first (buildings with shop component)
          if (hasShop && hasBuilding) {
            // Get current selected agent to use for trading
            const selectedAgent = agentInfoPanel.getSelectedEntity();
            if (selectedAgent) {
              shopPanel.openShop(entity.id, selectedAgent.id);
              return true;
            } else {
              showNotification('Select an agent first to trade with shops', '#FFA500');
              return true;
            }
          } else if (hasAgent) {
            agentInfoPanel.setSelectedEntity(entity);
            animalInfoPanel.setSelectedEntity(null); // Deselect animal
            plantInfoPanel.setSelectedEntity(null); // Deselect plant
            memoryPanel.setSelectedEntity(entity); // Sync memory panel
            relationshipsPanel.setSelectedEntity(entity); // Sync relationships panel
            // Show the agent-info window
            windowManager.showWindow('agent-info');
            windowManager.hideWindow('animal-info');
            windowManager.hideWindow('plant-info');
            return true;
          } else if (hasAnimal) {
            animalInfoPanel.setSelectedEntity(entity);
            agentInfoPanel.setSelectedEntity(null); // Deselect agent
            plantInfoPanel.setSelectedEntity(null); // Deselect plant
            memoryPanel.setSelectedEntity(null); // Clear memory panel
            relationshipsPanel.setSelectedEntity(null); // Clear relationships panel
            // Show the animal-info window
            windowManager.showWindow('animal-info');
            windowManager.hideWindow('agent-info');
            windowManager.hideWindow('plant-info');
            return true;
          } else if (hasPlant) {
            plantInfoPanel.setSelectedEntity(entity);
            agentInfoPanel.setSelectedEntity(null); // Deselect agent
            animalInfoPanel.setSelectedEntity(null); // Deselect animal
            memoryPanel.setSelectedEntity(null); // Clear memory panel
            relationshipsPanel.setSelectedEntity(null); // Clear relationships panel
            // Show the plant-info window
            windowManager.showWindow('plant-info');
            windowManager.hideWindow('agent-info');
            windowManager.hideWindow('animal-info');
            return true;
          } else if (hasResource) {
            // Resource entities (trees, rocks) - left-click does nothing special
            // Use right-click to inspect the tile instead
            // Deselect other panels
            agentInfoPanel.setSelectedEntity(null);
            animalInfoPanel.setSelectedEntity(null);
            plantInfoPanel.setSelectedEntity(null);
            memoryPanel.setSelectedEntity(null);
            relationshipsPanel.setSelectedEntity(null);
            windowManager.hideWindow('agent-info');
            windowManager.hideWindow('animal-info');
            windowManager.hideWindow('plant-info');
            return true;
          }
        } else {
          // Click on empty space - deselect all and hide info windows
          agentInfoPanel.setSelectedEntity(null);
          animalInfoPanel.setSelectedEntity(null);
          plantInfoPanel.setSelectedEntity(null);
          memoryPanel.setSelectedEntity(null);
          relationshipsPanel.setSelectedEntity(null);
          windowManager.hideWindow('agent-info');
          windowManager.hideWindow('animal-info');
          windowManager.hideWindow('plant-info');
        }
      }

      return false;
    },
    onMouseMove: (screenX, screenY) => {
      const rect = canvas.getBoundingClientRect();

      // Check if WindowManager handles the drag
      windowManager.handleDrag(screenX, screenY);

      // Check if inventory UI handles mouse move (for tooltips)
      // Use CSS dimensions (rect.width/height) not buffer dimensions (canvas.width/height)
      const inventoryHandled = inventoryUI.handleMouseMove(screenX, screenY, rect.width, rect.height);
      if (inventoryHandled) {
        return; // Inventory open, don't update placement cursor
      }

      placementUI.updateCursorPosition(screenX, screenY, gameLoop.world);
    },
    onWheel: (screenX, screenY, deltaY) => {
      // Let WindowManager handle scrolling within windows
      return windowManager.handleWheel(screenX, screenY, deltaY);
    },
  });

  // Render loop (separate from game loop)
  function renderLoop() {
    inputHandler.update();

    // Render world with selected entity highlighting
    const selectedEntity = agentInfoPanel.getSelectedEntity() || animalInfoPanel.getSelectedEntity();
    renderer.render(gameLoop.world, selectedEntity);

    // Render building placement UI on top
    placementUI.render(renderer.getContext());

    // Update inventory UI with player/selected agent's inventory
    // If no agent selected, use first agent's inventory as "player"
    const selectedAgentId = agentInfoPanel.getSelectedEntityId();
    if (selectedAgentId) {
      const selectedAgentEntity = gameLoop.world.getEntity(selectedAgentId);
      if (selectedAgentEntity) {
        const inventory = selectedAgentEntity.getComponent('inventory');
        if (inventory && inventory.type === 'inventory') {
          inventoryUI.setPlayerInventory(inventory);
        }
      }
    } else {
      // No agent selected - try to find first agent with inventory
      const agents = gameLoop.world.query().with('agent').with('inventory').executeEntities();
      if (agents.length > 0) {
        const firstAgent = agents[0];
        const inventory = firstAgent.getComponent('inventory');
        if (inventory && inventory.type === 'inventory') {
          inventoryUI.setPlayerInventory(inventory);
        }
      }
    }

    // Render UI panels via WindowManager and MenuBar
    const ctx = renderer.getContext();
    const rect = canvas.getBoundingClientRect();

    // WindowManager handles all panel rendering with proper z-ordering and window chrome
    windowManager.render(ctx, gameLoop.world);

    // Shop panel renders as modal on top of windows (Phase 12.7)
    shopPanel.render(ctx, gameLoop.world);

    // MenuBar renders on top of everything
    menuBar.render(ctx);

    requestAnimationFrame(renderLoop);
  }

  // Update status
  function updateStatus() {
    if (!statusEl) return;

    const stats = gameLoop.getStats();

    // Get time of day from world
    const timeEntities = gameLoop.world.query().with('time').executeEntities();
    let timeDisplay = '';
    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0];
      const timeComp = timeEntity!.components.get('time') as { timeOfDay: number; phase: string; lightLevel: number } | undefined;
      if (timeComp) {
        const hours = Math.floor(timeComp.timeOfDay);
        const minutes = Math.floor((timeComp.timeOfDay - hours) * 60);
        const phaseEmoji = timeComp.phase === 'day' ? '☀️' : timeComp.phase === 'night' ? '🌙' : timeComp.phase === 'dawn' ? '🌅' : '🌆';
        timeDisplay = ` | ${phaseEmoji} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} (${timeComp.phase})`;
      }
    }

    statusEl.textContent = `Running - Tick ${stats.currentTick} - Avg: ${stats.avgTickTimeMs.toFixed(2)}ms${timeDisplay}`;
    statusEl.className = 'status running';
  }

  setInterval(updateStatus, 100);

  // Create world entity with WeatherComponent and TimeComponent
  // This must be done BEFORE starting the game loop
  const worldEntity = gameLoop.world.createEntity();
  const initialWeather = createWeatherComponent(
    'clear',  // weatherType - start with clear weather
    0,        // intensity - clear has no intensity
    120       // duration - 2 minutes
  );
  (worldEntity as any).addComponent(initialWeather);

  // Add TimeComponent for day/night cycle
  const initialTime = createTimeComponent(6, 600); // Start at 6:00 AM (dawn), 10 min/day
  (worldEntity as any).addComponent(initialTime);

  // Create initial buildings for playtest
  // Per work order acceptance criteria: "At least one building should be visible in the world"
  // This must be done BEFORE starting the game loop so buildings exist on first render
  createInitialBuildings(gameLoop.world);

  // Create initial agents (10 LLM agents clustered together)
  createInitialAgents(gameLoop.world, settings.dungeonMasterPrompt);

  // Create initial wild plants for Phase 9
  await createInitialPlants(gameLoop.world);

  // Create initial wild animals for Phase 11
  await createInitialAnimals(gameLoop.world, wildAnimalSpawning);

  // Spawn berry bushes near start for easy food access
  const berryPositions = [
    { x: 6, y: 4 }, { x: -7, y: 5 }, { x: 8, y: -3 },
    { x: -6, y: -4 }, { x: 5, y: 7 }, { x: -8, y: 6 },
    { x: 7, y: -6 }, { x: -5, y: -7 }, { x: 9, y: 2 },
    { x: -9, y: -2 }, { x: 4, y: -8 }, { x: -4, y: 8 },
    { x: 10, y: 0 }, { x: -10, y: 1 }, { x: 0, y: 10 },
  ];

  berryPositions.forEach(pos => {
    createBerryBush(gameLoop.world, pos.x, pos.y);
  });

  // Set up farming action handlers
  gameLoop.world.eventBus.subscribe('action:requested', (event: any) => {
    const { eventType, actorId, plantId, position } = event.data;

    if (eventType === 'gather_seeds:requested') {
      gameLoop.actionQueue.enqueue({
        type: 'gather_seeds',
        actorId,
        targetId: plantId,
      });
    } else if (eventType === 'harvest:requested') {
      gameLoop.actionQueue.enqueue({
        type: 'harvest',
        actorId,
        targetId: plantId,
      });
    }
  });

  // Set up animal event logging for debugging
  // Note: EventBus doesn't have .on() method, events are handled by systems
  // gameLoop.world.eventBus.on('animal_spawned', (event: any) => {
  //   console.log(`[Animal Event] animal_spawned:`, event.data);
  // });

  // gameLoop.world.eventBus.on('animal_tamed', (event: any) => {
  //   console.log(`[Animal Event] animal_tamed:`, event.data);
  // });

  // gameLoop.world.eventBus.on('animal_state_changed', (event: any) => {
  //   console.log(`[Animal Event] animal_state_changed:`, event.data);
  // });

  // gameLoop.world.eventBus.on('product_ready', (event: any) => {
  //   console.log(`[Animal Event] product_ready:`, event.data);
  // });

  // gameLoop.world.eventBus.on('bond_level_changed', (event: any) => {
  //   console.log(`[Animal Event] bond_level_changed:`, event.data);
  // });

  // gameLoop.world.eventBus.on('life_stage_changed', (event: any) => {
  //   console.log(`[Animal Event] life_stage_changed:`, event.data);
  // });

  // gameLoop.world.eventBus.on('animal_died', (event: any) => {
  //   console.log(`[Animal Event] animal_died:`, event.data);
  // });

  // Set up animal UI action handlers
  // gameLoop.world.eventBus.on('ui_action', (event: any) => {
  //   if (event.source !== 'animal_info_panel') return;
  //   const { action, entityId } = event.data;
  //     const entity = gameLoop.world.getEntity(entityId);
  //     if (!entity) {
  //       console.error(`[Main] UI action: entity ${entityId} not found`);
  //       return;
  //     }
  // 
  //     const animal = entity.components.get('animal') as any;
  //     if (!animal) {
  //       console.error(`[Main] UI action: entity ${entityId} is not an animal`);
  //       return;
  //     }
  // 
  //     if (action === 'tame') {
  //       console.log(`[Main] Taming ${animal.name}...`);
  //       // Find a nearby agent to be the owner
  //       const agents = gameLoop.world.query().with('agent').executeEntities();
  //       if (agents.length === 0) {
  //         console.warn('[Main] No agents available to tame animal');
  //         renderer.getFloatingTextRenderer().addText('No agents available!', entity, '#FF0000');
  //         return;
  //       }
  //       // Use first agent as the tamer
  //       const agent = agents[0];
  //       const tamingSystem = gameLoop.systemRegistry.getSorted().find((s) => s.id === 'taming') as any;
  //       if (!tamingSystem) {
  //         console.error('[Main] TamingSystem not found');
  //         return;
  //       }
  // 
  //       const result = tamingSystem.attemptTaming(gameLoop.world, animal, agent.id, 'feeding', 'grass');
  //       if (result.success) {
  //         console.log(`[Main] Successfully tamed ${animal.name}!`);
  //         renderer.getFloatingTextRenderer().addText('Tamed!', entity, '#00FF00');
  //       } else {
  //         console.log(`[Main] Failed to tame ${animal.name}: ${result.reason}`);
  //         renderer.getFloatingTextRenderer().addText(`Failed: ${result.reason}`, entity, '#FFA500');
  //       }
  //     } else if (action === 'feed') {
  //       console.log(`[Main] Feeding ${animal.name}...`);
  //       // Reduce hunger by 20
  //       animal.hunger = Math.max(0, animal.hunger - 20);
  //       animal.mood = Math.min(100, animal.mood + 5);
  //       renderer.getFloatingTextRenderer().addText('Fed!', entity, '#00FF00');
  //     } else if (action === 'collect_product') {
  //       console.log(`[Main] Collecting products from ${animal.name}...`);
  //       const productionSystem = gameLoop.systemRegistry.getSorted().find((s) => s.id === 'animal_production') as any;
  //       if (!productionSystem) {
  //         console.error('[Main] AnimalProductionSystem not found');
  //         return;
  //       }
  // 
  //       // Try to collect the first available product
  //       const species = animal.speciesId;
  //       // For chickens: eggs, for cows: milk
  //       const productId = species === 'chicken' ? 'eggs' : species === 'cow' ? 'milk' : null;
  //       if (!productId) {
  //         renderer.getFloatingTextRenderer().addText('No products available', entity, '#FFA500');
  //         return;
  //       }
  // 
  //       const result = productionSystem.collectProduct(entityId, productId);
  //       if (result.success) {
  //         console.log(`[Main] Collected ${result.quantity} ${productId} (quality: ${result.quality})`);
  //         renderer.getFloatingTextRenderer().addText(`+${result.quantity} ${productId}`, entity, '#FFD700');
  //       } else {
  //         console.log(`[Main] Failed to collect ${productId}: ${result.reason}`);
  //         renderer.getFloatingTextRenderer().addText(result.reason || 'Not ready', entity, '#FFA500');
  //       }
  //     }
  //   });

  // Start
  gameLoop.start();

  // Expose game globally for debugging and oscillation detection scripts
  (window as any).game = {
    world: gameLoop.world,
    gameLoop,
    renderer,
  };

  renderLoop();

  // Show tutorial notification after a brief delay
  setTimeout(() => {
    showNotification('💡 Tip: Right-click a grass tile, then press T to till it', '#00CED1');
  }, 3000);


  // Expose for debugging and tests
  (window as any).game = {
    world: gameLoop.world,
    gameLoop,
    renderer,
    placementUI,
    buildingRegistry: blueprintRegistry,
    agentInfoPanel,
    animalInfoPanel,
    resourcesPanel,
  };
  (window as any).gameLoop = gameLoop;
  (window as any).renderer = renderer;
  (window as any).placementUI = placementUI;
  (window as any).blueprintRegistry = blueprintRegistry;
  (window as any).agentInfoPanel = agentInfoPanel;
  (window as any).animalInfoPanel = animalInfoPanel;

  // Expose testing API for automated tests and debugging
  (window as any).__gameTest = {
    // Core systems
    world: gameLoop.world,
    gameLoop,
    renderer,
    eventBus: gameLoop.world.eventBus,

    // Building systems
    placementUI,
    blueprintRegistry,
    getAllBlueprints: () => blueprintRegistry.getAll(),
    getBlueprintsByCategory: (category: string) =>
      blueprintRegistry.getByCategory(category as any),
    getUnlockedBlueprints: () => blueprintRegistry.getUnlocked(),

    // Helper functions for testing
    placeBuilding: (blueprintId: string, x: number, y: number) => {
      gameLoop.world.eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'test',
        data: { blueprintId, position: { x, y }, rotation: 0 }
      });
    },

    getBuildings: () => {
      const buildings: any[] = [];
      const entities = gameLoop.world.query().with('building').executeEntities();
      entities.forEach(entity => {
        const building = entity.getComponent('building');
        const position = entity.getComponent('position');
        buildings.push({
          entityId: entity.id,
          type: (building as any).buildingType,
          position: position ? { x: (position as any).x, y: (position as any).y } : null,
          building: building
        });
      });
      return buildings;
    },

    // Convenience helpers for playtest agent
    getTier2Stations: () => {
      return blueprintRegistry.getAll().filter(bp => bp.tier === 2).map(bp => ({
        id: bp.id,
        name: bp.name,
        category: bp.category,
        tier: bp.tier,
        width: bp.width,
        height: bp.height,
        resourceCost: bp.resourceCost
      }));
    },

    getTier3Stations: () => {
      return blueprintRegistry.getAll().filter(bp => bp.tier === 3).map(bp => ({
        id: bp.id,
        name: bp.name,
        category: bp.category,
        tier: bp.tier,
        width: bp.width,
        height: bp.height,
        resourceCost: bp.resourceCost
      }));
    },

    getBlueprintDetails: (id: string) => {
      const blueprint = blueprintRegistry.get(id);
      return {
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        category: blueprint.category,
        width: blueprint.width,
        height: blueprint.height,
        tier: blueprint.tier,
        resourceCost: blueprint.resourceCost,
        functionality: blueprint.functionality,
        buildTime: blueprint.buildTime,
        unlocked: blueprint.unlocked
      };
    },

    getCraftingStations: () => {
      return blueprintRegistry.getAll()
        .filter(bp => bp.functionality.some(f => f.type === 'crafting'))
        .map(bp => ({
          id: bp.id,
          name: bp.name,
          tier: bp.tier,
          recipes: bp.functionality
            .filter(f => f.type === 'crafting')
            .flatMap(f => (f as any).recipes),
          speed: bp.functionality
            .filter(f => f.type === 'crafting')
            .map(f => (f as any).speed)[0] || 1.0
        }));
    },

    // UI panels
    agentInfoPanel,
    animalInfoPanel,
    resourcesPanel,
  };

  // Expose promptLogger globally for easy access
  (window as any).promptLogger = promptLogger;
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
