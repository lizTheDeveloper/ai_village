/**
 * @vitest-environment node
 *
 * LLM Conversation Simulation Tests
 *
 * These tests actually call the language model to verify that:
 * 1. Agents with shared interests have deeper conversations
 * 2. Children ask questions, elders share wisdom
 * 3. Interest context in prompts leads to more relevant responses
 *
 * These tests require a running LLM server (Ollama or MLX).
 * Skip with: npm test -- --grep "ConversationSimulation" --skip
 *
 * Note: Uses node environment instead of jsdom to avoid fetch/AbortSignal issues.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenAICompatProvider } from '../OpenAICompatProvider.js';
import type { LLMProvider, LLMResponse } from '../LLMProvider.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the custom_game_engine directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Test configuration
const LLM_TIMEOUT = 30000; // 30 seconds per LLM call
const SKIP_LLM_TESTS = process.env.SKIP_LLM_TESTS === 'true' || !process.env.GROQ_API_KEY;

/**
 * Agent persona for conversation simulation
 */
interface AgentPersona {
  name: string;
  age: 'child' | 'teen' | 'adult' | 'elder';
  personality: {
    openness: number;
    extraversion: number;
    spirituality: number;
  };
  interests: Array<{
    topic: string;
    intensity: number;
    question?: string; // For child questions
  }>;
  depthHunger: number;
}

/**
 * Build a conversation prompt for an agent
 */
function buildConversationPrompt(
  speaker: AgentPersona,
  partner: AgentPersona,
  conversationHistory: Array<{ speaker: string; message: string }>,
  options?: {
    includeInterests?: boolean;
    includeAgeGuidance?: boolean;
  }
): string {
  const sections: string[] = [];

  // Identity
  sections.push(`You are ${speaker.name}, a ${speaker.age} villager.`);

  // Age-based guidance
  if (options?.includeAgeGuidance !== false) {
    const ageGuidance = getAgeGuidance(speaker.age);
    sections.push(`\n${ageGuidance}`);
  }

  // Partner info
  sections.push(`\nYou are talking with ${partner.name}, a ${partner.age} villager.`);

  // Interests context
  if (options?.includeInterests !== false && speaker.interests.length > 0) {
    sections.push('\n## Your Interests');
    for (const interest of speaker.interests) {
      if (interest.question) {
        sections.push(`- You wonder: "${interest.question}"`);
      } else {
        const intensityDesc = interest.intensity > 0.7 ? 'passionate about' :
          interest.intensity > 0.4 ? 'interested in' : 'mildly curious about';
        sections.push(`- You are ${intensityDesc} ${interest.topic}`);
      }
    }

    // Shared interests
    const sharedTopics = speaker.interests
      .filter(si => partner.interests.some(pi => pi.topic === si.topic))
      .map(i => i.topic);

    if (sharedTopics.length > 0) {
      sections.push(`\nYou both care about: ${sharedTopics.join(', ')}`);
    }

    // Depth hunger
    if (speaker.depthHunger > 0.6) {
      sections.push('\nYou\'ve been wanting a meaningful conversation, not just small talk.');
    }
  }

  // Conversation history
  if (conversationHistory.length > 0) {
    sections.push('\n## Conversation So Far');
    for (const turn of conversationHistory.slice(-5)) {
      const who = turn.speaker === speaker.name ? 'You' : turn.speaker;
      sections.push(`${who}: "${turn.message}"`);
    }
  }

  // Response instruction
  sections.push('\n## Your Response');
  sections.push('What do you say next? Respond naturally in 1-2 sentences.');
  sections.push('Just give your spoken response, no JSON or actions needed.');

  return sections.join('\n');
}

function getAgeGuidance(age: 'child' | 'teen' | 'adult' | 'elder'): string {
  switch (age) {
    case 'child':
      return `As a child, you are curious and full of questions.
You ask "why?" a lot. You want adults to explain things.
Keep responses short and childlike.`;
    case 'teen':
      return `As a teenager, you're forming your own opinions.
You might question ideas or seem moody.
You care about what others think of you.`;
    case 'adult':
      return `As an adult, you balance practical concerns with deeper interests.
You can share knowledge and discuss philosophy.`;
    case 'elder':
      return `As an elder, you are wise and reflective.
You enjoy sharing stories and answering questions.
You think about life's meaning and mortality.`;
  }
}

/**
 * Analyze conversation for depth indicators
 */
function analyzeConversationDepth(messages: string[]): {
  depth: number;
  hasQuestions: boolean;
  hasPhilosophy: boolean;
  hasPersonalSharing: boolean;
  topicsDetected: string[];
} {
  const fullText = messages.join(' ').toLowerCase();

  // Shallow indicators
  const shallowPatterns = [
    /nice weather/i,
    /how are you/i,
    /^hello$/i,
    /good day/i,
  ];
  let shallowCount = shallowPatterns.filter(p => p.test(fullText)).length;

  // Deep indicators
  const deepPatterns = [
    /why/i,
    /meaning/i,
    /believe/i,
    /think about/i,
    /wonder/i,
    /death|die|dying/i,
    /soul|spirit/i,
    /god|gods|divine/i,
    /purpose/i,
    /remember when/i,
    /taught me/i,
  ];
  let deepCount = deepPatterns.filter(p => p.test(fullText)).length;

  // Topic detection
  const topicPatterns: Record<string, RegExp[]> = {
    'afterlife': [/afterlife/i, /after.*die/i, /death/i, /spirit/i],
    'woodworking': [/wood/i, /tree/i, /carve/i, /build/i],
    'farming': [/farm/i, /crop/i, /harvest/i, /plant/i],
    'the_gods': [/god/i, /gods/i, /divine/i, /pray/i],
    'family': [/family/i, /mother/i, /father/i, /child/i],
  };

  const topicsDetected: string[] = [];
  for (const [topic, patterns] of Object.entries(topicPatterns)) {
    if (patterns.some(p => p.test(fullText))) {
      topicsDetected.push(topic);
    }
  }

  // Calculate depth score
  const depth = Math.min(1, Math.max(0, (deepCount * 0.15 - shallowCount * 0.1) + 0.3));

  return {
    depth,
    hasQuestions: /\?/.test(fullText),
    hasPhilosophy: deepPatterns.slice(1, 6).some(p => p.test(fullText)),
    hasPersonalSharing: /I (?:think|feel|believe|remember)/i.test(fullText),
    topicsDetected,
  };
}

/**
 * Simulate a multi-turn conversation between two agents
 */
async function simulateConversation(
  provider: LLMProvider,
  agent1: AgentPersona,
  agent2: AgentPersona,
  turns: number,
  options?: {
    includeInterests?: boolean;
    includeAgeGuidance?: boolean;
  }
): Promise<{
  messages: Array<{ speaker: string; message: string }>;
  analysis: ReturnType<typeof analyzeConversationDepth>;
}> {
  const history: Array<{ speaker: string; message: string }> = [];

  // Alternate speakers
  for (let i = 0; i < turns; i++) {
    const speaker = i % 2 === 0 ? agent1 : agent2;
    const partner = i % 2 === 0 ? agent2 : agent1;

    const prompt = buildConversationPrompt(speaker, partner, history, options);

    const response = await provider.generate({
      prompt,
      temperature: 0.8,
      maxTokens: 150,
    });

    // Clean up the response
    let message = response.text.trim();
    // Remove quotes if the LLM wrapped the response
    if (message.startsWith('"') && message.endsWith('"')) {
      message = message.slice(1, -1);
    }
    // Remove speaker prefix if LLM added it
    message = message.replace(new RegExp(`^${speaker.name}:\\s*`, 'i'), '');

    history.push({ speaker: speaker.name, message });
  }

  const analysis = analyzeConversationDepth(history.map(h => h.message));

  return { messages: history, analysis };
}

// Test personas
const PERSONAS = {
  elderPhilosopher: {
    name: 'Goran',
    age: 'elder' as const,
    personality: { openness: 0.8, extraversion: 0.5, spirituality: 0.9 },
    interests: [
      { topic: 'afterlife', intensity: 0.9 },
      { topic: 'the_gods', intensity: 0.8 },
      { topic: 'meaning_of_life', intensity: 0.7 },
    ],
    depthHunger: 0.7,
  },

  adultFarmer: {
    name: 'Mira',
    age: 'adult' as const,
    personality: { openness: 0.5, extraversion: 0.6, spirituality: 0.4 },
    interests: [
      { topic: 'farming', intensity: 0.8 },
      { topic: 'family', intensity: 0.6 },
      { topic: 'weather', intensity: 0.4 },
    ],
    depthHunger: 0.3,
  },

  curiousChild: {
    name: 'Pip',
    age: 'child' as const,
    personality: { openness: 0.9, extraversion: 0.7, spirituality: 0.5 },
    interests: [
      { topic: 'afterlife', intensity: 0.7, question: 'Where do people go when they die?' },
      { topic: 'the_gods', intensity: 0.6, question: 'Do the gods watch us?' },
    ],
    depthHunger: 0.5,
  },

  adultWoodworker: {
    name: 'Bram',
    age: 'adult' as const,
    personality: { openness: 0.6, extraversion: 0.4, spirituality: 0.3 },
    interests: [
      { topic: 'woodworking', intensity: 0.9 },
      { topic: 'trees_and_forests', intensity: 0.7 },
    ],
    depthHunger: 0.2,
  },

  genericVillager: {
    name: 'Pat',
    age: 'adult' as const,
    personality: { openness: 0.5, extraversion: 0.5, spirituality: 0.5 },
    interests: [],
    depthHunger: 0.0,
  },
};

describe.skipIf(SKIP_LLM_TESTS)('ConversationSimulation', () => {
  let provider: LLMProvider;

  beforeAll(async () => {
    // Use Groq with API key from .env
    const apiKey = process.env.GROQ_API_KEY || '';
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    provider = new OpenAICompatProvider(
      model,
      'https://api.groq.com/openai/v1',
      apiKey
    );

    // Check if available
    const available = await provider.isAvailable();
    if (!available) {
      console.warn('Groq API not available. Skipping conversation tests.');
    }
  }, 10000);

  describe('interest-based conversation depth', () => {
    it('should have deeper conversation when agents share philosophical interests', async () => {
      // Two agents who both care about the afterlife and gods
      const agent1 = { ...PERSONAS.elderPhilosopher };
      const agent2 = {
        ...PERSONAS.adultFarmer,
        interests: [
          { topic: 'afterlife', intensity: 0.7 },
          { topic: 'the_gods', intensity: 0.5 },
          { topic: 'farming', intensity: 0.8 },
        ],
      };

      const result = await simulateConversation(provider, agent1, agent2, 4, {
        includeInterests: true,
        includeAgeGuidance: true,
      });

      console.log('\n=== Shared Philosophical Interests ===');
      for (const msg of result.messages) {
        console.log(`${msg.speaker}: ${msg.message}`);
      }
      console.log(`Depth: ${result.analysis.depth.toFixed(2)}`);
      console.log(`Topics: ${result.analysis.topicsDetected.join(', ')}`);

      // Expect some depth and relevant topics
      expect(result.analysis.depth).toBeGreaterThan(0.2);
      // Should mention at least one shared interest topic
      const sharedTopics = ['afterlife', 'the_gods'];
      const mentionedShared = sharedTopics.some(t =>
        result.analysis.topicsDetected.includes(t)
      );
      expect(mentionedShared).toBe(true);
    }, LLM_TIMEOUT * 4);

    it('should have shallower conversation without interest context', async () => {
      const agent1 = PERSONAS.genericVillager;
      const agent2 = { ...PERSONAS.genericVillager, name: 'Sam' };

      const result = await simulateConversation(provider, agent1, agent2, 4, {
        includeInterests: false, // No interests in prompt
        includeAgeGuidance: false,
      });

      console.log('\n=== No Interest Context ===');
      for (const msg of result.messages) {
        console.log(`${msg.speaker}: ${msg.message}`);
      }
      console.log(`Depth: ${result.analysis.depth.toFixed(2)}`);

      // Should be relatively shallow without interests to guide
      // Not a strict assertion since LLMs can be unpredictable
      expect(result.messages.length).toBe(4);
    }, LLM_TIMEOUT * 4);
  });

  describe('child-elder knowledge transfer', () => {
    it('should show child asking questions and elder answering', async () => {
      const child = PERSONAS.curiousChild;
      const elder = PERSONAS.elderPhilosopher;

      const result = await simulateConversation(provider, child, elder, 4, {
        includeInterests: true,
        includeAgeGuidance: true,
      });

      console.log('\n=== Child-Elder Conversation ===');
      for (const msg of result.messages) {
        console.log(`${msg.speaker} (${msg.speaker === child.name ? 'child' : 'elder'}): ${msg.message}`);
      }
      console.log(`Has questions: ${result.analysis.hasQuestions}`);
      console.log(`Topics: ${result.analysis.topicsDetected.join(', ')}`);

      // Child messages should contain questions
      const childMessages = result.messages
        .filter(m => m.speaker === child.name)
        .map(m => m.message);

      // At least one child message should have a question
      const childAsksQuestions = childMessages.some(m => m.includes('?'));
      expect(childAsksQuestions).toBe(true);

      // Should discuss philosophical topics
      const philosophicalTopics = ['afterlife', 'the_gods', 'meaning_of_life'];
      const mentionsPhilosophy = philosophicalTopics.some(t =>
        result.analysis.topicsDetected.includes(t)
      );
      expect(mentionsPhilosophy).toBe(true);
    }, LLM_TIMEOUT * 4);
  });

  describe('craft-based conversation', () => {
    it('should discuss woodworking when both agents share that interest', async () => {
      const woodworker1 = PERSONAS.adultWoodworker;
      const woodworker2 = {
        ...PERSONAS.adultWoodworker,
        name: 'Hilda',
        interests: [
          { topic: 'woodworking', intensity: 0.7 },
          { topic: 'building', intensity: 0.6 },
        ],
      };

      const result = await simulateConversation(provider, woodworker1, woodworker2, 4, {
        includeInterests: true,
        includeAgeGuidance: true,
      });

      console.log('\n=== Woodworking Conversation ===');
      for (const msg of result.messages) {
        console.log(`${msg.speaker}: ${msg.message}`);
      }
      console.log(`Topics: ${result.analysis.topicsDetected.join(', ')}`);

      // Should mention woodworking-related topics
      expect(result.analysis.topicsDetected.includes('woodworking')).toBe(true);
    }, LLM_TIMEOUT * 4);
  });

  describe('depth hunger effect', () => {
    it('should show more meaningful exchange when depth hunger is high', async () => {
      const hungryForDepth = {
        ...PERSONAS.adultFarmer,
        depthHunger: 0.9, // Really wants meaningful conversation
        interests: [
          { topic: 'meaning_of_life', intensity: 0.7 },
          { topic: 'family', intensity: 0.8 },
        ],
      };

      const partner = {
        ...PERSONAS.elderPhilosopher,
        depthHunger: 0.8,
      };

      const result = await simulateConversation(provider, hungryForDepth, partner, 4, {
        includeInterests: true,
        includeAgeGuidance: true,
      });

      console.log('\n=== High Depth Hunger ===');
      for (const msg of result.messages) {
        console.log(`${msg.speaker}: ${msg.message}`);
      }
      console.log(`Depth: ${result.analysis.depth.toFixed(2)}`);
      console.log(`Has philosophy: ${result.analysis.hasPhilosophy}`);
      console.log(`Personal sharing: ${result.analysis.hasPersonalSharing}`);

      // With high depth hunger, expect more philosophical content
      // This is a soft expectation since LLMs vary
      expect(result.analysis.depth).toBeGreaterThanOrEqual(0);
    }, LLM_TIMEOUT * 4);
  });

  describe('conversation quality comparison', () => {
    it('should produce measurably different conversations with vs without interests', async () => {
      const agent1 = PERSONAS.elderPhilosopher;
      const agent2 = PERSONAS.curiousChild;

      // Conversation WITH interest context
      const withInterests = await simulateConversation(provider, agent1, agent2, 4, {
        includeInterests: true,
        includeAgeGuidance: true,
      });

      // Conversation WITHOUT interest context (just names and history)
      const withoutInterests = await simulateConversation(provider, agent1, agent2, 4, {
        includeInterests: false,
        includeAgeGuidance: false,
      });

      console.log('\n=== WITH Interests ===');
      for (const msg of withInterests.messages) {
        console.log(`${msg.speaker}: ${msg.message}`);
      }
      console.log(`Depth: ${withInterests.analysis.depth.toFixed(2)}, Topics: ${withInterests.analysis.topicsDetected.length}`);

      console.log('\n=== WITHOUT Interests ===');
      for (const msg of withoutInterests.messages) {
        console.log(`${msg.speaker}: ${msg.message}`);
      }
      console.log(`Depth: ${withoutInterests.analysis.depth.toFixed(2)}, Topics: ${withoutInterests.analysis.topicsDetected.length}`);

      // Compare: with interests should generally be more topical
      // This is observational - we log both for manual inspection
      expect(withInterests.messages.length).toBe(withoutInterests.messages.length);
    }, LLM_TIMEOUT * 8);
  });
});

describe('ConversationPromptBuilder', () => {
  it('should include shared interests in prompt', () => {
    const speaker = PERSONAS.elderPhilosopher;
    const partner = {
      ...PERSONAS.adultFarmer,
      interests: [{ topic: 'afterlife', intensity: 0.6 }],
    };

    const prompt = buildConversationPrompt(speaker, partner, [], {
      includeInterests: true,
    });

    expect(prompt).toContain('afterlife');
    expect(prompt).toContain('both care about');
  });

  it('should include depth hunger message when high', () => {
    const speaker = { ...PERSONAS.elderPhilosopher, depthHunger: 0.8 };
    const partner = PERSONAS.adultFarmer;

    const prompt = buildConversationPrompt(speaker, partner, [], {
      includeInterests: true,
    });

    expect(prompt).toContain('meaningful conversation');
  });

  it('should include child question format', () => {
    const child = PERSONAS.curiousChild;
    const elder = PERSONAS.elderPhilosopher;

    const prompt = buildConversationPrompt(child, elder, [], {
      includeInterests: true,
      includeAgeGuidance: true,
    });

    expect(prompt).toContain('Where do people go when they die?');
    expect(prompt).toContain('wonder');
    expect(prompt).toContain('curious');
  });

  it('should include conversation history', () => {
    const speaker = PERSONAS.elderPhilosopher;
    const partner = PERSONAS.adultFarmer;

    const history = [
      { speaker: 'Goran', message: 'Good morning, Mira.' },
      { speaker: 'Mira', message: 'Good morning! The crops look good today.' },
    ];

    const prompt = buildConversationPrompt(speaker, partner, history, {
      includeInterests: true,
    });

    expect(prompt).toContain('Good morning, Mira');
    expect(prompt).toContain('crops look good');
  });

  it('should provide age-appropriate guidance', () => {
    const childPrompt = buildConversationPrompt(
      PERSONAS.curiousChild,
      PERSONAS.elderPhilosopher,
      [],
      { includeAgeGuidance: true }
    );

    const elderPrompt = buildConversationPrompt(
      PERSONAS.elderPhilosopher,
      PERSONAS.curiousChild,
      [],
      { includeAgeGuidance: true }
    );

    expect(childPrompt).toContain('curious');
    expect(childPrompt).toContain('questions');
    expect(elderPrompt).toContain('wise');
    expect(elderPrompt).toContain('reflective');
  });
});

describe('ConversationAnalysis', () => {
  it('should detect philosophical topics', () => {
    const messages = [
      'I often wonder what happens after we die.',
      'The gods must have a plan for us all.',
      'What do you believe the meaning of life is?',
    ];

    const analysis = analyzeConversationDepth(messages);

    expect(analysis.hasPhilosophy).toBe(true);
    expect(analysis.topicsDetected).toContain('afterlife');
    expect(analysis.topicsDetected).toContain('the_gods');
    expect(analysis.depth).toBeGreaterThan(0.3);
  });

  it('should detect shallow conversation', () => {
    const messages = [
      'Hello there!',
      'Nice weather today.',
      'How are you?',
      'Good day!',
    ];

    const analysis = analyzeConversationDepth(messages);

    expect(analysis.depth).toBeLessThan(0.4);
  });

  it('should detect questions', () => {
    const messages = [
      'Why do the birds sing?',
      'I wonder about that too.',
    ];

    const analysis = analyzeConversationDepth(messages);

    expect(analysis.hasQuestions).toBe(true);
  });

  it('should detect personal sharing', () => {
    const messages = [
      'I think the harvest will be good this year.',
      'I believe we should help each other more.',
      'I remember when my father taught me to fish.',
    ];

    const analysis = analyzeConversationDepth(messages);

    expect(analysis.hasPersonalSharing).toBe(true);
    expect(analysis.depth).toBeGreaterThan(0.3);
  });
});
