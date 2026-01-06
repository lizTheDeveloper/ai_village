import { describe, it, expect } from 'vitest';
import {
  // Constants
  SPIRIT_MAGNITUDE_THRESHOLDS,

  // Factory Functions
  createSpiritNaming,
  createDefaultDisposition,
  createDefaultManifestation,
  createDefaultInfluence,
  createDefaultOfferingPreferences,
  createPlaceSpirit,
  createAncestorSpirit,
  createObjectSpirit,

  // Helper Functions
  getMagnitudeForRespect,
  inferInfluenceFromDwelling,
  inferInfluenceFromObject,
  inferOfferingsFromObject,
  calculateOfferingRespect,
  updateDispositionFromRespect,
  canGrantBlessing,
  willCauseTrouble,

  // Types
  type Spirit,
  type SpiritCategory,
  type DwellingType,
  type SpiritObjectType,
  type SpiritDisposition,
  type SpiritMagnitude,
  type OfferingType,
  type InfluenceSphere,
  type SpiritRange,
  type SpiritFormType,
  type PollutionSource,
  type PurificationType,
  type SpiritOrigin,
  type DispositionFactors,
} from '../AnimistTypes.js';

// ============================================================================
// SPIRIT_MAGNITUDE_THRESHOLDS Tests
// ============================================================================

describe('SPIRIT_MAGNITUDE_THRESHOLDS', () => {
  it('should have ascending thresholds', () => {
    expect(SPIRIT_MAGNITUDE_THRESHOLDS.minor).toBeLessThan(
      SPIRIT_MAGNITUDE_THRESHOLDS.local
    );
    expect(SPIRIT_MAGNITUDE_THRESHOLDS.local).toBeLessThan(
      SPIRIT_MAGNITUDE_THRESHOLDS.regional
    );
    expect(SPIRIT_MAGNITUDE_THRESHOLDS.regional).toBeLessThan(
      SPIRIT_MAGNITUDE_THRESHOLDS.great
    );
    expect(SPIRIT_MAGNITUDE_THRESHOLDS.great).toBeLessThan(
      SPIRIT_MAGNITUDE_THRESHOLDS.primal
    );
  });

  it('should have minor start at 0', () => {
    expect(SPIRIT_MAGNITUDE_THRESHOLDS.minor).toBe(0);
  });

  it('should have expected values', () => {
    expect(SPIRIT_MAGNITUDE_THRESHOLDS.local).toBe(50);
    expect(SPIRIT_MAGNITUDE_THRESHOLDS.regional).toBe(200);
    expect(SPIRIT_MAGNITUDE_THRESHOLDS.great).toBe(1000);
    expect(SPIRIT_MAGNITUDE_THRESHOLDS.primal).toBe(5000);
  });
});

// ============================================================================
// getMagnitudeForRespect Tests
// ============================================================================

describe('getMagnitudeForRespect', () => {
  it('should return minor for low respect', () => {
    expect(getMagnitudeForRespect(0)).toBe('minor');
    expect(getMagnitudeForRespect(25)).toBe('minor');
    expect(getMagnitudeForRespect(49)).toBe('minor');
  });

  it('should return local at threshold', () => {
    expect(getMagnitudeForRespect(50)).toBe('local');
    expect(getMagnitudeForRespect(100)).toBe('local');
    expect(getMagnitudeForRespect(199)).toBe('local');
  });

  it('should return regional at threshold', () => {
    expect(getMagnitudeForRespect(200)).toBe('regional');
    expect(getMagnitudeForRespect(500)).toBe('regional');
    expect(getMagnitudeForRespect(999)).toBe('regional');
  });

  it('should return great at threshold', () => {
    expect(getMagnitudeForRespect(1000)).toBe('great');
    expect(getMagnitudeForRespect(3000)).toBe('great');
    expect(getMagnitudeForRespect(4999)).toBe('great');
  });

  it('should return primal at threshold', () => {
    expect(getMagnitudeForRespect(5000)).toBe('primal');
    expect(getMagnitudeForRespect(10000)).toBe('primal');
    expect(getMagnitudeForRespect(100000)).toBe('primal');
  });

  it('should handle negative values as minor', () => {
    expect(getMagnitudeForRespect(-100)).toBe('minor');
  });
});

// ============================================================================
// createSpiritNaming Tests
// ============================================================================

describe('createSpiritNaming', () => {
  it('should set descriptive name', () => {
    const naming = createSpiritNaming('Spirit of the Ancient Oak');
    expect(naming.descriptiveName).toBe('Spirit of the Ancient Oak');
  });

  it('should not have given name by default', () => {
    const naming = createSpiritNaming('River Spirit');
    expect(naming.givenName).toBeUndefined();
  });

  it('should have empty alternate names', () => {
    const naming = createSpiritNaming('Mountain Kami');
    expect(naming.alternateNames).toEqual([]);
  });

  it('should have unknown true name', () => {
    const naming = createSpiritNaming('Forest Spirit');
    expect(naming.trueNameKnown).toBe(false);
    expect(naming.trueName).toBeUndefined();
  });

  it('should not have honorific by default', () => {
    const naming = createSpiritNaming('Stream Spirit');
    expect(naming.honorific).toBeUndefined();
  });
});

// ============================================================================
// createDefaultDisposition Tests
// ============================================================================

describe('createDefaultDisposition', () => {
  it('should use indifferent as default', () => {
    const disposition = createDefaultDisposition();
    expect(disposition.baseDisposition).toBe('indifferent');
    expect(disposition.currentDisposition).toBe('indifferent');
  });

  it('should accept custom base disposition', () => {
    const disposition = createDefaultDisposition('territorial');
    expect(disposition.baseDisposition).toBe('territorial');
    expect(disposition.currentDisposition).toBe('territorial');
  });

  it('should have zero respect level', () => {
    const disposition = createDefaultDisposition();
    expect(disposition.respectLevel).toBe(0);
  });

  it('should have no damage or pollution', () => {
    const disposition = createDefaultDisposition();
    expect(disposition.dwellingDamaged).toBe(false);
    expect(disposition.pollutionLevel).toBe(0);
  });

  it('should have no ritual debt or neglect', () => {
    const disposition = createDefaultDisposition();
    expect(disposition.ritualDebt).toBe(0);
    expect(disposition.neglectDuration).toBe(0);
  });

  it('should have empty recent interactions', () => {
    const disposition = createDefaultDisposition();
    expect(disposition.recentInteractions).toEqual([]);
  });
});

// ============================================================================
// createDefaultManifestation Tests
// ============================================================================

describe('createDefaultManifestation', () => {
  it('should be invisible by default', () => {
    const manifestation = createDefaultManifestation();
    expect(manifestation.primaryForm).toBe('invisible');
    expect(manifestation.visibilityLevel).toBe('invisible');
  });

  it('should have basic description', () => {
    const manifestation = createDefaultManifestation();
    expect(manifestation.description).toBe('An unseen presence');
  });

  it('should have empty sign arrays', () => {
    const manifestation = createDefaultManifestation();
    expect(manifestation.presenceSigns).toEqual([]);
    expect(manifestation.animalForms).toEqual([]);
    expect(manifestation.soundSigns).toEqual([]);
  });

  it('should have natural size', () => {
    const manifestation = createDefaultManifestation();
    expect(manifestation.manifestedSize).toBe('natural');
  });
});

// ============================================================================
// createDefaultInfluence Tests
// ============================================================================

describe('createDefaultInfluence', () => {
  it('should use protection as default', () => {
    const influence = createDefaultInfluence();
    expect(influence.primaryInfluence).toBe('protection');
  });

  it('should accept custom primary influence', () => {
    const influence = createDefaultInfluence('plant_growth');
    expect(influence.primaryInfluence).toBe('plant_growth');
  });

  it('should have empty secondary influences', () => {
    const influence = createDefaultInfluence();
    expect(influence.secondaryInfluences).toEqual([]);
  });

  it('should have immediate range', () => {
    const influence = createDefaultInfluence();
    expect(influence.range).toBe('immediate');
  });

  it('should have empty effects', () => {
    const influence = createDefaultInfluence();
    expect(influence.effects).toEqual([]);
  });
});

// ============================================================================
// createDefaultOfferingPreferences Tests
// ============================================================================

describe('createDefaultOfferingPreferences', () => {
  it('should have standard preferred offerings', () => {
    const prefs = createDefaultOfferingPreferences();
    expect(prefs.preferred).toContain('rice');
    expect(prefs.preferred).toContain('sake');
    expect(prefs.preferred).toContain('flowers');
  });

  it('should have standard acceptable offerings', () => {
    const prefs = createDefaultOfferingPreferences();
    expect(prefs.acceptable).toContain('water');
    expect(prefs.acceptable).toContain('incense');
    expect(prefs.acceptable).toContain('fruit');
  });

  it('should have no forbidden offerings by default', () => {
    const prefs = createDefaultOfferingPreferences();
    expect(prefs.forbidden).toEqual([]);
  });

  it('should have no special offerings by default', () => {
    const prefs = createDefaultOfferingPreferences();
    expect(prefs.special).toEqual([]);
  });

  it('should have value multipliers for all categories', () => {
    const prefs = createDefaultOfferingPreferences();
    expect(prefs.valueMultipliers.food).toBe(1.0);
    expect(prefs.valueMultipliers.drink).toBe(1.0);
    expect(prefs.valueMultipliers.material).toBe(0.8);
    expect(prefs.valueMultipliers.craft).toBe(1.2);
    expect(prefs.valueMultipliers.service).toBe(1.5);
    expect(prefs.valueMultipliers.performance).toBe(1.3);
    expect(prefs.valueMultipliers.living).toBe(2.0);
  });
});

// ============================================================================
// createPlaceSpirit Tests
// ============================================================================

describe('createPlaceSpirit', () => {
  it('should create spirit with correct id and type', () => {
    const spirit = createPlaceSpirit('spirit-1', 'River Spirit', 'river', 'loc-1');
    expect(spirit.id).toBe('spirit-1');
    expect(spirit.entityType).toBe('spirit');
    expect(spirit.category).toBe('place_spirit');
  });

  it('should set dwelling information', () => {
    const spirit = createPlaceSpirit('spirit-1', 'Mountain Kami', 'mountain', 'loc-2');
    expect(spirit.dwellingType).toBe('mountain');
    expect(spirit.dwellingLocationId).toBe('loc-2');
  });

  it('should infer influence from dwelling', () => {
    const riverSpirit = createPlaceSpirit('s1', 'River', 'river', 'l1');
    expect(riverSpirit.influence.primaryInfluence).toBe('water_flow');

    const forestSpirit = createPlaceSpirit('s2', 'Forest', 'forest', 'l2');
    expect(forestSpirit.influence.primaryInfluence).toBe('plant_growth');

    const crossroadsSpirit = createPlaceSpirit('s3', 'Crossroads', 'crossroads', 'l3');
    expect(crossroadsSpirit.influence.primaryInfluence).toBe('traveler_safety');
  });

  it('should use territorial as default disposition', () => {
    const spirit = createPlaceSpirit('s1', 'Hill Spirit', 'hill', 'l1');
    expect(spirit.disposition.baseDisposition).toBe('territorial');
  });

  it('should accept custom disposition', () => {
    const spirit = createPlaceSpirit('s1', 'Friendly Grove', 'grove', 'l1', 'benign');
    expect(spirit.disposition.baseDisposition).toBe('benign');
  });

  it('should not be mobile', () => {
    const spirit = createPlaceSpirit('s1', 'Mountain', 'mountain', 'l1');
    expect(spirit.mobile).toBe(false);
  });

  it('should have local travel range', () => {
    const spirit = createPlaceSpirit('s1', 'Stream', 'stream', 'l1');
    expect(spirit.travelRange).toBe('local');
  });

  it('should start active and not angry', () => {
    const spirit = createPlaceSpirit('s1', 'Spring', 'spring', 'l1');
    expect(spirit.isActive).toBe(true);
    expect(spirit.isDormant).toBe(false);
    expect(spirit.isAngered).toBe(false);
    expect(spirit.isFading).toBe(false);
  });

  it('should have natural_formation origin', () => {
    const spirit = createPlaceSpirit('s1', 'Waterfall', 'waterfall', 'l1');
    expect(spirit.origin).toBe('natural_formation');
  });
});

// ============================================================================
// createAncestorSpirit Tests
// ============================================================================

describe('createAncestorSpirit', () => {
  it('should create ancestor spirit with correct category', () => {
    const spirit = createAncestorSpirit('a1', 'Grandmother Yuki', 'family-1');
    expect(spirit.category).toBe('ancestor_spirit');
    expect(spirit.entityType).toBe('spirit');
  });

  it('should include deceased name in descriptive name', () => {
    const spirit = createAncestorSpirit('a1', 'Elder Tanaka', 'family-1');
    expect(spirit.naming.descriptiveName).toBe('Spirit of Elder Tanaka');
  });

  it('should know true name (the deceased name)', () => {
    const spirit = createAncestorSpirit('a1', 'Hiroshi', 'family-1');
    expect(spirit.naming.trueNameKnown).toBe(true);
    expect(spirit.naming.trueName).toBe('Hiroshi');
    expect(spirit.naming.givenName).toBe('Hiroshi');
  });

  it('should be mobile', () => {
    const spirit = createAncestorSpirit('a1', 'Ancestor', 'family-1');
    expect(spirit.mobile).toBe(true);
  });

  it('should have benign disposition', () => {
    const spirit = createAncestorSpirit('a1', 'Ancestor', 'family-1');
    expect(spirit.disposition.baseDisposition).toBe('benign');
  });

  it('should influence household fortune', () => {
    const spirit = createAncestorSpirit('a1', 'Ancestor', 'family-1');
    expect(spirit.influence.primaryInfluence).toBe('household_fortune');
  });

  it('should prefer prepared food and sake', () => {
    const spirit = createAncestorSpirit('a1', 'Ancestor', 'family-1');
    expect(spirit.offeringPreferences.preferred).toContain('prepared_food');
    expect(spirit.offeringPreferences.preferred).toContain('sake');
  });

  it('should especially value stories', () => {
    const spirit = createAncestorSpirit('a1', 'Ancestor', 'family-1');
    expect(spirit.offeringPreferences.special).toContain('story');
  });

  it('should have mortal_death origin', () => {
    const spirit = createAncestorSpirit('a1', 'Ancestor', 'family-1');
    expect(spirit.origin).toBe('mortal_death');
  });

  it('should be glimpsed rather than invisible', () => {
    const spirit = createAncestorSpirit('a1', 'Ancestor', 'family-1');
    expect(spirit.manifestation.visibilityLevel).toBe('glimpsed');
  });

  it('should have whispered voice as sound sign', () => {
    const spirit = createAncestorSpirit('a1', 'Ancestor', 'family-1');
    expect(spirit.manifestation.soundSigns).toContain('whispered voice');
  });
});

// ============================================================================
// createObjectSpirit (Tsukumogami) Tests
// ============================================================================

describe('createObjectSpirit', () => {
  it('should create object spirit with correct category', () => {
    const spirit = createObjectSpirit('t1', 'old_tool', 'obj-1', 50);
    expect(spirit.category).toBe('object_spirit');
    expect(spirit.entityType).toBe('spirit');
  });

  it('should set object type and ID', () => {
    const spirit = createObjectSpirit('t1', 'mirror', 'obj-mirror-1', 100);
    expect(spirit.objectType).toBe('mirror');
    expect(spirit.dwellingObjectId).toBe('obj-mirror-1');
  });

  it('should have descriptive name based on object type', () => {
    const spirit = createObjectSpirit('t1', 'musical_instrument', 'obj-1', 75);
    expect(spirit.naming.descriptiveName).toBe('Spirit of the musical instrument');
  });

  it('should manifest as dwelling_animated', () => {
    const spirit = createObjectSpirit('t1', 'old_tool', 'obj-1', 50);
    expect(spirit.manifestation.primaryForm).toBe('dwelling_animated');
  });

  it('should be immobile', () => {
    const spirit = createObjectSpirit('t1', 'sword', 'obj-1', 200);
    expect(spirit.mobile).toBe(false);
    expect(spirit.travelRange).toBe('immediate');
  });

  it('should have object_aging origin', () => {
    const spirit = createObjectSpirit('t1', 'vessel', 'obj-1', 80);
    expect(spirit.origin).toBe('object_aging');
  });

  describe('age-based disposition', () => {
    it('should be shy when young (< 50 years)', () => {
      const spirit = createObjectSpirit('t1', 'old_tool', 'obj-1', 30);
      expect(spirit.disposition.baseDisposition).toBe('shy');
    });

    it('should be curious when mature (50-100 years)', () => {
      const spirit = createObjectSpirit('t1', 'old_tool', 'obj-1', 75);
      expect(spirit.disposition.baseDisposition).toBe('curious');
    });

    it('should be playful when ancient (> 100 years)', () => {
      const spirit = createObjectSpirit('t1', 'old_tool', 'obj-1', 150);
      expect(spirit.disposition.baseDisposition).toBe('playful');
    });
  });

  describe('age-based starting respect', () => {
    it('should gain respect from age', () => {
      const spirit30 = createObjectSpirit('t1', 'mirror', 'obj-1', 30);
      expect(spirit30.totalRespect).toBe(3);

      const spirit100 = createObjectSpirit('t2', 'mirror', 'obj-2', 100);
      expect(spirit100.totalRespect).toBe(10);

      const spirit500 = createObjectSpirit('t3', 'mirror', 'obj-3', 500);
      expect(spirit500.totalRespect).toBe(50);
    });
  });
});

// ============================================================================
// inferInfluenceFromDwelling Tests
// ============================================================================

describe('inferInfluenceFromDwelling', () => {
  const dwellingInfluenceTests: Array<[DwellingType, InfluenceSphere]> = [
    ['mountain', 'weather_local'],
    ['river', 'water_flow'],
    ['stream', 'water_flow'],
    ['waterfall', 'water_flow'],
    ['spring', 'health'],
    ['lake', 'fish_abundance'],
    ['pond', 'fish_abundance'],
    ['ocean', 'fish_abundance'],
    ['forest', 'plant_growth'],
    ['grove', 'plant_growth'],
    ['ancient_tree', 'protection'],
    ['sacred_tree', 'luck'],
    ['field', 'soil_fertility'],
    ['paddy', 'soil_fertility'],
    ['orchard', 'plant_growth'],
    ['granary', 'household_fortune'],
    ['crossroads', 'traveler_safety'],
    ['bridge', 'traveler_safety'],
    ['gate', 'boundary'],
    ['threshold', 'boundary'],
    ['hearth', 'household_fortune'],
    ['well', 'health'],
    ['forest_edge', 'transition'],
    ['shoreline', 'transition'],
  ];

  dwellingInfluenceTests.forEach(([dwelling, expectedInfluence]) => {
    it(`should map ${dwelling} to ${expectedInfluence}`, () => {
      expect(inferInfluenceFromDwelling(dwelling)).toBe(expectedInfluence);
    });
  });

  it('should default to protection for unknown dwellings', () => {
    // Using type assertion to test fallback behavior
    expect(inferInfluenceFromDwelling('cave' as DwellingType)).toBe('protection');
    expect(inferInfluenceFromDwelling('cliff' as DwellingType)).toBe('protection');
  });
});

// ============================================================================
// inferInfluenceFromObject Tests
// ============================================================================

describe('inferInfluenceFromObject', () => {
  const objectInfluenceTests: Array<[SpiritObjectType, InfluenceSphere]> = [
    ['ancient_tree', 'protection'],
    ['notable_rock', 'luck'],
    ['old_tool', 'craft_success'],
    ['mirror', 'dreams'],
    ['sword', 'protection'],
    ['musical_instrument', 'luck'],
    ['mask', 'transition'],
    ['vessel', 'household_fortune'],
  ];

  objectInfluenceTests.forEach(([objectType, expectedInfluence]) => {
    it(`should map ${objectType} to ${expectedInfluence}`, () => {
      expect(inferInfluenceFromObject(objectType)).toBe(expectedInfluence);
    });
  });

  it('should default to luck for unmapped objects', () => {
    expect(inferInfluenceFromObject('statue' as SpiritObjectType)).toBe('luck');
    expect(inferInfluenceFromObject('rope' as SpiritObjectType)).toBe('luck');
  });
});

// ============================================================================
// inferOfferingsFromObject Tests
// ============================================================================

describe('inferOfferingsFromObject', () => {
  it('should give tools preferences for maintenance', () => {
    const prefs = inferOfferingsFromObject('old_tool');
    expect(prefs.preferred).toContain('cleaning');
    expect(prefs.preferred).toContain('maintenance');
    expect(prefs.special).toContain('crafted_item');
  });

  it('should give instruments preferences for performance', () => {
    const prefs = inferOfferingsFromObject('musical_instrument');
    expect(prefs.preferred).toContain('music');
    expect(prefs.preferred).toContain('song');
    expect(prefs.special).toContain('dance');
  });

  it('should give mirrors preferences for beauty', () => {
    const prefs = inferOfferingsFromObject('mirror');
    expect(prefs.preferred).toContain('flowers');
    expect(prefs.preferred).toContain('art');
    expect(prefs.special).toContain('cleaning');
  });

  it('should give swords preferences for respect and forbid blood', () => {
    const prefs = inferOfferingsFromObject('sword');
    expect(prefs.preferred).toContain('cleaning');
    expect(prefs.preferred).toContain('maintenance');
    expect(prefs.preferred).toContain('silence');
    expect(prefs.forbidden).toContain('blood');
  });

  it('should return default preferences for unmapped objects', () => {
    const prefs = inferOfferingsFromObject('statue');
    expect(prefs.preferred).toContain('rice');
    expect(prefs.preferred).toContain('sake');
  });
});

// ============================================================================
// calculateOfferingRespect Tests
// ============================================================================

describe('calculateOfferingRespect', () => {
  const defaultPrefs = createDefaultOfferingPreferences();

  it('should give 1.5x for preferred offerings', () => {
    expect(calculateOfferingRespect('rice', defaultPrefs, 10)).toBe(15);
    expect(calculateOfferingRespect('sake', defaultPrefs, 10)).toBe(15);
    expect(calculateOfferingRespect('flowers', defaultPrefs, 10)).toBe(15);
  });

  it('should give 1x for acceptable offerings', () => {
    expect(calculateOfferingRespect('water', defaultPrefs, 10)).toBe(10);
    expect(calculateOfferingRespect('incense', defaultPrefs, 10)).toBe(10);
    expect(calculateOfferingRespect('fruit', defaultPrefs, 10)).toBe(10);
  });

  it('should give 0.5x for unknown offerings', () => {
    expect(calculateOfferingRespect('coins' as OfferingType, defaultPrefs, 10)).toBe(5);
  });

  it('should give -2x for forbidden offerings', () => {
    const swordPrefs = inferOfferingsFromObject('sword');
    expect(calculateOfferingRespect('blood' as OfferingType, swordPrefs, 10)).toBe(-20);
  });

  it('should give 3x for special offerings', () => {
    const ancestorPrefs: typeof defaultPrefs = {
      ...defaultPrefs,
      special: ['story'],
    };
    expect(calculateOfferingRespect('story', ancestorPrefs, 10)).toBe(30);
  });

  it('should use base value of 1 by default', () => {
    expect(calculateOfferingRespect('rice', defaultPrefs)).toBe(1.5);
    expect(calculateOfferingRespect('water', defaultPrefs)).toBe(1);
  });
});

// ============================================================================
// updateDispositionFromRespect Tests
// ============================================================================

describe('updateDispositionFromRespect', () => {
  it('should return wrathful for severe pollution', () => {
    const disposition: DispositionFactors = {
      ...createDefaultDisposition('benign'),
      pollutionLevel: 0.8,
    };
    expect(updateDispositionFromRespect(disposition)).toBe('wrathful');
  });

  it('should return wrathful for very negative respect', () => {
    const disposition: DispositionFactors = {
      ...createDefaultDisposition('benign'),
      respectLevel: -60,
    };
    expect(updateDispositionFromRespect(disposition)).toBe('wrathful');
  });

  it('should improve territorial to benign with high respect', () => {
    const disposition: DispositionFactors = {
      ...createDefaultDisposition('territorial'),
      respectLevel: 150,
    };
    expect(updateDispositionFromRespect(disposition)).toBe('benign');
  });

  it('should improve indifferent to curious with high respect', () => {
    const disposition: DispositionFactors = {
      ...createDefaultDisposition('indifferent'),
      respectLevel: 150,
    };
    expect(updateDispositionFromRespect(disposition)).toBe('curious');
  });

  it('should improve demanding to benign with high respect', () => {
    const disposition: DispositionFactors = {
      ...createDefaultDisposition('demanding'),
      respectLevel: 150,
    };
    expect(updateDispositionFromRespect(disposition)).toBe('benign');
  });

  it('should make demanding spirits wrathful with moderate neglect', () => {
    const disposition: DispositionFactors = {
      ...createDefaultDisposition('demanding'),
      neglectDuration: 150,
    };
    expect(updateDispositionFromRespect(disposition)).toBe('wrathful');
  });

  it('should make other spirits indifferent with moderate neglect', () => {
    const disposition: DispositionFactors = {
      ...createDefaultDisposition('curious'),
      neglectDuration: 150,
    };
    expect(updateDispositionFromRespect(disposition)).toBe('indifferent');
  });

  it('should return base disposition when no modifiers apply', () => {
    const disposition = createDefaultDisposition('playful');
    expect(updateDispositionFromRespect(disposition)).toBe('playful');
  });
});

// ============================================================================
// canGrantBlessing Tests
// ============================================================================

describe('canGrantBlessing', () => {
  it('should return true for benign spirits with positive respect', () => {
    const spirit = createPlaceSpirit('s1', 'Grove', 'grove', 'l1', 'benign');
    spirit.disposition.respectLevel = 10;
    expect(canGrantBlessing(spirit)).toBe(true);
  });

  it('should return true for curious spirits', () => {
    const spirit = createPlaceSpirit('s1', 'Stream', 'stream', 'l1', 'curious');
    expect(canGrantBlessing(spirit)).toBe(true);
  });

  it('should return true for playful spirits', () => {
    const spirit = createObjectSpirit('t1', 'old_tool', 'obj-1', 150);
    expect(canGrantBlessing(spirit)).toBe(true);
  });

  it('should return true for solemn spirits', () => {
    const spirit = createPlaceSpirit('s1', 'Mountain', 'mountain', 'l1', 'solemn');
    expect(canGrantBlessing(spirit)).toBe(true);
  });

  it('should return false for territorial spirits', () => {
    const spirit = createPlaceSpirit('s1', 'Forest', 'forest', 'l1', 'territorial');
    expect(canGrantBlessing(spirit)).toBe(false);
  });

  it('should return false for dormant spirits', () => {
    const spirit = createPlaceSpirit('s1', 'Grove', 'grove', 'l1', 'benign');
    spirit.isDormant = true;
    expect(canGrantBlessing(spirit)).toBe(false);
  });

  it('should return false for angered spirits', () => {
    const spirit = createPlaceSpirit('s1', 'Grove', 'grove', 'l1', 'benign');
    spirit.isAngered = true;
    expect(canGrantBlessing(spirit)).toBe(false);
  });

  it('should return false for spirits with negative respect', () => {
    const spirit = createPlaceSpirit('s1', 'Grove', 'grove', 'l1', 'benign');
    spirit.disposition.respectLevel = -10;
    expect(canGrantBlessing(spirit)).toBe(false);
  });
});

// ============================================================================
// willCauseTrouble Tests
// ============================================================================

describe('willCauseTrouble', () => {
  it('should return true for wrathful spirits', () => {
    const spirit = createPlaceSpirit('s1', 'Mountain', 'mountain', 'l1', 'wrathful');
    expect(willCauseTrouble(spirit)).toBe(true);
  });

  it('should return true for hungry spirits', () => {
    const spirit = createPlaceSpirit('s1', 'Shrine', 'shrine', 'l1', 'hungry');
    expect(willCauseTrouble(spirit)).toBe(true);
  });

  it('should return true for demanding spirits with low respect', () => {
    const spirit = createPlaceSpirit('s1', 'Temple', 'shrine', 'l1', 'demanding');
    spirit.disposition.respectLevel = -15;
    expect(willCauseTrouble(spirit)).toBe(true);
  });

  it('should return true for high pollution', () => {
    const spirit = createPlaceSpirit('s1', 'Spring', 'spring', 'l1', 'benign');
    spirit.disposition.pollutionLevel = 0.6;
    expect(willCauseTrouble(spirit)).toBe(true);
  });

  it('should return false for benign well-treated spirits', () => {
    const spirit = createPlaceSpirit('s1', 'Grove', 'grove', 'l1', 'benign');
    spirit.disposition.respectLevel = 50;
    expect(willCauseTrouble(spirit)).toBe(false);
  });

  it('should return false for demanding spirits with adequate respect', () => {
    const spirit = createPlaceSpirit('s1', 'Shrine', 'shrine', 'l1', 'demanding');
    spirit.disposition.respectLevel = 0;
    expect(willCauseTrouble(spirit)).toBe(false);
  });
});

// ============================================================================
// Type Structure Tests
// ============================================================================

describe('type structures', () => {
  describe('SpiritCategory', () => {
    it('should include all spirit categories', () => {
      const categories: SpiritCategory[] = [
        'place_spirit',
        'object_spirit',
        'ancestor_spirit',
        'phenomenon_spirit',
        'concept_spirit',
        'collective_spirit',
        'guardian_spirit',
        'wild_spirit',
      ];
      expect(categories).toHaveLength(8);
    });
  });

  describe('DwellingType', () => {
    it('should include terrain features', () => {
      const terrain: DwellingType[] = [
        'mountain',
        'hill',
        'valley',
        'cave',
        'cliff',
        'boulder',
        'rock_formation',
      ];
      expect(terrain.length).toBeGreaterThan(0);
    });

    it('should include water features', () => {
      const water: DwellingType[] = [
        'river',
        'stream',
        'waterfall',
        'spring',
        'lake',
        'pond',
        'ocean',
        'well',
      ];
      expect(water.length).toBeGreaterThan(0);
    });

    it('should include liminal spaces', () => {
      const liminal: DwellingType[] = ['forest_edge', 'shoreline', 'twilight_place'];
      expect(liminal).toHaveLength(3);
    });
  });

  describe('SpiritFormType', () => {
    it('should include all form types', () => {
      const forms: SpiritFormType[] = [
        'invisible',
        'natural_phenomenon',
        'animal',
        'humanoid',
        'hybrid',
        'abstract',
        'dwelling_animated',
        'orb',
        'shadow',
        'reflection',
      ];
      expect(forms).toHaveLength(10);
    });
  });

  describe('SpiritOrigin', () => {
    it('should include all origins', () => {
      const origins: SpiritOrigin[] = [
        'primordial',
        'natural_formation',
        'mortal_death',
        'object_aging',
        'collective_belief',
        'divine_creation',
        'spirit_offspring',
        'event_echo',
      ];
      expect(origins).toHaveLength(8);
    });
  });

  describe('PollutionSource', () => {
    it('should include physical and spiritual pollution', () => {
      const sources: PollutionSource[] = [
        'death',
        'blood',
        'decay',
        'waste',
        'violence',
        'oath_breaking',
        'disrespect',
        'neglect',
        'foreign_intrusion',
      ];
      expect(sources).toHaveLength(9);
    });
  });

  describe('PurificationType', () => {
    it('should include all purification methods', () => {
      const methods: PurificationType[] = [
        'water_cleansing',
        'salt_purification',
        'fire_purification',
        'prayer_purification',
        'offering_atonement',
        'time_passage',
        'priest_ritual',
      ];
      expect(methods).toHaveLength(7);
    });
  });
});

// ============================================================================
// Gameplay Scenarios
// ============================================================================

describe('gameplay scenarios', () => {
  it('should simulate village establishing relationship with river spirit', () => {
    // Village discovers spirit in local river
    const riverSpirit = createPlaceSpirit(
      'spirit-river-1',
      'Spirit of Clear Waters',
      'river',
      'river-loc-1'
    );

    expect(riverSpirit.influence.primaryInfluence).toBe('water_flow');
    expect(riverSpirit.disposition.baseDisposition).toBe('territorial');
    expect(riverSpirit.totalRespect).toBe(0);

    // Villagers begin making offerings
    const offeringValue = calculateOfferingRespect('rice', riverSpirit.offeringPreferences, 5);
    expect(offeringValue).toBe(7.5); // 5 * 1.5 for preferred

    // After regular offerings, spirit becomes friendlier
    riverSpirit.disposition.respectLevel = 120;
    const newDisposition = updateDispositionFromRespect(riverSpirit.disposition);
    expect(newDisposition).toBe('benign');
  });

  it('should simulate tsukumogami awakening in old workshop', () => {
    // 100-year-old hammer in blacksmith shop
    const hammerSpirit = createObjectSpirit('spirit-tool-1', 'old_tool', 'hammer-1', 100);

    // Old tools are playful
    expect(hammerSpirit.disposition.baseDisposition).toBe('playful');

    // Gained respect from age
    expect(hammerSpirit.totalRespect).toBe(10);

    // Prefers maintenance as offering
    expect(hammerSpirit.offeringPreferences.preferred).toContain('maintenance');

    // Influences craft success
    expect(hammerSpirit.influence.primaryInfluence).toBe('craft_success');

    // Can grant blessing if treated well
    expect(canGrantBlessing(hammerSpirit)).toBe(true);
  });

  it('should simulate ancestor shrine veneration', () => {
    // Family establishes shrine for grandmother
    const grandmotherSpirit = createAncestorSpirit(
      'spirit-ancestor-1',
      'Grandmother Sakura',
      'tanaka-family'
    );

    expect(grandmotherSpirit.naming.trueName).toBe('Grandmother Sakura');
    expect(grandmotherSpirit.naming.trueNameKnown).toBe(true);

    // Stories especially please ancestor spirits
    const storyValue = calculateOfferingRespect(
      'story',
      grandmotherSpirit.offeringPreferences,
      10
    );
    expect(storyValue).toBe(30); // 3x for special offering

    // Can grant household fortune blessings
    expect(grandmotherSpirit.influence.primaryInfluence).toBe('household_fortune');
    expect(canGrantBlessing(grandmotherSpirit)).toBe(true);
  });

  it('should simulate spirit anger from pollution', () => {
    const springSpirit = createPlaceSpirit(
      'spirit-spring-1',
      'Spirit of Pure Waters',
      'spring',
      'spring-loc-1',
      'benign'
    );

    // Initially can grant blessings
    expect(canGrantBlessing(springSpirit)).toBe(true);
    expect(willCauseTrouble(springSpirit)).toBe(false);

    // Someone dumps waste near spring
    springSpirit.disposition.pollutionLevel = 0.8;

    // Spirit becomes wrathful
    const newDisposition = updateDispositionFromRespect(springSpirit.disposition);
    expect(newDisposition).toBe('wrathful');

    // Will now cause trouble
    expect(willCauseTrouble(springSpirit)).toBe(true);
  });

  it('should simulate spirit fading from neglect', () => {
    const groveSpirit = createPlaceSpirit(
      'spirit-grove-1',
      'Spirit of the Sacred Grove',
      'grove',
      'grove-loc-1',
      'demanding'
    );

    // Spirit is neglected for long time
    groveSpirit.disposition.neglectDuration = 200;

    // Demanding spirits become wrathful
    const newDisposition = updateDispositionFromRespect(groveSpirit.disposition);
    expect(newDisposition).toBe('wrathful');

    // Update the spirit's current disposition
    groveSpirit.disposition.currentDisposition = newDisposition;

    // Now will cause trouble
    expect(willCauseTrouble(groveSpirit)).toBe(true);
  });

  it('should demonstrate sword spirit forbidden offering', () => {
    const swordSpirit = createObjectSpirit('spirit-sword-1', 'sword', 'katana-1', 200);

    // Blood is forbidden for sword spirits (paradoxically)
    expect(swordSpirit.offeringPreferences.forbidden).toContain('blood');

    // Offering blood causes negative respect
    const bloodValue = calculateOfferingRespect(
      'blood' as OfferingType,
      swordSpirit.offeringPreferences,
      10
    );
    expect(bloodValue).toBe(-20);

    // Proper offerings are cleaning and silence
    expect(swordSpirit.offeringPreferences.preferred).toContain('cleaning');
    expect(swordSpirit.offeringPreferences.preferred).toContain('silence');
  });
});
