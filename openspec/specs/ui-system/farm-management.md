# Farm Management UI Specification

## Overview

The Farm Management UI provides visualization and control of agricultural activities including field planning, crop status monitoring, soil health tracking, and harvest scheduling. Features grid-based field view, crop rotation planning, and growth stage indicators.

## Version

0.1.0

## Dependencies

- `farming-system/spec.md` - Farming mechanics
- `world-system/spec.md` - Terrain and tiles
- `ui-system/notifications.md` - Farm alerts

## Requirements

### REQ-FARM-001: Farm Overview Panel
- **Description**: Summary view of all farming activities
- **Priority**: MUST

```typescript
// Re-export from farming-system for reference
import type {
  Plant, PlantStage, PlantGenetics, PlantProperties,
  Seed, SoilState,
  CropDefinition, CropTraits, GeneratedCropRecord,
  StageTransition, TransitionConditions
} from "farming-system/spec";

// PlantStage from farming-system/spec.md:
// "seed" | "germinating" | "sprout" | "vegetative" | "flowering" |
// "fruiting" | "mature" | "seeding" | "senescence" | "decay" | "dead"

interface FarmOverviewPanel {
  isOpen: boolean;

  // Data
  farms: FarmZone[];
  crops: PlantSummaryDisplay[];

  // Summary stats
  totalFarmland: number;
  cultivatedTiles: number;
  readyToHarvest: number;
  needsAttention: number;

  // Season info
  currentSeason: Season;
  daysUntilSeasonChange: number;

  // Methods
  open(): void;
  close(): void;
  selectFarm(farmId: string): void;
  focusOnFarm(farmId: string): void;

  render(ctx: CanvasRenderingContext2D): void;
}

interface FarmZone {
  id: string;
  name: string;
  bounds: Rect;

  // Contents
  tiles: FarmTileDisplay[];
  plants: Plant[];              // From farming-system

  // Status
  totalTiles: number;
  plantedTiles: number;
  emptyTiles: number;

  // Assignment
  assignedFarmers: string[];
}

// Display wrapper for plant summaries
interface PlantSummaryDisplay {
  speciesId: string;
  speciesName: string;
  icon: Sprite;

  // Counts by stage (using PlantStage from farming-system)
  countByStage: Map<PlantStage, number>;
  totalCount: number;

  // Harvest readiness
  readyToHarvest: number;
  harvestWindow: number;       // Days until spoilage

  // Link to crop definition if cultivated
  cropDefinition?: CropDefinition;
}
```

### REQ-FARM-002: Field Grid View
- **Description**: Tile-by-tile view of farm plots
- **Priority**: MUST

```typescript
// Reference SoilState from farming-system
// SoilState contains: fertility, moisture, nutrients {nitrogen, phosphorus, potassium}, composted

interface FieldGridView {
  farm: FarmZone;

  // Grid display
  tiles: FarmTileDisplay[][];
  tileSize: number;

  // View options
  showPlants: boolean;
  showSoilHealth: boolean;
  showHydration: boolean;
  overlayMode: FieldOverlay;

  // Selection
  selectedTiles: Vector2[];
  hoveredTile: Vector2 | null;

  // Methods
  selectTile(position: Vector2): void;
  selectArea(start: Vector2, end: Vector2): void;
  clearSelection(): void;

  render(ctx: CanvasRenderingContext2D): void;
}

// Display wrapper for farm tiles with SoilState from farming-system
interface FarmTileDisplay {
  position: Vector2;

  // Soil from farming-system
  soilState: SoilState;        // From farming-system
  soilType: SoilType;

  // Computed display values from SoilState
  soilQuality: number;         // Computed from soilState.fertility
  hydration: number;           // From soilState.moisture
  nutrition: number;           // Computed from soilState.nutrients

  // Plant from farming-system
  plant: Plant | null;

  // Infrastructure
  isIrrigated: boolean;
  hasFertilizer: boolean;      // From soilState.composted
  isTilled: boolean;

  // Status
  status: TileStatus;
}

type SoilType =
  | "loam"            // Good for most crops
  | "clay"            // Holds water, dense
  | "sandy"           // Drains fast, loose
  | "silty"           // Fertile, medium
  | "rocky";          // Poor for farming

type TileStatus =
  | "empty"           // Nothing planted
  | "tilled"          // Ready for planting
  | "planted"         // Has plant
  | "ready"           // Ready to harvest (plant at mature/harvestable stage)
  | "fallow"          // Resting
  | "damaged";        // Needs repair

type FieldOverlay =
  | "none"
  | "soil_health"     // Maps to SoilState.fertility
  | "hydration"       // Maps to SoilState.moisture
  | "nutrition"       // Maps to SoilState.nutrients
  | "growth_stage"    // Maps to Plant.stage
  | "harvest_ready";  // Shows plants at mature/seeding stages
```

### REQ-FARM-003: Plant Status Display
- **Description**: Detailed view of individual plant health
- **Priority**: MUST

```typescript
// Plant from farming-system contains:
// id, speciesId, position, stage (PlantStage), stageProgress, age, generation,
// health, hydration, nutrition, flowerCount, fruitCount, seedsProduced,
// geneticQuality, careQuality, environmentMatch

interface PlantStatusDisplay {
  plant: Plant;                // From farming-system
  position: Vector2;

  // Quick info
  showOnHover: boolean;
  detailLevel: "minimal" | "normal" | "detailed";
}

// Display wrapper providing UI-friendly access to Plant data
interface PlantDetailsDisplay {
  plant: Plant;                // From farming-system

  // Identity
  speciesName: string;
  varietyName: string | null;
  icon: Sprite;

  // Life cycle (from plant.stage, plant.stageProgress, plant.age)
  stage: PlantStage;           // From farming-system
  stageProgress: number;       // From plant.stageProgress (0-1)
  age: number;                 // From plant.age (days)
  daysUntilNextStage: number;  // Computed from stage transitions

  // Health indicators (from plant properties)
  health: number;              // From plant.health (0-100)
  hydration: number;           // From plant.hydration (0-100)
  nutrition: number;           // From plant.nutrition (0-100)

  // Quality (from plant properties)
  geneticQuality: number;      // From plant.geneticQuality
  careQuality: number;         // From plant.careQuality
  environmentMatch: number;    // From plant.environmentMatch
  expectedYield: YieldEstimate;

  // Reproduction info from plant
  flowerCount: number;         // From plant.flowerCount
  fruitCount: number;          // From plant.fruitCount
  seedsProduced: number;       // From plant.seedsProduced

  // Issues
  problems: PlantProblem[];
}

interface YieldEstimate {
  quantity: number;
  qualityGrade: QualityGrade;
  harvestWindow: DateRange;
}

type QualityGrade =
  | "poor"
  | "fair"
  | "good"
  | "excellent"
  | "exceptional";

interface PlantProblem {
  type: ProblemType;
  severity: "minor" | "moderate" | "severe";
  description: string;
  solution: string;
}

type ProblemType =
  | "dehydration"          // plant.hydration too low
  | "overwatering"         // plant.hydration too high
  | "nutrient_deficiency"  // plant.nutrition too low
  | "pest_damage"
  | "disease"
  | "wrong_season"         // Based on TransitionConditions.season
  | "poor_soil"            // SoilState.fertility too low
  | "overcrowding";
```

### REQ-FARM-004: Crop Planting Interface
- **Description**: Select and plant crops in fields
- **Priority**: MUST

```typescript
// Reference Seed and CropDefinition from farming-system
// Seed contains: genetics (PlantGenetics), viability, vigor, quality, dormant, source
// CropDefinition contains: plantingSeasons, growingSeasons, harvestSeasons, wrongSeasonGrowthRate

interface PlantingInterface {
  isActive: boolean;
  selectedCrop: CropTypeDisplay | null;
  targetTiles: Vector2[];

  // Available crops
  availableCrops: CropTypeDisplay[];
  filterBySeason: boolean;
  showUnavailable: boolean;

  // Seed inventory (wrapping Seed from farming-system)
  seedInventory: Map<string, SeedInventoryEntry>;

  // Methods
  selectCrop(crop: CropTypeDisplay): void;
  plantSelected(): void;
  cancel(): void;
}

// Display wrapper for seeds in inventory
interface SeedInventoryEntry {
  speciesId: string;
  seeds: Seed[];               // From farming-system
  totalCount: number;
  averageViability: number;    // Average of seed.viability
  averageQuality: number;      // Average of seed.quality
}

// Display wrapper for crop types
interface CropTypeDisplay {
  id: string;
  name: string;
  icon: Sprite;

  // Link to farming-system definitions
  cropDefinition: CropDefinition;
  cropTraits?: CropTraits;     // If from hybrid

  // Requirements (from CropDefinition)
  seasons: Season[];           // From cropDefinition.plantingSeasons
  soilPreference: SoilType[];
  waterNeed: "low" | "medium" | "high";  // From CropTraits.waterNeed
  sunNeed: "shade" | "partial" | "full";

  // Growth (computed from stage transitions)
  growthDays: number;
  harvestYield: number;        // From CropTraits.yieldAmount

  // Seeds available
  seedsOwned: number;

  // Suitability for selected tiles
  suitability: number;         // 0-1
  suitabilityFactors: SuitabilityFactor[];
}

interface SuitabilityFactor {
  name: string;
  impact: "positive" | "neutral" | "negative";
  description: string;
}

interface PlantingPreview {
  tiles: Vector2[];
  crop: CropTypeDisplay;

  // Seeds to be used (best quality first)
  seedsToPlant: Seed[];

  // Validation
  validTiles: number;
  invalidTiles: PlantingError[];

  // Cost
  seedsRequired: number;
  seedsAvailable: number;
}

interface PlantingError {
  tile: Vector2;
  reason: string;
}
```

### REQ-FARM-005: Growth Stage Visualization
- **Description**: Visual indicators of plant growth stages
- **Priority**: MUST

```typescript
// PlantStage is imported from farming-system (see REQ-FARM-001)
// StageTransition provides transition timing between stages

interface GrowthStageVisualization {
  // Stage colors/icons (using PlantStage from farming-system)
  stageVisuals: Map<PlantStage, StageVisual>;

  // Progress display
  showProgressBars: boolean;
  progressBarPosition: "above" | "below";

  // Stage icons
  showStageIcons: boolean;
  iconSize: number;
}

interface StageVisual {
  stage: PlantStage;           // From farming-system
  color: Color;
  icon: Sprite;
  label: string;
}

// Note: PlantStage is defined in farming-system/spec.md:
// "seed" | "germinating" | "sprout" | "vegetative" | "flowering" |
// "fruiting" | "mature" | "seeding" | "senescence" | "decay" | "dead"

interface GrowthTimeline {
  plant: Plant;                // From farming-system
  stages: TimelineStageDisplay[];

  // Current position (from plant.stage, plant.stageProgress)
  currentStage: PlantStage;
  currentProgress: number;

  // Stage transitions for timing
  stageTransitions: StageTransition[];  // From farming-system

  // Display
  orientation: "horizontal" | "vertical";
  showDates: boolean;
  showDurations: boolean;

  render(ctx: CanvasRenderingContext2D): void;
}

interface TimelineStageDisplay {
  stage: PlantStage;           // From farming-system
  transition: StageTransition; // From farming-system
  startDay: number;
  endDay: number;
  duration: number;            // From transition.baseDuration
  isComplete: boolean;
  isCurrent: boolean;
}
```

### REQ-FARM-006: Soil Health Overlay
- **Description**: Visual overlay showing soil conditions
- **Priority**: SHOULD

```typescript
// SoilState from farming-system contains:
// fertility, moisture, nutrients {nitrogen, phosphorus, potassium}, composted

interface SoilHealthOverlay {
  isActive: boolean;
  displayMode: SoilOverlayMode;

  // Color scales
  healthColors: ColorScale;      // For SoilState.fertility
  hydrationColors: ColorScale;   // For SoilState.moisture
  nutritionColors: ColorScale;   // For SoilState.nutrients

  // Legend
  showLegend: boolean;
  legendPosition: Vector2;
}

type SoilOverlayMode =
  | "quality"         // SoilState.fertility
  | "hydration"       // SoilState.moisture
  | "nutrition"       // SoilState.nutrients (combined N-P-K)
  | "nitrogen"        // SoilState.nutrients.nitrogen
  | "phosphorus"      // SoilState.nutrients.phosphorus
  | "potassium"       // SoilState.nutrients.potassium
  | "type";           // Soil type classification

interface ColorScale {
  min: Color;         // Bad
  mid: Color;         // Medium
  max: Color;         // Good

  getColor(value: number): Color;
}

interface SoilTooltip {
  tile: FarmTileDisplay;
  soilState: SoilState;        // From farming-system

  // Soil info (from SoilState)
  soilType: SoilType;
  quality: number;             // From soilState.fertility
  hydration: number;           // From soilState.moisture
  nutrition: number;           // Computed from soilState.nutrients

  // Detailed nutrients from SoilState.nutrients
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  isComposted: boolean;        // From soilState.composted

  // Recommendations
  suitableCrops: CropTypeDisplay[];
  improvements: SoilImprovement[];
}

interface SoilImprovement {
  action: string;
  benefit: string;
  cost: ResourceCost[];
}
```

### REQ-FARM-007: Harvest Management
- **Description**: Track and manage harvesting activities
- **Priority**: MUST

```typescript
// Plants at "mature", "seeding", or "senescence" stages can yield harvests
// Plants at "mature" or "fruiting" stages yield best quality

interface HarvestManagement {
  // Ready for harvest (plants at mature stage)
  readyPlants: Plant[];        // From farming-system
  urgentPlants: Plant[];       // Plants at seeding/senescence - about to spoil

  // Harvest schedule
  schedule: HarvestSchedule[];

  // Workers
  assignedHarvesters: string[];

  // Methods
  harvestPlant(plantId: string): void;
  harvestArea(tiles: Vector2[]): void;
  scheduleHarvest(plants: string[], time: GameTime): void;
}

interface HarvestSchedule {
  id: string;
  plants: string[];            // Plant IDs from farming-system
  scheduledTime: GameTime;
  priority: "low" | "normal" | "high";

  assignedWorker: string | null;
  status: "pending" | "in_progress" | "complete";
}

interface HarvestReadyPanel {
  // Crops ready now (stage == "mature")
  readyNow: HarvestGroupDisplay[];

  // Coming soon (stage == "fruiting", nearing mature)
  comingSoon: HarvestGroupDisplay[];

  // Past optimal (stage == "seeding" or "senescence")
  pastOptimal: HarvestGroupDisplay[];

  // Quick actions
  harvestAll(): void;
  harvestUrgent(): void;
}

// Display wrapper for harvest groups
interface HarvestGroupDisplay {
  crop: CropTypeDisplay;
  plants: Plant[];             // From farming-system
  totalYield: number;          // Computed from plant quality and CropTraits.yieldAmount
  harvestWindow: DateRange;
  urgency: "none" | "soon" | "urgent";

  // Quality estimate based on plant properties
  averageQuality: number;      // From plant.careQuality, plant.geneticQuality
  seedHarvestPotential: number; // From plant.seedsProduced
}
```

### REQ-FARM-008: Crop Rotation Planning
- **Description**: Plan seasonal crop rotations
- **Priority**: SHOULD

```typescript
interface CropRotationPlanner {
  farm: FarmZone;
  seasons: SeasonPlan[];

  // Current plan
  currentSeason: Season;
  nextSeasonPlan: SeasonPlan | null;

  // Methods
  createPlan(season: Season): SeasonPlan;
  applyPlan(plan: SeasonPlan): void;
  savePlanAsTemplate(plan: SeasonPlan, name: string): void;
}

interface SeasonPlan {
  id: string;
  name: string;
  season: Season;

  // Assignments
  tileCrops: Map<Vector2, CropType>;

  // Validation
  isValid: boolean;
  issues: PlanIssue[];

  // Stats
  totalTiles: number;
  cropBreakdown: Map<string, number>;
}

interface PlanIssue {
  type: "warning" | "error";
  tiles: Vector2[];
  message: string;
  suggestion: string;
}

interface RotationTemplate {
  id: string;
  name: string;
  description: string;

  // Multi-season rotation
  seasonPlans: Map<Season, string>;  // Season -> crop ID

  // Benefits
  benefits: string[];
}

// Predefined rotation templates
const ROTATION_TEMPLATES = [
  {
    name: "Three Sisters",
    description: "Corn, beans, and squash together",
    benefits: ["Nitrogen fixing", "Natural pest control", "Space efficient"]
  },
  {
    name: "Four-Field Rotation",
    description: "Wheat, turnips, barley, clover cycle",
    benefits: ["Soil restoration", "Year-round production"]
  }
];
```

### REQ-FARM-009: Weather and Season Display
- **Description**: Show weather affecting crops
- **Priority**: SHOULD

```typescript
interface FarmWeatherDisplay {
  // Current conditions
  currentWeather: WeatherCondition;
  temperature: number;
  precipitation: number;

  // Forecast
  forecast: WeatherForecast[];
  forecastDays: number;

  // Impact on crops
  cropImpacts: CropWeatherImpact[];

  // Alerts
  weatherAlerts: WeatherAlert[];
}

interface WeatherForecast {
  day: number;
  condition: WeatherCondition;
  temperature: number;
  precipitation: number;
}

type WeatherCondition =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "stormy"
  | "drought"
  | "frost"
  | "snow";

interface CropWeatherImpact {
  crop: CropType;
  impact: "positive" | "neutral" | "negative";
  description: string;
  affectedPlants: number;
}

interface WeatherAlert {
  type: WeatherCondition;
  severity: "watch" | "warning" | "danger";
  message: string;
  startTime: GameTime;
  duration: number;
  protectionAdvice: string;
}
```

### REQ-FARM-010: Farmer Assignment
- **Description**: Assign and manage farm workers
- **Priority**: SHOULD

```typescript
interface FarmerAssignment {
  farm: FarmZone;

  // Current farmers
  assignedFarmers: FarmerInfo[];
  availableFarmers: FarmerInfo[];

  // Workload
  totalWorkload: number;
  currentCapacity: number;

  // Methods
  assignFarmer(agentId: string): void;
  removeFarmer(agentId: string): void;
  setFarmerTask(agentId: string, task: FarmTask): void;
}

interface FarmerInfo {
  agentId: string;
  name: string;
  portrait: Sprite;

  // Skills
  farmingSkill: number;
  efficiency: number;

  // Current work
  currentTask: FarmTask | null;
  assignedArea: Vector2[];
}

type FarmTask =
  | "tilling"
  | "planting"
  | "watering"
  | "weeding"
  | "fertilizing"
  | "harvesting"
  | "pest_control";

interface TaskPriority {
  task: FarmTask;
  priority: number;
  autoAssign: boolean;
}
```

### REQ-FARM-011: Keyboard Shortcuts
- **Description**: Quick access for farm management
- **Priority**: SHOULD

```typescript
interface FarmManagementShortcuts {
  // Window
  toggleFarmPanel: string;     // Default: "F"
  closeFarmPanel: string;      // Default: "Escape"

  // Selection
  selectAll: string;           // Default: "Ctrl+A"
  clearSelection: string;      // Default: "Escape"

  // Actions
  plantSelected: string;       // Default: "P"
  harvestSelected: string;     // Default: "H"
  waterSelected: string;       // Default: "W"

  // Overlays
  toggleSoilOverlay: string;   // Default: "S"
  cycleOverlay: string;        // Default: "O"

  // Navigation
  nextFarm: string;            // Default: "Tab"
  previousFarm: string;        // Default: "Shift+Tab"
  focusOnFarm: string;         // Default: "C"
}
```

## Visual Style

```typescript
interface FarmManagementStyle {
  // Grid
  tileSize: number;            // 32px
  gridLineColor: Color;
  selectedTileColor: Color;
  hoveredTileColor: Color;

  // Plant sprites
  showGrowthSprites: boolean;
  showHealthIndicators: boolean;

  // Overlays
  overlayOpacity: number;

  // Status colors
  healthyColor: Color;         // Green
  warningColor: Color;         // Yellow
  criticalColor: Color;        // Red
  readyColor: Color;           // Gold

  // Panel
  panelBackground: Color;
  headerColor: Color;

  // 8-bit styling
  pixelScale: number;
}
```

## State Management

```typescript
// Import core farming-system types for state management
import type {
  Plant, PlantStage, Seed,
  SoilState, CropDefinition
} from "farming-system/spec";

interface FarmManagementState {
  // View state
  isOpen: boolean;
  selectedFarm: string | null;

  // Selection
  selectedTiles: Vector2[];

  // Overlay
  activeOverlay: FieldOverlay;

  // Planting
  plantingMode: boolean;
  selectedCrop: string | null;

  // Filters
  showReadyOnly: boolean;
  showProblemsOnly: boolean;

  // Current data from farming-system
  allPlants: Plant[];
  seedInventory: Seed[];

  // Events (consuming farming-system events)
  onFarmSelected: Event<string>;
  onTilesSelected: Event<Vector2[]>;
  onCropPlanted: Event<PlantingResult>;
  onHarvestComplete: Event<HarvestResult>;
  onPlantStageChanged: Event<{ plant: Plant; oldStage: PlantStage; newStage: PlantStage }>;
  onSoilStateChanged: Event<{ position: Vector2; soilState: SoilState }>;
}

interface PlantingResult {
  tilesPlanted: Vector2[];
  seedsUsed: Seed[];
  plantsCreated: Plant[];
}

interface HarvestResult {
  plantsHarvested: Plant[];
  yield: HarvestYield[];
  seedsCollected: Seed[];
}

interface HarvestYield {
  plantId: string;
  itemType: string;
  quantity: number;
  quality: QualityGrade;
}
```

## Integration Points

- **Farming System**: Plant data, growth, harvesting
- **World System**: Terrain, tiles, weather
- **Agent System**: Farmer assignment, skills
- **Economy System**: Crop values, resource flow
- **Notification System**: Farm alerts
- **Time System**: Seasons, day cycle
