# Tasks: epistemic-discontinuities

## Overview
Implement epistemic discontinuities - knowledge injection without causal paths. This allows higher-dimensional entities (gods, players via save-scum) to inject information that agents couldn't have learned naturally.

**Estimated Effort:** 60-87 hours | **Priority:** LOW-MEDIUM

## Phase 1: Core Infrastructure (6-10 hours)

- [ ] Create EpistemicInjection, KnowledgePayload types
- [ ] Implement EpistemicInjectionSystem
  - [ ] System priority and registration
  - [ ] Main update loop
- [ ] Add injectKnowledge API
  - [ ] Parameters: target, knowledge, source, phenomenology
  - [ ] Return injected memory reference
- [ ] Integrate with MemoryComponent
  - [ ] Store injected knowledge in agent memory
  - [ ] Mark memory with isDiscontinuous flag
- [ ] Add causal path validation
  - [ ] Search target's memory for causal chain
  - [ ] Trace perception -> communication -> inference paths
  - [ ] Reject injection if path found
- [ ] Implement discontinuity events
  - [ ] Emit 'epistemic_discontinuity' event
  - [ ] Include targetId, knowledgeType, source

## Phase 2: Knowledge Types

- [ ] Implement Factual knowledge type
  - [ ] Secrets (hidden information)
  - [ ] Locations (places not visited)
  - [ ] Identities (who someone is)
- [ ] Implement Procedural knowledge type
  - [ ] Skills (abilities not trained)
  - [ ] Strategies (tactics not learned)
  - [ ] Recipes (crafting knowledge)
- [ ] Implement Predictive knowledge type
  - [ ] Future events
  - [ ] Counterfactuals (what would happen if...)
  - [ ] Optimal paths
- [ ] Implement Meta knowledge type
  - [ ] Deleted timeline memories
  - [ ] Game mechanics awareness
  - [ ] Narrative role knowledge

## Phase 3: Knowledge Phenomenology

- [ ] Implement experience types
  - [ ] Sudden knowing (instant realization)
  - [ ] Vision (visual revelation)
  - [ ] Deja vu (feeling of familiarity)
  - [ ] Intuition (gut feeling)
  - [ ] False memory (thinks they learned it naturally)
- [ ] Track subjective origin
  - [ ] "I just know"
  - [ ] "God told me"
  - [ ] "I dreamed it"
- [ ] Implement subjective certainty (0-1 confidence)
- [ ] Track explainability (can they justify it?)
- [ ] Measure alienness (feels natural vs feels wrong)

## Phase 4: Divine Omniscience (8-12 hours)

- [ ] Extend DeityComponent with selection fields
  - [ ] selectionCost tracking
  - [ ] knowledgeQueries history
- [ ] Implement divineSelection method
  - [ ] Query: "who stole the gold?"
  - [ ] Calculate belief cost
  - [ ] Deduct belief from deity
- [ ] Add timeline query mechanism
  - [ ] Search timelines where god observed answer
  - [ ] Extract knowledge from selected timeline
  - [ ] Stub if multiverse not ready
- [ ] Implement grantRevelation method
  - [ ] God grants knowledge to mortal
  - [ ] Phenomenology = divine_whisper
  - [ ] Source tracks deity ID
- [ ] Add belief cost calculation
  - [ ] Base cost by knowledge complexity
  - [ ] Modifiers for deity domain
- [ ] Track divine knowledge sources

## Phase 5: Multiverse Integration (10-15 hours)

- [ ] Integrate with MultiverseManager
  - [ ] Query available timelines
  - [ ] Filter by knowledge presence
- [ ] Implement timeline knowledge query
  - [ ] Search for timeline matching criteria
  - [ ] Return timeline snapshot with knowledge
- [ ] Add knowledge extraction from timeline snapshots
  - [ ] Read entity state from snapshot
  - [ ] Extract relevant knowledge
- [ ] Create timeline selection heuristics
  - [ ] Prefer closest timelines
  - [ ] Weight by similarity
- [ ] Implement cross-timeline knowledge transfer
  - [ ] Copy knowledge preserving metadata
  - [ ] Track source timeline ID
- [ ] Add selection context tracking
  - [ ] Record which timeline was selected
  - [ ] Track selection reason

## Phase 6: Save-Scum Detection (6-8 hours)

- [ ] Hook into save/load system
  - [ ] Detect save load events
  - [ ] Track when player loads vs normal play
- [ ] Record deleted timelines on load
  - [ ] Archive current state before load
  - [ ] Store as deleted timeline
- [ ] Implement deleted timeline storage
  - [ ] Limit storage size
  - [ ] Prune oldest timelines
- [ ] Create knowledge bleed system
  - [ ] Select random NPCs (1-3 per deleted timeline)
  - [ ] Choose significant events from deleted timeline
- [ ] Select random NPCs for deja vu
  - [ ] Weighted by discontinuityAwareness stat
  - [ ] Exclude player avatar
- [ ] Extract significant events from deleted timelines
  - [ ] Deaths, attacks, major discoveries
  - [ ] Filter trivial events

## Phase 7: Detection System (6-8 hours)

- [ ] Implement discontinuity detection
  - [ ] Calculate detection chance per agent per injection
- [ ] Add detection chance calculation
  - [ ] Base: discontinuityAwareness stat
  - [ ] + alienness x 0.3
  - [ ] + intelligence x 0.2
- [ ] Create onDiscontinuityDetected handler
  - [ ] Agent adds thought: "How do I know this?"
  - [ ] Trigger personality-based reaction
- [ ] Integrate with personality system (reactions)
  - [ ] Curious -> investigate knowledge
  - [ ] Paranoid -> fear, distrust
  - [ ] Spiritual -> interpret as blessing
- [ ] Add agent thoughts/dialogue
  - [ ] Generate appropriate lines
  - [ ] Context-sensitive responses
- [ ] Implement verification attempts
  - [ ] Agent tries to confirm knowledge
  - [ ] Affects confidence level

## Phase 8: Advanced Features (12-18 hours)

- [ ] Counterfactual knowledge ("if X then Y")
  - [ ] Store conditional knowledge
  - [ ] Trigger evaluation system
- [ ] Quantum superposition knowledge
  - [ ] Knowledge exists in multiple states
  - [ ] Collapses on observation
- [ ] Retrocausal knowledge injection
  - [ ] Knowledge of past that didn't happen
  - [ ] Temporal paradox handling
- [ ] Memetic contagion (knowledge spreading without communication)
  - [ ] Knowledge spreads proximity-based
  - [ ] No verbal/written transmission
- [ ] Ancestral memory system
  - [ ] Descendants inherit ancestor knowledge
  - [ ] Dilutes over generations
- [ ] Prophecy integration
  - [ ] Link to divinity system
  - [ ] Oracle mechanics

## Phase 9: UI and Transparency (6-8 hours)

- [ ] Add discontinuity notifications
  - [ ] Toast when agent detects discontinuity
  - [ ] Log to event history
- [ ] Create discontinuity log viewer
  - [ ] List all injections
  - [ ] Filter by source, type, target
- [ ] Show knowledge source markers in memory UI
  - [ ] Icon for discontinuous knowledge
  - [ ] Tooltip with source details
- [ ] Add discontinuity filter in agent inspector
  - [ ] Toggle to show only discontinuous memories
  - [ ] Stats on injection count
- [ ] Implement meta-knowledge tracking
  - [ ] Dashboard for all epistemic events
  - [ ] Timeline visualization

## Testing

### Unit Tests
- [ ] Causal path detection (has path -> reject, no path -> allow)
- [ ] Knowledge injection (memory updated correctly)
- [ ] Detection chance calculation
- [ ] Timeline selection (query -> extract -> inject)

### Integration Tests
- [ ] Divine omniscience (god queries -> timeline selected -> knowledge injected)
- [ ] Save-scum memory (load save -> deleted timeline -> NPC deja vu)
- [ ] Revelation (god -> mortal knowledge transfer)
- [ ] Detection reactions (agent notices -> reacts based on personality)

### Scenario Tests
- [ ] Save-Scum Deja Vu: Player tries strategy, dies, loads save, NPC remembers
- [ ] Divine Omniscience: God knows secret without observing it
- [ ] Oracle Prophecy: Oracle knows future event (extracted from future timeline)
- [ ] Adaptive Boss: Boss "learns" player's strategy from deleted timeline
- [ ] Ancestral Memory: Descendant suddenly knows ancestor's technique

### Performance Tests
- [ ] Knowledge injection: < 1ms per injection
- [ ] Causal path validation: < 5ms per validation
- [ ] Timeline query: < 50ms per query
- [ ] Detection check: < 0.5ms per agent per injection
