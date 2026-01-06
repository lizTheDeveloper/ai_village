import { describe, it, expect } from 'vitest';
import {
  // Constants
  POWER_TIER_THRESHOLDS,
  DOMAIN_POWER_AFFINITIES,

  // Functions
  getTierForBelief,
  canUsePower,
  getDomainCostModifier,
  createPrayer,

  // Types
  type PowerTier,
  type DivinePowerType,
  type Prayer,
  type PrayerType,
  type PrayerEmotion,
} from '../DivinePowerTypes.js';

// ============================================================================
// POWER_TIER_THRESHOLDS Tests
// ============================================================================

describe('POWER_TIER_THRESHOLDS', () => {
  it('should have correct threshold for dormant', () => {
    expect(POWER_TIER_THRESHOLDS.dormant).toBe(0);
  });

  it('should have correct threshold for minor', () => {
    expect(POWER_TIER_THRESHOLDS.minor).toBe(10);
  });

  it('should have correct threshold for moderate', () => {
    expect(POWER_TIER_THRESHOLDS.moderate).toBe(100);
  });

  it('should have correct threshold for major', () => {
    expect(POWER_TIER_THRESHOLDS.major).toBe(500);
  });

  it('should have correct threshold for supreme', () => {
    expect(POWER_TIER_THRESHOLDS.supreme).toBe(2000);
  });

  it('should have correct threshold for world_shaping', () => {
    expect(POWER_TIER_THRESHOLDS.world_shaping).toBe(5000);
  });

  it('should have increasing thresholds', () => {
    const tiers: PowerTier[] = ['dormant', 'minor', 'moderate', 'major', 'supreme', 'world_shaping'];
    for (let i = 1; i < tiers.length; i++) {
      expect(POWER_TIER_THRESHOLDS[tiers[i]]).toBeGreaterThan(
        POWER_TIER_THRESHOLDS[tiers[i - 1]]
      );
    }
  });
});

// ============================================================================
// DOMAIN_POWER_AFFINITIES Tests
// ============================================================================

describe('DOMAIN_POWER_AFFINITIES', () => {
  it('should have affinities for war domain', () => {
    const warAffinities = DOMAIN_POWER_AFFINITIES.war;
    expect(warAffinities).toContain('smite');
    expect(warAffinities).toContain('inspire_emotion');
  });

  it('should have affinities for harvest domain', () => {
    const harvestAffinities = DOMAIN_POWER_AFFINITIES.harvest;
    expect(harvestAffinities).toContain('bless_harvest');
    expect(harvestAffinities).toContain('minor_luck');
  });

  it('should have affinities for death domain', () => {
    const deathAffinities = DOMAIN_POWER_AFFINITIES.death;
    expect(deathAffinities).toContain('resurrect_recent');
    expect(deathAffinities).toContain('banish_spirit');
  });

  it('should have affinities for healing domain', () => {
    const healingAffinities = DOMAIN_POWER_AFFINITIES.healing;
    expect(healingAffinities).toContain('heal_wound');
    expect(healingAffinities).toContain('heal_mortal_wound');
  });

  it('should have affinities for protection domain', () => {
    const protectionAffinities = DOMAIN_POWER_AFFINITIES.protection;
    expect(protectionAffinities).toContain('divine_protection');
    expect(protectionAffinities).toContain('sanctify_site');
  });

  it('should have multiple powers per domain', () => {
    for (const domain of Object.keys(DOMAIN_POWER_AFFINITIES)) {
      const affinities = DOMAIN_POWER_AFFINITIES[domain as keyof typeof DOMAIN_POWER_AFFINITIES];
      expect(affinities.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// getTierForBelief Tests
// ============================================================================

describe('getTierForBelief', () => {
  describe('dormant tier', () => {
    it('should return dormant for 0 belief', () => {
      expect(getTierForBelief(0)).toBe('dormant');
    });

    it('should return dormant for belief below 10', () => {
      expect(getTierForBelief(5)).toBe('dormant');
      expect(getTierForBelief(9)).toBe('dormant');
    });

    it('should return dormant for negative belief', () => {
      expect(getTierForBelief(-10)).toBe('dormant');
    });
  });

  describe('minor tier', () => {
    it('should return minor at exactly 10 belief', () => {
      expect(getTierForBelief(10)).toBe('minor');
    });

    it('should return minor for belief 10-99', () => {
      expect(getTierForBelief(50)).toBe('minor');
      expect(getTierForBelief(99)).toBe('minor');
    });
  });

  describe('moderate tier', () => {
    it('should return moderate at exactly 100 belief', () => {
      expect(getTierForBelief(100)).toBe('moderate');
    });

    it('should return moderate for belief 100-499', () => {
      expect(getTierForBelief(250)).toBe('moderate');
      expect(getTierForBelief(499)).toBe('moderate');
    });
  });

  describe('major tier', () => {
    it('should return major at exactly 500 belief', () => {
      expect(getTierForBelief(500)).toBe('major');
    });

    it('should return major for belief 500-1999', () => {
      expect(getTierForBelief(1000)).toBe('major');
      expect(getTierForBelief(1999)).toBe('major');
    });
  });

  describe('supreme tier', () => {
    it('should return supreme at exactly 2000 belief', () => {
      expect(getTierForBelief(2000)).toBe('supreme');
    });

    it('should return supreme for belief 2000-4999', () => {
      expect(getTierForBelief(3000)).toBe('supreme');
      expect(getTierForBelief(4999)).toBe('supreme');
    });
  });

  describe('world_shaping tier', () => {
    it('should return world_shaping at exactly 5000 belief', () => {
      expect(getTierForBelief(5000)).toBe('world_shaping');
    });

    it('should return world_shaping for any belief above 5000', () => {
      expect(getTierForBelief(10000)).toBe('world_shaping');
      expect(getTierForBelief(1000000)).toBe('world_shaping');
    });
  });
});

// ============================================================================
// canUsePower Tests
// ============================================================================

describe('canUsePower', () => {
  describe('tier requirements', () => {
    it('should allow using minor power with minor tier', () => {
      const result = canUsePower('minor', 50, 10);
      expect(result.canUse).toBe(true);
    });

    it('should allow using minor power with higher tier', () => {
      const result = canUsePower('minor', 5000, 10);
      expect(result.canUse).toBe(true);
    });

    it('should deny using major power with minor tier', () => {
      const result = canUsePower('major', 50, 10);
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('tier_too_low');
    });

    it('should deny using world_shaping power with supreme tier', () => {
      const result = canUsePower('world_shaping', 3000, 100);
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('tier_too_low');
    });

    it('should allow world_shaping with world_shaping tier', () => {
      const result = canUsePower('world_shaping', 10000, 1000);
      expect(result.canUse).toBe(true);
    });
  });

  describe('belief cost requirements', () => {
    it('should allow when belief >= cost', () => {
      const result = canUsePower('minor', 100, 50);
      expect(result.canUse).toBe(true);
    });

    it('should allow when belief == cost exactly', () => {
      const result = canUsePower('minor', 50, 50);
      expect(result.canUse).toBe(true);
    });

    it('should deny when belief < cost', () => {
      const result = canUsePower('minor', 20, 50);
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('insufficient_belief');
    });
  });

  describe('combined requirements', () => {
    it('should check tier before belief', () => {
      // Has enough belief but wrong tier
      const result = canUsePower('major', 50, 10);
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('tier_too_low');
    });

    it('should deny when both tier and belief are insufficient', () => {
      const result = canUsePower('major', 50, 100);
      expect(result.canUse).toBe(false);
      // Tier is checked first
      expect(result.reason).toBe('tier_too_low');
    });
  });

  describe('dormant tier', () => {
    it('should not allow dormant deities to use any power', () => {
      const result = canUsePower('minor', 5, 1);
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('tier_too_low');
    });
  });
});

// ============================================================================
// getDomainCostModifier Tests
// ============================================================================

describe('getDomainCostModifier', () => {
  describe('native domain', () => {
    it('should return 1.0 for primary domain match', () => {
      const modifier = getDomainCostModifier(['war'], 'war', []);
      expect(modifier).toBe(1.0);
    });

    it('should return 1.0 when power has multiple domains including primary', () => {
      const modifier = getDomainCostModifier(['war', 'death'], 'war', []);
      expect(modifier).toBe(1.0);
    });
  });

  describe('secondary domain', () => {
    it('should return 1.25 for secondary domain match', () => {
      const modifier = getDomainCostModifier(['war'], 'harvest', ['war', 'crafts']);
      expect(modifier).toBe(1.25);
    });

    it('should return 1.25 when any secondary matches', () => {
      const modifier = getDomainCostModifier(['death', 'mystery'], 'war', ['mystery']);
      expect(modifier).toBe(1.25);
    });

    it('should prefer primary over secondary (return 1.0)', () => {
      const modifier = getDomainCostModifier(['war'], 'war', ['death']);
      expect(modifier).toBe(1.0);
    });
  });

  describe('neutral (off-domain)', () => {
    it('should return 1.5 for no domain match', () => {
      const modifier = getDomainCostModifier(['war'], 'harvest', ['crafts', 'nature']);
      expect(modifier).toBe(1.5);
    });

    it('should return 1.5 with empty secondary domains', () => {
      const modifier = getDomainCostModifier(['mystery'], 'war', []);
      expect(modifier).toBe(1.5);
    });
  });

  describe('multiple power domains', () => {
    it('should match if any power domain is primary', () => {
      const modifier = getDomainCostModifier(['war', 'death', 'mystery'], 'death', []);
      expect(modifier).toBe(1.0);
    });

    it('should match if any power domain is secondary', () => {
      const modifier = getDomainCostModifier(['war', 'death', 'mystery'], 'harvest', ['mystery']);
      expect(modifier).toBe(1.25);
    });
  });
});

// ============================================================================
// createPrayer Tests
// ============================================================================

describe('createPrayer', () => {
  it('should create prayer with required fields', () => {
    const prayer = createPrayer(
      'agent-123',
      'deity-war',
      'Grant me strength in battle',
      'request'
    );

    expect(prayer.prayerId).toBe('agent-123');
    expect(prayer.deityId).toBe('deity-war');
    expect(prayer.content).toBe('Grant me strength in battle');
    expect(prayer.type).toBe('request');
  });

  it('should generate unique prayer ID', () => {
    const prayer1 = createPrayer('a', 'd', 'content', 'praise');
    const prayer2 = createPrayer('a', 'd', 'content', 'praise');

    expect(prayer1.id).not.toBe(prayer2.id);
    expect(prayer1.id).toMatch(/^prayer_\d+_/);
  });

  it('should default emotion to reverent', () => {
    const prayer = createPrayer('a', 'd', 'content', 'praise');
    expect(prayer.emotion).toBe('reverent');
  });

  it('should accept custom emotion', () => {
    const prayer = createPrayer('a', 'd', 'content', 'request', 'desperate');
    expect(prayer.emotion).toBe('desperate');
  });

  it('should default urgency to earnest', () => {
    const prayer = createPrayer('a', 'd', 'content', 'praise');
    expect(prayer.urgency).toBe('earnest');
  });

  it('should set timestamp to now', () => {
    const before = Date.now();
    const prayer = createPrayer('a', 'd', 'content', 'praise');
    const after = Date.now();

    expect(prayer.timestamp).toBeGreaterThanOrEqual(before);
    expect(prayer.timestamp).toBeLessThanOrEqual(after);
  });

  it('should start unacknowledged', () => {
    const prayer = createPrayer('a', 'd', 'content', 'praise');
    expect(prayer.acknowledged).toBe(false);
  });

  it('should start with no belief generated', () => {
    const prayer = createPrayer('a', 'd', 'content', 'praise');
    expect(prayer.beliefGenerated).toBe(0);
  });

  it('should not have response initially', () => {
    const prayer = createPrayer('a', 'd', 'content', 'praise');
    expect(prayer.response).toBeUndefined();
  });

  describe('prayer types', () => {
    const types: PrayerType[] = ['praise', 'thanks', 'request', 'confession', 'question', 'bargain', 'complaint', 'dedication'];

    types.forEach(type => {
      it(`should accept ${type} as prayer type`, () => {
        const prayer = createPrayer('a', 'd', 'content', type);
        expect(prayer.type).toBe(type);
      });
    });
  });

  describe('prayer emotions', () => {
    const emotions: PrayerEmotion[] = ['reverent', 'fearful', 'hopeful', 'desperate', 'grateful', 'angry', 'sorrowful', 'joyful', 'humble', 'demanding'];

    emotions.forEach(emotion => {
      it(`should accept ${emotion} as emotion`, () => {
        const prayer = createPrayer('a', 'd', 'content', 'praise', emotion);
        expect(prayer.emotion).toBe(emotion);
      });
    });
  });
});

// ============================================================================
// Type Structure Tests
// ============================================================================

describe('type structures', () => {
  describe('DivinePowerType', () => {
    it('should accept valid minor powers', () => {
      const powers: DivinePowerType[] = [
        'whisper',
        'subtle_sign',
        'dream_hint',
        'minor_luck',
        'sense_prayer',
        'observe_faithful',
      ];
      expect(powers).toHaveLength(6);
    });

    it('should accept valid moderate powers', () => {
      const powers: DivinePowerType[] = [
        'clear_vision',
        'voice_of_god',
        'minor_miracle',
        'bless_individual',
        'curse_individual',
        'heal_wound',
        'reveal_truth',
        'inspire_emotion',
        'guide_path',
        'sacred_mark',
        'prophetic_dream',
      ];
      expect(powers).toHaveLength(11);
    });

    it('should accept valid major powers', () => {
      const powers: DivinePowerType[] = [
        'mass_vision',
        'major_miracle',
        'heal_mortal_wound',
        'resurrect_recent',
        'storm_calling',
        'bless_harvest',
        'curse_land',
        'smite',
        'sanctify_site',
        'create_relic',
        'mass_blessing',
        'mass_curse',
        'divine_protection',
        'compel_truth',
        'divine_judgment',
      ];
      expect(powers).toHaveLength(15);
    });

    it('should accept valid supreme powers', () => {
      const powers: DivinePowerType[] = [
        'create_angel',
        'manifest_avatar',
        'resurrect_old',
        'terraform_local',
        'mass_miracle',
        'divine_champion',
        'holy_artifact',
        'establish_domain',
        'divine_edict',
        'banish_spirit',
        'grant_magic',
      ];
      expect(powers).toHaveLength(11);
    });

    it('should accept valid world_shaping powers', () => {
      const powers: DivinePowerType[] = [
        'terraform_region',
        'create_species',
        'divine_cataclysm',
        'ascend_mortal',
        'devour_deity',
        'reality_warp',
        'planar_bridge',
        'eternal_blessing',
        'eternal_curse',
      ];
      expect(powers).toHaveLength(9);
    });
  });

  describe('Prayer', () => {
    it('should accept valid prayer structure', () => {
      const prayer: Prayer = {
        id: 'prayer-1',
        prayerId: 'agent-1',
        deityId: 'deity-1',
        content: 'Please help me',
        type: 'request',
        urgency: 'desperate',
        emotion: 'hopeful',
        timestamp: Date.now(),
        acknowledged: false,
        beliefGenerated: 0,
        request: {
          category: 'health',
          target: 'my_child',
          offering: 'first_harvest',
          timeframe: 'immediate',
        },
      };

      expect(prayer.request?.category).toBe('health');
      expect(prayer.request?.timeframe).toBe('immediate');
    });

    it('should accept prayer with response', () => {
      const prayer: Prayer = {
        id: 'prayer-1',
        prayerId: 'agent-1',
        deityId: 'deity-1',
        content: 'Thank you for the rain',
        type: 'thanks',
        urgency: 'casual',
        emotion: 'grateful',
        timestamp: Date.now() - 1000,
        acknowledged: true,
        beliefGenerated: 5,
        response: {
          type: 'answered',
          powerUsed: 'minor_miracle',
          signGiven: 'A rainbow appeared',
          message: 'You are welcome, child',
          beliefCost: 10,
          timestamp: Date.now(),
        },
      };

      expect(prayer.response?.type).toBe('answered');
      expect(prayer.response?.powerUsed).toBe('minor_miracle');
    });
  });
});

// ============================================================================
// Edge Cases and Boundary Tests
// ============================================================================

describe('edge cases', () => {
  describe('getTierForBelief boundaries', () => {
    it('should correctly handle exact boundary at 10', () => {
      expect(getTierForBelief(9)).toBe('dormant');
      expect(getTierForBelief(10)).toBe('minor');
    });

    it('should correctly handle exact boundary at 100', () => {
      expect(getTierForBelief(99)).toBe('minor');
      expect(getTierForBelief(100)).toBe('moderate');
    });

    it('should correctly handle exact boundary at 500', () => {
      expect(getTierForBelief(499)).toBe('moderate');
      expect(getTierForBelief(500)).toBe('major');
    });

    it('should correctly handle exact boundary at 2000', () => {
      expect(getTierForBelief(1999)).toBe('major');
      expect(getTierForBelief(2000)).toBe('supreme');
    });

    it('should correctly handle exact boundary at 5000', () => {
      expect(getTierForBelief(4999)).toBe('supreme');
      expect(getTierForBelief(5000)).toBe('world_shaping');
    });
  });

  describe('canUsePower at tier boundaries', () => {
    it('should allow minor power at exactly tier threshold', () => {
      const result = canUsePower('minor', 10, 5);
      expect(result.canUse).toBe(true);
    });

    it('should deny minor power just below threshold', () => {
      const result = canUsePower('minor', 9, 5);
      expect(result.canUse).toBe(false);
    });
  });

  describe('floating point belief values', () => {
    it('should handle fractional belief for tier calculation', () => {
      expect(getTierForBelief(9.9)).toBe('dormant');
      expect(getTierForBelief(10.0)).toBe('minor');
      expect(getTierForBelief(10.1)).toBe('minor');
    });

    it('should handle fractional belief for power usage', () => {
      const result = canUsePower('minor', 10.5, 10);
      expect(result.canUse).toBe(true);
    });
  });
});
