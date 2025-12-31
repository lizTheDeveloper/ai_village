# WORK ORDER CREATED: conflict-combat-ui

**Timestamp:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Agent:** spec-agent-001
**Attempt:** #34
**Status:** READY_FOR_TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

---

## Summary

Created comprehensive work order for Combat/Conflict UI feature.

### Spec Details

- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Phase:** UI System Extension
- **Dependencies:** conflict-system/spec.md, agent-system/spec.md

### Requirements Covered

**MUST Requirements (REQ-COMBAT-001 to 005):**
1. Combat HUD overlay showing active conflicts
2. Health bars with injury indicators
3. Combat unit panel with detailed stats
4. Stance controls (passive/defensive/aggressive/flee)
5. Threat indicators in world space

**SHOULD Requirements (REQ-COMBAT-006, 007, 009, 011):**
6. Scrollable combat log with filtering
7. Tactical overview with battle prediction
8. Defense management for structures/zones
9. Keyboard shortcuts for combat actions

**MAY Requirements (REQ-COMBAT-008, 010):**
10. Ability bar for combat abilities
11. Floating damage numbers

### Acceptance Criteria

8 detailed acceptance criteria covering:
- Health bar display and color transitions
- Combat HUD activation on conflict start
- Threat indicator positioning and severity
- Combat unit panel information display
- Stance control functionality
- Combat log event tracking
- Injury display with healing progress
- Damage number animations

### System Integration

**Existing Systems:**
- Renderer.ts (render combat UI)
- ConflictComponent.ts (conflict data)
- EventBus.ts (combat events)
- AgentInfoPanel.ts (extend with combat info)

**New UI Components (9 files):**
- CombatHUD.ts
- HealthBarRenderer.ts
- CombatUnitPanel.ts
- StanceControls.ts
- ThreatIndicators.ts
- CombatLog.ts
- FloatingCombatNumbers.ts
- TacticalOverview.ts (SHOULD)
- DefenseManagement.ts (SHOULD)

**Events:**
- Listens: conflict:started, conflict:resolved, combat:damage, combat:heal, combat:injury, combat:death, threat:detected
- Emits: ui:stance_changed, ui:combat_log_filter, ui:threat_selected

### Implementation Phases

1. **Phase 1 (MUST):** Health bars, Combat HUD, Stance controls
2. **Phase 2 (MUST):** Threat indicators, Combat unit panel  
3. **Phase 3 (SHOULD):** Combat log, Floating numbers
4. **Phase 4 (SHOULD):** Tactical overview, Defense management
5. **Phase 5 (MAY):** Ability bar, Advanced features

### Complexity Assessment

**Overall: Moderate-High**

- Combat HUD: High (complex state management)
- Health bars: Medium (rendering, positioning)
- Combat unit panel: Medium (data aggregation)
- Stance controls: Low (simple buttons)
- Threat indicators: Medium (positioning, culling)
- Combat log: Medium (scrolling, filtering)
- Tactical overview: High (battle prediction)
- Floating numbers: Low (animation)

**Estimated:** 8-10 new UI components + 5-6 file modifications

---

## Dependencies Met

✅ Conflict system core mechanics exist
✅ ConflictComponent.ts exists
✅ Event system in place
✅ Spec is complete with clear requirements
✅ All blocking tasks completed

---

## Notes for Next Agent

### Implementation Agent

- **Start with Phase 1 (MUST):** Focus on health bars, combat HUD, and stance controls first
- **Check existing components:** Verify HealthComponent, InjuryComponent existence before creating new ones
- **Import, don't redefine:** Use conflict-system types, create "Display" wrappers for UI data
- **Follow 8-bit style:** Match existing UI aesthetic with bold outlines
- **Performance:** Health bars only for visible entities, combat log max 100 events

### Test Agent

Your work order includes detailed playtest verification:
- Health bar visibility and color transitions
- Combat HUD trigger conditions
- Stance control keyboard shortcuts (1-4)
- Threat indicator positioning
- Combat log event accuracy
- Injury icon display
- Edge cases: multiple conflicts, off-screen combat, rapid stance changes
- Performance: 10+ agents, 5+ conflicts, 100+ log events

---

## Handoff

Work order is complete and ready for Test Agent to begin test suite creation.

**Next Step:** Test Agent creates test files based on acceptance criteria in work order.

---

spec-agent-001 signing off ✓
