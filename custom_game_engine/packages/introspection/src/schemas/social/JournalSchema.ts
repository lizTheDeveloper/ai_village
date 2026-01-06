/**
 * Journal Component Schema
 *
 * Stores written journal entries.
 * Agents can record thoughts, memories, and experiences in their journals.
 *
 * Phase 4+, Tier 10 - Social/Community Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Journal component type
 */
export interface JournalComponent extends Component {
  type: 'journal';
  version: 1;

  entries: Array<{
    id: string;
    text: string;
    timestamp: number;
    memoryIds: readonly string[];
    topics: readonly string[];
    discoverable: boolean;
    privacy: 'public' | 'private';
  }>;
}

/**
 * Journal component schema
 */
export const JournalSchema = autoRegister(
  defineComponent<JournalComponent>({
    type: 'journal',
    version: 1,
    category: 'social',

    fields: {
      entries: {
        type: 'array',
        required: true,
        default: [],
        description: 'All journal entries written by this agent',
        displayName: 'Journal Entries',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'journal',
          order: 1,
          icon: '📓',
        },
        mutable: false,
        itemType: 'object',
      },
    },

    ui: {
      icon: '📓',
      color: '#8B4513',
      priority: 12,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'journal',
      priority: 12,
      summarize: (data) => {
        if (!data.entries || data.entries.length === 0) {
          return 'no journal entries';
        }

        const totalEntries = data.entries.length;

        // Get most recent entries (last 3)
        const recentEntries = data.entries.slice(-3).reverse();

        const recentSummaries = recentEntries.map(entry => {
          const topics = entry.topics.length > 0 ? ` (${entry.topics.slice(0, 2).join(', ')})` : '';
          const preview = entry.text.length > 50 ? entry.text.substring(0, 50) + '...' : entry.text;
          return `"${preview}"${topics}`;
        });

        return `${totalEntries} journal entries | Recent: ${recentSummaries.join(' | ')}`;
      },
    },

    validate: (data): data is JournalComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const j = data as any;

      return (
        j.type === 'journal' &&
        Array.isArray(j.entries)
      );
    },

    createDefault: () => ({
      type: 'journal',
      version: 1,
      entries: [],
    }),
  })
);
