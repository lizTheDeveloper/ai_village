# setInterval Usage Analysis & Migration Strategy

## Current Scheduler Landscape

### SimulationScheduler (packages/core/src/ecs/SimulationScheduler.ts)
**Purpose:** Entity-based simulation management (which entities update each tick)
- **NOT** for task scheduling
- **IS** for entity filtering (ALWAYS/PROXIMITY/PASSIVE simulation modes)
- Runs per-tick, controls which entities systems process

### GameLoop (packages/core/src/loop/GameLoop.ts)
**Purpose:** Fixed 20 TPS game loop via `requestAnimationFrame`
- No built-in task scheduling mechanism
- Could be extended with tick-based task queue

### Conclusion
**There is NO general-purpose task scheduler in the codebase.**

## setInterval Inventory & Migration Strategy

### Category 1: Game Logic (Should Use Tick-Based Scheduling)

These run inside the game and should be synchronized with game ticks, not wall-clock time:

**Client (demo/src/main.ts):**
1. **Agent roster update** (line 3106) - Every 60s
   - ✅ **MIGRATE:** Should update every N ticks (e.g., 1200 ticks = 60s @ 20 TPS)
   - Benefit: Pauses when game pauses, syncs with game time

2. **Animal roster update** (line 3124) - Every 60s
   - ✅ **MIGRATE:** Should update every N ticks
   - Benefit: Same as above

3. **Auto-save** (line 3447) - Every 60s
   - ✅ **MIGRATE:** Should save every N ticks or every M in-game days
   - Benefit: Saves at game milestones, not arbitrary time intervals

**Recommended Implementation:**
```typescript
// In GameLoop or a new TickScheduler class
class TickScheduler {
  private tasks: Map<string, {
    interval: number;    // ticks between executions
    lastTick: number;    // last execution tick
    callback: () => void;
  }> = new Map();

  registerTask(id: string, intervalTicks: number, callback: () => void) {
    this.tasks.set(id, { interval: intervalTicks, lastTick: 0, callback });
  }

  executeTasks(currentTick: number) {
    for (const [id, task] of this.tasks) {
      if (currentTick - task.lastTick >= task.interval) {
        task.callback();
        task.lastTick = currentTick;
      }
    }
  }

  cleanup() {
    this.tasks.clear();
  }
}

// Usage in GameLoop.executeTick():
this.tickScheduler.executeTasks(this._world.tick);
```

### Category 2: UI/Browser Real-Time (Must Use setInterval + Cleanup)

These are browser UI updates that need wall-clock time, not game ticks:

**Client (demo/src/main.ts):**
1. **Status display update** (line 3229) - Every 100ms
   - ❌ **KEEP setInterval** - UI needs real-time updates even when game is paused
   - ✅ **REQUIRE CLEANUP** - Already fixed with beforeunload

**Rule:** All browser setIntervals MUST be tracked and cleared on beforeunload

### Category 3: Server Infrastructure (Must Use setInterval + Cleanup)

These are Node.js server operations independent of game state:

**Server (scripts/metrics-server.ts):**
1. **Auto-save sessions** (line 6044) - Every 30s
   - ❌ **KEEP setInterval** - Server persistence, not game logic
   - ✅ **REQUIRE CLEANUP** - Already fixed with SIGINT handler

2. **Session cleanup** (line 6051) - Every 24h
   - ❌ **KEEP setInterval** - Server maintenance, not game logic
   - ✅ **REQUIRE CLEANUP** - Already fixed with SIGINT handler

**Rule:** All server setIntervals MUST be tracked and cleared in SIGINT handler

## Migration Plan

### Phase 1: Create TickScheduler (Recommended)
```typescript
// packages/core/src/loop/TickScheduler.ts
export class TickScheduler {
  // Implementation above
}
```

### Phase 2: Integrate into GameLoop
```typescript
// GameLoop.ts
private tickScheduler = new TickScheduler();

start() {
  // Register tick-based tasks
  this.tickScheduler.registerTask('autosave', 1200, () => {
    // Auto-save logic (1200 ticks = 60s @ 20 TPS)
  });
  // ...
}

private executeTick() {
  // ... existing tick logic
  this.tickScheduler.executeTasks(this._world.tick);
}

stop() {
  this.tickScheduler.cleanup();
  // ... existing cleanup
}
```

### Phase 3: Migrate Game Logic Intervals
- Convert agent/animal roster updates to tick-based
- Convert auto-save to tick-based or day-based
- Remove setInterval calls from main.ts for game logic

### Phase 4: Enforce via Linting
Create ESLint rule:
```javascript
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.name="setInterval"]',
      message: 'Use TickScheduler for game logic, or ensure cleanup for UI/server tasks'
    }
  ]
}
```

## Decision Matrix

| Task Type | Use Case | Tool | Cleanup Required |
|-----------|----------|------|------------------|
| Game logic (pauses with game) | Auto-save, roster updates | ✅ TickScheduler | ✅ Automatic (GameLoop.stop()) |
| UI updates (real-time) | Status display, animations | ❌ setInterval | ✅ Manual (beforeunload) |
| Server operations (always runs) | Metrics, cleanup | ❌ setInterval | ✅ Manual (SIGINT) |

## Current Status

### Fixed (2026-01-04)
- ✅ All 6 memory leaks patched with cleanup handlers
- ✅ Server intervals clear on SIGINT
- ✅ Client intervals clear on beforeunload

### TODO
- [ ] Implement TickScheduler class
- [ ] Migrate game logic intervals to TickScheduler
- [ ] Add ESLint rule to prevent uncleaned setInterval
- [ ] Audit remaining 87 interval calls
- [ ] Document interval usage policy in CLAUDE.md

## Conclusion

**setInterval is NOT banned** - it's necessary for:
1. Browser UI updates (real-time, independent of game state)
2. Server infrastructure (persistence, cleanup)

**But game logic SHOULD use TickScheduler:**
- Syncs with game time (pauses when game pauses)
- Automatic cleanup (when GameLoop stops)
- Testable (can advance ticks manually)
- No memory leaks (cleared in GameLoop.stop())
