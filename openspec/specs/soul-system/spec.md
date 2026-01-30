# Soul System Specification

> The soul is the eternal thread that passes through mortal lives, accumulating wisdom across incarnations and universes.

## Purpose

The Soul System manages the eternal aspect of agents, preserving their identity, wisdom, and narrative arcs across lifetimes and timeline forks.

## Overview

The Soul System manages the eternal aspect of agents - their identity that persists beyond individual lives and even across timeline forks. While an agent's body is temporary and their memories fade, the soul carries forward the lessons learned, the wisdom accumulated, and the plots that span lifetimes.

### Core Concepts

1. **Soul Entity**: A separate entity from the agent, linked via `SoulLinkComponent`
2. **Silver Thread**: The append-only timeline of a soul's journey across all universes
3. **The Three Fates**: Divine beings who create souls and assign their destiny
4. **Wisdom**: Accumulated insight from lessons learned across incarnations
5. **Plot Lines**: Narrative arcs assigned by the Fates, tracked on the soul

---

## The Soul Entity

Souls are separate entities from agents. An agent has a body and working memory; a soul has eternal identity and accumulated wisdom.

### Soul Components

```typescript
interface SoulIdentityComponent {
  type: 'soul_identity';

  // Core identity (never changes)
  true_name: string;           // Discovered through Fate ceremony
  created_at: number;          // Multiverse absolute tick
  created_by: 'fates' | 'divine_intervention' | 'spontaneous';

  // From the Fates
  purpose: string;             // Weaver's declaration
  core_interests: string[];    // Spinner's gifts
  destiny?: string;            // Cutter's prophecy
  archetype: string;           // wanderer, protector, creator, etc.
  cosmic_alignment: number;    // -1 to 1

  // Cumulative across lives
  incarnation_count: number;
  total_personal_ticks: number;
  wisdom_level: number;        // 0-100+
  lessons_learned: LessonRecord[];
}

interface SilverThreadComponent {
  type: 'silver_thread';

  // The thread itself - append-only
  events: SignificantEvent[];

  // Current segment tracking
  current_segment: ThreadSegment;

  // Cumulative counters
  universes_visited: number;
  plots_completed: number;
  plots_failed: number;
}

interface PlotLinesComponent {
  type: 'plot_lines';

  // Active plots
  active: PlotLineInstance[];

  // Completed plots (for reference)
  completed: CompletedPlot[];

  // Failed/abandoned plots
  abandoned: AbandonedPlot[];
}

interface SoulLinkComponent {
  type: 'soul_link';

  // On the AGENT, pointing to soul
  soul_id: string;
  link_formed_at: number;      // Personal tick
  is_primary_incarnation: boolean;
  soul_influence_strength: number;  // 0-1, how much soul affects decisions
}
```

---

## The Silver Thread

The Silver Thread is the soul's **append-only personal timeline**. Like Bill Murray in Groundhog Day, the soul remembers every experience even when the universe "resets" via save/load.

### Thread Structure

```typescript
interface SilverThread {
  soul_id: string;

  // Sparse list of SIGNIFICANT events only
  events: SignificantEvent[];

  // Current segment (which universe, when entered)
  current_segment: ThreadSegment;

  // Totals
  totals: {
    personal_ticks_experienced: number;
    universes_visited: number;
    incarnations: number;
    lessons_learned: number;
    plots_completed: number;
  };
}

interface ThreadSegment {
  universe_id: string;
  universe_tick_start: number;
  universe_tick_end: number | null;  // null if current
  personal_tick_start: number;
  personal_tick_end: number | null;
  entered_via: string | null;        // Snapshot ID if from load
  exited_via: string | null;         // Snapshot ID if left via load
}

interface SignificantEvent {
  personal_tick: number;
  universe_id: string;
  universe_tick: number;
  type: SignificantEventType;
  details: Record<string, any>;
}
```

### What Goes on the Thread

The Silver Thread is **curated**, not a transaction log. Only significant events are recorded:

**RECORD:**
- Birth / Death / Reincarnation
- Plot stage transitions
- Lessons learned / Wisdom gained
- Universe transitions (fork, load, arrive)
- Snapshot waypoints (saves containing this soul)
- Major life milestones (marriage, parenthood, leadership)
- Meaningful choices (betrayal, sacrifice, forgiveness)
- First-time significant events (first love, first kill, first loss)

**DO NOT RECORD:**
- Hunger / Thirst / Fatigue
- Routine actions (crafting, walking, eating)
- Idle behaviors
- Every tick of existence

### Thread Immutability

The Silver Thread is **append-only**. When a universe forks via save/load:

1. The soul's current segment is closed (exited_via = snapshot_id)
2. A new segment is opened in the new universe
3. Personal tick continues incrementing (never resets)
4. The soul remembers everything from before the fork

```
Universe A:  tick 0 ──────────────────────────────▶ tick 3000
                              │
                              │ SAVE at tick 1000
                              │
                              └── USER LOADS ──────────┐
                                                       │
Universe B:                              tick 1000 ◀───┘
                                              │
Soul's personal timeline:  0 ─────── 3000 ─── 3001 ──▶
                           ↑           ↑       ↑
                       Universe A  Universe A  Universe B
                                   (continues) (fork)
```

---

## The Three Fates

The Three Fates are divine entities that create souls and assign their destiny. They exist outside of time and can see all branches of a soul's journey.

### The Fates

| Fate | Role | Symbol | What They Determine |
|------|------|--------|---------------------|
| **The Weaver** | Purpose | `🧵` | What the soul should accomplish |
| **The Spinner** | Nature | `🌀` | Interests, inclinations, temperament |
| **The Cutter** | Destiny | `✂️` | How the story might end, plot assignments |

### Soul Creation Ceremony

When a soul is created, the Fates hold an LLM-powered conversation:

1. **Context Examination**: Parents, culture, cosmic conditions, world events
2. **Weaver Proposes Purpose**: What role this soul should play
3. **Spinner Suggests Nature**: What passions and interests to spin in
4. **Cutter Pronounces Destiny**: Cryptic prophecy of possible endings
5. **Debate (if disagreement)**: Fates may argue about edge cases
6. **Finalization**: Soul is created with ceremony transcript preserved

### Fate-Assigned Plots

The Cutter doesn't just speak cryptically - they assign **plot line templates** to the soul:

```typescript
interface FateAssignment {
  // The Weaver assigns the life arc (if any)
  weaver_arc?: {
    template: string;       // e.g., 'finding_purpose', 'the_builder'
    parameters: Record<string, any>;
  };

  // The Spinner seeds interests that generate plots
  spinner_seeds: string[];  // e.g., ['craft_curiosity', 'social_warmth']

  // The Cutter may assign epic destiny (rare)
  cutter_destiny?: {
    template: string;       // e.g., 'ascension_archetype'
    variant?: string;       // e.g., 'enochian', 'fae', 'exaltation'
  };
}
```

---

## Wisdom Accumulation

Wisdom is the permanent currency of soul growth. It represents lessons truly learned, not just experienced.

### Wisdom Mechanics

```typescript
interface WisdomSystem {
  // Wisdom domains
  domains: {
    relationships: number;    // Love, trust, forgiveness
    systems: number;          // How the world works
    self: number;             // Self-knowledge
    transcendence: number;    // What lies beyond
    power: number;            // How to wield influence
    mortality: number;        // How to die well
  };

  // Total wisdom (sum of domains)
  total: number;

  // Lessons learned (permanent record)
  lessons: LessonRecord[];
}

interface LessonRecord {
  lesson_id: string;
  learned_at_personal_tick: number;
  universe_id: string;
  incarnation: number;
  wisdom_gained: number;
  domain: WisdomDomain;
  insight: string;           // The actual lesson text
  plot_source?: string;      // Which plot taught this
}
```

### Wisdom Thresholds

| Wisdom Level | Capability |
|-------------|------------|
| 0-10 | Normal mortal awareness |
| 10-25 | Occasional deja vu, gut feelings |
| 25-50 | Dream echoes from past lives |
| 50-75 | Faint awareness of the Fates' design |
| 75-100 | Can sense plot lines affecting others |
| 100+ | Path to godhood opens |

### Wisdom Transfer Across Incarnations

When a soul reincarnates:

1. **Wisdom is permanent** - carries forward fully
2. **Memories compress** - become dreams, intuitions, talents
3. **Skills partially transfer** - based on reincarnation policy
4. **Plot lines continue** - unless completed or failed

---

## Reincarnation

Souls cycle through multiple incarnations, each providing opportunities to learn lessons and progress through plots.

### Reincarnation Flow

```
Agent DIES
    │
    ▼
Soul PERSISTS (exits body)
    │
    ▼
Emergency consolidation (final memory → silver thread)
    │
    ▼
Soul enters INTERSTITIAL state
    │ (may visit afterlife realms based on deity policies)
    │
    ▼
Soul QUEUED for reincarnation
    │ (based on AfterlifePolicy: delay, species constraints, etc.)
    │
    ▼
New agent BORN with soul link
    │
    ▼
Soul influence manifests as:
    - Innate talents (from past skills)
    - Unexplained fears/attractions (past trauma/loves)
    - Dream echoes (past memories)
    - Plot continuity (active plots resume)
```

### Reincarnation Configuration

```typescript
interface ReincarnationPolicy {
  // Timing
  min_delay: number;          // Minimum ticks before reincarnation
  max_delay: number;          // Maximum ticks

  // Species constraints
  species_constraint: 'same' | 'similar' | 'any' | 'karmic';

  // Memory transfer
  memory_retention: 'full' | 'fragments' | 'dreams' | 'talents' | 'none';

  // Skill transfer
  skill_retention: number;    // 0-1 multiplier

  // Location
  reincarnation_target: 'same_world' | 'same_universe' | 'any_universe' | 'specific';

  // Who controls this
  controlled_by: 'deity' | 'karma' | 'random' | 'player';
}
```

---

## Integration Points

### With Dream System

The soul connects to the agent through dreams:

1. **Soul Consolidation** runs after memory consolidation during sleep
2. Significant events are extracted and written to silver thread
3. Soul can queue dream hints for the dream generator
4. High-wisdom souls may receive cross-incarnation echoes

### With Plot System

Plots are stored on the soul, not the agent:

1. Fates assign initial plots at soul creation
2. PlotAssignmentSystem adds dynamic plots during life
3. Plot progress is indexed by personal tick (not universe tick)
4. Plots persist across incarnations

### With Narrative Pressure System

Plots create narrative attractors:

1. Active plot stages generate outcome attractors
2. Attractors bias simulation toward plot progression
3. Multiple plots can have conflicting attractors
4. Completed plots remove their attractors

### With Multiverse System

Souls track across timeline forks:

1. Every snapshot records soul thread positions
2. Loading a snapshot = soul enters new universe (new segment)
3. Personal tick never resets, only increments
4. The Fates can see all branches of a soul

---

## Implementation Phases

### Phase 1: Core Soul Infrastructure
- SoulIdentityComponent and SilverThreadComponent
- SoulLinkComponent for agent-soul binding
- Basic soul creation (without full Fate ceremony)
- Soul persistence across agent death

### Phase 2: Silver Thread Mechanics
- Append-only event logging
- Thread segment management for universe transitions
- Snapshot waypoint integration
- Soul tracing across saves/loads

### Phase 3: Three Fates Integration
- LLM-powered soul creation ceremony (exists, needs integration)
- Fate-assigned plot line bindings
- Destiny → plot template mapping

### Phase 4: Wisdom System
- Wisdom accumulation from completed lessons
- Wisdom thresholds and capabilities
- Cross-incarnation wisdom effects
- Path to godhood unlocking

### Phase 5: Reincarnation Improvements
- Full reincarnation policy system
- Memory/skill transfer mechanics
- Afterlife realm integration
- Plot continuity across incarnations

---

## Related Specifications

- [Plot Lines System](./plot-lines-spec.md) - How plots work on souls
- [Dream System](../agent-system/dream-system-spec.md) - Soul-dream integration
- [Multiverse Soul Tracking](../universe-system/multiverse-soul-tracking-spec.md) - Souls across timeline forks
- [Narrative Pressure System](../divinity-system/narrative-pressure-system.md) - How plots create attractors
- [Reincarnation System](../divinity-system/mythological-realms.md) - Afterlife and rebirth
