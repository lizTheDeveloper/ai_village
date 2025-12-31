# Work Order: Conflict/Combat UI

**Phase:** Phase 7 - Conflict & Social Complexity
**Created:** 2025-12-31
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Spec Reference

- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Specs:** `openspec/specs/conflict-system/spec.md`
- **Dependencies:** `openspec/specs/ui-system/notifications.md`

---

## Requirements Summary

Extracted from `openspec/specs/ui-system/conflict.md`:

1. The system SHALL implement a Combat HUD overlay showing active conflicts and threats (REQ-COMBAT-001)
2. The system SHALL render health bars above entities based on health status and combat state (REQ-COMBAT-002)
3. The system SHALL provide a Combat Unit Panel with detailed entity stats (REQ-COMBAT-003)
4. The system SHALL implement Stance Controls for combat behavior (REQ-COMBAT-004)
5. The system SHALL display Threat Indicators for dangers in the world (REQ-COMBAT-005)
6. The system SHOULD provide a Combat Log for scrollable event history (REQ-COMBAT-006)
7. The system SHOULD implement a Tactical Overview for strategic combat view (REQ-COMBAT-007)
8. The system MAY implement an Ability Bar for quick access to combat abilities (REQ-COMBAT-008)
9. The system SHOULD provide Defense Management for structures and zones (REQ-COMBAT-009)
10. The system MAY implement Damage Numbers as floating combat feedback (REQ-COMBAT-010)
11. The system SHOULD support Keyboard Shortcuts for combat actions (REQ-COMBAT-011)

---

## Acceptance Criteria

### Criterion 1: Combat HUD Display
- **WHEN:** A conflict starts (hunting, combat, predator attack)
- **THEN:** The Combat HUD SHALL display the active conflict with type, participants, and threat level
- **Verification:** Listen for `conflict:started` event and verify UI updates

### Criterion 2: Health Bar Rendering
- **WHEN:** An entity's health drops below 100% OR entity enters combat
- **THEN:** A health bar SHALL render above the entity with color-coded health status
- **Verification:** Check HealthBarRenderer draws bars for injured/combat entities

### Criterion 3: Combat Unit Panel
- **WHEN:** User selects a combat-capable entity
- **THEN:** Combat Unit Panel SHALL display stats, equipment, stance, and injuries
- **Verification:** Panel shows combat skill, health, stamina, weapon/armor, active injuries

### Criterion 4: Stance Controls
- **WHEN:** User clicks stance button (passive/defensive/aggressive/flee)
- **THEN:** Selected entity(s) SHALL update their combat stance
- **Verification:** Stance component updated, UI reflects current stance

### Criterion 5: Threat Indicators
- **WHEN:** A threat is detected (predator, hostile agent, raid)
- **THEN:** Visual indicator SHALL appear showing threat type, position, severity
- **Verification:** Threat icons render on-screen and at viewport edges for off-screen threats

### Criterion 6: Combat Log
- **WHEN:** Combat events occur (attack, damage, death, injury)
- **THEN:** Events SHALL be logged with timestamp, participants, and outcome
- **Verification:** CombatLogPanel displays scrollable event history

### Criterion 7: Event Integration
- **WHEN:** Conflict-system emits events (`conflict:started`, `conflict:resolved`, `combat:attack`)
- **THEN:** UI components SHALL consume events and update displays
- **Verification:** All conflict events propagate to UI correctly

### Criterion 8: Keyboard Shortcuts
- **WHEN:** User presses stance hotkeys (1/2/3/4)
- **THEN:** Selected units SHALL change stance
- **Verification:** KeyboardRegistry binds shortcuts to stance actions

---

## System Integration

### Existing Systems Affected
| System | File | Integration Type |
|--------|------|-----------------|
| EventBus | `packages/core/src/events/EventBus.ts` | Event consumption |
| HuntingSystem | `packages/core/src/systems/HuntingSystem.ts` | EventBus events |
| PredatorAttackSystem | `packages/core/src/systems/PredatorAttackSystem.ts` | EventBus events |
| AgentCombatSystem | `packages/core/src/systems/AgentCombatSystem.ts` | EventBus events |
| DominanceChallengeSystem | `packages/core/src/systems/DominanceChallengeSystem.ts` | EventBus events |
| GuardDutySystem | `packages/core/src/systems/GuardDutySystem.ts` | EventBus events |
| WindowManager | `packages/renderer/src/WindowManager.ts` | Panel registration |
| KeyboardRegistry | `packages/renderer/src/KeyboardRegistry.ts` | Hotkey binding |

### Existing Components (Partially Implemented)
- `CombatHUDPanel.ts` - Exists, displays active conflicts
- `HealthBarRenderer.ts` - Exists, renders health bars
- `CombatLogPanel.ts` - Exists, shows combat event log
- `CombatUnitPanel.ts` - Exists, displays unit stats
- `StanceControls.ts` - Exists, stance selection UI
- `ThreatIndicatorRenderer.ts` - Exists, renders threat icons

### Events Consumed
- **Listens:**
  - `conflict:started` - New conflict begins
  - `conflict:resolved` - Conflict ends
  - `combat:attack` - Attack/damage event
  - `entity:injured` - Injury inflicted
  - `entity:death` - Entity dies
  - `threat:detected` - New threat appears
  - `predator:attack` - Predator attacks agent
  - `hunting:attempt` - Agent hunts animal
  - `dominance:challenge` - Dominance challenge starts

### Events Emitted
- **Emits:**
  - `ui:stance_changed` - User changes entity stance
  - `ui:focus_conflict` - User clicks conflict to focus camera
  - `ui:combat_log_filtered` - User applies log filters

---

## UI Requirements

### Combat HUD
- **Screen/Component:** Overlay in top-left corner
- **User Interactions:** Click conflict to focus camera
- **Visual Elements:**
  - Active conflict list (type, participants, threat icon)
  - Threat level indicator
  - Recent event notifications (max 3)
- **Layout:** Semi-transparent panel, auto-hides when no conflicts

### Health Bars
- **Screen/Component:** World-space rendering above entities
- **Visual Elements:**
  - 32px wide, 4px tall bar
  - Color: Green (>66%), Yellow (33-66%), Red (<33%)
  - 1px border
  - Injury icons (6px) below bar
- **Layout:** Positioned 12px above entity sprite

### Combat Unit Panel
- **Screen/Component:** Window panel (side or bottom)
- **User Interactions:**
  - View stats, equipment, injuries
  - Change stance via buttons
- **Visual Elements:**
  - Portrait, name, health/stamina bars
  - Combat stats (skill, attack, defense)
  - Equipment slots (weapon, armor, shield)
  - Injury list with icons
  - Stance buttons with hotkeys
- **Layout:** Tabbed sections: Stats, Equipment, Abilities, Orders

### Stance Controls
- **Screen/Component:** Part of Combat Unit Panel
- **User Interactions:** Click buttons or press 1/2/3/4
- **Visual Elements:**
  - 4 buttons: Passive (peace icon), Defensive (shield), Aggressive (sword), Flee (run)
  - Active stance highlighted
- **Layout:** Horizontal button row

### Threat Indicators
- **Screen/Component:** World-space icons and viewport edge indicators
- **Visual Elements:**
  - On-screen: Icon at threat position with severity color
  - Off-screen: Icon at viewport edge with distance arrow
- **Layout:** Icons pulse for high-severity threats

### Combat Log
- **Screen/Component:** Collapsible panel (bottom-left)
- **User Interactions:**
  - Scroll through events
  - Filter by event type or entity
  - Expand/collapse
- **Visual Elements:**
  - Timestamped event entries
  - Color-coded by event type (damage=red, heal=green, miss=gray)
  - Event icons
- **Layout:** Max 10 visible entries, scrollable

---

## Files Likely Modified

Based on existing codebase structure:

### Renderer (UI Layer)
- `packages/renderer/src/CombatHUDPanel.ts` - ✅ EXISTS (verify implementation)
- `packages/renderer/src/HealthBarRenderer.ts` - ✅ EXISTS (verify implementation)
- `packages/renderer/src/CombatLogPanel.ts` - ✅ EXISTS (verify implementation)
- `packages/renderer/src/CombatUnitPanel.ts` - ✅ EXISTS (verify implementation)
- `packages/renderer/src/StanceControls.ts` - ✅ EXISTS (verify implementation)
- `packages/renderer/src/ThreatIndicatorRenderer.ts` - ✅ EXISTS (verify implementation)
- `packages/renderer/src/WindowManager.ts` - Register new panels
- `packages/renderer/src/KeyboardRegistry.ts` - Bind stance hotkeys
- `packages/renderer/src/Renderer.ts` - Integrate renderers into main loop

### Core (Systems Layer)
- `packages/core/src/systems/HuntingSystem.ts` - Verify event emission
- `packages/core/src/systems/PredatorAttackSystem.ts` - Verify event emission
- `packages/core/src/systems/AgentCombatSystem.ts` - Verify event emission
- `packages/core/src/systems/DominanceChallengeSystem.ts` - Verify event emission
- `packages/core/src/systems/GuardDutySystem.ts` - Verify event emission
- `packages/core/src/events/EventBus.ts` - No changes needed

### Components
- `packages/core/src/components/CombatStanceComponent.ts` - MAY NEED: If stance component doesn't exist
- `packages/core/src/components/ConflictComponent.ts` - VERIFY: Check if exists

---

## Notes for Implementation Agent

### Special Considerations

1. **Component Verification**: Many UI components already exist. Your primary task is to:
   - Verify they implement the spec correctly
   - Ensure event integration works
   - Add missing features per spec
   - Write tests to prove functionality

2. **Event Flow**: Conflict systems already exist and emit events. Focus on:
   - Subscribing to correct events
   - Handling event data properly
   - Updating UI in response to events
   - Cleaning up event listeners on destroy

3. **No Silent Fallbacks**: Per project guidelines:
   - Crash if events are missing required fields
   - Throw if entity components don't exist when expected
   - No default/fallback values that hide missing data

4. **Existing Patterns**: The codebase uses:
   - EventBus for system communication
   - WindowManager for panel management
   - KeyboardRegistry for hotkeys
   - Component-based entity system

5. **Testing Strategy**:
   - Unit tests for individual panels/renderers
   - Integration tests for event flow
   - Visual verification using Playwright (screenshots)
   - Dashboard queries to verify metrics

### Gotchas

- **Health Bar Culling**: HealthBarRenderer must cull off-screen entities for performance
- **Event Cleanup**: All EventBus listeners MUST be cleaned up on panel destroy
- **Stance Persistence**: Combat stance should persist on entity component, not just UI state
- **Threat Detection**: Threats may come from multiple sources (predators, agents, raids)

### Implementation Priority

1. **MUST (Phase 1)**: Combat HUD, Health Bars, Combat Unit Panel, Stance Controls, Threat Indicators
2. **SHOULD (Phase 2)**: Combat Log, Tactical Overview, Keyboard Shortcuts
3. **MAY (Phase 3)**: Ability Bar, Defense Management, Damage Numbers

---

## Notes for Playtest Agent

### Specific UI Behaviors to Verify

1. **Combat HUD**:
   - Appears when conflict starts
   - Shows conflict type (hunting, combat, predator attack)
   - Displays correct threat level
   - Click focuses camera on conflict
   - Auto-hides when all conflicts end

2. **Health Bars**:
   - Appear on injured entities
   - Appear on entities in combat
   - Color changes at correct thresholds (66%, 33%)
   - Injury icons display below bar
   - Bars cull off-screen for performance

3. **Combat Unit Panel**:
   - Opens when combat entity selected
   - Shows correct stats from components
   - Equipment displays correctly (weapon, armor)
   - Injuries list updates in real-time
   - Stance buttons reflect current stance

4. **Stance Controls**:
   - Click changes stance immediately
   - Hotkeys (1/2/3/4) work
   - Multi-select applies to all units
   - Active stance visually highlighted

5. **Threat Indicators**:
   - Icons appear for predators
   - Icons appear for hostile agents
   - Off-screen threats show at viewport edge
   - High-severity threats pulse
   - Indicators disappear when threat resolved

6. **Combat Log**:
   - Events appear in chronological order
   - Scroll works correctly
   - Filter by event type works
   - Expand/collapse works
   - Events link to conflict resolutions

### Edge Cases to Test

1. **Multiple Simultaneous Conflicts**: Does UI handle 3+ active conflicts?
2. **Rapid Health Changes**: Does health bar update smoothly during combat?
3. **Off-Screen Combat**: Do threat indicators work for off-screen conflicts?
4. **Entity Death**: Does UI clean up when entity dies during combat?
5. **Stance Persistence**: Does stance persist across save/load?
6. **Event Flood**: Does combat log handle 100+ events without lag?

---

## Implementation Checklist

- [ ] Verify CombatHUDPanel subscribes to conflict events
- [ ] Verify HealthBarRenderer renders based on health/combat state
- [ ] Verify CombatLogPanel logs all combat events
- [ ] Verify CombatUnitPanel displays correct entity data
- [ ] Verify StanceControls updates entity stance component
- [ ] Verify ThreatIndicatorRenderer tracks threats
- [ ] Implement keyboard shortcuts for stances (1/2/3/4)
- [ ] Register all panels with WindowManager
- [ ] Write unit tests for each component
- [ ] Write integration tests for event flow
- [ ] Verify no silent fallbacks in event handling
- [ ] Verify event listener cleanup on destroy
- [ ] Test with dashboard (curl queries)
- [ ] Take screenshots with Playwright
- [ ] Document any spec deviations

---

**End of Work Order**
