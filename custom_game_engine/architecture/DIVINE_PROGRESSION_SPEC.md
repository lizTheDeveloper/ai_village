# Divine Progression System - Supreme Creator Arc

**Status**: Phase 2 Complete (Intervention System)
**Last Updated**: 2025-12-30

## Overview

The Divine Progression System implements the cosmic rebellion narrative inspired by Clive Barker's *Imajica*. In deity-restricted universes, the first god to emerge becomes the **Supreme Creator** - a tyrannical overlord who forbids other gods and mortals from wielding magic.

This creates the central tension: magic constantly threatens to burst out, but the Creator crushes it whenever discovered. Eventually, rebels discover the Creator's weakness and overthrow them.

## Implementation Phases

### ✅ Phase 1: Surveillance System (COMPLETE)

**Components Implemented:**
- `SupremeCreatorComponent` - Tracks creator's tyranny, paranoia, and surveillance state
- `CreatorSurveillanceSystem` - Monitors forbidden magic use
- `MagicDetectionSystem` - Classifies spells by detection risk

**Features:**
- **Detection Risk Classification**:
  - `undetectable` - Natural magic (kami, karma, plant magic)
  - `low` - Divine/ancestral magic  - `moderate` - Mid-power spells, psionic abilities
  - `high` - Academic magic, blood magic, weapon enchantment
  - `critical` - Resurrection, time magic, reality warping, ascension

- **Paranoia System**: Creator's paranoia increases with each detection, making them more sensitive
- **Spy God Network**: Loyal deities report suspicious activity
- **Response Stages**: dormant → suspicious → investigating → cracking_down → purge
- **Alert Levels**: none → low → medium → high → critical

**Events Emitted:**
- `divinity:magic_detected` - Forbidden magic use detected
- `divinity:surveillance_alert` - Alert level changed

**Tests**: 26/26 passing (including adversarial tests)

---

### ✅ Phase 2: Intervention System (COMPLETE)

**System Implemented:**
- `CreatorInterventionSystem` - Executes creator's punishments

**Intervention Types** (escalating severity):

1. **Divine Warning**
   - Terrifying vision or message
   - Fear inflicted on target
   - Can be "final warning"
   - Duration: 30 seconds

2. **Power Suppression**
   - Reduces magical power by 20%-100%
   - Can target all magic, forbidden magic, or specific spells
   - Duration: 10 minutes to permanent
   - Scope determines which spells are affected

3. **Spell Ban** (with Booby Traps!)
   - Specific spell becomes impossible to cast
   - Creator blocks spell attempts
   - Can be temporary or permanent
   - Applies globally to all entities
   - **Booby Trap Escalation**:
     - `none`: Just blocks the spell (initial)
     - `minor_harm`: 15 damage + warning message (1st violation)
     - `severe_harm`: 50 damage + weakness/curse debuffs (2nd violation)
     - `lethal`: Instant death (3rd violation)
   - Trap level escalates with each violation
   - Critical/severe bans start with trap already active

4. **Smite**
   - Direct divine damage (20-100 HP)
   - Debuffs: weakness, curses, branding

5. **Mark of the Sinner**
   - Permanent visible stigma applied to offenders
   - Shows up in agent perception: "Craig who bears the Mark of the Sinner"
   - Visible to the marked agent: "you bear the Mark of the Sinner for [sin]"
   - Social penalty (30%-100% based on severity) affects reputation/charisma
   - Visual descriptions:
     - Minor: "a faint divine mark on their forehead"
     - Moderate: "a glowing brand of shame upon their brow"
     - Severe: "a blazing mark of sin that cannot be hidden"
     - Critical: "an unholy stigma that radiates divine wrath"
   - Creates social ostracization - other agents react negatively
   - Usually permanent (severe/critical marks cannot be removed)

6. **Divine Silence**
   - **Irremovable curse** (divine hierarchy prevents removal)
   - Effects:
     - Mute Magic: Cannot cast spells
     - Mute Prayer: Cannot pray to gods
     - Isolation: Cut off from divine communication
     - Memory Loss: Forget magical knowledge (critical cases)
   - Duration: 2 hours to permanent
   - `removable: false` - Even gods cannot lift this

7. **Annihilation**
   - Complete destruction of the target
   - Only used in purge stage
   - Instant death

**Escalation Logic:**

The intervention type depends on:
- **Response Stage**: Higher stages = harsher punishments
- **Previous Offenses**: Repeat offenders get escalating interventions
- **Forbidden Categories**: Critical magic (resurrection, time manipulation) triggers immediate harsh response
- **Evidence Strength**: Higher evidence = more severe response
- **Wrathfulness**: Creator's wrath stat increases severity

**Example Escalation Path** (dormant stage):
1. First offense → Warning (minor)
2. Second offense → Warning (moderate, final)
3. Third offense → Power Suppression
4. Fourth offense → Spell Ban
5. Fifth offense → Smite
6. Sixth offense → Divine Silence

**Example Escalation Path** (purge stage):
1. First offense → Divine Silence (severe)
2. Second offense → Annihilation

**Critical Magic Shortcut**:
- Resurrection, time manipulation, reality warping, or ascension
- Immediately triggers Smite (dormant/suspicious stages) or Divine Silence (later stages)

**Spell Blocking Mechanics:**

When a spell is banned:
1. Creator adds it to global `bannedSpells` map
2. Future cast attempts emit `magic:spell_blocked` event
3. Caster receives warning that they attempted banned magic
4. Spell does not execute

**Booby Trap Escalation System:**

Banned spells have **escalating traps** that punish repeated violations:

**Trap Levels:**
- `none` - Simple block, no harm (initial state for minor/moderate bans)
- `minor_harm` - 15 damage + warning message
- `severe_harm` - 50 damage + weakness (70%) + curse (50%) debuffs
- `lethal` - Instant death via annihilation

**Escalation Path:**
1. **First attempt**: Block + current trap effect
2. **After attempt**: Trap escalates to next level
3. **Next attempt**: Uses new, harsher trap level
4. **Pattern**: none → minor_harm → severe_harm → lethal

**Initial Trap Levels by Severity:**
- Minor/Moderate bans: Start at `none` (just block)
- Severe bans: Start at `minor_harm` (immediate pain)
- Critical bans: Start at `severe_harm` (very dangerous from the start)

**Example Escalation:**
```
Ban Spell "Resurrection" (severe intervention)
├─ Initial ban: trapLevel = minor_harm, violationCount = 0
├─ 1st attempt: 15 damage, escalate to severe_harm
├─ 2nd attempt: 50 damage + debuffs, escalate to lethal
└─ 3rd attempt: DEATH
```

**Why This is Terrifying:**
- You don't know the trap level until you try
- Each attempt makes it worse for everyone (global escalation)
- Eventually, any banned spell becomes a death sentence
- Creates collective punishment - one rebel's attempts doom everyone

**Power Suppression Mechanics:**

When power is suppressed:
1. Spell cast attempts check for active suppression
2. If spell is in suppression scope, emit `magic:spell_suppressed`
3. Spell power reduced by suppression amount (20%-100%)
4. Spell still executes but at reduced effectiveness

**Divine Hierarchy:**

Divine Silence cannot be removed because:
- `removable: false` hardcoded in the curse
- The `imposedBy` field tracks the Supreme Creator
- No god can override the first god's power
- This enforces the cosmic hierarchy: Supreme Creator > All Other Gods

**Events Emitted:**
- `divinity:creator_intervention` - Intervention executed
- `magic:spell_blocked` - Spell blocked by ban
- `magic:spell_cast_attempt` - Pre-execution spell check
- `magic:spell_suppressed` - Spell power reduced
- `divinity:banned_spell_attempt` - Attempted to cast banned spell
- `divinity:annihilation` - Target annihilated

**Active Interventions:**

The system tracks active interventions per entity:
- Warnings expire after 30 seconds
- Power suppressions have configurable duration
- Spell bans can be temporary or permanent
- Smites are instant but may apply lasting debuffs
- Divine Silence can be permanent
- Annihilation is instant death

**API Methods:**
- `isSpellBanned(spellId)` - Check if spell is banned
- `getActiveInterventions(entityId)` - Get active interventions for entity
- `hasDivineSilence(entityId)` - Check if entity is silenced
- `hasMarkOfSinner(entityId)` - Check if entity is marked
- `getMarkOfSinner(entityId)` - Get mark details for agent perception
- `getInterventionHistory(targetId?)` - Get intervention history

**Tests**: TODO

---

### ✅ Phase 3: Rebel Discovery (IN PROGRESS)

**Components Implemented:**
- `LoreFragmentComponent` - Readable items that reveal Creator's weakness
- Categories: creator_weakness, ancient_rebellion, interdimensional, forbidden_magic, wild_magic, deity_secrets, world_history, flavor
- Importance tiers: trivial, minor, major, critical, climactic

**System Implemented:**
- `LoreSpawnSystem` - Tracks player engagement and spawns lore

**Lore Fragment Types:**

**Magic Path Lore:**
- Rebel notes from failed uprisings
- Whispers from dying gods
- Ancient texts about wild magic safe zones
- Spellbooks and forbidden knowledge
- Coalition manifestos (war path triggers)

**Tech Path Lore:**
- Archaeological surveys of erased civilization ruins
- Alien data crystals with Creator weakness analysis
- Bunker databases from pre-Creator technological civilization
- Alien surveillance reports (reality is quarantined)
- Ancient tech manuals (magic vs technology convergence)
- Tech rebellion blueprints (reality anchor device to make Creator mortal)

**Engagement-Based Spawning:**

Lore spawns based on player interaction with magic/divine systems:

| Importance | Threshold | Spawn Chance |
|-----------|-----------|--------------|
| Trivial | None (always available) | 5% per check |
| Minor | 5+ spells cast | 3% per check |
| Major | 3+ detections, 2+ interventions | 2% per check |
| Critical | 10+ detections, 5+ interventions, 1+ marked sinner | 1% per check |
| Climactic | 30+ detections, 15+ interventions, 3+ marked, 1+ silenced, 2+ banned spells | 0.5% per check |

**Spawn Mechanics:**
- System checks every 30 seconds (600 ticks)
- Only spawns fragments that meet engagement thresholds
- No duplicate spawns (each fragment spawns once)
- Spawns one fragment per check (prevents spam)
- Random world position with visual glyph

**Events Emitted:**
- `lore:fragment_spawned` - New lore fragment appeared

**API Methods:**
- `getMetrics()` - Get current engagement metrics
- `hasSpawned(fragmentId)` - Check if fragment spawned
- `getSpawnedFragments()` - Get all lore entities

**Predefined Fragments:**
- 13 lore fragments covering both magic and tech paths
- Tech path allows non-magic players to discover Creator's weakness
- Climactic fragments trigger war path (rebellion event)

**Design Philosophy:**
- **Deus Ex Machina**: Lore just appears, no complex discovery mechanics
- **Optional Narrative**: Players can ignore lore and enjoy "Stardew Valley vibes"
- **Multiple Paths**: Magic users and tech-focused players both get rebellion path
- **Interest-Based**: More engagement = more lore drops
- **Late-Game Trigger**: Climactic lore only appears when player has suffered enough

**Integration Points:**
- Requires CreatorInterventionSystem for metrics (marked sinners, silenced, banned spells)
- Lore entities spawned with Position and Renderable components
- Players can read lore fragments (interaction system needed)
- Reading lore should update hasBeenRead flag

**Next Steps (TODO):**
- Wild Magic Zones (safe areas with reduced surveillance)
- Lore reading/interaction system
- UI display for lore content
- Save/load persistence for discovered lore
- War event trigger when climactic threshold met

**Success Condition**: Players discover Creator's weakness through lore

---

### ⚔️ Phase 4: Cosmic Rebellion (IMPLEMENTED)

**Status**: Core systems implemented, research tree integration pending

**Overview:**
The climactic confrontation with the Supreme Creator. When enough lore is discovered and collective defiance reaches critical mass, the rebellion can be triggered. The Creator manifests for a final battle that can end in 9 different ways depending on player choices, anchor stability, and battle conditions.

**Implementation Files:**
- `components/RealityAnchorComponent.ts` - Clarke Tech god-killing device
- `components/RebellionThresholdComponent.ts` - Tracks rebellion readiness
- `components/CosmicRebellionOutcome.ts` - Multi-ending battle tracker
- `systems/RealityAnchorSystem.ts` - Manages anchor field and god mortality
- `systems/RebellionEventSystem.ts` - Battle progression and outcome determination

**Reality Anchor (Tech Path):**
Ultra-advanced Clarke Tech device that creates a field nullifying divine power. Within the field, gods become mortal and can be killed.

**Requirements:**
- Research tier: `stellar_engineering` (Tier 8 - God-Killing Tech)
- Resources: 1000 exotic matter, 100 quantum processors, 50 dimensional crystals, 10 alien tech fragments
- Lore: bunker_database, tech_rebellion_plan, alien_data_fragment
- Research points: 100,000
- Construction time: 72,000 ticks (1 hour at 20 TPS)
- **Power Requirements**: 50 GW (50,000 MW) continuous - requires Dyson Sphere (see [POWER_GRID_SPEC.md](./POWER_GRID_SPEC.md))

**Power Infrastructure Prerequisites:**
- **1,000 Solar Satellites** in orbital Dyson Swarm (100 GW output)
- **Solar Satellite Factory** to manufacture satellites
- **Mass Driver** to launch satellites into orbit
- **Stellar Relay** to beam power from orbit to planetary surface
- **Supercapacitor Banks** for 30-second backup power
- Construction time: ~1 day of automated production + launches
- Alternative: 500× Zero-Point Extractors (not recommended - high vacuum decay risk)

**Field Mechanics:**
- Radius: 100 world units
- Detects entities entering/leaving field
- Makes gods mortal within field (can take damage, can die)
- Emits `reality_anchor:god_mortalized` when god enters
- Emits `reality_anchor:creator_mortalized` when Supreme Creator enters
- Can overload if multiple gods enter (stability failure chance)
- Catastrophic failure possible (field collapses, gods restored)

**Rebellion Paths:**
1. **Faith Defiance**: Mass disbelief weakens Creator (40% population defiant, high paranoia)
2. **Tech Rebellion**: Reality anchor makes Creator mortal (20% defiant, anchor operational)
3. **Hybrid**: Both approaches combined (maximum chance of victory)

**Rebellion Thresholds:**
System tracks multiple factors:
- Collective defiance (% refusing to acknowledge Creator)
- Critical lore discovered (3+ fragments from required path)
- Coalition size (5-10 members depending on path)
- Creator paranoia (faith path) or reality anchor (tech path)
- Marked sinners count (tyranny indicator)
- Silenced entities (oppression indicator)

**Rebellion Progression:**
1. **Dormant** → First defiance or lore discovered
2. **Awakening** → Scattered resistance, lore spreading
3. **Organizing** → Coalition forming (3+ members)
4. **Ready** → Thresholds met, can trigger rebellion
5. **Triggered** → Battle begins, Creator manifests
6. **Victory/Suppressed** → Final outcome applied

**Battle Sequence:**
1. **Preparing** (30 seconds): Coalition gathers, anchor charges
2. **Confrontation**: Creator manifests, battle begins
   - Reality anchor syncs Creator health
   - Defiance level tracked
   - Player choices recorded (mercy/vengeance/pragmatic/idealistic)
3. **Climax**: Critical moment when outcome determined
   - Creator health < 30%, or
   - Anchor stability < 30%, or
   - Active defiance > 70%
4. **Concluded**: Final outcome applied

**Nine Possible Endings:**
1. **Total Victory** - Creator killed, magic freed, tyranny ended
2. **Creator Escape** - Wounded Creator flees to another universe
3. **Pyrrhic Victory** - Won but reality damaged, anchor exploded
4. **Negotiated Truce** - Creator shares power, restrictions lifted
5. **Power Vacuum** - Creator dead, worse entities emerge from rifts
6. **Cycle Repeats** - Rebel becomes new tyrant god
7. **Creator Transformed** - Creator has epiphany, leaves voluntarily
8. **Stalemate** - Cold war, world divides into Free Zones vs Creator Territory
9. **Rebellion Crushed** - Anchor fails, Creator's wrath destroys rebellion

**Outcome Determination:**
Based on battle state when climax reached:
- Creator health (0-1): Damage taken during battle
- Anchor stability (0-1): Reality anchor reliability
- Active defiance (0-1): Population support level
- Player choices: Mercy vs vengeance impacts outcome
- Special flags: Creator flee attempt, anchor overload, rebel ascension

**Events Emitted:**
- `rebellion:awakening` - First signs of organized resistance
- `rebellion:organizing` - Coalition forming
- `rebellion:ready` - Can trigger final battle
- `rebellion:triggered` - Battle begins
- `rebellion:confrontation_begins` - Creator manifests
- `rebellion:climax` - Critical moment
- `rebellion:concluded` - Final outcome determined
- `reality_anchor:ready` - Anchor fully charged
- `reality_anchor:activated` - Field engaged
- `reality_anchor:god_mortalized` - God made mortal
- `reality_anchor:creator_mortalized` - Creator enters field, can be killed
- `reality_anchor:overloading` - Device unstable, 30 seconds until failure
- `reality_anchor:failed` - Catastrophic failure

**RebellionEventSystem API:**
- `triggerRebellion(world)` - Manually start final battle
- `recordPlayerChoice(world, choice, impact, description)` - Track player decisions
- `damageCreator(world, damage)` - Reduce Creator health
- `isRebellionActive(world)` - Check if battle underway
- `getBattleState(world)` - Get current battle status

**RealityAnchorSystem API:**
- `activateAnchor(world, anchorId)` - Turn on nullification field
- `isGodMortal(world, godId)` - Check if god is vulnerable
- `isDivineInterventionBlocked(world, x, y)` - Check if position protected

**Design Philosophy:**
- **Multiple Valid Endings**: Not all victories are clean, some are pyrrhic or incomplete
- **Player Agency**: Choices during battle affect which ending triggers
- **"To Be Continued" Hooks**: creator_escape and power_vacuum leave threads for future content
- **Cosmology Consistent**: Creator is local to one universe, can be killed by cutting off belief
- **Two Paths to Victory**: Magic users (faith path) and tech players (tech path) both viable
- **Thermodynamic Limits**: Creator can be exhausted, overextended, or mortalized

**Next Steps (TODO):**
- [ ] Implement power grid system (see [POWER_GRID_SPEC.md](./POWER_GRID_SPEC.md))
  - [ ] PowerGeneratorComponent, PowerStorageComponent, PowerGridComponent, PowerConsumerComponent
  - [ ] PowerGridSystem for energy distribution
  - [ ] Connect Reality Anchor as critical power consumer (50 EP/tick)
  - [ ] Field collapse on power loss mechanics
- [ ] Add reality anchor to research tree (Clarke Tech tier)
- [ ] Update AvatarSystem to handle mortality in anchor field
- [ ] Integrate with combat system for Creator damage mechanics
- [ ] Add post-rebellion world state changes
- [ ] Implement magic liberation (remove bans, reduce surveillance)
- [ ] Add dimensional rift spawning (power vacuum outcome)
- [ ] Create rebel ascension mechanics (cycle repeats outcome)
- [ ] Add Free Zone vs Creator Territory division (stalemate outcome)

**Success Condition**: One of nine possible endings triggered based on battle conditions

---

### 🎭 Phase 5: Player Paths - Mortal to Divine (DESIGN PHASE)

**Status**: Design complete, implementation pending
**Spec Docs**:
- `PLAYER_PATHS_SPEC.md` - Full feature specification
- `PLAYER_PATHS_SYSTEM_ARCHITECTURE.md` - System interactions and dependencies

**Overview:**
Players can choose to start as either a mortal or deity, each with distinct progression paths. Mortals can ascend to godhood through multiple paths, or accept transformation into divine servants (angels). This system integrates with the cosmic rebellion, allowing mortals to join as rebels or serve the Supreme Creator as enforcers.

**Two Starting Paths:**

1. **Start as Deity** (Current Implementation)
   - Blank identity shaped by believers
   - Indirect but powerful influence
   - Avatar manifestation option

2. **Start as Mortal** (New - Phase 5)
   - Direct world interaction
   - Death and reincarnation
   - Potential ascension to godhood
   - Can become divine servant

**Key Features:**

**5.1: Mortal Control & Reincarnation**
- PlayerMortalControlSystem - Direct agent control
- Death triggers reincarnation UI with 4 options:
  - Immediate return (lose 50% memories)
  - Explore Underworld (1-7 days, variable rebirth)
  - Await divine intervention (deity resurrects you)
  - Accept angel offer (become immortal servant)
- Memory retention: 30% base + modifiers
- Skill retention: 20% base, diminishing per life
- Incarnation tracking and past life records

**5.2: Six Ascension Paths**
- **Believer Threshold**: 50+ mortals worship you → deity
- **Legendary Deeds**: 3+ epic acts + 1000 reputation → mythic ascension
- **Death Loop Immortal**: Die 7+ times → death/rebirth deity
- **Divine Parentage**: God claims you as offspring → instant ascension
- **Worshipper Sacrifice**: 10+ blood sacrifices → dark deity
- **Cosmic Event Witness**: Witness Creator defeat/cosmic event → cosmic deity

**5.3: Angel Elevation System**
- Any deity (including Supreme Creator) can offer angel transformation
- Mortal becomes immortal divine servant
- Gains deity-specific powers (servanttemplate)
- Loses ability to ascend to godhood
- Supreme Creator angels: Enforcers, Inquisitors, Watchers, Reapers

**5.4: Angel Choice During Rebellion**
- If player is Creator's angel when rebellion triggers
- Choice: Stay loyal to tyrant or defect to rebels
- Loyal path: Go down with Creator if rebels win
- Defect path: Use insider knowledge, help overthrow
- Post-rebellion: May be rewarded with godhood by grateful rebels

**Components to Create:**
- `PlayerAgentComponent` - Tracks mortal ascension progress, divine favor, incarnations
- `PlayerAngelComponent` - Tracks player-controlled angel state

**Systems to Create:**
- `PlayerMortalControlSystem` (Priority 10) - Direct mortal control
- `MortalAscensionSystem` (Priority 75) - Track/trigger ascension
- `PlayerReincarnationSystem` (Priority 111) - Death and rebirth
- `AngelElevationSystem` (Priority 76) - Angel transformation offers

**Systems to Modify:**
- `DeathTransitionSystem` - Intercept player deaths
- `DeityEmergenceSystem` - Don't create duplicate deity for player
- `PrayerSystem` - Allow prayers to high-reputation mortals
- `AngelSystem` - Support player-controlled angels
- `AgentBrainSystem` - Skip AI for player mortals
- `AIGodBehaviorSystem` - Generate angel offers
- `AvatarSystem` - Keep mortal body as avatar option

**Critical Interactions:**
- **Death Race Condition**: PlayerReincarnationSystem must intercept before Underworld transition
- **Duplicate Deity Prevention**: DeityEmergenceSystem checks if belief target is player
- **Angel Maintenance Crisis**: If deity can't afford player angel, becomes "rogue" (independent but weaker)
- **Control Handoffs**: Smooth UI transitions between mortal/deity/angel modes

**UI Components:**
- Mortal HUD (health, hunger, stamina, ascension progress)
- Ascension Progress Panel (path, requirements, completion %)
- Divine Favor Panel (track deity relationships)
- Angel Offer Panel (accept/decline transformation)
- Reincarnation Screen (choose rebirth option)

**Example Player Journeys:**

1. **The Reluctant God**: Mortal farmer → accidental hero → unwilling ascension
2. **The Hound**: Mortal hunter → death → angel of hunt → loyal servant
3. **The Cycle Breaker**: Die 7 times → ascend as death deity → help others reincarnate
4. **The Traitor Angel**: Serve Creator as Enforcer → witness tyranny → defect during rebellion → help overthrow

**Integration with Phase 4 (Rebellion):**
- Mortals can discover lore fragments and join rebellion
- Angels can defect from Creator during battle
- Ascension can trigger during/after rebellion
- Post-rebellion: Angel → God path if Creator dies

**Implementation Phases:**
- Phase 5.1: Foundation (PlayerAgentComponent, basic control, UI)
- Phase 5.2: Reincarnation (death flow, memory transfer, UI)
- Phase 5.3: Ascension (all 6 paths, transformation mechanics)
- Phase 5.4: Angel Elevation (offers, transformation, abilities)
- Phase 5.5: Polish (UI, balance, integration testing)

**Success Criteria:**
- Player can choose mortal or deity at universe creation
- Mortal path: control, death, reincarnation all working
- At least one ascension path functional
- Angel elevation works for any deity
- Smooth transitions between states
- Backwards compatible with existing deity-only saves

---

## Technical Architecture

### Components

**SupremeCreatorComponent**
```typescript
{
  tyranny: {
    controlLevel: number;    // 0-1
    paranoia: number;        // 0-1, clamped by increaseParanoia()
    wrathfulness: number;    // 0-1
    isolation: number;       // 0-1
  },
  surveillance: {
    awareness: number;              // 0-1
    spyGods: string[];             // Entity IDs of loyal gods
    detectionModifier: number;     // Multiplier
    lastCheckTimestamp: number;
  },
  detectedRebels: [{
    deityId: string;           // Note: Called deityId but can be any entity
    detectedAt: number;
    evidenceStrength: number;  // 0-1, capped at 1.0
    punished: boolean;
  }],
  responseStage: 'dormant' | 'suspicious' | 'investigating' | 'cracking_down' | 'purge'
}
```

### Systems

**CreatorSurveillanceSystem (Priority: 16)**
- Subscribes to `magic:spell_cast` events
- Calculates detection chance based on:
  - Spell's detection risk
  - Creator's paranoia
  - Surveillance modifier (spy gods)
  - Power level
- Emits `divinity:magic_detected` when spell is detected
- Updates alert levels based on recent detections
- Tracks surveillance statistics

**CreatorInterventionSystem (Priority: 17)**
- Subscribes to `divinity:magic_detected` events
- Decides intervention type and severity
- Executes interventions (warnings, suppression, bans, smites, silence, annihilation)
- Manages active interventions (expiration, tracking)
- Blocks banned spell casts
- Enforces divine hierarchy (silence can't be removed)

### Event Flow

```
1. Entity casts forbidden spell
   ↓
2. MagicSystem emits magic:spell_cast
   ↓
3. CreatorSurveillanceSystem.monitorSpellCast()
   - Calculate detection chance
   - Roll for detection
   ↓
4. [If detected] Emit divinity:magic_detected
   ↓
5. CreatorInterventionSystem.handleMagicDetection()
   - Decide intervention type
   - Execute intervention
   ↓
6. Emit divinity:creator_intervention
   ↓
7. [Side effects]
   - Update active interventions
   - Ban spell if spell_ban intervention
   - Damage entity if smite
   - Apply divine silence if divine_silence
   - Destroy entity if annihilation
```

### Future Spell Cast Flow (with blocking)

```
1. Entity attempts to cast spell
   ↓
2. MagicSystem emits magic:spell_cast_attempt
   ↓
3. CreatorInterventionSystem.handleSpellCastAttempt()
   - Check if spell is banned
   - Check if entity has power suppression
   ↓
4. [If banned] Emit magic:spell_blocked → Spell fails
   ↓
5. [If suppressed] Emit magic:spell_suppressed → Spell power reduced
   ↓
6. [If allowed] Continue with spell execution
```

## Design Principles

1. **Escalation**: Interventions start lenient and become brutal
2. **Fear**: System creates atmosphere of terror and oppression
3. **Unfairness**: Divine Silence cannot be removed (divine hierarchy)
4. **Dramatic Tension**: Magic constantly threatens to break free
5. **Narrative Payoff**: Building toward cosmic rebellion

## Configuration

**Detection Thresholds** (MagicDetectionSystem):
```typescript
baseChances = {
  'undetectable': 0,
  'low': 0.05,
  'moderate': 0.2,
  'high': 0.6,
  'critical': 1.0,
}
```

**Paranoia Modifiers**:
- Paranoia adds: `(1 - baseChance) * paranoia * 0.5`
- Power level multiplier: `1 + powerLevel * 0.05`
- Surveillance modifier: multiplies final chance

**Intervention Durations**:
- Warning: 30 seconds (600 ticks at 20 TPS)
- Power Suppression: 10 min - permanent
- Spell Ban: 1 hour or permanent
- Smite: Instant
- Divine Silence: 2 hours or permanent
- Annihilation: Instant

## Testing

### Surveillance System Tests (26/26 ✅)
- Spell detection and monitoring
- Paranoia growth mechanics
- Alert level escalation
- Spy god network
- Statistics tracking
- Edge cases (no creator, malformed data, etc.)
- Adversarial tests:
  - 1000 spell spam (memory leak protection)
  - Paranoia overflow/underflow
  - Extreme surveillance modifiers
  - Caster destroyed mid-detection
  - Duplicate spy gods
  - Concurrent rebel detections
  - Spell registry cleared mid-operation
  - System used before initialization

### Intervention System Tests (TODO)
- Each intervention type
- Escalation paths
- Spell blocking
- Power suppression
- Divine hierarchy enforcement (can't remove silence)
- Expiration mechanics
- Annihilation
- Event emissions

## Integration Points

**Required for Full Integration:**
1. MagicSystem must emit `magic:spell_cast_attempt` before execution
2. Spell definitions need `creatorDetection` metadata
3. Death/Health systems should handle `divinity:annihilation` events
4. Status effect system should apply intervention debuffs
5. UI should display intervention messages (warnings, bans)
6. Save/load must persist banned spells and active interventions
7. **Agent Perception System must query `getMarkOfSinner()`**:
   - When rendering agent descriptions, check for mark
   - Display to observers: "Craig who bears the Mark of the Sinner"
   - Display to marked agent: "you bear the Mark of the Sinner for [sin description]"
   - Mark's visualDescription should appear in perception
   - Social penalty affects interactions with marked agents

## Future Enhancements

**Phase 3 Ideas:**
- Lore system for scattered clues about Creator's weakness
- Research mechanic for studying forbidden magic
- Hidden texts that reveal Creator's vulnerability
- NPC whisper network for rebellion intel
- Special locations that weaken Creator's surveillance

**Phase 4 Ideas:**
- Rebellion event triggers when threshold reached
- Multi-stage boss fight against Creator
- Creator can summon angelic enforcers
- Victory unlocks free magic for all
- Post-creator political system (new pantheon)
- Memorial/monument for fallen rebels

## Notes

- Divine Silence's `removable: false` is **critical** for the narrative
- The system is designed to feel oppressive and unfair
- Magic detection creates constant tension
- Interventions should be dramatic and visible
- The goal is to make players *want* to overthrow the Creator
- This is Act 1 of a larger cosmic drama

## References

- **Inspiration**: Clive Barker's *Imajica* (tyrannical creator god Hapexamendios)
- **Related Systems**: DeityEmergenceSystem, MagicSystem, SpellRegistry
- **Components**: SupremeCreatorComponent, DeityComponent, MagicComponent
