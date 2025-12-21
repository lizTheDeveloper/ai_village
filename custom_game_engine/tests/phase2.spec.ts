import { test, expect } from '@playwright/test';

test('Phase 2: Wandering Agents', async ({ page }) => {
  // Start the demo app
  await page.goto('http://localhost:3003');

  // Wait for the game to initialize
  await page.waitForSelector('#status', { timeout: 10000 });

  // Wait a few seconds for agents to spawn and start moving
  await page.waitForTimeout(5000);

  // Check that the game loop is running
  const status = await page.textContent('#status');
  expect(status).toContain('Running');

  // Get game state from the window object
  const stats = await page.evaluate(() => {
    const gameLoop = (window as any).gameLoop;
    if (!gameLoop) return null;

    const agents = gameLoop.world.query().with('agent').executeEntities();
    const movingAgents = agents.filter((e: any) => {
      const movement = e.getComponent('movement');
      return movement && (movement.velocityX !== 0 || movement.velocityY !== 0);
    });

    const entities = gameLoop.world.query().executeEntities();

    return {
      totalEntities: entities.length,
      totalAgents: agents.length,
      movingAgents: movingAgents.length,
      tick: gameLoop.world.tick,
    };
  });

  console.log('Game stats:', stats);

  // Verify we have some entities
  expect(stats?.totalEntities).toBeGreaterThan(0);

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/phase2-agents.png' });

  console.log('Phase 2 test complete!');
  console.log(`- Total entities: ${stats?.totalEntities}`);
  console.log(`- Total agents: ${stats?.totalAgents}`);
  console.log(`- Moving agents: ${stats?.movingAgents}`);
  console.log(`- Game tick: ${stats?.tick}`);
});
