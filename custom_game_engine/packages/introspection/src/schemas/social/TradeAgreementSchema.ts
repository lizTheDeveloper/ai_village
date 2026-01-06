/**
 * Trade Agreement Component Schema
 *
 * Trade agreements for civilizations
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { TradeAgreementComponent } from '@ai-village/core';

export const TradeAgreementSchema = autoRegister(
  defineComponent<TradeAgreementComponent>({
    type: 'trade_agreement',
    version: 1,
    category: 'social',

    fields: {
      civilizationId: {
        type: 'string',
        required: true,
        displayName: 'Civilization',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'identity',
          order: 1,
          icon: '🏛️',
        },
        mutable: false,
      },

      civilizationName: {
        type: 'string',
        required: true,
        displayName: 'Name',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 2,
        },
        mutable: true,
      },

      universeId: {
        type: 'string',
        required: true,
        displayName: 'Universe',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'location',
          order: 10,
        },
        mutable: false,
      },

      multiverseId: {
        type: 'string',
        required: true,
        displayName: 'Multiverse',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'location',
          order: 11,
        },
        mutable: false,
      },

      maxEventHistory: {
        type: 'number',
        required: true,
        default: 100,
        range: [10, 1000] as const,
        displayName: 'Event History Size',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'configuration',
          order: 20,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🤝',
      color: '#FF9800',
      priority: 5,
    },

    llm: {
      promptSection: 'Trade',
      summarize: (data: TradeAgreementComponent) => {
        const active = data.activeAgreements.length;
        const pending = data.pendingNegotiations.length;
        const escrow = data.escrowHeld.length;
        const relations = data.diplomaticRelations.size;
        return `${data.civilizationName}: ${active} active agreements, ${pending} pending, ${escrow} in escrow, ${relations} diplomatic relations`;
      },
    },

    createDefault: (): TradeAgreementComponent => ({
      type: 'trade_agreement',
      version: 1,
      civilizationId: '',
      civilizationName: '',
      universeId: '',
      multiverseId: '',
      activeAgreements: [],
      pendingNegotiations: [],
      incomingProposals: [],
      recentEvents: [],
      maxEventHistory: 100,
      escrowHeld: [],
      escrowPending: [],
      causalEventQueue: [],
      partnerTimeCoordinates: new Map(),
      currentTimeCoordinate: {
        tau: 0n,
        beta: 'root',
        sigma: 0,
        origin: '',
        causalParents: [],
      },
      diplomaticRelations: new Map(),
    }),
  })
);
