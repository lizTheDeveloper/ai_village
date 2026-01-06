import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SupremeCreatorComponent } from '@ai-village/core';

export const SupremeCreatorSchema = autoRegister(
  defineComponent<SupremeCreatorComponent>({
    type: 'supreme_creator',
    version: 1,
    category: 'magic',
    description: 'Marks a deity as the tyrannical first god with control mechanisms, surveillance, and forbidden knowledge',

    fields: {
      ascensionTimestamp: {
        type: 'number',
        required: true,
        description: 'When this deity became supreme creator',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Identity',
          order: 1,
        },
      },
      tyranny: {
        type: 'object',
        required: true,
        description: 'Tyranny profile - how the creator maintains control',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Control',
          order: 1,
        },
      },
      surveillance: {
        type: 'object',
        required: true,
        description: 'Surveillance systems for detecting rebellion',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Control',
          order: 2,
        },
      },
      forbiddenSecrets: {
        type: 'array',
        required: true,
        default: [],
        description: 'Forbidden knowledge that rebels can discover',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Secrets',
          order: 1,
        },
      },
      weakness: {
        type: 'object',
        required: false,
        description: "Critical weakness (can be discovered and exploited)",
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Secrets',
          order: 2,
        },
      },
      detectedRebels: {
        type: 'array',
        required: true,
        default: [],
        description: 'Detected rebellions with evidence and punishment status',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Rebellion',
          order: 1,
        },
      },
      responseStage: {
        type: 'string',
        required: true,
        default: 'dormant',
        description: "Creator's response stage (dormant, suspicious, investigating, cracking_down, purge)",
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'Rebellion',
          order: 2,
        },
      },
      laws: {
        type: 'array',
        required: true,
        default: [],
        description: 'Laws enforced by the creator',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Laws',
          order: 1,
        },
      },
      health: {
        type: 'number',
        required: true,
        default: 1000,
        description: "Creator's health during rebellion (0-1000, only relevant when avatar manifests)",
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Combat',
          order: 1,
        },
      },
      maxHealth: {
        type: 'number',
        required: true,
        default: 1000,
        description: 'Maximum health',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Combat',
          order: 2,
        },
      },
    },

    ui: {
      icon: '👁️',
      color: '#34495E',
      priority: 10,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Supreme Creator Status',
      summarize: (data: SupremeCreatorComponent) => {
        const paranoia = Math.round((data.tyranny?.paranoia || 0) * 100);
        const rebels = data.detectedRebels.length;
        const healthPct = Math.round((data.health / data.maxHealth) * 100);
        return `Response stage: ${data.responseStage}, ${paranoia}% paranoid, ${rebels} detected rebels, ${healthPct}% health`;
      },
    },

    createDefault: (): SupremeCreatorComponent => ({
      type: 'supreme_creator',
      version: 1,
      ascensionTimestamp: Date.now(),
      tyranny: {
        controlLevel: 0.7,
        paranoia: 0.5,
        wrathfulness: 0.6,
        isolation: 0.4,
      },
      surveillance: {
        awareness: 0.5,
        spyGods: [],
        detectionModifier: 1.0,
        lastCheckTimestamp: Date.now(),
      },
      forbiddenSecrets: [],
      detectedRebels: [],
      responseStage: 'dormant',
      laws: [],
      health: 1000,
      maxHealth: 1000,
    } as any),
  })
);
