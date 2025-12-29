import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { AnimalComponent } from '../components/AnimalComponent.js';
import { AnimalProductionSystem } from '../systems/AnimalProductionSystem.js';
import { EventBusImpl } from '../events/EventBus.js';
import { ANIMAL_PRODUCTS } from '../data/animalProducts.js';

describe('Animal Production System', () => {
  let world: WorldImpl;
  let productionSystem: AnimalProductionSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl(); world = new WorldImpl(eventBus);
    
    productionSystem = new AnimalProductionSystem();
  });

  describe('Animal Product Definitions', () => {
    it('should have product definition for eggs', () => {
      const eggProduct = ANIMAL_PRODUCTS.egg;

      expect(eggProduct).toBeDefined();
      expect(eggProduct.productionType).toBe('periodic');
      expect(eggProduct.sourceSpecies).toContain('chicken');
    });

    it('should have product definition for milk', () => {
      const milkProduct = ANIMAL_PRODUCTS.milk;

      expect(milkProduct).toBeDefined();
      expect(milkProduct.productionType).toBe('continuous');
      expect(milkProduct.sourceSpecies).toContain('cow');
    });

    it('should have product definition for wool', () => {
      const woolProduct = ANIMAL_PRODUCTS.wool;

      expect(woolProduct).toBeDefined();
      expect(woolProduct.productionType).toBe('periodic');
      expect(woolProduct.sourceSpecies).toContain('sheep');
    });
  });

  describe('Acceptance Criterion 7: Animal Products - Periodic', () => {
    it('should produce eggs every 1 day when chicken is adult and healthy', () => {
      const eventHandler = vi.fn();
      eventBus.subscribe('product_ready', eventHandler);

      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'chicken-1',
        speciesId: 'chicken',
        name: 'Layer Hen',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.0,
        state: 'idle' as const,
        hunger: 20,
        thirst: 10,
        energy: 80,
        stress: 5,
        mood: 70,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 50,
        trustLevel: 60,
      });
      entity.addComponent(component);

      // Simulate time passing (1 day = 86400 seconds)
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 86400);

      // Flush event queue to dispatch queued events
      world.eventBus.flush();

      // Should have produced at least one egg
      expect(eventHandler).toHaveBeenCalled();
      const eventCall = eventHandler.mock.calls[0][0];
      expect(eventCall.data.productId).toBe('chicken_egg');
      expect(eventCall.data.animalId).toBe('chicken-1');
    });

    it('should produce quantity within min/max range', () => {
      const eventHandler = vi.fn();
      eventBus.subscribe('product_ready', eventHandler);

      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'chicken-2',
        speciesId: 'chicken',
        name: 'Productive Hen',
        position: { x: 0, y: 0 },
        age: 150,
        lifeStage: 'adult' as const,
        health: 100,
        size: 1.0,
        state: 'idle' as const,
        hunger: 10,
        thirst: 5,
        energy: 90,
        stress: 0,
        mood: 80,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 70,
        trustLevel: 75,
      });
      entity.addComponent(component);

      // Fast-forward to trigger production (1 day = 86400 seconds)
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 86400);

      // Flush event queue
      world.eventBus.flush();

      expect(eventHandler).toHaveBeenCalled();
      const eventCall = eventHandler.mock.calls[0][0];

      // Eggs typically 1 per day (we set minQuantity=1, maxQuantity=1)
      expect(eventCall.data.amount).toBe(1);
    });

    it('should not produce when animal health is below minimum', () => {
      const eventHandler = vi.fn();
      eventBus.subscribe('product_ready', eventHandler);

      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'chicken-3',
        speciesId: 'chicken',
        name: 'Sick Hen',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult' as const,
        health: 30, // Low health
        size: 1.0,
        state: 'idle' as const,
        hunger: 60,
        thirst: 50,
        energy: 40,
        stress: 60,
        mood: 30,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 50,
        trustLevel: 60,
      });
      entity.addComponent(component);

      // Fast-forward (1 day = 86400 seconds)
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 86400);

      // Should not produce due to low health
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should not produce when animal is not adult', () => {
      const eventHandler = vi.fn();
      eventBus.subscribe('product_ready', eventHandler);

      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'chicken-4',
        speciesId: 'chicken',
        name: 'Young Chick',
        position: { x: 0, y: 0 },
        age: 15,
        lifeStage: 'juvenile' as const, // Not adult
        health: 100,
        size: 0.6,
        state: 'idle' as const,
        hunger: 20,
        thirst: 10,
        energy: 90,
        stress: 5,
        mood: 70,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 40,
        trustLevel: 50,
      });
      entity.addComponent(component);

      // Fast-forward (1 day = 86400 seconds)
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 86400);

      // Juveniles don't produce
      expect(eventHandler).not.toHaveBeenCalled();
    });
  });

  describe('Acceptance Criterion 8: Animal Products - Continuous', () => {
    it('should produce milk when cow is milked with sufficient health', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'cow-1',
        speciesId: 'cow',
        name: 'Bessie',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 90,
        size: 2.0,
        state: 'idle' as const,
        hunger: 20,
        thirst: 15,
        energy: 80,
        stress: 5,
        mood: 70,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 60,
        trustLevel: 70,
      });
      entity.addComponent(component);

      // Initialize the system by calling update once
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 0);

      const result = productionSystem.collectProduct(entity.id, 'cow_milk');

      expect(result.success).toBe(true);
      expect(result.quantity).toBeGreaterThan(0);
      expect(result.quality).toBeDefined();
    });

    it('should have higher quality milk with higher health', () => {
      const healthyEntity = world.createEntity();
      const healthyComponent = new AnimalComponent({
        id: 'cow-2a',
        speciesId: 'cow',
        name: 'Healthy Cow',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 100, // Perfect health
        size: 2.0,
        state: 'idle' as const,
        hunger: 10,
        thirst: 5,
        energy: 90,
        stress: 0,
        mood: 80,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 70,
        trustLevel: 80,
      });
      healthyEntity.addComponent(healthyComponent);

      const unhealthyEntity = world.createEntity();
      const unhealthyComponent = new AnimalComponent({
        id: 'cow-2b',
        speciesId: 'cow',
        name: 'Unhealthy Cow',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 60, // Lower health
        size: 2.0,
        state: 'idle' as const,
        hunger: 40,
        thirst: 30,
        energy: 60,
        stress: 30,
        mood: 50,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 40,
        trustLevel: 50,
      });
      unhealthyEntity.addComponent(unhealthyComponent);

      // Initialize the system
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 0);

      const healthyResult = productionSystem.collectProduct(healthyEntity.id, 'cow_milk');
      const unhealthyResult = productionSystem.collectProduct(unhealthyEntity.id, 'cow_milk');

      expect(healthyResult.success).toBe(true);
      expect(unhealthyResult.success).toBe(true);
      expect(healthyResult.quality).toBeDefined();
      expect(unhealthyResult.quality).toBeDefined();
      expect(healthyResult.quality!).toBeGreaterThan(unhealthyResult.quality!);
    });

    it('should have higher quality milk with higher bond level', () => {
      const highBondEntity = world.createEntity();
      const highBondComponent = new AnimalComponent({
        id: 'cow-3a',
        speciesId: 'cow',
        name: 'Bonded Cow',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 90,
        size: 2.0,
        state: 'idle' as const,
        hunger: 20,
        thirst: 15,
        energy: 80,
        stress: 5,
        mood: 75,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 90, // High bond
        trustLevel: 95,
      });
      highBondEntity.addComponent(highBondComponent);

      const lowBondEntity = world.createEntity();
      const lowBondComponent = new AnimalComponent({
        id: 'cow-3b',
        speciesId: 'cow',
        name: 'New Cow',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 90,
        size: 2.0,
        state: 'idle' as const,
        hunger: 20,
        thirst: 15,
        energy: 80,
        stress: 5,
        mood: 60,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 30, // Low bond
        trustLevel: 40,
      });
      lowBondEntity.addComponent(lowBondComponent);

      // Initialize the system
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 0);

      const highBondResult = productionSystem.collectProduct(highBondEntity.id, 'cow_milk');
      const lowBondResult = productionSystem.collectProduct(lowBondEntity.id, 'cow_milk');

      expect(highBondResult.success).toBe(true);
      expect(lowBondResult.success).toBe(true);
      expect(highBondResult.quality).toBeDefined();
      expect(lowBondResult.quality).toBeDefined();
      expect(highBondResult.quality!).toBeGreaterThan(lowBondResult.quality!);
    });

    it('should fail to collect milk if animal is not owner', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'cow-4',
        speciesId: 'cow',
        name: 'Protected Cow',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 90,
        size: 2.0,
        state: 'idle' as const,
        hunger: 20,
        thirst: 15,
        energy: 80,
        stress: 5,
        mood: 70,
        wild: false,
        ownerId: 'agent-1', // Owned by agent-1
        bondLevel: 60,
        trustLevel: 70,
      });
      entity.addComponent(component);

      // Initialize the system
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 0);

      // Try to collect as a different agent (agent-2) - should fail because owned by agent-1
      const result = productionSystem.collectProduct(entity.id, 'cow_milk', 'agent-2');

      expect(result.success).toBe(false);
      expect(result.reason).toContain('owner');
    });

    it('should have cooldown period after milking', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'cow-5',
        speciesId: 'cow',
        name: 'Cooldown Cow',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 90,
        size: 2.0,
        state: 'idle' as const,
        hunger: 20,
        thirst: 15,
        energy: 80,
        stress: 5,
        mood: 70,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 60,
        trustLevel: 70,
      });
      entity.addComponent(component);

      // Initialize the system
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 0);

      // First collection should succeed
      const firstResult = productionSystem.collectProduct(entity.id, 'cow_milk');
      expect(firstResult.success).toBe(true);

      // Immediate second collection should fail (cooldown)
      const secondResult = productionSystem.collectProduct(entity.id, 'cow_milk');
      expect(secondResult.success).toBe(false);
    });
  });

  describe('Product Quality Factors', () => {
    it('should calculate quality based on health factor', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'quality-test-1',
        speciesId: 'cow',
        name: 'Quality Test',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.0,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 0,
        mood: 100,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 100,
        trustLevel: 100,
      });
      entity.addComponent(component);

      // Initialize the system
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 0);

      const result = productionSystem.collectProduct(entity.id, 'cow_milk');

      // Perfect health and bond with default diet/genetics should yield 75 quality
      // Formula: health(100)*0.3 + bond(100)*0.2 + diet(50)*0.3 + genetics(50)*0.2 = 0.75 * 100 = 75
      expect(result.quality).toBe(75);
    });

    it('should reduce quality when stress is high', () => {
      const entity = world.createEntity();
      const component = new AnimalComponent({
        id: 'quality-test-2',
        speciesId: 'cow',
        name: 'Stressed Cow',
        position: { x: 0, y: 0 },
        age: 500,
        lifeStage: 'adult' as const,
        health: 100,
        size: 2.0,
        state: 'idle' as const,
        hunger: 0,
        thirst: 0,
        energy: 100,
        stress: 80, // High stress
        mood: 40,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 50,
        trustLevel: 60,
      });
      entity.addComponent(component);

      // Initialize the system
      const entities = world.query().with('animal').executeEntities();
      productionSystem.update(world, entities, 0);

      const result = productionSystem.collectProduct(entity.id, 'cow_milk');

      // High stress should reduce quality
      expect(result.quality).toBeLessThan(70);
    });
  });

  describe('Error Handling', () => {
    it('should throw when processing animal with missing health field in update', () => {
      const entity = world.createEntity();
      const invalidAnimal = {
        id: 'invalid-chicken',
        speciesId: 'chicken',
        name: 'Invalid',
        position: { x: 0, y: 0 },
        age: 100,
        lifeStage: 'adult' as const,
        // health is missing - this violates CLAUDE.md
        size: 1.0,
        state: 'idle' as const,
        hunger: 20,
        thirst: 15,
        energy: 80,
        stress: 5,
        mood: 70,
        wild: false,
        ownerId: 'agent-1',
        bondLevel: 60,
        trustLevel: 70,
      };

      entity.components?.set('animal', invalidAnimal) || (() => { throw new Error('Invalid state'); })();

      // Should throw when update tries to process this invalid animal
      expect(() => {
        const entities = world.query().with('animal').executeEntities();
        productionSystem.update(world, entities, 86400);
      }).toThrow('missing required \'health\' field');
    });
  });
});
