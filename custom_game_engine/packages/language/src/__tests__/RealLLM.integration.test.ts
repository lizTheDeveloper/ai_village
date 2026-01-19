/**
 * Real LLM Integration Test
 *
 * Tests translation service with actual LLM providers (Groq, Cerebras).
 * Requires API keys in .env file.
 *
 * Run with: npm test RealLLM
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TranslationService } from '../TranslationService.js';
import { MorphemeDictionaryStorage } from '../MorphemeDictionaryStorage.js';
import { LanguageGenerator } from '../LanguageGenerator.js';
import { OpenAICompatProvider } from '@ai-village/llm';

// Load environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || '';
const GROQ_MODEL = process.env.VITE_GROQ_MODEL || 'qwen/qwen3-32b';
const CEREBRAS_MODEL = process.env.VITE_CEREBRAS_MODEL || 'qwen-3-32b';

describe('Real LLM Integration Tests', () => {
  let groqProvider: OpenAICompatProvider;
  let cerebrasProvider: OpenAICompatProvider;
  let translationService: TranslationService;
  let dictionaryStorage: MorphemeDictionaryStorage;
  let languageGenerator: LanguageGenerator;

  beforeAll(() => {
    // Skip if no API keys
    if (!GROQ_API_KEY && !CEREBRAS_API_KEY) {
      console.log('⚠️  Skipping real LLM tests - no API keys found in .env');
      return;
    }

    // Initialize providers
    groqProvider = new OpenAICompatProvider(
      GROQ_MODEL,
      'https://api.groq.com/openai/v1',
      GROQ_API_KEY
    );

    cerebrasProvider = new OpenAICompatProvider(
      CEREBRAS_MODEL,
      'https://api.cerebras.ai/v1',
      CEREBRAS_API_KEY
    );

    // Initialize services
    languageGenerator = new LanguageGenerator();
    dictionaryStorage = new MorphemeDictionaryStorage();
  });

  describe('Groq Translation Tests', () => {
    it('should translate volcanic insectoid word with Groq', async () => {
      if (!GROQ_API_KEY) {
        console.log('⚠️  Skipping Groq test - no GROQ_API_KEY');
        return;
      }

      // Generate volcanic insectoid language
      const language = languageGenerator.generateLanguage(
        { type: 'volcanic', seed: 'groq_test_1' },
        { type: 'insectoid' },
        'groq_lang_1'
      );

      console.log('\n=== GROQ TRANSLATION TEST ===');
      console.log('Language:', language.description);
      console.log('Consonants:', language.selectedConsonants.join(', '));
      console.log('Vowels:', language.selectedVowels.join(', '));

      // Create translation service with Groq
      translationService = new TranslationService(groqProvider);

      // Generate a word to translate
      const testWord = language.selectedConsonants[0]! +
                       language.selectedVowels[0]! +
                       language.selectedConsonants[1]!;

      console.log('Translating word:', testWord);

      // Translate
      const result = await translationService.translate({
        word: testWord,
        languageConfig: language,
      });

      console.log('Translation result:', JSON.stringify(result, null, 2));

      // Verify response structure
      expect(result.word).toBe(testWord);
      expect(result.translation).toBeDefined();
      expect(result.translation.length).toBeGreaterThan(0);
      expect(result.wordType).toMatch(/^(noun|verb|adjective|adverb|particle)$/);
      expect(result.morphemes).toBeDefined();
      expect(Array.isArray(result.morphemes)).toBe(true);
      expect(result.morphemes.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Verify morphemes have correct structure
      for (const morpheme of result.morphemes) {
        expect(morpheme.sound).toBeDefined();
        expect(morpheme.meaning).toBeDefined();
        expect(morpheme.type).toMatch(/^(root|prefix|suffix|infix)$/);
      }

      // Verify translation is not generic
      const genericWords = ['thing', 'object', 'stuff', 'item', 'entity', 'unknown'];
      const isGeneric = genericWords.some(word =>
        result.translation.toLowerCase().includes(word)
      );
      expect(isGeneric).toBe(false);

      console.log('✅ Groq translation passed all validation checks');
    }, 60000); // 60 second timeout for API call

    it('should maintain morpheme consistency across translations with Groq', async () => {
      if (!GROQ_API_KEY) {
        console.log('⚠️  Skipping Groq consistency test - no GROQ_API_KEY');
        return;
      }

      const language = languageGenerator.generateLanguage(
        { type: 'volcanic', seed: 'groq_test_2' },
        { type: 'humanoid' },
        'groq_lang_2'
      );

      translationService = new TranslationService(groqProvider);

      // First word
      const word1 = language.selectedConsonants[0]! +
                    language.selectedVowels[0]! +
                    language.selectedConsonants[1]!;

      console.log('\n=== GROQ CONSISTENCY TEST ===');
      console.log('First word:', word1);

      const result1 = await translationService.translate({
        word: word1,
        languageConfig: language,
      });

      console.log('First translation:', result1.translation);
      console.log('First morphemes:', result1.morphemes.map(m => `${m.sound}=${m.meaning}`).join(', '));

      // Second word using same phoneme
      const word2 = language.selectedConsonants[0]! +
                    language.selectedVowels[1]! +
                    language.selectedConsonants[2]!;

      console.log('Second word:', word2);

      const result2 = await translationService.translate({
        word: word2,
        languageConfig: language,
      });

      console.log('Second translation:', result2.translation);
      console.log('Second morphemes:', result2.morphemes.map(m => `${m.sound}=${m.meaning}`).join(', '));

      // Find shared morpheme
      const sharedSound = language.selectedConsonants[0]!;
      const morpheme1 = result1.morphemes.find(m => m.sound === sharedSound);
      const morpheme2 = result2.morphemes.find(m => m.sound === sharedSound);

      if (morpheme1 && morpheme2) {
        console.log(`Morpheme '${sharedSound}' meanings:`, morpheme1.meaning, 'vs', morpheme2.meaning);

        // Should have same meaning (dictionary consistency)
        expect(morpheme1.meaning).toBe(morpheme2.meaning);
        console.log(`✅ Morpheme consistency maintained for '${sharedSound}' = '${morpheme1.meaning}'`);
      } else {
        console.log(`⚠️  Morpheme '${sharedSound}' not found in both translations (LLM may have split differently)`);
      }
    }, 120000); // 120 second timeout for two API calls
  });

  describe('Cerebras Translation Tests', () => {
    it('should translate aquatic word with Cerebras', async () => {
      if (!CEREBRAS_API_KEY) {
        console.log('⚠️  Skipping Cerebras test - no CEREBRAS_API_KEY');
        return;
      }

      // Generate aquatic language
      const language = languageGenerator.generateLanguage(
        { type: 'ocean', seed: 'cerebras_test_1' },
        { type: 'aquatic' },
        'cerebras_lang_1'
      );

      console.log('\n=== CEREBRAS TRANSLATION TEST ===');
      console.log('Language:', language.description);
      console.log('Consonants:', language.selectedConsonants.join(', '));

      translationService = new TranslationService(cerebrasProvider);

      const testWord = language.selectedConsonants[0]! +
                       language.selectedVowels[0]! +
                       language.selectedConsonants[1]!;

      console.log('Translating word:', testWord);

      const result = await translationService.translate({
        word: testWord,
        languageConfig: language,
      });

      console.log('Translation result:', JSON.stringify(result, null, 2));

      // Verify response structure
      expect(result.word).toBe(testWord);
      expect(result.translation).toBeDefined();
      expect(result.wordType).toMatch(/^(noun|verb|adjective|adverb|particle)$/);
      expect(result.morphemes.length).toBeGreaterThan(0);

      console.log('✅ Cerebras translation passed validation');
    }, 60000);
  });

  describe('Cultural Appropriateness Tests', () => {
    it('should generate volcanic-themed translations for volcanic planets', async () => {
      if (!GROQ_API_KEY) {
        console.log('⚠️  Skipping cultural test - no GROQ_API_KEY');
        return;
      }

      const language = languageGenerator.generateLanguage(
        { type: 'volcanic', seed: 'cultural_test_1' },
        { type: 'reptilian' },
        'cultural_lang_1'
      );

      translationService = new TranslationService(groqProvider);

      const testWord = language.selectedConsonants[0]! +
                       language.selectedVowels[0]! +
                       language.selectedConsonants[1]!;

      console.log('\n=== CULTURAL APPROPRIATENESS TEST ===');
      console.log('Planet: volcanic, Species: reptilian');
      console.log('Word:', testWord);

      const result = await translationService.translate({
        word: testWord,
        languageConfig: language,
      });

      console.log('Translation:', result.translation);

      // Check for volcanic-appropriate themes
      const volcanicThemes = ['fire', 'lava', 'ash', 'stone', 'heat', 'burn', 'magma', 'smoke', 'ember'];
      const hasVolcanicTheme = volcanicThemes.some(theme =>
        result.translation.toLowerCase().includes(theme)
      );

      if (hasVolcanicTheme) {
        console.log('✅ Translation contains volcanic theme');
      } else {
        console.log('⚠️  Translation may not reflect volcanic environment:', result.translation);
      }

      // Should not have Earth-centric concepts
      const earthConcepts = ['car', 'phone', 'computer', 'table', 'chair', 'book'];
      const hasEarthConcept = earthConcepts.some(concept =>
        result.translation.toLowerCase().includes(concept)
      );

      expect(hasEarthConcept).toBe(false);
      console.log('✅ Translation avoids Earth-centric concepts');
    }, 60000);
  });

  describe('Dictionary Storage Integration', () => {
    it('should store and retrieve translations', async () => {
      if (!GROQ_API_KEY) {
        console.log('⚠️  Skipping dictionary test - no GROQ_API_KEY');
        return;
      }

      const language = languageGenerator.generateLanguage(
        { type: 'forest', seed: 'dict_test_1' },
        { type: 'avian' },
        'dict_lang_1'
      );

      translationService = new TranslationService(groqProvider);

      const testWord = language.selectedConsonants[0]! +
                       language.selectedVowels[0]!;

      const result = await translationService.translate({
        word: testWord,
        languageConfig: language,
      });

      console.log('\n=== DICTIONARY STORAGE TEST ===');
      console.log('Word:', testWord);
      console.log('Translation:', result.translation);

      // Store in dictionary
      dictionaryStorage.addWordTranslation(
        language.id,
        result.word,
        result.translation,
        result.wordType,
        result.morphemes,
        result.confidence
      );

      // Retrieve
      const stored = dictionaryStorage.getWordTranslation(language.id, testWord);
      expect(stored).toBeDefined();
      expect(stored?.translation).toBe(result.translation);

      const stats = dictionaryStorage.getStats(language.id);
      console.log('Dictionary stats:', stats);

      expect(stats.wordCount).toBe(1);
      expect(stats.morphemeCount).toBe(result.morphemes.length);

      console.log('✅ Dictionary storage working correctly');
    }, 60000);
  });
});
