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

// ============================================================================
// Planet Categories (for UI organization)
// ============================================================================

/**
 * Planet category for UI grouping.
 * Organizes planet types into meaningful gameplay categories.
 */
export type PlanetCategory =
  | 'early_world'   // Primordial, harsh conditions - great for survival gameplay
  | 'habitable'     // Balanced for life - classic gameplay
  | 'exotic'        // Unusual physics or composition
  | 'fantasy'       // Supernatural/magical realms
  | 'satellite';    // Moons and smaller bodies

/**
 * Metadata for each planet category.
 */
export interface PlanetCategoryInfo {
  id: PlanetCategory;
  name: string;
  description: string;
  icon: string;
  types: PlanetType[];
}

/**
 * Planet categories with their constituent types.
 * Used by UI to organize planet selection.
 */
export const PLANET_CATEGORIES: PlanetCategoryInfo[] = [
  {
    id: 'habitable',
    name: 'Habitable Worlds',
    description: 'Balanced conditions suitable for diverse life',
    icon: '🌍',
    types: ['terrestrial', 'super_earth', 'ocean', 'hycean'],
  },
  {
    id: 'early_world',
    name: 'Early Worlds',
    description: 'Primordial conditions - harsh but resource-rich',
    icon: '🌋',
    types: ['volcanic', 'desert', 'ice', 'rogue'],
  },
  {
    id: 'exotic',
    name: 'Exotic Worlds',
    description: 'Unusual physics or composition',
    icon: '💫',
    types: ['tidally_locked', 'carbon', 'iron', 'gas_dwarf'],
  },
  {
    id: 'fantasy',
    name: 'Fantasy Realms',
    description: 'Supernatural worlds with impossible physics',
    icon: '✨',
    types: ['magical', 'crystal', 'fungal', 'corrupted'],
  },
  {
    id: 'satellite',
    name: 'Moons & Satellites',
    description: 'Smaller bodies orbiting larger worlds',
    icon: '🌙',
    types: ['moon'],
  },
];

/**
 * Get the category for a given planet type.
 */
export function getPlanetCategory(type: PlanetType): PlanetCategory {
  for (const category of PLANET_CATEGORIES) {
    if (category.types.includes(type)) {
      return category.id;
    }
  }
  return 'habitable'; // Default fallback
}

/**
 * Get category info by ID.
 */
export function getCategoryInfo(category: PlanetCategory): PlanetCategoryInfo | undefined {
  return PLANET_CATEGORIES.find(c => c.id === category);
}

/**
 * Detailed information about each planet type for UI display.
 */
export const PLANET_TYPE_INFO: Record<PlanetType, { name: string; description: string; icon: string; difficulty: 'easy' | 'medium' | 'hard' | 'extreme' }> = {
  // Habitable
  terrestrial: { name: 'Terrestrial', description: 'Earth-like world with diverse biomes', icon: '🌍', difficulty: 'easy' },
  super_earth: { name: 'Super Earth', description: 'Massive rocky world with high gravity', icon: '🏔️', difficulty: 'medium' },
  ocean: { name: 'Ocean World', description: 'Global water world with no dry land', icon: '🌊', difficulty: 'medium' },
  hycean: { name: 'Hycean', description: 'Hydrogen-rich warm ocean world', icon: '💧', difficulty: 'medium' },

  // Early Worlds
  volcanic: { name: 'Volcanic', description: 'Extreme volcanism and lava flows', icon: '🌋', difficulty: 'hard' },
  desert: { name: 'Desert World', description: 'Arid Mars-like planet', icon: '🏜️', difficulty: 'hard' },
  ice: { name: 'Ice World', description: 'Frozen planet with subsurface oceans', icon: '❄️', difficulty: 'hard' },
  rogue: { name: 'Rogue Planet', description: 'Starless wanderer in eternal darkness', icon: '🌑', difficulty: 'extreme' },

  // Exotic
  tidally_locked: { name: 'Tidally Locked', description: 'Permanent day/night eyeball planet', icon: '🌗', difficulty: 'hard' },
  carbon: { name: 'Carbon World', description: 'Graphite plains and diamond mountains', icon: '💎', difficulty: 'hard' },
  iron: { name: 'Iron World', description: 'Dense metallic world with extreme temperatures', icon: '⚙️', difficulty: 'extreme' },
  gas_dwarf: { name: 'Gas Dwarf', description: 'Mini-Neptune with thick atmosphere', icon: '🔵', difficulty: 'extreme' },

  // Fantasy
  magical: { name: 'Magical Realm', description: 'Floating islands and arcane zones', icon: '✨', difficulty: 'easy' },
  crystal: { name: 'Crystal World', description: 'Crystalline terrain and refractive beauty', icon: '💎', difficulty: 'medium' },
  fungal: { name: 'Fungal World', description: 'Giant fungi and mycelium networks', icon: '🍄', difficulty: 'medium' },
  corrupted: { name: 'Corrupted', description: 'Twisted terrain with eldritch influence', icon: '👁️', difficulty: 'extreme' },

  // Satellite
  moon: { name: 'Planetary Moon', description: 'Satellite with low gravity', icon: '🌙', difficulty: 'medium' },
};

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
