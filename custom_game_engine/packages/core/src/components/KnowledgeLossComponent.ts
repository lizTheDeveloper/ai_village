import type { Component } from '../ecs/Component.js';

/**
 * Lost memory record - tracks unique knowledge that died with an agent
 */
export interface LostMemory {
  readonly id: string;
  readonly content: string;
  readonly deceasedId: string;
  readonly deceasedName?: string;
  readonly lostAt: number; // Tick when lost
  readonly importance: number;
  readonly emotionalIntensity?: number;
  readonly eventType?: string;
}

/**
 * KnowledgeLossComponent - Singleton component tracking lost knowledge
 *
 * When agents die, their unique (non-shared) memories are lost forever.
 * This component maintains a historical record of what knowledge has been
 * permanently lost from the world.
 *
 * This is a singleton component attached to a world-level entity.
 */
export interface KnowledgeLossComponent extends Component {
  type: 'knowledge_loss';
  lostMemories: LostMemory[];
  totalKnowledgeLost: number;
  lastUpdated: number;
}

/**
 * Create a new KnowledgeLossComponent
 */
export function createKnowledgeLossComponent(): KnowledgeLossComponent {
  return {
    type: 'knowledge_loss',
    version: 1,
    lostMemories: [],
    totalKnowledgeLost: 0,
    lastUpdated: 0,
  };
}

/**
 * Add a lost memory to the component
 */
export function addLostMemory(
  component: KnowledgeLossComponent,
  memory: LostMemory
): KnowledgeLossComponent {
  return {
    ...component,
    lostMemories: [...component.lostMemories, memory],
    totalKnowledgeLost: component.totalKnowledgeLost + 1,
    lastUpdated: memory.lostAt,
  };
}

/**
 * Add multiple lost memories (batch operation)
 */
export function addLostMemories(
  component: KnowledgeLossComponent,
  memories: LostMemory[]
): KnowledgeLossComponent {
  if (memories.length === 0) return component;

  return {
    ...component,
    lostMemories: [...component.lostMemories, ...memories],
    totalKnowledgeLost: component.totalKnowledgeLost + memories.length,
    lastUpdated: memories[memories.length - 1]?.lostAt ?? component.lastUpdated,
  };
}

/**
 * Get lost memories by deceased agent
 */
export function getLostMemoriesByAgent(
  component: KnowledgeLossComponent,
  deceasedId: string
): LostMemory[] {
  return component.lostMemories.filter(m => m.deceasedId === deceasedId);
}

/**
 * Get most important lost memories
 */
export function getMostImportantLostMemories(
  component: KnowledgeLossComponent,
  limit: number = 10
): LostMemory[] {
  return [...component.lostMemories]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit);
}
