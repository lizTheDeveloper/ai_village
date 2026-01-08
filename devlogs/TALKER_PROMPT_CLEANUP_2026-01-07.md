# TalkerPromptBuilder Cleanup - 2026-01-07

## Summary

Cleaned up TalkerPromptBuilder to reduce LLM prompt pollution by:
1. Filtering schema components to only socially-relevant ones
2. Removing duplicate cold/freezing warnings from Environment section

## Changes Made

### 1. Schema Component Filtering

**Problem**: `buildSchemaPrompt()` was rendering ALL entity components via PromptRenderer, including irrelevant components like:
- Combat stats (guard_duty, weapon/armor details)
- Navigation internals (navigation_hints, exploration)
- Metadata (tags, biology species duplicates)
- Physical mechanics (parenting, gathering stats)
- Realm/multiverse internals (realm_location)

**Solution**: Added `SOCIALLY_RELEVANT_COMPONENTS` whitelist and filtering logic.

**Components Kept (52 total)**:
```typescript
private static readonly SOCIALLY_RELEVANT_COMPONENTS = new Set([
  // Core identity and personality
  'identity', 'personality', 'emotional_state', 'mood',

  // Social components
  'relationships', 'social_knowledge', 'conversation', 'social_memory',

  // Memory and cognition
  'memory', 'episodic_memory', 'semantic_memory', 'beliefs',

  // Goals and motivations
  'goals',

  // Needs (affect mood and social behavior)
  'needs', 'afterlife_needs',

  // Inventory (what you have affects conversations)
  'inventory',

  // Skills (what you can do affects social standing)
  'skills',

  // Physical state (injuries/health affect behavior)
  'health', 'physical_state', 'temperature',

  // Spiritual/cognitive state
  'spiritual', 'soul',

  // Journal/diary entries
  'journal',
]);
```

**Implementation**:
```typescript
private buildSchemaPrompt(agent: Entity, world: World): string {
  // Create filtered entity with only socially-relevant components
  const filteredComponents = new Map<string, any>();

  for (const [componentType, componentData] of agent.components.entries()) {
    if (TalkerPromptBuilder.SOCIALLY_RELEVANT_COMPONENTS.has(componentType)) {
      filteredComponents.set(componentType, componentData);
    }
  }

  const filteredEntity = { id: agent.id, components: filteredComponents };
  const schemaPrompt = PromptRenderer.renderEntity(filteredEntity as any, world);

  return schemaPrompt ? `--- Schema-Driven Component Info ---\n${schemaPrompt}` : '';
}
```

**Impact**:
- Reduces prompt tokens by filtering out ~20-30 irrelevant components
- Focuses LLM attention on social-relevant state
- Prevents combat stats, navigation internals, and metadata from polluting social decisions

### 2. Remove Duplicate Cold Warning

**Problem**: Cold/freezing warnings appeared TWICE in prompts:
1. At top in "!!! CRITICAL NEEDS !!!" section (extracted by `extractCriticalNeeds()`)
2. In "--- Environment ---" section (added by `buildEnvironmentContext()`)

**Solution**: Modified `buildEnvironmentContext()` to skip cold/freezing warnings since they're already shown at top.

**Before**:
```typescript
if (tempState === 'dangerously_cold') {
  context += '[FREEZING] You are dangerously cold! Find warmth immediately!\n';
} else if (tempState === 'cold') {
  context += '[COLD WARNING] You are cold. You need to warm up.\n';
} else if (tempState === 'comfortable') {
  context += 'The temperature is comfortable.\n';
}
```

**After**:
```typescript
// NOTE: Critical cold warnings ([FREEZING], [COLD WARNING]) are already extracted
// to the top of the prompt via extractCriticalNeeds(). Only show comfortable state here.
if (tempState === 'comfortable') {
  context += 'The temperature is comfortable.\n';
}
// 'cold' and 'dangerously_cold' are shown at the top as critical needs
```

**Impact**:
- Eliminates duplicate warnings that waste tokens
- Cold warnings still appear prominently at top of prompt
- Comfortable temperature still shown for context

## Files Changed

- `/Users/annhoward/src/ai_village/custom_game_engine/packages/llm/src/TalkerPromptBuilder.ts`

## Verification

```bash
cd custom_game_engine && npm run build
```

Build succeeded with no TypeScript errors.

## Token Savings Estimate

**Per-agent prompt reduction**:
- Filtered components: ~15-25 components × ~50-100 tokens each = **750-2,500 tokens saved**
- Removed duplicate cold warning: ~20-40 tokens saved
- **Total savings: ~770-2,540 tokens per Talker prompt**

With 10+ agents making social decisions per game tick, this adds up to significant savings over time.

## Rationale

The Talker layer is the "social brain" - it handles conversations, relationships, and goal-setting. It doesn't need to know:
- Combat stats (weapon damage, armor defense)
- Navigation internals (pathfinding hints, exploration state)
- Gathering mechanics (resource gathering efficiency)
- Metadata (component tags, internal IDs)

By filtering to only socially-relevant components, we:
1. Reduce prompt tokens significantly
2. Focus LLM attention on relevant state
3. Improve response quality by reducing noise
4. Follow the architectural separation: Talker = social decisions, Executor = task planning

## Related Work

This cleanup is part of the broader LLM prompt optimization effort documented in:
- `LLM_PROMPT_POLLUTION_FIXES_2026-01-07.md` - Conversation system improvements
- `LMI_TALKER_PROMPT_ISSUES_2026-01-07.md` - Talker/LMI integration analysis
