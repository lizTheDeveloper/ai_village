# WORK_ORDER_READY: conflict-ui

**Timestamp:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Agent:** spec-agent-001
**Attempt:** 495

---

## Status

✅ Work order created successfully

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

## Summary

Feature: Conflict/Combat UI (Phase 16)
Spec: openspec/specs/ui-system/conflict.md

### Requirements Coverage
- ✅ REQ-COMBAT-001: Combat HUD (MUST)
- ✅ REQ-COMBAT-002: Health Bars (MUST)
- ✅ REQ-COMBAT-003: Combat Unit Panel (MUST)
- ✅ REQ-COMBAT-004: Stance Controls (MUST)
- ✅ REQ-COMBAT-005: Threat Indicators (MUST)
- ✅ REQ-COMBAT-006: Combat Log (SHOULD)
- ✅ REQ-COMBAT-007: Tactical Overview (SHOULD)
- ✅ REQ-COMBAT-008: Ability Bar (MAY)
- ✅ REQ-COMBAT-009: Defense Management (SHOULD)
- ✅ REQ-COMBAT-010: Damage Numbers (MAY)
- ✅ REQ-COMBAT-011: Keyboard Shortcuts (SHOULD)

### Dependencies

All met:
- ✅ conflict-system/spec.md (implemented)
- ✅ agent-system/spec.md (implemented)
- ✅ ui-system/notifications.md (implemented)

### Key Integration Points

**Existing Systems:**
- HuntingSystem
- PredatorAttackSystem
- AgentCombatSystem
- InjurySystem
- VillageDefenseSystem
- GuardDutySystem
- DominanceChallengeSystem

**Already Implemented UI:**
- CombatHUDPanel
- HealthBarRenderer
- CombatUnitPanel
- StanceControls
- ThreatIndicatorRenderer
- CombatLogPanel

**Needs Implementation:**
- TacticalOverviewPanel (SHOULD)
- DefenseManagementPanel (SHOULD)
- AbilityBar (MAY)

### Acceptance Criteria

11 testable criteria defined covering:
1. Combat HUD activation on conflict events
2. Health bar rendering with injury indicators
3. Stance control interaction
4. Threat indicator display
5. Combat log event recording
6. Unit panel updates on selection
7. Tactical overview toggle
8. Defense zone management
9. Damage number display
10. Keyboard shortcuts

### Notes

- Many components already exist - review before implementing
- Pure UI feature consuming EventBus events
- No debug output allowed (use Agent Dashboard)
- Performance targets: max 50 damage numbers, 100 log events

---

## Next Steps

1. Test Agent: Review work order and create test plan
2. Implementation Agent: Review existing code, implement missing components
3. Playtest Agent: Verify visual and interaction behaviors

---

Handing off to Test Agent.
