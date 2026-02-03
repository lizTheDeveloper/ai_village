# Distance Calculation Audit

**Generated**: 2026-01-13
**Scope**: packages/core/src, packages/botany/src

## Summary Statistics

- **Total Math.sqrt occurrences**: 198 (excluding tests)
- **Source files with Math.sqrt**: 109
- **Global query calls (world.query)**: 255 (excluding tests)

## Categorization Matrix

### Category 1: Global Query + Distance Filter (HIGHEST PRIORITY)

**Pattern**: Query all entities globally, then filter by distance
**Performance Impact**: O(N) where N = total entities (1000-4000)
**Fix**: Use ChunkSpatialQuery instead

#### Files:

1. **packages/core/src/behavior/behaviors/SeekWarmthBehavior.ts:109**
   ```typescript
   const buildings = world.query()
     .with(ComponentType.Building)
     .with(ComponentType.Position)
     .executeEntities();
   // Then: const distance = Math.sqrt(dx * dx + dy * dy); if (distance < range)
   ```
   - **Impact**: ALWAYS entities (buildings ~10-20)
   - **Fix**: Use ChunkSpatialQuery for building lookups
   - **Priority**: Medium (buildings are ALWAYS, so count is low)

2. **packages/core/src/behavior/behaviors/SeekCoolingBehavior.ts:205,238,303**
   ```typescript
   const buildings = world.query()...executeEntities(); // Line 205
   const plants = world.query()...executeEntities();    // Line 238
   const buildings = world.query()...executeEntities(); // Line 303
   ```
   - **Impact**: Buildings (ALWAYS ~10-20) + Plants (PROXIMITY, could be 100+)
   - **Fix**: ChunkSpatialQuery for both
   - **Priority**: High (plants can be numerous when visible)

3. **packages/core/src/behavior/behaviors/FarmBehaviors.ts:295,450,578**
   ```typescript
   const plants = world.query().with(ComponentType.Plant)...executeEntities();
   // Multiple global plant queries in farming behaviors
   ```
   - **Impact**: PROXIMITY entities (~50-100 visible plants)
   - **Fix**: ChunkSpatialQuery or SpatialMemory (agents know their farm plots)
   - **Priority**: HIGH (farming is common behavior, runs frequently)

4. **packages/core/src/behavior/behaviors/BuildBehavior.ts:265,343**
   ```typescript
   const buildings = world.query()...executeEntities();
   ```
   - **Impact**: ALWAYS entities (~10-20 buildings)
   - **Fix**: ChunkSpatialQuery
   - **Priority**: Medium (low entity count, but still wasteful)

5. **packages/core/src/behavior/behaviors/SleepBehavior.ts:127**
   ```typescript
   const beds = world.query().with(ComponentType.Building)...executeEntities();
   ```
   - **Impact**: ALWAYS entities (beds ~5-10)
   - **Fix**: SpatialMemory (agents remember bed locations)
   - **Priority**: HIGH (sleep is frequent, should use memory not query)

6. **packages/core/src/behavior/behaviors/AnimalBehaviors.ts:164,311**
   ```typescript
   const animals = world.query()...executeEntities();   // Line 164
   const buildings = world.query()...executeEntities(); // Line 311
   ```
   - **Impact**: PROXIMITY (animals) + ALWAYS (buildings)
   - **Fix**: ChunkSpatialQuery
   - **Priority**: Medium

7. **packages/core/src/systems/TradingSystem.ts:521**
   ```typescript
   const shops = world.query().with(CT.Shop).with(CT.Position).executeEntities();
   ```
   - **Impact**: ALWAYS entities (shops ~5-10)
   - **Fix**: ChunkSpatialQuery or SpatialMemory (agents remember shop locations)
   - **Priority**: Medium

8. **packages/core/src/actions/PlantActionHandler.ts:152**
   ```typescript
   const existingPlants = world.query()...executeEntities();
   ```
   - **Impact**: PROXIMITY (plants within view)
   - **Fix**: VisionProcessor already provides nearbyPlants - use that!
   - **Priority**: HIGH (duplicate work, vision already did this)

### Category 2: Vision Already Filtered (OPTIMIZATION)

**Pattern**: Iterates vision.seenResources/seenPlants/seenAgents
**Performance Impact**: O(M) where M = visible entities (10-50)
**Current State**: Already partially optimized by VisionProcessor
**Fix**: Use squared distance comparisons, avoid Math.sqrt

#### Files:

1. **packages/core/src/targeting/ResourceTargeting.ts:100**
   ```typescript
   for (const resourceId of seenResources) {
     const dist = this.distance(position, resourcePos); // Math.sqrt
     if (dist < maxDistance) { ... }
   }
   ```
   - **Impact**: ~10-50 seen resources per agent
   - **Current**: Uses vision.seenResources (good!)
   - **Fix**: Use distanceSquared for comparison: `if (dx*dx + dy*dy < maxDistance*maxDistance)`
   - **Priority**: Medium (already filtered, just needs sqrt elimination)

2. **packages/core/src/targeting/PlantTargeting.ts:329**
   - Same pattern as ResourceTargeting
   - **Fix**: Use squared distance
   - **Priority**: Medium

3. **packages/core/src/targeting/AgentTargeting.ts:375**
   - Same pattern for agent targeting
   - **Fix**: Use squared distance
   - **Priority**: Medium

4. **packages/core/src/targeting/BuildingTargeting.ts:413**
   - Same pattern for building targeting
   - **Fix**: Use squared distance
   - **Priority**: Medium

### Category 3: SpatialMemory Iteration (GOOD PATTERN)

**Pattern**: Iterates spatial memory, calculates distance to remembered locations
**Performance Impact**: O(K) where K = memory entries (10-20)
**Current State**: Already optimized!
**Fix**: Use squared distance comparisons

#### Files:

1. **packages/core/src/components/SpatialMemoryComponent.ts:114,118**
   ```typescript
   const distA = Math.sqrt((a.x - x) ** 2 + (a.y - y) ** 2);
   const distB = Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2);
   return distA - distB; // Sorting by distance
   ```
   - **Impact**: Sorting 10-20 memory entries
   - **Current**: Good pattern (memory-based)
   - **Fix**: Can compare distA² vs distB² without sqrt (order preserved)
   - **Priority**: Low (small N, but easy optimization)

### Category 4: Movement/Steering (KEEP AS-IS)

**Pattern**: Distance calculations for movement normalization, steering forces
**Performance Impact**: Low (only for moving entities)
**Fix**: None needed (sqrt required for vector normalization)

#### Files:

1. **packages/core/src/services/MovementAPI.ts:65,121,161,178,272**
   - Vector normalization requires sqrt
   - **Fix**: None (correct usage)
   - **Priority**: N/A

2. **packages/core/src/systems/SteeringSystem.ts** (multiple)
   - Steering force calculations require sqrt
   - **Fix**: None (correct usage)
   - **Priority**: N/A

3. **packages/navigation/src/systems/MovementSystem.ts**
   - Movement calculations
   - **Fix**: None (correct usage)
   - **Priority**: N/A

### Category 5: Perception (REFACTOR TO CHUNK QUERIES)

**Pattern**: VisionProcessor, HearingProcessor do global queries then distance filter
**Performance Impact**: HIGH - runs every agent every tick
**Fix**: Use ChunkSpatialQuery in VisionProcessor

#### Files:

1. **packages/core/src/perception/VisionProcessor.ts:278,342,409,525,605**
   ```typescript
   // Line 269: const resources = world.query().with(ComponentType.Resource)...executeEntities();
   // Line 278: const distance = this.distance(position, resourcePos);
   ```
   - **Impact**: CRITICAL - runs for all agents every tick
   - **Current**: Global query for resources (PASSIVE entities!)
   - **Fix**: Resources are PASSIVE - don't query them at all!
   - **Fix**: Use SpatialMemory for resource discovery
   - **Priority**: CRITICAL

2. **packages/core/src/perception/VisionProcessor.ts:334** (Plants)
   ```typescript
   const plants = world.query().with(ComponentType.Plant)...executeEntities();
   const distance = this.distance(position, plantPos);
   ```
   - **Impact**: CRITICAL - queries all plants globally
   - **Current**: PROXIMITY entities, but querying globally
   - **Fix**: Use ChunkSpatialQuery to get plants in visible chunks only
   - **Priority**: CRITICAL

3. **packages/core/src/perception/VisionProcessor.ts:401** (Agents)
   ```typescript
   const agents = world.query().with(ComponentType.Agent)...executeEntities();
   const distance = this.distance(position, otherPos);
   ```
   - **Impact**: HIGH - queries all agents globally
   - **Current**: ALWAYS entities (~20 agents)
   - **Fix**: Use ChunkSpatialQuery to get agents in visible chunks
   - **Priority**: HIGH (frequent operation, 20 agents × 20 agents = 400 checks)

4. **packages/core/src/perception/HearingProcessor.ts:181**
   ```typescript
   return Math.sqrt(dx * dx + dy * dy);
   ```
   - **Impact**: Medium (hearing range checks)
   - **Fix**: Use ChunkSpatialQuery + squared distance
   - **Priority**: Medium

### Category 6: Decision Processors (MEDIUM PRIORITY)

**Pattern**: LLM and scripted decision processors calculate distances for action evaluation
**Performance Impact**: Medium (runs every few seconds per agent)
**Fix**: Use chunk queries where global queries exist

#### Files:

1. **packages/core/src/decision/FarmingUtilityCalculator.ts:188**
   - Distance to farm plots
   - **Fix**: Use SpatialMemory (farmers know their plots)
   - **Priority**: Medium

2. **packages/core/src/decision/ScriptedDecisionProcessor.ts:857**
   - Generic distance helper
   - **Fix**: Make it use squared distance
   - **Priority**: Low (helper function)

3. **packages/core/src/decision/LLMDecisionProcessor.ts:768,790,1117**
   - Distance calculations in LLM context building
   - **Fix**: Use pre-filtered vision data (already available!)
   - **Priority**: Medium

4. **packages/core/src/decision/ExecutorLLMProcessor.ts:942**
   - Distance to buildings
   - **Fix**: Use ChunkSpatialQuery
   - **Priority**: Medium

### Category 7: Utility/Analysis (LOW PRIORITY)

**Pattern**: Metrics, debugging, rendering - not performance critical
**Performance Impact**: Low (runs infrequently or in dev mode only)
**Fix**: None needed or low priority

#### Files:

1. **packages/core/src/debug/AgentDebugLogger.ts:229**
   - Debug distance from home calculation
   - **Priority**: N/A (debug only)

2. **packages/core/src/metrics/\*\*/\*.ts**
   - Metrics analysis (spatial, network)
   - **Priority**: N/A (analysis, not gameplay)

3. **packages/renderer/src/\*.ts**
   - Rendering distance calculations
   - **Priority**: N/A (rendering, not simulation)

## Critical Findings

### 1. VisionProcessor Queries PASSIVE Entities! 🚨

**File**: `packages/core/src/perception/VisionProcessor.ts:269`

```typescript
const resources = world.query().with(ComponentType.Resource).executeEntities();
```

**Problem**: Resources are PASSIVE mode - they should NEVER be in distance loops!

**Impact**:
- 50 agents × 3,500 resources × 20 TPS = 3.5M distance checks per second
- Resources don't move, don't change (except when harvested)
- Agents should remember where resources are (SpatialMemory)

**Solution**:
- Remove resource queries from VisionProcessor
- Resources discovered passively when agent moves near them
- Store in SpatialMemory: "I saw wood at (100, 50)"
- Targeting uses memory: "Where did I see wood?" → check distance to known locations

### 2. FarmBehaviors Query Plants Globally 🚨

**Files**: `packages/core/src/behavior/behaviors/FarmBehaviors.ts` (multiple lines)

**Problem**: Queries all plants globally multiple times in farming logic

**Impact**:
- Farmers query 50-100 visible plants
- Multiple queries per tick per farmer
- Plants already filtered by VisionProcessor!

**Solution**:
- Use SpatialMemory for farm plot locations (farmers know their plots)
- Use VisionProcessor results (nearbyPlants) instead of querying again

### 3. Duplicate Work in Actions 🚨

**File**: `packages/core/src/actions/PlantActionHandler.ts:152`

```typescript
const existingPlants = world.query().with(ComponentType.Plant)...executeEntities();
```

**Problem**: VisionProcessor already provides nearbyPlants!

**Solution**: Use vision.nearbyPlants from VisionComponent instead of querying again

## Prioritized Refactoring List

### Phase 1: CRITICAL (Week 1)

1. ✅ **VisionProcessor - Remove PASSIVE resource queries**
   - File: `packages/core/src/perception/VisionProcessor.ts`
   - Remove global resource query
   - Add passive resource discovery (when agent moves near resource)
   - Store in SpatialMemory

2. ✅ **VisionProcessor - Use ChunkSpatialQuery for plants**
   - File: `packages/core/src/perception/VisionProcessor.ts`
   - Replace global plant query with chunk query
   - Filter to visible chunks (based on vision range)

3. ✅ **VisionProcessor - Use ChunkSpatialQuery for agents**
   - File: `packages/core/src/perception/VisionProcessor.ts`
   - Replace global agent query with chunk query

4. ✅ **FarmBehaviors - Use SpatialMemory/Vision**
   - File: `packages/core/src/behavior/behaviors/FarmBehaviors.ts`
   - Remove global plant queries
   - Use SpatialMemory for farm plots
   - Use VisionComponent.nearbyPlants when available

### Phase 2: HIGH (Week 2)

5. **SeekFoodBehavior - Remove duplicate queries**
   - File: `packages/core/src/behavior/behaviors/SeekFoodBehavior.ts`
   - Use vision data instead of re-querying

6. **SeekCoolingBehavior - Chunk queries**
   - File: `packages/core/src/behavior/behaviors/SeekCoolingBehavior.ts`
   - Replace global queries with chunk queries

7. **SleepBehavior - Use memory**
   - File: `packages/core/src/behavior/behaviors/SleepBehavior.ts`
   - Agents remember bed locations

8. **Targeting APIs - Squared distance**
   - Files: `packages/core/src/targeting/*.ts`
   - Replace Math.sqrt with squared comparisons

### Phase 3: MEDIUM (Week 3)

9. **Decision Processors - Use pre-filtered data**
   - Files: `packages/core/src/decision/*.ts`
   - Use vision data, avoid duplicate queries

10. **Action Handlers - Use vision data**
    - Files: `packages/core/src/actions/*ActionHandler.ts`
    - Remove duplicate queries

11. **Animal Behaviors - Chunk queries**
    - File: `packages/core/src/behavior/behaviors/AnimalBehaviors.ts`
    - Use chunk queries for proximity

### Phase 4: LOW (Week 4)

12. **SpatialMemory - Squared distance**
    - File: `packages/core/src/components/SpatialMemoryComponent.ts`
    - Optimize sorting with squared distance

13. **Misc behaviors - Chunk queries**
    - Various behavior files
    - Opportunistic optimizations

## Performance Estimates

### Current (Before Optimization)

**Per Tick (50ms budget)**:
- VisionProcessor: 50 agents × (3500 resources + 100 plants + 20 agents) = 180,000 distance checks
- Distance checks: 180,000 × Math.sqrt = ~5-10ms
- Query overhead: 50 agents × 3 queries × entity iteration = ~10-15ms
- **Total**: ~15-25ms per tick just for perception distance calculations

### After Phase 1 (Critical Fixes)

**Per Tick**:
- VisionProcessor: 50 agents × (100 plants + 20 agents) from chunks = 6,000 distance checks
- Resources: 0 (removed from perception, use SpatialMemory)
- Distance checks: 6,000 × squared comparison = ~0.5ms
- Query overhead: 50 agents × 2 chunk queries = ~1-2ms
- **Total**: ~2-3ms per tick

**Improvement**: 8-10× speedup (15-25ms → 2-3ms)

### After All Phases

**Per Tick**:
- Perception: ~2ms (chunk queries, squared distance)
- Behaviors: ~1ms (using vision data, memory)
- Actions: ~0.5ms (no duplicate queries)
- **Total**: ~3-4ms for all spatial operations

**Improvement**: 10-15× speedup overall

## Next Steps

1. ✅ Create design document (CHUNK_SPATIAL_OPTIMIZATION.md)
2. ✅ Create audit document (this file)
3. **Implement ChunkCache + ChunkSpatialQuery infrastructure**
4. **Start Phase 1 refactoring (VisionProcessor, FarmBehaviors)**
5. **Measure performance before/after**
6. **Continue with Phase 2-4**
