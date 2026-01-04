# Chunk Serialization Phase 2 - Integration Complete

**Date**: 2026-01-03
**Status**: Phase 2 Complete - Integrated into Save/Load System
**Location**: `packages/core/src/`, `packages/world/src/`

## Summary

Successfully integrated ChunkSerializer into the existing save/load system. Terrain data is now automatically serialized when saving a world and restored when loading from a snapshot.

## Changes Made

### 1. World.ts - ChunkManager Access

**File**: `packages/core/src/ecs/World.ts`

**Changes**:
- Imported `ChunkManager` type from `@ai-village/world`
- Updated `WorldImpl._chunkManager` from `IChunkManager?` to `ChunkManager?`
- Added `getChunkManager(): ChunkManager | undefined` method to WorldImpl
- Updated constructor and `setChunkManager()` to use ChunkManager type

**Why**: ChunkSerializer needs access to the full ChunkManager interface (specifically `getLoadedChunks()`, `getChunkCount()`, `clear()`), not just the minimal `IChunkManager` interface.

**Code**:
```typescript
// Import ChunkManager from world package
import type { ChunkManager } from '@ai-village/world';

export class WorldImpl implements WorldMutator {
  private _chunkManager?: ChunkManager;  // Was: IChunkManager

  /**
   * Get ChunkManager for serialization/terrain access.
   * Returns the ChunkManager if set, otherwise undefined.
   * Used by WorldSerializer to serialize terrain data.
   */
  getChunkManager(): ChunkManager | undefined {
    return this._chunkManager;
  }
}
```

### 2. WorldSerializer.ts - Terrain Serialization

**File**: `packages/core/src/persistence/WorldSerializer.ts`

**Changes**:
- Imported `WorldImpl` and `chunkSerializer` from `@ai-village/world`
- Updated `serializeWorldState()` to serialize terrain using ChunkSerializer
- Updated `deserializeWorld()` to restore terrain from snapshot

**Serialization**:
```typescript
private serializeWorldState(world: World): WorldSnapshot {
  // Serialize terrain using ChunkSerializer
  const worldImpl = world as WorldImpl;
  const chunkManager = worldImpl.getChunkManager();

  const terrain = chunkManager
    ? chunkSerializer.serializeChunks(chunkManager)
    : null;

  return {
    terrain,  // Now contains TerrainSnapshot instead of null
    weather: null,
    zones: [],
    buildings: [],
  };
}
```

**Deserialization**:
```typescript
async deserializeWorld(snapshot: UniverseSnapshot, world: World): Promise<void> {
  // ... entity deserialization ...

  // Deserialize world state (terrain, weather, etc.)
  if (snapshot.worldState.terrain) {
    const worldImpl = world as WorldImpl;
    const chunkManager = worldImpl.getChunkManager();
    if (chunkManager) {
      await chunkSerializer.deserializeChunks(snapshot.worldState.terrain, chunkManager);
      console.log('[WorldSerializer] Terrain restored from snapshot');
    } else {
      console.warn('[WorldSerializer] No ChunkManager available - terrain not restored');
    }
  }
}
```

### 3. types.ts - TerrainSnapshot Type

**File**: `packages/core/src/persistence/types.ts`

**Changes**:
- Imported `TerrainSnapshot` from `@ai-village/world`
- Updated `WorldSnapshot.terrain` from `unknown` to `TerrainSnapshot | null`

**Code**:
```typescript
import type { TerrainSnapshot } from '@ai-village/world';

export interface WorldSnapshot {
  /** Terrain data (compressed) */
  terrain: TerrainSnapshot | null;  // Was: unknown

  /** Weather state */
  weather: unknown;

  /** Zone configuration */
  zones: unknown[];

  /** Building placements */
  buildings: unknown[];
}
```

## Integration Flow

### Save Flow

1. User triggers save (via UI, auto-save, or manual save command)
2. `SaveLoadService.save()` calls `WorldSerializer.serializeWorld()`
3. `WorldSerializer.serializeWorld()` calls `serializeWorldState()`
4. `serializeWorldState()` retrieves ChunkManager from WorldImpl
5. If ChunkManager exists, calls `chunkSerializer.serializeChunks()`
6. ChunkSerializer compresses terrain using RLE/Delta/Full strategies
7. TerrainSnapshot included in UniverseSnapshot
8. Save stored to IndexedDB (or configured storage backend)

### Load Flow

1. User loads save (via UI or `SaveLoadService.load()`)
2. `WorldSerializer.deserializeWorld()` receives UniverseSnapshot
3. Deserializes entities first
4. Checks if `snapshot.worldState.terrain` exists
5. If terrain data present, retrieves ChunkManager from WorldImpl
6. If ChunkManager exists, calls `chunkSerializer.deserializeChunks()`
7. ChunkSerializer decompresses terrain data
8. Chunks restored to ChunkManager
9. World fully restored with terrain

## Error Handling

**Missing ChunkManager**:
- If no ChunkManager is set, terrain is not serialized (returns null)
- On load, if no ChunkManager available, logs warning and skips terrain restoration
- Non-breaking: Game can still save/load without terrain data

**Corrupted Terrain**:
- ChunkSerializer handles corrupted chunks per CLAUDE.md guidelines
- Creates corrupted chunk markers instead of deleting data
- Checksum validation with warnings (continues loading)

## Build Verification

**Result**: No new TypeScript errors introduced

The integration compiles cleanly. All pre-existing errors unrelated to this feature remain unchanged.

## Testing Status

**Phase 2 Complete**:
- ✅ WorldImpl exposes ChunkManager
- ✅ WorldSerializer integrates ChunkSerializer
- ✅ Types updated for TerrainSnapshot
- ✅ Build passes without new errors

**Pending (Phase 3)**:
- ⏳ Integration tests for full save/load cycle
- ⏳ Testing with real terrain data
- ⏳ Performance testing with large worlds

## Files Modified

1. **`packages/core/src/ecs/World.ts`**
   - Added ChunkManager import
   - Updated `_chunkManager` type
   - Added `getChunkManager()` method

2. **`packages/core/src/persistence/WorldSerializer.ts`**
   - Added WorldImpl and chunkSerializer imports
   - Implemented terrain serialization in `serializeWorldState()`
   - Implemented terrain deserialization in `deserializeWorld()`

3. **`packages/core/src/persistence/types.ts`**
   - Added TerrainSnapshot import
   - Updated WorldSnapshot.terrain type

## Next Steps: Phase 3 Testing

### Integration Tests

Create `packages/core/src/persistence/__tests__/WorldSerializer.integration.test.ts`:

```typescript
describe('WorldSerializer terrain integration', () => {
  it('should serialize and restore terrain through full save/load cycle', async () => {
    // 1. Create world with ChunkManager
    // 2. Generate some terrain chunks
    // 3. Serialize world with WorldSerializer
    // 4. Create new empty world
    // 5. Deserialize snapshot
    // 6. Verify all chunks restored correctly
    // 7. Verify tile data matches original
  });

  it('should handle saves without ChunkManager gracefully', async () => {
    // Test that saves work even if ChunkManager not set
  });

  it('should preserve terrain compression metadata', async () => {
    // Verify compression strategies preserved in save files
  });
});
```

### Real World Testing

Manual testing steps:
1. Start game, explore world to generate terrain
2. Create manual save
3. Reload page, load save
4. Verify terrain looks identical
5. Check browser console for ChunkSerializer logs
6. Inspect IndexedDB to verify terrain data present

## API Usage

### For Game Initialization

```typescript
// Setup world with ChunkManager
const chunkManager = new ChunkManager(loadRadius);
const world = new WorldImpl(eventBus, chunkManager);

// Chunks will now be automatically saved/loaded
await saveLoadService.save(world, { name: 'my_save' });
```

### For Save Inspection

```typescript
// Check if terrain was saved
const snapshot = await saveLoadService.loadSnapshot('save_key');
if (snapshot.worldState.terrain) {
  console.log(`Saved ${snapshot.worldState.terrain.generatedChunkCount} chunks`);
  console.log(`Compression: ${snapshot.worldState.terrain.chunks['0,0'].tiles.encoding}`);
}
```

## Performance Impact

**Serialization**:
- 100 chunks: ~500ms (measured in Phase 1 tests)
- Compression reduces save file size by 50-99% depending on terrain uniformity

**Deserialization**:
- Similar to serialization time
- Chunk restoration is sequential per CLAUDE.md (to avoid data corruption)

**Memory**:
- Temporary spike during serialization (full chunk data in memory)
- Compressed data stored in save file reduces IndexedDB usage

## Known Limitations

1. **No Lazy Loading**: All chunks loaded at once during deserialization
   - Future: Implement on-demand chunk loading from save files
   - Current approach suitable for small/medium worlds

2. **Entity References**: Chunks store entity IDs as strings
   - Not validated during load (future enhancement)
   - Dangling references preserved per CLAUDE.md

3. **Checksum Function**: Using simple hash
   - Future: Replace with proper checksum from `@ai-village/core/utils`

## Documentation

- Design: `devlogs/CHUNK_SERIALIZATION_DESIGN_2026-01-03.md`
- Phase 1: `devlogs/CHUNK_SERIALIZATION_PHASE1_COMPLETE_2026-01-03.md`
- Phase 2: This document

---

Phase 2 integration complete and ready for testing.
