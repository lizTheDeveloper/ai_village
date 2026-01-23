import { describe, it, expect } from 'vitest';
import { World } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { PowerGridSystem } from '../PowerGridSystem.js';
import { createPowerProducer, createPowerConsumer } from '../../components/PowerComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

/**
 * Integration tests for PowerGridSystem
 *
 * These tests actually RUN the system to verify power consumption works correctly.
 * Unit tests verify calculations, integration tests verify actual system behavior.
 */

describe('PowerGridSystem Integration', () => {
  it('should power consumer when generator produces sufficient power', () => {
    // Create world with EventBus
    const eventBus = new EventBusImpl();
    const world = new World(eventBus);

    // Create generator with 100 kW output
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    generator.addComponent(createPowerProducer('electrical', 100));
    world.addEntity(generator);

    // Create consumer with 50 kW consumption
    const consumer = new EntityImpl(createEntityId(), 0);
    consumer.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const consumerPower = createPowerConsumer('electrical', 50);
    consumer.addComponent(consumerPower);
    world.addEntity(consumer);

    // Run the system
    const powerGridSystem = new PowerGridSystem();
    const entities = [generator, consumer];
    powerGridSystem.update(world, entities, 1);

    // Verify consumer is powered
    expect(consumerPower.isPowered).toBe(true);
    expect(consumerPower.efficiency).toBe(1.0);
  });

  it('should NOT power consumer when generator produces insufficient power', () => {
    const eventBus = new EventBusImpl();
    const world = new World(eventBus);

    // Generator with only 50 kW
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    generator.addComponent(createPowerProducer('electrical', 50));
    world.addEntity(generator);

    // Consumer needs 100 kW
    const consumer = new EntityImpl(createEntityId(), 0);
    consumer.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const consumerPower = createPowerConsumer('electrical', 100);
    consumer.addComponent(consumerPower);
    world.addEntity(consumer);

    // Run the system
    const powerGridSystem = new PowerGridSystem();
    const entities = [generator, consumer];
    powerGridSystem.update(world, entities, 1);

    // Verify consumer is NOT powered
    expect(consumerPower.isPowered).toBe(false);
    expect(consumerPower.efficiency).toBe(0.5); // 50/100 = 0.5
  });

  it('should distribute power across multiple consumers correctly', () => {
    const eventBus = new EventBusImpl();
    const world = new World(eventBus);

    // Generator with 100 kW
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    generator.addComponent(createPowerProducer('electrical', 100));
    world.addEntity(generator);

    // Two consumers with 30 kW each (total 60 kW)
    const consumer1 = new EntityImpl(createEntityId(), 0);
    consumer1.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const consumer1Power = createPowerConsumer('electrical', 30);
    consumer1.addComponent(consumer1Power);
    world.addEntity(consumer1);

    const consumer2 = new EntityImpl(createEntityId(), 0);
    consumer2.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const consumer2Power = createPowerConsumer('electrical', 30);
    consumer2.addComponent(consumer2Power);
    world.addEntity(consumer2);

    // Run the system
    const powerGridSystem = new PowerGridSystem();
    const entities = [generator, consumer1, consumer2];
    powerGridSystem.update(world, entities, 1);

    // Verify both consumers are powered (60 kW < 100 kW)
    expect(consumer1Power.isPowered).toBe(true);
    expect(consumer2Power.isPowered).toBe(true);
  });

  it('should handle power network isolation correctly', () => {
    const eventBus = new EventBusImpl();
    const world = new World(eventBus);

    // Generator at (0, 0)
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 0, y: 0 });
    generator.addComponent(createPowerProducer('electrical', 100, 0)); // No connection range
    world.addEntity(generator);

    // Consumer far away at (100, 100)
    const consumer = new EntityImpl(createEntityId(), 0);
    consumer.addComponent({ type: 'position', version: 1, x: 100, y: 100 });
    const consumerPower = createPowerConsumer('electrical', 50);
    consumer.addComponent(consumerPower);
    world.addEntity(consumer);

    // Run the system
    const powerGridSystem = new PowerGridSystem();
    const entities = [generator, consumer];
    powerGridSystem.update(world, entities, 1);

    // Verify separate networks - consumer NOT powered
    expect(consumerPower.isPowered).toBe(false);
  });

  it('should connect generator to consumer via power pole', () => {
    const eventBus = new EventBusImpl();
    const world = new World(eventBus);

    // Generator at (0, 0)
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 0, y: 0 });
    generator.addComponent(createPowerProducer('electrical', 100));
    world.addEntity(generator);

    // Power pole at (0, 0) with 10-tile range
    const powerPole = new EntityImpl(createEntityId(), 0);
    powerPole.addComponent({ type: 'position', version: 1, x: 0, y: 0 });
    powerPole.addComponent({
      type: 'power',
      version: 1,
      role: 'consumer',
      powerType: 'electrical',
      generation: 0,
      consumption: 0,
      stored: 0,
      capacity: 0,
      isPowered: false,
      efficiency: 1.0,
      connectionRange: 10,
    });
    world.addEntity(powerPole);

    // Consumer at (5, 0) - within pole range
    const consumer = new EntityImpl(createEntityId(), 0);
    consumer.addComponent({ type: 'position', version: 1, x: 5, y: 0 });
    const consumerPower = createPowerConsumer('electrical', 50);
    consumer.addComponent(consumerPower);
    world.addEntity(consumer);

    // Run the system
    const powerGridSystem = new PowerGridSystem();
    const entities = [generator, powerPole, consumer];
    powerGridSystem.update(world, entities, 1);

    // Verify all in same network, consumer powered
    expect(consumerPower.isPowered).toBe(true);
  });

  it('should separate networks by power type', () => {
    const eventBus = new EventBusImpl();
    const world = new World(eventBus);

    // Electrical generator
    const electricalGen = new EntityImpl(createEntityId(), 0);
    electricalGen.addComponent({ type: 'position', version: 1, x: 0, y: 0 });
    electricalGen.addComponent(createPowerProducer('electrical', 100));
    world.addEntity(electricalGen);

    // Mechanical generator
    const mechanicalGen = new EntityImpl(createEntityId(), 0);
    mechanicalGen.addComponent({ type: 'position', version: 1, x: 0, y: 0 });
    mechanicalGen.addComponent(createPowerProducer('mechanical', 50));
    world.addEntity(mechanicalGen);

    // Run the system
    const powerGridSystem = new PowerGridSystem();
    const entities = [electricalGen, mechanicalGen];
    powerGridSystem.update(world, entities, 1);

    // Verify 2 separate networks
    const networks = powerGridSystem.getNetworks();
    expect(networks.length).toBe(2);
  });

  it('should update power state over multiple ticks', () => {
    const eventBus = new EventBusImpl();
    const world = new World(eventBus);

    // Generator with 100 kW
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const generatorPower = createPowerProducer('electrical', 100);
    generator.addComponent(generatorPower);
    world.addEntity(generator);

    // Consumer with 50 kW
    const consumer = new EntityImpl(createEntityId(), 0);
    consumer.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const consumerPower = createPowerConsumer('electrical', 50);
    consumer.addComponent(consumerPower);
    world.addEntity(consumer);

    const powerGridSystem = new PowerGridSystem();
    const entities = [generator, consumer];

    // Tick 1: Normal operation
    powerGridSystem.update(world, entities, 1);
    expect(consumerPower.isPowered).toBe(true);

    // Tick 2: Generator fails (efficiency = 0)
    generatorPower.efficiency = 0;
    powerGridSystem.update(world, entities, 1);
    expect(consumerPower.isPowered).toBe(false);

    // Tick 3: Generator restored
    generatorPower.efficiency = 1.0;
    powerGridSystem.update(world, entities, 1);
    expect(consumerPower.isPowered).toBe(true);
  });

  it('should handle zero consumption consumer gracefully', () => {
    const eventBus = new EventBusImpl();
    const world = new World(eventBus);

    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    generator.addComponent(createPowerProducer('electrical', 100));
    world.addEntity(generator);

    // Consumer with 0 kW consumption (e.g., idle machine)
    const consumer = new EntityImpl(createEntityId(), 0);
    consumer.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const consumerPower = createPowerConsumer('electrical', 0);
    consumer.addComponent(consumerPower);
    world.addEntity(consumer);

    const powerGridSystem = new PowerGridSystem();
    const entities = [generator, consumer];
    powerGridSystem.update(world, entities, 1);

    // Should be powered (0 kW is trivial to supply)
    expect(consumerPower.isPowered).toBe(true);
  });
});
