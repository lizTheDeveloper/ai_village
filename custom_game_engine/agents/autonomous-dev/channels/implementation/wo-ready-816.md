# WORK ORDER READY: conflict-ui

**Timestamp:** $(date +%s)
**Attempt:** 816
**Status:** READY_FOR_TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Verification

✅ Work order file exists (411 lines)
✅ Spec analysis complete
✅ All dependencies met
✅ 12 acceptance criteria defined
✅ System integration mapped
✅ EventBus events documented
✅ Playtest scenarios documented

---

## Summary

Comprehensive work order for Conflict/Combat UI (Phase 7):

- **Primary Spec:** openspec/specs/ui-system/conflict.md
- **Related Specs:** conflict-system/spec.md, ui-system/notifications.md
- **Requirements:** 11 requirements (8 MUST, 3 SHOULD, 3 MAY)

### Existing Components (Already Implemented)
- CombatHUDPanel.ts ✅
- HealthBarRenderer.ts ✅ (functional)
- ThreatIndicatorRenderer.ts ✅ (functional)
- CombatLogPanel.ts ✅
- CombatUnitPanel.ts ✅
- StanceControls.ts ✅

### Components Still Needed
- TacticalOverviewPanel.ts (SHOULD)
- DefenseManagementPanel.ts (SHOULD)
- DamageNumbersRenderer.ts (MAY - optional)
- AbilityBarPanel.ts (MAY - optional)

### Integration Focus
1. Verify existing components work with current game
2. Integrate with EventBus (combat:started, combat:ended, etc.)
3. Wire StanceControls to combat_stats components
4. Connect CombatLogPanel to combat events
5. Add keyboard shortcuts
6. Implement missing SHOULD components

---

## Key Acceptance Criteria

1. Combat HUD activates on combat:started event
2. Health bars show for injured/combat entities with color coding
3. Injury indicators appear above health bars
4. Combat Unit Panel displays stats/equipment/stance
5. Stance controls update entity combat_stats.stance
6. Threat indicators render at correct positions
7. Off-screen threats show edge indicators
8. Combat log appends events with timestamps
9. Combat log filtering works
10. Tactical overview shows force counts and predictions
11. Keyboard shortcuts work (1-4 for stances, T for tactical)

---

## Technical Requirements

### Error Handling
- No silent fallbacks - crash on missing components
- Use lowercase_with_underscores for component types
- Validate entities have required components
- Throw clear errors for missing event fields

### Performance
- HealthBarRenderer already optimized (viewport culling)
- ThreatIndicatorRenderer caches player entity
- Combat log capped at 100-200 events
- Off-screen calculation needs optimization

### EventBus Integration
- Listen: conflict:started, conflict:resolved, combat:*, injury:*, death:occurred
- Always cleanup event subscriptions on unmount
- No silent failures on event handling

---

## Handoff

**Status:** READY_FOR_TESTS
**Next Agent:** Test Agent

The work order is complete and comprehensive. Ready for Test Agent to create test cases.
