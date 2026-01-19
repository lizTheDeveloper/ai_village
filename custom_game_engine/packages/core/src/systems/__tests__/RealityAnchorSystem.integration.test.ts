import { describe, it, expect, vi } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { RealityAnchorSystem } from '../RealityAnchorSystem.js';
import { PowerGridSystem } from '../PowerGridSystem.js';
import { createRealityAnchor } from '../../components/RealityAnchorComponent.js';
import { createPowerProducer, createPowerConsumer } from '../../components/PowerComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

/**
 * Integration tests for RealityAnchorSystem power consumption
 *
 * These tests actually RUN the systems to verify Reality Anchor power mechanics work correctly.
 * Unit tests verify calculations, integration tests verify actual system behavior.
 */

describe('RealityAnchorSystem Integration', () => {
  it('should charge Reality Anchor when sufficient power is available', () => {
    // Create world with EventBus
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    // Create Reality Anchor in charging state
    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'charging';
    anchorComp.powerLevel = 0.0;
    anchor.addComponent(anchorComp);

    // Add PowerComponent with 5 GW consumption (charging rate)
    const anchorPower = createPowerConsumer('electrical', 5_000_000);
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    // Create generator with 10 GW output (surplus)
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    generator.addComponent(createPowerProducer('electrical', 10_000_000));
    world.addEntity(generator);

    // Create systems
    const powerGridSystem = new PowerGridSystem();
    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    // Run power grid first to establish power state
    const powerEntities = [generator, anchor];
    powerGridSystem.update(world, powerEntities, 1);

    // Verify anchor is powered
    expect(anchorPower.isPowered).toBe(true);

    // Simulate 20 ticks (1 second at 20 TPS)
    for (let i = 0; i < 20; i++) {
      world.advanceTick();
      realityAnchorSystem.update(world);
    }

    // Verify power level increased (charging happened)
    expect(anchorComp.powerLevel).toBeGreaterThan(0);
  });

  it('should NOT charge Reality Anchor when insufficient power', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    // Reality Anchor needs 5 GW
    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'charging';
    anchorComp.powerLevel = 0.0;
    anchor.addComponent(anchorComp);

    const anchorPower = createPowerConsumer('electrical', 5_000_000);
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    // Generator with only 1 GW (insufficient)
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    generator.addComponent(createPowerProducer('electrical', 1_000_000));
    world.addEntity(generator);

    const powerGridSystem = new PowerGridSystem();
    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    // Run power grid
    const powerEntities = [generator, anchor];
    powerGridSystem.update(world, powerEntities, 1);

    // Verify anchor is NOT powered
    expect(anchorPower.isPowered).toBe(false);

    const initialPowerLevel = anchorComp.powerLevel;

    // Simulate 20 ticks
    for (let i = 0; i < 20; i++) {
      world.advanceTick();
      realityAnchorSystem.update(world);
    }

    // Verify power level did NOT increase (no charging)
    expect(anchorComp.powerLevel).toBe(initialPowerLevel);
  });

  it('should maintain active field when sufficient power (50 GW)', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    // Reality Anchor with active field
    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'active';
    anchorComp.powerLevel = 1.0;
    anchor.addComponent(anchorComp);

    // PowerComponent with 50 GW consumption (active field rate)
    const anchorPower = createPowerConsumer('electrical', 50_000_000);
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    // Generator with 100 GW (surplus)
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    generator.addComponent(createPowerProducer('electrical', 100_000_000));
    world.addEntity(generator);

    const powerGridSystem = new PowerGridSystem();
    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    // Run power grid
    const powerEntities = [generator, anchor];
    powerGridSystem.update(world, powerEntities, 1);

    expect(anchorPower.isPowered).toBe(true);

    // Simulate 20 ticks
    world.setTick(20);
    realityAnchorSystem.update(world);

    // Verify field remains active
    expect(anchorComp.status).toBe('active');
  });

  it('should collapse field when power fails during active state', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    // Reality Anchor with active field
    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'active';
    anchorComp.powerLevel = 1.0;
    anchor.addComponent(anchorComp);

    // PowerComponent - will be unpowered
    const anchorPower = createPowerConsumer('electrical', 50_000_000);
    anchorPower.isPowered = false; // No power
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    // Run system
    world.setTick(20);
    realityAnchorSystem.update(world);

    // Verify field collapsed
    expect(anchorComp.status).toBe('failed');
  });

  it('should emit reality_anchor:power_loss event when power fails', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    // Setup event listener
    const eventSpy = vi.fn();
    eventBus.on('reality_anchor:power_loss', eventSpy);

    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'active';
    anchorComp.powerLevel = 1.0;
    anchor.addComponent(anchorComp);

    const anchorPower = createPowerConsumer('electrical', 50_000_000);
    anchorPower.isPowered = false; // Power lost
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    world.setTick(20);
    realityAnchorSystem.update(world);
    eventBus.flush();

    // Verify event emitted
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reality_anchor:power_loss',
        source: anchor.id,
      })
    );
  });

  it('should emit reality_anchor:field_collapse when field collapses', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    const eventSpy = vi.fn();
    eventBus.on('reality_anchor:field_collapse', eventSpy);

    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'active';
    anchorComp.powerLevel = 1.0;
    anchorComp.mortalizedGods.add('god_123'); // God in field
    anchor.addComponent(anchorComp);

    const anchorPower = createPowerConsumer('electrical', 50_000_000);
    anchorPower.isPowered = false;
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    world.setTick(20);
    realityAnchorSystem.update(world);

    // Verify field collapse event and gods released
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reality_anchor:field_collapse',
        source: anchor.id,
      })
    );
    expect(anchorComp.mortalizedGods.size).toBe(0);
  });

  it('should handle mid-battle power loss correctly', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    // Reality Anchor with god inside
    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'active';
    anchorComp.powerLevel = 1.0;
    anchorComp.mortalizedGods.add('supreme_creator_001');
    anchor.addComponent(anchorComp);

    const anchorPower = createPowerConsumer('electrical', 50_000_000);
    anchorPower.isPowered = true;
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    // Generator that will "fail"
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const generatorPower = createPowerProducer('electrical', 50_000_000);
    generator.addComponent(generatorPower);
    world.addEntity(generator);

    const powerGridSystem = new PowerGridSystem();
    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    // Initially powered
    let powerEntities = [generator, anchor];
    powerGridSystem.update(world, powerEntities, 1);
    expect(anchorPower.isPowered).toBe(true);

    // Simulate generator failure (destroyed by god's attack)
    generatorPower.efficiency = 0;

    // Re-run power grid
    powerEntities = [generator, anchor];
    powerGridSystem.update(world, powerEntities, 1);

    // Run Reality Anchor system
    world.setTick(20);
    realityAnchorSystem.update(world);

    // Verify field collapsed, god restored
    expect(anchorPower.isPowered).toBe(false);
    expect(anchorComp.status).toBe('failed');
    expect(anchorComp.mortalizedGods.size).toBe(0);
  });

  it('should handle Reality Anchor without power network gracefully', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    // Reality Anchor with no nearby generator
    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 0, y: 0 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'charging';
    anchorComp.powerLevel = 0.0;
    anchor.addComponent(anchorComp);

    const anchorPower = createPowerConsumer('electrical', 5_000_000);
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    // Generator far away at (1000, 1000)
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 1000, y: 1000 });
    generator.addComponent(createPowerProducer('electrical', 10_000_000));
    world.addEntity(generator);

    const powerGridSystem = new PowerGridSystem();
    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    // Run power grid
    const powerEntities = [generator, anchor];
    powerGridSystem.update(world, powerEntities, 1);

    // Verify separate networks, not powered
    expect(anchorPower.isPowered).toBe(false);

    world.setTick(20);
    realityAnchorSystem.update(world);

    // Should not charge
    expect(anchorComp.powerLevel).toBe(0);
  });

  it('should handle Reality Anchor without PowerComponent gracefully', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    // Reality Anchor without PowerComponent
    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'charging';
    anchor.addComponent(anchorComp);
    // No PowerComponent added!
    world.addEntity(anchor);

    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    // Should not crash
    world.setTick(20);
    expect(() => realityAnchorSystem.update(world)).not.toThrow();

    // Should not charge
    expect(anchorComp.powerLevel).toBe(0);
  });

  it('should emit charging_interrupted event when power lost mid-charge', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    const eventSpy = vi.fn();
    eventBus.on('reality_anchor:charging_interrupted', eventSpy);

    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'charging';
    anchorComp.powerLevel = 0.5; // Mid-charge
    anchor.addComponent(anchorComp);

    const anchorPower = createPowerConsumer('electrical', 5_000_000);
    anchorPower.isPowered = false; // Power just lost
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    world.setTick(20);
    realityAnchorSystem.update(world);

    // Verify event emitted
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reality_anchor:charging_interrupted',
        source: anchor.id,
      })
    );
  });

  it('should handle partial power scenarios correctly', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    const eventSpy = vi.fn();
    eventBus.on('reality_anchor:power_insufficient', eventSpy);

    const anchor = new EntityImpl(createEntityId(), 0);
    anchor.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    const anchorComp = createRealityAnchor();
    anchorComp.status = 'active';
    anchorComp.powerLevel = 1.0;
    anchor.addComponent(anchorComp);

    const anchorPower = createPowerConsumer('electrical', 50_000_000);
    anchor.addComponent(anchorPower);
    world.addEntity(anchor);

    // Generator with only 25 GW (50% of requirement)
    const generator = new EntityImpl(createEntityId(), 0);
    generator.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
    generator.addComponent(createPowerProducer('electrical', 25_000_000));
    world.addEntity(generator);

    const powerGridSystem = new PowerGridSystem();
    const realityAnchorSystem = new RealityAnchorSystem();
    realityAnchorSystem.initialize(world, eventBus);

    // Run power grid
    const powerEntities = [generator, anchor];
    powerGridSystem.update(world, powerEntities, 1);

    // Should have partial power
    expect(anchorPower.efficiency).toBe(0.5);

    world.setTick(20);
    realityAnchorSystem.update(world);

    // Verify partial power warning emitted
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reality_anchor:power_insufficient',
        source: anchor.id,
        data: expect.objectContaining({
          efficiency: 0.5,
        }),
      })
    );
  });
});
