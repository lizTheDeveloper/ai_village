# Performance Optimization Plan

## Critical Issues Found

### 1. Duplicate Processes (FIXED)
- ❌ **19 TypeScript watch processes** running simultaneously
- ❌ **Multiple vite dev servers** competing for resources
- ❌ **Multiple headless game instances** running
- ✅ **FIXED**: Killed all duplicates, restarted single instances

### 2. Memory Formation Runaway Loop
**Problem**: 573,213 memories formed in 6 hours (headless session)
- Average: ~26 memories per second
- This suggests memory formation is happening every single tick for every event
- Likely cause: MemoryFormationSystem creating memories for trivial events

**Solution needed**:
- Add memory importance threshold (don't save trivial events)
- Limit memory formation rate per agent (max N per game-hour)
- Add memory pruning (delete old low-importance memories)

### 3. Death/Starvation Loop
**Problem**: 512,403 deaths from starvation in 6 hours
- All 5 agents died repeatedly and respawned
- Only 48 berries gathered vs 108 consumed = unsustainable
- Agents not gathering enough food

**Solution needed**:
- Fix gather behavior prioritization (starving agents should gather food first)
- Balance food consumption rates
- Add starvation warning behavior (gather food when hunger < 30%)

### 4. Too Many Systems Running
**Problem**: 66 systems update every tick
- Even with SimulationScheduler, this is excessive
- Many systems may be doing unnecessary work

**Optimizations needed**:
- Audit system update frequencies (not all need every-tick updates)
- Use SimulationScheduler more aggressively
- Add system update caching where possible

## Quick Wins

### 1. Memory Formation Throttling
Add to MemoryFormationSystem:
```typescript
private static readonly MAX_MEMORIES_PER_AGENT_PER_HOUR = 10;
private static readonly MIN_IMPORTANCE_THRESHOLD = 0.3;

private shouldFormMemory(importance: number, agentId: string): boolean {
  // Check importance threshold
  if (importance < this.MIN_IMPORTANCE_THRESHOLD) {
    return false;
  }

  // Check rate limit
  const recentMemories = this.getRecentMemories(agentId, 1 /* hour */);
  if (recentMemories.length >= MAX_MEMORIES_PER_AGENT_PER_HOUR) {
    return false;
  }

  return true;
}
```

### 2. System Update Frequency Optimization
Reduce update frequency for non-critical systems:
```typescript
// In SIMULATION_CONFIGS
{
  memory_formation: { updateFrequency: 60 }, // Once per game-minute
  memory_consolidation: { updateFrequency: 3600 }, // Once per game-hour
  reflection: { updateFrequency: 7200 }, // Twice per game-day
  plant_system: { updateFrequency: 1440 }, // Once per game-hour
  soil_system: { updateFrequency: 2880 }, // Every 2 game-hours
}
```

### 3. Event Batching
Instead of processing events individually, batch them:
```typescript
private eventBatch: GameEvent[] = [];

processEvents() {
  if (this.eventBatch.length > 100) {
    // Process in batches of 100
    const batch = this.eventBatch.splice(0, 100);
    // ... process batch
  }
}
```

## Performance Targets

**Current** (based on headless session):
- Memory formation rate: ~26/sec
- Entity count: 5 agents
- Duration: 6h 17m
- Total memories: 573,213
- Total deaths: 512,403

**Target**:
- Memory formation rate: <1/sec per agent
- Max memories per agent: <1,000 total
- Deaths: 0 in normal gameplay (only from actual threats)
- Tick rate: 60 FPS stable
- Memory usage: <500MB for 20 agents

## Implementation Priority

1. ✅ Fix duplicate processes (DONE)
2. ⏳ Add memory formation throttling
3. ⏳ Fix starvation loop (gather behavior)
4. ⏳ Optimize system update frequencies
5. ⏳ Add memory pruning
6. ⏳ Profile with Chrome DevTools to find remaining bottlenecks
