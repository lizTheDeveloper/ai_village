# Interdimensional Cable - Testing Work Order

**Status:** In Test
**Date:** 2026-01-04
**System:** Rendering / UI System
**Related Spec:** `/openspec/specs/communication-system/tv-station.md` (related but separate)

## Overview

The Interdimensional Cable system allows playback of VideoReplayComponent recordings from the game world. This bridges the ECS world data with a dedicated playback UI that displays entity snapshots as animated sequences.

## Implementation Summary

### Components Created
- **VideoReplayComponent** (`packages/core/src/components/VideoReplayComponent.ts`)
  - Stores entity snapshot frames for replay
  - Tracks recording metadata (quality, duration, recorded by, etc.)
  - Status tracking: recording, completed, failed

- **RecordingComponent** (`packages/core/src/components/RecordingComponent.ts`)
  - Associates with reporters/camera operators
  - Tracks recording assignments and target entities

### Systems Created
- Systems for managing recording behavior (profession-specific)
- Event reporting systems for triggering recordings

### Bridge API Created
- **Recordings API** (`demo/src/api/recordings.ts`)
  - `getAllRecordings()` - Queries ECS for VideoReplayComponent entities
  - `getRecording(id)` - Gets specific recording by ID
  - `getRecordingCount()` - Returns count of completed recordings
  - Formats ECS data for Interdimensional Cable UI

- **App Module** (`demo/interdimensional-cable-app.ts`)
  - `loadRecordingsFromWorld()` - Loads recordings into SHOWS array
  - Auto-polls for gameLoop initialization
  - Exposes globally for HTML access

### UI Created
- **Interdimensional Cable HTML** (`demo/interdimensional-cable.html`)
  - ReplayRenderer class for playing back entity snapshots
  - SpriteAnimationPlayer for entity rendering
  - Grid-based show selection UI
  - Auto-loads recordings from game world on startup

### Mock Data
Created 6 diverse mock recordings for testing:
1. **alien-invasion.json** - Simple 2-entity recording (original)
2. **gladiator-arena.json** - Combat test with 7 entities, crowd reactions
3. **reproductive-test.json** - E2E reproductive systems test with 10 entities, ritual
4. **market-festival.json** - Bustling market with 15+ entities, merchants, performers
5. **magic-ritual.json** - Multi-mage ritual with particle effects and demon summoning
6. **disaster-response.json** - Emergency response with 15+ entities, building collapse

## Testing Checklist

### Unit Testing
- [ ] VideoReplayComponent serialization/deserialization
- [ ] RecordingComponent state transitions
- [ ] getAllRecordings() filters only completed recordings
- [ ] Recording count accuracy

### Integration Testing
- [ ] Game world creates VideoReplayComponent entities
- [ ] Recordings API successfully queries ECS world
- [ ] Bridge loads recordings into Interdimensional Cable UI
- [ ] gameLoop global exposure works correctly
- [ ] Auto-polling detects gameLoop initialization

### UI Testing
- [ ] Mock recordings display in grid
- [ ] Video player opens on show selection
- [ ] ReplayRenderer correctly renders entity snapshots
- [ ] Camera movement (pan, zoom, angle) works
- [ ] Entity animations play at correct frame
- [ ] Entity depth sorting (distanceFromCamera) works
- [ ] Multiple recordings can be played sequentially
- [ ] TV static animation plays between shows

### End-to-End Testing
- [ ] Reporter agents create recordings in game
- [ ] Recordings appear in Interdimensional Cable after completion
- [ ] Real game recordings playback correctly (not just mocks)
- [ ] Recording quality affects playback visual quality
- [ ] Frame interpolation/playback timing is smooth

### Performance Testing
- [ ] Large recordings (100+ frames) don't cause lag
- [ ] Multiple recordings don't cause memory issues
- [ ] Query performance acceptable with 50+ recordings

### Edge Cases
- [ ] No recordings - shows mock data only
- [ ] Incomplete recordings filtered out
- [ ] Corrupted recording data handled gracefully
- [ ] Missing entity types render placeholder sprite
- [ ] Camera extreme values (zoom 0, angle 360+) handled

## Known Issues
None yet - testing in progress

## Next Steps
1. Run full test suite against all 6 mock recordings
2. Generate real recordings from game world (reporters in action)
3. Verify bridge integration with live game data
4. Performance test with large recording library
5. Edge case testing with malformed data

## Related Files
- `packages/core/src/components/VideoReplayComponent.ts`
- `packages/core/src/components/RecordingComponent.ts`
- `demo/src/api/recordings.ts`
- `demo/interdimensional-cable-app.ts`
- `demo/interdimensional-cable.html`
- `demo/public/mock-recordings/*.json` (6 files)

## Notes
This system is separate from the TV Station broadcasting system. While TV stations create scripted content with LLM-powered actors, Interdimensional Cable plays back real recorded game footage captured by reporter agents with cameras.

The bridge architecture allows the UI to run independently of the game loop, making it suitable for:
- Debugging game state
- Creating trailers/promotional content
- Agent behavior analysis
- Time travel/replay features
