import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { MemoryComponent } from '@ai-village/core';

/**
 * MemorySchema - Introspection schema for MemoryComponent
 *
 * Tier 5: Cognitive components
 * Complexity: Large (nested Memory objects, multiple types)
 */
export const MemorySchema = autoRegister(
  defineComponent<MemoryComponent>({
    type: 'memory',
    version: 1,
    category: 'cognitive',

    fields: {
      memories: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Array of memory objects (episodic, semantic, procedural, etc.)',
        visibility: {
          player: false,  // Too detailed for player UI
          llm: 'summarized',  // Summarize for LLM
          agent: true,  // Agents should know their memories
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',  // Complex structure, read-only
          group: 'memories',
          order: 1,
        },
      },

      lastReflectionTime: {
        type: 'number',
        required: false,
        description: 'Game tick when agent last reflected on memories',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 2,
        },
      },
    },

    ui: {
      icon: '🧠',
      color: '#9C27B0',
      priority: 5,
    },

    llm: {
      promptSection: 'Memory',
      summarize: (data: MemoryComponent) => {
        const memCount = data.memories.length;
        if (memCount === 0) return 'No memories yet.';

        // Summarize by type
        const byType: Record<string, number> = {};
        data.memories.forEach(m => {
          byType[m.type] = (byType[m.type] || 0) + 1;
        });

        const summary = Object.entries(byType)
          .map(([type, count]) => `${count} ${type}`)
          .join(', ');

        // Show most important recent memories
        const recent = data.memories
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 3)
          .map(m => `"${m.content}" (${m.type})`)
          .join('; ');

        return `${memCount} memories (${summary}). Recent: ${recent}`;
      },
    },

    validate: (data: unknown): data is MemoryComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return Array.isArray(comp.memories);
    },

    createDefault: () => ({
      type: 'memory',
      version: 1,
      memories: [],
      entityId: '',
      addMemory: () => {},
      getMemoriesByType: () => [],
      getRecentMemories: () => [],
      getMemoriesByImportance: () => [],
    } as MemoryComponent),
  })
);
