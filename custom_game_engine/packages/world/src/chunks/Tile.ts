// ============================================================================
// Graph-Based Tile Neighbors (Phase 8)
// Direct neighbor pointers for O(1) traversal (5-100x faster than getTileAt)
// ============================================================================

import type { TileNeighbors } from './TileNeighbors.js';
import { createEmptyNeighbors } from './TileNeighbors.js';

// ============================================================================
// Forward-Compatibility: Fluid System
// Placeholder for future fluid simulation (water, magma, etc.)
// ============================================================================

/** Types of fluids that can exist on a tile */
export type FluidType = 'water' | 'magma' | 'blood' | 'oil' | 'acid';

// ============================================================================
// Tile-Based Building System
// RimWorld/Dwarf Fortress-style construction with walls, doors, and windows
// as tile properties rather than separate entities.
// ============================================================================

/** Wall materials with different properties */
export type WallMaterial = 'wood' | 'stone' | 'mud_brick' | 'ice' | 'metal' | 'glass' | 'thatch';

/** Door materials */
export type DoorMaterial = 'wood' | 'stone' | 'metal' | 'cloth';

/** Window materials */
export type WindowMaterial = 'glass' | 'hide' | 'cloth';

/** Roof materials */
export type RoofMaterial = 'thatch' | 'wood' | 'tile' | 'slate' | 'metal';

/**
 * Wall tile on a world tile.
 * Walls block movement and provide insulation.
 */
export interface WallTile {
  /** Material type (affects insulation, durability, appearance) */
  material: WallMaterial;

  /** Current structural health (0-100) */
  condition: number;

  /** Insulation value (0-100, derived from material) */
  insulation: number;

  /** Construction progress (0-100, undefined if complete) */
  constructionProgress?: number;

  /** Builder entity ID (set during construction) */
  builderId?: string;

  /** When this wall was constructed (game tick) */
  constructedAt?: number;
}

/**
 * Door tile on a world tile.
 * Doors can be opened/closed and provide passage through walls.
 */
export interface DoorTile {
  /** Material type */
  material: DoorMaterial;

  /** Current state */
  state: 'open' | 'closed' | 'locked';

  /** Game tick when door was last opened (for auto-close) */
  lastOpened?: number;

  /** Construction progress (0-100, undefined if complete) */
  constructionProgress?: number;

  /** Builder entity ID */
  builderId?: string;

  /** When constructed */
  constructedAt?: number;
}

/**
 * Window tile on a world tile.
 * Windows are placed in walls, block movement but allow light.
 */
export interface WindowTile {
  /** Material type */
  material: WindowMaterial;

  /** Current health (0-100) */
  condition: number;

  /** Whether light passes through */
  lightsThrough: boolean;

  /** Construction progress */
  constructionProgress?: number;

  /** Builder entity ID */
  builderId?: string;

  /** When constructed */
  constructedAt?: number;
}

/**
 * Roof tile on a world tile.
 * Roofs provide shelter and weather protection.
 */
export interface RoofTile {
  /** Material type */
  material: RoofMaterial;

  /** Current health (0-100) */
  condition: number;

  /** Construction progress */
  constructionProgress?: number;

  /** Builder entity ID */
  builderId?: string;

  /** When constructed */
  constructedAt?: number;
}

/**
 * Create a roof tile.
 */
export function createRoofTile(material: RoofMaterial, tick?: number): RoofTile {
  return {
    material,
    condition: 100,
    constructedAt: tick,
  };
}

/**
 * Material property lookup table.
 * Maps wall materials to their physical properties.
 */
export const WALL_MATERIAL_PROPERTIES: Record<WallMaterial, {
  insulation: number;
  durability: number;
  difficulty: number;
  cost: number;
}> = {
  wood: { insulation: 50, durability: 40, difficulty: 20, cost: 2 },
  stone: { insulation: 80, durability: 90, difficulty: 50, cost: 3 },
  mud_brick: { insulation: 60, durability: 30, difficulty: 30, cost: 2 },
  ice: { insulation: 30, durability: 20, difficulty: 40, cost: 4 },
  metal: { insulation: 20, durability: 100, difficulty: 70, cost: 5 },
  glass: { insulation: 10, durability: 10, difficulty: 60, cost: 4 },
  thatch: { insulation: 40, durability: 15, difficulty: 10, cost: 1 },
};

/**
 * Create a wall tile with default properties based on material.
 */
export function createWallTile(material: WallMaterial, tick?: number): WallTile {
  const props = WALL_MATERIAL_PROPERTIES[material];
  return {
    material,
    condition: 100,
    insulation: props.insulation,
    constructedAt: tick,
  };
}

/**
 * Create a door tile.
 */
export function createDoorTile(material: DoorMaterial, tick?: number): DoorTile {
  return {
    material,
    state: 'closed',
    constructedAt: tick,
  };
}

/**
 * Create a window tile.
 */
export function createWindowTile(material: WindowMaterial, tick?: number): WindowTile {
  return {
    material,
    condition: 100,
    lightsThrough: true,
    constructedAt: tick,
  };
}

/**
 * Fluid layer on a tile.
 * Future: Used by fluid simulation system.
 */
export interface FluidLayer {
  /** Type of fluid */
  type: FluidType;
  /** Depth of fluid (0-7, matching Dwarf Fortress scale) */
  depth: number;
  /** Pressure level (0-7, affects flow) */
  pressure: number;
  /** Temperature of the fluid (affects freezing/boiling) */
  temperature: number;
  /** Flow direction vector */
  flowDirection?: { x: number; y: number };
  /** Flow velocity (tiles per tick) */
  flowVelocity?: number;
  /** Whether fluid is stagnant (not flowing) */
  stagnant: boolean;
  /** Game tick of last update */
  lastUpdate: number;
}

/**
 * Represents a single tile in the world.
 */
export interface Tile {
  /** Terrain type (grass, dirt, water, stone, sand) */
  terrain: TerrainType;

  /** Floor/path type (optional) */
  floor?: string;

  /** Elevation/height of this tile (Z-axis). 0 = sea level, positive = above, negative = below */
  elevation: number;

  // ============================================================================
  // Graph-Based Neighbors (Phase 8)
  // ============================================================================

  /**
   * Direct neighbor pointers for O(1) tile traversal.
   *
   * PERFORMANCE: Use tile.neighbors.east instead of world.getTileAt(x+1, y)
   * - getTileAt(): ~50 CPU cycles (coordinate math + hash lookup + generation risk)
   * - neighbors.east: ~5 CPU cycles (pointer dereference)
   * - **Speedup: 10x per neighbor access**
   *
   * Built by ChunkManager when chunk loads.
   * null = neighbor doesn't exist (unloaded chunk or world edge).
   *
   * Usage:
   * ```typescript
   * import { getAllNeighbors } from '@ai-village/world';
   * for (const neighbor of getAllNeighbors(tile)) {
   *   // Process neighbor (no null checks needed!)
   * }
   * ```
   */
  neighbors: TileNeighbors;

  /** Moisture level (0-100) - affects plant growth */
  moisture: number;

  /** Fertility level (0-100) - affects farming */
  fertility: number;

  /** Biome this tile belongs to */
  biome?: BiomeType;

  // ============================================================================
  // Tile-Based Building System (Voxel Buildings)
  // ============================================================================

  /**
   * Wall on this tile.
   * Walls block movement and provide insulation.
   */
  wall?: WallTile;

  /**
   * Door on this tile.
   * Doors can be opened/closed and provide passage through walls.
   */
  door?: DoorTile;

  /**
   * Window on this tile.
   * Windows are placed in walls, block movement but allow light.
   */
  window?: WindowTile;

  /**
   * Roof on this tile.
   * Roofs provide shelter from weather and complete building enclosures.
   */
  roof?: RoofTile;

  // Soil management properties (Phase 9)
  /** Whether the tile has been tilled and can be planted */
  tilled: boolean;

  /** Number of plantings remaining before re-tilling needed (0-3) */
  plantability: number;

  /** Soil nutrients (NPK values 0-100) */
  nutrients: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };

  /** Whether fertilizer is currently active */
  fertilized: boolean;

  /** Ticks remaining for fertilizer effect */
  fertilizerDuration: number;

  /** Game tick when tile was last watered */
  lastWatered: number;

  /** Game tick when tile was last tilled (0 if never tilled) */
  lastTilled: number;

  /** Whether compost has been applied */
  composted: boolean;

  /** Entity ID of plant growing on this tile (if any) */
  plantId: string | null;

  // ============================================================================
  // Forward-Compatibility: Fluid & Mining Systems (optional)
  // ============================================================================

  /**
   * Fluid layer on this tile.
   * Future: Used by fluid simulation system.
   * When undefined, tile has no fluid.
   */
  fluid?: FluidLayer;

  /**
   * Ocean depth zone for water tiles.
   * Determines depth-based properties: light, pressure, temperature, life.
   * Only set for ocean/water tiles. See packages/world/src/ocean/OceanBiomes.ts
   */
  oceanZone?: 'epipelagic' | 'mesopelagic' | 'bathypelagic' | 'abyssal' | 'hadal';

  /**
   * Whether this tile can be mined/dug.
   * Future: Used by mining system.
   */
  mineable?: boolean;

  /**
   * What resource is embedded in this tile (ore, gems, etc.)
   * Future: Used by mining system.
   */
  embeddedResource?: string;

  /**
   * How much of the embedded resource remains (0-100).
   * Future: Used by mining system.
   */
  resourceAmount?: number;

  /**
   * Whether the ceiling above this tile is supported.
   * Future: Used for cave-in mechanics.
   */
  ceilingSupported?: boolean;
}

export type TerrainType =
  // -------------------------------------------------------------------------
  // Standard Terrains (terrestrial planets)
  // -------------------------------------------------------------------------
  | 'grass'
  | 'dirt'
  | 'water'
  | 'stone'
  | 'sand'
  | 'forest'
  | 'snow'         // Frozen terrain for tundra and high mountain peaks
  | 'ice'          // Deep ice for ice worlds (distinct from snow - solid glacier)

  // -------------------------------------------------------------------------
  // Volcanic Terrains
  // -------------------------------------------------------------------------
  | 'lava'         // Active lava flow (impassable, damages entities)
  | 'ash'          // Volcanic ash coverage (reduced fertility, movement)
  | 'obsidian'     // Cooled volcanic glass (hard, low fertility)
  | 'basalt'       // Volcanic rock (like stone but volcanic origin)

  // -------------------------------------------------------------------------
  // Crystal Terrains
  // -------------------------------------------------------------------------
  | 'crystal'      // Crystal formations (refractive, may have special properties)
  | 'geode'        // Dense crystal clusters (valuable resource)
  | 'prismatic'    // Light-refracting crystal field

  // -------------------------------------------------------------------------
  // Fungal Terrains
  // -------------------------------------------------------------------------
  | 'mycelium'     // Fungal ground cover (nutrient-rich, spreads)
  | 'spore_soil'   // Spore-saturated ground (affects breathing entities)

  // -------------------------------------------------------------------------
  // Corrupted/Dark Terrains
  // -------------------------------------------------------------------------
  | 'corrupted'    // Blighted earth (damages plants, spawns dangerous entities)
  | 'void_stone'   // Near-nothingness terrain (extremely dangerous)
  | 'shadow_grass' // Twisted dark vegetation

  // -------------------------------------------------------------------------
  // Magical Terrains
  // -------------------------------------------------------------------------
  | 'mana_stone'   // Arcane-infused rock (regenerates mana)
  | 'ley_grass'    // Magically-charged grassland
  | 'aether'       // Floating island terrain (defies gravity)

  // -------------------------------------------------------------------------
  // Exotic Planet Terrains
  // -------------------------------------------------------------------------
  | 'carbon'       // Graphite/diamond terrain for carbon worlds
  | 'iron'         // Metallic iron terrain for iron worlds
  | 'hydrogen_ice' // Exotic ice from gas dwarfs (not water ice)
  | 'sulfur';      // Sulfurous terrain (volcanic moons like Io)

export type BiomeType =
  // -------------------------------------------------------------------------
  // Standard Biomes (terrestrial planets)
  // -------------------------------------------------------------------------
  | 'plains'
  | 'forest'
  | 'desert'
  | 'mountains'
  | 'ocean'
  | 'river'
  | 'scrubland'    // Desert ↔ Plains transition (moisture: -0.4 to -0.1)
  | 'wetland'      // Land ↔ Water transition (elevation: -0.3 to 0.05, high moisture)
  | 'foothills'    // Mountains ↔ Plains transition (elevation: 0.35 to 0.5)
  | 'savanna'      // Hot grassland with sparse trees (hot + moderate moisture)
  | 'woodland'     // Forest ↔ Plains transition (moisture: 0.05 to 0.35)
  | 'tundra'       // Frozen arctic terrain (temperature < -0.4, low vegetation)
  | 'taiga'        // Cold coniferous forest (temperature -0.4 to -0.1, moderate moisture)
  | 'jungle'       // Tropical rainforest (temperature > 0.3, moisture > 0.5)

  // -------------------------------------------------------------------------
  // Ice World Biomes
  // -------------------------------------------------------------------------
  | 'glacier'      // Massive ice sheets (ice worlds)
  | 'frozen_ocean' // Ice-covered ocean (ice worlds, subsurface liquid)
  | 'ice_caves'    // Underground ice formations
  | 'permafrost'   // Permanently frozen ground

  // -------------------------------------------------------------------------
  // Volcanic Biomes
  // -------------------------------------------------------------------------
  | 'lava_field'     // Active lava flows (impassable)
  | 'ash_plain'      // Volcanic ash coverage
  | 'obsidian_waste' // Cooled lava formations
  | 'caldera'        // Volcanic crater (may contain lakes)
  | 'sulfur_flats'   // Sulfurous volcanic plains (Io-like)

  // -------------------------------------------------------------------------
  // Crystal Biomes
  // -------------------------------------------------------------------------
  | 'crystal_plains'   // Sparse crystal formations
  | 'geode_caves'      // Dense crystal clusters
  | 'prismatic_forest' // Light-refracting crystals (forest-like)
  | 'quartz_desert'    // Crystal-studded desert terrain

  // -------------------------------------------------------------------------
  // Fungal Biomes
  // -------------------------------------------------------------------------
  | 'mushroom_forest'  // Giant fungi as trees
  | 'spore_field'      // Low vegetation, spore clouds
  | 'mycelium_network' // Underground fungal connections
  | 'bioluminescent_marsh' // Glowing fungal wetlands

  // -------------------------------------------------------------------------
  // Corrupted/Dark Biomes
  // -------------------------------------------------------------------------
  | 'blighted_land'    // Twisted vegetation, dark soil
  | 'shadow_forest'    // Perpetual twilight, dangerous
  | 'corruption_heart' // Source of corruption (extremely dangerous)
  | 'void_edge'        // Near-nothingness, reality breakdown

  // -------------------------------------------------------------------------
  // Magical Biomes
  // -------------------------------------------------------------------------
  | 'arcane_forest'  // Glowing trees, mana pools
  | 'floating_isle'  // Disconnected terrain (special elevation)
  | 'mana_spring'    // Concentrated magical energy
  | 'ley_nexus'      // Intersection of magical lines

  // -------------------------------------------------------------------------
  // Exotic Planet Biomes (scientifically grounded)
  // -------------------------------------------------------------------------
  | 'twilight_zone'    // Habitable ring on tidally locked planets
  | 'eternal_day'      // Permanent day side of tidally locked planets
  | 'eternal_night'    // Permanent night side of tidally locked planets
  | 'carbon_forest'    // Graphite/diamond formations (carbon worlds)
  | 'iron_plains'      // Metallic terrain (iron worlds)
  | 'hydrogen_sea'     // Liquid hydrogen ocean (gas dwarfs, extremely cold)
  | 'ammonia_ocean'    // Ammonia-based ocean (cold exoplanets)
  | 'subsurface_ocean' // Ocean beneath ice shell (Europa-like)
  | 'crater_field'     // Impact craters (airless moons)
  | 'regolith_waste'   // Dust-covered barren terrain (moons)
  | 'hycean_depths';   // High-pressure warm ocean (hycean worlds)

/**
 * Create a default tile.
 * NOTE: This creates a temporary tile structure. Biome MUST be set by terrain generation.
 * Per CLAUDE.md: Tiles without biomes should not be used for farming operations.
 *
 * PERFORMANCE: All properties (including optional ones) are initialized to ensure
 * consistent object shape for V8 hidden class optimization. This prevents
 * megamorphic property access when tiles are modified later.
 */
export function createDefaultTile(): Tile {
  return {
    terrain: 'grass',
    floor: undefined,         // V8: Initialize optional to maintain shape
    elevation: 0,
    neighbors: createEmptyNeighbors(),
    moisture: 50,
    fertility: 50,
    biome: undefined,         // MUST be set by TerrainGenerator

    // Tile-based building system (V8: pre-initialize for shape consistency)
    wall: undefined,
    door: undefined,
    window: undefined,
    roof: undefined,

    // Soil management
    tilled: false,
    plantability: 0,
    nutrients: {
      nitrogen: 50,
      phosphorus: 50,
      potassium: 50,
    },
    fertilized: false,
    fertilizerDuration: 0,
    lastWatered: 0,
    lastTilled: 0,
    composted: false,
    plantId: null,

    // Fluid & mining systems (V8: pre-initialize for shape consistency)
    fluid: undefined,
    oceanZone: undefined,
    mineable: undefined,
    embeddedResource: undefined,
    resourceAmount: undefined,
    ceilingSupported: undefined,
  };
}

/**
 * Terrain rendering colors.
 */
export const TERRAIN_COLORS: Record<TerrainType, string> = {
  // Standard terrains
  grass: '#4a7c59',
  dirt: '#8b7355',
  water: '#4a7c9e',
  stone: '#6b6b6b',
  sand: '#dcc896',
  forest: '#2d5016',
  snow: '#e8e8f0',
  ice: '#c8e8f8',

  // Volcanic terrains
  lava: '#ff4500',
  ash: '#4a4a4a',
  obsidian: '#1a1a2e',
  basalt: '#3d3d3d',

  // Crystal terrains
  crystal: '#88d8f0',
  geode: '#9b59b6',
  prismatic: '#e0b0ff',

  // Fungal terrains
  mycelium: '#7d5a50',
  spore_soil: '#6b5b4f',

  // Corrupted terrains
  corrupted: '#2d1f3d',
  void_stone: '#0a0a0f',
  shadow_grass: '#1a2f1a',

  // Magical terrains
  mana_stone: '#4a90d9',
  ley_grass: '#59c97a',
  aether: '#d4a5ff',

  // Exotic planet terrains
  carbon: '#2f2f2f',
  iron: '#8b8b8b',
  hydrogen_ice: '#e0f0ff',
  sulfur: '#d4b82a',
};
