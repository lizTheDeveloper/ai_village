import { test, expect } from '@playwright/test';

test.describe('Phase 10: Crafting Stations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Wait for game initialization
    await page.waitForFunction(() => {
      return (window as any).game !== undefined;
    }, { timeout: 10000 });
  });

  test.describe('Acceptance Criterion 1: Core Tier 2 Crafting Stations', () => {
    test('should display Forge in building menu with correct info', async ({ page }) => {
      // Open building menu
      await page.click('text=Buildings');

      // Filter to production category
      await page.click('text=Production');

      // Find Forge
      const forge = page.locator('text=Forge').first();
      await expect(forge).toBeVisible();

      // Verify costs displayed
      await expect(page.locator('text=40 Stone')).toBeVisible();
      await expect(page.locator('text=20 Iron')).toBeVisible();

      // Verify dimensions hint (2x3)
      await expect(page.locator('text=2x3')).toBeVisible();
    });

    test('should display Farm Shed in farming category', async ({ page }) => {
      await page.click('text=Buildings');
      await page.click('text=Farming');

      const farmShed = page.locator('text=Farm Shed').first();
      await expect(farmShed).toBeVisible();

      await expect(page.locator('text=30 Wood')).toBeVisible();
      await expect(page.locator('text=3x2')).toBeVisible();
    });

    test('should display Market Stall in commercial category', async ({ page }) => {
      await page.click('text=Buildings');
      await page.click('text=Commercial');

      const marketStall = page.locator('text=Market Stall').first();
      await expect(marketStall).toBeVisible();

      await expect(page.locator('text=25 Wood')).toBeVisible();
      await expect(page.locator('text=2x2')).toBeVisible();
    });

    test('should display Windmill in production category', async ({ page }) => {
      await page.click('text=Buildings');
      await page.click('text=Production');

      const windmill = page.locator('text=Windmill').first();
      await expect(windmill).toBeVisible();

      await expect(page.locator('text=40 Wood')).toBeVisible();
      await expect(page.locator('text=10 Stone')).toBeVisible();
      await expect(page.locator('text=2x2')).toBeVisible();
    });
  });

  test.describe('Acceptance Criterion 2: Crafting Functionality', () => {
    test('should place Forge with correct footprint', async ({ page }) => {
      // Open building menu and select Forge
      await page.click('text=Buildings');
      await page.click('text=Production');
      await page.click('text=Forge');

      // Move mouse over canvas to see ghost preview
      const canvas = page.locator('canvas').first();
      await canvas.hover({ position: { x: 400, y: 300 } });

      // Ghost preview should show 2x3 footprint
      await page.waitForTimeout(500);

      // Click to place
      await canvas.click({ position: { x: 400, y: 300 } });

      // Verify building placed (construction started)
      const consoleMessages: string[] = [];
      page.on('console', msg => consoleMessages.push(msg.text()));

      await page.waitForTimeout(1000);

      // Should see building:placed event or similar
      expect(consoleMessages.some(msg =>
        msg.includes('building') || msg.includes('Forge')
      )).toBeTruthy();
    });

    test('should show Forge unlocks metal recipes', async ({ page }) => {
      // Place and complete Forge (instant completion for test)
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;

        const entity = world.createEntity();
        entity.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        entity.addComponent('BuildingComponent', {
          blueprintId: 'forge',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: true,
          currentFuel: 50,
          maxFuel: 100,
          fuelConsumptionRate: 1
        });

        return entity.id;
      });

      // Click on Forge to open crafting panel
      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Should show crafting recipes
      await expect(page.locator('text=Iron Ingot')).toBeVisible();
      await expect(page.locator('text=Steel Sword')).toBeVisible();

      // Should NOT show non-metal recipes
      await expect(page.locator('text=Flour')).not.toBeVisible();
    });

    test('should display 50% speed bonus for Forge', async ({ page }) => {
      // Create Forge via console
      const entityId = await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;
        const registry = game.buildingRegistry;

        const blueprint = registry.getBlueprint('forge');
        expect(blueprint.functionality.speed).toBe(1.5);

        const entity = world.createEntity();
        entity.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        entity.addComponent('BuildingComponent', {
          blueprintId: 'forge',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: true,
          currentFuel: 50,
          maxFuel: 100,
          fuelConsumptionRate: 1
        });

        return entity.id;
      });

      // Click station to view bonuses
      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Bonus should be displayed
      await expect(page.locator('text=+50% metalworking speed')).toBeVisible();
    });
  });

  test.describe('Acceptance Criterion 3: Fuel System', () => {
    test('should display fuel gauge for Forge', async ({ page }) => {
      // Create Forge
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;

        const entity = world.createEntity();
        entity.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        entity.addComponent('BuildingComponent', {
          blueprintId: 'forge',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: true,
          currentFuel: 30,
          maxFuel: 100,
          fuelConsumptionRate: 1
        });

        return entity.id;
      });

      // Click to open station UI
      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Fuel gauge should be visible
      await expect(page.locator('text=Fuel:')).toBeVisible();
      await expect(page.locator('text=30/100')).toBeVisible();

      // Fuel bar element
      const fuelBar = page.locator('.fuel-gauge, [data-testid="fuel-gauge"]');
      await expect(fuelBar).toBeVisible();
    });

    test('should allow adding wood to increase fuel', async ({ page }) => {
      // Create Forge with low fuel
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;

        const entity = world.createEntity();
        entity.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        entity.addComponent('BuildingComponent', {
          blueprintId: 'forge',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: true,
          currentFuel: 10,
          maxFuel: 100,
          fuelConsumptionRate: 1
        });

        (window as any).testForgeEntity = entity.id;
      });

      // Open station UI
      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Click "Add Wood" button
      await page.click('button:has-text("Add Wood")');

      // Verify fuel increased by 10
      await expect(page.locator('text=20/100')).toBeVisible();
    });

    test('should allow adding coal to increase fuel by 30', async ({ page }) => {
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;

        const entity = world.createEntity();
        entity.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        entity.addComponent('BuildingComponent', {
          blueprintId: 'forge',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: true,
          currentFuel: 10,
          maxFuel: 100,
          fuelConsumptionRate: 1
        });

        (window as any).testForgeEntity = entity.id;
      });

      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      await page.click('button:has-text("Add Coal")');

      await expect(page.locator('text=40/100')).toBeVisible();
    });

    test('should prevent crafting when fuel is empty', async ({ page }) => {
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;

        const entity = world.createEntity();
        entity.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        entity.addComponent('BuildingComponent', {
          blueprintId: 'forge',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: true,
          currentFuel: 0,
          maxFuel: 100,
          fuelConsumptionRate: 1
        });

        (window as any).testForgeEntity = entity.id;
      });

      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Try to craft - should show error or disabled button
      const craftButton = page.locator('button:has-text("Craft")');
      await expect(craftButton).toBeDisabled();

      // Error message should appear
      await expect(page.locator('text=No fuel available')).toBeVisible();
    });

    test('should consume fuel over time during crafting', async ({ page }) => {
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;

        const entity = world.createEntity();
        entity.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        entity.addComponent('BuildingComponent', {
          blueprintId: 'forge',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: true,
          currentFuel: 50,
          maxFuel: 100,
          fuelConsumptionRate: 1,
          activeRecipe: 'iron_ingot'
        });

        (window as any).testForgeEntity = entity.id;
      });

      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Initial fuel
      await expect(page.locator('text=50/100')).toBeVisible();

      // Wait 2 seconds of game time
      await page.waitForTimeout(2000);

      // Fuel should have decreased (50 - 2 = 48)
      await expect(page.locator('text=48/100')).toBeVisible();
    });

    test('should NOT show fuel gauge for Farm Shed', async ({ page }) => {
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;

        const entity = world.createEntity();
        entity.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        entity.addComponent('BuildingComponent', {
          blueprintId: 'farm_shed',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: false
        });
      });

      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Fuel gauge should NOT be visible
      await expect(page.locator('text=Fuel:')).not.toBeVisible();
    });
  });

  test.describe('Acceptance Criterion 5: Tier 3+ Stations', () => {
    test('should display Workshop in building menu', async ({ page }) => {
      await page.click('text=Buildings');
      await page.click('text=Production');

      const workshop = page.locator('text=Workshop').first();
      await expect(workshop).toBeVisible();

      await expect(page.locator('text=60 Wood')).toBeVisible();
      await expect(page.locator('text=30 Iron')).toBeVisible();
      await expect(page.locator('text=3x4')).toBeVisible();
    });

    test('should display Barn in farming category', async ({ page }) => {
      await page.click('text=Buildings');
      await page.click('text=Farming');

      const barn = page.locator('text=Barn').first();
      await expect(barn).toBeVisible();

      await expect(page.locator('text=70 Wood')).toBeVisible();
      await expect(page.locator('text=4x3')).toBeVisible();
    });

    test('should show Workshop unlocks multiple recipe categories', async ({ page }) => {
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;
        const registry = game.buildingRegistry;

        const workshop = registry.getBlueprint('workshop');
        expect(workshop.functionality.recipes.length).toBeGreaterThan(5);
      });
    });
  });

  test.describe('Acceptance Criterion 6: Recipe Integration', () => {
    test('should filter recipes by station requirement', async ({ page }) => {
      // Create both Forge and Windmill
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;

        // Forge at (10, 10)
        const forge = world.createEntity();
        forge.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        forge.addComponent('BuildingComponent', {
          blueprintId: 'forge',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: true,
          currentFuel: 50,
          maxFuel: 100,
          fuelConsumptionRate: 1
        });

        // Windmill at (30, 10)
        const windmill = world.createEntity();
        windmill.addComponent('PositionComponent', { x: 30, y: 10, z: 0 });
        windmill.addComponent('BuildingComponent', {
          blueprintId: 'windmill',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: false
        });
      });

      // Click Forge
      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      // Should show metal recipes only
      await expect(page.locator('text=Iron Ingot')).toBeVisible();
      await expect(page.locator('text=Flour')).not.toBeVisible();

      // Close panel
      await page.keyboard.press('Escape');

      // Click Windmill
      await canvas.click({ position: { x: 300, y: 100 } });

      // Should show grain recipes only
      await expect(page.locator('text=Flour')).toBeVisible();
      await expect(page.locator('text=Iron Ingot')).not.toBeVisible();
    });

    test('should show recipe tooltip with station requirement', async ({ page }) => {
      await page.click('text=Crafting');

      // Hover over Iron Ingot recipe
      await page.hover('text=Iron Ingot');

      // Tooltip should appear
      const tooltip = page.locator('.recipe-tooltip, [data-testid="recipe-tooltip"]');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('Requires: Forge');
    });
  });

  test.describe('Error Handling', () => {
    test('should show error when trying to craft without station', async ({ page }) => {
      await page.click('text=Crafting');
      await page.click('text=Iron Ingot');

      // Try to craft without Forge
      await page.click('button:has-text("Craft")');

      // Error message
      await expect(page.locator('text=Requires a Forge')).toBeVisible();
    });

    test('should throw error in console when invalid blueprint accessed', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.evaluate(() => {
        const game = (window as any).game;
        const registry = game.buildingRegistry;

        try {
          registry.getBlueprint('nonexistent_station');
        } catch (e) {
          console.error(e.message);
        }
      });

      await page.waitForTimeout(500);

      expect(consoleErrors.some(err =>
        err.includes('blueprint not found')
      )).toBeTruthy();
    });

    test('should not allow building placement without resources', async ({ page }) => {
      // Clear player resources
      await page.evaluate(() => {
        const game = (window as any).game;
        // Reset inventory to 0
        if (game.playerInventory) {
          game.playerInventory.clear();
        }
      });

      await page.click('text=Buildings');
      await page.click('text=Production');
      await page.click('text=Forge');

      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 400, y: 300 } });

      // Should show insufficient resources error
      await expect(page.locator('text=Insufficient resources')).toBeVisible();
    });
  });

  test.describe('No Console Errors', () => {
    test('should not produce console errors during normal station operations', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Place Forge
      await page.evaluate(() => {
        const game = (window as any).game;
        const world = game.world;

        const entity = world.createEntity();
        entity.addComponent('PositionComponent', { x: 10, y: 10, z: 0 });
        entity.addComponent('BuildingComponent', {
          blueprintId: 'forge',
          constructionProgress: 100,
          isComplete: true,
          fuelRequired: true,
          currentFuel: 50,
          maxFuel: 100,
          fuelConsumptionRate: 1
        });
      });

      // Interact with station
      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 100, y: 100 } });

      await page.waitForTimeout(1000);

      expect(consoleErrors).toHaveLength(0);
    });
  });
});
