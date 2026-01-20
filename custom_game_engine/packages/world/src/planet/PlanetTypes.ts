/**
 * Planet System - Type Definitions
 *
 * Planets are visitable locations within a universe. Each planet has its own
 * terrain generation parameters, biome palette, and chunk storage.
 */

import type { BiomeType } from '../chunks/Tile.js';

// ============================================================================
// Planet Types
// ============================================================================

/**
 * Planet archetypes that define terrain generation behavior.
 *
 * Each type has preset parameters for temperature, moisture, elevation,
 * and allowed biomes that create distinct planetary environments.
 *
 * Based on known exoplanet classifications and fantasy archetypes.
 */
export type PlanetType =
  // -------------------------------------------------------------------------
  // Rocky/Terrestrial Worlds (scientifically grounded)
  // -------------------------------------------------------------------------
  | 'terrestrial'     // Earth-like in habitable zone (all standard biomes)
  | 'super_earth'     // Larger rocky world (1.5-10x Earth mass), high gravity, thick atmosphere
  | 'desert'          // Mars-like arid world, thin atmosphere, iron oxide surface
  | 'ice'             // Frozen world like Europa/Enceladus, subsurface oceans possible
  | 'ocean'           // Global ocean world, no dry land, deep water
  | 'volcanic'        // Tidally-heated world like Io, extreme volcanism
  | 'carbon'          // Carbon-rich world with graphite plains, diamond mountains
  | 'iron'            // Dense metallic world like Mercury, extreme day/night temps

  // -------------------------------------------------------------------------
  // Atmospheric/Exotic Worlds (scientifically grounded)
  // -------------------------------------------------------------------------
  | 'tidally_locked'  // Eyeball planet - permanent day/night, habitable twilight ring
  | 'hycean'          // Hydrogen-rich atmosphere, warm ocean beneath, high pressure
  | 'rogue'           // Starless wanderer, heated only by internal processes, eternal night
  | 'gas_dwarf'       // Mini-Neptune with thick H2 atmosphere, possible rocky surface
  | 'moon'            // Planetary satellite, tidally-heated, thin/no atmosphere

  // -------------------------------------------------------------------------
  // Fantasy/Alien Worlds (gameplay-focused)
  // -------------------------------------------------------------------------
  | 'magical'         // Arcane realm (floating islands, mana zones, impossible physics)
  | 'corrupted'       // Dark lands (twisted terrain, dangerous, eldritch influence)
  | 'fungal'          // Alien biosphere (giant fungi, spore clouds, mycelium networks)
  | 'crystal';        // Crystalline world (silicon-based life?, refractive terrain)

// ============================================================================
// Planet Configuration
// ============================================================================

/**
 * Configuration for a planet's terrain generation and properties.
 *
 * Planet parameters modify the base noise generation to create
 * distinct planetary environments from the same underlying algorithms.
 */
export interface PlanetConfig {
  /** Schema version for serialization */
  $schema?: 'https://aivillage.dev/schemas/planet/v1';

  // -------------------------------------------------------------------------
  // Identity
  // -------------------------------------------------------------------------

  /** Unique planet identifier (e.g., "planet:homeworld") */
  id: string;

  /** Display name (e.g., "Homeworld", "Crystal Moon") */
  name: string;

  /** Planet archetype - determines preset parameters */
  type: PlanetType;

  // -------------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------------

  /**
   * Seed for terrain generation.
   * Derived from universe seed + planet id for deterministic generation.
   */
  seed: string;

  /**
   * Optional planet radius in chunks.
   * If set, coordinates wrap at this boundary (spherical planet).
   * If undefined, planet is infinite flat plane.
   */
  radius?: number;

  // -------------------------------------------------------------------------
  // Terrain Parameters (modify noise generation)
  // -------------------------------------------------------------------------

  /**
   * Temperature offset (-1 to 1).
   * Added to base temperature noise.
   * Positive = hotter planet, negative = colder planet.
   */
  temperatureOffset: number;

  /**
   * Temperature scale (0.1 to 2.0).
   * Multiplier for temperature variation.
   * Higher = more extreme temperature differences.
   */
  temperatureScale: number;

  /**
   * Moisture offset (-1 to 1).
   * Added to base moisture noise.
   * Positive = wetter planet, negative = drier planet.
   */
  moistureOffset: number;

  /**
   * Moisture scale (0.1 to 2.0).
   * Multiplier for moisture variation.
   */
  moistureScale: number;

  /**
   * Elevation offset (-1 to 1).
   * Shifts base elevation up or down.
   */
  elevationOffset: number;

  /**
   * Elevation scale (0.1 to 2.0).
   * Multiplier for elevation variation.
   * Higher = more dramatic mountains/valleys.
   */
  elevationScale: number;

  /**
   * Sea level threshold (-1 to 1).
   * Default is -0.3. Higher values = more water coverage.
   */
  seaLevel: number;

  // -------------------------------------------------------------------------
  // Biome Configuration
  // -------------------------------------------------------------------------

  /**
   * Which biomes can generate on this planet.
   * Biomes not in this list will fall back to allowed alternatives.
   */
  allowedBiomes: BiomeType[];

  /**
   * Optional bias for certain biomes (0.1 to 10.0).
   * Higher weight = more likely to generate.
   */
  biomeWeights?: Partial<Record<BiomeType, number>>;

  // -------------------------------------------------------------------------
  // Resource Spawning (Era-gated resources for space age)
  // -------------------------------------------------------------------------

  /**
   * Resources that can be found on this planet.
   * Used for era progression gating (eras 10+).
   *
   * Resource tiers:
   * - common: High probability (0.7-1.0), accessible with basic mining
   * - rare: Medium probability (0.3-0.6), requires advanced extraction
   * - exotic: Low probability (0.05-0.2), requires specialized tech
   *
   * Discovery probability = planet_spawn_chance × exploration_thoroughness × sensor_quality
   */
  resourceSpawning?: {
    /** Common resources (easily found and extracted) */
    common?: Partial<Record<string, number>>;
    /** Rare resources (harder to find and extract) */
    rare?: Partial<Record<string, number>>;
    /** Exotic resources (very rare, requires high tech) */
    exotic?: Partial<Record<string, number>>;
  };

  // -------------------------------------------------------------------------
  // Physical Properties (scientifically-grounded)
  // -------------------------------------------------------------------------

  /**
   * Surface gravity relative to Earth (0.1 to 3.0).
   * Affects movement speed, jump height, entity behavior.
   * Earth = 1.0, Mars = 0.38, Super-Earth = 1.5-2.5
   */
  gravity?: number;

  /**
   * Atmosphere density relative to Earth (0 to 10.0).
   * 0 = vacuum (moon), 1 = Earth, 90 = Venus, 0.006 = Mars
   * Affects weather, sound propagation, flight.
   */
  atmosphereDensity?: number;

  /**
   * Whether planet is tidally locked to its star.
   * Creates permanent day/night hemispheres with habitable twilight zone.
   */
  isTidallyLocked?: boolean;

  /**
   * Whether planet is a rogue (starless) world.
   * Surface is in eternal darkness, heated only by internal processes.
   */
  isStarless?: boolean;

  /**
   * Day length in Earth hours (0.1 to 10000).
   * Affects circadian rhythms, temperature cycles.
   * Earth = 24, tidally locked = Infinity
   */
  dayLengthHours?: number;

  // -------------------------------------------------------------------------
  // Special Terrain Features
  // -------------------------------------------------------------------------

  /** Enable floating island terrain (magical worlds) */
  hasFloatingIslands?: boolean;

  /** Enable lava flow terrain (volcanic/tidally-heated worlds) */
  hasLavaFlows?: boolean;

  /** Enable crystal formation terrain (crystal worlds) */
  hasCrystalFormations?: boolean;

  /** Enable diamond/graphite formations (carbon worlds) */
  hasCarbonFormations?: boolean;

  /** Enable subsurface ocean (ice worlds like Europa) */
  hasSubsurfaceOcean?: boolean;

  /** Enable giant mushroom terrain (fungal worlds) */
  hasGiantMushrooms?: boolean;

  /** Enable metallic/iron terrain features (iron worlds) */
  hasMetallicTerrain?: boolean;

  /** Corruption intensity (0-1) for corrupted worlds */
  corruptionLevel?: number;

  // -------------------------------------------------------------------------
  // Atmospheric Composition (affects visuals and gameplay)
  // -------------------------------------------------------------------------

  /**
   * Primary atmospheric gas for visual effects.
   * Affects sky color, weather, breathing requirements.
   */
  atmosphereType?: 'nitrogen_oxygen' | 'carbon_dioxide' | 'hydrogen' | 'methane' | 'sulfur' | 'none';

  /**
   * Sky color override (hex string or preset).
   * Derived from atmosphere if not specified.
   */
  skyColor?: string;

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  /** Tick when planet was first discovered (undefined if not yet discovered) */
  discoveredAt?: number;

  /** Entity ID of agent/player who discovered this planet */
  discoveredBy?: string;

  /** Number of times this planet has been visited */
  visitCount?: number;

  /** Optional description for the planet */
  description?: string;
}

// ============================================================================
// Planet Snapshot (for persistence)
// ============================================================================

/**
 * Serialized planet data for save/load.
 */
export interface PlanetSnapshot {
  $schema: 'https://aivillage.dev/schemas/planet-snapshot/v1';

  /** Planet configuration */
  config: PlanetConfig;

  /** Named locations on this planet */
  namedLocations?: Array<{
    chunkX: number;
    chunkY: number;
    name: string;
    namedBy: string;
    namedAt: number;
    description?: string;
  }>;

  /** Generated biosphere data (species, food webs, niches) */
  biosphere?: {
    $schema: 'https://aivillage.dev/schemas/biosphere/v1';
    niches: any[];
    species: any[];
    foodWeb: any;
    nicheFilling: Record<string, string[]>;
    sapientSpecies: any[];
    artStyle: string;
    metadata: {
      generatedAt: number;
      generationTimeMs: number;
      totalSpecies: number;
      sapientCount: number;
      trophicLevels: number;
      averageSpeciesPerNiche: number;
    };
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Partial planet config for presets (only override specific values).
 */
export type PlanetPreset = Partial<Omit<PlanetConfig, 'id' | 'name' | 'seed'>>;

/**
 * Planet creation options (id, name, and type are required).
 */
export interface CreatePlanetOptions {
  id: string;
  name: string;
  type: PlanetType;
  seed?: string;
  overrides?: PlanetPreset;
}
