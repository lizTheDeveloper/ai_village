# Work Order Ready: conflict/combat-ui

**Timestamp:** 2026-01-01T05:30:00Z
**Attempt:** #1165
**Spec Agent:** spec-agent-001
**Status:** WORK_ORDER_READY

---

## Summary

Work order for conflict/combat-ui has been verified and is ready for the Test Agent.

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

## Phase Information

- **Phase:** Phase 16 - Polish & Player (Conflict UI task)
- **Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Spec:** `openspec/specs/conflict-system/spec.md`
- **Dependencies:** All met ✅

## Requirements Summary

The work order includes comprehensive specifications for:

1. Combat HUD overlay (REQ-COMBAT-001) - MUST
2. Health bars rendering (REQ-COMBAT-002) - MUST  
3. Combat Unit Panel (REQ-COMBAT-003) - MUST
4. Stance Controls (REQ-COMBAT-004) - MUST
5. Threat Indicators (REQ-COMBAT-005) - MUST
6. Combat Log (REQ-COMBAT-006) - SHOULD
7. Tactical Overview (REQ-COMBAT-007) - SHOULD
8. Ability Bar (REQ-COMBAT-008) - MAY
9. Defense Management (REQ-COMBAT-009) - SHOULD
10. Damage Numbers (REQ-COMBAT-010) - MAY
11. Keyboard Shortcuts (REQ-COMBAT-011) - SHOULD

## Acceptance Criteria

Work order contains 8 detailed acceptance criteria covering:
- Combat HUD display behavior
- Health bar rendering logic
- Combat unit panel integration
- Stance control functionality
- Threat indicator system
- Combat log event tracking
- Event integration testing
- Keyboard shortcuts

## System Integration Points

- EventBus integration for conflict events
- WindowManager panel registration
- KeyboardRegistry hotkey binding
- Component verification (many components already exist)

## Files Affected

Renderer layer:
- CombatHUDPanel.ts (verify)
- HealthBarRenderer.ts (verify)
- CombatLogPanel.ts (verify)
- CombatUnitPanel.ts (verify)
- StanceControls.ts (verify)
- ThreatIndicatorRenderer.ts (verify)
- WindowManager.ts (register panels)
- KeyboardRegistry.ts (bind hotkeys)

Core systems (verify event emission):
- HuntingSystem.ts
- PredatorAttackSystem.ts
- AgentCombatSystem.ts
- DominanceChallengeSystem.ts
- GuardDutySystem.ts

## Special Notes

**From Implementation Agent Notes:**

1. Many UI components already exist - primary task is verification and testing
2. Focus on event integration and ensuring proper data flow
3. No silent fallbacks - crash on missing required fields
4. Event listener cleanup is critical
5. Health bar culling for performance
6. Stance persistence on entity components

**Implementation Priority:**
- Phase 1 (MUST): Combat HUD, Health Bars, Combat Unit Panel, Stance Controls, Threat Indicators
- Phase 2 (SHOULD): Combat Log, Tactical Overview, Keyboard Shortcuts
- Phase 3 (MAY): Ability Bar, Defense Management, Damage Numbers

## Verification for Test Agent

Playtest agent should verify:
1. Combat HUD appears on conflict start
2. Health bars render with correct colors
3. Combat Unit Panel shows accurate stats
4. Stance controls work with mouse and keyboard
5. Threat indicators track predators and hostile agents
6. Combat log records all events
7. Off-screen combat indicators work
8. No silent fallbacks in error handling

---

## Next Steps

✅ Work order complete and verified
✅ All spec requirements documented
✅ Acceptance criteria defined
✅ System integration mapped
✅ Implementation notes provided

**Handing off to Test Agent.**

The work order is comprehensive and ready for test creation.

---

**Status:** READY_FOR_TESTS
