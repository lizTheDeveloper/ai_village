import type { Component } from '../ecs/Component.js';
import type { EntityId, Tick } from '../types.js';

export interface Relationship {
  targetId: EntityId;
  familiarity: number; // 0-100: How well they know each other
  lastInteraction: Tick;
  interactionCount: number;
  sharedMemories: number; // Count of information shared
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
  familiarityIncrease: number = 5
): RelationshipComponent {
  const existing = component.relationships.get(targetId);

  const updated: Relationship = existing
    ? {
        ...existing,
        familiarity: Math.min(100, existing.familiarity + familiarityIncrease),
        lastInteraction: currentTick,
        interactionCount: existing.interactionCount + 1,
      }
    : {
        targetId,
        familiarity: familiarityIncrease,
        lastInteraction: currentTick,
        interactionCount: 1,
        sharedMemories: 0,
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
