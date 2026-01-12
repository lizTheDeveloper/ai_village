# Persistence Subcomponent

Core save/load system for game state serialization, snapshots, and time travel.

## Overview

This subcomponent handles low-level serialization of World instances to versioned snapshots. Each save creates a snapshot suitable for loading, time travel, or universe forking. Supports IndexedDB and memory storage backends, multiverse server sync, and forward-compatible migrations.

**Location**: `packages/core/src/persistence/` (internal serialization layer)
**High-level API**: `packages/persistence/` (user-facing save/load UI and metadata management)

## SaveLoadService API

**Global singleton**: `saveLoadService`

```typescript
import { saveLoadService } from '@ai-village/core';

// Configure storage backend
import { IndexedDBStorage } from '@ai-village/core';
saveLoadService.setStorage(new IndexedDBStorage());

// Save
await saveLoadService.save(world, {
  name: 'Village Day 10',
  description: 'First harvest complete',
  screenshot: base64PNG,  // Optional
});

// Load
const result = await saveLoadService.load('save_key', world);
if (!result.success) console.error(result.error);

// Quick operations
await saveLoadService.autoSave(world);
await saveLoadService.quickSave(world, slot);
const saves = await saveLoadService.listSaves();
```

## Serialization Approach

**WorldSerializer** converts entire World instances to `UniverseSnapshot` format:
- **Entities**: Each entity → `VersionedEntity` with `VersionedComponent[]`
- **Components**: Registered via `componentSerializerRegistry` with migration support
- **World State**: Terrain (chunks), zones, divine config
- **Checksums**: SHA-256 for entities, components, world state, overall file

```typescript
import { worldSerializer } from '@ai-village/core';

// Manual snapshot creation (for time travel)
const snapshot = await worldSerializer.serializeWorld(world, universeId, universeName);

// Clone for forking
await worldSerializer.cloneWorld(sourceWorld, targetWorld, newUniverseId, newName);
```

**Component Serializers**: Extend `BaseComponentSerializer` and register:
```typescript
import { componentSerializerRegistry, BaseComponentSerializer } from '@ai-village/core';

class MyComponentSerializer extends BaseComponentSerializer<MyComponent> {
  protected serializeData(component: MyComponent) { return { ...component }; }
  protected deserializeData(data: unknown): MyComponent { return data as MyComponent; }
  validate(data: unknown): data is MyComponent { return typeof data === 'object'; }
}

componentSerializerRegistry.register('my_component', new MyComponentSerializer('my_component', 1));
```

## Relationship to packages/persistence

**This package** (`packages/core/src/persistence/`):
- Low-level serialization (World → SaveFile)
- Component versioning and migrations
- Checksum validation
- Storage backends (IndexedDB, memory)

**packages/persistence**:
- High-level save/load UI panels
- Save metadata management (screenshots, timestamps)
- User-facing save browser and timeline view
- Multiverse snapshot coordination

**Rule**: Use `saveLoadService` for all save/load operations. Never re-implement serialization logic.

## Key Files

- `SaveLoadService.ts`: Main API, multiverse server sync
- `WorldSerializer.ts`: World ↔ UniverseSnapshot conversion
- `ComponentSerializerRegistry.ts`: Component serialization registry
- `MigrationRegistry.ts`: Schema migration system
- `InvariantChecker.ts`: Save file validation
- `storage/IndexedDBStorage.ts`: Browser storage backend
- `types.ts`: SaveFile, UniverseSnapshot, VersionedComponent schemas
