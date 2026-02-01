# Research System Integration Issues

**Date**: 2026-02-01
**Branch**: `claude/fix-research-agents-ly9Ke`
**Status**: ✅ Fix #1 implemented (guaranteed researchers)

## Summary

Agents are not researching due to multiple integration gaps between the research system components. The issues are architectural rather than marked TODOs - the individual components work correctly but don't connect properly at runtime.

## Critical Issues

### 1. Skill Prerequisite Chicken-and-Egg Problem

**Files**:
- `packages/llm/src/StructuredPromptBuilder.ts:2137`
- `packages/llm/src/ExecutorPromptBuilder.ts:596`
- `packages/core/src/components/SkillsComponent.ts:210`

**Problem**: Agents start with `research: 0` skill level, but the "research" action only appears when `research skill >= 1`. Agents can't research without research skill, can't gain research skill without researching.

```typescript
// Agents never see this action because they start at skill 0
if (researchSkill >= 1) {
  actions.push('research - Conduct research at a research building...');
}
```

**Fix Options**:
1. Grant initial research skill (level 1) to some agents at spawn
2. Lower skill requirement to 0 for basic research
3. Add alternative XP paths (reading, conversations, discoveries)

### 2. Building Registry Lazy Initialization

**File**: `packages/core/src/behavior/behaviors/ResearchBehavior.ts:127-136`

**Problem**: ResearchBehavior queries `world.buildingRegistry?.tryGet()` to find research buildings, but the registry is created lazily only when construction starts. Early game = no registry = no research buildings found.

```typescript
const blueprint = (world as WorldWithRegistry).buildingRegistry?.tryGet(buildingComp.buildingType);
if (!blueprint) continue; // Always skipped if registry doesn't exist yet
```

**Fix**: Initialize buildingRegistry eagerly in World constructor or GameLoop setup.

### 3. Lazy Activation Blocks System Startup

**File**: `packages/core/src/systems/ResearchSystem.ts:70`

**Problem**: ResearchSystem has `activationComponents = ['research_state']`, so it won't run until a `research_state` component exists. But the system creates this component - if it never runs, it never creates it.

```typescript
public readonly activationComponents = ['research_state'] as const;
```

**Fix**: Create `research_state` component during world initialization, or remove lazy activation from ResearchSystem.

### 4. Academic Paper System Disabled

**File**: `packages/core/src/systems/registerAllSystems.ts:849`

**Problem**: AcademicPaperSystem is registered as disabled, but ResearchSystem depends on it for paper publication.

```typescript
const academicPaperSystem = new AcademicPaperSystem();
registerDisabled(academicPaperSystem);  // <-- Won't run!
```

**Fix**: Enable AcademicPaperSystem by default, or make ResearchSystem function without it.

### 5. No Starter Research Buildings

**Files**: `packages/core/src/buildings/BuildingBlueprintRegistry.ts:875`

**Problem**: Research buildings (library, etc.) are registered but none are spawned at game start. Buildings require:
- Research unlocks (circular dependency)
- Resources (wood, stone)
- Construction time

**Fix**: Spawn a basic research building (tent/campfire library) at game initialization.

## Secondary Issues

### Slow Progress Rate

**File**: `packages/core/src/systems/ResearchSystem.ts:71,82`

- System throttled to every 200 ticks (10 seconds)
- `PROGRESS_PER_PAPER = 100` points per paper
- `BASE_RESEARCH_RATE = 1.0` point/second
- Tier 1 needs 2 papers = 200+ seconds minimum

### World Entity Attachment Strategy

**File**: `packages/core/src/systems/ResearchSystem.ts:564-584`

The system attaches `research_state` to the first available agent if no world entity exists. This could cause issues if that agent is removed.

## Files Analyzed

**Core Research**:
- `packages/core/src/research/ResearchSystem.ts` - Main research logic
- `packages/core/src/research/ResearchRegistry.ts` - Tech tree registry
- `packages/core/src/research/AcademicPaperSystem.ts` - Paper publication
- `packages/core/src/components/ResearchStateComponent.ts` - State tracking

**Behavior**:
- `packages/core/src/behavior/behaviors/ResearchBehavior.ts` - Agent research behavior

**Systems**:
- `packages/core/src/systems/ResearchSystem.ts` - System implementation
- `packages/core/src/systems/registerAllSystems.ts` - System registration

**LLM**:
- `packages/llm/src/StructuredPromptBuilder.ts` - Action filtering
- `packages/llm/src/ExecutorPromptBuilder.ts` - Action filtering

## Recommended Fix Priority

1. **HIGH**: Grant initial research skill OR lower requirement to 0
2. **HIGH**: Initialize buildingRegistry eagerly
3. **HIGH**: Create research_state at world init OR remove lazy activation
4. **MEDIUM**: Enable AcademicPaperSystem by default
5. **LOW**: Spawn starter research building
6. **LOW**: Tune progress rates for better gameplay

## Implemented Fixes

### Fix #1: Guaranteed Researcher Spawning (commit 53f426ab)

**Problem Solved**: Agents starting with `research: 0` couldn't see the research action.

**Solution**: Guarantee minimum researchers spawn with research skill level 1.

**Files Changed**:
- `packages/core/src/components/SkillsComponent.ts` - Added:
  - `generateSkillsWithGuaranteed(personality, guaranteedSkills)` - Creates skills with minimum levels
  - `calculateGuaranteedResearchers(populationSize)` - Scales researcher count with population

- `packages/agents/src/AgentEntity.ts` - Extended:
  - `WanderingAgentOptions.guaranteedSkills` - Option to force minimum skill levels
  - `createWanderingAgent()` now accepts guaranteed skills

- `packages/city-simulator/src/HeadlessCitySimulator.ts` - Updated:
  - Spawns first N agents with `{ guaranteedSkills: { research: 1 } }`

- `packages/core/src/city/CitySpawner.ts` - Updated:
  - Same guaranteed researcher logic for city template spawning

**Scaling (per grand-strategy HARD STEPS model)**:
| Population | Guaranteed Researchers | Rationale |
|------------|----------------------|-----------|
| 1-10       | 1                    | Minimum viable |
| 11-30      | 2                    | Small village |
| 31-100     | 5% of pop            | Growing town |
| 100+       | 3% of pop            | Diminishing returns |

## Remaining Issues

The following issues still need to be addressed for full research functionality:

2. **Building Registry Lazy Initialization** - Still pending
3. **Lazy Activation Blocks System Startup** - Still pending
4. **Academic Paper System Disabled** - Still pending
5. **No Starter Research Buildings** - Still pending

## Next Steps

- Test that guaranteed researchers can now see the "research" action
- Implement remaining fixes in priority order
- Add integration test for full research flow
