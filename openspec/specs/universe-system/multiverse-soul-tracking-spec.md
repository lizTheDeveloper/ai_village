# Multiverse Soul Tracking Specification

> The soul's thread is silver and unbreakable. It passes through universes like a needle through fabric, never cutting, always continuing.

## Overview

This specification defines how souls track across universe forks (save/load operations). The key insight: **time travel creates new universes, it doesn't rewind the old one**. The soul's personal timeline (the Silver Thread) is append-only and continues across all universe transitions.

### Core Principles

1. **Append-Only**: The silver thread never gets shorter. Every experience is permanent.
2. **Universe-Crossing**: The thread continues across universe forks.
3. **Personal Time**: Souls have personal time (subjective) separate from universe time (objective).
4. **Traceable**: Given a soul, we can reconstruct their entire journey across all universes.
5. **The Fates See All**: Higher beings can read complete silver threads across all branches.

---

## Three Types of Time

The system distinguishes three temporal concepts:

### 1. Personal Time (Subjective)

The soul's continuous experience stream. Like Bill Murray in Groundhog Day - he remembers every loop even when the world "resets."

```typescript
interface PersonalTime {
  // Total ticks experienced (never decreases)
  personal_tick: number;

  // Current incarnation's start (personal tick when born)
  incarnation_start: number;

  // Ticks in current incarnation
  incarnation_ticks: number;
}
```

### 2. Universe Time (Objective Per-Universe)

The tick count within a specific universe. Resets to snapshot point on load.

```typescript
interface UniverseTime {
  universe_id: string;
  current_tick: number;
  creation_tick: number;      // When this universe was forked
  parent_universe?: string;   // Universe this was forked from
  fork_point?: number;        // Parent's tick when forked
}
```

### 3. Multiverse Time (Absolute)

Monotonic time across the entire multiverse. Never resets.

```typescript
interface MultiverseTime {
  absolute_tick: number;      // Always incrementing
  active_universes: number;
  total_forks: number;
}
```

---

## Universe Fork Mechanics

### What Happens on Save/Load

```
     Universe A (original)
           │
           │ tick 1000
           │
           ├─────────────────────────────────────────▶ CONTINUES FOREVER
           │                                           (orphaned but preserved)
           │
           │ ◀── SAVE POINT (snapshot_alpha)
           │
           │ tick 2000
           │
           │ tick 3000 ◀── USER LOADS snapshot_alpha
           │
           └──────────┐
                      │
                      ▼
              Universe B (fork)
                      │
                      │ tick 1000 (divergence point)
                      │
                      │ Soul arrives HERE
                      │ with personal_tick = 3001
                      │ (remembers ticks 1000-3000 from Universe A)
                      │
                      ▼
                   continues...
```

**Key points:**
- Universe A continues without the player (becomes orphaned)
- Universe B is a NEW universe forked from snapshot
- The soul carries their personal timeline forward
- Personal tick increments (3000 → 3001), never resets

### Fork Operation

```typescript
interface UniverseFork {
  // Fork metadata
  fork_id: string;
  created_at_absolute: number;

  // Parent info
  parent_universe_id: string;
  parent_tick_at_fork: number;
  snapshot_id: string;

  // New universe
  child_universe_id: string;

  // Souls that transitioned
  transitioned_souls: SoulTransition[];
}

interface SoulTransition {
  soul_id: string;

  // Where they were before fork
  from_universe: string;
  from_universe_tick: number;
  from_personal_tick: number;

  // Where they are after fork
  to_universe: string;
  to_universe_tick: number;
  to_personal_tick: number;  // = from_personal_tick + 1
}
```

---

## Silver Thread Structure

The Silver Thread is the soul's complete journey log:

```typescript
interface SilverThread {
  soul_id: string;

  // Thread segments (one per universe visited)
  segments: ThreadSegment[];

  // Significant events (sparse, curated)
  events: SignificantEvent[];

  // Current position (always at end)
  head: {
    segment_index: number;
    personal_tick: number;
    universe_id: string;
    universe_tick: number;
  };

  // Totals
  totals: {
    personal_ticks: number;
    universes_visited: number;
    incarnations: number;
    forks_experienced: number;
  };
}

interface ThreadSegment {
  // Segment ID (for reference)
  segment_id: string;

  // Universe info
  universe_id: string;
  universe_tick_start: number;
  universe_tick_end: number | null;  // null if current

  // Personal time range
  personal_tick_start: number;
  personal_tick_end: number | null;

  // How we entered this segment
  entered_via: SegmentEntry;

  // How we exited (if not current)
  exited_via?: SegmentExit;
}

type SegmentEntry =
  | { type: 'soul_created' }
  | { type: 'incarnated'; parent_souls?: string[] }
  | { type: 'universe_fork'; from_universe: string; snapshot_id: string }
  | { type: 'realm_transition'; from_realm: string };

type SegmentExit =
  | { type: 'died' }
  | { type: 'universe_fork'; to_universe: string; snapshot_id: string }
  | { type: 'realm_transition'; to_realm: string }
  | { type: 'soul_merged'; into_soul: string };
```

---

## Snapshot Integration

Every snapshot must record soul thread positions:

```typescript
interface Snapshot {
  id: string;
  universe_id: string;
  universe_tick: number;
  created_at_absolute: number;

  // Soul positions at snapshot time
  soul_positions: Map<string, SoulSnapshotPosition>;

  // Full world state
  world_state: SerializedWorld;

  // Metadata
  name?: string;
  description?: string;
  is_autosave: boolean;
  is_canon_event: boolean;
}

interface SoulSnapshotPosition {
  soul_id: string;
  personal_tick: number;
  segment_index: number;

  // Current state
  current_incarnation?: string;  // Agent ID if incarnated
  active_plots: string[];        // Plot instance IDs
  wisdom_level: number;

  // For validation
  checksum: string;
}
```

### Creating Snapshots

```typescript
function createSnapshot(world: World, options: SnapshotOptions): Snapshot {
  const snapshot: Snapshot = {
    id: generateId(),
    universe_id: world.universeId,
    universe_tick: world.currentTick,
    created_at_absolute: world.multiverse.absoluteTick,
    soul_positions: new Map(),
    world_state: serializeWorld(world),
    ...options
  };

  // Record position for every soul in this universe
  for (const soul of world.getAllSouls()) {
    const thread = soul.getComponent(CT.SilverThread);
    const identity = soul.getComponent(CT.SoulIdentity);
    const plots = soul.getComponent(CT.PlotLines);

    snapshot.soul_positions.set(soul.id, {
      soul_id: soul.id,
      personal_tick: thread.head.personal_tick,
      segment_index: thread.head.segment_index,
      current_incarnation: soul.getCurrentAgent()?.id,
      active_plots: plots.active.map(p => p.instance_id),
      wisdom_level: identity.wisdom_level,
      checksum: computeSoulChecksum(soul)
    });
  }

  // Record snapshot waypoint on each soul's thread
  for (const soul of world.getAllSouls()) {
    const thread = soul.getComponent(CT.SilverThread);
    thread.events.push({
      type: 'snapshot_waypoint',
      personal_tick: thread.head.personal_tick,
      universe_id: world.universeId,
      universe_tick: world.currentTick,
      details: { snapshot_id: snapshot.id }
    });
  }

  return snapshot;
}
```

### Loading Snapshots

```typescript
function loadSnapshot(snapshotId: string, currentWorld: World): World {
  const snapshot = getSnapshot(snapshotId);

  // Create new universe (fork)
  const newUniverse = forkUniverse(snapshot);

  // For each soul that exists in both current world and snapshot
  for (const [soulId, snapshotPosition] of snapshot.soul_positions) {
    const soul = currentWorld.getSoul(soulId);
    if (!soul) continue;  // Soul doesn't exist in current world

    const thread = soul.getComponent(CT.SilverThread);

    // Close current segment
    const currentSegment = thread.segments[thread.head.segment_index];
    currentSegment.universe_tick_end = currentWorld.currentTick;
    currentSegment.personal_tick_end = thread.head.personal_tick;
    currentSegment.exited_via = {
      type: 'universe_fork',
      to_universe: newUniverse.id,
      snapshot_id: snapshotId
    };

    // Open new segment in forked universe
    const newPersonalTick = thread.head.personal_tick + 1;
    thread.segments.push({
      segment_id: generateId(),
      universe_id: newUniverse.id,
      universe_tick_start: snapshot.universe_tick,
      universe_tick_end: null,
      personal_tick_start: newPersonalTick,
      personal_tick_end: null,
      entered_via: {
        type: 'universe_fork',
        from_universe: currentWorld.universeId,
        snapshot_id: snapshotId
      }
    });

    // Update head
    thread.head = {
      segment_index: thread.segments.length - 1,
      personal_tick: newPersonalTick,
      universe_id: newUniverse.id,
      universe_tick: snapshot.universe_tick
    };

    // Record fork event
    thread.events.push({
      type: 'universe_fork',
      personal_tick: newPersonalTick,
      universe_id: newUniverse.id,
      universe_tick: snapshot.universe_tick,
      details: {
        from_universe: currentWorld.universeId,
        from_personal_tick: newPersonalTick - 1,
        snapshot_id: snapshotId
      }
    });

    // Update totals
    thread.totals.personal_ticks = newPersonalTick;
    thread.totals.universes_visited++;
    thread.totals.forks_experienced++;

    // Transfer soul to new universe
    transferSoulToUniverse(soul, newUniverse);
  }

  return newUniverse;
}
```

---

## Plot Lines Across Forks

When a universe forks, plot state needs special handling:

```typescript
interface PlotForkBehavior {
  // Default: plot continues in new universe
  default: 'continue';

  // Options
  behavior:
    | 'continue'          // Plot continues from current stage
    | 'reset_stage'       // Reset to stage it was at snapshot time
    | 'reset_plot'        // Start plot over
    | 'suspend'           // Pause plot until conditions met
    | 'fork';             // Create parallel instance
}

function handlePlotOnFork(
  soul: Entity,
  plot: PlotLineInstance,
  snapshotPosition: SoulSnapshotPosition
): void {
  const template = getTemplate(plot.template_id);

  switch (template.fork_behavior || 'continue') {
    case 'continue':
      // Plot continues from current stage
      // Attractors will be recreated by PlotProgressionSystem
      break;

    case 'reset_stage':
      // Reset to stage at snapshot time
      const snapshotStage = getPlotStageAtSnapshot(plot, snapshotPosition);
      plot.current_stage = snapshotStage;
      plot.stage_entered_at = soul.personalTick;
      break;

    case 'reset_plot':
      // Start plot over
      plot.current_stage = template.entry_stage;
      plot.stage_entered_at = soul.personalTick;
      plot.stages_visited = [];
      break;

    case 'suspend':
      // Mark as suspended
      plot.status = 'suspended';
      plot.suspended_reason = 'universe_fork';
      break;
  }
}
```

---

## The Fates' Omniscience

The Fates exist outside time and can see all branches:

```typescript
interface FatesService {
  // Get all instances of a soul across all universes
  getAllSoulInstances(soulId: string): SoulInstance[];

  // Get complete silver thread (all segments, all universes)
  getCompleteSilverThread(soulId: string): SilverThread;

  // Find all snapshots containing a soul
  findSoulInSnapshots(soulId: string): Snapshot[];

  // Trace a soul's complete journey
  traceSoulJourney(soulId: string): SoulJourney;

  // Check if lesson learned anywhere on thread
  hasLearnedLesson(soulId: string, lessonId: string): boolean;

  // Get all branches of a plot
  getPlotBranches(soulId: string, plotId: string): PlotBranch[];
}

interface SoulJourney {
  soul_id: string;
  total_personal_ticks: number;

  // Timeline visualization
  segments: Array<{
    universe_id: string;
    personal_tick_range: [number, number];
    key_events: SignificantEvent[];
    plots_active: string[];
    incarnation?: string;
  }>;

  // Forks (branch points)
  forks: Array<{
    at_personal_tick: number;
    from_universe: string;
    to_universe: string;
    snapshot_id: string;
  }>;

  // Lessons learned (with where)
  lessons: Array<{
    lesson_id: string;
    learned_at_personal_tick: number;
    universe_id: string;
  }>;
}
```

---

## Cross-Branch Wisdom Bleed

High-wisdom souls may have intuitions from alternate timeline selves:

```typescript
interface CrossBranchWisdom {
  type: 'deja_vu' | 'prophetic_dream' | 'inexplicable_knowing' | 'gut_feeling';

  // Source
  source_universe: string;
  source_personal_tick: number;
  source_event: SignificantEvent;

  // How it manifests
  bleed_strength: number;     // 0-1
  manifestation: WisdomManifestation;
}

type WisdomManifestation =
  | { type: 'vague_unease'; description: string }
  | { type: 'strong_intuition'; about: string }
  | { type: 'prophetic_vision'; content: string }
  | { type: 'full_memory'; memory: string };

function checkForWisdomBleed(soul: Entity): CrossBranchWisdom | null {
  const wisdom = soul.getComponent(CT.SoulIdentity).wisdom_level;

  // Only high-wisdom souls get bleed
  if (wisdom < 50) return null;

  // Check if there are parallel instances with relevant events
  const fates = getFatesService();
  const allInstances = fates.getAllSoulInstances(soul.id);

  if (allInstances.length <= 1) return null;

  // Look for recent significant events in other branches
  for (const instance of allInstances) {
    if (instance.universe_id === soul.currentUniverse) continue;

    const recentEvents = instance.thread.events
      .filter(e => e.personal_tick > soul.personalTick - 10000)
      .filter(e => e.type === 'lesson_learned' || e.type === 'meaningful_choice');

    if (recentEvents.length > 0) {
      // Probability based on wisdom
      const bleedChance = (wisdom - 50) / 100;
      if (Math.random() < bleedChance) {
        return createWisdomBleed(recentEvents[0], wisdom);
      }
    }
  }

  return null;
}
```

---

## Orphaned Universes

When a player loads an old save, the universe they left becomes "orphaned":

```typescript
interface OrphanedUniverse {
  universe_id: string;
  orphaned_at_absolute: number;
  reason: 'player_left' | 'simulation_ended' | 'corrupted';

  // What happens to it
  policy: OrphanPolicy;
}

type OrphanPolicy =
  | 'continue_simulation'    // Keep running (expensive)
  | 'pause'                  // Freeze state
  | 'time_dilation'          // Run at reduced speed
  | 'eventual_archive';      // Archive after N ticks

// Conservation of Game Matter: orphaned universes are NEVER deleted
// They can be revisited, archived, or become "forgotten realms"
```

---

## Implementation Phases

### Phase 1: Thread Segment Tracking
- Add ThreadSegment to SilverThread
- Track universe transitions
- Increment personal tick on fork

### Phase 2: Snapshot Soul Positions
- Record soul positions in snapshots
- Validate soul checksums on load
- Handle missing souls

### Phase 3: Fork Mechanics
- Close segments on fork
- Open new segments
- Transfer souls to new universe

### Phase 4: Plot Fork Handling
- Implement fork behaviors per template
- Handle attractor cleanup/recreation
- Preserve plot history

### Phase 5: Fates Service
- Implement cross-universe soul queries
- Soul journey tracing
- Lesson lookup across branches

### Phase 6: Wisdom Bleed
- Detect parallel instances
- Calculate bleed probability
- Generate manifestations

---

## Configuration

```typescript
interface MultiverseSoulConfig {
  // Fork behavior
  increment_personal_tick_on_fork: true;
  preserve_plot_progress_on_fork: true;

  // Orphan handling
  default_orphan_policy: OrphanPolicy;
  orphan_archive_delay: number;

  // Wisdom bleed
  min_wisdom_for_bleed: number;         // Default: 50
  max_bleed_probability: number;        // Default: 0.5
  bleed_range_personal_ticks: number;   // Default: 10000

  // Validation
  validate_soul_checksums: boolean;
  fail_on_checksum_mismatch: boolean;
}
```

---

## Related Specifications

- [Soul System](../soul-system/spec.md) - Silver thread and soul identity
- [Plot Lines](../soul-system/plot-lines-spec.md) - Plot tracking across forks
- [Universe System](./spec.md) - Universe management
- [Timeline Manager](./spec.md#timeline-manager) - Snapshot management
- [Dream System](../agent-system/dream-system-spec.md) - Cross-incarnation echoes
