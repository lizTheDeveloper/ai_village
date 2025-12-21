import { GameLoop } from '@ai-village/core';
import { Renderer, InputHandler } from '@ai-village/renderer';

/**
 * Phase 0 Demo
 * Tests the core game engine foundation.
 */

function main() {
  console.log('AI Village - Phase 0 Demo');

  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Create game loop
  const gameLoop = new GameLoop();

  // Create renderer
  const renderer = new Renderer(canvas);

  // Create input handler
  const inputHandler = new InputHandler(canvas, renderer.getCamera());

  // Render loop (separate from game loop)
  function renderLoop() {
    inputHandler.update();
    renderer.render(gameLoop.world);
    requestAnimationFrame(renderLoop);
  }

  // Update status
  function updateStatus() {
    if (!statusEl) return;

    const stats = gameLoop.getStats();
    statusEl.textContent = `Running - Tick ${stats.currentTick} - Avg: ${stats.avgTickTimeMs.toFixed(2)}ms`;
    statusEl.className = 'status running';
  }

  setInterval(updateStatus, 100);

  // Start
  console.log('Starting game loop...');
  gameLoop.start();

  console.log('Starting render loop...');
  renderLoop();

  console.log('Phase 0 initialized successfully!');
  console.log('Game loop:', gameLoop);
  console.log('Systems:', gameLoop.systemRegistry.getSorted());

  // Expose for debugging
  (window as any).gameLoop = gameLoop;
  (window as any).renderer = renderer;
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
