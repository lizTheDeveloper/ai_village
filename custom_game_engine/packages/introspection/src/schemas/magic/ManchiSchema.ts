import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { ManchiComponent } from '@ai-village/core';

export const ManchiSchema = autoRegister(
  defineComponent<ManchiComponent>({
    type: 'manchi',
    version: 1,
    category: 'magic',
    description: "Man'chi loyalty system - strong loyalty bonds to lords for certain species",

    fields: {
      lordId: {
        type: 'string',
        required: true,
        description: 'Lord this entity is loyal to',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Loyalty',
          order: 1,
        },
      },
      loyaltyStrength: {
        type: 'number',
        required: true,
        description: 'Strength of loyalty (0-1)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Loyalty',
          order: 2,
        },
      },
      canSurrender: {
        type: 'boolean',
        required: false,
        default: false,
        description: "Whether this entity can surrender (restricted by man'chi)",
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Combat',
          order: 1,
        },
      },
    },

    ui: {
      icon: '⚔️',
      color: '#C0392B',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Loyalty Bonds',
      summarize: (data: ManchiComponent) => {
        const strength = Math.round(data.loyaltyStrength * 100);
        const surrender = data.canSurrender ? 'can surrender' : 'cannot surrender';
        return `Loyal to lord ${data.lordId} (${strength}% strength, ${surrender})`;
      },
    },

    createDefault: (): ManchiComponent => ({
      type: 'manchi',
      version: 1,
      lordId: '',
      loyaltyStrength: 0.8,
      canSurrender: false,
    }),
  })
);
