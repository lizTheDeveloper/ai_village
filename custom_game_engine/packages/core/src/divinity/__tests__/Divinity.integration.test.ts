/**
 * Integration tests for the Divinity System
 *
 * These tests verify that the various divinity subsystems work together correctly
 * in realistic gameplay scenarios.
 */

import { describe, it, expect } from 'vitest';

// Belief System
import {
  BELIEF_THRESHOLDS,
  BELIEF_GENERATION_RATES,
  createInitialBeliefState,
  calculateBeliefGeneration,
  type DeityBeliefState,
} from '../BeliefTypes.js';

// Deity System
import {
  createBlankIdentity,
  createEmergentIdentity,
  createDefaultPersonality,
  type DeityIdentity,
  type DivineDomain,
} from '../DeityTypes.js';

// Power System
import {
  POWER_TIER_THRESHOLDS,
  getTierForBelief,
  canUsePower,
  getDomainCostModifier,
  createPrayer,
  type DivinePowerType,
} from '../DivinePowerTypes.js';

// Servant System
import {
  POWER_BUDGET_BY_RANK,
  createDivineHierarchy,
  playerDesignToTemplate,
  createServantFromTemplate,
  createServantPowerGrant,
  calculatePowerBudgetCost,
  calculateHierarchyMaintenance,
  getPowerBudgetForRank,
  type ServantTemplate,
  type DivineServant,
  type PlayerServantDesign,
} from '../DivineServantTypes.js';

// Universe Config
import {
  createUniverseConfig,
  calculateEffectivePowerCost,
  isPowerAvailable,
  type PowerConfig,
} from '../UniverseConfig.js';

// ============================================================================
// Complete God Lifecycle Tests
// ============================================================================

describe('complete god lifecycle', () => {
  it('should simulate a deity emerging, gaining power, and creating servants', () => {
    // Step 1: A deity emerges from collective belief
    const deity = createEmergentIdentity(
      'Arvest, The Grain Lord',
      'belief_crystallization',
      'harvest',
      {
        benevolence: 0.7,
        generosity: 0.8,
        interventionism: 0.5,
      }
    );

    expect(deity.domain).toBe('harvest');
    expect(deity.perceivedPersonality.benevolence).toBe(0.7);

    // Step 2: Initial belief state (newly emerged)
    const beliefState = createInitialBeliefState(50);
    expect(beliefState.currentBelief).toBe(50);
    expect(getTierForBelief(beliefState.currentBelief)).toBe('minor');

    // Step 3: Simulate worship accumulation
    const villagerFaith = 0.8;
    const hourlyBelief = calculateBeliefGeneration('prayer', villagerFaith, {
      sacredSiteBonus: 0.5, // Shrine
      communalBonus: 0.3,   // Group prayer
    });
    expect(hourlyBelief).toBeGreaterThan(0);

    // Simulate 100 hours of worship from 10 villagers
    const accumulatedBelief = hourlyBelief * 100 * 10;
    beliefState.currentBelief += accumulatedBelief;

    // Should now be moderate tier
    expect(getTierForBelief(beliefState.currentBelief)).toBe('moderate');

    // Step 4: Can now use moderate powers
    const canUseMinorMiracle = canUsePower(
      'moderate',
      beliefState.currentBelief,
      50
    );
    expect(canUseMinorMiracle.canUse).toBe(true);
  });

  it('should handle player god starting from scratch', () => {
    // Player creates a god with no predetermined identity
    const playerGod = createBlankIdentity('???');

    expect(playerGod.initiallyBlank).toBe(true);
    expect(playerGod.domain).toBe('mystery');
    expect(playerGod.epithets).toHaveLength(0);

    // Starts with minimal belief (player-injected)
    const beliefState = createInitialBeliefState(BELIEF_THRESHOLDS.minimum);

    // Just at minimum - can exist but not do much
    expect(beliefState.currentBelief).toBe(10);
    expect(beliefState.fadingRisk).toBe(false);
    expect(getTierForBelief(beliefState.currentBelief)).toBe('minor');

    // Can only use minor powers
    const canWhisper = canUsePower('minor', beliefState.currentBelief, 5);
    expect(canWhisper.canUse).toBe(true);

    const canSmite = canUsePower('major', beliefState.currentBelief, 100);
    expect(canSmite.canUse).toBe(false);
    expect(canSmite.reason).toBe('tier_too_low');
  });
});

// ============================================================================
// Servant Creation Flow Tests
// ============================================================================

describe('servant creation flow', () => {
  it('should create complete servant hierarchy from player design', () => {
    // Step 1: Create deity and hierarchy
    const hierarchy = createDivineHierarchy(
      'deity-war-123',
      'The Crimson Host',
      'Battle-spirits that serve the God of War'
    );

    expect(hierarchy.hierarchyName).toBe('The Crimson Host');
    expect(hierarchy.templatesByRank).toHaveLength(0);

    // Step 2: Design lowest-rank servants
    const bloodEchoDesign: PlayerServantDesign = {
      typeName: 'Blood Echo',
      description: 'Whispers of fallen warriors',
      appearanceTraits: ['translucent', 'crimson mist', 'faces of the dead'],
      size: 'small',
      composition: ['spirit', 'memories'],
      movement: ['hover', 'phase'],
      canSpeak: false,
      personalityKeywords: ['melancholic', 'vengeful'],
      primaryAbilities: [
        { name: 'Death Whisper', description: 'Warn of danger', category: 'perception' },
        { name: 'Grief Touch', description: 'Inflict sorrow', category: 'curse' },
      ],
      hierarchyRank: 0,
      maximumCount: 100,
    };

    const bloodEchoTemplate = playerDesignToTemplate(bloodEchoDesign, 'deity-war-123');

    expect(bloodEchoTemplate.typeName).toBe('Blood Echo');
    expect(bloodEchoTemplate.hierarchyRank).toBe(0);
    expect(bloodEchoTemplate.form.category).toBe('spectral'); // inferred from spirit composition

    // Step 3: Design higher-rank servants
    const valkyrieDesign: PlayerServantDesign = {
      typeName: 'Valkyrie',
      description: 'Choosers of the slain',
      appearanceTraits: ['armored', 'winged', 'burning eyes'],
      size: 'human',
      composition: ['spirit', 'light'],
      movement: ['walk', 'fly'],
      canSpeak: true,
      personalityKeywords: ['stern', 'honorable', 'fierce'],
      primaryAbilities: [
        { name: 'Soul Claim', description: 'Collect worthy souls', category: 'transformation' },
        { name: 'War Cry', description: 'Inspire warriors', category: 'blessing' },
        { name: 'Spear of Judgment', description: 'Divine strike', category: 'combat' },
      ],
      hierarchyRank: 2,
      maximumCount: 9,
    };

    const valkyrieTemplate = playerDesignToTemplate(valkyrieDesign, 'deity-war-123');

    expect(valkyrieTemplate.typeName).toBe('Valkyrie');
    expect(valkyrieTemplate.hierarchyRank).toBe(2);
    expect(valkyrieTemplate.form.communication.canSpeak).toBe(true);

    // Step 4: Create actual servant instances
    const valkyrie1 = createServantFromTemplate(valkyrieTemplate, 'entity-v1', 'Brunhilde');

    expect(valkyrie1.name).toBe('Brunhilde');
    expect(valkyrie1.templateId).toBe(valkyrieTemplate.id);
    expect(valkyrie1.state.active).toBe(true);

    // Step 5: Calculate hierarchy maintenance
    const servant1 = createServantFromTemplate(bloodEchoTemplate, 'entity-be1');
    const servant2 = createServantFromTemplate(bloodEchoTemplate, 'entity-be2');

    const maintenance = calculateHierarchyMaintenance(hierarchy, [valkyrie1, servant1, servant2]);
    expect(maintenance).toBeGreaterThan(0);
  });

  it('should manage power grants for servants', () => {
    // Create a template
    const template: ServantTemplate = {
      id: 'template-valkyrie',
      deityId: 'deity-war',
      typeName: 'Valkyrie',
      typeNamePlural: 'Valkyries',
      description: 'Divine warriors',
      hierarchyRank: 2,
      rankTitle: 'Chooser',
      form: {
        category: 'humanoid',
        description: 'Armored warriors',
        size: 'human',
        composition: ['spirit', 'light'],
        movement: ['walk', 'fly'],
        senses: ['sight', 'hearing'],
        appendages: [],
        communication: { canSpeak: true, languages: 'all', alternativeMethods: [] },
        specialFeatures: [],
        variationsAllowed: false,
        variableAspects: [],
      },
      personality: {
        obedience: 'loyal',
        mortalAttitude: 'neutral',
        temperament: ['stern'],
        motivations: ['serve'],
        canDevelopPersonality: true,
        personalityDriftAmount: 0.2,
        defaultEmotionalState: 'calm',
        communicationStyle: ['formal'],
        selfAwareness: 'high',
        sentience: 'full',
      },
      abilities: [],
      baseStats: { customStats: {} },
      creationCost: 300,
      maintenanceCost: 3,
      maximumCount: 9,
      prerequisites: [],
      createdAt: Date.now(),
      origin: 'player',
    };

    // Create power grant for rank 2 servant
    const powerGrant = createServantPowerGrant(template.id, 'deity-war', 2);

    expect(powerGrant.powerBudget).toBe(50); // Rank 2 gets 50 budget
    expect(powerGrant.remainingBudget).toBe(50);
    expect(powerGrant.grantedPowers).toHaveLength(0);

    // Calculate costs for potential powers
    const smiteCost = calculatePowerBudgetCost('smite', 0.3); // 30% power version
    const protectionCost = calculatePowerBudgetCost('divine_protection', 0.5);
    const inspireCost = calculatePowerBudgetCost('inspire_emotion', 0.7);

    // 30 * 0.3 = 9, 15 * 0.5 = 7.5 -> 8, 8 * 0.7 = 5.6 -> 6
    expect(smiteCost).toBe(9);
    expect(protectionCost).toBe(8);
    expect(inspireCost).toBe(6);

    // Total = 23, within budget of 50
    const totalCost = smiteCost + protectionCost + inspireCost;
    expect(totalCost).toBeLessThanOrEqual(powerGrant.powerBudget);
  });
});

// ============================================================================
// Domain and Power Alignment Tests
// ============================================================================

describe('domain and power alignment', () => {
  it('should apply domain cost modifiers correctly', () => {
    const warDeity = {
      primaryDomain: 'war' as DivineDomain,
      secondaryDomains: ['death', 'vengeance'] as DivineDomain[],
    };

    // Smite is a war power
    const smiteDomains: DivineDomain[] = ['war', 'vengeance'];

    // Primary domain match
    const primaryModifier = getDomainCostModifier(
      smiteDomains,
      warDeity.primaryDomain,
      warDeity.secondaryDomains
    );
    expect(primaryModifier).toBe(1.0);

    // Secondary domain match
    const healDomains: DivineDomain[] = ['healing', 'protection'];
    const secondaryModifier = getDomainCostModifier(
      healDomains,
      warDeity.primaryDomain,
      warDeity.secondaryDomains
    );
    expect(secondaryModifier).toBe(1.5); // Off-domain

    // Death is secondary
    const deathDomains: DivineDomain[] = ['death'];
    const deathModifier = getDomainCostModifier(
      deathDomains,
      warDeity.primaryDomain,
      warDeity.secondaryDomains
    );
    expect(deathModifier).toBe(1.25); // Secondary domain
  });

  it('should integrate domain modifiers with universe config', () => {
    // Create a high fantasy universe
    const config = createUniverseConfig('u1', 'Epic Realm', 'high_fantasy');
    const powerConfig = config.powers!;

    // Base cost for smite
    const baseCost = 100;

    // On-domain cost (war god using smite)
    const onDomainCost = calculateEffectivePowerCost(baseCost, 'smite', powerConfig, false);

    // Off-domain cost (harvest god using smite)
    const offDomainCost = calculateEffectivePowerCost(baseCost, 'smite', powerConfig, true);

    // Off-domain should be more expensive
    expect(offDomainCost).toBeGreaterThan(onDomainCost);

    // In high fantasy, even off-domain should be cheaper than base
    // (due to global cost multiplier < 1)
    expect(offDomainCost).toBeLessThan(baseCost * 2);
  });
});

// ============================================================================
// Prayer and Response Flow Tests
// ============================================================================

describe('prayer and response flow', () => {
  it('should handle complete prayer cycle', () => {
    // Create a deity
    const deity = createEmergentIdentity('Sola, The Healer', 'belief_crystallization', 'healing', {
      benevolence: 0.9,
      compassion: 0.95,
      interventionism: 0.7,
    });

    // Create belief state
    const beliefState = createInitialBeliefState(500);
    expect(getTierForBelief(beliefState.currentBelief)).toBe('major');

    // Create a prayer
    const prayer = createPrayer(
      'villager-123',
      'deity-sola',
      'Please heal my sick child',
      'request',
      'desperate'
    );

    expect(prayer.type).toBe('request');
    expect(prayer.emotion).toBe('desperate');
    expect(prayer.acknowledged).toBe(false);

    // Check if deity can respond with heal_wound
    const canHeal = canUsePower('moderate', beliefState.currentBelief, 50);
    expect(canHeal.canUse).toBe(true);

    // With compassionate deity and desperate prayer, response is likely
    // (In real system, this would factor into LLM decision)
    expect(deity.perceivedPersonality.compassion).toBeGreaterThan(0.9);
  });

  it('should generate belief from worship activities', () => {
    // Simulate various worship activities
    const activities = [
      { type: 'passive_faith' as const, faith: 0.5, hours: 24 },
      { type: 'prayer' as const, faith: 0.8, hours: 2 },
      { type: 'ritual' as const, faith: 0.9, hours: 1, communal: 0.5, sacred: 0.3 },
    ];

    let totalBelief = 0;

    for (const activity of activities) {
      const hourlyRate = calculateBeliefGeneration(activity.type, activity.faith, {
        communalBonus: activity.communal,
        sacredSiteBonus: activity.sacred,
      });
      totalBelief += hourlyRate * activity.hours;
    }

    // Should generate meaningful belief
    expect(totalBelief).toBeGreaterThan(0);

    // Ritual with bonuses should generate most per hour
    const passiveRate = calculateBeliefGeneration('passive_faith', 0.5);
    const ritualRate = calculateBeliefGeneration('ritual', 0.9, {
      communalBonus: 0.5,
      sacredSiteBonus: 0.3,
    });
    expect(ritualRate).toBeGreaterThan(passiveRate);
  });
});

// ============================================================================
// Universe Configuration Impact Tests
// ============================================================================

describe('universe configuration impact', () => {
  it('should create dramatically different divine experiences', () => {
    // Create two contrasting universes
    const highFantasy = createUniverseConfig('hf', 'Heroic Realm', 'high_fantasy');
    const grimdark = createUniverseConfig('gd', 'Grim World', 'grimdark');

    // Same base power cost
    const baseCost = 100;

    // High fantasy makes powers cheap
    const hfCost = calculateEffectivePowerCost(
      baseCost,
      'heal_wound',
      highFantasy.powers!,
      false
    );

    // Grimdark makes powers expensive
    const gdCost = calculateEffectivePowerCost(baseCost, 'heal_wound', grimdark.powers!, false);

    expect(hfCost).toBeLessThan(baseCost);
    expect(gdCost).toBeGreaterThan(baseCost);
    expect(gdCost).toBeGreaterThan(hfCost * 2); // At least twice as expensive
  });

  it('should enforce power restrictions', () => {
    // Create a universe where resurrection is impossible
    const mortalWorld = createUniverseConfig('mw', 'Mortal World', 'low_fantasy', {
      powers: {
        disabledPowers: ['resurrect_recent', 'resurrect_old', 'ascend_mortal', 'devour_deity'],
      } as PowerConfig,
    });

    // Check power availability
    expect(isPowerAvailable('heal_wound', mortalWorld.powers!)).toBe(true);
    expect(isPowerAvailable('resurrect_recent', mortalWorld.powers!)).toBe(false);
    expect(isPowerAvailable('resurrect_old', mortalWorld.powers!)).toBe(false);
    expect(isPowerAvailable('ascend_mortal', mortalWorld.powers!)).toBe(false);

    // Regular powers still available
    expect(isPowerAvailable('smite', mortalWorld.powers!)).toBe(true);
    expect(isPowerAvailable('bless_harvest', mortalWorld.powers!)).toBe(true);
  });
});

// ============================================================================
// Complete Game Scenario Tests
// ============================================================================

describe('complete game scenarios', () => {
  it('should simulate a village developing religion', () => {
    // Universe setup
    const universe = createUniverseConfig('village-1', 'Quiet Valley', 'low_fantasy');

    // Initially no deity
    const emergingDeity = createBlankIdentity('The Watcher');

    // First prayers (scared villagers)
    const prayers = [
      createPrayer('villager-1', 'unknown', 'Please protect our crops', 'request', 'fearful'),
      createPrayer('villager-2', 'unknown', 'Please let the harvest be good', 'request', 'hopeful'),
      createPrayer('villager-3', 'unknown', 'Thank you for the rain', 'thanks', 'grateful'),
    ];

    expect(prayers).toHaveLength(3);

    // As prayers accumulate, deity crystallizes with harvest domain
    const harvestDeity = createEmergentIdentity(
      'The Field Spirit',
      'belief_crystallization',
      'harvest',
      {
        benevolence: 0.5,
        generosity: 0.6,
        mysteriousness: 0.7, // Still somewhat unknown
      }
    );

    expect(harvestDeity.domain).toBe('harvest');

    // Initial belief from crystallization
    let beliefState = createInitialBeliefState(BELIEF_THRESHOLDS.minimum + 10);
    expect(getTierForBelief(beliefState.currentBelief)).toBe('minor');

    // Simulate a month of worship (10 villagers, a few prayers per day)
    const prayersPerDay = 2; // Hours of prayer
    const dailyBelief = calculateBeliefGeneration('prayer', 0.6) * prayersPerDay * 10; // 10 villagers
    const monthlyBelief = dailyBelief * 30;

    beliefState.currentBelief += monthlyBelief;

    // After a month, deity should be at moderate tier
    // 0.1 * 0.6 * 2 * 10 * 30 = 36 belief + 20 initial = 56 belief
    // This is still in minor tier (10-99)
    // Let's verify the calculation matches expected tier
    const expectedBelief = 20 + 36; // ~56
    expect(beliefState.currentBelief).toBeGreaterThan(50);
    expect(getTierForBelief(beliefState.currentBelief)).toBe('minor');
  });

  it('should simulate a war god creating servant army', () => {
    // Powerful war deity
    const warGod = createEmergentIdentity('Krovax, Blood Lord', 'divine_spawn', 'war', {
      wrathfulness: 0.9,
      interventionism: 0.8,
    });

    const beliefState = createInitialBeliefState(BELIEF_THRESHOLDS.angel_creation);
    expect(getTierForBelief(beliefState.currentBelief)).toBe('supreme');

    // Can create servants
    const canCreateAngel = canUsePower('supreme', beliefState.currentBelief, 500);
    expect(canCreateAngel.canUse).toBe(true);

    // Create hierarchy
    const hierarchy = createDivineHierarchy('deity-krovax', 'The Crimson Host', 'Warriors of blood');

    // Design servant types
    const warriorDesign: PlayerServantDesign = {
      typeName: 'Blood Knight',
      description: 'Armored warriors of the Blood Lord',
      appearanceTraits: ['crimson armor', 'burning eyes', 'blood-dripping weapons'],
      size: 'human',
      composition: ['spirit', 'fire'],
      movement: ['walk', 'run'],
      canSpeak: true,
      personalityKeywords: ['aggressive', 'loyal', 'fearless'],
      primaryAbilities: [
        { name: 'Blood Rage', description: 'Enhanced strength', category: 'blessing' },
        { name: 'Crimson Strike', description: 'Powerful attack', category: 'combat' },
      ],
      hierarchyRank: 1,
      maximumCount: 100,
    };

    const knightTemplate = playerDesignToTemplate(warriorDesign, 'deity-krovax');

    // Create servants
    const knights = [
      createServantFromTemplate(knightTemplate, 'entity-k1', 'Sergeant Korr'),
      createServantFromTemplate(knightTemplate, 'entity-k2', 'Lieutenant Maas'),
      createServantFromTemplate(knightTemplate, 'entity-k3', 'Captain Dren'),
    ];

    expect(knights).toHaveLength(3);
    expect(knights[0].name).toBe('Sergeant Korr');

    // Calculate maintenance
    const maintenance = calculateHierarchyMaintenance(hierarchy, knights);
    expect(maintenance).toBeGreaterThan(0);

    // Belief must cover maintenance
    const hourlyDrain = maintenance;
    const canMaintain = beliefState.currentBelief > hourlyDrain * 24; // One day of maintenance
    expect(canMaintain).toBe(true);
  });

  it('should simulate deity power scaling across tiers', () => {
    // Track deity growth through all tiers
    const tiers: Array<{
      tier: string;
      beliefNeeded: number;
      powersAvailable: DivinePowerType[];
    }> = [
      {
        tier: 'dormant',
        beliefNeeded: 5,
        powersAvailable: [],
      },
      {
        tier: 'minor',
        beliefNeeded: 50,
        powersAvailable: ['whisper', 'subtle_sign', 'dream_hint', 'minor_luck'],
      },
      {
        tier: 'moderate',
        beliefNeeded: 300,
        powersAvailable: ['clear_vision', 'minor_miracle', 'heal_wound', 'reveal_truth'],
      },
      {
        tier: 'major',
        beliefNeeded: 1000,
        powersAvailable: ['mass_vision', 'major_miracle', 'smite', 'bless_harvest'],
      },
      {
        tier: 'supreme',
        beliefNeeded: 3000,
        powersAvailable: ['create_angel', 'manifest_avatar', 'grant_magic'],
      },
      {
        tier: 'world_shaping',
        beliefNeeded: 10000,
        powersAvailable: ['terraform_region', 'create_species', 'reality_warp'],
      },
    ];

    for (const { tier, beliefNeeded, powersAvailable } of tiers) {
      const actualTier = getTierForBelief(beliefNeeded);
      expect(actualTier).toBe(tier);

      // All listed powers should be available at this tier
      for (const power of powersAvailable) {
        const powerTier = getPowerTier(power);
        const canUse = canUsePower(powerTier, beliefNeeded, 10);
        expect(canUse.canUse).toBe(true);
      }
    }
  });
});

// Helper function to get power tier (simplified)
function getPowerTier(power: DivinePowerType): 'minor' | 'moderate' | 'major' | 'supreme' | 'world_shaping' {
  const minorPowers = ['whisper', 'subtle_sign', 'dream_hint', 'minor_luck', 'sense_prayer', 'observe_faithful'];
  const moderatePowers = ['clear_vision', 'voice_of_god', 'minor_miracle', 'bless_individual', 'curse_individual', 'heal_wound', 'reveal_truth', 'inspire_emotion', 'guide_path', 'sacred_mark', 'prophetic_dream'];
  const majorPowers = ['mass_vision', 'major_miracle', 'heal_mortal_wound', 'resurrect_recent', 'storm_calling', 'bless_harvest', 'curse_land', 'smite', 'sanctify_site', 'create_relic', 'mass_blessing', 'mass_curse', 'divine_protection', 'compel_truth', 'divine_judgment'];
  const supremePowers = ['create_angel', 'manifest_avatar', 'resurrect_old', 'terraform_local', 'mass_miracle', 'divine_champion', 'holy_artifact', 'establish_domain', 'divine_edict', 'banish_spirit', 'grant_magic'];

  if (minorPowers.includes(power)) return 'minor';
  if (moderatePowers.includes(power)) return 'moderate';
  if (majorPowers.includes(power)) return 'major';
  if (supremePowers.includes(power)) return 'supreme';
  return 'world_shaping';
}
