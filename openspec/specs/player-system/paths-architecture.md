> **System:** player-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Player Paths System Architecture

**Related Spec**: PLAYER_PATHS_SPEC.md
**Status**: PRE-IMPLEMENTATION
**Last Updated**: 2025-12-30

---

## New Systems Required

### 1. PlayerMortalControlSystem
**Priority**: 10 (very early)
**Type**: Input/Control System
**Purpose**: Handle player input for mortal agent control

```typescript
class PlayerMortalControlSystem {
  // Intercepts input before AgentBrainSystem
  // Translates keyboard/mouse to agent actions
  // Only active when player controls a mortal
}
```

**Dependencies**:
- **Reads**: PlayerAgentComponent, PositionComponent, InventoryComponent, BodyComponent
- **Writes**: MovementComponent, ActionQueueComponent (if exists)
- **Events Emitted**: `player_mortal_action`, `player_mortal_moved`

---

### 2. MortalAscensionSystem
**Priority**: 75 (after belief/faith systems)
**Type**: Progression System
**Purpose**: Track ascension conditions and trigger deity transformation

```typescript
class MortalAscensionSystem {
  // Monitors ascension progress
  // Checks triggers for each path
  // Orchestrates mortal→deity transformation
}
```

**Dependencies**:
- **Reads**: PlayerAgentComponent, SpiritualComponent, IdentityComponent
- **Writes**: DeityComponent (creates), PlayerAgentComponent (removes or modifies)
- **Events Emitted**: `ascension_triggered`, `ascension_completed`, `ascension_path_progress`
- **Events Consumed**: `legendary_deed_performed`, `prayer_received`, `player_mortal_death`

---

### 3. PlayerReincarnationSystem
**Priority**: 111 (after death detection)
**Type**: Lifecycle System
**Purpose**: Handle player mortal death and rebirth

```typescript
class PlayerReincarnationSystem {
  // Detects player mortal death
  // Presents reincarnation UI
  // Creates new mortal body with memory transfer
}
```

**Dependencies**:
- **Reads**: PlayerAgentComponent, IdentityComponent, SkillsComponent, MemoryComponent
- **Writes**: New entity with PlayerAgentComponent, modified stats/memories
- **Events Emitted**: `player_mortal_died`, `reincarnation_chosen`, `reincarnation_completed`
- **Events Consumed**: `needs_health_zero`, `entity_died`

---

### 4. AngelElevationSystem
**Priority**: 76 (after angel systems)
**Type**: Transformation System
**Purpose**: Handle deity offers to transform mortals into angels

```typescript
class AngelElevationSystem {
  // Generates angel offers from deities
  // Presents offers to player
  // Transforms mortal→angel on acceptance
}
```

**Dependencies**:
- **Reads**: DeityComponent, PlayerAgentComponent, SpiritualComponent
- **Writes**: DivineServantComponent (creates), PlayerAgentComponent (modifies)
- **Events Emitted**: `angel_offer_made`, `angel_offer_accepted`, `angel_offer_declined`, `mortal_elevated`
- **Events Consumed**: `high_faith_detected`, `deity_needs_servant`, `player_mortal_died`

---

## Existing Systems Modified

### DeathTransitionSystem (MODIFY)
**Current Purpose**: Send dead entities to Underworld
**Changes Needed**:
- Check for PlayerAgentComponent before standard death flow
- Intercept player deaths → trigger PlayerReincarnationSystem
- Allow angel offers during death sequence
- Special handling for player angels (deity link)

```typescript
// BEFORE
if (isDead) {
  transitionToRealm(entityId, 'underworld', 'death');
}

// AFTER
if (isDead) {
  const playerAgent = entity.getComponent('player_agent');
  if (playerAgent) {
    // Trigger PlayerReincarnationSystem instead
    eventBus.emit('player_mortal_died', { entityId, ... });
  } else {
    transitionToRealm(entityId, 'underworld', 'death');
  }
}
```

---

### DeityEmergenceSystem (MODIFY)
**Current Purpose**: Create new deities from collective belief
**Changes Needed**:
- Check if emerging deity is player mortal
- If player mortal has believer threshold, trigger MortalAscensionSystem
- Don't create duplicate deity for player

```typescript
// BEFORE
if (beliefPattern.totalBelief >= threshold) {
  createNewDeity(beliefPattern);
}

// AFTER
if (beliefPattern.totalBelief >= threshold) {
  // Check if beliefs target a player mortal
  const targetEntity = findBeliefTarget(beliefPattern);
  if (targetEntity?.hasComponent('player_agent')) {
    eventBus.emit('ascension_triggered', {
      mortalId: targetEntity.id,
      path: 'believer_threshold'
    });
  } else {
    createNewDeity(beliefPattern);
  }
}
```

---

### PrayerSystem (MODIFY)
**Current Purpose**: Handle mortal prayers to deities
**Changes Needed**:
- Allow prayers to entities with PlayerAgentComponent (high reputation mortals)
- Track prayer count for ascension progress
- Different prayer handling for mortal vs deity targets

```typescript
// AFTER
function handlePrayer(prayer: Prayer) {
  const target = world.getEntity(prayer.targetId);

  if (target.hasComponent('deity')) {
    // Existing deity prayer handling
    addToDeityPrayerQueue(prayer);
  } else if (target.hasComponent('player_agent')) {
    // NEW: Prayer to mortal (proto-deity worship)
    incrementBelieverCount(target);
    eventBus.emit('prayer_to_mortal', prayer);
  }
}
```

---

### AngelSystem (MODIFY)
**Current Purpose**: Manage AI-controlled angels
**Changes Needed**:
- Support player-controlled angels
- Skip autonomous AI for player angels
- Still charge maintenance to deity

```typescript
// BEFORE
function updateAngel(angel: AngelData) {
  if (angel.autonomousAI) {
    runAngelAI(angel);
  }
}

// AFTER
function updateAngel(angel: AngelData) {
  if (angel.isPlayerControlled) {
    // Skip AI, player controls this angel
    // But still charge maintenance to deity
    chargeMaintenance(angel);
  } else if (angel.autonomousAI) {
    runAngelAI(angel);
  }
}
```

---

### AgentBrainSystem (MODIFY)
**Current Purpose**: LLM-based decision making for agents
**Changes Needed**:
- Skip processing for entities with PlayerAgentComponent
- Let PlayerMortalControlSystem handle instead

```typescript
// BEFORE
for (const agent of agents) {
  const decision = await llm.getDecision(agent);
  executeDecision(agent, decision);
}

// AFTER
for (const agent of agents) {
  if (agent.hasComponent('player_agent')) {
    // Skip - player controls this agent
    continue;
  }
  const decision = await llm.getDecision(agent);
  executeDecision(agent, decision);
}
```

---

### AIGodBehaviorSystem (MODIFY)
**Current Purpose**: LLM-based decision making for AI deities
**Changes Needed**:
- Add logic to make angel offers to worthy mortals
- Consider player mortal for elevation
- Especially Supreme Creator looking for enforcers

```typescript
// NEW BEHAVIOR
function considerAngelElevation(deity: DeityComponent) {
  // Find worthy mortals
  const mortals = findHighFaithMortals(deity);

  for (const mortal of mortals) {
    if (shouldOfferElevation(deity, mortal)) {
      makeAngelOffer(deity.id, mortal.id);
    }
  }
}
```

---

### AvatarSystem (MODIFY)
**Current Purpose**: Manage deity avatar manifestations
**Changes Needed**:
- When mortal ascends, optionally keep mortal body as avatar
- No belief cost for this "first avatar"
- Link original body to new deity

```typescript
// NEW OPTION
function ascendMortal(mortalId: string, keepBody: boolean) {
  const deity = createDeityFromMortal(mortalId);

  if (keepBody) {
    // Convert mortal body to avatar (no cost)
    const avatar = convertMortalBodyToAvatar(mortalId, deity.id);
    deity.avatarEntityId = avatar.id;
    deity.avatarActive = true;
  }
}
```

---

## System Interaction Map

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER INPUT LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  Keyboard/Mouse Input                                       │
│         ↓                                                   │
│  PlayerMortalControlSystem ←──┐                            │
│         ↓                      │                            │
│  Movement/Action Queue         │                            │
└────────────────────────────────┼────────────────────────────┘
                                 │
                                 │ (if player not controlling)
                                 │
┌────────────────────────────────┼────────────────────────────┐
│                    AGENT LAYER │                            │
├────────────────────────────────┼────────────────────────────┤
│  AgentBrainSystem              │                            │
│  (skips PlayerAgentComponent) ─┘                            │
│         ↓                                                   │
│  NeedsSystem → DeathTransitionSystem                        │
│                      ↓                                      │
│                [Check PlayerAgentComponent]                 │
│                      ↓                                      │
│         ┌────────────┴───────────┐                         │
│         │                        │                         │
│    Player Mortal?           Regular Agent?                 │
│         │                        │                         │
│         ↓                        ↓                         │
│  PlayerReincarnationSystem   Underworld                    │
│         ↓                                                   │
│  [Reincarnation UI]                                        │
│         ↓                                                   │
│  ┌──────┴───────┬──────────┬──────────┐                   │
│  │              │          │          │                    │
│  Immediate   Explore   Divine   Accept Angel              │
│  Return      Underworld Intervention  Offer               │
│  │              │          │          │                    │
│  └──────┬───────┴──────────┘          │                    │
│         ↓                              ↓                    │
│  New Mortal Body              AngelElevationSystem         │
│  (with memories)                      ↓                    │
│                              Angel Transformation          │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────┼────────────────────────────┐
│                  ASCENSION LAYER│                           │
├────────────────────────────────┼────────────────────────────┤
│  MortalAscensionSystem         │                            │
│         ↓                      │                            │
│  [Monitors Triggers:]          │                            │
│  • BeliefFormationSystem ──────┤                            │
│  • PrayerSystem (to mortals) ──┤                            │
│  • LegendaryDeeds tracker ─────┤                            │
│  • Death count (reincarnations)┤                            │
│  • Divine parentage claims ────┤                            │
│         ↓                      │                            │
│  [Threshold Reached]           │                            │
│         ↓                      │                            │
│  Transform: Mortal → Deity     │                            │
│         ↓                      │                            │
│  Optional: Keep body as avatar │                            │
│         ↓                      │                            │
│  DeityEmergenceSystem          │                            │
│  (bypassed for player)         │                            │
└────────────────────────────────┼────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────┼────────────────────────────┐
│                   DEITY LAYER  │                            │
├────────────────────────────────┼────────────────────────────┤
│  AIGodBehaviorSystem           │                            │
│         ↓                      │                            │
│  [AI Deities Consider:]        │                            │
│  • Making angel offers ────────┼──→ AngelElevationSystem   │
│  • Recruiting player mortal    │                            │
│  • Supreme Creator enforcers   │                            │
│         ↓                                                   │
│  AngelSystem                                                │
│         ↓                                                   │
│  [Check if player-controlled]                               │
│         │                                                   │
│    ┌────┴─────┐                                            │
│    │          │                                            │
│  Player?   AI Angel?                                       │
│    │          │                                            │
│    ↓          ↓                                            │
│  Skip AI   Run AI                                          │
│  (player   (autonomous)                                    │
│  controls)                                                 │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────┼────────────────────────────┐
│              REBELLION LAYER   │                            │
├────────────────────────────────┼────────────────────────────┤
│  CreatorSurveillanceSystem     │                            │
│         ↓                      │                            │
│  [Detects player actions]      │                            │
│  • As mortal rebel             │                            │
│  • As deity rebel              │                            │
│  • As Creator's angel          │                            │
│         ↓                      │                            │
│  RebellionEventSystem          │                            │
│         ↓                      │                            │
│  [Player Choice if Angel:]     │                            │
│  • Stay loyal to Creator       │                            │
│  • Defect to rebels            │                            │
│         ↓                      │                            │
│  Consequences                  │                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### Example 1: Mortal Death → Reincarnation

```
1. NeedsSystem: health <= 0
2. DeathTransitionSystem: Detect death
3. Check: entity.hasComponent('player_agent') → TRUE
4. Emit: 'player_mortal_died' event
5. PlayerReincarnationSystem: Catch event
6. UI: Show ReincarnationScreen
7. Player: Choose "Immediate Return"
8. PlayerReincarnationSystem:
   - Extract 30% of memories
   - Create new entity with PlayerAgentComponent
   - Transfer memories, partial skills
   - Spawn at settlement
9. PlayerMortalControlSystem: Resume control of new body
```

---

### Example 2: Believer Threshold Ascension

```
1. Mortals pray to player mortal (via PrayerSystem)
2. PrayerSystem: Increment believer count
3. BeliefFormationSystem: Track collective belief
4. MortalAscensionSystem: Monitor believer count
5. Threshold: believerCount >= 50
6. MortalAscensionSystem:
   - Emit 'ascension_triggered' event
   - Show ascension UI
   - Player chooses: Keep mortal body as avatar?
7. Transform:
   - Create DeityComponent
   - Remove or modify PlayerAgentComponent
   - If keeping body: Convert to AvatarComponent
8. DeityEmergenceSystem: Bypassed (player already deity)
9. Player now controls deity (existing UI)
```

---

### Example 3: Angel Offer → Acceptance

```
1. AIGodBehaviorSystem: Supreme Creator needs enforcer
2. Scan mortals: Find player mortal (high faith)
3. AngelElevationSystem:
   - Generate angel offer
   - Emit 'angel_offer_made' event
4. UI: Show AngelOfferPanel
5. Player: Click "Accept"
6. AngelElevationSystem:
   - Create DivineServantComponent
   - Apply servant template (Enforcer)
   - Link to Creator deity
   - Grant abilities (smite rebels, detect magic)
7. Remove PlayerAgentComponent, add PlayerAngelComponent
8. AngelSystem: Manage player angel
   - Skip AI (isPlayerControlled = true)
   - Charge maintenance to Creator
9. Player now controls immortal enforcer
```

---

### Example 4: Angel Defection During Rebellion

```
1. Player is Creator's Enforcer (angel)
2. RebellionEventSystem: Cosmic rebellion triggered
3. PlayerAngelComponent: Receive choice event
4. UI: Show rebellion choice dialog
   - "Stay loyal to Creator"
   - "Defect to rebels"
5. Player: Choose "Defect to rebels"
6. AngelElevationSystem:
   - Sever link to Creator
   - Creator becomes hostile
   - Add to rebel coalition
7. RebellionEventSystem:
   - Player fights on rebel side
   - Insider knowledge bonus
8. Outcome: If rebels win
   - Player survives (not tied to Creator)
   - May be rewarded with godhood by grateful rebels
```

---

## Event Dependencies

### Events Emitted (New)

| Event | Emitted By | Consumed By |
|-------|-----------|-------------|
| `player_mortal_action` | PlayerMortalControlSystem | MetricsSystem, UI |
| `player_mortal_moved` | PlayerMortalControlSystem | MapRenderer, UI |
| `player_mortal_died` | DeathTransitionSystem | PlayerReincarnationSystem, UI |
| `reincarnation_chosen` | PlayerReincarnationSystem | MetricsSystem, Achievements |
| `reincarnation_completed` | PlayerReincarnationSystem | UI, AutoSaveSystem |
| `ascension_triggered` | MortalAscensionSystem | UI, DeityEmergenceSystem |
| `ascension_completed` | MortalAscensionSystem | MetricsSystem, MythGenerationSystem |
| `ascension_path_progress` | MortalAscensionSystem | UI (progress bar) |
| `angel_offer_made` | AngelElevationSystem | UI (offer panel) |
| `angel_offer_accepted` | AngelElevationSystem | AngelSystem, MetricsSystem |
| `angel_offer_declined` | AngelElevationSystem | AIGodBehaviorSystem (deity reaction) |
| `mortal_elevated` | AngelElevationSystem | MythGenerationSystem |
| `legendary_deed_performed` | Various systems | MortalAscensionSystem |
| `prayer_to_mortal` | PrayerSystem | MortalAscensionSystem |

### Events Consumed (Existing)

| Event | Emitted By | Consumed By (NEW) |
|-------|-----------|-------------------|
| `needs_health_zero` | NeedsSystem | DeathTransitionSystem (existing) |
| `entity_died` | NeedsSystem | PlayerReincarnationSystem (new) |
| `prayer_sent` | PrayerSystem | MortalAscensionSystem (new) |
| `belief_formed` | BeliefFormationSystem | MortalAscensionSystem (new) |
| `deity_emerged` | DeityEmergenceSystem | (bypassed for player) |

---

## Component Dependencies

### New Components Created

| Component | Created By | Read By | Written By |
|-----------|-----------|---------|------------|
| `PlayerAgentComponent` | createPlayerMortal() | PlayerMortalControlSystem, MortalAscensionSystem | PlayerReincarnationSystem |
| `PlayerAngelComponent` | AngelElevationSystem | AngelSystem, PlayerMortalControlSystem | AngelElevationSystem |

### Existing Components Modified

| Component | New Reader | New Writer |
|-----------|-----------|------------|
| `DeityComponent` | MortalAscensionSystem | MortalAscensionSystem (creates) |
| `DivineServantComponent` | PlayerMortalControlSystem | AngelElevationSystem |
| `SpiritualComponent` | MortalAscensionSystem, AngelElevationSystem | - |
| `MemoryComponent` | PlayerReincarnationSystem | PlayerReincarnationSystem |

---

## Critical Interaction Points

### 1. Control Handoff: Mortal → Deity
**When**: Ascension triggers
**Systems Involved**:
- PlayerMortalControlSystem (deactivate)
- Existing deity UI (activate)
- MortalAscensionSystem (orchestrate)

**Challenge**: Smooth UI transition without jarring player
**Solution**: Ascension cutscene/animation, gradual UI fade

---

### 2. Control Handoff: Mortal → Angel
**When**: Angel offer accepted
**Systems Involved**:
- PlayerMortalControlSystem (modify for angel controls)
- AngelSystem (add player angel support)
- AngelElevationSystem (orchestrate)

**Challenge**: Angel abilities different from mortal actions
**Solution**: New ability panel, tutorial for angel powers

---

### 3. Death Detection Race Condition
**When**: Player mortal dies
**Systems Involved**:
- NeedsSystem (sets health = 0)
- DeathTransitionSystem (detects death)
- PlayerReincarnationSystem (intercepts)

**Challenge**: Ensure PlayerReincarnationSystem intercepts before standard death flow
**Solution**: Priority ordering, explicit PlayerAgentComponent check

---

### 4. Duplicate Deity Creation
**When**: Player mortal gains believers
**Systems Involved**:
- BeliefFormationSystem (tracks beliefs)
- DeityEmergenceSystem (creates deities)
- MortalAscensionSystem (creates player deity)

**Challenge**: Don't create two deities for same belief target
**Solution**: DeityEmergenceSystem checks if target is player mortal

---

### 5. Angel Maintenance Cost
**When**: Player is angel, deity low on belief
**Systems Involved**:
- AngelSystem (charges maintenance)
- FaithMechanicsSystem (deity belief pool)

**Challenge**: What if deity can't afford player angel?
**Solution**:
- Option A: Player angel forced to withdraw (lose angel status)
- Option B: Player angel becomes "rogue" (independent but weaker)
- **Recommendation**: Option B - more interesting gameplay

---

## Performance Considerations

### Concerns

1. **PlayerMortalControlSystem runs every frame**
   - Input handling needs to be lightweight
   - Don't do expensive calculations here

2. **MortalAscensionSystem checks conditions frequently**
   - Believer count, deed tracking, etc.
   - Need efficient queries

3. **Angel offer generation**
   - AI gods making offers could be expensive (LLM calls?)
   - Throttle to prevent spam

### Solutions

1. **Input buffering**: Queue inputs, process in batches
2. **Lazy evaluation**: Only check ascension conditions on relevant events
3. **Cooldowns**: Deities can only make offers every X ticks

---

## Testing Strategy

### Unit Tests Needed

- `PlayerAgentComponent` serialization/deserialization
- `MortalAscensionSystem` threshold detection
- `PlayerReincarnationSystem` memory retention calculation
- `AngelElevationSystem` offer generation logic

### Integration Tests Needed

- Mortal death → reincarnation flow
- Believer threshold → ascension
- Angel offer → acceptance → transformation
- Angel defection during rebellion
- All 6 ascension paths

### Edge Cases to Test

1. **Player mortal dies while ascension in progress**
   - Should reincarnation reset ascension progress?
   - **Answer**: No, progress carries across lives

2. **Player accepts angel offer during ascension**
   - Locks out deity path
   - **Answer**: Warn player, confirm choice

3. **Deity that offered player angel dies**
   - What happens to player angel?
   - **Answer**: Player angel becomes rogue or fades

4. **Player mortal in Underworld when believer threshold reached**
   - Can ascend from Underworld?
   - **Answer**: Yes, ascension pulls you out

5. **Multiple angel offers simultaneously**
   - Player has 3 offers pending
   - **Answer**: UI shows all, player picks one

---

## Migration Path

Since deity path already exists, we need clean migration:

### Existing Saves Compatibility

- Old saves: Player already deity (no change needed)
- New saves: Player chooses path at creation
- Migration: Add `playerPathType` field to save data

### Backwards Compatibility

```typescript
interface SaveData {
  // Existing
  playerDeityId?: string;

  // NEW
  playerPathType?: 'mortal' | 'deity' | 'angel';
  playerMortalId?: string;
  playerAngelId?: string;
}

// On load
if (saveData.playerDeityId && !saveData.playerPathType) {
  // Old save: player is deity
  saveData.playerPathType = 'deity';
}
```

---

## Summary: System Interaction Checklist

### New Systems (Create)
- [ ] PlayerMortalControlSystem
- [ ] MortalAscensionSystem
- [ ] PlayerReincarnationSystem
- [ ] AngelElevationSystem

### Existing Systems (Modify)
- [ ] DeathTransitionSystem - Intercept player deaths
- [ ] DeityEmergenceSystem - Check for player mortal
- [ ] PrayerSystem - Allow prayers to mortals
- [ ] AngelSystem - Support player-controlled angels
- [ ] AgentBrainSystem - Skip player mortals
- [ ] AIGodBehaviorSystem - Make angel offers
- [ ] AvatarSystem - Keep mortal body as avatar option

### UI Components (Create)
- [ ] Mortal HUD
- [ ] Ascension Progress Panel
- [ ] Divine Favor Panel
- [ ] Angel Offer Panel
- [ ] Reincarnation Screen

### Integration Points (Test)
- [ ] Control handoff: Mortal → Deity
- [ ] Control handoff: Mortal → Angel
- [ ] Death detection flow
- [ ] Duplicate deity prevention
- [ ] Angel maintenance costs
- [ ] Save/load compatibility

---

**End of Architecture Document**
