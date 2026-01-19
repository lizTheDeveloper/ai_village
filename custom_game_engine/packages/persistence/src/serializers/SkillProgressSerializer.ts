/**
 * Serializer for SkillProgressComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { SkillProgressComponent } from '@ai-village/core';
import { createSkillProgressComponent } from '@ai-village/core';

export class SkillProgressSerializer extends BaseComponentSerializer<SkillProgressComponent> {
  constructor() {
    super('skill_progress', 1);
  }

  protected serializeData(component: SkillProgressComponent): Record<string, unknown> {
    return {
      skillTreeState: component.skillTreeState,
    };
  }

  protected deserializeData(data: unknown): SkillProgressComponent {
    const d = data as Record<string, unknown>;
    const comp = createSkillProgressComponent();
    comp.skillTreeState = d.skillTreeState as any || {};
    return comp;
  }

  validate(data: unknown): data is SkillProgressComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('SkillProgressComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.skillTreeState !== 'object' || d.skillTreeState === null) {
      throw new Error('SkillProgressComponent missing required skillTreeState object');
    }
    return true;
  }
}
