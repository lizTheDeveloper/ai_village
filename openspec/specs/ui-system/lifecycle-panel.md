# Lifecycle Panel - UI Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0
**Depends on:** `agent-system/lifecycle-system.md`

---

## Overview

The lifecycle panel displays an agent's life journey: their age, life stage, developmental milestones, family connections, and mortality status. For children, it shows development progress. For elders, it shows legacy and wisdom. For the deceased, it becomes a memorial.

Alien species display fundamentally different lifecycle structures - pack minds show body composition, hives show queen/worker dynamics, symbionts show host history.

---

## Type Definitions

```typescript
import {
  AgentLifeStage,
  LifeStage,
  StageCharacteristics,
  BirthEvent,
  InheritedTraits,
  ChildDevelopment,
  ComingOfAge,
  DeathEvent,
  DeathCause,
  MourningProcess,
  MournerState,
  GriefStage,
  Legacy,
  FamilyTree,
  FamilyMember,
  Generation,
  PopulationDynamics,
  // Alien lifecycles
  PackMindLifecycle,
  PackFormation,
  PackBody,
  PackSplit,
  HiveLifecycle,
  QueenLifecycle,
  SymbiontLifecycle,
  HostRecord,
  MetamorphicLifecycle,
  StageTransition,
  ConstructedLifecycle,
  CyclicalLifecycle,
  DormancyEvent,
  GeologicalLifecycle,
} from "@specs/agent-system/lifecycle-system";

import { Agent } from "@specs/agent-system/spec";
```

---

## Lifecycle Panel Structure

### Main Panel

```typescript
interface LifecyclePanel {
  agentId: string;
  agentName: string;
  species: string;

  // Current state
  status: "alive" | "deceased" | "dormant" | "transforming";
  currentAge: AgeDisplay;
  currentStage: LifeStageDisplay;

  // Stage-specific content
  infantContent?: InfantDisplay;
  childContent?: ChildDevelopmentDisplay;
  adolescentContent?: AdolescentDisplay;
  adultContent?: AdultDisplay;
  elderContent?: ElderDisplay;

  // Universal sections
  familyTree: FamilyTreeDisplay;
  milestones: MilestoneTimeline;

  // If deceased
  memorialContent?: MemorialDisplay;

  // Alien-specific
  alienLifecycle?: AlienLifecycleSection;

  // UI state
  expandedSection: string | null;
  timelineView: boolean;
}

interface AgeDisplay {
  years: number;
  displayAge: string;                    // "23 years" or "142 cycles"
  stageProgress: number;                 // 0-1 through current stage
  estimatedLifespan: string | null;      // "Expected: 75-85 years"
  ageRelativeToSpecies: string;          // "Young adult for human"
}

interface LifeStageDisplay {
  stage: LifeStage;
  name: string;                          // Human-readable
  icon: string;
  description: string;

  // Stage characteristics
  physicalCapability: CapabilityBar;
  mentalCapability: CapabilityBar;
  socialRole: string[];

  // Transition info
  enteredStage: string;                  // "3 years ago"
  nextStage: string | null;              // "Elder in ~15 years"
  stageSpecialAbilities: string[];       // "Eligible for council"
}

interface CapabilityBar {
  label: string;
  value: number;                         // 0-1
  peakComparison: string;                // "At peak" / "75% of peak"
}
```

---

## Visual Layout

### Main Panel - Adult View

```
╔══════════════════════════════════════════════════════════════╗
║  LIFE: Elara Thornwood                                [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Age: 34 years                   Stage: [ADULT]              ║
║  ════════════════════════════════════════════════════════════║
║                                                              ║
║  ┌─────────────────┐  Physical: ████████████████░░░░ 82%     ║
║  │                 │  Mental:   ██████████████████░░ 91%     ║
║  │     [Portrait]  │  Wisdom:   ████████████░░░░░░░░ 62%     ║
║  │       Adult     │                                         ║
║  │                 │  Roles: Worker, Parent, Crafter         ║
║  └─────────────────┘                                         ║
║                                                              ║
║  Stage Progress: ███████░░░░░░░░░░░░░░ 35%                   ║
║  Entered Adult: 4 years ago (age 30)                         ║
║  Next Stage: Middle-aged in ~16 years                        ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  ▼ FAMILY                                                    ║
║  ├─ Partner: Marcus Thornwood (married 8 years)              ║
║  ├─ Children: Lily (6), Owen (3)                             ║
║  ├─ Parents: Helena (elder), Roland (deceased)               ║
║  └─ Siblings: Thomas (adult)                                 ║
║                                                              ║
║  ▶ MILESTONES [12 total]                                     ║
║                                                              ║
║  ▶ INHERITED TRAITS                                          ║
║                                                              ║
║  [View Full Family Tree]        [Timeline View]              ║
╚══════════════════════════════════════════════════════════════╝
```

### Child Development View

```
╔══════════════════════════════════════════════════════════════╗
║  LIFE: Lily Thornwood                                 [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Age: 6 years                    Stage: [CHILD]              ║
║  ════════════════════════════════════════════════════════════║
║                                                              ║
║  ┌─────────────────┐  Development Status                     ║
║  │                 │  ──────────────────                     ║
║  │     [Portrait]  │  Overall: On track                      ║
║  │      Child      │  Care quality: ████████████████ 92%     ║
║  │                 │  Social exposure: ██████████░░░░ 71%    ║
║  └─────────────────┘                                         ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  LEARNING FOCUS                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  Skill          Source       Teacher         Progress  │  ║
║  │  ─────────────────────────────────────────────────────│  ║
║  │  Basic Crafting   Play          -           ████░░ 42% │  ║
║  │  Reading         Teaching    Mother         ██████ 68% │  ║
║  │  Farming        Observation  Father         ███░░░ 35% │  ║
║  │  Social Skills   Play       Playmates       █████░ 55% │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  MILESTONES ACHIEVED                                         ║
║  ├─ First words (age 1)         ✓                            ║
║  ├─ Walking (age 1)             ✓                            ║
║  ├─ First friend (age 3)        ✓                            ║
║  ├─ Knows alphabet (age 5)      ✓                            ║
║  └─ First craft project (age 6) ✓  [NEW!]                    ║
║                                                              ║
║  UPCOMING MILESTONES                                         ║
║  ├─ Basic reading (expected: age 7)                          ║
║  ├─ First job helper (expected: age 8)                       ║
║  └─ Adolescence (expected: age 12)                           ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  CAREGIVERS                                                  ║
║  ├─ Primary: Elara Thornwood (Mother) ★                      ║
║  ├─ Secondary: Marcus Thornwood (Father)                     ║
║  └─ Additional: Helena Thornwood (Grandmother)               ║
║                                                              ║
║  INHERITED TRAITS                                            ║
║  ├─ Aptitude: Crafting (from mother)                         ║
║  ├─ Aptitude: Farming (from father)                          ║
║  └─ Personality: Creative, careful (blend of parents)        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Elder View

```
╔══════════════════════════════════════════════════════════════╗
║  LIFE: Helena Thornwood                               [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Age: 71 years                   Stage: [ELDER]              ║
║  ════════════════════════════════════════════════════════════║
║                                                              ║
║  ┌─────────────────┐  Physical: ██████░░░░░░░░░░░░░░ 48%     ║
║  │                 │  Mental:   ██████████████░░░░░░ 72%     ║
║  │     [Portrait]  │  Wisdom:   ████████████████████ 100%    ║
║  │      Elder      │                                         ║
║  │                 │  Roles: Elder, Advisor, Grandparent     ║
║  └─────────────────┘                                         ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  ELDER STATUS                                                ║
║  ├─ Village Council Member: Yes                              ║
║  ├─ Wisdom sought: 23 times this year                        ║
║  ├─ Stories shared: 47                                       ║
║  └─ Apprentices mentored: 5 lifetime                         ║
║                                                              ║
║  LEGACY IN PROGRESS                                          ║
║  ├─ Family knowledge passed: Thornwood Bread Recipe ✓        ║
║  ├─ Skills teaching: Herbalism → Elara (daughter)            ║
║  ├─ Memoirs: "Life in the Valley" (writing)                  ║
║  └─ Grandchildren: Lily, Owen, Marcus Jr.                    ║
║                                                              ║
║  HEALTH CONSIDERATIONS                                       ║
║  ├─ Energy max: 60% of peak                                  ║
║  ├─ Recovery rate: Slower                                    ║
║  └─ Light work only                                          ║
║                                                              ║
║  FAMILY TREE: 4 generations visible                          ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │                    Helena ★                             │  ║
║  │                       │                                 │  ║
║  │           ┌───────────┼───────────┐                     │  ║
║  │        Elara       Thomas      (died infant)            │  ║
║  │           │                                             │  ║
║  │      ┌────┴────┐                                        │  ║
║  │    Lily     Owen                                        │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Memorial Display (Deceased)

```typescript
interface MemorialDisplay {
  deceasedId: string;
  name: string;

  // Life summary
  lifeDates: string;                     // "Year 12 - Year 78"
  lifeStage: LifeStage;                  // At death
  causeOfDeath: string;
  peacefulDeath: boolean;

  // Circumstances
  deathLocation: string;
  witnesses: string[];
  lastWords: string | null;

  // Mourning
  mourners: MournerDisplay[];
  funeralHeld: boolean;
  memorialBuilt: boolean;

  // Legacy
  legacy: LegacyDisplay;

  // Memories
  memorableEvents: string[];
  relationships: RelationshipMemory[];
}

interface MournerDisplay {
  name: string;
  relationship: string;
  griefStage: GriefStage;
  griefIntensity: number;
}

interface LegacyDisplay {
  // Material
  estateDistributed: boolean;
  heirsReceived: HeirDisplay[];

  // Knowledge
  recipesPreserved: string[];
  skillsLost: string[];                  // Not taught before death
  writtenWorks: string[];

  // Social
  storiesRemembered: number;
  familyContinues: boolean;
  villageImpact: string;
}
```

### Memorial Layout

```
╔══════════════════════════════════════════════════════════════╗
║  IN MEMORIAM: Roland Thornwood                        [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌─────────────────┐                                         ║
║  │                 │  Year 8 - Year 72  (64 years)           ║
║  │   [Portrait]    │  Died: Elder, Peaceful                  ║
║  │    Memorial     │  Cause: Old age                         ║
║  │                 │  "A life well lived"                    ║
║  └─────────────────┘                                         ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  FINAL MOMENTS                                               ║
║  ├─ Location: Thornwood homestead, in bed                    ║
║  ├─ Witnesses: Helena (wife), Elara (daughter), Thomas (son) ║
║  └─ Last words: "Take care of the garden for me."            ║
║                                                              ║
║  MOURNING                                                    ║
║  ├─ Helena (wife) .............. Acceptance                  ║
║  ├─ Elara (daughter) ........... Acceptance                  ║
║  ├─ Thomas (son) ............... Depression → Acceptance     ║
║  ├─ Lily (granddaughter) ....... Sad but coping              ║
║  └─ Village .................... Funeral held, grave visited ║
║                                                              ║
║  LEGACY                                                      ║
║  ├─ Estate: Distributed to Helena and children               ║
║  ├─ Knowledge preserved:                                     ║
║  │   • Thornwood Apple Cider recipe → Elara                  ║
║  │   • Farming techniques → Thomas                           ║
║  ├─ Knowledge lost:                                          ║
║  │   • Old fishing spots (never shared)                      ║
║  ├─ Stories remembered: 12 memorable events in chronicle     ║
║  └─ Memorial: Grave in village cemetery, apple tree planted  ║
║                                                              ║
║  LIFE HIGHLIGHTS                                             ║
║  ├─ Founded Thornwood Farm (Year 24)                         ║
║  ├─ Married Helena (Year 26)                                 ║
║  ├─ Children born: Elara (Year 30), Thomas (Year 33)         ║
║  ├─ Great harvest celebration (Year 45)                      ║
║  ├─ Joined village council (Year 55)                         ║
║  └─ First grandchild (Year 65)                               ║
║                                                              ║
║  [View Full Family Tree]   [Visit Memorial]   [Read Stories] ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Family Tree Display

```typescript
interface FamilyTreeDisplay {
  rootAgent: string;
  familyName: string;

  // Tree structure
  generations: GenerationDisplay[];
  members: Map<string, FamilyMemberNode>;

  // Navigation
  centeredOn: string;
  visibleGenerations: number;

  // Stats
  totalMembers: number;
  livingMembers: number;
  oldestGeneration: number;

  // Family traits
  familyTraits: string[];
  familyKnowledge: string[];
  familyReputation: string;
}

interface FamilyMemberNode {
  agentId: string;
  name: string;
  status: "alive" | "deceased";
  generation: number;
  lifespan: string;

  // Connections
  parents: [string?, string?];
  partner: string | null;
  children: string[];
  siblings: string[];

  // Display
  portrait: string;
  highlightLevel: "focused" | "direct_family" | "extended" | "distant";
}
```

### Family Tree Layout

```
╔══════════════════════════════════════════════════════════════╗
║  FAMILY TREE: Thornwood                               [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Generations: 4    Members: 14 (9 living, 5 deceased)        ║
║  Family traits: Agricultural aptitude, Crafting talent       ║
║  ════════════════════════════════════════════════════════════║
║                                                              ║
║                     GENERATION 1                             ║
║                                                              ║
║           ┌─────────┐         ┌─────────┐                    ║
║           │ Edmund  │═════════│ Martha  │                    ║
║           │ †Y42    │         │ †Y55    │                    ║
║           └────┬────┘         └─────────┘                    ║
║                │                                             ║
║       ┌────────┼────────┐                                    ║
║       │        │        │                                    ║
║                     GENERATION 2                             ║
║       │        │        │                                    ║
║  ┌────┴───┐┌───┴────┐┌──┴─────┐                              ║
║  │ Roland ││ Helena ││ Albert │                              ║
║  │ †Y72   ││ 71 yrs ││ 68 yrs │                              ║
║  └───┬────┘└───┬────┘└────────┘                              ║
║      └════════─┘                                             ║
║           │                                                  ║
║       ┌───┴───────────┬─────────────┐                        ║
║       │               │             │                        ║
║                     GENERATION 3                             ║
║       │               │             │                        ║
║  ┌────┴────┐     ┌────┴────┐   ┌────┴────┐                   ║
║  │  Elara  │═════│ Marcus  │   │ Thomas  │═════[?]           ║
║  │  34 yrs │     │  36 yrs │   │  31 yrs │                   ║
║  └────┬────┘     └─────────┘   └────┬────┘                   ║
║       │                             │                        ║
║       ┌─────┬─────┐                 │                        ║
║       │     │     │                 │                        ║
║                     GENERATION 4                             ║
║       │     │     │                 │                        ║
║  ┌────┴──┐┌─┴───┐┌┴────────┐  ┌────┴────┐                    ║
║  │ Lily  ││Owen ││Marcus Jr│  │  Anna   │                    ║
║  │ 6 yrs ││3 yrs││ 1 yr    │  │  2 yrs  │                    ║
║  └───────┘└─────┘└─────────┘  └─────────┘                    ║
║                                                              ║
║  Legend: ═══ Married  │ Parent-child  † Deceased             ║
║          [★ = You]                                           ║
║                                                              ║
║  [Center on Elara]  [Show Ancestors]  [Show Descendants]     ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Milestone Timeline

```typescript
interface MilestoneTimeline {
  agentId: string;
  milestones: MilestoneDisplay[];

  // Filters
  showMinor: boolean;
  categoryFilter: string | null;

  // Navigation
  focusedMilestone: string | null;
  timelineScale: "compact" | "detailed";
}

interface MilestoneDisplay {
  id: string;
  name: string;
  category: "development" | "social" | "achievement" | "life_event";
  age: number;
  date: string;
  description: string;
  significance: "minor" | "notable" | "major" | "defining";

  // Related
  involvedAgents: string[];
  location: string | null;
}
```

### Timeline Layout

```
╔══════════════════════════════════════════════════════════════╗
║  LIFE TIMELINE: Elara Thornwood                       [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Filter: [All] [Development] [Social] [Achievement] [Life]   ║
║                                                              ║
║  Age 0 ─┬─ Born to Roland and Helena Thornwood        ★      ║
║         │  "First child of the Thornwood family"             ║
║         │                                                    ║
║  Age 1 ─┼─ First steps                                       ║
║         │                                                    ║
║  Age 5 ─┼─ Started learning to read                          ║
║         │                                                    ║
║  Age 8 ─┼─ Helped with first harvest                  ●      ║
║         │  "Discovered love of working the land"             ║
║         │                                                    ║
║  Age 12 ┼─ Began adolescence                                 ║
║         │                                                    ║
║  Age 14 ┼─ Started crafting apprenticeship            ●      ║
║         │  with Helena (mother)                              ║
║         │                                                    ║
║  Age 18 ┼─ Coming of age ceremony                     ★      ║
║         │  "Chose farming as profession"                     ║
║         │                                                    ║
║  Age 22 ┼─ Met Marcus at harvest festival             ●      ║
║         │                                                    ║
║  Age 26 ┼─ Married Marcus Thornwood                   ★      ║
║         │  "Village celebration, family joined"              ║
║         │                                                    ║
║  Age 28 ┼─ First child born: Lily                     ★      ║
║         │                                                    ║
║  Age 30 ┼─ Entered Adult stage                               ║
║         │                                                    ║
║  Age 31 ┼─ Second child born: Owen                    ●      ║
║         │                                                    ║
║  Age 33 ┼─ Father Roland passed away                  ●      ║
║         │  "Inherited family knowledge"                      ║
║         │                                                    ║
║  Age 34 ─┴─ Present day                                      ║
║                                                              ║
║  Legend: ★ Defining  ● Notable  ─ Minor                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Alien Lifecycle Displays

### Pack Mind Lifecycle

```typescript
interface PackMindLifecycleDisplay {
  packId: string;
  packName: string;

  // Formation info
  formation: PackFormationDisplay;
  packAge: number;
  personalityAge: number;                // Cumulative experience

  // Current bodies
  bodies: PackBodyDisplay[];
  bodyCount: number;
  coherenceStatus: string;

  // History
  splitHistory: PackSplitDisplay[];
  mergeHistory: PackMergeDisplay[];

  // Relationships to other packs
  relatedPacks: RelatedPackDisplay[];
}

interface PackBodyDisplay {
  bodyId: string;
  name: string;
  role: string;
  age: number;
  health: number;
  joinedPack: string;                    // When
  previousPack: string | null;
}
```

### Pack Mind Layout

```
╔══════════════════════════════════════════════════════════════╗
║  PACK LIFECYCLE: Kethrix Collective                   [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ╭────────────────────────────────────────────────────────╮  ║
║  │  This is a PACK MIND - one consciousness in 4 bodies.  │  ║
║  │  They don't birth or die individually.                 │  ║
║  ╰────────────────────────────────────────────────────────╯  ║
║                                                              ║
║  Pack Age: 47 years since formation                          ║
║  Personality Age: 188 body-years (cumulative experience)     ║
║  Coherence: ████████████████████ 100% (all bodies in range)  ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  CURRENT BODIES                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  Body      Role          Age    Health   Joined        │  ║
║  │  ─────────────────────────────────────────────────────│  ║
║  │  Keth-α    Thinker       52 yrs  ████ 89%  Founding    │  ║
║  │  Keth-β    Sensor        38 yrs  ████ 94%  Year 18     │  ║
║  │  Keth-γ    Manipulator   41 yrs  ███░ 78%  Year 12     │  ║
║  │  Keth-δ    General       29 yrs  ████ 96%  Year 23     │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  FORMATION HISTORY                                           ║
║  ├─ Method: Split from Nethrix Collective (Year 0)           ║
║  ├─ Original bodies: Keth-α, Keth-γ                          ║
║  ├─ Inherited: Partial memories, neutral relationship        ║
║  └─ Bodies added since: 2 (Keth-β, Keth-δ)                   ║
║                                                              ║
║  PACK EVENTS                                                 ║
║  ├─ Year 12: Keth-γ joined (orphan body adopted)             ║
║  ├─ Year 18: Keth-β born and raised within pack              ║
║  ├─ Year 23: Keth-δ joined (transfer from ally pack)         ║
║  ├─ Year 35: Near-split crisis (resolved peacefully)         ║
║  └─ Year 42: Keth-ε died (illness) - pack mourned            ║
║                                                              ║
║  RELATED PACKS                                               ║
║  ├─ Nethrix Collective (parent) .......... Friendly          ║
║  ├─ Vethrix Pack (Nethrix's other child) . Neutral           ║
║  └─ Dethrix Swarm (competitor) ........... Tense             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Hive Lifecycle

```
╔══════════════════════════════════════════════════════════════╗
║  HIVE LIFECYCLE: Zethrak Hive                         [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ╭────────────────────────────────────────────────────────╮  ║
║  │  This is a HIVE - the Queen matters, workers don't.    │  ║
║  │  Workers have no individual lifecycle.                 │  ║
║  ╰────────────────────────────────────────────────────────╯  ║
║                                                              ║
║  Hive Age: 234 years                                         ║
║  Hive Generation: 4th Queen                                  ║
║  ════════════════════════════════════════════════════════════║
║                                                              ║
║  QUEEN: Zeth-Mother IV                                       ║
║  ├─ Age: 58 years (expected lifespan: 80-100)                ║
║  ├─ Health: ████████████████████ 95%                         ║
║  ├─ Coronation: 58 years ago                                 ║
║  ├─ Succession plan: Eldest viable princess                  ║
║  └─ Potential successors: 3 princesses in development        ║
║                                                              ║
║  WORKER POPULATION                                           ║
║  ├─ Total: 847 workers                                       ║
║  ├─ Average lifespan: 45 days                                ║
║  ├─ Daily births: ~20    Daily deaths: ~18                   ║
║  └─ Population trend: Stable (+2/day)                        ║
║                                                              ║
║  HIVE LINEAGE                                                ║
║  ├─ Zeth-Mother I (founding) ........ Y0-Y62                 ║
║  │   └─ Swarming: Created Kithrak Hive (Y45)                 ║
║  ├─ Zeth-Mother II .................. Y62-Y124               ║
║  │   └─ Succession: Combat victory                           ║
║  ├─ Zeth-Mother III ................. Y124-Y176              ║
║  │   └─ Died: Disease (hive nearly collapsed)                ║
║  └─ Zeth-Mother IV (current) ........ Y176-present           ║
║      └─ Rebuilt hive from 200 to 847 workers                 ║
║                                                              ║
║  RELATED HIVES                                               ║
║  ├─ Kithrak Hive (daughter) ......... Allied                 ║
║  └─ Nethrak Hive (competitor) ....... Hostile                ║
║                                                              ║
║  [View Individual Worker] [View Queen Details]               ║
╚══════════════════════════════════════════════════════════════╝
```

### Symbiont Lifecycle

```
╔══════════════════════════════════════════════════════════════╗
║  SYMBIONT LIFECYCLE: Dax (joined with Ezri)           [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ╭────────────────────────────────────────────────────────╮  ║
║  │  This is a SYMBIONT - it lives across multiple hosts.  │  ║
║  │  The symbiont and host have separate lifecycles.       │  ║
║  ╰────────────────────────────────────────────────────────╯  ║
║                                                              ║
║  SYMBIONT: Dax                                               ║
║  ├─ Age: 357 years                                           ║
║  ├─ Health: ████████████████████ 98%                         ║
║  ├─ Total hosts: 8                                           ║
║  └─ Current host: Ezri (joined 2 years ago)                  ║
║                                                              ║
║  CURRENT HOST: Ezri                                          ║
║  ├─ Host age: 26 years                                       ║
║  ├─ Joining age: 24 years                                    ║
║  ├─ Integration: ██████████████░░░░░░ 72% (still adjusting)  ║
║  ├─ Dominance: Balanced (host/symbiont)                      ║
║  └─ Relationship: Harmonious                                 ║
║                                                              ║
║  ═══════════════════════════════════════════════════════════ ║
║                                                              ║
║  HOST HISTORY                                                ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ #  Host       Joined→Ended    Reason      Relationship │  ║
║  │ ─────────────────────────────────────────────────────── │  ║
║  │ 8  Ezri       Y355→present    Chosen      Harmonious   │  ║
║  │ 7  Jadzia     Y312→Y355       Host death  Harmonious   │  ║
║  │ 6  Curzon     Y258→Y312       Host death  Functional   │  ║
║  │ 5  Audrid     Y201→Y258       Host death  Harmonious   │  ║
║  │ 4  Torias     Y172→Y201       Host death  Strained     │  ║
║  │ 3  Emony      Y134→Y172       Host death  Harmonious   │  ║
║  │ 2  Tobin      Y89→Y134        Host death  Functional   │  ║
║  │ 1  Lela       Y0→Y89          Host death  Harmonious   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  INHERITED MEMORIES                                          ║
║  ├─ Diplomatic skills (from Curzon)                          ║
║  ├─ Scientific knowledge (from Jadzia)                       ║
║  ├─ Piloting ability (from Torias)                           ║
║  └─ [47 more memory categories from past hosts]              ║
║                                                              ║
║  [View Host Details]  [View Memory Integration]              ║
╚══════════════════════════════════════════════════════════════╝
```

### Metamorphic Lifecycle

```
╔══════════════════════════════════════════════════════════════╗
║  METAMORPHIC LIFECYCLE: Chrysalis-Who-Was-Grub        [?][×] ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ╭────────────────────────────────────────────────────────╮  ║
║  │  This species undergoes COMPLETE METAMORPHOSIS.        │  ║
║  │  Each stage is a dramatically different being.         │  ║
║  ╰────────────────────────────────────────────────────────╯  ║
║                                                              ║
║  Current Form: ADULT (Emerged 3 years ago)                   ║
║  Total Age: 15 years (across all forms)                      ║
║  ════════════════════════════════════════════════════════════║
║                                                              ║
║  STAGE HISTORY                                               ║
║                                                              ║
║  ┌─ LARVAL (Years 0-8) ─────────────────────────────────┐    ║
║  │  Name: "Grub-of-the-Deep-Roots"                       │   ║
║  │  Form: Worm-like, underground, non-verbal             │   ║
║  │  Memories retained: 15% (sensory impressions)         │   ║
║  │  Personality: Simple, focused on growth               │   ║
║  └──────────────────────────────────────────────────────┘    ║
║             ↓ PUPATION (2 years in cocoon) ↓                 ║
║  ┌─ PUPAL (Years 8-10) ─────────────────────────────────┐    ║
║  │  Location: Protected grotto, tended by adults         │   ║
║  │  State: Unconscious, complete restructuring           │   ║
║  │  Dreams: Symbolic visions (remembered)                │   ║
║  └──────────────────────────────────────────────────────┘    ║
║             ↓ EMERGENCE (dramatic transformation) ↓          ║
║  ┌─ ADULT (Years 10-present) ★ ─────────────────────────┐    ║
║  │  Name: "Chrysalis-Who-Was-Grub"                       │   ║
║  │  Form: Winged, aerial, fully sapient                  │   ║
║  │  Memories of larval life: Vague sensations            │   ║
║  │  Personality: Curious, philosophical, artistic        │   ║
║  │  Recognizable as former self: Partially               │   ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                              ║
║  FUTURE POTENTIAL                                            ║
║  ├─ Elder transformation possible: Yes (rare, ~5% of pop)    ║
║  ├─ Trigger: Great wisdom + spiritual readiness              ║
║  └─ Transcendent form: Unknown (those who transform leave)   ║
║                                                              ║
║  RELATIONSHIPS                                               ║
║  ├─ Larval nest-siblings: 12 (8 emerged, 4 still larval)     ║
║  ├─ Recognize each other: No (different beings now)          ║
║  └─ Cultural connection: Shared emergence celebration        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `L` | Open lifecycle panel for selected agent |
| `F` | Focus on family tree |
| `T` | Toggle timeline view |
| `M` | View milestones |
| `D` | View development (children) |
| `E` | View elder status |
| `Tab` | Cycle through sections |
| `Arrow Keys` | Navigate family tree |
| `Escape` | Close panel |

---

## State Management

```typescript
interface LifecyclePanelState {
  selectedAgentId: string | null;
  agentStatus: "alive" | "deceased" | "dormant";

  // View options
  currentSection: "overview" | "family" | "timeline" | "development" | "memorial";
  timelineScale: "compact" | "detailed";
  familyTreeCenter: string;
  familyTreeDepth: number;

  // Filters
  milestoneFilter: string[];
  showMinorMilestones: boolean;

  // Data cache
  lifecycleData: LifecycleData | null;
  familyTreeData: FamilyTree | null;
}
```

---

## Visual Style

```typescript
interface LifecyclePanelStyle {
  // Life stage colors
  stageColors: {
    infant: "#AADDFF";                   // Soft blue
    child: "#AAFFAA";                    // Light green
    adolescent: "#FFEEAA";               // Warm yellow
    young_adult: "#FFBB77";              // Orange
    adult: "#FF9966";                    // Deep orange
    middle_aged: "#DD8855";              // Brown-orange
    elder: "#AAAADD";                    // Dignified purple
    ancient: "#DDDDFF";                  // Silver-white
  };

  // Status indicators
  statusColors: {
    alive: "#44FF44";
    deceased: "#888888";
    dormant: "#4488FF";
    transforming: "#FF44FF";
  };

  // Milestone significance
  milestoneMarkers: {
    defining: "★";
    major: "●";
    notable: "○";
    minor: "─";
  };

  // Family tree
  treeConnectors: {
    marriage: "═══";
    parentChild: "│";
    siblings: "┬";
  };

  // 8-bit aesthetic
  pixelBorders: true;
  retroFont: true;
}
```

---

## Integration Points

### With Agent System
- Receives lifecycle state from agent
- Subscribes to aging/stage transition events
- Updates on births, deaths, marriages

### With Memory System
- Milestones become memories
- Death memories for mourners
- Legacy persists in village memory

### With Chronicle System
- Major life events recorded
- Family histories documented
- Memorial stories preserved

### With Species Encyclopedia
- Links to species lifecycle info
- Explains alien lifecycle patterns
- Educational content

---

## Related Specs

- `agent-system/lifecycle-system.md` - Canonical lifecycle system
- `agent-system/spec.md` - Agent architecture
- `agent-system/species-system.md` - Species lifespan/reproduction
- `agent-system/relationship-system.md` - Family bonds
- `ui-system/memory-viewer.md` - Memory of life events
- `ui-system/chronicle-viewer.md` - Historical records

---

## Open Questions

1. How to handle viewing very large family trees (10+ generations)?
2. Should deceased agents be browseable indefinitely or archived?
3. How to visualize lifecycle for species with no birth/death concept?
4. Should players see predicted future milestones?
