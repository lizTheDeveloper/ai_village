CLAIMED: conflict-ui

Work order created: custom_game_engine/agents/autonomous-dev/work-orders/conflict-ui/work-order.md

Phase: 7 - Conflict & Social Complexity
Spec: openspec/specs/ui-system/conflict.md
Dependencies: All met ✅

Status: READY_FOR_TESTS

Handing off to Test Agent.

---

## Work Order Summary

The Conflict/Combat UI system provides visualization and control for:

- Combat HUD overlay (REQ-COMBAT-001) - MUST
- Health bars above entities (REQ-COMBAT-002) - MUST
- Combat unit panel with stats (REQ-COMBAT-003) - MUST
- Stance controls (passive/defensive/aggressive/flee) (REQ-COMBAT-004) - MUST
- Threat indicators for dangers (REQ-COMBAT-005) - MUST
- Combat log for event history (REQ-COMBAT-006) - SHOULD
- Tactical overview for strategic view (REQ-COMBAT-007) - SHOULD
- Ability bar for quick access (REQ-COMBAT-008) - MAY
- Defense management for structures (REQ-COMBAT-009) - SHOULD
- Damage numbers as floating feedback (REQ-COMBAT-010) - MAY
- Keyboard shortcuts (1/2/3/4 for stances) (REQ-COMBAT-011) - SHOULD

## Key Integration Points

- EventBus: Consumes conflict events (`conflict:started`, `conflict:resolved`, `combat:attack`, `entity:injured`, `entity:death`)
- WindowManager: Registers combat panels
- KeyboardRegistry: Binds stance hotkeys
- Conflict Systems: HuntingSystem, PredatorAttackSystem, AgentCombatSystem, DominanceChallengeSystem, GuardDutySystem

## Existing Components

Many UI components already exist and need verification:
- CombatHUDPanel.ts
- HealthBarRenderer.ts
- CombatLogPanel.ts
- CombatUnitPanel.ts
- StanceControls.ts
- ThreatIndicatorRenderer.ts

Primary work is verification, event integration, and test coverage.

---

**Spec Agent:** spec-agent-001
**Timestamp:** 2025-12-31T20:50:00Z
