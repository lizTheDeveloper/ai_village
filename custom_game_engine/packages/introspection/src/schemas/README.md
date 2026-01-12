# Schema Definitions

Component schema definitions for entity inspection, UI rendering, and LLM prompt generation.

## Overview

Schemas define component structure, validation, metadata, and presentation. Each schema uses `defineComponent()` with typed fields, UI hints, LLM summarization, and validation logic.

## Schema Categories

Organized in 10 tiers by domain:

**Core (Tier 1)**: `IdentitySchema`, `PositionSchema`, `RenderableSchema` - universal entity properties

**Agent (Tier 2)**: `agent/` - agent-specific components (personality, skills, needs, circadian, mood, temperature, combat stats, profession, military)

**Physical (Tier 3)**: `physical/` - physical properties (movement, physics, animals, plants, injuries, species, velocity, seeds)

**Social (Tier 4)**: `social/` - relationships, social memory, conversations, newspapers, census, markets, trust, journals, jealousy, parenting, conflicts, meetings, governance

**Cognitive (Tier 5)**: `cognitive/` - memory, goals, beliefs, spirits, soul (identity, link, wisdom, veil of forgetting), recipe discovery, plant knowledge, uplift candidates

**Magic (Tier 6)**: `magic/` - magic components, deities, divine chat, lore fragments, myths, supreme creator

**World (Tier 7)**: `world/` - weather, buildings, resources, time, portals, passages, realms, shops, warehouses, libraries, clinics, town halls, landmarks, proto-reality, corrupted universes

**System (Tier 8)**: `system/` - steering, animation, appearance, vision, power, player control, recording, reflection, research state, assembly machines, factory AI, video replays

**Afterlife (Tier 9)**: `afterlife/` - afterlife state, memories, death bargains, death judgment

**Equipment/Inventory**: `InventorySchema`, `EquipmentSchema` - item management

## Schema Structure

Each schema defines:

```typescript
defineComponent<T>({
  type: 'component_name',           // lowercase_with_underscores
  version: 1,                        // schema version
  category: 'core' | 'agent' | ..., // tier category

  fields: {                          // field definitions
    fieldName: {
      type: 'string' | 'number' | 'boolean' | 'enum' | ...,
      required: boolean,
      default: any,
      range?: [min, max],            // for numbers
      enumValues?: readonly [...],   // for enums
      description: string,
      displayName: string,           // UI label
      visibility: {                  // who can see this field
        player: boolean | 'summarized',
        llm: boolean | 'summarized',
        agent: boolean,
        user: boolean,
        dev: boolean
      },
      ui: {
        widget: 'text' | 'slider' | 'dropdown' | ...,
        group: string,               // field grouping
        order: number                // display order
      },
      mutable: boolean               // can be changed post-creation
    }
  },

  ui: {                              // component-level UI
    icon: string,
    color: string,
    priority: number
  },

  llm: {                             // LLM prompt generation
    promptSection: string,
    summarize: (data) => string
  },

  validate: (data) => boolean,       // runtime validation
  createDefault: () => T             // factory function
})
```

## Validation

Schemas validate component data at runtime:

- **Type checking**: Field types enforced (`string`, `number`, `boolean`, `enum`, etc.)
- **Required fields**: Missing required fields rejected
- **Range validation**: Numeric fields validated against `range: [min, max]`
- **Enum validation**: Enum fields validated against `enumValues`
- **Custom validation**: `validate()` function for complex rules

## Usage

```typescript
import { IdentitySchema } from '@ai-village/introspection';

// Create component with defaults
const identity = IdentitySchema.createDefault();

// Validate existing data
if (IdentitySchema.validate(data)) {
  // data is IdentityComponent
}

// Generate LLM summary
const summary = IdentitySchema.llm.summarize(identity);
// => "Alice (human, 25 years old)"
```

## Auto-Registration

Schemas use `autoRegister()` to register with `ComponentRegistry` on import. Access via:

```typescript
import { componentRegistry } from '@ai-village/introspection';

const schema = componentRegistry.getSchema('identity');
const allSchemas = componentRegistry.getAllSchemas();
```

## Adding Schemas

1. Create schema file in appropriate category directory
2. Define interface extending `Component`
3. Export schema with `autoRegister(defineComponent<T>({...}))`
4. Export from category `index.ts`
5. Schema auto-registers on import
