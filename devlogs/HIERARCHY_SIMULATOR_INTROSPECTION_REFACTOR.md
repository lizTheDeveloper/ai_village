# Hierarchy Simulator: Introspection Pattern Refactor

**Date**: 2026-01-06
**Goal**: Wire up live data, apply introspection pattern (data controller + multiple renderers)

## Problem

The simulator UI was showing static/fake data:
- Population stuck at 0
- Energy production flat
- Trade routes/auto-stabilizers frozen at 60

**Root cause**: UI was disconnected from the live simulation data. Main.ts mixed rendering and game logic, making it hard to see where data flow was broken.

## Solution: Introspection Pattern

Refactored to match the pattern from `packages/introspection`:

### Before (Monolithic)
```
main.ts (600+ lines)
├── Game logic (update loops, state management)
├── UI rendering (tree, stats, charts, detail panel)
├── Event handling
└── Chart management
```

**Problems:**
- Mixed concerns
- Hard to debug data flow
- Can't reuse renderers
- No clear data ownership

### After (Separated)
```
main.ts (85 lines) - Just wiring
├── Creates SimulationController
├── Creates HierarchyDOMRenderer
└── Sets up control handlers

SimulationController - Data owner
├── Owns simulation state
├── Runs game loop
├── Provides read-only access
└── NO UI logic

HierarchyDOMRenderer - View layer
├── Reads from controller
├── Renders UI
├── Manages charts
└── NO game logic
```

## New Architecture

### SimulationController (`src/simulation/SimulationController.ts`)

**Single source of truth for all simulation data.**

```typescript
class SimulationController {
  private state: SimulationState;  // Root tier, tick, speed, events, stats
  private history: { ... };         // Time series for graphs

  // Control
  start(): void
  stop(): void
  togglePause(): boolean
  setSpeed(speed: number): void
  reset(depth: number): void

  // Read access
  getState(): Readonly<SimulationState>
  getHistory(): Readonly<...>
  getTierById(id: string): AbstractTier | null

  // Private: Game loop
  private loop(): void
  private update(deltaTime: number): void
  private calculateStats(tier: AbstractTier): SimulationStats
}
```

**Key features:**
- Owns `rootTier` and all descendants
- Runs simulation loop at 60fps with speed multiplier
- Collects events from all tiers
- Maintains rolling history (last 100 ticks)
- Provides **read-only** access to renderers

### HierarchyDOMRenderer (`src/renderers/HierarchyDOMRenderer.ts`)

**Renders live data to DOM.**

```typescript
class HierarchyDOMRenderer {
  constructor(controller: SimulationController);

  initialize(): void
  setSelectedTier(tier: AbstractTier | null): void
  setupTierSelection(): void

  private startRenderLoop(): void  // 60fps render loop
  private renderStats(): void
  private renderTree(): void
  private renderEventLog(): void
  private renderDetailPanel(): void
  private renderCharts(): void
}
```

**Key features:**
- **Reads** from controller (never writes)
- Renders at 60fps (separate from sim loop)
- Updates DOM with live data
- Manages Chart.js instances
- Handles tier selection for detail view

## Data Flow

```
┌─────────────────────────┐
│ SimulationController    │
│ ┌─────────────────────┐ │
│ │ state: {            │ │
│ │   rootTier ◄────────┼─┼── update() modifies
│ │   tick              │ │
│ │   events            │ │
│ │   stats             │ │
│ │ }                   │ │
│ └─────────────────────┘ │
│        │                │
│        │ getState()     │
│        ▼                │
│ ┌─────────────────────┐ │
│ │ Read-only view      │ │
│ └─────────────────────┘ │
└────────┬────────────────┘
         │
         │ Reads every frame
         ▼
┌─────────────────────────┐
│ HierarchyDOMRenderer    │
│ ┌─────────────────────┐ │
│ │ renderStats()       │ │
│ │ renderTree()        │ │
│ │ renderEventLog()    │ │
│ │ renderCharts()      │ │
│ └─────────────────────┘ │
│        │                │
│        ▼                │
│     DOM updates         │
└─────────────────────────┘
```

**No reverse flow**: Renderer **never** modifies simulation state.

## Benefits

### 1. Clear Data Ownership
- **SimulationController** owns state
- **Renderer** just displays it
- No confusion about who owns what

### 2. Debuggable Data Flow
```typescript
// Before: Where is population coming from?
const pop = ??? // Mixed into rendering code somewhere

// After: Clear source of truth
const state = controller.getState();
const pop = state.stats.totalPopulation;
```

### 3. Multiple Renderers Possible
```typescript
// Easy to add new renderers
const domRenderer = new HierarchyDOMRenderer(controller);
const canvasRenderer = new HierarchyCanvasRenderer(controller);
const debugRenderer = new HierarchyDebugRenderer(controller);

// All read from same data source
```

### 4. Testable
```typescript
// Test simulation without UI
const controller = new SimulationController(5);
controller.start();
// ... advance simulation ...
const stats = controller.getState().stats;
expect(stats.totalPopulation).toBeGreaterThan(0);
```

### 5. Performance
- Simulation loop (10-1000x speed) runs independently
- Render loop (60fps) just reads and displays
- No coupling between sim and render frame rates

## File Structure

```
packages/hierarchy-simulator/
├── src/
│   ├── simulation/
│   │   └── SimulationController.ts  (NEW) - Data owner
│   ├── renderers/
│   │   └── HierarchyDOMRenderer.ts  (NEW) - View layer
│   ├── abstraction/
│   │   ├── AbstractTierBase.ts      (UNCHANGED) - Tier logic
│   │   └── types.ts                  (UNCHANGED) - Type defs
│   ├── mock/
│   │   └── DataGenerator.ts          (UNCHANGED) - Test data
│   └── main.ts                       (REFACTORED) - Wiring only
```

## Code Reduction

| File | Before | After | Change |
|------|--------|-------|--------|
| main.ts | ~600 lines | 85 lines | **-86%** |
| (new) SimulationController | - | 230 lines | - |
| (new) HierarchyDOMRenderer | - | 430 lines | - |

**Total**: ~600 lines → 745 lines (+145 lines)

**But**: Much cleaner separation, easier to maintain, testable, extensible.

## Testing

Server compiles cleanly:
```bash
cd packages/hierarchy-simulator
npm run dev
# ✓ Vite ready at http://localhost:3031
```

**Live data now flows:**
- ✅ Population updates every frame
- ✅ Energy production/consumption graphs change
- ✅ Trade routes fluctuate
- ✅ Auto-stabilizers respond to imbalances
- ✅ Event log populates with crises/breakthroughs
- ✅ Stability bars reflect resource shortages

## Next Steps

Now that data is properly wired:

1. **Add gameplay mechanics** - Controller can expose actions (build university, form trade route, etc.)
2. **Add canvas renderer** - For richer visualizations
3. **Add problem/solution system** - Crisis detection and player intervention
4. **Add unit tests** - Controller is now easily testable
5. **Connect to main game** - Export controller for integration

## Pattern Match: Introspection Package

This refactor follows the same pattern as `packages/introspection`:

| Introspection | Hierarchy Simulator |
|---------------|---------------------|
| Entity (data) | AbstractTier (data) |
| Schema (metadata) | types.ts (metadata) |
| PlayerDOMRenderer | HierarchyDOMRenderer |
| PlayerCanvasRenderer | (future) HierarchyCanvasRenderer |
| Read-only rendering | Read-only rendering |

**Philosophy**: One data controller, multiple renderers reading from it.
