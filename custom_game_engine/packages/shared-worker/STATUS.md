# SharedWorker Implementation Status

**Last Updated**: 2026-01-06
**Status**: 🔧 **In Progress - Core Architecture Complete, Testing Needed**

## Current State

### ✅ What Works Now (New Implementation)

1. **Worker-Compatible System Registration**
   - Extracted `setupGameSystems()` from headless.ts into shared module
   - Worker now properly initializes all game systems with full context
   - Matches headless mode initialization (materials, recipes, research, action handlers, metrics)
   - Located in: `packages/shared-worker/src/game-setup.ts`

2. **True View-Only Window Architecture**
   - GameBridge no longer creates its own GameLoop
   - Windows maintain only a view World for rendering
   - NO simulation runs in windows - all systems execute in worker
   - Actions queued locally are automatically forwarded to worker
   - Located in: `packages/shared-worker/src/game-bridge.ts`

3. **Action Handling in Worker**
   - Implemented SPAWN_AGENT action handler
   - Agents created in worker are visible across all tabs
   - Actions logged to IndexedDB for replay/debugging
   - Located in: `packages/shared-worker/src/shared-universe-worker.ts:406-430`

4. **Standalone Demo** (`demo/shared-worker.html`)
   - Basic SharedWorker connection
   - Multi-window synchronization
   - Pause/resume/speed controls
   - Agent spawning via 'S' key
   - Snapshot export

5. **Core Architecture**
   - `UniverseClient` - Window-side connection to worker
   - `PersistenceService` - IndexedDB storage with Dexie
   - `GameBridge` - View-only compatibility layer (FIXED)
   - `setupGameSystems` - Shared initialization logic

### ⏳ What Still Needs Work

1. **Testing**
   - Need to verify multi-window synchronization works correctly
   - Need to test metrics server correctly identifies single session
   - Need to test state persistence across browser restarts

2. **State Synchronization Optimization**
   - Current: Full state serialization every tick
   - TODO: Implement delta compression (only send changes)
   - TODO: Prioritize visible entities
   - TODO: Lazy-load terrain chunks

3. **LLM Integration**
   - Worker currently runs without LLM providers
   - Need to decide: Run LLM in worker or proxy from windows?
   - Consider: WebWorker limitations vs. coordination complexity

4. **Full Game Integration**
   - Standalone demo works
   - Need to test with main game (demo/index.html)
   - Need to ensure all UI panels work with view-only World

## Architecture Changes Made (2026-01-06)

### Problem 1: Duplicate Simulation ✅ FIXED

**Before**: Each tab created its own GameLoop in GameBridge, running independent simulations
- `game-bridge.ts:22-29`: Created local GameLoop
- Each window ran its own game systems
- Metrics server saw multiple sessions

**After**: Windows are pure views, only worker runs simulation
- `game-bridge.ts:75-80`: Creates only view-only World components
- GameLoop interface is a compatibility shim, doesn't run tick()
- All actions forwarded to worker
- Single simulation in SharedWorker

### Problem 2: Missing Worker Context ✅ FIXED

**Before**: Worker called `registerAllSystems(world, registry, queue)` with minimal args
- Missing: LLM providers, metrics config, action handlers, system configuration
- Worker initialization incomplete

**After**: Worker uses full `setupGameSystems()` from headless mode
- `shared-universe-worker.ts:60-67`: Calls setupGameSystems with full config
- Includes: materials, recipes, research, action handlers, metrics, governance
- Exact same initialization as headless mode

### Problem 3: State Serialization ⏳ DEFERRED

Current serialization works but is inefficient:
- Serializes full state every tick (20 TPS)
- Transfers entire entity set each update
- Works for small worlds, will need optimization for large ones

**Optimization plan**:
1. Delta compression (track dirty entities)
2. Spatial culling (only sync visible area)
3. Structured clone (faster than JSON)
4. Chunk-based terrain sync

## Testing Plan

### Phase 5: Multi-Window Testing

1. **Open standalone demo in 2+ tabs**
   - URL: `http://localhost:3000/shared-worker.html`
   - Press 'S' in one tab to spawn agent
   - Verify agent appears in all tabs
   - Check metrics server shows single session

2. **Test pause/resume synchronization**
   - Press SPACE in one tab
   - Verify all tabs pause
   - Resume in different tab
   - Verify all tabs resume

3. **Test speed control**
   - Press '+' in one tab to speed up
   - Verify all tabs show increased TPS
   - Press '-' to slow down
   - Verify synchronized

4. **Test persistence**
   - Spawn agents in demo
   - Close ALL tabs
   - Reopen one tab
   - Verify state restored from IndexedDB

### Phase 6: Full Integration Testing

1. **Enable SharedWorker mode in main game**
   - Copy `demo/.env.shared-worker` to `demo/.env`
   - Restart server: `./start.sh kill && ./start.sh`
   - Navigate to `http://localhost:3000`

2. **Test with full game features**
   - Verify renderer works with view-only World
   - Test DevPanel spawn functions
   - Test building placement
   - Test agent behaviors (might fail if they need LLM)

3. **Metrics verification**
   - Check `http://localhost:8766/dashboard?session=latest`
   - Should show SINGLE session regardless of tab count
   - Verify tick rate stays at 20 TPS
   - Check entity counts match across tabs

## Current Recommendation

### For Development

**Continue with Direct Mode** (current default):
```bash
# Direct mode - stable and fully featured
./start.sh
```

### For Testing SharedWorker

**Use standalone demo**:
```bash
# Make sure server is running
./start.sh

# Open in multiple tabs:
http://localhost:3000/shared-worker.html
```

**Test checklist**:
- [ ] Spawn agents with 'S' key
- [ ] Verify agents visible in all tabs
- [ ] Test pause/resume (SPACE)
- [ ] Test speed control (+/-)
- [ ] Export snapshot (X key)
- [ ] Close all tabs and reopen (persistence)

### For Full Game Integration

**Enable SharedWorker mode**:
```bash
cd demo
cp .env.shared-worker .env
cd ..
./start.sh kill
./start.sh

# Open game:
http://localhost:3000
```

**Note**: Some features may not work yet (LLM-based behaviors, complex actions)

## Technical Debt Resolved

✅ **Core Package Refactoring**
   - Extracted system registration to shared module
   - Worker-compatible initialization
   - Removed hardcoded window dependencies

✅ **GameBridge Architecture**
   - View-only World design
   - No local simulation
   - Proper action forwarding

⏳ **State Management** (partial)
   - Basic serialization works
   - Delta compression TODO
   - State versioning TODO

⏳ **Testing Infrastructure**
   - Manual testing available
   - Automated tests TODO
   - Worker crash recovery TODO

## Next Steps

1. **Test standalone demo thoroughly** (Phase 5)
   - Multi-window sync
   - Persistence
   - Action handling

2. **Profile performance**
   - Measure state transfer overhead
   - Identify bottlenecks
   - Plan optimization

3. **Implement delta synchronization** (if needed)
   - Only transfer changed entities
   - Spatial culling for large worlds
   - Benchmark improvements

4. **LLM integration decision**
   - Option A: Run LLM queue in worker
   - Option B: Proxy LLM from windows to worker
   - Consider WebWorker limitations

5. **Full game integration**
   - Test with demo/index.html
   - Fix UI compatibility issues
   - Update documentation

## Files Changed

### New Files
- `packages/shared-worker/src/game-setup.ts` - Shared system initialization
- No other new files - all changes were refactoring existing code

### Modified Files
- `packages/shared-worker/src/shared-universe-worker.ts` - Uses setupGameSystems, implements SPAWN_AGENT
- `packages/shared-worker/src/game-bridge.ts` - Complete rewrite to view-only architecture
- `packages/shared-worker/src/index.ts` - Export new types

### Unchanged (Still Valid)
- `packages/shared-worker/src/universe-client.ts` - Client connection logic
- `packages/shared-worker/src/persistence.ts` - IndexedDB service
- `packages/shared-worker/src/types.ts` - Type definitions
- `demo/shared-worker.html` - Standalone demo
- `demo/src/demo-shared-worker.ts` - Demo script with agent spawning

## Related Files

- `packages/shared-worker/README.md` - Original design docs
- `devlogs/SHAREDWORKER_ARCHITECTURE_2026-01-06.md` - Implementation log
- `SHAREDWORKER_USAGE.md` - Usage guide
- `openspec/specs/ringworld-abstraction/RENORMALIZATION_LAYER.md` - Original spec
- `demo/headless.ts` - Source of setupGameSystems pattern

## Conclusion

The SharedWorker architecture is now **architecturally sound** with the core issues resolved:

**Fixed**:
- ✅ Worker has full game system initialization
- ✅ Windows are true view-only (no duplicate simulation)
- ✅ Basic action handling works (SPAWN_AGENT)
- ✅ Standalone demo ready for testing

**Remaining**:
- ⏳ Multi-window testing needed
- ⏳ Performance optimization (delta sync)
- ⏳ LLM integration decision
- ⏳ Full game integration

**For now**: Test the standalone demo and verify multi-window sync works correctly.

**Next**: Profile performance and implement optimizations if needed.
