/**
 * Place Naming Service
 *
 * Generates culturally appropriate place names using alien languages.
 * Combines geographic vocabulary with naming patterns.
 *
 * Examples:
 * - Mountains: "Xak-Kräg" (Fire Mountain)
 * - Rivers: "Zür-Wät" (High River)
 * - Cities: "Proc-Tharn" (Proc's Hall)
 */

import type { LanguageComponent } from './LanguageComponent.js';
import { getWordFromLanguage } from './LanguageComponent.js';
import { TraceryGrammarBuilder } from './TraceryGrammarBuilder.js';

/**
 * Place type categories
 */
export type PlaceType =
  | 'mountain'
  | 'valley'
  | 'river'
  | 'lake'
  | 'ocean'
  | 'forest'
  | 'desert'
  | 'city'
  | 'village'
  | 'fortress'
  | 'temple'
  | 'cave'
  | 'peak'
  | 'island'
  | 'peninsula';

/**
 * Place naming patterns
 */
export type PlaceNamingPattern =
  | 'descriptor-place'     // "High Mountain" → "Zür-Kräg"
  | 'place-descriptor'     // "Mountain High" → "Kräg-Zür"
  | 'person-place'         // "Proc's Mountain" → "Proc-Kräg"
  | 'place-person'         // "Mountain of Proc" → "Kräg-Proc"
  | 'compound'             // "Fire-Ice-Mountain" → "Xak-Grü-Kräg"
  | 'simple';              // Just the place name → "Kräg"

/**
 * Place naming options
 */
export interface PlaceNamingOptions {
  /**
   * Naming pattern to use
   * @default 'descriptor-place'
   */
  pattern?: PlaceNamingPattern;

  /**
   * Descriptor concepts (e.g., 'high', 'ancient', 'red')
   */
  descriptors?: string[];

  /**
   * Person/deity name (if using person-place pattern)
   */
  personName?: string;

  /**
   * Use genitive suffix (e.g., "'s" in English)
   * @default true for person-place patterns
   */
  useGenitive?: boolean;

  /**
   * Separator between components
   * @default '-'
   */
  separator?: string;
}

/**
 * Generated place name
 */
export interface PlaceName {
  /**
   * Alien name
   */
  alienName: string;

  /**
   * English translation
   */
  englishTranslation: string;

  /**
   * Component breakdown
   */
  components: Array<{
    alien: string;
    english: string;
    role: 'place' | 'descriptor' | 'person';
  }>;

  /**
   * Naming pattern used
   */
  pattern: PlaceNamingPattern;
}

/**
 * Place Naming Service
 */
export class PlaceNamingService {
  private grammarBuilder: TraceryGrammarBuilder;

  constructor() {
    this.grammarBuilder = new TraceryGrammarBuilder();
  }

  /**
   * Generate a place name
   *
   * @param placeType - Type of place (mountain, river, etc.)
   * @param language - Alien language to use
   * @param options - Naming options
   * @returns Generated place name
   *
   * @example
   * ```typescript
   * const service = new PlaceNamingService();
   *
   * // "High Mountain" → "Zür-Kräg"
   * const mountain = service.generatePlaceName(
   *   'mountain',
   *   volcanoLanguage,
   *   { descriptors: ['high'] }
   * );
   *
   * // "Proc's Fortress" → "Proc-Tharn"
   * const fortress = service.generatePlaceName(
   *   'fortress',
   *   volcanoLanguage,
   *   { pattern: 'person-place', personName: 'Proc' }
   * );
   * ```
   */
  generatePlaceName(
    placeType: PlaceType,
    language: LanguageComponent,
    options: PlaceNamingOptions = {}
  ): PlaceName {
    const {
      pattern = 'descriptor-place',
      descriptors = [],
      personName,
      useGenitive = pattern.includes('person'),
      separator = '-',
    } = options;

    // Get place word from vocabulary
    const placeWord = getWordFromLanguage(language, placeType);
    if (!placeWord) {
      throw new Error(`No translation for place type '${placeType}' in language ${language.languageId}`);
    }

    // Generate based on pattern
    switch (pattern) {
      case 'simple':
        return this.generateSimpleName(placeType, placeWord.word, language);

      case 'descriptor-place':
        return this.generateDescriptorPlaceName(
          placeType,
          placeWord.word,
          descriptors,
          language,
          separator,
          false // descriptor first
        );

      case 'place-descriptor':
        return this.generateDescriptorPlaceName(
          placeType,
          placeWord.word,
          descriptors,
          language,
          separator,
          true // place first
        );

      case 'person-place':
        return this.generatePersonPlaceName(
          placeType,
          placeWord.word,
          personName || 'Unknown',
          language,
          separator,
          useGenitive,
          false // person first
        );

      case 'place-person':
        return this.generatePersonPlaceName(
          placeType,
          placeWord.word,
          personName || 'Unknown',
          language,
          separator,
          useGenitive,
          true // place first
        );

      case 'compound':
        return this.generateCompoundName(
          placeType,
          placeWord.word,
          descriptors,
          language,
          separator
        );

      default:
        throw new Error(`Unknown naming pattern: ${pattern}`);
    }
  }

  /**
   * Generate simple place name (just the place type)
   */
  private generateSimpleName(
    placeType: PlaceType,
    alienPlaceWord: string,
    language: LanguageComponent
  ): PlaceName {
    return {
      alienName: alienPlaceWord,
      englishTranslation: placeType,
      components: [
        {
          alien: alienPlaceWord,
          english: placeType,
          role: 'place',
        },
      ],
      pattern: 'simple',
    };
  }

  /**
   * Generate descriptor + place name
   */
  private generateDescriptorPlaceName(
    placeType: PlaceType,
    alienPlaceWord: string,
    descriptors: string[],
    language: LanguageComponent,
    separator: string,
    placeFirst: boolean
  ): PlaceName {
    if (descriptors.length === 0) {
      return this.generateSimpleName(placeType, alienPlaceWord, language);
    }

    const components: PlaceName['components'] = [];
    const alienParts: string[] = [];
    const englishParts: string[] = [];

    // Get descriptor words
    for (const descriptor of descriptors) {
      const descWord = getWordFromLanguage(language, descriptor);
      if (descWord) {
        components.push({
          alien: descWord.word,
          english: descriptor,
          role: 'descriptor',
        });
        alienParts.push(descWord.word);
        englishParts.push(descriptor);
      }
    }

    // Add place word
    components.push({
      alien: alienPlaceWord,
      english: placeType,
      role: 'place',
    });

    // Combine based on order
    const alienName = placeFirst
      ? [alienPlaceWord, ...alienParts].join(separator)
      : [...alienParts, alienPlaceWord].join(separator);

    const englishTranslation = placeFirst
      ? `${placeType} ${englishParts.join(' ')}`
      : `${englishParts.join(' ')} ${placeType}`;

    return {
      alienName,
      englishTranslation,
      components,
      pattern: placeFirst ? 'place-descriptor' : 'descriptor-place',
    };
  }

  /**
   * Generate person + place name
   */
  private generatePersonPlaceName(
    placeType: PlaceType,
    alienPlaceWord: string,
    personName: string,
    language: LanguageComponent,
    separator: string,
    useGenitive: boolean,
    placeFirst: boolean
  ): PlaceName {
    const components: PlaceName['components'] = [
      {
        alien: personName,
        english: personName,
        role: 'person',
      },
      {
        alien: alienPlaceWord,
        english: placeType,
        role: 'place',
      },
    ];

    const alienName = placeFirst
      ? `${alienPlaceWord}${separator}${personName}`
      : `${personName}${separator}${alienPlaceWord}`;

    const englishTranslation = placeFirst
      ? useGenitive
        ? `${placeType} of ${personName}`
        : `${placeType} ${personName}`
      : useGenitive
        ? `${personName}'s ${placeType}`
        : `${personName} ${placeType}`;

    return {
      alienName,
      englishTranslation,
      components,
      pattern: placeFirst ? 'place-person' : 'person-place',
    };
  }

  /**
   * Generate compound name (multiple descriptors)
   */
  private generateCompoundName(
    placeType: PlaceType,
    alienPlaceWord: string,
    descriptors: string[],
    language: LanguageComponent,
    separator: string
  ): PlaceName {
    const components: PlaceName['components'] = [];
    const alienParts: string[] = [];
    const englishParts: string[] = [];

    // Get all descriptor words
    for (const descriptor of descriptors) {
      const descWord = getWordFromLanguage(language, descriptor);
      if (descWord) {
        components.push({
          alien: descWord.word,
          english: descriptor,
          role: 'descriptor',
        });
        alienParts.push(descWord.word);
        englishParts.push(descriptor);
      }
    }

    // Add place word
    components.push({
      alien: alienPlaceWord,
      english: placeType,
      role: 'place',
    });
    alienParts.push(alienPlaceWord);
    englishParts.push(placeType);

    return {
      alienName: alienParts.join(separator),
      englishTranslation: englishParts.join('-'),
      components,
      pattern: 'compound',
    };
  }

  /**
   * Generate multiple variations of a place name
   *
   * @param placeType - Type of place
   * @param language - Alien language
   * @param count - Number of variations to generate
   * @returns Array of place names
   *
   * @example
   * ```typescript
   * const variations = service.generatePlaceNameVariations(
   *   'mountain',
   *   volcanoLanguage,
   *   5
   * );
   * // [
   * //   { alienName: 'Kräg', englishTranslation: 'mountain', ... },
   * //   { alienName: 'Zür-Kräg', englishTranslation: 'high mountain', ... },
   * //   { alienName: 'Xak-Kräg', englishTranslation: 'fire mountain', ... },
   * //   ...
   * // ]
   * ```
   */
  generatePlaceNameVariations(
    placeType: PlaceType,
    language: LanguageComponent,
    count: number = 5
  ): PlaceName[] {
    const variations: PlaceName[] = [];

    // Get available descriptors from vocabulary
    const descriptorConcepts = ['high', 'low', 'ancient', 'new', 'red', 'blue', 'dark', 'bright', 'sacred', 'cursed'];
    const availableDescriptors = descriptorConcepts.filter(concept =>
      getWordFromLanguage(language, concept) !== undefined
    );

    // Generate different patterns
    const patterns: PlaceNamingPattern[] = ['simple', 'descriptor-place', 'place-descriptor'];

    for (const pattern of patterns) {
      if (variations.length >= count) break;

      if (pattern === 'simple') {
        variations.push(this.generatePlaceName(placeType, language, { pattern }));
      } else {
        // Try different descriptors
        for (const descriptor of availableDescriptors) {
          if (variations.length >= count) break;

          variations.push(
            this.generatePlaceName(placeType, language, {
              pattern,
              descriptors: [descriptor],
            })
          );
        }
      }
    }

    return variations.slice(0, count);
  }
}
