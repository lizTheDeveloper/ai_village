# @ai-village/shared-worker

SharedWorker-based universe architecture for multi-window support.

Based on: `openspec/specs/ringworld-abstraction/RENORMALIZATION_LAYER.md`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SharedWorker                                │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Simulation    │  │ IndexedDB     │  │ Port          │       │
│  │ Loop (20 TPS) │──│ Persistence   │  │ Manager       │       │
│  │               │  │ (state, events)│  │ (connections) │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│         │                                      │                │
│         └──────────── state ──────────────────▶│                │
└─────────────────────────────────────────────────────────────────┘
                              │ postMessage
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Village  │   │ Deity    │   │ Cosmic   │
        │ Window   │   │ Window   │   │ Window   │
        │ (view)   │   │ (view)   │   │ (view)   │
        └──────────┘   └──────────┘   └──────────┘
```

## Why SharedWorker

- **Single thread owns IndexedDB** - no conflicts, no race conditions
- **Simulation runs independently** - even if windows open/close
- **Windows are pure views** - no computation, just rendering
- **Survives page refresh** - worker persists while any tab is open
- **No server needed** - fully local until you want multiplayer

## Usage

### In Your Window/Tab

```typescript
import { universeClient } from '@ai-village/shared-worker/client';

// Connect to the shared universe
universeClient.connect();

// Subscribe to state updates (called every tick)
universeClient.subscribe((state) => {
  console.log('Tick:', state.tick);
  console.log('Entities:', Object.keys(state.world.entities).length);

  // Update your UI
  render(state);
});

// Dispatch actions to the universe
universeClient.dispatch({
  type: 'SPAWN_AGENT',
  domain: 'village',
  payload: {
    x: 100,
    y: 100,
    name: 'Alice',
  },
});

// Pause/resume simulation
universeClient.pause();
universeClient.resume();

// Change simulation speed
universeClient.setSpeed(2.0); // 2x speed

// Request snapshot (for export/sharing)
const snapshot = await universeClient.requestSnapshot();
```

### Multiple Windows

Open multiple browser tabs/windows to the same origin. They will all connect to the same SharedWorker and see synchronized state:

```typescript
// Window 1: Village view
universeClient.connect();
universeClient.subscribeToDomains(['village']);
universeClient.subscribe((state) => {
  renderVillage(state.world);
});

// Window 2: Deity view
universeClient.connect();
universeClient.subscribeToDomains(['deity']);
universeClient.subscribe((state) => {
  renderDeityDashboard(state.world);
});

// Window 3: Cosmic view
universeClient.connect();
universeClient.subscribeToDomains(['cosmic']);
universeClient.subscribe((state) => {
  renderCosmicView(state.world);
});
```

All windows see the same simulation tick in real-time.

## API Reference

### UniverseClient

#### `connect()`

Connect to the SharedWorker. Must be called before using other methods.

#### `disconnect()`

Disconnect from the SharedWorker.

#### `subscribe(callback: StateCallback): () => void`

Subscribe to state updates. Returns an unsubscribe function.

```typescript
const unsubscribe = universeClient.subscribe((state) => {
  console.log('Tick:', state.tick);
});

// Later...
unsubscribe();
```

#### `dispatch(action: GameAction)`

Dispatch an action to the universe.

```typescript
universeClient.dispatch({
  type: 'SPAWN_AGENT',
  domain: 'village',
  payload: { x: 100, y: 100 },
});
```

#### `getState(): UniverseState | null`

Get current state synchronously (useful for initial render).

#### `getTick(): number`

Get current simulation tick.

#### `isConnected(): boolean`

Check if connected to the SharedWorker.

#### `pause()`

Pause the simulation.

#### `resume()`

Resume the simulation.

#### `setSpeed(speed: number)`

Set simulation speed multiplier (0.1x to 10x).

#### `subscribeToDomains(domains: string[])`

Subscribe to specific domains for filtered updates (optimization).

#### `requestSnapshot(): Promise<Uint8Array>`

Request a snapshot of the universe for export/sharing.

## Persistence

The SharedWorker automatically saves to IndexedDB:

- **Auto-save**: Every 100 ticks (5 seconds at 20 TPS)
- **On load**: Restores saved state from IndexedDB
- **Events**: All actions logged for debugging/replay

## Implementation Status

- ✅ SharedWorker implementation
- ✅ UniverseClient
- ✅ IndexedDB persistence with Dexie
- ✅ Multi-window support
- ✅ Pause/resume/speed control
- ⏳ Cross-universe networking (P2P multiplayer)
- ⏳ Snapshot export/import
- ⏳ Visitor mode (read-only access to other universes)

## Next Steps

1. Integrate with demo (`demo/src/main.ts`)
2. Test multi-window functionality
3. Add snapshot export/import UI
4. Implement P2P multiplayer (see `cross-universe-networking.md`)
