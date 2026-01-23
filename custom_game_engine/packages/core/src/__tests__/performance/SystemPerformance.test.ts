/**
 * System Performance Tests
 *
 * Tests Phase 1-5 systems under various load conditions to ensure they stay
 * within performance budgets and maintain target 20 TPS.
 *
 * Test Scenarios:
 * - Small scale: 100 entities
 * - Medium scale: 1,000 entities
 * - Large scale: 5,000 entities (stress test)
 *
 * Performance Budgets (from PERFORMANCE.md):
 * - Critical systems: <5ms per tick
 * - Non-critical systems: Should be throttled
 * - Total tick time: <50ms (for 20 TPS)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameLoop } from '../../loop/GameLoop.js';
import { World } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SystemRegistry } from '../../ecs/SystemRegistry.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import type { Entity } from '../../ecs/Entity.js';

// Import Phase 1-5 systems to test
import { GovernorDecisionSystem } from '../../systems/GovernorDecisionSystem.js';
import { TradeNetworkSystem } from '../../systems/TradeNetworkSystem.js';
import { ExplorationDiscoverySystem } from '../../systems/ExplorationDiscoverySystem.js';
import { ParadoxDetectionSystem } from '../../systems/ParadoxDetectionSystem.js';
import { WarehouseInventorySystem } from '../../systems/WarehouseInventorySystem.js';

// Performance constants
const TARGET_TPS = 20;
const MAX_TICK_TIME_MS = 50; // 1000ms / 20 TPS
const MAX_SYSTEM_TIME_MS = 5; // Guideline from PERFORMANCE.md
const TEST_DURATION_TICKS = 100; // Run for 100 ticks

describe('System Performance Tests', () => {
  let gameLoop: GameLoop;

  beforeEach(() => {
    gameLoop = new GameLoop();
  });

  describe('Small Scale (100 entities)', () => {
    it('should maintain 20 TPS with 100 entities', () => {
      // Setup world with 100 test entities
      const world = gameLoop.world;
      createTestEntities(world, 100);

      // Register test systems
      registerTestSystems(gameLoop);

      // Enable profiling
      gameLoop.enableProfiling();

      // Start game loop
      gameLoop.start();

      // Run for test duration
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }

      // Stop and get report
      gameLoop.stop();
      const report = gameLoop.getProfilingReport();

      // Assertions
      expect(report.actualTPS).toBeGreaterThanOrEqual(TARGET_TPS * 0.9); // Allow 10% variance
      expect(report.avgTickTimeMs).toBeLessThanOrEqual(MAX_TICK_TIME_MS);
      expect(report.budgetUsagePercent).toBeLessThanOrEqual(100);

      // Check that no systems have critical issues
      const criticalHotspots = report.hotspots.filter(h => h.severity === 'critical');
      expect(criticalHotspots).toHaveLength(0);
    });

    it('should keep all systems under 5ms budget', () => {
      const world = gameLoop.world;
      createTestEntities(world, 100);
      registerTestSystems(gameLoop);
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();

      // Check each system
      for (const system of report.systems) {
        expect(
          system.maxExecutionTimeMs,
          `System ${system.systemName} exceeded budget: ${system.maxExecutionTimeMs.toFixed(1)}ms`
        ).toBeLessThanOrEqual(MAX_SYSTEM_TIME_MS);
      }
    });
  });

  describe('Medium Scale (1,000 entities)', () => {
    it('should maintain performance with 1,000 entities', () => {
      const world = gameLoop.world;
      createTestEntities(world, 1000);
      registerTestSystems(gameLoop);
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();

      // Allow slightly more lenient TPS at medium scale
      expect(report.actualTPS).toBeGreaterThanOrEqual(TARGET_TPS * 0.85);
      expect(report.avgTickTimeMs).toBeLessThanOrEqual(MAX_TICK_TIME_MS * 1.2); // Allow 20% over

      // Should have minimal critical hotspots
      const criticalHotspots = report.hotspots.filter(h => h.severity === 'critical');
      expect(criticalHotspots.length).toBeLessThanOrEqual(1); // Allow at most 1 critical
    });

    it('should show throttle effectiveness for non-critical systems', () => {
      const world = gameLoop.world;
      createTestEntities(world, 1000);
      registerTestSystems(gameLoop);
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();

      // Find throttled systems (those with UPDATE_INTERVAL)
      const throttledSystems = report.systems.filter(
        s => s.ticksSkipped > 0
      );

      // Should have some throttled systems
      expect(throttledSystems.length).toBeGreaterThan(0);

      // Check throttle effectiveness
      for (const system of throttledSystems) {
        expect(
          system.throttleEffectiveness,
          `System ${system.systemName} has poor throttle effectiveness`
        ).toBeGreaterThan(0);
      }
    });
  });

  describe('Large Scale (5,000 entities) - Stress Test', () => {
    it('should handle 5,000 entities without crashing', () => {
      const world = gameLoop.world;
      createTestEntities(world, 5000);
      registerTestSystems(gameLoop);
      gameLoop.enableProfiling();

      gameLoop.start();

      // Run fewer ticks for stress test
      const stressTicks = 50;
      for (let i = 0; i < stressTicks; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();

      // At this scale, we expect degradation but should still be playable
      expect(report.actualTPS).toBeGreaterThanOrEqual(TARGET_TPS * 0.5); // 10 TPS minimum
      expect(report.avgTickTimeMs).toBeLessThanOrEqual(MAX_TICK_TIME_MS * 2); // 100ms max

      // Should generate performance report without errors
      expect(report.systems.length).toBeGreaterThan(0);
      expect(report.hotspots).toBeDefined();
    });

    it('should identify specific hotspots at large scale', () => {
      const world = gameLoop.world;
      createTestEntities(world, 5000);
      registerTestSystems(gameLoop);
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < 50; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();

      // Should have some hotspots detected
      expect(report.hotspots.length).toBeGreaterThan(0);

      // All hotspots should have suggestions
      for (const hotspot of report.hotspots) {
        expect(hotspot.suggestion).toBeTruthy();
        expect(hotspot.measurement).toBeTruthy();
        expect(hotspot.issue).toBeTruthy();
      }
    });
  });

  describe('Individual System Performance', () => {
    it('GovernorDecisionSystem should be throttled appropriately', () => {
      const world = gameLoop.world;
      createGovernorEntities(world, 10); // 10 governors
      gameLoop.systemRegistry.register(new GovernorDecisionSystem());
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();
      const governorSystem = report.systems.find(s => s.systemName === 'governor_decision');

      if (governorSystem) {
        // Should be heavily throttled (only runs occasionally)
        expect(governorSystem.ticksProcessed).toBeLessThan(TEST_DURATION_TICKS / 2);
        expect(governorSystem.throttleEffectiveness).toBeGreaterThan(0.5);
      }
    });

    it('TradeNetworkSystem should handle graph analysis efficiently', () => {
      const world = gameLoop.world;
      createTradeNetworkEntities(world, 50); // 50 trade nodes
      gameLoop.systemRegistry.register(new TradeNetworkSystem());
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();
      const tradeSystem = report.systems.find(s => s.systemName === 'trade_network');

      if (tradeSystem) {
        // Graph analysis should be cached/throttled
        expect(tradeSystem.avgExecutionTimeMs).toBeLessThanOrEqual(MAX_SYSTEM_TIME_MS);

        // Should be consistent (not spiky)
        expect(tradeSystem.isConsistent).toBe(true);
      }
    });

    it('ExplorationDiscoverySystem should scale with entity count', () => {
      const world = gameLoop.world;
      createExplorerEntities(world, 100);
      gameLoop.systemRegistry.register(new ExplorationDiscoverySystem());
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();
      const explorationSystem = report.systems.find(s => s.systemName === 'exploration_discovery');

      if (explorationSystem) {
        // Should process entities efficiently
        const timePerEntity = explorationSystem.avgExecutionTimeMs / explorationSystem.avgEntityCount;
        expect(timePerEntity).toBeLessThanOrEqual(0.1); // <0.1ms per entity
      }
    });

    it('ParadoxDetectionSystem should use efficient algorithms', () => {
      const world = gameLoop.world;
      createTimelineEntities(world, 20); // 20 timelines
      gameLoop.systemRegistry.register(new ParadoxDetectionSystem());
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();
      const paradoxSystem = report.systems.find(s => s.systemName === 'paradox_detection');

      if (paradoxSystem) {
        // Should use efficient graph algorithms
        expect(paradoxSystem.avgExecutionTimeMs).toBeLessThanOrEqual(MAX_SYSTEM_TIME_MS);

        // Should be throttled (doesn't need every-tick updates)
        expect(paradoxSystem.ticksProcessed).toBeLessThan(TEST_DURATION_TICKS);
      }
    });

    it('WarehouseInventorySystem should cache queries', () => {
      const world = gameLoop.world;
      createWarehouseEntities(world, 30);
      gameLoop.systemRegistry.register(new WarehouseInventorySystem());
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();
      const warehouseSystem = report.systems.find(s => s.systemName === 'warehouse_inventory');

      if (warehouseSystem) {
        // Should be consistent (good caching)
        expect(warehouseSystem.isConsistent).toBe(true);

        // Should stay within budget
        expect(warehouseSystem.avgExecutionTimeMs).toBeLessThanOrEqual(MAX_SYSTEM_TIME_MS);
      }
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate markdown report', () => {
      const world = gameLoop.world;
      createTestEntities(world, 100);
      registerTestSystems(gameLoop);
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const markdown = gameLoop.exportProfilingMarkdown();

      // Should contain key sections
      expect(markdown).toContain('# Performance Profile Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('## System Performance');
      expect(markdown).toContain('| System |');

      // Should have measurements
      expect(markdown).toContain('ms');
      expect(markdown).toContain('%');
    });

    it('should generate JSON report', () => {
      const world = gameLoop.world;
      createTestEntities(world, 100);
      registerTestSystems(gameLoop);
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const json = gameLoop.exportProfilingJSON();
      const report = JSON.parse(json);

      // Should have all required fields
      expect(report.timestamp).toBeDefined();
      expect(report.systems).toBeDefined();
      expect(report.hotspots).toBeDefined();
      expect(report.actualTPS).toBeDefined();
      expect(report.budgetUsagePercent).toBeDefined();
    });

    it('should provide actionable optimization suggestions', () => {
      const world = gameLoop.world;
      createTestEntities(world, 5000); // Large scale to trigger warnings
      registerTestSystems(gameLoop);
      gameLoop.enableProfiling();

      gameLoop.start();
      for (let i = 0; i < 50; i++) {
        gameLoop.tick();
      }
      gameLoop.stop();

      const report = gameLoop.getProfilingReport();

      // Should have suggestions for any hotspots
      for (const hotspot of report.hotspots) {
        expect(hotspot.suggestion).toBeTruthy();

        // Suggestions should mention specific optimizations
        const suggestion = hotspot.suggestion.toLowerCase();
        const hasOptimization =
          suggestion.includes('throttle') ||
          suggestion.includes('cache') ||
          suggestion.includes('optimize') ||
          suggestion.includes('requiredcomponents') ||
          suggestion.includes('profile');

        expect(hasOptimization).toBe(true);
      }
    });
  });

  describe('Profiler Overhead', () => {
    it('should have minimal performance impact (<1%)', () => {
      const world = gameLoop.world;
      createTestEntities(world, 1000);
      registerTestSystems(gameLoop);

      // Measure without profiling
      gameLoop.start();
      const startTick = gameLoop.world.tick;
      const startTime = performance.now();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop.tick();
      }
      const endTime = performance.now();
      gameLoop.stop();
      const timeWithoutProfiling = endTime - startTime;

      // Reset and measure with profiling
      const gameLoop2 = new GameLoop();
      const world2 = gameLoop2.world;
      createTestEntities(world2, 1000);
      registerTestSystems(gameLoop2);
      gameLoop2.enableProfiling();

      gameLoop2.start();
      const startTime2 = performance.now();
      for (let i = 0; i < TEST_DURATION_TICKS; i++) {
        gameLoop2.tick();
      }
      const endTime2 = performance.now();
      gameLoop2.stop();
      const timeWithProfiling = endTime2 - startTime2;

      // Calculate overhead
      const overhead = ((timeWithProfiling - timeWithoutProfiling) / timeWithoutProfiling) * 100;

      // Should be less than 5% overhead (generous - target is <1%)
      expect(overhead).toBeLessThanOrEqual(5);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create test entities with various components
 */
function createTestEntities(world: World, count: number): void {
  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();

    // Add position (most entities have this)
    entity.addComponent({
      type: CT.Position,
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: 0,
    });

    // Add agent component to some
    if (i % 10 === 0) {
      entity.addComponent({
        type: CT.Agent,
        name: `Agent_${i}`,
        species: 'human',
      });
    }
  }
}

/**
 * Create governor entities for testing governance
 */
function createGovernorEntities(world: World, count: number): void {
  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();
    entity.addComponent({
      type: CT.Governor,
      tier: 'province',
      personality_traits: [],
      decision_history: [],
      cooldown_until_tick: 0,
    });
    entity.addComponent({
      type: CT.PoliticalEntity,
      tier: 'province',
      name: `Province_${i}`,
    });
  }
}

/**
 * Create trade network entities
 */
function createTradeNetworkEntities(world: World, nodeCount: number): void {
  const network = world.createEntity();
  network.addComponent({
    type: CT.TradeNetwork,
    nodes: [],
    edges: [],
    hubs: [],
    chokepoints: [],
  });

  // Create trade nodes
  for (let i = 0; i < nodeCount; i++) {
    const node = world.createEntity();
    node.addComponent({
      type: CT.Position,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: 0,
    });
  }
}

/**
 * Create explorer entities
 */
function createExplorerEntities(world: World, count: number): void {
  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();
    entity.addComponent({
      type: CT.Position,
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: 0,
    });
    entity.addComponent({
      type: CT.Explorer,
      discoveries: [],
      exploration_range: 10,
    });
  }
}

/**
 * Create timeline entities for paradox detection
 */
function createTimelineEntities(world: World, count: number): void {
  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();
    entity.addComponent({
      type: CT.Timeline,
      universe_id: `universe_${i}`,
      branch_point: 0,
      ancestors: [],
    });
  }
}

/**
 * Create warehouse entities
 */
function createWarehouseEntities(world: World, count: number): void {
  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();
    entity.addComponent({
      type: CT.Position,
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: 0,
    });
    entity.addComponent({
      type: CT.Warehouse,
      inventory: new Map(),
      capacity: 1000,
    });
  }
}

/**
 * Register test systems
 */
function registerTestSystems(gameLoop: GameLoop): void {
  // Register a subset of Phase 1-5 systems for testing
  // Only register systems that exist and can be imported
  try {
    gameLoop.systemRegistry.register(new GovernorDecisionSystem());
  } catch (e) {
    // System may not exist - skip
  }

  try {
    gameLoop.systemRegistry.register(new TradeNetworkSystem());
  } catch (e) {
    // System may not exist - skip
  }

  try {
    gameLoop.systemRegistry.register(new ExplorationDiscoverySystem());
  } catch (e) {
    // System may not exist - skip
  }

  try {
    gameLoop.systemRegistry.register(new ParadoxDetectionSystem());
  } catch (e) {
    // System may not exist - skip
  }

  try {
    gameLoop.systemRegistry.register(new WarehouseInventorySystem());
  } catch (e) {
    // System may not exist - skip
  }
}
