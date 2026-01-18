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
      const d = data as Record<string, unknown>;

      if (!('type' in d) || d.type !== 'death_judgment') return false;
      if (!('stage' in d) || typeof d.stage !== 'string') return false;
      if (!('conversationStartTick' in d) || typeof d.conversationStartTick !== 'number') return false;
      if (!('lastExchangeTick' in d) || typeof d.lastExchangeTick !== 'number') return false;
      if (!('psychopompName' in d) || typeof d.psychopompName !== 'string') return false;
      if (!('exchanges' in d) || !Array.isArray(d.exchanges)) return false;
      if (!('currentExchangeIndex' in d) || typeof d.currentExchangeIndex !== 'number') return false;
      if (!('judgedPeace' in d) || typeof d.judgedPeace !== 'number') return false;
      if (!('judgedTether' in d) || typeof d.judgedTether !== 'number') return false;
      if (!('coherenceModifier' in d) || typeof d.coherenceModifier !== 'number') return false;
      if (!('causeOfDeath' in d) || typeof d.causeOfDeath !== 'string') return false;
      if (!('ageName' in d) || typeof d.ageName !== 'string') return false;
      if (!('unfinishedGoals' in d) || !Array.isArray(d.unfinishedGoals)) return false;
      if (!('importantRelationships' in d) || !Array.isArray(d.importantRelationships)) return false;
      if (!('notableDeeds' in d) || !Array.isArray(d.notableDeeds)) return false;
      if (!('sins' in d) || !Array.isArray(d.sins)) return false;
      if (!('awaitingSoulResponse' in d) || typeof d.awaitingSoulResponse !== 'boolean') return false;
      if (!('awaitingPsychopompResponse' in d) || typeof d.awaitingPsychopompResponse !== 'boolean') return false;

      return true;
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
