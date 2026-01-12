# Plant Species Definitions

Static plant species data for the ECS plant system. Each species defines lifecycle stages, genetics, environmental requirements, and properties.

## Structure

**Location**: `packages/world/src/plant-species/`

**Exports**: `index.ts` provides lookup functions and species arrays.

## Species Categories

### Cultivated Crops (`cultivated-crops.ts`)
Food crops for farming: wheat, potato, carrot, corn. High nutrition (45-80), designed for sustainable agriculture. Most destroy plant on harvest.

### Wild Plants (`wild-plants.ts`)
Naturally spawning species: grass, wildflower, berry bush, tree. Lower nutrition (0-25). Berry bushes and trees regrow after harvest (`harvestDestroysPlant: false`).

### Medicinal Plants (`medicinal-plants.ts`)
Healing herbs: chamomile, lavender, feverfew, valerian, willow bark. Define `medicinal` properties (treats, effectiveness, preparation, dosage, side effects, toxicity, synergies/conflicts).

### Magical Plants (`magical-plants.ts`)
Supernatural species for arcane universes. Rare plants with magical properties.

### Environmental Specialists
- **Tropical** (`tropical-plants.ts`): High temperature/moisture requirements
- **Wetland** (`wetland-plants.ts`): Riverside/swamp species
- **Mountain** (`mountain-plants.ts`): Cold-tolerant, high-altitude species

## Core Properties

### Stage Transitions
```typescript
stageTransitions: Array<{
  from: string;  // Current stage
  to: string;    // Next stage
  baseDuration: number;  // Days to transition
  conditions: { minHydration?, minTemperature?, minNutrition?, minHealth?, season? };
  onTransition: Array<{ type: string, params?: object }>;
}>
```

Common lifecycle: seed → germinating → sprout → vegetative → flowering → fruiting → mature → seeding → senescence → decay → dead

Perennials (berry bush, trees, lavender) can cycle back from seeding to vegetative if healthy.

### Genetics
```typescript
baseGenetics: {
  growthRate: number;        // 0.3 (trees) to 1.5 (grass)
  yieldAmount: number;       // 0.5 (grass) to 2.0 (potato, trees)
  diseaseResistance: number; // 0-100
  droughtTolerance: number;  // 0-100
  coldTolerance: number;     // 0-100
  flavorProfile: number;     // 0-100
  mutations: [];             // Future: genetic variation
}
```

### Environmental Requirements
```typescript
optimalTemperatureRange: [min, max];  // Celsius
optimalMoistureRange: [min, max];     // Percentage
preferredSeasons: string[];           // ['spring', 'summer', 'fall', 'winter']
```

### Harvest Behavior
```typescript
harvestDestroysPlant?: boolean;  // Default: true (annual crops)
harvestResetStage?: string;      // Perennials reset to this stage after harvest
```

### Properties
- **edible**: Boolean, nutrition value, taste profile (sweet, bitter, sour, savory, spicy, aromatic)
- **medicinal**: Treats conditions, effectiveness, preparation methods, side effects, toxicity
- **crafting**: Fiber, dye, scent, oil, structural materials
- **environmental**: Aura effects, companion planting, soil effects, attracts/repels fauna
- **magical**: Universe-dependent supernatural effects

## API

```typescript
import {
  getPlantSpecies,           // Get by ID (throws if not found)
  getAllPlantSpecies,        // All species
  getSpeciesByCategory,      // Filter by category
  getSpeciesByBiome,         // Filter by biome
  getSpeciesByRarity,        // Filter by rarity
  getWildSpawnableSpecies,   // Wild plants for terrain generation
  getCultivatedCrops,        // Farming crops
  getMedicinalPlants,        // Medicinal herbs
  getMagicalPlants           // Magical species
} from '@ai-village/world';
```

## Seed Dispersal

```typescript
seedsPerPlant: number;        // 6 (potato) to 200 (willow)
seedDispersalRadius: number;  // Tiles from parent plant
requiresDormancy: boolean;    // Seed dormancy period before germination
```

Trees have large dispersal (5-8 tiles), crops smaller (1-2 tiles).

## Sprites

Each species defines sprite keys for all lifecycle stages:
```typescript
sprites: {
  seed, sprout, vegetative, flowering, fruiting, mature, seeding, withered
}
```

Sprite assets located in `packages/renderer/assets/sprites/`.
