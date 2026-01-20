# Post-Hoc Translation Guide

**LLMs always think in English. Translation happens at message boundaries.**

This prevents semantic grounding issues while maintaining authentic alien language display.

## The New Flow

### 1. Speaker's LLM Outputs English

```typescript
// Agent A's brain generates speech in English
const agentPrompt = `
You are a volcanic insectoid warrior.
The fire festival is tonight.
What do you say to the village chief?
`;

const llmOutput = await llm.generate({ prompt: agentPrompt });
// Returns: "Honored chief, the fire festival begins at dusk. We are ready."
```

**Key Point:** The LLM thinks in English. No alien words in prompts. No semantic grounding issues.

### 2. System Translates to Alien (Post-Hoc)

```typescript
const communicationService = new LanguageCommunicationService(llmProvider);

// Translate English → Alien using pre-generated vocabulary
const alienText = await communicationService.translateEnglishToAlien(
  llmOutput,  // "Honored chief, the fire festival begins..."
  agentA_language  // Has vocabulary: { chief: 'kräm', fire: 'xak' }
);

// Result: "Honored kräm, the xak festival begins at dusk. We are ready."
```

**How it works:**
- Replaces known English words with alien equivalents
- Unknown words stay in English
- Whole-word matching only (not substrings)

### 3. Listener Receives Based on Proficiency

```typescript
// Agent B hears the message
const agentB_knowledge = agentB.getComponent('language_knowledge');

// What does Agent B's LLM see?
const messageForB = communicationService.prepareMessageForListener(
  llmOutput,     // Original English
  alienText,     // Alien translation
  agentA_language.id,
  agentB_knowledge,
  world.tick
);

// If Agent B is fluent (proficiency ≥ 0.9):
// → "Honored chief, the fire festival begins at dusk. We are ready."

// If Agent B doesn't speak the language (proficiency < 0.1):
// → "Honored kräm, the xak festival begins at dusk. We are ready."

// If Agent B is learning (proficiency 0.1-0.9):
// → "Honored chief, the xak festival begins at dusk. We are ready."
//    (mixed: knows "chief" = kräm, doesn't know "fire" = xak)
```

### 4. User Always Sees Alien

```typescript
// User UI always shows alien text with hover tooltips
<HoverableAlienText
  renderedText={{
    fullText: alienText,  // "Honored kräm, the xak festival begins..."
    tokens: [
      { alien: 'Honored', english: 'Honored' },
      { alien: 'kräm', english: 'chief', wordType: 'noun' },
      { alien: 'the', english: 'the' },
      { alien: 'xak', english: 'fire', wordType: 'noun' },
      // ... etc
    ]
  }}
  style="speech-bubble"
/>
```

## Complete Example: Agent Conversation

```typescript
// === SETUP ===
const llmProvider = getLLMProvider();
const languageRegistry = LanguageRegistry.getInstance(llmProvider);
const communicationService = new LanguageCommunicationService(llmProvider);

// Create volcanic insectoid language with vocabulary
const volcanoLanguage = await languageRegistry.ensureSpeciesLanguage(
  'volcanic_insectoid',
  'volcanic',
  { type: 'insectoid' },
  { initializeVocabulary: true }  // Pre-generates: fire=xak, chief=kräm, etc.
);

// === AGENT A SPEAKS ===
// Step 1: LLM thinks in English
const agentA_llm_output = await agentA_brain.generate({
  prompt: "Greet the chief and warn about the approaching fire"
});
// "Greetings, honored chief! The fire spreads toward the village!"

// Step 2: System translates to alien
const alienSpeech = await communicationService.translateEnglishToAlien(
  agentA_llm_output,
  volcanoLanguage.component
);
// "Greetings, honored kräm! The xak spreads toward the village!"

// Step 3: Store message with both versions
const message = {
  speakerId: agentA.id,
  tick: world.tick,
  originalEnglish: agentA_llm_output,
  alienText: alienSpeech,
  languageId: volcanoLanguage.component.languageId
};

// === AGENT B RECEIVES ===
const agentB_knowledge = agentB.getComponent('language_knowledge');

// Step 4: Prepare message for Agent B's LLM
const messageForBLLM = communicationService.prepareMessageForListener(
  message.originalEnglish,
  message.alienText,
  message.languageId,
  agentB_knowledge,
  world.tick
);

// Step 5: Agent B's LLM reads it
const agentB_response = await agentB_brain.generate({
  prompt: `Someone said to you: "${messageForBLLM}". How do you respond?`
});

// If Agent B speaks the language:
//   Input: "Greetings, honored chief! The fire spreads toward the village!"
//   Output: "Sound the alarm! Gather the warriors!"

// If Agent B doesn't speak the language:
//   Input: "Greetings, honored kräm! The xak spreads toward the village!"
//   Output: "I don't understand what you're saying."

// === USER SEES ===
// Always alien text with hover tooltips
ui.displayMessage({
  text: message.alienText,  // "Greetings, honored kräm! The xak spreads..."
  tooltips: {
    'kräm': 'chief',
    'xak': 'fire'
  }
});
```

## Language Barriers Actually Work

### Fluent Speakers (Proficiency ≥ 90%)

```typescript
const fluent = communicationService.prepareMessageForListener(
  "The fire burns bright",
  "The xak burns grü",
  languageId,
  fluentSpeaker,
  tick
);
// → "The fire burns bright" (English - full comprehension)
```

**LLM can think normally. No confusion.**

### Non-Speakers (Proficiency < 10%)

```typescript
const nonSpeaker = communicationService.prepareMessageForListener(
  "The fire burns bright",
  "The xak burns grü",
  languageId,
  foreignAgent,
  tick
);
// → "The xak burns grü" (Alien - incomprehensible)
```

**LLM sees gibberish. Natural confusion. Must use gestures or learn language.**

### Learning Speakers (Proficiency 10-90%)

```typescript
const learner = communicationService.prepareMessageForListener(
  "The fire burns bright",
  "The xak burns grü",
  languageId,
  learningAgent,
  tick
);
// → "The fire burns grü" (Mixed - partial comprehension)
// (Knows "fire" but not "bright")
```

**LLM sees partially translated text. Can infer meaning from context. Learns over time.**

## Comparison: Old vs New

### ❌ Old Approach (Broken)

```typescript
// LLM prompt includes alien words
const prompt = `
Your vocabulary: xak (fire), kräm (chief)
Speak about the fire using your language.
`;

const output = await llm.generate({ prompt });
// Problem: LLM doesn't understand "xak"
// Can't reason about fire spreading, fire being hot, etc.
// Semantic grounding lost!
```

### ✅ New Approach (Fixed)

```typescript
// LLM prompt is pure English
const prompt = `
Speak about the fire.
`;

const output = await llm.generate({ prompt });
// "The fire spreads rapidly toward the village!"

// THEN translate
const alien = await translateEnglishToAlien(output, language);
// "The xak spreads rapidly toward the village!"

// LLM understood "fire" semantics (hot, dangerous, spreads)
// Output is just decorated with alien words for display
```

## Integration Points

### ConversationSystem

```typescript
class ConversationSystem {
  async processMessage(
    speaker: Entity,
    listener: Entity,
    concept: string,
    world: World
  ): Promise<void> {
    // 1. Speaker's LLM generates English
    const englishMessage = await this.generateSpeech(speaker, concept);

    // 2. Translate to alien
    const speakerLanguage = this.getLanguage(speaker);
    const alienMessage = await this.communicationService.translateEnglishToAlien(
      englishMessage,
      speakerLanguage
    );

    // 3. Prepare for listener
    const listenerKnowledge = listener.getComponent('language_knowledge');
    const messageForListener = this.communicationService.prepareMessageForListener(
      englishMessage,
      alienMessage,
      speakerLanguage.languageId,
      listenerKnowledge,
      world.tick
    );

    // 4. Listener's LLM reads it
    await this.processIncomingMessage(listener, messageForListener);

    // 5. User sees alien
    this.ui.displaySpeechBubble(speaker, alienMessage);
  }
}
```

### Writing System (Poems, Papers)

For user-facing writing, you can still use `AlienVocabularyPromptBuilder` to inject vocabulary:

```typescript
// User will read this directly
const { system, user } = promptBuilder.buildPoemPrompt(
  'fire and mountain',
  language,
  agentKnowledge
);

const poem = await llm.generate({ prompt: user, systemPrompt: system });
// LLM returns: "The xak (fire) burns beneath the mäg (mountain)..."

// Display with tooltips
<HoverableAlienText renderedText={poem} />
```

**Use case:** When output goes **directly to user** (not to another agent's LLM).

## Benefits

✅ **LLMs think normally** - No semantic grounding issues
✅ **Language barriers work** - Agents can't understand unknown languages
✅ **Learning is natural** - Agents gradually understand more words
✅ **Immersive for users** - See authentic alien text with tooltips
✅ **Backward compatible** - Legacy methods still work

## Migration Path

1. **Immediate:** Use new methods for new agent conversations
2. **Optional:** Keep `AlienVocabularyPromptBuilder` for user-facing writing
3. **Gradual:** Migrate existing conversation code to use `translateEnglishToAlien`
4. **Future:** Remove legacy `generateAlienPhrase` when all code migrated

All tests pass. Ready to integrate!
