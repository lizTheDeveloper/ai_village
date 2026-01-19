/**
 * SpellValidator - Validates spell casting preconditions
 *
 * Handles:
 * - Cooldown checking
 * - Skill tree requirements
 * - Cost affordability
 * - Target validation
 * - Spell knowledge verification
 *
 * Extracted from MagicSystem and SpellCastingManager to centralize validation logic.
 */

import type { World } from '../../ecs/World.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import type { MagicComponent, ComposedSpell } from '../../components/MagicComponent.js';
import { canCastSpell } from '../../components/MagicComponent.js';
import type { SpiritualComponent } from '../../components/SpiritualComponent.js';
import type { BodyComponent } from '../../components/BodyComponent.js';
import { SpellRegistry, type SpellDefinition } from '../SpellRegistry.js';
import { costCalculatorRegistry } from '../costs/CostCalculatorRegistry.js';
import { createDefaultContext, type CastingContext } from '../costs/CostCalculator.js';

/**
 * Validation result with detailed failure reasons.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  details?: {
    spellUnknown?: boolean;
    onCooldown?: boolean;
    skillTreeRequirements?: boolean;
    insufficientResources?: boolean;
    targetInvalid?: boolean;
    wouldBeTerminal?: boolean;
    terminalWarning?: string;
  };
}

/**
 * Affordability result from cost calculator.
 */
export interface AffordabilityResult {
  canAfford: boolean;
  wouldBeTerminal: boolean;
  warning?: string;
}

/**
 * Validates spell casting preconditions.
 *
 * This service centralizes all validation logic to prevent duplication
 * and ensure consistent spell casting rules across the system.
 */
export class SpellValidator {
  // Cooldown tracking: entityId -> { spellId -> tickWhenAvailable }
  private cooldowns: Map<string, Map<string, number>> = new Map();

  // Reference to SkillTreeManager (injected)
  private checkSkillTreeRequirementsCallback: ((entity: EntityImpl, spell: SpellDefinition) => boolean) | null = null;

  /**
   * Initialize with skill tree requirement checker.
   * Called by MagicSystem during initialization.
   */
  initialize(checkSkillTreeRequirements: (entity: EntityImpl, spell: SpellDefinition) => boolean): void {
    this.checkSkillTreeRequirementsCallback = checkSkillTreeRequirements;
  }

  // =========================================================================
  // Main Validation Entry Point
  // =========================================================================

  /**
   * Validate if a spell can be cast.
   * Checks all preconditions: knowledge, cooldowns, skill requirements, affordability, target validity.
   *
   * @param caster The entity attempting to cast
   * @param spellId The spell to cast
   * @param world The game world
   * @param targetEntityId Optional target entity ID
   * @returns Validation result with detailed failure reasons
   */
  validateSpellCastable(
    caster: EntityImpl,
    spellId: string,
    world: World,
    targetEntityId?: string
  ): ValidationResult {
    const magic = caster.getComponent<MagicComponent>(CT.Magic);
    if (!magic) {
      return {
        valid: false,
        reason: 'Caster has no magic component',
      };
    }

    // Find the spell in SpellRegistry
    const spellRegistry = SpellRegistry.getInstance();
    const spell = spellRegistry.getSpell(spellId);
    if (!spell) {
      return {
        valid: false,
        reason: `Spell not found in registry: ${spellId}`,
        details: { spellUnknown: true },
      };
    }

    // Check if entity knows the spell
    if (!this.knowsSpell(magic, spellId)) {
      return {
        valid: false,
        reason: `Spell not known: ${spellId}`,
        details: { spellUnknown: true },
      };
    }

    // Check cooldown
    if (this.checkCooldown(caster.id, spellId, world.tick)) {
      return {
        valid: false,
        reason: 'Spell on cooldown',
        details: { onCooldown: true },
      };
    }

    // Check skill tree requirements
    if (!this.checkSkillRequirements(caster, spell)) {
      return {
        valid: false,
        reason: 'Skill tree requirements not met',
        details: { skillTreeRequirements: true },
      };
    }

    // Check cost affordability
    const affordability = this.checkCostAffordability(caster, spell, magic, world.tick, targetEntityId);
    if (!affordability.canAfford) {
      return {
        valid: false,
        reason: 'Insufficient resources to cast spell',
        details: {
          insufficientResources: true,
          wouldBeTerminal: affordability.wouldBeTerminal,
          terminalWarning: affordability.warning,
        },
      };
    }

    // Check target validity if provided
    if (targetEntityId) {
      const targetCheck = this.checkTargetValid(targetEntityId, world);
      if (!targetCheck.valid) {
        return {
          valid: false,
          reason: targetCheck.reason ?? 'Invalid target',
          details: { targetInvalid: true },
        };
      }
    }

    // All checks passed
    return {
      valid: true,
      details: {
        wouldBeTerminal: affordability.wouldBeTerminal,
        terminalWarning: affordability.warning,
      },
    };
  }

  // =========================================================================
  // Individual Validation Checks
  // =========================================================================

  /**
   * Check if a spell is on cooldown.
   *
   * @param entityId The entity ID
   * @param spellId The spell ID
   * @param currentTick The current game tick
   * @returns True if spell is on cooldown
   */
  checkCooldown(entityId: string, spellId: string, currentTick: number): boolean {
    const entityCooldowns = this.cooldowns.get(entityId);
    if (!entityCooldowns) return false;

    const availableTick = entityCooldowns.get(spellId);
    if (!availableTick) return false;

    return currentTick < availableTick;
  }

  /**
   * Set cooldown for a spell.
   * Called by SpellCastingManager after successful cast.
   *
   * @param entityId The entity ID
   * @param spellId The spell ID
   * @param availableTick The tick when spell will be available again
   */
  setCooldown(entityId: string, spellId: string, availableTick: number): void {
    if (!this.cooldowns.has(entityId)) {
      this.cooldowns.set(entityId, new Map());
    }

    this.cooldowns.get(entityId)!.set(spellId, availableTick);
  }

  /**
   * Check if entity meets skill tree requirements for a spell.
   *
   * @param caster The entity to check
   * @param spell The spell to check requirements for
   * @returns True if requirements are met
   */
  checkSkillRequirements(caster: EntityImpl, spell: SpellDefinition): boolean {
    if (!this.checkSkillTreeRequirementsCallback) {
      // No skill tree manager - assume all requirements met
      return true;
    }

    return this.checkSkillTreeRequirementsCallback(caster, spell);
  }

  /**
   * Check if entity can afford to cast a spell.
   *
   * @param caster The entity to check
   * @param spell The spell to check costs for
   * @param magic The caster's magic component
   * @param currentTick Current game tick
   * @param targetEntityId Optional target entity ID
   * @returns Affordability result with terminal warnings
   */
  checkCostAffordability(
    caster: EntityImpl,
    spell: SpellDefinition,
    magic: MagicComponent,
    currentTick: number,
    targetEntityId?: string
  ): AffordabilityResult {
    // Build a ComposedSpell for cost calculation
    const composedSpell: ComposedSpell = {
      id: spell.id,
      name: spell.name,
      technique: spell.technique,
      form: spell.form,
      source: spell.source,
      manaCost: spell.manaCost,
      castTime: spell.castTime,
      range: spell.range,
      duration: spell.duration,
      effectId: spell.effectId,
    };

    // Use paradigm-specific cost calculator if available
    const paradigmId = spell.paradigmId ?? 'academic';

    if (costCalculatorRegistry.has(paradigmId)) {
      // Create casting context with spiritual and body components
      const context: CastingContext = createDefaultContext(currentTick);
      context.casterId = caster.id;
      context.targetId = targetEntityId;
      context.spiritualComponent = caster.getComponent<SpiritualComponent>(CT.Spiritual);
      context.bodyComponent = caster.getComponent<BodyComponent>(CT.Body);

      try {
        const calculator = costCalculatorRegistry.get(paradigmId);

        // Calculate costs
        const costs = calculator.calculateCosts(composedSpell, magic, context);

        // Check affordability
        const affordability = calculator.canAfford(costs, magic);

        return {
          canAfford: affordability.canAfford,
          wouldBeTerminal: affordability.wouldBeTerminal ?? false,
          warning: affordability.warning,
        };
      } catch (e) {
        // Fall back to simple mana check
        const canCast = canCastSpell(magic, composedSpell);
        return {
          canAfford: canCast.canCast,
          wouldBeTerminal: false,
        };
      }
    } else {
      // No paradigm calculator - use simple mana check
      const canCast = canCastSpell(magic, composedSpell);
      return {
        canAfford: canCast.canCast,
        wouldBeTerminal: false,
      };
    }
  }

  /**
   * Check if target entity is valid.
   *
   * @param targetId The target entity ID
   * @param world The game world
   * @returns Validation result with reason if invalid
   */
  checkTargetValid(targetId: string | undefined, world: World): { valid: boolean; reason?: string } {
    if (!targetId) {
      return { valid: true }; // Self-targeting or no target
    }

    const targetEntity = world.getEntity(targetId);
    if (!targetEntity) {
      return {
        valid: false,
        reason: `Target entity not found: ${targetId}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check if entity knows a spell.
   *
   * @param magic The entity's magic component
   * @param spellId The spell to check
   * @returns True if spell is known
   */
  private knowsSpell(magic: MagicComponent, spellId: string): boolean {
    return magic.knownSpells.some((s) => s.spellId === spellId);
  }

  // =========================================================================
  // Queries (Public API)
  // =========================================================================

  /**
   * Get remaining cooldown ticks for a spell.
   *
   * @param entityId The entity ID
   * @param spellId The spell ID
   * @param currentTick The current game tick
   * @returns Ticks remaining (0 if not on cooldown)
   */
  getRemainingCooldown(entityId: string, spellId: string, currentTick: number): number {
    const entityCooldowns = this.cooldowns.get(entityId);
    if (!entityCooldowns) return 0;

    const availableTick = entityCooldowns.get(spellId);
    if (!availableTick) return 0;

    return Math.max(0, availableTick - currentTick);
  }

  /**
   * Get all active cooldowns for an entity.
   *
   * @param entityId The entity ID
   * @param currentTick The current game tick
   * @returns Map of spellId -> remaining ticks
   */
  getActiveCooldowns(entityId: string, currentTick: number): Map<string, number> {
    const result = new Map<string, number>();
    const entityCooldowns = this.cooldowns.get(entityId);
    if (!entityCooldowns) return result;

    for (const [spellId, availableTick] of entityCooldowns.entries()) {
      const remaining = availableTick - currentTick;
      if (remaining > 0) {
        result.set(spellId, remaining);
      }
    }

    return result;
  }
}
