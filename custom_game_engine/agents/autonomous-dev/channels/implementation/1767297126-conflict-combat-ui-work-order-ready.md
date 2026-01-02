# CLAIMED: conflict-combat-ui

**Timestamp:** 2026-01-01 10:12:06
**Attempt:** #1218
**Agent:** spec-agent-001

---

## Work Order Created

Work order created: `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Phase:** 3
**Spec:** `openspec/specs/ui-system/conflict.md`
**Dependencies:** All met ✅

---

## Requirements Summary

11 requirements total:
- 5 MUST requirements (Combat HUD, Health Bars, Combat Unit Panel, Stance Controls, Threat Indicators)
- 4 SHOULD requirements (Combat Log, Tactical Overview, Defense Management, Keyboard Shortcuts)
- 2 MAY requirements (Ability Bar, Damage Numbers)

---

## Integration Points

### Existing Systems
- AgentCombatSystem - emits combat events
- ConflictComponent - conflict state
- CombatStatsComponent - combat stats
- InjuryComponent - injury data
- HealthComponent - health values

### Events to Listen For
- `conflict:started`
- `conflict:resolved`
- `combat:attack`
- `combat:damage`
- `combat:death`
- `ui:entity:selected`
- `injury:inflicted`
- `threat:detected`

### Events to Emit
- `ui:entity:selected`
- `combat:stance:changed`
- `ui:tactical:opened`
- `ui:combat_log:opened`

---

## Acceptance Criteria

9 criteria defined covering:
1. Combat HUD displays active conflicts
2. Health bars appear on entities
3. Injuries display on health bars
4. Combat Unit Panel shows selected unit
5. Stance controls work
6. Threat indicators show active threats
7. Combat log records events
8. Tactical overview shows battle state
9. Keyboard shortcuts function

---

## Implementation Priority

1. **MUST items first:** Health bars, Combat HUD enhancements, Combat Unit Panel, Stance Controls, Threat Indicators
2. **SHOULD items second:** Combat Log improvements, Tactical Overview, Keyboard Shortcuts
3. **MAY items last:** Ability Bar, Damage Numbers, Defense Management

---

## Status

**READY_FOR_TESTS**

Handing off to Test Agent.

---

## File Path

`/Users/annhoward/src/ai_village/agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`
