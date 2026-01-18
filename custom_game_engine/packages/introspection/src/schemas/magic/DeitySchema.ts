import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { DeityComponent } from '@ai-village/core';

/**
 * DeitySchema - Introspection schema for DeityComponent
 *
 * Tier: Magic/Divine
 * Complexity: Large (emergent divine identity, belief economy, mythology)
 */
export const DeitySchema = autoRegister(
  defineComponent<DeityComponent>({
    type: 'deity',
    version: 1,
    category: 'magic',

    fields: {
      'identity.primaryName': {
        type: 'string',
        required: true,
        default: 'The Nameless',
        description: 'Primary name of the deity',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 1,
          icon: '✨',
        },
      },
      'identity.epithets': {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Titles and epithets given by believers',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'identity',
          order: 2,
          icon: '📜',
        },
      },
      'identity.domain': {
        type: 'string',
        required: false,
        description: 'Primary divine domain (harvest, war, wisdom, etc.)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 3,
          icon: '⚡',
        },
      },
      'belief.currentBelief': {
        type: 'number',
        required: true,
        default: 0,
        description: 'Current belief reserves (divine power)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'power',
          order: 1,
          icon: '⚡',
        },
      },
      'belief.beliefPerTick': {
        type: 'number',
        required: true,
        default: 0,
        description: 'Current belief generation rate per tick',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'power',
          order: 2,
          icon: '📈',
        },
      },
      believers: {
        type: 'object',
        required: true,
        default: new Set(),
        description: 'Set of believer agent IDs',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'followers',
          order: 1,
          icon: '🙏',
        },
      },
      prayerQueue: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Unanswered prayers awaiting divine response',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'prayers',
          order: 1,
          icon: '🙏',
        },
      },
      myths: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Myths and stories about this deity',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'mythology',
          order: 1,
          icon: '📖',
        },
      },
      controller: {
        type: 'string',
        required: true,
        default: 'dormant',
        description: 'Who controls this deity: player, ai, or dormant',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'control',
          order: 1,
          icon: '🎮',
        },
      },
    },

    ui: {
      icon: '✨',
      color: '#FFD700',
      priority: 10,
    },

    llm: {
      promptSection: 'Divine Identity',
      summarize: (data: DeityComponent) => {
        const parts: string[] = [];

        parts.push(`${data.identity.primaryName}`);

        if (data.identity.domain) {
          parts.push(`deity of ${data.identity.domain}`);
        }

        parts.push(`${data.believers.size} believers`);
        parts.push(`${Math.floor(data.belief.currentBelief)} belief power`);

        if (data.prayerQueue.length > 0) {
          parts.push(`${data.prayerQueue.length} unanswered prayers`);
        }

        if (data.myths.length > 0) {
          parts.push(`${data.myths.length} myths`);
        }

        return parts.join(', ');
      },
    },

    validate: (data: unknown): data is DeityComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as Record<string, unknown>;

      // Check type field
      if (!('type' in comp) || comp.type !== 'deity') return false;

      // Check identity object
      if (!('identity' in comp) || typeof comp.identity !== 'object' || comp.identity === null) return false;

      // Check belief object
      if (!('belief' in comp) || typeof comp.belief !== 'object' || comp.belief === null) return false;

      // Check believers set
      if (!('believers' in comp) || !(comp.believers instanceof Set)) return false;

      // Check sacredSites set
      if (!('sacredSites' in comp) || !(comp.sacredSites instanceof Set)) return false;

      // Check prayerQueue array
      if (!('prayerQueue' in comp) || !Array.isArray(comp.prayerQueue)) return false;

      // Check sentVisions array
      if (!('sentVisions' in comp) || !Array.isArray(comp.sentVisions)) return false;

      // Check myths array
      if (!('myths' in comp) || !Array.isArray(comp.myths)) return false;

      // Check controller string
      if (!('controller' in comp) || typeof comp.controller !== 'string') return false;

      return true;
    },

    createDefault: () => {
      const component = new (require('@ai-village/core').DeityComponent)();
      return component as DeityComponent;
    },
  })
);
