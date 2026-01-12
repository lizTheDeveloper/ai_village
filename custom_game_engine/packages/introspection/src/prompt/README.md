# Introspection Prompt Subcomponent

Auto-generates LLM prompts from entity component state using introspection schemas.

## Overview

Converts ECS component data into formatted LLM prompts via schema-driven rendering. Two renderers handle different visibility contexts:

- **PromptRenderer**: World context for LLMs (`visibility.llm === true | 'summarized'`)
- **AgentPromptRenderer**: Agent self-awareness (`visibility.agent === true`)

Both filter fields by visibility, apply custom formatters, group by section, and sort by priority.

## Prompt Templates

### PromptRenderer

Generates comprehensive world context from all LLM-visible components.

```typescript
import { PromptRenderer } from '@ai-village/introspection';

const prompt = PromptRenderer.renderEntity(entity, world);
// Output:
// ## Identity
// Name: Alice
// Species: human
// Age: 100 (27%)
//
// ## Needs
// Hunger: 75 (75%)
// Energy: 60 (60%)
```

**Visibility filtering**: `visibility.llm === true` or `'summarized'`

**Features**:
- Custom summarize functions for 'summarized' fields
- Template strings with `{fieldName}` placeholders
- Entity ID resolution via world context
- Automatic value formatting (percentages, arrays, maps, objects)
- Default value skipping unless `alwaysInclude` set
- Field grouping via `llm.promptSection`
- Priority-based ordering (`llm.priority`)

### AgentPromptRenderer

Generates agent self-awareness prompts (what NPCs know about themselves).

```typescript
import { AgentPromptRenderer } from '@ai-village/introspection';

const selfPrompt = AgentPromptRenderer.renderEntity(agent);
// Output: Same format, but only agent-visible fields
```

**Visibility filtering**: `visibility.agent === true`

**Differences from PromptRenderer**:
- No world context (agents don't resolve other entity IDs)
- No summarize functions (always detailed)
- Simpler value formatting (no complex object patterns)
- Respects `llm.includeInAgentPrompt` flag

## LLM Integration

Schema configuration controls prompt generation:

```typescript
const NeedsSchema = defineComponent<NeedsComponent>({
  fields: {
    hunger: {
      type: 'number',
      range: [0, 100],
      visibility: { llm: true, agent: true },
      llm: {
        promptLabel: 'Hunger Level',
        format: (val) => `${val} (${val > 70 ? 'satisfied' : 'hungry'})`,
        alwaysInclude: true,
        hideIf: (val) => val === 100,
      }
    }
  },

  llm: {
    promptSection: 'Needs',
    priority: 20,
    includeFieldNames: true,
    includeInAgentPrompt: true,
    summarize: (data) => `Hunger: ${data.hunger}, Energy: ${data.energy}`,
    template: 'Needs: Hunger {hunger}, Energy {energy}',
    maxLength: 200,
  }
});
```

**Field-level LLM config**:
- `promptLabel`: Display name in prompt
- `format`: Custom value formatter
- `alwaysInclude`: Include even if default value
- `hideIf`: Conditional field hiding
- `promptSection`: Override component-level section

**Component-level LLM config**:
- `promptSection`: Section header (default: 'Other')
- `priority`: Sort order (lower = earlier, default: 100)
- `includeFieldNames`: Show field labels (default: true)
- `includeInAgentPrompt`: Include in agent self-awareness (default: true)
- `summarize`: Function for 'summarized' visibility
- `template`: Template string with `{field}` placeholders
- `maxLength`: Truncate summary output

## Value Formatting

Auto-formats field values for LLM consumption:

- **Boolean**: `true` → "yes", `false` → "no"
- **Number**: Rounds to 2 decimals, shows percentage if range defined
- **Enum**: String representation
- **Array**: Comma-separated, limits to 10 items
- **Map**: "key: value" pairs, limits to 10 entries
- **Object**: Pattern-matched formatting (inventory, equipment, relationships)

Special object patterns:
- `{itemId, quantity}` → "item_id ×5"
- `{equipmentId, slot}` → "sword in right_hand"
- `{targetId, affinity}` → "agent_123 (affinity +0.5)"

## API

```typescript
// Render full entity prompt
PromptRenderer.renderEntity(entity, world?) → string

// Render single component
PromptRenderer.renderComponent(component, schema, context?) → string

// Agent self-awareness
AgentPromptRenderer.renderEntity(entity) → string
AgentPromptRenderer.renderComponent(component, schema) → string
```

**Context object** (optional for entity resolution):
```typescript
interface SummarizeContext {
  world: World;
  entityResolver: (id: string) => string;
}
```

## Examples

### Custom Summarize Function

```typescript
llm: {
  summarize: (data, context) => {
    const target = context?.entityResolver(data.targetId);
    return `Following ${target || data.targetId} at distance ${data.distance}m`;
  }
}
```

### Template with Conditional Fields

```typescript
llm: {
  template: 'Health: {health} | {status}',
  includeFieldNames: false,
}
fields: {
  status: {
    llm: { hideIf: (val) => val === 'normal' }
  }
}
```

### Agent vs LLM Visibility

```typescript
fields: {
  actual_location: {
    visibility: { llm: true, agent: false },  // LLM sees, agent doesn't
  },
  perceived_location: {
    visibility: { llm: false, agent: true },  // Agent sees, LLM doesn't
  }
}
```
