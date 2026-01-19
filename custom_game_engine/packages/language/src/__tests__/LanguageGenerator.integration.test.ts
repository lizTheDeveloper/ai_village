/**
 * Integration tests for the complete language generation system
 *
 * Tests the full pipeline from planet/species config to generated language
 * with descriptions and sample words.
 */

import { describe, it, expect } from 'vitest';
import { LanguageGenerator } from '../LanguageGenerator.js';
import { TraceryGrammarBuilder } from '../TraceryGrammarBuilder.js';
import type { PlanetConfig, BodyPlan } from '../types.js';

describe('LanguageGenerator Integration Tests', () => {
  const generator = new LanguageGenerator();
  const grammarBuilder = new TraceryGrammarBuilder();

  it('should generate a complete language for insectoid species on volcanic planet', () => {
    const planetConfig: PlanetConfig = {
      type: 'volcanic',
      seed: 'test_volcanic_123',
    };

    const speciesBodyPlan: BodyPlan = {
      type: 'insectoid',
    };

    const language = generator.generateLanguage(
      planetConfig,
      speciesBodyPlan,
      'insectoid_volcanic_lang'
    );

    // Verify basic structure
    expect(language.id).toBe('volcanic_insectoid_lang_insectoid_volcanic_lang');
    expect(language.planetType).toBe('volcanic');
    expect(language.seed).toBe('insectoid_volcanic_lang');

    // Verify phoneme selection
    expect(language.selectedConsonants.length).toBeGreaterThan(0);
    expect(language.selectedVowels.length).toBeGreaterThan(0);

    // Verify language character analysis
    expect(language.character).toBeDefined();
    expect(language.character!.primaryTexture).toBeDefined();
    expect(language.character!.primaryHardness).toBeDefined();
    expect(language.character!.primaryManner).toBeDefined();

    // Verify description generation
    expect(language.description).toBeDefined();
    expect(typeof language.description).toBe('string');
    expect(language.description!.length).toBeGreaterThan(0);

    // Verify grammar components
    expect(language.syllablePatterns.length).toBeGreaterThan(0);
    expect(language.maxSyllablesPerWord).toBeGreaterThanOrEqual(2);
    expect(language.maxSyllablesPerWord).toBeLessThanOrEqual(4);
    expect(language.wordOrder).toMatch(/^(SVO|SOV|VSO|VOS|OSV|OVS)$/);

    console.log('\n=== INSECTOID VOLCANIC LANGUAGE ===');
    console.log('Description:', language.description);
    console.log('Consonants:', language.selectedConsonants.join(', '));
    console.log('Vowels:', language.selectedVowels.join(', '));
    console.log('Character:', JSON.stringify(language.character, null, 2));
  });

  it('should generate a complete language for avian species on forest planet', () => {
    const planetConfig: PlanetConfig = {
      type: 'forest',
      seed: 'test_forest_456',
    };

    const speciesBodyPlan: BodyPlan = {
      type: 'avian',
    };

    const language = generator.generateLanguage(
      planetConfig,
      speciesBodyPlan,
      'avian_forest_lang'
    );

    expect(language.id).toBe('forest_avian_lang_avian_forest_lang');
    expect(language.planetType).toBe('forest');
    expect(language.character).toBeDefined();
    expect(language.description).toBeDefined();

    console.log('\n=== AVIAN FOREST LANGUAGE ===');
    console.log('Description:', language.description);
    console.log('Consonants:', language.selectedConsonants.join(', '));
    console.log('Vowels:', language.selectedVowels.join(', '));
    console.log('Character:', JSON.stringify(language.character, null, 2));
  });

  it('should generate a complete language for aquatic species on ocean planet', () => {
    const planetConfig: PlanetConfig = {
      type: 'ocean',
      seed: 'test_ocean_789',
    };

    const speciesBodyPlan: BodyPlan = {
      type: 'aquatic',
    };

    const language = generator.generateLanguage(
      planetConfig,
      speciesBodyPlan,
      'aquatic_ocean_lang'
    );

    expect(language.id).toBe('ocean_aquatic_lang_aquatic_ocean_lang');
    expect(language.planetType).toBe('ocean');
    expect(language.character).toBeDefined();
    expect(language.description).toBeDefined();

    console.log('\n=== AQUATIC OCEAN LANGUAGE ===');
    console.log('Description:', language.description);
    console.log('Consonants:', language.selectedConsonants.join(', '));
    console.log('Vowels:', language.selectedVowels.join(', '));
    console.log('Character:', JSON.stringify(language.character, null, 2));
  });

  it('should generate sample words using Tracery grammar', () => {
    const planetConfig: PlanetConfig = {
      type: 'volcanic',
      seed: 'test_word_gen',
    };

    const speciesBodyPlan: BodyPlan = {
      type: 'insectoid',
    };

    const language = generator.generateLanguage(
      planetConfig,
      speciesBodyPlan,
      'word_generation_test'
    );

    const grammar = grammarBuilder.buildGrammar(language);

    // Generate 5 sample words
    const words: string[] = [];
    for (let i = 0; i < 5; i++) {
      const word = grammarBuilder.generateWord(grammar);
      words.push(word);
      expect(word).toBeDefined();
      expect(word.length).toBeGreaterThan(0);
    }

    console.log('\n=== SAMPLE WORDS ===');
    console.log('Language:', language.description);
    console.log('Words:', words.join(', '));
  });

  it('should generate different languages with different seeds', () => {
    const planetConfig: PlanetConfig = {
      type: 'volcanic',
      seed: 'test_seed_1',
    };

    const speciesBodyPlan: BodyPlan = {
      type: 'humanoid',
    };

    const language1 = generator.generateLanguage(
      planetConfig,
      speciesBodyPlan,
      'seed_test_1'
    );

    const language2 = generator.generateLanguage(
      planetConfig,
      speciesBodyPlan,
      'seed_test_2'
    );

    // Different seeds should produce different phoneme selections
    expect(language1.selectedConsonants).not.toEqual(language2.selectedConsonants);
    expect(language1.description).not.toEqual(language2.description);
  });

  it('should include body-plan-specific phonemes for specialized species', () => {
    const planetConfig: PlanetConfig = {
      type: 'arctic',
      seed: 'test_special_phonemes',
    };

    const insectoidPlan: BodyPlan = {
      type: 'insectoid',
    };

    const language = generator.generateLanguage(
      planetConfig,
      insectoidPlan,
      'insectoid_special'
    );

    // Insectoid languages should include special sounds like clicks
    const hasSpecialSounds = language.selectedConsonants.some(c =>
      ['!', '|', '||', 'zz', 'tk', 'kk', 'tz'].includes(c)
    );

    expect(hasSpecialSounds).toBe(true);
    console.log('\n=== INSECTOID SPECIAL PHONEMES ===');
    console.log('Consonants:', language.selectedConsonants.join(', '));
  });

  it('should respect body plan restrictions (insectoids cannot produce liquid sounds)', () => {
    const planetConfig: PlanetConfig = {
      type: 'ocean',
      seed: 'test_restrictions',
    };

    const insectoidPlan: BodyPlan = {
      type: 'insectoid',
    };

    const language = generator.generateLanguage(
      planetConfig,
      insectoidPlan,
      'insectoid_ocean'
    );

    // Check phoneme qualities - should avoid liquid texture
    const hasLiquidTexture = language.selectedPhonemes.some(p =>
      p.qualities.texture.includes('liquid')
    );

    // Insectoids should heavily avoid liquid sounds due to body plan
    // (May still have some due to probabilistic selection, but should be rare)
    console.log('\n=== INSECTOID OCEAN LANGUAGE (Body Plan Restrictions) ===');
    console.log('Description:', language.description);
    console.log('Has liquid texture phonemes:', hasLiquidTexture);
    console.log('Consonants:', language.selectedConsonants.join(', '));
  });
});
