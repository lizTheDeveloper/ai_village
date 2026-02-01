/**
 * Language Initialization Service
 *
 * Ensures species languages are generated and registered before agents are spawned.
 * This service acts as a bridge between SpeciesRegistry and LanguageRegistry.
 *
 * Usage:
 * ```typescript
 * const service = new LanguageInitializationService(registry);
 * await service.ensureSpeciesLanguage(speciesComponent, llmProvider, world);
 * ```
 */

import type { LLMProvider } from '@ai-village/llm';
import type { LanguageRegistry } from './LanguageRegistry.js';
import type { SpeciesComponent } from '@ai-village/core';
import type { BodyPlan } from './types.js';

/**
 * Minimal interface for planet data to avoid circular dependencies.
 * This matches the structure from @ai-village/types IPlanet.config
 */
interface PlanetConfig {
  type: string;
}

/**
 * Minimal interface for planet to avoid circular dependencies.
 */
interface Planet {
  config: PlanetConfig;
}

/**
 * Minimal world interface to avoid circular dependency with @ai-village/core.
 * Only includes methods needed for language initialization.
 */
export interface LanguageWorldContext {
  /** Get the currently active planet ID */
  getActivePlanetId?(): string | null;
  /** Get a planet by ID */
  getPlanet?(planetId: string): Planet | undefined;
}

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
 * Default species-to-planet-type mapping for fallback when world data is unavailable.
 * Used when no world context is provided or planet has no type.
 */
const DEFAULT_SPECIES_PLANET_MAPPING: Record<string, string> = {
  human: 'forest',
  elf: 'forest',
  dwarf: 'mountain',
  orc: 'desert',
  thrakeen: 'volcanic', // Insectoid traders from harsh lands
  celestial: 'arctic', // Divine cold purity
  aquatic: 'ocean',
};

/**
 * Determines planet type from world data or falls back to species-based inference.
 *
 * Priority:
 * 1. Active planet type from world (if world context provided)
 * 2. Species-based default mapping
 * 3. 'forest' as ultimate fallback
 *
 * @param speciesId - Species identifier for fallback mapping
 * @param world - Optional world context with planet data
 * @returns Planet type string (e.g., 'forest', 'mountain', 'volcanic')
 */
function inferPlanetType(speciesId: string, world?: LanguageWorldContext): string {
  // Try to get planet type from world data
  if (world?.getActivePlanetId && world?.getPlanet) {
    const activePlanetId = world.getActivePlanetId();
    if (activePlanetId) {
      const planet = world.getPlanet(activePlanetId);
      if (planet?.config?.type) {
        return planet.config.type;
      }
    }
  }

  // Fall back to species-based mapping
  return DEFAULT_SPECIES_PLANET_MAPPING[speciesId] || 'forest';
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
   * @param world - Optional world context for planet type inference
   * @returns Language ID (same as species.nativeLanguageId)
   *
   * @example
   * ```typescript
   * const service = new LanguageInitializationService(registry);
   * // With world context for accurate planet type:
   * const languageId = await service.ensureSpeciesLanguage(humanSpecies, llmProvider, world);
   * // Or without (uses species-based defaults):
   * const languageId = await service.ensureSpeciesLanguage(humanSpecies, llmProvider);
   * // languageId = 'common_tongue'
   * ```
   */
  async ensureSpeciesLanguage(
    species: SpeciesComponent,
    llmProvider?: LLMProvider,
    world?: LanguageWorldContext
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
    const planetType = inferPlanetType(species.speciesId, world);

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
   * @param world - Optional world context for planet type inference
   * @returns Array of language IDs that were initialized
   */
  async ensureMultipleSpeciesLanguages(
    speciesList: SpeciesComponent[],
    llmProvider?: LLMProvider,
    world?: LanguageWorldContext
  ): Promise<string[]> {
    const languageIds: string[] = [];

    for (const species of speciesList) {
      const languageId = await this.ensureSpeciesLanguage(species, llmProvider, world);
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
