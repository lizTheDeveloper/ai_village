/**
 * Language Initialization Service
 *
 * Ensures species languages are generated and registered before agents are spawned.
 * This service acts as a bridge between SpeciesRegistry and LanguageRegistry.
 *
 * Usage:
 * ```typescript
 * const service = new LanguageInitializationService(registry);
 * await service.ensureSpeciesLanguage(speciesComponent, llmProvider);
 * ```
 */

import type { LLMProvider } from '@ai-village/llm';
import type { LanguageRegistry } from './LanguageRegistry.js';
import type { SpeciesComponent } from '@ai-village/core';
import type { BodyPlan } from './types.js';

/**
 * Maps species body plan IDs to language system body plan types
 */
const BODY_PLAN_MAPPING: Record<string, BodyPlan> = {
  humanoid_standard: { type: 'humanoid' },
  insectoid_4arm: { type: 'insectoid' },
  celestial_winged: { type: 'avian' }, // Wings suggest avian phonology
  aquatic_tentacled: { type: 'aquatic' },
  reptilian_scaled: { type: 'reptilian' },
  multi_throated: { type: 'multi_throated' },
  crystalline: { type: 'crystalline' },
};

/**
 * Determines planet type from species characteristics
 * TODO: This should come from the actual world/planet data
 */
function inferPlanetType(speciesId: string): string {
  // For now, default to 'forest' for most species
  // In production, this would query the actual planet/world
  const planetMapping: Record<string, string> = {
    human: 'forest',
    elf: 'forest',
    dwarf: 'mountain',
    orc: 'desert',
    thrakeen: 'volcanic', // Insectoid traders from harsh lands
    celestial: 'arctic', // Divine cold purity
    aquatic: 'ocean',
  };

  return planetMapping[speciesId] || 'forest';
}

/**
 * Language Initialization Service
 *
 * Coordinates language generation for species
 */
export class LanguageInitializationService {
  private languageRegistry: LanguageRegistry;
  private initializationCache: Map<string, boolean> = new Map();

  constructor(languageRegistry: LanguageRegistry) {
    this.languageRegistry = languageRegistry;
  }

  /**
   * Ensure a species language exists in the registry
   *
   * @param species - Species component with nativeLanguageId
   * @param llmProvider - LLM provider for vocabulary initialization
   * @returns Language ID (same as species.nativeLanguageId)
   *
   * @example
   * ```typescript
   * const service = new LanguageInitializationService(registry);
   * const languageId = await service.ensureSpeciesLanguage(humanSpecies, llmProvider);
   * // languageId = 'common_tongue'
   * ```
   */
  async ensureSpeciesLanguage(
    species: SpeciesComponent,
    llmProvider?: LLMProvider
  ): Promise<string | undefined> {
    // Species without native language don't need initialization
    if (!species.nativeLanguageId) {
      return undefined;
    }

    const languageId = species.nativeLanguageId;

    // Check if already initialized
    if (this.initializationCache.has(languageId)) {
      return languageId;
    }

    // Check if language already exists in registry
    const existing = this.languageRegistry.getLanguage(languageId);
    if (existing) {
      this.initializationCache.set(languageId, true);
      return languageId;
    }

    // Generate new language for this species
    const bodyPlan = BODY_PLAN_MAPPING[species.bodyPlanId] || { type: 'humanoid' };
    const planetType = inferPlanetType(species.speciesId);

    await this.languageRegistry.ensureSpeciesLanguage(
      languageId,
      planetType,
      bodyPlan,
      {
        initializeVocabulary: true, // Pre-generate core vocabulary
      }
    );

    this.initializationCache.set(languageId, true);
    return languageId;
  }

  /**
   * Ensure multiple species languages exist
   *
   * Useful for initializing all languages at game start
   *
   * @param speciesList - Array of species components
   * @param llmProvider - LLM provider for vocabulary initialization
   * @returns Array of language IDs that were initialized
   */
  async ensureMultipleSpeciesLanguages(
    speciesList: SpeciesComponent[],
    llmProvider?: LLMProvider
  ): Promise<string[]> {
    const languageIds: string[] = [];

    for (const species of speciesList) {
      const languageId = await this.ensureSpeciesLanguage(species, llmProvider);
      if (languageId) {
        languageIds.push(languageId);
      }
    }

    return languageIds;
  }

  /**
   * Clear initialization cache
   *
   * Use when languages are manually removed from registry
   */
  clearCache(): void {
    this.initializationCache.clear();
  }

  /**
   * Get initialization statistics
   */
  getStats(): {
    cachedLanguages: number;
    registeredLanguages: number;
  } {
    return {
      cachedLanguages: this.initializationCache.size,
      registeredLanguages: this.languageRegistry.getStats().totalLanguages,
    };
  }
}
