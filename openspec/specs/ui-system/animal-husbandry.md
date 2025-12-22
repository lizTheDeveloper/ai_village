# Animal Husbandry UI Specification

## Overview

The Animal Husbandry UI provides management interfaces for domesticated animals including livestock tracking, breeding management, training, and care scheduling. Features animal roster, enclosure management, and breeding pair visualization.

## Version

0.1.0

## Dependencies

- `animal-system/spec.md` - Animal mechanics (Animal, AnimalSpecies, AnimalProduct, LifeStage, AnimalState, AnimalMood, TrainedBehavior)
- `farming-system/spec.md` - Integration with farming
- `ui-system/notifications.md` - Animal alerts

## Requirements

### REQ-ANIMAL-001: Animal Roster Panel
- **Description**: List of all domesticated animals
- **Priority**: MUST

```typescript
// Re-export from animal-system for reference
import type {
  Animal, AnimalSpecies, AnimalProduct, AnimalGenetics,
  LifeStage, AnimalState, AnimalMood, AnimalPersonality,
  TrainedBehavior, BondSystem, BreedingSystem, WorkingAnimal
} from "animal-system/spec";

// Animal from animal-system/spec.md:
// - id, speciesId, name?, position
// - age, lifeStage, health, size
// - state: AnimalState, hunger, thirst, energy, stress, mood: AnimalMood
// - wild, ownerId?, bondLevel, trustLevel
// - sex, fertile, pregnant, pregnancyProgress?, offspring[]
// - genetics, generation, personality, trainedBehaviors[], fears[], preferences[]

interface AnimalRosterPanel {
  isOpen: boolean;

  // Animals - display wrappers around Animal from animal-system
  animals: AnimalRosterEntry[];
  totalCount: number;

  // Filtering
  filterBySpecies: string | null;
  filterByEnclosure: string | null;
  filterByLifeStage: LifeStage | null;  // Uses LifeStage from animal-system
  filterByState: AnimalState | null;    // Uses AnimalState from animal-system
  searchQuery: string;

  // Sorting
  sortBy: AnimalSortOption;
  sortDirection: "asc" | "desc";

  // Selection
  selectedAnimal: AnimalRosterEntry | null;

  // Methods
  open(): void;
  close(): void;
  selectAnimal(animalId: string): void;
  focusOnAnimal(animalId: string): void;

  render(ctx: CanvasRenderingContext2D): void;
}

// UI display wrapper for Animal from animal-system
interface AnimalRosterEntry {
  // From animal-system
  animal: Animal;

  // Resolved species info
  species: AnimalSpecies;

  // UI display properties
  icon: Sprite;
  displayName: string;         // animal.name || species.name

  // From Animal in animal-system
  age: number;                 // animal.age
  lifeStage: LifeStage;        // animal.lifeStage
  health: number;              // animal.health
  mood: AnimalMood;            // animal.mood
  hunger: number;              // animal.hunger

  // Computed display status
  displayStatus: AnimalDisplayStatus;
  currentActivityDescription: string;  // From animal.state
  locationDescription: string;         // Enclosure name

  // Production computed from AnimalSpecies.products
  productionReady: boolean;
  lastProduction: GameTime | null;
  nextProductionEstimate: GameTime | null;

  // Breeding from Animal
  isFertile: boolean;          // animal.fertile
  isPregnant: boolean;         // animal.pregnant
  pregnancyProgress: number | null;  // animal.pregnancyProgress

  // Bond info
  bondLevel: number;           // animal.bondLevel
  bondDescription: string;     // "wary", "accepting", "friendly", etc. from BondSystem
}

// UI-specific status derived from Animal state
type AnimalDisplayStatus =
  | "healthy"
  | "hungry"         // hunger > threshold
  | "thirsty"        // thirst > threshold
  | "stressed"       // stress > threshold
  | "sick"           // health < threshold
  | "injured"
  | "pregnant"       // pregnant === true
  | "nursing"
  | "infant"         // lifeStage === "infant"
  | "elder";         // lifeStage === "elder"

type AnimalSortOption =
  | "name"
  | "species"
  | "age"
  | "health"
  | "bondLevel"
  | "production";
```

### REQ-ANIMAL-002: Animal Details Panel
- **Description**: Detailed view of individual animal
- **Priority**: MUST

```typescript
// Uses Animal, AnimalSpecies, AnimalGenetics, AnimalPersonality, TrainedBehavior
// from animal-system/spec.md

interface AnimalDetailsPanel {
  animal: AnimalRosterEntry | null;
  isOpen: boolean;

  // Sections
  showStats: boolean;
  showProduction: boolean;
  showBreeding: boolean;
  showTraining: boolean;
  showHistory: boolean;

  // Methods
  openForAnimal(animalId: string): void;
  close(): void;
}

// Display wrapper for animal stats
interface AnimalStatsDisplay {
  // From Animal in animal-system
  animal: Animal;
  species: AnimalSpecies;

  // Identity
  displayName: string;
  speciesName: string;
  sex: "male" | "female" | "hermaphrodite" | "asexual";  // From animal.sex
  age: number;
  lifeStage: LifeStage;
  generation: number;           // animal.generation

  // Health from animal
  health: number;               // animal.health
  conditions: HealthConditionDisplay[];

  // Needs from animal
  hunger: number;               // animal.hunger
  thirst: number;               // animal.thirst
  energy: number;               // animal.energy
  stress: number;               // animal.stress
  mood: AnimalMood;             // animal.mood

  // Personality from animal.personality
  personality: AnimalPersonality;

  // Genetics from animal.genetics
  genetics: AnimalGenetics;
  geneticValueDisplay: string;

  // Bond
  bondLevel: number;            // animal.bondLevel
  trustLevel: number;           // animal.trustLevel
}

interface HealthConditionDisplay {
  name: string;
  severity: "minor" | "moderate" | "severe";
  duration: number | null;
  treatment: string | null;
}

// Display for animal.personality and animal.fears/preferences
interface AnimalPersonalityDisplay {
  personality: AnimalPersonality;  // From animal-system
  displayTraits: AnimalTraitDisplay[];
  fears: string[];                 // From animal.fears
  preferences: string[];           // From animal.preferences
}

interface AnimalTraitDisplay {
  id: string;
  name: string;
  description: string;
  impact: "positive" | "neutral" | "negative";
  isHereditary: boolean;
}

interface AnimalHistoryDisplay {
  events: AnimalEventDisplay[];

  // Lineage from animal
  parentIds: string[];           // From breeding history
  offspring: string[];           // From animal.offspring
  generation: number;            // From animal.generation
}

interface AnimalEventDisplay {
  type: AnimalEventType;
  date: GameTime;
  description: string;
  icon: Sprite;
}

type AnimalEventType =
  | "birth"
  | "weaned"
  | "matured"           // lifeStage changed to "adult"
  | "bred"
  | "gave_birth"
  | "sick"
  | "recovered"
  | "produced"          // AnimalProduct was produced
  | "trained"           // TrainedBehavior added
  | "transferred"
  | "tamed";            // wild changed to false
```

### REQ-ANIMAL-003: Enclosure Management
- **Description**: Manage animal housing areas
- **Priority**: MUST

```typescript
interface EnclosureManagement {
  enclosures: Enclosure[];

  // Selection
  selectedEnclosure: Enclosure | null;

  // Methods
  selectEnclosure(enclosureId: string): void;
  createEnclosure(bounds: Rect): Enclosure;
  renameEnclosure(enclosureId: string, name: string): void;
  deleteEnclosure(enclosureId: string): void;
}

interface Enclosure {
  id: string;
  name: string;
  bounds: Rect;

  // Capacity
  currentOccupants: number;
  maxCapacity: number;
  capacityBySpecies: Map<string, number>;

  // Animals
  animals: string[];

  // Facilities
  hasShelter: boolean;
  hasWaterSource: boolean;
  hasFeedingArea: boolean;
  hasBreedingArea: boolean;

  // Status
  condition: EnclosureCondition;
  cleanliness: number;         // 0-100
  foodLevel: number;           // 0-100
  waterLevel: number;          // 0-100

  // Workers
  assignedCaretakers: string[];
}

type EnclosureCondition =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "critical";

interface EnclosureOverview {
  enclosure: Enclosure;

  // Quick stats
  animalCount: number;
  speciesBreakdown: Map<string, number>;
  healthAverage: number;
  productionStatus: string;

  // Alerts
  alerts: EnclosureAlert[];
}

interface EnclosureAlert {
  type: "food" | "water" | "cleanliness" | "capacity" | "health";
  severity: "warning" | "critical";
  message: string;
}
```

### REQ-ANIMAL-004: Breeding Management
- **Description**: Control animal breeding
- **Priority**: SHOULD

```typescript
interface BreedingManagement {
  // Breeding pairs
  activePairs: BreedingPair[];
  availableMales: AnimalEntry[];
  availableFemales: AnimalEntry[];

  // Pregnancies
  pregnancies: Pregnancy[];

  // Methods
  createPair(maleId: string, femaleId: string): BreedingPair;
  dissolvePair(pairId: string): void;
  getCompatibility(male: string, female: string): BreedingCompatibility;
}

interface BreedingPair {
  id: string;
  male: AnimalEntry;
  female: AnimalEntry;

  // Status
  status: PairStatus;
  pairedSince: GameTime;
  breedingAttempts: number;
  successfulBreedings: number;

  // Compatibility
  compatibility: BreedingCompatibility;
}

type PairStatus =
  | "active"           // Currently paired
  | "breeding"         // Mating
  | "pregnant"         // Female pregnant
  | "nursing"          // Female nursing
  | "resting"          // Cooldown period
  | "dissolved";       // No longer paired

interface BreedingCompatibility {
  score: number;               // 0-100
  factors: CompatibilityFactor[];
  expectedOffspringQuality: QualityGrade;
  inheritableTraits: AnimalTrait[];
}

interface CompatibilityFactor {
  name: string;
  impact: number;              // Positive or negative
  description: string;
}

interface Pregnancy {
  mother: AnimalEntry;
  father: AnimalEntry;

  // Progress
  startDate: GameTime;
  dueDate: GameTime;
  progress: number;            // 0-1

  // Expected outcome
  expectedOffspring: number;
  expectedQuality: QualityGrade;

  // Health
  complications: string[];
}
```

### REQ-ANIMAL-005: Production Tracking
- **Description**: Monitor animal products
- **Priority**: MUST

```typescript
// Uses AnimalProduct from animal-system/spec.md:
// - itemId, name
// - productionType: "continuous" | "periodic" | "terminal"
// - interval? (for periodic)
// - quantity: { min, max }
// - requirements: { minAge?, minHealth?, minBond?, minHappiness?, sex?, season? }
// - qualityFactors: { healthWeight, bondWeight, dietWeight, geneticsWeight }

interface ProductionTrackingDisplay {
  // Production summary
  dailyProduction: Map<string, number>;
  weeklyProduction: Map<string, number>;

  // By animal
  animalProduction: AnimalProductionDisplay[];

  // Ready to collect
  readyToCollect: CollectionReadyDisplay[];

  // Methods
  collectFromAnimal(animalId: string): void;
  collectAll(): void;
}

// Display wrapper for animal production status
interface AnimalProductionDisplay {
  animal: AnimalRosterEntry;

  // From AnimalSpecies.products
  productDefinitions: AnimalProduct[];  // From animal-system

  // Per-product tracking
  productionRecords: ProductionRecordDisplay[];
}

interface ProductionRecordDisplay {
  // From AnimalProduct in animal-system
  product: AnimalProduct;

  // Computed from product definition
  productionTypeName: string;   // "Continuous", "Every 7 days", "One-time"
  lastCollection: GameTime | null;
  amountReady: number;
  nextAvailable: GameTime | null;

  // Quality computed from AnimalProduct.qualityFactors
  productQuality: QualityGrade;
  qualityFactorImpacts: QualityFactorDisplay[];
}

interface QualityFactorDisplay {
  name: string;                 // "Health", "Bond", "Diet", "Genetics"
  weight: number;               // From qualityFactors in AnimalProduct
  currentValue: number;         // Animal's current value for this factor
  impact: "positive" | "neutral" | "negative";
  description: string;
}

interface CollectionReadyDisplay {
  animal: AnimalRosterEntry;
  product: AnimalProduct;       // From animal-system
  productName: string;
  amount: number;
  quality: QualityGrade;
  urgency: "normal" | "soon" | "overdue";
}

interface ProductionGraph {
  // Historical production
  productType: string;
  dataPoints: ProductionDataPoint[];
  timeRange: TimeRange;

  render(ctx: CanvasRenderingContext2D): void;
}

interface ProductionDataPoint {
  date: GameTime;
  amount: number;
  averageQuality: number;
}
```

### REQ-ANIMAL-006: Training Interface
- **Description**: Train animals for tasks
- **Priority**: MAY

```typescript
interface TrainingInterface {
  animal: AnimalEntry;

  // Available training
  availableSkills: TrainableSkill[];
  learnedSkills: LearnedSkill[];

  // Current training
  currentTraining: TrainingSession | null;

  // Methods
  startTraining(skillId: string): TrainingSession;
  cancelTraining(): void;
}

interface TrainableSkill {
  id: string;
  name: string;
  description: string;
  icon: Sprite;

  // Requirements
  minAge: number;
  requiredTraits: string[];
  prerequisiteSkills: string[];

  // Training
  trainingTime: number;
  difficulty: number;

  // Availability
  isAvailable: boolean;
  unavailableReason: string | null;
}

interface LearnedSkill {
  skill: TrainableSkill;
  level: number;               // 1-5
  learnedAt: GameTime;
}

interface TrainingSession {
  animal: AnimalEntry;
  skill: TrainableSkill;

  // Progress
  startTime: GameTime;
  progress: number;            // 0-1
  estimatedCompletion: GameTime;

  // Trainer
  trainer: string | null;

  // Status
  status: "in_progress" | "paused" | "complete" | "failed";
}
```

### REQ-ANIMAL-007: Care Scheduling
- **Description**: Schedule animal care tasks
- **Priority**: SHOULD

```typescript
interface CareScheduling {
  schedules: CareSchedule[];

  // Today's tasks
  todaysTasks: CareTask[];
  completedTasks: CareTask[];
  overdueTasks: CareTask[];

  // Methods
  createSchedule(config: ScheduleConfig): CareSchedule;
  modifySchedule(scheduleId: string, changes: Partial<ScheduleConfig>): void;
  deleteSchedule(scheduleId: string): void;
}

interface CareSchedule {
  id: string;
  name: string;

  // Target
  targetType: "animal" | "species" | "enclosure";
  targetId: string;

  // Task
  taskType: CareTaskType;
  frequency: ScheduleFrequency;

  // Assignment
  assignedCaretaker: string | null;
  autoAssign: boolean;

  // Status
  isActive: boolean;
  lastCompleted: GameTime | null;
  nextDue: GameTime;
}

type CareTaskType =
  | "feeding"
  | "watering"
  | "grooming"
  | "health_check"
  | "cleaning"
  | "exercise"
  | "milking"
  | "shearing"
  | "egg_collection";

type ScheduleFrequency =
  | "daily"
  | "twice_daily"
  | "weekly"
  | "as_needed";

interface ScheduleConfig {
  name: string;
  targetType: "animal" | "species" | "enclosure";
  targetId: string;
  taskType: CareTaskType;
  frequency: ScheduleFrequency;
  preferredTime: number;       // Hour of day
}

interface CareTask {
  schedule: CareSchedule;
  dueTime: GameTime;
  status: "pending" | "in_progress" | "completed" | "overdue";
  assignee: string | null;
}
```

### REQ-ANIMAL-008: Species Overview
- **Description**: Summary by animal species
- **Priority**: SHOULD

```typescript
interface SpeciesOverview {
  species: SpeciesSummary[];

  // Selection
  selectedSpecies: SpeciesSummary | null;

  // Methods
  selectSpecies(speciesId: string): void;
}

interface SpeciesSummary {
  speciesId: string;
  speciesName: string;
  icon: Sprite;

  // Population
  totalCount: number;
  maleCount: number;
  femaleCount: number;
  youngCount: number;

  // Health
  averageHealth: number;
  sickCount: number;

  // Production
  totalProduction: Map<string, number>;
  productionTrend: "increasing" | "stable" | "decreasing";

  // Breeding
  breedingPairs: number;
  pregnantCount: number;
  recentBirths: number;
}

interface SpeciesDetails {
  species: SpeciesSummary;

  // All animals of this species
  animals: AnimalEntry[];

  // Enclosures housing this species
  enclosures: Enclosure[];

  // Breeding stats
  breedingStats: BreedingStats;

  // Production history
  productionHistory: ProductionDataPoint[];
}

interface BreedingStats {
  totalOffspring: number;
  successRate: number;
  averageOffspringQuality: QualityGrade;
  generationsTracked: number;
}
```

### REQ-ANIMAL-009: Health Alerts
- **Description**: Notifications for animal health issues
- **Priority**: SHOULD

```typescript
interface AnimalHealthAlerts {
  alerts: HealthAlert[];

  // Filtering
  filterBySeverity: "all" | "warning" | "critical";
  filterBySpecies: string | null;

  // Actions
  acknowledgeAlert(alertId: string): void;
  viewAnimal(alertId: string): void;
}

interface HealthAlert {
  id: string;
  animal: AnimalEntry;
  severity: "warning" | "critical";

  // Issue
  issue: string;
  description: string;
  detectedAt: GameTime;

  // Recommendation
  suggestedAction: string;
  urgency: "low" | "medium" | "high";

  // Status
  isAcknowledged: boolean;
  isResolved: boolean;
}

// Alert triggers
const HEALTH_ALERT_TRIGGERS = [
  { condition: "health < 30", severity: "critical", issue: "Critically ill" },
  { condition: "health < 60", severity: "warning", issue: "Health declining" },
  { condition: "hunger > 80", severity: "warning", issue: "Very hungry" },
  { condition: "has_condition", severity: "warning", issue: "Has health condition" },
  { condition: "pregnancy_complication", severity: "critical", issue: "Pregnancy complication" }
];
```

### REQ-ANIMAL-010: Keyboard Shortcuts
- **Description**: Quick access for animal management
- **Priority**: SHOULD

```typescript
interface AnimalManagementShortcuts {
  // Window
  toggleAnimalPanel: string;   // Default: "A"
  closePanel: string;          // Default: "Escape"

  // Navigation
  nextAnimal: string;          // Default: "Tab"
  previousAnimal: string;      // Default: "Shift+Tab"
  focusOnAnimal: string;       // Default: "C"

  // Actions
  collectProducts: string;     // Default: "P"
  feedSelected: string;        // Default: "F"

  // Views
  toggleBreeding: string;      // Default: "B"
  toggleEnclosures: string;    // Default: "E"

  // Search
  searchAnimals: string;       // Default: "/"
}
```

## Visual Style

```typescript
interface AnimalHusbandryStyle {
  // Panel
  backgroundColor: Color;
  headerColor: Color;

  // Animal portraits
  portraitSize: number;
  portraitBorderColor: Color;
  selectedBorderColor: Color;

  // Health indicators
  healthyColor: Color;         // Green
  warningColor: Color;         // Yellow
  criticalColor: Color;        // Red

  // Production
  readyColor: Color;           // Gold
  notReadyColor: Color;        // Gray

  // Enclosures
  enclosureBorderColor: Color;
  enclosureFillColor: Color;

  // 8-bit styling
  pixelScale: number;
}
```

## State Management

```typescript
interface AnimalHusbandryState {
  // View state
  isOpen: boolean;
  activeTab: "roster" | "enclosures" | "breeding" | "production" | "training";

  // Selection - using display wrappers
  selectedAnimalId: string | null;
  selectedAnimal: Animal | null;           // From animal-system
  selectedEnclosureId: string | null;

  // Filters - using animal-system types
  speciesFilter: string | null;
  lifeStageFilter: LifeStage | null;       // From animal-system
  stateFilter: AnimalState | null;         // From animal-system
  searchQuery: string;

  // Events - using animal-system types
  onAnimalSelected: Event<Animal>;         // From animal-system
  onProductionReady: Event<CollectionReadyDisplay>;
  onHealthAlert: Event<HealthAlertDisplay>;
  onBirthEvent: Event<Animal>;             // From animal-system
  onAnimalTamed: Event<Animal>;            // When wild becomes false
  onTrainingComplete: Event<TrainedBehavior>;  // From animal-system
  onBondLevelChanged: Event<{ animal: Animal; newLevel: number }>;
  onLifeStageChanged: Event<{ animal: Animal; newStage: LifeStage }>;
}
```

## Integration Points

- **Animal System**: Animal data, behavior, breeding
- **Farming System**: Pastures, feed production
- **Economy System**: Animal product values
- **Agent System**: Caretaker assignment
- **Notification System**: Health and production alerts
