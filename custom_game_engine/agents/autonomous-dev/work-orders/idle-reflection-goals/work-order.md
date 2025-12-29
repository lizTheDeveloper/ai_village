# Work Order: Idle Behaviors & Personal Goals

**Phase:** Agent Behavior (Independent)
**Created:** 2025-12-28
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_IMPLEMENTATION

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/idle-reflection-goals/spec.md`
- **Related Specs:**
  - `openspec/specs/agent-system/spec.md` (Agent behavior)
  - `work-orders/skill-system/progressive-skill-reveal-spec.md` (Skill affinities)

---

## Requirements Summary

The system SHALL implement personality-driven idle behaviors and personal goal formation:

1. The system SHALL select varied idle behaviors based on mood and personality
2. The system SHALL trigger reflection during quiet moments or after significant events
3. The system SHALL generate personal goals during reflection based on personality affinities
4. The system SHALL track goal progress and milestones
5. The system SHALL include goals in agent prompt context
6. The system SHALL allow agents to chat casually during idle time
7. The system SHALL allow agents to amuse themselves in personality-appropriate ways
8. The system SHALL allow agents to sit quietly when content

---

## Acceptance Criteria

### Criterion 1: Varied Idle Behavior Selection
- **WHEN:** An agent has no urgent needs or tasks
- **THEN:** The agent SHALL select from: reflect, chat, amuse_self, observe, sit_quietly, practice_skill, wander_aimlessly
- **AND:** Selection SHALL be weighted by personality and mood
- **Verification:** Track idle behavior distribution; expect <30% pure "idle"

### Criterion 2: Reflection Triggers
- **WHEN:** An agent completes a significant task (building, meaningful conversation)
- **OR WHEN:** An agent hasn't reflected in >1 game day
- **OR WHEN:** It's evening/night and agent is idle
- **THEN:** Reflection behavior SHALL be weighted more heavily
- **Verification:** Monitor reflection frequency; expect 1-3x per game day

### Criterion 3: Goal Generation During Reflection
- **WHEN:** An agent reflects and has fewer than 3 personal goals
- **THEN:** There SHALL be a chance (30%) to form a new goal
- **AND:** Goal category SHALL be weighted by personality traits
- **Verification:** Check GoalsComponent; 80%+ agents should have goals by day 3

### Criterion 4: Goal-Personality Alignment
- **WHEN:** A goal is generated
- **THEN:** The goal category SHALL match the agent's highest personality traits
- **Examples:**
  - High conscientiousness + work ethic → Mastery or Security goals
  - High openness → Creative or Exploration goals
  - High extraversion + agreeableness → Social goals
- **Verification:** Manual review of goal-personality correlation

### Criterion 5: Goal Progress Tracking
- **WHEN:** An agent completes an action that advances a goal
- **THEN:** The goal's progress SHALL be updated
- **AND:** Completed milestones SHALL be recorded
- **Verification:** Observe goal progress updates in GoalsComponent

### Criterion 6: Goals in Prompt Context
- **WHEN:** An agent's prompt is built
- **THEN:** Personal goals SHALL appear in a dedicated section
- **AND:** Goals SHALL include progress and motivation
- **Verification:** Grep prompts for goal content

### Criterion 7: Mood-Driven Behavior Selection
- **WHEN:** An agent selects an idle behavior
- **THEN:** Their current mood SHALL influence the selection:
  - Joyful → chat, amuse_self weighted higher
  - Sad → reflect, sit_quietly weighted higher
  - Lonely → chat weighted much higher
  - Bored → wander, practice_skill weighted higher
- **Verification:** Track behavior selection by mood state

### Criterion 8: Internal Monologue Generation
- **WHEN:** An agent is reflecting, amusing themselves, or sitting quietly
- **THEN:** An internal monologue SHALL be generated
- **AND:** The monologue SHALL be visible in the agent info panel
- **Verification:** Check AgentInfoPanel for internal thoughts during idle

### Criterion 9: Casual Chat Behavior
- **WHEN:** An agent selects chat_idle behavior
- **THEN:** The conversation SHALL be casual and personality-driven
- **AND:** Topics SHALL reflect mood (happy: share good news; stressed: seek support)
- **Verification:** Review conversation logs during idle chat

---

## System Integration

### Existing Systems Affected
| System | File | Integration Type |
|--------|------|-----------------|
| PersonalityComponent | `packages/core/src/components/PersonalityComponent.ts` | Read (for goal generation) |
| MemoryComponent | `packages/core/src/components/MemoryComponent.ts` | Read (for reflection) |
| NeedsComponent | `packages/core/src/components/NeedsComponent.ts` | Read (for mood state) |
| StructuredPromptBuilder | `packages/llm/src/StructuredPromptBuilder.ts` | Modified (add goal context) |
| AgentInfoPanel | `packages/renderer/src/AgentInfoPanel.ts` | Modified (show internal monologue) |
| BehaviorRegistry | `packages/core/src/behavior/BehaviorRegistry.ts` | Extended (new behaviors) |

### New Components Needed
- `GoalsComponent` - tracks personal goals, milestones, progress

### New Behaviors Needed
- `ReflectBehavior` - introspection and goal formation
- `ChatIdleBehavior` - casual conversation when bored
- `AmuseSelfBehavior` - personality-appropriate self-entertainment
- `ObserveBehavior` - watch surroundings, gather information
- `SitQuietlyBehavior` - contentment without activity
- `PracticeSkillBehavior` - work on skills without pressure

### New Functions/Methods Needed
- `selectIdleBehavior(context: IdleBehaviorContext): IdleBehavior`
- `generatePersonalGoal(personality, skills): PersonalGoal`
- `performReflection(agent, memories): ReflectionResult`
- `generateInternalMonologue(behavior, personality, mood): string`
- `getMoodBehaviorWeights(mood): Record<IdleBehavior, number>`
- `updateGoalProgress(agent, completedAction): void`

### Events
- **Emits:** `agent:reflection_complete`, `agent:goal_formed`, `agent:goal_milestone`, `agent:goal_completed`
- **Listens:** `agent:action_complete` (for goal progress), `time:evening` (for reflection trigger)

---

## Files Likely Modified

### Core Components (4 files)
- `packages/core/src/components/GoalsComponent.ts` - NEW
- `packages/core/src/components/index.ts` - Export GoalsComponent

### Behaviors (6 files)
- `packages/core/src/behavior/behaviors/ReflectBehavior.ts` - NEW
- `packages/core/src/behavior/behaviors/ChatIdleBehavior.ts` - NEW
- `packages/core/src/behavior/behaviors/AmuseSelfBehavior.ts` - NEW
- `packages/core/src/behavior/behaviors/ObserveBehavior.ts` - NEW
- `packages/core/src/behavior/behaviors/SitQuietlyBehavior.ts` - NEW
- `packages/core/src/behavior/behaviors/PracticeSkillBehavior.ts` - NEW

### Systems (2 files)
- `packages/core/src/systems/IdleBehaviorSystem.ts` - NEW (selects idle behavior)
- `packages/core/src/systems/ReflectionSystem.ts` - Modified (integrate goal formation)

### LLM Integration (2 files)
- `packages/llm/src/StructuredPromptBuilder.ts` - Add goal context section
- `packages/llm/src/AgentContextBuilder.ts` - Include goals in context

### Renderer (1 file)
- `packages/renderer/src/AgentInfoPanel.ts` - Show internal monologue, goals

---

## Implementation Phases

### Phase 1: GoalsComponent & Basic Structure (3-4 hours)
1. Create GoalsComponent with goal tracking
2. Define PersonalGoal interface and goal categories
3. Add GoalsComponent to agent creation
4. Export from index.ts

### Phase 2: Idle Behavior Selection (4-5 hours)
1. Create IdleBehaviorSystem
2. Implement selectIdleBehavior with personality/mood weights
3. Create stub behaviors for each idle type
4. Integrate with existing behavior system

### Phase 3: Reflection Behavior (4-5 hours)
1. Implement ReflectBehavior with memory review
2. Add reflection trigger conditions
3. Implement generateInternalMonologue
4. Connect to existing ReflectionSystem

### Phase 4: Goal Generation (4-5 hours)
1. Implement generatePersonalGoal with personality weights
2. Create goal templates for each category
3. Add goal formation during reflection
4. Implement goal progress tracking

### Phase 5: Prompt Integration (3-4 hours)
1. Add goal section to StructuredPromptBuilder
2. Include goal progress and motivation
3. Modify idle decision prompts
4. Add reflection prompts

### Phase 6: Other Idle Behaviors (4-5 hours)
1. Implement ChatIdleBehavior (casual conversation)
2. Implement AmuseSelfBehavior (personality-driven)
3. Implement SitQuietlyBehavior (contentment)
4. Implement PracticeSkillBehavior (skill work)

### Phase 7: UI & Polish (3-4 hours)
1. Show internal monologue in AgentInfoPanel
2. Show personal goals in agent details
3. Tune behavior selection weights
4. Test emergent behavior patterns

**Total Estimated Time:** 25-32 hours

---

## Notes for Implementation Agent

### Key Design Principles

1. **Crash on Missing Data, Not Fallbacks:** Per CLAUDE.md, do not use fallback values to mask missing personality or mood data.

2. **No Debug Console Logs:** Per CLAUDE.md, use the Agent Dashboard for debugging.

3. **Component Type Naming:** Use lowercase_with_underscores: `'goals'`, not `'Goals'`.

4. **Goals Feel Personal:** Goals should read like personal aspirations, not quests. "Become a skilled builder" not "Build 5 structures".

5. **Mood Influence is Subtle:** Mood should bias behavior selection, not dictate it. A sad agent CAN still chat if they're very extraverted.

6. **Reflection is Internal:** The LLM generates the internal monologue, but it's not spoken aloud. It appears in the agent info panel.

7. **Idle Behaviors Are Low Priority:** All idle behaviors should have priority 0.1-0.3 so they yield to actual needs.

### Integration Gotchas

1. **MoodComponent vs NeedsComponent:** Currently mood may be derived from needs. Check where mood state lives before implementing.

2. **Behavior System:** The existing behavior system uses priorities. Idle behaviors need to integrate smoothly without breaking urgency detection.

3. **Memory for Reflection:** Reflection reviews memories. Ensure MemoryComponent has the methods needed to filter by recency and significance.

4. **Goal Progress Detection:** Detecting "action advances goal" requires mapping actions to goal categories. Start simple (build action → mastery goals).

### Common Pitfalls to Avoid

1. **Over-frequent Reflection:** Don't trigger reflection too often. 1-3x per game day is plenty.

2. **Mechanical Goals:** Avoid goals that sound like game objectives. "Build a cabin" is fine; "Complete building task #47" is not.

3. **Mood Whiplash:** Mood changes should be gradual. Don't flip from "joyful" to "sad" instantly.

4. **Idle Spam:** If truly nothing to do, agents should be able to idle for extended periods without rapid behavior switching.

---

## Notes for Playtest Agent

### What to Verify

1. **Behavior Variety:** Watch agents during downtime. Do they do different things? Or always the same?

2. **Goal Relevance:** Check agent goals. Do they match their personality? A builder should have building goals.

3. **Reflection Timing:** When do agents reflect? Should feel natural - after work, in evening, not randomly.

4. **Internal Monologue Quality:** Are the thoughts interesting? Do they reveal character?

5. **Casual Chat:** When agents chat while idle, is it casual or task-focused? Should feel relaxed.

### Edge Cases to Test

1. **No Goals Agent:** What if goal generation never triggers? Agent should still function.

2. **All Goals Completed:** What happens when all goals are done? Should be able to form new ones.

3. **Conflicting Mood/Personality:** High extravert but sad mood - what happens? Should lean toward seeking support.

4. **Night Time Behavior:** Are agents appropriately quiet at night? More reflection, less wandering.

### Success Indicators

- Agents feel like they have "inner lives"
- Downtime doesn't feel like dead time
- Goals match personality and persist across sessions
- Playtesters describe agents as "having personality" during idle time

---

## Success Definition

This work order is **COMPLETE** when:

1. ✅ GoalsComponent tracks 1-5 personal goals per agent
2. ✅ Goals are generated during reflection based on personality
3. ✅ 80%+ of agents have at least one goal by day 3
4. ✅ Goal categories correlate with personality traits
5. ✅ Idle behavior selection uses 7+ different behaviors
6. ✅ <30% of idle time is pure "idle" behavior
7. ✅ Reflection occurs 1-3x per game day during idle periods
8. ✅ Mood influences behavior selection
9. ✅ Internal monologue appears in agent info panel
10. ✅ Goals appear in agent prompts with progress
11. ✅ Build passes: `npm run build` completes without errors
12. ✅ Tests pass: All new unit tests and integration tests pass
13. ✅ Playtest verification: Agents feel "alive" during downtime

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Goals feel mechanical | Medium | High | Write goals as aspirations, not quests |
| Mood system doesn't exist | Medium | Medium | Derive mood from needs if needed |
| Reflection too frequent | Low | Medium | Strict cooldowns and triggers |
| Behavior switching too fast | Medium | Medium | Add minimum duration for idle behaviors |
| Performance overhead | Low | Low | Goals and idle selection are lightweight |

---

## Questions for Human Review

1. **Goal Persistence:** Should goals persist across save/load? Probably yes.

2. **Goal Sharing:** Should agents tell each other about their goals? Could create interesting dynamics.

3. **Failed Goals:** What happens when a goal becomes impossible? (e.g., "befriend Oak" but Oak dies)

4. **Goal Limits:** Is 3-5 goals the right range? Too few feels empty, too many feels scattered.

5. **Mood Source:** Is there already a mood system, or should we derive mood from needs?

---

**End of Work Order**

Next Step: Hand off to Test Agent for test case development, then Implementation Agent.
