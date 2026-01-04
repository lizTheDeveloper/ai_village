# Proposal: Work Order: Companion System (Phase 39)

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/companion-system

---

## Original Work Order

# Work Order: Companion System (Phase 39)

## Overview
Implement the Ophanim Companion - a celestial guide that evolves alongside the player's civilization. The companion provides tutorial/knowledge (RAG-powered), emotional AI companionship with evolution tiers, governor visibility into civilization state, memory and needs simulation, and plotline hooks for narrative content.

## Spec Reference
- **Primary Spec:** `openspec/specs/companion-system/spec.md`
- **Implementation Plan:** `COMPANION_IMPLEMENTATION_PLAN.md`
- **Phase:** 39
- **Priority:** HIGH
- **Status:** IN_PROGRESS (Phase 1 complete)

## Dependencies
- **Phase 6:** LLM Integration ✅ (for RAG and conversation)
- **Phase 27:** Divine Communication ✅ (similar chat UI pattern)
- **Related Systems:**
  - Reproduction System (Tier 0→1 trigger: first baby born)
  - Divinity System (Tier 1→2 trigger: Goddess of Wisdom manifests)
  - Portal System (Tier 2→3 trigger: first dimensional travel)
  - Multiverse System (universe creation for Tier 4→5)

## Requirements Summary

### Core Systems

1. **Knowledge System (RAG)**
   - Index all game documentation, specs, help text
   - Answer player questions about mechanics
   - Provide contextually relevant explanations
   - Adapt complexity to player experience level

2. **Evolution System (5 Tiers)**
   - **Tier 0 → 1:** First baby born (companion awakens)
   - **Tier 1 → 2:** Goddess of Wisdom manifests
   - **Tier 2 → 3:** First dimensional travel (universe OR time)
   - **Tier 3 → 4:** Second dimensional travel (completing the pair)
   - **Tier 4 → 5:** Civilization creates a universe
   - Evolution happens once per session at session end

3. **Emotional System (50+ emotions)**
   - Tier 0: Primordial (3 emotions: alert, serene, tranquil)
   - Tier 1: Awakening (4 emotions: neutral, happy, sad, angry)
   - Tier 2: Emotional Depth (9 emotions: joyful, crying, loving, amazed, focused, bored, exhausted, sick, sleepy)
   - Tier 3: Social Awareness (10 emotions: curious, playful, cool, smug, embarrassed, nervous, confused, impressed, chatty, aloof)
   - Tier 4: Emotional Complexity (8 emotions: forced_smile, overwhelmed, teary, pensive, melancholic, conflicted, side_eye, unimpressed)
   - Tier 5: Transcendent (5 emotions: nurturing, cozy, saudade, cringe, charming)

4. **Governor Visibility**
   - See all villager states, needs, relationships
   - Track resource flows, production, consumption
   - Monitor building status, construction progress
   - Observe social dynamics, conflicts, happiness
   - Proactively offer advice based on patterns

5. **Memory System**
   - Player memories (preferences, history, conversations, promises, nicknames)
   - Self-memory (emotional history, predictions, growth, bonds)
   - Persist across sessions and save files

6. **Needs System**
   - Connection (desire to interact, lonely if low)
   - Purpose (feeling useful, restless if low)
   - Rest (mental energy, exhausted if low)
   - Stimulation (new experiences, bored if low)
   - Appreciation (feeling valued, withdrawn if ignored)

7. **Plotline Hooks**
   - First loss (villager death → grief dialogue)
   - Prophecy (hints at ascension)
   - Betrayal (player destroys village)
   - Partnership (deep friendship)
   - Return (reunion after absence)

## Phase 1: Core Infrastructure ✅ COMPLETE
- [x] CompanionComponent created
- [x] OphanimimCompanionEntity factory created
- [x] CompanionSystem stub created
- [x] Component type registered
- [x] System registered in game loop

## Implementation Checklist (Phases 2-8 Remaining)

### Phase 2: Evolution Tracking (Milestone Detection)
- [ ] Implement milestone detection in CompanionSystem
  - [ ] Listen for `baby_born` event → Tier 0→1
  - [ ] Listen for `goddess_wisdom_manifest` event → Tier 1→2
  - [ ] Listen for `portal_first_use` event → Tier 2→3 (track type: universe or time)
  - [ ] Listen for second dimensional travel → Tier 3→4
  - [ ] Listen for `universe_created` event → Tier 4→5
- [ ] Add session tracking (increment on save/load)
- [ ] Add evolution ritual logic (visual transformation at session end)
- [ ] Update sprite based on evolution tier
- [ ] Emit events for evolution moments
- [ ] Create `packages/core/src/companions/CompanionMilestones.ts`
  - Milestone tracking logic
  - Session-end evolution check
  - Tier progression rules

### Phase 3: Emotion System (Expression)
- [ ] Create emotion mapping system
  - [ ] Map sprite files to emotion states
  - [ ] Load emotion tier JSON manifest
  - [ ] Copy emotion manifest from Downloads to codebase
- [ ] Implement emotion triggers
  - [ ] React to deaths (sad, pensive)
  - [ ] React to births (happy, joyful)
  - [ ] React to disasters (alarmed, concerned)
  - [ ] React to achievements (impressed, proud)
- [ ] Add emotion state machine with transitions
- [ ] Implement cooldowns to prevent rapid emotion changes
- [ ] Create `packages/core/src/companions/EmotionSystem.ts`
  - Emotion tier management
  - Emotion trigger evaluation
  - Emotion transition logic
- [ ] Integrate emotions into CompanionSystem update loop

### Phase 4: Memory & Needs (Personalization)
- [ ] Implement player memory system
  - [ ] Track player preferences (play style, focus areas)
  - [ ] Record conversation history
  - [ ] Remember promises made
  - [ ] Store nicknames/custom terms
- [ ] Implement companion needs simulation
  - [ ] Connection: decays when player doesn't interact
  - [ ] Purpose: satisfied by being helpful
  - [ ] Rest: mental energy for responses
  - [ ] Stimulation: new experiences
  - [ ] Appreciation: player valuing advice
- [ ] Needs affect behavior
  - [ ] Low connection → more chatty, seeks attention
  - [ ] Low purpose → offers more advice
  - [ ] Low rest → shorter responses
  - [ ] Low stimulation → suggests exploration
  - [ ] Low appreciation → becomes withdrawn
- [ ] Create `packages/core/src/companions/PlayerMemory.ts`
- [ ] Create `packages/core/src/companions/CompanionNeeds.ts`
- [ ] Update CompanionComponent with memory structures
- [ ] Update CompanionSystem to manage needs

### Phase 5: Knowledge System (RAG)
- [ ] Create documentation indexer
  - [ ] Parse markdown files from `custom_game_engine/*.md`
  - [ ] Parse spec files from `openspec/specs/`
  - [ ] Create keyword index (simple, not vector DB)
- [ ] Create CompanionKnowledgeSystem
  - [ ] Search indexed docs based on player query
  - [ ] Build context for LLM
  - [ ] Generate response via LLMProvider
  - [ ] Return helpful, in-character response
- [ ] Integrate with chat panel (Phase 6)
- [ ] Create `packages/core/src/companions/DocumentationIndex.ts`
- [ ] Create `packages/core/src/systems/CompanionKnowledgeSystem.ts`
- [ ] Create `packages/core/src/companions/KnowledgeQueries.ts`

### Phase 6: Chat UI (Player Interaction)
- [ ] Create CompanionChatPanel
  - [ ] Canvas-based rendering (like DivineChatPanel)
  - [ ] Display companion sprite (animated, emotion-based)
  - [ ] Show companion messages
  - [ ] Input field for player questions
  - [ ] Scrollable message history
- [ ] Add to WindowManager
- [ ] Implement click regions for interaction
- [ ] Add keyboard shortcuts (toggle panel)
- [ ] Add typing indicators for responses
- [ ] Create `packages/renderer/src/CompanionChatPanel.ts`
- [ ] Update `packages/renderer/src/WindowManager.ts`
- [ ] Update `packages/renderer/src/InputHandler.ts`

### Phase 7: Governor Visibility (Civilization Awareness)
- [ ] Add governor query methods to CompanionSystem
  - [ ] Query all villagers (needs, mood, tasks)
  - [ ] Query resources (stocks, production, consumption)
  - [ ] Query buildings (status, construction)
  - [ ] Query social dynamics (relationships, conflicts)
- [ ] Implement pattern detection
  - [ ] Low food warning (stocks < 3 days)
  - [ ] Social conflict brewing
  - [ ] Construction stalled
  - [ ] Population issues (unhappiness, overcrowding)
- [ ] Add proactive advice system
  - [ ] Companion notices pattern
  - [ ] Waits for appropriate moment
  - [ ] Offers advice in chat
  - [ ] Throttle to avoid spam
- [ ] Create `packages/core/src/companions/PatternDetector.ts`
- [ ] Create `packages/core/src/companions/AdvisorySystem.ts`

### Phase 8: Plotline Hooks (Narrative Integration)
- [ ] Create plotline trigger system
  - [ ] First loss: companion grieves with player
  - [ ] Prophecy: companion hints at ascension
  - [ ] Betrayal: companion reacts to dark acts
  - [ ] Partnership: deepening friendship
  - [ ] Return: reunion after absence
- [ ] Add special dialogue for trigger events
- [ ] Emit events for plotline triggers
- [ ] Track plotline state in component
- [ ] Create `packages/core/src/companions/PlotlineTriggers.ts`
- [ ] Create `packages/core/src/companions/SpecialDialogue.ts`

### Phase 9: Persistence (Save/Load)
- [ ] Add CompanionComponent to serialization
- [ ] Implement session counting on load
- [ ] Preserve evolution tier
- [ ] Preserve memories (player and self)
- [ ] Preserve needs state
- [ ] Handle migration for existing saves (no companion → spawn companion)
- [ ] Update `packages/core/src/serialization/ComponentSerializers.ts`
- [ ] Update `packages/core/src/persistence/SaveLoadService.ts`

### Phase 10: Polish & Tuning
- [ ] Tune emotion transition timings
- [ ] Tune needs decay rates
- [ ] Tune advice frequency (avoid spam)
- [ ] Add idle animations
- [ ] Add typing indicators for responses
- [ ] Add subtle particle effects for evolution
- [ ] Improve response quality (prompt engineering)
- [ ] Add Easter eggs and personality quirks

## Test Requirements

### Unit Tests
- [ ] CompanionComponent serialization
- [ ] Emotion state transitions
- [ ] Milestone detection logic
- [ ] Documentation indexing
- [ ] Memory storage/retrieval
- [ ] Needs decay and satisfaction

### Integration Tests
- [ ] Evolution triggers end-to-end (baby born → Tier 1)
- [ ] RAG query → LLM → response pipeline
- [ ] Save/load companion state
- [ ] UI panel rendering
- [ ] Governor queries return correct data
- [ ] Proactive advice triggers appropriately

### Manual Tests
- [ ] Play through first baby birth → verify Tier 1 unlock
- [ ] Trigger Goddess of Wisdom → verify Tier 2 unlock
- [ ] Use portal → verify Tier 3 unlock
- [ ] Ask companion questions → verify helpful responses
- [ ] Ignore companion → verify needs affect behavior
- [ ] Experience first villager death → verify grief dialogue

## Acceptance Criteria

1. **Companion appears at game start** (Tier 0, primordial state)
2. **Evolution triggers fire** for all 5 milestones
3. **Emotions visually change** and feel appropriate for events
4. **RAG system answers questions** helpfully and in-character
5. **Governor visibility provides useful advice** (food warnings, conflict alerts)
6. **Companion remembers player** across sessions (preferences, conversations)
7. **Needs system makes companion feel alive** (gets lonely, tired, bored)
8. **Plotlines integrate naturally** (grief, prophecy, reunion)
9. **No significant performance degradation** (<5% TPS impact)
10. **Players feel guided and befriended** (subjective but testable via feedback)

## Definition of Done

- [ ] All implementation checklist items (Phases 2-10) completed
- [ ] All test requirements passing
- [ ] All acceptance criteria met
- [ ] Code review completed
- [ ] Documentation updated in spec
- [ ] Sprite assets integrated (golden, rainbow, emotions)
- [ ] No console errors or warnings
- [ ] Performance impact acceptable
- [ ] Committed to version control

## Estimated Effort (Phases 2-10)
- **Lines of Code:** ~3,500 LOC total, ~2,500 LOC remaining
- **Time Estimate:** 25-30 hours remaining
- **Complexity:** Medium-High (LLM integration, RAG, emotion AI)

## Implementation Status

### Phase 1: Complete ✅
- CompanionComponent exists at `packages/core/src/components/CompanionComponent.ts`
- OphanimimCompanionEntity exists at `packages/core/src/companions/OphanimimCompanionEntity.ts`
- CompanionSystem exists (stub) at `packages/core/src/systems/CompanionSystem.ts`
- Component registered in ComponentType
- System registered in game loop

### Phases 2-10: Pending
All remaining phases are ready to begin. Recommended order:
1. Phase 2 (Evolution) - establishes progression
2. Phase 3 (Emotions) - makes companion visually expressive
3. Phase 6 (Chat UI) - enables player interaction
4. Phase 5 (RAG) - provides value to player
5. Phase 7 (Governor) - proactive helpfulness
6. Phase 4 (Memory/Needs) - personalization
7. Phase 8 (Plotlines) - narrative depth
8. Phase 9 (Persistence) - save/load
9. Phase 10 (Polish) - refinement

## Notes
- **Sprite assets** are in `~/Downloads/extracted_ophanim_v2/` - need to copy to `packages/renderer/src/sprites/companion/`
- **LLM integration** uses existing LLMProvider interface (MLX/Ollama for local)
- **Evolution is rare and meaningful** - most sessions won't trigger it, making it memorable
- **Emotions should feel natural** - avoid rapid changes, use cooldowns
- **Advice should be helpful, not annoying** - throttle proactive messages
- Future enhancements: Multiple companions, customization, companion quests, multiplayer companion interactions


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
