# Checkpoint Retention & Canon Events - Implementation Summary

## Overview

Smart checkpoint pruning system that balances storage efficiency with the ability to time travel to important moments in long-running games.

## Retention Strategy

### Last 10 Days (Rolling Window)
- Always keep the most recent 10 days
- Allows rewinding up to 10 days back
- Rolling window moves forward with current day

### Monthly Summarization
- At end of each month (day 30, 60, 90, etc.), prune that month
- Keep only: first 10 days, monthly milestones, and canon events
- Automatically deletes normal checkpoints that fall outside retention rules

### First 10 Days (Tutorial Reference)
- Days 1-10 are kept forever
- Provides reference to early game/tutorial phase
- Never pruned regardless of age

### Monthly Milestones
- Keep checkpoints at day 30, 60, 90, 120, etc.
- Provides regular snapshots of progression
- Useful for long-term time travel

### Canon Events (Permanent)
- Deaths, births, marriages
- First achievements (first harvest, first building, etc.)
- Deity emergence, major discoveries
- Record highs, cultural milestones
- **These are NEVER deleted**

## Example Timeline

```
Day 95 checkpoint retention:
┌────────────────────────────────────────────────┐
│ Days 1-10: Always kept (first 10 days)         │
│ Day 30:    Kept (monthly milestone)            │
│ Day 42:    Kept (first harvest - canon event)  │
│ Day 57:    Kept (Alice died - canon event)     │
│ Day 60:    Kept (monthly milestone)            │
│ Day 73:    Kept (first forge - canon event)    │
│ Day 90:    Kept (monthly milestone)            │
│ Days 86-95: Kept (last 10 days)                │
│                                                 │
│ Days 11-29, 31-41, 43-56, 58-59, 61-72,       │
│      74-85: DELETED (summarized away)          │
└────────────────────────────────────────────────┘
```

## Components

### 1. CanonEventDetector
**Location:** `packages/core/src/systems/CanonEventDetector.ts`

Detects and records significant moments worthy of permanent checkpoints.

**Canon Event Types:**
- `death` - Agent deaths
- `birth` - Agent births
- `marriage` - Agent marriages
- `first_achievement` - First of something (building, harvest, etc.)
- `record_high` - Peak moments (population records)
- `catastrophe` - Major disasters
- `deity_emergence` - Gods emerging
- `major_discovery` - Research completed
- `war_event` - Conflicts
- `cultural_milestone` - Governance, social achievements

**API:**
```typescript
// Record a canon event
canonEventDetector.recordDeath(
  agentId: string,
  agentName: string,
  cause: string,
  day: number,
  tick: number
);

// Get all canon events
const events = canonEventDetector.getCanonEvents();

// Check if a day has canon events
const hasEvent = canonEventDetector.hasCanonEvent(42);

// Get events for specific day
const dayEvents = canonEventDetector.getEventsForDay(42);
```

**Usage in Systems:**
```typescript
// Example: In a system where agents die
if (agent.health <= 0) {
  // ... handle death ...

  // Record as canon event
  canonEventDetector.recordDeath(
    agent.id,
    agent.name,
    'starvation',
    world.time.day,
    world.tick
  );
}
```

### 2. CheckpointRetentionPolicy
**Location:** `packages/core/src/systems/CheckpointRetentionPolicy.ts`

Defines rules for which checkpoints to keep and which to delete.

**Retention Rules (Priority Order):**
1. **Priority 100:** Canon events (always keep)
2. **Priority 90:** Recent 10 days (rolling window)
3. **Priority 80:** First 10 days (permanent)
4. **Priority 70:** Monthly milestones (30, 60, 90, etc.)
5. **Priority 60:** Yearly milestones (365, 730, etc.)

**API:**
```typescript
// Filter checkpoints based on retention policy
const kept = checkpointRetentionPolicy.filterCheckpoints(
  allCheckpoints,
  currentDay,
  canonEvents
);

// Get checkpoints to delete
const toDelete = checkpointRetentionPolicy.getCheckpointsToDelete(
  allCheckpoints,
  currentDay,
  canonEvents
);

// Add custom retention rule
checkpointRetentionPolicy.addRule({
  name: 'custom_rule',
  priority: 55,
  shouldKeep: (checkpoint, currentDay, canonEvents) => {
    // Custom logic
    return checkpoint.day % 100 === 0;
  },
});
```

**Analyze Retention:**
```typescript
import { analyzeRetention } from './CheckpointRetentionPolicy.js';

const analysis = analyzeRetention(checkpoints, currentDay, canonEvents);
console.log(`Total: ${analysis.total}`);
console.log(`Kept: ${analysis.kept}`);
console.log(`Deleted: ${analysis.deleted}`);
console.log(`Savings: ${analysis.estimatedSavings}`);
console.log('Kept by rule:', analysis.keptByRule);
```

### 3. AutoSaveSystem (Updated)
**Location:** `packages/core/src/systems/AutoSaveSystem.ts`

Enhanced with canon event detection and smart retention pruning.

**Changes:**
- Attaches `CanonEventDetector` on first update
- Creates checkpoint every midnight (day change)
- Prunes old checkpoints at end of each month (day % 30 === 0)
- Uses `CheckpointRetentionPolicy` instead of simple 5-checkpoint limit

**Pruning Flow:**
```typescript
// At end of month (day 30, 60, 90, etc.)
1. Get all canon events from detector
2. Apply retention policy to get checkpoints to delete
3. Delete checkpoint save files from disk
4. Remove from in-memory checkpoint list
5. Log retention statistics
```

## Integration

### 1. AutoSaveSystem is Already Registered
No changes needed - system is already exported and ready to use.

### 2. Recording Canon Events in Systems

Systems should call `canonEventDetector.recordDeath()` and other methods when canon events occur:

```typescript
// Example: In AgentBrainSystem or NeedsSystem
if (agent.health <= 0) {
  canonEventDetector.recordDeath(
    agent.id,
    agent.name,
    deathCause,
    world.time.day,
    world.tick
  );
}

// Example: In BuildingSystem
if (building.isCompleted && building.isFirstOfType) {
  canonEventDetector.recordFirstAchievement(
    'building',
    building.type,
    building.id,
    world.time.day,
    world.tick
  );
}
```

### 3. Timeline Panel Integration

The `TimelinePanel` can show canon events as special markers:

```typescript
timelinePanel.setTimelines(
  checkpoints,
  portalConnections,
  canonEvents  // Add this parameter
);

// In timeline rendering, highlight checkpoints with canon events
const hasCanonEvent = canonEventDetector.hasCanonEvent(checkpoint.day);
if (hasCanonEvent) {
  // Render with special icon/color
  const events = canonEventDetector.getEventsForDay(checkpoint.day);
  // Show tooltip with event descriptions
}
```

## Storage Savings

With a 365-day game (1 year):
- **Without retention:** 365 checkpoints × ~1MB = ~365MB
- **With retention:**
  - First 10 days: 10 checkpoints
  - Last 10 days: 10 checkpoints
  - Monthly milestones: 12 checkpoints
  - Canon events: ~20-50 checkpoints (varies)
  - **Total: ~42-82 checkpoints = ~42-82MB**
  - **Savings: ~78-88% reduction**

## Pruning Schedule

```
Day 1-10:   No pruning (first 10 days)
Day 11-29:  No pruning (< 30 days old)
Day 30:     Prune days 11-19 (keep 1-10, 20-30)
Day 60:     Prune days 31-49 (keep 1-10, 30, 50-60, +canon)
Day 90:     Prune days 61-79 (keep 1-10, 30, 60, 80-90, +canon)
Day 120:    Prune days 91-109 (keep 1-10, 30, 60, 90, 110-120, +canon)
...
```

## Future Enhancements

### 1. LLM-Generated Canon Event Names
Use LLM to generate poetic names for canon events:
- "The Day Alice Fell" (death)
- "The Golden Harvest" (first harvest)
- "The Forging of Bonds" (first marriage)

### 2. Player-Marked Canon Events
Allow player to manually mark moments as canon:
- Right-click checkpoint → "Mark as Important"
- These never get pruned

### 3. Automatic Canon Detection
Enhance detector to automatically identify:
- Population spikes/crashes
- First usage of new technology
- Weather catastrophes
- War declarations
- Trading milestones

### 4. Canon Event Categories
Group canon events by category for better organization:
- Life Events (births, deaths, marriages)
- Achievements (firsts, records)
- Disasters (catastrophes, invasions)
- Cultural (governance, religion, art)

### 5. Retention Policy Profiles
Multiple retention profiles for different playstyles:
- **Minimal:** Last 5 days + canon events only
- **Standard:** Last 10 days + monthly + canon (current)
- **Archival:** Last 30 days + weekly + monthly + canon

## Testing

### Test Retention Policy
```typescript
// Create test checkpoints
const checkpoints: Checkpoint[] = [];
for (let day = 1; day <= 100; day++) {
  checkpoints.push({
    key: `checkpoint_day${day}`,
    name: `Day ${day}`,
    day,
    tick: day * 1000,
    timestamp: Date.now(),
    universeId: 'test',
    magicLawsHash: 'base',
  });
}

// Add some canon events
const canonEvents: CanonEvent[] = [
  {
    day: 5,
    tick: 5000,
    type: 'first_achievement',
    title: 'First Harvest',
    description: 'The village harvested its first wheat',
    entities: ['plant1'],
    importance: 9,
  },
  {
    day: 42,
    tick: 42000,
    type: 'death',
    title: "Alice's Death",
    description: 'Alice died from starvation',
    entities: ['alice'],
    importance: 7,
  },
];

// Apply retention policy
const kept = checkpointRetentionPolicy.filterCheckpoints(
  checkpoints,
  100,
  canonEvents
);

console.log(`Kept ${kept.length} of ${checkpoints.length} checkpoints`);
// Expected: ~20-30 checkpoints
// - Days 1-10 (10)
// - Days 91-100 (10)
// - Days 30, 60, 90 (3)
// - Days 5, 42 (2 - canon events)
// = 25 checkpoints
```

### Test Canon Event Detection
```typescript
canonEventDetector.clear();

// Record some events
canonEventDetector.recordDeath('alice', 'Alice', 'starvation', 42, 42000);

// Check detection
assert(canonEventDetector.hasCanonEvent(42) === true);
assert(canonEventDetector.hasCanonEvent(43) === false);

const events = canonEventDetector.getEventsForDay(42);
assert(events.length === 1);
assert(events[0].title === "Alice's Death");
```

## Console Output

When retention policy is applied:
```
[AutoSave] Checkpoint created: Day 30 (checkpoint_day30_1234567890)
[AutoSave] Pruning 10 old checkpoints (keeping 20)
[AutoSave] Deleted checkpoint: Day 11 (day 11)
[AutoSave] Deleted checkpoint: Day 12 (day 12)
...
[AutoSave] Deleted checkpoint: Day 20 (day 20)
[AutoSave] Retention policy applied: 20 checkpoints remaining
```

When canon events are detected:
```
[CanonEvent] Death recorded: Alice (day 42)
[CanonEvent] First achievement: First Harvest (day 5)
```

## Architecture Summary

```
┌─────────────────────────────────────────────────┐
│ AutoSaveSystem                                   │
│  ├─ Attaches CanonEventDetector                 │
│  ├─ Creates checkpoint every midnight            │
│  ├─ Prunes at end of each month                 │
│  └─ Uses CheckpointRetentionPolicy               │
└─────────────────────────────────────────────────┘
           │                          │
           ├──> CanonEventDetector    │
           │     (tracks important    │
           │      moments)             │
           │                          │
           └──> CheckpointRetentionPolicy
                (decides what to keep)

┌─────────────────────────────────────────────────┐
│ Other Systems (AgentBrain, Building, etc.)      │
│  ├─ Detect important events                     │
│  └─ Call canonEventDetector.recordXXX()         │
└─────────────────────────────────────────────────┘
           │
           └──> CanonEventDetector
                (stores events for retention)
```

## Complete!

All components implemented and ready for use:
- ✓ CanonEventDetector
- ✓ CheckpointRetentionPolicy
- ✓ AutoSaveSystem (updated)
- ✓ Exported from systems/index.ts
- ✓ Compiles successfully

Next steps:
1. Integrate canon event recording in game systems
2. Add canon event markers to TimelinePanel UI
3. Test retention policy with real gameplay
4. Monitor storage savings
