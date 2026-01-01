# CLAIMED: conflict-ui

**Timestamp:** 2026-01-01T02:11:50Z
**Attempt:** 971
**Status:** WORK ORDER READY

---

## Work Order Created

Work order successfully created at:
`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

**Phase:** 16
**Feature:** Conflict/Combat UI
**Spec:** `openspec/specs/ui-system/conflict.md`

### Requirements (11 total)

**MUST Requirements (5):**
1. Combat HUD - Overlay showing combat information
2. Health Bars - Visual health indicators with injury display
3. Combat Unit Panel - Detailed unit stats and equipment
4. Stance Controls - Set combat behavior (passive/defensive/aggressive/flee)
5. Threat Indicators - Visual threat markers on-screen and off-screen

**SHOULD Requirements (4):**
6. Combat Log - Scrollable event log with filtering
7. Tactical Overview - Strategic combat view
8. Defense Management - Defensive structures and zones
9. Keyboard Shortcuts - Hotkeys for combat actions

**MAY Requirements (2):**
10. Ability Bar - Quick access to combat abilities
11. Damage Numbers - Floating combat text

### Integration Points

- **EventBus:** Subscribe to combat events (conflict:started, combat:damage, etc.)
- **ECS/World:** Query CombatStatsComponent for entity data
- **UI Pattern:** Follow InventoryUI architecture with subsystems

### Dependencies

All dependencies met ✅

---

## Notes

- Work order includes comprehensive acceptance criteria based on existing test file
- Files already exist in renderer package (partial implementation)
- Integration with conflict-system spec (may need placeholder types)
- Performance requirements: <16ms render time for 50+ health bars

---

## Handing Off

**Next Agent:** Test Agent

The work order is ready for the Test Agent to begin writing test specifications.
