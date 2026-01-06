/**
 * Species Component Schema
 *
 * Defines entity species and body plan
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SpeciesComponent } from '@ai-village/core';

/**
 * Species component schema
 */
export const SpeciesSchema = autoRegister(
  defineComponent<SpeciesComponent>({
    type: 'species',
    version: 1,
    category: 'physical',
    description: 'Entity species identity and body plan',

    fields: {
      speciesId: {
        type: 'string',
        required: true,
        description: 'Species identifier (human, elf, insectoid, etc.)',
        displayName: 'Species ID',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 1,
          icon: '🧬',
        },
        mutable: false,
      },

      speciesName: {
        type: 'string',
        required: true,
        description: 'Species name',
        displayName: 'Species Name',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 2,
        },
        mutable: false,
      },

      commonName: {
        type: 'string',
        required: false,
        description: 'Common display name',
        displayName: 'Common Name',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 3,
        },
        mutable: false,
      },

      bodyPlanId: {
        type: 'string',
        required: true,
        description: 'Body plan reference',
        displayName: 'Body Plan',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'biology',
          order: 10,
        },
        mutable: false,
      },

      isHybrid: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether this is a hybrid species',
        displayName: 'Hybrid',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'genetics',
          order: 20,
          icon: '🧬',
        },
        mutable: false,
      },

      hybridGeneration: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        description: 'Hybrid generation (0 = pure, 1+ = hybrid)',
        displayName: 'Generation',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'genetics',
          order: 21,
        },
        mutable: false,
      },

      hasMutation: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether entity has mutations',
        displayName: 'Has Mutations',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'genetics',
          order: 22,
        },
        mutable: true,
      },

      lifespan: {
        type: 'number',
        required: true,
        default: 70,
        range: [0, 10000] as const,
        description: 'Expected lifespan in game years',
        displayName: 'Lifespan',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'biology',
          order: 30,
          icon: '⏳',
        },
        mutable: false,
      },

      lifespanType: {
        type: 'enum',
        enumValues: ['mortal', 'long_lived', 'ageless', 'immortal'] as const,
        required: true,
        default: 'mortal',
        description: 'Lifespan category',
        displayName: 'Lifespan Type',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'biology',
          order: 31,
        },
        mutable: false,
      },

      averageHeight: {
        type: 'number',
        required: true,
        default: 170,
        range: [0, 1000] as const,
        description: 'Average height in cm',
        displayName: 'Height',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'physical',
          order: 40,
          icon: '📏',
        },
        mutable: false,
      },

      averageWeight: {
        type: 'number',
        required: true,
        default: 70,
        range: [0, 10000] as const,
        description: 'Average weight in kg',
        displayName: 'Weight',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'physical',
          order: 41,
          icon: '⚖️',
        },
        mutable: false,
      },

      sizeCategory: {
        type: 'enum',
        enumValues: ['tiny', 'small', 'medium', 'large', 'huge', 'colossal'] as const,
        required: true,
        default: 'medium',
        description: 'Size category',
        displayName: 'Size',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'physical',
          order: 42,
        },
        mutable: false,
      },

      sapient: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Intelligent/self-aware',
        displayName: 'Sapient',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'cognition',
          order: 50,
          icon: '🧠',
        },
        mutable: false,
      },

      canReproduce: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Can reproduce',
        displayName: 'Can Reproduce',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'reproduction',
          order: 60,
        },
        mutable: false,
      },

      maturityAge: {
        type: 'number',
        required: true,
        default: 18,
        range: [0, 1000] as const,
        description: 'Age when can reproduce (years)',
        displayName: 'Maturity Age',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'reproduction',
          order: 61,
        },
        mutable: false,
      },
    },

    ui: {
      icon: '🧬',
      color: '#9C27B0',
      priority: 2,
    },

    llm: {
      promptSection: 'biology',
      summarize: (data: SpeciesComponent) => {
        const name = data.commonName || data.speciesName;
        const hybrid = data.isHybrid ? ' (hybrid)' : '';
        const mutations = data.hasMutation ? ' [mutated]' : '';
        return `${name}${hybrid}${mutations} - ${data.sizeCategory} ${data.lifespanType}`;
      },
      priority: 3,
    },

    createDefault: (): SpeciesComponent => {
      const SpeciesComponentClass = require('@ai-village/core').SpeciesComponent;
      return new SpeciesComponentClass('human', 'Human', 'humanoid_bipedal');
    },
  })
);
