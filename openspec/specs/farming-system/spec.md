# Farming System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The farming system enables agents to cultivate crops, manage soil, and harvest produce. Plants follow **natural life cycles** - they grow, flower, fruit, drop seeds, and die. Agents start with seeds and can gather more from wild and cultivated plants. Crops follow seasonal patterns and can be combined into new hybrid varieties through experimentation.

---

## Natural Plant Life Cycle

### The Full Cycle

Plants are living things with complete life cycles, not just "growth bars":

```
  SEED                     (dormant, waiting for conditions)
    ↓ [plant or natural germination]
  GERMINATING              (underground, absorbing water)
    ↓ [2-5 days]
  SPROUT                   (first leaves break surface)
    ↓ [5-10 days]
  VEGETATIVE               (growing leaves, stems, roots)
    ↓ [varies by plant]
  FLOWERING                (produces flowers, attracts pollinators)
    ↓ [3-7 days]
  FRUITING                 (flowers become fruit/vegetables)
    ↓ [7-14 days]
  MATURE                   (ready for harvest)
    ↓ [harvest window: 3-10 days]
  SEEDING                  (if not harvested, produces seeds)
    ↓ [5-10 days]
  SENESCENCE               (plant dies back)
    ↓ [7-14 days]
  DECAY                    (returns nutrients to soil)
    ↓ [14-28 days]
  [seeds may germinate nearby, starting new cycle]
```

### Plant State

```typescript
interface Plant {
  id: string;
  speciesId: string;
  position: Position;

  // Life cycle
  stage: PlantStage;
  stageProgress: number;        // 0-1 within current stage
  age: number;                  // Total days alive
  generation: number;           // How many generations from original

  // Health
  health: number;               // 0-100
  hydration: number;            // 0-100
  nutrition: number;            // 0-100

  // Reproduction
  flowerCount: number;
  fruitCount: number;
  seedsProduced: number;
  seedsDropped: Position[];     // Where seeds fell

  // Quality factors
  geneticQuality: number;       // Inherited + mutation
  careQuality: number;          // How well tended
  environmentMatch: number;     // How suited to location

  // Visual
  visualVariant: number;        // Procedural variation
  currentSprite: string;
}

type PlantStage =
  | "seed"
  | "germinating"
  | "sprout"
  | "vegetative"
  | "flowering"
  | "fruiting"
  | "mature"
  | "seeding"
  | "senescence"
  | "decay"
  | "dead";
```

### Stage Transitions

```typescript
interface StageTransition {
  from: PlantStage;
  to: PlantStage;
  baseDuration: number;         // Days in ideal conditions
  conditions: TransitionConditions;
  onTransition: TransitionEffect[];
}

interface TransitionConditions {
  // Environmental
  minTemperature?: number;
  maxTemperature?: number;
  minHydration?: number;
  minNutrition?: number;
  minLight?: number;
  season?: Season[];

  // Health
  minHealth?: number;

  // Special
  requiresPollination?: boolean;
  requiresFrost?: boolean;      // Some seeds need cold
}

// Example: Tomato plant transitions
const tomatoTransitions: StageTransition[] = [
  {
    from: "seed",
    to: "germinating",
    baseDuration: 0,  // Instant when planted
    conditions: { minHydration: 30, minTemperature: 50 },
    onTransition: [],
  },
  {
    from: "germinating",
    to: "sprout",
    baseDuration: 5,
    conditions: { minHydration: 40, minTemperature: 55 },
    onTransition: [{ type: "become_visible" }],
  },
  {
    from: "sprout",
    to: "vegetative",
    baseDuration: 7,
    conditions: { minHydration: 50, minNutrition: 30 },
    onTransition: [],
  },
  {
    from: "vegetative",
    to: "flowering",
    baseDuration: 14,
    conditions: { minHealth: 50, season: ["summer"] },
    onTransition: [{ type: "spawn_flowers", count: "3-8" }],
  },
  {
    from: "flowering",
    to: "fruiting",
    baseDuration: 5,
    conditions: { requiresPollination: true },
    onTransition: [{ type: "flowers_become_fruit" }],
  },
  {
    from: "fruiting",
    to: "mature",
    baseDuration: 10,
    conditions: { minHydration: 40 },
    onTransition: [{ type: "fruit_ripens" }],
  },
  {
    from: "mature",
    to: "seeding",
    baseDuration: 7,  // If not harvested
    conditions: {},
    onTransition: [{ type: "fruit_overripens" }, { type: "begin_seed_production" }],
  },
  {
    from: "seeding",
    to: "senescence",
    baseDuration: 7,
    conditions: {},
    onTransition: [{ type: "drop_seeds", radius: 2 }],
  },
  {
    from: "senescence",
    to: "decay",
    baseDuration: 14,
    conditions: {},
    onTransition: [{ type: "visual_wilt" }],
  },
  {
    from: "decay",
    to: "dead",
    baseDuration: 21,
    conditions: {},
    onTransition: [{ type: "return_nutrients_to_soil" }, { type: "remove_plant" }],
  },
];
```

---

## Seed System

### Seed Sources

```typescript
interface SeedSources {
  // Starting seeds
  initialSeeds: {
    source: "scenario_config",
    types: ["wheat", "carrot", "potato"],  // Basic crops
    quantity: "small",
  };

  // Gathering from wild plants
  wildGathering: {
    source: "forage_action",
    locations: ["meadow", "forest_edge", "riverside"],
    success: "skill_based",  // Foraging skill
    yields: "1-5 seeds per plant",
  };

  // Harvesting from cultivated plants
  cultivatedHarvest: {
    source: "harvest_action",
    when: "mature or seeding stage",
    yields: "based on plant health and care",
  };

  // Natural seed drop
  naturalDrop: {
    source: "automatic",
    when: "seeding stage",
    behavior: "seeds fall near parent plant",
    germination: "chance-based in suitable conditions",
  };

  // Trading
  trading: {
    source: "economy_system",
    from: "merchants, other agents",
  };

  // Research/generation
  discovered: {
    source: "research_system",
    how: "hybridization, experimentation",
  };
}
```

### Seed Properties

```typescript
interface Seed {
  id: string;
  speciesId: string;

  // Genetics
  genetics: PlantGenetics;
  generation: number;
  parentPlants: [string, string] | null;

  // Quality
  viability: number;            // 0-1 chance to germinate
  vigor: number;                // Growth speed modifier
  quality: number;              // Affects offspring quality

  // State
  age: number;                  // Days since produced
  dormant: boolean;             // Needs conditions to break
  dormancyRequirements?: {
    coldDays?: number;          // Stratification
    lightExposure?: boolean;
    scarification?: boolean;    // Physical damage to coat
  };

  // Origin tracking
  source: "wild" | "cultivated" | "traded" | "generated";
  harvestedFrom?: string;       // Plant ID
  harvestedBy?: string;         // Agent ID
  harvestedAt?: GameTime;
}

interface PlantGenetics {
  // Inheritable traits
  growthRate: number;           // Speed modifier
  yieldAmount: number;          // How much it produces
  diseaseResistance: number;
  droughtTolerance: number;
  coldTolerance: number;
  flavorProfile: number;        // Affects food quality

  // Variation
  mutations: GeneticMutation[];
}
```

### Seed Gathering

```typescript
async function gatherSeeds(
  agent: Agent,
  plant: Plant
): Promise<Seed[]> {

  // Can only gather at certain stages
  if (!["mature", "seeding", "senescence"].includes(plant.stage)) {
    return [];  // No seeds available yet
  }

  // Calculate yield
  const baseYield = plant.species.seedsPerPlant;
  const healthMod = plant.health / 100;
  const stageMod = plant.stage === "seeding" ? 1.5 : 1.0;
  const skillMod = 0.5 + (agent.skills.farming / 100);

  const seedCount = Math.floor(baseYield * healthMod * stageMod * skillMod);

  // Create seeds with inherited genetics
  const seeds: Seed[] = [];
  for (let i = 0; i < seedCount; i++) {
    seeds.push({
      id: generateId(),
      speciesId: plant.speciesId,
      genetics: inheritGenetics(plant, mutationChance: 0.1),
      generation: plant.generation + 1,
      parentPlants: [plant.id, plant.pollinatedBy || plant.id],
      viability: calculateViability(plant),
      vigor: calculateVigor(plant),
      quality: calculateSeedQuality(plant, agent),
      age: 0,
      dormant: plant.species.requiresDormancy,
      dormancyRequirements: plant.species.dormancyRequirements,
      source: "cultivated",
      harvestedFrom: plant.id,
      harvestedBy: agent.id,
      harvestedAt: getCurrentTime(),
    });
  }

  // Reduce plant's remaining seeds
  plant.seedsProduced -= seedCount;

  return seeds;
}
```

### Natural Seed Dispersal

```typescript
async function naturalSeedDrop(plant: Plant): Promise<void> {
  // Happens automatically during seeding stage

  if (plant.stage !== "seeding") return;

  const seedsToDrop = Math.floor(plant.seedsProduced * 0.3);  // Drop 30% at a time

  for (let i = 0; i < seedsToDrop; i++) {
    // Calculate drop position (near parent)
    const angle = Math.random() * Math.PI * 2;
    const distance = 1 + Math.random() * plant.species.seedDispersalRadius;
    const dropPos = {
      x: plant.position.x + Math.cos(angle) * distance,
      y: plant.position.y + Math.sin(angle) * distance,
    };

    // Create seed on ground
    const seed = createSeedFromPlant(plant);

    // Place in world
    await worldSystem.placeSeedOnGround(seed, dropPos);

    // Maybe germinate if conditions are right
    if (canGerminate(seed, dropPos)) {
      await scheduleGermination(seed, dropPos);
    }
  }

  plant.seedsProduced -= seedsToDrop;
}

async function scheduleGermination(seed: Seed, position: Position): Promise<void> {
  // Check conditions
  const tile = worldSystem.getTile(position);

  if (seed.dormant && !dormancyBroken(seed)) {
    // Seed waits, checks again next season
    return;
  }

  if (tile.fertility < 20) return;  // Too poor
  if (tile.object !== null) return;  // Occupied

  // Germination chance
  const chance = seed.viability * (tile.fertility / 100) * (tile.moisture / 100);

  if (Math.random() < chance) {
    // New plant grows!
    const newPlant = createPlantFromSeed(seed, position);
    newPlant.stage = "germinating";
    await worldSystem.addPlant(newPlant);

    // This is emergence - wild plants spreading naturally
  }
}
```

---

## Wild Plants

### Natural Plant Population

```typescript
interface WildPlantPopulation {
  // World generates with existing plants
  initialPopulation: {
    density: "by_biome",
    species: "biome_appropriate",
    stages: "mixed",  // Not all seedlings
  };

  // Plants reproduce naturally
  naturalReproduction: {
    enabled: true,
    rate: "slow",  // Prevents explosion
    limitedBy: ["space", "resources", "competition"],
  };

  // Foraging affects population
  foragingImpact: {
    overharvesting: "reduces_local_population",
    sustainableYield: "population_stable",
    seedScattering: "can_spread_plants",
  };
}
```

### Biome Plant Distribution

| Biome | Common Plants | Rare Plants |
|-------|---------------|-------------|
| Meadow | Wildflowers, grass, clover | Wild strawberry, herbs |
| Forest Edge | Berry bushes, mushrooms, ferns | Medicinal plants |
| Deep Forest | Mushrooms, moss, shade plants | Truffles, rare fungi |
| Riverside | Reeds, water plants, willows | Lotus, rare water herbs |
| Hills | Hardy grasses, alpine flowers | Mountain herbs |

---

## Plant Properties & Effects

### Property Categories

Plants aren't just food - they have intrinsic properties that make them useful for medicine, magic, crafting, and more:

```typescript
interface PlantProperties {
  // Basic
  edible: boolean;
  nutritionValue: number;
  taste: TasteProfile;

  // Medicinal
  medicinal?: MedicinalProperties;

  // Magical (universe-dependent)
  magical?: MagicalProperties;

  // Crafting
  crafting?: CraftingProperties;

  // Environmental
  environmental?: EnvironmentalProperties;

  // Special
  special?: SpecialProperties[];
}

interface TasteProfile {
  sweet: number;      // 0-1
  bitter: number;
  sour: number;
  savory: number;
  spicy: number;
  aromatic: number;
}
```

### Medicinal Properties

```typescript
interface MedicinalProperties {
  // What it treats
  treats: Ailment[];
  effectiveness: number;        // 0-1

  // How it's used
  preparation: PreparationType[];
  dosage: "small" | "medium" | "large";

  // Side effects
  sideEffects?: SideEffect[];
  toxicIfOverused: boolean;
  toxicityThreshold?: number;

  // Combinations
  synergiesWith: string[];      // Other plant IDs
  conflictsWith: string[];
}

type Ailment =
  | "wound"           // Physical damage
  | "illness"         // General sickness
  | "poison"          // Toxic exposure
  | "fatigue"         // Energy depletion
  | "pain"            // Pain relief
  | "fever"           // Temperature
  | "infection"       // Bacterial/viral
  | "inflammation"    // Swelling
  | "anxiety"         // Mental state
  | "insomnia";       // Sleep issues

type PreparationType =
  | "raw"             // Eat directly
  | "tea"             // Steep in water
  | "poultice"        // Apply to skin
  | "tincture"        // Alcohol extract
  | "salve"           // Oil-based
  | "smoke"           // Inhale
  | "compress";       // Wet application

// Example: Feverfew
const feverfew: MedicinalProperties = {
  treats: ["fever", "pain", "inflammation"],
  effectiveness: 0.7,
  preparation: ["tea", "raw"],
  dosage: "small",
  sideEffects: [{ type: "mouth_numbness", chance: 0.2 }],
  toxicIfOverused: true,
  toxicityThreshold: 5,  // doses per day
  synergiesWith: ["willow_bark", "chamomile"],
  conflictsWith: ["blood_thinners"],
};
```

### Magical Properties

```typescript
interface MagicalProperties {
  // Universe constraint
  universeTypes: string[];      // ["arcane", "hybrid"] - not in sci-fi

  // Magical nature
  magicType: MagicType;
  potency: number;              // 0-1
  stability: number;            // How predictable

  // Effects
  effects: MagicalEffect[];

  // Harvesting
  harvestConditions?: {
    moonPhase?: MoonPhase;
    timeOfDay?: TimeOfDay;
    weather?: WeatherType;
    ritual?: string;
  };

  // Decay
  magicDecaysAfter?: number;    // Days after harvest
  preservationMethod?: string;
}

type MagicType =
  | "elemental"       // Fire, water, earth, air
  | "life"            // Healing, growth
  | "mind"            // Perception, memory
  | "spirit"          // Soul, ethereal
  | "transformation"  // Change, mutation
  | "divination"      // Seeing, knowing
  | "protection"      // Warding, shielding
  | "entropy";        // Decay, chaos

interface MagicalEffect {
  type: string;
  magnitude: number;
  duration: number;           // Game hours
  trigger: "consume" | "touch" | "proximity" | "ritual";
  description: string;        // For LLM context
}

// Example: Moonpetal
const moonpetal: MagicalProperties = {
  universeTypes: ["arcane", "dream"],
  magicType: "divination",
  potency: 0.6,
  stability: 0.8,
  effects: [
    {
      type: "night_vision",
      magnitude: 0.8,
      duration: 8,
      trigger: "consume",
      description: "Grants ability to see clearly in darkness",
    },
    {
      type: "dream_clarity",
      magnitude: 0.5,
      duration: 24,
      trigger: "consume",
      description: "Dreams become vivid and sometimes prophetic",
    },
  ],
  harvestConditions: {
    moonPhase: "full",
    timeOfDay: "night",
  },
  magicDecaysAfter: 3,
  preservationMethod: "store_in_moonlight",
};
```

### Crafting Properties

```typescript
interface CraftingProperties {
  // Dye
  dye?: {
    color: string;
    intensity: number;
    permanence: number;
  };

  // Fiber
  fiber?: {
    strength: number;
    flexibility: number;
    waterResistance: number;
  };

  // Oil
  oil?: {
    type: "cooking" | "fuel" | "lubricant" | "medicinal";
    burnTime?: number;
    smokePoint?: number;
  };

  // Scent
  scent?: {
    profile: string;
    intensity: number;
    persistence: number;
  };

  // Poison (for hunting, not murder)
  poison?: {
    type: "paralytic" | "soporific" | "lethal";
    potency: number;
    targetCreatures: string[];
  };

  // Building material
  structural?: {
    hardness: number;
    flexibility: number;
    waterResistance: number;
  };
}
```

### Environmental Properties

```typescript
interface EnvironmentalProperties {
  // Effects on surroundings
  aura?: {
    radius: number;           // Tiles
    effect: string;
    magnitude: number;
  };

  // Companion planting
  companionEffects?: {
    benefitsNearby: string[];     // Plant species helped
    harmsNearby: string[];        // Plant species harmed
    attracts: string[];           // Creatures attracted
    repels: string[];             // Creatures repelled
  };

  // Soil effects
  soilEffects?: {
    nitrogenFixer: boolean;
    acidifying: boolean;
    alkalizing: boolean;
    nutrientAccumulator: string[];
  };

  // Weather interaction
  weatherInteraction?: {
    glowsInRain: boolean;
    bloomsInStorm: boolean;
    wiltsInDrought: boolean;
  };
}
```

### Special Properties

```typescript
type SpecialProperty =
  | { type: "luminescent"; color: string; intensity: number }
  | { type: "responsive"; trigger: string; response: string }
  | { type: "symbiotic"; partner: string; benefit: string }
  | { type: "carnivorous"; prey: string[]; method: string }
  | { type: "mimic"; mimics: string; purpose: string }
  | { type: "temporal"; effect: string }  // Affects time perception
  | { type: "sentient"; intelligence: number; communication: string }
  | { type: "interdimensional"; connection: string }
  | { type: "ancestral"; memories: string }  // Contains memories
  | { type: "musical"; sound: string; trigger: string };
```

### Example Plants

```typescript
// Common Herb: Chamomile
const chamomile: PlantSpecies = {
  id: "chamomile",
  name: "Chamomile",
  category: "herb",
  biomes: ["meadow", "forest_edge"],
  rarity: "common",
  properties: {
    edible: true,
    nutritionValue: 5,
    taste: { sweet: 0.3, bitter: 0.2, aromatic: 0.8 },
    medicinal: {
      treats: ["anxiety", "insomnia", "inflammation"],
      effectiveness: 0.5,
      preparation: ["tea"],
      dosage: "medium",
      toxicIfOverused: false,
      synergiesWith: ["lavender", "valerian"],
    },
  },
};

// Rare Magical: Whisperleaf
const whisperleaf: PlantSpecies = {
  id: "whisperleaf",
  name: "Whisperleaf",
  category: "magical_herb",
  biomes: ["forest_ancient"],
  rarity: "rare",
  properties: {
    edible: false,
    magical: {
      universeTypes: ["arcane"],
      magicType: "mind",
      potency: 0.7,
      stability: 0.6,
      effects: [
        {
          type: "telepathy",
          magnitude: 0.5,
          duration: 2,
          trigger: "consume",
          description: "Allows hearing surface thoughts of nearby beings",
        },
      ],
      harvestConditions: {
        timeOfDay: "dawn",
        weather: "fog",
      },
      magicDecaysAfter: 1,
    },
    crafting: {
      scent: {
        profile: "ethereal, slightly minty",
        intensity: 0.4,
        persistence: 0.8,
      },
    },
    special: [
      { type: "responsive", trigger: "voice", response: "leaves flutter" },
    ],
  },
};

// Dangerous: Shadowcap Mushroom
const shadowcap: PlantSpecies = {
  id: "shadowcap",
  name: "Shadowcap Mushroom",
  category: "fungus",
  biomes: ["forest_dense", "cave_entrance"],
  rarity: "uncommon",
  properties: {
    edible: true,  // But dangerous
    nutritionValue: 20,
    taste: { bitter: 0.7, savory: 0.5 },
    medicinal: {
      treats: ["pain"],
      effectiveness: 0.9,
      preparation: ["raw", "tea"],
      dosage: "small",
      sideEffects: [
        { type: "hallucination", chance: 0.5 },
        { type: "shadow_vision", chance: 0.3 },
      ],
      toxicIfOverused: true,
      toxicityThreshold: 2,
    },
    magical: {
      universeTypes: ["arcane", "dream"],
      magicType: "spirit",
      potency: 0.8,
      stability: 0.3,  // Unpredictable
      effects: [
        {
          type: "shadow_walk",
          magnitude: 0.6,
          duration: 1,
          trigger: "consume",
          description: "Allows passage through shadows, but risks losing oneself",
        },
      ],
    },
    special: [
      { type: "luminescent", color: "pale_purple", intensity: 0.2 },
    ],
  },
};

// Utility: Ironwood Sapling
const ironwood: PlantSpecies = {
  id: "ironwood",
  name: "Ironwood",
  category: "tree",
  biomes: ["hills", "mountains"],
  rarity: "uncommon",
  growthTime: "years",
  properties: {
    edible: false,
    crafting: {
      structural: {
        hardness: 0.95,
        flexibility: 0.1,
        waterResistance: 0.9,
      },
    },
    environmental: {
      soilEffects: {
        nitrogenFixer: false,
        acidifying: false,
        nutrientAccumulator: ["iron", "minerals"],
      },
    },
  },
};
```

### Property Discovery

Agents don't automatically know plant properties - they must discover them:

```typescript
interface PlantKnowledge {
  plantId: string;
  agentId: string;

  // What they know
  knownProperties: {
    edible: boolean | "unknown";
    medicinal: Partial<MedicinalProperties> | "unknown";
    magical: Partial<MagicalProperties> | "unknown";
    crafting: Partial<CraftingProperties> | "unknown";
  };

  // How they learned
  discoveryMethod: "experimentation" | "taught" | "observation" | "accident";
  discoveredAt: GameTime;
  taughtBy?: string;

  // Confidence
  confidence: number;           // 0-1, increases with use
  misconceptions?: string[];    // Wrong beliefs they hold
}

// Discovery happens through:
// - Eating something (might get sick, might heal)
// - Experimenting (research system)
// - Being taught by another agent
// - Observing effects on others/animals
// - Accidents ("I touched it and now I can see in the dark")
```

### Universe-Specific Properties

```typescript
// Properties vary by universe type
interface UniversePropertyRules {
  arcane: {
    magicalPlantsExist: true,
    magicPotencyMultiplier: 1.0,
    medicinalEffectiveness: 0.8,  // Slightly less - magic is primary
  };

  scifi: {
    magicalPlantsExist: false,
    medicinalEffectiveness: 1.2,  // Better understanding of chemistry
    syntheticEnhancements: true,  // Can engineer plants
  };

  realistic: {
    magicalPlantsExist: false,
    medicinalEffectiveness: 1.0,
    requiresProcessing: true,     // Raw plants less effective
  };

  dream: {
    magicalPlantsExist: true,
    magicPotencyMultiplier: 1.5,
    realityAlteringPlants: true,
    plantsCanBeSentient: true,
  };
}
```

---

## Core Mechanics

### Crop Lifecycle

```typescript
interface Crop {
  id: string;
  definitionId: string;    // Base crop type
  position: Position;

  // Growth
  stage: CropStage;        // seed -> sprout -> growing -> mature -> harvestable -> withered
  growthProgress: number;  // 0-100 within current stage
  health: number;          // 0-100
  quality: number;         // 0-100 (affects yield quality)

  // Care tracking
  wateredToday: boolean;
  fertilized: boolean;
  daysWithoutWater: number;

  // Variation (for generated crops)
  traits: CropTraits;
  generation: number;      // How many times bred from base
}

interface CropTraits {
  growthSpeed: number;     // Multiplier
  waterNeed: "low" | "medium" | "high";
  yieldAmount: number;     // Base yield multiplier
  qualityBonus: number;    // Quality tendency
  seasonTolerance: Season[];
  uniqueProperties: string[]; // Generated special traits
}
```

### Crop Stages

| Stage | Duration | Visual | Requirements |
|-------|----------|--------|--------------|
| Seed | 1 day | Bare soil mound | Planted, watered |
| Sprout | 1-2 days | Tiny green shoot | Water |
| Growing | 3-7 days | Leafy plant | Water, optional fertilizer |
| Mature | 2-3 days | Full size, flowers | Water |
| Harvestable | 2-5 days | Fruit/vegetable visible | None |
| Withered | Terminal | Brown, dead | (Too long without harvest/water) |

---

## Requirements

### REQ-FRM-001: Tilling and Planting

Agents SHALL prepare soil and plant crops:

```
WHEN an agent tills a grass tile
THEN the tile SHALL:
  - Change terrain to "dirt"
  - Set fertility based on biome
  - Become plantable
  - Require replanting after 3 harvests

WHEN an agent plants a seed
THEN the system SHALL:
  - Check agent has seed in inventory
  - Check tile is tilled and empty
  - Create Crop entity with seed stage
  - Remove seed from inventory
  - Set initial traits based on seed quality
```

### REQ-FRM-002: Watering

Crops SHALL require watering:

```
WHEN a new day begins
THEN for each crop:
  IF wateredToday == false
    - Increment daysWithoutWater
    - IF daysWithoutWater > waterNeed threshold
      - Reduce health by 20
    - IF health <= 0
      - Set stage to "withered"
  ELSE
    - Reset daysWithoutWater to 0
  - Reset wateredToday to false
```

**Watering Methods:**
- Manual watering by agent (1 tile)
- Sprinkler building (radius)
- Rain weather (all outdoor crops)

### REQ-FRM-003: Growth Progression

Crops SHALL grow over time:

```
WHEN a game tick occurs
THEN for each non-withered crop:
  - Calculate growth rate:
    baseRate * seasonMultiplier * fertilizerBonus * traitMultiplier
  - Add to growthProgress
  - IF growthProgress >= 100
    - Advance to next stage
    - Reset growthProgress to 0
  - IF stage == "harvestable" && daysHarvestable > maxDays
    - Set stage to "withered"
```

### REQ-FRM-004: Harvesting

Agents SHALL harvest mature crops:

```
WHEN an agent harvests a crop at "harvestable" stage
THEN the system SHALL:
  1. Calculate yield based on:
     - Crop definition base yield
     - Quality rating
     - Agent farming skill
     - Random variance (±20%)
  2. Create harvested items
  3. Add items to agent inventory
  4. IF crop.isRepeating (berries, etc.)
     - Reset to "mature" stage
  ELSE
     - Remove crop from tile
     - Decrement tile plantability counter
```

### REQ-FRM-005: Seasonal Crops

Crops SHALL follow seasonal patterns:

```typescript
interface CropDefinition {
  id: string;
  name: string;
  plantingSeasons: Season[];   // When can be planted
  growingSeasons: Season[];    // When grows normally
  harvestSeasons: Season[];    // When can be harvested

  // Out of season effects
  wrongSeasonGrowthRate: number; // 0-1 multiplier
  diesInWrongSeason: boolean;
}
```

| Season | Crops | Notes |
|--------|-------|-------|
| Spring | Potatoes, Carrots, Lettuce, Strawberries | Planting season |
| Summer | Tomatoes, Corn, Melons, Peppers | Peak growth |
| Fall | Pumpkins, Wheat, Grapes, Apples | Harvest season |
| Winter | (Greenhouse only) Winter Roots, Hardy Greens | Limited |

---

## Crop Breeding & Generation

### REQ-FRM-006: Crop Hybridization

The farming system SHALL support breeding new crop varieties:

```
WHEN an agent plants two compatible crops adjacent to each other
AND both reach harvestable stage together
THEN there is a chance (10-30%) to produce hybrid seeds:
  1. LLM generates hybrid concept based on parents
  2. System creates new CropDefinition with:
     - Blended traits from parents
     - Unique generated properties
     - New generated name
     - New sprite (if image gen available)
  3. Hybrid seeds added to harvest
  4. New crop type persisted to game database
```

### REQ-FRM-007: Trait Inheritance

Hybrid crops SHALL inherit and mutate traits:

```typescript
function generateHybridTraits(parent1: CropTraits, parent2: CropTraits): CropTraits {
  return {
    growthSpeed: blend(parent1.growthSpeed, parent2.growthSpeed) * mutation(),
    waterNeed: inherit(parent1.waterNeed, parent2.waterNeed),
    yieldAmount: blend(parent1.yieldAmount, parent2.yieldAmount) * mutation(),
    qualityBonus: blend(parent1.qualityBonus, parent2.qualityBonus),
    seasonTolerance: union(parent1.seasonTolerance, parent2.seasonTolerance),
    uniqueProperties: generateNewProperties(parent1, parent2) // LLM generated
  };
}
```

### REQ-FRM-008: Crop Discovery Persistence

Generated crops SHALL be permanently stored:

```typescript
interface GeneratedCropRecord {
  id: string;
  name: string;            // LLM generated name
  description: string;     // LLM generated lore
  parentCrops: [string, string];
  generation: number;
  discoveredBy: string;    // Agent ID
  discoveredDate: GameTime;
  traits: CropTraits;
  spriteData: string;      // Generated or procedural sprite
  recipes: string[];       // What it can be used in
}
```

---

## Soil Management

### Soil Properties

```typescript
interface SoilState {
  fertility: number;       // 0-100, depletes with use
  moisture: number;        // 0-100, affected by weather
  nutrients: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  composted: boolean;
}
```

### Fertilizers

| Fertilizer | Effect | Duration | Source |
|------------|--------|----------|--------|
| Compost | +20 fertility | Season | Compost bin |
| Fish Meal | +30 growth speed | 7 days | Fishing |
| Bone Meal | +Quality | 14 days | Crafting |
| Magic Dust | +All traits | 3 days | Research |
| Manure | +25 fertility, +15 nitrogen | Season | Animal system |
| Chicken Litter | +20 fertility, +20 nitrogen | Season | Chicken coop |
| Worm Castings | +15 fertility, +All nutrients | 14 days | Worm bin |

### Animal Integration

Animal products enhance farming in multiple ways:

```typescript
interface FarmingAnimalIntegration {
  // Fertilizer from animal waste
  manure: {
    source: "barn" | "stable" | "coop";
    collectionRate: number;        // Per animal per day
    nitrogenContent: number;
    fertilityBoost: number;
    compostingTime: number;        // Days to be usable
  };

  // Pollination
  pollination: {
    bees: {
      radius: number;              // Tiles from apiary
      pollinationBonus: number;    // Yield increase
      crossPollinationChance: number;  // Hybrid chance
    };
  };

  // Pest control
  pestControl: {
    cats: {
      radius: number;
      rodentReduction: number;     // Reduces crop loss
    };
    chickens: {
      pestReduction: number;       // Eat bugs
      requiresFreeRange: boolean;
    };
  };

  // Tilling/working
  workAnimals: {
    horses: {
      tillingSpeed: number;        // Multiplier
      plowingArea: number;         // Tiles per action
    };
    oxen: {
      tillingSpeed: number;
      heavyWorkBonus: number;
    };
  };
}
```

See `animal-system/spec.md` for full animal details.

---

## Farming Buildings

| Building | Function | Unlocked By |
|----------|----------|-------------|
| Scarecrow | Protects 8x8 area from crows | Basic |
| Sprinkler | Waters 3x3 area daily | Construction II |
| Greenhouse | Grow any season crops | Construction III |
| Compost Bin | Convert waste to fertilizer | Basic |
| Seed Maker | Extract seeds from produce | Research I |
| Hybridization Lab | Controlled crop breeding | Research III |

---

## Open Questions

1. Crop diseases and pests system?
2. Giant/legendary crop variants?
3. Magical/fantasy crops from research?

*Note: Animal integration (pollination, fertilizer) addressed in Animal Integration section above.*

---

## Related Specs

**Core Integration:**
- `world-system/spec.md` - Tile management
- `items-system/spec.md` - Seeds, produce, fertilizers
- `agent-system/spec.md` - Farming skill effects
- `game-engine/spec.md` - Growth tick processing

**Enhancement Systems:**
- `research-system/spec.md` - Advanced farming tech, hybridization
- `animal-system/spec.md` - Manure, pollination, pest control, work animals
- `construction-system/spec.md` - Farming buildings, greenhouses
