import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { AfterlifeMemoryComponent } from '@ai-village/core';

/**
 * AfterlifeMemorySchema - Introspection schema for AfterlifeMemoryComponent
 *
 * Tier 9: Afterlife/Spiritual
 * Batch 5: Soul & Realms
 * Category: Cognitive/Afterlife
 */
export const AfterlifeMemorySchema = autoRegister(
  defineComponent<AfterlifeMemoryComponent>({
    type: 'afterlife_memory',
    version: 1,
    category: 'afterlife',

    fields: {
      afterlifeMemoryIds: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Memory IDs from previous afterlife experience',
        visibility: {
          player: false,
          llm: false,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'memories',
          order: 1,
        },
      },

      retainsIntoAdulthood: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Rare 1% who retain fragments into adulthood',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'retention',
          order: 2,
        },
      },

      clarityMultiplier: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Memory clarity (0-1, decreases over time)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'fading',
          order: 3,
        },
      },

      fadingStartAge: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Age when fading started',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'fading',
          order: 4,
        },
      },

      completeFadingAge: {
        type: 'number',
        required: true,
        default: 10,
        description: 'Age threshold for complete fading',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'fading',
          order: 5,
        },
      },

      fadingComplete: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'All afterlife memories erased',
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
          order: 6,
        },
      },
    },

    ui: {
      icon: '🌫️',
      color: '#C0C0C0',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Afterlife Memories',
      summarize: (data: AfterlifeMemoryComponent) => {
        if (data.fadingComplete) return 'Afterlife memories completely faded';
        const clarity = (data.clarityMultiplier * 100).toFixed(0);
        const count = (data.afterlifeMemoryIds as Set<string>).size;
        const rare = data.retainsIntoAdulthood ? ' [rare retention]' : '';
        return `${count} afterlife memories at ${clarity}% clarity${rare}`;
      },
    },

    validate: (data): data is AfterlifeMemoryComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const a = data as any;

      return (
        a.type === 'afterlife_memory' &&
        (a.afterlifeMemoryIds instanceof Set || Array.isArray(a.afterlifeMemoryIds)) &&
        typeof a.retainsIntoAdulthood === 'boolean' &&
        typeof a.clarityMultiplier === 'number' &&
        typeof a.fadingStartAge === 'number' &&
        typeof a.completeFadingAge === 'number' &&
        typeof a.fadingComplete === 'boolean'
      );
    },

    createDefault: (): AfterlifeMemoryComponent => ({
      type: 'afterlife_memory',
      version: 1,
      afterlifeMemoryIds: new Set(),
      retainsIntoAdulthood: false,
      clarityMultiplier: 1.0,
      fadingStartAge: 0,
      completeFadingAge: 10,
      fadingComplete: false,
    }),
  })
);
