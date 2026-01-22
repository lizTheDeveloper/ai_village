# Snapshot Decay System

## Overview

The snapshot decay system manages automatic cleanup of old snapshots using **tau-based decay** - decay is measured in universe-relative time (causality delta), not wall-clock time.

This ensures correct behavior across:
- Variable time scales (0.5x, 4x speed universes)
- Time travel and universe forking
- Asynchronous multiplayer scenarios
- Long-running games with different play schedules

## Core Concept: Tau (τ)

**Tau = Causality Delta** = Current universe tick - Snapshot tick

```
Example:
- Snapshot created at tick 10,000
- Current tick: 35,000
- Tau (τ) = 25,000 ticks

At 20 TPS (ticks per second):
- 1 minute = 1,200 ticks
- 1 hour = 72,000 ticks
- 1 day = 1,728,000 ticks
```

## Decay Policy

Each snapshot has a client-controlled decay policy:

```typescript
interface SnapshotDecayPolicy {
  /** Decay after this many universe-ticks (tau) */
  decayAfterTicks?: number;

  /** Never decay (canonical events) */
  neverDecay?: boolean;

  /** Reason for preservation (debugging) */
  preservationReason?: string;
}
```

### Default Policies

| Snapshot Type | Default Policy |
|--------------|----------------|
| **Canonical** | `neverDecay: true` |
| **Auto** | `decayAfterTicks: 1,728,000` (24 hours) |
| **Manual** | `decayAfterTicks: 1,728,000` (24 hours) |

### Recommended Policies

```typescript
// Auto-save every minute → decay after 20 minutes
{
  decayAfterTicks: 24_000  // 20 min * 1200 ticks/min
}

// Hourly snapshot → decay after 24 hours
{
  decayAfterTicks: 1_728_000  // 24 hrs * 72000 ticks/hr
}

// Daily snapshot → decay after 3 days
{
  decayAfterTicks: 5_184_000  // 3 days * 1728000 ticks/day
}

// Weekly snapshot → keep for 2 weeks
{
  decayAfterTicks: 24_192_000  // 14 days * 1728000 ticks/day
}

// Canonical events → never decay
{
  neverDecay: true,
  preservationReason: 'canonical event'
}
```

## Client Usage

### Setting Decay Policy on Save

```typescript
import { saveLoadService } from '@ai-village/core';

// Auto-save with 20-minute decay
await saveLoadService.save(world, {
  name: 'Autosave',
  type: 'auto',
  decayPolicy: {
    decayAfterTicks: 24_000  // 20 minutes at 20 TPS
  }
});

// Hourly checkpoint with 24-hour decay
await saveLoadService.save(world, {
  name: 'Hourly Checkpoint',
  type: 'manual',
  decayPolicy: {
    decayAfterTicks: 1_728_000  // 24 hours
  }
});

// Daily snapshot with 3-day decay
await saveLoadService.save(world, {
  name: 'Daily Snapshot',
  type: 'manual',
  decayPolicy: {
    decayAfterTicks: 5_184_000  // 3 days
  }
});

// Canonical event - never decays
await saveLoadService.save(world, {
  name: 'First Village',
  type: 'canonical',
  canonEvent: {
    type: 'first_achievement',
    title: 'First Village Founded',
    description: 'The first permanent settlement was established',
    day: 10,
    importance: 100
  }
  // decayPolicy not needed - canonical = neverDecay
});
```

### Triggering Cleanup

Cleanup should be triggered periodically by the client when saving:

```typescript
// After saving a snapshot
const currentTick = world.tick;

// Trigger cleanup on server
const response = await fetch(`http://localhost:3001/api/multiverse/universe/${universeId}/cleanup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currentTick })
});

const { cleanup } = await response.json();
console.log(`Cleaned up ${cleanup.decayed} snapshots, freed ${cleanup.bytesFreed} bytes`);
```

## Server API

### POST /api/multiverse/universe/:id/cleanup

Remove decayed snapshots.

**Request:**
```json
{
  "currentTick": 50000
}
```

**Response:**
```json
{
  "success": true,
  "cleanup": {
    "totalSnapshots": 100,
    "decayed": 25,
    "preserved": 75,
    "bytesFreed": 52428800
  },
  "message": "Cleaned up 25 snapshot(s), freed 50.00 MB"
}
```

### GET /api/multiverse/universe/:id/decay-preview?currentTick=50000

Preview which snapshots would be decayed (dry-run).

**Response:**
```json
{
  "universeId": "universe:abc123",
  "currentTick": 50000,
  "snapshotsToDecay": 5,
  "snapshots": [
    {
      "tick": 10000,
      "tau": 40000,
      "type": "auto",
      "day": 5,
      "filename": "10000.json.gz",
      "decayPolicy": {
        "decayAfterTicks": 24000
      }
    }
  ]
}
```

## Time Scale Independence

The system handles different time scales correctly:

### 4x Speed Universe

```typescript
// Universe runs at 4x normal speed
// 1 real minute = 4 game minutes

// Snapshot at tick 10,000
// 20 minutes of universe-time pass → tick 34,000
// Tau = 24,000 ticks
// decayAfterTicks: 24,000 → DECAYED ✓

// ✓ Correct: Decays after 20 minutes of universe-time
// ✓ Corresponds to 5 minutes of real-time (20 / 4)
```

### 0.5x Speed Universe

```typescript
// Universe runs at 0.5x normal speed
// 1 real minute = 0.5 game minutes

// Snapshot at tick 10,000
// 20 minutes of universe-time pass → tick 34,000
// Tau = 24,000 ticks
// decayAfterTicks: 24,000 → DECAYED ✓

// ✓ Correct: Decays after 20 minutes of universe-time
// ✓ Corresponds to 40 minutes of real-time (20 / 0.5)
```

## Forked Universes

Each forked universe has its own tau measurement:

```
Parent Universe (A):
  - Snapshot at tick 50,000
  - Fork created at tick 100,000

Child Universe (B):
  - Starts at tick 0 (reset)
  - Snapshot from parent preserved if neverDecay
  - New snapshots decay based on Child's currentTick
```

## Conservation of Game Matter

Snapshots follow the **Conservation of Game Matter** principle:

1. **Never truly deleted**: Decayed snapshots are removed from timeline but could be archived
2. **Canonical protection**: Canonical events never decay
3. **Recoverable**: Future enhancement could add snapshot recovery tools

## Best Practices

### 1. Hierarchical Decay Periods

Use increasing decay periods for different snapshot frequencies:

```typescript
// Minute snapshots → 20-minute decay
const MINUTE_DECAY = 24_000;

// Hourly snapshots → 24-hour decay
const HOURLY_DECAY = 1_728_000;

// Daily snapshots → 3-day decay
const DAILY_DECAY = 5_184_000;

// Weekly snapshots → 2-week decay
const WEEKLY_DECAY = 24_192_000;
```

### 2. Cleanup Frequency

Run cleanup periodically, not on every save:

```typescript
// Run cleanup every 10 saves
let saveCount = 0;

async function autoSave(world: World) {
  await saveLoadService.save(world, { ... });

  saveCount++;
  if (saveCount % 10 === 0) {
    await triggerCleanup(world.tick);
  }
}
```

### 3. Canonical Event Snapshots

Always mark important moments as canonical:

```typescript
// First achievement
world.eventBus.subscribe('achievement:first', async (event) => {
  await saveLoadService.save(world, {
    name: `First ${event.achievementType}`,
    type: 'canonical',
    canonEvent: {
      type: 'first_achievement',
      title: event.title,
      description: event.description,
      day: world.day,
      importance: 100
    }
  });
});
```

### 4. Time Travel Compatibility

When forking universes, preserve parent snapshots:

```typescript
// When creating a fork, mark parent snapshot with neverDecay
await saveLoadService.save(parentWorld, {
  name: 'Fork Point',
  type: 'manual',
  decayPolicy: {
    neverDecay: true,
    preservationReason: 'fork origin point'
  }
});
```

## Troubleshooting

### Snapshots Not Decaying

Check:
1. Is `currentTick` being sent correctly?
2. Is tau calculation correct? (currentTick - snapshotTick)
3. Is `decayAfterTicks` set properly?
4. Are snapshots marked as `neverDecay`?

### Snapshots Decaying Too Fast/Slow

Remember: decay is based on **universe-ticks**, not real-time.

A 4x speed universe will reach tau=24,000 in 5 real minutes.
A 0.5x speed universe will reach tau=24,000 in 40 real minutes.

### Disk Space Not Freed

Cleanup removes files and updates timeline, but:
1. Check filesystem - deleted files should be gone
2. Verify metadata counts match actual snapshot count
3. Run `df -h` to confirm disk space freed

## Implementation Details

### Default Constants

```typescript
// 20 TPS (ticks per second) standard
const TICKS_PER_SECOND = 20;
const TICKS_PER_MINUTE = 1_200;
const TICKS_PER_HOUR = 72_000;
const TICKS_PER_DAY = 1_728_000;

// Default decay: 24 hours of universe-time
const DEFAULT_DECAY_TICKS = 1_728_000;
```

### Decay Evaluation Algorithm

```typescript
function shouldDecay(snapshot: SnapshotEntry, currentTick: number): boolean {
  // Never decay canonical snapshots
  if (snapshot.decayPolicy?.neverDecay) {
    return false;
  }

  // Calculate tau (causality delta)
  const tau = currentTick - snapshot.tick;

  // Get decay threshold (default 24 hours)
  const threshold = snapshot.decayPolicy?.decayAfterTicks ?? 1_728_000;

  // Decay if tau exceeds threshold
  return tau >= threshold;
}
```

## Future Enhancements

- [ ] Archive mode: Move decayed snapshots to cold storage instead of deleting
- [ ] Compression tiers: Further compress old snapshots before decay
- [ ] Smart decay: Preserve snapshots with high player activity
- [ ] Recovery tools: Restore accidentally decayed snapshots from archive
