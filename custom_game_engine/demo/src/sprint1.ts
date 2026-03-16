/**
 * MVEE Sprint 1 — Minimal Renderer Entry Point (MUL-821)
 *
 * Goals:
 * - 1-chunk terrain renders correctly (grass, water, trees, stone)
 * - Camera pan (WASD + Arrow keys + mouse drag) and zoom (scroll)
 * - No UI panels — just the viewport
 * - No sprite generation — placeholder colors only
 * - WebGL context must be stable (no context loss)
 * - Target: 60fps with empty world (no entities)
 */

import {
  GameLoop,
  registerAllSystems,
  SPRINT_1_FLAGS,
  type World,
} from '@ai-village/core';
import { ChunkManager, TerrainGenerator } from '@ai-village/world';
import { createRenderer, InputHandler } from '@ai-village/renderer';

const CAMERA_PAN_SPEED = 5;

async function main(): Promise<void> {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const statusEl = document.getElementById('status') as HTMLElement;

  if (!canvas) throw new Error('Canvas element not found');
  if (!statusEl) throw new Error('Status element not found');

  // Size canvas to fill viewport
  function resizeCanvas(): void {
    const main = canvas.parentElement;
    if (!main) return;
    canvas.width = main.clientWidth;
    canvas.height = main.clientHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ─── Game Loop & World ───────────────────────────────────────────────────
  const gameLoop = new GameLoop();
  const world: World = gameLoop.world;

  // ─── Terrain ─────────────────────────────────────────────────────────────
  // loadRadius=1 keeps only the center chunk in memory for Sprint 1
  const terrainGenerator = new TerrainGenerator('sprint1-seed');
  const chunkManager = new ChunkManager(1);

  // Register terrain with world so chunk-aware systems can access it
  (world as any).setChunkManager(chunkManager);
  (world as any).setTerrainGenerator(terrainGenerator);

  // Pre-generate center chunk so the renderer has terrain on frame 1
  const centerChunk = chunkManager.getChunk(0, 0);
  terrainGenerator.generateChunk(centerChunk, world as any);

  // ─── Systems (Sprint 1 flags — no agents, no LLM, no UI) ─────────────────
  const systemsResult = registerAllSystems(gameLoop, {
    featureFlags: SPRINT_1_FLAGS,
    chunkManager,
    terrainGenerator,
    enableMetrics: false,
    enableAutoSave: false,
  });

  // ─── Renderer ────────────────────────────────────────────────────────────
  const renderer = await createRenderer(canvas, chunkManager, terrainGenerator, {
    preference: 'webgl',
  });

  // Give the chunk loading system a viewport provider so it knows which area
  // to keep loaded when the camera moves
  if (systemsResult.chunkLoadingSystem) {
    systemsResult.chunkLoadingSystem.setViewportProvider(() => ({
      x: renderer.getCamera().x,
      y: renderer.getCamera().y,
      width: canvas.width,
      height: canvas.height,
    }));
  }

  // ─── Input ───────────────────────────────────────────────────────────────
  // InputHandler handles: mouse drag pan, scroll zoom, Arrow key pan
  const inputHandler = new InputHandler(canvas, renderer.getCamera());

  // Track WASD separately (Arrow keys are already in InputHandler)
  const keysDown = new Set<string>();
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    keysDown.add(e.key);
    // Prevent WASD from scrolling the page
    if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keysDown.delete(e.key);
  });

  // ─── ECS Game Loop (20 TPS) ───────────────────────────────────────────────
  gameLoop.start();

  statusEl.textContent = 'Running';
  statusEl.classList.add('running');

  // ─── Render Loop (60 fps) ─────────────────────────────────────────────────
  function renderLoop(): void {
    requestAnimationFrame(renderLoop);

    const camera = renderer.getCamera();

    // WASD camera pan
    if (keysDown.has('w') || keysDown.has('W')) camera.pan(0, -CAMERA_PAN_SPEED);
    if (keysDown.has('s') || keysDown.has('S')) camera.pan(0, CAMERA_PAN_SPEED);
    if (keysDown.has('a') || keysDown.has('A')) camera.pan(-CAMERA_PAN_SPEED, 0);
    if (keysDown.has('d') || keysDown.has('D')) camera.pan(CAMERA_PAN_SPEED, 0);

    // Arrow keys + zoom via InputHandler (handles state internally)
    inputHandler.update();

    // Render the world
    renderer.render(world);
  }

  renderLoop();
}

main().catch((err: Error) => {
  console.error('[Sprint1] Fatal error during initialization:', err);
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = `Error: ${err.message}`;
    statusEl.classList.add('error');
  }
});
