import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { BiomeType } from '../types/TerrainTypes.js';

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
export class SoilSystem implements System {
  public readonly id: SystemId = 'soil';
  public readonly priority: number = 15;
  public readonly requiredComponents: ReadonlyArray<string> = [];

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides time acceleration for daily soil updates
   * @see WeatherSystem - provides rain/snow events that increase soil moisture
   */
  public readonly dependsOn = ['time', 'weather'] as const;

  private lastDayProcessed: number = -1;
  private accumulatedTime: number = 0; // Track elapsed time in seconds
  private readonly SECONDS_PER_DAY = 24 * 60 * 60; // 24 hours in seconds

  update(world: World, _entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get time acceleration from TimeComponent if available
    const timeEntities = world.query().with(CT.Time).executeEntities();
    let timeSpeedMultiplier = 1.0;
    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0] as any;
      const timeComp = timeEntity.getComponent(CT.Time) as any;
      if (timeComp && timeComp.speedMultiplier) {
        timeSpeedMultiplier = timeComp.speedMultiplier;
      }
    }

    // Accumulate real-time seconds (accounting for time acceleration)
    this.accumulatedTime += deltaTime * timeSpeedMultiplier;

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
   * Till a grass tile to make it plantable
   * TODO: Add agentId parameter for tool checking when agent-initiated tilling is implemented
   */
  public tillTile(world: World, tile: Tile, x: number, y: number, _agentId?: string): void {
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
