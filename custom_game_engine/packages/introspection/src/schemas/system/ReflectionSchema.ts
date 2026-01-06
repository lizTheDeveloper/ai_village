import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { ReflectionComponent } from '@ai-village/core';

/**
 * ReflectionSchema - Introspection schema for ReflectionComponent
 *
 * Batch 5: Soul & Realms (Meta/Consciousness)
 * Category: System/Cognitive
 */
export const ReflectionSchema = autoRegister(
  defineComponent<ReflectionComponent>({
    type: 'reflection',
    version: 1,
    category: 'system',

    fields: {
      isReflecting: {
        type: 'boolean',
        required: true,
        default: false,
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 1,
        },
      },

      reflectionType: {
        type: 'string',
        required: false,
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'state',
          order: 2,
        },
      },
    },

    ui: {
      icon: '💭',
      color: '#9370DB',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Reflection',
      summarize: (data: ReflectionComponent) => {
        if (!data.isReflecting) return 'Not currently reflecting';
        const type = data.reflectionType ?? 'unknown';
        const count = data.reflections.length;
        return `Reflecting (${type}), ${count} total reflections`;
      },
    },

    createDefault: (): ReflectionComponent => {
      const reflection = new (ReflectionComponent as any)();
      return reflection;
    },
  })
);
