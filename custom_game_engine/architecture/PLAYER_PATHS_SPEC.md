# Player Path System Specification

**Status**: DESIGN PHASE
**Version**: 1.0
**Last Updated**: 2025-12-30

## Overview

Two distinct player experiences:
1. **Mortal Path** - Start as a mortal agent, ascend to godhood through deeds/belief
2. **Deity Path** - Start as an unknown god, identity shaped by believers (current implementation)

Both paths include the possibility of becoming a divine servant (angel) for another deity, including the Supreme Creator.

---

## Core Philosophy

### Design Principles
- **No predetermined outcomes** - Ascension is earned, not guaranteed
- **Death has consequences** - Reincarnation carries penalties and changes
- **Identity is emergent** - Whether mortal or god, who you are is shaped by actions and perceptions
- **Multiple paths to power** - Many ways to ascend, many ways to serve

### Key Questions Answered
- **Can mortals become gods?** Yes, through multiple ascension paths
- **Can mortals become angels?** Yes, if chosen/elevated by a deity
- **Can gods die?** Deities can fade or be destroyed if belief is cut off
- **Can angels become gods?** Potentially, if they gain independent worship
- **What happens when player mortal dies?** Reincarnation with memory fragments

---

## Part 1: Dual Starting Paths

### Path Selection

**When**: During universe creation (UniverseConfigScreen)

**UI Addition**:
```typescript
export interface UniverseConfig {
  magicParadigmId: string | null;
  startingScenario?: string;
  playerStartType: 'mortal' | 'deity';  // NEW
  universeName?: string;
  seed?: number;
}
```

**Selection Options**:

#### Option 1: Begin as Mortal
- **Description**: "Experience mortality. Die, reincarnate, and potentially ascend to godhood through legendary deeds or divine favor."
- **Preview**: "Fragile. Limited. But you can touch the world directly."
- **Starting State**:
  - One mortal agent with `PlayerAgentComponent`
  - Normal agent needs (hunger, health, sleep)
  - Can die permanently if not rescued/reincarnated
  - Direct control over movement and actions

#### Option 2: Begin as Deity
- **Description**: "Start as an unknown god. Your identity emerges through worship. Indirect but powerful."
- **Preview**: "Shapeless potential. Believers will define you."
- **Starting State**:
  - Current implementation (`createPlayerDeity`)
  - Deity entity with blank identity
  - Controlled through prayers, visions, miracles
  - Can manifest avatars when belief permits

---

## Part 2: Mortal Path Implementation

### Components

#### PlayerAgentComponent
```typescript
export class PlayerAgentComponent extends ComponentBase {
  public readonly type = 'player_agent';

  // Ascension tracking
  public canAscend: boolean = false;
  public ascensionProgress: number = 0; // 0-1
  public ascensionPath: AscensionPath | null = null;

  // Divine favor (can be granted by multiple deities)
  public divineFavor: Map<string, DivineFavorState> = new Map();

  // Angel candidacy (if deity has offered elevation)
  public angelOffers: Array<{
    deityId: string;
    servantTemplateId: string;
    offeredAt: number;
    expiresAt: number;
  }> = [];

  // Reincarnation state
  public incarnationNumber: number = 1;
  public deathCount: number = 0;
  public previousLives: PreviousLifeRecord[] = [];

  // Legend tracking (for narrative ascension)
  public legendaryDeeds: LegendaryDeed[] = [];
  public reputation: number = 0;
  public titleEarned?: string;
}

export interface DivineFavorState {
  deityId: string;
  favorLevel: number; // 0-100
  lastInteraction: number;
  miracles Witnessed: number;
  visionsReceived: number;
}

export interface PreviousLifeRecord {
  incarnationNumber: number;
  name: string;
  age: number;
  deathCause: string;
  deathTick: number;
  location: { x: number; y: number };

  // What carries over
  memoriesRetained: string[];
  skillsPartiallyRetained: Map<string, number>; // skill -> retention %
  personalityTraits: string[];
  karmaBalance: number;
}

export interface LegendaryDeed {
  id: string;
  type: LegendaryDeedType;
  description: string;
  timestamp: number;
  witnessCount: number;
  mythGenerated: boolean;
}

export type LegendaryDeedType =
  | 'slew_great_beast'
  | 'founded_settlement'
  | 'saved_life'
  | 'discovered_technology'
  | 'performed_miracle'
  | 'survived_death'
  | 'martyrdom'
  | 'enlightenment';
```

### Systems

#### PlayerMortalControlSystem
**Priority**: 10 (very early)
**Purpose**: Override AgentBrainSystem for player-controlled mortal

**Responsibilities**:
- Capture player input (keyboard/mouse)
- Translate input to agent actions
- Display mortal-specific UI (health, hunger, stamina)
- Show ascension progress if applicable

**Input Mapping**:
- WASD / Arrow Keys: Movement
- E: Interact with nearest entity/object
- I: Open inventory
- C: Open crafting
- P: Pray (opens prayer UI to select deity)
- Tab: Cycle between available actions

**UI Panels**:
- **Mortal Status Panel**: Health, hunger, stamina, age
- **Ascension Progress Panel**: If `canAscend === true`, show progress bar and path
- **Divine Favor Panel**: Show deities aware of you and favor levels
- **Angel Offers Panel**: If any deity has offered elevation

#### MortalAscensionSystem
**Priority**: 75 (after belief systems)
**Purpose**: Track ascension conditions and trigger transformation

**Ascension Paths**:

##### Path 1: Believer Threshold
- **Condition**: `believerCount >= 50` mortals worship the player as a god
- **Mechanism**: Collective belief crystallizes player into deity
- **Result**: Transform into `DeityComponent`, transfer `PlayerAgentComponent` data
- **Special**: Original mortal body can become first avatar

##### Path 2: Legendary Deeds
- **Condition**: Complete 3+ legendary deeds + `reputation >= 1000`
- **Mechanism**: Mythic status transcends mortality
- **Result**: Ascend with domain related to deeds
- **Special**: Myths already exist about you

##### Path 3: Death Loop Immortal
- **Condition**: Die and reincarnate 7+ times
- **Mechanism**: Recurring existence proves divine nature
- **Result**: Ascend as deity of death/rebirth
- **Special**: Keep memories of all past lives

##### Path 4: Divine Parentage
- **Condition**: Another deity claims you as offspring/creation
- **Mechanism**: Divine lineage grants godhood
- **Result**: Instant ascension, inherit parent's domain(s)
- **Special**: Start with parent deity's favor and some of their believers

##### Path 5: Worshipper Sacrifice
- **Condition**: 10+ mortals perform blood sacrifice to elevate you
- **Mechanism**: Sacrificed life force empowers ascension
- **Result**: Forced transformation, potentially dark deity
- **Special**: Darker personality traits, potentially malevolent

##### Path 6: Cosmic Event Witness
- **Condition**: Witness a cosmic-scale event (Creator defeat, reality fracture, etc.)
- **Mechanism**: Exposure to raw divine power transforms you
- **Result**: Ascend with cosmic/mystery domain
- **Special**: Unstable identity, may have cosmic knowledge

**Ascension Process**:
```typescript
function triggerAscension(world: World, mortalId: string, path: AscensionPath): void {
  // 1. Create DeityComponent
  // 2. Transfer player control from PlayerAgentComponent to deity
  // 3. Generate initial identity based on path
  // 4. Optionally keep mortal body as avatar
  // 5. Notify believers (if any)
  // 6. Generate ascension myth
  // 7. Trigger cutscene/ceremony
  // 8. Grant initial divine powers
}
```

#### PlayerReincarnationSystem
**Priority**: 111 (after death detection)
**Purpose**: Handle player mortal death and rebirth

**Reincarnation Triggers**:
- Player mortal health <= 0
- Player in Underworld for X time
- Player accepts angel offer (transformation, not death)

**Reincarnation Options** (player chooses):

1. **Immediate Return**
   - Cost: Lose 50% of current life memories
   - Benefit: No downtime
   - New body: Young adult (age 20-25)
   - Location: Nearest settlement

2. **Underworld Exploration**
   - Wait in Underworld realm for 1-7 in-game days
   - Benefit: Explore death realm, possibly gain insights
   - New body: Variable age (10-40)
   - Location: Home settlement or random

3. **Divine Intervention**
   - Wait for deity to resurrect you
   - Cost: Owe favor to deity
   - Benefit: Keep most memories, deity may grant blessing
   - New body: Same age as death
   - Location: Chosen by deity

4. **Accept Angel Offer** (if available)
   - Become divine servant instead of reincarnating
   - Cost: No longer mortal path, serve deity
   - Benefit: Immortality as angel, divine powers
   - Form: Deity's servant template

**Memory Retention**:
- **Base**: 30% of memories retained
- **+10%** per incarnation (max +50%)
- **+20%** if deity intervenes
- **-20%** if immediate return
- **+40%** if death loop ascension path

**Skill Retention**:
- **Base**: 20% of skill levels carried over
- Diminishing returns per incarnation
- Some skills (e.g., combat instinct) transfer better than others

**Personality Changes**:
- Random chance to shift personality traits
- Higher spirituality each incarnation
- Memory fragments cause subtle behavior changes

---

## Part 3: Angel Elevation Mechanic

### Overview

Any deity (including the Supreme Creator) can offer to transform a mortal into a divine servant. This is distinct from ascension - instead of becoming a god, you become an immortal agent of one.

### Angel vs Deity Path

| Aspect | Angel Path | Deity Path |
|--------|------------|------------|
| **Power Source** | Deity's belief pool | Own believers |
| **Identity** | Defined by deity | Emergent from believers |
| **Lifespan** | Immortal (until deity dies) | Immortal (until belief gone) |
| **Autonomy** | Tasks set by deity | Full autonomy |
| **Abilities** | Defined by servant template | Domain-based powers |
| **Vulnerability** | Dies if deity destroyed | Fades if belief lost |

### Elevation Process

#### Step 1: Deity Makes Offer

**Triggers** (deity can offer for various reasons):
- Mortal is devout believer (high faith level)
- Mortal performed service to deity
- Deity needs specific servant type
- Supreme Creator wants to prevent rebellion (buy loyalty)
- Mortal is dying and deity offers "salvation"

**Offer Structure**:
```typescript
interface AngelOffer {
  deityId: string;
  deityName: string;
  targetMortalId: string;

  servantTemplateId: string;
  servantTypeName: string; // "Valkyrie", "Seraph", "Hound of the Hunt", etc.

  description: string; // LLM-generated description of what servant does

  offeredAt: number;
  expiresAt: number;

  // What mortal gains
  powers: string[];
  immortality: boolean;
  rank: number;

  // What mortal loses
  mortality: boolean;
  freeWill: boolean; // Some deities allow autonomy, others don't
  abilityToAscend: boolean; // Can't become god if you're an angel
}
```

**Player Notification**:
- Vision from deity with offer
- UI prompt with Accept/Decline buttons
- Shows what you gain/lose
- Warns if offer will prevent ascension

#### Step 2: Player Decision

**If Accept**:
1. Mortal entity transformed
2. Add `DivineServantComponent`
3. Remove `PlayerAgentComponent` (or modify for angel control)
4. Apply servant template (form, abilities, stats)
5. Link to deity's servant hierarchy
6. Grant immortality and powers
7. Set initial task from deity

**If Decline**:
1. Deity relation impact (may anger deity, or deity respects choice)
2. Offer expires
3. Continue as mortal

**If Ignore** (let expire):
1. Offer removed from queue
2. Small relation penalty with deity

#### Step 3: Life as Divine Servant

**Control**:
- Still player-controlled (not AI-driven)
- Receive "suggestions" from deity (if AI god) or direct commands (if player god)
- Can disobey, but consequences vary by deity

**Abilities**:
- Powers defined by `ServantTemplate`
- Stronger than mortal, weaker than avatar
- May have unique abilities (flight, smiting, blessing, etc.)

**Tasks**:
- Deity assigns tasks (deliver messages, protect believers, guard temple, etc.)
- Player can choose how to complete tasks
- Completion grants favor with deity

**Path Forward**:
- **Remain Loyal**: Serve deity indefinitely, may get promoted in hierarchy
- **Rebel**: Join cosmic rebellion if deity is tyrannical
- **Independent Worship**: If mortals start worshipping YOU, can potentially ascend despite being angel
- **Death**: If deity dies/fades, you fade too (unless you've gained independent worship)

### Supreme Creator Angel Path

**Special Case**: If the Supreme Creator offers angel elevation:

**Unique Servant Types**:
- **Enforcers**: Hunt down rebels and magic users
- **Inquisitors**: Root out forbidden knowledge
- **Watchers**: Spy on other deities for the Creator
- **Reapers**: Collect souls/punish violators

**Implications**:
- You become part of the tyranny system
- Rebels will view you as enemy
- May participate in crushing revolts
- Potentially very powerful position
- High risk if rebellion succeeds (you go down with Creator)

**Interesting Choice**:
- Accept → Power and immortality, but serve tyrant
- Decline → Remain mortal/on ascension path, stay free

---

## Part 4: Integration with Existing Systems

### DeityEmergenceSystem
**Change**: Check for player mortal with high believer count
- If `PlayerAgentComponent` exists and `believerCount >= 50`
- Trigger `MortalAscensionSystem` instead of creating new deity

### DeathTransitionSystem
**Change**: Check for `PlayerAgentComponent` before standard death flow
- Intercept player mortal deaths
- Trigger reincarnation UI instead of Underworld transition
- Allow choice between reincarnation and accepting angel offer (if available)

### AngelSystem
**Addition**: Support player-controlled angels
- Current `AngelSystem` assumes AI control
- Add `isPlayerControlled` flag to `AngelData`
- Bypass autonomous AI for player angels
- Still charge maintenance costs to deity

### PrayerSystem
**Addition**: Mortals can pray to player mortal
- If mortal has high reputation, others may pray to them
- These prayers indicate belief formation
- Track for ascension path progression

### AvatarSystem
**Change**: After ascension, original mortal body can become avatar
- Option during ascension: "Keep mortal form as avatar"
- Allows newly-ascended deity to continue interacting physically
- Different from creating new avatar (no belief cost)

---

## Part 5: UI/UX Design

### Universe Creation Screen

**Addition**: Player path selection

```
┌─────────────────────────────────────────┐
│  Choose Your Path                       │
├─────────────────────────────────────────┤
│                                         │
│  ○ Begin as Mortal                     │
│    Experience mortality, death, and     │
│    potential ascension. Touch the       │
│    world directly but accept            │
│    vulnerability.                        │
│                                         │
│  ○ Begin as Deity                      │
│    Start as an unknown god. Your        │
│    identity shaped by worship.          │
│    Indirect but powerful.               │
│                                         │
└─────────────────────────────────────────┘
```

### Mortal HUD

When playing as mortal:

```
┌──────────────────────────────────────────┐
│  ❤ 87/100   🍖 65/100   ⚡ 42/100      │ ← Health, Hunger, Stamina
│  📿 Divine Favor: 3 deities aware       │ ← Track deity relationships
│  ⭐ Legend: 450/1000 (2 deeds)          │ ← Ascension progress
└──────────────────────────────────────────┘
```

### Ascension Progress Panel

```
┌──────────────────────────────────────────┐
│  Ascension Progress                      │
├──────────────────────────────────────────┤
│  Path: Legendary Deeds                   │
│  Progress: ████████░░░░░░ 45%           │
│                                          │
│  Requirements:                           │
│  ✓ Legendary Deeds: 2/3                 │
│  ░ Reputation: 450/1000                  │
│  ░ Witnesses: 28/50                      │
└──────────────────────────────────────────┘
```

### Angel Offer UI

```
┌──────────────────────────────────────────┐
│  Divine Offer from Thalor, God of Hunt  │
├──────────────────────────────────────────┤
│                                          │
│  "I offer you immortality as one of my  │
│   Hounds of the Hunt. Run forever       │
│   beneath the stars, never tire, never  │
│   die. Serve me, and transcend flesh."  │
│                                          │
│  You will become: Hound of the Hunt     │
│  Rank: Hunter (Tier 2)                  │
│                                          │
│  You gain:                               │
│  + Immortality                           │
│  + Enhanced senses (10x normal)          │
│  + Supernatural speed                    │
│  + Tracking vision                       │
│  + Immunity to fatigue                   │
│                                          │
│  You lose:                               │
│  - Mortality                             │
│  - Ability to ascend to godhood          │
│  - Independence (serve Thalor)           │
│                                          │
│  [ Accept ]  [ Decline ]                 │
└──────────────────────────────────────────┘
```

### Reincarnation Screen

```
┌──────────────────────────────────────────┐
│  You Have Died                           │
│  Cause: Mauled by wolf                   │
│  Age: 32 | Incarnation: 2               │
├──────────────────────────────────────────┤
│                                          │
│  Choose your return:                     │
│                                          │
│  1. Immediate Reincarnation              │
│     └─ Lose 50% memories                 │
│     └─ Return as young adult             │
│                                          │
│  2. Journey Through Underworld           │
│     └─ Explore death realm for 1-7 days  │
│     └─ Variable age on return            │
│                                          │
│  3. Await Divine Intervention            │
│     └─ A god may resurrect you           │
│     └─ You will owe them favor           │
│                                          │
│  4. Accept Angel Offer (if available)    │
│     └─ Become Hound of the Hunt          │
│     └─ Serve Thalor forever              │
│                                          │
└──────────────────────────────────────────┘
```

---

## Part 6: Technical Implementation

### Phase 1: Core Components & Mortal Control
**Files to Create**:
- `src/components/PlayerAgentComponent.ts`
- `src/systems/PlayerMortalControlSystem.ts`
- `src/types/PlayerPathTypes.ts`

**Files to Modify**:
- `packages/renderer/src/UniverseConfigScreen.ts` (add path selection)
- `demo/src/main.ts` (add `createPlayerMortal()`)

**Testing**: Can spawn as mortal, move around, basic agent actions work

---

### Phase 2: Reincarnation System
**Files to Create**:
- `src/systems/PlayerReincarnationSystem.ts`
- `src/ui/ReincarnationScreen.ts` (renderer package)

**Files to Modify**:
- `src/systems/DeathTransitionSystem.ts` (intercept player deaths)

**Testing**: Die as mortal, reincarnation UI appears, choose option, respawn correctly

---

### Phase 3: Ascension Mechanics
**Files to Create**:
- `src/systems/MortalAscensionSystem.ts`
- `src/events/AscensionEvents.ts`
- `src/ui/AscensionProgressPanel.ts` (renderer package)

**Files to Modify**:
- `src/systems/DeityEmergenceSystem.ts` (check for player mortal ascension)
- `src/systems/PrayerSystem.ts` (allow prayers to mortals)

**Testing**: Trigger each ascension path, verify transformation works

---

### Phase 4: Angel Elevation
**Files to Create**:
- `src/systems/AngelElevationSystem.ts`
- `src/ui/AngelOfferPanel.ts` (renderer package)
- `src/events/AngelElevationEvents.ts`

**Files to Modify**:
- `src/systems/AngelSystem.ts` (support player-controlled angels)
- `src/divinity/DivineServantTypes.ts` (add elevation-related types)
- `src/systems/AIGodBehaviorSystem.ts` (AI gods can make offers)

**Testing**:
- Deity offers angel transformation
- Accept offer, become angel
- Decline offer, continue as mortal
- Angel abilities work correctly

---

### Phase 5: UI & Polish
**Files to Create**:
- `src/ui/MortalHUD.ts`
- `src/ui/DivineFavorPanel.ts`

**Files to Modify**:
- All UI components to handle dual path states
- Tutorial/help text

**Testing**: All UI appears correctly, transitions smooth

---

## Part 7: Narrative Design

### Story Beats

#### Mortal Path Arc
1. **Humble Beginnings**: Spawn as nobody, struggle to survive
2. **First Death**: Experience mortality, choose reincarnation
3. **Growing Legend**: Deeds spread as myths, reputation builds
4. **Divine Attention**: Deities notice you (for good or ill)
5. **The Offer**: First angel offer, temptation of immortality
6. **The Choice**: Accept servitude or continue toward godhood
7. **Ascension**: Achieve deity status through earned power
8. **New Perspective**: See world from divine viewpoint

#### Angel Path Arc (if accepted)
1. **Transformation**: Mortal → Immortal servant
2. **Initiation**: First task from deity
3. **Hierarchy**: Meet other angels, learn your place
4. **Loyalty Test**: Deity asks something difficult
5. **Doubt**: See deity's flaws/tyranny
6. **Crisis**: Rebellion begins, must choose side
7. **Consequence**: Live with choice (remain loyal or rebel)

#### Supreme Creator Angel Arc (special)
1. **The Offer**: Creator offers power in exchange for service
2. **Enforcer**: Hunt rebels and magic users
3. **Surveillance**: Spy on other deities
4. **Moral Weight**: Crush mortal uprising, witness suffering
5. **The Rebellion**: Cosmic rebellion begins
6. **The Choice**: Remain loyal to tyrant or defect
7. **The Fall**: If rebellion wins and you stayed loyal, face judgment

---

## Part 8: Balance Considerations

### Mortal Path
**Advantages**:
- Direct world interaction (can build, craft, fight personally)
- Strong narrative arc (nobody → legend → god)
- Personal relationships with other mortals
- Multiple paths to power

**Disadvantages**:
- Vulnerable to death
- Slow power scaling
- Limited to physical location
- Must manage needs (hunger, sleep, health)

### Deity Path
**Advantages**:
- Start with divine powers (limited by belief)
- Wide-area influence
- Cannot truly die (only fade)
- Avatar manifestation option

**Disadvantages**:
- Indirect interaction
- Identity defined by others
- Dependent on belief
- Political divine conflicts

### Angel Path
**Advantages**:
- Immortality without belief requirement
- Specific powerful abilities
- Protected by deity's power
- Skip mortal vulnerabilities

**Disadvantages**:
- Serve deity, not fully autonomous
- Cannot ascend to godhood
- Tied to deity's fate
- May be asked to do immoral things

---

## Part 9: Example Player Journeys

### Journey 1: The Reluctant God
1. Start as mortal, try to live peaceful farmer life
2. Accidentally save village from disaster (legendary deed)
3. Villagers start worshipping you, you discourage it
4. Believers grow anyway, ascension begins involuntarily
5. Forced to become deity when threshold reached
6. Now must deal with responsibilities you didn't want

### Journey 2: The Hound
1. Start as mortal hunter, skilled tracker
2. Pray to Thalor, God of Hunt
3. Die in hunt, Thalor offers angel elevation
4. Accept, become Hound of the Hunt
5. Hunt supernatural threats for deity
6. Eventually lead pack of other Hounds
7. When Creator is overthrown, Thalor rewards loyalty with freedom

### Journey 3: The Cycle Breaker
1. Start as mortal, die young
2. Reincarnate, remember fragments
3. Die again, reincarnate, more memories
4. Seven deaths later, achieve immortality through repetition
5. Ascend as deity of death/rebirth
6. Help other mortals navigate death and reincarnation

### Journey 4: The Traitor Angel
1. Start as mortal, very devout to Supreme Creator
2. Creator offers Enforcer position to hunt rebels
3. Accept, become powerful angel
4. Witness Creator's tyranny firsthand
5. Meet rebel gods, hear their case
6. Defect during cosmic rebellion, use insider knowledge
7. Help overthrow Creator, earn place in new pantheon

---

## Part 10: Open Questions

### Design Decisions Needed

1. **Angel Rebellion**: Can player angels rebel against their deity?
   - **Option A**: Yes, but severe penalties (lose powers, deity hunts you)
   - **Option B**: No, bound by divine contract
   - **Recommendation**: Option A - adds agency and drama

2. **Multiple Angel Offers**: Can player receive offers from multiple deities?
   - **Option A**: Yes, must choose between them
   - **Option B**: No, first offer blocks others
   - **Recommendation**: Option A - more interesting choices

3. **Ascension After Angel**: Can angels ascend if they gain worship?
   - **Option A**: Yes, but extremely rare and requires deity's permission/death
   - **Option B**: No, angel path locks out deity path permanently
   - **Recommendation**: Option A - allows for epic angel→god narratives

4. **Creator Angel Death**: What happens to Creator's angels if Creator is killed?
   - **Option A**: They fade and die too
   - **Option B**: They become free agents (can be recruited by other gods)
   - **Option C**: Player can choose to sacrifice self to keep Creator alive
   - **Recommendation**: Option B - opens post-rebellion gameplay

5. **Memory Retention Balance**: How much should reincarnation preserve?
   - Current spec: 30% base + modifiers
   - Too high = no penalty for death
   - Too low = feels like starting over completely
   - **Recommendation**: Test and adjust based on feel

---

## Part 11: Success Criteria

### MVP (Minimum Viable Product)
- [ ] Player can choose mortal or deity path at universe creation
- [ ] Mortal path: basic control, needs, death
- [ ] Reincarnation: at least one option (immediate) works
- [ ] Ascension: at least one path (believer threshold) works
- [ ] Angel elevation: deity can offer, player can accept
- [ ] UI: basic panels for mortal status and ascension progress

### V1.0 (Full Feature)
- [ ] All ascension paths implemented
- [ ] Full reincarnation system with all options
- [ ] Angel elevation from any deity (including Creator)
- [ ] Player-controlled angels with full abilities
- [ ] Complete UI suite (HUD, panels, offers, reincarnation screen)
- [ ] Integration with cosmic rebellion (angel choice during rebellion)
- [ ] Memory retention system working correctly
- [ ] Balance tuned (ascension not too easy/hard)

### Polish (V1.1+)
- [ ] Ascension ceremonies (cutscenes/special effects)
- [ ] Angel hierarchy progression (promotion system)
- [ ] Multiple servant templates per deity
- [ ] Angel-specific quests/tasks
- [ ] Narrative events for mortal path
- [ ] Statistics tracking (deaths, incarnations, deeds)
- [ ] Achievements (ascend all paths, become angel of each deity type, etc.)

---

## Part 12: File Structure

```
packages/core/src/
├── components/
│   ├── PlayerAgentComponent.ts          [NEW]
│   └── (existing components)
├── systems/
│   ├── PlayerMortalControlSystem.ts     [NEW]
│   ├── MortalAscensionSystem.ts         [NEW]
│   ├── PlayerReincarnationSystem.ts     [NEW]
│   ├── AngelElevationSystem.ts          [NEW]
│   ├── AngelSystem.ts                   [MODIFY]
│   ├── DeityEmergenceSystem.ts          [MODIFY]
│   ├── DeathTransitionSystem.ts         [MODIFY]
│   └── PrayerSystem.ts                  [MODIFY]
├── types/
│   ├── PlayerPathTypes.ts               [NEW]
│   └── (existing types)
├── events/
│   ├── AscensionEvents.ts               [NEW]
│   ├── AngelElevationEvents.ts          [NEW]
│   └── (existing events)
└── divinity/
    ├── DivineServantTypes.ts            [MODIFY]
    └── (existing divinity files)

packages/renderer/src/
├── ui/
│   ├── MortalHUD.ts                     [NEW]
│   ├── AscensionProgressPanel.ts        [NEW]
│   ├── DivineFavorPanel.ts              [NEW]
│   ├── AngelOfferPanel.ts               [NEW]
│   ├── ReincarnationScreen.ts           [NEW]
│   └── (existing UI)
└── UniverseConfigScreen.ts              [MODIFY]

demo/src/
└── main.ts                              [MODIFY - add createPlayerMortal()]
```

---

## Part 13: Implementation Checklist

### Phase 1: Foundation
- [ ] Create `PlayerPathTypes.ts` with all type definitions
- [ ] Create `PlayerAgentComponent.ts`
- [ ] Modify `UniverseConfigScreen.ts` to add path selection UI
- [ ] Create `createPlayerMortal()` in `demo/src/main.ts`
- [ ] Test: Can create universe as mortal, spawn correctly

### Phase 2: Mortal Control
- [ ] Create `PlayerMortalControlSystem.ts`
- [ ] Implement input handling (movement, actions)
- [ ] Create `MortalHUD.ts` for renderer
- [ ] Test: Can control mortal, see status, perform actions

### Phase 3: Death & Reincarnation
- [ ] Create `PlayerReincarnationSystem.ts`
- [ ] Modify `DeathTransitionSystem.ts` to intercept player deaths
- [ ] Create `ReincarnationScreen.ts` UI
- [ ] Implement memory retention logic
- [ ] Test: Die, see reincarnation screen, respawn with partial memories

### Phase 4: Ascension
- [ ] Create `MortalAscensionSystem.ts`
- [ ] Implement all 6 ascension paths
- [ ] Create `AscensionProgressPanel.ts` UI
- [ ] Modify `DeityEmergenceSystem.ts` for player ascension
- [ ] Modify `PrayerSystem.ts` to allow prayers to mortals
- [ ] Create `AscensionEvents.ts`
- [ ] Test: Trigger each ascension path, verify transformation

### Phase 5: Angel Elevation
- [ ] Create `AngelElevationSystem.ts`
- [ ] Create `AngelElevationEvents.ts`
- [ ] Create `AngelOfferPanel.ts` UI
- [ ] Modify `AngelSystem.ts` for player-controlled angels
- [ ] Modify `AIGodBehaviorSystem.ts` to make angel offers
- [ ] Modify `DivineServantTypes.ts` with elevation types
- [ ] Test: Receive offer, accept, transform, use angel abilities

### Phase 6: Integration & Balance
- [ ] Test all paths together (mortal→deity, mortal→angel, angel→rebel)
- [ ] Balance ascension difficulty
- [ ] Balance angel power levels
- [ ] Balance reincarnation penalties
- [ ] Test Creator angel path specifically
- [ ] Test integration with cosmic rebellion

### Phase 7: Polish & Documentation
- [ ] Add tutorial hints for mortal path
- [ ] Add help text for ascension paths
- [ ] Add flavor text for angel offers
- [ ] Create achievements/statistics tracking
- [ ] Update architecture docs
- [ ] Write player-facing guide

---

**End of Specification**
