import { test, expect } from '@playwright/test';

test('Phase 7: Building & Shelter', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes timeout

  // Collect console logs to monitor building activity
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('building') || text.includes('shelter') || text.includes('Phase 7')) {
      console.log('🏠 Building Log:', text);
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

  // Wait for the game title to verify it's Phase 7
  const title = await page.textContent('h1');
  console.log('Page title:', title);
  expect(title).toContain('Phase 7');

  // Wait for game to run for 30 seconds
  console.log('Waiting for game to run...');
  await page.waitForTimeout(30000);

  // Get game state and building statistics
  const stats = await page.evaluate(() => {
    const gameLoop = (window as any).gameLoop;
    if (!gameLoop) return null;

    const agents = gameLoop.world.query().with('agent').executeEntities();
    const buildings = gameLoop.world.query().with('building').executeEntities();

    // Count building types
    let campfires = 0;
    let leanTos = 0;
    let storageBoxes = 0;
    let completedBuildings = 0;
    let underConstruction = 0;

    for (const building of buildings) {
      const buildingComp = building.getComponent('building');
      if (!buildingComp) continue;

      if (buildingComp.buildingType === 'campfire') campfires++;
      if (buildingComp.buildingType === 'lean-to') leanTos++;
      if (buildingComp.buildingType === 'storage-box') storageBoxes++;

      if (buildingComp.isComplete) {
        completedBuildings++;
      } else {
        underConstruction++;
      }
    }

    // Get shelter statistics from agents
    let totalShelter = 0;
    let agentsWithNeeds = 0;

    for (const agent of agents) {
      const needs = agent.getComponent('needs');
      if (needs && needs.shelter !== undefined) {
        totalShelter += needs.shelter;
        agentsWithNeeds++;
      }
    }

    const avgShelter = agentsWithNeeds > 0 ? totalShelter / agentsWithNeeds : 0;

    return {
      totalAgents: agents.length,
      totalBuildings: buildings.length,
      campfires,
      leanTos,
      storageBoxes,
      completedBuildings,
      underConstruction,
      avgShelter: avgShelter.toFixed(1),
      agentsWithShelterNeed: agentsWithNeeds,
      tick: gameLoop.world.tick,
    };
  });

  console.log('\n=== Phase 7 Building & Shelter Stats ===');
  console.log('Stats:', stats);
  console.log('\nConsole logs captured:', consoleLogs.length);
  console.log('Console errors:', consoleErrors.length);

  // Verify we have agents
  expect(stats?.totalAgents).toBeGreaterThan(0);
  console.log(`✓ Total agents: ${stats?.totalAgents}`);

  // Verify BuildingSystem is registered
  const systemsCheck = await page.evaluate(() => {
    const gameLoop = (window as any).gameLoop;
    if (!gameLoop) return { hasBuildings: false };

    const systems = gameLoop.systemRegistry.getSorted();
    const hasBuildingSystem = systems.some((s: any) => s.id === 'building');

    return {
      hasBuildings: hasBuildingSystem,
      systemCount: systems.length,
      systemIds: systems.map((s: any) => s.id),
    };
  });

  console.log('System check:', systemsCheck);
  expect(systemsCheck.hasBuildings).toBe(true);
  console.log(`✓ BuildingSystem is registered`);
  console.log(`  - Total systems: ${systemsCheck.systemCount}`);
  console.log(`  - Systems: ${systemsCheck.systemIds.join(', ')}`);

  // Verify agents have shelter need
  expect(stats?.agentsWithShelterNeed).toBe(stats?.totalAgents);
  console.log(`✓ All agents have shelter need tracked`);
  console.log(`  - Average shelter: ${stats?.avgShelter}%`);

  // Log building statistics (buildings might not exist yet, that's okay)
  console.log(`\n📊 Building statistics:`);
  console.log(`  - Total buildings: ${stats?.totalBuildings}`);
  console.log(`  - Campfires: ${stats?.campfires}`);
  console.log(`  - Lean-tos: ${stats?.leanTos}`);
  console.log(`  - Storage boxes: ${stats?.storageBoxes}`);
  console.log(`  - Completed: ${stats?.completedBuildings}`);
  console.log(`  - Under construction: ${stats?.underConstruction}`);

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
  await page.screenshot({ path: 'tests/screenshots/phase7-building-shelter.png' });
  console.log('✓ Screenshot saved');

  console.log('\n🎉 Phase 7 Building & Shelter test complete!\n');
});
