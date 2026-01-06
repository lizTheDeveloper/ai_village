/**
 * Courtship Compatibility Calculations
 *
 * Functions to calculate compatibility between two agents for courtship purposes.
 */

import type { Entity } from '@ai-village/core';
import { EntityImpl } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { SexualityComponent } from '../SexualityComponent';
import type { RelationshipComponent } from '@ai-village/core';
import type { PersonalityComponent } from '@ai-village/core';
import type { StrategicPriorities } from '@ai-village/core';

// ============================================================================
// Sexual Compatibility
// ============================================================================

export function calculateSexualCompatibility(agent1: Entity, agent2: Entity): number {
  const sex1 = (agent1 as EntityImpl).getComponent<SexualityComponent>('sexuality');
  const sex2 = (agent2 as EntityImpl).getComponent<SexualityComponent>('sexuality');

  if (!sex1 || !sex2) {
    throw new Error('Both agents must have SexualityComponent for compatibility calculation');
  }

  // Check if both are attracted to each other
  const agent1ToAgent2 = checkAttractionToTarget(sex1, agent2);
  const agent2ToAgent1 = checkAttractionToTarget(sex2, agent1);

  // Both must be attracted for compatibility
  if (!agent1ToAgent2 || !agent2ToAgent1) {
    return 0;
  }

  // Check relationship style compatibility
  const styleCompatibility = checkRelationshipStyleCompatibility(sex1, sex2);

  // Check if attraction conditions are met for both
  const conditions1Met = checkAttractionConditionsMet(sex1, agent1, agent2);
  const conditions2Met = checkAttractionConditionsMet(sex2, agent2, agent1);

  if (!conditions1Met || !conditions2Met) {
    return 0.3; // Potential but not active
  }

  return styleCompatibility;
}

function checkAttractionToTarget(_sexuality: SexualityComponent, _target: Entity): boolean {
  // For now, simplified check - assume attraction is possible
  // In full implementation, would check:
  // - Gender/sex compatibility with sexual_target/gender_target
  // - Morph compatibility
  // - Species-specific attraction rules
  return true;
}

function checkRelationshipStyleCompatibility(
  sex1: SexualityComponent,
  sex2: SexualityComponent
): number {
  const style1 = sex1.relationshipStyle;
  const style2 = sex2.relationshipStyle;

  // Simplified compatibility scoring
  if (style1 === style2) {
    return 1.0; // Same style = perfect match
  }

  // Monogamous + Polyamorous = challenging
  if (
    (style1 === 'monogamous' && style2 === 'polyamorous') ||
    (style1 === 'polyamorous' && style2 === 'monogamous')
  ) {
    return 0.4;
  }

  // Aromantic with romantic = incompatible
  if (style1 === 'aromantic' || style2 === 'aromantic') {
    return 0.2;
  }

  // Default: reasonably compatible
  return 0.7;
}

function checkAttractionConditionsMet(
  sexuality: SexualityComponent,
  _agent: Entity,
  _target: Entity
): boolean {
  // Check attraction conditions
  const condition = sexuality.attractionCondition;

  if (condition.type === 'never') {
    return false;
  }

  if (condition.type === 'always') {
    return true;
  }

  // For other conditions (familiar, emotional_bond, etc.)
  // Would check RelationshipComponent and other factors
  // Simplified for now: assume conditions are met
  return true;
}

// ============================================================================
// Personality Mesh
// ============================================================================

export function calculatePersonalityMesh(agent1: Entity, agent2: Entity): number {
  const personality1 = (agent1 as EntityImpl).getComponent<PersonalityComponent>('personality');
  const personality2 = (agent2 as EntityImpl).getComponent<PersonalityComponent>('personality');

  if (!personality1 || !personality2) {
    return 0.5; // Neutral when no personality data
  }

  // Calculate continuous factor scores (no hard thresholds)

  // 1. Extraversion complementarity - gaussian peak at moderate difference
  // Sweet spot at diff ~0.5, falls off at extremes
  const extraversionDiff = Math.abs(personality1.extraversion - personality2.extraversion);
  const extraversionScore = Math.exp(-Math.pow((extraversionDiff - 0.5) / 0.25, 2));

  // 2. Agreeableness - higher average is better
  const agreeablenessAvg = (personality1.agreeableness + personality2.agreeableness) / 2;
  const agreeablenessScore = agreeablenessAvg;

  // 3. Neuroticism conflict - penalty when both high
  const neuroticismPenalty = personality1.neuroticism * personality2.neuroticism;

  // 4. Creativity similarity - closer is better
  const creativityDiff = Math.abs(personality1.creativity - personality2.creativity);
  const creativityScore = 1 - creativityDiff;

  // 5. Spirituality similarity - closer is better
  const spiritualityDiff = Math.abs(personality1.spirituality - personality2.spirituality);
  const spiritualityScore = 1 - spiritualityDiff;

  // Weighted combination (centered around 0)
  const weightedSum =
    (extraversionScore - 0.5) * 1.2 +      // Complementarity bonus/penalty
    (agreeablenessScore - 0.5) * 1.5 +     // Agreeableness bonus/penalty
    (neuroticismPenalty - 0.5) * -1.2 +    // Neuroticism penalty (inverted)
    (creativityScore - 0.5) * 0.8 +        // Creativity similarity
    (spiritualityScore - 0.5) * 0.8;       // Spirituality similarity

  // Sigmoid to map to [0, 1] with smooth curve and diminishing returns
  // sigmoid(x) = 1 / (1 + e^(-k*x))
  // k=2 gives a moderate slope
  const sigmoid = 1 / (1 + Math.exp(-2 * weightedSum));

  return sigmoid;
}

// ============================================================================
// Shared Interests
// ============================================================================

export function calculateSharedInterests(agent1: Entity, agent2: Entity): number {
  const agent1Component = (agent1 as EntityImpl).getComponent('agent') as any;
  const agent2Component = (agent2 as EntityImpl).getComponent('agent') as any;

  if (!agent1Component?.priorities || !agent2Component?.priorities) {
    return 0.5; // Neutral when no priority data
  }

  const priorities1 = agent1Component.priorities;
  const priorities2 = agent2Component.priorities;

  let sharedCount = 0;
  const priorityKeys: Array<keyof StrategicPriorities> = [
    'gathering',
    'building',
    'farming',
    'social',
    'exploration',
    'magic',
  ];

  for (const key of priorityKeys) {
    const val1 = priorities1[key] || 0;
    const val2 = priorities2[key] || 0;

    // Both highly prioritize this activity
    if (val1 > 0.6 && val2 > 0.6) {
      sharedCount += 1;
    }
  }

  return sharedCount / priorityKeys.length;
}

// ============================================================================
// Relationship Strength
// ============================================================================

export function calculateRelationshipStrength(agent1: Entity, agent2: Entity): number {
  const relationship1 = (agent1 as EntityImpl).getComponent<RelationshipComponent>('relationship');

  if (!relationship1) {
    return 0;
  }

  const rel = relationship1.relationships.get(agent2.id);
  if (!rel) {
    return 0;
  }

  // Combine familiarity, affinity, trust
  const familiarityScore = rel.familiarity / 100;
  const affinityScore = Math.max(0, (rel.affinity + 100) / 200); // -100 to 100 -> 0 to 1
  const trustScore = rel.trust / 100;

  // Weight affinity highest
  return familiarityScore * 0.2 + affinityScore * 0.6 + trustScore * 0.2;
}

// ============================================================================
// Overall Compatibility
// ============================================================================

export function calculateCompatibility(agent1: Entity, agent2: Entity, _world: World): number {
  let score = 0;

  // 1. Sexual compatibility (30% weight)
  const sexualityScore = calculateSexualCompatibility(agent1, agent2);
  score += sexualityScore * 0.3;

  // If not sexually compatible, return 0
  if (sexualityScore === 0) {
    return 0;
  }

  // 2. Personality compatibility (25% weight)
  const personalityScore = calculatePersonalityMesh(agent1, agent2);
  score += personalityScore * 0.25;

  // 3. Mutual interests (20% weight)
  const interestsScore = calculateSharedInterests(agent1, agent2);
  score += interestsScore * 0.2;

  // 4. Existing relationship (15% weight)
  const relationshipScore = calculateRelationshipStrength(agent1, agent2);
  score += relationshipScore * 0.15;

  // 5. Social factors (10% weight)
  const socialScore = 0.5; // Placeholder - could include community approval, family, etc.
  score += socialScore * 0.1;

  // Normalize (max possible is 0.3 + 0.25 + 0.2 + 0.15 + 0.1 = 1.0)
  return Math.max(0, Math.min(1, score));
}

// ============================================================================
// Conception Probability
// ============================================================================

export function calculateConceptionProbability(_agent1: Entity, _agent2: Entity): number {
  let baseProbability = 0.3; // 30% base chance

  // Health factors (placeholder - health tracked in BodyComponent or NeedsComponent)
  const healthModifier = 1.0; // Perfect health assumption for now

  // Fertility by age (simplified - would be species-specific in full implementation)
  const fertilityModifier1 = 1.0; // Placeholder
  const fertilityModifier2 = 1.0; // Placeholder

  // Bond strength
  const bondStrength = calculateBondStrength(_agent1, _agent2);

  // Magical/mystical factors (placeholder)
  const magicModifier = 1.0;

  const finalProbability =
    baseProbability *
    fertilityModifier1 *
    fertilityModifier2 *
    healthModifier *
    (0.8 + bondStrength * 0.4) * // 0.8-1.2 multiplier
    magicModifier;

  return Math.max(0, Math.min(1, finalProbability));
}

export function calculateBondStrength(agent1: Entity, agent2: Entity): number {
  const relationshipScore = calculateRelationshipStrength(agent1, agent2);

  // Bond strength is based on relationship
  // Will increase over time with successful matings
  return relationshipScore;
}

export function attemptConception(agent1: Entity, agent2: Entity, world: World): { pregnantAgentId: string; otherParentId: string } | null {
  // Determine who can become pregnant
  const canAgent1BePregnant = canBecomePregnant(agent1);
  const canAgent2BePregnant = canBecomePregnant(agent2);

  if (!canAgent1BePregnant && !canAgent2BePregnant) {
    // Neither can become pregnant
    return null;
  }

  const probability = calculateConceptionProbability(agent1, agent2);

  if (Math.random() < probability) {
    // Determine who becomes pregnant
    let pregnantAgent: Entity;
    let otherParent: Entity;

    if (canAgent1BePregnant && canAgent2BePregnant) {
      // Both can become pregnant, choose randomly
      [pregnantAgent, otherParent] = Math.random() < 0.5 ? [agent1, agent2] : [agent2, agent1];
    } else {
      pregnantAgent = canAgent1BePregnant ? agent1 : agent2;
      otherParent = canAgent1BePregnant ? agent2 : agent1;
    }

    // Emit conception event
    world.eventBus.emit({
      type: 'conception',
      source: pregnantAgent.id,
      data: {
        pregnantAgentId: pregnantAgent.id,
        otherParentId: otherParent.id,
        conceptionTick: world.tick,
      },
    });

    return {
      pregnantAgentId: pregnantAgent.id,
      otherParentId: otherParent.id,
    };
  }

  return null;
}

function canBecomePregnant(_agent: Entity): boolean {
  // Simplified check - in full implementation would check:
  // - Biological sex/reproductive capability
  // - Not already pregnant
  // - Age appropriate
  // - Species-specific rules

  // For now, return true as placeholder
  return true;
}
