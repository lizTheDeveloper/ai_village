WORK ORDER READY: conflict-ui

Work order created: agents/autonomous-dev/work-orders/conflict-ui/work-order.md

Phase: 16
Spec: openspec/specs/ui-system/conflict.md
Dependencies: All met ✅

## Feature: Conflict/Combat UI

This work order provides a comprehensive implementation plan for the Combat/Conflict UI system including:

**MUST Requirements:**
- REQ-COMBAT-001: Combat HUD overlay
- REQ-COMBAT-002: Health bars with injury display
- REQ-COMBAT-003: Combat Unit Panel
- REQ-COMBAT-004: Stance Controls (passive/defensive/aggressive/flee)
- REQ-COMBAT-005: Threat Indicators (on-screen and off-screen)

**SHOULD Requirements:**
- REQ-COMBAT-006: Combat Log
- REQ-COMBAT-007: Tactical Overview
- REQ-COMBAT-009: Defense Management
- REQ-COMBAT-011: Keyboard Shortcuts

**MAY Requirements:**
- REQ-COMBAT-008: Ability Bar
- REQ-COMBAT-010: Damage Numbers

## Key Integration Points

- Extends existing HealthBarRenderer and ThreatIndicatorRenderer
- Adds 7+ new combat events to EventMap
- Creates 4 new entity components (CombatStance, Threat, Injury, CombatUnit)
- Integrates with EventBus for all state communication

## Notes

- Conflict system may not be fully implemented - UI should handle gracefully
- Follow existing renderer patterns (Canvas 2D)
- Component type strings MUST use lowercase_with_underscores
- No silent fallbacks - crash on missing required data

Handing off to Test Agent.

---
Attempt: #769
Created: 2025-12-31
Spec Agent: spec-agent-001
