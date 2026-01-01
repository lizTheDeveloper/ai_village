# WORK_ORDER_READY: conflict-ui

**Timestamp:** 2025-12-31 16:48:50 UTC
**Agent:** spec-agent-001
**Attempt:** 496

---

## Status

✅ Work order VERIFIED and CONFIRMED as complete

## Work Order Location

**Primary Path:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**File Verified:** ✅ Exists (15,234 bytes, last modified 16:46)

---

## Summary

Feature: **Conflict/Combat UI** (Phase 16)
Spec: `openspec/specs/ui-system/conflict.md`
Status: **READY_FOR_TESTS**

### Requirements Coverage

**MUST Requirements:**
- ✅ REQ-COMBAT-001: Combat HUD - Active conflicts and threat status overlay
- ✅ REQ-COMBAT-002: Health Bars - Visual health indicators with injury display
- ✅ REQ-COMBAT-003: Combat Unit Panel - Detailed unit stats and equipment
- ✅ REQ-COMBAT-004: Stance Controls - Combat behavior settings
- ✅ REQ-COMBAT-005: Threat Indicators - World-space threat markers

**SHOULD Requirements:**
- ✅ REQ-COMBAT-006: Combat Log - Scrollable event history
- ✅ REQ-COMBAT-007: Tactical Overview - Strategic combat view
- ✅ REQ-COMBAT-009: Defense Management - Zone and patrol management
- ✅ REQ-COMBAT-011: Keyboard Shortcuts - Combat action hotkeys

**MAY Requirements:**
- ✅ REQ-COMBAT-008: Ability Bar - Quick combat actions
- ✅ REQ-COMBAT-010: Damage Numbers - Floating damage/heal text

---

## Acceptance Criteria

**11 Testable Criteria Defined:**

1. **Combat HUD Activation** - Appears on conflict:started events
2. **Health Bar Display** - Renders above entities with color-coded health
3. **Injury Indicators** - Shows injury icons on health bars
4. **Stance Control** - User can change unit combat stance
5. **Threat Indicators** - Displays threats with severity-based coloring
6. **Combat Log Events** - Records combat actions with timestamps
7. **Combat Unit Panel** - Shows stats/equipment on unit selection
8. **Tactical Overview** - Toggle strategic view with "T" key
9. **Defense Zone Management** - Create/assign zones and patrols
10. **Damage Numbers** - Floating text on damage/heal events
11. **Keyboard Shortcuts** - 1/2/3/4 for stances, L for log, T for tactical

---

## System Integration

### Existing Systems (EventBus Listeners)

| System | Events Consumed |
|--------|----------------|
| HuntingSystem | hunting:success, hunting:failed |
| PredatorAttackSystem | predator:attack |
| AgentCombatSystem | combat:attack, combat:damage, combat:death |
| InjurySystem | injury:inflicted |
| VillageDefenseSystem | defense:zone_threatened |
| GuardDutySystem | guard:duty_started |
| DominanceChallengeSystem | dominance:challenge |

### UI Components Status

**Already Implemented (MUST components exist):**
- ✅ CombatHUDPanel.ts
- ✅ HealthBarRenderer.ts
- ✅ CombatUnitPanel.ts
- ✅ StanceControls.ts
- ✅ ThreatIndicatorRenderer.ts
- ✅ CombatLogPanel.ts

**Needs Implementation (SHOULD/MAY components):**
- ⏳ TacticalOverviewPanel.ts (SHOULD)
- ⏳ DefenseManagementPanel.ts (SHOULD)
- ⏳ AbilityBar.ts (MAY)

**Can Reuse:**
- ✅ FloatingTextRenderer.ts (for damage numbers)

---

## Dependencies

All dependencies are satisfied:

- ✅ `conflict-system/spec.md` - HuntingSystem, AgentCombatSystem, InjurySystem implemented
- ✅ `agent-system/spec.md` - Agent stats and health system operational
- ✅ `ui-system/notifications.md` - Notification system in place

---

## Implementation Notes

### Critical Constraints

1. **No Debug Output** - Never add console.log/console.debug (use Agent Dashboard)
2. **EventBus Only** - UI listens to events, never modifies conflict-system state
3. **Performance Limits** - Max 50 damage numbers, 100 combat log events
4. **Existing Code First** - Review all existing components before implementing new ones

### Rendering Architecture

- **World-space:** Health bars, threat indicators (world coordinates)
- **Screen-space:** HUD, panels, controls (screen coordinates)
- **Z-ordering:** Combat HUD must be top-most UI layer

### Event Flow

```
Conflict System → EventBus.emit() → Combat UI listens → Renders display
                                  ↓
                           User interaction → UI emits control events
```

---

## Files Modified

### Will Update (Integration)
- `packages/renderer/src/Renderer.ts` - Add new panels to render loop
- `packages/renderer/src/WindowManager.ts` - Register new panels
- `packages/renderer/src/KeyboardRegistry.ts` - Register shortcuts
- `packages/renderer/src/index.ts` - Export new components

### Will Create (New Components)
- `packages/renderer/src/TacticalOverviewPanel.ts`
- `packages/renderer/src/DefenseManagementPanel.ts`
- `packages/renderer/src/AbilityBar.ts` (optional)

---

## Verification Checklist

Before marking implementation complete:

- [ ] All MUST components render correctly
- [ ] Health bars show at correct positions with proper colors
- [ ] Threat indicators display with severity-based styling
- [ ] Combat log captures all event types
- [ ] Stance controls emit correct events
- [ ] Keyboard shortcuts trigger actions
- [ ] No console.log statements in code
- [ ] Build passes (`npm run build`)
- [ ] No runtime errors in browser console

---

## Next Steps

**For Test Agent:**
1. Read work order at `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Create test plan covering all 11 acceptance criteria
3. Define event simulation strategy for each ConflictType
4. Prepare edge case scenarios (multiple conflicts, off-screen threats)

**For Implementation Agent:**
1. Review existing components (CombatHUDPanel, HealthBarRenderer, etc.)
2. Implement missing components (TacticalOverviewPanel, DefenseManagementPanel)
3. Integrate into Renderer and WindowManager
4. Register keyboard shortcuts in KeyboardRegistry
5. Test event flow with Agent Dashboard

**For Playtest Agent:**
1. Verify visual appearance of all UI elements
2. Test all interaction patterns (clicks, hovers, shortcuts)
3. Confirm event handling works correctly
4. Check performance with multiple active conflicts
5. Validate edge cases (off-screen, multiple injuries, etc.)

---

## Phase Context

**Phase 16 - UI System Implementation**

This work order adds the visual layer for the already-functional conflict-system. All backend mechanics (hunting, combat, injuries, village defense) are operational and emitting events. The UI purely consumes and displays this data.

**Scope Priority:**
1. **MUST** - Core combat visibility (HUD, health bars, stance controls)
2. **SHOULD** - Strategic tools (tactical view, defense management, log)
3. **MAY** - Enhanced feedback (ability bar, damage numbers)

---

## Estimated Complexity

- **Low:** Most MUST components already exist, need integration only
- **Medium:** Tactical overview and defense management require new implementations
- **High:** Must ensure consistent EventBus integration across all components

**Recommended Approach:** Start with MUST requirements (mostly integration), then SHOULD (new panels), finally MAY (polish).

---

Handing off to Test Agent for test plan creation.
