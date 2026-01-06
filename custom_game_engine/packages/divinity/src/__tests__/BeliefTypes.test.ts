import { describe, it, expect } from 'vitest';
import {
  // Constants
  BELIEF_GENERATION_RATES,
  BELIEF_THRESHOLDS,
  DEFAULT_BELIEF_DECAY,

  // Functions
  createInitialBeliefState,
  calculateBeliefGeneration,

  // Types
  type BeliefActivity,
  type DeityBeliefState,
  type BeliefDecayConfig,
} from '../BeliefTypes.js';

// ============================================================================
// BELIEF_GENERATION_RATES Tests
// ============================================================================

describe('BELIEF_GENERATION_RATES', () => {
  it('should have all activity types defined', () => {
    const activities: BeliefActivity[] = [
      'passive_faith',
      'prayer',
      'meditation',
      'ritual',
      'sacrifice',
      'pilgrimage',
      'proselytizing',
      'creation',
      'miracle_witness',
    ];

    for (const activity of activities) {
      expect(BELIEF_GENERATION_RATES[activity]).toBeDefined();
      expect(typeof BELIEF_GENERATION_RATES[activity]).toBe('number');
    }
  });

  it('should have lowest rate for passive_faith', () => {
    expect(BELIEF_GENERATION_RATES.passive_faith).toBe(0.01);
  });

  it('should have highest rate for miracle_witness', () => {
    expect(BELIEF_GENERATION_RATES.miracle_witness).toBe(5.0);
  });

  it('should have increasing rates for more active worship', () => {
    expect(BELIEF_GENERATION_RATES.passive_faith).toBeLessThan(BELIEF_GENERATION_RATES.prayer);
    expect(BELIEF_GENERATION_RATES.prayer).toBeLessThan(BELIEF_GENERATION_RATES.meditation);
    expect(BELIEF_GENERATION_RATES.meditation).toBeLessThan(BELIEF_GENERATION_RATES.ritual);
    expect(BELIEF_GENERATION_RATES.ritual).toBeLessThan(BELIEF_GENERATION_RATES.sacrifice);
  });

  it('should have all positive rates', () => {
    for (const activity of Object.keys(BELIEF_GENERATION_RATES) as BeliefActivity[]) {
      expect(BELIEF_GENERATION_RATES[activity]).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// BELIEF_THRESHOLDS Tests
// ============================================================================

describe('BELIEF_THRESHOLDS', () => {
  it('should have minimum threshold', () => {
    expect(BELIEF_THRESHOLDS.minimum).toBe(10);
  });

  it('should have minor_powers threshold', () => {
    expect(BELIEF_THRESHOLDS.minor_powers).toBe(100);
  });

  it('should have moderate_powers threshold', () => {
    expect(BELIEF_THRESHOLDS.moderate_powers).toBe(500);
  });

  it('should have angel_creation threshold', () => {
    expect(BELIEF_THRESHOLDS.angel_creation).toBe(2000);
  });

  it('should have avatar_creation threshold', () => {
    expect(BELIEF_THRESHOLDS.avatar_creation).toBe(5000);
  });

  it('should have world_shaping threshold', () => {
    expect(BELIEF_THRESHOLDS.world_shaping).toBe(10000);
  });

  it('should have ascending thresholds', () => {
    expect(BELIEF_THRESHOLDS.minimum).toBeLessThan(BELIEF_THRESHOLDS.minor_powers);
    expect(BELIEF_THRESHOLDS.minor_powers).toBeLessThan(BELIEF_THRESHOLDS.moderate_powers);
    expect(BELIEF_THRESHOLDS.moderate_powers).toBeLessThan(BELIEF_THRESHOLDS.angel_creation);
    expect(BELIEF_THRESHOLDS.angel_creation).toBeLessThan(BELIEF_THRESHOLDS.avatar_creation);
    expect(BELIEF_THRESHOLDS.avatar_creation).toBeLessThan(BELIEF_THRESHOLDS.world_shaping);
  });
});

// ============================================================================
// DEFAULT_BELIEF_DECAY Tests
// ============================================================================

describe('DEFAULT_BELIEF_DECAY', () => {
  it('should have normal decay rate', () => {
    expect(DEFAULT_BELIEF_DECAY.normalDecayRate).toBe(0.001);
  });

  it('should have higher no-activity decay rate', () => {
    expect(DEFAULT_BELIEF_DECAY.noActivityDecayRate).toBe(0.005);
    expect(DEFAULT_BELIEF_DECAY.noActivityDecayRate).toBeGreaterThan(
      DEFAULT_BELIEF_DECAY.normalDecayRate
    );
  });

  it('should have no-activity threshold of 24 hours', () => {
    expect(DEFAULT_BELIEF_DECAY.noActivityThreshold).toBe(24);
  });

  it('should have critical decay rate', () => {
    expect(DEFAULT_BELIEF_DECAY.criticalDecayRate).toBe(0.02);
    expect(DEFAULT_BELIEF_DECAY.criticalDecayRate).toBeGreaterThan(
      DEFAULT_BELIEF_DECAY.noActivityDecayRate
    );
  });

  it('should have myth persistence floor', () => {
    expect(DEFAULT_BELIEF_DECAY.mythPersistenceFloor).toBe(1);
  });

  it('should have all fields as positive numbers', () => {
    const config: BeliefDecayConfig = DEFAULT_BELIEF_DECAY;
    expect(config.normalDecayRate).toBeGreaterThan(0);
    expect(config.noActivityDecayRate).toBeGreaterThan(0);
    expect(config.noActivityThreshold).toBeGreaterThan(0);
    expect(config.criticalDecayRate).toBeGreaterThan(0);
    expect(config.mythPersistenceFloor).toBeGreaterThan(0);
  });
});

// ============================================================================
// createInitialBeliefState Tests
// ============================================================================

describe('createInitialBeliefState', () => {
  it('should create state with default zero belief', () => {
    const state = createInitialBeliefState();
    expect(state.currentBelief).toBe(0);
  });

  it('should create state with provided initial belief', () => {
    const state = createInitialBeliefState(500);
    expect(state.currentBelief).toBe(500);
  });

  it('should initialize belief rates to zero', () => {
    const state = createInitialBeliefState(100);
    expect(state.beliefPerHour).toBe(0);
    expect(state.peakBeliefRate).toBe(0);
  });

  it('should set totalBeliefEarned to initial belief', () => {
    const state = createInitialBeliefState(1000);
    expect(state.totalBeliefEarned).toBe(1000);
  });

  it('should initialize totalBeliefSpent to zero', () => {
    const state = createInitialBeliefState(500);
    expect(state.totalBeliefSpent).toBe(0);
  });

  it('should set manifestation threshold from constants', () => {
    const state = createInitialBeliefState();
    expect(state.manifestationThreshold).toBe(BELIEF_THRESHOLDS.minor_powers);
  });

  it('should set avatar threshold from constants', () => {
    const state = createInitialBeliefState();
    expect(state.avatarThreshold).toBe(BELIEF_THRESHOLDS.avatar_creation);
  });

  it('should set decay rate from defaults', () => {
    const state = createInitialBeliefState();
    expect(state.decayRate).toBe(DEFAULT_BELIEF_DECAY.normalDecayRate);
  });

  it('should set lastActivityTime to now', () => {
    const before = Date.now();
    const state = createInitialBeliefState();
    const after = Date.now();

    expect(state.lastActivityTime).toBeGreaterThanOrEqual(before);
    expect(state.lastActivityTime).toBeLessThanOrEqual(after);
  });

  describe('fading risk', () => {
    it('should set fadingRisk true when below minimum', () => {
      const state = createInitialBeliefState(5);
      expect(state.fadingRisk).toBe(true);
    });

    it('should set fadingRisk true when at zero', () => {
      const state = createInitialBeliefState(0);
      expect(state.fadingRisk).toBe(true);
    });

    it('should set fadingRisk false when at minimum', () => {
      const state = createInitialBeliefState(10);
      expect(state.fadingRisk).toBe(false);
    });

    it('should set fadingRisk false when above minimum', () => {
      const state = createInitialBeliefState(100);
      expect(state.fadingRisk).toBe(false);
    });
  });
});

// ============================================================================
// calculateBeliefGeneration Tests
// ============================================================================

describe('calculateBeliefGeneration', () => {
  describe('base calculation', () => {
    it('should return base rate * faith for no modifiers', () => {
      const result = calculateBeliefGeneration('prayer', 1.0);
      expect(result).toBe(BELIEF_GENERATION_RATES.prayer);
    });

    it('should scale with faith level', () => {
      const fullFaith = calculateBeliefGeneration('prayer', 1.0);
      const halfFaith = calculateBeliefGeneration('prayer', 0.5);

      expect(halfFaith).toBe(fullFaith * 0.5);
    });

    it('should return zero for zero faith', () => {
      const result = calculateBeliefGeneration('ritual', 0);
      expect(result).toBe(0);
    });
  });

  describe('different activities', () => {
    it('should use correct base rate for passive_faith', () => {
      const result = calculateBeliefGeneration('passive_faith', 1.0);
      expect(result).toBe(0.01);
    });

    it('should use correct base rate for meditation', () => {
      const result = calculateBeliefGeneration('meditation', 1.0);
      expect(result).toBe(0.15);
    });

    it('should use correct base rate for miracle_witness', () => {
      const result = calculateBeliefGeneration('miracle_witness', 1.0);
      expect(result).toBe(5.0);
    });
  });

  describe('sacred site bonus', () => {
    it('should apply sacred site bonus', () => {
      const base = calculateBeliefGeneration('prayer', 1.0);
      const withSite = calculateBeliefGeneration('prayer', 1.0, { sacredSiteBonus: 0.5 });

      expect(withSite).toBe(base * 1.5);
    });

    it('should handle 100% sacred site bonus', () => {
      const base = calculateBeliefGeneration('ritual', 1.0);
      const withSite = calculateBeliefGeneration('ritual', 1.0, { sacredSiteBonus: 1.0 });

      expect(withSite).toBe(base * 2.0);
    });
  });

  describe('communal bonus', () => {
    it('should apply communal bonus', () => {
      const base = calculateBeliefGeneration('ritual', 1.0);
      const withCommunal = calculateBeliefGeneration('ritual', 1.0, { communalBonus: 0.3 });

      expect(withCommunal).toBe(base * 1.3);
    });
  });

  describe('fervor multiplier', () => {
    it('should apply fervor multiplier', () => {
      const base = calculateBeliefGeneration('prayer', 1.0);
      const withFervor = calculateBeliefGeneration('prayer', 1.0, { fervorMultiplier: 2.0 });

      expect(withFervor).toBe(base * 2.0);
    });

    it('should default to 1.0 fervor multiplier', () => {
      const noMods = calculateBeliefGeneration('prayer', 1.0);
      const withDefault = calculateBeliefGeneration('prayer', 1.0, {});

      expect(noMods).toBe(withDefault);
    });
  });

  describe('combined modifiers', () => {
    it('should combine all bonuses correctly', () => {
      // Formula: baseRate * faith * (1 + sacredSiteBonus + communalBonus) * fervorMultiplier
      // prayer base rate = 0.1
      // faith = 0.8
      // sacredSiteBonus = 0.5
      // communalBonus = 0.3
      // fervorMultiplier = 2.0
      // = 0.1 * 0.8 * (1 + 0.5 + 0.3) * 2.0
      // = 0.1 * 0.8 * 1.8 * 2.0
      // = 0.288

      const result = calculateBeliefGeneration('prayer', 0.8, {
        sacredSiteBonus: 0.5,
        communalBonus: 0.3,
        fervorMultiplier: 2.0,
      });

      expect(result).toBeCloseTo(0.288);
    });

    it('should handle multiple high bonuses', () => {
      const result = calculateBeliefGeneration('miracle_witness', 1.0, {
        sacredSiteBonus: 1.0,
        communalBonus: 1.0,
        fervorMultiplier: 3.0,
      });

      // 5.0 * 1.0 * (1 + 1.0 + 1.0) * 3.0 = 5.0 * 3 * 3 = 45.0
      expect(result).toBe(45.0);
    });
  });

  describe('edge cases', () => {
    it('should handle faith > 1.0 (super devoted)', () => {
      const normal = calculateBeliefGeneration('prayer', 1.0);
      const superDevoted = calculateBeliefGeneration('prayer', 1.5);

      expect(superDevoted).toBe(normal * 1.5);
    });

    it('should handle very small faith values', () => {
      const result = calculateBeliefGeneration('ritual', 0.01);
      expect(result).toBeCloseTo(BELIEF_GENERATION_RATES.ritual * 0.01);
    });

    it('should handle negative bonuses (heresy)', () => {
      const result = calculateBeliefGeneration('prayer', 1.0, { sacredSiteBonus: -0.5 });
      expect(result).toBe(BELIEF_GENERATION_RATES.prayer * 0.5);
    });
  });
});

// ============================================================================
// Type Structure Tests
// ============================================================================

describe('type structures', () => {
  describe('DeityBeliefState', () => {
    it('should accept valid belief state', () => {
      const state: DeityBeliefState = {
        currentBelief: 500,
        beliefPerHour: 10,
        peakBeliefRate: 15,
        totalBeliefEarned: 1000,
        totalBeliefSpent: 500,
        manifestationThreshold: 100,
        avatarThreshold: 5000,
        decayRate: 0.001,
        lastActivityTime: Date.now(),
        fadingRisk: false,
      };

      expect(state.currentBelief).toBe(500);
      expect(state.fadingRisk).toBe(false);
    });
  });

  describe('BeliefActivity', () => {
    it('should accept all valid activity types', () => {
      const activities: BeliefActivity[] = [
        'passive_faith',
        'prayer',
        'meditation',
        'ritual',
        'sacrifice',
        'pilgrimage',
        'proselytizing',
        'creation',
        'miracle_witness',
      ];

      expect(activities).toHaveLength(9);
    });
  });

  describe('BeliefDecayConfig', () => {
    it('should accept valid decay config', () => {
      const config: BeliefDecayConfig = {
        normalDecayRate: 0.002,
        noActivityDecayRate: 0.01,
        noActivityThreshold: 48,
        criticalDecayRate: 0.05,
        mythPersistenceFloor: 5,
      };

      expect(config.normalDecayRate).toBe(0.002);
      expect(config.noActivityThreshold).toBe(48);
    });
  });
});

// ============================================================================
// Gameplay Scenario Tests
// ============================================================================

describe('gameplay scenarios', () => {
  it('should demonstrate belief growth through prayer', () => {
    // Simulate a devoted villager praying at a temple
    const faith = 0.9;
    const sacredSiteBonus = 0.5; // Temple bonus

    const hourlyBelief = calculateBeliefGeneration('prayer', faith, { sacredSiteBonus });

    // Expected: 0.1 * 0.9 * 1.5 = 0.135 per hour
    expect(hourlyBelief).toBeCloseTo(0.135);

    // After 10 hours of prayer
    const totalBelief = hourlyBelief * 10;
    expect(totalBelief).toBeCloseTo(1.35);
  });

  it('should demonstrate mass ritual belief generation', () => {
    // Simulate 10 villagers in a group ritual at a temple
    const faith = 0.7;
    const sacredSiteBonus = 0.5;
    const communalBonus = 0.5; // Group bonus
    const numParticipants = 10;

    const perPerson = calculateBeliefGeneration('ritual', faith, {
      sacredSiteBonus,
      communalBonus,
    });

    const totalPerHour = perPerson * numParticipants;

    // 0.3 * 0.7 * 2.0 * 10 = 4.2 per hour
    expect(totalPerHour).toBeCloseTo(4.2);
  });

  it('should demonstrate miracle witness faith surge', () => {
    // When a deity performs a miracle, witnesses get huge belief boost
    const witnesses = 50;
    const averageFaith = 0.6;
    const fervorMultiplier = 2.0; // Religious fervor after miracle

    const perWitness = calculateBeliefGeneration('miracle_witness', averageFaith, {
      fervorMultiplier,
    });

    const totalSurge = perWitness * witnesses;

    // 5.0 * 0.6 * 2.0 * 50 = 300 belief instant
    expect(totalSurge).toBe(300);
  });

  it('should demonstrate belief decay endangering a god', () => {
    // A god with low followers starts to fade
    const state = createInitialBeliefState(15);

    // Just above minimum
    expect(state.fadingRisk).toBe(false);

    // Simulate decay
    const hoursOfNeglect = 100;
    const decayPerHour = DEFAULT_BELIEF_DECAY.noActivityDecayRate;
    const beliefLost = state.currentBelief * decayPerHour * hoursOfNeglect;

    const remainingBelief = state.currentBelief - beliefLost;

    // 15 * 0.005 * 100 = 7.5 lost
    expect(beliefLost).toBeCloseTo(7.5);
    expect(remainingBelief).toBeCloseTo(7.5);

    // Would now be at risk of fading
    expect(remainingBelief).toBeLessThan(BELIEF_THRESHOLDS.minimum);
  });
});
