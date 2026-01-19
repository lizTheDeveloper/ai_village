/**
 * Serializer for CastingStateComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { CastingStateComponent } from '@ai-village/core';
import { createCastingStateComponent } from '@ai-village/core';

export class CastingStateSerializer extends BaseComponentSerializer<CastingStateComponent> {
  constructor() {
    super('casting_state', 1);
  }

  protected serializeData(component: CastingStateComponent): Record<string, unknown> {
    return {
      casting: component.casting,
      currentSpellId: component.currentSpellId,
      castProgress: component.castProgress,
      castingState: component.castingState,
    };
  }

  protected deserializeData(data: unknown): CastingStateComponent {
    const d = data as Record<string, unknown>;
    const comp = createCastingStateComponent();
    comp.casting = d.casting as boolean || false;
    comp.currentSpellId = d.currentSpellId as string | undefined;
    comp.castProgress = d.castProgress as number | undefined;
    comp.castingState = d.castingState as any;
    return comp;
  }

  validate(data: unknown): data is CastingStateComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('CastingStateComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.casting !== 'boolean') {
      throw new Error('CastingStateComponent missing required casting boolean');
    }
    return true;
  }
}
