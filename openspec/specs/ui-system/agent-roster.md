# Agent Roster UI Specification

## Overview

The Agent Roster UI provides a comprehensive view of all agents in the village, their status, needs, jobs, and quick management actions. Features list and grid views, filtering, sorting, and batch operations.

## Version

0.1.0

## Dependencies

- `agent-system/spec.md` - Agent definitions (Agent, PersonalityTraits, SkillSet, AgentRole)
- `agent-system/needs.md` - Needs system (AgentNeeds, Need, NeedTier hierarchy)
- `agent-system/relationship-system.md` - Relationships
- `ui-system/hover-info.md` - Agent inspection

## Requirements

### REQ-ROSTER-001: Roster Panel
- **Description**: Main panel listing all agents
- **Priority**: MUST

```typescript
// Re-export from agent-system for reference
import type { Agent, PersonalityTraits, SkillSet, AgentRole } from "agent-system/spec";
import type { AgentNeeds, Need, NeedTier } from "agent-system/needs";

interface AgentRosterPanel {
  isOpen: boolean;
  position: "left" | "right" | "fullscreen";

  // Data - wraps Agent from agent-system
  agents: AgentRosterEntry[];
  totalAgentCount: number;

  // View options
  viewMode: RosterViewMode;
  sortBy: AgentSortOption;
  sortDirection: "asc" | "desc";

  // Selection
  selectedAgents: Set<EntityId>;
  hoveredAgent: EntityId | null;

  // Methods
  open(): void;
  close(): void;
  toggle(): void;
  selectAgent(id: EntityId): void;
  deselectAll(): void;

  render(ctx: CanvasRenderingContext2D): void;
}

type RosterViewMode =
  | "list"           // Detailed list rows
  | "grid"           // Portrait grid
  | "compact";       // Minimal list

type AgentSortOption =
  | "name"
  | "age"
  | "health"         // From needs.physical.health.current
  | "role"           // From Agent.role (AgentRole)
  | "location"
  | "needs_urgency"; // Computed from highest priority unmet need

// UI wrapper around Agent with computed display properties
interface AgentRosterEntry {
  // Core agent data from agent-system/spec.md
  agent: Agent;

  // UI-specific computed properties
  portrait: Sprite;

  // Quick stats from AgentNeeds hierarchy (agent-system/needs.md)
  // Physical tier needs
  healthLevel: number;        // From agent.needs.physical.health.current
  energyLevel: number;        // From agent.needs.physical.energy.current
  hungerLevel: number;        // From agent.needs.physical.hunger.current
  thirstLevel: number;        // From agent.needs.physical.thirst.current

  // Computed from AgentRole (agent-system/spec.md)
  roleDisplay: string | null; // "villager" | "leader" | "merchant" | etc.

  // Current activity
  currentTask: string | null;
  location: string;

  // Needs summary computed from all AgentNeeds tiers
  // See needs.md for tier hierarchy: survival > safety > social > psychological > self_actualization
  criticalNeeds: NeedDisplayInfo[];  // Tier 1-2 needs below 20%
  warningNeeds: NeedDisplayInfo[];   // Any needs below 50%
  highestUrgencyNeed: NeedDisplayInfo | null;

  // Flags
  isSelected: boolean;
  isIdle: boolean;
  needsAttention: boolean;
}

// Display info for a specific need from AgentNeeds
interface NeedDisplayInfo {
  needName: string;           // e.g., "hunger", "belonging", "competence"
  tier: number;               // 1-5 from NeedTier
  tierName: string;           // "survival", "safety", "social", "psychological", "self_actualization"
  current: number;            // 0-100 from Need.current
  urgency: number;            // Computed from getEffectiveNeedUrgency()
  status: "critical" | "warning" | "satisfied";
  icon: Sprite;
}
```

### REQ-ROSTER-002: Agent List View
- **Description**: Detailed list with expandable rows
- **Priority**: MUST

```typescript
interface AgentListView {
  columns: ListColumn[];
  visibleColumns: string[];

  // Row sizing
  rowHeight: number;
  expandedRowHeight: number;

  // Expansion
  expandedAgents: Set<EntityId>;

  // Virtualization for performance
  virtualScroll: boolean;
  visibleRange: { start: number; end: number };

  // Methods
  toggleExpand(agentId: EntityId): void;
  setColumns(columns: string[]): void;
  resizeColumn(columnId: string, width: number): void;
}

interface ListColumn {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  sortable: boolean;
  resizable: boolean;

  // Render function uses AgentRosterEntry wrapper
  render(agent: AgentRosterEntry, ctx: CanvasRenderingContext2D): void;
}

// Standard columns - references AgentNeeds and AgentRole from agent-system
const ROSTER_COLUMNS: ListColumn[] = [
  { id: "portrait", label: "", width: 40, sortable: false },
  { id: "name", label: "Name", width: 120, sortable: true },
  { id: "role", label: "Role", width: 100, sortable: true },    // From Agent.role (AgentRole)
  { id: "health", label: "Health", width: 60, sortable: true },  // From needs.physical.health.current
  { id: "energy", label: "Energy", width: 60, sortable: true },  // From needs.physical.energy.current
  { id: "task", label: "Current Task", width: 150, sortable: true },
  { id: "needs", label: "Needs", width: 100, sortable: true },   // Shows criticalNeeds/warningNeeds
  { id: "location", label: "Location", width: 100, sortable: true }
];

interface ExpandedAgentRow {
  agentId: EntityId;

  // Expanded content
  showNeedsDetails: boolean;
  showSkills: boolean;
  showRelationships: boolean;
  showInventory: boolean;

  // Quick actions
  actionButtons: QuickAction[];
}
```

### REQ-ROSTER-003: Agent Grid View
- **Description**: Portrait-based grid for quick overview
- **Priority**: SHOULD

```typescript
interface AgentGridView {
  gridColumns: number;
  cellSize: number;
  cellPadding: number;

  // Display options
  showNames: boolean;
  showStatusBars: boolean;
  showJobIcons: boolean;
  showAlertBadges: boolean;

  // Interaction
  hoverToPreview: boolean;
  clickToSelect: boolean;
  doubleClickToInspect: boolean;
}

interface GridCell {
  agent: AgentEntry;
  position: Vector2;
  size: number;

  // Visual elements
  portrait: Sprite;
  statusBars: MiniStatusBar[];
  alertBadge: AlertBadge | null;
  jobIcon: Sprite | null;

  // State
  isHovered: boolean;
  isSelected: boolean;

  render(ctx: CanvasRenderingContext2D): void;
}

interface MiniStatusBar {
  type: "health" | "mood" | "energy";
  value: number;
  color: Color;
  position: "bottom" | "side";
}

interface AlertBadge {
  type: "critical" | "warning" | "info";
  icon: Sprite;
  count: number;
  tooltip: string;
}
```

### REQ-ROSTER-004: Needs Overview
- **Description**: Visual summary of all agents' needs status using AgentNeeds hierarchy
- **Priority**: MUST

```typescript
// Uses AgentNeeds structure from agent-system/needs.md
// Hierarchy: physical > safety > social > psychological > higher (self_actualization)

interface NeedsOverview {
  // Aggregate stats across all agents
  criticalCount: number;     // Agents with any tier 1-2 need below 20
  warningCount: number;      // Agents with any need below 50
  satisfiedCount: number;    // Agents with all needs above 70

  // Per-tier breakdown (from NeedTier in needs.md)
  tierSummaries: TierSummary[];

  // Per-need breakdown within tiers
  needsSummary: NeedCategorySummary[];

  // Display
  showAggregateBar: boolean;
  showPerTierBars: boolean;
  showPerNeedBars: boolean;
  sortByUrgency: boolean;
}

// Summary for each tier from NeedTier (needs.md)
interface TierSummary {
  tier: number;              // 1-5
  tierName: string;          // "survival", "safety", "social", "psychological", "self_actualization"
  urgencyMultiplier: number; // From NeedTier.urgencyMultiplier

  agentsWithCritical: number;
  agentsWithWarning: number;
  averageLevel: number;
}

// Summary for a specific need category (e.g., all physical needs, all social needs)
interface NeedCategorySummary {
  category: string;          // "physical", "safety", "social", "psychological", "higher"
  tier: number;

  // Individual needs in this category
  needs: NeedSummary[];
}

interface NeedSummary {
  needName: string;          // e.g., "hunger", "belonging", "competence"
  category: string;
  tier: number;
  icon: Sprite;

  // Stats across all agents (from Need.current in needs.md)
  agentsInCritical: number;  // Need.current < 20
  agentsInWarning: number;   // Need.current < 50
  agentsSatisfied: number;   // Need.current >= 70
  averageLevel: number;      // Average of Need.current across all agents

  // Visual
  statusColor: Color;
}

interface AgentNeedsDisplay {
  agentId: EntityId;
  agentNeeds: AgentNeeds;    // Full needs hierarchy from agent-system/needs.md

  // Flattened for display
  needStatuses: NeedStatusDisplay[];

  // Display mode
  mode: "bars" | "icons" | "compact" | "hierarchy";

  // Highlighting
  highlightCritical: boolean;
  criticalPulse: boolean;
}

// Display wrapper for Need from agent-system/needs.md
interface NeedStatusDisplay {
  needName: string;
  category: string;          // "physical", "safety", "social", "psychological", "higher"
  tier: number;
  icon: Sprite;

  // From Need interface in needs.md
  current: number;           // 0-100 (Need.current)
  baseline: number;          // Natural resting point (Need.baseline)
  decayRate: number;         // How fast it drops (Need.decayRate)
  personalWeight: number;    // How much this agent cares (Need.personalWeight)

  // Computed
  status: "critical" | "warning" | "satisfied";
  trend: "rising" | "falling" | "stable";
  effectiveUrgency: number;  // From getEffectiveNeedUrgency() in needs.md
  satisfiedAt: GameTime | null;
}
```

### REQ-ROSTER-005: Filtering System
- **Description**: Filter agents by various criteria
- **Priority**: MUST

```typescript
interface AgentFilter {
  // Active filters
  filters: FilterCriteria[];

  // Quick filters
  quickFilters: QuickFilter[];

  // Search
  searchQuery: string;
  searchFields: string[];    // name, job, location

  // Methods
  addFilter(criteria: FilterCriteria): void;
  removeFilter(index: number): void;
  clearFilters(): void;
  applyFilters(agents: AgentEntry[]): AgentEntry[];
}

interface FilterCriteria {
  field: FilterField;
  operator: FilterOperator;
  value: unknown;
}

type FilterField =
  | "job"
  | "location"
  | "health"
  | "mood"
  | "age"
  | "species"
  | "trait"
  | "skill"
  | "need_status"
  | "is_idle"
  | "is_working";

type FilterOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "contains"
  | "has_trait"
  | "has_skill";

interface QuickFilter {
  id: string;
  label: string;
  icon: Sprite;
  criteria: FilterCriteria[];

  // Preset quick filters
  isPreset: boolean;
}

// Default quick filters
const QUICK_FILTERS: QuickFilter[] = [
  { id: "critical_needs", label: "Critical Needs", criteria: [{ field: "need_status", operator: "equals", value: "critical" }] },
  { id: "idle", label: "Idle", criteria: [{ field: "is_idle", operator: "equals", value: true }] },
  { id: "injured", label: "Injured", criteria: [{ field: "health", operator: "less_than", value: 0.5 }] },
  { id: "unhappy", label: "Unhappy", criteria: [{ field: "mood", operator: "less_than", value: 0.3 }] }
];
```

### REQ-ROSTER-006: Role Assignment
- **Description**: Assign and manage agent roles from roster
- **Priority**: MUST

```typescript
// Uses AgentRole from agent-system/spec.md:
// "villager" | "leader" | "merchant" | "researcher" | "historian" |
// "journalist" | "herder" | "explorer"

// Uses SkillSet for suitability calculations from agent-system/spec.md:
// farming, construction, crafting, foraging, fishing, cooking, trading,
// research, socializing, animalHandling, writing, literacy, leadership, navigation, etc.

interface RoleAssignment {
  availableRoles: RoleDefinition[];

  // Current assignments by role
  roleAssignments: Map<AgentRole, EntityId[]>;

  // Methods
  assignRole(agentId: EntityId, role: AgentRole): void;
  unassignRole(agentId: EntityId): void;
  swapRoles(agent1: EntityId, agent2: EntityId): void;

  // Batch operations
  assignMultiple(agentIds: EntityId[], role: AgentRole): void;
  autoAssign(agentIds: EntityId[]): void;
}

// UI wrapper for AgentRole with display properties
interface RoleDefinition {
  role: AgentRole;           // From agent-system/spec.md
  displayName: string;
  icon: Sprite;
  color: Color;

  // Requirements based on SkillSet (agent-system/spec.md)
  primarySkills: (keyof SkillSet)[];     // e.g., ["farming", "foraging"] for Farmer
  preferredPersonality: Partial<PersonalityTraits>;

  // Capacity
  currentWorkers: number;
  maxWorkers: number | null;

  // Priority
  priority: number;
}

// Role definitions mapped to archetypes from agent-system/spec.md
const ROLE_DEFINITIONS: RoleDefinition[] = [
  { role: "villager", displayName: "Villager", primarySkills: [] },  // Default
  { role: "leader", displayName: "Leader", primarySkills: ["leadership", "socializing"] },
  { role: "merchant", displayName: "Merchant", primarySkills: ["trading", "socializing"] },
  { role: "researcher", displayName: "Researcher", primarySkills: ["research", "crafting"] },
  { role: "historian", displayName: "Historian", primarySkills: ["writing", "research"] },
  { role: "journalist", displayName: "Journalist", primarySkills: ["writing", "socializing"] },
  { role: "herder", displayName: "Herder", primarySkills: ["animalHandling", "farming"] },
  { role: "explorer", displayName: "Explorer", primarySkills: ["navigation", "foraging"] },
];

interface RoleAssignmentPanel {
  // Dropdown or panel for assignment
  isOpen: boolean;
  targetAgent: EntityId | null;

  // Role list
  roles: RoleDefinition[];
  recommendedRole: AgentRole | null;

  // Suitability display based on SkillSet match
  showSuitability: boolean;
  suitabilityScores: Map<AgentRole, number>;
}

interface RoleSuitability {
  role: RoleDefinition;
  agent: AgentRosterEntry;

  score: number;           // 0-1
  factors: SuitabilityFactor[];
}

interface SuitabilityFactor {
  name: string;            // e.g., "farming skill", "conscientiousness trait"
  skillOrTrait: string;    // From SkillSet or PersonalityTraits
  currentValue: number;
  requiredValue: number;
  impact: "positive" | "negative" | "neutral";
  description: string;
}
```

### REQ-ROSTER-007: Batch Operations
- **Description**: Perform actions on multiple selected agents
- **Priority**: SHOULD

```typescript
interface BatchOperations {
  selectedAgents: EntityId[];
  availableOperations: BatchOperation[];

  // Methods
  selectAll(): void;
  selectNone(): void;
  selectFiltered(): void;
  invertSelection(): void;

  executeOperation(operationId: string): void;
}

interface BatchOperation {
  id: string;
  label: string;
  icon: Sprite;

  // Requirements
  minSelection: number;
  maxSelection: number | null;

  // Validation
  canExecute(agents: EntityId[]): boolean;

  // Execution
  execute(agents: EntityId[]): void;

  // Confirmation
  requiresConfirmation: boolean;
  confirmMessage: string;
}

const BATCH_OPERATIONS: BatchOperation[] = [
  { id: "assign_job", label: "Assign Job", minSelection: 1 },
  { id: "move_to", label: "Move To", minSelection: 1 },
  { id: "create_group", label: "Create Group", minSelection: 2 },
  { id: "set_priority", label: "Set Priority", minSelection: 1 },
  { id: "dismiss", label: "Dismiss", minSelection: 1, requiresConfirmation: true }
];
```

### REQ-ROSTER-008: Agent Groups
- **Description**: Create and manage groups of agents
- **Priority**: SHOULD

```typescript
interface AgentGroups {
  groups: AgentGroup[];

  // Methods
  createGroup(name: string, agents: EntityId[]): AgentGroup;
  deleteGroup(groupId: string): void;
  renameGroup(groupId: string, name: string): void;
  addToGroup(groupId: string, agents: EntityId[]): void;
  removeFromGroup(groupId: string, agents: EntityId[]): void;

  // Selection
  selectGroup(groupId: string): void;
}

interface AgentGroup {
  id: string;
  name: string;
  color: Color;
  icon: Sprite | null;

  members: EntityId[];

  // Stats
  memberCount: number;

  // Hotkey
  hotkey: string | null;     // e.g., "1", "2", "3"
}

interface GroupPanel {
  groups: AgentGroup[];
  selectedGroup: AgentGroup | null;

  // Display
  showGroupList: boolean;
  showGroupMembers: boolean;

  // Quick access
  groupHotkeys: Map<string, string>;
}
```

### REQ-ROSTER-009: Agent Comparison
- **Description**: Compare stats between agents
- **Priority**: MAY

```typescript
interface AgentComparison {
  agents: EntityId[];        // 2-4 agents

  // Comparison categories
  categories: ComparisonCategory[];
  selectedCategory: ComparisonCategory;

  // Display
  layout: "side_by_side" | "table";
  highlightDifferences: boolean;
  showBestInCategory: boolean;
}

interface ComparisonCategory {
  id: string;
  label: string;
  stats: ComparisonStat[];
}

interface ComparisonStat {
  id: string;
  label: string;

  // Values per agent
  values: Map<EntityId, number | string>;

  // Comparison
  bestValue: number | string;
  bestAgent: EntityId;

  // Display
  format: "number" | "percentage" | "text";
  higherIsBetter: boolean;
}

const COMPARISON_CATEGORIES: ComparisonCategory[] = [
  { id: "vitals", label: "Vitals", stats: ["health", "mood", "energy"] },
  { id: "skills", label: "Skills", stats: ["farming", "crafting", "combat", "social"] },
  { id: "traits", label: "Traits", stats: [] },  // Dynamic
  { id: "history", label: "History", stats: ["age", "days_in_village", "tasks_completed"] }
];
```

### REQ-ROSTER-010: Quick Actions
- **Description**: Rapid actions from roster without full inspection
- **Priority**: MUST

```typescript
interface QuickActions {
  // Per-agent actions
  agentActions: QuickAction[];

  // Context-sensitive actions
  getActionsForAgent(agent: AgentEntry): QuickAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: Sprite;
  tooltip: string;

  // Availability
  isAvailable(agent: AgentEntry): boolean;

  // Execution
  execute(agent: AgentEntry): void;

  // Display
  showInList: boolean;
  showInGrid: boolean;
  position: "inline" | "menu";
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "focus", label: "Focus", icon: "camera", tooltip: "Center camera on agent" },
  { id: "inspect", label: "Inspect", icon: "magnifier", tooltip: "Open detailed view" },
  { id: "follow", label: "Follow", icon: "footprints", tooltip: "Camera follows agent" },
  { id: "talk", label: "Talk", icon: "speech", tooltip: "Voice of God" },
  { id: "assign", label: "Assign", icon: "briefcase", tooltip: "Change job" },
  { id: "prioritize", label: "Prioritize", icon: "star", tooltip: "Set as priority" }
];
```

### REQ-ROSTER-011: Statistics Summary
- **Description**: Aggregate statistics for all agents
- **Priority**: SHOULD

```typescript
// Uses AgentNeeds and AgentRole from agent-system for accurate statistics

interface RosterStatistics {
  // Population
  totalAgents: number;
  bySpecies: Map<string, number>;
  byRole: Map<AgentRole, number>;  // From Agent.role in agent-system/spec.md
  byAge: AgeDistribution;

  // Averages from AgentNeeds.physical tier (needs.md)
  averageHealth: number;           // From needs.physical.health.current
  averageEnergy: number;           // From needs.physical.energy.current
  averageHunger: number;           // From needs.physical.hunger.current

  // Averages from higher tiers
  averageBelonging: number;        // From needs.social.belonging.current
  averageCompetence: number;       // From needs.psychological.competence.current

  // Alerts based on need tier thresholds
  agentsWithCriticalNeeds: number; // Any tier 1-2 need below 20
  agentsWithWarningNeeds: number;  // Any need below 50
  idleAgents: number;
  injuredAgents: number;           // needs.physical.health.current < 50

  // Per-tier health
  tierHealth: Map<string, TierHealthStats>;  // "survival", "safety", etc.

  // Trends
  populationTrend: Trend;
  survivalNeedsTrend: Trend;       // Tier 1 average trend
  socialNeedsTrend: Trend;         // Tier 3 average trend
}

interface TierHealthStats {
  tierName: string;
  averageLevel: number;
  agentsBelowThreshold: number;
  criticalNeeds: string[];         // Which specific needs are critical
}

interface AgeDistribution {
  children: number;
  adults: number;
  elders: number;
}

interface Trend {
  direction: "up" | "down" | "stable";
  changePercent: number;
  period: string;
}

interface StatisticsSummaryPanel {
  stats: RosterStatistics;

  // Display options
  showPopulation: boolean;
  showNeedAverages: boolean;       // Shows per-tier need averages
  showAlerts: boolean;
  showTrends: boolean;

  // Compact mode
  isCompact: boolean;

  render(ctx: CanvasRenderingContext2D): void;
}
```

## Visual Style

```typescript
interface RosterStyle {
  // Panel
  backgroundColor: Color;
  headerColor: Color;
  rowColor: Color;
  alternateRowColor: Color;
  selectedRowColor: Color;
  hoverRowColor: Color;

  // Portraits
  portraitSize: number;
  portraitBorderColor: Color;
  selectedBorderColor: Color;

  // Status colors
  healthColor: Color;
  moodColor: Color;
  energyColor: Color;
  criticalColor: Color;
  warningColor: Color;

  // Typography
  nameFont: PixelFont;
  nameSize: number;
  detailFont: PixelFont;
  detailSize: number;

  // 8-bit styling
  pixelScale: number;
}
```

## State Management

```typescript
interface RosterState {
  // View state
  isOpen: boolean;
  viewMode: RosterViewMode;

  // Data - wraps Agent from agent-system
  agents: AgentRosterEntry[];
  lastUpdate: GameTime;

  // Selection
  selectedAgents: Set<EntityId>;

  // Filtering/Sorting
  activeFilters: FilterCriteria[];
  sortBy: AgentSortOption;
  sortDirection: "asc" | "desc";
  searchQuery: string;

  // Scroll position
  scrollPosition: number;

  // Events - using Agent and AgentNeeds from agent-system
  onAgentSelected: Event<EntityId>;
  onAgentDoubleClicked: Event<EntityId>;
  onNeedCritical: Event<{ agentId: EntityId; need: NeedDisplayInfo }>;
}
```

## Integration Points

- **Agent System**: Agent data, needs, jobs
- **Selection System**: Sync with world selection
- **Camera System**: Focus on agent
- **Notification System**: Need alerts
- **Hover Info**: Detailed inspection
