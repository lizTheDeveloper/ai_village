# WORK ORDER READY: conflict-combat-ui

**Status:** ✅ READY_FOR_TESTS
**Work Order:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`
**Phase:** Phase 4 - Player Systems
**Spec:** `openspec/specs/ui-system/conflict.md`

---

## Summary

Work order for Conflict/Combat UI has been created and is ready for the test agent.

### Requirements Breakdown

**MUST (Priority 1):**
- REQ-COMBAT-001: Combat HUD overlay
- REQ-COMBAT-002: Health bars
- REQ-COMBAT-003: Combat Unit Panel
- REQ-COMBAT-004: Stance controls
- REQ-COMBAT-005: Threat indicators

**SHOULD (Priority 2):**
- REQ-COMBAT-006: Combat log
- REQ-COMBAT-007: Tactical overview
- REQ-COMBAT-009: Defense management
- REQ-COMBAT-011: Keyboard shortcuts

**MAY (Optional):**
- REQ-COMBAT-008: Ability bar
- REQ-COMBAT-010: Damage numbers

---

## Key Integration Points

### Existing Components
- ✅ ConflictComponent (`packages/core/src/components/ConflictComponent.ts`)
- ✅ InjuryComponent (`packages/core/src/components/InjuryComponent.ts`)
- ✅ CombatStatsComponent (`packages/core/src/components/CombatStatsComponent.ts`)

### Existing Systems
- ✅ AgentCombatSystem
- ✅ EventBus with combat events
- ✅ WindowManager for panels
- ✅ InputHandler for hotkeys

### Events to Listen
- `conflict:started` - Activate HUD
- `conflict:resolved` - Log entry
- `injury:inflicted` - Update health bars
- `combat:damage` - Show damage
- `death:occurred` - Remove from UI

---

## Implementation Strategy

### Phase 1: Core UI (MUST)
1. **HealthBarRenderer** - Most visible impact
2. **CombatHUD** - Main overlay
3. **ThreatIndicators** - Threat awareness
4. **StanceControls** - Player control
5. **CombatUnitPanel** - Detailed info

### Phase 2: Enhanced UI (SHOULD)
6. **CombatLogPanel** - Event history
7. **Keyboard shortcuts** - (1-4, L, T)
8. **TacticalOverviewPanel** - Strategic view
9. **DefenseManagementPanel** - Defense coordination

### Phase 3: Polish (MAY)
10. **DamageNumbersRenderer** - Visual feedback
11. **AbilityBar** - Quick abilities

---

## Files to Create

**Renderer Package:**
- `packages/renderer/src/combat/CombatHUDPanel.ts`
- `packages/renderer/src/combat/HealthBarRenderer.ts`
- `packages/renderer/src/combat/CombatUnitPanel.ts`
- `packages/renderer/src/combat/ThreatIndicatorRenderer.ts`
- `packages/renderer/src/combat/StanceControls.ts`
- `packages/renderer/src/combat/CombatLogPanel.ts` (SHOULD)
- `packages/renderer/src/combat/TacticalOverviewPanel.ts` (SHOULD)
- `packages/renderer/src/combat/DefenseManagementPanel.ts` (SHOULD)
- `packages/renderer/src/combat/DamageNumberRenderer.ts` (MAY)

**Modifications:**
- `packages/renderer/src/Renderer.ts`
- `packages/renderer/src/WindowManager.ts`
- `packages/renderer/src/KeyboardRegistry.ts`
- `packages/renderer/src/InputHandler.ts`

---

## Critical Reminders

### Component Names
```typescript
// ✅ CORRECT
entity.hasComponent('conflict')
entity.hasComponent('injury')

// ❌ WRONG
entity.hasComponent('Conflict')
```

### No Fallbacks
```typescript
// ✅ CORRECT
if (!entity.hasComponent('injury')) {
  throw new Error('Entity missing injury component');
}

// ❌ WRONG
const injury = entity.getComponent('injury') ?? defaultInjury;
```

### No Debug Logs
```typescript
// ❌ PROHIBITED
console.log('Debug:', variable);

// ✅ ALLOWED
console.error('[CombatHUD] Critical error:', error);
```

---

## Success Criteria

1. ✅ All tests pass (`npm test`)
2. ✅ Build succeeds (`npm run build`)
3. ✅ No browser console errors
4. ✅ Health bars visible on injured entities
5. ✅ Combat HUD activates during combat
6. ✅ Stance controls functional with hotkeys (1-4)
7. ✅ Threat indicators render correctly
8. ✅ Combat log records events
9. ✅ All acceptance criteria verified by playtest agent

---

## Next Step

**Handing off to Test Agent** to write tests for acceptance criteria before implementation begins.

---

**Spec Agent:** spec-agent-001
**Created:** 2025-12-31
**Attempt:** #22 (work order successfully created)
