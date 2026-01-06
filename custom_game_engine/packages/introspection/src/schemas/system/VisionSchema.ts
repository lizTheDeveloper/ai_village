import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { VisionComponent } from '@ai-village/core';

/**
 * VisionSchema - Introspection schema for VisionComponent
 *
 * Vision and awareness system with tiered perception ranges.
 */
export const VisionSchema = autoRegister(
  defineComponent<VisionComponent>({
    type: 'vision',
    version: 1,
    category: 'system',

    fields: {
      range: {
        type: 'number',
        required: true,
        default: 50,
        range: [1, 500] as const,
        displayName: 'Vision Range',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vision',
          order: 1,
        },
        mutable: true,
      },

      closeRange: {
        type: 'number',
        required: true,
        default: 10,
        range: [1, 100] as const,
        displayName: 'Close Range',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vision',
          order: 2,
        },
        mutable: true,
      },

      distantRange: {
        type: 'number',
        required: true,
        default: 200,
        range: [1, 500] as const,
        displayName: 'Distant Range',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vision',
          order: 3,
        },
        mutable: true,
      },

      fieldOfView: {
        type: 'number',
        required: true,
        default: 360,
        range: [0, 360] as const,
        displayName: 'FOV',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vision',
          order: 4,
        },
        mutable: true,
      },

      seenAgents: {
        type: 'array',
        required: true,
        default: [],
        displayName: 'Seen Agents',
        visibility: {
          player: false,
          llm: true,  // LLM needs to know who's visible
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'seen',
          order: 5,
        },
      },

      seenResources: {
        type: 'array',
        required: true,
        default: [],
        displayName: 'Seen Resources',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'seen',
          order: 6,
        },
      },

      seenBuildings: {
        type: 'array',
        required: false,
        displayName: 'Seen Buildings',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'seen',
          order: 7,
        },
      },

      heardSpeech: {
        type: 'array',
        required: true,
        default: [],
        displayName: 'Heard Speech',
        visibility: {
          player: true,
          llm: true,  // Important for conversation context
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'perception',
          order: 8,
        },
      },
    },

    ui: {
      icon: '👁️',
      color: '#00BCD4',
      priority: 7,
    },

    llm: {
      promptSection: 'Perception',
      summarize: (data: VisionComponent) => {
        const parts: string[] = [];

        // Visible entities
        if (data.seenAgents.length > 0) {
          parts.push(`Sees ${data.seenAgents.length} agent(s)`);
        }
        if (data.seenResources.length > 0) {
          parts.push(`${data.seenResources.length} resource(s)`);
        }
        if (data.seenBuildings && data.seenBuildings.length > 0) {
          parts.push(`${data.seenBuildings.length} building(s)`);
        }

        // Heard speech
        if (data.heardSpeech.length > 0) {
          parts.push(`Heard ${data.heardSpeech.length} speech(es)`);
        }

        if (parts.length === 0) {
          return 'No entities or speech detected';
        }

        return parts.join(', ');
      },
      priority: 7,
    },

    validate: (data: unknown): data is VisionComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        comp.type === 'vision' &&
        typeof comp.range === 'number' &&
        typeof comp.closeRange === 'number' &&
        typeof comp.distantRange === 'number' &&
        typeof comp.fieldOfView === 'number' &&
        typeof comp.canSeeAgents === 'boolean' &&
        typeof comp.canSeeResources === 'boolean' &&
        Array.isArray(comp.seenAgents) &&
        Array.isArray(comp.seenResources) &&
        Array.isArray(comp.heardSpeech)
      );
    },

    createDefault: () => ({
      type: 'vision',
      version: 1,
      range: 50,
      closeRange: 10,
      distantRange: 200,
      fieldOfView: 360,
      canSeeAgents: true,
      canSeeResources: true,
      seenAgents: [],
      seenResources: [],
      seenPlants: [],
      seenBuildings: [],
      nearbyAgents: [],
      nearbyResources: [],
      distantLandmarks: [],
      heardSpeech: [],
    } as VisionComponent),
  })
);
