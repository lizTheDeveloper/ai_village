import type { SystemId, BiomeType, Entity, World } from '@ai-village/core';
import { ComponentType as CT, BaseSystem, type SystemContext } from '@ai-village/core';
import fertilizersData from '../../data/fertilizers.json';
import biomeFertilityData from '../../data/biome-fertility.json';
import soilConstantsData from '../../data/soil-constants.json';

interface TimeComponent {
  type: 'time';
  version: number;
  speedMultiplier?: number;
}

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
  public readonly requiredComponents: ReadonlyArray<string> = [];
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides time acceleration for daily soil updates
   * @see WeatherSystem - provides rain/snow events that increase soil moisture
   */
  public readonly dependsOn = ['time', 'weather'] as const;

  private lastDayProcessed: number = -1;
  private accumulatedTime: number = 0; // Track elapsed time in seconds
  private readonly SECONDS_PER_DAY = SOIL_CONSTANTS.timeConstants.secondsPerDay;

  protected onUpdate(ctx: SystemContext): void {
    // Get time acceleration from TimeComponent if available
    const timeEntities = ctx.world.query().with(CT.Time).executeEntities();
    let timeSpeedMultiplier = 1.0;
    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0];
      if (timeEntity) {
        const timeComp = timeEntity.getComponent<TimeComponent>(CT.Time);
        if (timeComp && timeComp.speedMultiplier) {
          timeSpeedMultiplier = timeComp.speedMultiplier;
        }
      }
    }

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
   * Till a grass tile to make it plantable
   * @param _agentId Optional agent ID for future tool checking (currently unused)
   */
  public tillTile(world: World, tile: Tile, x: number, y: number, _agentId?: string): void {
    // CLAUDE.md: Validate inputs, no silent fallbacks
    if (!tile) {
      const error = 'tillTile requires a valid tile object';
      console.error(`[SoilSystem] ERROR: ${error}`);
      throw new Error(error);
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const error = `tillTile requires valid position coordinates, got (${x},${y})`;
      console.error(`[SoilSystem] ERROR: ${error}`);
      throw new Error(error);
    }

    // CLAUDE.md: CRITICAL - Biome data is REQUIRED for fertility calculation
    // If biome is missing, terrain generation failed - crash immediately
    if (!tile.biome) {
      const error = `Tile at (${x},${y}) has no biome data. Terrain generation failed or chunk not generated. Cannot determine fertility for farming.`;
      console.error(`[SoilSystem] CRITICAL ERROR: ${error}`);
      console.error(`[SoilSystem] Tile state:`, JSON.stringify(tile, null, 2));
      throw new Error(error);
    }

    const tillableTerrains = SOIL_CONSTANTS.fertility.tillableTerrains;
    if (!tillableTerrains.includes(tile.terrain)) {
      const error = `Cannot till ${tile.terrain} terrain at (${x},${y}). Only ${tillableTerrains.join(', ')} can be tilled.`;
      console.error(`[SoilSystem] ERROR: ${error}`);
      throw new Error(error);
    }

    // Prevent re-tilling if tile still has plantability remaining
    // Allow re-tilling if depleted (plantability === 0) to restore fertility
    if (tile.tilled && tile.plantability > 0) {
      const error = `Tile at (${x},${y}) is already tilled. Plantability: ${tile.plantability}/3 uses remaining. Wait until depleted to re-till.`;
      console.error(`[SoilSystem] ERROR: ${error}`);
      throw new Error(error);
    }
    // Change terrain to dirt
    tile.terrain = 'dirt';
    // Set fertility based on biome (biome is guaranteed to exist due to check above)
    tile.fertility = this.getInitialFertility(tile.biome!); // ! is safe due to validation

    // Make plantable
    tile.tilled = true;
    tile.plantability = SOIL_CONSTANTS.fertility.initialPlantability;
    tile.lastTilled = world.tick;
    // Initialize nutrients based on biome
    const nutrientBase = tile.fertility;
    tile.nutrients = {
      nitrogen: nutrientBase,
      phosphorus: nutrientBase * SOIL_CONSTANTS.nutrients.phosphorusMultiplier,
      potassium: nutrientBase * SOIL_CONSTANTS.nutrients.potassiumMultiplier,
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

    // Increase moisture by wateringBonus, capped at 100
    tile.moisture = Math.min(100, tile.moisture + SOIL_CONSTANTS.moisture.wateringBonus);
    tile.lastWatered = world.tick;

    // Emit watering event
    world.eventBus.emit({
      type: 'soil:watered',
      source: 'soil-system',
      data: {
        x,
        y,
        amount: SOIL_CONSTANTS.moisture.wateringBonus,
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

    // Reduce fertility by depletionPerHarvest
    tile.fertility = Math.max(0, tile.fertility - SOIL_CONSTANTS.fertility.depletionPerHarvest);

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

    // Base decay from constants
    let decay = SOIL_CONSTANTS.moisture.baseDailyDecay;

    // Modify by temperature using thresholds and multipliers from constants
    if (temperature > SOIL_CONSTANTS.moisture.hotWeatherThreshold) {
      decay *= SOIL_CONSTANTS.moisture.hotWeatherDecayMultiplier;
    } else if (temperature < SOIL_CONSTANTS.moisture.coldWeatherThreshold) {
      decay *= SOIL_CONSTANTS.moisture.coldWeatherDecayMultiplier;
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

    // Rain adds rainMoistureBonus * intensity
    tile.moisture = Math.min(100, tile.moisture + SOIL_CONSTANTS.moisture.rainMoistureBonus * intensity);

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

    // Snow adds snowMoistureBonus * intensity
    tile.moisture = Math.min(100, tile.moisture + SOIL_CONSTANTS.moisture.snowMoistureBonus * intensity);

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
    const biomeData = BIOME_FERTILITY.get(biome);
    if (!biomeData) {
      // CLAUDE.md: If we get an unknown biome, that's a bug - crash
      throw new Error(`Unknown biome type: ${biome} - cannot determine fertility`);
    }

    const { min, max } = biomeData.fertilityRange;
    return min + Math.random() * (max - min);
  }
}

/**
 * Fertilizer type definitions
 */
export interface FertilizerType {
  id: string;
  displayName: string;
  description: string;
  fertilityBoost: number;
  nitrogenBoost: number;
  phosphorusBoost: number;
  potassiumBoost: number;
  duration: number; // Days
  craftable: boolean;
  craftingRequirements?: {
    items: Array<{ id: string; quantity: number }>;
    time: number;
  };
  obtainedFrom?: string[];
}

/**
 * Biome fertility data structure
 */
interface BiomeFertilityData {
  id: BiomeType;
  displayName: string;
  description: string;
  fertilityRange: {
    min: number;
    max: number;
  };
  defaultMoisture: number;
  temperatureModifier: number;
  farmable?: boolean;
}

/**
 * Soil constants data structure
 */
interface SoilConstantsData {
  moisture: {
    baseDailyDecay: number;
    hotWeatherDecayMultiplier: number;
    coldWeatherDecayMultiplier: number;
    hotWeatherThreshold: number;
    coldWeatherThreshold: number;
    wateringBonus: number;
    rainMoistureBonus: number;
    snowMoistureBonus: number;
  };
  fertility: {
    depletionPerHarvest: number;
    initialPlantability: number;
    tillableTerrains: string[];
  };
  nutrients: {
    phosphorusMultiplier: number;
    potassiumMultiplier: number;
  };
  timeConstants: {
    secondsPerDay: number;
  };
}

/**
 * Load and validate fertilizers from JSON
 */
function loadFertilizers(): Record<string, FertilizerType> {
  if (!Array.isArray(fertilizersData)) {
    throw new Error('Invalid fertilizers data: expected array');
  }

  const fertilizers: Record<string, FertilizerType> = {};
  for (const fert of fertilizersData) {
    if (!fert.id || !fert.displayName || fert.fertilityBoost === undefined) {
      throw new Error(`Invalid fertilizer data: ${JSON.stringify(fert)}`);
    }
    fertilizers[fert.id] = fert as FertilizerType;
  }

  return fertilizers;
}

/**
 * Load and validate biome fertility data from JSON
 */
function loadBiomeFertility(): Map<BiomeType, BiomeFertilityData> {
  if (!Array.isArray(biomeFertilityData)) {
    throw new Error('Invalid biome fertility data: expected array');
  }

  const biomes = new Map<BiomeType, BiomeFertilityData>();
  for (const biome of biomeFertilityData) {
    if (!biome.id || !biome.fertilityRange) {
      throw new Error(`Invalid biome fertility data: ${JSON.stringify(biome)}`);
    }
    biomes.set(biome.id as BiomeType, biome as BiomeFertilityData);
  }

  return biomes;
}

/**
 * Load and validate soil constants from JSON
 */
function loadSoilConstants(): SoilConstantsData {
  if (!soilConstantsData || typeof soilConstantsData !== 'object') {
    throw new Error('Invalid soil constants data: expected object');
  }

  return soilConstantsData as SoilConstantsData;
}

// Load data at module initialization
export const FERTILIZERS = loadFertilizers();
const BIOME_FERTILITY = loadBiomeFertility();
const SOIL_CONSTANTS = loadSoilConstants();
