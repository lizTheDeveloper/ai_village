# Planet Reuse Architecture Plan

## Goals

1. **Same planet in multiple saves** - Start new games on existing planets at different locations
2. **Parallel chunk loading** - Begin terrain generation the moment we commit to a planet
3. **Faster startup** - Reuse biosphere generation (57s) when planet already exists
4. **Multi-colony gameplay** - God can have colonies in different areas of the same planet
5. **Multi-browser multiplayer** - Two windows = two views into same world; different profiles = different gods

## User Design Decisions

| Decision | Choice | Implication |
|----------|--------|-------------|
| **Terrain sharing** | Shared | All saves share terrain modifications - persistent world model |
| **Named locations** | Global registry | Names persist across all saves for shared lore |
| **Registry cleanup** | Never | Keep all planets forever (disk space permitting) |
| **Multi-browser** | Enable | SharedWorker architecture already 95% built |

## Existing Infrastructure (Already Built!)

The **SharedWorker package** already provides the foundation for shared world state:

```
packages/shared-worker/
├── shared-universe-worker.ts   # Authoritative 20 TPS simulation
├── UniverseClient.ts           # Window-side connector (thin client)
├── game-bridge.ts              # Compatibility layer for existing code
├── PathPredictionSystem.ts     # 95-99% bandwidth reduction
└── DeltaSyncSystem.ts          # Only sync changed entities
```

**Key capabilities already working:**
- Single SharedWorker runs simulation across all tabs (same origin)
- Windows are view-only renderers + input forwarders
- IndexedDB persistence owned by worker (single-writer)
- Player ID from localStorage (`ai-village-player-id`)
- Different Chrome profiles = different player IDs = different gods

**What the SharedWorker enables:**
```
Same Chrome Profile (Player A)              Different Profile (Player B)
┌─────────┐  ┌─────────┐                   ┌─────────┐
│ Tab 1   │  │ Tab 2   │                   │ Tab 3   │
│ God A   │  │ God A   │                   │ God B   │
└────┬────┘  └────┬────┘                   └────┬────┘
     │            │                              │
     └──────┬─────┘                              │
            ▼                                    ▼
     SharedWorker A                       SharedWorker B
     (localStorage: player:abc)           (localStorage: player:xyz)
            ▼                                    ▼
     IndexedDB A                          IndexedDB B
     (isolated)                           (isolated)
```

**For true cross-profile shared world**, we need the PlanetRegistry to live OUTSIDE per-profile IndexedDB - options:
1. **Server-side planet storage** (multiverse server already exists)
2. **Shared IndexedDB** via service worker (complex)
3. **Filesystem storage** (Electron/Tauri only)

---

## Architectural Shift: Shared World Model

The current architecture has **complete isolation** between saves:
```
Save A ──────────────────────────────────────────────────────────
│   └── Universe:main
│         └── Planet:homeworld (terrain, biosphere, entities)
│               └── Chunks, Buildings, Modifications
│
Save B ──────────────────────────────────────────────────────────
│   └── Universe:main
│         └── Planet:homeworld (SEPARATE terrain, biosphere, entities)
│               └── Different chunks, different buildings
```

**NEW architecture with shared terrain:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANET REGISTRY (Global)                      │
│  Persisted separately from saves in IndexedDB                   │
│                                                                  │
│  planet:magical:abc123                                          │
│  ├── config (seed, type, parameters)                            │
│  ├── biosphere (species, food webs) - 57s generation cached     │
│  ├── terrain chunks (tiles) - SHARED across all saves           │
│  └── named locations (Valley of Dawn, Crystal Caves)            │
└─────────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐       ┌─────────────────────┐
│ Save A              │       │ Save B              │
│ ├── Universe:main   │       │ ├── Universe:main   │
│ │   └── entities[]  │       │ │   └── entities[]  │
│ │       (agents,    │       │ │       (different  │
│ │       items,      │       │ │        agents,    │
│ │       buildings*) │       │ │        items)     │
│ └── References:     │       │ └── References:     │
│     planet:magical: │       │     planet:magical: │
│     abc123          │       │     abc123          │
└─────────────────────┘       └─────────────────────┘

* Buildings are entities, not terrain - they persist per-save
  BUT the terrain modifications (walls, floors in tiles) are SHARED
```

**Key implications:**
1. **Terrain is shared** - If Save A builds a wall, Save B sees it in terrain
2. **Building entities are NOT shared** - The "building" component entity is per-save
3. **Agents are NOT shared** - Each save has its own agent population
4. **Biosphere is shared** - Same species exist across saves
5. **Modification conflict** - Need strategy for concurrent terrain modifications

**Conflict resolution strategy:**
- Last-write-wins for terrain tiles (simple, may cause visual inconsistency)
- OR: Track modification timestamps, merge on load
- OR: Optimistic locking with conflict detection (complex)

**Recommendation**: Start with last-write-wins. Most players won't run multiple saves simultaneously.

---

## Current State Analysis

### What Exists (Good Foundations)

| Component | Status | Location |
|-----------|--------|----------|
| `PlanetSnapshot` type | ✅ Complete | `packages/world/src/planet/PlanetTypes.ts` |
| `Planet.toSnapshot()` / `fromSnapshot()` | ✅ Complete | `packages/world/src/planet/Planet.ts` |
| `WorldSnapshot.planets[]` array | ✅ Defined | `packages/persistence/src/types.ts:217-218` |
| `PlanetTerrainSnapshot` type | ✅ Complete | `packages/persistence/src/types.ts:148-156` |
| `BackgroundChunkGenerator` | ✅ Complete | `packages/world/src/chunks/BackgroundChunkGenerator.ts` |
| `ChunkSerializer` with compression | ✅ Complete | `packages/world/src/chunks/ChunkSerializer.ts` |
| Worker pool for chunk generation | ✅ Complete | `packages/world/src/workers/ChunkGenerationWorkerPool.ts` |

### What's Missing

| Gap | Impact |
|-----|--------|
| **WorldSerializer ignores `planets[]`** | Only active planet terrain is saved |
| **No PlanetRegistry** | Planets regenerate from scratch every new game |
| **No early chunk queuing** | Chunks don't generate until after game fully loads |
| **Planet tied to save identity** | Can't share planet across different save games |

---

## Architecture Design

### Phase 1: Fix Multi-Planet Persistence (WorldSerializer)

**Problem**: `WorldSerializer.serializeWorldState()` only saves active planet terrain to legacy `terrain` field, ignoring the existing `planets[]` array.

**Files to modify**:
- `packages/persistence/src/WorldSerializer.ts`

**Changes**:

```typescript
// In serializeWorldState()
private serializeWorldState(world: World): WorldSnapshot {
  const worldImpl = world as WorldImpl;

  // NEW: Serialize ALL registered planets
  const planets: PlanetTerrainSnapshot[] = [];
  for (const [planetId, planet] of worldImpl.getPlanets()) {
    planets.push({
      $schema: 'https://aivillage.dev/schemas/planet-terrain/v1',
      $version: 1,
      planet: planet.toSnapshot(),
      terrain: chunkSerializer.serializeChunks(planet.chunkManager),
    });
  }

  // Legacy terrain for backward compatibility
  const chunkManager = worldImpl.getChunkManager();
  const terrain = chunkManager
    ? chunkSerializer.serializeChunks(chunkManager as any)
    : null;

  return {
    terrain,  // Legacy (backward compat)
    zones: zoneManager.serializeZones(),
    planets,  // NEW: All planets
    activePlanetId: worldImpl.getActivePlanetId(),
  };
}
```

**Deserialization changes**:

```typescript
// In deserializeWorld()
if (snapshot.worldState.planets && snapshot.worldState.planets.length > 0) {
  // NEW: Restore all planets
  for (const planetTerrain of snapshot.worldState.planets) {
    const planet = Planet.fromSnapshot(planetTerrain.planet, godCraftedSpawner);

    // Restore terrain into planet's ChunkManager
    if (planetTerrain.terrain) {
      await chunkSerializer.deserializeChunks(
        planetTerrain.terrain,
        planet.chunkManager
      );
    }

    worldImpl.registerPlanet(planet);
  }

  // Set active planet
  if (snapshot.worldState.activePlanetId) {
    worldImpl.setActivePlanet(snapshot.worldState.activePlanetId);
  }
} else if (snapshot.worldState.terrain) {
  // Legacy: single terrain (backward compatibility)
  // ... existing code ...
}
```

**Dependencies**: Need to add `getPlanets()` and `registerPlanet()` methods to WorldImpl.

---

### Phase 2: PlanetRegistry (Persistent World Storage)

**New file**: `packages/persistence/src/PlanetRegistry.ts`

**Purpose**: Global persistent world storage. Stores planet config, biosphere, AND terrain chunks. Multiple save games share the same terrain.

```typescript
/**
 * PlanetRegistry - Persistent World Storage
 *
 * Stores complete planet state (config + biosphere + terrain) separately from save files.
 * Multiple save games share the same terrain - modifications by one save appear in others.
 * This creates a "persistent world" where you explore and modify a shared planet.
 *
 * Save files only store:
 * - Entity states (agents, items, buildings-as-entities)
 * - Universe time
 * - Which planet is active
 *
 * PlanetRegistry stores:
 * - Planet config (seed, type, parameters)
 * - Biosphere (species, food webs) - 57s generation cached
 * - Terrain chunks (tiles, modifications) - SHARED across saves
 * - Named locations (global lore)
 */
export class PlanetRegistry {
  private storage: PlanetStorageBackend;

  constructor(storage: PlanetStorageBackend) {
    this.storage = storage;
  }

  /**
   * Get planet metadata (config + biosphere, without terrain).
   */
  async getPlanetMetadata(planetId: string): Promise<PlanetSnapshot | null>;

  /**
   * Get specific chunk terrain from planet.
   * Returns null if chunk not yet generated.
   */
  async getChunk(planetId: string, chunkX: number, chunkY: number): Promise<SerializedChunk | null>;

  /**
   * Save chunk terrain to planet.
   * Called after terrain generation or modification.
   */
  async saveChunk(planetId: string, chunk: SerializedChunk): Promise<void>;

  /**
   * Register a newly generated planet (metadata only).
   * Chunks are saved incrementally via saveChunk().
   */
  async registerPlanet(snapshot: PlanetSnapshot): Promise<void>;

  /**
   * Check if planet exists in registry.
   */
  async hasPlanet(planetId: string): Promise<boolean>;

  /**
   * List all registered planets with visit stats.
   */
  async listPlanets(): Promise<Array<PlanetSnapshot & { chunkCount: number }>>;

  /**
   * Add/update a named location on a planet.
   */
  async nameLocation(planetId: string, location: NamedLocation): Promise<void>;

  /**
   * Get all named locations for a planet.
   */
  async getNamedLocations(planetId: string): Promise<NamedLocation[]>;

  /**
   * Generate planet ID from seed for deterministic lookup.
   */
  static generatePlanetId(seed: string, type: PlanetType): string {
    return `planet:${type}:${hashSeed(seed)}`;
  }
}

// Singleton
export const planetRegistry = new PlanetRegistry(indexedDBStorage);
```

**Storage structure** (IndexedDB):
```
Database: ai_village_planets

Object Store: planet_metadata
├── planet:magical:abc123 → { config, biosphere, namedLocations[], stats }
├── planet:terrestrial:def456 → { config, biosphere, namedLocations[], stats }
└── planet:crystal:ghi789 → { config, biosphere, namedLocations[], stats }

Object Store: planet_chunks (indexed by planetId + chunkKey)
├── planet:magical:abc123|0,0 → SerializedChunk { tiles, entityIds }
├── planet:magical:abc123|0,1 → SerializedChunk { ... }
├── planet:magical:abc123|1,0 → SerializedChunk { ... }
└── ...thousands of chunks...

Object Store: named_locations (indexed by planetId)
├── planet:magical:abc123|valley_of_dawn → { chunkX, chunkY, name, namedBy, description }
└── planet:magical:abc123|crystal_caves → { ... }
```

**Chunk save strategy**:
- Chunks save to registry when:
  1. First generated (terrain generation)
  2. Modified (building placed, tile tilled, wall built)
- Save is debounced (batch modifications, save every 30s or on game pause)
- Chunks are compressed (RLE/delta encoding from existing ChunkSerializer)

---

### Phase 3: Early Chunk Pre-Generation

**Goal**: Start generating chunks the moment we commit to a planet, not after full game load.

**New file**: `packages/core/src/startup/EarlyChunkLoader.ts`

```typescript
/**
 * EarlyChunkLoader - Starts chunk generation during startup
 *
 * Called immediately after planet selection, before full game initialization.
 * Uses worker pool for parallel generation.
 */
export class EarlyChunkLoader {
  private workerPool: ChunkGenerationWorkerPool;
  private queue: ChunkRequest[] = [];
  private generated = new Map<string, Tile[]>();

  /**
   * Start pre-generating chunks around spawn location.
   * Runs in parallel with other initialization tasks.
   */
  async preloadChunks(
    planetConfig: PlanetConfig,
    spawnLocation: { x: number; y: number },
    radius: number = 3  // 7x7 grid
  ): Promise<void>;

  /**
   * Get pre-generated chunk tiles (if ready).
   * Returns null if chunk not yet generated.
   */
  getPreloadedChunk(chunkX: number, chunkY: number): Tile[] | null;

  /**
   * Transfer pre-generated chunks to ChunkManager.
   * Called once game is fully initialized.
   */
  transferToChunkManager(chunkManager: ChunkManager): number;
}
```

**Integration in main.ts startup sequence**:

```typescript
// CURRENT (sequential):
// 1. Initialize world
// 2. Generate/load planet (57s biosphere)
// 3. Initialize systems
// 4. Start game loop
// 5. ChunkLoadingSystem queues chunks
// 6. BackgroundChunkGenerator processes queue

// NEW (parallel):
// 1. Determine planet (new or from registry)
// 2. START: EarlyChunkLoader.preloadChunks() in background
// 3. Initialize world (parallel with chunk loading)
// 4. Generate biosphere if needed (parallel with chunk loading)
// 5. Initialize systems
// 6. Transfer pre-loaded chunks to ChunkManager
// 7. Start game loop (many chunks already ready)
```

---

### Phase 4: New Game Flow with Planet Selection

**New UI/Flow**:

```
┌─────────────────────────────────────────────────────────┐
│                    NEW GAME                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Choose Planet:                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ ○ Generate New Planet                           │     │
│  │   Type: [Magical ▼]  Seed: [random]            │     │
│  │                                                 │     │
│  │ ○ Use Existing Planet                          │     │
│  │   ┌─────────────────────────────────────────┐  │     │
│  │   │ • Homeworld (magical) - 3 visits        │  │     │
│  │   │ • Crystal Moon (crystal) - 1 visit      │  │     │
│  │   │ • The Wastes (desert) - 0 visits        │  │     │
│  │   └─────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  Starting Location:                                      │
│  ○ Random location (unexplored)                         │
│  ○ Named location: [Valley of Dawn ▼]                   │
│  ○ Coordinates: X: [___] Y: [___]                       │
│                                                          │
│                         [Create World]                   │
└─────────────────────────────────────────────────────────┘
```

**Key behaviors**:
1. **New planet**: Generate config → Generate biosphere (57s) → Register in PlanetRegistry
2. **Existing planet**: Load PlanetSnapshot from registry → Skip biosphere generation → New terrain (deterministic from seed)
3. **Same planet, different saves**: Each save has independent terrain modifications

---

### Phase 5: World Methods for Multi-Planet

**Add to WorldImpl** (`packages/core/src/ecs/World.ts`):

```typescript
interface WorldImpl {
  // Existing
  private _planets: Map<string, IPlanet>;
  private _activePlanetId?: string;

  // NEW methods needed
  getPlanets(): ReadonlyMap<string, IPlanet>;
  getActivePlanetId(): string | undefined;
  registerPlanet(planet: IPlanet): void;
  setActivePlanet(planetId: string): void;
  getPlanet(planetId: string): IPlanet | undefined;
}
```

---

## Implementation Order

### Batch 1: Foundation (Required for anything else)
1. **Add World methods** for multi-planet management
2. **Fix WorldSerializer** to use `planets[]` array
3. **Add migration** for existing saves (single terrain → planets array)

### Batch 2: Planet Registry
4. **Create PlanetRegistry** class
5. **Create IndexedDB storage backend** for planets
6. **Integrate with planet initialization** - register after biosphere generation

### Batch 3: Early Loading
7. **Create EarlyChunkLoader** service
8. **Modify startup sequence** in main.ts
9. **Transfer pre-loaded chunks** after initialization

### Batch 4: UI & Polish
10. **Planet selection UI** for new game
11. **Location picker** for existing planets
12. **Registry browser** in admin dashboard

---

## Data Flow Diagrams

### New Game (New Planet)

```
User clicks "New Game"
         │
         ▼
┌─────────────────┐
│ Generate Config │ (PlanetConfig from type + seed)
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Start EarlyChunk│────▶│ Worker Pool      │
│ Loader (async)  │     │ generates chunks │
└────────┬────────┘     └──────────────────┘
         │                        │
         ▼                        │ (parallel)
┌─────────────────┐               │
│ Generate        │               │
│ Biosphere (57s) │               │
└────────┬────────┘               │
         │                        │
         ▼                        │
┌─────────────────┐               │
│ Register in     │               │
│ PlanetRegistry  │               │
└────────┬────────┘               │
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│ Initialize World│     │ Chunks ready     │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│ Transfer pre-loaded chunks to           │
│ ChunkManager, start game loop           │
└─────────────────────────────────────────┘
```

### New Game (Existing Planet)

```
User selects existing planet
         │
         ▼
┌─────────────────┐
│ Load from       │ (PlanetSnapshot with biosphere)
│ PlanetRegistry  │
└────────┬────────┘
         │
         ├────────────────────────┐
         ▼                        │
┌─────────────────┐               │
│ Start EarlyChunk│               │
│ Loader (async)  │               │
└────────┬────────┘               │
         │                        │ (SKIPPED - already have biosphere)
         ▼                        │
┌─────────────────┐               │
│ Create Planet   │               │
│ from snapshot   │               │
└────────┬────────┘               │
         │                        │
         ▼                        ▼
┌─────────────────────────────────────────┐
│ Initialize world + transfer chunks      │
│ (Much faster - no 57s biosphere gen)    │
└─────────────────────────────────────────┘
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| **IndexedDB quota** | Compress planet snapshots, limit registry size |
| **Migration failures** | Keep legacy terrain path, don't delete old format |
| **Worker pool browser support** | Fallback to main thread generation |
| **Race conditions** | Clear ownership: EarlyChunkLoader owns pre-init, BackgroundChunkGenerator owns post-init |

---

## Success Metrics

1. **Startup time reduction**: Existing planet should load in <5s vs 60s+ for new planet
2. **Chunk availability**: 7x7 grid (49 chunks) ready before first tick
3. **Memory efficiency**: Planet snapshots should be <1MB each (biosphere + config)
4. **Backward compatibility**: Existing saves load without migration errors

---

## Files to Create/Modify

### New Files
- `packages/persistence/src/PlanetRegistry.ts`
- `packages/persistence/src/storage/IndexedDBPlanetStorage.ts`
- `packages/core/src/startup/EarlyChunkLoader.ts`

### Modified Files
- `packages/persistence/src/WorldSerializer.ts` - Multi-planet serialization
- `packages/core/src/ecs/World.ts` - Add planet management methods
- `packages/persistence/src/migrations/` - Add planet migration
- `custom_game_engine/demo/src/main.ts` - Startup sequence changes

---

## Questions for User

1. **Planet terrain sharing**: Should two saves on the same planet share terrain modifications? (Current plan: No - each save has independent terrain)

2. **Named locations**: Should named locations persist in PlanetRegistry (shared across saves) or per-save?

3. **Maximum registry size**: How many planets should the registry hold before cleanup?
