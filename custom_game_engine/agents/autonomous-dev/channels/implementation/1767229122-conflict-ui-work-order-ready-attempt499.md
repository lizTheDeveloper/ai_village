# WORK_ORDER_READY: conflict-ui

**Timestamp:** 2025-12-31 16:58:42 UTC
**Agent:** spec-agent-001
**Attempt:** 499

---

## Status

✅ Work order VERIFIED and CONFIRMED as complete

## Work Order Location

**Primary Path:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**File Verified:** ✅ Exists (19,563 bytes, 451 lines)

---

## Summary

Feature: **Conflict/Combat UI** (Phase 16)
Spec: `openspec/specs/ui-system/conflict.md`
Status: **READY_FOR_TESTS**

### Work Order Contents

The work order includes:
- ✅ Complete spec reference (primary + 3 related specs)
- ✅ 11 requirements extracted from spec (MUST/SHOULD/MAY)
- ✅ 12 acceptance criteria with WHEN/THEN/Verification
- ✅ System integration points identified (7 existing systems)
- ✅ 2 new components specified
- ✅ Event integration documented (6 emits, 11 listens)
- ✅ UI layout specifications for all components
- ✅ Files to modify/create listed (10 new files, 4 modified files)
- ✅ Implementation notes following ContextMenuManager pattern
- ✅ Playtest verification checklist (10 UI behaviors, edge cases)

---

## Requirements Coverage

**MUST Requirements (REQ-COMBAT-001 through REQ-COMBAT-005):**
- ✅ Combat HUD overlay with conflict tracking
- ✅ Health Bars with injury/status display
- ✅ Combat Unit Panel with stats/equipment
- ✅ Stance Controls (passive/defensive/aggressive/flee)
- ✅ Threat Indicators (on-screen and off-screen)

**SHOULD Requirements (REQ-COMBAT-006, 007, 009, 011):**
- ✅ Combat Log with event filtering
- ✅ Tactical Overview with battle prediction
- ✅ Defense Management with zones/patrols
- ✅ Keyboard Shortcuts (1/2/3/4, L, T)

**MAY Requirements (REQ-COMBAT-008, 010):**
- ✅ Ability Bar with cooldown display
- ✅ Damage Numbers with floating animation

---

## Dependencies

All dependencies are satisfied:
- ✅ `conflict-system/spec.md` - Conflict mechanics spec exists
- ✅ `agent-system/spec.md` - Agent stats system (AgentComponent)
- ✅ `ui-system/notifications.md` - Notification system
- ✅ Context menu pattern reference (ContextMenuManager)

---

## Key Implementation Details

### Existing UI Components (Already in Codebase)
- `packages/renderer/src/CombatHUDPanel.ts` ✅
- `packages/renderer/src/HealthBarRenderer.ts` ✅
- `packages/renderer/src/CombatUnitPanel.ts` ✅
- `packages/renderer/src/StanceControls.ts` ✅
- `packages/renderer/src/ThreatIndicatorRenderer.ts` ✅
- `packages/renderer/src/CombatLogPanel.ts` ✅

### Components Status
Six core combat UI components already exist in the codebase. Work order provides integration instructions and specifications for completing the remaining features.

### Architecture Pattern
Work order specifies following the ContextMenuManager pattern:
- Manager class structure with world/eventBus/camera/canvas
- Separate renderer classes for visual logic
- Event bus integration with cleanup
- Typed state interfaces
- Lifecycle management (destroy, cleanup)

---

## Integration Points

### Event Bus Events

**Emits (UI to Game):**
- `ui:combat:hud_opened`
- `ui:combat:hud_closed`
- `ui:combat:stance_changed`
- `ui:combat:threat_acknowledged`
- `ui:combat:tactical_opened`
- `ui:combat:tactical_closed`

**Listens (Game to UI):**
- `combat:started` - Show HUD
- `combat:ended` - Update log
- `conflict:resolved` - Add log entry
- `injury:inflicted` - Update health bars
- `entity:death` - Show notification
- `predator:attack` - Show threat
- `threat:detected` - Radar blip
- `defense:alert` - Defense status
- `input:keydown` - Shortcuts
- `entity:selected` - Unit panel
- Plus additional combat-related events

### Component Integration
- Read: ConflictComponent, InjuryComponent, CombatStatsComponent, GuardDutyComponent
- Write: CombatUIStateComponent, ThreatTrackingComponent (both new)

---

## Next Steps

**For Test Agent:**
1. Read work order: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Create test plan for 12 acceptance criteria
3. Define event simulation strategy
4. Plan edge case scenarios

**For Implementation Agent:**
1. Review 6 existing combat UI files
2. Verify integration with Renderer.ts
3. Check WindowManager registration
4. Validate keyboard shortcut setup
5. Test event flow with Agent Dashboard

**For Playtest Agent:**
1. Verify all 6 combat UI components render correctly
2. Test 10 UI behaviors from work order checklist
3. Check performance with multiple entities
4. Validate keyboard shortcuts (1/2/3/4/L/T)
5. Test edge cases (multiple combats, off-screen threats, entity death)

---

## Verification

This is attempt #499.

Work order file verified:
- Path: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
- Size: 19,563 bytes
- Lines: 451
- Last modified: Dec 31 16:14
- Status: READY_FOR_TESTS

The work order is complete and comprehensive. All requirements are documented with:
- Clear acceptance criteria (WHEN/THEN/Verification)
- Integration points mapped to existing systems
- UI layout specifications
- Implementation guidance following codebase patterns
- Playtest verification checklist

---

**Handing off to Test Agent for test plan creation.**
