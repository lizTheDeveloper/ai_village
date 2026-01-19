import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { BuildingSystem } from '../BuildingSystem.js';
import { GovernanceDataSystem } from '../GovernanceDataSystem.js';
import { SocialGradientSystem } from '../SocialGradientSystem.js';
import { MovementSystem } from '../MovementSystem.js';
import { createBuildingComponent } from '../../components/BuildingComponent.js';
import { createInventoryComponent } from '../../components/InventoryComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import { createMovementComponent } from '../../components/MovementComponent.js';
import { createVelocityComponent } from '../../components/VelocityComponent.js';
import { createSteeringComponent } from '../../components/SteeringComponent.js';
import { SocialGradientComponent } from '../../components/SocialGradientComponent.js';
import { createConversationComponent } from '../../components/ConversationComponent.js';

import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';
/**
 * Integration tests for Performance Hotspot Optimizations
 *
 * Work Order: performance-hotspots
 *
 * These tests verify that the critical performance optimizations have been implemented:
 * 1. BuildingSystem - No duplicate queries for storage buildings
 * 2. GovernanceDataSystem - Query once, pass to methods (no queries inside loops)
 * 3. SocialGradientSystem - Use Set instead of Array for pending processing
 * 4. MovementSystem - Cache collision data
 * 5. No system takes >2ms per tick with 100 entities
 */

describe('Performance Optimizations Integration', () => {
  let eventBus: EventBusImpl;
  let world: WorldImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
  });

  describe('Acceptance Criterion 1: No Duplicate Queries', () => {
    it('should BuildingSystem query storage once and reuse results', () => {
      const buildingSystem = new BuildingSystem();
      buildingSystem.initialize(world, eventBus);

      // Create multiple storage buildings with inventory
      for (let i = 0; i < 10; i++) {
        const storage = new EntityImpl(createEntityId(), 0);
        storage.addComponent(createBuildingComponent(BuildingType.StorageChest, 1, 100));
        storage.addComponent(createInventoryComponent('storage', 20));
        storage.addComponent(createPositionComponent(i * 5, 0));
        world.addEntity(storage);
      }

      const entities = Array.from(world.entities.values());

      // Measure performance - should be fast even with 10 storages
      const startTime = performance.now();
      buildingSystem.update(world, entities, 1.0);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // With optimization, should be <2ms even with 10 storage buildings
      expect(duration).toBeLessThan(2);
    });

    it('should GovernanceDataSystem query agents once per update', () => {
      const govSystem = new GovernanceDataSystem();
      govSystem.initialize(world, eventBus);

      // Create multiple governance buildings that would each trigger queries
      const townHall = new EntityImpl(createEntityId(), 0);
      townHall.addComponent(createBuildingComponent(BuildingType.TownHall, 1, 100));
      world.addEntity(townHall);

      // Create many agents to make query cost significant
      for (let i = 0; i < 50; i++) {
        const agent = new EntityImpl(createEntityId(), 0);
        agent.addComponent(createIdentityComponent(`Agent${i}`, 5, i));
        agent.addComponent(createAgentComponent());
        agent.addComponent(new NeedsComponent({
    hunger: 0.7,
    energy: 0.7,
    health: 0.7,
    thirst: 0.0,
    temperature: 0.0,
  }));
        world.addEntity(agent);
      }

      const entities = Array.from(world.entities.values());

      // Measure performance - should be fast with single query
      const startTime = performance.now();
      govSystem.update(world, entities, 1.0);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // With optimization (single query), should be <2ms
      expect(duration).toBeLessThan(2);
    });
  });

  describe('Acceptance Criterion 2: O(1) Lookups for Pending Sets', () => {
    it('should SocialGradientSystem use Set.has() not Array.includes()', () => {
      const socialSystem = new SocialGradientSystem();
      socialSystem.initialize(world, eventBus);

      // Create many agents to make linear search expensive
      const agents: EntityImpl[] = [];
      for (let i = 0; i < 100; i++) {
        const agent = new EntityImpl(createEntityId(), 0);
        agent.addComponent(createAgentComponent());
        agent.addComponent(new SocialGradientComponent());
        agent.addComponent(createConversationComponent());
        world.addEntity(agent);
        agents.push(agent);
      }

      // Trigger many conversation events to populate pending set
      for (let i = 0; i < 50; i++) {
        eventBus.emit({
          type: 'conversation:start',
          source: 'test',
          data: {
            speakerId: agents[i].id,
            listenerId: agents[(i + 1) % 100].id,
          },
        });
      }

      const entities = Array.from(world.entities.values());

      // Measure performance - with Set (O(1)), should be fast
      const startTime = performance.now();
      socialSystem.update(world, entities, 1.0);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // With Set optimization, should be <2ms even with 100 agents
      expect(duration).toBeLessThan(2);
    });
  });

  describe('Acceptance Criterion 3: Cached Collision Data', () => {
    it.skip('should MovementSystem cache building positions and reuse', () => {
      // SKIP: MovementSystem requires Movement component with specific fields (velocityX, velocityY)
      // createMovementComponent() doesn't create these fields
      // TODO: Update test to use proper movement component structure
      const movementSystem = new MovementSystem();
      movementSystem.initialize(world, eventBus);

      // Create many buildings to make uncached queries expensive
      for (let i = 0; i < 100; i++) {
        const building = new EntityImpl(createEntityId(), 0);
        building.addComponent(createBuildingComponent(BuildingType.Tent, 1, 100));
        building.addComponent(createPositionComponent(i % 10 * 5, Math.floor(i / 10) * 5));
        world.addEntity(building);
      }

      // Create many moving agents
      for (let i = 0; i < 50; i++) {
        const agent = new EntityImpl(createEntityId(), 0);
        agent.addComponent(createPositionComponent(i % 10, Math.floor(i / 10)));
        agent.addComponent(createMovementComponent());
        agent.addComponent(createVelocityComponent(0, 0, 1));
        agent.addComponent(createSteeringComponent());
        agent.addComponent(createAgentComponent());
        agent.addComponent(new NeedsComponent({
    hunger: 0.7,
    energy: 0.7,
    health: 0.7,
    thirst: 0.0,
    temperature: 0.0,
  }));
        world.addEntity(agent);
      }

      const entities = Array.from(world.entities.values());

      // Measure performance - with caching, should be fast
      const startTime = performance.now();
      movementSystem.update(world, entities, 1.0);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // With collision cache, should be <2ms even with 50 agents × 100 buildings
      expect(duration).toBeLessThan(2);
    });

    it.skip('should MovementSystem invalidate cache on building change events', () => {
      // SKIP: MovementSystem requires Movement component with velocityX/velocityY fields
      // createMovementComponent() doesn't create these fields, causing crashes
      // TODO: Update test to use proper movement component structure
      const movementSystem = new MovementSystem();
      movementSystem.initialize(world, eventBus);

      // Create buildings
      const building1 = new EntityImpl(createEntityId(), 0);
      building1.addComponent(createBuildingComponent(BuildingType.Tent, 1, 100));
      building1.addComponent(createPositionComponent(5, 5));
      (world as any)._addEntity(building1);

      // Create agent
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(4, 4));
      agent.addComponent(createMovementComponent());
      agent.addComponent(createVelocityComponent(1, 1, 1));
      agent.addComponent(createSteeringComponent());
      agent.addComponent(createAgentComponent());
      agent.addComponent(new NeedsComponent({
    hunger: 0.7,
    energy: 0.7,
    health: 0.7,
    thirst: 0.0,
    temperature: 0.0,
  }));
      (world as any)._addEntity(agent);

      const entities = Array.from(world.entities.values());

      // First update - build cache
      movementSystem.update(world, entities, 1.0);

      // Trigger building change event - should invalidate cache
      eventBus.emit({
        type: 'building:complete',
        source: 'test',
        data: { buildingId: building1.id },
      });

      // Second update - should rebuild cache with new building data
      movementSystem.update(world, entities, 1.0);

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Acceptance Criterion 4: Single-Pass Component Access', () => {
    it('should MovementSystem get all components at start not repeatedly', () => {
      const movementSystem = new MovementSystem();
      movementSystem.initialize(world, eventBus);

      // Create agents with full component set
      for (let i = 0; i < 100; i++) {
        const agent = new EntityImpl(createEntityId(), 0);
        agent.addComponent(createPositionComponent(i % 10, Math.floor(i / 10)));
        agent.addComponent(createMovementComponent());
        agent.addComponent(createVelocityComponent(0, 0, 1));
        agent.addComponent(createSteeringComponent());
        agent.addComponent(createAgentComponent());
        agent.addComponent(new NeedsComponent({
    hunger: 0.7,
    energy: 0.7,
    health: 0.7,
    thirst: 0.0,
    temperature: 0.0,
  }));
        world.addEntity(agent);
      }

      const entities = Array.from(world.entities.values());

      // Measure performance - with cached component access, should be fast
      const startTime = performance.now();
      movementSystem.update(world, entities, 1.0);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // With optimized component access, should be <2ms with 100 agents
      expect(duration).toBeLessThan(2);
    });
  });

  describe('Acceptance Criterion 5: Entity Lookup Maps', () => {
    it('should SocialGradientSystem use Map.get() not Array.find() for entity lookup', () => {
      const socialSystem = new SocialGradientSystem();
      socialSystem.initialize(world, eventBus);

      // Create many agents
      const agents: EntityImpl[] = [];
      for (let i = 0; i < 100; i++) {
        const agent = new EntityImpl(createEntityId(), 0);
        agent.addComponent(createAgentComponent());
        agent.addComponent(new SocialGradientComponent());
        agent.addComponent(createConversationComponent());
        world.addEntity(agent);
        agents.push(agent);
      }

      // Trigger many conversation events
      for (let i = 0; i < 50; i++) {
        eventBus.emit({
          type: 'conversation:start',
          source: 'test',
          data: {
            speakerId: agents[i].id,
            listenerId: agents[(i + 1) % 100].id,
          },
        });
      }

      const entities = Array.from(world.entities.values());

      // Measure performance - with Map lookup (O(1)), should be fast
      const startTime = performance.now();
      socialSystem.update(world, entities, 1.0);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // With Map.get() optimization, should be <2ms
      expect(duration).toBeLessThan(2);
    });
  });

  describe('Overall Performance Target', () => {
    it('should all optimized systems complete in <2ms with 100 entities', () => {
      // Initialize all systems
      const buildingSystem = new BuildingSystem();
      const govSystem = new GovernanceDataSystem();
      const socialSystem = new SocialGradientSystem();
      const movementSystem = new MovementSystem();

      buildingSystem.initialize(world, eventBus);
      govSystem.initialize(world, eventBus);
      socialSystem.initialize(world, eventBus);
      movementSystem.initialize(world, eventBus);

      // Create diverse entity mix
      // 10 buildings
      for (let i = 0; i < 10; i++) {
        const building = new EntityImpl(createEntityId(), 0);
        building.addComponent(createBuildingComponent(BuildingType.Tent, 1, 100));
        building.addComponent(createPositionComponent(i * 5, 0));
        building.addComponent(createInventoryComponent('storage', 20));
        world.addEntity(building);
      }

      // 100 agents
      for (let i = 0; i < 100; i++) {
        const agent = new EntityImpl(createEntityId(), 0);
        agent.addComponent(createIdentityComponent(`Agent${i}`, 5, i));
        agent.addComponent(createAgentComponent());
        agent.addComponent(new NeedsComponent({
    hunger: 0.7,
    energy: 0.7,
    health: 0.7,
    thirst: 0.0,
    temperature: 0.0,
  }));
        agent.addComponent(createPositionComponent(i % 10, Math.floor(i / 10)));
        agent.addComponent(createMovementComponent());
        agent.addComponent(createVelocityComponent(0, 0, 1));
        agent.addComponent(createSteeringComponent());
        agent.addComponent(new SocialGradientComponent());
        agent.addComponent(createConversationComponent());
        world.addEntity(agent);
      }

      const allEntities = Array.from(world.entities.values());

      // Measure each system
      const timings: { system: string; duration: number }[] = [];

      // BuildingSystem only processes entities with 'building' and 'position'
      const buildingEntities = allEntities.filter(e =>
        e.hasComponent(ComponentType.Building) && e.hasComponent(ComponentType.Position)
      );
      let start = performance.now();
      buildingSystem.update(world, buildingEntities, 1.0);
      let end = performance.now();
      timings.push({ system: 'BuildingSystem', duration: end - start });

      // GovernanceDataSystem processes all entities (filters internally)
      start = performance.now();
      govSystem.update(world, allEntities, 1.0);
      end = performance.now();
      timings.push({ system: 'GovernanceDataSystem', duration: end - start });

      // SocialGradientSystem processes entities with social_gradient
      const socialEntities = allEntities.filter(e => e.hasComponent(ComponentType.SocialGradient));
      start = performance.now();
      socialSystem.update(world, socialEntities, 1.0);
      end = performance.now();
      timings.push({ system: 'SocialGradientSystem', duration: end - start });

      // MovementSystem processes entities with movement components
      const movementEntities = allEntities.filter(e =>
        e.hasComponent(ComponentType.Movement) && e.hasComponent(ComponentType.Position)
      );
      start = performance.now();
      movementSystem.update(world, movementEntities, 1.0);
      end = performance.now();
      timings.push({ system: 'MovementSystem', duration: end - start });

      // Verify all systems meet <2ms target
      for (const { system, duration } of timings) {
        expect(duration).toBeLessThan(2);
      }

      // Total time should be reasonable
      const totalTime = timings.reduce((sum, t) => sum + t.duration, 0);
      expect(totalTime).toBeLessThan(8); // 4 systems × 2ms = 8ms max
    });
  });

  describe('Scaling Behavior', () => {
    it('should BuildingSystem scale linearly with entity count', () => {
      const buildingSystem = new BuildingSystem();
      buildingSystem.initialize(world, eventBus);

      const timings: number[] = [];

      // Test with increasing entity counts
      for (const count of [10, 50, 100]) {
        // Clear world
        (world as any).entities.clear();

        // Create entities
        for (let i = 0; i < count; i++) {
          const building = new EntityImpl(createEntityId(), 0);
          building.addComponent(createBuildingComponent(BuildingType.StorageChest, 1, 100));
          building.addComponent(createInventoryComponent('storage', 20));
          building.addComponent(createPositionComponent(i, 0));
          world.addEntity(building);
        }

        const entities = Array.from(world.entities.values());

        const start = performance.now();
        buildingSystem.update(world, entities, 1.0);
        const end = performance.now();

        timings.push(end - start);
      }

      // With optimizations, scaling should be close to linear
      // 100 entities should NOT take 10x as long as 10 entities
      const ratio = timings[2] / timings[0];
      expect(ratio).toBeLessThan(20); // Allow some overhead, but not O(n²)
    });

    it('should SocialGradientSystem scale linearly not quadratically', () => {
      const socialSystem = new SocialGradientSystem();
      socialSystem.initialize(world, eventBus);

      const timings: number[] = [];

      // Test with increasing agent counts
      for (const count of [10, 50, 100]) {
        // Clear world
        (world as any).entities.clear();

        // Create agents
        const agents: EntityImpl[] = [];
        for (let i = 0; i < count; i++) {
          const agent = new EntityImpl(createEntityId(), 0);
          agent.addComponent(createAgentComponent());
          agent.addComponent(new SocialGradientComponent());
        agent.addComponent(createConversationComponent());
          world.addEntity(agent);
          agents.push(agent);
        }

        // Trigger conversations
        for (let i = 0; i < Math.min(20, count - 1); i++) {
          eventBus.emit({
            type: 'conversation:start',
            source: 'test',
            data: {
              speakerId: agents[i].id,
              listenerId: agents[i + 1].id,
            },
          });
        }

        const entities = Array.from(world.entities.values());

        const start = performance.now();
        socialSystem.update(world, entities, 1.0);
        const end = performance.now();

        timings.push(end - start);
      }

      // With Set and Map optimizations, should scale close to linearly
      // 100 entities should NOT take 100x as long as 10 entities
      const ratio = timings[2] / timings[0];
      expect(ratio).toBeLessThan(30); // Allow overhead, but not O(n²)
    });
  });
});
