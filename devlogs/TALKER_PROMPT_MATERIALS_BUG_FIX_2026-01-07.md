# TalkerPromptBuilder Materials Display Bug Fix

**Date:** 2026-01-07
**File:** `custom_game_engine/packages/llm/src/TalkerPromptBuilder.ts`
**Issue:** Materials section showing "resource" instead of actual resource types

## Problem

The environment section of the Talker prompt was displaying:
```
Materials around: resource
```

Instead of the actual resource types like:
```
Materials around: wood, stone, fiber, berry
```

## Root Cause

Two bugs in the `buildEnvironmentContext` method (lines 430-448):

1. **Resource component field mismatch** (line 434):
   - Code was checking: `resourceComp?.type`
   - Should be: `resourceComp?.resourceType`
   - The `ResourceComponent` interface defines the field as `resourceType`, not `type`

2. **Plant component field mismatch** (line 444):
   - Code was checking: `plantComp?.species`
   - Should be: `plantComp?.speciesId`
   - The `PlantComponent` class defines the field as `speciesId`, not `species`

## Fix

### Resource Component Fix

**Before:**
```typescript
const resourceComp = resource?.components.get('resource') as any;
if (resourceComp?.type) {
  resourceTypes.add(resourceComp.type);
}
```

**After:**
```typescript
const resourceComp = resource?.components.get('resource') as ResourceComponent | undefined;
if (resourceComp?.resourceType) {
  resourceTypes.add(resourceComp.resourceType);
}
```

### Plant Component Fix

**Before:**
```typescript
const plantComp = plant?.components.get('plant') as any;
if (plantComp?.species) {
  resourceTypes.add(plantComp.species);
}
```

**After:**
```typescript
const plantComp = plant?.components.get('plant') as any;
if (plantComp?.speciesId) {
  resourceTypes.add(plantComp.speciesId);
}
```

### Type Safety Improvement

Added `ResourceComponent` to imports for better type safety:
```typescript
import {
  // ... other imports
  type ResourceComponent,
  formatGoalsForPrompt,
} from '@ai-village/core';
```

## Verification

1. **Build passed:** `npm run build` completed successfully
2. **No new test failures:** Test suite shows same pre-existing failures (unrelated to this fix)
3. **Type safety improved:** Using proper types instead of `any` for resource components

## Expected Behavior

After this fix, agents will now see proper resource listings in their prompts:
```
Materials around: wood, stone, fiber, berry_bush, oak
```

This enables better LLM decision-making as agents can now see what specific materials are available around them.

## Related Components

- **ResourceComponent:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/components/ResourceComponent.ts`
- **PlantComponent:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/components/PlantComponent.ts`
- **VisionComponent:** Used to track seen resources and plants
