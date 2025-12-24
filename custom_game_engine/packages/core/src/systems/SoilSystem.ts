import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';

// Local type definitions to avoid circular dependencies with world package
export type BiomeType = 'plains' | 'forest' | 'desert' | 'mountains' | 'ocean' | 'river';

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
 */
export class SoilSystem implements System {
  public readonly id: SystemId = 'soil';
  public readonly priority: number = 15;
  public readonly requiredComponents: ReadonlyArray<string> = [];

  private lastDayProcessed: number = -1;
  private readonly TICKS_PER_DAY = 20 * 60 * 24; // 20 ticks/sec * 60 sec * 24 hours

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentDay = Math.floor(world.tick / this.TICKS_PER_DAY);

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
  public tillTile(world: World, tile: Tile, x: number, y: number, agentId?: string): void {
    console.log(`[SoilSystem] ===== TILLING TILE AT (${x}, ${y}) =====`);
    console.log(`[SoilSystem] Current tile state:`, {
      terrain: tile.terrain,
      tilled: tile.tilled,
      biome: tile.biome,
      fertility: tile.fertility,
      moisture: tile.moisture,
      plantability: tile.plantability,
    });

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

    console.log(`[SoilSystem] ✅ Validation passed - proceeding with tilling`);

    // Tool checking (if agent-initiated)
    // System checks agent inventory for hoe > shovel > hands
    let toolUsed = 'hands';
    let toolEfficiency = 0.5; // 50% efficiency for hands

    if (agentId) {
      console.log(`[SoilSystem] 🔍 Checking agent ${agentId} inventory for tools...`);
      const agent = world.getEntity(agentId);
      if (agent) {
        const inventory = agent.components.get('inventory') as any;
        if (inventory) {
          // Check for hoe (best tool, 100% efficiency)
          if (this.hasItemInInventory(inventory, 'hoe')) {
            toolUsed = 'hoe';
            toolEfficiency = 1.0;
            console.log(`[SoilSystem] 🔨 Agent has HOE - using it (100% efficiency, fastest)`);
          }
          // Check for shovel (second best, 80% efficiency)
          else if (this.hasItemInInventory(inventory, 'shovel')) {
            toolUsed = 'shovel';
            toolEfficiency = 0.8;
            console.log(`[SoilSystem] 🔨 Agent has SHOVEL - using it (80% efficiency, medium speed)`);
          }
          // Fallback to hands (50% efficiency)
          else {
            console.log(`[SoilSystem] 🖐️ Agent has no farming tools - using HANDS (50% efficiency, slowest)`);
          }
        } else {
          console.log(`[SoilSystem] ⚠️ Agent has no inventory component - defaulting to HANDS`);
        }
      } else {
        console.log(`[SoilSystem] ⚠️ Agent ${agentId} not found - defaulting to HANDS`);
      }
    } else {
      console.log(`[SoilSystem] ℹ️ MANUAL TILLING (keyboard shortcut T) - Using HANDS by default (50% efficiency)`);
      console.log(`[SoilSystem] 💡 TIP: To use agent tools, SELECT AN AGENT FIRST, then press T`);
      console.log(`[SoilSystem] 🔨 Available tools: HOE (100% efficiency) > SHOVEL (80%) > HANDS (50%)`);
    }

    // Calculate and log estimated duration for transparency
    const baseDuration = 10; // seconds
    const estimatedDuration = baseDuration / toolEfficiency; // 10s hoe, 12.5s shovel, 20s hands
    console.log(`[SoilSystem] Tool: ${toolUsed}, Estimated duration: ${estimatedDuration.toFixed(1)}s (efficiency: ${(toolEfficiency * 100).toFixed(0)}%)`);

    // Change terrain to dirt
    const oldTerrain = tile.terrain;
    tile.terrain = 'dirt';
    console.log(`[SoilSystem] Changed terrain: ${oldTerrain} → dirt`);

    // Set fertility based on biome (biome is guaranteed to exist due to check above)
    const oldFertility = tile.fertility;
    tile.fertility = this.getInitialFertility(tile.biome!); // ! is safe due to validation
    console.log(`[SoilSystem] Set fertility based on biome '${tile.biome}': ${oldFertility.toFixed(2)} → ${tile.fertility.toFixed(2)}`);

    // Make plantable
    tile.tilled = true;
    tile.plantability = 3;
    tile.lastTilled = world.tick;
    console.log(`[SoilSystem] Set tile as plantable: tilled=true, plantability=3/3 uses, lastTilled=${world.tick}`);

    // Initialize nutrients based on biome
    const nutrientBase = tile.fertility;
    tile.nutrients = {
      nitrogen: nutrientBase,
      phosphorus: nutrientBase * 0.8,
      potassium: nutrientBase * 0.9,
    };
    console.log(`[SoilSystem] Initialized nutrients (NPK):`, {
      nitrogen: tile.nutrients.nitrogen.toFixed(2),
      phosphorus: tile.nutrients.phosphorus.toFixed(2),
      potassium: tile.nutrients.potassium.toFixed(2),
    });

    // Emit tilling event
    const eventData = {
      type: 'soil:tilled',
      source: 'soil-system',
      data: {
        position: { x, y },
        fertility: tile.fertility,
        biome: tile.biome,
      },
    };
    console.log(`[SoilSystem] Emitting soil:tilled event:`, eventData);
    world.eventBus.emit(eventData);

    console.log(`[SoilSystem] ===== TILLING COMPLETE =====`);
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
        position: { x, y },
        oldMoisture,
        newMoisture: tile.moisture,
      },
    });

    // Emit moisture change event
    if (tile.moisture !== oldMoisture) {
      world.eventBus.emit({
        type: 'soil:moistureChanged',
        source: 'soil-system',
        data: {
          position: { x, y },
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

    const oldFertility = tile.fertility;

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

    // Set fertilized flag and duration (convert days to ticks)
    tile.fertilized = true;
    tile.fertilizerDuration = fertilizerType.duration * this.TICKS_PER_DAY;

    if (fertilizerType.id === 'compost') {
      tile.composted = true;
    }

    // Emit fertilizer event
    world.eventBus.emit({
      type: 'soil:fertilized',
      source: 'soil-system',
      data: {
        position: { x, y },
        fertilizerType: fertilizerType.id,
        oldFertility,
        newFertility: tile.fertility,
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
          position: { x, y },
          fertility: tile.fertility,
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
          position: { x, y },
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
          position: { x, y },
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
          position: { x, y },
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
   * Check if inventory contains a specific item
   * TODO: Move to InventoryComponent helper when tool system is fully implemented
   */
  private hasItemInInventory(inventory: any, itemId: string): boolean {
    if (!inventory.slots) return false;
    return inventory.slots.some((slot: any) => slot.itemId === itemId && slot.quantity > 0);
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
