import {
  GameLoop,
  AISystem,
  MovementSystem,
  NeedsSystem,
  MemorySystem,
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
  createTimeComponent,
  FERTILIZERS,
  createBuildingComponent,
  createPositionComponent,
  createRenderableComponent,
  createWeatherComponent,
  EntityImpl,
  createEntityId,
  type World,
  type WorldMutator,
} from '@ai-village/core';
import { Renderer, InputHandler, BuildingPlacementUI, AgentInfoPanel, TileInspectorPanel, PlantInfoPanel } from '@ai-village/renderer';
import {
  OllamaProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
  LoadBalancingProvider,
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
  campfireEntity.addComponent(createRenderableComponent('campfire', 'building')); // Make it visible
  (world as any)._addEntity(campfireEntity);
  console.log(`Created campfire at (-3, -3) - Entity ${campfireEntity.id}`);

  // Create a completed tent (provides shelter)
  // Position: Near campfire (3, -3)
  const tentEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  tentEntity.addComponent(createBuildingComponent('tent', 1, 100)); // 100% complete
  tentEntity.addComponent(createPositionComponent(3, -3));
  tentEntity.addComponent(createRenderableComponent('tent', 'building')); // Make it visible
  (world as any)._addEntity(tentEntity);
  console.log(`Created tent at (3, -3) - Entity ${tentEntity.id}`);

  // Create a building under construction (50% complete)
  // Position: Near village (0, -5)
  const constructionEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  constructionEntity.addComponent(createBuildingComponent('storage-chest', 1, 50)); // 50% complete
  constructionEntity.addComponent(createPositionComponent(0, -5));
  constructionEntity.addComponent(createRenderableComponent('storage-chest', 'building')); // Make it visible
  (world as any)._addEntity(constructionEntity);
  console.log(`Created storage-chest (50% complete) at (0, -5) - Entity ${constructionEntity.id}`);
}

/**
 * Create initial agents for testing.
 * Spawns 10 LLM agents in a cluster near the campfire.
 */
function createInitialAgents(world: WorldMutator) {
  const agentCount = 10;
  const centerX = 0; // Near camera center at (0, 0) for easier clicking
  const centerY = 0;
  const spread = 2; // Spread agents in a small area

  console.log(`Creating ${agentCount} agents in a cluster around (${centerX}, ${centerY})...`);

  for (let i = 0; i < agentCount; i++) {
    // Distribute agents in a small cluster
    const offsetX = (i % 4) - 1.5; // -1.5 to 1.5
    const offsetY = Math.floor(i / 4) - 1; // -1 to 1.5
    const x = centerX + offsetX * spread + Math.random() * 0.5;
    const y = centerY + offsetY * spread + Math.random() * 0.5;

    const agentId = createLLMAgent(world, x, y, 2.0);
    console.log(`Created agent ${i + 1}/${agentCount}: ${agentId} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
  }

  console.log(`Created ${agentCount} LLM agents`);
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

    // Random stage (most will be vegetative or mature)
    const stages: Array<'sprout' | 'vegetative' | 'mature'> = ['sprout', 'vegetative', 'vegetative', 'mature', 'mature'];
    const stage = stages[Math.floor(Math.random() * stages.length)];

    // Calculate initial seeds for mature plants
    // (They would have produced seeds when transitioning to mature stage)
    const yieldAmount = species.baseGenetics.yieldAmount;
    const initialSeeds = stage === 'mature' ? Math.floor(species.seedsPerPlant * yieldAmount) : 0;

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
      seedsProduced: initialSeeds // Pre-populate seeds for mature plants
    });

    // Store entity ID on plant for logging
    (plantComponent as any).entityId = plantEntity.id;

    plantEntity.addComponent(plantComponent);
    plantEntity.addComponent(createPositionComponent(x, y));
    plantEntity.addComponent(createRenderableComponent(species.id, 'plant'));
    (world as any)._addEntity(plantEntity);

    console.log(`Created ${species.name} (${stage}) at (${x.toFixed(1)}, ${y.toFixed(1)}) - Entity ${plantEntity.id} - seedsProduced=${plantComponent.seedsProduced}`);
  }

  console.log(`Created ${plantCount} wild plants`);
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

  // Create LLM components - use single Ollama instance with higher concurrency
  // Note: Multiple instances would need matching Ollama versions that support qwen3
  const llmProvider = new OllamaProvider('qwen3:4b', 'http://localhost:11434');
  const llmQueue = new LLMDecisionQueue(llmProvider, 4); // Higher concurrency
  const promptBuilder = new StructuredPromptBuilder();

  // Register systems (order: Time -> Weather -> Temperature -> Soil -> Plant -> AI -> Communication -> Needs -> Sleep -> Building -> ResourceGathering -> Movement -> Memory)
  gameLoop.systemRegistry.register(new TimeSystem());
  gameLoop.systemRegistry.register(new WeatherSystem());
  gameLoop.systemRegistry.register(new TemperatureSystem());
  gameLoop.systemRegistry.register(new SoilSystem());

  // Register PlantSystem and inject species lookup
  const plantSystem = new PlantSystem(gameLoop.world.eventBus);
  const { getPlantSpecies } = await import('@ai-village/world');
  plantSystem.setSpeciesLookup(getPlantSpecies);
  gameLoop.systemRegistry.register(plantSystem);

  gameLoop.systemRegistry.register(new AISystem(llmQueue, promptBuilder));
  gameLoop.systemRegistry.register(new CommunicationSystem());
  gameLoop.systemRegistry.register(new NeedsSystem());
  gameLoop.systemRegistry.register(new SleepSystem());
  gameLoop.systemRegistry.register(new BuildingSystem());
  gameLoop.systemRegistry.register(new ResourceGatheringSystem());
  gameLoop.systemRegistry.register(new MovementSystem());
  gameLoop.systemRegistry.register(new MemorySystem());

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

  // Create plant info panel
  const plantInfoPanel = new PlantInfoPanel();

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

      // Update the tile inspector to show new state
      tileInspectorPanel.setSelectedTile(tile, x, y);
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

      // Update the tile inspector to show new state
      tileInspectorPanel.setSelectedTile(tile, x, y);
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

      // Update the tile inspector to show new state
      tileInspectorPanel.setSelectedTile(tile, x, y);
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

      // H - Skip 1 hour
      if (key === 'h' || key === 'H') {
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

      // D - Skip 1 day
      if (key === 'd' || key === 'D') {
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

      // W - Skip 7 days
      if (key === 'w' && shiftKey) { // Shift+W to avoid conflict with movement
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

          const plantEntity = new EntityImpl(createEntityId(), (gameLoop.world as any)._tick);
          const plantComponent = new PlantComponent({
            speciesId,
            position: { x: spawnX, y: spawnY },
            stage,
            age: stage === 'senescence' ? 60 : (stage === 'seeding' ? 50 : 40),
            generation: 0,
            health: 90,
            hydration: 70,
            nutrition: 60
          });

          plantEntity.addComponent(plantComponent);
          plantEntity.addComponent(createPositionComponent(spawnX, spawnY));
          plantEntity.addComponent(createRenderableComponent(speciesId, 'plant'));
          (gameLoop.world as any)._addEntity(plantEntity);

          console.log(`[DEBUG] Spawned ${species.name} (${stage}) at (${spawnX}, ${spawnY})`);
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
      // First check if placement UI handles the click
      if (placementUI.handleClick(screenX, screenY, button)) {
        return true;
      }

      // Check if tile inspector panel handles the click (for button clicks)
      const rect = canvas.getBoundingClientRect();
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

      // Left click - select agent or plant
      if (button === 0) {
        const entity = renderer.findEntityAtScreenPosition(screenX, screenY, gameLoop.world);
        if (entity) {
          const hasAgent = entity.components.has('agent');
          const hasPlant = entity.components.has('plant');

          if (hasAgent) {
            agentInfoPanel.setSelectedEntity(entity);
            plantInfoPanel.setSelectedEntity(null); // Deselect plant
            return true;
          } else if (hasPlant) {
            plantInfoPanel.setSelectedEntity(entity);
            agentInfoPanel.setSelectedEntity(null); // Deselect agent
            return true;
          }
        } else {
          // Click on empty space - deselect all
          agentInfoPanel.setSelectedEntity(null);
          plantInfoPanel.setSelectedEntity(null);
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
    const selectedEntity = agentInfoPanel.getSelectedEntity();
    renderer.render(gameLoop.world, selectedEntity);

    // Render building placement UI on top
    placementUI.render(renderer.getContext());

    // Render UI panels on top
    const ctx = renderer.getContext();
    const rect = canvas.getBoundingClientRect();
    agentInfoPanel.render(ctx, rect.width, rect.height, gameLoop.world);
    plantInfoPanel.render(ctx, rect.width, rect.height, gameLoop.world);
    tileInspectorPanel.render(ctx, rect.width, rect.height);

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
  createInitialAgents(gameLoop.world);

  // Create initial wild plants for Phase 9
  console.log('Creating initial wild plants...');
  await createInitialPlants(gameLoop.world);

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
  console.log('TIME:');
  console.log('  H - Skip 1 hour');
  console.log('  D - Skip 1 day');
  console.log('  Shift+W - Skip 7 days');
  console.log('  1/2/5 - Set time speed (1x/2x/5x)');
  console.log('PLANTS:');
  console.log('  P - Spawn test plant at advanced stage');
  console.log('  Click plant - View plant info');
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
  };
  (window as any).gameLoop = gameLoop;
  (window as any).renderer = renderer;
  (window as any).placementUI = placementUI;
  (window as any).blueprintRegistry = blueprintRegistry;
  (window as any).agentInfoPanel = agentInfoPanel;

  console.log('Building Placement UI ready. Press B to open building menu.');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
