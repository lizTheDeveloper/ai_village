# Proposal: Work Order: Epistemic Discontinuities (Information Without History)

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/epistemic-discontinuities

---

## Original Work Order

# Work Order: Epistemic Discontinuities (Information Without History)

**Phase:** TBD (Meta-Narrative Systems)
**Created:** 2026-01-02
**Status:** READY_FOR_IMPLEMENTATION
**Priority:** LOW-MEDIUM

---

## Spec Reference

- **Primary Spec:** [openspec/specs/divinity-system/epistemic-discontinuities.md](../../../../openspec/specs/divinity-system/epistemic-discontinuities.md)
- **Related Specs:**
  - [openspec/specs/divinity-system/narrative-pressure-system.md](../../../../openspec/specs/divinity-system/narrative-pressure-system.md)
  - [openspec/specs/divinity-system/belief-and-deity-system.md](../../../../openspec/specs/divinity-system/belief-and-deity-system.md)
- **Dependencies:**
  - ⚠️ Divinity System (Phase TBD) - Deity entities, divine powers
  - ⚠️ Multiverse System (Phase 32) - Timeline management, selection
  - ⚠️ Persistence Layer (Phase 33) - Save/load for save-scum detection
  - ✅ Memory System - Agent memory storage

---

## Context

Epistemic discontinuities occur when higher-dimensional entities inject **information without a causal acquisition path**. This is not prediction or learning — it's **selection pressure across possibility space**.

**Lower-dimensional constraint:**
- Agents learn through perception, communication, or inference
- All knowledge has causal history (saw → know, heard → know)

**Higher-dimensional privilege:**
- Gods can select timelines where they know things
- Players remember deleted save files
- Knowledge can appear without intermediate steps

**Key Examples:**
- NPC has deja vu about events from a deleted save
- God "knows" your secret (selected timeline where they observed it)
- Boss adapts to strategy you haven't used this run
- Oracle predicts future (extracted knowledge from future timeline)
- Agent "remembers" ancestor's knowledge

**NOT:**
- Precognition (still causal: trend → inference)
- Omniscience (knowing everything always)
- Telepathy (causal: mind exists → read mind)
- Plot convenience (arbitrary knowledge)

**IS:**
- Selection across timelines
- Knowledge injection
- Information without computation

---

## Requirements Summary

### Feature 1: Knowledge Injection System
Core infrastructure for injecting knowledge without causal paths:
1. EpistemicInjection type (source, target, knowledge, phenomenology)
2. EpistemicInjectionSystem (manages injections)
3. Causal path validation (detect discontinuities)
4. Knowledge application to memory
5. Discontinuity event emission

### Feature 2: Knowledge Types
Support diverse knowledge payloads:
1. Factual (secrets, locations, identities)
2. Procedural (skills, strategies, recipes)
3. Predictive (future events, counterfactuals, optimal paths)
4. Meta (deleted timeline memories, game mechanics, narrative roles)

### Feature 3: Knowledge Phenomenology
How knowledge feels to the recipient:
1. Experience types (sudden knowing, vision, deja vu, intuition, false memory)
2. Subjective origin ("I just know", "god told me", "I dreamed it")
3. Subjective certainty (0-1 confidence)
4. Explainability (can they justify it?)
5. Alienness (feels natural vs feels wrong)

### Feature 4: Timeline Selection
Extract knowledge from other timelines:
1. Query timelines for specific knowledge
2. Select timeline where entity has knowledge
3. Extract knowledge from timeline snapshot
4. Inject into current timeline
5. Track timeline sources

### Feature 5: Divine Omniscient Selection
Gods know things via timeline selection:
1. God queries: "who stole the gold?"
2. System searches timelines where god observed this
3. Extract knowledge from selected timeline
4. Inject into god's memory (with belief cost)
5. God can grant revelations to mortals

### Feature 6: Player Save-Scum Memory
NPCs remember deleted save files:
1. Detect when player loads a save
2. Record deleted timeline
3. Bleed knowledge from deleted timeline to select NPCs
4. Create deja vu memories
5. Fourth-wall breaking dialogue

### Feature 7: Detection and Awareness
Agents can notice discontinuities:
1. Detection chance based on discontinuityAwareness stat
2. Modified by alienness, intelligence, explainability
3. Agent reactions (confusion, fear, wonder, investigation)
4. Integration with personality (paranoid vs spiritual interpretation)

---

## Acceptance Criteria

### Criterion 1: Knowledge Injection Infrastructure
- **WHEN:** The system is created
- **THEN:** The system SHALL:
  1. Create EpistemicInjectionSystem
  2. Support injectKnowledge(target, knowledge, source, phenomenology)
  3. Validate causal paths (throw if path exists)
  4. Apply knowledge to target's MemoryComponent
  5. Emit 'epistemic_discontinuity' event
- **Verification:**
  - Inject knowledge: `{ type: 'secret', content: 'John is the traitor' }`
  - Target entity's memory contains injected knowledge
  - Causal validation: if knowledge already acquired, throw error
  - Event emitted with targetId, knowledgeType, source

### Criterion 2: Causal Path Validation
- **WHEN:** Knowledge is injected
- **THEN:** The system SHALL:
  1. Search target's memory for causal chain
  2. Trace perception → communication → inference paths
  3. If path found, reject injection (not a discontinuity)
  4. If no path found, allow injection with justification
  5. Record discontinuity in memory entry
- **Verification:**
  - Agent saw "key under rock" → has causal path → injection rejected
  - Agent never saw key → no causal path → injection allowed
  - Memory entry marked: isDiscontinuous = true

### Criterion 3: Knowledge Phenomenology
- **WHEN:** Knowledge is injected
- **THEN:** The system SHALL:
  1. Store phenomenology in memory entry
  2. Track experienceType (vision, deja_vu, sudden_knowing, etc.)
  3. Store subjectiveOrigin (what agent thinks happened)
  4. Track subjectiveCertainty (0-1)
  5. Record alienness (how strange it feels)
- **Verification:**
  - Inject with phenomenology: `{ experienceType: 'deja_vu', alienness: 0.8 }`
  - Memory entry contains: "I feel like this happened before..."
  - Agent can't explain how they know (explainable = false)
  - Feels very strange (alienness = 0.8)

### Criterion 4: Timeline Selection Integration
- **WHEN:** Knowledge is extracted from another timeline
- **THEN:** The system SHALL:
  1. Query multiverse for timelines matching criteria
  2. Select timeline where entity has knowledge
  3. Extract knowledge from timeline snapshot
  4. Inject with source = { type: 'multiverse', timelines: [id] }
  5. Track selectionContext
- **Verification:**
  - Query: "timeline where Agent X knows secret Y"
  - Timeline found, knowledge extracted
  - Injected into current timeline's Agent X
  - Source marked as multiverse selection
  - selectionContext tracks source timeline ID

### Criterion 5: Divine Omniscient Selection
- **WHEN:** A deity performs omniscient selection
- **THEN:** The system SHALL:
  1. Deity calls divineSelection(knowledgeQuery)
  2. Cost = estimateSelectionCost(query)
  3. Deduct belief from deity
  4. Search timelines where deity observed query
  5. Extract and inject knowledge into deity's memory
- **Verification:**
  - Deity with 1000 belief queries "who stole gold"
  - Cost calculated (e.g., 300 belief)
  - Deity belief = 700 (deducted)
  - Timeline selected where deity observed theft
  - Knowledge injected: { type: 'fact', content: 'Agent X stole gold' }

### Criterion 6: Divine Revelation to Mortals
- **WHEN:** God grants revelation to mortal
- **THEN:** The system SHALL:
  1. God calls grantRevelation(mortal, knowledge)
  2. Inject knowledge with source = { type: 'deity', deityId }
  3. Phenomenology = divine_whisper
  4. Mortal's memory: "God X revealed this to me"
  5. Alienness = 0.3 (somewhat alien but accepted)
- **Verification:**
  - God grants secret to mortal
  - Mortal's memory contains knowledge
  - Memory origin: "God of Wisdom revealed this"
  - Experience type: divine_whisper
  - Mortal trusts knowledge (high certainty)

### Criterion 7: Player Save-Scum Detection
- **WHEN:** Player loads a save file
- **THEN:** The system SHALL:
  1. Detect save load event
  2. Record current state as "deleted timeline"
  3. Store deleted timeline in deletedSaveStates array
  4. Optionally bleed knowledge to NPCs (if enabled)
  5. Track timeline deletion reason (player_load)
- **Verification:**
  - Player loads save from 10 minutes ago
  - Current state archived as deleted timeline
  - Timeline ID generated, stored
  - Config: allowDeletedTimelineMemories = true → NPCs get deja vu

### Criterion 8: Deleted Timeline Memory Bleed
- **WHEN:** Deleted timeline knowledge bleeds to NPCs
- **THEN:** The system SHALL:
  1. Select random NPCs (1-3 per deleted timeline)
  2. Extract significant event from deleted timeline
  3. Inject as deja_vu memory
  4. Low confidence (0.2-0.3)
  5. High alienness (0.7-0.9)
- **Verification:**
  - Player attacks guard, dies, loads save
  - Deleted timeline contains "player attacked guard"
  - Random NPC gets deja vu: "I dreamed you attacked the guard..."
  - Confidence = 0.2 (uncertain)
  - Alienness = 0.8 (very strange)

### Criterion 9: Discontinuity Detection by Agents
- **WHEN:** Agent receives injected knowledge
- **THEN:** The system SHALL:
  1. Calculate detection chance (discontinuityAwareness + alienness × 0.3 + intelligence × 0.2)
  2. If detected, trigger onDiscontinuityDetected
  3. Agent adds thought: "How do I know this?"
  4. React based on personality (curious → investigate, paranoid → fear, spiritual → blessing)
  5. Record detection in memory
- **Verification:**
  - Inject knowledge with alienness = 0.8
  - Agent with discontinuityAwareness = 0.5, intelligence = 0.7
  - Detection chance = 0.5 + 0.8×0.3 + 0.7×0.2 = 0.88
  - Agent detects: "I never learned this... how do I know?"
  - High curiosity → tries to verify knowledge

---

## Implementation Steps

1. **Core Infrastructure** (6-10 hours)
   - Create EpistemicInjection, KnowledgePayload types
   - Implement EpistemicInjectionSystem
   - Add injectKnowledge API
   - Integrate with MemoryComponent
   - Add causal path validation
   - Implement discontinuity events

2. **Divine Omniscience** (8-12 hours)
   - Extend DeityComponent with selection fields
   - Implement divineSelection method
   - Add timeline query mechanism (stub if multiverse not ready)
   - Implement grantRevelation method
   - Add belief cost calculation
   - Track divine knowledge sources

3. **Multiverse Integration** (10-15 hours)
   - Integrate with MultiverseManager
   - Implement timeline knowledge query
   - Add knowledge extraction from timeline snapshots
   - Create timeline selection heuristics
   - Implement cross-timeline knowledge transfer
   - Add selection context tracking

4. **Save-Scum Detection** (6-8 hours)
   - Hook into save/load system
   - Record deleted timelines on load
   - Implement deleted timeline storage
   - Create knowledge bleed system
   - Select random NPCs for deja vu
   - Extract significant events from deleted timelines

5. **Detection System** (6-8 hours)
   - Implement discontinuity detection
   - Add detection chance calculation
   - Create onDiscontinuityDetected handler
   - Integrate with personality system (reactions)
   - Add agent thoughts/dialogue
   - Implement verification attempts

6. **Advanced Features** (12-18 hours)
   - Counterfactual knowledge ("if X then Y")
   - Quantum superposition knowledge
   - Retrocausal knowledge injection
   - Memetic contagion (knowledge spreading without communication)
   - Ancestral memory system
   - Prophecy integration

7. **UI and Transparency** (6-8 hours)
   - Add discontinuity notifications
   - Create discontinuity log viewer
   - Show knowledge source markers in memory UI
   - Add discontinuity filter in agent inspector
   - Implement meta-knowledge tracking

8. **Testing and Polish** (6-8 hours)
   - Unit tests for causal path validation
   - Integration tests for divine selection
   - Scenario tests (save-scum deja vu, divine revelation, oracle prophecy)
   - Performance testing
   - Documentation

---

## Testing Plan

### Unit Tests
- Test causal path detection (has path → reject, no path → allow)
- Test knowledge injection (memory updated correctly)
- Test detection chance calculation
- Test timeline selection (query → extract → inject)

### Integration Tests
- Test divine omniscience (god queries → timeline selected → knowledge injected)
- Test save-scum memory (load save → deleted timeline → NPC deja vu)
- Test revelation (god → mortal knowledge transfer)
- Test detection reactions (agent notices → reacts based on personality)

### Scenario Tests
1. **Save-Scum Deja Vu**: Player tries strategy, dies, loads save, NPC remembers
2. **Divine Omniscience**: God knows secret without observing it
3. **Oracle Prophecy**: Oracle knows future event (extracted from future timeline)
4. **Adaptive Boss**: Boss "learns" player's strategy from deleted timeline
5. **Ancestral Memory**: Descendant suddenly knows ancestor's technique

---

## Performance Requirements

- **Knowledge Injection:** < 1ms per injection
- **Causal Path Validation:** < 5ms per validation
- **Timeline Query:** < 50ms per query (depends on multiverse size)
- **Detection Check:** < 0.5ms per agent per injection
- **Memory:** < 10MB for 1000 injections

---

## Success Metrics

1. ✅ All 9 acceptance criteria met
2. ✅ Agents detect 20-40% of discontinuities (feels uncanny but not always)
3. ✅ Players notice NPCs "knowing too much" (fourth-wall moments)
4. ✅ Divine omniscience feels powerful but not arbitrary
5. ✅ Save-scum awareness creates meta-humor
6. ✅ Performance within budget (< 1ms per injection)

---

## Dependencies

- ⚠️ **Divinity System** - Deity entities, belief economy (can stub initially)
- ⚠️ **Multiverse System** - Timeline queries, snapshots (can stub initially)
- ⚠️ **Persistence Layer** - Save/load detection (can stub initially)
- ✅ **Memory System** - Already exists
- ✅ **Personality System** - Already exists

---

## Future Enhancements (Not in This Work Order)

- Machine learning for knowledge selection (which timeline to choose)
- Narrative coherence checking (does injected knowledge make sense?)
- Knowledge verification mini-games (agent tries to confirm knowledge)
- Memetic warfare (competing gods inject conflicting knowledge)
- Timeline convergence (multiple timelines merge, knowledge from both)
- Reality fragmentation (too many discontinuities break consistency)

---

## Notes

- Can stub multiverse integration (use fake timeline selection initially)
- Divine integration can be minimal (simulate belief costs)
- Save-scum detection requires persistence layer (can mock initially)
- Focus on 4 knowledge types initially: fact, secret, future_event, deleted_timeline_memory
- Detection should be rare enough to feel special (20-40% rate)
- Alienness should scale with how "impossible" the knowledge is

---

## Estimated Effort

**Total:** 60-87 hours (~2 weeks full-time)

**Breakdown:**
- Phase 1 (Core): 6-10 hrs
- Phase 2 (Divine): 8-12 hrs
- Phase 3 (Multiverse): 10-15 hrs
- Phase 4 (Save-Scum): 6-8 hrs
- Phase 5 (Detection): 6-8 hrs
- Phase 6 (Advanced): 12-18 hrs
- Phase 7 (UI): 6-8 hrs
- Phase 8 (Testing): 6-8 hrs


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
