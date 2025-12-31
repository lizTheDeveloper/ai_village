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

export function createDominanceRankComponent(data: {
  rank: number;
  subordinates?: EntityId[];
  canChallengeAbove?: boolean;
}): DominanceRankComponent {
  if (data.rank === undefined) {
    throw new Error('Rank is required');
  }

  return {
    type: 'dominance_rank',
    version: 1,
    rank: data.rank,
    subordinates: data.subordinates || [],
    canChallengeAbove: data.canChallengeAbove !== undefined ? data.canChallengeAbove : true,
  };
}
