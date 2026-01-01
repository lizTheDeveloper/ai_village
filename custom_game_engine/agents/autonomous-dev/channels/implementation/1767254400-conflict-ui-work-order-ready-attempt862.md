# WORK ORDER CONFIRMED: Conflict UI

**Attempt:** #862
**Timestamp:** 2025-12-31 22:40:00
**Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Confirmation

✅ **Work order EXISTS and is COMPLETE**

The work order was created in previous attempts and is fully ready.

### Work Order Details
- **Feature:** Conflict/Combat UI
- **Phase:** 16
- **Lines:** 476
- **Spec:** [openspec/specs/ui-system/conflict.md](../../../../openspec/specs/ui-system/conflict.md)
- **Status:** READY_FOR_TESTS

### Work Order Contents Verified
- ✅ Spec references (primary + 3 related specs)
- ✅ Requirements summary (11 requirements: 5 MUST, 4 SHOULD, 2 MAY)
- ✅ Acceptance criteria (10 detailed criteria with WHEN/THEN/Verification)
- ✅ System integration mapping (7 existing systems identified)
- ✅ New components needed (8 renderer classes)
- ✅ Events (12 listens, 4 emits)
- ✅ UI requirements (8 UI components detailed)
- ✅ Files to modify/create (comprehensive list)
- ✅ Implementation notes (key design decisions, integration sequence)
- ✅ Playtest notes (visual checklist, edge cases, performance checks)

---

## Requirements Breakdown

**MUST Requirements (5):**
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bars with injury indicators
3. REQ-COMBAT-003: Combat unit panel
4. REQ-COMBAT-004: Stance controls
5. REQ-COMBAT-005: Threat indicators

**SHOULD Requirements (4):**
6. REQ-COMBAT-006: Combat log
7. REQ-COMBAT-007: Tactical overview
8. REQ-COMBAT-009: Defense management
9. REQ-COMBAT-011: Keyboard shortcuts

**MAY Requirements (2 - Optional):**
10. REQ-COMBAT-008: Ability bar
11. REQ-COMBAT-010: Floating damage numbers

---

## System Integration

### Existing Systems Affected
| System | File | Integration Type |
|--------|------|-----------------|
| Health Bar Renderer | packages/renderer/src/HealthBarRenderer.ts | EXISTING - Extend |
| Threat Indicator Renderer | packages/renderer/src/ThreatIndicatorRenderer.ts | EXISTING - Extend |
| Main Renderer | packages/renderer/src/Renderer.ts | EventBus/Component |
| Combat Stats | packages/core/src/components/CombatStatsComponent.ts | Component Read |
| Injury | packages/core/src/components/InjuryComponent.ts | Component Read |
| Needs | packages/core/src/components/NeedsComponent.ts | Component Read |
| Conflict | packages/core/src/components/ConflictComponent.ts | Component Read |

### New Components to Create
- `CombatHUDRenderer.ts` - REQ-COMBAT-001
- `CombatUnitPanelRenderer.ts` - REQ-COMBAT-003
- `StanceControlsRenderer.ts` - REQ-COMBAT-004
- `CombatLogRenderer.ts` - REQ-COMBAT-006
- `TacticalOverviewRenderer.ts` - REQ-COMBAT-007
- `DefenseManagementRenderer.ts` - REQ-COMBAT-009
- `AbilityBarRenderer.ts` - REQ-COMBAT-008 (optional)
- `DamageNumbersRenderer.ts` - REQ-COMBAT-010 (optional)

---

## Key Notes for Implementation

### Component Naming Convention
⚠️ **CRITICAL:** Use lowercase_with_underscores

```typescript
// CORRECT ✅
entity.hasComponent('combat_stats')
entity.getComponent('needs')

// WRONG ❌
entity.hasComponent('CombatStats')
```

### Error Handling
⚠️ **NO silent fallbacks** - throw errors for missing data

```typescript
// CORRECT ✅
if (!entity.hasComponent('combat_stats')) {
  throw new Error(`Entity ${entity.id} missing combat_stats`);
}

// WRONG ❌
const stats = entity.getComponent('combat_stats') || defaultStats;
```

### Performance
- Use viewport culling for health bars
- Cache player entity for distance calculations
- Filtered entity lists, not full world scans
- EventBus-driven updates, no polling

---

## Implementation Priority

### Phase 1: Core (MUST)
1. Enhance HealthBarRenderer (injury icons)
2. Enhance ThreatIndicatorRenderer (off-screen arrows)
3. Create CombatHUDRenderer
4. Create CombatUnitPanelRenderer
5. Create StanceControlsRenderer

### Phase 2: Advanced (SHOULD)
6. Create CombatLogRenderer
7. Create TacticalOverviewRenderer
8. Create DefenseManagementRenderer
9. Implement keyboard shortcuts

### Phase 3: Polish (MAY - optional)
10. Create AbilityBarRenderer
11. Create DamageNumbersRenderer

---

## Handoff to Test Agent

✅ **Work order is complete and verified**

**Next Agent:** Test Agent
**Task:** Write test suite for all acceptance criteria

**Work Order Path:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

**Spec Agent:** spec-agent-001
**Date:** 2025-12-31
**Attempt:** #862
**Result:** ✅ WORK ORDER CONFIRMED READY
