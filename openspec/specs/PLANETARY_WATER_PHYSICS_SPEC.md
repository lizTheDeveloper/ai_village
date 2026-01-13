# Planetary-Scale Water Physics Specification

> **Status:** Draft
> **Created:** 2026-01-12
> **Inspired By:** Dwarf Fortress (pressure/depth), Subnautica (ocean biomes), No Man's Sky (planetary scale)
> **Performance Target:** 20 TPS with millions of water tiles across 6,371,000-tile radius planets

---

## Executive Summary

This spec defines a **planetary-scale water physics system** for "Multiverse: The End of Eternity" that handles:

- **Vertical Ocean Biomes**: 5 distinct zones from sunlit surface to hadal trenches (0 to -6,000+ z-levels)
- **Pressure System**: Depth-based pressure affecting agents, buildings, and biological processes
- **Planetary-Scale Flow**: Ocean currents, convection, tides across millions of tiles
- **Underwater Life**: Depth-adapted creatures, bioluminescence, chemosynthetic ecosystems
- **Higher-Dimensional Fluids**: Water flow in 4D-6D spaces with hyperdimensional pressure
- **Performance at Scale**: Chunk-based LOD, spatial culling, batched updates for millions of tiles

**Key Design Principles:**
1. **Dwarf Fortress Pressure Model**: Depth 0-7 scale extended to thousands of z-levels
2. **LOD-Based Simulation**: Planetary scale = far ocean (no simulation) → regional (currents) → local (detailed flow)
3. **Biome-Driven Gameplay**: Each depth zone has unique life, resources, challenges
4. **Conservation of Matter**: Water volume conserved even across planet
5. **Hyperdimensional Extension**: 4D+ water flows along w, v, u axes with cross-dimensional pressure

---

## Current State Analysis

### What Exists (as of 2026-01-12)

✅ **Planetary Scale Support** (`HorizonCalculator.ts`):
- Planet radius: 6,371,000 tiles (Earth), 1,737,000 (Moon), 12,000,000 (Super Earth)
- Curvature-based visibility calculation
- 1 tile = 1 meter scale

✅ **3D Positioning** (`PositionComponent.ts`):
- Z-levels: -15 (DeepUnderground) to +50 (Atmosphere)
- Current vertical range: only 65 levels
- **Limitation:** Need expansion to -6,000+ for ocean trenches

✅ **6D Spatial Support** (`UniversePhysicsConfig.ts`):
- Up to 6 spatial dimensions (x, y, z, w, v, u)
- Position component has optional w, v, u fields
- Different universes can have different dimensional configs

✅ **Fluid System Foundation** (`Tile.ts`):
- `FluidLayer` interface with depth (0-7), pressure, temperature, flow
- Water terrain type ('water')
- No depth implementation yet

✅ **Swimming Locomotion** (`Locomotion.ts`):
- 'swimming' locomotion method defined
- 'piscivore' and 'filter_feeder' diets exist
- No swimming mechanics implemented

### What's Missing

❌ **Ocean Depth System**: Current z-levels max at -15 (need -6,000+)
❌ **Vertical Biomes**: No epipelagic/mesopelagic/bathypelagic zones
❌ **Pressure Physics**: No depth-based pressure calculations
❌ **Underwater Life**: No depth-adapted creatures or plants
❌ **Planetary Flow**: No ocean currents, tides, or convection
❌ **Light Penetration**: No exponential decay with depth
❌ **Hyperdimensional Water**: No 4D-6D fluid mechanics

---

## Design Overview

### Architecture Diagram

```
TerrainGenerator                   OceanBiomeSystem
      ↓                                  ↓
  Generates ocean tiles           Determines biome zone
  z: 0 to -6000                   based on z-level
  depth: 1-7                      (epipelagic, mesopelagic, etc.)
      ↓                                  ↓
  Tile.fluid = {                  Updates tile properties:
    type: 'water',                  - light_level (exponential decay)
    depth: 5,                       - temperature (thermocline)
    pressure: 3500,  ← NEW          - pressure (depth * gravity)
    temperature: 4,  ← cold               ↓
    biome: 'abyssal' ← NEW        UnderwaterLifeSystem
  }                                      ↓
      ↓                            Spawns depth-adapted creatures
PlanetaryFlowSystem                Bioluminescent fish (deep)
      ↓                            Kelp forests (shallow)
  Level-of-Detail simulation:      Chemosynthetic bacteria (vents)
    Far (1000+ chunks): No sim          ↓
    Regional (50-1000): Currents   AgentSwimmingSystem
    Local (0-50): Detailed flow         ↓
      ↓                            Depth-based mechanics:
  Updates Tile.fluid:                depth 0-200: Normal swim
    - flowDirection                  depth 200-1000: Slow, need light
    - current vectors                depth 1000-4000: Pressure damage
    - thermal convection             depth 4000+: Extreme pressure (death)
      ↓                                  ↓
HyperdimensionalFlowSystem        PressureSystem
      ↓                                  ↓
  4D-6D water flow:              Calculates pressure effects:
    - w-dimension currents           - Agent health damage
    - Cross-dimensional pressure     - Building integrity stress
    - Hypersphere wave propagation   - Swim speed reduction
```

### System Priorities

```
Priority 3:   TimeSystem
Priority 5:   StateMutatorSystem (batched depth/pressure updates)
Priority 7:   OceanBiomeSystem (determine biome zones)
Priority 8:   PlanetaryFlowSystem (multi-LOD flow simulation)
Priority 10:  PressureSystem (calculate pressure effects)
Priority 12:  LightPenetrationSystem (exponential decay)
Priority 14:  UnderwaterLifeSystem (spawn depth-adapted creatures)
Priority 16:  HyperdimensionalFlowSystem (4D-6D water)
Priority 18:  AgentSwimmingSystem (swimming/drowning/pressure damage)
Priority 20:  MovementSystem (applies movement penalties)
```

---

## Phase 1: Vertical Ocean Biomes & Z-Level Expansion

**Goal:** Extend z-levels to -6,000+ and define 5 ocean biome zones.

### 1.1 Z-Level Classification Extension

**File:** `packages/core/src/components/PositionComponent.ts`

**Current Code (lines 11-22):**
```typescript
export enum ZLevel {
  DeepUnderground = 'deep_underground',  // z < -10
  Underground = 'underground',           // z -10 to -1
  Surface = 'surface',                   // z = 0
  AboveGround = 'above_ground',          // z 1 to 10
  HighAltitude = 'high_altitude',        // z > 10
}
```

**New Code:**
```typescript
export enum ZLevel {
  // === OCEAN ZONES (Vertical Water Biomes) ===
  /** Hadal Zone: Ocean trenches (z < -6000) - crushing pressure, chemosynthetic life */
  HadalZone = 'hadal_zone',
  /** Abyssal Zone: Deep ocean floor (z -6000 to -4000) - near-freezing, extreme pressure */
  AbyssalZone = 'abyssal_zone',
  /** Bathypelagic Zone: Midnight zone (z -4000 to -1000) - no sunlight, bioluminescence */
  BathypelagicZone = 'bathypelagic_zone',
  /** Mesopelagic Zone: Twilight zone (z -1000 to -200) - dim light, thermocline */
  MesopelagicZone = 'mesopelagic_zone',
  /** Epipelagic Zone: Sunlight zone (z -200 to 0) - photosynthesis, most life */
  EpipelagicZone = 'epipelagic_zone',

  // === TERRESTRIAL ZONES ===
  /** Deep underground caves/magma (z -200 to -10) */
  DeepUnderground = 'deep_underground',
  /** Underground caves (z -10 to -1) */
  Underground = 'underground',
  /** Surface level (z = 0) */
  Surface = 'surface',
  /** Above ground (z 1 to 10) */
  AboveGround = 'above_ground',
  /** High altitude/flying (z 10 to 50) */
  HighAltitude = 'high_altitude',
  /** Atmospheric/space (z > 50) */
  Atmosphere = 'atmosphere',
}

/**
 * Get ocean biome zone for underwater z-level.
 * Returns undefined if not underwater.
 */
export function getOceanBiomeZone(z: number): ZLevel | undefined {
  if (z >= 0) return undefined; // Not underwater
  if (z < -6000) return ZLevel.HadalZone;
  if (z < -4000) return ZLevel.AbyssalZone;
  if (z < -1000) return ZLevel.BathypelagicZone;
  if (z < -200) return ZLevel.MesopelagicZone;
  return ZLevel.EpipelagicZone;
}

/**
 * Get updated Z-level classification (includes ocean zones).
 */
export function getZLevel(z: number): ZLevel {
  // Check ocean zones first
  if (z < 0) {
    const oceanZone = getOceanBiomeZone(z);
    if (oceanZone) return oceanZone;
    // Terrestrial underground
    if (z < -10) return ZLevel.DeepUnderground;
    return ZLevel.Underground;
  }

  // Above surface
  if (z === 0) return ZLevel.Surface;
  if (z <= 10) return ZLevel.AboveGround;
  if (z <= 50) return ZLevel.HighAltitude;
  return ZLevel.Atmosphere;
}
```

### 1.2 Ocean Biome Properties

**File:** `packages/world/src/ocean/OceanBiomes.ts` (new)

```typescript
/**
 * Ocean Biome Zone Properties
 *
 * Defines physical and biological characteristics of vertical ocean zones.
 * Based on real oceanography with game-friendly scaling.
 */

export interface OceanBiomeZone {
  /** Zone name */
  name: string;
  /** Z-level range [min, max] */
  depthRange: [number, number];
  /** Light level (0-100, 0 = pitch black, 100 = full sunlight) */
  lightLevel: number;
  /** Temperature in Celsius */
  temperature: number;
  /** Pressure in atmospheres (1 atm = surface, 1000+ atm = extreme) */
  pressureAtm: number;
  /** Can photosynthesis occur? */
  photosynthesis: boolean;
  /** Bioluminescence common? */
  bioluminescence: boolean;
  /** Primary energy source */
  energySource: 'sunlight' | 'chemosynthesis' | 'detritus' | 'hydrothermal';
  /** Typical life density (0.0 = barren, 1.0 = teeming) */
  lifeDensity: number;
  /** Description */
  description: string;
}

export const OCEAN_BIOME_ZONES: Record<string, OceanBiomeZone> = {
  epipelagic: {
    name: 'Epipelagic Zone',
    depthRange: [0, -200],
    lightLevel: 100,
    temperature: 20, // 10-25°C depending on latitude
    pressureAtm: 1,  // 1-20 atm
    photosynthesis: true,
    bioluminescence: false,
    energySource: 'sunlight',
    lifeDensity: 0.9,
    description: 'Sunlit surface waters. Photosynthesis drives ecosystem. Most marine life here. Kelp forests, coral reefs, fish schools.',
  },

  mesopelagic: {
    name: 'Mesopelagic Zone',
    depthRange: [-200, -1000],
    lightLevel: 10,  // Twilight zone
    temperature: 10, // 5-15°C
    pressureAtm: 100, // 20-100 atm
    photosynthesis: false,
    bioluminescence: true,
    energySource: 'detritus', // "Marine snow" falling from above
    lifeDensity: 0.5,
    description: 'Twilight zone. Dim blue light fades to black. Bioluminescence begins. Predators with large eyes hunt in gloom.',
  },

  bathypelagic: {
    name: 'Bathypelagic Zone',
    depthRange: [-1000, -4000],
    lightLevel: 0,   // Midnight zone
    temperature: 4,  // Near-freezing
    pressureAtm: 400, // 100-400 atm
    photosynthesis: false,
    bioluminescence: true,
    energySource: 'detritus',
    lifeDensity: 0.2,
    description: 'Midnight zone. Pitch black. Extreme pressure. Bioluminescent creatures flash to hunt. Alien-looking fish with huge mouths.',
  },

  abyssal: {
    name: 'Abyssal Zone',
    depthRange: [-4000, -6000],
    lightLevel: 0,
    temperature: 2,  // 0-3°C
    pressureAtm: 600, // 400-600 atm
    photosynthesis: false,
    bioluminescence: true,
    energySource: 'detritus',
    lifeDensity: 0.1,
    description: 'Abyssal plain. Near-freezing. Crushing pressure. Sparse life. Slow-moving scavengers on seafloor. Occasional whale falls (feasts).',
  },

  hadal: {
    name: 'Hadal Zone',
    depthRange: [-6000, -11000], // Mariana Trench depth
    lightLevel: 0,
    temperature: 1,  // 1-4°C (can be higher near vents)
    pressureAtm: 1100, // 600-1100 atm
    photosynthesis: false,
    bioluminescence: true,
    energySource: 'hydrothermal', // Chemosynthetic bacteria at vents
    lifeDensity: 0.15, // Higher than abyssal due to vents
    description: 'Ocean trenches. Maximum depth. Pressure would crush most life. Hydrothermal vents support chemosynthetic ecosystems. Alien life.',
  },
};

/**
 * Get biome zone for given z-level.
 */
export function getBiomeZoneForDepth(z: number): OceanBiomeZone | undefined {
  for (const zone of Object.values(OCEAN_BIOME_ZONES)) {
    const [min, max] = zone.depthRange;
    if (z >= min && z <= max) {
      return zone;
    }
  }
  return undefined;
}

/**
 * Calculate light level at depth using exponential decay.
 *
 * Light penetration formula: L(z) = L₀ * e^(-k * z)
 * Where k = light extinction coefficient (~0.02 for clear ocean water)
 */
export function calculateLightLevel(z: number): number {
  if (z >= 0) return 100; // Full sunlight at surface

  const EXTINCTION_COEFFICIENT = 0.02; // Beer-Lambert law constant
  const lightLevel = 100 * Math.exp(EXTINCTION_COEFFICIENT * z);

  return Math.max(0, Math.min(100, lightLevel));
  // Result:
  //   z = 0:    100% light
  //   z = -50:  ~37% light
  //   z = -100: ~14% light
  //   z = -200: ~2% light (twilight zone begins)
  //   z = -300: ~0.2% light (too dark for photosynthesis)
}

/**
 * Calculate pressure in atmospheres at depth.
 *
 * Pressure formula: P(z) = 1 atm + (ρ * g * |z|) / 101325 Pa
 * Where ρ = 1025 kg/m³ (seawater density), g = 9.8 m/s²
 *
 * Simplified: P(z) ≈ 1 + |z| / 10  (1 atm per 10 meters depth)
 */
export function calculatePressure(z: number, gravity: number = 9.8): number {
  if (z >= 0) return 1.0; // 1 atmosphere at surface

  const SEAWATER_DENSITY = 1025; // kg/m³
  const PA_PER_ATM = 101325;

  const depth = Math.abs(z);
  const pressurePa = SEAWATER_DENSITY * gravity * depth;
  const pressureAtm = 1.0 + (pressurePa / PA_PER_ATM);

  return pressureAtm;
  // Result:
  //   z = 0:     1 atm
  //   z = -10:   2 atm
  //   z = -100:  11 atm
  //   z = -1000: 101 atm
  //   z = -6000: 601 atm (abyssal zone)
  //   z = -11000: 1101 atm (Mariana Trench)
}

/**
 * Calculate temperature at depth using thermocline model.
 *
 * Ocean temperature profile:
 * - Surface (0 to -50m): 20°C (varies by latitude/season)
 * - Thermocline (-50 to -200m): Rapid drop to 10°C
 * - Deep ocean (-200+): Gradual cooling to 2°C
 */
export function calculateTemperature(z: number, surfaceTemp: number = 20): number {
  if (z >= 0) return surfaceTemp; // Surface temperature

  const depth = Math.abs(z);

  if (depth <= 50) {
    // Surface mixed layer - constant temperature
    return surfaceTemp;
  } else if (depth <= 200) {
    // Thermocline - rapid temperature drop
    const thermoclineProgress = (depth - 50) / 150; // 0 to 1
    return surfaceTemp - (thermoclineProgress * 10); // Drop 10°C
  } else {
    // Deep ocean - gradual cooling
    const deepProgress = Math.min(1, (depth - 200) / 5800); // 0 to 1 (down to -6000m)
    return 10 - (deepProgress * 8); // Drop from 10°C to 2°C
  }
  // Result:
  //   z = 0:     20°C (warm surface)
  //   z = -50:   20°C (mixed layer bottom)
  //   z = -125:  15°C (thermocline middle)
  //   z = -200:  10°C (thermocline bottom)
  //   z = -1000: 8°C (deep ocean)
  //   z = -6000: 2°C (abyssal cold)
}
```

### 1.3 Terrain Generation Changes

**File:** `packages/world/src/terrain/TerrainGenerator.ts`

**Add ocean depth generation:**

```typescript
import { OCEAN_BIOME_ZONES, calculateLightLevel, calculatePressure, calculateTemperature } from '../ocean/OceanBiomes.js';

/**
 * Generate ocean tile with depth-based biome properties.
 */
private generateOceanTile(worldX: number, worldY: number, elevation: number): Tile {
  // Use elevation and additional noise to determine ocean depth
  const depthNoise = this.elevationNoise.octaveNoise(
    worldX * 0.0005, // Large-scale ocean floor features
    worldY * 0.0005,
    4,
    0.6
  );

  // Map elevation and noise to z-level (ocean depth)
  // elevation range: -1.0 (deep) to -0.3 (shallow)
  const normalizedElevation = (elevation + 1.0) / 0.7; // 0 (deepest) to 1 (shallowest)
  const depthVariation = depthNoise * 0.3; // Add noise for ocean floor variation

  // Calculate z-level (negative = underwater)
  // Shallow ocean: -10 to -200 (epipelagic)
  // Mid ocean: -200 to -1000 (mesopelagic)
  // Deep ocean: -1000 to -4000 (bathypelagic)
  // Abyss: -4000 to -6000 (abyssal)
  // Trenches: -6000 to -11000 (hadal)

  const maxDepth = -6000; // Maximum ocean depth
  const minDepth = -10;   // Shallowest ocean

  const z = Math.floor(
    minDepth + (1 - normalizedElevation - depthVariation) * (Math.abs(maxDepth - minDepth))
  );

  // Clamp to valid range
  const oceanDepth = Math.max(maxDepth, Math.min(minDepth, z));

  // Calculate fluid depth (0-7 scale for surface rendering)
  // Maps ocean depth to surface water depth for rendering
  const surfaceDepth = 7; // Ocean tiles always have max surface depth

  // Calculate biome properties
  const pressure = calculatePressure(oceanDepth);
  const temperature = calculateTemperature(oceanDepth);
  const lightLevel = calculateLightLevel(oceanDepth);

  // Determine biome zone
  const biomeZone = getBiomeZoneForDepth(oceanDepth);

  return {
    terrain: 'water',
    elevation: oceanDepth, // Use z-level as elevation for ocean tiles
    moisture: 100, // Fully saturated
    fertility: 0,  // No farming in ocean
    biome: 'ocean',

    // Fluid layer with depth-based properties
    fluid: {
      type: 'water',
      depth: surfaceDepth, // Surface rendering depth
      pressure: Math.floor(pressure), // Convert atm to 0-7 scale later
      temperature: temperature,
      stagnant: true, // Will be updated by flow system
      lastUpdate: 0,

      // NEW: Ocean-specific properties
      oceanDepth: oceanDepth, // Actual z-level depth
      biomeZone: biomeZone?.name,
      lightLevel: lightLevel,
    },

    // Standard tile properties
    tilled: false,
    plantability: 0,
    nutrients: { nitrogen: 0, phosphorus: 0, potassium: 0 },
    fertilized: false,
    fertilizerDuration: 0,
    lastWatered: 0,
    lastTilled: 0,
    composted: false,
    plantId: null,
  };
}
```

### 1.4 Acceptance Criteria

- [ ] Z-levels extend to -11,000 (Mariana Trench depth)
- [ ] Ocean tiles have `oceanDepth` field (z-level)
- [ ] 5 ocean biome zones defined (epipelagic → hadal)
- [ ] Light level calculated with exponential decay (100% → 0% by -300m)
- [ ] Pressure calculated correctly (1 atm/10m depth)
- [ ] Temperature follows thermocline model (20°C → 2°C)
- [ ] `npm test` passes
- [ ] No performance regression (still 20 TPS)

---

## Phase 2: Pressure System

**Goal:** Implement depth-based pressure that affects agents, buildings, and creatures.

### 2.1 PressureSystem

**File:** `packages/core/src/systems/PressureSystem.ts` (new)

```typescript
import type { System, World, Entity } from '../ecs/System.js';
import type { ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { calculatePressure } from '@ai-village/world';

/**
 * PressureSystem - Handles depth-based pressure effects
 *
 * Pressure affects:
 * - Agent health (damage above safe depth)
 * - Swimming speed (water density increases with pressure)
 * - Building integrity (structures require pressure-resistant materials)
 * - Plant growth (different species tolerate different pressures)
 *
 * Pressure zones:
 * - Safe (0-200m): No pressure effects
 * - Moderate (200-1000m): Slow pressure damage without protection
 * - High (1000-4000m): Rapid damage, requires pressure suit
 * - Extreme (4000+m): Instant death without specialized equipment
 */
export class PressureSystem implements System {
  public readonly id = 'pressure';
  public readonly priority = 10;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Position,
    CT.Health,
  ];

  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 20; // Every second (20 TPS)

  update(world: World, entities: ReadonlyArray<Entity>): void {
    const currentTick = world.tick;

    // Throttle to once per second
    if (currentTick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number) => { fluid?: { oceanDepth?: number } } | undefined;
    };

    if (!worldWithTiles.getTileAt) return;

    for (const entity of entities) {
      const position = entity.getComponent(CT.Position);
      const health = entity.getComponent(CT.Health);

      if (!position || !health) continue;

      // Get tile to check if underwater
      const tile = worldWithTiles.getTileAt(
        Math.floor(position.x),
        Math.floor(position.y)
      );

      if (!tile?.fluid || tile.fluid.type !== 'water') {
        continue; // Not underwater
      }

      // Get actual ocean depth (z-level)
      const oceanDepth = tile.fluid.oceanDepth ?? position.z;
      const pressure = calculatePressure(oceanDepth);

      // Check for pressure resistance (equipment, species adaptation)
      const traits = entity.getComponent(CT.Traits);
      const equipment = entity.getComponent(CT.Equipment);

      let pressureResistance = 0; // Base: no resistance

      // Species adaptation (deep-sea creatures)
      if (traits?.pressureAdapted) {
        pressureResistance = traits.maxPressureAtm ?? 100;
      }

      // Equipment (pressure suit, submarine)
      if (equipment?.pressureSuit) {
        pressureResistance = Math.max(pressureResistance, equipment.pressureSuitRating ?? 50);
      }

      // Calculate pressure damage
      const excessPressure = Math.max(0, pressure - pressureResistance - 20); // 20 atm safe threshold

      if (excessPressure > 0) {
        // Pressure damage scales exponentially
        // 0-50 excess: 1 HP/sec
        // 50-100 excess: 5 HP/sec
        // 100+ excess: 20 HP/sec (rapid death)

        let damagePerSecond = 0;
        if (excessPressure < 50) {
          damagePerSecond = 1;
        } else if (excessPressure < 100) {
          damagePerSecond = 5;
        } else {
          damagePerSecond = 20;
        }

        entity.updateComponent(CT.Health, (current) => ({
          ...current,
          hp: Math.max(0, current.hp - damagePerSecond),
        }));

        // Log pressure damage (for UI feedback)
        console.warn(
          `[Pressure] Entity ${entity.id} taking ${damagePerSecond} pressure damage/sec at ${pressure.toFixed(0)} atm (depth: ${oceanDepth}m)`
        );
      }

      // Apply pressure effects to swimming speed
      // Higher pressure = denser water = slower movement
      const movement = entity.getComponent(CT.Movement);
      if (movement) {
        const densityMultiplier = Math.max(0.1, 1 - (pressure / 1000)); // 0.1 at 1000 atm
        entity.updateComponent(CT.Movement, (current) => ({
          ...current,
          pressureSpeedMultiplier: densityMultiplier,
        }));
      }
    }
  }
}
```

### 2.2 Pressure-Resistant Materials

**File:** `packages/world/src/chunks/Tile.ts`

**Update WallMaterial enum:**

```typescript
export type WallMaterial =
  | 'wood'
  | 'stone'
  | 'mud_brick'
  | 'ice'
  | 'metal'
  | 'glass'
  | 'thatch'
  | 'reinforced_steel'  // NEW: For deep-ocean structures
  | 'titanium_alloy'    // NEW: For extreme depths
  | 'transparent_aluminum'; // NEW: For submarine viewports

export const WALL_MATERIAL_PROPERTIES: Record<WallMaterial, {
  insulation: number;
  durability: number;
  difficulty: number;
  cost: number;
  maxPressureAtm: number; // NEW: Maximum pressure before failure
}> = {
  wood: {
    insulation: 50,
    durability: 40,
    difficulty: 20,
    cost: 2,
    maxPressureAtm: 5, // Fails quickly underwater
  },
  stone: {
    insulation: 80,
    durability: 90,
    difficulty: 50,
    cost: 3,
    maxPressureAtm: 50, // Good for shallow underwater bases
  },
  // ... existing materials ...

  reinforced_steel: {
    insulation: 30,
    durability: 150,
    difficulty: 90,
    cost: 10,
    maxPressureAtm: 300, // Bathypelagic zone (up to -3000m)
  },

  titanium_alloy: {
    insulation: 40,
    durability: 200,
    difficulty: 95,
    cost: 20,
    maxPressureAtm: 700, // Abyssal/Hadal zones (up to -7000m)
  },

  transparent_aluminum: {
    insulation: 20,
    durability: 180,
    difficulty: 98,
    cost: 25,
    maxPressureAtm: 700, // For viewports in deep subs
  },
};
```

### 2.3 Decompression Sickness

**File:** `packages/core/src/systems/DecompressionSystem.ts` (new)

```typescript
/**
 * DecompressionSystem - Handles "the bends" from rapid depth changes
 *
 * When agents ascend too quickly from depth, nitrogen bubbles form in blood.
 * This causes decompression sickness (DCS) with escalating effects:
 * - Joint pain (-movement speed)
 * - Confusion (-intelligence)
 * - Paralysis (immobilize)
 * - Death (if untreated)
 *
 * Prevention: Gradual ascent, decompression stops, pressure chamber treatment
 */
export class DecompressionSystem implements System {
  public readonly id = 'decompression';
  public readonly priority = 11; // After PressureSystem
  public readonly requiredComponents = [CT.Position, CT.Health];

  private depthHistory: Map<string, number[]> = new Map(); // entity ID -> recent depths

  update(world: World, entities: ReadonlyArray<Entity>): void {
    // Track depth history (last 60 seconds = 1200 ticks)
    const HISTORY_LENGTH = 1200;

    for (const entity of entities) {
      const position = entity.getComponent(CT.Position);
      if (!position) continue;

      const entityId = entity.id;
      let history = this.depthHistory.get(entityId) || [];

      // Add current depth
      history.push(position.z);

      // Keep only recent history
      if (history.length > HISTORY_LENGTH) {
        history = history.slice(-HISTORY_LENGTH);
      }
      this.depthHistory.set(entityId, history);

      // Check for rapid ascent
      if (history.length >= 20) { // Need at least 1 second of history
        const depthNow = history[history.length - 1]!;
        const depth1SecAgo = history[history.length - 20]!;

        const ascentRate = depth1SecAgo - depthNow; // Positive = ascending

        // Dangerous ascent: more than 10m/sec from depth > 200m
        if (ascentRate > 10 && depth1SecAgo < -200) {
          const severity = Math.min(1.0, ascentRate / 50); // 0-1 based on speed

          // Apply decompression damage
          const health = entity.getComponent(CT.Health);
          if (health) {
            const damage = severity * 2; // 0-2 HP/sec
            entity.updateComponent(CT.Health, (current) => ({
              ...current,
              hp: Math.max(0, current.hp - damage),
            }));
          }

          // Apply movement penalty
          const movement = entity.getComponent(CT.Movement);
          if (movement) {
            entity.updateComponent(CT.Movement, (current) => ({
              ...current,
              decompressionPenalty: severity * 0.5, // Up to 50% speed reduction
            }));
          }

          console.warn(
            `[Decompression] Entity ${entityId} ascending too fast! ` +
            `${ascentRate.toFixed(1)}m/s from ${depth1SecAgo}m (severity: ${(severity * 100).toFixed(0)}%)`
          );
        }
      }
    }
  }
}
```

### 2.4 Acceptance Criteria

- [ ] Pressure calculated from depth (1 atm per 10m)
- [ ] Agents take damage in high-pressure zones without protection
- [ ] Pressure damage scales: 1 HP/sec (moderate) → 20 HP/sec (extreme)
- [ ] Swimming speed reduced by pressure (water density)
- [ ] Wall materials have `maxPressureAtm` property
- [ ] Reinforced steel allows bathypelagic bases (-3000m)
- [ ] Titanium alloy allows hadal bases (-7000m)
- [ ] Rapid ascent causes decompression sickness
- [ ] DCS causes movement penalty and HP damage
- [ ] `npm test` passes with pressure tests

---

## Phase 3: Light & Temperature Gradients

**Goal:** Exponential light decay and thermocline temperature changes.

### 3.1 LightPenetrationSystem

**File:** `packages/core/src/systems/LightPenetrationSystem.ts` (new)

```typescript
import { calculateLightLevel, calculateTemperature } from '@ai-village/world';

/**
 * LightPenetrationSystem - Updates light levels based on depth
 *
 * Light decays exponentially with depth (Beer-Lambert law).
 * Affects:
 * - Plant photosynthesis (kelp, seagrass need light)
 * - Predator vision (dark = rely on bioluminescence)
 * - Agent visibility range
 *
 * Performance: Updates tiles once per game minute (batched via StateMutatorSystem)
 */
export class LightPenetrationSystem implements System {
  public readonly id = 'light_penetration';
  public readonly priority = 12;
  public readonly requiredComponents = [];

  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 1200; // 1 game minute

  update(world: World): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    const worldWithTiles = world as {
      getChunkManager?: () => {
        getLoadedChunks: () => Array<{ x: number; y: number; tiles: any[] }>;
      };
    };

    const chunkManager = worldWithTiles.getChunkManager?.();
    if (!chunkManager) return;

    const loadedChunks = chunkManager.getLoadedChunks();

    // Update light levels for all loaded ocean tiles
    for (const chunk of loadedChunks) {
      for (let localY = 0; localY < 32; localY++) {
        for (let localX = 0; localX < 32; localX++) {
          const tile = chunk.tiles[localY * 32 + localX];

          if (!tile?.fluid || tile.fluid.type !== 'water') continue;

          const oceanDepth = tile.fluid.oceanDepth ?? tile.elevation ?? 0;

          // Calculate light level
          const lightLevel = calculateLightLevel(oceanDepth);

          // Calculate temperature (thermocline effect)
          const temperature = calculateTemperature(oceanDepth);

          // Update tile fluid properties
          tile.fluid.lightLevel = lightLevel;
          tile.fluid.temperature = temperature;
        }
      }
    }
  }
}
```

### 3.2 Bioluminescence Component

**File:** `packages/core/src/components/BioluminescenceComponent.ts` (new)

```typescript
import type { Component } from '../ecs/Component.js';

/**
 * BioluminescenceComponent - Creatures that produce light
 *
 * Common in mesopelagic/bathypelagic zones where sunlight is absent.
 * Used for:
 * - Attracting prey (anglerfish lure)
 * - Communication (flash patterns)
 * - Counter-illumination camouflage (matching ambient light from below)
 * - Startling predators (bright flash)
 */
export interface BioluminescenceComponent extends Component {
  type: 'bioluminescence';

  /** Light intensity (0.0 = dim glow, 1.0 = bright flash) */
  intensity: number;

  /** Light color (hex code) */
  color: string;

  /** Light radius in tiles */
  radius: number;

  /** Flash pattern ('constant', 'pulse', 'flash', 'lure') */
  pattern: 'constant' | 'pulse' | 'flash' | 'lure';

  /** Flash frequency in Hz (for pulse/flash patterns) */
  frequency?: number;

  /** Whether light is currently on */
  active: boolean;

  /** Purpose of bioluminescence */
  purpose: 'hunting' | 'communication' | 'defense' | 'camouflage';
}

export function createBioluminescenceComponent(
  intensity: number,
  color: string,
  radius: number,
  pattern: 'constant' | 'pulse' | 'flash' | 'lure',
  purpose: 'hunting' | 'communication' | 'defense' | 'camouflage'
): BioluminescenceComponent {
  return {
    type: 'bioluminescence',
    version: 1,
    intensity,
    color,
    radius,
    pattern,
    frequency: pattern === 'pulse' ? 1.0 : undefined,
    active: true,
    purpose,
  };
}
```

### 3.3 Thermal Vents

**File:** `packages/world/src/ocean/ThermalVents.ts` (new)

```typescript
/**
 * Thermal vents are hydrothermal chimneys that spew hot water and minerals.
 * Found in hadal/abyssal zones near tectonic plate boundaries.
 *
 * Support chemosynthetic ecosystems independent of sunlight.
 */

export interface ThermalVent {
  x: number;
  y: number;
  z: number; // Typically -4000 to -6000
  temperature: number; // 300-400°C at vent mouth
  radius: number; // Heat radius
  mineralRichness: number; // 0.0-1.0
  ecosystemSize: number; // Number of creatures supported
}

/**
 * Generate thermal vents during terrain generation.
 * Vents spawn in deep ocean near "ridge" noise patterns.
 */
export function generateThermalVents(
  worldX: number,
  worldY: number,
  oceanDepth: number,
  ridgeNoise: number
): ThermalVent | undefined {
  // Only spawn in abyssal/hadal zones
  if (oceanDepth > -4000) return undefined;

  // Vents appear along tectonic ridges (high ridge noise)
  if (ridgeNoise < 0.7) return undefined;

  // Random chance (rare)
  if (Math.random() > 0.01) return undefined; // 1% of eligible tiles

  return {
    x: worldX,
    y: worldY,
    z: oceanDepth,
    temperature: 300 + Math.random() * 100, // 300-400°C
    radius: 5 + Math.random() * 10, // 5-15 tiles
    mineralRichness: 0.5 + Math.random() * 0.5,
    ecosystemSize: Math.floor(10 + Math.random() * 40), // 10-50 creatures
  };
}
```

### 3.4 Acceptance Criteria

- [ ] Light level follows exponential decay (Beer-Lambert law)
- [ ] Light reaches 0% by -300m depth
- [ ] Temperature follows thermocline (20°C → 10°C → 2°C)
- [ ] Bioluminescence component defined
- [ ] Thermal vents spawn in abyssal/hadal zones
- [ ] Vents have 300-400°C temperature
- [ ] Vents support chemosynthetic ecosystems
- [ ] LightPenetrationSystem updates once per game minute
- [ ] `npm test` passes with light/temperature tests

---

## Phase 4: Underwater Life

**Goal:** Depth-adapted creatures, swimming mechanics, underwater plants.

### 4.1 Depth-Adapted Creatures

**File:** `packages/world/src/alien-generation/creatures/OceanCreatures.ts` (new)

```typescript
import type { CreatureTemplate } from './CreatureTemplate.js';
import { LOCOMOTION_METHODS } from './Locomotion.js';

/**
 * Ocean creature templates for each biome zone.
 */

export const EPIPELAGIC_CREATURES: CreatureTemplate[] = [
  {
    name: 'Kelp Grazer',
    description: 'Herbivorous fish that feeds on kelp forests.',
    locomotion: LOCOMOTION_METHODS.swimming,
    size: 'small',
    diet: 'herbivore',
    habitat: 'epipelagic',
    depthRange: [0, -200],
    pressureAdapted: false,
    maxPressureAtm: 20,
    traits: ['schooling', 'photosynthesis_dependent'],
  },

  {
    name: 'Coral Polyp',
    description: 'Filter-feeding sessile creature that builds coral reefs.',
    locomotion: { name: 'Sessile', mechanism: 'Attached to substrate', speed: 'very_slow' },
    size: 'tiny',
    diet: 'filter_feeder',
    habitat: 'epipelagic',
    depthRange: [0, -100],
    pressureAdapted: false,
    maxPressureAtm: 10,
    traits: ['photosynthesis_symbiont', 'reef_builder'],
  },
];

export const MESOPELAGIC_CREATURES: CreatureTemplate[] = [
  {
    name: 'Twilight Predator',
    description: 'Large-eyed fish that hunts in dim light using bioluminescent lures.',
    locomotion: LOCOMOTION_METHODS.swimming,
    size: 'medium',
    diet: 'carnivore',
    habitat: 'mesopelagic',
    depthRange: [-200, -1000],
    pressureAdapted: true,
    maxPressureAtm: 100,
    bioluminescence: {
      intensity: 0.6,
      color: '#00FFFF', // Cyan
      radius: 3,
      pattern: 'lure',
      purpose: 'hunting',
    },
    traits: ['large_eyes', 'bioluminescent', 'vertical_migrator'],
  },

  {
    name: 'Gelatinous Drifter',
    description: 'Transparent jellyfish-like creature that drifts in currents.',
    locomotion: LOCOMOTION_METHODS.jet_propulsion,
    size: 'medium',
    diet: 'carnivore',
    habitat: 'mesopelagic',
    depthRange: [-200, -1000],
    pressureAdapted: true,
    maxPressureAtm: 100,
    bioluminescence: {
      intensity: 0.3,
      color: '#FF00FF', // Magenta
      radius: 5,
      pattern: 'pulse',
      purpose: 'defense',
    },
    traits: ['transparent', 'bioluminescent', 'stinging_tentacles'],
  },
];

export const BATHYPELAGIC_CREATURES: CreatureTemplate[] = [
  {
    name: 'Anglerfish',
    description: 'Deep-sea predator with bioluminescent lure. Females much larger than males.',
    locomotion: LOCOMOTION_METHODS.swimming,
    size: 'medium',
    diet: 'carnivore',
    habitat: 'bathypelagic',
    depthRange: [-1000, -4000],
    pressureAdapted: true,
    maxPressureAtm: 400,
    bioluminescence: {
      intensity: 0.8,
      color: '#00FF00', // Green
      radius: 2,
      pattern: 'lure',
      purpose: 'hunting',
    },
    traits: ['bioluminescent_lure', 'huge_mouth', 'sexual_dimorphism'],
  },

  {
    name: 'Barreleye',
    description: 'Bizarre fish with transparent head and tubular eyes that look upward.',
    locomotion: LOCOMOTION_METHODS.swimming,
    size: 'small',
    diet: 'carnivore',
    habitat: 'bathypelagic',
    depthRange: [-1000, -3000],
    pressureAdapted: true,
    maxPressureAtm: 300,
    traits: ['transparent_head', 'upward_vision', 'motion_detector'],
  },
];

export const ABYSSAL_CREATURES: CreatureTemplate[] = [
  {
    name: 'Abyssal Scavenger',
    description: 'Slow-moving bottom-dweller that feeds on marine snow and whale falls.',
    locomotion: { name: 'Bottom Crawling', mechanism: 'Drags along seafloor', speed: 'very_slow' },
    size: 'medium',
    diet: 'scavenger',
    habitat: 'abyssal',
    depthRange: [-4000, -6000],
    pressureAdapted: true,
    maxPressureAtm: 600,
    traits: ['slow_metabolism', 'marine_snow_feeder', 'whale_fall_specialist'],
  },

  {
    name: 'Tripod Fish',
    description: 'Strange fish that stands on elongated fins waiting for food to drift by.',
    locomotion: { name: 'Tripod Standing', mechanism: 'Stands on three fin-legs', speed: 'very_slow' },
    size: 'small',
    diet: 'carnivore',
    habitat: 'abyssal',
    depthRange: [-4000, -6000],
    pressureAdapted: true,
    maxPressureAtm: 600,
    traits: ['ambush_predator', 'fin_legs', 'patient_hunter'],
  },
];

export const HADAL_CREATURES: CreatureTemplate[] = [
  {
    name: 'Snailfish',
    description: 'Deepest-living fish. Gelatinous body adapted to extreme pressure.',
    locomotion: LOCOMOTION_METHODS.swimming,
    size: 'small',
    diet: 'carnivore',
    habitat: 'hadal',
    depthRange: [-6000, -11000],
    pressureAdapted: true,
    maxPressureAtm: 1100,
    traits: ['gelatinous_body', 'pressure_specialist', 'amphipod_hunter'],
  },

  {
    name: 'Chemosynthetic Bacteria',
    description: 'Microscopic organisms that use chemicals from thermal vents as energy.',
    locomotion: { name: 'Passive Drift', mechanism: 'Drifts in currents', speed: 'very_slow' },
    size: 'microscopic',
    diet: 'chemosynthetic',
    habitat: 'hadal',
    depthRange: [-6000, -11000],
    pressureAdapted: true,
    maxPressureAtm: 1100,
    traits: ['chemosynthesis', 'vent_dependent', 'ecosystem_foundation'],
  },

  {
    name: 'Giant Amphipod',
    description: 'Crustacean scavenger found in deepest trenches. Can grow to 30cm.',
    locomotion: { name: 'Scuttling', mechanism: 'Crawls along trench floor', speed: 'slow' },
    size: 'small',
    diet: 'scavenger',
    habitat: 'hadal',
    depthRange: [-6000, -11000],
    pressureAdapted: true,
    maxPressureAtm: 1100,
    traits: ['scavenger', 'exoskeleton', 'whale_fall_specialist'],
  },
];
```

### 4.2 Underwater Plant System

**File:** `packages/core/src/systems/UnderwaterPlantSystem.ts` (new)

```typescript
/**
 * UnderwaterPlantSystem - Handles photosynthetic and chemosynthetic plants
 *
 * Two types:
 * 1. Photosynthetic (kelp, seagrass, coral) - require light (epipelagic)
 * 2. Chemosynthetic (bacteria mats) - use chemicals from vents (hadal)
 */
export class UnderwaterPlantSystem implements System {
  public readonly id = 'underwater_plant';
  public readonly priority = 14;
  public readonly requiredComponents = [CT.Position, CT.Plant];

  update(world: World, entities: ReadonlyArray<Entity>): void {
    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number) => any;
    };

    if (!worldWithTiles.getTileAt) return;

    for (const entity of entities) {
      const position = entity.getComponent(CT.Position);
      const plant = entity.getComponent(CT.Plant);

      if (!position || !plant) continue;

      const tile = worldWithTiles.getTileAt(
        Math.floor(position.x),
        Math.floor(position.y)
      );

      if (!tile?.fluid || tile.fluid.type !== 'water') continue;

      const lightLevel = tile.fluid.lightLevel ?? 0;
      const oceanDepth = tile.fluid.oceanDepth ?? position.z;

      // Check plant type
      if (plant.plantType === 'kelp' || plant.plantType === 'seagrass') {
        // Photosynthetic - requires light
        if (lightLevel < 10) {
          // Too dark - plant dies
          entity.updateComponent(CT.Health, (current) => ({
            ...current,
            hp: Math.max(0, current.hp - 1), // Slow death from lack of light
          }));
        } else {
          // Enough light - grow
          entity.updateComponent(CT.Plant, (current) => ({
            ...current,
            growth: Math.min(100, current.growth + (lightLevel / 100)),
          }));
        }
      } else if (plant.plantType === 'chemosynthetic_bacteria') {
        // Chemosynthetic - requires proximity to thermal vent
        const nearVent = this.isNearThermalVent(world, position.x, position.y);

        if (!nearVent) {
          // No vent - bacteria dies
          entity.updateComponent(CT.Health, (current) => ({
            ...current,
            hp: Math.max(0, current.hp - 2),
          }));
        } else {
          // Near vent - grow rapidly
          entity.updateComponent(CT.Plant, (current) => ({
            ...current,
            growth: Math.min(100, current.growth + 2),
          }));
        }
      }
    }
  }

  private isNearThermalVent(world: World, x: number, y: number): boolean {
    // Check for nearby thermal vent entities or tiles
    // TODO: Implement vent detection
    return false;
  }
}
```

### 4.3 Swimming Mechanics Integration

**File:** `packages/core/src/systems/AgentSwimmingSystem.ts` (enhanced)

```typescript
/**
 * AgentSwimmingSystem - Enhanced for depth-based mechanics
 *
 * Depth zones:
 * - Epipelagic (0-200m): Normal swimming
 * - Mesopelagic (200-1000m): Slower, need light source
 * - Bathypelagic (1000-4000m): Very slow, pressure damage
 * - Abyssal (4000-6000m): Extreme difficulty
 * - Hadal (6000+m): Requires specialized equipment
 */
export class AgentSwimmingSystem implements System {
  public readonly id = 'agent_swimming';
  public readonly priority = 18;
  public readonly requiredComponents = [CT.Position, CT.Movement, CT.Needs];

  update(world: World, entities: ReadonlyArray<Entity>): void {
    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number) => any;
    };

    if (!worldWithTiles.getTileAt) return;

    for (const entity of entities) {
      const position = entity.getComponent(CT.Position);
      const movement = entity.getComponent(CT.Movement);
      const needs = entity.getComponent(CT.Needs);

      if (!position || !movement || !needs) continue;

      const tile = worldWithTiles.getTileAt(
        Math.floor(position.x),
        Math.floor(position.y)
      );

      if (!tile?.fluid || tile.fluid.type !== 'water') {
        // Not in water - restore normal speed and oxygen
        entity.updateComponent(CT.Movement, (current) => ({
          ...current,
          speedMultiplier: 1.0,
        }));

        if (needs.oxygen < 100) {
          entity.updateComponent(CT.Needs, (current) => ({
            ...current,
            oxygen: Math.min(100, current.oxygen + 5),
          }));
        }
        continue;
      }

      const oceanDepth = Math.abs(tile.fluid.oceanDepth ?? position.z);
      const lightLevel = tile.fluid.lightLevel ?? 0;

      // Depth-based speed penalties
      let speedMultiplier = 1.0;
      let oxygenDrain = 0;

      if (oceanDepth <= 200) {
        // Epipelagic - normal swimming
        speedMultiplier = 0.5;
        oxygenDrain = 0.1;
      } else if (oceanDepth <= 1000) {
        // Mesopelagic - slower, vision limited
        speedMultiplier = 0.3;
        oxygenDrain = 0.2;

        // Penalty if no light source in dim zone
        const equipment = entity.getComponent(CT.Equipment);
        if (!equipment?.lightSource && lightLevel < 50) {
          speedMultiplier *= 0.5; // Move even slower without light
        }
      } else if (oceanDepth <= 4000) {
        // Bathypelagic - very slow, pressure danger
        speedMultiplier = 0.1;
        oxygenDrain = 0.5;
      } else {
        // Abyssal/Hadal - requires specialized equipment
        const equipment = entity.getComponent(CT.Equipment);
        if (!equipment?.deepSeaSuit) {
          // No protection - rapid death
          speedMultiplier = 0.05;
          oxygenDrain = 1.0;
        } else {
          speedMultiplier = 0.1;
          oxygenDrain = 0.3;
        }
      }

      // Apply movement penalty
      entity.updateComponent(CT.Movement, (current) => ({
        ...current,
        speedMultiplier: speedMultiplier,
      }));

      // Apply oxygen drain
      entity.updateComponent(CT.Needs, (current) => ({
        ...current,
        oxygen: Math.max(0, current.oxygen - oxygenDrain),
      }));

      // Drowning damage
      if (needs.oxygen <= 0) {
        const health = entity.getComponent(CT.Health);
        if (health) {
          entity.updateComponent(CT.Health, (current) => ({
            ...current,
            hp: current.hp - 1,
          }));
        }
      }
    }
  }
}
```

### 4.4 Acceptance Criteria

- [ ] 5 ocean creature types per biome zone (25 total)
- [ ] Creatures have depth ranges and pressure adaptation
- [ ] Bioluminescent creatures in mesopelagic/bathypelagic zones
- [ ] Kelp/seagrass require light (epipelagic only)
- [ ] Chemosynthetic bacteria near thermal vents (hadal)
- [ ] Swimming speed decreases with depth
- [ ] Light sources required in mesopelagic+ for navigation
- [ ] Deep-sea suit required for abyssal/hadal zones
- [ ] Oxygen drain increases with depth
- [ ] `npm test` passes with underwater life tests

---

## Phase 5: Planetary-Scale Flow Mechanics

**Goal:** Ocean currents, tides, convection across millions of tiles.

### 5.1 Level-of-Detail Flow System

**Problem:** Simulating flow for millions of ocean tiles at 20 TPS is impossible.

**Solution:** Multi-LOD approach inspired by climate models:

1. **Planetary Scale (Far Ocean)**: No per-tile simulation, only global properties
2. **Regional Scale (Ocean Basins)**: Macro currents (Gulf Stream, etc.)
3. **Local Scale (Loaded Chunks)**: Detailed pressure-based flow (Dwarf Fortress style)

**File:** `packages/core/src/systems/PlanetaryFlowSystem.ts` (new)

```typescript
/**
 * PlanetaryFlowSystem - Multi-LOD ocean current simulation
 *
 * Three simulation levels:
 * 1. Far Ocean (1000+ chunks away): No simulation (static properties)
 * 2. Regional Ocean (50-1000 chunks): Macro currents (batched updates)
 * 3. Local Ocean (0-50 chunks): Detailed flow (DF-style pressure)
 *
 * Performance:
 * - Far: 0 CPU (millions of tiles)
 * - Regional: 1 update per 10 seconds (thousands of tiles)
 * - Local: 4 Hz updates (hundreds of tiles)
 */
export class PlanetaryFlowSystem implements System {
  public readonly id = 'planetary_flow';
  public readonly priority = 8;
  public readonly requiredComponents = [];

  private lastRegionalUpdateTick = 0;
  private readonly REGIONAL_UPDATE_INTERVAL = 200; // Every 10 seconds

  private lastLocalUpdateTick = 0;
  private readonly LOCAL_UPDATE_INTERVAL = 5; // Every 250ms (4 Hz)

  // Macro current vectors for regional simulation
  private regionalCurrents: Map<string, { x: number; y: number; z: number }> = new Map();

  update(world: World): void {
    const currentTick = world.tick;

    // Update regional currents (every 10 seconds)
    if (currentTick - this.lastRegionalUpdateTick >= this.REGIONAL_UPDATE_INTERVAL) {
      this.updateRegionalCurrents(world);
      this.lastRegionalUpdateTick = currentTick;
    }

    // Update local flow (every 250ms)
    if (currentTick - this.lastLocalUpdateTick >= this.LOCAL_UPDATE_INTERVAL) {
      this.updateLocalFlow(world);
      this.lastLocalUpdateTick = currentTick;
    }
  }

  /**
   * Update macro currents for regional ocean basins.
   * Uses simplified Navier-Stokes with Coriolis effect.
   */
  private updateRegionalCurrents(world: World): void {
    const worldWithTiles = world as {
      getChunkManager?: () => {
        getLoadedChunks: () => Array<{ x: number; y: number }>;
      };
      getPlanetRadius?: () => number;
    };

    const chunkManager = worldWithTiles.getChunkManager?.();
    if (!chunkManager) return;

    const loadedChunks = chunkManager.getLoadedChunks();
    const planetRadius = worldWithTiles.getPlanetRadius?.() ?? 6_371_000;

    // Calculate regional current zones (each zone = 100x100 chunks = 3200x3200 tiles)
    const ZONE_SIZE = 100;
    const zones = new Set<string>();

    for (const chunk of loadedChunks) {
      const zoneX = Math.floor(chunk.x / ZONE_SIZE);
      const zoneY = Math.floor(chunk.y / ZONE_SIZE);
      zones.add(`${zoneX},${zoneY}`);
    }

    // Update current vector for each zone
    for (const zoneKey of zones) {
      const [zoneX, zoneY] = zoneKey.split(',').map(Number);

      // Calculate latitude (for Coriolis effect)
      // Assuming planet is spherical, map zone Y to latitude
      const worldY = zoneY * ZONE_SIZE * 32; // Convert to world coordinates
      const latitude = (worldY / (planetRadius * 2 * Math.PI)) * 180; // Degrees

      // Coriolis parameter: f = 2 * Ω * sin(latitude)
      // Ω = Earth's angular velocity = 7.2921 × 10^-5 rad/s
      const OMEGA = 7.2921e-5;
      const coriolisF = 2 * OMEGA * Math.sin((latitude * Math.PI) / 180);

      // Simplified geostrophic current (flows perpendicular to pressure gradient)
      // In Northern Hemisphere: clockwise around highs, counterclockwise around lows
      // In Southern Hemisphere: reversed

      // For now, use noise to create macro patterns (Gulf Stream, etc.)
      const currentNoise = this.planetaryCurrentNoise(zoneX, zoneY);

      // Current vector (simplified - real ocean currents are complex!)
      const currentX = Math.cos(currentNoise * Math.PI * 2) * 0.1; // 0.1 tiles/sec = ~10cm/s
      const currentY = Math.sin(currentNoise * Math.PI * 2) * 0.1;
      const currentZ = 0; // Horizontal currents (vertical = upwelling/downwelling)

      // Apply Coriolis deflection
      const deflectedX = currentX - (currentY * coriolisF * 100);
      const deflectedY = currentY + (currentX * coriolisF * 100);

      this.regionalCurrents.set(zoneKey, {
        x: deflectedX,
        y: deflectedY,
        z: currentZ,
      });
    }
  }

  /**
   * Update local flow for loaded chunks using Dwarf Fortress pressure model.
   */
  private updateLocalFlow(world: World): void {
    // This is the same as Phase 2 FluidDynamicsSystem, but only for LOCAL chunks
    // See WATER_PHYSICS_SPEC.md Phase 2 for implementation details

    const worldWithTiles = world as {
      getChunkManager?: () => {
        getLoadedChunks: () => Array<{ x: number; y: number; tiles: any[] }>;
      };
      getTileAt?: (x: number, y: number) => any;
      setTileAt?: (x: number, y: number, tile: any) => void;
    };

    const chunkManager = worldWithTiles.getChunkManager?.();
    if (!chunkManager || !worldWithTiles.getTileAt || !worldWithTiles.setTileAt) return;

    const loadedChunks = chunkManager.getLoadedChunks();

    // Only process local chunks (within 50 chunk radius of player)
    // TODO: Get player position
    const playerChunk = { x: 0, y: 0 }; // Placeholder

    for (const chunk of loadedChunks) {
      const dx = chunk.x - playerChunk.x;
      const dy = chunk.y - playerChunk.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared > 50 * 50) {
        continue; // Skip distant chunks (use regional currents instead)
      }

      // Process each water tile in chunk
      for (let localY = 0; localY < 32; localY++) {
        for (let localX = 0; localX < 32; localX++) {
          const tile = chunk.tiles[localY * 32 + localX];

          if (!tile?.fluid || tile.fluid.type !== 'water') continue;

          // Apply detailed pressure-based flow (see Phase 2)
          this.simulateDetailedFlow(
            chunk.x * 32 + localX,
            chunk.y * 32 + localY,
            tile,
            worldWithTiles
          );
        }
      }
    }
  }

  private simulateDetailedFlow(
    x: number,
    y: number,
    tile: any,
    worldWithTiles: any
  ): void {
    // Same algorithm as FluidDynamicsSystem from Phase 2
    // Calculate pressure, find neighbors with lower pressure, transfer fluid
    // See WATER_PHYSICS_SPEC.md Phase 2.1 for full implementation
  }

  /**
   * Planetary current noise for macro patterns.
   */
  private planetaryCurrentNoise(zoneX: number, zoneY: number): number {
    // Use Perlin noise with very large scale for planetary patterns
    // This creates "Gulf Stream" style currents
    const scale = 0.001; // Very large features
    return Math.sin(zoneX * scale) * Math.cos(zoneY * scale);
  }
}
```

### 5.2 Tidal System

**File:** `packages/core/src/systems/TidalSystem.ts` (new)

```typescript
/**
 * TidalSystem - Simulates tides caused by moon gravity
 *
 * Tides affect:
 * - Water level in coastal tiles (±2 depth units)
 * - Current strength (faster during tidal flow)
 * - Exposed tidal zones (intertidal life)
 *
 * Tidal period: 12 game hours (1/4 of day)
 */
export class TidalSystem implements System {
  public readonly id = 'tidal';
  public readonly priority = 6;
  public readonly requiredComponents = [];

  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 1200; // 1 game minute

  update(world: World): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Get time component for day/night cycle
    const timeEntities = world.query().with(CT.Time).executeEntities();
    if (timeEntities.length === 0) return;

    const timeComp = timeEntities[0]!.getComponent(CT.Time);
    if (!timeComp) return;

    const gameHour = timeComp.hour ?? 0;

    // Tidal cycle: high tide at 0h and 12h, low tide at 6h and 18h
    // Tidal amplitude: ±2 depth units
    const tidalPhase = (gameHour % 12) / 12; // 0 to 1
    const tidalHeight = Math.sin(tidalPhase * Math.PI * 2) * 2; // -2 to +2

    // Update water level in coastal tiles
    const worldWithTiles = world as {
      getChunkManager?: () => {
        getLoadedChunks: () => Array<{ x: number; y: number; tiles: any[] }>;
      };
    };

    const chunkManager = worldWithTiles.getChunkManager?.();
    if (!chunkManager) return;

    const loadedChunks = chunkManager.getLoadedChunks();

    for (const chunk of loadedChunks) {
      for (let localY = 0; localY < 32; localY++) {
        for (let localX = 0; localX < 32; localX++) {
          const tile = chunk.tiles[localY * 32 + localX];

          if (!tile?.fluid || tile.fluid.type !== 'water') continue;

          const oceanDepth = Math.abs(tile.fluid.oceanDepth ?? 0);

          // Only affect coastal/shallow water (< 50m deep)
          if (oceanDepth > 50) continue;

          // Adjust surface depth based on tide
          const baseDepth = 4; // Normal ocean surface depth
          const tidalDepth = Math.max(1, Math.min(7, baseDepth + Math.round(tidalHeight)));

          tile.fluid.depth = tidalDepth;
          tile.fluid.tidalPhase = tidalPhase;
        }
      }
    }
  }
}
```

### 5.3 Thermal Convection

**File:** `packages/core/src/systems/ThermalConvectionSystem.ts` (new)

```typescript
/**
 * ThermalConvectionSystem - Hot water rises, cold water sinks
 *
 * Drives vertical water movement:
 * - Thermal vents: Hot water rises, creates upwelling
 * - Polar regions: Cold water sinks, creates downwelling
 * - Thermocline mixing
 *
 * Performance: Updates once per game hour (very slow process)
 */
export class ThermalConvectionSystem implements System {
  public readonly id = 'thermal_convection';
  public readonly priority = 9;
  public readonly requiredComponents = [];

  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 72000; // 1 game hour (60 min * 1200 ticks/min)

  update(world: World): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    const worldWithTiles = world as {
      getChunkManager?: () => {
        getLoadedChunks: () => Array<{ x: number; y: number; tiles: any[] }>;
      };
      getTileAt?: (x: number, y: number, z?: number) => any;
      setTileAt?: (x: number, y: number, z: number, tile: any) => void;
    };

    const chunkManager = worldWithTiles.getChunkManager?.();
    if (!chunkManager || !worldWithTiles.getTileAt || !worldWithTiles.setTileAt) return;

    const loadedChunks = chunkManager.getLoadedChunks();

    for (const chunk of loadedChunks) {
      for (let localY = 0; localY < 32; localY++) {
        for (let localX = 0; localX < 32; localX++) {
          const worldX = chunk.x * 32 + localX;
          const worldY = chunk.y * 32 + localY;

          const surfaceTile = worldWithTiles.getTileAt(worldX, worldY, 0);
          if (!surfaceTile?.fluid || surfaceTile.fluid.type !== 'water') continue;

          const oceanDepth = Math.abs(surfaceTile.fluid.oceanDepth ?? 0);

          // Check for temperature gradient
          // Hot water (from vents or warm surface) rises
          // Cold water (from deep or polar) sinks

          const temperature = surfaceTile.fluid.temperature ?? 20;

          // Simplified convection: if temp > 50°C (near vent), create upwelling
          if (temperature > 50) {
            // Hot water rises - create upward flow
            surfaceTile.fluid.convectionVelocityZ = 0.01; // Slow upward movement
          } else if (temperature < 5 && oceanDepth > 1000) {
            // Cold deep water sinks - create downward flow
            surfaceTile.fluid.convectionVelocityZ = -0.01; // Slow downward movement
          } else {
            // No significant convection
            surfaceTile.fluid.convectionVelocityZ = 0;
          }
        }
      }
    }
  }
}
```

### 5.4 Acceptance Criteria

- [ ] PlanetaryFlowSystem implements 3-LOD approach
- [ ] Far ocean (1000+ chunks): No per-tile updates
- [ ] Regional ocean (50-1000 chunks): Macro currents (10s updates)
- [ ] Local ocean (0-50 chunks): Detailed flow (4 Hz updates)
- [ ] Macro currents use Coriolis effect (latitude-dependent)
- [ ] Tidal system adjusts water level ±2 depth units
- [ ] Tidal cycle: 12 game hours (high-low-high-low)
- [ ] Thermal convection creates upwelling/downwelling
- [ ] Thermal vents produce hot water upwelling
- [ ] System maintains 20 TPS with millions of ocean tiles
- [ ] `npm test` passes with flow tests

---

## Phase 6: Higher-Dimensional Fluids (4D-6D Water)

**Goal:** Extend water physics to 4D, 5D, 6D spaces.

### 6.1 Hyperdimensional Flow Concepts

**4D Water:**
- Water flows in 4 directions: x, y, z, **w**
- w-dimension is perpendicular to xyz (impossible to visualize)
- Pressure acts in w-direction (depth in hyperspace)
- Example: 3D ocean can have w-depth creating "hypersea"

**5D Water:**
- 5 flow directions: x, y, z, w, **v**
- Hypersurface currents (flow along v while maintaining xyz position)
- 5D whirlpools (rotation in multiple planes simultaneously)

**6D Water:**
- 6 flow directions: x, y, z, w, v, **u**
- Maximum dimensionality supported by engine
- Hypersphere wave propagation
- 6D pressure from all directions (agent crushed in hyperspace)

### 6.2 Hyperdimensional Pressure

**File:** `packages/world/src/ocean/HyperdimensionalPressure.ts` (new)

```typescript
/**
 * Calculate pressure in N-dimensional space.
 *
 * In 3D: P = ρ * g * depth
 * In 4D: P = ρ * g * (depth_xyz + depth_w)
 * In 6D: P = ρ * g * (depth_xyz + depth_w + depth_v + depth_u)
 *
 * Hyperdimensional depth: distance from "hypersurface" in higher dimensions
 */
export function calculateHyperdimensionalPressure(
  position: { x: number; y: number; z: number; w?: number; v?: number; u?: number },
  gravity: number = 9.8
): number {
  const SEAWATER_DENSITY = 1025; // kg/m³
  const PA_PER_ATM = 101325;

  // 3D depth (z-axis)
  const depth3D = Math.abs(Math.min(0, position.z));

  // 4D depth (w-axis)
  const depth4D = position.w !== undefined ? Math.abs(Math.min(0, position.w)) : 0;

  // 5D depth (v-axis)
  const depth5D = position.v !== undefined ? Math.abs(Math.min(0, position.v)) : 0;

  // 6D depth (u-axis)
  const depth6D = position.u !== undefined ? Math.abs(Math.min(0, position.u)) : 0;

  // Total hyperdimensional depth (Euclidean distance in higher dims)
  const totalDepth = Math.sqrt(
    depth3D ** 2 + depth4D ** 2 + depth5D ** 2 + depth6D ** 2
  );

  // Calculate pressure
  const pressurePa = SEAWATER_DENSITY * gravity * totalDepth;
  const pressureAtm = 1.0 + (pressurePa / PA_PER_ATM);

  return pressureAtm;
}

/**
 * Calculate flow gradient in N-dimensional space.
 *
 * Water flows from high pressure to low pressure along all dimensions.
 * Returns flow vector in N dimensions.
 */
export function calculateHyperdimensionalFlow(
  currentPressure: number,
  neighborPressures: {
    x_pos?: number;
    x_neg?: number;
    y_pos?: number;
    y_neg?: number;
    z_pos?: number;
    z_neg?: number;
    w_pos?: number;
    w_neg?: number;
    v_pos?: number;
    v_neg?: number;
    u_pos?: number;
    u_neg?: number;
  }
): { x: number; y: number; z: number; w: number; v: number; u: number } {
  // Pressure gradient in each dimension
  const gradX = ((neighborPressures.x_neg ?? currentPressure) - (neighborPressures.x_pos ?? currentPressure)) / 2;
  const gradY = ((neighborPressures.y_neg ?? currentPressure) - (neighborPressures.y_pos ?? currentPressure)) / 2;
  const gradZ = ((neighborPressures.z_neg ?? currentPressure) - (neighborPressures.z_pos ?? currentPressure)) / 2;
  const gradW = ((neighborPressures.w_neg ?? currentPressure) - (neighborPressures.w_pos ?? currentPressure)) / 2;
  const gradV = ((neighborPressures.v_neg ?? currentPressure) - (neighborPressures.v_pos ?? currentPressure)) / 2;
  const gradU = ((neighborPressures.u_neg ?? currentPressure) - (neighborPressures.u_pos ?? currentPressure)) / 2;

  // Flow is proportional to negative gradient (flows down pressure gradient)
  return {
    x: -gradX * 0.1, // Scale factor for flow speed
    y: -gradY * 0.1,
    z: -gradZ * 0.1,
    w: -gradW * 0.1,
    v: -gradV * 0.1,
    u: -gradU * 0.1,
  };
}
```

### 6.3 Hyperdimensional Flow System

**File:** `packages/core/src/systems/HyperdimensionalFlowSystem.ts` (new)

```typescript
/**
 * HyperdimensionalFlowSystem - Water flow in 4D-6D spaces
 *
 * Extends 3D pressure-based flow to higher dimensions.
 * Water can flow along w, v, u axes in addition to x, y, z.
 *
 * Example:
 * - 4D ocean: Water at w=-1000 flows toward w=0 (hypersurface)
 * - 5D whirlpool: Rotation in xy-plane AND wv-plane simultaneously
 * - 6D hypersea: Pressure from all 6 dimensions crushes entities
 *
 * Performance: Only enabled in universes with spatialDimensions > 3
 */
export class HyperdimensionalFlowSystem implements System {
  public readonly id = 'hyperdimensional_flow';
  public readonly priority = 16;
  public readonly requiredComponents = [];

  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 10; // Every 500ms (2 Hz, slower than 3D)

  update(world: World): void {
    // Check if universe has higher dimensions
    const universeConfig = world.getUniverseConfig?.();
    if (!universeConfig || universeConfig.spatialDimensions <= 3) {
      return; // Standard 3D universe, skip hyperdimensional flow
    }

    const currentTick = world.tick;

    if (currentTick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    const dimensions = universeConfig.spatialDimensions;

    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number, z?: number, w?: number, v?: number, u?: number) => any;
      setTileAt?: (x: number, y: number, z: number, w: number, v: number, u: number, tile: any) => void;
    };

    if (!worldWithTiles.getTileAt || !worldWithTiles.setTileAt) return;

    // For simplicity, only process tiles with entities (hyperdimensional water is rare)
    const entities = world.query().with(CT.Position).executeEntities();

    for (const entity of entities) {
      const position = entity.getComponent(CT.Position);
      if (!position) continue;

      const x = Math.floor(position.x);
      const y = Math.floor(position.y);
      const z = Math.floor(position.z ?? 0);
      const w = Math.floor(position.w ?? 0);
      const v = Math.floor(position.v ?? 0);
      const u = Math.floor(position.u ?? 0);

      const tile = worldWithTiles.getTileAt(x, y, z, w, v, u);

      if (!tile?.fluid || tile.fluid.type !== 'water') continue;

      // Calculate hyperdimensional pressure
      const currentPressure = calculateHyperdimensionalPressure(position);

      // Get neighbor pressures in all dimensions
      const neighborPressures = this.getNeighborPressures(
        worldWithTiles,
        x, y, z, w, v, u,
        dimensions
      );

      // Calculate flow vector in N dimensions
      const flow = calculateHyperdimensionalFlow(currentPressure, neighborPressures);

      // Update tile fluid with hyperdimensional flow
      tile.fluid.flowDirection = { x: flow.x, y: flow.y };
      tile.fluid.flowDirectionW = flow.w;
      tile.fluid.flowDirectionV = flow.v;
      tile.fluid.flowDirectionU = flow.u;

      // Transfer fluid to neighbors (similar to 3D, but in 6 dimensions)
      this.transferHyperdimensionalFluid(
        worldWithTiles,
        x, y, z, w, v, u,
        flow,
        tile
      );
    }
  }

  private getNeighborPressures(
    worldWithTiles: any,
    x: number, y: number, z: number, w: number, v: number, u: number,
    dimensions: number
  ): any {
    const neighbors: any = {};

    // 3D neighbors (always present)
    neighbors.x_pos = this.getPressureAt(worldWithTiles, x + 1, y, z, w, v, u);
    neighbors.x_neg = this.getPressureAt(worldWithTiles, x - 1, y, z, w, v, u);
    neighbors.y_pos = this.getPressureAt(worldWithTiles, x, y + 1, z, w, v, u);
    neighbors.y_neg = this.getPressureAt(worldWithTiles, x, y - 1, z, w, v, u);
    neighbors.z_pos = this.getPressureAt(worldWithTiles, x, y, z + 1, w, v, u);
    neighbors.z_neg = this.getPressureAt(worldWithTiles, x, y, z - 1, w, v, u);

    // 4D neighbors
    if (dimensions >= 4) {
      neighbors.w_pos = this.getPressureAt(worldWithTiles, x, y, z, w + 1, v, u);
      neighbors.w_neg = this.getPressureAt(worldWithTiles, x, y, z, w - 1, v, u);
    }

    // 5D neighbors
    if (dimensions >= 5) {
      neighbors.v_pos = this.getPressureAt(worldWithTiles, x, y, z, w, v + 1, u);
      neighbors.v_neg = this.getPressureAt(worldWithTiles, x, y, z, w, v - 1, u);
    }

    // 6D neighbors
    if (dimensions >= 6) {
      neighbors.u_pos = this.getPressureAt(worldWithTiles, x, y, z, w, v, u + 1);
      neighbors.u_neg = this.getPressureAt(worldWithTiles, x, y, z, w, v, u - 1);
    }

    return neighbors;
  }

  private getPressureAt(
    worldWithTiles: any,
    x: number, y: number, z: number, w: number, v: number, u: number
  ): number | undefined {
    const tile = worldWithTiles.getTileAt(x, y, z, w, v, u);
    if (!tile?.fluid) return undefined;

    return calculateHyperdimensionalPressure({ x, y, z, w, v, u });
  }

  private transferHyperdimensionalFluid(
    worldWithTiles: any,
    x: number, y: number, z: number, w: number, v: number, u: number,
    flow: { x: number; y: number; z: number; w: number; v: number; u: number },
    tile: any
  ): void {
    // Similar to 3D fluid transfer, but in 6 dimensions
    // Transfer small amount of fluid in direction of flow vector

    const flowMagnitude = Math.sqrt(
      flow.x ** 2 + flow.y ** 2 + flow.z ** 2 +
      flow.w ** 2 + flow.v ** 2 + flow.u ** 2
    );

    if (flowMagnitude < 0.01) return; // Too small to matter

    // Normalize flow vector
    const normFlow = {
      x: flow.x / flowMagnitude,
      y: flow.y / flowMagnitude,
      z: flow.z / flowMagnitude,
      w: flow.w / flowMagnitude,
      v: flow.v / flowMagnitude,
      u: flow.u / flowMagnitude,
    };

    // Find target tile (round flow direction to nearest integer)
    const targetX = x + Math.round(normFlow.x);
    const targetY = y + Math.round(normFlow.y);
    const targetZ = z + Math.round(normFlow.z);
    const targetW = w + Math.round(normFlow.w);
    const targetV = v + Math.round(normFlow.v);
    const targetU = u + Math.round(normFlow.u);

    const targetTile = worldWithTiles.getTileAt(targetX, targetY, targetZ, targetW, targetV, targetU);

    if (!targetTile) return; // Out of bounds

    // Transfer fluid (simplified)
    const transferAmount = Math.min(1, tile.fluid.depth * 0.1);

    tile.fluid.depth = Math.max(0, tile.fluid.depth - transferAmount);

    if (!targetTile.fluid) {
      targetTile.fluid = {
        type: 'water',
        depth: 0,
        pressure: 0,
        temperature: tile.fluid.temperature,
        stagnant: false,
        lastUpdate: 0,
      };
    }

    targetTile.fluid.depth = Math.min(7, targetTile.fluid.depth + transferAmount);
  }
}
```

### 6.4 Hyperdimensional Creature Adaptation

**File:** `packages/world/src/alien-generation/creatures/HyperdimensionalCreatures.ts` (new)

```typescript
/**
 * Creatures adapted to hyperdimensional water.
 *
 * Can perceive and navigate 4D-6D spaces.
 * Pressure resistance accounts for all dimensions.
 */

export const HYPERDIMENSIONAL_OCEAN_CREATURES = [
  {
    name: 'Tesseract Jellyfish',
    description: '4D jellyfish that can fold through hyperspace. Appears and disappears as it moves through w-dimension.',
    locomotion: { name: 'Hyperdimensional Drift', mechanism: 'Drifts through w-dimension', speed: 'moderate' },
    size: 'medium',
    diet: 'filter_feeder',
    habitat: '4D ocean',
    depthRange: { xyz: [-1000, 0], w: [-500, 0] },
    pressureAdapted: true,
    maxPressureAtm: 500, // Accounts for 4D pressure
    dimensions: 4,
    traits: ['hyperdimensional_vision', '4D_folding', 'phase_shifting'],
  },

  {
    name: 'Hypersphere Predator',
    description: '5D apex predator. Attacks from w and v dimensions simultaneously. Impossible to escape in 3D.',
    locomotion: { name: '5D Swimming', mechanism: 'Propels through 5 spatial dimensions', speed: 'fast' },
    size: 'large',
    diet: 'carnivore',
    habitat: '5D ocean',
    depthRange: { xyz: [-2000, 0], w: [-1000, 0], v: [-1000, 0] },
    pressureAdapted: true,
    maxPressureAtm: 1000,
    dimensions: 5,
    traits: ['5D_vision', 'hypersphere_rotation', 'dimensional_ambush'],
  },

  {
    name: 'Omnidirectional Filter Feeder',
    description: '6D organism that filters nutrients from all 6 spatial dimensions. Sessile in 3D, mobile in hyperspace.',
    locomotion: { name: '6D Anchoring', mechanism: 'Anchored in xyz, extends into wvu', speed: 'very_slow' },
    size: 'huge',
    diet: 'filter_feeder',
    habitat: '6D ocean',
    depthRange: { xyz: [-500, 0], w: [-1000, 0], v: [-1000, 0], u: [-1000, 0] },
    pressureAdapted: true,
    maxPressureAtm: 2000, // Extreme 6D pressure resistance
    dimensions: 6,
    traits: ['6D_perception', 'hyperspatial_feeding', 'dimensional_anchoring'],
  },
];
```

### 6.5 Acceptance Criteria

- [ ] HyperdimensionalPressure calculation works for 4D-6D
- [ ] Pressure accounts for depth in w, v, u dimensions
- [ ] HyperdimensionalFlowSystem processes 4D-6D tiles
- [ ] Water flows along w-axis (4D)
- [ ] Water flows along v-axis (5D)
- [ ] Water flows along u-axis (6D)
- [ ] Flow calculation uses 6D gradient
- [ ] Hyperdimensional creatures defined
- [ ] 4D jellyfish can navigate w-dimension
- [ ] 5D predator attacks from multiple dimensions
- [ ] 6D filter feeder processes all 6 spatial axes
- [ ] System only activates in universes with spatialDimensions > 3
- [ ] `npm test` passes with 4D/5D/6D flow tests

---

## Performance Analysis

### Challenge: Planetary Scale

**Problem:** Earth-sized planet = 6,371,000 tile radius = ~127 trillion tiles in 2D plane

**Reality Check:**
- Current game: 100x100 chunks loaded = 10,000 tiles active
- Ocean planet: 99% of surface is water
- Cannot simulate all tiles at once

### Solution: Aggressive Level-of-Detail

**LOD Tiers:**

| Distance from Player | Chunks | Tiles | Update Frequency | Simulation |
|---------------------|--------|-------|------------------|------------|
| Local (0-50 chunks) | 7,854 | 251,328 | 4 Hz (250ms) | Full DF-style flow |
| Regional (50-1000 chunks) | 3,141,593 | ~100M | 0.1 Hz (10s) | Macro currents only |
| Far (1000+ chunks) | Billions | Trillions | Never | Static properties |

**Key Optimizations:**

1. **Chunk-Based Spatial Hash:**
   - Only process loaded chunks (7,854 max)
   - 99.999% of ocean ignored

2. **Dirty Flagging:**
   - Static ocean: 0 updates (after equilibrium)
   - Flowing water: ~10% of tiles dirty
   - Result: 25,000 tiles actively simulated (not 251,000)

3. **Batched Updates via StateMutatorSystem:**
   - Depth changes batched to once per game minute
   - 60× reduction in component writes

4. **Multi-LOD Flow:**
   - Local: Detailed pressure (DF algorithm)
   - Regional: Simplified Navier-Stokes (macro currents)
   - Far: No simulation (static depth/pressure)

5. **Vertical Chunking:**
   - Ocean depth -6,000m → 6,000 vertical "slices"
   - Only simulate z-levels with loaded chunks
   - 99% of vertical depth ignored

### Performance Budget

| System | Update Freq | Tiles Processed | Cost/Tile | Total Cost |
|--------|-------------|-----------------|-----------|------------|
| OceanBiomeSystem | 1/min | 25,000 (dirty) | 0.01ms | 250ms |
| PressureSystem | 1s | 100 (agents) | 0.1ms | 10ms |
| LightPenetrationSystem | 1/min | 25,000 (dirty) | 0.005ms | 125ms |
| PlanetaryFlowSystem (Local) | 4 Hz | 2,500 (dirty) | 0.05ms | 125ms |
| PlanetaryFlowSystem (Regional) | 0.1 Hz | 100,000 (zones) | 0.001ms | 100ms |
| TidalSystem | 1/min | 5,000 (coastal) | 0.01ms | 50ms |
| ThermalConvectionSystem | 1/hour | 25,000 (all) | 0.005ms | 125ms |
| UnderwaterLifeSystem | 20 Hz | 500 (plants) | 0.1ms | 50ms |
| AgentSwimmingSystem | 20 Hz | 100 (agents) | 0.1ms | 10ms |
| HyperdimensionalFlowSystem | 2 Hz | 10 (rare) | 0.5ms | 5ms |
| **Total** | | | | **~850ms/min** |

**Per-Tick Budget:** 850ms / 1200 ticks = **0.7ms/tick**

**Budget:** 50ms/tick (20 TPS), **0.7ms used (1.4%)** ✅

**Conclusion:** System is performant even with planetary-scale oceans.

---

## Testing Strategy

### Unit Tests

```typescript
// packages/world/src/ocean/__tests__/OceanBiomes.test.ts

describe('Ocean Biomes', () => {
  it('should classify ocean zones correctly', () => {
    expect(getBiomeZoneForDepth(-50)?.name).toBe('Epipelagic Zone');
    expect(getBiomeZoneForDepth(-500)?.name).toBe('Mesopelagic Zone');
    expect(getBiomeZoneForDepth(-2000)?.name).toBe('Bathypelagic Zone');
    expect(getBiomeZoneForDepth(-5000)?.name).toBe('Abyssal Zone');
    expect(getBiomeZoneForDepth(-8000)?.name).toBe('Hadal Zone');
  });

  it('should calculate light decay exponentially', () => {
    expect(calculateLightLevel(0)).toBeCloseTo(100, 0);
    expect(calculateLightLevel(-50)).toBeCloseTo(37, 0);
    expect(calculateLightLevel(-200)).toBeCloseTo(2, 0);
    expect(calculateLightLevel(-300)).toBeCloseTo(0.2, 1);
  });

  it('should calculate pressure correctly', () => {
    expect(calculatePressure(0)).toBeCloseTo(1, 0); // 1 atm at surface
    expect(calculatePressure(-10)).toBeCloseTo(2, 0); // 2 atm at 10m
    expect(calculatePressure(-1000)).toBeCloseTo(101, 0); // 101 atm at 1000m
  });

  it('should calculate temperature with thermocline', () => {
    expect(calculateTemperature(0, 20)).toBeCloseTo(20, 0);
    expect(calculateTemperature(-50, 20)).toBeCloseTo(20, 0);
    expect(calculateTemperature(-125, 20)).toBeCloseTo(15, 0);
    expect(calculateTemperature(-200, 20)).toBeCloseTo(10, 0);
    expect(calculateTemperature(-6000, 20)).toBeCloseTo(2, 0);
  });
});

// packages/core/src/systems/__tests__/PressureSystem.test.ts

describe('PressureSystem', () => {
  it('should damage agent in high pressure', () => {
    // Setup: agent at -2000m (200 atm pressure)
    // Agent has no pressure protection
    // Expected: 1 HP damage per second
  });

  it('should not damage pressure-adapted creature', () => {
    // Setup: bathypelagic creature at -3000m (300 atm)
    // Creature has maxPressureAtm: 400
    // Expected: No damage
  });

  it('should reduce swim speed with pressure', () => {
    // Setup: agent at -1000m (100 atm)
    // Expected: speedMultiplier reduced by pressure density
  });
});

// packages/core/src/systems/__tests__/HyperdimensionalFlow.test.ts

describe('HyperdimensionalFlowSystem', () => {
  it('should calculate 4D pressure', () => {
    const pressure = calculateHyperdimensionalPressure({
      x: 0, y: 0, z: -100, w: -100
    });
    // Expected: sqrt(100^2 + 100^2) = 141m effective depth
    expect(pressure).toBeGreaterThan(14);
  });

  it('should flow along w-dimension', () => {
    // Setup: 4D tile with pressure gradient in w
    // Expected: flow vector has non-zero w component
  });

  it('should skip in 3D universes', () => {
    // Setup: universe with spatialDimensions = 3
    // Expected: HyperdimensionalFlowSystem does nothing
  });
});
```

### Integration Tests

```typescript
// packages/core/src/__tests__/PlanetaryWaterIntegration.test.ts

describe('Planetary Water Physics Integration', () => {
  it('should maintain 20 TPS with 250k ocean tiles', () => {
    // Setup: generate ocean planet with 500x500 chunk area
    // Run: 100 ticks
    // Assert: average tick time < 50ms
  });

  it('should kill agent at extreme depth without protection', () => {
    // Setup: agent at -5000m (abyssal zone) without deep-sea suit
    // Run: 10 seconds (200 ticks)
    // Assert: agent HP = 0 (pressure death)
  });

  it('should allow submarine to reach hadal zone', () => {
    // Setup: agent in submarine (titanium hull, pressureSuitRating: 700)
    // Move to -7000m (hadal zone)
    // Assert: agent alive, submarine intact
  });

  it('should create upwelling at thermal vent', () => {
    // Setup: thermal vent at -6000m with 350°C water
    // Run: 1 game hour
    // Assert: convectionVelocityZ > 0 (upward flow)
  });

  it('should cause decompression sickness on rapid ascent', () => {
    // Setup: agent at -1000m
    // Rapidly ascend to surface (50m/s)
    // Assert: agent takes decompression damage, movement penalty
  });

  it('should support kelp growth in epipelagic zone', () => {
    // Setup: kelp at -50m (light level 37%)
    // Run: 10 game minutes
    // Assert: kelp growth increases
  });

  it('should kill kelp in bathypelagic zone', () => {
    // Setup: kelp at -2000m (light level 0%)
    // Run: 10 game minutes
    // Assert: kelp HP decreases (death from darkness)
  });

  it('should spawn bioluminescent creatures in mesopelagic', () => {
    // Setup: mesopelagic zone chunk
    // Generate creatures
    // Assert: at least 50% have bioluminescence component
  });
});
```

---

## Phased Implementation Roadmap

### Phase 1: Vertical Ocean Biomes (2 weeks)
- [ ] Extend z-levels to -11,000
- [ ] Define 5 ocean biome zones
- [ ] Implement light/temperature/pressure calculations
- [ ] Update TerrainGenerator to create deep ocean
- [ ] Add biome zone detection
- **Deliverable:** Ocean tiles have depth zones with accurate physics

### Phase 2: Pressure System (1 week)
- [ ] Implement PressureSystem
- [ ] Add pressure damage to agents
- [ ] Create pressure-resistant materials
- [ ] Implement DecompressionSystem
- [ ] Add equipment (pressure suits, submarines)
- **Deliverable:** Agents die in deep water without protection

### Phase 3: Light & Temperature (1 week)
- [ ] Implement LightPenetrationSystem
- [ ] Add bioluminescence component
- [ ] Generate thermal vents
- [ ] Calculate thermocline temperature gradient
- **Deliverable:** Light decays with depth, vents produce heat

### Phase 4: Underwater Life (2 weeks)
- [ ] Create 25 ocean creature templates (5 per zone)
- [ ] Implement UnderwaterPlantSystem
- [ ] Add kelp/seagrass (photosynthetic)
- [ ] Add chemosynthetic bacteria (vents)
- [ ] Enhance AgentSwimmingSystem with depth mechanics
- **Deliverable:** Depth-adapted creatures spawn in correct zones

### Phase 5: Planetary-Scale Flow (3 weeks)
- [ ] Implement PlanetaryFlowSystem with 3-LOD
- [ ] Add regional macro currents (Coriolis effect)
- [ ] Add local detailed flow (DF pressure model)
- [ ] Implement TidalSystem
- [ ] Implement ThermalConvectionSystem
- **Deliverable:** Ocean currents flow, tides rise/fall

### Phase 6: Higher-Dimensional Fluids (2 weeks)
- [ ] Implement HyperdimensionalPressure
- [ ] Implement HyperdimensionalFlowSystem
- [ ] Create 4D/5D/6D creature templates
- [ ] Add w/v/u flow vectors to tiles
- [ ] Test in 4D/5D/6D universes
- **Deliverable:** Water flows in 4D-6D spaces

**Total Timeline:** 11 weeks

---

## Open Questions

1. **Ocean Planet Generation:**
   - Should terrain generation support 100% water planets?
   - How to generate ocean floor topography (seamounts, trenches)?
   - **Recommendation:** Add ocean-specific noise layers for bathymetry

2. **Z-Level Performance:**
   - Does extending z-levels to -11,000 impact pathfinding?
   - Current systems assume small z-ranges (-15 to +50)
   - **Recommendation:** Underwater pathfinding uses horizontal only (fish don't path through 1000s of z-levels)

3. **Infinite Ocean Depth:**
   - Should hadal zones be truly infinite (beyond -11,000)?
   - Could model "abyssal void" where depth → ∞
   - **Recommendation:** Cap at -11,000 for sanity, add "void" biome for lore

4. **Hyperdimensional Rendering:**
   - How to render 4D-6D water in 2D viewport?
   - Show w/v/u as color channels? Slice viewer?
   - **Recommendation:** Phase 6 includes renderer design spec

5. **Ocean-Land Transition:**
   - How does water interact with land at edges?
   - Beaches, tidal zones, estuaries?
   - **Recommendation:** Phase 7 feature (after Phase 1-6)

6. **Submarine Building:**
   - Should players build submarines like voxel buildings?
   - Mobile entities vs. stationary structures?
   - **Recommendation:** Phase 8 feature (submarine crafting system)

7. **Aquatic Agriculture:**
   - Can players farm kelp/seaweed?
   - Underwater farms with irrigation from currents?
   - **Recommendation:** Integrate with botany package in Phase 9

8. **Ocean Events:**
   - Tsunamis, whirlpools, underwater volcanoes?
   - Whale migrations, predator spawning?
   - **Recommendation:** Phase 10 feature (dynamic events)

---

## Success Metrics

### Performance
- ✅ 20 TPS with 250,000 ocean tiles loaded
- ✅ < 2% CPU increase from water physics
- ✅ Memory usage < +100MB for ocean state
- ✅ LOD system scales to millions of tiles (far ocean)

### Gameplay
- ✅ Players can explore 5 distinct ocean biomes
- ✅ Deep diving requires pressure-resistant equipment
- ✅ Bioluminescent creatures visible in dark zones
- ✅ Thermal vents support unique ecosystems
- ✅ Ocean currents visibly flow across regions
- ✅ Tides rise and fall on 12-hour cycle

### Emergent Behavior
- ✅ Players build deep-sea bases with reinforced materials
- ✅ Rapid ascent causes decompression sickness (interesting risk)
- ✅ Kelp farming in epipelagic zone
- ✅ Chemosynthetic agriculture at thermal vents
- ✅ Ocean exploration becomes viable gameplay loop
- ✅ Hyperdimensional water creates unique 4D-6D challenges

---

## Technical Challenges

### 1. Z-Level Pathfinding
**Challenge:** Current pathfinding assumes small z-ranges (-15 to +50).
**Impact:** Swimming creatures need to path through 1000s of z-levels.
**Solution:** Horizontal-only pathfinding for fish. Vertical movement is simple "swim up/down" behavior, not A* pathfinding.

### 2. Vertical Chunk Loading
**Challenge:** Loading 6,000 z-levels of chunks = massive memory.
**Impact:** Cannot load all vertical slices at once.
**Solution:** Only load z-levels with entities/POI. Most ocean depth is empty water (static properties).

### 3. Hyperdimensional Rendering
**Challenge:** Cannot visualize 4D-6D water in 2D viewport.
**Impact:** Players can't see w/v/u depth or flow.
**Solution:**
- Show w-depth as color gradient (blue → deep blue)
- v/u-depth as particle effects
- 4D slice viewer (show xy plane at specific w-depth)

### 4. Conservation of Water Volume
**Challenge:** Planetary-scale flow must conserve total water volume.
**Impact:** Water could accumulate or disappear due to rounding errors.
**Solution:** Periodic volume audits. If total depth deviates > 1%, apply correction factor to all tiles.

### 5. Performance of 6D Flow
**Challenge:** 6D flow requires checking 12 neighbors (±x, ±y, ±z, ±w, ±v, ±u).
**Impact:** 6× more neighbor checks than 3D.
**Solution:** Only activate in 6D universes (rare). Use coarse update frequency (2 Hz instead of 4 Hz).

---

## Design Decisions

### Decision 1: Z-Level Extension
**Choice:** Extend z-levels to -11,000 (Mariana Trench depth)
**Rationale:** Real-world oceanography provides concrete depth zones. Makes ocean exploration feel grounded.
**Alternative:** Abstract depth (shallow/mid/deep) without specific z-levels
**Trade-off:** Requires updating z-level enums, but provides richer simulation

### Decision 2: LOD-Based Flow
**Choice:** 3-tier LOD (far/regional/local)
**Rationale:** Only way to simulate planetary-scale oceans at 20 TPS
**Alternative:** Uniform detailed flow everywhere (impossible)
**Trade-off:** Far ocean is static, but player never sees it anyway

### Decision 3: Pressure Damage
**Choice:** Exponential damage (1 HP/s → 20 HP/s)
**Rationale:** Creates clear depth zones. Bathypelagic = dangerous, hadal = death
**Alternative:** Linear damage (boring, no risk curve)
**Trade-off:** Requires careful balancing of pressure resistance equipment

### Decision 4: Bioluminescence Component
**Choice:** Dedicated component for light-producing creatures
**Rationale:** Core feature of deep ocean. Enables hunting mechanics, communication
**Alternative:** Generic "light source" component (less flavorful)
**Trade-off:** Adds complexity, but creates unique deep-sea atmosphere

### Decision 5: Hyperdimensional Water
**Choice:** Full 6D flow with w/v/u axes
**Rationale:** Game engine supports 6D space. Ocean should too.
**Alternative:** 3D water only (simpler, less interesting)
**Trade-off:** Complex to render, but creates unique 4D+ gameplay

### Decision 6: Thermocline Model
**Choice:** Use real thermocline (20°C → 10°C → 2°C)
**Rationale:** Creates realistic temperature zones. Affects creature distribution
**Alternative:** Constant cold (unrealistic)
**Trade-off:** Slightly more computation, but scientifically grounded

### Decision 7: Decompression Sickness
**Choice:** Implement "the bends" for rapid ascent
**Rationale:** Adds risk to deep diving. Encourages slow, careful exploration
**Alternative:** No decompression (less realistic)
**Trade-off:** Adds system complexity, but creates interesting risk/reward

---

## References

### Oceanography
- NOAA Ocean Zones: https://oceanservice.noaa.gov/facts/ocean-zones.html
- Mariana Trench: 10,994m depth (deepest known point)
- Thermocline: rapid temperature drop at 50-200m depth
- Bioluminescence: 90% of deep-sea creatures produce light

### Game Design
- **Dwarf Fortress**: Pressure-based fluid flow, depth 0-7 scale
- **Subnautica**: Vertical ocean biomes (Safe Shallows → Void)
- **No Man's Sky**: Planetary-scale generation with LOD
- **Space Engine**: 6D hypersurface rendering (inspiration for 4D-6D water)

### Physics
- **Beer-Lambert Law**: Light decay I(z) = I₀ * e^(-kz)
- **Hydrostatic Pressure**: P = ρgh (1 atm per 10m depth)
- **Coriolis Effect**: f = 2Ωsin(φ) (latitude-dependent currents)
- **Navier-Stokes**: Fluid dynamics (simplified for regional currents)

### Implementation Patterns
- **StateMutatorSystem**: Batched delta updates (used for depth changes)
- **SimulationScheduler**: Entity culling (used for LOD)
- **Chunk-based spatial hash**: Fast neighbor lookup (used for flow)

---

## Appendix A: Code Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| PositionComponent | `packages/core/src/components/PositionComponent.ts` | Z-level classification |
| FluidLayer | `packages/world/src/chunks/Tile.ts` | Tile fluid properties |
| TerrainGenerator | `packages/world/src/terrain/TerrainGenerator.ts` | Ocean depth generation |
| OceanBiomes | `packages/world/src/ocean/OceanBiomes.ts` | Biome zone definitions |
| PressureSystem | `packages/core/src/systems/PressureSystem.ts` | Depth-based pressure effects |
| PlanetaryFlowSystem | `packages/core/src/systems/PlanetaryFlowSystem.ts` | Multi-LOD flow simulation |
| HyperdimensionalFlow | `packages/core/src/systems/HyperdimensionalFlowSystem.ts` | 4D-6D water physics |
| UniversePhysicsConfig | `packages/core/src/config/UniversePhysicsConfig.ts` | Dimensional configuration |
| HorizonCalculator | `packages/world/src/terrain/HorizonCalculator.ts` | Planetary curvature |

---

## Appendix B: Ocean Biome Zone Reference

| Zone | Depth Range | Light | Temp | Pressure | Key Features |
|------|-------------|-------|------|----------|--------------|
| **Epipelagic** | 0 to -200m | 100-2% | 10-25°C | 1-20 atm | Photosynthesis, kelp forests, most life |
| **Mesopelagic** | -200 to -1000m | 2-0% | 5-15°C | 20-100 atm | Twilight, bioluminescence begins |
| **Bathypelagic** | -1000 to -4000m | 0% | 0-5°C | 100-400 atm | Midnight zone, anglerfish, alien forms |
| **Abyssal** | -4000 to -6000m | 0% | 0-3°C | 400-600 atm | Seafloor, scavengers, whale falls |
| **Hadal** | -6000 to -11000m | 0% | 1-4°C | 600-1100 atm | Trenches, thermal vents, chemosynthesis |

---

## Appendix C: Material Pressure Ratings

| Material | Max Pressure | Max Depth | Use Case |
|----------|-------------|-----------|----------|
| Wood | 5 atm | -50m | Shallow rafts |
| Stone | 50 atm | -500m | Shallow underwater bases |
| Metal (iron) | 100 atm | -1000m | Mesopelagic structures |
| Reinforced Steel | 300 atm | -3000m | Bathypelagic bases |
| Titanium Alloy | 700 atm | -7000m | Deep-sea submarines |
| Transparent Aluminum | 700 atm | -7000m | Submarine viewports |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-12 | 1.0 | Initial draft - planetary-scale water physics with 6D support |

---

**Next Steps:**
1. Review spec with development team
2. Create Phase 1 implementation tasks (z-level extension)
3. Prototype ocean biome generation
4. Stress test with 250k tiles
5. Design 4D water renderer (Phase 6)

---

## Summary: What Makes This Spec Unique?

1. **Planetary Scale**: Handles millions of tiles across 6,371,000-tile radius planets
2. **Vertical Biomes**: 5 realistic ocean zones from sunlit to hadal trenches
3. **Scientific Grounding**: Real physics (Beer-Lambert, thermocline, pressure = ρgh)
4. **Performance-First**: 3-LOD approach (far/regional/local) keeps 20 TPS
5. **Hyperdimensional**: Water flows in 4D-6D spaces with cross-dimensional pressure
6. **Emergent Gameplay**: Deep-sea bases, bioluminescent hunting, chemosynthetic farms
7. **Dwarf Fortress Heritage**: Pressure-based flow, depth conservation, emergent flooding
8. **Subnautica-Inspired**: Depth zones create exploration progression

**Hardest Technical Challenge:**
Maintaining 20 TPS with millions of ocean tiles. Solved via LOD (99.999% of ocean is static), dirty flagging (only flowing water updates), and batched updates (StateMutatorSystem).

**Phase 1 Focus:**
Extend z-levels to -11,000, define 5 ocean biomes, implement light/pressure/temperature calculations. This creates the foundation for all other phases.
