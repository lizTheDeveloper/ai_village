/**
 * Language Communication Service (Refactored)
 *
 * LLMs always think in English. Translation happens at message boundaries.
 *
 * Flow:
 * 1. Agent LLM speaks in English: "The fire burns bright"
 * 2. System translates to alien: "The xak burns grü"
 * 3. Listeners receive based on proficiency:
 *    - Fluent → English: "The fire burns bright"
 *    - Partial → Mixed: "The xak burns bright"
 *    - None → Alien: "The xak burns grü"
 * 4. User always sees alien with hover tooltips
 *
 * This prevents semantic grounding issues with LLMs.
 */

import type { LLMProvider } from '@ai-village/llm';
import { TranslationService, type TranslationResponse } from './TranslationService.js';
import { TraceryGrammarBuilder } from './TraceryGrammarBuilder.js';
import type { LanguageComponent } from './LanguageComponent.js';
import type { LanguageKnowledgeComponent } from './LanguageKnowledgeComponent.js';
import {
  getProficiency,
  recordWordExposure,
  updateProficiency,
  getWordMeaning,
  setWordMeaning,
} from './LanguageKnowledgeComponent.js';
import {
  addWordToLanguage,
  getWordFromLanguage,
  hasWordInLanguage,
} from './LanguageComponent.js';

/**
 * Translated message with comprehension info
 */
export interface TranslatedMessage {
  original: string;              // Original alien text
  translated: string;            // Fully translated text
  comprehension: number;         // 0-1 how much listener understood
  unknownWords: string[];        // Words listener doesn't know
  partialTranslation?: string;   // If low proficiency, partial/garbled translation
}

/**
 * Alien phrase generated from a concept
 */
export interface AlienPhrase {
  concept: string;               // English concept
  alienWords: string[];          // Alien words expressing this concept
  fullPhrase: string;            // Complete alien phrase
  wordBreakdown: TranslationResponse[]; // Detailed translation info
}

/**
 * Translation cache for a specific language
 */
interface TranslationCache {
  // Compiled regex patterns (concept → pattern)
  patterns: Map<string, RegExp>;
  // Reverse lookup (alien word → english concept)
  reverseLookup: Map<string, string>;
  // Last vocabulary size (to detect changes)
  lastVocabSize: number;
}

/**
 * Language communication service
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Cached RegExp patterns (no recompilation)
 * - Reverse lookup cache (alien → english)
 * - Minimized string operations
 * - Pre-allocated arrays
 */
export class LanguageCommunicationService {
  private translationService: TranslationService;
  private grammarBuilder: TraceryGrammarBuilder;

  // Performance: Cache per language ID
  private translationCaches: Map<string, TranslationCache>;

  constructor(llmProvider: LLMProvider) {
    this.translationService = new TranslationService(llmProvider);
    this.grammarBuilder = new TraceryGrammarBuilder();
    this.translationCaches = new Map();
  }

  /**
   * Get or create translation cache for a language
   * Invalidates cache if vocabulary has changed
   *
   * PERFORMANCE: Caches compiled RegExp and reverse lookups
   */
  private getTranslationCache(language: LanguageComponent): TranslationCache {
    const currentVocabSize = language.knownWords.size;
    let cache = this.translationCaches.get(language.languageId);

    // Create new cache or invalidate if vocabulary changed
    if (!cache || cache.lastVocabSize !== currentVocabSize) {
      cache = {
        patterns: new Map(),
        reverseLookup: new Map(),
        lastVocabSize: currentVocabSize,
      };

      // Pre-compute patterns and reverse lookup
      for (const [concept, wordData] of language.knownWords) {
        // Compile pattern once
        const pattern = new RegExp(`\\b${this.escapeRegex(concept)}\\b`, 'gi');
        cache.patterns.set(concept, pattern);

        // Build reverse lookup
        cache.reverseLookup.set(wordData.word.toLowerCase(), concept);
      }

      this.translationCaches.set(language.languageId, cache);
    }

    return cache;
  }

  // ==================== NEW POST-HOC TRANSLATION METHODS ====================

  /**
   * Translate English text to alien language (POST-HOC)
   *
   * This is the new approach: LLM outputs English, we translate it after.
   *
   * @param englishText - Text from LLM (in English)
   * @param speakerLanguage - Speaker's language
   * @returns Alien text with known words replaced
   *
   * @example
   * ```typescript
   * const english = "The fire burns bright tonight";
   * const alien = await translateEnglishToAlien(english, volcanoLanguage);
   * // Returns: "The xak burns grü tonight"
   * ```
   */
  async translateEnglishToAlien(
    englishText: string,
    speakerLanguage: LanguageComponent
  ): Promise<string> {
    const cache = this.getTranslationCache(speakerLanguage);

    if (cache.patterns.size === 0) {
      return englishText; // No vocabulary, return unchanged
    }

    let alienText = englishText;

    // Sort concepts by length (longest first) to handle compound words
    const sortedConcepts = Array.from(speakerLanguage.knownWords.keys())
      .sort((a, b) => b.length - a.length);

    // PERFORMANCE: Use cached patterns (no RegExp recompilation)
    for (const concept of sortedConcepts) {
      const pattern = cache.patterns.get(concept)!;
      const wordData = speakerLanguage.knownWords.get(concept)!;

      // Reset regex state (important for 'g' flag)
      pattern.lastIndex = 0;
      alienText = alienText.replace(pattern, wordData.word);
    }

    return alienText;
  }

  /**
   * Prepare message for listener based on their proficiency
   *
   * This determines what the LISTENER'S LLM sees.
   *
   * @param originalEnglish - Original English from speaker's LLM
   * @param alienText - Alien translation
   * @param sourceLanguageId - Speaker's language ID
   * @param listenerKnowledge - Listener's language knowledge
   * @param currentTick - Current game tick
   * @returns Text appropriate for listener's LLM
   *
   * @example
   * ```typescript
   * const english = "The fire burns bright";
   * const alien = "The xak burns grü";
   *
   * // Fluent listener sees English
   * prepareMessageForListener(english, alien, langId, fluentListener, tick);
   * // → "The fire burns bright"
   *
   * // Non-speaker sees alien
   * prepareMessageForListener(english, alien, langId, nonSpeaker, tick);
   * // → "The xak burns grü"
   * ```
   */
  prepareMessageForListener(
    originalEnglish: string,
    alienText: string,
    sourceLanguageId: string,
    listenerKnowledge: LanguageKnowledgeComponent,
    currentTick: number
  ): string {
    const proficiency = getProficiency(listenerKnowledge, sourceLanguageId);

    // Fluent (≥90%) → see English (full comprehension)
    if (proficiency >= 0.9) {
      return originalEnglish;
    }

    // None (<10%) → see alien (incomprehensible)
    if (proficiency < 0.1) {
      // Record exposure for learning
      recordWordExposure(
        listenerKnowledge,
        sourceLanguageId,
        alienText,
        alienText,
        currentTick
      );
      updateProficiency(listenerKnowledge, sourceLanguageId);

      return alienText;
    }

    // Partial (10-90%) → see mixed translation
    return this.createPartialTranslation(
      originalEnglish,
      alienText,
      proficiency,
      sourceLanguageId,
      listenerKnowledge,
      currentTick
    );
  }

  /**
   * Create partial translation for intermediate proficiency
   *
   * Mix of alien and English based on proficiency level.
   *
   * PERFORMANCE: Pre-allocated arrays, minimized string ops
   *
   * @param originalEnglish - Original English text
   * @param alienText - Full alien translation
   * @param proficiency - Listener's proficiency (0.1-0.9)
   * @param sourceLanguageId - Language ID
   * @param listenerKnowledge - Listener's knowledge
   * @param currentTick - Current tick
   * @returns Mixed translation
   */
  private createPartialTranslation(
    originalEnglish: string,
    alienText: string,
    proficiency: number,
    sourceLanguageId: string,
    listenerKnowledge: LanguageKnowledgeComponent,
    currentTick: number
  ): string {
    // Split only once
    const englishWords = originalEnglish.split(/\s+/);
    const alienWords = alienText.split(/\s+/);
    const maxLen = Math.max(englishWords.length, alienWords.length);

    // PERFORMANCE: Pre-allocate result array (faster than push)
    const mixedWords: string[] = new Array(maxLen);

    for (let i = 0; i < maxLen; i++) {
      const englishWord = englishWords[i];
      const alienWord = alienWords[i];

      if (!alienWord || !englishWord) {
        mixedWords[i] = alienWord || englishWord || '';
        continue;
      }

      // If alien word differs from English, check if listener knows it
      if (alienWord !== englishWord) {
        const meaning = getWordMeaning(listenerKnowledge, sourceLanguageId, alienWord);

        if (meaning) {
          // Listener knows this word → use English
          mixedWords[i] = englishWord;
        } else {
          // Listener doesn't know this word → keep alien
          mixedWords[i] = alienWord;

          // Record exposure for learning
          recordWordExposure(
            listenerKnowledge,
            sourceLanguageId,
            alienWord,
            alienText,
            currentTick
          );
        }
      } else {
        // Same word in both → use English
        mixedWords[i] = englishWord;
      }
    }

    // PERFORMANCE: Single proficiency update at end (not per word)
    updateProficiency(listenerKnowledge, sourceLanguageId);

    // Join once at end
    return mixedWords.join(' ');
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ==================== LEGACY METHODS (Keep for compatibility) ====================

  /**
   * Generate alien phrase for a concept in a specific language
   *
   * LEGACY: This is the old approach where we generate alien words pre-prompt.
   * Still useful for vocabulary initialization.
   *
   * @param concept - English concept to express
   * @param languageComponent - Speaker's language
   * @param currentTick - Current game tick (for context)
   * @returns Alien phrase with translation breakdown
   */
  async generateAlienPhrase(
    concept: string,
    languageComponent: LanguageComponent,
    currentTick?: number
  ): Promise<AlienPhrase> {
    // Check if we already have a translation for this concept
    if (hasWordInLanguage(languageComponent, concept)) {
      const existing = getWordFromLanguage(languageComponent, concept)!;
      return {
        concept,
        alienWords: [existing.word],
        fullPhrase: existing.word,
        wordBreakdown: [
          {
            word: existing.word,
            translation: existing.translation,
            wordType: existing.wordType as 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle',
            morphemes: existing.morphemes,
            confidence: existing.confidence,
          },
        ],
      };
    }

    // Generate new translation
    const translation = await this.translationService.translate({
      word: this.generateWordFromConcept(concept, languageComponent),
      languageConfig: languageComponent.languageConfig,
    });

    // Store in language dictionary for future reuse
    addWordToLanguage(languageComponent, concept, {
      word: translation.word,
      translation: translation.translation,
      wordType: translation.wordType,
      morphemes: translation.morphemes,
      confidence: translation.confidence,
      timestamp: currentTick ?? Date.now(),
    });

    return {
      concept,
      alienWords: [translation.word],
      fullPhrase: translation.word,
      wordBreakdown: [translation],
    };
  }

  /**
   * Generate an alien word using Tracery from a concept
   *
   * @param concept - English concept
   * @param languageComponent - Language to generate in
   * @returns Generated alien word
   */
  private generateWordFromConcept(
    concept: string,
    languageComponent: LanguageComponent
  ): string {
    const grammar = this.grammarBuilder.buildGrammar(languageComponent.languageConfig);
    return this.grammarBuilder.generateWord(grammar);
  }

  /**
   * Translate a message from source language to target language
   *
   * LEGACY: This is for the old flow. Kept for backwards compatibility.
   *
   * @param message - Original alien text
   * @param sourceLanguage - Speaker's language
   * @param listenerKnowledge - Listener's language knowledge
   * @param currentTick - Current game tick
   * @returns Translated message with comprehension info
   */
  translateMessage(
    message: string,
    sourceLanguage: LanguageComponent,
    listenerKnowledge: LanguageKnowledgeComponent,
    currentTick: number
  ): TranslatedMessage {
    const proficiency = getProficiency(listenerKnowledge, sourceLanguage.languageId);

    // Native/fluent speakers understand everything
    if (proficiency >= 0.9) {
      return {
        original: message,
        translated: this.lookupTranslation(message, sourceLanguage),
        comprehension: 1.0,
        unknownWords: [],
      };
    }

    // No knowledge = no comprehension
    if (proficiency < 0.1) {
      // Still record exposure for learning
      recordWordExposure(
        listenerKnowledge,
        sourceLanguage.languageId,
        message,
        message, // Full message as context
        currentTick
      );
      updateProficiency(listenerKnowledge, sourceLanguage.languageId);

      return {
        original: message,
        translated: '[incomprehensible alien sounds]',
        comprehension: 0.0,
        unknownWords: [message],
        partialTranslation: undefined,
      };
    }

    // Partial comprehension
    const words = this.splitIntoWords(message);
    const unknownWords: string[] = [];
    const knownWords: string[] = [];

    for (const word of words) {
      const meaning = getWordMeaning(listenerKnowledge, sourceLanguage.languageId, word);
      if (meaning) {
        knownWords.push(meaning);
      } else {
        unknownWords.push(word);
        knownWords.push('???');

        // Record exposure for learning
        recordWordExposure(
          listenerKnowledge,
          sourceLanguage.languageId,
          word,
          message,
          currentTick
        );
      }
    }

    // Update proficiency based on vocabulary growth
    updateProficiency(listenerKnowledge, sourceLanguage.languageId);

    const partialTranslation = knownWords.join(' ');
    const fullTranslation = this.lookupTranslation(message, sourceLanguage);

    return {
      original: message,
      translated: fullTranslation,
      comprehension: proficiency,
      unknownWords,
      partialTranslation,
    };
  }

  /**
   * Look up full translation of alien text in language dictionary
   *
   * @param alienText - Alien words
   * @param language - Language component
   * @returns English translation if found, or alien text if not
   */
  private lookupTranslation(alienText: string, language: LanguageComponent): string {
    // Look through known words to find translation
    for (const [concept, wordData] of language.knownWords.entries()) {
      if (wordData.word === alienText) {
        return wordData.translation;
      }
    }

    // Not found, return original
    return alienText;
  }

  /**
   * Split alien text into individual words
   *
   * Simple space-based splitting for now.
   * Future: Handle compound words, morpheme boundaries, etc.
   *
   * @param text - Alien text
   * @returns Array of words
   */
  private splitIntoWords(text: string): string[] {
    return text.split(/\s+/).filter(w => w.length > 0);
  }

  /**
   * Set word meaning for a learned word
   *
   * @param listenerKnowledge - Listener's language knowledge
   * @param languageId - Language the word belongs to
   * @param word - Alien word
   * @param meaning - English meaning
   */
  learnWordMeaning(
    listenerKnowledge: LanguageKnowledgeComponent,
    languageId: string,
    word: string,
    meaning: string
  ): void {
    setWordMeaning(listenerKnowledge, languageId, word, meaning);
    updateProficiency(listenerKnowledge, languageId);
  }

  /**
   * Calculate comprehension percentage for display
   *
   * @param proficiency - Listener's proficiency (0-1)
   * @returns Comprehension percentage (0-100)
   */
  getComprehensionPercentage(proficiency: number): number {
    return Math.round(proficiency * 100);
  }

  /**
   * Format message for display based on comprehension
   *
   * @param translatedMessage - Translated message with comprehension info
   * @returns Formatted message for UI
   */
  formatMessageForDisplay(translatedMessage: TranslatedMessage): string {
    const comprehensionPct = this.getComprehensionPercentage(translatedMessage.comprehension);

    if (translatedMessage.comprehension >= 0.9) {
      // Full understanding
      return translatedMessage.translated;
    } else if (translatedMessage.comprehension >= 0.3) {
      // Partial understanding
      return `${translatedMessage.partialTranslation} [${comprehensionPct}% understood]`;
    } else {
      // Minimal understanding
      return `${translatedMessage.original} [incomprehensible]`;
    }
  }

  // ==================== PERFORMANCE: CACHE MANAGEMENT ====================

  /**
   * Clear all translation caches
   *
   * Call when languages are deleted or for memory cleanup
   */
  clearCaches(): void {
    this.translationCaches.clear();
  }

  /**
   * Clear cache for specific language
   *
   * Call when language vocabulary is manually updated
   */
  clearLanguageCache(languageId: string): void {
    this.translationCaches.delete(languageId);
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    cachedLanguages: number;
    totalPatterns: number;
    totalReverseLookups: number;
  } {
    let totalPatterns = 0;
    let totalReverseLookups = 0;

    for (const cache of this.translationCaches.values()) {
      totalPatterns += cache.patterns.size;
      totalReverseLookups += cache.reverseLookup.size;
    }

    return {
      cachedLanguages: this.translationCaches.size,
      totalPatterns,
      totalReverseLookups,
    };
  }
}
