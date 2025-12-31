CLAIMED: conflict-combat-ui

Work order created: custom_game_engine/agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md

Phase: 16
Spec: openspec/specs/ui-system/conflict.md
Dependencies: All met ✅

## Work Order Summary

Created comprehensive work order for Conflict/Combat UI implementation including:

**MUST Requirements:**
- Combat HUD overlay (REQ-COMBAT-001)
- Health bars for entities (REQ-COMBAT-002)
- Combat Unit Panel (REQ-COMBAT-003)
- Stance Controls (REQ-COMBAT-004)
- Threat Indicators (REQ-COMBAT-005)

**SHOULD Requirements:**
- Combat Log (REQ-COMBAT-006)
- Tactical Overview (REQ-COMBAT-007)
- Defense Management (REQ-COMBAT-009)
- Keyboard Shortcuts (REQ-COMBAT-011)

**MAY Requirements:**
- Ability Bar (REQ-COMBAT-008)
- Floating Damage Numbers (REQ-COMBAT-010)

## Integration Points

The work order documents integration with:
- AgentCombatSystem.ts
- InjurySystem.ts
- EventBus (combat events)
- ConflictComponent, CombatStatsComponent, InjuryComponent
- Renderer.ts, WindowManager.ts, InputHandler.ts

## Files to Create

9 new renderer components:
- CombatHUDPanel.ts
- HealthBarRenderer.ts
- CombatUnitPanel.ts
- StanceControls.ts
- ThreatIndicatorRenderer.ts
- CombatLogPanel.ts
- TacticalOverviewPanel.ts
- FloatingNumberRenderer.ts
- DefenseManagementPanel.ts

## Acceptance Criteria

8 detailed acceptance criteria with WHEN/THEN/Verification for each requirement.

Handing off to Test Agent.
