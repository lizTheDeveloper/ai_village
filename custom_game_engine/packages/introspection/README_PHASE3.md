# Phase 3: Prompt Integration - Quick Reference

## What Was Built

Schema-driven LLM prompt generation that automatically extracts component data for AI decision-making.

## Usage

### 1. Rendering Prompts from Schemas

```typescript
import { PromptRenderer, AgentPromptRenderer } from '@ai-village/introspection';

// Get LLM context for an entity
const llmPrompt = PromptRenderer.renderEntity(entity);

// Get agent self-awareness prompt
const agentPrompt = AgentPromptRenderer.renderEntity(entity);
```

### 2. Integration with StructuredPromptBuilder

The `StructuredPromptBuilder` now automatically includes schema-driven prompts:

```typescript
// In packages/llm/src/StructuredPromptBuilder.ts

buildPrompt(agent: Entity, world: World): string {
  // Auto-generates prompts for all schema'd components
  const schemaPrompt = this.buildSchemaPrompt(agent);

  // Combines with legacy extraction
  return this.formatPrompt({
    systemPrompt,      // Legacy
    schemaPrompt,      // NEW: Schema-driven
    skills: skillsText, // Legacy
    // ...
  });
}
```

### 3. Example Prompt Output

**Entity with IdentitySchema:**
```typescript
{
  id: 'agent-123',
  components: Map([
    ['identity', {
      name: 'Alice',
      species: 'human',
      age: 9125  // days
    }]
  ])
}
```

**Generated Prompt:**
```
You are Alice, a villager...

--- Schema-Driven Component Info ---
## identity
Name: Alice
Age: 9125 (91%)

Your Skills:
...
```

## Field Visibility

Control what the LLM sees via `visibility.llm`:

```typescript
fields: {
  name: {
    visibility: { llm: true },  // Full detail
  },
  internal_id: {
    visibility: { llm: false },  // Hidden from LLM
  },
  personality: {
    visibility: { llm: 'summarized' },  // Uses llm.summarize
  }
}
```

## Value Formatting

Automatic formatting based on field type:

| Type | Input | Output |
|------|-------|--------|
| boolean | `true` | `"yes"` |
| number (with range) | `80` (range: [0,100]) | `"80 (80%)"` |
| enum | `'human'` | `"human"` |
| array | `['a', 'b']` | `"a, b"` |
| map | `{x: 10, y: 20}` | `"x: 10, y: 20"` |

Override with custom formatter:
```typescript
fields: {
  health: {
    llm: {
      format: (val) => `${val}/100 HP`
    }
  }
}
```

## Summarization

Use `llm.summarize` for concise output:

```typescript
llm: {
  promptSection: 'identity',
  summarize: (data) => `${data.name} (${data.species}, ${Math.floor(data.age / 365)} years old)`
}
// Output: "Alice (human, 25 years old)"
```

## Testing

```bash
cd packages/introspection
npx tsx examples/prompt-renderer-test.ts
```

## Next Steps

1. **Migrate components to schemas** (Phase 4)
   - Create SkillsSchema, NeedsSchema, etc.
   - Components auto-appear in prompts

2. **Remove legacy extraction** (Phase 4)
   - Delete hardcoded buildSkillsSection(), etc.
   - Schema renderer handles everything

3. **Add custom renderers** (optional)
   - Override default formatting
   - Use `schema.renderers.llm` for complex components

## Files

- `src/prompt/PromptRenderer.ts` - LLM prompt generator
- `src/prompt/AgentPromptRenderer.ts` - Agent self-awareness
- `examples/prompt-renderer-test.ts` - Test/demo

## Integration

Modified `packages/llm/src/StructuredPromptBuilder.ts`:
- Added `buildSchemaPrompt()` method
- Added `schemaPrompt` field to AgentPrompt
- Integrated into `buildPrompt()` and `formatPrompt()`

No breaking changes - works alongside legacy extraction.
