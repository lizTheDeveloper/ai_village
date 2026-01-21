/**
 * SpellUtilityCalculator - Helps agents decide which spells to cast
 *
 * Evaluates utility of casting different spells based on:
 * - Agent's current needs (health, resources)
 * - Available targets
 * - Spell costs and proficiency
 * - Situational factors
 *
 * Part of Phase 30: Magic System
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { MagicComponent } from '../components/MagicComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import { SpellRegistry, type SpellDefinition } from '../magic/SpellRegistry.js';
import { SpellCastingService } from '../magic/SpellCastingService.js';

/**
 * Spell casting suggestion with utility score
 */
export interface SpellSuggestion {
  spellId: string;
  spellName: string;
  utility: number; // 0-1, higher = more useful
  targetId?: string;
  reason: string;
}

/**
 * Context for spell utility evaluation
 */
export interface SpellUtilityContext {
  /** Agent's current health (0-1) */
  health: number;

  /** Nearby allies in need of help */
  injuredAllies: Array<{ id: string; health: number; distance: number }>;

  /** Nearby enemies/threats */
  threats: Array<{ id: string; distance: number }>;

  /** Agent's mana/resource levels */
  resourceLevels: Record<string, number>;

  /** Current situation urgency (0-1) */
  urgency: number;
}

/**
 * Calculate utility of casting spells in current situation
 */
export class SpellUtilityCalculator {
  private spellRegistry: SpellRegistry;
  private castingService: SpellCastingService;

  constructor() {
    this.spellRegistry = SpellRegistry.getInstance();
    this.castingService = SpellCastingService.getInstance();
  }

  /**
   * Get spell casting suggestions for an agent
   */
  suggestSpells(
    entity: EntityImpl,
    world: World,
    options: {
      maxSuggestions?: number;
      minUtility?: number;
    } = {}
  ): SpellSuggestion[] {
    const maxSuggestions = options.maxSuggestions ?? 5;
    const minUtility = options.minUtility ?? 0.3;

    const magic = entity.getComponent<MagicComponent>(ComponentType.Magic);
    if (!magic || !magic.magicUser) {
      return [];
    }

    // Build context
    const context = this.buildContext(entity, world);

    // Evaluate all known spells
    const suggestions: SpellSuggestion[] = [];

    for (const knownSpell of magic.knownSpells) {
      const spell = this.spellRegistry.getSpell(knownSpell.spellId);
      if (!spell) continue;

      // Check if spell is unlocked
      const playerState = this.spellRegistry.getPlayerState(knownSpell.spellId);
      if (!playerState?.unlocked) continue;

      // Check if can afford
      const canCast = this.castingService.canCast(knownSpell.spellId, entity);
      if (!canCast.canCast) continue;

      // Calculate utility
      const suggestion = this.evaluateSpell(entity, spell, context, knownSpell.proficiency);

      if (suggestion && suggestion.utility >= minUtility) {
        suggestions.push(suggestion);
      }
    }

    // Sort by utility (descending)
    suggestions.sort((a, b) => b.utility - a.utility);

    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Build evaluation context for the agent
   */
  private buildContext(entity: EntityImpl, world: World): SpellUtilityContext {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);
    const magic = entity.getComponent<MagicComponent>(ComponentType.Magic);

    const context: SpellUtilityContext = {
      health: needs?.health ?? 1.0,
      injuredAllies: [],
      threats: [],
      resourceLevels: {},
      urgency: 0
    };

    // Calculate resource levels
    if (magic) {
      for (const pool of magic.manaPools) {
        const level = pool.maximum > 0 ? pool.current / pool.maximum : 0;
        context.resourceLevels[pool.source] = level;
      }
    }

    // Find injured allies
    if (position) {
      const allies = world
        .query()
        .with(ComponentType.Agent)
        .with(ComponentType.Position)
        .with(ComponentType.Needs)
        .executeEntities();

      for (const ally of allies) {
        const allyImpl = ally as EntityImpl;
        if (allyImpl.id === entity.id) continue;

        const allyPos = allyImpl.getComponent<PositionComponent>(ComponentType.Position);
        const allyNeeds = allyImpl.getComponent<NeedsComponent>(ComponentType.Needs);

        if (!allyPos || !allyNeeds) continue;

        const dx = allyPos.x - position.x;
        const dy = allyPos.y - position.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared < 30 * 30 && allyNeeds.health < 0.8) {
          context.injuredAllies.push({
            id: allyImpl.id,
            health: allyNeeds.health,
            distance: Math.sqrt(distanceSquared)
          });
        }
      }
    }

    // Calculate urgency based on health and threats
    if (context.health < 0.3) {
      context.urgency = 0.9; // Critical health
    } else if (context.health < 0.5) {
      context.urgency = 0.6; // Low health
    } else if (context.injuredAllies.length > 0) {
      context.urgency = 0.4; // Allies need help
    } else {
      context.urgency = 0.1; // No immediate danger
    }

    return context;
  }

  /**
   * Evaluate utility of a specific spell
   */
  private evaluateSpell(
    entity: EntityImpl,
    spell: SpellDefinition,
    context: SpellUtilityContext,
    proficiency: number
  ): SpellSuggestion | null {
    const effectId = spell.effectId.toLowerCase();

    // Healing spells
    if (effectId.includes('heal')) {
      return this.evaluateHealingSpell(entity, spell, context, proficiency);
    }

    // Damage spells
    if (effectId.includes('damage') || effectId.includes('attack')) {
      return this.evaluateDamageSpell(spell, context, proficiency);
    }

    // Buff spells
    if (effectId.includes('buff') || effectId.includes('enhance')) {
      return this.evaluateBuffSpell(spell, context, proficiency);
    }

    // Protection spells
    if (effectId.includes('protect') || effectId.includes('shield') || effectId.includes('ward')) {
      return this.evaluateProtectionSpell(spell, context, proficiency);
    }

    // Default: low utility for unknown spell types
    return {
      spellId: spell.id,
      spellName: spell.name,
      utility: 0.2,
      reason: 'General purpose spell'
    };
  }

  /**
   * Evaluate healing spell utility
   */
  private evaluateHealingSpell(
    entity: EntityImpl,
    spell: SpellDefinition,
    context: SpellUtilityContext,
    proficiency: number
  ): SpellSuggestion {
    let utility = 0;
    let targetId: string | undefined;
    let reason = '';

    // Self-healing when injured
    if (context.health < 0.5) {
      utility = (1.0 - context.health) * 0.8; // Higher utility when more injured
      targetId = entity.id;
      reason = `Self healing (health: ${(context.health * 100).toFixed(0)}%)`;
    }

    // Healing allies
    if (context.injuredAllies.length > 0) {
      const mostInjured = context.injuredAllies.reduce((prev, curr) =>
        curr.health < prev.health ? curr : prev
      );

      const allyUtility = (1.0 - mostInjured.health) * 0.7;
      if (allyUtility > utility) {
        utility = allyUtility;
        targetId = mostInjured.id;
        reason = `Heal ally (health: ${(mostInjured.health * 100).toFixed(0)}%)`;
      }
    }

    // Boost utility based on urgency
    utility *= (1.0 + context.urgency * 0.5);

    // Adjust for proficiency (higher proficiency = more reliable)
    utility *= (0.7 + (proficiency / 100) * 0.3);

    return {
      spellId: spell.id,
      spellName: spell.name,
      utility: Math.min(1.0, utility),
      targetId,
      reason
    };
  }

  /**
   * Evaluate damage spell utility
   */
  private evaluateDamageSpell(
    spell: SpellDefinition,
    context: SpellUtilityContext,
    proficiency: number
  ): SpellSuggestion {
    let utility = 0;
    let targetId: string | undefined;
    let reason = 'No targets';

    // Only useful if there are threats
    if (context.threats.length > 0) {
      const nearestThreat = context.threats[0];
      if (nearestThreat) {
        utility = 0.6; // Base utility for combat
        targetId = nearestThreat.id;
        reason = `Attack threat (${nearestThreat.distance.toFixed(1)}m away)`;
      }

      // Higher urgency = higher combat utility
      utility *= (1.0 + context.urgency * 0.4);
    } else {
      // No immediate threats, low utility
      utility = 0.1;
    }

    // Adjust for proficiency
    utility *= (0.7 + (proficiency / 100) * 0.3);

    return {
      spellId: spell.id,
      spellName: spell.name,
      utility: Math.min(1.0, utility),
      targetId,
      reason
    };
  }

  /**
   * Evaluate buff spell utility
   */
  private evaluateBuffSpell(
    spell: SpellDefinition,
    context: SpellUtilityContext,
    proficiency: number
  ): SpellSuggestion {
    // Buffs are more useful in anticipation of danger
    let utility = 0.3; // Base utility

    // Higher utility if urgency is rising
    utility += context.urgency * 0.4;

    // Lower utility if already healthy and safe
    if (context.health > 0.8 && context.urgency < 0.2) {
      utility = 0.2;
    }

    // Adjust for proficiency
    utility *= (0.7 + (proficiency / 100) * 0.3);

    return {
      spellId: spell.id,
      spellName: spell.name,
      utility: Math.min(1.0, utility),
      reason: 'Prepare for challenges'
    };
  }

  /**
   * Evaluate protection spell utility
   */
  private evaluateProtectionSpell(
    spell: SpellDefinition,
    context: SpellUtilityContext,
    proficiency: number
  ): SpellSuggestion {
    // Protection is valuable when expecting danger
    let utility = context.urgency * 0.7;

    // Higher utility if health is low but not critical
    if (context.health < 0.7 && context.health > 0.3) {
      utility += 0.3;
    }

    // Adjust for proficiency
    utility *= (0.7 + (proficiency / 100) * 0.3);

    return {
      spellId: spell.id,
      spellName: spell.name,
      utility: Math.min(1.0, utility),
      reason: 'Protection from harm'
    };
  }
}

/**
 * Get spell suggestions for an agent
 */
export function suggestSpells(
  entity: EntityImpl,
  world: World,
  options?: {
    maxSuggestions?: number;
    minUtility?: number;
  }
): SpellSuggestion[] {
  const calculator = new SpellUtilityCalculator();
  return calculator.suggestSpells(entity, world, options);
}
