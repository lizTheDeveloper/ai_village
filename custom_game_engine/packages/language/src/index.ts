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
export { TraceryGrammarBuilder, generateRandomName } from './TraceryGrammarBuilder.js';

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

// ==================== COMMUNICATION SYSTEM (PHASE 3) ====================

// Language component (assigns languages to entities)
export {
  type LanguageComponent,
  LANGUAGE_COMPONENT_TYPE,
  createLanguageComponent,
  addWordToLanguage,
  getWordFromLanguage,
  hasWordInLanguage,
  getKnownConcepts,
  getVocabularySize,
  incrementSpeakerCount,
  decrementSpeakerCount,
  isLanguageActive,
  getLanguageDescription,
  serializeLanguageComponent,
  deserializeLanguageComponent,
} from './LanguageComponent.js';

// Language knowledge component (tracks proficiency & learning)
export {
  type LanguageKnowledgeComponent,
  type LanguageProficiency,
  type VocabularyLearning,
  LANGUAGE_KNOWLEDGE_COMPONENT_TYPE,
  createLanguageKnowledgeComponent,
  getProficiency,
  knowsLanguage,
  isNativeLanguage,
  startLearningLanguage,
  recordWordExposure,
  setWordMeaning,
  getWordMeaning,
  updateProficiency,
  markLanguageUsed,
  getAllKnownLanguages,
  getProficiencyLevelName,
  serializeLanguageKnowledgeComponent,
  deserializeLanguageKnowledgeComponent,
} from './LanguageKnowledgeComponent.js';

// Language communication service (translation & comprehension)
export {
  LanguageCommunicationService,
  type TranslatedMessage,
  type AlienPhrase,
} from './LanguageCommunicationService.js';

// ==================== VOCABULARY & NAMING (PHASE 4) ====================

// Core vocabulary for naming and culture
export {
  CORE_VOCABULARY,
  NAMING_PATTERNS,
  getAllCoreConcepts,
  getPlanetVocabulary,
  getBodyPlanVocabulary,
  getEssentialVocabulary,
  generateNameFromPattern,
  type NamingPattern,
} from './CoreVocabulary.js';

// Vocabulary initialization service
export {
  VocabularyInitializationService,
  type VocabularyInitOptions,
} from './VocabularyInitializationService.js';

// Language registry (singleton service)
export {
  LanguageRegistry,
  getLanguageRegistry,
  type LanguageEntity,
  type GenerateLanguageOptions,
} from './LanguageRegistry.js';

// Language initialization service (species integration)
export { LanguageInitializationService } from './LanguageInitializationService.js';

// Language system (ECS system)
export {
  LanguageSystem,
  type LanguageSystemOptions,
} from './LanguageSystem.js';

// ==================== UI RENDERING (PHASE 5) ====================

// Alien text renderer (for UI display with tooltips)
export {
  AlienTextRenderer,
  type AlienWordToken,
  type RenderedAlienText,
  type RenderOptions,
} from './AlienTextRenderer.js';

// Vocabulary prompt builder (for LLM writing tasks)
export {
  AlienVocabularyPromptBuilder,
  type VocabularyContext,
  type PromptTemplate,
  WRITING_TEMPLATES,
} from './AlienVocabularyPromptBuilder.js';

// React components (optional, for UI integration)
export {
  HoverableAlienText,
  MultiLineAlienText,
  type HoverableAlienTextProps,
  type MultiLineAlienTextProps,
} from './ui/HoverableAlienText.js';

// ==================== PLACE NAMING ====================

// Place naming service (generate geographic names)
export {
  PlaceNamingService,
  type PlaceType,
  type PlaceNamingPattern,
  type PlaceNamingOptions,
  type PlaceName,
} from './PlaceNamingService.js';
