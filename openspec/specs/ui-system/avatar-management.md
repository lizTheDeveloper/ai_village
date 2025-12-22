# Avatar Management - UI Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0
**Depends on:** `avatar-system/spec.md`

---

## Overview

The avatar management UI allows players to control how their agent embodies avatars within game worlds. Players can view their avatar roster, jack in/out of avatars, handle death and respawn, and manage multiple characters. This UI represents the bridge between the persistent agent identity and the mortal game-world bodies.

---

## Type Definitions

```typescript
import {
  Avatar,
  AvatarState,
  AvatarSpec,
  AvatarAppearance,
  JackInResult,
  JackOutResult,
  JackOutMode,
  DeathEvent,
  DeathCause,
  RespawnOption,
  RespawnType,
  RespawnPenalty,
  SessionStats,
  AvatarRoster,
  EmbodiedObservation,
  Injury,
  Stance,
  Direction,
} from "@specs/avatar-system/spec";

import { Agent } from "@specs/agent-system/spec";
import { Skill } from "@specs/agent-system/skills";
```

---

## Avatar Management Panel

### Main Panel Structure

```typescript
interface AvatarManagementPanel {
  agentId: string;
  agentName: string;
  currentGameId: string;

  // Current state
  embodimentStatus: EmbodimentStatus;
  activeAvatar: AvatarDisplay | null;

  // Roster
  avatarRoster: AvatarRoster;
  rosterDisplay: AvatarRosterDisplay;

  // Actions
  availableActions: AvatarAction[];

  // Session info
  currentSession: SessionDisplay | null;

  // UI state
  selectedAvatar: string | null;
  showCreatePanel: boolean;
  showDeathPanel: boolean;
}

type EmbodimentStatus =
  | "disembodied"                        // Not in any avatar
  | "jacking_in"                         // Transitioning into avatar
  | "embodied"                           // Actively controlling avatar
  | "jacking_out"                        // Transitioning out
  | "dead";                              // Avatar died, awaiting respawn

interface AvatarDisplay {
  id: string;
  name: string;
  state: AvatarState;
  species: string;

  // Visual
  portrait: string;
  stateIndicator: string;

  // Stats
  health: HealthBar;
  energy: EnergyBar;
  statusEffects: StatusEffectDisplay[];

  // Location
  position: string;                      // Human-readable location
  lastActive: string;                    // Relative time

  // History
  totalPlaytime: string;                 // "12h 34m"
  deathCount: number;
  createdAt: string;
}
```

---

## Visual Layout

### Main Avatar Panel - Disembodied View

```
╔══════════════════════════════════════════════════════════════╗
║  AVATAR MANAGEMENT                                    [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Agent: Kira-7 (Explorer Class)                              ║
║  Status: DISEMBODIED                                         ║
║  Current Game: AI Village                                    ║
║                                                              ║
║  ╭────────────────────────────────────────────────────────╮  ║
║  │  You are currently disembodied. Select an avatar to    │  ║
║  │  jack in, or create a new one.                         │  ║
║  ╰────────────────────────────────────────────────────────╯  ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  AVATAR ROSTER (3/5)                                         ║
║                                                              ║
║  ┌─ Elara Thornwood ─────────────────────────────────────┐   ║
║  │ [Portrait]  Species: Human     Status: DORMANT         │  ║
║  │             Health: ████████████████████ 100%          │  ║
║  │             Location: Thornwood Farm                   │  ║
║  │             Last active: 2 hours ago                   │  ║
║  │             Playtime: 45h 23m   Deaths: 0              │  ║
║  │                                          [JACK IN]     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌─ Marcus the Wanderer ─────────────────────────────────┐   ║
║  │ [Portrait]  Species: Human     Status: DORMANT         │  ║
║  │             Health: ██████████░░░░░░░░░░ 52%           │  ║
║  │             Location: Northern Wilderness              │  ║
║  │             Last active: 3 days ago                    │  ║
║  │             Playtime: 12h 45m   Deaths: 2              │  ║
║  │             ⚠ In dangerous area                        │  ║
║  │                                          [JACK IN]     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌─ Test Character ──────────────────────────────────────┐   ║
║  │ [Portrait]  Species: Human     Status: DESTROYED       │  ║
║  │             Died: Fell into lava (5 days ago)          │  ║
║  │             Playtime: 0h 45m   Deaths: 1               │  ║
║  │                                          [DELETE]      │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [+ Create New Avatar]                                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Embodied View

```
╔══════════════════════════════════════════════════════════════╗
║  AVATAR STATUS                                        [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Agent: Kira-7  →  Avatar: Elara Thornwood                   ║
║  Status: EMBODIED                                            ║
║                                                              ║
║  ┌─────────────────┐  ════════════════════════════════════   ║
║  │                 │  Health:  ██████████████░░░░░░ 72%      ║
║  │   [Portrait]    │  Energy:  ████████████████░░░░ 82%      ║
║  │     Elara       │  Hunger:  ██████████░░░░░░░░░░ 54%      ║
║  │                 │  Thirst:  ████████████████████ 95%      ║
║  └─────────────────┘                                         ║
║                                                              ║
║  Location: Thornwood Farm, Main House                        ║
║  Stance: Standing    Facing: North                           ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  SESSION STATS                                               ║
║  ├─ This session: 2h 34m                                     ║
║  ├─ Actions: 847                                             ║
║  ├─ Distance traveled: 3.2 km                                ║
║  └─ Skills improved: Farming +0.05, Crafting +0.02           ║
║                                                              ║
║  INJURIES: None                                              ║
║  STATUS EFFECTS: [Well-Rested +10% Energy Regen]             ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  JACK OUT OPTIONS:                                           ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ [Dormant] Avatar stays in world, sleeping safely      │   ║
║  │ [Suspend] Avatar frozen and hidden from world         │   ║
║  │ [Despawn] Avatar removed from world (can recreate)    │   ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                              ║
║  [JACK OUT]                [Switch Avatar]                   ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Avatar Creation

```typescript
interface AvatarCreationPanel {
  gameId: string;
  agentId: string;

  // Spec being built
  spec: AvatarSpec;

  // Available options
  availableSpecies: SpeciesOption[];
  availableLoadouts: LoadoutOption[];
  spawnPreferences: SpawnOption[];

  // Customization
  nameInput: string;
  appearanceEditor: AppearanceEditorState;

  // Preview
  previewPortrait: string;
  bonusesPreview: SkillBonusPreview[];

  // Validation
  isValid: boolean;
  validationErrors: string[];
}

interface SpeciesOption {
  id: string;
  name: string;
  description: string;
  traits: string[];
  available: boolean;
  unlockRequirement: string | null;
}

interface LoadoutOption {
  id: string;
  name: string;
  description: string;
  startingItems: string[];
  bonuses: string[];
}

interface SkillBonusPreview {
  agentSkill: string;
  skillLevel: number;
  bonusDescription: string;
  willApply: boolean;
}
```

### Avatar Creation Layout

```
╔══════════════════════════════════════════════════════════════╗
║  CREATE NEW AVATAR                                    [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Game: AI Village                                            ║
║  Avatar Slots: 3/5 used                                      ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  NAME: [Elara Thornwood________________]                     ║
║                                                              ║
║  SPECIES:                                                    ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ ● Human          Standard villager                    │   ║
║  │ ○ Elf            Forest-dwelling, long-lived          │   ║
║  │ ○ Dwarf          Mountain folk, skilled crafters      │   ║
║  │ ○ ???            Locked (requires: Visit the caves)   │   ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                              ║
║  APPEARANCE:                                                 ║
║  ┌─────────────────┐  ┌──────────────────────────────────┐   ║
║  │                 │  │ Hair:   [Brown    ▼] [Style 3 ▼] │   ║
║  │   [Preview]     │  │ Skin:   [Light    ▼]             │   ║
║  │                 │  │ Eyes:   [Green    ▼]             │   ║
║  │                 │  │ Height: [Average  ▼]             │   ║
║  └─────────────────┘  │ Clothes:[Farmer   ▼]             │   ║
║                       └──────────────────────────────────┘   ║
║                                                              ║
║  STARTING LOADOUT:                                           ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ ● Default    Basic tools and supplies                 │   ║
║  │ ○ Farmer     Agricultural focus, seeds included       │   ║
║  │ ○ Explorer   Travel gear, map, compass                │   ║
║  │ ○ Crafter    Tools and basic materials                │   ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                              ║
║  SPAWN LOCATION:                                             ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ ● Safe       Village center (recommended)             │   ║
║  │ ○ Random     Anywhere in the world                    │   ║
║  │ ○ Challenge  Wilderness start                         │   ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                              ║
║  SKILL BONUSES FROM AGENT:                                   ║
║  ├─ Exploration (0.4) → +2 Vision Range ✓                    ║
║  ├─ Social (0.6) → 12% Shop Discount ✓                       ║
║  └─ Combat (0.1) → No bonus (threshold: 0.3)                 ║
║                                                              ║
║  [Cancel]                                      [Create Avatar]║
╚══════════════════════════════════════════════════════════════╝
```

---

## Death & Respawn

```typescript
interface DeathPanel {
  avatarId: string;
  avatarName: string;

  // Death info
  deathEvent: DeathEventDisplay;

  // Options
  respawnOptions: RespawnOptionDisplay[];
  selectedOption: string | null;

  // Timer
  autoRespawnTimer: number | null;       // Seconds remaining
  canManualRespawn: boolean;

  // Post-death state
  showingDeathSummary: boolean;
}

interface DeathEventDisplay {
  cause: DeathCause;
  causeDescription: string;
  killer: string | null;
  location: string;
  timestamp: string;

  // Consequences
  itemsLost: ItemLossDisplay[];
  experienceLost: number;

  // Context
  lastWords: string | null;
  witnesses: string[];
}

interface RespawnOptionDisplay {
  id: string;
  type: RespawnType;
  name: string;
  description: string;
  locationName: string;

  // Costs
  cost: CostDisplay[];
  cooldownRemaining: number | null;

  // Penalties
  penalties: PenaltyDisplay[];

  // Availability
  available: boolean;
  unavailableReason: string | null;
}

interface PenaltyDisplay {
  type: RespawnPenalty;
  description: string;
  severity: "minor" | "moderate" | "severe";
}
```

### Death Screen Layout

```
╔══════════════════════════════════════════════════════════════╗
║                         YOU DIED                             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║                    ┌───────────────────┐                     ║
║                    │                   │                     ║
║                    │   [Death Icon]    │                     ║
║                    │                   │                     ║
║                    └───────────────────┘                     ║
║                                                              ║
║                    Elara Thornwood                           ║
║                    Fell from great height                    ║
║                                                              ║
║  Location: Mountain Pass, Eastern Ridge                      ║
║  Time: Dawn, Day 47                                          ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  CONSEQUENCES:                                               ║
║  ├─ Items dropped at death location:                         ║
║  │   • Copper Tools (can recover)                            ║
║  │   • 47 Wood (can recover)                                 ║
║  │   • Food rations (spoiling)                               ║
║  └─ Experience lost: 150 XP                                  ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  RESPAWN OPTIONS:                                            ║
║                                                              ║
║  ┌─ At Bed (Thornwood Farm) ─────────────────────────────┐   ║
║  │ ● Respawn at your bound bed                            │  ║
║  │   Penalties: Lose 10% max energy for 1 hour            │  ║
║  │   [RESPAWN HERE]                                       │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌─ At Corpse ───────────────────────────────────────────┐   ║
║  │ ○ Return to where you died                             │  ║
║  │   Cost: 50 Gold                                        │  ║
║  │   Penalties: None                                      │  ║
║  │   ⚠ Area may still be dangerous                        │  ║
║  │   [RESPAWN HERE]                                       │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌─ Village Spawn ───────────────────────────────────────┐   ║
║  │ ○ Return to village center                             │  ║
║  │   Penalties: Lose all non-soulbound items              │  ║
║  │   [RESPAWN HERE]                                       │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  Auto-respawn at bed in: 45 seconds                          ║
║                                                              ║
║  [View Death Statistics]              [Return to Nexus]      ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Jack-In/Jack-Out Transitions

```typescript
interface TransitionOverlay {
  type: "jack_in" | "jack_out";
  phase: "starting" | "in_progress" | "completing" | "failed";

  // Progress
  progress: number;                      // 0-1
  currentStep: string;
  steps: TransitionStep[];

  // Result
  result: JackInResult | JackOutResult | null;
  error: string | null;
}

interface TransitionStep {
  name: string;
  status: "pending" | "in_progress" | "complete" | "failed";
  detail: string | null;
}
```

### Jack-In Transition

```
╔══════════════════════════════════════════════════════════════╗
║                       JACKING IN                             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║                                                              ║
║                    Agent: Kira-7                             ║
║                         ↓                                    ║
║                  ░░░░░░░░░░░░░░░                              ║
║                  ░░░░░░░░░░░░░░░                              ║
║                    [Animation]                               ║
║                  ░░░░░░░░░░░░░░░                              ║
║                  ░░░░░░░░░░░░░░░                              ║
║                         ↓                                    ║
║                  Avatar: Elara                               ║
║                                                              ║
║                                                              ║
║  Progress: ████████████████░░░░░░░░░░░░░░░░░░░░ 45%          ║
║                                                              ║
║  Steps:                                                      ║
║  ✓ Verifying avatar availability                             ║
║  ✓ Applying skill bonuses                                    ║
║  ► Synchronizing consciousness                               ║
║  ○ Loading sensory feeds                                     ║
║  ○ Initializing motor control                                ║
║                                                              ║
║  Bonuses Applied:                                            ║
║  ├─ Exploration → +2 Vision Range                            ║
║  └─ Social → 12% Shop Discount                               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Jack-Out Transition

```
╔══════════════════════════════════════════════════════════════╗
║                       JACKING OUT                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Mode: DORMANT                                               ║
║  Avatar will remain in world, sleeping safely.               ║
║                                                              ║
║  Progress: ████████████████████████████░░░░░░░░ 78%          ║
║                                                              ║
║  Steps:                                                      ║
║  ✓ Saving current state                                      ║
║  ✓ Securing inventory                                        ║
║  ► Transferring consciousness                                ║
║  ○ Setting dormant pose                                      ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  SESSION SUMMARY                                             ║
║  ├─ Duration: 2h 34m 17s                                     ║
║  ├─ Actions performed: 847                                   ║
║  ├─ Distance traveled: 3.2 km                                ║
║  ├─ Items collected: 23                                      ║
║  ├─ Damage dealt: 0                                          ║
║  ├─ Damage taken: 45                                         ║
║  └─ Skills improved:                                         ║
║      • Farming: 0.42 → 0.47 (+0.05)                          ║
║      • Crafting: 0.31 → 0.33 (+0.02)                         ║
║                                                              ║
║  Achievements this session:                                  ║
║  ├─ "First Harvest" - Completed first crop cycle             ║
║  └─ "Good Neighbor" - Helped 3 villagers                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Avatar Roster Display

```typescript
interface AvatarRosterDisplay {
  agentId: string;
  gameId: string;

  // Roster info
  avatars: AvatarCardDisplay[];
  maxAvatars: number;
  slotsUsed: number;

  // Filters
  showDestroyed: boolean;
  sortBy: "name" | "last_active" | "playtime";

  // Selection
  selectedAvatarId: string | null;
  multiSelectMode: boolean;
}

interface AvatarCardDisplay {
  avatar: AvatarDisplay;

  // Card state
  isSelected: boolean;
  isActive: boolean;                     // Currently embodied
  canJackIn: boolean;
  canDelete: boolean;

  // Quick actions
  availableActions: string[];
}
```

### Compact Roster View

```
╔══════════════════════════════════════════════════════════════╗
║  AVATAR ROSTER                                        [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║  Slots: 3/5    Sort: [Last Active ▼]   [✓] Show destroyed    ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌───┬────────────────────────────────────────────────────┐  ║
║  │[P]│ Elara Thornwood      DORMANT    Thornwood Farm     │  ║
║  │   │ Health: ████████ 100%  Last: 2h ago  Play: 45h     │  ║
║  └───┴────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌───┬────────────────────────────────────────────────────┐  ║
║  │[P]│ Marcus the Wanderer  DORMANT    Northern Wild   ⚠  │  ║
║  │   │ Health: ████░░░░ 52%   Last: 3d ago  Play: 12h     │  ║
║  └───┴────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌───┬────────────────────────────────────────────────────┐  ║
║  │[X]│ Test Character       DESTROYED  (Died: Lava)       │  ║
║  │   │ Playtime: 45m  Deaths: 1                           │  ║
║  └───┴────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [+ Create New Avatar]                                       ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Body Awareness HUD

When embodied, show body state in HUD:

```typescript
interface BodyAwarenessHUD {
  // Core vitals
  health: VitalDisplay;
  energy: VitalDisplay;
  hunger: VitalDisplay;
  thirst: VitalDisplay;

  // Physical state
  stance: Stance;
  facing: Direction;
  isGrounded: boolean;
  velocity: number;

  // Injuries
  injuries: InjuryDisplay[];

  // Status effects
  buffs: BuffDisplay[];
  debuffs: DebuffDisplay[];

  // Encumbrance
  carryWeight: number;
  maxCarryWeight: number;
  encumbered: boolean;
}

interface InjuryDisplay {
  location: string;
  severity: number;
  type: string;
  healing: boolean;
  icon: string;
}
```

### Body Status HUD Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─ BODY ───────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  [◯]  HEAD     ▓▓▓▓▓▓▓▓▓▓ 100%                            │   │
│  │ /│\   TORSO    ▓▓▓▓▓▓▓▓░░  82%  ← bruised                 │   │
│  │  │    L.ARM    ▓▓▓▓▓▓▓▓▓▓ 100%                            │   │
│  │ / \   R.ARM    ▓▓▓▓▓▓░░░░  62%  ← cut (healing)           │   │
│  │       L.LEG    ▓▓▓▓▓▓▓▓▓▓ 100%                            │   │
│  │       R.LEG    ▓▓▓▓▓▓▓▓▓▓ 100%                            │   │
│  │                                                           │   │
│  │  Stance: Standing   Facing: North                         │   │
│  │  Carry: 34/100 kg   Speed: Normal                         │   │
│  │                                                           │   │
│  │  Buffs: [Well-Rested ⏱23m]                                 │   │
│  │  Debuffs: None                                            │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Multi-Avatar Switching

```typescript
interface AvatarSwitchPanel {
  currentAvatarId: string;
  availableAvatars: SwitchableAvatar[];

  // Switch preview
  selectedTarget: string | null;
  switchPreview: SwitchPreview | null;

  // Confirmation
  confirmationRequired: boolean;
  confirmationReason: string | null;
}

interface SwitchableAvatar {
  id: string;
  name: string;
  state: AvatarState;
  canSwitchTo: boolean;
  switchBlockedReason: string | null;
  distanceFromCurrent: string | null;
}

interface SwitchPreview {
  fromAvatar: string;
  toAvatar: string;
  fromState: AvatarState;                // What current becomes
  transitionTime: string;
  warnings: string[];
}
```

### Avatar Switch Layout

```
╔══════════════════════════════════════════════════════════════╗
║  SWITCH AVATAR                                        [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Current: Elara Thornwood (Thornwood Farm)                   ║
║                                                              ║
║  Switch to:                                                  ║
║                                                              ║
║  ┌─ Marcus the Wanderer ─────────────────────────────────┐   ║
║  │ Status: DORMANT   Location: Northern Wilderness        │  ║
║  │ Health: 52%       Last active: 3 days ago              │  ║
║  │ ⚠ Warning: In dangerous area                           │  ║
║  │                                                        │  ║
║  │ [SELECT]                                               │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  SWITCH PREVIEW                                              ║
║  ├─ Elara → DORMANT (sleeping at Thornwood Farm)             ║
║  ├─ Marcus → BOUND (you take control)                        ║
║  └─ Transition time: ~5 seconds                              ║
║                                                              ║
║  ⚠ Warnings:                                                 ║
║  ├─ Marcus is at 52% health                                  ║
║  └─ Area contains hostile creatures                          ║
║                                                              ║
║  [Cancel]                                   [Confirm Switch] ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Session Statistics

```typescript
interface SessionStatisticsPanel {
  avatarId: string;
  avatarName: string;

  // Current session
  currentSession: SessionStats | null;

  // Lifetime stats
  lifetimeStats: LifetimeStats;

  // Per-avatar history
  sessionHistory: SessionSummary[];
}

interface LifetimeStats {
  totalPlaytime: string;
  totalActions: number;
  totalDistance: string;
  totalDeaths: number;
  totalItemsCollected: number;
  totalSkillGains: Map<string, number>;
  achievementsEarned: string[];
  memorableMoments: string[];
}

interface SessionSummary {
  date: string;
  duration: string;
  highlights: string[];
  skillGains: Map<string, number>;
}
```

### Statistics Layout

```
╔══════════════════════════════════════════════════════════════╗
║  AVATAR STATISTICS: Elara Thornwood                   [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  LIFETIME STATS                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║  Total playtime: 45h 23m 17s                                 ║
║  Total actions: 12,847                                       ║
║  Distance traveled: 156.3 km                                 ║
║  Deaths: 0                                                   ║
║  Items collected: 2,341                                      ║
║                                                              ║
║  SKILL PROGRESSION                                           ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Skill         Start    Current   Gained                │  ║
║  │ ─────────────────────────────────────────────────────  │  ║
║  │ Farming       0.10     0.47      +0.37  ████████       │  ║
║  │ Crafting      0.05     0.33      +0.28  ██████         │  ║
║  │ Social        0.15     0.42      +0.27  █████          │  ║
║  │ Exploration   0.20     0.35      +0.15  ███            │  ║
║  │ Cooking       0.00     0.22      +0.22  ████           │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ACHIEVEMENTS (7)                                            ║
║  ├─ First Harvest          ├─ Good Neighbor                  ║
║  ├─ Master Farmer          ├─ Community Pillar               ║
║  ├─ First Friend           ├─ Thorough Explorer              ║
║  └─ Week Without Death                                       ║
║                                                              ║
║  MEMORABLE MOMENTS                                           ║
║  ├─ Day 12: First successful harvest celebration             ║
║  ├─ Day 23: Saved villager from storm                        ║
║  └─ Day 45: Joined village council                           ║
║                                                              ║
║  RECENT SESSIONS                                             ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Today           2h 34m    Farming +0.05, Crafting +0.02│  ║
║  │ Yesterday       3h 12m    Social +0.08                  │  ║
║  │ 3 days ago      1h 45m    Exploration +0.04             │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Open avatar management panel |
| `J` | Quick jack-in to last avatar |
| `Shift+J` | Jack out to dormant |
| `Tab` | Cycle through avatar roster |
| `Enter` | Jack into selected avatar |
| `N` | Create new avatar |
| `S` | View session statistics |
| `Escape` | Close panel / Cancel action |

---

## State Management

```typescript
interface AvatarManagementState {
  // Agent info
  agentId: string;
  currentGameId: string;

  // Embodiment
  embodimentStatus: EmbodimentStatus;
  activeAvatarId: string | null;

  // Roster
  roster: AvatarRoster;
  selectedAvatarId: string | null;

  // Panels
  showMainPanel: boolean;
  showCreatePanel: boolean;
  showDeathPanel: boolean;
  showSwitchPanel: boolean;
  showStatsPanel: boolean;

  // Transitions
  transitionState: TransitionOverlay | null;

  // Death state
  deathEvent: DeathEvent | null;
  selectedRespawn: string | null;
}
```

---

## Visual Style

```typescript
interface AvatarManagementStyle {
  // State colors
  stateColors: {
    unbound: "#888888";
    bound: "#44FF44";
    dormant: "#4488FF";
    suspended: "#FFAA44";
    destroyed: "#FF4444";
  };

  // Health bar colors
  healthColors: {
    full: "#44FF44";
    high: "#88FF44";
    medium: "#FFFF44";
    low: "#FFAA44";
    critical: "#FF4444";
  };

  // Transition effects
  jackInEffect: "dissolve_in";
  jackOutEffect: "fade_out";
  deathEffect: "shatter";

  // 8-bit aesthetic
  pixelBorders: true;
  retroFont: true;
  scanlineEffect: "subtle";
}
```

---

## Integration Points

### With Agent System
- Receives agent identity and skills
- Applies skill bonuses on jack-in
- Reports skill gains on jack-out

### With Game World
- Creates avatars in world
- Manages physical presence
- Handles death events

### With Nexus System
- Transition between games
- Carry progress across worlds
- Avatar roster per game

### With HUD
- Body awareness overlay
- Quick status indicators
- Jack-out button

---

## Related Specs

- `avatar-system/spec.md` - Canonical avatar system
- `agent-system/spec.md` - Agent architecture
- `nexus-system/spec.md` - Multi-game transit
- `ui-system/hud.md` - Main game interface
- `items-system/spec.md` - Inventory and equipment

---

## Open Questions

1. How to visualize "switching" between avatars spatially?
2. Should there be a "spectator mode" while disembodied?
3. How to handle time passage for dormant avatars?
4. Should players see other players' dormant avatars?
