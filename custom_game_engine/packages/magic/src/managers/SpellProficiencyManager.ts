/**
 * SpellProficiencyManager - Manages spell learning and proficiency tracking
 *
 * Handles:
 * - Learning new spells
 * - Updating proficiency after casting
 * - Incrementing cast counts
 * - Proficiency decay (future)
 *
 * Extracted from MagicSystem to reduce god object complexity.
 */

import type { EntityImpl } from '@ai-village/core/ecs/Entity.js';
import type { EventBus } from '@ai-village/core/events/EventBus.js';
import { ComponentType as CT } from '@ai-village/core/types/ComponentType.js';
import type { MagicComponent } from '@ai-village/core/components/MagicComponent.js';
import { SpellRegistry } from '../SpellRegistry.js';

/**
 * Manages spell learning and proficiency progression.
 *
 * Proficiency increases with practice, affecting:
 * - Cast success rate
 * - Mana cost reduction
 * - Effect magnitude (future)
 */
export class SpellProficiencyManager {
  private eventBus: EventBus | null = null;
  private currentTick: number = 0;

  /**
   * Initialize the manager with event bus reference.
   */
  initialize(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Update current tick (called by MagicSystem)
   */
  setCurrentTick(tick: number): void {
    this.currentTick = tick;
  }

  // =========================================================================
  // Spell Learning
  // =========================================================================

  /**
   * Learn a new spell.
   *
   * @param entity The entity learning the spell
   * @param spellId The spell to learn
   * @param initialProficiency Starting proficiency (0-100)
   * @returns True if learned successfully
   */
  learnSpell(entity: EntityImpl, spellId: string, initialProficiency: number = 0): boolean {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return false;

    // Check if already known
    if (magic.knownSpells.some((s) => s.spellId === spellId)) {
      return false;
    }

    // Get spell info from registry for the event
    const spellRegistry = SpellRegistry.getInstance();
    const spellDef = spellRegistry.getSpell(spellId);
    const paradigmId = spellDef?.paradigmId ?? magic.activeParadigmId ?? 'academic';

    // Add to known spells
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
      ...current,
      knownSpells: [
        ...current.knownSpells,
        {
          spellId,
          proficiency: initialProficiency,
          timesCast: 0,
        },
      ],
    }));

    // Emit spell learned confirmation event
    this.eventBus?.emit<'magic:spell_learned'>({
      type: 'magic:spell_learned',
      source: entity.id,
      data: {
        entityId: entity.id,
        spellId,
        proficiency: initialProficiency,
      },
    });

    return true;
  }

  // =========================================================================
  // Proficiency Updates
  // =========================================================================

  /**
   * Update spell proficiency after casting.
   * Increments cast count and increases proficiency.
   *
   * @param entity The caster entity
   * @param knownSpell The spell that was cast
   */
  updateSpellProficiency(entity: EntityImpl, knownSpell: { spellId: string }): void {
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const updated = current.knownSpells.map((s) => {
        if (s.spellId === knownSpell.spellId) {
          return {
            ...s,
            timesCast: s.timesCast + 1,
            proficiency: Math.min(100, s.proficiency + 0.5), // Gain 0.5 proficiency per cast
            lastCast: this.currentTick,
          };
        }
        return s;
      });

      return {
        ...current,
        knownSpells: updated,
      };
    });
  }

  /**
   * Increment proficiency for a spell after casting.
   * Alternative entry point that looks up the spell by ID.
   *
   * @param entity The caster entity
   * @param spellId The spell that was cast
   */
  incrementSpellProficiency(entity: EntityImpl, spellId: string): void {
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const knownSpells = current.knownSpells.map(spell => {
        if (spell.spellId === spellId) {
          return {
            ...spell,
            timesCast: spell.timesCast + 1,
            proficiency: Math.min(100, spell.proficiency + 0.5), // Slow increase
            lastCast: this.currentTick,
          };
        }
        return spell;
      });
      return {
        ...current,
        knownSpells,
        totalSpellsCast: current.totalSpellsCast + 1,
      };
    });
  }

  // =========================================================================
  // Queries
  // =========================================================================

  /**
   * Get proficiency for a specific spell.
   *
   * @param entity The entity to check
   * @param spellId The spell to check proficiency for
   * @returns Proficiency (0-100) or 0 if spell not known
   */
  getProficiency(entity: EntityImpl, spellId: string): number {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return 0;

    const spell = magic.knownSpells.find(s => s.spellId === spellId);
    return spell?.proficiency ?? 0;
  }

  /**
   * Check if entity knows a spell.
   *
   * @param entity The entity to check
   * @param spellId The spell to check
   * @returns True if spell is known
   */
  knowsSpell(entity: EntityImpl, spellId: string): boolean {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return false;

    return magic.knownSpells.some(s => s.spellId === spellId);
  }

  /**
   * Get all known spells for an entity.
   *
   * @param entity The entity to get spells for
   * @returns Array of known spells
   */
  getKnownSpells(entity: EntityImpl): Array<{ spellId: string; proficiency: number; timesCast: number }> {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return [];

    return magic.knownSpells.map(s => ({
      spellId: s.spellId,
      proficiency: s.proficiency,
      timesCast: s.timesCast,
    }));
  }
}
