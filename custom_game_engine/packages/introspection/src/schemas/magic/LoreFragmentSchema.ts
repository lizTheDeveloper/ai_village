import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { LoreFragmentComponent } from '@ai-village/core';

export const LoreFragmentSchema = autoRegister(
  defineComponent<LoreFragmentComponent>({
    type: 'lore_frag',
    version: 1,
    category: 'magic',
    description: 'Readable lore items - diaries, journals, and texts from interdimensional travelers and dying gods',

    fields: {
      fragmentId: {
        type: 'string',
        required: true,
        description: 'Unique lore fragment ID for tracking discovery',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Identity',
          order: 1,
        },
      },
      title: {
        type: 'string',
        required: true,
        description: 'Title of the lore item',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Content',
          order: 1,
        },
      },
      author: {
        type: 'string',
        required: true,
        description: 'Author/source of the lore',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Content',
          order: 2,
        },
      },
      content: {
        type: 'string',
        required: true,
        description: 'The lore text content',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Content',
          order: 3,
        },
      },
      category: {
        type: 'string',
        required: true,
        description: 'Category of lore (creator_weakness, ancient_rebellion, interdimensional, etc.)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'Classification',
          order: 1,
        },
      },
      importance: {
        type: 'string',
        required: true,
        description: 'Importance level (trivial, minor, major, critical, climactic)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'Classification',
          order: 2,
        },
      },
      hasBeenRead: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether this fragment has been read',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Status',
          order: 1,
        },
      },
      tags: {
        type: 'array',
        required: true,
        default: [],
        description: 'Tags for filtering/searching',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Classification',
          order: 3,
        },
      },
      discoveredAt: {
        type: 'number',
        required: false,
        description: 'When this fragment was discovered (game tick)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Timestamps',
          order: 1,
        },
      },
    },

    ui: {
      icon: '📜',
      color: '#E67E22',
      priority: 7,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Discovered Lore',
      summarize: (data: LoreFragmentComponent) => {
        const status = data.hasBeenRead ? 'read' : 'unread';
        return `"${data.title}" by ${data.author} (${data.importance}, ${status}) - Category: ${data.category}`;
      },
    },

    createDefault: (): LoreFragmentComponent => ({
      type: 'lore_frag',
      version: 1,
      fragmentId: crypto.randomUUID(),
      title: 'Untitled Fragment',
      author: 'Unknown',
      content: '',
      category: 'flavor',
      importance: 'trivial',
      hasBeenRead: false,
      tags: [],
    } as any),
  })
);
