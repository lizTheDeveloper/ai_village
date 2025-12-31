# WORK ORDER READY: conflict-combat-ui

**Timestamp:** 2025-12-31T12:20:00Z
**Attempt:** #396
**Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Work Order Created

**Path:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`
**Lines:** 337
**Status:** COMPLETE ✅

---

## Summary

Work order for Conflict/Combat UI feature is complete and ready for the Test Agent.

### Spec Reference
- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Specs:** `openspec/specs/conflict-system/spec.md`

### Phase
Phase 7 - Conflict & Social Complexity

### Dependencies
All dependencies met ✅
- Conflict system spec exists
- UI system spec exists
- Event system in place
- Component system in place

---

## Requirements Summary

The work order specifies 11 requirements:
1. Combat HUD (REQ-COMBAT-001) - MUST
2. Health Bars (REQ-COMBAT-002) - MUST
3. Combat Unit Panel (REQ-COMBAT-003) - MUST
4. Stance Controls (REQ-COMBAT-004) - MUST
5. Threat Indicators (REQ-COMBAT-005) - MUST
6. Combat Log (REQ-COMBAT-006) - SHOULD
7. Tactical Overview (REQ-COMBAT-007) - SHOULD
8. Ability Bar (REQ-COMBAT-008) - MAY
9. Defense Management (REQ-COMBAT-009) - SHOULD
10. Damage Numbers (REQ-COMBAT-010) - MAY
11. Keyboard Shortcuts (REQ-COMBAT-011) - SHOULD

---

## Acceptance Criteria

8 acceptance criteria defined:
1. Combat HUD Display - on conflict start
2. Health Bar Rendering - on injury or combat
3. Combat Unit Panel - on entity selection
4. Stance Controls - button clicks and hotkeys
5. Threat Indicators - visual threat markers
6. Combat Log - event history
7. Event Integration - EventBus consumption
8. Keyboard Shortcuts - stance hotkeys (1/2/3/4)

---

## Integration Points

### Systems Affected
- EventBus (event consumption)
- HuntingSystem (events)
- PredatorAttackSystem (events)
- AgentCombatSystem (events)
- DominanceChallengeSystem (events)
- GuardDutySystem (events)
- WindowManager (panel registration)
- KeyboardRegistry (hotkey binding)

### Events Consumed
- `conflict:started`
- `conflict:resolved`
- `combat:attack`
- `entity:injured`
- `entity:death`
- `threat:detected`
- `predator:attack`
- `hunting:attempt`
- `dominance:challenge`

### Events Emitted
- `ui:stance_changed`
- `ui:focus_conflict`
- `ui:combat_log_filtered`

---

## Files Identified

### Existing UI Components (Verify Implementation)
- `packages/renderer/src/CombatHUDPanel.ts` ✅
- `packages/renderer/src/HealthBarRenderer.ts` ✅
- `packages/renderer/src/CombatLogPanel.ts` ✅
- `packages/renderer/src/CombatUnitPanel.ts` ✅
- `packages/renderer/src/StanceControls.ts` ✅
- `packages/renderer/src/ThreatIndicatorRenderer.ts` ✅

### Integration Points
- `packages/renderer/src/WindowManager.ts`
- `packages/renderer/src/KeyboardRegistry.ts`
- `packages/renderer/src/Renderer.ts`

### Systems (Verify Event Emission)
- `packages/core/src/systems/HuntingSystem.ts`
- `packages/core/src/systems/PredatorAttackSystem.ts`
- `packages/core/src/systems/AgentCombatSystem.ts`
- `packages/core/src/systems/DominanceChallengeSystem.ts`
- `packages/core/src/systems/GuardDutySystem.ts`

---

## Notes for Test Agent

### Primary Focus
Many UI components already exist. Your primary task is to:
1. Verify they implement the spec correctly
2. Ensure event integration works
3. Write tests to prove functionality
4. Add missing features per spec

### Testing Strategy
- Unit tests for individual panels/renderers
- Integration tests for event flow
- Visual verification using Playwright (screenshots)
- Dashboard queries to verify metrics

### Edge Cases
1. Multiple simultaneous conflicts (3+)
2. Rapid health changes during combat
3. Off-screen combat and threats
4. Entity death during combat
5. Stance persistence across save/load
6. Event flood (100+ events)

---

## Handing Off

✅ Work order complete
✅ All requirements documented
✅ Acceptance criteria defined
✅ Integration points identified
✅ Files mapped to requirements

**Next Agent:** Test Agent

---

**End of Message**
