# CLAIMED: conflict-ui

**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T13:22:31Z
**Attempt:** 435

---

## Work Order Created

Work order successfully created at:
```
agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

**Phase:** 16
**Spec:** openspec/specs/ui-system/conflict.md
**Dependencies:** All met ✅

---

## Requirements Summary

The Conflict UI provides visualization and control of combat situations:

1. Combat HUD - Active conflicts, threat levels, recent resolutions (REQ-COMBAT-001)
2. Health Bars - Entity health with injuries and status effects (REQ-COMBAT-002)
3. Combat Unit Panel - Detailed stats, equipment, current state (REQ-COMBAT-003)
4. Stance Controls - Passive/defensive/aggressive/flee (REQ-COMBAT-004)
5. Threat Indicators - On-screen and off-screen with severity (REQ-COMBAT-005)
6. Combat Log - Scrollable event history with filtering (REQ-COMBAT-006)
7. Tactical Overview - Forces, predictions, defense status (REQ-COMBAT-007)
8. Ability Bar - Quick access to combat abilities (REQ-COMBAT-008)
9. Defense Management - Structures, zones, patrols (REQ-COMBAT-009)
10. Damage Numbers - Floating combat feedback (REQ-COMBAT-010)
11. Keyboard Shortcuts - Combat action hotkeys (REQ-COMBAT-011)

---

## Integration Points

**Consumes Events From:**
- AgentCombatSystem (combat:started, combat:ended)
- InjurySystem (injury data via components)
- HuntingSystem (hunting events)
- PredatorAttackSystem (predator events)
- DominanceChallengeSystem (dominance events)
- VillageDefenseSystem (defense status)

**Emits Events:**
- combat:stance_changed
- combat:focus_requested
- defense:zone_created
- defense:guard_assigned

**New Components Needed:**
- CombatStanceComponent (stores agent combat behavior)
- ThreatTrackerComponent (tracks detected threats)
- DefenseZoneComponent (marks defense zone areas)

---

## Files to Create/Modify

**New UI Components:**
- packages/renderer/src/combat/CombatHUD.ts
- packages/renderer/src/combat/HealthBarRenderer.ts
- packages/renderer/src/combat/CombatUnitPanel.ts
- packages/renderer/src/combat/StanceControls.ts
- packages/renderer/src/combat/ThreatIndicators.ts
- packages/renderer/src/combat/CombatLogPanel.ts
- packages/renderer/src/combat/TacticalOverview.ts
- packages/renderer/src/combat/DefenseManager.ts

**Integration:**
- packages/renderer/src/index.ts (register new UI panels)

---

## Handing Off to Test Agent

The work order is complete with:
- ✅ All requirements extracted from spec
- ✅ Acceptance criteria with WHEN/THEN/Verification
- ✅ System integration points identified
- ✅ Component needs documented
- ✅ File list provided

Status: **READY_FOR_TESTS**

---

Next agent: Test Agent (test-agent-001)
