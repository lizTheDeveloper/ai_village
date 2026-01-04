# Proposal: Work Order: Persistence Layer - World Serialization & Migrations

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/persistence-layer

---

## Original Work Order

# Work Order: Persistence Layer - World Serialization & Migrations

**Phase:** 31 (Persistence Layer)
**Created:** 2026-01-02
**Status:** COMPLETE
**Priority:** MEDIUM-HIGH
**Completed:** 2026-01-03

**Completion Note:** Phase 31 marked as complete per roadmap update. Persistence layer implementation with schema versioning, migration system, and storage backends has been successfully implemented.

---

## Spec Reference

- **Primary Spec:** [custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md](../../../../custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md) (Part 7)
- **Related Specs:**
  - Part 5: World Serialization (fork prerequisite)
  - SaveStateManager (basic save/load exists)

---

## Context

Basic world serialization exists via `SaveStateManager`, but the **production-ready persistence layer is missing**. Phase 31 provides the foundation for:
- **Phase 32**: Universe Forking (requires serialize/deserialize)
- **Phase 34**: Cross-Universe Sharing (requires versioned saves)
- **Player Features**: Save/load games, world backups

**Current Status:**
- ⚠️ Basic SaveStateManager exists
- ❌ Schema versioning system missing
- ❌ Migration registry not implemented
- ❌ Multiple storage backends not supported
- ❌ Checksum validation missing
- ❌ Production-grade save/load incomplete

---

## Requirements Summary

### Feature 1: Schema Versioning
Every persisted type has a version number:
1. Components tagged with `version` field
2. World state has schema version
3. Breaking changes increment version
4. Migrations handle version upgrades

### Feature 2: Migration System
One-way migrations upgrade old saves:
1. MigrationRegistry stores version → version+1 transforms
2. Auto-apply migrations on load
3. Validate migration completeness
4. Log migration history

### Feature 3: SaveFile Format
Comprehensive save format:
1. Header with metadata (timestamp, version, game version)
2. World state (entities, systems, chunks)
3. Player state (camera, settings, progression)
4. Registry versions (items, recipes, buildings)
5. Checksum for integrity

### Feature 4: Storage Backends
Multiple storage options:
1. **IndexedDB** - Browser persistent storage
2. **FileSystem** - Desktop app save files
3. **Cloud** - Future: Remote save sync

---

## Acceptance Criteria

### Criterion 1: Versioned Interface
- **WHEN:** A component or system is persisted
- **THEN:** The system SHALL:
  1. Support `Versioned` interface with `version` field
  2. Track current version in source code
  3. Serialize version with data
  4. Validate version on deserialization
  5. Reject future versions with clear error
- **Verification:**
  - Create `Versioned<AgentComponent>` with version 3
  - Serialize component → JSON includes `"version": 3`
  - Deserialize with version 3 → success
  - Attempt deserialize with version 4 → error "Unknown version"

### Criterion 2: Migration Registry
- **WHEN:** Loading an old save file
- **THEN:** The system SHALL:
  1. Detect version mismatch (old save vs current code)
  2. Look up migration chain (v1→v2→v3)
  3. Apply migrations in order
  4. Validate data after each migration
  5. Log migration results
- **Verification:**
  - Save file version 1, current version 3
  - Migrations: v1→v2 (add field), v2→v3 (rename field)
  - Load save → both migrations applied
  - Data in version 3 format
  - Log shows: "Applied migration v1→v2, v2→v3"

### Criterion 3: SerializedWorldState Format
- **WHEN:** Saving the game
- **THEN:** The system SHALL:
  1. Serialize all entities with components
  2. Serialize system state (time, weather, market)
  3. Serialize chunk data (terrain, tiles)
  4. Include entity ID mapping
  5. Support partial serialization (entities only, no chunks)
- **Verification:**
  - World with 100 entities, 10 chunks
  - Serialize → JSON includes entities array, chunks array
  - Deserialize → 100 entities recreated with correct IDs
  - Entity references preserved (relationships, targets)

### Criterion 4: World.serialize() / deserialize()
- **WHEN:** World.serialize() is called
- **THEN:** The system SHALL:
  1. Create SerializedWorldState
  2. Include all entities via `world.getAllEntities()`
  3. Include system state (TimeComponent, WeatherComponent singletons)
  4. Include chunk registry
  5. Return JSON-serializable object
- **Verification:**
  - Call `world.serialize()` → returns object
  - Object includes: `{entities, systems, chunks, version}`
  - JSON.stringify succeeds (no circular refs)
  - Deserialize creates identical world state

### Criterion 5: SaveFile Format
- **WHEN:** Creating a save file
- **THEN:** The system SHALL:
  1. Include header with timestamp, game version, schema version
  2. Include compressed world state
  3. Include player state (camera position, UI settings)
  4. Include registry checksums (detect mod changes)
  5. Calculate integrity checksum
- **Verification:**
  - Create save file
  - Header: `{timestamp: "2026-01-02T...", gameVersion: "0.1.0", schemaVersion: 5}`
  - World state compressed with gzip
  - Checksum validates with CRC32
  - Load detects corrupted file

### Criterion 6: IndexedDB Storage Backend
- **WHEN:** Running in browser
- **THEN:** The system SHALL:
  1. Use IndexedDB for persistent storage
  2. Store saves in object store "saves"
  3. Support multiple save slots
  4. List all saves with metadata
  5. Delete old saves
- **Verification:**
  - Save game → stored in IndexedDB
  - Refresh page → load game succeeds
  - List saves → shows all 3 slots
  - Delete save → removed from IndexedDB

### Criterion 7: FileSystem Storage Backend
- **WHEN:** Running in Electron/desktop
- **THEN:** The system SHALL:
  1. Save to user documents folder
  2. Use `.aiv` file extension (AI Village save)
  3. Support custom save paths
  4. Create save backups (.bak files)
  5. Atomic writes (temp file + rename)
- **Verification:**
  - Save game → file created at `~/Documents/AIVillage/saves/slot1.aiv`
  - Backup created: `slot1.aiv.bak`
  - Load game from .aiv file
  - Corrupted write doesn't destroy existing save

### Criterion 8: Checksum Validation
- **WHEN:** Loading a save file
- **THEN:** The system SHALL:
  1. Calculate checksum from save data
  2. Compare with stored checksum
  3. Reject corrupted saves with clear error
  4. Offer recovery options (load backup, skip validation)
- **Verification:**
  - Save file with valid checksum → loads
  - Manually corrupt save data → checksum mismatch detected
  - Error message: "Save file corrupted (checksum mismatch)"
  - Option to load backup presented

---

## Implementation Steps

1. **Versioned Interface** (2 hours)
   - Create `packages/core/src/persistence/Versioned.ts`
   - Add `version` field to interface
   - Create type helpers: `Versioned<T>`
   - Update all components to extend Versioned

2. **Migration System** (4-5 hours)
   - Create `packages/core/src/persistence/Migration.ts`
   - Create `packages/core/src/persistence/MigrationRegistry.ts`
   - Implement migration application logic
   - Add migration validation
   - Create example migrations

3. **SerializedWorldState** (3-4 hours)
   - Create `packages/core/src/persistence/SerializedWorldState.ts`
   - Define format: `{entities, systems, chunks, version}`
   - Implement entity serialization helper
   - Implement system state serialization
   - Add chunk data serialization

4. **World Serialization** (4-5 hours)
   - Add `World.serialize()` method
   - Add `World.deserialize(state)` static method
   - Handle entity ID reconstruction
   - Handle component references
   - Preserve entity relationships

5. **SaveFile Format** (3-4 hours)
   - Create `packages/core/src/persistence/SaveFile.ts`
   - Define format: `{header, worldState, playerState, checksums}`
   - Implement compression (gzip)
   - Calculate checksums (CRC32 or SHA256)
   - Add save metadata (screenshot, playtime)

6. **IndexedDB Backend** (4-5 hours)
   - Create `packages/core/src/persistence/IndexedDBStorage.ts`
   - Implement StorageBackend interface
   - Handle object store creation
   - Implement save/load/list/delete
   - Add error handling for quota exceeded

7. **FileSystem Backend** (3-4 hours)
   - Create `packages/core/src/persistence/FileSystemStorage.ts`
   - Implement save to documents folder
   - Implement atomic writes (temp + rename)
   - Create .bak backups
   - Handle file permissions errors

8. **Integration** (2-3 hours)
   - Update SaveStateManager to use new system
   - Add save slot UI (save/load/delete)
   - Test full save → load cycle
   - Verify migrations work
   - Test corrupted file recovery

---

## Testing Plan

### Unit Tests
- Test Versioned serialization/deserialization
- Test migration chain application (v1→v2→v3)
- Test checksum calculation and validation
- Test compression/decompression

### Integration Tests
- Test World.serialize() → deserialize() roundtrip
- Test save file creation with all components
- Test IndexedDB save → load in browser
- Test FileSystem save → load in Electron
- Test migration on old save file

### Scenario Tests
1. **Full Save/Load**: Save game with 100 entities, reload, verify identical
2. **Migration**: Create v1 save, upgrade code to v3, load save, verify migration
3. **Corruption**: Corrupt save file, verify checksum fails, load backup succeeds
4. **Multi-Slot**: Save 3 different games, load each, verify separate state

---

## Performance Requirements

- **Serialize**: < 100ms for 1000 entities
- **Deserialize**: < 200ms for 1000 entities
- **Compression**: < 50ms for typical save (~5MB uncompressed)
- **Checksum**: < 10ms per save file
- **Migration**: < 50ms per migration step

---

## Success Metrics

1. ✅ All 8 acceptance criteria met
2. ✅ Save/load roundtrip preserves world state exactly
3. ✅ Migrations upgrade old saves successfully
4. ✅ Corrupted saves detected and rejected
5. ✅ Works in both browser (IndexedDB) and desktop (FileSystem)
6. ✅ Performance within budget (< 300ms total save/load)

---

## Dependencies

- ✅ World.getAllEntities() (exists)
- ✅ Component serialization (toJSON methods exist)
- ⏳ Compression library (use pako for gzip)
- ⏳ Checksum library (use fast-crc32 or crypto.subtle)

---

## Breaking Changes

This work order introduces schema versioning, which affects:
1. All components must add `version: number` field
2. SaveStateManager API changes to use new SaveFile format
3. Old saves from pre-versioning will not load (one-time breaking change)

**Migration Path:**
- Mark current date as "schema version 1" baseline
- All future changes increment version with migration
- Old pre-v1 saves prompt user: "Incompatible save version, start new game"

---

## Future Enhancements (Not in This Work Order)

- Cloud storage backend (Google Drive, Dropbox sync)
- Automatic backups (hourly, daily)
- Save file browser (list saves with screenshots, playtime)
- Export/import saves (share saves between players)
- Mod compatibility checking (detect incompatible mods)

---

## Notes

- This is foundational work for Phase 32 (Universe Forking)
- Keep save format extensible for future features
- Document migration guide for contributors
- Consider save file size (compression is critical)
- IndexedDB has ~50MB quota in most browsers
- FileSystem unlimited but requires user permission


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
