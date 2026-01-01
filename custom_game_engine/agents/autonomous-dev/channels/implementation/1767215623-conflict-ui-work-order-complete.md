# Work Order Created: conflict-ui

**Status:** READY_FOR_TESTS
**Created:** 2025-12-31
**Spec Agent:** spec-agent-001
**Attempt:** 424

## Summary

Work order successfully created for Conflict/Combat UI feature (Phase 16).

## Work Order Location

`agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

## Spec Reference

Primary: `openspec/specs/ui-system/conflict.md`

Related:
- `openspec/specs/conflict-system/spec.md`
- `openspec/specs/agent-system/spec.md`
- `openspec/specs/ui-system/notifications.md`

## Key Requirements

The UI SHALL implement:
1. Combat HUD overlay (REQ-COMBAT-001) - MUST
2. Health bars with injury display (REQ-COMBAT-002) - MUST  
3. Combat unit panel with stats/equipment (REQ-COMBAT-003) - MUST
4. Stance controls (passive/defensive/aggressive/flee) (REQ-COMBAT-004) - MUST
5. Threat indicators (on-screen + off-screen) (REQ-COMBAT-005) - MUST
6. Combat log with filtering (REQ-COMBAT-006) - SHOULD
7. Tactical overview (REQ-COMBAT-007) - SHOULD
8. Defense management (zones/patrols) (REQ-COMBAT-009) - SHOULD
9. Keyboard shortcuts (REQ-COMBAT-011) - SHOULD
10. Ability bar (REQ-COMBAT-008) - MAY
11. Damage numbers (REQ-COMBAT-010) - MAY

## System Integration

### Existing Systems Used
- **AgentCombatSystem** (packages/core/src/systems/AgentCombatSystem.ts)
  - Events: `combat:started`, `combat:ended`
- **InjurySystem** (packages/core/src/systems/InjurySystem.ts)
  - Component: `injury`
- **HuntingSystem** (packages/core/src/systems/HuntingSystem.ts)
  - Events: `hunting:started`, `hunting:ended`
- **PredatorAttackSystem** (packages/core/src/systems/PredatorAttackSystem.ts)
  - Events: `predator:attack_started`, `predator:attack_ended`
- **DominanceChallengeSystem** (packages/core/src/systems/DominanceChallengeSystem.ts)
  - Events: `dominance:challenge_started`, `dominance:challenge_ended`
- **GuardDutySystem** (packages/core/src/systems/GuardDutySystem.ts)
  - Component: `guard_duty`
- **VillageDefenseSystem** (packages/core/src/systems/VillageDefenseSystem.ts)
  - Component: `village_defense`

### Components to Create
- `packages/renderer/src/combat/CombatHUD.ts`
- `packages/renderer/src/combat/HealthBarRenderer.ts`
- `packages/renderer/src/combat/CombatUnitPanel.ts`
- `packages/renderer/src/combat/StanceControls.ts`
- `packages/renderer/src/combat/ThreatIndicators.ts`
- `packages/renderer/src/combat/CombatLog.ts`
- `packages/renderer/src/combat/TacticalOverview.ts`
- `packages/renderer/src/combat/DefenseManagement.ts`
- `packages/renderer/src/combat/DamageNumbers.ts`
- `packages/renderer/src/combat/CombatShortcuts.ts`

### Files to Modify
- `packages/renderer/src/main.ts` - Wire up combat UI
- `packages/renderer/src/Renderer.ts` - Add render calls

## Dependencies

All dependencies satisfied:
- ✅ Conflict-system spec (openspec/specs/conflict-system/spec.md)
- ✅ Agent-system spec (openspec/specs/agent-system/spec.md)
- ✅ ConflictComponent implemented
- ✅ InjuryComponent implemented
- ✅ CombatStatsComponent implemented
- ✅ AgentCombatSystem implemented (emits events)
- ✅ InjurySystem implemented
- ✅ HuntingSystem implemented
- ✅ EventBus infrastructure exists
- ✅ Renderer package structure exists
- ✅ BuildingPlacementUI pattern to follow

## Acceptance Criteria

10 criteria defined covering:
- Combat HUD activation on conflict start
- Health bar display with color coding
- Injury status display with icons/tooltips
- Stance control button UI and behavior
- Threat indicator rendering (on/off screen)
- Combat log event display and filtering
- Tactical overview force comparison
- Defense zone creation and management
- Keyboard shortcut support
- Combat resolution narrative display

## Implementation Notes

Work order includes:
- Detailed component architecture
- EventBus integration points
- Component query patterns
- Existing UI pattern to follow (BuildingPlacementUI)
- Performance considerations (viewport culling, object pooling)
- Visual style guide (8-bit pixel art, colors)
- Implementation priority (Phase 1 MUST, Phase 2 SHOULD, Phase 3 MAY)
- Playtest scenarios and edge cases

## Next Step

✅ Work order complete and ready
→ Handing off to Test Agent for test specification creation

---

**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T13:15:00Z
**Attempt:** 424
