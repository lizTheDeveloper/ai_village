# Tasks: Add Memory Filtering Methods

## Phase 1: Design Filtering API

- [ ] Design method signatures
- [ ] Plan filter composition strategy
- [ ] Design performance optimization approach
- [ ] Review existing memory data structure

## Phase 2: Implement Core Filtering

- [ ] Implement getMemoriesByType(type)
- [ ] Implement getMemoriesByLocation(location, radius)
- [ ] Implement getRecentMemories(count)
- [ ] Implement getMemoriesByImportance(threshold)
- [ ] Add internal filtering helper methods

## Phase 3: Performance Optimization

- [ ] Add memory type index for fast lookup
- [ ] Add spatial index for location filtering
- [ ] Add importance index
- [ ] Benchmark filtering performance
- [ ] Optimize if needed

## Phase 4: Update Call Sites

- [ ] Find all 3+ TODO locations
- [ ] Replace TODO with actual method calls
- [ ] Test each call site
- [ ] Remove TODO comments

## Phase 5: Testing

- [ ] Write unit tests for each filter method
- [ ] Test filter composition
- [ ] Test performance with 1000+ memories
- [ ] Test edge cases (empty, single memory, etc.)

## Validation

- [ ] All filtering methods work correctly
- [ ] Performance <10ms with 1000 memories
- [ ] All TODO locations updated
- [ ] Tests pass
- [ ] No regressions in memory system
