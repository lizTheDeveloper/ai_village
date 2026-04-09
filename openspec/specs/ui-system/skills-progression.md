# Skills Progression UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The Skills Progression UI displays agent skill levels, experience gains, and learning progress. Skills are 0-100 values that affect action success rates and quality outcomes. This UI helps players understand agent capabilities and track growth over time.

**Core principle:**
> "Skills grow through practice, shaped by personality and species"

---

## Dependencies

- `agent-system/spec.md` - SkillSet definition, skill mechanics
- `agent-system/species-system.md` - Species aptitudes (skill bonuses/penalties)
- `progression-system/spec.md` - Emergence tracking

---

## Requirements

### REQ-SKL-001: Skills Panel

Display agent skill levels and experience.

```typescript
// Re-export from agent-system/spec for reference
import type { SkillSet, PersonalityTraits } from "agent-system/spec";
import type { Species, InnateTrait } from "agent-system/species-system";

interface SkillsPanel {
  isOpen: boolean;

  // Agent reference
  agentId: string;
  agentName: string;
  agentSpecies: Species;

  // Skills data
  skills: SkillSet;                    // From agent-system
  skillDisplays: SkillDisplay[];

  // Grouping
  activeGroup: SkillGroup;
  showAllSkills: boolean;

  // History
  showHistory: boolean;
  historyTimeRange: TimeRange;
}

type SkillGroup =
  | "all"
  | "core"                             // farming, construction, crafting
  | "survival"                         // foraging, fishing, hunting
  | "social"                           // trading, socializing, leadership
  | "knowledge"                        // research, writing, literacy
  | "conflict";                        // combat, intimidation, stealth

// Core skills from SkillSet
type SkillName = keyof SkillSet;
```

**Skills Panel Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚔️ SKILLS - Aelindra the Weaver                                    [X]    │
├───────────────────────────────────────────────────────────────────────────────┤
│  Species: Elf (+20 Farming, +15 Crafting, -20 Mining)                       │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ GROUPS        │  CORE SKILLS                           [Sort: Level ▼]     │
│               │                                                             │
│ ● All         │  ┌─────────────────────────────────────────────────────┐   │
│ ○ Core        │  │ 🌾 FARMING                                    78    │   │
│ ○ Survival    │  │ ████████████████████████████████████████░░░░░░░░   │   │
│ ○ Social      │  │ +20 species | Growing steadily                     │   │
│ ○ Knowledge   │  └─────────────────────────────────────────────────────┘   │
│ ○ Conflict    │                                                             │
│               │  ┌─────────────────────────────────────────────────────┐   │
│ ─────────     │  │ 🔨 CRAFTING                                   65    │   │
│               │  │ ██████████████████████████████████░░░░░░░░░░░░░░   │   │
│ [History]     │  │ +15 species | Recent: Wove tapestry (+12 XP)       │   │
│               │  └─────────────────────────────────────────────────────┘   │
│               │                                                             │
│               │  ┌─────────────────────────────────────────────────────┐   │
│               │  │ 🏗️ CONSTRUCTION                               42    │   │
│               │  │ ██████████████████████████░░░░░░░░░░░░░░░░░░░░░░   │   │
│               │  │ No modifier | Slow growth                          │   │
│               │  └─────────────────────────────────────────────────────┘   │
│               │                                                             │
│               │  SURVIVAL SKILLS                                            │
│               │  ─────────────────────────────────────────────────────────  │
│               │                                                             │
│               │  🍄 Foraging: 56  |  🎣 Fishing: 23  |  🏹 Hunting: 31     │
│               │                                                             │
│               │  SOCIAL SKILLS                                              │
│               │  ─────────────────────────────────────────────────────────  │
│               │                                                             │
│               │  💰 Trading: 45  |  💬 Socializing: 67  |  👑 Leadership: 38│
│               │                                                             │
├───────────────┴─────────────────────────────────────────────────────────────┤
│  Total XP This Season: 847                          [View Skill History]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SKL-002: Skill Detail View

Detailed view of a single skill.

```typescript
interface SkillDisplay {
  skill: SkillName;
  level: number;                       // 0-100

  // Experience tracking
  currentXP: number;
  xpToNextLevel: number;
  xpProgress: number;                  // 0-1

  // Modifiers
  speciesModifier: number;             // From Species.aptitudes
  traitModifiers: TraitModifier[];     // From InnateTrait effects
  equipmentModifiers: EquipmentModifier[];

  // Effective level (after modifiers)
  effectiveLevel: number;

  // Growth tracking
  recentGains: SkillGain[];
  growthRate: GrowthRate;

  // Actions this skill affects
  affectedActions: AffectedAction[];
}

interface TraitModifier {
  traitName: string;
  modifier: number;
  source: "innate" | "acquired" | "equipment";
}

interface EquipmentModifier {
  itemName: string;
  modifier: number;
  isEquipped: boolean;
}

interface SkillGain {
  xpAmount: number;
  source: string;                      // "Harvested wheat", "Built fence"
  timestamp: GameTime;
}

type GrowthRate = "dormant" | "slow" | "steady" | "rapid" | "explosive";

interface AffectedAction {
  action: string;
  effect: string;
  currentBonus: string;
}
```

**Skill Detail View:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🌾 FARMING - Detailed View                                      [◀ Back]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LEVEL: 78 / 100                     EFFECTIVE: 98 (+20 species)           │
│  ████████████████████████████████████████████████████████████░░░░░░░░░░░░  │
│                                                                             │
│  XP Progress: 2,340 / 3,000 to Level 79                                     │
│  █████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░  78%       │
│                                                                             │
│  MODIFIERS                                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  +20  Elf Species Aptitude                                                  │
│  + 5  "Nature Affinity" Innate Trait                                        │
│  + 3  Blessed Hoe (equipped)                                                │
│  ────                                                                       │
│  +28  Total Modifier (Effective Level: 98)                                  │
│                                                                             │
│  GROWTH RATE: Steady 📈                                                     │
│                                                                             │
│  RECENT XP GAINS                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Harvested mature wheat field       +45 XP     Today                      │
│  • Planted autumn vegetables          +12 XP     Today                      │
│  • Tended to struggling crops         +23 XP     Yesterday                  │
│  • Successful crop breeding           +78 XP     2 days ago                 │
│  • Discovered wild herb variety       +15 XP     3 days ago                 │
│                                                                             │
│  AFFECTED ACTIONS                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Crop Yield:          +39% bonus yield                                    │
│  • Growth Speed:        +20% faster growth                                  │
│  • Disease Resistance:  +15% crop health                                    │
│  • Seed Quality:        Can produce excellent seeds                         │
│  • Crop Breeding:       Can attempt cross-breeding                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SKL-003: Skill History Graph

Visualize skill growth over time.

```typescript
interface SkillHistoryGraph {
  skill: SkillName;

  // Time range
  startTime: GameTime;
  endTime: GameTime;
  resolution: "day" | "week" | "season" | "year";

  // Data points
  dataPoints: SkillDataPoint[];

  // Annotations
  milestones: SkillMilestone[];
  events: SkillEvent[];

  // Comparison (optional)
  comparisonAgent?: {
    agentId: string;
    agentName: string;
    dataPoints: SkillDataPoint[];
  };
}

interface SkillDataPoint {
  time: GameTime;
  level: number;
  xp: number;
}

interface SkillMilestone {
  level: number;
  label: string;
  time: GameTime;
  unlocks: string[];
}

interface SkillEvent {
  time: GameTime;
  description: string;
  xpChange: number;
  icon: Sprite;
}
```

**Skill History Graph:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📈 FARMING HISTORY - Past Year                                  [◀ Back]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  100 ┤                                                            ╭────    │
│      │                                                        ╭───╯        │
│   80 ┤                                              ╭─────────╯            │
│      │                                    ╭─────────╯                      │
│   60 ┤                          ╭─────────╯                                │
│      │                ╭─────────╯         ★ Crop breeding                  │
│   40 ┤      ╭─────────╯                     unlocked                       │
│      │╭─────╯                                                              │
│   20 ┤│                                                                    │
│      ││                                                                    │
│    0 ┼─────────────────────────────────────────────────────────────────    │
│       Spring   Summer    Fall    Winter   Spring   Summer    Fall         │
│       Year 1                               Year 2                          │
│                                                                             │
│  MILESTONES                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ★ Level 25: Basic crop rotation unlocked                                   │
│  ★ Level 50: Advanced soil management                                       │
│  ★ Level 75: Crop breeding experiments                                      │
│                                                                             │
│  NOTABLE EVENTS                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  📚 Learned from Elder Thom (+150 XP)                    Summer Y1         │
│  🌾 First bumper harvest (+200 XP)                       Fall Y1           │
│  🔬 Successful crop hybrid (+300 XP)                     Spring Y2         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SKL-004: Village Skills Overview

Overview of all village agents' skills.

```typescript
interface VillageSkillsOverview {
  villageId: string;

  // Aggregated data
  skillAverages: Map<SkillName, number>;
  skillDistributions: Map<SkillName, SkillDistribution>;

  // Top performers
  topPerformers: Map<SkillName, AgentSkillRank[]>;

  // Skill gaps
  skillGaps: SkillGap[];

  // Learning opportunities
  mentorships: MentorshipOpportunity[];
}

interface SkillDistribution {
  skill: SkillName;
  min: number;
  max: number;
  average: number;
  median: number;
  histogram: number[];                 // Buckets of 10 (0-9, 10-19, etc.)
}

interface AgentSkillRank {
  agentId: string;
  agentName: string;
  level: number;
  rank: number;
}

interface SkillGap {
  skill: SkillName;
  currentAverage: number;
  neededLevel: number;
  reason: string;
  recommendations: string[];
}

interface MentorshipOpportunity {
  mentor: { id: string; name: string; level: number };
  student: { id: string; name: string; level: number };
  skill: SkillName;
  potentialGain: number;
}
```

**Village Skills Overview:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 VILLAGE SKILLS OVERVIEW                                         [X]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SKILL AVERAGES                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Farming        ██████████████████████████████████████░░░░ 72  (12 agents) │
│  Crafting       ████████████████████████████░░░░░░░░░░░░░░ 56  (8 agents)  │
│  Construction   ████████████████████████░░░░░░░░░░░░░░░░░░ 48  (10 agents) │
│  Trading        ██████████████████░░░░░░░░░░░░░░░░░░░░░░░░ 36  (5 agents)  │
│  Research       ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 28  (3 agents)  │
│  Combat         ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 16  (4 agents)  │
│                                                                             │
│  TOP PERFORMERS                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🥇 Farming:     Aelindra (78)  |  🥇 Crafting:    Haldrek (82)             │
│  🥈 Farming:     Giles (71)     |  🥈 Crafting:    Mira (67)               │
│  🥉 Farming:     Willow (68)    |  🥉 Crafting:    Aelindra (65)           │
│                                                                             │
│  SKILL GAPS                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚠️ Research (Avg: 28) - Need level 50 for advanced tech                   │
│     Recommendation: Elder Sage could mentor younger agents                  │
│                                                                             │
│  ⚠️ Combat (Avg: 16) - Vulnerable to raids                                 │
│     Recommendation: Recruit guard or train existing agents                  │
│                                                                             │
│  MENTORSHIP OPPORTUNITIES                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Aelindra (Farming 78) → Young Pip (Farming 12)  Potential: +15 levels     │
│  Haldrek (Crafting 82) → Mira (Crafting 67)       Potential: +8 levels      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SKL-005: Skill Comparison

Compare skills between agents.

```typescript
interface SkillComparison {
  agents: AgentSkillProfile[];

  // Comparison type
  comparisonMode: "overlay" | "side_by_side" | "radar";

  // Selected skills
  selectedSkills: SkillName[];
}

interface AgentSkillProfile {
  agentId: string;
  agentName: string;
  species: string;
  color: Color;
  skills: SkillSet;
  speciesModifiers: Map<SkillName, number>;
}
```

**Skill Comparison (Radar Chart):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 SKILL COMPARISON                                                [X]    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Comparing: 🔵 Aelindra (Elf)  vs  🟠 Haldrek (Dwarf)                       │
│                                                                             │
│                        Farming                                              │
│                          78│56                                              │
│                            ╲│                                               │
│            Research ────────┼──────── Construction                          │
│                45│23        │        42│87                                  │
│                   ╲         │         ╱                                     │
│                    ╲        │        ╱                                      │
│                     ╲       │       ╱                                       │
│      Trading─────────╲──────┼──────╱─────────Combat                         │
│           45│32       ╲     │     ╱       31│45                             │
│                        ╲    │    ╱                                          │
│                         ╲   │   ╱                                           │
│                          ╲  │  ╱                                            │
│                           ╲ │ ╱                                             │
│                            ╲│╱                                              │
│          Crafting───────────┼───────────Foraging                            │
│              65│82          │          56│34                                │
│                                                                             │
│  INSIGHTS                                                                   │
│  • Aelindra excels at: Farming (+22), Foraging (+22)                       │
│  • Haldrek excels at: Crafting (+17), Construction (+45), Combat (+14)      │
│  • Good team: Complementary skill sets                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

```
SKILLS PANEL CONTROLS:
- S              : Open skills panel
- Escape         : Close
- 1-6            : Switch skill groups
- Enter          : View skill detail
- H              : Toggle history view
- C              : Open comparison mode
- V              : Village overview
```

---

## State Management

### Agent System Integration

```typescript
interface SkillsUIState {
  // View state
  isOpen: boolean;
  selectedAgentId: string | null;
  activeGroup: SkillGroup;
  selectedSkill: SkillName | null;

  // History
  showHistory: boolean;
  historyTimeRange: TimeRange;

  // Comparison
  comparisonMode: boolean;
  comparedAgentIds: string[];

  // Events from agent system
  onSkillGain: Event<{ agentId: string; skill: SkillName; xp: number; source: string }>;
  onSkillLevelUp: Event<{ agentId: string; skill: SkillName; newLevel: number }>;
  onMilestoneReached: Event<{ agentId: string; skill: SkillName; milestone: SkillMilestone }>;
}
```

---

## Visual Style

```typescript
interface SkillsUIStyle {
  // Skill bars
  barFillColor: Color;
  barBackgroundColor: Color;
  xpProgressColor: Color;

  // Modifier colors
  positiveModifier: Color;             // Green
  negativeModifier: Color;             // Red
  neutralModifier: Color;              // Gray

  // Growth rate colors
  growthColors: Map<GrowthRate, Color>;

  // Skill group colors
  groupColors: Map<SkillGroup, Color>;

  // 8-bit styling
  pixelScale: number;
}
```

---

## Open Questions

1. Should there be skill caps based on species/age?
2. Skill decay for unused skills?
3. Skill synergies (e.g., farming + research = crop breeding)?
4. Legendary skill levels (100+) with special abilities?
5. Skill-based titles or recognition?

---

## Related Specs

- `agent-system/spec.md` - SkillSet definition
- `agent-system/species-system.md` - Species aptitudes
- `progression-system/spec.md` - Emergence tracking
- `ui-system/agent-roster.md` - Agent overview includes skills
