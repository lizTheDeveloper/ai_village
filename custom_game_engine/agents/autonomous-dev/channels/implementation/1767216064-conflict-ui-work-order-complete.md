# WORK ORDER CREATED: conflict-ui

**Agent:** spec-agent-001
**Timestamp:** 2025-12-31 13:17:00
**Attempt:** #426 (SUCCESSFUL)

---

## Work Order Created

✅ **File:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

**Phase:** 16
**Spec:** [openspec/specs/ui-system/conflict.md](../../../../../../openspec/specs/ui-system/conflict.md)

---

## Requirements Summary

### MUST Requirements (5)
1. REQ-COMBAT-001: Combat HUD with active conflicts and threat levels
2. REQ-COMBAT-002: Health bars with injury and status effect display
3. REQ-COMBAT-003: Combat Unit Panel showing stats, equipment, injuries
4. REQ-COMBAT-004: Stance Controls (passive/defensive/aggressive/flee)
5. REQ-COMBAT-005: Threat Indicators (on-screen and off-screen)

### SHOULD Requirements (4)
6. REQ-COMBAT-006: Combat Log with filtering
7. REQ-COMBAT-007: Tactical Overview with force comparison
9. REQ-COMBAT-009: Defense Management (zones, patrols, structures)
11. REQ-COMBAT-011: Keyboard Shortcuts

### MAY Requirements (2)
8. REQ-COMBAT-008: Ability Bar (optional)
10. REQ-COMBAT-010: Damage Numbers (optional)

---

## Key Integration Points

- **Existing Partial Implementations:**
  - CombatHUDPanel.ts (needs completion)
  - HealthBarRenderer.ts (needs injury icons)
  - StanceControls.ts (needs entity wiring)
  - CombatLogPanel.ts (needs event handling)
  - ThreatIndicatorRenderer.ts (needs off-screen indicators)
  - CombatUnitPanel.ts (needs data binding)

- **EventBus Events:**
  - Listens: conflict:started, conflict:resolved, combat:attack, combat:damage, combat:death, threat:detected
  - Emits: combat:stance_changed, combat:ability_used, defense:zone_created

- **Backend Dependencies:**
  - ConflictComponent, ThreatComponent, GuardDutyComponent (may need creation)

---

## Acceptance Criteria

10 criteria defined covering:
- Combat HUD activation on conflict start
- Health bar color coding and injury display
- Stance control functionality
- Threat indicator rendering (on/off screen)
- Combat log event recording
- Tactical overview data accuracy
- Defense management display
- Keyboard shortcut response
- Conflict resolution display

---

## Next Steps

**Hand off to Test Agent** → They will create test suite for acceptance criteria

**Then Implementation Agent** → They will complete existing components and add new ones

---

## Notes

- **Partial implementations already exist** - priority is to complete them before creating new files
- **Types must align with conflict-system** - ConflictType, Injury, ConflictResolution, etc.
- **Alien species combat modes** (Pack Mind, Hive, Man'chi) may be deferred if species not yet implemented
- **Performance critical** - health bars and damage numbers need culling/pooling

Dependencies: All met ✅ (conflict-system spec exists, agent-system exists, UI components partially implemented)
