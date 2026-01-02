/**
 * DeathJudgmentComponent - Tracks the psychopomp conversation for a dying soul
 *
 * When an agent dies, they enter a limbo state where they converse with
 * a psychopomp (death guide angel) before transitioning to the afterlife.
 * This component tracks that conversation and its outcomes.
 *
 * See: packages/core/src/divinity/PSYCHOPOMP_DESIGN.md
 */

import type { Component } from '../ecs/Component.js';
import type { CauseOfDeath } from './AfterlifeComponent.js';

export type JudgmentStage =
  | 'awaiting_psychopomp'  // Soul just died, waiting for guide to appear
  | 'in_conversation'      // Actively conversing with psychopomp
  | 'judgment_delivered'   // Verdict given, waiting for final words
  | 'crossing_over';       // Ready to transition to Underworld

export interface ConversationExchange {
  speaker: 'psychopomp' | 'soul';
  text: string;
  timestamp: number;
}

export interface DeathJudgmentComponent extends Component {
  type: 'death_judgment';

  // Conversation state
  stage: JudgmentStage;
  conversationStartTick: number;
  lastExchangeTick: number;

  // Psychopomp
  psychopompId: string | null;  // Entity ID of the psychopomp angel (null if not yet spawned)
  psychopompName: string;        // Name of the death guide

  // Conversation history
  exchanges: ConversationExchange[];
  currentExchangeIndex: number;  // Which exchange we're on (0-3)

  // Judgment results (will affect AfterlifeComponent creation)
  judgedPeace: number;           // 0-1, how at peace they are with death
  judgedTether: number;          // 0-1, how connected to living world
  coherenceModifier: number;     // Bonus/penalty to starting coherence (-0.2 to +0.2)

  // Conversation context (used for generating prompts)
  causeOfDeath: CauseOfDeath;
  ageName: string;               // 'child', 'young adult', 'middle aged', 'elderly'
  unfinishedGoals: string[];
  importantRelationships: Array<{ name: string; relationship: string }>;
  notableDeeds: string[];        // Significant accomplishments
  sins: string[];                // Taboo violations, crimes
  beliefs: string | null;        // Deity they worshipped, if any

  // Awaiting response
  awaitingSoulResponse: boolean; // True when waiting for soul's LLM response
  awaitingPsychopompResponse: boolean; // True when waiting for psychopomp's response
}

/**
 * Create a new DeathJudgmentComponent for a dying soul
 */
export function createDeathJudgmentComponent(
  currentTick: number,
  causeOfDeath: CauseOfDeath,
  ageName: string = 'adult',
  psychopompName: string = 'The Ferryman'
): DeathJudgmentComponent {
  return {
    type: 'death_judgment',
    version: 0,

    // Start in awaiting stage
    stage: 'awaiting_psychopomp',
    conversationStartTick: currentTick,
    lastExchangeTick: currentTick,

    // Psychopomp not yet spawned
    psychopompId: null,
    psychopompName,

    // Empty conversation history
    exchanges: [],
    currentExchangeIndex: 0,

    // Default judgment values (will be refined during conversation)
    judgedPeace: 0.5,
    judgedTether: 0.5,
    coherenceModifier: 0,

    // Context
    causeOfDeath,
    ageName,
    unfinishedGoals: [],
    importantRelationships: [],
    notableDeeds: [],
    sins: [],
    beliefs: null,

    // Response tracking
    awaitingSoulResponse: false,
    awaitingPsychopompResponse: true, // Start waiting for psychopomp greeting
  };
}

/**
 * Add an exchange to the conversation history
 */
export function addConversationExchange(
  judgment: DeathJudgmentComponent,
  speaker: 'psychopomp' | 'soul',
  text: string,
  timestamp: number
): void {
  judgment.exchanges.push({ speaker, text, timestamp });
  judgment.lastExchangeTick = timestamp;

  // Update response tracking
  if (speaker === 'psychopomp') {
    judgment.awaitingPsychopompResponse = false;
    judgment.awaitingSoulResponse = true;
  } else {
    judgment.awaitingSoulResponse = false;
    judgment.awaitingPsychopompResponse = true;
  }
}

/**
 * Calculate peace based on death circumstances
 *
 * Factors:
 * - Cause of death (natural > illness > accident > violence)
 * - Unfinished goals (fewer = higher peace)
 * - Age (lived full life > died young)
 */
export function calculateInitialPeace(
  causeOfDeath: CauseOfDeath,
  ageName: string,
  unfinishedGoalsCount: number
): number {
  let peace = 0.5; // Base

  // Cause of death impact
  switch (causeOfDeath) {
    case 'old_age':
      peace += 0.3;
      break;
    case 'disease':
      peace += 0.1;
      break;
    case 'starvation':
      peace -= 0.1;
      break;
    case 'exposure':
      peace -= 0.15;
      break;
    case 'combat':
      peace -= 0.2;
      break;
    case 'murder':
      peace -= 0.3;
      break;
    case 'sacrifice':
      peace += 0.2; // Died for a purpose
      break;
    case 'accident':
      peace -= 0.15;
      break;
    case 'unknown':
      peace -= 0.1;
      break;
  }

  // Age impact
  switch (ageName) {
    case 'child':
      peace -= 0.2; // Very tragic
      break;
    case 'young adult':
      peace -= 0.1; // Still had much to do
      break;
    case 'middle aged':
      peace += 0.05; // Lived a reasonable life
      break;
    case 'elderly':
      peace += 0.15; // Lived a full life
      break;
  }

  // Unfinished business
  peace -= unfinishedGoalsCount * 0.05; // Each unfinished goal reduces peace

  return Math.max(0, Math.min(1, peace));
}

/**
 * Calculate tether based on relationships and responsibilities
 *
 * Factors:
 * - Number of living relationships (more = higher tether)
 * - Unfinished goals (more = higher tether)
 * - Age (young = higher tether, elderly = lower)
 */
export function calculateInitialTether(
  relationshipCount: number,
  unfinishedGoalsCount: number,
  ageName: string
): number {
  let tether = 0.3; // Base

  // Relationships
  tether += relationshipCount * 0.1; // Each relationship increases tether

  // Unfinished business
  tether += unfinishedGoalsCount * 0.08; // Each goal increases tether

  // Age impact (reversed from peace - young have stronger tether)
  switch (ageName) {
    case 'child':
      tether += 0.2; // Strong attachment to life
      break;
    case 'young adult':
      tether += 0.15;
      break;
    case 'middle aged':
      tether += 0.05;
      break;
    case 'elderly':
      tether -= 0.1; // Ready to let go
      break;
  }

  return Math.max(0, Math.min(1, tether));
}

/**
 * Get appropriate age category based on agent's age
 */
export function getAgeCategory(age: number): string {
  if (age < 15) return 'child';
  if (age < 30) return 'young adult';
  if (age < 55) return 'middle aged';
  return 'elderly';
}

/**
 * Get a description of the conversation outcome
 */
export function getJudgmentSummary(judgment: DeathJudgmentComponent): string {
  const peaceDesc = judgment.judgedPeace > 0.7 ? 'at peace'
    : judgment.judgedPeace > 0.4 ? 'uncertain'
    : 'troubled';

  const tetherDesc = judgment.judgedTether > 0.7 ? 'strongly bound to the living'
    : judgment.judgedTether > 0.4 ? 'moderately connected'
    : 'ready to move on';

  return `The soul departed ${peaceDesc}, ${tetherDesc}.`;
}
