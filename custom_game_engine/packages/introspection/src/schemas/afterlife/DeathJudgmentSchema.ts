import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { DeathJudgmentComponent } from '@ai-village/core';

/**
 * DeathJudgmentSchema - Introspection schema for DeathJudgmentComponent
 *
 * Tier 9: Afterlife/Spiritual
 * Batch 5: Soul & Realms
 * Category: Cognitive/Death
 */
export const DeathJudgmentSchema = autoRegister(
  defineComponent<DeathJudgmentComponent>({
    type: 'death_judgment',
    version: 1,
    category: 'afterlife',

    fields: {
      stage: {
        type: 'string',
        required: true,
        description: 'Judgment stage (awaiting, in_conversation, delivered, crossing)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'state',
          order: 1,
        },
      },

      psychopompName: {
        type: 'string',
        required: true,
        description: 'Name of death guide angel',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'psychopomp',
          order: 2,
        },
      },

      exchanges: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Conversation history',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'conversation',
          order: 3,
        },
      },

      judgedPeace: {
        type: 'number',
        required: true,
        default: 0.5,
        description: 'How at peace with death (0-1)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'judgment',
          order: 4,
        },
      },

      judgedTether: {
        type: 'number',
        required: true,
        default: 0.5,
        description: 'Connection to living world (0-1)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'judgment',
          order: 5,
        },
      },

      coherenceModifier: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Bonus/penalty to coherence (-0.2 to +0.2)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'judgment',
          order: 6,
        },
      },

      causeOfDeath: {
        type: 'string',
        required: true,
        description: 'How they died',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'context',
          order: 7,
        },
      },

      ageName: {
        type: 'string',
        required: true,
        description: 'Age category (child, young adult, middle aged, elderly)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'context',
          order: 8,
        },
      },

      unfinishedGoals: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Goals left incomplete',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'context',
          order: 9,
        },
      },
    },

    ui: {
      icon: '🕊️',
      color: '#F0E68C',
      priority: 8,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Death Judgment',
      summarize: (data: DeathJudgmentComponent) => {
        const stage = data.stage;
        const peace = (data.judgedPeace * 100).toFixed(0);
        const tether = (data.judgedTether * 100).toFixed(0);
        const exchanges = data.exchanges.length;
        return `${stage} with ${data.psychopompName}, ${exchanges} exchanges, peace: ${peace}%, tether: ${tether}%`;
      },
    },

    validate: (data): data is DeathJudgmentComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as any;

      return (
        d.type === 'death_judgment' &&
        typeof d.stage === 'string' &&
        typeof d.conversationStartTick === 'number' &&
        typeof d.lastExchangeTick === 'number' &&
        typeof d.psychopompName === 'string' &&
        Array.isArray(d.exchanges) &&
        typeof d.currentExchangeIndex === 'number' &&
        typeof d.judgedPeace === 'number' &&
        typeof d.judgedTether === 'number' &&
        typeof d.coherenceModifier === 'number' &&
        typeof d.causeOfDeath === 'string' &&
        typeof d.ageName === 'string' &&
        Array.isArray(d.unfinishedGoals) &&
        Array.isArray(d.importantRelationships) &&
        Array.isArray(d.notableDeeds) &&
        Array.isArray(d.sins) &&
        typeof d.awaitingSoulResponse === 'boolean' &&
        typeof d.awaitingPsychopompResponse === 'boolean'
      );
    },

    createDefault: (): DeathJudgmentComponent => ({
      type: 'death_judgment',
      version: 0,
      stage: 'awaiting_psychopomp',
      conversationStartTick: 0,
      lastExchangeTick: 0,
      psychopompId: null,
      psychopompName: 'The Ferryman',
      exchanges: [],
      currentExchangeIndex: 0,
      judgedPeace: 0.5,
      judgedTether: 0.5,
      coherenceModifier: 0,
      causeOfDeath: 'unknown',
      ageName: 'adult',
      unfinishedGoals: [],
      importantRelationships: [],
      notableDeeds: [],
      sins: [],
      beliefs: null,
      awaitingSoulResponse: false,
      awaitingPsychopompResponse: true,
    }),
  })
);
