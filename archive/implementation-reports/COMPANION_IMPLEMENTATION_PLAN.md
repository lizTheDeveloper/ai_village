# Ophanim Companion System - Implementation Plan

**Status:** Draft Plan (awaiting approval)
**Created:** 2026-01-02
**Spec:** `openspec/specs/companion-system/spec.md`

---

## Overview

Implement the Ophanim Companion - a celestial guide that evolves alongside the player's civilization. The companion provides:
- Tutorial/knowledge system (RAG-powered)
- Emotional AI companion with evolution tiers
- Governor visibility into civilization state
- Memory and needs simulation
- Plotline hooks for narrative content

---

## Architecture Decision

### Core Components

1. **OphanimimCompanionEntity** (entity factory)
   - Creates the companion entity
   - Sets up initial components (identity, position, renderable, memory, conversation, needs)
   - Tags: `companion`, `ophanim`, `divine`, `immortal`, `conversational`

2. **CompanionComponent** (new component)
   ```typescript
   class CompanionComponent extends ComponentBase {
     type = 'companion';
     evolutionTier: 0 | 1 | 2 | 3 | 4 | 5;
     currentEmotion: string;
     trustScore: number;
     firstDimensionalBreach: 'time' | 'universe' | null;
     sessionCount: number;
     playerMemories: PlayerMemory[];
     companionMemories: SelfMemory[];
   }
   ```

3. **CompanionSystem** (new system)
   - Tracks civilization milestones
   - Triggers evolution at session end
   - Updates emotional state based on events
   - Manages needs (connection, purpose, rest, stimulation, appreciation)
   - Priority: 950 (runs late, after most systems)

4. **CompanionKnowledgeSystem** (new system)
   - RAG-powered knowledge base
   - Indexes game documentation at startup
   - Answers player questions
   - Priority: 960 (on-demand, not every tick)

5. **CompanionChatPanel** (new UI panel)
   - Chat interface similar to DivineChatPanel
   - Shows companion sprite with current emotion
   - Displays companion messages and responses
   - Input field for player questions
   - Evolution animation display

---

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)

**Goal:** Basic companion entity exists and renders

**Tasks:**
1. Create `CompanionComponent.ts` with state tracking
2. Create `OphanimimCompanionEntity.ts` factory
3. Create `CompanionSystem.ts` with stub update loop
4. Copy sprite assets to `packages/renderer/src/sprites/companion/`
5. Register component type in `ComponentType.ts`
6. Register system in game loop

**Verification:**
- Companion entity spawns at game start
- Companion renders with Tier 0 sprite
- No console errors

**Files:**
- `packages/core/src/components/CompanionComponent.ts` (new)
- `packages/core/src/companions/OphanimimCompanionEntity.ts` (new)
- `packages/core/src/systems/CompanionSystem.ts` (new)
- `packages/core/src/types/ComponentType.ts` (edit)
- `packages/renderer/src/sprites/companion/` (new directory + assets)

---

### Phase 2: Evolution Tracking (Milestone Detection)

**Goal:** Companion detects civilization milestones and evolves

**Tasks:**
1. Implement milestone detection in `CompanionSystem`:
   - Tier 0→1: First baby born
   - Tier 1→2: Goddess of Wisdom manifests
   - Tier 2→3: First universe/time travel
   - Tier 3→4: Second dimensional travel
   - Tier 4→5: Universe creation
2. Add session tracking (increment on save/load)
3. Add evolution ritual logic (visual transformation)
4. Update sprite based on evolution tier
5. Emit events for evolution moments

**Verification:**
- First baby triggers Tier 1 evolution
- Goddess appearance triggers Tier 2
- Portal usage triggers Tier 3/4
- Evolution emits event and updates sprite

**Files:**
- `packages/core/src/systems/CompanionSystem.ts` (edit)
- `packages/core/src/companions/CompanionMilestones.ts` (new - milestone tracking)

---

### Phase 3: Emotion System (Expression)

**Goal:** Companion shows emotions based on events

**Tasks:**
1. Create emotion mapping system:
   - Map sprite files to emotion states
   - Load emotion tier JSON manifest
2. Implement emotion triggers:
   - React to deaths (sad, pensive)
   - React to births (happy, joyful)
   - React to disasters (alarmed, concerned)
   - React to achievements (impressed, proud)
3. Add emotion state machine with transitions
4. Implement cooldowns to prevent rapid emotion changes

**Verification:**
- Companion shows appropriate emotion for events
- Emotion transitions smoothly
- Different tiers have different emotional ranges

**Files:**
- `packages/core/src/companions/EmotionSystem.ts` (new)
- `packages/core/src/companions/emotion-manifest.json` (copy from Downloads)
- `packages/core/src/systems/CompanionSystem.ts` (edit - integrate emotions)

---

### Phase 4: UI Panel (Chat Interface)

**Goal:** Player can see and interact with companion

**Tasks:**
1. Create `CompanionChatPanel.ts`:
   - Canvas-based rendering like DivineChatPanel
   - Display companion sprite (animated)
   - Show companion messages
   - Input field for player questions
   - Scrollable message history
2. Add to WindowManager
3. Implement click regions for interaction
4. Add keyboard shortcuts (toggle panel)

**Verification:**
- Panel renders companion sprite
- Companion sends greeting message
- Panel can be toggled with hotkey
- Messages scroll properly

**Files:**
- `packages/renderer/src/CompanionChatPanel.ts` (new)
- `packages/renderer/src/WindowManager.ts` (edit - register panel)
- `packages/renderer/src/InputHandler.ts` (edit - add hotkey)

---

### Phase 5: Knowledge System (RAG)

**Goal:** Companion can answer questions about the game

**Tasks:**
1. Create documentation indexer:
   - Parse markdown files from `custom_game_engine/*.md`
   - Parse spec files from `openspec/specs/`
   - Create simple keyword index (no vector DB needed initially)
2. Create `CompanionKnowledgeSystem.ts`:
   - Search indexed docs
   - Build context for LLM
   - Generate response via LLMProvider
3. Integrate with chat panel:
   - Player types question
   - System searches docs
   - LLM generates helpful response
   - Response appears in chat

**Verification:**
- Player asks "how do I build?"
- Companion finds building docs
- Companion explains in character
- Response is relevant and helpful

**Files:**
- `packages/core/src/companions/DocumentationIndex.ts` (new)
- `packages/core/src/systems/CompanionKnowledgeSystem.ts` (new)
- `packages/core/src/companions/KnowledgeQueries.ts` (new)

---

### Phase 6: Governor Visibility (Civilization Awareness)

**Goal:** Companion sees civilization state and offers advice

**Tasks:**
1. Add governor query methods to CompanionSystem:
   - Query all villagers (needs, mood, tasks)
   - Query resources (stocks, production, consumption)
   - Query buildings (status, construction)
   - Query social dynamics (relationships, conflicts)
2. Implement pattern detection:
   - Low food warning
   - Social conflict brewing
   - Construction stalled
   - Population issues
3. Add proactive advice system:
   - Companion notices pattern
   - Waits for appropriate moment
   - Offers advice in chat
   - Throttle to avoid spam

**Verification:**
- Food drops below 3 days, companion warns
- Conflict escalates, companion alerts
- Stuck construction, companion suggests fix

**Files:**
- `packages/core/src/systems/CompanionSystem.ts` (edit - add queries)
- `packages/core/src/companions/PatternDetector.ts` (new)
- `packages/core/src/companions/AdvisorySystem.ts` (new)

---

### Phase 7: Memory & Needs (Personalization)

**Goal:** Companion remembers player and has own needs

**Tasks:**
1. Implement player memory system:
   - Track player preferences
   - Record conversation history
   - Remember promises made
   - Store nicknames/terms
2. Implement companion needs:
   - Connection: decays when player doesn't interact
   - Purpose: satisfied by being helpful
   - Rest: mental energy for responses
   - Stimulation: new experiences
   - Appreciation: player valuing advice
3. Needs affect behavior:
   - Low connection: more chatty, seeks attention
   - Low purpose: offers more advice
   - Low rest: shorter responses
   - Low stimulation: suggests exploration
   - Low appreciation: becomes withdrawn if ignored

**Verification:**
- Companion remembers player called village "Cozytown"
- Companion gets chatty after long silence
- Companion references past conversations
- Needs visibly affect behavior

**Files:**
- `packages/core/src/components/CompanionComponent.ts` (edit - add memory structures)
- `packages/core/src/companions/PlayerMemory.ts` (new)
- `packages/core/src/companions/CompanionNeeds.ts` (new)
- `packages/core/src/systems/CompanionSystem.ts` (edit - update needs)

---

### Phase 8: Plotline Hooks (Narrative Integration)

**Goal:** Companion participates in story moments

**Tasks:**
1. Create plotline trigger system:
   - First loss: companion grieves with player
   - Prophecy: companion hints at ascension
   - Betrayal: companion reacts to dark acts
   - Partnership: deepening friendship
   - Return: reunion after absence
2. Add special dialogue for trigger events
3. Emit events for plotline triggers
4. Track plotline state in component

**Verification:**
- First villager death triggers grief dialogue
- Divine contact triggers prophecy hints
- Long absence triggers reunion dialogue

**Files:**
- `packages/core/src/companions/PlotlineTriggers.ts` (new)
- `packages/core/src/companions/SpecialDialogue.ts` (new)
- `packages/core/src/systems/CompanionSystem.ts` (edit - integrate plotlines)

---

### Phase 9: Persistence (Save/Load)

**Goal:** Companion state persists across sessions

**Tasks:**
1. Add CompanionComponent to serialization
2. Implement session counting on load
3. Preserve evolution tier
4. Preserve memories
5. Preserve needs state
6. Handle migration for existing saves (no companion → spawn companion)

**Verification:**
- Save game, reload, companion remembers conversation
- Evolution tier persists
- Session count increments
- Memories preserved

**Files:**
- `packages/core/src/serialization/ComponentSerializers.ts` (edit)
- `packages/core/src/persistence/SaveLoadService.ts` (edit - migration)

---

### Phase 10: Polish & Tuning

**Goal:** Companion feels alive and valuable

**Tasks:**
1. Tune emotion transition timings
2. Tune needs decay rates
3. Tune advice frequency (avoid spam)
4. Add idle animations
5. Add typing indicators for responses
6. Add subtle particle effects for evolution
7. Improve response quality (prompt engineering)
8. Add Easter eggs and personality quirks

**Verification:**
- Companion feels natural, not robotic
- Advice is helpful, not annoying
- Emotions feel appropriate
- Evolution moments are special
- Players want to interact with companion

---

## Technical Considerations

### Performance

**Concerns:**
- RAG search could be slow
- LLM calls add latency
- Governor queries every tick expensive

**Solutions:**
- Cache documentation index at startup
- Throttle knowledge system (only on player question)
- Cache governor queries (update every 60 ticks)
- Use lightweight emotion state machine
- Async LLM calls don't block game loop

### Sprite Asset Organization

**Source:** `~/Downloads/extracted_ophanim_v2/`
**Destination:** `packages/renderer/src/sprites/companion/`

**Structure:**
```
companion/
├── golden/          # Tier 0 sprites (6 directional)
├── tier1/           # Tier 1 emotions (4 sprites)
├── tier2/           # Tier 2 emotions (9 sprites)
├── tier3/           # Tier 3 emotions (10 sprites)
├── tier4/           # Tier 4 emotions (8 sprites)
├── tier5/           # Tier 5 emotions (5 sprites)
└── manifest.json    # Emotion mappings
```

### Event Integration

**Events the companion should listen for:**
- `baby_born` → Tier 0→1 evolution
- `goddess_wisdom_manifest` → Tier 1→2 evolution
- `portal_first_use` → Tier 2→3 evolution (track type)
- `time_travel_first` → Tier 2→3 or 3→4 evolution
- `universe_created` → Tier 4→5 evolution
- `agent_died` → Sad emotion
- `building_complete` → Happy emotion
- `relationship_formed` → Loving emotion
- `combat_started` → Alarmed emotion

### LLM Integration

**Provider:** Use existing `LLMProvider` interface
**Model:** Default to MLX/Ollama for local inference
**Context Window:** 8k tokens (keep short for speed)

**Prompt Structure:**
```
You are {companion.name}, a celestial ophanim companion to the player.
Your current emotion: {companion.emotion}
Your evolution tier: {companion.tier}

Player question: {player_input}

Relevant documentation: {rag_context}

Respond in character as a helpful, wise guide. Be concise.
```

---

## Dependencies

**Systems that must exist:**
- ✅ `WisdomGoddessSystem` (for Tier 1→2 trigger)
- ✅ `PortalSystem` (for Tier 2→3 trigger)
- ✅ `ReproductionSystem` (for Tier 0→1 trigger)
- ✅ `LLMProvider` (for knowledge responses)
- ✅ `EventBus` (for milestone detection)

**New systems to create:**
- CompanionSystem
- CompanionKnowledgeSystem

**New components to create:**
- CompanionComponent

**New UI panels to create:**
- CompanionChatPanel

---

## Testing Strategy

### Unit Tests
- CompanionComponent serialization
- Emotion state transitions
- Milestone detection logic
- Documentation indexing
- Memory storage/retrieval

### Integration Tests
- Evolution triggers end-to-end
- RAG query → LLM → response pipeline
- Save/load companion state
- UI panel rendering

### Manual Testing
- Play through first baby birth → verify Tier 1 unlock
- Trigger Goddess of Wisdom → verify Tier 2 unlock
- Use portal → verify Tier 3 unlock
- Ask companion questions → verify helpful responses
- Ignore companion → verify needs affect behavior

---

## Risk Mitigation

### Risk: RAG search is slow
**Mitigation:** Use simple keyword index initially, not vector search. Optimize later if needed.

### Risk: LLM responses are poor quality
**Mitigation:** Iterate on prompt engineering. Fall back to canned responses if LLM unavailable.

### Risk: Companion feels robotic
**Mitigation:** Add personality quirks, idle dialogue, Easter eggs. Tune emotional responses carefully.

### Risk: Evolution triggers don't fire
**Mitigation:** Extensive logging. Emit debug events. Add dev panel to manually trigger evolution.

### Risk: Performance impact
**Mitigation:** Throttle systems. Cache queries. Profile and optimize hot paths.

---

## Success Criteria

**The companion system is successful if:**
1. ✅ Companion appears at game start (Tier 0)
2. ✅ Evolution triggers fire for all milestones
3. ✅ Emotions visually change and feel appropriate
4. ✅ RAG system answers questions helpfully
5. ✅ Governor visibility provides useful advice
6. ✅ Companion remembers player across sessions
7. ✅ Needs system makes companion feel alive
8. ✅ Plotlines integrate naturally
9. ✅ No significant performance degradation
10. ✅ Players report feeling guided and befriended

---

## Open Questions

1. **Where should companion physically appear in world?**
   - Option A: Floating near player camera (UI-only entity)
   - Option B: Actual world entity that follows player
   - **Recommendation:** UI-only for now, world entity in future

2. **How chatty should companion be?**
   - Option A: Only speaks when asked
   - Option B: Proactively comments on events
   - **Recommendation:** Mix of both, with throttling

3. **Should companion be optional/toggleable?**
   - Option A: Always present
   - Option B: Can be disabled in settings
   - **Recommendation:** Always present but can minimize panel

4. **Purple octopus companion alternate?**
   - Option A: Implement later as unlockable
   - Option B: Ignore for now
   - **Recommendation:** Ignore for MVP, add as DLC/easter egg

---

## Implementation Timeline (Estimate)

**Phase 1-3:** Core + Evolution + Emotions = 2-3 sessions
**Phase 4:** UI Panel = 1 session
**Phase 5:** RAG Knowledge = 1-2 sessions
**Phase 6:** Governor Visibility = 1 session
**Phase 7:** Memory & Needs = 1 session
**Phase 8:** Plotlines = 1 session
**Phase 9:** Persistence = 1 session
**Phase 10:** Polish = ongoing

**Total:** 8-12 sessions (~40-60 hours)

---

## Next Steps

1. **Approve this plan** - User review and approval
2. **Phase 1** - Build core infrastructure
3. **Iterate** - Implement phases incrementally
4. **Test** - Verify each phase before proceeding
5. **Polish** - Tune and refine until it feels alive
