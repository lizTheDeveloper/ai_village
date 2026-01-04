# Proposal: Work Order: Progressive Skill Reveal System

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Needs Work
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/progressive-skill-reveal

---

## Original Work Order

# Work Order: Progressive Skill Reveal System

## Related Documents

- **Full Specification:** `custom_game_engine/agents/autonomous-dev/work-orders/skill-system/progressive-skill-reveal-spec.md`
- **Prompt Templates:** `custom_game_engine/agents/autonomous-dev/work-orders/skill-system/prompt-templates.md`

The prompt-templates.md file contains:
- 6 complete example prompts for different skill profiles (Pine/newcomer, Oak/builder, River/cook, Wren/social, Birch/generalist, Ash/craftsman)
- TypeScript implementation templates for StructuredPromptBuilder.ts
- Section-by-section templates with switch statements by skill level
- Entity visibility filtering by skill + perception radius
- Action filtering templates
- Relationship affordance templates
- Instruction generation templates

Use these templates as the implementation reference for the StructuredPromptBuilder changes.

## Overview

Implement skill-gated prompt context so agents only receive information, actions, and strategic suggestions relevant to their skill levels. This creates natural role differentiation where builders think about construction, cooks think about food, and unskilled agents focus on basic survival.

**Full Specification:** `custom_game_engine/agents/autonomous-dev/work-orders/skill-system/progressive-skill-reveal-spec.md`

## Core Principles

1. **You don't know what you don't know** - Information depth scales with skill level
2. **Entity visibility is skill-gated** - Only see relevant entities for your skills
3. **Actions abstract away infrastructure** - Agents see recipes, not workbenches
4. **Skill extends perception radius** - Higher skill = awareness of farther resources
5. **Agents are affordances** - Skilled agents appear as resources to others
6. **Relationships unlock affordances** - Friends can access each other's skills

## Acceptance Criteria

### 1. Random Starting Skills

Agents must spawn with 1-3 skills at level 1-2 based on personality affinities:

```typescript
// In SkillsComponent.ts
export function generateRandomStartingSkills(
  personality: PersonalityComponent
): SkillsComponent;
```

**Update AgentEntity.ts:**
```typescript
// Replace createSkillsComponent() with:
const personality = entity.getComponent('personality');
entity.addComponent(generateRandomStartingSkills(personality));
```

**Test:** 80% of spawned agents should have at least one skill > 0.

### 2. Skill-Gated Entity Visibility

Filter `nearby_entities` in prompts based on skill level:

| Skill Level | Perception Radius |
|-------------|-------------------|
| 0 | ~5 tiles (adjacent only) |
| 1 | ~15 tiles (nearby) |
| 2 | ~30 tiles (local area) |
| 3 | ~50 tiles (extended area) |
| 4 | ~100 tiles (region-wide) |
| 5 | Map-wide (knows about rare things everywhere) |

**Entity visibility by skill:**
- Gathering 0: berry bushes, fallen branches, loose stones
- Gathering 2: hidden berry patches, clay deposits
- Cooking 0: berry bushes, obvious food
- Cooking 2: wild onions, edible flowers, honey sources
- Cooking 4: rare ingredients (truffles, saffron)
- Building 0: trees, rock piles
- Building 2: iron ore deposits, sand deposits
- Farming 0: berry bushes, apple trees
- Farming 2: herb patches, potato plants
- Farming 4: rare herbs, soil quality indicators

### 3. Skill-Gated Information Depth

Each skill domain provides information at different depths:

**Cooking skill - Food information:**
| Level | What They See |
|-------|--------------|
| 0 | "There's food stored" |
| 1 | "Storage has 15 berries, 8 meat" |
| 2 | "Village consumes ~10 food/day" |
| 3 | "2.3 days of food remaining" |
| 4 | "Cooked meals last 3x longer" |
| 5 | "Menu plan: cook meat today, preserve berries..." |

**Building skill - Village info:**
| Level | What They See |
|-------|--------------|
| 0 | "There are some structures nearby" |
| 1 | List of building names |
| 2 | Building purposes + construction status |
| 3 | Material requirements for in-progress buildings |
| 4 | Infrastructure gaps + optimization suggestions |
| 5 | Optimal build order, village-wide planning |

### 4. Tiered Building Availability

Buildings require building skill levels:

| Skill Level | Buildings Available |
|-------------|---------------------|
| 0 | lean-to, campfire, storage-chest, storage-box |
| 1 | workbench, tent, bedroll, well, garden_fence |
| 2 | bed, forge, farm_shed, market_stall, windmill |
| 3 | workshop, barn, library, loom, oven, granary |
| 4 | warehouse, monument, trading_post, health_clinic |
| 5 | grand_hall, arcane_tower, inventors_hall |

**Implementation:** Add `skillRequired` to `BuildingBlueprint`:
```typescript
interface BuildingBlueprint {
  // ... existing fields
  skillRequired?: { skill: SkillId; level: SkillLevel };
}
```

### 5. Skill-Gated Actions

Filter actions in prompts based on skill:

**Universal actions (no skill required):**
- wander, idle, rest, sleep, eat, drink, talk, follow, gather

**Skill-gated actions:**
- plant, till, harvest → farming 1+
- cook → cooking 1+
- craft → crafting 1+
- build (complex) → building 1+
- tame → animal_handling 2+
- heal → medicine 2+

### 6. Skill-Gated Strategic Suggestions

Only suggest domain actions to skilled agents:

```typescript
function generateStrategicInstruction(agent, villageState): string {
  const skills = agent.getComponent('skills');

  // Building suggestions - only for builders
  if (skills.levels.building >= 2) {
    // "Village needs more storage"
  }

  // Food suggestions - only for cooks/farmers
  if (skills.levels.cooking >= 2 || skills.levels.farming >= 2) {
    // "Food supplies are critically low"
  }

  // Default for unskilled: focus on immediate needs
  return generateBasicSurvivalInstruction(agent);
}
```

### 7. Agents as Affordances

Skilled agents appear in prompts as resources (like buildings):

```
VILLAGE RESOURCES:
- Campfire (cooking, warmth)
- Storage Chest (20 slots)
- Oak (skilled builder - can construct complex buildings)
- River (skilled cook - can prepare preserved food)
```

**Social skill gates knowledge about others' skills:**
| Social Skill | What They Know About Others |
|--------------|----------------------------|
| 0 | Nothing about skills |
| 1 | "Oak seems handy with tools" |
| 2 | "Oak is good at building" |
| 3 | "Oak: skilled builder (level 3)" |
| 4 | "Oak: expert builder, teaches construction" |

### 8. Relationships Unlock Affordances

Relationship level determines what affordances you can access through another agent:

| Relationship | Affordances |
|--------------|-------------|
| Stranger | None - can only observe |
| Acquaintance | Can ask questions, learn primary skill |
| Friend | Can request help, share recipes |
| Close Friend | Can delegate tasks, teach/learn |

**Prompt example:**
```
AVAILABLE THROUGH RELATIONSHIPS:
- Building (via Oak): forge, workshop, cabin - just ask!
```

### 9. Building Ownership

Skilled builders can designate buildings as communal or personal:

| Type | Who Can Use |
|------|-------------|
| Communal | Anyone (default) |
| Personal | Only the owner |
| Shared | Owner + friends |

**Prompt shows ownership:**
```
VILLAGE BUILDINGS:
- Campfire (communal) - warmth, cooking
- Oak's Cabin (Oak's) - sleeping, private storage
- Crafter's Workshop (shared: Oak, River)
```

## Files to Modify

### Primary Changes:
1. `packages/core/src/components/SkillsComponent.ts` - Add `generateRandomStartingSkills()`
2. `packages/world/src/entities/AgentEntity.ts` - Use personality-based skill generation
3. `packages/llm/src/StructuredPromptBuilder.ts` - Implement all skill-gated sections
4. `packages/core/src/buildings/BuildingBlueprintRegistry.ts` - Add `skillRequired` to blueprints
5. `packages/llm/src/ActionDefinitions.ts` - Add skill requirements to actions

### Supporting Changes:
6. `packages/core/src/components/RelationshipComponent.ts` - Add `perceivedSkills`
7. `packages/core/src/components/BuildingComponent.ts` - Add ownership fields

## Testing

1. **Skill diversity test:** Spawn 100 agents, verify 80%+ have skill > 0
2. **Entity visibility test:** Verify low-skill agents don't see rare resources
3. **Information depth test:** Verify prompts show appropriate detail for skill level
4. **Building tier test:** Verify skill requirements on building blueprints
5. **Action filtering test:** Verify unskilled agents don't see skill-gated actions
6. **Integration test:** Run simulation, verify role specialization emerges

## Success Metrics

| Metric | Target |
|--------|--------|
| Skill diversity at spawn | 80% of agents have skill > 0 |
| Role specialization | Builders do 60%+ of construction |
| Reduced duplicates | <10% overlapping building starts |
| Appropriate suggestions | 90% of strategic suggestions go to skilled agents |


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
