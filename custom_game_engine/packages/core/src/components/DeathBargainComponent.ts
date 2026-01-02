/**
 * DeathBargainComponent - Tracks a hero's bargain with the God of Death
 *
 * When a hero with a grand destiny dies, the God of Death may offer them
 * a challenge to return to life, echoing myths like Orpheus, Sisyphus, and the Sphinx.
 */

import type { Component } from '../ecs/Component.js';

export type ChallengeType = 'riddle' | 'feat' | 'game' | 'oratory' | 'memory' | 'moral';
export type BargainStatus = 'offered' | 'accepted' | 'in_progress' | 'succeeded' | 'failed' | 'declined';

export interface ResurrectionConditions {
  /** Health penalty percentage (0-1) */
  healthPenalty?: number;

  /** Duration of penalty in game ticks */
  penaltyDuration?: number;

  /** Special blessing granted */
  blessing?: string;

  /** Debt owed to Death */
  debtOwed?: string;

  /** Deadline to fulfill debt (tick) */
  deadline?: number;

  /** Mark/curse from Death */
  mark?: string;
}

export interface DeathBargainComponent extends Component {
  readonly type: 'death_bargain';
  version: 1;

  // Challenge details
  challengeType: ChallengeType;
  challengeDescription: string;
  deathGodDialogue: string[];
  deathGodName: string;

  // Riddle-specific data
  riddle?: {
    question: string;
    correctAnswer: string;
    acceptedAnswers?: string[]; // Alternative correct answers
    hint?: string;
  };

  // Progress tracking
  status: BargainStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptTick?: number;
  heroResponse?: string;

  // Outcome
  succeeded?: boolean;
  resurrectConditions?: ResurrectionConditions;

  // Context from death
  deathTick: number;
  deathLocation: { x: number; y: number };
  causeOfDeath: string;
  destinyText?: string;
}

/**
 * Create a death bargain component
 */
export function createDeathBargainComponent(
  challengeType: ChallengeType,
  deathGodName: string,
  deathTick: number,
  deathLocation: { x: number; y: number },
  causeOfDeath: string,
  destinyText?: string
): DeathBargainComponent {
  return {
    type: 'death_bargain',
    version: 1,
    challengeType,
    challengeDescription: '',
    deathGodDialogue: [],
    deathGodName,
    status: 'offered',
    attempts: 0,
    maxAttempts: 3, // Default: 3 attempts
    deathTick,
    deathLocation,
    causeOfDeath,
    destinyText,
  };
}

/**
 * Famous riddles from mythology for testing
 */
export const MYTHIC_RIDDLES = {
  sphinx: {
    question: 'What walks on four legs in the morning, two legs at noon, and three legs in the evening?',
    correctAnswer: 'man',
    acceptedAnswers: ['human', 'person', 'mankind', 'humanity', 'a man', 'a human'],
    hint: 'Think of the stages of a human life...',
    source: 'The Sphinx of Thebes',
  },
  gollum: {
    question: 'This thing all things devours; birds, beasts, trees, flowers; gnaws iron, bites steel; grinds hard stones to meal. What is it?',
    correctAnswer: 'time',
    acceptedAnswers: ['age', 'aging', 'the passage of time'],
    hint: 'It is invisible but affects all things equally...',
    source: 'Gollum (The Hobbit)',
  },
  samson: {
    question: 'Out of the eater came something to eat, and out of the strong came something sweet. What is it?',
    correctAnswer: 'honey',
    acceptedAnswers: ['honey from a lion', 'honeycomb', 'bees in a lion'],
    hint: 'Think of something found in an unlikely place...',
    source: 'Samson',
  },
} as const;
