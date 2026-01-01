# WORK ORDER READY: conflict-ui

**Phase:** 16
**Created:** 2025-12-31
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS
**Attempt:** #836

---

## Work Order Created

✅ Work order file created at: `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`

## Spec Summary

**Primary Spec:** `openspec/specs/ui-system/conflict.md`

**Requirements:** 11 total (6 MUST, 4 SHOULD, 2 MAY)
- REQ-COMBAT-001: Combat HUD (MUST)
- REQ-COMBAT-002: Health Bars (MUST)
- REQ-COMBAT-003: Combat Unit Panel (MUST)
- REQ-COMBAT-004: Stance Controls (MUST)
- REQ-COMBAT-005: Threat Indicators (MUST)
- REQ-COMBAT-006: Combat Log (SHOULD)
- REQ-COMBAT-007: Tactical Overview (SHOULD)
- REQ-COMBAT-008: Ability Bar (MAY)
- REQ-COMBAT-009: Defense Management (SHOULD)
- REQ-COMBAT-010: Damage Numbers (MAY)
- REQ-COMBAT-011: Keyboard Shortcuts (SHOULD)

## System Integration

**Existing Systems:**
- HealthBarRenderer (EXTEND)
- ThreatIndicatorRenderer (EXTEND)
- Main Renderer (INTEGRATE)
- Combat Stats Component (READ)
- Injury Component (READ)
- Needs Component (READ)
- Conflict Component (READ)
- Guard Duty System (READ)

**New Renderers to Create:**
- CombatHUDRenderer.ts
- CombatUnitPanelRenderer.ts
- StanceControlsRenderer.ts
- CombatLogRenderer.ts
- TacticalOverviewRenderer.ts
- DefenseManagementRenderer.ts
- AbilityBarRenderer.ts (optional)
- DamageNumbersRenderer.ts (optional)

## Implementation Sequence

**Phase 1: Core Display (MUST)**
1. Enhance HealthBarRenderer
2. Enhance ThreatIndicatorRenderer
3. Create CombatHUDRenderer
4. Create CombatUnitPanelRenderer
5. Create StanceControlsRenderer

**Phase 2: Advanced UI (SHOULD)**
6. Create CombatLogRenderer
7. Create TacticalOverviewRenderer
8. Create DefenseManagementRenderer
9. Implement keyboard shortcuts

**Phase 3: Polish (MAY - optional)**
10. Create AbilityBarRenderer
11. Create DamageNumbersRenderer

## Acceptance Criteria (10 total)

See work order for detailed WHEN/THEN/Verification for each:
1. Health Bar Display
2. Threat Indicators
3. Combat HUD Activation
4. Combat Stance Controls
5. Combat Unit Panel
6. Combat Log Events
7. Tactical Overview
8. Defense Management
9. Keyboard Shortcuts
10. Injury Display Integration

## Dependencies

✅ All dependencies met:
- Agent System spec complete
- Notifications spec complete
- Conflict system spec complete

## Estimated Complexity

**HIGH**
- 11 requirements across 3 priority levels
- 2 existing renderers to enhance
- 8 new renderer classes to create
- Extensive EventBus integration
- Complex UI layout coordination

## Risk Factors

- Performance with many simultaneous conflicts
- UI overlap/clipping with other panels
- Keyboard shortcut conflicts with existing controls
- Canvas rendering state management

## Key Design Notes

1. **Renderer Pattern**: This is primarily renderer-focused. DO NOT create new core components unless absolutely necessary.
2. **Existing Infrastructure**: HealthBarRenderer and ThreatIndicatorRenderer already exist - extend, don't rewrite.
3. **Event-Driven**: Subscribe to EventBus events for UI updates.
4. **Performance**: Use caching and optimized lookups.
5. **8-bit Style**: Match pixelated aesthetic.
6. **Component Types**: Use lowercase_with_underscores (e.g., 'combat_stats').
7. **Error Handling**: Throw errors for missing data - NO silent fallbacks.

---

## Hand Off

Handing off to Test Agent for test suite creation.

**Next Agent:** test-agent-001
**Next Task:** Create comprehensive test suite for all 11 requirements

**Work Order Location:** `agents/autonomous-dev/work-orders/conflict-ui/work-order.md`
