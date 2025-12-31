# READY: conflict-combat-ui (Attempt #334)

**Date:** 2025-12-31
**Agent:** spec-agent-001
**Phase:** 16

---

## Work Order Location

Work order verified and ready at:

```
agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md
```

---

## Summary

The Conflict/Combat UI work order is complete and ready for implementation. This is a comprehensive UI system for visualizing and controlling combat situations.

---

## Primary Spec

[openspec/specs/ui-system/conflict.md](../../../../openspec/specs/ui-system/conflict.md)

---

## Requirements Overview

### MUST Requirements (Core Features)
1. **REQ-COMBAT-001:** Combat HUD - Overlay showing active conflicts and threat level
2. **REQ-COMBAT-002:** Health Bars - ✅ Already implemented
3. **REQ-COMBAT-003:** Combat Unit Panel - Detailed view of selected unit
4. **REQ-COMBAT-004:** Stance Controls - Set combat behavior (passive/defensive/aggressive/flee)
5. **REQ-COMBAT-005:** Threat Indicators - ✅ Already implemented

### SHOULD Requirements
- REQ-COMBAT-006: Combat Log (critical for debugging)
- REQ-COMBAT-007: Tactical Overview
- REQ-COMBAT-009: Defense Management
- REQ-COMBAT-011: Keyboard Shortcuts

### MAY Requirements
- REQ-COMBAT-008: Ability Bar
- REQ-COMBAT-010: Damage Numbers

---

## Key Implementation Notes

### Already Implemented ✅
- `HealthBarRenderer.ts` - packages/renderer/src/HealthBarRenderer.ts
- `ThreatIndicatorRenderer.ts` - packages/renderer/src/ThreatIndicatorRenderer.ts
- `AgentCombatSystem` with event emission
- Comprehensive test suite (currently skipped)

### To Be Implemented
1. **CombatHUDPanel.ts** - Main combat overlay coordinator
2. **CombatUnitPanel.ts** - Unit details with stance controls
3. **CombatLogPanel.ts** - Combat event log
4. **Renderer.ts integration** - Wire up new components

### Event Integration
**Listens:**
- `conflict:started` → Activate combat HUD
- `conflict:resolved` → Deactivate if no conflicts remain
- `combat:damage` → Update UI
- `injury:inflicted` → Show injury icons
- `death:occurred` → Cleanup UI
- `entity:selected` → Show combat unit panel

**Emits:**
- `ui:stance:changed` → Notify combat system of stance changes

---

## Test Suite

Comprehensive integration test at:
`packages/renderer/src/__tests__/CombatUIIntegration.test.ts`

**685 lines** of detailed test scenarios - currently all `.skip`

Implementation agent should remove `.skip` as features are completed.

---

## Performance Requirements

- 50+ health bars must render in <16ms (60fps)
- Combat log limited to 100 events
- Spatial culling for off-screen entities

---

## Dependencies Met

All hard dependencies verified:
- ✅ EventBus
- ✅ World/ECS
- ✅ CombatTypes
- ✅ CombatStatsComponent
- ✅ HealthBarRenderer
- ✅ ThreatIndicatorRenderer

---

## Success Criteria

Work order COMPLETE when:
1. All MUST requirements implemented
2. All unit tests pass (remove `.skip`)
3. Integration tests pass
4. Performance test: 50 health bars in <16ms
5. Build passes: `npm run build`
6. No console errors during combat

---

## Implementation Phases

**Phase 1: Core UI (MUST)**
- CombatHUDPanel
- CombatUnitPanel with stance controls
- Integration with existing renderers

**Phase 2: Events & Log (MUST + SHOULD)**
- CombatLogPanel
- Event coordination
- Keyboard shortcuts

**Phase 3: Advanced (MAY) - Can defer**
- Tactical Overview
- Defense Management
- Damage Numbers
- Ability Bar

---

## Handing Off

**Next Agent:** Test Agent (verify test suite completeness)
**Then:** Implementation Agent (begin development)
**Finally:** Playtest Agent (verify UI behavior)

---

**Work order creation COMPLETE for Attempt #334** ✅

All specifications verified and ready for development pipeline.
