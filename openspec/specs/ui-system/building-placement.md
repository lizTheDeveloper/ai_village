# Building Placement UI Specification

## Overview

The Building Placement UI provides the interface for selecting, positioning, and confirming construction of buildings and structures in the world. Features ghost previews, rotation controls, validity checking, and construction requirements display.

## Version

0.1.0

## Dependencies

- `core/ecs.md` - Entity-Component-System architecture
- `core/world.md` - World grid and chunk system
- `entities/buildings.md` - Building definitions and components
- `systems/construction.md` - Construction mechanics
- `ui-system/inventory.md` - Resource checking

## Requirements

### REQ-BPLACE-001: Building Selection Menu
- **Description**: Panel for browsing and selecting buildings to construct
- **Priority**: MUST

```typescript
interface BuildingSelectionMenu {
  isOpen: boolean;
  categories: BuildingCategory[];
  selectedCategory: BuildingCategory | null;
  buildings: BuildingBlueprint[];
  selectedBuilding: BuildingBlueprint | null;

  searchQuery: string;
  filterUnlocked: boolean;
  filterAffordable: boolean;

  open(): void;
  close(): void;
  selectCategory(category: BuildingCategory): void;
  selectBuilding(blueprint: BuildingBlueprint): void;
}

type BuildingCategory =
  | "housing"       // Homes, shelters
  | "production"    // Workshops, forges, farms
  | "storage"       // Warehouses, silos, chests
  | "infrastructure" // Roads, bridges, wells
  | "defense"       // Walls, towers, gates
  | "decoration"    // Statues, gardens, fences
  | "special";      // Unique or quest buildings

interface BuildingBlueprint {
  id: string;
  name: string;
  description: string;
  category: BuildingCategory;
  icon: Sprite;
  preview: Sprite;

  // Dimensions
  width: number;
  height: number;

  // Requirements
  resourceCost: ResourceCost[];
  techRequired: string[];
  terrainRequired: TerrainType[];
  terrainForbidden: TerrainType[];

  // Status
  unlocked: boolean;
  buildTime: number;

  // Placement rules
  canRotate: boolean;
  rotationAngles: number[];  // e.g., [0, 90, 180, 270]
  snapToGrid: boolean;
  requiresFoundation: boolean;
}

interface ResourceCost {
  resourceId: string;
  resource: Item;
  amountRequired: number;
  amountAvailable: number;

  isMet(): boolean;
}
```

### REQ-BPLACE-002: Ghost Preview
- **Description**: Transparent preview showing building placement before confirmation
- **Priority**: MUST

```typescript
interface GhostPreview {
  blueprint: BuildingBlueprint;
  position: Vector2;
  rotation: number;

  // Visual state
  opacity: number;           // 0.5 for preview
  tintColor: Color;          // Green valid, red invalid
  showOutline: boolean;
  showGrid: boolean;

  // Validity
  isValid: boolean;
  validationErrors: PlacementError[];

  // Methods
  updatePosition(worldPos: Vector2): void;
  rotate(direction: "cw" | "ccw"): void;
  setRotation(angle: number): void;
  validate(): ValidationResult;

  render(ctx: CanvasRenderingContext2D): void;
}

interface PlacementError {
  type: PlacementErrorType;
  message: string;
  affectedTiles: Vector2[];
}

type PlacementErrorType =
  | "terrain_invalid"      // Wrong terrain type
  | "terrain_occupied"     // Something already here
  | "entity_blocking"      // Entity in the way
  | "resource_missing"     // Not enough materials
  | "tech_locked"          // Technology not researched
  | "too_close"            // Too close to another building
  | "foundation_missing"   // Needs foundation first
  | "out_of_bounds";       // Outside valid area

interface ValidationResult {
  valid: boolean;
  errors: PlacementError[];
  warnings: PlacementWarning[];
}

interface PlacementWarning {
  type: string;
  message: string;
  // Warnings don't prevent placement but inform player
  // e.g., "Building is far from resources"
}
```

### REQ-BPLACE-003: Grid Snapping System
- **Description**: Buildings snap to world grid for aligned placement
- **Priority**: MUST

```typescript
interface GridSnappingSystem {
  enabled: boolean;
  gridSize: number;          // 1 tile = 32 pixels
  showGrid: boolean;
  gridColor: Color;
  gridOpacity: number;

  // Snapping behavior
  snapToCenter: boolean;     // Snap to tile center
  snapToEdge: boolean;       // Snap to tile edge
  snapToCorner: boolean;     // Snap to tile corner

  // Methods
  snapPosition(worldPos: Vector2): Vector2;
  getGridCell(worldPos: Vector2): Vector2;
  highlightCell(cell: Vector2): void;

  // Visual grid overlay
  renderGrid(
    ctx: CanvasRenderingContext2D,
    visibleArea: Rect
  ): void;
}

interface PlacementGrid {
  // Shows which tiles building will occupy
  occupiedCells: Vector2[];
  entranceCells: Vector2[];   // Where agents enter
  outputCells: Vector2[];     // Where items output

  // Visual indicators
  cellColors: Map<Vector2, Color>;
  showCellTypes: boolean;
}
```

### REQ-BPLACE-004: Rotation Controls
- **Description**: Interface for rotating buildings before placement
- **Priority**: MUST

```typescript
interface RotationControls {
  currentRotation: number;   // Degrees
  availableRotations: number[];
  rotationStep: number;      // Usually 90

  // Input bindings
  rotateClockwiseKey: string;      // Default: "R"
  rotateCounterClockwiseKey: string; // Default: "Shift+R"

  // Visual feedback
  showRotationIndicator: boolean;
  showEntranceDirection: boolean;  // Arrow showing front

  // Methods
  rotateClockwise(): void;
  rotateCounterClockwise(): void;
  setRotation(degrees: number): void;

  // UI element
  renderRotationWidget(ctx: CanvasRenderingContext2D): void;
}

interface RotationWidget {
  // Small circular widget showing current rotation
  position: Vector2;
  radius: number;

  // Shows 4 cardinal directions with current highlighted
  directions: RotationOption[];

  // Click to set rotation directly
  handleClick(localPos: Vector2): void;
}

interface RotationOption {
  angle: number;
  label: string;
  isAvailable: boolean;
  isSelected: boolean;
}
```

### REQ-BPLACE-005: Validity Indicators
- **Description**: Visual feedback showing valid/invalid placement areas
- **Priority**: MUST

```typescript
interface ValidityIndicators {
  // Tile coloring
  validTileColor: Color;     // Green tint
  invalidTileColor: Color;   // Red tint
  warningTileColor: Color;   // Yellow tint

  // Show for each tile under building
  showPerTileValidity: boolean;

  // Blocked entity highlighting
  highlightBlockingEntities: boolean;
  blockingEntityOutline: Color;

  // Terrain indication
  showTerrainRequirements: boolean;
  missingTerrainPattern: FillPattern;  // Hatched/striped

  render(
    ctx: CanvasRenderingContext2D,
    validation: ValidationResult
  ): void;
}

interface ValidityTooltip {
  // Shows near cursor when placement invalid
  visible: boolean;
  position: Vector2;
  errors: PlacementError[];

  // Compact error list
  maxErrorsShown: number;    // 3-4
  showSuggestions: boolean;  // "Try moving north"
}
```

### REQ-BPLACE-006: Resource Requirements Panel
- **Description**: Display showing materials needed for construction
- **Priority**: MUST

```typescript
interface ResourceRequirementsPanel {
  position: "bottom" | "side";
  isExpanded: boolean;

  blueprint: BuildingBlueprint;
  requirements: ResourceRequirement[];

  // Summary
  allRequirementsMet: boolean;
  missingResources: ResourceRequirement[];

  // Display
  showTotalCost: boolean;
  showPerResource: boolean;
  showSourceLocation: boolean;  // Where resources are stored
}

interface ResourceRequirement {
  resource: Item;
  icon: Sprite;
  name: string;

  required: number;
  available: number;
  reserved: number;    // Already allocated to other builds

  // Status
  isMet: boolean;
  deficit: number;

  // Source tracking
  sources: ResourceSource[];
}

interface ResourceSource {
  entityId: EntityId;
  location: Vector2;
  containerName: string;  // "Storage Chest", "Warehouse"
  quantity: number;
}

interface RequirementDisplay {
  // Per-resource row
  renderRequirement(
    ctx: CanvasRenderingContext2D,
    req: ResourceRequirement,
    position: Vector2
  ): void;

  // Colors
  metColor: Color;         // White/green
  unmetColor: Color;       // Red
  partialColor: Color;     // Yellow
}
```

### REQ-BPLACE-007: Placement Confirmation
- **Description**: Confirm or cancel building placement
- **Priority**: MUST

```typescript
interface PlacementConfirmation {
  // Input bindings
  confirmKey: string;        // Default: "Enter" or Left Click
  cancelKey: string;         // Default: "Escape" or Right Click

  // Quick place mode (place multiple without reopening menu)
  quickPlaceEnabled: boolean;
  quickPlaceKey: string;     // Default: "Shift+Click"

  // Confirmation behavior
  requireExplicitConfirm: boolean;  // vs click-to-place
  showConfirmButton: boolean;
  showCancelButton: boolean;

  // Actions
  confirm(): PlacementResult;
  cancel(): void;

  // Result handling
  onPlacementSuccess(result: PlacementResult): void;
  onPlacementFailed(errors: PlacementError[]): void;
}

interface PlacementResult {
  success: boolean;
  buildingEntityId: EntityId | null;
  position: Vector2;
  rotation: number;

  // Construction state
  constructionProgress: number;  // 0 at start
  assignedBuilders: EntityId[];
  resourcesReserved: boolean;
}

interface PlacementButtons {
  // On-screen buttons for confirmation
  confirmButton: Button;
  cancelButton: Button;
  rotateButton: Button;

  position: Vector2;
  layout: "horizontal" | "vertical";
}
```

### REQ-BPLACE-008: Multi-Building Placement
- **Description**: Tools for placing multiple buildings efficiently
- **Priority**: SHOULD

```typescript
interface MultiBuildingPlacement {
  mode: PlacementMode;

  // Drag placement for linear structures
  dragStart: Vector2 | null;
  dragEnd: Vector2 | null;
  dragPreview: BuildingBlueprint[];

  // Cost calculation
  totalCost: ResourceCost[];

  // Methods
  startDrag(position: Vector2): void;
  updateDrag(position: Vector2): void;
  endDrag(): void;

  // Preview all buildings in line/area
  calculateDragPlacements(): PlacementPreview[];
}

type PlacementMode =
  | "single"      // One at a time
  | "line"        // Drag to create line (walls, fences)
  | "rect"        // Drag to create rectangle (foundations)
  | "fill";       // Fill area (flooring)

interface PlacementPreview {
  position: Vector2;
  rotation: number;
  isValid: boolean;
  errors: PlacementError[];
}

interface DragPlacementVisuals {
  // Show count of buildings to be placed
  showCount: boolean;
  countPosition: Vector2;

  // Show total cost
  showTotalCost: boolean;

  // Visual line/rect
  lineColor: Color;
  lineWidth: number;
}
```

### REQ-BPLACE-009: Building Upgrades
- **Description**: Interface for upgrading existing buildings in place
- **Priority**: SHOULD

```typescript
interface BuildingUpgradeUI {
  targetBuilding: EntityId;
  currentTier: number;
  availableUpgrades: UpgradeOption[];

  // Show upgrade preview as ghost over existing
  upgradePreview: GhostPreview | null;

  // Methods
  selectUpgrade(upgrade: UpgradeOption): void;
  confirmUpgrade(): void;
  cancelUpgrade(): void;
}

interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  icon: Sprite;

  // What changes
  newBlueprint: BuildingBlueprint;
  changesSize: boolean;
  newWidth?: number;
  newHeight?: number;

  // Cost (additional resources)
  upgradeCost: ResourceCost[];
  upgradeTime: number;

  // Requirements
  techRequired: string[];
  isAvailable: boolean;
}

interface UpgradePreview {
  // Shows difference between current and upgraded
  currentStats: BuildingStats;
  upgradedStats: BuildingStats;
  statChanges: StatChange[];
}

interface StatChange {
  statName: string;
  currentValue: number;
  newValue: number;
  changeType: "increase" | "decrease" | "same";
}
```

### REQ-BPLACE-010: Placement Templates
- **Description**: Save and reuse building layouts
- **Priority**: MAY

```typescript
interface PlacementTemplates {
  templates: BuildingTemplate[];
  activeTemplate: BuildingTemplate | null;

  // Methods
  saveTemplate(name: string, buildings: SelectedBuilding[]): void;
  loadTemplate(templateId: string): void;
  deleteTemplate(templateId: string): void;
  renameTemplate(templateId: string, newName: string): void;
}

interface BuildingTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: ImageData;

  // Buildings in template (relative positions)
  buildings: TemplateBuildingDef[];

  // Bounds
  width: number;
  height: number;

  // Total cost
  totalResourceCost: ResourceCost[];

  createdAt: Date;
  lastUsed: Date;
}

interface TemplateBuildingDef {
  blueprintId: string;
  relativePosition: Vector2;  // Offset from template origin
  rotation: number;
}

interface TemplateSelection {
  // Select area to save as template
  selectionStart: Vector2 | null;
  selectionEnd: Vector2 | null;
  selectedBuildings: EntityId[];

  // Methods
  startSelection(position: Vector2): void;
  updateSelection(position: Vector2): void;
  completeSelection(): SelectedBuilding[];
}
```

### REQ-BPLACE-011: Construction Queue Display
- **Description**: Show queued and in-progress constructions
- **Priority**: SHOULD

```typescript
interface ConstructionQueueDisplay {
  position: Vector2;
  isExpanded: boolean;

  // Queue data
  inProgress: ConstructionJob[];
  queued: ConstructionJob[];
  paused: ConstructionJob[];

  // Interaction
  selectedJob: ConstructionJob | null;

  // Methods
  selectJob(job: ConstructionJob): void;
  pauseJob(jobId: string): void;
  resumeJob(jobId: string): void;
  cancelJob(jobId: string): void;
  prioritizeJob(jobId: string): void;

  // Jump to location
  focusOnJob(jobId: string): void;
}

interface ConstructionJob {
  id: string;
  blueprint: BuildingBlueprint;
  position: Vector2;
  rotation: number;

  // Progress
  progress: number;          // 0-1
  resourcesDelivered: Map<string, number>;

  // Workers
  assignedBuilders: EntityId[];
  maxBuilders: number;

  // Status
  status: ConstructionStatus;
  statusReason?: string;
}

type ConstructionStatus =
  | "pending"              // Not started
  | "gathering_resources"  // Builders collecting materials
  | "in_progress"          // Actively building
  | "paused"               // Player paused
  | "blocked"              // Missing resources/workers
  | "complete";            // Finished

interface JobListItem {
  job: ConstructionJob;

  // Display
  showProgress: boolean;
  showWorkers: boolean;
  showETA: boolean;

  // Compact row rendering
  render(
    ctx: CanvasRenderingContext2D,
    position: Vector2,
    width: number
  ): void;
}
```

### REQ-BPLACE-012: Keyboard Shortcuts
- **Description**: Quick access keys for placement actions
- **Priority**: MUST

```typescript
interface PlacementKeyboardShortcuts {
  // Mode toggles
  toggleBuildMenu: string;      // Default: "B"
  cancelPlacement: string;      // Default: "Escape"

  // Rotation
  rotateClockwise: string;      // Default: "R"
  rotateCounterClockwise: string; // Default: "Shift+R"

  // Grid
  toggleGrid: string;           // Default: "G"
  toggleSnap: string;           // Default: "Ctrl+G"

  // Placement
  confirmPlacement: string;     // Default: "Enter"
  quickPlace: string;           // Default: "Shift+Click"

  // Multi-placement
  startLinePlacement: string;   // Default: "L"
  startRectPlacement: string;   // Default: "Ctrl+L"

  // Category quick access
  categoryShortcuts: Map<BuildingCategory, string>;
  // e.g., "1" for housing, "2" for production

  // Recent buildings
  recentBuildingShortcuts: string[]; // "Q", "W", "E" for last 3
}

interface ShortcutHints {
  showHints: boolean;
  hintPosition: "bottom" | "corner";
  hintOpacity: number;

  // Context-sensitive hints
  getCurrentHints(): ShortcutHint[];
}

interface ShortcutHint {
  key: string;
  action: string;
  isAvailable: boolean;
}
```

## Visual Style

```typescript
interface BuildingPlacementStyle {
  // Ghost preview
  ghostOpacity: number;          // 0.6
  validGhostTint: Color;         // rgba(0, 255, 0, 0.3)
  invalidGhostTint: Color;       // rgba(255, 0, 0, 0.3)

  // Grid overlay
  gridLineColor: Color;          // rgba(255, 255, 255, 0.2)
  gridLineWidth: number;         // 1px
  gridHighlightColor: Color;     // rgba(255, 255, 0, 0.3)

  // Building menu
  menuBackground: Color;         // Dark brown
  categoryTabHeight: number;     // 32px
  buildingCardSize: number;      // 64x64

  // Requirement panel
  requirementBackground: Color;  // Semi-transparent black
  metRequirementColor: Color;    // Green
  unmetRequirementColor: Color;  // Red

  // Buttons
  confirmButtonColor: Color;     // Green
  cancelButtonColor: Color;      // Red
  rotateButtonColor: Color;      // Blue

  // 8-bit pixel styling
  pixelScale: number;            // 4x
  useDithering: boolean;         // For transparency
}
```

## State Management

```typescript
interface BuildingPlacementState {
  // Mode
  isInPlacementMode: boolean;
  isMenuOpen: boolean;

  // Selection
  selectedBlueprint: BuildingBlueprint | null;
  ghostPreview: GhostPreview | null;

  // Placement
  currentRotation: number;
  lastPlacedPosition: Vector2 | null;

  // Multi-placement
  placementMode: PlacementMode;
  dragState: DragState | null;

  // UI state
  menuCategory: BuildingCategory | null;
  searchQuery: string;

  // Methods
  enterPlacementMode(blueprint: BuildingBlueprint): void;
  exitPlacementMode(): void;
  updateGhostPosition(screenPos: Vector2): void;

  // Events
  onBuildingPlaced: Event<PlacementResult>;
  onPlacementCancelled: Event<void>;
}

interface DragState {
  mode: PlacementMode;
  startPosition: Vector2;
  currentPosition: Vector2;
  previewBuildings: PlacementPreview[];
}
```

## Integration Points

- **World System**: Grid coordinates, terrain checking
- **ECS**: Entity creation for placed buildings
- **Construction System**: Job creation and management
- **Resource System**: Cost checking and reservation
- **Research System**: Tech requirement checking
- **Camera System**: Screen to world coordinate conversion
