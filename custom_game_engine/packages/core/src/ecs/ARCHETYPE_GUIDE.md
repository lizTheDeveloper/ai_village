# Entity Archetype System

## Overview

The entity archetype system provides pre-configured entity templates for common entity types. Instead of manually adding components to each entity, you can specify an archetype when creating the entity to get a standard set of components.

## Usage

```typescript
import { World } from '@ai-village/core';

// Create entity with archetype
const building = world.createEntity('building');
// building now has: Position, Renderable, Tags, Physics components

// Create entity without archetype (empty)
const empty = world.createEntity();
// empty has no components
```

## Available Archetypes

### `agent`
**Minimal agent entity** (use `createWanderingAgent`/`createLLMAgent` for full agents)

**Components:**
- Tags: `['agent']`

**Note:** This is a minimal scaffold. For fully functional agents with cognition, memory, needs, and behaviors, use the factory functions from `@ai-village/agents`:
- `createWanderingAgent()` - Script-driven agent with full AI systems
- `createLLMAgent()` - LLM-powered agent with full AI systems

### `building`
**Basic building entity**

**Components:**
- Position (0, 0)
- Renderable (sprite: 'building', layer: 'entity')
- Tags: `['building']`
- Physics (solid, 2x2 footprint)

**Usage:**
```typescript
const building = world.createEntity('building');
// Add BuildingComponent separately with specific building type
```

### `plant`
**Plant entity**

**Components:**
- Position (0, 0)
- Renderable (sprite: 'plant', layer: 'entity')
- Tags: `['plant']`
- Physics (non-solid, 1x1)

**Note:** PlantComponent should be added separately with genetics data.

### `animal`
**Animal entity**

**Components:**
- Position (0, 0)
- Renderable (sprite: 'animal', layer: 'entity')
- Tags: `['animal']`
- Physics (non-solid, 1x1)

**Note:** AnimalComponent requires extensive data - add it separately after entity creation.

### `item`
**Item/resource entity**

**Components:**
- Position (0, 0)
- Renderable (sprite: 'item', layer: 'entity')
- Tags: `['item', 'resource']`
- Physics (non-solid, 1x1, can be picked up)

### `deity`
**Divine entity**

**Components:**
- Tags: `['deity', 'divine', 'immortal']`

**Note:** Add DeityComponent separately with deity-specific data.

### `companion`
**Companion entity** (use `createOphanimimCompanion` for full setup)

**Components:**
- Tags: `['companion', 'divine', 'immortal', 'conversational']`

**Note:** For the Ophanim companion, use `createOphanimimCompanion()` from `@ai-village/core/companions`.

### `spaceship`
**Spaceship entity**

**Components:**
- Position (0, 0)
- Renderable (sprite: 'spaceship', layer: 'entity')
- Tags: `['spaceship', 'vehicle']`
- Physics (solid, 3x3 footprint)

## Customization After Creation

Archetype components can be modified after entity creation:

```typescript
const building = world.createEntity('building');

// Modify position
const position = building.getComponent(CT.Position);
position.x = 100;
position.y = 200;

// Add additional components
world.addComponent(building.id, new BuildingComponent({
  buildingType: BuildingType.House,
  // ... other building data
}));
```

## Error Handling

Invalid archetype names throw an error listing all valid archetypes:

```typescript
try {
  world.createEntity('invalid');
} catch (error) {
  // Error: Unknown archetype 'invalid'. Valid archetypes: agent, building, plant, animal, item, deity, companion, spaceship
}
```

## Implementation Details

Archetypes are defined in `World.ts` in the `ENTITY_ARCHETYPES` registry. Each archetype has:

1. **description**: Human-readable explanation
2. **apply**: Function that adds components to the entity

Example archetype definition:
```typescript
const ENTITY_ARCHETYPES: Record<string, ArchetypeDefinition> = {
  building: {
    description: 'Basic building entity with position, renderable, and tags',
    apply: (entity: EntityImpl) => {
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRenderableComponent('building', 'entity'));
      entity.addComponent(createTagsComponent('building'));
      entity.addComponent(createPhysicsComponent(true, 2, 2));
    },
  },
  // ... more archetypes
};
```

## Best Practices

1. **Use specialized factories for complex entities**: For agents, use `createWanderingAgent()` or `createLLMAgent()` instead of the 'agent' archetype.

2. **Archetypes provide scaffolding**: Archetypes add basic components. Complex components (PlantComponent, AnimalComponent, BuildingComponent) should be added separately with full data.

3. **Customize after creation**: Modify archetype components (like Position) after entity creation to place entities correctly.

4. **Empty entities are valid**: `world.createEntity()` with no archetype creates an empty entity, which is valid for building custom entity types.

## See Also

- [World API Documentation](./World.ts)
- [Component Reference](../../COMPONENTS_REFERENCE.md)
- [AgentEntity.ts](../../../agents/src/AgentEntity.ts) - Full agent creation
- [OphanimimCompanionEntity.ts](../companions/OphanimimCompanionEntity.ts) - Companion creation
