/**
 * Language Registry
 *
 * Central singleton registry for managing all languages in the game world.
 * Handles language-species associations and provides language lookup.
 */

import { LanguageGenerator } from './LanguageGenerator.js';
import { createLanguageComponent } from './LanguageComponent.js';
import { VocabularyInitializationService } from './VocabularyInitializationService.js';
import type { LanguageComponent } from './LanguageComponent.js';
import type { BodyPlan } from './types.js';
import type { LLMProvider } from '@ai-village/llm';

/**
 * Language entity representation
 *
 * In the ECS, languages are stored as entities with LanguageComponent.
 * This interface represents the registry's view of a language entity.
 */
export interface LanguageEntity {
  /**
   * ECS entity ID (if integrated with game world)
   * For standalone use, this is the same as languageId
   */
  entityId: string;

  /**
   * Language component data
   */
  component: LanguageComponent;
}

/**
 * Options for generating a species language
 */
export interface GenerateLanguageOptions {
  /**
   * Initialize core vocabulary during generation
   * @default true
   */
  initializeVocabulary?: boolean;

  /**
   * Use essential vocabulary only (planet + body plan specific)
   * If false, uses full core vocabulary (~200 words)
   * @default true
   */
  essentialOnly?: boolean;

  /**
   * Batch size for vocabulary generation
   * @default 10
   */
  batchSize?: number;

  /**
   * Progress callback for vocabulary initialization
   */
  onProgress?: (current: number, total: number, word: string) => void;
}

/**
 * Language Registry
 *
 * Singleton service that manages all languages in the game world.
 * Provides language lookup by ID, species association, and automatic generation.
 */
export class LanguageRegistry {
  private static instance: LanguageRegistry | null = null;

  private languages: Map<string, LanguageEntity>;
  private speciesLanguages: Map<string, string>; // speciesId → languageId
  private commonLanguageId?: string;

  private languageGenerator: LanguageGenerator;
  private vocabularyService: VocabularyInitializationService | null;

  private constructor(llmProvider?: LLMProvider) {
    this.languages = new Map();
    this.speciesLanguages = new Map();
    this.languageGenerator = new LanguageGenerator();
    this.vocabularyService = llmProvider
      ? new VocabularyInitializationService(llmProvider)
      : null;
  }

  /**
   * Get singleton instance
   *
   * @param llmProvider - Optional LLM provider for vocabulary initialization
   * @returns Singleton instance
   */
  static getInstance(llmProvider?: LLMProvider): LanguageRegistry {
    if (!LanguageRegistry.instance) {
      LanguageRegistry.instance = new LanguageRegistry(llmProvider);
    }
    return LanguageRegistry.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    LanguageRegistry.instance = null;
  }

  /**
   * Register a language entity
   *
   * @param entity - Language entity to register
   */
  registerLanguage(entity: LanguageEntity): void {
    this.languages.set(entity.component.languageId, entity);
  }

  /**
   * Get language by ID
   *
   * @param languageId - Language ID
   * @returns Language entity if found, undefined otherwise
   */
  getLanguage(languageId: string): LanguageEntity | undefined {
    return this.languages.get(languageId);
  }

  /**
   * Get language for a species
   *
   * @param speciesId - Species ID
   * @returns Language entity if found, undefined otherwise
   */
  getSpeciesLanguage(speciesId: string): LanguageEntity | undefined {
    const languageId = this.speciesLanguages.get(speciesId);
    if (!languageId) return undefined;
    return this.languages.get(languageId);
  }

  /**
   * Associate a language with a species
   *
   * @param speciesId - Species ID
   * @param languageId - Language ID
   */
  setSpeciesLanguage(speciesId: string, languageId: string): void {
    this.speciesLanguages.set(speciesId, languageId);
  }

  /**
   * Set common/universal language
   *
   * The common language is one that all agents can speak
   * (similar to Common/English in fantasy settings).
   *
   * @param languageId - Language ID
   */
  setCommonLanguage(languageId: string): void {
    this.commonLanguageId = languageId;
  }

  /**
   * Get common language ID
   *
   * @returns Common language ID if set, undefined otherwise
   */
  getCommonLanguageId(): string | undefined {
    return this.commonLanguageId;
  }

  /**
   * Generate language for a species if not exists
   *
   * Automatically creates a language based on planet type and body plan,
   * optionally initializing core vocabulary for naming.
   *
   * @param speciesId - Species ID
   * @param planetType - Planet type for language context
   * @param bodyPlan - Species body plan
   * @param options - Generation options
   * @returns Language entity (existing or newly created)
   */
  async ensureSpeciesLanguage(
    speciesId: string,
    planetType: string,
    bodyPlan: BodyPlan,
    options: GenerateLanguageOptions = {}
  ): Promise<LanguageEntity> {
    // Check if language already exists
    const existing = this.getSpeciesLanguage(speciesId);
    if (existing) return existing;

    const {
      initializeVocabulary = true,
      essentialOnly = true,
      batchSize = 10,
      onProgress,
    } = options;

    // Generate new language
    const languageId = `${speciesId}_language`;
    const seed = `${speciesId}_${planetType}_${bodyPlan.type}`;

    const languageConfig = this.languageGenerator.generateLanguage(
      { type: planetType, seed },
      bodyPlan,
      languageId
    );

    const component = createLanguageComponent(languageId, languageConfig);

    // Initialize vocabulary if requested
    if (initializeVocabulary && this.vocabularyService) {
      await this.vocabularyService.initializeVocabulary(
        component,
        planetType,
        bodyPlan.type,
        {
          essentialOnly,
          batchSize,
          onProgress,
        }
      );
    }

    // Create and register entity
    const entity: LanguageEntity = {
      entityId: languageId,
      component,
    };

    this.registerLanguage(entity);
    this.setSpeciesLanguage(speciesId, languageId);

    return entity;
  }

  /**
   * Get all registered languages
   *
   * @returns Array of all language entities
   */
  getAllLanguages(): LanguageEntity[] {
    return Array.from(this.languages.values());
  }

  /**
   * Get all species-language associations
   *
   * @returns Map of species ID to language ID
   */
  getSpeciesLanguages(): Map<string, string> {
    return new Map(this.speciesLanguages);
  }

  /**
   * Check if a language is registered
   *
   * @param languageId - Language ID
   * @returns True if language exists
   */
  hasLanguage(languageId: string): boolean {
    return this.languages.has(languageId);
  }

  /**
   * Remove a language from the registry
   *
   * WARNING: This does not remove associated entities from the ECS.
   * Use with caution.
   *
   * @param languageId - Language ID
   * @returns True if language was removed
   */
  removeLanguage(languageId: string): boolean {
    // Remove species associations
    for (const [speciesId, langId] of this.speciesLanguages) {
      if (langId === languageId) {
        this.speciesLanguages.delete(speciesId);
      }
    }

    // Clear common language if it's this one
    if (this.commonLanguageId === languageId) {
      this.commonLanguageId = undefined;
    }

    return this.languages.delete(languageId);
  }

  /**
   * Get registry statistics
   *
   * @returns Registry stats
   */
  getStats(): {
    totalLanguages: number;
    speciesWithLanguages: number;
    commonLanguageSet: boolean;
    activeLanguages: number;
    extinctLanguages: number;
  } {
    const active = Array.from(this.languages.values()).filter(
      (lang) => !lang.component.isExtinct
    ).length;

    const extinct = Array.from(this.languages.values()).filter(
      (lang) => lang.component.isExtinct
    ).length;

    return {
      totalLanguages: this.languages.size,
      speciesWithLanguages: this.speciesLanguages.size,
      commonLanguageSet: this.commonLanguageId !== undefined,
      activeLanguages: active,
      extinctLanguages: extinct,
    };
  }
}

/**
 * Get the singleton language registry instance
 *
 * Convenience function for accessing the registry.
 *
 * @param llmProvider - Optional LLM provider for vocabulary initialization
 * @returns Singleton instance
 */
export function getLanguageRegistry(llmProvider?: LLMProvider): LanguageRegistry {
  return LanguageRegistry.getInstance(llmProvider);
}
