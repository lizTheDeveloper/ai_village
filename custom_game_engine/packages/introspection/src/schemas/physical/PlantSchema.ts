/**
 * Plant Component Schema
 *
 * Living plant entities with full lifecycle tracking
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { PlantComponent } from '@ai-village/core';

/**
 * Plant component schema
 */
export const PlantSchema = autoRegister(
  defineComponent<PlantComponent>({
    type: 'plant',
    version: 1,
    category: 'physical',
    description: 'Living plant entity with full lifecycle tracking',

    fields: {
      speciesId: {
        type: 'string',
        required: true,
        description: 'Plant species identifier',
        displayName: 'Species',
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
          icon: '🌱',
        },
        mutable: false,
      },

      stage: {
        type: 'enum',
        enumValues: [
          'seed',
          'germinating',
          'sprout',
          'vegetative',
          'flowering',
          'fruiting',
          'mature',
          'seeding',
          'senescence',
          'decay',
          'dead',
        ] as const,
        required: true,
        default: 'seed',
        description: 'Current lifecycle stage',
        displayName: 'Stage',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'lifecycle',
          order: 10,
          icon: '🌿',
        },
        mutable: true,
      },

      age: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 10000] as const,
        description: 'Age in ticks',
        displayName: 'Age',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'lifecycle',
          order: 11,
        },
        mutable: true,
      },

      generation: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000] as const,
        description: 'Generation number (0 = wild, 1+ = cultivated)',
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
          group: 'lifecycle',
          order: 12,
        },
        mutable: false,
      },

      health: {
        type: 'number',
        required: true,
        default: 85,
        range: [0, 100] as const,
        description: 'Overall health (0 = dead, 100 = perfect)',
        displayName: 'Health',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vitals',
          order: 20,
          icon: '❤️',
        },
        mutable: true,
      },

      hydration: {
        type: 'number',
        required: true,
        default: 50,
        range: [0, 100] as const,
        description: 'Hydration level (0 = wilted, 100 = hydrated)',
        displayName: 'Hydration',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vitals',
          order: 21,
          icon: '💧',
        },
        mutable: true,
      },

      nutrition: {
        type: 'number',
        required: true,
        default: 70,
        range: [0, 100] as const,
        description: 'Nutrition level (0 = starved, 100 = well-fed)',
        displayName: 'Nutrition',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vitals',
          order: 22,
          icon: '🌾',
        },
        mutable: true,
      },

      flowerCount: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000] as const,
        description: 'Number of flowers',
        displayName: 'Flowers',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'reproduction',
          order: 30,
          icon: '🌸',
        },
        mutable: true,
      },

      fruitCount: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000] as const,
        description: 'Number of fruits',
        displayName: 'Fruits',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'reproduction',
          order: 31,
          icon: '🍎',
        },
        mutable: true,
      },

      planted: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether planted by agent (vs wild)',
        displayName: 'Planted',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'identity',
          order: 2,
        },
        mutable: false,
      },

      harvestDestroysPlant: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Whether harvesting destroys the plant',
        displayName: 'Harvest Destroys',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'harvest',
          order: 40,
        },
        mutable: false,
      },
    },

    ui: {
      icon: '🌱',
      color: '#4CAF50',
      priority: 4,
    },

    llm: {
      promptSection: 'plants',
      summarize: (data: PlantComponent) => {
        const vitals = `H:${Math.floor(data.health)} W:${Math.floor(data.hydration)} N:${Math.floor(data.nutrition)}`;
        const produce = data.fruitCount > 0 ? ` ${data.fruitCount}🍎` : '';
        const origin = data.planted ? 'planted' : 'wild';
        return `${data.speciesId} (${data.stage} ${origin}) [${vitals}]${produce}`;
      },
      priority: 5,
    },

    createDefault: (): PlantComponent => ({
      type: 'plant',
      speciesId: 'unknown',
      position: { x: 0, y: 0 },
      stage: 'seed',
      stageProgress: 0,
      age: 0,
      generation: 0,
      health: 85,
      hydration: 50,
      nutrition: 70,
      flowerCount: 0,
      fruitCount: 0,
      seedsProduced: 0,
      seedsDropped: [],
      geneticQuality: 75,
      careQuality: 100,
      environmentMatch: 75,
      genetics: {
        growthRate: 1.0,
        yieldAmount: 1.0,
        diseaseResistance: 50,
        droughtTolerance: 50,
        coldTolerance: 50,
        flavorProfile: 50,
        mutations: [],
      },
      visualVariant: 0,
      currentSprite: '',
      isIndoors: false,
      planted: false,
      harvestDestroysPlant: true,
      harvestResetStage: 'fruiting',
      providesShade: false,
      shadeRadius: 0,
      diseases: [],
      pests: [],
    }),
  })
);
