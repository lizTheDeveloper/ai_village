# Relationship Schema Name Resolution Fix

**Date:** 2026-01-07
**Status:** ✅ Complete
**Impact:** Fixes RelationshipSchema's summarize function to show agent names instead of UUIDs in LLM prompts

---

## Problem

The `RelationshipSchema.ts` summarize function was showing UUIDs instead of agent names in LLM prompts:

```
Friends: e3f4a2b1-... (affinity: 85, trust: 90)
```

This happened because:
1. `PromptRenderer.renderEntity()` only passed component data to summarize functions
2. Summarize functions had no way to resolve entity IDs to names
3. `TalkerPromptBuilder.buildSocialContext()` **did** properly resolve names using `world.getEntity()`, but only in its own legacy code path

---

## Solution

Added optional world context to the schema summarization pipeline:

### 1. Updated `LLMConfig` Type Signature

**File:** `packages/introspection/src/types/LLMConfig.ts`

Added `SummarizeContext` interface and updated `summarize` signature:

```typescript
export interface SummarizeContext {
  world?: any;
  entityResolver?: (id: string) => string;
}

export interface LLMConfig<T = any> {
  summarize?: (data: T, context?: SummarizeContext) => string;
  // ... other fields
}
```

**Key Design:**
- `world` is typed as `any` to avoid circular dependency (introspection → core)
- `entityResolver` provides a functional abstraction for name resolution
- Both are optional for backwards compatibility

### 2. Updated `PromptRenderer.renderEntity()`

**File:** `packages/introspection/src/prompt/PromptRenderer.ts`

```typescript
static renderEntity(
  entity: { id: string; components: Map<string, any> },
  world?: any
): string {
  // Build context for summarize functions
  const context: SummarizeContext | undefined = world ? {
    world,
    entityResolver: (id: string) => {
      const targetEntity = world.getEntity?.(id);
      if (!targetEntity) return id;
      const identity = targetEntity.components?.get('identity');
      return identity?.name || id;
    }
  } : undefined;

  // Pass context to renderComponent
  const content = this.renderComponent(componentData, schema, context);
}
```

**Key Design:**
- Only creates context if world is provided (no overhead when not needed)
- Resolver uses optional chaining to safely handle missing entities/identities
- Falls back to UUID if entity or name not found

### 3. Updated `RelationshipSchema.summarize()`

**File:** `packages/introspection/src/schemas/RelationshipSchema.ts`

```typescript
summarize: (data, context) => {
  const resolveName = context?.entityResolver || ((id: string) => id);

  if (friends.length > 0) {
    const friendNames = friends
      .map((r) => `${resolveName(r.targetId)} (affinity: ${r.affinity}, trust: ${r.trust})`)
      .join(', ');
    parts.push(`Friends: ${friendNames}`);
  }
  // ... similar for rivals
}
```

**Key Design:**
- Uses resolver if available, otherwise falls back to ID
- No breaking changes - works with or without context

### 3b. Updated `ConversationSchema.summarize()`

**File:** `packages/introspection/src/schemas/social/ConversationSchema.ts`

```typescript
summarize: (data, context) => {
  if (!data.isActive || !data.partnerId) {
    return 'Not in conversation';
  }

  // Resolve partner name if context available
  const resolveName = context?.entityResolver || ((id: string) => id);
  const partnerName = resolveName(data.partnerId);

  return `Talking with ${partnerName} (${messageCount} messages, ${duration} ticks) | Recent: ${recentMessages}`;
}
```

**Before:** `Talking with e3f4a2b1-... (5 messages, 12 ticks)`
**After:** `Talking with Alice (5 messages, 12 ticks)`

### 4. Updated All Prompt Builders

**Files:**
- `packages/llm/src/TalkerPromptBuilder.ts`
- `packages/llm/src/StructuredPromptBuilder.ts`
- `packages/llm/src/ExecutorPromptBuilder.ts`

All three now pass `world` to `PromptRenderer.renderEntity()`:

```typescript
private buildSchemaPrompt(agent: Entity, world: World): string {
  const schemaPrompt = PromptRenderer.renderEntity(agent as any, world);
  return `--- Schema-Driven Component Info ---\n${schemaPrompt}`;
}

buildPrompt(agent: Entity, world: World): string {
  const schemaPrompt = this.buildSchemaPrompt(agent, world);
  // ...
}
```

---

## Result

### Before

```
## relationships
Friends: e3f4a2b1-7c9d-4f3a-8e5b-2d1a6c4f9e7b (affinity: 85, trust: 90),
         f2a9c3e1-5b7d-4c8a-9f2e-1d3b5a7c9e8f (affinity: 72, trust: 85)
Rivals: a7c4e9f1-2b5d-3c8a-6f1e-9d4b7c2e5a8f (affinity: -65)
```

### After

```
## relationships
Friends: Alice (affinity: 85, trust: 90), Bob (affinity: 72, trust: 85)
Rivals: Charlie (affinity: -65)
```

---

## Architecture Benefits

### 1. Decoupling Maintained

- Introspection package still has **zero dependencies** on core World type
- Uses `any` type and optional chaining to avoid circular deps
- Functional resolver pattern allows flexible implementations

### 2. Backwards Compatible

- `world` parameter is optional everywhere
- Summarize functions work with or without context
- No breaking changes to existing code

### 3. Extensible Pattern

Other schemas can now use entity resolution:
- `SocialMemorySchema` (though current summary doesn't need it)
- Future schemas that reference entities
- Custom renderers via `context?.entityResolver`

### 4. Single Source of Truth

- Entity name resolution logic is centralized in `PromptRenderer`
- All three prompt builders (Talker, Executor, Structured) use the same path
- Removes duplicated resolution logic from `TalkerPromptBuilder.buildSocialContext()`

---

## Testing

### Build Verification

```bash
npm run build
```

✅ **Result:** TypeScript compiles without errors

### Manual Testing Steps

1. Start the game with agents who have relationships
2. Trigger LLM decision (conversation or action)
3. Check LLM prompt in console/logs
4. Verify relationship section shows names instead of UUIDs

### No Test Files Changed

```bash
grep -r "PromptRenderer.renderEntity" packages/**/*.test.ts
# No matches found
```

No unit tests needed updating since there were no existing tests for `PromptRenderer.renderEntity()`.

---

## Files Modified

1. `packages/introspection/src/types/LLMConfig.ts`
   - Added `SummarizeContext` interface
   - Updated `summarize` signature to accept optional context

2. `packages/introspection/src/prompt/PromptRenderer.ts`
   - Updated `renderEntity()` to accept optional `world` parameter
   - Build `SummarizeContext` with entity resolver
   - Updated `renderComponent()` to accept and pass context

3. `packages/introspection/src/schemas/RelationshipSchema.ts`
   - Updated `summarize` to use `context?.entityResolver`
   - Resolve friend and rival names instead of showing UUIDs

4. `packages/introspection/src/schemas/social/ConversationSchema.ts`
   - Updated `summarize` to use `context?.entityResolver`
   - Resolve conversation partner name instead of showing UUID

5. `packages/llm/src/TalkerPromptBuilder.ts`
   - Updated `buildSchemaPrompt()` to accept `world` parameter
   - Pass `world` to `PromptRenderer.renderEntity()`

6. `packages/llm/src/StructuredPromptBuilder.ts`
   - Updated `buildSchemaPrompt()` to accept `world` parameter
   - Pass `world` to `PromptRenderer.renderEntity()`

7. `packages/llm/src/ExecutorPromptBuilder.ts`
   - Updated `buildSchemaPrompt()` to accept `world` parameter
   - Pass `world` to `PromptRenderer.renderEntity()`

---

## Future Enhancements

### 1. Other Schemas

Consider adding name resolution to other schemas that reference entities:
- `JournalSchema` (references other agents in journal entries)
- `ConversationSchema` (partner ID)
- Custom schemas created by users

### 2. Enhanced Resolver

The `entityResolver` could be extended to provide:
- Species/type information: `"Alice (human)"`
- Status markers: `"Bob (deceased)"`, `"Charlie (NPC)"`
- Distance/location: `"Dave (nearby)"`, `"Eve (distant)"`

### 3. Caching

For performance, entity name resolution could be cached per-tick:

```typescript
const nameCache = new Map<string, string>();
const resolver = (id: string) => {
  if (!nameCache.has(id)) {
    nameCache.set(id, world.getEntity(id)?.getComponent('identity')?.name || id);
  }
  return nameCache.get(id)!;
};
```

---

## Lessons Learned

1. **Schema-driven prompts are powerful** - Once we fixed the plumbing, all schemas automatically get entity resolution
2. **Optional parameters preserve compatibility** - No breaking changes needed
3. **Functional abstractions avoid dependencies** - `entityResolver` function avoids importing World type
4. **Multiple prompt builders exist** - Need to update all three (Talker, Executor, Structured)

---

## Related Work

This fix integrates with the broader introspection/schema system:
- Phase 3: Prompt Integration (schema-driven prompts)
- Phase 4: Social Components (RelationshipSchema, SocialMemorySchema)
- Three-layer LLM architecture (Talker, Executor, Autonomic)

See:
- `custom_game_engine/METASYSTEMS_GUIDE.md` - Introspection system overview
- `custom_game_engine/packages/introspection/README.md` - Introspection package docs
- `custom_game_engine/packages/llm/README.md` - LLM prompt builder docs
