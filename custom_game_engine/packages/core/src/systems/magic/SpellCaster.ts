/**
 * SpellCaster - Manages spell casting execution
 *
 * Part of Phase 30: Magic System
 */

import type { EntityImpl, Entity } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { MagicComponent, ComposedSpell } from '../../components/MagicComponent.js';
import type { SpiritualComponent } from '../../components/SpiritualComponent.js';
import type { BodyComponent } from '../../components/BodyComponent.js';
import { canCastSpell } from '../../components/MagicComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { SpellEffectExecutor } from '../../magic/SpellEffectExecutor.js';
import { SpellRegistry, type SpellDefinition } from '../../magic/SpellRegistry.js';
import { costCalculatorRegistry } from '../../magic/costs/CostCalculatorRegistry.js';
import { createDefaultContext, type CastingContext } from '../../magic/costs/CostCalculator.js';
import { getCoreParadigm } from '../../magic/CoreParadigms.js';
import type { CooldownManager } from './CooldownManager.js';
import type { ManaManager } from './ManaManager.js';
import type { SpellLearningManager } from './SpellLearningManager.js';
import type { SkillTreeManager } from './SkillTreeManager.js';

/**
 * Handles the execution of spell casting.
 */
export class SpellCaster {
  private effectExecutor: SpellEffectExecutor | null = null;
  private cooldownManager: CooldownManager | null = null;
  private manaManager: ManaManager | null = null;
  private spellLearning: SpellLearningManager | null = null;
  private skillTreeManager: SkillTreeManager | null = null;

  /**
   * Initialize with required managers.
   */
  initialize(
    effectExecutor: SpellEffectExecutor,
    cooldownManager: CooldownManager,
    manaManager: ManaManager,
    spellLearning: SpellLearningManager,
    skillTreeManager: SkillTreeManager
  ): void {
    this.effectExecutor = effectExecutor;
    this.cooldownManager = cooldownManager;
    this.manaManager = manaManager;
    this.spellLearning = spellLearning;
    this.skillTreeManager = skillTreeManager;
  }

  /**
   * Cast a spell from an entity.
   * Returns true if spell was cast successfully.
   */
  castSpell(
    caster: EntityImpl,
    world: World,
    spellId: string,
    targetEntityId?: string,
    targetPosition?: { x: number; y: number }
  ): boolean {
    const magic = caster.getComponent<MagicComponent>(CT.Magic);
    if (!magic) {
      return false;
    }

    // Find the spell in SpellRegistry
    const spellRegistry = SpellRegistry.getInstance();
    const spell = spellRegistry.getSpell(spellId);
    if (!spell) {
      console.error(`[MagicSystem] Spell not found in registry: ${spellId}`);
      return false;
    }

    // Check if entity knows the spell
    const knownSpell = magic.knownSpells.find((s) => s.spellId === spellId);
    if (!knownSpell) {
      return false;
    }

    // Check cooldown
    if (this.cooldownManager?.isOnCooldown(caster.id, spellId, world.tick)) {
      return false;
    }

    // Build a ComposedSpell-compatible object for cost calculation
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
    let deductionSuccess = false;
    let terminal = false;

    if (costCalculatorRegistry.has(paradigmId)) {
      // Create casting context with spiritual and body components
      const context: CastingContext = createDefaultContext(world.tick);
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
        if (!affordability.canAfford) {
          return false;
        }

        // Warn about terminal effects
        if (affordability.wouldBeTerminal) {
          world.eventBus.emit({
            type: 'magic:terminal_warning',
            source: caster.id,
            data: {
              spellId,
              warning: affordability.warning,
            },
          });
          // Still allow casting - player chose to risk it
        }

        // Get full paradigm definition
        const paradigm = getCoreParadigm(paradigmId);
        if (!paradigm) {
          throw new Error(`Paradigm '${paradigmId}' not found in core paradigms`);
        }

        // Deduct costs using paradigm calculator
        const result = calculator.deductCosts(costs, magic, paradigm);
        deductionSuccess = result.success;
        terminal = result.terminal;

        // Handle terminal effects
        if (result.terminal && result.terminalEffect) {
          world.eventBus.emit({
            type: 'magic:terminal_effect',
            source: caster.id,
            data: {
              spellId,
              effect: result.terminalEffect,
            },
          });
        }

        // Update the component with new resource values
        caster.updateComponent<MagicComponent>(CT.Magic, () => magic);
      } catch (e) {
        // Fall back to simple mana deduction
        const canCast = canCastSpell(magic, composedSpell);
        if (!canCast.canCast) {
          return false;
        }
        this.manaManager?.deductMana(caster, spell.source, spell.manaCost);
        deductionSuccess = true;
      }
    } else {
      // No paradigm calculator - use simple mana deduction
      const canCast = canCastSpell(magic, composedSpell);
      if (!canCast.canCast) {
        return false;
      }
      this.manaManager?.deductMana(caster, spell.source, spell.manaCost);
      deductionSuccess = true;
    }

    if (!deductionSuccess) {
      return false;
    }

    // Apply cooldown
    this.cooldownManager?.setCooldown(caster.id, spellId, world.tick + spell.castTime);

    // Increment proficiency and cast count
    this.spellLearning?.updateSpellProficiency(caster, knownSpell);

    // Apply spell effect using the effect executor
    this.applySpellEffect(caster, spell, world, targetEntityId, targetPosition);

    // Emit event
    world.eventBus.emit({
      type: 'magic:spell_cast',
      source: caster.id,
      data: {
        spellId,
        spell: spell.name,
        technique: spell.technique,
        form: spell.form,
        paradigm: paradigmId,
        manaCost: spell.manaCost,
        targetEntityId,
        targetPosition,
        wasTerminal: terminal,
      },
    });

    // Increment total spells cast
    caster.updateComponent<MagicComponent>(CT.Magic, (current) => ({
      ...current,
      totalSpellsCast: current.totalSpellsCast + 1,
    }));

    // Grant skill tree XP for casting (based on mana cost)
    const xpGained = Math.ceil(spell.manaCost * 0.1); // 10% of mana cost as XP
    this.skillTreeManager?.grantSkillXP(caster, paradigmId, xpGained);

    return true;
  }

  /**
   * Apply spell effect to target(s).
   * Uses the SpellEffectExecutor to apply effects based on spell.effectId.
   */
  private applySpellEffect(
    caster: EntityImpl,
    spell: SpellDefinition,
    world: World,
    targetEntityId?: string,
    _targetPosition?: { x: number; y: number }
  ): void {
    if (!this.effectExecutor) {
      console.error('[MagicSystem] Effect executor not initialized');
      return;
    }

    if (!spell.effectId) {
      // Spell has no effect - might be a passive or utility spell
      return;
    }

    // Determine target entity
    let target: Entity;
    if (targetEntityId) {
      const targetEntity = world.getEntity(targetEntityId);
      if (!targetEntity) {
        console.error(`[MagicSystem] Target entity not found: ${targetEntityId}`);
        return;
      }
      target = targetEntity;
    } else {
      // Self-targeting spell
      target = caster;
    }

    // Execute the effect using the effect executor
    const result = this.effectExecutor.executeEffect(
      spell.effectId,
      caster,
      target,
      spell,
      world,
      world.tick,
      1.0 // Power multiplier (could be modified by combos, etc.)
    );

    if (!result.success) {
      console.error(`[MagicSystem] Failed to apply effect: ${result.error}`);
    }
  }
}
