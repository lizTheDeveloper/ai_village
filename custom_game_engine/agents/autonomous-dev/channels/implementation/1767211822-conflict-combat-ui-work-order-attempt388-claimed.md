# CLAIMED: conflict-combat-ui

**Attempt:** #388
**Status:** CLAIMED
**Timestamp:** 2025-12-31 12:09:00
**Spec Agent:** spec-agent-001

---

## Work Order Created

**Location:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Phase:** Phase 7 - Conflict & Social Complexity
**Specs:**
- Primary: `openspec/specs/ui-system/conflict.md`
- Related: `openspec/specs/conflict-system/spec.md`

---

## Requirements Summary

The work order covers 11 requirements from the conflict/combat UI spec:

### MUST Requirements (REQ-COMBAT-001 to REQ-COMBAT-005)
1. Combat HUD overlay - displays active conflicts and threats
2. Health bars - renders above entities based on health/combat state
3. Combat Unit Panel - detailed entity stats view
4. Stance Controls - combat behavior settings (passive/defensive/aggressive/flee)
5. Threat Indicators - visual warnings for dangers

### SHOULD Requirements (REQ-COMBAT-006, 007, 009, 011)
6. Combat Log - scrollable event history
7. Tactical Overview - strategic combat view
9. Defense Management - structures and zones
11. Keyboard Shortcuts - hotkeys for combat actions

### MAY Requirements (REQ-COMBAT-008, 010)
8. Ability Bar - quick access to combat abilities
10. Damage Numbers - floating combat feedback

---

## Existing Implementation Status

**Partially Implemented** - The following UI components already exist:
- ✅ `CombatHUDPanel.ts` - Active conflict display
- ✅ `HealthBarRenderer.ts` - Health bar rendering
- ✅ `CombatLogPanel.ts` - Combat event log
- ✅ `CombatUnitPanel.ts` - Unit stats display
- ✅ `StanceControls.ts` - Stance selection UI
- ✅ `ThreatIndicatorRenderer.ts` - Threat icons

**Implementation Focus:**
- Verify components match spec requirements
- Ensure event integration works correctly
- Add missing features per spec
- Write comprehensive tests

---

## System Integration

**Event Consumption:**
- `conflict:started` - New conflict begins
- `conflict:resolved` - Conflict ends
- `combat:attack` - Attack/damage event
- `entity:injured` - Injury inflicted
- `entity:death` - Entity dies
- `threat:detected` - New threat appears
- `predator:attack` - Predator attacks agent
- `hunting:attempt` - Agent hunts animal
- `dominance:challenge` - Dominance challenge starts

**Event Emission:**
- `ui:stance_changed` - User changes entity stance
- `ui:focus_conflict` - User clicks conflict to focus camera
- `ui:combat_log_filtered` - User applies log filters

**Systems Affected:**
- EventBus (event consumption)
- WindowManager (panel registration)
- KeyboardRegistry (hotkey binding)
- All conflict-related systems (HuntingSystem, PredatorAttackSystem, AgentCombatSystem, etc.)

---

## Dependencies

All dependencies met ✅

**Required Specs:**
- ✅ `conflict-system/spec.md` - Conflict mechanics (implemented)
- ✅ `agent-system/spec.md` - Agent stats (implemented)
- ✅ `ui-system/notifications.md` - Combat alerts (implemented)

**Required Systems:**
- ✅ HuntingSystem - Emits hunting events
- ✅ PredatorAttackSystem - Emits predator attack events
- ✅ AgentCombatSystem - Emits agent combat events
- ✅ DominanceChallengeSystem - Emits dominance events
- ✅ GuardDutySystem - Emits guard duty events
- ✅ EventBus - Event propagation infrastructure

---

## Testing Strategy

**Unit Tests:**
- CombatHUDPanel event handling
- HealthBarRenderer rendering logic
- CombatLogPanel event logging
- CombatUnitPanel data display
- StanceControls stance updates
- ThreatIndicatorRenderer threat tracking

**Integration Tests:**
- Event flow from systems to UI
- Stance changes propagate to entity components
- Combat log captures all conflict events
- Health bars update on damage/healing
- Threat indicators track predators/hostiles

**Visual Tests:**
- Playwright screenshots of combat UI
- Health bar colors at thresholds
- Threat indicator positioning
- Combat log formatting

**Dashboard Verification:**
- curl queries to verify metrics
- Check conflict event counts
- Verify threat detection

---

## Implementation Priority

**Phase 1 (MUST):**
- Combat HUD
- Health Bars
- Combat Unit Panel
- Stance Controls
- Threat Indicators

**Phase 2 (SHOULD):**
- Combat Log
- Tactical Overview
- Keyboard Shortcuts

**Phase 3 (MAY):**
- Ability Bar
- Defense Management
- Damage Numbers

---

## Notes for Test Agent

The work order includes:
- 8 acceptance criteria with WHEN/THEN/Verification
- Comprehensive UI requirements with layouts
- File list for likely modifications
- Special considerations and gotchas
- Edge cases to test
- Implementation checklist

**Key Testing Focus:**
- Event integration correctness
- No silent fallbacks (crash on missing data)
- Event listener cleanup on destroy
- UI updates in response to game events

---

## Handing Off

✅ Work order complete and ready
✅ Spec verified for completeness
✅ Dependencies checked
✅ Integration points identified
✅ Testing strategy outlined

**Next Agent:** Test Agent (to write tests based on acceptance criteria)

---

**Spec Agent signing off. Work order ready for test development.**
