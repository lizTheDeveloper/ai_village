# Performance Analysis - 500ms Tick Times

**Date**: 2026-01-17
**Issue**: Ticks taking 500-700ms instead of target 50ms (20 TPS)
**Impact**: Game running at ~2 TPS instead of 20 TPS

---

## Tick Breakdown Analysis

From console logs during movement test:

### Early Game (Ticks 1-50)
- **Range**: 75-150ms per tick
- **Systems time**: 75-150ms
- **Top systems**: agent-brain (5ms), publishing_unlock (5ms), fluid_dynamics (3ms)

### Mid Game (Ticks 100-200)
- **Range**: 150-300ms per tick
- **Systems time**: 150-300ms
- **Top systems**: midwifery (3-6ms), chunk_loading (2-5ms), background_chunk_generation (2-11ms)

### Late Game (Ticks 250-350)
- **Range**: 300-700ms per tick
- **Systems time**: 300-700ms
- **Top systems**: midwifery (11-14ms), myth_retelling (11-28ms), player_input (3-7ms)

---

## Root Cause Analysis

### ❌ **NOT** Chunk Generation
- `background_chunk_generation`: 2-11ms (acceptable)
- `chunk_loading`: 1-5ms (acceptable)
- `predictive_chunk_loading`: Not appearing in top 3 (< 3ms)

**Chunk generation is working efficiently in workers.**

### ✅ **ACTUAL** Problems

#### 1. **Too Many Systems Running** (212+ systems registered)
```
Tick 350 took 587ms | sys:587 act:0 flush:0
```
- Systems time: **587ms** (100% of tick time)
- Actions: 0ms
- Flush: 0ms

**Even if each system takes 3ms, with 212 systems = 636ms total.**

#### 2. **Soul Creation Overhead**
Top system consistently: `midwifery:6-14ms`

**But this is per-system time.** The real issue is:
- Multiple soul ceremonies running concurrently (Ivy, Meadow, North, Echo, Haven)
- Each ceremony: 3 LLM calls (Weaver, Spinner, Cutter)
- 5 souls × 3 LLM calls = 15 concurrent LLM operations
- LLM latency affects multiple systems

#### 3. **System Accumulation**
Tick times increase over time:
- Tick 1: 140ms
- Tick 100: 225ms
- Tick 200: 306ms
- Tick 300: 577ms
- Tick 350: 587ms

**More entities + more active systems = linear performance degradation**

#### 4. **Many Systems Not Throttled**
Examples from logs of systems running EVERY tick:
- `possession` (should be throttled)
- `myth_retelling` (should be throttled)
- `player_input` (needs throttling)
- `technology_unlock` (should be throttled)
- `soil` (should be throttled to every 100 ticks)
- `wild_plant_population` (should be throttled)

---

## Recommendations

### 🔴 **Critical (Immediate)**

1. **Throttle Soul Creation**
   - Limit to 1 soul ceremony at a time (not 5 concurrent)
   - Current: 5 ceremonies × 3 LLM calls = 15 concurrent
   - Recommended: 1 ceremony at a time = 3 concurrent max

2. **System Throttling Audit**
   - Review all 212+ systems for throttle intervals
   - Default throttle for non-critical systems: 20 ticks (1 second)
   - Example systems to throttle:
     - `myth_retelling`: Every 100 ticks (5 seconds)
     - `wild_plant_population`: Every 200 ticks (10 seconds)
     - `soil`: Every 100 ticks (5 seconds)
     - `technology_unlock`: Every 50 ticks (2.5 seconds)

3. **Use SimulationScheduler More Aggressively**
   - Set more systems to PROXIMITY mode (only active when entities on-screen)
   - Current: Most systems are ALWAYS mode
   - Target: 70% of systems should be PROXIMITY or PASSIVE

### 🟡 **Important (Short-term)**

4. **Batch System Updates**
   - Group related systems (e.g., all plant systems)
   - Run groups on rotating schedule

5. **LLM Request Batching**
   - Queue soul creation requests
   - Process 1 at a time with 5-second delay between

6. **System Priority Review**
   - Critical systems (< 100 priority): Run every tick
   - Important systems (100-500): Run every 5-10 ticks
   - Low priority systems (500-999): Run every 20-100 ticks

### 🟢 **Optimization (Long-term)**

7. **Entity Culling**
   - Increase SimulationScheduler filtering
   - Current: 120 entities active (from 4,260 total)
   - Could be more aggressive (only 50-100 active)

8. **Lazy System Loading**
   - Don't register systems until first use
   - Example: Don't load `spaceship_combat` until spaceships exist

9. **System Combining**
   - Merge related systems (e.g., all myth systems into one)
   - Reduces per-system overhead

---

## Quick Win: Immediate Throttling

Add to systems that appear frequently in logs:

### File: `packages/core/src/systems/*System.ts`

```typescript
// Example for MythRetellingSystem
private UPDATE_INTERVAL = 100;  // Every 5 seconds
private lastUpdate = 0;

update(world: World): void {
  if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
  this.lastUpdate = world.tick;

  // Actual logic
}
```

### Apply to:
- ✅ WildPlantPopulationSystem (every 200 ticks)
- ✅ SoilSystem (every 100 ticks)
- ✅ MythRetellingSystem (every 100 ticks)
- ✅ TechnologyUnlockSystem (every 50 ticks)
- ✅ PossessionSystem (every 20 ticks)
- ✅ PlayerInputSystem (already throttled to input events)

---

## Expected Impact

**Current**: 500-700ms per tick (~2 TPS)

**After throttling 50% of systems**:
- 50% of 212 systems = 106 systems per tick
- 106 × 3ms = 318ms per tick (~3 TPS)

**After throttling 70% of systems**:
- 30% of 212 systems = 64 systems per tick
- 64 × 3ms = 192ms per tick (~5 TPS)

**After throttling 90% of systems**:
- 10% of 212 systems = 21 systems per tick
- 21 × 3ms = 63ms per tick (~15 TPS)

**Target**: 20 TPS requires < 50ms per tick = ~16 systems max running per tick

---

## Chunk Generation Verdict

✅ **Chunk generation is NOT the bottleneck.**

Evidence:
- `background_chunk_generation`: 2-11ms (acceptable)
- Worker pool functioning correctly
- No main thread blocking observed
- Chunk generation times are consistent and low

**The 500ms tick time is caused by too many systems running every tick, NOT by chunk generation.**
