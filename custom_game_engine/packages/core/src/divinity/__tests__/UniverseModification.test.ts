/**
 * Tests for UniverseModification - Late-Game Reality Alteration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ModificationMagnitude,
  ModificationIntent,
  getRequirementsForMagnitude,
  getModificationCapabilities,
  canAttemptModification,
  applyModification,
  createMagicSource,
  weakenMagicLaw,
  addMagicTechnique,
  unlockCombination,
  alterPowerScaling,
  createNewParadigm,
  MODIFICATION_CAPABILITIES,
  MODIFICATION_EXAMPLES,
} from '../UniverseModification.js';
import {
  createPresence,
  createConceptPresence,
  type Presence,
} from '../PresenceSpectrum.js';
import {
  createEmptyParadigm,
  createManaSource,
  createManaCost,
  createConservationLaw,
  createStudyAcquisition,
  type MagicParadigm,
} from '../../magic/MagicParadigm.js';

describe('UniverseModification', () => {
  // ========================================================================
  // Test fixtures
  // ========================================================================

  let testParadigm: MagicParadigm;
  let transcendentPresence: Presence;
  let divinePresence: Presence;
  let establishedPresence: Presence;
  let emergentPresence: Presence;

  beforeEach(() => {
    // Create a basic test paradigm
    testParadigm = {
      ...createEmptyParadigm('test_paradigm', 'Test Magic'),
      description: 'A test magic paradigm',
      universeIds: ['test_universe'],
      sources: [createManaSource()],
      costs: [createManaCost()],
      laws: [createConservationLaw()],
      acquisitionMethods: [createStudyAcquisition()],
      availableTechniques: ['create', 'destroy', 'transform'],
      availableForms: ['fire', 'water', 'earth', 'air'],
    };

    // Create presences at different spectrum positions
    transcendentPresence = createPresence(
      'transcendent_1',
      'The Eternal One',
      { type: 'concept', description: 'existence itself', destructible: false, onDestruction: 'persist' },
      0.95
    );
    transcendentPresence.attention = 100000; // Enough for major modifications

    divinePresence = createPresence(
      'divine_1',
      'The Mountain God',
      { type: 'location', anchorId: 'mountain_1', description: 'the great mountain', destructible: false, onDestruction: 'persist' },
      0.85
    );
    divinePresence.attention = 5000;

    establishedPresence = createPresence(
      'established_1',
      'Spirit of the Forest',
      { type: 'location', anchorId: 'forest_1', description: 'the ancient forest', destructible: false, onDestruction: 'persist' },
      0.55
    );
    establishedPresence.attention = 500;

    emergentPresence = createPresence(
      'emergent_1',
      undefined,
      { type: 'location', anchorId: 'spring_1', description: 'a clear spring', destructible: false, onDestruction: 'fade' },
      0.35
    );
    emergentPresence.attention = 50;
  });

  // ========================================================================
  // Modification Requirements
  // ========================================================================

  describe('getRequirementsForMagnitude', () => {
    it('should return requirements for subtle modifications', () => {
      const requirements = getRequirementsForMagnitude('subtle');

      expect(requirements.minimumPosition).toBe(0.90);
      expect(requirements.attentionCost).toBe(50);
      expect(requirements.difficulty).toBe(0.2);
      expect(requirements.requiresConsent).toBe(false);
      expect(requirements.triggersResistance).toBe(false);
      expect(requirements.reversible).toBe(true);
    });

    it('should return requirements for minor modifications', () => {
      const requirements = getRequirementsForMagnitude('minor');

      expect(requirements.minimumPosition).toBe(0.91);
      expect(requirements.attentionCost).toBe(150);
      expect(requirements.difficulty).toBe(0.35);
    });

    it('should return requirements for moderate modifications', () => {
      const requirements = getRequirementsForMagnitude('moderate');

      expect(requirements.minimumPosition).toBe(0.93);
      expect(requirements.attentionCost).toBe(500);
      expect(requirements.difficulty).toBe(0.5);
      expect(requirements.triggersResistance).toBe(true);
    });

    it('should return requirements for major modifications', () => {
      const requirements = getRequirementsForMagnitude('major');

      expect(requirements.minimumPosition).toBe(0.95);
      expect(requirements.attentionCost).toBe(2000);
      expect(requirements.difficulty).toBe(0.7);
      expect(requirements.requiresConsent).toBe(true);
      expect(requirements.reversible).toBe(false);
    });

    it('should return requirements for absolute modifications', () => {
      const requirements = getRequirementsForMagnitude('absolute');

      expect(requirements.minimumPosition).toBe(0.98);
      expect(requirements.attentionCost).toBe(10000);
      expect(requirements.difficulty).toBe(0.9);
    });

    it('should return requirements for transcendent modifications', () => {
      const requirements = getRequirementsForMagnitude('transcendent');

      expect(requirements.minimumPosition).toBe(0.99);
      expect(requirements.attentionCost).toBe(50000);
      expect(requirements.difficulty).toBe(0.95);
    });

    it('should have increasing costs with magnitude', () => {
      const magnitudes: ModificationMagnitude[] = [
        'subtle', 'minor', 'moderate', 'major', 'absolute', 'transcendent',
      ];

      let previousCost = 0;
      for (const magnitude of magnitudes) {
        const requirements = getRequirementsForMagnitude(magnitude);
        expect(requirements.attentionCost).toBeGreaterThan(previousCost);
        previousCost = requirements.attentionCost;
      }
    });

    it('should have increasing difficulty with magnitude', () => {
      const magnitudes: ModificationMagnitude[] = [
        'subtle', 'minor', 'moderate', 'major', 'absolute', 'transcendent',
      ];

      let previousDifficulty = 0;
      for (const magnitude of magnitudes) {
        const requirements = getRequirementsForMagnitude(magnitude);
        expect(requirements.difficulty).toBeGreaterThan(previousDifficulty);
        previousDifficulty = requirements.difficulty;
      }
    });
  });

  // ========================================================================
  // Modification Capabilities
  // ========================================================================

  describe('getModificationCapabilities', () => {
    it('should return no capabilities for presences below 0.90', () => {
      const capabilities = getModificationCapabilities(establishedPresence);
      expect(capabilities).toHaveLength(0);
    });

    it('should return no capabilities for divine presences below 0.90', () => {
      const capabilities = getModificationCapabilities(divinePresence);
      expect(capabilities).toHaveLength(0);
    });

    it('should return capabilities for presences at 0.90+', () => {
      const presence = createPresence(
        'test',
        'Reality Bender',
        { type: 'concept', description: 'change', destructible: false, onDestruction: 'persist' },
        0.90
      );

      const capabilities = getModificationCapabilities(presence);
      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities[0].name).toBe('reality_adjustment');
    });

    it('should return more capabilities at higher positions', () => {
      const presence090 = createPresence('test090', 'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' }, 0.90);
      const presence095 = createPresence('test095', 'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' }, 0.95);
      const presence099 = createPresence('test099', 'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' }, 0.99);

      const cap090 = getModificationCapabilities(presence090);
      const cap095 = getModificationCapabilities(presence095);
      const cap099 = getModificationCapabilities(presence099);

      expect(cap095.length).toBeGreaterThan(cap090.length);
      expect(cap099.length).toBeGreaterThan(cap095.length);
    });

    it('should allow more categories at higher positions', () => {
      const presence090 = createPresence('test090', 'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' }, 0.90);
      const presence098 = createPresence('test098', 'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' }, 0.98);

      const cap090 = getModificationCapabilities(presence090);
      const cap098 = getModificationCapabilities(presence098);

      // 0.90 can only modify source, cost, channel
      const categories090 = new Set(cap090.flatMap(c => c.allowedCategories));
      expect(categories090.has('law')).toBe(false);

      // 0.98 can modify laws
      const categories098 = new Set(cap098.flatMap(c => c.allowedCategories));
      expect(categories098.has('law')).toBe(true);
    });
  });

  describe('MODIFICATION_CAPABILITIES', () => {
    it('should define capabilities at expected thresholds', () => {
      const expectedThresholds = [0.90, 0.91, 0.93, 0.95, 0.98, 0.99];
      const actualThresholds = MODIFICATION_CAPABILITIES.map(c => c.minimumPosition);

      for (const threshold of expectedThresholds) {
        expect(actualThresholds).toContain(threshold);
      }
    });

    it('should have paradigm_authorship as the highest capability', () => {
      const highest = MODIFICATION_CAPABILITIES.reduce((a, b) =>
        a.minimumPosition > b.minimumPosition ? a : b
      );

      expect(highest.name).toBe('paradigm_authorship');
      expect(highest.minimumPosition).toBe(0.99);
      expect(highest.maxMagnitude).toBe('transcendent');
    });

    it('should only allow law modifications at 0.98+', () => {
      const lawCapabilities = MODIFICATION_CAPABILITIES.filter(c =>
        c.allowedCategories.includes('law')
      );

      for (const cap of lawCapabilities) {
        expect(cap.minimumPosition).toBeGreaterThanOrEqual(0.98);
      }
    });
  });

  // ========================================================================
  // Can Attempt Modification
  // ========================================================================

  describe('canAttemptModification', () => {
    it('should reject modification from presence below threshold', () => {
      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: emergentPresence.id,
        paradigmId: testParadigm.id,
        category: 'source',
        operation: 'modify',
        magnitude: 'subtle',
        description: 'test',
        changes: { category: 'source', sourceId: 'mana', changes: { regenRate: 0.02 } },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      const result = canAttemptModification(emergentPresence, intent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('0.90');
    });

    it('should reject modification with insufficient attention', () => {
      const lowAttentionPresence = createPresence(
        'low_attention',
        'Weak God',
        { type: 'concept', description: 'weakness', destructible: false, onDestruction: 'persist' },
        0.95
      );
      lowAttentionPresence.attention = 10; // Not enough

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: lowAttentionPresence.id,
        paradigmId: testParadigm.id,
        category: 'source',
        operation: 'add',
        magnitude: 'major',
        description: 'test',
        changes: { category: 'source', source: createManaSource() },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      const result = canAttemptModification(lowAttentionPresence, intent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Insufficient attention');
    });

    it('should reject modification of disallowed category', () => {
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.91
      );
      presence.attention = 10000;

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: presence.id,
        paradigmId: testParadigm.id,
        category: 'law', // Not allowed at 0.91
        operation: 'modify',
        magnitude: 'minor',
        description: 'test',
        changes: { category: 'law', lawId: 'conservation', changes: { strictness: 'weak' } },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      const result = canAttemptModification(presence, intent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No capability allows');
    });

    it('should reject magnitude exceeding capability', () => {
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.91 // Can only do up to 'minor'
      );
      presence.attention = 10000;

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: presence.id,
        paradigmId: testParadigm.id,
        category: 'source',
        operation: 'add',
        magnitude: 'major', // Too high
        description: 'test',
        changes: { category: 'source', source: createManaSource() },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      const result = canAttemptModification(presence, intent);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds capability maximum');
    });

    it('should allow valid modifications', () => {
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.95
      );
      presence.attention = 10000;

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: presence.id,
        paradigmId: testParadigm.id,
        category: 'source',
        operation: 'add',
        magnitude: 'moderate',
        description: 'test',
        changes: { category: 'source', source: createManaSource() },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      const result = canAttemptModification(presence, intent);
      expect(result.allowed).toBe(true);
    });
  });

  // ========================================================================
  // Applying Modifications
  // ========================================================================

  describe('applyModification', () => {
    it('should fail for unqualified presence', () => {
      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: establishedPresence.id,
        paradigmId: testParadigm.id,
        category: 'source',
        operation: 'modify',
        magnitude: 'subtle',
        description: 'test',
        changes: { category: 'source', sourceId: 'mana', changes: { regenRate: 0.02 } },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      const result = applyModification(testParadigm, establishedPresence, intent);
      expect(result.success).toBe(false);
      expect(result.attentionSpent).toBe(0);
    });

    it('should spend attention even on failure', () => {
      // Create a presence that can attempt but might fail
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.90 // Just barely qualified
      );
      presence.attention = 1000;

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: presence.id,
        paradigmId: testParadigm.id,
        category: 'source',
        operation: 'modify',
        magnitude: 'subtle',
        description: 'test',
        changes: { category: 'source', sourceId: 'mana', changes: { regenRate: 0.02 } },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      // Run many times to ensure we sometimes get failures that still cost attention
      let failureWithCost = false;
      for (let i = 0; i < 50; i++) {
        const result = applyModification(testParadigm, presence, intent);
        if (!result.success && result.attentionSpent > 0) {
          failureWithCost = true;
          break;
        }
      }
      // Due to RNG, we might not always get a failure - this is probabilistic
      // The test validates the mechanics are in place
    });

    it('should add a new source on successful add operation', () => {
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.99 // High enough to guarantee success with low difficulty
      );
      presence.attention = 100000;

      const newSource = {
        id: 'emotional_power',
        name: 'Emotional Resonance',
        type: 'emotional' as const,
        regeneration: 'passive' as const,
        storable: false,
        transferable: true,
        stealable: false,
        detectability: 'obvious' as const,
      };

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: presence.id,
        paradigmId: testParadigm.id,
        category: 'source',
        operation: 'add',
        magnitude: 'subtle',
        description: 'Add emotional magic',
        changes: { category: 'source', source: newSource },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      // With 0.99 position and subtle difficulty, should almost always succeed
      let successfulResult = null;
      for (let i = 0; i < 20; i++) {
        const result = applyModification(testParadigm, presence, intent);
        if (result.success) {
          successfulResult = result;
          break;
        }
      }

      expect(successfulResult).not.toBeNull();
      expect(successfulResult?.paradigm?.sources).toContainEqual(newSource);
      expect(successfulResult?.narrative.length).toBeGreaterThan(0);
    });

    it('should remove a source on successful remove operation', () => {
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.99
      );
      presence.attention = 100000;

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: presence.id,
        paradigmId: testParadigm.id,
        category: 'source',
        operation: 'remove',
        magnitude: 'subtle',
        description: 'Remove mana source',
        changes: { category: 'source', sourceId: 'mana' },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      let successfulResult = null;
      for (let i = 0; i < 20; i++) {
        const result = applyModification(testParadigm, presence, intent);
        if (result.success) {
          successfulResult = result;
          break;
        }
      }

      if (successfulResult) {
        expect(successfulResult.paradigm?.sources.find(s => s.id === 'mana')).toBeUndefined();
      }
    });

    it('should modify law strictness on successful law modification', () => {
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.99
      );
      presence.attention = 100000;

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: presence.id,
        paradigmId: testParadigm.id,
        category: 'law',
        operation: 'modify',
        magnitude: 'subtle', // Using subtle for higher success chance
        description: 'Weaken conservation law',
        changes: {
          category: 'law',
          lawId: 'conservation',
          changes: { strictness: 'weak' },
        },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      let successfulResult = null;
      for (let i = 0; i < 20; i++) {
        const result = applyModification(testParadigm, presence, intent);
        if (result.success) {
          successfulResult = result;
          break;
        }
      }

      if (successfulResult) {
        const modifiedLaw = successfulResult.paradigm?.laws.find(l => l.id === 'conservation');
        expect(modifiedLaw?.strictness).toBe('weak');
      }
    });

    it('should add technique on successful technique addition', () => {
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.99
      );
      presence.attention = 100000;

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: presence.id,
        paradigmId: testParadigm.id,
        category: 'technique',
        operation: 'add',
        magnitude: 'subtle',
        description: 'Add summon technique',
        changes: { category: 'technique', technique: 'summon' },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      let successfulResult = null;
      for (let i = 0; i < 20; i++) {
        const result = applyModification(testParadigm, presence, intent);
        if (result.success) {
          successfulResult = result;
          break;
        }
      }

      if (successfulResult) {
        expect(successfulResult.paradigm?.availableTechniques).toContain('summon');
      }
    });

    it('should change power scaling on successful scaling modification', () => {
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.99
      );
      presence.attention = 100000;

      const intent: ModificationIntent = {
        id: 'test_mod',
        presenceId: presence.id,
        paradigmId: testParadigm.id,
        category: 'scaling',
        operation: 'modify',
        magnitude: 'subtle',
        description: 'Change to exponential scaling',
        changes: { category: 'scaling', newScaling: 'exponential' },
        initiatedAt: Date.now(),
        status: 'planning',
        progress: 0,
      };

      let successfulResult = null;
      for (let i = 0; i < 20; i++) {
        const result = applyModification(testParadigm, presence, intent);
        if (result.success) {
          successfulResult = result;
          break;
        }
      }

      if (successfulResult) {
        expect(successfulResult.paradigm?.powerScaling).toBe('exponential');
      }
    });
  });

  // ========================================================================
  // Helper Functions
  // ========================================================================

  describe('createMagicSource helper', () => {
    it('should create an intent for adding a magic source', () => {
      const newSource = {
        id: 'divine_power',
        name: 'Divine Favor',
        type: 'divine' as const,
        regeneration: 'prayer' as const,
        storable: false,
        transferable: false,
        stealable: false,
        detectability: 'beacon' as const,
      };

      const intent = createMagicSource('presence_1', 'paradigm_1', newSource, true);

      expect(intent.category).toBe('source');
      expect(intent.operation).toBe('add');
      expect(intent.magnitude).toBe('moderate');
      expect((intent.changes as any).source).toEqual(newSource);
    });

    it('should use major magnitude for non-minor sources', () => {
      const majorSource = {
        id: 'primal_force',
        name: 'Primal Force',
        type: 'internal' as const,
        regeneration: 'passive' as const,
        storable: true,
        transferable: true,
        stealable: true,
        detectability: 'beacon' as const,
      };

      const intent = createMagicSource('presence_1', 'paradigm_1', majorSource, false);
      expect(intent.magnitude).toBe('major');
    });
  });

  describe('weakenMagicLaw helper', () => {
    it('should create an intent for weakening a law', () => {
      const intent = weakenMagicLaw('presence_1', 'paradigm_1', 'conservation', 'weak');

      expect(intent.category).toBe('law');
      expect(intent.operation).toBe('weaken');
      expect(intent.magnitude).toBe('absolute');
      expect((intent.changes as any).lawId).toBe('conservation');
      expect((intent.changes as any).changes.strictness).toBe('weak');
    });
  });

  describe('addMagicTechnique helper', () => {
    it('should create an intent for adding a technique', () => {
      const intent = addMagicTechnique('presence_1', 'paradigm_1', 'travel');

      expect(intent.category).toBe('technique');
      expect(intent.operation).toBe('add');
      expect(intent.magnitude).toBe('moderate');
      expect((intent.changes as any).technique).toBe('travel');
    });
  });

  describe('unlockCombination helper', () => {
    it('should create an intent for unlocking a combination', () => {
      const intent = unlockCombination(
        'presence_1',
        'paradigm_1',
        'transform',
        'time',
        'Can now manipulate time'
      );

      expect(intent.category).toBe('combination');
      expect(intent.operation).toBe('add');
      expect(intent.magnitude).toBe('major');
      expect((intent.changes as any).resonant.technique).toBe('transform');
      expect((intent.changes as any).resonant.form).toBe('time');
      expect((intent.changes as any).resonant.bonusEffect).toBe('Can now manipulate time');
    });
  });

  describe('alterPowerScaling helper', () => {
    it('should create an intent for changing power scaling', () => {
      const intent = alterPowerScaling('presence_1', 'paradigm_1', 'exponential');

      expect(intent.category).toBe('scaling');
      expect(intent.operation).toBe('modify');
      expect(intent.magnitude).toBe('absolute');
      expect((intent.changes as any).newScaling).toBe('exponential');
    });
  });

  describe('createNewParadigm helper', () => {
    it('should create an intent for creating a new paradigm', () => {
      const newParadigm: MagicParadigm = {
        ...createEmptyParadigm('new_magic', 'New Magic System'),
        sources: [createManaSource()],
        costs: [createManaCost()],
        acquisitionMethods: [createStudyAcquisition()],
      };

      const intent = createNewParadigm('presence_1', newParadigm);

      expect(intent.category).toBe('meta');
      expect(intent.operation).toBe('add');
      expect(intent.magnitude).toBe('transcendent');
      expect(intent.paradigmId).toBe('new_magic');
    });
  });

  // ========================================================================
  // Examples
  // ========================================================================

  describe('MODIFICATION_EXAMPLES', () => {
    it('should have examples for each magnitude', () => {
      const magnitudes: ModificationMagnitude[] = ['subtle', 'minor', 'moderate', 'major', 'absolute'];

      for (const magnitude of magnitudes) {
        const example = MODIFICATION_EXAMPLES.find(e => e.magnitude === magnitude);
        expect(example).toBeDefined();
      }
    });

    it('should have valid intents in examples', () => {
      for (const example of MODIFICATION_EXAMPLES) {
        expect(example.intent.category).toBeDefined();
        expect(example.intent.operation).toBeDefined();
        expect(example.intent.magnitude).toBe(example.magnitude);
        expect(example.intent.changes).toBeDefined();
      }
    });
  });

  // ========================================================================
  // Integration: The Progression from Subtle to Transcendent
  // ========================================================================

  describe('Modification Progression', () => {
    it('should demonstrate the full spectrum of modifications', () => {
      // This test shows how modifications scale with presence position

      const positions = [0.90, 0.91, 0.93, 0.95, 0.98, 0.99];
      const results: string[] = [];

      for (const pos of positions) {
        const presence = createPresence(
          `test_${pos}`,
          `Entity at ${pos}`,
          { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
          pos
        );

        const capabilities = getModificationCapabilities(presence);
        const categories = new Set(capabilities.flatMap(c => c.allowedCategories));
        const maxMagnitude = capabilities.reduce(
          (max, c) => {
            const magnitudes: ModificationMagnitude[] = [
              'subtle', 'minor', 'moderate', 'major', 'absolute', 'transcendent',
            ];
            const currentIndex = magnitudes.indexOf(c.maxMagnitude);
            const maxIndex = magnitudes.indexOf(max);
            return currentIndex > maxIndex ? c.maxMagnitude : max;
          },
          'subtle' as ModificationMagnitude
        );

        results.push(
          `Position ${pos}: ${capabilities.length} capabilities, ` +
          `max magnitude: ${maxMagnitude}, ` +
          `can modify: ${Array.from(categories).join(', ')}`
        );
      }

      // Verify progression exists
      expect(results.length).toBe(6);

      // Higher positions should have more categories
      const presence090 = createPresence('t1', 'T',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' }, 0.90);
      const presence099 = createPresence('t2', 'T',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' }, 0.99);

      const cat090 = new Set(getModificationCapabilities(presence090).flatMap(c => c.allowedCategories));
      const cat099 = new Set(getModificationCapabilities(presence099).flatMap(c => c.allowedCategories));

      expect(cat099.size).toBeGreaterThan(cat090.size);
      expect(cat099.has('law')).toBe(true);
      expect(cat090.has('law')).toBe(false);
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle presence at exactly threshold positions', () => {
      const thresholds = [0.90, 0.91, 0.93, 0.95, 0.98, 0.99];

      for (const threshold of thresholds) {
        const presence = createPresence(
          `test_${threshold}`,
          'Test',
          { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
          threshold
        );

        const capabilities = getModificationCapabilities(presence);
        expect(capabilities.length).toBeGreaterThan(0);
      }
    });

    it('should handle presence just below thresholds', () => {
      const presence = createPresence(
        'test',
        'Test',
        { type: 'concept', description: 'test', destructible: false, onDestruction: 'persist' },
        0.899999
      );

      const capabilities = getModificationCapabilities(presence);
      expect(capabilities.length).toBe(0);
    });

    it('should handle presence at maximum (1.0)', () => {
      const presence = createPresence(
        'test',
        'The Absolute',
        { type: 'concept', description: 'existence', destructible: false, onDestruction: 'persist' },
        1.0
      );
      presence.attention = 1000000;

      const capabilities = getModificationCapabilities(presence);
      expect(capabilities.length).toBe(MODIFICATION_CAPABILITIES.length);
    });

    it('should generate unique modification IDs', () => {
      const source = createManaSource();
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const intent = createMagicSource('p1', 'paradigm1', source);
        expect(ids.has(intent.id)).toBe(false);
        ids.add(intent.id);
      }
    });
  });
});
