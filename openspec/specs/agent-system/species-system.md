# Species System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

Sapient species are the intelligent beings that form societies. Different universes have different species - realistic worlds have only humans; fantasy worlds have elves, dwarves, goblins, orcs; sci-fi worlds have aliens, uplifted animals, synthetic beings. Each species has distinct biology that affects lifespan, reproduction, needs, and capabilities.

Species defines the **biological constraints**; culture (see `culture-system.md`) defines the **social expressions** within those constraints.

---

## Species Architecture

### Core Interface

```typescript
interface Species {
  id: string;
  name: string;
  pluralName: string;
  description: string;

  // Universe availability
  availableIn: UniverseType[];   // ["fantasy", "realistic", etc.]

  // Biology
  biology: SpeciesBiology;

  // Lifecycle
  lifecycle: SpeciesLifecycle;

  // Needs variation
  needsProfile: SpeciesNeeds;

  // Capabilities
  innateTraits: InnateTrait[];
  aptitudes: Map<string, number>;  // Skill bonuses/penalties

  // Social
  socialStructure: SocialTendency;
  reproductionStrategy: ReproductionStrategy;

  // Appearance
  appearanceTemplate: AppearanceTemplate;
  sizeCategory: SizeCategory;
}

type UniverseType = "realistic" | "fantasy" | "scifi" | "surreal" | "dream";
type SizeCategory = "tiny" | "small" | "medium" | "large" | "huge";
```

### Species Biology

```typescript
interface SpeciesBiology {
  // Physical
  baseHeight: { min: number; max: number };  // In cm
  baseWeight: { min: number; max: number };  // In kg
  bodyType: BodyType;

  // Sustenance
  diet: Diet;
  sleepPattern: SleepPattern;
  environmentalNeeds: EnvironmentalNeeds;

  // Senses
  senses: SenseProfile;

  // Resilience
  diseaseResistance: number;     // 0-1
  temperatureRange: { min: number; max: number };
  healingRate: number;           // Multiplier

  // Special
  specialBiology: SpecialBiology[];
}

type BodyType =
  | "humanoid"
  | "insectoid"
  | "avian"
  | "reptilian"
  | "aquatic"
  | "amorphous"
  | "crystalline"
  | "ethereal"
  | "mechanical";

type Diet =
  | "omnivore"
  | "carnivore"
  | "herbivore"
  | "photosynthetic"
  | "lithotroph"      // Eats minerals
  | "magical"         // Absorbs mana
  | "emotional"       // Feeds on emotions
  | "synthetic";      // Requires fuel/power

interface SleepPattern {
  type: "nocturnal" | "diurnal" | "crepuscular" | "polyphasic" | "none";
  hoursNeeded: number;
  canSkip: boolean;            // Some species don't need daily sleep
  hibernation?: { season: string; duration: number };
}

interface EnvironmentalNeeds {
  preferredBiome: string[];
  temperaturePreference: { ideal: number; tolerance: number };
  humidityPreference: number;
  lightSensitivity: number;    // Negative = prefers dark
  altitudePreference?: number;
  waterAccess: "none" | "occasional" | "frequent" | "aquatic";
}

type SpecialBiology =
  | "regeneration"
  | "venomous"
  | "bioluminescent"
  | "camouflage"
  | "exoskeleton"
  | "wings"
  | "gills"
  | "multiple_hearts"
  | "hive_mind"
  | "telepathic"
  | "magical_affinity"
  | "iron_allergy"
  | "sunlight_vulnerability"
  | "immortal_aging"
  | "pack_mind"            // Vernor Vinge's Tines - multiple bodies, one mind
  | "networked"            // Can share thoughts with others of species
  | "symbiont_host"        // Carries symbiont partner
  | "symbiont"             // Lives within host
  | "chromatic_skin"       // Communicates via color change (Aeluons)
  | "pheromone_language"   // Chemical communication
  | "cyclical_dormancy";   // Long hibernation cycles (Vinge's Spiders)
```

---

## Consciousness and Mind Types

Different species have fundamentally different consciousness structures. This affects how they're simulated, how they interact, and how they form societies.

> **Implementation Note:** Not all consciousness types are equally feasible for implementation. See `consciousness-implementation-phases.md` for which types are included in each development phase and specific technical constraints (e.g., pack minds limited to 4-6 bodies, symbionts limited to 5 accessible past hosts).

### Consciousness Architecture

```typescript
interface ConsciousnessType {
  type: MindType;
  agencyLevel: AgencyLevel;
  memorySharing: MemorySharing;
  deathBehavior: ConsciousnessDeathBehavior;
  communicationModes: CommunicationMode[];
}

type MindType =
  | "individual"         // Standard single body, single mind
  | "pack_mind"          // Multiple bodies form ONE consciousness (Tines)
  | "hive_mind"          // Collective consciousness, individuals lack full agency
  | "networked"          // Individual but can share thoughts (Borg-lite)
  | "symbiont_merged"    // Two beings share one consciousness (Trill)
  | "distributed"        // Mind exists across substrates (AI, uploaded)
  | "gestalt"            // Multiple individuals temporarily merge
  | "fragmented";        // One mind in multiple bodies, aware of all

type AgencyLevel =
  | "full"               // Makes own decisions (individual, pack_mind)
  | "partial"            // Some decisions made by collective (networked)
  | "minimal"            // Role-determined behavior (hive worker)
  | "none";              // Pure extension of collective (hive drone)

interface MemorySharing {
  type: "none" | "partial" | "full" | "delayed";
  scope: "self" | "pack" | "hive" | "species" | "symbiont";
  persistence: "death_ends" | "survives_death" | "generational";
}

type ConsciousnessDeathBehavior =
  | "ends"               // Standard death
  | "pack_diminished"    // Pack mind loses capability
  | "absorbed"           // Memories return to hive
  | "transferred"        // Passes to new host (symbiont)
  | "dormant"            // Can be restored
  | "distributed";       // Survives if any node survives
```

### Pack Minds (Vernor Vinge's Tines)

Multiple bodies form a single sapient consciousness. Each body is non-sapient alone.

```typescript
interface PackMindSpecies extends Species {
  consciousness: {
    type: "pack_mind";
    minBodies: number;           // Below this, mind degrades
    maxBodies: number;           // Above this, coherence fails
    optimalSize: number;         // Best cognitive function
    bodyRoles: PackBodyRole[];
    coherenceRange: number;      // Max distance before fragmentation
  };

  packMechanics: {
    // Formation
    canSplit: boolean;           // Can pack divide into two minds?
    canMerge: boolean;           // Can packs combine?
    splitPersonality: "copies" | "diverges" | "fragments";

    // Death and renewal
    bodyDeath: "pack_diminished" | "replacement_needed";
    puppyIntegration: IntegrationProcess;

    // Cognition
    thoughtSpeed: number;        // Multiple bodies = parallel processing
    conflictResolution: "consensus" | "dominant_body" | "fastest";
  };
}

interface PackBodyRole {
  id: string;
  function: "thinker" | "sensor" | "manipulator" | "memory" | "speaker";
  bodyRequirements: string[];   // Physical traits needed
  cognitiveContribution: number; // 0-1 contribution to pack IQ
}

// Example: Tine-like species
const tinesSpecies: PackMindSpecies = {
  id: "chorus",
  name: "Chorus",
  pluralName: "Choruses",
  description: "Wolf-like creatures that are only sapient in packs of 4-8",
  availableIn: ["scifi"],

  consciousness: {
    type: "pack_mind",
    minBodies: 3,                // Below 3, degrades to animal
    maxBodies: 8,                // Above 8, cacophony
    optimalSize: 5,
    bodyRoles: [
      { id: "thinker", function: "thinker", bodyRequirements: ["healthy_brain"], cognitiveContribution: 0.3 },
      { id: "sensor", function: "sensor", bodyRequirements: ["keen_senses"], cognitiveContribution: 0.2 },
      { id: "manipulator", function: "manipulator", bodyRequirements: ["dexterous_paws"], cognitiveContribution: 0.15 },
    ],
    coherenceRange: 10,          // Meters before thoughts blur
  },

  packMechanics: {
    canSplit: true,              // Traumatic but possible
    canMerge: false,             // Would create unstable mind
    splitPersonality: "diverges",// Each new pack becomes different person
    bodyDeath: "pack_diminished",
    puppyIntegration: {
      minAge: 2,
      duration: 30,              // Days to integrate new member
      effect: "personality_shift",
    },
    thoughtSpeed: 1.5,           // Parallel processing bonus
    conflictResolution: "consensus",
  },

  // ... rest of species definition
};

// Gameplay effects
interface PackMindEffects {
  // Combat: Can flank self, but damage to one affects all
  // Social: Other species may not realize they're one being
  // Death: Losing members reduces intelligence, may drop below sapience
  // Reproduction: New pups must join existing pack or form new one
  // Relationships: Pack-to-pack relationships, not individual
}
```

### Hive Minds

Individual bodies have limited agency; the hive thinks as one.

```typescript
interface HiveMindSpecies extends Species {
  consciousness: {
    type: "hive_mind";
    queenRequired: boolean;       // Does hive need central node?
    workerAgency: AgencyLevel;    // How autonomous are workers?
    hiveRange: number | "unlimited";
  };

  hiveMechanics: {
    castes: HiveCaste[];
    roleAssignment: "birth" | "development" | "queen_assigns" | "needed";
    interHiveCommunication: boolean;
    hiveDeath: "queen_dies" | "all_die" | "survives_partial";
  };
}

interface HiveCaste {
  id: string;
  name: string;
  ratio: number;                  // Percentage of population
  agency: AgencyLevel;
  canReproduce: boolean;
  specialization: string[];
  lifespan: number;               // May differ from species average
}

// Example: Fully hive-minded insects
const kthrixHive: HiveMindSpecies = {
  id: "kthrix",
  name: "K'thrix",

  consciousness: {
    type: "hive_mind",
    queenRequired: true,
    workerAgency: "minimal",
    hiveRange: 1000,              // Meters
  },

  hiveMechanics: {
    castes: [
      { id: "queen", name: "Overmind", ratio: 0.001, agency: "full", canReproduce: true, specialization: ["thinking", "coordination"], lifespan: 100 },
      { id: "thinker", name: "Cerebrate", ratio: 0.01, agency: "partial", canReproduce: false, specialization: ["problem_solving", "memory"], lifespan: 50 },
      { id: "worker", name: "Drone", ratio: 0.8, agency: "minimal", canReproduce: false, specialization: ["labor", "combat"], lifespan: 10 },
      { id: "reproducer", name: "Breeder", ratio: 0.05, agency: "none", canReproduce: true, specialization: ["egg_laying"], lifespan: 30 },
    ],
    roleAssignment: "development",
    interHiveCommunication: false,  // Each hive is separate entity
    hiveDeath: "queen_dies",        // Hive collapses without queen
  },
};
```

### Networked Consciousness

Individuals exist but can share thoughts, memories, or merge temporarily.

```typescript
interface NetworkedSpecies extends Species {
  consciousness: {
    type: "networked";
    networkType: NetworkType;
    sharingDepth: SharingDepth;
    networkRange: number | "unlimited";
  };

  networkMechanics: {
    connectionRequired: boolean;  // Must be connected to function?
    isolationEffects: string[];   // What happens when alone?
    mergeCapability: boolean;     // Can temporarily gestalt?
    privacyPossible: boolean;     // Can shield thoughts?
  };
}

type NetworkType =
  | "always_on"         // Constantly connected (Borg-like)
  | "opt_in"            // Choose when to share
  | "proximity"         // Only when near others
  | "ritual"            // Requires ceremony to connect
  | "technological";    // Requires external tech

type SharingDepth =
  | "emotions_only"     // Feel others' feelings
  | "surface_thoughts"  // Hear active thinking
  | "memories"          // Access stored experiences
  | "full_merge";       // Become temporarily one

// Example: Networked but individual species
const ethereansNetworked: NetworkedSpecies = {
  id: "etherean",
  name: "Etherean",
  description: "Beings who share an emotional field but maintain individuality",

  consciousness: {
    type: "networked",
    networkType: "proximity",
    sharingDepth: "emotions_only",
    networkRange: 50,
  },

  networkMechanics: {
    connectionRequired: false,
    isolationEffects: ["loneliness_amplified", "emotional_instability"],
    mergeCapability: true,        // Ritual merging possible
    privacyPossible: true,        // Can shield with effort
  },
};
```

### Symbiont Consciousness (Trill-like)

Two beings share one body, blending into merged consciousness.

```typescript
interface SymbiontSpecies {
  host: Species;
  symbiont: Species;
  mergedConsciousness: MergedConsciousness;
}

interface MergedConsciousness {
  dominance: "host" | "symbiont" | "equal" | "situational";
  memoryAccess: "all_hosts" | "current_only" | "selected";
  personalityBlend: number;      // 0 = host dominant, 1 = symbiont dominant

  // Lifecycle
  joiningAge: number;            // When can host accept symbiont?
  separationSurvival: "both_die" | "host_dies" | "symbiont_dies" | "both_survive";
  symbiontsPerHost: number;      // Usually 1

  // Inheritance
  symbioticMemorySpan: number;   // How many hosts' memories?
  personalityDrift: number;      // How much symbiont changes per host?
}

// Example: Trill-like joined species
const jothaSymbiosis: SymbiontSpecies = {
  host: {
    id: "jotha_host",
    name: "Jotha",
    description: "Humanoid host species, can live unjoined",
    lifecycle: {
      maxAge: 80,
      averageLifespan: 70,
      // ...
    },
  },

  symbiont: {
    id: "jotha_symbiont",
    name: "Veth",
    description: "Long-lived symbiont carrying memories of all past hosts",
    biology: {
      bodyType: "amorphous",
      diet: "symbiotic",       // Draws from host
      // ...
    },
    lifecycle: {
      maxAge: 500,
      averageLifespan: 400,
      // ...
    },
  },

  mergedConsciousness: {
    dominance: "equal",
    memoryAccess: "all_hosts",
    personalityBlend: 0.3,       // New host mostly themselves, but influenced

    joiningAge: 20,
    separationSurvival: "symbiont_dies", // Host can survive, symbiont cannot
    symbiontsPerHost: 1,

    symbioticMemorySpan: Infinity,   // Remembers ALL past hosts
    personalityDrift: 0.1,           // Symbiont personality slowly shifts
  },
};
```

---

## Communication Modes

Species communicate in fundamentally different ways, affecting social interaction.

### Communication Types

```typescript
interface SpeciesCommunication {
  primary: CommunicationMode;
  secondary: CommunicationMode[];
  canLearnOther: boolean;        // Can learn other species' modes?
}

interface CommunicationMode {
  type: CommunicationType;
  range: number;                  // Meters
  speed: "instant" | "fast" | "slow";
  privacy: "public" | "directional" | "private";
  bandwidth: "low" | "medium" | "high" | "complete";
  crossSpecies: boolean;         // Understandable by others?
}

type CommunicationType =
  // Familiar
  | "verbal"              // Spoken language
  | "written"             // Text
  | "sign"                // Gestural language

  // Non-verbal biological
  | "chromatic"           // Skin color changes (Aeluons)
  | "pheromonal"          // Chemical signals
  | "bioluminescent"      // Light patterns
  | "sonar"               // Echolocation patterns
  | "electrical"          // Bioelectric fields
  | "subsonic"            // Infrasound

  // Mental
  | "telepathic"          // Direct mind-to-mind
  | "empathic"            // Emotional broadcast
  | "memory_share"        // Direct experience transfer

  // Technological
  | "radio"               // EM broadcast
  | "quantum_link";       // Instant FTL communication

// Example: Aeluon-like chromatic communicators
const aeluonCommunication: SpeciesCommunication = {
  primary: {
    type: "chromatic",
    range: 20,                   // Visual range
    speed: "instant",
    privacy: "public",          // Anyone watching can see
    bandwidth: "high",          // Complex color patterns
    crossSpecies: false,        // Must learn to interpret
  },
  secondary: [
    {
      type: "pheromonal",
      range: 5,
      speed: "slow",            // Takes time to disperse
      privacy: "public",
      bandwidth: "low",         // Basic emotions/states
      crossSpecies: true,       // Some universals
    },
  ],
  canLearnOther: true,          // Can learn verbal languages
};

// Gameplay effects of chromatic communication
interface ChromaticEffects {
  // Cannot lie easily - emotions show on skin
  // Cannot communicate in darkness
  // Written language must be color-based
  // Other species may misread (color blindness)
  // Strong emotions = involuntary broadcasting
}

// Example: Purely pheromonal species
const pheroCommunication: SpeciesCommunication = {
  primary: {
    type: "pheromonal",
    range: 30,
    speed: "slow",
    privacy: "public",          // Lingers in area
    bandwidth: "medium",
    crossSpecies: false,
  },
  secondary: [
    {
      type: "subsonic",
      range: 100,
      speed: "fast",
      privacy: "public",
      bandwidth: "low",
      crossSpecies: true,       // Some species can hear
    },
  ],
  canLearnOther: false,         // Cannot produce verbal sounds
};
```

---

## Cyclical Biology

Some species have dramatically different life rhythms.

### Hibernation and Dormancy

```typescript
interface CyclicalBiology {
  cycleType: CycleType;
  activePeriod: number;          // Years/days active
  dormantPeriod: number;         // Years/days dormant
  dormancyTrigger: DormancyTrigger;
  dormancyState: DormancyState;
}

type CycleType =
  | "seasonal"           // Hibernate each winter
  | "decadal"            // Years-long cycles (Vinge's Spiders)
  | "generational"       // Species alternates active generations
  | "resource_triggered" // Dormant until conditions right
  | "astronomical";      // Tied to stellar/planetary cycles

type DormancyTrigger =
  | "temperature"
  | "day_length"
  | "resource_scarcity"
  | "population_density"
  | "stellar_cycle"
  | "voluntary";

interface DormancyState {
  metabolism: "suspended" | "minimal" | "altered";
  consciousness: "none" | "dreaming" | "slowed";
  vulnerability: "high" | "medium" | "cocooned";
  memoryRetention: number;       // 0-1, how much remembered on waking
  agingDuringDormancy: boolean;
}

// Example: Vinge's Spiders-inspired species
const deepwinterSpecies: Species = {
  id: "deepwinter",
  name: "Deepwinter",
  pluralName: "Deepwinters",
  description: "Civilization rises and falls with 200-year cycles",

  biology: {
    // ... standard biology
    sleepPattern: {
      type: "polyphasic",
      hoursNeeded: 4,
      canSkip: false,
      hibernation: {
        season: "deepwinter",
        duration: 35,            // Years of dormancy
      },
    },
  },

  cyclicalBiology: {
    cycleType: "decadal",
    activePeriod: 165,           // Years
    dormantPeriod: 35,           // Years
    dormancyTrigger: "stellar_cycle",
    dormancyState: {
      metabolism: "suspended",
      consciousness: "dreaming",
      vulnerability: "cocooned", // Spin protective shells
      memoryRetention: 0.7,      // Some loss each cycle
      agingDuringDormancy: false,
    },
  },

  // Cultural implications
  // - Must preserve knowledge across sleeps
  // - Architecture must survive dormancy
  // - Children may be different generation on waking
  // - Wars can be "won" by surviving longer
};
```

---

## Lifecycle Variation

### Species Lifecycle

```typescript
interface SpeciesLifecycle {
  // Lifespan
  maxAge: number;                // In years (can be Infinity)
  averageLifespan: number;
  agingCurve: AgingCurve;

  // Life stages (species-specific)
  stages: LifeStageDefinition[];

  // Maturation
  maturityAge: number;           // When considered adult
  elderAge: number;              // When considered elder

  // Death
  naturalDeathChance: (age: number) => number;
  dyingProcess: DyingProcess;
}

interface LifeStageDefinition {
  name: string;
  ageRange: { start: number; end: number };
  characteristics: StageCharacteristics;

  // Species-specific
  metamorphosis?: boolean;       // Insectoid larva → adult
  dormancy?: boolean;            // Hibernation stage
  ritual?: string;               // Coming-of-age ritual name
}

type AgingCurve =
  | "linear"           // Ages steadily (humans)
  | "front_loaded"     // Ages fast then slows (goblins)
  | "back_loaded"      // Ages slow then fast at end (elves)
  | "stepped"          // Distinct phases (insectoids)
  | "none";            // Doesn't age (immortal, constructs)

type DyingProcess =
  | "gradual_decline"  // Standard aging
  | "sudden_death"     // Dies at max age suddenly
  | "transcendence"    // Transforms into something else
  | "recycled"         // Returns to hive/collective
  | "petrification"    // Turns to stone/crystal
  | "dispersal";       // Fades/dissolves
```

### Example Lifecycles

```typescript
const humanLifecycle: SpeciesLifecycle = {
  maxAge: 100,
  averageLifespan: 70,
  agingCurve: "linear",
  maturityAge: 18,
  elderAge: 65,
  stages: [
    { name: "infant", ageRange: { start: 0, end: 2 } },
    { name: "child", ageRange: { start: 2, end: 12 } },
    { name: "adolescent", ageRange: { start: 12, end: 18 } },
    { name: "adult", ageRange: { start: 18, end: 65 } },
    { name: "elder", ageRange: { start: 65, end: 100 } },
  ],
  naturalDeathChance: (age) => age > 60 ? 0.001 * Math.pow(1.1, age - 60) : 0.0001,
  dyingProcess: "gradual_decline",
};

const elfLifecycle: SpeciesLifecycle = {
  maxAge: 800,
  averageLifespan: 600,
  agingCurve: "back_loaded",
  maturityAge: 100,
  elderAge: 500,
  stages: [
    { name: "seedling", ageRange: { start: 0, end: 20 } },
    { name: "sapling", ageRange: { start: 20, end: 100 }, ritual: "First Blossoming" },
    { name: "mature", ageRange: { start: 100, end: 500 } },
    { name: "ancient", ageRange: { start: 500, end: 800 } },
  ],
  naturalDeathChance: (age) => age > 500 ? 0.0001 * Math.pow(1.05, age - 500) : 0.00001,
  dyingProcess: "transcendence",  // Become one with forest
};

const goblinLifecycle: SpeciesLifecycle = {
  maxAge: 40,
  averageLifespan: 25,
  agingCurve: "front_loaded",
  maturityAge: 6,
  elderAge: 25,
  stages: [
    { name: "whelp", ageRange: { start: 0, end: 1 } },
    { name: "runt", ageRange: { start: 1, end: 6 }, ritual: "Blood Trial" },
    { name: "warrior", ageRange: { start: 6, end: 25 } },
    { name: "decrepit", ageRange: { start: 25, end: 40 } },
  ],
  naturalDeathChance: (age) => age > 20 ? 0.01 * Math.pow(1.2, age - 20) : 0.005,
  dyingProcess: "sudden_death",
};

const insectoidLifecycle: SpeciesLifecycle = {
  maxAge: 50,
  averageLifespan: 30,
  agingCurve: "stepped",
  maturityAge: 5,
  elderAge: 35,
  stages: [
    { name: "egg", ageRange: { start: 0, end: 0.1 } },
    { name: "larva", ageRange: { start: 0.1, end: 2 }, metamorphosis: true },
    { name: "nymph", ageRange: { start: 2, end: 5 }, metamorphosis: true },
    { name: "worker", ageRange: { start: 5, end: 35 } },
    { name: "elder", ageRange: { start: 35, end: 50 } },
  ],
  naturalDeathChance: (age) => age > 30 ? 0.005 * Math.pow(1.15, age - 30) : 0.002,
  dyingProcess: "recycled",
};
```

---

## Reproduction Strategies

### Strategy Types

```typescript
interface ReproductionStrategy {
  type: ReproductionType;
  fertility: FertilityProfile;
  gestation: GestationProfile;
  offspring: OffspringProfile;

  // Biological constraints on culture
  pairBondingTendency: number;   // 0-1, affects relationship norms
  parentalInvestment: ParentalInvestment;
  sexDetermination: SexDetermination;
}

type ReproductionType =
  | "sexual_viviparous"     // Live birth (mammals)
  | "sexual_oviparous"      // Egg-laying
  | "sexual_ovoviviparous"  // Eggs hatch inside
  | "budding"               // Asexual splitting
  | "spore"                 // Spore dispersal
  | "metamorphic"           // Complex lifecycle
  | "constructed"           // Built/created (constructs)
  | "spontaneous";          // Magical generation

interface FertilityProfile {
  fertilityWindow: { start: number; end: number };  // Ages
  conceptionChance: number;     // Base per attempt
  seasonalBreeding?: string[];  // Some species only breed in spring
  fertilityCooldown: number;    // Days/months between possible conceptions
  lifetimeLimit?: number;       // Max offspring ever
}

interface GestationProfile {
  type: "internal" | "external_egg" | "pouch" | "communal" | "none";
  duration: number;             // In days
  visibility: boolean;          // Can others tell?
  restrictions: string[];       // What pregnant individual can't do
  risks: number;                // Complication chance
}

interface OffspringProfile {
  typical: number;              // Average per birth
  range: { min: number; max: number };
  independence: IndependenceLevel;
  inheritanceStrength: number;  // How much from parents vs random
}

type IndependenceLevel =
  | "helpless"       // Requires years of care (humans)
  | "dependent"      // Needs care but mobile (most mammals)
  | "precocial"      // Mobile at birth, minimal care (goblins)
  | "independent"    // Fully self-sufficient at birth
  | "hive_raised";   // Raised by collective, not parents

type ParentalInvestment =
  | "biparental"     // Both parents invest
  | "maternal"       // Mother only
  | "paternal"       // Father only (rare)
  | "communal"       // Group raises young
  | "none"           // No parental care
  | "sequential";    // Different parent at different stages

type SexDetermination =
  | "binary_genetic"     // XX/XY style
  | "environmental"      // Temperature, etc.
  | "sequential"         // Changes over life
  | "fluid"              // Can change
  | "multiple"           // More than 2 sexes
  | "none";              // Asexual

// Multi-sex reproduction (Oankali-style, three+ sexes)
interface MultiSexReproduction extends ReproductionStrategy {
  sexDetermination: "multiple";
  sexes: BiologicalSex[];
  reproductionRequirement: ReproductionRequirement;
  geneflowMechanism: GeneflowMechanism;
}

interface BiologicalSex {
  id: string;
  name: string;
  role: ReproductionRole;
  ratio: number;                    // Population percentage
  canChangeToFrom?: string[];       // If transformation possible
  uniqueAbilities?: string[];       // Sex-specific capabilities
  socialRole?: string;              // Default social position
}

type ReproductionRole =
  | "bearer"              // Carries offspring
  | "sire"                // Provides genetic material
  | "mixer"               // Combines/modifies genetics (ooloi)
  | "catalyst"            // Enables reproduction but doesn't contribute
  | "carrier"             // Transports gametes
  | "host"                // Provides environment for development
  | "modifier";           // Alters offspring post-conception

interface ReproductionRequirement {
  minimumParticipants: number;
  requiredRoles: ReproductionRole[];
  optionalRoles?: ReproductionRole[];
  canSubstitute?: Map<ReproductionRole, ReproductionRole[]>;
}

type GeneflowMechanism =
  | "random_merge"        // Standard sexual reproduction
  | "selective_mixer"     // Third party chooses what passes (ooloi)
  | "additive"            // All participants contribute equally
  | "dominant_override"   // One role's genes dominate
  | "negotiated";         // Participants consciously choose traits

// Example: Oankali-inspired three-sex species
const trilinkReproduction: MultiSexReproduction = {
  type: "sexual_viviparous",
  sexDetermination: "multiple",

  sexes: [
    {
      id: "female",
      name: "Fem",
      role: "bearer",
      ratio: 0.35,
      uniqueAbilities: ["gestation", "lactation"],
      socialRole: "nurturer",
    },
    {
      id: "male",
      name: "Mal",
      role: "sire",
      ratio: 0.35,
      uniqueAbilities: ["genetic_contribution"],
      socialRole: "protector",
    },
    {
      id: "mixer",
      name: "Ixin",
      role: "mixer",
      ratio: 0.30,
      uniqueAbilities: [
        "gene_sense",         // Can perceive genetic potential
        "gene_edit",          // Modifies offspring genetics
        "healing_touch",      // Manipulates biological systems
        "neural_link",        // Creates pleasure/bond during mating
      ],
      socialRole: "facilitator",
    },
  ],

  reproductionRequirement: {
    minimumParticipants: 3,      // All three required
    requiredRoles: ["bearer", "sire", "mixer"],
    optionalRoles: [],
    canSubstitute: new Map(),    // No substitutions
  },

  geneflowMechanism: "selective_mixer",  // Ixin chooses which genes pass

  fertility: {
    fertilityWindow: { start: 20, end: 200 },
    conceptionChance: 0.8,       // High when ixin facilitates
    fertilityCooldown: 365,
  },

  gestation: {
    type: "internal",
    duration: 400,
    visibility: true,
    restrictions: ["combat", "heavy_labor"],
    risks: 0.01,
  },

  offspring: {
    typical: 1,
    range: { min: 1, max: 2 },
    independence: "dependent",
    inheritanceStrength: 0.95,   // Ixin ensures clean inheritance
  },

  pairBondingTendency: 0.95,     // Triads bond for life
  parentalInvestment: "biparental",  // All three parent
};

// Compulsive gene-trading (Oankali trait)
interface GeneTradeCompulsion {
  intensity: number;              // 0-1, how resistible
  triggerProximity: number;       // Distance that triggers urge
  targetSpecies: "own" | "compatible" | "any_sapient";
  consequences: {
    resistance: string[];         // Effects of fighting urge
    indulgence: string[];         // Effects of trading
  };
}

const oankaliGeneTrade: GeneTradeCompulsion = {
  intensity: 0.9,                 // Nearly irresistible
  triggerProximity: 10,           // Meters
  targetSpecies: "any_sapient",   // Will trade with any intelligent life
  consequences: {
    resistance: ["physical_pain", "obsessive_thoughts", "depression"],
    indulgence: ["euphoria", "knowledge_gain", "offspring_improved"],
  },
};
```

### Example Strategies

```typescript
const humanReproduction: ReproductionStrategy = {
  type: "sexual_viviparous",
  fertility: {
    fertilityWindow: { start: 15, end: 45 },
    conceptionChance: 0.2,
    fertilityCooldown: 270,    // 9 months
    lifetimeLimit: 15,
  },
  gestation: {
    type: "internal",
    duration: 270,
    visibility: true,
    restrictions: ["heavy_labor", "combat"],
    risks: 0.02,
  },
  offspring: {
    typical: 1,
    range: { min: 1, max: 4 },
    independence: "helpless",
    inheritanceStrength: 0.7,
  },
  pairBondingTendency: 0.7,
  parentalInvestment: "biparental",
  sexDetermination: "binary_genetic",
};

const goblinReproduction: ReproductionStrategy = {
  type: "sexual_viviparous",
  fertility: {
    fertilityWindow: { start: 4, end: 20 },
    conceptionChance: 0.5,       // Very fertile
    fertilityCooldown: 60,       // 2 months
  },
  gestation: {
    type: "internal",
    duration: 60,                // Quick
    visibility: true,
    restrictions: [],            // Goblins don't slow down
    risks: 0.1,
  },
  offspring: {
    typical: 4,
    range: { min: 2, max: 8 },
    independence: "precocial",   // Walking in days
    inheritanceStrength: 0.3,    // High mutation/variance
  },
  pairBondingTendency: 0.1,      // No pair bonds
  parentalInvestment: "communal",
  sexDetermination: "binary_genetic",
};

const elfReproduction: ReproductionStrategy = {
  type: "sexual_viviparous",
  fertility: {
    fertilityWindow: { start: 100, end: 400 },
    conceptionChance: 0.05,      // Very low
    fertilityCooldown: 3650,     // 10 years between possible conceptions
    lifetimeLimit: 3,            // Rarely more than 3 children ever
  },
  gestation: {
    type: "internal",
    duration: 730,               // 2 years
    visibility: true,
    restrictions: ["combat", "travel"],
    risks: 0.001,
  },
  offspring: {
    typical: 1,
    range: { min: 1, max: 2 },
    independence: "dependent",
    inheritanceStrength: 0.9,    // Strong inheritance
  },
  pairBondingTendency: 0.95,     // Mate for life
  parentalInvestment: "biparental",
  sexDetermination: "binary_genetic",
};

const insectoidReproduction: ReproductionStrategy = {
  type: "sexual_oviparous",
  fertility: {
    fertilityWindow: { start: 5, end: 40 },
    conceptionChance: 0.9,
    seasonalBreeding: ["spring", "summer"],
    fertilityCooldown: 30,
  },
  gestation: {
    type: "external_egg",
    duration: 30,                // Egg incubation
    visibility: false,           // Eggs in nursery
    restrictions: [],
    risks: 0.3,                  // Many eggs don't hatch
  },
  offspring: {
    typical: 20,
    range: { min: 10, max: 50 },
    independence: "hive_raised",
    inheritanceStrength: 0.5,
  },
  pairBondingTendency: 0.0,
  parentalInvestment: "communal",
  sexDetermination: "environmental",  // Role determines function
};
```

---

## Species Needs Variation

### Needs Profile

```typescript
interface SpeciesNeeds {
  // Physical needs modifications
  physical: {
    hungerRate: number;          // Multiplier (goblins: 1.5, elves: 0.5)
    thirstRate: number;
    energyRate: number;
    warmthSensitivity: number;
    healthResilience: number;
  };

  // Social needs modifications
  social: {
    belongingNeed: number;       // 0-1 importance (hive minds: 1.0)
    solitudeNeed: number;        // 0-1 (some species need alone time)
    intimacyNeed: number;        // 0-1 (varies by pair-bonding tendency)
    hierarchyNeed: number;       // 0-1 (need to know one's place)
  };

  // Psychological needs modifications
  psychological: {
    noveltyNeed: number;         // 0-1 (goblins high, dwarves low)
    beautyNeed: number;          // 0-1 (elves high)
    craftNeed: number;           // 0-1 (dwarves high)
    chaosNeed: number;           // 0-1 (goblins high)
    orderNeed: number;           // 0-1 (insectoids high)
    territoryNeed: number;       // 0-1 (orcs high)
  };

  // Species-specific needs
  unique: SpeciesUniqueNeed[];
}

interface SpeciesUniqueNeed {
  name: string;
  description: string;
  category: "physical" | "social" | "psychological";
  decayRate: number;
  satisfiedBy: string[];
  effects: {
    low: string[];
    critical: string[];
  };
}

// Example: Elf-specific needs
const elfUniqueNeeds: SpeciesUniqueNeed[] = [
  {
    name: "communion_with_nature",
    description: "Elves need regular connection with natural spaces",
    category: "psychological",
    decayRate: 1,            // Per day
    satisfiedBy: ["time_in_forest", "gardening", "tending_plants", "meditation_outdoors"],
    effects: {
      low: ["melancholy", "distracted", "irritable"],
      critical: ["fading", "despair", "may_leave_settlement"],
    },
  },
  {
    name: "aesthetic_harmony",
    description: "Elves are disturbed by ugliness and disorder",
    category: "psychological",
    decayRate: 0.5,
    satisfiedBy: ["beautiful_surroundings", "art", "music", "craft_appreciation"],
    effects: {
      low: ["uncomfortable", "critical_of_others"],
      critical: ["cannot_work", "compulsive_beautifying"],
    },
  },
];

// Example: Goblin-specific needs
const goblinUniqueNeeds: SpeciesUniqueNeed[] = [
  {
    name: "mischief",
    description: "Goblins need to cause chaos or play tricks",
    category: "psychological",
    decayRate: 3,            // High - need frequent mischief
    satisfiedBy: ["pranks", "theft", "sabotage", "chaotic_combat"],
    effects: {
      low: ["restless", "aggressive"],
      critical: ["will_cause_major_trouble", "may_betray_allies"],
    },
  },
  {
    name: "pack_presence",
    description: "Goblins need to be around other goblins",
    category: "social",
    decayRate: 2,
    satisfiedBy: ["goblin_company", "large_group", "mob_activity"],
    effects: {
      low: ["anxious", "cowardly"],
      critical: ["paralyzed_with_fear", "will_flee"],
    },
  },
];
```

---

## Innate Traits and Aptitudes

### Trait System

```typescript
interface InnateTrait {
  id: string;
  name: string;
  description: string;

  // Mechanical effects
  effects: TraitEffect[];

  // Visibility
  visible: boolean;            // Can others see this trait?
  expressionAge?: number;      // When does it manifest?
}

type TraitEffect =
  | { type: "skill_bonus"; skill: string; amount: number }
  | { type: "skill_penalty"; skill: string; amount: number }
  | { type: "need_modifier"; need: string; multiplier: number }
  | { type: "resistance"; damageType: string; amount: number }
  | { type: "vulnerability"; damageType: string; amount: number }
  | { type: "sense"; senseType: string; range: number }
  | { type: "ability"; abilityId: string }
  | { type: "restriction"; action: string };

// Elf traits
const elfTraits: InnateTrait[] = [
  {
    id: "keen_senses",
    name: "Keen Senses",
    description: "Exceptional sight and hearing",
    effects: [
      { type: "sense", senseType: "vision", range: 2.0 },
      { type: "sense", senseType: "hearing", range: 1.5 },
      { type: "skill_bonus", skill: "foraging", amount: 15 },
    ],
    visible: true,
  },
  {
    id: "nature_affinity",
    name: "Nature Affinity",
    description: "Innate connection to natural world",
    effects: [
      { type: "skill_bonus", skill: "farming", amount: 20 },
      { type: "skill_bonus", skill: "animalHandling", amount: 15 },
      { type: "ability", abilityId: "speak_with_plants" },
    ],
    visible: false,
  },
  {
    id: "iron_sensitivity",
    name: "Iron Sensitivity",
    description: "Cold iron causes discomfort",
    effects: [
      { type: "vulnerability", damageType: "cold_iron", amount: 2.0 },
      { type: "restriction", action: "use_iron_tools" },
    ],
    visible: false,
  },
];

// Goblin traits
const goblinTraits: InnateTrait[] = [
  {
    id: "dark_vision",
    name: "Dark Vision",
    description: "Can see in complete darkness",
    effects: [
      { type: "sense", senseType: "darkvision", range: 60 },
      { type: "vulnerability", damageType: "bright_light", amount: 0.5 },
    ],
    visible: true,
  },
  {
    id: "cowardly_cunning",
    name: "Cowardly Cunning",
    description: "Fights dirty when cornered",
    effects: [
      { type: "skill_bonus", skill: "stealth", amount: 20 },
      { type: "skill_bonus", skill: "traps", amount: 25 },
      { type: "skill_penalty", skill: "leadership", amount: -15 },
    ],
    visible: false,
  },
  {
    id: "rapid_breeding",
    name: "Rapid Breeding",
    description: "Matures and reproduces quickly",
    effects: [
      { type: "ability", abilityId: "fast_maturation" },
    ],
    visible: true,
  },
];

// Dwarf traits
const dwarfTraits: InnateTrait[] = [
  {
    id: "stone_sense",
    name: "Stone Sense",
    description: "Innate understanding of stone and metal",
    effects: [
      { type: "skill_bonus", skill: "mining", amount: 30 },
      { type: "skill_bonus", skill: "construction", amount: 20 },
      { type: "skill_bonus", skill: "crafting", amount: 25 },
      { type: "sense", senseType: "stonecunning", range: 30 },
    ],
    visible: false,
  },
  {
    id: "poison_resistant",
    name: "Poison Resistant",
    description: "Hardy constitution resists toxins",
    effects: [
      { type: "resistance", damageType: "poison", amount: 0.5 },
      { type: "resistance", damageType: "alcohol", amount: 0.3 },
    ],
    visible: false,
  },
];
```

---

## Base Species Definitions

### Fantasy Species

```typescript
const FANTASY_SPECIES: Species[] = [
  {
    id: "human",
    name: "Human",
    pluralName: "Humans",
    description: "Adaptable, short-lived, ambitious",
    availableIn: ["realistic", "fantasy", "scifi"],
    biology: humanBiology,
    lifecycle: humanLifecycle,
    needsProfile: humanNeeds,
    innateTraits: [],
    aptitudes: new Map(),  // No bonuses/penalties - baseline
    socialStructure: "flexible",
    reproductionStrategy: humanReproduction,
    appearanceTemplate: humanAppearance,
    sizeCategory: "medium",
  },

  {
    id: "elf",
    name: "Elf",
    pluralName: "Elves",
    description: "Long-lived, graceful, nature-attuned",
    availableIn: ["fantasy"],
    biology: elfBiology,
    lifecycle: elfLifecycle,
    needsProfile: elfNeeds,
    innateTraits: elfTraits,
    aptitudes: new Map([
      ["farming", 20], ["crafting", 15], ["research", 10],
      ["construction", -10], ["mining", -20],
    ]),
    socialStructure: "hierarchical",
    reproductionStrategy: elfReproduction,
    appearanceTemplate: elfAppearance,
    sizeCategory: "medium",
  },

  {
    id: "dwarf",
    name: "Dwarf",
    pluralName: "Dwarves",
    description: "Stout, industrious, tradition-bound",
    availableIn: ["fantasy"],
    biology: dwarfBiology,
    lifecycle: dwarfLifecycle,
    needsProfile: dwarfNeeds,
    innateTraits: dwarfTraits,
    aptitudes: new Map([
      ["mining", 30], ["crafting", 25], ["construction", 20], ["trading", 10],
      ["farming", -15], ["swimming", -30],
    ]),
    socialStructure: "clan_based",
    reproductionStrategy: dwarfReproduction,
    appearanceTemplate: dwarfAppearance,
    sizeCategory: "small",
  },

  {
    id: "goblin",
    name: "Goblin",
    pluralName: "Goblins",
    description: "Numerous, cunning, chaotic",
    availableIn: ["fantasy"],
    biology: goblinBiology,
    lifecycle: goblinLifecycle,
    needsProfile: goblinNeeds,
    innateTraits: goblinTraits,
    aptitudes: new Map([
      ["stealth", 25], ["traps", 20], ["scavenging", 30],
      ["crafting", -10], ["leadership", -15], ["research", -20],
    ]),
    socialStructure: "mob",
    reproductionStrategy: goblinReproduction,
    appearanceTemplate: goblinAppearance,
    sizeCategory: "small",
  },

  {
    id: "orc",
    name: "Orc",
    pluralName: "Orcs",
    description: "Powerful, tribal, honor-driven",
    availableIn: ["fantasy"],
    biology: orcBiology,
    lifecycle: orcLifecycle,
    needsProfile: orcNeeds,
    innateTraits: orcTraits,
    aptitudes: new Map([
      ["combat", 25], ["hunting", 20], ["intimidation", 20],
      ["crafting", -10], ["research", -15], ["diplomacy", -10],
    ]),
    socialStructure: "tribal",
    reproductionStrategy: orcReproduction,
    appearanceTemplate: orcAppearance,
    sizeCategory: "large",
  },
];
```

### Sci-Fi Species

```typescript
const SCIFI_SPECIES: Species[] = [
  {
    id: "insectoid",
    name: "K'thrix",
    pluralName: "K'thrix",
    description: "Hive-minded, specialized, efficient",
    availableIn: ["scifi"],
    biology: insectoidBiology,
    lifecycle: insectoidLifecycle,
    needsProfile: insectoidNeeds,
    innateTraits: insectoidTraits,
    aptitudes: new Map([
      ["construction", 30], ["farming", 20], ["coordination", 40],
      ["creativity", -30], ["leadership", -20],  // No individuals lead
    ]),
    socialStructure: "hive",
    reproductionStrategy: insectoidReproduction,
    appearanceTemplate: insectoidAppearance,
    sizeCategory: "medium",
  },

  {
    id: "synthetic",
    name: "Synthetic",
    pluralName: "Synthetics",
    description: "Constructed, logical, immortal",
    availableIn: ["scifi"],
    biology: syntheticBiology,
    lifecycle: syntheticLifecycle,  // No aging
    needsProfile: syntheticNeeds,   // Power, maintenance, purpose
    innateTraits: syntheticTraits,
    aptitudes: new Map([
      ["research", 25], ["crafting", 20], ["calculation", 50],
      ["socializing", -20], ["creativity", -15],
    ]),
    socialStructure: "network",
    reproductionStrategy: syntheticReproduction,  // Constructed
    appearanceTemplate: syntheticAppearance,
    sizeCategory: "medium",
  },
];
```

---

## Species Generation (LLM)

For alien/unique worlds, species can be generated:

```typescript
interface GeneratedSpecies extends Species {
  generatedBy: "llm";
  generationPrompt: string;
  generationSeed: number;
  planetOfOrigin: string;
}

async function generateSpecies(
  planet: Planet,
  niche: string,           // "apex_predator", "hive_builder", etc.
  constraints: SpeciesConstraints
): Promise<GeneratedSpecies> {

  const prompt = `
    Create a sapient species for a ${planet.biome} world.

    Ecological niche: ${niche}
    Planet conditions: ${planet.conditions}

    Define:
    1. Name and description
    2. Biology (body type, diet, senses)
    3. Lifecycle (lifespan, maturation, death)
    4. Reproduction (type, offspring count, parental investment)
    5. Social structure (hive, tribal, solitary, etc.)
    6. Unique needs (what do they psychologically require?)
    7. Innate abilities (3-5 traits)
    8. Aptitudes (what are they good/bad at?)

    Make them feel alien but internally consistent.
  `;

  const response = await llm.complete(prompt);
  return parseGeneratedSpecies(response, planet.id);
}
```

### Incomprehensible Aliens (Presger-style)

Some aliens are truly beyond understanding. They can only be interfaced through modified intermediaries.

```typescript
interface IncomprehensibleSpecies {
  id: string;
  name: string;
  comprehensibility: Comprehensibility;
  interfaceMethod: InterfaceMethod;
  knownBehaviors: ObservedBehavior[];
  dangerLevel: DangerLevel;
}

interface Comprehensibility {
  level: "partial" | "minimal" | "none";

  // What CAN be understood
  observable: string[];           // Things that can be perceived
  predictable: string[];          // Behaviors with patterns

  // What CANNOT
  motivations: "unknown";
  communication: "untranslatable" | "requires_intermediary";
  cognition: "alien";             // Does not think like us

  // Why
  barriers: ComprehensionBarrier[];
}

type ComprehensionBarrier =
  | "different_physics"           // Operate on different physical laws
  | "timescale_mismatch"         // Think too fast/slow to interact
  | "dimensional"                 // Exist partially elsewhere
  | "conceptual"                  // Lack shared concepts
  | "perceptual"                  // Cannot be properly perceived
  | "logical"                     // Different logic systems
  | "emotional"                   // No emotional common ground
  | "intentional";                // Goals are incomprehensible

interface InterfaceMethod {
  type: "translator" | "construct" | "ritual" | "technology" | "none";

  // For translator type (Presger Translators)
  translator?: {
    species: Species;             // Modified species that can interface
    modifications: string[];      // What was changed
    limitations: string[];        // What they still can't convey
    reliability: number;          // 0-1, how accurate
    sanity_cost: number;          // Toll on translator
  };

  // For other types
  requirements?: string[];
  risks?: string[];
}

interface ObservedBehavior {
  trigger: string;                // What seems to cause it
  action: string;                 // What they do
  outcome: string;                // Result
  predictability: number;         // 0-1, how reliable
  interpretation: string;         // Best guess at meaning
}

type DangerLevel =
  | "benevolent"                  // Seem helpful, somehow
  | "indifferent"                 // Don't notice us
  | "capricious"                  // Unpredictable, sometimes harmful
  | "dangerous_unintentionally"   // Harm us without meaning to
  | "hostile"                     // Actively harmful
  | "existential";                // Threat to reality

// Example: Presger-inspired incomprehensible species
const theWatchers: IncomprehensibleSpecies = {
  id: "watchers",
  name: "The Watchers",

  comprehensibility: {
    level: "minimal",
    observable: ["ship_presence", "translator_creation", "treaty_adherence"],
    predictable: ["response_to_treaty_violation"],
    motivations: "unknown",
    communication: "requires_intermediary",
    cognition: "alien",
    barriers: [
      "conceptual",     // Have no concept of individual identity
      "emotional",      // Emotions (if any) are incomprehensible
      "timescale_mismatch", // Think in millennia
    ],
  },

  interfaceMethod: {
    type: "translator",
    translator: {
      species: humanSpecies,      // Humans modified to interface
      modifications: [
        "neural_restructuring",
        "perception_alteration",
        "lifespan_extension",
        "pain_tolerance",
      ],
      limitations: [
        "cannot_convey_full_meaning",
        "often_mistranslate",
        "may_go_mad",
      ],
      reliability: 0.6,
      sanity_cost: 0.3,           // Per significant interaction
    },
  },

  knownBehaviors: [
    {
      trigger: "treaty_signed",
      action: "cessation_of_random_destruction",
      outcome: "peace",
      predictability: 0.95,
      interpretation: "They honor agreements, somehow",
    },
    {
      trigger: "treaty_violation",
      action: "targeted_annihilation",
      outcome: "violator_gone",
      predictability: 0.99,
      interpretation: "Enforcement mechanism",
    },
    {
      trigger: "unknown",
      action: "gifts_of_technology",
      outcome: "advancement",
      predictability: 0.1,
      interpretation: "Possibly cultural exchange? Test?",
    },
  ],

  dangerLevel: "capricious",
};

// Translators as playable/interactable agents
interface TranslatorAgent extends Agent {
  translatorFor: string;          // Incomprehensible species ID
  modifications: TranslatorMod[];
  sanity: number;                 // 0-100, drops with use
  truthfulness: number;           // How accurate their translations are

  // Special abilities
  canCommunicateWith: string[];   // Species they can interface with
  knowledgeFromAlien: string[];   // Things they know but can't explain
}

interface TranslatorMod {
  type: string;
  benefit: string;
  cost: string;
  visible: boolean;               // Can others see the modification?
}

// Gameplay: Translators as NPCs/playable
interface TranslatorGameplay {
  // As NPC
  provides: "alien_knowledge" | "trade_facilitation" | "warnings";
  quirks: string[];               // Odd behaviors from modification
  reliability: number;            // Accuracy of what they say

  // As playable
  uniqueMechanics: {
    alienVisions: boolean;        // See things others can't
    sanityManagement: boolean;    // Must manage mental state
    dualLoyalty: boolean;         // Serve both species
    knowledgeBurden: boolean;     // Know things that hurt to know
  };
}
```

### Geological Timescale Beings (Stone Eaters)

Some beings think on timescales incompatible with normal interaction.

```typescript
interface GeologicalSpecies extends Species {
  timescale: {
    perceptionRatio: number;      // 1 = normal, 1000 = perceives 1000x slower
    conversationLength: number;   // Game-days per sentence
    patienceForFastBeings: number; // 0-1
  };

  interaction: {
    canCommunicate: boolean;
    communicationMethod: "slow_speech" | "written" | "intermediary" | "empathic";
    valuesFastBeings: boolean;    // Do they care about us?
    threats: string[];            // What might make them act
  };
}

const stoneEaters: GeologicalSpecies = {
  id: "stone_eater",
  name: "Stone Eater",
  description: "Crystalline beings who think in geological time",

  timescale: {
    perceptionRatio: 10000,       // 1 human year = 1 hour to them
    conversationLength: 365,      // A year per response
    patienceForFastBeings: 0.1,   // We're like mayflies to them
  },

  interaction: {
    canCommunicate: true,         // Technically possible
    communicationMethod: "written",// Leave messages, wait generations
    valuesFastBeings: false,      // Generally don't notice us
    threats: [
      "mining_their_relatives",
      "geological_disruption",
      "awakening_ancient_ones",
    ],
  },

  // Gameplay implications
  // - Quests span generations
  // - Promises from ancestors may come due
  // - Their anger is slow but inevitable
  // - Knowledge from them is priceless but takes lifetimes
};
```

---

## Alien Psychology

Different species may have fundamentally incompatible psychology - not just different values, but different cognitive structures that make mutual understanding difficult or impossible.

### Cognition Types

```typescript
interface AlienCognition {
  type: CognitionType;
  humanComprehensible: boolean;      // Can humans understand their reasoning?
  translatable: boolean;             // Can their concepts be expressed in human terms?
  predictable: boolean;              // Can humans predict their behavior?
  compatibleWith: CognitionType[];   // Which other cognition types can relate?
}

type CognitionType =
  // Human-adjacent
  | "individual_rational"    // Standard human-like reasoning
  | "emotional_primary"      // Emotions drive logic, not vice versa
  | "intuitive"              // Knows without reasoning

  // Collective
  | "hive_consensus"         // Thinks as group, no individual perspective
  | "swarm_emergent"         // Intelligence emerges from simple units

  // Alien
  | "association_web"        // Thinks in connections, not sequences
  | "pattern_completion"     // Sees everything as patterns to complete
  | "probability_cloud"      // Thinks in simultaneous possibilities
  | "temporal_nonlinear"     // Experiences time non-sequentially
  | "incomprehensible"       // Logic cannot be understood by others

  // Constrained
  | "truth_bound"            // Cannot lie or conceive of lying
  | "honor_bound"            // Actions constrained by obligation structure
  | "instinct_primary";      // Deep instincts override reasoning
```

### Association Psychology (Atevi Man'chi)

Some species have association/loyalty structures that replace friendship entirely.

```typescript
// Atevi-style: Association replaces friendship
interface AssociationPsychology {
  type: "association_web";

  // Man'chi: Loyalty that isn't friendship
  primaryBond: {
    type: "man'chi";
    description: "Instinctive emotional attachment to a leader/association";
    characteristics: {
      notFriendship: true;          // Explicitly not friendship
      notLove: true;                // Not romantic
      hierarchical: true;           // Always knows who they're loyal TO
      unbreakable: boolean;         // Can it be broken?
      transferable: boolean;        // Can it shift to new leader?
      reciprocal: boolean;          // Does leader feel it back?
    };
    absence: {
      effect: "profound_instability";
      duration: "until_new_attachment";
      behaviors: ["seeking", "dangerous_unattachment", "susceptible_to_any_claim"];
    };
  };

  // Concepts that don't exist in their psychology
  incompatibleConcepts: [
    "friendship",                   // No equal bonds
    "democracy",                    // No voting, only following
    "individual_rights",            // Association rights only
    "casual_social",                // All interaction has hierarchy
  ];

  // Unique concepts
  uniqueConcepts: [
    "felicitous_association",       // Proper hierarchical relationship
    "infelicitous_contact",         // Wrong-hierarchy interaction
    "man'chi_crisis",               // Conflicting loyalties
    "aiji_gravity",                 // Leadership attraction
  ];
}

// Example: Atevi-inspired species
const hierarchicalBonders: Species = {
  id: "kethrani",
  name: "Kethrani",
  description: "Tall, formal beings for whom hierarchy IS social bonding",

  psychology: {
    type: "association_web",

    // No friendship - only association
    bonding: {
      primaryType: "man'chi",       // Instinctive loyalty to leader
      secondaryTypes: ["clan", "guild", "oath"],
      noFriendship: true,           // Cannot form equal bonds
      misunderstands: ["human friendship as either fealty or rivalry"],
    },

    // Always need to know hierarchy
    hierarchyNeed: 1.0,             // Maximum - cannot function without
    ambiguityTolerance: 0.0,        // Cannot handle unclear status

    // Consequences of hierarchy violation
    statusViolation: {
      bySubordinate: "profound_insult",
      bySuper: "destabilizing",
      recovery: "formal_apology_ritual",
    },
  },

  // Gameplay implications
  // - Cannot be friends with humans
  // - Can form patron-client or leader-follower bonds
  // - Misread human friendliness as either submission or dominance
  // - Need clear status in every interaction
  // - "Equality" is deeply uncomfortable
};

// Cross-species relationship with incompatible psychology
interface CrossPsychologyRelationship {
  species1: string;
  species2: string;
  compatibility: "none" | "limited" | "translatable" | "full";

  // Misunderstandings
  sp1ThinksSp2Is: string[];
  sp2ThinksSp1Is: string[];

  // Working relationships
  possibleBonds: string[];          // What CAN they form?
  impossibleBonds: string[];        // What will never work?

  // Translation concepts
  nearestEquivalents: Map<string, string>;  // sp1 concept → sp2 nearest
}

const humanKethraniRelationship: CrossPsychologyRelationship = {
  species1: "human",
  species2: "kethrani",
  compatibility: "limited",

  sp1ThinksSp2Is: ["cold", "formal", "hierarchical", "unfriendly"],
  sp2ThinksSp1Is: ["confusing", "unstable", "lacking proper bonds", "dangerous"],

  possibleBonds: [
    "employer_employee",            // Clear hierarchy
    "teacher_student",              // Status difference
    "lord_retainer",                // Feudal analog
  ],
  impossibleBonds: [
    "friends",                      // Kethrani cannot
    "equals",                       // They cannot conceive of it
    "casual_acquaintance",          // All relationships have weight
  ],

  nearestEquivalents: new Map([
    ["friendship", "association_of_equals_status"],  // Still not the same
    ["democracy", "council_of_leaders_with_meta_leader"],
    ["love", "privileged_man'chi"],
  ]),
};
```

---

## Polyphonic Communication

Some species require multiple simultaneous signals to communicate - a single voice speaks nonsense, but two voices together create meaning.

### Dual-Voice Systems

```typescript
interface PolyphonicCommunication extends SpeciesCommunication {
  primary: {
    type: "polyphonic";
    voiceCount: number;              // How many simultaneous voices
    coordination: VoiceCoordination;
    singleVoiceMeaning: SingleVoiceMeaning;
  };
}

interface VoiceCoordination {
  required: "simultaneous" | "overlapping" | "sequential_rapid";
  tolerance: number;                  // Milliseconds of acceptable desync
  relationship: VoiceRelationship;
}

type VoiceRelationship =
  | "harmonic"              // Voices create meaning through harmony
  | "contrapuntal"          // Voices create meaning through contrast
  | "layered"               // Each voice adds meaning layer
  | "confirmatory";         // Second voice confirms/validates first

type SingleVoiceMeaning =
  | "none"                  // Single voice is noise
  | "partial"               // Single voice conveys some meaning
  | "opposite"              // Single voice means opposite
  | "lie"                   // Single voice is inherently false
  | "question";             // Single voice is always interrogative

// Ariekei-style dual voice (Embassytown)
interface AriekeianCommunication {
  primary: {
    type: "polyphonic";
    voiceCount: 2;
    coordination: {
      required: "simultaneous";
      tolerance: 10;                  // Must be within 10ms
      relationship: "harmonic";
    };
    singleVoiceMeaning: "none";       // Single voice is just sound
  };

  // Language-reality coupling
  languageProperties: {
    truthRequired: true;              // Cannot speak false things
    speakingCreatesReality: boolean;  // Does saying make it so?
    hypotheticalsExist: boolean;      // Can they discuss non-real things?
    metaLanguage: boolean;            // Can they talk about language?
  };

  // Learning their language
  foreignSpeakers: {
    possible: "dual_being" | "trained_pair" | "technology" | "impossible";
    requirements?: string[];          // What's needed to speak it
    detected: boolean;                // Can they tell it's not natural?
    trusted: boolean;                 // Do they trust foreign speakers?
  };
}

// Example: Ariekei-inspired dual-voiced species
const embassySpecies: Species = {
  id: "dualvoice",
  name: "Thespeaker",
  pluralName: "Thespeakers",
  description: "Beings who speak with two voices; truth is the only language",

  communication: {
    primary: {
      type: "polyphonic",
      voiceCount: 2,
      coordination: {
        required: "simultaneous",
        tolerance: 5,                 // Very precise required
        relationship: "harmonic",
      },
      singleVoiceMeaning: "none",
    },
    secondary: [],
    canLearnOther: false,             // Cannot speak single-voice languages
  },

  languageReality: {
    truthRequired: true,              // Cannot speak lies
    hypotheticalsExist: false,        // Cannot discuss counterfactuals
    metaphorPossible: false,          // Cannot use figurative language
    fictionPossible: false,           // Cannot tell stories
  },

  // Gameplay
  // - Cannot deceive (but can be silent)
  // - Need "similes" - living metaphors who enact comparisons
  // - Foreign ambassadors must be bonded pairs or symbionts
  // - May be "broken" to understand lying (cultural trauma)
};

// Cross-polyphonic communication
interface CrossVoiceCommunication {
  speakerVoices: number;
  listenerVoices: number;
  compatibility: "full" | "partial" | "none" | "requires_intermediary";
  intermediaryType?: "translator" | "technology" | "gestalt_being" | "bonded_pair";
}

// Who can speak to dual-voice species?
const dualVoiceCommunicators = {
  trill_symbionts: true,              // Two minds, can coordinate
  pack_minds: true,                   // Multiple bodies, can harmonize
  bonded_pairs: true,                 // Trained human pairs
  ai_systems: true,                   // Can generate both voices
  individuals: false,                 // Cannot produce dual voice
};
```

---

## Temporal Experience

Beings may experience time fundamentally differently.

```typescript
interface TemporalExperience {
  type: TemporalType;
  subjective: SubjectiveTime;
  interaction: TemporalInteraction;
}

type TemporalType =
  | "linear_standard"        // Experiences time like humans
  | "accelerated"            // Thinks faster (AI, small creatures)
  | "decelerated"            // Thinks slower (geological beings)
  | "cyclical"               // Experiences time as repeating
  | "simultaneous"           // Experiences multiple moments at once
  | "nonlinear_aware"        // Knows past and future
  | "moment_bound";          // No sense of past/future

interface SubjectiveTime {
  thoughtSpeed: number;             // Multiplier vs human baseline
  attentionSpan: { min: number; max: number };  // In subjective minutes
  planningHorizon: number;          // How far ahead they think (days)
  memoryTimeframe: number;          // How far back matters (days)
}

interface TemporalInteraction {
  canCommunicateWith: TemporalType[];
  communicationDelay: number;       // Base time per message exchange
  urgencyThreshold: number;         // Events faster than this go unnoticed
  fastEventsAppear: "blur" | "invisible" | "noise";
  slowEventsAppear?: "static" | "imperceptible" | "landscape";
}

// Example: Mayfly-fast cognition
const swiftThought: TemporalExperience = {
  type: "accelerated",
  subjective: {
    thoughtSpeed: 1000,             // 1000x faster than human
    attentionSpan: { min: 0.001, max: 1 },  // Milliseconds to seconds
    planningHorizon: 0.1,           // Hours ahead
    memoryTimeframe: 1,             // Day at most
  },
  interaction: {
    canCommunicateWith: ["accelerated"],  // Only fast species
    communicationDelay: 0.001,
    urgencyThreshold: 0.0001,       // Everything is urgent
    fastEventsAppear: "normal",
    slowEventsAppear: "static",     // Slow things seem frozen
  },
};

// Relationship between temporal experiences
interface TemporalRelationship {
  species1Tempo: TemporalType;
  species2Tempo: TemporalType;
  interaction: "impossible" | "difficult" | "possible" | "natural";
  bridgingMethod?: "technology" | "intermediary" | "patience" | "time_compression";
  relationshipTypes: string[];      // What relationships can form?
}

const geologicalHumanRelation: TemporalRelationship = {
  species1Tempo: "decelerated",     // Stone Eaters
  species2Tempo: "linear_standard", // Humans
  interaction: "difficult",
  bridgingMethod: "patience",       // Generational projects

  relationshipTypes: [
    "civilizational_alliance",      // Between peoples, not individuals
    "inherited_bond",               // Passed down through generations
    "written_correspondence",       // Letters across centuries
  ],
};
```

---

## Summary

| Aspect | Varies By Species |
|--------|-------------------|
| **Lifespan** | 40 years (goblin) to 800 years (elf) to immortal |
| **Maturity** | 6 years (goblin) to 100 years (elf) |
| **Reproduction** | Live birth, eggs, budding, three-sex, constructed |
| **Offspring** | 1 (elf) to 50 (insectoid) per birth |
| **Parental Care** | None to biparental to triad to communal |
| **Pair Bonding** | 0% (goblin) to 95% (elf) |
| **Consciousness** | Individual, pack mind, hive mind, networked, symbiont |
| **Communication** | Verbal, chromatic, pheromonal, polyphonic, telepathic |
| **Psychology** | Friendship-based, man'chi/association, hive-loyalty |
| **Temporal** | Millisecond (AI) to geological (Stone Eaters) |
| **Comprehensibility** | Familiar to completely incomprehensible |
| **Needs** | Unique psychological needs per species |
| **Aptitudes** | Innate skill bonuses/penalties |

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Agent uses species template
- `agent-system/needs.md` - Species modifies need weights
- `agent-system/lifecycle-system.md` - Species defines lifespan/stages

**Social Systems:**
- `agent-system/culture-system.md` - Culture builds on species biology
- `agent-system/relationship-system.md` - Pair bonding affects relationships

**World Systems:**
- `universe-system/spec.md` - Universe type determines available species
- `world-system/abstraction-layers.md` - Species at civilizational scale

**Feasibility:**
- `consciousness-implementation-phases.md` - Which consciousness types ship when
- `FEASIBILITY_REVIEW.md` - Technical analysis of alien features
