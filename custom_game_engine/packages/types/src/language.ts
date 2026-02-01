/**
 * Language Component Types
 *
 * Interface definitions for language-related components
 * shared between core and @ai-village/language packages.
 */

import type { ComponentBase } from './common.js';

/**
 * Word data in a language's vocabulary.
 */
export interface WordData {
  word: string;
  confidence?: number;
}

/**
 * Proficiency data for a known language.
 */
export interface LanguageProficiency {
  proficiency: number;
  fluent?: boolean;
  /** Vocabulary learned: word -> meaning data */
  vocabularyLearning?: Map<string, { inferredMeaning?: string }>;
}

/**
 * LanguageComponent - represents an agent's native language.
 */
export interface ILanguageComponent extends ComponentBase {
  type: 'language';
  /** The language's unique ID */
  languageId: string;
  /** Known vocabulary: concept -> word data */
  knownWords: Map<string, WordData>;
}

/**
 * LanguageKnowledgeComponent - represents an agent's knowledge of languages.
 */
export interface ILanguageKnowledgeComponent extends ComponentBase {
  type: 'language_knowledge';
  /** Known languages: languageId -> proficiency data */
  knownLanguages?: Map<string, LanguageProficiency>;
  /** Native languages the agent speaks (array of language IDs) */
  nativeLanguages?: string[];
}

// Type aliases for compatibility
export type LanguageComponent = ILanguageComponent;
export type LanguageKnowledgeComponent = ILanguageKnowledgeComponent;
