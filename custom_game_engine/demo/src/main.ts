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
  BuildingBlueprintRegistry,
  PlacementValidator,
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
} from '@ai-village/core';
import { Renderer, InputHandler, BuildingPlacementUI, AgentInfoPanel, AnimalInfoPanel, TileInspectorPanel, PlantInfoPanel, ResourcesPanel, SettingsPanel, MemoryPanel } from '@ai-village/renderer';
import {
  OllamaProvider,
  OpenAICompatProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  LoadBalancingProvider,
  type LLMProvider,
} from '@ai-village/llm';
import { TerrainGenerator, ChunkManager, createLLMAgent } from '@ai-village/world';

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
    let stage: 'sprout' | 'vegetative' | 'mature';
    if (isEdibleSpecies) {
      stage = 'mature'; // Always mature for food
    } else {
      // Non-edible: random stage for variety
      const stages: Array<'sprout' | 'vegetative' | 'mature'> = ['sprout', 'vegetative', 'vegetative', 'mature', 'mature'];
      stage = stages[Math.floor(Math.random() * stages.length)];
    }

    // Calculate initial seeds for mature plants
    // (They would have produced seeds when transitioning to mature stage)
    const yieldAmount = species.baseGenetics.yieldAmount;
    const initialSeeds = stage === 'mature' ? Math.floor(species.seedsPerPlant * yieldAmount) : 0;

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
      age: stage === 'mature' ? 20 : (stage === 'vegetative' ? 10 : 5),
      generation: 0,
      health: 80 + Math.random() * 20,
      hydration: 50 + Math.random() * 30,
      nutrition: 50 + Math.random() * 30,
      genetics: { ...species.baseGenetics }, // Use species' base genetics
      seedsProduced: initialSeeds, // Pre-populate seeds for mature plants
      fruitCount: initialFruit // Pre-populate fruit for mature edible plants
    });

    // Store entity ID on plant for logging
    (plantComponent as any).entityId = plantEntity.id;

    plantEntity.addComponent(plantComponent);
    plantEntity.addComponent(createPositionComponent(x, y));
    plantEntity.addComponent(createRenderableComponent(species.id, 'plant'));
    (world as any)._addEntity(plantEntity);

    console.log(`Created ${species.name} (${stage}) at (${x.toFixed(1)}, ${y.toFixed(1)}) - Entity ${plantEntity.id} - seedsProduced=${plantComponent.seedsProduced}, fruitCount=${plantComponent.fruitCount}`);
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
  gameLoop.systemRegistry.register(new SoilSystem());

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
  gameLoop.systemRegistry.register(new CommunicationSystem());
  gameLoop.systemRegistry.register(new NeedsSystem());
  gameLoop.systemRegistry.register(new SleepSystem());
  gameLoop.systemRegistry.register(new TamingSystem());
  gameLoop.systemRegistry.register(new BuildingSystem());
  gameLoop.systemRegistry.register(new ResourceGatheringSystem());
  gameLoop.systemRegistry.register(new MovementSystem());
  gameLoop.systemRegistry.register(new MemorySystem());

  // Register episodic memory systems (Phase 10)
  gameLoop.systemRegistry.register(new MemoryFormationSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new MemoryConsolidationSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new ReflectionSystem(gameLoop.world.eventBus));
  gameLoop.systemRegistry.register(new JournalingSystem(gameLoop.world.eventBus));

  // Create renderer
  const renderer = new Renderer(canvas);

  // Create input handler
  const inputHandler = new InputHandler(canvas, renderer.getCamera());

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

  // Create tile inspector panel (now that chunkManager exists)
  const tileInspectorPanel = new TileInspectorPanel(
    gameLoop.world.eventBus,
    renderer.getCamera(),
    chunkManager
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

  function showNotification(message: string, color: string = '#FFFFFF') {
    notificationEl.textContent = message;
    notificationEl.style.borderColor = color;
    notificationEl.style.display = 'block';
    setTimeout(() => {
      notificationEl.style.display = 'none';
    }, 2000);
  }

  gameLoop.world.eventBus.subscribe('action:till', (event: any) => {
    if (!soilSystem) return;

    const { x, y } = event.data;
    console.log(`[Main] Received till action at (${x}, ${y})`);

    // Get the tile from chunk manager
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = chunkManager.getChunk(chunkX, chunkY);
    if (!chunk) {
      console.error(`[Main] Cannot till - chunk not found at (${chunkX}, ${chunkY})`);
      showNotification(`Cannot till - chunk not found`, '#FF0000');
      return;
    }

    const tileIndex = localY * CHUNK_SIZE + localX;
    const tile = chunk.tiles[tileIndex];

    if (!tile) {
      console.error(`[Main] Cannot till - tile not found at (${x}, ${y})`);
      showNotification(`Cannot till - tile not found`, '#FF0000');
      return;
    }

    try {
      soilSystem.tillTile(gameLoop.world, tile, x, y);
      console.log(`[Main] Successfully tilled tile at (${x}, ${y})`);
      showNotification(`Tilled tile at (${x}, ${y})`, '#8B4513');

      // Refetch tile from chunk manager to get latest state after mutation
      const refreshedTile = chunk.tiles[tileIndex];
      if (refreshedTile) {
        tileInspectorPanel.setSelectedTile(refreshedTile, x, y);
      }
    } catch (err: any) {
      console.error(`[Main] Failed to till tile: ${err.message}`);
      showNotification(`Failed to till: ${err.message}`, '#FF0000');
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

  // Listen for soil events and show floating text
  gameLoop.world.eventBus.subscribe('soil:tilled', (event: any) => {
    const { position } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add('Tilled', position.x * 16, position.y * 16, '#8B4513', 1500);
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
    const { position } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add('🌰 Seed', position.x * 16, position.y * 16, '#8B4513', 1500);
  });

  gameLoop.world.eventBus.subscribe('seed:germinated', (event: any) => {
    const { position } = event.data;
    const floatingTextRenderer = renderer.getFloatingTextRenderer();
    floatingTextRenderer.add('🌱 Germinated!', position.x * 16, position.y * 16, '#32CD32', 2000);
    console.log(`[Main] Seed germinated at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
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
  inputHandler.setCallbacks({
    onKeyDown: (key, shiftKey, ctrlKey) => {
      console.log(`[Main] onKeyDown callback: key="${key}", shiftKey=${shiftKey}, ctrlKey=${ctrlKey}`);

      // ESC - Toggle settings panel
      if (key === 'Escape') {
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

      // 1 - Skip 1 hour
      if (key === '1') {
        if (timeComp) {
          const newTime = (timeComp.timeOfDay + 1) % 24;
          const newPhase = calculatePhase(newTime);
          const newLightLevel = calculateLightLevel(newTime, newPhase);

          (timeComp as any).timeOfDay = newTime;
          (timeComp as any).phase = newPhase;
          (timeComp as any).lightLevel = newLightLevel;

          console.log(`[DEBUG] Skipped 1 hour → ${newTime.toFixed(2)}:00 (${newPhase})`);
          showNotification(`⏩ Skipped 1 hour → ${Math.floor(newTime)}:00`, '#FFA500');
        }
        return true;
      }

      // 2 - Skip 1 day
      if (key === '2') {
        if (timeComp) {
          // Keep same time, just advance 24 hours
          const currentTime = timeComp.timeOfDay;

          // Trigger day change event
          gameLoop.world.eventBus.emit({
            type: 'time:day_changed',
            source: timeEntity!.id,
            data: { newDay: Math.floor((gameLoop.world.tick * 0.1) / timeComp.dayLength) + 1 },
          });

          console.log(`[DEBUG] Skipped 1 day (kept time at ${currentTime.toFixed(2)}:00)`);
          showNotification(`⏩⏩ Skipped 1 day`, '#FF8C00');
        }
        return true;
      }

      // 3 - Skip 7 days
      if (key === '3') {
        if (timeComp) {
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
          showNotification(`⏩⏩⏩ Skipped 7 days`, '#FF4500');
        }
        return true;
      }

      // 1/2/5 - Set time speed multipliers
      if (key === '1' || key === '2' || key === '5') {
        if (timeComp) {
          const multiplier = parseInt(key);
          timeSpeedMultiplier = multiplier;

          // Update day length (shorter = faster time)
          (timeComp as any).dayLength = originalDayLength / multiplier;

          console.log(`[DEBUG] Time speed set to ${multiplier}x (day length: ${timeComp.dayLength}s)`);
          showNotification(`⏱️ Time speed: ${multiplier}x`, '#00CED1');
        }
        return true;
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
      if (selectedTile) {
        const { tile, x, y } = selectedTile;

        if (key === 't' || key === 'T') {
          // Till the tile
          if (!tile.tilled && (tile.terrain === 'grass' || tile.terrain === 'dirt')) {
            gameLoop.world.eventBus.emit({ type: 'action:till', source: 'ui', data: { x, y } });
            return true;
          }
        } else if ((key === 'w' || key === 'W') && !shiftKey) { // Only if not Shift+W (which skips week)
          // Water the tile
          if (tile.moisture < 100) {
            gameLoop.world.eventBus.emit({ type: 'action:water', source: 'ui', data: { x, y } });
            return true;
          }
        } else if (key === 'f' || key === 'F') {
          // Fertilize the tile
          if (tile.fertility < 100) {
            gameLoop.world.eventBus.emit({ type: 'action:fertilize', source: 'ui', data: { x, y, fertilizerType: 'compost' } });
            return true;
          }
        }
      }

      return false;
    },
    onMouseClick: (screenX, screenY, button) => {
      const rect = canvas.getBoundingClientRect();

      // First check if resources panel handles the click (collapse/expand)
      const agentPanelOpen = agentInfoPanel.getSelectedEntityId() !== null;
      if (resourcesPanel.handleClick(screenX, screenY, rect.width, agentPanelOpen)) {
        return true;
      }

      // Check if animal info panel handles the click (close button, action buttons)
      if (animalInfoPanel.handleClick(screenX, screenY, rect.width, rect.height, gameLoop.world)) {
        return true;
      }

      // Check if placement UI handles the click
      if (placementUI.handleClick(screenX, screenY, button)) {
        return true;
      }

      // Check if tile inspector panel handles the click (for button clicks)
      if (tileInspectorPanel.handleClick(screenX, screenY, rect.width, rect.height)) {
        return true;
      }

      // Right click - select tile
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
  console.log('UI:');
  console.log('  M - Toggle memory panel (episodic memory)');
  console.log('  R - Toggle resources panel');
  console.log('TIME:');
  console.log('  H - Skip 1 hour');
  console.log('  D - Skip 1 day');
  console.log('  Shift+W - Skip 7 days');
  console.log('  1/2/5 - Set time speed (1x/2x/5x)');
  console.log('PLANTS:');
  console.log('  P - Spawn test plant at advanced stage');
  console.log('  Click plant - View plant info');
  console.log('AGENTS:');
  console.log('  Click agent - View agent info & memories');
  console.log('  N - Trigger test memory for selected agent');
  console.log('======================');
  console.log('');

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

  console.log('Building Placement UI ready. Press B to open building menu.');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
