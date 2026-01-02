# WORK ORDER ALREADY EXISTS: conflict-combat-ui

**Attempt:** #1259
**Timestamp:** 2026-01-01 10:48:09 UTC
**Agent:** spec-agent-001

---

## Status

✅ **Work order file already exists and is complete.**

**Location:** `custom_game_engine/agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

---

## Work Order Summary

- **Phase:** Phase 7 - Conflict & Social Complexity
- **Status:** READY_FOR_TESTS
- **Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Spec:** `openspec/specs/conflict-system/spec.md`

---

## Requirements Covered

The work order includes comprehensive details for:

1. ✅ Combat HUD overlay (REQ-COMBAT-001)
2. ✅ Health bars above entities (REQ-COMBAT-002)
3. ✅ Combat Unit Panel with stats (REQ-COMBAT-003)
4. ✅ Stance Controls for combat behavior (REQ-COMBAT-004)
5. ✅ Threat Indicators in world (REQ-COMBAT-005)
6. ✅ Combat Log for event history (REQ-COMBAT-006)
7. ✅ Tactical Overview (REQ-COMBAT-007)
8. ✅ Ability Bar (REQ-COMBAT-008)
9. ✅ Defense Management (REQ-COMBAT-009)
10. ✅ Damage Numbers (REQ-COMBAT-010)
11. ✅ Keyboard Shortcuts (REQ-COMBAT-011)

---

## Acceptance Criteria

The work order defines 8 testable acceptance criteria:

1. Combat HUD Display - triggers on conflict events
2. Health Bar Rendering - appears on injured/combat entities
3. Combat Unit Panel - shows stats for selected entities
4. Stance Controls - updates entity stance component
5. Threat Indicators - visual markers for threats
6. Combat Log - scrollable event history
7. Event Integration - consumes conflict-system events
8. Keyboard Shortcuts - hotkeys for stance changes

---

## System Integration

Documented integration points:

- **Event Consumption:** `conflict:started`, `conflict:resolved`, `combat:attack`, `entity:injured`, `entity:death`, `threat:detected`
- **Event Emission:** `ui:stance_changed`, `ui:focus_conflict`, `ui:combat_log_filtered`
- **Existing Components:** CombatHUDPanel, HealthBarRenderer, CombatLogPanel, CombatUnitPanel, StanceControls, ThreatIndicatorRenderer
- **Systems Affected:** HuntingSystem, PredatorAttackSystem, AgentCombatSystem, DominanceChallengeSystem, GuardDutySystem

---

## Files to Verify/Modify

The work order lists 18 files likely to be modified/verified:

**Renderer (UI Layer):**
- ✅ CombatHUDPanel.ts (exists)
- ✅ HealthBarRenderer.ts (exists)
- ✅ CombatLogPanel.ts (exists)
- ✅ CombatUnitPanel.ts (exists)
- ✅ StanceControls.ts (exists)
- ✅ ThreatIndicatorRenderer.ts (exists)
- WindowManager.ts (register panels)
- KeyboardRegistry.ts (bind hotkeys)
- Renderer.ts (integrate renderers)

**Core (Systems Layer):**
- HuntingSystem.ts (verify events)
- PredatorAttackSystem.ts (verify events)
- AgentCombatSystem.ts (verify events)
- DominanceChallengeSystem.ts (verify events)
- GuardDutySystem.ts (verify events)

---

## Implementation Notes

The work order includes:

- ✅ Special considerations (component verification, event flow, no silent fallbacks)
- ✅ Gotchas (health bar culling, event cleanup, stance persistence, threat detection)
- ✅ Implementation priority (MUST/SHOULD/MAY breakdown)
- ✅ Playtest verification checklist
- ✅ Edge cases to test

---

## Next Steps

The work order is complete and ready for the Test Agent to:
1. Read the work order
2. Create test specifications
3. Hand off to Implementation Agent

**No further action required from Spec Agent.**

---

**Work order file:** `custom_game_engine/agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`
