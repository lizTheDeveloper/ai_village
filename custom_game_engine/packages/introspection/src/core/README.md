# Core Introspection

Schema validation engine for component introspection system.

## Overview

Validates `ComponentSchema` definitions to ensure well-formed metadata. Checks schema structure, field definitions, type constraints, and mutator functions before registration.

## Key Functions

### `validateSchema<T>(schema: ComponentSchema<T>): SchemaValidationResult`

Validates schema structure and returns errors if malformed.

**Checks**:
- Required fields: `type` (string), `version` (number), `category`, `fields` (object)
- Required functions: `validate`, `createDefault`
- Field constraints: type, required flag, description, visibility, enum values, item types
- Range validation: `[min, max]` tuples, min ≤ max
- Mutators: all must be functions

**Returns**: `{ valid: boolean, errors: string[] }`

### `assertValidSchema<T>(schema: ComponentSchema<T>): void`

Throws if schema invalid. Use during schema registration to fail fast.

```typescript
import { assertValidSchema } from '@ai-village/introspection/core';

assertValidSchema(IdentitySchema);  // Throws if invalid
```

## Integration with ECS

Schemas define metadata for ECS components. Validation ensures:
- LLM prompts have required field descriptions
- UI renderers have valid widget types
- Mutators exist before field mutations
- Type constraints match runtime data

**Example**:
```typescript
const schema: ComponentSchema<HealthComponent> = {
  type: 'health',
  version: 1,
  category: 'agent',
  fields: {
    current: {
      type: 'number',
      required: true,
      range: [0, 100],
      description: 'Current HP',
      visibility: { player: true, llm: true, dev: true }
    }
  },
  validate: (data): data is HealthComponent =>
    typeof data.current === 'number',
  createDefault: () => ({ type: 'health', version: 1, current: 100 })
};

assertValidSchema(schema);  // Pass validation before use
```

## Field Validation

`validateField()` enforces:
- **Enum types**: Must have `enumValues`
- **Array/Map types**: Must have `itemType`
- **Range constraints**: Must be `[min, max]` with min ≤ max
- **Required metadata**: `type`, `required`, `visibility`

Errors use prefix `"Field 'fieldName': message"` for clarity.
