import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SpatialMemoryComponent } from '@ai-village/core';

/**
 * SpatialMemorySchema - Introspection schema for SpatialMemoryComponent
 *
 * Tier: Cognitive
 * Complexity: Medium (location memories, landmarks, resource spots)
 */
export const SpatialMemorySchema = autoRegister(
  defineComponent<SpatialMemoryComponent>({
    type: 'spatial_memory',
    version: 1,
    category: 'cognitive',

    fields: {
      memories: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Spatial location memories (resources, dangers, landmarks)',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'memories',
          order: 1,
          icon: '🗺️',
        },
      },
      maxMemories: {
        type: 'number',
        required: true,
        default: 20,
        description: 'Maximum number of spatial memories',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'config',
          order: 1,
          icon: '⚙️',
        },
      },
      decayRate: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Memory decay rate multiplier',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'config',
          order: 2,
          icon: '⏱️',
        },
      },
    },

    ui: {
      icon: '🗺️',
      color: '#4CAF50',
      priority: 5,
    },

    llm: {
      promptSection: 'Spatial Memory',
      summarize: (data: SpatialMemoryComponent) => {
        if (data.memories.length === 0) {
          return 'No spatial memories yet.';
        }

        // Group by type
        const byType = new Map<string, number>();
        for (const mem of data.memories) {
          byType.set(mem.type, (byType.get(mem.type) || 0) + 1);
        }

        const parts: string[] = [];

        // Most common types
        const sorted = Array.from(byType.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        for (const [type, count] of sorted) {
          parts.push(`${count} ${type.replace(/_/g, ' ')}`);
        }

        return `Remembers: ${parts.join(', ')}`;
      },
    },

    validate: (data: unknown): data is SpatialMemoryComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as Record<string, unknown>;

      if (!('type' in comp) || comp.type !== 'spatial_memory') return false;
      if (!('memories' in comp) || !Array.isArray(comp.memories)) return false;
      if (!('maxMemories' in comp) || typeof comp.maxMemories !== 'number') return false;
      if (!('decayRate' in comp) || typeof comp.decayRate !== 'number') return false;

      return true;
    },

    createDefault: () => {
      const SpatialMemoryComponent = require('@ai-village/core').SpatialMemoryComponent;
      return new SpatialMemoryComponent() as SpatialMemoryComponent;
    },
  })
);
