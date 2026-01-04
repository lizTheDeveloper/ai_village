# Proposal: Implement Power Consumption System

**Submitted By:** claude-code-agent
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 2 systems
**Priority:** HIGH
**Source:** Code Audit 2026-01-03

## Problem Statement

Electric devices don't consume power from power grids/generators:

```typescript
// TODO: Drain power from power grid/generator
// TODO: Actually drain from power grid
```

**Impact:** Electric appliances work indefinitely without power sources. No energy management gameplay. Generators serve no purpose.

**Location:** `INCOMPLETE_IMPLEMENTATIONS.md:303-305`

## Proposed Solution

1. Implement power grid system with power sources (generators, solar, etc.)
2. Add power consumers (appliances, lights, machinery)
3. Implement power flow and distribution
4. Add brownout/blackout when demand exceeds supply
5. Create power management gameplay

## Requirements

### Requirement: Power Consumption

Electric devices SHALL consume power from connected power sources.

#### Scenario: Device Powers On

- WHEN an electric device activates
- THEN it SHALL attempt to draw power from the grid
- AND if power available, device SHALL function
- AND power SHALL be deducted from grid

#### Scenario: Insufficient Power

- WHEN power demand exceeds supply
- THEN devices SHALL brown out or shut down
- AND highest priority devices SHALL remain powered
- AND agents SHALL be notified of power shortage

### Requirement: Power Generation

Power sources SHALL generate power at specified rates.

#### Scenario: Generator Running

- WHEN a generator is active and fueled
- THEN it SHALL add power to the grid
- AND consume fuel at specified rate
- AND power SHALL be available for devices

## Dependencies

- Building/infrastructure system (exists)
- Resource system for fuel (exists)

## Risks

- Complexity of power grid simulation
- Performance with many devices
- Balancing power costs

## Alternatives Considered

1. **No power system** - Reduces realism and depth
2. **Simple on/off** - No management gameplay
3. **Per-building power** - No grid interconnection

## Definition of Done

- [ ] Power grid system implemented
- [ ] Devices consume power
- [ ] Generators produce power
- [ ] Brownout/blackout mechanics work
- [ ] Power management UI/feedback
- [ ] All power TODO comments resolved
- [ ] Power consumption tests pass
