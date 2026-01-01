# Fixes Applied - 2026-01-01

## 1. Fixed Groq API max_tokens Error

**File**: `packages/llm/src/OpenAICompatProvider.ts`
**Lines**: 359, 540
**Change**: Reduced default `max_tokens` from 40960 to 32768 to comply with Groq API limits
**Impact**: Eliminated "max_tokens must be less than or equal to 32768" errors that were blocking LLM decisions

## 2. Performance Optimizations - SimulationScheduler Integration

Integrated 4 critical systems with the SimulationScheduler to reduce entity processing overhead:

### NeedsSystem
**File**: `packages/core/src/systems/NeedsSystem.ts`  
**Line**: 22
**Impact**: Only processes active entities (agents on-screen or marked ALWAYS)

### MoodSystem  
**File**: `packages/core/src/systems/MoodSystem.ts`
**Line**: 323
**Impact**: Combined with existing UPDATE_INTERVAL optimization, dramatically reduces mood calculations

### AfterlifeNeedsSystem
**File**: `packages/core/src/systems/AfterlifeNeedsSystem.ts`
**Line**: 39
**Impact**: Only processes souls that are active/visible in the underworld

### MovementSystem
**File**: `packages/core/src/systems/MovementSystem.ts`
**Line**: 94
**Impact**: Only processes moving entities that are on-screen
**Note**: May be reverted by linter - needs manual re-application if so

## Expected Performance Improvements

Based on SimulationScheduler design (see PERFORMANCE_SUMMARY.md):
- Agents: Always simulated (~20 entities)
- Plants/Animals: Only when on-screen (~100 entities instead of 861)
- Resources: Zero per-tick cost (~3,500 entities skipped)

**Estimated reduction**: 60-80% fewer entities processed per tick
**Target**: <16ms per tick (60 FPS) instead of current 150ms+

## Systems Still Needing Optimization

120+ systems identified that don't use SimulationScheduler yet. Priority candidates:
- AgentBrainSystem (very expensive - LLM calls)
- MemoryConsolidationSystem  
- SleepSystem
- All deity/divine systems (20+ systems)
- Building systems
- Combat systems

## Testing Status

- ✅ Build passes (1 unrelated warning in EventBus.ts)
- ✅ All 46 afterlife/reincarnation tests passing
- ⏳ Game runtime testing in progress (10+ minute run requested)
- ⏳ Performance metrics collection pending

## Next Steps

1. Monitor game performance with dashboard to measure improvement
2. Apply SimulationScheduler to remaining high-priority systems
3. Test afterlife/reincarnation mechanics once agents die naturally
4. Consider profiling to identify other bottlenecks
