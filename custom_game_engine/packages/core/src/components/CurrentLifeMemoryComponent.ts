/**
 * CurrentLifeMemoryComponent - Memories from THIS incarnation only
 *
 * This component lives on the BODY entity and stores memories from the current lifetime.
 * It's separate from the soul entity's episodic memory, which contains ALL lifetimes.
 *
 * When the body dies:
 * - Current-life memories are transferred to the soul entity
 * - Body entity is destroyed
 * - Soul entity persists with accumulated memories
 *
 * This separation enables:
 * - Fresh start for each incarnation (body has clean slate)
 * - Soul accumulates wisdom across lifetimes
 * - Veil of forgetting (current life can't access past lives by default)
 */

import type { Component } from '../ecs/Component.js';
import type { EpisodicMemory } from './EpisodicMemoryComponent.js';

export interface CurrentLifeMemoryComponent extends Component {
  type: 'current_life_memory';

  /**
   * Memories from this incarnation only
   * Stored in chronological order
   */
  memories: EpisodicMemory[];

  /**
   * When this incarnation began
   * Used to filter memories by lifetime
   */
  incarnationStartTick: number;

  /**
   * How many significant events this incarnation has experienced
   * Used to measure narrative accumulation
   */
  significantEventCount: number;

  /**
   * Total narrative weight accumulated this lifetime
   */
  narrativeWeight: number;
}

/**
 * Create current-life memory component for a newly incarnated agent
 */
export function createCurrentLifeMemory(
  incarnationStartTick: number
): CurrentLifeMemoryComponent {
  return {
    type: 'current_life_memory',
    version: 1,
    memories: [],
    incarnationStartTick,
    significantEventCount: 0,
    narrativeWeight: 0,
  };
}

/**
 * Add a memory to current life
 */
export function addCurrentLifeMemory(
  component: CurrentLifeMemoryComponent,
  memory: EpisodicMemory
): CurrentLifeMemoryComponent {
  const isSignificant = memory.importance > 0.5;

  return {
    ...component,
    memories: [...component.memories, memory],
    significantEventCount: component.significantEventCount + (isSignificant ? 1 : 0),
    narrativeWeight: component.narrativeWeight + (memory.importance * 100),
  };
}

/**
 * Get all memories from current life
 */
export function getCurrentLifeMemories(component: CurrentLifeMemoryComponent): EpisodicMemory[] {
  return component.memories;
}

/**
 * Get most recent memories (for context in decision-making)
 */
export function getRecentMemories(
  component: CurrentLifeMemoryComponent,
  limit: number = 10
): EpisodicMemory[] {
  return component.memories.slice(-limit);
}
