# Proposal: Add Memory Filtering Methods

**Submitted By:** claude-code-agent
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 1 system
**Priority:** HIGH
**Source:** Code Audit 2026-01-03

## Problem Statement

SpatialMemoryComponent lacks filtering methods that are referenced in 3+ locations:

```typescript
// TODO: Implement getMemoriesByType method in SpatialMemoryComponent (3 locations)
```

**Impact:** Cannot filter memories by type. Code has TODO placeholders waiting for this functionality.

**Location:** `INCOMPLETE_IMPLEMENTATIONS.md:190-192`

## Proposed Solution

Add memory filtering methods to SpatialMemoryComponent:
1. `getMemoriesByType(type: string): Memory[]`
2. `getMemoriesByLocation(location: Position, radius: number): Memory[]`
3. `getRecentMemories(count: number): Memory[]`
4. `getMemoriesByImportance(threshold: number): Memory[]`

## Requirements

### Requirement: Memory Type Filtering

The component SHALL provide methods to filter memories by type.

#### Scenario: Get Memories by Type

- WHEN code requests memories of specific type
- THEN getMemoriesByType(type) SHALL return matching memories
- AND memories SHALL be filtered correctly
- AND method SHALL be performant (O(n) or better)

#### Scenario: Multiple Filter Criteria

- WHEN code needs memories matching multiple criteria
- THEN filtering methods SHALL be composable
- AND filters SHALL work efficiently together

### Requirement: Performance

Memory filtering SHALL be efficient even with large memory sets.

#### Scenario: Large Memory Set

- WHEN an agent has 1000+ memories
- THEN filtering SHALL complete in <10ms
- AND not cause frame drops

## Dependencies

- SpatialMemoryComponent (exists but incomplete)
- Memory system (exists)

## Risks

- Performance with large memory collections
- Need to maintain filtered indices

## Alternatives Considered

1. **Manual filtering** - Code duplication, error-prone
2. **External filtering utility** - Less encapsulated
3. **Complex query language** - Over-engineering

## Definition of Done

- [ ] getMemoriesByType implemented
- [ ] Other filtering methods implemented
- [ ] All 3+ TODO locations updated
- [ ] Performance acceptable
- [ ] Tests cover filtering methods
- [ ] Documentation updated
