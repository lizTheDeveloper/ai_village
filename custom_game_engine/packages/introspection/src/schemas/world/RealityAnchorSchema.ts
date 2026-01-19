import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { RealityAnchorComponent } from '@ai-village/core';
import { ComponentType } from '@ai-village/core';

/**
 * RealityAnchorSchema - Introspection schema for RealityAnchorComponent
 *
 * Batch 5: Soul & Realms
 * Category: World/Tech
 */
export const RealityAnchorSchema = autoRegister(
  defineComponent<RealityAnchorComponent>({
    type: 'reality_anchor',
    version: 1,
    category: 'world',

    fields: {
      status: {
        type: 'string',
        required: true,
        default: 'under_construction',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'state',
          order: 1,
        },
      },

      fieldRadius: {
        type: 'number',
        required: true,
        default: 100,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'field',
          order: 2,
        },
      },

      powerLevel: {
        type: 'number',
        required: true,
        default: 0,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'power',
          order: 3,
        },
      },

      powerConsumptionPerTick: {
        type: 'number',
        required: true,
        default: 50,
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'power',
          order: 4,
        },
      },

      researchProgress: {
        type: 'number',
        required: true,
        default: 0,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'construction',
          order: 5,
        },
      },

      alienFragmentsUsed: {
        type: 'number',
        required: true,
        default: 0,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'construction',
          order: 6,
        },
      },

      alienFragmentsRequired: {
        type: 'number',
        required: true,
        default: 10,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'construction',
          order: 7,
        },
      },

      stabilizationQuality: {
        type: 'number',
        required: true,
        default: 0.8,
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'field',
          order: 8,
        },
      },

      isOverloading: {
        type: 'boolean',
        required: true,
        default: false,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 9,
        },
      },
    },

    ui: {
      icon: '⚛️',
      color: '#00BFFF',
      priority: 10,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Reality Anchor',
      summarize: (data: RealityAnchorComponent) => {
        const status = data.status;
        const power = (data.powerLevel * 100).toFixed(0);
        const fragments = `${data.alienFragmentsUsed}/${data.alienFragmentsRequired}`;
        const overload = data.isOverloading ? ' [OVERLOADING]' : '';
        return `Reality Anchor: ${status}, Power: ${power}%, Fragments: ${fragments}${overload}`;
      },
    },

    createDefault: (): RealityAnchorComponent => ({
      type: ComponentType.RealityAnchor,
      version: 1,
      status: 'under_construction',
      fieldRadius: 100,
      powerLevel: 0,
      powerConsumptionPerTick: 50,
      constructedAt: 0,
      totalActiveTime: 0,
      researchProgress: 0,
      alienFragmentsUsed: 0,
      alienFragmentsRequired: 10,
      stabilizationQuality: 0.8,
      isOverloading: false,
      entitiesInField: new Set(),
      mortalizedGods: new Set(),
    }),
  })
);
