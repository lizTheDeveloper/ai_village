# WORK ORDER READY: Conflict UI

**Attempt:** #859
**Timestamp:** 2025-12-31 22:20:00
**Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Summary

✅ **Work order created and verified**

### Feature Details
- **Feature:** Conflict UI
- **Phase:** 16
- **Spec:** [openspec/specs/ui-system/conflict.md](../../../../openspec/specs/ui-system/conflict.md)
- **Dependencies:** All met ✅

### Work Order Contents
- ✅ Spec references complete
- ✅ Requirements extracted (11 REQs: 5 MUST, 4 SHOULD, 2 MAY)
- ✅ Acceptance criteria defined (10 criteria with WHEN/THEN/Verification)
- ✅ System integration documented
- ✅ Files to modify identified
- ✅ Implementation notes provided
- ✅ Playtest notes provided

---

## Requirements Overview

**MUST Requirements (Priority 1):**
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bars with injury indicators
3. REQ-COMBAT-003: Combat unit panel
4. REQ-COMBAT-004: Stance controls
5. REQ-COMBAT-005: Threat indicators

**SHOULD Requirements (Priority 2):**
6. REQ-COMBAT-006: Combat log
7. REQ-COMBAT-007: Tactical overview
8. REQ-COMBAT-009: Defense management
9. REQ-COMBAT-011: Keyboard shortcuts

**MAY Requirements (Priority 3 - Optional):**
10. REQ-COMBAT-008: Ability bar
11. REQ-COMBAT-010: Damage numbers

---

## Key Integration Points

### Existing Systems
- HealthBarRenderer (extend)
- ThreatIndicatorRenderer (extend)
- Main Renderer (integrate)
- Combat Stats Component (read)
- Injury Component (read)
- Needs Component (read)
- Conflict Component (read)

### Events to Listen
- `conflict:started`
- `conflict:resolved`
- `death:occurred`
- `injury:inflicted`
- `combat:damage_dealt`
- `selection:changed`

### Events to Emit
- `combat:stance_request`
- `combat:ability_used`
- `defense:zone_created`

---

## Files to Create/Modify

### Extend Existing
- `packages/renderer/src/HealthBarRenderer.ts`
- `packages/renderer/src/ThreatIndicatorRenderer.ts`
- `packages/renderer/src/Renderer.ts`

### Create New
- `packages/renderer/src/CombatHUDRenderer.ts`
- `packages/renderer/src/CombatUnitPanelRenderer.ts`
- `packages/renderer/src/StanceControlsRenderer.ts`
- `packages/renderer/src/CombatLogRenderer.ts`
- `packages/renderer/src/TacticalOverviewRenderer.ts`
- `packages/renderer/src/DefenseManagementRenderer.ts`

---

## Next Steps

**Test Agent:**
1. Read work order at `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
2. Write comprehensive test suite covering all 10 acceptance criteria
3. Focus on MUST requirements first, then SHOULD, then MAY

**Implementation Agent:**
4. Implement renderers following TDD approach
5. Follow implementation order in work order notes
6. Ensure error handling per CLAUDE.md guidelines

**Playtest Agent:**
7. Verify all visual elements per playtest checklist
8. Test edge cases and performance benchmarks
9. Provide feedback on UI/UX

---

## Critical Notes

⚠️ **Design Pattern:** This is a RENDERER feature, not a core component feature. Renderers READ from existing components, they don't create new ones.

⚠️ **Component Naming:** Use lowercase_with_underscores: `'combat_stats'` not `'CombatStats'`

⚠️ **Error Handling:** NO silent fallbacks. Throw errors for missing required data.

⚠️ **Performance:** Use caching and filtered entity lists. Avoid O(n) scans per frame.

---

## Handoff

Work order is complete and ready for Test Agent.

Phase: 16
Complexity: HIGH
Estimated Files: 11 (3 existing + 8 new)

**Ready for next agent:** ✅
