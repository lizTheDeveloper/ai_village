import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { CorruptedUniverseComponent } from '@ai-village/core';

/**
 * CorruptedUniverseSchema - Introspection schema for CorruptedUniverseComponent
 *
 * Tier 16: Miscellaneous
 * Category: World/Universe Metadata
 *
 * Tracks corrupted universes from generation failures.
 * Part of Conservation of Game Matter principle - no universes are deleted.
 */
export const CorruptedUniverseSchema = autoRegister(
  defineComponent<CorruptedUniverseComponent>({
    type: 'corrupted_universe',
    version: 1,
    category: 'world',

    fields: {
      corruptionReason: {
        type: 'string',
        required: true,
        description: 'What caused the corruption',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'corruption',
          order: 1,
        },
      },

      generationError: {
        type: 'string',
        required: true,
        description: 'Generation error details',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'corruption',
          order: 2,
        },
      },

      stability: {
        type: 'number',
        required: true,
        description: 'Stability (0-100, lower = more dangerous)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'state',
          order: 3,
        },
      },

      accessibleVia: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'How to access this corrupted universe',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'access',
          order: 4,
        },
      },

      containsTreasures: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Whether valuable artifacts exist in this corrupted space',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'features',
          order: 5,
        },
      },

      dangerLevel: {
        type: 'number',
        required: true,
        default: 7,
        description: 'Danger level (0-10)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'state',
          order: 6,
        },
      },
    },

    ui: {
      icon: '💥',
      color: '#8B0000',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Corrupted Universe',
      summarize: (data: CorruptedUniverseComponent) => {
        const stability = data.stability;
        const danger = data.dangerLevel;
        const treasures = data.containsTreasures ? 'contains treasures' : 'no treasures';
        return `Corrupted universe: stability ${stability}%, danger ${danger}/10, ${treasures}`;
      },
    },

    validate: (data): data is CorruptedUniverseComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const c = data as Record<string, unknown>;

      return (
        c.type === 'corrupted_universe' &&
        typeof c.corruptionReason === 'string' &&
        typeof c.generationError === 'string' &&
        typeof c.stability === 'number' &&
        Array.isArray(c.accessibleVia) &&
        typeof c.containsTreasures === 'boolean' &&
        typeof c.dangerLevel === 'number' &&
        typeof c.corruptionTimestamp === 'number'
      );
    },

    createDefault: (): CorruptedUniverseComponent => ({
      type: 'corrupted_universe',
      version: 1,
      corruptionReason: 'generation_failure',
      generationError: 'Unknown error during universe generation',
      stability: 20,
      accessibleVia: ['dimensional_shard', 'reality_fixer_spell'],
      containsTreasures: true,
      dangerLevel: 7,
      corruptionTimestamp: Date.now(),
    }),
  })
);
