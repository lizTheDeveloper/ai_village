/**
 * SpellLearningManager - Manages spell learning and proficiency tracking
 *
 * Part of Phase 30: Magic System
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { MagicComponent } from '../../components/MagicComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { SpellRegistry } from '../../magic/SpellRegistry.js';

/**
 * Manages spell learning and proficiency for magic users.
 */
export class SpellLearningManager {
  private world: World | null = null;

  /**
   * Initialize the manager with world reference for event emission.
   */
  initialize(world: World): void {
    this.world = world;
  }

  /**
   * Learn a new spell.
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
    this.world?.eventBus.emit<'magic:spell_learned_confirmed'>({
      type: 'magic:spell_learned_confirmed' as const,
      source: entity.id,
      data: {
        entityId: entity.id,
        spellId,
        spellName: spellDef?.name ?? spellId,
        paradigmId,
        initialProficiency,
      },
    });

    return true;
  }

  /**
   * Increment proficiency for a spell after casting.
   */
  incrementProficiency(entity: EntityImpl, spellId: string): void {
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const knownSpells = current.knownSpells.map(spell => {
        if (spell.spellId === spellId) {
          return {
            ...spell,
            timesCast: spell.timesCast + 1,
            proficiency: Math.min(100, spell.proficiency + 0.5), // Slow increase
            lastCast: this.world?.tick,
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

  /**
   * Update spell proficiency after casting (legacy method for compatibility).
   */
  updateSpellProficiency(caster: EntityImpl, knownSpell: { spellId: string }): void {
    caster.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const updated = current.knownSpells.map((s) => {
        if (s.spellId === knownSpell.spellId) {
          return {
            ...s,
            timesCast: s.timesCast + 1,
            proficiency: Math.min(100, s.proficiency + 0.5), // Gain 0.5 proficiency per cast
            lastCast: this.world?.tick,
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
   * Get proficiency for a specific spell.
   */
  getProficiency(entity: EntityImpl, spellId: string): number {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return 0;

    const knownSpell = magic.knownSpells.find(s => s.spellId === spellId);
    return knownSpell?.proficiency ?? 0;
  }

  /**
   * Get times a spell has been cast.
   */
  getTimesCast(entity: EntityImpl, spellId: string): number {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return 0;

    const knownSpell = magic.knownSpells.find(s => s.spellId === spellId);
    return knownSpell?.timesCast ?? 0;
  }
}
