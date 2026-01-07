# Shared Worker Package - Multi-Window Universe Architecture

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the SharedWorker architecture to understand its multi-window design, message passing protocol, and path prediction optimization.

## Overview

The **Shared Worker Package** (`@ai-village/shared-worker`) implements a SharedWorker-based architecture that runs the game simulation in a single background worker shared across all browser tabs/windows. This enables multi-window support, persistence via IndexedDB, and bandwidth optimization through path prediction.

**What it does:**
- Runs authoritative game simulation in a SharedWorker (single source of truth)
- Provides thin client views for browser windows (rendering only, no simulation)
- Implements IndexedDB persistence owned by the worker (no race conditions)
- Optimizes bandwidth with path prediction and delta sync (95-99% reduction)
- Supports spatial culling (viewport-based entity filtering)
- Enables multi-window gameplay (same universe in multiple tabs)

**Key files:**
- `src/shared-universe-worker.ts` - SharedWorker implementation (runs simulation)
- `src/universe-client.ts` - Client API for windows (connects to worker)
- `src/game-bridge.ts` - GameLoop-compatible view interface (compatibility layer)
- `src/persistence.ts` - IndexedDB persistence service (Dexie-based)
- `src/PathPredictionSystem.ts` - Worker-side path prediction (priority 50)
- `src/DeltaSyncSystem.ts` - Worker-side delta sync (priority 1000)
- `src/PathInterpolationSystem.ts` - Client-side position interpolation
- `src/types.ts` - Type definitions for messages and state

---

## Package Structure

```
packages/shared-worker/
├── src/
│   ├── shared-universe-worker.ts     # SharedWorker main entry (simulation loop)
│   ├── universe-client.ts            # Client API for windows
│   ├── game-bridge.ts                # GameLoop compatibility layer
│   ├── game-setup.ts                 # Shared system setup logic
│   ├── persistence.ts                # IndexedDB persistence (Dexie)
│   ├── PathPredictionSystem.ts       # Path prediction (worker-side)
│   ├── DeltaSyncSystem.ts            # Delta synchronization (worker-side)
│   ├── PathInterpolationSystem.ts    # Position interpolation (client-side)
│   ├── path-prediction-types.ts      # Path prediction type definitions
│   ├── types.ts                      # Core type definitions
│   └── index.ts                      # Package exports
├── package.json
└── README.md                         # This file
```

**Dependencies:**
- `@ai-village/core` - ECS world, systems, entities
- `@ai-village/world` - World setup and configuration
- `dexie` - IndexedDB wrapper for persistence

---

## Core Concepts

### 1. SharedWorker Architecture

**CRITICAL PRINCIPLE:** The SharedWorker is the single source of truth. Windows are **PURE VIEWS**.

```
┌─────────────────────────────────────────────┐
│          SharedWorker (universe-worker)      │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │   Game Simulation (20 TPS)         │    │
│  │   - All game systems run here      │    │
│  │   - Owns authoritative state       │    │
│  └────────────────────────────────────┘    │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │   IndexedDB Persistence            │    │
│  │   - Auto-save every 100 ticks      │    │
│  │   - Snapshot creation              │    │
│  │   - Event logging                  │    │
│  └────────────────────────────────────┘    │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │   Path Prediction & Delta Sync     │    │
│  │   - Tracks entity movement         │    │
│  │   - Detects deviations             │    │
│  │   - Sends delta updates            │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
         ↓                ↓               ↓
    (MessagePort)   (MessagePort)   (MessagePort)
         ↓                ↓               ↓
┌────────────┐   ┌────────────┐   ┌────────────┐
│  Window 1  │   │  Window 2  │   │  Window 3  │
│            │   │            │   │            │
│  Renderer  │   │  Renderer  │   │  Renderer  │
│  UI        │   │  UI        │   │  UI        │
│  Input     │   │  Input     │   │  Input     │
└────────────┘   └────────────┘   └────────────┘
```

**Windows DO NOT:**
- Run game systems (except PathInterpolationSystem for smooth rendering)
- Modify authoritative state
- Execute game logic
- Run the simulation loop

**Windows DO:**
- Render entities from synced state
- Capture user input
- Send actions to worker
- Interpolate positions locally for smooth rendering

### 2. Message Protocol

Communication between worker and windows uses typed message passing:

**Window → Worker:**
```typescript
type WindowToWorkerMessage =
  | { type: 'action'; action: GameAction }           // User action
  | { type: 'subscribe'; domains: string[] }         // Filter by domain
  | { type: 'request-snapshot' }                     // Export save
  | { type: 'pause' }                                // Pause simulation
  | { type: 'resume' }                               // Resume simulation
  | { type: 'set-speed'; speed: number }             // Set speed (0.5x-10x)
  | { type: 'set-viewport'; viewport: Viewport };    // Spatial culling
```

**Worker → Window:**
```typescript
type WorkerToWindowMessage =
  | { type: 'init'; connectionId: string; state: UniverseState; tick: number }
  | { type: 'tick'; tick: number; state: UniverseState; timestamp: number }
  | { type: 'delta'; delta: DeltaUpdate }            // Incremental update
  | { type: 'snapshot'; data: Uint8Array }           // Compressed snapshot
  | { type: 'error'; error: string; details?: any }; // Error notification
```

### 3. Path Prediction & Delta Sync

**Problem:** Sending full world state every tick (20 TPS) consumes massive bandwidth.

**Solution:** Path prediction + delta sync

**How it works:**

1. **Worker tracks movement patterns** (PathPredictionSystem):
   - Linear paths (constant velocity)
   - Steering paths (moving toward target)
   - Wander paths (random walk)
   - Stationary (not moving)

2. **Worker sends predictions once**:
   ```typescript
   {
     entityId: 'agent_123',
     position: { x: 100, y: 100 },
     prediction: {
       type: 'linear',
       velocity: { x: 2, y: 0 },
       duration: 100  // Valid for 100 ticks (5 seconds)
     }
   }
   ```

3. **Windows interpolate locally** (PathInterpolationSystem):
   - Calculate position based on prediction + ticks elapsed
   - Smooth rendering without worker updates

4. **Worker sends corrections only when needed** (DeltaSyncSystem):
   - Movement deviates from prediction → send correction
   - Prediction expires → send new prediction
   - Otherwise → no message (bandwidth saved)

**Bandwidth reduction:** 95-99% fewer messages vs. full state sync.

### 4. Spatial Culling (Viewport Filtering)

Windows can set their viewport to receive only visible entities:

```typescript
// Window only renders 1280x720 area centered at (500, 300)
client.setViewport({
  x: 500,      // Center X
  y: 300,      // Center Y
  width: 1280, // Viewport width
  height: 720, // Viewport height
  margin: 50   // Extra margin for smooth scrolling
});

// Worker only sends entities within (500±640±50, 300±360±50)
```

**Benefits:**
- Massive bandwidth savings for large worlds
- Clients don't process off-screen entities
- Smooth scrolling with margin buffer

### 5. Persistence (IndexedDB)

**Single-owner persistence:** Only the SharedWorker accesses IndexedDB (no race conditions).

**Storage schema:**
```typescript
// domains table: Current world state
{
  name: 'world' | '_meta',
  data: any,
  lastUpdated: number
}

// events table: Action history
{
  id: number,
  tick: number,
  type: string,
  domain: string,
  data: any
}

// snapshots table: Exported saves
{
  id: string,
  timestamp: number,
  data: Uint8Array  // Compressed JSON
}
```

**Auto-save:**
- Every 100 ticks (5 seconds at 20 TPS)
- Writes to `domains` table
- Non-blocking (async)

**Snapshots:**
- Created on-demand via `request-snapshot` message
- Compressed with gzip (if available)
- Can be exported/shared

---

## System APIs

### UniverseWorker (Worker-Side)

**Main simulation loop:**

```typescript
class UniverseWorker {
  private gameLoop: GameLoop;
  private persistence: PersistenceService;
  private connections: Map<string, ConnectionInfo>;
  private config: WorkerConfig = {
    targetTPS: 20,
    autoSaveInterval: 100,  // Every 5 seconds
    debug: true,
    speedMultiplier: 1.0,
    enablePathPrediction: true
  };

  // Main loop (20 TPS)
  private loop(): void {
    // 1. Run simulation step
    this.simulate();
    this.tick++;

    // 2. Broadcast to connected windows
    this.broadcast(); // Or delta sync if path prediction enabled

    // 3. Auto-save periodically
    if (this.tick % this.config.autoSaveInterval === 0) {
      this.persist();
    }

    // 4. Schedule next tick
    setTimeout(() => this.loop(), 1000 / this.config.targetTPS);
  }

  // Handle new window connection
  addConnection(port: MessagePort): void;

  // Apply game action from window
  private applyAction(action: GameAction): void;

  // Serialize state for transfer
  private serializeState(viewport?: Viewport): UniverseState;
}
```

**Connection management:**
- Each window gets a unique connection ID
- Connections track viewport, subscribed domains, last activity
- Inactive connections auto-disconnect

**Viewport filtering:**
```typescript
// Only send entities within viewport
if (viewport) {
  const position = entity.getComponent('position');
  if (position && !this.isInViewport(position, viewport)) {
    continue;  // Skip entity outside viewport
  }
}
```

### UniverseClient (Window-Side)

**Client API for connecting windows:**

```typescript
class UniverseClient {
  // Connect to SharedWorker
  connect(): void;

  // Disconnect from SharedWorker
  disconnect(): void;

  // Send action to universe
  dispatch(action: Omit<GameAction, 'id' | 'timestamp'>): void;

  // Subscribe to state updates (full state)
  subscribe(callback: StateCallback): () => void;

  // Subscribe to delta updates (incremental)
  subscribeDelta(callback: DeltaCallback): () => void;

  // Get current state synchronously
  getState(): UniverseState | null;

  // Get current tick
  getTick(): number;

  // Check if connected
  isConnected(): boolean;

  // Request snapshot for export
  requestSnapshot(): Promise<Uint8Array>;

  // Pause simulation
  pause(): void;

  // Resume simulation
  resume(): void;

  // Set simulation speed (0.1x - 10x)
  setSpeed(speed: number): void;

  // Set viewport for spatial culling
  setViewport(viewport: Viewport): void;

  // Subscribe to specific domains (optimization)
  subscribeToDomains(domains: Array<'village' | 'city' | 'deity' | 'cosmic'>): void;
}
```

**Singleton instance:**
```typescript
import { universeClient } from '@ai-village/shared-worker/client';

universeClient.connect();
universeClient.subscribe((state) => {
  // Re-render UI with new state
});
```

### GameBridge (Compatibility Layer)

**Provides GameLoop-compatible interface for existing code:**

```typescript
class GameBridge {
  readonly gameLoop: ViewOnlyGameLoop;  // GameLoop-like interface

  async init(): Promise<void>;

  dispatchAction(type: string, domain: string, payload: any): void;

  pause(): void;
  resume(): void;
  setSpeed(speed: number): void;

  getState(): UniverseState | null;
  getTick(): number;
  isConnected(): boolean;

  destroy(): void;
}
```

**ViewOnlyGameLoop interface:**
```typescript
interface ViewOnlyGameLoop {
  readonly world: WorldImpl;           // View-only world (synced from worker)
  readonly actionQueue: ActionQueue;   // Forwards to worker
  readonly systemRegistry: SystemRegistry; // Empty (systems run in worker)
  readonly universeId: string;
  get tick(): number;

  pause(): void;
  resume(): void;
  setSpeed(speed: number): void;
}
```

**IMPORTANT:** `gameLoop.world` is **view-only**. Modifications won't affect the authoritative state. Use `dispatchAction()` to send changes to the worker.

### PersistenceService

**IndexedDB persistence (worker-only):**

```typescript
class PersistenceService {
  // Load initial state
  async loadState(): Promise<UniverseState | null>;

  // Save current state
  async saveState(state: UniverseState): Promise<void>;

  // Log game event
  async logEvent(action: GameAction, tick: number): Promise<void>;

  // Create snapshot for export
  async createSnapshot(state: UniverseState): Promise<string>;

  // Load snapshot by ID
  async loadSnapshot(snapshotId: string): Promise<UniverseState | null>;

  // Get recent events (for debugging/replay)
  async getRecentEvents(limit: number): Promise<UniverseDatabase['events'][]>;

  // Clear all data (for testing/reset)
  async clear(): Promise<void>;
}
```

### PathPredictionSystem (Worker-Side, Priority 50)

**Tracks movement and creates path predictions:**

```typescript
class PathPredictionSystem implements System {
  readonly priority = 50;  // After movement, before rendering

  update(world: World, entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      this.updatePrediction(entity, world);
    }
  }

  private createPrediction(entity: Entity, world: World): PathPredictionComponent | null {
    // Analyze entity components:
    // - velocity → LinearPath
    // - steering → SteeringPath
    // - wander → WanderPath
    // - no movement → StationaryPath
  }
}
```

**Path prediction types:**
```typescript
// Linear movement (constant velocity)
{ type: 'linear', velocity: {x, y}, duration: 100 }

// Steering toward target
{ type: 'steering', target: {x, y}, maxSpeed: 2.0, arrivalRadius: 5.0 }

// Wander behavior (random walk)
{ type: 'wander', currentVelocity: {x, y}, wanderRadius: 3.0, seed: 12345 }

// Stationary (not moving)
{ type: 'stationary', duration: 200 }
```

### DeltaSyncSystem (Worker-Side, Priority 1000)

**Broadcasts delta updates instead of full state:**

```typescript
class DeltaSyncSystem implements System {
  readonly priority = 1000;  // Runs last, after all game logic

  setBroadcastCallback(callback: DeltaBroadcastCallback): void;

  update(world: World, entities: Entity[], deltaTime: number): void {
    // 1. Get all entities marked as dirty
    const dirtyEntities = world.query().with('dirty_for_sync').executeEntities();

    // 2. Check for removed entities
    const removed = /* entities that were deleted */;

    // 3. Build delta update
    const delta: DeltaUpdate = {
      tick: world.tick,
      updates: dirtyEntities.map(e => this.serializeEntity(e)),
      removed
    };

    // 4. Broadcast to all windows
    this.broadcastCallback(delta);

    // 5. Clear dirty flags
    for (const entity of dirtyEntities) {
      entity.removeComponent('dirty_for_sync');
    }
  }
}
```

**Delta update structure:**
```typescript
interface DeltaUpdate {
  tick: number;
  updates: Array<{
    entityId: string;
    position: { x: number; y: number };      // Correction
    prediction: PathPrediction | null;       // New path (if changed)
    components?: Record<string, any>;        // Full data (if new entity)
  }>;
  removed?: string[];  // Deleted entity IDs
}
```

### PathInterpolationSystem (Client-Side)

**Interpolates positions locally for smooth rendering:**

```typescript
class PathInterpolationSystem implements System {
  readonly priority = 5;  // Early, before rendering

  update(world: World, entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const interpolator = entity.getComponent('path_interpolator');
      if (!interpolator) continue;

      // Calculate position based on prediction + ticks elapsed
      const ticksElapsed = world.tick - interpolator.baseTick;
      const predicted = predictPosition(
        interpolator.prediction,
        interpolator.basePosition,
        ticksElapsed
      );

      // Update entity position
      entity.addComponent({
        type: 'position',
        x: predicted.x,
        y: predicted.y
      });
    }
  }
}
```

**Position prediction helpers:**
```typescript
// Calculate predicted position
function predictPosition(
  prediction: PathPrediction,
  basePosition: { x: number; y: number },
  ticksElapsed: number
): { x: number; y: number };

// Calculate deviation between actual and predicted
function calculateDeviation(
  actual: { x: number; y: number },
  predicted: { x: number; y: number }
): number;
```

---

## Usage Examples

### Example 1: Basic Window Setup

```typescript
import { universeClient } from '@ai-village/shared-worker/client';

// Connect to SharedWorker
universeClient.connect();

// Subscribe to state updates
universeClient.subscribe((state) => {
  console.log(`Tick: ${state.tick}`);
  console.log(`Entities: ${Object.keys(state.world.entities).length}`);

  // Re-render UI
  renderWorld(state.world);
});

// Send user action
universeClient.dispatch({
  type: 'SPAWN_AGENT',
  domain: 'village',
  payload: { x: 100, y: 100, name: 'Alice' }
});
```

### Example 2: GameBridge Integration (Existing Code)

```typescript
import { gameBridge } from '@ai-village/shared-worker';

// Initialize bridge
await gameBridge.init();

// Use GameLoop-compatible interface
const world = gameBridge.gameLoop.world;  // View-only world
const tick = gameBridge.gameLoop.tick;

// Query entities (read-only)
const agents = world.query().with('agent').executeEntities();
console.log(`${agents.length} agents`);

// Dispatch actions (sends to worker)
gameBridge.dispatchAction('SPAWN_AGENT', 'village', { x: 50, y: 50 });

// Control simulation
gameBridge.pause();
gameBridge.setSpeed(2.0);  // 2x speed
gameBridge.resume();
```

### Example 3: Viewport-Based Spatial Culling

```typescript
import { universeClient } from '@ai-village/shared-worker/client';

universeClient.connect();

// Set viewport (only receive visible entities)
universeClient.setViewport({
  x: 500,      // Center X
  y: 300,      // Center Y
  width: 1280, // Viewport width
  height: 720, // Viewport height
  margin: 50   // Extra margin for smooth scrolling
});

// As camera moves, update viewport
function onCameraMove(newX: number, newY: number) {
  universeClient.setViewport({
    x: newX,
    y: newY,
    width: 1280,
    height: 720,
    margin: 50
  });
}
```

### Example 4: Multi-Window Gameplay

```typescript
// Window 1: Main game view
import { universeClient } from '@ai-village/shared-worker/client';

universeClient.connect();
universeClient.setViewport({ x: 500, y: 300, width: 1280, height: 720 });
universeClient.subscribe((state) => {
  renderMainView(state);
});

// Window 2: Minimap view
import { universeClient } from '@ai-village/shared-worker/client';

universeClient.connect();
universeClient.setViewport({ x: 0, y: 0, width: 2000, height: 2000 });
universeClient.subscribe((state) => {
  renderMinimap(state);
});

// Window 3: Agent detail panel
import { universeClient } from '@ai-village/shared-worker/client';

universeClient.connect();
universeClient.subscribeToDomains(['village']); // Only village domain
universeClient.subscribe((state) => {
  renderAgentDetails(state);
});

// All windows share same simulation!
```

### Example 5: Export/Import Snapshots

```typescript
import { universeClient } from '@ai-village/shared-worker/client';

// Export snapshot
async function exportSave() {
  const snapshotData = await universeClient.requestSnapshot();

  // Convert to blob for download
  const blob = new Blob([snapshotData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = `universe_${Date.now()}.save`;
  a.click();
}
```

---

## Architecture & Data Flow

### System Execution Order (Worker-Side)

```
1. TimeSystem (priority 10)
   ↓ Updates game time
2. WeatherSystem (priority 15)
   ↓ Emits weather events
3. SoilSystem (priority 25)
   ↓ Emits soil moisture/nutrient events
4. PlantSystem (priority 40)
   ↓ Processes plant lifecycle
5. PathPredictionSystem (priority 50)
   ↓ Creates/updates path predictions
6. Agent systems (priority 100+)
   ↓ Process agent behavior
...
1000. DeltaSyncSystem (priority 1000)
   ↓ Collects dirty entities, broadcasts delta
```

### Message Flow

```
Window
  ↓ 'action' message
UniverseWorker
  → Validates action
  → Applies to authoritative world
  → Logs to IndexedDB
  → Emits game events
  → PathPredictionSystem updates predictions
  → DeltaSyncSystem marks entities dirty

UniverseWorker (every tick)
  → DeltaSyncSystem collects dirty entities
  ↓ 'delta' message (if path prediction enabled)
  ↓ OR 'tick' message (full state fallback)
Window
  → UniverseClient.handleMessage()
  → Notifies delta listeners
  → GameBridge.handleDeltaUpdate()
  → Updates local view world
  → PathInterpolationSystem interpolates positions
  → Renderer displays updated state
```

### Connection Lifecycle

```
1. Window creates SharedWorker connection
   ↓
2. SharedWorker.onconnect fires
   ↓
3. UniverseWorker.addConnection(port)
   → Assigns connection ID
   → Sends 'init' message with full state
   ↓
4. Window receives 'init'
   → UniverseClient.handleMessage('init')
   → Stores connectionId and initial state
   → Calls all subscribers
   ↓
5. Every tick, worker sends updates
   → 'delta' message (incremental) OR
   → 'tick' message (full state)
   ↓
6. Window processes updates
   → Updates local view world
   → Interpolates positions
   → Renders
   ↓
7. Window closes or disconnects
   → Connection removed from worker
```

### Persistence Flow

```
UniverseWorker (every 100 ticks)
  → serializeState()
  → PersistenceService.saveState()
  → IndexedDB 'domains' table
  → { name: 'world', data: {...}, lastUpdated: ... }
  → { name: '_meta', data: { tick, metadata }, ... }

UniverseWorker (on init)
  → PersistenceService.loadState()
  → Read from IndexedDB 'domains' table
  → Deserialize entities, tiles, globals
  → Restore world state
  → Resume from saved tick
```

---

## Performance Considerations

**Bandwidth optimization strategies:**

1. **Path prediction:** 95-99% bandwidth reduction vs. full state sync
2. **Delta sync:** Only send changed entities (not entire world)
3. **Spatial culling:** Only send entities within viewport
4. **Domain filtering:** Subscribe to specific domains (village, city, etc.)
5. **Compression:** gzip snapshots for export (if CompressionStream available)

**Worker overhead:**

- **Auto-save:** Every 100 ticks (5 seconds) → ~10-50ms IndexedDB write
- **Serialization:** Per tick → ~1-5ms for delta sync, ~10-50ms for full state
- **Message passing:** ~0.1-1ms per message (postMessage is fast)

**Client overhead:**

- **Deserialization:** Per message → ~1-5ms for delta, ~10-50ms for full state
- **World sync:** Per delta → ~1-10ms (only changed entities)
- **Path interpolation:** Per frame (60 FPS) → ~0.1-1ms (lightweight math)

**Optimization tips:**

```typescript
// ❌ BAD: Full state sync every tick (20 TPS)
for (const conn of connections) {
  conn.port.postMessage({ type: 'tick', state: serializeFullWorld() });
}
// → ~500KB-5MB per message × 20 TPS × N windows = massive bandwidth

// ✅ GOOD: Delta sync with path prediction
if (pathPredictionEnabled) {
  deltaSyncSystem.update(); // Only sends changed entities
} else {
  broadcast(); // Fallback to full state
}
// → ~1-10KB per message × 0.5-2 TPS × N windows = 95-99% reduction
```

---

## Troubleshooting

### Worker not connecting

**Symptoms:** `universeClient.isConnected()` returns `false`, no state updates

**Check:**
1. Browser supports SharedWorker? (not supported in Safari or private browsing)
2. Same origin? (SharedWorker requires same origin as main page)
3. Worker script URL correct? (check browser console for 404s)
4. CORS headers? (worker script must be same-origin or CORS-enabled)

**Debug:**
```typescript
universeClient.connect();
setTimeout(() => {
  console.log('Connected:', universeClient.isConnected());
  console.log('State:', universeClient.getState());
}, 1000);
```

### State not updating

**Symptoms:** `subscribe()` callback never fires, tick stays at 0

**Check:**
1. Worker initialized? (check worker console logs)
2. Simulation running? (paused = false)
3. Connection active? (`universeClient.isConnected()`)
4. Message listener registered? (before state arrives)

**Debug:**
```typescript
universeClient.subscribe((state) => {
  console.log('[Subscribe] Tick:', state.tick);
  console.log('[Subscribe] Entities:', Object.keys(state.world.entities).length);
});
```

### Path prediction not working

**Symptoms:** High bandwidth usage, `type: 'tick'` messages instead of `type: 'delta'`

**Check:**
1. Path prediction enabled? (`config.enablePathPrediction = true`)
2. PathPredictionSystem registered? (check worker startup logs)
3. DeltaSyncSystem registered? (priority 1000)
4. Entities have position component?
5. Delta callback set? (`deltaSyncSystem.setBroadcastCallback()`)

**Debug:**
```typescript
// In worker
console.log('Path prediction enabled:', config.enablePathPrediction);
console.log('PathPredictionSystem:', pathPredictionSystem);
console.log('DeltaSyncSystem:', deltaSyncSystem);
```

---

## Integration with Other Systems

### Renderer Integration

**Windows render from synced view world:**

```typescript
import { gameBridge } from '@ai-village/shared-worker';

await gameBridge.init();

function render() {
  const world = gameBridge.gameLoop.world;
  const entities = world.query().with('position').with('sprite').executeEntities();

  for (const entity of entities) {
    const position = entity.getComponent('position');
    const sprite = entity.getComponent('sprite');

    // Render sprite at position (interpolated by PathInterpolationSystem)
    drawSprite(sprite.texture, position.x, position.y);
  }

  requestAnimationFrame(render);
}

render();
```

### Action System Integration

**Windows send actions to worker:**

```typescript
import { gameBridge } from '@ai-village/shared-worker';

// User clicks "Spawn Agent" button
function onSpawnAgentClick(x: number, y: number) {
  gameBridge.dispatchAction('SPAWN_AGENT', 'village', {
    x, y, name: 'New Agent'
  });
}
```

---

## Further Reading

- **ARCHITECTURE_OVERVIEW.md** - Master architecture document
- **SYSTEMS_CATALOG.md** - Complete system reference
- **COMPONENTS_REFERENCE.md** - All component types
- **PERFORMANCE.md** - Performance optimization guide
- **openspec/specs/ringworld-abstraction/RENORMALIZATION_LAYER.md** - Original SharedWorker design spec

---

## Summary for Language Models

**Before working with SharedWorker architecture:**
1. Read this README completely
2. Understand the single-source-of-truth principle (worker is authoritative)
3. Know the message protocol (window ↔ worker communication)
4. Understand path prediction & delta sync (bandwidth optimization)
5. Know when to use worker-side vs client-side systems

**Common tasks:**
- **Connect window to worker:** `universeClient.connect()` + `universeClient.subscribe()`
- **Send action from window:** `universeClient.dispatch({ type, domain, payload })`
- **Query entities (read-only):** `gameBridge.gameLoop.world.query().with(...).executeEntities()`
- **Enable viewport filtering:** `universeClient.setViewport({ x, y, width, height, margin })`
- **Export save:** `await universeClient.requestSnapshot()`
- **Control simulation:** `universeClient.pause()`, `universeClient.setSpeed(2.0)`, `universeClient.resume()`

**Critical rules:**
- **NEVER run game systems in windows** (except PathInterpolationSystem for rendering)
- **NEVER modify `gameBridge.gameLoop.world` directly** (it's view-only, changes won't persist)
- **ALWAYS use `dispatchAction()` to send changes** (worker applies authoritative changes)
- **ALWAYS handle both 'tick' and 'delta' messages** (fallback for path prediction disabled)
- **NEVER access IndexedDB from windows** (worker owns persistence, single-writer model)

**Event-driven architecture:**
- Windows listen to state updates via `subscribe()` or `subscribeDelta()`
- Windows send actions via `dispatch()` or `dispatchAction()`
- Worker applies actions, updates state, broadcasts to windows
- Windows re-render UI when state updates arrive
- Never poll for state (subscribe to push-based updates)

**Path prediction optimization:**
- Worker sends predictions once (e.g., "moving at 2px/tick east")
- Windows interpolate positions locally (smooth rendering)
- Worker sends corrections only when needed (deviation or expiration)
- Result: 95-99% bandwidth reduction vs. full state sync

**Viewport filtering optimization:**
- Windows set viewport (e.g., 1280×720 centered at 500,300)
- Worker only sends entities within viewport + margin
- Result: Massive savings for large worlds (only visible entities synced)
