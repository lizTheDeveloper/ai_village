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

import type { EntityImpl } from '../../ecs/index.js';
import type { EventBus } from '../../events/EventBus.js';
import type { SpellKnowledgeComponent } from '../../components/SpellKnowledgeComponent.js';
import type { ManaPoolsComponent } from '../../components/ManaPoolsComponent.js';
import type { ParadigmStateComponent } from '../../components/ParadigmStateComponent.js';
import type { CastingStateComponent } from '../../components/CastingStateComponent.js';
import type { SkillProgressComponent } from '../../components/SkillProgressComponent.js';
import type { SpiritualComponent } from '../../components/SpiritualComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

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

    // Get or check for split magic components
    let spellKnowledge = entity.getComponent<SpellKnowledgeComponent>(CT.SpellKnowledgeComponent);
    let manaPools = entity.getComponent<ManaPoolsComponent>(CT.ManaPoolsComponent);
    let paradigmState = entity.getComponent<ParadigmStateComponent>(CT.ParadigmStateComponent);

    // If no magic components and faith is high enough, initialize them for divine paradigm
    if (!spellKnowledge && !manaPools && !paradigmState && spiritual.faith >= 0.3) {
      // Create ManaPoolsComponent
      const newManaPools: ManaPoolsComponent = {
        type: 'mana_pools',
        version: 1,
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
      };
      entity.addComponent(newManaPools);
      manaPools = newManaPools;

      // Create SpellKnowledgeComponent
      const newSpellKnowledge: SpellKnowledgeComponent = {
        type: 'spell_knowledge',
        version: 1,
        knownSpells: [],
        knownParadigmIds: ['divine'],
        activeEffects: [],
        techniqueProficiency: {},
        formProficiency: {},
      };
      entity.addComponent(newSpellKnowledge);
      spellKnowledge = newSpellKnowledge;

      // Create ParadigmStateComponent
      const newParadigmState: ParadigmStateComponent = {
        type: 'paradigm_state',
        version: 1,
        homeParadigmId: 'divine',
        activeParadigmId: 'divine',
        paradigmState: {},
      };
      entity.addComponent(newParadigmState);
      paradigmState = newParadigmState;

      // Create CastingStateComponent
      const newCastingState: CastingStateComponent = {
        type: 'casting_state',
        version: 1,
        casting: false,
      };
      entity.addComponent(newCastingState);

      // Create SkillProgressComponent
      const newSkillProgress: SkillProgressComponent = {
        type: 'skill_progress',
        version: 1,
        skillTreeState: {},
      };
      entity.addComponent(newSkillProgress);
    }

    if (!spellKnowledge) return;

    // Ensure divine paradigm is known
    if (!spellKnowledge.knownParadigmIds.includes('divine')) {
      entity.updateComponent<SpellKnowledgeComponent>(CT.SpellKnowledgeComponent, (current) => ({
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
        const alreadyKnown = spellKnowledge.knownSpells.some(s => s.spellId === threshold.spellId);
        if (!alreadyKnown) {
          // Check prerequisites (divine_regeneration requires divine_heal, divine_sanctuary requires divine_blessing)
          const prereqMet = this.checkDivinePrerequisites(spellKnowledge, threshold.spellId);
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
   * @param spellKnowledge The entity's spell knowledge component
   * @param spellId The spell to check prerequisites for
   * @returns True if prerequisites are met
   */
  checkDivinePrerequisites(spellKnowledge: SpellKnowledgeComponent, spellId: string): boolean {
    const prerequisites: Record<string, string[]> = {
      'divine_heal': [], // No prerequisites
      'divine_blessing': [], // No prerequisites
      'divine_regeneration': ['divine_heal'],
      'divine_smite': [], // No prerequisites (different school)
      'divine_sanctuary': ['divine_blessing'],
    };

    const required = prerequisites[spellId] ?? [];
    for (const prereq of required) {
      if (!spellKnowledge.knownSpells.some(s => s.spellId === prereq)) {
        return false;
      }
    }
    return true;
  }
}
