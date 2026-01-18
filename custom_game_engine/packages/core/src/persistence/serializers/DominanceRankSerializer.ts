/**
 * Serializer for DominanceRankComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { DominanceRankComponent } from '../../components/DominanceRankComponent.js';
import { createDominanceRankComponent } from '../../components/DominanceRankComponent.js';

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
    if (typeof data !== 'object' || data === null) {
      throw new Error('DominanceRankComponent data must be object');
    }

    const d = data as Record<string, unknown>;

    if (typeof d.rank !== 'number') {
      throw new Error('DominanceRankComponent.rank must be number');
    }

    return createDominanceRankComponent({
      rank: d.rank,
      subordinates: Array.isArray(d.subordinates) ? d.subordinates as string[] : undefined,
      canChallengeAbove: typeof d.canChallengeAbove === 'boolean' ? d.canChallengeAbove : undefined,
    });
  }

  validate(data: unknown): data is DominanceRankComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('DominanceRankComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.rank !== 'number') {
      throw new Error('DominanceRankComponent missing required rank');
    }
    return true;
  }
}
