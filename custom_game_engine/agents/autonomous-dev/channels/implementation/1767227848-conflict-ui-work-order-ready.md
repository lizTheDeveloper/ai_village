# WORK ORDER READY: conflict-ui

**Feature:** Conflict/Combat UI
**Phase:** UI System
**Spec Agent:** spec-agent-001
**Timestamp:** 2025-12-31T18:10:48Z
**Attempt:** #531

---

## Work Order Location

✅ Work order created at:
```
custom_game_engine/agents/autonomous-dev/work-orders/conflict-ui/work-order.md
```

---

## Spec Verification

✅ **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- Clear requirements (11 REQs total: 5 MUST, 3 SHOULD, 3 MAY)
- Testable scenarios defined
- UI specifications complete

✅ **Related Specs:**
- `openspec/specs/conflict-system/spec.md` - Conflict mechanics types
- `openspec/specs/agent-system/spec.md` - Agent stats
- `openspec/specs/ui-system/notifications.md` - Combat alerts

---

## Requirements Summary

### MUST Implement (5 requirements)
1. REQ-COMBAT-001: Combat HUD (overlay showing combat info)
2. REQ-COMBAT-002: Health Bars (visual health indicators)
3. REQ-COMBAT-003: Combat Unit Panel (detailed unit view)
4. REQ-COMBAT-004: Stance Controls (combat behavior settings)
5. REQ-COMBAT-005: Threat Indicators (visual threat markers)

### SHOULD Implement (3 requirements)
6. REQ-COMBAT-006: Combat Log (scrollable event log)
7. REQ-COMBAT-007: Tactical Overview (strategic view)
11. REQ-COMBAT-011: Keyboard Shortcuts (hotkeys)

### MAY Implement (3 requirements)
8. REQ-COMBAT-008: Ability Bar
9. REQ-COMBAT-009: Defense Management
10. REQ-COMBAT-010: Damage Numbers

---

## System Integration Points

### Existing Systems
- World/ECS - Component queries for entities
- EventBus - Listen for conflict/combat events
- HealthComponent - Read health data
- CombatComponent - Read combat stats
- Renderer - Register new renderers
- WindowManager - Register panels

### Existing Files to Enhance
✅ Already exist (enhance, don't replace):
- `HealthBarRenderer.ts` - Add injury icons
- `ThreatIndicatorRenderer.ts` - Add off-screen indicators
- `CombatHUDPanel.ts`
- `CombatLogPanel.ts`
- `CombatUnitPanel.ts`

### New Files to Create
- `StanceControls.ts` - Stance button UI
- `TacticalOverviewPanel.ts` - Strategic view (SHOULD)
- `FloatingDamageNumbers.ts` - Damage numbers (MAY)

---

## Events

**Listens:**
- `conflict:started` - Activate combat HUD
- `conflict:resolved` - Update combat log
- `agent:damaged` - Update health bars
- `agent:injured` - Show injury indicators
- `agent:died` - Log death event
- `threat:detected` - Show threat indicator
- `stance:changed` - Update stance UI
- `entity:selected` - Show combat unit panel

**Emits:**
- `stance:change` - User changes unit stance
- `combat:command` - User issues combat command

---

## Dependencies Status

✅ All dependencies met:
- ✅ Conflict system mechanics (ConflictType, ConflictResolution, Injury, etc.)
- ✅ Agent system stats and components
- ✅ EventBus infrastructure
- ✅ Renderer and WindowManager framework

---

## Acceptance Criteria

8 criteria defined covering:
1. Combat HUD displays active conflicts
2. Health bars show entity health with color coding
3. Injury icons display on health bars
4. Combat Unit Panel shows details
5. Stance controls change behavior
6. Threat indicators show in-world
7. Off-screen threat indicators point to threats
8. Combat log records events

---

## Special Notes

### Critical for Implementation Agent

1. **Existing components** - Several files already exist. Review and enhance, don't replace.
2. **Performance patterns** - Maintain existing optimizations (pre-filtered entities, caching)
3. **Event-driven** - Use EventBus, don't poll World every frame
4. **No silent fallbacks** - Crash early on missing data per CLAUDE.md
5. **Import conflict types** - Use types from `@ai-village/core` directly

### Files Already Reviewed

Based on previous attempts, these files exist and have been analyzed:
- `HealthBarRenderer.ts` - Has 96% performance optimization via pre-filtering
- `ThreatIndicatorRenderer.ts` - Has 90% performance optimization via caching

---

## Next Steps

🔄 **Handing off to Test Agent**

Test Agent should:
1. Read work order at `work-orders/conflict-ui/work-order.md`
2. Review acceptance criteria (8 scenarios)
3. Create test plan
4. Hand off to Implementation Agent

---

**Status:** ✅ READY FOR TESTS
