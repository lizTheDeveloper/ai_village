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
    const d = data as any;
    return createDominanceRankComponent({
      rank: d.rank,
      subordinates: d.subordinates,
      canChallengeAbove: d.canChallengeAbove,
    });
  }

  validate(data: unknown): data is DominanceRankComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('DominanceRankComponent data must be object');
    }
    const d = data as any;
    if (d.rank === undefined) {
      throw new Error('DominanceRankComponent missing required rank');
    }
    return true;
  }
}
