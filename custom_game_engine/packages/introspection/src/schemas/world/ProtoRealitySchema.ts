import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { ProtoRealityComponent } from '@ai-village/core';

/**
 * ProtoRealitySchema - Introspection schema for ProtoRealityComponent
 *
 * Tier 16: Miscellaneous
 * Category: World/Universe Metadata
 *
 * Tracks proto-realities from development phase when time was being invented.
 * Part of Conservation of Game Matter principle - no universes are deleted.
 */
export const ProtoRealitySchema = autoRegister(
  defineComponent<ProtoRealityComponent>({
    type: 'proto_reality',
    version: 1,
    category: 'world',

    fields: {
      era: {
        type: 'string',
        required: true,
        description: 'Universe era (before_time, primordial, classical, divergent, collapsed, experimental)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 1,
        },
      },

      developmentPhase: {
        type: 'string',
        required: true,
        description: 'Development phase identifier (e.g., "alpha-0.1.0")',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 2,
        },
      },

      stability: {
        type: 'number',
        required: true,
        description: 'Stability rating (0-100, where 100 is fully stable)',
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

      generationErrors: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Generation errors that occurred',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'errors',
          order: 4,
        },
      },

      lore: {
        type: 'string',
        required: true,
        description: 'Lore description of this proto-reality',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'lore',
          order: 5,
        },
      },

      containsPrimordialArtifacts: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Whether this proto-reality contains primordial artifacts',
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
          order: 6,
        },
      },
    },

    ui: {
      icon: '⏳',
      color: '#9370DB',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Proto-Reality',
      summarize: (data: ProtoRealityComponent) => {
        const era = data.era;
        const stability = data.stability;
        const errors = data.generationErrors.length;
        return `Proto-reality from ${era} era, stability ${stability}%, ${errors} generation errors`;
      },
    },

    validate: (data): data is ProtoRealityComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const p = data as Record<string, unknown>;

      return (
        p.type === 'proto_reality' &&
        typeof p.era === 'string' &&
        typeof p.generationTimestamp === 'number' &&
        typeof p.developmentPhase === 'string' &&
        typeof p.stability === 'number' &&
        Array.isArray(p.generationErrors) &&
        typeof p.lore === 'string' &&
        typeof p.containsPrimordialArtifacts === 'boolean'
      );
    },

    createDefault: (): ProtoRealityComponent => ({
      type: 'proto_reality',
      version: 1,
      era: 'before_time',
      generationTimestamp: Date.now(),
      developmentPhase: 'dev-2026-01-06',
      stability: 12,
      generationErrors: [],
      lore: 'A universe from the chaotic period when time itself was still being defined. Physics work differently here. Causality is... negotiable.',
      containsPrimordialArtifacts: true,
      accessRequirements: ['dimensional_perception', 'timeline_navigation'],
      alteredPhysics: {
        timeFlowModified: true,
        causalityNegotiable: true,
        spatialDistortions: true,
        magicUnstable: true,
      },
    }),
  })
);
