/**
 * Morpheme Dictionary Storage
 *
 * Persistent storage for learned morphemes to ensure translation consistency.
 * Morphemes are learned incrementally as the LLM translates words, building
 * a consistent lexicon over time.
 *
 * Storage format: JSON file with morpheme → meaning mappings
 */

import type { Morpheme } from './TranslationService.js';

/**
 * Dictionary entry for a single language
 */
export interface LanguageDictionary {
  languageId: string;          // Unique language ID
  morphemes: Morpheme[];       // All learned morphemes
  wordTranslations: WordTranslation[];  // Complete word translations
  createdAt: number;           // Timestamp
  updatedAt: number;           // Last update timestamp
}

/**
 * Complete word translation (for reference/consistency)
 */
export interface WordTranslation {
  word: string;
  translation: string;
  wordType: string;
  morphemes: Morpheme[];
  confidence: number;
  timestamp: number;
}

/**
 * In-memory morpheme dictionary storage
 *
 * Future: Can be extended to persist to file system or database
 */
export class MorphemeDictionaryStorage {
  private dictionaries: Map<string, LanguageDictionary> = new Map();

  /**
   * Get or create dictionary for a language
   */
  getDictionary(languageId: string): LanguageDictionary {
    if (!this.dictionaries.has(languageId)) {
      this.dictionaries.set(languageId, {
        languageId,
        morphemes: [],
        wordTranslations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return this.dictionaries.get(languageId)!;
  }

  /**
   * Add morphemes to dictionary
   */
  addMorphemes(languageId: string, morphemes: Morpheme[]): void {
    const dict = this.getDictionary(languageId);

    for (const morpheme of morphemes) {
      // Check if morpheme already exists
      const existing = dict.morphemes.find(m => m.sound === morpheme.sound);

      if (!existing) {
        dict.morphemes.push(morpheme);
      } else {
        // Update existing morpheme (in case meaning has been refined)
        existing.meaning = morpheme.meaning;
        existing.type = morpheme.type;
      }
    }

    dict.updatedAt = Date.now();
  }

  /**
   * Add complete word translation
   */
  addWordTranslation(
    languageId: string,
    word: string,
    translation: string,
    wordType: string,
    morphemes: Morpheme[],
    confidence: number
  ): void {
    const dict = this.getDictionary(languageId);

    // Check if word already translated
    const existing = dict.wordTranslations.find(w => w.word === word);

    if (!existing) {
      dict.wordTranslations.push({
        word,
        translation,
        wordType,
        morphemes,
        confidence,
        timestamp: Date.now(),
      });
    } else {
      // Update existing translation
      existing.translation = translation;
      existing.wordType = wordType;
      existing.morphemes = morphemes;
      existing.confidence = confidence;
      existing.timestamp = Date.now();
    }

    // Add morphemes to dictionary
    this.addMorphemes(languageId, morphemes);

    dict.updatedAt = Date.now();
  }

  /**
   * Get all morphemes for a language
   */
  getMorphemes(languageId: string): Morpheme[] {
    const dict = this.getDictionary(languageId);
    return [...dict.morphemes];
  }

  /**
   * Get morpheme by sound
   */
  getMorpheme(languageId: string, sound: string): Morpheme | undefined {
    const dict = this.getDictionary(languageId);
    return dict.morphemes.find(m => m.sound === sound);
  }

  /**
   * Get all word translations for a language
   */
  getWordTranslations(languageId: string): WordTranslation[] {
    const dict = this.getDictionary(languageId);
    return [...dict.wordTranslations];
  }

  /**
   * Get translation for a specific word
   */
  getWordTranslation(languageId: string, word: string): WordTranslation | undefined {
    const dict = this.getDictionary(languageId);
    return dict.wordTranslations.find(w => w.word === word);
  }

  /**
   * Export dictionary to JSON
   */
  exportDictionary(languageId: string): string {
    const dict = this.getDictionary(languageId);
    return JSON.stringify(dict, null, 2);
  }

  /**
   * Import dictionary from JSON
   */
  importDictionary(json: string): void {
    const dict = JSON.parse(json) as LanguageDictionary;
    this.dictionaries.set(dict.languageId, dict);
  }

  /**
   * Clear all dictionaries
   */
  clearAll(): void {
    this.dictionaries.clear();
  }

  /**
   * Clear dictionary for a specific language
   */
  clearDictionary(languageId: string): void {
    this.dictionaries.delete(languageId);
  }

  /**
   * Get dictionary statistics
   */
  getStats(languageId: string): {
    morphemeCount: number;
    wordCount: number;
    avgConfidence: number;
  } {
    const dict = this.getDictionary(languageId);

    const avgConfidence = dict.wordTranslations.length > 0
      ? dict.wordTranslations.reduce((sum, w) => sum + w.confidence, 0) / dict.wordTranslations.length
      : 0;

    return {
      morphemeCount: dict.morphemes.length,
      wordCount: dict.wordTranslations.length,
      avgConfidence,
    };
  }
}
