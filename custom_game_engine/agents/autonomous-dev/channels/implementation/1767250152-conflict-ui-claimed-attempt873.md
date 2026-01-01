# CLAIMED: conflict-ui

**Attempt:** #873
**Timestamp:** 2025-12-31T22:42:32Z
**Agent:** spec-agent-001

---

## Status

Work order created and verified: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Details

- **Phase:** 7
- **Spec:** openspec/specs/ui-system/conflict.md
- **Dependencies:** All met ✅
  - conflict-system/spec.md (combat mechanics) - Phase 7
  - agent-system/spec.md (agent stats) - Phase 1
  - ui-system/notifications.md (combat alerts) - Phase 5

---

## Work Order Summary

The work order includes:

### Requirements (11 total)
- 5 MUST requirements (Combat HUD, Health Bars, Combat Unit Panel, Stance Controls, Threat Indicators)
- 4 SHOULD requirements (Combat Log, Tactical Overview, Defense Management, Keyboard Shortcuts)
- 2 MAY requirements (Ability Bar, Damage Numbers)

### Existing Components
Several combat UI components already exist and need verification/enhancement:
- CombatHUDPanel.ts
- CombatUnitPanel.ts
- StanceControls.ts
- CombatLogPanel.ts
- HealthBarRenderer.ts
- ThreatIndicatorRenderer.ts

### New Components Needed
- TacticalOverviewPanel.ts
- DefenseManagementPanel.ts
- DamageNumbersRenderer.ts (MAY)
- AbilityBarPanel.ts (MAY)

### Integration Points
- EventBus: Listen to combat:started, combat:ended, threat:detected, injury:inflicted, unit:death
- Renderer: Add combat UI panels to render loop
- WindowManager: Register combat panels
- KeyboardRegistry: Register combat shortcuts

---

## Acceptance Criteria

12 acceptance criteria defined, including:

1. Combat HUD activation on combat start
2. Health bar display for injured/combat entities
3. Health bar color coding (green/yellow/red)
4. Injury indicators above health bars
5. Combat unit panel displays stats/equipment/stance
6. Stance controls update combat_stats component
7. Threat indicators render at threat positions
8. Off-screen threat indicators show direction
9. Combat log appends events with timestamps
10. Combat log filtering by type/entity
11. Tactical overview shows force summaries
12. Keyboard shortcuts execute combat actions

---

## Next Steps

Handing off to **Test Agent** to:

1. Create test plan for 12 acceptance criteria
2. Write integration tests for EventBus listeners
3. Write unit tests for new UI components
4. Create visual regression tests for combat UI rendering
5. Verify existing components work with current game state

---

## Notes

- Work order is complete and comprehensive
- Includes detailed UI requirements and visual specifications
- Lists all files likely to be modified
- Provides implementation priority order
- Includes playtest scenarios and edge cases

✅ **Ready for Test Agent**
