/**
 * DecisionProtocols.test.ts - Tests for Phase 6 AI Governance protocols
 */

import { describe, it, expect } from 'vitest';
import {
  tierLevel,
  getNextHigherTier,
  shouldEscalate,
  getAllTiersOrdered,
  isTierHigherThan,
  type PoliticalTier,
  type Crisis,
  type VoteResult,
  ESCALATION_RULES,
} from '../DecisionProtocols.js';

describe('DecisionProtocols - Tier Hierarchy', () => {
  it('should return correct tier levels', () => {
    expect(tierLevel('village')).toBe(0);
    expect(tierLevel('city')).toBe(1);
    expect(tierLevel('province')).toBe(2);
    expect(tierLevel('nation')).toBe(3);
    expect(tierLevel('empire')).toBe(4);
    expect(tierLevel('federation')).toBe(5);
    expect(tierLevel('galactic_council')).toBe(6);
  });

  it('should get next higher tier correctly', () => {
    expect(getNextHigherTier('village')).toBe('city');
    expect(getNextHigherTier('city')).toBe('province');
    expect(getNextHigherTier('province')).toBe('nation');
    expect(getNextHigherTier('nation')).toBe('empire');
    expect(getNextHigherTier('empire')).toBe('federation');
    expect(getNextHigherTier('federation')).toBe('galactic_council');
    expect(getNextHigherTier('galactic_council')).toBeUndefined();
  });

  it('should return tiers in correct order', () => {
    const tiers = getAllTiersOrdered();
    expect(tiers).toEqual([
      'village',
      'city',
      'province',
      'nation',
      'empire',
      'federation',
      'galactic_council',
    ]);
  });

  it('should compare tier levels correctly', () => {
    expect(isTierHigherThan('nation', 'village')).toBe(true);
    expect(isTierHigherThan('village', 'nation')).toBe(false);
    expect(isTierHigherThan('empire', 'province')).toBe(true);
    expect(isTierHigherThan('city', 'city')).toBe(false);
  });
});

describe('DecisionProtocols - Escalation Rules', () => {
  it('should have escalation rules for all crisis types', () => {
    const crisisTypes = [
      'military_attack',
      'rebellion',
      'famine',
      'plague',
      'natural_disaster',
      'economic_collapse',
      'diplomatic_incident',
      'technology_threat',
      'species_extinction',
      'cosmic_threat',
    ];

    for (const crisisType of crisisTypes) {
      const rulesForType = ESCALATION_RULES.filter(rule => rule.type === crisisType);
      expect(rulesForType.length).toBeGreaterThan(0);
    }
  });

  it('should escalate minor military attack to city level', () => {
    const crisis: Crisis = {
      id: 'test-crisis-1',
      type: 'military_attack',
      description: 'Small raiding party',
      severity: 0.4,
      scope: 'village',
      affectedEntityIds: [],
      detectedTick: 1000,
      populationAffected: 50,
      status: 'active',
    };

    expect(shouldEscalate(crisis, 'village')).toBe(true);
    expect(shouldEscalate(crisis, 'city')).toBe(false);
  });

  it('should escalate major military attack to nation level', () => {
    const crisis: Crisis = {
      id: 'test-crisis-2',
      type: 'military_attack',
      description: 'Full-scale invasion',
      severity: 0.85,
      scope: 'province',
      affectedEntityIds: [],
      detectedTick: 1000,
      populationAffected: 500000,
      status: 'active',
    };

    expect(shouldEscalate(crisis, 'village')).toBe(true);
    expect(shouldEscalate(crisis, 'city')).toBe(true);
    expect(shouldEscalate(crisis, 'province')).toBe(true);
    expect(shouldEscalate(crisis, 'nation')).toBe(false);
  });

  it('should not escalate local famine beyond city', () => {
    const crisis: Crisis = {
      id: 'test-crisis-3',
      type: 'famine',
      description: 'Local food shortage',
      severity: 0.45,
      scope: 'village',
      affectedEntityIds: [],
      detectedTick: 1000,
      populationAffected: 200,
      status: 'active',
    };

    expect(shouldEscalate(crisis, 'village')).toBe(true);
    expect(shouldEscalate(crisis, 'city')).toBe(false);
  });

  it('should escalate pandemic to nation level', () => {
    const crisis: Crisis = {
      id: 'test-crisis-4',
      type: 'plague',
      description: 'Rapidly spreading disease',
      severity: 0.92,
      scope: 'province',
      affectedEntityIds: [],
      detectedTick: 1000,
      populationAffected: 1000000,
      status: 'active',
    };

    expect(shouldEscalate(crisis, 'village')).toBe(true);
    expect(shouldEscalate(crisis, 'city')).toBe(true);
    expect(shouldEscalate(crisis, 'province')).toBe(true);
    expect(shouldEscalate(crisis, 'nation')).toBe(false);
  });

  it('should escalate species extinction to galactic council', () => {
    const crisis: Crisis = {
      id: 'test-crisis-5',
      type: 'species_extinction',
      description: 'Species facing extinction',
      severity: 1.0,
      scope: 'empire',
      affectedEntityIds: [],
      detectedTick: 1000,
      populationAffected: 5000000000,
      status: 'active',
    };

    expect(shouldEscalate(crisis, 'empire')).toBe(true);
    expect(shouldEscalate(crisis, 'federation')).toBe(true);
    expect(shouldEscalate(crisis, 'galactic_council')).toBe(false);
  });

  it('should handle crisis with no matching escalation rules', () => {
    const crisis: Crisis = {
      id: 'test-crisis-6',
      type: 'rebellion',
      description: 'Minor protest',
      severity: 0.1, // Too low for any escalation rule
      scope: 'village',
      affectedEntityIds: [],
      detectedTick: 1000,
      populationAffected: 20,
      status: 'active',
    };

    // Should not escalate because no rule applies
    expect(shouldEscalate(crisis, 'village')).toBe(false);
    expect(shouldEscalate(crisis, 'city')).toBe(false);
  });
});

describe('DecisionProtocols - Edge Cases', () => {
  it('should handle lowest tier (village) correctly', () => {
    expect(tierLevel('village')).toBe(0);
    expect(getNextHigherTier('village')).toBe('city');
  });

  it('should handle highest tier (galactic_council) correctly', () => {
    expect(tierLevel('galactic_council')).toBe(6);
    expect(getNextHigherTier('galactic_council')).toBeUndefined();
  });

  it('should handle crisis at highest tier', () => {
    const crisis: Crisis = {
      id: 'test-crisis-cosmic',
      type: 'cosmic_threat',
      description: 'Galaxy-ending event',
      severity: 1.0,
      scope: 'galactic_council',
      affectedEntityIds: [],
      detectedTick: 1000,
      populationAffected: 1000000000000,
      status: 'active',
    };

    // Already at highest tier - should not escalate
    expect(shouldEscalate(crisis, 'galactic_council')).toBe(false);
  });
});

describe('DecisionProtocols - Performance', () => {
  it('should evaluate escalation quickly for local crises (early exit)', () => {
    const crisis: Crisis = {
      id: 'test-perf-1',
      type: 'famine',
      description: 'Local shortage',
      severity: 0.3, // Below any escalation threshold
      scope: 'village',
      affectedEntityIds: [],
      detectedTick: 1000,
      populationAffected: 100,
      status: 'active',
    };

    const startTime = performance.now();
    const shouldEscalateResult = shouldEscalate(crisis, 'village');
    const endTime = performance.now();

    expect(shouldEscalateResult).toBe(false);
    expect(endTime - startTime).toBeLessThan(1); // Should be extremely fast
  });

  it('should handle multiple tier checks efficiently', () => {
    const tiers: PoliticalTier[] = ['village', 'city', 'province', 'nation', 'empire'];

    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (const tier of tiers) {
        tierLevel(tier);
      }
    }
    const endTime = performance.now();

    // 5000 tier level checks should be very fast
    expect(endTime - startTime).toBeLessThan(10);
  });
});
