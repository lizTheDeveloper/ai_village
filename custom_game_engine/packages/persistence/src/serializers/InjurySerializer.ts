/**
 * Serializer for InjuryComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { InjuryComponent } from '@ai-village/core';
import { createInjuryComponent } from '@ai-village/core';

export class InjurySerializer extends BaseComponentSerializer<InjuryComponent> {
  constructor() {
    super('injury', 1);
  }

  protected serializeData(component: InjuryComponent): Record<string, unknown> {
    return {
      injuryType: component.injuryType,
      severity: component.severity,
      location: component.location,
      skillPenalties: component.skillPenalties,
      movementPenalty: component.movementPenalty,
      healingTime: component.healingTime,
      elapsed: component.elapsed,
      requiresTreatment: component.requiresTreatment,
      treated: component.treated,
      untreatedDuration: component.untreatedDuration,
      injuries: component.injuries,
    };
  }

  protected deserializeData(data: unknown): InjuryComponent {
    const d = data as Record<string, unknown>;
    return createInjuryComponent({
      injuryType: d.injuryType as string,
      severity: d.severity as number,
      location: d.location as string,
      skillPenalties: d.skillPenalties as Record<string, number> | undefined,
      movementPenalty: d.movementPenalty as number | undefined,
      healingTime: d.healingTime as number | undefined,
      elapsed: d.elapsed as number | undefined,
      requiresTreatment: d.requiresTreatment as boolean | undefined,
      treated: d.treated as boolean | undefined,
      untreatedDuration: d.untreatedDuration as number | undefined,
      injuries: d.injuries as Array<{ type: string; severity: number; location: string }> | undefined,
    });
  }

  validate(data: unknown): data is InjuryComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('InjuryComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!d.injuryType || !d.severity || !d.location) {
      throw new Error('InjuryComponent missing required fields');
    }
    return true;
  }
}
