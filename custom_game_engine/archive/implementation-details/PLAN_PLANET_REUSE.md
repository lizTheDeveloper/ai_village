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

**For true cross-profile shared world**, we use the **existing multiverse server** (localhost:3001):

```
┌─────────────────────────────────────────────────────────────────────┐
│              MULTIVERSE SERVER (localhost:3001/api)                  │
│  Already exists! Has: universes, snapshots, players, passages       │
│                                                                      │
│  EXTEND WITH:                                                        │
│  ├── /api/planet/:planetId                    # Planet CRUD         │
│  ├── /api/planet/:planetId/chunk/:x,:y        # Chunk CRUD          │
│  ├── /api/planet/:planetId/biosphere          # Biosphere data      │
│  ├── /api/planet/:planetId/named-locations    # Shared names        │
│  └── /ws/planet/:planetId/sync                # Real-time chunks    │
└─────────────────────────────────────────────────────────────────────┘
        │                              │                    │
        ▼                              ▼                    ▼
   ┌─────────┐                  ┌─────────┐           ┌─────────┐
   │ Player A│                  │ Player B│           │ Player C│
   │ (profile │                 │ (profile │          │ (mobile)│
   │  Chrome)│                  │  Firefox)│          │         │
   └────┬────┘                  └────┬────┘          └────┬────┘
        │                             │                    │
        └─────────────────────────────┴────────────────────┘
                              ▼
                   Same planet, same terrain
                   Different gods/saves
```

**Existing server capabilities** (MultiverseClient.ts):
- `createUniverse()`, `getUniverse()`, `listUniverses()`
- `uploadSnapshot()`, `downloadSnapshot()` (compressed)
- `forkUniverse()` (time travel)
- `createPassage()` (universe links)
- `registerPlayer()`, `getPlayer()`

**New capabilities needed for planets**:
- `createPlanet()`, `getPlanet()`, `listPlanets()`
- `getChunk()`, `saveChunk()` (terrain sync)
- `getPlanetBiosphere()`, `savePlanetBiosphere()`
- `nameLocation()`, `getNamedLocations()`
- WebSocket subscription for real-time chunk updates

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

### Phase 1: Server-Side Planet Storage (Backend)

**Location**: `custom_game_engine/scripts/metrics-server.ts` (extend existing server)

**New endpoints**:
```typescript
// Planet CRUD
POST   /api/planet                           # Create planet
GET    /api/planet/:planetId                 # Get planet metadata
GET    /api/planets                          # List planets
DELETE /api/planet/:planetId                 # Delete planet

// Terrain chunks (the key feature)
GET    /api/planet/:planetId/chunk/:x,:y     # Get chunk
PUT    /api/planet/:planetId/chunk/:x,:y     # Save/update chunk
GET    /api/planet/:planetId/chunks          # List generated chunks
POST   /api/planet/:planetId/chunks/batch    # Batch get chunks

// Biosphere
GET    /api/planet/:planetId/biosphere       # Get biosphere
PUT    /api/planet/:planetId/biosphere       # Save biosphere (once)

// Named locations
GET    /api/planet/:planetId/locations       # Get all named locations
POST   /api/planet/:planetId/location        # Name a location
```

**Storage**: Filesystem under `multiverse-data/planets/`
```
multiverse-data/
├── players/                    # Existing
├── universes/                  # Existing
└── planets/                    # NEW
    └── planet:magical:abc123/
        ├── metadata.json       # { config, stats }
        ├── biosphere.json      # { species, foodWeb, niches }
        ├── locations.json      # [{ name, chunkX, chunkY, ... }]
        └── chunks/
            ├── 0,0.json        # Compressed chunk
            ├── 0,1.json
            └── ...
```

### Phase 2: PlanetClient (Frontend API)

**New file**: `packages/persistence/src/PlanetClient.ts`

```typescript
export class PlanetClient {
  private baseUrl: string;

  // Planet CRUD
  async createPlanet(config: PlanetConfig): Promise<PlanetMetadata>;
  async getPlanet(planetId: string): Promise<PlanetMetadata | null>;
  async listPlanets(): Promise<PlanetMetadata[]>;

  // Chunks - the core feature
  async getChunk(planetId: string, x: number, y: number): Promise<SerializedChunk | null>;
  async saveChunk(planetId: string, chunk: SerializedChunk): Promise<void>;
  async batchGetChunks(planetId: string, coords: Array<{x: number, y: number}>): Promise<Map<string, SerializedChunk>>;

  // Biosphere
  async getBiosphere(planetId: string): Promise<BiosphereData | null>;
  async saveBiosphere(planetId: string, biosphere: BiosphereData): Promise<void>;

  // Named locations
  async getNamedLocations(planetId: string): Promise<NamedLocation[]>;
  async nameLocation(planetId: string, location: NamedLocation): Promise<void>;
}

export const planetClient = new PlanetClient();
```

### Phase 3: ChunkManager Server Integration

**Modify**: `packages/world/src/chunks/ChunkManager.ts`

Change ChunkManager to fetch/save chunks via PlanetClient:

```typescript
class ChunkManager {
  private planetId: string;
  private planetClient: PlanetClient;
  private localCache = new Map<string, Chunk>();  // In-memory cache
  private dirtyChunks = new Set<string>();        // Modified, need sync

  async getChunk(x: number, y: number): Promise<Chunk> {
    const key = `${x},${y}`;

    // Check local cache
    if (this.localCache.has(key)) {
      return this.localCache.get(key)!;
    }

    // Fetch from server
    const serialized = await this.planetClient.getChunk(this.planetId, x, y);
    if (serialized) {
      const chunk = this.deserialize(serialized);
      this.localCache.set(key, chunk);
      return chunk;
    }

    // Not generated - create empty chunk
    const chunk = createEmptyChunk(x, y);
    this.localCache.set(key, chunk);
    return chunk;
  }

  markDirty(x: number, y: number): void {
    this.dirtyChunks.add(`${x},${y}`);
  }

  async flushDirtyChunks(): Promise<void> {
    for (const key of this.dirtyChunks) {
      const chunk = this.localCache.get(key);
      if (chunk) {
        await this.planetClient.saveChunk(this.planetId, this.serialize(chunk));
      }
    }
    this.dirtyChunks.clear();
  }
}
```

### Phase 4: Real-Time Multiplayer Sync (WebSocket)

**Extend server** with WebSocket for chunk updates:

```typescript
// Server-side (metrics-server.ts)
wss.on('connection', (ws, req) => {
  const planetId = extractPlanetId(req.url);  // /ws/planet/:planetId/sync

  // Subscribe to planet updates
  planetSubscribers.get(planetId)?.add(ws);

  ws.on('message', (data) => {
    const msg = JSON.parse(data);

    if (msg.type === 'chunk_update') {
      // Save chunk
      saveChunk(planetId, msg.chunk);

      // Broadcast to all other subscribers
      for (const subscriber of planetSubscribers.get(planetId) ?? []) {
        if (subscriber !== ws) {
          subscriber.send(JSON.stringify({
            type: 'chunk_updated',
            chunk: msg.chunk,
          }));
        }
      }
    }
  });
});

// Client-side (PlanetClient.ts)
subscribeToUpdates(planetId: string, onChunkUpdate: (chunk) => void): () => void {
  const ws = new WebSocket(`ws://localhost:3001/ws/planet/${planetId}/sync`);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'chunk_updated') {
      onChunkUpdate(msg.chunk);
    }
  };

  // Return unsubscribe function
  return () => ws.close();
}
```

### Phase 5: Game Startup Integration

**Modify**: `demo/src/main.ts`

```typescript
async function main() {
  // 1. Get player ID
  const playerId = getOrCreatePlayerId();
  planetClient.setPlayerId(playerId);

  // 2. Check for existing planet or create new
  let planet: PlanetMetadata;
  const existingPlanets = await planetClient.listPlanets();

  if (existingPlanets.length > 0 && !forceNewPlanet) {
    // Use existing planet - skip biosphere generation!
    planet = existingPlanets[0];
    console.log(`[Main] Using existing planet: ${planet.name}`);
  } else {
    // Create new planet - generate biosphere
    const config = generatePlanetConfig('magical', universeSeed);
    planet = await planetClient.createPlanet(config);

    // Generate biosphere (57s) - only once per planet!
    const biosphere = await generateBiosphere(config);
    await planetClient.saveBiosphere(planet.id, biosphere);
  }

  // 3. Create ChunkManager connected to server
  const chunkManager = new ChunkManager(planet.id, planetClient);

  // 4. Subscribe to real-time updates (multiplayer)
  const unsubscribe = planetClient.subscribeToUpdates(planet.id, (chunk) => {
    chunkManager.applyRemoteUpdate(chunk);
  });

  // 5. Start game with shared planet
  const world = new World(eventBus, chunkManager);
  // ... rest of initialization
}
```

### Phase 6: Dirty Chunk Auto-Sync

**New system**: `packages/core/src/systems/ChunkSyncSystem.ts`

```typescript
export class ChunkSyncSystem extends BaseSystem {
  readonly id = 'chunk_sync';
  readonly priority = 999;  // Run last
  protected readonly throttleInterval = THROTTLE.SLOW;  // Every 100 ticks (5s)

  protected async onUpdate(ctx: SystemContext): Promise<void> {
    const chunkManager = ctx.world.getChunkManager();

    // Flush any modified chunks to server
    await chunkManager.flushDirtyChunks();
  }
}
```

### Phase 7: Admin Dashboard Integration

**Extend**: `packages/core/src/admin/capabilities/`

Add `planets.ts` capability:
- List all planets
- View planet stats (chunks generated, visits)
- View biosphere summary
- Delete planet (with confirmation)

---

## Implementation Files

### New Files
- `packages/persistence/src/PlanetClient.ts` - Frontend API client
- `packages/core/src/systems/ChunkSyncSystem.ts` - Auto-sync dirty chunks
- `packages/core/src/admin/capabilities/planets.ts` - Admin dashboard

### Modified Files
- `scripts/metrics-server.ts` - Add planet endpoints + WebSocket
- `packages/world/src/chunks/ChunkManager.ts` - Server-backed storage
- `demo/src/main.ts` - Startup with planet selection
- `packages/persistence/src/WorldSerializer.ts` - Save only entity state, not terrain

---

## Data Flow Diagrams

### New Game (New Planet - First Player)

```
Player A clicks "New Game"
         │
         ▼
┌─────────────────┐
│ Check server:   │
│ planetClient.   │
│ listPlanets()   │
└────────┬────────┘
         │ (empty list)
         ▼
┌─────────────────┐
│ Generate Config │ (PlanetConfig from type + seed)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ planetClient.   │
│ createPlanet()  │◀──── Server stores metadata
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │
│ Biosphere (57s) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ planetClient.   │
│ saveBiosphere() │◀──── Server stores biosphere (ONCE, reused forever)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Connect to      │
│ WebSocket sync  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Initialize World with server-backed     │
│ ChunkManager. Chunks generated on-demand│
│ and saved to server as explored.        │
└─────────────────────────────────────────┘
```

### New Game (Existing Planet - Instant Start)

```
Player B clicks "New Game" (or Player A returns)
         │
         ▼
┌─────────────────┐
│ Check server:   │
│ planetClient.   │
│ listPlanets()   │
└────────┬────────┘
         │ (finds planet:magical:abc123)
         ▼
┌─────────────────┐
│ planetClient.   │
│ getBiosphere()  │◀──── INSTANT! No 57s wait
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Connect to      │
│ WebSocket sync  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Initialize World with server-backed     │
│ ChunkManager. Existing chunks load from │
│ server (terrain already generated!)     │
└─────────────────────────────────────────┘
```

### Multiplayer Flow (Two Players Online)

```
Player A (active)                        Player B (active)
      │                                        │
      ▼                                        ▼
┌─────────────┐                        ┌─────────────┐
│ Modify tile │                        │ Exploring   │
│ (build wall)│                        │ same planet │
└──────┬──────┘                        └──────┬──────┘
       │                                      │
       ▼                                      │
┌─────────────┐                               │
│ markDirty() │                               │
│ chunk 5,10  │                               │
└──────┬──────┘                               │
       │                                      │
       ▼ (every 5s or immediate)              │
┌─────────────────────────────────────────────┤
│           WebSocket: chunk_update            │
│           { planetId, x:5, y:10, data }     │
└──────┬──────────────────────────────────────┘
       │                                      │
       ▼                                      ▼
┌─────────────┐                        ┌─────────────┐
│ Server saves│                        │ Server sends│
│ chunk 5,10  │                        │ chunk_update│
└─────────────┘                        └──────┬──────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │ Player B    │
                                       │ sees wall!  │
                                       └─────────────┘
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| **Server unavailable** | Fallback to local IndexedDB if server unreachable |
| **Network latency** | Local chunk cache, batch operations, optimistic updates |
| **Concurrent modifications** | Last-write-wins for now; add timestamps for conflict detection later |
| **Large biosphere data** | Compress with existing compress() function |
| **WebSocket disconnects** | Auto-reconnect with exponential backoff |
| **Migration** | Keep local IndexedDB path as fallback; migrate incrementally |

---

## Success Metrics

1. **Startup time (existing planet)**: <5s vs 60s+ for new planet (skip biosphere gen)
2. **Multiplayer sync latency**: <500ms for chunk updates between players
3. **Server storage**: ~10KB per chunk (compressed), ~500KB per biosphere
4. **Backward compatibility**: Existing IndexedDB saves still work (migration path)
5. **Offline capability**: Game works without server, syncs when reconnected

---

## Multiplayer Test Scenarios

### Scenario 1: Same Planet, Different Tabs (Same God)
1. Open two tabs in same Chrome profile
2. Both show same world state
3. Build wall in Tab 1 → appears in Tab 2

### Scenario 2: Same Planet, Different Profiles (Different Gods)
1. Open Chrome Profile A → creates planet
2. Open Chrome Profile B → same planet (from server)
3. Player A builds village in north
4. Player B builds village in south
5. Both villages coexist, terrain modifications shared

### Scenario 3: Resume After Biosphere Generated
1. Player A creates planet (57s biosphere gen)
2. Player A closes game
3. Player A reopens → instant load (biosphere from server)

---

## Future Enhancements (Not in this plan)

1. **Conflict resolution UI**: Show "Player B modified this chunk" notifications
2. **Access control**: Private planets with invite codes
3. **Planet discovery**: Find other players' planets via portals
4. **Cross-machine multiplayer**: Players on different machines (already supported by server architecture)
5. **Chunk versioning**: History of chunk modifications for rollback
