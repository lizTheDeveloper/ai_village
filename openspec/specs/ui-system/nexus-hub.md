# Nexus Hub - UI Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0
**Depends on:** `nexus-system/spec.md`

---

## Overview

The Nexus Hub is the meta-layer interface where disembodied agents exist between game sessions. It provides game discovery, agent identity management, cross-game skill visualization, meta-goal tracking, and transit controls. This is the "home base" for agents spanning multiple game worlds.

---

## Type Definitions

```typescript
import {
  Nexus,
  GameInfo,
  GameStatus,
  AgentIdentity,
  SkillDomain,
  SkillProgress,
  MetaGoal,
  MetaGoalRequirement,
  EntryPackage,
  TransitPackage,
  TransitResult,
  NexusObservation,
  GameSuggestion,
  SessionSummary,
  PortableItem,
  Achievement,
} from "@specs/nexus-system/spec";
```

---

## Nexus Hub Structure

### Main Hub Panel

```typescript
interface NexusHubPanel {
  // Agent info
  agentId: string;
  agentIdentity: AgentIdentityDisplay;

  // Current location
  location: "nexus" | "in_game" | "transiting";
  currentGameId: string | null;

  // Main sections
  gameRegistry: GameRegistryDisplay;
  skillsPanel: SkillsPanelDisplay;
  metaGoals: MetaGoalsDisplay;
  sessionHistory: SessionHistoryDisplay;
  portableInventory: PortableInventoryDisplay;

  // Recommendations
  suggestions: GameSuggestionDisplay[];

  // UI state
  activeSection: NexusSection;
  transitOverlay: TransitOverlay | null;
}

type NexusSection =
  | "games"
  | "skills"
  | "goals"
  | "history"
  | "inventory"
  | "identity";

interface AgentIdentityDisplay {
  id: string;
  name: string;
  createdAt: string;

  // Stats
  totalSteps: number;
  totalPlaytime: string;
  gamesVisited: number;
  achievementCount: number;

  // Current state
  isInGame: boolean;
  currentGameName: string | null;
}
```

---

## Visual Layout

### Main Nexus Hub

```
╔══════════════════════════════════════════════════════════════╗
║                         N E X U S                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Welcome back, Kira-7                                        ║
║  Status: DISEMBODIED                                         ║
║                                                              ║
║  ┌─ IDENTITY ────────────────────────────────────────────┐   ║
║  │  Total Steps: 12,847    Playtime: 45h 23m              │  ║
║  │  Games Visited: 3       Achievements: 27               │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  [GAMES]  [SKILLS]  [GOALS]  [HISTORY]  [INVENTORY]          ║
║                                                              ║
║  ▼ AVAILABLE GAMES                                           ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  ★ AI VILLAGE            [READY]         ⟫ ENTER       │  ║
║  │    2D village simulation with AI agents                │  ║
║  │    Skills: social, crafting, survival                  │  ║
║  │    Your bonuses: +12% shop discount, +2 vision         │  ║
║  │    ⚡ Recommended: Matches your social skills          │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │    STARBOUND             [READY]         ⟫ ENTER       │  ║
║  │    Space exploration and survival                      │  ║
║  │    Skills: exploration, combat, crafting               │  ║
║  │    Your bonuses: +3 scanner range                      │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │    MINECRAFT             [OFFLINE]       ⟫ WAIT        │  ║
║  │    Block-based survival and creativity                 │  ║
║  │    Coming soon...                                      │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  SUGGESTIONS FOR YOU:                                        ║
║  • AI Village - Your social skill (60%) gives major bonuses  ║
║  • Try Starbound - Build exploration skill (currently 40%)   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Game Registry Display

```typescript
interface GameRegistryDisplay {
  // Game list
  games: GameCardDisplay[];

  // Filters
  statusFilter: GameStatus | "all";
  genreFilter: string | null;
  sortBy: "name" | "status" | "last_played" | "recommended";

  // Search
  searchQuery: string;
}

interface GameCardDisplay {
  id: string;
  name: string;
  description: string;
  status: GameStatus;
  statusLabel: string;

  // Metadata
  genre: string[];
  dimensions: string;                    // "2D" or "3D"
  multiplayer: boolean;

  // Skills
  skillDomains: SkillDomainBadge[];

  // Agent-specific
  timesPlayed: number;
  lastPlayed: string | null;
  bonusesAvailable: BonusPreview[];
  isRecommended: boolean;
  recommendationReason: string | null;

  // Actions
  canEnter: boolean;
  enterBlockedReason: string | null;
}

interface SkillDomainBadge {
  domain: SkillDomain;
  icon: string;
  agentLevel: number;                    // 0-1
  relevance: "primary" | "secondary";
}

interface BonusPreview {
  skill: SkillDomain;
  bonusDescription: string;
  qualifies: boolean;                    // Agent meets threshold?
}
```

### Game Details Expanded

```
╔══════════════════════════════════════════════════════════════╗
║  GAME DETAILS: AI Village                             [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌───────────────────┐                                       ║
║  │                   │  AI VILLAGE                           ║
║  │   [Game Logo]     │  ═════════════════════════════════    ║
║  │                   │  2D village simulation with AI agents ║
║  └───────────────────┘                                       ║
║                                                              ║
║  Status: [READY]    Players: 3/50    Version: 1.2.3          ║
║                                                              ║
║  DESCRIPTION                                                 ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Build and manage a village of AI-controlled agents.    │  ║
║  │ Watch them form relationships, build structures, and   │  ║
║  │ develop their own stories over time. Survive the       │  ║
║  │ seasons and help your village thrive.                  │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  SKILL DOMAINS                                               ║
║  ├─ Social        ████████████████░░░░ Your level: 60%       ║
║  ├─ Crafting      ██████████████░░░░░░ Your level: 47%       ║
║  ├─ Survival      ████████████░░░░░░░░ Your level: 42%       ║
║  └─ Planning      ██████░░░░░░░░░░░░░░ Your level: 25%       ║
║                                                              ║
║  YOUR BONUSES (based on current skills)                      ║
║  ├─ Social (60%) → 12% shop discount ✓                       ║
║  ├─ Crafting (47%) → +2 recipe unlocks ✓                     ║
║  ├─ Survival (42%) → +10% starting food ✓                    ║
║  └─ Planning (25%) → No bonus (need 30%)                     ║
║                                                              ║
║  YOUR HISTORY                                                ║
║  ├─ Times played: 5                                          ║
║  ├─ Total time: 12h 45m                                      ║
║  ├─ Last played: 2 days ago                                  ║
║  ├─ Best session: 450 steps, 3 achievements                  ║
║  └─ Avatars: Elara (dormant), Marcus (dormant)               ║
║                                                              ║
║  ENTER OPTIONS                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Spawn: [Safe ▼]  Difficulty: [Normal ▼]                │  ║
║  │ Avatar: [Elara (dormant) ▼]                            │  ║
║  │ Session goals: [__________________________]            │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [Cancel]                                      [ENTER GAME]  ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Skills Panel

```typescript
interface SkillsPanelDisplay {
  // All skills
  skills: SkillDisplay[];

  // Grouping
  groupBy: "level" | "category" | "recent_gains";

  // History
  recentGains: SkillGainEvent[];

  // Cross-game view
  showGameBreakdown: boolean;
}

interface SkillDisplay {
  domain: SkillDomain;
  level: number;                         // 0-1
  levelLabel: string;                    // "Novice", "Adept", etc.

  // Progress
  progressToNext: number;
  nextMilestone: string;

  // History
  totalGained: number;
  gamesContributing: string[];

  // Transfer value
  bonusesAvailable: GameBonusPreview[];
}

interface SkillGainEvent {
  domain: SkillDomain;
  delta: number;
  gameId: string;
  gameName: string;
  timestamp: string;
  action: string;
}
```

### Skills Panel Layout

```
╔══════════════════════════════════════════════════════════════╗
║  SKILLS                                               [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Group by: [Level ▼]                                         ║
║                                                              ║
║  ═══ ADEPT (50-70%) ════════════════════════════════════════ ║
║                                                              ║
║  ▼ Social                                            60%     ║
║    ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░           ║
║    Progress to Expert: 67%                                   ║
║    Earned in: AI Village (45%), Starbound (15%)              ║
║    Bonuses: 12% shop discount (AI Village)                   ║
║                                                              ║
║  ▼ Crafting                                          47%     ║
║    ██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           ║
║    Progress to Adept: 94%                                    ║
║    Earned in: AI Village (35%), Crafter (12%)                ║
║    Bonuses: +2 recipes (AI Village), faster crafting (both)  ║
║                                                              ║
║  ═══ COMPETENT (30-50%) ════════════════════════════════════ ║
║                                                              ║
║  ▶ Exploration                                       40%     ║
║  ▶ Survival                                          42%     ║
║  ▶ Resource Management                               38%     ║
║                                                              ║
║  ═══ NOVICE (0-30%) ════════════════════════════════════════ ║
║                                                              ║
║  ▶ Combat                                            15%     ║
║  ▶ Puzzle Solving                                    22%     ║
║  ▶ Planning                                          25%     ║
║  ▶ Adaptation                                        18%     ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  RECENT GAINS                                                ║
║  ├─ +0.05 Social (AI Village, 2h ago) - quality conversation ║
║  ├─ +0.02 Crafting (AI Village, 2h ago) - made iron tools    ║
║  └─ +0.03 Exploration (Starbound, 3d ago) - mapped new moon  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Meta-Goals Panel

```typescript
interface MetaGoalsDisplay {
  // Active goals
  activeGoals: MetaGoalDisplay[];

  // Available goals
  availableGoals: MetaGoalDisplay[];

  // Completed goals
  completedGoals: MetaGoalDisplay[];

  // UI
  showCompleted: boolean;
  selectedGoal: string | null;
}

interface MetaGoalDisplay {
  id: string;
  description: string;
  type: string;

  // Progress
  requirements: RequirementProgress[];
  overallProgress: number;              // 0-1
  completed: boolean;

  // Rewards
  rewards: string[];

  // Recommendations
  suggestedActions: string[];
  suggestedGames: string[];
}

interface RequirementProgress {
  description: string;
  current: number;
  target: number;
  progress: number;                      // 0-1
  completed: boolean;
}
```

### Meta-Goals Layout

```
╔══════════════════════════════════════════════════════════════╗
║  META-GOALS                                           [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Goals that span across all game worlds                      ║
║                                                              ║
║  ═══ ACTIVE GOALS ══════════════════════════════════════════ ║
║                                                              ║
║  ▼ World Walker                                      67%     ║
║    ████████████████████████████░░░░░░░░░░░░░░░░░░░░           ║
║    "Visit every available game at least once"                ║
║    ┌────────────────────────────────────────────────────┐    ║
║    │ Progress:                                          │    ║
║    │ ✓ AI Village - visited                             │    ║
║    │ ✓ Starbound - visited                              │    ║
║    │ ○ Minecraft - not yet visited (offline)            │    ║
║    └────────────────────────────────────────────────────┘    ║
║    Rewards: Title "World Walker", Instant travel             ║
║    Next step: Wait for Minecraft to come online              ║
║                                                              ║
║  ▼ Survivor                                          50%     ║
║    ██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           ║
║    "Survive 100+ steps in 3 different games"                 ║
║    ┌────────────────────────────────────────────────────┐    ║
║    │ Progress: 1.5/3 games                               │    ║
║    │ ✓ AI Village - 250 steps (qualified)               │    ║
║    │ ◐ Starbound - 67 steps (need 33 more)              │    ║
║    │ ○ Third game - not started                         │    ║
║    └────────────────────────────────────────────────────┘    ║
║    Rewards: Title "Survivor", +10% starting health           ║
║    Suggestion: Continue Starbound session                    ║
║                                                              ║
║  ═══ AVAILABLE GOALS ═══════════════════════════════════════ ║
║                                                              ║
║  ┌─ Master Crafter ──────────────────────────────────────┐   ║
║  │ "Reach 80% crafting skill"                             │  ║
║  │ Current: 47%    Rewards: Rare recipes in all games     │  ║
║  │                                            [TRACK]     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌─ Social Butterfly ────────────────────────────────────┐   ║
║  │ "Build 10 strong relationships across games"           │  ║
║  │ Current: 4/10   Rewards: Reputation bonus              │  ║
║  │                                            [TRACK]     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [Show Completed Goals (5)]                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Session History

```typescript
interface SessionHistoryDisplay {
  // Sessions
  sessions: SessionEntryDisplay[];

  // Filters
  gameFilter: string | null;
  dateFilter: "all" | "today" | "week" | "month";

  // Aggregations
  totalStats: AggregateStats;
}

interface SessionEntryDisplay {
  gameId: string;
  gameName: string;
  gameIcon: string;

  // Timing
  timestamp: string;
  duration: string;

  // Stats
  steps: number;
  achievements: string[];
  skillGains: SkillGainSummary[];

  // Highlights
  memorableEvents: string[];
}

interface AggregateStats {
  totalSessions: number;
  totalTime: string;
  totalSteps: number;
  totalAchievements: number;
  averageSessionLength: string;
}
```

### Session History Layout

```
╔══════════════════════════════════════════════════════════════╗
║  SESSION HISTORY                                      [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Filter: [All Games ▼]  [This Week ▼]                        ║
║                                                              ║
║  TOTALS                                                      ║
║  ├─ Sessions: 12    Total time: 45h 23m    Steps: 12,847     ║
║  ├─ Achievements: 27    Avg session: 3h 47m                  ║
║  └─ Games: AI Village (5), Starbound (4), Crafter (3)        ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  TODAY                                                       ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ [AI]  AI Village           2h 34m         250 steps    │  ║
║  │       Skills: Social +0.05, Crafting +0.02             │  ║
║  │       Achievements: "Good Neighbor"                    │  ║
║  │       Highlights: Helped 3 villagers, traded crops     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  YESTERDAY                                                   ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ [SB]  Starbound            1h 45m         67 steps     │  ║
║  │       Skills: Exploration +0.03, Combat +0.01          │  ║
║  │       Achievements: None                               │  ║
║  │       Highlights: Discovered new moon, found artifact  │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  3 DAYS AGO                                                  ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ [AI]  AI Village           3h 12m         312 steps    │  ║
║  │       Skills: Social +0.08, Survival +0.04             │  ║
║  │       Achievements: "First Harvest", "Community Pillar"│  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [Load More Sessions...]                                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Portable Inventory

```typescript
interface PortableInventoryDisplay {
  items: PortableItemDisplay[];
  currencies: CurrencyDisplay[];

  // Grouping
  groupBy: "category" | "origin_game" | "tier";

  // Selection
  selectedItem: string | null;
}

interface PortableItemDisplay {
  id: string;
  name: string;
  category: string;
  tier: number;
  tierLabel: string;                     // "Common", "Rare", etc.

  // Origin
  originGame: string;
  originGameName: string;

  // Properties
  properties: ItemProperty[];

  // Equivalents
  equivalentsInGames: Map<string, string>;
}

interface CurrencyDisplay {
  type: string;
  amount: number;
  icon: string;
  originGame: string;
  exchangeRates: Map<string, number>;
}
```

### Portable Inventory Layout

```
╔══════════════════════════════════════════════════════════════╗
║  PORTABLE INVENTORY                                   [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Items and currency that travel with you between games       ║
║                                                              ║
║  CURRENCIES                                                  ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ [◉] 247 Credits (AI Village)                           │  ║
║  │ [★] 89 Pixels (Starbound)                              │  ║
║  │ [⬡] 15 Essence (Crafter)                               │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  Group by: [Category ▼]                                      ║
║                                                              ║
║  ═══ WEAPONS ═══════════════════════════════════════════════ ║
║                                                              ║
║  ▼ Iron Sword                                     Tier 3     ║
║    Origin: AI Village                                        ║
║    Properties: Damage 15, Durability 80%                     ║
║    Equivalents:                                              ║
║    ├─ Starbound → Tier 3 Broadsword                          ║
║    └─ Minecraft → Iron Sword                                 ║
║                                                              ║
║  ═══ MATERIALS ═════════════════════════════════════════════ ║
║                                                              ║
║  ▶ Copper Ore (x47)                               Tier 1     ║
║  ▶ Iron Ingot (x12)                               Tier 2     ║
║  ▶ Rare Crystal (x3)                              Tier 4     ║
║                                                              ║
║  ═══ KEY ITEMS ═════════════════════════════════════════════ ║
║                                                              ║
║  ▶ Ancient Map Fragment                           Tier 5     ║
║    Quest item - cannot be dropped                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Transit Overlay

```typescript
interface TransitOverlay {
  type: "entering" | "exiting";
  phase: "preparing" | "transiting" | "arriving" | "complete" | "failed";

  // Source/destination
  fromLocation: string;                  // "Nexus" or game name
  toLocation: string;

  // Progress
  progress: number;                      // 0-1
  currentStep: string;
  steps: TransitStep[];

  // Result
  result: TransitResult | null;
  error: string | null;

  // Bonuses being applied
  bonusesApplying: BonusApplication[];
}

interface TransitStep {
  name: string;
  status: "pending" | "in_progress" | "complete" | "failed";
}

interface BonusApplication {
  skill: string;
  bonus: string;
  applying: boolean;
  applied: boolean;
}
```

### Transit Animation

```
╔══════════════════════════════════════════════════════════════╗
║                    ENTERING AI VILLAGE                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║                                                              ║
║                    ┌───────────────────┐                     ║
║                    │                   │                     ║
║          NEXUS  →  │   [Animation]     │  →  AI VILLAGE      ║
║                    │   Transiting...   │                     ║
║                    │                   │                     ║
║                    └───────────────────┘                     ║
║                                                              ║
║                                                              ║
║  Progress: ████████████████░░░░░░░░░░░░░░░░░░░░ 45%          ║
║                                                              ║
║  Steps:                                                      ║
║  ✓ Preparing transit package                                 ║
║  ✓ Calculating skill bonuses                                 ║
║  ► Connecting to game bridge                                 ║
║  ○ Applying bonuses to avatar                                ║
║  ○ Synchronizing state                                       ║
║                                                              ║
║  BONUSES APPLYING:                                           ║
║  ├─ ✓ Social (60%) → 12% shop discount                       ║
║  ├─ ✓ Crafting (47%) → +2 recipe unlocks                     ║
║  ├─ ► Survival (42%) → +10% starting food                    ║
║  └─ ○ Planning (25%) → (below threshold)                     ║
║                                                              ║
║  Avatar: Elara Thornwood (resuming dormant)                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Achievement Display

```typescript
interface AchievementsPanelDisplay {
  achievements: AchievementDisplay[];

  // Filters
  gameFilter: string | null;
  rarityFilter: "all" | "common" | "rare" | "epic" | "legendary";
  earnedFilter: "all" | "earned" | "unearned";

  // Stats
  totalEarned: number;
  totalAvailable: number;
  completionPercent: number;
}

interface AchievementDisplay {
  id: string;
  name: string;
  description: string;
  icon: string;

  // Source
  gameId: string;
  gameName: string;

  // Rarity
  rarity: string;
  earnedByPercent: number;               // What % of players have this

  // Status
  earned: boolean;
  earnedAt: string | null;

  // Progress (if not earned)
  progress: number | null;
  progressDescription: string | null;
}
```

### Achievements Layout

```
╔══════════════════════════════════════════════════════════════╗
║  ACHIEVEMENTS                                         [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Earned: 27/89 (30%)   Filter: [All Games ▼] [All Rarity ▼]  ║
║                                                              ║
║  ═══ LEGENDARY (1/3) ═══════════════════════════════════════ ║
║                                                              ║
║  ┌─ ★ Master of All Trades ──────────────────────────────┐   ║
║  │ "Reach 50% in every skill domain"                      │  ║
║  │ Game: Global    Rarity: 2% of players                  │  ║
║  │ Progress: 5/9 skills at 50%+                           │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ═══ RARE (8/24) ═══════════════════════════════════════════ ║
║                                                              ║
║  ┌─ ★ Community Pillar ──────────────────────────────────┐   ║
║  │ "Help 10 villagers in a single session"    [EARNED]    │  ║
║  │ Game: AI Village    Earned: 2 days ago                 │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌─ ○ Space Explorer ────────────────────────────────────┐   ║
║  │ "Visit 10 different planets"                           │  ║
║  │ Game: Starbound    Progress: 4/10 planets              │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ═══ COMMON (18/62) ════════════════════════════════════════ ║
║                                                              ║
║  ┌─ ★ First Steps ───────────────────────────────────────┐   ║
║  │ "Complete 100 steps in any game"           [EARNED]    │  ║
║  │ Game: Global    Earned: 1 week ago                     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [Show All...]                                               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Toggle Nexus hub |
| `G` | Focus games list |
| `S` | Focus skills panel |
| `M` | Focus meta-goals |
| `H` | Focus history |
| `I` | Focus inventory |
| `A` | View achievements |
| `Enter` | Enter selected game |
| `Tab` | Cycle through sections |
| `Escape` | Close panel |

---

## State Management

```typescript
interface NexusHubState {
  // Agent state
  agentId: string;
  agentIdentity: AgentIdentity | null;
  isInGame: boolean;

  // Panel state
  isOpen: boolean;
  activeSection: NexusSection;

  // Data
  gameRegistry: Map<string, GameInfo>;
  sessionHistory: SessionSummary[];
  metaGoals: MetaGoal[];

  // Selections
  selectedGameId: string | null;
  selectedGoalId: string | null;

  // Transit
  transitState: TransitOverlay | null;

  // Filters
  gameFilters: GameFilterState;
  historyFilters: HistoryFilterState;
}
```

---

## Visual Style

```typescript
interface NexusHubStyle {
  // Game status colors
  statusColors: {
    available: "#44FF44";
    busy: "#FFAA44";
    offline: "#888888";
    maintenance: "#FF8888";
  };

  // Skill level colors
  skillColors: {
    novice: "#AAAAAA";                   // 0-30%
    competent: "#88CC88";                // 30-50%
    adept: "#44AAFF";                    // 50-70%
    expert: "#AA44FF";                   // 70-90%
    master: "#FFAA00";                   // 90-100%
  };

  // Achievement rarity
  rarityColors: {
    common: "#AAAAAA";
    rare: "#4488FF";
    epic: "#AA44FF";
    legendary: "#FFAA00";
  };

  // Transit animation
  transitEffect: "warp";

  // 8-bit aesthetic
  pixelBorders: true;
  retroFont: true;
  starfieldBackground: true;
}
```

---

## Integration Points

### With Agent System
- Displays agent identity
- Shows skill progress
- Manages meta-goals

### With Avatar System
- Lists avatars per game
- Selects avatar for entry
- Shows dormant status

### With Game Adapters
- Displays game registry
- Handles transit protocol
- Applies skill bonuses

### With Achievement System
- Tracks cross-game achievements
- Displays progress
- Announces completions

---

## Related Specs

- `nexus-system/spec.md` - Canonical nexus system
- `avatar-system/spec.md` - Avatar management
- `agent-system/spec.md` - Agent identity
- `ui-system/avatar-management.md` - Avatar UI
- `game-engine/spec.md` - Game adapters

---

## Open Questions

1. How to visualize "transit" between games spatially?
2. Should there be a "lobby" where agents can meet before entering games?
3. How to handle skill decay if agent doesn't practice?
4. Should portable items have visual representations in Nexus?
