import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { IncarnationComponent } from '@ai-village/core';

/**
 * IncarnationSchema - Introspection schema for IncarnationComponent
 *
 * Tier: Core (Soul/Reincarnation system)
 * Complexity: Large (soul bindings, incarnation history, phylacteries)
 */
export const IncarnationSchema = autoRegister(
  defineComponent<IncarnationComponent>({
    type: 'incarnation',
    version: 1,
    category: 'core',

    fields: {
      currentBindings: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Current soul bindings (bodies, phylacteries, etc.)',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'bindings',
          order: 1,
          icon: '🔗',
        },
      },
      state: {
        type: 'string',
        required: true,
        default: 'disembodied',
        description: 'Current incarnation state',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'state',
          order: 1,
          icon: '👤',
        },
      },
      incarnationHistory: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Complete history of all incarnations',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'history',
          order: 1,
          icon: '📜',
        },
      },
      canConcurrentIncarnate: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Can split across multiple bodies',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'abilities',
          order: 1,
          icon: '🌟',
        },
      },
      maxConcurrentIncarnations: {
        type: 'number',
        required: true,
        default: 1,
        description: 'Maximum concurrent incarnations allowed',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'abilities',
          order: 2,
          icon: '🔢',
        },
      },
    },

    ui: {
      icon: '👻',
      color: '#673AB7',
      priority: 8,
    },

    llm: {
      promptSection: 'Incarnation',
      summarize: (data: IncarnationComponent) => {
        const parts: string[] = [];

        parts.push(data.state);

        const livesLived = data.incarnationHistory.filter(
          rec => rec.incarnationEndTick !== undefined
        ).length;

        if (livesLived > 0) {
          parts.push(`${livesLived} past lives`);
        }

        if (data.currentBindings.length > 0) {
          const bindingTypes = data.currentBindings
            .map(b => b.bindingType)
            .join(', ');
          parts.push(`bound to: ${bindingTypes}`);
        }

        return parts.join(', ');
      },
    },

    validate: (data: unknown): data is IncarnationComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as Record<string, unknown>;

      if (!('type' in comp) || comp.type !== 'incarnation') return false;
      if (!('currentBindings' in comp) || !Array.isArray(comp.currentBindings)) return false;
      if (!('state' in comp) || typeof comp.state !== 'string') return false;
      if (!('incarnationHistory' in comp) || !Array.isArray(comp.incarnationHistory)) return false;
      if (!('canConcurrentIncarnate' in comp) || typeof comp.canConcurrentIncarnate !== 'boolean') return false;
      if (!('maxConcurrentIncarnations' in comp) || typeof comp.maxConcurrentIncarnations !== 'number') return false;

      return true;
    },

    createDefault: () => {
      const { createIncarnationComponent } = require('@ai-village/core');
      return createIncarnationComponent() as IncarnationComponent;
    },
  })
);
