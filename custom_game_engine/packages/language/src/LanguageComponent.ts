/**
 * LanguageComponent - Defines an entity's native language
 *
 * Assigns generated alien languages to species, civilizations, or individuals.
 * Stores the language configuration and tracks translated words for consistency.
 */

import type { LanguageConfig } from './types.js';
import type { WordTranslation } from './MorphemeDictionaryStorage.js';

/**
 * Component type string
 */
export const LANGUAGE_COMPONENT_TYPE = 'language' as const;

/**
 * Language component interface
 */
export interface LanguageComponent {
  type: typeof LANGUAGE_COMPONENT_TYPE;
  version: number;

  // Language identity
  languageId: string;           // Unique language ID (from LanguageGenerator)
  languageConfig: LanguageConfig; // Full language configuration

  // Dictionary (for word consistency)
  knownWords: Map<string, WordTranslation>; // concept → word translation

  // Metadata
  speakerCount: number;         // How many entities speak this language
  isCommon: boolean;            // Universal language (like English/Common)
  isExtinct: boolean;           // No longer actively spoken
  createdAt: number;            // Timestamp when language was created
}

/**
 * Create a new LanguageComponent
 *
 * @param languageId - Unique language identifier
 * @param languageConfig - Full language configuration from LanguageGenerator
 * @param options - Optional component fields
 * @returns New LanguageComponent
 */
export function createLanguageComponent(
  languageId: string,
  languageConfig: LanguageConfig,
  options: Partial<LanguageComponent> = {}
): LanguageComponent {
  return {
    type: LANGUAGE_COMPONENT_TYPE,
    version: 1,
    languageId,
    languageConfig,
    knownWords: options.knownWords ?? new Map(),
    speakerCount: options.speakerCount ?? 0,
    isCommon: options.isCommon ?? false,
    isExtinct: options.isExtinct ?? false,
    createdAt: options.createdAt ?? Date.now(),
  };
}

/**
 * Add a word translation to the language dictionary
 *
 * @param component - LanguageComponent
 * @param concept - English concept (e.g., "fire")
 * @param translation - Word translation with morphemes
 */
export function addWordToLanguage(
  component: LanguageComponent,
  concept: string,
  translation: WordTranslation
): void {
  component.knownWords.set(concept, translation);
}

/**
 * Get a word translation from the language dictionary
 *
 * @param component - LanguageComponent
 * @param concept - English concept to lookup
 * @returns Word translation if exists, undefined otherwise
 */
export function getWordFromLanguage(
  component: LanguageComponent,
  concept: string
): WordTranslation | undefined {
  return component.knownWords.get(concept);
}

/**
 * Check if the language has a translation for a concept
 *
 * @param component - LanguageComponent
 * @param concept - English concept to check
 * @returns True if translation exists
 */
export function hasWordInLanguage(
  component: LanguageComponent,
  concept: string
): boolean {
  return component.knownWords.has(concept);
}

/**
 * Get all known concepts in this language
 *
 * @param component - LanguageComponent
 * @returns Array of English concepts that have translations
 */
export function getKnownConcepts(
  component: LanguageComponent
): string[] {
  return Array.from(component.knownWords.keys());
}

/**
 * Get total vocabulary size
 *
 * @param component - LanguageComponent
 * @returns Number of words in the dictionary
 */
export function getVocabularySize(
  component: LanguageComponent
): number {
  return component.knownWords.size;
}

/**
 * Increment speaker count (when an entity starts using this language)
 *
 * @param component - LanguageComponent
 */
export function incrementSpeakerCount(
  component: LanguageComponent
): void {
  component.speakerCount++;
}

/**
 * Decrement speaker count (when an entity stops using this language)
 *
 * @param component - LanguageComponent
 */
export function decrementSpeakerCount(
  component: LanguageComponent
): void {
  component.speakerCount = Math.max(0, component.speakerCount - 1);

  // Mark as extinct if no speakers remain
  if (component.speakerCount === 0) {
    component.isExtinct = true;
  }
}

/**
 * Check if language is actively spoken
 *
 * @param component - LanguageComponent
 * @returns True if language has active speakers
 */
export function isLanguageActive(
  component: LanguageComponent
): boolean {
  return component.speakerCount > 0 && !component.isExtinct;
}

/**
 * Get language description (from character analysis)
 *
 * @param component - LanguageComponent
 * @returns Human-readable language description
 */
export function getLanguageDescription(
  component: LanguageComponent
): string {
  return component.languageConfig.description || 'Unknown language';
}

/**
 * Serialize LanguageComponent for save/load
 *
 * @param component - LanguageComponent
 * @returns Serialized component data
 */
export function serializeLanguageComponent(
  component: LanguageComponent
): Record<string, unknown> {
  return {
    type: component.type,
    version: component.version,
    languageId: component.languageId,
    languageConfig: component.languageConfig,
    knownWords: Array.from(component.knownWords.entries()),
    speakerCount: component.speakerCount,
    isCommon: component.isCommon,
    isExtinct: component.isExtinct,
    createdAt: component.createdAt,
  };
}

/**
 * Deserialize LanguageComponent from save data
 *
 * @param data - Serialized component data
 * @returns Deserialized LanguageComponent
 */
export function deserializeLanguageComponent(
  data: Record<string, unknown>
): LanguageComponent {
  const knownWordsArray = data.knownWords as Array<[string, WordTranslation]>;
  const knownWords = new Map(knownWordsArray);

  return {
    type: LANGUAGE_COMPONENT_TYPE,
    version: data.version as number,
    languageId: data.languageId as string,
    languageConfig: data.languageConfig as LanguageConfig,
    knownWords,
    speakerCount: data.speakerCount as number,
    isCommon: data.isCommon as boolean,
    isExtinct: data.isExtinct as boolean,
    createdAt: data.createdAt as number,
  };
}
