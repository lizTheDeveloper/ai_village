# Reproduction Package - Mating, Genetics, and Family Systems

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the reproduction system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Reproduction Package** (`@ai-village/reproduction`) implements a comprehensive reproduction and breeding system supporting diverse mating paradigms, genetic inheritance, pregnancy/birth simulation, courtship mechanics, and family relationships.

**What it does:**
- Mating paradigm framework (from human monogamy to hive reproduction to parasitic colonization)
- Courtship system with compatibility matching and relationship building
- Pregnancy, labor, and birth simulation with detailed midwifery mechanics
- Genetic inheritance system with mutations and hybridization
- Family relationship tracking and parenting behaviors
- Animal breeding with species-specific reproductive cycles
- Parasitic reproduction and collective mind dynamics

**Key files:**
- `src/MatingParadigm.ts` - Species-level mating rule definitions
- `src/MatingParadigmRegistry.ts` - Pre-configured paradigms (human, kemmer, hive, etc.)
- `src/courtship/CourtshipComponent.ts` - Courtship state tracking
- `src/courtship/compatibility.ts` - Compatibility calculations
- `src/midwifery/MidwiferySystem.ts` - Pregnancy and birth (priority 45)
- `src/midwifery/PregnancyComponent.ts` - Pregnancy tracking
- `src/midwifery/LaborComponent.ts` - Labor and delivery mechanics
- `packages/core/src/systems/ReproductionSystem.ts` - Genetic inheritance (priority 50)

---

## Package Structure

```
packages/reproduction/
├── src/
│   ├── MatingParadigm.ts               # Species mating rule framework
│   ├── MatingParadigmRegistry.ts       # Paradigm presets (12+ paradigms)
│   ├── SexualityComponent.ts           # Sexual/romantic orientation
│   ├── ReproductiveMorphComponent.ts   # Biological sex/morph data
│   ├── ParentingActions.ts             # Parenting behavior actions
│   │
│   ├── courtship/
│   │   ├── CourtshipComponent.ts       # Courtship state tracking
│   │   ├── CourtshipStateMachine.ts    # State transitions
│   │   ├── types.ts                    # Courtship types
│   │   ├── tactics.ts                  # Courtship tactics library
│   │   ├── paradigms.ts                # Species courtship configs
│   │   └── compatibility.ts            # Compatibility calculations
│   │
│   ├── midwifery/
│   │   ├── MidwiferySystem.ts          # Main pregnancy/birth system
│   │   ├── PregnancyComponent.ts       # Pregnancy state tracking
│   │   ├── LaborComponent.ts           # Labor progression and complications
│   │   ├── PostpartumComponent.ts      # Postpartum recovery
│   │   ├── InfantComponent.ts          # Infant needs and development
│   │   └── NursingComponent.ts         # Lactation and nursing
│   │
│   ├── parasitic/
│   │   ├── ParasiticReproductionSystem.ts  # Parasitic breeding
│   │   ├── ColonizationSystem.ts           # Host colonization
│   │   ├── ParasiticColonizationComponent.ts
│   │   └── CollectiveMindComponent.ts      # Hive mind coordination
│   │
│   ├── __tests__/
│   │   ├── CourtshipCompatibility.test.ts
│   │   ├── CourtshipStateMachine.test.ts
│   │   └── CourtshipSystem.test.ts
│   │
│   └── index.ts                        # Package exports
├── package.json
└── README.md                           # This file

packages/core/src/systems/
└── ReproductionSystem.ts               # Genetic inheritance engine
```

---

## Core Concepts

### 1. Mating Paradigms

Species-level rules defining how mating works. Each species has a paradigm that controls pair bonding, courtship, reproduction mechanics, and parenting.

```typescript
interface MatingParadigm {
  id: string;
  name: string;

  pairBonding: PairBondingConfig;      // Monogamy, polygamy, hive-exclusive, etc.
  courtship: CourtshipConfig;          // How mates are selected
  reproductiveMechanism: ReproductiveMechanismConfig;  // Physical reproduction
  parentalCare: ParentalCareConfig;    // Who raises offspring
  mateSelection: MateSelectionConfig;  // Selection criteria
  biologicalSex: BiologicalSexConfig;  // Sex system (binary, sequential, etc.)
  gender: GenderConfig;                // Gender identity system
  attraction: AttractionConfig;        // Attraction patterns
  social: SocialMatingRegulation;      // Social rules and taboos
  hybridization: HybridizationConfig;  // Cross-species breeding
  lifeStages: LifeStageConfig;         // When reproduction is possible
}
```

**Pair bonding types:**
- `'lifelong_monogamy'` - One partner forever (humans, some birds)
- `'serial_monogamy'` - One partner at a time, can change
- `'polygyny'` - One male, multiple females
- `'polyandry'` - One female, multiple males
- `'hive_exclusive'` - Only queen/king reproduce
- `'parasitic'` - Use hosts for reproduction
- `'opportunistic'` - Mate when possible, no bonding

**Pre-configured paradigms:**
```typescript
import {
  HUMAN_PARADIGM,        // Serial monogamy, long courtship, pair parenting
  KEMMER_PARADIGM,       // Sequential hermaphroditism (Ursula K. Le Guin)
  HIVE_PARADIGM,         // Queen-exclusive reproduction
  PARASITIC_HIVEMIND_PARADIGM, // Host colonization and breeding
  SYMBIOTIC_PARADIGM,    // Symbiotic partner bonding
  POLYAMOROUS_PARADIGM,  // Multi-partner bonding
  THREE_SEX_PARADIGM,    // Three sexes required for reproduction
  MYSTIF_PARADIGM,       // Shapeshifting sexual morphs
  ASEXUAL_PARADIGM,      // No mating required (budding, fission)
} from '@ai-village/reproduction';
```

### 2. Courtship System

Courtship tracks romantic/mating interest, compatibility, and relationship building.

```typescript
interface CourtshipComponent {
  state: CourtshipState;  // 'idle' | 'interested' | 'courting' | 'being_courted' | 'consenting' | 'mating'

  paradigm: CourtshipParadigm;        // Species courtship rules

  preferredTactics: string[];         // Preferred courtship tactics
  dislikedTactics: string[];          // Disliked tactics

  style: CourtshipStyle;              // 'bold' | 'subtle' | 'traditional' | 'creative' | 'pragmatic' | 'romantic'
  romanticInclination: number;        // 0-1, how romantic vs pragmatic

  activeCourtships: ActiveCourtship[]; // Current courtship attempts
  receivedCourtships: ReceivedCourtship[]; // Incoming courtship attempts
  pastCourtships: PastCourtship[];    // Courtship history

  rejectionCooldown: Map<string, number>; // Per-target cooldown after rejection
}
```

**Courtship tactics:**
- Universal: gift-giving, compliments, shared activities, humor
- Species-specific: dwarven crafting displays, bird-folk songs, mystif shapeshifting
- Negative: possessiveness, jealousy, aggression (reduce compatibility)

**Compatibility calculation:**
```typescript
import { calculateCompatibility } from '@ai-village/reproduction';

const compatibility = calculateCompatibility(agent1, agent2, world);
// Returns: 0-1 score based on:
// - Sexual compatibility (orientation, attraction)
// - Personality mesh
// - Shared interests
// - Relationship strength
// - Species paradigm rules
```

### 3. Pregnancy and Birth (Midwifery System)

Detailed pregnancy tracking with trimesters, symptoms, risk factors, and birth complications.

```typescript
interface PregnancyComponent {
  // Basic tracking
  fatherId: string;
  conceptionTick: Tick;
  expectedDueDate: Tick;
  gestationProgress: number;  // 0-1

  // Trimester and symptoms
  trimester: 1 | 2 | 3;
  symptoms: PregnancySymptoms;  // Morning sickness, fatigue, backpain, etc.

  // Fetal health
  fetalHealth: number;  // 0-1
  fetalHeartbeat: boolean;
  fetalPosition: FetalPosition;  // 'cephalic' (normal), 'breech', 'transverse'
  expectedOffspringCount: number;

  // Risk assessment
  riskFactors: PregnancyRiskFactor[];  // Age, malnutrition, multiple gestation, etc.
  complications: string[];
  riskModifier: number;  // 1.0 = normal, higher = more risk
  recommendedCare: 'normal' | 'moderate_risk' | 'high_risk';

  // Prenatal care
  checkupHistory: PrenatalCheckup[];
  adequatePrenatalCare: boolean;  // At least 4 checkups

  // Need modifiers
  foodNeedModifier: number;   // 1.25 = 25% more food
  energyNeedModifier: number; // 1.15 = 15% more energy
  speedModifier: number;      // 0.8 = 20% slower in third trimester
}
```

**Labor and delivery:**
```typescript
interface LaborComponent {
  // Progression
  laborStartTick: Tick;
  stage: 'early' | 'active' | 'transition' | 'pushing' | 'delivery' | 'complete';
  progressPercent: number;  // 0-100

  // Complications
  complications: ActiveComplication[];
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'emergency' | 'critical';

  // Attendance and treatment
  attended: boolean;
  attendingMidwifeId: string | null;
  midwifeSkillLevel: number;
  availableSupplies: string[];

  // Birth outcomes
  fetalDistress: boolean;
  maternalDistress: boolean;
  deliveryMethod: 'natural' | 'assisted' | 'breech' | 'emergency';
  childrenBorn: string[];
}
```

**Complications:**
- Common: failure_to_progress, exhaustion, perineal_tear
- Moderate: prolonged_labor, dystocia, fetal_distress
- Severe: hemorrhage, cord_compression, shoulder_dystocia
- Critical: cord_prolapse

### 4. Genetic Inheritance

Genetics are inherited from both parents with mutations and hybrid vigor.

```typescript
interface GeneticComponent {
  // Parentage
  motherId: string | null;
  fatherId: string | null;
  generation: number;

  // Genetic traits
  dominantTraits: string[];
  recessiveTraits: string[];
  expressedTraits: string[];

  // Genetic health
  geneticHealth: number;      // 0-1, reduced by inbreeding
  inbreedingCoefficient: number; // 0-1, calculated from ancestry
  mutationRate: number;       // Base 0.01 (1%)

  // Ancestry
  ancestry: string[];         // Parent IDs going back generations

  // Hybridization
  isHybrid: boolean;
  hybridSpecies?: string[];   // Parent species for hybrids
}
```

**Inheritance rules:**
- Dominant traits: 75% chance of expression if either parent has it
- Recessive traits: 25% chance of expression if both parents carry it
- Mutations: 1% default chance, can create new traits
- Inbreeding: Shared ancestry reduces genetic health
- Hybrid vigor: Hybrids get +10% genetic health bonus

**Creating offspring:**
```typescript
import { ReproductionSystem } from '@ai-village/core';

const reproSystem = new ReproductionSystem();
const child = reproSystem.createOffspring(mother, father, world);
// Returns: Entity with inherited genetics, species, and body modifications
```

### 5. Sexuality and Attraction

Sexual orientation and romantic attraction configuration.

```typescript
interface SexualityComponent {
  // Attraction targets
  sexualTarget: SexualTarget;    // Which sexes attracted to
  genderTarget: GenderTarget;    // Which genders attracted to

  // Attraction axis
  attractionAxis: AttractionAxis; // What attracts: appearance, personality, power, etc.
  attractionIntensity: number;    // 0-1, how strong attraction is

  // Relationship style
  relationshipStyle: 'monogamous' | 'polyamorous' | 'aromantic' | 'flexible';

  // Attraction conditions
  attractionCondition: AttractionCondition;  // When attraction occurs

  // Active attractions
  activeAttractions: ActiveAttraction[];
  currentMates: CurrentMate[];

  // Limits
  maxSimultaneousMates: number;  // 1 for monogamous, 2+ for polyamorous
}
```

**Attraction targets:**
```typescript
type SexualTarget =
  | 'any'           // Pansexual
  | 'same'          // Homosexual
  | 'different'     // Heterosexual
  | 'none'          // Asexual
  | 'multiple'      // Requires multiple partners
  | 'specific_morph'; // Specific biological morphs only

type AttractionCondition =
  | { type: 'always' }
  | { type: 'never' }
  | { type: 'emotional_bond_required', minBondStrength: number }
  | { type: 'status_required', minStatus: number }
  | { type: 'pheromone_triggered' }
  | { type: 'cycle_dependent', cycleStage: string };
```

### 6. Parenting and Family

Parenting responsibilities and family relationship tracking.

```typescript
interface ParentingComponent {
  // Children
  childrenIds: string[];

  // Responsibilities
  activeResponsibilities: ParentingResponsibility[];
  parentingDrive: ParentingDriveLevel;  // 'none' | 'low' | 'moderate' | 'high' | 'obsessive'

  // Care behavior
  careProvider: 'mother' | 'father' | 'both' | 'communal' | 'none';
  nursingCapacity: number;  // For lactating parents

  // Reputation
  parentingReputation: ParentingReputation;  // 'neglectful' to 'exemplary'
}

type ParentingResponsibility =
  | 'feeding'
  | 'protection'
  | 'teaching'
  | 'nursing'
  | 'grooming'
  | 'playing'
  | 'discipline';
```

---

## System APIs

### MidwiferySystem (Priority 45)

Orchestrates pregnancy, labor, birth, and postpartum care.

**Dependencies:** `ReproductionSystem`

**Update interval:** Every tick (continuously monitors pregnancies and labors)

**Key methods:**

```typescript
class MidwiferySystem {
  // Midwife actions
  attendBirth(midwifeId: string, motherId: string): boolean;
  prenatalCheckup(midwifeId: string, motherId: string): PrenatalCheckup | null;
  treatComplication(midwifeId: string, motherId: string, complicationType: BirthComplication): boolean;
  assignWetNurse(wetNurseId: string, infantId: string): boolean;
}
```

**Events emitted:**

```typescript
// Pregnancy
'midwifery:pregnancy_started' → { motherId, fatherId, expectedDueDate, riskFactors }
'midwifery:prenatal_checkup' → { midwifeId, motherId, checkup }

// Labor
'midwifery:labor_started' → { motherId, premature, riskFactors, fetalPosition }
'midwifery:complication' → { motherId, complication, severity }
'midwifery:complication_treated' → { midwifeId, motherId, complication, success }
'midwifery:midwife_attending' → { midwifeId, motherId, skillLevel }

// Birth
'midwifery:birth' → { success, motherId, fatherId, childIds, complications, deliveryMethod, ... }
'birth' → { motherId, fatherId, childId, childIds, gestationalAge, birthWeight, ... }

// Death
'midwifery:maternal_death' → { motherId, cause, complications }
'midwifery:infant_death' → { childId, cause }

// Recovery
'midwifery:recovery_complete' → { motherId }
'midwifery:infant_matured' → { childId, ageDays }
```

**Pregnancy flow:**

```typescript
// 1. Conception occurs (from ReproductionSystem or courtship)
eventBus.emit({
  type: 'conception',
  data: {
    pregnantAgentId: motherId,
    otherParentId: fatherId,
    conceptionTick: currentTick,
    expectedOffspringCount: 1
  }
});

// 2. MidwiferySystem creates PregnancyComponent
// Pregnancy auto-progresses through trimesters

// 3. At 95% gestation, labor starts automatically
// LaborComponent replaces PregnancyComponent

// 4. Labor progresses through stages
// Complications can occur based on risk factors

// 5. Delivery completes
// PregnancyComponent and LaborComponent removed
// PostpartumComponent and NursingComponent added
// Infant entities created with InfantComponent

// 6. Postpartum recovery (6+ weeks)
// InfantComponent tracks development (1+ year)
```

### ReproductionSystem (Priority 50)

Handles genetic inheritance and offspring creation.

**Dependencies:** None

**Update interval:** On-demand (called by other systems)

**Key methods:**

```typescript
class ReproductionSystem {
  // Create offspring with genetic inheritance
  createOffspring(parent1: Entity, parent2: Entity, world: World): Entity | null;

  // Check reproduction compatibility
  private canReproduce(species1, species2, genetics1, genetics2): boolean;

  // Determine offspring species (hybrid or pure)
  private determineOffspringSpecies(species1, species2): SpeciesComponent;

  // Inherit genetics from parents
  private inheritGenetics(genetics1, genetics2, parent1Id, parent2Id): GeneticComponent;

  // Apply hereditary body modifications (wings, etc.)
  private applyHereditaryModifications(body, genetics1, genetics2, tick): BodyComponent;

  // Apply random mutations
  private applyMutation(body, species, mutationRate): boolean;
}
```

**Configuration:**

```typescript
const reproSystem = new ReproductionSystem({
  allowHybrids: true,           // Cross-species breeding
  enableMutations: true,        // Random mutations
  trackInbreeding: true,        // Genetic health tracking
  minGeneticHealth: 0.3,        // Minimum viability threshold
});
```

### CourtshipStateMachine

Manages courtship state transitions and compatibility checking.

**Key methods:**

```typescript
class CourtshipStateMachine {
  // State transitions
  beginCourtship(initiatorId: string, targetId: string): boolean;
  advanceCourtship(initiatorId: string, targetId: string): boolean;
  acceptCourtship(targetId: string, initiatorId: string): boolean;
  rejectCourtship(targetId: string, initiatorId: string): void;
  endCourtship(agent1Id: string, agent2Id: string, succeeded: boolean): void;

  // Compatibility
  checkCompatibility(agent1: Entity, agent2: Entity): number; // 0-1

  // Conception
  attemptConception(agent1Id: string, agent2Id: string): boolean;
}
```

---

## Usage Examples

### Example 1: Setting Up Mating Paradigms

```typescript
import {
  HUMAN_PARADIGM,
  HIVE_PARADIGM,
  getParadigmForSpecies,
  registerMatingParadigm
} from '@ai-village/reproduction';

// Use pre-configured paradigm
const humanEntity = world.createEntity();
humanEntity.addComponent({
  type: 'species',
  speciesId: 'human',
  matingParadigmId: HUMAN_PARADIGM.id
});

// Get paradigm for species
const paradigm = getParadigmForSpecies('human');
console.log(paradigm.pairBonding.type); // 'serial_monogamy'

// Create custom paradigm
const customParadigm = {
  id: 'custom_elven',
  name: 'Elven Bonding',
  pairBonding: {
    type: 'lifelong_monogamy',
    flexibility: 'rigid',
    bondsBreakable: false,
    breakageTrauma: 1.0,
    bondEffects: [{
      effectType: 'telepathy',
      intensity: 0.8,
      requiresProximity: false
    }]
  },
  // ... rest of config
};

registerMatingParadigm(customParadigm);
```

### Example 2: Courtship and Compatibility

```typescript
import {
  createCourtshipComponent,
  calculateCompatibility,
  CourtshipStateMachine
} from '@ai-village/reproduction';

// Add courtship components to agents
const agent1 = world.getEntity(agentId1);
const agent2 = world.getEntity(agentId2);

const courtship1 = createCourtshipComponent({
  paradigm: HUMAN_COURTSHIP_PARADIGM,
  style: 'romantic',
  romanticInclination: 0.8,
  preferredTactics: ['gift_giving', 'compliments', 'shared_activities']
});

agent1.addComponent(courtship1);

// Calculate compatibility
const compatibility = calculateCompatibility(agent1, agent2, world);
console.log(`Compatibility: ${(compatibility * 100).toFixed(0)}%`);

if (compatibility > 0.6) {
  // Begin courtship
  const stateMachine = new CourtshipStateMachine(world);
  const success = stateMachine.beginCourtship(agent1.id, agent2.id);

  if (success) {
    console.log('Courtship initiated');

    // Advance through courtship stages
    stateMachine.advanceCourtship(agent1.id, agent2.id);

    // Target accepts
    stateMachine.acceptCourtship(agent2.id, agent1.id);

    // Attempt conception
    const conceived = stateMachine.attemptConception(agent1.id, agent2.id);
    if (conceived) {
      console.log('Conception successful');
    }
  }
}
```

### Example 3: Pregnancy Tracking

```typescript
import { createPregnancyComponent, MidwiferySystem } from '@ai-village/reproduction';

// Pregnancy is automatically created by MidwiferySystem on conception event
// Access pregnancy data
const mother = world.getEntity(motherId);
const pregnancy = mother.getComponent('pregnancy');

if (pregnancy) {
  console.log(`Trimester: ${pregnancy.trimester}`);
  console.log(`Days remaining: ${pregnancy.daysRemaining}`);
  console.log(`Fetal health: ${pregnancy.fetalHealth}`);
  console.log(`Risk factors: ${pregnancy.riskFactors.join(', ')}`);

  // Perform prenatal checkup
  const midwiferySystem = world.getSystem('midwifery');
  const checkup = midwiferySystem.prenatalCheckup(midwifeId, motherId);

  if (checkup) {
    console.log(`Fetal position: ${checkup.fetalPosition}`);
    console.log(`Fetal heartbeat: ${checkup.fetalHeartbeat}`);
  }
}
```

### Example 4: Attending a Birth

```typescript
import { MidwiferySystem } from '@ai-village/reproduction';

const midwiferySystem = world.getSystem('midwifery');

// Midwife attends birth
const attended = midwiferySystem.attendBirth(midwifeId, motherId);

if (attended) {
  console.log('Midwife attending birth');

  // Check for complications
  const labor = mother.getComponent('labor');

  for (const complication of labor.complications) {
    if (!complication.treated) {
      // Treat complication
      const success = midwiferySystem.treatComplication(
        midwifeId,
        motherId,
        complication.type
      );

      console.log(`Treating ${complication.type}: ${success ? 'SUCCESS' : 'FAILED'}`);
    }
  }
}

// Listen for birth event
world.eventBus.subscribe('midwifery:birth', (event) => {
  const outcome = event.data;
  console.log(`Birth complete: ${outcome.infantsSurvived}/${outcome.childIds.length} survived`);
  console.log(`Delivery method: ${outcome.deliveryMethod}`);
  console.log(`Complications: ${outcome.complications.join(', ')}`);
});
```

### Example 5: Genetic Inheritance

```typescript
import { ReproductionSystem } from '@ai-village/core';

const reproSystem = new ReproductionSystem({
  allowHybrids: true,
  enableMutations: true,
  trackInbreeding: true,
  minGeneticHealth: 0.3
});

// Create offspring
const mother = world.getEntity(motherId);
const father = world.getEntity(fatherId);

const child = reproSystem.createOffspring(mother, father, world);

if (child) {
  const genetics = child.getComponent('genetic');
  const species = child.getComponent('species');

  console.log(`Born: ${species.speciesId}`);
  console.log(`Generation: ${genetics.generation}`);
  console.log(`Genetic health: ${genetics.geneticHealth}`);
  console.log(`Hybrid: ${genetics.isHybrid}`);
  console.log(`Expressed traits: ${genetics.expressedTraits.join(', ')}`);

  if (genetics.isHybrid) {
    console.log(`Hybrid of: ${genetics.hybridSpecies.join(' x ')}`);
  }
} else {
  console.log('Reproduction failed (incompatible or unhealthy genetics)');
}
```

### Example 6: Animal Breeding

```typescript
// Animals use simplified reproduction
const maleAnimal = world.createEntity();
maleAnimal.addComponent({
  type: 'animal',
  speciesId: 'horse',
  sex: 'male',
  lifeStage: 'adult',
  canBreed: true
});

const femaleAnimal = world.createEntity();
femaleAnimal.addComponent({
  type: 'animal',
  speciesId: 'horse',
  sex: 'female',
  lifeStage: 'adult',
  canBreed: true,
  pregnant: false
});

// Breeding check (done by AnimalBrainSystem)
if (maleAnimal.canBreed && femaleAnimal.canBreed && !femaleAnimal.pregnant) {
  // Trigger mating
  femaleAnimal.pregnant = true;
  femaleAnimal.gestationProgress = 0;
  femaleAnimal.gestationDuration = 340; // days for horse

  world.eventBus.emit({
    type: 'animal:mated',
    data: {
      maleId: maleAnimal.id,
      femaleId: femaleAnimal.id,
      species: 'horse'
    }
  });
}

// Gestation progresses automatically in AnimalSystem
// When gestationProgress >= 1.0, offspring is born
```

---

## Architecture & Data Flow

### System Execution Order

```
1. ReproductionSystem (priority 50)
   ↓ Creates offspring entities with genetics
2. MidwiferySystem (priority 45)
   ↓ Manages pregnancy/labor/birth
3. Agent behavior systems (priority 100+)
   ↓ Agents court, mate, parent
```

### Event Flow

```
CourtshipStateMachine
  ↓ 'conception'
MidwiferySystem
  → Creates PregnancyComponent

MidwiferySystem (pregnancy 95% complete)
  ↓ Adds LaborComponent
MidwiferySystem (labor)
  ↓ 'midwifery:birth'
  ↓ Calls ReproductionSystem.createOffspring()
ReproductionSystem
  → Creates offspring with genetics

MidwiferySystem
  ↓ 'midwifery:infant_matured'
  → Removes InfantComponent after 1 year
```

### Component Relationships

```
Entity (Agent/Animal)
├── SpeciesComponent (required for reproduction)
│   └── matingParadigmId → MatingParadigm
├── GeneticComponent (required for offspring)
│   ├── motherId, fatherId → Parent entities
│   └── ancestry: string[] → Grandparents, etc.
├── SexualityComponent (optional, for agents)
│   ├── sexualTarget, genderTarget
│   └── currentMates: string[] → Mate entities
├── CourtshipComponent (optional, during courtship)
│   ├── activeCourtships → Target entities
│   └── receivedCourtships → Initiator entities
├── ReproductiveMorphComponent (optional, detailed biology)
│   ├── currentMorph → Sexual morph
│   └── gestationState? → Pregnancy state
├── PregnancyComponent (temporary, during pregnancy)
│   ├── fatherId → Father entity
│   └── checkupHistory → Midwife interactions
├── LaborComponent (temporary, during labor)
│   ├── attendingMidwifeId → Midwife entity
│   └── complications → BirthComplication[]
├── PostpartumComponent (temporary, 6 weeks)
│   └── recoveryProgress: number
├── InfantComponent (temporary, 1 year)
│   ├── nursingSource → Mother entity
│   └── developmentMilestones
├── NursingComponent (temporary, lactating)
│   └── nursingAssignments: string[] → Infant entities
└── ParentingComponent (permanent)
    └── childrenIds: string[] → Child entities
```

---

## Performance Considerations

**Optimization strategies:**

1. **Courtship culling:** Only simulate courtship for agents near each other
2. **Pregnancy batching:** Update all pregnancies once per tick, not per agent
3. **Genetic caching:** Cache ancestry calculations for inbreeding checks
4. **Event-driven birth:** Labor only processes when in labor stage (not every tick)
5. **Lazy compatibility:** Only calculate compatibility when courtship initiates

**Query caching:**

```typescript
// ❌ BAD: Query in loop
for (const agent of agents) {
  const potentialMates = world.query().with('agent').with('courtship').executeEntities();
}

// ✅ GOOD: Query once, cache results
const eligibleMates = world.query()
  .with('agent')
  .with('courtship')
  .executeEntities();

for (const agent of agents) {
  // Filter cached eligibleMates
  const nearby = eligibleMates.filter(mate => distanceSquared(agent, mate) < 100);
}
```

**Squared distance for proximity:**

```typescript
// ❌ BAD: Math.sqrt in hot path
if (Math.sqrt(dx*dx + dy*dy) < 10) { }

// ✅ GOOD: Squared comparison
if (dx*dx + dy*dy < 100) { }
```

---

## Troubleshooting

### Pregnancy not progressing

**Check:**
1. PregnancyComponent exists? (`entity.hasComponent('pregnancy')`)
2. MidwiferySystem registered? (`world.getSystem('midwifery')`)
3. Fetal health > 0? (`pregnancy.fetalHealth`)
4. Mother not starving? (`needs.hunger < 95`)

**Debug:**
```typescript
const pregnancy = mother.getComponent('pregnancy');
console.log(`Progress: ${pregnancy.gestationProgress * 100}%`);
console.log(`Days remaining: ${pregnancy.daysRemaining}`);
console.log(`Fetal health: ${pregnancy.fetalHealth}`);
console.log(`Complications: ${pregnancy.complications}`);
```

### Courtship compatibility always 0

**Check:**
1. Both agents have `SexualityComponent`
2. Sexual orientations compatible (`sexualTarget`, `genderTarget`)
3. Not on rejection cooldown (`courtship.isOnRejectionCooldown()`)
4. Attraction conditions met (`attractionCondition`)

**Debug:**
```typescript
const sex1 = agent1.getComponent('sexuality');
const sex2 = agent2.getComponent('sexuality');

console.log(`Agent1 targets: ${sex1.sexualTarget}, ${sex1.genderTarget}`);
console.log(`Agent2 targets: ${sex2.sexualTarget}, ${sex2.genderTarget}`);
console.log(`Relationship styles: ${sex1.relationshipStyle}, ${sex2.relationshipStyle}`);

const compat = calculateCompatibility(agent1, agent2, world);
console.log(`Compatibility: ${compat}`);
```

### Offspring not inheriting genetics

**Check:**
1. Both parents have `GeneticComponent`
2. ReproductionSystem.createOffspring() called (not manual entity creation)
3. Species compatible or hybrids allowed
4. Genetic health above threshold (`minGeneticHealth`)

**Debug:**
```typescript
const motherGenetics = mother.getComponent('genetic');
const fatherGenetics = father.getComponent('genetic');

console.log(`Mother health: ${motherGenetics.geneticHealth}`);
console.log(`Father health: ${fatherGenetics.geneticHealth}`);

const inbreeding = GeneticComponent.calculateInbreeding(motherGenetics, fatherGenetics);
console.log(`Inbreeding coefficient: ${inbreeding}`);

const child = reproSystem.createOffspring(mother, father, world);
if (!child) {
  console.log('Reproduction failed (incompatible or unhealthy)');
}
```

### Birth complications causing instant death

**Error:** Maternal or infant death from untreated complications

**Fix:** Ensure midwife attendance or adjust config:

```typescript
const midwiferySystem = new MidwiferySystem();

// Reduce mortality rate
const config = {
  baseComplicationRate: 0.10,       // 10% instead of 15%
  untreatedMortalityRate: 0.01,     // 1% instead of 3%
  enableMaternalMortality: false,   // Disable death entirely
};

// Attend all births automatically
world.eventBus.subscribe('midwifery:labor_started', (event) => {
  const motherId = event.data.motherId;

  // Find nearest midwife
  const midwife = findNearestMidwife(motherId, world);
  if (midwife) {
    midwiferySystem.attendBirth(midwife.id, motherId);
  }
});
```

---

## Integration with Other Systems

### Relationship System

Courtship affects relationship strength:

```typescript
// Successful courtship increases relationship
world.eventBus.subscribe('courtship:accepted', (event) => {
  const { initiatorId, targetId } = event.data;

  // Increase relationship strength
  relationshipSystem.modifyRelationship(initiatorId, targetId, 'romantic', +20);
});

// Rejection decreases relationship
world.eventBus.subscribe('courtship:rejected', (event) => {
  const { initiatorId, targetId } = event.data;

  relationshipSystem.modifyRelationship(initiatorId, targetId, 'romantic', -10);
});
```

### Needs System

Pregnancy modifies needs:

```typescript
const pregnancy = agent.getComponent('pregnancy');
if (pregnancy) {
  // Apply need modifiers
  needs.food *= pregnancy.foodNeedModifier;    // 25% more food
  needs.energy *= pregnancy.energyNeedModifier; // 15% more energy

  // Apply speed modifier
  movement.speed *= pregnancy.speedModifier;    // 20% slower in trimester 3
}
```

### Family/Canon System

Birth events create family relationships:

```typescript
world.eventBus.subscribe('birth', (event) => {
  const { motherId, fatherId, childId } = event.data;

  // Record in canon
  canonSystem.recordBirth({
    childId,
    motherId,
    fatherId,
    timestamp: world.tick,
    lineage: genetics.ancestry
  });

  // Update family tree
  familySystem.addChild(motherId, childId);
  familySystem.addChild(fatherId, childId);
});
```

### Divine Transformation System

Hereditary divine traits pass to offspring:

```typescript
// Mother has divine wings
const motherBody = mother.getComponent('body');
const wings = motherBody.getPart('wings');

if (wings && wings.isDivineTransformation) {
  // Offspring inherits wings (handled by ReproductionSystem.applyHereditaryModifications)
  const childBody = child.getComponent('body');
  const childWings = childBody.getPart('wings');

  console.log(`Child inherited divine wings from mother`);
}
```

---

## Testing

Run reproduction tests:

```bash
npm test -- CourtshipCompatibility.test.ts
npm test -- CourtshipStateMachine.test.ts
npm test -- CourtshipSystem.test.ts
```

**Key test files:**
- `src/__tests__/CourtshipCompatibility.test.ts` - Compatibility calculations
- `src/__tests__/CourtshipStateMachine.test.ts` - State transitions
- `src/__tests__/CourtshipSystem.test.ts` - Integration tests

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference
- **COMPONENTS_REFERENCE.md** - All component types
- **METASYSTEMS_GUIDE.md** - Reproduction metasystem deep dive
- **PERFORMANCE.md** - Performance optimization guide
- **MatingParadigm.ts** - Framework for species mating rules (Ursula K. Le Guin inspired)

---

## Summary for Language Models

**Before working with reproduction:**
1. Read this README completely
2. Understand mating paradigms (species-level rules)
3. Know courtship flow (compatibility → courtship → conception)
4. Understand pregnancy/labor/birth mechanics (midwifery system)
5. Know genetic inheritance rules (Mendelian + mutations + hybrids)

**Common tasks:**
- **Add courtship:** Create `CourtshipComponent` with paradigm and style
- **Calculate compatibility:** Use `calculateCompatibility(agent1, agent2, world)`
- **Start courtship:** Call `stateMachine.beginCourtship(initiatorId, targetId)`
- **Trigger conception:** Call `stateMachine.attemptConception(agent1Id, agent2Id)`
- **Track pregnancy:** Access `PregnancyComponent` for trimester, health, symptoms
- **Attend birth:** Call `midwiferySystem.attendBirth(midwifeId, motherId)`
- **Create offspring:** Use `reproSystem.createOffspring(mother, father, world)` for genetics
- **Check genetics:** Read `GeneticComponent` for traits, health, ancestry

**Critical rules:**
- Never delete pregnant entities (mark for death after birth completes)
- Always use ReproductionSystem for offspring (ensures genetic inheritance)
- Respect mating paradigm rules (don't allow breeding outside paradigm constraints)
- Use event system for conception/birth (don't create components directly)
- Check compatibility before courtship (don't force incompatible pairs)
- Track inbreeding coefficient (prevent genetic health collapse)
- Emit birth events for canon tracking (family trees require events)

**Event-driven architecture:**
- Listen to `conception` events to create PregnancyComponent
- Listen to `midwifery:birth` events for offspring creation
- Emit `courtship:*` events for relationship tracking
- Never bypass MidwiferySystem for pregnancy/birth
- Use ReproductionSystem.createOffspring for all offspring creation
