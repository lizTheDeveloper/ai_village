# Agent Needs Panel - UI Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0
**Depends on:** `agent-system/needs.md`

---

## Overview

The needs panel displays an agent's current needs state, allowing players to understand what drives agent behavior. Needs range from physical survival (hunger, thirst) to higher psychological needs (purpose, creativity). The panel visualizes need tiers, urgency levels, and how personality affects need priorities.

For alien species, the panel adapts to show species-specific need structures that may differ fundamentally from human psychology.

---

## Type Definitions

```typescript
import {
  AgentNeeds,
  Need,
  NeedTier,
  NEED_TIERS,
  Desire,
  Strategy,
  NeedSatisfactionStrategy,
  PhysicalNeeds,
  SocialNeeds,
  PsychologicalNeeds,
  // Species-specific
  SpeciesNeedProfile,
  PackMindNeeds,
  HiveWorkerNeeds,
  ManchiNeeds,
  SymbiontNeeds,
  CyclicalNeeds,
  DominanceNeeds,
} from "@specs/agent-system/needs";

import { Agent } from "@specs/agent-system/spec";
import { SpeciesInfo } from "@specs/agent-system/species-system";
```

---

## Needs Panel Structure

### Main Panel

```typescript
interface NeedsPanel {
  agentId: string;
  agentName: string;
  species: string;

  // Overall state
  overallWellbeing: WellbeingIndicator;
  criticalNeeds: NeedDisplay[];          // Needs below critical threshold

  // Tier-organized display
  tiers: NeedTierDisplay[];

  // What agent wants to do
  currentDesires: DesireDisplay[];

  // Personality modifiers
  personalityInfluences: PersonalityNeedModifier[];

  // Species-specific section (if alien)
  alienNeeds?: AlienNeedSection;

  // UI state
  expandedTier: number | null;
  showAllNeeds: boolean;                 // vs only unsatisfied
  compareMode: boolean;                  // Compare to village average
}

interface WellbeingIndicator {
  overall: number;                       // 0-100 composite score
  status: "thriving" | "content" | "struggling" | "suffering" | "critical";
  primaryConcerns: string[];             // Top 1-3 issues
  trend: "improving" | "stable" | "declining";
}
```

### Need Display

```typescript
interface NeedDisplay {
  name: string;
  category: string;                      // physical, safety, social, etc.
  tier: number;

  // Current state
  current: number;                       // 0-100
  baseline: number;                      // Natural resting point
  trend: "rising" | "stable" | "falling";

  // Thresholds
  criticalThreshold: number;
  lowThreshold: number;                  // Usually 30

  // Visual indicators
  barColor: NeedBarColor;
  urgencyLevel: "critical" | "low" | "moderate" | "satisfied";
  pulseAnimation: boolean;               // True if critical

  // Context
  satisfiedAt: string | null;            // Relative time ("2 hours ago")
  desperateAt: string | null;            // When last critical
  decayRate: number;                     // Per hour
  estimatedTimeToCritical: string | null; // If declining

  // Personality weight
  personalWeight: number;                // How much agent cares (0.5-2.0)
  personalWeightLabel: string;           // "Cares deeply" / "Indifferent"

  // What can satisfy
  satisfactionSources: string[];
  currentEffects: string[];              // Active effects from this need
}

type NeedBarColor =
  | "critical_red"       // Below critical threshold
  | "warning_orange"     // Below low threshold
  | "moderate_yellow"    // 30-70
  | "good_green"         // 70-90
  | "excellent_blue";    // 90-100

interface NeedTierDisplay {
  tier: number;
  name: string;                          // "Survival", "Safety", etc.
  icon: string;
  urgencyMultiplier: number;

  // Tier summary
  lowestNeed: NeedDisplay | null;
  averageLevel: number;
  needCount: number;
  criticalCount: number;

  // Expanded content
  needs: NeedDisplay[];

  // Is this tier suppressing higher tiers?
  suppressingHigherNeeds: boolean;
  suppressionReason: string | null;
}
```

---

## Visual Layout

### Main Panel Layout

```
╔══════════════════════════════════════════════════════════════╗
║  NEEDS: Elara the Farmer                              [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Overall Wellbeing: ████████░░ 78%  [Content]  ▲ improving   ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Concerns: Friendship declining, Needs rest soon        │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  ▼ SURVIVAL (Tier 1)                           Avg: 72%      ║
║  ├─ Hunger    ██████████████░░░░░░ 68%  ⏱ ~4 hrs to low      ║
║  ├─ Thirst    ████████████████████ 95%  ✓ Just drank         ║
║  ├─ Energy    ████████░░░░░░░░░░░░ 42%  ▼ declining          ║
║  ├─ Warmth    ██████████████████░░ 88%  ≈ stable             ║
║  └─ Health    ████████████████████ 100% ✓ fully healthy      ║
║                                                              ║
║  ▶ SAFETY (Tier 2)                             Avg: 91%      ║
║                                                              ║
║  ▶ SOCIAL (Tier 3)                             Avg: 58%  ⚠   ║
║    └─ Friendship at 45% (low)                                ║
║                                                              ║
║  ▶ PSYCHOLOGICAL (Tier 4)                      Avg: 74%      ║
║                                                              ║
║  ▶ SELF-ACTUALIZATION (Tier 5)                 Avg: 62%      ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  CURRENT DESIRES                                             ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 1. Find friend to talk with  [friendship]  urgency: ▓▓░  │ ║
║  │ 2. Take a rest              [energy]      urgency: ▓▓░  │ ║
║  │ 3. Eat a meal               [hunger]      urgency: ▓░░  │ ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [Show All Needs] [Compare to Village] [Personality Effects] ║
╚══════════════════════════════════════════════════════════════╝
```

### Expanded Tier View

```
╔══════════════════════════════════════════════════════════════╗
║  ▼ SOCIAL (Tier 3)                             Avg: 58%  ⚠   ║
║  ─────────────────────────────────────────────────────────── ║
║                                                              ║
║  Belonging                                                   ║
║  ├─ Current: ██████████████░░░░░░ 68%                        ║
║  ├─ Personal weight: 1.0× (normal)                           ║
║  ├─ Decay rate: 2/day                                        ║
║  ├─ Satisfied by: Group activities, Being greeted            ║
║  └─ Status: ≈ stable                                         ║
║                                                              ║
║  Friendship       ⚠ LOW                                      ║
║  ├─ Current: █████████░░░░░░░░░░░ 45%                        ║
║  ├─ Personal weight: 1.3× (cares more than average)          ║
║  ├─ Decay rate: 3/day                                        ║
║  ├─ Satisfied by: Quality conversation, Shared activity      ║
║  ├─ Last satisfied: 3 days ago                               ║
║  ├─ Effects: [missing_connection] [seeking_company]          ║
║  └─ Status: ▼ declining                                      ║
║                                                              ║
║  Intimacy                                                    ║
║  ├─ Current: ██████████████████░░ 85%                        ║
║  ├─ Personal weight: 0.8× (less concerned than average)      ║
║  └─ Status: ≈ stable                                         ║
║                                                              ║
║  Respect                                                     ║
║  ├─ Current: ████████████████░░░░ 78%                        ║
║  └─ Status: ≈ stable                                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Critical Need Alert

```
╔══════════════════════════════════════════════════════════════╗
║  ⚠ CRITICAL NEED: Energy at 8%                               ║
║  ─────────────────────────────────────────────────────────── ║
║  ██░░░░░░░░░░░░░░░░░░ 8%   CRITICAL                          ║
║                                                              ║
║  Effects: [exhausted] [will_sleep_anywhere]                  ║
║                                                              ║
║  This need is suppressing all higher-tier needs.             ║
║  Agent will prioritize rest above all else.                  ║
║                                                              ║
║  Satisfaction options:                                       ║
║  • Sleep (8 hours) → +80 energy                              ║
║  • Rest in chair (2 hours) → +20 energy                      ║
║  • Quick nap (30 min) → +10 energy                           ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Desire Display

```typescript
interface DesireDisplay {
  rank: number;                          // Priority order
  action: string;                        // What agent wants to do
  targetNeed: string;                    // Which need it would satisfy
  urgency: UrgencyDisplay;
  satisfactionAmount: number;            // How much it would help

  // Feasibility
  canDoNow: boolean;
  blockedBy: string[];                   // If not feasible

  // Strategy chosen
  strategy: StrategyDisplay | null;
}

interface UrgencyDisplay {
  value: number;                         // 0-1
  bars: number;                          // 1-3 visual bars
  label: "low" | "moderate" | "high" | "critical";
}

interface StrategyDisplay {
  name: string;
  requirements: string[];
  meetsRequirements: boolean;
  duration: string;                      // "45 minutes"
  sideEffects: SideEffectDisplay[];
}

interface SideEffectDisplay {
  need: string;
  change: number;
  direction: "positive" | "negative";
}
```

### Desire List Layout

```
╔══════════════════════════════════════════════════════════════╗
║  CURRENT DESIRES                                      [help] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Priority  Action                     Target      Urgency    ║
║  ────────────────────────────────────────────────────────────║
║  1.        Find someone to talk to    friendship  ▓▓▓ high   ║
║            ├─ Strategy: quality_conversation                 ║
║            ├─ Requires: friend_available                     ║
║            ├─ Duration: ~30 min                              ║
║            └─ Would satisfy: +35 friendship                  ║
║                                                              ║
║  2.        Take a nap                 energy      ▓▓░ med    ║
║            ├─ Strategy: rest_in_chair                        ║
║            ├─ Requires: chair_available                      ║
║            ├─ Duration: ~2 hours                             ║
║            └─ Side effect: -5 hunger                         ║
║                                                              ║
║  3.        Eat stored food            hunger      ▓░░ low    ║
║            ├─ Can do now: ✓                                  ║
║            └─ Would satisfy: +40 hunger                      ║
║                                                              ║
║  4.        Work on pottery            competence  ▓░░ low    ║
║            ├─ Personal passion project                       ║
║            └─ Would satisfy: +15 competence, +8 purpose      ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Personality Influence Display

```typescript
interface PersonalityNeedModifier {
  trait: string;                         // "extraversion", "ambition", etc.
  traitLevel: "high" | "low";
  traitValue: number;

  affectedNeeds: PersonalityNeedEffect[];
}

interface PersonalityNeedEffect {
  need: string;
  modifier: number;                      // 0.5-2.0
  explanation: string;                   // "Needs more social interaction"
}
```

### Personality Effects Layout

```
╔══════════════════════════════════════════════════════════════╗
║  PERSONALITY → NEEDS                                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  High Extraversion (0.78)                                    ║
║  ├─ belonging:   1.5× weight  "Deeply needs community"       ║
║  ├─ friendship:  1.3× weight  "Values close relationships"   ║
║  └─ novelty:     1.2× weight  "Craves new experiences"       ║
║                                                              ║
║  High Creativity (0.82)                                      ║
║  ├─ beauty:      1.5× weight  "Aesthetic appreciation vital" ║
║  ├─ creativity:  2.0× weight  "Compelled to create"          ║
║  └─ novelty:     1.3× weight  "Seeks inspiration"            ║
║                                                              ║
║  Low Adventurousness (0.25)                                  ║
║  ├─ safety.*:    1.5× weight  "Values security highly"       ║
║  └─ novelty:     0.5× weight  "Prefers familiar routines"    ║
║                                                              ║
║  ─────────────────────────────────────────────────────────── ║
║  Net effect: This agent prioritizes creative expression      ║
║  and social connection, but dislikes risk and change.        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Species-Specific Needs Display

### Alien Needs Section

```typescript
interface AlienNeedSection {
  species: string;
  needProfileType: string;               // "pack_mind", "hive", "manchi", etc.

  // Standard needs modified
  modifiedNeeds: ModifiedNeedDisplay[];
  removedNeeds: RemovedNeedDisplay[];

  // Unique alien needs
  uniqueNeeds: AlienNeedDisplay[];

  // Tier structure differences
  tierOverrides: TierOverrideDisplay[];

  // Human translation help
  psychologyNotes: string[];             // Help player understand
}

interface AlienNeedDisplay {
  name: string;
  description: string;
  humanEquivalent: string | null;        // Nearest human concept

  current: number;
  status: string;

  // Visual distinction
  displayStyle: "standard" | "exotic" | "incomprehensible";

  // Effects in alien psychology
  effects: {
    low: string[];
    critical: string[];
  };
}

interface ModifiedNeedDisplay {
  standardNeed: string;
  modification: string;
  newSatisfactionSources: string[];
}

interface RemovedNeedDisplay {
  standardNeed: string;
  reason: string;                        // Why it doesn't apply
}
```

### Pack Mind Needs Layout

```
╔══════════════════════════════════════════════════════════════╗
║  NEEDS: Kethrix Pack (Pack Mind)                      [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ╭────────────────────────────────────────────────────────╮  ║
║  │  This entity is a PACK MIND - a single consciousness    │ ║
║  │  distributed across multiple bodies. Need structure     │ ║
║  │  differs significantly from individual psychology.      │ ║
║  ╰────────────────────────────────────────────────────────╯  ║
║                                                              ║
║  ═══ PACK-SPECIFIC NEEDS (CRITICAL) ════════════════════════ ║
║                                                              ║
║  Coherence                             Tier 1 (Survival)     ║
║  ├─ Current: ████████████████░░░░ 82%                        ║
║  ├─ "Minds in harmony, thinking as one"                      ║
║  ├─ All 4 bodies within range: ✓                             ║
║  └─ Status: ≈ stable                                         ║
║                                                              ║
║  Pack Proximity                        Tier 1 (Survival)     ║
║  ├─ Current: ██████████████████░░ 90%                        ║
║  ├─ Bodies: Keth-α (3m) Keth-β (5m) Keth-γ (8m) Keth-δ (2m)  ║
║  └─ Max allowed distance: 10m                                ║
║                                                              ║
║  Body Balance                          Tier 2 (Safety)       ║
║  ├─ Current: ████████████████████ 100%                       ║
║  ├─ Roles: Thinker ✓  Sensor ✓  Manipulator ✓                ║
║  └─ All body roles represented                               ║
║                                                              ║
║  ═══ MODIFIED NEEDS ════════════════════════════════════════ ║
║                                                              ║
║  ✗ Intimacy — DOES NOT APPLY                                 ║
║    "Pack IS intimacy - always connected"                     ║
║                                                              ║
║  ✗ Loneliness — DOES NOT APPLY                               ║
║    "Bodies are never alone while pack is whole"              ║
║                                                              ║
║  ═══ STANDARD NEEDS ════════════════════════════════════════ ║
║                                                              ║
║  ▶ SURVIVAL (Tier 1) — Per-body physical needs   Avg: 71%   ║
║  ▶ SAFETY (Tier 2)                               Avg: 88%   ║
║  ▶ SOCIAL (Tier 3)                               Avg: 76%   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Man'chi Psychology Layout

```
╔══════════════════════════════════════════════════════════════╗
║  NEEDS: Banichi (Atevi - Man'chi Psychology)          [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ╭────────────────────────────────────────────────────────╮  ║
║  │  Atevi psychology centers on MAN'CHI - emotional       │  ║
║  │  allegiance that replaces human concepts of friendship │  ║
║  │  and intimacy. Identity comes from association.        │  ║
║  ╰────────────────────────────────────────────────────────╯  ║
║                                                              ║
║  ═══ MAN'CHI NEEDS (REPLACES SOCIAL) ═══════════════════════ ║
║                                                              ║
║  Man'chi Anchor                        Tier 2 (Identity)     ║
║  ├─ Status: SATISFIED                                        ║
║  ├─ Anchored to: Lord Tatiseigi                              ║
║  ├─ Certainty: Absolute                                      ║
║  └─ "Having someone to be loyal TO"                          ║
║                                                              ║
║  Hierarchy Clarity                     Tier 2 (Identity)     ║
║  ├─ Current: ██████████████████░░ 88%                        ║
║  ├─ Position: Senior bodyguard, 3rd in household             ║
║  ├─ Satisfied by: Clear orders, Formal acknowledgment        ║
║  └─ Status: ≈ stable                                         ║
║                                                              ║
║  Association Prestige                  Tier 3 (Social)       ║
║  ├─ Current: ████████████████░░░░ 79%                        ║
║  ├─ Tatiseigi association standing: Respected                ║
║  └─ Note: Personal respect irrelevant; association matters   ║
║                                                              ║
║  ═══ REMOVED NEEDS ═════════════════════════════════════════ ║
║                                                              ║
║  ✗ Friendship — PSYCHOLOGICALLY IMPOSSIBLE                   ║
║    "No such concept in Atevi psychology"                     ║
║                                                              ║
║  ✗ Intimacy — REPLACED BY PRIVILEGED MAN'CHI                 ║
║                                                              ║
║  ✗ Autonomy — CONTRADICTS MAN'CHI                            ║
║    "Identity comes from serving, not independence"           ║
║                                                              ║
║  ═══ STANDARD NEEDS (MODIFIED) ═════════════════════════════ ║
║                                                              ║
║  Respect                               (Modified)            ║
║  ├─ Current: ████████████████████ 94%                        ║
║  ├─ Satisfied by: Proper address, Rank acknowledgment        ║
║  └─ NOT satisfied by: Casual praise, Friendship gestures     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Hive Worker Layout

```
╔══════════════════════════════════════════════════════════════╗
║  NEEDS: Worker-7734 (Hive Mind - Worker Caste)        [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ╭────────────────────────────────────────────────────────╮  ║
║  │  Individual workers have minimal needs - the HIVE has  │  ║
║  │  needs. This worker exists to serve hive functions.    │  ║
║  ╰────────────────────────────────────────────────────────╯  ║
║                                                              ║
║  ═══ WORKER NEEDS (TRUNCATED) ══════════════════════════════ ║
║                                                              ║
║  Hive Connection                       Tier 0 (ABOVE ALL)    ║
║  ├─ Current: ████████████████████ 100%                       ║
║  ├─ Connection: Strong link to Queen-Mother                  ║
║  ├─ Distance: 142m from central hive                         ║
║  └─ "Connection to hive mind - dies quickly if severed"      ║
║                                                              ║
║  Role Satisfaction                     Tier 2                ║
║  ├─ Current: ████████████████░░░░ 78%                        ║
║  ├─ Caste: Builder                                           ║
║  ├─ Current task: Constructing wall section                  ║
║  └─ "Performing what caste should do"                        ║
║                                                              ║
║  Physical (Minimal)                    Tier 1                ║
║  ├─ Energy: ██████████████░░░░░░ 72%                         ║
║  └─ Health: ████████████████████ 100%                        ║
║                                                              ║
║  ═══ DOES NOT HAVE ═════════════════════════════════════════ ║
║                                                              ║
║  ✗ Social needs — "Hive IS society"                          ║
║  ✗ Psychological needs — "Hive provides purpose"             ║
║  ✗ Self-actualization — "Self is hive"                       ║
║                                                              ║
║  ─────────────────────────────────────────────────────────── ║
║                                                              ║
║  [View Hive Collective Needs]                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Hive Collective Needs

```
╔══════════════════════════════════════════════════════════════╗
║  HIVE COLLECTIVE NEEDS: Zethrak Hive                  [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ╭────────────────────────────────────────────────────────╮  ║
║  │  The HIVE as an entity has needs. Individual workers   │  ║
║  │  do not experience these - the collective does.        │  ║
║  ╰────────────────────────────────────────────────────────╯  ║
║                                                              ║
║  Queen Health                          Tier 0 (CRITICAL)     ║
║  ├─ Current: ██████████████████░░ 92%                        ║
║  └─ "Central node viability - hive dies if queen dies"       ║
║                                                              ║
║  Worker Population                     Tier 1                ║
║  ├─ Current: 847 workers                                     ║
║  ├─ Minimum: 200   Optimal: 1000                             ║
║  ├─ Status: ████████░░ 85% of optimal                        ║
║  └─ Expansion priority: Moderate                             ║
║                                                              ║
║  Caste Balance                         Tier 1                ║
║  ├─ Status: █████████░ 91%                                   ║
║  │  ┌────────────────────────────────────────────┐           ║
║  │  │ Builders:   ████████ 312 (target: 300)  ✓  │           ║
║  │  │ Gatherers:  ██████░░ 245 (target: 350)  ⚠  │           ║
║  │  │ Soldiers:   ████████ 189 (target: 200)  ✓  │           ║
║  │  │ Nurses:     ████████  78 (target: 100)  ⚠  │           ║
║  │  │ Scouts:      █████░░  23 (target: 50)   ⚠  │           ║
║  │  └────────────────────────────────────────────┘           ║
║  └─ Recruiting more gatherers, nurses, scouts                ║
║                                                              ║
║  Territory Control                     Tier 2                ║
║  ├─ Current: ██████████████░░░░░░ 71%                        ║
║  ├─ Controlled area: 2.3 km²                                 ║
║  └─ Resource saturation: 68%                                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Comparison Mode

```typescript
interface NeedsComparisonView {
  agent: NeedsPanel;

  // Compare to village average
  villageAverages: Map<string, number>;

  // Deviations
  aboveAverage: NeedDeviation[];
  belowAverage: NeedDeviation[];

  // Species baseline (if comparing to same species)
  speciesBaseline: Map<string, number> | null;
}

interface NeedDeviation {
  need: string;
  agentValue: number;
  comparisonValue: number;
  deviation: number;                     // Percentage difference
  significance: "notable" | "significant" | "extreme";
}
```

### Comparison Layout

```
╔══════════════════════════════════════════════════════════════╗
║  NEEDS COMPARISON: Elara vs Village Average           [help] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Need              Elara    Village    Difference            ║
║  ────────────────────────────────────────────────────────────║
║  hunger            68%      72%        -4%                   ║
║  thirst            95%      78%        +17% ▲▲               ║
║  energy            42%      65%        -23% ▼▼               ║
║  warmth            88%      84%        +4%                   ║
║  health            100%     89%        +11% ▲                ║
║  ────────────────────────────────────────────────────────────║
║  belonging         68%      71%        -3%                   ║
║  friendship        45%      62%        -17% ▼▼               ║
║  intimacy          85%      58%        +27% ▲▲               ║
║  respect           78%      70%        +8%  ▲                ║
║  ────────────────────────────────────────────────────────────║
║  purpose           82%      68%        +14% ▲▲               ║
║  competence        71%      72%        -1%                   ║
║  novelty           56%      61%        -5%                   ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║  Summary: Elara is more rested than average but lonelier.    ║
║  Strong sense of purpose. Partner relationship is healthy.   ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Open needs panel for selected agent |
| `1-5` | Expand tier 1-5 |
| `Tab` | Cycle through tiers |
| `D` | Toggle desires view |
| `P` | Toggle personality effects |
| `C` | Toggle comparison mode |
| `A` | Toggle show all needs / unsatisfied only |
| `Escape` | Close panel |

---

## State Management

```typescript
interface NeedsPanelState {
  selectedAgentId: string | null;

  // Display options
  expandedTiers: Set<number>;
  showAllNeeds: boolean;
  showDesires: boolean;
  showPersonalityEffects: boolean;
  comparisonMode: boolean;

  // Data
  needsData: AgentNeeds | null;
  desiresData: Desire[];
  villageAverages: Map<string, number> | null;

  // Update tracking
  lastUpdate: number;
  needTrends: Map<string, TrendData>;
}

interface TrendData {
  values: number[];                      // Recent history
  trend: "rising" | "stable" | "falling";
  changeRate: number;                    // Per hour
}
```

---

## Visual Style

```typescript
interface NeedsPanelStyle {
  // Need bar colors
  barColors: {
    critical: "#FF4444";                 // Red pulse
    warning: "#FF8844";                  // Orange
    moderate: "#DDDD44";                 // Yellow
    good: "#44DD44";                     // Green
    excellent: "#4488FF";                // Blue
  };

  // Tier indicators
  tierColors: {
    survival: "#FF6666";
    safety: "#FFAA66";
    social: "#66AAFF";
    psychological: "#AA66FF";
    selfActualization: "#FFFF66";
  };

  // Urgency indicators
  urgencyBars: {
    low: "▓░░";
    moderate: "▓▓░";
    high: "▓▓▓";
    critical: "▓▓▓ (pulse)";
  };

  // Trend arrows
  trendIndicators: {
    rising: "▲";
    stable: "≈";
    falling: "▼";
  };

  // 8-bit aesthetic
  pixelBorders: true;
  retroFont: true;
  scanlineEffect: "subtle";
}
```

---

## Integration Points

### With Agent System
- Receives need data from agent state
- Subscribes to need change events
- Updates in real-time as needs decay/satisfy

### With Behavior System
- Shows current desires driving behavior
- Displays strategy choices
- Links to activity panel

### With Conversation System
- Social need interactions affect dialogue
- Teaching/helping satisfies competence
- Praise satisfies respect

### With Species Encyclopedia
- Links to species need profiles
- Explains alien psychology
- Educational cross-references

---

## Related Specs

- `agent-system/needs.md` - Canonical need system
- `agent-system/spec.md` - Agent architecture
- `agent-system/species-system.md` - Species need profiles
- `ui-system/dialogue.md` - Social interaction UI
- `ui-system/species-encyclopedia.md` - Species information

---

## Open Questions

1. Should players be able to see exact numeric values, or use qualitative descriptors only?
2. How to handle need comparison for species without equivalent needs?
3. Should we show predicted future states based on current trajectory?
4. How detailed should strategy explanations be to players?
