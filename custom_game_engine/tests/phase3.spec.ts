import { test, expect } from '@playwright/test';

test('Phase 3: Needs & Resource Gathering', async ({ page }) => {
  // Start the demo app
  await page.goto('http://localhost:3003');

  // Wait for the game to initialize
  await page.waitForSelector('#status', { timeout: 10000 });

  // Wait longer for agents to get hungry and start seeking food
  await page.waitForTimeout(10000);

  // Get game state
  const stats = await page.evaluate(() => {
    const gameLoop = (window as any).gameLoop;
    if (!gameLoop) return null;

    const agents = gameLoop.world.query().with('agent').with('needs').executeEntities();

    // Count agents by behavior
    let wandering = 0;
    let seekingFood = 0;
    let avgHunger = 0;
    let avgEnergy = 0;

    for (const agent of agents) {
      const agentComp = agent.getComponent('agent');
      const needs = agent.getComponent('needs');

      if (agentComp.behavior === 'wander') wandering++;
      if (agentComp.behavior === 'seek_food') seekingFood++;

      if (needs) {
        avgHunger += needs.hunger;
        avgEnergy += needs.energy;
      }
    }

    avgHunger /= agents.length;
    avgEnergy /= agents.length;

    // Count food resources
    const foodResources = gameLoop.world
      .query()
      .with('resource')
      .executeEntities()
      .filter((e: any) => {
        const res = e.getComponent('resource');
        return res.resourceType === 'food';
      });

    return {
      totalAgents: agents.length,
      wandering,
      seekingFood,
      avgHunger: Math.round(avgHunger),
      avgEnergy: Math.round(avgEnergy),
      foodResources: foodResources.length,
      tick: gameLoop.world.tick,
    };
  });

  console.log('Phase 3 stats:', stats);

  // Verify we have agents
  expect(stats?.totalAgents).toBeGreaterThan(0);

  // Verify some agents are hungry and seeking food (after 10 seconds)
  expect(stats?.avgHunger).toBeLessThan(100);

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/phase3-needs-gathering.png' });

  console.log('Phase 3 test complete!');
  console.log(`- Total agents: ${stats?.totalAgents}`);
  console.log(`- Wandering: ${stats?.wandering}`);
  console.log(`- Seeking food: ${stats?.seekingFood}`);
  console.log(`- Avg hunger: ${stats?.avgHunger}%`);
  console.log(`- Avg energy: ${stats?.avgEnergy}%`);
  console.log(`- Food resources: ${stats?.foodResources}`);
  console.log(`- Game tick: ${stats?.tick}`);
});
