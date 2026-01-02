/**
 * ConversationStyle - Age-based conversation patterns and preferences
 *
 * Deep Conversation System - Phase 4
 *
 * This module provides:
 * - Age-specific conversation styles (questioning, exploratory, sharing, reflective)
 * - Depth capacity limits by age category
 * - Topic preferences and avoidances by age
 * - Conversation starters appropriate to age and context
 */

import type { AgeCategory } from '../components/AgentComponent.js';
import type { TopicId, TopicCategory } from '../components/InterestsComponent.js';

/**
 * Conversation style characteristics for an age category.
 */
export interface ConversationStyle {
  /** The age category this style applies to */
  ageCategory: AgeCategory;
  /** Primary conversation mode */
  mode: 'questioning' | 'exploratory' | 'sharing' | 'reflective';
  /** Maximum conversation depth this age can typically achieve (0-1) */
  depthCapacity: number;
  /** How likely to initiate conversation (0-1) */
  initiationRate: number;
  /** Average preferred conversation length in exchanges */
  preferredLength: number;
  /** Emotional expressiveness (0-1) */
  emotionalExpression: number;
  /** Description of this style */
  description: string;
}

/**
 * Topic preference for an age category.
 */
export interface TopicPreference {
  /** Topic or category */
  topic: TopicId | TopicCategory;
  /** Whether this is a category or specific topic */
  isCategory: boolean;
  /** Preference weight (positive = interested, negative = avoids) */
  weight: number;
  /** Why this preference exists */
  reason: string;
}

/**
 * Default conversation styles by age category.
 */
const CONVERSATION_STYLES: Record<AgeCategory, ConversationStyle> = {
  child: {
    ageCategory: 'child',
    mode: 'questioning',
    depthCapacity: 0.4,
    initiationRate: 0.8,
    preferredLength: 4,
    emotionalExpression: 0.9,
    description: 'Curious and questioning, learns through asking why',
  },
  teen: {
    ageCategory: 'teen',
    mode: 'exploratory',
    depthCapacity: 0.6,
    initiationRate: 0.6,
    preferredLength: 6,
    emotionalExpression: 0.7,
    description: 'Exploring identity, challenges assumptions, seeks peer validation',
  },
  adult: {
    ageCategory: 'adult',
    mode: 'sharing',
    depthCapacity: 0.8,
    initiationRate: 0.5,
    preferredLength: 8,
    emotionalExpression: 0.5,
    description: 'Practical and focused, shares knowledge and experiences',
  },
  elder: {
    ageCategory: 'elder',
    mode: 'reflective',
    depthCapacity: 1.0,
    initiationRate: 0.7,
    preferredLength: 10,
    emotionalExpression: 0.6,
    description: 'Philosophical and reflective, draws on lifetime wisdom',
  },
};

/**
 * Topic preferences by age category.
 * Positive weight = interest, negative weight = avoidance.
 */
const TOPIC_PREFERENCES: Record<AgeCategory, TopicPreference[]> = {
  child: [
    { topic: 'story', isCategory: true, weight: 0.9, reason: 'loves stories and tales' },
    { topic: 'nature', isCategory: true, weight: 0.8, reason: 'curious about animals and plants' },
    { topic: 'the_gods', isCategory: false, weight: 0.7, reason: 'fascinated by divine mysteries' },
    { topic: 'practical', isCategory: true, weight: 0.3, reason: 'less interested in work topics' },
    { topic: 'mortality', isCategory: false, weight: -0.3, reason: 'uncomfortable with death' },
  ],
  teen: [
    { topic: 'social', isCategory: true, weight: 0.9, reason: 'focused on relationships and status' },
    { topic: 'friendship', isCategory: false, weight: 0.8, reason: 'exploring peer bonds' },
    { topic: 'romance', isCategory: false, weight: 0.7, reason: 'interested in relationships' },
    { topic: 'craft', isCategory: true, weight: 0.5, reason: 'developing skills' },
    { topic: 'philosophy', isCategory: true, weight: 0.4, reason: 'beginning to question deeper' },
  ],
  adult: [
    { topic: 'practical', isCategory: true, weight: 0.8, reason: 'focused on getting things done' },
    { topic: 'craft', isCategory: true, weight: 0.7, reason: 'pride in work and skills' },
    { topic: 'family', isCategory: false, weight: 0.7, reason: 'invested in family life' },
    { topic: 'social', isCategory: true, weight: 0.5, reason: 'maintains community ties' },
    { topic: 'philosophy', isCategory: true, weight: 0.4, reason: 'practical philosophy' },
  ],
  elder: [
    { topic: 'philosophy', isCategory: true, weight: 0.9, reason: 'contemplating lifes meaning' },
    { topic: 'mortality', isCategory: false, weight: 0.8, reason: 'at peace with death' },
    { topic: 'the_gods', isCategory: false, weight: 0.8, reason: 'spiritual reflection' },
    { topic: 'story', isCategory: true, weight: 0.7, reason: 'loves sharing old tales' },
    { topic: 'village_history', isCategory: false, weight: 0.7, reason: 'thinking about what remains' },
    { topic: 'nature', isCategory: true, weight: 0.6, reason: 'appreciates natural beauty' },
  ],
};

/**
 * Conversation starters by age category.
 * Grouped by topic category for contextual selection.
 */
const CONVERSATION_STARTERS: Record<AgeCategory, Record<string, string[]>> = {
  child: {
    general: [
      'Why do you think that is?',
      'Tell me a story!',
      'What does that do?',
      'Can you teach me?',
    ],
    nature: [
      'Look at that animal! What is it?',
      'Why do the leaves change color?',
      'Where do the birds go at night?',
    ],
    philosophy: [
      'Why are we here?',
      'What happens when we die?',
      'Why do grown-ups have to work?',
    ],
    story: [
      'Tell me about the old times!',
      'Do you know any scary stories?',
      'What was it like when you were little?',
    ],
  },
  teen: {
    general: [
      'Have you ever thought about...',
      'Dont you think its unfair that...',
      'Everyone says that, but...',
      'I dont understand why...',
    ],
    social: [
      'What do you really think of them?',
      'Do you trust the elders?',
      'Who decides these rules anyway?',
    ],
    philosophy: [
      'What if everything we believe is wrong?',
      'Do you think theres more to life than this?',
      'Why do we follow these traditions?',
    ],
    craft: [
      'I want to be the best at this.',
      'Show me the hard way, not the easy way.',
      'Theres got to be a better method.',
    ],
  },
  adult: {
    general: [
      'Heres what Ive learned...',
      'Let me share some advice.',
      'In my experience...',
      'The practical approach is...',
    ],
    practical: [
      'We need to organize this better.',
      'Hows the harvest looking?',
      'What resources do we need?',
    ],
    craft: [
      'Ive been perfecting this technique.',
      'The trick is in the details.',
      'You develop an instinct for it.',
    ],
    social: [
      'How is your family doing?',
      'We should work together on this.',
      'The community needs to consider...',
    ],
  },
  elder: {
    general: [
      'I remember when...',
      'In all my years, Ive learned...',
      'Let me tell you a truth...',
      'The ancestors taught us...',
    ],
    philosophy: [
      'What truly matters in the end?',
      'Weve always wondered about this...',
      'The meaning becomes clearer with time.',
      'There is wisdom in acceptance.',
    ],
    mortality: [
      'Death is not to be feared.',
      'We return to where we came from.',
      'What we leave behind matters most.',
    ],
    story: [
      'Gather round, children.',
      'Let me tell you of the old days.',
      'This story has been passed down...',
      'Before your parents were born...',
    ],
  },
};

/**
 * Question patterns by age category.
 * Used to generate age-appropriate questions.
 */
const QUESTION_PATTERNS: Record<AgeCategory, string[]> = {
  child: [
    'Why...?',
    'What is...?',
    'How does...?',
    'Can I...?',
    'Where does... come from?',
    'Who made...?',
  ],
  teen: [
    'But why should we...?',
    'What if... instead?',
    'Dont you think...?',
    'Is it really true that...?',
    'Who decided that...?',
  ],
  adult: [
    'Have you considered...?',
    'What would happen if...?',
    'How might we...?',
    'What has been your experience with...?',
  ],
  elder: [
    'What do you believe is the meaning of...?',
    'How has your understanding of... changed?',
    'What wisdom have you gained about...?',
    'When you look back, what do you think about...?',
  ],
};

/**
 * Get the conversation style for an age category.
 */
export function getConversationStyle(ageCategory: AgeCategory): ConversationStyle {
  return CONVERSATION_STYLES[ageCategory];
}

/**
 * Get the depth capacity for an age category.
 * Children have lower capacity, elders have highest.
 */
export function getDepthCapacity(ageCategory: AgeCategory): number {
  return CONVERSATION_STYLES[ageCategory].depthCapacity;
}

/**
 * Get topic preferences for an age category.
 */
export function getTopicPreferences(ageCategory: AgeCategory): TopicPreference[] {
  return TOPIC_PREFERENCES[ageCategory] ?? [];
}

/**
 * Check if a topic is preferred, avoided, or neutral for an age.
 * Returns weight: positive = preferred, negative = avoided, 0 = neutral.
 */
export function getTopicWeight(
  ageCategory: AgeCategory,
  topic: TopicId,
  category?: TopicCategory
): number {
  const prefs = TOPIC_PREFERENCES[ageCategory] ?? [];

  // Check specific topic first
  const topicPref = prefs.find(p => !p.isCategory && p.topic === topic);
  if (topicPref) return topicPref.weight;

  // Check category
  if (category) {
    const categoryPref = prefs.find(p => p.isCategory && p.topic === category);
    if (categoryPref) return categoryPref.weight;
  }

  return 0; // Neutral
}

/**
 * Generate a conversation starter appropriate for the age and context.
 */
export function generateConversationStarter(
  ageCategory: AgeCategory,
  topicCategory?: string
): string {
  const starters = CONVERSATION_STARTERS[ageCategory];
  const categoryStarters = topicCategory && starters[topicCategory]
    ? starters[topicCategory]
    : starters['general'];

  if (!categoryStarters || categoryStarters.length === 0) {
    return starters['general']?.[0] ?? 'Hello.';
  }

  const index = Math.floor(Math.random() * categoryStarters.length);
  return categoryStarters[index] ?? 'Hello.';
}

/**
 * Generate an age-appropriate question pattern.
 */
export function generateQuestionPattern(ageCategory: AgeCategory): string {
  const patterns = QUESTION_PATTERNS[ageCategory];
  if (!patterns || patterns.length === 0) {
    return 'What do you think about...?';
  }
  const index = Math.floor(Math.random() * patterns.length);
  return patterns[index] ?? 'What do you think about...?';
}

/**
 * Calculate conversation compatibility between two age categories.
 * Returns 0-1 score indicating how well they can converse.
 */
export function calculateStyleCompatibility(
  age1: AgeCategory,
  age2: AgeCategory
): number {
  const style1 = CONVERSATION_STYLES[age1];
  const style2 = CONVERSATION_STYLES[age2];

  // Complementary modes score well
  const modeCompatibility: Record<string, Record<string, number>> = {
    questioning: { sharing: 0.9, reflective: 0.85, exploratory: 0.6, questioning: 0.5 },
    exploratory: { sharing: 0.7, reflective: 0.6, exploratory: 0.8, questioning: 0.6 },
    sharing: { questioning: 0.9, reflective: 0.7, sharing: 0.75, exploratory: 0.7 },
    reflective: { questioning: 0.85, sharing: 0.7, exploratory: 0.6, reflective: 0.9 },
  };

  const modeScore = modeCompatibility[style1.mode]?.[style2.mode] ?? 0.5;

  // Similar emotional expression is good
  const emotionalDiff = Math.abs(style1.emotionalExpression - style2.emotionalExpression);
  const emotionalScore = 1 - emotionalDiff;

  // Average depth capacity determines potential depth
  const depthScore = (style1.depthCapacity + style2.depthCapacity) / 2;

  // Weight the factors
  return modeScore * 0.5 + emotionalScore * 0.2 + depthScore * 0.3;
}

/**
 * Get a human-readable description of the conversation style.
 */
export function describeConversationStyle(ageCategory: AgeCategory): string {
  const style = CONVERSATION_STYLES[ageCategory];
  return style.description;
}

/**
 * Describe the relationship dynamic between two age categories in conversation.
 */
export function describeConversationDynamic(
  age1: AgeCategory,
  age2: AgeCategory
): string {
  const dynamics: Record<string, Record<string, string>> = {
    child: {
      child: 'playful exchange',
      teen: 'younger sibling looking up',
      adult: 'learning from mentor',
      elder: 'wisdom from grandparent',
    },
    teen: {
      child: 'protective older sibling',
      teen: 'peer bonding',
      adult: 'challenging authority',
      elder: 'reluctant respect',
    },
    adult: {
      child: 'patient teaching',
      teen: 'guiding growth',
      adult: 'peer collaboration',
      elder: 'seeking wisdom',
    },
    elder: {
      child: 'delighted teaching',
      teen: 'patient understanding',
      adult: 'sharing experience',
      elder: 'philosophical peers',
    },
  };

  return dynamics[age1]?.[age2] ?? 'casual conversation';
}

/**
 * Calculate age category from age in years.
 */
export function calculateAgeCategory(ageYears: number): AgeCategory {
  if (ageYears >= 60) return 'elder';
  if (ageYears >= 20) return 'adult';
  if (ageYears >= 13) return 'teen';
  return 'child';
}

/**
 * Calculate age category from birth tick and current tick.
 * Assumes 20 ticks per second, ~180 days per year in game time.
 * Rough conversion: ~311,040,000 ticks per year (20 * 60 * 60 * 24 * 180)
 */
export function calculateAgeCategoryFromTick(
  birthTick: number,
  currentTick: number,
  ticksPerYear: number = 311040000
): AgeCategory {
  const ageTicks = currentTick - birthTick;
  const ageYears = ageTicks / ticksPerYear;
  return calculateAgeCategory(ageYears);
}
