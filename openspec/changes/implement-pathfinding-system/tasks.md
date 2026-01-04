# Tasks: Implement Intelligent Pathfinding

## Phase 1: Design & Algorithm Selection

- [ ] Research pathfinding algorithms (A*, flow fields, navmesh)
- [ ] Choose algorithm based on use cases
- [ ] Design pathfinding API
- [ ] Design path caching strategy
- [ ] Plan integration with steering system

## Phase 2: Core Pathfinding

- [ ] Implement chosen algorithm (e.g., A*)
- [ ] Add grid/tile collision detection
- [ ] Implement path smoothing
- [ ] Add path caching
- [ ] Implement path validity checks

## Phase 3: Dynamic Replanning

- [ ] Detect when path becomes blocked
- [ ] Implement path recalculation trigger
- [ ] Add fallback behaviors (wait, reroute)
- [ ] Test dynamic obstacle scenarios

## Phase 4: Integration

- [ ] Replace 'wander' with pathfinding
- [ ] Update movement behaviors to use paths
- [ ] Add pathfinding debug visualization
- [ ] Test all movement scenarios

## Phase 5: Performance Optimization

- [ ] Profile pathfinding performance
- [ ] Optimize hot paths
- [ ] Add path request batching
- [ ] Implement path caching
- [ ] Test with 100+ agents

## Validation

- [ ] Agents navigate to goals successfully
- [ ] Paths avoid obstacles
- [ ] Dynamic replanning works
- [ ] Performance >20 FPS with 50 agents
- [ ] All wander placeholders removed
- [ ] Pathfinding tests pass
