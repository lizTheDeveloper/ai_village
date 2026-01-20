/**
 * Vocabulary Initialization Tests
 *
 * Tests pre-generation of core vocabulary for naming and culture.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageGenerator } from '../LanguageGenerator.js';
import { createLanguageComponent } from '../LanguageComponent.js';
import { VocabularyInitializationService } from '../VocabularyInitializationService.js';
import {
  getEssentialVocabulary,
  getAllCoreConcepts,
  getPlanetVocabulary,
  getBodyPlanVocabulary,
  CORE_VOCABULARY,
  NAMING_PATTERNS,
  generateNameFromPattern,
} from '../CoreVocabulary.js';
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '@ai-village/llm';
import type { TranslationResponse } from '../TranslationService.js';

/**
 * Mock LLM Provider for testing
 */
class MockLLMProvider implements LLMProvider {
  private counter = 0;

  async generate(request: LLMRequest): Promise<LLMResponse> {
    this.counter++;

    const wordMatch = request.prompt.match(/\*\*Word\*\*: "([^"]+)"/);
    const word = wordMatch?.[1] || `word${this.counter}`;

    const response: TranslationResponse = {
      word,
      translation: `translation-${this.counter}`,
      wordType: 'noun',
      morphemes: [
        { sound: word, meaning: `meaning-${this.counter}`, type: 'root' },
      ],
      confidence: 0.9,
    };

    return {
      text: JSON.stringify(response),
      inputTokens: 100,
      outputTokens: 50,
      costUSD: 0.0001,
    };
  }

  getModelName() { return 'mock'; }
  async isAvailable() { return true; }
  getPricing(): ProviderPricing {
    return {
      providerId: 'mock',
      providerName: 'Mock',
      inputCostPer1M: 0,
      outputCostPer1M: 0,
    };
  }
  getProviderId() { return 'mock'; }
}

describe('Core Vocabulary Tests', () => {
  it('should have comprehensive vocabulary categories', () => {
    expect(CORE_VOCABULARY.nature).toBeDefined();
    expect(CORE_VOCABULARY.nature.length).toBeGreaterThan(10);

    expect(CORE_VOCABULARY.colors).toBeDefined();
    expect(CORE_VOCABULARY.colors).toContain('red');
    expect(CORE_VOCABULARY.colors).toContain('blue');

    expect(CORE_VOCABULARY.actions).toBeDefined();
    expect(CORE_VOCABULARY.actions).toContain('walk');
    expect(CORE_VOCABULARY.actions).toContain('run');

    expect(CORE_VOCABULARY.culture).toBeDefined();
    expect(CORE_VOCABULARY.culture).toContain('clan');
    expect(CORE_VOCABULARY.culture).toContain('warrior');
  });

  it('should get all core concepts as flat array', () => {
    const concepts = getAllCoreConcepts();

    expect(concepts.length).toBeGreaterThan(100);
    expect(concepts).toContain('fire');
    expect(concepts).toContain('water');
    expect(concepts).toContain('strong');
    expect(concepts).toContain('red');
  });

  it('should get planet-specific vocabulary', () => {
    const volcanic = getPlanetVocabulary('volcanic');
    expect(volcanic).toContain('lava');
    expect(volcanic).toContain('ash');
    expect(volcanic).toContain('fire');

    const ocean = getPlanetVocabulary('ocean');
    expect(ocean).toContain('water');
    expect(ocean).toContain('wave');
    expect(ocean).toContain('tide');
  });

  it('should get body-plan-specific vocabulary', () => {
    const insectoid = getBodyPlanVocabulary('insectoid');
    expect(insectoid).toContain('hive');
    expect(insectoid).toContain('swarm');
    expect(insectoid).toContain('mandible');

    const avian = getBodyPlanVocabulary('avian');
    expect(avian).toContain('wing');
    expect(avian).toContain('feather');
    expect(avian).toContain('nest');
  });

  it('should combine planet + body plan for essential vocabulary', () => {
    const volcanic_insectoid = getEssentialVocabulary('volcanic', 'insectoid');

    expect(volcanic_insectoid).toContain('lava');  // volcanic
    expect(volcanic_insectoid).toContain('hive');  // insectoid
    expect(volcanic_insectoid).toContain('fire');  // both
  });
});

describe('Naming Patterns Tests', () => {
  it('should have predefined naming patterns', () => {
    expect(NAMING_PATTERNS.length).toBeGreaterThan(0);

    const pattern = NAMING_PATTERNS[0]!;
    expect(pattern.pattern).toBeDefined();
    expect(pattern.categories).toBeDefined();
    expect(pattern.categories.length).toBeGreaterThan(0);
    expect(pattern.example).toBeDefined();
  });

  it('should generate names from patterns', () => {
    // Create comprehensive vocabulary covering all core concepts
    const vocabulary = new Map<string, string>();

    const allConcepts = getAllCoreConcepts();
    for (let i = 0; i < allConcepts.length; i++) {
      vocabulary.set(allConcepts[i]!, `word${i}`);
    }

    const pattern = NAMING_PATTERNS.find(p => p.pattern === '{quality}-{nature}')!;

    const name1 = generateNameFromPattern(pattern, vocabulary, () => 0.1);
    const name2 = generateNameFromPattern(pattern, vocabulary, () => 0.8);

    // Should generate names with separators
    expect(name1).toBeDefined();
    expect(name2).toBeDefined();
    expect(name1.length).toBeGreaterThan(0);
    expect(name2.length).toBeGreaterThan(0);
    expect(name1.includes('-')).toBe(true); // Should have separator
    expect(name2.includes('-')).toBe(true);
  });
});

describe('VocabularyInitializationService Tests', () => {
  let mockProvider: MockLLMProvider;
  let vocabService: VocabularyInitializationService;
  let languageGenerator: LanguageGenerator;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    vocabService = new VocabularyInitializationService(mockProvider);
    languageGenerator = new LanguageGenerator();
  });

  it('should initialize essential vocabulary for a language', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'vocab_test_1' },
      { type: 'insectoid' },
      'vocab_lang_1'
    );

    const component = createLanguageComponent('vocab_lang_1', languageConfig);

    // Progress tracking
    const progress: Array<{ current: number; total: number; word: string }> = [];

    const count = await vocabService.initializeVocabulary(
      component,
      'volcanic',
      'insectoid',
      {
        essentialOnly: true,
        batchSize: 5,
        onProgress: (current, total, word) => {
          progress.push({ current, total, word });
        },
      }
    );

    expect(count).toBeGreaterThan(0);
    expect(component.knownWords.size).toBe(count);

    // Verify progress callbacks were called
    expect(progress.length).toBe(count);
    expect(progress[progress.length - 1]!.current).toBe(count);
  }, 30000); // Longer timeout for vocabulary generation

  it('should enable quick lookup of alien words', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'ocean', seed: 'vocab_test_2' },
      { type: 'aquatic' },
      'vocab_lang_2'
    );

    const component = createLanguageComponent('vocab_lang_2', languageConfig);

    await vocabService.initializeVocabulary(
      component,
      'ocean',
      'aquatic',
      { essentialOnly: true, batchSize: 10 }
    );

    // Should be able to lookup words without LLM call
    const fireWord = vocabService.getAlienWord(component, 'fire');
    const waterWord = vocabService.getAlienWord(component, 'water');

    expect(fireWord).toBeDefined();
    expect(waterWord).toBeDefined();
    expect(fireWord).not.toBe(waterWord); // Different words
  }, 30000);

  it('should generate names using vocabulary', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'forest', seed: 'vocab_test_3' },
      { type: 'avian' },
      'vocab_lang_3'
    );

    const component = createLanguageComponent('vocab_lang_3', languageConfig);

    await vocabService.initializeVocabulary(
      component,
      'forest',
      'avian',
      { essentialOnly: true, batchSize: 10 }
    );

    // Generate agent name
    const name1 = vocabService.generateNameFromVocabulary(
      component,
      ['quality', 'nature'],
      () => 0.5
    );

    expect(name1).toBeDefined();
    expect(name1.length).toBeGreaterThan(0);

    // Different pattern
    const name2 = vocabService.generateNameFromVocabulary(
      component,
      ['color', 'action'],
      () => 0.3
    );

    expect(name2).toBeDefined();
    expect(name2).not.toBe(name1); // Different patterns = different names
  }, 30000);

  it('should handle full vocabulary initialization', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'desert', seed: 'vocab_test_4' },
      { type: 'reptilian' },
      'vocab_lang_4'
    );

    const component = createLanguageComponent('vocab_lang_4', languageConfig);

    const count = await vocabService.initializeVocabulary(
      component,
      'desert',
      'reptilian',
      {
        essentialOnly: false, // Full vocabulary (~200 words)
        batchSize: 20,
      }
    );

    // Full vocabulary should have significantly more words
    expect(count).toBeGreaterThan(100);
    expect(component.knownWords.size).toBe(count);
  }, 60000); // Longer timeout for full vocabulary
});

describe('End-to-End Naming Tests', () => {
  it('should generate culturally appropriate names', async () => {
    const mockProvider = new MockLLMProvider();
    const vocabService = new VocabularyInitializationService(mockProvider);
    const languageGenerator = new LanguageGenerator();

    // Create volcanic insectoid language
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'e2e_naming_1' },
      { type: 'insectoid' },
      'e2e_lang_1'
    );

    const component = createLanguageComponent('e2e_lang_1', languageConfig);

    // Initialize vocabulary
    await vocabService.initializeVocabulary(
      component,
      'volcanic',
      'insectoid',
      { essentialOnly: true, batchSize: 10 }
    );

    // Generate 5 agent names
    const names: string[] = [];
    for (let i = 0; i < 5; i++) {
      const name = vocabService.generateNameFromVocabulary(
        component,
        ['quality', 'nature'],
        () => i / 5 // Different seed for each
      );
      names.push(name);
    }

    // All names should be unique
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(5);

    // All names should have alien words
    for (const name of names) {
      expect(name.length).toBeGreaterThan(0);
      expect(name.includes('-')).toBe(true); // Should have separator
    }

    console.log('\n=== GENERATED VOLCANIC INSECTOID NAMES ===');
    console.log('Language:', languageConfig.description);
    console.log('Names:', names.join(', '));
  }, 30000);
});
