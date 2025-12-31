/**
 * Serializer for InjuryComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { InjuryComponent } from '../../components/InjuryComponent.js';
import { createInjuryComponent } from '../../components/InjuryComponent.js';

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
    const d = data as any;
    return createInjuryComponent({
      injuryType: d.injuryType,
      severity: d.severity,
      location: d.location,
      skillPenalties: d.skillPenalties,
      movementPenalty: d.movementPenalty,
      healingTime: d.healingTime,
      elapsed: d.elapsed,
      requiresTreatment: d.requiresTreatment,
      treated: d.treated,
      untreatedDuration: d.untreatedDuration,
      injuries: d.injuries,
    });
  }

  validate(data: unknown): data is InjuryComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('InjuryComponent data must be object');
    }
    const d = data as any;
    if (!d.injuryType || !d.severity || !d.location) {
      throw new Error('InjuryComponent missing required fields');
    }
    return true;
  }
}
