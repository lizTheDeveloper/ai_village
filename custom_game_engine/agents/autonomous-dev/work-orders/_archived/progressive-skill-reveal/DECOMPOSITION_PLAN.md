# StructuredPromptBuilder God Class Decomposition Plan

**Work Order:** progressive-skill-reveal
**Plan Date:** 2026-01-10
**Current Status:** God class violation (2,673 lines, exceeds 1000 line limit by 167%)
**Target:** Modular architecture with files <500 lines each

---

## Executive Summary

StructuredPromptBuilder.ts has grown to 2,673 lines (+77% since last review). It violates CLAUDE.md's file size limits and is difficult to maintain. This plan decomposes it into 8 focused modules while preserving functionality and minimizing disruption.

**Key Goals:**
1. Split into modules <500 lines each
2. Maintain backward compatibility (public API unchanged)
3. Fix remaining 3 `as any` type violations
4. Preserve all existing functionality
5. Keep tests passing (62/62 ProgressiveSkillReveal tests)

**Estimated Effort:** 6-8 hours total
- Planning & analysis: 1 hour (complete)
- Implementation: 4-5 hours
- Testing & verification: 1-2 hours

---

## Spec Integration Reference

This decomposition plan integrates requirements from multiple OpenSpec documents:

- **Primary Spec:** `openspec/changes/progressive-skill-reveal/proposal.md` - Full acceptance criteria
- **Architecture:** `openspec/specs/llm-scheduler/LAZY_PROMPT_RENDERING.md` - Lazy prompt rendering pattern
- **Schema System:** `openspec/specs/introspection-system/spec.md` - Schema-driven prompts
- **Knowledge System:** `openspec/specs/research-system/knowledge-tree.md` - Skill/knowledge requirements

---

## Three-Layer LLM Architecture Context

**Understanding StructuredPromptBuilder's Role:**

The game uses a three-layer LLM decision architecture where each prompt builder serves a different cognitive layer:

### Layer 1: Autonomic (StructuredPromptBuilder) - **THIS FILE**
**Role:** Reflexive responses, basic needs, immediate decisions
**Focus:** "What should I do RIGHT NOW?"

**Unique Complexity:**
- **Perception filtering (progressive skill reveal):** An experienced herbalist sees more plants than an inexperienced gatherer
- **Skill-gated actions:** Only show building/crafting options agent has skills for
- **Immediate survival:** Hunger, thirst, temperature, danger
- **Reflex-level decisions:** Gather nearby food, build campfire if cold, flee from threats

**Key Difference:** StructuredPromptBuilder must filter EVERYTHING by skill level. This is why it's so complex.

### Layer 2: Social (TalkerPromptBuilder) - 752 lines
**Role:** Conversations, relationships, goal-setting
**Focus:** "Who do I want to talk to and what do I want to accomplish?"

**Scope:**
- Social awareness (who's around, relationships)
- Conversation management (talk, listen, socialize)
- Goal-setting (set_goal, set_priorities)
- Verbal planning (thinking, not doing)

**Key Difference:** NO skill-based filtering - social awareness is universal

### Layer 3: Strategic (ExecutorPromptBuilder) - 685 lines
**Role:** Strategic planning, task execution, resource management
**Focus:** "How do I achieve my goals? What's my multi-step plan?"

**Scope:**
- Strategic planning (what to build, what to stockpile)
- Resource stockpiling for large projects
- Task queuing and multi-step plans
- Skill-based actions (farming, exploration, animals, combat)

**Key Difference:** Executor knows skills exist and plans around them, but doesn't filter entity visibility

---

## Why StructuredPromptBuilder Is So Complex

**The Progressive Skill Reveal Problem:**

Unlike Talker and Executor, StructuredPromptBuilder must implement **perception filtering** at multiple levels:

1. **Plant visibility:** `isEntityVisibleWithSkill(species, 'herbalism', level)`
   - Novice: Sees common plants (berries, grass)
   - Expert: Sees rare medicinal herbs

2. **Animal visibility:** `isEntityVisibleWithSkill(species, 'hunting', level)`
   - Novice: Sees rabbits, deer
   - Expert: Sees tracks, predator patterns

3. **Building detail:** Skilled builders see more construction info
   - Novice: "A wooden structure"
   - Expert: "A reinforced oak frame with dovetail joints"

4. **Resource awareness:** Miners see ore veins, herbalists see plant properties

5. **Action availability:** Only show "craft_sword" to skilled blacksmiths

**This filtering happens in ~10 different methods:**
- `buildWorldContext()` - filters visible entities
- `getSeenAgentsInfo()` - filters agent details
- `getSeenBuildingsInfo()` - filters building details (line 1312)
- `buildHuntingContext()` - filters animal visibility (line 782)
- `getAvailableActions()` - filters actions by skill
- `buildBuildingsKnowledge()` - filters buildable structures
- `suggestBuildings()` - skill-aware suggestions

**Result:** StructuredPromptBuilder has ~500 lines MORE than Executor/Talker specifically for perception filtering logic.

**Example from line 782:**
```typescript
// buildHuntingContext() - Filter animals by hunting skill
if (isEntityVisibleWithSkill(species, 'hunting' as SkillId, huntingSkill)) {
  // Only show this animal to skilled hunters
  huntableAnimals.push({ id: entity.id, species, position });
}
```

This complexity is INTENTIONAL and CORE to progressive skill reveal. Decomposition must preserve these skill-gated visibility checks.

---

## Progressive Skill Reveal Requirements

**Source:** `openspec/changes/progressive-skill-reveal/proposal.md`

The decomposed builders must implement all 9 acceptance criteria from the spec:

### 1. Random Starting Skills
**Responsibility:** AgentEntity.ts (external to prompt builder)
- Agents spawn with 1-3 skills at level 1-2 based on personality
- **Not part of this decomposition** - handled by entity creation

### 2. Skill-Gated Entity Visibility
**Responsibility:** VisionPerceptionBuilder
- Filter `nearby_entities` by skill level and perception radius
- **Perception radius table:**
  - Level 0: ~5 tiles (adjacent only)
  - Level 1: ~15 tiles (nearby)
  - Level 2: ~30 tiles (local area)
  - Level 3: ~50 tiles (extended area)
  - Level 4: ~100 tiles (region-wide)
  - Level 5: Map-wide (rare entities everywhere)
- **Entity visibility by skill:**
  - Gathering 0: berry bushes, fallen branches
  - Gathering 2: hidden berry patches, clay deposits
  - Cooking 0: obvious food
  - Cooking 2: wild onions, edible flowers
  - Building 2: iron ore deposits, sand deposits
  - Farming 2: herb patches, potato plants

**Implementation method:** `getAvailableActions()`, `buildWorldContext()`
**Core function:** `isEntityVisibleWithSkill(species, skill, level)` from `@ai-village/core`

### 3. Skill-Gated Information Depth
**Responsibility:** VillageCoordinationBuilder, BuildingKnowledgeBuilder

**Cooking skill - Food information (VillageCoordinationBuilder.getVillageResources()):**
| Level | What They See |
|-------|--------------|
| 0 | "There's food stored" |
| 1 | "Storage has 15 berries, 8 meat" |
| 2 | "Village consumes ~10 food/day" |
| 3 | "2.3 days of food remaining" |
| 4 | "Cooked meals last 3x longer" |
| 5 | "Menu plan: cook meat today, preserve berries..." |

**Building skill - Village info (BuildingKnowledgeBuilder.buildBuildingsKnowledge()):**
| Level | What They See |
|-------|--------------|
| 0 | "There are some structures nearby" |
| 1 | List of building names |
| 2 | Building purposes + construction status |
| 3 | Material requirements for in-progress buildings |
| 4 | Infrastructure gaps + optimization suggestions |
| 5 | Optimal build order, village-wide planning |

### 4. Tiered Building Availability
**Responsibility:** BuildingKnowledgeBuilder
- Filter available buildings by `buildingBlueprint.skillRequired`
- **Skill tiers:**
  - Level 0: lean-to, campfire, storage-chest
  - Level 1: workbench, tent, bedroll, well
  - Level 2: bed, forge, farm_shed, market_stall
  - Level 3: workshop, barn, library, loom, oven
  - Level 4: warehouse, monument, trading_post
  - Level 5: grand_hall, arcane_tower

**Implementation:** `buildBuildingsKnowledge()`, `suggestBuildings()`

### 5. Skill-Gated Actions
**Responsibility:** VisionPerceptionBuilder
- Filter actions in `getAvailableActions()` based on skill requirements
- **Universal actions (no skill):** wander, idle, rest, sleep, eat, drink, talk, follow, gather
- **Skill-gated actions:**
  - plant, till, harvest → farming 1+
  - cook → cooking 1+
  - craft → crafting 1+
  - build (complex) → building 1+
  - tame → animal_handling 2+
  - heal → medicine 2+

**Implementation:** `getAvailableActions()`

### 6. Skill-Gated Strategic Suggestions
**Responsibility:** InstructionGuidanceBuilder
- Only suggest domain-specific actions to skilled agents
- Unskilled agents get basic survival instructions

**Implementation:** `buildSkillAwareInstruction()`

### 7. Agents as Affordances
**Responsibility:** VillageCoordinationBuilder
- Show skilled agents as resources in village status
- **Social skill gates perception of others' skills:**
  - Social 0: Nothing about skills
  - Social 1: "Oak seems handy with tools"
  - Social 2: "Oak is good at building"
  - Social 3: "Oak: skilled builder (level 3)"
  - Social 4: "Oak: expert builder, teaches construction"

**Implementation:** `buildVillageStatus()`

### 8. Relationships Unlock Affordances
**Responsibility:** MemoryConversationBuilder, VillageCoordinationBuilder
- Relationship level determines accessible affordances
- **Relationship tiers:**
  - Stranger: None (can only observe)
  - Acquaintance: Can ask questions, learn primary skill
  - Friend: Can request help, share recipes
  - Close Friend: Can delegate tasks, teach/learn

**Implementation:** `buildActiveConversationSection()`, `describeRelationship()`

### 9. Building Ownership
**Responsibility:** VillageCoordinationBuilder
- Show building ownership in village status
- **Ownership types:**
  - Communal: Anyone (default)
  - Personal: Only the owner
  - Shared: Owner + friends

**Implementation:** `getVillageBuildings()`, `getSeenBuildingsInfo()`

---

## Lazy Prompt Rendering Pattern

**Source:** `openspec/specs/llm-scheduler/LAZY_PROMPT_RENDERING.md`

### Critical Constraint: No State Capture

All builders MUST be **pure functions** that accept `(agent, world)` and return fresh prompts:

```typescript
// ✅ CORRECT: Lazy builder (called at send time)
scheduler.enqueue({
  agentId: agent.id,
  promptBuilder: (agent, world) => {
    // This function called AT SEND TIME with FRESH state
    return StructuredPromptBuilder.buildPrompt(agent, world);
  },
  priority: 5,
});

// ❌ WRONG: Eager builder (captures stale state)
const prompt = StructuredPromptBuilder.buildPrompt(agent, world);
scheduler.enqueue({
  agentId: agent.id,
  prompt: prompt,  // Stale immediately!
});
```

### Decomposition Implications

1. **All builders are static methods** - No instance state
2. **All methods accept (agent, world)** - Fresh data on every call
3. **No caching of entity references** - Query world every time
4. **PromptCacheManager is frame-level only** - Invalidates each tick

**Example:**
```typescript
// VisionPerceptionBuilder.ts
export class VisionPerceptionBuilder {
  static getSeenAgentsInfo(
    agent: Entity,
    world: World,
    seenAgentIds: string[]
  ): string | null {
    // Query world FRESH - no cached entities
    const agents = seenAgentIds
      .map(id => world.getEntity(id))
      .filter(Boolean);

    // Build prompt section from current state
    return formatAgentInfo(agents);
  }
}
```

**Why this matters:**
- Agents move, state changes between enqueue and send
- Prompts built at send time reflect CURRENT state
- Deleted agents automatically skipped (null check)
- No stale data sent to LLM

---

## Current Structure Analysis

### File Statistics

```
Current:
- StructuredPromptBuilder.ts: 2,673 lines (god class)
- 25 methods (1 public, 24 private)
- 39 component type imports
- 3 remaining `as any` casts (down from 46)
```

### Dependencies

**Imports FROM this file:**
- `packages/llm/src/LLMScheduler.ts` - Main LLM decision routing (autonomic layer)
- `packages/renderer/src/panels/agent-info/ContextSection.ts` - UI display
- `packages/shared-worker/src/game-setup.ts` - Worker thread setup
- Test files (StructuredPromptBuilder.test.ts, GoalPromptIntegration.test.ts)

**This file imports FROM:**
- `@ai-village/core` - 39 component types, utility functions
- `@ai-village/introspection` - PromptRenderer, ComponentRegistry
- `./PersonalityPromptTemplates.js` - Personality generation
- `./PromptCacheManager.js` - Frame-level query caching

---

## Method Grouping Analysis

### Group 1: Core Orchestration (2 methods, ~200 lines)
**Responsibility:** Main entry point and final formatting

- `buildPrompt(agent, world): string` - **PUBLIC API** - Main coordinator (lines 72-193)
- `formatPrompt(prompt): string` - Final prompt assembly (line 2059)

**Dependencies:** Calls all other methods

---

### Group 2: Agent Identity & State (3 methods, ~350 lines)
**Responsibility:** Who the agent is and what they're doing

- `buildSystemPrompt(name, personality, entityId): string` - Personality templates (line 200)
- `buildSchemaPrompt(agent, world): string` - Introspection integration (line 219)
- `buildPrioritiesSection(agent): string` - Strategic priorities (line 237)
- `buildSkillsSection(skills): string` - Skill display (line 423)

**Dependencies:**
- Uses `generatePersonalityPrompt()` from PersonalityPromptTemplates
- Uses `PromptRenderer.renderEntity()` from introspection package

---

### Group 3: Environmental Context (4 methods, ~550 lines)
**Responsibility:** What's happening in the world around the agent

- `buildWorldContext(needs, vision, inventory, world, temp, memory, conversation, entity): string` - Environment state (line 576)
- `buildHuntingContext(jealousy, personality, world): string` - Animal hunting (line 341)
- `getKnownResourceLocations(memory, world): string | null` - Memory-based resources (line 917)
- `buildJealousyContext(jealousy, personality, world): string` - Romantic jealousy (line 265)

**Dependencies:**
- Calls vision/perception methods (Group 5)
- Calls village coordination methods (Group 4)

---

### Group 4: Village Coordination (4 methods, ~450 lines)
**Responsibility:** Village-wide awareness and cooperation

- `buildVillageStatus(world, agentId): string` - Village coordination (line 1408)
- `getVillageResources(world, entity): string | null` - Resource tracking (line 1035)
- `getVillageBuildings(world, entity): string | null` - Building registry (line 1111)
- `getStorageInfo(world, cookingSkill): string | null` - Storage containers (line 1376)

**Dependencies:**
- Uses `getVillageInfo()`, `getFoodStorageInfo()` from core
- Calls vision methods for skill-based filtering

---

### Group 5: Building & Construction (4 methods, ~400 lines)
**Responsibility:** What the agent can build and construction planning

- `buildBuildingsKnowledge(world, inventory, skills): string` - Construction options (line 451)
- `buildTileBasedStructuresSection(inventory): string` - Tile-based structures (line 536)
- `suggestBuildings(world, inventory, needs, temp, skills): string[]` - Recommendations (line 970)
- `getBuildingPurpose(buildingType): string` - Building descriptions (line 1170)

**Dependencies:**
- Uses `getAvailableBuildings()`, `getTileBasedBlueprintRegistry()` from core
- Uses `calculateDimensions()` from core

---

### Group 6: Vision & Perception (3 methods, ~400 lines)
**Responsibility:** What the agent can see and perceive

- `getSeenAgentsInfo(world, seenAgentIds): string | null` - Visible agents (line 1251)
- `getSeenBuildingsInfo(world, seenBuildingIds, buildingSkill): string | null` - Visible buildings (line 1312)
- `getAvailableActions(vision, world, entity): string[]` - Action filtering (line 1635)

**Dependencies:**
- Uses `isEntityVisibleWithSkill()` from core for progressive reveal

---

### Group 7: Memories & Conversations (4 methods, ~450 lines)
**Responsibility:** Episodic memories and social interactions

- `buildEpisodicMemories(episodicMemory, world): string` - Memory formatting (line 1498)
- `buildActiveConversationSection(conversation, world): string` - Active conversations (line 2157)
- `describeRelationship(relationship): string` - Relationship descriptions (line 2276)
- `formatTopicName(topic): string` - Topic formatting (line 2323)

**Dependencies:**
- Uses `getConversationStyle()`, `findSharedInterests()` from core

---

### Group 8: Instructions & Guidance (3 methods, ~300 lines)
**Responsibility:** What the agent should do next

- `buildSkillAwareInstruction(agent, world, skills, needs, temp, inventory, conversation, vision): string` - Skill-gated instructions (line 1859)
- `addLeadershipGuidance(instruction, agent, world): string` - Leadership additions (line 2035)
- `getSkillImpression(skillId): string` - Skill level descriptions (line 1204)
- `getSkillExamples(skillId): string` - Skill examples (line 1227)

**Dependencies:** None (pure formatters)

---

## Proposed Decomposition Strategy

### Architecture: Hub-and-Spoke Pattern

**Central Hub:**
- `StructuredPromptBuilder.ts` - Thin coordinator (~250 lines)
  - Maintains public API: `buildPrompt(agent, world): string`
  - Delegates to specialized builders
  - Handles final assembly with `formatPrompt()`

**Specialized Spokes (7 modules):**

1. **`AgentIdentityBuilder.ts`** (~350 lines)
   - buildSystemPrompt()
   - buildSchemaPrompt()
   - buildPrioritiesSection()
   - buildSkillsSection()

2. **`EnvironmentalContextBuilder.ts`** (~550 lines)
   - buildWorldContext()
   - buildHuntingContext()
   - buildJealousyContext()
   - getKnownResourceLocations()

3. **`VillageCoordinationBuilder.ts`** (~450 lines)
   - buildVillageStatus()
   - getVillageResources()
   - getVillageBuildings()
   - getStorageInfo()

4. **`BuildingKnowledgeBuilder.ts`** (~400 lines)
   - buildBuildingsKnowledge()
   - buildTileBasedStructuresSection()
   - suggestBuildings()
   - getBuildingPurpose()

5. **`VisionPerceptionBuilder.ts`** (~400 lines)
   - getSeenAgentsInfo()
   - getSeenBuildingsInfo()
   - getAvailableActions()

6. **`MemoryConversationBuilder.ts`** (~450 lines)
   - buildEpisodicMemories()
   - buildActiveConversationSection()
   - describeRelationship()
   - formatTopicName()

7. **`InstructionGuidanceBuilder.ts`** (~300 lines)
   - buildSkillAwareInstruction()
   - addLeadershipGuidance()
   - getSkillImpression()
   - getSkillExamples()

---

## Builder Responsibility Matrix

**Which builder implements which acceptance criteria:**

| Builder | Acceptance Criteria | Methods | Spec Requirements |
|---------|-------------------|---------|-------------------|
| **AgentIdentityBuilder** | None (infrastructure) | buildSystemPrompt, buildSchemaPrompt, buildPrioritiesSection, buildSkillsSection | Schema-driven prompts (introspection-system spec) |
| **EnvironmentalContextBuilder** | AC2 (partial) | buildWorldContext, buildHuntingContext, buildJealousyContext, getKnownResourceLocations | Entity visibility filtering |
| **VillageCoordinationBuilder** | AC3, AC7, AC8, AC9 | buildVillageStatus, getVillageResources, getVillageBuildings, getStorageInfo | Information depth, agents as affordances, relationships, ownership |
| **BuildingKnowledgeBuilder** | AC3 (partial), AC4 | buildBuildingsKnowledge, buildTileBasedStructuresSection, suggestBuildings, getBuildingPurpose | Tiered building availability, building information depth |
| **VisionPerceptionBuilder** | AC2, AC5 | getSeenAgentsInfo, getSeenBuildingsInfo, getAvailableActions | Skill-gated entity visibility, skill-gated actions |
| **MemoryConversationBuilder** | AC8 (partial) | buildEpisodicMemories, buildActiveConversationSection, describeRelationship, formatTopicName | Relationship affordances |
| **InstructionGuidanceBuilder** | AC6 | buildSkillAwareInstruction, addLeadershipGuidance, getSkillImpression, getSkillExamples | Skill-gated strategic suggestions |

**Cross-cutting concerns:**
- **Lazy prompt rendering:** ALL builders must be pure functions of (agent, world)
- **Progressive skill reveal:** VisionPerceptionBuilder, VillageCoordinationBuilder, BuildingKnowledgeBuilder, EnvironmentalContextBuilder
- **Type safety:** ALL builders must have proper TypeScript types, no `as any`

---

## Implementation Plan

### Phase 1: Preparation (30 min)

**Goal:** Set up infrastructure without breaking anything

1. Create stub files for all 7 specialized builders
2. Add exports to each stub file
3. Update `packages/llm/src/index.ts` to export new builders
4. Verify build passes with empty stubs

**Files Created:**
```
packages/llm/src/builders/
├── AgentIdentityBuilder.ts
├── EnvironmentalContextBuilder.ts
├── VillageCoordinationBuilder.ts
├── BuildingKnowledgeBuilder.ts
├── VisionPerceptionBuilder.ts
├── MemoryConversationBuilder.ts
└── InstructionGuidanceBuilder.ts
```

**Verification:** `npm run build` passes

---

### Phase 2: Extract Utilities First (1 hour)

**Goal:** Move simple, dependency-free methods first

**Order:**
1. Extract InstructionGuidanceBuilder (getSkillImpression, getSkillExamples)
2. Import into StructuredPromptBuilder
3. Update calls: `this.getSkillImpression()` → `InstructionGuidanceBuilder.getSkillImpression()`
4. Run tests: `npm test -- StructuredPromptBuilder`

**Pattern for each extraction:**
```typescript
// InstructionGuidanceBuilder.ts
export class InstructionGuidanceBuilder {
  static getSkillImpression(skillId: SkillId): string {
    // Moved code here
  }
}

// StructuredPromptBuilder.ts
import { InstructionGuidanceBuilder } from './builders/InstructionGuidanceBuilder.js';

// Replace method body with delegation:
private getSkillImpression(skillId: SkillId): string {
  return InstructionGuidanceBuilder.getSkillImpression(skillId);
}
```

**Why utilities first:** No dependencies = safe extraction

**Verification:**
- Tests pass
- Line count reduced by ~50

---

### Phase 3: Extract Independent Builders (2 hours)

**Goal:** Move builders with minimal cross-dependencies

**Order:**
1. AgentIdentityBuilder (depends only on external imports)
2. BuildingKnowledgeBuilder (uses core utilities)
3. VisionPerceptionBuilder (uses core utilities)

**For each builder:**
1. Copy methods to new file
2. Update imports
3. Make methods `static` (no shared state)
4. Add delegation in StructuredPromptBuilder
5. Run tests

**Example:**
```typescript
// AgentIdentityBuilder.ts
export class AgentIdentityBuilder {
  static buildSystemPrompt(
    name: string,
    personality: PersonalityComponent | undefined,
    entityId?: string
  ): string {
    if (!personality) {
      return `You are ${name}, a villager in a forest village.\n\n`;
    }
    return generatePersonalityPrompt({ name, personality, entityId });
  }

  static buildSchemaPrompt(agent: Entity, world: World): string {
    const schemaPrompt = PromptRenderer.renderEntity(agent, world);
    if (!schemaPrompt) return '';
    return `--- Schema-Driven Component Info ---\n${schemaPrompt}`;
  }

  // ... other methods
}

// StructuredPromptBuilder.ts (delegation)
private buildSystemPrompt(name: string, personality: PersonalityComponent | undefined, entityId?: string): string {
  return AgentIdentityBuilder.buildSystemPrompt(name, personality, entityId);
}
```

**Verification after each builder:**
- `npm test -- StructuredPromptBuilder`
- Verify line counts decreasing

---

### Phase 4: Extract Interdependent Builders (2 hours)

**Goal:** Move builders that call each other

**Order:**
1. MemoryConversationBuilder
2. VillageCoordinationBuilder (calls VisionPerceptionBuilder)
3. EnvironmentalContextBuilder (calls multiple builders)

**Challenge:** Circular dependencies

**Solution:** Pass builder instances or use dependency injection

**Option A: Static methods (preferred for simplicity)**
```typescript
// VillageCoordinationBuilder.ts
import { VisionPerceptionBuilder } from './VisionPerceptionBuilder.js';

export class VillageCoordinationBuilder {
  static getStorageInfo(world: World, cookingSkill: SkillLevel): string | null {
    // Can call VisionPerceptionBuilder.getSeenBuildingsInfo()
    const buildings = VisionPerceptionBuilder.getSeenBuildingsInfo(world, seenIds, cookingSkill);
    // ...
  }
}
```

**Option B: Instance-based (if shared state needed)**
```typescript
// StructuredPromptBuilder.ts
private visionBuilder = new VisionPerceptionBuilder();
private villageBuilder = new VillageCoordinationBuilder(this.visionBuilder);
```

**Recommendation:** Use static methods (no shared state observed in current code)

**Verification:**
- All tests passing
- Line count target: StructuredPromptBuilder.ts < 500 lines

---

### Phase 5: Final Cleanup & Type Safety (1 hour)

**Goal:** Fix remaining issues and polish

1. **Fix 3 `as any` casts:**
   - Line 223: `PromptRenderer.renderEntity(agent as any, world)`
     - Fix: Update introspection package or add proper Entity type
   - Line 360: `const animal = entity.components.get('animal') as any;`
     - Fix: Import AnimalComponent type
   - Line 454: `const worldAny = world as any;`
     - Fix: Add proper World interface with buildingRegistry access

2. **Fix critical silent fallback:**
   - Line 93: `identity?.name || 'Agent'`
     - Fix: Throw if identity.name is missing

3. **Update imports in all files:**
   - Remove unused imports
   - Organize import order (core types, builders, utilities)

4. **Add JSDoc comments:**
   - Document each builder's purpose
   - Document public methods

**Example type safety fix:**
```typescript
// Before (LINE 93 - VIOLATION)
const systemPrompt = this.buildSystemPrompt(identity?.name || 'Agent', personality, agent.id);

// After (CORRECT)
if (!identity?.name) {
  throw new Error(`Agent ${agent.id} missing required identity.name field`);
}
const systemPrompt = this.buildSystemPrompt(identity.name, personality, agent.id);
```

**Verification:**
- `npm run build` - 0 errors
- `npm test -- ProgressiveSkillReveal` - 62/62 passing
- No `as any` casts in any file
- No silent fallbacks in critical paths

---

### Phase 6: Testing & Validation (1 hour)

**Goal:** Ensure nothing broke

**Test Plan:**

1. **Unit tests:**
   ```bash
   npm test -- StructuredPromptBuilder
   npm test -- ProgressiveSkillReveal
   ```

2. **Integration test:**
   ```bash
   npm run build
   npm run dev
   ```
   - Start game
   - Spawn agent
   - Verify prompt generation in browser console
   - Check for any errors

3. **Manual verification:**
   - Check LLM prompts look correct
   - Verify skill-based filtering works
   - Test with different skill levels

4. **Performance check:**
   - Measure prompt build time (should be unchanged)
   - Verify cache still works (PromptCacheManager)

**Success Criteria:**
- ✅ All tests passing (62/62)
- ✅ Build succeeds with 0 errors
- ✅ Game runs without errors
- ✅ Prompts match previous behavior
- ✅ No performance regression

---

## Trade-off Analysis

### Option A: Hub-and-Spoke (RECOMMENDED)

**Pros:**
- ✅ Clean separation of concerns
- ✅ Each builder <500 lines
- ✅ Easy to test independently
- ✅ Minimal public API changes
- ✅ Can extract incrementally

**Cons:**
- ⚠️ More files to navigate (8 vs 1)
- ⚠️ Import statements increase
- ⚠️ Potential circular dependencies

**Risk:** Low (static methods avoid state issues)

---

### Option B: Keep StructuredPromptBuilder, Extract Helpers

**Approach:** Keep main class, move utilities to separate files

**Pros:**
- ✅ Backward compatible
- ✅ Single entry point
- ✅ Minimal refactoring

**Cons:**
- ❌ StructuredPromptBuilder still >1500 lines
- ❌ Doesn't fix god class violation
- ❌ Helpers still tightly coupled

**Risk:** Medium (doesn't solve core problem)

**Verdict:** REJECT - doesn't meet CLAUDE.md requirements

---

### Option C: Functional Decomposition

**Approach:** Pure functions instead of classes

**Example:**
```typescript
// buildSystemPrompt.ts
export function buildSystemPrompt(name: string, personality?: PersonalityComponent): string {
  // ...
}

// StructuredPromptBuilder.ts
import { buildSystemPrompt } from './builders/buildSystemPrompt.js';

buildPrompt(agent: Entity, world: World): string {
  const systemPrompt = buildSystemPrompt(identity?.name || 'Agent', personality);
  // ...
}
```

**Pros:**
- ✅ Simplest approach
- ✅ No class/instance overhead
- ✅ Pure functions easier to test

**Cons:**
- ⚠️ Many small files (25 functions = 25 files)
- ⚠️ Harder to group related functionality
- ⚠️ Import bloat

**Risk:** Medium (file sprawl)

**Verdict:** CONSIDER - simpler than classes but more files

---

## Recommended Approach

**Use Option A: Hub-and-Spoke with Static Methods**

**Rationale:**
1. Meets CLAUDE.md file size requirements (<500 lines each)
2. Logical grouping (identity, building, vision, etc.)
3. Static methods = no shared state = safe parallelization
4. Can extract incrementally without breaking tests
5. Clear separation of concerns
6. Easy to test each builder independently

**Alternative (if static methods prove limiting):**
- Use Option C for utility functions (getSkillImpression, formatTopicName)
- Use Option A for builders that need multiple related methods (buildWorldContext, buildVillageStatus)

---

## File Structure (Final State)

```
packages/llm/src/
├── StructuredPromptBuilder.ts              (250 lines) - Main coordinator
├── builders/
│   ├── AgentIdentityBuilder.ts             (350 lines) - Who the agent is
│   ├── EnvironmentalContextBuilder.ts      (550 lines) - What's happening around them
│   ├── VillageCoordinationBuilder.ts       (450 lines) - Village-wide awareness
│   ├── BuildingKnowledgeBuilder.ts         (400 lines) - What they can build
│   ├── VisionPerceptionBuilder.ts          (400 lines) - What they can see
│   ├── MemoryConversationBuilder.ts        (450 lines) - Memories and social
│   └── InstructionGuidanceBuilder.ts       (300 lines) - What to do next
├── PersonalityPromptTemplates.ts           (existing)
├── PromptCacheManager.ts                   (existing)
└── __tests__/
    ├── StructuredPromptBuilder.test.ts     (existing)
    ├── ProgressiveSkillReveal.test.ts      (existing)
    └── builders/                            (new - optional)
        ├── AgentIdentityBuilder.test.ts
        ├── VisionPerceptionBuilder.test.ts
        └── ...
```

**Total lines:**
- Before: 2,673 lines (1 file)
- After: ~3,150 lines (8 files) - includes new test files
- Average: ~393 lines per file
- Max file: 550 lines (EnvironmentalContextBuilder)

**Line increase explanation:** Adding exports, imports, JSDoc comments increases total lines but improves maintainability.

---

## Migration Checklist

### Pre-Migration
- [ ] Commit current state
- [ ] Run full test suite (baseline)
- [ ] Document current build time

### Phase 1: Preparation
- [ ] Create `packages/llm/src/builders/` directory
- [ ] Create 7 stub builder files
- [ ] Add exports to `packages/llm/src/index.ts`
- [ ] Verify build passes

### Phase 2: Extract Utilities
- [ ] Extract InstructionGuidanceBuilder
- [ ] Update StructuredPromptBuilder imports
- [ ] Run tests
- [ ] Commit

### Phase 3: Extract Independent Builders
- [ ] Extract AgentIdentityBuilder
- [ ] Run tests, commit
- [ ] Extract BuildingKnowledgeBuilder
- [ ] Run tests, commit
- [ ] Extract VisionPerceptionBuilder
- [ ] Run tests, commit

### Phase 4: Extract Interdependent Builders
- [ ] Extract MemoryConversationBuilder
- [ ] Run tests, commit
- [ ] Extract VillageCoordinationBuilder
- [ ] Run tests, commit
- [ ] Extract EnvironmentalContextBuilder
- [ ] Run tests, commit

### Phase 5: Fix Type Safety
- [ ] Fix 3 `as any` casts
- [ ] Fix silent fallback (identity?.name)
- [ ] Update all imports
- [ ] Add JSDoc comments
- [ ] Run build (0 errors)
- [ ] Run tests (62/62 passing)
- [ ] Commit

### Phase 6: Testing & Validation
- [ ] Full test suite passes
- [ ] Game runs without errors
- [ ] Manual prompt verification
- [ ] Performance check (no regression)
- [ ] Final commit

### Post-Migration
- [ ] Update work order review report
- [ ] Create archive devlog entry
- [ ] Update progressive-skill-reveal status to COMPLETE

---

## Risk Mitigation

### Risk 1: Circular Dependencies
**Likelihood:** Medium
**Impact:** High (build fails)

**Mitigation:**
- Use static methods (no shared state)
- Builders only call other builders, never circular
- Dependency graph:
  ```
  StructuredPromptBuilder
    ├─> AgentIdentityBuilder (no deps)
    ├─> BuildingKnowledgeBuilder (core utils only)
    ├─> VisionPerceptionBuilder (core utils only)
    ├─> InstructionGuidanceBuilder (no deps)
    ├─> MemoryConversationBuilder (core utils only)
    ├─> VillageCoordinationBuilder (→ VisionPerceptionBuilder)
    └─> EnvironmentalContextBuilder (→ Village, Vision builders)
  ```
- If circular detected: Introduce shared utilities file

---

### Risk 2: Breaking Tests
**Likelihood:** Medium
**Impact:** High (blocks deployment)

**Mitigation:**
- Extract one builder at a time
- Run tests after each extraction
- Keep delegation in StructuredPromptBuilder (maintains API)
- Commit after each successful extraction (easy rollback)

---

### Risk 3: Performance Regression
**Likelihood:** Low
**Impact:** Medium (slower prompts)

**Mitigation:**
- Static methods have no overhead vs instance methods
- PromptCacheManager still active (frame-level query caching)
- Benchmark before/after
- If regression: Profile and optimize hot paths

---

### Risk 4: Import Bloat
**Likelihood:** High
**Impact:** Low (just noise)

**Mitigation:**
- Group related imports
- Use barrel exports: `packages/llm/src/builders/index.ts`
  ```typescript
  export * from './AgentIdentityBuilder.js';
  export * from './BuildingKnowledgeBuilder.js';
  // ...
  ```
- Import from barrel in StructuredPromptBuilder:
  ```typescript
  import {
    AgentIdentityBuilder,
    BuildingKnowledgeBuilder,
    // ...
  } from './builders/index.js';
  ```

---

## Success Metrics

### Code Quality
- ✅ No file >500 lines
- ✅ No `as any` casts
- ✅ No critical silent fallbacks
- ✅ All methods <100 lines

### Functionality
- ✅ 62/62 tests passing
- ✅ Build succeeds (0 errors)
- ✅ Game runs without errors
- ✅ Prompts match previous behavior

### Maintainability
- ✅ Clear separation of concerns
- ✅ Each builder has single responsibility
- ✅ Easy to locate functionality
- ✅ JSDoc comments on all public methods

### Performance
- ✅ Prompt build time unchanged (< 5ms)
- ✅ Cache hit rate unchanged
- ✅ No memory leaks

---

## Acceptance Criteria Verification

**After decomposition, verify all 9 progressive-skill-reveal acceptance criteria:**

### AC1: Random Starting Skills
- **Status:** External to this work order (handled by AgentEntity.ts)
- **Test:** Verify 80%+ of spawned agents have skill > 0
- **Not part of decomposition**

### AC2: Skill-Gated Entity Visibility
- **Affected Builders:** VisionPerceptionBuilder
- **Test Method:** Spawn agents with different skill levels, verify prompt filtering
- **Verification:**
  ```javascript
  // Browser console test
  const novice = game.world.query().with('agent').with('skills').executeEntities()
    .find(a => a.getComponent('skills').levels.gathering === 0);
  const expert = game.world.query().with('agent').with('skills').executeEntities()
    .find(a => a.getComponent('skills').levels.gathering >= 3);

  // Check perception radius
  // Novice should see fewer entities than expert at same location
  ```
- **Success:** Novice sees ~5 tiles, expert sees ~50 tiles
- **Builders to test:** VisionPerceptionBuilder.getAvailableActions(), EnvironmentalContextBuilder.buildWorldContext()

### AC3: Skill-Gated Information Depth
- **Affected Builders:** VillageCoordinationBuilder, BuildingKnowledgeBuilder
- **Test Method:** Compare prompts for agents with cooking skill 0 vs 3
- **Verification:**
  ```javascript
  // Grant cooking skill to one agent
  game.grantSkillXP(agent1.id, 0);    // Cooking 0
  game.grantSkillXP(agent2.id, 300);  // Cooking 3

  // Check prompt output
  const prompt1 = StructuredPromptBuilder.buildPrompt(agent1, game.world);
  const prompt2 = StructuredPromptBuilder.buildPrompt(agent2, game.world);

  // agent1: "There's food stored"
  // agent2: "2.3 days of food remaining"
  ```
- **Success:** Information depth matches skill level tables
- **Builders to test:** VillageCoordinationBuilder.getVillageResources(), BuildingKnowledgeBuilder.buildBuildingsKnowledge()

### AC4: Tiered Building Availability
- **Affected Builders:** BuildingKnowledgeBuilder
- **Test Method:** Verify buildings filtered by skill requirement
- **Verification:**
  ```javascript
  const unskilled = game.world.query().with('agent').executeEntities()[0];
  const builder = game.world.query().with('agent').with('skills').executeEntities()
    .find(a => (a.getComponent('skills').levels.building || 0) >= 3);

  const prompt1 = StructuredPromptBuilder.buildPrompt(unskilled, game.world);
  const prompt2 = StructuredPromptBuilder.buildPrompt(builder, game.world);

  // unskilled: Only sees lean-to, campfire, storage-chest
  // builder: Sees workshop, barn, library, loom
  ```
- **Success:** Building lists match skill tier tables
- **Builders to test:** BuildingKnowledgeBuilder.buildBuildingsKnowledge(), BuildingKnowledgeBuilder.suggestBuildings()

### AC5: Skill-Gated Actions
- **Affected Builders:** VisionPerceptionBuilder
- **Test Method:** Verify action filtering by skill
- **Verification:**
  ```javascript
  const unskilled = game.world.query().with('agent').executeEntities()[0];
  const farmer = game.world.query().with('agent').with('skills').executeEntities()
    .find(a => (a.getComponent('skills').levels.farming || 0) >= 2);

  const actions1 = VisionPerceptionBuilder.getAvailableActions(unskilled, game.world);
  const actions2 = VisionPerceptionBuilder.getAvailableActions(farmer, game.world);

  // unskilled: wander, idle, rest, sleep, eat, drink
  // farmer: Also has plant, till, harvest
  ```
- **Success:** Actions match skill requirements
- **Builders to test:** VisionPerceptionBuilder.getAvailableActions()

### AC6: Skill-Gated Strategic Suggestions
- **Affected Builders:** InstructionGuidanceBuilder
- **Test Method:** Compare instruction sections for skilled vs unskilled agents
- **Verification:**
  ```javascript
  const unskilled = game.world.query().with('agent').executeEntities()[0];
  const builder = game.world.query().with('agent').with('skills').executeEntities()
    .find(a => (a.getComponent('skills').levels.building || 0) >= 3);

  const prompt1 = StructuredPromptBuilder.buildPrompt(unskilled, game.world);
  const prompt2 = StructuredPromptBuilder.buildPrompt(builder, game.world);

  // unskilled: "Focus on immediate survival"
  // builder: "Village needs more storage" + building suggestions
  ```
- **Success:** Strategic suggestions only appear for skilled agents
- **Builders to test:** InstructionGuidanceBuilder.buildSkillAwareInstruction()

### AC7: Agents as Affordances
- **Affected Builders:** VillageCoordinationBuilder
- **Test Method:** Verify skilled agents appear as resources in village status
- **Verification:**
  ```javascript
  const observer = game.world.query().with('agent').with('skills').executeEntities()
    .find(a => (a.getComponent('skills').levels.social || 0) >= 2);
  const builder = game.world.query().with('agent').with('skills').executeEntities()
    .find(a => (a.getComponent('skills').levels.building || 0) >= 3);

  const prompt = StructuredPromptBuilder.buildPrompt(observer, game.world);

  // Should include: "Oak (skilled builder - can construct complex buildings)"
  ```
- **Success:** Skilled agents listed as village resources
- **Builders to test:** VillageCoordinationBuilder.buildVillageStatus()

### AC8: Relationships Unlock Affordances
- **Affected Builders:** MemoryConversationBuilder, VillageCoordinationBuilder
- **Test Method:** Verify relationship-based affordance access
- **Verification:** Manual test with agents at different relationship levels
- **Success:** Prompt shows accessible affordances through relationships
- **Builders to test:** MemoryConversationBuilder.buildActiveConversationSection(), MemoryConversationBuilder.describeRelationship()

### AC9: Building Ownership
- **Affected Builders:** VillageCoordinationBuilder
- **Test Method:** Verify building ownership appears in prompts
- **Verification:** Manual test with communal/personal/shared buildings
- **Success:** Ownership labels appear correctly
- **Builders to test:** VillageCoordinationBuilder.getVillageBuildings(), VisionPerceptionBuilder.getSeenBuildingsInfo()

### Comprehensive Integration Test

After all decomposition phases complete:

```bash
# 1. Run unit tests
npm test -- StructuredPromptBuilder
npm test -- ProgressiveSkillReveal

# 2. Start game
./start.sh gamehost

# 3. Spawn agents with different skills
# Browser console:
for (let i = 0; i < 10; i++) {
  game.devPanel.spawnAgent();
}

# 4. Grant varied skills
const agents = game.world.query().with('agent').with('skills').executeEntities();
game.grantSkillXP(agents[0].id, 0);    // Unskilled
game.grantSkillXP(agents[1].id, 300);  // Cooking 3
game.grantSkillXP(agents[2].id, 500);  // Building 5

# 5. Capture prompts
const prompts = agents.map(a => ({
  name: a.getComponent('identity').name,
  skills: a.getComponent('skills').levels,
  prompt: StructuredPromptBuilder.buildPrompt(a, game.world)
}));

# 6. Verify progressive reveal
console.table(prompts.map(p => ({
  name: p.name,
  skillLevels: Object.entries(p.skills).filter(([k,v]) => v > 0).length,
  promptLength: p.prompt.length,
  hasAdvancedInfo: p.prompt.includes('days of food remaining'),
  hasAdvancedBuildings: p.prompt.includes('workshop') || p.prompt.includes('barn')
})));

# Expected: Higher skill agents have longer, more detailed prompts
```

---

## Open Questions

1. **Should we add tests for individual builders?**
   - Pro: Better test coverage, easier debugging
   - Con: More test files to maintain
   - **Recommendation:** Add tests for complex builders (Environmental, Village)

2. **Should builders be classes or pure functions?**
   - Current plan: Static class methods (grouping + namespacing)
   - Alternative: Pure functions in separate files
   - **Recommendation:** Start with static methods, migrate to functions if issues arise

3. **Should we fix MetricsCollector.ts syntax error first?**
   - Currently blocks all builds
   - Unrelated to this work order
   - **Recommendation:** Fix MetricsCollector first (5 min), then proceed with decomposition

---

## Next Steps

**Immediate:**
1. ✅ **COMPLETE:** Integrate plan with existing specs (progressive-skill-reveal, lazy-prompt-rendering, introspection-system)
2. Get user approval for this plan
3. Fix MetricsCollector.ts syntax error (blocking build - separate work order)
4. Begin Phase 1: Preparation

**After Approval:**
1. Create feature branch: `refactor/decompose-structured-prompt-builder`
2. Follow implementation plan phases 1-6
3. Run acceptance criteria verification tests (AC2-AC9)
4. Submit PR with before/after metrics
5. Update work order status to COMPLETE

**Post-Implementation Validation:**
1. Verify all 62 ProgressiveSkillReveal tests pass
2. Manual testing with browser console (see "Comprehensive Integration Test")
3. Verify each acceptance criterion (AC2-AC9) with specific builder tests
4. Performance check: prompt build time < 5ms, cache hit rate unchanged

---

**Plan Status:** ✅ READY FOR IMPLEMENTATION (specs integrated)
**Estimated Timeline:** 6-8 hours (can be done incrementally)
**Risk Level:** LOW (incremental extraction with test verification at each step)

**Spec Compliance:**
- ✅ Lazy prompt rendering pattern (no state capture)
- ✅ Progressive skill reveal acceptance criteria (AC2-AC9 mapped to builders)
- ✅ Schema-driven prompts (introspection system integration)
- ✅ Hub-and-spoke architecture (CLAUDE.md file size limits)
