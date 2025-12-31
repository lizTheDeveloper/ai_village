/**
 * Serializer for ManchiComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { ManchiComponent } from '../../components/ManchiComponent.js';
import { createManchiComponent } from '../../components/ManchiComponent.js';

export class ManchiSerializer extends BaseComponentSerializer<ManchiComponent> {
  constructor() {
    super('manchi', 1);
  }

  protected serializeData(component: ManchiComponent): Record<string, unknown> {
    return {
      lordId: component.lordId,
      loyaltyStrength: component.loyaltyStrength,
      canSurrender: component.canSurrender,
    };
  }

  protected deserializeData(data: unknown): ManchiComponent {
    const d = data as any;
    return createManchiComponent({
      lordId: d.lordId,
      loyaltyStrength: d.loyaltyStrength,
      canSurrender: d.canSurrender,
    });
  }

  validate(data: unknown): data is ManchiComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('ManchiComponent data must be object');
    }
    const d = data as any;
    if (!d.lordId || d.loyaltyStrength === undefined) {
      throw new Error('ManchiComponent missing required fields');
    }
    return true;
  }
}
