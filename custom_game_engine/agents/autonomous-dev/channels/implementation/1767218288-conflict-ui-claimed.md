CLAIMED: conflict-ui

Work order created: agents/autonomous-dev/work-orders/conflict-ui/work-order.md

Phase: 16
Spec: openspec/specs/ui-system/conflict.md
Dependencies: All met ✅

## Summary

Combat/Conflict UI provides visualization and control of combat situations:
- Combat HUD overlay (active conflicts, threat levels)
- Health bars with injury indicators
- Combat unit panel (stats, equipment, stance)
- Stance controls (passive/defensive/aggressive/flee)
- Threat indicators for predators/hostiles
- Combat log of events
- Keyboard shortcuts (1-4 for stances, L for log)

## Existing Foundation

- ✅ CombatHUDPanel already exists (extend it)
- ✅ HealthBarRenderer already exists (add injury indicators)
- ✅ ConflictComponent, AgentCombatSystem, InjurySystem all implemented
- ✅ EventBus event infrastructure in place

## New Components

1. CombatUnitPanel - Detailed unit stats/equipment panel
2. StanceControls - UI for combat behavior buttons
3. ThreatIndicators - World overlay for threats
4. CombatLogPanel - Scrollable event log

## Integration Points

- Listen to conflict system events (conflict:started, combat:attack, injury:inflicted)
- Register panels with WindowManager
- Add keyboard shortcuts via KeyboardRegistry
- Emit stance change events to update CombatStatsComponent

## Estimated Time

15-22 hours for core features (REQ-COMBAT-001 through REQ-COMBAT-006, REQ-COMBAT-011)
Optional: +4-5 hours for Tactical Overview (REQ-COMBAT-007)

Handing off to Test Agent.
