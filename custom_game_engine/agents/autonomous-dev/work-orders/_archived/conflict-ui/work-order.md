# Work Order: Conflict/Combat UI

**Phase:** UI System
**Created:** 2026-01-01
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Spec Reference

- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **UI Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Specs:**
  - `openspec/specs/conflict-system/spec.md` - Core conflict mechanics
  - `openspec/specs/agent-system/spec.md` - Agent stats and skills
  - `openspec/specs/ui-system/notifications.md` - Combat alerts

---

## Requirements Summary

Extract the key SHALL/MUST statements from the spec:

1. The system SHALL provide a Combat HUD overlay showing combat-relevant information (REQ-COMBAT-001)
2. The system MUST display health bars for entities with configurable visibility rules (REQ-COMBAT-002)
3. The system MUST provide a detailed Combat Unit Panel for selected units (REQ-COMBAT-003)
4. The system MUST provide Stance Controls to set combat behavior for units (REQ-COMBAT-004)
5. The system MUST display Threat Indicators for threats in the world (REQ-COMBAT-005)
6. The system SHOULD provide a scrollable Combat Log of events (REQ-COMBAT-006)
7. The system SHOULD provide a Tactical Overview for strategic combat view (REQ-COMBAT-007)
8. The system MAY provide an Ability Bar for quick access to combat abilities (REQ-COMBAT-008)
9. The system SHOULD provide Defense Management for defensive structures and zones (REQ-COMBAT-009)
10. The system MAY display floating Damage Numbers (REQ-COMBAT-010)
11. The system SHOULD provide Keyboard Shortcuts for combat actions (REQ-COMBAT-011)

---

## Acceptance Criteria

### Criterion 1: Combat HUD Display
- **WHEN:** An active conflict occurs in the game world
- **THEN:** The Combat HUD SHALL activate and display:
  - Active conflicts with type, participants, and location
  - Current threat level (none/low/moderate/high/critical)
  - Selected unit combat information
  - Recent conflict resolutions
- **Verification:** Start a conflict, verify HUD shows all required information

### Criterion 2: Health Bar Visibility
- **WHEN:** Entities exist in the world with health tracking
- **THEN:** Health bars SHALL:
  - Display above entities based on visibility settings
  - Show current health percentage with color coding (green/yellow/red)
  - Display active injuries and status effects
  - Update in real-time as health changes
- **Verification:** Create agents, damage them, verify health bars display correctly

### Criterion 3: Combat Unit Selection
- **WHEN:** A user selects a combat-capable entity
- **THEN:** The Combat Unit Panel SHALL display:
  - Unit name, portrait, and current health/stamina
  - Combat stats (attack power, defense, accuracy, evasion)
  - Current stance and action
  - Equipped weapon, armor, shield
  - Active injuries with healing progress
- **Verification:** Select different units, verify panel shows accurate information

### Criterion 4: Stance Control
- **WHEN:** User changes combat stance for selected units
- **THEN:** Stance Controls SHALL:
  - Display current stance for selected units
  - Show "mixed" if multiple units with different stances selected
  - Allow setting stance: passive, defensive, aggressive, flee
  - Update unit behavior immediately
- **Verification:** Select units, change stances, verify behavior changes

### Criterion 5: Threat Detection Display
- **WHEN:** Threats exist in the game world
- **THEN:** Threat Indicators SHALL:
  - Display icons for visible threats with severity colors
  - Show off-screen threat indicators at screen edge
  - Display distance to off-screen threats
  - Pulse animation for high-severity threats
- **Verification:** Spawn predators/hostiles, verify threat indicators appear

### Criterion 6: Combat Event Logging
- **WHEN:** Combat events occur (attacks, injuries, deaths)
- **THEN:** Combat Log SHALL:
  - Record events with timestamp, source, target, message
  - Link to conflict-system resolutions
  - Support filtering by event type and entity
  - Display in scrollable panel with color-coded events
- **Verification:** Trigger combat, verify log captures all events

### Criterion 7: Tactical View
- **WHEN:** User opens tactical overview
- **THEN:** Tactical Overview SHALL display:
  - All friendly, hostile, and neutral combat units
  - Force strength comparison
  - Battle odds prediction
  - Village defense status if applicable
- **Verification:** Open tactical view during combat, verify all information present

### Criterion 8: Keyboard Shortcuts
- **WHEN:** User presses combat keyboard shortcuts
- **THEN:** System SHALL:
  - Respond to stance hotkeys (1-4 for passive/defensive/aggressive/flee)
  - Respond to command hotkeys (A/H/R/P for attack/hold/retreat/patrol)
  - Toggle UI panels (L for combat log, T for tactical)
- **Verification:** Test all keyboard shortcuts, verify correct actions

---

## System Integration

### Existing Systems Affected
| System | File | Integration Type |
|--------|------|-----------------|
| Combat HUD (Partial) | `packages/renderer/src/CombatHUDPanel.ts` | Extend/Update |
| Health Bar Renderer | `packages/renderer/src/HealthBarRenderer.ts` | Extend/Update |
| Combat Unit Panel | `packages/renderer/src/CombatUnitPanel.ts` | Extend/Update |
| Stance Controls | `packages/renderer/src/StanceControls.ts` | Extend/Update |
| Combat Log | `packages/renderer/src/CombatLogPanel.ts` | Extend/Update |
| Threat Indicators | `packages/renderer/src/ThreatIndicatorRenderer.ts` | Extend/Update |
| EventBus | `packages/core/src/events/EventBus.ts` | Listen to Events |
| ActionQueue | `packages/core/src/actions/ActionQueue.ts` | Send Actions |
| MilitaryComponent | `packages/core/src/components/MilitaryComponent.ts` | Read Combat Stats |
| NeedsComponent | `packages/core/src/components/NeedsComponent.ts` | Read Health |
| BodyComponent | `packages/core/src/components/BodyComponent.ts` | Read Injuries |

### New Components Needed
- None (UI only, uses existing combat components)

### Events
- **Listens:**
  - `conflict:started` - When conflict begins
  - `conflict:resolved` - When conflict ends
  - `agent:injured` - When agent takes damage
  - `agent:died` - When agent dies
  - `threat:detected` - When threat enters detection range
  - `combat:attack` - Attack events
  - `combat:damage` - Damage dealt/received
  - `stance:changed` - Combat stance updated

- **Emits:**
  - `combat:stance_change_requested` - User requests stance change
  - `combat:ability_used` - User activates ability
  - `combat:target_selected` - User selects combat target
  - `ui:combat_log_toggled` - Combat log opened/closed
  - `ui:tactical_view_toggled` - Tactical view opened/closed

---

## UI Requirements

### Combat HUD (REQ-COMBAT-001)
- **Screen/Component:** Overlay on main game view
- **User Interactions:**
  - Auto-activates when conflict occurs
  - Click conflict icon to focus camera
  - Click unit to select for detailed view
- **Visual Elements:**
  - Conflict icons with type indicators
  - Threat level badge (color-coded)
  - Selected unit mini-panel
  - Recent events ticker
- **Layout:** Top-right corner, semi-transparent background

### Health Bars (REQ-COMBAT-002)
- **Screen/Component:** Floating above entities
- **User Interactions:**
  - Hover to see detailed health tooltip
  - Click to select entity
- **Visual Elements:**
  - Bar with foreground (current health) and background
  - Color coding: green (>75%), yellow (25-75%), red (<25%)
  - Injury icons below bar
  - Status effect icons
- **Layout:** Centered above entity sprite, 32px wide, 4px tall

### Combat Unit Panel (REQ-COMBAT-003)
- **Screen/Component:** Side panel when unit selected
- **User Interactions:**
  - View detailed stats
  - Click equipment to inspect
  - Click injury to see healing progress
- **Visual Elements:**
  - Portrait (48x48)
  - Stat bars (health, stamina)
  - Equipment slots with icons
  - Injury list with severity icons
  - Current action/stance display
- **Layout:** Right side panel, 300px wide

### Stance Controls (REQ-COMBAT-004)
- **Screen/Component:** Bottom-center or side panel
- **User Interactions:**
  - Click stance button to change
  - Hotkeys 1-4 for quick change
- **Visual Elements:**
  - 4 buttons: Passive, Defensive, Aggressive, Flee
  - Active stance highlighted
  - Icon and label for each
  - Tooltip on hover
- **Layout:** Horizontal row, 40x40 buttons

### Threat Indicators (REQ-COMBAT-005)
- **Screen/Component:** World overlay + edge indicators
- **User Interactions:**
  - Click to select threat
  - Hover to see threat details
- **Visual Elements:**
  - On-screen: Icon with pulsing ring for severity
  - Off-screen: Arrow at edge with distance
  - Color coding by threat level
- **Layout:** Positioned at entity location (on-screen) or screen edge (off-screen)

### Combat Log (REQ-COMBAT-006)
- **Screen/Component:** Bottom-left panel
- **User Interactions:**
  - Scroll through events
  - Filter by event type
  - Click event to focus entity
- **Visual Elements:**
  - Scrollable list of events
  - Color-coded by type
  - Timestamp
  - Icons for event types
- **Layout:** 400px wide, 200px tall

### Tactical Overview (REQ-COMBAT-007)
- **Screen/Component:** Full-screen overlay or large panel
- **User Interactions:**
  - Toggle with 'T' key
  - Pan/zoom map
  - Click units to select
- **Visual Elements:**
  - Minimap-style view
  - Unit icons (friendly/hostile/neutral)
  - Force strength summary
  - Battle odds display
- **Layout:** Center screen, 80% viewport

---

## Files Likely Modified

Based on the codebase structure:

- `packages/renderer/src/CombatHUDPanel.ts` - Complete implementation
- `packages/renderer/src/HealthBarRenderer.ts` - Add injury/status display
- `packages/renderer/src/CombatUnitPanel.ts` - Complete stats display
- `packages/renderer/src/StanceControls.ts` - Wire up to events
- `packages/renderer/src/CombatLogPanel.ts` - Add filtering and scrolling
- `packages/renderer/src/ThreatIndicatorRenderer.ts` - Add off-screen indicators
- `packages/renderer/src/Renderer.ts` - Integrate new panels
- `packages/renderer/src/InputHandler.ts` - Add keyboard shortcuts
- `packages/renderer/src/WindowManager.ts` - Manage panel visibility
- `packages/core/src/events/EventBus.ts` - Add combat event types
- `packages/core/src/components/MilitaryComponent.ts` - Verify combat stats available

New files:
- `packages/renderer/src/TacticalOverviewPanel.ts` - Strategic combat view
- `packages/renderer/src/AbilityBarPanel.ts` - Combat abilities (if implemented)
- `packages/renderer/src/DefenseManagementPanel.ts` - Defense controls (if implemented)
- `packages/renderer/src/DamageNumberRenderer.ts` - Floating damage text (if implemented)

---

## Notes for Implementation Agent

### Important Considerations

1. **Existing UI Components**: Several combat UI files already exist in the renderer package. Review them first to understand current implementation state before making changes.

2. **Conflict System Integration**: The UI must consume events from the conflict-system spec (ConflictType, ConflictResolution, AgentCombat, etc.). These types are defined in the spec but may not be implemented yet. The UI should be designed to work with placeholder data initially.

3. **Performance**: Health bars and threat indicators will render for many entities. Ensure rendering is optimized:
   - Only render health bars for visible entities
   - Cull off-screen threat indicators
   - Batch render operations where possible

4. **Responsiveness**: Combat happens in real-time. UI updates must be immediate:
   - Listen to EventBus for combat events
   - Update displays on event, not on polling
   - Use efficient data structures for quick lookups

5. **Keyboard Shortcuts**: Follow the KeyboardRegistry pattern from existing UI:
   - Register all shortcuts in one place
   - Handle conflicts with existing shortcuts
   - Provide visual feedback on activation

6. **Injury Display**: Injuries come from the conflict-system spec with specific types (laceration, puncture, blunt, burn, bite, exhaustion, psychological). Map each type to an appropriate icon and tooltip.

7. **Alien Species Combat**: The spec includes special combat modes (PackMindCombat, HiveWarfare, ManchiCombat). UI should support displaying these unique combat mechanics if relevant entities are selected.

8. **MUST/SHOULD/MAY Priority**: Implement in order:
   - MUST requirements first (Combat HUD, Health Bars, Unit Panel, Stance Controls, Threat Indicators)
   - SHOULD requirements next (Combat Log, Tactical Overview, Defense Management, Keyboard Shortcuts)
   - MAY requirements if time permits (Ability Bar, Damage Numbers)

### Gotchas

- The spec defines many TypeScript interfaces that may not exist in the codebase yet. You may need to create stub implementations that work with the existing ECS architecture.
- Health bars need to account for entities without health (buildings, items). Check for NeedsComponent or BodyComponent before rendering.
- Threat detection requires visibility/fog of war logic that may not be implemented. Start with simple distance-based detection.
- Combat stance changes should trigger ActionQueue actions, not direct component mutations.

---

## Notes for Playtest Agent

### Specific UI Behaviors to Verify

1. **Health Bar Visibility**:
   - Create multiple agents
   - Damage some to different health levels
   - Verify color transitions (green->yellow->red)
   - Check that injured agents always show bars (if alwaysShowInjured = true)

2. **Stance Control Responsiveness**:
   - Select one agent, change stance, verify behavior changes
   - Select multiple agents, verify "mixed" stance display if stances differ
   - Use hotkeys (1-4) to change stances quickly

3. **Combat Log Filtering**:
   - Generate various combat events (attacks, damage, misses, deaths)
   - Filter by event type, verify only matching events shown
   - Filter by entity, verify only that entity's events shown

4. **Threat Indicator Edge Cases**:
   - Spawn threat off-screen, verify edge indicator appears
   - Move camera to bring threat on-screen, verify indicator transitions
   - Multiple threats: verify all indicators render without overlap

5. **Tactical Overview Accuracy**:
   - Open during active combat
   - Verify friendly/hostile unit counts match reality
   - Check battle odds make sense (more/better units = positive odds)

6. **Keyboard Shortcut Conflicts**:
   - Test all shortcuts (1-4, A/H/R/P, L, T)
   - Verify no conflicts with existing game controls
   - Check shortcuts work when different panels are focused

### Edge Cases to Test

- No combat: Verify UI gracefully hides/disables
- Dead entities: Health bars should disappear, not show 0%
- Very high entity count: Performance test with 50+ agents in combat
- Rapid stance changes: Spam hotkeys, verify no state corruption
- Log overflow: Generate 1000+ combat events, verify log handles gracefully
