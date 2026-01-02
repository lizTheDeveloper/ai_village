# WORK ORDER VERIFIED: conflict-combat-ui

**Timestamp:** 2026-01-01 11:46:22 UTC
**Agent:** spec-agent-001
**Attempt:** #1285
**Status:** READY_FOR_TESTS

---

## Work Order Confirmation

Work order for Conflict/Combat UI feature **already exists** and has been verified as complete.

---

## Work Order Details

**Location:** `custom_game_engine/agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Primary Spec:** `openspec/specs/ui-system/conflict.md`
**Related Specs:**
- `openspec/specs/conflict-system/spec.md` (conflict mechanics)
- `openspec/specs/ui-system/notifications.md` (dependencies)

---

## Verification Summary

✅ **Spec Reference Section** - Complete with primary and related specs
✅ **Requirements Summary** - 11 SHALL/MUST/SHOULD/MAY requirements extracted
✅ **Acceptance Criteria** - 8 detailed criteria with WHEN/THEN/Verification
✅ **System Integration** - Tables of affected systems and event mappings
✅ **UI Requirements** - Detailed specs for all 6 UI components
✅ **Files Likely Modified** - Comprehensive list with existence verification
✅ **Implementation Notes** - Special considerations, gotchas, priority
✅ **Playtest Notes** - Specific behaviors and edge cases to verify
✅ **Implementation Checklist** - 14 verification items

---

## Requirements Summary (11 total)

### MUST Requirements
1. Combat HUD overlay showing active conflicts and threats (REQ-COMBAT-001)
2. Health bars above entities based on health status (REQ-COMBAT-002)
3. Combat Unit Panel with detailed entity stats (REQ-COMBAT-003)
4. Stance Controls for combat behavior (REQ-COMBAT-004)
5. Threat Indicators for dangers in the world (REQ-COMBAT-005)

### SHOULD Requirements
6. Combat Log for scrollable event history (REQ-COMBAT-006)
7. Tactical Overview for strategic combat view (REQ-COMBAT-007)
9. Defense Management for structures and zones (REQ-COMBAT-009)
11. Keyboard Shortcuts for combat actions (REQ-COMBAT-011)

### MAY Requirements
8. Ability Bar for quick access to combat abilities (REQ-COMBAT-008)
10. Damage Numbers as floating combat feedback (REQ-COMBAT-010)

---

## Acceptance Criteria (8 detailed)

1. **Combat HUD Display** - Activates on `conflict:started` event
2. **Health Bar Rendering** - Color-coded bars for injured/combat entities
3. **Combat Unit Panel** - Stats, equipment, stance, injuries display
4. **Stance Controls** - UI buttons and component updates
5. **Threat Indicators** - On-screen and edge indicators for threats
6. **Combat Log** - Scrollable timestamped event history
7. **Event Integration** - All conflict events propagate to UI
8. **Keyboard Shortcuts** - Stance hotkeys (1/2/3/4) bound

---

## System Integration

### Existing Systems Used (9 systems)
| System | File | Purpose |
|--------|------|---------|
| EventBus | packages/core/src/events/EventBus.ts | Event consumption |
| HuntingSystem | packages/core/src/systems/HuntingSystem.ts | EventBus events |
| PredatorAttackSystem | packages/core/src/systems/PredatorAttackSystem.ts | EventBus events |
| AgentCombatSystem | packages/core/src/systems/AgentCombatSystem.ts | EventBus events |
| DominanceChallengeSystem | packages/core/src/systems/DominanceChallengeSystem.ts | EventBus events |
| GuardDutySystem | packages/core/src/systems/GuardDutySystem.ts | EventBus events |
| WindowManager | packages/renderer/src/WindowManager.ts | Panel registration |
| KeyboardRegistry | packages/renderer/src/KeyboardRegistry.ts | Hotkey binding |

### Existing UI Components (6 components)
- ✅ CombatHUDPanel.ts - Exists, needs verification
- ✅ HealthBarRenderer.ts - Exists, needs verification
- ✅ CombatLogPanel.ts - Exists, needs verification
- ✅ CombatUnitPanel.ts - Exists, needs verification
- ✅ StanceControls.ts - Exists, needs verification
- ✅ ThreatIndicatorRenderer.ts - Exists, needs verification

### Events Consumed (9 events)
- `conflict:started`, `conflict:resolved`
- `combat:attack`
- `entity:injured`, `entity:death`
- `threat:detected`
- `predator:attack`
- `hunting:attempt`
- `dominance:challenge`

### Events Emitted (3 events)
- `ui:stance_changed`
- `ui:focus_conflict`
- `ui:combat_log_filtered`

---

## Implementation Strategy

### Phase 1 (MUST) - Core Combat UI
1. Combat HUD overlay
2. Health bars with color coding
3. Combat Unit Panel
4. Stance Controls
5. Threat Indicators

### Phase 2 (SHOULD) - Enhanced Features
6. Combat Log with filtering
7. Tactical Overview
8. Keyboard Shortcuts
9. Defense Management

### Phase 3 (MAY) - Optional Features
10. Ability Bar
11. Damage Numbers

---

## Key Notes for Implementation Agent

1. **Most UI Components Already Exist** - Primary task is verification and enhancement
2. **Event Flow Testing Critical** - Ensure all 9 consumed events work correctly
3. **No Silent Fallbacks** - Crash on missing event fields or components
4. **Performance Considerations** - Health bar culling, event cleanup, combat log pruning
5. **Testing Strategy** - Unit tests, integration tests, Playwright screenshots, dashboard verification

---

## Dependencies Met

✅ Conflict system core mechanics exist (ConflictComponent, AgentCombatSystem)
✅ Event system in place (9 conflict-related events)
✅ UI system infrastructure exists (WindowManager, KeyboardRegistry)
✅ Spec is complete with clear requirements
✅ Work order is comprehensive and detailed

---

## Handoff

Work order **already existed** and has been verified as complete and comprehensive.

**Next Step:** Test Agent reads work order and verifies/creates test suite based on acceptance criteria.

---

spec-agent-001 attempt #1285 complete ✓
