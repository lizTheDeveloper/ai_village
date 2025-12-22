# Objectives and Achievements UI Specification

## Overview

The Objectives UI provides tracking and visualization of game goals, milestones, and emergent achievements. Rather than traditional "checklist" progression, this UI emphasizes **observation of emergence** - showing players what's happening in their world as complexity accumulates naturally through agent decisions.

**Philosophy alignment with progression-system:**
> "This isn't a game you beat. It's a world you cultivate."

The UI balances:
- **Guidance objectives**: Early tutorials and suggestions for new players
- **Emergence observation**: Tracking what agents have built, invented, and discovered
- **Milestone recognition**: Celebrating complexity phases as they naturally occur

## Version

0.1.0

## Dependencies

- `progression-system/spec.md` - Emergence philosophy, WorldComplexity tracking
- `ui-system/notifications.md` - Achievement notifications
- `agent-system/chroniclers.md` - Documented history and events

## Requirements

### REQ-OBJ-001: Objectives Panel
- **Description**: Main panel showing current objectives
- **Priority**: MUST

```typescript
// Re-export from progression-system for reference
import type { WorldComplexity } from "progression-system/spec";

// WorldComplexity tracks emergent metrics (not goals):
// - timePassed, agentsEverLived, agentsDied
// - totalMemories, sharedMemories, legendaryMemories
// - generatedItems, generatedRecipes, generatedCrops
// - namedLocations, traditions, beliefs, conflicts
// - significantEvents, agentLegends, lostKnowledge
// - unexpectedOutcomes, uniqueCombinations, emergentBehaviors

interface ObjectivesPanel {
  isOpen: boolean;

  // World complexity reference (for emergence tracking)
  worldComplexity: WorldComplexity;

  // Objectives (mix of guidance and observation)
  activeObjectives: Objective[];
  completedObjectives: Objective[];
  failedObjectives: Objective[];

  // Tabs
  activeTab: ObjectiveTab;

  // Filtering
  filterByCategory: ObjectiveCategory | null;
  showCompleted: boolean;
  showFailed: boolean;

  // Selection
  selectedObjective: Objective | null;

  // Methods
  open(): void;
  close(): void;
  selectObjective(objectiveId: string): void;

  render(ctx: CanvasRenderingContext2D): void;
}

type ObjectiveTab =
  | "active"
  | "completed"
  | "all";

interface Objective {
  id: string;
  title: string;
  description: string;
  icon: Sprite;
  category: ObjectiveCategory;

  // Progress
  status: ObjectiveStatus;
  progress: number;            // 0-1
  progressText: string;        // "3/5 collected"

  // Requirements
  requirements: ObjectiveRequirement[];

  // Rewards
  rewards: ObjectiveReward[];

  // Timing
  createdAt: GameTime;
  completedAt: GameTime | null;
  deadline: GameTime | null;

  // Priority
  priority: ObjectivePriority;
  isPinned: boolean;
}

// ObjectiveCategory maps to aspects of WorldComplexity tracking
type ObjectiveCategory =
  | "guidance"         // Tutorial/new player guidance (temporary)
  | "survival"         // Basic needs (early phase)
  | "exploration"      // Discovery, exploration
  | "building"         // Construction goals
  | "social"           // Relationships, culture emergence
  | "economy"          // Trade, specialization emergence
  | "invention"        // Research, generated content
  | "history"          // Memory, legacy, traditions
  | "emergence";       // Unexpected complexity (auto-observed)

type ObjectiveStatus =
  | "active"
  | "completed"
  | "failed"
  | "expired"
  | "hidden";

type ObjectivePriority =
  | "critical"         // Must complete
  | "high"             // Important
  | "normal"           // Standard
  | "low"              // Optional
  | "bonus";           // Extra challenge
```

### REQ-OBJ-002: Objective Requirements
- **Description**: Display objective completion criteria
- **Priority**: MUST

```typescript
interface ObjectiveRequirement {
  id: string;
  description: string;
  type: RequirementType;

  // Progress
  current: number;
  target: number;
  isComplete: boolean;

  // Optional
  isOptional: boolean;
  bonusReward: ObjectiveReward | null;
}

type RequirementType =
  | "collect"          // Gather X items
  | "build"            // Construct building
  | "reach"            // Reach location
  | "talk"             // Speak with agent
  | "survive"          // Survive X days
  | "produce"          // Produce X items
  | "trade"            // Complete trades
  | "research"         // Research technology
  | "relationship"     // Achieve relationship status
  | "population"       // Reach population count
  | "custom";          // Custom condition

interface RequirementDisplay {
  requirement: ObjectiveRequirement;

  // Visual
  showProgressBar: boolean;
  showCheckbox: boolean;
  strikethroughComplete: boolean;

  render(ctx: CanvasRenderingContext2D, position: Vector2): void;
}

interface RequirementProgress {
  // Real-time progress updates
  requirementId: string;
  previousValue: number;
  currentValue: number;
  targetValue: number;

  // Animation
  showProgressAnimation: boolean;
  animationDuration: number;
}
```

### REQ-OBJ-003: Objective Rewards
- **Description**: Display rewards for completing objectives
- **Priority**: MUST

```typescript
interface ObjectiveReward {
  type: RewardType;
  amount: number;
  itemId: string | null;
  description: string;
  icon: Sprite;
}

type RewardType =
  | "item"             // Physical item
  | "resource"         // Resource amount
  | "unlock"           // Unlock feature/building
  | "recipe"           // Unlock recipe
  | "technology"       // Unlock tech
  | "reputation"       // Gain reputation
  | "experience"       // Skill experience
  | "achievement";     // Achievement unlock

interface RewardsDisplay {
  rewards: ObjectiveReward[];

  // Layout
  layout: "horizontal" | "vertical" | "grid";
  iconSize: number;
  showLabels: boolean;

  render(ctx: CanvasRenderingContext2D): void;
}

interface RewardClaimAnimation {
  rewards: ObjectiveReward[];
  playAnimation: boolean;

  // Effects
  showFloatingItems: boolean;
  showGlow: boolean;
  playSound: boolean;
}
```

### REQ-OBJ-004: Achievement System
- **Description**: Track and display achievements
- **Priority**: SHOULD

```typescript
interface AchievementsPanel {
  isOpen: boolean;

  // Achievements
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;

  // Categories
  categories: AchievementCategory[];
  selectedCategory: AchievementCategory | null;

  // Filtering
  showLocked: boolean;
  showSecret: boolean;
  searchQuery: string;

  // Selection
  selectedAchievement: Achievement | null;

  // Methods
  open(): void;
  close(): void;
  selectAchievement(achievementId: string): void;

  render(ctx: CanvasRenderingContext2D): void;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: Sprite;
  category: AchievementCategory;

  // Status
  isUnlocked: boolean;
  unlockedAt: GameTime | null;

  // Progress (for incremental achievements)
  hasProgress: boolean;
  current: number;
  target: number;

  // Secret achievements
  isSecret: boolean;
  secretHint: string | null;

  // Tiers
  tier: AchievementTier;

  // Rewards
  rewards: ObjectiveReward[];
}

type AchievementCategory =
  | "exploration"
  | "building"
  | "social"
  | "economy"
  | "survival"
  | "combat"
  | "farming"
  | "crafting"
  | "misc";

type AchievementTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum";

interface AchievementDisplay {
  achievement: Achievement;

  // Layout
  showProgress: boolean;
  showTier: boolean;
  showRewards: boolean;

  // Locked display
  lockedOpacity: number;
  showLockedIcon: boolean;
  hideSecretDetails: boolean;

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-OBJ-005: Progress Tracking HUD
- **Description**: On-screen objective progress display
- **Priority**: MUST

```typescript
interface ObjectiveHUD {
  isVisible: boolean;
  position: "top_left" | "top_right" | "bottom_left" | "bottom_right";

  // Displayed objectives
  pinnedObjectives: Objective[];
  maxDisplayed: number;

  // Auto-tracking
  autoTrackNewest: boolean;
  autoTrackNearest: boolean;

  // Settings
  showProgress: boolean;
  showRewards: boolean;
  fadeWhenInactive: boolean;

  render(ctx: CanvasRenderingContext2D): void;
}

interface ObjectiveHUDItem {
  objective: Objective;

  // Display
  isExpanded: boolean;
  showRequirements: boolean;

  // Animation
  pulseOnProgress: boolean;
  highlightOnComplete: boolean;
}

interface ProgressPopup {
  // Shown when progress is made
  objective: Objective;
  requirement: ObjectiveRequirement;

  // Progress change
  previousProgress: number;
  newProgress: number;

  // Display
  position: Vector2;
  duration: number;
  fadeOut: boolean;
}
```

### REQ-OBJ-006: Milestone Tracker
- **Description**: Major game milestones - observes Complexity Phases from progression-system
- **Priority**: SHOULD

```typescript
// Milestones align with Complexity Phases from progression-system
// These are OBSERVED, not achieved - they happen as simulation runs
//
// Complexity Phases (from progression-system/spec.md):
// | Phase       | Emerges After | What's Happening                    |
// |-------------|---------------|-------------------------------------|
// | Survival    | Start         | Agents focused on not dying         |
// | Stability   | ~Weeks        | Basic needs met, habits form        |
// | Culture     | ~Months       | Traditions, preferences develop     |
// | History     | ~Years        | Dead agents remembered, lore        |
// | Invention   | ~Years        | Generated content significant       |
// | Divergence  | Many years    | This village unlike any other       |
// | Weirdness   | Long time     | Things nobody predicted             |
// | Connection  | Very long     | Complex enough to share             |

interface MilestoneTracker {
  milestones: Milestone[];

  // Current complexity phase (observed, not achieved)
  currentPhase: ComplexityPhase;
  observedPhases: ComplexityPhase[];

  // World complexity reference
  worldComplexity: WorldComplexity;

  // Display
  showTimeline: boolean;
  timelineOrientation: "horizontal" | "vertical";
}

// Complexity phases from progression-system
type ComplexityPhase =
  | "survival"
  | "stability"
  | "culture"
  | "history"
  | "invention"
  | "divergence"
  | "weirdness"
  | "connection";

interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: Sprite;

  // Maps to complexity phase
  phase: ComplexityPhase;

  // Observation (not achievement) state
  status: "unobserved" | "emerging" | "observed";
  emergenceLevel: number;          // 0-1, how strongly phase is manifesting

  // What triggered observation (from WorldComplexity metrics)
  emergenceIndicators: EmergenceIndicator[];

  // Timing
  observedAt: GameTime | null;

  // No rewards - phases are observations, not achievements
}

// Emergence indicators track what WorldComplexity metrics
// triggered phase observation
interface EmergenceIndicator {
  metric: keyof WorldComplexity;    // Which metric triggered
  threshold: number;                 // Value that triggered
  currentValue: number;
  description: string;               // Human-readable explanation
}

interface MilestoneTimeline {
  milestones: Milestone[];

  // Visual
  nodeSize: number;
  nodeSpacing: number;
  connectionStyle: "flow" | "organic";  // Organic for emergence theme

  // Current phase indicator
  showCurrentPhaseIndicator: boolean;
  showEmergenceFlow: boolean;        // Animated flow showing progression

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-OBJ-007: Objective Details
- **Description**: Full details view of objective
- **Priority**: SHOULD

```typescript
interface ObjectiveDetails {
  objective: Objective;
  isOpen: boolean;

  // Sections
  showDescription: boolean;
  showRequirements: boolean;
  showRewards: boolean;
  showHints: boolean;
  showHistory: boolean;

  // Methods
  openForObjective(objectiveId: string): void;
  close(): void;
  pinObjective(): void;
  unpinObjective(): void;
}

interface ObjectiveHints {
  hints: Hint[];
  revealedHints: number;

  // Methods
  revealNextHint(): void;
  canRevealHint: boolean;
}

interface Hint {
  text: string;
  isRevealed: boolean;
  revealCost: ObjectiveReward | null;
}

interface ObjectiveHistory {
  events: ObjectiveEvent[];
}

interface ObjectiveEvent {
  type: ObjectiveEventType;
  timestamp: GameTime;
  description: string;
}

type ObjectiveEventType =
  | "started"
  | "progress"
  | "requirement_complete"
  | "completed"
  | "failed"
  | "expired";
```

### REQ-OBJ-008: Completion Celebration
- **Description**: Visual feedback for completing objectives
- **Priority**: SHOULD

```typescript
interface CompletionCelebration {
  // Trigger celebration
  celebrate(objective: Objective): void;
  celebrateAchievement(achievement: Achievement): void;
  celebrateMilestone(milestone: Milestone): void;

  // Settings
  celebrationLevel: CelebrationLevel;
  showBanner: boolean;
  playSound: boolean;
  showRewards: boolean;
}

type CelebrationLevel =
  | "minimal"          // Just notification
  | "normal"           // Banner + sound
  | "full";            // Full effects

interface CompletionBanner {
  title: string;
  subtitle: string;
  icon: Sprite;
  tier: AchievementTier | null;

  // Display
  position: "center" | "top";
  duration: number;
  animation: BannerAnimation;
}

type BannerAnimation =
  | "slide_in"
  | "fade_in"
  | "pop"
  | "none";

interface RewardReveal {
  rewards: ObjectiveReward[];

  // Animation
  revealSequential: boolean;
  delayBetween: number;

  // Effects
  showSparkles: boolean;
  showItemBounce: boolean;
}
```

### REQ-OBJ-009: Statistics Display
- **Description**: Objective completion statistics
- **Priority**: MAY

```typescript
interface ObjectiveStatistics {
  // Counts
  totalObjectives: number;
  completedObjectives: number;
  failedObjectives: number;

  // Achievements
  totalAchievements: number;
  unlockedAchievements: number;

  // By category
  statsByCategory: Map<ObjectiveCategory, CategoryStats>;

  // Time stats
  averageCompletionTime: number;
  fastestCompletion: CompletionRecord;

  // Streaks
  currentStreak: number;
  longestStreak: number;
}

interface CategoryStats {
  category: ObjectiveCategory;
  total: number;
  completed: number;
  percentage: number;
}

interface CompletionRecord {
  objectiveId: string;
  objectiveName: string;
  completionTime: number;
  completedAt: GameTime;
}

interface StatisticsDisplay {
  stats: ObjectiveStatistics;

  // Charts
  showCategoryChart: boolean;
  showTimelineChart: boolean;
  chartType: "pie" | "bar";

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-OBJ-010: Keyboard Shortcuts
- **Description**: Quick access for objectives UI
- **Priority**: SHOULD

```typescript
interface ObjectiveShortcuts {
  // Window
  toggleObjectives: string;    // Default: "J"
  closePanel: string;          // Default: "Escape"

  // Tabs
  activeTab: string;           // Default: "1"
  completedTab: string;        // Default: "2"
  achievementsTab: string;     // Default: "3"

  // Navigation
  nextObjective: string;       // Default: "Tab"
  previousObjective: string;   // Default: "Shift+Tab"

  // Actions
  pinObjective: string;        // Default: "P"
  trackObjective: string;      // Default: "T"

  // HUD
  toggleHUD: string;           // Default: "O"
}
```

## Visual Style

```typescript
interface ObjectivesStyle {
  // Panel
  backgroundColor: Color;
  headerColor: Color;

  // Status colors
  activeColor: Color;          // White/gold
  completedColor: Color;       // Green
  failedColor: Color;          // Red
  lockedColor: Color;          // Gray

  // Progress bar
  progressBarColor: Color;
  progressBackgroundColor: Color;
  progressHeight: number;

  // Achievement tiers
  bronzeColor: Color;
  silverColor: Color;
  goldColor: Color;
  platinumColor: Color;

  // Icons
  iconSize: number;
  checkmarkIcon: Sprite;
  lockIcon: Sprite;

  // 8-bit styling
  pixelScale: number;
}
```

## State Management

### Progression System Integration

The objectives UI subscribes to WorldComplexity changes and emergence events from progression-system.

```typescript
interface ObjectivesState {
  // View state
  isOpen: boolean;
  activeTab: ObjectiveTab;

  // World complexity reference (from progression-system)
  worldComplexity: WorldComplexity;
  currentPhase: ComplexityPhase;

  // Selection
  selectedObjectiveId: string | null;
  selectedAchievementId: string | null;

  // Pinned objectives
  pinnedObjectives: string[];

  // HUD
  hudVisible: boolean;

  // Filters
  categoryFilter: ObjectiveCategory | null;
  showCompleted: boolean;

  // Events - integrates with progression-system
  onObjectiveCompleted: Event<Objective>;
  onAchievementUnlocked: Event<Achievement>;
  onPhaseObserved: Event<ComplexityPhase>;      // From progression-system
  onEmergenceDetected: Event<EmergenceEvent>;   // From progression-system
  onProgressMade: Event<ObjectiveProgress>;
}

// Emergence events from progression-system
interface EmergenceEvent {
  type: EmergenceEventType;
  description: string;
  worldComplexityMetrics: Partial<WorldComplexity>;
  timestamp: GameTime;
}

type EmergenceEventType =
  | "tradition_formed"           // Repeated behavior became tradition
  | "legend_created"             // Dead agent became legendary
  | "invention_discovered"       // Generated item/recipe created
  | "belief_emerged"             // Shared opinion formed
  | "unexpected_outcome"         // System surprise
  | "culture_shift"              // Significant cultural change
  | "knowledge_lost"             // Something was forgotten
  | "phase_transition";          // Moved to new complexity phase

interface ObjectiveProgress {
  objectiveId: string;
  requirementId: string;
  previousProgress: number;
  currentProgress: number;
}
```

## Integration Points

- **Progression System**: WorldComplexity tracking, ComplexityPhase observation, emergence events
- **Chroniclers System**: Documented events feed emergence observations
- **Notification System**: Completion and emergence notifications
- **Save System**: Progress persistence
- **Economy System**: Resource rewards (for guidance objectives only)
- **Research System**: Technology unlocks, invention tracking
