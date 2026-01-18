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
    if (typeof data !== 'object' || data === null) {
      throw new Error('ManchiComponent data must be object');
    }

    const d = data as Record<string, unknown>;

    if (typeof d.lordId !== 'string') {
      throw new Error('ManchiComponent.lordId must be string');
    }
    if (typeof d.loyaltyStrength !== 'number') {
      throw new Error('ManchiComponent.loyaltyStrength must be number');
    }

    return createManchiComponent({
      lordId: d.lordId,
      loyaltyStrength: d.loyaltyStrength,
      canSurrender: typeof d.canSurrender === 'boolean' ? d.canSurrender : undefined,
    });
  }

  validate(data: unknown): data is ManchiComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('ManchiComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.lordId !== 'string' || typeof d.loyaltyStrength !== 'number') {
      throw new Error('ManchiComponent missing required fields');
    }
    return true;
  }
}
