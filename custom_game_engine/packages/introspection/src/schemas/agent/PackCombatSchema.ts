import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { PackCombatComponent } from '@ai-village/core';

export const PackCombatSchema = autoRegister(
  defineComponent<PackCombatComponent>({
    type: 'pack_combat',
    version: 1,
    category: 'agent',
    description: 'Pack mind combat coordination for species that fight as a single mind across multiple bodies',

    fields: {
      packId: {
        type: 'string',
        required: true,
        description: 'Pack identifier',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Pack',
          order: 1,
        },
      },
      bodiesInPack: {
        type: 'array',
        required: true,
        default: [],
        description: 'Bodies in the pack',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Pack',
          order: 2,
        },
      },
      coherence: {
        type: 'number',
        required: true,
        description: 'Coherence level (0-1, drops as bodies are lost)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Status',
          order: 1,
        },
      },
      coordinationBonus: {
        type: 'number',
        required: false,
        default: 0,
        description: 'Coordination bonus for combat',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Combat',
          order: 1,
        },
      },
      dissolved: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Whether pack has dissolved',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Status',
          order: 2,
        },
      },
    },

    ui: {
      icon: '🐺',
      color: '#95A5A6',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Pack Combat',
      summarize: (data: PackCombatComponent) => {
        const bodyCount = data.bodiesInPack.length;
        const coherencePct = Math.round(data.coherence * 100);
        const status = data.dissolved ? 'dissolved' : 'active';
        return `Pack ${data.packId}: ${bodyCount} bodies, ${coherencePct}% coherence, ${status}`;
      },
    },

    createDefault: (): PackCombatComponent => ({
      type: 'pack_combat',
      version: 1,
      packId: crypto.randomUUID(),
      bodiesInPack: [],
      coherence: 1.0,
      coordinationBonus: 0,
      dissolved: false,
    }),
  })
);
