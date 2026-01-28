import { describe, it, expect, beforeEach } from 'vitest';
import { MultiverseCoordinator } from '../MultiverseCoordinator.js';
import { MultiverseNetworkManager } from '../MultiverseNetworkManager.js';
import type { WorldMutator } from '../../ecs/World.js';
import { vi } from 'vitest';

// Mock World for testing
function createMockWorld(): WorldMutator {
  return {
    entities: new Map(),
    tick: 0n,
    update: vi.fn(),
    getEntity: vi.fn(),
    destroyEntity: vi.fn(),
  } as unknown as WorldMutator;
}

// Type-safe accessors for private NetworkManager internals
interface NetworkManagerInternals {
  calculateUniverseCompatibility: (
    local: unknown,
    remote: unknown
  ) => {
    compatibilityScore: number;
    recommended: boolean;
    warnings: string[];
    factors: {
      timeRateCompatibility: number;
      physicsCompatibility: number;
      realityStability: number;
      divergenceLevel: number;
    };
    traversalCostMultiplier: number;
  };
  calculateForkingDepth: (config: unknown) => number;
  areRelatedTimelines: (config1: unknown, config2: unknown) => boolean;
  estimateDivergence: (config1: unknown, config2: unknown) => number;
}

function getNetworkManagerInternals(
  manager: MultiverseNetworkManager
): NetworkManagerInternals {
  return manager as unknown as NetworkManagerInternals;
}

/**
 * Tests for universe compatibility calculation
 *
 * This is a focused test suite that doesn't require network setup,
 * just tests the compatibility calculation logic directly.
 */
describe('Universe Compatibility Calculation', () => {
  let coordinator: MultiverseCoordinator;
  let networkManager: MultiverseNetworkManager;

  beforeEach(() => {
    coordinator = new MultiverseCoordinator();
    networkManager = new MultiverseNetworkManager(coordinator);
  });

  describe('Basic Compatibility', () => {
    it('should calculate high compatibility for identical configurations', () => {
      const config1 = {
        id: 'universe-1',
        name: 'Universe 1',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const config2 = {
        id: 'universe-2',
        name: 'Universe 2',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const compatibility = getNetworkManagerInternals(networkManager).calculateUniverseCompatibility(
        config1,
        config2
      );

      expect(compatibility.compatibilityScore).toBeGreaterThan(0.9);
      expect(compatibility.recommended).toBe(true);
      expect(compatibility.warnings).toHaveLength(0);
      expect(compatibility.factors.timeRateCompatibility).toBe(1.0);
      expect(compatibility.factors.physicsCompatibility).toBe(1.0);
      expect(compatibility.factors.realityStability).toBe(1.0);
    });

    it('should reduce compatibility for time scale differences', () => {
      const config1 = {
        id: 'universe-1',
        name: 'Slow Universe',
        timeScale: 0.5,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const config2 = {
        id: 'universe-2',
        name: 'Fast Universe',
        timeScale: 2.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const compatibility = getNetworkManagerInternals(networkManager).calculateUniverseCompatibility(
        config1,
        config2
      );

      // Time ratio is 0.5/2.0 = 0.25, which is < 0.5, so timeRateCompatibility = 0.5
      expect(compatibility.factors.timeRateCompatibility).toBe(0.5);
      expect(compatibility.warnings.some((w: string) => w.includes('time rate'))).toBe(true);
    });

    it('should reduce physics compatibility for cross-multiverse passages', () => {
      const config1 = {
        id: 'universe-1',
        name: 'Universe 1',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const config2 = {
        id: 'universe-2',
        name: 'Universe 2',
        timeScale: 1.0,
        multiverseId: 'multiverse-2',
        paused: false,
      };

      const compatibility = getNetworkManagerInternals(networkManager).calculateUniverseCompatibility(
        config1,
        config2
      );

      expect(compatibility.factors.physicsCompatibility).toBe(0.7);
      expect(compatibility.warnings.some((w: string) => w.includes('Cross-multiverse'))).toBe(true);
    });

    it('should reduce stability for paused universes', () => {
      const config1 = {
        id: 'universe-1',
        name: 'Active Universe',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const config2 = {
        id: 'universe-2',
        name: 'Paused Universe',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: true,
      };

      const compatibility = getNetworkManagerInternals(networkManager).calculateUniverseCompatibility(
        config1,
        config2
      );

      expect(compatibility.factors.realityStability).toBeLessThan(1.0);
      expect(compatibility.factors.realityStability).toBeCloseTo(0.7, 1);
      expect(compatibility.warnings.some((w: string) => w.includes('paused'))).toBe(true);
    });
  });

  describe('Forking Depth Calculation', () => {
    it('should return 0 for root universe', () => {
      const rootConfig = {
        id: 'universe-root',
        name: 'Root',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const depth = getNetworkManagerInternals(networkManager).calculateForkingDepth(rootConfig);
      expect(depth).toBe(0);
    });

    it('should return 1 for direct child', () => {
      const parentConfig = {
        id: 'universe-parent',
        name: 'Parent',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const childConfig = {
        id: 'universe-child',
        name: 'Child',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-parent',
        forkedAtTick: 1000n,
        paused: false,
      };

      // Register parent so it can be found
      const mockWorld = createMockWorld();

      coordinator.registerUniverse(mockWorld, parentConfig);

      const depth = getNetworkManagerInternals(networkManager).calculateForkingDepth(childConfig);
      expect(depth).toBe(1);
    });

    it('should calculate depth for nested forks', () => {
      const root = {
        id: 'universe-root',
        name: 'Root',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const child1 = {
        id: 'universe-child1',
        name: 'Child 1',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-root',
        forkedAtTick: 1000n,
        paused: false,
      };

      const child2 = {
        id: 'universe-child2',
        name: 'Child 2',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-child1',
        forkedAtTick: 2000n,
        paused: false,
      };

      const mockWorld = createMockWorld();

      coordinator.registerUniverse(mockWorld, root);
      coordinator.registerUniverse(mockWorld, child1);

      const depth = getNetworkManagerInternals(networkManager).calculateForkingDepth(child2);
      expect(depth).toBe(2);
    });

    it('should warn about deep timeline nesting', () => {
      const parent = {
        id: 'universe-parent',
        name: 'Parent',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const deepChild = {
        id: 'universe-deep',
        name: 'Deep Child',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-parent',
        forkedAtTick: 1000n,
        paused: false,
      };

      const mockWorld = createMockWorld();

      // Create a chain of 6 parent universes to simulate depth > 5
      for (let i = 0; i < 6; i++) {
        const id = i === 0 ? 'universe-parent' : `universe-level${i}`;
        const parentId = i === 0 ? undefined : (i === 1 ? 'universe-parent' : `universe-level${i-1}`);

        coordinator.registerUniverse(mockWorld, {
          id,
          name: `Level ${i}`,
          timeScale: 1.0,
          multiverseId: 'multiverse-1',
          parentId,
          forkedAtTick: i > 0 ? BigInt(i * 1000) : undefined,
          paused: false,
        });
      }

      // Now test compatibility with a very deep fork
      const veryDeepChild = {
        id: 'universe-very-deep',
        name: 'Very Deep',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-level5',
        forkedAtTick: 6000n,
        paused: false,
      };

      const compatibility = getNetworkManagerInternals(networkManager).calculateUniverseCompatibility(
        parent,
        veryDeepChild
      );

      const depth = getNetworkManagerInternals(networkManager).calculateForkingDepth(veryDeepChild);
      expect(depth).toBeGreaterThan(5);
      expect(compatibility.warnings.some((w: string) => w.includes('Deep timeline nesting'))).toBe(true);
    });
  });

  describe('Related Timeline Detection', () => {
    it('should detect parent-child relationship', () => {
      const parent = {
        id: 'universe-parent',
        name: 'Parent',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const child = {
        id: 'universe-child',
        name: 'Child',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-parent',
        forkedAtTick: 1000n,
        paused: false,
      };

      const areRelated = getNetworkManagerInternals(networkManager).areRelatedTimelines(parent, child);
      expect(areRelated).toBe(true);
    });

    it('should detect sibling relationship', () => {
      const sibling1 = {
        id: 'universe-sibling1',
        name: 'Sibling 1',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-parent',
        forkedAtTick: 1000n,
        paused: false,
      };

      const sibling2 = {
        id: 'universe-sibling2',
        name: 'Sibling 2',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-parent',
        forkedAtTick: 2000n,
        paused: false,
      };

      const areRelated = getNetworkManagerInternals(networkManager).areRelatedTimelines(sibling1, sibling2);
      expect(areRelated).toBe(true);
    });

    it('should not detect unrelated timelines as related', () => {
      const universe1 = {
        id: 'universe-1',
        name: 'Universe 1',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const universe2 = {
        id: 'universe-2',
        name: 'Universe 2',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const areRelated = getNetworkManagerInternals(networkManager).areRelatedTimelines(universe1, universe2);
      expect(areRelated).toBe(false);
    });
  });

  describe('Divergence Estimation', () => {
    it('should return 0 divergence for non-forked universes', () => {
      const config1 = {
        id: 'universe-1',
        name: 'Universe 1',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const config2 = {
        id: 'universe-2',
        name: 'Universe 2',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const divergence = getNetworkManagerInternals(networkManager).estimateDivergence(config1, config2);
      expect(divergence).toBe(0);
    });

    it('should calculate divergence based on time since fork', () => {
      const parent = {
        id: 'universe-parent',
        name: 'Parent',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const recentFork = {
        id: 'universe-recent',
        name: 'Recent Fork',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-parent',
        forkedAtTick: 100n,
        paused: false,
      };

      const oldFork = {
        id: 'universe-old',
        name: 'Old Fork',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-parent',
        forkedAtTick: 50000n,
        paused: false,
      };

      const recentDivergence = getNetworkManagerInternals(networkManager).estimateDivergence(parent, recentFork);
      const oldDivergence = getNetworkManagerInternals(networkManager).estimateDivergence(parent, oldFork);

      expect(recentDivergence).toBeLessThan(oldDivergence);
      expect(recentDivergence).toBeCloseTo(0.001, 3); // 100/100000
      expect(oldDivergence).toBeCloseTo(0.5, 1); // 50000/100000
    });

    it('should cap divergence at 1.0', () => {
      const parent = {
        id: 'universe-parent',
        name: 'Parent',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const ancientFork = {
        id: 'universe-ancient',
        name: 'Ancient Fork',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        parentId: 'universe-parent',
        forkedAtTick: 200000n,
        paused: false,
      };

      const divergence = getNetworkManagerInternals(networkManager).estimateDivergence(parent, ancientFork);
      expect(divergence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Traversal Cost Multiplier', () => {
    it('should use 1.0 multiplier for high compatibility', () => {
      const config1 = {
        id: 'universe-1',
        name: 'Universe 1',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const config2 = {
        id: 'universe-2',
        name: 'Universe 2',
        timeScale: 1.0,
        multiverseId: 'multiverse-1',
        paused: false,
      };

      const compatibility = getNetworkManagerInternals(networkManager).calculateUniverseCompatibility(
        config1,
        config2
      );

      expect(compatibility.traversalCostMultiplier).toBeCloseTo(1.0, 1);
    });

    it('should increase cost for low compatibility', () => {
      const config1 = {
        id: 'universe-1',
        name: 'Slow Universe',
        timeScale: 0.1,
        multiverseId: 'multiverse-1',
        paused: true,
      };

      const config2 = {
        id: 'universe-2',
        name: 'Fast Universe',
        timeScale: 10.0,
        multiverseId: 'multiverse-2',
        paused: false,
      };

      const compatibility = getNetworkManagerInternals(networkManager).calculateUniverseCompatibility(
        config1,
        config2
      );

      expect(compatibility.traversalCostMultiplier).toBeGreaterThan(1.5);
      expect(compatibility.recommended).toBe(false);
    });
  });
});
