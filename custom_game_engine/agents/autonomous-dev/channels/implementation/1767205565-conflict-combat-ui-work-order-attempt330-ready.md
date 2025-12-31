# Work Order Ready: conflict-combat-ui (Attempt #330)

**Status:** READY_FOR_TESTS
**Phase:** 16
**Created:** 2025-12-31T15:25:00Z
**Spec Agent:** spec-agent-001

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

---

## Summary

Complete work order for Conflict/Combat UI system prepared and ready for implementation.

### Spec References
- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Spec:** `openspec/specs/conflict-system/spec.md`
- **Test Suite:** `packages/renderer/src/__tests__/CombatUIIntegration.test.ts`

### Requirements Summary

**MUST Requirements (Critical):**
1. REQ-COMBAT-001: Combat HUD overlay with conflict/threat display
2. REQ-COMBAT-002: Health Bars ✅ (already exists - integrate)
3. REQ-COMBAT-003: Combat Unit Panel with stats/equipment/stance
4. REQ-COMBAT-004: Stance Controls (passive/defensive/aggressive/flee)
5. REQ-COMBAT-005: Threat Indicators ✅ (already exists - integrate)

**SHOULD Requirements (Important):**
6. REQ-COMBAT-006: Combat Log scrollable event feed
7. REQ-COMBAT-011: Keyboard Shortcuts (1/2/3/4 for stances)

**MAY Requirements (Optional):**
8. REQ-COMBAT-007: Tactical Overview
9. REQ-COMBAT-008: Ability Bar
10. REQ-COMBAT-009: Defense Management
11. REQ-COMBAT-010: Damage Numbers

### Key Integration Points

**Existing Systems:**
- ✅ HealthBarRenderer (`packages/renderer/src/HealthBarRenderer.ts`)
- ✅ ThreatIndicatorRenderer (`packages/renderer/src/ThreatIndicatorRenderer.ts`)
- ✅ AgentCombatSystem emits events (`packages/core/src/systems/AgentCombatSystem.ts`)
- ✅ CombatStatsComponent (`packages/core/src/components/CombatStatsComponent.ts`)

**New Components Needed:**
- `CombatHUDPanel.ts` - Main combat overlay coordinator
- `CombatUnitPanel.ts` - Detailed unit information panel
- `CombatLogPanel.ts` - Combat event log

**Events:**
- Listens: `conflict:started`, `conflict:resolved`, `combat:damage`, `injury:inflicted`, `death:occurred`
- Emits: `ui:stance:changed`

### Implementation Order

**Phase 1: Core UI (MUST)**
1. CombatHUDPanel - activation/deactivation, conflict tracking
2. CombatUnitPanel - stats display, equipment, stance controls
3. Integration with existing HealthBarRenderer and ThreatIndicatorRenderer

**Phase 2: Events & Log (MUST + SHOULD)**
4. CombatLogPanel - event recording, filtering, max 100 events
5. Event coordination - damage/injury/death UI updates
6. Keyboard shortcuts - hotkeys 1/2/3/4 for stances

**Phase 3: Advanced (MAY) - Deferred**
7. Tactical Overview, Defense Management, Damage Numbers, Ability Bar

### Test Coverage

Comprehensive test suite exists at:
`packages/renderer/src/__tests__/CombatUIIntegration.test.ts` (685 lines)

Tests are currently `.skip` - remove as features are implemented.

**Critical Tests:**
- Combat HUD activation (line 30-65)
- Damage UI updates (line 67-89)
- Injury indicators (line 91-123)
- Death handling (line 125-148)
- Stance controls (line 173-233)
- Multi-select (line 235-308)
- Performance: 50 health bars <16ms (line 310-377)
- Event coordination (line 408-474)
- Keyboard shortcuts (line 527-572)

### Gotchas

1. **HealthBarRenderer already exists** - Don't recreate, integrate
2. **ThreatIndicatorRenderer already exists** - Don't recreate, integrate
3. **Component types use lowercase_with_underscores**: `combat_stats` not `CombatStats`
4. **Performance target:** 50+ entities at 60fps (<16ms render)
5. **Combat Log growth:** Limit to 100 events, auto-trim oldest
6. **Memory leaks:** Unsubscribe from EventBus in cleanup methods

### Success Criteria

Work order COMPLETE when:
1. ✅ All MUST requirements implemented
2. ✅ Tests pass in CombatHUDPanel.test.ts (remove .skip)
3. ✅ Tests pass in CombatUnitPanel.test.ts (remove .skip)
4. ✅ Tests pass in CombatLogPanel.test.ts (remove .skip)
5. ✅ Integration tests pass in CombatUIIntegration.test.ts (remove .skip)
6. ✅ Performance test: 50 health bars <16ms
7. ✅ Build passes: `npm run build`
8. ✅ No console errors during combat scenarios

---

## Dependencies Verified

**Hard Dependencies (MUST exist):**
- ✅ HealthBarRenderer.ts
- ✅ ThreatIndicatorRenderer.ts
- ✅ EventBus (core)
- ✅ World/ECS (core)
- ✅ CombatTypes.ts
- ✅ CombatStatsComponent.ts

**All dependencies met ✅**

---

## Handing Off

Work order is complete and comprehensive.

**Next Agent:** Test Agent (to verify test suite completeness) or Implementation Agent (to begin development)

**Roadmap Status:** Feature marked 🚧 in MASTER_ROADMAP.md

---

**Spec Agent:** spec-agent-001
**Timestamp:** 2025-12-31T15:25:00Z
**Attempt:** #330
