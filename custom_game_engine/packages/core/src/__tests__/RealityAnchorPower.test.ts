import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { RealityAnchorSystem } from '../systems/RealityAnchorSystem.js';
import { PowerGridSystem } from '../systems/PowerGridSystem.js';
import { EventBusImpl } from '../events/EventBus.js';
import { createRealityAnchor } from '../components/RealityAnchorComponent.js';
import { createPowerProducer, createPowerConsumer } from '../components/PowerComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { RealityAnchorComponent } from '../components/RealityAnchorComponent.js';
import type { PowerComponent } from '../components/PowerComponent.js';
import type { EntityImpl } from '../ecs/Entity.js';

describe('Reality Anchor Power Integration', () => {
  let world: WorldImpl;
  let realityAnchorSystem: RealityAnchorSystem;
  let powerGridSystem: PowerGridSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    realityAnchorSystem = new RealityAnchorSystem();
    powerGridSystem = new PowerGridSystem();
    realityAnchorSystem.initialize(world, eventBus);
  });

  describe('Criterion 4: Reality Anchor Charging Consumes Power', () => {
    it('should drain 5,000,000 kW during charging phase', () => {
      // Arrange: Create Reality Anchor with PowerComponent for charging
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'charging';
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      // Add PowerComponent with 5 GW consumption (charging rate)
      const anchorPower = createPowerConsumer('electrical', 5_000_000);
      // @ts-expect-error - priority field doesn't exist yet
      anchorPower.priority = 'critical';
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Create generator with 5 GW output
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      (generator as EntityImpl).addComponent(CT.Power, createPowerProducer('electrical', 5_000_000));

      // Act: Run power grid system
      const powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      // Assert: Network should show 5 GW generation and consumption
      const networks = powerGridSystem.getNetworks();
      expect(networks[0].totalGeneration).toBe(5_000_000);
      expect(networks[0].totalConsumption).toBe(5_000_000);
      expect(networks[0].availability).toBe(1.0); // Exact match
      expect(anchorPower.isPowered).toBe(true);
    });

    it('should NOT charge when isPowered=false (insufficient power)', () => {
      // Arrange: Reality Anchor with insufficient power
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'charging';
      anchorComp.powerLevel = 0.0;
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      // Add PowerComponent with 5 GW consumption
      const anchorPower = createPowerConsumer('electrical', 5_000_000);
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Create generator with only 1 GW output (insufficient)
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      (generator as EntityImpl).addComponent(CT.Power, createPowerProducer('electrical', 1_000_000));

      // Act: Run power grid system, then Reality Anchor system
      const powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      const initialPowerLevel = anchorComp.powerLevel;

      // Simulate 20 ticks (1 second at 20 TPS)
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
        realityAnchorSystem.update(world);
      }

      // Assert: Power level should NOT increase (charging halted)
      // This test will FAIL until RealityAnchorSystem checks isPowered at line 80
      expect(anchorPower.isPowered).toBe(false);
      expect(anchorComp.powerLevel).toBe(initialPowerLevel); // Should not have charged
    });

    it('should charge normally when isPowered=true', () => {
      // Arrange: Reality Anchor with sufficient power
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'charging';
      anchorComp.powerLevel = 0.0;
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      // Add PowerComponent with 5 GW consumption
      const anchorPower = createPowerConsumer('electrical', 5_000_000);
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Create generator with 10 GW output (surplus)
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      (generator as EntityImpl).addComponent(CT.Power, createPowerProducer('electrical', 10_000_000));

      // Act: Run power grid system, then Reality Anchor system
      const powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      expect(anchorPower.isPowered).toBe(true);

      // Simulate 20 ticks (1 second at 20 TPS)
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
        realityAnchorSystem.update(world);
      }

      // Assert: Power level should have increased
      expect(anchorComp.powerLevel).toBeGreaterThan(0);
    });

    it('should emit event when charging interrupted by power loss', () => {
      // Arrange: Setup event listener
      const eventSpy = vi.fn();
      eventBus.on('reality_anchor:charging_interrupted', eventSpy);

      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'charging';
      anchorComp.powerLevel = 0.5; // Mid-charge
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 5_000_000);
      anchorPower.isPowered = false; // Power just lost
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Act: Run Reality Anchor system
      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      realityAnchorSystem.update(world);

      // Assert: Event should be emitted
      // This test will FAIL until RealityAnchorSystem emits this event
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reality_anchor:charging_interrupted',
          source: anchor.id,
        })
      );
    });
  });

  describe('Criterion 5: Reality Anchor Active Field Consumes Power', () => {
    it('should drain 50,000,000 kW when field is active', () => {
      // Arrange: Reality Anchor with active field
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'active';
      anchorComp.powerLevel = 1.0;
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      // Add PowerComponent with 50 GW consumption (active field rate)
      const anchorPower = createPowerConsumer('electrical', 50_000_000);
      // @ts-expect-error - priority field doesn't exist yet
      anchorPower.priority = 'critical';
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Create generator with 50 GW output
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      (generator as EntityImpl).addComponent(CT.Power, createPowerProducer('electrical', 50_000_000));

      // Act: Run power grid system
      const powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      // Assert: Network should show 50 GW generation and consumption
      const networks = powerGridSystem.getNetworks();
      expect(networks[0].totalGeneration).toBe(50_000_000);
      expect(networks[0].totalConsumption).toBe(50_000_000);
      expect(anchorPower.isPowered).toBe(true);
    });

    it('should collapse field when isPowered=false during active state', () => {
      // Arrange: Reality Anchor with active field but no power
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'active';
      anchorComp.powerLevel = 1.0;
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      // Add PowerComponent with insufficient power
      const anchorPower = createPowerConsumer('electrical', 50_000_000);
      anchorPower.isPowered = false; // No power available
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Act: Run Reality Anchor system
      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      realityAnchorSystem.update(world);

      // Assert: Field should collapse
      // This test will FAIL until RealityAnchorSystem checks isPowered at line 119
      expect(anchorComp.status).toBe('failed'); // Or 'inactive'
    });

    it('should emit reality_anchor:power_loss event when power fails during active field', () => {
      // Arrange: Setup event listener
      const eventSpy = vi.fn();
      eventBus.on('reality_anchor:power_loss', eventSpy);

      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'active';
      anchorComp.powerLevel = 1.0;
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 50_000_000);
      anchorPower.isPowered = false; // Power lost
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Act: Run Reality Anchor system
      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      realityAnchorSystem.update(world);

      // Assert: Event should be emitted
      // This test will FAIL until RealityAnchorSystem emits this event
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reality_anchor:power_loss',
          source: anchor.id,
        })
      );
    });

    it('should emit reality_anchor:field_collapse event when field collapses from power loss', () => {
      // Arrange: Setup event listener
      const eventSpy = vi.fn();
      eventBus.on('reality_anchor:field_collapse', eventSpy);

      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'active';
      anchorComp.powerLevel = 1.0;
      anchorComp.mortalizedGods.add('god_123'); // God in field
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 50_000_000);
      anchorPower.isPowered = false;
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Act: Run Reality Anchor system
      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      realityAnchorSystem.update(world);

      // Assert: Field collapse event emitted, gods restored
      // This test will FAIL until RealityAnchorSystem emits this event
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reality_anchor:field_collapse',
          source: anchor.id,
        })
      );
      expect(anchorComp.mortalizedGods.size).toBe(0); // Gods should be released
    });

    it('should maintain field when power is sufficient', () => {
      // Arrange: Reality Anchor with active field and sufficient power
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'active';
      anchorComp.powerLevel = 1.0;
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 50_000_000);
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Create generator with 100 GW output (surplus)
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      (generator as EntityImpl).addComponent(CT.Power, createPowerProducer('electrical', 100_000_000));

      // Act: Run power grid system, then Reality Anchor system
      const powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      realityAnchorSystem.update(world);

      // Assert: Field should remain active
      expect(anchorPower.isPowered).toBe(true);
      expect(anchorComp.status).toBe('active');
    });
  });

  describe('Criterion 6: Priority System for Reality Anchor', () => {
    it.skip('should power Reality Anchor before normal consumers during shortage', () => {
      // Arrange: Generator with 50 GW, Reality Anchor (50 GW critical), normal consumer (10 GW)
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      (generator as EntityImpl).addComponent(CT.Power, createPowerProducer('electrical', 50_000_000));

      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'active';
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 50_000_000);
      // @ts-expect-error - priority field doesn't exist yet
      anchorPower.priority = 'critical';
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      const normalConsumer = world.createEntity();
      (normalConsumer as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const normalPower = createPowerConsumer('electrical', 10_000_000);
      // @ts-expect-error - priority field doesn't exist yet
      normalPower.priority = 'normal';
      (normalConsumer as EntityImpl).addComponent(CT.Power, normalPower);

      // Act: Run power grid system
      const powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      // Assert: Reality Anchor should get full power, normal consumer should brown out
      expect(anchorPower.isPowered).toBe(true);
      expect(anchorPower.efficiency).toBe(1.0);
      expect(normalPower.isPowered).toBe(false);
    });
  });

  describe('Power Network Isolation Edge Cases', () => {
    it('should fail gracefully when Reality Anchor has no power network connection', () => {
      // Arrange: Reality Anchor with no nearby generator or power pole
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 0, y: 0 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'charging';
      anchorComp.powerLevel = 0.0;
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 5_000_000);
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Generator far away at (1000, 1000)
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 1000, y: 1000 });
      (generator as EntityImpl).addComponent(CT.Power, createPowerProducer('electrical', 10_000_000));

      // Act: Run power grid system, then Reality Anchor system
      const powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      realityAnchorSystem.update(world);

      // Assert: Should have 2 separate networks, anchor not powered, not charging
      const networks = powerGridSystem.getNetworks();
      expect(networks.length).toBe(2);
      expect(anchorPower.isPowered).toBe(false);
      expect(anchorComp.powerLevel).toBe(0); // Should not have charged
    });

    it('should handle Reality Anchor with wrong power type gracefully', () => {
      // Arrange: Reality Anchor expecting electrical, but only mechanical generator available
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'charging';
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 5_000_000);
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Mechanical generator (incompatible)
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      (generator as EntityImpl).addComponent(CT.Power, createPowerProducer('mechanical', 10_000_000));

      // Act: Run power grid system
      const powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      // Assert: Separate networks, anchor not powered
      const networks = powerGridSystem.getNetworks();
      expect(networks.length).toBe(2);
      expect(anchorPower.isPowered).toBe(false);
    });
  });

  describe('Partial Power Scenarios', () => {
    it('should emit reality_anchor:power_insufficient when receiving 25-50% power', () => {
      // Arrange: Setup event listener
      const eventSpy = vi.fn();
      eventBus.on('reality_anchor:power_insufficient', eventSpy);

      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'active';
      anchorComp.powerLevel = 1.0;
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 50_000_000);
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Generator with only 25 GW (50% of requirement)
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      (generator as EntityImpl).addComponent(CT.Power, createPowerProducer('electrical', 25_000_000));

      // Act: Run power grid system, then Reality Anchor system
      const powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      realityAnchorSystem.update(world);

      // Assert: Partial power warning emitted
      // This test will FAIL until RealityAnchorSystem checks efficiency and emits warnings
      expect(anchorPower.efficiency).toBe(0.5);
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

  describe('Mid-Battle Power Loss Scenario', () => {
    it('should restore god divinity when field collapses from power loss', () => {
      // Arrange: Reality Anchor with god inside field
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'active';
      anchorComp.powerLevel = 1.0;
      anchorComp.mortalizedGods.add('supreme_creator_001');
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 50_000_000);
      anchorPower.isPowered = true;
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Generator that will "fail" mid-battle
      const generator = world.createEntity();
      (generator as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const generatorPower = createPowerProducer('electrical', 50_000_000);
      (generator as EntityImpl).addComponent(CT.Power, generatorPower);

      // Initially powered
      let powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);
      expect(anchorPower.isPowered).toBe(true);

      // Act: Simulate generator failure (e.g., destroyed by god's attack)
      generatorPower.efficiency = 0; // Generator destroyed/offline

      // Re-run power grid system
      powerEntities = world.query().with(CT.Power).with(CT.Position).executeEntities();
      powerGridSystem.update(world, powerEntities, 1);

      // Run Reality Anchor system
      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      realityAnchorSystem.update(world);

      // Assert: Field collapsed, god restored to divinity
      expect(anchorPower.isPowered).toBe(false);
      expect(anchorComp.status).toBe('failed'); // Or 'inactive'
      expect(anchorComp.mortalizedGods.size).toBe(0); // God released
    });
  });

  describe('Error Handling', () => {
    it('should handle Reality Anchor without PowerComponent gracefully', () => {
      // Arrange: Reality Anchor without PowerComponent (invalid configuration)
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'charging';
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);
      // No PowerComponent added!

      // Act: Should not crash
      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      expect(() => realityAnchorSystem.update(world)).not.toThrow();

      // Assert: Should either:
      // 1. Not charge (safest)
      // 2. Log a warning
      // 3. Auto-add PowerComponent (helpful but complex)
      expect(anchorComp.powerLevel).toBe(0); // Should not charge without power component
    });

    it('should handle destroyed Reality Anchor gracefully', () => {
      // Arrange: Destroyed Reality Anchor
      const anchor = world.createEntity();
      (anchor as EntityImpl).addComponent(CT.Position, { type: 'position', version: 1, x: 50, y: 50 });
      const anchorComp = createRealityAnchor();
      anchorComp.status = 'destroyed';
      (anchor as EntityImpl).addComponent(CT.RealityAnchor, anchorComp);

      const anchorPower = createPowerConsumer('electrical', 5_000_000);
      (anchor as EntityImpl).addComponent(CT.Power, anchorPower);

      // Act: Should not attempt to charge or drain power
      // Advance world to tick 20
      for (let i = 0; i < 20; i++) {
        world.advanceTick();
      }
      realityAnchorSystem.update(world);

      // Assert: No changes to power level, no power consumption
      expect(anchorComp.powerLevel).toBe(0);
    });
  });
});
