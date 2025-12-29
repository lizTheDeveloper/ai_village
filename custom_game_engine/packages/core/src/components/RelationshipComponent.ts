import type { Component } from '../ecs/Component.js';
import type { EntityId, Tick } from '../types.js';

/**
 * Perceived skill represents what one agent knows about another's skills.
 * Per progressive-skill-reveal-spec.md: Social skill gates knowledge about others' skills.
 */
export interface PerceivedSkill {
  skillId: string; // e.g., 'building', 'cooking', 'farming'
  level: number; // Perceived level (0-5) - may not match actual level
  confidence: number; // 0-100: How confident they are in this perception
  lastObserved: Tick; // When this skill was last observed
}

export interface Relationship {
  targetId: EntityId;
  familiarity: number; // 0-100: How well they know each other
  affinity: number; // -100 to 100: Do they like each other? (negative = dislike, positive = like)
  trust: number; // 0-100: Do they trust each other?
  lastInteraction: Tick;
  interactionCount: number;
  sharedMemories: number; // Count of information shared
  sharedMeals: number; // Count of meals shared together (for social bonding)
  perceivedSkills: PerceivedSkill[]; // What skills they perceive the target to have
}

export interface RelationshipComponent extends Component {
  type: 'relationship';
  relationships: Map<EntityId, Relationship>;
}

export function createRelationshipComponent(): RelationshipComponent {
  return {
    type: 'relationship',
    version: 1,
    relationships: new Map(),
  };
}

export function getRelationship(
  component: RelationshipComponent,
  targetId: EntityId
): Relationship | undefined {
  return component.relationships.get(targetId);
}

export function updateRelationship(
  component: RelationshipComponent,
  targetId: EntityId,
  currentTick: Tick,
  familiarityIncrease: number = 5,
  affinityChange: number = 0
): RelationshipComponent {
  const existing = component.relationships.get(targetId);

  const updated: Relationship = existing
    ? {
        ...existing,
        familiarity: Math.min(100, existing.familiarity + familiarityIncrease),
        affinity: Math.max(-100, Math.min(100, existing.affinity + affinityChange)),
        lastInteraction: currentTick,
        interactionCount: existing.interactionCount + 1,
      }
    : {
        targetId,
        familiarity: familiarityIncrease,
        affinity: affinityChange,
        trust: 0,
        lastInteraction: currentTick,
        interactionCount: 1,
        sharedMemories: 0,
        sharedMeals: 0,
        perceivedSkills: [],
      };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

export function shareMemory(
  component: RelationshipComponent,
  targetId: EntityId
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) return component;

  const updated: Relationship = {
    ...existing,
    sharedMemories: existing.sharedMemories + 1,
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

export function getFamiliarity(
  component: RelationshipComponent,
  targetId: EntityId
): number {
  const relationship = component.relationships.get(targetId);
  return relationship ? relationship.familiarity : 0;
}

export function getAllRelationships(
  component: RelationshipComponent
): Relationship[] {
  return Array.from(component.relationships.values());
}

export function getStrongestRelationships(
  component: RelationshipComponent,
  count: number = 5
): Relationship[] {
  return getAllRelationships(component)
    .sort((a, b) => b.familiarity - a.familiarity)
    .slice(0, count);
}

/**
 * Get affinity (-100 to 100) for a target.
 * Positive = likes, negative = dislikes.
 */
export function getAffinity(
  component: RelationshipComponent,
  targetId: EntityId
): number {
  const relationship = component.relationships.get(targetId);
  return relationship ? relationship.affinity : 0;
}

/**
 * Update affinity for a target.
 */
export function updateAffinity(
  component: RelationshipComponent,
  targetId: EntityId,
  affinityDelta: number
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) return component;

  const updated: Relationship = {
    ...existing,
    affinity: Math.max(-100, Math.min(100, existing.affinity + affinityDelta)),
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Update trust for a target.
 */
export function updateTrust(
  component: RelationshipComponent,
  targetId: EntityId,
  trustDelta: number
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) return component;

  const updated: Relationship = {
    ...existing,
    trust: Math.max(0, Math.min(100, existing.trust + trustDelta)),
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Record a shared meal between agents.
 * Increases affinity and sharedMeals count.
 */
export function recordSharedMeal(
  component: RelationshipComponent,
  targetId: EntityId,
  currentTick: Tick
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) {
    // Create new relationship if none exists
    const newRel: Relationship = {
      targetId,
      familiarity: 5,
      affinity: 5, // Shared meals create positive affinity
      trust: 2,
      lastInteraction: currentTick,
      interactionCount: 1,
      sharedMemories: 0,
      sharedMeals: 1,
      perceivedSkills: [],
    };
    const newRelationships = new Map(component.relationships);
    newRelationships.set(targetId, newRel);
    return { ...component, relationships: newRelationships };
  }

  const updated: Relationship = {
    ...existing,
    familiarity: Math.min(100, existing.familiarity + 3),
    affinity: Math.min(100, existing.affinity + 5), // Eating together builds affinity
    trust: Math.min(100, existing.trust + 1),
    lastInteraction: currentTick,
    sharedMeals: existing.sharedMeals + 1,
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Get relationships sorted by affinity (friends first).
 */
export function getFriends(
  component: RelationshipComponent,
  count: number = 5
): Relationship[] {
  return getAllRelationships(component)
    .filter((r) => r.affinity > 0)
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, count);
}

/**
 * Get relationships with negative affinity (rivals/enemies).
 */
export function getRivals(
  component: RelationshipComponent,
  count: number = 5
): Relationship[] {
  return getAllRelationships(component)
    .filter((r) => r.affinity < 0)
    .sort((a, b) => a.affinity - b.affinity) // Most negative first
    .slice(0, count);
}
