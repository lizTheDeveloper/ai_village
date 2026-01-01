# Conflict UI - Work Order Ready

**Status:** WORK ORDER READY
**Feature:** conflict-ui
**Phase:** 7
**Created:** 2025-12-31
**Spec Agent:** spec-agent-001
**Attempt:** #871

---

## Summary

Work order has been verified and is ready for implementation.

**Work Order Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Spec References

- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Specs:**
  - `openspec/specs/conflict-system/spec.md` (Conflict mechanics)
  - `openspec/specs/agent-system/spec.md` (Agent stats)
  - `openspec/specs/ui-system/notifications.md` (Combat alerts)

---

## Requirements Summary

The work order specifies 11 requirements from the conflict UI spec:

### MUST Requirements
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Visual health indicators
3. REQ-COMBAT-003: Combat unit panel
4. REQ-COMBAT-004: Stance controls
5. REQ-COMBAT-005: Threat indicators

### SHOULD Requirements
6. REQ-COMBAT-006: Combat log
7. REQ-COMBAT-007: Tactical overview
8. REQ-COMBAT-009: Defense management
9. REQ-COMBAT-011: Keyboard shortcuts

### MAY Requirements (Optional)
10. REQ-COMBAT-008: Ability bar
11. REQ-COMBAT-010: Floating damage numbers

---

## Existing Implementation Status

### ✅ Already Implemented
The following components exist in the codebase:
- `packages/renderer/src/HealthBarRenderer.ts` - Functional health bars
- `packages/renderer/src/ThreatIndicatorRenderer.ts` - Functional threat indicators
- `packages/renderer/src/CombatHUDPanel.ts` - Combat HUD
- `packages/renderer/src/CombatUnitPanel.ts` - Unit detail panel
- `packages/renderer/src/StanceControls.ts` - Stance selector
- `packages/renderer/src/CombatLogPanel.ts` - Combat event log

### ⚠️ Needs Verification/Enhancement
Implementation should focus on:
1. **Integration testing** - Verify existing components work in live game
2. **Gap filling** - Add missing features (tactical view, defense management)
3. **EventBus wiring** - Ensure components respond to conflict events
4. **Enhancement** - Off-screen indicators, injury icons, etc.

---

## System Integration Points

### Existing Systems
| System | File | Integration Type |
|--------|------|-----------------|
| HealthBarRenderer | packages/renderer/src/HealthBarRenderer.ts | Already exists |
| ThreatIndicatorRenderer | packages/renderer/src/ThreatIndicatorRenderer.ts | Already exists |
| EventBus | packages/core/src/events/EventBus.ts | Listen to conflict events |
| Renderer | packages/renderer/src/Renderer.ts | Add to render loop |
| WindowManager | packages/renderer/src/WindowManager.ts | Register panels |

### Events to Listen
- `conflict:started` - Activate combat HUD
- `conflict:resolved` - Update combat state
- `death:occurred` - Clean up indicators
- `combat:started` - Combat HUD activation
- `combat:ended` - Combat HUD deactivation

---

## Dependencies

All dependencies met ✅:
- ConflictComponent exists
- CombatStatsComponent exists
- EventBus functional
- UI components implemented

---

## Critical Implementation Notes

### Component Naming
**MUST use lowercase_with_underscores:**
```typescript
// ✅ CORRECT
entity.hasComponent('combat_stats')
entity.getComponent('needs')

// ❌ WRONG
entity.hasComponent('CombatStats')
```

### Error Handling
**NO silent fallbacks** per CLAUDE.md:
```typescript
// ✅ CORRECT - Crash on missing data
if (!entity.hasComponent('combat_stats')) {
  throw new Error(`Entity missing required combat_stats component`);
}

// ❌ WRONG - Silent fallback
const stats = entity.getComponent('combat_stats') || defaultStats;
```

### No Debug Logging
**NEVER add console.log** - Use Agent Dashboard for debugging

---

## Acceptance Criteria

The work order specifies 12 acceptance criteria covering:
1. Combat HUD activation on combat start
2. Health bar display rules (injured/combat entities)
3. Health bar color coding (green/yellow/red)
4. Injury indicator icons
5. Combat unit panel display
6. Stance control updates
7. Threat indicator rendering
8. Off-screen threat indicators
9. Combat log event appending
10. Combat log filtering
11. Tactical overview display
12. Keyboard shortcut execution

---

## Implementation Priority

### Phase 1: Core (HIGH PRIORITY)
1. Verify HealthBarRenderer integration
2. Verify ThreatIndicatorRenderer integration
3. Wire CombatHUDPanel to EventBus
4. Connect StanceControls to component updates
5. Test CombatLogPanel with events

### Phase 2: Advanced (MEDIUM PRIORITY)
6. Implement TacticalOverviewPanel
7. Add keyboard shortcuts
8. Implement DefenseManagementPanel

### Phase 3: Polish (LOW PRIORITY)
9. DamageNumbersRenderer (optional)
10. AbilityBarPanel (optional)

---

## Hand-off

**Next Agent:** Test Agent

**Task:** Create test specifications based on work order acceptance criteria

**Status:** ✅ READY FOR TESTS

---

**Spec Agent:** spec-agent-001
**Timestamp:** 1767249678
**Result:** WORK ORDER READY
