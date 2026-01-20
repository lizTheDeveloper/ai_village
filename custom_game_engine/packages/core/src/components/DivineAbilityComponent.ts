import { ComponentBase } from '../ecs/Component.js';
import type {
  DivinePower,
  DivinePowerType,
  PowerUseResult,
  ActiveBlessing,
  ActiveCurse,
} from '../divinity/DivinePowerTypes.js';

/**
 * DivineAbilityComponent - Tracks available divine powers, active effects, and usage
 *
 * Phase 27: Divinity System - Divine Power Execution
 *
 * Attached to deity entities to track:
 * - Available divine powers based on tier/domain
 * - Currently active powers (blessings, curses, manifestations)
 * - Power usage statistics and cooldowns
 * - Divine energy pool for sustained effects
 *
 * Related:
 * - DeityComponent: Identity and belief economy
 * - PossessionSystem.ts:124: Checks this component for ability usage during possession
 * - DivinePowerSystem: Executes powers and updates this component
 *
 * Integration:
 * - Player possession: isUsingAbility flag set when player uses divine power
 * - DevPanel divine controls: Read this component to show available powers
 * - Belief cost: Powers deduct from DeityComponent.belief.currentBelief
 */
export class DivineAbilityComponent extends ComponentBase {
  public readonly type = 'divine_ability';

  /**
   * Available divine powers for this deity
   * Determined by:
   * - Belief tier (dormant/minor/moderate/major/supreme/world_shaping)
   * - Divine domain(s) (some powers cost less in-domain)
   * - Unlocked through deity progression
   */
  public abilities: DivinePower[];

  /**
   * Currently active power IDs
   * Powers that have ongoing effects (blessings, curses, manifestations)
   * Format: `${powerType}_${targetId}_${timestamp}`
   */
  public activePowers: string[];

  /**
   * Total number of powers used (lifetime statistic)
   * Tracks deity activity level
   */
  public totalPowersUsed: number;

  /**
   * Divine energy pool
   * Used for:
   * - Sustained effects (blessings, avatar manifestation)
   * - Maintenance costs for permanent enchantments
   * - Regenerates from belief income
   *
   * Separate from belief reserves to prevent draining core belief on
   * sustained effects
   */
  public divineEnergyPool: number;

  /**
   * Maximum divine energy capacity
   * Scales with belief tier and total belief earned
   */
  public maxDivineEnergy: number;

  /**
   * Energy regeneration rate per tick
   * Based on current belief income
   */
  public energyRegenRate: number;

  /**
   * Active blessings cast by this deity
   * Map: blessing ID -> blessing data
   */
  public activeBlessings: Map<string, ActiveBlessing>;

  /**
   * Active curses cast by this deity
   * Map: curse ID -> curse data
   */
  public activeCurses: Map<string, ActiveCurse>;

  /**
   * Power usage history
   * Recent power uses for cooldown tracking and statistics
   * Format: { powerType, timestamp, cost, target, result }
   */
  public recentPowerUses: Array<{
    powerType: DivinePowerType;
    timestamp: number;
    beliefCost: number;
    targetId: string;
    result: 'success' | 'failure';
    failureReason?: string;
  }>;

  /**
   * Cooldowns for specific powers
   * Map: powerType -> tick when available again
   */
  public powerCooldowns: Map<DivinePowerType, number>;

  /**
   * Last tick when any power was used
   * Used for activity tracking
   */
  public lastPowerUseTick: number;

  /**
   * Power specialization bonuses
   * Powers used frequently get cost reduction
   * Map: powerType -> specialization level (0-1)
   */
  public powerSpecialization: Map<DivinePowerType, number>;

  constructor(
    abilities: DivinePower[] = [],
    maxDivineEnergy: number = 100
  ) {
    super();

    this.abilities = abilities;
    this.activePowers = [];
    this.totalPowersUsed = 0;
    this.divineEnergyPool = maxDivineEnergy;
    this.maxDivineEnergy = maxDivineEnergy;
    this.energyRegenRate = 0.1; // Base regen
    this.activeBlessings = new Map();
    this.activeCurses = new Map();
    this.recentPowerUses = [];
    this.powerCooldowns = new Map();
    this.lastPowerUseTick = 0;
    this.powerSpecialization = new Map();
  }

  /**
   * Check if a power is available (not on cooldown)
   */
  isPowerAvailable(powerType: DivinePowerType, currentTick: number): boolean {
    const cooldownUntil = this.powerCooldowns.get(powerType);
    if (cooldownUntil === undefined) {
      return true;
    }
    return currentTick >= cooldownUntil;
  }

  /**
   * Record a power use
   */
  recordPowerUse(
    powerType: DivinePowerType,
    currentTick: number,
    beliefCost: number,
    targetId: string,
    result: PowerUseResult
  ): void {
    this.totalPowersUsed++;
    this.lastPowerUseTick = currentTick;

    // Record in history (keep last 100)
    this.recentPowerUses.push({
      powerType,
      timestamp: currentTick,
      beliefCost,
      targetId,
      result: result.success ? 'success' : 'failure',
      failureReason: result.failureReason,
    });

    if (this.recentPowerUses.length > 100) {
      this.recentPowerUses.shift();
    }

    // Update cooldown
    if (result.success && result.cooldownUntil > currentTick) {
      this.powerCooldowns.set(powerType, result.cooldownUntil);
    }

    // Update specialization (successful uses increase specialization)
    if (result.success) {
      const current = this.powerSpecialization.get(powerType) || 0;
      this.powerSpecialization.set(
        powerType,
        Math.min(1.0, current + 0.01) // +1% per use, caps at 100%
      );
    }
  }

  /**
   * Get specialization bonus for a power (0-1, reduces cost)
   */
  getSpecializationBonus(powerType: DivinePowerType): number {
    return this.powerSpecialization.get(powerType) || 0;
  }

  /**
   * Add an active power ID (for ongoing effects)
   */
  addActivePower(powerId: string): void {
    if (!this.activePowers.includes(powerId)) {
      this.activePowers.push(powerId);
    }
  }

  /**
   * Remove an active power ID (when effect ends)
   */
  removeActivePower(powerId: string): void {
    const index = this.activePowers.indexOf(powerId);
    if (index !== -1) {
      this.activePowers.splice(index, 1);
    }
  }

  /**
   * Regenerate divine energy
   */
  regenerateEnergy(amount: number): void {
    this.divineEnergyPool = Math.min(
      this.maxDivineEnergy,
      this.divineEnergyPool + amount
    );
  }

  /**
   * Spend divine energy (for sustained effects)
   * Returns true if successful, false if insufficient energy
   */
  spendEnergy(amount: number): boolean {
    if (this.divineEnergyPool < amount) {
      return false;
    }

    this.divineEnergyPool -= amount;
    return true;
  }

  /**
   * Add a blessing to active blessings
   */
  addBlessing(blessing: ActiveBlessing): void {
    this.activeBlessings.set(blessing.id, blessing);
  }

  /**
   * Remove a blessing
   */
  removeBlessing(blessingId: string): void {
    this.activeBlessings.delete(blessingId);
  }

  /**
   * Add a curse to active curses
   */
  addCurse(curse: ActiveCurse): void {
    this.activeCurses.set(curse.id, curse);
  }

  /**
   * Remove a curse
   */
  removeCurse(curseId: string): void {
    this.activeCurses.delete(curseId);
  }

  /**
   * Get total maintenance cost per tick for all active effects
   */
  getTotalMaintenanceCost(): number {
    let total = 0;

    for (const blessing of this.activeBlessings.values()) {
      total += blessing.maintenanceCost;
    }

    for (const curse of this.activeCurses.values()) {
      total += curse.maintenanceCost;
    }

    return total;
  }

  /**
   * Get count of active effects
   */
  getActiveEffectCount(): number {
    return this.activeBlessings.size + this.activeCurses.size + this.activePowers.length;
  }
}

/**
 * Factory function to create a DivineAbilityComponent
 */
export function createDivineAbilityComponent(
  abilities: DivinePower[] = [],
  maxDivineEnergy: number = 100
): DivineAbilityComponent {
  return new DivineAbilityComponent(abilities, maxDivineEnergy);
}
