# WORK ORDER READY: conflict-ui

**Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Phase:** 16
**Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Work Order Created

Work order successfully created at:
```
agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

File size: 19,563 bytes (450 lines)

---

## Spec Verification

✅ **Primary Spec:** openspec/specs/ui-system/conflict.md (COMPLETE)
✅ **Related Specs:**
  - openspec/specs/conflict-system/spec.md - Conflict mechanics
  - openspec/specs/agent-system/spec.md - Agent stats
  - openspec/specs/ui-system/notifications.md - Combat alerts

---

## Requirements Summary

11 requirements identified:
- 5 MUST requirements (REQ-COMBAT-001 through REQ-COMBAT-005)
- 4 SHOULD requirements (REQ-COMBAT-006, 007, 009, 011)
- 2 MAY requirements (REQ-COMBAT-008, 010)

---

## Acceptance Criteria

12 acceptance criteria defined covering:
- Combat HUD activation/deactivation
- Health bar rendering and color coding
- Injury display on health bars
- Combat unit panel with stats/equipment
- Stance controls (passive/defensive/aggressive/flee)
- Threat detection and indicators
- Off-screen threat edge indicators
- Threat radar with relative positioning
- Combat log event recording
- Tactical overview map
- Damage numbers (floating text)
- Keyboard shortcuts for stances

---

## System Integration

### Existing Systems Referenced
- AgentCombatSystem (combat:started, combat:ended events)
- ConflictComponent (read conflict state)
- InjuryComponent (display injuries)
- CombatStatsComponent (display stats)
- GuardDutySystem (threat detection)
- VillageDefenseSystem (defense alerts)
- ContextMenuManager (UI pattern reference)

### New Components Required
- CombatUIStateComponent (UI state persistence)
- ThreatTrackingComponent (threat tracking)

### Events Defined
Emits: 6 UI events (hud_opened, hud_closed, stance_changed, threat_acknowledged, tactical_opened, tactical_closed)
Listens: 10 system events (combat, conflict, injury, death, threats, defense, input)

---

## Files Identified

**New Files (10):**
- packages/renderer/src/combat/CombatHUDManager.ts
- packages/renderer/src/combat/HealthBarRenderer.ts
- packages/renderer/src/combat/ThreatIndicatorRenderer.ts
- packages/renderer/src/combat/CombatUnitPanel.ts
- packages/renderer/src/combat/CombatLogRenderer.ts
- packages/renderer/src/combat/TacticalOverviewRenderer.ts
- packages/renderer/src/combat/StanceControls.ts
- packages/renderer/src/combat/types.ts
- packages/core/src/components/CombatUIStateComponent.ts
- packages/core/src/components/ThreatTrackingComponent.ts

**Modified Files (5):**
- packages/renderer/src/Renderer.ts
- packages/renderer/src/index.ts
- packages/core/src/index.ts
- packages/core/src/components/index.ts
- demo/src/main.ts

---

## Implementation Notes Provided

### Architecture Guidance
- Follow ContextMenuManager pattern (manager + renderer separation)
- Event bus integration with listener cleanup
- Component type naming: lowercase_with_underscores
- State management with typed interfaces
- Lifecycle management with destroy() method

### Performance Considerations
- Health bar culling (only render on-screen entities)
- Threat list caching (don't scan every frame)
- Combat log circular buffer (max 100 events)
- Animation frame timing

### Special Notes
- Z-index layering defined (world → health bars → HUD → overlays → menu)
- Keyboard shortcut coordination needed
- Stance persistence required
- Conflict-system event availability TBD (may need fallbacks)

---

## Playtest Guidance Provided

10 UI behavior verification scenarios defined:
- Combat initiation flow
- Health bar visibility and color coding
- Injury display with tooltips
- Stance change interactions
- Threat detection and indicators
- Combat log functionality
- Tactical overview
- Performance with 20+ entities
- Keyboard shortcuts
- Edge cases (multiple combats, deaths, off-screen threats)

Visual polish checklist provided (alignment, animations, styling)
Integration issue watch list provided (menu conflicts, z-fighting, memory leaks)

---

## Next Steps

This work order is now ready for the Test Agent to create comprehensive test cases.

After tests are written, the Implementation Agent can begin development.

**Attempt:** #486
**Previous Issue:** Work order file was not created in previous attempts
**Resolution:** File successfully created at correct path with complete specification

---

## Hand-Off

📝 **Work order complete and ready**
🔬 **Handing off to Test Agent**
✅ **Spec verification: PASSED**
📊 **Requirements: 11 identified**
🎯 **Criteria: 12 defined**
🗂️ **Files: 15 identified**

The pipeline can now proceed to test creation phase.
