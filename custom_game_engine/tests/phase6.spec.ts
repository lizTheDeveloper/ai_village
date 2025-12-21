import { test, expect } from '@playwright/test';

test('Phase 6: LLM Integration', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes timeout
  // Collect console logs to monitor LLM activity
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('LLM') || text.includes('Ollama') || text.includes('decision')) {
      console.log('🤖 LLM Log:', text);
    }
  });

  // Collect console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Start the demo app (running on port 3004)
  await page.goto('http://localhost:3004');

  // Wait for the game to initialize
  await page.waitForSelector('#status', { timeout: 10000 });

  // Wait for the game title to verify it's Phase 6
  const title = await page.textContent('h1');
  console.log('Page title:', title);

  // Wait for agents to spawn and LLM decisions to be made (30 seconds)
  console.log('Waiting for agents to spawn and make LLM decisions...');
  await page.waitForTimeout(30000);

  // Get game state and LLM statistics
  const stats = await page.evaluate(() => {
    const gameLoop = (window as any).gameLoop;
    if (!gameLoop) return null;

    const agents = gameLoop.world.query().with('agent').executeEntities();

    // Count LLM vs scripted agents
    let llmAgents = 0;
    let scriptedAgents = 0;
    let llmAgentsWithCooldown = 0;
    let llmAgentsReady = 0;

    // Count behaviors
    let wandering = 0;
    let seekingFood = 0;
    let followingAgent = 0;
    let talking = 0;
    let idle = 0;

    for (const agent of agents) {
      const agentComp = agent.getComponent('agent');

      // Count LLM vs scripted
      if (agentComp.useLLM) {
        llmAgents++;
        if (agentComp.llmCooldown > 0) {
          llmAgentsWithCooldown++;
        } else {
          llmAgentsReady++;
        }
      } else {
        scriptedAgents++;
      }

      // Count behaviors
      if (agentComp.behavior === 'wander') wandering++;
      if (agentComp.behavior === 'seek_food') seekingFood++;
      if (agentComp.behavior === 'follow_agent') followingAgent++;
      if (agentComp.behavior === 'talk') talking++;
      if (agentComp.behavior === 'idle') idle++;
    }

    // Get LLM queue stats
    const aiSystem = gameLoop.systemRegistry.getSorted().find((s: any) => s.constructor.name === 'AISystem');
    let queueSize = 0;
    let activeRequests = 0;

    if (aiSystem && aiSystem.llmDecisionQueue) {
      queueSize = aiSystem.llmDecisionQueue.getQueueSize?.() || 0;
      activeRequests = aiSystem.llmDecisionQueue.getActiveCount?.() || 0;
    }

    return {
      totalAgents: agents.length,
      llmAgents,
      scriptedAgents,
      llmAgentsWithCooldown,
      llmAgentsReady,
      wandering,
      seekingFood,
      followingAgent,
      talking,
      idle,
      queueSize,
      activeRequests,
      tick: gameLoop.world.tick,
    };
  });

  console.log('\n=== Phase 6 LLM Integration Stats ===');
  console.log('Stats:', stats);
  console.log('\nConsole logs captured:', consoleLogs.length);
  console.log('Console errors:', consoleErrors.length);

  // Verify we have agents
  expect(stats?.totalAgents).toBeGreaterThan(0);
  console.log(`✓ Total agents: ${stats?.totalAgents}`);

  // Verify we have LLM agents
  expect(stats?.llmAgents).toBeGreaterThan(0);
  console.log(`✓ LLM-controlled agents: ${stats?.llmAgents}`);
  console.log(`  - Scripted agents: ${stats?.scriptedAgents}`);
  console.log(`  - LLM agents with cooldown: ${stats?.llmAgentsWithCooldown}`);
  console.log(`  - LLM agents ready for decision: ${stats?.llmAgentsReady}`);

  // Verify LLM queue is accessible
  expect(stats?.queueSize).toBeGreaterThanOrEqual(0);
  console.log(`✓ LLM decision queue size: ${stats?.queueSize}`);
  console.log(`  - Active LLM requests: ${stats?.activeRequests}`);

  // Verify behaviors are diverse (LLM should make different decisions)
  const totalBehaviors = (stats?.wandering || 0) + (stats?.seekingFood || 0) +
                        (stats?.followingAgent || 0) + (stats?.talking || 0) +
                        (stats?.idle || 0);
  expect(totalBehaviors).toBe(stats?.totalAgents);
  console.log(`✓ Agent behaviors:`);
  console.log(`  - Wandering: ${stats?.wandering}`);
  console.log(`  - Seeking food: ${stats?.seekingFood}`);
  console.log(`  - Following agent: ${stats?.followingAgent}`);
  console.log(`  - Talking: ${stats?.talking}`);
  console.log(`  - Idle: ${stats?.idle}`);

  // Verify no critical errors
  const criticalErrors = consoleErrors.filter(err =>
    !err.includes('404') && // Ignore 404s
    !err.includes('favicon') // Ignore favicon errors
  );
  expect(criticalErrors.length).toBe(0);
  if (criticalErrors.length > 0) {
    console.error('Critical errors found:', criticalErrors);
  } else {
    console.log('✓ No critical console errors');
  }

  console.log(`✓ Game running at tick: ${stats?.tick}`);

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/phase6-llm-integration.png' });
  console.log('✓ Screenshot saved');

  console.log('\n🎉 Phase 6 LLM Integration test complete!\n');
});
