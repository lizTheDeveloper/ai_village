# Lifecycle System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The lifecycle system manages agent birth, aging, death, and generational mechanics. Agents are born, grow through life stages, can have children, age, and eventually die. This creates emergent multi-generational stories where villages evolve over time.

---

## Age and Life Stages

### Life Stage Structure

```typescript
interface AgentLifeStage {
  stage: LifeStage;
  ageRange: { min: number; max: number };  // In game years
  characteristics: StageCharacteristics;
}

type LifeStage =
  | "infant"          // 0-2: Completely dependent
  | "child"           // 2-12: Learning, playing
  | "adolescent"      // 12-18: Training, coming of age
  | "young_adult"     // 18-30: Prime capability
  | "adult"           // 30-50: Established
  | "middle_aged"     // 50-65: Experienced
  | "elder"           // 65-80: Wisdom, declining physical
  | "ancient";        // 80+: Rare, very frail

interface StageCharacteristics {
  // Physical
  physicalCapability: number;      // 0-1 multiplier
  healthResilience: number;        // Recovery rate
  energyMax: number;               // Max energy level

  // Mental
  learningRate: number;            // Skill gain speed
  memoryRetention: number;         // Memory decay resistance
  wisdomModifier: number;          // Decision quality

  // Social
  canWork: boolean;
  canReproduce: boolean;
  requiresCare: boolean;
  socialRole: string[];

  // Mortality
  baseMortalityRate: number;       // Daily death chance
  accidentVulnerability: number;
}

const lifeStages: AgentLifeStage[] = [
  {
    stage: "infant",
    ageRange: { min: 0, max: 2 },
    characteristics: {
      physicalCapability: 0,
      healthResilience: 0.5,
      energyMax: 30,
      learningRate: 2.0,         // Fastest learning
      memoryRetention: 0.3,      // Forget early years
      wisdomModifier: 0,
      canWork: false,
      canReproduce: false,
      requiresCare: true,
      socialRole: ["dependent"],
      baseMortalityRate: 0.0005,
      accidentVulnerability: 0.8,
    },
  },
  {
    stage: "young_adult",
    ageRange: { min: 18, max: 30 },
    characteristics: {
      physicalCapability: 1.0,   // Peak
      healthResilience: 1.0,
      energyMax: 100,
      learningRate: 1.0,
      memoryRetention: 1.0,
      wisdomModifier: 0.7,
      canWork: true,
      canReproduce: true,
      requiresCare: false,
      socialRole: ["worker", "parent"],
      baseMortalityRate: 0.00005,
      accidentVulnerability: 0.3,
    },
  },
  {
    stage: "elder",
    ageRange: { min: 65, max: 80 },
    characteristics: {
      physicalCapability: 0.5,
      healthResilience: 0.6,
      energyMax: 60,
      learningRate: 0.3,
      memoryRetention: 0.7,
      wisdomModifier: 1.5,       // Peak wisdom
      canWork: true,             // Light work
      canReproduce: false,
      requiresCare: false,       // Usually
      socialRole: ["elder", "advisor", "grandparent"],
      baseMortalityRate: 0.001,
      accidentVulnerability: 0.6,
    },
  },
  // ... other stages
];
```

---

## Requirements

### REQ-LIFE-001: Aging

Agents SHALL age over time:

```
WHEN a game year passes
THEN for each agent:
  1. Increment age by 1
  2. Check for life stage transition
  3. IF stage changes:
     - Apply new characteristics
     - Trigger stage transition event
     - Update appearance
     - May trigger life milestones
  4. Apply age-related changes:
     - Skill decay for elders
     - Physical capability changes
     - Memory effects
```

### REQ-LIFE-002: Birth

New agents SHALL be born:

```typescript
interface BirthEvent {
  child: string;               // New agent ID
  parents: [string, string];
  birthTime: GameTime;
  birthLocation: Position;

  // Genetics
  inheritedTraits: InheritedTraits;
  mutations: Mutation[];

  // Circumstances
  birthComplications: boolean;
  multipleBirth: boolean;      // Twins, etc.
}

interface InheritedTraits {
  // From personality
  personalityBase: PersonalityTraits;  // Blend of parents
  personalityVariance: number;          // Random deviation

  // From skills
  aptitudes: Map<string, number>;       // Natural talent areas

  // Physical
  appearanceTraits: string[];

  // Special
  inheritedKnowledge: string[];         // Family recipes, etc.
}
```

```
WHEN two partnered agents decide to have a child
THEN the system SHALL:
  1. Calculate conception probability based on:
     - Ages of both parents
     - Health of both parents
     - Living conditions
     - Village food supply
  2. IF conception succeeds:
     - Create pregnancy state for mother
     - Set due date (9 in-game months)
  3. WHEN due date arrives:
     - Generate new agent from parent genetics
     - Create birth event
     - Initialize infant agent
     - Update family relationships
```

### REQ-LIFE-003: Child Development

Children SHALL develop over time:

```typescript
interface ChildDevelopment {
  agentId: string;

  // Milestones
  milestones: Map<string, GameTime>;

  // Learning
  currentLearning: LearningFocus[];
  learnedFrom: Map<string, string[]>;  // Skill -> Teachers

  // Care tracking
  primaryCaregiver: string;
  careQuality: number;         // Affects development
  socialExposure: number;      // Other children, village
}

interface LearningFocus {
  skill: string;
  source: "play" | "teaching" | "observation" | "practice";
  intensity: number;
  teacher?: string;
}
```

```
WHEN a child ages
THEN development SHALL progress:
  - Infants: Learn basic mobility, communication
  - Children: Learn skills through play and teaching
  - Adolescents: Apprenticeship, specialization

Development affected by:
  - Care quality (nutrition, attention)
  - Available teachers (parents, mentors)
  - Village resources (schools, libraries)
  - Peer interaction (other children)
  - Natural aptitude (inherited)
```

### REQ-LIFE-004: Coming of Age

Adolescents SHALL transition to adulthood:

```typescript
interface ComingOfAge {
  agentId: string;
  age: number;                 // When it happened
  ceremony: boolean;           // Village celebrated

  // Choices made
  chosenProfession: string;
  chosenMentor?: string;
  chosenHome?: string;         // Move out?

  // Status
  fullAgency: boolean;         // Makes own decisions
  responsibilities: string[];
}
```

```
WHEN an agent reaches adulthood (age 18)
THEN the system SHALL:
  1. Grant full agency
  2. Allow profession choice
  3. Enable reproduction capability
  4. Optionally trigger ceremony event
  5. May move to own housing
  6. End required education/apprenticeship
```

### REQ-LIFE-005: Elder Wisdom

Elders SHALL contribute uniquely:

```
WHEN an agent becomes an elder
THEN they SHALL gain:
  - Wisdom modifier for advice quality
  - Story repository (longer memories)
  - Teaching bonus to skills
  - Council eligibility (governance)
  - Reduced physical work expectations

Elders MAY:
  - Become mentors
  - Join village council
  - Pass down family knowledge
  - Write memoirs (chronicler trait)
  - Care for grandchildren
```

---

## Death

### REQ-LIFE-006: Mortality

Agents SHALL die:

```typescript
interface DeathEvent {
  agentId: string;
  deathTime: GameTime;
  cause: DeathCause;
  location: Position;

  // Circumstances
  witnesses: string[];
  lastWords?: string;
  peacefulDeath: boolean;

  // Legacy
  estate: EstateContents;
  dependents: string[];
  unfinishedBusiness: string[];
}

type DeathCause =
  | "old_age"           // Natural at extreme age
  | "illness"           // Disease
  | "accident"          // Work/travel accident
  | "starvation"        // Prolonged hunger
  | "exposure"          // Cold, heat
  | "combat"            // If combat exists
  | "broken_heart"      // Grief (rare)
  | "mysterious";       // Unknown, story potential
```

```
EACH day for each agent
THEN mortality check SHALL run:
  1. Calculate death probability:
     - Base rate for age
     - Health modifier
     - Hunger/needs modifier
     - Random illness chance
     - Accident chance (work, travel)
  2. IF death occurs:
     - Create death event
     - Notify family/friends
     - Trigger mourning
     - Handle estate
     - Update village memory
     - Remove from active simulation
```

### REQ-LIFE-007: Death Response

The village SHALL respond to death:

```typescript
interface MourningProcess {
  deceased: string;
  mourners: MournerState[];
  funeralEvent?: GameEvent;
  memorialBuilt?: string;

  // Timeline
  deathDate: GameTime;
  mourningPeriod: number;      // Days
  acceptanceDate?: GameTime;
}

interface MournerState {
  agentId: string;
  relationship: RelationshipType;
  griefIntensity: number;      // 0-1
  griefStage: GriefStage;
  behaviorChanges: string[];
}

type GriefStage =
  | "shock"
  | "denial"
  | "anger"
  | "bargaining"
  | "depression"
  | "acceptance";
```

```
WHEN an agent dies
THEN mourning SHALL occur:
  1. Close family enters grief (highest intensity)
  2. Friends experience sadness
  3. Village may hold funeral
  4. Mourners may:
     - Reduce work productivity
     - Seek social comfort
     - Visit memorial/grave
     - Share memories of deceased
  5. Over time, grief transitions to acceptance
  6. Deceased becomes part of village history
```

### REQ-LIFE-008: Legacy and Inheritance

Deceased agents SHALL leave legacies:

```typescript
interface Legacy {
  agentId: string;

  // Material
  estate: ItemStack[];
  buildings: string[];
  currency: number;

  // Knowledge
  learnedRecipes: string[];
  discoveredItems: string[];
  writtenWorks: string[];

  // Social
  relationships: Map<string, RelationshipMemory>;
  reputation: ReputationRecord;
  stories: string[];           // Memorable events

  // Distribution
  will?: Will;
  inheritedBy: Map<string, any>;
}

interface Will {
  beneficiaries: WillEntry[];
  executor?: string;
  specialInstructions: string[];
}
```

```
WHEN an agent dies
THEN legacy SHALL be processed:
  1. Inventory distributed to beneficiaries
  2. Buildings transfer to heirs
  3. Recipes/knowledge may be lost if not taught
  4. Written works persist in library
  5. Memories of them remain in others
  6. Chroniclers may write about them
```

---

## Generational Mechanics

### REQ-LIFE-009: Family Trees

Family relationships SHALL be tracked:

```typescript
interface FamilyTree {
  id: string;                  // Family name/ID
  members: Map<string, FamilyMember>;
  generations: Generation[];

  // Lineage tracking
  ancestors: string[];
  descendants: string[];

  // Family traits
  familyTraits: string[];      // Common across family
  familyKnowledge: string[];   // Passed down recipes, etc.
  familyReputation: number;
}

interface FamilyMember {
  agentId: string;
  generation: number;
  parents: [string?, string?];
  children: string[];
  siblings: string[];
  status: "alive" | "deceased";
}

interface Generation {
  number: number;
  members: string[];
  lifespan: { start: GameTime; end?: GameTime };
  achievements: string[];
}
```

### REQ-LIFE-010: Generational Progress

Knowledge and wealth SHALL accumulate:

```
ACROSS generations:
  - Skills: Children start with aptitude bonuses
  - Knowledge: Family recipes and secrets pass down
  - Wealth: Inheritance builds family resources
  - Reputation: Family name carries weight
  - Buildings: Ancestral homes persist
  - Stories: Family history grows richer

HOWEVER:
  - Skills must still be learned (faster, not free)
  - Knowledge can be lost if not taught
  - Wealth can be squandered
  - Reputation can be damaged
  - Buildings decay without maintenance
```

### REQ-LIFE-011: Population Dynamics

Village population SHALL be managed:

```typescript
interface PopulationDynamics {
  villageId: string;

  // Current state
  population: number;
  birthRate: number;
  deathRate: number;
  growthRate: number;

  // Demographics
  ageDistribution: Map<LifeStage, number>;
  genderDistribution: Map<string, number>;
  professionDistribution: Map<string, number>;

  // Sustainability
  carryingCapacity: number;    // Based on resources
  foodPerCapita: number;
  housingOccupancy: number;
}
```

```
Population growth affected by:
  - Food availability (prosperity = more births)
  - Housing (need space for families)
  - Social stability (conflict reduces births)
  - Disease (epidemics raise death rate)
  - Immigration (new agents arrive)
  - Emigration (agents leave for new villages)

Balance maintained by:
  - Natural limits on reproduction rate
  - Mortality increasing with overcrowding
  - Economic pressures on family size
```

---

## Special Cases

### REQ-LIFE-012: Adoption

Orphaned children SHALL be cared for:

```
WHEN a child's parents die
THEN the system SHALL:
  1. Check for living relatives
  2. IF relatives exist and willing:
     - Transfer guardianship
  3. ELSE:
     - Village collectively cares
     - May be adopted by another family
  4. Create adoption relationship
  5. Child maintains memory of birth parents
```

### REQ-LIFE-013: Immigration

New agents MAY join from outside:

```typescript
interface Immigration {
  agentId: string;
  source: "generated" | "other_village" | "wanderer";
  arrivalTime: GameTime;
  arrivalReason: string;

  // Integration
  sponsoredBy?: string;        // Village member who invited
  integrationStatus: "new" | "settling" | "integrated";
  communityAcceptance: number;
}
```

```
WHEN population is low or growth stalls
THEN new agents MAY arrive:
  - Wanderers seeking community
  - Refugees from other villages
  - Traders who decide to stay
  - Family members of residents

Integration requires:
  - Building relationships
  - Finding housing
  - Contributing to village
  - Learning local customs
```

---

## Time Compression

### REQ-LIFE-014: Lifecycle Time Scales

Life stages SHALL match gameplay:

```typescript
interface LifecycleTimeConfig {
  // Real time to game time
  realMinutesToGameDay: number;  // e.g., 10 minutes = 1 day

  // Lifecycle compression
  yearsPerRealHour: number;      // How fast agents age
  pregnancyDays: number;         // 9 in-game months
  childhoodYears: number;        // Time to adulthood

  // Configurable
  acceleratedAging: boolean;     // Speed up for testing
  immortalMode: boolean;         // Disable death
}

// Default: Balanced lifecycle
// - Playing 1 hour ≈ 6 game days
// - Playing 10 hours ≈ 60 days (2 months)
// - Playing 40 hours ≈ ~8 months
// - Seeing multiple generations requires extended play or time skip
```

---

## Alien Lifecycles

Different species have fundamentally different lifecycle patterns. Some don't "birth" or "die" in traditional ways.

### Pack Mind Lifecycles

Pack minds don't have individual birth/death - they split and merge:

```typescript
interface PackMindLifecycle {
  packId: string;

  // Formation (not birth)
  formation: PackFormation;

  // Bodies (the physical units)
  bodies: PackBody[];

  // Pack-level aging
  packAge: number;                    // Since formation
  personalityAge: number;             // Cumulative body-years of experience

  // Reproduction: Splitting
  splitHistory: PackSplit[];
  mergeHistory: PackMerge[];
}

interface PackFormation {
  method: "split" | "spontaneous" | "constructed";
  parentPack?: string;               // If split from another
  originalBodies: string[];
  formationTime: GameTime;
  initialPersonality: PersonalityTraits;
}

interface PackBody {
  bodyId: string;
  role: "thinker" | "sensor" | "manipulator" | "general";
  age: number;                       // Body's biological age
  health: number;
  joinedPackAt: GameTime;
  previousPack?: string;             // If transferred
}

interface PackSplit {
  timestamp: GameTime;
  reason: "reproduction" | "conflict" | "growth_limit" | "deliberate";

  // Which bodies went where
  remainingBodies: string[];
  departingBodies: string[];

  // New pack created
  newPackId: string;
  newPackMemories: "copied" | "partial" | "none";

  // Relationship after split
  postSplitRelationship: "friendly" | "neutral" | "hostile";
}

interface PackMerge {
  timestamp: GameTime;
  absorbedPack: string;
  absorbedBodies: string[];
  personalityChange: string;         // How pack personality shifted
  conflictDuration: number;          // Internal conflict period
}
```

```
Pack Mind lifecycle events:

FORMATION (instead of birth):
  - Two bodies achieve critical proximity + compatibility
  - OR pack deliberately splits
  - New pack has copied/partial memories from parent
  - Personality emerges from body combination

BODY DEATH (not pack death):
  - Individual body dies
  - Pack mourns but survives (if 2+ bodies remain)
  - May seek replacement body
  - Personality shifts with composition change

BODY ADDITION:
  - Orphan body joins (rare)
  - Pack births/raises new body (if species reproduces)
  - Integration period: new body learns pack rhythms

PACK DEATH (rare):
  - Requires all bodies to die
  - OR coherence drops below viability (mind fragments)
  - Fragmented bodies may go feral or join other packs

PACK SPLITTING (reproduction):
  - Pack grows too large (>8 bodies typical limit)
  - Internal personality conflict becomes unbridgeable
  - Deliberate reproduction decision
  - Both resulting packs are "children" with shared heritage
```

### Hive Lifecycles

Hives have different lifecycle for queen vs workers:

```typescript
interface HiveLifecycle {
  hiveId: string;

  // Queen (the individual that matters)
  queen: QueenLifecycle;

  // Workers (interchangeable)
  workers: WorkerPopulation;

  // Hive-level lifecycle
  hiveAge: number;
  hiveGeneration: number;            // How many queens
}

interface QueenLifecycle {
  queenId: string;
  bornFrom: "founding_queen" | "succession" | "swarming";
  coronationTime: GameTime;
  lifespan: number;                  // Much longer than workers

  // Succession
  potentialSuccessors: string[];     // Princess larvae
  successionPlan: "eldest" | "combat" | "chosen" | "random";

  // Death triggers hive crisis
  deathConsequences: "hive_death" | "succession" | "anarchy_period";
}

interface WorkerPopulation {
  total: number;
  byCase: Map<string, number>;

  // Worker lifecycle is trivial
  averageLifespan: number;           // Days, not years
  dailyDeaths: number;
  dailyBirths: number;

  // Individual workers don't have lifecycles
  // Just population dynamics
}

interface SwarmingEvent {
  timestamp: GameTime;
  departingQueen: string;            // New or old queen leaves
  departingWorkers: number;
  destination: Position;
  newHiveId: string;

  // Relationship with parent hive
  postSwarmRelation: "daughter" | "rival" | "ally";
}
```

```
Hive lifecycle events:

QUEEN BIRTH:
  - Special larva selected and fed royally
  - Maturation period
  - May fight other potential queens
  - Becomes fertile, gains individual cognition

WORKER BIRTH:
  - Continuous, automatic process
  - No individual significance
  - Assigned caste at maturation
  - No coming-of-age ceremony

WORKER DEATH:
  - Constant, expected
  - No mourning (unless critical skill lost)
  - Body recycled for resources
  - Simply replaced

QUEEN DEATH (major crisis):
  - Hive enters emergency state
  - Succession activates
  - If no successor: hive death or absorption by neighbor
  - New queen coronation ceremony

SWARMING (reproduction):
  - Hive splits
  - One queen leaves with portion of workers
  - Establishes new hive
  - Parent hive continues with other queen

HIVE DEATH:
  - Queen dies without successor
  - Workers lose cohesion
  - May be absorbed by neighbor hive
  - May go feral/die off
```

### Symbiont Lifecycles

Symbionts have lifecycles independent of hosts:

```typescript
interface SymbiontLifecycle {
  symbiontId: string;

  // Symbiont's own lifecycle
  symbiontAge: number;               // May be centuries
  symbiontHealth: number;

  // Host history
  hosts: HostRecord[];
  currentHost?: string;

  // Symbiont reproduction (rare)
  offspring: string[];
  reproductionMethod: "budding" | "division" | "spawning";
}

interface HostRecord {
  hostId: string;
  species: string;
  joinedAt: GameTime;
  separatedAt?: GameTime;
  separationReason?: "host_death" | "transfer" | "rejection" | "symbiont_choice";
  relationshipQuality: "harmonious" | "functional" | "strained" | "traumatic";
}

interface SymbiontTransfer {
  timestamp: GameTime;
  fromHost: string;
  toHost: string;
  reason: "host_death" | "host_age" | "compatibility" | "emergency";

  // Transfer risks
  survivalChance: number;
  complications: string[];

  // New host preparation
  preparationTime: number;           // Days before joining
  compatibilityScore: number;
}

interface JoinedLifecycle {
  hostId: string;
  symbiontId: string;

  // Combined identity
  combinedPersonality: PersonalityTraits;
  dominance: "host" | "symbiont" | "balanced";

  // Lifecycle interactions
  hostAging: "normal" | "slowed" | "stopped";
  sharedHealth: boolean;             // Host injury affects symbiont?

  // Death handling
  onHostDeath: "symbiont_survives" | "symbiont_dies" | "transfer_required";
  onSymbiontDeath: "host_survives" | "host_dies" | "withdrawal_trauma";
}
```

```
Symbiont lifecycle events:

SYMBIONT MATURATION:
  - Symbiont born/spawned
  - Pre-joining preparation period
  - First host selection (critical choice)
  - Initial joining ceremony

HOST JOINING:
  - Compatibility assessment
  - Medical/ritual preparation
  - Joining procedure (may be dangerous)
  - Integration period (personality merging)

HOST DEATH:
  - Symbiont must transfer quickly
  - Emergency host may be suboptimal
  - Symbiont carries host's memories
  - Mourning period even after new host

SYMBIONT DEATH (rare):
  - Host experiences severe withdrawal
  - May die or survive with trauma
  - Memories of all hosts lost
  - Host may never fully recover

TRANSFER (non-death):
  - Host aging out
  - Compatibility declining
  - Voluntary for both parties
  - Careful planned transition
```

### Metamorphic Lifecycles

Species with dramatic life stage transformations:

```typescript
interface MetamorphicLifecycle {
  agentId: string;
  currentStage: MetamorphicStage;
  stageHistory: StageTransition[];

  // May be completely different beings at each stage
  stageIdentities: Map<string, PersonalityTraits>;
}

type MetamorphicStage =
  | "larval"              // Radically different form
  | "pupal"               // Transformation cocoon
  | "juvenile"            // Young of final form
  | "adult"               // Primary form
  | "elder"               // May transform again
  | "transcendent";       // Final rare transformation

interface StageTransition {
  from: MetamorphicStage;
  to: MetamorphicStage;
  timestamp: GameTime;
  duration: number;                  // Days in transition

  // Changes
  physicalChanges: string[];
  mentalChanges: string[];
  memoryRetention: number;           // 0-1, how much they remember
  personalityShift: number;          // 0-1, how much personality changes

  // Social implications
  recognizableAsPreviousSelf: boolean;
  relationshipsContinue: boolean;
  nameContinues: boolean;
}
```

```
Metamorphic lifecycle events:

LARVAL STAGE:
  - Born in initial form
  - May be aquatic, underground, or very different
  - Focus: growth, survival
  - Limited cognition

PUPATION (transformation):
  - Enters cocoon/dormancy
  - May last days to years
  - Vulnerable period
  - Complete physical restructuring

EMERGENCE:
  - New form revealed
  - May not remember larval life
  - Personality may be different
  - Must re-learn social connections

ELDER TRANSFORMATION (rare):
  - Some species have second metamorphosis
  - Become something transcendent
  - May no longer be social
  - May leave community entirely
```

### Constructed Being Lifecycles

Beings that are made, not born:

```typescript
interface ConstructedLifecycle {
  beingId: string;

  // Creation (not birth)
  creation: CreationEvent;

  // Existence
  activationTime: GameTime;
  runtime: number;                   // Time since activation
  maintenanceHistory: MaintenanceRecord[];

  // "Mortality"
  degradation: number;               // 0-1
  expectedLifespan: number | "indefinite";
  terminationConditions: string[];
}

interface CreationEvent {
  creator: string | "unknown" | "ancient";
  method: "manufactured" | "grown" | "awakened" | "summoned";
  purpose: string;
  initialProgramming: string[];      // Built-in knowledge/drives

  // Personhood
  hasSoul: boolean | "unknown";
  hasFreewill: boolean;
  canReproduce: boolean;             // Create more of itself
}

interface MaintenanceRecord {
  timestamp: GameTime;
  type: "repair" | "upgrade" | "reset" | "modification";
  performedBy: string;
  changes: string[];
  personalityAffected: boolean;
}
```

```
Constructed lifecycle events:

CREATION:
  - Built/grown/awakened by creator
  - Initial programming/personality
  - May or may not know they're constructed
  - Purpose may drive existence

ACTIVATION:
  - First consciousness
  - Learning period
  - Discovering self and world
  - May question existence

MAINTENANCE:
  - Regular repairs/updates
  - May alter personality (controversial)
  - Upgrade decisions
  - Right to refuse modification?

DEGRADATION:
  - Physical wearing down
  - Memory corruption
  - Personality drift
  - Existential concerns

TERMINATION (instead of death):
  - Creator can deactivate
  - Self-termination possible
  - May be rebuilt/restored (resurrection?)
  - Backup existence questions
```

### Cyclical Dormancy Lifecycles

Species with regular hibernation/dormancy:

```typescript
interface CyclicalLifecycle {
  agentId: string;

  // Current state
  phase: "active" | "pre_dormancy" | "dormant" | "post_dormancy";
  currentCycle: number;
  totalCycles: number;               // Lifetime limit?

  // Timing
  activePeriodLength: number;        // Years
  dormancyLength: number;            // Years
  nextDormancy: GameTime;
  nextWaking: GameTime;

  // Cross-dormancy continuity
  preservationMethod: "biological" | "technological" | "ritual";
  memoryRetention: number;           // Per dormancy
  relationshipPersistence: number;
}

interface DormancyEvent {
  agentId: string;
  startTime: GameTime;
  expectedWakeTime: GameTime;
  actualWakeTime?: GameTime;

  // Preparation
  preparationComplete: boolean;
  knowledgePreserved: string[];
  relationshipsDocumented: string[];
  estateArranged: boolean;

  // What happened during dormancy
  worldChanges: string[];            // Discovered on waking
  deathsDuringDormancy: string[];    // People they knew who died
  birthsDuringDormancy: string[];
}
```

```
Cyclical lifecycle events:

FIRST WAKING (birth equivalent):
  - Emerge from first dormancy
  - Begin first active period
  - Learn world and society

ACTIVE PERIOD:
  - Normal life activities
  - Relationships, work, growth
  - Awareness of approaching dormancy
  - Preparation intensifies toward end

PRE-DORMANCY:
  - Urgent preparation phase
  - Preserving knowledge
  - Saying goodbyes
  - Arranging affairs

DORMANCY:
  - Unconscious/minimal state
  - World continues without them
  - May dream
  - Vulnerable to harm

WAKING:
  - Disorientation
  - Catching up on changes
  - Reconnecting (if anyone survived)
  - Grief for those who died

FINAL DORMANCY (death equivalent):
  - Eventually don't wake up
  - Or cycle limit reached
  - May choose final dormancy
```

### Geological Timescale Lifecycles

Beings for whom normal timescales are imperceptible:

```typescript
interface GeologicalLifecycle {
  beingId: string;

  // Age measured differently
  ageInYears: number;                // May be millions
  ageInEpochs: number;               // Their subjective time

  // Lifecycle stages (if any)
  stage: "nascent" | "growing" | "mature" | "ancient" | "eternal";
  stageTransitionPeriod: number;     // Millennia

  // "Death" concept
  mortal: boolean;
  expectedLifespan: number | "heat_death_of_universe";
  causeOfDeath: "entropy" | "violence" | "choice" | "unknown";
}
```

```
Geological lifecycle events:

FORMATION:
  - May take centuries
  - Born from geological processes
  - Or created by even older beings
  - Or always existed

MATURATION:
  - Takes millennia
  - Barely perceptible change
  - May not notice own aging

OBSERVATION OF MORTALS:
  - Watch civilizations rise and fall
  - Form relationships with lineages, not individuals
  - Experience mortal death as constant
  - May become attached to places, not people

"DEATH" (rare):
  - May take centuries to die
  - May be killed by cosmic events
  - May choose to end existence
  - May transform into something else

RELATIONSHIP TO MORTAL LIFECYCLE:
  - A human lifetime is a blink
  - "Knew your great-great-grandmother"
  - May not notice individual deaths
  - Village generations are one conversation
```

---

## Open Questions

1. Time skip mechanics for generational play?
2. Ghost/ancestor spirits in magical universes?
3. Resurrection or immortality mechanics?
4. Genetic diseases and conditions?
5. Population growth limits and balancing?
6. How do pack minds handle mixed-species bodies?
7. Can symbionts join non-sapient hosts?
8. What happens when a geological being forms attachment to a specific mortal?

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Agent creation and personality
- `agent-system/needs.md` - Health and survival needs
- `agent-system/memory-system.md` - Generational memories

**Species and Culture:**
- `agent-system/species-system.md` - Species defines lifespan, maturation, reproduction
- `agent-system/culture-system.md` - Culture defines parenting norms, life rituals

**Social Systems:**
- `agent-system/relationship-system.md` - Family bonds
- `agent-system/chroniclers.md` - Historical records of births, deaths, lineages

**World Systems:**
- `construction-system/spec.md` - Homes, graves, memorials
- `economy-system/spec.md` - Inheritance
- `items-system/spec.md` - Estate items, heirlooms, wills
- `world-system/abstraction-layers.md` - Multi-generational simulation
- `progression-system/spec.md` - Generational progress contributes to world complexity
- `player-system/spec.md` - Player observes/influences generational stories
