/**
 * Preference Component Schema
 *
 * Tracks agent preferences across all domains
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { PreferenceComponent } from '@ai-village/core';

/**
 * Preference component schema
 */
export const PreferenceSchema = autoRegister(
  defineComponent<PreferenceComponent>({
    type: 'preference',
    version: 1,
    category: 'agent',
    description: 'Agent preferences for food, materials, and items',

    fields: {
      flavorPreferences: {
        type: 'object',
        required: true,
        description: 'Flavor preferences from -1 (hate) to 1 (love)',
        displayName: 'Flavor Preferences',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'food',
          order: 1,
          icon: '🍽️',
        },
        mutable: true,
      },

      materialPreferences: {
        type: 'object',
        required: true,
        description: 'Material and item preferences',
        displayName: 'Material Preferences',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'materials',
          order: 10,
          icon: '🎨',
        },
        mutable: true,
      },

      foodMemories: {
        type: 'array',
        required: true,
        default: [],
        description: 'History of food experiences',
        displayName: 'Food Memories',
        visibility: {
          player: false,
          llm: false,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'food',
          order: 2,
        },
        mutable: true,
      },

      avoids: {
        type: 'array',
        required: true,
        default: [],
        description: 'Foods or categories agent avoids',
        displayName: 'Avoids',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'food',
          order: 3,
          icon: '🚫',
        },
        mutable: true,
      },

      foodFrequency: {
        type: 'object',
        required: true,
        default: {},
        description: 'Counter for each food eaten',
        displayName: 'Food Frequency',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'food',
          order: 4,
        },
        mutable: true,
      },

      lastUpdate: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Last time preferences were updated (tick)',
        displayName: 'Last Update',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'metadata',
          order: 20,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🎨',
      color: '#E91E63',
      priority: 7,
    },

    llm: {
      promptSection: 'preferences',
      summarize: (data: PreferenceComponent) => {
        // Summarize flavor preferences
        const likes: string[] = [];
        const dislikes: string[] = [];

        for (const [flavor, value] of Object.entries(data.flavorPreferences)) {
          if (value > 0.3) likes.push(flavor);
          else if (value < -0.3) dislikes.push(flavor);
        }

        // Get material favorites
        const mp = data.materialPreferences;
        const favorites = [
          `${mp.color?.favorite || '?'} color`,
          `${mp.clothing?.favorite || '?'} clothing`,
        ];

        const parts: string[] = [];
        if (likes.length > 0) parts.push(`likes ${likes.join(', ')}`);
        if (dislikes.length > 0) parts.push(`dislikes ${dislikes.join(', ')}`);
        if (data.avoids.length > 0) parts.push(`avoids ${data.avoids.slice(0, 2).join(', ')}`);
        parts.push(`favors ${favorites.join(', ')}`);

        return parts.join('; ');
      },
      priority: 8,
    },

    createDefault: (): PreferenceComponent => {
      const { createPreferenceComponent } = require('@ai-village/core');
      return createPreferenceComponent();
    },
  })
);
