/**
 * PartnerSelector - Intelligent conversation partner selection
 *
 * Deep Conversation System - Phase 3
 *
 * This module provides:
 * - Partner scoring based on interests, relationships, and needs
 * - Shared interest and complementary knowledge calculation
 * - Age-based compatibility scoring
 * - Weighted random selection from top candidates
 */

import type { Entity } from '../ecs/Entity.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { EntityId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { InterestsComponent } from '../components/InterestsComponent.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import type { ConversationComponent } from '../components/ConversationComponent.js';
import type { AgentComponent, AgeCategory } from '../components/AgentComponent.js';

/**
 * Score for a potential conversation partner.
 */
export interface PartnerScore {
  /** Entity ID of the candidate */
  entityId: EntityId;
  /** The candidate entity */
  entity: Entity;
  /** Calculated score (higher is better) */
  score: number;
  /** Human-readable reasons why this partner scored highly */
  reasons: string[];
}

/**
 * Context for partner selection.
 */
export interface PartnerSelectionContext {
  /** The agent seeking a conversation partner */
  seeker: Entity;
  /** List of potential partners to consider */
  candidates: Entity[];
  /** The game world */
  world: World;
}

/**
 * Configuration for partner scoring weights.
 */
export interface PartnerScoringConfig {
  /** Weight for proximity score (default: 15) */
  proximityWeight: number;
  /** Weight for shared interests (default: 25) */
  sharedInterestsWeight: number;
  /** Weight for complementary knowledge (default: 20) */
  complementaryWeight: number;
  /** Weight for relationship quality (default: 20) */
  relationshipWeight: number;
  /** Weight for familiarity (default: 10) */
  familiarityWeight: number;
  /** Weight for age compatibility (default: 15) */
  ageWeight: number;
  /** Bonus for known enthusiasts (default: 15) */
  enthusiastBonus: number;
  /** Maximum conversation range in tiles (default: 20) */
  maxRange: number;
}

const DEFAULT_CONFIG: PartnerScoringConfig = {
  proximityWeight: 15,
  sharedInterestsWeight: 25,
  complementaryWeight: 20,
  relationshipWeight: 20,
  familiarityWeight: 10,
  ageWeight: 15,
  enthusiastBonus: 15,
  maxRange: 20,
};

/**
 * Score potential conversation partners for an agent.
 */
export function scorePartners(
  context: PartnerSelectionContext,
  config: Partial<PartnerScoringConfig> = {}
): PartnerScore[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { seeker, candidates } = context;

  const seekerImpl = seeker as EntityImpl;
  const seekerInterests = seekerImpl.getComponent<InterestsComponent>(CT.Interests);
  const seekerRelationships = seekerImpl.getComponent<RelationshipComponent>(CT.Relationship);
  const seekerAgent = seekerImpl.getComponent<AgentComponent>(CT.Agent);
  const seekerPos = seekerImpl.getComponent(CT.Position) as unknown as { x: number; y: number } | undefined;

  const scores: PartnerScore[] = [];

  for (const candidate of candidates) {
    // Skip self
    if (candidate.id === seeker.id) continue;

    const candidateImpl = candidate as EntityImpl;

    // Skip if already in conversation
    const candidateConv = candidateImpl.getComponent<ConversationComponent>(CT.Conversation);
    if (candidateConv?.isActive) continue;

    let score = 0;
    const reasons: string[] = [];

    const candidatePos = candidateImpl.getComponent(CT.Position) as unknown as { x: number; y: number } | undefined;
    const candidateInterests = candidateImpl.getComponent<InterestsComponent>(CT.Interests);
    const candidateAgent = candidateImpl.getComponent<AgentComponent>(CT.Agent);

    // 1. Proximity (still matters, but less dominant)
    if (seekerPos && candidatePos) {
      const dx = seekerPos.x - candidatePos.x;
      const dy = seekerPos.y - candidatePos.y;
      const distanceSquared = dx * dx + dy * dy;
      // PERFORMANCE: Use squared distance for proximity calculation to avoid sqrt
      const maxRangeSquared = cfg.maxRange * cfg.maxRange;
      const proximityScore = Math.max(0, 1 - Math.sqrt(distanceSquared) / cfg.maxRange);
      score += proximityScore * cfg.proximityWeight;
      // PERFORMANCE: Use squared distance comparison for nearby check
      if (distanceSquared < (cfg.maxRange * 0.2) * (cfg.maxRange * 0.2)) reasons.push('nearby');
    }

    // 2. Shared interests
    if (seekerInterests && candidateInterests) {
      const sharedScore = calculateSharedInterestScore(
        seekerInterests,
        candidateInterests
      );
      score += sharedScore * cfg.sharedInterestsWeight;
      if (sharedScore > 0.5) reasons.push('shared interests');
    }

    // 3. Complementary knowledge (they know things I want to know)
    if (seekerInterests && candidateInterests) {
      const complementaryScore = calculateComplementaryScore(
        seekerInterests,
        candidateInterests
      );
      score += complementaryScore * cfg.complementaryWeight;
      if (complementaryScore > 0.5) reasons.push('can teach me');
    }

    // 4. Relationship quality
    if (seekerRelationships) {
      const relationship = seekerRelationships.relationships.get(candidate.id);
      if (relationship) {
        // Normalize affinity from -100..100 to 0..1
        const affinityScore = (relationship.affinity + 100) / 200;
        score += affinityScore * cfg.relationshipWeight;
        if (affinityScore > 0.7) reasons.push('friend');

        // Familiarity bonus - prefer people we know
        const familiarityScore = relationship.familiarity / 100;
        score += familiarityScore * cfg.familiarityWeight;
        if (familiarityScore > 0.6) reasons.push('familiar');
      }
    }

    // 5. Age-based preferences
    if (seekerAgent?.ageCategory && candidateAgent?.ageCategory) {
      const ageScore = calculateAgeCompatibility(
        seekerAgent.ageCategory,
        candidateAgent.ageCategory,
        seekerInterests ?? undefined
      );
      score += ageScore * cfg.ageWeight;
      if (ageScore > 0.7) reasons.push('good age match');
    }

    // 6. Known enthusiast bonus (we've had good conversations before)
    if (seekerInterests) {
      const isEnthusiast = seekerInterests.interests.some(i =>
        i.knownEnthusiasts.includes(candidate.id)
      );
      if (isEnthusiast) {
        score += cfg.enthusiastBonus;
        reasons.push('known good conversationalist');
      }
    }

    scores.push({
      entityId: candidate.id,
      entity: candidate,
      score,
      reasons,
    });
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Calculate how well two agents' interests overlap.
 * Returns 0-1 score based on shared topics weighted by intensity.
 */
export function calculateSharedInterestScore(
  interests1: InterestsComponent,
  interests2: InterestsComponent
): number {
  let sharedScore = 0;
  let possibleScore = 0;

  for (const interest1 of interests1.interests) {
    possibleScore += interest1.intensity;

    const match = interests2.interests.find(i2 =>
      i2.topic === interest1.topic
    );

    if (match) {
      // Both care about this topic - average their intensities
      sharedScore += (interest1.intensity + match.intensity) / 2;
    }
  }

  return possibleScore > 0 ? sharedScore / possibleScore : 0;
}

/**
 * Calculate if partner knows things seeker wants to learn.
 * Looks for seeker's questions or high-hunger interests that
 * partner has high-intensity knowledge about.
 */
export function calculateComplementaryScore(
  seekerInterests: InterestsComponent,
  partnerInterests: InterestsComponent
): number {
  let score = 0;

  // Find seeker's questions or high-hunger interests
  const seekerWants = seekerInterests.interests.filter(i =>
    i.source === 'question' || i.discussionHunger > 0.6
  );

  for (const want of seekerWants) {
    // Does partner have knowledge about this? (high intensity = knowledge)
    const partnerKnows = partnerInterests.interests.find(i =>
      i.topic === want.topic && i.intensity > 0.6
    );

    if (partnerKnows) {
      score += want.discussionHunger * partnerKnows.intensity;
    }
  }

  return Math.min(1, score);
}

/**
 * Calculate age compatibility for conversation.
 * Different age groups have different conversational preferences.
 */
export function calculateAgeCompatibility(
  seekerAge: AgeCategory,
  partnerAge: AgeCategory,
  seekerInterests?: InterestsComponent
): number {
  // Children with questions prefer adults/elders who can answer them
  if (seekerAge === 'child') {
    const hasQuestions = seekerInterests?.interests.some(i =>
      i.source === 'question'
    );

    if (hasQuestions && (partnerAge === 'adult' || partnerAge === 'elder')) {
      return 0.9; // Children seek wisdom from adults
    }

    // Children also like talking to other children
    if (partnerAge === 'child') {
      return 0.7;
    }
  }

  // Teens prefer other teens or questioning adults
  if (seekerAge === 'teen') {
    if (partnerAge === 'teen') {
      return 0.85; // Peer conversation
    }
    if (partnerAge === 'adult') {
      return 0.6; // Can be mentored
    }
  }

  // Adults prefer other adults for peer conversation
  if (seekerAge === 'adult') {
    if (partnerAge === 'adult') {
      return 0.8; // Peer equals
    }
    if (partnerAge === 'elder') {
      return 0.7; // Can learn wisdom
    }
    if (partnerAge === 'child' || partnerAge === 'teen') {
      return 0.5; // Mentoring opportunity
    }
  }

  // Elders like sharing with anyone who'll listen
  if (seekerAge === 'elder') {
    // Elders are generally happy to talk to anyone
    if (partnerAge === 'child') {
      return 0.8; // Love teaching children
    }
    if (partnerAge === 'elder') {
      return 0.85; // Philosophical peer discussion
    }
    return 0.7; // Generally willing
  }

  // Default moderate compatibility
  return 0.5;
}

/**
 * Select best conversation partner with some randomness.
 * Returns null if no suitable partner found.
 *
 * @param context The selection context
 * @param randomFactor How much randomness to add (0-1, default 0.2)
 */
export function selectPartner(
  context: PartnerSelectionContext,
  randomFactor: number = 0.2
): Entity | null {
  const scores = scorePartners(context);

  if (scores.length === 0) return null;

  // Add randomness to prevent always picking the same partner
  for (const partnerScore of scores) {
    partnerScore.score += (Math.random() - 0.5) * randomFactor * Math.max(1, partnerScore.score);
  }

  // Re-sort after randomization
  scores.sort((a, b) => b.score - a.score);

  // Pick from top 3 with weighted random selection
  const topN = scores.slice(0, 3);
  const totalScore = topN.reduce((sum, s) => sum + Math.max(0, s.score), 0);

  if (totalScore <= 0) return topN[0]?.entity ?? null;

  let random = Math.random() * totalScore;
  for (const candidate of topN) {
    random -= Math.max(0, candidate.score);
    if (random <= 0) return candidate.entity;
  }

  return topN[0]?.entity ?? null;
}

/**
 * Find the best partner within a specific range.
 * Convenience wrapper that filters candidates by distance first.
 */
export function findBestPartnerInRange(
  seeker: Entity,
  world: World,
  range: number
): Entity | null {
  const seekerImpl = seeker as EntityImpl;
  const seekerPos = seekerImpl.getComponent(CT.Position) as unknown as { x: number; y: number } | undefined;

  if (!seekerPos) return null;

  // Query all agents with conversation capability
  const allAgents = world.query()
    .with(CT.Conversation)
    .with(CT.Position)
    .with(CT.Agent)
    .executeEntities();

  // Filter to those within range
  const candidates = allAgents.filter(other => {
    if (other.id === seeker.id) return false;

    const otherImpl = other as EntityImpl;
    const otherPos = otherImpl.getComponent(CT.Position) as unknown as { x: number; y: number } | undefined;
    if (!otherPos) return false;

    const dx = seekerPos.x - otherPos.x;
    const dy = seekerPos.y - otherPos.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= range * range;
  });

  return selectPartner({ seeker, candidates, world });
}

/**
 * Get a human-readable summary of why a partner was selected.
 */
export function describePartnerSelection(score: PartnerScore): string {
  if (score.reasons.length === 0) {
    return 'available for conversation';
  }
  return score.reasons.join(', ');
}
