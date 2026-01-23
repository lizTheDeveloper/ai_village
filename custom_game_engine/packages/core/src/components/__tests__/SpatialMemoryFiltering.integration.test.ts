import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import {
  SpatialMemoryComponent,
  addSpatialMemory,
  getSpatialMemoriesByType,
  getSpatialMemoriesByLocation,
  getRecentSpatialMemories,
  getSpatialMemoriesByImportance,
} from '../SpatialMemoryComponent.js';

/**
 * Integration tests for SpatialMemory filtering methods
 *
 * These tests verify that the filtering methods work correctly in a real-world scenario
 * with actual ECS entities, components, and game simulation.
 */

describe('SpatialMemory Filtering Integration Tests', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let agent: EntityImpl;
  let memoryComponent: SpatialMemoryComponent;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);

    // Create an agent with spatial memory
    agent = new EntityImpl(createEntityId(), 0);
    memoryComponent = new SpatialMemoryComponent({ maxMemories: 100, decayRate: 1.0 });
    agent.addComponent(memoryComponent);
    world.addEntity(agent);
  });

  describe('Real-world agent memory scenario', () => {
    it('should simulate agent exploring and remembering resource locations over time', () => {
      let currentTick = 0;

      // Tick 100: Agent discovers berry bush at (10, 10)
      currentTick = 100;
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 10, y: 10, metadata: { resourceType: 'berries' } },
        currentTick,
        100
      );

      // Tick 150: Agent discovers another berry bush at (15, 12)
      currentTick = 150;
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 15, y: 12, metadata: { resourceType: 'berries' } },
        currentTick,
        100
      );

      // Tick 200: Agent encounters danger at (20, 20)
      currentTick = 200;
      addSpatialMemory(
        memoryComponent,
        { type: 'danger', x: 20, y: 20, metadata: { dangerType: 'wolf' } },
        currentTick,
        90
      );

      // Tick 250: Agent finds home location at (5, 5)
      currentTick = 250;
      addSpatialMemory(
        memoryComponent,
        { type: 'home', x: 5, y: 5, metadata: { homeType: 'shelter' } },
        currentTick,
        95
      );

      // Tick 300: Agent finds wood at (50, 50) - far away
      currentTick = 300;
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 50, y: 50, metadata: { resourceType: 'wood' } },
        currentTick,
        100
      );

      // Verify memories exist
      expect(memoryComponent.memories.length).toBe(5);

      // Test 1: Filter by type - get all resource locations
      const resources = getSpatialMemoriesByType(memoryComponent, 'resource_location');
      expect(resources.length).toBe(3); // 2 berry bushes + 1 wood
      expect(resources[0].metadata?.resourceType).toBeDefined();

      // Test 2: Filter by location - get memories near starting position (10, 10) within radius 10
      const nearbyMemories = getSpatialMemoriesByLocation(memoryComponent, { x: 10, y: 10 }, 10);
      expect(nearbyMemories.length).toBe(3); // Berry at (10,10), Berry at (15,12), Home at (5,5)
      // Closest should be first
      expect(nearbyMemories[0].x).toBe(10);
      expect(nearbyMemories[0].y).toBe(10);

      // Test 3: Get recent memories - last 2 memories
      const recentMemories = getRecentSpatialMemories(memoryComponent, 2);
      expect(recentMemories.length).toBe(2);
      expect(recentMemories[0].lastReinforced).toBe(300); // Wood
      expect(recentMemories[1].lastReinforced).toBe(250); // Home

      // Test 4: Filter by importance - get only strong memories (>= 95)
      const importantMemories = getSpatialMemoriesByImportance(memoryComponent, 95);
      expect(importantMemories.length).toBe(4); // 3 resources at 100, 1 home at 95
      expect(importantMemories.every(m => m.strength >= 95)).toBe(true);
    });

    it('should simulate agent returning to reinforce existing memories', () => {
      let currentTick = 0;

      // Tick 100: Agent discovers berry bush
      currentTick = 100;
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 10, y: 10, metadata: { resourceType: 'berries' } },
        currentTick,
        80
      );

      expect(memoryComponent.memories[0].strength).toBe(80);
      expect(memoryComponent.memories[0].lastReinforced).toBe(100);

      // Tick 500: Agent revisits the same berry bush - memory is reinforced
      currentTick = 500;
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 10, y: 10, metadata: { resourceType: 'berries' } },
        currentTick
      );

      // Memory should be reinforced (strength increased, lastReinforced updated)
      expect(memoryComponent.memories.length).toBe(1); // Still only 1 memory
      expect(memoryComponent.memories[0].strength).toBe(100); // Increased by 20, capped at 100
      expect(memoryComponent.memories[0].lastReinforced).toBe(500); // Updated

      // Tick 600: Add a new memory
      currentTick = 600;
      addSpatialMemory(
        memoryComponent,
        { type: 'danger', x: 20, y: 20 },
        currentTick,
        70
      );

      // Get recent memories - reinforced berry bush should be more recent than danger
      const recent = getRecentSpatialMemories(memoryComponent, 2);
      expect(recent[0].type).toBe('danger'); // Most recent
      expect(recent[1].type).toBe('resource_location'); // Reinforced at 500
    });

    it('should compose filters for complex queries (nearby high-importance resources)', () => {
      let currentTick = 0;

      // Agent's current position: (50, 50)
      const agentPosition = { x: 50, y: 50 };

      // Add diverse memories at various distances and importance levels
      currentTick = 100;

      // Close, high importance
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 52, y: 52, metadata: { resourceType: 'gold' } },
        currentTick,
        95
      );

      // Close, low importance
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 48, y: 48, metadata: { resourceType: 'stick' } },
        currentTick,
        40
      );

      // Far, high importance
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 200, y: 200, metadata: { resourceType: 'diamond' } },
        currentTick,
        100
      );

      // Close, wrong type
      addSpatialMemory(
        memoryComponent,
        { type: 'danger', x: 51, y: 51 },
        currentTick,
        90
      );

      // Close, medium importance
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 53, y: 47, metadata: { resourceType: 'iron' } },
        currentTick,
        75
      );

      // Query: Find nearby (radius 10) high-importance (>= 80) resource locations
      const nearbyResources = getSpatialMemoriesByLocation(memoryComponent, agentPosition, 10);
      const importantNearby = nearbyResources.filter(m =>
        m.type === 'resource_location' && m.strength >= 80
      );

      // Should only get gold (95 strength, close)
      expect(importantNearby.length).toBe(1);
      expect(importantNearby[0].metadata?.resourceType).toBe('gold');

      // Verify filtering excluded the right memories
      expect(nearbyResources.some(m => m.metadata?.resourceType === 'stick')).toBe(true); // Close but weak
      expect(nearbyResources.some(m => m.metadata?.resourceType === 'diamond')).toBe(false); // Strong but far
      expect(nearbyResources.some(m => m.type === 'danger')).toBe(true); // Close but wrong type
    });

    it('should handle memory capacity limits correctly with filtering', () => {
      // Create component with small capacity
      const smallMemory = new SpatialMemoryComponent({ maxMemories: 5, decayRate: 1.0 });
      agent.addComponent(smallMemory);

      let currentTick = 0;

      // Add 10 memories (exceeds capacity of 5)
      for (let i = 0; i < 10; i++) {
        currentTick = 100 + i * 10;
        addSpatialMemory(
          smallMemory,
          { type: 'resource_location', x: i * 10, y: i * 10 },
          currentTick,
          50 + i * 5 // Varying strength
        );
      }

      // Should only have 5 memories (weakest were evicted)
      expect(smallMemory.memories.length).toBe(5);

      // All remaining memories should have high strength (weak ones evicted)
      const allMemories = getSpatialMemoriesByImportance(smallMemory, 0);
      expect(allMemories.length).toBe(5);
      expect(allMemories.every(m => m.strength >= 70)).toBe(true);

      // Get recent memories should work with limited capacity
      const recent = getRecentSpatialMemories(smallMemory, 3);
      expect(recent.length).toBe(3);
      expect(recent[0].lastReinforced).toBeGreaterThan(recent[2].lastReinforced);
    });
  });

  describe('Performance under load', () => {
    it('should filter 100+ memories efficiently', () => {
      // Create component with large capacity for veteran explorer
      const largeMemory = new SpatialMemoryComponent({ maxMemories: 200, decayRate: 1.0 });
      agent.addComponent(largeMemory);

      // Simulate agent with extensive memory
      for (let i = 0; i < 100; i++) {
        addSpatialMemory(
          largeMemory,
          {
            type: i % 3 === 0 ? 'resource_location' : i % 3 === 1 ? 'danger' : 'home',
            x: Math.random() * 200,
            y: Math.random() * 200,
          },
          i * 10,
          Math.random() * 100
        );
      }

      // Should have ~100 memories (might be slightly less due to coordinate collision/merging)
      expect(largeMemory.memories.length).toBeGreaterThan(95);
      expect(largeMemory.memories.length).toBeLessThanOrEqual(100);

      // Measure type filtering
      const start1 = performance.now();
      const resources = getSpatialMemoriesByType(largeMemory, 'resource_location');
      const duration1 = performance.now() - start1;
      expect(duration1).toBeLessThan(10);
      expect(resources.length).toBeGreaterThan(0);

      // Measure location filtering
      const start2 = performance.now();
      const nearby = getSpatialMemoriesByLocation(largeMemory, { x: 100, y: 100 }, 50);
      const duration2 = performance.now() - start2;
      expect(duration2).toBeLessThan(10);
      expect(nearby.length).toBeGreaterThan(0);

      // Measure recent filtering
      const start3 = performance.now();
      const recent = getRecentSpatialMemories(largeMemory, 20);
      const duration3 = performance.now() - start3;
      expect(duration3).toBeLessThan(10);
      expect(recent.length).toBe(20);

      // Measure importance filtering
      const start4 = performance.now();
      const important = getSpatialMemoriesByImportance(largeMemory, 50);
      const duration4 = performance.now() - start4;
      expect(duration4).toBeLessThan(10);
      expect(important.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-agent memory interaction', () => {
    it('should handle multiple agents with independent spatial memories', () => {
      // Create second agent
      const agent2 = new EntityImpl(createEntityId(), 0);
      const memory2 = new SpatialMemoryComponent();
      agent2.addComponent(memory2);
      world.addEntity(agent2);

      // Agent 1 explores north
      addSpatialMemory(
        memoryComponent,
        { type: 'resource_location', x: 10, y: 100 },
        100,
        90
      );

      // Agent 2 explores south
      addSpatialMemory(
        memory2,
        { type: 'resource_location', x: 10, y: -100 },
        100,
        90
      );

      // Verify independent memories
      expect(memoryComponent.memories.length).toBe(1);
      expect(memory2.memories.length).toBe(1);

      const agent1Nearby = getSpatialMemoriesByLocation(memoryComponent, { x: 10, y: 100 }, 10);
      const agent2Nearby = getSpatialMemoriesByLocation(memory2, { x: 10, y: -100 }, 10);

      expect(agent1Nearby.length).toBe(1);
      expect(agent2Nearby.length).toBe(1);
      expect(agent1Nearby[0].y).toBe(100);
      expect(agent2Nearby[0].y).toBe(-100);
    });
  });
});
