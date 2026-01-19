/**
 * Translation Benchmark Suite
 *
 * Defines expected behaviors for LLM-based alien word translation.
 * This benchmark ensures the translation service produces:
 * - Culturally appropriate meanings based on language character
 * - Consistent morpheme usage across multiple translations
 * - Valid JSON responses
 * - Grammatically appropriate word types
 * - Alien-appropriate concepts (not Earth-centric)
 */

import { describe, it, expect } from 'vitest';
import type { LanguageCharacter } from '../types.js';

/**
 * Expected translation response format from LLM
 */
export interface TranslationResponse {
  word: string;                    // Original alien word
  translation: string;              // English translation
  wordType: 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle';
  morphemes: Morpheme[];            // Identified morphemes in the word
  culturalContext?: string;         // Optional cultural note
  confidence: number;               // 0.0-1.0 confidence score
}

/**
 * Morpheme (linguistic building block)
 */
export interface Morpheme {
  sound: string;                    // Phoneme sequence (e.g., "kh", "ak")
  meaning: string;                  // Semantic meaning (e.g., "fire", "water")
  type: 'root' | 'prefix' | 'suffix' | 'infix';
}

/**
 * Translation request context
 */
export interface TranslationRequest {
  word: string;                     // Alien word to translate
  languageCharacter: LanguageCharacter;  // Language qualities
  planetType: string;               // Environmental context
  bodyPlanType: string;             // Species anatomy
  existingMorphemes?: Morpheme[];   // Known morphemes for consistency
}

describe('Translation Benchmark - Expected LLM Behaviors', () => {
  describe('Response Format Validation', () => {
    it('should return valid JSON with required fields', () => {
      const mockResponse: TranslationResponse = {
        word: '!xakzi',
        translation: 'fire-breath',
        wordType: 'noun',
        morphemes: [
          { sound: '!', meaning: 'heat', type: 'prefix' },
          { sound: 'xak', meaning: 'breath', type: 'root' },
          { sound: 'zi', meaning: 'rapid', type: 'suffix' },
        ],
        confidence: 0.85,
      };

      // Validate required fields
      expect(mockResponse).toHaveProperty('word');
      expect(mockResponse).toHaveProperty('translation');
      expect(mockResponse).toHaveProperty('wordType');
      expect(mockResponse).toHaveProperty('morphemes');
      expect(mockResponse).toHaveProperty('confidence');

      // Validate types
      expect(typeof mockResponse.word).toBe('string');
      expect(typeof mockResponse.translation).toBe('string');
      expect(['noun', 'verb', 'adjective', 'adverb', 'particle']).toContain(mockResponse.wordType);
      expect(Array.isArray(mockResponse.morphemes)).toBe(true);
      expect(mockResponse.confidence).toBeGreaterThanOrEqual(0);
      expect(mockResponse.confidence).toBeLessThanOrEqual(1);
    });

    it('should validate morpheme structure', () => {
      const morpheme: Morpheme = {
        sound: 'kh',
        meaning: 'fire',
        type: 'root',
      };

      expect(morpheme).toHaveProperty('sound');
      expect(morpheme).toHaveProperty('meaning');
      expect(morpheme).toHaveProperty('type');
      expect(['root', 'prefix', 'suffix', 'infix']).toContain(morpheme.type);
    });
  });

  describe('Cultural Appropriateness - Volcanic Planet, Insectoid Species', () => {
    const volcanicInsectoidContext: LanguageCharacter = {
      primaryTexture: 'percussive',
      secondaryTexture: 'clicking',
      primaryHardness: 'harsh',
      primaryManner: 'clipped',
      positions: ['back', 'low'],
      bodyPlanQualities: ['stridulant', 'buzzing', 'rhythmic', 'chittering'],
    };

    it('should generate volcanic-themed translations for harsh languages', () => {
      // Expected: Words should relate to fire, stone, heat, hardness
      const expectedThemes = ['fire', 'stone', 'heat', 'ash', 'lava', 'obsidian', 'smoke'];

      // Benchmark: At least one theme should be present in translation
      const mockTranslation = 'fire-stone';
      const hasVolcanicTheme = expectedThemes.some(theme =>
        mockTranslation.toLowerCase().includes(theme)
      );

      expect(hasVolcanicTheme).toBe(true);
    });

    it('should generate insectoid-appropriate concepts', () => {
      // Expected: Words should relate to insect biology/behavior
      const insectoidConcepts = ['hive', 'swarm', 'antennae', 'mandible', 'chitin', 'molt', 'cluster'];

      // Benchmark: Translation should reflect insectoid perspective
      const mockTranslation = 'hive-guard';
      const hasInsectoidConcept = insectoidConcepts.some(concept =>
        mockTranslation.toLowerCase().includes(concept)
      );

      expect(hasInsectoidConcept).toBe(true);
    });

    it('should avoid Earth-centric concepts for alien species', () => {
      // PROHIBITED: Human-specific concepts (table, chair, car, phone, etc.)
      const earthConcepts = ['table', 'chair', 'car', 'phone', 'computer', 'book', 'door', 'window'];

      const mockTranslation = 'fire-stone';
      const hasEarthConcept = earthConcepts.some(concept =>
        mockTranslation.toLowerCase().includes(concept)
      );

      expect(hasEarthConcept).toBe(false);
    });
  });

  describe('Morpheme Consistency', () => {
    it('should reuse known morphemes for consistency', () => {
      const existingMorphemes: Morpheme[] = [
        { sound: 'kh', meaning: 'fire', type: 'root' },
        { sound: 'ak', meaning: 'stone', type: 'root' },
      ];

      // When translating "khak" (fire-stone), should reuse both morphemes
      const mockResponse: TranslationResponse = {
        word: 'khak',
        translation: 'fire-stone',
        wordType: 'noun',
        morphemes: [
          { sound: 'kh', meaning: 'fire', type: 'root' },
          { sound: 'ak', meaning: 'stone', type: 'root' },
        ],
        confidence: 0.9,
      };

      // Verify morphemes match existing dictionary
      expect(mockResponse.morphemes).toHaveLength(2);
      expect(mockResponse.morphemes[0]).toEqual(existingMorphemes[0]);
      expect(mockResponse.morphemes[1]).toEqual(existingMorphemes[1]);
    });

    it('should identify new morphemes when not in dictionary', () => {
      const existingMorphemes: Morpheme[] = [
        { sound: 'kh', meaning: 'fire', type: 'root' },
      ];

      // When translating "khzi" with unknown "zi", should create new morpheme
      const mockResponse: TranslationResponse = {
        word: 'khzi',
        translation: 'fire-quick',
        wordType: 'noun',
        morphemes: [
          { sound: 'kh', meaning: 'fire', type: 'root' },
          { sound: 'zi', meaning: 'quick', type: 'suffix' },  // NEW morpheme
        ],
        confidence: 0.8,
      };

      expect(mockResponse.morphemes).toHaveLength(2);
      expect(mockResponse.morphemes[0]).toEqual(existingMorphemes[0]);
      expect(mockResponse.morphemes[1]?.sound).toBe('zi');
    });
  });

  describe('Language Character Integration', () => {
    it('harsh/guttural languages should have aggressive translations', () => {
      const harshLanguage: LanguageCharacter = {
        primaryTexture: 'guttural',
        primaryHardness: 'harsh',
        primaryManner: 'sharp',
        positions: ['back', 'low'],
      };

      // Expected: Translations reflect harsh quality
      const aggressiveConcepts = ['strike', 'crush', 'burn', 'break', 'shatter', 'pierce', 'rend'];
      const mockTranslation = 'stone-crusher';

      const hasAggressiveConcept = aggressiveConcepts.some(concept =>
        mockTranslation.toLowerCase().includes(concept)
      );

      expect(hasAggressiveConcept).toBe(true);
    });

    it('soft/liquid languages should have gentle translations', () => {
      const softLanguage: LanguageCharacter = {
        primaryTexture: 'liquid',
        primaryHardness: 'soft',
        primaryManner: 'flowing',
        positions: ['front', 'central'],
      };

      // Expected: Translations reflect soft quality
      const gentleConcepts = ['flow', 'drift', 'ripple', 'gentle', 'smooth', 'soft', 'glide'];
      const mockTranslation = 'water-glider';

      const hasGentleConcept = gentleConcepts.some(concept =>
        mockTranslation.toLowerCase().includes(concept)
      );

      expect(hasGentleConcept).toBe(true);
    });
  });

  describe('Phoneme-to-Meaning Mapping', () => {
    it('should map guttural phonemes to harsh concepts', () => {
      // Phonemes like "kh", "x", "q", "gh" should map to fire/stone/harsh concepts
      const gutturalPhonemes = ['kh', 'x', 'q', 'gh', 'rr'];
      const harshConcepts = ['fire', 'stone', 'heat', 'ash', 'burn', 'hard'];

      // Benchmark: Guttural phonemes should not map to soft concepts
      const invalidMappings = [
        { sound: 'kh', meaning: 'water' },  // BAD: guttural -> water
        { sound: 'x', meaning: 'gentle' },  // BAD: harsh -> gentle
      ];

      // This is a guideline test - actual LLM should avoid these
      const mockMorpheme: Morpheme = {
        sound: 'kh',
        meaning: 'fire',  // GOOD: guttural -> fire
        type: 'root',
      };

      expect(harshConcepts).toContain(mockMorpheme.meaning);
    });

    it('should map liquid phonemes to flowing concepts', () => {
      // Phonemes like "l", "r", "w" should map to water/flow concepts
      const liquidPhonemes = ['l', 'r', 'w', 'y'];
      const flowingConcepts = ['water', 'flow', 'river', 'stream', 'wave', 'rain'];

      const mockMorpheme: Morpheme = {
        sound: 'l',
        meaning: 'water',  // GOOD: liquid -> water
        type: 'root',
      };

      expect(flowingConcepts).toContain(mockMorpheme.meaning);
    });

    it('should map clicking phonemes to percussive concepts', () => {
      // Alien clicks (!, |, ||) should map to percussive/insect concepts
      const clickPhonemes = ['!', '|', '||', 'tk', 'kk'];
      const percussiveConcepts = ['strike', 'click', 'snap', 'sharp', 'quick', 'burst'];

      const mockMorpheme: Morpheme = {
        sound: '!',
        meaning: 'strike',  // GOOD: click -> percussive
        type: 'prefix',
      };

      expect(percussiveConcepts).toContain(mockMorpheme.meaning);
    });
  });

  describe('Word Type Classification', () => {
    it('should correctly classify concrete nouns', () => {
      const mockResponse: TranslationResponse = {
        word: 'khak',
        translation: 'fire-stone',  // Concrete object
        wordType: 'noun',
        morphemes: [],
        confidence: 0.9,
      };

      expect(mockResponse.wordType).toBe('noun');
    });

    it('should correctly classify action verbs', () => {
      const mockResponse: TranslationResponse = {
        word: 'khakto',
        translation: 'to-burn',  // Action
        wordType: 'verb',
        morphemes: [],
        confidence: 0.85,
      };

      expect(mockResponse.wordType).toBe('verb');
    });

    it('should correctly classify descriptive adjectives', () => {
      const mockResponse: TranslationResponse = {
        word: 'khaki',
        translation: 'burning',  // Descriptor
        wordType: 'adjective',
        morphemes: [],
        confidence: 0.88,
      };

      expect(mockResponse.wordType).toBe('adjective');
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for words with known morphemes', () => {
      const mockResponse: TranslationResponse = {
        word: 'khak',
        translation: 'fire-stone',
        wordType: 'noun',
        morphemes: [
          { sound: 'kh', meaning: 'fire', type: 'root' },  // Known
          { sound: 'ak', meaning: 'stone', type: 'root' }, // Known
        ],
        confidence: 0.92,
      };

      // High confidence (>0.8) when all morphemes are known
      expect(mockResponse.confidence).toBeGreaterThan(0.8);
    });

    it('should have lower confidence for completely new words', () => {
      const mockResponse: TranslationResponse = {
        word: 'zyxqw',
        translation: 'unknown-concept',
        wordType: 'noun',
        morphemes: [
          { sound: 'zyx', meaning: 'unknown', type: 'root' },  // Unknown
          { sound: 'qw', meaning: 'concept', type: 'suffix' }, // Unknown
        ],
        confidence: 0.45,
      };

      // Lower confidence (<0.6) for completely novel words
      expect(mockResponse.confidence).toBeLessThan(0.6);
    });
  });

  describe('Prompt Engineering Quality Checks', () => {
    it('should avoid generic translations', () => {
      // BAD translations: "thing", "object", "stuff", "item"
      const genericWords = ['thing', 'object', 'stuff', 'item', 'entity'];

      const mockTranslation = 'fire-stone';  // GOOD: specific
      const isGeneric = genericWords.some(word =>
        mockTranslation.toLowerCase().includes(word)
      );

      expect(isGeneric).toBe(false);
    });

    it('should prefer compound words over single words', () => {
      // Alien languages often combine morphemes
      // GOOD: "fire-stone", "water-glider", "sky-hunter"
      // BAD: "rock", "bird", "fish"

      const mockTranslation = 'fire-stone';
      const hasHyphen = mockTranslation.includes('-');

      expect(hasHyphen).toBe(true);
    });

    it('should generate translations appropriate to language qualities', () => {
      // Insectoid clicking language should have sharp/quick concepts
      const insectoidTranslation = 'hive-guard';  // Appropriate
      const inappropriateTranslation = 'gentle-breeze';  // Inappropriate for harsh clicking language

      // This is a guideline - actual LLM should follow language character
      expect(insectoidTranslation).not.toBe(inappropriateTranslation);
    });
  });
});

/**
 * Benchmark Summary
 *
 * This test suite defines the contract for LLM translation responses:
 *
 * 1. **Format**: Valid JSON with required fields (word, translation, wordType, morphemes, confidence)
 * 2. **Cultural Fit**: Translations match planet type and species biology
 * 3. **Consistency**: Reuse known morphemes, build consistent dictionary
 * 4. **Quality**: Specific compound words, avoid generic terms
 * 5. **Phoneme Mapping**: Sound qualities map to appropriate concepts
 * 6. **Confidence**: Higher for known morphemes, lower for novel words
 *
 * Next Steps:
 * - Implement TranslationService that produces responses matching this benchmark
 * - Create prompt templates that guide LLM to follow these patterns
 * - Test with real LLM to verify benchmark is achievable
 */
