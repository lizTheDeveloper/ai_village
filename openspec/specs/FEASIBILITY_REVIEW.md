# Technical Feasibility Review

**Reviewed:** 2025-12-20
**Status:** Issues Identified - Action Required

---

## Executive Summary

Review of all OpenSpec documents identified **23 feasibility concerns** across 8 specification categories. The most serious issues involve:

1. **LLM limitations** - Assuming LLMs can do things they can't reliably do
2. **Scale/performance** - Token budgets, storage, computation costs
3. **Implementation complexity** - Features that would be extremely difficult to build
4. **Logical contradictions** - Specs that conflict with each other

---

## Critical Issues (Must Redesign)

### 1. Polyphonic Communication

**File:** `conversation-system.md` (REQ-CONV-017)

**The Problem:** Dual-voice species require two voices speaking *simultaneously* within 5-10ms tolerance. LLMs generate one token stream at a time.

**Why It's Unfixable:**
- Cannot generate two perfectly synchronized streams
- LLM response times vary 100ms-5s, not 5-10ms precision
- No way to verify "harmonic" quality programmatically

**Recommendation:** Redesign as:
- Sequential statement pairs ("First voice says X, second confirms")
- Single LLM call generating both voices in notation, split at render
- Accept desynchronization as interesting failure mode

---

### 2. Millisecond Cognition (AI Minds)

**File:** `game-engine/spec.md` (REQ-ENG-003), `player-system/spec.md` (REQ-PLY-020)

**The Problem:** AI Minds think 1000x faster than humans. This means:
- 1 second game time = 1000 subjective seconds for them
- Would require 1000x more LLM calls per game tick
- Playing as AI Mind: everything feels frozen

**Why It's Unfixable:**
- Cannot actually run 1000x more LLM calls
- "Waiting" is the opposite of interesting gameplay
- No practical interaction with normal-speed entities

**Recommendation:**
- Remove as playable option
- If kept as NPCs, process them at normal speed but *describe* them as faster
- Their "fast thinking" is flavor text, not simulation

---

### 3. Geological Timescale Memory

**File:** `memory-system.md`, `species-system.md`

**The Problem:** Beings that think in millennia and cannot perceive individual mortals.

**Why It's Unfixable:**
- LLM prompt says "you can't see individuals" but game engine passes individual agent states
- Accumulating observations for millennia creates massive storage
- Generational message relay requires tracking across hundreds of agents

**Recommendation:**
- Geological beings become environmental hazards, not full agents
- Pre-script their "observations" as flavor text
- Or: separate simplified state machine, not full agent system

---

### 4. Symbiont Inherited Memories (Scale)

**File:** `memory-system.md`

**The Problem:** Symbionts carry memories from all past hosts (potentially 400+ years, 50+ hosts).

**Why It's Unfixable:**
- Context window limits (~128k tokens max) can't hold 50 hosts' memories
- LLM generates inconsistent details about past lives
- Storage for hundreds of episodic memories per host hits limits

**Recommendation:**
- Limit to 3-5 most significant past hosts in active context
- Others require "deliberate journeying" (special action, not passive access)
- Use summative model: each host → personality traits + key skills, not detailed memories

---

### 5. Incomprehensible Aliens

**File:** `species-system.md`

**The Problem:** Some species are "truly incomprehensible" - cannot be understood even through translation.

**Why It's Unfixable:**
- LLM's purpose is generating comprehensible output
- Instruction "generate incomprehensible text" is self-contradictory
- Cannot verify output is genuinely incomprehensible vs. poorly written

**Recommendation:**
- Shift to **player-side ambiguity**, not LLM-side incomprehensibility
- Generate plausible alien dialogue with *translation uncertainty*
- Example: "The Watcher says: [could mean 'friendship' or 'contract' or 'consumption']"
- Translator degradation = more ambiguity, not actual confusion

---

## Major Issues (Simplify Before Implementation)

### 6. Pack Mind Coordination

**File:** `movement-intent.md`, `needs.md`

**The Problem:**
- 4-8 bodies × locations × task assignments = state explosion
- Single LLM call must decide for all bodies simultaneously
- Real-time coherence tracking across distances

**Mitigation:**
- Treat pack as single agent with "distributed body positions"
- Simplify coherence: hard distance limit, auto-movement if exceeded
- Limit to simple formations (cluster, line), not tactical maneuvers

---

### 7. Hive Mind Autonomy Contradiction

**File:** `needs.md`, `species-system.md`

**The Problem:** Specs oscillate between "workers are NPCs" and "workers are agents with reduced agency."

**Mitigation:**
- Tiered simulation:
  - Queen: Full agent system (LLM)
  - Cerebrates: Simplified agents (occasional LLM)
  - Workers: Pure behavioral rules (no LLM)

---

### 8. Post-Scarcity Needs (Undefined)

**File:** `needs.md`

**The Problem:** "Novelty" and "purpose" as survival-level needs are vague. What satisfies them? How measured?

**Mitigation:**
- Define concretely: novelty = new locations visited, new social combinations, specific challenge types
- Create explicit satisfaction actions with measurable outcomes
- Keep post-scarcity as optional "mod", not default

---

### 9. Hibernation Cycle Duration

**File:** `lifecycle-system.md`, `game-engine/spec.md`

**The Problem:** 35-year hibernation requires:
- Storing full entity snapshots
- Tracking 35 years of world history
- All NPCs remembering the hibernator was asleep

**Mitigation:**
- Limit to 1-5 year cycles for MVP
- Fast-forward tick processing, apply decay effects
- Pre-script major historical events for wakers to learn about

---

### 10. LLM Token Budget

**File:** All conversation-related specs

**The Problem:** Full conversations for 50+ agents:
- Each conversation: 2000-5000 tokens
- Frequent conversations: 50,000+ tokens/day just for dialogue
- Cost: $100+/month at modest scale

**Mitigation:**
- Full conversations only when: player present, relationship-critical, or information-critical
- Most interactions abstracted: "A and B chatted" (relationship +1, no LLM)
- Batch and cache conversations

---

### 11. Multi-Timescale Engine

**File:** `game-engine/spec.md`

**The Problem:** Supporting 5+ timescales (millisecond → geological) simultaneously.

**Mitigation:**
- Start with 2 scales: realtime + slow (hibernating)
- Defer millisecond/geological to post-launch experimental
- Require explicit translation between scales (message passing, not direct interaction)

---

### 12. Pheromone "Cannot Lie" Enforcement

**File:** `conversation-system.md`

**The Problem:** LLMs will simply lie if not explicitly constrained. Constraint may fail.

**Mitigation:**
- Pre-check: before dialogue, run "can this be a lie?" verification
- Fallback: if LLM contradicts pheromone signals, assume listener read pheromone correctly
- For critical moments, use deterministic dialogue trees

---

### 13. Dominance Economy Chaos

**File:** `economy-system.md`

**The Problem:**
- Every tick potentially has resource theft
- "Taking from weaker is expected" creates death spiral
- Player being repeatedly robbed is not fun

**Mitigation:**
- Deterministic tribute rules: "subordinates pay 20% daily to superiors"
- Tribute once per day, not continuously
- Allow rank challenges to create strategic depth
- Consider exempting player or making tribute central mechanic

---

## Moderate Issues (Implement with Constraints)

### 14. Gift Economy Obligation Networks

**Mitigation:** Binary obligations (owe favor or don't), fixed expiration, deterministic fulfillment rules.

### 15. Temporal Mismatch Conversations

**Mitigation:** Pre-script generational messages, templated degradation, only for story moments.

### 16. Cross-Species Psychology

**Mitigation:** Restrict cross-species initially, explicit translation rules in prompts, simpler profiles for non-humans.

### 17. Symbiont Consciousness Conflicts

**Mitigation:** Simplify to host + symbiont-as-advisor, or require explicit perspective choice each turn.

### 18. Spatial Memory Location Sharing

**Mitigation:** Abstract locations ("near the river"), deterministic accuracy verification.

### 19. Chronicler Written Works

**Mitigation:** Pre-defined templates, limited to few per year, simplified pricing.

### 20. Research Balance

**Mitigation:** Pre-define tech trees, generate only within slots, hard caps on power.

### 21. Playing as Geological/AI

**Mitigation:** Defer to post-launch experimental modes, test extensively before shipping.

---

## Minor Issues (Simplify)

### 22. Pheromone Physics

**Mitigation:** Binary presence in area, multiplier for conditions, skip diffusion simulation.

### 23. Cross-Species Social Signals

**Mitigation:** Pre-defined common misinterpretations, familiarity reduces errors, toggleable.

---

## Summary Table

| Issue | Severity | Action |
|-------|----------|--------|
| Polyphonic communication | CRITICAL | Redesign to sequential |
| Millisecond cognition | CRITICAL | Remove as playable |
| Geological memory | CRITICAL | Simplify to environmental |
| Symbiont memory scale | CRITICAL | Limit to 3-5 hosts |
| Incomprehensible aliens | CRITICAL | Shift to player ambiguity |
| Pack mind coordination | MAJOR | Simplify formations |
| Hive autonomy | MAJOR | Tiered simulation |
| Post-scarcity needs | MAJOR | Define concretely |
| Hibernation duration | MAJOR | Limit to 1-5 years |
| Token budget | MAJOR | Aggressive abstraction |
| Multi-timescale | MAJOR | Start with 2 scales |
| Pheromone lying | MAJOR | Pre-check + fallback |
| Dominance economy | MAJOR | Deterministic tribute |

---

## Recommended Implementation Order

### Phase 1: Core MVP (Tractable)
- Standard human-like agents
- Basic needs system (Maslow hierarchy)
- Simple memory (episodic + spatial, no inheritance)
- Individual consciousness only
- Currency-based economy
- Single timescale

### Phase 2: Moderate Aliens (With Constraints)
- Pack minds (limited bodies, simple formations)
- Hive minds (tiered simulation)
- Hibernation (1-5 year cycles)
- Gift/barter economies

### Phase 3: Experimental (Post-Launch)
- Symbiont consciousness (limited hosts)
- Multiple timescales (2-3 max)
- Cross-species interactions
- Post-scarcity economies

### Phase 4: Deferred Indefinitely
- Millisecond cognition playable
- Geological being playable
- True polyphonic communication
- Incomprehensible aliens as full agents
- 35+ year hibernation

---

## Cross-Cutting Recommendations

### LLM Consistency

Many features depend on LLM consistently following instructions:
- Man'chi species shouldn't mention friendship
- Pack minds shouldn't contemplate individual survival
- Hive workers shouldn't make independent decisions

**Solution:** Use deterministic rules for hard constraints. Accept some inconsistency as "personality variation." Test extensively with target model.

### Token Budget Management

Implement aggressive cost controls:
- Batch all LLM calls per tick
- Cache common conversation patterns
- Abstract background agent interactions
- Set daily token caps with graceful degradation

### Storage Limits

Browser storage (IndexedDB) has limits:
- Don't store full episodic memories for all agents
- Summarize and compress old memories
- Archive inactive agents to server if available

---

## Specs Requiring Updates

| Spec | Required Changes |
|------|------------------|
| `species-system.md` | Add feasibility notes to millisecond/geological sections |
| `conversation-system.md` | Redesign polyphonic, add pheromone pre-check |
| `memory-system.md` | Add symbiont memory limits, simplify geological |
| `needs.md` | Define post-scarcity needs concretely |
| `game-engine/spec.md` | Simplify multi-timescale to 2-3 supported |
| `player-system/spec.md` | Mark geological/AI Mind as experimental |
| `economy-system.md` | Add deterministic dominance rules |
| `lifecycle-system.md` | Limit hibernation to 5 years |

---

## Conclusion

The OpenSpec vision is creative and ambitious. Core gameplay (agents, needs, work, social) is tractable. Most risks come from:
- Alien consciousness systems
- Multi-scale temporal mechanics
- Memory systems at scale

**Recommendation:** Ship strong MVP with human-like agents, then experiment with alien features as post-launch additions. This allows core game to succeed while leaving room for innovation.
