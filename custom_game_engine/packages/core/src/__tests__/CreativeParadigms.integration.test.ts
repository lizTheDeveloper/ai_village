/**
 * Creative Paradigms Integration Tests
 *
 * Tests for unique and unconventional magic systems including:
 * - Fiction-inspired: Sympathy, Allomancy, Dream, Song, Rune
 * - Weird concepts: Debt, Bureaucratic, Luck, Threshold, Belief, etc.
 * - Seasonal/Cyclical: Lunar, Seasonal, Age
 * - Spiritual: Shinto
 */

import { describe, it, expect } from 'vitest';
import {
  SYMPATHY_PARADIGM,
  ALLOMANCY_PARADIGM,
  DREAM_PARADIGM,
  SONG_PARADIGM,
  RUNE_PARADIGM,
  DEBT_PARADIGM,
  BUREAUCRATIC_PARADIGM,
  LUCK_PARADIGM,
  THRESHOLD_PARADIGM,
  BELIEF_PARADIGM,
  CONSUMPTION_PARADIGM,
  SILENCE_PARADIGM,
  PARADOX_PARADIGM,
  ECHO_PARADIGM,
  GAME_PARADIGM,
  CRAFT_PARADIGM,
  COMMERCE_PARADIGM,
  LUNAR_PARADIGM,
  SEASONAL_PARADIGM,
  AGE_PARADIGM,
  SHINTO_PARADIGM,
  ALL_CREATIVE_PARADIGMS,
} from '../magic/CreativeParadigms';

describe('Creative Paradigms - Fiction-Inspired', () => {
  describe('Sympathy Paradigm (Kingkiller)', () => {
    it('should have similarity as absolute law', () => {
      const similarityLaw = SYMPATHY_PARADIGM.laws.find((l) => l.type === 'similarity');
      expect(similarityLaw).toBeDefined();
      expect(similarityLaw?.strength).toBe('absolute');
      expect(similarityLaw?.circumventable).toBe(false);
    });

    it('should require will, focus, and material channels', () => {
      const requiredChannels = SYMPATHY_PARADIGM.channels.filter(
        (c) => c.requirement === 'required'
      );
      expect(requiredChannels.length).toBe(3);
      expect(requiredChannels.find((c) => c.name === 'will')).toBeDefined();
      expect(requiredChannels.find((c) => c.name === 'focus')).toBeDefined();
      expect(requiredChannels.find((c) => c.name === 'material')).toBeDefined();
    });

    it('should have backlash risk on failure', () => {
      const backlashRisk = SYMPATHY_PARADIGM.risks.find((r) => r.consequence === 'backlash');
      expect(backlashRisk).toBeDefined();
      expect(backlashRisk?.severity).toBe('severe');
    });
  });

  describe('Allomancy Paradigm (Mistborn)', () => {
    it('should use material source with consumption regeneration', () => {
      const materialSource = ALLOMANCY_PARADIGM.sources.find((s) => s.type === 'material');
      expect(materialSource).toBeDefined();
      expect(materialSource?.regeneration).toBe('consumption');
    });

    it('should require consumption channel', () => {
      const consumptionChannel = ALLOMANCY_PARADIGM.channels.find(
        (c) => c.name === 'consumption'
      );
      expect(consumptionChannel).toBeDefined();
      expect(consumptionChannel?.requirement).toBe('required');
    });

    it('should have very high power ceiling', () => {
      expect(ALLOMANCY_PARADIGM.powerCeiling).toBe(200);
    });

    it('should not allow teaching (must be born with it)', () => {
      expect(ALLOMANCY_PARADIGM.allowsTeaching).toBe(false);
    });
  });

  describe('Dream Magic Paradigm', () => {
    it('should cost sanity and memory', () => {
      const sanityCost = DREAM_PARADIGM.costs.find((c) => c.type === 'sanity');
      const memoryCost = DREAM_PARADIGM.costs.find((c) => c.type === 'memory');
      expect(sanityCost).toBeDefined();
      expect(memoryCost).toBeDefined();
    });

    it('should have catastrophic risk of being unable to wake', () => {
      const wakeRisk = DREAM_PARADIGM.risks.find((r) => r.consequence === 'cannot_wake');
      expect(wakeRisk).toBeDefined();
      expect(wakeRisk?.severity).toBe('catastrophic');
    });

    it('should allow group casting with strong multiplier', () => {
      expect(DREAM_PARADIGM.allowsGroupCasting).toBe(true);
      expect(DREAM_PARADIGM.groupCastingMultiplier).toBe(2.0);
    });

    it('should persist after death', () => {
      expect(DREAM_PARADIGM.persistsAfterDeath).toBe(true);
    });
  });

  describe('Song Magic Paradigm', () => {
    it('should require musical and verbal channels', () => {
      const musicalChannel = SONG_PARADIGM.channels.find((c) => c.name === 'musical');
      const verbalChannel = SONG_PARADIGM.channels.find((c) => c.name === 'verbal');
      expect(musicalChannel?.requirement).toBe('required');
      expect(verbalChannel?.requirement).toBe('required');
    });

    it('should have resonance law', () => {
      const resonanceLaw = SONG_PARADIGM.laws.find((l) => l.type === 'resonance');
      expect(resonanceLaw).toBeDefined();
      expect(resonanceLaw?.strength).toBe('absolute');
    });

    it('should have very strong group casting multiplier for choirs', () => {
      expect(SONG_PARADIGM.groupCastingMultiplier).toBe(2.5);
    });

    it('should conflict with silence magic', () => {
      expect(SONG_PARADIGM.conflictingParadigms).toContain('silence');
    });
  });

  describe('Rune Magic Paradigm', () => {
    it('should require glyph channel', () => {
      const glyphChannel = RUNE_PARADIGM.channels.find((c) => c.name === 'glyph');
      expect(glyphChannel?.requirement).toBe('required');
    });

    it('should have rune explosion risk', () => {
      const explosionRisk = RUNE_PARADIGM.risks.find(
        (r) => r.consequence === 'rune_explosion'
      );
      expect(explosionRisk).toBeDefined();
      expect(explosionRisk?.severity).toBe('severe');
    });

    it('should allow enchantment', () => {
      expect(RUNE_PARADIGM.allowsEnchantment).toBe(true);
    });
  });
});

describe('Creative Paradigms - Conceptually Weird', () => {
  describe('Debt Magic Paradigm', () => {
    it('should use social source', () => {
      const socialSource = DEBT_PARADIGM.sources.find((s) => s.type === 'social');
      expect(socialSource).toBeDefined();
    });

    it('should have oath_binding as absolute law', () => {
      const oathLaw = DEBT_PARADIGM.laws.find((l) => l.type === 'oath_binding');
      expect(oathLaw?.strength).toBe('absolute');
      expect(oathLaw?.circumventable).toBe(false);
    });

    it('should have debt_called catastrophic risk', () => {
      const debtRisk = DEBT_PARADIGM.risks.find((r) => r.consequence === 'debt_called');
      expect(debtRisk?.severity).toBe('catastrophic');
    });

    it('should have predatory foreign magic policy', () => {
      expect(DEBT_PARADIGM.foreignMagicPolicy).toBe('predatory');
    });
  });

  describe('Bureaucratic Magic Paradigm', () => {
    it('should have very high time cost', () => {
      const timeCost = BUREAUCRATIC_PARADIGM.costs.find((c) => c.type === 'time');
      expect(timeCost).toBeDefined();
      expect(timeCost?.baseAmount).toBeGreaterThanOrEqual(20);
    });

    it('should have form rejection risk', () => {
      const rejectionRisk = BUREAUCRATIC_PARADIGM.risks.find(
        (r) => r.consequence === 'form_rejection'
      );
      expect(rejectionRisk).toBeDefined();
    });

    it('should have lower power ceiling but be reliable', () => {
      expect(BUREAUCRATIC_PARADIGM.powerCeiling).toBe(80);
    });

    it('should require permit for foreign magic', () => {
      expect(BUREAUCRATIC_PARADIGM.foreignMagicPolicy).toBe('requires_permit');
    });
  });

  describe('Luck Magic Paradigm', () => {
    it('should cost luck and karma', () => {
      const luckCost = LUCK_PARADIGM.costs.find((c) => c.type === 'luck');
      const karmaCost = LUCK_PARADIGM.costs.find((c) => c.type === 'karma');
      expect(luckCost).toBeDefined();
      expect(karmaCost).toBeDefined();
    });

    it('should have catastrophic misfortune risk', () => {
      const misfortuneRisk = LUCK_PARADIGM.risks.find(
        (r) => r.consequence === 'catastrophic_misfortune'
      );
      expect(misfortuneRisk?.severity).toBe('catastrophic');
      expect(misfortuneRisk?.probability).toBeGreaterThanOrEqual(0.5);
    });

    it('should not allow teaching', () => {
      expect(LUCK_PARADIGM.allowsTeaching).toBe(false);
    });
  });

  describe('Threshold Magic Paradigm', () => {
    it('should have threshold law', () => {
      const thresholdLaw = THRESHOLD_PARADIGM.laws.find((l) => l.type === 'threshold');
      expect(thresholdLaw?.strength).toBe('absolute');
    });

    it('should have stuck_between risk', () => {
      const stuckRisk = THRESHOLD_PARADIGM.risks.find((r) => r.consequence === 'stuck_between');
      expect(stuckRisk).toBeDefined();
    });

    it('should have gateway foreign magic policy', () => {
      expect(THRESHOLD_PARADIGM.foreignMagicPolicy).toBe('gateway');
    });
  });

  describe('Belief Magic Paradigm', () => {
    it('should have belief as absolute law', () => {
      const beliefLaw = BELIEF_PARADIGM.laws.find((l) => l.type === 'belief');
      expect(beliefLaw?.strength).toBe('absolute');
    });

    it('should have very high power ceiling with many believers', () => {
      expect(BELIEF_PARADIGM.powerCeiling).toBe(300);
    });

    it('should have strong group casting multiplier', () => {
      expect(BELIEF_PARADIGM.groupCastingMultiplier).toBe(3.0);
    });

    it('should absorb foreign magic', () => {
      expect(BELIEF_PARADIGM.foreignMagicPolicy).toBe('absorbs');
    });
  });

  describe('Consumption Magic Paradigm', () => {
    it('should require consumption channel', () => {
      const consumptionChannel = CONSUMPTION_PARADIGM.channels.find(
        (c) => c.name === 'consumption'
      );
      expect(consumptionChannel?.requirement).toBe('required');
    });

    it('should have permanent transformation risk', () => {
      const transformRisk = CONSUMPTION_PARADIGM.risks.find(
        (r) => r.consequence === 'permanent_transformation'
      );
      expect(transformRisk).toBeDefined();
    });

    it('should forbid digesting souls', () => {
      const forbidden = CONSUMPTION_PARADIGM.forbiddenCombinations?.find(
        (fc) => fc.technique === 'transform' && fc.form === 'spirit'
      );
      expect(forbidden).toBeDefined();
    });
  });

  describe('Silence Magic Paradigm', () => {
    it('should have secrecy law', () => {
      const secrecyLaw = SILENCE_PARADIGM.laws.find((l) => l.type === 'secrecy');
      expect(secrecyLaw?.strength).toBe('absolute');
    });

    it('should not allow teaching or scrolls', () => {
      expect(SILENCE_PARADIGM.allowsTeaching).toBe(false);
      expect(SILENCE_PARADIGM.allowsScrolls).toBe(false);
    });

    it('should conflict with song magic', () => {
      expect(SILENCE_PARADIGM.conflictingParadigms).toContain('song_magic');
    });

    it('should mute foreign magic', () => {
      expect(SILENCE_PARADIGM.foreignMagicEffect).toBe('mutes');
    });
  });

  describe('Paradox Magic Paradigm', () => {
    it('should have paradox law', () => {
      const paradoxLaw = PARADOX_PARADIGM.laws.find((l) => l.type === 'paradox');
      expect(paradoxLaw?.strength).toBe('absolute');
    });

    it('should have extremely high sanity cost', () => {
      const sanityCost = PARADOX_PARADIGM.costs.find((c) => c.type === 'sanity');
      expect(sanityCost?.baseAmount).toBeGreaterThanOrEqual(20);
    });

    it('should have very high catastrophic risk', () => {
      const realityTearRisk = PARADOX_PARADIGM.risks.find(
        (r) => r.consequence === 'reality_tear'
      );
      expect(realityTearRisk?.severity).toBe('catastrophic');
      expect(realityTearRisk?.probability).toBeGreaterThanOrEqual(0.5);
    });

    it('should have extremely high power ceiling', () => {
      expect(PARADOX_PARADIGM.powerCeiling).toBe(500);
    });

    it('should annihilate foreign magic', () => {
      expect(PARADOX_PARADIGM.foreignMagicPolicy).toBe('annihilates');
    });
  });

  describe('Echo Magic Paradigm', () => {
    it('should cost memory and time', () => {
      const memoryCost = ECHO_PARADIGM.costs.find((c) => c.type === 'memory');
      const timeCost = ECHO_PARADIGM.costs.find((c) => c.type === 'time');
      expect(memoryCost).toBeDefined();
      expect(timeCost).toBeDefined();
    });

    it('should forbid erasing the past', () => {
      const forbidden = ECHO_PARADIGM.forbiddenCombinations?.find(
        (fc) => fc.technique === 'destroy' && fc.form === 'time'
      );
      expect(forbidden).toBeDefined();
    });
  });

  describe('Game Magic Paradigm', () => {
    it('should have oath_binding and consent as absolute laws', () => {
      const oathLaw = GAME_PARADIGM.laws.find((l) => l.type === 'oath_binding');
      const consentLaw = GAME_PARADIGM.laws.find((l) => l.type === 'consent');
      expect(oathLaw?.strength).toBe('absolute');
      expect(consentLaw?.strength).toBe('absolute');
    });

    it('should have lose_stakes catastrophic risk', () => {
      const loseRisk = GAME_PARADIGM.risks.find((r) => r.consequence === 'lose_stakes');
      expect(loseRisk?.severity).toBe('catastrophic');
    });
  });

  describe('Craft Magic Paradigm', () => {
    it('should have high time and material costs', () => {
      const materialCost = CRAFT_PARADIGM.costs.find((c) => c.type === 'material');
      const timeCost = CRAFT_PARADIGM.costs.find((c) => c.type === 'time');
      expect(materialCost?.baseAmount).toBeGreaterThanOrEqual(15);
      expect(timeCost?.baseAmount).toBeGreaterThanOrEqual(20);
    });

    it('should allow enchantment', () => {
      expect(CRAFT_PARADIGM.allowsEnchantment).toBe(true);
    });

    it('should persist after death', () => {
      expect(CRAFT_PARADIGM.persistsAfterDeath).toBe(true);
    });
  });

  describe('Commerce Magic Paradigm', () => {
    it('should cost gold and oath', () => {
      const goldCost = COMMERCE_PARADIGM.costs.find((c) => c.type === 'gold');
      const oathCost = COMMERCE_PARADIGM.costs.find((c) => c.type === 'oath');
      expect(goldCost).toBeDefined();
      expect(oathCost).toBeDefined();
    });

    it('should have market crash risk', () => {
      const crashRisk = COMMERCE_PARADIGM.risks.find((r) => r.consequence === 'market_crash');
      expect(crashRisk).toBeDefined();
    });

    it('should trade with foreign magic', () => {
      expect(COMMERCE_PARADIGM.foreignMagicPolicy).toBe('trades_with');
    });
  });
});

describe('Creative Paradigms - Seasonal/Cyclical', () => {
  describe('Lunar Magic Paradigm', () => {
    it('should have cycles law', () => {
      const cyclesLaw = LUNAR_PARADIGM.laws.find((l) => l.type === 'cycles');
      expect(cyclesLaw?.strength).toBe('absolute');
    });

    it('should have moon madness risk', () => {
      const madnessRisk = LUNAR_PARADIGM.risks.find((r) => r.consequence === 'moon_madness');
      expect(madnessRisk).toBeDefined();
    });

    it('should have lycanthropy transformation risk', () => {
      const transformRisk = LUNAR_PARADIGM.risks.find((r) => r.consequence === 'transformation');
      expect(transformRisk?.severity).toBe('catastrophic');
    });

    it('should conflict with solar magic', () => {
      expect(LUNAR_PARADIGM.conflictingParadigms).toContain('solar');
    });
  });

  describe('Seasonal Magic Paradigm', () => {
    it('should have cycles law', () => {
      const cyclesLaw = SEASONAL_PARADIGM.laws.find((l) => l.type === 'cycles');
      expect(cyclesLaw?.strength).toBe('absolute');
    });

    it('should have seasonal_lock catastrophic risk', () => {
      const lockRisk = SEASONAL_PARADIGM.risks.find((r) => r.consequence === 'seasonal_lock');
      expect(lockRisk?.severity).toBe('catastrophic');
    });

    it('should have resonant combinations for each season', () => {
      expect(SEASONAL_PARADIGM.resonantCombinations).toBeDefined();
      expect(SEASONAL_PARADIGM.resonantCombinations!.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Age Magic Paradigm', () => {
    it('should cost lifespan', () => {
      const lifespanCost = AGE_PARADIGM.costs.find((c) => c.type === 'lifespan');
      expect(lifespanCost).toBeDefined();
      expect(lifespanCost?.powerMultiplier).toBeGreaterThanOrEqual(5.0);
    });

    it('should have rapid_aging catastrophic risk', () => {
      const agingRisk = AGE_PARADIGM.risks.find((r) => r.consequence === 'rapid_aging');
      expect(agingRisk?.severity).toBe('catastrophic');
    });

    it('should have death risk', () => {
      const deathRisk = AGE_PARADIGM.risks.find((r) => r.consequence === 'death');
      expect(deathRisk?.severity).toBe('catastrophic');
    });

    it('should have very high power ceiling', () => {
      expect(AGE_PARADIGM.powerCeiling).toBe(300);
    });

    it('should not allow teaching', () => {
      expect(AGE_PARADIGM.allowsTeaching).toBe(false);
    });
  });
});

describe('Creative Paradigms - Spiritual', () => {
  describe('Shinto Paradigm', () => {
    it('should use ancestral source with ritual regeneration', () => {
      const ancestralSource = SHINTO_PARADIGM.sources.find((s) => s.type === 'ancestral');
      expect(ancestralSource).toBeDefined();
      expect(ancestralSource?.regeneration).toBe('ritual');
    });

    it('should require prayer and material channels', () => {
      const prayerChannel = SHINTO_PARADIGM.channels.find((c) => c.name === 'prayer');
      const materialChannel = SHINTO_PARADIGM.channels.find((c) => c.name === 'material');
      expect(prayerChannel?.requirement).toBe('required');
      expect(materialChannel?.requirement).toBe('required');
    });

    it('should have consent law (kami must agree)', () => {
      const consentLaw = SHINTO_PARADIGM.laws.find((l) => l.type === 'consent');
      expect(consentLaw?.strength).toBe('absolute');
    });

    it('should forbid destroying spirits', () => {
      const forbidden = SHINTO_PARADIGM.forbiddenCombinations?.find(
        (fc) => fc.technique === 'destroy' && fc.form === 'spirit'
      );
      expect(forbidden).toBeDefined();
      expect(forbidden?.reason).toContain('Cannot destroy kami');
    });

    it('should have curse risk from offending kami', () => {
      const curseRisk = SHINTO_PARADIGM.risks.find((r) => r.consequence === 'curse');
      expect(curseRisk).toBeDefined();
    });

    it('should persist after death (become kami)', () => {
      expect(SHINTO_PARADIGM.persistsAfterDeath).toBe(true);
    });

    it('should allow enchantment (talismans)', () => {
      expect(SHINTO_PARADIGM.allowsEnchantment).toBe(true);
    });

    it('should conflict with void and blood magic', () => {
      expect(SHINTO_PARADIGM.conflictingParadigms).toContain('void');
      expect(SHINTO_PARADIGM.conflictingParadigms).toContain('blood_magic');
    });
  });
});

describe('Creative Paradigms - Collection Tests', () => {
  it('should export all 21 paradigms', () => {
    expect(ALL_CREATIVE_PARADIGMS).toBeDefined();
    expect(ALL_CREATIVE_PARADIGMS.length).toBe(21);
  });

  it('should have unique IDs for all paradigms', () => {
    const ids = ALL_CREATIVE_PARADIGMS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ALL_CREATIVE_PARADIGMS.length);
  });

  it('should all have valid cost types', () => {
    const validCostTypes = [
      'mana',
      'health',
      'stamina',
      'lifespan',
      'sanity',
      'memory',
      'emotion',
      'material',
      'time',
      'favor',
      'karma',
      'gold',
      'soul_fragment',
      'corruption',
      'attention',
      'oath',
      'blood',
      'beauty',
      'luck',
      'faith',
    ];

    ALL_CREATIVE_PARADIGMS.forEach((paradigm) => {
      paradigm.costs.forEach((cost) => {
        expect(validCostTypes).toContain(cost.type);
      });
    });
  });

  it('should all have at least one source', () => {
    ALL_CREATIVE_PARADIGMS.forEach((paradigm) => {
      expect(paradigm.sources.length).toBeGreaterThan(0);
    });
  });

  it('should all have at least one technique and form', () => {
    ALL_CREATIVE_PARADIGMS.forEach((paradigm) => {
      expect(paradigm.availableTechniques.length).toBeGreaterThan(0);
      expect(paradigm.availableForms.length).toBeGreaterThan(0);
    });
  });

  it('should all have valid power scaling', () => {
    const validScaling = ['linear', 'exponential', 'logarithmic', 'step', 'threshold'];

    ALL_CREATIVE_PARADIGMS.forEach((paradigm) => {
      expect(validScaling).toContain(paradigm.powerScaling);
    });
  });

  it('should all have reasonable power ceilings', () => {
    ALL_CREATIVE_PARADIGMS.forEach((paradigm) => {
      expect(paradigm.powerCeiling).toBeGreaterThan(0);
      expect(paradigm.powerCeiling).toBeLessThanOrEqual(500);
    });
  });
});

describe('Creative Paradigms - Unique Mechanics', () => {
  it('Sympathy should enforce similarity connections', () => {
    const similarityLaw = SYMPATHY_PARADIGM.laws.find((l) => l.type === 'similarity');
    const contagionLaw = SYMPATHY_PARADIGM.laws.find((l) => l.type === 'contagion');
    expect(similarityLaw).toBeDefined();
    expect(contagionLaw).toBeDefined();
  });

  it('Allomancy should be bloodline-based', () => {
    const bloodlineMethod = ALLOMANCY_PARADIGM.acquisitionMethods.find(
      (m) => m.method === 'bloodline'
    );
    expect(bloodlineMethod).toBeDefined();
  });

  it('Debt magic should have predatory foreign policy', () => {
    expect(DEBT_PARADIGM.foreignMagicPolicy).toBe('predatory');
    expect(DEBT_PARADIGM.foreignMagicEffect).toBe('consumes');
  });

  it('Bureaucratic magic should be slow but reliable', () => {
    const timeCost = BUREAUCRATIC_PARADIGM.costs.find((c) => c.type === 'time');
    expect(timeCost?.powerMultiplier).toBeGreaterThanOrEqual(3.0);
    expect(BUREAUCRATIC_PARADIGM.powerCeiling).toBeLessThan(100);
  });

  it('Paradox magic should be extremely dangerous', () => {
    const catastrophicRisks = PARADOX_PARADIGM.risks.filter(
      (r) => r.severity === 'catastrophic'
    );
    expect(catastrophicRisks.length).toBeGreaterThan(0);
    expect(PARADOX_PARADIGM.conflictingParadigms).toContain('all');
  });

  it('Silence magic should conflict with verbal magic', () => {
    expect(SILENCE_PARADIGM.conflictingParadigms).toContain('song_magic');
    expect(SILENCE_PARADIGM.allowsTeaching).toBe(false);
  });

  it('Belief magic should scale with believers', () => {
    expect(BELIEF_PARADIGM.groupCastingMultiplier).toBeGreaterThanOrEqual(3.0);
    expect(BELIEF_PARADIGM.powerCeiling).toBeGreaterThanOrEqual(300);
  });

  it('Shinto should honor spirits through offerings', () => {
    const materialCost = SHINTO_PARADIGM.costs.find((c) => c.type === 'material');
    expect(materialCost).toBeDefined();
    const prayerChannel = SHINTO_PARADIGM.channels.find((c) => c.name === 'prayer');
    expect(prayerChannel).toBeDefined();
  });
});
