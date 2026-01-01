# Conflict UI - Work Order Ready

**Status:** READY_FOR_TESTS  
**Phase:** 16 - Polish & Player  
**Spec Agent:** spec-agent-001  
**Attempt:** #527  
**Timestamp:** 2025-12-31 17:56:00

---

## Work Order Created

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Primary Spec:** `openspec/specs/ui-system/conflict.md`

**Dependencies:** All met ✅
- ✅ Conflict system mechanics (conflict-system/spec.md)
- ✅ Agent system stats and components  
- ✅ EventBus infrastructure
- ✅ Renderer and WindowManager framework

---

## Requirements Overview

### MUST Requirements (Priority 1)
1. ✅ REQ-COMBAT-001: Combat HUD overlay
2. ✅ REQ-COMBAT-002: Health bars with injury indicators
3. ✅ REQ-COMBAT-003: Combat Unit Panel
4. ✅ REQ-COMBAT-004: Stance Controls (passive/defensive/aggressive/flee)
5. ✅ REQ-COMBAT-005: Threat Indicators (in-world & off-screen)

### SHOULD Requirements (Priority 2)
6. ✅ REQ-COMBAT-006: Combat Log (scrollable event history)
7. ✅ REQ-COMBAT-007: Tactical Overview
8. ✅ REQ-COMBAT-011: Keyboard Shortcuts

### MAY Requirements (Stretch Goals)
9. ⚠️ REQ-COMBAT-008: Ability Bar
10. ⚠️ REQ-COMBAT-009: Defense Management
11. ⚠️ REQ-COMBAT-010: Floating Damage Numbers

---

## Existing Components

**CRITICAL NOTE:** Many components already exist:
- ✅ `HealthBarRenderer.ts` - Exists (may need enhancement)
- ✅ `ThreatIndicatorRenderer.ts` - Exists (may need enhancement)
- ✅ Several combat UI panels may exist

**Action Required:** Implementation Agent should:
1. Review existing implementations first
2. Verify they satisfy spec requirements
3. Enhance (not replace) existing code
4. Add missing features per spec

---

## Integration Points

### Systems Affected
- EventBus (conflict events)
- HealthComponent (health data)
- Renderer (new renderers)
- WindowManager (panel registration)

### Events to Consume
- `conflict:started` - Activate combat HUD
- `conflict:resolved` - Update combat log
- `entity:injured` - Show injury indicators
- `entity:died` - Log death event
- `threat:detected` - Show threat indicator
- `stance:changed` - Update stance UI

### Events to Emit
- `ui:stance_change` - User changes stance
- `ui:combat_command` - User issues command

---

## Handoff to Test Agent

Work order complete with:
- ✅ Spec analysis complete
- ✅ Requirements extracted (11 total: 5 MUST, 4 SHOULD, 2 MAY)
- ✅ Acceptance criteria defined (8 criteria)
- ✅ System integration mapped
- ✅ Existing components identified
- ✅ Files to modify listed
- ✅ Testing scenarios provided
- ✅ Edge cases documented

**Next Step:** Test Agent should review work order and prepare test plan.

---

**Status:** READY FOR TEST AGENT
