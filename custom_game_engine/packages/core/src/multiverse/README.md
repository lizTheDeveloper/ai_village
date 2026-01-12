# Multiverse System

Manages parallel universes with independent time scales, enabling universe forking, time travel, and networked multiverse coordination.

## Overview

The multiverse system provides infrastructure for:
- **Universe forking**: Clone worlds at any point to create parallel timelines
- **Time travel**: Variable-interval snapshots with canon event triggers
- **Time dilation**: Independent time scales per universe (0.5x to 2x+ speed)
- **Networked passages**: Peer-to-peer connections between game instances

## Key Concepts

### Universes

Each universe tracks:
- **Absolute tick**: Monotonic multiverse time (never resets)
- **Universe tick**: Relative time scaled by `timeScale` multiplier
- **Pause state**: Accumulated paused duration for accurate time accounting
- **Multiverse ID**: Shared by forked universes from same origin

### Timeline Snapshots

Variable-interval auto-saves that increase spacing over time:
- **Early (0-10 min)**: Every 1 minute (1200 ticks @ 20 TPS)
- **Mid (10-60 min)**: Every 5 minutes (6000 ticks)
- **Mature (60+ min)**: Every 10 minutes (12000 ticks)

**Canon events** trigger immediate snapshots: births, deaths, marriages, day milestones. Manual snapshots and canon saves are **never pruned**.

### Passages

Connections between universes for entity transfer:
- **Thread**: Thin connection (data streaming)
- **Bridge**: Stable two-way passage
- **Gate**: Controlled access point
- **Confluence**: Multi-universe junction

## API

### Basic Usage

```typescript
import { multiverseCoordinator, timelineManager } from '@ai-village/core';

// Register universe
multiverseCoordinator.registerUniverse(world, {
  id: 'universe_1',
  name: 'Main Timeline',
  timeScale: 1.0,
  multiverseId: 'multiverse_root',
  paused: false,
});

// Fork from current state
const fork = await multiverseCoordinator.forkUniverse(
  'universe_1',
  'universe_2',
  'Fast Timeline',
  { timeScale: 2.0 }
);

// Fork from snapshot
const fork2 = await multiverseCoordinator.forkUniverse(
  'universe_1',
  'universe_3',
  'Past Timeline',
  { fromSnapshotId: 'snapshot_123' }
);

// Create passage
multiverseCoordinator.createPassage(
  'passage_1',
  'universe_1',
  'universe_2',
  'bridge'
);
```

### Timeline Management

```typescript
// Attach to world for canon event auto-saves
timelineManager.attachToWorld('universe_1', world);

// Manual snapshot
await multiverseCoordinator.createTimelineSnapshot(
  'universe_1',
  'Before major decision'
);

// Browse timeline
const timeline = timelineManager.getTimeline('universe_1');
const latest = timelineManager.getLatestSnapshot('universe_1');
const atTick = timelineManager.findSnapshotAtTick('universe_1', 50000n);
```

### Time Control

```typescript
// Pause/resume
multiverseCoordinator.pauseUniverse('universe_1');
multiverseCoordinator.resumeUniverse('universe_1');

// Change speed
multiverseCoordinator.setTimeScale('universe_1', 0.5); // Half speed

// Query time
const absoluteTick = multiverseCoordinator.getAbsoluteTick();
const universeTick = multiverseCoordinator.getUniverseTick('universe_1');
const elapsed = multiverseCoordinator.getRealTimeElapsed();
```

## Architecture

### Components

- **MultiverseCoordinator**: Universe registry, forking, time tracking
- **TimelineManager**: Snapshot creation, retention, canon event hooks
- **MultiverseNetworkManager**: WebSocket server/client, remote passages
- **GodChatRoomNetwork**: Chat rooms between universe instances
- **ProximityVoiceChat**: WebRTC spatial audio

### Singletons

All managers are exported as singletons:
```typescript
export const multiverseCoordinator = new MultiverseCoordinator();
export const timelineManager = new TimelineManager();
```

### Integration

Game loop calls `multiverseCoordinator.tick()` to advance absolute time and calculate universe-relative ticks based on time scales. Actual world updates happen in game loop using calculated tick deltas.

Timeline manager's `tick()` is called by systems to trigger automatic snapshots. Canon events auto-trigger via EventBus subscriptions when attached.
