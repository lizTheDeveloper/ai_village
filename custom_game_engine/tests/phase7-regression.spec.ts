import { test, expect } from '@playwright/test';

/**
 * Phase 7 Regression Tests
 *
 * Comprehensive test suite to prevent regressions in:
 * - Archetype entity creation system
 * - Building components and archetypes
 * - BuildingSystem shelter restoration
 * - Shelter need tracking
 * - Integration with game loop
 */

test.describe('Phase 7: Regression Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#status', { timeout: 10000 });
  });

  test('Archetype Registry - All building archetypes are registered', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      // Try to create each archetype
      const results = {
        leanTo: false,
        campfire: false,
        storageBox: false,
        errors: [] as string[],
      };

      try {
        const leanToId = world.createEntity('lean-to');
        results.leanTo = !!world.getEntity(leanToId);
        world.destroyEntity(leanToId, 'test');
      } catch (e: any) {
        results.errors.push(`lean-to: ${e.message}`);
      }

      try {
        const campfireId = world.createEntity('campfire');
        results.campfire = !!world.getEntity(campfireId);
        world.destroyEntity(campfireId, 'test');
      } catch (e: any) {
        results.errors.push(`campfire: ${e.message}`);
      }

      try {
        const storageBoxId = world.createEntity('storage-box');
        results.storageBox = !!world.getEntity(storageBoxId);
        world.destroyEntity(storageBoxId, 'test');
      } catch (e: any) {
        results.errors.push(`storage-box: ${e.message}`);
      }

      return results;
    });

    expect(result.leanTo).toBe(true);
    expect(result.campfire).toBe(true);
    expect(result.storageBox).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('BuildingComponent - Campfire provides shelter (regression for bug fix)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      const campfireId = world.createEntity('campfire');
      const building = world.getComponent(campfireId, 'building');

      const result = {
        providesShelter: building?.providesShelter,
        providesWarmth: building?.providesWarmth,
        blocksMovement: building?.blocksMovement,
      };

      world.destroyEntity(campfireId, 'test');
      return result;
    });

    expect(result.providesShelter).toBe(true); // Critical: campfire MUST provide shelter
    expect(result.providesWarmth).toBe(true);
    expect(result.blocksMovement).toBe(false);
  });

  test('BuildingComponent - Lean-to has correct properties', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      const leanToId = world.createEntity('lean-to');
      const building = world.getComponent(leanToId, 'building');

      const result = {
        buildingType: building?.buildingType,
        providesShelter: building?.providesShelter,
        isComplete: building?.isComplete,
        blocksMovement: building?.blocksMovement,
      };

      world.destroyEntity(leanToId, 'test');
      return result;
    });

    expect(result.buildingType).toBe('lean-to');
    expect(result.providesShelter).toBe(true);
    expect(result.isComplete).toBe(true);
    expect(result.blocksMovement).toBe(true);
  });

  test('BuildingComponent - Storage box has storage capacity', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      const storageBoxId = world.createEntity('storage-box');
      const building = world.getComponent(storageBoxId, 'building');

      const result = {
        buildingType: building?.buildingType,
        storageCapacity: building?.storageCapacity,
      };

      world.destroyEntity(storageBoxId, 'test');
      return result;
    });

    expect(result.buildingType).toBe('storage-box');
    expect(result.storageCapacity).toBeGreaterThan(0); // Should have storage
  });

  test('Archetype - Entities created with correct components', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      const buildingId = world.createEntity('lean-to');
      const entity = world.getEntity(buildingId);

      const result = {
        hasBuilding: entity?.components.has('building'),
        hasRenderable: entity?.components.has('renderable'),
        hasPosition: entity?.components.has('position'), // Should be false - added separately
        componentCount: entity?.components.size,
      };

      world.destroyEntity(buildingId, 'test');
      return result;
    });

    expect(result.hasBuilding).toBe(true);
    expect(result.hasRenderable).toBe(true);
    expect(result.hasPosition).toBe(false); // Position not included in archetype
    expect(result.componentCount).toBe(2); // Only building + renderable
  });

  test('Archetype - Position can be added after entity creation', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      const buildingId = world.createEntity('campfire');

      // Add position component
      world.addComponent(buildingId, {
        type: 'position',
        version: 1,
        x: 100,
        y: 200,
        chunkX: Math.floor(100 / 32),
        chunkY: Math.floor(200 / 32),
      });

      const position = world.getComponent(buildingId, 'position');

      const result = {
        x: position?.x,
        y: position?.y,
        chunkX: position?.chunkX,
        chunkY: position?.chunkY,
      };

      world.destroyEntity(buildingId, 'test');
      return result;
    });

    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
    expect(result.chunkX).toBe(3); // 100 / 32 = 3.125, floored to 3
    expect(result.chunkY).toBe(6); // 200 / 32 = 6.25, floored to 6
  });

  test('BuildingSystem - Restores shelter to nearby agents', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      // Find an agent
      const agents = gameLoop.world.query().with('agent').with('needs').with('position').executeEntities();
      if (agents.length === 0) return { error: 'No agents found' };

      const agent = agents[0];
      const agentId = agent.id;

      // Get initial shelter
      const initialNeeds = agent.getComponent('needs');
      const initialShelter = initialNeeds?.shelter || 0;

      // Create a building right next to the agent
      const agentPos = agent.getComponent('position');
      const buildingId = world.createEntity('campfire');
      world.addComponent(buildingId, {
        type: 'position',
        version: 1,
        x: agentPos.x + 1, // 1 tile away
        y: agentPos.y,
        chunkX: Math.floor((agentPos.x + 1) / 32),
        chunkY: Math.floor(agentPos.y / 32),
      });

      // Wait for BuildingSystem to process (multiple ticks)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check final shelter
      const updatedAgent = world.getEntity(agentId);
      const finalNeeds = updatedAgent?.getComponent('needs');
      const finalShelter = finalNeeds?.shelter || 0;

      world.destroyEntity(buildingId, 'test');

      return {
        initialShelter,
        finalShelter,
        increased: finalShelter > initialShelter,
        difference: finalShelter - initialShelter,
      };
    });

    expect(result.increased).toBe(true);
    expect(result.difference).toBeGreaterThan(0);
    // In 3 seconds at 5 points/second, should restore ~15 points (with some variance)
    expect(result.difference).toBeGreaterThan(5);
  });

  test('BuildingSystem - Does NOT restore shelter to distant agents', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      // Find an agent
      const agents = gameLoop.world.query().with('agent').with('needs').with('position').executeEntities();
      if (agents.length === 0) return { error: 'No agents found' };

      const agent = agents[0];
      const agentId = agent.id;

      // Set shelter to a low value
      world.updateComponent(agentId, 'needs', (needs: any) => ({
        ...needs,
        shelter: 10,
      }));

      const initialNeeds = world.getEntity(agentId)?.getComponent('needs');
      const initialShelter = initialNeeds?.shelter || 0;

      // Create a building FAR away (10 tiles - outside SHELTER_RANGE of 3)
      const agentPos = agent.getComponent('position');
      const buildingId = world.createEntity('campfire');
      world.addComponent(buildingId, {
        type: 'position',
        version: 1,
        x: agentPos.x + 10, // 10 tiles away
        y: agentPos.y,
        chunkX: Math.floor((agentPos.x + 10) / 32),
        chunkY: Math.floor(agentPos.y / 32),
      });

      // Wait for BuildingSystem
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check shelter - should have DECREASED (from decay)
      const finalAgent = world.getEntity(agentId);
      const finalNeeds = finalAgent?.getComponent('needs');
      const finalShelter = finalNeeds?.shelter || 0;

      world.destroyEntity(buildingId, 'test');

      return {
        initialShelter,
        finalShelter,
        decreased: finalShelter < initialShelter,
        wasNotRestored: finalShelter <= initialShelter,
      };
    });

    expect(result.wasNotRestored).toBe(true);
    // Shelter should have decreased due to decay, not increased
  });

  test('BuildingSystem - Multiple buildings stack shelter restoration', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      // Find an agent
      const agents = gameLoop.world.query().with('agent').with('needs').with('position').executeEntities();
      if (agents.length === 0) return { error: 'No agents found' };

      const agent = agents[0];
      const agentId = agent.id;
      const agentPos = agent.getComponent('position');

      // Set initial shelter low
      world.updateComponent(agentId, 'needs', (needs: any) => ({
        ...needs,
        shelter: 5,
      }));

      const initialShelter = 5;

      // Create TWO buildings near the agent
      const building1Id = world.createEntity('campfire');
      world.addComponent(building1Id, {
        type: 'position',
        version: 1,
        x: agentPos.x + 1,
        y: agentPos.y,
        chunkX: Math.floor((agentPos.x + 1) / 32),
        chunkY: Math.floor(agentPos.y / 32),
      });

      const building2Id = world.createEntity('lean-to');
      world.addComponent(building2Id, {
        type: 'position',
        version: 1,
        x: agentPos.x,
        y: agentPos.y + 1,
        chunkX: Math.floor(agentPos.x / 32),
        chunkY: Math.floor((agentPos.y + 1) / 32),
      });

      // Wait for restoration
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalAgent = world.getEntity(agentId);
      const finalShelter = finalAgent?.getComponent('needs')?.shelter || 0;

      world.destroyEntity(building1Id, 'test');
      world.destroyEntity(building2Id, 'test');

      return {
        initialShelter,
        finalShelter,
        restored: finalShelter > initialShelter,
      };
    });

    expect(result.restored).toBe(true);
    expect(result.finalShelter).toBeGreaterThan(result.initialShelter);
  });

  test('NeedsComponent - Shelter decays when not near buildings', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      // Find an agent
      const agents = gameLoop.world.query().with('agent').with('needs').executeEntities();
      if (agents.length === 0) return { error: 'No agents found' };

      const agent = agents[0];
      const agentId = agent.id;

      // Set shelter to high value
      world.updateComponent(agentId, 'needs', (needs: any) => ({
        ...needs,
        shelter: 80,
      }));

      const initialShelter = 80;

      // Wait for decay (no buildings nearby)
      await new Promise(resolve => setTimeout(resolve, 3000));

      const finalAgent = world.getEntity(agentId);
      const finalShelter = finalAgent?.getComponent('needs')?.shelter || 0;

      return {
        initialShelter,
        finalShelter,
        decayed: finalShelter < initialShelter,
        decayAmount: initialShelter - finalShelter,
      };
    });

    expect(result.decayed).toBe(true);
    expect(result.decayAmount).toBeGreaterThan(0);
    // At 0.5 points/second for 3 seconds = ~1.5 points minimum
    expect(result.decayAmount).toBeGreaterThan(1);
  });

  test('Integration - Full shelter restoration cycle', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      // Find agent
      const agents = gameLoop.world.query().with('agent').with('needs').with('position').executeEntities();
      if (agents.length === 0) return { error: 'No agents found' };

      const agent = agents[0];
      const agentId = agent.id;
      const agentPos = agent.getComponent('position');

      // Step 1: Set shelter to critical (10%)
      world.updateComponent(agentId, 'needs', (needs: any) => ({
        ...needs,
        shelter: 10,
      }));

      const step1Shelter = 10;

      // Step 2: Wait 1 second - shelter should decay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const step2Agent = world.getEntity(agentId);
      const step2Shelter = step2Agent?.getComponent('needs')?.shelter || 0;

      // Step 3: Create building nearby
      const buildingId = world.createEntity('lean-to');
      world.addComponent(buildingId, {
        type: 'position',
        version: 1,
        x: agentPos.x,
        y: agentPos.y + 1,
        chunkX: Math.floor(agentPos.x / 32),
        chunkY: Math.floor((agentPos.y + 1) / 32),
      });

      // Step 4: Wait for restoration
      await new Promise(resolve => setTimeout(resolve, 3000));

      const step4Agent = world.getEntity(agentId);
      const step4Shelter = step4Agent?.getComponent('needs')?.shelter || 0;

      // Step 5: Destroy building
      world.destroyEntity(buildingId, 'test');

      // Step 6: Wait - shelter should decay again
      await new Promise(resolve => setTimeout(resolve, 2000));

      const step6Agent = world.getEntity(agentId);
      const step6Shelter = step6Agent?.getComponent('needs')?.shelter || 0;

      return {
        step1: step1Shelter, // Initial: 10
        step2: step2Shelter, // After decay: <10
        step4: step4Shelter, // After restoration: >step2
        step6: step6Shelter, // After building removed: <step4
        decayedBeforeBuilding: step2Shelter < step1Shelter,
        restoredWithBuilding: step4Shelter > step2Shelter,
        decayedAfterRemoval: step6Shelter < step4Shelter,
      };
    });

    expect(result.decayedBeforeBuilding).toBe(true);
    expect(result.restoredWithBuilding).toBe(true);
    expect(result.decayedAfterRemoval).toBe(true);
  });

  test('Renderable - Buildings have correct sprite IDs', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      const leanToId = world.createEntity('lean-to');
      const campfireId = world.createEntity('campfire');
      const storageBoxId = world.createEntity('storage-box');

      const leanToRenderable = world.getComponent(leanToId, 'renderable');
      const campfireRenderable = world.getComponent(campfireId, 'renderable');
      const storageBoxRenderable = world.getComponent(storageBoxId, 'renderable');

      const result = {
        leanTo: leanToRenderable?.spriteId,
        campfire: campfireRenderable?.spriteId,
        storageBox: storageBoxRenderable?.spriteId,
      };

      world.destroyEntity(leanToId, 'test');
      world.destroyEntity(campfireId, 'test');
      world.destroyEntity(storageBoxId, 'test');

      return result;
    });

    expect(result.leanTo).toBe('lean-to');
    expect(result.campfire).toBe('campfire');
    expect(result.storageBox).toBe('storage-box');
  });

  test('World - Spatial index updated when building created', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      const buildingId = world.createEntity('campfire');
      world.addComponent(buildingId, {
        type: 'position',
        version: 1,
        x: 100,
        y: 100,
        chunkX: 3,
        chunkY: 3,
      });

      // Query entities in that chunk
      const entitiesInChunk = world.getEntitiesInChunk(3, 3);
      const buildingInChunk = entitiesInChunk.includes(buildingId);

      world.destroyEntity(buildingId, 'test');

      return {
        buildingInChunk,
        chunkSize: entitiesInChunk.length,
      };
    });

    expect(result.buildingInChunk).toBe(true);
  });

  test('BuildingSystem - Registered in system registry', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameLoop = (window as any).gameLoop;
      const systems = gameLoop.systemRegistry.getSorted();

      return {
        hasBuildingSystem: systems.some((s: any) => s.id === 'building'),
        systemIds: systems.map((s: any) => s.id),
      };
    });

    expect(result.hasBuildingSystem).toBe(true);
    expect(result.systemIds).toContain('building');
  });

  test('Critical Path - Archetype → Entity → Position → Query → System', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gameLoop = (window as any).gameLoop;
      const world = gameLoop._getWorldMutator();

      // Step 1: Create entity from archetype
      const buildingId = world.createEntity('lean-to');
      const step1Success = !!world.getEntity(buildingId);

      // Step 2: Add position
      world.addComponent(buildingId, {
        type: 'position',
        version: 1,
        x: 50,
        y: 50,
        chunkX: 1,
        chunkY: 1,
      });
      const step2Success = world.hasComponent(buildingId, 'position');

      // Step 3: Query can find it
      const buildings = world.query().with('building').with('position').executeEntities();
      const step3Success = buildings.some((b: any) => b.id === buildingId);

      // Step 4: Create agent nearby
      const agents = world.query().with('agent').with('needs').with('position').executeEntities();
      if (agents.length === 0) {
        world.destroyEntity(buildingId, 'test');
        return { error: 'No agents to test with' };
      }

      const agent = agents[0];
      const agentId = agent.id;

      // Move agent near building
      world.updateComponent(agentId, 'position', (pos: any) => ({
        ...pos,
        x: 51,
        y: 51,
        chunkX: 1,
        chunkY: 1,
      }));

      // Set shelter low
      world.updateComponent(agentId, 'needs', (needs: any) => ({
        ...needs,
        shelter: 5,
      }));

      const initialShelter = 5;

      // Step 5: Wait for BuildingSystem to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalAgent = world.getEntity(agentId);
      const finalShelter = finalAgent?.getComponent('needs')?.shelter || 0;
      const step5Success = finalShelter > initialShelter;

      world.destroyEntity(buildingId, 'test');

      return {
        step1Success,
        step2Success,
        step3Success,
        step5Success,
        allStepsSuccess: step1Success && step2Success && step3Success && step5Success,
      };
    });

    expect(result.step1Success).toBe(true); // Archetype creates entity
    expect(result.step2Success).toBe(true); // Position can be added
    expect(result.step3Success).toBe(true); // Query finds it
    expect(result.step5Success).toBe(true); // BuildingSystem processes it
    expect(result.allStepsSuccess).toBe(true); // Full integration works
  });
});
