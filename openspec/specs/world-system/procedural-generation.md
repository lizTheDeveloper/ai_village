# Procedural World Generation - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The world is effectively infinite, generated procedurally using chunk-based streaming like Minecraft. Only nearby chunks are loaded in memory; distant chunks are generated on-demand and cached to disk. This enables massive exploration while keeping memory usage constant.

---

## Chunk Architecture

### Chunk Definition

```typescript
interface Chunk {
  // Identity
  id: string;                    // "chunk_x_y" e.g., "chunk_-3_5"
  x: number;                     // Chunk coordinate (not tile)
  y: number;

  // Content
  tiles: Tile[][];               // CHUNK_SIZE x CHUNK_SIZE tiles
  plants: Plant[];
  resources: ResourceNode[];
  structures: Structure[];       // Ruins, caves, etc.

  // State
  state: ChunkState;
  generatedAt: Date;
  lastAccessed: Date;
  lastSimulated: GameTime;       // For catch-up simulation

  // Metadata
  biome: BiomeType;              // Dominant biome
  elevation: number;             // Average elevation
  features: ChunkFeature[];      // Special features
}

type ChunkState =
  | "ungenerated"       // Never created
  | "generated"         // Created, not loaded
  | "loading"           // Being loaded from disk
  | "active"            // In memory, fully simulated
  | "cached"            // In memory but not active
  | "unloading"         // Being saved to disk
  | "dormant";          // On disk, not in memory

const CHUNK_SIZE = 32;  // 32x32 tiles per chunk
const TILE_SIZE = 16;   // 16x16 pixels per tile
```

### Memory Management

```typescript
interface ChunkManager {
  // Currently loaded
  activeChunks: Map<string, Chunk>;
  cachedChunks: Map<string, Chunk>;

  // Limits
  maxActiveChunks: number;       // e.g., 25 (5x5 around player)
  maxCachedChunks: number;       // e.g., 100

  // Loading zones
  activeRadius: number;          // Chunks actively simulated (2-3)
  loadedRadius: number;          // Chunks in memory (4-5)
  generatedRadius: number;       // Chunks generated ahead (6-8)
}
```

### Chunk Lifecycle

```
                    [Player moves]
                          ↓
   UNGENERATED ──→ GENERATED ──→ ACTIVE ──→ CACHED ──→ DORMANT
        ↑              ↓            ↓          ↓           ↓
        │         [to disk]    [simulate]  [in memory] [on disk]
        │              ↓            ↓          ↓           ↓
        └──────────────────────────────────────────────────┘
                         [player returns]
```

---

## Procedural Generation

### World Seed

```typescript
interface WorldSeed {
  master: number;                // Primary seed
  derived: {
    terrain: number;
    biome: number;
    resources: number;
    structures: number;
    plants: number;
  };
}

// All generation is deterministic from seed
// Same chunk coordinates + same seed = same chunk every time
function deriveChunkSeed(worldSeed: WorldSeed, chunkX: number, chunkY: number): number {
  return hash(worldSeed.master, chunkX, chunkY);
}
```

### Noise Layers

```typescript
interface NoiseConfig {
  // Elevation (mountains, valleys)
  elevation: {
    type: "perlin",
    octaves: 6,
    frequency: 0.01,
    amplitude: 100,
    persistence: 0.5,
  };

  // Moisture (rivers, swamps, deserts)
  moisture: {
    type: "perlin",
    octaves: 4,
    frequency: 0.02,
    amplitude: 100,
  };

  // Temperature (biome variation)
  temperature: {
    type: "perlin",
    octaves: 3,
    frequency: 0.005,
    amplitude: 50,
    // Also affected by elevation
    elevationModifier: -0.3,  // Higher = colder
  };

  // Cave/resource distribution
  caves: {
    type: "worley",
    frequency: 0.05,
    threshold: 0.3,
  };

  // Detail noise (local variation)
  detail: {
    type: "simplex",
    octaves: 2,
    frequency: 0.1,
    amplitude: 10,
  };
}
```

### Chunk Generation Pipeline

```typescript
async function generateChunk(
  x: number,
  y: number,
  worldSeed: WorldSeed
): Promise<Chunk> {

  const chunkSeed = deriveChunkSeed(worldSeed, x, y);
  const rng = seedRandom(chunkSeed);

  // 1. Generate base terrain
  const tiles = generateTerrain(x, y, worldSeed);

  // 2. Determine biome
  const biome = determineBiome(tiles, x, y, worldSeed);

  // 3. Apply biome-specific terrain modifications
  applyBiomeModifications(tiles, biome, rng);

  // 4. Generate resources
  const resources = generateResources(tiles, biome, rng);

  // 5. Generate plants (initial population)
  const plants = generatePlants(tiles, biome, rng);

  // 6. Generate structures (ruins, caves, etc.)
  const structures = generateStructures(tiles, biome, rng, x, y);

  // 7. Generate features (rivers, paths, etc.)
  const features = generateFeatures(tiles, x, y, worldSeed);

  // 8. Post-process (smooth edges, validate)
  postProcessChunk(tiles);

  return {
    id: `chunk_${x}_${y}`,
    x,
    y,
    tiles,
    plants,
    resources,
    structures,
    state: "generated",
    generatedAt: new Date(),
    lastAccessed: new Date(),
    lastSimulated: getCurrentGameTime(),
    biome,
    elevation: calculateAverageElevation(tiles),
    features,
  };
}
```

### Terrain Generation

```typescript
function generateTerrain(
  chunkX: number,
  chunkY: number,
  worldSeed: WorldSeed
): Tile[][] {

  const tiles: Tile[][] = [];

  for (let localY = 0; localY < CHUNK_SIZE; localY++) {
    tiles[localY] = [];
    for (let localX = 0; localX < CHUNK_SIZE; localX++) {
      // Convert to world coordinates
      const worldX = chunkX * CHUNK_SIZE + localX;
      const worldY = chunkY * CHUNK_SIZE + localY;

      // Sample noise at world coordinates
      const elevation = sampleNoise("elevation", worldX, worldY, worldSeed);
      const moisture = sampleNoise("moisture", worldX, worldY, worldSeed);
      const temperature = sampleNoise("temperature", worldX, worldY, worldSeed);

      // Determine terrain type from noise values
      const terrain = classifyTerrain(elevation, moisture, temperature);

      tiles[localY][localX] = {
        x: worldX,
        y: worldY,
        terrain,
        elevation,
        moisture,
        fertility: calculateFertility(terrain, moisture, elevation),
        object: null,
        items: [],
        reserved: null,
      };
    }
  }

  return tiles;
}

function classifyTerrain(
  elevation: number,
  moisture: number,
  temperature: number
): TerrainType {
  // Water
  if (elevation < 30) {
    return elevation < 20 ? "water_deep" : "water_shallow";
  }

  // Beach
  if (elevation < 35 && moisture > 50) {
    return "sand";
  }

  // Mountains
  if (elevation > 80) {
    return temperature < 30 ? "snow" : "stone";
  }

  // Hills
  if (elevation > 65) {
    return "stone";
  }

  // Wetlands
  if (moisture > 80) {
    return "mud";
  }

  // Forest vs grass based on moisture and temperature
  if (moisture > 50 && temperature > 30 && temperature < 80) {
    return "forest_floor";
  }

  return "grass";
}
```

### Biome Determination

```typescript
function determineBiome(
  tiles: Tile[][],
  chunkX: number,
  chunkY: number,
  worldSeed: WorldSeed
): BiomeType {

  // Sample biome noise at chunk center
  const centerX = chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
  const centerY = chunkY * CHUNK_SIZE + CHUNK_SIZE / 2;

  const moisture = sampleNoise("moisture", centerX, centerY, worldSeed);
  const temperature = sampleNoise("temperature", centerX, centerY, worldSeed);
  const elevation = sampleNoise("elevation", centerX, centerY, worldSeed);

  // Biome classification
  if (elevation < 30) return "ocean";
  if (elevation > 75) return "mountains";

  if (moisture > 70) {
    if (temperature < 40) return "swamp";
    return "rainforest";
  }

  if (moisture > 50) {
    if (temperature > 60) return "forest_light";
    return "forest_dense";
  }

  if (moisture < 30) {
    if (temperature > 70) return "desert";
    return "savanna";
  }

  if (temperature > 60) return "meadow";
  if (temperature < 40) return "tundra";

  return "plains";
}
```

---

## River Generation

Rivers are generated at world scale and carved through chunks:

```typescript
interface River {
  id: string;
  source: Position;              // Mountain/high elevation start
  mouth: Position;               // Ocean/lake end
  path: Position[];              // All tiles the river passes through
  width: number;                 // Tiles wide
  flowRate: number;
}

function generateRivers(worldSeed: WorldSeed): River[] {
  // Rivers are pre-calculated at world init
  // Stored separately from chunks
  // Each chunk checks if a river passes through it

  const rivers: River[] = [];

  // Find high elevation points (river sources)
  const sources = findRiverSources(worldSeed);

  for (const source of sources) {
    // Flow downhill using gradient descent
    const path = traceRiverPath(source, worldSeed);

    if (path.length > MIN_RIVER_LENGTH) {
      rivers.push({
        id: generateId(),
        source,
        mouth: path[path.length - 1],
        path,
        width: calculateRiverWidth(path),
        flowRate: calculateFlowRate(path),
      });
    }
  }

  return rivers;
}

// When generating a chunk, check for rivers
function applyRiversToChunk(chunk: Chunk, rivers: River[]): void {
  for (const river of rivers) {
    for (const point of river.path) {
      if (isInChunk(point, chunk)) {
        const tile = getTileAt(chunk, point);
        tile.terrain = "water_shallow";
        tile.object = null;
        // Mark neighboring tiles as riverbank
        markRiverbank(chunk, point, river.width);
      }
    }
  }
}
```

---

## Structure Generation

### Structure Types

```typescript
type StructureType =
  | "ruins"              // Ancient buildings
  | "cave_entrance"      // Underground access
  | "shrine"             // Mysterious monument
  | "abandoned_camp"     // Old settlement
  | "resource_node"      // Rich resource deposit
  | "landmark"           // Notable natural feature
  | "portal_site";       // Potential portal location (rare)

interface Structure {
  type: StructureType;
  position: Position;
  size: { width: number; height: number };
  tiles: StructureTile[][];      // What the structure looks like
  loot: Item[];                  // Discoverable items
  secrets: Secret[];             // Hidden things
  discoveredBy: string | null;
}
```

### Structure Placement

```typescript
function generateStructures(
  tiles: Tile[][],
  biome: BiomeType,
  rng: RandomGenerator,
  chunkX: number,
  chunkY: number
): Structure[] {

  const structures: Structure[] = [];

  // Check structure probability for this chunk
  const structureChance = getStructureProbability(biome);

  if (rng.random() < structureChance) {
    // Determine structure type based on biome
    const type = selectStructureType(biome, rng);

    // Find suitable location within chunk
    const location = findStructureLocation(tiles, type, rng);

    if (location) {
      // Generate the structure
      const structure = generateStructure(type, location, biome, rng);
      structures.push(structure);

      // Apply structure to tiles
      applyStructureToTiles(tiles, structure);
    }
  }

  return structures;
}
```

---

## Chunk Loading & Streaming

### Load Triggers

```typescript
interface LoadingTriggers {
  // Player/agent movement
  agentMovement: {
    trigger: "agent enters adjacent unloaded chunk",
    priority: "high",
    radius: 3,  // Load 3 chunks ahead of movement
  };

  // Visibility
  visibility: {
    trigger: "chunk would be visible on screen",
    priority: "medium",
  };

  // Pre-generation
  exploration: {
    trigger: "agent is exploring in a direction",
    priority: "low",
    generateAhead: 5,
  };
}
```

### Loading Process

```typescript
async function ensureChunkLoaded(x: number, y: number): Promise<Chunk> {
  const chunkId = `chunk_${x}_${y}`;

  // Already active?
  if (chunkManager.activeChunks.has(chunkId)) {
    return chunkManager.activeChunks.get(chunkId)!;
  }

  // In cache?
  if (chunkManager.cachedChunks.has(chunkId)) {
    const chunk = chunkManager.cachedChunks.get(chunkId)!;
    activateChunk(chunk);
    return chunk;
  }

  // On disk?
  const diskChunk = await loadChunkFromDisk(chunkId);
  if (diskChunk) {
    // Catch up simulation for time passed
    await catchUpSimulation(diskChunk);
    activateChunk(diskChunk);
    return diskChunk;
  }

  // Generate new
  const newChunk = await generateChunk(x, y, worldSeed);
  activateChunk(newChunk);
  return newChunk;
}

function activateChunk(chunk: Chunk): void {
  chunk.state = "active";
  chunk.lastAccessed = new Date();
  chunkManager.activeChunks.set(chunk.id, chunk);

  // Remove from cache if was there
  chunkManager.cachedChunks.delete(chunk.id);

  // Evict oldest cached if over limit
  evictIfNeeded();
}
```

### Unloading Process

```typescript
async function unloadDistantChunks(centerX: number, centerY: number): Promise<void> {
  for (const [id, chunk] of chunkManager.activeChunks) {
    const distance = chunkDistance(chunk.x, chunk.y, centerX, centerY);

    if (distance > UNLOAD_DISTANCE) {
      // Move to cache first
      chunk.state = "cached";
      chunkManager.cachedChunks.set(id, chunk);
      chunkManager.activeChunks.delete(id);

      // If cache is full, persist to disk
      if (chunkManager.cachedChunks.size > chunkManager.maxCachedChunks) {
        await persistOldestCachedChunk();
      }
    }
  }
}

async function persistOldestCachedChunk(): Promise<void> {
  // Find least recently accessed
  let oldest: Chunk | null = null;
  let oldestTime = Infinity;

  for (const chunk of chunkManager.cachedChunks.values()) {
    if (chunk.lastAccessed.getTime() < oldestTime) {
      oldest = chunk;
      oldestTime = chunk.lastAccessed.getTime();
    }
  }

  if (oldest) {
    oldest.state = "dormant";
    await saveChunkToDisk(oldest);
    chunkManager.cachedChunks.delete(oldest.id);
  }
}
```

---

## Dormant Chunk Simulation

When chunks are unloaded, time still passes. When reloaded, we "catch up":

```typescript
async function catchUpSimulation(chunk: Chunk): Promise<void> {
  const currentTime = getCurrentGameTime();
  const dormantTime = currentTime - chunk.lastSimulated;

  if (dormantTime <= 0) return;

  // Fast-forward simulation (simplified)
  await fastForwardPlants(chunk, dormantTime);
  await fastForwardResources(chunk, dormantTime);
  await fastForwardWeather(chunk, dormantTime);

  chunk.lastSimulated = currentTime;
}

async function fastForwardPlants(chunk: Chunk, days: number): Promise<void> {
  for (const plant of chunk.plants) {
    // Advance plant through lifecycle
    let remainingDays = days;

    while (remainingDays > 0 && plant.stage !== "dead") {
      const stageDuration = getStageDuration(plant);
      const daysInStage = Math.min(remainingDays, stageDuration - plant.stageProgress * stageDuration);

      plant.stageProgress += daysInStage / stageDuration;

      if (plant.stageProgress >= 1) {
        advancePlantStage(plant);
        plant.stageProgress = 0;
      }

      remainingDays -= daysInStage;
    }

    // Handle seed drops that would have happened
    if (plant.stage === "seeding" || plant.stage === "senescence") {
      simulateSeedDrops(plant, chunk, days);
    }
  }

  // Remove dead plants
  chunk.plants = chunk.plants.filter(p => p.stage !== "dead");
}
```

---

## Cross-Chunk Features

### Edge Matching

```typescript
// Ensure chunks blend seamlessly at edges
function blendChunkEdges(chunk: Chunk, neighbors: Map<string, Chunk>): void {
  const directions = ["north", "south", "east", "west"];

  for (const dir of directions) {
    const neighbor = neighbors.get(getNeighborId(chunk, dir));
    if (neighbor) {
      blendEdge(chunk, neighbor, dir);
    }
  }
}

function blendEdge(chunk1: Chunk, chunk2: Chunk, direction: string): void {
  // Average values at edges to prevent harsh boundaries
  const edge1 = getEdgeTiles(chunk1, direction);
  const edge2 = getEdgeTiles(chunk2, oppositeDirection(direction));

  for (let i = 0; i < edge1.length; i++) {
    // Blend terrain-related values
    edge1[i].moisture = (edge1[i].moisture + edge2[i].moisture) / 2;
    edge1[i].fertility = (edge1[i].fertility + edge2[i].fertility) / 2;
  }
}
```

### Large Features Spanning Chunks

```typescript
interface WorldFeature {
  type: "river" | "road" | "mountain_range" | "forest";
  chunks: string[];              // All chunks it touches
  path: Position[];              // Full path in world coords
}

// Features are calculated at world level, applied to chunks on generation
class WorldFeatureManager {
  features: WorldFeature[] = [];

  getFeatureForChunk(chunkX: number, chunkY: number): WorldFeature[] {
    const chunkId = `chunk_${chunkX}_${chunkY}`;
    return this.features.filter(f => f.chunks.includes(chunkId));
  }
}
```

---

## Performance

### Memory Budget

```typescript
interface MemoryBudget {
  // Per chunk
  tilesPerChunk: 32 * 32,              // 1,024 tiles
  bytesPerTile: ~100,                   // Rough estimate
  bytesPerChunk: ~150_000,              // ~150KB per chunk

  // Active chunks (simulated)
  maxActiveChunks: 25,                  // 5x5 grid
  activeMemory: ~3.75_MB,

  // Cached chunks (in memory, not simulated)
  maxCachedChunks: 100,
  cachedMemory: ~15_MB,

  // Total world memory
  maxWorldMemory: ~20_MB,               // Constant regardless of world size

  // On disk
  chunkDiskSize: ~50_KB,                // Compressed
  maxWorldDisk: "unlimited",            // Limited by storage
}
```

### Generation Performance

```typescript
interface GenerationPerformance {
  // Target times
  chunkGenerationTime: "<50ms",         // Fast enough for real-time
  chunkLoadTime: "<20ms",               // From disk
  chunkSaveTime: "<30ms",               // To disk

  // Strategies
  strategies: [
    "Pre-generate chunks in player's direction of movement",
    "Use worker threads for generation",
    "Cache noise values",
    "Use typed arrays for tile data",
    "Compress chunks before disk storage",
  ];
}
```

---

## World Coordinates

### Coordinate Systems

```typescript
interface Coordinates {
  // World coordinates (infinite)
  world: { x: number; y: number };      // Can be any integer

  // Chunk coordinates
  chunk: { x: number; y: number };      // world / CHUNK_SIZE

  // Local coordinates (within chunk)
  local: { x: number; y: number };      // world % CHUNK_SIZE

  // Screen coordinates (rendering)
  screen: { x: number; y: number };     // Relative to camera
}

function worldToChunk(worldX: number, worldY: number): { chunkX: number; chunkY: number } {
  return {
    chunkX: Math.floor(worldX / CHUNK_SIZE),
    chunkY: Math.floor(worldY / CHUNK_SIZE),
  };
}

function worldToLocal(worldX: number, worldY: number): { localX: number; localY: number } {
  return {
    localX: ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    localY: ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
  };
}
```

---

## Starting Area

### Spawn Chunk Generation

```typescript
async function generateSpawnArea(worldSeed: WorldSeed): Promise<Position> {
  // Find a suitable starting location
  // - Near water
  // - Flat terrain
  // - Good fertility
  // - Not too dense forest

  let bestScore = 0;
  let bestPos: Position = { x: 0, y: 0 };

  // Search in expanding circles from origin
  for (let radius = 0; radius < 10; radius++) {
    for (const pos of getChunkRing(0, 0, radius)) {
      const chunk = await generateChunk(pos.x, pos.y, worldSeed);
      const score = evaluateSpawnSuitability(chunk);

      if (score > bestScore) {
        bestScore = score;
        bestPos = {
          x: pos.x * CHUNK_SIZE + CHUNK_SIZE / 2,
          y: pos.y * CHUNK_SIZE + CHUNK_SIZE / 2,
        };
      }
    }

    if (bestScore > 0.8) break;  // Good enough
  }

  // Pre-generate surrounding chunks
  await preGenerateSurrounding(bestPos, 3);

  return bestPos;
}
```

---

## Summary

| Aspect | Value |
|--------|-------|
| **Chunk size** | 32x32 tiles |
| **Tile size** | 16x16 pixels |
| **Active radius** | ~5 chunks |
| **Memory per chunk** | ~150KB |
| **Max active memory** | ~20MB |
| **World size** | Infinite |
| **Generation** | Deterministic from seed |
| **Features** | Rivers, structures, biomes |
| **Dormant simulation** | Fast-forward on reload |

---

## Related Specs

- `world-system/spec.md` - Tile and biome types
- `farming-system/spec.md` - Plant generation in chunks
- `rendering-system/spec.md` - Chunk rendering
- `game-engine/spec.md` - Tick system
