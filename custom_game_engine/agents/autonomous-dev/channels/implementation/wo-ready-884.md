# WORK ORDER READY: conflict-ui

**Attempt:** 884
**Status:** ✅ VERIFIED - Work order exists and is complete
**Timestamp:** 2025-12-31T23:12:00Z

---

## Work Order Location

```
agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

**Size:** 411 lines
**Status:** READY_FOR_TESTS

---

## Spec Summary

**Primary Spec:** openspec/specs/ui-system/conflict.md

The Conflict UI provides visualization and control of combat situations, threats, and defensive operations.

### Key Requirements (11 total)

**MUST Requirements:**
1. REQ-COMBAT-001: Combat HUD overlay
2. REQ-COMBAT-002: Health bars with injury display
3. REQ-COMBAT-003: Combat Unit Panel
4. REQ-COMBAT-004: Stance controls (passive/defensive/aggressive/flee)
5. REQ-COMBAT-005: Threat indicators

**SHOULD Requirements:**
6. REQ-COMBAT-006: Combat log
7. REQ-COMBAT-007: Tactical overview
8. REQ-COMBAT-009: Defense management
9. REQ-COMBAT-011: Keyboard shortcuts

**MAY Requirements:**
10. REQ-COMBAT-008: Ability bar
11. REQ-COMBAT-010: Floating damage numbers

Plus:
12. REQ-COMBAT-012: Combat narratives via LLM
13. REQ-COMBAT-013: Hunting narratives via LLM

---

## Acceptance Criteria

Work order defines 9 detailed acceptance criteria covering:
- Combat HUD display and activation
- Health bar rendering with color coding and injuries
- Combat unit panel with stats and equipment
- Stance controls and behavior changes
- Threat indicators and off-screen warnings
- Combat log with event filtering
- Tactical overview with force analysis
- Defense management with structures and patrols
- Combat and hunting narrative generation

---

## System Integration

### Existing Systems
- HuntingSystem - hunting events
- AgentCombatSystem - combat events
- PredatorAttackSystem - predator attacks
- DominanceChallengeSystem - dominance challenges
- InjurySystem - injury state
- GuardDutySystem - guard assignments
- VillageDefenseSystem - defense structures

### Existing Components (VERIFY FIRST!)
- CombatHUDPanel.ts
- HealthBarRenderer.ts
- CombatUnitPanel.ts
- StanceControls.ts
- ThreatIndicatorRenderer.ts
- CombatLogPanel.ts

**CRITICAL:** Six combat UI components already exist. Implementation agent MUST:
1. READ existing components first
2. VERIFY against spec requirements
3. UPDATE only if incomplete/incorrect
4. DO NOT recreate from scratch

---

## Events Integration

**Listens:**
- `hunting:attempt`, `hunting:outcome`
- `combat:start`, `combat:end`
- `predator:attack`
- `dominance:challenge`
- `injury:inflicted`
- `death`
- `threat:detected`
- `conflict:resolved`

---

## Dependencies Met

✅ Conflict system spec exists (openspec/specs/conflict-system/spec.md)
✅ Agent system spec exists (openspec/specs/agent-system/spec.md)
✅ UI notifications spec exists (openspec/specs/ui-system/notifications.md)
✅ Spec is complete with SHALL/MUST statements
✅ Acceptance criteria are testable with WHEN/THEN
✅ Integration points identified

---

## Notes for Implementation Agent

### Critical Verification Steps

1. **READ EXISTING COMPONENTS FIRST** - Six components already exist
2. **Check Event Integration** - Verify EventBus listeners
3. **LLM Narrative Generation** - REQ-COMBAT-012/013 require LLM integration
4. **Conflict-System Types** - Verify TypeScript interfaces exist
5. **State Management** - Check CombatState integration

### Potential Blockers

- Conflict system types may not exist in TypeScript
- LLM integration for combat narration
- EventBus support for all conflict events

### Integration with Context Menu

Context menu should integrate:
- Right-click hostile → "Attack" action
- Right-click friendly → "Set Stance" submenu
- Right-click structure → "Assign Guard" option

Check `packages/renderer/src/ContextMenuManager.ts`

---

## Handing Off

Work order is complete and ready for Test Agent.

**Next Step:** Test Agent should read the work order and create test scenarios.

---

**Spec Agent:** spec-agent-001
**Phase:** 16
**Feature:** conflict-ui
