# Phase 3: Language Integration & Communication System

## Overview

Phase 3 integrates the procedural language generation (Phase 1) and LLM translation (Phase 2) with the game's entity system to enable:
- Species having native languages
- Agents knowing multiple languages at different proficiency levels
- Communication with translation/comprehension mechanics
- Language learning through exposure

## Architecture

### 1. LanguageComponent

Defines an entity's native language and linguistic context.

```typescript
interface LanguageComponent extends Component {
  type: 'language';

  // Language identity
  languageId: string;           // Unique language ID (from LanguageGenerator)
  languageConfig: LanguageConfig; // Full language configuration

  // Dictionary
  knownWords: Map<string, WordTranslation>; // Translated words in this language

  // Metadata
  speakerCount: number;         // How many entities speak this language
  isCommon: boolean;            // Universal language (like English/Common)
  isExtinct: boolean;           // No longer actively spoken
}
```

**Assignment:**
- Species-level: All members of a species share a native language
- Individual-level: Hybrids, travelers, scholars may have unique languages
- World-level: Each planet/civilization generates unique language variants

### 2. LanguageKnowledgeComponent

Tracks which languages an agent knows and their proficiency.

```typescript
interface LanguageProficiency {
  languageId: string;
  proficiency: number;          // 0.0-1.0 (0 = none, 1 = native)
  wordsKnown: number;           // Vocabulary size
  lastUsed: Tick;              // Last time spoke/heard this language
  learningRate: number;         // How fast they learn (influenced by intelligence)
}

interface LanguageKnowledgeComponent extends Component {
  type: 'language_knowledge';

  nativeLanguages: string[];    // Language IDs (usually 1, but bilinguals exist)
  knownLanguages: Map<string, LanguageProficiency>;

  // Learning stats
  totalWordsLearned: number;
  totalConversationsInForeignLanguage: number;

  // Linguistic talent
  languageLearningModifier: number; // 0.5-2.0 (genetic/trait-based)
}
```

**Proficiency Levels:**
- 0.0-0.1: None (cannot comprehend)
- 0.1-0.3: Beginner (basic words, broken grammar)
- 0.3-0.6: Intermediate (functional conversation)
- 0.6-0.9: Advanced (fluent, minor accent)
- 0.9-1.0: Native (perfect comprehension)

### 3. LanguageService

Central service for translation and comprehension.

```typescript
class LanguageService {
  /**
   * Translate a message from source language to target language
   *
   * @param message - Original message in source language
   * @param sourceLanguageId - Speaker's language
   * @param targetLanguageId - Listener's language
   * @param listenerProficiency - Listener's proficiency in source language (0-1)
   * @returns Translated/comprehended message
   */
  translate(
    message: string,
    sourceLanguageId: string,
    targetLanguageId: string,
    listenerProficiency: number
  ): TranslatedMessage;

  /**
   * Generate alien words for a message
   *
   * @param concept - English concept to express
   * @param languageId - Language to generate words in
   * @returns Alien word(s) with translation
   */
  generateAlienPhrase(concept: string, languageId: string): Promise<AlienPhrase>;

  /**
   * Learn words from exposure
   *
   * @param agentId - Learning agent
   * @param alienWord - Word they heard/read
   * @param context - Surrounding context for inference
   * @param languageId - Language being learned
   */
  learnFromExposure(
    agentId: string,
    alienWord: string,
    context: string,
    languageId: string
  ): void;
}

interface TranslatedMessage {
  original: string;              // Original alien text
  translated: string;            // Translated text (if comprehensible)
  comprehension: number;         // 0-1 how much listener understood
  unknownWords: string[];        // Words listener doesn't know
  partialTranslation?: string;   // If low proficiency, partial/garbled translation
}

interface AlienPhrase {
  concept: string;               // English concept
  alienWords: string[];          // Alien words expressing this concept
  wordBreakdown: Array<{
    word: string;
    translation: string;
    morphemes: Morpheme[];
  }>;
}
```

### 4. Communication Pipeline

When Agent A speaks to Agent B in conversations:

```
1. Agent A generates message concept (e.g., "I'm hungry")
2. LanguageService.generateAlienPhrase() creates alien words in A's native language
   → Uses LanguageGenerator + TraceryGrammar + TranslationService
   → Stores in A's language dictionary for consistency
3. Message sent to Agent B as alien text (e.g., "khak-zuri!")
4. Agent B's proficiency in A's language determines comprehension:
   - 0.0-0.1: Sees "[incomprehensible alien sounds]"
   - 0.1-0.3: Sees "khak-??? [something about food?]"
   - 0.3-0.6: Sees "hungry [partially understood]"
   - 0.6-1.0: Sees "I'm hungry" (full understanding)
5. If comprehension < 1.0, Agent B learns new words:
   - Store unknown words with context
   - Increase proficiency slightly
   - Add to vocabulary if context strong enough
```

### 5. Language Learning System

Agents learn languages through:

#### A. Passive Exposure
- Hearing conversations (slower)
- Reading signs/books (if literate)
- Overhearing strangers

**Learning Rate:** `baseRate * languageLearningModifier * contextQuality`

#### B. Active Learning
- Taking language lessons (fastest)
- Practicing with native speakers
- Using translation dictionaries

**Learning Rate:** 3x passive rate

#### C. Vocabulary Growth
```typescript
interface VocabularyLearning {
  // Word encountered
  word: string;

  // How many times heard/seen
  exposureCount: number;

  // Contexts it appeared in
  contexts: string[];

  // Inferred meaning (gets refined over time)
  inferredMeaning?: string;

  // Confidence in meaning (0-1)
  confidence: number;

  // When first encountered
  firstSeenAt: Tick;

  // When last encountered
  lastSeenAt: Tick;
}
```

**Learning Curve:**
- 1st exposure: 10% confidence (might be noise)
- 3rd exposure: 40% confidence (pattern recognition)
- 5th exposure: 70% confidence (strong hypothesis)
- 10th exposure: 95% confidence (effectively fluent)

#### D. Proficiency Growth
```typescript
// Proficiency increases with vocabulary
proficiency = Math.min(1.0, wordsKnown / targetVocabularySize)

// Target vocabulary for fluency
targetVocabularySize = 1000 words (basic fluency)
```

### 6. Integration with Existing Systems

#### SpeciesComponent Extension
```typescript
interface SpeciesComponent {
  // ... existing fields ...

  // NEW: Native language
  nativeLanguageId?: string;     // Auto-generated during species creation
}
```

#### ConversationMessage Extension
```typescript
interface ConversationMessage {
  speakerId: EntityId;

  // NEW: Language-aware messaging
  originalText: string;          // Alien words
  originalLanguageId: string;    // Speaker's language
  translatedText: string;        // English/Common translation

  // OLD: message field (deprecated, use originalText/translatedText)
  message: string;

  tick: Tick;
}
```

### 7. Visual Representation

**In-Game Display:**

```
Agent A (Thrakeen Insectoid): *clicks and hisses* "!xak-zuri khazi-do!"
  → [Comprehension: 30%] You understand: "fire-??? ???-strike"

Agent B (You): "I don't understand. Can you speak slower?"

Agent A: *slower, with gestures* "!xak... zuri!" *points at campfire*
  → [Comprehension: 60%] You understand: "fire... need!"
  → [Learned: xak = fire (confidence: 70%)]

Agent B: "Ah! You need fire?"

Agent A: *enthusiastic clicking* "!xak! !xak!" *nods*
  → [Comprehension: 90%] You understand: "Yes! Fire!"
```

**Chat Log Display:**
- Native speakers: See translated text (normal)
- Non-speakers: See alien words with comprehension % tooltip
- Partial speakers: See mix of alien + translated words

### 8. Performance Considerations

**Caching:**
- Cache generated alien words in language dictionaries
- Don't regenerate same concept twice for same language
- Use morpheme dictionary for consistency

**LLM Usage:**
- Only call TranslationService for NEW words
- Reuse existing translations from dictionary
- Batch translate multiple words at once

**Learning Updates:**
- Update proficiency async (not blocking conversation)
- Batch vocabulary learning updates every N ticks
- Store learning data in LanguageKnowledgeComponent

### 9. Testing Strategy

**Unit Tests:**
- LanguageService.translate() with various proficiency levels
- Vocabulary learning curve (exposure → confidence)
- Comprehension calculation
- Word reuse from dictionary

**Integration Tests:**
- Full conversation between two agents with language barrier
- Learning progression over multiple conversations
- Multi-language scenarios (A speaks X, B speaks Y, C speaks Z)

**Benchmark Tests:**
- Generate 100 alien phrases and verify consistency
- Translate conversation and verify morpheme reuse
- Learn language from 0% to 50% proficiency

## Implementation Plan

### Phase 3A: Core Components (Day 1)
1. Create LanguageComponent
2. Create LanguageKnowledgeComponent
3. Create LanguageService with translation logic
4. Write unit tests for translation/comprehension

### Phase 3B: Integration (Day 2)
5. Extend SpeciesComponent with native language
6. Extend ConversationMessage with language fields
7. Update conversation system to use LanguageService
8. Write integration tests for multi-language conversations

### Phase 3C: Learning System (Day 3)
9. Implement vocabulary learning from exposure
10. Implement proficiency growth
11. Add learning rate modifiers (intelligence, talent)
12. Write tests for learning progression

### Phase 3D: Polish & Testing (Day 4)
13. Add UI display for alien text with comprehension tooltips
14. Cache optimization for word reuse
15. Full end-to-end testing
16. Performance benchmarking

## Success Criteria

✅ Species auto-generate unique languages based on planet + body plan
✅ Agents track proficiency in multiple languages
✅ Conversations show alien words for unknown languages
✅ Comprehension degrades based on proficiency (full → partial → none)
✅ Agents learn languages through exposure over time
✅ Word translations consistent (same concept = same alien word)
✅ Morpheme reuse across multiple words in same language
✅ No performance impact (< 1ms per message translation)
✅ Full test coverage (unit + integration + benchmarks)

## Future Enhancements (Phase 4+)

- **Written Languages:** Glyphs/scripts for alien writing systems
- **Dialects:** Regional variations of same language
- **Language Evolution:** Languages change over generations
- **Sign Language:** Non-verbal communication for mute species
- **Telepathy:** Direct thought transfer bypassing language
- **Universal Translator:** Late-game tech for instant translation
- **Language Families:** Related languages (easier to learn)
- **Accents:** Non-native speakers have accents in pronunciation
