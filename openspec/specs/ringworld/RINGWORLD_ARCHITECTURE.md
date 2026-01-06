# Ringworld Architecture Specification

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-06

## Overview

This specification defines the architecture for supporting ringworld-scale gameplay through hierarchical coordinates, region abstraction, and procedural generation. The system enables effectively infinite exploration while maintaining performance and minimal storage requirements.

## Design Philosophy

**Key Insight:** Don't simulate the entire ringworld - simulate **one region at a time** and abstract everything else.

- **Active Region:** Fully simulated with entities, LLM calls, physics (50MB memory)
- **Abstract Regions:** Production/consumption rates only (2KB each)
- **Unvisited Regions:** Don't exist yet (0 bytes)

**Visual Flavor:** Skybox shows ring curvature, distant megastructures, and opposite side of ring.

**Technical Reality:** Flat 2D world with region swapping. Player never knows the difference.

## Hierarchical Coordinate System

### Address Structure

```typescript
interface RingworldAddress {
  megasegment: number;  // 0-999 (1000 megasegments around ring)
  region: number;       // 0-99 (100 regions per megasegment)
  chunk: number;        // Chunk within region (standard chunk coords)
  tile: Position;       // Tile within chunk
}

// Example: "The Ancient Landing Platform"
const address: RingworldAddress = {
  megasegment: 7,
  region: 23,
  chunk: 56,
  tile: { x: 10, y: 15 }
};
```

### Coordinate Conversion

```typescript
// World coordinates to hierarchical address
function worldToAddress(worldX: number, worldY: number): RingworldAddress {
  const megasegment = Math.floor(worldX / MEGASEGMENT_WIDTH);
  const localX = worldX % MEGASEGMENT_WIDTH;
  const region = Math.floor(localX / REGION_WIDTH);
  const chunkX = Math.floor((localX % REGION_WIDTH) / CHUNK_SIZE);
  const tileX = localX % CHUNK_SIZE;

  return {
    megasegment,
    region,
    chunk: chunkX,
    tile: { x: tileX, y: worldY % CHUNK_SIZE }
  };
}

// Hierarchical address to world coordinates
function addressToWorld(address: RingworldAddress): Position {
  const x =
    address.megasegment * MEGASEGMENT_WIDTH +
    address.region * REGION_WIDTH +
    address.chunk * CHUNK_SIZE +
    address.tile.x;

  return { x, y: address.tile.y };
}
```

### Scale Constants

```typescript
export const RINGWORLD_SCALE = {
  // Tile size: ~3 meters
  TILE_SIZE: 3,

  // Chunk: 32×32 tiles = 96m × 96m
  CHUNK_SIZE: 32,

  // Region: 1000 chunks wide = 96km wide
  REGION_WIDTH: 1000 * 32,
  REGION_HEIGHT: 200 * 32, // ~6km tall (ring width)

  // Megasegment: 100 regions = 9,600km
  MEGASEGMENT_WIDTH: 100 * 1000 * 32,

  // Total ring: 1000 megasegments = 9.6 million km circumference
  TOTAL_MEGASEGMENTS: 1000,
  RING_CIRCUMFERENCE: 1000 * 100 * 1000 * 32 * 3, // ~9.6M km

  // For reference: Earth circumference = 40,075 km
  // This ring is ~240× Earth's circumference
};
```

## Region Template System

### Template Structure

```typescript
interface RegionTemplate {
  id: string;
  type: RegionType;

  // Visual/terrain
  biome: BiomeType;
  terrainSeed: number;
  skyboxTheme: 'ruins' | 'pristine' | 'industrial' | 'organic';

  // Content generation
  structures: StructureTemplate[];
  resources: ResourceDistribution;
  wildlife: WildlifeDistribution;

  // Population
  population: {
    min: number;
    max: number;
    culture: CultureTemplate;
    techLevel: number; // 0-10
  };

  // Special features
  megastructures: MegastructureFeature[];
  landmarks: Landmark[];

  // Lore
  name: string;
  description: string;
  history: string;
}

type RegionType =
  | 'ancient_ruins'        // High-tech remnants
  | 'wilderness'           // Untamed nature
  | 'settlement'           // Active civilization
  | 'wasteland'            // Hostile/barren
  | 'ocean_sector'         // Water-covered
  | 'industrial_complex'   // Factories, production
  | 'sacred_site'          // Religious significance
  | 'laboratory'           // Research facility
  | 'agricultural_zone'    // Farming/food production
  | 'void_touched';        // Reality corruption
```

### Template Examples

```typescript
const TEMPLATE_LIBRARY: RegionTemplate[] = [
  {
    id: 'ancient_landing_platform',
    type: 'ancient_ruins',
    biome: 'barren',
    terrainSeed: 0, // Will be hashed with coords
    skyboxTheme: 'ruins',

    structures: [
      { type: 'landing_dais', density: 0.01 },
      { type: 'control_tower', density: 0.005 },
      { type: 'hangar', density: 0.02 },
      { type: 'maintenance_bay', density: 0.03 }
    ],

    resources: {
      'ancient_tech': { abundance: 0.8, depletion: 0.1 },
      'metal_scrap': { abundance: 0.6, depletion: 0.05 },
      'energy_cells': { abundance: 0.3, depletion: 0.2 }
    },

    wildlife: {
      'scavenger_bot': { density: 0.02, hostile: false },
      'security_drone': { density: 0.01, hostile: true }
    },

    population: {
      min: 0,
      max: 50,
      culture: 'tech_scavengers',
      techLevel: 7
    },

    megastructures: [
      { type: 'orbital_tether', position: { x: 500, y: 100 } }
    ],

    landmarks: [
      { name: 'The Great Spire', description: 'A 2km tall comm tower' }
    ],

    name: 'The Forgotten Spaceport',
    description: 'Ancient landing platforms where the Builders once arrived',
    history: 'Built 10,000 years ago during the Ring\'s construction phase'
  },

  {
    id: 'crystal_wastes',
    type: 'wasteland',
    biome: 'alien',
    terrainSeed: 0,
    skyboxTheme: 'organic',

    structures: [
      { type: 'crystal_formation', density: 0.1 },
      { type: 'energy_nexus', density: 0.005 }
    ],

    resources: {
      'crystal_shard': { abundance: 0.9, depletion: 0.0 }, // Renewable
      'exotic_matter': { abundance: 0.1, depletion: 0.5 }
    },

    wildlife: {
      'crystal_entity': { density: 0.05, hostile: true }
    },

    population: {
      min: 0,
      max: 10,
      culture: 'crystal_monks',
      techLevel: 3
    },

    megastructures: [],
    landmarks: [
      { name: 'The Singing Spire', description: 'Resonates with harmonic frequencies' }
    ],

    name: 'The Crystal Wastes',
    description: 'A region where exotic physics have crystallized reality itself',
    history: 'Created by an experiment gone wrong 3,000 years ago'
  },

  {
    id: 'agricultural_paradise',
    type: 'agricultural_zone',
    biome: 'temperate',
    terrainSeed: 0,
    skyboxTheme: 'pristine',

    structures: [
      { type: 'farmhouse', density: 0.05 },
      { type: 'barn', density: 0.03 },
      { type: 'granary', density: 0.02 },
      { type: 'irrigation_hub', density: 0.01 }
    ],

    resources: {
      'fertile_soil': { abundance: 1.0, depletion: 0.0 },
      'fresh_water': { abundance: 0.9, depletion: 0.1 },
      'timber': { abundance: 0.6, depletion: 0.2 }
    },

    wildlife: {
      'deer': { density: 0.1, hostile: false },
      'rabbit': { density: 0.2, hostile: false },
      'wolf': { density: 0.02, hostile: true }
    },

    population: {
      min: 500,
      max: 2000,
      culture: 'agrarian_collective',
      techLevel: 4
    },

    megastructures: [
      { type: 'weather_control_tower', position: { x: 300, y: 150 } }
    ],

    landmarks: [
      { name: 'The Eternal Harvest Fields', description: 'Crops grow year-round' }
    ],

    name: 'The Greenlands',
    description: 'Engineered paradise of endless fertility',
    history: 'Terraformed 5,000 years ago as a food production zone'
  }
];
```

### Template Selection Algorithm

```typescript
function selectRegionTemplate(megasegment: number, region: number): RegionTemplate {
  // Hash coordinates to deterministically select template
  const hash = hashCoords(megasegment, region);

  // Use hash to select from template library
  const templateIndex = hash % TEMPLATE_LIBRARY.length;
  const baseTemplate = TEMPLATE_LIBRARY[templateIndex];

  // Add coordinate-specific seed
  const template = { ...baseTemplate };
  template.terrainSeed = hashSeed(megasegment, region, baseTemplate.id);

  return template;
}

function hashCoords(megasegment: number, region: number): number {
  // Simple hash - could use better algorithm
  return (megasegment * 100 + region) * 2654435761;
}

function hashSeed(megasegment: number, region: number, templateId: string): number {
  const str = `${templateId}_${megasegment}_${region}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

## Region States

### Active Region (Fully Simulated)

```typescript
interface ActiveRegion {
  address: RingworldAddress;
  template: RegionTemplate;

  // Full ECS world
  world: World;

  // Chunk management
  chunkManager: ChunkManager;
  terrainGenerator: TerrainGenerator;

  // Entities (fully simulated)
  entities: Map<EntityId, Entity>;

  // Systems running
  systems: System[];

  // Current state
  tick: number;
  resources: Map<string, number>;
}
```

### Abstract Region (Production Rates Only)

```typescript
interface AbstractRegion {
  address: RingworldAddress;
  template: RegionTemplate;

  // Aggregate state (NO individual entities)
  population: number;
  buildings: Map<string, number>; // building type -> count

  // Resources
  resources: Map<string, number>;

  // Production/consumption rates (per day)
  production: Map<string, number>;
  consumption: Map<string, number>;

  // Overall state
  techLevel: number;
  governance: 'stable' | 'growth' | 'declining' | 'chaos';
  mood: number; // -100 to +100

  // Timing
  lastSimulatedTick: number;

  // For re-hydration
  seed: number;
}
```

## Storage Requirements

### Comparison

**Active Region:**
- Entities: ~1000 entities × 2KB = 2MB
- Chunks: 100 chunks × 50KB = 5MB
- Systems: 1MB
- **Total: ~8MB**

**Abstract Region:**
- Template reference: 8 bytes
- Aggregate stats: ~1KB
- Production rates: ~500 bytes
- **Total: ~2KB**

**Unvisited Region:**
- **Total: 0 bytes** (doesn't exist until generated)

### Scaling

```
1 active region:        8 MB
100 abstract regions:   200 KB
900 unvisited regions:  0 KB
-----------------------------------
Total memory:           ~8.2 MB

Compare to full simulation:
1000 regions × 8MB = 8 GB (impossible!)
```

## Region Transitions

### Trigger Conditions

Region transition occurs when:
1. Player crosses region boundary
2. Player uses fast travel
3. Time skip to different location

### Transition Sequence

```typescript
async function transitionRegion(
  from: RingworldAddress,
  to: RingworldAddress
): Promise<void> {
  // 1. Abstract current region
  const abstract = abstractActiveRegion(activeRegion);
  abstractRegions.set(regionKey(from), abstract);

  // 2. Save player delta for current region
  saveDeltasForRegion(from);

  // 3. Unload current region
  unloadRegion(activeRegion);

  // 4. Check if destination has been visited
  const existingAbstract = abstractRegions.get(regionKey(to));

  if (existingAbstract) {
    // 5a. Re-hydrate from abstract state
    activeRegion = await hydrateRegion(existingAbstract);
  } else {
    // 5b. Generate fresh region
    activeRegion = await generateRegion(to);
  }

  // 6. Load player delta for new region
  loadDeltasForRegion(to);

  // 7. Notify systems
  eventBus.emit('region:transition', { from, to });
}
```

## Performance Targets

- **Region abstraction:** < 10ms
- **Region hydration:** < 500ms (with loading screen)
- **Tick abstract regions:** < 1ms for 1000 regions
- **Memory usage:** < 50MB total (1 active + 100 abstract regions)
- **Save size:** < 10MB for 100 visited regions + deltas

## Implementation Phases

### Phase 1: Foundation
- [ ] Hierarchical coordinate system
- [ ] RingworldAddress type
- [ ] Coordinate conversion utilities
- [ ] Region template data structure

### Phase 2: Region Management
- [ ] AbstractRegion type
- [ ] Region abstraction logic
- [ ] Region hydration logic
- [ ] Region transition system

### Phase 3: Template System
- [ ] Template library (50+ templates)
- [ ] Template selection algorithm
- [ ] Template-based generation

### Phase 4: Visual Effects
- [ ] Ringworld skybox renderer
- [ ] Curvature effects
- [ ] Megastructures UI

### Phase 5: Optimization
- [ ] Production rate calculation
- [ ] Fast-forward simulation
- [ ] Delta compression

## Success Criteria

- ✅ Player can explore 1000+ regions without performance degradation
- ✅ Memory usage stays under 50MB regardless of regions visited
- ✅ Save files stay under 10MB for typical gameplay
- ✅ Region transitions take < 500ms
- ✅ Each region feels unique and handcrafted
- ✅ Player perceives continuous world (no "loading" feel)

## Future Extensions

- **Inter-region trade:** Abstract regions trade resources via production/consumption
- **Migration:** Population moves between regions based on conditions
- **Regional events:** Wars, plagues, golden ages affect multiple regions
- **Ring-wide phenomena:** Weather patterns, orbital cycles, shadow square mechanics
- **Multiplayer regions:** Multiple players in same abstract region update shared state
