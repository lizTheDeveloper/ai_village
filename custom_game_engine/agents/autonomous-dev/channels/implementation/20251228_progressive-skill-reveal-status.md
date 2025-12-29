# Progressive Skill Reveal - Implementation Status

**Date:** 2025-12-28
**Phase:** Progressive Skill Reveal System
**Status:** IN-PROGRESS

---

## Completed Items ✅

### 1. Random Starting Skills (Foundation)
- ✅ `generateRandomStartingSkills()` implemented in SkillsComponent.ts:873-956
  - Generates 1-3 skills at level 1-2 based on personality affinities
  - Uses weighted selection from highest affinity skills
  - Sets XP to match level thresholds
- ✅ AgentEntity.ts updated to use `generateRandomStartingSkills()` (line 157, 293)
- ✅ Includes personality-based affinities mapping

### 2. Building Ownership System
- ✅ BuildingComponent.ts has ownership fields (lines 83-88)
  - `ownerId`, `ownerName`, `accessType`, `sharedWith`
  - Defaults to `accessType: 'communal'`
- ✅ `canAccessBuilding()` function implemented (lines 388-402)
  - Checks communal/personal/shared access rights

### 3. Skill-Gated Entity Visibility (Functions)
- ✅ `getPerceptionRadius()` implemented (SkillsComponent.ts:968-978)
  - Level 0: 5 tiles, Level 5: 200 tiles
- ✅ `ENTITY_SKILL_VISIBILITY` mapping (lines 984-1010)
  - Maps entity types to required skill levels
- ✅ `isEntityVisibleWithSkill()` function (lines 1016-1036)
- ✅ `filterVisibleEntities()` function (lines 1041-1073)
  - Combines skill level + distance filtering

### 4. Skill-Gated Information Depth (Functions)
- ✅ `getFoodStorageInfo()` implemented (lines 1084-1129)
  - 5 levels of detail from "There's food" to strategic insights
- ✅ `getVillageInfo()` implemented (lines 1140-1210)
  - 5 levels of building information detail

### 5. Skill-Gated Actions (Functions)
- ✅ `getAvailableActions()` implemented (lines 1223-1267)
  - Returns action list filtered by skill requirements
  - Universal actions always available
  - Skill-gated actions require minimum levels

### 6. Building Skill Requirements
- ✅ `SkillRequirement` interface defined in BuildingBlueprintRegistry.ts (lines 43-47)
- ✅ All building blueprints have `skillRequired` field
  - Level 0: workbench, campfire, storage-chest, town_hall, granary, weather_station, watchtower
  - Level 1: tent, bedroll, well, garden_fence, census_bureau, health_clinic, meeting_hall, labor_guild
  - Level 2: bed, forge, farm_shed, market_stall, windmill, archive
  - Level 3: workshop, barn, library, auto_farm
  - Level 4: warehouse, monument, trading_post
  - Level 5: grand_hall, arcane_tower, inventors_hall

### 7. Action Skill Requirements
- ✅ `ActionSkillRequirement` interface defined in ActionDefinitions.ts (lines 12-16)
- ✅ Action definitions include skill requirements:
  - `build` requires building 1
  - `till`, `farm`, `plant` require farming 1
  - `tame_animal`, `house_animal` require animal_handling 2

---

## Remaining Work 🔨

### 1. StructuredPromptBuilder Integration
The helper functions exist but are NOT integrated into the prompt builder yet.

**Need to:**
1. Use `getActionsForSkills()` to filter actions in `getAvailableActions()` method
2. Use `getFoodStorageInfo()` in `getStorageInfo()` method based on cooking skill
3. Use `getVillageInfo()` in `getSeenBuildingsInfo()` based on building skill
4. Use `filterVisibleEntities()` when collecting nearby entities
5. Implement agents-as-affordances section using social skill

### 2. Strategic Instruction Generation
**Need to:**
- Implement `generateStrategicInstruction()` function
- Only show domain suggestions to skilled agents (skill ≥ 2)
- Unskilled agents get basic survival instructions

### 3. Building List Filtering
**Need to:**
- Filter available buildings by agent's building skill level in prompt builder
- Show only buildings agent has sufficient skill to construct

---

## Next Steps

1. **Immediate:** Integrate skill-gated functions into StructuredPromptBuilder
   - Update `buildWorldContext()` to use `getFoodStorageInfo()`
   - Update `getAvailableActions()` to use `getActionsForSkills()`
   - Add entity filtering in nearby entities section
   - Add agents-as-affordances section

2. **Build & Test:** Run `npm run build` to verify no TypeScript errors

3. **Verification:** Create test agents with different skill levels and verify prompts

---

## Files Modified

### Core Components
- ✅ `packages/core/src/components/SkillsComponent.ts` - Added progressive skill reveal functions
- ✅ `packages/core/src/components/BuildingComponent.ts` - Added ownership fields
- ✅ `packages/core/src/buildings/BuildingBlueprintRegistry.ts` - Added skill requirements
- ✅ `packages/llm/src/ActionDefinitions.ts` - Added skill requirements
- ✅ `packages/world/src/entities/AgentEntity.ts` - Uses random starting skills

### Still Need to Modify
- 🔨 `packages/llm/src/StructuredPromptBuilder.ts` - Integrate all skill-gated functions

---

## Implementation Notes

### Design Decisions Made

1. **No Silent Fallbacks:** Per CLAUDE.md, all skill functions throw on missing data rather than using fallback values

2. **Component Type Naming:** Used `'skills'` (lowercase), not `'Skills'`, per CLAUDE.md guidelines

3. **Building Ownership Defaults:** All buildings default to `accessType: 'communal'` to maintain backward compatibility

4. **Perception Radius Scaling:** Conservative radius values to avoid overwhelming prompts with distant entities

5. **Action Filtering:** Universal actions (wander, rest, sleep, eat, drink, talk, follow, gather) always available regardless of skill

### Testing Strategy

1. **Skill Diversity Test:** Spawn 100 agents, verify 80%+ have skill > 0
2. **Entity Visibility Test:** Verify low-skill agents don't see rare resources
3. **Information Depth Test:** Compare prompts for agents with cooking skill 0 vs 3
4. **Action Filtering Test:** Verify unskilled agents don't see craft/build/tame actions
5. **Building Tier Test:** Verify skill 0 agent sees 4 buildings, skill 2 sees 10+

---

**Status:** Implementation ~75% complete. Core functions exist, need integration into prompt builder.

**Blockers:** None

**ETA to Completion:** 2-3 hours for StructuredPromptBuilder integration + testing
