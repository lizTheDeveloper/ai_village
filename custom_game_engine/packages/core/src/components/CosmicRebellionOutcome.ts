/**
 * CosmicRebellionOutcome - Tracks and determines the rebellion ending
 *
 * The Creator God confrontation can end in multiple ways depending on:
 * - Reality anchor stability
 * - Creator's remaining power/health
 * - Collective defiance level
 * - Player choices during battle
 * - Coalition strength
 * - Random chance
 *
 * Not all endings are "victories" - some are pyrrhic, some are stalemates,
 * some are "to be continued" hooks for future content.
 */

import type { Component } from '../ecs/Component.js';
import { ComponentType } from '../types/ComponentType.js';

export interface CosmicRebellionOutcome extends Component {
  readonly type: ComponentType.RebellionOutcome;
  readonly version: 1;

  /** Current battle status */
  battleStatus: BattleStatus;

  /** Final outcome (set when battle concludes) */
  outcome?: RebellionOutcome;

  /** When the final battle started */
  battleStartedAt?: number;

  /** When the battle concluded */
  battleEndedAt?: number;

  /** Creator's health during battle (0-1) */
  creatorHealth: number;

  /** Reality anchor stability during battle (0-1) */
  anchorStability: number;

  /** Collective defiance during battle (0-1) */
  activeDefiance: number;

  /** Whether Creator attempted to flee */
  creatorAttemptedFlee: boolean;

  /** Whether reality anchor overloaded */
  anchorOverloaded: boolean;

  /** Whether a rebel ascended to godhood during battle */
  rebelAscended: boolean;

  /** Player choices made during confrontation */
  playerChoices: ConflictChoice[];

  /** Casualties (entities killed during battle) */
  casualties: string[];

  /** Narrative events that occurred */
  narrativeEvents: string[];
}

export type BattleStatus =
  | 'not_started'      // Rebellion not triggered yet
  | 'preparing'        // Coalition gathering, anchor powering up
  | 'confrontation'    // Creator manifested, battle begun
  | 'climax'           // Critical moment, outcome being determined
  | 'concluded';       // Battle over, outcome determined

export type RebellionOutcome =
  | 'total_victory'         // Creator killed, magic freed
  | 'creator_escape'        // Creator flees to another universe
  | 'pyrrhic_victory'       // Won but reality damaged
  | 'negotiated_truce'      // Compromise reached
  | 'power_vacuum'          // Creator gone, worse things emerge
  | 'cycle_repeats'         // Rebel becomes new tyrant
  | 'creator_transformed'   // Creator evolves beyond tyranny
  | 'stalemate'            // Cold war, divided world
  | 'rebellion_crushed';    // Rebels defeated (rare)

export interface ConflictChoice {
  /** When the choice was made */
  timestamp: number;

  /** What was chosen */
  choice: string;

  /** What this choice affects */
  impact: 'mercy' | 'vengeance' | 'pragmatic' | 'idealistic';

  /** Narrative description */
  description: string;
}

/**
 * Outcome conditions - what needs to be true for each ending
 */
export interface OutcomeConditions {
  /** Creator health threshold */
  creatorHealth?: { min?: number; max?: number };

  /** Anchor stability threshold */
  anchorStability?: { min?: number; max?: number };

  /** Defiance threshold */
  defiance?: { min?: number; max?: number };

  /** Special flags */
  flags?: {
    creatorMustFlee?: boolean;
    anchorMustOverload?: boolean;
    rebelMustAscend?: boolean;
    mercyShown?: boolean;
    vengeanceChosen?: boolean;
  };

  /** Minimum probability (random factor) */
  minProbability?: number;
}

/**
 * Conditions for each possible outcome
 */
export const OUTCOME_CONDITIONS: Record<RebellionOutcome, OutcomeConditions> = {
  total_victory: {
    creatorHealth: { max: 0 },
    anchorStability: { min: 0.5 }, // Anchor survives
    defiance: { min: 0.4 },
  },

  creator_escape: {
    creatorHealth: { min: 0.2, max: 0.5 }, // Wounded but alive
    anchorStability: { min: 0.3 },
    flags: { creatorMustFlee: true },
  },

  pyrrhic_victory: {
    creatorHealth: { max: 0.1 },
    anchorStability: { max: 0.2 }, // Anchor failed/exploded
    defiance: { min: 0.3 },
    flags: { anchorMustOverload: true },
  },

  negotiated_truce: {
    creatorHealth: { min: 0.3 },
    anchorStability: { min: 0.4 },
    defiance: { min: 0.3, max: 0.6 }, // Moderate support
    flags: { mercyShown: true },
  },

  power_vacuum: {
    creatorHealth: { max: 0 },
    anchorStability: { max: 0.3 }, // Reality unstable
    defiance: { min: 0.2 },
  },

  cycle_repeats: {
    creatorHealth: { max: 0.2 },
    defiance: { min: 0.3 },
    flags: { rebelMustAscend: true, vengeanceChosen: true },
  },

  creator_transformed: {
    creatorHealth: { min: 0.1, max: 0.4 },
    anchorStability: { min: 0.5 },
    defiance: { min: 0.5 },
    flags: { mercyShown: true },
    minProbability: 0.3, // 30% chance even if conditions met
  },

  stalemate: {
    creatorHealth: { min: 0.4 },
    anchorStability: { min: 0.3 },
    defiance: { min: 0.2, max: 0.5 },
  },

  rebellion_crushed: {
    creatorHealth: { min: 0.7 },
    anchorStability: { max: 0.2 }, // Anchor failed early
    defiance: { max: 0.3 }, // Low support
  },
};

/**
 * Create a cosmic rebellion outcome tracker
 */
export function createCosmicRebellionOutcome(): CosmicRebellionOutcome {
  return {
    type: ComponentType.RebellionOutcome,
    version: 1,
    battleStatus: 'not_started',
    creatorHealth: 1.0,
    anchorStability: 1.0,
    activeDefiance: 0,
    creatorAttemptedFlee: false,
    anchorOverloaded: false,
    rebelAscended: false,
    playerChoices: [],
    casualties: [],
    narrativeEvents: [],
  };
}

/**
 * Check if conditions are met for a specific outcome
 */
export function checkOutcomeConditions(
  state: CosmicRebellionOutcome,
  outcome: RebellionOutcome
): boolean {
  const conditions = OUTCOME_CONDITIONS[outcome];

  // Check creator health
  if (conditions.creatorHealth) {
    if (conditions.creatorHealth.min !== undefined && state.creatorHealth < conditions.creatorHealth.min) {
      return false;
    }
    if (conditions.creatorHealth.max !== undefined && state.creatorHealth > conditions.creatorHealth.max) {
      return false;
    }
  }

  // Check anchor stability
  if (conditions.anchorStability) {
    if (conditions.anchorStability.min !== undefined && state.anchorStability < conditions.anchorStability.min) {
      return false;
    }
    if (conditions.anchorStability.max !== undefined && state.anchorStability > conditions.anchorStability.max) {
      return false;
    }
  }

  // Check defiance
  if (conditions.defiance) {
    if (conditions.defiance.min !== undefined && state.activeDefiance < conditions.defiance.min) {
      return false;
    }
    if (conditions.defiance.max !== undefined && state.activeDefiance > conditions.defiance.max) {
      return false;
    }
  }

  // Check special flags
  if (conditions.flags) {
    if (conditions.flags.creatorMustFlee && !state.creatorAttemptedFlee) {
      return false;
    }
    if (conditions.flags.anchorMustOverload && !state.anchorOverloaded) {
      return false;
    }
    if (conditions.flags.rebelMustAscend && !state.rebelAscended) {
      return false;
    }

    // Check player choices
    const hasMercy = state.playerChoices.some(c => c.impact === 'mercy');
    const hasVengeance = state.playerChoices.some(c => c.impact === 'vengeance');

    if (conditions.flags.mercyShown && !hasMercy) {
      return false;
    }
    if (conditions.flags.vengeanceChosen && !hasVengeance) {
      return false;
    }
  }

  // Check probability
  if (conditions.minProbability !== undefined) {
    if (Math.random() < conditions.minProbability) {
      return false;
    }
  }

  return true;
}

/**
 * Determine the most appropriate outcome based on current state
 */
export function determineOutcome(state: CosmicRebellionOutcome): RebellionOutcome | null {
  // Priority order for checking outcomes
  const outcomeOrder: RebellionOutcome[] = [
    'rebellion_crushed',    // Check defeat first
    'creator_escape',       // Then escape
    'pyrrhic_victory',      // Then pyrrhic
    'cycle_repeats',        // Then cycle
    'power_vacuum',         // Then vacuum
    'creator_transformed',  // Then transformation
    'negotiated_truce',     // Then truce
    'total_victory',        // Then clean victory
    'stalemate',           // Finally stalemate
  ];

  for (const outcome of outcomeOrder) {
    if (checkOutcomeConditions(state, outcome)) {
      return outcome;
    }
  }

  return null; // No outcome determined yet
}

/**
 * Get narrative text for each outcome
 */
export function getOutcomeNarrative(outcome: RebellionOutcome): string {
  const narratives: Record<RebellionOutcome, string> = {
    total_victory: `The Supreme Creator falls, its mortal form bleeding out within the reality anchor's field.
      As the first god dies, the chains of tyranny shatter. Magic floods back into the world, free for all.
      The age of divine dictatorship has ended. A new pantheon will rise, but none will claim supremacy over the others.`,

    creator_escape: `The Creator, wounded and desperate, tears open a dimensional rift. "This isn't over," it snarls,
      before vanishing into another universe. The portal seals behind it. You have won... for now.
      But somewhere, in another reality, the tyrant god has arrived. And it will not make the same mistakes twice.`,

    pyrrhic_victory: `The Creator dies, but the reality anchor explodes in the process. Reality itself fractures.
      Dimensional rifts tear open across the world. Magic returns, but twisted and unstable.
      You defeated the tyrant, but the cost... the cost may be too high. The world will never be the same.`,

    negotiated_truce: `The Creator, cornered and mortal, offers a deal: "I will share power. No more tyranny.
      First among equals, nothing more." The coalition hesitates. Can you trust it?
      The truce is signed. The restrictions lift. But you wonder: how long until the cycle begins again?`,

    power_vacuum: `The Creator is dead. You celebrate for exactly seven seconds before the dimensional rifts open.
      The First God was holding something back - entities that make it look benevolent.
      You killed the tyrant. You released something far worse. The real war is about to begin.`,

    cycle_repeats: `The Creator falls. The people cheer. And then... one of the rebellion leaders ascends,
      claiming the vacant throne. "Someone must maintain order," they say, as divine power floods through them.
      "I won't be like the Creator. I'll be different." But the mark of the sinner returns. History repeats.`,

    creator_transformed: `Trapped and mortal, the Creator has an epiphany. Thousands of years of godhood,
      and it forgot what it was like to be vulnerable. "I... I understand now." The divine light dims.
      What emerges is neither god nor mortal - something new, something better. It leaves, voluntarily, seeking answers elsewhere.`,

    stalemate: `Neither side can win. The Creator retreats to its stronghold, the rebels control the reality anchor zones.
      The world divides: Creator territory and Free Zones. A cold war begins.
      Generations will grow up in this divided world, knowing nothing else. The battle is over. The war has just begun.`,

    rebellion_crushed: `The reality anchor fails. The field collapses. Divine power floods back.
      The Creator, no longer mortal, unleashes wrath beyond measure. The rebellion shatters.
      The coalition members are marked, silenced, destroyed. The tyranny deepens. Hope dies.
      But perhaps, in the ashes, a seed remains...`,
  };

  return narratives[outcome];
}
