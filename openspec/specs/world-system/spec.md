# World System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The world system manages the forest village environment: terrain tiles, biomes, vegetation, resources, pathfinding, and environmental effects. The village is nestled in a procedurally generated forest with clearings, rivers, and varied terrain.

---

## World Structure

### Chunk-Based Infinite Map

The world uses chunk-based procedural generation for infinite scalability.
See `procedural-generation.md` for full details.

```typescript
interface World {
  // Infinite world - no fixed size
  tileSize: number;         // Pixels per tile (16 for 8-bit)
  chunkSize: number;        // Tiles per chunk (32x32)
  seed: number;             // Procedural generation seed

  // Chunk management (see procedural-generation.md)
  activeChunks: Map<ChunkId, Chunk>;   // Currently loaded
  chunkCache: ChunkCache;               // Recently used
  chunkStorage: ChunkStorage;           // Persistent storage

  // Multi-village support (see abstraction-layers.md)
  villages: Village[];
  simulationLayers: Map<VillageId, SimulationLayer>;
}

interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  biome: BiomeType;
  elevation: number;     // 0-100
  moisture: number;      // 0-100
  fertility: number;     // 0-100 (for farming)

  // Dynamic state
  object: TileObject | null;  // Tree, rock, building, crop
  items: Item[];              // Dropped items
  reserved: string | null;    // Agent ID if claimed
}
```

### Terrain Types

```typescript
type TerrainType =
  | "grass"        // Standard walkable, farmable
  | "dirt"         // Paths, tilled soil
  | "forest_floor" // Under trees, foraging spots
  | "water_shallow"// Wadeable, fishing
  | "water_deep"   // Impassable, fishing
  | "stone"        // Rocky, mining potential
  | "sand"         // Beach, special crops
  | "snow"         // Winter terrain
  | "mud"          // Wet season, slows movement
  | "path"         // Built path, fast travel
```

### Biome Types

```typescript
type BiomeType =
  | "village_center"  // Main clearing, buildings
  | "farmland"        // Cleared for crops
  | "forest_light"    // Sparse trees, easy traversal
  | "forest_dense"    // Heavy trees, slow, resources
  | "forest_ancient"  // Old growth, rare resources
  | "riverside"       // Along water, fishing, reeds
  | "meadow"          // Open flowers, foraging
  | "hills"           // Elevated, stone, views
  | "swamp"           // Wet, unique plants
  | "clearing"        // Natural open areas
```

---

## Requirements

### REQ-WLD-001: Procedural Generation

The world SHALL be procedurally generated from a seed:

```
WHEN a new world is created
THEN the generator SHALL:
  1. Initialize noise functions with seed
  2. Generate elevation map (Perlin noise)
  3. Generate moisture map (Perlin noise, river influence)
  4. Derive terrain from elevation + moisture
  5. Place biomes based on terrain clusters
  6. Generate river(s) from high to low elevation
  7. Create village clearing at suitable location
  8. Populate with trees, rocks, resources
  9. Ensure connectivity (pathfinding possible)
```

### REQ-WLD-002: Village Placement

The initial village SHALL be placed appropriately:

```
WHEN determining village location
THEN the generator SHALL find a location that:
  - Has a large flat clearing (min 20x20 tiles)
  - Is adjacent to water source
  - Has nearby forest for resources
  - Is not in swamp or steep hills
  - Has high average fertility nearby
```

### REQ-WLD-003: Resource Distribution

Resources SHALL be distributed by biome:

| Biome | Common Resources | Rare Resources |
|-------|------------------|----------------|
| forest_light | Wood, Berries, Mushrooms | Herbs |
| forest_dense | Hardwood, Mushrooms | Truffles, Rare Herbs |
| forest_ancient | Ancient Wood, Amber | Mystical Plants |
| riverside | Reeds, Clay, Fish | Pearls |
| meadow | Flowers, Honey, Herbs | Rare Flowers |
| hills | Stone, Ore, Gems | Rare Ores |
| swamp | Peat, Mud, Frogs | Rare Mushrooms |

### REQ-WLD-004: Seasonal Changes

The world SHALL change with seasons:

```typescript
interface SeasonalEffect {
  season: "spring" | "summer" | "fall" | "winter";
  terrainChanges: Map<TerrainType, TerrainType>;
  growthMultiplier: number;
  resourceAvailability: Map<string, number>;
  weatherPatterns: WeatherType[];
}
```

```
WHEN a new season begins
THEN the WorldSystem SHALL:
  - Update tile appearances
  - Modify resource spawn rates
  - Adjust movement speeds
  - Change available forage items
  - Update ambient lighting/palette
```

**Seasonal Effects:**
- **Spring:** Snow melts, mud appears, flowers bloom, planting season
- **Summer:** Full growth, peak foraging, hot days
- **Fall:** Harvest season, falling leaves, mushroom peak
- **Winter:** Snow coverage, frozen water, limited foraging

### REQ-WLD-005: Pathfinding

The world SHALL support A* pathfinding:

```typescript
interface PathfindingConfig {
  // Movement costs by terrain
  costs: Map<TerrainType, number>;

  // Impassable terrain
  blocked: TerrainType[];

  // Dynamic obstacles
  obstacles: Position[];
}
```

**Movement Costs:**
| Terrain | Cost | Notes |
|---------|------|-------|
| path | 1 | Fastest |
| grass | 2 | Normal |
| dirt | 2 | Normal |
| forest_floor | 3 | Slightly slow |
| mud | 5 | Very slow |
| water_shallow | 4 | Wadeable |
| water_deep | ∞ | Blocked |
| stone | 3 | Slightly slow |

### REQ-WLD-006: Tile Objects

Tiles SHALL support placed objects:

```typescript
type TileObject =
  | { type: "tree"; species: TreeSpecies; maturity: number; health: number }
  | { type: "rock"; size: "small" | "medium" | "large"; oreType?: string }
  | { type: "bush"; species: BushSpecies; hasBerrries: boolean }
  | { type: "crop"; cropId: string; growthStage: number }
  | { type: "building"; buildingId: string }
  | { type: "decoration"; decorId: string }
  | { type: "resource_node"; resourceType: string; remaining: number };
```

### REQ-WLD-007: Resource Regeneration

Natural resources SHALL regenerate over time:

```
WHEN a tree is chopped
THEN after 7-14 in-game days
THEN a sapling MAY appear on the tile
  - 80% chance in forest biome
  - 30% chance elsewhere
  - 0% chance on buildings/crops

WHEN berries are harvested from a bush
THEN after 3 in-game days
THEN berries SHALL regrow

WHEN a resource node is depleted
THEN after 28 in-game days
THEN the node MAY respawn
  - Same type: 60% chance
  - Different type: 20% chance
  - No respawn: 20% chance
```

---

## World Layers

### Layer System

```typescript
interface WorldLayers {
  terrain: TerrainType[][];    // Base terrain
  objects: TileObject[][];     // Trees, rocks, buildings
  items: Item[][][];           // Dropped items per tile
  effects: Effect[][];         // Weather, magic, etc.
  fog: boolean[][];            // Unexplored areas
}
```

### Fog of War (Required for Spatial Memory)

Fog of war is required - agents only know what they've explored.
See `agent-system/spatial-memory.md` for how agents remember locations.

```
WHEN an agent has not visited an area
THEN the area SHALL be:
  - Hidden from the agent's spatial memory
  - Displayed as fog to the player
  - Revealed when an agent moves within vision range
  - Remembered in agent's spatial memory when explored

Agent vision range: 5-8 tiles depending on terrain, time of day, weather
```

---

## Environmental Effects

### Weather System

```typescript
type WeatherType =
  | "clear"
  | "cloudy"
  | "rain"
  | "heavy_rain"
  | "storm"
  | "snow"
  | "fog"
  | "wind";

interface WeatherEffect {
  type: WeatherType;
  duration: number;      // In-game hours
  intensity: number;     // 0-100
  effects: {
    movementModifier: number;
    visibilityModifier: number;
    cropGrowthModifier: number;
    moodModifier: number;
  };
}
```

### Day/Night Cycle

```
WHEN the in-game time progresses
THEN the WorldSystem SHALL:
  - Adjust ambient lighting (dawn, day, dusk, night)
  - Modify agent behavior tendencies
  - Change resource availability (some only at night)
  - Update tile visibility ranges
```

---

## World Events

### Random Events

```typescript
type WorldEvent =
  | { type: "wildlife_migration"; species: string; direction: Direction }
  | { type: "resource_discovery"; position: Position; resourceType: string }
  | { type: "weather_change"; newWeather: WeatherType }
  | { type: "seasonal_bloom"; flowerType: string; area: Area }
  | { type: "fallen_tree"; position: Position; yields: Item[] }
  | { type: "wandering_merchant"; arrivalPosition: Position }
  // Animal events (see animal-system/spec.md)
  | { type: "predator_sighting"; species: string; position: Position }
  | { type: "animal_herd"; species: string; count: number; area: Area }
  | { type: "rare_animal_spawn"; species: string; position: Position };
```

---

## Configuration

### World Presets

| Preset | Size | Forest Density | Water | Special |
|--------|------|----------------|-------|---------|
| Cozy Village | 64x64 | Medium | River | Small, tutorial-friendly |
| Forest Haven | 128x128 | High | River + Pond | Standard |
| Riverside | 128x64 | Low | Large River | Trading focus |
| Mountain Valley | 128x128 | Medium | Stream | Mining focus |
| Archipelago | 192x192 | Low | Ocean + Islands | Fishing focus |

---

## Open Questions

1. Should there be underground/cave systems?
2. How to handle world expansion over time?
3. NPC travelers passing through?
4. Disaster events (fire, flood)?

---

## Related Specs

**Core Integration:**
- `game-engine/spec.md` - Tick updates
- `farming-system/spec.md` - Crop placement on tiles
- `construction-system/spec.md` - Building placement
- `rendering-system/spec.md` - Visual representation

**World Sub-Systems:**
- `world-system/procedural-generation.md` - Chunk-based infinite generation
- `world-system/abstraction-layers.md` - Multi-village simulation at scale

**Agent Integration:**
- `agent-system/spatial-memory.md` - How agents remember explored areas
- `agent-system/movement-intent.md` - Pathfinding on world tiles

**Entity Integration:**
- `animal-system/spec.md` - Animals inhabit world tiles, wildlife migration
- `economy-system/inter-village-trade.md` - Trade routes between villages
