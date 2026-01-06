/**
 * Spirit Component Schema
 *
 * Animist spirits (kami, nature spirits, ancestors)
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SpiritComponent } from '@ai-village/core';

/**
 * Spirit component schema
 */
export const SpiritSchema = autoRegister(
  defineComponent<SpiritComponent>({
    type: 'spirit',
    version: 1,
    category: 'cognitive',
    description: 'Animist spirit entity (kami, nature spirit, ancestor)',

    fields: {
      category: {
        type: 'enum',
        enumValues: [
          'place_spirit',
          'object_spirit',
          'ancestor_spirit',
          'phenomenon_spirit',
          'concept_spirit',
        ] as const,
        required: true,
        description: 'Spirit category',
        displayName: 'Category',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'identity',
          order: 1,
          icon: '👻',
        },
        mutable: false,
      },

      magnitude: {
        type: 'enum',
        enumValues: ['minor', 'lesser', 'greater', 'major', 'divine'] as const,
        required: true,
        description: 'Spirit power level',
        displayName: 'Magnitude',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'identity',
          order: 2,
        },
        mutable: true,
      },

      mobile: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Can spirit move from dwelling',
        displayName: 'Mobile',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'dwelling',
          order: 10,
        },
        mutable: false,
      },

      totalRespect: {
        type: 'number',
        required: true,
        default: 0,
        range: [-1000, 1000] as const,
        description: 'Accumulated respect (main power currency)',
        displayName: 'Respect',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'power',
          order: 20,
          icon: '🙇',
        },
        mutable: true,
      },

      isActive: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Is spirit currently active/awake',
        displayName: 'Active',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 30,
        },
        mutable: true,
      },

      isDormant: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is spirit dormant (long neglected)',
        displayName: 'Dormant',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 31,
        },
        mutable: true,
      },

      isAngered: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is spirit angry',
        displayName: 'Angered',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 32,
          icon: '😠',
        },
        mutable: true,
      },

      isFading: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is spirit fading from memory',
        displayName: 'Fading',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 33,
        },
        mutable: true,
      },

      emergedAt: {
        type: 'number',
        required: true,
        default: 0,
        description: 'When spirit came into being',
        displayName: 'Emerged At',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'history',
          order: 40,
        },
        mutable: false,
      },

      origin: {
        type: 'enum',
        enumValues: [
          'primordial',
          'natural_formation',
          'mortal_death',
          'object_aging',
          'collective_belief',
          'divine_creation',
          'spirit_offspring',
          'event_echo',
        ] as const,
        required: true,
        default: 'natural_formation',
        description: 'How spirit came to exist',
        displayName: 'Origin',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'history',
          order: 41,
        },
        mutable: false,
      },
    },

    ui: {
      icon: '👻',
      color: '#E1BEE7',
      priority: 7,
    },

    llm: {
      promptSection: 'spirits',
      summarize: (data: SpiritComponent) => {
        const state = data.isAngered
          ? 'ANGRY'
          : data.isDormant
          ? 'dormant'
          : data.isFading
          ? 'fading'
          : data.isActive
          ? 'active'
          : 'inactive';
        const respect = data.totalRespect > 0 ? `+${data.totalRespect}` : data.totalRespect.toString();
        return `${data.magnitude} ${data.category} (${state}) respect:${respect}`;
      },
      priority: 8,
    },

    createDefault: (): SpiritComponent => {
      const SpiritComponentClass = require('@ai-village/core').SpiritComponent;
      return new SpiritComponentClass('Unnamed Spirit', 'place_spirit', 'minor');
    },
  })
);
