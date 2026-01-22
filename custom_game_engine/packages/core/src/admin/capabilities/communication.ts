/**
 * Communication Capability - Manage agent messaging and conversations
 *
 * Provides admin interface for:
 * - Sending messages between agents
 * - Viewing conversation history
 * - Broadcasting announcements
 * - Monitoring active conversations
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const MESSAGE_TYPE_OPTIONS = [
  { value: 'chat', label: 'Chat Message' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'whisper', label: 'Whisper (private)' },
  { value: 'shout', label: 'Shout (area)' },
  { value: 'thought', label: 'Thought (internal)' },
];

const CONVERSATION_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
];

// ============================================================================
// Communication Capability Definition
// ============================================================================

const communicationCapability = defineCapability({
  id: 'communication',
  name: 'Communication',
  description: 'Manage agent messaging - conversations, announcements, chat history',
  category: 'systems',

  tab: {
    icon: '💬',
    priority: 16,
  },

  queries: [
    defineQuery({
      id: 'list-active-conversations',
      name: 'List Active Conversations',
      description: 'List all currently active conversations',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/conversations' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          count?: number;
          conversations?: Array<{
            id: string;
            participants: Array<{ id: string; name: string }>;
            topic?: string;
            startTick: number;
            messageCount: number;
          }>;
        };

        let output = 'ACTIVE CONVERSATIONS\n\n';

        if (result.conversations?.length) {
          result.conversations.forEach(c => {
            const names = c.participants.map(p => p.name).join(' & ');
            output += `${names}\n`;
            output += `  ID: ${c.id}\n`;
            if (c.topic) {
              output += `  Topic: ${c.topic}\n`;
            }
            output += `  Messages: ${c.messageCount}\n`;
            output += `  Started: Tick ${c.startTick}\n\n`;
          });
          output += `Total: ${result.count ?? result.conversations.length}`;
        } else {
          output += 'No active conversations';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-conversation-history',
      name: 'Get Conversation History',
      description: 'Get message history for a conversation',
      params: [
        { name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' },
        { name: 'limit', type: 'number', required: false, default: 50, description: 'Max messages' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/conversation/history' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          conversationId?: string;
          participants?: string[];
          messages?: Array<{
            sender: string;
            content: string;
            tick: number;
            type: string;
          }>;
        };

        let output = 'CONVERSATION HISTORY\n';
        output += `Participants: ${result.participants?.join(', ') ?? 'Unknown'}\n\n`;

        if (result.messages?.length) {
          result.messages.forEach(m => {
            output += `[${m.tick}] ${m.sender}: ${m.content}\n`;
          });
        } else {
          output += 'No messages';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-agent-chat-history',
      name: 'Get Agent Chat History',
      description: 'Get all messages involving an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'limit', type: 'number', required: false, default: 30, description: 'Max messages' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/chat-history' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          messages?: Array<{
            partner: string;
            content: string;
            tick: number;
            sent: boolean;
          }>;
        };

        let output = `CHAT HISTORY: ${result.agentName ?? 'Unknown'}\n\n`;

        if (result.messages?.length) {
          result.messages.forEach(m => {
            const direction = m.sent ? '→' : '←';
            output += `[${m.tick}] ${direction} ${m.partner}: ${m.content}\n`;
          });
        } else {
          output += 'No chat history';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-recent-announcements',
      name: 'Get Recent Announcements',
      description: 'Get recent world/settlement announcements',
      params: [
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Max announcements' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/announcements' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          announcements?: Array<{
            content: string;
            source: string;
            tick: number;
            scope: string;
          }>;
        };

        let output = 'RECENT ANNOUNCEMENTS\n\n';

        if (result.announcements?.length) {
          result.announcements.forEach(a => {
            output += `[${a.tick}] [${a.scope}] ${a.source}\n`;
            output += `  ${a.content}\n\n`;
          });
        } else {
          output += 'No recent announcements';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-nearby-conversations',
      name: 'Get Nearby Conversations',
      description: 'Get conversations happening near a location',
      params: [
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'radius', type: 'number', required: false, default: 30, description: 'Search radius' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/conversations/nearby' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          conversations?: Array<{
            participants: string[];
            distance: number;
            topic?: string;
          }>;
        };

        let output = 'NEARBY CONVERSATIONS\n\n';

        if (result.conversations?.length) {
          result.conversations.forEach(c => {
            output += `${c.participants.join(' & ')} (${c.distance.toFixed(0)} tiles away)\n`;
            if (c.topic) {
              output += `  Topic: ${c.topic}\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No nearby conversations';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'send-message',
      name: 'Send Message',
      description: 'Send a message from one agent to another',
      params: [
        { name: 'fromAgentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Sender agent ID' },
        { name: 'toAgentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Recipient agent ID' },
        { name: 'content', type: 'string', required: true, description: 'Message content' },
        {
          name: 'type', type: 'select', required: false,
          options: MESSAGE_TYPE_OPTIONS,
          default: 'chat',
          description: 'Message type',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Sent message from ${params.fromAgentId} to ${params.toAgentId}` };
      },
    }),

    defineAction({
      id: 'broadcast-announcement',
      name: 'Broadcast Announcement',
      description: 'Broadcast an announcement to all agents',
      params: [
        { name: 'content', type: 'string', required: true, description: 'Announcement content' },
        { name: 'source', type: 'string', required: false, default: 'System', description: 'Announcement source' },
        {
          name: 'scope', type: 'select', required: false,
          options: [
            { value: 'world', label: 'Entire World' },
            { value: 'settlement', label: 'Settlement Only' },
            { value: 'area', label: 'Local Area' },
          ],
          default: 'world',
          description: 'Announcement scope',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Broadcast announcement: ${params.content}` };
      },
    }),

    defineAction({
      id: 'start-conversation',
      name: 'Start Conversation',
      description: 'Start a conversation between two agents',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent' },
        { name: 'topic', type: 'string', required: false, description: 'Conversation topic' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Started conversation between ${params.agent1Id} and ${params.agent2Id}` };
      },
    }),

    defineAction({
      id: 'end-conversation',
      name: 'End Conversation',
      description: 'End an active conversation',
      params: [
        { name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Ended conversation ${params.conversationId}` };
      },
    }),

    defineAction({
      id: 'inject-message',
      name: 'Inject Message',
      description: 'Inject a message into an active conversation (for testing)',
      dangerous: true,
      params: [
        { name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' },
        { name: 'senderId', type: 'entity-id', required: true, entityType: 'agent', description: 'Sender agent' },
        { name: 'content', type: 'string', required: true, description: 'Message content' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Injected message into conversation ${params.conversationId}` };
      },
    }),

    defineAction({
      id: 'make-agent-speak',
      name: 'Make Agent Speak',
      description: 'Make an agent say something out loud (area message)',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'content', type: 'string', required: true, description: 'What to say' },
        { name: 'radius', type: 'number', required: false, default: 20, description: 'Hearing radius' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `${params.agentId} says: ${params.content}` };
      },
    }),
  ],
});

capabilityRegistry.register(communicationCapability);
