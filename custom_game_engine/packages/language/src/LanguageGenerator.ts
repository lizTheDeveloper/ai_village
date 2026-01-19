/**
 * Language Generator
 *
 * Generates unique alien languages based on:
 * 1. Planet type (environmental influence)
 * 2. Species body plan (physical sound production capabilities)
 * 3. Linguistic typology (universal patterns)
 *
 * Uses triple-weighted phoneme selection to create languages that feel both
 * alien and naturalistic.
 *
 * @see PROCEDURAL_LANGUAGE_SYSTEM.md section 2 "Language Generator"
 */

import type { LanguageConfig, PlanetConfig, BodyPlan, PhonemeMetadata } from './types.js';
import { UNIVERSAL_PHONEMES } from './PhonemeInventory.js';
import { ALIEN_PHONEMES } from './AlienPhonemes.js';
import { BODY_PLAN_PHONOLOGIES, type BodyPlanPhonology } from './BodyPlanPhonology.js';
import { PhonemeAnalyzer } from './PhonemeAnalyzer.js';
import { LanguageDescriptionGrammar } from './LanguageDescriptionGrammar.js';

/**
 * Seeded random number generator for deterministic language generation
 */
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = this.hashString(seed);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  next(): number {
    // LCG algorithm
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  intBetween(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)]!;
  }

  weightedChoice<T>(items: Array<{ item: T; weight: number }>): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = this.next() * totalWeight;

    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.item;
      }
    }

    return items[items.length - 1]!.item;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}

/**
 * Main language generator
 */
export class LanguageGenerator {
  private phonemeAnalyzer = new PhonemeAnalyzer();
  private descriptionGrammar = new LanguageDescriptionGrammar();

  /**
   * Generate a language from planet configuration and species body plan
   *
   * @param planetConfig - Planet configuration (type, seed, biome)
   * @param speciesBodyPlan - Species body plan (determines sound production)
   * @param seed - Random seed for deterministic generation
   * @returns Complete language configuration
   */
  generateLanguage(
    planetConfig: PlanetConfig,
    speciesBodyPlan: BodyPlan,
    seed: string
  ): LanguageConfig {
    const rng = new SeededRandom(seed);

    // 1. Get body plan phonology configuration (fallback to humanoid baseline)
    const bodyPhonology = BODY_PLAN_PHONOLOGIES[speciesBodyPlan.type] || BODY_PLAN_PHONOLOGIES.humanoid!;

    // 2. Combine universal + alien phoneme inventories
    const allConsonants = [...UNIVERSAL_PHONEMES.consonants, ...ALIEN_PHONEMES.consonants];
    const allVowels = UNIVERSAL_PHONEMES.vowels;

    // 3. Filter phonemes by body plan restrictions
    const availableConsonants = allConsonants.filter(p =>
      !p.bodyPlanRestriction || p.bodyPlanRestriction.includes(speciesBodyPlan.type)
    );

    const availableVowels = allVowels.filter(p =>
      !p.bodyPlanRestriction || p.bodyPlanRestriction.includes(speciesBodyPlan.type)
    );

    // 4. Select phonemes with triple bias: planet + body + typology
    const selectedConsonants = this.selectPhonemesWithTripleBias(
      availableConsonants,
      planetConfig.type,
      bodyPhonology,
      rng,
      8,
      15
    );

    const selectedVowels = this.selectPhonemesWithTripleBias(
      availableVowels,
      planetConfig.type,
      bodyPhonology,
      rng,
      3,
      7
    );

    // 5. Add special body-plan-specific sounds
    if (bodyPhonology.soundProduction.specialSounds.length > 0) {
      const specialPhonemes = ALIEN_PHONEMES.consonants.filter(p =>
        bodyPhonology.soundProduction.specialSounds.includes(p.sound)
      );
      const specialCount = Math.min(rng.intBetween(2, 4), specialPhonemes.length);
      const selectedSpecial = this.selectRandomSubset(specialPhonemes, specialCount, rng);
      selectedConsonants.push(...selectedSpecial);
    }

    const selectedClusters = rng.chance(0.5)
      ? this.selectRandomSubset(UNIVERSAL_PHONEMES.clusters, 3, rng)
      : [];

    // 6. Combine all selected phonemes
    const allSelectedPhonemes = [
      ...selectedConsonants,
      ...selectedVowels,
      ...selectedClusters,
    ];

    // 7. Analyze phoneme qualities to determine language character
    const character = this.phonemeAnalyzer.analyzeLanguageCharacter(allSelectedPhonemes);

    // 8. Enhance character with body-plan-specific qualities
    if (bodyPhonology.phonemeBias.uniqueQualities.length > 0) {
      character.bodyPlanQualities = bodyPhonology.phonemeBias.uniqueQualities;
    }

    // 9. Generate Tracery description based on character
    const description = this.descriptionGrammar.generateDescription(
      character,
      planetConfig.type,
      bodyPhonology
    );

    // 10. Define syllable patterns
    const patterns = this.selectRandomSubset(
      UNIVERSAL_PHONEMES.syllablePatterns,
      rng.intBetween(3, 6),
      rng
    );

    // 11. Generate morphology rules
    const config: LanguageConfig = {
      id: `${planetConfig.type}_${speciesBodyPlan.type}_lang_${seed}`,
      name: '', // Generated later through translation
      planetType: planetConfig.type,
      seed,

      // Store both full phoneme objects and flat arrays
      selectedPhonemes: allSelectedPhonemes,
      selectedConsonants: selectedConsonants.map(p => p.sound),
      selectedVowels: selectedVowels.map(p => p.sound),
      selectedClusters: selectedClusters.map(p => p.sound),
      allowedClusters: rng.chance(0.5),
      allowedTones: rng.chance(0.3),

      // Language character from analysis
      character,
      description,

      syllablePatterns: patterns,
      maxSyllablesPerWord: rng.intBetween(2, 4),
      vowelHarmony: rng.chance(0.4),
      consonantHarmony: rng.chance(0.3),
      wordOrder: rng.choice(['SVO', 'SOV', 'VSO', 'VOS', 'OSV', 'OVS']),
      usesAffixes: rng.chance(0.7),
      prefixes: this.generateAffixes(
        selectedConsonants.map(p => p.sound),
        selectedVowels.map(p => p.sound),
        'prefix',
        3,
        rng
      ),
      suffixes: this.generateAffixes(
        selectedConsonants.map(p => p.sound),
        selectedVowels.map(p => p.sound),
        'suffix',
        5,
        rng
      ),
      nameStructure: rng.choice(['given', 'given-family', 'single']),
      placeNamePattern: '', // Will be generated later
    };

    return config;
  }

  /**
   * Select phonemes with triple bias: planet type + body plan + typology
   */
  private selectPhonemesWithTripleBias(
    phonemes: PhonemeMetadata[],
    planetType: string,
    bodyPhonology: BodyPlanPhonology,
    rng: SeededRandom,
    min: number,
    max: number
  ): PhonemeMetadata[] {
    const count = rng.intBetween(min, max);

    // Weight phonemes by all three factors
    const weighted = phonemes.map(p => ({
      item: p,
      weight: this.getPhonemeWeight(p, planetType, bodyPhonology),
    }));

    // Weighted random selection
    const selected: PhonemeMetadata[] = [];
    for (let i = 0; i < count; i++) {
      const phoneme = rng.weightedChoice(weighted);
      if (phoneme && !selected.includes(phoneme)) {
        selected.push(phoneme);
      }
    }

    return selected;
  }

  /**
   * Get weight for phoneme based on planet type, body plan, and typology
   */
  private getPhonemeWeight(
    phoneme: PhonemeMetadata,
    planetType: string,
    bodyPhonology: BodyPlanPhonology
  ): number {
    let weight = 1.0;

    // === BODY PLAN BIAS (strongest - determines what's physically possible) ===

    // Preferred textures get huge boost
    for (const preferredTexture of bodyPhonology.phonemeBias.preferTextures) {
      if (phoneme.qualities.texture.includes(preferredTexture)) {
        weight += 3.0;
      }
    }

    // Avoided textures heavily penalized (difficult/impossible for this body)
    for (const avoidedTexture of bodyPhonology.phonemeBias.avoidTextures) {
      if (phoneme.qualities.texture.includes(avoidedTexture)) {
        weight *= 0.1;  // 90% reduction
      }
    }

    // === PLANET TYPE BIAS (medium - environment shapes language) ===

    if (planetType === 'volcanic') {
      if (phoneme.qualities.texture.includes('guttural')) weight += 1.5;
      if (phoneme.qualities.hardness.includes('harsh')) weight += 1.0;
      if (phoneme.qualities.manner.includes('sharp')) weight += 0.8;
    } else if (planetType === 'ocean') {
      if (phoneme.qualities.texture.includes('liquid')) weight += 1.5;
      if (phoneme.qualities.hardness.includes('soft')) weight += 1.0;
      if (phoneme.qualities.manner.includes('flowing')) weight += 0.8;
    } else if (planetType === 'desert') {
      if (phoneme.qualities.texture.includes('sibilant')) weight += 1.5;
      if (phoneme.qualities.hardness.includes('crisp')) weight += 1.0;
      if (phoneme.qualities.manner.includes('sharp')) weight += 0.8;
    } else if (planetType === 'forest') {
      if (phoneme.qualities.texture.includes('nasal')) weight += 1.2;
      if (phoneme.qualities.hardness.includes('soft')) weight += 0.8;
      if (phoneme.qualities.manner.includes('resonant')) weight += 1.0;
    } else if (planetType === 'arctic') {
      if (phoneme.qualities.hardness.includes('crisp')) weight += 1.2;
      if (phoneme.qualities.manner.includes('clipped')) weight += 1.0;
      if (phoneme.qualities.manner.includes('sharp')) weight += 0.8;
    }

    // === TYPOLOGICAL BIAS (weak - linguistic universals) ===

    if (phoneme.typology.frequency === 'universal') {
      weight += 0.5;  // Slight boost for common sounds
    } else if (phoneme.typology.frequency === 'rare') {
      weight *= 0.8;  // Slight penalty for rare sounds
    }

    return weight;
  }

  /**
   * Select random subset of items
   */
  private selectRandomSubset<T>(items: T[], count: number, rng: SeededRandom): T[] {
    const shuffled = rng.shuffle(items);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Generate affixes (prefixes or suffixes) from phonemes
   */
  private generateAffixes(
    consonants: string[],
    vowels: string[],
    type: 'prefix' | 'suffix',
    count: number,
    rng: SeededRandom
  ): string[] {
    const affixes: string[] = [];

    for (let i = 0; i < count; i++) {
      const c = consonants[Math.floor(rng.next() * consonants.length)]!;
      const v = vowels[Math.floor(rng.next() * vowels.length)]!;

      if (type === 'prefix') {
        affixes.push(rng.chance(0.5) ? c + v : c);
      } else {
        affixes.push(rng.chance(0.5) ? v + c : c);
      }
    }

    return affixes;
  }
}
