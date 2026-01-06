# Hierarchical Abstraction System: From Gigasegments to Tiles

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-06
**Inspired by:** Stellaris (sectors), Dwarf Fortress (nested simulation), Elite (galaxy-scale), Ringworld (megastructure scale)

## Overview

This specification defines a **7-tier hierarchical coordinate system** supporting everything from ringworld-scale megastructures to individual tiles, with **fractal abstraction** at every level. Only the active zone is fully simulated; everything else exists as **production rates, populations, and trade flows**.

## The Scale Ladder

### Tier 1: Gigasegment (Highest Abstraction)
- **Scale:** 10,000 megasegments × ~1 trillion km² each
- **Population:** Billions to trillions
- **Simulation:** Pure statistics (production, consumption, trade)
- **Example:** "Galactic Arm Segment 7" or "Ringworld Quarter Alpha"

### Tier 2: Megasegment
- **Scale:** 100 sub-sections × ~10 billion km² each
- **Population:** Hundreds of millions to low billions
- **Simulation:** Aggregate production + major trade routes
- **Example:** "Industrial Heartland" or "Agricultural Expanse 42"

### Tier 3: Sub-section (Planet-sized)
- **Scale:** 1000 regions × ~10 million km²
- **Population:** 10-500 million (planet-city scale)
- **Simulation:** City-level abstraction, import/export
- **Example:** "Coruscant-Alpha" or "Trantor Sub-section 7"

### Tier 4: Region
- **Scale:** 100 zones × ~100,000 km²
- **Population:** 100K - 10M
- **Simulation:** District-level (industrial, residential, agricultural)
- **Example:** "Industrial District 23" or "Spaceport Region"

### Tier 5: Zone
- **Scale:** 1000 chunks × ~1000 km²
- **Population:** 1K - 100K
- **Simulation:** Building-cluster abstraction
- **Example:** "Factory Complex A7" or "Residential Tower Block"

### Tier 6: Chunk (Transition to Full Simulation)
- **Scale:** 32×32 tiles = 1024 tiles (~3 km²)
- **Population:** 0-1000
- **Simulation:** **Full ECS** - individual entities spawn here
- **Example:** "City block with 50 buildings, 200 agents"

### Tier 7: Tile (Lowest Level)
- **Scale:** 3m × 3m
- **Population:** 0-10
- **Simulation:** Full physics, pathfinding, LLM calls
- **Example:** "Floor tile in building, 2 agents standing on it"

## Coordinate System

### Hierarchical Address

```typescript
interface UniversalAddress {
  // Tier 1: Gigasegment
  gigasegment: number;      // 0-9999

  // Tier 2: Megasegment within gigasegment
  megasegment: number;      // 0-99

  // Tier 3: Sub-section within megasegment
  subsection: number;       // 0-999

  // Tier 4: Region within sub-section
  region: number;           // 0-99

  // Tier 5: Zone within region
  zone: number;             // 0-999

  // Tier 6: Chunk within zone
  chunk: { x: number; y: number };

  // Tier 7: Tile within chunk
  tile: { x: number; y: number };

  // Optional: Higher dimensions
  w?: number;               // 4D W-coordinate
  v?: number;               // 5D V-coordinate (multiverse)
}
```

### Example Addresses

```typescript
// A specific tile in a city on a planet-city in the ringworld
const myLocation: UniversalAddress = {
  gigasegment: 7,           // Ringworld Quarter Alpha
  megasegment: 42,          // The Industrial Heartland
  subsection: 156,          // Coruscant-Alpha (planet-city)
  region: 23,               // Spaceport District
  zone: 89,                 // Terminal 4 Complex
  chunk: { x: 12, y: 7 },   // Specific city block
  tile: { x: 5, y: 10 }     // Tile in that block
};

// Human-readable: "Gigaseg 7, Megaseg 42, Subsection 156, Region 23, Zone 89, Chunk (12,7), Tile (5,10)"
// Lore: "Terminal 4 landing pad, Spaceport District, Coruscant-Alpha"
```

## Renormalization Interfaces

### Coordinate Transformation Chain

```typescript
class CoordinateNormalizer {
  // Convert from tile to universal address
  tileToUniversal(
    tileX: number,
    tileY: number,
    context: ActiveZone
  ): UniversalAddress {
    // Work backwards up the hierarchy
    const chunkX = Math.floor(tileX / CHUNK_SIZE);
    const chunkY = Math.floor(tileY / CHUNK_SIZE);
    const localTileX = tileX % CHUNK_SIZE;
    const localTileY = tileY % CHUNK_SIZE;

    const zoneChunkX = Math.floor(chunkX / CHUNKS_PER_ZONE);
    const zoneChunkY = Math.floor(chunkY / CHUNKS_PER_ZONE);
    const localChunkX = chunkX % CHUNKS_PER_ZONE;
    const localChunkY = chunkY % CHUNKS_PER_ZONE;

    // Continue up through region, subsection, megasegment, gigasegment
    // ...

    return {
      gigasegment: context.gigasegment,
      megasegment: context.megasegment,
      subsection: context.subsection,
      region: context.region,
      zone: context.zone,
      chunk: { x: localChunkX, y: localChunkY },
      tile: { x: localTileX, y: localTileY }
    };
  }

  // Convert from universal address to flat world coordinates
  universalToWorld(addr: UniversalAddress): WorldCoordinates {
    // Each tier has a size multiplier
    const TILE_SIZE = 3;                          // 3m per tile
    const CHUNK_SIZE = 32;                        // 32 tiles per chunk
    const ZONE_SIZE = 32;                         // 32 chunks per zone
    const REGION_SIZE = 100;                      // 100 zones per region
    const SUBSECTION_SIZE = 1000;                 // 1000 regions per subsection
    const MEGASEGMENT_SIZE = 100;                 // 100 subsections per megaseg
    const GIGASEGMENT_SIZE = 10000;               // 10000 megaseg per gigaseg

    const worldX =
      addr.gigasegment * GIGASEGMENT_SIZE * MEGASEGMENT_SIZE * SUBSECTION_SIZE * REGION_SIZE * ZONE_SIZE * CHUNK_SIZE +
      addr.megasegment * MEGASEGMENT_SIZE * SUBSECTION_SIZE * REGION_SIZE * ZONE_SIZE * CHUNK_SIZE +
      addr.subsection * SUBSECTION_SIZE * REGION_SIZE * ZONE_SIZE * CHUNK_SIZE +
      addr.region * REGION_SIZE * ZONE_SIZE * CHUNK_SIZE +
      addr.zone * ZONE_SIZE * CHUNK_SIZE +
      addr.chunk.x * CHUNK_SIZE +
      addr.tile.x;

    const worldY = /* same for Y */;

    return {
      x: worldX * TILE_SIZE, // meters
      y: worldY * TILE_SIZE,
      z: 0,
      w: addr.w,
      v: addr.v
    };
  }

  // Distance accounting for hierarchical wrapping
  hierarchicalDistance(
    addr1: UniversalAddress,
    addr2: UniversalAddress
  ): number {
    // If same gigasegment, calculate normally
    if (addr1.gigasegment === addr2.gigasegment) {
      return this.standardDistance(addr1, addr2);
    }

    // If different gigasegments, consider wrapping
    const directDistance = Math.abs(addr2.gigasegment - addr1.gigasegment);
    const wrapDistance = TOTAL_GIGASEGMENTS - directDistance;
    const shortestGigasegDistance = Math.min(directDistance, wrapDistance);

    // Convert to world units
    return shortestGigasegDistance * GIGASEGMENT_SIZE_IN_METERS;
  }
}
```

## Abstraction Tiers

### Gigasegment (Tier 1)

```typescript
interface GigasegmentState {
  id: number;
  name: string;

  // Aggregate statistics
  totalPopulation: number;              // Billions
  totalMegasegments: number;            // 100-10000

  // Production (per day)
  production: {
    food: number;                       // Megatons
    minerals: number;                   // Megatons
    energy: number;                     // Petawatt-hours
    technology: number;                 // Research points
    culture: number;                    // Cultural influence
  };

  consumption: {
    food: number;
    minerals: number;
    energy: number;
  };

  // Trade
  exports: Map<ResourceType, number>;   // To other gigasegments
  imports: Map<ResourceType, number>;

  // Infrastructure
  spaceports: number;                   // Major transport hubs
  megastructures: MegastructureType[];  // Dyson spheres, ringworlds, etc.

  // Governance
  governanceType: 'federation' | 'empire' | 'hive_mind' | 'corporate' | 'anarchist';
  stability: number;                    // 0-100

  // Military
  fleetStrength: number;                // Abstract military power

  // Only tick every hour (game time)
  lastTickTime: number;
}
```

### Megasegment (Tier 2)

```typescript
interface MegasegmentState {
  address: { gigasegment: number; megasegment: number };
  name: string;

  // Population
  population: number;                   // Hundreds of millions
  populationGrowthRate: number;         // % per year

  // Economy
  GDP: number;                          // Abstract economic output
  production: Map<ResourceType, number>;
  consumption: Map<ResourceType, number>;

  // Infrastructure
  subsections: number;                  // 10-1000
  majorCities: number;                  // Planet-cities, metropolises
  transportHubs: TransportHub[];

  // Specialization
  economy: 'agricultural' | 'industrial' | 'research' | 'mining' | 'cultural' | 'military';
  techLevel: number;                    // 0-10

  // Trade routes
  exports: TradeRoute[];
  imports: TradeRoute[];

  // Only tick every 10 minutes (game time)
  lastTickTime: number;
}

interface TradeRoute {
  resource: ResourceType;
  amount: number;                       // Per day
  destination: { gigasegment: number; megasegment: number };
  transportMethod: 'starship' | 'portal' | 'hyperspace' | 'warp_gate';
  transitTime: number;                  // Days
}
```

### Sub-section (Tier 3) - Planet-City Scale

```typescript
interface SubsectionState {
  address: {
    gigasegment: number;
    megasegment: number;
    subsection: number;
  };
  name: string;

  // Population
  population: number;                   // 10M - 500M
  populationDensity: number;            // Per km²

  // Type
  type: 'ecumenopolis' | 'hive_city' | 'forge_world' | 'agri_world' | 'research_station' | 'mining_colony';

  // Production (specialized)
  specialization: {
    primary: ResourceType;              // Main production
    output: number;                     // Units per day
    efficiency: number;                 // 0-1
  };

  // Infrastructure
  regions: number;                      // 10-100
  spaceports: number;
  powerGeneration: number;              // Gigawatts

  // Environment
  biome: BiomeType;
  atmosphereType: 'breathable' | 'toxic' | 'none' | 'exotic';
  gravity: number;                      // Earth = 1.0

  // Governance
  governor?: string;                    // Agent ID or AI governor
  stability: number;
  crime: number;
  amenities: number;

  // Only tick every minute (game time)
  lastTickTime: number;
}
```

### Region (Tier 4) - District Scale

```typescript
interface RegionState {
  address: {
    gigasegment: number;
    megasegment: number;
    subsection: number;
    region: number;
  };
  name: string;

  // Population
  population: number;                   // 100K - 10M
  housing: number;                      // Available housing units
  jobs: number;                         // Available jobs

  // Type
  districtType: 'residential' | 'industrial' | 'agricultural' | 'commercial' | 'spaceport' | 'military' | 'cultural';

  // Production
  production: Map<ResourceType, number>;
  workers: number;
  unemployment: number;

  // Infrastructure
  zones: number;                        // 10-1000
  buildings: Map<BuildingType, number>; // Aggregated

  // Services
  healthcare: number;
  education: number;
  entertainment: number;
  security: number;

  // Only tick every 30 seconds (game time)
  lastTickTime: number;
}
```

### Zone (Tier 5) - Building Cluster Scale

```typescript
interface ZoneState {
  address: {
    gigasegment: number;
    megasegment: number;
    subsection: number;
    region: number;
    zone: number;
  };
  name: string;

  // Population
  population: number;                   // 1K - 100K
  residents: number;                    // Live here
  workers: number;                      // Work here
  visitors: number;                     // Transient

  // Buildings
  buildings: Map<BuildingType, number>; // Building counts
  buildingHealth: number;               // 0-100, average

  // Function
  zoneFunction: 'housing' | 'factory' | 'warehouse' | 'office' | 'retail' | 'park' | 'transit';

  // Resources (stockpiles)
  resources: Map<ResourceType, number>;

  // Events
  recentEvents: ZoneEvent[];            // Last 10 events

  // Only tick every 10 seconds (game time)
  lastTickTime: number;
}
```

### Chunk (Tier 6) - **Transition to Full Simulation**

```typescript
interface ChunkState {
  address: UniversalAddress; // Full address

  // This is where ECS entities spawn!
  entities: Entity[];                   // All entities in chunk
  buildings: Entity[];                  // Building entities
  agents: Entity[];                     // Agent entities

  // Terrain (fully simulated)
  tiles: Tile[];                        // 32×32 = 1024 tiles

  // Resources (actual items)
  items: Entity[];                      // Item entities on ground

  // Full simulation
  systems: System[];                    // All systems run here
  tickRate: number;                     // 20 TPS

  // Generated from zone template when loaded
  generated: boolean;
  seed: number;
  template: string;
}
```

### Tile (Tier 7) - Lowest Level

```typescript
interface Tile {
  address: UniversalAddress; // Full address including tile coords

  // Terrain
  terrain: TerrainType;
  elevation: number;
  temperature: number;
  moisture: number;

  // Entities on this tile
  entities: Entity[];                   // All entities at this position

  // Building occupancy
  building?: Entity;                    // Building covering this tile
  room?: string;                        // Room ID if inside building

  // Pathfinding
  walkable: boolean;
  movementCost: number;

  // Full physics simulation at this level
}
```

## Scale Comparison

```
GIGASEGMENT:  10^15 km²   (~size of small galaxy)
MEGASEGMENT:  10^13 km²   (~size of solar system)
SUBSECTION:   10^10 km²   (~size of gas giant)
REGION:       10^8 km²    (~size of Earth)
ZONE:         10^5 km²    (~size of Iceland)
CHUNK:        3 km²       (~size of large farm)
TILE:         9 m²        (~size of room)
```

## Abstraction Strategy

### Active Zone = Full Simulation

```typescript
class UniverseSimulator {
  private activeZone: ZoneState | null = null;
  private activeChunks = new Map<string, ChunkState>();

  // When player/camera moves to new zone
  async activateZone(address: UniversalAddress): Promise<void> {
    // 1. Abstract current zone
    if (this.activeZone) {
      await this.abstractZone(this.activeZone);
    }

    // 2. Load/generate new zone
    const zoneState = await this.loadOrGenerateZone(address);

    // 3. Hydrate chunks near player
    const playerChunk = this.getPlayerChunkAddress();
    const nearbyChunks = this.getChunksInRadius(playerChunk, 3);

    for (const chunkAddr of nearbyChunks) {
      const chunk = await this.hydrateChunk(chunkAddr, zoneState);
      this.activeChunks.set(this.chunkKey(chunkAddr), chunk);
    }

    this.activeZone = zoneState;
  }

  // Abstract zone into statistics
  private async abstractZone(zone: ZoneState): Promise<void> {
    // Count all entities across all chunks
    let totalPopulation = 0;
    const buildingCounts = new Map<BuildingType, number>();
    const resourceTotals = new Map<ResourceType, number>();

    for (const chunk of this.activeChunks.values()) {
      totalPopulation += chunk.agents.length;

      for (const building of chunk.buildings) {
        const type = building.getComponent('building').type;
        buildingCounts.set(type, (buildingCounts.get(type) || 0) + 1);
      }

      // Aggregate resources, production, etc.
    }

    // Save abstract state
    zone.population = totalPopulation;
    zone.buildings = buildingCounts;
    zone.resources = resourceTotals;

    await this.saveZoneState(zone);

    // Unload all chunks
    this.activeChunks.clear();
  }

  // Hydrate chunk from zone template
  private async hydrateChunk(
    address: UniversalAddress,
    zone: ZoneState
  ): Promise<ChunkState> {
    // Generate terrain from seed
    const seed = this.getChunkSeed(address);
    const terrain = this.generateTerrain(seed);

    // Spawn buildings matching zone's building counts
    const buildings = await this.spawnBuildings(zone, address);

    // Spawn agents matching zone's population
    const agents = await this.spawnAgents(zone, address);

    return {
      address,
      entities: [...buildings, ...agents],
      buildings,
      agents,
      tiles: terrain,
      items: [],
      systems: this.initializeSystems(),
      tickRate: 20,
      generated: true,
      seed,
      template: zone.zoneFunction
    };
  }
}
```

## Trade & Transport

### Inter-Gigasegment Trade

```typescript
interface GalacticTradeRoute {
  id: string;
  from: { gigasegment: number; megasegment: number };
  to: { gigasegment: number; megasegment: number };

  // What's being shipped
  cargo: {
    resource: ResourceType;
    quantity: number;           // Units per shipment
    value: number;              // Economic value
  };

  // How it's shipped
  transport: {
    method: 'starship' | 'portal' | 'hyperspace' | 'warp_gate' | 'dimensional_rift';
    speed: number;              // Megasegments per day
    capacity: number;           // Max cargo per trip
    cost: number;               // Per shipment
  };

  // Route info
  distance: number;             // Megasegments
  transitTime: number;          // Days
  waypoints: UniversalAddress[];

  // Status
  active: boolean;
  shipmentsInTransit: number;
}
```

### Transport Hubs

```typescript
interface TransportHub {
  address: UniversalAddress;
  name: string;

  // Type
  type: 'spaceport' | 'warp_gate' | 'dimensional_portal' | 'hyperspace_beacon';

  // Capacity
  throughput: number;           // Ships/portals per day
  cargoCapacity: number;        // Tons
  passengerCapacity: number;    // People per day

  // Connections
  routes: GalacticTradeRoute[];
  destinations: UniversalAddress[];

  // Status
  operational: boolean;
  congestion: number;           // 0-1
}
```

## Storage Implications

### Abstract Tiers (Tiny Storage)

```
GIGASEGMENT:  ~5 KB   (just statistics)
MEGASEGMENT:  ~10 KB  (production rates + trade routes)
SUBSECTION:   ~20 KB  (population + specialization)
REGION:       ~50 KB  (building counts + workers)
ZONE:         ~100 KB (building clusters + events)
```

### Full Simulation (Large Storage)

```
CHUNK:        ~500 KB (all entities, terrain, items)
ACTIVE ZONE:  ~50 MB  (100 chunks × 500 KB)
```

### Scaling

```
10,000 gigasegments:      50 MB
100,000 megasegments:     1 GB
1M subsections:           20 GB  (but most unvisited!)
10M regions:              500 GB (but most abstract!)

Active zone (1 zone):     50 MB
Visited zones (100):      10 GB

TOTAL (realistic):        ~11 GB for explored universe
```

## Renormalization Challenges

### Distance Calculations

```typescript
function calculateDistance(addr1: UniversalAddress, addr2: UniversalAddress): number {
  // Same gigasegment? Standard distance
  if (addr1.gigasegment === addr2.gigasegment) {
    return standardDistance(addr1, addr2);
  }

  // Different gigasegments? Astronomical distance
  const gigasegDistance = Math.abs(addr2.gigasegment - addr1.gigasegment);
  return gigasegDistance * GIGASEGMENT_SIZE_IN_LIGHT_YEARS * LIGHT_YEAR_IN_METERS;
}
```

### Pathfinding Across Tiers

```typescript
class HierarchicalPathfinder {
  findPath(from: UniversalAddress, to: UniversalAddress): Path {
    // Same zone? Use normal A*
    if (this.sameZone(from, to)) {
      return this.normalAStar(from, to);
    }

    // Different zones? Use zone-level pathfinding
    if (this.sameRegion(from, to)) {
      return this.zonePathfinding(from, to);
    }

    // Different regions? Use region-level pathfinding
    if (this.sameSubsection(from, to)) {
      return this.regionPathfinding(from, to);
    }

    // Different subsections? Use transport hubs
    return this.transportHubPathfinding(from, to);
  }
}
```

## Future: Mega-Structures

```typescript
type MegastructureType =
  | 'dyson_sphere'        // Encloses star for total energy
  | 'ringworld'           // Niven-style ring around star
  | 'orbital_ring'        // Ring around planet
  | 'matrioshka_brain'    // Nested dyson spheres for computation
  | 'planet_city'         // Coruscant/Trantor style
  | 'hive_world'          // Warhammer 40K hive cities
  | 'forge_world'         // Industrial planet
  | 'birch_planet'        // Planet-sized shell around black hole
  | 'alderson_disk'       // Flat disk (huge gravity)
  | 'stellar_engine'      // Move entire stars
  | 'nicoll_dyson_beam'   // Weaponized dyson sphere;

interface Megastructure {
  type: MegastructureType;
  location: UniversalAddress;

  // Scale
  size: number;                   // Diameter in km
  mass: number;                   // Tons
  populationCapacity: number;     // Max inhabitants

  // Function
  purpose: string;
  production: Map<ResourceType, number>;

  // Status
  constructionProgress: number;   // 0-1
  operational: boolean;
  integrity: number;              // 0-100
}
```

## Implementation Phases

### Phase 1: Core Hierarchy
- [ ] UniversalAddress type
- [ ] Coordinate normalization utilities
- [ ] Tier definitions (Gigaseg → Tile)

### Phase 2: Abstraction System
- [ ] GigasegmentState
- [ ] MegasegmentState
- [ ] SubsectionState
- [ ] RegionState
- [ ] ZoneState

### Phase 3: Zone Activation
- [ ] Zone hydration from abstract state
- [ ] Chunk generation from zone template
- [ ] Zone abstraction on exit

### Phase 4: Trade & Transport
- [ ] GalacticTradeRoute
- [ ] TransportHub
- [ ] Inter-tier resource flow

### Phase 5: Megastructures
- [ ] Ringworld implementation
- [ ] Planet-city (ecumenopolis)
- [ ] Dyson sphere
- [ ] Hive world

## Success Criteria

- ✅ Can represent entire ringworld (10,000 gigasegments)
- ✅ Active zone runs at 20 TPS
- ✅ Abstract zones tick at appropriate rates
- ✅ Save files stay under 50 GB for explored universe
- ✅ Trade routes flow resources across gigasegments
- ✅ Transport hubs connect distant regions
- ✅ Populations in billions are tracked accurately

## The Vision

**Player experience:**
- Start in a chunk (full simulation)
- Travel to zone boundary → new zone loads
- Take a ship to another megasegment → fast travel, new zone loads
- View galactic map → see gigasegments as colored regions
- Manage empire spanning multiple gigasegments
- Never notice that 99.9999% of the universe is just statistics

**Technical reality:**
- Only 1 zone (100 chunks) fully simulated at a time
- Everything else is production rates and populations
- Player thinks they're in a living galaxy
- It's actually fractal abstraction all the way down

**The ultimate trick: Make billions feel real while simulating hundreds.** 🌌
