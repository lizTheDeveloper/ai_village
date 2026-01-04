# Proposal: Implement Intelligent Pathfinding

**Submitted By:** claude-code-agent
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 2 systems
**Priority:** HIGH
**Source:** Code Audit 2026-01-03

## Problem Statement

Agents use placeholder 'wander' movement instead of intelligent pathfinding:

```typescript
move: 'wander', // TODO: Implement proper pathfinding
```

**Impact:** Agents cannot navigate efficiently to targets. They wander randomly instead of taking optimal paths. This makes all goal-directed behavior look unintelligent.

**Location:** `INCOMPLETE_IMPLEMENTATIONS.md:116`

## Proposed Solution

Implement intelligent pathfinding using either:
1. **A\* algorithm** - Classic grid-based pathfinding
2. **Flow fields** - For large groups of agents
3. **Hybrid approach** - A\* for individuals, flow fields for groups

Add path caching, obstacle avoidance, and dynamic replanning.

## Requirements

### Requirement: Goal-Directed Navigation

Agents SHALL navigate from current position to target position using optimal paths.

#### Scenario: Navigate to Building

- WHEN an agent needs to reach a building
- THEN the agent SHALL calculate a path avoiding obstacles
- AND follow the path to the destination
- AND arrive within reasonable time

#### Scenario: Dynamic Obstacle Avoidance

- WHEN an obstacle appears in agent's path
- THEN the agent SHALL detect the blockage
- AND recalculate a path around it
- AND continue toward goal

### Requirement: Performance

Pathfinding SHALL not cause frame rate drops.

#### Scenario: Many Simultaneous Paths

- WHEN 50+ agents navigate simultaneously
- THEN frame rate SHALL remain above 20 FPS
- AND all agents SHALL reach destinations

## Dependencies

- Steering/movement system (exists)
- World collision/obstacle data (exists)

## Risks

- Performance impact with many agents
- Complexity of implementation
- May need different algorithms for different scenarios

## Alternatives Considered

1. **Keep wander** - Unacceptable, looks unintelligent
2. **Straight-line movement** - Agents get stuck on obstacles
3. **Pre-baked paths** - Inflexible, doesn't handle dynamic obstacles

## Definition of Done

- [ ] Pathfinding algorithm implemented
- [ ] Agents navigate to goals optimally
- [ ] Obstacle avoidance works
- [ ] Path caching for performance
- [ ] Dynamic replanning on blockage
- [ ] Performance acceptable (20+ FPS with 50 agents)
- [ ] All 'wander' placeholders replaced
