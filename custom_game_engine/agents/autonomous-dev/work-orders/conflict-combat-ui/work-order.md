# Work Order: Conflict/Combat UI

**Phase:** 16
**Created:** 2025-12-31
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## 💬 User Notes

> **This section contains context from the user about implementation difficulty, gotchas, or tips. Check this section FIRST before starting work!**

### Difficulty Assessment
- **Overall Complexity:** Medium-Hard
- **Hardest Part:** Coordinating multiple UI renderers with EventBus subscriptions without memory leaks
- **Easier Than It Looks:** Most combat data already exists in components; UI is just visualization

### User Tips
- 💡 **Start with HealthBarRenderer** - It's the simplest and most visible component
- 💡 **Follow existing UI patterns** - Look at AgentInfoPanel.ts and BuildingPlacementUI.ts for style consistency
- 💡 **Use EventBus cleanup** - Always store unsubscribers and call them in destroy()
- 🎯 **Test incrementally** - Add one renderer at a time and verify it works before moving on
- ⚠️ **Camera culling is critical** - Don't render health bars for off-screen entities

### Common Pitfalls
- ❌ **Don't forget to unsubscribe** - Memory leaks from EventBus are common
- ❌ **Don't render in wrong coordinate space** - Health bars are world space, HUD is screen space
- ❌ **Don't poll for combat state** - Use EventBus events, not frame-by-frame checks
- ✅ **DO batch rendering** - Use sprite batching for multiple health bars/threat indicators
- ✅ **DO test with many entities** - Test with 20+ units in combat to catch performance issues

### Questions to Ask User
- Should the combat HUD be always visible or only during combat?
- Should health bars persist on entities after combat ends, or only show when injured?
- What's the priority order if we can't implement all SHOULD/MAY features?

---

## Spec Reference

- **Primary Spec:** openspec/specs/ui-system/conflict.md
- **UI Spec:** openspec/specs/ui-system/conflict.md
- **Related Specs:**
  - openspec/specs/conflict-system/spec.md (Conflict mechanics)
  - openspec/specs/agent-system/spec.md (Agent stats)
  - openspec/specs/ui-system/notifications.md (Combat alerts)

---

## Requirements Summary

From the UI spec (ui-system/conflict.md):

1. The system MUST provide a Combat HUD overlay (REQ-COMBAT-001)
2. The system MUST display health bars for entities (REQ-COMBAT-002)
3. The system MUST show a detailed Combat Unit Panel (REQ-COMBAT-003)
4. The system MUST provide Stance Controls (REQ-COMBAT-004)
5. The system MUST display Threat Indicators (REQ-COMBAT-005)
6. The system SHOULD provide a scrollable Combat Log (REQ-COMBAT-006)
7. The system SHOULD provide a Tactical Overview (REQ-COMBAT-007)
8. The system MAY provide an Ability Bar (REQ-COMBAT-008)
9. The system SHOULD provide Defense Management UI (REQ-COMBAT-009)
10. The system MAY show floating Damage Numbers (REQ-COMBAT-010)
11. The system SHOULD provide Keyboard Shortcuts (REQ-COMBAT-011)

---

## Acceptance Criteria

### Criterion 1: Combat HUD Display
- **WHEN:** Combat begins or a threat is detected
- **THEN:** Combat HUD activates showing active conflicts, threat level, and selected units
- **Verification:** EventBus listens for `combat:started` event and displays HUD overlay

### Criterion 2: Health Bar Rendering
- **WHEN:** Entity is in combat, injured, selected, or hovered
- **THEN:** Health bar displays with color-coded health (green/yellow/red) and injury icons
- **Verification:** Health bar renders above entity with correct health percentage and color thresholds

### Criterion 3: Unit Panel Details
- **WHEN:** Combat unit is selected
- **THEN:** Panel shows combat stats, equipment, injuries, and current stance
- **Verification:** Panel displays stats from AgentComponent, equipment from InventoryComponent, and stance from CombatStatsComponent

### Criterion 4: Stance Control
- **WHEN:** User clicks stance button (passive/defensive/aggressive/flee)
- **THEN:** Selected units change combat stance and behavior updates
- **Verification:** Stance change emits event and updates entity's CombatStatsComponent

### Criterion 5: Threat Visualization
- **WHEN:** Threat exists in world (predator, hostile agent, etc.)
- **THEN:** Threat indicator shows position, severity, and type with visual pulse for high threats
- **Verification:** Threat indicators render at world positions with color-coded severity

### Criterion 6: Combat Log Events
- **WHEN:** Combat events occur (attack, damage, death, injury)
- **THEN:** Events appear in scrollable combat log with timestamps and participant names
- **Verification:** EventBus listeners for combat events populate log with formatted entries

### Criterion 7: Tactical Overview Map
- **WHEN:** Tactical overview is opened
- **THEN:** Shows all friendly/hostile units with force summary and battle predictions
- **Verification:** Overview displays unit positions, counts, and strength calculations

### Criterion 8: Keyboard Shortcuts
- **WHEN:** User presses stance hotkey (1-4) or command key (A/H/R/P)
- **THEN:** Corresponding action executes for selected units
- **Verification:** KeyboardRegistry binds shortcuts and triggers appropriate actions

---

## System Integration

### Existing Systems Affected

| System | File | Integration Type |
|--------|------|-----------------|
| Combat System | packages/core/src/systems/AgentCombatSystem.ts | EventBus |
| Injury System | packages/core/src/systems/InjurySystem.ts | EventBus |
| Event Bus | packages/core/src/events/EventBus.ts | Subscribe to events |
| Combat Components | packages/core/src/components/ConflictComponent.ts | Read component data |
| Combat Stats | packages/core/src/components/CombatStatsComponent.ts | Read/Write stats |
| Injury Component | packages/core/src/components/InjuryComponent.ts | Read injuries |
| Agent Component | packages/core/src/components/AgentComponent.ts | Read agent data |
| Renderer | packages/renderer/src/Renderer.ts | Add UI panels |
| Window Manager | packages/renderer/src/WindowManager.ts | Register panels |
| Input Handler | packages/renderer/src/InputHandler.ts | Mouse/keyboard input |

### New Components Needed

**Renderer Components:**
- `CombatHUDPanel.ts` - Main combat overlay
- `HealthBarRenderer.ts` - Entity health bars
- `CombatUnitPanel.ts` - Detailed unit info panel
- `StanceControls.ts` - Combat stance buttons
- `ThreatIndicatorRenderer.ts` - World threat markers
- `CombatLogPanel.ts` - Scrollable event log
- `TacticalOverviewPanel.ts` - Strategic map view
- `FloatingNumberRenderer.ts` - Damage/heal numbers
- `DefenseManagementPanel.ts` - Defense structures and zones

**Core Components (if needed):**
- May need to extend existing components, but most data is already in ConflictComponent, CombatStatsComponent, InjuryComponent

### Events

**Listens to (from EventMap.ts):**
- `combat:started` - Activate combat HUD
- `combat:ended` - Deactivate combat HUD
- `combat:attack` - Log attack event
- `combat:damage` - Show damage number, update health bar
- `combat:death` - Log death, show death indicator
- `combat:injury` - Show injury icon on health bar
- `combat:dodge` - Log dodge event
- `combat:block` - Log block event

**Emits:**
- `ui:stance:changed` - User changed unit stance
- `ui:combat:unit_selected` - User selected combat unit
- `ui:combat:hud_toggled` - Combat HUD toggled on/off
- `ui:combat:tactical_opened` - Tactical overview opened

---

## UI Requirements

### Combat HUD (Main Overlay)
- **Position:** Top-right corner of screen
- **Components:**
  - Threat level indicator (none/low/moderate/high/critical)
  - Active conflicts list (icon + participant count)
  - Selected unit quick stats
- **Interactions:** Click conflict to center camera, click unit to select

### Health Bars
- **Position:** Above each entity (world space)
- **Visual Elements:**
  - Bar with border (width: configurable, height: ~4-6px)
  - Color-coded: green (>60%), yellow (30-60%), red (<30%)
  - Injury icons below bar for active injuries
  - Status effect icons
- **Visibility:** Show when in combat, injured, hovered, or selected

### Combat Unit Panel
- **Position:** Left or bottom side panel
- **Sections:**
  - Portrait and name
  - Stats grid (combat skill, health, stamina, attack, defense)
  - Equipment icons (weapon, armor, shield)
  - Injury list with severity
  - Stance controls
  - Current action indicator
- **Layout:** Stacked vertical sections with collapsible headers

### Stance Controls
- **Position:** Part of Combat Unit Panel or separate toolbar
- **Buttons:** 4 buttons (passive, defensive, aggressive, flee)
- **Visual:** Icon + label, highlight active stance
- **Tooltip:** Show stance description on hover

### Threat Indicators
- **Position:** World space at threat location
- **Visual:** Pulsing icon with color-coded severity
- **Off-screen:** Arrow at screen edge pointing to threat with distance
- **Tooltip:** Threat type and description on hover

### Combat Log
- **Position:** Bottom-left or expandable side panel
- **Content:** Scrollable list of combat events with timestamps
- **Filtering:** Toggle event types (attack, damage, death, etc.)
- **Styling:** Color-coded by event type, icons for participants

### Tactical Overview
- **Position:** Full-screen overlay or large modal
- **Map View:** Minimap showing all units as colored dots
- **Force Summary:** Friendly vs hostile counts and strength
- **Battle Prediction:** Win probability and factors

---

## Files Likely Modified

Based on codebase structure:

**New Files:**
- `packages/renderer/src/CombatHUDPanel.ts`
- `packages/renderer/src/HealthBarRenderer.ts`
- `packages/renderer/src/CombatUnitPanel.ts`
- `packages/renderer/src/StanceControls.ts`
- `packages/renderer/src/ThreatIndicatorRenderer.ts`
- `packages/renderer/src/CombatLogPanel.ts`
- `packages/renderer/src/TacticalOverviewPanel.ts`
- `packages/renderer/src/FloatingNumberRenderer.ts`
- `packages/renderer/src/DefenseManagementPanel.ts`

**Modified Files:**
- `packages/renderer/src/Renderer.ts` - Integrate combat UI renderers
- `packages/renderer/src/WindowManager.ts` - Register combat panels
- `packages/renderer/src/InputHandler.ts` - Handle combat UI input
- `packages/renderer/src/MenuBar.ts` - Add combat UI toggle buttons
- `packages/renderer/src/index.ts` - Export new components
- `packages/core/src/events/EventMap.ts` - Add UI-specific combat events if needed

---

## Notes for Implementation Agent

**Rendering Order:**
- Health bars render in world space (before UI overlay)
- Threat indicators render in world space
- Floating damage numbers render in world space
- HUD, panels, and controls render in screen space overlay

**Performance Considerations:**
- Only render health bars for visible entities (camera frustum culling)
- Limit combat log to last N events (e.g., 100) to prevent memory growth
- Use sprite batching for threat indicators if many exist

**Styling:**
- Follow existing UI panel style (see AgentInfoPanel.ts, BuildingPlacementUI.ts)
- Use consistent colors defined in CombatStyle (from spec)
- Maintain 8-bit pixel art aesthetic

**State Management:**
- Combat state should be centralized (possibly in Renderer or separate CombatUIManager)
- Subscribe to EventBus events in componentDidMount/constructor
- Unsubscribe in cleanup to prevent memory leaks

**Integration Pattern:**
```typescript
// Example: HealthBarRenderer integration in Renderer.ts
import { HealthBarRenderer } from './HealthBarRenderer.js';

export class Renderer {
  private healthBarRenderer: HealthBarRenderer;

  constructor() {
    this.healthBarRenderer = new HealthBarRenderer(this.eventBus);
  }

  render() {
    // ... existing rendering ...

    // Render health bars in world space
    this.healthBarRenderer.render(this.ctx, this.camera, this.world);

    // ... UI overlay rendering ...
  }
}
```

**EventBus Subscription Pattern:**
```typescript
// Example: Combat log subscribing to events
export class CombatLogPanel {
  private unsubscribers: Array<() => void> = [];

  constructor(private eventBus: EventBus) {
    this.unsubscribers.push(
      eventBus.subscribe('combat:attack', this.onAttack.bind(this)),
      eventBus.subscribe('combat:damage', this.onDamage.bind(this)),
      eventBus.subscribe('combat:death', this.onDeath.bind(this))
    );
  }

  destroy() {
    this.unsubscribers.forEach(unsub => unsub());
  }
}
```

---

## Notes for Playtest Agent

**Key UI Behaviors to Verify:**

1. **Health Bar Visibility**
   - Health bars should appear when entity is in combat
   - Health bars should persist on injured entities
   - Health bars should appear on hover
   - Color changes should be smooth and accurate

2. **Stance Control Responsiveness**
   - Clicking stance button should immediately update UI
   - Agent behavior should change within 1-2 game ticks
   - Multiple unit selection should show "mixed" if stances differ

3. **Threat Indicator Accuracy**
   - Threats should appear when predator/hostile enters detection range
   - Off-screen threats should show edge arrows
   - Threat severity should update dynamically

4. **Combat Log Ordering**
   - Events should appear in chronological order
   - Log should auto-scroll to newest event
   - Filter toggles should work immediately

5. **Performance Edge Cases**
   - Test with 20+ entities in combat simultaneously
   - Test with 50+ log events
   - Test rapid stance changes on large unit groups

6. **Keyboard Shortcuts**
   - All shortcuts should work when combat UI is active
   - Shortcuts should not conflict with existing game controls
   - Holding shift should apply to all selected units

**Specific Scenarios:**
- Start combat between 2 agents and verify all UI elements activate
- Inflict injury and verify injury icon appears on health bar
- Select unit, change stance, and verify behavior changes
- Trigger predator attack and verify threat indicator appears
- Fill combat log with 100+ events and verify scrolling works
- Open tactical overview during village raid defense
