# Relationship Viewer UI Specification

## Overview

The Relationship Viewer UI provides visualization of social connections between agents, displaying relationship types, dimensions, and history. Features a social graph view, relationship details panel, and community overview.

## Version

0.1.0

## Dependencies

- `agent-system/relationship-system.md` - Relationship mechanics (Relationship, RelationshipDimensions, RelationshipType, RelationshipFlag, RelationshipEvent, SocialNetwork, Reputation)
- `agent-system/spec.md` - Agent definitions
- `ui-system/agent-roster.md` - Agent listing

## Requirements

### REQ-RELVIEW-001: Social Graph View
- **Description**: Interactive node graph showing agent relationships
- **Priority**: MUST

```typescript
// Re-export from relationship-system for reference
import type {
  Relationship, RelationshipDimensions, RelationshipType, RelationshipFlag,
  RelationshipEvent, SocialNetwork, Reputation,
  // Alien relationship types
  ManchiRelationship, PackMindRelationship, HiveRelationship,
  CrossPsychologyRelationship
} from "agent-system/relationship-system";

interface SocialGraphView {
  isOpen: boolean;

  // Graph data - using SocialNetwork from relationship-system
  socialNetwork: SocialNetwork;  // Has nodes, edges, clusters, bridges, etc.

  // Display wrappers
  nodes: AgentNodeDisplay[];
  edges: RelationshipEdgeDisplay[];

  // View state
  camera: GraphCamera;
  selectedNode: AgentNodeDisplay | null;
  hoveredNode: AgentNodeDisplay | null;
  selectedEdge: RelationshipEdgeDisplay | null;

  // Layout
  layoutMode: GraphLayoutMode;
  autoLayout: boolean;

  // Filtering
  filters: RelationshipFilterState;

  // Methods
  open(): void;
  close(): void;
  selectAgent(agentId: string): void;
  centerOnAgent(agentId: string): void;
  recalculateLayout(): void;

  render(ctx: CanvasRenderingContext2D): void;
}

// UI display wrapper for agent in social graph
interface AgentNodeDisplay {
  agentId: string;
  name: string;
  portrait: Sprite;

  // Graph position
  position: Vector2;
  velocity: Vector2;        // For physics layout

  // Visual state
  isSelected: boolean;
  isHovered: boolean;
  isHighlighted: boolean;
  opacity: number;

  // Stats computed from relationships
  relationshipCount: number;
  averageAffection: number;

  // From SocialNetwork analysis
  isBridge: boolean;        // From socialNetwork.bridges
  isInfluencer: boolean;    // From socialNetwork.influencers
  isIsolated: boolean;      // From socialNetwork.isolated
  clusterIndex: number | null;  // Which cluster in socialNetwork.clusters
}

// UI display wrapper for Relationship edge
interface RelationshipEdgeDisplay {
  // From relationship-system
  relationship: Relationship;  // Core relationship data

  fromNode: AgentNodeDisplay;
  toNode: AgentNodeDisplay;

  // Visual properties computed from Relationship
  lineWidth: number;        // Based on relationship dimensions
  color: Color;             // Based on relationship.type
  style: EdgeStyle;         // Based on relationship state

  // Labels
  showLabel: boolean;
  label: string;            // From relationship.type

  // State
  isSelected: boolean;
  isHighlighted: boolean;

  // For asymmetric relationships
  showAsymmetry: boolean;
  asymmetryIndicator: AsymmetryDirection | null;
}

type AsymmetryDirection = "from_stronger" | "to_stronger";

type EdgeStyle =
  | "solid"          // Normal relationship
  | "dashed"         // Weak/new relationship (low familiarity)
  | "double"         // Strong relationship (high all dimensions)
  | "wavy";          // Conflicted relationship (trajectory: declining)

type GraphLayoutMode =
  | "force"          // Force-directed physics
  | "radial"         // Selected agent in center
  | "hierarchical"   // Family tree style
  | "circular"       // All agents in circle
  | "manual";        // User-positioned
```

### REQ-RELVIEW-002: Graph Navigation
- **Description**: Pan, zoom, and navigation for graph view
- **Priority**: MUST

```typescript
interface GraphCamera {
  position: Vector2;
  zoom: number;
  minZoom: number;
  maxZoom: number;

  // Bounds
  graphBounds: Rect;
  viewportSize: Vector2;

  // Methods
  pan(delta: Vector2): void;
  zoomTo(level: number, focus?: Vector2): void;
  centerOn(position: Vector2): void;
  fitToView(nodes?: AgentNode[]): void;
}

interface GraphNavigation {
  // Input
  dragToPan: boolean;
  scrollToZoom: boolean;
  doubleClickToCenter: boolean;

  // Node interaction
  clickToSelect: boolean;
  dragNodes: boolean;       // Manual repositioning

  // Quick navigation
  jumpToAgent(agentId: string): void;
  showAllRelationshipsOf(agentId: string): void;
  focusOnRelationship(relationshipId: string): void;
}
```

### REQ-RELVIEW-003: Relationship Details Panel
- **Description**: Detailed view of a selected relationship
- **Priority**: MUST

```typescript
// Uses Relationship, RelationshipDimensions, RelationshipType, RelationshipFlag
// from relationship-system.md

// Relationship from relationship-system:
// - id, agents: [string, string], type: RelationshipType
// - dimensions: { [agentId: string]: RelationshipDimensions }
// - formed, lastInteraction, interactionCount
// - trajectory: "improving" | "stable" | "declining"
// - recentEvents: RelationshipEvent[], flags: RelationshipFlag[]

// RelationshipDimensions from relationship-system:
// - affection, trust, respect, familiarity, comfort (0-100 each)
// - positiveMemories, negativeMemories (counts)

interface RelationshipDetailsPanel {
  isOpen: boolean;
  relationship: Relationship | null;  // From relationship-system
  position: "side" | "bottom" | "floating";

  // Content sections
  showDimensions: boolean;
  showHistory: boolean;
  showEvents: boolean;
  showFlags: boolean;

  // Methods
  openForRelationship(relationship: Relationship): void;
  close(): void;
}

// UI display for RelationshipDimensions (asymmetric per agent)
interface RelationshipDimensionsDisplay {
  // Both agents' perspectives - from relationship.dimensions
  agent1View: DimensionSetDisplay;
  agent2View: DimensionSetDisplay;

  // Visual
  showComparison: boolean;
  showAsymmetry: boolean;
  highlightDifferences: boolean;
}

// UI display wrapper for RelationshipDimensions
interface DimensionSetDisplay {
  agentId: string;
  agentName: string;

  // From RelationshipDimensions in relationship-system
  dimensions: RelationshipDimensions;

  // Core dimensions (0-100) - display wrappers
  affection: DimensionBarDisplay;
  trust: DimensionBarDisplay;
  respect: DimensionBarDisplay;
  familiarity: DimensionBarDisplay;
  comfort: DimensionBarDisplay;

  // Memory counts display
  positiveMemoriesCount: number;  // From dimensions.positiveMemories
  negativeMemoriesCount: number;  // From dimensions.negativeMemories
}

interface DimensionBarDisplay {
  name: string;
  value: number;           // 0-100 from RelationshipDimensions
  trend: "improving" | "stable" | "declining";  // Computed from history
  color: Color;

  // Change indicator
  recentChange: number;    // How much changed recently

  render(ctx: CanvasRenderingContext2D, position: Vector2): void;
}
```

### REQ-RELVIEW-004: Relationship Filtering
- **Description**: Filter visible relationships by criteria
- **Priority**: MUST

```typescript
// RelationshipType from relationship-system.md:
// "stranger" | "acquaintance" | "colleague" | "neighbor" |
// "friend" | "close_friend" | "best_friend" |
// "rival" | "enemy" |
// "mentor" | "student" |
// "romantic_interest" | "partner" |
// "family" | "business_partner"

interface RelationshipFilterState {
  // Type filters - uses RelationshipType from relationship-system
  showTypes: Set<RelationshipType>;
  hideTypes: Set<RelationshipType>;

  // Strength filters - based on RelationshipDimensions
  minAffection: number;
  maxAffection: number;
  minTrust: number;
  minFamiliarity: number;

  // Agent filters
  focusAgent: string | null;    // Show only this agent's relationships
  includeAgents: Set<string>;

  // Flag filters - uses RelationshipFlag from relationship-system
  requiredFlags: Set<RelationshipFlag>;
  excludeFlags: Set<RelationshipFlag>;

  // Special filters
  showOnlyFamily: boolean;        // type === "family"
  showOnlyRomantic: boolean;      // type === "romantic_interest" | "partner"
  showOnlyNegative: boolean;      // type === "rival" | "enemy"
  showOnlyRecent: boolean;        // lastInteraction within threshold
  showOnlyDeclining: boolean;     // trajectory === "declining"

  // Methods
  applyFilters(edges: RelationshipEdgeDisplay[]): RelationshipEdgeDisplay[];
  clearFilters(): void;
}

interface FilterPanel {
  filters: RelationshipFilterState;

  // Quick filter buttons
  quickFilters: QuickRelationshipFilter[];

  // Display
  showActiveFilters: boolean;
  showFilterCount: number;
}

interface QuickRelationshipFilter {
  id: string;
  label: string;
  icon: Sprite;
  filterTypes?: RelationshipType[];  // From relationship-system
  filterFlags?: RelationshipFlag[];  // From relationship-system
  apply(): void;
}

// Default quick filters using RelationshipType values
const RELATIONSHIP_QUICK_FILTERS: QuickRelationshipFilter[] = [
  { id: "family", label: "Family Only", filterTypes: ["family"] },
  { id: "friends", label: "Friends", filterTypes: ["friend", "close_friend", "best_friend"] },
  { id: "conflicts", label: "Conflicts", filterTypes: ["rival", "enemy"] },
  { id: "romantic", label: "Romantic", filterTypes: ["romantic_interest", "partner"] },
  { id: "recent", label: "Recent Activity" },
  { id: "strong", label: "Strong Bonds" },
  { id: "broken_trust", label: "Broken Trust", filterFlags: ["broken_trust"] }
];
```

### REQ-RELVIEW-005: Edge Visualization
- **Description**: Visual encoding of relationship properties
- **Priority**: MUST

```typescript
interface EdgeVisualization {
  // Color based on relationship type
  typeColors: Map<RelationshipType, Color>;

  // Width based on strength
  minWidth: number;
  maxWidth: number;
  widthScale: (relationship: Relationship) => number;

  // Style based on state
  positiveStyle: EdgeStyle;
  negativeStyle: EdgeStyle;
  conflictedStyle: EdgeStyle;

  // Asymmetry visualization
  showAsymmetry: boolean;
  asymmetryIndicator: AsymmetryIndicator;

  // Labels
  showRelationshipType: boolean;
  showStrengthValue: boolean;
}

interface AsymmetryIndicator {
  type: "arrow" | "gradient" | "thickness";

  // Shows direction of stronger feeling
  strongerDirection: "from" | "to";
  asymmetryAmount: number;
}

interface RelationshipTypeColors {
  stranger: Color;           // Gray
  acquaintance: Color;       // Light gray
  colleague: Color;          // Blue
  friend: Color;             // Green
  close_friend: Color;       // Bright green
  best_friend: Color;        // Gold
  rival: Color;              // Orange
  enemy: Color;              // Red
  romantic_interest: Color;  // Pink
  partner: Color;            // Magenta
  family: Color;             // Purple
  mentor: Color;             // Cyan
}
```

### REQ-RELVIEW-006: Relationship History
- **Description**: Timeline of relationship events
- **Priority**: SHOULD

```typescript
// RelationshipEvent from relationship-system.md:
// - id, relationship, type: EventType, description, timestamp
// - impact: RelationshipImpact (immediate dimensions + lasting flags + storySignificance)
// - memorable, anniversary?

// EventType from relationship-system.md:
// "first_meeting" | "became_friends" | "major_help" | "betrayal" |
// "shared_success" | "shared_failure" | "confession" | "gift_memorable" |
// "argument_serious" | "reconciliation" | "romantic_beginning" | "breakup"

interface RelationshipHistoryDisplay {
  relationship: Relationship;  // From relationship-system

  // Uses RelationshipEvent[] from relationship.recentEvents
  events: RelationshipEventDisplay[];

  // Timeline
  timeline: TimelineView;

  // Filtering - uses EventType from relationship-system
  eventTypes: Set<EventType>;
  dateRange: DateRange | null;

  // Display
  maxEventsShown: number;
  showMilestones: boolean;      // Events with memorable: true
}

// UI display wrapper for RelationshipEvent from relationship-system
interface RelationshipEventDisplay {
  // From relationship-system
  event: RelationshipEvent;

  // Computed display properties
  typeIcon: Sprite;
  typeColor: Color;
  formattedTimestamp: string;
  impactSummary: string;        // e.g., "+15 trust, +10 affection"

  // From event.impact
  dimensionChanges: ImpactDisplay[];
  newFlags: RelationshipFlag[];  // From event.impact.lasting
  isSignificant: boolean;        // event.impact.storySignificance > threshold
}

interface ImpactDisplay {
  dimension: string;
  change: number;
  formattedChange: string;     // "+15", "-10"
  color: Color;                // Green for positive, red for negative
}

interface TimelineView {
  events: RelationshipEventDisplay[];

  // Visual
  orientation: "horizontal" | "vertical";
  showDates: boolean;
  showIcons: boolean;

  // Highlight anniversaries
  showAnniversaries: boolean;

  // Interaction
  selectEvent(event: RelationshipEventDisplay): void;
  scrollToEvent(event: RelationshipEventDisplay): void;
}
```

### REQ-RELVIEW-007: Community Overview
- **Description**: Summary statistics of village relationships
- **Priority**: SHOULD

```typescript
// Uses SocialNetwork from relationship-system.md:
// - nodes, edges (Relationship[])
// - clusters (friend groups), bridges, influencers, isolated
// - density, averagePathLength, clusteringCoefficient

interface CommunityOverviewDisplay {
  // From SocialNetwork in relationship-system
  socialNetwork: SocialNetwork;

  // Population stats
  totalAgents: number;                     // socialNetwork.nodes.length
  totalRelationships: number;              // socialNetwork.edges.length
  averageRelationshipsPerAgent: number;

  // Network metrics from SocialNetwork
  density: number;                         // From socialNetwork.density
  clusteringCoefficient: number;           // From socialNetwork.clusteringCoefficient
  averagePathLength: number;               // From socialNetwork.averagePathLength

  // Relationship breakdown by RelationshipType
  relationshipsByType: Map<RelationshipType, number>;

  // Health metrics
  averageAffection: number;
  averageTrust: number;
  conflictCount: number;                   // Count of type === "enemy" | "rival"
  isolatedAgents: string[];                // From socialNetwork.isolated

  // Notable agents from SocialNetwork
  bridgeAgents: string[];                  // From socialNetwork.bridges
  influencers: string[];                   // From socialNetwork.influencers
  clusters: string[][];                    // From socialNetwork.clusters

  // Trends
  newRelationshipsToday: number;
  relationshipsImproving: number;          // Count with trajectory: "improving"
  relationshipsDeclining: number;          // Count with trajectory: "declining"
}

interface CommunityOverviewPanel {
  overview: CommunityOverviewDisplay;

  // Sections
  showPopulationStats: boolean;
  showNetworkMetrics: boolean;             // Density, clustering, etc.
  showBreakdown: boolean;
  showHealthMetrics: boolean;
  showNotableAgents: boolean;              // Bridges, influencers
  showTrends: boolean;

  // Charts
  showRelationshipChart: boolean;
  chartType: "pie" | "bar";

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-RELVIEW-008: Agent Focus Mode
- **Description**: View centered on a single agent
- **Priority**: SHOULD

```typescript
interface AgentFocusMode {
  focusAgent: string;

  // Layout
  layout: "radial" | "list";

  // Visible relationships
  relationships: Relationship[];
  sortBy: "type" | "affection" | "trust" | "recent";

  // Depth
  showSecondDegree: boolean;   // Friends of friends
  maxDepth: number;

  // Methods
  setFocusAgent(agentId: string): void;
  expandRelationship(relationship: Relationship): void;
}

interface RadialFocusLayout {
  centerAgent: AgentNode;
  innerRing: AgentNode[];      // Direct relationships
  outerRing: AgentNode[];      // Second-degree (if enabled)

  ringRadius: number[];
  angleSpacing: number;
}

interface RelationshipList {
  agent: AgentNode;
  relationships: RelationshipListItem[];

  // Grouping
  groupBy: "type" | "none";
  groups: RelationshipGroup[];
}

interface RelationshipListItem {
  relationship: Relationship;
  otherAgent: AgentNode;

  // Summary
  type: RelationshipType;
  affection: number;
  trust: number;
  trajectory: "improving" | "stable" | "declining";

  // Quick actions
  actions: QuickAction[];
}

interface RelationshipGroup {
  type: RelationshipType;
  label: string;
  items: RelationshipListItem[];
  isExpanded: boolean;
}
```

### REQ-RELVIEW-009: Relationship Flags Display
- **Description**: Show special relationship states
- **Priority**: SHOULD

```typescript
interface RelationshipFlagsDisplay {
  flags: RelationshipFlag[];

  // Visual
  showAsIcons: boolean;
  showAsText: boolean;
  position: "inline" | "section";

  // Tooltips
  showTooltips: boolean;
}

interface FlagIcon {
  flag: RelationshipFlag;
  icon: Sprite;
  color: Color;
  tooltip: string;
}

// Flag icon mappings
const FLAG_ICONS: Map<RelationshipFlag, FlagIcon> = new Map([
  ["has_secret", { icon: "lock", color: purple, tooltip: "Shares a secret" }],
  ["owes_favor", { icon: "handshake", color: gold, tooltip: "Owes a favor" }],
  ["broken_trust", { icon: "broken_heart", color: red, tooltip: "Trust was broken" }],
  ["saved_life", { icon: "shield", color: green, tooltip: "Saved their life" }],
  ["shared_trauma", { icon: "storm", color: gray, tooltip: "Shared difficult experience" }],
  ["romantic_history", { icon: "rose", color: pink, tooltip: "Past romantic involvement" }],
  ["reconciled", { icon: "dove", color: white, tooltip: "Overcame past conflict" }]
]);
```

### REQ-RELVIEW-010: Interaction from Graph
- **Description**: Actions available from relationship viewer
- **Priority**: MAY

```typescript
interface GraphInteractions {
  // Node actions
  nodeActions: NodeAction[];

  // Edge actions
  edgeActions: EdgeAction[];

  // Methods
  getActionsForNode(node: AgentNode): NodeAction[];
  getActionsForEdge(edge: RelationshipEdge): EdgeAction[];
}

interface NodeAction {
  id: string;
  label: string;
  icon: Sprite;

  execute(node: AgentNode): void;
}

const NODE_ACTIONS: NodeAction[] = [
  { id: "focus_camera", label: "Go To", icon: "camera" },
  { id: "open_roster", label: "View in Roster", icon: "list" },
  { id: "inspect", label: "Inspect", icon: "magnifier" },
  { id: "focus_relationships", label: "Focus Relationships", icon: "connections" }
];

interface EdgeAction {
  id: string;
  label: string;
  icon: Sprite;

  execute(edge: RelationshipEdge): void;
}

const EDGE_ACTIONS: EdgeAction[] = [
  { id: "view_details", label: "View Details", icon: "info" },
  { id: "view_history", label: "View History", icon: "clock" },
  { id: "arrange_meeting", label: "Arrange Meeting", icon: "calendar" }
];
```

### REQ-RELVIEW-011: Keyboard Shortcuts
- **Description**: Quick access for relationship viewer
- **Priority**: SHOULD

```typescript
interface RelationshipViewerShortcuts {
  // Window
  toggleViewer: string;        // Default: "R"
  closeViewer: string;         // Default: "Escape"

  // Navigation
  panUp: string;               // Default: "W"
  panDown: string;             // Default: "S"
  panLeft: string;             // Default: "A"
  panRight: string;            // Default: "D"
  zoomIn: string;              // Default: "+"
  zoomOut: string;             // Default: "-"

  // Selection
  selectNext: string;          // Default: "Tab"
  selectPrevious: string;      // Default: "Shift+Tab"
  centerOnSelected: string;    // Default: "C"

  // Layout
  cycleLayout: string;         // Default: "L"
  resetLayout: string;         // Default: "Ctrl+L"

  // Filtering
  toggleFilters: string;       // Default: "F"
  clearFilters: string;        // Default: "Ctrl+F"
}
```

## Visual Style

```typescript
interface RelationshipViewerStyle {
  // Background
  backgroundColor: Color;
  gridPattern: GridPattern | null;

  // Nodes
  nodeRadius: number;          // 24px
  nodeBorderWidth: number;     // 2px
  selectedBorderColor: Color;
  hoveredBorderColor: Color;

  // Edges
  defaultEdgeWidth: number;    // 2px
  strongEdgeWidth: number;     // 4px
  weakEdgeWidth: number;       // 1px

  // Labels
  labelFont: PixelFont;
  labelSize: number;
  labelColor: Color;

  // Panel
  panelBackground: Color;
  panelBorder: Color;

  // 8-bit styling
  pixelScale: number;
  useDithering: boolean;
}
```

## State Management

```typescript
interface RelationshipViewerState {
  // Core data from relationship-system
  socialNetwork: SocialNetwork;

  // View state
  isOpen: boolean;
  viewMode: "graph" | "list" | "focus";

  // Camera
  cameraPosition: Vector2;
  cameraZoom: number;

  // Selection - using display wrappers
  selectedAgentId: string | null;
  selectedRelationshipId: string | null;
  selectedRelationship: Relationship | null;  // From relationship-system

  // Focus
  focusAgentId: string | null;
  focusAgentReputation: Reputation | null;    // From relationship-system

  // Filters
  activeFilters: RelationshipFilterState;

  // Events - using relationship-system types
  onAgentSelected: Event<string>;
  onRelationshipSelected: Event<Relationship>;           // From relationship-system
  onRelationshipChanged: Event<Relationship>;            // When relationship updates
  onRelationshipEventOccurred: Event<RelationshipEvent>; // From relationship-system
  onSocialNetworkUpdated: Event<SocialNetwork>;          // From relationship-system
}
```

## Integration Points

- **Relationship System**: Relationship data, dimensions, events
- **Agent System**: Agent information, portraits
- **Camera System**: Focus on agents in world
- **Agent Roster**: Link to roster view
- **Notification System**: Relationship change alerts
