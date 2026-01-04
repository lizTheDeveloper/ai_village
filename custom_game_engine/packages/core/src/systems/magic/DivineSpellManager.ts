/**
 * DivineSpellManager - Manages divine magic and prayer-based spell unlocks
 *
 * Part of Phase 30: Magic System
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { MagicComponent } from '../../components/MagicComponent.js';
import type { SpiritualComponent } from '../../components/SpiritualComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import type { SpellLearningManager } from './SpellLearningManager.js';

/**
 * Manages divine magic spells and their relationship with faith/prayer.
 */
export class DivineSpellManager {
  private world: World | null = null;
  private spellLearning: SpellLearningManager | null = null;

  /**
   * Initialize with world and spell learning manager.
   */
  initialize(world: World, spellLearning: SpellLearningManager): void {
    this.world = world;
    this.spellLearning = spellLearning;
  }

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
   */
  handlePrayerAnswered(entity: EntityImpl, deityId: string, responseType: string): void {
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
      (entity as any).addComponent(newMagic);
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
          const prereqMet = this.checkPrerequisites(magic, threshold.spellId);
          if (prereqMet) {
            // Small random chance per answered prayer to receive divine revelation
            // Higher faith = higher chance
            const revelationChance = 0.1 + (effectiveFaith * 0.3);
            if (Math.random() < revelationChance && this.spellLearning) {
              this.spellLearning.learnSpell(entity, threshold.spellId, 10); // Start with 10 proficiency for divine gift

              // Emit divine revelation event (using any cast for extended event data)
              (this.world?.eventBus as any)?.emit({
                type: 'magic:spell_learned',
                source: entity.id,
                data: {
                  entityId: entity.id,
                  spellId: threshold.spellId,
                  proficiency: 10,
                  // Extended fields for divine revelation context
                  spellName: threshold.description,
                  paradigmId: 'divine',
                  source: 'divine_revelation',
                  deityId,
                },
              });
            }
          }
        }
      }
    }
  }

  /**
   * Check if prerequisites are met for a divine spell.
   */
  private checkPrerequisites(magic: MagicComponent, spellId: string): boolean {
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
