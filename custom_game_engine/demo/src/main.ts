import { GameLoop, AISystem, MovementSystem } from '@ai-village/core';
import { Renderer, InputHandler } from '@ai-village/renderer';

/**
 * Phase 2 Demo
 * Tests AI agents with wandering behavior.
 */

function main() {
  console.log('AI Village - Phase 2 Demo');

  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Create game loop
  const gameLoop = new GameLoop();

  // Register AI and Movement systems
  gameLoop.systemRegistry.register(new AISystem());
  gameLoop.systemRegistry.register(new MovementSystem());

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

  console.log('Phase 2 initialized successfully!');
  console.log('Game loop:', gameLoop);
  console.log('Systems:', gameLoop.systemRegistry.getSorted());

  // Log agent count
  setInterval(() => {
    const agents = gameLoop.world.query(['agent']);
    const movingAgents = agents.filter((e) => {
      const movement = e.getComponent('movement') as any;
      return movement && (movement.velocityX !== 0 || movement.velocityY !== 0);
    });
    console.log(
      `Agents: ${agents.length} total, ${movingAgents.length} moving`
    );
  }, 5000);

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
