import { describe, it, expect, beforeEach } from 'vitest';
import { RenormalizationEngine, type TierSummary } from '../RenormalizationEngine.js';
import { AbstractTierBase } from '../../abstraction/AbstractTierBase.js';
import type { AbstractTier } from '../../abstraction/types.js';

describe('RenormalizationEngine', () => {
  let engine: RenormalizationEngine;
  let mockTier: AbstractTier;

  beforeEach(() => {
    engine = new RenormalizationEngine();

    // Create a mock tier using AbstractTierBase
    mockTier = new AbstractTierBase(
      'test_tier_1',
      'Test Zone',
      'zone',
      { gigasegment: 0, megasegment: 0, subsection: 0, region: 0, zone: 1 },
      'abstract'
    );

    // Set up some test data
    mockTier.population.total = 10000;
    mockTier.population.growth = 150;
    mockTier.population.carryingCapacity = 15000;
    mockTier.economy.production.set('food', 1200);
    mockTier.economy.consumption.set('food', 1000);
    mockTier.economy.stockpiles.set('food', 5000);
    mockTier.tech.level = 3;
    mockTier.tech.research = 45;
    mockTier.universities = 2;
    mockTier.stability.overall = 75;
    mockTier.stability.happiness = 80;
    mockTier.tick = 100;
  });

  describe('Tier Activation', () => {
    it('should track active tiers', () => {
      expect(engine.isTierActive('test_tier_1')).toBe(false);

      engine.activateTier('test_tier_1');
      expect(engine.isTierActive('test_tier_1')).toBe(true);

      engine.deactivateTier('test_tier_1');
      expect(engine.isTierActive('test_tier_1')).toBe(false);
    });

    it('should handle multiple active tiers', () => {
      engine.activateTier('tier_a');
      engine.activateTier('tier_b');
      engine.activateTier('tier_c');

      expect(engine.isTierActive('tier_a')).toBe(true);
      expect(engine.isTierActive('tier_b')).toBe(true);
      expect(engine.isTierActive('tier_c')).toBe(true);

      engine.deactivateTier('tier_b');
      expect(engine.isTierActive('tier_a')).toBe(true);
      expect(engine.isTierActive('tier_b')).toBe(false);
      expect(engine.isTierActive('tier_c')).toBe(true);
    });
  });

  describe('Time Scaling', () => {
    it('should return correct time scale for tiers', () => {
      expect(engine.getTimeScale('chunk')).toBe(1);
      expect(engine.getTimeScale('zone')).toBe(60);
      expect(engine.getTimeScale('region')).toBe(1440);
      expect(engine.getTimeScale('gigasegment')).toBe(525600);
    });

    it('should return 1 for unknown tier', () => {
      expect(engine.getTimeScale('unknown' as any)).toBe(1);
    });
  });

  describe('Summarization', () => {
    it('should summarize a tier correctly', () => {
      const summary = engine.summarize(mockTier);

      expect(summary.tierId).toBe('test_tier_1');
      expect(summary.tierLevel).toBe('zone');
      expect(summary.population).toBe(10000);
      expect(summary.carryingCapacity).toBe(15000);
    });

    it('should capture population stats', () => {
      const summary = engine.summarize(mockTier);

      expect(summary.population).toBe(10000);
      expect(summary.birthRate).toBeCloseTo(0.015, 3); // 150/10000
      expect(summary.carryingCapacity).toBe(15000);
    });

    it('should capture economy stats', () => {
      const summary = engine.summarize(mockTier);

      expect(summary.economy.foodProduction).toBe(1200);
      expect(summary.economy.foodConsumption).toBe(1000);
      expect(summary.economy.resourceSurplus.get('food')).toBe(5000);
    });

    it('should capture tech progress', () => {
      const summary = engine.summarize(mockTier);

      expect(summary.progress.techLevel).toBe(3);
      expect(summary.progress.researchProgress).toBe(45);
      expect(summary.progress.universities).toBe(2);
    });

    it('should capture stability metrics', () => {
      const summary = engine.summarize(mockTier);

      expect(summary.stability.overall).toBeCloseTo(0.75, 2);
      expect(summary.stability.happiness).toBeCloseTo(0.80, 2);
    });

    it('should include metadata', () => {
      const summary = engine.summarize(mockTier);

      expect(summary.lastUpdated).toBe(100);
      expect(summary.childSummaries).toBeInstanceOf(Array);
    });

    it('should cache the summary', () => {
      engine.summarize(mockTier);

      const cached = engine.getSummary('test_tier_1');
      expect(cached).toBeDefined();
      expect(cached?.tierId).toBe('test_tier_1');
    });
  });

  describe('Summary Caching', () => {
    it('should return undefined for unknown tier', () => {
      expect(engine.getSummary('nonexistent')).toBeUndefined();
    });

    it('should return all summaries', () => {
      const tier2 = new AbstractTierBase(
        'test_tier_2',
        'Test Region',
        'region',
        { gigasegment: 0, megasegment: 0, subsection: 0, region: 1 },
        'abstract'
      );

      engine.summarize(mockTier);
      engine.summarize(tier2);

      const all = engine.getAllSummaries();
      expect(all.size).toBe(2);
      expect(all.has('test_tier_1')).toBe(true);
      expect(all.has('test_tier_2')).toBe(true);
    });
  });

  describe('Instantiation Constraints', () => {
    it('should return null for unsummarized tier', () => {
      const constraints = engine.getInstantiationConstraints('nonexistent');
      expect(constraints).toBeNull();
    });

    it('should generate constraints from summary', () => {
      engine.summarize(mockTier);
      const constraints = engine.getInstantiationConstraints('test_tier_1');

      expect(constraints).not.toBeNull();
      expect(constraints!.targetPopulation).toBe(10000);
      expect(constraints!.techLevel).toBe(3);
    });

    it('should include preserved entities in constraints', () => {
      engine.summarize(mockTier);
      const constraints = engine.getInstantiationConstraints('test_tier_1');

      expect(constraints!.namedNPCs).toBeInstanceOf(Array);
      expect(constraints!.majorBuildings).toBeInstanceOf(Array);
      expect(constraints!.historicalEvents).toBeInstanceOf(Array);
    });
  });

  describe('Statistical Simulation', () => {
    it('should simulate tier population growth', () => {
      engine.summarize(mockTier);
      const initialPop = engine.getSummary('test_tier_1')!.population;

      // Simulate 100 ticks
      engine.simulateTier('test_tier_1', 100);

      const newPop = engine.getSummary('test_tier_1')!.population;
      // Population should have changed (grown or shrunk based on birth/death rates)
      expect(newPop).not.toBe(initialPop);
    });

    it('should not simulate inactive tiers without explicit call', () => {
      engine.summarize(mockTier);
      const initialPop = engine.getSummary('test_tier_1')!.population;

      // Just getting summary shouldn't change it
      const samePop = engine.getSummary('test_tier_1')!.population;
      expect(samePop).toBe(initialPop);
    });

    it('should update lastUpdated tick', () => {
      engine.summarize(mockTier);
      const initialTick = engine.getSummary('test_tier_1')!.lastUpdated;

      engine.simulateTier('test_tier_1', 50);

      const newTick = engine.getSummary('test_tier_1')!.lastUpdated;
      expect(newTick).toBeGreaterThan(initialTick);
    });

    it('should track simulated years', () => {
      engine.summarize(mockTier);

      // Simulate enough ticks to accumulate years
      engine.simulateTier('test_tier_1', 525600); // 1 year's worth of minutes

      const years = engine.getSummary('test_tier_1')!.simulatedYears;
      expect(years).toBeGreaterThan(0);
    });
  });

  describe('Belief Tracking', () => {
    it('should record miracles for existing deities', () => {
      engine.summarize(mockTier);
      const summary = engine.getSummary('test_tier_1')!;

      // Get an existing deity from the summary's byDeity Map
      const existingDeities = Array.from(summary.belief.byDeity.keys());
      if (existingDeities.length > 0) {
        const deityId = existingDeities[0];
        const initialMiracles = summary.belief.byDeity.get(deityId)!.recentMiracles;

        engine.recordMiracle('test_tier_1', deityId);

        expect(summary.belief.byDeity.get(deityId)!.recentMiracles).toBe(initialMiracles + 1);
      }
    });

    it('should not crash when recording miracle for nonexistent deity', () => {
      engine.summarize(mockTier);

      // Should not throw, just silently skip
      expect(() => engine.recordMiracle('test_tier_1', 'nonexistent_deity')).not.toThrow();
    });

    it('should add temples for existing deities', () => {
      engine.summarize(mockTier);
      const summary = engine.getSummary('test_tier_1')!;

      // Get an existing deity from the summary's byDeity Map
      const existingDeities = Array.from(summary.belief.byDeity.keys());
      if (existingDeities.length > 0) {
        const deityId = existingDeities[0];
        const initialTemples = summary.belief.byDeity.get(deityId)!.temples;

        engine.addTemple('test_tier_1', deityId);

        expect(summary.belief.byDeity.get(deityId)!.temples).toBe(initialTemples + 1);
      }
    });

    it('should track belief density', () => {
      engine.summarize(mockTier);

      const summary = engine.getSummary('test_tier_1')!;
      expect(summary.belief.beliefDensity).toBeGreaterThanOrEqual(0);
      expect(summary.belief.beliefDensity).toBeLessThanOrEqual(1);
    });
  });

  describe('Demographics', () => {
    it('should compute age distribution', () => {
      // Set up proper population distribution
      mockTier.population.distribution = {
        workers: 5000,
        military: 500,
        researchers: 500,
        children: 2000,
        elderly: 2000,
      };

      const summary = engine.summarize(mockTier);

      expect(summary.demographics.ageDistribution).toHaveLength(5);
      // All values should be valid proportions (0-1)
      for (const value of summary.demographics.ageDistribution) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should compute average lifespan based on tech', () => {
      const summary = engine.summarize(mockTier);

      // Base lifespan (62) + tech bonus (3 * 3 = 9) = 71
      expect(summary.demographics.avgLifespan).toBe(71);
    });

    it('should have worker distribution', () => {
      const summary = engine.summarize(mockTier);

      expect(summary.demographics.workerDistribution).toBeInstanceOf(Map);
    });
  });

  describe('Preserved Entities', () => {
    it('should preserve named NPCs', () => {
      const summary = engine.summarize(mockTier);

      expect(summary.preserved.namedNPCs).toBeInstanceOf(Array);
    });

    it('should preserve major buildings', () => {
      const summary = engine.summarize(mockTier);

      expect(summary.preserved.majorBuildings).toBeInstanceOf(Array);
    });

    it('should convert events to historical events', () => {
      // Add an event to the tier
      mockTier.addEvent({
        id: 'event_1',
        type: 'tech_breakthrough',
        tier: mockTier.id,
        tick: 50,
        severity: 7,
        duration: 100,
        description: 'A major discovery!',
        effects: { techLevelChange: 1 },
      });

      const summary = engine.summarize(mockTier);

      expect(summary.preserved.historicalEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Child Tier Handling', () => {
    it('should track child summaries', () => {
      // Add child tiers
      const child1 = new AbstractTierBase(
        'child_1',
        'Child Chunk 1',
        'chunk',
        { ...mockTier.address, chunk: { x: 0, y: 0 } },
        'abstract'
      );
      const child2 = new AbstractTierBase(
        'child_2',
        'Child Chunk 2',
        'chunk',
        { ...mockTier.address, chunk: { x: 1, y: 0 } },
        'abstract'
      );

      mockTier.addChild(child1);
      mockTier.addChild(child2);

      const summary = engine.summarize(mockTier);

      expect(summary.childSummaries).toContain('child_1');
      expect(summary.childSummaries).toContain('child_2');
    });
  });
});
