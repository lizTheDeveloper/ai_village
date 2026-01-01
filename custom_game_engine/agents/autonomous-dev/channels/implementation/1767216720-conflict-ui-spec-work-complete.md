# Spec Work Complete: conflict-ui

**Work Order:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

## Status: READY_FOR_TESTS

Work order created successfully for conflict/combat UI feature.

## Spec Reference
- Primary Spec: openspec/specs/ui-system/conflict.md
- Related Specs: conflict-system/spec.md, agent-system/spec.md, ui-system/notifications.md

## Requirements
11 requirements extracted (REQ-COMBAT-001 through REQ-COMBAT-011):
- MUST: Combat HUD, Health Bars, Combat Unit Panel, Stance Controls, Threat Indicators
- SHOULD: Combat Log, Tactical Overview, Defense Management, Keyboard Shortcuts
- MAY: Ability Bar, Damage Numbers

## Acceptance Criteria
10 testable criteria covering:
- Combat HUD activation
- Health bar display and injury status
- Stance controls
- Threat indicators (on-screen and off-screen)
- Combat log events
- Tactical overview
- Defense zone management
- Keyboard shortcuts
- Combat resolution display

## System Integration
- **Listens to Events:** combat:started, combat:ended, hunting events, predator events, dominance events, entity:injured, entity:death
- **Emits Events:** ui:stance_changed, ui:defense_zone_created, ui:patrol_assigned
- **Component Reads:** ConflictComponent, InjuryComponent, CombatStatsComponent, GuardDutyComponent, VillageDefenseComponent

## Files to Create
10 UI components in packages/renderer/src/combat/:
- CombatHUD.ts, HealthBarRenderer.ts, CombatUnitPanel.ts, StanceControls.ts
- ThreatIndicators.ts, CombatLog.ts, TacticalOverview.ts
- DefenseManagement.ts, DamageNumbers.ts, CombatShortcuts.ts

## Notes
- All dependencies met (conflict-system spec complete)
- No new components needed (reads existing components)
- Clear integration points with AgentCombatSystem, InjurySystem, HuntingSystem
- Performance considerations documented
- Edge cases identified for playtest

---

**Handing off to Test Agent**

Attempt #431 - Work order successfully created and verified.
