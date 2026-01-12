/**
 * CostCalculator - Interface and types for paradigm-specific cost calculation
 *
 * Each magic paradigm has unique costs that reflect its nature. This module
 * defines the interface that all paradigm cost calculators must implement.
 */

import type { MagicCostType, MagicCost, MagicParadigm } from '../MagicParadigm.js';
import type { ComposedSpell, MagicComponent, ResourcePool } from '../../components/MagicComponent.js';
import type { BodyComponent } from '../../components/BodyComponent.js';
import type { SpiritualComponent } from '../../components/SpiritualComponent.js';

// ============================================================================
// Context for Cost Calculation
// ============================================================================

/**
 * Context information available when calculating spell costs.
 */
export interface CastingContext {
  /** Current game tick */
  tick: number;

  /** Time of day (0-1, where 0.5 is noon) */
  timeOfDay: number;

  /** Nearby ley lines or power sources (0-1 multiplier) */
  ambientPower: number;

  /** Is this a group casting? */
  isGroupCast: boolean;

  /** Number of casters if group */
  casterCount: number;

  /** Target entity ID (if any) */
  targetId?: string;

  /** Current weather conditions */
  weather?: string;

  /** Current moon phase (0-1, where 0.5 is full moon) */
  moonPhase?: number;

  /** Current season */
  season?: 'spring' | 'summer' | 'autumn' | 'winter';

  /** Caster's entity ID (for tracking) */
  casterId?: string;

  /** Caster's body component (for physical cost effects like blood loss) */
  bodyComponent?: BodyComponent;

  /** Caster's spiritual component (for faith-based magic) */
  spiritualComponent?: SpiritualComponent;

  /** Paradigm-specific custom context data */
  custom?: Record<string, unknown>;
}

/**
 * Create a default casting context.
 */
export function createDefaultContext(tick: number = 0): CastingContext {
  return {
    tick,
    timeOfDay: 0.5,
    ambientPower: 0,
    isGroupCast: false,
    casterCount: 1,
  };
}

// ============================================================================
// Cost Calculation Results
// ============================================================================

/**
 * A calculated spell cost ready to be deducted.
 */
export interface SpellCost {
  /** The type of cost */
  type: MagicCostType;

  /** Amount to deduct (or add for cumulative costs) */
  amount: number;

  /** Why this cost exists */
  source: string;

  /** Is this cost terminal if it exceeds available resources? */
  terminal?: boolean;
}

/**
 * Result of checking if a caster can afford spell costs.
 */
export interface AffordabilityResult {
  /** Whether the caster can afford all costs */
  canAfford: boolean;

  /** Costs that cannot be paid */
  missing: SpellCost[];

  /** Would casting this kill/permanently harm the caster? */
  wouldBeTerminal: boolean;

  /** Warning message if near-terminal or risky */
  warning?: string;
}

/**
 * Terminal effect types when costs exceed thresholds.
 */
export type TerminalEffect =
  | { type: 'death'; cause: string }
  | { type: 'corruption_threshold'; newForm: string; corruptionLevel: number }
  | { type: 'soul_lost'; fragmentsRemaining: number }
  | { type: 'favor_zero'; patronAction: string }
  | { type: 'sanity_zero'; madnessType: string }
  | { type: 'drab'; breathsRemaining: 0 }
  | { type: 'forsaken'; deityId: string }
  | { type: 'emotional_burnout'; dominantEmotion: string }
  | { type: 'mutation'; mutationType: string }
  // Shinto/Animist terminal effects
  | { type: 'purity_zero'; pollution: string; effectDescription?: string }
  | { type: 'respect_zero'; offendedKami: string; effectDescription?: string }
  // Dream magic terminal effects
  | { type: 'lucidity_zero'; trappedInDream: boolean; effectDescription?: string }
  | { type: 'fatigue_max'; comatose: boolean }
  | { type: 'exhaustion'; cause: string }
  | { type: 'madness'; madnessType: string }
  // Song/Bardic terminal effects
  | { type: 'voice_zero'; silenced: boolean; effectDescription?: string }
  // Rune magic terminal effects
  | { type: 'runic_zero'; runesDepleted: boolean }
  | { type: 'runic_exhaustion'; cause: string }
  | { type: 'material_shortage'; materialType: string }
  // Sympathy terminal effects
  | { type: 'alar_zero'; bindingsLost: boolean }
  | { type: 'slippage_max'; burnedOut: boolean }
  | { type: 'alar_break'; cause: string }
  | { type: 'slippage_burn'; severity: string }
  // Allomancy terminal effects
  | { type: 'metal_depleted'; metalType: string; effectDescription?: string }
  | { type: 'atium_gone'; visionLost: boolean }
  | { type: 'pewter_collapse'; cause: string }
  // Daemon terminal effects
  | { type: 'bond_severed'; daemonLost: boolean; effectDescription?: string }
  | { type: 'dust_depleted'; connectionLost: boolean; effectDescription?: string };

/**
 * Result of deducting costs from a caster.
 */
export interface DeductionResult {
  /** Whether the deduction succeeded */
  success: boolean;

  /** Costs actually deducted */
  deducted: SpellCost[];

  /** Did this cause terminal effects? */
  terminal: boolean;

  /** Terminal effect description (if terminal) */
  terminalEffect?: TerminalEffect;
}

// ============================================================================
// Cost Calculator Interface
// ============================================================================

/**
 * Interface for paradigm-specific cost calculators.
 *
 * Each paradigm implements this interface to define how costs are calculated,
 * checked for affordability, and deducted.
 */
export interface ParadigmCostCalculator {
  /** The paradigm ID this calculator handles */
  readonly paradigmId: string;

  /**
   * Calculate all costs for casting a spell.
   *
   * @param spell The spell being cast
   * @param caster The caster's MagicComponent
   * @param context Additional context (environment, time, etc.)
   * @returns Array of costs to be deducted
   */
  calculateCosts(
    spell: ComposedSpell,
    _caster: MagicComponent,
    _context: CastingContext
  ): SpellCost[];

  /**
   * Check if the caster can afford all costs.
   *
   * @param costs The calculated costs
   * @param caster The caster's MagicComponent
   * @returns Affordability result with any missing costs
   */
  canAfford(
    costs: SpellCost[],
    _caster: MagicComponent
  ): AffordabilityResult;

  /**
   * Deduct costs from the caster's resource pools.
   *
   * @param costs The costs to deduct
   * @param caster The caster's MagicComponent (will be mutated)
   * @param paradigm The paradigm for looking up cost definitions
   * @returns Result of deduction including any terminal effects
   */
  deductCosts(
    costs: SpellCost[],
    _caster: MagicComponent,
    paradigm: MagicParadigm
  ): DeductionResult;

  /**
   * Lock resources for a multi-tick spell cast.
   * Locked resources are deducted but can be restored if cast is interrupted.
   *
   * @param costs The costs to lock
   * @param caster The caster's MagicComponent (will be mutated)
   * @returns Result of locking including any errors
   */
  lockCosts?(
    costs: SpellCost[],
    _caster: MagicComponent
  ): DeductionResult;

  /**
   * Restore locked resources after a failed/cancelled cast.
   *
   * @param costs The costs to restore
   * @param caster The caster's MagicComponent (will be mutated)
   */
  restoreLockedCosts?(
    costs: SpellCost[],
    _caster: MagicComponent
  ): void;

  /**
   * Initialize resource pools when a caster joins this paradigm.
   *
   * @param caster The caster's MagicComponent (will be mutated)
   * @param options Optional configuration for initial values
   */
  initializeResourcePools(
    _caster: MagicComponent,
    options?: ResourceInitOptions
  ): void;
}

/**
 * Options for initializing resource pools.
 */
export interface ResourceInitOptions {
  /** Override default maximum values */
  maxOverrides?: Partial<Record<MagicCostType, number>>;

  /** Override default current values */
  currentOverrides?: Partial<Record<MagicCostType, number>>;

  /** Override default regen rates */
  regenOverrides?: Partial<Record<MagicCostType, number>>;
}

// ============================================================================
// Base Cost Calculator
// ============================================================================

/**
 * Base class providing common cost calculation logic.
 * Paradigm-specific calculators should extend this.
 */
export abstract class BaseCostCalculator implements ParadigmCostCalculator {
  abstract readonly paradigmId: string;

  abstract calculateCosts(
    spell: ComposedSpell,
    _caster: MagicComponent,
    _context: CastingContext
  ): SpellCost[];

  abstract initializeResourcePools(
    _caster: MagicComponent,
    options?: ResourceInitOptions
  ): void;

  /**
   * Default affordability check - can be overridden for special cases.
   */
  canAfford(costs: SpellCost[], caster: MagicComponent): AffordabilityResult {
    const missing: SpellCost[] = [];
    let wouldBeTerminal = false;
    let warning: string | undefined;

    for (const cost of costs) {
      const pool = caster.resourcePools[cost.type];

      if (!pool) {
        // Check if it's in manaPools instead (for legacy support)
        const manaPool = caster.manaPools.find(
          p => p.source === cost.type || (cost.type === 'mana' && p.source === caster.primarySource)
        );

        if (!manaPool) {
          // No pool exists - might be a cumulative cost like corruption that's okay to not have
          continue;
        }

        const available = manaPool.current - manaPool.locked;
        if (available < cost.amount) {
          missing.push({
            type: cost.type,
            amount: cost.amount - available,
            source: `insufficient_${cost.type}`,
          });
        }
        continue;
      }

      // For cumulative costs (corruption, attention), check if adding would exceed max
      if (this.isCumulativeCost(cost.type)) {
        const afterAdd = pool.current + cost.amount;
        if (afterAdd >= pool.maximum) {
          wouldBeTerminal = true;
          warning = `${cost.type} would reach terminal threshold`;
        }
      } else {
        // For regular costs, check if we have enough
        const available = pool.current - pool.locked;
        if (available < cost.amount) {
          missing.push({
            type: cost.type,
            amount: cost.amount - available,
            source: `insufficient_${cost.type}`,
          });

          // Check if zero would be terminal
          if (pool.current - cost.amount <= 0 && cost.terminal) {
            wouldBeTerminal = true;
            warning = `${cost.type} would reach zero (terminal)`;
          }
        }
      }
    }

    return {
      canAfford: missing.length === 0,
      missing,
      wouldBeTerminal,
      warning,
    };
  }

  /**
   * Default cost deduction - can be overridden for special cases.
   */
  deductCosts(
    costs: SpellCost[],
    caster: MagicComponent,
    paradigm?: MagicParadigm
  ): DeductionResult {
    const deducted: SpellCost[] = [];

    for (const cost of costs) {
      let pool = caster.resourcePools[cost.type];

      // Try manaPools for mana costs
      if (!pool && cost.type === 'mana' && caster.manaPools) {
        const manaPool = caster.manaPools.find(
          p => p.source === caster.primarySource || p.source === 'arcane'
        );
        if (manaPool) {
          manaPool.current = Math.max(0, manaPool.current - cost.amount);
          deducted.push(cost);
          continue;
        }
      }

      if (!pool) {
        // Create pool if it doesn't exist (for cumulative costs)
        if (this.isCumulativeCost(cost.type)) {
          pool = this.createDefaultPool(cost.type);
          caster.resourcePools[cost.type] = pool;
        } else {
          // Can't deduct from non-existent pool
          continue;
        }
      }

      // Get cost definition from paradigm (if provided)
      const costDef = paradigm?.costs?.find(c => c.type === cost.type);

      // Apply the cost
      if (costDef?.cumulative || this.isCumulativeCost(cost.type)) {
        // Cumulative costs ADD to the pool (corruption, attention, etc.)
        pool.current = Math.min(pool.maximum, pool.current + cost.amount);
      } else {
        // Normal costs SUBTRACT from the pool
        pool.current = Math.max(0, pool.current - cost.amount);
      }

      deducted.push(cost);

      // Check for terminal effects
      const terminalEffect = this.checkTerminal(cost.type, pool, costDef, caster);
      if (terminalEffect) {
        return { success: true, deducted, terminal: true, terminalEffect };
      }
    }

    return { success: true, deducted, terminal: false };
  }

  /**
   * Check if a cost type is cumulative (adds rather than subtracts).
   */
  protected isCumulativeCost(costType: MagicCostType): boolean {
    return ['corruption', 'attention', 'karma'].includes(costType);
  }

  /**
   * Create a default pool for a cost type.
   */
  protected createDefaultPool(costType: MagicCostType): ResourcePool {
    return {
      type: costType,
      current: 0,
      maximum: 100,
      regenRate: 0,
      locked: 0,
    };
  }

  /**
   * Check for terminal effects after cost deduction.
   */
  protected checkTerminal(
    costType: MagicCostType,
    pool: ResourcePool,
    costDef: MagicCost | undefined,
    caster: MagicComponent
  ): TerminalEffect | undefined {
    // If costDef exists and explicitly says not terminal, respect that
    if (costDef && !costDef.canBeTerminal) return undefined;

    // Check if this is a cumulative cost type
    const isCumulative = costDef?.cumulative ?? this.isCumulativeCost(costType);

    // For cumulative costs, terminal at maximum
    if (isCumulative && pool.current >= pool.maximum) {
      return this.getTerminalEffect(costType, 'max', caster);
    }

    // For regular costs, terminal at zero
    if (!isCumulative && pool.current <= 0) {
      return this.getTerminalEffect(costType, 'zero', caster);
    }

    return undefined;
  }

  /**
   * Get the terminal effect for a cost type.
   * Override this for paradigm-specific terminal effects.
   */
  protected getTerminalEffect(
    costType: MagicCostType,
    _trigger: 'zero' | 'max',
    caster: MagicComponent
  ): TerminalEffect {
    switch (costType) {
      case 'health':
      case 'blood':
        return { type: 'death', cause: `Died from ${costType} loss` };
      case 'corruption':
        return { type: 'corruption_threshold', newForm: 'twisted_creature', corruptionLevel: 100 };
      case 'soul_fragment':
        return { type: 'soul_lost', fragmentsRemaining: 0 };
      case 'favor':
        return { type: 'favor_zero', patronAction: 'powers_revoked' };
      case 'sanity':
        return {
          type: 'sanity_zero',
          madnessType: caster.paradigmState?.emotional?.dominantEmotion ?? 'madness',
        };
      default:
        return { type: 'death', cause: `Terminal ${costType} effect` };
    }
  }

  /**
   * Helper to create a resource pool with defaults.
   */
  protected createPool(
    type: MagicCostType,
    maximum: number,
    regenRate: number = 0,
    startFull: boolean = true
  ): ResourcePool {
    return {
      type,
      current: startFull ? maximum : 0,
      maximum,
      regenRate,
      locked: 0,
    };
  }

  /**
   * Lock resources for a multi-tick spell cast.
   * Default implementation: deduct from current, add to locked.
   */
  lockCosts(costs: SpellCost[], caster: MagicComponent): DeductionResult {
    const deducted: SpellCost[] = [];

    for (const cost of costs) {
      let pool = caster.resourcePools[cost.type];

      // For mana costs, also check manaPools (legacy/dual support)
      if (cost.type === 'mana') {
        // If we have a resourcePool for mana, use it AND sync to manaPools
        if (pool) {
          const available = pool.current - pool.locked;
          console.log('[DEBUG lockCosts] resourcePools.mana - available:', available, 'needed:', cost.amount);
          if (available < cost.amount) {
            console.log('[DEBUG lockCosts] Insufficient mana in resourcePools.mana');
            return {
              success: false,
              deducted,
              terminal: false,
            };
          }
          pool.current -= cost.amount;
          pool.locked += cost.amount;

          // ALSO lock in manaPools if it exists (for dual compatibility)
          if (caster.manaPools && caster.manaPools.length > 0) {
            const manaPool = caster.manaPools.find(
              p => p.source === caster.primarySource || p.source === 'arcane'
            );
            if (manaPool) {
              manaPool.current -= cost.amount;
              manaPool.locked += cost.amount;
            }
          }

          deducted.push(cost);
          continue;
        }

        // If no resourcePool.mana, try manaPools
        if (caster.manaPools) {
          const manaPool = caster.manaPools.find(
            p => p.source === caster.primarySource || p.source === 'arcane'
          );
          if (manaPool) {
            const available = manaPool.current - manaPool.locked;
            if (available < cost.amount) {
              return {
                success: false,
                deducted,
                terminal: false,
              };
            }
            manaPool.current -= cost.amount;
            manaPool.locked += cost.amount;
            deducted.push(cost);
            continue;
          }
        }
      }

      if (!pool) {
        // Can't lock from non-existent pool
        return {
          success: false,
          deducted,
          terminal: false,
        };
      }

      // Check if we have enough available (not already locked)
      const available = pool.current - pool.locked;
      if (available < cost.amount) {
        return {
          success: false,
          deducted,
          terminal: false,
        };
      }

      // Deduct from current and add to locked
      pool.current -= cost.amount;
      pool.locked += cost.amount;
      deducted.push(cost);
    }

    return { success: true, deducted, terminal: false };
  }

  /**
   * Restore locked resources after a failed/cancelled cast.
   * Default implementation: restore current, reduce locked.
   */
  restoreLockedCosts(costs: SpellCost[], caster: MagicComponent): void {
    for (const cost of costs) {
      let pool = caster.resourcePools[cost.type];

      // For mana costs, restore in both resourcePools and manaPools (dual sync)
      if (cost.type === 'mana') {
        // Restore in resourcePool.mana if it exists
        if (pool) {
          pool.current += cost.amount;
          pool.locked = Math.max(0, pool.locked - cost.amount);
        }

        // ALSO restore in manaPools if it exists
        if (caster.manaPools) {
          const manaPool = caster.manaPools.find(
            p => p.source === caster.primarySource || p.source === 'arcane'
          );
          if (manaPool) {
            manaPool.current += cost.amount;
            manaPool.locked = Math.max(0, manaPool.locked - cost.amount);
          }
        }

        continue;
      }

      if (!pool) continue;

      // Restore current and reduce locked
      pool.current += cost.amount;
      pool.locked = Math.max(0, pool.locked - cost.amount);
    }
  }
}
