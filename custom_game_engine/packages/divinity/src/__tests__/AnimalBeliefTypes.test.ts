import { describe, it, expect } from 'vitest';
import {
  // Constants
  BELIEF_INTELLIGENCE_THRESHOLDS,
  ANIMAL_BELIEF_RATES,

  // Functions
  canFormBeliefs,
  getBeliefCapacity,
  getSpeciesDivinePerception,
  createCetaceanDeity,
  createWhalePatheon,
  createPackDeity,
  createCorvidDeity,
  calculateCrossSpeciesPerception,
  calculateAnimalBeliefGeneration,

  // Types
  type BeliefCapacity,
  type SpeciesCategory,
  type CetaceanDivineDomain,
  type CetaceanDeity,
  type CetaceanDeityNature,
  type PackDivineDomain,
  type PackDeity,
  type CorvidDivineDomain,
  type CorvidDeity,
  type AnimalWorshipActivity,
  type DivineSense,
  type DivineConceptType,
} from '../AnimalBeliefTypes.js';

// ============================================================================
// BELIEF_INTELLIGENCE_THRESHOLDS Tests
// ============================================================================

describe('BELIEF_INTELLIGENCE_THRESHOLDS', () => {
  it('should have ascending thresholds', () => {
    const thresholds = BELIEF_INTELLIGENCE_THRESHOLDS;
    expect(thresholds.awareness).toBeLessThan(thresholds.recognition);
    expect(thresholds.recognition).toBeLessThan(thresholds.proto_belief);
    expect(thresholds.proto_belief).toBeLessThan(thresholds.communal_belief);
    expect(thresholds.communal_belief).toBeLessThan(thresholds.true_belief);
    expect(thresholds.true_belief).toBeLessThan(thresholds.transmission);
    expect(thresholds.transmission).toBeLessThan(thresholds.worship);
    expect(thresholds.worship).toBeLessThan(thresholds.clergy);
    expect(thresholds.clergy).toBeLessThan(thresholds.theology);
  });

  it('should have expected key values', () => {
    expect(BELIEF_INTELLIGENCE_THRESHOLDS.awareness).toBe(0.2);
    expect(BELIEF_INTELLIGENCE_THRESHOLDS.true_belief).toBe(0.6);
    expect(BELIEF_INTELLIGENCE_THRESHOLDS.worship).toBe(0.75);
    expect(BELIEF_INTELLIGENCE_THRESHOLDS.theology).toBe(0.9);
  });

  it('should cap at 0.9 for theology', () => {
    expect(BELIEF_INTELLIGENCE_THRESHOLDS.theology).toBeLessThanOrEqual(1.0);
  });
});

// ============================================================================
// canFormBeliefs Tests
// ============================================================================

describe('canFormBeliefs', () => {
  it('should return false for low intelligence', () => {
    expect(canFormBeliefs(0.1)).toBe(false);
    expect(canFormBeliefs(0.3)).toBe(false);
    expect(canFormBeliefs(0.5)).toBe(false);
    expect(canFormBeliefs(0.59)).toBe(false);
  });

  it('should return true at true_belief threshold', () => {
    expect(canFormBeliefs(0.6)).toBe(true);
  });

  it('should return true for high intelligence', () => {
    expect(canFormBeliefs(0.7)).toBe(true);
    expect(canFormBeliefs(0.8)).toBe(true);
    expect(canFormBeliefs(0.9)).toBe(true);
    expect(canFormBeliefs(1.0)).toBe(true);
  });
});

// ============================================================================
// getBeliefCapacity Tests
// ============================================================================

describe('getBeliefCapacity', () => {
  it('should return none for very low intelligence', () => {
    expect(getBeliefCapacity(0)).toBe('none');
    expect(getBeliefCapacity(0.1)).toBe('none');
    expect(getBeliefCapacity(0.19)).toBe('none');
  });

  it('should return aware at awareness threshold', () => {
    expect(getBeliefCapacity(0.2)).toBe('aware');
    expect(getBeliefCapacity(0.25)).toBe('aware');
  });

  it('should return proto at proto_belief threshold', () => {
    expect(getBeliefCapacity(0.4)).toBe('proto');
    expect(getBeliefCapacity(0.45)).toBe('proto');
  });

  it('should return communal at communal_belief threshold', () => {
    expect(getBeliefCapacity(0.5)).toBe('communal');
    expect(getBeliefCapacity(0.55)).toBe('communal');
  });

  it('should return believing at true_belief threshold', () => {
    expect(getBeliefCapacity(0.6)).toBe('believing');
    expect(getBeliefCapacity(0.65)).toBe('believing');
  });

  it('should return communicative at transmission threshold', () => {
    expect(getBeliefCapacity(0.7)).toBe('communicative');
    expect(getBeliefCapacity(0.74)).toBe('communicative');
  });

  it('should return devotional at worship threshold', () => {
    expect(getBeliefCapacity(0.75)).toBe('devotional');
    expect(getBeliefCapacity(0.8)).toBe('devotional');
  });

  it('should return priestly at clergy threshold', () => {
    expect(getBeliefCapacity(0.85)).toBe('priestly');
    expect(getBeliefCapacity(0.89)).toBe('priestly');
  });

  it('should return theological at theology threshold', () => {
    expect(getBeliefCapacity(0.9)).toBe('theological');
    expect(getBeliefCapacity(1.0)).toBe('theological');
  });
});

// ============================================================================
// ANIMAL_BELIEF_RATES Tests
// ============================================================================

describe('ANIMAL_BELIEF_RATES', () => {
  it('should have rates for all worship activities', () => {
    const activities: AnimalWorshipActivity[] = [
      'group_vocalization',
      'synchronized_movement',
      'ritual_feeding',
      'territory_marking',
      'elder_following',
      'death_mourning',
      'birth_celebration',
      'seasonal_gathering',
      'play_ritual',
      'silence_keeping',
      'gift_giving',
      'sacred_site_visit',
    ];

    activities.forEach((activity) => {
      expect(ANIMAL_BELIEF_RATES[activity]).toBeDefined();
      expect(ANIMAL_BELIEF_RATES[activity]).toBeGreaterThan(0);
    });
  });

  it('should have highest rates for rare/significant activities', () => {
    expect(ANIMAL_BELIEF_RATES.seasonal_gathering).toBe(1.0);
    expect(ANIMAL_BELIEF_RATES.sacred_site_visit).toBe(0.8);
    expect(ANIMAL_BELIEF_RATES.death_mourning).toBe(0.5);
  });

  it('should have lower rates for common activities', () => {
    expect(ANIMAL_BELIEF_RATES.territory_marking).toBe(0.05);
    expect(ANIMAL_BELIEF_RATES.elder_following).toBe(0.08);
  });
});

// ============================================================================
// getSpeciesDivinePerception Tests
// ============================================================================

describe('getSpeciesDivinePerception', () => {
  describe('cetacean perception', () => {
    it('should have appropriate primary senses', () => {
      const perception = getSpeciesDivinePerception('cetacean');
      expect(perception.primarySenses).toContain('echolocation');
      expect(perception.primarySenses).toContain('song');
      expect(perception.primarySenses).toContain('pressure');
    });

    it('should have cetacean sacred concepts', () => {
      const perception = getSpeciesDivinePerception('cetacean');
      expect(perception.sacredConcepts).toContain('the deep');
      expect(perception.sacredConcepts).toContain('the song');
      expect(perception.sacredConcepts).toContain('the breath');
    });

    it('should have ocean-based sacred places', () => {
      const perception = getSpeciesDivinePerception('cetacean');
      expect(perception.sacredPlaceTypes).toContain('deep trenches');
      expect(perception.sacredPlaceTypes).toContain('feeding grounds');
      expect(perception.sacredPlaceTypes).toContain('migration paths');
    });

    it('should perceive human gods faintly', () => {
      const perception = getSpeciesDivinePerception('cetacean');
      expect(perception.humanGodPerception).toBe('faint');
    });

    it('should be differently perceptible to humans', () => {
      const perception = getSpeciesDivinePerception('cetacean');
      expect(perception.perceptibleToHumans).toBe('different');
    });
  });

  describe('corvid perception', () => {
    it('should have vision as primary sense', () => {
      const perception = getSpeciesDivinePerception('corvid');
      expect(perception.primarySenses).toContain('vision');
    });

    it('should have trickster-adjacent concepts', () => {
      const perception = getSpeciesDivinePerception('corvid');
      expect(perception.sacredConcepts).toContain('cleverness');
      expect(perception.sacredConcepts).toContain('death-transformation');
    });

    it('should include battlefields as sacred', () => {
      const perception = getSpeciesDivinePerception('corvid');
      expect(perception.sacredPlaceTypes).toContain('battlefields');
    });
  });

  describe('canid perception', () => {
    it('should have scent as primary sense', () => {
      const perception = getSpeciesDivinePerception('canid');
      expect(perception.primarySenses).toContain('scent');
    });

    it('should value pack concepts', () => {
      const perception = getSpeciesDivinePerception('canid');
      expect(perception.sacredConcepts).toContain('the pack');
      expect(perception.sacredConcepts).toContain('the territory');
      expect(perception.sacredConcepts).toContain('the howl');
    });

    it('should conceptualize divine as pack spirit', () => {
      const perception = getSpeciesDivinePerception('canid');
      expect(perception.divineConceptualization).toBe('pack_spirit');
    });
  });

  describe('pachyderm perception', () => {
    it('should perceive through vibration', () => {
      const perception = getSpeciesDivinePerception('pachyderm');
      expect(perception.primarySenses).toContain('vibration');
    });

    it('should value memory and ancestors', () => {
      const perception = getSpeciesDivinePerception('pachyderm');
      expect(perception.sacredConcepts).toContain('memory');
      expect(perception.sacredConcepts).toContain('ancestors');
    });

    it('should include bone yards as sacred', () => {
      const perception = getSpeciesDivinePerception('pachyderm');
      expect(perception.sacredPlaceTypes).toContain('bone yards');
    });
  });

  describe('unknown species', () => {
    it('should return default perception for unmapped species', () => {
      const perception = getSpeciesDivinePerception('reptilian');
      expect(perception.primarySenses).toContain('vision');
      expect(perception.divineConceptualization).toBe('territorial');
      expect(perception.humanGodPerception).toBe('none');
    });
  });
});

// ============================================================================
// createCetaceanDeity Tests
// ============================================================================

describe('createCetaceanDeity', () => {
  it('should create deity with correct id and type', () => {
    const deity = createCetaceanDeity('whale-1', 'The Deep Singer', 'the_song');
    expect(deity.id).toBe('whale-1');
    expect(deity.entityType).toBe('animal_deity');
    expect(deity.speciesCategory).toBe('cetacean');
  });

  it('should set translated name and domain', () => {
    const deity = createCetaceanDeity('whale-2', 'The Abyss Dweller', 'the_deep');
    expect(deity.translatedName).toBe('The Abyss Dweller');
    expect(deity.domain).toBe('the_deep');
  });

  it('should create song name pattern', () => {
    const deity = createCetaceanDeity('whale-3', 'The Current Rider', 'the_current');
    expect(deity.songName.duration).toBe(30);
    expect(deity.songName.frequencyRange).toEqual([20, 200]);
    expect(deity.songName.tradition).toBe('all-pods');
  });

  it('should use ancient_whale as default nature', () => {
    const deity = createCetaceanDeity('whale-4', 'Test Deity', 'the_pod');
    expect(deity.perceivedNature).toBe('ancient_whale');
  });

  it('should accept custom nature', () => {
    const deity = createCetaceanDeity('whale-5', 'Song Spirit', 'the_song', 'song_spirit');
    expect(deity.perceivedNature).toBe('song_spirit');
  });

  it('should set manifestation based on nature', () => {
    const ancientDeity = createCetaceanDeity('w1', 'Ancient', 'the_deep', 'ancient_whale');
    expect(ancientDeity.manifestation.form).toBe('great_whale');

    const songDeity = createCetaceanDeity('w2', 'Song', 'the_song', 'song_spirit');
    expect(songDeity.manifestation.form).toBe('song_only');
  });

  it('should have default pleasing acts', () => {
    const deity = createCetaceanDeity('whale-6', 'Test', 'the_breath');
    expect(deity.pleasingActs).toContain('long_song');
    expect(deity.pleasingActs).toContain('deep_dive');
    expect(deity.pleasingActs).toContain('teaching_young');
  });

  it('should start with zero belief', () => {
    const deity = createCetaceanDeity('whale-7', 'New God', 'the_hunt');
    expect(deity.cetaceanBelief).toBe(0);
  });

  it('should not be human perceptible by default', () => {
    const deity = createCetaceanDeity('whale-8', 'Hidden', 'the_silence');
    expect(deity.humanPerceptible).toBe(false);
  });
});

// ============================================================================
// createWhalePatheon Tests
// ============================================================================

describe('createWhalePatheon', () => {
  it('should create four whale deities', () => {
    const pantheon = createWhalePatheon();
    expect(pantheon).toHaveLength(4);
  });

  it('should include The Dweller in Darkness (the_deep)', () => {
    const pantheon = createWhalePatheon();
    const deepGod = pantheon.find((d) => d.domain === 'the_deep');

    expect(deepGod).toBeDefined();
    expect(deepGod!.translatedName).toBe('The Dweller in Darkness');
    expect(deepGod!.perceivedNature).toBe('depth_presence');
    expect(deepGod!.manifestation.form).toBe('pressure_change');
    expect(deepGod!.humanPerceptible).toBe(false);
  });

  it('should include The Memory of All Songs (the_song)', () => {
    const pantheon = createWhalePatheon();
    const songGod = pantheon.find((d) => d.domain === 'the_song');

    expect(songGod).toBeDefined();
    expect(songGod!.translatedName).toBe('The Memory of All Songs');
    expect(songGod!.perceivedNature).toBe('song_spirit');
    expect(songGod!.manifestation.form).toBe('song_only');
    expect(songGod!.humanPerceptible).toBe(true);
    expect(songGod!.humanInterpretation).toContain('ghost whales');
  });

  it('should include She Who Gives Breath (the_breath)', () => {
    const pantheon = createWhalePatheon();
    const breathGod = pantheon.find((d) => d.domain === 'the_breath');

    expect(breathGod).toBeDefined();
    expect(breathGod!.translatedName).toBe('She Who Gives Breath');
    expect(breathGod!.perceivedNature).toBe('breath_giver');
    expect(breathGod!.humanPerceptible).toBe(true);
    expect(breathGod!.humanInterpretation).toContain('great white whale');
  });

  it('should include The Scarred One (the_wound)', () => {
    const pantheon = createWhalePatheon();
    const woundGod = pantheon.find((d) => d.domain === 'the_wound');

    expect(woundGod).toBeDefined();
    expect(woundGod!.translatedName).toBe('The Scarred One');
    expect(woundGod!.secondaryDomains).toContain('the_remembrance');
    expect(woundGod!.offensiveActs).toContain('forgetting the dead');
    expect(woundGod!.humanPerceptible).toBe(false);
  });

  it('should have unique ids for all deities', () => {
    const pantheon = createWhalePatheon();
    const ids = pantheon.map((d) => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have varying song durations', () => {
    const pantheon = createWhalePatheon();
    const durations = pantheon.map((d) => d.songName.duration);

    // The Eternal Song should be very long
    expect(Math.max(...durations)).toBeGreaterThanOrEqual(300);

    // Quick breath call should be short
    expect(Math.min(...durations)).toBeLessThanOrEqual(10);
  });
});

// ============================================================================
// createPackDeity Tests
// ============================================================================

describe('createPackDeity', () => {
  it('should create canid deity with howl', () => {
    const deity = createPackDeity('wolf-1', 'canid', 'The Great Alpha', 'the_alpha');
    expect(deity.speciesCategory).toBe('canid');
    expect(deity.callName.type).toBe('howl');
  });

  it('should create felid deity with roar', () => {
    const deity = createPackDeity('lion-1', 'felid', 'The Pride Spirit', 'the_pack');
    expect(deity.speciesCategory).toBe('felid');
    expect(deity.callName.type).toBe('roar');
  });

  it('should create ursid deity with growl', () => {
    const deity = createPackDeity('bear-1', 'ursid', 'The Great Bear', 'the_territory');
    expect(deity.speciesCategory).toBe('ursid');
    expect(deity.callName.type).toBe('growl');
  });

  it('should create ungulate deity with call', () => {
    const deity = createPackDeity('elk-1', 'ungulate', 'The Herd Spirit', 'the_pack');
    expect(deity.speciesCategory).toBe('ungulate');
    expect(deity.callName.type).toBe('call');
  });

  it('should set correct domain', () => {
    const huntDeity = createPackDeity('wolf-2', 'canid', 'Hunt Spirit', 'the_hunt');
    expect(huntDeity.domain).toBe('the_hunt');

    const moonDeity = createPackDeity('wolf-3', 'canid', 'Moon Howler', 'the_moon');
    expect(moonDeity.domain).toBe('the_moon');
  });

  it('should use pack_spirit as default nature', () => {
    const deity = createPackDeity('wolf-4', 'canid', 'Pack God', 'the_pack');
    expect(deity.perceivedNature).toBe('pack_spirit');
  });

  it('should have appropriate manifestation', () => {
    const deity = createPackDeity('wolf-5', 'canid', 'Territory Guardian', 'the_territory');
    expect(deity.manifestation.form).toBe('great_beast');
    expect(deity.manifestation.presenceSigns).toContain('scent on the wind');
  });

  it('should start with zero belief', () => {
    const deity = createPackDeity('wolf-6', 'canid', 'New God', 'the_howl');
    expect(deity.packBelief).toBe(0);
  });
});

// ============================================================================
// createCorvidDeity Tests
// ============================================================================

describe('createCorvidDeity', () => {
  it('should create corvid deity with correct type', () => {
    const deity = createCorvidDeity('crow-1', 'The Clever One', 'the_trick');
    expect(deity.entityType).toBe('animal_deity');
    expect(deity.speciesCategory).toBe('corvid');
  });

  it('should set domain correctly', () => {
    const deity = createCorvidDeity('crow-2', 'Death Watcher', 'the_carrion');
    expect(deity.domain).toBe('the_carrion');
  });

  it('should use 0.5 as default trickster aspect', () => {
    const deity = createCorvidDeity('crow-3', 'Average Crow God', 'the_sky');
    expect(deity.tricksterAspect).toBe(0.5);
  });

  it('should accept custom trickster aspect', () => {
    const prankster = createCorvidDeity('crow-4', 'The Prankster', 'the_trick', 0.9);
    expect(prankster.tricksterAspect).toBe(0.9);

    const solemn = createCorvidDeity('crow-5', 'The Solemn', 'the_carrion', 0.1);
    expect(solemn.tricksterAspect).toBe(0.1);
  });

  it('should manifest as shadow for high trickster', () => {
    const trickster = createCorvidDeity('crow-6', 'Trickster', 'the_trick', 0.8);
    expect(trickster.manifestation.form).toBe('shadow');
  });

  it('should manifest as enormous corvid for low trickster', () => {
    const serious = createCorvidDeity('crow-7', 'The Serious', 'the_roost', 0.3);
    expect(serious.manifestation.form).toBe('enormous_corvid');
  });

  it('should have corvid-appropriate pleasing gifts', () => {
    const deity = createCorvidDeity('crow-8', 'Gift Receiver', 'the_shiny');
    expect(deity.pleasingGifts).toContain('shiny_object');
    expect(deity.pleasingGifts).toContain('puzzle_solving');
    expect(deity.pleasingGifts).toContain('food_share');
  });

  it('should start with zero belief', () => {
    const deity = createCorvidDeity('crow-9', 'New God', 'the_murder');
    expect(deity.corvidBelief).toBe(0);
  });
});

// ============================================================================
// calculateCrossSpeciesPerception Tests
// ============================================================================

describe('calculateCrossSpeciesPerception', () => {
  it('should return clear for same species', () => {
    expect(calculateCrossSpeciesPerception(0.6, 'cetacean', 'cetacean')).toBe('clear');
    expect(calculateCrossSpeciesPerception(0.5, 'canid', 'canid')).toBe('clear');
    expect(calculateCrossSpeciesPerception(0.4, 'corvid', 'corvid')).toBe('clear');
  });

  it('should return none for low intelligence', () => {
    expect(calculateCrossSpeciesPerception(0.5, 'canid', 'felid')).toBe('none');
    expect(calculateCrossSpeciesPerception(0.69, 'cetacean', 'human')).toBe('none');
  });

  it('should return partial for similar species with high intelligence', () => {
    expect(calculateCrossSpeciesPerception(0.85, 'canid', 'felid')).toBe('partial');
    expect(calculateCrossSpeciesPerception(0.9, 'canid', 'ursid')).toBe('partial');
  });

  it('should return distorted for similar species with moderate intelligence', () => {
    expect(calculateCrossSpeciesPerception(0.75, 'canid', 'felid')).toBe('distorted');
    expect(calculateCrossSpeciesPerception(0.8, 'corvid', 'avian_raptor')).toBe('distorted');
  });

  it('should return distorted for human gods with very high intelligence', () => {
    expect(calculateCrossSpeciesPerception(0.9, 'cetacean', 'human')).toBe('distorted');
    expect(calculateCrossSpeciesPerception(0.95, 'primate', 'human')).toBe('distorted');
  });

  it('should return vague for human gods with high intelligence', () => {
    expect(calculateCrossSpeciesPerception(0.8, 'canid', 'human')).toBe('vague');
    expect(calculateCrossSpeciesPerception(0.85, 'corvid', 'human')).toBe('vague');
  });

  it('should return vague for very distant species with extreme intelligence', () => {
    expect(calculateCrossSpeciesPerception(0.95, 'cetacean', 'insectoid')).toBe('vague');
    expect(calculateCrossSpeciesPerception(0.98, 'corvid', 'cephalopod')).toBe('vague');
  });

  it('should return none for distant species without extreme intelligence', () => {
    expect(calculateCrossSpeciesPerception(0.8, 'cetacean', 'canid')).toBe('none');
    expect(calculateCrossSpeciesPerception(0.85, 'pachyderm', 'corvid')).toBe('none');
  });
});

// ============================================================================
// calculateAnimalBeliefGeneration Tests
// ============================================================================

describe('calculateAnimalBeliefGeneration', () => {
  it('should use base rate for activity', () => {
    const rate = calculateAnimalBeliefGeneration('group_vocalization', 1.0, 1);
    expect(rate).toBeCloseTo(0.15, 2);
  });

  it('should scale with intelligence', () => {
    const highInt = calculateAnimalBeliefGeneration('ritual_feeding', 1.0, 1);
    const lowInt = calculateAnimalBeliefGeneration('ritual_feeding', 0.5, 1);

    expect(highInt).toBeGreaterThan(lowInt);
  });

  it('should have minimum intelligence multiplier of 0.5', () => {
    const veryLow = calculateAnimalBeliefGeneration('ritual_feeding', 0.1, 1);
    const minimum = calculateAnimalBeliefGeneration('ritual_feeding', 0.5, 1);

    expect(veryLow).toBe(minimum);
  });

  it('should increase with group size', () => {
    const solo = calculateAnimalBeliefGeneration('synchronized_movement', 0.8, 1);
    const pair = calculateAnimalBeliefGeneration('synchronized_movement', 0.8, 2);
    const pack = calculateAnimalBeliefGeneration('synchronized_movement', 0.8, 10);
    const herd = calculateAnimalBeliefGeneration('synchronized_movement', 0.8, 100);

    expect(pair).toBeGreaterThan(solo);
    expect(pack).toBeGreaterThan(pair);
    expect(herd).toBeGreaterThan(pack);
  });

  it('should have logarithmic group bonus', () => {
    const solo = calculateAnimalBeliefGeneration('group_vocalization', 1.0, 1);
    const small = calculateAnimalBeliefGeneration('group_vocalization', 1.0, 8);
    const large = calculateAnimalBeliefGeneration('group_vocalization', 1.0, 64);

    // Each 8x increase should add approximately equal bonus
    const smallBonus = small - solo;
    const largeBonus = large - small;

    expect(largeBonus).toBeCloseTo(smallBonus, 1);
  });

  it('should return high values for rare activities', () => {
    const seasonal = calculateAnimalBeliefGeneration('seasonal_gathering', 1.0, 100);
    const common = calculateAnimalBeliefGeneration('territory_marking', 1.0, 100);

    expect(seasonal).toBeGreaterThan(common * 10);
  });
});

// ============================================================================
// Type Structure Tests
// ============================================================================

describe('type structures', () => {
  describe('BeliefCapacity', () => {
    it('should include all capacity levels', () => {
      const capacities: BeliefCapacity[] = [
        'none',
        'aware',
        'proto',
        'communal',
        'believing',
        'communicative',
        'devotional',
        'priestly',
        'theological',
      ];
      expect(capacities).toHaveLength(9);
    });
  });

  describe('SpeciesCategory', () => {
    it('should include major animal groups', () => {
      const species: SpeciesCategory[] = [
        'cetacean',
        'primate',
        'corvid',
        'canid',
        'felid',
        'ursid',
        'pachyderm',
        'cephalopod',
        'ungulate',
        'rodent',
        'avian_raptor',
        'reptilian',
        'insectoid',
        'mythical',
        'other',
      ];
      expect(species).toHaveLength(15);
    });
  });

  describe('CetaceanDivineDomain', () => {
    it('should include whale-specific domains', () => {
      const domains: CetaceanDivineDomain[] = [
        'the_deep',
        'the_song',
        'the_breath',
        'the_current',
        'the_pod',
        'the_hunt',
        'the_silence',
        'the_warmth',
        'the_echo',
        'the_breach',
        'the_leviathan',
        'the_wound',
        'the_remembrance',
      ];
      expect(domains).toHaveLength(13);
    });
  });

  describe('DivineSense', () => {
    it('should include diverse sensory modalities', () => {
      const senses: DivineSense[] = [
        'echolocation',
        'song',
        'scent',
        'vision',
        'pressure',
        'magnetism',
        'vibration',
        'electrical',
        'thermal',
        'chemical',
      ];
      expect(senses).toHaveLength(10);
    });
  });

  describe('DivineConceptType', () => {
    it('should include diverse conceptualization types', () => {
      const types: DivineConceptType[] = [
        'anthropomorphic',
        'elemental',
        'ancestral',
        'abstract',
        'pack_spirit',
        'territorial',
        'cyclical',
        'predator_prey',
      ];
      expect(types).toHaveLength(8);
    });
  });
});

// ============================================================================
// Gameplay Scenarios
// ============================================================================

describe('gameplay scenarios', () => {
  it('should demonstrate intelligent whale forming beliefs', () => {
    const whaleIntelligence = 0.65;

    // Can form beliefs
    expect(canFormBeliefs(whaleIntelligence)).toBe(true);
    expect(getBeliefCapacity(whaleIntelligence)).toBe('believing');

    // Perceives cetacean divine concepts
    const perception = getSpeciesDivinePerception('cetacean');
    expect(perception.sacredConcepts).toContain('the song');

    // Generates belief through song
    const beliefGenerated = calculateAnimalBeliefGeneration('group_vocalization', whaleIntelligence, 15);
    expect(beliefGenerated).toBeGreaterThan(0);
  });

  it('should demonstrate whale shaman leading worship', () => {
    const shamanIntelligence = 0.88;

    // Qualifies as priestly
    expect(getBeliefCapacity(shamanIntelligence)).toBe('priestly');

    // Large pod synchronized singing
    const beliefGenerated = calculateAnimalBeliefGeneration('synchronized_movement', shamanIntelligence, 50);

    // Should generate significant belief (base 0.2 * 0.88 intelligence * ~1.5 group bonus)
    expect(beliefGenerated).toBeGreaterThan(0.25);
  });

  it('should demonstrate wolf pack worshipping hunt spirit', () => {
    const packDeity = createPackDeity('hunt-spirit-1', 'canid', 'The Endless Chase', 'the_hunt');

    expect(packDeity.domain).toBe('the_hunt');
    expect(packDeity.devotionActs).toContain('pack running');

    // Pack howling before hunt
    const preHuntBelief = calculateAnimalBeliefGeneration('group_vocalization', 0.7, 8);
    expect(preHuntBelief).toBeGreaterThan(0.1);
  });

  it('should demonstrate crow offering shiny object to trickster god', () => {
    const tricksterGod = createCorvidDeity('crow-trickster', 'The Clever Shadow', 'the_trick', 0.85);

    expect(tricksterGod.tricksterAspect).toBe(0.85);
    expect(tricksterGod.manifestation.form).toBe('shadow');
    expect(tricksterGod.pleasingGifts).toContain('shiny_object');

    // Gift giving generates belief
    const beliefFromGift = calculateAnimalBeliefGeneration('gift_giving', 0.75, 1);
    expect(beliefFromGift).toBeGreaterThan(0.2);
  });

  it('should demonstrate elephant remembering ancestor deity', () => {
    const elephantIntelligence = 0.8;
    const perception = getSpeciesDivinePerception('pachyderm');

    expect(perception.sacredConcepts).toContain('memory');
    expect(perception.sacredConcepts).toContain('ancestors');
    expect(perception.sacredPlaceTypes).toContain('bone yards');

    // Death mourning generates high belief
    const mourningBelief = calculateAnimalBeliefGeneration('death_mourning', elephantIntelligence, 20);
    expect(mourningBelief).toBeGreaterThan(0.5);

    // Elephants can perceive human gods differently
    expect(perception.humanGodPerception).toBe('different');
    expect(perception.perceptibleToHumans).toBe('different');
  });

  it('should demonstrate whale perceiving human sea god distortedly', () => {
    const smartWhale = 0.92;

    // Can perceive human gods but distorted
    const perception = calculateCrossSpeciesPerception(smartWhale, 'cetacean', 'human');
    expect(perception).toBe('distorted');

    // A whale might interpret Poseidon as another whale deity
  });

  it('should demonstrate complete whale religious event', () => {
    // Create whale pantheon
    const pantheon = createWhalePatheon();
    const songGod = pantheon.find((d) => d.domain === 'the_song')!;

    // Pod of 30 whales with shaman (0.87 intelligence)
    const podSize = 30;
    const shamanIntelligence = 0.87;

    // They perform seasonal song gathering
    const beliefGenerated = calculateAnimalBeliefGeneration(
      'seasonal_gathering',
      shamanIntelligence,
      podSize
    );

    // High belief from this major event
    expect(beliefGenerated).toBeGreaterThan(1.0);

    // The deity receives this belief
    songGod.cetaceanBelief += beliefGenerated;
    expect(songGod.cetaceanBelief).toBeGreaterThan(1.0);

    // Humans at sea might hear the ceremony
    expect(songGod.humanPerceptible).toBe(true);
    expect(songGod.humanInterpretation).toContain('ghost whales');
  });

  it('should demonstrate cross-species divine war', () => {
    // Orca (cetacean) trying to perceive seal deity
    const orcaIntelligence = 0.75;

    // Orcas can't perceive seal gods (if seals had gods)
    const perception = calculateCrossSpeciesPerception(orcaIntelligence, 'cetacean', 'other');
    expect(perception).toBe('none');

    // But very intelligent orca might sense something
    const smartOrca = 0.96;
    const smartPerception = calculateCrossSpeciesPerception(smartOrca, 'cetacean', 'other');
    expect(smartPerception).toBe('vague');
  });
});

// ============================================================================
// Edge Cases & Boundaries
// ============================================================================

describe('edge cases', () => {
  it('should handle zero intelligence', () => {
    expect(canFormBeliefs(0)).toBe(false);
    expect(getBeliefCapacity(0)).toBe('none');
    expect(calculateAnimalBeliefGeneration('group_vocalization', 0, 1)).toBeGreaterThan(0);
  });

  it('should handle maximum intelligence', () => {
    expect(canFormBeliefs(1.0)).toBe(true);
    expect(getBeliefCapacity(1.0)).toBe('theological');
    expect(calculateCrossSpeciesPerception(1.0, 'cetacean', 'human')).toBe('distorted');
  });

  it('should handle solo worship', () => {
    const soloBelief = calculateAnimalBeliefGeneration('silence_keeping', 0.8, 1);
    expect(soloBelief).toBeGreaterThan(0);
  });

  it('should handle massive groups', () => {
    const hugeBelief = calculateAnimalBeliefGeneration('synchronized_movement', 0.7, 10000);
    // Group bonus is logarithmic: 0.1 * log2(10000) ≈ 1.33
    // So: 0.2 * 0.7 * (1 + 1.33) ≈ 0.33
    expect(hugeBelief).toBeGreaterThan(0.3);
    // But shouldn't be absurdly high due to log scaling
    expect(hugeBelief).toBeLessThan(1);
  });

  it('should handle mythical species', () => {
    const perception = getSpeciesDivinePerception('mythical');
    // Falls back to default
    expect(perception.divineConceptualization).toBe('territorial');
  });
});
