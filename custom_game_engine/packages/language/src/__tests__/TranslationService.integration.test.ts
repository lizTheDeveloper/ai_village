/**
 * Translation Service Integration Tests
 *
 * Tests the full translation pipeline with mock LLM responses
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TranslationService, type TranslationRequest, type TranslationResponse } from '../TranslationService.js';
import { MorphemeDictionaryStorage } from '../MorphemeDictionaryStorage.js';
import { LanguageGenerator } from '../LanguageGenerator.js';
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '@ai-village/llm';

/**
 * Mock LLM Provider for testing
 */
class MockLLMProvider implements LLMProvider {
  private responses: Map<string, string> = new Map();

  /**
   * Add mock response for a specific word
   */
  addMockResponse(word: string, response: TranslationResponse | string): void {
    if (typeof response === 'string') {
      this.responses.set(word, response);  // Already a string (e.g., markdown-wrapped JSON)
    } else {
      this.responses.set(word, JSON.stringify(response));  // Object, needs stringification
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    // Extract word from prompt (look for "Word to Translate" section)
    const wordMatch = request.prompt.match(/\*\*Word\*\*: "([^"]+)"/);
    const word = wordMatch?.[1] || 'unknown';

    const responseText = this.responses.get(word) || JSON.stringify({
      word,
      translation: 'mock-translation',
      wordType: 'noun',
      morphemes: [{ sound: word, meaning: 'mock', type: 'root' }],
      confidence: 0.5,
    });

    return {
      text: responseText,
      inputTokens: request.prompt.length / 4,
      outputTokens: responseText.length / 4,
      costUSD: 0.0001,
    };
  }

  getModelName(): string {
    return 'mock-model';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getPricing(): ProviderPricing {
    return {
      providerId: 'mock',
      providerName: 'Mock Provider',
      inputCostPer1M: 0,
      outputCostPer1M: 0,
    };
  }

  getProviderId(): string {
    return 'mock';
  }
}

describe('TranslationService Integration Tests', () => {
  let mockProvider: MockLLMProvider;
  let translationService: TranslationService;
  let dictionaryStorage: MorphemeDictionaryStorage;
  let languageGenerator: LanguageGenerator;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    translationService = new TranslationService(mockProvider);
    dictionaryStorage = new MorphemeDictionaryStorage();
    languageGenerator = new LanguageGenerator();
  });

  describe('Basic Translation', () => {
    it('should translate a simple volcanic word', async () => {
      const language = languageGenerator.generateLanguage(
        { type: 'volcanic', seed: 'test1' },
        { type: 'insectoid' },
        'lang1'
      );

      // Mock response for "!xak"
      mockProvider.addMockResponse('!xak', {
        word: '!xak',
        translation: 'fire-strike',
        wordType: 'noun',
        morphemes: [
          { sound: '!', meaning: 'strike', type: 'prefix' },
          { sound: 'xak', meaning: 'fire', type: 'root' },
        ],
        confidence: 0.88,
      });

      const request: TranslationRequest = {
        word: '!xak',
        languageConfig: language,
      };

      const result = await translationService.translate(request);

      expect(result.word).toBe('!xak');
      expect(result.translation).toBe('fire-strike');
      expect(result.wordType).toBe('noun');
      expect(result.morphemes).toHaveLength(2);
      expect(result.confidence).toBe(0.88);

      // Verify morphemes were learned
      const dict = translationService.getMorphemeDictionary();
      expect(dict['!']).toBeDefined();
      expect(dict['!'].meaning).toBe('strike');
      expect(dict['xak']).toBeDefined();
      expect(dict['xak'].meaning).toBe('fire');
    });

    it('should translate an aquatic word with liquid phonemes', async () => {
      const language = languageGenerator.generateLanguage(
        { type: 'ocean', seed: 'test2' },
        { type: 'aquatic' },
        'lang2'
      );

      mockProvider.addMockResponse('lowi', {
        word: 'lowi',
        translation: 'water-glider',
        wordType: 'noun',
        morphemes: [
          { sound: 'lo', meaning: 'water', type: 'root' },
          { sound: 'wi', meaning: 'glider', type: 'suffix' },
        ],
        confidence: 0.92,
      });

      const request: TranslationRequest = {
        word: 'lowi',
        languageConfig: language,
      };

      const result = await translationService.translate(request);

      expect(result.word).toBe('lowi');
      expect(result.translation).toBe('water-glider');
      expect(result.morphemes).toHaveLength(2);
      expect(result.morphemes[0]?.meaning).toBe('water');
      expect(result.morphemes[1]?.meaning).toBe('glider');
    });
  });

  describe('Morpheme Consistency', () => {
    it('should reuse learned morphemes across multiple words', async () => {
      const language = languageGenerator.generateLanguage(
        { type: 'volcanic', seed: 'test3' },
        { type: 'humanoid' },
        'lang3'
      );

      // First translation: "khak" (fire-stone)
      mockProvider.addMockResponse('khak', {
        word: 'khak',
        translation: 'fire-stone',
        wordType: 'noun',
        morphemes: [
          { sound: 'kh', meaning: 'fire', type: 'root' },
          { sound: 'ak', meaning: 'stone', type: 'root' },
        ],
        confidence: 0.92,
      });

      const result1 = await translationService.translate({
        word: 'khak',
        languageConfig: language,
      });

      expect(result1.morphemes).toHaveLength(2);

      // Second translation: "khzi" (fire-quick) - should reuse "kh" = fire
      mockProvider.addMockResponse('khzi', {
        word: 'khzi',
        translation: 'fire-quick',
        wordType: 'noun',
        morphemes: [
          { sound: 'kh', meaning: 'fire', type: 'root' },  // Reused!
          { sound: 'zi', meaning: 'quick', type: 'suffix' },
        ],
        confidence: 0.89,
      });

      const result2 = await translationService.translate({
        word: 'khzi',
        languageConfig: language,
      });

      expect(result2.morphemes).toHaveLength(2);
      expect(result2.morphemes[0]?.sound).toBe('kh');
      expect(result2.morphemes[0]?.meaning).toBe('fire');  // Same as first word

      // Verify dictionary contains all morphemes
      const dict = translationService.getMorphemeDictionary();
      expect(Object.keys(dict)).toHaveLength(3);  // kh, ak, zi
      expect(dict['kh']?.meaning).toBe('fire');
      expect(dict['ak']?.meaning).toBe('stone');
      expect(dict['zi']?.meaning).toBe('quick');
    });
  });

  describe('Dictionary Storage Integration', () => {
    it('should store translations in dictionary', () => {
      const languageId = 'volcanic_insectoid_lang_test4';

      dictionaryStorage.addWordTranslation(
        languageId,
        '!xak',
        'fire-strike',
        'noun',
        [
          { sound: '!', meaning: 'strike', type: 'prefix' },
          { sound: 'xak', meaning: 'fire', type: 'root' },
        ],
        0.88
      );

      const translation = dictionaryStorage.getWordTranslation(languageId, '!xak');
      expect(translation).toBeDefined();
      expect(translation?.translation).toBe('fire-strike');
      expect(translation?.morphemes).toHaveLength(2);

      const morphemes = dictionaryStorage.getMorphemes(languageId);
      expect(morphemes).toHaveLength(2);
      expect(morphemes.find(m => m.sound === '!')?.meaning).toBe('strike');
      expect(morphemes.find(m => m.sound === 'xak')?.meaning).toBe('fire');
    });

    it('should export and import dictionaries', () => {
      const languageId = 'volcanic_insectoid_lang_test5';

      dictionaryStorage.addWordTranslation(
        languageId,
        'khak',
        'fire-stone',
        'noun',
        [
          { sound: 'kh', meaning: 'fire', type: 'root' },
          { sound: 'ak', meaning: 'stone', type: 'root' },
        ],
        0.92
      );

      // Export
      const exported = dictionaryStorage.exportDictionary(languageId);
      expect(exported).toContain('fire-stone');
      expect(exported).toContain('khak');

      // Clear and import
      dictionaryStorage.clearAll();
      dictionaryStorage.importDictionary(exported);

      // Verify
      const translation = dictionaryStorage.getWordTranslation(languageId, 'khak');
      expect(translation?.translation).toBe('fire-stone');
    });

    it('should calculate dictionary statistics', () => {
      const languageId = 'volcanic_insectoid_lang_test6';

      dictionaryStorage.addWordTranslation(languageId, 'word1', 'trans1', 'noun',
        [{ sound: 'm1', meaning: 'meaning1', type: 'root' }], 0.9);
      dictionaryStorage.addWordTranslation(languageId, 'word2', 'trans2', 'verb',
        [{ sound: 'm2', meaning: 'meaning2', type: 'root' }], 0.8);

      const stats = dictionaryStorage.getStats(languageId);
      expect(stats.morphemeCount).toBe(2);
      expect(stats.wordCount).toBe(2);
      expect(stats.avgConfidence).toBeCloseTo(0.85);  // (0.9 + 0.8) / 2
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON responses', async () => {
      const language = languageGenerator.generateLanguage(
        { type: 'volcanic', seed: 'test7' },
        { type: 'humanoid' },
        'lang7'
      );

      // Mock provider returns invalid JSON
      mockProvider.addMockResponse('badword', 'This is not JSON!');

      const request: TranslationRequest = {
        word: 'badword',
        languageConfig: language,
      };

      const result = await translationService.translate(request);

      // Should return fallback response
      expect(result.word).toBe('badword');
      expect(result.translation).toBe('unknown-word');
      expect(result.confidence).toBe(0.1);
    });

    it('should handle markdown-wrapped JSON', async () => {
      const language = languageGenerator.generateLanguage(
        { type: 'volcanic', seed: 'test8' },
        { type: 'humanoid' },
        'lang8'
      );

      // Mock provider returns JSON wrapped in markdown code block
      const mockResponse = `\`\`\`json
{"word":"khak","translation":"fire-stone","wordType":"noun","morphemes":[{"sound":"kh","meaning":"fire","type":"root"}],"confidence":0.9}
\`\`\``;

      mockProvider.addMockResponse('khak', mockResponse);

      const request: TranslationRequest = {
        word: 'khak',
        languageConfig: language,
      };

      const result = await translationService.translate(request);

      // Should successfully parse despite markdown wrapper
      expect(result.word).toBe('khak');
      expect(result.translation).toBe('fire-stone');
      expect(result.confidence).toBe(0.9);
    });
  });

  describe('Prompt Context Verification', () => {
    it('should include language character in prompt', async () => {
      const language = languageGenerator.generateLanguage(
        { type: 'volcanic', seed: 'test9' },
        { type: 'insectoid' },
        'lang9'
      );

      let capturedPrompt = '';
      const captureProvider = new class implements LLMProvider {
        async generate(request: LLMRequest): Promise<LLMResponse> {
          capturedPrompt = request.prompt;
          return {
            text: JSON.stringify({
              word: 'test',
              translation: 'test',
              wordType: 'noun',
              morphemes: [],
              confidence: 0.5,
            }),
            inputTokens: 100,
            outputTokens: 50,
            costUSD: 0.0001,
          };
        }
        getModelName() { return 'capture'; }
        async isAvailable() { return true; }
        getPricing(): ProviderPricing {
          return { providerId: 'capture', providerName: 'Capture', inputCostPer1M: 0, outputCostPer1M: 0 };
        }
        getProviderId() { return 'capture'; }
      };

      const service = new TranslationService(captureProvider);
      await service.translate({ word: 'test', languageConfig: language });

      // Verify prompt includes key context
      expect(capturedPrompt).toContain('Planet Type');
      expect(capturedPrompt).toContain('volcanic');
      expect(capturedPrompt).toContain('Language Character');
      expect(capturedPrompt).toContain('PHONEME-TO-MEANING MAPPING GUIDE');
      expect(capturedPrompt).toContain('Guttural phonemes');
      expect(capturedPrompt).toContain('TRANSLATION RULES');
      expect(capturedPrompt).toContain('compound words');
    });
  });
});
