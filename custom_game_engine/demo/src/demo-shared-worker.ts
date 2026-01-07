/**
 * Minimal SharedWorker Demo
 *
 * This demonstrates the SharedWorker architecture in action.
 * Open multiple browser tabs to see synchronized simulation.
 */

import { universeClient } from '../../packages/shared-worker/src/universe-client.js';
import type { UniverseState } from '../../packages/shared-worker/src/types.js';

// Get canvas
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas not found');
}

const ctx = canvas.getContext('2d')!;
canvas.width = 800;
canvas.height = 600;

// UI state
let currentState: UniverseState | null = null;
let lastTick = 0;
let ticksPerSecond = 0;
let lastSecond = Date.now();
let tickCount = 0;

// Connect to SharedWorker
console.log('[Demo] Connecting to Universe SharedWorker...');
universeClient.connect();

// Set viewport for spatial culling
// Demo uses a fixed 800x600 viewport centered at (400, 300)
universeClient.setViewport({
  x: 400,
  y: 300,
  width: 800,
  height: 600,
  margin: 100,  // Extra margin for smooth scrolling
});

// Subscribe to state updates
const unsubscribe = universeClient.subscribe((state: UniverseState) => {
  currentState = state;

  // Calculate TPS
  tickCount++;
  const now = Date.now();
  if (now - lastSecond >= 1000) {
    ticksPerSecond = tickCount;
    tickCount = 0;
    lastSecond = now;
  }

  lastTick = state.tick;
});

// Render loop
function render() {
  // Clear canvas
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw header
  ctx.fillStyle = '#eee';
  ctx.font = '24px monospace';
  ctx.fillText('SharedWorker Universe Demo', 20, 40);

  // Draw connection status
  ctx.font = '16px monospace';
  const connected = universeClient.isConnected();
  ctx.fillStyle = connected ? '#00ff00' : '#ff0000';
  ctx.fillText(`Status: ${connected ? 'Connected' : 'Disconnected'}`, 20, 80);

  // Draw tick info
  ctx.fillStyle = '#eee';
  ctx.fillText(`Tick: ${lastTick}`, 20, 110);
  ctx.fillText(`TPS: ${ticksPerSecond}`, 20, 140);

  // Draw state info
  if (currentState) {
    const entityCount = Object.keys(currentState.world.entities).length;
    const tileCount = currentState.world.tiles.length;

    ctx.fillText(`Entities: ${entityCount}`, 20, 170);
    ctx.fillText(`Tiles: ${tileCount}`, 20, 200);

    // Draw some entities
    ctx.fillStyle = '#00ff00';
    let y = 240;
    let count = 0;
    for (const [entityId, components] of Object.entries(currentState.world.entities)) {
      if (count >= 10) break; // Show max 10

      const identity = components['identity'] as any;
      const position = components['position'] as any;

      if (identity?.name) {
        ctx.fillText(
          `${identity.name} @ (${position?.x?.toFixed(1) || '?'}, ${position?.y?.toFixed(1) || '?'})`,
          40,
          y
        );
        y += 25;
        count++;
      }
    }
  }

  // Draw instructions
  ctx.fillStyle = '#888';
  ctx.font = '14px monospace';
  ctx.fillText('Instructions:', 20, canvas.height - 140);
  ctx.fillText('- Open multiple tabs to see synchronized simulation', 40, canvas.height - 115);
  ctx.fillText('- Press SPACE to pause/resume', 40, canvas.height - 90);
  ctx.fillText('- Press + to speed up (max 10x)', 40, canvas.height - 65);
  ctx.fillText('- Press - to slow down (min 0.1x)', 40, canvas.height - 40);
  ctx.fillText('- Press S to spawn agent', 40, canvas.height - 15);

  requestAnimationFrame(render);
}

// Start render loop
render();

// Keyboard controls
let isPaused = false;
let speed = 1.0;

window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case ' ':
      isPaused = !isPaused;
      if (isPaused) {
        universeClient.pause();
        console.log('[Demo] Paused');
      } else {
        universeClient.resume();
        console.log('[Demo] Resumed');
      }
      break;

    case '+':
    case '=':
      speed = Math.min(10, speed * 2);
      universeClient.setSpeed(speed);
      console.log(`[Demo] Speed: ${speed}x`);
      break;

    case '-':
    case '_':
      speed = Math.max(0.1, speed / 2);
      universeClient.setSpeed(speed);
      console.log(`[Demo] Speed: ${speed}x`);
      break;

    case 's':
    case 'S':
      // Dispatch spawn action
      universeClient.dispatch({
        type: 'SPAWN_AGENT',
        domain: 'village',
        payload: {
          x: Math.random() * 100,
          y: Math.random() * 100,
          name: `Agent ${Math.floor(Math.random() * 1000)}`,
        },
      });
      console.log('[Demo] Spawned agent');
      break;

    case 'x':
    case 'X':
      // Request snapshot
      universeClient.requestSnapshot().then((snapshot) => {
        console.log('[Demo] Snapshot:', snapshot);
        // Could download this as a file
        const blob = new Blob([snapshot], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `universe-snapshot-${Date.now()}.bin`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('[Demo] Snapshot downloaded');
      });
      break;
  }
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  unsubscribe();
  universeClient.disconnect();
});

console.log('[Demo] SharedWorker demo loaded. Open dev console and multiple tabs to test!');
