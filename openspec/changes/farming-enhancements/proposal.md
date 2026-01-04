# Proposal: Work Order: Farming System Enhancements

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/farming-enhancements

---

## Original Work Order

# Work Order: Farming System Enhancements

## Overview
Enhance the farming system to 100% spec coverage by adding plant properties (medicinal/magical), property discovery, companion planting, cross-pollination, wild plant ecology, and crop diseases & pests. Current coverage is approximately 40%.

## Spec Reference
- **Primary Spec:** `openspec/specs/farming-system/spec.md`
- **Phase:** Enhancement (not core roadmap phase)
- **Priority:** MEDIUM
- **Status:** READY_FOR_IMPLEMENTATION

## Dependencies
- **Farming System Foundation** ✅ (plant lifecycle, soil, seeds already implemented)
- **Related Systems:**
  - Item System (for medicinal/magical plant products)
  - Magic System (for magical plant properties)
  - Knowledge System (for property discovery mechanics)

## Requirements Summary

### Current Implementation (~40% coverage)
**Already Implemented:**
- ✅ Plant lifecycle (seed → germinating → sprout → vegetative → flowering → fruiting → mature → seeding → senescence → decay)
- ✅ Soil system (fertility, pH, moisture, nutrients)
- ✅ Seed system (planting, germination, storage)
- ✅ Basic growth mechanics
- ✅ Seasonal patterns
- ✅ Watering and tending

### Missing Features (~60% to implement)

#### 1. Plant Properties (Medicinal/Magical)
Plants can have special properties beyond being edible:

```typescript
interface PlantProperties {
  medicinal?: MedicinalProperties;
  magical?: MagicalProperties;
  toxic?: ToxicProperties;
  aromatic?: AromaticProperties;
}

interface MedicinalProperties {
  effects: MedicinalEffect[];
  potency: number;              // 0-100
  harvestStage: PlantStage;     // When property is strongest
  processingRequired: boolean;  // Needs drying, brewing, etc.
}

type MedicinalEffect =
  | 'healing'         // Restores health
  | 'pain_relief'     // Reduces suffering
  | 'fever_reduction' // Lowers body temperature
  | 'energy_boost'    // Restores stamina
  | 'sleep_aid'       // Helps with rest
  | 'antivenom'       // Counters poison
  | 'antibacterial';  // Fights infection

interface MagicalProperties {
  manaAfinity: number;          // 0-100
  resonantForms: Form[];        // Which magic types it enhances
  enchantmentCapacity: number;  // How many enchantments it can hold
  ingredientQuality: number;    // 0-100, for potion/spell crafting
}

interface ToxicProperties {
  toxicityLevel: number;        // 0-100
  symptoms: ToxicSymptom[];
  fatalDose: number;            // Amount that kills
  antidote?: string;            // Item ID of cure
}
```

#### 2. Property Discovery System
Players/agents don't know plant properties initially - must discover through experimentation:

```typescript
interface PropertyDiscovery {
  // Discovery methods
  methods: DiscoveryMethod[];

  // Knowledge tracking
  knownProperties: Map<string, PropertyKnowledge>;
}

type DiscoveryMethod =
  | 'trial_and_error'   // Eat it and see what happens
  | 'observation'       // Watch animals eat it
  | 'experimentation'   // Test in controlled conditions
  | 'research'          // Read books, ask NPCs
  | 'divine_revelation' // Gods tell you
  | 'chemical_analysis'; // Advanced tech

interface PropertyKnowledge {
  plantSpeciesId: string;
  discoveredProperties: string[];  // Property IDs
  confidence: number;              // 0-100, how sure are we
  discoveredBy: string;            // Entity ID
  discoveredAt: number;            // Game tick
  discoveryMethod: DiscoveryMethod;
}
```

#### 3. Companion Planting
Certain plants benefit (or harm) each other when planted nearby:

```typescript
interface CompanionPlanting {
  companions: PlantCompanion[];
}

interface PlantCompanion {
  speciesId: string;
  relationship: 'beneficial' | 'neutral' | 'antagonistic';
  radius: number;                  // Tiles of effect
  effects: CompanionEffect[];
}

interface CompanionEffect {
  type: CompanionEffectType;
  magnitude: number;
}

type CompanionEffectType =
  | 'growth_boost'       // Faster growth
  | 'pest_repellent'     // Reduces pests
  | 'nutrient_sharing'   // Nitrogen fixing, etc.
  | 'shade_provision'    // Tall plant shades short plant
  | 'pollinator_attraction' // More bees
  | 'growth_inhibition'  // Allelopathy (chemical warfare)
  | 'nutrient_competition' // Fight for same nutrients
  | 'disease_spread';    // Share diseases

// Example: Three Sisters (corn, beans, squash)
const cornBeanSquash: PlantCompanion[] = [
  {
    speciesId: 'bean',
    relationship: 'beneficial',
    radius: 1,
    effects: [
      { type: 'nutrient_sharing', magnitude: 0.3 }  // Beans fix nitrogen for corn
    ]
  },
  {
    speciesId: 'squash',
    relationship: 'beneficial',
    radius: 2,
    effects: [
      { type: 'pest_repellent', magnitude: 0.4 },   // Prickly leaves deter pests
      { type: 'shade_provision', magnitude: 0.2 }   // Keeps soil moist
    ]
  }
];
```

#### 4. Cross-Pollination & Hybridization
Plants can cross-pollinate to create hybrid varieties:

```typescript
interface Pollination {
  requiresPollination: boolean;
  pollinators: PollinatorType[];
  crossCompatible: string[];      // Species IDs that can cross-pollinate
  hybridChance: number;           // 0-1, chance of hybrid offspring
}

type PollinatorType = 'wind' | 'bee' | 'butterfly' | 'bird' | 'manual';

interface HybridPlant {
  parent1: string;                // Species ID
  parent2: string;
  traits: HybridTrait[];          // Inherited from both parents
  generation: number;             // F1, F2, etc.
  stability: number;              // 0-1, how true-breeding
}

interface HybridTrait {
  name: string;
  inheritedFrom: 'parent1' | 'parent2' | 'both';
  expression: number;             // 0-1, how strongly expressed
}

// Example: Cross tomato varieties
const hybridTomato = {
  parent1: 'cherry_tomato',       // Small, sweet
  parent2: 'beefsteak_tomato',    // Large, meaty
  traits: [
    { name: 'size', inheritedFrom: 'both', expression: 0.6 },    // Medium size
    { name: 'sweetness', inheritedFrom: 'parent1', expression: 0.8 },
    { name: 'yield', inheritedFrom: 'parent2', expression: 0.7 }
  ],
  generation: 1,  // F1 hybrid
  stability: 0.5  // May segregate in next generation
};
```

#### 5. Wild Plant Ecology
Wild plants compete, spread, and form ecosystems:

```typescript
interface WildPlantEcology {
  // Spreading
  spreadMechanism: SpreadMechanism[];
  spreadRate: number;              // Tiles per season
  spreadRange: number;             // Max distance from parent

  // Competition
  competitiveness: number;         // 0-100, how aggressive
  preferredBiomes: BiomeType[];
  canInvade: boolean;              // Becomes invasive weed

  // Ecological role
  role: EcologicalRole[];
}

type SpreadMechanism =
  | 'seed_dispersal_wind'
  | 'seed_dispersal_animal'
  | 'seed_dispersal_water'
  | 'vegetative_runners'           // Strawberries
  | 'rhizomes'                     // Bamboo, mint
  | 'bulb_division';

type EcologicalRole =
  | 'nitrogen_fixer'               // Legumes
  | 'soil_stabilizer'              // Deep roots prevent erosion
  | 'pollinator_attractor'
  | 'wildlife_food'                // Berries for birds
  | 'pioneer_species'              // First to colonize bare soil
  | 'climax_species';              // Late succession, stable
```

#### 6. Crop Diseases & Pests
Plants can get sick or be attacked by pests:

```typescript
interface PlantDisease {
  id: string;
  name: string;
  type: DiseaseType;

  // Spread
  transmission: TransmissionMethod[];
  spreadRate: number;              // 0-1, how fast it spreads
  spreadRadius: number;            // Tiles

  // Effects
  effects: DiseaseEffect[];
  lethalityRate: number;           // 0-1, chance of killing plant

  // Conditions
  favorableConditions: Conditions;
  resistantSpecies: string[];      // Immune species
}

type DiseaseType = 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
type TransmissionMethod = 'contact' | 'airborne' | 'waterborne' | 'insect_vector' | 'soil';

interface DiseaseEffect {
  type: DiseaseEffectType;
  severity: number;                // 0-1
}

type DiseaseEffectType =
  | 'growth_stunting'
  | 'leaf_yellowing'
  | 'fruit_rot'
  | 'wilting'
  | 'yield_reduction'
  | 'death';

interface PlantPest {
  id: string;
  name: string;
  targetSpecies: string[];         // Plants it attacks

  // Lifecycle
  reproductionRate: number;        // Offspring per season
  naturalPredators: string[];      // Animal IDs that eat it

  // Damage
  damageRate: number;              // Health lost per tick
  damageType: PestDamageType;
}

type PestDamageType = 'leaf_eating' | 'root_boring' | 'sap_sucking' | 'fruit_infestation';

// Example: Tomato blight
const tomatoBlight: PlantDisease = {
  id: 'late_blight',
  name: 'Late Blight',
  type: 'fungal',
  transmission: ['airborne', 'contact'],
  spreadRate: 0.7,
  spreadRadius: 3,
  effects: [
    { type: 'leaf_yellowing', severity: 0.8 },
    { type: 'fruit_rot', severity: 0.9 },
    { type: 'death', severity: 0.6 }
  ],
  lethalityRate: 0.3,
  favorableConditions: {
    humidity: { min: 0.7, max: 1.0 },
    temperature: { min: 10, max: 25 }
  },
  resistantSpecies: ['blight_resistant_tomato']
};
```

## Implementation Checklist

### Phase 1: Plant Properties System
- [ ] Extend PlantSpecies with properties field
  - [ ] Add medicinal properties
  - [ ] Add magical properties
  - [ ] Add toxic properties
  - [ ] Add aromatic properties
- [ ] Define 10-15 plants with special properties
  - [ ] Healing herbs (aloe, chamomile)
  - [ ] Magical reagents (mandrake, nightshade)
  - [ ] Toxic plants (hemlock, belladonna)
  - [ ] Aromatic herbs (lavender, mint)
- [ ] Update harvest system to collect properties
  - [ ] Extract properties based on harvest stage
  - [ ] Apply processing requirements
  - [ ] Store properties in harvested items

### Phase 2: Property Discovery System
- [ ] Create `PropertyDiscoveryComponent`
  - [ ] Track known properties per entity
  - [ ] Store discovery method and confidence
- [ ] Implement discovery methods
  - [ ] Trial and error (eat/use and observe effects)
  - [ ] Observation (watch animals interact)
  - [ ] Experimentation (controlled tests)
  - [ ] Research (books, NPCs)
- [ ] Add discovery events
  - [ ] Emit event when property discovered
  - [ ] Update knowledge database
  - [ ] Share knowledge between agents (teaching)
- [ ] Create `PropertyDiscoverySystem`
  - [ ] Check for discovery opportunities
  - [ ] Update confidence levels
  - [ ] Propagate knowledge

### Phase 3: Companion Planting
- [ ] Add companion relationships to PlantSpecies
  - [ ] Define beneficial companions
  - [ ] Define antagonistic companions
  - [ ] Set effect radii and magnitudes
- [ ] Implement companion effect system
  - [ ] Scan nearby plants
  - [ ] Apply growth boosts/penalties
  - [ ] Apply pest deterrence
  - [ ] Apply nutrient sharing
- [ ] Create classic companion sets
  - [ ] Three Sisters (corn, beans, squash)
  - [ ] Tomato + Basil
  - [ ] Carrots + Onions (pest control)
  - [ ] Bad combinations (fennel harms most things)

### Phase 4: Cross-Pollination & Hybridization
- [ ] Add pollination requirements to PlantSpecies
  - [ ] Pollinator types
  - [ ] Cross-compatible species list
  - [ ] Hybrid chance
- [ ] Implement pollination system
  - [ ] Detect pollinators in area
  - [ ] Transfer pollen between plants
  - [ ] Generate hybrid seeds
- [ ] Implement hybrid trait inheritance
  - [ ] Blend parent traits
  - [ ] Calculate trait expression
  - [ ] Track generation (F1, F2, etc.)
  - [ ] Implement stability (trait segregation)
- [ ] Create 3-5 hybrid plant definitions
  - [ ] Hybrid tomato varieties
  - [ ] Hybrid flowers
  - [ ] Designer crops with enhanced traits

### Phase 5: Wild Plant Ecology
- [ ] Add ecology properties to wild plants
  - [ ] Spread mechanisms
  - [ ] Spread rates and ranges
  - [ ] Competitiveness
  - [ ] Ecological roles
- [ ] Implement wild plant spreading
  - [ ] Seed dispersal by wind/animals/water
  - [ ] Vegetative spreading (runners, rhizomes)
  - [ ] Colonization of empty tiles
- [ ] Implement plant competition
  - [ ] Compete for nutrients
  - [ ] Shade competition
  - [ ] Allelopathy (chemical warfare)
  - [ ] Invasive species mechanics
- [ ] Add ecological benefits
  - [ ] Nitrogen fixing improves soil
  - [ ] Pollinator attraction
  - [ ] Wildlife food sources

### Phase 6: Crop Diseases & Pests
- [ ] Create disease/pest system
  - [ ] PlantDisease definitions
  - [ ] PlantPest definitions
  - [ ] Disease transmission mechanics
  - [ ] Pest reproduction and spread
- [ ] Implement disease effects
  - [ ] Growth stunting
  - [ ] Leaf yellowing (visual)
  - [ ] Yield reduction
  - [ ] Plant death
- [ ] Implement pest damage
  - [ ] Leaf eating (visual damage)
  - [ ] Root boring (hidden damage)
  - [ ] Sap sucking (slow drain)
  - [ ] Fruit infestation (ruins harvest)
- [ ] Add prevention/treatment
  - [ ] Resistant varieties
  - [ ] Crop rotation
  - [ ] Natural predators (beneficial insects)
  - [ ] Pesticides (crafted items)
- [ ] Define 5-10 common diseases/pests
  - [ ] Tomato blight
  - [ ] Potato beetles
  - [ ] Aphids
  - [ ] Wheat rust
  - [ ] Corn borers

### Phase 7: Integration & Balance
- [ ] Integrate with existing systems
  - [ ] Item system (medicinal/magical products)
  - [ ] Crafting (process plants, make pesticides)
  - [ ] Knowledge system (discovery mechanics)
  - [ ] Animal system (pollinators, pest predators)
- [ ] Balance tuning
  - [ ] Disease spread rates (not too aggressive)
  - [ ] Pest damage rates (challenging but not impossible)
  - [ ] Companion bonuses (meaningful but not overpowered)
  - [ ] Hybrid trait inheritance (interesting variation)

### Phase 8: Persistence
- [ ] Add serialization for new components
  - [ ] PropertyDiscoveryComponent
  - [ ] Disease/pest state
  - [ ] Hybrid plant genetics
- [ ] Handle migration for existing saves
  - [ ] Add properties to existing plants
  - [ ] Initialize discovery state

### Phase 9: UI Enhancements
- [ ] Add property indicators to plant inspector
  - [ ] Show medicinal/magical properties (if known)
  - [ ] Show toxic warnings
  - [ ] Show discovery progress
- [ ] Add disease/pest indicators
  - [ ] Visual infection markers
  - [ ] Health degradation display
  - [ ] Treatment options
- [ ] Add companion planting hints
  - [ ] Highlight beneficial neighbors (green)
  - [ ] Highlight antagonistic neighbors (red)
  - [ ] Show effect radii

## Test Requirements

### Unit Tests
- [ ] Property discovery logic
- [ ] Companion effect calculations
- [ ] Pollination and hybridization
- [ ] Disease transmission
- [ ] Pest damage and reproduction

### Integration Tests
- [ ] Plant with properties → harvest → item has properties
- [ ] Companion plants → verify growth boost
- [ ] Cross-pollination → hybrid seed created
- [ ] Disease spreads between plants
- [ ] Pest population grows and damages crops

### Manual Tests
- [ ] Plant herb → discover medicinal property → craft healing potion
- [ ] Plant Three Sisters → verify growth benefits
- [ ] Cross-pollinate tomatoes → plant hybrid → observe traits
- [ ] Wild plants spread naturally → form ecosystem
- [ ] Disease outbreak → treat with resistant variety

## Acceptance Criteria

1. **Plants have properties** (medicinal, magical, toxic) beyond being edible
2. **Property discovery** works through experimentation and observation
3. **Companion planting** provides meaningful bonuses and penalties
4. **Cross-pollination** creates hybrid varieties with blended traits
5. **Wild plants** spread and compete naturally
6. **Diseases and pests** pose realistic challenges with counterplay
7. **Integration with existing systems** (items, crafting, animals)
8. **UI shows property information** when discovered
9. **Balance is fun** - challenging but rewarding
10. **Persistence works** - properties and discoveries save/load

## Definition of Done

- [ ] All implementation checklist items completed
- [ ] All test requirements passing
- [ ] All acceptance criteria met
- [ ] Code review completed
- [ ] Spec coverage increased to ~100%
- [ ] Documentation updated
- [ ] No performance regression
- [ ] Committed to version control

## Estimated Effort
- **Lines of Code:** ~1,500 LOC
- **Time Estimate:** 15-20 hours
- **Complexity:** Medium (extends existing farming system)

## Notes
- **Start with properties** - foundation for other features
- **Companion planting is high value** - immediate gameplay benefit
- **Diseases should be challenging but fair** - not "rocks fall, everyone dies"
- **Discovery creates progression** - players learn plants over time
- Future enhancements: Genetic modification, plant breeding programs, botanical research station


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
