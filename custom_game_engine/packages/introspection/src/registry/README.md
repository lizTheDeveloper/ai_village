# Component Registry

Central registry for component schemas in the Introspection System.

## Overview

The `ComponentRegistry` is a singleton that stores and retrieves component schemas. It provides type-safe queries and supports auto-registration.

## Usage

### Registering Schemas

#### Manual Registration

```typescript
import { ComponentRegistry, defineComponent } from '@ai-village/introspection';

const MySchema = defineComponent({
  type: 'my_component',
  version: 1,
  category: 'agent',
  fields: { /* ... */ },
  validate: (data) => /* ... */,
  createDefault: () => /* ... */,
});

ComponentRegistry.register(MySchema);
```

#### Auto-Registration (Recommended)

```typescript
import { autoRegister, defineComponent } from '@ai-village/introspection';

export const MySchema = autoRegister(defineComponent({
  type: 'my_component',
  // ...
}));

// Schema is automatically registered when module is imported
```

### Querying Schemas

#### Get Schema by Type

```typescript
import { ComponentRegistry } from '@ai-village/introspection';

// Without type parameter (schema fields are generic)
const schema = ComponentRegistry.get('identity');

// With type parameter (schema fields are typed!)
const schema = ComponentRegistry.get<IdentityComponent>('identity');
schema.fields.name.type // 'string' - fully typed!
```

#### Check if Schema Exists

```typescript
if (ComponentRegistry.has('identity')) {
  console.log('Identity schema is registered');
}
```

#### List All Schemas

```typescript
const allTypes = ComponentRegistry.list();
// Returns: ['identity', 'personality', 'skills', ...]
```

#### Filter by Category

```typescript
const coreSchemas = ComponentRegistry.getByCategory('core');
// Returns: [IdentitySchema, PositionSchema, SpriteSchema, ...]
```

#### Get All Schemas

```typescript
const allSchemas = ComponentRegistry.getAll();
// Returns: [schema1, schema2, ...]
```

#### Get Count

```typescript
const count = ComponentRegistry.count();
// Returns: 25
```

## API Reference

### `ComponentRegistry.register<T>(schema: ComponentSchema<T>): void`

Register a component schema. Overwrites if schema with same type already exists.

### `ComponentRegistry.get<T>(type: string): ComponentSchema<T> | undefined`

Retrieve a schema by type. Generic parameter enables type narrowing.

### `ComponentRegistry.has(type: string): boolean`

Check if a schema is registered.

### `ComponentRegistry.list(): string[]`

List all registered component type strings.

### `ComponentRegistry.getByCategory(category: ComponentCategory): ComponentSchema[]`

Get all schemas in a specific category.

### `ComponentRegistry.getAll(): ComponentSchema[]`

Get all registered schemas.

### `ComponentRegistry.count(): number`

Get the count of registered schemas.

### `ComponentRegistry.clear(): void`

Clear all registered schemas. **Mainly for testing.**

## Auto-Registration

### `autoRegister<T>(schema: ComponentSchema<T>): ComponentSchema<T>`

Automatically registers a schema when the module is imported.

**Example:**

```typescript
// packages/introspection/src/schemas/IdentitySchema.ts
import { autoRegister, defineComponent } from '@ai-village/introspection';

export const IdentitySchema = autoRegister(defineComponent({
  type: 'identity',
  version: 1,
  category: 'core',
  // ... rest of schema
}));

// Elsewhere in the code:
import { IdentitySchema } from './schemas/IdentitySchema.js';
// Schema is now registered automatically!

import { ComponentRegistry } from '@ai-village/introspection';
ComponentRegistry.has('identity') // true
```

## Type Safety

The registry uses TypeScript generics to provide type-safe queries:

```typescript
interface IdentityComponent extends Component {
  type: 'identity';
  name: string;
  age: number;
}

// Type parameter enables type inference
const schema = ComponentRegistry.get<IdentityComponent>('identity');

// Now fields are fully typed!
schema.fields.name // FieldSchema (with type: 'string')
schema.validate({ /* ... */ }) // Type predicate: data is IdentityComponent
```

## Singleton Pattern

The registry uses a singleton pattern for global access:

```typescript
// Same instance everywhere
const instance1 = ComponentRegistry.getInstance();
const instance2 = ComponentRegistry.getInstance();
instance1 === instance2 // true

// All static methods use the singleton internally
ComponentRegistry.register(schema) // Uses getInstance()
ComponentRegistry.get('type')      // Uses getInstance()
```

## Thread Safety

Registration is thread-safe (uses Map which is safe for same-turn access). All operations are synchronous.

## Testing

Use `clear()` to reset the registry between tests:

```typescript
import { ComponentRegistry } from '@ai-village/introspection';

beforeEach(() => {
  ComponentRegistry.clear();
});

it('should register schema', () => {
  ComponentRegistry.register(TestSchema);
  expect(ComponentRegistry.has('test')).toBe(true);
});
```

## Related

- [Phase 1B Spec](../../../../openspec/specs/introspection-system/phases.md#phase-1b-component-registry)
- [Implementation Summary](../../../../devlogs/PHASE_1B_COMPONENT_REGISTRY_2026-01-05.md)
