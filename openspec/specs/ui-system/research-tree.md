# Research/Tech Tree UI Specification

## Overview

The Research Tree UI provides visualization of technological progression, research management, and unlock tracking. Features an interactive node-based tree with dependencies, progress indicators, and research queue management.

## Version

0.1.0

## Dependencies

- `research-system/spec.md` - Research mechanics (ResearchProject, ResearchField, ResearchUnlock)
- `research-system/capability-evolution.md` - Capability progression
- `ui-system/notifications.md` - Research complete notifications

## Requirements

### REQ-RESEARCH-001: Tech Tree Visualization
- **Description**: Interactive node graph showing all research projects
- **Priority**: MUST

```typescript
// Re-export from research-system for reference
// See research-system/spec.md for canonical definitions
import type { ResearchProject, ResearchField, ResearchUnlock } from "research-system/spec";

interface ResearchTreeView {
  isOpen: boolean;

  // Tree data - uses ResearchProject from research-system
  projects: ResearchProjectNode[];
  connections: ResearchConnection[];
  fields: ResearchField[];

  // View state
  camera: TreeCamera;
  selectedProject: ResearchProjectNode | null;
  hoveredProject: ResearchProjectNode | null;

  // Filtering
  activeField: ResearchField | null;
  showCompleted: boolean;
  showLocked: boolean;
  searchQuery: string;

  // Methods
  open(): void;
  close(): void;
  selectProject(project: ResearchProjectNode): void;
  panTo(project: ResearchProjectNode): void;
  zoomToFit(): void;

  render(ctx: CanvasRenderingContext2D): void;
}

// UI wrapper around ResearchProject with display properties
interface ResearchProjectNode {
  // Core data from ResearchProject (research-system/spec.md)
  project: ResearchProject;

  // UI-specific properties
  icon: Sprite;
  position: Vector2;         // Position in tree visualization

  // Computed status for display
  displayStatus: ResearchDisplayStatus;

  // Progress as ratio for UI (computed from project.currentProgress / project.progressRequired)
  progressRatio: number;
}

type ResearchDisplayStatus =
  | "locked"        // Prerequisites not met
  | "available"     // Can research now
  | "researching"   // Currently being researched
  | "completed"     // Already researched
  | "hidden";       // Not yet discovered (for generated research)

interface ResearchConnection {
  fromProjectId: string;
  toProjectId: string;
  type: "required" | "optional" | "enhances";

  // Visual
  lineStyle: "solid" | "dashed";
  color: Color;
}

// ResearchField from research-system/spec.md:
// "agriculture" | "construction" | "crafting" | "metallurgy" | "alchemy" |
// "textiles" | "cuisine" | "machinery" | "nature" | "society" | "arcane" | "experimental"
```

### REQ-RESEARCH-002: Tree Navigation
- **Description**: Pan, zoom, and navigation controls for tree view
- **Priority**: MUST

```typescript
interface TreeCamera {
  position: Vector2;
  zoom: number;
  minZoom: number;
  maxZoom: number;

  // Bounds
  treeBounds: Rect;
  viewportSize: Vector2;

  // Methods
  pan(delta: Vector2): void;
  zoomTo(level: number, focus?: Vector2): void;
  zoomIn(): void;
  zoomOut(): void;
  centerOn(position: Vector2): void;
  fitToView(projects: ResearchProjectNode[]): void;
}

interface TreeNavigation {
  // Input handling
  dragToPan: boolean;
  scrollToZoom: boolean;

  // Keyboard navigation
  arrowKeyNavigation: boolean;

  // Quick navigation
  jumpToCurrentResearch(): void;
  jumpToField(field: ResearchField): void;
  jumpToNextAvailable(): void;

  // Minimap
  showMinimap: boolean;
  minimapPosition: "corner" | "side";
}

interface TreeMinimap {
  size: Vector2;
  position: Vector2;

  // Shows full tree with viewport indicator
  viewportRect: Rect;

  // Click to navigate
  handleClick(position: Vector2): void;

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-RESEARCH-003: Project Detail Panel
- **Description**: Detailed view of selected research project
- **Priority**: MUST

```typescript
interface ResearchDetailPanel {
  isOpen: boolean;
  selectedProject: ResearchProjectNode | null;
  position: "side" | "bottom" | "floating";

  // Content sections
  showDescription: boolean;
  showRequirements: boolean;
  showCosts: boolean;
  showUnlocks: boolean;
  showProgress: boolean;

  // Actions
  canResearch: boolean;
  canQueue: boolean;
  canCancel: boolean;

  // Methods
  startResearch(): void;
  queueResearch(): void;
  cancelResearch(): void;
}

interface ResearchRequirements {
  // From ResearchProject.prerequisites
  prerequisites: PrerequisiteStatus[];

  // From ResearchProject.requiredItems (ItemStack[])
  requiredItems: ItemRequirementStatus[];

  // From ResearchProject.requiredBuilding
  requiredBuilding: BuildingRequirementStatus | null;

  allPrerequisitesMet: boolean;
  allItemsMet: boolean;
  buildingMet: boolean;
  canStart: boolean;
}

interface PrerequisiteStatus {
  projectId: string;
  projectName: string;
  isMet: boolean;
  progressRatio: number;   // If currently researching
}

interface ItemRequirementStatus {
  itemId: string;
  itemName: string;
  required: number;
  available: number;
  isMet: boolean;
}

interface BuildingRequirementStatus {
  buildingId: string;
  buildingName: string;
  isAvailable: boolean;
}

// Display wrapper for ResearchUnlock from research-system/spec.md
// ResearchUnlock is a discriminated union:
//   | { type: "recipe"; recipeId: string }
//   | { type: "building"; buildingId: string }
//   | { type: "crop"; cropId: string }
//   | { type: "item"; itemId: string }
//   | { type: "upgrade"; upgradeId: string }
//   | { type: "ability"; abilityId: string }
//   | { type: "research"; researchId: string }
//   | { type: "knowledge"; knowledgeId: string }
//   | { type: "generated"; generationType: string }
interface ResearchUnlockDisplay {
  unlock: ResearchUnlock;  // From research-system

  // UI-computed display properties
  displayName: string;
  displayDescription: string;
  icon: Sprite;
}
```

### REQ-RESEARCH-004: Research Queue
- **Description**: Queue multiple research projects for sequential research
- **Priority**: MUST

```typescript
interface ResearchQueue {
  currentResearch: ActiveResearchState | null;
  queue: QueuedResearchState[];
  maxQueueSize: number;

  // Methods
  addToQueue(projectId: string): boolean;
  removeFromQueue(index: number): void;
  reorderQueue(fromIndex: number, toIndex: number): void;
  clearQueue(): void;
  pauseResearch(): void;
  resumeResearch(): void;
}

interface ActiveResearchState {
  project: ResearchProject;  // From research-system
  startTime: GameTime;
  progressRatio: number;     // Computed: currentProgress / progressRequired
  estimatedCompletion: GameTime;

  // Item consumption (from ResearchProject.requiredItems)
  itemsConsumed: boolean;

  // Status
  isPaused: boolean;
  isBlocked: boolean;
  blockReason: string | null;
}

interface QueuedResearchState {
  project: ResearchProject;
  addedAt: GameTime;
  estimatedStart: GameTime;
  position: number;
}

interface ResearchQueuePanel {
  isExpanded: boolean;
  position: Vector2;

  // Display current + queue
  showCurrentProgress: boolean;
  showQueueList: boolean;
  showTotalTime: boolean;

  // Drag to reorder
  dragReorderEnabled: boolean;

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-RESEARCH-005: Progress Indicators
- **Description**: Visual feedback for research progress
- **Priority**: MUST

```typescript
interface ResearchProgressDisplay {
  // Node visual states based on ResearchDisplayStatus
  nodeStyles: Map<ResearchDisplayStatus, NodeStyle>;

  // Progress visualization
  progressStyle: ProgressStyle;

  // Animations
  researchingAnimation: Animation;
  completedAnimation: Animation;
  unlockedAnimation: Animation;
}

interface NodeStyle {
  backgroundColor: Color;
  borderColor: Color;
  borderWidth: number;
  iconTint: Color;
  labelColor: Color;

  // Effects
  glow: boolean;
  glowColor: Color;
  pulse: boolean;
}

type ProgressStyle =
  | "fill"           // Fill node from bottom
  | "radial"         // Radial fill around edge
  | "overlay"        // Progress bar overlay
  | "border";        // Border fills clockwise

interface ProgressBar {
  // For current research display
  project: ResearchProject;
  progressRatio: number;  // currentProgress / progressRequired

  // Time display
  showTimeRemaining: boolean;
  showPercentage: boolean;

  // Visual
  barColor: Color;
  backgroundColor: Color;
  height: number;
}
```

### REQ-RESEARCH-006: Field Filtering
- **Description**: Filter tree by research field
- **Priority**: SHOULD

```typescript
// Uses ResearchField from research-system/spec.md:
// "agriculture" | "construction" | "crafting" | "metallurgy" | "alchemy" |
// "textiles" | "cuisine" | "machinery" | "nature" | "society" | "arcane" | "experimental"

interface FieldFilter {
  fields: ResearchField[];
  activeFields: Set<ResearchField>;

  // UI
  filterPosition: "top" | "side";
  showFieldIcons: boolean;
  showFieldCounts: boolean;

  // Methods
  toggleField(field: ResearchField): void;
  showAll(): void;
  showOnly(field: ResearchField): void;

  // Visual
  highlightFilteredNodes: boolean;
  dimUnfilteredNodes: boolean;
  dimOpacity: number;
}

interface FieldTab {
  field: ResearchField;
  icon: Sprite;
  label: string;
  color: Color;

  // Stats
  totalCount: number;
  completedCount: number;
  availableCount: number;

  isActive: boolean;
}
```

### REQ-RESEARCH-007: Search and Discovery
- **Description**: Search research projects and track discovery
- **Priority**: SHOULD

```typescript
interface ResearchSearch {
  query: string;
  results: ResearchProjectNode[];

  // Search options
  searchNames: boolean;
  searchDescriptions: boolean;
  searchUnlocks: boolean;

  // Methods
  search(query: string): ResearchProjectNode[];
  clearSearch(): void;

  // Highlight results
  highlightResults: boolean;
  panToFirstResult: boolean;
}

// UI for tracking experimental/generated research discovery
// See research-system/spec.md for ExperimentalResearch interface
interface ResearchDiscoveryTracker {
  // Hidden research that can be discovered (type: "generated" or "experimental")
  hiddenProjects: Set<string>;
  discoveredProjects: Set<string>;

  // Discovery methods
  discoverProject(projectId: string, source: DiscoverySource): void;

  // Visual
  showDiscoveryAnimation: boolean;
  discoveryNotification: boolean;
}

type DiscoverySource =
  | "exploration"    // Found in world
  | "conversation"   // Learned from agent
  | "research"       // ResearchUnlock with type: "research"
  | "experimental"   // From ExperimentalResearch breakthroughs
  | "event";         // Special event trigger
```

### REQ-RESEARCH-008: Tier/Era System
- **Description**: Group research projects by tier (1-10 complexity from ResearchProject.tier)
- **Priority**: SHOULD

```typescript
// Maps to ResearchProject.tier (1-10) from research-system/spec.md
interface ResearchTier {
  tier: number;           // 1-10 from ResearchProject.tier
  name: string;           // Display name: "Fundamentals", "Expansion", etc.
  description: string;

  // Visual
  backgroundColor: Color;
  headerStyle: TierHeaderStyle;

  // Projects in this tier
  projectIds: string[];

  // Progress
  completedCount: number;
  totalCount: number;
  isCompleted: boolean;
}

interface TierHeaderStyle {
  height: number;
  font: PixelFont;
  fontSize: number;
  color: Color;
  icon: Sprite | null;
}

interface TierDisplay {
  tiers: ResearchTier[];

  // Visual columns
  tierWidth: number;
  showTierDividers: boolean;
  showTierHeaders: boolean;

  // Progress per tier
  showTierProgress: boolean;
}
```

### REQ-RESEARCH-009: Unlock Preview
- **Description**: Preview what completing a research project unlocks
- **Priority**: SHOULD

```typescript
interface UnlockPreview {
  project: ResearchProject;
  unlockDisplays: UnlockPreviewItem[];

  // Display
  position: Vector2;
  showOnHover: boolean;
  showOnSelect: boolean;

  // Preview types by unlock type
  showBuildingPreviews: boolean;  // For { type: "building"; buildingId }
  showRecipePreviews: boolean;    // For { type: "recipe"; recipeId }
  showStatChanges: boolean;       // For { type: "upgrade"; upgradeId }
}

// UI display wrapper for ResearchUnlock discriminated union
interface UnlockPreviewItem {
  unlock: ResearchUnlock;  // From research-system
  displayName: string;
  displayDescription: string;
  icon: Sprite;

  // For buildings/recipes
  previewSprite: Sprite | null;

  // For upgrades
  statChanges: StatChange[] | null;
}

interface StatChange {
  statName: string;
  changeType: "add" | "multiply" | "set";
  value: number;
  formattedChange: string;  // "+10%", "x2", etc.
}
```

### REQ-RESEARCH-010: Research Assignments
- **Description**: Assign agents to speed up research
- **Priority**: MAY

```typescript
// See research-system/spec.md REQ-RES-010 for multi-agent collaboration mechanics
interface ResearchAssignment {
  project: ResearchProject;
  assignedAgents: EntityId[];
  maxAssignees: number;

  // Bonus calculation (from research-system):
  // total = agent1 + (agent2 * 0.7) + (agent3 * 0.5) + ...
  baseResearchRate: number;
  totalRate: number;
  collaborationBonus: number;

  // Methods
  assignAgent(agentId: EntityId): boolean;
  unassignAgent(agentId: EntityId): void;

  // Requirements based on ResearchProject.field
  preferredField: ResearchField;
  requiredBuilding: string;  // From ResearchProject.requiredBuilding
}

interface AgentResearchPanel {
  availableAgents: AgentSummary[];
  assignedAgents: AgentSummary[];

  // Sorting
  sortBy: "skill" | "name" | "availability";

  // Display
  showAgentSkills: boolean;
  showContribution: boolean;
}

interface AgentSummary {
  id: EntityId;
  name: string;
  portrait: Sprite;
  researchSkill: number;
  isAvailable: boolean;
  currentTask: string | null;
}
```

### REQ-RESEARCH-011: Keyboard Shortcuts
- **Description**: Quick access keys for research UI
- **Priority**: SHOULD

```typescript
interface ResearchShortcuts {
  toggleTreeView: string;       // Default: "T"
  closeTree: string;            // Default: "Escape"

  // Navigation
  panUp: string;                // Default: "W"
  panDown: string;              // Default: "S"
  panLeft: string;              // Default: "A"
  panRight: string;             // Default: "D"
  zoomIn: string;               // Default: "+"
  zoomOut: string;              // Default: "-"

  // Actions
  startResearch: string;        // Default: "Enter"
  queueResearch: string;        // Default: "Q"
  cancelResearch: string;       // Default: "X"

  // Quick nav
  jumpToCurrent: string;        // Default: "C"
  jumpToNext: string;           // Default: "N"
  toggleSearch: string;         // Default: "/"
}
```

## Visual Style

```typescript
interface ResearchTreeStyle {
  // Background
  backgroundColor: Color;
  gridPattern: GridPattern | null;

  // Nodes
  nodeSize: Vector2;            // 64x64
  nodeSpacing: Vector2;         // 100x80
  nodeCornerRadius: number;     // 4px for 8-bit

  // Connections
  connectionWidth: number;      // 2px
  connectionColor: Color;
  completedConnectionColor: Color;

  // Status colors
  lockedColor: Color;           // Gray
  availableColor: Color;        // White/gold
  researchingColor: Color;      // Blue/cyan
  completedColor: Color;        // Green

  // Effects
  availableGlow: boolean;
  researchingPulse: boolean;
  completedShine: boolean;

  // 8-bit styling
  pixelScale: number;
  useDithering: boolean;
}

interface GridPattern {
  type: "dots" | "lines" | "none";
  color: Color;
  spacing: number;
  opacity: number;
}
```

## State Management

```typescript
interface ResearchTreeState {
  // View state
  isOpen: boolean;
  cameraPosition: Vector2;
  cameraZoom: number;

  // Selection
  selectedProjectId: string | null;
  hoveredProjectId: string | null;

  // Filter state
  activeField: ResearchField | null;
  searchQuery: string;

  // Research state (mirrors research-system state)
  currentResearchId: string | null;
  researchQueue: string[];

  // Events - using ResearchProject from research-system
  onResearchCompleted: Event<ResearchProject>;
  onResearchStarted: Event<ResearchProject>;
  onResearchDiscovered: Event<ResearchProject>;
}
```

## Integration Points

- **Research System**: Tech definitions, progress, completion
- **Resource System**: Cost checking, consumption
- **Agent System**: Researcher assignments, skill checks
- **Notification System**: Completion alerts
- **Save System**: Research state persistence
