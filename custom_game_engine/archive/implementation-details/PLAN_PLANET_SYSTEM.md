# Planet System Design

## Overview

Planets are visitable locations within a universe. Each planet has its own terrain generation parameters, biome palette, and chunk storage. Agents can travel between planets within the same universe.

## Architecture

### Current Structure
```
Universe
└── World
    ├── ChunkManager (single)
    ├── ChunkNameRegistry
    └── Entities
```

### New Structure
```
Universe
├── Planets: Map<PlanetId, Planet>
│   ├── Planet: "homeworld"
│   │   ├── PlanetConfig (type, seed, parameters)
│   │   ├── ChunkManager (generated chunks)
│   │   ├── ChunkNameRegistry (named locations)
│   │   └── EntitySet (entities on this planet)
│   │
│   ├── Planet: "crystal-moon"
│   │   └── ...
│   │
│   └── Planet: "fungal-world"
│       └── ...
│
├── ActivePlanetId: string (current player location)
└── Entities (with planet_location component)
```

## Planet Types (Full Palette)

| Type | Temp Offset | Moisture Scale | Special Features |
|------|-------------|----------------|------------------|
| **terrestrial** | 0 | 1.0 | Balanced Earth-like |
| **desert** | +0.4 | 0.3 | Sand dunes, oases rare |
| **ice** | -0.5 | 0.8 | Snow/ice terrain, frozen seas |
| **ocean** | 0 | 1.5 | Raised sea level, islands only |
| **magical** | 0 | 1.0 | Floating islands, arcane zones |
| **corrupted** | +0.1 | 0.6 | Dark biomes, twisted terrain |
| **fungal** | +0.1 | 1.3 | Mushroom forests, spore fields |
| **crystal** | -0.2 | 0.4 | Crystal formations, refractive |
| **volcanic** | +0.5 | 0.2 | Lava flows, ash plains |
| **moon** | -0.3 | 0.1 | Barren, craters, low vegetation |

## New Biomes for Exotic Planets

### Magical Biomes
- `arcane_forest` - Glowing trees, mana pools
- `floating_isle` - Disconnected terrain (special elevation)
- `void_edge` - Near-nothingness, dangerous

### Corrupted Biomes
- `blighted_land` - Twisted vegetation, dark soil
- `shadow_forest` - Perpetual twilight, dangerous
- `corruption_heart` - Source of corruption

### Fungal Biomes
- `mushroom_forest` - Giant fungi as trees
- `spore_field` - Low vegetation, spore clouds
- `mycelium_network` - Underground connections

### Crystal Biomes
- `crystal_plains` - Sparse crystal formations
- `geode_caves` - Dense crystal clusters
- `prismatic_forest` - Light-refracting crystals

### Volcanic Biomes
- `lava_field` - Active lava flows (impassable)
- `ash_plain` - Volcanic ash coverage
- `obsidian_waste` - Cooled lava formations

## Data Structures

### PlanetConfig (new)
```typescript
interface PlanetConfig {
  $schema: 'https://aivillage.dev/schemas/planet/v1';

  // Identity
  id: string;                    // "planet:homeworld"
  name: string;                  // "Homeworld"
  type: PlanetType;              // "terrestrial" | "desert" | etc.

  // Generation
  seed: string;                  // Derived from universe seed + planet id
  radius?: number;               // Optional: planet size (affects coordinate wrap)

  // Terrain Parameters (modify noise generation)
  temperatureOffset: number;     // -1 to 1, added to base temperature
  temperatureScale: number;      // 0.1 to 2.0, multiplier
  moistureOffset: number;        // -1 to 1
  moistureScale: number;         // 0.1 to 2.0
  elevationOffset: number;       // -1 to 1
  elevationScale: number;        // 0.1 to 2.0
  seaLevel: number;              // -1 to 1 (default -0.3)

  // Biome Configuration
  allowedBiomes: BiomeType[];    // Which biomes can generate
  biomeWeights?: Record<BiomeType, number>;  // Optional: bias certain biomes

  // Special Features
  hasFloatingIslands?: boolean;  // Magical worlds
  hasLavaFlows?: boolean;        // Volcanic worlds
  hasCrystalFormations?: boolean;
  corruptionLevel?: number;      // 0-1 for corrupted worlds

  // Metadata
  discoveredAt?: number;         // Tick when discovered
  discoveredBy?: string;         // Agent/player who discovered
  visitCount?: number;           // Times visited
}
```

### Planet (runtime)
```typescript
interface Planet {
  config: PlanetConfig;
  chunkManager: ChunkManager;
  chunkNameRegistry: ChunkNameRegistry;
  terrainGenerator: TerrainGenerator;  // Configured with planet params

  // Entities currently on this planet
  entities: Set<EntityId>;

  // Snapshot data (for persistence)
  terrainSnapshot?: TerrainSnapshot;
}
```

### PlanetLocation Component (new)
```typescript
interface PlanetLocationComponent {
  type: 'planet_location';
  planetId: string;              // Which planet entity is on
  arrivalTick?: number;          // When they arrived
  previousPlanetId?: string;     // Where they came from
}
```

### Universe Changes
```typescript
interface UniverseSnapshot {
  // ... existing fields ...

  // NEW: Planet configuration
  planets: PlanetConfig[];

  // NEW: Per-planet terrain (replaces single terrain field)
  planetTerrain: Record<string, TerrainSnapshot>;

  // NEW: Active planet for player
  activePlanetId: string;
}
```

## TerrainGenerator Changes

### New Constructor
```typescript
class TerrainGenerator {
  constructor(
    seed: string = 'default',
    planetConfig?: PlanetConfig  // NEW: planet-specific config
  ) {
    this.seed = seed;
    this.planetConfig = planetConfig ?? DEFAULT_TERRESTRIAL_CONFIG;

    // Apply planet parameters to generation
    this.tempOffset = planetConfig?.temperatureOffset ?? 0;
    this.tempScale = planetConfig?.temperatureScale ?? 1.0;
    this.moistureOffset = planetConfig?.moistureOffset ?? 0;
    this.moistureScale = planetConfig?.moistureScale ?? 1.0;
    // ... etc
  }
}
```

### Modified Noise Sampling
```typescript
private generateTile(worldX: number, worldY: number): Tile {
  // ... existing noise generation ...

  // Apply planet modifiers
  const modifiedTemp = (temperature * this.tempScale) + this.tempOffset;
  const modifiedMoisture = (moisture * this.moistureScale) + this.moistureOffset;
  const modifiedElevation = (elevation * this.elevationScale) + this.elevationOffset;

  // Check if biome is allowed on this planet
  const { terrain, biome } = this.determineTerrainAndBiome(
    modifiedElevation,
    modifiedMoisture,
    modifiedTemp
  );

  // Filter to allowed biomes
  const finalBiome = this.planetConfig.allowedBiomes.includes(biome)
    ? biome
    : this.getFallbackBiome(biome);

  // ... rest of tile generation
}
```

## Planet Travel System

### Travel Methods
1. **Portals** - Magical gates between planets
2. **Spacecraft** - Tech-based travel (sci-fi)
3. **Rituals** - Divine/magical summoning
4. **Natural passages** - Wormholes, dimensional rifts

### Travel Component
```typescript
interface PlanetTravelComponent {
  type: 'planet_travel';
  travelMethod: 'portal' | 'spacecraft' | 'ritual' | 'passage';
  departurePlanetId: string;
  destinationPlanetId: string;
  departurePosition: { x: number; y: number };
  arrivalPosition?: { x: number; y: number };  // null = random safe spot
  travelStartTick: number;
  travelDuration: number;  // Ticks until arrival
  status: 'departing' | 'in_transit' | 'arriving' | 'complete';
}
```

### PlanetTravelSystem
```typescript
class PlanetTravelSystem implements System {
  priority = 150;  // After movement, before rendering

  update(world: World): void {
    // Find entities with planet_travel component
    const travelers = world.query()
      .with(CT.PlanetTravel)
      .executeEntities();

    for (const entity of travelers) {
      const travel = entity.getComponent(CT.PlanetTravel);

      if (travel.status === 'in_transit') {
        if (world.tick >= travel.travelStartTick + travel.travelDuration) {
          this.arriveAtDestination(world, entity, travel);
        }
      }
    }
  }

  private arriveAtDestination(world: World, entity: Entity, travel: PlanetTravelComponent) {
    // Update planet_location component
    const location = entity.getComponent(CT.PlanetLocation);
    location.previousPlanetId = location.planetId;
    location.planetId = travel.destinationPlanetId;
    location.arrivalTick = world.tick;

    // Set position on new planet
    const pos = entity.getComponent(CT.Position);
    if (travel.arrivalPosition) {
      pos.x = travel.arrivalPosition.x;
      pos.y = travel.arrivalPosition.y;
    } else {
      // Find safe landing spot
      const arrival = this.findSafeLandingSpot(world, travel.destinationPlanetId);
      pos.x = arrival.x;
      pos.y = arrival.y;
    }

    // Remove travel component
    entity.removeComponent(CT.PlanetTravel);

    // Emit arrival event
    world.eventBus.emit('planet:arrival', {
      entityId: entity.id,
      planetId: travel.destinationPlanetId,
    });
  }
}
```

## Persistence Changes

### ChunkSerializer Updates
```typescript
class ChunkSerializer {
  // Serialize single planet's terrain
  serializePlanetTerrain(planet: Planet): TerrainSnapshot {
    return this.serializeChunks(planet.chunkManager);
  }

  // Serialize all planets
  serializeAllPlanets(planets: Map<string, Planet>): Record<string, TerrainSnapshot> {
    const result: Record<string, TerrainSnapshot> = {};
    for (const [id, planet] of planets) {
      result[id] = this.serializePlanetTerrain(planet);
    }
    return result;
  }
}
```

### WorldSerializer Updates
```typescript
class WorldSerializer {
  serializeWorld(world: World): UniverseSnapshot {
    return {
      // ... existing fields ...

      // NEW: Planet data
      planets: Array.from(world.planets.values()).map(p => p.config),
      planetTerrain: this.chunkSerializer.serializeAllPlanets(world.planets),
      activePlanetId: world.activePlanetId,
    };
  }

  deserializeWorld(snapshot: UniverseSnapshot, world: World): void {
    // ... existing deserialization ...

    // NEW: Restore planets
    for (const config of snapshot.planets) {
      const planet = world.createPlanet(config);
      const terrain = snapshot.planetTerrain[config.id];
      if (terrain) {
        this.chunkSerializer.deserializePlanetTerrain(planet, terrain);
      }
    }
    world.setActivePlanet(snapshot.activePlanetId);
  }
}
```

## Implementation Phases

### Phase 1: Core Planet Infrastructure
1. Add `PlanetConfig` type to `packages/world/src/planet/`
2. Add `PlanetType` enum with all planet types
3. Create `Planet` class with ChunkManager instance
4. Modify `TerrainGenerator` to accept planet config
5. Add `planet_location` component

### Phase 2: Planet-Aware World
1. Add `planets: Map<string, Planet>` to World
2. Add `activePlanetId` to World
3. Modify tile access to route through active planet
4. Update ChunkManager integration

### Phase 3: Exotic Biomes
1. Add new BiomeTypes for magical/corrupted/fungal/crystal/volcanic
2. Add new TerrainTypes (crystal, lava, corruption, etc.)
3. Implement biome generation for each planet type
4. Add entity placement for exotic biomes

### Phase 4: Persistence
1. Update `UniverseSnapshot` schema
2. Modify `ChunkSerializer` for per-planet terrain
3. Update `WorldSerializer` for planet data
4. Migration for existing saves (single planet = "homeworld")

### Phase 5: Planet Travel
1. Add `planet_travel` component
2. Implement `PlanetTravelSystem`
3. Add portal entity type
4. Add travel UI/mechanics

### Phase 6: Discovery & Exploration
1. Planet discovery system
2. Planet metadata (visit count, discovered by)
3. Planet map/selection UI
4. Fast travel between discovered planets

## File Changes Summary

### New Files
- `packages/world/src/planet/PlanetTypes.ts` - Planet type definitions
- `packages/world/src/planet/PlanetConfig.ts` - Planet configuration
- `packages/world/src/planet/Planet.ts` - Planet class
- `packages/world/src/planet/index.ts` - Exports
- `packages/core/src/components/PlanetLocationComponent.ts`
- `packages/core/src/components/PlanetTravelComponent.ts`
- `packages/core/src/systems/PlanetTravelSystem.ts`

### Modified Files
- `packages/world/src/chunks/Tile.ts` - New biomes/terrains
- `packages/world/src/terrain/TerrainGenerator.ts` - Planet parameters
- `packages/core/src/ecs/World.ts` - Planet map, active planet
- `packages/persistence/src/types.ts` - Planet snapshot types
- `packages/persistence/src/WorldSerializer.ts` - Planet serialization
- `packages/world/src/chunks/ChunkSerializer.ts` - Per-planet terrain

## Default Planet Configurations

```typescript
export const PLANET_PRESETS: Record<PlanetType, Partial<PlanetConfig>> = {
  terrestrial: {
    temperatureOffset: 0,
    temperatureScale: 1.0,
    moistureOffset: 0,
    moistureScale: 1.0,
    seaLevel: -0.3,
    allowedBiomes: ['plains', 'forest', 'desert', 'mountains', 'ocean', 'river',
                   'tundra', 'taiga', 'jungle', 'wetland', 'savanna', 'woodland'],
  },

  desert: {
    temperatureOffset: 0.4,
    temperatureScale: 0.8,
    moistureOffset: -0.4,
    moistureScale: 0.3,
    seaLevel: -0.7,  // Very little water
    allowedBiomes: ['desert', 'scrubland', 'mountains', 'savanna'],
  },

  ice: {
    temperatureOffset: -0.5,
    temperatureScale: 0.6,
    moistureOffset: 0,
    moistureScale: 0.8,
    seaLevel: -0.3,
    allowedBiomes: ['tundra', 'taiga', 'mountains', 'ocean'],
  },

  ocean: {
    temperatureOffset: 0,
    temperatureScale: 1.0,
    moistureOffset: 0.3,
    moistureScale: 1.5,
    seaLevel: 0.2,  // Raised sea level = mostly water
    allowedBiomes: ['ocean', 'river', 'wetland', 'jungle', 'plains'],
  },

  magical: {
    temperatureOffset: 0,
    temperatureScale: 1.0,
    moistureOffset: 0,
    moistureScale: 1.0,
    seaLevel: -0.3,
    allowedBiomes: ['arcane_forest', 'floating_isle', 'plains', 'forest', 'mountains'],
    hasFloatingIslands: true,
  },

  corrupted: {
    temperatureOffset: 0.1,
    temperatureScale: 0.9,
    moistureOffset: -0.2,
    moistureScale: 0.6,
    seaLevel: -0.3,
    allowedBiomes: ['blighted_land', 'shadow_forest', 'corruption_heart', 'mountains'],
    corruptionLevel: 0.7,
  },

  fungal: {
    temperatureOffset: 0.1,
    temperatureScale: 0.7,
    moistureOffset: 0.2,
    moistureScale: 1.3,
    seaLevel: -0.4,
    allowedBiomes: ['mushroom_forest', 'spore_field', 'mycelium_network', 'wetland'],
  },

  crystal: {
    temperatureOffset: -0.2,
    temperatureScale: 0.8,
    moistureOffset: -0.3,
    moistureScale: 0.4,
    seaLevel: -0.5,
    allowedBiomes: ['crystal_plains', 'geode_caves', 'prismatic_forest', 'mountains'],
    hasCrystalFormations: true,
  },

  volcanic: {
    temperatureOffset: 0.5,
    temperatureScale: 1.2,
    moistureOffset: -0.4,
    moistureScale: 0.2,
    seaLevel: -0.6,
    allowedBiomes: ['lava_field', 'ash_plain', 'obsidian_waste', 'mountains'],
    hasLavaFlows: true,
  },

  moon: {
    temperatureOffset: -0.3,
    temperatureScale: 1.5,  // High variance (extreme temps)
    moistureOffset: -0.5,
    moistureScale: 0.1,     // Very dry
    seaLevel: -0.9,         // Almost no water
    allowedBiomes: ['tundra', 'desert', 'mountains'],
  },
};
```
