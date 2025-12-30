import { describe, it, expect } from 'vitest';
import {
  // Functions
  getPresetConfig,
  getDefaultConfig,
  calculateEffectivePowerCost,
  calculateEffectiveRange,
  calculateEffectiveDuration,
  isPowerAvailable,
  isFeatureAvailable,
  mergeConfigs,
  createUniverseConfig,

  // Types
  type UniversePreset,
  type UniverseDivineConfig,
  type PowerConfig,
  type RestrictionConfig,
  type DivinityFeature,
} from '../UniverseConfig.js';

import type { DivinePowerType } from '../DivinePowerTypes.js';

// ============================================================================
// getPresetConfig Tests
// ============================================================================

describe('getPresetConfig', () => {
  describe('preset availability', () => {
    const presets: UniversePreset[] = [
      'high_fantasy',
      'low_fantasy',
      'grimdark',
      'mythic',
      'monotheistic',
      'animistic',
      'deistic',
      'chaotic',
      'dying_gods',
      'ascendant',
    ];

    presets.forEach((preset) => {
      it(`should return config for ${preset} preset`, () => {
        const config = getPresetConfig(preset);
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
      });
    });
  });

  describe('high_fantasy preset', () => {
    it('should have low power costs', () => {
      const config = getPresetConfig('high_fantasy');
      expect(config.powers?.globalCostMultiplier).toBeLessThan(1);
    });

    it('should have high power success rate', () => {
      const config = getPresetConfig('high_fantasy');
      expect(config.powers?.basePowerSuccessRate).toBeGreaterThanOrEqual(0.9);
    });

    it('should have generous belief generation', () => {
      const config = getPresetConfig('high_fantasy');
      expect(config.beliefEconomy?.generationMultiplier).toBeGreaterThan(1);
    });
  });

  describe('grimdark preset', () => {
    it('should have high power costs', () => {
      const config = getPresetConfig('grimdark');
      expect(config.powers?.globalCostMultiplier).toBeGreaterThan(1);
    });

    it('should have lower success rate', () => {
      const config = getPresetConfig('grimdark');
      expect(config.powers?.basePowerSuccessRate).toBeLessThan(0.9);
    });

    it('should have high decay rate', () => {
      const config = getPresetConfig('grimdark');
      expect(config.beliefEconomy?.decayMultiplier).toBeGreaterThan(1);
    });
  });

  describe('deistic preset', () => {
    it('should have very high power costs', () => {
      const config = getPresetConfig('deistic');
      expect(config.powers?.globalCostMultiplier).toBeGreaterThan(2);
    });

    it('should emphasize non-intervention', () => {
      const config = getPresetConfig('deistic');
      // Deistic gods are distant
      expect(config.coreParams?.divinePresence).toBeDefined();
    });
  });

  describe('ascendant preset', () => {
    it('should return a valid config', () => {
      const config = getPresetConfig('ascendant');
      // Falls through to balanced/default since not yet implemented
      expect(config.powers?.globalCostMultiplier).toBeDefined();
    });

    it('should have standard belief generation (falls to default)', () => {
      const config = getPresetConfig('ascendant');
      // Not yet implemented - falls through to default
      expect(config.beliefEconomy?.generationMultiplier).toBe(1);
    });
  });

  describe('dying_gods preset', () => {
    it('should return a valid config', () => {
      const config = getPresetConfig('dying_gods');
      // Falls through to balanced/default since not yet implemented
      expect(config.powers?.globalCostMultiplier).toBeDefined();
    });

    it('should have standard decay (falls to default)', () => {
      const config = getPresetConfig('dying_gods');
      // Not yet implemented - falls through to default
      expect(config.beliefEconomy?.decayMultiplier).toBe(1);
    });
  });
});

// ============================================================================
// getDefaultConfig Tests
// ============================================================================

describe('getDefaultConfig', () => {
  it('should return a complete config structure', () => {
    const config = getDefaultConfig();

    expect(config.coreParams).toBeDefined();
    expect(config.beliefEconomy).toBeDefined();
    expect(config.powers).toBeDefined();
  });

  it('should have balanced default multipliers', () => {
    const config = getDefaultConfig();

    expect(config.powers?.globalCostMultiplier).toBe(1);
    expect(config.powers?.globalRangeMultiplier).toBe(1);
    expect(config.beliefEconomy?.generationMultiplier).toBe(1);
  });

  it('should have reasonable success rate', () => {
    const config = getDefaultConfig();
    expect(config.powers?.basePowerSuccessRate).toBeGreaterThanOrEqual(0.8);
    expect(config.powers?.basePowerSuccessRate).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// calculateEffectivePowerCost Tests
// ============================================================================

describe('calculateEffectivePowerCost', () => {
  const defaultPowerConfig: PowerConfig = {
    globalCostMultiplier: 1,
    powerCostMultipliers: {},
    disabledPowers: [],
    globalRangeMultiplier: 1,
    powerRangeMultipliers: {},
    globalDurationMultiplier: 1,
    powerDurationMultipliers: {},
    globalCooldownMultiplier: 1,
    powerCooldownMultipliers: {},
    basePowerSuccessRate: 0.9,
    offDomainFailureChance: 0.1,
    offDomainCostMultiplier: 1.5,
    powerVisibility: {
      defaultVisibility: 'clear',
      alwaysVisiblePowers: [],
      neverVisiblePowers: [],
    },
    prayers: {
      prayerEffectiveness: 1,
      prayerBeliefGeneration: 1,
      prayerResponseChance: 0.5,
    },
    visions: {
      visionClarity: 1,
      visionInterpretationDifficulty: 1,
    },
    blessings: {
      blessingDuration: 1,
      blessingMagnitude: 1,
    },
    curses: {
      curseDuration: 1,
      curseMagnitude: 1,
      curseLiftDifficulty: 1,
    },
  };

  it('should return base cost when multiplier is 1', () => {
    const cost = calculateEffectivePowerCost(100, 'minor_miracle', defaultPowerConfig, false);
    expect(cost).toBe(100);
  });

  it('should apply global cost multiplier', () => {
    const config = { ...defaultPowerConfig, globalCostMultiplier: 2 };
    const cost = calculateEffectivePowerCost(100, 'minor_miracle', config, false);
    expect(cost).toBe(200);
  });

  it('should apply power-specific multiplier', () => {
    const config = {
      ...defaultPowerConfig,
      powerCostMultipliers: { smite: 1.5 },
    };
    const cost = calculateEffectivePowerCost(100, 'smite', config, false);
    expect(cost).toBe(150);
  });

  it('should apply off-domain multiplier', () => {
    const cost = calculateEffectivePowerCost(100, 'minor_miracle', defaultPowerConfig, true);
    expect(cost).toBe(150); // 100 * 1.5
  });

  it('should combine all multipliers', () => {
    const config = {
      ...defaultPowerConfig,
      globalCostMultiplier: 2,
      powerCostMultipliers: { smite: 1.5 },
    };
    const cost = calculateEffectivePowerCost(100, 'smite', config, true);
    // 100 * 2 * 1.5 * 1.5 = 450
    expect(cost).toBe(450);
  });

  it('should round up fractional costs', () => {
    const config = { ...defaultPowerConfig, globalCostMultiplier: 1.1 };
    const cost = calculateEffectivePowerCost(10, 'whisper', config, false);
    expect(cost).toBe(11); // ceil(10 * 1.1)
  });

  describe('grimdark scenario', () => {
    it('should significantly increase costs', () => {
      const grimdarkConfig = {
        ...defaultPowerConfig,
        globalCostMultiplier: 2,
        offDomainCostMultiplier: 2,
      };

      const onDomain = calculateEffectivePowerCost(100, 'smite', grimdarkConfig, false);
      const offDomain = calculateEffectivePowerCost(100, 'smite', grimdarkConfig, true);

      expect(onDomain).toBe(200);
      expect(offDomain).toBe(400);
    });
  });

  describe('high_fantasy scenario', () => {
    it('should decrease costs', () => {
      const highFantasyConfig = {
        ...defaultPowerConfig,
        globalCostMultiplier: 0.7,
        offDomainCostMultiplier: 1.25,
      };

      const cost = calculateEffectivePowerCost(100, 'mass_blessing', highFantasyConfig, false);
      expect(cost).toBe(70);
    });
  });
});

// ============================================================================
// calculateEffectiveRange Tests
// ============================================================================

describe('calculateEffectiveRange', () => {
  const defaultConfig: PowerConfig = {
    globalCostMultiplier: 1,
    powerCostMultipliers: {},
    disabledPowers: [],
    globalRangeMultiplier: 1,
    powerRangeMultipliers: {},
    globalDurationMultiplier: 1,
    powerDurationMultipliers: {},
    globalCooldownMultiplier: 1,
    powerCooldownMultipliers: {},
    basePowerSuccessRate: 0.9,
    offDomainFailureChance: 0.1,
    offDomainCostMultiplier: 1.5,
    powerVisibility: {} as any,
    prayers: {} as any,
    visions: {} as any,
    blessings: {} as any,
    curses: {} as any,
  };

  it('should return base range when multiplier is 1', () => {
    const range = calculateEffectiveRange(50, 'bless_harvest', defaultConfig);
    expect(range).toBe(50);
  });

  it('should apply global range multiplier', () => {
    const config = { ...defaultConfig, globalRangeMultiplier: 2 };
    const range = calculateEffectiveRange(50, 'bless_harvest', config);
    expect(range).toBe(100);
  });

  it('should apply power-specific multiplier', () => {
    const config = {
      ...defaultConfig,
      powerRangeMultipliers: { storm_calling: 3 },
    };
    const range = calculateEffectiveRange(100, 'storm_calling', config);
    expect(range).toBe(300);
  });

  it('should round down fractional ranges', () => {
    const config = { ...defaultConfig, globalRangeMultiplier: 1.5 };
    const range = calculateEffectiveRange(10, 'whisper', config);
    expect(range).toBe(15); // floor(15)
  });

  it('should handle reduced range', () => {
    const config = { ...defaultConfig, globalRangeMultiplier: 0.5 };
    const range = calculateEffectiveRange(100, 'smite', config);
    expect(range).toBe(50);
  });
});

// ============================================================================
// calculateEffectiveDuration Tests
// ============================================================================

describe('calculateEffectiveDuration', () => {
  const defaultConfig: PowerConfig = {
    globalCostMultiplier: 1,
    powerCostMultipliers: {},
    disabledPowers: [],
    globalRangeMultiplier: 1,
    powerRangeMultipliers: {},
    globalDurationMultiplier: 1,
    powerDurationMultipliers: {},
    globalCooldownMultiplier: 1,
    powerCooldownMultipliers: {},
    basePowerSuccessRate: 0.9,
    offDomainFailureChance: 0.1,
    offDomainCostMultiplier: 1.5,
    powerVisibility: {} as any,
    prayers: {} as any,
    visions: {} as any,
    blessings: {} as any,
    curses: {} as any,
  };

  it('should return base duration when multiplier is 1', () => {
    const duration = calculateEffectiveDuration(24, 'divine_protection', defaultConfig);
    expect(duration).toBe(24);
  });

  it('should apply global duration multiplier', () => {
    const config = { ...defaultConfig, globalDurationMultiplier: 2 };
    const duration = calculateEffectiveDuration(24, 'divine_protection', config);
    expect(duration).toBe(48);
  });

  it('should apply power-specific multiplier', () => {
    const config = {
      ...defaultConfig,
      powerDurationMultipliers: { bless_individual: 1.5 },
    };
    const duration = calculateEffectiveDuration(10, 'bless_individual', config);
    expect(duration).toBe(15);
  });

  it('should round down fractional durations', () => {
    const config = { ...defaultConfig, globalDurationMultiplier: 1.7 };
    const duration = calculateEffectiveDuration(10, 'curse_individual', config);
    expect(duration).toBe(17);
  });
});

// ============================================================================
// isPowerAvailable Tests
// ============================================================================

describe('isPowerAvailable', () => {
  it('should return true for enabled powers', () => {
    const config: PowerConfig = {
      disabledPowers: ['devour_deity'],
    } as PowerConfig;

    expect(isPowerAvailable('minor_miracle', config)).toBe(true);
    expect(isPowerAvailable('smite', config)).toBe(true);
    expect(isPowerAvailable('create_angel', config)).toBe(true);
  });

  it('should return false for disabled powers', () => {
    const config: PowerConfig = {
      disabledPowers: ['devour_deity', 'ascend_mortal', 'reality_warp'],
    } as PowerConfig;

    expect(isPowerAvailable('devour_deity', config)).toBe(false);
    expect(isPowerAvailable('ascend_mortal', config)).toBe(false);
    expect(isPowerAvailable('reality_warp', config)).toBe(false);
  });

  it('should handle empty disabled list', () => {
    const config: PowerConfig = {
      disabledPowers: [],
    } as PowerConfig;

    expect(isPowerAvailable('devour_deity', config)).toBe(true);
  });

  it('should handle all powers disabled', () => {
    const allPowers: DivinePowerType[] = [
      'whisper',
      'minor_miracle',
      'smite',
      'create_angel',
      'devour_deity',
    ];

    const config: PowerConfig = {
      disabledPowers: allPowers,
    } as PowerConfig;

    allPowers.forEach((power) => {
      expect(isPowerAvailable(power, config)).toBe(false);
    });
  });
});

// ============================================================================
// isFeatureAvailable Tests
// ============================================================================

describe('isFeatureAvailable', () => {
  it('should return true for enabled features', () => {
    const config: RestrictionConfig = {
      disabledFeatures: ['angel_creation'],
    } as RestrictionConfig;

    expect(isFeatureAvailable('avatars', config)).toBe(true);
    expect(isFeatureAvailable('pantheon_politics', config)).toBe(true);
  });

  it('should return false for disabled features', () => {
    const config: RestrictionConfig = {
      disabledFeatures: ['angel_creation', 'avatars', 'divine_chat'],
    } as RestrictionConfig;

    expect(isFeatureAvailable('angel_creation', config)).toBe(false);
    expect(isFeatureAvailable('avatars', config)).toBe(false);
    expect(isFeatureAvailable('divine_chat', config)).toBe(false);
  });

  it('should handle empty disabled list', () => {
    const config: RestrictionConfig = {
      disabledFeatures: [],
    } as RestrictionConfig;

    expect(isFeatureAvailable('angel_creation', config)).toBe(true);
    expect(isFeatureAvailable('avatars', config)).toBe(true);
  });
});

// ============================================================================
// mergeConfigs Tests
// ============================================================================

describe('mergeConfigs', () => {
  it('should merge top-level properties', () => {
    const base = { universeId: 'base', name: 'Base' } as Partial<UniverseDivineConfig>;
    const overrides = { name: 'Override' } as Partial<UniverseDivineConfig>;

    const merged = mergeConfigs(base, overrides);

    expect(merged.universeId).toBe('base');
    expect(merged.name).toBe('Override');
  });

  it('should merge coreParams', () => {
    const base = {
      coreParams: {
        divinePresence: 0.5,
        divineReliability: 0.8,
      },
    } as Partial<UniverseDivineConfig>;

    const overrides = {
      coreParams: {
        divinePresence: 0.9,
      },
    } as Partial<UniverseDivineConfig>;

    const merged = mergeConfigs(base, overrides);

    expect(merged.coreParams?.divinePresence).toBe(0.9);
    expect(merged.coreParams?.divineReliability).toBe(0.8);
  });

  it('should merge beliefEconomy', () => {
    const base = {
      beliefEconomy: {
        generationMultiplier: 1,
        decayMultiplier: 1,
      },
    } as Partial<UniverseDivineConfig>;

    const overrides = {
      beliefEconomy: {
        generationMultiplier: 2,
      },
    } as Partial<UniverseDivineConfig>;

    const merged = mergeConfigs(base, overrides);

    expect(merged.beliefEconomy?.generationMultiplier).toBe(2);
    expect(merged.beliefEconomy?.decayMultiplier).toBe(1);
  });

  it('should deeply merge powers config', () => {
    const base = {
      powers: {
        globalCostMultiplier: 1,
        prayers: {
          prayerEffectiveness: 1,
          prayerBeliefGeneration: 1,
        },
      },
    } as Partial<UniverseDivineConfig>;

    const overrides = {
      powers: {
        globalCostMultiplier: 2,
        prayers: {
          prayerEffectiveness: 1.5,
        },
      },
    } as Partial<UniverseDivineConfig>;

    const merged = mergeConfigs(base, overrides);

    expect(merged.powers?.globalCostMultiplier).toBe(2);
    expect(merged.powers?.prayers?.prayerEffectiveness).toBe(1.5);
    expect(merged.powers?.prayers?.prayerBeliefGeneration).toBe(1);
  });

  it('should handle empty base', () => {
    const base = {} as Partial<UniverseDivineConfig>;
    const overrides = {
      universeId: 'test',
      coreParams: { divinePresence: 0.5 },
    } as Partial<UniverseDivineConfig>;

    const merged = mergeConfigs(base, overrides);

    expect(merged.universeId).toBe('test');
    expect(merged.coreParams?.divinePresence).toBe(0.5);
  });

  it('should handle empty overrides', () => {
    const base = {
      universeId: 'base',
      coreParams: { divinePresence: 0.5 },
    } as Partial<UniverseDivineConfig>;
    const overrides = {} as Partial<UniverseDivineConfig>;

    const merged = mergeConfigs(base, overrides);

    expect(merged.universeId).toBe('base');
    expect(merged.coreParams?.divinePresence).toBe(0.5);
  });
});

// ============================================================================
// createUniverseConfig Tests
// ============================================================================

describe('createUniverseConfig', () => {
  it('should create config with universeId and name', () => {
    const config = createUniverseConfig('universe-1', 'My Universe', 'high_fantasy');

    expect(config.universeId).toBe('universe-1');
    expect(config.name).toBe('My Universe');
  });

  it('should apply preset config', () => {
    const config = createUniverseConfig('u1', 'Test', 'high_fantasy');

    // High fantasy has low cost multiplier
    expect(config.powers?.globalCostMultiplier).toBeLessThan(1);
  });

  it('should allow overriding preset values', () => {
    const config = createUniverseConfig('u1', 'Test', 'high_fantasy', {
      powers: {
        globalCostMultiplier: 5, // Override the cheap high fantasy costs
      } as PowerConfig,
    });

    expect(config.powers?.globalCostMultiplier).toBe(5);
  });

  it('should preserve preset values not overridden', () => {
    const highFantasy = getPresetConfig('high_fantasy');

    const config = createUniverseConfig('u1', 'Test', 'high_fantasy', {
      coreParams: {
        divinePresence: 0.99,
      } as any,
    });

    // Custom override applied
    expect(config.coreParams?.divinePresence).toBe(0.99);
    // Preset value preserved
    expect(config.beliefEconomy?.generationMultiplier).toBe(
      highFantasy.beliefEconomy?.generationMultiplier
    );
  });

  describe('preset variations', () => {
    it('should create valid grimdark universe', () => {
      const config = createUniverseConfig('grim-1', 'Dark World', 'grimdark');

      expect(config.powers?.globalCostMultiplier).toBeGreaterThan(1);
      expect(config.beliefEconomy?.decayMultiplier).toBeGreaterThan(1);
    });

    it('should create valid deistic universe', () => {
      const config = createUniverseConfig('deist-1', 'Distant Gods', 'deistic');

      expect(config.powers?.globalCostMultiplier).toBeGreaterThan(2);
    });

    it('should create valid animistic universe', () => {
      const config = createUniverseConfig('anim-1', 'Spirit World', 'animistic');

      expect(config).toBeDefined();
    });
  });
});

// ============================================================================
// Gameplay Scenarios
// ============================================================================

describe('gameplay scenarios', () => {
  describe('high fantasy campaign', () => {
    it('should make miracles affordable', () => {
      const config = createUniverseConfig('hf-1', 'Heroic Realm', 'high_fantasy');
      const powerConfig = config.powers!;

      const baseCost = 100;
      const effectiveCost = calculateEffectivePowerCost(
        baseCost,
        'minor_miracle',
        powerConfig,
        false
      );

      // High fantasy should reduce cost
      expect(effectiveCost).toBeLessThan(baseCost);
    });

    it('should increase power ranges', () => {
      const config = createUniverseConfig('hf-1', 'Heroic Realm', 'high_fantasy');
      const powerConfig = config.powers!;

      const baseRange = 100;
      const effectiveRange = calculateEffectiveRange(baseRange, 'storm_calling', powerConfig);

      // High fantasy should have longer ranges
      expect(effectiveRange).toBeGreaterThanOrEqual(baseRange);
    });
  });

  describe('grimdark campaign', () => {
    it('should make all powers expensive', () => {
      const config = createUniverseConfig('gd-1', 'Grim World', 'grimdark');
      const powerConfig = config.powers!;

      const baseCost = 100;
      const effectiveCost = calculateEffectivePowerCost(
        baseCost,
        'heal_wound',
        powerConfig,
        false
      );

      // Grimdark should increase cost
      expect(effectiveCost).toBeGreaterThan(baseCost);
    });

    it('should make off-domain powers very expensive', () => {
      const config = createUniverseConfig('gd-1', 'Grim World', 'grimdark');
      const powerConfig = config.powers!;

      const onDomainCost = calculateEffectivePowerCost(100, 'smite', powerConfig, false);
      const offDomainCost = calculateEffectivePowerCost(100, 'smite', powerConfig, true);

      expect(offDomainCost).toBeGreaterThan(onDomainCost);
    });
  });

  describe('custom universe', () => {
    it('should allow creating unique divine physics', () => {
      const config = createUniverseConfig('custom-1', 'Weird World', 'chaotic', {
        powers: {
          globalCostMultiplier: 0.5,        // Cheap
          globalRangeMultiplier: 0.1,        // But very short range
          globalDurationMultiplier: 10,      // Very long lasting
          basePowerSuccessRate: 0.5,        // Unreliable
        } as PowerConfig,
        beliefEconomy: {
          generationMultiplier: 3,          // Fast belief gain
          decayMultiplier: 5,               // But also fast decay
        } as any,
      });

      expect(config.powers?.globalCostMultiplier).toBe(0.5);
      expect(config.powers?.globalRangeMultiplier).toBe(0.1);
      expect(config.powers?.globalDurationMultiplier).toBe(10);
      expect(config.beliefEconomy?.generationMultiplier).toBe(3);
      expect(config.beliefEconomy?.decayMultiplier).toBe(5);
    });

    it('should allow disabling specific powers', () => {
      const config = createUniverseConfig('no-resurrect', 'Mortal World', 'low_fantasy', {
        powers: {
          disabledPowers: ['resurrect_recent', 'resurrect_old', 'ascend_mortal'],
        } as PowerConfig,
      });

      expect(isPowerAvailable('resurrect_recent', config.powers!)).toBe(false);
      expect(isPowerAvailable('resurrect_old', config.powers!)).toBe(false);
      expect(isPowerAvailable('ascend_mortal', config.powers!)).toBe(false);
      // Other powers still available
      expect(isPowerAvailable('heal_wound', config.powers!)).toBe(true);
    });
  });
});
