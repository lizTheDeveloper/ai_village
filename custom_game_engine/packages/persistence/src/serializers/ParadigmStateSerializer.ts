/**
 * Serializer for ParadigmStateComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { ParadigmStateComponent } from '@ai-village/core';
import { createParadigmStateComponent } from '@ai-village/core';

export class ParadigmStateSerializer extends BaseComponentSerializer<ParadigmStateComponent> {
  constructor() {
    super('paradigm_state', 1);
  }

  protected serializeData(component: ParadigmStateComponent): Record<string, unknown> {
    return {
      homeParadigmId: component.homeParadigmId,
      activeParadigmId: component.activeParadigmId,
      adaptations: component.adaptations,
      paradigmState: component.paradigmState,
      corruption: component.corruption,
      attentionLevel: component.attentionLevel,
      favorLevel: component.favorLevel,
      addictionLevel: component.addictionLevel,
    };
  }

  protected deserializeData(data: unknown): ParadigmStateComponent {
    const d = data as Record<string, unknown>;
    const comp = createParadigmStateComponent();
    comp.homeParadigmId = d.homeParadigmId as string | undefined;
    comp.activeParadigmId = d.activeParadigmId as string | undefined;
    comp.adaptations = d.adaptations as any[] | undefined;
    comp.paradigmState = d.paradigmState as any || {};
    comp.corruption = d.corruption as number | undefined;
    comp.attentionLevel = d.attentionLevel as number | undefined;
    comp.favorLevel = d.favorLevel as number | undefined;
    comp.addictionLevel = d.addictionLevel as number | undefined;
    return comp;
  }

  validate(data: unknown): data is ParadigmStateComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('ParadigmStateComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.paradigmState !== 'object' || d.paradigmState === null) {
      throw new Error('ParadigmStateComponent missing required paradigmState object');
    }
    return true;
  }
}
