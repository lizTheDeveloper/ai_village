# Consciousness Implementation Phases

**Created:** 2025-12-20
**Status:** Planning Document
**Related:** `FEASIBILITY_REVIEW.md`

---

## Overview

This document defines which consciousness types and alien features should be implemented in each development phase, based on technical feasibility assessment. Features are categorized by implementation complexity, LLM limitations, and performance costs.

---

## Phase 1: Core MVP

**Goal:** Ship a working game with tractable, well-understood agent systems.

### Consciousness Types

| Type | Status | Notes |
|------|--------|-------|
| **Individual consciousness** | INCLUDE | Standard single-mind agents |
| **Human-like psychology** | INCLUDE | Friendship, love, goals, memory |

### Features

| System | What's Included | What's Excluded |
|--------|-----------------|-----------------|
| **Needs** | Full Maslow hierarchy for individuals | Alien needs (pack coherence, man'chi anchor) |
| **Memory** | Episodic + spatial memory, reflection | Inherited memories, geological-scale |
| **Relationships** | Friendship, romance, family, respect | Man'chi, hive belonging, pack unity |
| **Conversation** | Verbal communication, information sharing | Non-verbal (pheromone, chromatic, telepathic) |
| **Economy** | Currency-based, barter, trade | Post-scarcity, dominance-based, gift economy |
| **Lifecycle** | Birth, aging, death for individuals | Pack splitting, hive swarming, symbiont transfer |
| **Timescale** | Single timescale (human-like) | Multi-timescale engine |
| **Player** | Individual agent embodiment | Pack mind, hive worker, symbiont |

### Technical Constraints

- **LLM calls:** One per agent per decision point
- **Memory:** Standard episodic/spatial per agent
- **Token budget:** Manageable with batching

---

## Phase 2: Simple Collective Minds

**Goal:** Add pack minds and hive minds with significant simplifications.

### Consciousness Types

| Type | Status | Implementation |
|------|--------|----------------|
| **Pack mind** | INCLUDE (simplified) | Max 4-6 bodies, pre-defined formations only |
| **Hive mind** | INCLUDE (tiered) | Queen = full agent, workers = behavioral rules |

### Pack Mind Constraints

```typescript
// Phase 2 Pack Mind Limits
const PACK_LIMITS = {
  maxBodies: 6,                    // Not 8
  formations: ["cluster", "line"], // Not tactical
  coherenceSimple: true,           // Binary: coherent or not
  llmCallsPerTick: 1,              // One for whole pack
  bodyLossSimple: true,            // Lose body = stat penalty, not personality change
};
```

### Hive Mind Tiered Simulation

```typescript
// Phase 2 Hive Simulation Tiers
enum HiveSimulationTier {
  QUEEN = "full_agent",        // Full LLM-based agent
  CEREBRATE = "simplified",    // Occasional LLM, mostly rules
  WORKER = "behavioral",       // Pure state machine, no LLM
}

// Worker behavior is deterministic
interface WorkerBehavior {
  followDirectives: true;      // Always obey queen
  noIndependentDecisions: true;
  noEpisodicMemory: true;
  noRelationships: true;
}
```

### Features Added

| System | What's Added | Constraints |
|--------|--------------|-------------|
| **Needs** | Pack coherence, hive connection | Simplified decay/satisfaction |
| **Memory** | Pack shared memory | Single memory store, not per-body |
| **Relationships** | Pack-to-pack, hive collective | No individual worker relationships |
| **Movement** | Formation movement | Pre-defined formations only |
| **Player** | Pack mind embodiment | Simplified multi-body control |

### Excluded from Phase 2

- Symbiont consciousness
- Networked consciousness
- Multiple timescales
- Pack splitting as reproduction
- Hive swarming
- Body role specialization beyond basic

---

## Phase 3: Hibernation & Short Cycles

**Goal:** Add cyclical consciousness with limited duration.

### Consciousness Types

| Type | Status | Implementation |
|------|--------|----------------|
| **Cyclical dormancy** | INCLUDE (limited) | Max 5 year cycles, not 35 |

### Hibernation Constraints

```typescript
// Phase 3 Hibernation Limits
const HIBERNATION_LIMITS = {
  maxCycleDuration: 5,             // Years, not 35
  memoryDegradation: 0.1,          // 10% loss per cycle
  skillDecay: 0.05,                // 5% per cycle
  relationshipHandling: "simple",  // Mark dormant, don't simulate
  historyTracking: "major_events", // Not full simulation
};
```

### Features Added

| System | What's Added | Constraints |
|--------|--------------|-------------|
| **Lifecycle** | Dormancy phases | 5 year max |
| **Memory** | Pre-dormancy preservation | Written records only |
| **Needs** | Dormancy preparation | Simplified urgency |
| **Governance** | Cyclic regency | Basic rotation |
| **Player** | Hibernation gameplay | Time-skip with summary |

### Excluded from Phase 3

- 35+ year hibernation
- Cross-cohort generational memory
- Complex dormancy politics

---

## Phase 4: Symbiont Consciousness

**Goal:** Add joined beings with careful memory limits.

### Consciousness Types

| Type | Status | Implementation |
|------|--------|----------------|
| **Symbiont joined** | INCLUDE (limited) | Max 5 accessible past hosts |

### Symbiont Constraints

```typescript
// Phase 4 Symbiont Limits
const SYMBIONT_LIMITS = {
  accessiblePastHosts: 5,          // Not unlimited
  memoryClarity: {
    recentHost: 0.9,               // Clear
    olderHosts: 0.5,               // Foggy
    ancientHosts: 0.2,             // Fragments only
  },
  contextWindowBudget: 2000,       // Tokens for past host context
  activeMemoryAccess: false,       // Must "journey" to access
  conflictResolution: "simple",    // Host dominant or symbiont, not complex negotiation
};
```

### Features Added

| System | What's Added | Constraints |
|--------|--------------|-------------|
| **Memory** | Inherited memories | 5 hosts, summarized |
| **Needs** | Integration, host health | Simplified tracking |
| **Relationships** | Past host connections | Limited to significant only |
| **Player** | Symbiont embodiment | Dual-perspective optional |

### Excluded from Phase 4

- Unlimited past host access
- Full episodic inheritance
- Complex host/symbiont negotiation
- Symbiont transfer gameplay

---

## Phase 5: Limited Multi-Timescale

**Goal:** Add one additional timescale (slow), not full spectrum.

### Timescales Supported

| Scale | Status | Implementation |
|-------|--------|----------------|
| **Standard (human)** | INCLUDE | Default |
| **Slow (hibernating)** | INCLUDE | Process less frequently |
| **Fast (millisecond)** | EXCLUDE | Not feasible |
| **Geological** | EXCLUDE | Not feasible as agent |

### Engine Constraints

```typescript
// Phase 5 Timescale Limits
const TIMESCALE_CONFIG = {
  supported: ["standard", "slow"],
  excluded: ["millisecond", "geological"],

  standard: {
    tickRate: 1,
    llmCallFrequency: "per_decision",
  },

  slow: {
    tickRate: 0.1,                 // 10x slower
    llmCallFrequency: "per_day",   // Not per tick
    useFor: ["hibernating", "elderly", "contemplative"],
  },
};
```

### Features Added

| System | What's Added | Constraints |
|--------|--------------|-------------|
| **Engine** | Dual timescale | 2 scales only |
| **Conversation** | Cross-scale messages | Async only |
| **Needs** | Slow decay rates | For slow entities |

### Permanently Excluded

- Millisecond cognition (AI Minds)
- Geological timescale (Stone Eaters)
- More than 2 simultaneous scales

---

## Experimental (Post-Launch)

**Goal:** Test risky features with player opt-in.

### Experimental Features

| Feature | Risk Level | Notes |
|---------|------------|-------|
| **Post-scarcity economy** | High | Needs concrete definition |
| **Gift economy** | Medium | Obligation tracking complex |
| **Dominance economy** | High | May not be fun |
| **Cross-species psychology** | Medium | LLM consistency issues |
| **Non-verbal communication** | Medium | Pheromone, chromatic |
| **Networked consciousness** | High | State synchronization |

### Experimental Toggle

```typescript
interface ExperimentalFeatures {
  // Players must opt-in
  postScarcityEconomy: boolean;
  giftEconomy: boolean;
  dominanceEconomy: boolean;
  crossSpeciesPsychology: boolean;
  pheromoneComm: boolean;
  chromaticComm: boolean;
  networkedConsciousness: boolean;

  // Warning shown on enable
  warningText: "These features are experimental and may cause instability.";
}
```

---

## Deferred Indefinitely

These features have fundamental feasibility issues and should not be scheduled.

### Never Implement (As Designed)

| Feature | Reason | Alternative |
|---------|--------|-------------|
| **Millisecond cognition (playable)** | 1000x LLM calls impossible | Flavor text only |
| **Geological beings (playable)** | Can't perceive individuals | Environmental hazard NPCs |
| **Polyphonic speech (synchronized)** | LLMs generate single stream | Sequential dual-statement |
| **Incomprehensible aliens (LLM-side)** | LLMs produce comprehensible output | Player-side ambiguity |
| **Unlimited symbiont memory** | Context window limits | 5 host cap |
| **35+ year hibernation** | State bloat, history tracking | 5 year cap |
| **True telepathy (thought sharing)** | Would expose internal LLM state | Surface impressions only |

### Redesign Required Before Implementation

| Feature | Required Redesign |
|---------|-------------------|
| **Polyphonic communication** | Sequential or templated, not synchronized |
| **Incomprehensible aliens** | Player ambiguity, not LLM incomprehension |
| **Geological beings** | Simplified state machine, not full agent |
| **AI Mind embodiment** | Remove or make purely narrative |

---

## Implementation Checklist by Phase

### Phase 1 Checklist
- [ ] Individual consciousness agents
- [ ] Maslow needs hierarchy
- [ ] Episodic + spatial memory
- [ ] Standard relationships
- [ ] Currency economy
- [ ] Individual lifecycle
- [ ] Single timescale
- [ ] Individual player embodiment

### Phase 2 Checklist
- [ ] Pack mind (4-6 bodies, simple formations)
- [ ] Hive mind (tiered: queen/cerebrate/worker)
- [ ] Pack coherence needs
- [ ] Pack shared memory
- [ ] Pack-to-pack relationships
- [ ] Formation movement
- [ ] Pack player embodiment

### Phase 3 Checklist
- [ ] Cyclical dormancy (5 year max)
- [ ] Memory preservation (written)
- [ ] Dormancy preparation needs
- [ ] Cyclic regency governance
- [ ] Hibernation player gameplay

### Phase 4 Checklist
- [ ] Symbiont consciousness (5 hosts max)
- [ ] Inherited memory (summarized)
- [ ] Integration needs
- [ ] Past host relationships (limited)
- [ ] Symbiont player embodiment

### Phase 5 Checklist
- [ ] Slow timescale entities
- [ ] Dual timescale engine
- [ ] Cross-scale messaging
- [ ] Slow decay needs

---

## Cross-Reference

This document should be referenced from:

- `species-system.md` - Consciousness type definitions
- `player-system.md` - Player embodiment options
- `game-engine/spec.md` - Multi-timescale support
- `memory-system.md` - Inherited/shared memory
- `conversation-system.md` - Non-verbal communication
- `needs.md` - Alien psychological needs
- `lifecycle-system.md` - Alien lifecycles
- `economy-system.md` - Alternative economies

---

## Related Documents

- `FEASIBILITY_REVIEW.md` - Full technical analysis
- `INTEGRATION_REVIEW.md` - Spec integration status
