/**
 * @ai-village/language
 *
 * Procedural alien language generation system based on:
 * - Planet type (environmental influence on language)
 * - Species body plan (anatomical constraints on sound production)
 * - Linguistic typology (universal patterns)
 *
 * Features:
 * - 45 universal phonemes + 18 alien-specific phonemes
 * - 7 body plan phonologies (insectoid, avian, aquatic, reptilian, multi-throated, crystalline, humanoid)
 * - Triple-weighted phoneme selection (body plan + planet + typology)
 * - Automatic language character analysis (texture, hardness, manner)
 * - Tracery-based description generation ("A harsh guttural language...")
 * - Word generation via Tracery grammars
 *
 * @see PROCEDURAL_LANGUAGE_SYSTEM.md for complete specification
 *
 * @example
 * ```typescript
 * import { LanguageGenerator, TraceryGrammarBuilder } from '@ai-village/language';
 *
 * const generator = new LanguageGenerator();
 * const grammarBuilder = new TraceryGrammarBuilder();
 *
 * // Generate alien language
 * const language = generator.generateLanguage(
 *   { type: 'volcanic', seed: 'planet123' },
 *   { type: 'insectoid' },
 *   'lang_seed_456'
 * );
 *
 * console.log(language.description);
 * // "A harsh guttural language with sharp sounds"
 *
 * // Generate words
 * const grammar = grammarBuilder.buildGrammar(language);
 * const word = grammarBuilder.generateWord(grammar);
 * console.log(word); // "!xakzi"
 * ```
 */

// ==================== CORE TYPES ====================

export type {
  PhonemeMetadata,
  PhonemeInventory,
  LanguageConfig,
  LanguageCharacter,
  PlanetConfig,
  BodyPlan,
} from './types.js';

// ==================== PHONEME INVENTORIES ====================

// Universal Phoneme Inventory (45 phonemes: 27 consonants, 8 vowels, 7 clusters, 3 tones)
export { UNIVERSAL_PHONEMES, PHONEME_STATS } from './PhonemeInventory.js';

// Alien Phoneme Inventory (18 body-plan-restricted phonemes)
export {
  ALIEN_PHONEMES,
  getBodyPlanPhonemes,
  getExclusivePhonemes,
  getAlienPhonemeStats,
} from './AlienPhonemes.js';

// ==================== BODY PLAN PHONOLOGY ====================

// Body plan phonology configurations (7 body plans)
export {
  BODY_PLAN_PHONOLOGIES,
  type BodyPlanPhonology,
} from './BodyPlanPhonology.js';

// ==================== LANGUAGE GENERATION ====================

// Main language generator with triple bias system
export { LanguageGenerator } from './LanguageGenerator.js';

// Phoneme analyzer (extracts language character from phoneme qualities)
export { PhonemeAnalyzer } from './PhonemeAnalyzer.js';

// ==================== TRACERY GRAMMAR ====================

// Tracery grammar builder for word generation
export { TraceryGrammarBuilder } from './TraceryGrammarBuilder.js';

// Language description grammar (generates poetic descriptions)
export {
  LanguageDescriptionGrammar,
  type TraceryGrammar,
} from './LanguageDescriptionGrammar.js';

// ==================== TRANSLATION SYSTEM (PHASE 2) ====================

// Translation service with LLM integration
export {
  TranslationService,
  type TranslationResponse,
  type TranslationRequest,
  type Morpheme,
  type MorphemeDictionary,
} from './TranslationService.js';

// Morpheme dictionary storage
export {
  MorphemeDictionaryStorage,
  type LanguageDictionary,
  type WordTranslation,
} from './MorphemeDictionaryStorage.js';
