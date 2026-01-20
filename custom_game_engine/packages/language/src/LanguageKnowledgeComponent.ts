/**
 * LanguageKnowledgeComponent - Tracks which languages an agent knows
 *
 * Stores proficiency levels, vocabulary, and learning progress for each language.
 * Enables language learning through exposure and tracks comprehension over time.
 */

/**
 * Component type string
 */
export const LANGUAGE_KNOWLEDGE_COMPONENT_TYPE = 'language_knowledge' as const;

/**
 * Proficiency in a single language
 */
export interface LanguageProficiency {
  languageId: string;           // Language identifier
  proficiency: number;          // 0.0-1.0 (0 = none, 1 = native)
  wordsKnown: number;           // Vocabulary size
  lastUsed: number;             // Last tick this language was spoken/heard
  learningRate: number;         // How fast they learn this language (0.5-2.0)

  // Vocabulary learning
  vocabularyLearning: Map<string, VocabularyLearning>;  // word → learning data
}

/**
 * Vocabulary learning progress for a single word
 */
export interface VocabularyLearning {
  word: string;                 // Alien word
  exposureCount: number;        // How many times heard/seen
  contexts: string[];           // Contexts it appeared in
  inferredMeaning?: string;     // Inferred translation
  confidence: number;           // 0-1 confidence in meaning
  firstSeenAt: number;          // When first encountered (tick)
  lastSeenAt: number;           // When last encountered (tick)
}

/**
 * Language knowledge component
 */
export interface LanguageKnowledgeComponent {
  type: typeof LANGUAGE_KNOWLEDGE_COMPONENT_TYPE;
  version: number;

  // Native languages
  nativeLanguages: string[];    // Language IDs (usually 1, but bilinguals exist)

  // Known languages with proficiency
  knownLanguages: Map<string, LanguageProficiency>;

  // Learning stats
  totalWordsLearned: number;
  totalConversationsInForeignLanguage: number;

  // Linguistic talent (genetic/trait-based)
  languageLearningModifier: number; // 0.5-2.0 (affects learning speed)
}

/**
 * Create a new LanguageKnowledgeComponent
 *
 * @param nativeLanguages - Native language IDs
 * @param options - Optional component fields
 * @returns New LanguageKnowledgeComponent
 */
export function createLanguageKnowledgeComponent(
  nativeLanguages: string[],
  options: Partial<LanguageKnowledgeComponent> = {}
): LanguageKnowledgeComponent {
  const component: LanguageKnowledgeComponent = {
    type: LANGUAGE_KNOWLEDGE_COMPONENT_TYPE,
    version: 1,
    nativeLanguages,
    knownLanguages: options.knownLanguages ?? new Map(),
    totalWordsLearned: options.totalWordsLearned ?? 0,
    totalConversationsInForeignLanguage: options.totalConversationsInForeignLanguage ?? 0,
    languageLearningModifier: options.languageLearningModifier ?? 1.0,
  };

  // Initialize native languages at max proficiency
  for (const langId of nativeLanguages) {
    if (!component.knownLanguages.has(langId)) {
      component.knownLanguages.set(langId, createNativeProficiency(langId));
    }
  }

  return component;
}

/**
 * Create native-level proficiency for a language
 *
 * @param languageId - Language identifier
 * @returns LanguageProficiency at native level
 */
function createNativeProficiency(languageId: string): LanguageProficiency {
  return {
    languageId,
    proficiency: 1.0,
    wordsKnown: 1000, // Native speakers know ~1000 common words
    lastUsed: 0,
    learningRate: 1.0,
    vocabularyLearning: new Map(),
  };
}

/**
 * Get proficiency in a language
 *
 * @param component - LanguageKnowledgeComponent
 * @param languageId - Language to check
 * @returns Proficiency level (0-1), or 0 if unknown
 */
export function getProficiency(
  component: LanguageKnowledgeComponent,
  languageId: string
): number {
  const prof = component.knownLanguages.get(languageId);
  return prof?.proficiency ?? 0;
}

/**
 * Check if agent knows a language at any level
 *
 * @param component - LanguageKnowledgeComponent
 * @param languageId - Language to check
 * @returns True if language is being tracked (even at 0 proficiency)
 */
export function knowsLanguage(
  component: LanguageKnowledgeComponent,
  languageId: string
): boolean {
  return component.knownLanguages.has(languageId);
}

/**
 * Check if language is native
 *
 * @param component - LanguageKnowledgeComponent
 * @param languageId - Language to check
 * @returns True if native language
 */
export function isNativeLanguage(
  component: LanguageKnowledgeComponent,
  languageId: string
): boolean {
  return component.nativeLanguages.includes(languageId);
}

/**
 * Start learning a new language
 *
 * @param component - LanguageKnowledgeComponent
 * @param languageId - Language to learn
 * @param currentTick - Current game tick
 */
export function startLearningLanguage(
  component: LanguageKnowledgeComponent,
  languageId: string,
  currentTick: number
): void {
  if (!component.knownLanguages.has(languageId)) {
    component.knownLanguages.set(languageId, {
      languageId,
      proficiency: 0.0,
      wordsKnown: 0,
      lastUsed: currentTick,
      learningRate: component.languageLearningModifier,
      vocabularyLearning: new Map(),
    });
  }
}

/**
 * Record word exposure for vocabulary learning
 *
 * @param component - LanguageKnowledgeComponent
 * @param languageId - Language the word belongs to
 * @param word - Alien word heard/seen
 * @param context - Surrounding context
 * @param currentTick - Current game tick
 */
export function recordWordExposure(
  component: LanguageKnowledgeComponent,
  languageId: string,
  word: string,
  context: string,
  currentTick: number
): void {
  // Start learning if not already
  startLearningLanguage(component, languageId, currentTick);

  const proficiency = component.knownLanguages.get(languageId)!;
  let wordData = proficiency.vocabularyLearning.get(word);

  if (!wordData) {
    // First exposure
    wordData = {
      word,
      exposureCount: 0,
      contexts: [],
      confidence: 0,
      firstSeenAt: currentTick,
      lastSeenAt: currentTick,
    };
    proficiency.vocabularyLearning.set(word, wordData);
  }

  // Update exposure
  wordData.exposureCount++;
  wordData.lastSeenAt = currentTick;

  // Add context (keep last 5)
  wordData.contexts.push(context);
  if (wordData.contexts.length > 5) {
    wordData.contexts.shift();
  }

  // Update confidence based on exposure count
  wordData.confidence = calculateWordConfidence(wordData.exposureCount);

  // If confidence high enough, count as learned
  if (wordData.confidence >= 0.7 && !wordData.inferredMeaning) {
    proficiency.wordsKnown++;
    component.totalWordsLearned++;
  }
}

/**
 * Calculate confidence in word meaning based on exposure count
 *
 * Learning curve:
 * - 1 exposure: 10% confidence
 * - 3 exposures: 40% confidence
 * - 5 exposures: 70% confidence
 * - 10 exposures: 95% confidence
 *
 * @param exposureCount - Number of times word was encountered
 * @returns Confidence level (0-1)
 */
function calculateWordConfidence(exposureCount: number): number {
  // Logarithmic learning curve
  return Math.min(1.0, Math.log10(exposureCount + 1) / Math.log10(11));
}

/**
 * Set inferred meaning for a word
 *
 * @param component - LanguageKnowledgeComponent
 * @param languageId - Language the word belongs to
 * @param word - Alien word
 * @param meaning - Inferred English meaning
 */
export function setWordMeaning(
  component: LanguageKnowledgeComponent,
  languageId: string,
  word: string,
  meaning: string
): void {
  const proficiency = component.knownLanguages.get(languageId);
  if (!proficiency) return;

  const wordData = proficiency.vocabularyLearning.get(word);
  if (!wordData) return;

  wordData.inferredMeaning = meaning;
}

/**
 * Get inferred meaning for a word
 *
 * @param component - LanguageKnowledgeComponent
 * @param languageId - Language the word belongs to
 * @param word - Alien word
 * @returns Inferred meaning if known, undefined otherwise
 */
export function getWordMeaning(
  component: LanguageKnowledgeComponent,
  languageId: string,
  word: string
): string | undefined {
  const proficiency = component.knownLanguages.get(languageId);
  if (!proficiency) return undefined;

  const wordData = proficiency.vocabularyLearning.get(word);
  return wordData?.inferredMeaning;
}

/**
 * Update proficiency based on vocabulary size
 *
 * Proficiency scales with vocabulary: wordsKnown / 1000 (capped at 1.0)
 *
 * @param component - LanguageKnowledgeComponent
 * @param languageId - Language to update
 */
export function updateProficiency(
  component: LanguageKnowledgeComponent,
  languageId: string
): void {
  const proficiency = component.knownLanguages.get(languageId);
  if (!proficiency || isNativeLanguage(component, languageId)) {
    return; // Don't update native languages
  }

  // Proficiency = vocabulary size / target vocabulary (1000 words)
  const targetVocabulary = 1000;
  proficiency.proficiency = Math.min(1.0, proficiency.wordsKnown / targetVocabulary);
}

/**
 * Mark language as used (updates lastUsed timestamp)
 *
 * @param component - LanguageKnowledgeComponent
 * @param languageId - Language that was used
 * @param currentTick - Current game tick
 */
export function markLanguageUsed(
  component: LanguageKnowledgeComponent,
  languageId: string,
  currentTick: number
): void {
  const proficiency = component.knownLanguages.get(languageId);
  if (proficiency) {
    proficiency.lastUsed = currentTick;
  }
}

/**
 * Get all known languages with their proficiency levels
 *
 * @param component - LanguageKnowledgeComponent
 * @returns Array of [languageId, proficiency] tuples
 */
export function getAllKnownLanguages(
  component: LanguageKnowledgeComponent
): Array<[string, number]> {
  return Array.from(component.knownLanguages.entries()).map(
    ([langId, prof]) => [langId, prof.proficiency]
  );
}

/**
 * Get proficiency level name
 *
 * @param proficiency - Proficiency value (0-1)
 * @returns Human-readable proficiency level
 */
export function getProficiencyLevelName(proficiency: number): string {
  if (proficiency >= 0.9) return 'Native';
  if (proficiency >= 0.6) return 'Advanced';
  if (proficiency >= 0.3) return 'Intermediate';
  if (proficiency >= 0.1) return 'Beginner';
  return 'None';
}

/**
 * Serialize LanguageKnowledgeComponent for save/load
 *
 * @param component - LanguageKnowledgeComponent
 * @returns Serialized component data
 */
export function serializeLanguageKnowledgeComponent(
  component: LanguageKnowledgeComponent
): Record<string, unknown> {
  const knownLanguagesArray = Array.from(component.knownLanguages.entries()).map(
    ([langId, prof]) => [
      langId,
      {
        ...prof,
        vocabularyLearning: Array.from(prof.vocabularyLearning.entries()),
      },
    ]
  );

  return {
    type: component.type,
    version: component.version,
    nativeLanguages: component.nativeLanguages,
    knownLanguages: knownLanguagesArray,
    totalWordsLearned: component.totalWordsLearned,
    totalConversationsInForeignLanguage: component.totalConversationsInForeignLanguage,
    languageLearningModifier: component.languageLearningModifier,
  };
}

/**
 * Deserialize LanguageKnowledgeComponent from save data
 *
 * @param data - Serialized component data
 * @returns Deserialized LanguageKnowledgeComponent
 */
export function deserializeLanguageKnowledgeComponent(
  data: Record<string, unknown>
): LanguageKnowledgeComponent {
  const knownLanguagesArray = data.knownLanguages as Array<
    [string, LanguageProficiency & { vocabularyLearning: Array<[string, VocabularyLearning]> }]
  >;

  const knownLanguages = new Map(
    knownLanguagesArray.map(([langId, prof]) => [
      langId,
      {
        ...prof,
        vocabularyLearning: new Map(prof.vocabularyLearning),
      },
    ])
  );

  return {
    type: LANGUAGE_KNOWLEDGE_COMPONENT_TYPE,
    version: data.version as number,
    nativeLanguages: data.nativeLanguages as string[],
    knownLanguages,
    totalWordsLearned: data.totalWordsLearned as number,
    totalConversationsInForeignLanguage: data.totalConversationsInForeignLanguage as number,
    languageLearningModifier: data.languageLearningModifier as number,
  };
}
