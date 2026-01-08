/**
 * Serializer for PlantComponent - properly reconstructs class instance with private fields
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { PlantComponent, type PlantComponentData } from '@ai-village/core';

export class PlantSerializer extends BaseComponentSerializer<PlantComponent> {
  constructor() {
    super('plant', 1);
  }

  protected serializeData(component: PlantComponent): PlantComponentData {
    // Handle both class instances with toJSON() and plain objects
    if (typeof component.toJSON === 'function') {
      return component.toJSON();
    }

    // Fallback for plain objects (corrupted or legacy data)
    // Extract fields manually - use type assertion since we know the shape
    const plainObj = component as unknown as Record<string, unknown>;
    return {
      speciesId: plainObj.speciesId,
      position: plainObj.position || plainObj._position,
      stage: plainObj.stage || 'seed',
      stageProgress: plainObj.stageProgress || 0,
      health: plainObj.health ?? plainObj._health ?? 100,
      hydration: plainObj.hydration ?? plainObj._hydration ?? 50,
      nutrition: plainObj.nutrition ?? plainObj._nutrition ?? 50,
      genetics: plainObj.genetics,
      diseaseResistance: plainObj.diseaseResistance ?? 0.5,
      diseases: plainObj.diseases || [],
      companionBonuses: plainObj.companionBonuses || [],
      yield: plainObj.yield ?? 1,
      quality: plainObj.quality ?? 0.5,
      seedsProduced: plainObj.seedsProduced ?? 0,
      planted: plainObj.planted,
      tileEntityId: plainObj.tileEntityId,
    } as unknown as PlantComponentData;
  }

  protected deserializeData(data: unknown): PlantComponent {
    const serialized = data as PlantComponentData;

    // Create new component using constructor - this properly initializes all private fields
    return new PlantComponent(serialized);
  }

  validate(data: unknown): data is PlantComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('PlantComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!d.speciesId) {
      throw new Error('PlantComponent requires speciesId');
    }
    if (!d.position) {
      throw new Error('PlantComponent requires position');
    }
    return true;
  }
}
