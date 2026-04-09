# Magic & Divinity UI System Specification

**Created:** 2025-12-29
**Status:** Draft
**Version:** 0.1.0

---

## Overview

This spec defines all UI elements for the Magic and Divinity systems, including:
- Magic system toggle controls (active vs enabled)
- Divine powers interface with belief management
- Vision and dream composer
- Development/testing panel

---

## Core Concepts

### Magic System States

Each magic paradigm can exist in one of three states:

| State | Description | Effect |
|-------|-------------|--------|
| **Disabled** | Magic system is completely off | No effects, no agents use it, no UI shown |
| **Enabled** | System exists in the world | Agents can discover/learn it, but player cannot directly use it |
| **Active** | Player can directly use powers | Full UI access, player can cast spells/use abilities |

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MAGIC SYSTEM STATES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   DISABLED ──▶ ENABLED ──▶ ACTIVE                                  │
│      │            │           │                                    │
│      │            │           └─ Player UI shown                   │
│      │            │           └─ Player can use powers              │
│      │            │           └─ Agents can use it                  │
│      │            │                                                 │
│      │            └─ Agents can discover/learn                     │
│      │            └─ World effects active                          │
│      │            └─ Player watches but cannot use                 │
│      │                                                              │
│      └─ No effects whatsoever                                      │
│      └─ As if it doesn't exist                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Magic Systems Control Panel

### Main Toggle Interface

```
╔══════════════════════════════════════════════════════════════════════╗
║                    MAGIC SYSTEMS                        [?] [Dev]    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  PARADIGMS                              Enabled  Active  Powers     ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  ▼ THE ACADEMIES (Mana-based Scholarly)                             ║
║    │ Agents using: 3 │ Your proficiency: 45%                        ║
║    │                                                                 ║
║    │  World Enabled: [ON ]          Player Active: [ON ]            ║
║    │                                                                 ║
║    │  └─ [Open Spellbook] [View Skill Tree]                         ║
║    │                                                                 ║
║  ▼ THE PACTS (Patron Magic)                                         ║
║    │ Agents using: 1 │ Your patron: None                            ║
║    │                                                                 ║
║    │  World Enabled: [ON ]          Player Active: [OFF]            ║
║    │                                                                 ║
║    │  └─ [View Patrons] [Seek Contract]                             ║
║    │                                                                 ║
║  ▶ THE DEEP GRAMMAR (True Name Magic)                    [OFF] [OFF]║
║                                                                      ║
║  ▶ THE BREATH (Life Force Magic)                         [ON ] [OFF]║
║                                                                      ║
║  ▶ FERROMANCY (Metallic Arts)                             [OFF] [OFF]║
║                                                                      ║
║  ▶ SHINTO (Kami Spirit Magic)                            [ON ] [ON ]║
║                                                                      ║
║  ▶ TETHERMANCY (Linking Magic)                              [OFF] [OFF]║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  GLOBAL SETTINGS                                                     ║
║  ├── Magic discovery rate: [Normal ▼]                               ║
║  ├── Cross-paradigm interaction: [Enabled ▼]                        ║
║  └── Show magic effects: [All ▼]                                    ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Expanded Paradigm View

```
╔══════════════════════════════════════════════════════════════════════╗
║  ▼ THE ACADEMIES (Mana-based Scholarly)                             ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  DESCRIPTION:                                                        ║
║  Traditional scholarly magic learned through study. Safe and         ║
║  reliable but requires years of investment. Power comes from         ║
║  internal mana pools that regenerate with rest.                      ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  WORLD STATUS                           PLAYER STATUS                ║
║  ┌─────────────────────────────┐       ┌─────────────────────────┐  ║
║  │ Enabled: [ON ]              │       │ Active: [ON ]           │  ║
║  │                             │       │                         │  ║
║  │ Agents with access: 3       │       │ Your mana: 450/500      │  ║
║  │ ├── Scholar Marcus (75%)    │       │ Proficiency: 45%        │  ║
║  │ ├── Mage Elena (62%)        │       │ Known spells: 12        │  ║
║  │ └── Apprentice Jori (15%)   │       │ Active effects: 2       │  ║
║  │                             │       │                         │  ║
║  │ Total spells cast: 847      │       │ Your casts: 156         │  ║
║  │ Mishaps: 23                 │       │ Success rate: 94%       │  ║
║  └─────────────────────────────┘       └─────────────────────────┘  ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  QUICK ACTIONS (when Active)                                         ║
║  [Open Spellbook]  [View Skill Tree]  [Manage Enchantments]         ║
║                                                                      ║
║  WORLD CONTROLS (when Enabled)                                       ║
║  [View Agent Progress]  [See Recent Casts]  [Mishap Log]            ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Toggle Confirmation Dialogs

When disabling a system that's in use:

```
╔══════════════════════════════════════════════════════════════════════╗
║                    ⚠️ CONFIRM DISABLE                                ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  You are about to DISABLE "The Academies" magic system.              ║
║                                                                      ║
║  This will affect:                                                   ║
║  • 3 agents who know this magic (they will retain knowledge but     ║
║    cannot use it)                                                    ║
║  • 2 active enchantments (will become dormant)                      ║
║  • Your 12 known spells (will be inaccessible)                      ║
║                                                                      ║
║  This change is reversible. Re-enabling will restore all abilities. ║
║                                                                      ║
║                          [Cancel]  [Disable]                         ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 2. Spellbook Interface (Active Magic)

```
╔══════════════════════════════════════════════════════════════════════╗
║                    SPELLBOOK - THE ACADEMIES               [Close]   ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  MANA: ████████████████░░░░ 450/500 (+5/min)                        ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  FILTER: [All ▼]  SORT: [By School ▼]    🔍 Search...               ║
║                                                                      ║
║  FIRE SCHOOL                                                         ║
║  ├── Ignite (5 mana)              [●] Hotkey: 1                     ║
║  │   Create small flame on target                                   ║
║  │   Range: 10 tiles │ Duration: 5 min │ Proficiency: 78%           ║
║  │                                                                   ║
║  ├── Fireball (45 mana)           [ ] Hotkey: -                     ║
║  │   Launch explosive projectile                                    ║
║  │   Range: 20 tiles │ Damage: High │ Proficiency: 34%              ║
║  │   ⚠️ 15% mishap chance at current proficiency                    ║
║  │                                                                   ║
║  └── Wall of Fire (80 mana)       [ ] Hotkey: -                     ║
║      Create barrier of flames                                       ║
║      Range: 15 tiles │ Duration: 2 min │ Proficiency: 12%           ║
║      ⚠️ 35% mishap chance at current proficiency                    ║
║                                                                      ║
║  PROTECTION SCHOOL                                                   ║
║  ├── Minor Ward (15 mana)         [●] Hotkey: 2                     ║
║  │   Light protective barrier                                       ║
║  │   Duration: 10 min │ Proficiency: 92%                            ║
║  │                                                                   ║
║  └── Shield (35 mana)             [ ] Hotkey: -                     ║
║      Strong defensive barrier                                       ║
║      Duration: 2 min │ Proficiency: 56%                             ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  SELECTED: Fireball                                                  ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ COST: 45 mana                CASTING TIME: 2 seconds            │ ║
║  │ CHANNELS: Verbal + Somatic   COMPONENTS: None                   │ ║
║  │                                                                  │ ║
║  │ Creates a ball of fire that travels to target location and     │ ║
║  │ explodes on impact, dealing damage to all in radius.           │ ║
║  │                                                                  │ ║
║  │ At 34% proficiency:                                             │ ║
║  │ • Damage: 60-80 (max 100-120 at full proficiency)               │ ║
║  │ • Radius: 3 tiles (max 5)                                       │ ║
║  │ • Mishap chance: 15%                                            │ ║
║  │                                                                  │ ║
║  │ MISHAP EFFECTS:                                                 │ ║
║  │ • 60% - Fizzle (mana spent, no effect)                          │ ║
║  │ • 30% - Weak explosion (half damage)                            │ ║
║  │ • 10% - Backlash (damage self instead)                          │ ║
║  │                                                                  │ ║
║  │ [Assign Hotkey]  [Practice] [Cast Now]                          │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Casting UI (In-Game)

When casting a spell:

```
                         ┌─────────────────────────────┐
                         │  CASTING: Fireball          │
                         │  ████████████░░░░░░ 2.0s    │
                         │                             │
                         │  Verbal: Speaking... ✓      │
                         │  Somatic: Gesturing... ✓    │
                         │                             │
                         │  [Cancel] or click target   │
                         └─────────────────────────────┘
```

---

## 3. Magic Skill Tree Interface

```
╔══════════════════════════════════════════════════════════════════════╗
║             SKILL TREE - THE ACADEMIES                    [Close]    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  XP: 2,450  │  Nodes Unlocked: 12/48  │  Points Available: 3        ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║                          ┌─────────┐                                 ║
║                          │ARCHMAGE │ (locked)                        ║
║                          │ ○ ○ ○ ○ │                                 ║
║                          └────┬────┘                                 ║
║                 ┌─────────────┼─────────────┐                        ║
║           ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐                  ║
║           │FIRE MASTER│ │WARD MASTER│ │MIND MASTER│                  ║
║           │ ● ● ○ ○   │ │ ● ● ● ○   │ │ ○ ○ ○ ○   │                  ║
║           └─────┬─────┘ └─────┬─────┘ └─────┬─────┘                  ║
║        ┌────────┤        ┌────┴────┐        │                        ║
║  ┌─────┴─────┐  │  ┌─────┴─────┐   │  ┌─────┴─────┐                  ║
║  │FIRE SHAPING│ │ │WARD CRAFTING│  │  │TELEPATHY  │                  ║
║  │ ● ● ● ●   │ │ │ ● ● ● ○   │  │  │ ○ ○ ○ ○   │                  ║
║  └─────┬─────┘ │ └─────┬─────┘  │  └───────────┘                    ║
║        │       │       │        │                                    ║
║        └───┬───┘       └───┬────┘                                    ║
║      ┌─────┴─────┐   ┌─────┴─────┐                                   ║
║      │BASIC FIRE │   │BASIC WARD │   ◀── FOUNDATION TIER            ║
║      │ ● ● ● ●   │   │ ● ● ● ●   │                                   ║
║      └─────┬─────┘   └─────┬─────┘                                   ║
║            └───────┬───────┘                                         ║
║              ┌─────┴─────┐                                           ║
║              │MANA BASICS│   ◀── START HERE                         ║
║              │ ● ● ● ●   │                                           ║
║              └───────────┘                                           ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  SELECTED: Fire Shaping (Tier 2)                                     ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ Progress: ● ● ● ● (COMPLETE)                                    │ ║
║  │                                                                  │ ║
║  │ UNLOCKS:                                                         │ ║
║  │ • Fireball spell                                                │ ║
║  │ • Fire control (+20% to all fire spells)                        │ ║
║  │ • Flame resistance (50% reduction)                              │ ║
║  │                                                                  │ ║
║  │ REQUIRED:                                                        │ ║
║  │ ✓ Basic Fire (4/4)                                              │ ║
║  │ ✓ 500 XP spent in fire branch                                   │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 4. Divinity Control Panel

### Divine Status HUD

Always-visible when playing as a deity:

```
┌─────────────────────────────────────────────────────────────────────┐
│ BELIEF: ████████████████░░░░░░░░░░░░░░░░ 2,847 (+24/hr)            │
│         ▲                                                           │
│         └── Avatar threshold: 5,000                                 │
│                                                                     │
│ BELIEVERS: 24  │  ANGELS: 2  │  PRAYERS: 4 pending                  │
│                                                                     │
│ IDENTITY: The Watcher in Green                                      │
│ DOMAINS: Nature (67%) • Harvest (45%) • Mystery (32%)               │
└─────────────────────────────────────────────────────────────────────┘
```

### Divinity System Toggle (from main menu)

```
╔══════════════════════════════════════════════════════════════════════╗
║                    DIVINITY SETTINGS                      [Close]    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  PLAY MODE                                                           ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  ○ Observer Mode (no divine powers)                                  ║
║    Watch the world without divine intervention. Gods may still      ║
║    emerge from agent belief, but you have no divine powers.         ║
║                                                                      ║
║  ◉ Deity Mode (play as a god)                                        ║
║    You ARE a deity. Believers generate belief for you. Use divine   ║
║    powers to influence the world.                                   ║
║                                                                      ║
║  ○ Pantheon Mode (multiple player gods)                             ║
║    Multiple human players each control a deity. Cooperative or      ║
║    competitive divine politics.                                     ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  AI DEITIES                                                          ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  Allow AI gods to emerge: [ON ]                                      ║
║  AI god aggression: [Moderate ▼]                                     ║
║  Maximum AI gods: [3 ▼]                                              ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  BELIEF SETTINGS                                                     ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  Belief generation rate: [Normal ▼]                                  ║
║  Belief decay rate: [Normal ▼]                                       ║
║  Starting belief (new gods): [100 ▼]                                 ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 5. Vision & Dream Composer

### Vision Composer Interface

```
╔══════════════════════════════════════════════════════════════════════╗
║                    COMPOSE VISION                         [Close]    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  RECIPIENT                                                           ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ [Search believer...                                       ▼]   │ ║
║  │                                                                 │ ║
║  │ ◉ Farmer Holt          Faith: 0.92  │  Last vision: 3 days ago │ ║
║  │ ○ Elder Silva          Faith: 0.85  │  Last vision: 12 days    │ ║
║  │ ○ Mason Reed           Faith: 0.78  │  Never received vision   │ ║
║  │ ○ Young Tara           Faith: 0.45  │  Last vision: 1 day ago  │ ║
║  │                                                                 │ ║
║  │ [+ Add multiple recipients (costs +50% per additional)]        │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  DELIVERY METHOD                                    COST             ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  ○ Dream Tonight                                    25 belief       ║
║    Delivered when recipient sleeps. Natural, less jarring.          ║
║    May be forgotten or misremembered.                               ║
║                                                                      ║
║  ◉ Meditation Vision                                50 belief       ║
║    Delivered during meditation/prayer. Clear and memorable.         ║
║    Requires recipient to meditate (they are not currently).         ║
║    ⚠️ Holt is not meditating - will queue for next meditation       ║
║                                                                      ║
║  ○ Waking Sign                                      35 belief       ║
║    Subtle sign in daily life. Ambiguous, cheap.                     ║
║    May be interpreted incorrectly.                                  ║
║                                                                      ║
║  ○ Direct Interruption                              100 belief      ║
║    Immediate and unmistakable. Frightening to recipient.            ║
║    May cause trauma. Always remembered perfectly.                   ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  CLARITY                                                             ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  Vague ░░░░░░░░████████████████░░░░░░░░ Crystal Clear               ║
║        10%                   80%                    100%             ║
║                                                                      ║
║  At 80% clarity:                                                     ║
║  • Message will be mostly understood                                ║
║  • Some details may be unclear                                      ║
║  • Cost multiplier: 1.6x (base 50 → 80 belief)                      ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  VISION CONTENT                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ Describe what the recipient sees, hears, and feels...          │ ║
║  │                                                                 │ ║
║  │ Example: "A field of wheat, golden and tall. A child runs      │ ║
║  │ through it, laughing. The sun is warm."                        │ ║
║  │                                                                 │ ║
║  │ The system will adapt this to the recipient's psychology.      │ ║
║  │                                                                 │ ║
║  │ ─────────────────────────────────────────────────────────────  │ ║
║  │                                                                 │ ║
║  │ [Image: Hope/recovery for sick child]                          │ ║
║  │                                                                 │ ║
║  │ A golden field stretches to the horizon. In the distance,      │ ║
║  │ a child runs - your child - healthy and laughing. The wheat    │ ║
║  │ parts around them like water. You feel warmth on your face,    │ ║
║  │ and a voice like rustling leaves whispers: "Have faith."       │ ║
║  │                                                                 │ ║
║  │                                                   [1,247/2000] │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  [Use Template ▼]  [Preview As Recipient]  [Save Draft]             ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  PREDICTED INTERPRETATION                                            ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ RECIPIENT CONTEXT:                                              │ ║
║  │ • Holt's child is currently ill (severity 7/10)                │ ║
║  │ • Holt prayed for help 3 minutes ago (desperate)               │ ║
║  │ • Holt has optimistic personality (+15% positive interpretation│ ║
║  │ • Previous visions: 2 (both interpreted positively)            │ ║
║  │                                                                 │ ║
║  │ LIKELY INTERPRETATION:                                          │ ║
║  │ "Holt will almost certainly (92%) interpret this as a promise  │ ║
║  │  that his child will recover. His optimistic nature and        │ ║
║  │  desperate prayer context align with this reading.              │ ║
║  │                                                                 │ ║
║  │  If the child DOES recover: Faith maxes out, story spreads     │ ║
║  │  If the child DIES: Crisis of faith, possible abandonment"     │ ║
║  │                                                                 │ ║
║  │ TRAIT IMPLICATIONS:                                             │ ║
║  │ • Will reinforce 'benevolent' perception (+3%)                 │ ║
║  │ • May establish 'healing' domain association (+8%)             │ ║
║  │ • Creates expectation of intervention (risk if you don't)      │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  TOTAL COST: 80 belief                                               ║
║  YOUR BELIEF: 2,847 (after: 2,767)                                   ║
║                                                                      ║
║                          [Cancel]  [Preview]  [Send Vision]          ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Dream Composer (Simplified for Dreams)

```
╔══════════════════════════════════════════════════════════════════════╗
║                    COMPOSE DREAM                          [Close]    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  RECIPIENT: Farmer Holt                                              ║
║  STATUS: Currently sleeping (will receive tonight)                   ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  DREAM TYPE                                                          ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  ◉ Symbolic Dream (15 belief)                                        ║
║    Abstract imagery that requires interpretation                     ║
║                                                                      ║
║  ○ Narrative Dream (25 belief)                                       ║
║    A story with clear beginning, middle, end                        ║
║                                                                      ║
║  ○ Prophetic Dream (50 belief)                                       ║
║    Shows future events (must actually happen or faith damaged)      ║
║                                                                      ║
║  ○ Visitation Dream (75 belief)                                      ║
║    You appear directly in their dream                               ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  EMOTIONAL TONE                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  [Comforting] [Warning] [Mysterious] [Joyful] [Urgent] [Peaceful]   ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  DREAM CONTENT                                                       ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ SYMBOLS TO INCLUDE:                                             │ ║
║  │ [+ Water] [+ Light] [+ Growth] [+ Healing] [+ Custom...]       │ ║
║  │                                                                 │ ║
║  │ Active: [Water 💧] [Growth 🌱]                                   │ ║
║  │                                                                 │ ║
║  │ ───────────────────────────────────────────────────────────── │ ║
║  │                                                                 │ ║
║  │ NARRATIVE (optional):                                           │ ║
║  │ [Describe dream events...]                                      │ ║
║  │                                                                 │ ║
║  │ A dried riverbed begins to flow again. Where the water          │ ║
║  │ touches, green shoots emerge. A seed buried deep cracks open.   │ ║
║  │                                                                 │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  PREDICTED RECEPTION: 85% positive interpretation                    ║
║  MEMORABILITY: 60% chance they remember upon waking                  ║
║                                                                      ║
║                          [Cancel]  [Send Dream]                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Vision Templates

```
╔══════════════════════════════════════════════════════════════════════╗
║                    VISION TEMPLATES                       [Close]    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  GUIDANCE                                                            ║
║  ├── "Follow this path" (show direction)                            ║
║  ├── "Beware this danger" (warning)                                 ║
║  ├── "Trust this person" (endorsement)                              ║
║  └── "Avoid this person" (warning)                                  ║
║                                                                      ║
║  COMFORT                                                             ║
║  ├── "I am with you" (presence)                                     ║
║  ├── "This will pass" (hope)                                        ║
║  ├── "Your loved one is at peace" (afterlife comfort)               ║
║  └── "Have faith" (general encouragement)                           ║
║                                                                      ║
║  COMMANDS                                                            ║
║  ├── "Build this" (construction directive)                          ║
║  ├── "Go to this place" (pilgrimage command)                        ║
║  ├── "Speak my words" (prophecy assignment)                         ║
║  └── "Gather the faithful" (congregation command)                   ║
║                                                                      ║
║  REVELATION                                                          ║
║  ├── "This is my name" (identity revelation)                        ║
║  ├── "This is my nature" (domain establishment)                     ║
║  ├── "These are my laws" (commandment delivery)                     ║
║  └── "This is your purpose" (personal mission)                      ║
║                                                                      ║
║  CUSTOM                                                              ║
║  └── [+ Create New Template...]                                     ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 6. Development / Testing Panel

Accessed via [Dev] button or keyboard shortcut (backtick ` or F12)

```
╔══════════════════════════════════════════════════════════════════════╗
║                    🔧 DEVELOPER PANEL                     [Close]    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  [Magic] [Divinity] [Agents] [World] [Time] [Debug]                 ║
║                                                                      ║
║  ═══════════════════════════════════════════════════════════════════║
║                                                                      ║
║                           MAGIC TAB                                  ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  PARADIGM CONTROLS                                                   ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  Selected Paradigm: [The Academies ▼]                                ║
║                                                                      ║
║  [Force Enable All]  [Force Disable All]  [Reset to Defaults]       ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  PLAYER MAGIC STATE                                                  ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  Mana: [450    ] / [500    ]  [Set] [Max] [Empty]                   ║
║  Proficiency: [45  ]%         [Set] [Max]                           ║
║  Corruption: [0   ]           [Set] [Clear]                         ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  SPELL TESTING                                                       ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  [Unlock All Spells]  [Lock All Spells]  [Reset Proficiencies]      ║
║                                                                      ║
║  Cast spell: [Fireball ▼]                                            ║
║  Target: [Click to select ▼]                                         ║
║  □ Ignore costs   □ Ignore cooldowns   □ Force success              ║
║  □ Force mishap   □ Force critical                                  ║
║                                                                      ║
║  [Cast Spell]                                                        ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  SKILL TREE TESTING                                                  ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  XP: [2450   ]  [Set]  [+100] [+1000] [+10000]                      ║
║                                                                      ║
║  [Unlock All Nodes]  [Lock All Nodes]  [Reset Tree]                 ║
║                                                                      ║
║  Unlock specific: [Fire Shaping ▼] [Unlock]                         ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Divinity Dev Tab

```
╔══════════════════════════════════════════════════════════════════════╗
║                    🔧 DEVELOPER PANEL                     [Close]    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  [Magic] [Divinity] [Agents] [World] [Time] [Debug]                 ║
║                                                                      ║
║  ═══════════════════════════════════════════════════════════════════║
║                                                                      ║
║                          DIVINITY TAB                                ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  BELIEF CONTROLS                                                     ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  Current Belief: [2847   ]                                           ║
║                                                                      ║
║  [Set]  [+100] [+1000] [+10000] [Max (99999)]                       ║
║                                                                      ║
║  Belief per hour: [24     ] (+/-)  [Set]                            ║
║  Decay rate: [0.1    ] %/hr       [Set] [Disable Decay]             ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  DIVINE POWER TESTING                                                ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  [Unlock All Powers]  [Lock by Tier]  [Reset to Tier-Based]         ║
║                                                                      ║
║  Cast power: [Major Miracle ▼]                                       ║
║  Target: [Farmer Holt ▼]                                             ║
║  Intensity: [1.0 ▼]                                                  ║
║                                                                      ║
║  □ Ignore belief cost   □ Ignore cooldowns   □ Force success        ║
║  □ Skip mythology generation   □ Silent (no witness effects)        ║
║                                                                      ║
║  [Execute Power]                                                     ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  VISION/DREAM TESTING                                                ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  [Send Test Vision]  [Send Test Dream]  [Clear Vision Queue]        ║
║                                                                      ║
║  Recipient: [All believers ▼]                                        ║
║  □ Free (no cost)   □ 100% clarity   □ Instant delivery             ║
║  □ Force positive interpretation   □ Force negative interpretation   ║
║                                                                      ║
║  [Quick Vision: "I am watching"]                                    ║
║  [Quick Vision: "Danger approaches"]                                ║
║  [Quick Vision: "Build a temple"]                                   ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  BELIEVER MANIPULATION                                               ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  Select agent: [Farmer Holt ▼]                                       ║
║                                                                      ║
║  Faith level: [0.92   ] [Set] [Max] [Zero] [Crisis]                 ║
║                                                                      ║
║  [Force Conversion]  [Force Apostasy]  [Trigger Prayer]             ║
║  [Grant Blessing]  [Apply Curse]  [Make Prophet]                    ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  IDENTITY MANIPULATION                                               ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  Domain: [Nature ▼]  Value: [67  ]%  [Set]                          ║
║  [Add Domain]  [Remove Domain]  [Reset All Domains]                 ║
║                                                                      ║
║  Trait: [Benevolent ▼]  Value: [0.7 ] (-1 to 1)  [Set]              ║
║  [Add Trait]  [Remove Trait]  [Randomize Identity]                  ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  ANGEL CONTROLS                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  [Spawn Angel]  [Kill All Angels]  [Max Loyalty All]                ║
║                                                                      ║
║  ─────────────────────────────────────────────────────────────────  ║
║  AI DEITY CONTROLS                                                   ║
║  ─────────────────────────────────────────────────────────────────  ║
║                                                                      ║
║  [Spawn Random AI God]  [Kill All AI Gods]                          ║
║  [Force AI God Action]  [View AI God Thoughts]                      ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Quick Action Bar (Dev Mode)

When dev mode is active, show a quick bar at bottom:

```
┌──────────────────────────────────────────────────────────────────────┐
│ DEV: [+1K Belief] [+1K Mana] [Full Heal] [Max Faith All] [Spawn God]│
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. Keyboard Shortcuts

### Magic Shortcuts

| Key | Action |
|-----|--------|
| M | Open Magic Systems Panel |
| B | Open Spellbook |
| T | Open Skill Tree |
| 1-9 | Cast hotkeyed spell |
| Esc | Cancel current cast |
| Shift+Click | Queue spell cast |

### Divinity Shortcuts

| Key | Action |
|-----|--------|
| P | Open Prayers list |
| V | Open Vision Composer |
| D | Open Divine Powers |
| I | Open Identity Screen |
| A | Open Angels Panel |
| Tab | Cycle through pending prayers |
| Enter | Quick-answer selected prayer |
| Space | Toggle avatar mode (if available) |

### Dev Shortcuts

| Key | Action |
|-----|--------|
| ` or F12 | Toggle Dev Panel |
| Shift+B | Add 1000 belief |
| Shift+M | Max mana |
| Ctrl+Shift+V | Send test vision to random believer |
| Ctrl+Shift+G | Spawn AI god |

---

## 8. Notifications & Alerts

### Prayer Notification

```
┌───────────────────────────────────────┐
│ 🙏 DESPERATE PRAYER                   │
│ Farmer Holt (3m ago)                  │
│ "Please, my child is sick..."         │
│                                       │
│ [Answer] [View Full] [Dismiss]        │
└───────────────────────────────────────┘
```

### Story Alert

```
┌───────────────────────────────────────┐
│ 📖 NEW STORY FORMING                  │
│ "The Silent Storm"                    │
│ 3 believers developing narrative     │
│ ⚠️ May establish 'indifferent' trait  │
│                                       │
│ [View Story] [Intervene] [Ignore]    │
└───────────────────────────────────────┘
```

### Magic Mishap Alert

```
┌───────────────────────────────────────┐
│ ⚡ SPELL MISHAP                       │
│ Fireball backlashed!                  │
│ You took 35 damage.                   │
│                                       │
│ [OK]                                  │
└───────────────────────────────────────┘
```

---

## 9. Integration Points

### With Existing UI Systems

| Existing System | Integration |
|----------------|-------------|
| Agent Info Panel | Show magic abilities, faith level, blessing/curse status |
| Inventory | Show enchanted items, relics, spell components |
| Research Tree | Magic paradigm discovery, divine revelation research |
| Time Controls | Vision/dream delivery timing, ritual scheduling |
| Building Placement | Temple placement, sacred site designation |
| Map | Show ley lines, sacred sites, believer locations |

### Event Log Entries

```
[12:45] 🔮 You cast Minor Ward (15 mana)
[12:46] 🙏 Farmer Holt is praying (desperate)
[12:47] 👁️ Vision sent to Farmer Holt
[12:48] ⚡ Scholar Marcus cast Fireball (mishap!)
[12:49] 📖 Story "The First Answer" was retold by Elder Silva
[12:50] 👼 Angel Virel completed mission: spread miracle news
```

---

## 10. Accessibility Considerations

- All toggle states have both color AND icon/text indicators
- Screen reader labels for all interactive elements
- Keyboard navigation for all panels
- High contrast mode support
- Adjustable text size
- Audio cues for important events (prayers, visions, mishaps)
- Colorblind-friendly indicators (shapes not just colors)

---

## Implementation Priority

1. **Phase 1**: Magic system toggles (on/off/active)
2. **Phase 2**: Basic spellbook and casting UI
3. **Phase 3**: Divine powers menu
4. **Phase 4**: Vision/dream composer
5. **Phase 5**: Dev panel (belief/mana manipulation)
6. **Phase 6**: Skill tree visualization
7. **Phase 7**: Identity and mythology browsers
8. **Phase 8**: Angel management
9. **Phase 9**: Full polish and accessibility

---

## Related Specs

- `divine-player-interface.md` - Original divine player experience spec
- `paradigm-spec.md` - Magic paradigm system
- `belief-and-deity-system.md` - Belief mechanics
- `hud.md` - Main game HUD integration
- `notifications.md` - Notification system
