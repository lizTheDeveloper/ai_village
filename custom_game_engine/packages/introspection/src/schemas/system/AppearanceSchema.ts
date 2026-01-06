import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * AppearanceComponent interface (simplified for schema)
 */
export interface AppearanceComponent extends Component {
  type: 'appearance';
  species: string;
  gender: string;
  hairColor: string;
  skinTone: string;
  eyeColor: string;
  height: number;
  build: string;
  clothingType: string;
  spriteFolderId?: string;
  spriteStatus: string;
}

/**
 * AppearanceSchema - Introspection schema for AppearanceComponent
 *
 * Visual traits for sprite selection and character appearance.
 */
export const AppearanceSchema = autoRegister(
  defineComponent<AppearanceComponent>({
    type: 'appearance',
    version: 1,
    category: 'system',

    fields: {
      species: {
        type: 'enum',
        enumValues: ['human', 'elf', 'dwarf', 'orc', 'celestial', 'demon', 'thrakeen', 'aquatic'] as const,
        required: true,
        default: 'human',
        displayName: 'Species',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'appearance',
          order: 1,
        },
        mutable: false,  // Can't change species
      },

      gender: {
        type: 'enum',
        enumValues: ['male', 'female', 'nonbinary'] as const,
        required: true,
        default: 'male',
        displayName: 'Gender',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'appearance',
          order: 2,
        },
        mutable: false,
      },

      hairColor: {
        type: 'enum',
        enumValues: ['black', 'brown', 'blonde', 'red', 'white', 'silver', 'green', 'blue'] as const,
        required: true,
        default: 'brown',
        displayName: 'Hair Color',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'appearance',
          order: 3,
        },
        mutable: true,  // Can dye hair
      },

      skinTone: {
        type: 'enum',
        enumValues: ['light', 'medium', 'dark'] as const,
        required: true,
        default: 'medium',
        displayName: 'Skin Tone',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'appearance',
          order: 4,
        },
        mutable: false,
      },

      eyeColor: {
        type: 'enum',
        enumValues: ['brown', 'blue', 'green', 'hazel', 'amber', 'gray', 'red', 'violet'] as const,
        required: true,
        default: 'brown',
        displayName: 'Eye Color',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'appearance',
          order: 5,
        },
        mutable: false,
      },

      build: {
        type: 'enum',
        enumValues: ['slim', 'average', 'stocky', 'muscular'] as const,
        required: true,
        default: 'average',
        displayName: 'Build',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'appearance',
          order: 6,
        },
        mutable: false,
      },

      clothingType: {
        type: 'enum',
        enumValues: ['peasant', 'common', 'merchant', 'noble', 'royal'] as const,
        required: true,
        default: 'peasant',
        displayName: 'Clothing',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'appearance',
          order: 7,
        },
        mutable: true,  // Can change clothes
      },

      spriteStatus: {
        type: 'enum',
        enumValues: ['unknown', 'available', 'missing', 'generating'] as const,
        required: true,
        default: 'unknown',
        displayName: 'Sprite Status',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'debug',
          order: 10,
        },
      },
    },

    ui: {
      icon: '👤',
      color: '#FF5722',
      priority: 4,
    },

    llm: {
      promptSection: 'Appearance',
      summarize: (data: AppearanceComponent) => {
        return `${data.gender} ${data.species} with ${data.hairColor} hair, ${data.skinTone} skin, ${data.eyeColor} eyes, ${data.build} build, wearing ${data.clothingType} clothing`;
      },
      priority: 5,
    },

    validate: (data: unknown): data is AppearanceComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        comp.type === 'appearance' &&
        typeof comp.species === 'string' &&
        typeof comp.gender === 'string' &&
        typeof comp.hairColor === 'string' &&
        typeof comp.skinTone === 'string' &&
        typeof comp.eyeColor === 'string' &&
        typeof comp.build === 'string' &&
        typeof comp.clothingType === 'string'
      );
    },

    createDefault: () => ({
      type: 'appearance',
      version: 1,
      species: 'human',
      gender: 'male',
      hairColor: 'brown',
      skinTone: 'medium',
      eyeColor: 'brown',
      height: 0,
      build: 'average',
      clothingType: 'peasant',
      spriteStatus: 'unknown',
    } as AppearanceComponent),
  })
);
