/**
 * Serializer for SpatialMemoryComponent - properly reconstructs class instance
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { SpatialMemoryComponent, type SpatialMemory, type ResourceLocationMemory } from '../../components/SpatialMemoryComponent.js';

interface SerializedSpatialMemory {
  memories: SpatialMemory[];
  resourceMemories: ResourceLocationMemory[];
  maxMemories: number;
  decayRate: number;
  memoryCounter: number;
}

export class SpatialMemorySerializer extends BaseComponentSerializer<SpatialMemoryComponent> {
  constructor() {
    super('spatial_memory', 1);
  }

  protected serializeData(component: SpatialMemoryComponent): SerializedSpatialMemory {
    const componentAny = component as unknown as {
      _resourceMemories: ResourceLocationMemory[];
      _memoryCounter: number;
    };

    return {
      memories: [...component.memories],
      resourceMemories: [...componentAny._resourceMemories],
      maxMemories: component.maxMemories,
      decayRate: component.decayRate,
      memoryCounter: componentAny._memoryCounter,
    };
  }

  protected deserializeData(data: unknown): SpatialMemoryComponent {
    const serialized = data as SerializedSpatialMemory;

    // Create new component
    const component = new SpatialMemoryComponent({
      maxMemories: serialized.maxMemories,
      decayRate: serialized.decayRate,
    });

    // Access private fields
    const componentAny = component as unknown as {
      _resourceMemories: ResourceLocationMemory[];
      _memoryCounter: number;
    };

    // Restore memories
    if (serialized.memories && Array.isArray(serialized.memories)) {
      component.memories = [...serialized.memories];
    }

    // Restore resource memories
    if (serialized.resourceMemories && Array.isArray(serialized.resourceMemories)) {
      componentAny._resourceMemories = [...serialized.resourceMemories];
    }

    // Restore counter
    if (serialized.memoryCounter !== undefined) {
      componentAny._memoryCounter = serialized.memoryCounter;
    }

    return component;
  }

  validate(data: unknown): data is SpatialMemoryComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('SpatialMemoryComponent data must be object');
    }
    return true;
  }
}
