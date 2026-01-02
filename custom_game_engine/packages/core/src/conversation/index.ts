/**
 * Conversation module exports.
 *
 * Deep Conversation System - Phases 2, 3, & 4
 */

// Phase 2: Quality Metrics
export * from './ConversationQuality.js';
export {
  calculateConversationQuality,
  analyzeDepth,
  extractTopicsFromMessages,
  findSharedInterests,
  calculateTopicOverlap,
  analyzeInformationExchange,
  analyzeEmotionalContent,
  describeQuality,
  describeDepth,
} from './ConversationQuality.js';
export type { ConversationQuality } from './ConversationQuality.js';

// Phase 3: Partner Selection
export * from './PartnerSelector.js';
export {
  scorePartners,
  selectPartner,
  findBestPartnerInRange,
  calculateSharedInterestScore,
  calculateComplementaryScore,
  calculateAgeCompatibility,
  describePartnerSelection,
} from './PartnerSelector.js';
export type {
  PartnerScore,
  PartnerSelectionContext,
  PartnerScoringConfig,
} from './PartnerSelector.js';

// Phase 4: Age-Based Conversation Style
export * from './ConversationStyle.js';
export {
  getConversationStyle,
  getDepthCapacity,
  getTopicPreferences,
  getTopicWeight,
  generateConversationStarter,
  generateQuestionPattern,
  calculateStyleCompatibility,
  describeConversationStyle,
  describeConversationDynamic,
  calculateAgeCategory,
  calculateAgeCategoryFromTick,
} from './ConversationStyle.js';
export type {
  ConversationStyle,
  TopicPreference,
} from './ConversationStyle.js';
