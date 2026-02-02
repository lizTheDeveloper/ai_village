# Tasks: companion-system

## Overview
Implement the Ophanim Companion - a celestial guide that evolves alongside the player's civilization. Features RAG-powered tutorial/knowledge, emotional AI with evolution tiers, governor visibility, memory/needs simulation, and plotline hooks.

**Estimated Effort:** 25-30 hours | **Lines of Code:** ~3,500 LOC | **Phase 1 Complete**

## Phase 1: Core Infrastructure (COMPLETE)

- [x] CompanionComponent created
- [x] OphanimimCompanionEntity factory created
- [x] CompanionSystem stub created
- [x] Component type registered
- [x] System registered in game loop

## Phase 2: Evolution Tracking (Milestone Detection)

- [ ] Implement milestone detection in CompanionSystem
  - [ ] Listen for `baby_born` event -> Tier 0->1
  - [ ] Listen for `goddess_wisdom_manifest` event -> Tier 1->2
  - [ ] Listen for `portal_first_use` event -> Tier 2->3 (track type: universe or time)
  - [ ] Listen for second dimensional travel -> Tier 3->4
  - [ ] Listen for `universe_created` event -> Tier 4->5
- [ ] Add session tracking (increment on save/load)
- [ ] Add evolution ritual logic (visual transformation at session end)
- [ ] Update sprite based on evolution tier
- [ ] Emit events for evolution moments
- [ ] Create `packages/core/src/companions/CompanionMilestones.ts`
  - Milestone tracking logic
  - Session-end evolution check
  - Tier progression rules

## Phase 3: Emotion System (Expression)

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

## Phase 4: Memory & Needs (Personalization)

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
  - [ ] Low connection -> more chatty, seeks attention
  - [ ] Low purpose -> offers more advice
  - [ ] Low rest -> shorter responses
  - [ ] Low stimulation -> suggests exploration
  - [ ] Low appreciation -> becomes withdrawn
- [ ] Create `packages/core/src/companions/PlayerMemory.ts`
- [ ] Create `packages/core/src/companions/CompanionNeeds.ts`
- [ ] Update CompanionComponent with memory structures
- [ ] Update CompanionSystem to manage needs

## Phase 5: Knowledge System (RAG)

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

## Phase 6: Chat UI (Player Interaction)

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

## Phase 7: Governor Visibility (Civilization Awareness)

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

## Phase 8: Plotline Hooks (Narrative Integration)

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

## Phase 9: Persistence (Save/Load)

- [ ] Add CompanionComponent to serialization
- [ ] Implement session counting on load
- [ ] Preserve evolution tier
- [ ] Preserve memories (player and self)
- [ ] Preserve needs state
- [ ] Handle migration for existing saves (no companion -> spawn companion)
- [ ] Update `packages/core/src/serialization/ComponentSerializers.ts`
- [ ] Update `packages/core/src/persistence/SaveLoadService.ts`

## Phase 10: Polish & Tuning

- [ ] Tune emotion transition timings
- [ ] Tune needs decay rates
- [ ] Tune advice frequency (avoid spam)
- [ ] Add idle animations
- [ ] Add typing indicators for responses
- [ ] Add subtle particle effects for evolution
- [ ] Improve response quality (prompt engineering)
- [ ] Add Easter eggs and personality quirks

## Testing

### Unit Tests
- [ ] CompanionComponent serialization
- [ ] Emotion state transitions
- [ ] Milestone detection logic
- [ ] Documentation indexing
- [ ] Memory storage/retrieval
- [ ] Needs decay and satisfaction

### Integration Tests
- [ ] Evolution triggers end-to-end (baby born -> Tier 1)
- [ ] RAG query -> LLM -> response pipeline
- [ ] Save/load companion state
- [ ] UI panel rendering
- [ ] Governor queries return correct data
- [ ] Proactive advice triggers appropriately

### Manual Tests
- [ ] Play through first baby birth -> verify Tier 1 unlock
- [ ] Trigger Goddess of Wisdom -> verify Tier 2 unlock
- [ ] Use portal -> verify Tier 3 unlock
- [ ] Ask companion questions -> verify helpful responses
- [ ] Ignore companion -> verify needs affect behavior
- [ ] Experience first villager death -> verify grief dialogue
