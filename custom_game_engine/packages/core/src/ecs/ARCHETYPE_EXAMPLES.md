# Entity Archetype Examples

## Example 1: Creating a Simple Building

```typescript
import { World } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core/types';
import { createBuildingComponent, BuildingType } from '@ai-village/core/components';

// Create building entity with archetype
const building = world.createEntity('building');

// Customize position
const position = building.getComponent(CT.Position) as { x: number; y: number };
position.x = 50;
position.y = 50;

// Add building-specific component
world.addComponent(building.id, createBuildingComponent(
  BuildingType.House,
  building.id,
  world.tick
));

// Building is now fully configured with:
// - Position at (50, 50)
// - Renderable component for display
// - Tags: ['building']
// - Physics: solid, 2x2 footprint
// - Building component with type House
```

## Example 2: Creating a Harvestable Plant

```typescript
import { PlantComponent } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core/types';

// Create plant entity with archetype
const plant = world.createEntity('plant');

// Set position
const position = plant.getComponent(CT.Position) as { x: number; y: number };
position.x = 75;
position.y = 100;

// Add plant genetics (PlantComponent requires full genetic data)
const plantComponent = new PlantComponent({
  speciesId: 'wild_berry',
  age: 0,
  growthStage: 'seedling',
  waterLevel: 1.0,
  health: 1.0,
  genetics: {
    speciesId: 'wild_berry',
    growthRate: 1.0,
    harvestYield: 5,
    // ... other genetic data
  },
  // ... other plant data
});
world.addComponent(plant.id, plantComponent);
```

## Example 3: Creating a Dropped Item

```typescript
import { createResourceComponent } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core/types';

// Create item entity
const droppedItem = world.createEntity('item');

// Position where item was dropped
const position = droppedItem.getComponent(CT.Position) as { x: number; y: number };
position.x = agentX;
position.y = agentY;

// Add resource data
world.addComponent(droppedItem.id, createResourceComponent(
  'wood',  // resource type
  10       // quantity
));

// Item is now a world entity that can be picked up
// - Has position
// - Has renderable (visible sprite)
// - Tags: ['item', 'resource']
// - Physics: non-solid, can be walked through and picked up
```

## Example 4: Creating Multiple Buildings in a Grid

```typescript
import { BuildingType } from '@ai-village/core';

const buildingTypes = [
  BuildingType.House,
  BuildingType.Farm,
  BuildingType.Blacksmith,
  BuildingType.Market,
];

const buildings = [];
for (let i = 0; i < buildingTypes.length; i++) {
  // Create building with archetype
  const building = world.createEntity('building');

  // Position in grid (20 units apart)
  const position = building.getComponent(CT.Position) as { x: number; y: number };
  position.x = i * 20;
  position.y = 0;

  // Add building type
  world.addComponent(building.id, createBuildingComponent(
    buildingTypes[i],
    building.id,
    world.tick
  ));

  buildings.push(building.id);
}

console.log(`Created ${buildings.length} buildings in a row`);
```

## Example 5: Creating an Animal (Without Full AI)

```typescript
import { AnimalComponent } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core/types';

// Create animal entity
const rabbit = world.createEntity('animal');

// Set spawn position
const position = rabbit.getComponent(CT.Position) as { x: number; y: number };
position.x = 200;
position.y = 150;

// Add animal data (requires all fields per CLAUDE.md: NO SILENT FALLBACKS)
const animalComponent = new AnimalComponent({
  id: rabbit.id,
  speciesId: 'rabbit',
  name: 'Wild Rabbit',
  position: { x: 200, y: 150 },
  age: 30, // 30 days old
  lifeStage: 'adult',
  health: 100,
  size: 1.0,
  state: 'grazing',
  hunger: 20,
  thirst: 10,
  energy: 80,
  stress: 5,
  mood: 70,
  wild: true,
  bondLevel: 0,
  trustLevel: 0,
});
world.addComponent(rabbit.id, animalComponent);
```

## Example 6: Comparing Empty vs Archetype Entities

```typescript
// Empty entity - no components
const empty = world.createEntity();
console.log('Empty components:', empty.components.size); // 0

// Archetype entity - pre-configured
const building = world.createEntity('building');
console.log('Building components:', building.components.size); // 4
console.log('Has Position?', building.hasComponent(CT.Position)); // true
console.log('Has Renderable?', building.hasComponent(CT.Renderable)); // true
console.log('Has Tags?', building.hasComponent(CT.Tags)); // true
console.log('Has Physics?', building.hasComponent(CT.Physics)); // true
```

## Example 7: Using Archetypes with Query System

```typescript
import { ComponentType as CT } from '@ai-village/core/types';

// Create various entity types
for (let i = 0; i < 10; i++) {
  const building = world.createEntity('building');
  const position = building.getComponent(CT.Position) as { x: number; y: number };
  position.x = i * 10;
  position.y = 0;
}

for (let i = 0; i < 5; i++) {
  const plant = world.createEntity('plant');
  const position = plant.getComponent(CT.Position) as { x: number; y: number };
  position.x = i * 10;
  position.y = 50;
}

// Query all buildings (by tag)
const buildings = world.query()
  .with(CT.Tags)
  .withTag('building')
  .executeEntities();
console.log(`Found ${buildings.length} buildings`); // 10

// Query all plants (by tag)
const plants = world.query()
  .with(CT.Tags)
  .withTag('plant')
  .executeEntities();
console.log(`Found ${plants.length} plants`); // 5

// Query all entities with Position + Physics
const physicalEntities = world.query()
  .with(CT.Position)
  .with(CT.Physics)
  .executeEntities();
console.log(`Found ${physicalEntities.length} physical entities`); // 15 (all buildings + plants)
```

## Example 8: Error Handling

```typescript
// Invalid archetype throws error
try {
  world.createEntity('starship'); // typo - should be 'spaceship'
} catch (error) {
  console.error(error.message);
  // "Unknown archetype 'starship'. Valid archetypes: agent, building, plant, animal, item, deity, companion, spaceship"
}

// Empty string is invalid
try {
  world.createEntity('');
} catch (error) {
  console.error('Empty archetype name throws error');
}

// Undefined archetype is valid (creates empty entity)
const empty = world.createEntity(undefined);
console.log('Undefined archetype creates empty entity:', empty.components.size); // 0
```
