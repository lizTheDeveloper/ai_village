/**
 * Headless City Simulator
 *
 * Runs a full ECS game simulation (agents, buildings, resources) without rendering.
 * Uses CityManager for strategic decision-making.
 *
 * For fast-forward testing and time-lapse observation.
 */

import {
  GameLoop,
  CityManager,
  type World,
  type WorldMutator,
  type CityStats,
  type StrategicPriorities,
  type CityDecision,
  createEntityId,
  EntityImpl,
  createPositionComponent,
  createRenderableComponent,
  createBuildingComponent,
  createInventoryComponent,
  createResourceComponent,
  createTimeComponent,
  createWeatherComponent,
  createNamedLandmarksComponent,
  type AgentComponent,
  type SteeringComponent,
  CT,
  BuildingType,
  // Centralized system registration
  registerAllSystems as coreRegisterAllSystems,
  registerDefaultMaterials,
  initializeDefaultRecipes,
  globalRecipeRegistry,
  registerDefaultResearch,
} from '@ai-village/core';

// Import PlantSystemsConfig from the systems module since it's not re-exported
// Use local type definition to avoid import path issues
interface PlantSystemsConfig {
  PlantSystem: any;
  PlantDiscoverySystem: any;
  PlantDiseaseSystem: any;
  WildPlantPopulationSystem: any;
}

// Plant systems from @ai-village/botany (completes the extraction from core)
import {
  PlantSystem,
  PlantDiscoverySystem,
  PlantDiseaseSystem,
  WildPlantPopulationSystem,
} from '@ai-village/botany';

import { TerrainGenerator, ChunkManager } from '@ai-village/world';
import { createWanderingAgent } from '@ai-village/agents';
import type { Entity } from '@ai-village/core';

// =============================================================================
// INTERNAL TYPE EXTENSIONS
// =============================================================================

// Internal World API type for _worldEntityId (addEntity is now public)
interface WorldInternal extends World {
  _worldEntityId: string;
}

// GameLoop with public tick method
type GameLoopWithTick = GameLoop & {
  tick(deltaTime: number): void;
  world: World;
};

// =============================================================================
// TYPES
// =============================================================================

export type SimulatorPreset = 'basic' | 'large-city' | 'population-growth';

export interface SimulatorConfig {
  preset?: SimulatorPreset;
  worldSize?: { width: number; height: number };
  initialPopulation?: number;
  ticksPerBatch?: number;
  autoRun?: boolean;
}

export interface SimulatorStats {
  ticksRun: number;
  daysElapsed: number;
  monthsElapsed: number;
  ticksPerSecond: number;
  cityStats: CityStats;
  cityPriorities: StrategicPriorities;
}

type EventCallback = (...args: any[]) => void;

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

interface PresetConfig {
  worldSize: { width: number; height: number };
  initialPopulation: number;
  storageBuildings: number;
  foodPerStorage: number;
  enableEconomy: boolean;
}

function getPresetConfig(preset: SimulatorPreset): PresetConfig {
  switch (preset) {
    case 'basic':
      return {
        worldSize: { width: 200, height: 200 },
        initialPopulation: 50,
        storageBuildings: 1,
        foodPerStorage: 100,
        enableEconomy: false,
      };
    case 'large-city':
      return {
        worldSize: { width: 200, height: 200 },
        initialPopulation: 200,
        storageBuildings: 9,
        foodPerStorage: 500,
        enableEconomy: true,
      };
    case 'population-growth':
      return {
        worldSize: { width: 200, height: 200 },
        initialPopulation: 20,  // Start small
        storageBuildings: 2,
        foodPerStorage: 200,
        enableEconomy: true,  // Full systems for reproduction
      };
  }
}

// =============================================================================
// HEADLESS CITY SIMULATOR
// =============================================================================

export class HeadlessCitySimulator {
  private gameLoop: GameLoop;
  private cityManager: CityManager;
  private config: SimulatorConfig;
  private preset: SimulatorPreset;
  private presetConfig: PresetConfig;

  // State
  private running: boolean = false;
  private ticksRun: number = 0;
  private startTime: number = 0;
  private lastTickTime: number = 0;

  // Events
  private eventListeners: Map<string, EventCallback[]> = new Map();

  // Animation frame for browser-based execution
  private rafId: number | null = null;
  private ticksPerFrame: number = 1;

  constructor(config: SimulatorConfig = {}) {
    // Get preset configuration
    this.preset = config.preset ?? 'basic';
    this.presetConfig = getPresetConfig(this.preset);

    // Ensure presetConfig exists
    if (!this.presetConfig) {
      throw new Error(`Invalid preset: ${this.preset}`);
    }

    // Merge preset config with user overrides
    this.config = {
      ticksPerBatch: config.ticksPerBatch ?? 1,
      autoRun: config.autoRun ?? false,
      preset: this.preset,
      worldSize: config.worldSize ?? this.presetConfig.worldSize,
      initialPopulation: config.initialPopulation ?? this.presetConfig.initialPopulation,
    };

    // Initialize game loop
    this.gameLoop = new GameLoop();

    // Register systems based on preset
    this.registerSystemsForPreset();

    // Initialize city manager with manual control enabled
    this.cityManager = new CityManager({
      decisionInterval: 14400,  // 1 day
      statsUpdateInterval: 200,  // 10 seconds
      allowManualOverride: true,
    });
  }

  private registerSystemsForPreset(): void {
    // Register default materials and recipes
    registerDefaultMaterials();
    initializeDefaultRecipes(globalRecipeRegistry);
    registerDefaultResearch();

    // Generate session ID for metrics
    const gameSessionId = `headless_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Plant systems from @ai-village/botany (completes package extraction)
    const plantSystems: PlantSystemsConfig = {
      PlantSystem,
      PlantDiscoverySystem,
      PlantDiseaseSystem,
      WildPlantPopulationSystem,
    };

    // Use centralized system registration - full game engine, headless
    const coreResult = coreRegisterAllSystems(this.gameLoop, {
      llmQueue: undefined,  // No LLM in headless mode
      promptBuilder: undefined,
      gameSessionId,
      metricsServerUrl: 'ws://localhost:8765',
      enableMetrics: false,  // Disable metrics for performance
      enableAutoSave: false, // Disable auto-save
      plantSystems,
    });
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    const { worldSize, initialPopulation } = this.config;

    // Configure Timeline for headless mode: sparse snapshots for overnight simulations
    // Snapshots: begin, 1 min, 5 min, 10 min, then hourly
    // Daily cleanup to prevent memory leak while preserving liminal spaces
    const { timelineManager } = await import('@ai-village/core');
    timelineManager.setConfig({
      autoSnapshot: true,
      canonEventSaves: true, // Keep major events (births, deaths, etc.)
      intervalThresholds: [
        { afterTicks: 0, interval: 1200 },       // 0-1 min: snapshot at 1 min (1200 ticks)
        { afterTicks: 1200, interval: 4800 },    // 1-5 min: snapshot at 5 min (4800 ticks from last)
        { afterTicks: 6000, interval: 6000 },    // 5-10 min: snapshot at 10 min (6000 ticks from last)
        { afterTicks: 12000, interval: 72000 },  // 10+ min: hourly snapshots (72000 ticks = 1 hour)
      ],
      maxSnapshots: 50,  // Limit to 50 snapshots (vs default 100)
      maxAge: 24 * 60 * 60 * 1000,  // 24 hours - daily cleanup
    });

    // Create world entities
    const world = this.gameLoop.world;

    // Initialize city manager event subscriptions
    this.cityManager.initialize(world.eventBus);

    // Create world entity with time, weather, and landmarks (following test pattern)
    const worldEntity = new EntityImpl(createEntityId(), world.tick);
    worldEntity.addComponent(createTimeComponent());
    worldEntity.addComponent(createWeatherComponent('clear', 0.5, 14400)); // Clear weather, 50% intensity, 1 day duration
    worldEntity.addComponent(createNamedLandmarksComponent());
    const worldInternal = world as WorldInternal;
    world.addEntity(worldEntity);
    worldInternal._worldEntityId = worldEntity.id; // Critical for systems to find world entity

    // Create city center
    const cityCenter = {
      x: worldSize!.width / 2,
      y: worldSize!.height / 2,
    };

    // City bounds for agent containment (large-city preset)
    const cityBounds = this.presetConfig.enableEconomy ? {
      minX: 0,
      maxX: worldSize!.width,
      minY: 0,
      maxY: worldSize!.height,
    } : undefined;

    // Create initial buildings based on preset
    this.createInitialBuildings(worldInternal, cityCenter);

    // Create resources
    this.createResources(worldInternal, {
      minX: 0,
      maxX: worldSize!.width,
      minY: 0,
      maxY: worldSize!.height,
    });

    // Spawn initial population
    for (let i = 0; i < initialPopulation!; i++) {
      // For large-city preset, spread agents across entire city
      const spawnRadius = this.preset === 'large-city' ? 80 : 20;
      const x = cityCenter.x + (Math.random() - 0.5) * spawnRadius;
      const y = cityCenter.y + (Math.random() - 0.5) * spawnRadius;

      const agentId = createWanderingAgent(world as unknown as WorldMutator, x, y); // Use default speed (2.0)

      // Apply containment bounds if economy enabled
      if (cityBounds) {
        const agent = world.getEntity(agentId) as EntityImpl;
        agent.updateComponent<SteeringComponent>(CT.Steering, (current) => ({
          ...current,
          containmentBounds: cityBounds,
          containmentMargin: 20,
        }));
      }
    }

    // Run initial stabilization (following test pattern)
    for (let i = 0; i < 1000; i++) {
      const gameLoopWithTick = this.gameLoop as unknown as GameLoopWithTick; gameLoopWithTick.tick(0.05);
    }

    // Force initial stats update so UI shows correct values immediately
    this.cityManager.tick(this.gameLoop.world);

    // Force initial decision so director makes strategic assessment on load
    this.cityManager.forceDecision(this.gameLoop.world);

    this.emit('initialized', { population: initialPopulation, preset: this.preset });
  }

  start(): void {
    if (this.running) return;

    this.running = true;
    this.startTime = Date.now();
    this.lastTickTime = Date.now();

    // Start animation loop (runs 1 tick per frame by default)
    this.runLoop();

    this.emit('start');
  }

  pause(): void {
    if (!this.running) return;

    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.emit('pause');
  }

  reset(): void {
    this.pause();
    this.ticksRun = 0;
    this.startTime = 0;
    this.lastTickTime = 0;

    // Reinitialize game loop
    this.gameLoop = new GameLoop();

    // Re-register systems based on preset
    this.registerSystemsForPreset();

    // Reinitialize city manager
    this.cityManager = new CityManager({
      decisionInterval: 14400,
      statsUpdateInterval: 200,
      allowManualOverride: true,
    });

    this.initialize();
    this.emit('reset');
  }

  setSpeed(ticksPerFrame: number): void {
    this.ticksPerFrame = Math.max(1, Math.min(100, ticksPerFrame));
    this.emit('speed', this.ticksPerFrame);
  }

  private runLoop = (): void => {
    if (!this.running) return;

    // Run configured ticks per frame
    for (let i = 0; i < this.ticksPerFrame; i++) {
      this.tick();
    }

    // Schedule next frame
    this.rafId = requestAnimationFrame(this.runLoop);
  };

  /** Advance simulation by one tick. Public for test access. */
  tick(): void {
    // Run game systems
    const gameLoopWithTick = this.gameLoop as unknown as GameLoopWithTick;
    gameLoopWithTick.tick(0.05);

    // Run city manager
    this.cityManager.tick(this.gameLoop.world);

    this.ticksRun++;

    // Emit events
    if (this.ticksRun % 14400 === 0) {
      const day = Math.floor(this.ticksRun / 14400);
      this.emit('day', day);

      if (day % 30 === 0) {
        const month = Math.floor(day / 30);
        this.emit('month', month);
      }
    }

    if (this.ticksRun % 20 === 0) {
      this.emit('tick', this.ticksRun);
    }
  }

  // ---------------------------------------------------------------------------
  // MANUAL CONTROL
  // ---------------------------------------------------------------------------

  setPriorities(priorities: StrategicPriorities): void {
    this.cityManager.setPriorities(priorities as any);
    this.cityManager.broadcastPriorities(this.gameLoop.world, priorities as any);
    this.emit('priorities-changed', priorities);
  }

  releaseManualControl(): void {
    this.cityManager.releaseManualControl();
    this.emit('manual-control-released');
  }

  forceDecision(): void {
    this.cityManager.forceDecision(this.gameLoop.world);
    this.emit('decision', this.cityManager.getReasoning());
  }

  // ---------------------------------------------------------------------------
  // STATE ACCESS
  // ---------------------------------------------------------------------------

  getWorld(): World {
    return this.gameLoop.world as any;
  }

  getCityManager(): CityManager {
    return this.cityManager;
  }

  getStats(): SimulatorStats {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    const tps = elapsed > 0 ? this.ticksRun / elapsed : 0;

    return {
      ticksRun: this.ticksRun,
      daysElapsed: Math.floor(this.ticksRun / 14400),
      monthsElapsed: Math.floor(this.ticksRun / (14400 * 30)),
      ticksPerSecond: tps,
      cityStats: this.cityManager.getStats(),
      cityPriorities: this.cityManager.getPriorities(),
    };
  }

  isRunning(): boolean {
    return this.running;
  }

  isManuallyControlled(): boolean {
    return this.cityManager.isManuallyControlled();
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(...args);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // WORLD SETUP
  // ---------------------------------------------------------------------------

  private createInitialBuildings(world: WorldInternal, cityCenter: { x: number; y: number }): void {
    const { storageBuildings, foodPerStorage } = this.presetConfig;

    // Campfire at center
    const campfire = new EntityImpl(createEntityId(), 0);
    campfire.addComponent(createBuildingComponent(BuildingType.Campfire, 1, 100));
    campfire.addComponent(createPositionComponent(cityCenter.x, cityCenter.y));
    campfire.addComponent(createRenderableComponent('campfire', 'object'));
    world.addEntity(campfire);

    // Storage buildings based on preset
    if (this.preset === 'large-city') {
      // Large city: 9 storage buildings distributed across city
      const storageLocations = [
        { x: cityCenter.x, y: cityCenter.y }, // Center
        { x: cityCenter.x - 50, y: cityCenter.y - 50 }, // SW
        { x: cityCenter.x + 50, y: cityCenter.y - 50 }, // SE
        { x: cityCenter.x - 50, y: cityCenter.y + 50 }, // NW
        { x: cityCenter.x + 50, y: cityCenter.y + 50 }, // NE
        { x: cityCenter.x, y: cityCenter.y - 50 }, // S
        { x: cityCenter.x, y: cityCenter.y + 50 }, // N
        { x: cityCenter.x - 50, y: cityCenter.y }, // W
        { x: cityCenter.x + 50, y: cityCenter.y }, // E
      ];
      for (const loc of storageLocations) {
        const storage = new EntityImpl(createEntityId(), 0);
        storage.addComponent(createBuildingComponent(BuildingType.StorageChest, 1, 100));
        storage.addComponent(createPositionComponent(loc.x, loc.y));
        storage.addComponent(createRenderableComponent('storage-chest', 'object'));
        const inventory = createInventoryComponent(20, 500);
        inventory.slots[0] = { itemId: 'food', quantity: foodPerStorage };
        inventory.slots[1] = { itemId: 'wood', quantity: 50 };
        inventory.slots[2] = { itemId: 'stone', quantity: 30 };
        storage.addComponent(inventory);
        world.addEntity(storage);
      }
    } else {
      // Basic/population-growth: Single storage near center
      const storage = new EntityImpl(createEntityId(), 0);
      storage.addComponent(createBuildingComponent(BuildingType.StorageChest, 1, 100));
      storage.addComponent(createPositionComponent(cityCenter.x + 3, cityCenter.y));
      storage.addComponent(createRenderableComponent('storage-chest', 'object'));
      const inventory = createInventoryComponent(20, 500);
      inventory.slots[0] = { itemId: 'food', quantity: foodPerStorage };
      inventory.slots[1] = { itemId: 'wood', quantity: 30 };
      inventory.slots[2] = { itemId: 'stone', quantity: 20 };
      storage.addComponent(inventory);
      world.addEntity(storage);
    }

    // Farm (basic preset gets farm to prevent starvation)
    // Note: 'farm-plot' and 'tent' are not in BuildingType enum, using Bedroll as placeholder
    if (this.preset === 'basic') {
      const shelter = new EntityImpl(createEntityId(), 0);
      shelter.addComponent(createBuildingComponent(BuildingType.Bedroll, 1, 100));
      shelter.addComponent(createPositionComponent(cityCenter.x + 5, cityCenter.y + 5));
      shelter.addComponent(createRenderableComponent('bedroll', 'object'));
      world.addEntity(shelter);
    }

    // Initial shelter
    const shelter = new EntityImpl(createEntityId(), 0);
    shelter.addComponent(createBuildingComponent(BuildingType.Bedroll, 1, 100));
    shelter.addComponent(createPositionComponent(cityCenter.x - 3, cityCenter.y));
    shelter.addComponent(createRenderableComponent('bedroll', 'object'));
    world.addEntity(shelter);
  }

  private createResources(world: WorldInternal, bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    // Create trees
    for (let i = 0; i < 30; i++) {
      const x = bounds.minX + 10 + Math.random() * (width - 20);
      const y = bounds.minY + 10 + Math.random() * (height - 20);

      const tree = new EntityImpl(createEntityId(), 0);
      tree.addComponent(createPositionComponent(x, y));
      tree.addComponent(createResourceComponent('wood', 20 + Math.floor(Math.random() * 30), 0.001, 1.0));
      tree.addComponent(createRenderableComponent('tree', 'object'));
      world.addEntity(tree);
    }

    // Create stone deposits
    for (let i = 0; i < 20; i++) {
      const x = bounds.minX + 10 + Math.random() * (width - 20);
      const y = bounds.minY + 10 + Math.random() * (height - 20);

      const stone = new EntityImpl(createEntityId(), 0);
      stone.addComponent(createPositionComponent(x, y));
      stone.addComponent(createResourceComponent('stone', 15 + Math.floor(Math.random() * 25), 0, 0.8));
      stone.addComponent(createRenderableComponent('rock', 'object'));
      world.addEntity(stone);
    }

    // Create food nodes (berry bushes)
    for (let i = 0; i < 15; i++) {
      const x = bounds.minX + 10 + Math.random() * (width - 20);
      const y = bounds.minY + 10 + Math.random() * (height - 20);

      const food = new EntityImpl(createEntityId(), 0);
      food.addComponent(createPositionComponent(x, y));
      food.addComponent(createResourceComponent('food', 15 + Math.floor(Math.random() * 10), 0.01, 1.5));
      food.addComponent(createRenderableComponent('blueberry-bush', 'object'));
      world.addEntity(food);
    }
  }
}
