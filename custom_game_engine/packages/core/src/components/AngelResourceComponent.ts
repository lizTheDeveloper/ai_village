/**
 * AngelResourceComponent - Angel Independence System
 *
 * Phase 28.9: Angel Independence (Resource Model)
 *
 * Once created with a big upfront belief cost, angels have their own
 * mana pool that regenerates independently. The player doesn't
 * continuously drain belief to maintain angels.
 *
 * Key Design:
 * - Creation: Big belief payment upfront
 * - Maintenance: Angels sustain themselves through prayer handling
 * - Upgrades: Player spends belief to enhance angels
 * - Death: Angels can be "disrupted" but reform automatically
 *        (unless legendary weapon)
 */

import { ComponentBase } from '../ecs/Component.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Source of mana gain
 */
export interface ManaGainSource {
  source: 'prayer' | 'ritual' | 'worship' | 'meditation' | 'deity_gift';
  amount: number;
  timestamp: number;
}

/**
 * Purchased upgrade for an angel
 */
export interface AngelUpgrade {
  id: string;
  name: string;
  purchasedAt: number;
  beliefCost: number;
  effect: {
    type: 'stat_boost' | 'new_ability' | 'mana_increase' | 'cosmetic';
    stat?: string;
    amount?: number;
    abilityId?: string;
    spriteModification?: string;
  };
}

/**
 * Angel disruption (when "killed")
 */
export interface AngelDisruption {
  disruptedAt: number;
  reformAt: number;
  cause: 'combat' | 'divine_punishment' | 'mana_exhaustion' | 'legendary_weapon';
  permanent: boolean;
  reformLocation?: { x: number; y: number };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default mana pool sizes by tier
 */
export const MANA_POOL_BY_TIER: Record<number, number> = {
  1: 100,
  2: 200,
  3: 400,
  4: 800,
};

/**
 * Default mana regen rates by tier (per minute)
 */
export const MANA_REGEN_BY_TIER: Record<number, number> = {
  1: 5,
  2: 10,
  3: 20,
  4: 40,
};

/**
 * Mana gained from various sources
 */
export const MANA_GAIN_AMOUNTS: Record<ManaGainSource['source'], number> = {
  prayer: 10,
  ritual: 50,
  worship: 5,
  meditation: 2,
  deity_gift: 100,
};

/**
 * Default reform time in ticks (~30 minutes at 20 TPS)
 */
export const DEFAULT_REFORM_TIME = 36000;

// ============================================================================
// Component
// ============================================================================

/**
 * AngelResourceComponent - Tracks an angel's independent resource pool
 */
export class AngelResourceComponent extends ComponentBase {
  public readonly type = 'angel_resource';

  // Mana pool (not player's belief)
  public mana: number;
  public maxMana: number;
  public manaRegenRate: number;

  // Mana sources tracking
  public manaFromPrayers: number;
  public manaFromRituals: number;
  public manaFromWorship: number;
  public recentManaGains: ManaGainSource[];

  // Independence level
  public autonomyLevel: 'dependent' | 'semi_independent' | 'independent';

  // Upgrades purchased with player belief
  public purchasedUpgrades: AngelUpgrade[];
  public totalBeliefSpentOnUpgrades: number;

  // Disruption state
  public disruption?: AngelDisruption;
  public timesDisrupted: number;
  public lastReformedAt?: number;

  // Tick tracking for regen
  public lastRegenTick: number;

  constructor(options: {
    tier?: number;
    maxMana?: number;
    manaRegenRate?: number;
    currentTick?: number;
  } = {}) {
    super();

    const tier = options.tier ?? 1;
    this.maxMana = options.maxMana ?? MANA_POOL_BY_TIER[tier] ?? 100;
    this.mana = this.maxMana;
    this.manaRegenRate = options.manaRegenRate ?? MANA_REGEN_BY_TIER[tier] ?? 5;

    this.manaFromPrayers = 0;
    this.manaFromRituals = 0;
    this.manaFromWorship = 0;
    this.recentManaGains = [];

    this.autonomyLevel = 'semi_independent';

    this.purchasedUpgrades = [];
    this.totalBeliefSpentOnUpgrades = 0;

    this.timesDisrupted = 0;
    this.lastRegenTick = options.currentTick ?? 0;
  }

  /**
   * Spend mana for an action
   */
  spendMana(amount: number): boolean {
    if (amount < 0) {
      throw new Error('Mana amount must be non-negative');
    }

    if (this.mana < amount) {
      return false;
    }

    this.mana -= amount;
    return true;
  }

  /**
   * Gain mana from a source
   */
  gainMana(source: ManaGainSource['source'], amount?: number, currentTick?: number): void {
    const gainAmount = amount ?? MANA_GAIN_AMOUNTS[source];
    this.mana = Math.min(this.maxMana, this.mana + gainAmount);

    // Track by source
    switch (source) {
      case 'prayer':
        this.manaFromPrayers += gainAmount;
        break;
      case 'ritual':
        this.manaFromRituals += gainAmount;
        break;
      case 'worship':
        this.manaFromWorship += gainAmount;
        break;
    }

    // Record recent gain
    if (currentTick !== undefined) {
      this.recentManaGains.push({
        source,
        amount: gainAmount,
        timestamp: currentTick,
      });

      // Keep only last 50 gains
      if (this.recentManaGains.length > 50) {
        this.recentManaGains.shift();
      }
    }
  }

  /**
   * Regenerate mana based on elapsed time
   */
  regenerateMana(currentTick: number): void {
    const ticksElapsed = currentTick - this.lastRegenTick;

    // Regen every 1200 ticks (1 minute at 20 TPS)
    const minutesElapsed = ticksElapsed / 1200;
    if (minutesElapsed >= 1) {
      const regenAmount = this.manaRegenRate * Math.floor(minutesElapsed);
      this.mana = Math.min(this.maxMana, this.mana + regenAmount);
      this.lastRegenTick = currentTick;
    }
  }

  /**
   * Check if angel is disrupted
   */
  isDisrupted(): boolean {
    return this.disruption !== undefined && !this.disruption.permanent;
  }

  /**
   * Check if angel is permanently destroyed
   */
  isPermanentlyDestroyed(): boolean {
    return this.disruption !== undefined && this.disruption.permanent;
  }

  /**
   * Check if angel can reform yet
   */
  canReform(currentTick: number): boolean {
    if (!this.disruption) return false;
    if (this.disruption.permanent) return false;
    return currentTick >= this.disruption.reformAt;
  }

  /**
   * Disrupt the angel (temporary "death")
   */
  disrupt(options: {
    cause: AngelDisruption['cause'];
    currentTick: number;
    permanent?: boolean;
    reformDelay?: number;
  }): void {
    const permanent = options.cause === 'legendary_weapon' || options.permanent;
    const reformDelay = options.reformDelay ?? DEFAULT_REFORM_TIME;

    this.disruption = {
      disruptedAt: options.currentTick,
      reformAt: permanent ? Infinity : options.currentTick + reformDelay,
      cause: options.cause,
      permanent,
    };

    this.timesDisrupted++;
    this.mana = 0;
  }

  /**
   * Reform the angel after disruption
   */
  reform(currentTick: number): boolean {
    if (!this.canReform(currentTick)) {
      return false;
    }

    this.disruption = undefined;
    this.lastReformedAt = currentTick;
    this.mana = Math.floor(this.maxMana * 0.5); // Reform with 50% mana

    return true;
  }

  /**
   * Apply an upgrade
   */
  applyUpgrade(upgrade: AngelUpgrade): void {
    this.purchasedUpgrades.push(upgrade);
    this.totalBeliefSpentOnUpgrades += upgrade.beliefCost;

    // Apply effect
    if (upgrade.effect.type === 'mana_increase' && upgrade.effect.amount) {
      this.maxMana += upgrade.effect.amount;
      this.mana = Math.min(this.mana + upgrade.effect.amount, this.maxMana);
    }
  }

  /**
   * Check if angel has a specific upgrade
   */
  hasUpgrade(upgradeId: string): boolean {
    return this.purchasedUpgrades.some(u => u.id === upgradeId);
  }

  /**
   * Get mana percentage
   */
  getManaPercentage(): number {
    return this.mana / this.maxMana;
  }

  /**
   * Get estimated time until full mana (in ticks)
   */
  getTimeUntilFullMana(): number {
    if (this.mana >= this.maxMana) return 0;
    const manaNeeded = this.maxMana - this.mana;
    const minutesNeeded = manaNeeded / this.manaRegenRate;
    return Math.ceil(minutesNeeded * 1200); // Convert to ticks
  }

  /**
   * Update for new tier
   */
  updateForTier(tier: number): void {
    const newMaxMana = MANA_POOL_BY_TIER[tier] ?? this.maxMana;
    const newRegenRate = MANA_REGEN_BY_TIER[tier] ?? this.manaRegenRate;

    const oldMaxMana = this.maxMana;
    this.maxMana = newMaxMana;
    this.manaRegenRate = newRegenRate;

    // Add the difference to current mana (promotion bonus)
    if (newMaxMana > oldMaxMana) {
      this.mana += (newMaxMana - oldMaxMana);
    }
  }
}

/**
 * Create a new angel resource component
 */
export function createAngelResourceComponent(options?: {
  tier?: number;
  maxMana?: number;
  manaRegenRate?: number;
  currentTick?: number;
}): AngelResourceComponent {
  return new AngelResourceComponent(options);
}

/**
 * Available angel upgrades
 */
export const ANGEL_UPGRADES: Array<{
  id: string;
  name: string;
  description: string;
  beliefCost: number;
  requiresTier: number;
  effect: AngelUpgrade['effect'];
}> = [
  {
    id: 'mana_pool_1',
    name: 'Expanded Mana Pool I',
    description: '+25 max divine energy',
    beliefCost: 100,
    requiresTier: 1,
    effect: { type: 'mana_increase', amount: 25 },
  },
  {
    id: 'mana_pool_2',
    name: 'Expanded Mana Pool II',
    description: '+50 max divine energy',
    beliefCost: 250,
    requiresTier: 2,
    effect: { type: 'mana_increase', amount: 50 },
  },
  {
    id: 'mana_pool_3',
    name: 'Expanded Mana Pool III',
    description: '+100 max divine energy',
    beliefCost: 500,
    requiresTier: 3,
    effect: { type: 'mana_increase', amount: 100 },
  },
  {
    id: 'swift_wings',
    name: 'Swift Wings',
    description: '+20% movement speed',
    beliefCost: 150,
    requiresTier: 1,
    effect: { type: 'stat_boost', stat: 'speed', amount: 0.2 },
  },
  {
    id: 'keen_perception',
    name: 'Keen Perception',
    description: '+30% perception range',
    beliefCost: 200,
    requiresTier: 1,
    effect: { type: 'stat_boost', stat: 'perception', amount: 0.3 },
  },
  {
    id: 'danger_sense',
    name: 'Danger Sense',
    description: 'Can warn agents of incoming threats',
    beliefCost: 300,
    requiresTier: 2,
    effect: { type: 'new_ability', abilityId: 'danger_sense' },
  },
  {
    id: 'mass_blessing',
    name: 'Mass Blessing',
    description: 'Can bless multiple believers at once',
    beliefCost: 500,
    requiresTier: 2,
    effect: { type: 'new_ability', abilityId: 'mass_blessing' },
  },
  {
    id: 'divine_shield',
    name: 'Divine Shield',
    description: 'Can create protective barriers',
    beliefCost: 750,
    requiresTier: 3,
    effect: { type: 'new_ability', abilityId: 'divine_shield' },
  },
  {
    id: 'celestial_radiance',
    name: 'Celestial Radiance',
    description: 'Enhanced glowing appearance',
    beliefCost: 100,
    requiresTier: 1,
    effect: { type: 'cosmetic', spriteModification: 'radiance_aura' },
  },
];

/**
 * Get upgrades available for a tier
 */
export function getAvailableUpgrades(tier: number): typeof ANGEL_UPGRADES {
  return ANGEL_UPGRADES.filter(u => u.requiresTier <= tier);
}

/**
 * Get upgrade by ID
 */
export function getUpgradeById(id: string): typeof ANGEL_UPGRADES[0] | undefined {
  return ANGEL_UPGRADES.find(u => u.id === id);
}
