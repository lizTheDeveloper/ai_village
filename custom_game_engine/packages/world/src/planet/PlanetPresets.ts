/**
 * Planet Presets - Default configurations for each planet type
 *
 * These presets define the terrain generation parameters and allowed biomes
 * for each planet archetype. Scientific presets are based on known exoplanet
 * classifications and astrophysical models.
 *
 * References:
 * - NASA Exoplanet Archive classifications
 * - Seager & Deming (2010) - Exoplanet Atmospheres
 * - Kaltenegger (2017) - How to Characterize Habitable Worlds
 */

import type { BiomeType } from '../chunks/Tile.js';
import type { PlanetType, PlanetPreset } from './PlanetTypes.js';

// ============================================================================
// Biome Sets for Different Planet Categories
// ============================================================================

/** Full biome palette for Earth-like worlds */
const STANDARD_BIOMES: BiomeType[] = [
  'plains',
  'forest',
  'desert',
  'mountains',
  'ocean',
  'river',
  'scrubland',
  'wetland',
  'foothills',
  'savanna',
  'woodland',
  'tundra',
  'taiga',
  'jungle',
];

/** Cold/frozen biomes */
const COLD_BIOMES: BiomeType[] = ['tundra', 'taiga', 'mountains', 'ocean', 'plains'];

/** Hot/arid biomes */
const ARID_BIOMES: BiomeType[] = ['desert', 'scrubland', 'mountains', 'savanna', 'plains'];

/** Aquatic biomes */
const AQUATIC_BIOMES: BiomeType[] = ['ocean', 'river', 'wetland', 'jungle', 'plains', 'forest'];

/** Barren/minimal biomes */
const BARREN_BIOMES: BiomeType[] = ['tundra', 'desert', 'mountains'];

// ============================================================================
// Exotic Biome Sets (Phase 3)
// ============================================================================

/** Ice world biomes */
const ICE_BIOMES: BiomeType[] = [
  'glacier',
  'frozen_ocean',
  'permafrost',
  'ice_caves',
  'tundra',
  'mountains',
];

/** Volcanic world biomes */
const VOLCANIC_BIOMES: BiomeType[] = [
  'lava_field',
  'ash_plain',
  'obsidian_waste',
  'caldera',
  'sulfur_flats',
  'mountains',
];

/** Crystal world biomes */
const CRYSTAL_BIOMES: BiomeType[] = [
  'crystal_plains',
  'geode_caves',
  'prismatic_forest',
  'quartz_desert',
  'mountains',
];

/** Fungal world biomes */
const FUNGAL_BIOMES: BiomeType[] = [
  'mushroom_forest',
  'spore_field',
  'mycelium_network',
  'bioluminescent_marsh',
  'wetland',
  'plains',
];

/** Corrupted world biomes */
const CORRUPTED_BIOMES: BiomeType[] = [
  'blighted_land',
  'shadow_forest',
  'corruption_heart',
  'void_edge',
  'mountains',
  'wetland',
];

/** Magical world biomes - includes standard + magical */
const MAGICAL_BIOMES: BiomeType[] = [
  ...STANDARD_BIOMES,
  'arcane_forest',
  'floating_isle',
  'mana_spring',
  'ley_nexus',
];

/** Tidally locked world biomes */
const TIDALLY_LOCKED_BIOMES: BiomeType[] = [
  'twilight_zone',
  'eternal_day',
  'eternal_night',
  // Plus standard biomes in the twilight zone
  'plains',
  'forest',
  'desert',
  'mountains',
  'ocean',
  'wetland',
];

/** Carbon world biomes */
const CARBON_BIOMES: BiomeType[] = [
  'carbon_forest',
  'mountains',
  'plains',
  'desert',
];

/** Iron world biomes */
const IRON_BIOMES: BiomeType[] = [
  'iron_plains',
  'crater_field',
  'regolith_waste',
  'mountains',
];

/** Moon/satellite biomes */
const MOON_BIOMES: BiomeType[] = [
  'crater_field',
  'regolith_waste',
  'mountains',
  'plains',
];

/** Hycean world biomes */
const HYCEAN_BIOMES: BiomeType[] = [
  'hycean_depths',
  'ocean',
  'wetland',
];

/** Gas dwarf biomes (cloud layers) */
const GAS_DWARF_BIOMES: BiomeType[] = [
  'ocean',        // Liquid hydrogen/helium
  'wetland',      // Cloud banks
  'plains',       // Upper atmosphere
];

/** Rogue world biomes */
const ROGUE_BIOMES: BiomeType[] = [
  'eternal_night',
  'glacier',
  'frozen_ocean',
  'tundra',
  'mountains',
];

// ============================================================================
// Planet Presets
// ============================================================================

/**
 * Default configuration presets for each planet type.
 *
 * Scientific values are based on:
 * - Temperature: Stellar flux and greenhouse effects
 * - Gravity: Planet mass/radius relationships
 * - Atmosphere: Composition based on formation conditions
 * - Moisture: Water delivery and retention
 */
/**
 * Terrain generation presets for each planet type.
 * These define the biome palette, temperature/moisture offsets, and physical properties.
 *
 * Note: This is distinct from HorizonCalculator's PLANET_PRESETS which defines
 * physical parameters for rendering (gravity, radius, atmosphere curvature).
 */
export const PLANET_TERRAIN_PRESETS: Record<PlanetType, PlanetPreset> = {
  // ===========================================================================
  // ROCKY/TERRESTRIAL WORLDS
  // ===========================================================================

  /**
   * Terrestrial - Earth-like planet in habitable zone
   *
   * Scientific basis: Earth-analog in the circumstellar habitable zone.
   * Has liquid water, moderate temperatures, and diverse biomes.
   */
  terrestrial: {
    temperatureOffset: 0,
    temperatureScale: 1.0,
    moistureOffset: 0,
    moistureScale: 1.0,
    elevationOffset: 0,
    elevationScale: 1.0,
    seaLevel: -0.3,
    allowedBiomes: STANDARD_BIOMES,
    gravity: 1.0,
    atmosphereDensity: 1.0,
    atmosphereType: 'nitrogen_oxygen',
    dayLengthHours: 24,
    description: 'An Earth-like world in the habitable zone with diverse biomes, liquid water oceans, and a breathable atmosphere.',
  },

  /**
   * Super-Earth - Larger rocky planet (1.5-10x Earth mass)
   *
   * Scientific basis: Common exoplanet class. Higher gravity, thicker atmosphere,
   * potentially more volcanic activity due to greater internal heat.
   * Examples: Kepler-442b, LHS 1140 b
   */
  super_earth: {
    temperatureOffset: 0.1,          // Slightly warmer (greenhouse effect)
    temperatureScale: 0.8,           // More uniform (thick atmosphere)
    moistureOffset: 0.2,             // Wetter (outgassing)
    moistureScale: 0.9,
    elevationOffset: -0.1,           // Lower relief (higher gravity erodes)
    elevationScale: 0.7,             // Flatter terrain
    seaLevel: -0.2,                  // More water coverage
    allowedBiomes: STANDARD_BIOMES,
    gravity: 1.8,                    // 80% higher gravity
    atmosphereDensity: 2.5,          // Much thicker atmosphere
    atmosphereType: 'nitrogen_oxygen',
    dayLengthHours: 36,              // Likely slower rotation
    description: 'A massive rocky world with crushing gravity and a dense atmosphere. Mountains are lower but broader, and the thick air creates perpetual haze.',
  },

  /**
   * Desert - Mars-like arid world
   *
   * Scientific basis: Cold desert planet with thin CO2 atmosphere.
   * Lost most water early, iron oxide surface gives red color.
   * Examples: Mars, possibly Proxima b
   */
  desert: {
    temperatureOffset: 0.2,          // Hot days (thin atmosphere, less heat distribution)
    temperatureScale: 1.4,           // Extreme day/night variation
    moistureOffset: -0.5,            // Very dry
    moistureScale: 0.2,              // Almost no moisture variation
    elevationOffset: 0.15,           // Higher terrain (less erosion)
    elevationScale: 1.2,             // More dramatic relief
    seaLevel: -0.8,                  // Almost no surface water
    allowedBiomes: ARID_BIOMES,
    gravity: 0.6,                    // Lower gravity (smaller planet)
    atmosphereDensity: 0.01,         // Near-vacuum
    atmosphereType: 'carbon_dioxide',
    dayLengthHours: 25,
    skyColor: '#d4a574',             // Dusty orange-pink sky
    description: 'A rust-red desert world with a whisper-thin atmosphere. Ancient riverbeds hint at a wetter past, while dust storms rage across the barren surface.',
  },

  /**
   * Ice - Frozen world like Europa/Enceladus
   *
   * Scientific basis: Icy moon or planet beyond the snow line.
   * Surface ice shell may hide subsurface liquid ocean.
   * Examples: Europa, Enceladus, possibly some exoplanets
   */
  ice: {
    temperatureOffset: -0.6,         // Very cold
    temperatureScale: 0.4,           // Little variation (uniformly frozen)
    moistureOffset: 0.3,             // High water content (as ice)
    moistureScale: 0.5,
    elevationOffset: 0,
    elevationScale: 0.8,             // Smooth ice plains
    seaLevel: -0.2,                  // Frozen ocean
    allowedBiomes: ICE_BIOMES,
    gravity: 0.3,                    // Moon-like gravity
    atmosphereDensity: 0.0,          // No atmosphere
    atmosphereType: 'none',
    hasSubsurfaceOcean: true,
    dayLengthHours: 84,              // Tidally locked to gas giant
    skyColor: '#000020',             // Nearly black sky
    description: 'A frozen moon encased in kilometers of ice. Cryovolcanoes erupt plumes of water vapor, and beneath the ice shell, a dark ocean may harbor life.',
  },

  /**
   * Ocean - Global ocean world
   *
   * Scientific basis: Planet with no exposed land, deep global ocean.
   * Water delivered during formation or from comets.
   * Examples: Theoretical "waterworlds", possibly Kepler-22b
   */
  ocean: {
    temperatureOffset: 0,
    temperatureScale: 0.5,           // Very stable (water moderates)
    moistureOffset: 0.8,             // Extremely wet
    moistureScale: 0.3,              // Uniformly moist
    elevationOffset: -0.4,           // Low terrain
    elevationScale: 0.3,             // Very flat (all underwater)
    seaLevel: 0.6,                   // Almost all water
    allowedBiomes: AQUATIC_BIOMES,
    gravity: 1.2,
    atmosphereDensity: 1.5,          // Humid, thick atmosphere
    atmosphereType: 'nitrogen_oxygen',
    dayLengthHours: 20,
    skyColor: '#87ceeb',             // Bright blue, lots of water vapor
    description: 'An endless ocean world with no dry land. Storms circle the globe eternally, and life exists only in the depths or on floating platforms.',
  },

  /**
   * Volcanic - Tidally-heated world like Io
   *
   * Scientific basis: Intense tidal heating from nearby gas giant
   * causes extreme volcanism. Sulfur compounds dominate surface.
   * Examples: Io, early Earth
   */
  volcanic: {
    temperatureOffset: 0.6,          // Very hot
    temperatureScale: 0.6,           // Less variation (constant heat source)
    moistureOffset: -0.6,            // Very dry (water boiled off)
    moistureScale: 0.1,
    elevationOffset: 0.3,            // High terrain (volcanic buildup)
    elevationScale: 1.5,             // Extreme relief
    seaLevel: -0.9,                  // No water
    allowedBiomes: VOLCANIC_BIOMES,
    gravity: 0.4,                    // Moon-sized
    atmosphereDensity: 0.001,        // Trace sulfur atmosphere
    atmosphereType: 'sulfur',
    hasLavaFlows: true,
    dayLengthHours: 42,              // Tidally influenced
    skyColor: '#ffcc00',             // Yellow-orange from sulfur
    description: 'A hellish moon torn apart by tidal forces. Lava lakes dot the sulfur-yellow surface, and volcanic plumes reach into the thin atmosphere.',
  },

  /**
   * Carbon - Carbon-rich world
   *
   * Scientific basis: Formed from carbon-rich protoplanetary disk.
   * Surface features graphite plains, tar pits, and diamond mountains.
   * Theoretical but thermodynamically possible.
   */
  carbon: {
    temperatureOffset: 0.3,          // Warm (dark surface absorbs heat)
    temperatureScale: 1.0,
    moistureOffset: -0.4,            // Dry (hydrocarbons instead of water)
    moistureScale: 0.4,
    elevationOffset: 0.1,
    elevationScale: 1.4,             // Dramatic crystalline formations
    seaLevel: -0.5,                  // Tar seas instead of water
    allowedBiomes: CARBON_BIOMES,
    gravity: 1.1,
    atmosphereDensity: 0.8,
    atmosphereType: 'methane',
    hasCarbonFormations: true,
    dayLengthHours: 30,
    skyColor: '#332211',             // Dark, sooty sky
    description: 'A world of graphite deserts and diamond peaks. Tar seas flow sluggishly between black mountains, and the sky is perpetually dark with hydrocarbon haze.',
  },

  /**
   * Iron - Dense metallic world like Mercury
   *
   * Scientific basis: Planet that lost its mantle to collision or
   * formed close to star where only metals condensed.
   * Examples: Mercury (partially), theoretical "cannonball" planets
   */
  iron: {
    temperatureOffset: 0.4,          // Hot (close to star)
    temperatureScale: 2.0,           // EXTREME day/night variation
    moistureOffset: -0.7,            // Bone dry
    moistureScale: 0.05,             // No moisture at all
    elevationOffset: 0,
    elevationScale: 0.5,             // Smooth, cratered
    seaLevel: -1.0,                  // No water
    allowedBiomes: IRON_BIOMES,
    gravity: 1.5,                    // Dense core
    atmosphereDensity: 0.0,          // No atmosphere
    atmosphereType: 'none',
    hasMetallicTerrain: true,
    isTidallyLocked: true,           // Likely tidally locked
    dayLengthHours: Infinity,        // Tidally locked
    skyColor: '#000000',             // Black sky
    description: 'A dense metallic world baked by its nearby star. The day side is molten metal, the night side frozen solid, with a narrow habitable band between.',
  },

  // ===========================================================================
  // ATMOSPHERIC/EXOTIC WORLDS
  // ===========================================================================

  /**
   * Tidally Locked - "Eyeball" planet
   *
   * Scientific basis: Planet in close orbit that has become tidally locked.
   * Permanent day side is hot, night side frozen, habitable twilight ring.
   * Examples: TRAPPIST-1 planets, Proxima b (possibly)
   */
  tidally_locked: {
    temperatureOffset: 0.2,          // Warm on average
    temperatureScale: 0.6,           // Moderate variation in twilight zone
    moistureOffset: 0,
    moistureScale: 0.8,
    elevationOffset: 0,
    elevationScale: 1.0,
    seaLevel: -0.3,
    allowedBiomes: TIDALLY_LOCKED_BIOMES,
    gravity: 0.9,
    atmosphereDensity: 1.2,
    atmosphereType: 'nitrogen_oxygen',
    isTidallyLocked: true,
    dayLengthHours: Infinity,        // No day/night cycle
    skyColor: '#ff9966',             // Permanent sunset colors
    description: 'An eyeball world with a scorched day side and frozen night. Life clings to the eternal twilight ring where temperatures remain moderate.',
  },

  /**
   * Hycean - Hydrogen-rich ocean world
   *
   * Scientific basis: New exoplanet class (Madhusudhan 2021).
   * Thick hydrogen atmosphere, warm ocean, potentially habitable.
   * Example: K2-18b (possibly)
   */
  hycean: {
    temperatureOffset: 0.15,         // Warm due to greenhouse
    temperatureScale: 0.3,           // Very stable (thick atmosphere)
    moistureOffset: 0.6,             // Very wet
    moistureScale: 0.4,
    elevationOffset: -0.3,           // Low terrain, mostly ocean
    elevationScale: 0.4,
    seaLevel: 0.4,                   // Extensive ocean
    allowedBiomes: HYCEAN_BIOMES,
    gravity: 2.0,                    // Large planet
    atmosphereDensity: 5.0,          // Very thick H2 atmosphere
    atmosphereType: 'hydrogen',
    dayLengthHours: 16,
    skyColor: '#ffccff',             // Pinkish from hydrogen
    description: 'A warm ocean world beneath a crushing hydrogen sky. The thick atmosphere creates eternal twilight, but the seas may teem with alien life.',
  },

  /**
   * Rogue - Starless wandering planet
   *
   * Scientific basis: Planet ejected from its system, drifting through
   * interstellar space. Heated only by internal processes.
   * Estimated billions of rogues in the galaxy.
   */
  rogue: {
    temperatureOffset: -0.7,         // Very cold surface
    temperatureScale: 0.2,           // Almost no variation (no star)
    moistureOffset: -0.2,
    moistureScale: 0.3,
    elevationOffset: 0,
    elevationScale: 1.0,
    seaLevel: -0.5,                  // Some ice/liquid from internal heat
    allowedBiomes: ROGUE_BIOMES,
    gravity: 1.0,
    atmosphereDensity: 2.0,          // Thick atmosphere retained heat
    atmosphereType: 'hydrogen',
    isStarless: true,
    dayLengthHours: 0,               // No day at all
    skyColor: '#000005',             // Pure black with faint stars
    description: 'A wandering world cast into the void between stars. Eternal darkness blankets the surface, but geothermal vents provide islands of warmth.',
  },

  /**
   * Gas Dwarf - Mini-Neptune
   *
   * Scientific basis: Small gas/ice giant with thick H2/He atmosphere.
   * May have rocky core deep beneath clouds.
   * Examples: GJ 1214b, many Kepler discoveries
   */
  gas_dwarf: {
    temperatureOffset: 0,
    temperatureScale: 0.4,           // Uniform (no surface)
    moistureOffset: 0.4,             // High humidity in atmosphere
    moistureScale: 0.5,
    elevationOffset: -0.2,
    elevationScale: 0.6,
    seaLevel: 0.0,                   // Cloudtops
    allowedBiomes: GAS_DWARF_BIOMES,
    gravity: 1.4,
    atmosphereDensity: 8.0,          // Extremely thick
    atmosphereType: 'hydrogen',
    dayLengthHours: 10,              // Fast rotation
    skyColor: '#aaccff',             // Blue-white clouds
    description: 'A world of endless clouds. The thick atmosphere gradually transitions to crushing pressure and liquid below, with no true surface in sight.',
  },

  /**
   * Moon - Planetary satellite
   *
   * Scientific basis: Natural satellite of a larger planet.
   * May be tidally heated, have thin atmosphere.
   * Examples: Our Moon, Titan, Ganymede
   */
  moon: {
    temperatureOffset: -0.3,         // Cold (little atmosphere)
    temperatureScale: 1.6,           // Extreme variation
    moistureOffset: -0.5,            // Very dry
    moistureScale: 0.1,
    elevationOffset: 0,
    elevationScale: 0.6,             // Cratered, low relief
    seaLevel: -0.9,                  // No liquid water
    allowedBiomes: MOON_BIOMES,
    gravity: 0.17,                   // Like our Moon
    atmosphereDensity: 0.0,
    atmosphereType: 'none',
    dayLengthHours: 708,             // Like our Moon (synodic)
    skyColor: '#000000',             // Black sky
    description: 'A cratered satellite locked in orbit around a gas giant. The barren surface bears witness to billions of years of impacts.',
  },

  // ===========================================================================
  // FANTASY/ALIEN WORLDS
  // ===========================================================================

  /**
   * Magical - Arcane realm
   *
   * Fantasy world where physics bend to arcane forces.
   * Floating islands, mana zones, impossible terrain.
   */
  magical: {
    temperatureOffset: 0,
    temperatureScale: 1.0,
    moistureOffset: 0,
    moistureScale: 1.0,
    elevationOffset: 0,
    elevationScale: 1.4,             // Dramatic terrain
    seaLevel: -0.3,
    allowedBiomes: MAGICAL_BIOMES,
    gravity: 1.0,                    // Varies locally
    atmosphereDensity: 1.0,
    atmosphereType: 'nitrogen_oxygen',
    hasFloatingIslands: true,
    dayLengthHours: 24,
    skyColor: '#9966ff',             // Magical purple tinge
    description: 'A realm where arcane energies warp reality. Islands float impossibly, mana pools glow with power, and the very air thrums with magic.',
  },

  /**
   * Corrupted - Dark lands
   *
   * World twisted by eldritch or dark forces.
   * Blighted terrain, shadow forests, dangerous to mortals.
   */
  corrupted: {
    temperatureOffset: 0.1,
    temperatureScale: 0.7,
    moistureOffset: -0.2,
    moistureScale: 0.5,
    elevationOffset: 0,
    elevationScale: 1.2,
    seaLevel: -0.4,
    allowedBiomes: CORRUPTED_BIOMES,
    gravity: 1.0,
    atmosphereDensity: 1.1,
    atmosphereType: 'nitrogen_oxygen',
    corruptionLevel: 0.7,
    dayLengthHours: 28,              // Time flows strangely
    skyColor: '#330033',             // Sickly purple-black
    description: 'A world where darkness seeps from the land itself. The twisted terrain drives mortals mad, and shadow creatures stalk the perpetual gloom.',
  },

  /**
   * Fungal - Alien biosphere
   *
   * World dominated by fungal life forms rather than plants.
   * Scientifically plausible alternative biochemistry.
   */
  fungal: {
    temperatureOffset: 0.1,          // Warm, humid
    temperatureScale: 0.6,
    moistureOffset: 0.3,             // Very humid
    moistureScale: 1.2,
    elevationOffset: -0.1,
    elevationScale: 0.8,
    seaLevel: -0.4,
    allowedBiomes: FUNGAL_BIOMES,
    gravity: 0.8,
    atmosphereDensity: 1.3,          // Spore-laden
    atmosphereType: 'nitrogen_oxygen',
    hasGiantMushrooms: true,
    dayLengthHours: 32,
    skyColor: '#ccff99',             // Greenish from spores
    description: 'A world where fungi reign supreme. Towering mushrooms form forests, spore clouds drift on the breeze, and mycelium networks connect all life.',
  },

  /**
   * Crystal - Crystalline world
   *
   * World with silicon-based geology or unusual mineralogy.
   * Prismatic formations, refractive terrain, geode caves.
   */
  crystal: {
    temperatureOffset: -0.2,         // Cool
    temperatureScale: 0.9,
    moistureOffset: -0.3,            // Dry
    moistureScale: 0.3,
    elevationOffset: 0.1,
    elevationScale: 1.5,             // Dramatic spires
    seaLevel: -0.5,
    allowedBiomes: CRYSTAL_BIOMES,
    gravity: 1.2,
    atmosphereDensity: 0.6,
    atmosphereType: 'nitrogen_oxygen',
    hasCrystalFormations: true,
    dayLengthHours: 48,
    skyColor: '#ffffff',             // Brilliantly refractive
    description: 'A world of prismatic beauty. Crystal spires catch and scatter light into rainbows, while geode caves hide treasures of impossible color.',
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the default preset for a planet type.
 */
export function getPlanetPreset(type: PlanetType): PlanetPreset {
  const preset = PLANET_TERRAIN_PRESETS[type];
  if (!preset) {
    throw new Error(`Unknown planet type: ${type}`);
  }
  return preset;
}

/**
 * Create a full planet config from a preset with overrides.
 */
export function createPlanetConfigFromPreset(
  id: string,
  name: string,
  type: PlanetType,
  seed: string,
  overrides?: PlanetPreset
): import('./PlanetTypes.js').PlanetConfig {
  const preset = getPlanetPreset(type);

  return {
    $schema: 'https://aivillage.dev/schemas/planet/v1',
    id,
    name,
    type,
    seed,
    // Core terrain parameters
    temperatureOffset: overrides?.temperatureOffset ?? preset.temperatureOffset ?? 0,
    temperatureScale: overrides?.temperatureScale ?? preset.temperatureScale ?? 1.0,
    moistureOffset: overrides?.moistureOffset ?? preset.moistureOffset ?? 0,
    moistureScale: overrides?.moistureScale ?? preset.moistureScale ?? 1.0,
    elevationOffset: overrides?.elevationOffset ?? preset.elevationOffset ?? 0,
    elevationScale: overrides?.elevationScale ?? preset.elevationScale ?? 1.0,
    seaLevel: overrides?.seaLevel ?? preset.seaLevel ?? -0.3,
    allowedBiomes: overrides?.allowedBiomes ?? preset.allowedBiomes ?? STANDARD_BIOMES,
    // Physical properties
    ...(preset.gravity !== undefined && { gravity: overrides?.gravity ?? preset.gravity }),
    ...(preset.atmosphereDensity !== undefined && { atmosphereDensity: overrides?.atmosphereDensity ?? preset.atmosphereDensity }),
    ...(preset.atmosphereType !== undefined && { atmosphereType: overrides?.atmosphereType ?? preset.atmosphereType }),
    ...(preset.isTidallyLocked !== undefined && { isTidallyLocked: overrides?.isTidallyLocked ?? preset.isTidallyLocked }),
    ...(preset.isStarless !== undefined && { isStarless: overrides?.isStarless ?? preset.isStarless }),
    ...(preset.dayLengthHours !== undefined && { dayLengthHours: overrides?.dayLengthHours ?? preset.dayLengthHours }),
    ...(preset.skyColor !== undefined && { skyColor: overrides?.skyColor ?? preset.skyColor }),
    // Special terrain features
    ...(preset.hasFloatingIslands && { hasFloatingIslands: true }),
    ...(preset.hasLavaFlows && { hasLavaFlows: true }),
    ...(preset.hasCrystalFormations && { hasCrystalFormations: true }),
    ...(preset.hasCarbonFormations && { hasCarbonFormations: true }),
    ...(preset.hasSubsurfaceOcean && { hasSubsurfaceOcean: true }),
    ...(preset.hasGiantMushrooms && { hasGiantMushrooms: true }),
    ...(preset.hasMetallicTerrain && { hasMetallicTerrain: true }),
    ...(preset.corruptionLevel !== undefined && { corruptionLevel: preset.corruptionLevel }),
    ...(preset.description && { description: preset.description }),
    // Apply overrides for special features
    ...(overrides?.hasFloatingIslands !== undefined && { hasFloatingIslands: overrides.hasFloatingIslands }),
    ...(overrides?.hasLavaFlows !== undefined && { hasLavaFlows: overrides.hasLavaFlows }),
    ...(overrides?.hasCrystalFormations !== undefined && { hasCrystalFormations: overrides.hasCrystalFormations }),
    ...(overrides?.hasCarbonFormations !== undefined && { hasCarbonFormations: overrides.hasCarbonFormations }),
    ...(overrides?.hasSubsurfaceOcean !== undefined && { hasSubsurfaceOcean: overrides.hasSubsurfaceOcean }),
    ...(overrides?.hasGiantMushrooms !== undefined && { hasGiantMushrooms: overrides.hasGiantMushrooms }),
    ...(overrides?.hasMetallicTerrain !== undefined && { hasMetallicTerrain: overrides.hasMetallicTerrain }),
    ...(overrides?.corruptionLevel !== undefined && { corruptionLevel: overrides.corruptionLevel }),
    ...(overrides?.description && { description: overrides.description }),
  };
}

/**
 * Create a default "homeworld" terrestrial planet config.
 */
export function createHomeworldConfig(universeSeed: string): import('./PlanetTypes.js').PlanetConfig {
  return createPlanetConfigFromPreset(
    'planet:homeworld',
    'Homeworld',
    'terrestrial',
    `${universeSeed}:homeworld`,
    { description: 'The starting world - a diverse terrestrial planet in the habitable zone.' }
  );
}

/**
 * Get a random planet type weighted by scientific frequency.
 *
 * Based on Kepler mission statistics:
 * - Super-Earths are most common
 * - Gas dwarfs are very common
 * - Terrestrial (Earth-sized habitable) are rare
 */
export function getRandomPlanetType(rng: () => number): PlanetType {
  const roll = rng();

  // Weights roughly based on exoplanet frequency
  if (roll < 0.25) return 'super_earth';      // 25% - most common rocky
  if (roll < 0.40) return 'gas_dwarf';        // 15% - mini-Neptunes common
  if (roll < 0.50) return 'desert';           // 10% - Mars-like common
  if (roll < 0.58) return 'ice';              // 8% - frozen worlds
  if (roll < 0.65) return 'ocean';            // 7% - waterworlds
  if (roll < 0.70) return 'tidally_locked';   // 5% - around red dwarfs
  if (roll < 0.75) return 'volcanic';         // 5% - tidally heated
  if (roll < 0.79) return 'moon';             // 4% - satellites
  if (roll < 0.83) return 'hycean';           // 4% - new class
  if (roll < 0.86) return 'rogue';            // 3% - wanderers
  if (roll < 0.89) return 'carbon';           // 3% - exotic
  if (roll < 0.92) return 'iron';             // 3% - chthonian cores
  if (roll < 0.95) return 'terrestrial';      // 3% - Earth-like rare!
  if (roll < 0.97) return 'magical';          // 2% - fantasy
  if (roll < 0.98) return 'fungal';           // 1% - alien life
  if (roll < 0.99) return 'crystal';          // 1% - exotic
  return 'corrupted';                          // 1% - dark realms
}
