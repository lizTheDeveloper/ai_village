# Animal System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

Animals are living entities that can be wild, tamed, bred, and traded, with unique properties varying by planet type.

## Overview

Animals are living entities that inhabit the world alongside agents. They can be wild, tamed, bred, traded, and in some cases befriended. Different planets have different fauna - realistic worlds have familiar animals; fantasy and alien worlds have generated creatures with unique properties.

---

## Animal Architecture

### Animal Entity

```typescript
interface Animal {
  id: string;
  speciesId: string;
  name?: string;                 // Given name if tamed

  // Physical
  position: Position;
  age: number;                   // Days old
  lifeStage: LifeStage;
  health: number;
  size: number;                  // 0-1 relative to species max

  // State
  state: AnimalState;
  hunger: number;                // 0-100
  thirst: number;
  energy: number;
  stress: number;
  mood: AnimalMood;

  // Ownership
  wild: boolean;
  ownerId?: string;              // Agent ID if tamed
  bondLevel: number;             // 0-100 relationship with owner
  trustLevel: number;            // 0-100 general trust of agents

  // Reproduction
  sex: "male" | "female" | "hermaphrodite" | "asexual";
  fertile: boolean;
  pregnant: boolean;
  pregnancyProgress?: number;
  offspring: string[];           // Children IDs

  // Genetics
  genetics: AnimalGenetics;
  generation: number;

  // Behavior
  personality: AnimalPersonality;
  trainedBehaviors: TrainedBehavior[];
  fears: string[];
  preferences: string[];
}

type LifeStage = "infant" | "juvenile" | "adult" | "elder";
type AnimalState = "idle" | "sleeping" | "eating" | "drinking" | "foraging" |
  "fleeing" | "hunting" | "playing" | "socializing" | "mating" |
  "nesting" | "migrating" | "following" | "working";
type AnimalMood = "content" | "happy" | "anxious" | "aggressive" |
  "curious" | "tired" | "hungry" | "playful" | "affectionate";
```

### Animal Species

```typescript
interface AnimalSpecies {
  id: string;
  name: string;
  category: AnimalCategory;

  // Origin
  originPlanet: string | "universal";
  biomes: BiomeType[];
  rarity: Rarity;

  // Physical characteristics
  baseSize: number;              // 0-1 scale
  lifespan: number;              // Days
  maturityAge: number;           // Days to adult

  // Behavior
  temperament: Temperament;
  diet: Diet;
  socialStructure: SocialStructure;
  activityPattern: ActivityPattern;

  // Capabilities
  canBeTamed: boolean;
  tameDifficulty: number;        // 0-1
  canBeRidden: boolean;
  canBeWorking: boolean;         // Plow, guard, etc.
  canBePet: boolean;

  // Products
  products: AnimalProduct[];

  // Special properties
  properties: AnimalProperties;

  // Visual
  sprites: AnimalSprites;
  colorVariants: ColorVariant[];

  // Generation metadata
  isGenerated: boolean;
  generatedFrom?: GenerationContext;
}

type AnimalCategory =
  | "mammal"
  | "bird"
  | "reptile"
  | "amphibian"
  | "fish"
  | "insect"
  | "arachnid"
  | "mollusk"
  | "crustacean"
  | "mythical"        // Dragons, unicorns
  | "alien"           // Xenofauna
  | "spirit"          // Ethereal beings
  | "construct";      // Magical/mechanical

type Temperament = "docile" | "neutral" | "skittish" | "aggressive" | "territorial" | "curious" | "playful";
type Diet = "herbivore" | "carnivore" | "omnivore" | "insectivore" | "scavenger" | "photosynthetic" | "magical";
type SocialStructure = "solitary" | "pair" | "pack" | "herd" | "flock" | "colony" | "swarm";
type ActivityPattern = "diurnal" | "nocturnal" | "crepuscular" | "cathemeral";
```

---

## Wild Animals

### World Population

```typescript
interface WildAnimalPopulation {
  // Spawning
  spawning: {
    method: "chunk_generation" | "gradual";
    densityByBiome: Map<BiomeType, number>;
    maxPerChunk: number;
  };

  // Ecology
  ecology: {
    predatorPrey: boolean;       // Wolves hunt rabbits
    competition: boolean;        // Fight for resources
    territoriality: boolean;     // Claim areas
    migration: boolean;          // Seasonal movement
  };

  // Population control
  balance: {
    maxPopulationPerSpecies: number;
    naturalMortality: boolean;
    diseaseEvents: boolean;
    predation: boolean;
    starvation: boolean;
  };
}
```

### Animal Behavior (Wild)

```typescript
interface WildBehavior {
  // Daily routine
  dailyRoutine: {
    dawn: "wake" | "sleep" | "hunt";
    morning: ActivityType;
    noon: ActivityType;
    afternoon: ActivityType;
    dusk: "sleep" | "wake" | "hunt";
    night: ActivityType;
  };

  // Reactions to agents
  agentReaction: {
    approach: "flee" | "observe" | "approach" | "attack";
    fleeDistance: number;
    attackCondition?: string;
    curiosityLevel: number;
  };

  // Foraging
  foraging: {
    foodSources: string[];       // Plant/item IDs
    searchRadius: number;
    hoarding: boolean;
  };

  // Social
  social: {
    groupSize: { min: number; max: number };
    hierarchy: boolean;
    communication: string[];     // Sounds, displays
  };
}
```

---

## Taming & Bonding

### Taming Process

```typescript
interface TamingSystem {
  // Methods
  methods: {
    feeding: {
      effectiveness: number;
      preferredFoods: string[];
      requiredFeedings: number;
    };
    patience: {
      effectiveness: number;
      timeRequired: number;      // Hours spent nearby
    };
    rescue: {
      effectiveness: number;     // Helping injured animal
      bondBoost: number;
    };
    raising: {
      effectiveness: number;     // From birth
      imprintingWindow: number;  // Days after birth
    };
  };

  // Difficulty factors
  difficulty: {
    baseBySpecies: number;       // 0-1
    ageModifier: number;         // Younger = easier
    wildnessDecay: number;       // How fast wildness reduces
    trustThreshold: number;      // Trust needed to tame
  };

  // Failure consequences
  failure: {
    fleesOnFail: boolean;
    becomesAggressive: boolean;
    remembersAgent: boolean;     // Harder next time
  };
}

async function attemptTaming(
  agent: Agent,
  animal: Animal,
  method: TamingMethod,
  offering?: Item
): Promise<TamingResult> {

  // Calculate success chance
  const baseChance = 1 - animal.species.tameDifficulty;
  const methodBonus = getTamingMethodEffectiveness(method, animal.species);
  const skillBonus = agent.skills.animalHandling / 200;
  const offeringBonus = offering ? getOfferingBonus(offering, animal.species) : 0;
  const trustBonus = animal.trustLevel / 200;
  const stresspenalty = animal.stress / 100;

  const successChance = Math.min(0.9,
    baseChance + methodBonus + skillBonus + offeringBonus + trustBonus - stressPenalty
  );

  if (Math.random() < successChance) {
    // Success!
    animal.wild = false;
    animal.ownerId = agent.id;
    animal.bondLevel = 20 + Math.random() * 20;
    animal.trustLevel = Math.min(100, animal.trustLevel + 30);

    // Agent memory
    await createMemory(agent, {
      type: "action_completed",
      summary: `Successfully tamed a ${animal.species.name}`,
      importance: 0.7,
      emotionalValence: 0.8,
    });

    return { success: true, animal };
  } else {
    // Failure
    animal.stress += 20;
    animal.trustLevel = Math.max(0, animal.trustLevel - 10);

    if (animal.species.temperament === "aggressive") {
      animal.state = "fleeing";  // Or attacking
    }

    return { success: false, reason: "animal_not_ready" };
  }
}
```

### Bond System

```typescript
interface BondSystem {
  // Bond levels
  levels: {
    0-20: "wary",           // Tolerates owner
    21-40: "accepting",     // Follows basic commands
    41-60: "friendly",      // Affectionate, reliable
    61-80: "loyal",         // Protective, won't flee
    81-100: "bonded",       // Deep connection, intuitive
  };

  // Building bond
  bondBuilding: {
    feeding: 2,             // Per feeding
    grooming: 3,
    playing: 4,
    training: 2,
    working_together: 3,
    sleeping_nearby: 1,
    rescuing: 10,
    neglect: -5,            // Per day of neglect
    abuse: -20,
  };

  // Bond effects
  effects: {
    commandSuccess: "scales with bond";
    productionQuality: "higher with bond";
    escapeChance: "lower with bond";
    moodStability: "better with bond";
  };
}
```

---

## Animal Products

```typescript
interface AnimalProduct {
  itemId: string;
  name: string;

  // Production
  productionType: "continuous" | "periodic" | "terminal";
  interval?: number;            // Days between (periodic)
  quantity: { min: number; max: number };

  // Requirements
  requirements: {
    minAge?: LifeStage;
    minHealth?: number;
    minBond?: number;
    minHappiness?: number;
    sex?: "male" | "female";
    season?: Season[];
  };

  // Quality factors
  qualityFactors: {
    healthWeight: number;
    bondWeight: number;
    dietWeight: number;
    geneticsWeight: number;
  };
}

// Examples
const animalProducts: Record<string, AnimalProduct[]> = {
  chicken: [
    { itemId: "egg", productionType: "periodic", interval: 1, quantity: { min: 0, max: 2 } },
    { itemId: "feather", productionType: "periodic", interval: 7, quantity: { min: 1, max: 3 } },
  ],
  cow: [
    { itemId: "milk", productionType: "continuous", quantity: { min: 1, max: 3 } },
    { itemId: "leather", productionType: "terminal", quantity: { min: 1, max: 1 } },
  ],
  sheep: [
    { itemId: "wool", productionType: "periodic", interval: 14, quantity: { min: 2, max: 4 } },
    { itemId: "mutton", productionType: "terminal", quantity: { min: 2, max: 4 } },
  ],
  bee_colony: [
    { itemId: "honey", productionType: "periodic", interval: 7, quantity: { min: 1, max: 3 } },
    { itemId: "beeswax", productionType: "periodic", interval: 14, quantity: { min: 1, max: 2 } },
  ],
};
```

---

## Animal Types by Universe

### Realistic Universes

```typescript
const realisticAnimals: AnimalCategory[] = [
  // Livestock
  { id: "chicken", category: "bird", products: ["egg", "meat", "feather"] },
  { id: "cow", category: "mammal", products: ["milk", "leather", "meat"] },
  { id: "pig", category: "mammal", products: ["meat"] },
  { id: "sheep", category: "mammal", products: ["wool", "meat", "milk"] },
  { id: "goat", category: "mammal", products: ["milk", "meat", "fiber"] },
  { id: "horse", category: "mammal", canBeRidden: true, canBeWorking: true },
  { id: "donkey", category: "mammal", canBeWorking: true },

  // Pets
  { id: "dog", category: "mammal", canBeWorking: true, canBePet: true },
  { id: "cat", category: "mammal", canBePet: true },

  // Wild
  { id: "rabbit", category: "mammal", canBeTamed: true },
  { id: "deer", category: "mammal", canBeTamed: false },
  { id: "wolf", category: "mammal", canBeTamed: true, tameDifficulty: 0.8 },
  { id: "fox", category: "mammal", canBeTamed: true, tameDifficulty: 0.6 },
  { id: "bear", category: "mammal", canBeTamed: false },
];
```

### Fantasy/Arcane Universes

```typescript
const fantasyAnimals: AnimalCategory[] = [
  // Mythical creatures
  { id: "unicorn", category: "mythical", products: ["unicorn_hair"], tameDifficulty: 0.9 },
  { id: "phoenix", category: "mythical", products: ["phoenix_feather"], respawns: true },
  { id: "griffin", category: "mythical", canBeRidden: true, tameDifficulty: 0.85 },
  { id: "dragon", category: "mythical", canBeRidden: true, tameDifficulty: 0.95 },  // Very rare

  // Magical beasts
  { id: "moonrabbit", category: "mammal", properties: { glowsAtNight: true } },
  { id: "treant_sapling", category: "construct", properties: { photosynthetic: true } },
  { id: "wisp", category: "spirit", canBeTamed: false, products: ["essence"] },
  { id: "familiar_cat", category: "spirit", canBePet: true, properties: { magicalBond: true } },

  // Fairy creatures
  { id: "pixie_swarm", category: "spirit", socialStructure: "swarm" },
  { id: "brownie", category: "spirit", canBeWorking: true },  // Helps with chores
];
```

### Sci-Fi/Frontier Universes

```typescript
const scifiAnimals: AnimalCategory[] = [
  // Alien fauna (examples - would be generated)
  { id: "hexapod_grazer", category: "alien", products: ["alien_milk"] },
  { id: "crystal_beetle", category: "alien", products: ["crystal_shell"] },
  { id: "atmosphere_jellyfish", category: "alien", properties: { floats: true } },
  { id: "symbiont_slug", category: "alien", canBePet: true, properties: { healingAura: true } },

  // Engineered
  { id: "utility_drone", category: "construct", canBeWorking: true },
  { id: "companion_bot", category: "construct", canBePet: true },
];
```

---

## Generated Animals

### Generation for Alien/Fantasy Worlds

```typescript
interface AnimalGeneration {
  // Trigger
  trigger: "world_generation" | "research" | "discovery" | "breeding";

  // Generation parameters
  params: {
    biome: BiomeType;
    universe: UniverseType;
    niche: EcologicalNiche;     // "grazer", "predator", "pollinator"
    size: "tiny" | "small" | "medium" | "large" | "huge";
    rarity: Rarity;
  };

  // LLM prompt structure
  prompt: `
    Generate a creature for a ${params.universe} world.
    Biome: ${params.biome}
    Ecological role: ${params.niche}
    Size: ${params.size}

    Consider:
    - Physical adaptations for this biome
    - Diet and feeding behavior
    - Social structure
    - Useful products or abilities
    - How it might interact with intelligent beings
    - Any magical/technological properties (if applicable)

    Return structured creature data.
  `;
}

interface GeneratedAnimal {
  // Basic info (generated)
  name: string;
  description: string;
  appearance: string;

  // Derived from generation
  species: AnimalSpecies;

  // Unique properties
  uniqueTraits: string[];
  uniqueProducts: AnimalProduct[];
  uniqueBehaviors: string[];

  // Visual
  spritePrompt: string;         // For image generation
  colorPalette: string[];

  // Persistence
  generatedBy: string;          // Agent or system
  generatedAt: GameTime;
  planetId: string;
}

// Example generated creature
const generatedExample: GeneratedAnimal = {
  name: "Lumishell Crawler",
  description: "A six-legged crustacean with a bioluminescent shell that changes color based on mood and time of day.",
  appearance: "Iridescent blue-green shell, multiple eye stalks, delicate antennae",

  species: {
    id: "starfall:gen:lumishell_crawler",
    category: "alien",
    temperament: "curious",
    diet: "omnivore",
    products: [
      { itemId: "lumishell_fragment", productionType: "periodic", interval: 30 },
      { itemId: "crawler_silk", productionType: "continuous" },
    ],
    canBeTamed: true,
    tameDifficulty: 0.4,
    canBePet: true,
  },

  uniqueTraits: [
    "Shell glows brighter when happy",
    "Can detect underground water",
    "Silk is naturally waterproof",
  ],
  uniqueProducts: [
    { itemId: "lumishell_fragment", name: "Lumishell Fragment", properties: { lightSource: true } },
  ],
  uniqueBehaviors: [
    "Stacks shells of deceased colony members into towers",
    "Dances during electrical storms",
  ],

  spritePrompt: "16x16 pixel art, six-legged crab-like creature, glowing blue-green shell, cute eyes on stalks",
  colorPalette: ["#00CED1", "#20B2AA", "#48D1CC", "#40E0D0"],

  generatedBy: "system:world_gen",
  generatedAt: { day: 1, season: "spring", year: 1 },
  planetId: "starfall_colony",
};
```

---

## Breeding

```typescript
interface BreedingSystem {
  // Requirements
  requirements: {
    maleAndFemale: boolean;      // Some species are asexual
    bondLevel: number;           // With owner
    season?: Season[];
    housing?: string;            // Building type needed
    privacy: boolean;
  };

  // Process
  process: {
    courtshipDuration: number;   // Days
    gestationDuration: number;   // Days
    litterSize: { min: number; max: number };
  };

  // Genetics
  genetics: {
    inheritanceModel: "simple" | "complex";
    mutationRate: number;
    traitDominance: Map<string, number>;
  };
}

async function breed(
  parent1: Animal,
  parent2: Animal
): Promise<Animal[]> {

  // Validate compatibility
  if (parent1.speciesId !== parent2.speciesId) {
    // Cross-breeding only in some cases
    if (!canCrossBreed(parent1.species, parent2.species)) {
      return [];
    }
  }

  // Calculate offspring
  const litterSize = calculateLitterSize(parent1, parent2);
  const offspring: Animal[] = [];

  for (let i = 0; i < litterSize; i++) {
    const genetics = inheritGenetics(parent1.genetics, parent2.genetics);
    const mutations = applyMutations(genetics, parent1.species.mutationRate);

    const baby: Animal = {
      id: generateId(),
      speciesId: parent1.speciesId,
      age: 0,
      lifeStage: "infant",
      wild: false,
      ownerId: parent1.ownerId || parent2.ownerId,
      bondLevel: 50,             // Born tame if parents are tame
      genetics: { ...genetics, mutations },
      generation: Math.max(parent1.generation, parent2.generation) + 1,
      // ... other properties
    };

    offspring.push(baby);
  }

  return offspring;
}
```

---

## Working Animals

```typescript
interface WorkingAnimal {
  // Work types
  workTypes: WorkType[];

  // Capabilities
  capabilities: {
    carryCapacity: number;       // Weight
    pullStrength: number;        // For plowing, carts
    speed: number;               // Travel speed
    stamina: number;             // Work duration
    specialAbilities: string[];  // Guard, herd, hunt
  };

  // Training
  training: {
    trainableCommands: string[];
    trainingDifficulty: number;
    maxCommands: number;
  };
}

type WorkType =
  | "mount"           // Riding
  | "pack"            // Carrying goods
  | "plow"            // Field work
  | "cart"            // Pulling vehicles
  | "guard"           // Protection
  | "herd"            // Managing other animals
  | "hunt"            // Helping with hunting
  | "fetch"           // Retrieving items
  | "search"          // Finding things/people
  | "messenger"       // Carrying messages
  | "companion";      // Emotional support (affects mood)

interface TrainedBehavior {
  command: string;              // "sit", "guard", "fetch"
  reliability: number;          // 0-1 chance of success
  trainedBy: string;            // Agent ID
  trainedAt: GameTime;
}
```

---

## Trading Animals

```typescript
interface AnimalTrading {
  // Purchasable from traders
  traderInventory: {
    commonLivestock: "always_available";
    exoticAnimals: "seasonal_or_rare";
    trainedAnimals: "premium_price";
  };

  // Pricing factors
  pricing: {
    basePrice: number;           // By species
    ageModifier: number;         // Younger often more valuable
    healthModifier: number;
    trainingModifier: number;    // Trained = expensive
    geneticsModifier: number;    // Good bloodlines
    bondModifier: number;        // Bonded harder to sell
    rarityModifier: number;
  };

  // Selling
  selling: {
    requiresBond: number;        // Can't sell if bond too high?
    buyerPreferences: string[];  // What buyers want
    marketDemand: number;        // Fluctuates
  };
}

// Wandering animal trader
interface AnimalTrader {
  name: string;
  specialty: AnimalCategory[];
  inventory: Animal[];
  restockInterval: number;
  exoticChance: number;          // Chance of rare animals
}
```

---

## Animal Housing

```typescript
interface AnimalHousing {
  // Building types
  buildings: {
    coop: { capacity: 8, species: ["chicken", "duck"] },
    barn: { capacity: 12, species: ["cow", "sheep", "goat", "pig"] },
    stable: { capacity: 4, species: ["horse", "donkey"] },
    kennel: { capacity: 6, species: ["dog"] },
    apiary: { capacity: 3, species: ["bee_colony"] },
    exotic_enclosure: { capacity: 4, species: ["any_exotic"] },
    aquarium: { capacity: 10, species: ["fish"] },
  };

  // Housing effects
  effects: {
    shelter: "protects from weather";
    safety: "protects from predators";
    comfort: "affects mood and production";
    cleanliness: "requires maintenance";
  };

  // Maintenance
  maintenance: {
    cleaning: "required weekly";
    feeding: "daily or auto-feeder";
    waterSupply: "required";
  };
}
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **Wild animals** | Spawn per biome, have ecology |
| **Taming** | Feeding, patience, rescue, raising from birth |
| **Bond levels** | 0-100, affects commands and products |
| **Products** | Eggs, milk, wool, etc. - continuous or periodic |
| **Universe types** | Realistic, fantasy (mythical), sci-fi (alien), dream |
| **Generation** | LLM creates unique species for alien/fantasy worlds |
| **Breeding** | Genetic inheritance with mutations |
| **Working** | Mount, plow, guard, hunt, companion |
| **Trading** | Buy from merchants, sell surplus |

---

## Related Specs

**Core Integration:**
- `farming-system/spec.md` - Companion planting, animal products
- `economy-system/spec.md` - Animal trading
- `agent-system/spec.md` - Animal handling skill
- `research-system/capability-evolution.md` - Animal system as capability

**System Integration:**
- `items-system/spec.md` - Animal products as items (eggs, milk, wool)
- `construction-system/spec.md` - Animal housing (coop, barn, stable)
- `world-system/spec.md` - Animals inhabit world tiles, wildlife events
- `agent-system/chroniclers.md` - Notable animals, legendary pets in chronicles
