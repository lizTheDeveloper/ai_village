/**
 * Tags Component Schema
 *
 * Tags for categorization and queries
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { TagsComponent } from '@ai-village/core';

/**
 * Tags component schema
 */
export const TagsSchema = autoRegister(
  defineComponent<TagsComponent>({
    type: 'tags',
    version: 1,
    category: 'physical',
    description: 'Tags for categorization and queries',

    fields: {
      tags: {
        type: 'array',
        required: true,
        default: [],
        description: 'Array of tag strings',
        displayName: 'Tags',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'metadata',
          order: 1,
          icon: '🏷️',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🏷️',
      color: '#607D8B',
      priority: 10,
    },

    llm: {
      promptSection: 'metadata',
      summarize: (data: TagsComponent) => {
        return data.tags.length > 0 ? `tags: ${data.tags.join(', ')}` : 'no tags';
      },
    },

    createDefault: (): TagsComponent => ({
      type: 'tags',
      version: 1,
      tags: [],
    }),
  })
);
