# Persistence Package - Save/Load & Time Travel System

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the persistence system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Persistence Package** (`@ai-village/persistence`) implements a comprehensive save/load system with multiverse support, time travel mechanics, forward-compatible migrations, and compression. It's NOT just for saving games - it's the foundation for universe forking, time rewind, and checkpointing.

**What it does:**
- Save/load complete game state (entities, world, terrain, zones, multiverse)
- Snapshot-based time travel and universe forking
- Forward-compatible component migrations (schema versioning)
- Multiple storage backends (IndexedDB, Memory, File)
- GZIP compression for save files
- Checksum validation and invariant checking
- Auto-save and quick-save slots

**Key files:**
- `src/SaveLoadService.ts` - Main API for saving/loading (`saveLoadService` singleton)
- `src/WorldSerializer.ts` - Serializes World instances to snapshots
- `src/ComponentSerializerRegistry.ts` - Component serialization registry
- `src/storage/IndexedDBStorage.ts` - Browser persistent storage backend
- `src/storage/MemoryStorage.ts` - In-memory storage backend (testing)
- `src/MigrationRegistry.ts` - Schema migration system
- `src/compression.ts` - GZIP compression utilities
- `src/InvariantChecker.ts` - Save file validation

---

## Package Structure

```
packages/persistence/
├── src/
│   ├── SaveLoadService.ts              # Main save/load API (singleton)
│   ├── SaveStateManager.ts             # Dev tools: fork/rewind (Node.js)
│   ├── WorldSerializer.ts              # Serializes World → UniverseSnapshot
│   ├── ComponentSerializerRegistry.ts  # Component serialization registry
│   ├── MigrationRegistry.ts            # Schema migration system
│   ├── InvariantChecker.ts             # Save file validation
│   ├── compression.ts                  # GZIP compression/decompression
│   ├── utils.ts                        # Checksums, versioning, assertions
│   ├── types.ts                        # Core persistence types
│   │
│   ├── storage/
│   │   ├── IndexedDBStorage.ts         # Browser persistent storage
│   │   └── MemoryStorage.ts            # In-memory storage (testing)
│   │
│   ├── serializers/
│   │   ├── GenericSerializer.ts        # Default JSON serializer
│   │   ├── PositionSerializer.ts       # Position component
│   │   ├── EpisodicMemorySerializer.ts # Memory system
│   │   ├── RelationshipSerializer.ts   # Social relationships
│   │   ├── PlantSerializer.ts          # Plant genetics/lifecycle
│   │   └── index.ts                    # Registry initialization
│   │
│   └── index.ts                        # Package exports
├── package.json
└── README.md                           # This file
```

---

## Core Concepts

### 1. Snapshots = Saves = Checkpoints = Time Travel

**Every save is a snapshot that can be used for time travel.**

```typescript
interface UniverseSnapshot {
  identity: {
    id: string;               // 'universe:main'
    name: string;             // 'Main Universe'
    createdAt: number;
    parentId?: string;        // Parent universe if forked
    forkedAtTick?: string;    // Tick when fork occurred
  };

  time: UniverseTime;         // Universe-local time state
  config: UniverseDivineConfig;  // Divine powers, belief economy
  entities: VersionedEntity[];   // All entities
  worldState: WorldSnapshot;     // Terrain, zones, weather

  checksums: {
    entities: string;
    components: string;
    worldState: string;
  };
}

interface SaveFile {
  header: SaveFileHeader;        // Metadata, play time, screenshot
  multiverse: MultiverseSnapshot;  // Multiverse-level time state
  universes: UniverseSnapshot[];   // All universes (main + forks)
  passages: PassageSnapshot[];     // Connections between universes
  godCraftedQueue: any;            // Microgenerator content
  checksums: SaveFileChecksums;    // Integrity validation
}
```

**Snapshot lifecycle:**
1. **Save** → Create snapshot + metadata → Compress → Store
2. **Load** → Retrieve → Decompress → Validate checksums → Deserialize
3. **Fork** → Copy snapshot → Create new universe → Resume from checkpoint
4. **Rewind** → Load older snapshot → Resume from past state

### 2. Storage Backends

The persistence system abstracts storage via the `StorageBackend` interface:

```typescript
interface StorageBackend {
  save(key: string, data: SaveFile): Promise<void>;
  load(key: string): Promise<SaveFile | null>;
  list(): Promise<SaveMetadata[]>;
  delete(key: string): Promise<void>;
  getMetadata(key: string): Promise<SaveMetadata | null>;
  getStorageInfo(): Promise<StorageInfo>;
}
```

**Available backends:**

- **IndexedDBStorage** (browser):
  - Persistent storage (survives page reload)
  - 50MB+ capacity (browser-dependent)
  - Supports compression
  - Async operations
  - Handles database blocking/timeout gracefully

- **MemoryStorage** (testing):
  - In-memory Map storage
  - No persistence (cleared on reload)
  - Fast and predictable
  - Supports compression
  - Ideal for tests

- **FileStorage** (Node.js, via SaveStateManager):
  - JSON files in `saves/` directory
  - Human-readable for debugging
  - Supports compression
  - Used by dev tools

**Choosing a backend:**

```typescript
import { saveLoadService, IndexedDBStorage, MemoryStorage } from '@ai-village/persistence';

// Browser (persistent)
saveLoadService.setStorage(new IndexedDBStorage());

// Testing (non-persistent)
saveLoadService.setStorage(new MemoryStorage());
```

### 3. Component Serialization & Versioning

Every component has a serializer that handles versioning and migrations:

```typescript
interface ComponentSerializer<T> {
  serialize(component: T): VersionedComponent;
  deserialize(data: VersionedComponent): T;
  migrate(from: number, data: unknown): unknown;
  validate(data: unknown): data is T;
  readonly currentVersion: number;
}

interface VersionedComponent {
  $schema: 'https://aivillage.dev/schemas/component/v1';
  $version: number;  // Component schema version
  type: string;      // 'position', 'agent', etc.
  data: unknown;     // Component-specific data
}
```

**Serializer types:**

- **GenericSerializer**: Default JSON serialization (most components)
- **Custom serializers**: Handle special cases (Maps, Sets, circular refs, etc.)

**Example custom serializer:**

```typescript
class PositionSerializer extends BaseComponentSerializer<PositionComponent> {
  currentVersion = 1;

  protected serializeData(component: PositionComponent): unknown {
    return {
      x: component.x,
      y: component.y,
      z: component.z ?? 0,  // Add defaults for optional fields
    };
  }

  protected deserializeData(data: unknown): PositionComponent {
    const d = data as any;
    return {
      type: 'position',
      x: d.x,
      y: d.y,
      z: d.z,
    };
  }

  validate(data: unknown): data is PositionComponent {
    // Throw on invalid data (no silent fallbacks!)
    if (typeof data.x !== 'number') {
      throw new ValidationError('Invalid x coordinate', 'position', 'x', data.x);
    }
    return true;
  }
}
```

### 4. Schema Migrations

When component schemas evolve, migrations handle old save files:

```typescript
// Register migration for position component v1 → v2
migrationRegistry.register({
  component: 'position',
  fromVersion: 1,
  toVersion: 2,
  description: 'Add z-coordinate',
  migrate(data: any) {
    return {
      ...data,
      z: 0,  // Add missing z field
    };
  },
});

// Migrations are automatically chained
// v1 → v2 → v3 → v4
migrationRegistry.getMigrationPath('position', 1, 4);
// Returns: [Migration<1→2>, Migration<2→3>, Migration<3→4>]
```

**Migration rules:**
- Never delete data (add deprecation warnings instead)
- Always provide defaults for new fields
- Validate after migration
- Support multi-version jumps (v1 → v5 via v2, v3, v4)
- Throw errors on unmigrateable data (no silent fallbacks)

### 5. Compression

All save files are compressed with GZIP:

```typescript
// Automatic compression on save
const jsonString = JSON.stringify(saveFile);  // ~2.5 MB
const compressed = await compress(jsonString);  // ~500 KB (80% reduction)

// Automatic decompression on load
const decompressed = await decompress(compressed);
const saveFile = JSON.parse(decompressed);
```

**Compression details:**
- Uses browser `CompressionStream` API (modern browsers)
- Falls back to Node.js `zlib` (server-side)
- Base64 encoding for storage compatibility
- Typical compression ratio: 70-85% size reduction
- Transparent to user (handled by storage backends)

### 6. Checksum Validation

Multiple checksums ensure save file integrity:

```typescript
interface SaveFileChecksums {
  overall: string;              // SHA256 of entire save (excluding checksums)
  universes: Record<string, string>;  // Per-universe checksums
  multiverse: string;           // Multiverse state checksum
}

interface UniverseSnapshot {
  checksums: {
    entities: string;           // All entities
    components: string;         // All components
    worldState: string;         // Terrain, zones
  };
}
```

**Validation flow:**
1. Load save file
2. Verify overall checksum (detect file corruption)
3. Verify per-universe checksums (detect partial corruption)
4. Validate invariants (entity references, component data)
5. If any fail → reject load (no silent fallbacks!)

---

## System APIs

### SaveLoadService (Main API)

The primary interface for saving and loading games.

**Global singleton:**

```typescript
import { saveLoadService } from '@ai-village/persistence';
```

**Key methods:**

```typescript
class SaveLoadService {
  // Configure storage backend (required before first use)
  setStorage(backend: StorageBackend): void;

  // Save current game state
  async save(world: World, options: SaveOptions): Promise<void>;

  // Load a saved game
  async load(key: string, world: World): Promise<LoadResult>;

  // List all saved games
  async listSaves(): Promise<SaveMetadata[]>;

  // Delete a saved game
  async deleteSave(key: string): Promise<void>;

  // Get storage info (space used, available)
  async getStorageInfo(): Promise<StorageInfo>;

  // Auto-save (uses 'autosave' key)
  async autoSave(world: World): Promise<void>;

  // Quick save to slot 1-10
  async quickSave(world: World, slot: number): Promise<void>;

  // Play time management
  resetPlayTime(): void;
  getPlayTime(): number;  // Returns seconds
}
```

**Save options:**

```typescript
interface SaveOptions {
  name: string;          // Save name (e.g., "Village Day 5")
  description?: string;  // Optional description
  screenshot?: string;   // Base64 PNG screenshot
  key?: string;          // Storage key (auto-generated if not provided)
}
```

**Load result:**

```typescript
interface LoadResult {
  success: boolean;
  save?: SaveFile;       // Loaded save file (if successful)
  error?: string;        // Error message (if failed)
}
```

### WorldSerializer

Serializes/deserializes entire World instances.

```typescript
class WorldSerializer {
  // Serialize world to snapshot
  async serializeWorld(
    world: World,
    universeId: string,
    universeName: string
  ): Promise<UniverseSnapshot>;

  // Deserialize snapshot to world
  async deserializeWorld(
    snapshot: UniverseSnapshot,
    world: World
  ): Promise<void>;
}
```

**Internal usage:**
- Called by `SaveLoadService.save()` and `SaveLoadService.load()`
- Handles entity serialization, terrain compression, zone storage
- Computes checksums for validation
- Preserves multiverse time state

### ComponentSerializerRegistry

Manages all component serializers.

```typescript
class ComponentSerializerRegistry {
  // Register a serializer
  register<T>(componentType: string, serializer: ComponentSerializer<T>): void;

  // Serialize a component
  serialize<T>(component: T & { type: string }): VersionedComponent;

  // Deserialize a component
  deserialize<T>(data: VersionedComponent): T;

  // Check if serializer exists
  has(componentType: string): boolean;

  // Get all registered types
  getRegisteredTypes(): string[];
}
```

**Global registry:**

```typescript
import { componentSerializerRegistry } from '@ai-village/persistence';

// Custom serializers are auto-registered in serializers/index.ts
// Generic serializers are created on-demand for unknown types
```

### MigrationRegistry

Manages schema migrations for components.

```typescript
class MigrationRegistry {
  // Register a migration
  register<T>(migration: Migration<T>): void;

  // Get migration path from version A to B
  getMigrationPath(component: string, from: number, to: number): Migration[];

  // Apply migration path
  migrate(
    component: string,
    from: number,
    to: number,
    data: unknown,
    context?: MigrationContext
  ): MigrationResult;
}
```

**Migration interface:**

```typescript
interface Migration<T = unknown> {
  component: string;          // Component type ('position', 'agent')
  fromVersion: number;        // Source version
  toVersion: number;          // Target version
  description: string;        // Human-readable description
  migrate(data: unknown, context?: MigrationContext): T;
}
```

### SaveStateManager (Dev Tools)

Advanced save state management for headless games and dev tools. Node.js only.

```typescript
class SaveStateManager {
  constructor(savesDir: string = 'saves');

  // Initialize saves directory
  async initialize(): Promise<void>;

  // Save world state
  async save(
    world: World,
    saveName: string,
    options?: { description?: string }
  ): Promise<void>;

  // Load world state
  async load(saveName: string): Promise<World | null>;

  // List all saves
  async list(): Promise<SaveListEntry[]>;

  // Delete a save
  async delete(saveName: string): Promise<void>;

  // Fork universe from save
  async fork(sourceSave: string, newSaveName: string): Promise<void>;
}
```

---

## Usage Examples

### Example 1: Basic Save/Load

```typescript
import { saveLoadService, IndexedDBStorage } from '@ai-village/persistence';
import { world } from '@ai-village/core';

// 1. Initialize storage backend (once at startup)
saveLoadService.setStorage(new IndexedDBStorage());

// 2. Save current game state
await saveLoadService.save(world, {
  name: 'Village Day 5',
  description: '10 agents, 5 buildings, wheat farm established',
  screenshot: canvasToBase64(),  // Optional
});
console.log('Game saved!');

// 3. List all saves
const saves = await saveLoadService.listSaves();
for (const save of saves) {
  console.log(`${save.name} - Day ${save.playTime}s - ${formatBytes(save.fileSize)}`);
}

// 4. Load a save
const result = await saveLoadService.load('save_village_day_5_123456789', world);
if (result.success) {
  console.log('Game loaded!');
  console.log(`Loaded: ${result.save.header.name}`);
} else {
  console.error(`Failed to load: ${result.error}`);
}
```

### Example 2: Auto-Save System

```typescript
import { saveLoadService } from '@ai-village/persistence';

// Set up auto-save every 60 seconds
setInterval(async () => {
  try {
    await saveLoadService.autoSave(world);
    console.log('[Auto-Save] Game saved');
  } catch (error) {
    console.error('[Auto-Save] Failed:', error);
  }
}, 60000);
```

### Example 3: Quick Save/Load

```typescript
// Quick save to slot 1
await saveLoadService.quickSave(world, 1);

// Quick save to slot 2
await saveLoadService.quickSave(world, 2);

// Load from quick save slot 1
await saveLoadService.load('quicksave_1', world);
```

### Example 4: Save Before Destructive Operation

```typescript
// Example: Save before settings change (from main.ts)
settingsPanel.setOnSettingsChange(async () => {
  // Take snapshot before reload to preserve agents
  const day = world.getComponent(timeEntityId, 'time')?.day ?? 0;

  await saveLoadService.save(world, {
    name: `Settings Reload Day ${day}`,
    description: 'Auto-save before settings reload',
  });

  // Now safe to reload
  window.location.reload();
});
```

### Example 5: Time Travel (Universe Forking)

```typescript
import { saveLoadService } from '@ai-village/persistence';

// 1. Create checkpoint before critical decision
await saveLoadService.save(world, {
  name: 'Before Attack on Dragon',
  description: 'Party at full health, dragon encounter imminent',
});

// 2. Later: Rewind to checkpoint (time travel)
const saves = await saveLoadService.listSaves();
const checkpoint = saves.find(s => s.name === 'Before Attack on Dragon');

if (checkpoint) {
  await saveLoadService.load(checkpoint.key, world);
  console.log('Rewound time to before dragon attack!');
}

// 3. Fork universe (create alternate timeline)
// Copy save file with new name → creates branch point
await saveLoadService.save(world, {
  name: 'Alternate: Negotiate with Dragon',
  description: 'Forked from "Before Attack on Dragon"',
});
```

### Example 6: Custom Component Serializer

```typescript
import { BaseComponentSerializer, componentSerializerRegistry } from '@ai-village/persistence';

class MyComponentSerializer extends BaseComponentSerializer<MyComponent> {
  currentVersion = 1;

  protected serializeData(component: MyComponent): unknown {
    return {
      customField: component.customField,
      mapData: Array.from(component.mapField.entries()),  // Convert Map to array
    };
  }

  protected deserializeData(data: any): MyComponent {
    return {
      type: 'my_component',
      customField: data.customField,
      mapField: new Map(data.mapData),  // Restore Map from array
    };
  }

  validate(data: unknown): data is MyComponent {
    if (typeof data.customField !== 'string') {
      throw new ValidationError('Invalid customField', 'my_component', 'customField', data);
    }
    return true;
  }
}

// Register at package init time
componentSerializerRegistry.register('my_component', new MyComponentSerializer());
```

### Example 7: Schema Migration

```typescript
import { migrationRegistry } from '@ai-village/persistence';

// Migrate agent component v1 → v2 (add skills field)
migrationRegistry.register({
  component: 'agent',
  fromVersion: 1,
  toVersion: 2,
  description: 'Add skills system',
  migrate(data: any) {
    return {
      ...data,
      skills: {
        farming: 0,
        crafting: 0,
        combat: 0,
      },
    };
  },
});

// Migrate agent component v2 → v3 (rename health → vitality)
migrationRegistry.register({
  component: 'agent',
  fromVersion: 2,
  toVersion: 3,
  description: 'Rename health to vitality',
  migrate(data: any) {
    const { health, ...rest } = data;
    return {
      ...rest,
      vitality: health,
    };
  },
});

// Loading old save (v1) automatically migrates to v3
// Migration path: v1 → v2 → v3
```

### Example 8: Storage Info & Quota Management

```typescript
import { saveLoadService, formatBytes } from '@ai-village/persistence';

const info = await saveLoadService.getStorageInfo();

console.log(`Backend: ${info.backend}`);
console.log(`Used: ${formatBytes(info.usedBytes)}`);
console.log(`Available: ${formatBytes(info.availableBytes ?? 0)}`);
console.log(`Total: ${formatBytes(info.totalBytes ?? 0)}`);
console.log(`Quota exceeded: ${info.quotaExceeded}`);

if (info.quotaExceeded) {
  console.warn('Storage quota exceeded! Delete old saves.');

  // Delete oldest saves to free space
  const saves = await saveLoadService.listSaves();
  const oldest = saves.sort((a, b) => a.lastSavedAt - b.lastSavedAt)[0];

  if (oldest) {
    await saveLoadService.deleteSave(oldest.key);
    console.log(`Deleted old save: ${oldest.name}`);
  }
}
```

---

## Architecture & Data Flow

### Serialization Pipeline

```
World Instance
  ↓
WorldSerializer.serializeWorld()
  → Query all entities
  → For each entity:
      → For each component:
          → componentSerializerRegistry.serialize(component)
              → Get serializer for component.type
              → Call serializer.serialize()
                  → Extract data
                  → Wrap in VersionedComponent
          → Apply migrations if needed
      → Create VersionedEntity
  → Serialize terrain (chunkSerializer.serialize())
  → Serialize zones
  → Compute checksums
  ↓
UniverseSnapshot
  ↓
SaveLoadService.save()
  → Get multiverse state
  → Create SaveFile
  → Compute overall checksum
  → Validate invariants
  ↓
StorageBackend.save()
  → JSON.stringify()
  → compress() [GZIP]
  → Store compressed data
  ↓
Persistent Storage (IndexedDB/Memory/File)
```

### Deserialization Pipeline

```
Persistent Storage
  ↓
StorageBackend.load()
  → Retrieve compressed data
  → decompress() [GZIP]
  → JSON.parse()
  ↓
SaveFile
  ↓
SaveLoadService.load()
  → Validate checksums
  → Validate invariants (entity refs, component data)
  → Restore multiverse state
  ↓
WorldSerializer.deserializeWorld()
  → Clear existing world
  → For each VersionedEntity:
      → Create entity
      → For each VersionedComponent:
          → componentSerializerRegistry.deserialize(component)
              → Get serializer for component.type
              → Check version, apply migrations if needed
              → Call serializer.deserialize()
                  → Restore component data
                  → Validate
          → Add component to entity
  → Restore terrain
  → Restore zones
  ↓
World Instance (restored)
```

### Event Flow

```
User triggers save
  ↓
SaveLoadService.save()
  → 'save:started' (not implemented, but pattern exists)
  → Serialize world
  → Compress
  → Write to storage
  ↓ 'save:completed' (not implemented)

User triggers load
  ↓
SaveLoadService.load()
  → 'load:started' (not implemented)
  → Read from storage
  → Decompress
  → Validate
  → Deserialize world
  ↓ 'load:completed' (not implemented)
```

**Note:** Save/load events are not currently emitted by the service, but the pattern is established for future use.

### Component Relationships

```
SaveFile
├── header: SaveFileHeader
│   ├── name: string
│   ├── description?: string
│   ├── screenshot?: string (base64 PNG)
│   ├── playTime: number
│   └── gameVersion: string
│
├── multiverse: MultiverseSnapshot
│   └── time: MultiverseTime
│       ├── absoluteTick: bigint (serialized)
│       ├── originTimestamp: number
│       └── realTimeElapsed: number
│
├── universes: UniverseSnapshot[]
│   └── [0]: UniverseSnapshot
│       ├── identity: { id, name, createdAt, parentId?, forkedAtTick? }
│       ├── time: UniverseTime
│       ├── config: UniverseDivineConfig
│       ├── entities: VersionedEntity[]
│       │   └── [0]: VersionedEntity
│       │       ├── id: string
│       │       └── components: VersionedComponent[]
│       │           └── [0]: VersionedComponent
│       │               ├── $version: number
│       │               ├── type: string
│       │               └── data: unknown
│       └── worldState: WorldSnapshot
│           ├── terrain: TerrainSnapshot (compressed)
│           └── zones: ZoneSnapshot[]
│
├── passages: PassageSnapshot[]
│   └── [0]: PassageSnapshot (universe connections)
│
├── godCraftedQueue: { version, entries }
│
└── checksums: SaveFileChecksums
    ├── overall: string (SHA256)
    ├── universes: Record<string, string>
    └── multiverse: string
```

---

## Performance Considerations

**Optimization strategies:**

1. **Compression**: GZIP reduces save file size by 70-85%
2. **Lazy loading**: Metadata loaded separately from full save files
3. **Checksum caching**: Checksums computed once and cached
4. **Async operations**: All I/O is async (non-blocking)
5. **Batch serialization**: Entities serialized in single pass
6. **Migration caching**: Migration paths computed once per component type

**Serialization performance:**

```typescript
// ❌ BAD: Serialize in loop
for (const entity of entities) {
  const serialized = await serializeEntity(entity);  // Async in loop!
  serializedEntities.push(serialized);
}

// ✅ GOOD: Batch serialization
const serializedEntities = await Promise.all(
  entities.map(entity => serializeEntity(entity))
);
```

**Storage quota management:**

```typescript
// Monitor storage usage
const info = await saveLoadService.getStorageInfo();

if (info.quotaExceeded) {
  // Delete old saves to free space
  const saves = await saveLoadService.listSaves();
  const oldestSaves = saves
    .sort((a, b) => a.lastSavedAt - b.lastSavedAt)
    .slice(0, 5);  // Keep 5 oldest for deletion

  for (const save of oldestSaves) {
    await saveLoadService.deleteSave(save.key);
  }
}
```

**Compression ratios:**

```typescript
import { formatBytes, getCompressionRatio } from '@ai-village/persistence';

const originalSize = JSON.stringify(saveFile).length;  // 2.5 MB
const compressedSize = (await compress(jsonString)).length;  // 500 KB

const ratio = getCompressionRatio(originalSize, compressedSize);  // 0.2
console.log(`Compression: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)}`);
console.log(`Ratio: ${(ratio * 100).toFixed(1)}% of original size`);
// Output: "Compression: 2.50 MB → 500.00 KB"
//         "Ratio: 20.0% of original size"
```

---

## Troubleshooting

### Save file not found

**Error:** `Save file not found: save_key_123`

**Check:**
1. Storage backend initialized? (`saveLoadService.setStorage()`)
2. Key correct? (check via `saveLoadService.listSaves()`)
3. Storage cleared? (browser DevTools → IndexedDB → `ai_village`)

**Debug:**
```typescript
const saves = await saveLoadService.listSaves();
console.log('Available saves:', saves.map(s => s.key));

// Try loading by name instead of key
const save = saves.find(s => s.name === 'Village Day 5');
if (save) {
  await saveLoadService.load(save.key, world);
}
```

### Checksum mismatch error

**Error:** `Overall checksum mismatch! Expected abc123, got def456. Save file may be corrupted.`

**Causes:**
- Save file corrupted during write (browser crash, storage quota exceeded)
- Manual editing of save file (IndexedDB tampering)
- Storage backend returned incorrect data

**Fix:**
```typescript
// If checksum fails, save file is likely corrupted
// Try loading anyway (system will attempt recovery)
const result = await saveLoadService.load(corruptedSaveKey, world);

if (!result.success) {
  console.error('Save file is corrupted and unrecoverable');

  // Try loading auto-save or previous save
  const saves = await saveLoadService.listSaves();
  const autoSave = saves.find(s => s.key === 'autosave');

  if (autoSave) {
    await saveLoadService.load('autosave', world);
  }
}
```

### Migration failed error

**Error:** `MigrationError: No migration path from v1 to v5 for component 'agent'`

**Causes:**
- Missing migration definition (v2 → v3 gap)
- Component version jumped too far (v1 → v5 without intermediates)

**Fix:**
```typescript
// Register missing migrations
migrationRegistry.register({
  component: 'agent',
  fromVersion: 2,
  toVersion: 3,
  description: 'Add missing migration',
  migrate(data: any) {
    // Add migration logic
    return { ...data, newField: defaultValue };
  },
});

// Verify migration path exists
const path = migrationRegistry.getMigrationPath('agent', 1, 5);
console.log('Migration path:', path.map(m => `v${m.fromVersion}→v${m.toVersion}`));
// Expected: ['v1→v2', 'v2→v3', 'v3→v4', 'v4→v5']
```

### IndexedDB blocked error

**Error:** `IndexedDB blocked - close all other tabs with this game`

**Causes:**
- Multiple browser tabs have the database open
- Previous tab didn't close database connection cleanly
- Browser security restrictions

**Fix:**
```typescript
// Close all other tabs running the game
// Refresh current tab
window.location.reload();

// If still blocked, delete database and retry
// (IndexedDBStorage does this automatically after timeout)
```

### Serialization error

**Error:** `SerializationError: No serializer registered for component type: custom_component`

**Causes:**
- Custom component without registered serializer
- Component type mismatch (typo in type field)
- Serializer registration failed

**Fix:**
```typescript
// Check registered serializers
import { componentSerializerRegistry } from '@ai-village/persistence';

console.log('Registered types:', componentSerializerRegistry.getRegisteredTypes());

// Register missing serializer
import { createGenericSerializer } from '@ai-village/persistence';

componentSerializerRegistry.register(
  'custom_component',
  createGenericSerializer('custom_component', 1)
);
```

### Invariant violation error

**Error:** `InvariantViolationError: Entity abc123 references non-existent entity xyz789`

**Causes:**
- Dangling entity reference (target entity was deleted but reference not cleared)
- Entity ID mismatch after deserialization
- Component data corruption

**Fix:**
```typescript
// This error indicates a bug in the code that created the save
// Entity references MUST be cleaned up when entities are removed

// If loading fails, the save is likely unrecoverable
// Implement proper cleanup:

// ✅ GOOD: Clean up references when removing entity
function removeEntity(entityId: string, world: World): void {
  // Find all entities referencing this entity
  const referencing = world.query()
    .with('relationship')
    .executeEntities()
    .filter(e => {
      const rel = e.getComponent('relationship');
      return rel.targetEntityId === entityId;
    });

  // Remove references
  for (const entity of referencing) {
    entity.removeComponent('relationship');
  }

  // Now safe to remove entity
  world.removeEntity(entityId);
}
```

### Storage quota exceeded

**Error:** `QuotaExceededError: IndexedDB storage quota exceeded`

**Causes:**
- Too many saves (browser limits ~50MB for IndexedDB)
- Large world with many entities
- Save file not compressed properly

**Check:**
```typescript
const info = await saveLoadService.getStorageInfo();
console.log(`Storage used: ${formatBytes(info.usedBytes)}`);
console.log(`Storage available: ${formatBytes(info.availableBytes ?? 0)}`);
console.log(`Quota exceeded: ${info.quotaExceeded}`);

const saves = await saveLoadService.listSaves();
console.log(`Total saves: ${saves.length}`);
console.log(`Largest save: ${formatBytes(Math.max(...saves.map(s => s.fileSize)))}`);
```

**Fix:**
```typescript
// Delete old saves
const saves = await saveLoadService.listSaves();
const oldestSaves = saves
  .sort((a, b) => a.lastSavedAt - b.lastSavedAt)
  .slice(0, 10);  // Delete 10 oldest

for (const save of oldestSaves) {
  // Keep auto-save and quick saves
  if (!save.key.startsWith('autosave') && !save.key.startsWith('quicksave')) {
    await saveLoadService.deleteSave(save.key);
    console.log(`Deleted: ${save.name}`);
  }
}
```

---

## Integration with Other Systems

### Multiverse System

Save/load integrates with multiverse for universe forking:

```typescript
import { multiverseCoordinator } from '@ai-village/core';
import { saveLoadService } from '@ai-village/persistence';

// Save captures multiverse state
await saveLoadService.save(world, { name: 'Checkpoint' });
// → Saves multiverse.time.absoluteTick
// → Saves all universes + passages
// → Saves god-crafted queue

// Load restores multiverse state
await saveLoadService.load('checkpoint_key', world);
// → Restores multiverse time
// → Restores all universes
// → Restores passages (not yet implemented)
```

### Time Travel System

Snapshots enable time travel mechanics:

```typescript
// Create checkpoint before critical event
await saveLoadService.save(world, {
  name: 'Before Dragon Attack',
  description: `Day ${day}, Tick ${world.tick}`,
});

// Later: Rewind time
const saves = await saveLoadService.listSaves();
const checkpoint = saves.find(s => s.name === 'Before Dragon Attack');

if (checkpoint) {
  await saveLoadService.load(checkpoint.key, world);
  console.log('Time rewound to before dragon attack!');
}
```

### Auto-Save System

Auto-save runs periodically to prevent data loss:

```typescript
// Set up auto-save in main game loop
const AUTO_SAVE_INTERVAL = 60000;  // 60 seconds

setInterval(async () => {
  try {
    await saveLoadService.autoSave(world);
    console.log('[Auto-Save] Game saved successfully');
  } catch (error) {
    console.error('[Auto-Save] Failed:', error);
  }
}, AUTO_SAVE_INTERVAL);
```

### Settings System

Save before settings changes (triggers reload):

```typescript
// From main.ts:2701-2716
settingsPanel.setOnSettingsChange(async () => {
  // Take snapshot before reload to preserve agents
  const day = world.getComponent(timeEntityId, 'time')?.day ?? 0;

  await saveLoadService.save(world, {
    name: `Settings Reload Day ${day}`,
    description: 'Auto-save before settings reload',
  });

  // Safe to reload - game state preserved
  window.location.reload();
});
```

---

## Testing

Run persistence tests:

```bash
npm test -- SaveLoadService.test.ts
npm test -- WorldSerializer.test.ts
npm test -- compression.test.ts
```

**Key test files:**
- `src/__tests__/WorldSerializer.terrain.test.ts` - Terrain serialization
- (Additional test files not yet implemented)

---

## Further Reading

- **METASYSTEMS_GUIDE.md** - Deep dive into persistence metasystem
- **ARCHITECTURE_OVERVIEW.md** - ECS architecture and data flow
- **SYSTEMS_CATALOG.md** - Complete system reference
- **COMPONENTS_REFERENCE.md** - All component types
- **CLAUDE.md** - Save/Load System section (lines 308-368)

---

## Summary for Language Models

**Before working with persistence:**
1. Read this README completely
2. Understand snapshot = save = checkpoint = time travel
3. Know the serialization pipeline (World → UniverseSnapshot → SaveFile)
4. Understand storage backends (IndexedDB, Memory, File)
5. Know how to use `saveLoadService` singleton API

**Common tasks:**
- **Save game:** `await saveLoadService.save(world, { name: 'Save Name' })`
- **Load game:** `await saveLoadService.load(saveKey, world)`
- **List saves:** `await saveLoadService.listSaves()`
- **Auto-save:** `await saveLoadService.autoSave(world)`
- **Quick save:** `await saveLoadService.quickSave(world, slot)`
- **Delete save:** `await saveLoadService.deleteSave(saveKey)`
- **Storage info:** `await saveLoadService.getStorageInfo()`

**Critical rules:**
- **Always initialize storage backend** before first use: `saveLoadService.setStorage(new IndexedDBStorage())`
- **Never delete entities** - mark as corrupted/deceased instead (Conservation of Matter)
- **No silent fallbacks** - throw errors on invalid data (migrations must be explicit)
- **Always validate** - checksums, invariants, component data (no corrupted saves)
- **Use event system** - emit events for save/load lifecycle (pattern exists, not yet implemented)
- **Save before destructive operations** - settings changes, reloads, critical decisions
- **Compression is automatic** - don't manually compress/decompress
- **Migrations are chained** - v1 → v5 via v2, v3, v4 (auto-applied on load)

**Event-driven architecture:**
- Persistence is primarily API-driven (call `saveLoadService.save()`)
- No events currently emitted (pattern exists for future implementation)
- Never bypass `SaveLoadService` for save/load operations
- Always use `saveLoadService` singleton (pre-configured, globally available)

**Snapshot lifecycle:**
1. Save: World → serialize → compress → store
2. Load: retrieve → decompress → validate → deserialize → World
3. Fork: copy snapshot → create new universe → resume from checkpoint
4. Rewind: load older snapshot → resume from past state

**Storage backends:**
- **IndexedDBStorage**: Browser persistent storage (50MB+, survives reload)
- **MemoryStorage**: In-memory storage (testing, non-persistent)
- **SaveStateManager**: Node.js file storage (dev tools, human-readable)

**Versioning & migrations:**
- Every component has `$version` field (schema version)
- Migrations transform old data → new data (v1 → v2 → v3)
- Migrations are chained automatically (v1 → v5 via intermediate versions)
- No silent fallbacks - throw on unmigrateable data

**Compression:**
- GZIP compression automatic (70-85% size reduction)
- Uses browser `CompressionStream` API (modern browsers)
- Falls back to Node.js `zlib` (server-side)
- Transparent to user (handled by storage backends)

**Validation:**
- Multiple checksums (overall, per-universe, per-component)
- Invariant checking (entity references, component data)
- Throws errors on corruption (no silent fallbacks)
- Validate before save, validate after load

**Time travel mechanics:**
- Every save is a checkpoint (can rewind to any save)
- Universe forking creates alternate timelines (branch points)
- Multiverse state preserved (absolute tick, real-time elapsed)
- Passages between universes stored (not yet restored on load)
