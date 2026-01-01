SPEC WORK COMPLETE: conflict-ui

Work order created: custom_game_engine/agents/autonomous-dev/work-orders/conflict-ui/work-order.md

Phase: 16 - Polish & Player
Spec: openspec/specs/ui-system/conflict.md
Dependencies: All met ✅

Status: READY_FOR_TESTS
Attempt: #444

---

## Work Order Created Successfully

The Conflict UI work order has been created at:
`custom_game_engine/agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

This work order provides comprehensive documentation for implementing the Combat/Conflict UI system.

## Requirements Summary

**MUST (Priority 1):**
1. REQ-COMBAT-001: Combat HUD - Overlay showing active conflicts
2. REQ-COMBAT-002: Health Bars - Visual health indicators with injuries
3. REQ-COMBAT-003: Combat Unit Panel - Detailed view of selected unit
4. REQ-COMBAT-004: Stance Controls - Set combat behavior (passive/defensive/aggressive/flee)
5. REQ-COMBAT-005: Threat Indicators - Visual markers for dangers

**SHOULD (Priority 2):**
6. REQ-COMBAT-006: Combat Log - Scrollable event history
7. REQ-COMBAT-007: Tactical Overview - Strategic battle view
8. REQ-COMBAT-011: Keyboard Shortcuts - Quick combat commands

**MAY (Optional, defer):**
9. REQ-COMBAT-008: Ability Bar - Quick spell/ability access
10. REQ-COMBAT-009: Defense Management - Structure/zone controls
11. REQ-COMBAT-010: Damage Numbers - Floating combat feedback

## Key Integration Points

**EventBus Events (Listen):**
- `conflict:started` - Show conflict in HUD
- `conflict:resolved` - Update HUD, log outcome
- `combat:attack` - Log event, update displays
- `combat:damage` - Update health bars, show damage
- `combat:injury` - Display injury indicators
- `combat:death` - Log death, remove from HUD

**EventBus Events (Emit):**
- `combat:stance_changed` - User changed unit stance
- `combat:ui:focus_conflict` - Request camera focus
- `combat:ui:select_unit` - Select unit for details

**Systems:**
- AgentCombatSystem (packages/core/src/systems/AgentCombatSystem.ts)
- HuntingSystem (packages/core/src/systems/HuntingSystem.ts)
- PredatorAttackSystem (packages/core/src/systems/PredatorAttackSystem.ts)
- InjurySystem (packages/core/src/systems/InjurySystem.ts)

**Components:**
- ConflictComponent (packages/core/src/components/ConflictComponent.ts) - READ ONLY
- CombatStatsComponent (packages/core/src/components/CombatStatsComponent.ts) - READ ONLY

## Existing Code to Extend

The following UI components already exist and need verification/extension:
- ✅ CombatHUDPanel.ts - Basic HUD exists
- ✅ HealthBarRenderer.ts - Basic health bars exist
- ✅ CombatLogPanel.ts - Basic log exists
- ✅ CombatUnitPanel.ts - Basic panel exists

**New components needed:**
- StanceControlsPanel.ts (REQ-COMBAT-004)
- ThreatIndicatorRenderer.ts (REQ-COMBAT-005)
- TacticalOverviewPanel.ts (REQ-COMBAT-007)
- CombatKeyboardShortcuts.ts (REQ-COMBAT-011)

## Implementation Notes

1. **Extend, don't replace:** Build on existing CombatHUDPanel and HealthBarRenderer
2. **Event-driven:** All updates via EventBus events from conflict systems
3. **Type safety:** Import types from conflict-system spec
4. **Component naming:** Use lowercase_with_underscores (e.g., 'combat_stats' not 'CombatStats')
5. **Error handling:** Crash on missing data, no silent fallbacks (per CLAUDE.md)
6. **Performance:** Implement viewport culling for health bars and threat indicators

## Testing Requirements

**Unit Tests:**
- CombatUnitPanel rendering
- StanceControls button logic
- CombatLogPanel filtering
- ThreatIndicators positioning

**Integration Tests:**
- Full combat flow: start → HUD update → log → resolution
- Stance change propagation: UI → EventBus → Component
- Health bar visibility during combat

**Manual Verification:**
- No console errors (use Playwright MCP)
- Build passes: `npm run build`
- Dashboard metrics: http://localhost:8766/dashboard

## Dependencies Status

✅ All dependencies met:
- ConflictComponent exists
- AgentCombatSystem exists
- Event system available
- WindowManager available
- KeyboardRegistry available

## Next Steps

This work order is ready for the Test Agent to:
1. Review work order completeness
2. Create test specifications
3. Hand off to Implementation Agent

---

**Spec Agent:** spec-agent-001
**Timestamp:** 2025-12-31T08:05:36Z
**Attempt:** #444
