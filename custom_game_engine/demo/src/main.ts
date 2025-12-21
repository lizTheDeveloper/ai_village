import {
  GameLoop,
  AISystem,
  MovementSystem,
  NeedsSystem,
  MemorySystem,
  CommunicationSystem,
} from '@ai-village/core';
import { Renderer, InputHandler } from '@ai-village/renderer';
import {
  OllamaProvider,
  LLMDecisionQueue,
  StructuredPromptBuilder,
} from '@ai-village/llm';

/**
 * Phase 6 Demo (LLM Integration)
 * Tests LLM-driven agent decision making.
 */

function main() {
  console.log('AI Village - Phase 6 Demo (LLM Integration)');

  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Create game loop
  const gameLoop = new GameLoop();

  // Create LLM components
  const llmProvider = new OllamaProvider('qwen3:4b');
  const llmQueue = new LLMDecisionQueue(llmProvider, 2);
  const promptBuilder = new StructuredPromptBuilder();

  // Register systems (order: AI -> Communication -> Needs -> Movement -> Memory)
  gameLoop.systemRegistry.register(new AISystem(llmQueue, promptBuilder));
  gameLoop.systemRegistry.register(new CommunicationSystem());
  gameLoop.systemRegistry.register(new NeedsSystem());
  gameLoop.systemRegistry.register(new MovementSystem());
  gameLoop.systemRegistry.register(new MemorySystem());

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

  console.log('Phase 5 initialized successfully!');
  console.log('Game loop:', gameLoop);
  console.log('Systems:', gameLoop.systemRegistry.getSorted());

  // Log agent count
  setInterval(() => {
    const agents = gameLoop.world.query().with('agent').executeEntities();
    const movingAgents = agents.filter((e) => {
      const movement = e.getComponent('movement');
      return movement && ((movement as any).velocityX !== 0 || (movement as any).velocityY !== 0);
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
