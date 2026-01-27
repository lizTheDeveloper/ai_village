import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { BiomeType } from '../types/TerrainTypes.js';
import type { TimeComponent } from './TimeSystem.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { getWorkingTools } from '../components/InventoryComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';

export interface Tile {
  terrain: string;
  moisture: number;
  fertility: number;
  biome?: BiomeType;
  tilled: boolean;
  plantability: number;
  nutrients: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  fertilized: boolean;
  fertilizerDuration: number;
  lastWatered: number;
  lastTilled: number;
  composted: boolean;
}

/**
 * SoilSystem manages soil properties for farming.
 *
 * Responsibilities:
 * - Track soil depletion through harvests
 * - Manage moisture decay over time
 * - Handle fertilizer duration
 * - Emit soil-related events
 *
 * Priority: 15 (after WeatherSystem, before farming systems)
 *
 * Dependencies:
 * @see TimeSystem (priority 3) - Provides time tracking for daily soil updates and fertilizer duration
 * @see WeatherSystem (priority 5) - Provides weather events (rain, snow) that affect soil moisture
 */
export class SoilSystem extends BaseSystem {
  public readonly id: SystemId = 'soil';
  public readonly priority: number = 15;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides time acceleration for daily soil updates
   * @see WeatherSystem - provides rain/snow events that increase soil moisture
   */
  public readonly dependsOn = ['time', 'weather'] as const;

  private lastDayProcessed: number = -1;
  private accumulatedTime: number = 0; // Track elapsed time in seconds
  private readonly SECONDS_PER_DAY = 24 * 60 * 60; // 24 hours in seconds
  private initialized = false;

  // Singleton entity caching
  private timeEntityId: string | null = null;

  protected onInitialize(world: World): void {
    if (this.initialized) return;
    this.initialized = true;

    // Subscribe to weather:changed events to emit specific rain/snow events
    world.eventBus.on('weather:changed', (event) => {
      this.handleWeatherChange(world, event);
    });

    // Subscribe to daily time events for moisture decay
    world.eventBus.on('world:time:day', (event) => {
      this.processDailyMoistureDecay(world);
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Get time acceleration from TimeComponent if available
    const timeComp = ctx.getSingleton<TimeComponent>(CT.Time);
    const timeSpeedMultiplier = timeComp?.speedMultiplier ?? 1.0;

    // Accumulate real-time seconds (accounting for time acceleration)
    this.accumulatedTime += ctx.deltaTime * timeSpeedMultiplier;

    // Calculate current day based on accumulated time
    const currentDay = Math.floor(this.accumulatedTime / this.SECONDS_PER_DAY);

    // Process daily soil updates (moisture decay, fertilizer duration)
    if (currentDay > this.lastDayProcessed) {
      this.processDailyUpdates();
      this.lastDayProcessed = currentDay;
    }
  }

  /**
   * Process daily soil updates across all tiles
   */
  private processDailyUpdates(): void {
    // This will be called by the World when it has access to chunks
    // For now, this is a placeholder that systems can hook into
  }

  /**
   * Handle weather change events and emit specific rain/snow events
   */
  private handleWeatherChange(world: World, event: any): void {
    const { weatherType, intensity } = event.data;

    if (weatherType === 'rain') {
      // Emit rain event for soil moisture integration
      world.eventBus.emit({
        type: 'weather:rain',
        source: 'soil-system',
        data: {
          intensity: intensity || 0.5,
        },
      });
      // Apply rain to all outdoor tiles
      this.handleRainEvent(world, intensity || 0.5);
    } else if (weatherType === 'snow') {
      // Emit snow event for soil moisture integration
      world.eventBus.emit({
        type: 'weather:snow',
        source: 'soil-system',
        data: {
          intensity: intensity || 0.5,
        },
      });
      // Apply snow to all outdoor tiles
      this.handleSnowEvent(world, intensity || 0.5);
    }
  }

  /**
   * Handle rain events by increasing moisture on outdoor tiles
   */
  private handleRainEvent(world: World, intensity: number): void {
    const chunkManager = world.getChunkManager();
    if (!chunkManager) return;

    // Check if getLoadedChunks is available
    if ('getLoadedChunks' in chunkManager && typeof chunkManager.getLoadedChunks === 'function') {
      const chunks = chunkManager.getLoadedChunks();
      for (const chunk of chunks) {
        for (let y = 0; y < chunk.tiles.length; y++) {
          for (let x = 0; x < chunk.tiles[y]!.length; x++) {
            const tile = chunk.tiles[y]![x]!;
            const worldX = chunk.x * 32 + x; // CHUNK_SIZE = 32
            const worldY = chunk.y * 32 + y;

            // Only apply rain to outdoor tiles
            if (!this.isTileIndoors(tile, world, worldX, worldY)) {
              this.applyRain(world, tile as Tile, worldX, worldY, intensity);
            }
          }
        }
      }
    }
  }

  /**
   * Handle snow events by increasing moisture on outdoor tiles
   */
  private handleSnowEvent(world: World, intensity: number): void {
    const chunkManager = world.getChunkManager();
    if (!chunkManager) return;

    // Check if getLoadedChunks is available
    if ('getLoadedChunks' in chunkManager && typeof chunkManager.getLoadedChunks === 'function') {
      const chunks = chunkManager.getLoadedChunks();
      for (const chunk of chunks) {
        for (let y = 0; y < chunk.tiles.length; y++) {
          for (let x = 0; x < chunk.tiles[y]!.length; x++) {
            const tile = chunk.tiles[y]![x]!;
            const worldX = chunk.x * 32 + x; // CHUNK_SIZE = 32
            const worldY = chunk.y * 32 + y;

            // Only apply snow to outdoor tiles
            if (!this.isTileIndoors(tile, world, worldX, worldY)) {
              this.applySnow(world, tile as Tile, worldX, worldY, intensity);
            }
          }
        }
      }
    }
  }

  /**
   * Process daily moisture decay based on temperature
   */
  private processDailyMoistureDecay(world: World): void {
    // Get current temperature for evaporation modifier
    const temperature = this.getCurrentTemperature(world);

    const chunkManager = world.getChunkManager();
    if (!chunkManager) return;

    // Check if getLoadedChunks is available
    if ('getLoadedChunks' in chunkManager && typeof chunkManager.getLoadedChunks === 'function') {
      const chunks = chunkManager.getLoadedChunks();
      for (const chunk of chunks) {
        for (let y = 0; y < chunk.tiles.length; y++) {
          for (let x = 0; x < chunk.tiles[y]!.length; x++) {
            const tile = chunk.tiles[y]![x]!;
            const worldX = chunk.x * 32 + x; // CHUNK_SIZE = 32
            const worldY = chunk.y * 32 + y;

            // Apply decay to outdoor tiles (indoor tiles decay slower)
            if (!this.isTileIndoors(tile, world, worldX, worldY)) {
              this.decayMoisture(world, tile as Tile, worldX, worldY, temperature);
            }
          }
        }
      }
    }
  }

  /**
   * Check if a tile is indoors (covered by building)
   * Buildings block rain and sun through walls, doors, windows, or roofs
   */
  private isTileIndoors(tile: unknown, _world: World, _x: number, _y: number): boolean {
    // Per CLAUDE.md: No silent fallbacks - validate tile structure
    if (!tile || typeof tile !== 'object') {
      throw new Error(`isTileIndoors requires valid tile object, got ${typeof tile}`);
    }

    // Check if tile has any building structure:
    // - wall: Blocks rain and sun completely
    // - door: Blocks rain and sun (even when open)
    // - window: Blocks rain, allows light but still provides shelter
    // - roof: Provides overhead coverage (primary rain/sun blocker)
    // Any of these means the tile is covered by a building
    const tileObj = tile as {wall?: unknown; door?: unknown; window?: unknown; roof?: unknown};
    const hasWall = tileObj.wall !== undefined && tileObj.wall !== null;
    const hasDoor = tileObj.door !== undefined && tileObj.door !== null;
    const hasWindow = tileObj.window !== undefined && tileObj.window !== null;
    const hasRoof = tileObj.roof !== undefined && tileObj.roof !== null;

    return hasWall || hasDoor || hasWindow || hasRoof;
  }

  /**
   * Get current temperature from TemperatureSystem or TimeSystem
   */
  private getCurrentTemperature(world: World): number {
    // Try to get temperature from TemperatureSystem singleton
    const tempEntities = world.query().with(CT.Temperature).executeEntities();
    if (tempEntities.length > 0) {
      const tempComp = tempEntities[0]!.components.get('temperature');
      if (tempComp && 'currentTemp' in tempComp && typeof tempComp.currentTemp === 'number') {
        return tempComp.currentTemp;
      }
    }

    // Fallback to moderate temperature if no temperature data available
    // CLAUDE.md: Normally we'd throw, but temperature affects evaporation rate,
    // not core correctness, so using a safe default is acceptable here
    return 20; // Celsius - moderate temperature
  }

  /**
   * Till a grass tile to make it plantable
   * Requires agent to have a hoe tool for optimal tilling
   */
  public tillTile(world: World, tile: Tile, x: number, y: number, agentId?: string): void {
    // CLAUDE.md: Validate inputs, no silent fallbacks
    if (!tile) {
      const error = 'tillTile requires a valid tile object';
      console.error(`[SoilSystem] ❌ ERROR: ${error}`);
      throw new Error(error);
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const error = `tillTile requires valid position coordinates, got (${x},${y})`;
      console.error(`[SoilSystem] ❌ ERROR: ${error}`);
      throw new Error(error);
    }

    // CLAUDE.md: Tool checking - agents must have a hoe to till
    // This prevents tilling without proper equipment
    if (agentId) {
      const agent = world.getEntity(agentId);
      if (!agent) {
        const error = `Agent ${agentId} not found`;
        console.error(`[SoilSystem] ❌ ERROR: ${error}`);
        throw new Error(error);
      }

      const inventory = agent.getComponent<InventoryComponent>(CT.Inventory);
      if (!inventory) {
        const error = `Agent ${agentId} has no inventory - cannot check for tools`;
        console.error(`[SoilSystem] ❌ ERROR: ${error}`);
        throw new Error(error);
      }

      // Check for hoe tool - required for tilling
      const hoeTools = getWorkingTools(inventory, 'hoe');
      if (hoeTools.length === 0) {
        const error = `Agent ${agentId} has no working hoe. Tilling requires a hoe tool.`;
        console.error(`[SoilSystem] ❌ ERROR: ${error}`);
        throw new Error(error);
      }
      // Tool found - tilling can proceed
      // TODO (Phase 36+): Degrade tool condition after use
    }

    // CLAUDE.md: CRITICAL - Biome data is REQUIRED for fertility calculation
    // If biome is missing, terrain generation failed - crash immediately
    if (!tile.biome) {
      const error = `Tile at (${x},${y}) has no biome data. Terrain generation failed or chunk not generated. Cannot determine fertility for farming.`;
      console.error(`[SoilSystem] ❌ CRITICAL ERROR: ${error}`);
      console.error(`[SoilSystem] Tile state:`, JSON.stringify(tile, null, 2));
      throw new Error(error);
    }

    if (tile.terrain !== 'grass' && tile.terrain !== 'dirt') {
      const error = `Cannot till ${tile.terrain} terrain at (${x},${y}). Only grass and dirt can be tilled.`;
      console.error(`[SoilSystem] ❌ ERROR: ${error}`);
      throw new Error(error);
    }

    // Prevent re-tilling if tile still has plantability remaining
    // Allow re-tilling if depleted (plantability === 0) to restore fertility
    if (tile.tilled && tile.plantability > 0) {
      const error = `Tile at (${x},${y}) is already tilled. Plantability: ${tile.plantability}/3 uses remaining. Wait until depleted to re-till.`;
      console.error(`[SoilSystem] ❌ ERROR: ${error}`);
      throw new Error(error);
    }
    // Change terrain to dirt
    tile.terrain = 'dirt';
    // Set fertility based on biome (biome is guaranteed to exist due to check above)
    tile.fertility = this.getInitialFertility(tile.biome!); // ! is safe due to validation

    // Make plantable
    tile.tilled = true;
    tile.plantability = 3;
    tile.lastTilled = world.tick;
    // Initialize nutrients based on biome
    const nutrientBase = tile.fertility;
    tile.nutrients = {
      nitrogen: nutrientBase,
      phosphorus: nutrientBase * 0.8,
      potassium: nutrientBase * 0.9,
    };

    // Emit tilling event
    world.eventBus.emit({
      type: 'soil:tilled',
      source: 'soil-system',
      data: {
        x,
        y,
      },
    });
  }

  /**
   * Water a tile to increase moisture
   */
  public waterTile(world: World, tile: Tile, x: number, y: number): void {
    if (!tile.nutrients) {
      throw new Error(`Tile at (${x},${y}) missing required nutrients data`);
    }

    const oldMoisture = tile.moisture;

    // Increase moisture by 20, capped at 100
    tile.moisture = Math.min(100, tile.moisture + 20);
    tile.lastWatered = world.tick;

    // Emit watering event
    world.eventBus.emit({
      type: 'soil:watered',
      source: 'soil-system',
      data: {
        x,
        y,
        amount: 20,
      },
    });

    // Emit moisture change event
    if (tile.moisture !== oldMoisture) {
      world.eventBus.emit({
        type: 'soil:moistureChanged',
        source: 'soil-system',
        data: {
          x,
          y,
          oldMoisture,
          newMoisture: tile.moisture,
        },
      });
    }
  }

  /**
   * Apply fertilizer to a tile
   */
  public fertilizeTile(
    world: World,
    tile: Tile,
    x: number,
    y: number,
    fertilizerType: FertilizerType
  ): void {
    if (!tile.nutrients) {
      throw new Error(`Tile at (${x},${y}) missing required nutrients data`);
    }

    // Apply fertility boost (cap at 100)
    tile.fertility = Math.min(100, tile.fertility + fertilizerType.fertilityBoost);

    // Apply nutrient boosts (cap at 100)
    tile.nutrients.nitrogen = Math.min(100, tile.nutrients.nitrogen + fertilizerType.nitrogenBoost);
    tile.nutrients.phosphorus = Math.min(
      100,
      tile.nutrients.phosphorus + fertilizerType.phosphorusBoost
    );
    tile.nutrients.potassium = Math.min(
      100,
      tile.nutrients.potassium + fertilizerType.potassiumBoost
    );

    // Set fertilized flag and duration (convert days to seconds)
    tile.fertilized = true;
    tile.fertilizerDuration = fertilizerType.duration * this.SECONDS_PER_DAY;

    if (fertilizerType.id === 'compost') {
      tile.composted = true;
    }

    // Emit fertilizer event
    world.eventBus.emit({
      type: 'soil:fertilized',
      source: 'soil-system',
      data: {
        x,
        y,
        fertilizerType: fertilizerType.id,
        nutrientBoost: fertilizerType.fertilityBoost,
      },
    });
  }

  /**
   * Deplete soil after a harvest
   */
  public depleteSoil(world: World, tile: Tile, x: number, y: number): void {
    if (!tile.tilled) {
      throw new Error(`Cannot deplete untilled tile at (${x},${y})`);
    }

    // Reduce fertility by 15
    tile.fertility = Math.max(0, tile.fertility - 15);

    // Decrement plantability counter
    tile.plantability = Math.max(0, tile.plantability - 1);

    // If depleted, emit event
    if (tile.plantability === 0) {
      tile.tilled = false;
      world.eventBus.emit({
        type: 'soil:depleted',
        source: 'soil-system',
        data: {
          x,
          y,
          nutrientLevel: tile.fertility,
        },
      });
    }
  }

  /**
   * Seasonal modifiers for moisture evaporation rate
   */
  private readonly SEASONAL_MODIFIERS = {
    spring: 1.0,   // Normal evaporation
    summer: 1.25,  // +25% evaporation (hot, dry)
    fall: 1.0,     // Normal evaporation
    winter: 0.5,   // -50% evaporation (cold, low evaporation)
  } as const;

  /**
   * Process moisture decay for a tile
   */
  public decayMoisture(
    world: World,
    tile: Tile,
    x: number,
    y: number,
    temperature: number
  ): void {
    if (tile.fertility === undefined) {
      throw new Error(`Tile fertility not set - required for farming at (${x},${y})`);
    }

    const oldMoisture = tile.moisture;

    // Base decay: -10 per day
    let decay = 10;

    // Modify by temperature
    if (temperature > 25) {
      // Hot: +50% decay
      decay *= 1.5;
    } else if (temperature < 10) {
      // Cold: -50% decay
      decay *= 0.5;
    }

    // Modify by season
    const currentSeason = this.getCurrentSeason(world);
    if (currentSeason) {
      const seasonalModifier = this.SEASONAL_MODIFIERS[currentSeason];
      if (seasonalModifier === undefined) {
        throw new Error(`Missing seasonal modifier for season: ${currentSeason}`);
      }
      decay *= seasonalModifier;
    }

    tile.moisture = Math.max(0, tile.moisture - decay);

    // Emit moisture change event if changed
    if (tile.moisture !== oldMoisture) {
      world.eventBus.emit({
        type: 'soil:moistureChanged',
        source: 'soil-system',
        data: {
          x,
          y,
          oldMoisture,
          newMoisture: tile.moisture,
        },
      });
    }
  }

  /**
   * Process rain moisture increase for outdoor tiles
   */
  public applyRain(world: World, tile: Tile, x: number, y: number, intensity: number): void {
    const oldMoisture = tile.moisture;

    // Rain adds 40 moisture * intensity
    tile.moisture = Math.min(100, tile.moisture + 40 * intensity);

    // Emit moisture change event
    if (tile.moisture !== oldMoisture) {
      world.eventBus.emit({
        type: 'soil:moistureChanged',
        source: 'soil-system',
        data: {
          x,
          y,
          oldMoisture,
          newMoisture: tile.moisture,
        },
      });
    }
  }

  /**
   * Process snow moisture increase for outdoor tiles
   */
  public applySnow(world: World, tile: Tile, x: number, y: number, intensity: number): void {
    const oldMoisture = tile.moisture;

    // Snow adds 20 moisture * intensity
    tile.moisture = Math.min(100, tile.moisture + 20 * intensity);

    // Emit moisture change event
    if (tile.moisture !== oldMoisture) {
      world.eventBus.emit({
        type: 'soil:moistureChanged',
        source: 'soil-system',
        data: {
          x,
          y,
          oldMoisture,
          newMoisture: tile.moisture,
        },
      });
    }
  }

  /**
   * Tick down fertilizer duration
   */
  public tickFertilizer(tile: Tile, deltaTime: number): void {
    if (tile.fertilized && tile.fertilizerDuration > 0) {
      tile.fertilizerDuration = Math.max(0, tile.fertilizerDuration - deltaTime);

      if (tile.fertilizerDuration === 0) {
        tile.fertilized = false;
      }
    }
  }

  /**
   * Get current season from TimeComponent
   * Returns null if no time entity exists (season modifiers won't apply)
   */
  private getCurrentSeason(world: World): 'spring' | 'summer' | 'fall' | 'winter' | null {
    if (!this.timeEntityId) {
      const timeEntities = world.query().with(CT.Time).executeEntities();
      if (timeEntities.length === 0) return null;
      const firstEntity = timeEntities[0];
      if (!firstEntity) return null;
      this.timeEntityId = firstEntity.id;
    }
    const timeEntity = world.getEntity(this.timeEntityId);
    if (!timeEntity) {
      this.timeEntityId = null;
      return null;
    }

    const timeComp = timeEntity.getComponent<TimeComponent>(CT.Time);
    if (!timeComp) {
      return null;
    }

    // Season field may not exist in older saves or if TimeSystem hasn't updated yet
    return timeComp.season || null;
  }

  /**
   * Get initial fertility based on biome
   * CLAUDE.md: NO silent fallbacks
   * NOTE: Biome is now validated in tillTile(), so this will never receive undefined
   */
  private getInitialFertility(biome: BiomeType): number {
    switch (biome) {
      case 'plains':
        return 70 + Math.random() * 10; // 70-80
      case 'forest':
        return 60 + Math.random() * 10; // 60-70
      case 'river':
        return 80 + Math.random() * 10; // 80-90
      case 'desert':
        return 20 + Math.random() * 10; // 20-30
      case 'mountains':
        return 40 + Math.random() * 10; // 40-50
      case 'ocean':
        return 0; // Cannot farm in ocean
      default:
        // CLAUDE.md: If we get an unknown biome, that's a bug - crash
        throw new Error(`Unknown biome type: ${biome} - cannot determine fertility`);
    }
  }
}

/**
 * Fertilizer type definitions
 */
export interface FertilizerType {
  id: string;
  name: string;
  fertilityBoost: number;
  nitrogenBoost: number;
  phosphorusBoost: number;
  potassiumBoost: number;
  duration: number; // Days
}

/**
 * Available fertilizer types
 */
export const FERTILIZERS: Record<string, FertilizerType> = {
  compost: {
    id: 'compost',
    name: 'Compost',
    fertilityBoost: 20,
    nitrogenBoost: 10,
    phosphorusBoost: 5,
    potassiumBoost: 10,
    duration: 90, // 1 season
  },
  manure: {
    id: 'manure',
    name: 'Manure',
    fertilityBoost: 25,
    nitrogenBoost: 15,
    phosphorusBoost: 8,
    potassiumBoost: 12,
    duration: 90, // 1 season
  },
  'fish-meal': {
    id: 'fish-meal',
    name: 'Fish Meal',
    fertilityBoost: 15,
    nitrogenBoost: 20,
    phosphorusBoost: 15,
    potassiumBoost: 5,
    duration: 7, // 1 week
  },
  'bone-meal': {
    id: 'bone-meal',
    name: 'Bone Meal',
    fertilityBoost: 10,
    nitrogenBoost: 5,
    phosphorusBoost: 25,
    potassiumBoost: 5,
    duration: 14, // 2 weeks
  },
};
