# ECS Components

Components are pure data containers in the Entity-Component-System architecture. Entities are collections of components; systems operate on entities with specific component combinations.

## Structure

All components:
- Extend `Component` interface with `type` and `version` fields
- Use `lowercase_with_underscores` naming convention for type strings
- Are immutable data structures (systems create new instances on update)
- Include factory functions (`createXComponent`) and helper utilities

## Categories

**Physical**: `position` (x/y/z with chunk coords), `physics`, `renderable`, `animation`, `velocity`, `steering`, `temperature`

**Cognitive**: `agent` (behavior state, thinking tier), `memory`, `episodic_memory`, `semantic_memory`, `social_memory`, `reflection`, `journal`, `spatial_memory`, `vision`, `personality`, `identity`, `skills`, `goals`

**Social**: `conversation`, `relationship`, `jealousy`, `trust_network`, `belief`, `social_gradient`, `meeting`

**Survival**: `needs` (hunger/thirst/sleep/warmth), `health`, `circadian`, `mood`, `inventory`, `equipment`

**Biological**: `plant`, `seed`, `animal`, `species`, `genetic`, `body`, `parenting`

**Structural**: `building`, `resource`, `warehouse`, `library`, `university`, `crafting_station`, `power`, `belt`, `assembly_machine`

**Advanced**: `magic`, `spiritual`, `deity`, `soul_identity`, `incarnation`, `afterlife`, `realm`, `portal`

**Metasystem**: `player_control`, `myth`, `plot`, `recording`, `video_replay`, `trade_agreement`

## Example

```typescript
import { createPositionComponent } from './PositionComponent.js';

const pos = createPositionComponent(10, 20, 0); // x, y, z
// { type: 'position', version: 1, x: 10, y: 20, z: 0, chunkX: 0, chunkY: 1 }
```

## Schemas

Components define schemas with field types and validators. Used for serialization, migration, and introspection.

```typescript
export const PositionComponentSchema: ComponentSchema<PositionComponent> = {
  type: 'position',
  version: 1,
  fields: [
    { name: 'x', type: 'number', required: true },
    { name: 'y', type: 'number', required: true },
    // ...
  ],
  validate: (data): data is PositionComponent => { /* ... */ },
  createDefault: () => createPositionComponent(0, 0, 0),
};
```

## Adding Components

1. Create `ComponentNameComponent.ts` with interface, factory, helpers
2. Export from `index.ts`
3. Define schema with fields and validation
4. Follow naming: type string uses `lowercase_with_underscores`
