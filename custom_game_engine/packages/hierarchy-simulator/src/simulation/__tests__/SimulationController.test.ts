import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimulationController } from '../SimulationController.js';
import { TIME_SCALE } from '../../renormalization/index.js';

// Mock requestAnimationFrame/cancelAnimationFrame for Node.js environment
global.requestAnimationFrame = vi.fn((cb) => {
  return setTimeout(cb, 16) as unknown as number;
});
global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

describe('SimulationController', () => {
  let controller: SimulationController;

  beforeEach(() => {
    vi.useFakeTimers();
    // Create a shallow hierarchy for faster tests
    controller = new SimulationController(2);
    controller.stop(); // Stop the animation loop for testing
  });

  afterEach(() => {
    controller.stop();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create with default hierarchy depth', () => {
      const state = controller.getState();
      expect(state.rootTier).toBeDefined();
      expect(state.rootTier.tier).toBe('gigasegment');
    });

    it('should start with simulation running by default', () => {
      const freshController = new SimulationController(1);
      const state = freshController.getState();
      expect(state.running).toBe(true);
      freshController.stop();
    });

    it('should initialize stats', () => {
      const state = controller.getState();
      expect(state.stats).toBeDefined();
      expect(state.stats.totalPopulation).toBeGreaterThan(0);
    });
  });

  describe('Renormalization Integration', () => {
    it('should provide access to renormalization engine', () => {
      const engine = controller.getRenormalizationEngine();
      expect(engine).toBeDefined();
      expect(typeof engine.summarize).toBe('function');
      expect(typeof engine.getInstantiationConstraints).toBe('function');
    });

    it('should return correct time scales for tier levels', () => {
      expect(controller.getTimeScale('chunk')).toBe(TIME_SCALE.chunk);
      expect(controller.getTimeScale('zone')).toBe(TIME_SCALE.zone);
      expect(controller.getTimeScale('region')).toBe(TIME_SCALE.region);
      expect(controller.getTimeScale('gigasegment')).toBe(TIME_SCALE.gigasegment);
    });
  });

  describe('Zoom Out', () => {
    it('should summarize a tier when zooming out', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      const summary = controller.zoomOut(tierId);

      expect(summary).not.toBeNull();
      expect(summary!.tierId).toBe(tierId);
      expect(summary!.population).toBeGreaterThan(0);
    });

    it('should deactivate tier when zooming out', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      // First activate it
      controller.zoomIn(tierId);
      expect(controller.isTierActive(tierId)).toBe(true);

      // Then zoom out
      controller.zoomOut(tierId);
      expect(controller.isTierActive(tierId)).toBe(false);
    });

    it('should set tier mode to abstract when zooming out', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      controller.zoomOut(tierId);

      const tier = controller.getTierById(tierId);
      expect(tier!.mode).toBe('abstract');
    });

    it('should return null for nonexistent tier', () => {
      const summary = controller.zoomOut('nonexistent_tier');
      expect(summary).toBeNull();
    });
  });

  describe('Zoom In', () => {
    it('should return instantiation constraints when zooming in', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      // First zoom out to create a summary
      controller.zoomOut(tierId);

      // Then zoom in
      const constraints = controller.zoomIn(tierId);

      expect(constraints).not.toBeNull();
      expect(constraints!.targetPopulation).toBeGreaterThan(0);
    });

    it('should activate tier when zooming in', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      // First zoom out
      controller.zoomOut(tierId);
      expect(controller.isTierActive(tierId)).toBe(false);

      // Then zoom in
      controller.zoomIn(tierId);
      expect(controller.isTierActive(tierId)).toBe(true);
    });

    it('should set tier mode to active when zooming in', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      controller.zoomIn(tierId);

      const tier = controller.getTierById(tierId);
      expect(tier!.mode).toBe('active');
    });

    it('should return null for nonexistent tier', () => {
      const constraints = controller.zoomIn('nonexistent_tier');
      expect(constraints).toBeNull();
    });
  });

  describe('Tier Summaries', () => {
    it('should get tier summary from cache or generate', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      const summary = controller.getTierSummary(tierId);

      expect(summary).not.toBeNull();
      expect(summary!.tierId).toBe(tierId);
    });

    it('should return null for nonexistent tier', () => {
      const summary = controller.getTierSummary('nonexistent_tier');
      expect(summary).toBeNull();
    });

    it('should get all tier summaries', () => {
      const state = controller.getState();

      // Generate summary for root
      controller.getTierSummary(state.rootTier.id);

      const allSummaries = controller.getAllTierSummaries();
      expect(allSummaries.size).toBeGreaterThan(0);
    });
  });

  describe('Tier Status', () => {
    it('should track active tier status through zoom in/out cycle', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      // Ensure tier starts inactive by zooming out first
      controller.zoomOut(tierId);
      expect(controller.isTierActive(tierId)).toBe(false);

      // Zoom in should activate
      controller.zoomIn(tierId);
      expect(controller.isTierActive(tierId)).toBe(true);

      // Zoom out should deactivate
      controller.zoomOut(tierId);
      expect(controller.isTierActive(tierId)).toBe(false);
    });
  });

  describe('Deity Mechanics', () => {
    it('should record miracles', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      // This should not throw
      expect(() => controller.recordMiracle(tierId, 'deity_test')).not.toThrow();
    });

    it('should add temples', () => {
      const state = controller.getState();
      const tierId = state.rootTier.id;

      // This should not throw
      expect(() => controller.addTemple(tierId, 'deity_test')).not.toThrow();
    });
  });

  describe('Belief Heatmap', () => {
    it('should generate belief heatmap', () => {
      const heatmap = controller.getBeliefHeatmap();

      expect(heatmap).toBeInstanceOf(Map);
      // Should have entries for each tier
      expect(heatmap.size).toBeGreaterThan(0);
    });

    it('should include density and dominant deity', () => {
      const heatmap = controller.getBeliefHeatmap();

      for (const [tierId, data] of Array.from(heatmap.entries())) {
        expect(typeof data.density).toBe('number');
        expect(data.density).toBeGreaterThanOrEqual(0);
        expect(data.density).toBeLessThanOrEqual(1);
        // dominantDeity can be null or string
        expect(data.dominant === null || typeof data.dominant === 'string').toBe(true);
      }
    });
  });

  describe('Tier Navigation', () => {
    it('should find tier by id', () => {
      const state = controller.getState();
      const rootId = state.rootTier.id;

      const found = controller.getTierById(rootId);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(rootId);
    });

    it('should return null for nonexistent tier', () => {
      const found = controller.getTierById('nonexistent');
      expect(found).toBeNull();
    });

    it('should find child tiers', () => {
      const state = controller.getState();

      if (state.rootTier.children.length > 0) {
        const childId = state.rootTier.children[0].id;
        const found = controller.getTierById(childId);
        expect(found).not.toBeNull();
        expect(found!.id).toBe(childId);
      }
    });

    it('should get all descendants', () => {
      const state = controller.getState();
      const descendants = controller.getAllDescendants(state.rootTier);

      // Should return flat array
      expect(descendants).toBeInstanceOf(Array);
      // Should include children (but not root itself)
      expect(descendants.length).toBeGreaterThanOrEqual(state.rootTier.children.length);
    });
  });

  describe('Simulation Control', () => {
    it('should toggle pause', () => {
      const initialState = controller.getState().running;
      const newState = controller.togglePause();
      expect(newState).toBe(!initialState);
    });

    it('should set speed', () => {
      controller.setSpeed(50);
      expect(controller.getState().speed).toBe(50);
    });

    it('should clamp speed to valid range', () => {
      controller.setSpeed(0.01);
      expect(controller.getState().speed).toBeGreaterThanOrEqual(0.1);

      controller.setSpeed(10000);
      expect(controller.getState().speed).toBeLessThanOrEqual(1000);
    });

    it('should reset simulation', () => {
      // Reset should set tick to 0
      controller.reset(1);

      expect(controller.getState().tick).toBe(0);
      // Should also clear events
      expect(controller.getState().allEvents).toHaveLength(0);
    });
  });

  describe('History Tracking', () => {
    it('should provide history data', () => {
      const history = controller.getHistory();

      expect(history.ticks).toBeInstanceOf(Array);
      expect(history.population).toBeInstanceOf(Array);
      expect(history.production).toBeInstanceOf(Array);
      expect(history.consumption).toBeInstanceOf(Array);
      expect(history.tradeVolume).toBeInstanceOf(Array);
      expect(history.efficiency).toBeInstanceOf(Array);
    });
  });
});
