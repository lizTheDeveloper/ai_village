/**
 * Alien Vocabulary Prompt Builder
 *
 * Builds LLM prompts with alien vocabulary context.
 * Used when agents write poems, research papers, newspapers, or speak.
 *
 * The LLM is told what alien words exist and should use them naturally.
 */

import type { LanguageComponent } from './LanguageComponent.js';
import type { LanguageKnowledgeComponent } from './LanguageKnowledgeComponent.js';
import { getProficiency } from './LanguageKnowledgeComponent.js';

/**
 * Vocabulary context for LLM prompts
 */
export interface VocabularyContext {
  /**
   * Language description
   */
  languageDescription: string;

  /**
   * Available words (concept → alien word)
   */
  vocabulary: Map<string, string>;

  /**
   * Agent's proficiency in this language (0-1)
   */
  proficiency: number;

  /**
   * Whether this is the agent's native language
   */
  isNative: boolean;
}

/**
 * Prompt template for different writing styles
 */
export interface PromptTemplate {
  /**
   * Template name
   */
  name: string;

  /**
   * System instructions
   */
  systemPrompt: string;

  /**
   * User prompt template (with {vocabulary}, {topic} placeholders)
   */
  userPrompt: string;

  /**
   * Example output (optional)
   */
  example?: string;
}

/**
 * Pre-defined templates for common writing tasks
 */
export const WRITING_TEMPLATES: Record<string, PromptTemplate> = {
  poem: {
    name: 'Poem',
    systemPrompt: 'You are a poet writing in an alien language. Use the provided vocabulary naturally in your verse.',
    userPrompt: `Write a short poem about {topic}.

**Your Language:** {languageDescription}

**Available Vocabulary:**
{vocabulary}

**Instructions:**
- Use alien words for key concepts (show English translation in parentheses after first use)
- Mix alien words naturally into English sentences
- Keep the poetic style flowing
- 4-8 lines total

Example format: "The kräd (red) fire burns bright..."`,
    example: 'The xak (fire) burns in the däk (night),\nIts flö (glow) speaks of ancient might.',
  },

  researchPaper: {
    name: 'Research Paper',
    systemPrompt: 'You are a scientist writing a research paper. Use technical alien terms for specialized concepts.',
    userPrompt: `Write a research paper abstract about {topic}.

**Your Language:** {languageDescription}

**Available Technical Vocabulary:**
{vocabulary}

**Instructions:**
- Use alien words for technical/scientific terms
- Define terms on first use: "xak (fire)" or "thermal xak (fire) dynamics"
- Academic writing style
- 100-150 words

Example: "This study examines thermal xak (fire) propagation in crystalline substrates..."`,
  },

  newspaper: {
    name: 'Newspaper Article',
    systemPrompt: 'You are a journalist writing a news article. Use local alien terminology for cultural concepts.',
    userPrompt: `Write a newspaper article about {topic}.

**Your Language:** {languageDescription}

**Cultural Vocabulary:**
{vocabulary}

**Instructions:**
- Use alien words for cultural roles, places, and concepts
- Explain terms naturally: "the local kräm (chief) announced..."
- Journalistic style (clear, factual)
- 80-120 words
- Include quotes if relevant

Example: "The village kräm (chief) announced today that..."`,
  },

  dialogue: {
    name: 'Dialogue',
    systemPrompt: 'You are an agent speaking. Use alien words your character would naturally use.',
    userPrompt: `Speak about {topic} in character.

**Your Language:** {languageDescription}
**Your Proficiency:** {proficiency}

**Known Words:**
{vocabulary}

**Instructions:**
- Use alien words you know well
- Higher proficiency = more alien words
- Lower proficiency = occasional alien words mixed with English
- Show hesitation or translation for words you're learning: "It's... xak? Fire."
- 1-3 sentences

Native speaker example: "The xak burns bright under the däk sky."
Learning speaker example: "I see the... xak? The fire, yes."`,
  },
};

/**
 * Alien Vocabulary Prompt Builder
 *
 * Injects alien vocabulary into LLM prompts for writing tasks.
 */
export class AlienVocabularyPromptBuilder {
  /**
   * Build prompt context from language components
   *
   * @param languageComponent - Language definition
   * @param knowledgeComponent - Agent's language knowledge (optional)
   * @param focusCategories - Which vocabulary categories to include (optional)
   * @returns Vocabulary context for prompts
   */
  buildContext(
    languageComponent: LanguageComponent,
    knowledgeComponent?: LanguageKnowledgeComponent,
    focusCategories?: string[]
  ): VocabularyContext {
    const proficiency = knowledgeComponent
      ? getProficiency(knowledgeComponent, languageComponent.languageId)
      : 1.0;

    const isNative = knowledgeComponent
      ? knowledgeComponent.nativeLanguages.includes(languageComponent.languageId)
      : true;

    // Filter vocabulary if categories specified
    let vocabulary = new Map<string, string>();

    for (const [concept, wordData] of languageComponent.knownWords) {
      if (!focusCategories || this.matchesCategory(concept, focusCategories)) {
        vocabulary.set(concept, wordData.word);
      }
    }

    return {
      languageDescription: languageComponent.languageConfig.description || 'Unknown language',
      vocabulary,
      proficiency,
      isNative,
    };
  }

  /**
   * Build complete LLM prompt for writing task
   *
   * @param template - Writing template to use
   * @param topic - Topic to write about
   * @param context - Vocabulary context
   * @returns Complete prompt (system + user)
   */
  buildPrompt(
    template: PromptTemplate,
    topic: string,
    context: VocabularyContext
  ): {
    system: string;
    user: string;
  } {
    // Format vocabulary for prompt
    const vocabText = this.formatVocabulary(context.vocabulary);

    // Replace placeholders
    let userPrompt = template.userPrompt
      .replace('{topic}', topic)
      .replace('{languageDescription}', context.languageDescription)
      .replace('{vocabulary}', vocabText)
      .replace('{proficiency}', this.getProficiencyLabel(context.proficiency));

    return {
      system: template.systemPrompt,
      user: userPrompt,
    };
  }

  /**
   * Build prompt for poem writing
   *
   * @param topic - Poem topic
   * @param languageComponent - Language to use
   * @param knowledgeComponent - Agent's knowledge (optional)
   * @param focusCategories - Vocabulary categories to use
   * @returns LLM prompt
   */
  buildPoemPrompt(
    topic: string,
    languageComponent: LanguageComponent,
    knowledgeComponent?: LanguageKnowledgeComponent,
    focusCategories: string[] = ['nature', 'qualities', 'sky']
  ): { system: string; user: string } {
    const context = this.buildContext(languageComponent, knowledgeComponent, focusCategories);
    return this.buildPrompt(WRITING_TEMPLATES.poem!, topic, context);
  }

  /**
   * Build prompt for research paper
   *
   * @param topic - Research topic
   * @param languageComponent - Language to use
   * @param knowledgeComponent - Agent's knowledge (optional)
   * @param focusCategories - Vocabulary categories to use
   * @returns LLM prompt
   */
  buildResearchPrompt(
    topic: string,
    languageComponent: LanguageComponent,
    knowledgeComponent?: LanguageKnowledgeComponent,
    focusCategories: string[] = ['nature', 'actions', 'qualities']
  ): { system: string; user: string } {
    const context = this.buildContext(languageComponent, knowledgeComponent, focusCategories);
    return this.buildPrompt(WRITING_TEMPLATES.researchPaper!, topic, context);
  }

  /**
   * Build prompt for newspaper article
   *
   * @param topic - News topic
   * @param languageComponent - Language to use
   * @param knowledgeComponent - Agent's knowledge (optional)
   * @param focusCategories - Vocabulary categories to use
   * @returns LLM prompt
   */
  buildNewsPrompt(
    topic: string,
    languageComponent: LanguageComponent,
    knowledgeComponent?: LanguageKnowledgeComponent,
    focusCategories: string[] = ['culture', 'nature', 'actions']
  ): { system: string; user: string } {
    const context = this.buildContext(languageComponent, knowledgeComponent, focusCategories);
    return this.buildPrompt(WRITING_TEMPLATES.newspaper!, topic, context);
  }

  /**
   * Build prompt for agent dialogue
   *
   * @param topic - What to talk about
   * @param languageComponent - Language to use
   * @param knowledgeComponent - Agent's knowledge (optional)
   * @returns LLM prompt
   */
  buildDialoguePrompt(
    topic: string,
    languageComponent: LanguageComponent,
    knowledgeComponent?: LanguageKnowledgeComponent
  ): { system: string; user: string } {
    const context = this.buildContext(languageComponent, knowledgeComponent);
    return this.buildPrompt(WRITING_TEMPLATES.dialogue!, topic, context);
  }

  /**
   * Format vocabulary for display in prompt
   *
   * @param vocabulary - Vocabulary map
   * @returns Formatted string
   */
  private formatVocabulary(vocabulary: Map<string, string>): string {
    if (vocabulary.size === 0) {
      return '(No vocabulary available)';
    }

    const entries = Array.from(vocabulary.entries())
      .slice(0, 30) // Limit to 30 words to keep prompt manageable
      .map(([english, alien]) => `- ${english} = ${alien}`)
      .join('\n');

    const count = vocabulary.size;
    const truncated = count > 30 ? ` (showing 30 of ${count})` : '';

    return entries + truncated;
  }

  /**
   * Get proficiency label for prompts
   *
   * @param proficiency - Proficiency level (0-1)
   * @returns Human-readable label
   */
  private getProficiencyLabel(proficiency: number): string {
    if (proficiency >= 0.9) return 'Native (fluent)';
    if (proficiency >= 0.6) return 'Advanced';
    if (proficiency >= 0.3) return 'Intermediate';
    if (proficiency >= 0.1) return 'Beginner';
    return 'Minimal';
  }

  /**
   * Check if concept matches any category
   *
   * Simple heuristic for common categories.
   *
   * @param concept - English concept
   * @param categories - Category names
   * @returns True if matches
   */
  private matchesCategory(concept: string, categories: string[]): boolean {
    // Category keywords
    const categoryKeywords: Record<string, string[]> = {
      nature: ['fire', 'water', 'earth', 'air', 'stone', 'mountain', 'river', 'forest', 'tree', 'grass'],
      sky: ['sun', 'moon', 'star', 'cloud', 'storm', 'sky', 'wind', 'rain', 'lightning'],
      culture: ['clan', 'tribe', 'chief', 'warrior', 'elder', 'family', 'home', 'village'],
      qualities: ['strong', 'weak', 'fast', 'slow', 'sharp', 'bright', 'dark', 'hot', 'cold'],
      colors: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'brown'],
      actions: ['walk', 'run', 'fly', 'swim', 'hunt', 'gather', 'build', 'fight', 'speak'],
      body: ['head', 'eye', 'hand', 'arm', 'leg', 'wing', 'tail', 'claw'],
    };

    for (const category of categories) {
      const keywords = categoryKeywords[category] || [];
      if (keywords.includes(concept)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract alien words from LLM-generated text
   *
   * Parses text like "The xak (fire) burns" → extracts {xak: fire}
   *
   * @param text - LLM output with alien words
   * @returns Map of alien word → English translation
   */
  extractAlienWords(text: string): Map<string, string> {
    const pattern = /(\S+)\s*\(([^)]+)\)/g;
    const extracted = new Map<string, string>();

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const alienWord = match[1]!;
      const english = match[2]!;
      extracted.set(alienWord, english);
    }

    return extracted;
  }
}
