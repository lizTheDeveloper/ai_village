import type { Component } from '../ecs/Component.js';
import type { EntityId } from '../types.js';

/**
 * DominanceRankComponent - Dominance hierarchy for dominance-based species
 *
 * Used by species with hierarchical social structures
 */
export interface DominanceRankComponent extends Component {
  readonly type: 'dominance_rank';
  readonly version: 1;

  /** Rank in hierarchy (1 = alpha, higher = lower status) */
  rank: number;

  /** IDs of subordinates */
  subordinates: EntityId[];

  /** Whether this individual can challenge those above */
  canChallengeAbove: boolean;
}

/** Input type for factory use - accepts unknown values with runtime validation */
export type DominanceRankInput = Record<string, unknown>;

export function createDominanceRankComponent(data: DominanceRankInput): DominanceRankComponent {
  const rank = data.rank as number | undefined;
  const subordinates = data.subordinates as EntityId[] | undefined;
  const canChallengeAbove = data.canChallengeAbove as boolean | undefined;

  if (rank === undefined) {
    throw new Error('Rank is required');
  }

  return {
    type: 'dominance_rank',
    version: 1,
    rank,
    subordinates: subordinates || [],
    canChallengeAbove: canChallengeAbove !== undefined ? canChallengeAbove : true,
  };
}
