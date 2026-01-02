/**
 * ConversationQuality - Metrics for evaluating conversation quality
 *
 * Deep Conversation System - Phase 2
 *
 * This module provides:
 * - ConversationQuality interface for measuring conversation depth
 * - Analysis functions for extracting metrics from messages
 * - Topic detection from conversation content
 * - Quality calculation based on shared interests
 */

import type { ConversationMessage } from '../components/ConversationComponent.js';
import type { Interest, TopicId } from '../components/InterestsComponent.js';

/**
 * Metrics for evaluating conversation quality.
 * Calculated during and after conversations.
 */
export interface ConversationQuality {
  /**
   * Was this a meaningful exchange or just pleasantries?
   * 0.0 = pure small talk ("nice weather")
   * 1.0 = deep philosophical discussion
   */
  depth: number;

  /**
   * Did they discuss topics both agents care about?
   * Based on shared interests between participants.
   */
  topicResonance: number;

  /**
   * Was new information exchanged?
   * Facts, knowledge, memories shared.
   */
  informationExchange: number;

  /**
   * Emotional engagement in the conversation.
   * Based on sentiment patterns in messages.
   */
  emotionalConnection: number;

  /**
   * Length factor - longer conversations tend to be better.
   * Normalized to prevent gaming (diminishing returns).
   */
  durationFactor: number;

  /**
   * Topics that were discussed.
   */
  topicsDiscussed: TopicId[];

  /**
   * Overall quality score (weighted average).
   */
  overallQuality: number;
}

/**
 * Depth indicators in conversation messages.
 */
const DEPTH_INDICATORS = {
  shallow: [
    /^hello/i,
    /nice weather/i,
    /how are you/i,
    /^hi$/i,
    /good morning/i,
    /good day/i,
    /see you/i,
    /take care/i,
    /goodbye/i,
  ],
  medium: [
    /I think/i,
    /I feel/i,
    /have you noticed/i,
    /remember when/i,
    /I wonder/i,
    /in my experience/i,
    /I've been thinking/i,
    /what do you think/i,
  ],
  deep: [
    /meaning/i,
    /believe/i,
    /purpose/i,
    /death|die|dying/i,
    /soul/i,
    /god|gods|divine/i,
    /truth/i,
    /why do we/i,
    /what happens when/i,
    /afterlife/i,
    /destiny/i,
    /fate/i,
    /existence/i,
    /eternal/i,
    /philosophy/i,
  ],
};

/**
 * Topic keywords for detection in messages.
 */
const TOPIC_KEYWORDS: Partial<Record<TopicId, RegExp[]>> = {
  // Philosophy topics
  afterlife: [/afterlife/i, /after death/i, /heaven/i, /spirit world/i, /where.*go when.*die/i],
  mortality: [/death/i, /dying/i, /mortal/i, /life.*short/i, /old age/i],
  the_gods: [/god/i, /gods/i, /divine/i, /pray/i, /blessing/i, /sacred/i],
  meaning_of_life: [/meaning/i, /purpose/i, /why.*here/i, /what.*live for/i],
  fate_and_destiny: [/fate/i, /destiny/i, /meant to be/i, /fortune/i],
  dreams: [/dream/i, /dreamt/i, /nightmare/i, /vision/i],
  right_and_wrong: [/right.*wrong/i, /moral/i, /ethics/i, /should.*shouldn't/i],

  // Craft topics
  farming: [/farm/i, /crop/i, /harvest/i, /plant/i, /seed/i, /plow/i, /field/i],
  woodworking: [/wood/i, /tree/i, /carve/i, /lumber/i, /axe/i, /saw/i, /furniture/i],
  stonecraft: [/stone/i, /rock/i, /masonry/i, /chisel/i, /quarry/i],
  cooking: [/cook/i, /recipe/i, /bake/i, /stew/i, /soup/i, /meal/i],
  building: [/build/i, /construct/i, /house/i, /wall/i, /roof/i],
  foraging: [/forage/i, /gather/i, /berry/i, /mushroom/i, /herbs/i],
  hunting: [/hunt/i, /prey/i, /track/i, /trap/i, /bow/i, /arrow/i],
  craftsmanship: [/craft/i, /make/i, /create/i, /skill/i, /artisan/i],

  // Nature topics
  trees_and_forests: [/tree/i, /forest/i, /woods/i, /grove/i, /oak/i, /pine/i],
  weather: [/weather/i, /rain/i, /sun/i, /storm/i, /cloud/i, /wind/i, /snow/i],
  animals: [/animal/i, /creature/i, /beast/i, /bird/i, /fish/i, /wolf/i, /deer/i],
  plants: [/plant/i, /flower/i, /herb/i, /grass/i, /leaf/i, /root/i],
  seasons: [/season/i, /spring/i, /summer/i, /autumn/i, /fall/i, /winter/i],
  landscape: [/mountain/i, /river/i, /lake/i, /valley/i, /hill/i, /plain/i],

  // Social topics
  family: [/family/i, /mother/i, /father/i, /child/i, /parent/i, /sibling/i, /brother/i, /sister/i],
  friendship: [/friend/i, /companion/i, /together/i, /bond/i, /trust/i],
  village_gossip: [/gossip/i, /heard/i, /rumor/i, /they say/i, /did you know/i],
  romance: [/love/i, /heart/i, /marry/i, /wedding/i, /romantic/i],
  conflict: [/fight/i, /argue/i, /conflict/i, /dispute/i, /quarrel/i],

  // Practical topics
  food: [/food/i, /eat/i, /hungry/i, /meal/i, /bread/i, /meat/i],
  shelter: [/shelter/i, /home/i, /house/i, /sleep/i, /rest/i],
  work: [/work/i, /job/i, /task/i, /duty/i, /labor/i],
  health: [/health/i, /sick/i, /ill/i, /pain/i, /heal/i, /medicine/i],

  // Story topics
  myths_and_legends: [/legend/i, /myth/i, /ancient/i, /hero/i, /tale of/i],
  village_history: [/history/i, /long ago/i, /ancestors/i, /founders/i, /old days/i],
  personal_stories: [/story/i, /happened to me/i, /once I/i, /remember when I/i],
  adventures: [/adventure/i, /journey/i, /explore/i, /discover/i, /quest/i],
};

/**
 * Information exchange indicators.
 */
const INFORMATION_INDICATORS = [
  /did you know/i,
  /I learned/i,
  /I heard that/i,
  /they say/i,
  /apparently/i,
  /I discovered/i,
  /the truth is/i,
  /let me tell you/i,
  /secret/i,
  /I remember/i,
  /in my experience/i,
  /I found out/i,
];

/**
 * Emotional content indicators.
 */
const EMOTIONAL_INDICATORS = {
  positive: [
    /happy/i,
    /joy/i,
    /love/i,
    /wonderful/i,
    /beautiful/i,
    /grateful/i,
    /blessed/i,
    /excited/i,
    /hope/i,
    /proud/i,
  ],
  negative: [
    /sad/i,
    /grief/i,
    /pain/i,
    /fear/i,
    /worried/i,
    /anxious/i,
    /angry/i,
    /hate/i,
    /lonely/i,
    /lost/i,
  ],
  connected: [
    /understand/i,
    /same/i,
    /too/i,
    /me too/i,
    /I know/i,
    /feel that way/i,
    /agree/i,
    /exactly/i,
    /yes/i,
  ],
};

/**
 * Analyze depth of conversation from messages.
 */
export function analyzeDepth(messages: ConversationMessage[]): number {
  let score = 0.5; // Start neutral

  for (const msg of messages) {
    const text = msg.message;

    // Check for shallow indicators (decrease depth)
    for (const pattern of DEPTH_INDICATORS.shallow) {
      if (pattern.test(text)) score -= 0.05;
    }

    // Check for medium depth (slight increase)
    for (const pattern of DEPTH_INDICATORS.medium) {
      if (pattern.test(text)) score += 0.08;
    }

    // Check for deep indicators (significant increase)
    for (const pattern of DEPTH_INDICATORS.deep) {
      if (pattern.test(text)) score += 0.15;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Extract topics from conversation messages.
 */
export function extractTopicsFromMessages(messages: ConversationMessage[]): TopicId[] {
  const found = new Set<TopicId>();

  for (const msg of messages) {
    for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
      if (!patterns) continue;
      for (const pattern of patterns) {
        if (pattern.test(msg.message)) {
          found.add(topic as TopicId);
        }
      }
    }
  }

  return Array.from(found);
}

/**
 * Find shared interests between two agents.
 */
export function findSharedInterests(
  interests1: Interest[],
  interests2: Interest[]
): TopicId[] {
  const topics1 = new Set(interests1.map(i => i.topic));
  return interests2
    .filter(i => topics1.has(i.topic))
    .map(i => i.topic);
}

/**
 * Calculate topic overlap between shared interests and discussed topics.
 */
export function calculateTopicOverlap(
  sharedInterests: TopicId[],
  topicsDiscussed: TopicId[]
): number {
  if (sharedInterests.length === 0) {
    return 0;
  }

  const discussedSet = new Set(topicsDiscussed);
  const overlapping = sharedInterests.filter(t => discussedSet.has(t)).length;

  return overlapping / sharedInterests.length;
}

/**
 * Analyze information exchange in messages.
 */
export function analyzeInformationExchange(messages: ConversationMessage[]): number {
  let count = 0;

  for (const msg of messages) {
    for (const pattern of INFORMATION_INDICATORS) {
      if (pattern.test(msg.message)) {
        count++;
        break; // Only count once per message
      }
    }
  }

  // Normalize: 5+ information exchanges = 1.0
  return Math.min(1, count / 5);
}

/**
 * Analyze emotional content in messages.
 */
export function analyzeEmotionalContent(messages: ConversationMessage[]): number {
  let emotionalCount = 0;
  let connectionCount = 0;

  for (const msg of messages) {
    // Check for any emotional content
    const hasPositive = EMOTIONAL_INDICATORS.positive.some(p => p.test(msg.message));
    const hasNegative = EMOTIONAL_INDICATORS.negative.some(p => p.test(msg.message));
    const hasConnection = EMOTIONAL_INDICATORS.connected.some(p => p.test(msg.message));

    if (hasPositive || hasNegative) emotionalCount++;
    if (hasConnection) connectionCount++;
  }

  // Weight: emotions contribute 0.4, connections contribute 0.6
  const emotionScore = Math.min(1, emotionalCount / 4) * 0.4;
  const connectionScore = Math.min(1, connectionCount / 3) * 0.6;

  return emotionScore + connectionScore;
}

/**
 * Calculate conversation quality after it ends.
 */
export function calculateConversationQuality(
  messages: ConversationMessage[],
  participant1Interests: Interest[],
  participant2Interests: Interest[],
  _durationTicks: number
): ConversationQuality {
  // Handle empty conversations
  if (messages.length === 0) {
    return {
      depth: 0,
      topicResonance: 0,
      informationExchange: 0,
      emotionalConnection: 0,
      durationFactor: 0,
      topicsDiscussed: [],
      overallQuality: 0,
    };
  }

  // Analyze messages for depth indicators
  const depth = analyzeDepth(messages);

  // Find shared interests and check if they were discussed
  const sharedTopics = findSharedInterests(participant1Interests, participant2Interests);
  const topicsDiscussed = extractTopicsFromMessages(messages);
  const topicResonance = calculateTopicOverlap(sharedTopics, topicsDiscussed);

  // Check for information sharing patterns
  const informationExchange = analyzeInformationExchange(messages);

  // Sentiment analysis for emotional connection
  const emotionalConnection = analyzeEmotionalContent(messages);

  // Duration factor (diminishing returns after ~10 messages)
  const durationFactor = Math.min(1.0, messages.length / 10);

  // Weighted overall score
  const overallQuality =
    depth * 0.30 +
    topicResonance * 0.25 +
    informationExchange * 0.20 +
    emotionalConnection * 0.15 +
    durationFactor * 0.10;

  return {
    depth,
    topicResonance,
    informationExchange,
    emotionalConnection,
    durationFactor,
    topicsDiscussed,
    overallQuality,
  };
}

/**
 * Get a description of conversation quality for display.
 */
export function describeQuality(quality: ConversationQuality): string {
  if (quality.overallQuality < 0.2) {
    return 'superficial';
  } else if (quality.overallQuality < 0.4) {
    return 'casual';
  } else if (quality.overallQuality < 0.6) {
    return 'meaningful';
  } else if (quality.overallQuality < 0.8) {
    return 'deep';
  } else {
    return 'profound';
  }
}

/**
 * Describe the depth of a conversation.
 */
export function describeDepth(depth: number): string {
  if (depth < 0.3) {
    return 'small talk';
  } else if (depth < 0.5) {
    return 'light discussion';
  } else if (depth < 0.7) {
    return 'thoughtful exchange';
  } else {
    return 'philosophical discourse';
  }
}
