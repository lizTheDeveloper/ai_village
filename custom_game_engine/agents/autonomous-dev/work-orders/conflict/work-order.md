# Work Order: Conflict/Combat UI

**Phase:** 16
**Created:** 2025-12-31
**Spec Agent:** spec-agent-001
**Status:** IMPLEMENTED

> **2026-01-11 ROOT CAUSE FIX:** Actions `hunt` and `initiate_combat` were not appearing in LLM prompts because `StructuredPromptBuilder.ts` and `ActionBuilder.ts` lacked a combat category. Fixed by adding combat/hunting section that includes these actions when agent has combat skill ≥1. Dev actions `trigger-hunt` and `trigger-combat` also added for testing.

> **2026-01-11 UI INTEGRATION:** Combat UI components (HealthBarRenderer, ThreatIndicatorRenderer) integrated into Renderer.ts via `initCombatUI()` method. Wired up in main.ts. HTML panels (CombatHUDPanel, StanceControls, CombatLogPanel, CombatUnitPanel) are fully implemented and exported, ready for WindowManager integration.

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
- `TacticalOverviewPanel.ts` - Strategic map view (SHOULD)
- `FloatingNumberRenderer.ts` - Damage/heal numbers (MAY)
- `DefenseManagementPanel.ts` - Defense structures and zones (SHOULD)

**Core Components:**
- Most data already exists in ConflictComponent, CombatStatsComponent, InjuryComponent
- May need to extend EventMap.ts with UI-specific events

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
- `threat:detected` - Show threat indicator
- `threat:removed` - Remove threat indicator

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
- **Layout:** Compact vertical panel, semi-transparent background

### Health Bars
- **Position:** Above each entity (world space)
- **Visual Elements:**
  - Bar with border (width: 32-48px, height: 4-6px)
  - Color-coded: green (>60%), yellow (30-60%), red (<30%)
  - Injury icons below bar for active injuries
  - Status effect icons
- **Visibility:** Show when in combat, injured, hovered, or selected
- **Culling:** Only render for on-screen entities

### Combat Unit Panel
- **Position:** Left or bottom side panel
- **Sections:**
  - Portrait and name (top)
  - Stats grid (combat skill, health, stamina, attack, defense)
  - Equipment icons (weapon, armor, shield) with durability
  - Injury list with severity and healing progress
  - Stance controls (4 buttons)
  - Current action indicator
- **Layout:** Stacked vertical sections with collapsible headers

### Stance Controls
- **Position:** Part of Combat Unit Panel or separate toolbar
- **Buttons:** 4 buttons (passive, defensive, aggressive, flee)
- **Visual:** Icon + label, highlight active stance with border/color
- **Tooltip:** Show stance description on hover
- **Hotkeys:** 1-4 for quick stance changes

### Threat Indicators
- **Position:** World space at threat location
- **Visual:** Pulsing icon with color-coded severity
  - Low: Yellow, small pulse
  - Moderate: Orange, medium pulse
  - High: Red, fast pulse
  - Critical: Red, large pulse + warning border
- **Off-screen:** Arrow at screen edge pointing to threat with distance label
- **Tooltip:** Threat type and description on hover

### Combat Log
- **Position:** Bottom-left or expandable side panel
- **Content:** Scrollable list of combat events with timestamps
- **Filtering:** Toggle event types (attack, damage, death, injury, dodge, block)
- **Styling:** Color-coded by event type, icons for participants
- **Auto-scroll:** Scroll to newest event when log is at bottom
- **Max Events:** Limit to 100 events, remove oldest

### Tactical Overview (SHOULD)
- **Position:** Full-screen overlay or large modal
- **Map View:** Minimap showing all units as colored dots
  - Friendly: Green
  - Hostile: Red
  - Neutral: Gray
- **Force Summary:** Friendly vs hostile counts and strength
- **Battle Prediction:** Win probability and factors
- **Controls:** Close button, toggle layers (terrain, ranges)

---

## Files Likely Modified

Based on codebase structure:

**New Files:**
- `packages/renderer/src/CombatHUDPanel.ts` - MUST
- `packages/renderer/src/HealthBarRenderer.ts` - MUST
- `packages/renderer/src/CombatUnitPanel.ts` - MUST
- `packages/renderer/src/StanceControls.ts` - MUST
- `packages/renderer/src/ThreatIndicatorRenderer.ts` - MUST
- `packages/renderer/src/CombatLogPanel.ts` - SHOULD
- `packages/renderer/src/TacticalOverviewPanel.ts` - SHOULD (defer if time-constrained)
- `packages/renderer/src/FloatingNumberRenderer.ts` - MAY (defer if time-constrained)
- `packages/renderer/src/DefenseManagementPanel.ts` - SHOULD (defer if time-constrained)

**Modified Files:**
- `packages/renderer/src/Renderer.ts` - Integrate combat UI renderers
- `packages/renderer/src/WindowManager.ts` - Register combat panels
- `packages/renderer/src/InputHandler.ts` - Handle combat UI input (clicks, hotkeys)
- `packages/renderer/src/MenuBar.ts` - Add combat UI toggle buttons
- `packages/renderer/src/index.ts` - Export new components
- `packages/core/src/events/EventMap.ts` - Add UI-specific combat events if needed

---

## Notes for Implementation Agent

**Implementation Priority:**

**Phase 1 (MUST):**
1. HealthBarRenderer - Most visible, test with existing agents
2. StanceControls - Simple button UI, test with agent selection
3. ThreatIndicatorRenderer - Visual feedback for threats
4. CombatHUDPanel - Main overlay, integrates with above
5. CombatUnitPanel - Detailed stats panel

**Phase 2 (SHOULD):**
6. CombatLogPanel - Scrollable event log
7. Keyboard shortcuts - Hotkey bindings

**Phase 3 (Defer if needed):**
8. TacticalOverviewPanel - Strategic map view
9. FloatingNumberRenderer - Damage numbers
10. DefenseManagementPanel - Defense structures

**Rendering Order:**
- Health bars render in world space (before UI overlay)
- Threat indicators render in world space
- Floating damage numbers render in world space
- HUD, panels, and controls render in screen space overlay

**Performance Considerations:**
- Only render health bars for visible entities (camera frustum culling)
- Limit combat log to last 100 events to prevent memory growth
- Use sprite batching for threat indicators if many exist
- Batch all health bar rendering in a single draw call

**Styling:**
- Follow existing UI panel style (see AgentInfoPanel.ts, BuildingPlacementUI.ts)
- Use consistent colors defined in CombatStyle (from spec)
- Maintain 8-bit pixel art aesthetic
- Use clear borders and backgrounds for readability

**State Management:**
- Combat state should be centralized (possibly in Renderer or separate CombatUIManager)
- Subscribe to EventBus events in constructor/init
- Unsubscribe in cleanup/destroy to prevent memory leaks
- Track selected units globally for multi-component access

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

    // Render health bars in world space (after entities, before UI)
    this.ctx.save();
    this.healthBarRenderer.render(this.ctx, this.camera, this.world);
    this.ctx.restore();

    // ... UI overlay rendering ...
  }

  destroy() {
    this.healthBarRenderer.destroy();
  }
}
```

**EventBus Subscription Pattern:**
```typescript
// Example: Combat log subscribing to events
export class CombatLogPanel {
  private unsubscribers: Array<() => void> = [];
  private events: CombatLogEvent[] = [];

  constructor(private eventBus: EventBus) {
    this.unsubscribers.push(
      eventBus.subscribe('combat:attack', this.onAttack.bind(this)),
      eventBus.subscribe('combat:damage', this.onDamage.bind(this)),
      eventBus.subscribe('combat:death', this.onDeath.bind(this))
    );
  }

  private onAttack(event: CombatAttackEvent): void {
    this.events.push({
      type: 'attack',
      timestamp: event.timestamp,
      message: `${event.attacker} attacks ${event.target}`,
      color: '#FFA500'
    });

    // Limit to 100 events
    if (this.events.length > 100) {
      this.events.shift();
    }
  }

  destroy() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}
```

**Camera Culling Example:**
```typescript
// Example: Only render health bars for visible entities
export class HealthBarRenderer {
  render(ctx: CanvasRenderingContext2D, camera: Camera, world: World): void {
    const visibleBounds = camera.getVisibleBounds();

    for (const entity of world.getEntities()) {
      const position = entity.getComponent('position');
      if (!position) continue;

      // Cull off-screen entities
      if (!visibleBounds.contains(position.x, position.y)) {
        continue;
      }

      // Check if should render health bar
      if (this.shouldShowHealthBar(entity)) {
        this.renderHealthBar(ctx, camera, entity);
      }
    }
  }

  private shouldShowHealthBar(entity: Entity): boolean {
    // Show if in combat, injured, selected, or hovered
    const combat = entity.getComponent('conflict');
    const injury = entity.getComponent('injury');
    const isSelected = this.isEntitySelected(entity.id);
    const isHovered = this.isEntityHovered(entity.id);

    return !!(combat?.isInCombat || injury?.injuries.length > 0 || isSelected || isHovered);
  }
}
```

**Coordinate Space Conversion:**
```typescript
// Convert world coordinates to screen coordinates for health bars
function worldToScreen(worldPos: Vector2, camera: Camera): Vector2 {
  return {
    x: (worldPos.x - camera.x) * camera.zoom,
    y: (worldPos.y - camera.y) * camera.zoom
  };
}
```

---

## Notes for Playtest Agent

**Key UI Behaviors to Verify:**

1. **Health Bar Visibility**
   - Health bars should appear when entity is in combat
   - Health bars should persist on injured entities
   - Health bars should appear on hover
   - Color changes should be smooth and accurate (green > 60%, yellow 30-60%, red < 30%)
   - Health bars should not render for off-screen entities

2. **Stance Control Responsiveness**
   - Clicking stance button should immediately update UI
   - Agent behavior should change within 1-2 game ticks
   - Multiple unit selection should show "mixed" if stances differ
   - Hotkeys (1-4) should work correctly

3. **Threat Indicator Accuracy**
   - Threats should appear when predator/hostile enters detection range
   - Off-screen threats should show edge arrows with distance
   - Threat severity should update dynamically
   - Color coding should match severity (yellow/orange/red)
   - Pulse animation should be visible and not too fast/slow

4. **Combat Log Ordering**
   - Events should appear in chronological order
   - Log should auto-scroll to newest event when at bottom
   - Filter toggles should work immediately
   - Event colors should be distinct and readable
   - Log should limit to 100 events (check with stress test)

5. **Performance Edge Cases**
   - Test with 20+ entities in combat simultaneously
   - Test with 50+ log events
   - Test rapid stance changes on large unit groups
   - Check framerate doesn't drop below 30fps during combat

6. **Keyboard Shortcuts**
   - All shortcuts should work when combat UI is active
   - Shortcuts should not conflict with existing game controls
   - Holding shift should apply to all selected units (if implemented)

**Specific Scenarios:**

### Scenario 1: Basic Combat
1. Start game with 2+ agents
2. Force combat between agents
3. **Verify:**
   - Health bars appear on both combatants
   - Combat HUD activates in top-right
   - Combat log shows attack events
   - Threat indicators appear (if applicable)

### Scenario 2: Injury Display
1. Inflict injury on agent during combat
2. **Verify:**
   - Injury icon appears below health bar
   - Health bar color reflects reduced health
   - Combat log shows injury event
   - Unit panel displays injury details

### Scenario 3: Stance Changes
1. Select unit
2. Click stance button (or press 1-4)
3. **Verify:**
   - Stance button highlights
   - Agent behavior changes appropriately
   - Combat log shows stance change (if logged)

### Scenario 4: Predator Attack
1. Trigger predator attack event
2. **Verify:**
   - Threat indicator appears at predator location
   - Off-screen indicator shows direction if predator is off-screen
   - Combat HUD shows threat level increase
   - Combat log shows predator attack event

### Scenario 5: Combat Log Stress Test
1. Trigger many combat events (use script or long battle)
2. Fill log with 100+ events
3. **Verify:**
   - Log scrolling works smoothly
   - Oldest events are removed
   - No performance degradation
   - Filter toggles still work

### Scenario 6: Tactical Overview (if implemented)
1. Open tactical overview during combat
2. **Verify:**
   - All units displayed correctly
   - Force summary shows accurate counts
   - Battle prediction displays
   - Can close and reopen without issues

**Bug Checklist:**
- [ ] No memory leaks from EventBus subscriptions
- [ ] Health bars render in correct coordinate space
- [ ] No duplicate event listeners
- [ ] UI panels don't block game input
- [ ] No console errors during combat
- [ ] All TypeScript types are correct (no `any`)
- [ ] No silent fallback violations (crash on missing data)

**Performance Benchmarks:**
- Health bar rendering should take < 5ms for 20 entities
- Combat log should handle 100 events without lag
- Threat indicators should render in < 2ms for 10 threats
- No frame drops during active combat

---

## Testing Checklist

- [ ] HealthBarRenderer shows for combat, injured, selected, hovered entities
- [ ] Health bar colors match thresholds (green/yellow/red)
- [ ] Injury icons appear below health bars
- [ ] StanceControls buttons work and highlight active stance
- [ ] Hotkeys 1-4 change stance correctly
- [ ] ThreatIndicators appear at correct world positions
- [ ] Off-screen threats show edge arrows
- [ ] CombatHUDPanel activates on combat start
- [ ] CombatUnitPanel shows stats for selected unit
- [ ] CombatLogPanel shows events in chronological order
- [ ] Log auto-scrolls to newest event
- [ ] Log filters work correctly
- [ ] Log limits to 100 events
- [ ] All EventBus subscriptions are cleaned up on destroy
- [ ] No performance degradation with 20+ entities
- [ ] No console errors during normal operation
- [ ] Build passes: `npm run build`
- [ ] TypeScript types are correct (no `any` or fallbacks)

---

## Completion Criteria

This work order is complete when:

1. ✅ All MUST requirements are implemented (REQ-COMBAT-001 through REQ-COMBAT-005)
2. ✅ All acceptance criteria pass verification
3. ✅ Build passes without errors: `npm run build`
4. ✅ No console errors in browser during combat
5. ✅ All EventBus subscriptions properly cleaned up
6. ✅ Performance benchmarks met (< 5ms for 20 health bars)
7. ✅ Playtest agent verifies all scenarios

**Defer to future work:**
- SHOULD requirements (Combat Log, Tactical Overview, Defense Management) if time-constrained
- MAY requirements (Ability Bar, Damage Numbers) unless trivial to implement

**Success Metric:**
Player can visually understand combat status through health bars, threat indicators, stance controls, and combat HUD without reading code or logs.
