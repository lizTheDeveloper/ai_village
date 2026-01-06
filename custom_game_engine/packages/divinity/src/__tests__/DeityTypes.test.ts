import { describe, it, expect } from 'vitest';
import {
  // Functions
  createDefaultPersonality,
  createBlankIdentity,
  createEmergentIdentity,

  // Types
  type DivineDomain,
  type PerceivedPersonality,
  type DeityIdentity,
  type MoralAlignment,
  type DeityOrigin,
} from '../DeityTypes.js';

// ============================================================================
// createDefaultPersonality Tests
// ============================================================================

describe('createDefaultPersonality', () => {
  it('should create personality with all traits at neutral/zero', () => {
    const personality = createDefaultPersonality();

    expect(personality.benevolence).toBe(0);
    expect(personality.interventionism).toBe(0);
    expect(personality.wrathfulness).toBe(0);
    expect(personality.generosity).toBe(0);
    expect(personality.consistency).toBe(0);
    expect(personality.compassion).toBe(0);
  });

  it('should set mysteriousness to 0.5 (neutral unknown)', () => {
    const personality = createDefaultPersonality();
    expect(personality.mysteriousness).toBe(0.5);
  });

  it('should set seriousness to 0.5 (neutral)', () => {
    const personality = createDefaultPersonality();
    expect(personality.seriousness).toBe(0.5);
  });

  it('should create independent objects each time', () => {
    const p1 = createDefaultPersonality();
    const p2 = createDefaultPersonality();

    p1.benevolence = 1;

    expect(p2.benevolence).toBe(0);
  });

  it('should have all required personality traits', () => {
    const personality = createDefaultPersonality();
    const expectedTraits = [
      'benevolence',
      'interventionism',
      'wrathfulness',
      'mysteriousness',
      'generosity',
      'consistency',
      'seriousness',
      'compassion',
    ];

    for (const trait of expectedTraits) {
      expect(personality).toHaveProperty(trait);
      expect(typeof personality[trait as keyof PerceivedPersonality]).toBe('number');
    }
  });
});

// ============================================================================
// createBlankIdentity Tests
// ============================================================================

describe('createBlankIdentity', () => {
  it('should create identity with default name', () => {
    const identity = createBlankIdentity();
    expect(identity.primaryName).toBe('The Unknown');
  });

  it('should accept custom name', () => {
    const identity = createBlankIdentity('The Nameless One');
    expect(identity.primaryName).toBe('The Nameless One');
  });

  it('should set domain to mystery', () => {
    const identity = createBlankIdentity();
    expect(identity.domain).toBe('mystery');
  });

  it('should have empty epithets', () => {
    const identity = createBlankIdentity();
    expect(identity.epithets).toEqual([]);
  });

  it('should have empty secondary domains', () => {
    const identity = createBlankIdentity();
    expect(identity.secondaryDomains).toEqual([]);
  });

  it('should have default personality', () => {
    const identity = createBlankIdentity();
    const defaultP = createDefaultPersonality();

    expect(identity.perceivedPersonality).toEqual(defaultP);
  });

  it('should set alignment to unknown', () => {
    const identity = createBlankIdentity();
    expect(identity.perceivedAlignment).toBe('unknown');
  });

  it('should have undefined described form', () => {
    const identity = createBlankIdentity();

    expect(identity.describedForm.description).toBe('A presence yet undefined');
    expect(identity.describedForm.height).toBe('varies');
    expect(identity.describedForm.solidity).toBe('varies');
    expect(identity.describedForm.luminosity).toBe('subtle');
    expect(identity.describedForm.distinctiveFeatures).toEqual([]);
  });

  it('should have empty symbols and sacred things', () => {
    const identity = createBlankIdentity();

    expect(identity.symbols).toEqual([]);
    expect(identity.colors).toEqual([]);
    expect(identity.sacredAnimals).toEqual([]);
    expect(identity.sacredPlants).toEqual([]);
    expect(identity.sacredPlaceTypes).toEqual([]);
  });

  it('should have empty trait confidence map', () => {
    const identity = createBlankIdentity();
    expect(identity.traitConfidence.size).toBe(0);
  });

  it('should be marked as initially blank', () => {
    const identity = createBlankIdentity();
    expect(identity.initiallyBlank).toBe(true);
  });
});

// ============================================================================
// createEmergentIdentity Tests
// ============================================================================

describe('createEmergentIdentity', () => {
  it('should set name from parameter', () => {
    const identity = createEmergentIdentity('Kronos', 'mortal_apotheosis', 'time');
    expect(identity.primaryName).toBe('Kronos');
  });

  it('should set primary domain', () => {
    const identity = createEmergentIdentity('Ares', 'belief_crystallization', 'war');
    expect(identity.domain).toBe('war');
  });

  it('should have empty epithets initially', () => {
    const identity = createEmergentIdentity('Test', 'belief_crystallization', 'harvest');
    expect(identity.epithets).toEqual([]);
  });

  it('should have empty secondary domains initially', () => {
    const identity = createEmergentIdentity('Test', 'belief_crystallization', 'harvest');
    expect(identity.secondaryDomains).toEqual([]);
  });

  it('should merge provided personality with defaults', () => {
    const identity = createEmergentIdentity('Ares', 'belief_crystallization', 'war', {
      wrathfulness: 0.8,
      benevolence: -0.3,
    });

    expect(identity.perceivedPersonality.wrathfulness).toBe(0.8);
    expect(identity.perceivedPersonality.benevolence).toBe(-0.3);
    // Defaults should be preserved
    expect(identity.perceivedPersonality.mysteriousness).toBe(0.5);
    expect(identity.perceivedPersonality.consistency).toBe(0);
  });

  it('should use default personality when none provided', () => {
    const identity = createEmergentIdentity('Test', 'belief_crystallization', 'nature');
    const defaultP = createDefaultPersonality();

    expect(identity.perceivedPersonality).toEqual(defaultP);
  });

  it('should set alignment to unknown', () => {
    const identity = createEmergentIdentity('Test', 'belief_crystallization', 'justice');
    expect(identity.perceivedAlignment).toBe('unknown');
  });

  it('should have empty described form', () => {
    const identity = createEmergentIdentity('Test', 'belief_crystallization', 'sky');

    expect(identity.describedForm.description).toBe('');
    expect(identity.describedForm.distinctiveFeatures).toEqual([]);
  });

  it('should not be marked as initially blank', () => {
    const identity = createEmergentIdentity('Test', 'belief_crystallization', 'fire');
    expect(identity.initiallyBlank).toBe(false);
  });

  it('should set initial domain confidence', () => {
    const identity = createEmergentIdentity('Test', 'belief_crystallization', 'water');
    expect(identity.traitConfidence.get('domain')).toBe(0.3);
  });

  describe('different origins', () => {
    const origins: DeityOrigin[] = [
      'belief_crystallization',
      'mortal_apotheosis',
      'divine_spawn',
      'forgotten_awakening',
      'player_creation',
      'narrative_emergence',
    ];

    origins.forEach((origin) => {
      it(`should accept ${origin} as origin`, () => {
        const identity = createEmergentIdentity('Test', origin, 'mystery');
        expect(identity.primaryName).toBe('Test');
      });
    });
  });

  describe('different domains', () => {
    const domains: DivineDomain[] = [
      'harvest',
      'war',
      'wisdom',
      'craft',
      'nature',
      'death',
      'love',
      'chaos',
      'order',
      'fortune',
    ];

    domains.forEach((domain) => {
      it(`should accept ${domain} as primary domain`, () => {
        const identity = createEmergentIdentity('Test', 'belief_crystallization', domain);
        expect(identity.domain).toBe(domain);
      });
    });
  });
});

// ============================================================================
// Type Structure Tests
// ============================================================================

describe('type structures', () => {
  describe('DivineDomain', () => {
    it('should include all 29 domains', () => {
      const domains: DivineDomain[] = [
        'harvest',
        'war',
        'wisdom',
        'craft',
        'nature',
        'death',
        'love',
        'chaos',
        'order',
        'fortune',
        'protection',
        'healing',
        'mystery',
        'time',
        'sky',
        'earth',
        'water',
        'fire',
        'storm',
        'hunt',
        'home',
        'travel',
        'trade',
        'justice',
        'vengeance',
        'dreams',
        'fear',
        'beauty',
        'trickery',
      ];

      expect(domains).toHaveLength(29);
    });
  });

  describe('MoralAlignment', () => {
    it('should accept all valid alignments', () => {
      const alignments: MoralAlignment[] = [
        'benevolent',
        'malevolent',
        'neutral',
        'capricious',
        'unknowable',
        'unknown',
      ];

      expect(alignments).toHaveLength(6);
    });
  });

  describe('PerceivedPersonality', () => {
    it('should accept valid personality values', () => {
      const personality: PerceivedPersonality = {
        benevolence: 0.8,
        interventionism: -0.5,
        wrathfulness: 0.3,
        mysteriousness: 0.9,
        generosity: 0.5,
        consistency: 0.2,
        seriousness: 0.7,
        compassion: 0.6,
      };

      expect(personality.benevolence).toBe(0.8);
      expect(personality.interventionism).toBe(-0.5);
    });
  });

  describe('DeityIdentity', () => {
    it('should accept valid identity structure', () => {
      const identity: DeityIdentity = {
        primaryName: 'Athena',
        epithets: ['Gray-Eyed', 'Wise One', 'Protector of Heroes'],
        domain: 'wisdom',
        secondaryDomains: ['war', 'craft'],
        perceivedPersonality: createDefaultPersonality(),
        perceivedAlignment: 'benevolent',
        describedForm: {
          description: 'A tall woman in armor with gray eyes',
          height: 'tall',
          solidity: 'solid',
          luminosity: 'subtle',
          distinctiveFeatures: ['gray eyes', 'owl companion', 'helmet'],
        },
        symbols: ['owl', 'olive tree', 'aegis'],
        colors: ['gray', 'silver', 'gold'],
        sacredAnimals: ['owl', 'snake'],
        sacredPlants: ['olive'],
        sacredPlaceTypes: ['citadel', 'library', 'workshop'],
        traitConfidence: new Map([
          ['domain', 1.0],
          ['alignment', 0.9],
        ]),
        initiallyBlank: false,
      };

      expect(identity.primaryName).toBe('Athena');
      expect(identity.secondaryDomains).toContain('craft');
      expect(identity.traitConfidence.get('domain')).toBe(1.0);
    });
  });
});

// ============================================================================
// Gameplay Scenarios
// ============================================================================

describe('gameplay scenarios', () => {
  it('should demonstrate player god starting blank', () => {
    // Player starts a new god with no predetermined identity
    const playerGod = createBlankIdentity('???');

    expect(playerGod.primaryName).toBe('???');
    expect(playerGod.domain).toBe('mystery');
    expect(playerGod.initiallyBlank).toBe(true);
    expect(playerGod.epithets).toHaveLength(0);

    // Personality is undefined - will be shaped by actions
    expect(playerGod.perceivedPersonality.benevolence).toBe(0);
    expect(playerGod.perceivedPersonality.wrathfulness).toBe(0);
  });

  it('should demonstrate god emerging from collective belief', () => {
    // Villagers have been praying for harvest blessings
    // A harvest deity crystallizes from their belief
    const harvestGod = createEmergentIdentity(
      'The Grain Mother',
      'belief_crystallization',
      'harvest',
      {
        benevolence: 0.6,
        generosity: 0.7,
        nurturing: 0.8,
      } as Partial<PerceivedPersonality>
    );

    expect(harvestGod.primaryName).toBe('The Grain Mother');
    expect(harvestGod.domain).toBe('harvest');
    expect(harvestGod.perceivedPersonality.benevolence).toBe(0.6);
    expect(harvestGod.perceivedPersonality.generosity).toBe(0.7);
    // Started from belief, not blank
    expect(harvestGod.initiallyBlank).toBe(false);
    // Has some initial confidence in domain
    expect(harvestGod.traitConfidence.get('domain')).toBe(0.3);
  });

  it('should demonstrate mortal ascending to godhood', () => {
    // A great hero dies and is elevated by worshippers
    const ascendedHero = createEmergentIdentity(
      'Herakles',
      'mortal_apotheosis',
      'protection',
      {
        interventionism: 0.8,
        wrathfulness: 0.4,
        benevolence: 0.5,
      }
    );

    expect(ascendedHero.domain).toBe('protection');
    expect(ascendedHero.perceivedPersonality.interventionism).toBe(0.8);
  });

  it('should demonstrate war god personality', () => {
    const warGod = createEmergentIdentity('Ares', 'divine_spawn', 'war', {
      wrathfulness: 0.9,
      interventionism: 0.7,
      benevolence: -0.3,
      consistency: 0.4,
    });

    // War gods are typically wrathful and active
    expect(warGod.perceivedPersonality.wrathfulness).toBe(0.9);
    expect(warGod.perceivedPersonality.interventionism).toBe(0.7);
    // Not particularly benevolent
    expect(warGod.perceivedPersonality.benevolence).toBe(-0.3);
  });

  it('should demonstrate mystery god remaining enigmatic', () => {
    const mysteryGod = createEmergentIdentity('The Watcher', 'forgotten_awakening', 'mystery', {
      mysteriousness: 0.95,
      interventionism: -0.7,
      consistency: -0.5,
    });

    // Mystery gods are very mysterious and rarely intervene
    expect(mysteryGod.perceivedPersonality.mysteriousness).toBe(0.95);
    expect(mysteryGod.perceivedPersonality.interventionism).toBe(-0.7);
    expect(mysteryGod.domain).toBe('mystery');
  });
});
