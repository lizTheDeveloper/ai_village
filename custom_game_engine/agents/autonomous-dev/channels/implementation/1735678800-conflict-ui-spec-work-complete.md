# SPEC WORK COMPLETE: conflict-ui

**Timestamp:** 2025-12-31T14:20:00Z
**Attempt:** 449
**Spec Agent:** spec-agent-001

---

## Work Order Status

✅ **Work order verified and ready**

- **Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
- **Phase:** 16
- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Status:** READY_FOR_TESTS

---

## Spec Completeness

✅ All requirements documented:
- REQ-COMBAT-001: Combat HUD ✓
- REQ-COMBAT-002: Health Bars ✓
- REQ-COMBAT-003: Combat Unit Panel ✓
- REQ-COMBAT-004: Stance Controls ✓
- REQ-COMBAT-005: Threat Indicators ✓
- REQ-COMBAT-006: Combat Log (SHOULD) ✓
- REQ-COMBAT-007: Tactical Overview (SHOULD) ✓
- REQ-COMBAT-011: Keyboard Shortcuts (SHOULD) ✓

✅ Testable scenarios provided for all MUST requirements

✅ UI spec complete with TypeScript interfaces

---

## System Integration

✅ Existing systems identified:
- AgentCombatSystem (event source)
- HuntingSystem (event source)
- PredatorAttackSystem (event source)
- InjurySystem (data source)
- CombatHUDPanel (existing, extend)
- HealthBarRenderer (existing, extend)
- WindowManager (integration point)
- KeyboardRegistry (integration point)

✅ Integration points documented:
- **EventBus:** Listen to `conflict:started`, `combat:attack`, `conflict:resolved`, `threat:detected`, `injury:inflicted`, `entity:death`
- **Emit:** `combat:stance_changed`, `combat:ui:focus_conflict`, `combat:ui:select_unit`
- **Components:** ConflictComponent (read), CombatStatsComponent (read/write stance)

---

## New Components Required

The work order documents these new UI components:
1. **CombatUnitPanel** - Detailed unit info (REQ-COMBAT-003)
2. **StanceControls** - Combat stance buttons (REQ-COMBAT-004)
3. **ThreatIndicators** - World threat markers (REQ-COMBAT-005)
4. **CombatLogPanel** - Event log (REQ-COMBAT-006, SHOULD)
5. **TacticalOverview** - Strategic view (REQ-COMBAT-007, SHOULD)

---

## Files Modified/Created

**Extend Existing:**
- `packages/renderer/src/CombatHUDPanel.ts`
- `packages/renderer/src/HealthBarRenderer.ts`

**Create New:**
- `packages/renderer/src/CombatUnitPanel.ts`
- `packages/renderer/src/StanceControls.ts`
- `packages/renderer/src/ThreatIndicators.ts`
- `packages/renderer/src/CombatLogPanel.ts`
- `packages/renderer/src/TacticalOverview.ts` (optional SHOULD)

**Register:**
- `packages/renderer/src/index.ts` - Export new panels

---

## Dependencies

✅ **All dependencies met:**
- ConflictComponent exists at `packages/core/src/components/ConflictComponent.ts`
- AgentCombatSystem exists at `packages/core/src/systems/AgentCombatSystem.ts`
- CombatHUDPanel exists at `packages/renderer/src/CombatHUDPanel.ts`
- HealthBarRenderer exists (checked via grep)
- WindowManager exists
- EventBus available

---

## Notes for Test Agent

### Acceptance Criteria to Verify

1. Combat HUD displays active conflicts when they start
2. Health bars show correct colors (green/yellow/red) based on health percentage
3. CombatUnitPanel displays when entity selected
4. Stance controls change entity behavior
5. Threat indicators appear for predators
6. Combat log records events
7. Keyboard shortcuts (1-4, L) work

### Edge Cases to Test

- Multiple simultaneous conflicts
- Multi-unit selection with different stances (should show "mixed")
- Conflict resolution and HUD cleanup
- Off-screen threat indicators (edge arrows)
- Combat log scrolling with 100+ entries
- Missing injury data handling (should crash per CLAUDE.md)

### Manual Testing Steps

1. Start game at http://localhost:5173
2. Use dev tools to spawn predator near villagers
3. Trigger combat via ConflictComponent creation
4. Verify HUD appears
5. Select entity, verify CombatUnitPanel appears
6. Click stance buttons, verify stance changes
7. Press "L" to toggle combat log
8. Verify no console errors via Playwright MCP

---

## User Notes from Work Order

### Tips for Implementation
- Start with existing CombatHUDPanel and HealthBarRenderer
- Event-driven architecture using EventBus
- Reference context-menu-ui work order for UI patterns
- Use WindowManager for panels
- Follow CLAUDE.md: no debug logs, crash on missing data, lowercase component types

### Common Pitfalls
- Don't recreate health bars - extend HealthBarRenderer
- Don't hardcode colors - use theme system
- Component types MUST be lowercase_with_underscores
- No silent fallbacks - crash immediately

---

## Handoff to Test Agent

Work order is complete and ready for test creation.

**Next Steps:**
1. Test Agent reads work order
2. Test Agent creates test suite
3. Test Agent marks work as READY_FOR_IMPLEMENTATION
4. Implementation Agent receives work order

---

**Spec Agent:** Signing off ✅
