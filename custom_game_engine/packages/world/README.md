# World Package - Terrain Generation & Species Registry

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the world package to understand its architecture, interfaces, and usage patterns.

## Overview

The **World Package** (`@ai-village/world`) provides terrain generation, chunk management, biome systems, and comprehensive species registries (plants, animals, alien creatures). This package is the foundation for procedurally generated game worlds, providing both Earth-like and alien ecosystems.

**What it does:**
- Procedural terrain generation using Perlin noise (elevation, moisture, temperature)
- Chunk-based world loading/unloading for infinite worlds
- Plant species registry with 100+ species (wild, cultivated, medicinal, magical, tropical, wetland)
- Animal species definitions and spawning logic
- Alien species generation (procedural creatures with LLM-powered coherence)
- Biome system mapping terrain to ecosystems
- Entity factories for world features (trees, rocks, ore deposits, mountains)
- Research paper registry (1000+ papers for tech progression)

**Key files:**
- `src/terrain/TerrainGenerator.ts` - Perlin noise-based terrain generation
- `src/chunks/ChunkManager.ts` - Chunk loading/unloading
- `src/plant-species/index.ts` - Plant species registry (100+ species)
- `src/alien-generation/AlienSpeciesGenerator.ts` - LLM-powered alien creature generation
- `src/entities/` - Entity factories for trees, rocks, ore deposits, mountains
- `src/research-papers/index.ts` - Research paper registry

---

## Package Structure

```
packages/world/
├── src/
│   ├── terrain/
│   │   ├── TerrainGenerator.ts          # Main terrain generation
│   │   ├── PerlinNoise.ts               # Noise algorithm
│   │   ├── HorizonCalculator.ts         # Horizon visibility
│   │   └── TerrainFeatureAnalyzer.ts    # Terrain analysis
│   ├── chunks/
│   │   ├── Chunk.ts                     # Chunk data structure (16×16 tiles)
│   │   ├── ChunkManager.ts              # Chunk loading/unloading
│   │   ├── ChunkSerializer.ts           # Save/load chunks
│   │   ├── Tile.ts                      # Tile types and properties
│   │   └── types.ts                     # Chunk-related types
│   ├── plant-species/
│   │   ├── index.ts                     # Species registry & lookup
│   │   ├── wild-plants.ts               # Wild species (berries, grass, trees)
│   │   ├── cultivated-crops.ts          # Farmable crops (wheat, carrot)
│   │   ├── medicinal-plants.ts          # Healing herbs
│   │   ├── magical-plants.ts            # Magic-infused plants
│   │   ├── tropical-plants.ts           # Tropical species
│   │   └── wetland-plants.ts            # Water-loving plants
│   ├── alien-generation/
│   │   ├── AlienSpeciesGenerator.ts     # LLM-powered alien creation
│   │   ├── creatures/                   # Creature trait libraries
│   │   ├── plants/                      # Alien plant traits
│   │   └── weather/                     # Alien weather phenomena
│   ├── entities/
│   │   ├── TreeEntity.ts                # Tree entity factory
│   │   ├── RockEntity.ts                # Rock entity factory
│   │   ├── OreDepositEntity.ts          # Ore deposit factory
│   │   ├── MountainEntity.ts            # Mountain entity factory
│   │   └── BerryBushEntity.ts           # Berry bush factory
│   ├── research-papers/
│   │   ├── index.ts                     # Paper registry
│   │   ├── technologies.ts              # Tech tree definitions
│   │   └── *-papers.ts                  # 1000+ research papers
│   └── index.ts                         # Package exports
├── package.json
└── README.md                            # This file
```

---

## Core Concepts

### 1. Terrain Generation

The world uses **Perlin noise** to generate coherent, natural-looking terrain:

```typescript
// TerrainGenerator generates tiles based on elevation, moisture, and temperature
class TerrainGenerator {
  private elevationNoise: PerlinNoise;    // -1 to 1
  private moistureNoise: PerlinNoise;     // -1 to 1
  private temperatureNoise: PerlinNoise;  // -1 to 1

  // Elevation thresholds
  WATER_LEVEL = -0.3;  // elevation < -0.3 = water
  SAND_LEVEL = -0.1;   // -0.3 to -0.1 = sand (beach)
  STONE_LEVEL = 0.5;   // elevation > 0.5 = stone (mountain)

  // Generates a single tile
  generateTile(worldX: number, worldY: number): Tile {
    const elevation = this.elevationNoise.noise(worldX, worldY);
    const moisture = this.moistureNoise.noise(worldX, worldY);
    const temperature = this.temperatureNoise.noise(worldX, worldY);

    // Map to terrain type
    if (elevation < WATER_LEVEL) return { type: 'water', ... };
    if (elevation < SAND_LEVEL) return { type: 'sand', ... };
    if (elevation > STONE_LEVEL) return { type: 'stone', ... };

    // Moisture determines grass vs dirt
    if (moisture > 0.2) return { type: 'grass', ... };
    return { type: 'dirt', ... };
  }
}
```

**Terrain types:**
- `water` - Lakes, rivers, oceans (elevation < -0.3)
- `sand` - Beaches, deserts (elevation -0.3 to -0.1)
- `dirt` - Dry ground (low moisture)
- `grass` - Grasslands (high moisture)
- `stone` - Mountains, cliffs (elevation > 0.5)

**Biomes** are derived from terrain patterns:
- `forest` - Dense tree coverage
- `plains` - Open grassland
- `desert` - Sandy, low moisture
- `mountain` - High elevation, rocky
- `wetland` - Water + grass

### 2. Chunk System

The world is divided into **16×16 tile chunks** for efficient loading/unloading:

```typescript
const CHUNK_SIZE = 16; // 16×16 tiles per chunk

interface Chunk {
  x: number;           // Chunk X coordinate
  y: number;           // Chunk Y coordinate
  tiles: Tile[];       // 256 tiles (16×16)
  generated: boolean;  // Has terrain been generated?
}

// Convert world coordinates to chunk coordinates
const chunkX = Math.floor(worldX / CHUNK_SIZE);
const chunkY = Math.floor(worldY / CHUNK_SIZE);

// Convert world coordinates to local tile coordinates
const localX = worldX % CHUNK_SIZE;
const localY = worldY % CHUNK_SIZE;
```

**Chunk loading:**
- `ChunkManager` loads chunks within `loadRadius` (default: 2 chunks) of camera
- Distant chunks are unloaded to save memory
- Chunks are generated on-demand by `TerrainGenerator`

**Chunk lifecycle:**
```
1. Camera moves → ChunkManager detects new chunks needed
2. ChunkManager.getChunk(x, y) → Creates chunk if missing
3. TerrainGenerator.generateChunk(chunk, world)
   → Generates 256 tiles
   → Places entities (trees, rocks, animals)
   → Marks chunk.generated = true
4. Chunk is saved/serialized when modified
5. Distant chunks are unloaded (removed from memory)
```

### 3. Plant Species Registry

Plant species are defined in `plant-species/` and accessed via lookup functions:

```typescript
interface PlantSpecies {
  id: string;                      // 'wild_strawberry'
  name: string;                    // "Wild Strawberry"
  category: PlantCategory;         // 'wild' | 'crop' | 'herb' | 'tree' | etc.
  biomes: string[];                // ['forest', 'plains']
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';

  stageTransitions: StageTransition[]; // Lifecycle: seed → ... → dead
  baseGenetics: PlantGenetics;     // Default genetics

  seedsPerPlant: number;           // Seeds produced at maturity
  seedDispersalRadius: number;     // Tiles seeds scatter

  optimalTemperatureRange: [number, number]; // [min, max] °C
  optimalMoistureRange: [number, number];    // [min, max] %

  properties: PlantProperties;     // Edible, medicinal, magical, etc.
}
```

**Species categories:**
- **Wild plants** (`wild-plants.ts`): Berries, grass, trees, mushrooms - 30+ species
- **Cultivated crops** (`cultivated-crops.ts`): Wheat, carrot, tomato - 20+ species
- **Medicinal plants** (`medicinal-plants.ts`): Healing herbs - 15+ species
- **Magical plants** (`magical-plants.ts`): Mana-infused flora - 10+ species
- **Tropical plants** (`tropical-plants.ts`): Jungle species - 15+ species
- **Wetland plants** (`wetland-plants.ts`): Water-loving species - 10+ species

**Total: 100+ plant species**

### 4. Alien Species Generation

The `AlienSpeciesGenerator` uses LLMs to create coherent alien creatures:

```typescript
interface AlienGenerationConstraints {
  dangerLevel?: 'harmless' | 'minor' | 'moderate' | 'severe' | 'extinction_level';
  intelligence?: 'instinctual_only' | 'proto_sapient' | 'fully_sapient' | 'hive_intelligence';
  environment?: 'terrestrial' | 'aquatic' | 'aerial' | 'subterranean' | 'void';
  nativeWorld?: string;
}

interface GeneratedAlienSpecies extends AlienCreatureSpecies {
  spritePrompt: string;      // PixelLab generation prompt
  biologyNotes: string;      // Detailed biology
  behaviorNotes: string;     // Behavioral patterns
  culturalNotes?: string;    // Culture (if sapient)
}

// Generate alien species
const generator = new AlienSpeciesGenerator(llmProvider);
const alien = await generator.generateAlienSpecies({
  dangerLevel: 'moderate',
  intelligence: 'proto_sapient',
  nativeWorld: 'Kepler-442b'
});
```

**Alien trait libraries:**
- **Body Plans** (`creatures/BodyPlans.ts`): Bilateral, radial, serpentine, etc.
- **Locomotion** (`creatures/Locomotion.ts`): Walking, flying, swimming, burrowing
- **Sensory Systems** (`creatures/SensorySystems.ts`): Vision, echolocation, magnetic sense
- **Diet Patterns** (`creatures/DietPatterns.ts`): Herbivore, carnivore, photosynthetic
- **Social Structures** (`creatures/SocialStructures.ts`): Solitary, pack, hive mind
- **Defensive Systems** (`creatures/DefensiveSystems.ts`): Armor, camouflage, toxins
- **Reproduction** (`creatures/ReproductionStrategies.ts`): Egg-laying, live birth, budding
- **Intelligence** (`creatures/IntelligenceLevels.ts`): Instinctual to sapient

The LLM evaluates trait combinations for **biological coherence**:
- "Does a flying creature with rock armor make sense?" → Probably not
- "Does an aquatic creature with gills and photosynthetic skin work?" → Yes

### 5. Tiles & Terrain Types

Every tile stores terrain type, elevation, moisture, temperature, and resources:

```typescript
interface Tile {
  type: TerrainType;        // 'grass', 'water', 'stone', etc.
  elevation: number;        // -1 to 1 (derived from Perlin noise)

  // Soil properties (for farming)
  moisture: number;         // 0-100 (soil water content)
  nutrients: number;        // 0-100 (soil fertility)
  tilled: boolean;          // Has an agent tilled this soil?

  // Temperature (from weather + biome)
  temperature: number;      // °C

  // Tile-based building system (walls, doors, windows)
  wall?: WallTile;          // Wall on this tile (blocks movement)
  door?: DoorTile;          // Door on this tile (can open/close)
  window?: WindowTile;      // Window on this tile (blocks movement, allows light)

  // Future: Fluid system (water, magma, blood)
  fluid?: {
    type: FluidType;        // 'water', 'magma', 'blood', 'oil', 'acid'
    depth: number;          // 0-100
  };
}

type TerrainType = 'grass' | 'dirt' | 'sand' | 'stone' | 'water' | 'snow' | 'ice' | 'mud';
type BiomeType = 'plains' | 'forest' | 'desert' | 'mountain' | 'wetland' | 'tundra' | 'jungle';
```

**Tile-based buildings** (RimWorld/Dwarf Fortress style):
- **Walls** block movement and provide insulation
- **Doors** can be opened/closed, provide passage through walls
- **Windows** block movement but allow light

### 6. Entity Factories

The `entities/` directory provides factory functions for world features:

```typescript
// Trees (harvestable wood resource)
function createTree(
  world: WorldMutator,
  x: number,
  y: number,
  z?: number,
  options?: {
    useVoxelResource?: boolean;  // Height-based harvesting
    treeHeight?: number;         // Height in levels (default: 4)
    woodMaterial?: string;       // 'wood', 'oak', 'pine', etc.
  }
): string; // Returns entity ID

// Rocks (harvestable stone resource)
function createRock(world: WorldMutator, x: number, y: number, z?: number): string;

// Ore deposits (iron, coal, copper, gold)
function createIronDeposit(world: WorldMutator, x: number, y: number, z?: number): string;
function createCoalDeposit(world: WorldMutator, x: number, y: number, z?: number): string;
function createCopperDeposit(world: WorldMutator, x: number, y: number, z?: number): string;
function createGoldDeposit(world: WorldMutator, x: number, y: number, z?: number): string;

// Mountains (large stone formations, block pathfinding)
function createMountain(world: WorldMutator, x: number, y: number, z?: number): string;

// Berry bushes (harvestable berries, regrow over time)
function createBerryBush(world: WorldMutator, x: number, y: number, z?: number): string;

// Leaf piles (gatherable fiber resource)
function createLeafPile(world: WorldMutator, x: number, y: number, z?: number): string;

// Fiber plants (gatherable fiber for crafting)
function createFiberPlant(world: WorldMutator, x: number, y: number, z?: number): string;
```

**Entity factories prevent duplicates:**
- Check for existing entities at position before creating
- Return existing entity ID if found
- Prevents duplicate trees/rocks on chunk reload

---

## System APIs

### TerrainGenerator

Generates terrain using Perlin noise and places world entities.

**Dependencies:** `PerlinNoise`

**Key methods:**

```typescript
class TerrainGenerator {
  constructor(seed: string, godCraftedSpawner?: GodCraftedDiscoverySystem);

  // Generate terrain for a chunk
  generateChunk(chunk: Chunk, world?: WorldMutator): void;

  // Generate a single tile
  generateTile(worldX: number, worldY: number): Tile;

  // Place entities in chunk (trees, rocks, animals)
  placeEntities(chunk: Chunk, world: WorldMutator): void;

  // Determine chunk's primary biome
  determineChunkBiome(chunk: Chunk): BiomeType;
}
```

**Entity placement:**
- **Trees**: 5-20% of forest tiles
- **Rocks**: 2-10% of stone/mountain tiles
- **Ore deposits**: 0.5-2% of mountain tiles (rarer = less common)
- **Mountains**: ~1% of high-elevation tiles
- **Wild animals**: Spawned via `WildAnimalSpawningSystem`
- **God-crafted content**: Spawned via `GodCraftedDiscoverySystem` (optional)

**Seeded generation:**
- Same seed = same terrain
- Seed is hashed to generate 3 noise functions (elevation, moisture, temperature)
- Deterministic world generation

### ChunkManager

Manages chunk loading/unloading based on camera position.

**Key methods:**

```typescript
class ChunkManager {
  constructor(loadRadius: number = 2);

  // Get or create chunk
  getChunk(chunkX: number, chunkY: number): Chunk;

  // Check if chunk exists
  hasChunk(chunkX: number, chunkY: number): boolean;

  // Get all loaded chunks
  getLoadedChunks(): Chunk[];

  // Update loaded chunks based on camera position
  updateLoadedChunks(cameraWorldX: number, cameraWorldY: number): {
    loaded: Chunk[];   // Newly loaded chunks (need generation)
    unloaded: Chunk[]; // Chunks to remove from memory
  };

  // Get chunks in rectangular area
  getChunksInArea(
    startChunkX: number,
    startChunkY: number,
    endChunkX: number,
    endChunkY: number
  ): Chunk[];

  // Clear all chunks (e.g., on world reset)
  clearChunks(): void;
}
```

**Load radius:**
- Default: 2 chunks (5×5 grid = 25 chunks loaded)
- Unload chunks beyond `loadRadius + 1` (prevents flickering)

### Plant Species Lookup

Fast lookup functions for plant species:

```typescript
// Get species by ID (throws if not found)
function getPlantSpecies(speciesId: string): PlantSpecies;

// Get all species
function getAllPlantSpecies(): PlantSpecies[];

// Get species by category
function getSpeciesByCategory(category: string): PlantSpecies[];

// Get wild spawnable species
function getWildSpawnableSpecies(): PlantSpecies[];

// Get species by biome
function getSpeciesByBiome(biome: string): PlantSpecies[];

// Get species by rarity
function getSpeciesByRarity(rarity: 'common' | 'uncommon' | 'rare' | 'legendary'): PlantSpecies[];

// Get medicinal plants
function getMedicinalPlants(): PlantSpecies[];

// Get magical plants
function getMagicalPlants(): PlantSpecies[];

// Get cultivated crops
function getCultivatedCrops(): PlantSpecies[];
```

**Species lookup is cached:**
- Species map built once at module load
- O(1) lookup by ID
- No runtime overhead

### AlienSpeciesGenerator

LLM-powered alien creature generation.

**Dependencies:** `LLMProvider` (Claude, GPT, etc.)

**Key methods:**

```typescript
class AlienSpeciesGenerator {
  constructor(llmProvider: LLMProvider);

  // Generate alien species
  async generateAlienSpecies(
    constraints: AlienGenerationConstraints
  ): Promise<GeneratedAlienSpecies>;

  // Generate alien plant
  async generateAlienPlant(
    constraints: AlienGenerationConstraints
  ): Promise<GeneratedAlienPlant>;

  // Generate alien weather phenomenon
  async generateWeatherPhenomenon(
    constraints: AlienGenerationConstraints
  ): Promise<GeneratedWeatherPhenomenon>;
}
```

**LLM prompting:**
- Provides trait libraries (body plans, locomotion, etc.)
- Asks LLM to evaluate biological coherence
- Generates name, description, behavior, and sprite prompt
- Caches generated species (avoid duplicates)

---

## Usage Examples

### Example 1: Generating Terrain

```typescript
import { TerrainGenerator, ChunkManager } from '@ai-village/world';

// Create terrain generator with seed
const generator = new TerrainGenerator('my_world_seed');

// Create chunk manager
const chunkManager = new ChunkManager(2); // Load radius: 2 chunks

// Generate chunks near camera
const cameraX = 0;
const cameraY = 0;
const { loaded } = chunkManager.updateLoadedChunks(cameraX, cameraY);

for (const chunk of loaded) {
  generator.generateChunk(chunk, world); // Generate terrain + entities
}

// Query tiles
const chunk = chunkManager.getChunk(0, 0); // Chunk at (0, 0)
const tile = chunk.tiles[0]; // First tile (local 0, 0)
console.log(`Terrain: ${tile.type}, Elevation: ${tile.elevation}`);
```

### Example 2: Looking Up Plant Species

```typescript
import {
  getPlantSpecies,
  getAllPlantSpecies,
  getSpeciesByBiome,
  getMedicinalPlants
} from '@ai-village/world';

// Get specific species
const strawberry = getPlantSpecies('wild_strawberry');
console.log(strawberry.name); // "Wild Strawberry"
console.log(strawberry.biomes); // ['forest', 'plains']

// Get all forest plants
const forestPlants = getSpeciesByBiome('forest');
console.log(`${forestPlants.length} species grow in forests`);

// Get all medicinal plants
const healingHerbs = getMedicinalPlants();
for (const herb of healingHerbs) {
  console.log(`${herb.name}: treats ${herb.properties.medicinal.treats.join(', ')}`);
}

// Get all species
const allSpecies = getAllPlantSpecies();
console.log(`Total plant species: ${allSpecies.length}`);
```

### Example 3: Creating World Entities

```typescript
import {
  createTree,
  createRock,
  createIronDeposit,
  createMountain
} from '@ai-village/world';

// Spawn trees
const tree1 = createTree(world, 10, 10); // Simple tree
const tree2 = createTree(world, 15, 15, 0, {
  useVoxelResource: true,  // Height-based harvesting
  treeHeight: 6,           // 6 levels tall
  woodMaterial: 'oak'      // Oak wood
});

// Spawn rocks
const rock = createRock(world, 20, 20);

// Spawn ore deposits
const ironOre = createIronDeposit(world, 25, 25);
const goldOre = createGoldDeposit(world, 30, 30);

// Spawn mountains
const mountain = createMountain(world, 50, 50);

// Entity factories return entity ID
console.log(`Created tree: ${tree1}`);
```

### Example 4: Generating Alien Species

```typescript
import { AlienSpeciesGenerator } from '@ai-village/world';
import { llmProvider } from '@ai-village/llm';

// Create generator
const generator = new AlienSpeciesGenerator(llmProvider);

// Generate moderately dangerous alien
const alien = await generator.generateAlienSpecies({
  dangerLevel: 'moderate',
  intelligence: 'proto_sapient',
  environment: 'terrestrial',
  nativeWorld: 'Kepler-442b'
});

console.log(`Species: ${alien.scientificName} (${alien.commonName})`);
console.log(`Body: ${alien.bodyPlan.name}`);
console.log(`Locomotion: ${alien.locomotion.name}`);
console.log(`Intelligence: ${alien.intelligence.level}`);
console.log(`Behavior: ${alien.behaviorNotes}`);
console.log(`PixelLab prompt: ${alien.spritePrompt}`);

// Spawn alien creature in world
const entity = world.createEntity();
entity.addComponent({
  type: 'alien_creature',
  speciesId: alien.id,
  // ... other components
});
```

### Example 5: Chunk Serialization (Save/Load)

```typescript
import { ChunkSerializer } from '@ai-village/world';

// Serialize chunk to JSON
const serializer = new ChunkSerializer();
const chunk = chunkManager.getChunk(0, 0);
const chunkData = serializer.serialize(chunk);

// Save to storage
await storage.saveChunk('chunk_0_0', chunkData);

// Load from storage
const loadedData = await storage.loadChunk('chunk_0_0');
const loadedChunk = serializer.deserialize(loadedData);

// Restore to chunk manager
chunkManager.chunks.set('0:0', loadedChunk);
```

---

## Architecture & Data Flow

### World Initialization Flow

```
1. GameLoop creates TerrainGenerator(seed)
   ↓
2. GameLoop creates ChunkManager(loadRadius)
   ↓
3. Camera position updates → ChunkManager.updateLoadedChunks()
   ↓ Returns { loaded: Chunk[], unloaded: Chunk[] }
4. For each loaded chunk:
   TerrainGenerator.generateChunk(chunk, world)
   ↓ Generates 256 tiles (16×16)
   ↓ Places entities (trees, rocks, ore, animals)
   ↓ Marks chunk.generated = true
5. For each unloaded chunk:
   ChunkSerializer.serialize(chunk) → Save to storage
   ChunkManager removes from memory
```

### Terrain Generation Flow

```
TerrainGenerator.generateChunk()
  ↓
1. Generate tiles (16×16 = 256 tiles)
   ↓ For each tile:
     generateTile(worldX, worldY)
       ↓ Sample elevation noise
       ↓ Sample moisture noise
       ↓ Sample temperature noise
       ↓ Map to terrain type (water, sand, grass, dirt, stone)
       ↓ Calculate soil properties (moisture, nutrients)
       ↓ Store in chunk.tiles[index]
  ↓
2. Update MapKnowledge sector terrain data (for pathfinding)
  ↓
3. Place entities
   ↓ Trees (5-20% of forest tiles)
   ↓ Rocks (2-10% of stone tiles)
   ↓ Ore deposits (0.5-2% of mountain tiles)
   ↓ Mountains (~1% of high-elevation tiles)
  ↓
4. Spawn wild animals (via WildAnimalSpawningSystem)
  ↓
5. Spawn god-crafted content (via GodCraftedDiscoverySystem, optional)
  ↓
6. Mark chunk.generated = true
```

### Plant Species Lookup Flow

```
Module load
  ↓
plant-species/index.ts initializes
  ↓
1. Import species arrays
   WILD_PLANTS (30+ species)
   CULTIVATED_CROPS (20+ species)
   MEDICINAL_PLANTS (15+ species)
   MAGICAL_PLANTS (10+ species)
   TROPICAL_PLANTS (15+ species)
   WETLAND_PLANTS (10+ species)
  ↓
2. Concatenate into ALL_SPECIES array (100+ species)
  ↓
3. Build SPECIES_MAP: Map<string, PlantSpecies>
   ↓ For each species:
     SPECIES_MAP.set(species.id, species)
  ↓
4. Export lookup functions
   getPlantSpecies(id) → O(1) lookup
   getAllPlantSpecies() → Returns array clone
   getSpeciesByBiome(biome) → Filter by biome
   etc.

Runtime lookup (by PlantSystem, etc.)
  ↓
const species = getPlantSpecies('wild_strawberry');
  ↓ SPECIES_MAP.get('wild_strawberry')
  ↓ Returns PlantSpecies object (or throws if not found)
```

### Alien Generation Flow

```
AlienSpeciesGenerator.generateAlienSpecies(constraints)
  ↓
1. Load trait libraries
   BODY_PLANS (20+ options)
   LOCOMOTION_METHODS (15+ options)
   SENSORY_SYSTEMS (20+ options)
   DIET_PATTERNS (10+ options)
   SOCIAL_STRUCTURES (10+ options)
   etc.
  ↓
2. LLM prompt:
   "Given these constraints, select traits that form a biologically coherent alien.
    Environment: terrestrial
    Danger level: moderate
    Intelligence: proto_sapient

    Available body plans: [list]
    Available locomotion: [list]
    ...

    Return JSON: { bodyPlan, locomotion, senses, diet, social, ... }"
  ↓
3. LLM returns trait selection
  ↓
4. Generate name (scientific + common)
   LLM prompt: "Generate scientific and common names for this alien"
  ↓
5. Generate descriptions
   LLM prompt: "Describe biology, behavior, and appearance"
  ↓
6. Generate sprite prompt
   LLM prompt: "Create PixelLab prompt for top-down sprite"
  ↓
7. Return GeneratedAlienSpecies
```

---

## Performance Considerations

**Optimization strategies:**

1. **Chunk-based loading:** Only 25-100 chunks loaded at a time (load radius 2-5)
2. **Lazy generation:** Chunks generated on-demand, not upfront
3. **Species lookup caching:** O(1) lookup via Map, built once at module load
4. **Entity deduplication:** Entity factories check for existing entities before creating
5. **Chunk unloading:** Distant chunks serialized and removed from memory
6. **Perlin noise caching:** Gradient vectors cached, noise function optimized

**Query caching:**

```typescript
// ❌ BAD: Query in loop
for (const chunk of chunks) {
  const trees = world.query().with('tree').executeEntities(); // Query every iteration!
}

// ✅ GOOD: Query once, cache results
const trees = world.query().with('tree').executeEntities(); // Query once
for (const chunk of chunks) {
  // Use cached trees
}
```

**Squared distance comparisons:**

```typescript
// ❌ BAD: Math.sqrt in hot path (entity placement)
if (Math.sqrt(dx*dx + dy*dy) < radius) { }

// ✅ GOOD: Squared comparison
if (dx*dx + dy*dy < radius*radius) { }
```

**Chunk serialization:**

```typescript
// Serialize chunks to compressed JSON
const chunkData = ChunkSerializer.serialize(chunk);
// { x, y, tiles: [...], generated: true }

// Tiles stored as flat array (256 elements)
// Each tile: { type, elevation, moisture, nutrients, tilled, temperature }
// ~10-20KB per chunk (compressed)
```

---

## Troubleshooting

### Terrain not generating

**Check:**
1. `chunk.generated` is false? (chunk needs generation)
2. `TerrainGenerator.generateChunk()` called with `world` parameter?
3. Chunk within load radius of camera?
4. Seed is valid string? (non-empty)

**Debug:**
```typescript
const chunk = chunkManager.getChunk(0, 0);
console.log(`Chunk generated: ${chunk.generated}`);
console.log(`Tiles: ${chunk.tiles.length}`); // Should be 256

const tile = chunk.tiles[0];
console.log(`First tile: ${tile.type}, elevation: ${tile.elevation}`);
```

### Plant species not found

**Error:** `PlantSpecies not found: some_species_id`

**Check:**
1. Species ID matches exactly (case-sensitive)?
2. Species registered in `plant-species/index.ts`?
3. Species array imported and added to `ALL_SPECIES`?

**Fix:**
```typescript
// In plant-species/index.ts
import { MY_NEW_SPECIES } from './my-new-species.js';

const ALL_SPECIES: PlantSpecies[] = [
  ...WILD_PLANTS,
  MY_NEW_SPECIES, // Add here
  // ...
];
```

### Chunks not loading

**Check:**
1. Camera position valid? (not NaN or undefined)
2. Load radius > 0?
3. `updateLoadedChunks()` called each frame or when camera moves?

**Debug:**
```typescript
const { loaded, unloaded } = chunkManager.updateLoadedChunks(cameraX, cameraY);
console.log(`Loaded ${loaded.length} chunks, unloaded ${unloaded.length}`);
console.log(`Total chunks: ${chunkManager.getLoadedChunks().length}`);
```

### Entities duplicating on chunk reload

**Check:**
1. Entity factories checking for existing entities at position?
2. `chunk.generated` flag set correctly?
3. Chunk not being regenerated on load?

**Fix:**
```typescript
// Entity factories prevent duplicates
function createTree(world, x, y, z) {
  // Check for existing tree at position
  const existing = world.query()
    .with('position')
    .with('tags')
    .executeEntities()
    .find(e => {
      const pos = e.getComponent('position');
      const tags = e.getComponent('tags');
      return Math.abs(pos.x - x) < 0.1 && tags.tags?.includes('tree');
    });

  if (existing) return existing.id; // Return existing, don't create new

  // Create new tree...
}
```

### Perlin noise looks wrong

**Check:**
1. Seed is different from previous run? (noise changes with seed)
2. Scale/frequency correct? (small = low frequency, large = high frequency)
3. Noise range is -1 to 1 (normalize if needed)

**Debug:**
```typescript
const noise = new PerlinNoise(seed);
for (let i = 0; i < 10; i++) {
  console.log(`noise(${i}, 0) = ${noise.noise(i, 0)}`); // Should be -1 to 1
}
```

---

## Integration with Other Systems

### PlantSystem

Plant species from this package are used by `PlantSystem`:

```typescript
import { getPlantSpecies } from '@ai-village/world';
import { PlantSystem } from '@ai-village/core';

// PlantSystem uses species lookup
plantSystem.setSpeciesLookup(getPlantSpecies);

// PlantSystem queries species for lifecycle transitions
const species = getPlantSpecies(plant.speciesId);
const transition = species.stageTransitions.find(t => t.from === plant.stage);
```

### WildPlantPopulationSystem

Uses species registry to spawn wild plants:

```typescript
import { getWildSpawnableSpecies, getSpeciesByBiome } from '@ai-village/world';

// Spawn wild plants naturally
const wildSpecies = getWildSpawnableSpecies(); // Returns WILD_PLANTS array
const forestSpecies = wildSpecies.filter(s => s.biomes.includes('forest'));

// Pick random species weighted by rarity
const selectedSpecies = weightedRandom(forestSpecies);
```

### Renderer

Chunks and tiles are rendered by `Renderer`:

```typescript
// Renderer queries chunks
const chunks = chunkManager.getLoadedChunks();

for (const chunk of chunks) {
  for (let i = 0; i < chunk.tiles.length; i++) {
    const tile = chunk.tiles[i];

    // Render tile sprite based on type
    const sprite = getTileSprite(tile.type);
    renderer.drawSprite(sprite, tileX, tileY);
  }
}
```

### PathfindingSystem

Uses terrain data for navigation:

```typescript
// PathfindingSystem reads tiles to determine walkability
function isWalkable(tile: Tile): boolean {
  if (tile.type === 'water') return false; // Can't walk on water
  if (tile.wall) return false;             // Walls block movement
  return true;
}

// MapKnowledge stores terrain data per sector
const sector = mapKnowledge.getSector(sectorX, sectorY);
const terrainData = sector.terrainData; // Updated by TerrainGenerator
```

### SaveLoadSystem

Chunks are serialized and saved:

```typescript
import { ChunkSerializer } from '@ai-village/world';

// Save all chunks
const serializer = new ChunkSerializer();
const chunks = chunkManager.getLoadedChunks();
const chunksData = chunks.map(chunk => serializer.serialize(chunk));

await storage.save('chunks', chunksData);

// Load chunks
const loadedData = await storage.load('chunks');
for (const chunkData of loadedData) {
  const chunk = serializer.deserialize(chunkData);
  chunkManager.chunks.set(getChunkKey(chunk.x, chunk.y), chunk);
}
```

---

## Testing

Run world package tests:

```bash
npm test -- Chunk.test.ts
npm test -- ChunkManager.test.ts
npm test -- ChunkSerializer.test.ts
npm test -- Tile.test.ts
npm test -- PerlinNoise.test.ts
```

**Key test files:**
- `src/chunks/__tests__/Chunk.test.ts` - Chunk data structure
- `src/chunks/__tests__/ChunkManager.test.ts` - Chunk loading/unloading
- `src/chunks/__tests__/ChunkSerializer.test.ts` - Save/load
- `src/chunks/__tests__/Tile.test.ts` - Tile types
- `src/terrain/__tests__/PerlinNoise.test.ts` - Noise generation

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference
- **COMPONENTS_REFERENCE.md** - All component types
- **METASYSTEMS_GUIDE.md** - Deep dive into reproduction, genetics, multiverse
- **PERFORMANCE.md** - Performance optimization guide
- **packages/botany/README.md** - Plant lifecycle system
- **Plant Species Files** - `src/plant-species/*.ts` - 100+ plant definitions
- **Alien Generation** - `src/alien-generation/` - Procedural alien creatures

---

## Summary for Language Models

**Before working with the world package:**
1. Read this README completely
2. Understand chunk-based world structure (16×16 tiles per chunk)
3. Know terrain generation uses Perlin noise (elevation, moisture, temperature)
4. Know plant species lookup is O(1) via Map (cached at module load)
5. Understand entity factories prevent duplicates by checking existing entities

**Common tasks:**
- **Generate terrain:** Create `TerrainGenerator(seed)`, call `generateChunk(chunk, world)`
- **Load chunks:** Use `ChunkManager.updateLoadedChunks(cameraX, cameraY)`
- **Lookup plant species:** Use `getPlantSpecies(id)` or `getSpeciesByBiome(biome)`
- **Create world entities:** Use factory functions (`createTree()`, `createRock()`, etc.)
- **Generate alien species:** Use `AlienSpeciesGenerator.generateAlienSpecies(constraints)`
- **Query tiles:** Access `chunk.tiles[index]` or use `getTileAt(chunk, localX, localY)`

**Critical rules:**
- Never delete chunks (serialize and unload instead)
- Always check `chunk.generated` before regenerating terrain
- Use entity factories to prevent duplicates (don't create entities directly)
- Cache species lookup function (don't query Map repeatedly)
- Use squared distance comparisons (avoid Math.sqrt in hot paths)
- Load chunks within radius of camera (don't load entire world)

**Data flow:**
- Camera moves → ChunkManager loads nearby chunks → TerrainGenerator generates terrain + entities
- PlantSystem → getPlantSpecies() → Species lookup → Lifecycle transitions
- Renderer → ChunkManager → Chunks → Tiles → Render terrain sprites
- PathfindingSystem → MapKnowledge → Terrain data → Navigation

**Performance:**
- Chunk-based loading (only load 25-100 chunks at a time)
- Species lookup cached (O(1) via Map)
- Entity factories check for duplicates (prevent duplicate trees/rocks)
- Perlin noise optimized (gradient vectors cached)
- Chunk serialization compressed (~10-20KB per chunk)

**Integration points:**
- `PlantSystem` uses `getPlantSpecies()` for lifecycle
- `WildPlantPopulationSystem` uses `getWildSpawnableSpecies()`
- `Renderer` uses chunks and tiles for terrain rendering
- `PathfindingSystem` uses terrain data for navigation
- `SaveLoadSystem` uses `ChunkSerializer` for persistence
