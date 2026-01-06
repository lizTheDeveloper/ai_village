# SharedWorker Implementation Status

**Last Updated**: 2026-01-06
**Status**: ⚠️ **Experimental - Not Ready for Production**

## Current State

### ✅ What Works

1. **Standalone Demo** (`demo/shared-worker.html`)
   - Basic SharedWorker connection
   - Multi-window synchronization of simple state
   - Pause/resume/speed controls
   - Snapshot export

2. **Core Architecture**
   - `UniverseClient` - Window-side connection to worker
   - `PersistenceService` - IndexedDB storage with Dexie
   - `GameBridge` - Compatibility layer (partial)

### ❌ What Doesn't Work

1. **Full Game Integration**
   - Worker doesn't properly initialize game systems
   - State serialization is incomplete
   - Each browser tab still runs its own simulation (defeating the purpose)
   - Metrics server counts each tab as separate session

2. **System Registration**
   - Worker tries to call `registerAllSystems` from core
   - But the full registration logic is in `demo/src/main.ts`
   - Worker doesn't have access to LLM providers, settings, etc.

3. **State Synchronization**
   - Serialization only handles basic entity/component data
   - Missing: terrain chunks, spatial indexes, system state
   - Missing: event bus subscriptions, action queues

## Fundamental Architecture Issues

### Problem 1: Duplicate Simulation

Current implementation creates TWO game loops:
- **SharedWorker**: Runs "authoritative" simulation
- **Each Tab**: Also runs its own simulation (via GameBridge)

This defeats the purpose! Tabs should be **views only**, not running simulations.

### Problem 2: Missing Worker Context

The worker needs:
- All game systems registered
- LLM provider access
- Settings configuration
- Terrain generator
- Chunk manager
- etc.

But all of this is currently in `main.ts`, which runs in the window context.

### Problem 3: State Serialization Complexity

The full game state is HUGE:
- 1000s of entities with complex components
- Terrain chunks with tile data
- Spatial indexes
- System-specific state
- Event subscriptions

Serializing this every tick (20 TPS) is expensive and fragile.

## Recommended Approach

### Short Term (Current)

**Use Direct Mode Only**

The current direct GameLoop mode works well for:
- Single-player local gameplay
- Development and testing
- Full feature access

Each browser tab runs independently, which is fine for now.

### Medium Term (Next Phase)

**Fix Standalone Demo First**

1. Make `shared-worker.html` demo fully functional
2. Create simple example game state
3. Test multi-window sync thoroughly
4. Document limitations clearly

### Long Term (Future)

**Proper SharedWorker Integration**

Requires major refactoring:

1. **Extract System Registration**
   - Move `registerAllSystems` to core package
   - Make it work in both window and worker contexts
   - Handle LLM providers in worker

2. **Efficient State Sync**
   - Use delta compression (only send changes)
   - Prioritize visible entities
   - Lazy-load terrain chunks
   - Use structured clone for speed

3. **True View-Only Windows**
   - Windows don't run game loop
   - Windows only render state from worker
   - All actions dispatched to worker
   - Worker is single source of truth

4. **Worker Lifecycle Management**
   - Handle worker crashes gracefully
   - Reconnection logic
   - State recovery
   - Migration between versions

## Current Recommendation

### For Development

**Disable SharedWorker mode and use Direct mode:**

```bash
# Make sure this is NOT set
# VITE_USE_SHARED_WORKER=true

# Use direct mode (default)
./start.sh
```

### For Testing Multi-Window

The standalone demo shows the concept:

```bash
# Open this in multiple tabs:
http://localhost:3000/shared-worker.html
```

This demonstrates the multi-window sync idea, even if it's not integrated with the full game.

## Technical Debt

To complete this feature properly, we need:

1. **Core Package Refactoring**
   - Extract system registration
   - Make all systems worker-compatible
   - Remove window-only dependencies

2. **State Management Redesign**
   - Implement delta serialization
   - Add state versioning
   - Handle migrations

3. **Testing Infrastructure**
   - Multi-window integration tests
   - Worker crash recovery tests
   - State corruption tests

4. **Documentation**
   - Worker debugging guide
   - Performance profiling
   - Migration guide

## Conclusion

The SharedWorker architecture is a great idea and the foundation is in place, but it needs significant work before it's production-ready.

**For now: Use Direct Mode (default)**

The current direct GameLoop mode is stable, fully-featured, and works well for single-player gameplay.

**For future: Complete the refactoring**

This is a multi-week project that requires:
- Core architecture changes
- Extensive testing
- Performance optimization
- Migration tooling

## Related Files

- `packages/shared-worker/README.md` - Original design docs
- `devlogs/SHAREDWORKER_ARCHITECTURE_2026-01-06.md` - Implementation log
- `SHAREDWORKER_USAGE.md` - Usage guide (currently incorrect)
- `openspec/specs/ringworld-abstraction/RENORMALIZATION_LAYER.md` - Original spec
