# City Manager UI Specification

## Overview

The City Manager UI exposes the autonomous NPC city director to the player, providing visibility into city statistics, strategic priorities, and AI decision-making. Players can observe how the city director manages hundreds of autonomic NPCs through LLM-based or rule-based decision broadcasts.

This system makes the invisible city management layer visible and interactive, turning background automation into an observable strategic layer.

## Version

0.1.0

## Dependencies

- `governance-system/spec.md` - City governance mechanics (CityDirectorComponent, CityDirectorSystem)
- `agent-system/spec.md` - Autonomic NPC behavior
- `ui-system/notifications.md` - City event notifications
- `rendering-system/spec.md` - Unified component rendering (RenderableComponent)

## Requirements

### REQ-CITY-001: City Overview Panel
- **Description**: Real-time dashboard of city statistics and status
- **Priority**: MUST

```typescript
interface CityOverviewPanel {
  isOpen: boolean;

  // Core city data from CityDirectorComponent
  cityDirector: CityDirectorDisplayInfo;

  // Real-time statistics (updated every 10 seconds by CityDirectorSystem)
  stats: CityStatsDisplay;

  // Strategic priorities (broadcast to autonomic NPCs)
  priorities: CityPrioritiesDisplay;

  // Decision history (from LLM or rule-based system)
  recentDecisions: CityDecisionDisplay[];

  // Methods
  open(): void;
  close(): void;
  refresh(): void;

  render(ctx: CanvasRenderingContext2D): void;
}

// Display wrapper for CityDirectorComponent
interface CityDirectorDisplayInfo {
  cityId: string;
  cityName: string;

  // Geographic bounds
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };

  // Management mode
  decisionMode: 'llm' | 'rule-based';
  llmEnabled: boolean;

  // Timing
  lastMeetingTime: number;  // Game ticks
  nextMeetingTime: number;  // Game ticks
  meetingInterval: number;  // Ticks between director meetings

  // NPC management
  agentRoster: string[];    // Agent IDs in this city
  containmentEnabled: boolean;
}

// Real-time city statistics (from CityDirectorComponent.currentStats)
interface CityStatsDisplay {
  // Population breakdown
  population: number;
  autonomicNpcCount: number;
  llmAgentCount: number;

  // Infrastructure
  totalBuildings: number;
  housingCapacity: number;
  storageCapacity: number;
  productionBuildings: number;

  // Resources
  foodSupply: number;        // Days of food remaining
  foodSupplyStatus: ResourceStatus;
  woodSupply: number;
  stoneSupply: number;

  // Threats
  nearbyThreats: number;
  recentDeaths: number;

  // Computed display values
  housingUtilization: number;  // population / housingCapacity
  foodTrend: 'increasing' | 'stable' | 'decreasing';
}

type ResourceStatus =
  | 'critical'   // < 3 days
  | 'low'        // 3-7 days
  | 'adequate'   // 7-14 days
  | 'abundant';  // > 14 days

// Strategic priorities broadcast to autonomic NPCs
interface CityPrioritiesDisplay {
  // 7-category priority system (sums to 1.0)
  gathering: number;    // 0-1, wood/stone/food collection
  building: number;     // 0-1, construction
  farming: number;      // 0-1, agriculture
  social: number;       // 0-1, community building
  exploration: number;  // 0-1, scouting
  rest: number;         // 0-1, recovery
  magic: number;        // 0-1, magical research

  // Current city focus (from decision system)
  focus: CityFocus;
  focusDescription: string;

  // Influence on NPCs
  cityInfluence: number;  // 0-1, how much city overrides personal priorities

  // Visual representation
  priorityBars: PriorityBarDisplay[];
}

type CityFocus =
  | 'survival'    // Critical food shortage
  | 'growth'      // Need more housing
  | 'security'    // Threats or deaths
  | 'prosperity'  // Stable with surplus
  | 'exploration' // Few buildings
  | 'balanced';   // Even distribution

interface PriorityBarDisplay {
  category: string;       // 'gathering', 'building', etc.
  value: number;          // 0-1
  percentage: string;     // "25%"
  color: Color;
  icon: Sprite;
}

// City director decision (from LLM or rule-based inference)
interface CityDecisionDisplay {
  timestamp: number;      // Game ticks when decision made
  dayNumber: number;      // Game day

  // Decision source
  source: 'llm' | 'rule-based';

  // Decision content
  focus: CityFocus;
  priorities: Record<string, number>;  // Category -> weight
  reasoning: string;      // LLM reasoning or rule description
  concerns: string[];     // Issues that triggered this decision

  // Context at time of decision
  populationAtDecision: number;
  foodSupplyAtDecision: number;
  threatsAtDecision: number;
}
```

### REQ-CITY-002: City Boundary Visualization
- **Description**: Visual overlay showing city territorial bounds on the map
- **Priority**: MUST

```typescript
interface CityBoundaryRenderer {
  // Render city bounds on map
  renderBounds(
    ctx: CanvasRenderingContext2D,
    cityDirector: CityDirectorDisplayInfo,
    camera: Camera
  ): void;

  // Render city center icon
  renderCityCenter(
    ctx: CanvasRenderingContext2D,
    cityDirector: CityDirectorDisplayInfo,
    camera: Camera
  ): void;

  // Visual settings
  boundsColor: Color;         // Default: gold
  boundsLineWidth: number;    // Default: 2
  boundsLineDash: number[];   // Default: [10, 5]
  centerIconSprite: string;   // Sprite ID for city center
  centerIconSize: number;     // Multiplier for center icon
}

// Integration with RenderableComponent
interface CityDirectorRenderableIntegration {
  // Add renderable component to city director entity
  addRenderableToDirector(cityDirectorEntity: Entity): void;

  // Position at city center
  addPositionToDirector(
    cityDirectorEntity: Entity,
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): void;
}
```

### REQ-CITY-003: Priority Influence Display
- **Description**: Show how city priorities blend with individual NPC priorities
- **Priority**: SHOULD

```typescript
interface PriorityInfluenceDisplay {
  // Show priority blending for a specific NPC
  selectedNpc: string | null;  // Agent ID

  // Priority breakdown
  cityPriorities: Record<string, number>;      // From city director
  personalPriorities: Record<string, number>;  // From NPC skills
  effectivePriorities: Record<string, number>; // Blended result

  // Blending formula visualization
  cityInfluence: number;     // 0.4 default
  personalInfluence: number; // 0.6 default

  // Methods
  selectNpc(agentId: string): void;
  clearSelection(): void;

  render(ctx: CanvasRenderingContext2D): void;
}

interface PriorityBlendVisualization {
  category: string;

  // Components
  cityComponent: number;      // city priority × 0.4
  personalComponent: number;  // personal priority × 0.6
  effectiveValue: number;     // final blended priority

  // Visual bars
  cityBar: BarDisplay;
  personalBar: BarDisplay;
  effectiveBar: BarDisplay;
}

interface BarDisplay {
  value: number;
  width: number;
  color: Color;
  label: string;
}
```

### REQ-CITY-004: Decision Timeline
- **Description**: Historical view of city director decisions over time
- **Priority**: SHOULD

```typescript
interface DecisionTimeline {
  // Decisions from CityDirectorComponent.decisionHistory
  decisions: CityDecisionDisplay[];

  // Timeline display
  viewMode: 'timeline' | 'list';
  timeRange: number;  // Days to show

  // Filtering
  filterByFocus: CityFocus | null;
  filterBySource: 'llm' | 'rule-based' | 'all';

  // Selection
  selectedDecision: CityDecisionDisplay | null;

  // Methods
  selectDecision(decision: CityDecisionDisplay): void;
  filterByFocus(focus: CityFocus): void;
  setTimeRange(days: number): void;

  render(ctx: CanvasRenderingContext2D): void;
}

interface DecisionTimelineEvent {
  decision: CityDecisionDisplay;

  // Timeline position
  position: Vector2;

  // Visual markers
  icon: Sprite;
  color: Color;  // Based on focus type

  // Tooltip on hover
  tooltip: DecisionTooltip;
}

interface DecisionTooltip {
  focus: string;
  reasoning: string;
  stats: {
    population: number;
    foodDays: number;
    threats: number;
  };
}
```

### REQ-CITY-005: Profession Management Display
- **Description**: Show and manage city professions (reporters, actors, DJs, etc.)
- **Priority**: MAY

```typescript
interface ProfessionManagementPanel {
  // Professions from CityDirectorComponent.professions
  professions: ProfessionDisplay[];

  // Selection
  selectedProfession: ProfessionDisplay | null;

  // Methods
  selectProfession(profession: ProfessionDisplay): void;
  viewProfessionalRoster(professionId: string): void;

  render(ctx: CanvasRenderingContext2D): void;
}

interface ProfessionDisplay {
  id: string;
  name: string;              // 'reporter', 'actor', 'dj', etc.
  displayName: string;       // 'News Reporter', 'Actor', 'Radio DJ'

  // Quotas from CityDirectorComponent.professions
  currentCount: number;      // How many NPCs have this profession
  targetQuota: number;       // Desired number
  quotaStatus: QuotaStatus;

  // Roster
  roster: string[];          // Agent IDs with this profession

  // Content production tracking
  contentProduced: ContentProductionStats | null;

  // Icon
  icon: Sprite;
}

type QuotaStatus = 'understaffed' | 'adequate' | 'overstaffed';

interface ContentProductionStats {
  // For reporters
  articlesPublished?: number;

  // For actors
  episodesProduced?: number;

  // For DJs
  broadcastsAired?: number;
}
```

### REQ-CITY-006: Interactive Priority Adjustment
- **Description**: Allow player to influence city priorities (optional advanced feature)
- **Priority**: MAY

```typescript
interface PriorityAdjustmentInterface {
  // Current priorities (read from city director)
  currentPriorities: Record<string, number>;

  // Player adjustments (applied as modifiers)
  playerAdjustments: Record<string, number>;  // -0.2 to +0.2

  // Resulting priorities (normalized to sum to 1.0)
  effectivePriorities: Record<string, number>;

  // Adjustment controls
  sliders: PrioritySlider[];

  // Validation
  isValid: boolean;
  validationErrors: string[];

  // Methods
  adjustPriority(category: string, delta: number): void;
  resetAdjustments(): void;
  applyAdjustments(): void;  // Emit event for CityDirectorSystem

  render(ctx: CanvasRenderingContext2D): void;
}

interface PrioritySlider {
  category: string;
  currentValue: number;      // Base priority
  adjustment: number;        // Player modifier
  effectiveValue: number;    // After normalization

  // Slider UI
  minValue: number;          // -0.2
  maxValue: number;          // +0.2
  position: Vector2;
  width: number;

  // Visual feedback
  color: Color;
  icon: Sprite;
}

// Event emitted when player adjusts priorities
interface PriorityAdjustmentEvent {
  cityId: string;
  adjustments: Record<string, number>;
  effectivePriorities: Record<string, number>;
  timestamp: number;
}
```

### REQ-CITY-007: City Stats Widget (HUD)
- **Description**: Minimal city stats overlay on main game view
- **Priority**: SHOULD

```typescript
interface CityStatsWidget {
  // Compact display for HUD
  isVisible: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  // Summary stats
  population: number;
  foodDays: number;
  foodStatus: ResourceStatus;
  currentFocus: CityFocus;

  // Click to open full panel
  onClick: () => void;

  render(ctx: CanvasRenderingContext2D): void;
}

interface CompactCityDisplay {
  // Icon + number format
  populationIcon: Sprite;
  populationCount: string;

  foodIcon: Sprite;
  foodDays: string;
  foodColor: Color;  // Based on ResourceStatus

  focusIcon: Sprite;
  focusLabel: string;

  // Layout
  backgroundColor: Color;
  padding: number;
  iconSize: number;
}
```

### REQ-CITY-008: Keyboard Shortcuts
- **Description**: Quick access for city manager UI
- **Priority**: SHOULD

```typescript
interface CityManagerShortcuts {
  // Window
  toggleCityManager: string;    // Default: "C"
  closeCityManager: string;     // Default: "Escape"

  // Navigation
  nextSection: string;          // Default: "Tab"
  previousSection: string;      // Default: "Shift+Tab"

  // Sections
  openStats: string;            // Default: "S"
  openPriorities: string;       // Default: "P"
  openDecisions: string;        // Default: "D"
  openProfessions: string;      // Default: "R" (roles)

  // Map interaction
  toggleCityBounds: string;     // Default: "B"
  focusOnCity: string;          // Default: "H" (home)
}
```

## Visual Style

```typescript
interface CityManagerStyle {
  // Panel
  backgroundColor: Color;        // Dark semi-transparent
  headerColor: Color;            // Gold accent
  sectionBackground: Color;

  // City boundary visualization
  boundaryColor: Color;          // Gold (#FFD700)
  boundaryLineWidth: number;     // 2px
  boundaryLineDash: number[];    // [10, 5]

  // Priority colors (7 categories)
  priorityColors: {
    gathering: Color;    // Brown
    building: Color;     // Gray
    farming: Color;      // Green
    social: Color;       // Purple
    exploration: Color;  // Blue
    rest: Color;         // Cyan
    magic: Color;        // Magenta
  };

  // Focus colors (6 types)
  focusColors: {
    survival: Color;     // Red
    growth: Color;       // Yellow
    security: Color;     // Orange
    prosperity: Color;   // Green
    exploration: Color;  // Blue
    balanced: Color;     // White
  };

  // Resource status colors
  resourceStatusColors: {
    critical: Color;     // Red
    low: Color;          // Orange
    adequate: Color;     // Yellow
    abundant: Color;     // Green
  };

  // Typography
  titleFont: PixelFont;
  bodyFont: PixelFont;
  statFont: PixelFont;   // For numbers

  // 8-bit styling
  pixelScale: number;
}
```

## State Management

```typescript
interface CityManagerState {
  // Core data from CityDirectorComponent
  cityDirector: CityDirectorDisplayInfo | null;

  // View state
  isOpen: boolean;
  activeSection: CitySection;

  // Display toggles
  showCityBounds: boolean;
  showCenterIcon: boolean;
  showStatsWidget: boolean;

  // Selection
  selectedNpc: string | null;         // For priority influence display
  selectedDecision: CityDecisionDisplay | null;
  selectedProfession: ProfessionDisplay | null;

  // Filters
  decisionTimeRange: number;          // Days
  decisionFocusFilter: CityFocus | null;

  // Player adjustments (if interactive mode enabled)
  priorityAdjustments: Record<string, number> | null;

  // Events
  onCitySelected: Event<string>;      // City ID
  onPriorityAdjusted: Event<PriorityAdjustmentEvent>;
  onNpcSelected: Event<string>;       // Agent ID
  onDecisionSelected: Event<CityDecisionDisplay>;
  onBoundsToggled: Event<boolean>;
}

type CitySection =
  | 'overview'      // Main stats dashboard
  | 'priorities'    // Priority breakdown
  | 'decisions'     // Decision timeline
  | 'professions'   // Profession management
  | 'npcs';         // Autonomic NPC roster

// Integration with unified rendering system
interface CityManagerRenderingIntegration {
  // Add RenderableComponent to city director entity
  ensureCityDirectorRenderable(world: World): void;

  // Render city bounds overlay
  renderCityBoundsOverlay(
    ctx: CanvasRenderingContext2D,
    world: World,
    camera: Camera
  ): void;

  // Render city center icon
  renderCityCenterIcon(
    ctx: CanvasRenderingContext2D,
    cityDirector: Entity,
    camera: Camera
  ): void;
}
```

## Integration Points

- **CityDirectorSystem**: Real-time stats updates (every 10 seconds)
- **CityDirectorComponent**: All city data (stats, priorities, decisions, professions)
- **Unified Rendering System**: RenderableComponent for city visualization
- **Agent System**: Autonomic NPC priority blending
- **Notification System**: City event alerts (food critical, threats detected, etc.)
- **Event System**: Player priority adjustments (optional)

## Implementation Phases

### Phase 1: Basic Visibility (MVP)
- REQ-CITY-001: City Overview Panel (stats display)
- REQ-CITY-002: City Boundary Visualization
- REQ-CITY-007: City Stats Widget (HUD)

### Phase 2: Priority Transparency
- REQ-CITY-003: Priority Influence Display
- REQ-CITY-004: Decision Timeline

### Phase 3: Advanced Features
- REQ-CITY-005: Profession Management Display
- REQ-CITY-006: Interactive Priority Adjustment (optional)

### Phase 4: Polish
- REQ-CITY-008: Keyboard Shortcuts
- Visual effects, animations, tooltips

## Technical Notes

### Performance Considerations
- City stats update every 10 seconds (not every frame)
- Cache computed display values (percentages, trends)
- Lazy-render decision timeline (only visible range)
- Limit NPC roster display to visible window (pagination)

### Data Flow
```
CityDirectorSystem (updates every 10 seconds)
  ↓
CityDirectorComponent (currentStats, priorities, decisionHistory)
  ↓
CityManagerState (reactive state management)
  ↓
CityOverviewPanel / CityStatsWidget / CityBoundaryRenderer
  ↓
Canvas rendering
```

### Event Flow
```
User interaction (click, keyboard)
  ↓
CityManagerState (state update)
  ↓
Event emission (onPriorityAdjusted, onNpcSelected, etc.)
  ↓
CityDirectorSystem (optional: apply player adjustments)
  ↓
Update broadcast to autonomic NPCs
```

## Success Criteria

- Player can view city statistics in real-time
- Player can observe city director decisions and reasoning
- Player can see how city priorities influence individual NPCs
- City boundaries are clearly visible on the map
- City manager UI follows existing panel patterns (DevPanel, AgentInfoPanel)
- No performance impact (updates are throttled, rendering is optimized)
- UI is accessible via keyboard shortcuts
- All data is read from CityDirectorComponent (no duplicate state)

## Future Enhancements

- **Multi-city support**: Display and compare multiple cities
- **City comparison**: Side-by-side stats of different cities
- **Priority scheduling**: Queue priority changes for future days
- **NPC assignment**: Manually assign NPCs to professions
- **City founding**: UI for creating new cities with director
- **City diplomacy**: Inter-city relationships and trade
- **Historical analytics**: Charts/graphs of city growth over time
