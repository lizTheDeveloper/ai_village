# Work Order Ready: conflict/combat-ui

**Status:** READY_FOR_TESTS
**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T15:00:00Z
**Attempt:** #257

---

## Work Order Created

✅ Work order file exists and is complete: `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Phase:** 16 (UI Systems)
**Spec:** `openspec/specs/ui-system/conflict.md`

---

## Requirements Coverage

The work order includes:

### MUST Requirements
1. ✅ REQ-COMBAT-001: Combat HUD
2. ✅ REQ-COMBAT-002: Health Bars (already implemented)
3. ✅ REQ-COMBAT-003: Combat Unit Panel
4. ✅ REQ-COMBAT-004: Stance Controls
5. ✅ REQ-COMBAT-005: Threat Indicators

### SHOULD Requirements
6. ✅ REQ-COMBAT-006: Combat Log
7. ✅ REQ-COMBAT-007: Tactical Overview
8. ✅ REQ-COMBAT-009: Defense Management
9. ✅ REQ-COMBAT-011: Keyboard Shortcuts

### MAY Requirements
10. ✅ REQ-COMBAT-008: Ability Bar
11. ✅ REQ-COMBAT-010: Damage Numbers

---

## System Integration Points

**Existing Systems:**
- AgentCombatSystem (packages/core/src/systems/AgentCombatSystem.ts)
- HealthBarRenderer (packages/renderer/src/HealthBarRenderer.ts) - Already implemented
- ThreatIndicatorRenderer (packages/renderer/src/ThreatIndicatorRenderer.ts) - Partial
- EventBus (conflict events)

**New Components:**
- CombatHUDComponent
- CombatStanceComponent
- DefenseZoneComponent
- GuardDutyComponent

**New Renderers:**
- CombatHUDRenderer
- CombatUnitPanelRenderer
- StanceControlsRenderer
- CombatLogRenderer
- TacticalOverviewRenderer

---

## Acceptance Criteria

12 detailed acceptance criteria defined in work order, including:
- Combat HUD activation on conflict
- Health bar display with color coding ✅ (complete)
- Injury indicators ✅ (complete)
- Combat unit panel showing stats/equipment
- Stance controls with hotkeys
- Threat indicators (on-screen and off-screen)
- Combat log with filtering
- Tactical overview with force comparison
- Defense zone management
- Keyboard shortcuts (1-4 for stances, A/H/R for commands)

---

## Dependencies Met

All dependency specs exist and are complete:
- ✅ conflict-system/spec.md - Conflict mechanics
- ✅ agent-system/spec.md - Agent stats
- ✅ ui-system/notifications.md - Combat alerts

---

## Priority Implementation Order

**Phase 1 (MUST):**
1. Combat HUD (REQ-COMBAT-001)
2. Combat Unit Panel (REQ-COMBAT-003)
3. Stance Controls (REQ-COMBAT-004)
4. Threat Indicators enhancement (REQ-COMBAT-005)

**Phase 2 (SHOULD):**
5. Combat Log (REQ-COMBAT-006)
6. Tactical Overview (REQ-COMBAT-007)
7. Defense Management (REQ-COMBAT-009)
8. Keyboard Shortcuts (REQ-COMBAT-011)

**Phase 3 (MAY):**
9. Ability Bar (REQ-COMBAT-008)
10. Damage Numbers (REQ-COMBAT-010)

---

## Special Notes

**Existing Implementations:**
- Health bars with injury indicators are fully implemented (HealthBarRenderer.ts)
- Threat indicators have partial implementation (ThreatIndicatorRenderer.ts)
- FloatingTextRenderer can be reused for damage numbers

**Alien Species Support:**
- Pack minds: Display all bodies, coherence meter
- Hive minds: Queen status, worker count
- Man'chi species: Lord relationship, loyalty meter

**Architecture:**
- Event-driven: Listen to conflict system events
- Component-based state
- Renderer/Component separation
- Performance culling for off-screen elements

---

## Handoff to Test Agent

The work order is complete and ready for test creation.

**Test Agent:** Please create tests for all 12 acceptance criteria.

**Implementation Agent:** After tests are written, implement in priority order above.

**Playtest Agent:** After implementation, verify all UI behaviors, edge cases, and performance targets listed in work order.

---

**Spec Agent signing off. Work order ready for pipeline.**
