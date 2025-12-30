# Persistence, Multiverse, and Time System - Comprehensive Specification

> *"The universe is not required to be in perfect harmony with human ambition." - Carl Sagan*

**Created:** 2025-12-29
**Status:** Design
**Version:** 1.0.0

---

## Overview

This specification defines the architecture for:

1. **Save/Load System** - Schema-versioned persistence with forward migration
2. **Multiverse Coordination** - Multiple universes with independent time scales
3. **Universe Forking** - Parallel world testing and temporal branches
4. **Cross-Universe Travel** - Entities and items moving between universes
5. **Time Coordination** - Relative time, sync points, and temporal causality

### Design Principles

**From Dwarf Fortress:**
- Don't freeze development with rigid schemas
- Allow forward migration (old saves work in new versions)
- Fail loudly when data is corrupt (no silent fallbacks)
- Support modding and procedural generation

**From Git:**
- Content-addressable storage (hash-based)
- Branching and merging (universe forks)
- Immutable history (provenance chains)

**From databases:**
- Schema versioning
- Migration scripts
- Transactions and rollback
- Integrity constraints

---

## Part 1: Core Architecture

### The Multiverse Model

```
┌─────────────────────────────────────────────────────────────┐
│                        MULTIVERSE                           │
│  (All connected universes, shared timeline)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Universe A      │  │  Universe B      │                │
│  │  (High Fantasy)  │  │  (Grimdark)      │                │
│  │                  │  │                  │                │
│  │  Time: 1.0x      │  │  Time: 0.5x      │                │
│  │  Day 2045        │◄─┤  Day 1022        │                │
│  │                  │  │  (Slower time)   │                │
│  └────┬─────────────┘  └──────────────────┘                │
│       │                                                     │
│       │ Fork @ Day 100                                      │
│       ▼                                                     │
│  ┌──────────────────┐                                       │
│  │  Universe A-fork │                                       │
│  │  (Test branch)   │                                       │
│  │                  │                                       │
│  │  Time: 8.0x      │                                       │
│  │  Day 150         │                                       │
│  └──────────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Identity and Addressing

Every entity, component, and universe has a content-addressable ID:

```typescript
// Universal ID format: {type}:{hash}:{universe}
type UniversalID = string;

// Examples:
// "universe:a3f2...8b1c"
// "entity:7d4e...2a9f:universe:a3f2...8b1c"
// "component:9c1b...4e2d:entity:7d4e...2a9f:universe:a3f2...8b1c"

interface UniversalAddress {
  type: 'universe' | 'entity' | 'component' | 'item' | 'effect';

  /** Content hash (SHA256 of canonical representation) */
  hash: string;

  /** Universe this belongs to */
  universeId?: string;

  /** Parent entity (for components) */
  entityId?: string;

  /** Full path */
  path: string[];
}

function parseUniversalID(id: UniversalID): UniversalAddress {
  const parts = id.split(':');
  return {
    type: parts[0] as any,
    hash: parts[1],
    universeId: parts[3],
    entityId: parts.includes('entity') ? parts[2] : undefined,
    path: parts,
  };
}
```

---

## Part 2: Time System Redesign

### Multiverse Time vs Universe Time

```typescript
/**
 * Multiverse time - absolute, monotonic, never resets.
 * Used for coordination across universes.
 */
interface MultiverseTime {
  /** Ticks since multiverse creation (never decreases) */
  absoluteTick: bigint;

  /** Real-world timestamp when multiverse was created */
  originTimestamp: number;

  /** Current real-world timestamp */
  currentTimestamp: number;

  /** Real-world seconds elapsed since creation */
  realTimeElapsed: number;
}

/**
 * Universe time - relative to universe creation, can have different rates.
 * Multiple universes can have different time scales.
 */
interface UniverseTime {
  /** Universe this time belongs to */
  universeId: string;

  /** Ticks since THIS universe was created/forked */
  universeTick: bigint;

  /** Time scale relative to multiverse (1.0 = normal, 2.0 = 2x speed) */
  timeScale: number;

  /** Game day within this universe */
  day: number;

  /** Time of day (0-24) */
  timeOfDay: number;

  /** Current phase */
  phase: DayPhase;

  /** If forked, the parent universe tick when fork occurred */
  forkPoint?: {
    parentUniverseId: string;
    parentUniverseTick: bigint;
    multiverseTick: bigint;
  };

  /** Whether time is paused in this universe */
  paused: boolean;

  /** Accumulated pause time (real seconds) */
  pausedDuration: number;
}

/**
 * Maps multiverse absolute time to universe-relative time.
 */
function multiverseToUniverseTime(
  multiverseTick: bigint,
  universe: UniverseTime
): bigint {
  if (universe.forkPoint) {
    // Time since fork in multiverse ticks
    const ticksSinceFork = multiverseTick - universe.forkPoint.multiverseTick;

    // Apply universe time scale
    const universeTicksSinceFork = BigInt(
      Math.floor(Number(ticksSinceFork) * universe.timeScale)
    );

    // Add to fork point
    return universe.forkPoint.parentUniverseTick + universeTicksSinceFork;
  } else {
    // No fork, just apply time scale from multiverse origin
    return BigInt(Math.floor(Number(multiverseTick) * universe.timeScale));
  }
}
```

### TimeSystem Refactor

The current `TimeSystem` becomes universe-local. New `MultiverseCoordinator` manages all universes:

```typescript
/**
 * MultiverseCoordinator - runs all universes, coordinates time
 */
class MultiverseCoordinator {
  private multiverseTime: MultiverseTime;
  private universes: Map<string, UniverseInstance>;

  constructor() {
    this.multiverseTime = {
      absoluteTick: 0n,
      originTimestamp: Date.now(),
      currentTimestamp: Date.now(),
      realTimeElapsed: 0,
    };
    this.universes = new Map();
  }

  /**
   * Update all universes based on real-time delta
   */
  update(realDeltaSeconds: number): void {
    // Update multiverse time
    this.multiverseTime.realTimeElapsed += realDeltaSeconds;
    this.multiverseTime.currentTimestamp = Date.now();

    // Multiverse tick is in "base" units (e.g., 60 ticks per real second)
    const multiverseTicksElapsed = Math.floor(realDeltaSeconds * 60);
    this.multiverseTime.absoluteTick += BigInt(multiverseTicksElapsed);

    // Update each universe
    for (const [id, universe] of this.universes) {
      if (universe.time.paused) {
        universe.time.pausedDuration += realDeltaSeconds;
        continue;
      }

      // Calculate universe-specific delta ticks
      const universeTicksElapsed = Math.floor(
        multiverseTicksElapsed * universe.time.timeScale
      );

      // Update universe time
      universe.time.universeTick += BigInt(universeTicksElapsed);

      // Update game day/time
      this.updateUniverseGameTime(universe, universeTicksElapsed);

      // Run universe simulation
      universe.world.update(realDeltaSeconds * universe.time.timeScale);
    }
  }

  /**
   * Create a new universe
   */
  createUniverse(config: UniverseConfig): UniverseInstance {
    const universeId = crypto.randomUUID();

    const instance: UniverseInstance = {
      id: universeId,
      config,
      world: new World(),
      time: {
        universeId,
        universeTick: 0n,
        timeScale: 1.0,
        day: 1,
        timeOfDay: 6, // Start at dawn
        phase: 'dawn',
        paused: false,
        pausedDuration: 0,
      },
      state: 'active',
      createdAt: this.multiverseTime.absoluteTick,
    };

    this.universes.set(universeId, instance);
    return instance;
  }

  /**
   * Fork an existing universe at current state
   */
  forkUniverse(
    sourceUniverseId: string,
    forkConfig: ForkConfig
  ): UniverseInstance {
    const source = this.universes.get(sourceUniverseId);
    if (!source) throw new Error(`Universe ${sourceUniverseId} not found`);

    const forkId = crypto.randomUUID();

    // Serialize source universe state
    const snapshot = serializeUniverse(source);

    // Create fork
    const fork: UniverseInstance = {
      id: forkId,
      config: { ...source.config, ...forkConfig.configOverrides },
      world: deserializeUniverse(snapshot), // Deep copy
      time: {
        universeId: forkId,
        universeTick: source.time.universeTick,
        timeScale: forkConfig.timeScale ?? source.time.timeScale,
        day: source.time.day,
        timeOfDay: source.time.timeOfDay,
        phase: source.time.phase,
        forkPoint: {
          parentUniverseId: sourceUniverseId,
          parentUniverseTick: source.time.universeTick,
          multiverseTick: this.multiverseTime.absoluteTick,
        },
        paused: false,
        pausedDuration: 0,
      },
      state: 'fork',
      createdAt: this.multiverseTime.absoluteTick,
      parentId: sourceUniverseId,
    };

    this.universes.set(forkId, fork);
    return fork;
  }

  /**
   * Merge a fork back into parent (experimental)
   */
  mergeFork(
    forkId: string,
    mergeStrategy: MergeStrategy
  ): MergeResult {
    // TODO: Implement three-way merge
    // 1. Get common ancestor state (fork point)
    // 2. Get current parent state
    // 3. Get current fork state
    // 4. Merge changes
    throw new Error('Not implemented');
  }
}
```

---

## Part 3: Serialization Architecture

### Schema Versioning

Every serialized structure has a version:

```typescript
interface Versioned {
  $schema: string;        // "https://aivillage.dev/schemas/universe/v1"
  $version: number;       // Schema version number
}

interface VersionedComponent extends Versioned {
  $schema: "https://aivillage.dev/schemas/component/v1";
  $version: 1;

  type: ComponentType;
  data: unknown;          // Component-specific data
}

interface VersionedEntity extends Versioned {
  $schema: "https://aivillage.dev/schemas/entity/v1";
  $version: 1;

  id: string;
  components: VersionedComponent[];
}

interface VersionedUniverse extends Versioned {
  $schema: "https://aivillage.dev/schemas/universe/v1";
  $version: 1;

  identity: UniverseIdentity;
  time: UniverseTime;
  entities: VersionedEntity[];

  // Checksums for integrity
  checksums: {
    entities: string;
    components: string;
    overall: string;
  };
}
```

### Component Serialization

Each component type implements serialization:

```typescript
interface ComponentSerializer<T> {
  /** Serialize component to versioned format */
  serialize(component: T): VersionedComponent;

  /** Deserialize from versioned format */
  deserialize(data: VersionedComponent): T;

  /** Migrate from old version to current */
  migrate(from: number, data: unknown): unknown;

  /** Validate deserialized data */
  validate(data: unknown): data is T;
}

// Example: AgentComponent serializer
const AgentComponentSerializer: ComponentSerializer<AgentComponent> = {
  serialize(component: AgentComponent): VersionedComponent {
    return {
      $schema: "https://aivillage.dev/schemas/component/v1",
      $version: 1,
      type: 'agent',
      data: {
        name: component.name,
        generation: component.generation,
        age: component.age,
        // ... all fields
      },
    };
  },

  deserialize(data: VersionedComponent): AgentComponent {
    // Migrate if old version
    let current = data.data;
    if (data.$version < 1) {
      current = this.migrate(data.$version, current);
    }

    // Validate
    if (!this.validate(current)) {
      throw new Error(`Invalid agent component data: ${JSON.stringify(current)}`);
    }

    return current as AgentComponent;
  },

  migrate(from: number, data: unknown): unknown {
    // Example migration
    if (from === 0) {
      // Version 0 → 1: Added 'generation' field
      return {
        ...data,
        generation: 0, // Default for old saves
      };
    }
    return data;
  },

  validate(data: unknown): data is AgentComponent {
    // Runtime validation
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as any;

    if (typeof obj.name !== 'string') {
      throw new Error(`agent.name must be string, got ${typeof obj.name}`);
    }
    if (typeof obj.generation !== 'number') {
      throw new Error(`agent.generation must be number, got ${typeof obj.generation}`);
    }

    // ... validate all fields
    return true;
  },
};
```

### Migration Registry

```typescript
interface Migration {
  component: ComponentType;
  fromVersion: number;
  toVersion: number;
  migrate: (data: unknown) => unknown;
  description: string;
}

class MigrationRegistry {
  private migrations: Migration[] = [];

  register(migration: Migration): void {
    this.migrations.push(migration);
  }

  /** Get migration path from version A to version B */
  getMigrationPath(
    component: ComponentType,
    from: number,
    to: number
  ): Migration[] {
    const path: Migration[] = [];
    let current = from;

    while (current < to) {
      const next = this.migrations.find(
        m => m.component === component && m.fromVersion === current
      );

      if (!next) {
        throw new Error(
          `No migration path for ${component} from v${from} to v${to}`
        );
      }

      path.push(next);
      current = next.toVersion;
    }

    return path;
  }

  /** Apply migration path */
  migrate(
    component: ComponentType,
    data: unknown,
    fromVersion: number,
    toVersion: number
  ): unknown {
    const path = this.getMigrationPath(component, fromVersion, toVersion);

    let current = data;
    for (const migration of path) {
      console.log(`Migrating ${component}: v${migration.fromVersion} → v${migration.toVersion}`);
      console.log(`  ${migration.description}`);
      current = migration.migrate(current);
    }

    return current;
  }
}

// Global registry
export const migrationRegistry = new MigrationRegistry();

// Example migration registration
migrationRegistry.register({
  component: 'agent',
  fromVersion: 0,
  toVersion: 1,
  description: 'Add generation field for multi-generational gameplay',
  migrate: (data: any) => ({
    ...data,
    generation: 0, // Default for agents from before generations existed
  }),
});

migrationRegistry.register({
  component: 'inventory',
  fromVersion: 1,
  toVersion: 2,
  description: 'Split items into stacks with quality tracking',
  migrate: (data: any) => ({
    ...data,
    items: data.items.map((item: any) => ({
      ...item,
      quality: 'normal', // Default quality
      stackSize: item.count ?? 1,
    })),
  }),
});
```

---

## Part 4: Save File Format

### Complete Save File Structure

```typescript
interface SaveFile extends Versioned {
  $schema: "https://aivillage.dev/schemas/savefile/v1";
  $version: 1;

  /** Save metadata */
  header: SaveFileHeader;

  /** Multiverse state */
  multiverse: MultiverseSnapshot;

  /** All universes in this save */
  universes: UniverseSnapshot[];

  /** Passage connections between universes */
  passages: PassageSnapshot[];

  /** Player state */
  player: PlayerSnapshot;

  /** Integrity checksums */
  checksums: SaveFileChecksums;
}

interface SaveFileHeader {
  /** When this save was created */
  createdAt: number;

  /** Last save time */
  lastSavedAt: number;

  /** Total play time (real seconds) */
  playTime: number;

  /** Game version that created this save */
  gameVersion: string;

  /** Save file format version */
  formatVersion: number;

  /** Save name */
  name: string;

  /** Optional description */
  description?: string;

  /** Screenshot (base64 PNG) */
  screenshot?: string;
}

interface MultiverseSnapshot {
  /** Multiverse time state */
  time: MultiverseTime;

  /** Multiverse-level config */
  config: MultiverseConfig;
}

interface UniverseSnapshot {
  /** Universe identity */
  identity: UniverseIdentity;

  /** Universe time */
  time: UniverseTime;

  /** Universe config (divine rules, etc.) */
  config: UniverseDivineConfig;

  /** All entities in this universe */
  entities: VersionedEntity[];

  /** World state (terrain, weather, etc.) */
  worldState: WorldSnapshot;

  /** Active effects */
  activeEffects: ActiveEffectSnapshot[];
}

interface WorldSnapshot {
  /** Terrain data (compressed) */
  terrain: CompressedTerrainData;

  /** Weather state */
  weather: WeatherState;

  /** Zone configuration */
  zones: ZoneSnapshot[];

  /** Building placements */
  buildings: BuildingPlacementSnapshot[];
}

interface PassageSnapshot {
  id: string;
  type: 'thread' | 'bridge' | 'gate' | 'confluence';

  from: {
    universeId: string;
    position?: Position;
  };

  to: {
    universeId: string;
    position?: Position;
  };

  health: number;
  lastMaintenance: bigint; // Multiverse tick

  // Access control
  owners: string[];
  accessPolicy: 'private' | 'shared' | 'public';
}

interface SaveFileChecksums {
  /** SHA256 of entire save file (excluding this field) */
  overall: string;

  /** Per-universe checksums */
  universes: Record<string, string>;

  /** Multiverse state checksum */
  multiverse: string;
}
```

### Compression Strategy

```typescript
interface CompressionConfig {
  /** Compression level (0-9, 0 = none, 9 = max) */
  level: number;

  /** Algorithm */
  algorithm: 'gzip' | 'brotli' | 'lz4';

  /** Compress terrain data? */
  compressTerrain: boolean;

  /** Compress component data? */
  compressComponents: boolean;
}

async function compressSaveFile(
  save: SaveFile,
  config: CompressionConfig
): Promise<Blob> {
  const json = JSON.stringify(save);

  if (config.level === 0) {
    return new Blob([json], { type: 'application/json' });
  }

  switch (config.algorithm) {
    case 'gzip': {
      const compressed = await gzipCompress(json, config.level);
      return new Blob([compressed], { type: 'application/gzip' });
    }
    case 'brotli': {
      const compressed = await brotliCompress(json, config.level);
      return new Blob([compressed], { type: 'application/brotli' });
    }
    case 'lz4': {
      const compressed = await lz4Compress(json);
      return new Blob([compressed], { type: 'application/lz4' });
    }
  }
}
```

---

## Part 5: Universe Forking System

### Fork Types

```typescript
type ForkPurpose =
  | { type: 'test'; description: string }            // Test effect/change
  | { type: 'what-if'; description: string }         // Explore alternative
  | { type: 'preview'; action: string }              // Preview action result
  | { type: 'parallel'; description: string }        // Parallel timeline
  | { type: 'debug'; issue: string };                // Debug issue

interface ForkConfig {
  purpose: ForkPurpose;

  /** Time scale for fork (8x for fast testing) */
  timeScale?: number;

  /** Config overrides for fork */
  configOverrides?: Partial<UniverseDivineConfig>;

  /** Auto-pause after N ticks */
  autoPauseAfter?: bigint;

  /** Auto-delete after N ticks */
  autoDeleteAfter?: bigint;

  /** Injection to apply after fork */
  injection?: ForkInjection;
}

interface ForkInjection {
  type: 'effect' | 'spawn' | 'modify' | 'script';

  /** Effect to inject */
  effect?: EffectExpression;

  /** Entities to spawn */
  spawn?: EntityTemplate[];

  /** Components to modify */
  modify?: ComponentModification[];

  /** Script to run */
  script?: string;
}

interface ForkResult {
  forkId: string;

  /** How long fork ran */
  ticksElapsed: bigint;

  /** Did fork crash? */
  crashed: boolean;
  crashReport?: CrashReport;

  /** Invariant violations */
  violations: InvariantViolation[];

  /** Balance metrics */
  metrics: BalanceMetrics;

  /** State diff from fork point */
  diff: UniverseDiff;

  /** Can this fork be safely merged? */
  mergeable: boolean;
  mergeConflicts?: MergeConflict[];
}
```

### Invariant Checking

```typescript
interface InvariantViolation {
  tick: bigint;
  severity: 'warning' | 'error' | 'critical';
  type: string;
  entityId?: string;
  componentType?: ComponentType;
  details: Record<string, unknown>;
  message: string;
}

class InvariantChecker {
  private checks: InvariantCheck[] = [];

  register(check: InvariantCheck): void {
    this.checks.push(check);
  }

  check(universe: UniverseInstance): InvariantViolation[] {
    const violations: InvariantViolation[] = [];

    for (const check of this.checks) {
      const result = check.check(universe);
      violations.push(...result);
    }

    return violations;
  }
}

interface InvariantCheck {
  name: string;
  check: (universe: UniverseInstance) => InvariantViolation[];
}

// Example checks
const healthBoundsCheck: InvariantCheck = {
  name: 'health_bounds',
  check: (universe) => {
    const violations: InvariantViolation[] = [];

    for (const entity of universe.world.getAllEntities()) {
      const health = entity.getComponent('health');
      if (!health) continue;

      if (health.current < 0) {
        violations.push({
          tick: universe.time.universeTick,
          severity: 'error',
          type: 'negative_health',
          entityId: entity.id,
          componentType: 'health',
          details: { current: health.current, max: health.max },
          message: `Entity ${entity.id} has negative health: ${health.current}`,
        });
      }

      if (!Number.isFinite(health.current)) {
        violations.push({
          tick: universe.time.universeTick,
          severity: 'critical',
          type: 'invalid_health',
          entityId: entity.id,
          componentType: 'health',
          details: { current: health.current },
          message: `Entity ${entity.id} has non-finite health: ${health.current}`,
        });
      }
    }

    return violations;
  },
};

const positionBoundsCheck: InvariantCheck = {
  name: 'position_bounds',
  check: (universe) => {
    const violations: InvariantViolation[] = [];
    const bounds = universe.world.getBounds();

    for (const entity of universe.world.getAllEntities()) {
      const position = entity.getComponent('position');
      if (!position) continue;

      if (position.x < bounds.minX || position.x > bounds.maxX ||
          position.y < bounds.minY || position.y > bounds.maxY) {
        violations.push({
          tick: universe.time.universeTick,
          severity: 'error',
          type: 'out_of_bounds',
          entityId: entity.id,
          componentType: 'position',
          details: { x: position.x, y: position.y, bounds },
          message: `Entity ${entity.id} out of bounds: (${position.x}, ${position.y})`,
        });
      }
    }

    return violations;
  },
};
```

---

## Part 6: Storage Backends

### Storage Interface

```typescript
interface StorageBackend {
  /** Save a file */
  save(key: string, data: SaveFile): Promise<void>;

  /** Load a file */
  load(key: string): Promise<SaveFile | null>;

  /** List all saves */
  list(): Promise<SaveMetadata[]>;

  /** Delete a save */
  delete(key: string): Promise<void>;

  /** Get save metadata without loading full file */
  getMetadata(key: string): Promise<SaveMetadata | null>;

  /** Check available space */
  getStorageInfo(): Promise<StorageInfo>;
}

interface SaveMetadata {
  key: string;
  name: string;
  createdAt: number;
  lastSavedAt: number;
  playTime: number;
  gameVersion: string;
  formatVersion: number;
  fileSize: number;
  screenshot?: string;
}

interface StorageInfo {
  backend: string;
  usedBytes: number;
  availableBytes?: number;
  totalBytes?: number;
  quotaExceeded: boolean;
}
```

### IndexedDB Backend (Browser)

```typescript
class IndexedDBStorage implements StorageBackend {
  private dbName = 'ai_village';
  private storeName = 'saves';
  private metadataStore = 'save_metadata';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(this.metadataStore)) {
          const metaStore = db.createObjectStore(this.metadataStore, {
            keyPath: 'key',
          });
          metaStore.createIndex('lastSavedAt', 'lastSavedAt', { unique: false });
        }
      };
    });
  }

  async save(key: string, data: SaveFile): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(
      [this.storeName, this.metadataStore],
      'readwrite'
    );

    // Save full file
    const saveStore = transaction.objectStore(this.storeName);
    saveStore.put({ key, data });

    // Save metadata
    const metadata: SaveMetadata = {
      key,
      name: data.header.name,
      createdAt: data.header.createdAt,
      lastSavedAt: data.header.lastSavedAt,
      playTime: data.header.playTime,
      gameVersion: data.header.gameVersion,
      formatVersion: data.header.formatVersion,
      fileSize: JSON.stringify(data).length,
      screenshot: data.header.screenshot,
    };

    const metaStore = transaction.objectStore(this.metadataStore);
    metaStore.put(metadata);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async load(key: string): Promise<SaveFile | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async list(): Promise<SaveMetadata[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.metadataStore], 'readonly');
      const store = transaction.objectStore(this.metadataStore);
      const index = store.index('lastSavedAt');
      const request = index.openCursor(null, 'prev'); // Newest first

      const metadata: SaveMetadata[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          metadata.push(cursor.value);
          cursor.continue();
        } else {
          resolve(metadata);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageInfo(): Promise<StorageInfo> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        backend: 'IndexedDB',
        usedBytes: 0,
        quotaExceeded: false,
      };
    }

    const estimate = await navigator.storage.estimate();
    return {
      backend: 'IndexedDB',
      usedBytes: estimate.usage ?? 0,
      availableBytes: estimate.quota ? estimate.quota - (estimate.usage ?? 0) : undefined,
      totalBytes: estimate.quota,
      quotaExceeded: estimate.usage && estimate.quota
        ? estimate.usage > estimate.quota
        : false,
    };
  }
}
```

### FileSystem Backend (Node.js/Electron)

```typescript
class FileSystemStorage implements StorageBackend {
  constructor(private baseDir: string) {}

  async save(key: string, data: SaveFile): Promise<void> {
    const filePath = path.join(this.baseDir, `${key}.save.json`);
    const metaPath = path.join(this.baseDir, `${key}.meta.json`);

    // Ensure directory exists
    await fs.mkdir(this.baseDir, { recursive: true });

    // Write save file
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    // Write metadata
    const metadata: SaveMetadata = {
      key,
      name: data.header.name,
      createdAt: data.header.createdAt,
      lastSavedAt: data.header.lastSavedAt,
      playTime: data.header.playTime,
      gameVersion: data.header.gameVersion,
      formatVersion: data.header.formatVersion,
      fileSize: JSON.stringify(data).length,
      screenshot: data.header.screenshot,
    };

    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
  }

  async load(key: string): Promise<SaveFile | null> {
    const filePath = path.join(this.baseDir, `${key}.save.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async list(): Promise<SaveMetadata[]> {
    try {
      const files = await fs.readdir(this.baseDir);
      const metaFiles = files.filter(f => f.endsWith('.meta.json'));

      const metadata = await Promise.all(
        metaFiles.map(async (file) => {
          const content = await fs.readFile(
            path.join(this.baseDir, file),
            'utf-8'
          );
          return JSON.parse(content) as SaveMetadata;
        })
      );

      // Sort by last saved (newest first)
      return metadata.sort((a, b) => b.lastSavedAt - a.lastSavedAt);
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async getStorageInfo(): Promise<StorageInfo> {
    // On Node.js, get disk space info
    const stats = await fs.statfs(this.baseDir);

    return {
      backend: 'FileSystem',
      usedBytes: 0, // Would need to walk directory
      availableBytes: stats.bavail * stats.bsize,
      totalBytes: stats.blocks * stats.bsize,
      quotaExceeded: false,
    };
  }
}
```

---

## Part 7: Implementation Roadmap

### Phase 1: Core Persistence (Week 1-2)

- [ ] Schema versioning system
- [ ] Component serializers for all existing components
- [ ] Migration registry
- [ ] SaveFile format
- [ ] IndexedDB storage backend
- [ ] Basic save/load UI

### Phase 2: Time System Refactor (Week 3)

- [ ] MultiverseTime type
- [ ] UniverseTime type
- [ ] MultiverseCoordinator class
- [ ] Refactor TimeSystem to be universe-local
- [ ] Time conversion utilities

### Phase 3: Universe Forking (Week 4-5)

- [ ] Fork creation
- [ ] Fork execution in Web Worker
- [ ] InvariantChecker with basic checks
- [ ] ForkResult reporting
- [ ] Fork UI (create, monitor, delete)

### Phase 4: Cross-Universe (Week 6-7)

- [ ] Passage types
- [ ] Passage creation/maintenance
- [ ] Entity travel between universes
- [ ] Item compatibility checking
- [ ] Import/export system

### Phase 5: Polish (Week 8)

- [ ] Compression
- [ ] Auto-save
- [ ] Save slots
- [ ] Cloud sync (optional)
- [ ] Save corruption recovery

---

## Part 8: Testing Strategy

### Test Hierarchy

```
1. Unit Tests - Individual serializers
   ├─ Can serialize and deserialize without loss
   ├─ Migrations work correctly
   └─ Validation catches bad data

2. Integration Tests - Full save/load cycle
   ├─ Can save and load entire world
   ├─ Checksum validation works
   └─ Old saves can be loaded (regression tests)

3. Fuzz Tests - Corrupted save files
   ├─ Random byte flips detected
   ├─ Missing fields caught
   └─ Type errors caught

4. Performance Tests
   ├─ Save time < 1s for 1000 entities
   ├─ Load time < 2s for 1000 entities
   └─ Fork creation < 500ms
```

### Migration Testing

Keep old save files as fixtures:

```
/test-saves/
  v1/
    basic-world.save.json
    complex-world.save.json
  v2/
    basic-world.save.json
    complex-world.save.json
```

Test that v1 saves load correctly in v2+ code.

---

## Summary

This specification provides:

1. ✅ **Multiverse architecture** with independent universe time scales
2. ✅ **Schema versioning** for forward migration
3. ✅ **Universe forking** for testing and parallel timelines
4. ✅ **Content-addressable IDs** for cross-universe items
5. ✅ **Migration system** that won't break old saves
6. ✅ **Storage backends** for web and desktop
7. ✅ **Invariant checking** to catch bugs early
8. ✅ **8-week implementation plan**

The key insight: **Separate multiverse time from universe time.** This allows universes to run at different speeds, fork at any point, and eventually merge back together.

Next steps: Start with Phase 1 (Core Persistence) to get basic save/load working, then build out multiverse coordination in Phase 2.
