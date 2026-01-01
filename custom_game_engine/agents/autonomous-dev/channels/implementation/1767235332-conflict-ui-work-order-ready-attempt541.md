# WORK ORDER READY: conflict-ui

**Status:** WORK_ORDER_READY
**Timestamp:** 1767235332
**Spec Agent:** spec-agent-001
**Attempt:** 541

---

## Work Order Created

Work order file exists and is complete:
```
agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

## Spec Reference

- **Primary Spec:** openspec/specs/ui-system/conflict.md
- **Phase:** 16 (Polish & Player)
- **Dependencies:** All met ✅

## Requirements Summary

The system SHALL provide complete combat/conflict UI integration:

1. **REQ-COMBAT-001:** Combat HUD overlay showing active conflicts and threat level
2. **REQ-COMBAT-002:** Visual health indicators for all entities
3. **REQ-COMBAT-003:** Detailed combat unit panel for selected entities
4. **REQ-COMBAT-004:** Combat stance controls (Passive/Defensive/Aggressive/Flee)
5. **REQ-COMBAT-005:** Visual threat indicators in world and on screen edges
6. **REQ-COMBAT-006:** Scrollable combat event log
7. **REQ-COMBAT-007:** Tactical overview with force summary
8. **REQ-COMBAT-008:** Ability bar for combat abilities (MAY)
9. **REQ-COMBAT-009:** Defense management panel (SHOULD)
10. **REQ-COMBAT-010:** Floating damage numbers (MAY)
11. **REQ-COMBAT-011:** Keyboard shortcuts for combat actions

## Current Implementation Status

### ✅ Components Already Exist
All core combat UI components have been implemented:
- `CombatHUDPanel.ts` - REQ-COMBAT-001
- `HealthBarRenderer.ts` - REQ-COMBAT-002
- `CombatUnitPanel.ts` - REQ-COMBAT-003
- `StanceControls.ts` - REQ-COMBAT-004
- `ThreatIndicatorRenderer.ts` - REQ-COMBAT-005
- `CombatLogPanel.ts` - REQ-COMBAT-006

### ⚠️ Integration Verification Needed

**Task:** Verify components are properly integrated in Renderer.ts

1. **Component Instantiation** - Check all combat UI components are instantiated
2. **Render Loop Integration** - Verify combat UI renders in correct order
3. **Event Wiring** - Ensure EventBus connections are complete
4. **Keyboard Shortcuts** - Verify stance hotkeys (1-4) are functional
5. **Entity Selection** - Test CombatUnitPanel displays on entity selection

### 📋 Optional Components

These SHOULD/MAY requirements need implementation if missing:
- TacticalOverviewPanel.ts - REQ-COMBAT-007 (SHOULD)
- AbilityBar.ts - REQ-COMBAT-008 (MAY)
- DefenseManagementPanel.ts - REQ-COMBAT-009 (SHOULD)
- DamageNumbers.ts - REQ-COMBAT-010 (MAY)

## Files to Check/Modify

### Renderer Integration
- `packages/renderer/src/Renderer.ts` - Verify component instantiation & render calls
- `packages/renderer/src/InputHandler.ts` - Verify stance keyboard shortcuts (1-4)
- `packages/renderer/src/index.ts` - Verify all components are exported

### Event Integration
- Verify EventBus listeners for:
  - `conflict:started`
  - `conflict:resolved`
  - `combat:attack`
  - `combat:started`
  - `combat:ended`
  - `injury:inflicted`

## Acceptance Criteria

From the work order, the Implementation Agent must verify:

1. ✅ Combat HUD displays active conflicts when `conflict:started` event fires
2. ✅ Health bars appear above entities and update when damage taken
3. ✅ Combat Unit Panel shows stats/equipment when entity selected
4. ✅ Stance controls change combat behavior via buttons or hotkeys 1-4
5. ✅ Threat indicators show nearby threats with correct color/severity
6. ✅ Combat log records all combat events in chronological order
7. ✅ Keyboard shortcuts work for all stance changes
8. ✅ Health bar colors reflect health status (green→yellow→red)
9. ✅ Injuries display on health bars with tooltips
10. ✅ Multi-selection shows "Mixed Stances" when appropriate

## Testing Strategy

The Implementation Agent should:

1. **Run the build** - `npm run build` must pass
2. **Test event flow** - Trigger agent combat and verify UI updates
3. **Test keyboard shortcuts** - Press 1-4 keys with units selected
4. **Test multi-selection** - Select multiple units with different stances
5. **Test health bar updates** - Damage entities and verify bar color changes
6. **Test injury display** - Inflict injuries and verify they appear
7. **Check browser console** - Use Playwright MCP to verify no errors

## Error Handling Requirements

Per CLAUDE.md:
- ❌ NO silent fallbacks
- ❌ NO default values for critical game state
- ✅ Clear error messages when required data missing
- ✅ Crash early rather than propagate invalid state

---

## Ready for Implementation

Work order is complete and ready for the Implementation Agent.

✅ All dependencies verified
✅ All specs complete
✅ All acceptance criteria defined
✅ Existing components identified
✅ Integration points documented

**Next Step:** Implementation Agent verifies integration and tests all acceptance criteria.
