/**
 * AngelEvolutionComponent - Tier & Evolution System
 *
 * Phase 28.8: Evolution & Tier System
 *
 * Tracks an angel's tier level and promotion eligibility.
 * After accumulating enough angels at a tier, players can unlock
 * the next tier and promote a subset of their best angels.
 *
 * Tier Progression:
 * - Tier 1: Basic Angels (starting)
 * - Tier 2: Greater Angels (after 10 tier-1)
 * - Tier 3: Arch Angels (after 5 tier-2)
 * - Tier 4: Supreme Angels (legendary, max 1)
 */

import { ComponentBase } from '../ecs/Component.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Requirements to be eligible for promotion
 */
export interface PromotionRequirements {
  minLevel: number;
  minSuccessRate: number;
  minPrayersHandled: number;
  minServiceTime: number;
  specialRequirements?: string[];
}

/**
 * Tier unlock requirements (stored globally, not per-angel)
 */
export interface TierUnlockRequirements {
  tier: number;
  angelsAtPreviousTier: number;
  beliefCost: number;
  totalLifetimeBelief: number;
}

/**
 * Stats bonuses for each tier
 */
export interface TierBonus {
  maxEnergyBonus: number;
  energyRegenBonus: number;
  expertiseBonus: number;
  abilities?: string[];
  special?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Requirements to unlock each tier
 */
export const TIER_REQUIREMENTS: TierUnlockRequirements[] = [
  { tier: 2, angelsAtPreviousTier: 10, beliefCost: 1000, totalLifetimeBelief: 5000 },
  { tier: 3, angelsAtPreviousTier: 5, beliefCost: 3000, totalLifetimeBelief: 15000 },
  { tier: 4, angelsAtPreviousTier: 3, beliefCost: 10000, totalLifetimeBelief: 50000 },
];

/**
 * Default tier names (can be customized per-species)
 */
export const DEFAULT_TIER_NAMES: string[] = [
  'Angel',
  'Greater Angel',
  'Archangel',
  'Supreme Angel',
];

/**
 * Stat bonuses per tier
 */
export const TIER_BONUSES: Record<number, TierBonus> = {
  1: {
    maxEnergyBonus: 0,
    energyRegenBonus: 0,
    expertiseBonus: 0,
  },
  2: {
    maxEnergyBonus: 50,
    energyRegenBonus: 5,
    expertiseBonus: 0.1,
  },
  3: {
    maxEnergyBonus: 100,
    energyRegenBonus: 10,
    expertiseBonus: 0.2,
    abilities: ['mass_blessing', 'prophetic_dream'],
  },
  4: {
    maxEnergyBonus: 200,
    energyRegenBonus: 20,
    expertiseBonus: 0.3,
    abilities: ['divine_intervention', 'reality_glimpse'],
    special: 'physical_manifestation',
  },
};

/**
 * Default promotion requirements per tier
 */
export const PROMOTION_REQUIREMENTS: Record<number, PromotionRequirements> = {
  2: {
    minLevel: 7,
    minSuccessRate: 0.8,
    minPrayersHandled: 100,
    minServiceTime: 24,
  },
  3: {
    minLevel: 15,
    minSuccessRate: 0.85,
    minPrayersHandled: 500,
    minServiceTime: 72,
  },
  4: {
    minLevel: 30,
    minSuccessRate: 0.9,
    minPrayersHandled: 2000,
    minServiceTime: 168,
    specialRequirements: ['witnessed_miracle', 'defeated_corruption'],
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * AngelEvolutionComponent - Tracks an angel's tier and promotion state
 */
export class AngelEvolutionComponent extends ComponentBase {
  public readonly type = 'angel_evolution';

  // Current tier
  public tier: number;
  public tierName: string;

  // Level and experience
  public level: number;
  public experience: number;
  public experienceToNextLevel: number;

  // Performance metrics for promotion eligibility
  public prayersHandled: number;
  public prayersSuccessful: number;
  public serviceTimeHours: number;
  public specialAchievements: string[];

  // Promotion state
  public promotionEligible: boolean;
  public lastPromotedAt?: number;

  // Evolution history
  public evolutionHistory: Array<{
    fromTier: number;
    toTier: number;
    promotedAt: number;
    previousSpriteId?: string;
  }>;

  // Visual evolution
  public currentSpriteId?: string;
  public currentDescription: string;

  constructor(options: {
    tier?: number;
    tierName?: string;
    level?: number;
    currentDescription?: string;
    currentSpriteId?: string;
  } = {}) {
    super();

    this.tier = options.tier ?? 1;
    this.tierName = options.tierName ?? DEFAULT_TIER_NAMES[this.tier - 1] ?? 'Angel';
    this.level = options.level ?? 1;
    this.experience = 0;
    this.experienceToNextLevel = this.calculateXPForLevel(this.level + 1);

    this.prayersHandled = 0;
    this.prayersSuccessful = 0;
    this.serviceTimeHours = 0;
    this.specialAchievements = [];

    this.promotionEligible = false;
    this.evolutionHistory = [];

    this.currentDescription = options.currentDescription ?? 'A divine servant';
    this.currentSpriteId = options.currentSpriteId;
  }

  /**
   * Calculate XP required for a given level
   */
  private calculateXPForLevel(level: number): number {
    // Quadratic scaling: 100 * level^1.5
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Add experience points
   */
  addExperience(xp: number): { leveledUp: boolean; newLevel: number } {
    this.experience += xp;
    let leveledUp = false;

    while (this.experience >= this.experienceToNextLevel) {
      this.experience -= this.experienceToNextLevel;
      this.level++;
      this.experienceToNextLevel = this.calculateXPForLevel(this.level + 1);
      leveledUp = true;
    }

    // Check promotion eligibility after leveling
    this.checkPromotionEligibility();

    return { leveledUp, newLevel: this.level };
  }

  /**
   * Record a prayer handled
   */
  recordPrayerHandled(successful: boolean): void {
    this.prayersHandled++;
    if (successful) {
      this.prayersSuccessful++;
    }
    this.checkPromotionEligibility();
  }

  /**
   * Add service time
   */
  addServiceTime(hours: number): void {
    this.serviceTimeHours += hours;
    this.checkPromotionEligibility();
  }

  /**
   * Record a special achievement
   */
  recordAchievement(achievement: string): void {
    if (!this.specialAchievements.includes(achievement)) {
      this.specialAchievements.push(achievement);
      this.checkPromotionEligibility();
    }
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.prayersHandled === 0) return 0;
    return this.prayersSuccessful / this.prayersHandled;
  }

  /**
   * Check if eligible for promotion
   */
  checkPromotionEligibility(): void {
    const nextTier = this.tier + 1;
    if (nextTier > 4) {
      this.promotionEligible = false;
      return;
    }

    const requirements = PROMOTION_REQUIREMENTS[nextTier];
    if (!requirements) {
      this.promotionEligible = false;
      return;
    }

    // Check all requirements
    const meetsLevel = this.level >= requirements.minLevel;
    const meetsSuccessRate = this.getSuccessRate() >= requirements.minSuccessRate;
    const meetsPrayers = this.prayersHandled >= requirements.minPrayersHandled;
    const meetsServiceTime = this.serviceTimeHours >= requirements.minServiceTime;

    let meetsSpecial = true;
    if (requirements.specialRequirements) {
      meetsSpecial = requirements.specialRequirements.every(
        req => this.specialAchievements.includes(req)
      );
    }

    this.promotionEligible = meetsLevel && meetsSuccessRate && meetsPrayers && meetsServiceTime && meetsSpecial;
  }

  /**
   * Promote to next tier
   */
  promote(options: {
    newTierName: string;
    newDescription: string;
    newSpriteId?: string;
    currentTick: number;
  }): boolean {
    if (!this.promotionEligible) {
      return false;
    }

    const previousTier = this.tier;
    const previousSpriteId = this.currentSpriteId;

    // Record history
    this.evolutionHistory.push({
      fromTier: previousTier,
      toTier: previousTier + 1,
      promotedAt: options.currentTick,
      previousSpriteId,
    });

    // Update tier
    this.tier++;
    this.tierName = options.newTierName;
    this.currentDescription = options.newDescription;
    this.currentSpriteId = options.newSpriteId;
    this.lastPromotedAt = options.currentTick;
    this.promotionEligible = false;

    return true;
  }

  /**
   * Get current tier bonus
   */
  getTierBonus(): TierBonus {
    return TIER_BONUSES[this.tier] ?? TIER_BONUSES[1]!;
  }

  /**
   * Get promotion progress (0-1)
   */
  getPromotionProgress(): {
    level: number;
    successRate: number;
    prayers: number;
    serviceTime: number;
    special: number;
    overall: number;
  } {
    const nextTier = this.tier + 1;
    if (nextTier > 4) {
      return { level: 1, successRate: 1, prayers: 1, serviceTime: 1, special: 1, overall: 1 };
    }

    const requirements = PROMOTION_REQUIREMENTS[nextTier];
    if (!requirements) {
      return { level: 1, successRate: 1, prayers: 1, serviceTime: 1, special: 1, overall: 1 };
    }

    const levelProgress = Math.min(1, this.level / requirements.minLevel);
    const successRateProgress = Math.min(1, this.getSuccessRate() / requirements.minSuccessRate);
    const prayersProgress = Math.min(1, this.prayersHandled / requirements.minPrayersHandled);
    const serviceTimeProgress = Math.min(1, this.serviceTimeHours / requirements.minServiceTime);

    let specialProgress = 1;
    if (requirements.specialRequirements && requirements.specialRequirements.length > 0) {
      const achieved = requirements.specialRequirements.filter(
        req => this.specialAchievements.includes(req)
      ).length;
      specialProgress = achieved / requirements.specialRequirements.length;
    }

    const overall = (levelProgress + successRateProgress + prayersProgress + serviceTimeProgress + specialProgress) / 5;

    return {
      level: levelProgress,
      successRate: successRateProgress,
      prayers: prayersProgress,
      serviceTime: serviceTimeProgress,
      special: specialProgress,
      overall,
    };
  }
}

/**
 * Create a new angel evolution component
 */
export function createAngelEvolutionComponent(options?: {
  tier?: number;
  tierName?: string;
  level?: number;
  currentDescription?: string;
  currentSpriteId?: string;
}): AngelEvolutionComponent {
  return new AngelEvolutionComponent(options);
}

/**
 * Get requirements to unlock a tier
 */
export function getTierRequirements(tier: number): TierUnlockRequirements | undefined {
  return TIER_REQUIREMENTS.find(req => req.tier === tier);
}

/**
 * Check if a tier can be unlocked
 */
export function canUnlockTier(
  tier: number,
  angelsAtPreviousTier: number,
  currentBelief: number,
  totalLifetimeBelief: number
): { canUnlock: boolean; reason?: string } {
  const requirements = getTierRequirements(tier);
  if (!requirements) {
    return { canUnlock: false, reason: 'Invalid tier' };
  }

  if (angelsAtPreviousTier < requirements.angelsAtPreviousTier) {
    return {
      canUnlock: false,
      reason: `Need ${requirements.angelsAtPreviousTier} angels at tier ${tier - 1} (have ${angelsAtPreviousTier})`,
    };
  }

  if (currentBelief < requirements.beliefCost) {
    return {
      canUnlock: false,
      reason: `Need ${requirements.beliefCost} belief (have ${currentBelief})`,
    };
  }

  if (totalLifetimeBelief < requirements.totalLifetimeBelief) {
    return {
      canUnlock: false,
      reason: `Need ${requirements.totalLifetimeBelief} lifetime belief (have ${totalLifetimeBelief})`,
    };
  }

  return { canUnlock: true };
}
