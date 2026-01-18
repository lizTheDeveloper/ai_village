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
      const comp = data as Record<string, unknown>;

      // Check type field
      if (!('type' in comp) || comp.type !== 'appearance') return false;

      // Check required string fields
      if (!('species' in comp) || typeof comp.species !== 'string') return false;
      if (!('gender' in comp) || typeof comp.gender !== 'string') return false;
      if (!('hairColor' in comp) || typeof comp.hairColor !== 'string') return false;
      if (!('skinTone' in comp) || typeof comp.skinTone !== 'string') return false;
      if (!('eyeColor' in comp) || typeof comp.eyeColor !== 'string') return false;
      if (!('build' in comp) || typeof comp.build !== 'string') return false;
      if (!('clothingType' in comp) || typeof comp.clothingType !== 'string') return false;
      if (!('spriteStatus' in comp) || typeof comp.spriteStatus !== 'string') return false;

      // Check required numeric fields
      if (!('height' in comp) || typeof comp.height !== 'number') return false;

      // Check optional fields
      if ('spriteFolderId' in comp && comp.spriteFolderId !== undefined && typeof comp.spriteFolderId !== 'string') return false;

      return true;
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
