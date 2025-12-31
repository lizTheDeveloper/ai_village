# VERIFIED: conflict-combat-ui Work Order (Attempt #335)

**Timestamp:** 1767206184 (2025-12-31)
**Agent:** spec-agent-001
**Status:** READY_FOR_TESTS
**Phase:** 16

---

## Work Order Verified

Work order has been thoroughly reviewed and verified as complete and ready for the development pipeline.

**Location:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

---

## Summary

**Feature:** Conflict/Combat UI
**Primary Spec:** `openspec/specs/ui-system/conflict.md`
**Related Spec:** `openspec/specs/conflict-system/spec.md`

### Requirements
- **5 MUST requirements** (REQ-COMBAT-001 through 005)
- **4 SHOULD requirements** (REQ-COMBAT-006, 007, 009, 011)
- **2 MAY requirements** (REQ-COMBAT-008, 010)

### Acceptance Criteria
- **13 detailed criteria** with WHEN/THEN conditions
- Each has verification method and test reference
- Performance target: 50+ health bars at 60fps

### Components to Implement
1. **CombatHUDPanel.ts** - Main combat overlay
2. **CombatUnitPanel.ts** - Unit details with stance controls
3. **CombatLogPanel.ts** - Combat event log
4. **Renderer.ts integration** - Wire up to main renderer

### Already Implemented ✅
- HealthBarRenderer (`packages/renderer/src/HealthBarRenderer.ts`)
- ThreatIndicatorRenderer (`packages/renderer/src/ThreatIndicatorRenderer.ts`)
- AgentCombatSystem with event emission
- Complete test suite (685 lines, currently skipped)

---

## Test Coverage

**Comprehensive test suite exists:**
- `packages/renderer/src/__tests__/CombatUIIntegration.test.ts` (685 lines)
- `packages/renderer/src/__tests__/CombatHUDPanel.test.ts`
- `packages/renderer/src/__tests__/CombatUnitPanel.test.ts`
- `packages/renderer/src/__tests__/CombatLogPanel.test.ts`

All tests currently have `.skip` - remove as features are implemented.

---

## Event Integration

### Consumes
- `conflict:started` → Activate Combat HUD
- `conflict:resolved` → Deactivate Combat HUD
- `combat:damage` → Update health bars, log event
- `injury:inflicted` → Show injury icons, log event
- `death:occurred` → Cleanup UI, log event
- `entity:selected` → Show Combat Unit Panel
- `entity:deselected` → Clear Combat Unit Panel

### Emits
- `ui:stance:changed` → When user changes combat stance
  - Payload: `{ entityIds: string[], stance: CombatStance }`

---

## Dependencies Verified ✅

All hard dependencies exist and are ready:
- ✅ HealthBarRenderer.ts
- ✅ ThreatIndicatorRenderer.ts
- ✅ EventBus
- ✅ World/ECS
- ✅ CombatTypes.ts
- ✅ CombatStatsComponent.ts

---

## Implementation Phases

**Phase 1: Core Components (MUST)**
- CombatHUDPanel
- CombatUnitPanel with stance controls
- Integration with existing renderers

**Phase 2: Events & Log (MUST + SHOULD)**
- CombatLogPanel
- Event coordination
- Keyboard shortcuts

**Phase 3: Advanced (MAY) - Can Defer**
- Tactical Overview
- Defense Management
- Damage Numbers
- Ability Bar

---

## Success Criteria

Work order is COMPLETE when:
1. All MUST requirements implemented
2. All component tests pass (remove `.skip`)
3. Integration tests pass (remove `.skip`)
4. Performance: 50 health bars in <16ms
5. Build passes: `npm run build`
6. No console errors during combat

---

## Handoff

**Next Agent:** Test Agent

The Test Agent should:
1. Review test suite completeness
2. Verify all acceptance criteria have tests
3. Add any missing test scenarios
4. Hand off to Implementation Agent

---

## Work Order Quality

✅ Spec reference complete
✅ Requirements categorized by priority
✅ Acceptance criteria with verification
✅ System integration mapped
✅ UI requirements specified
✅ Files identified (new + modified)
✅ Implementation notes provided
✅ Playtest scenarios defined
✅ Dependencies verified
✅ Success criteria clear

**Work order is VERIFIED and READY FOR TESTS.**

---

**Spec Agent:** spec-agent-001
**Date:** 2025-12-31
**Attempt:** #335
**Status:** READY_FOR_TESTS ✅
