# Language System Integration Guide

This guide explains how to integrate the `@ai-village/language` package with the core game engine.

## What's Complete

### Phase 1: Procedural Language Generation ✅
- 45 universal + 18 alien-specific phonemes
- 7 body plan phonologies (insectoid, avian, aquatic, reptilian, multi-throated, crystalline, humanoid)
- Triple-weighted phoneme selection (body plan + planet + typology)
- Tracery-based word generation
- Automatic language character analysis

### Phase 2: LLM Translation ✅
- TranslationService with prompt engineering
- Morpheme consistency via dictionary storage
- Support for Groq, Cerebras, and other LLM providers
- Culturally appropriate translations based on planet/body plan

### Phase 3: Language Integration ✅
- LanguageComponent - Assigns languages to species/entities
- LanguageKnowledgeComponent - Tracks agent proficiency & vocabulary
- LanguageCommunicationService - Translation & comprehension
- Proficiency levels: None → Beginner → Intermediate → Advanced → Native
- Vocabulary learning through exposure

### Phase 4: Game Integration (Current)
- **Phase 4A:** CoreVocabulary (200+ concepts), VocabularyInitializationService, Naming patterns ✅
- **Phase 4B:** LanguageRegistry (singleton), Species-language associations ✅
- **Phase 4C:** LanguageSystem (ECS), Proficiency decay, Vocabulary consolidation ✅

## Integration Steps

### 1. Extend SpeciesComponent (Core Package)

Location: `packages/core/src/components/SpeciesComponent.ts`

```typescript
export interface SpeciesComponent {
  type: 'species';
  speciesId: string;
  displayName: string;
  bodyPlanId: string;

  // NEW: Language support
  nativeLanguageId?: string;  // Points to language entity
}
```

### 2. World Initialization

Location: `packages/core/src/world/WorldInitialization.ts` (or similar)

```typescript
import { LanguageRegistry, getLanguageRegistry } from '@ai-village/language';
import { LLMProvider } from '@ai-village/llm';

async function initializeWorld(llmProvider: LLMProvider): Promise<World> {
  const world = createWorld();

  // Initialize language registry
  const languageRegistry = getLanguageRegistry(llmProvider);

  // Generate languages for each species
  const species = getSpeciesDefinitions();

  for (const speciesData of species) {
    const languageEntity = await languageRegistry.ensureSpeciesLanguage(
      speciesData.speciesId,
      world.planetType, // e.g., 'volcanic'
      { type: speciesData.bodyPlanType }, // e.g., 'insectoid'
      {
        initializeVocabulary: true, // Pre-generate naming vocabulary
        essentialOnly: true, // ~50-80 words (fast)
        batchSize: 10,
        onProgress: (current, total, word) => {
          console.log(`[Language] ${speciesData.displayName}: ${current}/${total} - ${word}`);
        },
      }
    );

    // Update species component
    speciesData.nativeLanguageId = languageEntity.component.languageId;

    // Create language entity in ECS
    const langEntityId = world.createEntity();
    world.addComponent(langEntityId, languageEntity.component);
  }

  // Optional: Create common language
  const commonLanguage = await languageRegistry.ensureSpeciesLanguage(
    'common_language',
    'temperate',
    { type: 'humanoid' },
    { initializeVocabulary: true }
  );

  languageRegistry.setCommonLanguage(commonLanguage.component.languageId);

  const commonEntityId = world.createEntity();
  world.addComponent(commonEntityId, commonLanguage.component);

  return world;
}
```

### 3. Agent Spawning Integration

Location: `packages/core/src/entities/AgentSpawner.ts` (or similar)

```typescript
import {
  createLanguageKnowledgeComponent,
  LANGUAGE_KNOWLEDGE_COMPONENT_TYPE,
} from '@ai-village/language';

function spawnAgent(
  world: World,
  speciesId: string,
  position: Vector2
): Entity {
  const agent = world.createEntity();

  // Add standard components (position, species, brain, etc.)
  const speciesComponent = getSpeciesById(speciesId);
  world.addComponent(agent.id, speciesComponent);

  // Add language knowledge component
  if (speciesComponent.nativeLanguageId) {
    const nativeLanguages = [speciesComponent.nativeLanguageId];

    const languageKnowledge = createLanguageKnowledgeComponent(nativeLanguages);

    // Optional: Add common language if not native
    const languageRegistry = getLanguageRegistry();
    const commonLangId = languageRegistry.getCommonLanguageId();

    if (commonLangId && commonLangId !== speciesComponent.nativeLanguageId) {
      startLearningLanguage(languageKnowledge, commonLangId, 0);

      // Set to advanced level (0.8 proficiency, 800 words)
      const commonProf = languageKnowledge.knownLanguages.get(commonLangId)!;
      commonProf.proficiency = 0.8;
      commonProf.wordsKnown = 800;
    }

    world.addComponent(agent.id, languageKnowledge);
  }

  return agent;
}
```

### 4. Register LanguageSystem

Location: `packages/core/src/ecs/SystemRegistry.ts` (or game loop)

```typescript
import { LanguageSystem } from '@ai-village/language';
import { LanguageCommunicationService } from '@ai-village/language';

function registerSystems(world: World, llmProvider: LLMProvider): void {
  const languageRegistry = getLanguageRegistry(llmProvider);
  const communicationService = new LanguageCommunicationService(llmProvider);

  const languageSystem = new LanguageSystem(languageRegistry, communicationService, {
    enableDecay: true,
    decayThreshold: 12000, // 10 minutes @ 20 TPS
    decayRate: 0.999, // 0.1% per tick
    minimumProficiency: 0.05,
    updateInterval: 100, // Every 5 seconds
  });

  world.registerSystem(languageSystem);

  // Other systems...
}
```

### 5. Conversation Integration (Optional - Phase 4E)

Location: `packages/core/src/components/ConversationComponent.ts`

```typescript
export interface ConversationMessage {
  speakerId: EntityId;
  tick: Tick;

  // DEPRECATED (backwards compat)
  message?: string;

  // NEW: Language-aware messaging
  originalText: string;          // Alien words in speaker's language
  originalLanguageId: string;    // Speaker's native language
  translatedText: string;        // English translation
  comprehension?: number;        // Listener's comprehension (0-1)
}
```

Location: `packages/core/src/systems/ConversationSystem.ts`

```typescript
import { LanguageCommunicationService } from '@ai-village/language';

class ConversationSystem {
  constructor(
    private languageRegistry: LanguageRegistry,
    private communicationService: LanguageCommunicationService
  ) {}

  async sendMessage(
    speaker: Entity,
    listener: Entity,
    concept: string,
    world: World
  ): Promise<void> {
    const speakerSpecies = speaker.getComponent('species');
    const listenerKnowledge = listener.getComponent('language_knowledge');

    // Get speaker's language
    const speakerLanguage = this.languageRegistry.getSpeciesLanguage(
      speakerSpecies.speciesId
    );

    if (!speakerLanguage) {
      console.warn('[Conversation] Speaker has no language');
      return;
    }

    // Generate alien phrase
    const phrase = await this.communicationService.generateAlienPhrase(
      concept,
      speakerLanguage.component,
      world.tick
    );

    // Translate for listener
    const translated = this.communicationService.translateMessage(
      phrase.fullPhrase,
      speakerLanguage.component,
      listenerKnowledge,
      world.tick
    );

    // Create message
    const message: ConversationMessage = {
      speakerId: speaker.id,
      tick: world.tick,
      originalText: phrase.fullPhrase,
      originalLanguageId: speakerLanguage.component.languageId,
      translatedText: translated.translated,
      comprehension: translated.comprehension,
    };

    // Add to both entities' conversations
    speaker.getComponent('conversation').messages.push(message);
    listener.getComponent('conversation').messages.push(message);
  }
}
```

### 6. UI Display (Optional - Phase 4F)

Location: `packages/renderer/src/panels/ChatLogPanel.tsx`

```typescript
function renderMessage(
  message: ConversationMessage,
  viewerEntity: Entity
): React.ReactNode {
  const viewerKnowledge = viewerEntity.getComponent('language_knowledge');

  if (!viewerKnowledge) {
    // No language knowledge - show English
    return <div className="message">{message.translatedText}</div>;
  }

  const proficiency = getProficiency(
    viewerKnowledge,
    message.originalLanguageId
  );

  if (proficiency >= 0.9) {
    // Full understanding
    return <div className="message understood">{message.translatedText}</div>;
  } else if (proficiency >= 0.3) {
    // Partial understanding
    return (
      <div className="message partial">
        <span className="alien-text">{message.originalText}</span>
        <span className="comprehension">
          [{Math.round(proficiency * 100)}% understood: {message.translatedText}]
        </span>
      </div>
    );
  } else {
    // Minimal/no understanding
    return (
      <div className="message incomprehensible">
        <span className="alien-text">{message.originalText}</span>
        <span className="incomprehensible">[incomprehensible]</span>
      </div>
    );
  }
}
```

### 7. Procedural Naming (Optional)

Use pre-generated vocabulary for agent/place names:

```typescript
import { VocabularyInitializationService } from '@ai-village/language';

function generateAgentName(
  speciesId: string,
  languageRegistry: LanguageRegistry,
  vocabularyService: VocabularyInitializationService
): string {
  const languageEntity = languageRegistry.getSpeciesLanguage(speciesId);

  if (!languageEntity) {
    return 'Unnamed';
  }

  // Generate name from vocabulary
  const name = vocabularyService.generateNameFromVocabulary(
    languageEntity.component,
    ['quality', 'nature'], // or ['color', 'action'], etc.
    Math.random
  );

  return name;
}

// Example output: "Swift-River", "Red-Wing", "Stone-Walker"
```

## Performance Considerations

### Vocabulary Initialization
- **Essential vocabulary:** ~50-80 words, ~5-10 seconds
- **Full vocabulary:** ~200 words, ~20-30 seconds
- Recommendation: Initialize during loading screen or world generation

### LLM Calls
- **Per conversation:** 1 LLM call for new words
- **Cached words:** 0 LLM calls (instant lookup)
- **Batching:** VocabularyInitializationService batches requests

### LanguageSystem Throttling
- Default: Every 5 seconds (100 ticks @ 20 TPS)
- Adjustable via `updateInterval` option
- Minimal performance impact (< 1ms per update)

## Save/Load Persistence

Language components serialize automatically via ECS:

```typescript
// LanguageComponent serialization
export function serializeLanguageComponent(
  component: LanguageComponent
): SerializedLanguageComponent;

export function deserializeLanguageComponent(
  data: SerializedLanguageComponent
): LanguageComponent;

// LanguageKnowledgeComponent serialization
export function serializeLanguageKnowledgeComponent(
  component: LanguageKnowledgeComponent
): SerializedLanguageKnowledgeComponent;

export function deserializeLanguageKnowledgeComponent(
  data: SerializedLanguageKnowledgeComponent
): LanguageKnowledgeComponent;
```

No special save/load handling needed beyond standard ECS serialization.

## Testing

Run language package tests:

```bash
cd packages/language
npm test
```

All 123 tests should pass.

## Dependencies

- `@ai-village/llm` - LLM provider abstraction
- `@ai-village/core` - ECS types (World, Entity, System)
- `tracery-grammar` - Grammar-based word generation

## Example: Complete Integration

See `packages/language/src/__tests__/LanguageCommunication.test.ts` for end-to-end examples.

## Troubleshooting

### Issue: Languages not generating
- Check LLM provider is configured with API key
- Verify `initializeVocabulary: true` in `ensureSpeciesLanguage()`
- Check console for errors

### Issue: Agents can't speak
- Verify `LanguageKnowledgeComponent` added during spawning
- Check `speciesComponent.nativeLanguageId` is set
- Verify language entity exists in ECS

### Issue: Proficiency not updating
- Verify `LanguageSystem` is registered
- Check system priority (should be 850)
- Ensure `recordWordExposure()` called during conversations

### Issue: Names are generic
- Verify vocabulary was initialized (`initializeVocabulary: true`)
- Check `component.knownWords.size > 0`
- Use `VocabularyInitializationService.generateNameFromVocabulary()`

## Future Enhancements (Phase 5+)

See PHASE_4_SPEC.md for planned features:
- Language families (related languages easier to learn)
- Dialects (regional variations)
- Written languages (reading/writing skills)
- Translation items (dictionaries, scrolls)
- Language teachers (NPCs)
- Universal translator (late-game tech)
- Code-switching (bilingual mixing)
- Loan words (borrowed between languages)
- Language evolution (changes over generations)
- Extinct languages (ancient ruins)
