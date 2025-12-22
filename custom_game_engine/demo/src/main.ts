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
import { Renderer, InputHandler, BuildingPlacementUI, AgentInfoPanel, TileInspectorPanel } from '@ai-village/renderer';
import {
  OllamaProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
} from '@ai-village/llm';
import { TerrainGenerator, ChunkManager } from '@ai-village/world';

/**
 * Phase 8 Demo (Weather & Temperature)
 * Tests weather system, temperature mechanics, heat sources, and building insulation.
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
  // Position: Near spawn point (5, 5)
  const campfireEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  campfireEntity.addComponent(createBuildingComponent('campfire', 1, 100)); // 100% complete
  campfireEntity.addComponent(createPositionComponent(5, 5));
  campfireEntity.addComponent(createRenderableComponent('campfire', 'building')); // Make it visible
  (world as any)._addEntity(campfireEntity);
  console.log(`Created campfire at (5, 5) - Entity ${campfireEntity.id}`);

  // Create a completed tent (provides shelter)
  // Position: Near campfire (8, 6)
  const tentEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  tentEntity.addComponent(createBuildingComponent('tent', 1, 100)); // 100% complete
  tentEntity.addComponent(createPositionComponent(8, 6));
  tentEntity.addComponent(createRenderableComponent('tent', 'building')); // Make it visible
  (world as any)._addEntity(tentEntity);
  console.log(`Created tent at (8, 6) - Entity ${tentEntity.id}`);

  // Create a building under construction (50% complete)
  // Position: Near village (10, 10)
  const constructionEntity = new EntityImpl(createEntityId(), (world as any)._tick);
  constructionEntity.addComponent(createBuildingComponent('storage-chest', 1, 50)); // 50% complete
  constructionEntity.addComponent(createPositionComponent(10, 10));
  constructionEntity.addComponent(createRenderableComponent('storage-chest', 'building')); // Make it visible
  (world as any)._addEntity(constructionEntity);
  console.log(`Created storage-chest (50% complete) at (10, 10) - Entity ${constructionEntity.id}`);
}

function main() {
  console.log('AI Village - Phase 8 Demo (Weather & Temperature)');

  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Create game loop
  const gameLoop = new GameLoop();

  // Create LLM components
  const llmProvider = new OllamaProvider('qwen3:4b');
  const llmQueue = new LLMDecisionQueue(llmProvider, 2);
  const promptBuilder = new StructuredPromptBuilder();

  // Register systems (order: Weather -> Temperature -> Soil -> AI -> Communication -> Needs -> Building -> ResourceGathering -> Movement -> Memory)
  gameLoop.systemRegistry.register(new WeatherSystem());
  gameLoop.systemRegistry.register(new TemperatureSystem());
  gameLoop.systemRegistry.register(new SoilSystem());
  gameLoop.systemRegistry.register(new AISystem(llmQueue, promptBuilder));
  gameLoop.systemRegistry.register(new CommunicationSystem());
  gameLoop.systemRegistry.register(new NeedsSystem());
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

  const placementValidator = new PlacementValidator();

  const placementUI = new BuildingPlacementUI({
    registry: blueprintRegistry,
    validator: placementValidator,
    camera: renderer.getCamera(),
    eventBus: gameLoop.world.eventBus,
  });

  // Create agent info panel
  const agentInfoPanel = new AgentInfoPanel();

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
        } else if (key === 'w' || key === 'W') {
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

      // Left click - select agent
      if (button === 0) {
        const entity = renderer.findEntityAtScreenPosition(screenX, screenY, gameLoop.world);
        if (entity) {
          const hasAgent = entity.components.has('agent');
          if (hasAgent) {
            console.log(`[Main] Selected agent: ${entity.id}`);
            agentInfoPanel.setSelectedEntity(entity);
            return true;
          } else {
            console.log(`[Main] Clicked entity ${entity.id} but it's not an agent`);
          }
        } else {
          // Click on empty space - deselect
          console.log('[Main] Deselected agent');
          agentInfoPanel.setSelectedEntity(null);
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
    agentInfoPanel.render(ctx, rect.width, rect.height);
    tileInspectorPanel.render(ctx, rect.width, rect.height);

    requestAnimationFrame(renderLoop);
  }

  // Update status
  function updateStatus() {
    if (!statusEl) return;

    const stats = gameLoop.getStats();
    statusEl.textContent = `Running - Tick ${stats.currentTick} - Avg: ${stats.avgTickTimeMs.toFixed(2)}ms`;
    statusEl.className = 'status running';
  }

  setInterval(updateStatus, 100);

  // Create world entity with WeatherComponent
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

  // Create initial buildings for playtest
  // Per work order acceptance criteria: "At least one building should be visible in the world"
  // This must be done BEFORE starting the game loop so buildings exist on first render
  console.log('Creating initial buildings...');
  createInitialBuildings(gameLoop.world);

  // Start
  console.log('Starting game loop...');
  gameLoop.start();

  console.log('Starting render loop...');
  renderLoop();

  console.log('Phase 8 initialized successfully!');
  console.log('Game loop:', gameLoop);
  console.log('Systems:', gameLoop.systemRegistry.getSorted());

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
