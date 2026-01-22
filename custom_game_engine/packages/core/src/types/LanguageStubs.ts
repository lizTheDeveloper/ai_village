/**
 * Language Component Stub Types
 *
 * Minimal interface definitions for language-related components
 * to avoid circular dependencies with @ai-village/language package.
 *
 * These types are compatible with the full implementations in @ai-village/language
 * but only include the fields needed by core package code.
 */

import type { ComponentBase } from '../ecs/Component.js';

/**
 * Stub for LanguageComponent - represents an agent's native language
 */
export interface LanguageComponentStub extends ComponentBase {
  type: 'language';
  /** The language's unique ID */
  languageId: string;
  /** Known vocabulary: concept -> word data */
  knownWords: Map<string, { word: string; confidence?: number }>;
}

/**
 * Stub for LanguageKnowledgeComponent - represents an agent's knowledge of languages
 */
export interface LanguageKnowledgeComponentStub extends ComponentBase {
  type: 'language_knowledge';
  /** Known languages: languageId -> proficiency data */
  knownLanguages?: Map<string, {
    proficiency: number;
    fluent?: boolean;
    /** Vocabulary learned: word -> meaning data */
    vocabularyLearning?: Map<string, { inferredMeaning?: string }>;
  }>;
  /** Native languages the agent speaks (array of language IDs) */
  nativeLanguages?: string[];
}

// Re-export with original names for compatibility
export type LanguageComponent = LanguageComponentStub;
export type LanguageKnowledgeComponent = LanguageKnowledgeComponentStub;
