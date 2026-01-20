# UI Rendering Guide - Alien Language Display

This guide explains how to display alien language text to users with hover-for-translation tooltips.

## The Sweet Spot: Three-Layer System

### 1. **Vocabulary Layer** (Pre-generated)
Pre-generate core vocabulary when creating a language:
```typescript
const languageEntity = await languageRegistry.ensureSpeciesLanguage(
  'volcanic_insectoid',
  'volcanic',
  { type: 'insectoid' },
  { initializeVocabulary: true, essentialOnly: true }
);
```

### 2. **Generation Layer** (LLM with vocabulary)
When an agent writes/speaks, inject their known words into the LLM prompt:
```typescript
import { AlienVocabularyPromptBuilder } from '@ai-village/language';

const promptBuilder = new AlienVocabularyPromptBuilder();

// Build prompt for poem writing
const { system, user } = promptBuilder.buildPoemPrompt(
  'fire and mountain',  // topic
  languageComponent,    // language
  knowledgeComponent    // agent's knowledge (optional)
);

// Call LLM
const response = await llmProvider.generate({
  prompt: user,
  systemPrompt: system
});

// LLM returns: "The xak (fire) burns beneath the mäg (mountain)..."
```

### 3. **Display Layer** (UI with tooltips)
Render the LLM output with hover tooltips:
```typescript
import { AlienTextRenderer } from '@ai-village/language';
import { HoverableAlienText } from '@ai-village/language/ui';

const renderer = new AlienTextRenderer(llmProvider);

// Extract alien words from LLM text
const alienWords = promptBuilder.extractAlienWords(response.text);
// { xak: 'fire', mäg: 'mountain' }

// Or if you have pre-rendered data:
const renderedText = renderer.getRenderingData(
  "xak mäg däk",  // alien text
  languageComponent
);

// Display with React
<HoverableAlienText
  renderedText={renderedText}
  showTranslation={true}
  style="speech-bubble"
/>
```

## Use Cases

### Speech Bubbles

```typescript
// 1. Agent speaks
const { system, user } = promptBuilder.buildDialoguePrompt(
  'greeting the chief',
  languageComponent,
  agentKnowledge
);

const speech = await llmProvider.generate({ prompt: user, systemPrompt: system });
// Returns: "Greetings, kräm (chief)! The xak (fire) festival begins."

// 2. Render speech bubble
<HoverableAlienText
  renderedText={renderer.getRenderingData(speech.text, languageComponent)}
  style="speech-bubble"
  tooltipPosition="top"
/>
```

### Research Papers

```typescript
// 1. Agent writes research paper
const { system, user } = promptBuilder.buildResearchPrompt(
  'thermal dynamics of volcanic substrates',
  languageComponent,
  agentKnowledge,
  ['nature', 'qualities', 'actions']  // focus vocabulary
);

const paper = await llmProvider.generate({ prompt: user, systemPrompt: system });
// Returns: "This study examines thermal xak (fire) propagation through
//           crystalline substrates under high-pressure conditions..."

// 2. Render as article
<HoverableAlienText
  renderedText={renderer.getRenderingData(paper.text, languageComponent)}
  style="default"
  showTranslation={false}  // Academic style, hover only
/>
```

### Newspaper Articles

```typescript
// 1. Generate article
const { system, user } = promptBuilder.buildNewsPrompt(
  'village festival announcement',
  languageComponent,
  agentKnowledge,
  ['culture', 'nature']
);

const article = await llmProvider.generate({ prompt: user, systemPrompt: system });
// Returns: "The village kräm (chief) announced today that the annual
//           xak (fire) festival will begin..."

// 2. Render newspaper style
<HoverableAlienText
  renderedText={renderer.getRenderingData(article.text, languageComponent)}
  style="newspaper"
  tooltipPosition="bottom"
/>
```

### Poems (Multi-line)

```typescript
// 1. Generate poem
const { system, user } = promptBuilder.buildPoemPrompt(
  'the red fire at night',
  languageComponent,
  agentKnowledge,
  ['colors', 'nature', 'sky']
);

const poem = await llmProvider.generate({ prompt: user, systemPrompt: system });
// Returns multi-line poem with alien words

// 2. Parse into lines
const lines = poem.text.split('\n').map(line =>
  renderer.getRenderingData(line, languageComponent)
);

// 3. Render multi-line
<MultiLineAlienText
  lines={lines}
  style="book"
  showTranslations={true}
  tooltipPosition="right"
/>
```

### In-Game Books/Scrolls

```typescript
// Book content with alien terminology
const bookPages = [
  "The ancient kräm (chief) wielded the sacred däk-xak (night-fire)...",
  "His wisdom was like the mäg (mountain), unshakable and eternal...",
  "The prophecy spoke of a warrior with kräd (red) markings..."
];

// Render each page
{bookPages.map((page, i) => (
  <div key={i} className="book-page">
    <HoverableAlienText
      renderedText={renderer.getRenderingData(page, languageComponent)}
      style="book"
      showTranslation={false}
    />
  </div>
))}
```

## Advanced: Pre-rendering for Performance

For frequently displayed text (UI labels, item names, etc.), pre-render once:

```typescript
// During initialization
const preRendered = new Map<string, RenderedAlienText>();

const commonPhrases = [
  ['hello', 'friend'],
  ['goodbye', 'warrior'],
  ['thank', 'you']
];

for (const phrase of commonPhrases) {
  const rendered = await renderer.renderSentence(
    phrase,
    languageComponent,
    { addSeparators: true }
  );
  preRendered.set(phrase.join(' '), rendered);
}

// Later, instant lookup
<HoverableAlienText renderedText={preRendered.get('hello friend')!} />
```

## Complete Example: Agent Writing System

```typescript
import {
  LanguageRegistry,
  AlienVocabularyPromptBuilder,
  AlienTextRenderer,
  HoverableAlienText
} from '@ai-village/language';

class AgentWritingSystem {
  private registry: LanguageRegistry;
  private promptBuilder: AlienVocabularyPromptBuilder;
  private renderer: AlienTextRenderer;
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
    this.registry = LanguageRegistry.getInstance(llmProvider);
    this.promptBuilder = new AlienVocabularyPromptBuilder();
    this.renderer = new AlienTextRenderer(llmProvider);
  }

  /**
   * Agent writes a poem
   */
  async writePoem(
    agentId: string,
    topic: string,
    world: World
  ): Promise<RenderedAlienText[]> {
    // Get agent components
    const agent = world.getEntity(agentId);
    const species = agent.getComponent('species');
    const knowledge = agent.getComponent('language_knowledge');

    // Get language
    const languageEntity = this.registry.getSpeciesLanguage(species.speciesId);
    if (!languageEntity) {
      throw new Error('Agent has no language');
    }

    // Build prompt with agent's vocabulary
    const { system, user } = this.promptBuilder.buildPoemPrompt(
      topic,
      languageEntity.component,
      knowledge,
      ['nature', 'colors', 'sky', 'qualities']
    );

    // Generate poem
    const response = await this.llmProvider.generate({
      prompt: user,
      systemPrompt: system
    });

    // Parse into lines
    const lines = response.text.split('\n').filter(l => l.trim());

    // Render each line with hover data
    const rendered = lines.map(line =>
      this.renderer.getRenderingData(line, languageEntity.component)
    );

    return rendered;
  }

  /**
   * React component for displaying agent's poem
   */
  PoemDisplay: React.FC<{ lines: RenderedAlienText[] }> = ({ lines }) => (
    <div className="agent-poem">
      <h3>Poem by Agent</h3>
      <MultiLineAlienText
        lines={lines}
        style="book"
        showTranslations={true}
        tooltipPosition="right"
      />
    </div>
  );
}
```

## UI Integration with Game

```typescript
// In your game's ConversationPanel or SpeechBubbleComponent:

import { HoverableAlienText } from '@ai-village/language/ui';

function SpeechBubble({ message, speakerLanguage }: Props) {
  const renderer = new AlienTextRenderer(llmProvider);

  // Get rendering data
  const rendered = renderer.getRenderingData(
    message.originalText,  // Already has alien words from LLM
    speakerLanguage
  );

  return (
    <div className="speech-bubble">
      <HoverableAlienText
        renderedText={rendered}
        style="speech-bubble"
        tooltipPosition="top"
        tooltipDelay={200}
      />
    </div>
  );
}
```

## Styling

Add custom CSS for your theme:

```css
/* Custom alien text styling */
.alien-word {
  color: #8b5cf6;  /* Purple for alien text */
  font-weight: 500;
  transition: color 0.2s;
}

.alien-word:hover {
  color: #a78bfa;  /* Lighter purple on hover */
}

.alien-tooltip {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Speech bubble tail */
.alien-text-container.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 20px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #333;
}
```

## Performance Tips

1. **Pre-render common phrases** during loading
2. **Cache LLM responses** for repeated text
3. **Throttle tooltip updates** (default 300ms is good)
4. **Lazy render tooltips** (only when hovering)
5. **Limit vocabulary in prompts** to 30 words max

## Testing

```typescript
// Test alien text rendering
const testRenderer = new AlienTextRenderer(mockLLMProvider);

const result = await testRenderer.renderSentence(
  ['fire', 'burn', 'bright'],
  testLanguageComponent
);

expect(result.tokens).toHaveLength(3);
expect(result.fullText).toContain('xak'); // alien word for fire
```

## Next Steps

See INTEGRATION_GUIDE.md for full game engine integration.
