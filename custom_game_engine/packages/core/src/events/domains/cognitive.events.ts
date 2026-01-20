/**
 * Cognitive and memory events.
 * Covers memory formation, consolidation, recall, and cognitive processes.
 */
import type { EntityId } from '../../types.js';

export interface CognitiveEvents {
  /** Memory faded/forgotten */
  'memory:faded': {
    agentId: EntityId;
    memoryId: string;
    memoryType: string;
    reason: 'decay' | 'interference' | 'repression';
  };

  /** Belief formed or updated */
  'belief:updated': {
    agentId: EntityId;
    beliefType: string;
    description: string;
    strength: number;
    evidence?: string[];
  };

  /**
   * Reflection completed
   * Note: This schema matches what ReflectionSystem emits and MetricsCollectionSystem expects
   * The canonical schema is in misc.events.ts
   */
  'reflection:completed': {
    agentId: EntityId;
    reflectionCount: number;
    reflectionType?: string;
  };

  /** Afterlife memory fading progress update during reincarnation childhood */
  'afterlife:memory_fading': {
    agentId: EntityId;
    fadeProgress: number; // 0-1, how far through the fading process (1 = complete)
    memoriesRemaining: number; // Count of afterlife memories still conscious
    memoriesSuppressed: number; // Count suppressed this update
    clarityMultiplier: number; // Current clarity multiplier (0-1)
    age: number; // Current agent age in ticks/game-years
  };

  /** Afterlife memories completed fading (all suppressed to unconscious) */
  'afterlife:memories_faded': {
    agentId: EntityId;
    totalMemoriesSuppressed: number; // Total afterlife memories moved to unconscious
    retainedIntoAdulthood: boolean; // Was this a rare 1% case that retained fragments?
    finalClarityMultiplier: number; // Final clarity before complete suppression
    fadingDuration: number; // How long the fading process took (ticks)
  };
}

export type CognitiveEventType = keyof CognitiveEvents;
export type CognitiveEventData = CognitiveEvents[CognitiveEventType];
