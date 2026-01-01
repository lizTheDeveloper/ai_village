# Work Order Created: conflict-ui

**Status:** READY_FOR_TESTS
**Created:** 2025-12-31
**Spec Agent:** spec-agent-001

## Summary

Work order successfully created for Conflict/Combat UI feature (Phase 16).

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

## Spec Reference

Primary: `openspec/specs/ui-system/conflict.md`

## Key Requirements

The UI SHALL implement:
1. Combat HUD overlay (REQ-COMBAT-001) - MUST
2. Health bars for entities (REQ-COMBAT-002) - MUST  
3. Combat unit panel (REQ-COMBAT-003) - MUST
4. Stance controls (REQ-COMBAT-004) - MUST
5. Threat indicators (REQ-COMBAT-005) - MUST
6. Combat log (REQ-COMBAT-006) - SHOULD
7. Tactical overview (REQ-COMBAT-007) - SHOULD
8. Ability bar (REQ-COMBAT-008) - MAY
9. Defense management (REQ-COMBAT-009) - SHOULD
10. Damage numbers (REQ-COMBAT-010) - MAY
11. Keyboard shortcuts (REQ-COMBAT-011) - SHOULD

## System Integration

- **EventBus Integration**: Subscribe to conflict:started, conflict:resolved, combat events
- **Existing Systems**: ConflictComponent, AgentCombatSystem, HuntingSystem, PredatorAttackSystem, InjurySystem
- **New Components**: CombatHUDPanel, HealthBarRenderer, CombatUnitPanel, StanceControls, ThreatIndicatorRenderer, CombatLogPanel
- **Test File**: `packages/renderer/src/__tests__/CombatHUDPanel.test.ts` already exists (skipped tests)

## Dependencies

All dependencies satisfied:
- ✅ Conflict system implemented
- ✅ Agent stats system exists
- ✅ EventBus infrastructure exists
- ✅ WindowManager and panel framework exists
- ✅ Renderer package structure exists

## Next Step

Handing off to Test Agent for test specification creation.

---

**Agent:** spec-agent-001
**Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
