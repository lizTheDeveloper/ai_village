# Behavior Introspection Implementation

## Overview

Implemented `PromptRenderer.renderAvailableActions()` to support behavior introspection in Phase 5 of the prompt integration system.

## What Was Implemented

### Location
`packages/introspection/src/prompt/PromptRenderer.ts` (lines 515-657)

### Functionality

The `renderAvailableActions()` method:

1. **Introspects the BehaviorRegistry** to discover all registered behaviors
2. **Filters based on agent skills** using progressive skill reveal logic
3. **Returns formatted action strings** with descriptions from behavior metadata

### API

```typescript
static renderAvailableActions(
  entity: { components: Map<string, any> },
  behaviorRegistry?: any
): string[]
```

**Parameters:**
- `entity` - Entity with components map (requires `skills` component for filtering)
- `behaviorRegistry` - Optional behavior registry to introspect (from AgentBrainSystem)

**Returns:**
- Array of action strings formatted as `"behavior_name: Description"` or just `"behavior_name"` if no description

### Example Usage

```typescript
import { PromptRenderer } from '@ai-village/introspection';
import { getBehaviorRegistry } from '@ai-village/core';

// Get agent entity and behavior registry
const agent = world.getEntity(agentId);
const registry = world.getSystem('agent-brain').getBehaviorRegistry();

// Generate available actions list
const actions = PromptRenderer.renderAvailableActions(agent, registry);

// Example output:
// [
//   "wander: Random wandering with home bias",
//   "gather: Gather resources or seeds",
//   "talk: Engage in conversation",
//   "plant: Plant seeds",        // Only if farming >= 1
//   "build: Construct buildings", // Only if building >= 1
//   "cast_spell: Cast magical spells" // Only if magic >= 1
// ]
```

### Skill-Based Filtering

The implementation follows the progressive skill reveal specification from `SkillsComponent.ts`:

**Universal Actions** (always available):
- Movement: wander, idle, rest, sleep, navigate
- Basic needs: eat, drink, seek_food, seek_water, seek_shelter
- Social: talk, follow, call_meeting, attend_meeting
- Basic gathering: gather, pick, harvest (resource collection)

**Skill-Gated Actions:**
- **Farming 1+**: plant, till, farm, water, fertilize
- **Cooking 1+**: cook
- **Crafting 1+**: craft
- **Building 1+**: build, plan_build, repair, upgrade, tile_build
- **Animal Handling 2+**: tame_animal, house_animal, butcher
- **Medicine 2+**: heal
- **Combat 1+**: initiate_combat, hunt
- **Magic 1+**: cast_spell, pray, meditate, group_pray
- **Research 2+**: research
- **Trade 1+**: trade

**Special Actions** (always allowed):
- Queue management: set_priorities, sleep_until_queue_complete
- Goals: set_personal_goal, set_medium_term_goal, set_group_goal
- Navigation: explore_frontier, explore_spiral, follow_gradient
- Misc: work, help, follow_reporting_target

### Integration Points

This method can be integrated into:

1. **ExecutorPromptBuilder** - Add available actions to strategic planning prompts
2. **TalkerPromptBuilder** - Include in conversation context for action suggestions
3. **StructuredPromptBuilder** - Use in general agent decision prompts
4. **AgentPromptRenderer** - Integrate with agent introspection API

Example integration in ExecutorPromptBuilder:

```typescript
private buildExecutorPrompt(agent: Entity, world: World): string {
  const registry = world.getSystem('agent-brain').getBehaviorRegistry();
  const actions = PromptRenderer.renderAvailableActions(agent, registry);

  return `
## Available Actions
You can perform these actions:
${actions.map(a => `- ${a}`).join('\n')}

## Your Decision
Based on your skills, priorities, and current situation, what action will you take?
  `;
}
```

## Implementation Details

### Method Structure

1. **Early exit** if no behavior registry provided
2. **Extract skills** from entity's skills component
3. **Iterate through registered behaviors** from the registry
4. **Filter using `canPerformBehavior()`** helper method
5. **Format with descriptions** from behavior metadata

### Helper Method: `canPerformBehavior()`

Private static method that encapsulates all skill-checking logic:

```typescript
private static canPerformBehavior(
  behaviorName: string,
  skills: Record<string, number>
): boolean
```

This method:
- Checks if behavior is universal (always available)
- Checks skill requirements for gated actions
- Returns `true` for unrecognized behaviors (allows custom behaviors)

### Behavior Metadata

Leverages the existing behavior registration system from `BehaviorRegistry.ts`:

```typescript
interface BehaviorMeta {
  name: AgentBehavior;
  handler: AnyBehaviorHandler;
  usesContext: boolean;
  description?: string;  // <-- Used for action descriptions
  priority?: number;
}
```

Descriptions are set during behavior registration in `AgentBrainSystem.ts`:

```typescript
this.behaviors.register('wander', wanderBehavior, {
  description: 'Random wandering with home bias'
});
```

## Benefits

1. **Type-Safe**: Uses TypeScript for compile-time checking
2. **Skill-Aware**: Automatically filters based on agent capabilities
3. **Extensible**: Works with custom behaviors automatically
4. **Metadata-Driven**: Uses existing behavior descriptions
5. **Performance**: O(N) where N is number of registered behaviors (~50-100)
6. **Integration-Ready**: Simple API for prompt builders

## Testing

Created comprehensive test suite in:
`packages/introspection/src/prompt/__tests__/PromptRenderer.actions.test.ts`

**Test Coverage:**
- Universal actions (no skills required)
- Skill-gated actions (farming, building, magic, etc.)
- Multi-skill agents
- Edge cases (no registry, no skills, custom behaviors)
- Description formatting

## Future Enhancements

1. **Context-Aware Filtering**: Filter based on current situation (e.g., hide "build" if no resources)
2. **Priority Sorting**: Sort actions by behavior priority metadata
3. **Category Grouping**: Group actions by category (movement, social, crafting, etc.)
4. **Cooldown Tracking**: Show actions on cooldown with time remaining
5. **Prerequisite Checking**: Validate prerequisites (e.g., "craft" requires crafting station nearby)

## Related Files

- `packages/core/src/behavior/BehaviorRegistry.ts` - Behavior registration system
- `packages/core/src/systems/AgentBrainSystem.ts` - Behavior registration and execution
- `packages/core/src/components/AgentComponent.ts` - AgentBehavior type definitions
- `packages/core/src/components/SkillsComponent.ts` - Skill-based action filtering logic
- `packages/llm/src/ExecutorPromptBuilder.ts` - Example integration point
- `packages/llm/src/TalkerPromptBuilder.ts` - Example integration point

## Completion Status

✅ **COMPLETE** - The TODO on line 520 has been fully implemented with:
- Complete behavior introspection
- Skill-based filtering
- Description formatting
- Comprehensive test coverage
- Integration-ready API
