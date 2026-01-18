# Spatial Hierarchy - From Tiles to Galaxies

**Status:** 🚧 Design Document
**Version:** 1.0.0
**Last Updated:** 2026-01-17
**Dependencies:** 01-GRAND-STRATEGY-OVERVIEW.md, 03-TIME-SCALING.md, packages/hierarchy-simulator/, packages/world/src/planet/

---

## Overview & Motivation

### The Spatial Scale Problem

The hierarchy-simulator package already implements a 7-tier system from individual tiles (9 m²) to gigasegments (10^15 km²), representing planetary civilization scales. To enable interstellar grand strategy, we extend this hierarchy with **4 new tiers** that span from entire planets to galaxies.

**Key Insight:** The existing `AbstractTier` interface, `RenormalizationEngine`, and `SUMMARIZATION_RULES` already provide the framework. This spec **extends** rather than replaces the existing system.

### Physical Scale Progression

```
Existing Tiers (packages/hierarchy-simulator/):
  Tile (9 m²) → Chunk (3 km²) → Zone (10^5 km²) → Region (10^8 km²)
  → Subsection (10^10 km²) → Megasegment (10^13 km²) → Gigasegment (10^15 km²)

NEW Tiers (this spec):
  → Planet (5×10^8 km²) → System (10^18 km²) → Sector (10^24 km²) → Galaxy (10^30 km²)
```

**Design Philosophy:**
1. **Maintain consistency** with existing hierarchy-simulator patterns
2. **Integrate with PlanetConfig** (17 planet types already defined)
3. **Preserve information** following existing SUMMARIZATION_RULES
4. **Enable interstellar gameplay** without breaking planetary simulation

---

## Complete Tier Table

### Extended TierLevel Type

**File:** `packages/hierarchy-simulator/src/abstraction/types.ts`

```typescript
export type TierLevel =
  // Existing tiers (DO NOT MODIFY)
  | 'tile'         // 9 m² - Individual physics
  | 'chunk'        // 3 km² - FULL ECS (10-1K population)
  | 'zone'         // 10^5 km² - Demographics (1K-100K)
  | 'region'       // 10^8 km² - Economy (100K-10M)
  | 'subsection'   // 10^10 km² - Politics (10M-500M)
  | 'megasegment'  // 10^13 km² - Culture (100M-1B)
  | 'gigasegment'  // 10^15 km² - Civilization (10B-100B)

  // NEW: Interstellar tiers
  | 'planet'       // 5×10^8 km² - Entire world (1M-500M)
  | 'system'       // 10^18 km² - Star system (100M-10B)
  | 'sector'       // 10^24 km² - Regional power (1B-100B)
  | 'galaxy';      // 10^30 km² - Cosmic civilization (Trillions)
```

### Tier Scale Data

**File:** `packages/hierarchy-simulator/src/abstraction/types.ts`

**Extend existing TIER_SCALES:**

```typescript
export const TIER_SCALES: Record<TierLevel, {
  area: number;          // km²
  populationRange: [number, number];
  childrenCount: number;
  label: string;

  // NEW: Physical properties for interstellar tiers
  physicalProperties?: {
    typicalDiameter?: number;  // km
    typicalMass?: number;      // kg
    typicalDensity?: number;   // kg/m³
  };
}> = {
  // ... existing tiers ...

  // NEW TIERS
  planet: {
    area: 5e8,  // ~510 million km² (Earth = 510M km²)
    populationRange: [1_000_000, 500_000_000],  // 1M-500M
    childrenCount: 100,  // 100 gigasegments
    label: 'Planet',
    physicalProperties: {
      typicalDiameter: 12742,      // km (Earth-like)
      typicalMass: 5.972e24,       // kg (Earth mass)
      typicalDensity: 5514,        // kg/m³ (rocky world)
    }
  },

  system: {
    area: 1e18,  // Star system volume (~1 AU³)
    populationRange: [100_000_000, 10_000_000_000],  // 100M-10B
    childrenCount: 10,  // 2-20 planets + moons + stations
    label: 'Star System',
    physicalProperties: {
      typicalDiameter: 2e9,        // km (~13 AU, Kuiper belt)
      typicalMass: 2e30,           // kg (Sun-like star)
      typicalDensity: 0,           // Mostly vacuum
    }
  },

  sector: {
    area: 1e24,  // 10-100 star systems in ~10 ly³ cube
    populationRange: [1_000_000_000, 100_000_000_000],  // 1B-100B
    childrenCount: 50,  // 10-100 systems
    label: 'Sector',
    physicalProperties: {
      typicalDiameter: 10 * 9.461e12,  // km (10 light-years)
    }
  },

  galaxy: {
    area: 1e30,  // Milky Way = ~100,000 ly diameter
    populationRange: [10_000_000_000, 1e15],  // 10B-1 quadrillion
    childrenCount: 1000,  // 100-10,000 sectors (spiral arms)
    label: 'Galaxy',
    physicalProperties: {
      typicalDiameter: 100000 * 9.461e12,  // km (100,000 light-years)
      typicalMass: 1.5e42,                  // kg (Milky Way mass)
    }
  }
};
```

### Time Scale Constants

**File:** `packages/hierarchy-simulator/src/renormalization/TierConstants.ts`

**Extend existing TIME_SCALE:**

```typescript
export const TIME_SCALE: Record<TierLevel, number> = {
  // Existing tiers (DO NOT MODIFY)
  tile: 1,           // 1 tick = 1 tick (individual physics)
  chunk: 1,          // 1 tick = 1 tick (real ECS)
  zone: 60,          // 1 tick = 1 hour (60 minutes)
  region: 1440,      // 1 tick = 1 day (24 hours)
  subsection: 10080, // 1 tick = 1 week (7 days)
  megasegment: 43200,    // 1 tick = 1 month (30 days)
  gigasegment: 525600,   // 1 tick = 1 year (365 days)

  // NEW: Interstellar time scales
  planet: 5256000,       // 1 tick = 10 years (3650 days)
  system: 52560000,      // 1 tick = 100 years (36,500 days)
  sector: 525600000,     // 1 tick = 1,000 years (365,000 days)
  galaxy: 5256000000,    // 1 tick = 10,000 years (3.65M days)
};

/**
 * Real-world time equivalents at 20 TPS:
 *
 * Planet tier:
 *   - 1 real second = 20 ticks = 200 years
 *   - 1 real minute = 1200 ticks = 12,000 years
 *
 * System tier:
 *   - 1 real second = 20 ticks = 2,000 years
 *   - 1 real minute = 1200 ticks = 120,000 years
 *
 * Sector tier:
 *   - 1 real second = 20 ticks = 20,000 years
 *   - 1 real minute = 1200 ticks = 1.2 million years
 *
 * Galaxy tier:
 *   - 1 real second = 20 ticks = 200,000 years
 *   - 1 real minute = 1200 ticks = 12 million years
 */
```

### Tier Level Index

**File:** `packages/hierarchy-simulator/src/renormalization/TierConstants.ts`

```typescript
export const TIER_LEVEL_INDEX: Record<TierLevel, number> = {
  tile: 0,
  chunk: 1,
  zone: 2,
  region: 3,
  subsection: 4,
  megasegment: 5,
  gigasegment: 6,

  // NEW
  planet: 7,
  system: 8,
  sector: 9,
  galaxy: 10,
};
```

---

## Planet Tier

### Integration with PlanetConfig

The `planet` tier abstracts an entire world using **existing PlanetConfig** from `packages/world/src/planet/PlanetTypes.ts`.

**Key Integration:** When zooming out from gigasegment to planet tier, we create a PlanetTier that references the active PlanetConfig. When zooming in, we use the PlanetConfig to regenerate terrain.

### PlanetTier Interface

**File:** `packages/hierarchy-simulator/src/abstraction/AbstractPlanet.ts` (NEW)

```typescript
import type { AbstractTier, TierLevel, SimulationMode } from './types.js';
import type { PlanetConfig, PlanetType } from '@ai-village/world/planet';

/**
 * Planet-tier abstraction - entire world simulated statistically
 *
 * Integrates with existing PlanetConfig system:
 * - Uses PlanetConfig for terrain generation parameters
 * - Aggregates gigasegment-level statistics
 * - Preserves surface features, nations, megastructures
 *
 * At this tier, individual continents/regions become statistics.
 * Only named locations, major civilizations, and planetary features persist.
 */
export interface PlanetTier extends AbstractTier {
  tier: 'planet';

  /**
   * Planet configuration (from @ai-village/world/planet)
   * Defines terrain generation, biomes, gravity, atmosphere
   */
  planetConfig: PlanetConfig;

  /**
   * Planet-wide statistics
   */
  planetaryStats: {
    /** Total land area (km²) */
    landArea: number;

    /** Total ocean area (km²) */
    oceanArea: number;

    /** Number of distinct continents */
    continentCount: number;

    /** Climate zones distribution (%) */
    climateZones: {
      tropical: number;
      temperate: number;
      polar: number;
      desert: number;
    };

    /** Biome distribution (from PlanetConfig.allowedBiomes) */
    biomeDistribution: Map<string, number>;  // biome → area %

    /** Resource abundance (from terrain generation) */
    resourceAbundance: Map<string, number>;  // resource → total quantity
  };

  /**
   * Civilization statistics (aggregated from gigasegments)
   */
  civilizationStats: {
    /** Number of nations/empires */
    nationCount: number;

    /** Dominant culture (if any) */
    dominantCulture?: string;

    /** Average tech level across all civilizations */
    avgTechLevel: number;

    /** Tech level range [min, max] */
    techLevelRange: [number, number];

    /** Planetary government type (if unified) */
    governmentType?: 'unified' | 'fractured' | 'tribal' | 'post-singularity';

    /** Urbanization rate (0-1) */
    urbanization: number;

    /** Industrial development level (0-10) */
    industrialization: number;
  };

  /**
   * Named surface features (PRESERVED across zoom levels)
   */
  namedFeatures: Array<{
    id: string;
    name: string;
    type: 'continent' | 'ocean' | 'mountain_range' | 'river' | 'crater' | 'volcano';
    location: { lat: number; lon: number };
    namedBy?: string;  // Agent/player who named it
    namedAt?: number;  // Tick when named
  }>;

  /**
   * Major civilizations (PRESERVED)
   */
  majorCivilizations: Array<{
    id: string;
    name: string;
    population: number;
    capital: { lat: number; lon: number };
    techLevel: number;
    culturalIdentity: string;
    activeWars: string[];  // Civilization IDs
  }>;

  /**
   * Megastructures on this planet (PRESERVED)
   */
  megastructures: Array<{
    id: string;
    type: 'orbital_ring' | 'space_elevator' | 'planetary_shield' | 'weather_control';
    location: { lat: number; lon: number } | 'orbital';
    constructionProgress: number;  // 0-1
    operational: boolean;
  }>;

  /**
   * Planetary events (recent history)
   */
  planetaryEvents: Array<{
    tick: number;
    type: 'mass_extinction' | 'ice_age' | 'volcanic_eruption' | 'asteroid_impact' | 'nuclear_war' | 'unification' | 'first_spaceflight';
    severity: number;  // 1-10
    description: string;
  }>;
}
```

### PlanetConfig Aggregation

**How PlanetConfig parameters map to planetary statistics:**

```typescript
/**
 * Generate planet-tier statistics from PlanetConfig and child gigasegments
 */
function aggregatePlanetStats(
  planetConfig: PlanetConfig,
  gigasegments: AbstractTier[]
): PlanetaryStats {

  // Terrain statistics from PlanetConfig
  const seaLevel = planetConfig.seaLevel ?? -0.3;
  const oceanCoverage = (1 + seaLevel) / 2;  // -0.3 → 35% ocean
  const totalArea = TIER_SCALES.planet.area;

  const landArea = totalArea * (1 - oceanCoverage);
  const oceanArea = totalArea * oceanCoverage;

  // Climate from temperature/moisture parameters
  const climateZones = calculateClimateZones(
    planetConfig.temperatureOffset,
    planetConfig.temperatureScale,
    planetConfig.moistureOffset,
    planetConfig.moistureScale
  );

  // Biome distribution from allowedBiomes
  const biomeDistribution = new Map<string, number>();
  const weights = planetConfig.biomeWeights ?? {};

  for (const biome of planetConfig.allowedBiomes) {
    const weight = weights[biome] ?? 1.0;
    biomeDistribution.set(biome, weight);
  }

  // Normalize to percentages
  const totalWeight = Array.from(biomeDistribution.values())
    .reduce((sum, w) => sum + w, 0);
  for (const [biome, weight] of biomeDistribution) {
    biomeDistribution.set(biome, (weight / totalWeight) * 100);
  }

  // Resource abundance (derived from planet type)
  const resourceAbundance = calculateResourceAbundance(
    planetConfig.type,
    planetConfig.allowedBiomes
  );

  return {
    landArea,
    oceanArea,
    continentCount: Math.floor(landArea / 5e7) + 1,  // ~1 continent per 50M km²
    climateZones,
    biomeDistribution,
    resourceAbundance,
  };
}

/**
 * Calculate climate zone distribution from planet parameters
 */
function calculateClimateZones(
  tempOffset: number,
  tempScale: number,
  moistureOffset: number,
  moistureScale: number
): { tropical: number; temperate: number; polar: number; desert: number } {

  // Hot worlds: more tropical/desert
  const hotBias = Math.max(0, tempOffset);
  const coldBias = Math.max(0, -tempOffset);

  // Dry worlds: more desert
  const dryBias = Math.max(0, -moistureOffset);

  return {
    tropical: 30 + hotBias * 20 - dryBias * 15,
    temperate: 40 - hotBias * 10 - coldBias * 10,
    polar: 15 + coldBias * 20,
    desert: 15 + dryBias * 30 + hotBias * 10,
  };
}

/**
 * Resource abundance by planet type
 */
function calculateResourceAbundance(
  planetType: PlanetType,
  biomes: BiomeType[]
): Map<string, number> {

  const abundance = new Map<string, number>();

  // Base resources from biomes
  for (const biome of biomes) {
    const biomeResources = BIOME_RESOURCES[biome] ?? {};
    for (const [resource, amount] of Object.entries(biomeResources)) {
      abundance.set(
        resource,
        (abundance.get(resource) ?? 0) + amount
      );
    }
  }

  // Planet-type specific bonuses
  const typeBonus = PLANET_RESOURCE_BONUSES[planetType] ?? {};
  for (const [resource, multiplier] of Object.entries(typeBonus)) {
    abundance.set(
      resource,
      (abundance.get(resource) ?? 0) * multiplier
    );
  }

  return abundance;
}

// Example resource bonuses
const PLANET_RESOURCE_BONUSES: Record<PlanetType, Record<string, number>> = {
  desert: {
    silicon: 2.0,
    rare_earths: 1.5,
    water: 0.1,
  },
  volcanic: {
    metals: 3.0,
    geothermal_energy: 10.0,
    sulfur: 5.0,
  },
  ocean: {
    water: 100.0,
    fish: 10.0,
    salt: 5.0,
  },
  ice: {
    water: 50.0,
    deuterium: 2.0,
    helium3: 1.5,
  },
  iron: {
    iron: 10.0,
    nickel: 5.0,
    platinum: 2.0,
  },
  carbon: {
    carbon: 10.0,
    diamond: 5.0,
    graphene: 3.0,
  },
  // ... etc for all 17 planet types
};
```

### Preservation Rules for Planet Tier

**File:** `packages/hierarchy-simulator/src/renormalization/TierConstants.ts`

```typescript
export const SUMMARIZATION_RULES: Record<TierLevel, SummarizationRules> = {
  // ... existing tiers ...

  // NEW
  planet: {
    sum: [
      'population',
      'totalProduction',
      'totalConsumption',
      'militaryPower',
    ],
    average: [
      'avgTechLevel',
      'avgHappiness',
      'avgLifeExpectancy',
      'beliefDensity',
    ],
    computed: [
      'planetaryStability',
      'urbanization',
      'industrialization',
      'culturalInfluence',
    ],
    preserved: [
      'planetConfig',           // ALWAYS preserve planet parameters
      'namedFeatures',          // Continents, mountains, etc.
      'majorCivilizations',     // Named nations/empires
      'megastructures',         // Orbital rings, space elevators
      'planetaryEvents',        // Mass extinctions, ice ages
      'capitalCity',            // Main city (if unified government)
      'worldWonders',           // Great buildings visible from space
    ],
    lost: [
      'gigasegment_details',    // Individual regions/zones
      'local_politics',         // City-level governance
      'individual_buildings',   // Except world wonders
      'trade_routes',           // Except major shipping lanes
      'weather_patterns',       // Except climate zones
    ],
  },
};
```

---

## System Tier

### Star System Structure

A star system contains:
- **Primary star** (or binary/trinary system)
- **Planets** (2-20, using PlanetConfig)
- **Moons** (around gas giants)
- **Asteroid belts** (resource mining)
- **Space stations** (orbital infrastructure)

### SystemTier Interface

**File:** `packages/hierarchy-simulator/src/abstraction/AbstractSystem.ts` (NEW)

```typescript
import type { AbstractTier, PlanetTier } from './types.js';

/**
 * System-tier abstraction - entire star system
 *
 * Contains multiple planets, asteroid belts, stations, and orbital infrastructure.
 * Time scale: 1 tick = 100 years
 *
 * At this tier, individual planets become statistics unless they host
 * major civilizations (which are preserved).
 */
export interface SystemTier extends AbstractTier {
  tier: 'system';

  /**
   * Star properties (from stellar classification)
   */
  star: {
    type: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';  // Spectral type
    subtype: number;  // 0-9
    mass: number;     // Solar masses
    luminosity: number;  // Solar luminosities
    age: number;      // Billions of years

    /** Binary/trinary systems */
    companions?: Array<{
      type: string;
      mass: number;
      orbitalPeriod: number;  // Years
    }>;
  };

  /**
   * Habitable zone (AU from star)
   */
  habitableZone: {
    inner: number;  // AU
    outer: number;  // AU
  };

  /**
   * Planets in this system (child tiers)
   */
  planets: Array<PlanetTier & {
    orbitalRadius: number;  // AU from star
    orbitalPeriod: number;  // Years
    inHabitableZone: boolean;
  }>;

  /**
   * Asteroid belts (resource sources)
   */
  asteroidBelts: Array<{
    id: string;
    innerRadius: number;  // AU
    outerRadius: number;  // AU
    density: 'sparse' | 'moderate' | 'dense';
    composition: 'rocky' | 'metallic' | 'icy';

    /** Mining operations */
    miningStations: number;
    resourceYield: Map<string, number>;  // resource → tons/year
  }>;

  /**
   * Space stations and orbital infrastructure
   */
  orbitalInfrastructure: Array<{
    id: string;
    type: 'station' | 'shipyard' | 'habitat' | 'refinery' | 'defense_platform';
    location: {
      orbitingBody?: string;  // Planet ID or 'star'
      orbitalRadius?: number;  // AU
    };
    population: number;
    capacity: number;
    operational: boolean;
  }>;

  /**
   * Interplanetary trade routes
   */
  tradeRoutes: Array<{
    id: string;
    from: string;  // Planet/station ID
    to: string;
    resources: Map<string, number>;  // Resource → tons/year
    travelTime: number;  // Years
    efficiency: number;  // 0-1
  }>;

  /**
   * System-wide statistics
   */
  systemStats: {
    /** Total population across all planets/stations */
    totalPopulation: number;

    /** Highest tech level in system */
    maxTechLevel: number;

    /** Number of spacefaring civilizations */
    spacefaringCivCount: number;

    /** Number of FTL-capable civilizations */
    ftlCapable: number;

    /** System defense rating (0-10) */
    defensePower: number;

    /** Economic output (GDU = Gross Domestic Units) */
    economicOutput: number;
  };

  /**
   * System-level events
   */
  systemEvents: Array<{
    tick: number;
    type: 'nova' | 'asteroid_impact' | 'first_contact' | 'space_battle' | 'dyson_swarm_begin' | 'wormhole_opened';
    location?: string;  // Planet/station ID
    description: string;
  }>;
}
```

### Orbital Mechanics (Simplified)

```typescript
/**
 * Calculate habitable zone for a star
 * (Simplified from actual stellar physics)
 */
function calculateHabitableZone(
  starLuminosity: number  // Solar luminosities
): { inner: number; outer: number } {

  // Habitable zone scales with sqrt of luminosity
  const sqrtL = Math.sqrt(starLuminosity);

  return {
    inner: 0.95 * sqrtL,   // AU
    outer: 1.37 * sqrtL,   // AU
  };
}

/**
 * Generate planets for a star system
 * (Simplified planetary formation)
 */
function generateSystemPlanets(
  starType: string,
  seed: string
): Array<PlanetTier> {

  const rng = seededRandom(seed);
  const planetCount = Math.floor(rng() * 10) + 2;  // 2-12 planets

  const planets: Array<PlanetTier> = [];
  let nextOrbit = 0.3;  // Start at 0.3 AU

  for (let i = 0; i < planetCount; i++) {
    // Orbital radius (roughly logarithmic spacing)
    const orbitalRadius = nextOrbit;
    nextOrbit *= (1.5 + rng() * 0.5);  // 1.5-2x spacing

    // Planet type based on distance from star
    const planetType = selectPlanetType(orbitalRadius, starType, rng);

    // Create planet tier
    const planet = createPlanetTier({
      id: `planet_${i}`,
      name: generatePlanetName(seed, i),
      type: planetType,
      orbitalRadius,
      orbitalPeriod: calculateOrbitalPeriod(orbitalRadius, starMass),
    });

    planets.push(planet);
  }

  return planets;
}

/**
 * Select planet type based on orbital distance
 */
function selectPlanetType(
  orbitalRadius: number,
  starType: string,
  rng: () => number
): PlanetType {

  // Inner system: Rocky worlds
  if (orbitalRadius < 1.0) {
    return rng() > 0.5 ? 'terrestrial' : 'desert';
  }

  // Habitable zone: Earth-like or ocean
  if (orbitalRadius >= 0.95 && orbitalRadius <= 1.37) {
    const roll = rng();
    if (roll < 0.4) return 'terrestrial';
    if (roll < 0.6) return 'ocean';
    if (roll < 0.8) return 'desert';
    return 'ice';
  }

  // Outer system: Gas giants and ice worlds
  if (orbitalRadius > 3.0) {
    return rng() > 0.7 ? 'gas_dwarf' : 'ice';
  }

  // Mid-range: Mix
  return rng() > 0.5 ? 'terrestrial' : 'ice';
}
```

### Preservation Rules for System Tier

```typescript
export const SUMMARIZATION_RULES: Record<TierLevel, SummarizationRules> = {
  // ... existing tiers ...

  system: {
    sum: [
      'totalPopulation',
      'systemProduction',
      'systemConsumption',
      'militaryFleetPower',
    ],
    average: [
      'avgTechLevel',
      'avgPlanetaryHappiness',
      'tradeEfficiency',
    ],
    computed: [
      'systemStability',
      'economicOutput',
      'defensePower',
      'spaceInfrastructure',
    ],
    preserved: [
      'starProperties',         // Spectral type, mass, luminosity
      'habitableZone',          // Inner/outer AU
      'planets',                // All planet tiers (with PlanetConfig)
      'majorStations',          // Named space stations
      'asteroidBelts',          // Resource mining zones
      'dysonSwarm',             // If present
      'wormholes',              // Stable connections to other systems
      'systemCapital',          // Most developed planet/station
    ],
    lost: [
      'planet_surface_details', // Individual continents (unless named)
      'minor_stations',         // Small outposts
      'ship_positions',         // Individual ship locations
      'trade_schedules',        // Except major routes
    ],
  },
};
```

---

## Sector Tier

### Sector Structure

A sector is a **regional power zone** spanning 10-100 star systems within ~10 light-years. Sectors form the building blocks of galactic civilization.

**Key Concept:** Sectors are where **interstellar politics** emerge. Multiple civilizations may compete for systems, form alliances, or wage wars.

### SectorTier Interface

**File:** `packages/hierarchy-simulator/src/abstraction/AbstractSector.ts` (NEW)

```typescript
import type { AbstractTier, SystemTier } from './types.js';

/**
 * Sector-tier abstraction - regional power zone
 *
 * Contains 10-100 star systems within ~10 light-years.
 * Time scale: 1 tick = 1,000 years
 *
 * At this tier, individual star systems become statistics unless they
 * contain major civilizations, megastructures, or strategic importance.
 */
export interface SectorTier extends AbstractTier {
  tier: 'sector';

  /**
   * Spatial properties
   */
  spatial: {
    /** Sector coordinates in galactic grid */
    galacticCoords: { x: number; y: number; z: number };

    /** Radius in light-years */
    radius: number;

    /** Distance from galactic core (light-years) */
    distanceFromCore: number;

    /** Spiral arm affiliation (if applicable) */
    spiralArm?: 'perseus' | 'orion' | 'sagittarius' | 'scutum_centaurus' | 'outer';

    /** Stellar density (stars per cubic light-year) */
    stellarDensity: number;
  };

  /**
   * Star systems in this sector (child tiers)
   */
  systems: Array<SystemTier & {
    coords: { x: number; y: number; z: number };  // Sector-relative position
    distanceFromSectorCenter: number;  // Light-years
  }>;

  /**
   * Interstellar infrastructure
   */
  infrastructure: {
    /** Wormhole gates (FTL travel) */
    wormholeGates: Array<{
      id: string;
      sourceSystem: string;
      destinationSystem: string;
      distance: number;  // Light-years (physical)
      travelTime: number;  // Days (through wormhole)
      stability: number;  // 0-1
      operational: boolean;
    }>;

    /** Trade networks (hyperspace lanes) */
    tradeNetworks: Array<{
      id: string;
      connectedSystems: string[];
      volume: number;  // Tons/year
      majorCommodities: string[];
    }>;

    /** Communication relays */
    commRelays: number;

    /** Defense platforms (sector-wide) */
    defensePlatforms: Array<{
      location: string;  // System ID
      type: 'orbital_fortress' | 'minefield' | 'sensor_network';
      coverage: number;  // Light-years radius
    }>;
  };

  /**
   * Political entities in sector
   */
  politicalEntities: Array<{
    id: string;
    name: string;
    type: 'empire' | 'federation' | 'corporate_state' | 'hive_mind' | 'ai_collective';
    controlledSystems: string[];  // System IDs
    population: number;
    techLevel: number;
    militaryPower: number;
    diplomaticStance: Map<string, 'ally' | 'neutral' | 'rival' | 'war'>;
  }>;

  /**
   * Sector-wide statistics
   */
  sectorStats: {
    totalPopulation: number;
    spacefaringCivCount: number;
    ftlCapableCivCount: number;
    avgTechLevel: number;
    maxTechLevel: number;

    /** Economic integration (0-1) */
    economicIntegration: number;

    /** Political stability (0-1) */
    politicalStability: number;

    /** Number of active wars */
    activeWars: number;
  };

  /**
   * Sector events (major historical moments)
   */
  sectorEvents: Array<{
    tick: number;
    type: 'empire_rise' | 'empire_fall' | 'first_contact' | 'sector_war' | 'dyson_sphere_complete' | 'singularity_event';
    participants: string[];  // Entity IDs
    description: string;
  }>;
}
```

### Sector Generation

```typescript
/**
 * Generate sector from galactic coordinates
 */
function generateSector(
  galacticCoords: { x: number; y: number; z: number },
  seed: string
): SectorTier {

  const rng = seededRandom(seed);

  // Distance from galactic core (0-50,000 light-years)
  const distanceFromCore = Math.sqrt(
    galacticCoords.x ** 2 + galacticCoords.y ** 2
  );

  // Stellar density (higher near core)
  const stellarDensity = calculateStellarDensity(distanceFromCore);

  // Number of systems (based on density)
  const systemCount = Math.floor(
    stellarDensity * 1000 + rng() * 50
  );  // 10-100 systems

  // Generate systems
  const systems: SystemTier[] = [];
  for (let i = 0; i < systemCount; i++) {
    const system = generateSystem({
      sectorSeed: seed,
      systemIndex: i,
      distanceFromCore,
    });
    systems.push(system);
  }

  // Generate political entities (based on tech levels)
  const politicalEntities = generatePoliticalEntities(systems, rng);

  return {
    tier: 'sector',
    id: `sector_${galacticCoords.x}_${galacticCoords.y}_${galacticCoords.z}`,
    spatial: {
      galacticCoords,
      radius: 10,  // Light-years
      distanceFromCore,
      spiralArm: determineSpiralArm(galacticCoords),
      stellarDensity,
    },
    systems,
    politicalEntities,
    // ... other fields
  };
}

/**
 * Stellar density decreases with distance from core
 */
function calculateStellarDensity(
  distanceFromCore: number  // Light-years
): number {

  // Milky Way stellar density model (simplified)
  // Core: ~1000 stars/ly³
  // Disk: ~0.1 stars/ly³
  // Halo: ~0.001 stars/ly³

  if (distanceFromCore < 1000) {
    // Galactic core (extremely dense)
    return 1000;
  } else if (distanceFromCore < 25000) {
    // Galactic disk (decreasing with radius)
    return 0.1 * Math.exp(-distanceFromCore / 10000);
  } else {
    // Galactic halo (very sparse)
    return 0.001;
  }
}

/**
 * Determine spiral arm from galactic coordinates
 */
function determineSpiralArm(
  coords: { x: number; y: number; z: number }
): string | undefined {

  // Simplified spiral arm model (Milky Way has 4 major arms)
  const angle = Math.atan2(coords.y, coords.x);
  const radius = Math.sqrt(coords.x ** 2 + coords.y ** 2);

  // Logarithmic spiral: θ = a * ln(r)
  const spiralAngle = 0.2 * Math.log(radius / 1000);

  const armWidth = Math.PI / 8;  // ~22.5 degrees

  // Check each arm
  const arms = ['perseus', 'orion', 'sagittarius', 'scutum_centaurus'];
  for (let i = 0; i < arms.length; i++) {
    const armAngle = spiralAngle + (i * Math.PI / 2);
    if (Math.abs(angle - armAngle) < armWidth) {
      return arms[i];
    }
  }

  return 'outer';  // Between arms
}
```

### Preservation Rules for Sector Tier

```typescript
export const SUMMARIZATION_RULES: Record<TierLevel, SummarizationRules> = {
  // ... existing tiers ...

  sector: {
    sum: [
      'totalPopulation',
      'totalProduction',
      'totalMilitaryPower',
      'totalTradeVolume',
    ],
    average: [
      'avgTechLevel',
      'avgStability',
      'economicIntegration',
    ],
    computed: [
      'politicalStability',
      'militaryBalance',
      'economicOutput',
      'culturalInfluence',
    ],
    preserved: [
      'starSystems',            // All system tiers
      'politicalEntities',      // Empires, federations
      'wormholeGates',          // FTL infrastructure
      'majorTradeNetworks',     // Economic arteries
      'activeWars',             // Conflicts
      'dysonSpheres',           // Megastructures
      'sectorCapital',          // Political/economic center
      'historicEvents',         // Empire rises/falls
    ],
    lost: [
      'system_details',         // Planets (unless major)
      'minor_trade_routes',     // Small merchants
      'individual_ships',       // Fleet positions
      'short_term_politics',    // Diplomatic spats
    ],
  },
};
```

---

## Galaxy Tier

### Galaxy Structure

The galaxy tier represents an **entire galactic civilization**. In the Milky Way scale:
- **100,000 light-years** diameter
- **100-400 billion stars**
- **1000+ sectors** organized into spiral arms
- **Galactic core, disk, and halo** regions

**Key Concept:** At this tier, we simulate **cosmic-scale civilizations** - Kardashev Type II-III societies that have colonized entire spiral arms.

### GalaxyTier Interface

**File:** `packages/hierarchy-simulator/src/abstraction/AbstractGalaxy.ts` (NEW)

```typescript
import type { AbstractTier, SectorTier } from './types.js';

/**
 * Galaxy-tier abstraction - entire galactic civilization
 *
 * Contains 1000+ sectors organized into spiral arms.
 * Time scale: 1 tick = 10,000 years
 *
 * At this tier, individual sectors become statistics unless they contain
 * galactic wonders, transcendent civilizations, or cosmic events.
 */
export interface GalaxyTier extends AbstractTier {
  tier: 'galaxy';

  /**
   * Galactic structure
   */
  structure: {
    type: 'spiral' | 'elliptical' | 'irregular' | 'ring';
    diameter: number;  // Light-years
    thickness: number;  // Light-years (disk thickness)

    /** Spiral arm count (if spiral galaxy) */
    spiralArms?: number;

    /** Central black hole */
    centralBlackHole: {
      mass: number;  // Solar masses
      accretionRate: number;  // Solar masses/year
      active: boolean;  // Is it a quasar?
    };

    /** Dark matter halo */
    darkMatterMass: number;  // Solar masses
  };

  /**
   * Sectors in this galaxy (child tiers)
   */
  sectors: Array<SectorTier & {
    region: 'core' | 'disk' | 'halo';
    spiralArm?: string;
    distanceFromCore: number;  // Light-years
  }>;

  /**
   * Galactic-scale civilizations
   */
  galacticCivilizations: Array<{
    id: string;
    name: string;
    type: 'kardashev_ii' | 'kardashev_iii' | 'transcendent' | 'ai_collective' | 'hive_overmind';

    /** Sectors controlled */
    controlledSectors: string[];

    /** Total population (trillions) */
    population: number;

    /** Tech level (0-10, where 10 = post-singularity) */
    techLevel: number;

    /** Kardashev scale (1.0-3.0) */
    kardashevLevel: number;

    /** Energy output (watts) */
    energyOutput: number;

    /** Number of Dyson spheres */
    dysonSpheres: number;

    /** Megastructures */
    megastructures: Array<{
      id: string;
      type: 'dyson_sphere' | 'ringworld' | 'galactic_highway' | 'matrioshka_brain' | 'stellar_engine';
      location: string;  // Sector ID
      operational: boolean;
    }>;
  }>;

  /**
   * Galactic infrastructure
   */
  infrastructure: {
    /** Wormhole network (galaxy-spanning) */
    wormholeNetwork: {
      nodeCount: number;
      totalConnections: number;
      coverage: number;  // % of sectors connected
    };

    /** Communication beacons */
    commBeacons: number;

    /** Galactic Internet (if exists) */
    galacticNet?: {
      bandwidth: number;  // Exabytes/second
      latency: number;    // Years (light-speed limited)
      nodes: number;
    };
  };

  /**
   * Galactic statistics
   */
  galacticStats: {
    totalPopulation: number;
    totalStars: number;
    totalPlanets: number;
    colonizedSystems: number;

    /** Highest tech level in galaxy */
    maxTechLevel: number;

    /** Average Kardashev level */
    avgKardashevLevel: number;

    /** Total energy output (watts) */
    totalEnergyOutput: number;

    /** Galactic GDP (Gross Galactic Product) */
    economicOutput: number;

    /** Number of active civilizations */
    activeCivilizations: number;

    /** Number of extinct civilizations */
    extinctCivilizations: number;
  };

  /**
   * Cosmic events (galactic history)
   */
  cosmicEvents: Array<{
    tick: number;
    type:
      | 'civilization_rise'
      | 'civilization_collapse'
      | 'galactic_war'
      | 'first_dyson_sphere'
      | 'singularity_cascade'
      | 'black_hole_merger'
      | 'gamma_ray_burst'
      | 'intergalactic_contact'
      | 'great_filter_crossed'
      | 'universe_fork';
    location?: string;  // Sector ID
    participants?: string[];  // Civilization IDs
    description: string;
    impact: 'local' | 'regional' | 'galactic' | 'cosmic';
  }>;

  /**
   * Galactic governance (if unified)
   */
  governance?: {
    type: 'galactic_council' | 'galactic_empire' | 'ai_stewardship' | 'hive_mind' | 'anarchic';
    founded: number;  // Tick
    memberCivilizations: string[];
    laws: string[];
    enforcement: number;  // 0-1
  };
}
```

### Galaxy Generation

```typescript
/**
 * Generate galaxy from seed
 */
function generateGalaxy(
  seed: string,
  age: number  // Billions of years
): GalaxyTier {

  const rng = seededRandom(seed);

  // Galaxy structure (90% spiral, 10% elliptical/irregular)
  const type = rng() < 0.9 ? 'spiral' : 'elliptical';
  const spiralArms = type === 'spiral' ? (2 + Math.floor(rng() * 3)) : undefined;  // 2-4 arms

  // Milky Way-like dimensions
  const diameter = 100000 + rng() * 20000;  // 100-120k light-years
  const thickness = 1000 + rng() * 500;     // 1-1.5k light-years

  // Central black hole (Sagittarius A*-like)
  const centralBlackHole = {
    mass: 4e6 * (0.5 + rng()),  // 2-4 million solar masses
    accretionRate: rng() * 0.001,
    active: rng() < 0.1,  // 10% chance of quasar
  };

  // Generate sectors
  const sectorCount = 1000 + Math.floor(rng() * 1000);  // 1000-2000 sectors
  const sectors: SectorTier[] = [];

  for (let i = 0; i < sectorCount; i++) {
    // Distribute sectors in disk and halo
    const region = distributeSectorRegion(rng);
    const spiralArm = region === 'disk' ? distributeSpiralArm(spiralArms, rng) : undefined;

    const sector = generateSector({
      galacticCoords: generateSectorCoords(region, spiralArm, i, rng),
      seed: `${seed}_sector_${i}`,
    });

    sectors.push({
      ...sector,
      region,
      spiralArm,
    });
  }

  // Generate galactic civilizations (if galaxy is old enough)
  const galacticCivilizations = age > 5.0
    ? generateGalacticCivilizations(sectors, age, rng)
    : [];

  return {
    tier: 'galaxy',
    id: `galaxy_${seed}`,
    structure: {
      type,
      diameter,
      thickness,
      spiralArms,
      centralBlackHole,
      darkMatterMass: 1e12,  // ~1 trillion solar masses
    },
    sectors,
    galacticCivilizations,
    // ... other fields
  };
}

/**
 * Distribute sector into galactic regions
 */
function distributeSectorRegion(rng: () => number): 'core' | 'disk' | 'halo' {
  const roll = rng();

  if (roll < 0.05) return 'core';   // 5% in core
  if (roll < 0.90) return 'disk';   // 85% in disk
  return 'halo';                     // 10% in halo
}

/**
 * Generate galactic civilizations (Kardashev II-III)
 */
function generateGalacticCivilizations(
  sectors: SectorTier[],
  galaxyAge: number,
  rng: () => number
): GalacticCivilization[] {

  // Older galaxies have more advanced civilizations
  const civCount = Math.floor((galaxyAge - 5.0) * 2 + rng() * 5);

  const civilizations: GalacticCivilization[] = [];

  for (let i = 0; i < civCount; i++) {
    // Select controlled sectors (exponential distribution)
    const controlledSectorCount = Math.floor(
      Math.exp(rng() * 5)  // 1-148 sectors
    );

    const controlledSectors = selectRandomSectors(
      sectors,
      controlledSectorCount,
      rng
    );

    // Tech level increases with age
    const techLevel = Math.min(10, 5 + (galaxyAge - 5.0) + rng() * 3);

    // Kardashev level
    const kardashevLevel = 2.0 + (controlledSectorCount / 100);  // 2.0-3.5

    civilizations.push({
      id: `galactic_civ_${i}`,
      name: generateCivilizationName(rng),
      type: selectCivilizationType(techLevel, rng),
      controlledSectors: controlledSectors.map(s => s.id),
      population: calculateGalacticPopulation(controlledSectors),
      techLevel,
      kardashevLevel,
      energyOutput: calculateEnergyOutput(kardashevLevel),
      dysonSpheres: Math.floor(controlledSectorCount * 0.1),  // ~10% of systems
      megastructures: generateMegastructures(controlledSectors, techLevel, rng),
    });
  }

  return civilizations;
}
```

### Preservation Rules for Galaxy Tier

```typescript
export const SUMMARIZATION_RULES: Record<TierLevel, SummarizationRules> = {
  // ... existing tiers ...

  galaxy: {
    sum: [
      'totalPopulation',
      'totalEnergyOutput',
      'totalStars',
      'colonizedSystems',
    ],
    average: [
      'avgKardashevLevel',
      'avgTechLevel',
      'galacticStability',
    ],
    computed: [
      'economicOutput',
      'militaryPower',
      'culturalInfluence',
      'scientificProgress',
    ],
    preserved: [
      'galacticStructure',      // Spiral arms, black hole
      'sectors',                // All sector tiers
      'galacticCivilizations',  // Kardashev II-III civilizations
      'megastructures',         // Dyson spheres, ringworlds
      'wormholeNetwork',        // Galactic infrastructure
      'cosmicEvents',           // Major historical events
      'galacticGovernance',     // If unified
      'greatFilters',           // Civilizations that crossed/failed
    ],
    lost: [
      'sector_details',         // Individual systems (unless major)
      'minor_civilizations',    // Pre-spaceflight cultures
      'short_term_conflicts',   // Wars lasting <1000 years
      'individual_megastructures',  // Except galaxy-famous ones
    ],
  },
};
```

---

## Integration with Existing Systems

### UniversalAddress Extension

**File:** `packages/hierarchy-simulator/src/abstraction/types.ts`

```typescript
/**
 * Extended universal address for interstellar coordinates
 */
export interface UniversalAddress {
  // Existing fields (DO NOT MODIFY)
  gigasegment: number;      // 0-9999
  megasegment: number;      // 0-99
  subsection: number;       // 0-999
  region: number;           // 0-99
  zone: number;             // 0-999
  chunk: { x: number; y: number };  // 32×32 tiles
  tile: { x: number; y: number };   // 3m × 3m

  // NEW: Interstellar coordinates
  galaxy?: number;          // 0-99 (for multiverse with multiple galaxies)
  sector?: number;          // 0-9999 (sector within galaxy)
  system?: number;          // 0-999 (system within sector)
  planet?: number;          // 0-99 (planet within system)
}
```

### PlanetConfig Integration

**File:** `packages/hierarchy-simulator/src/abstraction/AbstractPlanet.ts`

```typescript
import type { PlanetConfig } from '@ai-village/world/planet';
import { AbstractTierBase } from './AbstractTierBase.js';

/**
 * Planet tier implementation
 * Integrates with existing PlanetConfig system
 */
export class AbstractPlanet extends AbstractTierBase implements PlanetTier {
  public readonly tier = 'planet' as const;
  public planetConfig: PlanetConfig;

  constructor(
    id: string,
    planetConfig: PlanetConfig,
    gigasegments: AbstractTier[]
  ) {
    super(id, `Planet: ${planetConfig.name}`, 'planet', gigasegments);

    this.planetConfig = planetConfig;

    // Aggregate planetary statistics from gigasegments
    this.planetaryStats = aggregatePlanetStats(planetConfig, gigasegments);
  }

  /**
   * Update planet statistics (differential equations)
   */
  protected updateAbstract(deltaTime: number): void {
    super.updateAbstract(deltaTime);

    // Planet-specific simulation
    this.simulateGeologicalProcesses(deltaTime);
    this.simulateClimateChange(deltaTime);
    this.simulateCivilizationDevelopment(deltaTime);
  }

  /**
   * Geological processes (volcanic activity, plate tectonics)
   */
  private simulateGeologicalProcesses(deltaTime: number): void {
    // For volcanic planets
    if (this.planetConfig.type === 'volcanic' || this.planetConfig.hasLavaFlows) {
      // Increase volcanic activity over time
      const activityRate = 0.001 * deltaTime;  // Slow geological time

      // Add new volcanic features (very rarely)
      if (Math.random() < activityRate) {
        this.namedFeatures.push({
          id: generateId(),
          name: generateVolcanoName(),
          type: 'volcano',
          location: generateRandomCoords(),
          namedAt: this.tick,
        });
      }
    }
  }

  /**
   * Climate change (from industrial development or cosmic events)
   */
  private simulateClimateChange(deltaTime: number): void {
    const industrialization = this.civilizationStats.industrialization;

    // Industrial civilizations affect climate
    if (industrialization > 5) {
      // Gradual temperature increase
      this.planetConfig.temperatureOffset += 0.0001 * industrialization * deltaTime;

      // Check for runaway greenhouse effect
      if (this.planetConfig.temperatureOffset > 2.0) {
        this.addEvent({
          type: 'natural_disaster',
          severity: 10,
          description: 'Runaway greenhouse effect - planet becoming uninhabitable',
        });
      }
    }
  }

  /**
   * Civilization development (aggregated from child tiers)
   */
  private simulateCivilizationDevelopment(deltaTime: number): void {
    // Update civilization stats from children
    this.civilizationStats.avgTechLevel = this.calculateAvgTechLevel();
    this.civilizationStats.urbanization = this.calculateUrbanization();
    this.civilizationStats.industrialization = this.calculateIndustrialization();

    // Check for planetary unification
    if (this.civilizationStats.nationCount === 1 && !this.civilizationStats.governmentType) {
      this.civilizationStats.governmentType = 'unified';
      this.addEvent({
        type: 'cultural_renaissance',
        severity: 8,
        description: 'Planet achieves unified government',
      });
    }
  }
}
```

### Persistence Integration

**File:** `packages/persistence/src/types.ts`

**Extend WorldSnapshot to include interstellar tiers:**

```typescript
export interface WorldSnapshot {
  /** Terrain data (compressed) */
  terrain: TerrainSnapshot | null;

  /** Zone configuration */
  zones: ZoneSnapshot[];

  // NEW: Interstellar tier snapshots
  planets?: PlanetSnapshot[];
  systems?: SystemSnapshot[];
  sectors?: SectorSnapshot[];
  galaxy?: GalaxySnapshot;
}

/**
 * Planet-tier snapshot (extends existing PlanetSnapshot from world package)
 */
export interface PlanetSnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/planet-tier/v1';

  /** Planet configuration */
  config: PlanetConfig;

  /** Planetary statistics */
  planetaryStats: {
    landArea: number;
    oceanArea: number;
    continentCount: number;
    climateZones: Record<string, number>;
    biomeDistribution: Record<string, number>;
    resourceAbundance: Record<string, number>;
  };

  /** Civilization statistics */
  civilizationStats: {
    nationCount: number;
    dominantCulture?: string;
    avgTechLevel: number;
    techLevelRange: [number, number];
    governmentType?: string;
    urbanization: number;
    industrialization: number;
  };

  /** Named features (PRESERVED) */
  namedFeatures: Array<{
    id: string;
    name: string;
    type: string;
    location: { lat: number; lon: number };
    namedBy?: string;
    namedAt?: number;
  }>;

  /** Major civilizations (PRESERVED) */
  majorCivilizations: Array<{
    id: string;
    name: string;
    population: number;
    capital: { lat: number; lon: number };
    techLevel: number;
  }>;

  /** Megastructures (PRESERVED) */
  megastructures: Array<{
    id: string;
    type: string;
    location: { lat: number; lon: number } | 'orbital';
    operational: boolean;
  }>;
}

export interface SystemSnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/system-tier/v1';

  id: string;
  star: {
    type: string;
    mass: number;
    luminosity: number;
    age: number;
  };
  planets: PlanetSnapshot[];
  asteroidBelts: Array<{
    id: string;
    innerRadius: number;
    outerRadius: number;
    composition: string;
  }>;
  orbitalInfrastructure: Array<{
    id: string;
    type: string;
    population: number;
  }>;
}

export interface SectorSnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/sector-tier/v1';

  id: string;
  spatial: {
    galacticCoords: { x: number; y: number; z: number };
    distanceFromCore: number;
    spiralArm?: string;
  };
  systems: SystemSnapshot[];
  politicalEntities: Array<{
    id: string;
    name: string;
    type: string;
    controlledSystems: string[];
    population: number;
    techLevel: number;
  }>;
}

export interface GalaxySnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/galaxy-tier/v1';

  id: string;
  structure: {
    type: 'spiral' | 'elliptical' | 'irregular';
    diameter: number;
    spiralArms?: number;
  };
  sectors: SectorSnapshot[];
  galacticCivilizations: Array<{
    id: string;
    name: string;
    kardashevLevel: number;
    controlledSectors: string[];
    dysonSpheres: number;
  }>;
}
```

---

## Renormalization Integration

### Zoom In/Out for New Tiers

**File:** `packages/hierarchy-simulator/src/renormalization/RenormalizationEngine.ts`

```typescript
/**
 * Extend RenormalizationEngine for interstellar tiers
 */
export class RenormalizationEngine {

  /**
   * Zoom out: Planet → System
   */
  private summarizePlanetToSystem(planet: PlanetTier): TierSummary {
    return {
      id: planet.id,
      tier: 'planet',

      // Aggregate statistics
      population: planet.population.total,

      // Preserve critical data
      preserved: {
        planetConfig: planet.planetConfig,  // ALWAYS preserve
        namedFeatures: planet.namedFeatures,
        majorCivilizations: planet.majorCivilizations,
        megastructures: planet.megastructures,
        planetaryEvents: planet.planetaryEvents.slice(-10),  // Last 10 events
      },

      // Derived values
      avgTechLevel: planet.civilizationStats.avgTechLevel,
      stability: planet.stability.overall,
      economicOutput: this.calculateEconomicOutput(planet),
    };
  }

  /**
   * Zoom in: System → Planet
   */
  private instantiatePlanetFromSummary(
    summary: TierSummary,
    planetConfig: PlanetConfig
  ): InstantiationConstraints {

    return {
      tier: 'planet',

      // Target statistics
      targetPopulation: summary.population,
      avgTechLevel: summary.avgTechLevel,
      stability: summary.stability,

      // Must preserve
      planetConfig: summary.preserved.planetConfig,
      namedFeatures: summary.preserved.namedFeatures,
      majorCivilizations: summary.preserved.majorCivilizations,
      megastructures: summary.preserved.megastructures,

      // Regenerate from these constraints
      constraints: {
        // Generate gigasegments that sum to target population
        populationDistribution: this.generatePopulationDistribution(
          summary.population,
          100  // 100 gigasegments
        ),

        // Preserve named civilization locations
        civilizationLocations: summary.preserved.majorCivilizations.map(
          civ => civ.capital
        ),

        // Terrain matches PlanetConfig
        terrainSeed: planetConfig.seed,
      },
    };
  }

  /**
   * Zoom out: System → Sector
   */
  private summarizeSystemToSector(system: SystemTier): TierSummary {
    return {
      id: system.id,
      tier: 'system',

      // Aggregate from planets
      population: system.systemStats.totalPopulation,

      // Preserve critical data
      preserved: {
        starProperties: system.star,
        planets: system.planets.map(p => this.summarizePlanet(p)),
        majorStations: system.orbitalInfrastructure.filter(s => s.population > 1000),
        asteroidBelts: system.asteroidBelts,
        dysonSwarm: system.megastructures.find(m => m.type === 'dyson_swarm'),
      },

      // System-level stats
      maxTechLevel: system.systemStats.maxTechLevel,
      spacefaringCivCount: system.systemStats.spacefaringCivCount,
      ftlCapable: system.systemStats.ftlCapable,
    };
  }

  /**
   * Zoom out: Sector → Galaxy
   */
  private summarizeSectorToGalaxy(sector: SectorTier): TierSummary {
    return {
      id: sector.id,
      tier: 'sector',

      // Aggregate from systems
      population: sector.sectorStats.totalPopulation,

      // Preserve critical data
      preserved: {
        spatialCoords: sector.spatial.galacticCoords,
        politicalEntities: sector.politicalEntities,
        wormholeGates: sector.infrastructure.wormholeGates,
        majorSystems: this.selectMajorSystems(sector.systems, 10),  // Top 10 systems
        activeWars: sector.sectorEvents.filter(e => e.type === 'sector_war'),
      },

      // Sector-level stats
      maxTechLevel: sector.sectorStats.maxTechLevel,
      politicalStability: sector.sectorStats.politicalStability,
      economicIntegration: sector.sectorStats.economicIntegration,
    };
  }
}
```

---

## Statistical Simulation for Interstellar Tiers

### Differential Equations

**File:** `packages/hierarchy-simulator/src/renormalization/StatisticalSimulation.ts` (NEW)

```typescript
/**
 * Statistical simulation for interstellar tiers
 * Uses differential equations instead of ECS
 */

/**
 * Planet-tier simulation (1 tick = 10 years)
 */
export function simulatePlanetTier(
  planet: PlanetTier,
  deltaTicks: number
): void {

  const deltaYears = deltaTicks * 10;  // 10 years per tick

  // Population growth (logistic)
  const P = planet.population.total;
  const K = planet.population.carryingCapacity;
  const r = planet.civilizationStats.avgTechLevel * 0.01;  // Tech increases growth

  const dP = r * P * (1 - P / K) * deltaYears;
  planet.population.total += dP;

  // Tech advancement (depends on universities, scientists)
  const techGrowth = (
    planet.universities * 0.001 +
    planet.scientistPool.get(8) ?? 0 * 0.01
  ) * deltaYears;

  planet.civilizationStats.avgTechLevel += techGrowth;

  // Industrialization (depends on tech level)
  if (planet.civilizationStats.avgTechLevel > 5) {
    planet.civilizationStats.industrialization += 0.1 * deltaYears;
  }

  // Climate change (from industrialization)
  if (planet.civilizationStats.industrialization > 5) {
    const tempIncrease = 0.0001 * planet.civilizationStats.industrialization * deltaYears;
    planet.planetConfig.temperatureOffset += tempIncrease;
  }
}

/**
 * System-tier simulation (1 tick = 100 years)
 */
export function simulateSystemTier(
  system: SystemTier,
  deltaTicks: number
): void {

  const deltaYears = deltaTicks * 100;  // 100 years per tick

  // Aggregate planet populations
  let totalPopulation = 0;
  let maxTechLevel = 0;

  for (const planet of system.planets) {
    // Simulate each planet (condensed)
    simulatePlanetTier(planet, deltaTicks * 10);  // 10x faster at planet tier

    totalPopulation += planet.population.total;
    maxTechLevel = Math.max(maxTechLevel, planet.civilizationStats.avgTechLevel);
  }

  system.systemStats.totalPopulation = totalPopulation;
  system.systemStats.maxTechLevel = maxTechLevel;

  // Interplanetary colonization (if tech level > 7)
  if (maxTechLevel > 7) {
    const colonizationRate = (maxTechLevel - 7) * 0.01;

    // Colonize uninhabited planets
    for (const planet of system.planets) {
      if (planet.population.total === 0 && Math.random() < colonizationRate) {
        // Seed new colony
        planet.population.total = 1000;
        planet.civilizationStats.avgTechLevel = maxTechLevel - 1;

        system.systemEvents.push({
          tick: system.tick,
          type: 'first_contact',  // Colony established
          location: planet.id,
          description: `Colony established on ${planet.planetConfig.name}`,
        });
      }
    }
  }

  // Dyson swarm construction (if tech level > 9)
  if (maxTechLevel > 9 && totalPopulation > 10_000_000_000) {
    const dysonProgress = 0.001 * deltaYears;  // 0.1% per 100 years

    const dyson = system.megastructures.find(m => m.type === 'dyson_swarm');
    if (dyson) {
      dyson.constructionProgress += dysonProgress;

      if (dyson.constructionProgress >= 1.0 && !dyson.operational) {
        dyson.operational = true;
        system.systemEvents.push({
          tick: system.tick,
          type: 'dyson_swarm_begin',
          description: 'Dyson swarm operational - system energy output increased 1000x',
        });
      }
    }
  }
}

/**
 * Sector-tier simulation (1 tick = 1,000 years)
 */
export function simulateSectorTier(
  sector: SectorTier,
  deltaTicks: number
): void {

  const deltaYears = deltaTicks * 1000;  // 1000 years per tick

  // Aggregate system statistics
  let totalPopulation = 0;
  let maxTechLevel = 0;
  let spacefaringCount = 0;

  for (const system of sector.systems) {
    // Simulate each system (condensed)
    simulateSystemTier(system, deltaTicks * 10);

    totalPopulation += system.systemStats.totalPopulation;
    maxTechLevel = Math.max(maxTechLevel, system.systemStats.maxTechLevel);

    if (system.systemStats.spacefaringCivCount > 0) {
      spacefaringCount++;
    }
  }

  sector.sectorStats.totalPopulation = totalPopulation;
  sector.sectorStats.maxTechLevel = maxTechLevel;
  sector.sectorStats.spacefaringCivCount = spacefaringCount;

  // Interstellar colonization (wormhole gates)
  if (maxTechLevel > 8) {
    const wormholeRate = (maxTechLevel - 8) * 0.001;

    if (Math.random() < wormholeRate * deltaYears) {
      // Create new wormhole gate
      const source = selectRandomSystem(sector.systems);
      const dest = selectRandomSystem(sector.systems);

      sector.infrastructure.wormholeGates.push({
        id: generateId(),
        sourceSystem: source.id,
        destinationSystem: dest.id,
        distance: calculateDistance(source, dest),
        travelTime: 7,  // 1 week through wormhole
        stability: 0.8,
        operational: true,
      });
    }
  }

  // Empire formation (political consolidation)
  if (spacefaringCount > 10 && sector.politicalEntities.length < 5) {
    // Systems consolidate into empires
    const newEmpire = formEmpire(sector.systems, maxTechLevel);
    sector.politicalEntities.push(newEmpire);

    sector.sectorEvents.push({
      tick: sector.tick,
      type: 'empire_rise',
      participants: [newEmpire.id],
      description: `${newEmpire.name} formed from ${newEmpire.controlledSystems.length} systems`,
    });
  }
}

/**
 * Galaxy-tier simulation (1 tick = 10,000 years)
 */
export function simulateGalaxyTier(
  galaxy: GalaxyTier,
  deltaTicks: number
): void {

  const deltaYears = deltaTicks * 10000;  // 10,000 years per tick

  // Aggregate sector statistics
  let totalPopulation = 0;
  let maxTechLevel = 0;
  let totalKardashevLevel = 0;
  let civCount = 0;

  for (const sector of galaxy.sectors) {
    // Simulate each sector (condensed)
    simulateSectorTier(sector, deltaTicks * 10);

    totalPopulation += sector.sectorStats.totalPopulation;
    maxTechLevel = Math.max(maxTechLevel, sector.sectorStats.maxTechLevel);
  }

  // Update galactic civilizations
  for (const civ of galaxy.galacticCivilizations) {
    // Civilization growth
    civ.population *= 1 + 0.01 * deltaYears;  // 1% growth per 10k years

    // Tech advancement
    civ.techLevel += 0.001 * deltaYears;  // Slow at cosmic scales

    // Kardashev level increases with controlled sectors
    civ.kardashevLevel = 2.0 + (civ.controlledSectors.length / 100);

    totalKardashevLevel += civ.kardashevLevel;
    civCount++;
  }

  galaxy.galacticStats.totalPopulation = totalPopulation;
  galaxy.galacticStats.maxTechLevel = maxTechLevel;
  galaxy.galacticStats.avgKardashevLevel = civCount > 0 ? totalKardashevLevel / civCount : 0;

  // Singularity events (if max tech level > 9.5)
  if (maxTechLevel > 9.5 && Math.random() < 0.01 * deltaTicks) {
    galaxy.cosmicEvents.push({
      tick: galaxy.tick,
      type: 'singularity_cascade',
      impact: 'galactic',
      description: 'Technological singularity - civilization transcends physical constraints',
    });
  }
}
```

---

## Performance Considerations

### Memory Budget

**Per-tier memory estimates:**

| Tier | Active Instances | Memory/Instance | Total Memory |
|------|-----------------|-----------------|--------------|
| Tile | 0 (deferred) | 1 KB | 0 |
| Chunk | 1-10 | 100 KB | 100 KB - 1 MB |
| Zone | 10-100 | 50 KB | 500 KB - 5 MB |
| Region | 10-100 | 30 KB | 300 KB - 3 MB |
| Subsection | 10-100 | 20 KB | 200 KB - 2 MB |
| Megasegment | 5-50 | 15 KB | 75 KB - 750 KB |
| Gigasegment | 5-50 | 10 KB | 50 KB - 500 KB |
| **Planet** | **1-10** | **20 KB** | **20 KB - 200 KB** |
| **System** | **1-5** | **50 KB** | **50 KB - 250 KB** |
| **Sector** | **1** | **100 KB** | **100 KB** |
| **Galaxy** | **1** | **200 KB** | **200 KB** |

**Total:** ~2-15 MB for full hierarchy (depending on zoom level)

### Simulation Cost

**Statistical simulation is O(1) per tier:**

| Tier | Ticks/Second | Real-Time/Tick | Cost/Tick |
|------|-------------|----------------|-----------|
| Planet | 20 | 200 years/sec | 0.1 ms |
| System | 20 | 2,000 years/sec | 0.5 ms |
| Sector | 20 | 20,000 years/sec | 2 ms |
| Galaxy | 20 | 200,000 years/sec | 5 ms |

**Total overhead:** ~8 ms/frame for full interstellar simulation (< 50% of 16ms budget @ 60 FPS)

### Optimization Strategies

**1. Lazy Loading:**
- Don't generate sector/galaxy tiers until player zooms out
- Generate on-demand from seed

**2. Tier Culling:**
- Only simulate tiers player is viewing
- Background tiers use cached summaries

**3. Event Batching:**
- Process cosmic events once per second instead of every tick
- Batch statistical updates

**4. Compression:**
- Compress historical events (keep last 10)
- Compress distant sector data

---

## Open Questions

1. **Multi-Galaxy Support:** Should we support multiple galaxies (Virgo Cluster)? Or is one galaxy sufficient?

2. **Intergalactic Travel:** At what tech level can civilizations travel between galaxies? Requires ~2 million light-years (Andromeda).

3. **Dark Energy/Expansion:** Should cosmic expansion affect sectors over billions of years?

4. **Exotic Physics:** How do wormhole gates work at galaxy tier? Are they instant or still light-speed limited?

5. **Civilization Extinction:** What's the probability of extinction vs. transcendence at each tier?

---

## Implementation Roadmap

### Phase 1: Core Extensions (Week 1)
- [ ] Extend `TierLevel` type
- [ ] Add planet/system/sector/galaxy to `TIER_SCALES` and `TIME_SCALE`
- [ ] Create `AbstractPlanet`, `AbstractSystem`, `AbstractSector`, `AbstractGalaxy` classes
- [ ] Extend `SUMMARIZATION_RULES`

### Phase 2: Integration (Week 2)
- [ ] Integrate with `PlanetConfig`
- [ ] Extend `UniversalAddress` for interstellar coordinates
- [ ] Update `RenormalizationEngine` for new tiers
- [ ] Add persistence snapshots for new tiers

### Phase 3: Statistical Simulation (Week 3)
- [ ] Implement planet-tier differential equations
- [ ] Implement system-tier simulation
- [ ] Implement sector-tier simulation
- [ ] Implement galaxy-tier simulation

### Phase 4: Testing & Polish (Week 4)
- [ ] Test zoom in/out across all tiers
- [ ] Verify preservation rules
- [ ] Performance profiling
- [ ] Documentation

---

**Document Version:** 1.0.0
**Created:** 2026-01-17
**Status:** Design Document - Ready for Review
