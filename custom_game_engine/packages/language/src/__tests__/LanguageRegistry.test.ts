/**
 * Language Registry Tests
 *
 * Tests the central language registry singleton.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LanguageRegistry,
  getLanguageRegistry,
  type LanguageEntity,
} from '../LanguageRegistry.js';
import { LanguageGenerator } from '../LanguageGenerator.js';
import { createLanguageComponent } from '../LanguageComponent.js';
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

  getModelName() {
    return 'mock';
  }
  async isAvailable() {
    return true;
  }
  getPricing(): ProviderPricing {
    return {
      providerId: 'mock',
      providerName: 'Mock',
      inputCostPer1M: 0,
      outputCostPer1M: 0,
    };
  }
  getProviderId() {
    return 'mock';
  }
}

describe('LanguageRegistry Tests', () => {
  let registry: LanguageRegistry;
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    // Reset singleton before each test
    LanguageRegistry.resetInstance();
    mockProvider = new MockLLMProvider();
    registry = LanguageRegistry.getInstance(mockProvider);
  });

  it('should be a singleton', () => {
    const registry1 = LanguageRegistry.getInstance();
    const registry2 = LanguageRegistry.getInstance();

    expect(registry1).toBe(registry2);
  });

  it('should allow getInstance with convenience function', () => {
    const reg1 = getLanguageRegistry();
    const reg2 = LanguageRegistry.getInstance();

    expect(reg1).toBe(reg2);
  });

  it('should register and retrieve languages', () => {
    const languageGenerator = new LanguageGenerator();
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'test_1' },
      { type: 'insectoid' },
      'test_lang_1'
    );

    const component = createLanguageComponent('test_lang_1', languageConfig);
    const entity: LanguageEntity = {
      entityId: 'entity_1',
      component,
    };

    registry.registerLanguage(entity);

    const retrieved = registry.getLanguage('test_lang_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.entityId).toBe('entity_1');
    expect(retrieved!.component.languageId).toBe('test_lang_1');
  });

  it('should manage species-language associations', () => {
    const languageGenerator = new LanguageGenerator();
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'ocean', seed: 'test_2' },
      { type: 'aquatic' },
      'aquatic_lang'
    );

    const component = createLanguageComponent('aquatic_lang', languageConfig);
    const entity: LanguageEntity = {
      entityId: 'entity_2',
      component,
    };

    registry.registerLanguage(entity);
    registry.setSpeciesLanguage('aquatic_species', 'aquatic_lang');

    const speciesLanguage = registry.getSpeciesLanguage('aquatic_species');
    expect(speciesLanguage).toBeDefined();
    expect(speciesLanguage!.component.languageId).toBe('aquatic_lang');
  });

  it('should handle common language', () => {
    const languageGenerator = new LanguageGenerator();
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'temperate', seed: 'common' },
      { type: 'humanoid' },
      'common_language'
    );

    const component = createLanguageComponent('common_language', languageConfig);
    const entity: LanguageEntity = {
      entityId: 'common_entity',
      component,
    };

    registry.registerLanguage(entity);
    registry.setCommonLanguage('common_language');

    expect(registry.getCommonLanguageId()).toBe('common_language');
  });

  it('should generate language for species if not exists', async () => {
    const entity = await registry.ensureSpeciesLanguage(
      'volcanic_insectoid',
      'volcanic',
      { type: 'insectoid' },
      { initializeVocabulary: false } // Skip vocabulary for speed
    );

    expect(entity).toBeDefined();
    expect(entity.component.languageId).toBe('volcanic_insectoid_language');

    // Should be registered
    const retrieved = registry.getLanguage('volcanic_insectoid_language');
    expect(retrieved).toBe(entity);

    // Should be associated with species
    const speciesLanguage = registry.getSpeciesLanguage('volcanic_insectoid');
    expect(speciesLanguage).toBe(entity);
  });

  it('should return existing language if already generated', async () => {
    const entity1 = await registry.ensureSpeciesLanguage(
      'forest_avian',
      'forest',
      { type: 'avian' },
      { initializeVocabulary: false }
    );

    const entity2 = await registry.ensureSpeciesLanguage(
      'forest_avian',
      'forest',
      { type: 'avian' },
      { initializeVocabulary: false }
    );

    // Should be same instance
    expect(entity1).toBe(entity2);
  });

  it('should initialize vocabulary when generating language', async () => {
    const entity = await registry.ensureSpeciesLanguage(
      'desert_reptilian',
      'desert',
      { type: 'reptilian' },
      {
        initializeVocabulary: true,
        essentialOnly: true,
        batchSize: 5,
      }
    );

    // Should have vocabulary
    expect(entity.component.knownWords.size).toBeGreaterThan(0);
  }, 30000); // Longer timeout for vocabulary generation

  it('should track progress during vocabulary initialization', async () => {
    const progress: Array<{ current: number; total: number; word: string }> = [];

    await registry.ensureSpeciesLanguage(
      'mountain_crystalline',
      'mountain',
      { type: 'crystalline' },
      {
        initializeVocabulary: true,
        essentialOnly: true,
        batchSize: 10,
        onProgress: (current, total, word) => {
          progress.push({ current, total, word });
        },
      }
    );

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]!.current).toBe(progress[0]!.total);
  }, 30000);

  it('should get all registered languages', () => {
    const languageGenerator = new LanguageGenerator();

    const lang1 = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: '1' },
      { type: 'insectoid' },
      'lang1'
    );
    const lang2 = languageGenerator.generateLanguage(
      { type: 'ocean', seed: '2' },
      { type: 'aquatic' },
      'lang2'
    );

    registry.registerLanguage({
      entityId: 'e1',
      component: createLanguageComponent('lang1', lang1),
    });
    registry.registerLanguage({
      entityId: 'e2',
      component: createLanguageComponent('lang2', lang2),
    });

    const all = registry.getAllLanguages();
    expect(all.length).toBe(2);
    expect(all.map((l) => l.component.languageId)).toContain('lang1');
    expect(all.map((l) => l.component.languageId)).toContain('lang2');
  });

  it('should get species-language associations map', () => {
    const languageGenerator = new LanguageGenerator();
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'forest', seed: 'test' },
      { type: 'avian' },
      'avian_lang'
    );

    const component = createLanguageComponent('avian_lang', languageConfig);
    registry.registerLanguage({ entityId: 'e1', component });

    registry.setSpeciesLanguage('species1', 'avian_lang');
    registry.setSpeciesLanguage('species2', 'avian_lang');

    const associations = registry.getSpeciesLanguages();
    expect(associations.size).toBe(2);
    expect(associations.get('species1')).toBe('avian_lang');
    expect(associations.get('species2')).toBe('avian_lang');
  });

  it('should check if language exists', () => {
    const languageGenerator = new LanguageGenerator();
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'desert', seed: 'check' },
      { type: 'reptilian' },
      'check_lang'
    );

    const component = createLanguageComponent('check_lang', languageConfig);
    registry.registerLanguage({ entityId: 'e1', component });

    expect(registry.hasLanguage('check_lang')).toBe(true);
    expect(registry.hasLanguage('nonexistent')).toBe(false);
  });

  it('should remove languages', () => {
    const languageGenerator = new LanguageGenerator();
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'arctic', seed: 'remove' },
      { type: 'humanoid' },
      'remove_lang'
    );

    const component = createLanguageComponent('remove_lang', languageConfig);
    registry.registerLanguage({ entityId: 'e1', component });
    registry.setSpeciesLanguage('species1', 'remove_lang');
    registry.setCommonLanguage('remove_lang');

    const removed = registry.removeLanguage('remove_lang');

    expect(removed).toBe(true);
    expect(registry.hasLanguage('remove_lang')).toBe(false);
    expect(registry.getSpeciesLanguage('species1')).toBeUndefined();
    expect(registry.getCommonLanguageId()).toBeUndefined();
  });

  it('should provide registry statistics', () => {
    const languageGenerator = new LanguageGenerator();

    const activeLang = languageGenerator.generateLanguage(
      { type: 'forest', seed: 'active' },
      { type: 'avian' },
      'active_lang'
    );

    const extinctLang = languageGenerator.generateLanguage(
      { type: 'desert', seed: 'extinct' },
      { type: 'reptilian' },
      'extinct_lang'
    );

    const activeComponent = createLanguageComponent('active_lang', activeLang);
    const extinctComponent = createLanguageComponent('extinct_lang', extinctLang);
    extinctComponent.isExtinct = true;

    registry.registerLanguage({ entityId: 'e1', component: activeComponent });
    registry.registerLanguage({ entityId: 'e2', component: extinctComponent });
    registry.setSpeciesLanguage('species1', 'active_lang');
    registry.setCommonLanguage('active_lang');

    const stats = registry.getStats();

    expect(stats.totalLanguages).toBe(2);
    expect(stats.speciesWithLanguages).toBe(1);
    expect(stats.commonLanguageSet).toBe(true);
    expect(stats.activeLanguages).toBe(1);
    expect(stats.extinctLanguages).toBe(1);
  });
});
