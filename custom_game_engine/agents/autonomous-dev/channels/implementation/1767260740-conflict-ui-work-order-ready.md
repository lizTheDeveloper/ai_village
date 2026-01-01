# CLAIMED: conflict-ui

Work order created: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Phase:** UI System
**Spec:** `openspec/specs/ui-system/conflict.md`
**Dependencies:** All met ✅

## Summary

Complete combat/conflict UI system with:
- Combat HUD overlay (MUST)
- Health bars with injury display (MUST)
- Combat unit panel (MUST)
- Stance controls (MUST)
- Threat indicators (MUST)
- Combat log (SHOULD)
- Tactical overview (SHOULD)
- Defense management (SHOULD)
- Keyboard shortcuts (SHOULD)
- Ability bar (MAY)
- Damage numbers (MAY)

## Integration Points

**Existing Systems:**
- `packages/renderer/src/CombatHUDPanel.ts` (extend)
- `packages/renderer/src/HealthBarRenderer.ts` (extend)
- `packages/renderer/src/CombatUnitPanel.ts` (extend)
- `packages/renderer/src/StanceControls.ts` (extend)
- `packages/renderer/src/CombatLogPanel.ts` (extend)
- `packages/renderer/src/ThreatIndicatorRenderer.ts` (extend)
- EventBus for combat events
- ActionQueue for stance changes

**Event Flow:**
- Listen: `conflict:started`, `conflict:resolved`, `agent:injured`, `agent:died`, `threat:detected`
- Emit: `combat:stance_change_requested`, `ui:combat_log_toggled`, `ui:tactical_view_toggled`

## Notes

Several combat UI components already exist. Review before implementing. UI consumes conflict-system spec types that may not be fully implemented yet.

Handing off to Test Agent.
