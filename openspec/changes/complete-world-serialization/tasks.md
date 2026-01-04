# Tasks: Complete World State Serialization

## Phase 1: Terrain Serialization

- [ ] Design terrain save format (chunks, tiles, biomes)
- [ ] Implement terrain serialization in ChunkManager
- [ ] Add terrain deserialization
- [ ] Handle chunk dirty state
- [ ] Test terrain round-trip
- [ ] Remove terrain TODO comments

## Phase 2: Weather Serialization

- [ ] Design weather save format (state, patterns, duration)
- [ ] Implement weather serialization
- [ ] Add weather deserialization
- [ ] Test weather state continuity
- [ ] Remove weather TODO comments

## Phase 3: Zone Serialization

- [ ] Design zone save format (boundaries, properties, entities)
- [ ] Implement zone serialization
- [ ] Add zone deserialization
- [ ] Test zone restoration
- [ ] Remove zone TODO comments

## Phase 4: Building Placement

- [ ] Design building placement save format
- [ ] Implement building serialization
- [ ] Add building deserialization
- [ ] Test building restoration
- [ ] Remove building placement TODO comments

## Phase 5: Multiverse Integration

- [ ] Add absoluteTick to save metadata
- [ ] Implement passage serialization
- [ ] Add player state serialization
- [ ] Integrate with MultiverseCoordinator
- [ ] Test multiverse save/load
- [ ] Remove multiverse TODO comments

## Phase 6: Divine Config

- [ ] Design UniverseDivineConfig schema
- [ ] Add config to save data
- [ ] Implement config serialization
- [ ] Add config deserialization
- [ ] Test divine config persistence

## Validation

- [ ] Round-trip save/load preserves all state
- [ ] No data loss in any subsystem
- [ ] Save file size acceptable (<50MB typical)
- [ ] Serialization completes in <2 seconds
- [ ] All 8+ serialization TODOs resolved
- [ ] Tests pass for all serialization paths
