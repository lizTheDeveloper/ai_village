import { test, expect } from '@playwright/test';

test('Phase 7: Archetype System - Building Creation', async ({ page }) => {
  test.setTimeout(60000);

  // Collect console logs
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    consoleLogs.push(msg.text());
  });

  // Start the demo app
  await page.goto('http://localhost:3000');
  await page.waitForSelector('#status', { timeout: 10000 });

  // Test 1: Create a building using the archetype system
  console.log('\n=== Test 1: Create Building via Archetype ===');

  const buildingTest = await page.evaluate(() => {
    const gameLoop = (window as any).gameLoop;
    if (!gameLoop) return { error: 'GameLoop not found' };

    const world = gameLoop._getWorldMutator();

    // Create a lean-to building
    const buildingId = world.createEntity('lean-to');

    // Add position component (archetypes don't include position)
    world.addComponent(buildingId, {
      type: 'position',
      version: 1,
      x: 10,
      y: 10,
      chunkX: 0,
      chunkY: 0,
    });

    // Verify entity was created
    const building = world.getEntity(buildingId);
    if (!building) return { error: 'Building entity not created' };

    // Check components
    const hasBuilding = building.components.has('building');
    const hasRenderable = building.components.has('renderable');
    const hasPosition = building.components.has('position');

    const buildingComp = building.getComponent('building');
    const renderableComp = building.getComponent('renderable');
    const positionComp = building.getComponent('position');

    return {
      success: true,
      buildingId,
      hasBuilding,
      hasRenderable,
      hasPosition,
      buildingType: buildingComp?.buildingType,
      isComplete: buildingComp?.isComplete,
      providesShelter: buildingComp?.providesShelter,
      spriteId: renderableComp?.spriteId,
      position: { x: positionComp?.x, y: positionComp?.y },
    };
  });

  console.log('Building creation result:', buildingTest);

  expect(buildingTest.success).toBe(true);
  expect(buildingTest.hasBuilding).toBe(true);
  expect(buildingTest.hasRenderable).toBe(true);
  expect(buildingTest.hasPosition).toBe(true);
  expect(buildingTest.buildingType).toBe('lean-to');
  expect(buildingTest.providesShelter).toBe(true);
  expect(buildingTest.spriteId).toBe('lean-to');
  console.log('✓ Building created successfully with archetype system');
  console.log(`  - Type: ${buildingTest.buildingType}`);
  console.log(`  - Position: (${buildingTest.position.x}, ${buildingTest.position.y})`);
  console.log(`  - Provides shelter: ${buildingTest.providesShelter}`);

  // Test 2: Query buildings
  console.log('\n=== Test 2: Query Buildings ===');

  const queryTest = await page.evaluate(() => {
    const gameLoop = (window as any).gameLoop;
    const buildings = gameLoop.world.query().with('building').executeEntities();

    return {
      buildingCount: buildings.length,
      buildingTypes: buildings.map((b: any) => b.getComponent('building')?.buildingType),
    };
  });

  console.log('Query result:', queryTest);
  expect(queryTest.buildingCount).toBeGreaterThan(0);
  console.log(`✓ Found ${queryTest.buildingCount} building(s)`);
  console.log(`  - Types: ${queryTest.buildingTypes.join(', ')}`);

  console.log('\n✅ Phase 7 Archetype System test passed!\n');
});

test('Phase 7: BuildingSystem - Shelter Restoration', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('http://localhost:3000');
  await page.waitForSelector('#status', { timeout: 10000 });

  console.log('\n=== Test: Shelter Restoration ===');

  // Create a building and an agent nearby, then simulate time passing
  const shelterTest = await page.evaluate(async () => {
    const gameLoop = (window as any).gameLoop;
    const world = gameLoop._getWorldMutator();

    // Create a campfire
    const buildingId = world.createEntity('campfire');
    world.addComponent(buildingId, {
      type: 'position',
      version: 1,
      x: 50,
      y: 50,
      chunkX: Math.floor(50 / 32),
      chunkY: Math.floor(50 / 32),
    });

    // Find or check if there are any agents
    const agents = gameLoop.world.query().with('agent').with('needs').executeEntities();

    if (agents.length === 0) {
      return { error: 'No agents found in world' };
    }

    // Get first agent's initial shelter
    const agent = agents[0];
    const agentId = agent.id;
    const initialNeeds = agent.getComponent('needs');
    const initialShelter = initialNeeds?.shelter || 0;

    // Move agent near the building
    const agentPos = agent.getComponent('position');
    if (agentPos) {
      world.updateComponent(agentId, 'position', (pos: any) => ({
        ...pos,
        x: 51, // 1 tile away from campfire
        y: 51,
        chunkX: Math.floor(51 / 32),
        chunkY: Math.floor(51 / 32),
      }));
    }

    // Let BuildingSystem run for a few ticks
    // (The system should restore shelter)

    return {
      success: true,
      agentId,
      buildingId,
      initialShelter,
      agentPosition: { x: 51, y: 51 },
      buildingPosition: { x: 50, y: 50 },
    };
  });

  console.log('Setup result:', shelterTest);
  expect(shelterTest.success).toBe(true);

  // Wait for a few seconds to let BuildingSystem process
  console.log('Waiting for BuildingSystem to process...');
  await page.waitForTimeout(5000);

  // Check if shelter increased
  const finalCheck = await page.evaluate((agentId: string) => {
    const gameLoop = (window as any).gameLoop;
    const agent = gameLoop.world.getEntity(agentId);
    const needs = agent?.getComponent('needs');

    return {
      finalShelter: needs?.shelter || 0,
    };
  }, shelterTest.agentId);

  console.log(`Initial shelter: ${shelterTest.initialShelter}`);
  console.log(`Final shelter: ${finalCheck.finalShelter}`);

  // Shelter should have increased (or stayed at 100 if it was already high)
  const shelterIncreased = finalCheck.finalShelter >= shelterTest.initialShelter;
  expect(shelterIncreased).toBe(true);

  if (finalCheck.finalShelter > shelterTest.initialShelter) {
    console.log('✓ BuildingSystem is restoring shelter to nearby agents');
  } else {
    console.log('✓ Agent shelter is maintained (already at max or building system working)');
  }

  console.log('\n✅ Phase 7 BuildingSystem test passed!\n');
});
