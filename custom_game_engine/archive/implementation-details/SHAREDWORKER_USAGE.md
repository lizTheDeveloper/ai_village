# SharedWorker Architecture - Usage Guide

## What is SharedWorker Mode?

SharedWorker mode runs the game simulation in a background worker thread that is shared across all browser tabs/windows. This enables:

- **Multi-window synchronization** - Open multiple tabs and see the same game state
- **Independent simulation** - Game continues even if windows close/refresh
- **IndexedDB persistence** - Automatic save/load across sessions
- **No server required** - Fully local until you enable multiplayer

## How to Enable

### Option 1: Environment Variable (Recommended)

1. Copy the example env file:
   ```bash
   cd custom_game_engine/demo
   cp .env.shared-worker .env
   ```

2. The file contains:
   ```bash
   VITE_USE_SHARED_WORKER=true
   ```

3. Restart the dev server:
   ```bash
   ./start.sh kill
   ./start.sh
   ```

4. Open `http://localhost:3000` - you're now in SharedWorker mode!

### Option 2: Temporary Test

Add to your existing `.env`:
```bash
VITE_USE_SHARED_WORKER=true
```

Then restart the server.

### Option 3: Standalone Demo

Open the minimal SharedWorker demo (no environment variable needed):
```bash
http://localhost:3000/shared-worker.html
```

## How to Test

### Multi-Window Test

1. Open `http://localhost:3000` in multiple tabs
2. Watch the tick count - all tabs should show the same number
3. Press SPACE in one tab - all tabs pause
4. Press + in one tab - all tabs speed up
5. Spawn agents in one tab - they appear in all tabs

### Persistence Test

1. Play the game for a while
2. Close ALL browser tabs
3. Reopen one tab to `http://localhost:3000`
4. Game should resume exactly where you left off

### Dev Tools Test

1. Open browser console (F12)
2. Check for these messages:
   ```
   [Main] Using SharedWorker architecture
   [GameBridge] Initializing...
   [GameBridge] Connected to SharedWorker
   [UniverseWorker] Initialized and running
   ```

3. Inspect the SharedWorker:
   - Chrome: `chrome://inspect/#workers`
   - Click "inspect" next to the Universe Worker

## How It Works

```
┌─────────────────────────────────┐
│       SharedWorker              │
│  - Runs GameLoop at 20 TPS      │
│  - Owns IndexedDB               │
│  - Manages all game state       │
└─────────────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
    ┌───▼───┐       ┌───▼───┐
    │ Tab 1 │       │ Tab 2 │
    │(view) │       │(view) │
    └───────┘       └───────┘
```

**Architecture:**
- **SharedWorker** - Runs the authoritative simulation
- **GameBridge** - Syncs worker state to local "view" World
- **UniverseClient** - Handles communication with worker
- **Windows** - Pure views that render state and dispatch actions

## Switching Back to Direct Mode

1. Remove or comment out the env variable:
   ```bash
   # VITE_USE_SHARED_WORKER=true
   ```

2. Restart the server:
   ```bash
   ./start.sh kill
   ./start.sh
   ```

3. You're back to direct GameLoop mode

## Differences from Direct Mode

### In SharedWorker Mode

**✅ What works:**
- All rendering and UI
- All game systems (running in worker)
- Save/load (via IndexedDB)
- Multi-window synchronization
- Pause/resume/speed control

**⏳ What's in progress:**
- LLM integration (worker needs LLM provider setup)
- Some event handlers may need updates
- Cross-universe networking (P2P multiplayer)

**❌ What doesn't work yet:**
- Direct `gameLoop.world` mutations from console
  - Use actions instead: `universeClient.dispatch(...)`
- Some features that rely on window-specific state

## Debugging

### Check Connection Status

```javascript
// In browser console
console.log('Connected:', universeClient.isConnected());
console.log('Current tick:', universeClient.getTick());
console.log('Current state:', universeClient.getState());
```

### Dispatch Actions Manually

```javascript
// Spawn an agent
universeClient.dispatch({
  type: 'SPAWN_AGENT',
  domain: 'village',
  payload: { x: 100, y: 100 }
});
```

### Export Snapshot

```javascript
// Get snapshot for debugging
const snapshot = await universeClient.requestSnapshot();
console.log('Snapshot size:', snapshot.length);
```

### View SharedWorker Console

1. Chrome: `chrome://inspect/#workers`
2. Find "Universe Worker"
3. Click "inspect"
4. View worker console output

## Performance

SharedWorker mode has similar performance to direct mode:
- Simulation: 20 TPS (same as direct)
- State sync: ~50ms per update (serialization + transfer)
- Memory: +10-20MB for worker process (one-time cost)

## Known Issues

1. **First load may be slow** - Worker initializes all systems
2. **Hot reload requires refresh** - SharedWorker doesn't HMR
3. **Some browser extensions** - May block SharedWorker creation

## Next Steps

1. ✅ Test multi-window functionality
2. ⏳ Integrate LLM providers into worker
3. ⏳ Add P2P multiplayer (cross-universe networking)
4. ⏳ Add visitor mode (read-only access to other universes)
5. ⏳ Optimize state serialization for large worlds

## Documentation

- **Implementation**: `devlogs/SHAREDWORKER_ARCHITECTURE_2026-01-06.md`
- **Package README**: `packages/shared-worker/README.md`
- **Original Spec**: `openspec/specs/ringworld-abstraction/RENORMALIZATION_LAYER.md`

## Feedback

If you encounter issues with SharedWorker mode:
1. Check browser console for errors
2. Check SharedWorker console (chrome://inspect)
3. Try the standalone demo first: `http://localhost:3000/shared-worker.html`
4. Report issues with browser/version info
