# Proposal: Re-Enable Disabled Combat & Social Systems

**Submitted By:** claude-code-agent
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 4 systems
**Priority:** CRITICAL
**Source:** Code Audit 2026-01-03

## Problem Statement

Multiple combat and social systems are disabled with all tests skipped:

- **GuardDutySystem** - Not fully implemented
- **PredatorAttackSystem** - Stub only
- **DominanceChallengeSystem** - Not fully implemented
- **DeathHandling** - Not fully implemented

**Impact:** Combat mechanics, social dominance, guard behaviors, and death handling are all non-functional. Major gameplay systems missing.

**Location:** `INCOMPLETE_IMPLEMENTATIONS.md:56-69`

## Proposed Solution

For each system, either:
1. **Complete implementation** - Finish the stubbed functionality
2. **Remove if not needed** - If feature not in scope, remove stub

If completing:
- Implement core system logic
- Write comprehensive tests
- Re-enable system registration
- Verify integration with other systems

## Requirements

### Requirement: Complete or Remove

Each disabled system SHALL either be fully implemented or explicitly removed.

#### Scenario: System Completion

- WHEN a disabled system is completed
- THEN all tests SHALL pass
- AND the system SHALL be re-enabled
- AND functionality SHALL be verified end-to-end

#### Scenario: System Removal

- WHEN a system is determined to be out of scope
- THEN the stub code SHALL be removed
- AND any dependent code SHALL be updated
- AND documentation SHALL note removal reason

### Requirement: Combat Functionality

If combat systems are kept, they SHALL provide functional combat mechanics.

#### Scenario: Guard Duty

- WHEN an agent has guard duty behavior
- THEN they SHALL patrol assigned area
- AND respond to threats
- AND alert other guards

#### Scenario: Predator Attack

- WHEN a predator encounters prey
- THEN an attack SHALL be initiated
- AND combat SHALL resolve based on stats
- AND appropriate outcome SHALL occur

## Dependencies

None - these are standalone systems

## Risks

- Systems may be partially implemented for good reason
- Completion may require more work than estimated
- Removing systems may break dependent code

## Alternatives Considered

1. **Keep disabled indefinitely** - Technical debt accumulates
2. **Remove all combat** - Reduces gameplay depth
3. **Minimal stubs** - Defeats purpose of having systems

## Definition of Done

- [ ] GuardDutySystem: completed or removed
- [ ] PredatorAttackSystem: completed or removed
- [ ] DominanceChallengeSystem: completed or removed
- [ ] DeathHandling: completed or removed
- [ ] All related tests pass or removed
- [ ] No skipped tests remain
- [ ] Systems re-enabled if kept
- [ ] Documentation updated
