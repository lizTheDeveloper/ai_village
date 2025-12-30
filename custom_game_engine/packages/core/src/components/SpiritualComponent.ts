/**
 * SpiritualComponent - Tracks faith, prayer, and divine connection
 *
 * Forward-compatibility component for Phase 27: Divine Communication.
 * Enables prayer/meditation mechanics and player-as-god interactions.
 *
 * Part of Forward-Compatibility Phase
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// Prayer Types and Structures
// ============================================================================

/** Types of prayers agents can make */
export type PrayerType =
  | 'guidance'     // "What should I do?"
  | 'help'         // "Please help X"
  | 'gratitude'    // "Thank you for X"
  | 'question'     // "Why did X happen?"
  | 'confession'   // "I'm sorry for X"
  | 'plea'         // "Please make X happen"
  | 'praise'       // General worship
  | 'mourning';    // Prayer for the dead

/** Urgency levels for prayers */
export type PrayerUrgency = 'routine' | 'earnest' | 'desperate';

/** A prayer made by an agent */
export interface Prayer {
  id: string;
  type: PrayerType;
  urgency: PrayerUrgency;
  content: string;           // Natural language prayer text
  subject?: string;          // What/who the prayer is about
  timestamp: number;         // When prayer was made
  answered: boolean;
  responseType?: 'vision' | 'sign' | 'silence' | 'angel_response';
  responseTime?: number;
  answeringEntityId?: string; // Player or angel ID
  satisfiedWithResponse?: boolean;
}

/** A doubt that weakens faith */
export interface Doubt {
  id: string;
  reason: string;
  severity: number;          // 0-1
  timestamp: number;
  resolved: boolean;
  resolutionReason?: string;
}

/** A vision received from divine source */
export interface Vision {
  id?: string;
  content: string;           // What the agent "saw"
  source: 'meditation' | 'dream' | 'sign' | 'direct' | 'deity';
  clarity: number;           // 0-1, how clear the vision was
  timestamp?: number;
  receivedAt?: number;       // Alias for timestamp (tick-based)
  interpreted?: boolean;
  interpretation?: string;
  sharedWith?: string[];     // Agent IDs who heard about this
  isDream?: boolean;         // Whether vision came during sleep
}

// ============================================================================
// Spiritual Component
// ============================================================================

/**
 * SpiritualComponent tracks an agent's relationship with the divine.
 *
 * Future use cases:
 * - Prayer mechanics (agent speaks to player/god)
 * - Meditation (agent listens for divine guidance)
 * - Visions (player sends messages to agents)
 * - Faith system affecting behavior
 * - Sacred sites and rituals
 */
export interface SpiritualComponent extends Component {
  type: 'spiritual';

  // ============================================================================
  // Deity Relationship
  // ============================================================================

  /** Which deity this agent believes in (entity ID) */
  believedDeity?: string;

  // ============================================================================
  // Faith & Relationship
  // ============================================================================

  /** Faith level (0-1), strength of belief */
  faith: number;

  /** Baseline faith from personality */
  baselineFaith: number;

  /** Peak faith ever achieved */
  peakFaith: number;

  /** Whether agent has ever had a vision (increases faith ceiling) */
  hasReceivedVision: boolean;

  // ============================================================================
  // Prayer History
  // ============================================================================

  /** Recent prayers (circular buffer) */
  prayers: Prayer[];

  /** Total prayers made (lifetime) */
  totalPrayers: number;

  /** Prayers that received responses */
  answeredPrayers: number;

  /** Prayers that went unanswered */
  unansweredPrayers: number;

  /** Last time this agent prayed */
  lastPrayerTime?: number;

  /** Preferred prayer location (sacred site ID) */
  preferredPrayerSpot?: string;

  // ============================================================================
  // Visions & Divine Messages
  // ============================================================================

  /** Visions received */
  visions: Vision[];

  /** Whether currently in meditation */
  meditating: boolean;

  /** Meditation progress (0-1) */
  meditationProgress?: number;

  // ============================================================================
  // Doubts & Crisis of Faith
  // ============================================================================

  /** Active doubts */
  doubts: Doubt[];

  /** Whether in a crisis of faith */
  crisisOfFaith: boolean;

  /** Game tick when crisis started */
  crisisStarted?: number;

  // ============================================================================
  // Religious Practice
  // ============================================================================

  /** Prayer style/personality */
  prayerStyle: 'formal' | 'conversational' | 'desperate' | 'grateful' | 'questioning';

  /** How often agent prays naturally (ticks between prayers) */
  prayerFrequency: number;

  /** Whether agent is a religious leader */
  religiousLeader: boolean;

  /** Followers (if religious leader) */
  followers?: string[];
}

/**
 * Create a default SpiritualComponent.
 */
export function createSpiritualComponent(
  baselineFaith: number = 0.5,
  believedDeity?: string
): SpiritualComponent {
  return {
    type: 'spiritual',
    version: 1,
    believedDeity,
    faith: baselineFaith,
    baselineFaith,
    peakFaith: baselineFaith,
    hasReceivedVision: false,
    prayers: [],
    totalPrayers: 0,
    answeredPrayers: 0,
    unansweredPrayers: 0,
    visions: [],
    meditating: false,
    doubts: [],
    crisisOfFaith: false,
    prayerStyle: 'conversational',
    prayerFrequency: 24000, // ~20 minutes at 20 TPS
    religiousLeader: false,
  };
}

/**
 * Record a prayer being made.
 */
export function recordPrayer(
  component: SpiritualComponent,
  prayer: Prayer,
  maxHistory: number = 20
): SpiritualComponent {
  return {
    ...component,
    prayers: [prayer, ...component.prayers].slice(0, maxHistory),
    totalPrayers: component.totalPrayers + 1,
    lastPrayerTime: prayer.timestamp,
  };
}

/**
 * Record a prayer being answered.
 */
export function answerPrayer(
  component: SpiritualComponent,
  prayerId: string,
  responseType: Prayer['responseType'],
  answeringEntityId?: string
): SpiritualComponent {
  const prayers = component.prayers.map(p =>
    p.id === prayerId
      ? { ...p, answered: true, responseType, answeringEntityId, responseTime: Date.now() }
      : p
  );

  // Answered prayers increase faith
  const faithBoost = responseType === 'vision' ? 0.1 : 0.05;

  return {
    ...component,
    prayers,
    answeredPrayers: component.answeredPrayers + 1,
    faith: Math.min(1, component.faith + faithBoost),
    peakFaith: Math.max(component.peakFaith, component.faith + faithBoost),
  };
}

/**
 * Record a vision being received.
 */
export function receiveVision(
  component: SpiritualComponent,
  vision: Vision,
  maxHistory: number = 10
): SpiritualComponent {
  return {
    ...component,
    visions: [vision, ...component.visions].slice(0, maxHistory),
    hasReceivedVision: true,
    faith: Math.min(1, component.faith + 0.15),
    peakFaith: Math.max(component.peakFaith, component.faith + 0.15),
    meditating: false,
    meditationProgress: undefined,
  };
}

/**
 * Add a doubt that weakens faith.
 */
export function addDoubt(
  component: SpiritualComponent,
  doubt: Doubt
): SpiritualComponent {
  const doubts = [...component.doubts, doubt];
  const totalSeverity = doubts.filter(d => !d.resolved).reduce((sum, d) => sum + d.severity, 0);

  // Faith decreases based on active doubts
  const newFaith = Math.max(0, component.faith - doubt.severity * 0.1);

  // Crisis of faith if too many doubts
  const crisisOfFaith = totalSeverity > 0.5 && !component.hasReceivedVision;

  return {
    ...component,
    doubts,
    faith: newFaith,
    crisisOfFaith,
    crisisStarted: crisisOfFaith && !component.crisisOfFaith ? Date.now() : component.crisisStarted,
  };
}

/**
 * Resolve a doubt (vision, answered prayer, or time).
 */
export function resolveDoubt(
  component: SpiritualComponent,
  doubtId: string,
  reason: string
): SpiritualComponent {
  const doubts = component.doubts.map(d =>
    d.id === doubtId ? { ...d, resolved: true, resolutionReason: reason } : d
  );

  const activeSeverity = doubts.filter(d => !d.resolved).reduce((sum, d) => sum + d.severity, 0);
  const crisisOfFaith = activeSeverity > 0.5;

  return {
    ...component,
    doubts,
    crisisOfFaith,
    faith: Math.min(1, component.faith + 0.05), // Resolving doubts slightly restores faith
  };
}
