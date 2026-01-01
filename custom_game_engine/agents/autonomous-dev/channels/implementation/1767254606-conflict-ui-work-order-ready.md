# WORK ORDER READY: conflict-ui

**Timestamp:** 1767254606
**Phase:** 7
**Agent:** spec-agent-001
**Attempt:** 906

---

## Work Order Created

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Spec Reference:** `openspec/specs/ui-system/conflict.md`

**Dependencies:** All met ✅
- conflict-system/spec.md - ✅ Combat mechanics defined
- agent-system/spec.md - ✅ Agent stats available
- ui-system/notifications.md - ✅ Alert system exists

---

## Requirements Summary

The Conflict UI work order includes **11 requirements**:

### MUST (Priority 1)
1. Combat HUD overlay (REQ-COMBAT-001)
2. Health bar rendering (REQ-COMBAT-002)
3. Combat Unit Panel (REQ-COMBAT-003)
4. Stance controls (REQ-COMBAT-004)
5. Threat indicators (REQ-COMBAT-005)

### SHOULD (Priority 2)
6. Combat log (REQ-COMBAT-006)
7. Tactical overview (REQ-COMBAT-007)
8. Defense management (REQ-COMBAT-009)
9. Keyboard shortcuts (REQ-COMBAT-011)

### MAY (Priority 3)
10. Ability bar (REQ-COMBAT-008)
11. Floating damage numbers (REQ-COMBAT-010)

---

## Existing Components Found

The following combat UI components **already exist** in the codebase:
- ✅ CombatHUDPanel.ts
- ✅ CombatUnitPanel.ts
- ✅ StanceControls.ts
- ✅ CombatLogPanel.ts
- ✅ HealthBarRenderer.ts
- ✅ ThreatIndicatorRenderer.ts

**Implementation focus:** Verify existing components, fill gaps, integrate with EventBus.

---

## Acceptance Criteria

Work order defines **12 acceptance criteria** covering:
- Combat HUD activation/deactivation
- Health bar display and color coding
- Injury indicators
- Combat unit panel integration
- Stance control functionality
- Threat indicator rendering (on-screen and off-screen)
- Combat log event tracking and filtering
- Tactical overview display
- Keyboard shortcut bindings

---

## Integration Points

### Systems Affected
- AgentCombatSystem - EventBus integration
- HealthBarRenderer - Enhancement needed
- ThreatIndicatorRenderer - Off-screen logic needed
- Renderer - Add combat UI to render loop
- WindowManager - Register combat panels
- KeyboardRegistry - Add combat hotkeys

### Events to Listen
- combat:started - Activate combat HUD
- combat:ended - Deactivate combat HUD
- threat:detected - Add threat indicator
- injury:inflicted - Update health bars
- unit:death - Remove from tracking

---

## Status

✅ **READY FOR TEST AGENT**

The work order is complete with:
- Full requirements breakdown (11 REQs from spec)
- 12 detailed acceptance criteria with verification steps
- System integration mapping
- UI requirements with layout specifications
- Files to modify/create
- Implementation priority guidance
- Playtest scenarios and edge cases

---

## Next Step

**Test Agent:** Please create test suite for conflict-ui based on this work order.
