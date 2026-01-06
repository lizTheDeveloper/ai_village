/**
 * EquipmentSerializer - Serializes EquipmentComponent with ItemInstance handling
 */

import type { EquipmentComponent } from '@ai-village/core';
import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';

/**
 * Serializer for EquipmentComponent.
 * Uses generic JSON serialization since ItemInstance is already serializable.
 */
export class EquipmentSerializer extends BaseComponentSerializer<EquipmentComponent> {
  constructor() {
    super('equipment', 1);
  }

  protected serializeData(component: EquipmentComponent): unknown {
    const { type, ...data } = component;
    return data;
  }

  protected deserializeData(data: unknown): EquipmentComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid EquipmentComponent data');
    }

    return {
      type: 'equipment',
      version: 1,
      ...(data as Record<string, unknown>),
    } as EquipmentComponent;
  }

  validate(data: unknown): data is EquipmentComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('EquipmentComponent data must be object');
    }

    const component = data as Partial<EquipmentComponent>;

    if (!component.equipped || typeof component.equipped !== 'object') {
      throw new Error('EquipmentComponent must have equipped object');
    }

    if (!component.weapons || typeof component.weapons !== 'object') {
      throw new Error('EquipmentComponent must have weapons object');
    }

    return true;
  }
}
