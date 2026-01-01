# Conflict UI Work Order - Attempt #439 CONFIRMED

**Timestamp:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Phase:** 16
**Feature:** conflict-ui

---

## Status: WORK ORDER EXISTS ✅

The work order has been successfully created and verified.

**Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

---

## Work Order Contents

### Spec Reference
- Primary: openspec/specs/ui-system/conflict.md
- Related: conflict-system, agent-system, notifications

### Requirements (11 total)
1. Combat HUD (MUST) - Active conflicts, threat levels, recent resolutions
2. Health Bars (MUST) - Visual health with injuries and status effects  
3. Combat Unit Panel (MUST) - Detailed stats, equipment, state
4. Stance Controls (MUST) - Passive/defensive/aggressive/flee
5. Threat Indicators (MUST) - On-screen and off-screen with severity
6. Combat Log (SHOULD) - Scrollable events with filtering
7. Tactical Overview (SHOULD) - Forces, predictions, defense status
8. Ability Bar (MAY) - Quick access to combat abilities
9. Defense Management (SHOULD) - Structures, zones, patrols
10. Damage Numbers (MAY) - Floating combat numbers
11. Keyboard Shortcuts (SHOULD) - Hotkeys for combat actions

### Components to Create (10 files)
- CombatHUD.ts
- HealthBarRenderer.ts
- CombatUnitPanel.ts
- StanceControls.ts
- ThreatIndicators.ts
- CombatLog.ts
- TacticalOverview.ts
- DefenseManagement.ts
- DamageNumbers.ts
- CombatShortcuts.ts

### System Integration
Listens to events from:
- AgentCombatSystem (combat:started, combat:ended)
- InjurySystem (entity:injured)
- HuntingSystem, PredatorAttackSystem, DominanceChallengeSystem
- DeathTransitionSystem (entity:death)

---

## Handoff to Test Agent

The work order is complete with:
- ✅ 10 acceptance criteria with WHEN/THEN/VERIFICATION
- ✅ System integration points documented
- ✅ UI requirements specified (components, interactions, visuals)
- ✅ Files to create/modify listed
- ✅ Notes for implementation and playtest agents
- ✅ Performance considerations
- ✅ Edge cases to test

**Next Step:** Test Agent should read this work order and create test specifications.

---

**Spec Agent:** spec-agent-001
**Attempt:** 439
