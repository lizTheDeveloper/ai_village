/**
 * Language System
 *
 * ECS system that manages language learning, proficiency decay,
 * and vocabulary consolidation during gameplay.
 */

import type { System, SystemMetadata } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { EventBus } from '@ai-village/core';
import {
  LANGUAGE_KNOWLEDGE_COMPONENT_TYPE,
  type LanguageKnowledgeComponent,
  updateProficiency,
} from './LanguageKnowledgeComponent.js';
import type { LanguageRegistry } from './LanguageRegistry.js';
import type { LanguageCommunicationService } from './LanguageCommunicationService.js';

/**
 * Language System Options
 */
export interface LanguageSystemOptions {
  /**
   * Enable proficiency decay for unused languages
   * @default true
   */
  enableDecay?: boolean;

  /**
   * Ticks of non-use before decay starts (20 TPS)
   * @default 12000 (10 minutes)
   */
  decayThreshold?: number;

  /**
   * Decay rate per tick (multiplicative)
   * @default 0.999 (0.1% per tick)
   */
  decayRate?: number;

  /**
   * Minimum proficiency before language is forgotten
   * @default 0.05
   */
  minimumProficiency?: number;

  /**
   * Update interval (throttle)
   * @default 100 (every 5 seconds)
   */
  updateInterval?: number;
}

/**
 * Language System
 *
 * Manages language-related updates:
 * - Proficiency decay for unused languages
 * - Vocabulary consolidation
 * - Learning progress updates
 *
 * Runs after conversation systems but before metrics.
 */
export class LanguageSystem implements System {
  readonly id = 'language_system' as const;
  readonly priority = 850; // After conversation (800), before metrics (900)
  readonly requiredComponents = [LANGUAGE_KNOWLEDGE_COMPONENT_TYPE] as const;
  readonly activationComponents = [LANGUAGE_KNOWLEDGE_COMPONENT_TYPE] as const;

  readonly metadata: SystemMetadata = {
    category: 'cognition',
    readsComponents: [LANGUAGE_KNOWLEDGE_COMPONENT_TYPE],
    writesComponents: [LANGUAGE_KNOWLEDGE_COMPONENT_TYPE],
    throttleInterval: 100,
    description: 'Manages language learning, proficiency decay, and vocabulary consolidation',
  };

  private languageRegistry: LanguageRegistry;
  private communicationService: LanguageCommunicationService;

  private enableDecay: boolean;
  private decayThreshold: number;
  private decayRate: number;
  private minimumProficiency: number;
  private updateInterval: number;

  private lastUpdate = -Infinity; // Ensure first update always runs

  constructor(
    languageRegistry: LanguageRegistry,
    communicationService: LanguageCommunicationService,
    options: LanguageSystemOptions = {}
  ) {
    this.languageRegistry = languageRegistry;
    this.communicationService = communicationService;

    this.enableDecay = options.enableDecay ?? true;
    this.decayThreshold = options.decayThreshold ?? 12000; // 10 minutes @ 20 TPS
    this.decayRate = options.decayRate ?? 0.999; // 0.1% per tick
    this.minimumProficiency = options.minimumProficiency ?? 0.05;
    this.updateInterval = options.updateInterval ?? 100; // 5 seconds
  }

  initialize(world: World, eventBus: EventBus): void {
    // Optional: Subscribe to conversation events for real-time learning
    // For now, learning happens directly in LanguageCommunicationService
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Throttle updates (default: every 5 seconds)
    if (world.tick - this.lastUpdate < this.updateInterval) {
      return;
    }

    this.lastUpdate = world.tick;

    for (const entity of entities) {
      this.updateLanguageLearning(entity, world);
    }
  }

  /**
   * Update language learning for a single entity
   *
   * Handles:
   * - Proficiency decay for unused non-native languages
   * - Vocabulary consolidation (exposure → proficiency)
   * - Forgetting languages that fall below minimum proficiency
   *
   * @param entity - Entity with LanguageKnowledgeComponent
   * @param world - Game world
   */
  private updateLanguageLearning(entity: Entity, world: World): void {
    const knowledge = entity.getComponent<LanguageKnowledgeComponent>(
      LANGUAGE_KNOWLEDGE_COMPONENT_TYPE
    );

    if (!knowledge) return;

    // Process each known language
    for (const [langId, prof] of knowledge.knownLanguages) {
      // Skip native languages (no decay)
      if (knowledge.nativeLanguages.includes(langId)) {
        continue;
      }

      // Apply decay if language hasn't been used recently
      if (this.enableDecay) {
        const ticksSinceUse = world.tick - prof.lastUsed;

        if (ticksSinceUse > this.decayThreshold) {
          // Apply multiplicative decay
          prof.proficiency *= this.decayRate;

          // Forget language if proficiency drops too low
          if (prof.proficiency < this.minimumProficiency) {
            knowledge.knownLanguages.delete(langId);
            continue; // Skip to next language
          }
        }
      }

      // Consolidate vocabulary learning into proficiency
      // Words with high confidence contribute to proficiency growth
      let consolidatedLearning = 0;
      let totalWords = 0;

      for (const [word, learning] of prof.vocabularyLearning) {
        totalWords++;
        if (learning.confidence > 0.7) {
          consolidatedLearning += learning.confidence;
        }
      }

      // Update proficiency based on vocabulary mastery
      if (totalWords > 0) {
        const masteryRatio = consolidatedLearning / totalWords;

        // Proficiency grows toward mastery ratio (slow convergence)
        const learningRate = 0.001; // 0.1% per update
        prof.proficiency += (masteryRatio - prof.proficiency) * learningRate;

        // Clamp to [0, 1]
        prof.proficiency = Math.max(0, Math.min(1, prof.proficiency));
      }

      // Update words known based on confident vocabulary
      prof.wordsKnown = Array.from(prof.vocabularyLearning.values()).filter(
        (v) => v.confidence > 0.5
      ).length;
    }

    // Update total words learned
    knowledge.totalWordsLearned = Array.from(knowledge.knownLanguages.values()).reduce(
      (sum, prof) => sum + prof.wordsKnown,
      0
    );
  }

  /**
   * Force update for a specific entity (bypass throttling)
   *
   * Useful for testing or immediate updates after conversation.
   *
   * @param entity - Entity to update
   * @param world - Game world
   */
  forceUpdate(entity: Entity, world: World): void {
    this.updateLanguageLearning(entity, world);
  }

  /**
   * Get system statistics
   *
   * @param world - Game world
   * @returns System statistics
   */
  getStats(world: World): {
    totalAgentsWithLanguages: number;
    totalLanguagesKnown: number;
    averageLanguagesPerAgent: number;
    averageProficiency: number;
  } {
    const entities = world
      .query()
      .with(LANGUAGE_KNOWLEDGE_COMPONENT_TYPE)
      .executeEntities();

    let totalLanguages = 0;
    let totalProficiency = 0;
    let proficiencyCount = 0;

    for (const entity of entities) {
      const knowledge = entity.getComponent<LanguageKnowledgeComponent>(
        LANGUAGE_KNOWLEDGE_COMPONENT_TYPE
      );

      if (!knowledge) continue;

      totalLanguages += knowledge.knownLanguages.size;

      for (const prof of knowledge.knownLanguages.values()) {
        totalProficiency += prof.proficiency;
        proficiencyCount++;
      }
    }

    return {
      totalAgentsWithLanguages: entities.length,
      totalLanguagesKnown: totalLanguages,
      averageLanguagesPerAgent:
        entities.length > 0 ? totalLanguages / entities.length : 0,
      averageProficiency:
        proficiencyCount > 0 ? totalProficiency / proficiencyCount : 0,
    };
  }
}
