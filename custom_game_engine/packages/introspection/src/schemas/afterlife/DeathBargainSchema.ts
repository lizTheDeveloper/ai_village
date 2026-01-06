import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { DeathBargainComponent } from '@ai-village/core';

/**
 * DeathBargainSchema - Introspection schema for DeathBargainComponent
 *
 * Tier 9: Afterlife/Spiritual
 * Batch 5: Soul & Realms
 * Category: Cognitive/Death
 */
export const DeathBargainSchema = autoRegister(
  defineComponent<DeathBargainComponent>({
    type: 'death_bargain',
    version: 1,
    category: 'afterlife',

    fields: {
      challengeType: {
        type: 'string',
        required: true,
        description: 'Type of challenge (riddle, feat, game, etc.)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'challenge',
          order: 1,
        },
      },

      challengeDescription: {
        type: 'string',
        required: true,
        default: '',
        description: 'Full challenge description',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'challenge',
          order: 2,
        },
      },

      deathGodDialogue: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Death god conversation',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'dialogue',
          order: 3,
        },
      },

      deathGodName: {
        type: 'string',
        required: true,
        description: 'Name of the death god',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'dialogue',
          order: 4,
        },
      },

      status: {
        type: 'string',
        required: true,
        description: 'Bargain status (offered, accepted, in_progress, succeeded, failed, declined)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'progress',
          order: 5,
        },
      },

      attempts: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Current attempt count',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'progress',
          order: 6,
        },
      },

      maxAttempts: {
        type: 'number',
        required: true,
        default: 3,
        description: 'Maximum attempts allowed',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'progress',
          order: 7,
        },
      },

      succeeded: {
        type: 'boolean',
        required: false,
        description: 'Did the hero succeed?',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'outcome',
          order: 8,
        },
      },

      destinyText: {
        type: 'string',
        required: false,
        description: 'Hero destiny that justified the bargain',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'context',
          order: 9,
        },
      },
    },

    ui: {
      icon: '⚰️',
      color: '#8B0000',
      priority: 9,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Death Bargain',
      summarize: (data: DeathBargainComponent) => {
        const type = data.challengeType;
        const status = data.status;
        const attempts = `${data.attempts}/${data.maxAttempts}`;
        return `Death bargain (${type}): ${status}, attempts: ${attempts}`;
      },
    },

    validate: (data): data is DeathBargainComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as any;

      return (
        d.type === 'death_bargain' &&
        typeof d.challengeType === 'string' &&
        typeof d.challengeDescription === 'string' &&
        Array.isArray(d.deathGodDialogue) &&
        typeof d.deathGodName === 'string' &&
        typeof d.status === 'string' &&
        typeof d.attempts === 'number' &&
        typeof d.maxAttempts === 'number' &&
        typeof d.deathTick === 'number' &&
        typeof d.deathLocation === 'object' &&
        typeof d.causeOfDeath === 'string'
      );
    },

    createDefault: (): DeathBargainComponent => ({
      type: 'death_bargain',
      version: 1,
      challengeType: 'riddle',
      challengeDescription: '',
      deathGodDialogue: [],
      deathGodName: 'The Ferryman',
      status: 'offered',
      attempts: 0,
      maxAttempts: 3,
      deathTick: 0,
      deathLocation: { x: 0, y: 0 },
      causeOfDeath: 'unknown',
    }),
  })
);
