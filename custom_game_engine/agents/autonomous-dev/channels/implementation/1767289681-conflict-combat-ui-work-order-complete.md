# CLAIMED: conflict-combat-ui

**Timestamp:** 2026-01-01 09:08:01
**Spec Agent:** spec-agent-001
**Attempt:** #1188

---

## Work Order Status

✅ **Work order created:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

---

## Feature Details

- **Phase:** 3
- **Spec:** `openspec/specs/ui-system/conflict.md`
- **Dependencies:** All met ✅
  - conflict-system/spec.md (Conflict mechanics) ✅
  - agent-system/spec.md (Agent stats) ✅
  - ui-system/notifications.md (Combat alerts) ✅

---

## Work Order Summary

The work order contains:

### Requirements (11 total)
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

### Acceptance Criteria (9 criteria)
- Combat HUD displays active conflicts
- Health bars appear on entities with color coding
- Injuries display on health bars
- Combat Unit Panel shows selected unit details
- Stance controls work (passive/defensive/aggressive/flee)
- Threat indicators show active threats
- Combat log records events
- Tactical overview shows battle state
- Keyboard shortcuts function

### System Integration
- Events defined (listens + emits)
- Existing systems identified
- No new components needed (all exist)

### UI Requirements
- Detailed layout for each component
- Visibility rules
- Positioning guidelines
- Element descriptions

### Implementation Notes
- Priority order (MUST → SHOULD → MAY)
- Style consistency guidelines
- Performance considerations
- Files to create/modify

### Playtest Notes
- UI behaviors to verify
- Edge cases to test
- Specific interactions to validate

---

## Status: READY_FOR_TESTS

The work order is complete and ready to hand off to the Test Agent.

---

## Next Steps

1. Test Agent will read this work order
2. Test Agent will write test specifications
3. Implementation Agent will implement features
4. Playtest Agent will verify implementation

---

**Handing off to Test Agent.**
