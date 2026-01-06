/**
 * Serializer for EpisodicMemoryComponent - properly reconstructs class instance
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { EpisodicMemoryComponent, type EpisodicMemory } from '@ai-village/core';

interface SerializedEpisodicMemory {
  maxMemories: number;
  memories: EpisodicMemory[];
}

export class EpisodicMemorySerializer extends BaseComponentSerializer<EpisodicMemoryComponent> {
  constructor() {
    super('episodic_memory', 1);
  }

  protected serializeData(component: EpisodicMemoryComponent): SerializedEpisodicMemory {
    return {
      maxMemories: (component as unknown as { _maxMemories: number })._maxMemories ?? 1000,
      memories: [...component.episodicMemories],
    };
  }

  protected deserializeData(data: unknown): EpisodicMemoryComponent {
    const serialized = data as SerializedEpisodicMemory;

    // Create new component instance
    const component = new EpisodicMemoryComponent({
      maxMemories: serialized.maxMemories,
    });

    // Restore memories by accessing private field
    const componentAny = component as unknown as { _episodicMemories: EpisodicMemory[] };
    componentAny._episodicMemories = serialized.memories ?? [];

    return component;
  }

  validate(data: unknown): data is EpisodicMemoryComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('EpisodicMemoryComponent data must be object');
    }
    return true;
  }
}
