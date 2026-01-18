import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { DivineChatComponent } from '@ai-village/core';

export const DivineChatSchema = autoRegister(
  defineComponent<DivineChatComponent>({
    type: 'divine_chat',
    version: 1,
    category: 'magic',
    description: 'Global chat room for deities - IRC/Discord-style communication between gods',

    fields: {
      chatRoom: {
        type: 'object',
        required: true,
        description: 'The chat room state containing messages and participants',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Chat',
          order: 1,
        },
      },
      isActive: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether chat is currently active (2+ gods present)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Status',
          order: 1,
        },
      },
      lastMessageTick: {
        type: 'number',
        required: true,
        description: 'Last tick when a message was sent',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Timestamps',
          order: 1,
        },
      },
      lastUpdateTick: {
        type: 'number',
        required: true,
        description: 'Last tick when chat state was updated',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Timestamps',
          order: 2,
        },
      },
    },

    ui: {
      icon: '💬',
      color: '#9B59B6',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Divine Communications',
      summarize: (data: DivineChatComponent) => {
        const status = data.isActive ? 'active with multiple gods' : 'inactive';
        const messageCount = data.chatRoom?.messages?.length || 0;
        return `Divine chat is ${status}, ${messageCount} messages in history`;
      },
    },

    createDefault: (): DivineChatComponent => {
      const now = Date.now();
      return {
        type: 'divine_chat',
        version: 1,
        chatRoom: {
          id: `chat_${now}`,
          active: false,
          presentDeityIds: [],
          absentDeityIds: [],
          messages: [],
          currentRound: 0,
          roundStartedAt: now,
          playerTurn: true,
          playerHasSpoken: false,
          respondedThisRound: [],
          pendingNotifications: [],
          activePrivateDMs: [],
          lastActivityAt: now,
        },
        isActive: false,
        lastMessageTick: 0,
        lastUpdateTick: 0,
      };
    },
  })
);
