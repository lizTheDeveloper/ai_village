# Botany Package - Plant System

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the plant system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Botany Package** (`@ai-village/botany`) implements a comprehensive plant lifecycle simulation system with genetics, diseases, companion planting, and wild population dynamics.

**What it does:**
- Simulates complete plant lifecycle from seed → germination → growth → flowering → fruiting → death
- Genetics system with inheritance, mutations, and hybridization
- Plant diseases and pests with spread mechanics
- Companion planting effects (plants benefiting/harming nearby plants)
- Wild plant population spawning and natural reproduction
- Plant discovery system (agents learn about new species)

**Key files:**
- `packages/core/src/systems/PlantSystem.ts` - Main lifecycle system (priority 40)
- `packages/core/src/systems/PlantDiseaseSystem.ts` - Disease/pest management (priority 50)
- `packages/core/src/systems/PlantDiscoverySystem.ts` - Species discovery (priority 45)
- `packages/botany/src/systems/WildPlantPopulationSystem.ts` - Natural spawning
- `packages/core/src/genetics/PlantGenetics.ts` - Genetics & breeding
- `packages/world/src/plant-species/` - Species definitions

---

## Package Structure

```
packages/botany/
├── src/
│   ├── systems/
│   │   ├── PlantSystem.ts              # Lifecycle (core implementation in @ai-village/core)
│   │   ├── PlantDiseaseSystem.ts       # Disease/pest simulation
│   │   ├── PlantDiscoverySystem.ts     # Species discovery by agents
│   │   └── WildPlantPopulationSystem.ts # Natural wild plant spawning
│   └── index.ts                        # Package exports
├── package.json
└── README.md                           # This file

packages/core/src/
├── components/
│   ├── PlantComponent.ts               # Plant entity data
│   ├── SeedComponent.ts                # Seed entity data
│   └── PlantKnowledgeComponent.ts      # Agent plant knowledge
├── types/
│   ├── PlantSpecies.ts                 # Species definitions
│   └── PlantDisease.ts                 # Disease/pest types
├── genetics/
│   └── PlantGenetics.ts                # Genetics, mutations, breeding
└── systems/
    ├── PlantSystem.ts                  # Main lifecycle system
    ├── PlantDiseaseSystem.ts           # Disease system
    └── PlantDiscoverySystem.ts         # Discovery system

packages/world/src/plant-species/
├── index.ts                            # Species registry
├── wild-plants.ts                      # Wild species (berries, mushrooms, etc.)
├── cultivated-crops.ts                 # Farmable crops (wheat, carrot, etc.)
├── medicinal-plants.ts                 # Healing herbs
├── magical-plants.ts                   # Magic-infused plants
├── tropical-plants.ts                  # Tropical species
└── wetland-plants.ts                   # Water-loving plants
```

---

## Core Concepts

### 1. Plant Lifecycle Stages

Plants progress through 11 distinct stages:

```typescript
type PlantStage =
  | 'seed'         // Dormant seed
  | 'germinating'  // Breaking dormancy, roots emerging
  | 'sprout'       // First leaves visible
  | 'vegetative'   // Growing leaves and stems
  | 'flowering'    // Flowers bloom
  | 'fruiting'     // Flowers become fruit
  | 'mature'       // Fully grown, producing seeds
  | 'seeding'      // Dropping seeds
  | 'senescence'   // Aging, declining
  | 'decay'        // Withering away
  | 'dead';        // Dead plant (can be removed)
```

**Stage transitions** are defined per species via `PlantSpecies.stageTransitions`:
- `baseDuration`: Days to complete stage (in ideal conditions)
- `conditions`: Environmental requirements (temp, moisture, health, etc.)
- `onTransition`: Effects when transitioning (spawn_flowers, fruit_ripens, etc.)

**Stage progress** (`PlantComponent.stageProgress`):
- 0.0 = just entered stage
- 1.0 = ready to transition to next stage
- Modified by genetics, health, environment, companion plants

### 2. Plant Health & Resources

Plants track three critical resources:

```typescript
interface PlantComponent {
  health: number;      // 0-100, death at 0
  hydration: number;   // 0-100, natural decay + weather effects
  nutrition: number;   // 0-100, consumed during growth
}
```

**Health changes:**
- **Dehydration damage:** `hydration < 20` → `-5 health/day`
- **Malnutrition damage:** `nutrition < 30` → `-3 health/day`
- **Frost damage:** Cold weather × `(1 - coldTolerance)`
- **Disease damage:** Per disease severity
- **Healing:** None (health doesn't regenerate naturally)

**Hydration changes:**
- **Natural decay:** `-15%/day` (modified by droughtTolerance genetics)
- **Rain:** `+10-20` depending on intensity
- **Hot weather:** Extra `-1%` per degree above 35°C
- **Soil moisture:** Transfer from soil to plant

**Nutrition changes:**
- **Growth consumption:** Consumed when `stageProgress` increases
- **Soil nutrients:** Replenished from soil via `SoilSystem` events

### 3. Genetics System

Every plant has genetics that affect its behavior:

```typescript
interface PlantGenetics {
  growthRate: number;          // 0.5-2.0, speed multiplier
  yieldAmount: number;         // 0.5-2.0, production multiplier
  diseaseResistance: number;   // 0-100, disease defense
  droughtTolerance: number;    // 0-100, reduces hydration decay
  coldTolerance: number;       // 0-100, reduces frost damage
  flavorProfile: number;       // 0-100, affects food quality
  mutations?: GeneticMutation[]; // History of mutations
}
```

**Inheritance:**
- Seeds inherit parent genetics with 10% chance of mutation per trait
- Mutations are ±10% of current value
- All mutations are recorded in `mutations` array

**Breeding/Hybridization:**
- Plants can be hybridized within the same category (crop × crop, herb × herb)
- Offspring blend parent genetics with hybrid vigor bonus
- Hybrid species IDs: `hybrid_species1_x_species2`

**Usage:**
```typescript
import { applyGenetics, createSeedFromPlant, createHybridSeed } from '@ai-village/core';

// Apply genetics to calculations
const growthModifier = applyGenetics(plant, 'growth'); // Returns growthRate
const yieldModifier = applyGenetics(plant, 'yield');   // Returns yieldAmount
const hydrationDecay = applyGenetics(plant, 'hydrationDecay'); // Modified decay rate

// Create seed from single parent
const seed = createSeedFromPlant(parentPlant, speciesId, {
  parentEntityId: parentPlantEntityId,
  agentId: harvesterAgentId,
  gameTime: world.tick,
  sourceType: 'cultivated'
});

// Create hybrid seed from two parents
const result = createHybridSeed(parent1, parent2, species1Id, species2Id);
if (result.success) {
  const hybridSeed = result.seed;
}
```

### 4. Plant Species

Species are defined in `packages/world/src/plant-species/` and registered in the species map:

```typescript
interface PlantSpecies {
  id: string;                      // Unique ID: 'wild_strawberry'
  name: string;                    // Display name: "Wild Strawberry"
  category: PlantCategory;         // 'crop', 'herb', 'tree', 'flower', etc.

  biomes: string[];                // Where it grows: ['forest', 'plains']
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';

  stageTransitions: StageTransition[]; // Lifecycle definition
  baseGenetics: PlantGenetics;     // Default genetics

  seedsPerPlant: number;           // Seeds produced at maturity
  seedDispersalRadius: number;     // Tiles seeds scatter

  optimalTemperatureRange: [number, number]; // [min, max] °C
  optimalMoistureRange: [number, number];    // [min, max] %

  properties: PlantProperties;     // Edible, medicinal, magical, etc.

  harvestDestroysPlant?: boolean;  // True = one-time harvest (wheat)
                                   // False = regrows (berry bush)
  harvestResetStage?: 'flowering' | 'fruiting' | 'vegetative';
}
```

**Getting species:**
```typescript
import { getPlantSpecies, getAllPlantSpecies, getSpeciesByBiome } from '@ai-village/world';

const species = getPlantSpecies('wild_strawberry'); // Throws if not found
const allSpecies = getAllPlantSpecies();
const forestPlants = getSpeciesByBiome('forest');
```

### 5. Companion Planting

Plants can affect nearby plants within `COMPANION_RADIUS` (default: 3 tiles):

```typescript
interface CompanionEffects {
  benefitsNearby?: string[];  // Species IDs that grow better nearby
  harmsNearby?: string[];     // Species IDs that grow worse nearby
  attracts?: string[];        // Creature types attracted
  repels?: string[];          // Pest types repelled
}
```

**Effects:**
- **Beneficial:** `+20%` growth rate per nearby beneficial plant
- **Harmful:** `-15%` growth rate per nearby harmful plant
- **Distance falloff:** Effects scale with distance (closer = stronger)

**Example species definition:**
```typescript
{
  id: 'marigold',
  properties: {
    environmental: {
      companionEffects: {
        benefitsNearby: ['tomato', 'lettuce'],
        repels: ['aphid', 'whitefly']
      }
    }
  }
}
```

### 6. Diseases & Pests

Plants can become infected with diseases or infested with pests:

```typescript
interface PlantDiseaseState {
  diseaseId: string;           // 'blight', 'mildew', etc.
  severity: number;            // 0-1 (0 = minor, 1 = critical)
  daysSinceInfection: number;
  spreadRadius?: number;       // Contagion radius
}

interface PlantPestState {
  pestId: string;              // 'aphid', 'caterpillar', etc.
  population: number;          // 1-100
  daysSinceInfestation: number;
}
```

**Disease spread:**
- Diseases spread to nearby plants within `spreadRadius`
- Spread chance increases with severity
- Spread blocked by immune plants (`diseaseResistance` high)

**Health effects:**
- Diseases reduce health by `severity * damagePerDay`
- Pests reduce health by `population * 0.1` per day
- Multiple diseases/pests stack

**Treatment:**
- Apply medicinal items via agent actions
- Remove infected plants to prevent spread
- Companion plants can repel pests

---

## System APIs

### PlantSystem (Priority 40)

Main lifecycle system. Runs after `SoilSystem` (priority 25), before agent actions.

**Dependencies:** `TimeSystem`, `WeatherSystem`, `SoilSystem`

**Update interval:** Every 20 ticks (~1 second at 20 TPS)

**Key methods:**

```typescript
class PlantSystem {
  // Set species lookup (injected from world package)
  setSpeciesLookup(lookup: (id: string) => PlantSpecies): void;

  // Check if planting is allowed at position
  canPlantAt(position: {x, y}, speciesId: string, soilState: SoilState): boolean;

  // Try to germinate a seed
  async tryGerminateSeed(seed: SeedComponent, position: {x, y}, world?: World): Promise<boolean>;

  // Get pests repelled by nearby companion plants
  getRepelledPests(position: {x, y}, world: World): string[];

  // Get creatures attracted by nearby companion plants
  getAttractedCreatures(position: {x, y}, world: World): string[];
}
```

**Events emitted:**

```typescript
// Stage transitions
'plant:stageChanged' → { plantId, speciesId, from, to }

// Health changes
'plant:healthChanged' → { plantId, oldHealth, newHealth, reason }

// Death
'plant:died' → { plantId, speciesId, cause }
'plant:dead' → { entityId, position }

// Reproduction
'seed:dispersed' → { plantId, speciesId, positions, seed }
'seed:germinated' → { seedId, speciesId, position, generation }
'plant:mature' → { plantId, speciesId, position }

// Resources
'plant:nutrientConsumption' → { x, y, consumed }
'plant:fruitRegenerated' → { plantId, fruitAdded, totalFruit }

// Companion planting
'plant:companionEffect' → { plantId, benefitCount, harmCount, modifier }
```

**Creating plants:**

```typescript
// 1. Create plant component
const plant = new PlantComponent({
  speciesId: 'wild_strawberry',
  position: { x: 50, y: 50 },
  stage: 'sprout',           // Optional, defaults to 'seed'
  health: 85,                // Optional, defaults to 85
  hydration: 50,             // Optional, defaults to 50
  nutrition: 70,             // Optional, defaults to 70
  genetics: speciesGenetics, // Optional, generates default if not provided
  planted: true              // true = player-planted, false = wild
});

// 2. Create entity and add component
const entity = world.createEntity();
entity.addComponent(plant);

// 3. PlantSystem will automatically process it
```

**Reading plant state:**

```typescript
// Query all plants
const plants = world.query().with('plant').executeEntities();

for (const entity of plants) {
  const plant = entity.getComponent<PlantComponent>('plant');

  console.log(`${plant.speciesId} - Stage: ${plant.stage}`);
  console.log(`Health: ${plant.health}, Hydration: ${plant.hydration}`);
  console.log(`Age: ${plant.age} days, Generation: ${plant.generation}`);
  console.log(`Fruit: ${plant.fruitCount}, Seeds: ${plant.seedsProduced}`);
}
```

### PlantDiseaseSystem (Priority 50)

Manages plant diseases and pests.

**Dependencies:** `PlantSystem`

**Update interval:** Every 50 ticks (~2.5 seconds)

**Events emitted:**

```typescript
'plant:diseaseSpread' → { fromPlantId, toPlantId, diseaseId }
'plant:pestInfestation' → { plantId, pestId, population }
'plant:diseaseCured' → { plantId, diseaseId }
```

**Usage:**

```typescript
// Infect a plant
const plant = entity.getComponent<PlantComponent>('plant');
plant.diseases.push({
  diseaseId: 'blight',
  severity: 0.5,
  daysSinceInfection: 0,
  spreadRadius: 2
});

// Check for diseases
if (plant.diseases.length > 0) {
  console.log(`Plant has ${plant.diseases.length} diseases`);
}

// Check for repelled pests (companion planting)
const repelledPests = plantSystem.getRepelledPests(plant.position, world);
if (repelledPests.includes('aphid')) {
  console.log('Aphids are repelled by nearby companion plants');
}
```

### PlantDiscoverySystem (Priority 45)

Tracks agents discovering new plant species.

**How it works:**
- When agents harvest unknown species, discovery is triggered
- Adds `plant_knowledge` component to agent with species info
- Creates episodic memory of discovery
- Unlocks new seeds for agent

**Events emitted:**

```typescript
'plant:discovered' → { agentId, speciesId, plantId }
```

**Checking agent knowledge:**

```typescript
const knowledge = agent.getComponent<PlantKnowledgeComponent>('plant_knowledge');
if (knowledge.knownSpecies.includes('wild_strawberry')) {
  console.log('Agent knows about strawberries');
}
```

### WildPlantPopulationSystem

Spawns wild plants naturally in the world.

**Configuration:**

```typescript
const populationSystem = new WildPlantPopulationSystem({
  desiredDensity: 0.05,        // 5% of tiles should have plants
  spawnRadius: 100,            // Spawn within 100 tiles of origin
  checkInterval: 20,           // Check every 20 ticks
  respectGrowthConditions: true // Only spawn in suitable biomes/temps
});
```

**Species selection:**
- Only spawns wild species (from `WILD_PLANTS` array)
- Respects biome restrictions (`species.biomes`)
- Respects rarity weights (legendary = rare)
- Avoids occupied tiles

---

## Usage Examples

### Example 1: Spawning a Plant

```typescript
import { PlantComponent } from '@ai-village/core';
import { getPlantSpecies } from '@ai-village/world';

// Get species definition
const species = getPlantSpecies('wild_strawberry');

// Create plant component with species genetics
const plant = new PlantComponent({
  speciesId: species.id,
  position: { x: 50, y: 50 },
  genetics: { ...species.baseGenetics }, // Clone species genetics
  planted: false // Wild plant
});

// Add to world
const entity = world.createEntity();
entity.addComponent(plant);
```

### Example 2: Harvesting Fruit

```typescript
// Find plant at position
const plants = world.query().with('plant').executeEntities();
const targetPlant = plants.find(e => {
  const p = e.getComponent<PlantComponent>('plant');
  return p.position.x === 50 && p.position.y === 50;
});

if (targetPlant) {
  const plant = targetPlant.getComponent<PlantComponent>('plant');

  // Check if harvestable
  if (plant.fruitCount > 0) {
    const harvested = plant.fruitCount;
    plant.fruitCount = 0;

    // Check if harvest destroys plant
    const species = getPlantSpecies(plant.speciesId);
    if (species.harvestDestroysPlant) {
      plant.stage = 'dead';
    } else {
      // Reset to regrowth stage
      plant.stage = species.harvestResetStage ?? 'fruiting';
      plant.stageProgress = 0;
    }

    console.log(`Harvested ${harvested} fruit`);
  }
}
```

### Example 3: Planting a Seed

```typescript
import { SeedComponent } from '@ai-village/core';

// Create seed (from agent inventory or generated)
const seed = new SeedComponent({
  speciesId: 'wheat',
  genetics: { /* inherited from parent */ },
  generation: 1,
  viability: 0.9,
  vigor: 80,
  quality: 0.85,
  sourceType: 'cultivated'
});

// Try to germinate
const success = await plantSystem.tryGerminateSeed(
  seed,
  { x: 60, y: 60 },
  world
);

if (success) {
  console.log('Seed germinated successfully');
  // PlantSystem emits 'seed:germinated' event
  // World manager creates plant entity
}
```

### Example 4: Breeding Plants

```typescript
import { createHybridSeed, canHybridizePlants } from '@ai-village/core';

// Get two parent plants of same category
const parent1 = entity1.getComponent<PlantComponent>('plant');
const parent2 = entity2.getComponent<PlantComponent>('plant');

const species1 = getPlantSpecies(parent1.speciesId);
const species2 = getPlantSpecies(parent2.speciesId);

// Check compatibility
if (canHybridizePlants(species1.category, species2.category)) {
  const result = createHybridSeed(
    parent1,
    parent2,
    species1.id,
    species2.id,
    {
      parentEntityId1: entity1.id,
      parentEntityId2: entity2.id,
      agentId: breederAgentId,
      gameTime: world.tick
    }
  );

  if (result.success) {
    console.log(`Created hybrid: ${result.hybridName}`);
    const hybridSeed = result.seed;
    // Give to agent or plant it
  }
}
```

### Example 5: Companion Planting

```typescript
// Define species with companion effects
const marigold: PlantSpecies = {
  id: 'marigold',
  properties: {
    environmental: {
      companionEffects: {
        benefitsNearby: ['tomato', 'lettuce'],
        repels: ['aphid']
      }
    }
  }
};

// Plant marigolds around tomatoes
// PlantSystem automatically applies +20% growth to nearby tomatoes
// PlantDiseaseSystem prevents aphids from infesting nearby plants
```

---

## Architecture & Data Flow

### System Execution Order

```
1. TimeSystem (priority 10)
   ↓ Updates game time
2. WeatherSystem (priority 15)
   ↓ Emits weather events
3. SoilSystem (priority 25)
   ↓ Emits soil moisture/nutrient events
4. PlantSystem (priority 40)
   ↓ Processes lifecycle, emits plant events
5. PlantDiscoverySystem (priority 45)
   ↓ Tracks agent discoveries
6. PlantDiseaseSystem (priority 50)
   ↓ Spreads diseases, applies damage
7. Agent systems (priority 100+)
   ↓ Agents harvest, plant, etc.
```

### Event Flow

```
WeatherSystem
  ↓ 'weather:rain'
PlantSystem
  → Increases plant hydration

SoilSystem
  ↓ 'soil:moistureChanged'
PlantSystem
  → Updates plant hydration

PlantSystem
  ↓ 'plant:stageChanged'
Renderer
  → Updates sprite

PlantSystem
  ↓ 'seed:dispersed'
WorldManager
  → Creates seed entities

PlantSystem
  ↓ 'plant:companionEffect'
Dashboard
  → Logs companion effects
```

### Component Relationships

```
Entity
├── PlantComponent (required)
│   ├── speciesId → PlantSpecies (from @ai-village/world)
│   ├── genetics → PlantGenetics
│   ├── diseases → PlantDiseaseState[]
│   └── pests → PlantPestState[]
└── Position (optional, but position is stored in PlantComponent)

Agent Entity
└── PlantKnowledgeComponent (optional)
    └── knownSpecies: string[] → PlantSpecies IDs
```

---

## Performance Considerations

**Optimization strategies:**

1. **Update interval:** PlantSystem runs every 20 ticks (1 second), not every frame
2. **Simulation culling:** Wild plants only simulate when visible to agents
3. **Planted crops always simulate:** Player investments require always-on processing
4. **Companion cache:** Nearby plants cached per position, cleared each update
5. **Throttled disease checks:** PlantDiseaseSystem runs every 50 ticks

**Query caching:**

```typescript
// ❌ BAD: Query in loop
for (const plant of plants) {
  const nearby = world.query().with('plant').executeEntities(); // Query every iteration!
}

// ✅ GOOD: Query once, cache results
const allPlants = world.query().with('plant').executeEntities(); // Query once
for (const plant of plants) {
  // Use cached allPlants
}
```

**Squared distance comparisons:**

```typescript
// ❌ BAD: Math.sqrt in hot path
if (Math.sqrt(dx*dx + dy*dy) < radius) { }

// ✅ GOOD: Squared comparison
if (dx*dx + dy*dy < radius*radius) { }
```

---

## Troubleshooting

### Plants not growing

**Check:**
1. Health > 0? (`plant.health`)
2. Hydration > 20? (`plant.hydration`)
3. Nutrition > 30? (`plant.nutrition`)
4. Temperature in optimal range? (see `species.optimalTemperatureRange`)
5. Species lookup configured? (`plantSystem.setSpeciesLookup()`)

**Debug:**
```typescript
const plant = entity.getComponent<PlantComponent>('plant');
console.log(`Stage: ${plant.stage}, Progress: ${plant.stageProgress}`);
console.log(`Health: ${plant.health}, Hydration: ${plant.hydration}, Nutrition: ${plant.nutrition}`);
console.log(`Age: ${plant.age} days, Generation: ${plant.generation}`);
```

### Seeds not germinating

**Check:**
1. Viability > 0? (`seed.viability`)
2. Soil tilled? (`tile.tilled`)
3. Soil nutrients > 20? (`soilState.nutrients`)
4. Not already occupied? (check for existing plant at position)

**Debug:**
```typescript
const canPlant = plantSystem.canPlantAt(position, speciesId, soilState);
console.log(`Can plant: ${canPlant}`);
```

### Diseases spreading too fast

**Check:**
1. Disease severity? (`disease.severity`)
2. Spread radius? (`disease.spreadRadius`)
3. Nearby immune plants? (check `diseaseResistance` genetics)
4. Companion plants repelling? (`plantSystem.getRepelledPests()`)

**Debug:**
```typescript
const plant = entity.getComponent<PlantComponent>('plant');
console.log(`Diseases: ${plant.diseases.length}`);
for (const disease of plant.diseases) {
  console.log(`  ${disease.diseaseId}: severity ${disease.severity}`);
}
```

### Species not found errors

**Error:** `PlantSpecies not found: some_species_id`

**Fix:** Ensure species is registered in `packages/world/src/plant-species/index.ts`:

```typescript
import { MY_NEW_SPECIES } from './my-new-species.js';

const ALL_SPECIES: PlantSpecies[] = [
  ...WILD_PLANTS,
  MY_NEW_SPECIES, // Add here
];
```

---

## Integration with Other Systems

### Farming System

Agents use `PlantActionHandler` to interact with plants:

```typescript
// From packages/core/src/actions/PlantActionHandler.ts
action = {
  type: 'plant_seed',
  params: {
    seedEntityId: 'seed_123',
    position: { x: 50, y: 50 }
  }
};

action = {
  type: 'harvest_plant',
  params: {
    plantEntityId: 'plant_456'
  }
};
```

### Inventory System

Seeds and harvests go into agent inventory:

```typescript
// Add seed to inventory
agent.inventory.add({
  type: 'seed',
  speciesId: 'wheat',
  quantity: 1,
  quality: 0.85
});

// Add harvested fruit to inventory
agent.inventory.add({
  type: 'plant_material',
  speciesId: 'wild_strawberry',
  part: 'fruit',
  quantity: 5
});
```

### Cooking System

Plants with `edible: true` can be consumed:

```typescript
const species = getPlantSpecies('wild_strawberry');
if (species.properties.edible) {
  const nutrition = species.properties.nutritionValue ?? 10;
  agent.needs.hunger -= nutrition;
}
```

### Medicine System

Plants with `medicinal` properties can treat ailments:

```typescript
const species = getPlantSpecies('healing_herb');
if (species.properties.medicinal) {
  const treats = species.properties.medicinal.treats; // ['wound', 'illness']
  const effectiveness = species.properties.medicinal.effectiveness; // 0-1
}
```

---

## Testing

Run plant system tests:

```bash
npm test -- PlantSystem.test.ts
npm test -- PlantSeedProduction.test.ts
npm test -- PlantGenetics.test.ts
```

**Key test files:**
- `packages/core/src/__tests__/PlantSystem.test.ts`
- `packages/core/src/__tests__/PlantSeedProduction.test.ts`

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference
- **COMPONENTS_REFERENCE.md** - All component types
- **METASYSTEMS_GUIDE.md** - Deep dive into reproduction metasystem
- **PERFORMANCE.md** - Performance optimization guide
- **Plant Species Files** - `packages/world/src/plant-species/*.ts`

---

## Summary for Language Models

**Before working with plants:**
1. Read this README completely
2. Understand lifecycle stages and transitions
3. Know the genetics system (inheritance, mutations, breeding)
4. Understand health/hydration/nutrition mechanics
5. Know how to query and modify plant components

**Common tasks:**
- **Spawn plant:** Create `PlantComponent`, add to entity
- **Harvest plant:** Check `fruitCount`, reset stage or mark dead
- **Plant seed:** Call `plantSystem.tryGerminateSeed()`
- **Breed plants:** Use `createHybridSeed()` for same-category plants
- **Check growth:** Read `stage`, `stageProgress`, `health`, `hydration`
- **Add disease:** Push to `plant.diseases` array

**Critical rules:**
- Never delete plant entities (mark `stage = 'dead'` instead)
- Always validate species exists (`getPlantSpecies()` throws if not found)
- Respect companion planting mechanics (don't override growth modifiers)
- Use event system for plant lifecycle changes (don't modify directly)
- Cache queries (don't query in loops)

**Event-driven architecture:**
- Listen to `plant:*` events for lifecycle changes
- Emit events when modifying plant state
- Never bypass PlantSystem for lifecycle changes
