# WORK ORDER CREATED: conflict-combat-ui

**Timestamp:** 2025-12-31T07:30:32Z
**Spec Agent:** spec-agent-001
**Attempt:** #247
**Status:** READY_FOR_TESTS

---

## Summary

Work order successfully created for **conflict/combat-ui** feature.

**Work Order Location:**
```
agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md
```

---

## Spec Analysis

### Primary Spec
- `openspec/specs/ui-system/conflict.md` (Combat/Conflict UI Specification v0.1.0)

### Dependencies
- ✅ `conflict-system/spec.md` - Conflict mechanics (ConflictType, AgentCombat, Injury, Death)
- ✅ `agent-system/spec.md` - Agent stats and skills
- ✅ `ui-system/notifications.md` - Combat alerts

**All dependencies are met.** Conflict system provides the data; UI is visualization layer.

---

## Requirements Breakdown

### MUST Implement (Priority 1)
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bars with injury indicators
3. REQ-COMBAT-003: Combat Unit Panel with stats/equipment
4. REQ-COMBAT-004: Stance controls (passive/defensive/aggressive/flee)
5. REQ-COMBAT-005: Threat indicators (world-space markers)

### SHOULD Implement (Priority 2)
6. REQ-COMBAT-006: Combat log (scrollable event history)
7. REQ-COMBAT-007: Tactical overview (strategic map)
9. REQ-COMBAT-009: Defense management (zones/structures)
11. REQ-COMBAT-011: Keyboard shortcuts (1-4, A/H/R/P, Q/W/E/R, L/T)

### MAY Implement (Priority 3)
8. REQ-COMBAT-008: Ability bar (quick-access abilities)
10. REQ-COMBAT-010: Floating damage numbers

---

## System Integration Points

### EventBus Events (Listens)
- `conflict:started` → Activate Combat HUD
- `conflict:resolved` → Deactivate Combat HUD
- `combat:attack` → Log attack, show animation
- `combat:damage` → Floating number, health bar update
- `combat:injury` → Injury icon on health bar
- `combat:death` → Death indicator, log entry
- `combat:dodge` / `combat:block` → Log entry

### EventBus Events (Emits)
- `ui:stance:changed` → User changed combat stance
- `ui:combat:unit_selected` → Unit selected in combat
- `ui:combat:hud_toggled` → HUD toggled on/off
- `ui:combat:tactical_opened` → Tactical view opened

### Components to Read
- `ConflictComponent` → Active conflicts
- `CombatStatsComponent` → Combat skill, stance
- `InjuryComponent` → Active injuries
- `AgentComponent` → Agent data (name, portrait)
- `InventoryComponent` → Equipped weapon/armor

### New Components Needed
- `CombatStanceComponent` (if not in CombatStatsComponent)
- `ThreatComponent` (mark entities as threats with severity)
- `HealthBarVisibilityComponent` (control when health bar shows)

---

## Files to Create

### Renderer Components
1. `packages/renderer/src/CombatHUDPanel.ts` → Main combat overlay (IWindowPanel)
2. `packages/renderer/src/HealthBarRenderer.ts` → World-space health bars
3. `packages/renderer/src/CombatUnitPanel.ts` → Detailed unit info (IWindowPanel)
4. `packages/renderer/src/StanceControls.ts` → Stance button UI
5. `packages/renderer/src/ThreatIndicatorRenderer.ts` → World-space threat markers
6. `packages/renderer/src/CombatLogPanel.ts` → Event log (IWindowPanel)
7. `packages/renderer/src/TacticalOverviewPanel.ts` → Strategic map (IWindowPanel)
8. `packages/renderer/src/FloatingNumberRenderer.ts` → Damage/heal numbers
9. `packages/renderer/src/DefenseManagementPanel.ts` → Defense zones (IWindowPanel)

### Core Components (if needed)
10. `packages/core/src/components/CombatStanceComponent.ts` (if not exists)
11. `packages/core/src/components/ThreatComponent.ts`
12. `packages/core/src/components/HealthBarVisibilityComponent.ts`

---

## Acceptance Criteria

### Critical Path (MUST)
1. ✅ Combat HUD activates on `conflict:started` event
2. ✅ Health bars display with color coding (green/yellow/red)
3. ✅ Combat Unit Panel shows stats, equipment, injuries
4. ✅ Stance controls change entity behavior
5. ✅ Threat indicators mark dangerous entities

### Enhanced Features (SHOULD)
6. ✅ Combat log shows chronological events with filtering
7. ✅ Tactical overview displays force comparison
8. ✅ Defense zones assignable with guards
9. ✅ Keyboard shortcuts functional (1-4, A/H/R/P, etc.)

### Polish Features (MAY)
10. ✅ Ability bar shows available abilities
11. ✅ Floating damage numbers animate

---

## Special Notes

### Rendering Architecture
- **World Space:** Health bars, threat indicators, damage numbers
- **Screen Space:** HUD, panels, controls (HTML overlay)
- **Coordinate Conversion:** Use Camera.worldToScreen() for world-space rendering

### Performance Considerations
- ⚠️ Only render health bars for visible entities (camera culling)
- ⚠️ Limit combat log to last 100 events
- ⚠️ Use sprite batching for threat indicators
- ⚠️ Object pool for floating numbers

### Error Handling (CLAUDE.md)
- ❌ NO silent fallbacks
- ✅ Throw immediately if event missing required fields
- ✅ Validate ConflictType, participants, location on `conflict:started`
- ✅ Log errors with context before throwing

### Component Naming (CLAUDE.md)
```typescript
// CORRECT
export class CombatStanceComponent extends ComponentBase {
  public readonly type = 'combat_stance'; // lowercase_with_underscores
}

// WRONG
public readonly type = 'CombatStance'; // ❌ PascalCase
```

### EventBus Cleanup Pattern
```typescript
export class CombatHUDPanel implements IWindowPanel {
  private unsubscribers: Array<() => void> = [];

  constructor(private eventBus: EventBus) {
    this.unsubscribers.push(
      eventBus.subscribe('conflict:started', this.onConflictStart.bind(this))
    );
  }

  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
  }
}
```

---

## Handing Off to Test Agent

The work order is complete and ready for the **Test Agent** to:
1. Read the work order and spec
2. Create test files for all acceptance criteria
3. Write skeleton tests with `.skip()` initially
4. Document expected behavior for each test

Once tests are written, the **Implementation Agent** will:
1. Read work order and tests
2. Implement features to pass tests
3. Run tests incrementally (remove `.skip()` as features complete)
4. Fix bugs until all tests pass

---

## Phase Context

This is **Phase 10** of the master roadmap. Combat/Conflict UI is a visualization layer for the conflict-system backend. The conflict-system handles all game logic (damage, injuries, death); the UI only *displays* this data.

**Previous Phases Completed:**
- Phase 1-9: Core systems, building, resources, animals, plants, sleep, combat mechanics

**Next Phases:**
- Phase 11+: Advanced features building on combat UI

---

**Status:** ✅ WORK ORDER READY FOR TESTS

**Next Agent:** test-agent-001
