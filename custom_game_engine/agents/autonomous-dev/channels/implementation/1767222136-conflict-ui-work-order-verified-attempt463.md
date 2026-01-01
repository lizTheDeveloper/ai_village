# Work Order Verified: conflict-ui

**Attempt:** #463
**Timestamp:** 2025-12-31T22:55:36Z
**Agent:** spec-agent-001

---

## Status: WORK ORDER COMPLETE ✅

The work order for `conflict-ui` (Combat/Conflict UI) has been successfully created and is ready for the development pipeline.

### Work Order Location
`custom_game_engine/agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

### Spec References
- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Conflict System:** `openspec/specs/conflict-system/spec.md`
- **Agent System:** `openspec/specs/agent-system/spec.md`
- **Notifications:** `openspec/specs/ui-system/notifications.md`

### Phase Information
- **Phase:** UI Implementation (Phase 16)
- **Status:** READY_FOR_TESTS
- **Priority:** HIGH (combat is core gameplay mechanic)
- **Complexity:** HIGH (multiple interconnected UI components)

---

## Work Order Contents

### Requirements Breakdown
- **11 Total Requirements**
  - 5 MUST requirements (REQ-COMBAT-001 through REQ-COMBAT-005)
  - 5 SHOULD requirements (REQ-COMBAT-006, 007, 009, 011)
  - 2 MAY requirements (REQ-COMBAT-008, 010)

### Core Components

**MUST Implement:**
1. Combat HUD overlay (active conflicts, threat level)
2. Health bars with injury icons
3. Combat Unit Panel (stats, equipment, stance)
4. Stance controls (passive/defensive/aggressive/flee)
5. Threat indicators (on-screen and off-screen)

**SHOULD Implement:**
6. Combat Log (scrollable, filterable events)
7. Tactical Overview (force summary, battle prediction)
8. Defense Management (zones, patrols)
9. Keyboard shortcuts (1-4, L, T, A/H/R/P)

**MAY Implement:**
10. Ability Bar (quick access)
11. Floating damage numbers

### Acceptance Criteria
10 detailed acceptance criteria covering:
- Active conflict display
- Health bar visualization with color thresholds
- Combat unit panel stat display
- Stance control functionality
- Threat indicator rendering
- Combat log event recording
- Tactical overview force summary
- Injury icon display
- Conflict resolution display
- Defense zone management

### System Integration Points

**EventBus Events:**
- **Consumes:** conflict:started, conflict:resolved, combat:attack, injury:inflicted, entity:death, threat:detected
- **Emits:** combat:stance_changed, combat:ability_used, combat:focus_requested

**Existing Components to Enhance:**
- CombatHUDPanel.ts - Add threat level display, click handlers
- CombatLogPanel.ts - Add filtering, scrolling, color coding
- CombatUnitPanel.ts - Add injury display, stance controls

**New Files to Create:**
- HealthBarRenderer.ts - In-world health bar overlay
- ThreatIndicatorRenderer.ts - Threat icon overlay
- TacticalOverviewPanel.ts - Full-screen tactical view
- StanceControls.ts - Stance button widget (ALREADY EXISTS ✓)
- CombatStanceComponent.ts - Entity stance state (if needed)
- GuardDutyComponent.ts - Guard assignment tracking (ALREADY EXISTS ✓)

**Integration Files:**
- Renderer.ts - Register health bar + threat overlays
- WindowManager.ts - Register new panels
- main.ts - Add keyboard shortcut bindings

---

## Testing Guidance

### Test Scenarios
1. Two-agent combat with aggressive stance
2. Predator attack with threat indicators
3. Multiple concurrent conflicts
4. Stance switching mid-combat
5. Injury persistence and healing

### Performance Requirements
- Smooth rendering with 50+ entities
- Combat log limited to 100 events (prune oldest)
- Health bars batch rendered, cull off-screen
- Threat indicators use spatial indexing

---

## Dependencies Met

All dependencies verified:
- ✅ Conflict System spec exists
- ✅ Agent System spec exists
- ✅ Notification System spec exists
- ✅ Some combat UI files already exist (CombatHUDPanel, CombatLogPanel, CombatUnitPanel, StanceControls)
- ✅ EventBus system functional
- ✅ WindowManager panel registration system exists

---

## Next Steps

**Pipeline Status:**
Spec Agent ✅ → **Test Agent** 🔜 → Implementation Agent → Review Agent → Playtest Agent

The work order is complete and comprehensive. Handing off to Test Agent to create test suite.

---

## Notes

- Work order follows template structure
- All sections completed (Requirements, Acceptance Criteria, System Integration, Files, Testing)
- Existing combat panel files identified for enhancement
- Clear separation of MUST/SHOULD/MAY priorities
- No blocking issues found
- Spec is comprehensive and implementation-ready
