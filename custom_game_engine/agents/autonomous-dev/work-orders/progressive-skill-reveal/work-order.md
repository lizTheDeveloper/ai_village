# Work Order: Progressive Skill Reveal

**Phase:** Skill System (Independent)
**Created:** 2025-12-28
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/skill-system/progressive-skill-reveal-spec.md`
- **Supporting Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/skill-system/spec.md`
- **Related Specs:**
  - `openspec/specs/agent-system/spec.md` (LLM decision making)
  - `openspec/specs/construction-system/spec.md` (building requirements)
  - `openspec/specs/items-system/spec.md` (crafting recipes)

---

## Requirements Summary

The system SHALL implement skill-gated prompt context and entity visibility:

1. The system SHALL generate 1-3 random starting skills (level 1-2) for each agent based on personality affinities
2. The system SHALL filter nearby entities based on skill level and type
3. The system SHALL provide skill-appropriate context depth in LLM prompts
4. The system SHALL gate action availability based on skill requirements
5. The system SHALL filter building blueprints based on skill level
6. The system SHALL extend entity perception radius based on skill level
7. The system SHALL provide strategic suggestions only to skilled agents in relevant domains
8. The system SHALL display agent skills as affordances to other agents with social skill
9. The system SHALL gate building ownership designation by building skill level

---

## Acceptance Criteria

### Criterion 1: Random Starting Skills
- **WHEN:** An agent is created with a personality component
- **THEN:** The agent SHALL receive 1-3 skills at level 1 or 2, selected from their highest personality affinities
- **Verification:** Inspect SkillsComponent on newly created agents; verify 80%+ have at least one skill >0

### Criterion 2: Entity Visibility Filtering
- **WHEN:** An agent's prompt is built
- **THEN:** Only entities appropriate to their skill levels SHALL appear in the nearby entities list
- **Examples:**
  - Level 0 gathering: only sees berry bushes and basic resources
  - Level 3 farming: sees medicinal plants and soil quality
  - Level 4 building: sees rare ore deposits
- **Verification:** Check StructuredPromptBuilder output for agents with different skill levels

### Criterion 3: Skill-Gated Information Depth
- **WHEN:** An agent with cooking skill level N views food information
- **THEN:** The information detail SHALL match the level N specification:
  - Level 0: "There is food in storage" or "No food stored"
  - Level 1: Raw item counts
  - Level 2: Categorized inventory + consumption awareness
  - Level 3: Days remaining analytics
  - Level 4: Strategic suggestions (shortage warnings)
  - Level 5: Full strategic overview with spoilage risk
- **Verification:** Compare prompt food sections for agents with different cooking levels

### Criterion 4: Action Filtering by Skill
- **WHEN:** Available actions are determined for an agent
- **THEN:** Only actions the agent has sufficient skill for SHALL appear
- **Examples:**
  - `build` action requires building skill ≥ 0
  - `craft` action requires crafting skill ≥ 1
  - `tame` action requires animal_handling skill ≥ 2
- **Verification:** Check action lists for unskilled vs skilled agents

### Criterion 5: Tiered Building System
- **WHEN:** Building blueprints are shown to an agent
- **THEN:** Only buildings with skill requirements ≤ agent's building skill SHALL appear
- **Tiers:**
  - Level 0: lean-to, campfire, storage-chest, workbench
  - Level 1: wooden-cabin, well, farm-plot
  - Level 2: granary, workshop, animal-pen
  - Level 3: stone-house, smithy, barn
  - Level 4+: town-hall, temple, fortress
- **Verification:** Compare building lists for builders of different skill levels

### Criterion 6: Skill-Based Perception Radius
- **WHEN:** Nearby entities are collected for an agent's context
- **THEN:** The search radius for skill-relevant entities SHALL scale with skill level:
  - Level 0: ~5 tiles (adjacent)
  - Level 1: ~15 tiles (nearby)
  - Level 2: ~30 tiles (local area)
  - Level 3: ~50 tiles (extended)
  - Level 4: ~100 tiles (region-wide)
  - Level 5: Map-wide awareness
- **Verification:** Test entity visibility at different distances for different skill levels

### Criterion 7: Strategic Suggestions by Skill Domain
- **WHEN:** Strategic instructions are generated
- **THEN:** Only agents with skill level ≥ 2 in a domain SHALL receive domain-specific strategic advice
- **Examples:**
  - Building 2+: "Village needs a well"
  - Cooking/Farming 2+: "Food supplies critically low"
  - Unskilled: "Look around and see what needs doing"
- **Verification:** Grep strategic instructions for skilled vs unskilled agents

### Criterion 8: Agents as Affordances
- **WHEN:** An agent with social skill ≥ 2 views another agent
- **THEN:** The other agent's skills SHALL appear in context based on social skill level:
  - Social 1: Vague impressions ("seems handy")
  - Social 2: Primary skill identified ("good at building")
  - Social 3: Skill levels visible ("skilled builder level 3")
  - Social 4+: Expertise and strategic value
- **Verification:** Check agent context sections for observers with different social levels

### Criterion 9: Building Ownership Designation
- **WHEN:** A skilled builder (level 2+) completes a building
- **THEN:** They SHALL see ownership designation options (communal, personal, shared, restricted)
- **WHEN:** An unskilled builder (level 0-1) completes a building
- **THEN:** The building defaults to communal with no designation prompt
- **Verification:** Test building completion with skilled and unskilled builders

### Criterion 10: Experience-Based Time Estimates
- **WHEN:** An agent views a build/craft option they have NEVER completed before
- **THEN:** NO time estimate SHALL be shown (they don't know how long it takes)
- **WHEN:** An agent views a build/craft option they have completed at least once
- **THEN:** Their last completion time SHALL be shown: "last time: [X]"
- **Implementation:** Track `lastBuildTime`/`lastCraftTime` per building/recipe in `taskFamiliarity`
- **Verification:** Check prompts for agents before and after their first build/craft of each type

### Criterion 11: No False Collaboration Requirements
- **WHEN:** An agent's prompt includes building/crafting options
- **THEN:** The prompt SHALL NOT suggest collaboration is required for simple structures
- **Examples of what NOT to say:**
  - "You'll need help to build this" (for workbench, lean-to, etc.)
  - "Find someone to collaborate with"
  - "This requires teamwork"
- **WHEN:** A skilled builder (level 3+) views large structures (town-hall, fortress)
- **THEN:** They MAY see optional efficiency hints: "help would speed this up"
- **Verification:** Grep prompts for collaboration language; ensure it only appears for high-skill agents viewing large structures

---

## System Integration

### Existing Systems Affected
| System | File | Integration Type |
|--------|------|-----------------|
| SkillsComponent | `packages/core/src/components/SkillsComponent.ts` | Extended (add `generateRandomStartingSkills()`) |
| StructuredPromptBuilder | `packages/llm/src/StructuredPromptBuilder.ts` | Modified (skill-gated sections) |
| AgentEntity | `packages/world/src/entities/AgentEntity.ts` | Modified (use random starting skills) |
| BuildingBlueprintRegistry | `packages/core/src/buildings/BuildingBlueprintRegistry.ts` | Extended (add `skillRequired` field) |
| VisionComponent | `packages/core/src/components/VisionComponent.ts` | Modified (skill-based entity filtering) |
| ActionDefinitions | `packages/llm/src/ActionDefinitions.ts` | Extended (add skill requirements) |
| SkillContextTemplates | `packages/llm/src/SkillContextTemplates.ts` | Already exists ✓ |
| SkillSystem | `packages/core/src/systems/SkillSystem.ts` | Already exists ✓ |

### New Components Needed
- None (all components already exist)

### New Functions/Methods Needed
- `generateRandomStartingSkills(personality: PersonalityComponent): SkillsComponent` in SkillsComponent.ts
- `filterEntitiesBySkill(entities: Entity[], skills: SkillsComponent): Entity[]` in StructuredPromptBuilder.ts
- `buildFoodSection(storage, population, cookingSkill): string` in StructuredPromptBuilder.ts
- `buildBuildingSection(buildings, buildingSkill): string` in StructuredPromptBuilder.ts
- `buildResourceSection(storage, gatheringSkill): string` in StructuredPromptBuilder.ts
- `getAvailableActions(agent, skills): ActionDefinition[]` in ActionDefinitions.ts
- `getAvailableBuildings(buildingSkill): BuildingBlueprint[]` in BuildingBlueprintRegistry.ts
- `getPerceptionRadius(skill: SkillLevel): number` utility function
- `generateStrategicInstruction(agent, villageState, skills): string` in StructuredPromptBuilder.ts

### Events
- **Emits:** None (uses existing skill:xp_gain and skill:level_up events)
- **Listens:** None

---

## UI Requirements

**No UI changes required for this feature.** All changes are backend prompt engineering:
- Entity filtering happens before prompt construction
- Skill-gated information appears in existing text prompts
- Action lists are filtered before showing to LLM
- Building lists use existing UI with filtered data

Future enhancement: Add "Skill Requirements" tooltip to building placement UI showing why certain buildings are unavailable.

---

## Files Likely Modified

### Core Components (7 files)
- `packages/core/src/components/SkillsComponent.ts` - Add `generateRandomStartingSkills()`
- `packages/core/src/components/VisionComponent.ts` - Add skill-based entity filtering
- `packages/core/src/buildings/BuildingBlueprintRegistry.ts` - Add `skillRequired` field to blueprints
- `packages/world/src/entities/AgentEntity.ts` - Use random starting skills on creation

### LLM Integration (2 files)
- `packages/llm/src/StructuredPromptBuilder.ts` - Major refactor for skill-gated sections
- `packages/llm/src/ActionDefinitions.ts` - Add skill requirements to actions

### Building Definitions (~5 files)
- `packages/core/src/buildings/index.ts` - Add skill requirements to all blueprint registrations
- Any individual building definition files that need skill gates

---

## Implementation Phases

### Phase 1: Random Starting Skills (Foundation) - 2-3 hours
**Files:** SkillsComponent.ts, AgentEntity.ts

1. Implement `generateRandomStartingSkills(personality)` function:
   - Calculate affinities from personality
   - Sort skills by affinity (highest natural talent first)
   - Select 1-3 top skills randomly
   - Assign level 2 if affinity >1.5, else level 1
2. Update `AgentEntity.ts` creation to use personality-based skill generation
3. Test: Create 20 agents, verify skill diversity

### Phase 2: Skill-Gated Information (Prompt Context) - 8-10 hours
**Files:** StructuredPromptBuilder.ts

1. Implement `buildFoodSection()` with cooking skill gradients (9 levels as specified)
2. Implement `buildBuildingSection()` with building skill gradients (6 levels)
3. Implement `buildResourceSection()` with gathering skill gradients (6 levels)
4. Refactor `buildWorldContext()` to use skill-gated sections
5. Test: Generate prompts for agents with different skill levels, verify information depth

### Phase 3: Entity Visibility Filtering - 6-8 hours
**Files:** StructuredPromptBuilder.ts, new utility module

1. Create entity visibility rules per skill per level (as specified in section 2.1-2.10)
2. Implement `filterEntitiesBySkill(entities, skills)`:
   - Check entity type against skill visibility rules
   - Apply perception radius based on skill level
   - Return filtered entity list
3. Integrate filtering into prompt builder's entity gathering
4. Test: Verify Level 0 agent doesn't see medicinal herbs, Level 3+ does

### Phase 4: Skill-Gated Actions (Action Filtering) - 4-5 hours
**Files:** ActionDefinitions.ts, StructuredPromptBuilder.ts

1. Define `UNIVERSAL_ACTIONS` array (wander, idle, rest, sleep, eat, drink, talk, follow, gather)
2. Define `SKILL_GATED_ACTIONS` with skill requirements:
   - build → building 0
   - plant → farming 1
   - craft → crafting 1
   - cook → cooking 1
   - tame → animal_handling 2
   - heal → medicine 2
3. Implement `getAvailableActions(agent, skills)` filter
4. Test: Verify unskilled agent doesn't see "craft" action

### Phase 5: Tiered Buildings (Building Requirements) - 5-6 hours
**Files:** BuildingBlueprintRegistry.ts, individual building files

1. Add `skillRequired?: { skill: SkillId, level: SkillLevel }` to BuildingBlueprint interface
2. Update all building registrations with skill requirements (as specified in section 6):
   - Level 0: lean-to, campfire, storage-chest, workbench
   - Level 1: wooden-cabin, well, farm-plot, etc.
   - Level 2-4: progressive tiers
3. Implement `getAvailableBuildings(buildingSkill)` filter
4. Update building affordance section in prompt builder
5. Test: Verify Level 0 builder sees 4 buildings, Level 2 sees 10+

### Phase 6: Perception Radius Scaling - 3-4 hours
**Files:** StructuredPromptBuilder.ts, new utility module

1. Create `getPerceptionRadius(skillLevel)` function:
   - Level 0: 5 tiles
   - Level 1: 15 tiles
   - Level 2: 30 tiles
   - Level 3: 50 tiles
   - Level 4: 100 tiles
   - Level 5: map-wide
2. Modify entity gathering to use skill-specific radius for relevant entity types
3. Test: Place rare herb 40 tiles away, verify Level 0 gatherer doesn't see it, Level 3+ does

### Phase 7: Strategic Suggestions (Instruction Generation) - 5-6 hours
**Files:** StructuredPromptBuilder.ts

1. Implement `generateStrategicInstruction(agent, villageState, skills)`:
   - Building skill 2+: infrastructure gap analysis
   - Cooking/Farming 2+: food shortage warnings
   - Gathering 1+: resource needs
   - Unskilled: basic survival instructions
2. Replace global strategic advice with skill-gated suggestions
3. Test: Verify only skilled builders see "village needs a well" message

### Phase 8: Task Coordination (Duplicate Prevention) - 3-4 hours
**Files:** StructuredPromptBuilder.ts

1. Implement `buildTaskAwarenessSection(agent, inProgress, planned)`:
   - Require building skill 2+ to see village-wide construction status
   - Show "currently being built" and "planned" lists
   - Add "no need to duplicate" note
2. Test: Verify reduced concurrent same-type building starts

### Phase 9: Agents as Affordances - 4-5 hours
**Files:** StructuredPromptBuilder.ts

1. Implement social-skill-based agent perception in buildWorldContext():
   - Social 0: Just names
   - Social 1: Vague skill impressions
   - Social 2: Primary skill identified
   - Social 3: Skill levels visible
   - Social 4+: Strategic value assessment
2. Add "Available Through Relationships" section showing accessible affordances
3. Test: Verify social 3 agent sees other agents' skill levels

### Phase 10: Building Ownership Designation - 5-6 hours
**Files:** BuildingComponent.ts, BuildingSystem.ts, StructuredPromptBuilder.ts

1. Add ownership fields to BuildingComponent:
   - `ownershipType: 'communal' | 'personal' | 'shared' | 'restricted'`
   - `ownerId?: EntityId`
   - `sharedWith?: EntityId[]`
2. Add ownership designation logic in BuildingSystem on completion
3. Show ownership options to builders with skill 2+
4. Enforce access restrictions in building usage checks
5. Test: Verify skilled builder sees ownership prompt, unskilled doesn't

**Total Estimated Time:** 45-55 hours (1.5-2 weeks for a single developer)

---

## Notes for Implementation Agent

### Key Design Principles

1. **Crash on Missing Data, Not Fallbacks:** Per CLAUDE.md, do not use fallback values to mask missing skill data. If a skill level is needed and missing, throw a clear error.

2. **No Debug Console Logs:** Per CLAUDE.md, do NOT add console.log statements. Use the Agent Dashboard (http://localhost:8766/) for debugging instead.

3. **Component Type Naming:** Per CLAUDE.md, component type strings use lowercase_with_underscores: `'skills'`, not `'Skills'`.

4. **Existing Infrastructure:** The core skill system (SkillsComponent, SkillSystem, SkillContextTemplates) already exists. This work order focuses on extending prompt context and entity visibility based on those skills.

5. **LLM Sees Actions, Not Mechanics:** Agents see "You can craft: bread, axe" not "You need a workbench to craft." The behavior system handles finding the workbench. Keep prompts focused on what agents can DO, not how the ECS implements it.

6. **Gradual Information Reveal:** Each skill level should provide noticeably more detail than the previous level. Reference section 2.1-2.10 of the spec for exact wording at each level.

7. **Time Estimates are Experience-Based:** Agents do NOT innately know how long things take. Time estimates are only shown for tasks the agent has completed at least once. Use `taskFamiliarity` in SkillsComponent to track `lastBuildTime` and `lastCraftTime` per recipe/building type. New tasks show NO time estimate.

8. **Building/Crafting is Solo by Default:** Agents should NOT believe they need collaboration for basic builds or crafts. Simple structures (workbench, lean-to, campfire) are solo activities. Only high-skill builders (level 3+) understand that help CAN speed up large projects, but it's never REQUIRED. This prevents agents from getting stuck waiting for help on simple tasks.

### Integration Gotchas

1. **Personality Affinities:** The `createSkillsComponentFromPersonality()` function already exists and creates affinities. The new `generateRandomStartingSkills()` should use these affinities to determine starting levels.

2. **Building Registry:** The BuildingBlueprintRegistry.ts uses a `register()` method. Adding a `skillRequired` field means updating ~20-30 building registrations across multiple files.

3. **Vision System:** The VisionComponent tracks `entitiesInRange`. Entity filtering happens in the prompt builder, NOT in the vision system itself. Vision still sees everything; the prompt builder decides what to tell the LLM.

4. **Action Availability:** The ACTION_DEFINITIONS array in ActionDefinitions.ts contains all possible actions. Create a filter function that checks skill requirements before passing actions to the prompt.

5. **Prompt Length:** Adding skill-gated sections will increase prompt size. Keep level 0-2 descriptions brief (1-2 sentences). Only provide detailed multi-paragraph context at level 3+.

### Testing Strategy

1. **Unit Tests:** Create test agents with specific skill levels and verify:
   - Food section output matches expected format
   - Entity lists are filtered correctly
   - Action availability matches skill requirements

2. **Integration Tests:** Run simulation with mixed-skill agents and verify:
   - Skilled builders construct 60%+ of buildings
   - Strategic suggestions go to appropriate agents
   - Duplicate building attempts reduced by 50%+

3. **Visual Inspection:** Use the Agent Dashboard to view live prompts for different agents and verify skill-appropriate context.

### Common Pitfalls to Avoid

1. **Over-filtering:** Don't hide ALL buildings from unskilled agents. They should still see what exists in the village, just not be able to build complex ones.

2. **Inconsistent Tiers:** Ensure the skill requirement on a building matches its complexity. A "stone-house" shouldn't require less skill than a "wooden-cabin".

3. **Social Perception Edge Cases:** If agent A has social skill 3 and views agent B's skills, but agent B is a stranger (low relationship), limit what's revealed. Relationship level gates skill visibility.

4. **Performance:** Filtering 100+ entities every tick could be expensive. Consider caching filtered entity lists with invalidation on skill level-up.

---

## Notes for Playtest Agent

### What to Verify

1. **Emergent Role Specialization:**
   - Do agents naturally fall into roles based on their starting skills?
   - Does the skilled builder do most of the building?
   - Does the skilled cook manage food?

2. **Reduced Duplicate Efforts:**
   - Are multiple agents still building the same thing simultaneously?
   - If yes, is the task awareness section showing up for skilled builders?

3. **Strategic Advice Appropriateness:**
   - Are unskilled agents getting overwhelmed with village analytics they can't act on?
   - Are skilled agents getting useful, actionable suggestions?

4. **Skill Progression Feel:**
   - Does leveling up a skill noticeably improve the agent's prompts?
   - Can you see the difference between a Level 1 and Level 3 builder's decision-making?

5. **Entity Visibility:**
   - Place a medicinal herb 20 tiles from an agent
   - Verify Level 0 farming agent doesn't mention it
   - Verify Level 3+ farming agent notices and considers gathering it

### Edge Cases to Test

1. **Zero-Skill Agents:** What happens if an agent spawns with no skills above 0?
   - Should still function with basic survival actions
   - Should receive simple, survival-focused prompts

2. **Max-Skill Agents:** Manually set an agent to Level 5 in all skills.
   - Prompt should be comprehensive but not overwhelming
   - Should see all entities, all buildings, all actions

3. **Cross-Skill Entities:** Place an ore deposit (requires gathering 2 + building 2).
   - Agent with only gathering 3: sees "ore deposit, could be useful"
   - Agent with both skills 2+: sees "iron ore, yields ~30 ingots for smithing"

4. **Building with Insufficient Skill:** If an agent somehow attempts to build a level 3 building with level 1 skill (shouldn't happen but test anyway), what fails gracefully?

### Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Skill diversity | 80%+ agents have 1+ skill >0 | Check agent SkillsComponents on spawn |
| Role specialization | Skilled agents do 60%+ of domain actions | Track building/crafting completion by skill level |
| Duplicate reduction | <10% of buildings have concurrent starts | Log building starts, check for overlaps |
| Strategic targeting | 90%+ suggestions go to skilled agents | Grep prompts for strategic advice, check recipient skills |
| Prompt clarity | Agents act on skill-appropriate info | Manual review: do actions make sense given skill level? |

### Known Limitations

1. **Teaching Not Implemented:** Agents can't teach each other yet. That's Phase 3 of the skill system spec (not this work order).

2. **No Skill Decay:** Skills are permanent. An agent who reaches Expert building stays Expert forever, even if they never build again.

3. **Ownership Designation:** Building ownership is implemented but there's no UI to change it post-construction. Agents can only set ownership on completion.

4. **Cross-Skill Synergies:** The spec defines synergies (e.g., "Farm to Table" for gathering+farming+cooking) but they're not implemented yet. Focus on single-skill gates for now.

---

## Dependencies

**Upstream (must be complete before starting):**
- SkillsComponent ✅ (already exists)
- SkillSystem ✅ (already exists)
- StructuredPromptBuilder ✅ (already exists)
- PersonalityComponent ✅ (already exists)

**Downstream (blockers for other work):**
- None - this feature is self-contained

**Optional Enhancements (not blocking):**
- Skill teaching system (future Phase 3)
- Cross-skill synergies (future Phase 4)
- Skill-based action efficiency modifiers (future Phase 5)

---

## Success Definition

This work order is **COMPLETE** when:

1. ✅ Agents spawn with 1-3 random starting skills based on personality
2. ✅ Entity visibility filters based on skill level and type
3. ✅ Food/building/resource sections show skill-appropriate detail
4. ✅ Action lists filter based on skill requirements
5. ✅ Building blueprints filter based on building skill level
6. ✅ Perception radius scales with skill level for relevant entities
7. ✅ Strategic suggestions only go to skilled agents in each domain
8. ✅ Agents with social skill see other agents' skills as affordances
9. ✅ Skilled builders can designate building ownership
10. ✅ Time estimates only shown for tasks agent has completed before
11. ✅ No false collaboration requirements in prompts for simple structures
12. ✅ Build passes: `npm run build` completes without errors
13. ✅ Tests pass: All new unit tests and existing integration tests pass
14. ✅ Playtest verification: Emergent role specialization observed in 30+ minute simulation

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Prompt length explosion | Medium | High | Keep level 0-2 sections brief; only expand at 3+ |
| Performance from entity filtering | Medium | Medium | Cache filtered lists; invalidate on level-up |
| Over-specialization (agents stuck in roles) | Low | Medium | Ensure universal actions always available |
| Confusing prompts for low-skill agents | Low | High | Test prompts manually; ensure clarity |
| Breaking existing behavior | Low | Critical | Run full test suite; 48hr soak test |

---

## Questions for Human Review

1. **Starting Skill Distribution:** Is 1-3 skills the right range? Should some agents start with 0 skills (completely unskilled)?

2. **Perception Radius Balance:** Are the radius values (5, 15, 30, 50, 100 tiles) reasonable given typical village size?

3. **Building Ownership:** Should there be a way to transfer ownership post-construction, or is set-once-on-build sufficient?

4. **Cross-Skill Entities:** When an entity requires multiple skills (e.g., ore deposit = gathering 2 + building 2), should the agent need BOTH skills or just ONE to see it?

---

**End of Work Order**

Next Step: Hand off to Test Agent for test case development.
