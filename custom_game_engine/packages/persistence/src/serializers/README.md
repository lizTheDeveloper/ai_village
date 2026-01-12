# Component Serializers

Component serializers convert ECS components to/from JSON for save/load operations.

## Overview

Each serializer extends `BaseComponentSerializer` and implements three methods:
- `serializeData()`: Convert component to JSON-safe object
- `deserializeData()`: Reconstruct component from JSON
- `validate()`: Type guard for deserialized data

## Serializer Types

### Generic Serializer
Default for simple components with no Maps, classes, or private fields.

```typescript
componentSerializerRegistry.register('agent', createGenericSerializer('agent', 1));
```

### Specialized Serializers
Handle complex data structures:

**Class instances**: `EpisodicMemorySerializer`, `SpatialMemorySerializer` - reconstruct class instances with private fields

**Maps/Sets**: `TrustNetworkSerializer`, `RelationshipSerializer` - convert Map/Set to arrays

**Computed fields**: `PositionSerializer` - recalculates `chunkX`/`chunkY` from `x`/`y`

**Complex state**: `PlantSerializer` - delegates to component's `toJSON()/fromJSON()` methods

## Registration

All serializers auto-register on import via `registerAllSerializers()` in `index.ts`. Add new serializers:

1. Create file: `MyComponentSerializer.ts`
2. Extend `BaseComponentSerializer<MyComponent>`
3. Register in `index.ts`: `componentSerializerRegistry.register('my_component', new MyComponentSerializer())`

## Versioning

Serializers track schema versions for migrations:

```typescript
super('renderable', 2);  // Current version: 2

// Migration registered separately in MigrationRegistry
migrationRegistry.register({
  component: 'renderable',
  fromVersion: 1,
  toVersion: 2,
  migrate: (data) => ({ ...data, sizeMultiplier: 1.0, alpha: 1.0 })
});
```

## Pattern

```typescript
export class MySerializer extends BaseComponentSerializer<MyComponent> {
  constructor() { super('my_component', 1); }

  protected serializeData(component: MyComponent): unknown {
    return { field: component.field };
  }

  protected deserializeData(data: unknown): MyComponent {
    const obj = data as { field: string };
    return { type: 'my_component', field: obj.field };
  }

  validate(data: unknown): data is MyComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('MyComponent data must be object');
    }
    return true;
  }
}
```

## Error Handling

Use assertion utilities from `utils.ts`:

```typescript
import { assertDefined, assertFiniteNumber } from '../utils.js';

assertDefined(obj.x, 'x', 'position');
assertFiniteNumber(obj.x, 'x', 'position');
```

Throws on invalid data - no silent fallbacks.
