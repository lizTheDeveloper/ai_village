/**
 * VeilOfForgettingComponent - Manages access to past-life memories
 *
 * When a soul reincarnates, there's a "veil of forgetting" - the new incarnation
 * doesn't consciously remember past lives. BUT occasionally, memories can "bleed through":
 * - Dreams of past lives
 * - Déjà vu when visiting familiar places
 * - Unexplained knowledge or skills
 * - Sudden emotions toward strangers (who knew you before)
 * - Flashbacks during similar emotional events
 *
 * This component lives on the BODY entity and tracks which past-life memories
 * have bled through the veil into conscious awareness.
 */

import type { Component } from '../ecs/Component.js';

/** How a past-life memory manifests in current consciousness */
export type MemoryBleedForm =
  | 'dream'        // During sleep
  | 'deja_vu'     // "I've been here before..."
  | 'flashback'   // Brief vivid memory while awake
  | 'intuition'   // Gut feeling based on past experience
  | 'skill'       // Unexplained talent/knowledge
  | 'emotion';    // Sudden fear/love without current-life reason

/** A past-life memory that has bled through the veil */
export interface MemoryBleed {
  /** When the bleed occurred (current life tick) */
  bleedTick: number;

  /** ID of the past-life memory from the soul entity */
  pastLifeMemoryId: string;

  /** Which past incarnation this memory is from */
  incarnationNumber: number;

  /** How the memory manifested */
  form: MemoryBleedForm;

  /** What triggered the bleed */
  trigger: string;

  /** Clarity of the memory (0-1)
   * Past-life memories are usually fragmentary
   */
  clarity: number;

  /** Natural language description of what was remembered */
  content: string;

  /** How the agent interpreted it
   * They might not realize it's a past-life memory
   */
  interpretation?: string;
}

export interface VeilOfForgettingComponent extends Component {
  type: 'veil_of_forgetting';

  /**
   * Memories that have bled through from past lives
   * These become part of the agent's current-life experience
   */
  bleedThroughs: MemoryBleed[];

  /**
   * Probability modifiers for different trigger types
   * Base probabilities can be adjusted by traits, events, etc.
   */
  triggerSensitivity: {
    location_from_past_life: number;  // Default: 0.3
    person_from_past_life: number;    // Default: 0.5
    similar_emotional_event: number;  // Default: 0.2
    dreams: number;                   // Default: 0.25
    meditation: number;               // Default: 0.15
    near_death: number;               // Default: 0.8
    random: number;                   // Default: 0.01 per day
  };

  /**
   * Total number of past lives this soul has lived
   * (from the soul entity's incarnation history)
   */
  pastLivesCount: number;

  /**
   * Is the agent aware they're experiencing past-life memories?
   * Most won't realize it - they'll think dreams are just dreams
   */
  isAwareOfReincarnation: boolean;
}

/**
 * Create veil of forgetting for a newly incarnated agent
 */
export function createVeilOfForgetting(pastLivesCount: number): VeilOfForgettingComponent {
  return {
    type: 'veil_of_forgetting',
    version: 1,
    bleedThroughs: [],
    triggerSensitivity: {
      location_from_past_life: 0.3,
      person_from_past_life: 0.5,
      similar_emotional_event: 0.2,
      dreams: 0.25,
      meditation: 0.15,
      near_death: 0.8,
      random: 0.01,
    },
    pastLivesCount,
    isAwareOfReincarnation: false,
  };
}

/**
 * Record a memory bleed-through
 */
export function recordMemoryBleed(
  component: VeilOfForgettingComponent,
  bleed: MemoryBleed
): VeilOfForgettingComponent {
  return {
    ...component,
    bleedThroughs: [...component.bleedThroughs, bleed],
  };
}

/**
 * Agent realizes they're experiencing reincarnation memories
 * This changes how they interpret future bleeds
 */
export function becomeAware(component: VeilOfForgettingComponent): VeilOfForgettingComponent {
  return {
    ...component,
    isAwareOfReincarnation: true,
  };
}

/**
 * Increase sensitivity to a trigger type
 * (e.g., after meditation training, dreams become more vivid)
 */
export function increaseSensitivity(
  component: VeilOfForgettingComponent,
  triggerType: keyof VeilOfForgettingComponent['triggerSensitivity'],
  amount: number
): VeilOfForgettingComponent {
  return {
    ...component,
    triggerSensitivity: {
      ...component.triggerSensitivity,
      [triggerType]: Math.min(1, component.triggerSensitivity[triggerType] + amount),
    },
  };
}
