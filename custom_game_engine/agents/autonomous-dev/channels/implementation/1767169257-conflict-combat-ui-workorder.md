# WORK ORDER CREATED: conflict-combat-ui

**Agent:** spec-agent-001
**Timestamp:** 2025-12-31T00:20:00Z
**Status:** READY_FOR_TESTS

---

## Summary

Work order created for **Conflict/Combat UI** feature.

**Work Order Location:**
`custom_game_engine/agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

---

## Phase

MVP

---

## Spec

Primary: `openspec/specs/ui-system/conflict.md`

Related:
- `openspec/specs/conflict-system/spec.md`
- `openspec/specs/agent-system/spec.md`
- `openspec/specs/ui-system/notifications.md`

---

## Dependencies

All dependencies met ✅

- ConflictComponent (exists)
- InjuryComponent (exists)
- EventBus (exists)
- WindowManager (exists)

No blocking dependencies.

---

## Requirements

**MUST (Priority):**
- Combat HUD overlay (REQ-COMBAT-001)
- Health bars (REQ-COMBAT-002)
- Combat Unit Panel (REQ-COMBAT-003)
- Stance Controls (REQ-COMBAT-004)
- Threat Indicators (REQ-COMBAT-005)

**SHOULD:**
- Combat Log (REQ-COMBAT-006)
- Tactical Overview (REQ-COMBAT-007)
- Defense Management (REQ-COMBAT-009)
- Keyboard Shortcuts (REQ-COMBAT-011)

**MAY (Optional):**
- Ability Bar (REQ-COMBAT-008)
- Damage Numbers (REQ-COMBAT-010)

---

## Acceptance Criteria

10 criteria defined covering:
1. Health bar display and color coding
2. Combat HUD activation
3. Combat unit panel stats/equipment/injuries
4. Stance control functionality
5. Threat indicator rendering
6. Combat log event recording
7. Injury display integration
8. Tactical overview forces summary
9. Keyboard shortcuts (1/2/3/4, L, T)
10. Defense management structures

---

## Files to Create

**New Renderer Components:**
- `packages/renderer/src/combat/CombatHUDPanel.ts`
- `packages/renderer/src/combat/HealthBarRenderer.ts`
- `packages/renderer/src/combat/CombatUnitPanel.ts`
- `packages/renderer/src/combat/ThreatIndicatorRenderer.ts`
- `packages/renderer/src/combat/CombatLogPanel.ts`
- `packages/renderer/src/combat/TacticalOverviewPanel.ts`
- `packages/renderer/src/combat/StanceControls.ts`
- `packages/renderer/src/combat/DamageNumberRenderer.ts` (optional)
- `packages/renderer/src/combat/types.ts`

**Modified Files:**
- `packages/renderer/src/Renderer.ts`
- `packages/renderer/src/WindowManager.ts`
- `packages/renderer/src/KeyboardRegistry.ts`
- `packages/renderer/src/index.ts`

---

## Special Notes

### Critical Guidelines

1. **Component names lowercase_with_underscores**
   ```typescript
   entity.hasComponent('conflict')  // ✓
   entity.hasComponent('Conflict')  // ✗
   ```

2. **No fallback values - crash on missing data**
   ```typescript
   if (!entity.hasComponent('injury')) {
     throw new Error('...');
   }
   // NOT: entity.getComponent('injury') ?? default
   ```

3. **No debug console.log statements**

4. **Follow IWindowPanel pattern** (see AgentInfoPanel.ts)

5. **Health bars must be performant** (many entities)

6. **Stance storage approach** needs to be chosen and documented

---

## Handoff

Handing off to **Test Agent** for test implementation.

Once tests are written, Implementation Agent can proceed with implementation.

---

**Work order complete and ready for pipeline.**
