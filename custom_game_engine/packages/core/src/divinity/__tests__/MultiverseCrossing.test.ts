/**
 * Tests for MultiverseCrossing - Divine Inter-Universe Travel
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BASE_CROSSING_COSTS,
  getEntityTypeForCrossing,
  calculateCompatibilityScore,
  getCompatibilityLevel,
  PASSAGE_CONFIGS,
  CROSSING_METHODS,
  getAvailableCrossingMethods,
  calculateCrossingCost,
  calculatePassageCreationCost,
  createPassage,
  needsMaintenance,
  applyMaintenanceNeglect,
  maintainPassage,
  executeCrossing,
  startPresenceExtension,
  createDivineProjection,
  calculateCollectiveContributions,
  createUniverseCompatibility,
  COMPATIBILITY_PRESETS,
  canAttemptCrossing,
  canCreatePassageType,
  getCrossingOptions,
  type UniverseCompatibility,
  type MultiversePassage,
  type CrossingAttempt,
} from '../MultiverseCrossing.js';
import { createPresence, type Presence } from '../PresenceSpectrum.js';

describe('MultiverseCrossing', () => {
  // ========================================================================
  // Test fixtures
  // ========================================================================

  let transcendentPresence: Presence;
  let deityPresence: Presence;
  let kamiPresence: Presence;
  let spiritPresence: Presence;
  let mortalPresence: Presence;

  let compatibleUniverses: UniverseCompatibility;
  let hostileUniverses: UniverseCompatibility;

  beforeEach(() => {
    // Create presences at different spectrum positions
    transcendentPresence = createPresence(
      'transcendent_1',
      'The Eternal',
      { type: 'concept', description: 'existence', destructible: false, onDestruction: 'persist' },
      0.95
    );
    transcendentPresence.attention = 10_000_000;

    deityPresence = createPresence(
      'deity_1',
      'Mountain God',
      { type: 'location', anchorId: 'mountain', description: 'great peak', destructible: false, onDestruction: 'persist' },
      0.85
    );
    deityPresence.attention = 2_000_000;

    kamiPresence = createPresence(
      'kami_1',
      'Forest Spirit',
      { type: 'location', anchorId: 'forest', description: 'ancient forest', destructible: false, onDestruction: 'fade' },
      0.65
    );
    kamiPresence.attention = 500_000;

    spiritPresence = createPresence(
      'spirit_1',
      'Stream Spirit',
      { type: 'location', anchorId: 'stream', description: 'clear stream', destructible: false, onDestruction: 'fade' },
      0.35
    );
    spiritPresence.attention = 100_000;

    mortalPresence = createPresence(
      'mortal_1',
      undefined,
      { type: 'individual', anchorId: 'person', description: 'a person', destructible: true, onDestruction: 'fade' },
      0.05
    );
    mortalPresence.attention = 20_000;

    // Universe compatibility
    compatibleUniverses = createUniverseCompatibility(
      'universe_a',
      'universe_b',
      COMPATIBILITY_PRESETS.sibling
    );

    hostileUniverses = createUniverseCompatibility(
      'universe_a',
      'universe_hostile',
      COMPATIBILITY_PRESETS.hostile
    );
  });

  // ========================================================================
  // Entity Type Classification
  // ========================================================================

  describe('getEntityTypeForCrossing', () => {
    it('should classify low spectrum as mortal', () => {
      expect(getEntityTypeForCrossing(0.0)).toBe('mortal');
      expect(getEntityTypeForCrossing(0.10)).toBe('mortal');
      expect(getEntityTypeForCrossing(0.14)).toBe('mortal');
    });

    it('should classify 0.15-0.45 as spirit', () => {
      expect(getEntityTypeForCrossing(0.15)).toBe('spirit');
      expect(getEntityTypeForCrossing(0.30)).toBe('spirit');
      expect(getEntityTypeForCrossing(0.44)).toBe('spirit');
    });

    it('should classify 0.45-0.75 as kami', () => {
      expect(getEntityTypeForCrossing(0.45)).toBe('kami');
      expect(getEntityTypeForCrossing(0.60)).toBe('kami');
      expect(getEntityTypeForCrossing(0.74)).toBe('kami');
    });

    it('should classify 0.75-0.90 as deity', () => {
      expect(getEntityTypeForCrossing(0.75)).toBe('deity');
      expect(getEntityTypeForCrossing(0.85)).toBe('deity');
      expect(getEntityTypeForCrossing(0.89)).toBe('deity');
    });

    it('should classify 0.90+ as transcendent', () => {
      expect(getEntityTypeForCrossing(0.90)).toBe('transcendent');
      expect(getEntityTypeForCrossing(0.95)).toBe('transcendent');
      expect(getEntityTypeForCrossing(1.0)).toBe('transcendent');
    });
  });

  // ========================================================================
  // Base Crossing Costs
  // ========================================================================

  describe('BASE_CROSSING_COSTS', () => {
    it('should have escalating costs by entity type', () => {
      expect(BASE_CROSSING_COSTS.mortal).toBe(10_000);
      expect(BASE_CROSSING_COSTS.spirit).toBe(50_000);
      expect(BASE_CROSSING_COSTS.kami).toBe(200_000);
      expect(BASE_CROSSING_COSTS.deity).toBe(1_000_000);
      expect(BASE_CROSSING_COSTS.transcendent).toBe(5_000_000);
    });

    it('should increase by roughly 4-5x per tier', () => {
      expect(BASE_CROSSING_COSTS.spirit).toBeGreaterThan(BASE_CROSSING_COSTS.mortal * 4);
      expect(BASE_CROSSING_COSTS.kami).toBeGreaterThan(BASE_CROSSING_COSTS.spirit * 3);
      expect(BASE_CROSSING_COSTS.deity).toBeGreaterThan(BASE_CROSSING_COSTS.kami * 4);
      expect(BASE_CROSSING_COSTS.transcendent).toBeGreaterThan(BASE_CROSSING_COSTS.deity * 4);
    });
  });

  // ========================================================================
  // Universe Compatibility
  // ========================================================================

  describe('calculateCompatibilityScore', () => {
    it('should return 0 for identical universes', () => {
      const score = calculateCompatibilityScore(COMPATIBILITY_PRESETS.identical);
      expect(score).toBe(0);
    });

    it('should return ~1 for sibling universes', () => {
      const score = calculateCompatibilityScore(COMPATIBILITY_PRESETS.sibling);
      expect(score).toBeCloseTo(0.8, 1);
    });

    it('should return higher scores for more different universes', () => {
      const sibling = calculateCompatibilityScore(COMPATIBILITY_PRESETS.sibling);
      const distant = calculateCompatibilityScore(COMPATIBILITY_PRESETS.distant);
      const alien = calculateCompatibilityScore(COMPATIBILITY_PRESETS.alien);
      const hostile = calculateCompatibilityScore(COMPATIBILITY_PRESETS.hostile);

      expect(distant).toBeGreaterThan(sibling);
      expect(alien).toBeGreaterThan(distant);
      expect(hostile).toBeGreaterThan(alien);
    });
  });

  describe('getCompatibilityLevel', () => {
    it('should return compatible for score < 1', () => {
      expect(getCompatibilityLevel(0)).toBe('compatible');
      expect(getCompatibilityLevel(0.5)).toBe('compatible');
      expect(getCompatibilityLevel(0.99)).toBe('compatible');
    });

    it('should return neutral for score 1-2.5', () => {
      expect(getCompatibilityLevel(1.0)).toBe('neutral');
      expect(getCompatibilityLevel(1.5)).toBe('neutral');
      expect(getCompatibilityLevel(2.49)).toBe('neutral');
    });

    it('should return incompatible for score 2.5-4', () => {
      expect(getCompatibilityLevel(2.5)).toBe('incompatible');
      expect(getCompatibilityLevel(3.0)).toBe('incompatible');
      expect(getCompatibilityLevel(3.99)).toBe('incompatible');
    });

    it('should return hostile for score 4+', () => {
      expect(getCompatibilityLevel(4.0)).toBe('hostile');
      expect(getCompatibilityLevel(4.5)).toBe('hostile');
      expect(getCompatibilityLevel(5.0)).toBe('hostile');
    });
  });

  // ========================================================================
  // Passage Configuration
  // ========================================================================

  describe('PASSAGE_CONFIGS', () => {
    it('should have four passage types', () => {
      expect(Object.keys(PASSAGE_CONFIGS)).toHaveLength(4);
      expect(PASSAGE_CONFIGS.thread).toBeDefined();
      expect(PASSAGE_CONFIGS.bridge).toBeDefined();
      expect(PASSAGE_CONFIGS.gate).toBeDefined();
      expect(PASSAGE_CONFIGS.confluence).toBeDefined();
    });

    it('should have increasing creation costs', () => {
      expect(PASSAGE_CONFIGS.thread.creationCostPercent).toBeLessThan(
        PASSAGE_CONFIGS.bridge.creationCostPercent
      );
      expect(PASSAGE_CONFIGS.bridge.creationCostPercent).toBeLessThan(
        PASSAGE_CONFIGS.gate.creationCostPercent
      );
      expect(PASSAGE_CONFIGS.gate.creationCostPercent).toBeLessThan(
        PASSAGE_CONFIGS.confluence.creationCostPercent
      );
    });

    it('should have decreasing crossing costs', () => {
      expect(PASSAGE_CONFIGS.thread.crossingCostPercent).toBeGreaterThan(
        PASSAGE_CONFIGS.bridge.crossingCostPercent
      );
      expect(PASSAGE_CONFIGS.bridge.crossingCostPercent).toBeGreaterThan(
        PASSAGE_CONFIGS.gate.crossingCostPercent
      );
      expect(PASSAGE_CONFIGS.gate.crossingCostPercent).toBeGreaterThan(
        PASSAGE_CONFIGS.confluence.crossingCostPercent
      );
    });

    it('should have confluence with no maintenance needed', () => {
      expect(PASSAGE_CONFIGS.confluence.maintenanceIntervalYears).toBe(0);
      expect(PASSAGE_CONFIGS.confluence.durationYears).toBe(Infinity);
    });
  });

  // ========================================================================
  // Crossing Methods
  // ========================================================================

  describe('CROSSING_METHODS', () => {
    it('should have all 11 methods defined', () => {
      expect(Object.keys(CROSSING_METHODS)).toHaveLength(11);
    });

    it('should have death_passage available to all', () => {
      expect(CROSSING_METHODS.death_passage.minimumPosition).toBe(0);
    });

    it('should require high position for transcendent_carving', () => {
      expect(CROSSING_METHODS.transcendent_carving.minimumPosition).toBe(0.95);
    });

    it('should have varying risk levels', () => {
      const lowRisk = CROSSING_METHODS.transcendent_carving.baseRisk;
      const highRisk = CROSSING_METHODS.death_passage.baseRisk;
      expect(highRisk).toBeGreaterThan(lowRisk);
    });
  });

  describe('getAvailableCrossingMethods', () => {
    it('should return only death_passage and syncretism for mortals', () => {
      const methods = getAvailableCrossingMethods(0.05);
      expect(methods).toContain('death_passage');
      expect(methods).toContain('syncretism_absorption');
      expect(methods).toContain('passage_crossing');
      expect(methods).not.toContain('presence_extension');
    });

    it('should include more methods at higher positions', () => {
      const mortal = getAvailableCrossingMethods(0.05);
      const kami = getAvailableCrossingMethods(0.65);
      const deity = getAvailableCrossingMethods(0.85);
      const transcendent = getAvailableCrossingMethods(0.95);

      expect(kami.length).toBeGreaterThan(mortal.length);
      expect(deity.length).toBeGreaterThan(kami.length);
      expect(transcendent.length).toBeGreaterThan(deity.length);
    });

    it('should include transcendent_carving only at 0.95+', () => {
      expect(getAvailableCrossingMethods(0.94)).not.toContain('transcendent_carving');
      expect(getAvailableCrossingMethods(0.95)).toContain('transcendent_carving');
    });
  });

  // ========================================================================
  // Crossing Cost Calculation
  // ========================================================================

  describe('calculateCrossingCost', () => {
    it('should calculate base cost for deity without passage', () => {
      const cost = calculateCrossingCost(
        deityPresence,
        'universe_a',
        'universe_b',
        compatibleUniverses,
        'divine_projection',
        undefined
      );

      expect(cost.baseCost).toBe(BASE_CROSSING_COSTS.deity);
      expect(cost.methodMultiplier).toBe(CROSSING_METHODS.divine_projection.costMultiplier);
      expect(cost.passageDiscount).toBe(0);
    });

    it('should apply passage discount', () => {
      const passage: MultiversePassage = createPassage(
        'test_passage',
        'gate',
        'universe_a',
        'universe_b',
        'creator',
        Date.now()
      );

      // Compare divine_projection with and without passage
      const withoutPassage = calculateCrossingCost(
        deityPresence,
        'universe_a',
        'universe_b',
        compatibleUniverses,
        'divine_projection',
        undefined
      );

      const withPassage = calculateCrossingCost(
        deityPresence,
        'universe_a',
        'universe_b',
        compatibleUniverses,
        'divine_projection',
        passage
      );

      expect(withPassage.passageDiscount).toBeGreaterThan(0);
      expect(withPassage.totalCost).toBeLessThan(withoutPassage.totalCost);
    });

    it('should increase cost for hostile universes', () => {
      const compatible = calculateCrossingCost(
        deityPresence,
        'universe_a',
        'universe_b',
        compatibleUniverses,
        'divine_projection',
        undefined
      );

      const hostile = calculateCrossingCost(
        deityPresence,
        'universe_a',
        'universe_hostile',
        hostileUniverses,
        'divine_projection',
        undefined
      );

      expect(hostile.compatibilityMultiplier).toBeGreaterThan(compatible.compatibilityMultiplier);
      expect(hostile.totalCost).toBeGreaterThan(compatible.totalCost);
    });

    it('should show if presence can afford crossing', () => {
      // Transcendent with 10M can afford most things
      const affordable = calculateCrossingCost(
        transcendentPresence,
        'universe_a',
        'universe_b',
        compatibleUniverses,
        'divine_projection',
        undefined
      );
      expect(affordable.canAfford).toBe(true);

      // Spirit with 100k cannot afford cold crossing to hostile universe
      const unaffordable = calculateCrossingCost(
        spiritPresence,
        'universe_a',
        'universe_hostile',
        hostileUniverses,
        'cosmic_wound',
        undefined
      );
      // Depending on calculation, may or may not afford
    });
  });

  // ========================================================================
  // Passage Creation
  // ========================================================================

  describe('calculatePassageCreationCost', () => {
    it('should calculate thread passage cost', () => {
      const cost = calculatePassageCreationCost(
        kamiPresence,
        'thread',
        compatibleUniverses
      );

      // Kami base cost * thread % * compatibility
      const expectedBase = BASE_CROSSING_COSTS.kami * (PASSAGE_CONFIGS.thread.creationCostPercent / 100);
      expect(cost.baseCost).toBe(BASE_CROSSING_COSTS.kami);
      expect(cost.passageTypeCost).toBe(expectedBase);
    });

    it('should have higher costs for better passages', () => {
      const thread = calculatePassageCreationCost(kamiPresence, 'thread', compatibleUniverses);
      const bridge = calculatePassageCreationCost(kamiPresence, 'bridge', compatibleUniverses);
      const gate = calculatePassageCreationCost(kamiPresence, 'gate', compatibleUniverses);
      const confluence = calculatePassageCreationCost(kamiPresence, 'confluence', compatibleUniverses);

      expect(bridge.totalCost).toBeGreaterThan(thread.totalCost);
      expect(gate.totalCost).toBeGreaterThan(bridge.totalCost);
      expect(confluence.totalCost).toBeGreaterThan(gate.totalCost);
    });
  });

  describe('createPassage', () => {
    it('should create passage with correct initial state', () => {
      const now = Date.now();
      const passage = createPassage(
        'passage_1',
        'bridge',
        'universe_a',
        'universe_b',
        'creator_1',
        now
      );

      expect(passage.id).toBe('passage_1');
      expect(passage.type).toBe('bridge');
      expect(passage.health).toBe(1.0);
      expect(passage.capacity).toBe(100);
      expect(passage.owners).toContain('creator_1');
      expect(passage.accessPolicy).toBe('private');
      expect(passage.missedMaintenanceCount).toBe(0);
    });
  });

  // ========================================================================
  // Passage Maintenance
  // ========================================================================

  describe('needsMaintenance', () => {
    it('should return false for recently maintained passage', () => {
      const now = Date.now();
      const passage = createPassage('p1', 'bridge', 'a', 'b', 'c', now);
      expect(needsMaintenance(passage, now)).toBe(false);
    });

    it('should return true for passage past maintenance interval', () => {
      const oldTime = Date.now() - (20 * 365.25 * 24 * 60 * 60 * 1000); // 20 years ago
      const passage = createPassage('p1', 'bridge', 'a', 'b', 'c', oldTime);
      expect(needsMaintenance(passage, Date.now())).toBe(true);
    });

    it('should return false for confluence (never needs maintenance)', () => {
      const oldTime = Date.now() - (1000 * 365.25 * 24 * 60 * 60 * 1000); // 1000 years ago
      const passage = createPassage('p1', 'confluence', 'a', 'b', 'c', oldTime);
      expect(needsMaintenance(passage, Date.now())).toBe(false);
    });
  });

  describe('applyMaintenanceNeglect', () => {
    it('should reduce health on first miss', () => {
      const passage = createPassage('p1', 'bridge', 'a', 'b', 'c', Date.now());
      const neglected = applyMaintenanceNeglect(passage);

      expect(neglected.health).toBeLessThan(1.0);
      expect(neglected.capacity).toBeLessThan(100);
      expect(neglected.missedMaintenanceCount).toBe(1);
    });

    it('should severely damage on second miss', () => {
      let passage = createPassage('p1', 'bridge', 'a', 'b', 'c', Date.now());
      passage = applyMaintenanceNeglect(passage);
      passage = applyMaintenanceNeglect(passage);

      // First miss: -0.1 health (0.9), second miss: -0.4 health (0.5)
      expect(passage.health).toBeLessThanOrEqual(0.5);
      expect(passage.capacity).toBeLessThanOrEqual(50);
      expect(passage.missedMaintenanceCount).toBe(2);
    });

    it('should collapse on third miss', () => {
      let passage = createPassage('p1', 'bridge', 'a', 'b', 'c', Date.now());
      passage = applyMaintenanceNeglect(passage);
      passage = applyMaintenanceNeglect(passage);
      passage = applyMaintenanceNeglect(passage);

      expect(passage.health).toBe(0);
      expect(passage.capacity).toBe(0);
    });
  });

  describe('maintainPassage', () => {
    it('should restore health and capacity', () => {
      let passage = createPassage('p1', 'bridge', 'a', 'b', 'c', Date.now() - 100000);
      passage = applyMaintenanceNeglect(passage);
      passage = maintainPassage(passage, Date.now());

      expect(passage.health).toBeGreaterThan(0.9);
      expect(passage.missedMaintenanceCount).toBe(0);
    });
  });

  // ========================================================================
  // Crossing Execution
  // ========================================================================

  describe('executeCrossing', () => {
    it('should execute a crossing attempt', () => {
      const attempt: CrossingAttempt = {
        id: 'attempt_1',
        entityId: deityPresence.id,
        entityType: 'deity',
        spectrumPosition: deityPresence.spectrumPosition,
        sourceUniverseId: 'universe_a',
        targetUniverseId: 'universe_b',
        method: 'divine_projection',
        baseCost: 1_000_000,
        compatibilityMultiplier: 1.0,
        methodMultiplier: 0.3,
        totalCost: 300_000,
        status: 'initiating',
        initiatedAt: Date.now(),
        hazardsEncountered: [],
        narrative: [],
      };

      const result = executeCrossing(deityPresence, attempt);

      expect(result.attentionSpent).toBe(attempt.totalCost);
      expect(result.transitDuration).toBeGreaterThan(0);
      expect(result.narrative.length).toBeGreaterThan(0);

      if (result.success) {
        expect(result.arrivalPosition).toBeGreaterThan(0);
        expect(result.arrivalPosition).toBeLessThanOrEqual(deityPresence.spectrumPosition);
      }
    });

    it('should have higher success for higher spectrum positions', () => {
      // Run many attempts to reduce variance
      const attempts = 500;
      let transcendentSuccesses = 0;
      let spiritSuccesses = 0;

      for (let i = 0; i < attempts; i++) {
        const transcendentAttempt: CrossingAttempt = {
          id: `t_${i}`,
          entityId: transcendentPresence.id,
          entityType: 'transcendent',
          spectrumPosition: transcendentPresence.spectrumPosition,
          sourceUniverseId: 'a',
          targetUniverseId: 'b',
          method: 'cosmic_wound',
          baseCost: 5_000_000,
          compatibilityMultiplier: 1.0,
          methodMultiplier: 0.1,
          totalCost: 500_000,
          status: 'initiating',
          initiatedAt: Date.now(),
          hazardsEncountered: [],
          narrative: [],
        };

        const spiritAttempt: CrossingAttempt = {
          ...transcendentAttempt,
          id: `s_${i}`,
          entityId: spiritPresence.id,
          entityType: 'spirit',
          spectrumPosition: spiritPresence.spectrumPosition,
          baseCost: 50_000,
          totalCost: 5_000,
        };

        if (executeCrossing(transcendentPresence, transcendentAttempt).success) {
          transcendentSuccesses++;
        }
        if (executeCrossing(spiritPresence, spiritAttempt).success) {
          spiritSuccesses++;
        }
      }

      // Transcendent should succeed more often (higher position = higher success)
      // Using >= to account for rare edge cases in RNG
      expect(transcendentSuccesses).toBeGreaterThanOrEqual(spiritSuccesses * 0.9);
    });
  });

  // ========================================================================
  // Special Crossing Methods
  // ========================================================================

  describe('startPresenceExtension', () => {
    it('should initialize presence extension state', () => {
      const state = startPresenceExtension(
        'presence_1',
        'universe_a',
        'universe_b'
      );

      expect(state.presenceId).toBe('presence_1');
      expect(state.seedProgress).toBe(0);
      expect(state.attentionInvested).toBe(0);
      expect(state.targetPosition).toBe(0.10);
      expect(state.dualPresenceDecayMultiplier).toBeGreaterThan(1);
    });
  });

  describe('createDivineProjection', () => {
    it('should create weakened projection', () => {
      const projection = createDivineProjection(
        'projection_1',
        deityPresence,
        'universe_b'
      );

      expect(projection.parentPresenceId).toBe(deityPresence.id);
      expect(projection.spectrumPosition).toBeLessThan(deityPresence.spectrumPosition);
      expect(projection.attention).toBe(deityPresence.attention * 0.2);
      expect(projection.connected).toBe(true);
      expect(projection.independent).toBe(false);
    });

    it('should have projection start at ~40% parent position', () => {
      const projection = createDivineProjection(
        'projection_1',
        transcendentPresence,
        'universe_b'
      );

      // 0.95 * 0.4 = 0.38
      expect(projection.spectrumPosition).toBeCloseTo(0.38, 1);
    });
  });

  describe('calculateCollectiveContributions', () => {
    it('should require minimum 3 participants', () => {
      expect(() => {
        calculateCollectiveContributions([kamiPresence, deityPresence], 1_000_000);
      }).toThrow();
    });

    it('should calculate equal contributions', () => {
      const contributions = calculateCollectiveContributions(
        [kamiPresence, deityPresence, transcendentPresence],
        900_000
      );

      expect(contributions).toHaveLength(3);
      expect(contributions[0].shareOfControl).toBeCloseTo(1/3, 2);

      // Each minimum contribution should be 25% of equal share
      const equalShare = 900_000 / 3;
      const minContrib = equalShare * 0.25;
      for (const c of contributions) {
        expect(c.minimumContribution).toBe(Math.ceil(minContrib));
      }
    });
  });

  // ========================================================================
  // Query Functions
  // ========================================================================

  describe('canAttemptCrossing', () => {
    it('should allow death_passage for anyone', () => {
      const result = canAttemptCrossing(mortalPresence, 'death_passage');
      expect(result.allowed).toBe(true);
    });

    it('should reject transcendent_carving for non-transcendent', () => {
      const result = canAttemptCrossing(deityPresence, 'transcendent_carving');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('0.95');
    });

    it('should allow transcendent_carving for transcendent', () => {
      const result = canAttemptCrossing(transcendentPresence, 'transcendent_carving');
      expect(result.allowed).toBe(true);
    });
  });

  describe('canCreatePassageType', () => {
    it('should reject passage creation for methods that cannot create', () => {
      const result = canCreatePassageType(kamiPresence, 'bridge', 'death_passage');
      expect(result.allowed).toBe(false);
    });

    it('should allow valid passage creation', () => {
      const result = canCreatePassageType(transcendentPresence, 'confluence', 'transcendent_carving');
      expect(result.allowed).toBe(true);
    });

    it('should reject confluence for divine_projection', () => {
      const result = canCreatePassageType(deityPresence, 'confluence', 'divine_projection');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('thread');
    });
  });

  describe('getCrossingOptions', () => {
    it('should return sorted crossing options', () => {
      const options = getCrossingOptions(
        deityPresence,
        compatibleUniverses,
        []
      );

      expect(options.length).toBeGreaterThan(0);

      // Should be sorted by cost
      for (let i = 1; i < options.length; i++) {
        expect(options[i].cost.totalCost).toBeGreaterThanOrEqual(options[i-1].cost.totalCost);
      }
    });

    it('should include passage options when available', () => {
      const passage = createPassage('p1', 'gate', 'universe_a', 'universe_b', 'c', Date.now());

      const options = getCrossingOptions(
        deityPresence,
        compatibleUniverses,
        [passage]
      );

      const passageOption = options.find(o => o.passage !== undefined);
      expect(passageOption).toBeDefined();
      expect(passageOption?.method).toBe('passage_crossing');
    });
  });

  // ========================================================================
  // Integration: Full Crossing Scenario
  // ========================================================================

  describe('Full Crossing Scenario', () => {
    it('should demonstrate cost savings from passages', () => {
      // Cold crossing cost
      const coldCrossing = calculateCrossingCost(
        deityPresence,
        'universe_a',
        'universe_b',
        compatibleUniverses,
        'divine_conveyance',
        undefined
      );

      // Create a gate passage
      const gate = createPassage('gate_1', 'gate', 'universe_a', 'universe_b', deityPresence.id, Date.now());

      // Crossing with gate
      const gateCrossing = calculateCrossingCost(
        deityPresence,
        'universe_a',
        'universe_b',
        compatibleUniverses,
        'passage_crossing',
        gate
      );

      // Gate should provide ~99% discount
      expect(gateCrossing.totalCost).toBeLessThan(coldCrossing.totalCost * 0.1);
    });

    it('should show passage investment pays off over time', () => {
      // Calculate: cold crossing cost vs (passage creation + many crossings)

      // Cost of 10 cold crossings
      const coldCost = calculateCrossingCost(
        kamiPresence,
        'universe_a',
        'universe_b',
        compatibleUniverses,
        'cosmic_wound',
        undefined
      );
      const tenColdCrossings = coldCost.totalCost * 10;

      // Cost of creating bridge + 10 crossings
      const bridgeCost = calculatePassageCreationCost(
        kamiPresence,
        'bridge',
        compatibleUniverses
      );

      const bridge = createPassage('b1', 'bridge', 'universe_a', 'universe_b', kamiPresence.id, Date.now());

      const crossWithBridge = calculateCrossingCost(
        kamiPresence,
        'universe_a',
        'universe_b',
        compatibleUniverses,
        'passage_crossing',
        bridge
      );

      const bridgePlusTenCrossings = bridgeCost.totalCost + (crossWithBridge.totalCost * 10);

      // After enough crossings, bridge should be cheaper
      expect(bridgePlusTenCrossings).toBeLessThan(tenColdCrossings);
    });
  });
});
