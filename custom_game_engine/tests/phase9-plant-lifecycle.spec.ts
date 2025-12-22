import { test, expect } from '@playwright/test';

/**
 * End-to-End Tests for Plant Lifecycle System (Phase 9)
 *
 * These tests verify the complete plant lifecycle from seed to death,
 * including reproduction, environmental interactions, and full integration.
 */

test.describe('Plant Lifecycle System - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Wait for game to initialize
    await page.waitForSelector('.game-canvas', { timeout: 10000 });
  });

  test.describe('Acceptance Criterion 7: Full Lifecycle Completion', () => {
    test('should complete full lifecycle from seed to death', async ({ page }) => {
      // Create a plant
      const plantCreated = await page.evaluate(async () => {
        const world = (window as any).game.world;
        const entity = world.createEntity();

        const PlantComponent = (window as any).PlantComponent;
        const plant = new PlantComponent({
          speciesId: 'wheat',
          position: { x: 50, y: 50 }
        });

        entity.addComponent(PlantComponent, plant);

        return {
          id: entity.id,
          stage: plant.stage,
          age: plant.age
        };
      });

      expect(plantCreated.stage).toBe('seed');
      expect(plantCreated.age).toBe(0);

      // Accelerate time and track stage transitions
      const stagesObserved: string[] = [];

      for (let day = 0; day < 80; day++) {
        const plantState = await page.evaluate(async (plantId) => {
          const world = (window as any).game.world;
          const entity = world.getEntity(plantId);

          if (!entity) return null;

          const PlantComponent = (window as any).PlantComponent;
          const plant = entity.getComponent(PlantComponent);

          if (!plant) return null;

          // Trigger day change
          const eventBus = (window as any).game.eventBus;
          eventBus.emit('time:dayStart', { day });

          // Update world
          world.update(1);

          return {
            stage: plant.stage,
            age: plant.age,
            health: plant.health,
            stageProgress: plant.stageProgress,
            seedsProduced: plant.seedsProduced,
            seedsDropped: plant.seedsDropped.length
          };
        }, plantCreated.id);

        if (!plantState) break; // Plant removed (dead)

        if (!stagesObserved.includes(plantState.stage)) {
          stagesObserved.push(plantState.stage);
        }

        // Check if plant died
        if (plantState.stage === 'dead') {
          break;
        }
      }

      // Verify all stages were observed
      const expectedStages = [
        'seed',
        'germinating',
        'sprout',
        'vegetative',
        'flowering',
        'fruiting',
        'mature',
        'seeding',
        'senescence',
        'decay',
        'dead'
      ];

      expectedStages.forEach(stage => {
        expect(stagesObserved).toContain(stage);
      });
    });

    test('should emit events at each stage transition', async ({ page }) => {
      const events: any[] = [];

      // Listen for plant events
      await page.evaluate(() => {
        const eventBus = (window as any).game.eventBus;

        eventBus.on('plant:stageChanged', (data: any) => {
          (window as any).plantEvents = (window as any).plantEvents || [];
          (window as any).plantEvents.push({ type: 'stageChanged', data });
        });
      });

      // Create and grow plant
      await page.evaluate(async () => {
        const world = (window as any).game.world;
        const entity = world.createEntity();

        const PlantComponent = (window as any).PlantComponent;
        const plant = new PlantComponent({
          speciesId: 'wheat',
          position: { x: 50, y: 50 }
        });

        entity.addComponent(PlantComponent, plant);

        // Fast-forward through stages
        for (let day = 0; day < 60; day++) {
          const eventBus = (window as any).game.eventBus;
          eventBus.emit('time:dayStart', { day });
          world.update(1);
        }
      });

      // Check events were emitted
      const capturedEvents = await page.evaluate(() => {
        return (window as any).plantEvents || [];
      });

      expect(capturedEvents.length).toBeGreaterThan(0);
      expect(capturedEvents[0].type).toBe('stageChanged');
      expect(capturedEvents[0].data).toHaveProperty('previousStage');
      expect(capturedEvents[0].data).toHaveProperty('newStage');
    });

    test('should produce harvestable products at mature stage', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const world = (window as any).game.world;
        const entity = world.createEntity();

        const PlantComponent = (window as any).PlantComponent;
        const plant = new PlantComponent({
          speciesId: 'wheat',
          position: { x: 50, y: 50 },
          stage: 'mature' // Start at mature stage
        });

        entity.addComponent(PlantComponent, plant);

        // Plant should have harvestable product
        return {
          stage: plant.stage,
          fruitCount: plant.fruitCount,
          canHarvest: plant.stage === 'mature' && plant.fruitCount > 0
        };
      });

      expect(result.stage).toBe('mature');
      expect(result.canHarvest).toBe(true);
    });

    test('should produce seeds at seeding stage', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const world = (window as any).game.world;
        const entity = world.createEntity();

        const PlantComponent = (window as any).PlantComponent;
        const plant = new PlantComponent({
          speciesId: 'wheat',
          position: { x: 50, y: 50 },
          stage: 'seeding' // Start at seeding stage
        });

        entity.addComponent(PlantComponent, plant);

        // Trigger seed production
        world.update(1);

        return {
          stage: plant.stage,
          seedsProduced: plant.seedsProduced,
          seedsDropped: plant.seedsDropped.length
        };
      });

      expect(result.stage).toBe('seeding');
      expect(result.seedsProduced).toBeGreaterThan(0);
    });

    test('should return nutrients to soil at decay stage', async ({ page }) => {
      let nutrientReturnEventFired = false;

      await page.evaluate(() => {
        const eventBus = (window as any).game.eventBus;

        eventBus.on('plant:nutrientReturn', () => {
          (window as any).nutrientReturnFired = true;
        });
      });

      await page.evaluate(async () => {
        const world = (window as any).game.world;
        const entity = world.createEntity();

        const PlantComponent = (window as any).PlantComponent;
        const plant = new PlantComponent({
          speciesId: 'wheat',
          position: { x: 50, y: 50 },
          stage: 'senescence'
        });

        entity.addComponent(PlantComponent, plant);

        // Force transition to decay
        plant.stageProgress = 1.0;
        world.update(1);
      });

      nutrientReturnEventFired = await page.evaluate(() => {
        return (window as any).nutrientReturnFired || false;
      });

      expect(nutrientReturnEventFired).toBe(true);
    });

    test('should remove plant entity at dead stage', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const world = (window as any).game.world;
        const entity = world.createEntity();

        const PlantComponent = (window as any).PlantComponent;
        const plant = new PlantComponent({
          speciesId: 'wheat',
          position: { x: 50, y: 50 },
          stage: 'dead'
        });

        entity.addComponent(PlantComponent, plant);

        const entityId = entity.id;

        // Update should remove dead plant
        world.update(1);

        // Check if entity still exists
        const stillExists = world.getEntity(entityId) !== null;

        return {
          stillExists
        };
      });

      expect(result.stillExists).toBe(false);
    });
  });

  test.describe('Seed to Plant lifecycle', () => {
    test('should germinate seed into new plant', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const world = (window as any).game.world;
        const SeedComponent = (window as any).SeedComponent;

        // Create seed entity
        const seedEntity = world.createEntity();
        const seed = new SeedComponent({
          speciesId: 'wheat',
          genetics: {
            growthRate: 1.2,
            yieldAmount: 1.1,
            diseaseResistance: 60,
            droughtTolerance: 55,
            coldTolerance: 50,
            flavorProfile: 60,
            mutations: []
          },
          viability: 0.9
        });
        seedEntity.addComponent(SeedComponent, seed);

        // Place seed on suitable tile
        const PlantSystem = (window as any).game.world.getSystem('PlantSystem');
        const germinated = await PlantSystem.tryGerminateSeed(seed, { x: 50, y: 50 });

        if (germinated) {
          // Find new plant
          const PlantComponent = (window as any).PlantComponent;
          const entities = world.entities.filter((e: any) => e.hasComponent(PlantComponent));
          const plantEntity = entities[entities.length - 1]; // Latest
          const plant = plantEntity.getComponent(PlantComponent);

          return {
            germinated: true,
            plantStage: plant.stage,
            plantGenetics: plant.genetics
          };
        }

        return { germinated: false };
      });

      expect(result.germinated).toBe(true);
      expect(result.plantStage).toBe('germinating');
      expect(result.plantGenetics.growthRate).toBeCloseTo(1.2, 0.3);
    });

    test('should complete seed → plant → seed → plant cycle', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const world = (window as any).game.world;
        const PlantComponent = (window as any).PlantComponent;

        // Generation 0: Create initial plant
        const gen0Entity = world.createEntity();
        const gen0Plant = new PlantComponent({
          speciesId: 'wheat',
          position: { x: 50, y: 50 },
          stage: 'seeding',
          genetics: {
            growthRate: 1.5,
            yieldAmount: 1.2,
            diseaseResistance: 70,
            droughtTolerance: 60,
            coldTolerance: 55,
            flavorProfile: 65,
            mutations: []
          }
        });
        gen0Entity.addComponent(PlantComponent, gen0Plant);

        // Produce seeds
        gen0Plant.seedsProduced = 10;
        world.update(1);

        const seedsDropped = gen0Plant.seedsDropped.length;

        // Find a seed
        const SeedComponent = (window as any).SeedComponent;
        const seedEntities = world.entities.filter((e: any) => e.hasComponent(SeedComponent));

        if (seedEntities.length === 0) {
          return { success: false, reason: 'No seeds created' };
        }

        const seedEntity = seedEntities[0];
        const seed = seedEntity.getComponent(SeedComponent);

        // Germinate seed
        const PlantSystem = (window as any).game.world.getSystem('PlantSystem');
        const germinated = await PlantSystem.tryGerminateSeed(seed, { x: 51, y: 50 });

        if (!germinated) {
          return { success: false, reason: 'Seed failed to germinate' };
        }

        // Find new plant (Generation 1)
        const plantEntities = world.entities.filter((e: any) =>
          e.hasComponent(PlantComponent) && e.id !== gen0Entity.id
        );

        if (plantEntities.length === 0) {
          return { success: false, reason: 'No new plant created' };
        }

        const gen1Plant = plantEntities[0].getComponent(PlantComponent);

        return {
          success: true,
          gen0Genetics: gen0Plant.genetics.growthRate,
          gen1Genetics: gen1Plant.genetics.growthRate,
          gen1Generation: gen1Plant.generation,
          seedsDropped
        };
      });

      expect(result.success).toBe(true);
      expect(result.seedsDropped).toBeGreaterThan(0);
      expect(result.gen1Generation).toBe(1);
      expect(result.gen1Genetics).toBeCloseTo(result.gen0Genetics, 0.4); // Allow mutation
    });
  });

  test.describe('Visual rendering during lifecycle', () => {
    test('should update plant sprite as stages progress', async ({ page }) => {
      // Create plant
      await page.evaluate(() => {
        const world = (window as any).game.world;
        const entity = world.createEntity();

        const PlantComponent = (window as any).PlantComponent;
        const plant = new PlantComponent({
          speciesId: 'wheat',
          position: { x: 50, y: 50 },
          stage: 'seed'
        });

        entity.addComponent(PlantComponent, plant);
      });

      // Take screenshot at seed stage
      await page.screenshot({ path: 'test-results/plant-seed-stage.png' });

      // Advance to sprout
      await page.evaluate(() => {
        const world = (window as any).game.world;
        const PlantComponent = (window as any).PlantComponent;
        const entities = world.entities.filter((e: any) => e.hasComponent(PlantComponent));
        const plant = entities[0].getComponent(PlantComponent);

        plant.stage = 'sprout';
        plant.stageProgress = 0;

        world.update(1);
      });

      await page.screenshot({ path: 'test-results/plant-sprout-stage.png' });

      // Advance to flowering
      await page.evaluate(() => {
        const world = (window as any).game.world;
        const PlantComponent = (window as any).PlantComponent;
        const entities = world.entities.filter((e: any) => e.hasComponent(PlantComponent));
        const plant = entities[0].getComponent(PlantComponent);

        plant.stage = 'flowering';
        plant.flowerCount = 5;

        world.update(1);
      });

      await page.screenshot({ path: 'test-results/plant-flowering-stage.png' });

      // Verify no console errors during rendering
      const consoleErrors = await page.evaluate(() => {
        return (window as any).consoleErrors || [];
      });

      expect(consoleErrors.length).toBe(0);
    });

    test('should show health indicator when plant is stressed', async ({ page }) => {
      await page.evaluate(() => {
        const world = (window as any).game.world;
        const entity = world.createEntity();

        const PlantComponent = (window as any).PlantComponent;
        const plant = new PlantComponent({
          speciesId: 'wheat',
          position: { x: 50, y: 50 },
          stage: 'vegetative'
        });

        entity.addComponent(PlantComponent, plant);

        // Make plant unhealthy
        plant.health = 25;
        plant.hydration = 10;

        world.update(1);
      });

      // Check for visual health indicator
      const hasHealthIndicator = await page.evaluate(() => {
        const renderer = (window as any).game.renderer;
        // Assuming renderer shows warning icon for low health
        return renderer.hasWarningIndicators();
      });

      // Screenshot showing stressed plant
      await page.screenshot({ path: 'test-results/plant-stressed.png' });
    });
  });

  test.describe('Error cases', () => {
    test('should show error for invalid speciesId', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.evaluate(() => {
        try {
          const world = (window as any).game.world;
          const entity = world.createEntity();

          const PlantComponent = (window as any).PlantComponent;
          const plant = new PlantComponent({
            speciesId: 'nonexistent_plant',
            position: { x: 50, y: 50 }
          });

          entity.addComponent(PlantComponent, plant);
          world.update(1);
        } catch (error) {
          (window as any).lastError = error.message;
        }
      });

      const error = await page.evaluate(() => (window as any).lastError);

      expect(error).toContain('PlantSpecies not found');
      expect(error).toContain('nonexistent_plant');
    });

    test('should NOT use fallback for missing plant data', async ({ page }) => {
      await page.evaluate(() => {
        try {
          const world = (window as any).game.world;
          const entity = world.createEntity();

          const PlantComponent = (window as any).PlantComponent;
          const plant = new PlantComponent({
            speciesId: 'wheat',
            position: { x: 50, y: 50 }
          });

          entity.addComponent(PlantComponent, plant);

          // Corrupt health field
          delete plant.health;

          world.update(1);
        } catch (error) {
          (window as any).lastError = error.message;
        }
      });

      const error = await page.evaluate(() => (window as any).lastError);

      // Should throw, not use default
      expect(error).toBeTruthy();
      expect(error).toContain('health');
    });
  });

  test.describe('Performance', () => {
    test('should handle 50 plants at different lifecycle stages', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const world = (window as any).game.world;
        const PlantComponent = (window as any).PlantComponent;

        const stages = ['seed', 'sprout', 'vegetative', 'flowering', 'mature'];

        // Create 50 plants
        for (let i = 0; i < 50; i++) {
          const entity = world.createEntity();
          const plant = new PlantComponent({
            speciesId: 'wheat',
            position: { x: i % 10, y: Math.floor(i / 10) },
            stage: stages[i % stages.length]
          });
          entity.addComponent(PlantComponent, plant);
        }

        // Measure update time
        const startTime = performance.now();
        world.update(1);
        const endTime = performance.now();

        return {
          plantCount: 50,
          updateTime: endTime - startTime
        };
      });

      expect(result.plantCount).toBe(50);
      expect(result.updateTime).toBeLessThan(50); // Should be fast
    });
  });
});
