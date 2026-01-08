/**
 * Conversation Component Schema
 *
 * Dialogue state and conversation history
 * Phase 4, Tier 2 - Social Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Conversation message type
 */
export interface ConversationMessage {
  speakerId: string;
  message: string;
  tick: number;
}

/**
 * Conversation component type
 * Matches: packages/core/src/components/ConversationComponent.ts
 */
export interface ConversationComponent extends Component {
  type: 'conversation';
  version: 1;
  partnerId: string | null;
  messages: ConversationMessage[];
  maxMessages: number;
  startedAt: number;
  lastMessageAt: number;
  isActive: boolean;
}

/**
 * Conversation component schema
 */
export const ConversationSchema = autoRegister(
  defineComponent<ConversationComponent>({
    type: 'conversation',
    version: 1,
    category: 'social',

    fields: {
      partnerId: {
        type: 'string',
        required: false,
        displayName: 'Partner',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'conversation',
          order: 1,
          icon: '💬',
        },
        mutable: true,
      },

      messages: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        maxLength: 100,
        displayName: 'Messages',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'conversation',
          order: 2,
          icon: '📜',
        },
        mutable: true,
      },

      maxMessages: {
        type: 'number',
        required: true,
        default: 20,
        range: [1, 100] as const,
        displayName: 'Max Messages',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'config',
          order: 10,
        },
        mutable: true,
      },

      startedAt: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, Number.MAX_SAFE_INTEGER] as const,
        displayName: 'Started At',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'meta',
          order: 20,
        },
        mutable: true,
      },

      lastMessageAt: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, Number.MAX_SAFE_INTEGER] as const,
        displayName: 'Last Message',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'meta',
          order: 21,
        },
        mutable: true,
      },

      isActive: {
        type: 'boolean',
        required: true,
        default: false,
        displayName: 'Active',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'conversation',
          order: 3,
          icon: '✅',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '💬',
      color: '#9C27B0',
      priority: 5,
    },

    llm: {
      promptSection: 'conversation',
      summarize: (data, context) => {
        if (!data.isActive || !data.partnerId) {
          return 'Not in conversation';
        }

        // Resolve partner name if context available
        const resolveName = context?.entityResolver || ((id: string) => id);
        const partnerName = resolveName(data.partnerId);

        const messageCount = data.messages.length;
        const duration = data.lastMessageAt - data.startedAt;

        // Get last few messages for context
        const recentMessages = data.messages.slice(-3).map(m => {
          const speaker = m.speakerId === data.partnerId ? 'Partner' : 'Self';
          return `${speaker}: "${m.message}"`;
        }).join(' | ');

        return `Talking with ${partnerName} (${messageCount} messages, ${duration} ticks) | Recent: ${recentMessages}`;
      },
      priority: 6,
    },

    validate: (data): data is ConversationComponent => {
      const d = data as any;

      if (!d || d.type !== 'conversation') return false;

      if (d.partnerId !== null && typeof d.partnerId !== 'string') {
        return false;
      }

      if (!Array.isArray(d.messages)) return false;

      // Validate messages
      for (const msg of d.messages) {
        if (typeof msg !== 'object' || msg === null) return false;
        if (typeof msg.speakerId !== 'string') return false;
        if (typeof msg.message !== 'string') return false;
        if (typeof msg.tick !== 'number' || msg.tick < 0) {
          throw new RangeError(`Invalid message tick: ${msg.tick} (must be >= 0)`);
        }
      }

      if (typeof d.maxMessages !== 'number' || d.maxMessages < 1 || d.maxMessages > 100) {
        throw new RangeError(`Invalid maxMessages: ${d.maxMessages} (must be 1-100)`);
      }

      if (typeof d.startedAt !== 'number' || d.startedAt < 0) {
        throw new RangeError(`Invalid startedAt: ${d.startedAt} (must be >= 0)`);
      }

      if (typeof d.lastMessageAt !== 'number' || d.lastMessageAt < 0) {
        throw new RangeError(`Invalid lastMessageAt: ${d.lastMessageAt} (must be >= 0)`);
      }

      if (typeof d.isActive !== 'boolean') return false;

      return true;
    },

    createDefault: () => ({
      type: 'conversation',
      version: 1,
      partnerId: null,
      messages: [],
      maxMessages: 20,
      startedAt: 0,
      lastMessageAt: 0,
      isActive: false,
    }),
  })
);
