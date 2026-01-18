import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { CurrencyComponent } from '@ai-village/core';

/**
 * CurrencySchema - Introspection schema for CurrencyComponent
 *
 * Tier: Social (Economy system)
 * Complexity: Small (balance and transaction history)
 */
export const CurrencySchema = autoRegister(
  defineComponent<CurrencyComponent>({
    type: 'currency',
    version: 1,
    category: 'social',

    fields: {
      balance: {
        type: 'number',
        required: true,
        default: 0,
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'money',
          order: 1,
          icon: '💰',
        },
      },
      transactionHistory: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
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
          icon: '📊',
        },
      },
      maxHistorySize: {
        type: 'number',
        required: true,
        default: 100,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'config',
          order: 1,
          icon: '⚙️',
        },
      },
    },

    ui: {
      icon: '💰',
      color: '#FFC107',
      priority: 4,
    },

    llm: {
      promptSection: 'Currency',
      summarize: (data: CurrencyComponent) => {
        const parts: string[] = [];

        parts.push(`${data.balance} currency`);

        if (data.transactionHistory.length > 0) {
          const recent = data.transactionHistory.slice(0, 3);
          const recentStr = recent
            .map(t => `${t.type} ${Math.abs(t.amount)}`)
            .join(', ');
          parts.push(`Recent: ${recentStr}`);
        }

        return parts.join('. ');
      },
    },

    validate: (data: unknown): data is CurrencyComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as Record<string, unknown>;

      // Check component type
      if (!('type' in comp) || comp.type !== 'currency') return false;

      // Check required fields with typeof guards
      if (!('balance' in comp) || typeof comp.balance !== 'number') return false;
      if (!('transactionHistory' in comp) || !Array.isArray(comp.transactionHistory)) return false;
      if (!('maxHistorySize' in comp) || typeof comp.maxHistorySize !== 'number') return false;

      return true;
    },

    createDefault: () => {
      const { createCurrencyComponent } = require('@ai-village/core');
      return createCurrencyComponent(100) as CurrencyComponent;
    },
  })
);
