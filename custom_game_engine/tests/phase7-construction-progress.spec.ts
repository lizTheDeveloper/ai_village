import { test, expect } from '@playwright/test';

/**
 * Phase 7: Construction Progress Integration Tests
 *
 * Tests the full construction flow from initiation to completion
 * in the browser environment.
 *
 * Verifies:
 * - Construction sites appear on map
 * - Progress advances over time
 * - Completed buildings replace construction sites
 * - Visual feedback is correct
 * - Events are emitted properly
 *
 * These tests should FAIL initially (TDD red phase).
 */

test.describe('Phase 7: Construction Progress', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to demo page
    await page.goto('http://localhost:5173');

    // Wait for game to initialize
    await page.waitForTimeout(1000);
  });

  test('construction site should appear on map after initiation', async ({ page }) => {
    test.fail(); // TDD red phase - expect failure

    // Initiate construction via UI or API
    await page.evaluate(() => {
      // @ts-ignore - game API not fully typed
      const game = window.game;
      const world = game.world;

      // Create construction site for a tent
      const position = { x: 100, y: 100 };
      const inventory = { cloth: 10, wood: 5 };

      world.initiateConstruction(position, 'tent', inventory);
    });

    // Take screenshot
    await page.screenshot({ path: 'test-results/construction-site-visible.png' });

    // Verify construction site is visible on canvas
    const constructionSiteVisible = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const entities = game.world.query().with('building').executeEntities();

      // Find entity with progress < 100
      const constructionSite = entities.find((e: any) => {
        const building = e.getComponent('building');
        return building.progress < 100;
      });

      return constructionSite !== undefined;
    });

    expect(constructionSiteVisible).toBe(true);
  });

  test('construction progress should advance over time', async ({ page }) => {
    test.fail(); // TDD red phase

    // Create construction site
    const initialProgress = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const world = game.world;

      const position = { x: 100, y: 100 };
      const inventory = { cloth: 10, wood: 5 };

      const site = world.initiateConstruction(position, 'tent', inventory);
      const building = site.getComponent('building');
      return building.progress;
    });

    expect(initialProgress).toBe(0);

    // Wait for some game ticks
    await page.waitForTimeout(2000);

    // Check progress has advanced
    const updatedProgress = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const entities = game.world.query().with('building').executeEntities();
      const constructionSite = entities.find((e: any) => {
        const building = e.getComponent('building');
        return building.buildingType === 'tent' && building.progress < 100;
      });

      if (constructionSite) {
        const building = constructionSite.getComponent('building');
        return building.progress;
      }
      return 0;
    });

    expect(updatedProgress).toBeGreaterThan(initialProgress);
  });

  test('construction should complete at 100% and replace with building', async ({ page }) => {
    test.fail(); // TDD red phase

    // Create construction site with 99% progress
    await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const world = game.world;

      const entity = world.createEntity();
      entity.addComponent('building', {
        type: 'building',
        version: 1,
        buildingType: 'tent',
        tier: 1,
        progress: 99,
        isComplete: false,
        blocksMovement: true,
        providesWarmth: false,
        providesShelter: true,
        storageCapacity: 0,
        providesHeat: false,
        heatRadius: 0,
        heatAmount: 0,
        insulation: 0.5,
        baseTemperature: 8,
        weatherProtection: 0.7,
        interior: true,
        interiorRadius: 2,
      });
      entity.addComponent('position', { type: 'position', version: 1, x: 100, y: 100, z: 0 });
    });

    // Wait for construction to complete
    await page.waitForTimeout(3000);

    // Verify building is now complete
    const buildingComplete = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const entities = game.world.query().with('building').executeEntities();

      const building = entities.find((e: any) => {
        const pos = e.getComponent('position');
        return pos.x === 100 && pos.y === 100;
      });

      if (building) {
        const buildingComp = building.getComponent('building');
        return {
          progress: buildingComp.progress,
          isComplete: buildingComp.isComplete,
          buildingType: buildingComp.buildingType
        };
      }
      return null;
    });

    expect(buildingComplete).not.toBeNull();
    expect(buildingComplete?.progress).toBe(100);
    expect(buildingComplete?.isComplete).toBe(true);
    expect(buildingComplete?.buildingType).toBe('tent');

    // Take screenshot of completed building
    await page.screenshot({ path: 'test-results/construction-completed.png' });
  });

  test('building:complete event should be emitted on completion', async ({ page }) => {
    test.fail(); // TDD red phase

    // Set up event listener
    await page.evaluate(() => {
      // @ts-ignore
      window.buildingCompleteEvents = [];

      // @ts-ignore
      const game = window.game;
      const eventBus = game.world.getEventBus();

      eventBus.subscribe('building:complete', (event: any) => {
        // @ts-ignore
        window.buildingCompleteEvents.push(event);
      });
    });

    // Create construction site at 99%
    await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const world = game.world;

      const entity = world.createEntity();
      entity.addComponent('building', {
        type: 'building',
        version: 1,
        buildingType: 'campfire',
        tier: 1,
        progress: 99,
        isComplete: false,
        blocksMovement: false,
        providesWarmth: true,
        providesShelter: false,
        storageCapacity: 0,
        providesHeat: true,
        heatRadius: 3,
        heatAmount: 10,
        insulation: 0,
        baseTemperature: 0,
        weatherProtection: 0,
        interior: false,
        interiorRadius: 0,
      });
      entity.addComponent('position', { type: 'position', version: 1, x: 150, y: 150, z: 0 });
    });

    // Wait for completion
    await page.waitForTimeout(3000);

    // Check event was emitted
    const events = await page.evaluate(() => {
      // @ts-ignore
      return window.buildingCompleteEvents;
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({
      type: 'building:complete',
      buildingType: 'campfire',
    });
    expect(events[0].entityId).toBeDefined();
    expect(events[0].timestamp).toBeDefined();
  });

  test('construction should fail gracefully on invalid terrain', async ({ page }) => {
    test.fail(); // TDD red phase

    // Attempt to build on water (forbidden terrain)
    const errorThrown = await page.evaluate(async () => {
      try {
        // @ts-ignore
        const game = window.game;
        const world = game.world;

        // Position on water tile
        const position = { x: 500, y: 500 }; // Assume this is water
        const inventory = { cloth: 10, wood: 5 };

        world.initiateConstruction(position, 'tent', inventory);
        return false; // Should have thrown
      } catch (error: any) {
        return error.message.includes('water') || error.message.includes('terrain');
      }
    });

    expect(errorThrown).toBe(true);
  });

  test('construction should fail when insufficient resources', async ({ page }) => {
    test.fail(); // TDD red phase

    const errorThrown = await page.evaluate(async () => {
      try {
        // @ts-ignore
        const game = window.game;
        const world = game.world;

        const position = { x: 100, y: 100 };
        const inventory = { cloth: 5, wood: 2 }; // Insufficient for tent (needs 10 cloth + 5 wood)

        world.initiateConstruction(position, 'tent', inventory);
        return false; // Should have thrown
      } catch (error: any) {
        return error.message.includes('not enough') || error.message.includes('insufficient');
      }
    });

    expect(errorThrown).toBe(true);
  });

  test('resources should be deducted after successful construction initiation', async ({ page }) => {
    test.fail(); // TDD red phase

    const result = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const world = game.world;

      const position = { x: 100, y: 100 };
      const inventory = { cloth: 15, wood: 10 };

      // Record initial amounts
      const initialCloth = inventory.cloth;
      const initialWood = inventory.wood;

      world.initiateConstruction(position, 'tent', inventory); // 10 cloth + 5 wood

      return {
        initialCloth,
        initialWood,
        finalCloth: inventory.cloth,
        finalWood: inventory.wood,
      };
    });

    expect(result.finalCloth).toBe(result.initialCloth - 10);
    expect(result.finalWood).toBe(result.initialWood - 5);
  });

  test('construction site should have ghost/partial visual appearance', async ({ page }) => {
    test.fail(); // TDD red phase

    await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const world = game.world;

      const entity = world.createEntity();
      entity.addComponent('building', {
        type: 'building',
        version: 1,
        buildingType: 'workbench',
        tier: 1,
        progress: 50,
        isComplete: false,
        blocksMovement: true,
        providesWarmth: false,
        providesShelter: false,
        storageCapacity: 0,
        providesHeat: false,
        heatRadius: 0,
        heatAmount: 0,
        insulation: 0,
        baseTemperature: 0,
        weatherProtection: 0,
        interior: false,
        interiorRadius: 0,
      });
      entity.addComponent('position', { type: 'position', version: 1, x: 200, y: 200, z: 0 });
      entity.addComponent('renderable', {
        type: 'renderable',
        version: 1,
        sprite: 'workbench_construction',
        opacity: 0.5, // Ghost appearance
        color: '#888888',
      });
    });

    await page.screenshot({ path: 'test-results/construction-ghost-visual.png' });

    const hasGhostAppearance = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const entities = game.world.query().with('building').with('renderable').executeEntities();

      const constructionSite = entities.find((e: any) => {
        const building = e.getComponent('building');
        return building.progress === 50;
      });

      if (constructionSite) {
        const renderable = constructionSite.getComponent('renderable');
        return renderable.opacity < 1.0;
      }
      return false;
    });

    expect(hasGhostAppearance).toBe(true);
  });

  test('multiple constructions should progress independently', async ({ page }) => {
    test.fail(); // TDD red phase

    // Create 3 different construction sites
    await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const world = game.world;

      // Tent at (100, 100)
      const tent = world.createEntity();
      tent.addComponent('building', {
        type: 'building',
        version: 1,
        buildingType: 'tent',
        tier: 1,
        progress: 0,
        isComplete: false,
        blocksMovement: true,
        providesWarmth: false,
        providesShelter: true,
        storageCapacity: 0,
        providesHeat: false,
        heatRadius: 0,
        heatAmount: 0,
        insulation: 0.5,
        baseTemperature: 8,
        weatherProtection: 0.7,
        interior: true,
        interiorRadius: 2,
      });
      tent.addComponent('position', { type: 'position', version: 1, x: 100, y: 100, z: 0 });

      // Workbench at (200, 100)
      const workbench = world.createEntity();
      workbench.addComponent('building', {
        type: 'building',
        version: 1,
        buildingType: 'workbench',
        tier: 1,
        progress: 0,
        isComplete: false,
        blocksMovement: true,
        providesWarmth: false,
        providesShelter: false,
        storageCapacity: 0,
        providesHeat: false,
        heatRadius: 0,
        heatAmount: 0,
        insulation: 0,
        baseTemperature: 0,
        weatherProtection: 0,
        interior: false,
        interiorRadius: 0,
      });
      workbench.addComponent('position', { type: 'position', version: 1, x: 200, y: 100, z: 0 });

      // Campfire at (300, 100)
      const campfire = world.createEntity();
      campfire.addComponent('building', {
        type: 'building',
        version: 1,
        buildingType: 'campfire',
        tier: 1,
        progress: 0,
        isComplete: false,
        blocksMovement: false,
        providesWarmth: true,
        providesShelter: false,
        storageCapacity: 0,
        providesHeat: true,
        heatRadius: 3,
        heatAmount: 10,
        insulation: 0,
        baseTemperature: 0,
        weatherProtection: 0,
        interior: false,
        interiorRadius: 0,
      });
      campfire.addComponent('position', { type: 'position', version: 1, x: 300, y: 100, z: 0 });
    });

    // Wait for some time
    await page.waitForTimeout(2000);

    // Check all have progressed
    const progressValues = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const entities = game.world.query().with('building').executeEntities();

      return entities
        .filter((e: any) => {
          const building = e.getComponent('building');
          return building.progress < 100;
        })
        .map((e: any) => {
          const building = e.getComponent('building');
          return {
            type: building.buildingType,
            progress: building.progress
          };
        });
    });

    expect(progressValues.length).toBe(3);
    expect(progressValues.every((p: any) => p.progress > 0)).toBe(true);
  });

  test('no console errors during construction flow', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Run full construction flow
    await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      const world = game.world;

      const position = { x: 100, y: 100 };
      const inventory = { cloth: 10, wood: 5 };

      try {
        world.initiateConstruction(position, 'tent', inventory);
      } catch (e) {
        // Expected to fail in red phase
      }
    });

    await page.waitForTimeout(1000);

    // Filter out expected TDD errors
    const unexpectedErrors = errors.filter(e =>
      !e.includes('not implemented') &&
      !e.includes('TDD red phase')
    );

    expect(unexpectedErrors).toEqual([]);
  });
});
