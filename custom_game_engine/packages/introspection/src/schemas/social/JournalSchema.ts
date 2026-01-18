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

        // Filter for diversity: remove repetitive low-importance entries
        const seen = new Set<string>();
        const diverse = data.entries.filter(entry => {
          // Get first 30 chars as fingerprint
          const fingerprint = entry.text.substring(0, 30).toLowerCase().trim();

          // Skip repetitive entries like "My hunger became critically low" x15
          if (seen.has(fingerprint)) {
            return false;
          }
          seen.add(fingerprint);
          return true;
        });

        const totalEntries = data.entries.length;
        const uniqueCount = diverse.length;

        // Get most recent diverse entries (last 3)
        const recentEntries = diverse.slice(-3).reverse();

        const recentSummaries = recentEntries.map(entry => {
          const topics = entry.topics.length > 0 ? ` (${entry.topics.slice(0, 2).join(', ')})` : '';
          const preview = entry.text.length > 50 ? entry.text.substring(0, 50) + '...' : entry.text;
          return `"${preview}"${topics}`;
        });

        const duplicateNote = totalEntries > uniqueCount ? ` (${totalEntries - uniqueCount} repetitive)` : '';
        return `${uniqueCount} unique entries${duplicateNote} | Recent: ${recentSummaries.join(' | ')}`;
      },
    },

    validate: (data): data is JournalComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const j = data as Record<string, unknown>;

      // Check required fields: type and entries
      if (!('type' in j) || j.type !== 'journal') return false;
      if (!('entries' in j) || !Array.isArray(j.entries)) return false;

      // Validate each entry in the array
      for (const entry of j.entries) {
        if (typeof entry !== 'object' || entry === null) return false;
        const e = entry as Record<string, unknown>;

        // Required fields
        if (!('id' in e) || typeof e.id !== 'string') return false;
        if (!('text' in e) || typeof e.text !== 'string') return false;
        if (!('timestamp' in e) || typeof e.timestamp !== 'number') return false;
        if (!('memoryIds' in e) || !Array.isArray(e.memoryIds)) return false;
        if (!('topics' in e) || !Array.isArray(e.topics)) return false;
        if (!('discoverable' in e) || typeof e.discoverable !== 'boolean') return false;
        if (!('privacy' in e) || (e.privacy !== 'public' && e.privacy !== 'private')) return false;

        // Validate memoryIds array items
        for (const memoryId of e.memoryIds) {
          if (typeof memoryId !== 'string') return false;
        }

        // Validate topics array items
        for (const topic of e.topics) {
          if (typeof topic !== 'string') return false;
        }
      }

      return true;
    },

    createDefault: () => ({
      type: 'journal',
      version: 1,
      entries: [],
    }),
  })
);
