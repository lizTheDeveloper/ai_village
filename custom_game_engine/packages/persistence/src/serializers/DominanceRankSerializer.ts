/**
 * Serializer for DominanceRankComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { DominanceRankComponent } from '@ai-village/core';
import { createDominanceRankComponent } from '@ai-village/core';

export class DominanceRankSerializer extends BaseComponentSerializer<DominanceRankComponent> {
  constructor() {
    super('dominance_rank', 1);
  }

  protected serializeData(component: DominanceRankComponent): Record<string, unknown> {
    return {
      rank: component.rank,
      subordinates: component.subordinates,
      canChallengeAbove: component.canChallengeAbove,
    };
  }

  protected deserializeData(data: unknown): DominanceRankComponent {
    const d = data as Record<string, unknown>;
    return createDominanceRankComponent({
      rank: d.rank as number,
      subordinates: d.subordinates as string[] | undefined,
      canChallengeAbove: d.canChallengeAbove as boolean | undefined,
    });
  }

  validate(data: unknown): data is DominanceRankComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('DominanceRankComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (d.rank === undefined) {
      throw new Error('DominanceRankComponent missing required rank');
    }
    return true;
  }
}
