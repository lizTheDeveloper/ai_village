/**
 * DivineSpellManager - Manages divine spell unlocking through prayer and faith
 *
 * Handles:
 * - Prayer-based spell unlocking
 * - Faith threshold checking
 * - Divine magic initialization for believers
 * - Divine spell prerequisites
 *
 * Extracted from MagicSystem to reduce god object complexity.
 */

import type { EntityImpl } from '@ai-village/core/ecs/Entity.js';
import type { EventBus } from '@ai-village/core/events/EventBus.js';
import { ComponentType as CT } from '@ai-village/core/types/ComponentType.js';
import type { MagicComponent } from '@ai-village/core/components/MagicComponent.js';
import type { SpiritualComponent } from '@ai-village/core/components/SpiritualComponent.js';

/**
 * Manages divine magic unlocking through faith and prayer.
 *
 * Divine spells are granted by deities based on:
 * - Faith level (0-1)
 * - Prayer responses (signs vs visions)
 * - Spell prerequisites (linear progression)
 */
export class DivineSpellManager {
  private eventBus: EventBus | null = null;

  /**
   * Initialize the manager with event bus reference.
   */
  initialize(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  // =========================================================================
  // Prayer-Based Spell Unlocking
  // =========================================================================

  /**
   * Handle a prayer being answered - potentially unlock divine spells for the believer.
   *
   * Faith thresholds for spell unlocks:
   * - 0.3 faith: divine_heal (basic healing)
   * - 0.5 faith: divine_blessing (protection)
   * - 0.7 faith: divine_regeneration (sustained healing)
   * - 0.8 faith: divine_smite (offensive divine power)
   * - 0.9 faith: divine_sanctuary (powerful protection)
   *
   * Each answered prayer also increases the chance of spell revelation.
   *
   * @param entity The entity whose prayer was answered
   * @param deityId The deity who answered
   * @param responseType Type of response ('sign' or 'vision')
   * @param learnSpellCallback Callback to learn spells (from SpellProficiencyManager)
   */
  handlePrayerAnswered(
    entity: EntityImpl,
    deityId: string,
    responseType: string,
    learnSpellCallback: (entity: EntityImpl, spellId: string, proficiency: number) => void
  ): void {
    const spiritual = entity.getComponent<SpiritualComponent>(CT.Spiritual);
    if (!spiritual) return;

    // Get or check for MagicComponent
    let magic = entity.getComponent<MagicComponent>(CT.Magic);

    // If no magic component and faith is high enough, initialize one for divine paradigm
    if (!magic && spiritual.faith >= 0.3) {
      const newMagic: MagicComponent = {
        type: 'magic',
        magicUser: true,
        homeParadigmId: 'divine',
        activeParadigmId: 'divine',
        knownParadigmIds: ['divine'],
        paradigmState: {},
        manaPools: [],
        resourcePools: {
          favor: {
            type: 'favor',
            current: Math.floor(spiritual.faith * 100),
            maximum: 100,
            regenRate: 1,
            locked: 0,
          },
        },
        knownSpells: [],
        activeEffects: [],
        techniqueProficiency: {},
        formProficiency: {},
        casting: false,
        totalSpellsCast: 0,
        totalMishaps: 0,
        version: 1,
      };
      entity.addComponent(newMagic);
      magic = newMagic;
    }

    if (!magic) return;

    // Ensure divine paradigm is known
    if (!magic.knownParadigmIds.includes('divine')) {
      entity.updateComponent<MagicComponent>(CT.Magic, (current) => ({
        ...current,
        knownParadigmIds: [...current.knownParadigmIds, 'divine'],
      }));
    }

    // Divine spell unlock thresholds
    const spellThresholds: Array<{ spellId: string; faithRequired: number; description: string }> = [
      { spellId: 'divine_heal', faithRequired: 0.3, description: 'Divine Healing' },
      { spellId: 'divine_blessing', faithRequired: 0.5, description: 'Divine Blessing' },
      { spellId: 'divine_regeneration', faithRequired: 0.7, description: 'Blessed Regeneration' },
      { spellId: 'divine_smite', faithRequired: 0.8, description: 'Divine Smite' },
      { spellId: 'divine_sanctuary', faithRequired: 0.9, description: 'Sanctuary' },
    ];

    // Visions are more powerful revelations than signs
    const visionMultiplier = responseType === 'vision' ? 1.2 : 1.0;
    const effectiveFaith = spiritual.faith * visionMultiplier;

    // Check which spells should be unlocked
    for (const threshold of spellThresholds) {
      if (effectiveFaith >= threshold.faithRequired) {
        // Check if spell is already known
        const alreadyKnown = magic.knownSpells.some(s => s.spellId === threshold.spellId);
        if (!alreadyKnown) {
          // Check prerequisites (divine_regeneration requires divine_heal, divine_sanctuary requires divine_blessing)
          const prereqMet = this.checkDivinePrerequisites(magic, threshold.spellId);
          if (prereqMet) {
            // Small random chance per answered prayer to receive divine revelation
            // Higher faith = higher chance
            const revelationChance = 0.1 + (effectiveFaith * 0.3);
            if (Math.random() < revelationChance) {
              learnSpellCallback(entity, threshold.spellId, 10); // Start with 10 proficiency for divine gift

              // Emit divine revelation event
              this.eventBus?.emit<'magic:spell_learned'>({
                type: 'magic:spell_learned',
                source: entity.id,
                data: {
                  entityId: entity.id,
                  spellId: threshold.spellId,
                  proficiency: 10,
                },
              });
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // Prerequisites
  // =========================================================================

  /**
   * Check if prerequisites are met for a divine spell.
   *
   * @param magic The entity's magic component
   * @param spellId The spell to check prerequisites for
   * @returns True if prerequisites are met
   */
  checkDivinePrerequisites(magic: MagicComponent, spellId: string): boolean {
    const prerequisites: Record<string, string[]> = {
      'divine_heal': [], // No prerequisites
      'divine_blessing': [], // No prerequisites
      'divine_regeneration': ['divine_heal'],
      'divine_smite': [], // No prerequisites (different school)
      'divine_sanctuary': ['divine_blessing'],
    };

    const required = prerequisites[spellId] ?? [];
    for (const prereq of required) {
      if (!magic.knownSpells.some(s => s.spellId === prereq)) {
        return false;
      }
    }
    return true;
  }
}
