# Progression System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

This is not a game with an "endgame." This is a **terrarium for AI emergence**. The world starts simple and slowly, organically grows wild and complex through the accumulated decisions, inventions, and stories of AI agents over hundreds of hours.

**Progression is not about checkboxes.** It's about:
- Complexity accumulating naturally
- Agents inventing things nobody predicted
- Stories emerging from simulation
- The world getting *weird* because the AIs made it weird

The player's role is to participate, observe, guide - and eventually, connect their wild world to others.

---

## Philosophy

### This is a Terrarium, Not a Treadmill

The game is interesting because:
- AI agents are *actually thinking* via LLMs
- Their decisions compound over time
- Inventions build on inventions
- Culture and history emerge
- The world becomes something no one designed

### Core Principles

1. **Emergence Over Design:** Don't script outcomes, create conditions
2. **Time Creates Complexity:** Weirdness requires patience
3. **Agents Are Primary:** Players participate; agents generate
4. **No Endgame:** Just deeper, weirder, more connected
5. **Slow Burn:** 1000 hours in, things get *interesting*

### The Vision

> "You plant seeds. Agents water them. Years pass. One day you notice they've built a temple to a god they invented, and they're having theological debates about a crop hybrid named after a villager who died 50 years ago."

---

## Phases of Complexity

Not "eras to unlock" but **emergent phases** - natural stages the world passes through as complexity accumulates. You don't "achieve" these; they happen because the simulation ran long enough.

### Complexity Phases

| Phase | World State | Emerges After | What's Happening |
|-------|-------------|---------------|------------------|
| **Survival** | Scrappy, precarious | Start | Agents focused on not dying |
| **Stability** | Sustainable routines | ~Weeks | Basic needs met, habits form |
| **Culture** | Traditions, preferences | ~Months | Agents develop opinions, favorites |
| **History** | Memory, legacy | ~Years | Dead agents remembered, lore accumulates |
| **Invention** | Novel items, techniques | ~Years | Generated content becomes significant |
| **Divergence** | Unique identity | Many years | This village is unlike any other |
| **Weirdness** | Unexpected complexity | Long time | Things nobody predicted |
| **Connection** | Ready for others | Very long | Complex enough to share |

*These aren't unlocks. They're observations about what happens.*

---

## Emergence Mechanics

### What Accumulates

```typescript
interface WorldComplexity {
  // Raw metrics (just tracking, not goals)
  timePassed: GameTime;
  agentsEverLived: number;
  agentsDied: number;

  // Memory accumulation
  totalMemories: number;
  sharedMemories: number;       // Known by multiple agents
  legendaryMemories: number;    // Passed down generations

  // Invention
  generatedItems: number;
  generatedRecipes: number;
  generatedCrops: number;
  inventionChains: number;      // Items made from generated items

  // Culture
  namedLocations: number;       // Places agents named
  traditions: number;           // Repeated behaviors
  beliefs: number;              // Shared opinions
  conflicts: number;            // Disagreements that persisted

  // History
  significantEvents: number;
  agentLegends: number;         // Dead agents still discussed
  lostKnowledge: number;        // Things forgotten

  // Weirdness
  unexpectedOutcomes: number;   // System surprises
  uniqueCombinations: number;   // First-time interactions
  emergentBehaviors: number;    // Patterns we didn't code

  // Documentation (see chroniclers.md)
  writtenWorks: number;         // Books, newspapers created
  documentedEvents: number;     // Events chronicled
  preservedHistory: number;     // Historical records maintained
}
```

### How Complexity Enables Scope

The world doesn't "unlock" features - it becomes *capable* of them:

```typescript
interface ScopeEnablement {
  // Portals don't unlock - they become POSSIBLE
  // when the world has enough complexity to support them

  planetPortals: {
    requirement: "not_a_checklist",
    conditions: [
      "Agents have theorized about 'other places' in conversation",
      "Sufficient research depth in spatial fields",
      "Accumulated enough 'anomaly' events",
      "World complexity score suggests readiness",
    ],
    // Even then, agents must DISCOVER them through play
  };

  universePortals: {
    conditions: [
      "Planet portals have been used extensively",
      "Agents have developed theories about 'other realms'",
      "Generated content has reached sufficient weirdness",
      "World has a distinct cultural identity to share",
    ],
  };

  multiplayer: {
    conditions: [
      "Universe is complex enough to be interesting to visitors",
      "Player has demonstrated sustained engagement",
      "World has unique content worth sharing",
      "Technical: sufficient generated content to sync",
    ],
  };
}
```

### Emergence Examples

**What might happen after 100 hours:**
- Agents have favorite foods, preferred work, known friends
- A few items have been invented through research
- Some locations have been named by agents
- Basic trade patterns have emerged

**What might happen after 500 hours:**
- A religion might have emerged around a natural phenomenon
- An agent who died is still remembered, their recipes used
- A crop hybrid has become culturally significant
- Agents have opinions about the "old ways" vs "new ways"
- Someone invented something weird that changed the economy

**What might happen after 2000 hours:**
- Complex theological debates about generated concepts
- Multi-generational family dynamics
- Items that reference items that reference items
- Locations with layered historical significance
- Behaviors that would take paragraphs to explain
- Things the developers never imagined

---

## Enabling Civilization Emergence

The goal: give agents the *capability* to build complex civilizations if their decisions lead there.

### Civilization Building Blocks

```typescript
interface CivilizationCapabilities {
  // Social structures
  relationships: true,           // Agents can form bonds
  hierarchies: true,             // Natural leaders emerge
  factions: true,                // Groups with shared beliefs
  inheritance: true,             // Knowledge passes to new agents

  // Cultural systems
  naming: true,                  // Agents name things
  storytelling: true,            // Agents share memories
  rituals: true,                 // Repeated significant actions
  beliefs: true,                 // Shared interpretations

  // Economic systems
  specialization: true,          // Agents develop roles
  trade: true,                   // Exchange of goods
  currency: true,                // Abstract value storage
  contracts: true,               // Agreements between agents

  // Knowledge systems
  teaching: true,                // Skills transfer
  research: true,                // Collective discovery
  records: true,                 // Written/stored knowledge
  debate: true,                  // Competing ideas

  // Governance (emergent)
  decisions: true,               // Group choices
  rules: true,                   // Agreed constraints
  enforcement: true,             // Social pressure
  leadership: true,              // Recognized authority
}
```

### What We DON'T Design

```typescript
// We don't pre-build:
const notDesigned = [
  "What the religion believes",
  "Who becomes leader",
  "What traditions form",
  "Which items become sacred",
  "What conflicts emerge",
  "How governance works",
  "What the culture values",
  "What knowledge is lost",
  "What names are given",
  "What stories are told",
];

// These EMERGE from agent decisions over time
```

### Agent Capabilities for Emergence

```typescript
interface AgentCivilizationBehaviors {
  // Agents can...
  formOpinions: true,            // "I think X is good"
  shareOpinions: true,           // Tell others what they think
  rememberHistory: true,         // Know what happened
  teachOthers: true,             // Pass on skills/knowledge
  createSymbols: true,           // Assign meaning to things
  makePromises: true,            // Commit to future actions
  enforceNorms: true,            // Pressure others to conform
  innovate: true,                // Try new combinations
  specialize: true,              // Focus on specific work
  delegate: true,                // Ask others to do things
  celebrate: true,               // Mark significant events
  mourn: true,                   // Process loss
  disagree: true,                // Hold conflicting views
  compromise: true,              // Find middle ground
  rebel: true,                   // Reject prevailing norms
}
```

---

## Time-Based Emergence

### Why Time Matters

```typescript
// Complexity compounds. You can't rush it.

const timeEffects = {
  // Generations
  agentLifespan: "finite",       // Old agents die
  newAgentsArrive: "periodic",   // Fresh perspectives
  knowledgeTransfer: "imperfect", // Some things lost

  // Accumulation
  memoriesStack: true,           // More history over time
  referencesDeepen: true,        // Items reference items
  traditionsFormSlowly: true,    // Needs repeated behavior
  legendsNeedDistance: true,     // Can't be legendary yet

  // Divergence
  pathDependence: true,          // Early choices matter
  uniquenessGrows: true,         // More different over time
  comparisonMeaningful: true,    // Old world vs new world
};
```

### Natural Pacing

```
~10 hours:   Village survives, agents know each other
~50 hours:   Preferences emerge, first inventions
~200 hours:  Culture taking shape, history accumulating
~500 hours:  Distinct identity, complex relationships
~1000 hours: Deep history, layered meanings, weirdness
~2000 hours: Civilization with its own logic
~5000 hours: Ready to encounter other civilizations
```

---

## Scope Expansion (Not Unlocks)

### Planet Portals

Not "unlocked at hour X" but emerges when:
- Agents have independently theorized about other places
- Research has reached into spatial/dimensional topics
- Strange events have occurred that suggest "something beyond"
- The world has enough identity to contrast with another

Then: **Agents might discover one.** Player might find one. Not guaranteed.

### Universe Portals

Emerges when:
- Planet travel is well-established
- Agents understand their universe's "rules"
- Someone has invented something that pushes boundaries
- The universe has a strong identity

Then: **Reality might crack somewhere.** A breakthrough discovery. Very rare.

### Multiplayer Connection

Emerges when:
- Universe is genuinely interesting (not empty/simple)
- Player has sustained engagement
- There's something worth sharing
- Technical: enough unique content to sync

Then: **Connection becomes possible.** Not required. Not an achievement. An option.

---

## Summary

This isn't a game you "beat."

It's a world you cultivate.

The AIs build the civilization. You're the gardener.

**Scope expands when complexity earns it, not when you grind for it.**

## Related Specs

- `universe-system/spec.md` - Universe/planet structure
- `research-system/spec.md` - Discovery emergence
- `agent-system/spec.md` - Agent capabilities
- `game-engine/spec.md` - Time simulation
- `agent-system/chroniclers.md` - Documenting emergence and complexity
- `agent-system/memory-system.md` - Memory accumulation over time
