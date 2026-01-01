/**
 * SpellCastingService - High-level service for casting spells
 *
 * This service orchestrates the entire spell casting process:
 * 1. Validates spell can be cast (resources, range, cooldowns)
 * 2. Deducts costs from caster's resource pools
 * 3. Executes spell effects on targets
 * 4. Handles mishaps and failures
 * 5. Records cast in registries for proficiency gain
 *
 * This is the main API that UI and AI systems should use to cast spells.
 */

import type { Entity } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { MagicComponent } from '../components/MagicComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { SpellDefinition } from './SpellRegistry.js';
import type { EffectApplicationResult } from './SpellEffect.js';
import { SpellRegistry } from './SpellRegistry.js';
import { SpellEffectExecutor } from './SpellEffectExecutor.js';
import { costCalculatorRegistry } from './costs/CostCalculatorRegistry.js';
import { createDefaultContext } from './costs/CostCalculator.js';
import { getCoreParadigm } from './CoreParadigms.js';
import { ComponentType } from '../types/ComponentType.js';

// ============================================================================
// Types
// ============================================================================

/** Result of attempting to cast a spell */
export interface SpellCastResult {
  /** Whether the spell was successfully cast */
  success: boolean;

  /** Spell that was attempted */
  spellId: string;

  /** Caster entity ID */
  casterId: string;

  /** Target entity ID (if applicable) */
  targetId?: string;

  /** Results of all effects applied */
  effectResults: EffectApplicationResult[];

  /** Whether a mishap occurred */
  mishap: boolean;

  /** Mishap consequences if applicable */
  mishapConsequences?: string[];

  /** Resources spent */
  resourcesSpent: Record<string, number>;

  /** Error message if failed to cast */
  error?: string;

  /** Timestamp when cast */
  castAt: number;
}

/** Options for casting a spell */
export interface CastOptions {
  /** Target entity (if spell requires a target) */
  target?: Entity;

  /** Target position (for ground-targeted spells) */
  targetX?: number;
  targetY?: number;

  /** Power multiplier from combos/conditions (default 1.0) */
  powerMultiplier?: number;

  /** Whether to skip cost checks (for dev/testing) */
  skipCostCheck?: boolean;

  /** Whether to skip range checks (for dev/testing) */
  skipRangeCheck?: boolean;

  /** Whether to force success (no mishap rolls, for dev/testing) */
  forceSuccess?: boolean;
}

// ============================================================================
// SpellCastingService
// ============================================================================

export class SpellCastingService {
  private static instance: SpellCastingService | null = null;

  /** Spell registry */
  private registry: SpellRegistry;

  /** Effect executor */
  private executor: SpellEffectExecutor;

  /** Event listeners for cast events */
  private listeners: Set<(result: SpellCastResult) => void> = new Set();

  private constructor() {
    this.registry = SpellRegistry.getInstance();
    this.executor = SpellEffectExecutor.getInstance();
  }

  static getInstance(): SpellCastingService {
    if (!SpellCastingService.instance) {
      SpellCastingService.instance = new SpellCastingService();
    }
    return SpellCastingService.instance;
  }

  static resetInstance(): void {
    SpellCastingService.instance = null;
  }

  // ========== Spell Casting ==========

  /**
   * Cast a spell from an entity.
   */
  castSpell(
    spellId: string,
    caster: Entity,
    world: World,
    tick: number,
    options: CastOptions = {}
  ): SpellCastResult {
    // Get spell definition
    const spell = this.registry.getSpell(spellId);
    if (!spell) {
      return this.createFailureResult(spellId, caster.id, tick, 'Spell not found');
    }

    // Get caster's magic component
    const magic = caster.components.get('magic') as MagicComponent | undefined;
    if (!magic) {
      return this.createFailureResult(spellId, caster.id, tick, 'Caster has no magic component');
    }

    // Check if spell is unlocked
    const state = this.registry.getPlayerState(spellId);
    if (!state?.unlocked) {
      return this.createFailureResult(spellId, caster.id, tick, 'Spell not unlocked');
    }

    // Validate target if required
    const target = this.validateTarget(spell, caster, options, world);
    if (typeof target === 'string') {
      // It's an error message
      return this.createFailureResult(spellId, caster.id, tick, target);
    }

    // Sync faith to magic component for divine casters
    this.syncFaithToMagic(caster, magic);

    // Check resource costs
    if (!options.skipCostCheck) {
      const costCheck = this.checkCosts(spell, magic);
      if (!costCheck.canCast) {
        return this.createFailureResult(spellId, caster.id, tick, costCheck.error!);
      }
    }

    // Roll for mishap
    let mishap = false;
    const mishapConsequences: string[] = [];

    if (!options.forceSuccess) {
      const mishapChance = this.registry.getMishapChance(spellId);
      if (Math.random() < mishapChance) {
        mishap = true;
        mishapConsequences.push('spell_fizzle');

        // Apply paradigm-specific mishap consequences
        this.applyMishapConsequences(spell, caster, magic, mishapConsequences);
      }
    }

    // Deduct costs
    const resourcesSpent: Record<string, number> = {};
    if (!options.skipCostCheck && !mishap) {
      this.deductCosts(spell, magic, resourcesSpent);
    }

    // Execute effects (unless complete fizzle)
    const effectResults: EffectApplicationResult[] = [];
    if (!mishap && typeof target !== 'string') {
      const powerMultiplier = options.powerMultiplier ?? 1.0;
      const result = this.executor.executeEffect(
        spell.effectId,
        caster,
        target,
        spell,
        world,
        tick,
        powerMultiplier
      );
      effectResults.push(result);
    }

    // Record cast for proficiency
    this.registry.recordCast(spellId, tick);

    // Build result
    const result: SpellCastResult = {
      success: !mishap && effectResults.some(r => r.success),
      spellId,
      casterId: caster.id,
      targetId: typeof target !== 'string' ? target.id : undefined,
      effectResults,
      mishap,
      mishapConsequences: mishap ? mishapConsequences : undefined,
      resourcesSpent,
      castAt: tick,
    };

    // Notify listeners
    this.notifyListeners(result);

    return result;
  }

  // ========== Validation ==========

  /**
   * Check if a spell can be cast (without actually casting it).
   */
  canCast(
    spellId: string,
    caster: Entity,
    options: CastOptions = {}
  ): { canCast: boolean; error?: string } {
    const spell = this.registry.getSpell(spellId);
    if (!spell) {
      return { canCast: false, error: 'Spell not found' };
    }

    const magic = caster.components.get('magic') as MagicComponent | undefined;
    if (!magic) {
      return { canCast: false, error: 'No magic component' };
    }

    // Sync faith to magic component for divine casters
    this.syncFaithToMagic(caster, magic);

    const state = this.registry.getPlayerState(spellId);
    if (!state?.unlocked) {
      return { canCast: false, error: 'Spell not unlocked' };
    }

    // Check costs
    if (!options.skipCostCheck) {
      const costCheck = this.checkCosts(spell, magic);
      if (!costCheck.canCast) {
        return costCheck;
      }
    }

    return { canCast: true };
  }

  private validateTarget(
    spell: SpellDefinition,
    caster: Entity,
    options: CastOptions,
    _world: World
  ): Entity | string {
    // Self-targeted spells
    if (spell.range === 0) {
      return caster;
    }

    // Require target for non-self spells
    if (!options.target) {
      return 'Spell requires a target';
    }

    // Check range
    if (!options.skipRangeCheck) {
      const distance = this.calculateDistance(caster, options.target);
      if (distance > spell.range) {
        return `Target out of range (${distance.toFixed(1)} > ${spell.range})`;
      }
    }

    return options.target;
  }

  private calculateDistance(entity1: Entity, entity2: Entity): number {
    const pos1 = entity1.components.get('position') as { x: number; y: number } | undefined;
    const pos2 = entity2.components.get('position') as { x: number; y: number } | undefined;

    if (!pos1 || !pos2) return Infinity;

    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private checkCosts(spell: SpellDefinition, magic: MagicComponent): { canCast: boolean; error?: string } {
    // Get paradigm-specific cost calculator
    if (!costCalculatorRegistry.has(spell.paradigmId)) {
      throw new Error(
        `No cost calculator registered for paradigm '${spell.paradigmId}'. ` +
        `Ensure registerAllCostCalculators() is called during initialization.`
      );
    }

    const calculator = costCalculatorRegistry.get(spell.paradigmId);

    const ctx = createDefaultContext();
    const costs = calculator.calculateCosts(spell, magic, ctx);
    const affordability = calculator.canAfford(costs, magic);

    if (!affordability.canAfford) {
      const missing = affordability.missing.map(m => `${m.type}: ${m.amount}`).join(', ');
      return { canCast: false, error: `Insufficient resources: ${missing}` };
    }

    if (affordability.wouldBeTerminal && affordability.warning) {
      // Allow cast but it will have terminal effects
      // The caller can decide whether to proceed
      return { canCast: true, error: affordability.warning };
    }

    return { canCast: true };
  }

  private deductCosts(spell: SpellDefinition, magic: MagicComponent, resourcesSpent: Record<string, number>): void {
    // Get paradigm-specific cost calculator
    if (!costCalculatorRegistry.has(spell.paradigmId)) {
      throw new Error(
        `No cost calculator registered for paradigm '${spell.paradigmId}'. ` +
        `Ensure registerAllCostCalculators() is called during initialization.`
      );
    }

    const calculator = costCalculatorRegistry.get(spell.paradigmId);

    // Get paradigm definition
    const paradigm = getCoreParadigm(spell.paradigmId);
    if (!paradigm) {
      throw new Error(
        `Paradigm '${spell.paradigmId}' not found in core paradigms. ` +
        `Valid paradigms: academic, pact, names, breath, divine, blood, emotional`
      );
    }

    // Calculate and deduct costs
    const ctx = createDefaultContext();
    const costs = calculator.calculateCosts(spell, magic, ctx);
    const result = calculator.deductCosts(costs, magic, paradigm);

    if (!result.success) {
      throw new Error(
        `Failed to deduct costs for spell '${spell.id}'. This should not happen after affordability check.`
      );
    }

    // Track resources spent for each cost type
    for (const cost of result.deducted) {
      const costType = cost.type as string;
      resourcesSpent[costType] = (resourcesSpent[costType] || 0) + cost.amount;
    }

    // Handle terminal effects if they occurred
    if (result.terminal && result.terminalEffect) {
      // Terminal effects should be handled by the caller
      // For now, we just track that they occurred
      resourcesSpent['_terminal'] = 1; // Just mark that terminal occurred
    }
  }

  private applyMishapConsequences(
    spell: SpellDefinition,
    caster: Entity,
    magic: MagicComponent,
    consequences: string[]
  ): void {
    // Get paradigm to determine mishap type
    const paradigmId = spell.paradigmId || magic.homeParadigmId || 'academic';

    // Apply paradigm-specific consequences
    switch (paradigmId) {
      case 'academic':
      case 'arcane':
        // Mana backlash - drain extra mana
        if (magic.manaPools.length > 0) {
          const pool = magic.manaPools[0];
          if (pool) {
            const backlash = pool.maximum * 0.1; // 10% mana loss
            pool.current = Math.max(0, pool.current - backlash);
            consequences.push(`mana_backlash:${backlash.toFixed(0)}`);
          }
        }
        break;

      case 'divine':
        // Loss of favor
        if (magic.favorLevel !== undefined) {
          magic.favorLevel = Math.max(-100, magic.favorLevel - 10);
          consequences.push('divine_disfavor:-10');
        }
        break;

      case 'blood':
      case 'void':
        // Corruption increase and health drain
        if (magic.corruption !== undefined) {
          magic.corruption = Math.min(100, magic.corruption + 5);
          consequences.push('corruption_increase:+5');
        }
        const needs = caster.components.get('needs') as any;
        if (needs) {
          needs.health = Math.max(0, needs.health - 0.1);
          consequences.push('health_drain:-0.1');
        }
        break;

      case 'breath':
        // Breath loss
        if (magic.paradigmState.breath?.breathCount) {
          const breathLoss = Math.floor(magic.paradigmState.breath.breathCount * 0.05); // 5% loss
          magic.paradigmState.breath.breathCount -= breathLoss;
          consequences.push(`breath_loss:-${breathLoss}`);
        }
        break;

      case 'pact':
        // Increased service owed to patron
        if (magic.paradigmState.pact?.serviceOwed !== undefined) {
          magic.paradigmState.pact.serviceOwed += 1;
          consequences.push('service_owed:+1');
        }
        break;

      case 'emotional':
        // Emotional instability
        if (magic.paradigmState.emotional?.emotionalStability !== undefined) {
          magic.paradigmState.emotional.emotionalStability = Math.max(
            0,
            magic.paradigmState.emotional.emotionalStability - 10
          );
          consequences.push('emotional_instability:-10');
        }
        break;

      default:
        // Generic mishap - small mana/resource drain
        if (magic.manaPools.length > 0) {
          const pool = magic.manaPools[0];
          if (pool) {
            pool.current = Math.max(0, pool.current - 5);
            consequences.push('generic_backlash:-5');
          }
        }
        break;
    }

    // Track total mishaps
    magic.totalMishaps = (magic.totalMishaps || 0) + 1;
  }

  // ========== Helper Methods ==========

  /**
   * Synchronize faith from SpiritualComponent to MagicComponent's divine paradigm state.
   * This ensures divine magic costs are properly affected by the caster's faith level.
   */
  private syncFaithToMagic(caster: Entity, magic: MagicComponent): void {
    // Only sync for divine magic users
    if (magic.homeParadigmId !== 'divine' && !magic.paradigmState?.divine) {
      return;
    }

    // Get spiritual component
    const spiritual = caster.components.get(ComponentType.Spiritual) as SpiritualComponent | undefined;
    if (!spiritual) {
      return;
    }

    // Sync faith level to divine paradigm state
    if (!magic.paradigmState.divine) {
      magic.paradigmState.divine = {
        deityId: spiritual.believedDeity,
        deityStanding: 'neutral',
        custom: {
          prayerStreak: 0,
          miraclesWitnessed: 0,
          sacrificesMade: 0,
        },
      };
    }

    // Update deity standing based on faith level
    const faith = spiritual.faith;
    let standing: 'favored' | 'neutral' | 'disfavored' | 'forsaken' = 'neutral';
    if (faith >= 0.8) {
      standing = 'favored';
    } else if (faith >= 0.5) {
      standing = 'neutral';
    } else if (faith >= 0.2) {
      standing = 'disfavored';
    } else {
      standing = 'forsaken';
    }
    magic.paradigmState.divine.deityStanding = standing;
    magic.paradigmState.divine.deityId = spiritual.believedDeity;

    // Also sync to favorLevel for backwards compatibility
    // Convert faith (0-1) to favorLevel (-100 to 100)
    magic.favorLevel = Math.round((faith - 0.5) * 200);
  }

  private createFailureResult(
    spellId: string,
    casterId: string,
    tick: number,
    error: string
  ): SpellCastResult {
    return {
      success: false,
      spellId,
      casterId,
      effectResults: [],
      mishap: false,
      resourcesSpent: {},
      error,
      castAt: tick,
    };
  }

  // ========== Event Handling ==========

  addCastListener(listener: (result: SpellCastResult) => void): void {
    this.listeners.add(listener);
  }

  removeCastListener(listener: (result: SpellCastResult) => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(result: SpellCastResult): void {
    for (const listener of this.listeners) {
      listener(result);
    }
  }

  // ========== Dev/Testing Utilities ==========

  /**
   * Cast a spell with all checks disabled (for testing).
   */
  devCast(
    spellId: string,
    caster: Entity,
    target: Entity,
    world: World,
    tick: number
  ): SpellCastResult {
    return this.castSpell(spellId, caster, world, tick, {
      target,
      skipCostCheck: true,
      skipRangeCheck: true,
      forceSuccess: true,
    });
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function getCastingService(): SpellCastingService {
  return SpellCastingService.getInstance();
}

export function castSpell(
  spellId: string,
  caster: Entity,
  world: World,
  tick: number,
  options?: CastOptions
): SpellCastResult {
  return SpellCastingService.getInstance().castSpell(spellId, caster, world, tick, options);
}

export function canCastSpellById(
  spellId: string,
  caster: Entity,
  options?: CastOptions
): { canCast: boolean; error?: string } {
  return SpellCastingService.getInstance().canCast(spellId, caster, options);
}
