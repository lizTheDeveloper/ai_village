# Mutation Subsystem

**Location**: `packages/introspection/src/mutation/`

Validated, reversible component field mutations with event emission and render cache invalidation.

## Overview

Mutations modify entity component fields through schema-validated operations with automatic undo/redo support. All mutations check mutability flags, type constraints, and ranges before applying changes.

## Core Components

**MutationService** (`MutationService.ts`): Singleton coordinating all mutations
- `mutate(entity, componentType, fieldName, value, source)` - Single field mutation
- `mutateBatch(mutations)` - Atomic batch mutations (all-or-nothing validation)
- `undo()` / `redo()` - Undo stack operations (50 command history)
- `on('mutated', handler)` - Event subscription for change tracking
- `setDevMode(enabled)` - Dev mode bypasses mutability restrictions

**ValidationService** (`ValidationService.ts`): Pre-mutation schema validation
- Type checking (string, number, boolean, array, object, enum)
- Range validation for numbers (`field.range: [min, max]`)
- Enum value validation (`field.enumValues`)
- Max length validation (strings, arrays)
- Required field enforcement (no null/undefined)
- Mutability flag enforcement (`field.mutable`)

**UndoStack** (`UndoStack.ts`): Command pattern undo/redo
- 50 command circular buffer (configurable)
- Commands store `{entityId, componentType, fieldName, oldValue, newValue, execute(), undo()}`
- Redo stack cleared on new mutations

**MutationEvent** (`MutationEvent.ts`): Event types
- `MutationEvent` - Successful mutation (entityId, componentType, fieldName, oldValue, newValue, timestamp, source)
- `MutationFailedEvent` - Failed mutation (attemptedValue, reason)
- `MutationSource` - Who initiated: `'dev' | 'user' | 'system'`

## Usage

```typescript
import { MutationService } from '@ai-village/introspection';

// Single mutation
const result = MutationService.mutate(
  entity,
  'agent',
  'name',
  'New Name',
  'user'
);

if (!result.success) {
  console.error('Mutation failed:', result.error);
}

// Batch mutations (atomic)
const results = MutationService.mutateBatch([
  { entity, componentType: 'agent', fieldName: 'name', value: 'Alice' },
  { entity, componentType: 'position', fieldName: 'x', value: 100 }
]);

// Undo/redo
if (MutationService.canUndo()) {
  MutationService.undo();
}

// Event subscription
MutationService.on('mutated', (event) => {
  console.log(`${event.componentType}.${event.fieldName}: ${event.oldValue} → ${event.newValue}`);
});
```

## Validation Rules

Field must exist in schema, be marked `mutable: true` (unless dev mode), match declared type, satisfy constraints (range, enum, maxLength), and pass custom validators if present.

## Custom Mutators

Fields with `mutateVia` in schema use custom functions instead of direct assignment. Custom mutators handle their own side effects but bypass undo/redo (future enhancement).

## Render Cache Integration

`registerRenderCache(cache)` - Auto-invalidates caches on mutations to prevent stale UI.
