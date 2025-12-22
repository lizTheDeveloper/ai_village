# Species Encyclopedia UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The Species Encyclopedia provides players with a comprehensive reference for all sapient species encountered in their universe. This includes biology, lifecycle, consciousness types, communication modes, and inter-species interaction guides.

**Core purpose:**
> "Understanding alien minds is the first step to coexistence"

The encyclopedia helps players:
- Understand species they encounter
- Learn how to communicate with different consciousness types
- Navigate inter-species relationships
- Discover what makes each species unique

---

## Dependencies

- `agent-system/species-system.md` - Species definitions, consciousness types
- `agent-system/culture-system.md` - Culture builds on species biology
- `universe-system/spec.md` - Universe types and available species

---

## Requirements

### REQ-SPEC-001: Species Browser

Main panel for browsing and searching species.

```typescript
// Re-export from agent-system/species-system for reference
import type {
  Species, SpeciesBiology, SpeciesLifecycle, SpeciesNeeds,
  ConsciousnessType, MindType,
  SpeciesCommunication, CommunicationType,
  ReproductionStrategy, ReproductionType,
  InnateTrait, SpeciesUniqueNeed,
  SizeCategory, UniverseType
} from "agent-system/species-system";

interface SpeciesBrowser {
  isOpen: boolean;

  // Available species
  knownSpecies: Species[];            // Species player has encountered
  allSpecies: Species[];              // All species (for codex mode)
  selectedSpecies: Species | null;

  // Discovery state
  discoveryMode: "encountered_only" | "codex";  // Show all or just known?
  encounteredIds: Set<string>;

  // Filtering
  filterByUniverse: UniverseType | null;
  filterByConsciousness: MindType | null;
  filterBySize: SizeCategory | null;
  searchQuery: string;

  // Sorting
  sortBy: SpeciesSortOption;

  // View mode
  viewMode: "grid" | "list";
}

type SpeciesSortOption =
  | "name"
  | "lifespan"
  | "size"
  | "complexity"           // Consciousness complexity
  | "discovered";          // When first encountered
```

**Species Browser Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📖 SPECIES ENCYCLOPEDIA                                 [🔍 Search] [X]   │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ FILTERS       │  KNOWN SPECIES (12)                      [Sort: Name ▼]    │
│               │                                                             │
│ UNIVERSE      │  ┌─────────────────────────────────────────────────────┐   │
│ ○ All         │  │  [Portrait]  HUMAN                                  │   │
│ ● Fantasy     │  │              Adaptable, short-lived, ambitious      │   │
│ ○ Sci-Fi      │  │              Individual Mind | Medium | 70-100 yrs  │   │
│               │  │                                        [View →]     │   │
│ CONSCIOUSNESS │  └─────────────────────────────────────────────────────┘   │
│ ○ All         │                                                             │
│ ○ Individual  │  ┌─────────────────────────────────────────────────────┐   │
│ ● Pack Mind   │  │  [Portrait]  ELF                                    │   │
│ ○ Hive Mind   │  │              Long-lived, graceful, nature-attuned   │   │
│ ○ Networked   │  │              Individual Mind | Medium | 600-800 yrs │   │
│               │  │                                        [View →]     │   │
│ SIZE          │  └─────────────────────────────────────────────────────┘   │
│ □ Tiny        │                                                             │
│ ☑ Small       │  ┌─────────────────────────────────────────────────────┐   │
│ ☑ Medium      │  │  [Portrait]  CHORUS                    🔒 Locked    │   │
│ ☑ Large       │  │              Wolf-like pack minds (4-8 bodies)      │   │
│ □ Huge        │  │              Pack Mind | Medium | 40-60 yrs         │   │
│               │  │              Encounter this species to unlock      │   │
│               │  └─────────────────────────────────────────────────────┘   │
│               │                                                             │
├───────────────┴─────────────────────────────────────────────────────────────┤
│  Discovered: 8/12 species                          [Show All: Codex Mode]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SPEC-002: Species Detail View

Comprehensive view of a single species.

```typescript
// SpeciesDisplay wraps Species with UI-specific display properties
interface SpeciesDisplay {
  species: Species;                    // From species-system

  // Tabs
  activeTab: SpeciesTab;

  // Discovery state
  discoveryLevel: DiscoveryLevel;      // How much player knows
  observationsCount: number;
  notesCount: number;

  // Player notes
  playerNotes: string;
}

type SpeciesTab =
  | "overview"
  | "biology"
  | "lifecycle"
  | "consciousness"
  | "communication"
  | "society"
  | "interactions";

type DiscoveryLevel =
  | "unknown"            // Only name/silhouette
  | "observed"           // Basic info
  | "studied"            // Full details
  | "expert";            // All secrets revealed
```

**Species Detail Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ◀ Back                                                              [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────┐                                                          │
│  │               │   ELF                                                    │
│  │   [Portrait]  │   "Long-lived, graceful, nature-attuned"                │
│  │               │                                                          │
│  │               │   ▸ Available In: Fantasy                               │
│  └───────────────┘   ▸ Size: Medium                                        │
│                       ▸ Lifespan: 600-800 years                            │
│                       ▸ Consciousness: Individual                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Overview] [Biology] [Lifecycle] [Consciousness] [Communication] [Society]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OVERVIEW                                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Elves are an ancient species with deep connections to the natural world.  │
│  Their long lifespan shapes their perspective - they think in centuries    │
│  and form bonds that last generations.                                      │
│                                                                             │
│  INNATE TRAITS                                                              │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐      │
│  │ 👁️ Keen Senses     │ │ 🌿 Nature Affinity │ │ ⚠️ Iron Sensitivity│      │
│  │ Enhanced sight &   │ │ Innate connection  │ │ Cold iron causes   │      │
│  │ hearing            │ │ to natural world   │ │ discomfort         │      │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘      │
│                                                                             │
│  APTITUDES                                                                  │
│  ████████████░░░░░░░░ Farming (+20)                                        │
│  ██████████░░░░░░░░░░ Crafting (+15)                                       │
│  ████████░░░░░░░░░░░░ Research (+10)                                       │
│  ░░░░░░░░░░░░░░░░░░░░ Construction (-10)                                   │
│  ░░░░░░░░░░░░░░░░░░░░ Mining (-20)                                         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  📝 Your Notes: [Add observation...]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SPEC-003: Biology Panel

Display species biological characteristics.

```typescript
// BiologyDisplay wraps SpeciesBiology with display info
interface BiologyDisplay {
  biology: SpeciesBiology;              // From species-system

  // Size visualization
  sizeComparison: SizeComparisonDisplay;

  // Diet visualization
  dietInfo: DietDisplay;

  // Senses visualization
  sensesRadar: SensesRadarDisplay;

  // Special biology highlights
  specialBiologyCards: SpecialBiologyCard[];
}

interface SizeComparisonDisplay {
  species: string;
  height: { min: number; max: number };
  weight: { min: number; max: number };
  comparisonTo: string;                 // "Human" as baseline
  scale: number;                        // Visual scale factor
}

interface DietDisplay {
  diet: Diet;                           // From species-system
  icon: Sprite;
  description: string;
  compatibleFoods: string[];
  incompatibleFoods: string[];
}

interface SensesRadarDisplay {
  // Normalized 0-1 values for radar chart
  vision: number;
  hearing: number;
  smell: number;
  touch: number;
  specialSenses: SpecialSenseDisplay[];
}

interface SpecialSenseDisplay {
  name: string;                         // "Darkvision", "Stonecunning"
  range: number;
  description: string;
}

interface SpecialBiologyCard {
  biology: SpecialBiology;              // From species-system
  name: string;
  icon: Sprite;
  description: string;
  gameplayEffect: string;
}
```

**Biology Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BIOLOGY                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHYSICAL CHARACTERISTICS                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Height: 160-190 cm        ┌─────────────────────────┐                      │
│  Weight: 50-70 kg          │  Size Comparison        │                      │
│  Body Type: Humanoid       │   🧝 < 🧑 < 🧌         │                      │
│                            │  Elf  Human  Orc        │                      │
│                            └─────────────────────────┘                      │
│                                                                             │
│  SUSTENANCE                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Diet: Herbivore (prefers)       Sleep: Diurnal                            │
│  🥗 Plants, fruits, nuts         💤 6 hours/night                          │
│  ❌ Rarely eats meat             ☀️ Active during day                       │
│                                                                             │
│  SENSES                          ENVIRONMENT                                │
│  ─────────────────────           ─────────────────────                      │
│       Vision                     Preferred: Forest, Meadow                  │
│         ████                     Temperature: 15-25°C                       │
│  Hear ██│██ Smell                Humidity: Moderate                         │
│         ██                       Light: Moderate-High                       │
│       Touch                                                                 │
│                                                                             │
│  SPECIAL BIOLOGY                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ✨ Magical Affinity                                                  │  │
│  │  Elves have an innate connection to magical energies, granting       │  │
│  │  +15% effectiveness to nature-based abilities.                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SPEC-004: Lifecycle Panel

Display species lifecycle stages and reproduction.

```typescript
// LifecycleDisplay wraps SpeciesLifecycle with visualization
interface LifecycleDisplay {
  lifecycle: SpeciesLifecycle;          // From species-system
  reproduction: ReproductionStrategy;   // From species-system

  // Stage timeline visualization
  stages: LifeStageDisplay[];
  currentStageHighlight: string | null; // For specific individual

  // Reproduction info
  reproductionInfo: ReproductionDisplay;

  // Comparison mode
  comparisonSpecies: string | null;
}

interface LifeStageDisplay {
  stage: LifeStageDefinition;           // From species-system
  icon: Sprite;
  color: Color;
  percentOfLifespan: number;
  description: string;
  characteristics: string[];
}

interface ReproductionDisplay {
  strategy: ReproductionStrategy;       // From species-system
  summary: string;

  // Key stats
  fertilityWindow: string;              // "Age 100-400"
  typicalOffspring: string;             // "1 (rarely 2)"
  gestationPeriod: string;              // "2 years"
  parentalCare: string;                 // "Biparental, intensive"

  // Multi-sex display if applicable
  sexes?: SexDisplay[];
}

interface SexDisplay {
  id: string;
  name: string;
  role: string;                         // "Bearer", "Sire", "Mixer"
  ratio: string;                        // "35%"
  description: string;
}
```

**Lifecycle Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LIFECYCLE                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LIFE STAGES                                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌──────┬────────────┬─────────────────────────────┬──────────────────────┐ │
│  │Seed- │  Sapling   │          Mature             │       Ancient       │ │
│  │ling  │  20-100    │         100-500             │       500-800       │ │
│  │0-20  │            │                             │                     │ │
│  └──────┴────────────┴─────────────────────────────┴──────────────────────┘ │
│                  ↑                                                          │
│           First Blossoming                                                  │
│           (Coming of Age)                                                   │
│                                                                             │
│  Maturity Age: 100 years                                                    │
│  Elder Age: 500 years                                                       │
│  Maximum Age: 800 years                                                     │
│  Aging Curve: Back-loaded (ages slowly, then rapidly at end)               │
│  Death: Transcendence (becomes one with forest)                            │
│                                                                             │
│  REPRODUCTION                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Type: Sexual, Viviparous (live birth)                                      │
│  Fertility Window: Age 100-400                                              │
│  Conception Chance: 5% (very low)                                           │
│  Cooldown: 10 years between possible conceptions                           │
│  Lifetime Limit: Rarely more than 3 children                               │
│                                                                             │
│  Gestation: 2 years (internal)                                              │
│  Typical Offspring: 1 (twins rare)                                          │
│  Independence: Dependent (requires care for decades)                        │
│                                                                             │
│  Pair Bonding: 95% (mate for life)                                          │
│  Parental Investment: Biparental (both parents deeply involved)            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SPEC-005: Consciousness Panel

Display consciousness types and mind structures.

```typescript
// ConsciousnessDisplay for complex mind types
interface ConsciousnessDisplay {
  consciousness: ConsciousnessType;     // From species-system

  // Type-specific displays
  packMindDisplay?: PackMindDisplay;
  hiveMindDisplay?: HiveMindDisplay;
  networkedDisplay?: NetworkedDisplay;
  symbiontDisplay?: SymbiontDisplay;

  // Visualization
  mindDiagram: MindDiagramConfig;

  // Interaction guide
  interactionNotes: string[];
}

// Display for pack minds (Tines-style)
interface PackMindDisplay {
  minBodies: number;
  maxBodies: number;
  optimalSize: number;
  coherenceRange: number;
  bodyRoles: PackBodyRoleDisplay[];
  splitMerge: SplitMergeInfo;
}

interface PackBodyRoleDisplay {
  role: string;                         // "Thinker", "Sensor", etc.
  icon: Sprite;
  cognitiveContribution: number;
  description: string;
}

interface SplitMergeInfo {
  canSplit: boolean;
  canMerge: boolean;
  splitEffect: string;
  bodyDeathEffect: string;
}

// Display for hive minds
interface HiveMindDisplay {
  queenRequired: boolean;
  workerAgency: string;
  hiveRange: number | "unlimited";
  castes: CasteDisplay[];
}

interface CasteDisplay {
  name: string;
  icon: Sprite;
  ratio: string;
  agency: string;
  role: string;
  lifespan: string;
}

// Display for networked consciousness
interface NetworkedDisplay {
  networkType: string;
  sharingDepth: string;
  connectionRequired: boolean;
  isolationEffects: string[];
}

// Display for symbiont pairs
interface SymbiontDisplay {
  hostSpecies: string;
  symbiontSpecies: string;
  dominance: string;
  memoryAccess: string;
  separationSurvival: string;
  hostCount: number;                    // How many past hosts accessible
}
```

**Consciousness Panel (Pack Mind Example):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONSCIOUSNESS                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MIND TYPE: PACK MIND                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  "Multiple bodies form ONE sapient consciousness. Each body is             │
│   non-sapient alone - only together do they think."                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │      🐺        🐺        🐺        🐺        🐺                     │   │
│  │      │         │         │         │         │                      │   │
│  │      └────────┬┴─────────┴────────┬┴─────────┘                      │   │
│  │               │                   │                                 │   │
│  │               └─────────┬─────────┘                                 │   │
│  │                         │                                           │   │
│  │                    [🧠 ONE MIND]                                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PACK COMPOSITION                                                           │
│  Minimum Bodies: 3 (below this, degrades to animal)                         │
│  Maximum Bodies: 8 (above this, cacophony/incoherence)                      │
│  Optimal Size: 5 bodies                                                     │
│  Coherence Range: 10 meters (beyond this, thoughts blur)                    │
│                                                                             │
│  BODY ROLES                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 🧠 Thinker  │ │ 👁️ Sensor   │ │ 🖐️ Manipulat│ │ 📚 Memory   │          │
│  │ 30% cogn.   │ │ 20% cogn.   │ │ 15% cogn.   │ │ 20% cogn.   │          │
│  │ Core reason │ │ Keen senses │ │ Fine motor  │ │ Stores exp. │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                                             │
│  DYNAMICS                                                                   │
│  • Can Split: Yes (traumatic, creates two different individuals)           │
│  • Can Merge: No (would create unstable mind)                               │
│  • Body Death: Pack diminished, loses capability                           │
│  • New Member: Integration takes 30 days, causes personality shift         │
│                                                                             │
│  ⚠️ INTERACTION NOTES                                                       │
│  • Other species may not realize they're one being                         │
│  • Flank themselves in combat (advantage)                                   │
│  • Damage to one body affects the whole mind                               │
│  • Relationships are pack-to-pack, not individual                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SPEC-006: Communication Panel

Display species communication modes and cross-species interaction.

```typescript
// CommunicationDisplay for species communication
interface CommunicationDisplay {
  communication: SpeciesCommunication;  // From species-system

  // Primary mode details
  primaryModeDetail: CommunicationModeDetail;

  // Secondary modes
  secondaryModes: CommunicationModeDetail[];

  // Cross-species communication
  crossSpeciesGuide: CrossSpeciesGuide;

  // Special communication types
  polyphonicInfo?: PolyphonicCommunicationInfo;
}

interface CommunicationModeDetail {
  mode: CommunicationMode;              // From species-system
  icon: Sprite;
  description: string;
  examples: string[];
  limitations: string[];
}

interface CrossSpeciesGuide {
  canLearnOther: boolean;
  compatibleWith: string[];             // Species that can communicate
  incompatibleWith: string[];
  bridgingMethods: BridgingMethod[];
}

interface BridgingMethod {
  method: string;                       // "Translator", "Technology", etc.
  effectiveness: number;
  requirements: string[];
}

interface PolyphonicCommunicationInfo {
  voiceCount: number;
  coordination: string;
  singleVoiceMeaning: string;
  languageProperties: LanguagePropertyDisplay[];
}

interface LanguagePropertyDisplay {
  property: string;
  value: boolean;
  implication: string;
}
```

**Communication Panel (Chromatic Communication):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMUNICATION                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRIMARY: CHROMATIC (Skin Color Changes)                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Range: 20 meters (visual range)                                            │
│  Speed: Instant                                                             │
│  Privacy: Public (anyone watching can see)                                  │
│  Bandwidth: High (complex color patterns)                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔵 Calm    🟢 Agreement    🟡 Curiosity    🟠 Concern    🔴 Alarm │   │
│  │  Rippling patterns indicate complex thoughts and emotions          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  CHARACTERISTICS                                                            │
│  • Cannot easily lie - emotions show involuntarily on skin                 │
│  • Cannot communicate in complete darkness                                  │
│  • Strong emotions cause involuntary broadcasting                          │
│  • Written language must be color-based                                     │
│                                                                             │
│  SECONDARY: Pheromonal                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Range: 5 meters | Speed: Slow | Basic emotions only                       │
│                                                                             │
│  CROSS-SPECIES COMMUNICATION                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Can Learn Other Languages: Yes (verbal languages)                          │
│                                                                             │
│  ✓ Compatible: Humans (can learn to read colors)                           │
│  ✓ Compatible: Elves (keen senses help interpret)                          │
│  ⚠️ Difficult: Color-blind species                                         │
│  ✗ Incompatible: Species that can't perceive light                         │
│                                                                             │
│  BRIDGING METHODS                                                           │
│  • Translation Device: Converts color patterns to speech (70% accurate)    │
│  • Trained Interpreter: Human who learned color-reading (85% accurate)     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SPEC-007: Incomprehensible Species Display

Special display for truly alien species.

```typescript
// Display for incomprehensible aliens
interface IncomprehensibleDisplay {
  species: IncomprehensibleSpecies;     // From species-system

  // What is known
  knownInfo: KnownIncomprehensibleInfo;

  // Comprehension barriers
  barriers: ComprehensionBarrierDisplay[];

  // Interface methods
  interfaceInfo: InterfaceMethodDisplay;

  // Observed behaviors
  observedBehaviors: ObservedBehaviorDisplay[];

  // Danger assessment
  dangerInfo: DangerDisplay;
}

interface KnownIncomprehensibleInfo {
  observable: string[];
  predictable: string[];
  unknowable: string[];
}

interface ComprehensionBarrierDisplay {
  barrier: ComprehensionBarrier;        // From species-system
  icon: Sprite;
  description: string;
  implication: string;
}

interface InterfaceMethodDisplay {
  type: string;
  available: boolean;
  requirements: string[];
  risks: string[];
  translatorInfo?: TranslatorDisplay;
}

interface TranslatorDisplay {
  modifiedSpecies: string;
  reliability: number;
  sanityCost: number;
  limitations: string[];
}

interface ObservedBehaviorDisplay {
  behavior: ObservedBehavior;           // From species-system
  reliabilityIndicator: string;         // "Reliable", "Sometimes", "Rare"
}

interface DangerDisplay {
  level: DangerLevel;                   // From species-system
  icon: Sprite;
  description: string;
  recommendations: string[];
}
```

**Incomprehensible Species Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ THE WATCHERS                                    [Comprehensibility: ░░░]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  "Their motivations, communication, and cognition are fundamentally        │
│   incomprehensible to humanoid minds."                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                          [? ? ?]                                    │   │
│  │                     (form unknown)                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WHAT WE CAN OBSERVE                                                        │
│  • Ship presence (massive, silent vessels)                                  │
│  • Translator creation (modified humanoids who can interface)              │
│  • Treaty adherence (they honor agreements... somehow)                     │
│                                                                             │
│  COMPREHENSION BARRIERS                                                     │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                  │
│  │ 🔮 Conceptual  │ │ 💭 Emotional   │ │ ⏳ Timescale   │                  │
│  │ No shared     │ │ No emotional   │ │ Think in       │                  │
│  │ concepts of   │ │ common ground  │ │ millennia      │                  │
│  │ individuality │ │                │ │                │                  │
│  └────────────────┘ └────────────────┘ └────────────────┘                  │
│                                                                             │
│  INTERFACE METHOD: Translators                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Modified humans who can communicate (imperfectly) with The Watchers       │
│                                                                             │
│  Reliability: 60%    ⚠️ Translators may go mad                             │
│  Limitations: Cannot convey full meaning, often mistranslate               │
│                                                                             │
│  OBSERVED BEHAVIORS                      DANGER LEVEL                       │
│  ├─ Treaty signed → Peace        (95%)   ┌────────────────────────────┐   │
│  ├─ Treaty violated → Annihilation (99%) │ ⚡ CAPRICIOUS              │   │
│  └─ Unknown → Technology gifts   (10%)   │ Unpredictable, sometimes  │   │
│                                          │ harmful, sometimes helpful │   │
│                                          └────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SPEC-008: Species Comparison

Compare two species side-by-side.

```typescript
interface SpeciesComparison {
  species1: Species;
  species2: Species;

  // Comparison categories
  comparisonAreas: ComparisonArea[];

  // Cross-species relationship info
  relationshipGuide: CrossSpeciesRelationshipGuide;
}

interface ComparisonArea {
  category: string;
  species1Value: string;
  species2Value: string;
  compatibility: "compatible" | "neutral" | "incompatible";
}

interface CrossSpeciesRelationshipGuide {
  possibleBonds: string[];
  impossibleBonds: string[];
  misunderstandings: MisunderstandingGuide[];
  bestPractices: string[];
}

interface MisunderstandingGuide {
  species1Thinks: string;
  species2Thinks: string;
  reality: string;
  howToAvoid: string;
}
```

---

## Keyboard Shortcuts

```
ENCYCLOPEDIA CONTROLS:
- K              : Open species encyclopedia
- Escape         : Close/back
- ↑/↓            : Navigate species list
- Enter          : View selected species
- ←/→            : Navigate tabs
- C              : Compare mode (select two species)
- F              : Search/filter
- N              : Add note to current species
```

---

## State Management

### Species System Integration

```typescript
interface SpeciesEncyclopediaState {
  // View state
  isOpen: boolean;
  selectedSpeciesId: string | null;
  activeTab: SpeciesTab;
  comparisonMode: boolean;

  // Discovery tracking
  encounteredSpecies: Set<string>;
  studyLevel: Map<string, DiscoveryLevel>;

  // Player notes
  playerNotes: Map<string, string>;

  // Events
  onSpeciesEncountered: Event<Species>;
  onStudyLevelIncreased: Event<{ speciesId: string; newLevel: DiscoveryLevel }>;
}
```

---

## Visual Style

```typescript
interface SpeciesEncyclopediaStyle {
  // Species cards
  cardBackground: Color;
  lockedOverlay: Color;

  // Consciousness diagrams
  packMindConnections: Color;
  hiveMindLines: Color;
  networkLinks: Color;

  // Danger indicators
  dangerColors: Map<DangerLevel, Color>;

  // Comprehension meter
  comprehensibleColor: Color;
  incomprehensibleColor: Color;

  // 8-bit styling
  pixelScale: number;
}
```

---

## Open Questions

1. Should players be able to create field notes during species encounters?
2. Species bestiary achievements/collection tracking?
3. Audio pronunciation guide for species names?
4. In-game "xenobiology" skill that unlocks more encyclopedia details?
5. Community-submitted species for custom universes?

---

## Related Specs

- `agent-system/species-system.md` - Source system spec
- `agent-system/culture-system.md` - Culture built on species
- `universe-system/spec.md` - Available species by universe
- `ui-system/agent-roster.md` - View individual agents
