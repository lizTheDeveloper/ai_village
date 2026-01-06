# Introspection System - Example Usage

This document shows how to use the Phase 1A Schema Core implementation.

## Basic Schema Definition

```typescript
import { defineComponent } from '@ai-village/introspection';
import type { Component } from '@ai-village/introspection';

// 1. Define your component interface
interface IdentityComponent extends Component {
  type: 'identity';
  version: 1;
  name: string;
  species: 'human' | 'elf' | 'dwarf';
  age: number;
}

// 2. Create the schema
export const IdentitySchema = defineComponent<IdentityComponent>({
  type: 'identity',
  version: 1,
  category: 'core',

  fields: {
    name: {
      type: 'string',
      required: true,
      description: 'Display name of the entity',
      displayName: 'Name',
      visibility: {
        player: true,
        llm: true,
        agent: true,
        dev: true,
      },
      ui: {
        widget: 'text',
        group: 'basic',
        order: 1,
      },
      mutable: true,
    },

    species: {
      type: 'enum',
      enumValues: ['human', 'elf', 'dwarf'] as const,
      required: true,
      default: 'human',
      description: 'Species type',
      visibility: {
        player: true,
        llm: true,
        agent: true,
        dev: true,
      },
      ui: {
        widget: 'dropdown',
        group: 'basic',
        order: 2,
      },
      mutable: false, // Can't change species
    },

    age: {
      type: 'number',
      required: true,
      default: 0,
      range: [0, 10000],
      description: 'Age in days',
      visibility: {
        player: true,
        llm: true,
        agent: true,
        dev: true,
      },
      ui: {
        widget: 'slider',
        group: 'basic',
        order: 3,
      },
      mutable: true,
    },
  },

  // UI configuration (component-level)
  ui: {
    icon: 'person',
    color: '#4CAF50',
    priority: 1, // Show first in panels
  },

  // LLM configuration
  llm: {
    promptSection: 'identity',
    summarize: (data) =>
      `${data.name} (${data.species}, ${Math.floor(data.age / 365)} years old)`,
  },

  // Validation
  validate: (data): data is IdentityComponent => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      data.type === 'identity' &&
      'name' in data &&
      typeof data.name === 'string' &&
      'species' in data &&
      ['human', 'elf', 'dwarf'].includes(data.species as string) &&
      'age' in data &&
      typeof data.age === 'number'
    );
  },

  // Create default instance
  createDefault: () => ({
    type: 'identity',
    version: 1,
    name: 'Unknown',
    species: 'human',
    age: 0,
  }),
});
```

## Using the Schema

### Validation

```typescript
import { validateSchema, assertValidSchema } from '@ai-village/introspection';

// Check if schema is well-formed
const result = validateSchema(IdentitySchema);
if (!result.valid) {
  console.error('Schema errors:', result.errors);
}

// Or throw on invalid schema
assertValidSchema(IdentitySchema); // Throws if invalid
```

### Creating Instances

```typescript
// Create default instance
const defaultIdentity = IdentitySchema.createDefault();
// { type: 'identity', version: 1, name: 'Unknown', species: 'human', age: 0 }

// Validate data
const userData = { type: 'identity', version: 1, name: 'Alice', species: 'elf', age: 7300 };
if (IdentitySchema.validate(userData)) {
  // TypeScript now knows userData is IdentityComponent
  console.log(userData.name); // Type-safe access
}
```

### Accessing Schema Metadata

```typescript
// Field metadata
const nameField = IdentitySchema.fields.name;
console.log(nameField.type); // 'string'
console.log(nameField.required); // true
console.log(nameField.visibility.player); // true
console.log(nameField.ui?.widget); // 'text'

// Component metadata
console.log(IdentitySchema.category); // 'core'
console.log(IdentitySchema.ui?.icon); // 'person'
console.log(IdentitySchema.llm?.promptSection); // 'identity'
```

### Type Guards

```typescript
import { isString, isNumber, validateFieldValue } from '@ai-village/introspection';

// Basic type checking
if (isString(value)) {
  console.log(value.toUpperCase()); // Type-safe
}

// Field value validation
const isValid = validateFieldValue(
  25,
  'number',
  { range: [0, 100], required: true }
); // true

// Enum validation
import { isEnum } from '@ai-village/introspection';

const species = 'elf';
if (isEnum(species, ['human', 'elf', 'dwarf'])) {
  // species is narrowed to 'human' | 'elf' | 'dwarf'
}
```

## Advanced Features

### Custom Renderers

```typescript
const MySchema = defineComponent<MyComponent>({
  // ... fields ...

  renderers: {
    // Player UI renderer
    player: (data) => `${data.name} [HP: ${data.health}]`,

    // LLM prompt renderer
    llm: (data) => `${data.name} is feeling ${data.mood}`,

    // Dev panel renderer
    dev: (data, mutate) => {
      const div = document.createElement('div');
      div.textContent = `Debug: ${JSON.stringify(data)}`;
      return div;
    },
  },
});
```

### Mutators

```typescript
const MySchema = defineComponent<MyComponent>({
  // ... fields ...

  mutators: {
    rename: (entity, newName: string) => {
      if (newName.length < 1 || newName.length > 50) {
        throw new Error('Name must be 1-50 characters');
      }
      entity.getComponent('my_component').name = newName;
    },

    levelUp: (entity) => {
      const component = entity.getComponent('my_component');
      component.level += 1;
      component.xp = 0;
    },
  },
});
```

### Field Constraints

```typescript
const MySchema = defineComponent<MyComponent>({
  fields: {
    // String with max length
    description: {
      type: 'string',
      required: false,
      maxLength: 500,
      description: 'Entity description',
      visibility: { dev: true },
      ui: { widget: 'textarea' },
    },

    // Number with range
    health: {
      type: 'number',
      required: true,
      range: [0, 100],
      default: 100,
      description: 'Current health points',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'slider' },
    },

    // Enum
    rarity: {
      type: 'enum',
      enumValues: ['common', 'rare', 'epic', 'legendary'],
      required: true,
      default: 'common',
      description: 'Item rarity',
      visibility: { player: true, dev: true },
      ui: { widget: 'dropdown' },
    },

    // Array
    tags: {
      type: 'array',
      itemType: 'string',
      required: false,
      maxLength: 10,
      description: 'Entity tags',
      visibility: { dev: true },
      ui: { widget: 'json' },
    },
  },
});
```

## Consumer-Specific Visibility

```typescript
const MySchema = defineComponent<MyComponent>({
  fields: {
    // Visible to everyone
    name: {
      visibility: {
        player: true,
        llm: true,
        agent: true,
        user: true,
        dev: true,
      },
      // ...
    },

    // Internal debug field
    debugFlag: {
      visibility: {
        dev: true, // Only visible in dev panel
      },
      // ...
    },

    // LLM summary only
    personality: {
      visibility: {
        llm: 'summarized', // Summarize for LLM
        dev: true,
      },
      // ...
    },

    // Agent self-awareness
    thoughts: {
      visibility: {
        agent: true, // Agent can see its own thoughts
        dev: true,
      },
      // ...
    },
  },
});
```

## Next Steps

Once Phase 1B (Component Registry) is implemented, you'll be able to:

```typescript
import { ComponentRegistry } from '@ai-village/introspection';

// Register schema (auto-registration in future)
ComponentRegistry.register(IdentitySchema);

// Query schemas
const schema = ComponentRegistry.get('identity');
const coreSchemas = ComponentRegistry.getByCategory('core');
const allSchemas = ComponentRegistry.list();
```

Once Phase 2 (Renderers) is implemented, schemas will automatically generate UI with no additional code required.
