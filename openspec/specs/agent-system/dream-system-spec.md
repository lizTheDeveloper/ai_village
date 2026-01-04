# Dream System Specification

> Dreams are the gateway between the mortal mind and the eternal soul. In sleep, memories consolidate, wisdom integrates, and the Fates whisper their designs.

## Overview

The Dream System manages sleep cycles, dream generation, memory consolidation, and the critical connection between agents and their souls. Dreams serve multiple purposes:

1. **Memory Consolidation**: Compress and organize daily experiences
2. **Soul Communication**: Transfer significant events to the silver thread
3. **Plot Awareness**: Receive hints about active plot lines
4. **Divine Contact**: Gods can send visions (cheapest delivery method)
5. **Cross-Incarnation Echoes**: High-wisdom souls glimpse past lives

### Current Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| SleepSystem | Implemented | `systems/SleepSystem.ts` |
| MemoryConsolidationSystem | Implemented | `systems/MemoryConsolidationSystem.ts` |
| CircadianComponent | Implemented | `components/CircadianComponent.ts` |
| DreamSkillTree | Defined | `magic/skillTrees/DreamSkillTree.ts` |
| VisionDeliverySystem | Implemented | `divinity/VisionDeliverySystem.ts` |
| **SoulConsolidationSystem** | **NOT IMPLEMENTED** | **NEW** |

---

## Sleep Cycle Architecture

### Sleep Drive

Sleep drive accumulates on a 0-100 scale:

```typescript
interface SleepDrive {
  // Accumulation
  awake_base_rate: 5.5;       // Per hour while awake
  awake_night_rate: 6.6;      // Per hour at night (6pm-5am)
  low_energy_modifier: 1.5;   // Multiplier when energy < 30%

  // Depletion
  sleeping_rate: -17;         // Per hour while sleeping (~6 hours to deplete)

  // Thresholds
  sleepy_threshold: 60;       // Agent seeks sleep
  collapse_threshold: 95;     // Forced unconsciousness
}
```

### Wake Conditions

Agent wakes when ANY of:
- Minimum 4 hours slept AND energy = 100%
- Energy >= 70% AND sleep drive < 10
- Critical hunger (< 10%)
- Maximum 12 hours reached

### Sleep Quality

Sleep quality affects energy recovery:

| Condition | Quality | Recovery Rate |
|-----------|---------|---------------|
| Ground | 0.5 | Base |
| Bedroll | 0.7 | 1.4x |
| Building (no bed) | 0.6 | 1.2x |
| Bed | 0.9 | 1.8x |
| Bed + High Harmony | 1.0 | 2.0x |

---

## Dream Generation

### Current Implementation

Dreams trigger after 2+ hours of sleep (REM phase):

```typescript
interface DreamContent {
  memoryElements: string[];    // 2-4 recent/emotional memory snippets
  weirdElement: string;        // Random surreal element (from 46 options)
  dreamNarrative: string;      // Composed narrative
  interpretation: string;      // Agent's interpretation on waking
}
```

### Enhanced Dream Types (New)

```typescript
interface EnhancedDreamContent extends DreamContent {
  type: DreamType;

  // Soul influence
  soul_event?: SignificantEvent;    // If soul contributed
  plot_hint?: PlotHint;             // If plot-influenced

  // Divine influence
  divine_vision?: DivineVision;     // If god sent vision

  // Cross-incarnation
  past_life_echo?: PastLifeEcho;    // If high-wisdom soul

  // Emotional tone
  tone: DreamTone;
}

type DreamType =
  | 'mundane'           // Normal memory-based dream
  | 'processing'        // Soul processing significant event
  | 'prophetic'         // Plot-driven hint of future
  | 'divine'            // God-sent vision
  | 'ancestral'         // Past life echo
  | 'nightmare'         // Fear/trauma processing
  | 'lucid';            // Dreamer has control

type DreamTone =
  | 'peaceful'
  | 'troubled'
  | 'joyful'
  | 'ominous'
  | 'nostalgic'
  | 'frightening'
  | 'transcendent';
```

---

## Memory Consolidation

### Current Implementation

MemoryConsolidationSystem runs on `agent:sleep_start`:

1. **Consolidation**: Mark important memories (importance > 0.5, recalled > 3 times, emotional > 0.8)
2. **Summarization**: Group repetitive memories ("Gathered wood x50" → summary)
3. **Decay**: Apply daily decay, remove forgotten memories

### Enhanced Flow (With Soul Integration)

```
agent:sleep_start
        │
        ▼
┌───────────────────────────────────────┐
│     MemoryConsolidationSystem         │
│     (Priority: 105)                   │
│                                       │
│  1. Mark important memories           │
│  2. Summarize repetitive memories     │
│  3. Apply decay                       │
│  4. Emit: memory:consolidated         │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│     SoulConsolidationSystem           │
│     (Priority: 106) - NEW             │
│                                       │
│  1. Get consolidated memories         │
│  2. Check for plot-relevant events    │
│  3. Detect lessons/milestones         │
│  4. Write to silver thread            │
│  5. Queue soul dream hints            │
│  6. Emit: soul:consolidated           │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│     SleepSystem.generateDream()       │
│     (on REM phase, ~2hrs sleep)       │
│                                       │
│  1. Pull memory elements (existing)   │
│  2. Check soul dream hints (new)      │
│  3. Check divine visions (existing)   │
│  4. Check past life echoes (new)      │
│  5. Generate dream narrative          │
│  6. Emit: agent:dreamed               │
└───────────────────────────────────────┘
```

---

## Soul Consolidation System (New)

This is the critical bridge between the agent's memories and the soul's silver thread.

### When It Runs

- After MemoryConsolidationSystem
- On `agent:sleep_start` event
- Also on agent death (emergency consolidation)

### What It Does

```typescript
class SoulConsolidationSystem implements System {
  priority = 106;  // After MemoryConsolidationSystem (105)

  constructor(eventBus: EventBus) {
    eventBus.on('agent:sleep_start', this.onSleepStart.bind(this));
    eventBus.on('agent:died', this.onAgentDied.bind(this));
  }

  async onSleepStart(event: { agentId: string }): Promise<void> {
    const agent = this.world.getEntity(event.agentId);
    const soulLink = agent.getComponent(CT.SoulLink);
    if (!soulLink) return;

    const soul = this.world.getEntity(soulLink.soulId);
    await this.consolidateToSoul(agent, soul);
  }

  async onAgentDied(event: { agentId: string }): Promise<void> {
    // Emergency consolidation before soul leaves body
    const agent = this.world.getEntity(event.agentId);
    const soulLink = agent.getComponent(CT.SoulLink);
    if (!soulLink) return;

    const soul = this.world.getEntity(soulLink.soulId);
    await this.consolidateToSoul(agent, soul);

    // Record death on silver thread
    soul.getComponent(CT.SilverThread).append({
      type: 'died',
      personal_tick: soul.personalTick,
      universe_id: this.world.universeId,
      universe_tick: this.world.currentTick,
      details: {
        cause: agent.getComponent(CT.DeathInfo)?.cause,
        location: agent.getComponent(CT.Position)
      }
    });
  }

  private async consolidateToSoul(agent: Entity, soul: Entity): Promise<void> {
    const memories = agent.getComponent(CT.EpisodicMemory);
    const plots = soul.getComponent(CT.PlotLines);
    const silverThread = soul.getComponent(CT.SilverThread);
    const circadian = agent.getComponent(CT.Circadian);

    // Get memories since last consolidation
    const recentMemories = memories.getConsolidatedSince(this.lastConsolidationTick);

    // Extract soul-significant events
    const soulEvents = await this.extractSoulEvents(recentMemories, plots, soul);

    // Write to silver thread
    for (const event of soulEvents) {
      silverThread.append(event);
    }

    // Queue dream hints for dream generation
    if (soulEvents.length > 0) {
      circadian.soulDreamHints = soulEvents;
    }

    // Update last consolidation tick
    this.lastConsolidationTick = this.world.currentTick;
  }

  private async extractSoulEvents(
    memories: Memory[],
    plots: PlotLinesComponent,
    soul: Entity
  ): Promise<SignificantEvent[]> {
    const events: SignificantEvent[] = [];

    // 1. Check for plot stage changes
    for (const plot of plots.active) {
      const stageChange = this.detectStageChange(memories, plot);
      if (stageChange) {
        events.push({
          type: 'plot_stage_changed',
          personal_tick: soul.personalTick,
          universe_id: this.world.universeId,
          universe_tick: this.world.currentTick,
          details: stageChange
        });
      }
    }

    // 2. Check for lessons learned
    const lessons = this.detectLessonsLearned(memories, soul);
    events.push(...lessons);

    // 3. Check for life milestones
    const milestones = this.detectMilestones(memories, soul);
    events.push(...milestones);

    // 4. Check for meaningful choices
    const choices = this.detectMeaningfulChoices(memories);
    events.push(...choices);

    // 5. Check for first-time significant events
    const firsts = this.detectSignificantFirsts(memories, soul);
    events.push(...firsts);

    return events;
  }
}
```

### Significance Detection

```typescript
interface SignificanceDetector {
  // Is this memory significant enough for the silver thread?
  isSignificant(memory: Memory, soul: Entity, plots: PlotLineInstance[]): boolean;
}

class DefaultSignificanceDetector implements SignificanceDetector {
  isSignificant(memory: Memory, soul: Entity, plots: PlotLineInstance[]): boolean {
    // Plot-relevant memories are always significant
    if (this.isPlotRelevant(memory, plots)) return true;

    // Life milestones are significant
    if (this.isMilestone(memory)) return true;

    // Meaningful choices are significant
    if (memory.involves_meaningful_choice) return true;

    // First-time notable events are significant
    if (this.isSignificantFirst(memory, soul)) return true;

    // High emotional intensity is significant
    if (memory.emotional_intensity > 0.9) return true;

    // Default: not significant enough
    return false;
  }

  private isPlotRelevant(memory: Memory, plots: PlotLineInstance[]): boolean {
    for (const plot of plots) {
      const stage = this.getPlotStage(plot);
      for (const transition of stage.transitions) {
        if (this.memoryRelatesToTransition(memory, transition)) {
          return true;
        }
      }
    }
    return false;
  }

  private isMilestone(memory: Memory): boolean {
    const milestoneTypes = [
      'marriage', 'childbirth', 'first_love', 'first_loss',
      'became_leader', 'mastered_skill', 'major_discovery',
      'first_kill', 'survived_death_threat'
    ];
    return milestoneTypes.includes(memory.event_type);
  }

  private isSignificantFirst(memory: Memory, soul: Entity): boolean {
    const notableFirsts = ['love', 'kill', 'death_witnessed', 'leadership', 'parenthood'];
    if (!memory.is_first_time) return false;
    return notableFirsts.includes(memory.first_time_category);
  }
}
```

---

## Soul-Influenced Dreams

When the soul has significant events, dreams reflect them:

```typescript
function generateSoulInfluencedDream(
  memories: string[],
  soulHints: SignificantEvent[]
): EnhancedDreamContent {
  const primaryHint = soulHints[0];

  switch (primaryHint.type) {
    case 'lesson_learned':
      return {
        type: 'processing',
        memoryElements: memories,
        weirdElement: null,  // Soul dreams are clear
        dreamNarrative: generateLessonDream(primaryHint),
        interpretation: 'This dream felt meaningful, like a truth revealed.',
        tone: 'transcendent',
        soul_event: primaryHint
      };

    case 'plot_stage_changed':
      return {
        type: 'prophetic',
        memoryElements: memories,
        weirdElement: null,
        dreamNarrative: generatePropheticDream(primaryHint),
        interpretation: 'Something is shifting. A new chapter begins.',
        tone: 'ominous',
        plot_hint: { plot_id: primaryHint.details.plot_id, next_stage: primaryHint.details.to_stage }
      };

    case 'first_love':
      return {
        type: 'processing',
        memoryElements: memories,
        weirdElement: null,
        dreamNarrative: generateLoveDream(primaryHint),
        interpretation: 'The heart knows what the mind cannot say.',
        tone: 'joyful',
        soul_event: primaryHint
      };

    case 'first_loss':
      return {
        type: 'processing',
        memoryElements: memories,
        weirdElement: null,
        dreamNarrative: generateGriefDream(primaryHint),
        interpretation: 'In dreams, we hold what we have lost.',
        tone: 'nostalgic',
        soul_event: primaryHint
      };

    default:
      return generateMundaneDream(memories);
  }
}
```

---

## Past Life Echoes

High-wisdom souls may dream of previous incarnations:

```typescript
interface PastLifeEcho {
  source_incarnation: number;
  source_universe: string;
  memory_fragment: string;
  emotional_resonance: number;
  clarity: 'vague' | 'symbolic' | 'vivid';
}

function maybeGeneratePastLifeEcho(soul: Entity): PastLifeEcho | null {
  // Only high-wisdom souls get echoes
  const wisdom = soul.getComponent(CT.SoulIdentity).wisdom_level;
  if (wisdom < 25) return null;

  // Probability scales with wisdom
  const echoProbability = (wisdom - 25) / 100;  // 0% at 25, 75% at 100
  if (Math.random() > echoProbability) return null;

  // Select a past life event from silver thread
  const silverThread = soul.getComponent(CT.SilverThread);
  const pastEvents = silverThread.events.filter(e =>
    e.personal_tick < soul.currentIncarnationStart
  );

  if (pastEvents.length === 0) return null;

  // Weight toward emotionally significant events
  const event = weightedSelect(pastEvents, e => e.emotional_intensity || 0.5);

  // Clarity depends on wisdom
  const clarity = wisdom > 75 ? 'vivid' : wisdom > 50 ? 'symbolic' : 'vague';

  return {
    source_incarnation: event.incarnation,
    source_universe: event.universe_id,
    memory_fragment: summarizeEventForDream(event),
    emotional_resonance: event.emotional_intensity || 0.5,
    clarity
  };
}
```

---

## Dream Magic Skill Tree

The existing DreamSkillTree defines 25+ abilities. Key nodes:

### Foundation
- **Dream Recall** (25 XP): Remember dreams on waking
- **Basic Lucidity** (50 XP): Realize you're dreaming
- **Reality Testing** (40 XP): In-dream reality checks

### Control
- **Dream Stability**: Prevent dream collapse
- **Dream Control**: Alter dream environment
- **Time Dilation**: Extend subjective dream time (1-2.5x)
- **Dream Architecture**: Build persistent dream locations

### Nightmare
- **Nightmare Resistance**: 15-50% resistance
- **Nightmare Confrontation**: Transform nightmares
- **Nightmare Walking**: Enter nightmare realm

### Shared Dreaming
- **Dream Sense**: Sense nearby sleepers
- **Dream Linking**: Connect to another dreamer
- **Collective Dreaming**: Group dreams (up to 4+)

### Oneiromancy
- **Prophetic Sensitivity**: Recognize prophetic dreams
- **Dream Interpretation**: Decode symbolism
- **Induced Prophecy**: Seek visions deliberately

### Ancestral
- **Memory Diving**: Explore memories in dreams
- **Ancestral Dreaming**: Contact the dead

### Advanced
- **WILD**: Enter dreams from waking state
- **Nested Dreaming**: Dreams within dreams

---

## Divine Vision Integration

Gods can send visions through dreams (cheapest method at 50 belief):

```typescript
interface DivineVision {
  deity_id: string;
  purpose: 'guidance' | 'warning' | 'prophecy' | 'command' | 'blessing' | 'revelation';
  clarity: 'obscure' | 'symbolic' | 'clear' | 'vivid';
  content: string;
  requires_interpretation: boolean;
}

// Vision delivery costs
const VISION_COSTS = {
  dream: 50,        // During natural sleep (cheapest)
  meditation: 75,   // During prayer
  sign: 100,        // Physical world manifestation
  direct: 250,      // Direct divine contact
};

// Clarity multipliers
const CLARITY_MULTIPLIERS = {
  obscure: 0.5,
  symbolic: 1.0,
  clear: 1.5,
  vivid: 2.0,
};
```

### Vision Priority in Dreams

When generating dreams, check for queued visions:

```typescript
function generateDream(agent: Entity): EnhancedDreamContent {
  const circadian = agent.getComponent(CT.Circadian);

  // Priority 1: Divine visions (god is spending belief)
  const pendingVision = VisionDeliverySystem.getQueuedVision(agent.id);
  if (pendingVision) {
    return generateDivineDream(pendingVision);
  }

  // Priority 2: Soul hints (significant events)
  if (circadian.soulDreamHints?.length > 0) {
    return generateSoulInfluencedDream(memories, circadian.soulDreamHints);
  }

  // Priority 3: Past life echoes (high wisdom)
  const soul = getSoul(agent);
  if (soul && soul.wisdom > 50) {
    const echo = maybeGeneratePastLifeEcho(soul);
    if (echo) {
      return generatePastLifeDream(memories, echo);
    }
  }

  // Default: Normal dream from memories
  return generateMundaneDream(memories);
}
```

---

## Events

### Emitted Events

| Event | When | Payload |
|-------|------|---------|
| `agent:sleeping` | Agent enters sleep | `{ agentId }` |
| `agent:sleep_start` | Sleep session begins | `{ agentId }` |
| `agent:dreamed` | Dream generated | `{ agentId, dream: DreamContent }` |
| `agent:woke` | Agent wakes | `{ agentId, sleepQuality, dreamContent }` |
| `memory:consolidated` | Memory consolidation done | `{ agentId, memoriesConsolidated }` |
| `soul:consolidated` | Soul consolidation done (NEW) | `{ soulId, eventsRecorded }` |

### Listened Events

| Event | Handler |
|-------|---------|
| `agent:sleep_start` | MemoryConsolidationSystem, SoulConsolidationSystem |
| `time:day_changed` | Memory decay |
| `memory:recalled` | Strengthen recalled memory |

---

## Implementation Phases

### Phase 1: Soul Consolidation System
- Create SoulConsolidationSystem
- Implement significance detection
- Write to silver thread
- Queue dream hints

### Phase 2: Enhanced Dream Generation
- Add soul-influenced dream types
- Add past life echoes for high-wisdom souls
- Integrate divine vision priority

### Phase 3: Dream Skill Implementation
- Implement key skill nodes (Lucidity, Control, Stability)
- Add shared dreaming mechanics
- Implement prophetic dream triggers

### Phase 4: Cross-Incarnation Dreams
- Past life memory access via Ancestral Dreaming skill
- Dream communication with deceased (same soul line)

### Phase 5: Dream Realm Mechanics
- Persistent dream locations (Dream Architecture)
- Nightmare realm as explorable space
- Collective dream spaces

---

## Configuration

```typescript
interface DreamSystemConfig {
  // REM timing
  rem_delay_ticks: number;          // Default: ~2 hours of sleep

  // Soul consolidation
  significance_threshold: number;   // Default: 0.7
  max_soul_events_per_sleep: number; // Default: 5

  // Past life echoes
  min_wisdom_for_echoes: number;    // Default: 25
  max_echo_probability: number;     // Default: 0.75

  // Dream magic
  lucidity_base_chance: number;     // Default: 0.05
  skill_lucidity_bonus: number;     // Per skill level

  // Divine visions
  vision_dream_priority: boolean;   // Default: true (visions override normal dreams)
}
```

---

## Related Specifications

- [Soul System](../soul-system/spec.md) - Soul and silver thread
- [Plot Lines](../soul-system/plot-lines-spec.md) - Plot-influenced dreams
- [Memory System](./memory-system.md) - Memory consolidation
- [Narrative Pressure](../divinity-system/narrative-pressure-system.md) - Plot attractors
- [Divine Communication](../divinity-system/divine-communication-system.md) - God visions
