# Work Order: Conflict UI

**Phase:** Phase 7 - Conflict & Social Complexity
**Created:** 2026-01-01
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Spec Reference

- **Primary Spec:** `openspec/specs/ui-system/conflict.md`
- **Related Specs:** `openspec/specs/conflict-system/spec.md`
- **Dependencies:** `openspec/specs/ui-system/notifications.md`, `openspec/specs/agent-system/spec.md`

---

## Requirements Summary

Extracted from `openspec/specs/ui-system/conflict.md`:

1. The system SHALL implement a Combat HUD overlay showing active conflicts and threats (REQ-COMBAT-001)
2. The system SHALL render health bars above entities based on health status and combat state (REQ-COMBAT-002)
3. The system SHALL provide a Combat Unit Panel with detailed entity stats (REQ-COMBAT-003)
4. The system SHALL implement Stance Controls for combat behavior (REQ-COMBAT-004)
5. The system SHALL display Threat Indicators for dangers in the world (REQ-COMBAT-005)
6. The system SHOULD provide a Combat Log for scrollable event history (REQ-COMBAT-006)
7. The system SHOULD implement a Tactical Overview for strategic combat view (REQ-COMBAT-007)
8. The system MAY implement an Ability Bar for quick access to combat abilities (REQ-COMBAT-008)
9. The system SHOULD provide Defense Management for structures and zones (REQ-COMBAT-009)
10. The system MAY implement Damage Numbers as floating combat feedback (REQ-COMBAT-010)
11. The system SHOULD support Keyboard Shortcuts for combat actions (REQ-COMBAT-011)

---

## Acceptance Criteria

### Criterion 1: Combat HUD Display
- **WHEN:** A conflict starts (hunting, combat, predator attack, dominance challenge)
- **THEN:** The Combat HUD SHALL display the active conflict with type, participants, and threat level
- **Verification:** Listen for `conflict:started` event and verify CombatHUDPanel updates

### Criterion 2: Health Bar Rendering
- **WHEN:** An entity's health drops below 100% OR entity enters combat
- **THEN:** A health bar SHALL render above the entity with color-coded health status
- **Verification:** Verify HealthBarRenderer draws bars at correct positions with correct colors

### Criterion 3: Stance Controls - Keyboard Shortcuts
- **WHEN:** User presses stance hotkeys (1=passive, 2=defensive, 3=aggressive, 4=flee)
- **THEN:** Selected units SHALL change stance immediately
- **Verification:** KeyboardRegistry binds hotkeys, stance component updates on key press

### Criterion 4: Event Integration - Missing Required Fields
- **WHEN:** Event is received missing required field (e.g., conflict:started without conflictId)
- **THEN:** Component SHALL throw error immediately (no silent fallback)
- **Verification:** Test with malformed events, verify error thrown

---

## System Integration

### Existing UI Components (Partially Implemented)
- **CombatHUDPanel.ts** - EXISTS
- **HealthBarRenderer.ts** - EXISTS
- **CombatLogPanel.ts** - EXISTS
- **CombatUnitPanel.ts** - EXISTS
- **StanceControls.ts** - EXISTS
- **ThreatIndicatorRenderer.ts** - EXISTS

All components exist. Work order focuses on verification and testing.

---

## Files Likely Modified

- `packages/renderer/src/CombatHUDPanel.ts` - Verify implementation
- `packages/renderer/src/HealthBarRenderer.ts` - Verify implementation
- `packages/renderer/src/CombatLogPanel.ts` - Verify implementation
- `packages/renderer/src/CombatUnitPanel.ts` - Verify implementation
- `packages/renderer/src/StanceControls.ts` - Verify implementation
- `packages/renderer/src/ThreatIndicatorRenderer.ts` - Verify implementation

---

## Implementation Checklist

- [ ] Verify CombatHUDPanel subscribes to conflict events
- [ ] Verify HealthBarRenderer renders correctly
- [ ] Verify error handling (no silent fallbacks)
- [ ] Write tests for all components

---

**End of Work Order**
