import {
  GameLoop,
  AISystem,
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
  TillActionHandler,
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
} from '@ai-village/core';
import { Renderer, InputHandler, KeyboardRegistry, BuildingPlacementUI, AgentInfoPanel, AnimalInfoPanel, TileInspectorPanel, PlantInfoPanel, ResourcesPanel, SettingsPanel, MemoryPanel, InventoryUI } from '@ai-village/renderer';
import {
  OllamaProvider,
  OpenAICompatProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  LoadBalancingProvider,
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
  console.log(`Created campfire at (-3, -3) - Entity ${campfireEntity.id}`);

  // Create a completed tent (provides shelter)
  // Position: Near campfire (3, -3)
  const tentEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  tentEntity.addComponent(createBuildingComponent('tent', 1, 100)); // 100% complete
  tentEntity.addComponent(createPositionComponent(3, -3));
  tentEntity.addComponent(createRenderableComponent('tent', 'object')); // Make it visible
  (world as any)._addEntity(tentEntity);
  console.log(`Created tent at (3, -3) - Entity ${tentEntity.id}`);

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
  console.log(`Created storage-chest (100% complete) at (0, -5) with 50 wood - Entity ${storageEntity.id}`);

  // Create a building under construction (50% complete) for testing construction
  // Position: West of village (-8, 0)
  const constructionEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  constructionEntity.addComponent(createBuildingComponent('storage-box', 1, 50)); // 50% complete storage-box
  constructionEntity.addComponent(createPositionComponent(-8, 0));
  constructionEntity.addComponent(createRenderableComponent('storage-box', 'object')); // Make it visible
  constructionEntity.addComponent(createInventoryComponent(10, 200)); // Storage box: 10 slots, 200 weight
  (world as any)._addEntity(constructionEntity);
  console.log(`Created storage-box (50% complete) at (-8, 0) - Entity ${constructionEntity.id}`);
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

  console.log(`Creating ${agentCount} agents in a cluster around (${centerX}, ${centerY})...`);
  if (dungeonMasterPrompt) {
    console.log(`📜 DM Prompt: "${dungeonMasterPrompt}"`);
  }

  const agentIds: string[] = [];

  for (let i = 0; i < agentCount; i++) {
    // Distribute agents in a small cluster
    const offsetX = (i % 4) - 1.5; // -1.5 to 1.5
    const offsetY = Math.floor(i / 4) - 1; // -1 to 1.5
    const x = centerX + offsetX * spread + Math.random() * 0.5;
    const y = centerY + offsetY * spread + Math.random() * 0.5;

    const agentId = createLLMAgent(world, x, y, 2.0, dungeonMasterPrompt);
    agentIds.push(agentId);
    console.log(`Created agent ${i + 1}/${agentCount}: ${agentId} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
  }

  console.log(`Created ${agentCount} LLM agents`);

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

      console.log(`\n🌟 Agent ${leaderId} has been chosen as the LEADER! 🌟`);
      console.log(`Leadership trait: 95/100`);

      // Get the agent's identity to log their name
      const identity = leaderEntity.getComponent('identity') as any;
      if (identity) {
        console.log(`Leader's name: ${identity.name}\n`);
      }
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
  console.log(`Creating initial wild plants from ${wildSpecies.length} species...`);

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

    console.log(`Created ${species.name} (${stage}, progress=${(stageProgress * 100).toFixed(0)}%) at (${x.toFixed(1)}, ${y.toFixed(1)}) - Entity ${plantEntity.id} - seedsProduced=${plantComponent.seedsProduced}, fruitCount=${plantComponent.fruitCount}`);
  }

  console.log(`Created ${plantCount} wild plants`);
}

/**
 * Create initial wild animals for Phase 11 testing.
 * Uses WildAnimalSpawningSystem to spawn animals in chunks around the origin.
 * This function is called during demo initialization, not during normal chunk generation.
 */
async function createInitialAnimals(world: WorldMutator, spawningSystem: WildAnimalSpawningSystem) {
  console.log('Spawning initial wild animals near origin for visibility...');

  // Spawn animals close to the origin (0, 0) where agents and camera start
  // This ensures they are visible immediately when the game loads
  const animalsToSpawn = [
    { species: 'chicken', position: { x: 3, y: 2 } },
    { species: 'sheep', position: { x: -4, y: 3 } },
    { species: 'rabbit', position: { x: 5, y: -2 } },
    { species: 'rabbit', position: { x: -3, y: -4 } },
  ];

  let totalAnimals = 0;
  for (const animalData of animalsToSpawn) {
    try {
      const entity = spawningSystem.spawnSpecificAnimal(world, animalData.species, animalData.position);
      totalAnimals++;
      console.log(`Spawned ${animalData.species} at (${animalData.position.x}, ${animalData.position.y})`);
    } catch (error) {
      console.error(`Failed to spawn ${animalData.species}:`, error);
    }
  }

  console.log(`Created ${totalAnimals} wild animals near origin`);
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
  console.log('AI Village - Phase 10 Demo (Sleep & Circadian Rhythm)');

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
    console.log('[Main] 🎮 Welcome to AI Village!');
    console.log('[Main] 📜 Please select a scenario to begin...');

    // Show settings modal and wait for configuration
    await new Promise<void>((resolve) => {
      const originalCallback = settingsPanel['onSettingsChange'];
      settingsPanel.setOnSettingsChange((newSettings) => {
        console.log('[Main] ✅ Settings configured, starting game...');
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
    console.log('[DEMO] Using OpenAI-compatible provider:', settings.llm.baseUrl, settings.llm.model);
  } else {
    llmProvider = new OllamaProvider(settings.llm.model, settings.llm.baseUrl);
    console.log('[DEMO] Using Ollama native provider:', settings.llm.baseUrl, settings.llm.model);
  }

  // Check if provider is available before creating queue
  const isLLMAvailable = await llmProvider.isAvailable();
  let llmQueue: LLMDecisionQueue | null = null;
  let promptBuilder: StructuredPromptBuilder | null = null;

  if (isLLMAvailable) {
    console.log('[DEMO] LLM provider available - agents will use LLM decisions');
    // Use maxConcurrent=1 for turn-based conversation (prevents rate limiting and allows agents to hear each other's responses)
    llmQueue = new LLMDecisionQueue(llmProvider, 1);
    promptBuilder = new StructuredPromptBuilder();
  } else {
    console.warn(`[DEMO] LLM not available at ${settings.llm.baseUrl} - agents will use scripted behavior only`);
    console.warn('[DEMO] Press ESC to open settings and configure LLM provider');
  }

  // Handle settings changes (requires page reload for clean state)
  settingsPanel.setOnSettingsChange((newSettings) => {
    console.log('[DEMO] Settings changed:', newSettings);
    console.log('[DEMO] Reloading page to apply new LLM settings...');
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
  gameLoop.actionRegistry.register(new GatherSeedsActionHandler());
  gameLoop.actionRegistry.register(new HarvestActionHandler());

  // Register PlantSystem and inject species lookup
  const plantSystem = new PlantSystem(gameLoop.world.eventBus);
  const { getPlantSpecies } = await import('@ai-village/world');
  plantSystem.setSpeciesLookup(getPlantSpecies);
  gameLoop.systemRegistry.register(plantSystem);

  // Register Animal systems (after environment systems, before AI)
  gameLoop.systemRegistry.register(new AnimalSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new AnimalProductionSystem(gameLoop.world.eventBus));
  const wildAnimalSpawning = new WildAnimalSpawningSystem();
  gameLoop.systemRegistry.register(wildAnimalSpawning);

  gameLoop.systemRegistry.register(new AISystem(llmQueue, promptBuilder));
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
  gameLoop.systemRegistry.register(new ResourceGatheringSystem());

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
      console.log(`[Debug] Temperature overlay ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    },
  });

  // Create building placement system
  const blueprintRegistry = new BuildingBlueprintRegistry();
  blueprintRegistry.registerDefaults();
  blueprintRegistry.registerTier2Stations(); // Phase 10: Crafting Stations
  blueprintRegistry.registerTier3Stations(); // Phase 10: Advanced Crafting Stations
  blueprintRegistry.registerExampleBuildings(); // Examples for all 8 categories and 8 functions

  const placementValidator = new PlacementValidator();

  const placementUI = new BuildingPlacementUI({
    registry: blueprintRegistry,
    validator: placementValidator,
    camera: renderer.getCamera(),
    eventBus: gameLoop.world.eventBus,
  });

  // Create agent info panel
  const agentInfoPanel = new AgentInfoPanel();

  // Create animal info panel
  const animalInfoPanel = new AnimalInfoPanel();

  // Create plant info panel
  const plantInfoPanel = new PlantInfoPanel();

  // Create resources panel (R to toggle)
  const resourcesPanel = new ResourcesPanel();

  // Create memory panel (M to toggle) - for playtesting Phase 10 episodic memory
  const memoryPanel = new MemoryPanel();

  // Create inventory UI (I or Tab to toggle) - Phase 10 full-featured inventory
  const inventoryUI = new InventoryUI(canvas, gameLoop.world);

  // Generate terrain with trees and rocks first (so we can create tile inspector)
  console.log('Generating terrain...');
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
  console.log('Terrain generation complete - trees and rocks placed');

  // Set chunk manager and terrain generator on world so getTileAt can access tiles
  // This fixes the tile lookup failure in ActionQueue validation
  (gameLoop.world as any).setChunkManager(chunkManager);
  (gameLoop.world as any).setTerrainGenerator(terrainGenerator);
  console.log('ChunkManager and TerrainGenerator registered with World for tile access');

  // Create tile inspector panel (now that chunkManager exists)
  const tileInspectorPanel = new TileInspectorPanel(
    gameLoop.world.eventBus,
    renderer.getCamera(),
    chunkManager,
    terrainGenerator // Pass terrainGenerator to ensure chunks are generated when accessed
  );

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
    console.log(`[showNotification] Called with message="${message}", color=${color}`);

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

    console.log(`[showNotification] Notification will hide after ${duration}ms`);

    notificationTimeout = window.setTimeout(() => {
      console.log(`[showNotification] Hiding notification after timeout`);
      notificationEl.style.display = 'none';
      notificationTimeout = null;
    }, duration);
  }

  gameLoop.world.eventBus.subscribe('action:till', (event: any) => {
    const { x, y, agentId: requestedAgentId } = event.data;
    console.log(`[Main] Received till action request at (${x}, ${y})${requestedAgentId ? ` from agent ${requestedAgentId.slice(0,8)}` : ''}`);

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
        console.log(`[Main] No agent selected, using nearest agent ${agentId.slice(0, 8)} (distance: ${nearestDistance.toFixed(1)})`);
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
      console.log(`[Main] Generating terrain for chunk (${chunkX}, ${chunkY}) before tilling`);
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
      console.log(`[Main] Agent is ${distance.toFixed(2)} tiles away from target (max: ${MAX_TILL_DISTANCE.toFixed(2)})`);
      console.log(`[Main] Teleporting agent from (${agentPos.x}, ${agentPos.y}) to adjacent position near (${x}, ${y})`);

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

      console.log(`[Main] Teleporting agent to (${bestPos.x}, ${bestPos.y}) before tilling`);

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

      console.log(`[Main] Agent teleported successfully, now adjacent to tile`);
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

      console.log(`[Main] Submitted till action ${actionId} for agent ${agentId} at (${x}, ${y})`);

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
        console.log(`[Main] Duration from handler: ${durationTicks} ticks = ${durationSeconds}s`);
      } else {
        console.warn(`[Main] Could not get duration from till handler, using fallback: ${durationSeconds}s`);
      }

      showNotification(`Agent will till tile at (${x}, ${y}) (${durationSeconds}s)`, '#8B4513');
    } catch (err: any) {
      console.error(`[Main] Failed to submit till action: ${err.message}`);
      showNotification(`Failed to queue tilling: ${err.message}`, '#FF0000');
    }
  });

  gameLoop.world.eventBus.subscribe('action:gather_seeds', (event: any) => {
    const { agentId, plantId } = event.data;
    console.log(`[Main] Received gather_seeds action request from agent ${agentId.slice(0,8)} for plant ${plantId.slice(0,8)}`);

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
      console.log(`[Main] Agent is ${distance.toFixed(2)} tiles away from plant (max: ${MAX_GATHER_DISTANCE.toFixed(2)})`);
      console.log(`[Main] Teleporting agent from (${agentPos.x}, ${agentPos.y}) to adjacent position near plant (${plantPos.x}, ${plantPos.y})`);

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

      console.log(`[Main] Teleporting agent to (${bestPos.x}, ${bestPos.y}) before gathering`);

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

      console.log(`[Main] Agent teleported successfully, now adjacent to plant`);
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

      console.log(`[Main] Submitted gather_seeds action ${actionId} for agent ${agentId.slice(0,8)} targeting plant ${plantId.slice(0,8)}`);

      // Get duration from handler
      const gatherSeedsHandler = gameLoop.actionQueue.getHandler('gather_seeds');
      let durationSeconds = 5; // Fallback

      if (gatherSeedsHandler && typeof gatherSeedsHandler.getDuration === 'function') {
        const durationTicks = gatherSeedsHandler.getDuration(
          { id: actionId, type: 'gather_seeds', actorId: agentId, targetId: plantId, status: 'pending' },
          gameLoop.world
        );
        durationSeconds = durationTicks / 20; // Convert ticks to seconds (20 TPS)
        console.log(`[Main] Gather seeds duration: ${durationTicks} ticks = ${durationSeconds}s`);
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
    console.log(`[Main] Received harvest action request from agent ${agentId.slice(0,8)} for plant ${plantId.slice(0,8)}`);

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

      console.log(`[Main] Submitted harvest action ${actionId} for agent ${agentId.slice(0,8)} targeting plant ${plantId.slice(0,8)}`);

      // Get duration from handler
      const harvestHandler = gameLoop.actionQueue.getHandler('harvest');
      let durationSeconds = 8; // Fallback

      if (harvestHandler && typeof harvestHandler.getDuration === 'function') {
        const durationTicks = harvestHandler.getDuration(
          { id: actionId, type: 'harvest', actorId: agentId, targetId: plantId, status: 'pending' },
          gameLoop.world
        );
        durationSeconds = durationTicks / 20; // Convert ticks to seconds (20 TPS)
        console.log(`[Main] Harvest duration: ${durationTicks} ticks = ${durationSeconds}s`);
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
    console.log(`[Main] Received water action at (${x}, ${y})`);

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
      console.log(`[Main] Generating terrain for chunk (${chunkX}, ${chunkY}) before watering`);
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
      console.log(`[Main] Successfully watered tile at (${x}, ${y})`);
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
    console.log(`[Main] Received fertilize action at (${x}, ${y}) with ${fertilizerType}`);

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
      console.log(`[Main] Generating terrain for chunk (${chunkX}, ${chunkY}) before fertilizing`);
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
      console.log(`[Main] Successfully fertilized tile at (${x}, ${y})`);
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
    console.log('[Main] ✅ Action completed:', event);
    const { actionType, actionId, success, reason } = event.data;

    if (actionType === 'till') {
      if (success) {
        console.log(`[Main] ✅ Tilling action ${actionId} completed successfully`);
        showNotification('Tilling completed!', '#8B4513');
      } else {
        console.error(`[Main] ❌ Tilling action ${actionId} failed: ${reason}`);
        showNotification(`Tilling failed: ${reason}`, '#FF0000');
      }
    }
  });

  gameLoop.world.eventBus.subscribe('agent:action:started', (event: any) => {
    console.log('[Main] 🔄 Action started:', event);
    const { actionType, actionId } = event.data;

    if (actionType === 'till') {
      console.log(`[Main] 🔄 Tilling action ${actionId} started - waiting for completion...`);
    }
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
    console.log('[Main] 🌾 Received soil:tilled event:', event);
    const { position, fertility, biome } = event.data;
    console.log(`[Main] 🌾 Tile tilled at (${position.x}, ${position.y}): fertility=${fertility.toFixed(2)}, biome=${biome}`);
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
    console.log(`[Main] Plant stage changed to ${newStage} at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
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

    console.log(`[Main] Seed dispersed at (${position.x}, ${position.y}): ${speciesId}`);

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

    console.log(`[Main] Created plant entity ${plantEntity.id.slice(0,8)} from dispersed ${speciesId} seed at (${position.x}, ${position.y})`);
  });

  gameLoop.world.eventBus.subscribe('seed:germinated', (event: any) => {
    const { position } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add('🌱 Germinated!', position.x * 16, position.y * 16, '#32CD32', 2000);
    console.log(`[Main] Seed germinated at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
  });

  gameLoop.world.eventBus.subscribe('seed:gathered', (event: any) => {
    const { seedsGathered, speciesId, plantHealth, plantStage, plantId } = event.data;
    console.log(`[Main] 🌰 Seed gathered: ${seedsGathered}x ${speciesId} (health: ${plantHealth}, stage: ${plantStage})`);
    showNotification(`🌰 Gathered ${seedsGathered}x ${speciesId} seeds`, '#8B4513');

    // Show floating text at plant position
    if (plantId) {
      const plant = gameLoop.world.getEntity(plantId);
      if (plant) {
        const position = plant.getComponent('position');
        if (position) {
          const floatingTextRenderer = renderer.getFloatingTextRenderer();
          floatingTextRenderer.add(`🌰 +${seedsGathered}`, (position as any).x * 16, (position as any).y * 16, '#8B4513', 2000);
        }
      }
    }
  });

  gameLoop.world.eventBus.subscribe('seed:harvested', (event: any) => {
    const { seedsHarvested, speciesId, generation, plantId } = event.data;
    console.log(`[Main] 🌾 Seeds harvested: ${seedsHarvested}x ${speciesId} (gen ${generation})`);
    showNotification(`🌾 Harvested ${seedsHarvested}x ${speciesId} seeds (gen ${generation})`, '#FFD700');

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
    console.log(`[Main] Plant died at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
  });

  // Debug time controls state
  let timeSpeedMultiplier = 1.0;
  let originalDayLength = 600; // 10 min/day default

  // Wire up input handling for placement UI, agent selection, and tile selection
  console.log('[Main] Setting up inputHandler callbacks...');
  inputHandler.setCallbacks({
    onKeyDown: (key, shiftKey, ctrlKey) => {
      console.log(`[Main] onKeyDown callback: key="${key}", shiftKey=${shiftKey}, ctrlKey=${ctrlKey}`);

      // Check keyboard registry first
      if (keyboardRegistry.handleKey(key, shiftKey, ctrlKey)) {
        return true;
      }

      // ESC - Close inventory first (if open), otherwise toggle settings panel
      if (key === 'Escape') {
        if (inventoryUI.isOpen()) {
          inventoryUI.handleKeyPress(key, shiftKey, ctrlKey);
          console.log(`[Main] Inventory closed with Escape`);

          // Show controls panel when inventory closes
          const controlsPanel = document.querySelector('.controls');
          if (controlsPanel) {
            controlsPanel.classList.remove('hidden');
          }

          return true;
        }
        settingsPanel.toggle();
        return true;
      }

      // R - Toggle resources panel
      if (key === 'r' || key === 'R') {
        resourcesPanel.toggleCollapsed();
        return true;
      }

      // M - Toggle memory panel
      if (key === 'm' || key === 'M') {
        memoryPanel.toggle();
        console.log(`[Main] Memory panel ${memoryPanel.isVisible() ? 'opened' : 'closed'}`);
        return true;
      }

      // I or Tab - Toggle inventory (Phase 10)
      if (key === 'i' || key === 'I' || key === 'Tab') {
        inventoryUI.handleKeyPress(key, shiftKey, ctrlKey);
        console.log(`[Main] Inventory ${inventoryUI.isOpen() ? 'opened' : 'closed'}`);

        // Hide/show controls panel when inventory opens/closes
        const controlsPanel = document.querySelector('.controls');
        if (controlsPanel) {
          if (inventoryUI.isOpen()) {
            controlsPanel.classList.add('hidden');
          } else {
            controlsPanel.classList.remove('hidden');
          }
        }

        return true;
      }

      // Check if placement UI handles the key first
      const handled = placementUI.handleKeyDown(key, shiftKey);
      console.log(`[Main] placementUI.handleKeyDown returned: ${handled}`);
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

          console.log(`[DEBUG] Skipped 1 hour → ${newTime.toFixed(2)}:00 (${newPhase})`);
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

          console.log(`[DEBUG] Skipped 1 day (kept time at ${currentTime.toFixed(2)}:00)`);
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

          console.log(`[DEBUG] Skipped 7 days (kept time at ${currentTime.toFixed(2)}:00)`);
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

          console.log(`[DEBUG] Time speed set to 1x (48s/day)`);
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

          console.log(`[DEBUG] Time speed set to 2x (24s/day)`);
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

          console.log(`[DEBUG] Time speed set to 4x (12s/day)`);
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

          console.log(`[DEBUG] Time speed set to 8x (6s/day)`);
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
          console.log(`[DEBUG] Triggered test memory event for agent ${selectedEntity.id}`);
          showNotification(`🧠 Test memory event triggered`, '#9370DB');
        } else {
          console.log('[DEBUG] No agent selected - click an agent first');
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

              console.log(`[DEBUG] Queued 4 behaviors for agent ${selectedEntityId.slice(0, 8)}`);
              showNotification(`📋 Queued 4 test behaviors`, '#9370DB');
            }).catch(err => {
              console.error('[DEBUG] Failed to import queueBehavior:', err);
              showNotification(`❌ Failed to queue behaviors`, '#FF0000');
            });
          } else {
            console.log('[DEBUG] Selected entity is not an agent');
            showNotification(`⚠️ Please select an agent`, '#FFA500');
          }
        } else {
          console.log('[DEBUG] No agent selected - click an agent first');
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

              console.log(`[DEBUG] Cleared behavior queue for agent ${selectedEntityId.slice(0, 8)}`);
              showNotification(`🗑️ Behavior queue cleared`, '#9370DB');
            }).catch(err => {
              console.error('[DEBUG] Failed to import clearBehaviorQueue:', err);
              showNotification(`❌ Failed to clear queue`, '#FF0000');
            });
          } else {
            console.log('[DEBUG] Selected entity is not an agent');
            showNotification(`⚠️ Please select an agent`, '#FFA500');
          }
        } else {
          console.log('[DEBUG] No agent selected - click an agent first');
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

          console.log(`[DEBUG] Spawned ${species.name} (${stage}) at (${spawnX}, ${spawnY}) - Entity ${plantEntity.id} - seedsProduced=${plantComponent.seedsProduced}`);
          showNotification(`🌱 Spawned ${species.name} (${stage})`, '#32CD32');
        })();
        return true;
      }

      // Handle soil action keyboard shortcuts (T/W/F) if a tile is selected
      const selectedTile = tileInspectorPanel.getSelectedTile();

      // T key - Till tile
      if (key === 't' || key === 'T') {
        console.log('[Main] ===== T KEY PRESSED - TILLING ACTION =====');
        console.log(`[Main] selectedTile:`, selectedTile);

        if (!selectedTile) {
          console.warn('[Main] ⚠️ Cannot till - no tile selected. RIGHT-CLICK a grass tile first to select it.');
          showNotification('⚠️ Right-click a grass tile first to select it', '#FFA500');
          return true;
        }

        const { tile, x, y } = selectedTile;
        console.log(`[Main] Selected tile at (${x}, ${y}): terrain=${tile.terrain}, tilled=${tile.tilled}`);

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

        // Log if this is a re-tilling operation (depleted soil restoration)
        if (tile.tilled && tile.plantability === 0) {
          console.log(`[Main] 🔄 Re-tilling depleted soil at (${x}, ${y}) to restore fertility`);
        } else {
          console.log(`[Main] ✅ All checks passed, tilling fresh grass/dirt at (${x}, ${y})`);
        }

        gameLoop.world.eventBus.emit({ type: 'action:till', source: 'ui', data: { x, y } });
        console.log(`[Main] ===== TILLING ACTION EVENT EMITTED =====`);
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
      console.log(`[Main] onMouseClick: (${screenX}, ${screenY}), button=${button}`);
      const rect = canvas.getBoundingClientRect();

      // Check if inventory UI handles the click (highest priority)
      // Use CSS dimensions (rect.width/height) not buffer dimensions (canvas.width/height)
      const inventoryHandled = inventoryUI.handleClick(screenX, screenY, button, rect.width, rect.height);
      console.log(`[Main] inventoryUI.handleClick returned: ${inventoryHandled}`);
      if (inventoryHandled) {
        return true;
      }

      // First check if resources panel handles the click (collapse/expand)
      const agentPanelOpen = agentInfoPanel.getSelectedEntityId() !== null;
      const resourcesHandled = resourcesPanel.handleClick(screenX, screenY, rect.width, agentPanelOpen);
      console.log(`[Main] resourcesPanel.handleClick returned: ${resourcesHandled}`);
      if (resourcesHandled) {
        return true;
      }

      // Check if animal info panel handles the click (close button, action buttons)
      const animalHandled = animalInfoPanel.handleClick(screenX, screenY, rect.width, rect.height, gameLoop.world);
      console.log(`[Main] animalInfoPanel.handleClick returned: ${animalHandled}`);
      if (animalHandled) {
        return true;
      }

      // Check if placement UI handles the click
      const placementHandled = placementUI.handleClick(screenX, screenY, button);
      console.log(`[Main] placementUI.handleClick returned: ${placementHandled}`);
      if (placementHandled) {
        return true;
      }

      // Check if tile inspector panel handles the click (for button clicks)
      const tileInspectorHandled = tileInspectorPanel.handleClick(screenX, screenY, rect.width, rect.height);
      console.log(`[Main] tileInspectorPanel.handleClick returned: ${tileInspectorHandled}`);
      if (tileInspectorHandled) {
        return true;
      }

      // Right click - select tile
      console.log(`[Main] Checking if button === 2: ${button === 2}`);
      if (button === 2) {
        const tileData = tileInspectorPanel.findTileAtScreenPosition(screenX, screenY, gameLoop.world);
        if (tileData) {
          console.log(`[Main] Selected tile at (${tileData.x}, ${tileData.y})`);
          tileInspectorPanel.setSelectedTile(tileData.tile, tileData.x, tileData.y);
          return true;
        } else {
          // No tile found - deselect
          console.log('[Main] Deselected tile');
          tileInspectorPanel.setSelectedTile(null);
        }
        return true; // Always consume right clicks
      }

      // Left click - select agent, animal, or plant
      if (button === 0) {
        const entity = renderer.findEntityAtScreenPosition(screenX, screenY, gameLoop.world);
        if (entity) {
          const hasAgent = entity.components.has('agent');
          const hasAnimal = entity.components.has('animal');
          const hasPlant = entity.components.has('plant');

          if (hasAgent) {
            agentInfoPanel.setSelectedEntity(entity);
            animalInfoPanel.setSelectedEntity(null); // Deselect animal
            plantInfoPanel.setSelectedEntity(null); // Deselect plant
            memoryPanel.setSelectedEntity(entity); // Sync memory panel
            return true;
          } else if (hasAnimal) {
            animalInfoPanel.setSelectedEntity(entity);
            agentInfoPanel.setSelectedEntity(null); // Deselect agent
            plantInfoPanel.setSelectedEntity(null); // Deselect plant
            memoryPanel.setSelectedEntity(null); // Clear memory panel
            return true;
          } else if (hasPlant) {
            plantInfoPanel.setSelectedEntity(entity);
            agentInfoPanel.setSelectedEntity(null); // Deselect agent
            animalInfoPanel.setSelectedEntity(null); // Deselect animal
            memoryPanel.setSelectedEntity(null); // Clear memory panel
            return true;
          }
        } else {
          // Click on empty space - deselect all
          agentInfoPanel.setSelectedEntity(null);
          animalInfoPanel.setSelectedEntity(null);
          plantInfoPanel.setSelectedEntity(null);
          memoryPanel.setSelectedEntity(null);
        }
      }

      return false;
    },
    onMouseMove: (screenX, screenY) => {
      const rect = canvas.getBoundingClientRect();

      // Check if inventory UI handles mouse move (for tooltips)
      // Use CSS dimensions (rect.width/height) not buffer dimensions (canvas.width/height)
      const inventoryHandled = inventoryUI.handleMouseMove(screenX, screenY, rect.width, rect.height);
      if (inventoryHandled) {
        return; // Inventory open, don't update placement cursor
      }

      placementUI.updateCursorPosition(screenX, screenY, gameLoop.world);
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

    // Render UI panels on top
    const ctx = renderer.getContext();
    const rect = canvas.getBoundingClientRect();
    const agentPanelOpen = agentInfoPanel.getSelectedEntityId() !== null;
    resourcesPanel.render(ctx, rect.width, gameLoop.world, agentPanelOpen); // Resources panel (top-right)
    agentInfoPanel.render(ctx, rect.width, rect.height, gameLoop.world);
    animalInfoPanel.render(ctx, rect.width, rect.height, gameLoop.world);
    plantInfoPanel.render(ctx, rect.width, rect.height, gameLoop.world);
    tileInspectorPanel.render(ctx, rect.width, rect.height);
    memoryPanel.render(ctx, rect.width, rect.height, gameLoop.world); // Memory panel (M to toggle)

    // Render inventory UI (I or Tab to toggle) - Phase 10
    // Use CSS dimensions (rect.width/height) not buffer dimensions (canvas.width/height)
    inventoryUI.render(ctx, rect.width, rect.height);

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
  console.log(
    `[Main] Created world weather entity: ${worldEntity.id} - Initial weather: ${initialWeather.weatherType}, temp modifier: ${initialWeather.tempModifier}°C`
  );

  // Add TimeComponent for day/night cycle
  const initialTime = createTimeComponent(6, 600); // Start at 6:00 AM (dawn), 10 min/day
  (worldEntity as any).addComponent(initialTime);
  console.log(
    `[Main] Created time component: Starting at ${initialTime.timeOfDay.toFixed(2)}:00 (${initialTime.phase}), light level: ${initialTime.lightLevel}`
  );

  // Create initial buildings for playtest
  // Per work order acceptance criteria: "At least one building should be visible in the world"
  // This must be done BEFORE starting the game loop so buildings exist on first render
  console.log('Creating initial buildings...');
  createInitialBuildings(gameLoop.world);

  // Create initial agents (10 LLM agents clustered together)
  console.log('Creating initial agents...');
  createInitialAgents(gameLoop.world, settings.dungeonMasterPrompt);

  // Create initial wild plants for Phase 9
  console.log('Creating initial wild plants...');
  await createInitialPlants(gameLoop.world);

  // Create initial wild animals for Phase 11
  console.log('Creating initial wild animals...');
  await createInitialAnimals(gameLoop.world, wildAnimalSpawning);

  // Spawn berry bushes near start for easy food access
  console.log('Spawning berry bushes near start...');
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
  console.log(`Spawned ${berryPositions.length} berry bushes around spawn point`);

  // Set up memory event logging for debugging (Phase 10)
  gameLoop.world.eventBus.subscribe('memory:formed', (event: any) => {
    const { agentId, eventType } = event.data;
    const entity = gameLoop.world.getEntity(agentId);
    const identity = entity?.components.get('identity') as { name: string } | undefined;
    const agentName = identity?.name || agentId.substring(0, 8);
    console.log(`[Memory] 🧠 ${agentName} formed memory from ${eventType}`);
  });

  gameLoop.world.eventBus.subscribe('memory:recalled', (event: any) => {
    const { agentId, count } = event.data;
    const entity = gameLoop.world.getEntity(agentId);
    const identity = entity?.components.get('identity') as { name: string } | undefined;
    const agentName = identity?.name || agentId.substring(0, 8);
    console.log(`[Memory] 🔍 ${agentName} recalled ${count} memories`);
  });

  gameLoop.world.eventBus.subscribe('memory:forgotten', (event: any) => {
    const { agentId, eventType } = event.data;
    const entity = gameLoop.world.getEntity(agentId);
    const identity = entity?.components.get('identity') as { name: string } | undefined;
    const agentName = identity?.name || agentId.substring(0, 8);
    console.log(`[Memory] 🌫️ ${agentName} forgot memory: ${eventType}`);
  });

  gameLoop.world.eventBus.subscribe('reflection:completed', (event: any) => {
    const { agentId } = event.data;
    const entity = gameLoop.world.getEntity(agentId);
    const identity = entity?.components.get('identity') as { name: string } | undefined;
    const agentName = identity?.name || agentId.substring(0, 8);
    console.log(`[Reflection] 💭 ${agentName} completed daily reflection`);
  });

  gameLoop.world.eventBus.subscribe('journal:written', (event: any) => {
    const { agentId } = event.data;
    const entity = gameLoop.world.getEntity(agentId);
    const identity = entity?.components.get('identity') as { name: string } | undefined;
    const agentName = identity?.name || agentId.substring(0, 8);
    console.log(`[Journal] 📔 ${agentName} wrote journal entry`);
  });

  // Set up farming action handlers
  gameLoop.world.eventBus.subscribe('action:requested', (event: any) => {
    const { eventType, actorId, plantId, position } = event.data;

    if (eventType === 'gather_seeds:requested') {
      console.log(`[Main] gather_seeds:requested - actor: ${actorId.slice(0, 8)}, plant: ${plantId.slice(0, 8)}, position: (${position.x}, ${position.y})`);

      gameLoop.actionQueue.enqueue({
        type: 'gather_seeds',
        actorId,
        targetId: plantId,
      });
    } else if (eventType === 'harvest:requested') {
      console.log(`[Main] harvest:requested - actor: ${actorId.slice(0, 8)}, plant: ${plantId.slice(0, 8)}, position: (${position.x}, ${position.y})`);

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
  console.log('Starting game loop...');
  gameLoop.start();

  console.log('Starting render loop...');
  renderLoop();

  console.log('Phase 10 initialized successfully!');
  console.log('Game loop:', gameLoop);
  console.log('Systems:', gameLoop.systemRegistry.getSorted());

  // Log debug controls
  console.log('');
  console.log('=== DEBUG CONTROLS ===');
  console.log('SETTINGS:');
  console.log('  ESC - Open settings (configure LLM provider)');
  console.log('');
  console.log('UI:');
  console.log('  I or Tab - Toggle inventory (Phase 10)');
  console.log('  M - Toggle memory panel (episodic memory)');
  console.log('  R - Toggle resources panel');
  console.log('');
  console.log('SOIL/FARMING (Phase 9):');
  console.log('  1. RIGHT-CLICK a grass tile to select it (opens Tile Inspector panel)');
  console.log('  2. Press T to till the selected tile');
  console.log('  3. Press W to water the selected tile');
  console.log('  4. Press F to fertilize the selected tile');
  console.log('  (Or click the buttons in the Tile Inspector panel)');
  console.log('');
  console.log('TIME:');
  console.log('  Shift+1 - Skip 1 hour');
  console.log('  Shift+2 - Skip 1 day');
  console.log('  Shift+3 - Skip 7 days');
  console.log('  1/2/3/4 - Set time speed (1x/2x/4x/8x)');
  console.log('');
  console.log('PLANTS:');
  console.log('  P - Spawn test plant at advanced stage');
  console.log('  Click plant - View plant info');
  console.log('');
  console.log('AGENTS:');
  console.log('  Click agent - View agent info & memories');
  console.log('  N - Trigger test memory for selected agent');
  console.log('  Q - Queue test behaviors for selected agent');
  console.log('  C - Clear behavior queue for selected agent');
  console.log('');
  console.log('MEMORY SYSTEM (Phase 10):');
  console.log('  - Agents form memories automatically from significant events');
  console.log('  - Press M to view selected agent\'s memories');
  console.log('  - Memories decay over time based on importance');
  console.log('  - Watch console for [Memory] 🧠, [Reflection] 💭, [Journal] 📔 events');
  console.log('  - Agents reflect at end of each day (sleep time)');
  console.log('======================');
  console.log('');

  // Show tutorial notification after a brief delay
  setTimeout(() => {
    showNotification('💡 Tip: Right-click a grass tile, then press T to till it', '#00CED1');
  }, 3000);

  // Log agent count
  setInterval(() => {
    const agents = gameLoop.world.query().with('agent').executeEntities();
    const movingAgents = agents.filter((e) => {
      const movement = e.getComponent('movement');
      return movement && ((movement as any).velocityX !== 0 || (movement as any).velocityY !== 0);
    });
    console.log(
      `Agents: ${agents.length} total, ${movingAgents.length} moving`
    );
  }, 5000);

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
      gameLoop.world.getEntitiesWithComponents(['building']).forEach(entity => {
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

    // UI panels
    agentInfoPanel,
    animalInfoPanel,
    resourcesPanel,
  };

  console.log('Building Placement UI ready. Press B to open building menu.');
  console.log('Test API available at window.__gameTest');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
