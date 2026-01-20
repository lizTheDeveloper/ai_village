# Phase 4: Game Integration

## Overview

Phase 4 integrates the language system with the core game engine:
- Auto-generate languages for species during world creation
- Manage language entities and components via ECS
- Enable language-aware conversations between agents
- Handle language learning during gameplay

## Architecture

### 1. LanguageRegistry (Singleton Service)

Central registry for all languages in the game world.

```typescript
class LanguageRegistry {
  private languages: Map<string, LanguageEntity>;
  private speciesLanguages: Map<string, string>; // speciesId → languageId
  private commonLanguageId?: string;

  /**
   * Register a new language
   */
  registerLanguage(entity: LanguageEntity): void;

  /**
   * Get language by ID
   */
  getLanguage(languageId: string): LanguageEntity | undefined;

  /**
   * Get language for a species
   */
  getSpeciesLanguage(speciesId: string): LanguageEntity | undefined;

  /**
   * Set common/universal language
   */
  setCommonLanguage(languageId: string): void;

  /**
   * Generate language for a species if not exists
   */
  ensureSpeciesLanguage(
    speciesId: string,
    planetType: string,
    bodyPlan: BodyPlan
  ): LanguageEntity;

  /**
   * Get all active languages
   */
  getAllLanguages(): LanguageEntity[];
}
```

**Language Entity:**
Language data stored as ECS entity with LanguageComponent.

```typescript
interface LanguageEntity {
  entityId: string;
  component: LanguageComponent;
}
```

### 2. SpeciesComponent Integration

**Option A: Automatic Language Generation (Recommended)**
```typescript
// In species creation/loading
const speciesComponent = createSpeciesComponent(
  'thrakeen_insectoid',
  'Thrakeen',
  'insectoid_body_plan'
);

// Auto-generate language during world setup
const languageEntity = languageRegistry.ensureSpeciesLanguage(
  'thrakeen_insectoid',
  'volcanic', // planet type
  { type: 'insectoid' }
);

// Store language reference
speciesComponent.nativeLanguageId = languageEntity.component.languageId;
```

**Option B: Manual Language Assignment**
```typescript
// Pre-generate language
const language = languageGenerator.generateLanguage(
  { type: 'volcanic', seed: 'thrakeen_v1' },
  { type: 'insectoid' },
  'thrakeen_language'
);

const languageEntity = world.createEntity();
languageEntity.addComponent(createLanguageComponent('thrakeen_language', language));

// Assign to species
speciesComponent.nativeLanguageId = 'thrakeen_language';
```

**SpeciesComponent Extension:**
```typescript
class SpeciesComponent {
  // ... existing fields ...

  // NEW: Native language reference
  public nativeLanguageId?: string;  // Points to language entity
}
```

### 3. Agent Language Initialization

When spawning agents, initialize their language knowledge based on species.

```typescript
function spawnAgent(speciesId: string, world: World): Entity {
  const agent = world.createEntity();

  // Add species component
  const speciesComponent = getSpeciesById(speciesId);
  agent.addComponent(speciesComponent.clone());

  // Initialize language knowledge
  if (speciesComponent.nativeLanguageId) {
    const languageKnowledge = createLanguageKnowledgeComponent(
      [speciesComponent.nativeLanguageId]
    );
    agent.addComponent(languageKnowledge);
  }

  return agent;
}
```

**LanguageKnowledgeComponent added to agents:**
- Native speakers: proficiency = 1.0
- Bilingual agents: multiple native languages
- Learning modifiers based on intelligence/traits

### 4. LanguageSystem (ECS System)

Manages language-related updates and learning.

```typescript
class LanguageSystem extends System {
  constructor(
    private languageRegistry: LanguageRegistry,
    private communicationService: LanguageCommunicationService
  ) {
    super();
    this.priority = 850; // After conversation, before metrics
  }

  requiredComponents = ['language_knowledge'] as const;

  update(world: World): void {
    const entities = world.query()
      .with('language_knowledge')
      .executeEntities();

    for (const entity of entities) {
      this.updateLanguageLearning(entity, world);
    }
  }

  /**
   * Update proficiency decay, vocabulary consolidation, etc.
   */
  private updateLanguageLearning(entity: Entity, world: World): void {
    const knowledge = entity.getComponent<LanguageKnowledgeComponent>('language_knowledge')!;

    // Decay unused languages (optional)
    for (const [langId, prof] of knowledge.knownLanguages) {
      if (world.tick - prof.lastUsed > 12000) { // 10 minutes unused
        // Slight proficiency decay for non-native languages
        if (!knowledge.nativeLanguages.includes(langId)) {
          prof.proficiency *= 0.999; // 0.1% decay
        }
      }
    }
  }
}
```

### 5. ConversationComponent Integration

**Extend ConversationMessage:**
```typescript
interface ConversationMessage {
  speakerId: EntityId;
  tick: Tick;

  // DEPRECATED: message field (kept for backwards compat)
  message?: string;

  // NEW: Language-aware messaging
  originalText: string;          // Alien words in speaker's language
  originalLanguageId: string;    // Speaker's native language
  translatedText: string;        // English translation
  comprehension?: number;        // Listener's comprehension (0-1)
}
```

**ConversationSystem Integration:**

```typescript
class ConversationSystem {
  constructor(
    private languageRegistry: LanguageRegistry,
    private communicationService: LanguageCommunicationService
  ) {}

  private async sendMessage(
    speaker: Entity,
    listener: Entity,
    concept: string,
    world: World
  ): Promise<void> {
    const speakerSpecies = speaker.getComponent<SpeciesComponent>('species')!;
    const listenerKnowledge = listener.getComponent<LanguageKnowledgeComponent>('language_knowledge')!;

    // Get speaker's language
    const speakerLanguage = this.languageRegistry.getSpeciesLanguage(speakerSpecies.speciesId);
    if (!speakerLanguage) {
      console.warn('[ConversationSystem] Speaker has no language');
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

    // Add to conversation
    const speakerConv = speaker.getComponent<ConversationComponent>('conversation')!;
    const message: ConversationMessage = {
      speakerId: speaker.id,
      tick: world.tick,
      originalText: phrase.fullPhrase,
      originalLanguageId: speakerLanguage.component.languageId,
      translatedText: translated.translated,
      comprehension: translated.comprehension,
    };

    // Update both speaker and listener conversations
    speakerConv.messages.push(message);
    const listenerConv = listener.getComponent<ConversationComponent>('conversation')!;
    listenerConv.messages.push(message);
  }
}
```

### 6. UI Display

**Chat Log Panel:**
```typescript
function renderMessage(message: ConversationMessage, viewerEntity: Entity): string {
  const viewerKnowledge = viewerEntity.getComponent<LanguageKnowledgeComponent>('language_knowledge');

  if (!viewerKnowledge) {
    // No language knowledge component, show English
    return message.translatedText;
  }

  const proficiency = getProficiency(viewerKnowledge, message.originalLanguageId);

  if (proficiency >= 0.9) {
    // Full understanding
    return message.translatedText;
  } else if (proficiency >= 0.3) {
    // Partial understanding
    return `${message.originalText} [${Math.round(proficiency * 100)}% understood: ${message.translatedText}]`;
  } else {
    // Minimal/no understanding
    return `${message.originalText} [incomprehensible]`;
  }
}
```

**Language Learning Notification:**
```
🌐 You learned a new word in Thrakeen! "xak" = fire (confidence: 85%)
📚 Thrakeen proficiency: 15% (Beginner)
```

### 7. Save/Load Integration

**Language Persistence:**
```typescript
// Save all languages
const languagesData = {
  languages: languageRegistry.getAllLanguages().map(lang => ({
    entityId: lang.entityId,
    component: serializeLanguageComponent(lang.component),
  })),
  speciesLanguages: Object.fromEntries(languageRegistry.getSpeciesLanguages()),
  commonLanguageId: languageRegistry.getCommonLanguageId(),
};

// Load languages
for (const langData of languagesData.languages) {
  const entity = world.createEntity(langData.entityId);
  const component = deserializeLanguageComponent(langData.component);
  entity.addComponent(component);
  languageRegistry.registerLanguage({ entityId: entity.id, component });
}
```

**Agent Language Knowledge:**
Automatically saved/loaded as part of entity components (no special handling needed).

### 8. Common Language Support

Universal language that all agents can speak (like English/Common in fantasy).

```typescript
// During world initialization
const commonLanguage = languageGenerator.generateLanguage(
  { type: 'temperate', seed: 'common_v1' },
  { type: 'humanoid' },
  'common_language'
);

const commonEntity = world.createEntity();
commonEntity.addComponent(createLanguageComponent('common_language', commonLanguage, {
  isCommon: true,
}));

languageRegistry.setCommonLanguage('common_language');

// All agents get common language at proficiency 0.8 (advanced, but not native)
function spawnAgent(speciesId: string, world: World): Entity {
  const agent = world.createEntity();
  const speciesComponent = getSpeciesById(speciesId);

  const languageKnowledge = createLanguageKnowledgeComponent(
    [speciesComponent.nativeLanguageId!]
  );

  // Add common language if not native
  if (speciesComponent.nativeLanguageId !== 'common_language') {
    startLearningLanguage(languageKnowledge, 'common_language', 0);
    const commonProf = languageKnowledge.knownLanguages.get('common_language')!;
    commonProf.proficiency = 0.8; // Advanced level
    commonProf.wordsKnown = 800; // 80% of fluency
  }

  agent.addComponent(languageKnowledge);
  return agent;
}
```

### 9. Performance Optimizations

**Word Generation Caching:**
```typescript
class LanguageWordCache {
  private cache: Map<string, Map<string, string>>; // languageId → concept → word

  getOrGenerate(
    languageId: string,
    concept: string,
    generator: () => Promise<string>
  ): Promise<string> {
    const langCache = this.cache.get(languageId);
    if (langCache?.has(concept)) {
      return Promise.resolve(langCache.get(concept)!);
    }

    return generator().then(word => {
      if (!this.cache.has(languageId)) {
        this.cache.set(languageId, new Map());
      }
      this.cache.get(languageId)!.set(concept, word);
      return word;
    });
  }
}
```

**Lazy Translation:**
Only translate messages when they're displayed to the player, not for every NPC conversation.

**Batch LLM Calls:**
Queue multiple word translations and send in one batch to reduce API overhead.

## Implementation Plan

### Phase 4A: Registry & Species Integration
1. Create LanguageRegistry
2. Extend SpeciesComponent with nativeLanguageId
3. Auto-generate languages for existing species
4. Write unit tests for registry

### Phase 4B: ECS Integration
5. Create LanguageSystem
6. Integrate with agent spawning
7. Add language components to entities
8. Write integration tests

### Phase 4C: Conversation Integration
9. Extend ConversationMessage
10. Update ConversationSystem to use language service
11. Handle translation and comprehension
12. Write conversation tests

### Phase 4D: UI & Polish
13. Add chat log formatting for alien text
14. Add language learning notifications
15. Add language stats panel
16. End-to-end testing with real agents

## Success Criteria

✅ Languages auto-generated for species during world setup
✅ Agents have LanguageKnowledgeComponent with native + common languages
✅ Conversations use alien words with translations
✅ Comprehension shown in chat log based on proficiency
✅ Vocabulary learning happens during conversations
✅ Languages persist across save/load
✅ Common language enables basic communication
✅ No performance impact (< 1ms per conversation)
✅ Full test coverage (unit + integration + e2e)

## Future Enhancements (Phase 5+)

- **Language Families:** Related languages easier to learn (Elvish → High Elvish)
- **Dialects:** Regional variations of same language
- **Written Languages:** Reading/writing skills separate from speaking
- **Translation Items:** Books, scrolls, dictionaries that teach words
- **Language Teachers:** NPCs that give language lessons
- **Universal Translator:** Late-game tech for instant translation
- **Code-Switching:** Bilingual agents mix languages
- **Loan Words:** Words borrowed between languages
- **Language Evolution:** Languages change over generations
- **Extinct Languages:** Ancient languages found in ruins
