# Proposal: Work Order: Player Avatar System

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/player-avatar

---

## Original Work Order

# Work Order: Player Avatar System

**Phase:** 16
**Created:** 2025-12-30
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Spec Reference

- **Primary Spec:** [openspec/specs/avatar-system/spec.md](../../../../openspec/specs/avatar-system/spec.md)
- **Related Specs:**
  - [openspec/specs/player-system/spec.md](../../../../openspec/specs/player-system/spec.md) - Jack-in/Jack-out protocol
  - [openspec/specs/game-engine/spec.md](../../../../openspec/specs/game-engine/spec.md) - Core ECS architecture

---

## Requirements Summary

Extract from spec (REQ-AVT-001 through REQ-AVT-007):

1. The system SHALL manage avatar state transitions (UNBOUND → BOUND → DORMANT/SUSPENDED/DESTROYED)
2. The system SHALL support jack-in process with agent skill bonuses
3. The system SHALL support jack-out with session statistics
4. The system SHALL handle avatar death and present respawn options
5. The system SHALL support respawn with appropriate costs and penalties
6. The system SHALL manage multiple avatars per agent (roster management)
7. The system SHALL handle dormant avatars (present in world, not controlled)

---

## Acceptance Criteria

### Criterion 1: Avatar State Management
- **WHEN:** An avatar's state changes
- **THEN:** The AvatarSystem SHALL:
  1. Validate the state transition is legal
  2. Update avatar state atomically
  3. Trigger appropriate callbacks (onJackIn, onJackOut, onDeath)
  4. Persist state to storage
  5. Notify any observers (game UI, other systems)
- **Verification:**
  - Create avatar in UNBOUND state
  - Jack in → state becomes BOUND
  - Jack out with mode="dormant" → state becomes DORMANT
  - Jack out with mode="despawn" → state becomes DESTROYED
  - Invalid transitions throw errors

### Criterion 2: Jack-In Process
- **WHEN:** An agent calls jackIn(avatarId)
- **THEN:** The AvatarSystem SHALL:
  1. Verify agent is not already jacked into another avatar
  2. Verify avatar is in UNBOUND or DORMANT state
  3. Apply any skill bonuses from agent to avatar
  4. Set avatar state to BOUND
  5. Set avatar.boundAgentId to agent.id
  6. Return initial observation from avatar's perspective
  7. Begin routing agent actions to this avatar
- **Verification:**
  - Agent jacks into avatar successfully
  - Agent cannot jack into second avatar while first is BOUND
  - Skill bonuses applied (e.g., exploration skill → scanner_range boost)
  - Initial observation includes avatar body state
  - Actions route to avatar entity

### Criterion 3: Jack-Out Process
- **WHEN:** An agent calls jackOut(mode)
- **THEN:** The AvatarSystem SHALL:
  1. Verify agent is currently jacked in
  2. Verify avatar is in a safe state for jack-out
  3. Calculate session statistics
  4. Set avatar state based on mode:
     - "dormant": DORMANT (avatar stays in world, sleeping)
     - "suspend": SUSPENDED (avatar frozen, invisible)
     - "despawn": DESTROYED (avatar removed)
  5. Clear avatar.boundAgentId
  6. Return session stats to agent
  7. Stop routing actions to this avatar
- **Verification:**
  - Jack out with "dormant" → avatar remains in world, visible
  - Jack out with "suspend" → avatar invisible but entity exists
  - Jack out with "despawn" → avatar entity removed
  - Session stats returned (playtime, actions, distance, etc.)
  - Cannot perform actions after jack-out

### Criterion 4: Death Handling
- **WHEN:** An avatar's health reaches 0
- **THEN:** The AvatarSystem SHALL:
  1. Trigger onDeath callback
  2. Create DeathEvent with cause and consequences
  3. Apply death penalties (drop items, lose XP, etc.)
  4. Set avatar state to DESTROYED
  5. Unbind any controlling agent
  6. Present respawn options to agent
  7. Start auto-respawn timer if configured
- **Verification:**
  - Avatar health = 0 triggers death
  - DeathEvent includes cause, location, items dropped
  - Avatar state becomes DESTROYED
  - Agent unbinds automatically
  - Respawn options presented (checkpoint, bed, spawn_point, corpse)
  - Auto-respawn timer counts down

### Criterion 5: Respawn Process
- **WHEN:** An agent selects a respawn option
- **THEN:** The AvatarSystem SHALL:
  1. Verify the option is valid and available
  2. Apply any costs (currency, resources)
  3. Apply respawn penalties
  4. Either:
     a. Restore existing avatar at respawn location, OR
     b. Create new avatar if previous was fully destroyed
  5. Set avatar health to respawn amount (often partial)
  6. Apply any respawn debuffs
  7. Jack agent into the avatar
  8. Return initial observation
- **Verification:**
  - Select "checkpoint" respawn → appears at last checkpoint
  - Select "bed" respawn → appears at bound bed location
  - Select "corpse" respawn → appears where died
  - Costs deducted (if applicable)
  - Penalties applied (lose_inventory, temporary_debuff, etc.)
  - Health at partial amount (e.g., 50%)
  - Agent automatically jacked back in

### Criterion 6: Multi-Avatar Management
- **WHEN:** An agent has multiple avatars in a game
- **THEN:** The AvatarSystem SHALL:
  1. Maintain roster of all avatars
  2. Enforce game's max avatar limit
  3. Only allow one BOUND avatar at a time
  4. Allow switching between avatars via jack-out/jack-in
  5. Track per-avatar statistics separately
  6. Allow dormant avatars to be affected by world events
- **Verification:**
  - Agent creates 3 avatars (within limit)
  - Roster shows all 3 avatars (1 BOUND, 2 DORMANT)
  - Cannot create 4th avatar if limit is 3
  - Cannot jack into second avatar without first jacking out
  - Switch from avatar A to avatar B works (jack-out A, jack-in B)
  - Each avatar has separate stats (playtime, deaths, etc.)
  - Dormant avatar can take damage from environment

### Criterion 7: Dormant Avatar Behavior
- **WHEN:** An avatar is in DORMANT state
- **THEN:** The game world SHALL:
  1. Keep avatar physically present in world
  2. Make avatar visible to other entities
  3. Allow avatar to be affected by:
     - Environmental damage (if exposed)
     - Other entities' actions
     - Time-based effects
  4. NOT allow avatar to take actions
  5. Protect from trivial damage (optional safe zones)
  6. Wake avatar if critically threatened (optional)
- **Verification:**
  - Jack out with "dormant" → avatar entity exists in world
  - Other agents can see dormant avatar
  - Environmental hazard (fire, cold) damages dormant avatar
  - Dormant avatar cannot move or act
  - Safe zone (e.g., player home) protects dormant avatar
  - Critical threat (e.g., attacked) optionally wakes avatar

---

## System Integration

### Existing Systems Affected

| System | File | Integration Type |
|--------|------|-----------------|
| AgentBrainSystem | `packages/core/src/systems/AgentBrainSystem.ts` | Check if agent jacked in, route to avatar |
| NeedsSystem | `packages/core/src/systems/NeedsSystem.ts` | Avatar health tracking |
| DeathTransitionSystem | `packages/core/src/systems/DeathTransitionSystem.ts` | Detect avatar death |
| SkillSystem | `packages/core/src/systems/SkillSystem.ts` | Apply skill bonuses on jack-in |
| MetricsCollectionSystem | `packages/core/src/systems/MetricsCollectionSystem.ts` | Track session stats |
| AutoSaveSystem | `packages/core/src/systems/AutoSaveSystem.ts` | Persist avatar state |

### New Components Needed

- **AvatarComponent** - Tracks avatar state, bindings, and session data
  - Properties: boundAgentId, state (UNBOUND/BOUND/DORMANT/SUSPENDED/DESTROYED), sessionStats, respawnPoint
- **AvatarRosterComponent** - Manages multiple avatars for an agent
  - Properties: agentId, avatars[], activeAvatarId, maxAvatars

### Events

**Emits:**
- `avatar:jack_in` - Agent jacked into avatar
- `avatar:jack_out` - Agent jacked out of avatar
- `avatar:death` - Avatar died
- `avatar:respawn` - Avatar respawned
- `avatar:state_changed` - Avatar state transition

**Listens:**
- `needs:health_zero` - Avatar health depleted (death trigger)
- `agent:action` - Route actions to avatar entity
- `world:tick` - Update dormant avatars

---

## UI Requirements

### Avatar Selection Screen
- **Screen/Component:** Avatar selection during jack-in
- **User Interactions:**
  - List available avatars (UNBOUND or DORMANT)
  - Select avatar to jack into
  - Create new avatar button
- **Visual Elements:**
  - Avatar preview (name, appearance, stats)
  - State badge (UNBOUND, DORMANT, DESTROYED)
  - Last active timestamp
  - Location indicator
- **Layout:** Grid or list view with filters (state, location, recent)

### Avatar HUD (In-Game)
- **Screen/Component:** Status bar when jacked in
- **User Interactions:**
  - View avatar health, energy
  - Access avatar inventory
  - Jack-out button
  - View session stats
- **Visual Elements:**
  - Health/energy bars
  - Avatar name
  - Session timer
  - Jack-out warning (if in danger)
- **Layout:** Top-left HUD overlay

### Death/Respawn Screen
- **Screen/Component:** Modal on avatar death
- **User Interactions:**
  - View death details (cause, location, items lost)
  - Select respawn option
  - Auto-respawn countdown
- **Visual Elements:**
  - Death summary
  - Respawn options list (with costs/penalties)
  - Countdown timer
  - Corpse location map marker
- **Layout:** Centered modal with respawn options as cards

### Avatar Roster Panel
- **Screen/Component:** Manage multiple avatars
- **User Interactions:**
  - View all avatars
  - Delete avatar
  - Create new avatar
  - Switch active avatar
- **Visual Elements:**
  - Avatar cards (name, state, stats)
  - Active avatar highlighted
  - Limit indicator (e.g., "3/5 avatars")
  - Per-avatar stats (deaths, playtime)
- **Layout:** Sidebar panel or full-screen menu

---

## Files Likely Modified

Based on the codebase structure:

**New Files:**
- `packages/core/src/components/AvatarComponent.ts`
- `packages/core/src/components/AvatarRosterComponent.ts`
- `packages/core/src/systems/AvatarManagementSystem.ts` (jack-in/out logic)
- `packages/core/src/systems/AvatarRespawnSystem.ts` (death/respawn logic)
- `packages/core/src/types/AvatarTypes.ts` (state enums, interfaces)
- `packages/renderer/src/AvatarSelectionScreen.ts`
- `packages/renderer/src/AvatarHUD.ts`
- `packages/renderer/src/DeathRespawnScreen.ts`
- `packages/renderer/src/AvatarRosterPanel.ts`

**Modified Files:**
- `packages/core/src/systems/AgentBrainSystem.ts` - Route actions to avatar
- `packages/core/src/systems/DeathTransitionSystem.ts` - Detect avatar deaths
- `packages/core/src/systems/SkillSystem.ts` - Apply bonuses on jack-in
- `packages/core/src/systems/MetricsCollectionSystem.ts` - Track session stats
- `packages/core/src/ecs/World.ts` - Avatar factory methods
- `packages/core/src/types/ComponentType.ts` - Add Avatar, AvatarRoster types
- `demo/src/main.ts` - Register new systems
- `packages/core/src/index.ts` - Export new components/systems

---

## Notes for Implementation Agent

### Critical Design Points

1. **State Machine:** Avatar states must be strictly validated. Invalid transitions should throw clear errors.

2. **Session Statistics:** Track all stats during BOUND state:
   - playtime (seconds)
   - actionsPerformed (count)
   - distanceTraveled (tiles)
   - damageDealt/damageTaken
   - itemsCollected
   - skillGains (Map<skill, amount>)

3. **Skill Bonuses:** Use configuration mappings to apply agent skills to avatar stats:
   ```typescript
   interface SkillBonus {
     agentSkill: string;
     threshold: number; // Min skill level
     effect: BonusEffect; // stat_boost, unlock_ability, etc.
   }
   ```

4. **Dormant Avatar Safety:** Consider safe zones (player home, town centers) where dormant avatars are protected from damage.

5. **Respawn Costs:** Respawn options should have configurable costs and penalties. Some respawns are free (spawn_point), others cost currency or items.

6. **Multi-Avatar Limits:** Enforce per-game max avatar limits. Some games allow 1, others allow 5+.

7. **Death Auto-Respawn:** If player doesn't respond, auto-respawn after timeout (default: 60 seconds) to prevent soft-lock.

### Existing Avatar System Note

The current `AvatarSystem.ts` is for **deity avatar manifestation** (gods appearing in physical form). This work order is for **player agent avatars** (nexus-based jack-in/out system). These are separate systems:

- **Deity Avatars** (existing): Divine manifestations, belief-powered, god-controlled
- **Player Avatars** (this work order): Agent-controlled bodies, jack-in/out, mortal gameplay

**DO NOT** modify the existing AvatarSystem for deity avatars. Create new files:
- `AvatarManagementSystem.ts` - Player avatar system
- `PlayerAvatarComponent.ts` or just `AvatarComponent.ts` - Player avatar data

### Performance Considerations

- Jack-in/out should be fast (< 100ms) to feel responsive
- Dormant avatar updates can be throttled (update every 1 second, not every tick)
- Session stats should accumulate in-memory, persist on jack-out only

---

## Notes for Playtest Agent

### Test Scenarios

**Scenario 1: Basic Jack-In/Out**
1. Create avatar
2. Jack in
3. Move around, perform actions
4. Jack out (dormant mode)
5. Verify avatar stays in world
6. Jack back in
7. Verify session stats accumulated

**Scenario 2: Avatar Death**
1. Jack into avatar
2. Reduce health to 0
3. Verify death screen appears
4. Select "checkpoint" respawn
5. Verify respawn at checkpoint location
6. Verify penalties applied

**Scenario 3: Multiple Avatars**
1. Create 3 avatars (A, B, C)
2. Jack into avatar A
3. Jack out (dormant)
4. Jack into avatar B
5. Verify avatar A is dormant in world
6. Jack out B, jack back into A
7. Verify switching works

**Scenario 4: Dormant Avatar Damage**
1. Jack into avatar
2. Move to dangerous area
3. Jack out (dormant mode)
4. Wait for environmental damage (fire, cold)
5. Verify dormant avatar takes damage
6. Jack back in
7. Verify health reduced

**Scenario 5: Skill Bonuses**
1. Create agent with high exploration skill
2. Create avatar
3. Jack in
4. Verify scanner_range boost applied
5. Jack out, modify agent skills
6. Jack back in
7. Verify bonuses recalculated

### Edge Cases to Test

- Jack-in when avatar is DESTROYED (should fail)
- Jack-in when already jacked into another avatar (should fail)
- Jack-out during combat (should warn or block)
- Respawn when corpse location is occupied
- Create avatar when at max limit (should fail)
- Delete avatar while jacked in (should prevent or auto-jack-out)
- Avatar death while agent offline (death event queued for next jack-in)
- Very long dormant period (days/weeks) - should avatar decay?

### UI/UX to Verify

- Avatar selection screen is clear and intuitive
- Death screen explains penalties clearly
- Respawn costs are visible before selection
- Jack-out button has confirmation if in danger
- Session stats are accurate and displayed nicely
- Roster panel shows correct avatar states
- Dormant avatars have visual indicator (sleeping icon, zzz)

---

## Dependencies

All dependencies are met:

✅ **Phase 0** (ECS Architecture) - Complete
✅ **Phase 1** (Agent System) - AgentComponent exists
✅ **Phase 3** (Needs System) - NeedsComponent, health tracking exists
✅ **Phase 5** (Skills) - SkillsComponent exists
✅ **Phase 12** (Economy) - Currency system for respawn costs
✅ **Phase 16** (UI Infrastructure) - WindowManager, Renderer ready

**No blocking dependencies.**

---

**Work Order Status:** READY_FOR_TESTS

Handing off to Test Agent for test creation.

---

## Implementation Checklist

### Phase 1: Core Components (3-4 hours)
- [ ] Create `AvatarComponent.ts` in `packages/core/src/components/`
  - Properties: boundAgentId, state, sessionStats, respawnPoint
- [ ] Create `AvatarRosterComponent.ts` in `packages/core/src/components/`
  - Properties: agentId, avatars[], activeAvatarId, maxAvatars
- [ ] Create `AvatarTypes.ts` in `packages/core/src/types/`
  - Define AvatarState enum (UNBOUND, BOUND, DORMANT, SUSPENDED, DESTROYED)
  - Define SessionStats, DeathEvent, RespawnOption interfaces
- [ ] Update `ComponentType.ts` with Avatar, AvatarRoster
- [ ] Export all from `packages/core/src/index.ts`

### Phase 2: Jack-In/Jack-Out System (4-5 hours)
- [ ] Create `AvatarManagementSystem.ts` in `packages/core/src/systems/`
- [ ] Implement `jackIn(agentId, avatarId)` method
  - Verify agent not already jacked in
  - Verify avatar is UNBOUND or DORMANT
  - Apply skill bonuses from agent
  - Set state to BOUND
  - Return initial observation
- [ ] Implement `jackOut(agentId, mode)` method
  - Verify agent currently jacked in
  - Calculate session stats
  - Set avatar state based on mode (dormant/suspend/despawn)
  - Clear boundAgentId
  - Return session stats
- [ ] Test jack-in/jack-out workflow

### Phase 3: Skill Bonuses (2-3 hours)
- [ ] Create `SkillBonusMapping.ts` in `packages/core/src/avatar/`
- [ ] Define SkillBonus interface
- [ ] Implement bonus application on jack-in
  - Exploration skill → scanner_range boost
  - Combat skill → weapon_damage boost
  - Social skill → shop discount
- [ ] Test bonus application

### Phase 4: Death & Respawn System (5-6 hours)
- [ ] Create `AvatarRespawnSystem.ts` in `packages/core/src/systems/`
- [ ] Implement death detection
  - Listen to `needs:health_zero` event
  - Create DeathEvent
  - Apply death penalties (drop items, lose XP)
  - Set state to DESTROYED
  - Unbind controlling agent
- [ ] Implement respawn options
  - Checkpoint respawn
  - Bed respawn
  - Spawn point respawn
  - Corpse respawn
- [ ] Implement respawn process
  - Verify option valid
  - Apply costs and penalties
  - Restore or create avatar
  - Jack agent back in
- [ ] Test death and respawn workflow

### Phase 5: Multi-Avatar Management (3-4 hours)
- [ ] Implement AvatarRoster management
  - Maintain roster of all avatars
  - Enforce max avatar limit
  - Allow only one BOUND avatar at a time
  - Allow switching via jack-out/jack-in
- [ ] Track per-avatar statistics separately
- [ ] Test multi-avatar scenario (3 avatars, switching between them)

### Phase 6: Dormant Avatar Behavior (3-4 hours)
- [ ] Implement dormant avatar updates in game world
  - Keep avatar physically present
  - Make avatar visible to others
  - Allow environmental damage
  - Prevent avatar actions
- [ ] Implement safe zones (optional)
  - Player home protects dormant avatars
- [ ] Test dormant avatar (jack out → dormant avatar takes damage)

### Phase 7: UI Components (6-8 hours)
- [ ] Create `AvatarSelectionScreen.ts` in `packages/renderer/src/`
  - List available avatars (UNBOUND or DORMANT)
  - Select avatar to jack into
  - Create new avatar button
- [ ] Create `AvatarHUD.ts` in `packages/renderer/src/`
  - Display health, energy
  - Avatar name, session timer
  - Jack-out button
- [ ] Create `DeathRespawnScreen.ts` in `packages/renderer/src/`
  - Death summary
  - Respawn options list with costs
  - Auto-respawn countdown
- [ ] Create `AvatarRosterPanel.ts` in `packages/renderer/src/`
  - View all avatars
  - Delete, create, switch avatars
  - Per-avatar stats
- [ ] Test UI components

### Phase 8: Integration & Testing (3-4 hours)
- [ ] Register AvatarManagementSystem, AvatarRespawnSystem in `registerAllSystems.ts`
- [ ] Add avatar events to EventMap
  - `avatar:jack_in`, `avatar:jack_out`, `avatar:death`, `avatar:respawn`
- [ ] Update AgentBrainSystem to route actions to avatar
- [ ] Test full workflow (create → jack in → play → jack out → jack in again)

---

## Test Requirements

### Unit Tests
**Create: `packages/core/src/systems/__tests__/AvatarManagementSystem.test.ts`**
- [ ] Test jack-in (agent → avatar binding)
- [ ] Test jack-out (state changes, session stats)
- [ ] Test skill bonus application
- [ ] Test respawn option validation

**Create: `packages/core/src/systems/__tests__/AvatarRespawnSystem.test.ts`**
- [ ] Test death detection
- [ ] Test death penalty application
- [ ] Test respawn cost calculation
- [ ] Test respawn with different options

### Integration Tests
**Create: `packages/core/src/avatar/__tests__/AvatarIntegration.test.ts`**
- [ ] Test full jack-in/out cycle
- [ ] Test death → respawn → jack back in
- [ ] Test multi-avatar switching
- [ ] Test dormant avatar damage
- [ ] Test skill bonuses applied correctly

### Manual Scenarios
1. **Basic Jack-In/Out**: Create avatar, jack in, move, jack out dormant, jack back in
2. **Avatar Death**: Jack in, reduce health to 0, verify death screen, respawn at checkpoint
3. **Multiple Avatars**: Create 3 avatars, switch between them
4. **Dormant Damage**: Jack out dormant, verify avatar takes environmental damage
5. **Skill Bonuses**: High exploration skill → verify scanner range boost

---

## Definition of Done

- [ ] All implementation tasks complete
- [ ] Jack-in/jack-out works correctly
- [ ] Death and respawn functional
- [ ] Multi-avatar management works
- [ ] Dormant avatars behave correctly
- [ ] Unit tests passing (code coverage > 80%)
- [ ] Integration tests passing
- [ ] Manual scenarios tested successfully
- [ ] UI components render correctly
- [ ] Documentation updated (spec.md, code comments)
- [ ] No TypeScript errors
- [ ] Performance validated (jack-in/out < 100ms)

---

## Pre-Test Checklist

**Since status is READY_FOR_TESTS, verify before testing:**

- [ ] All components created (AvatarComponent, AvatarRosterComponent)
- [ ] All systems created (AvatarManagementSystem, AvatarRespawnSystem)
- [ ] Systems registered in registerAllSystems
- [ ] Event types added to EventMap
- [ ] AgentBrainSystem routes actions to avatar
- [ ] UI components exist and compile
- [ ] `npm run build` passes with zero errors
- [ ] No conflicts with existing deity AvatarSystem



---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
