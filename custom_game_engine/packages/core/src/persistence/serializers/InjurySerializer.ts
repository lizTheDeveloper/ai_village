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
    if (typeof data !== 'object' || data === null) {
      throw new Error('InjuryComponent data must be object');
    }

    const d = data as Record<string, unknown>;

    if (typeof d.injuryType !== 'string') {
      throw new Error('InjuryComponent.injuryType must be string');
    }
    if (typeof d.severity !== 'string') {
      throw new Error('InjuryComponent.severity must be string');
    }
    if (typeof d.location !== 'string') {
      throw new Error('InjuryComponent.location must be string');
    }

    return createInjuryComponent({
      injuryType: d.injuryType as InjuryComponent['injuryType'],
      severity: d.severity as InjuryComponent['severity'],
      location: d.location as InjuryComponent['location'],
      skillPenalties: d.skillPenalties as Record<string, number> | undefined,
      movementPenalty: typeof d.movementPenalty === 'number' ? d.movementPenalty : undefined,
      healingTime: typeof d.healingTime === 'number' ? d.healingTime : undefined,
      elapsed: typeof d.elapsed === 'number' ? d.elapsed : undefined,
      requiresTreatment: typeof d.requiresTreatment === 'boolean' ? d.requiresTreatment : undefined,
      treated: typeof d.treated === 'boolean' ? d.treated : undefined,
      untreatedDuration: typeof d.untreatedDuration === 'number' ? d.untreatedDuration : undefined,
      injuries: Array.isArray(d.injuries) ? d.injuries as InjuryComponent['injuries'] : undefined,
    });
  }

  validate(data: unknown): data is InjuryComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('InjuryComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.injuryType !== 'string' || typeof d.severity !== 'string' || typeof d.location !== 'string') {
      throw new Error('InjuryComponent missing required fields');
    }
    return true;
  }
}
