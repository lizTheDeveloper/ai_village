/**
 * LLM Capability - Manage LLM providers, queue, and costs
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

const llmCapability = defineCapability({
  id: 'llm',
  name: 'LLM Queue',
  description: 'Manage LLM providers, queue status, and cost tracking',
  category: 'infrastructure',

  tab: {
    icon: '🤖',
    priority: 60,
  },

  queries: [
    defineQuery({
      id: 'providers',
      name: 'List Providers',
      description: 'List all configured LLM providers and their status',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/llm/providers' };
      },
    }),

    defineQuery({
      id: 'queue-stats',
      name: 'Queue Statistics',
      description: 'Get current queue lengths and rate limit status',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/llm/stats' };
      },
    }),

    defineQuery({
      id: 'costs',
      name: 'Cost Tracking',
      description: 'Get LLM usage costs per provider and session',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Filter by session' },
        { name: 'provider', type: 'select', required: false, options: [
          { value: 'all', label: 'All Providers' },
          { value: 'groq', label: 'Groq' },
          { value: 'cerebras', label: 'Cerebras' },
        ], description: 'Filter by provider' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/llm/costs' };
      },
    }),

    defineQuery({
      id: 'session-cooldowns',
      name: 'Session Cooldowns',
      description: 'Get cooldown status for each game session',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to LLMRequestRouter' };
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'set-agent-llm',
      name: 'Set Agent LLM Config',
      description: 'Configure custom LLM settings for a specific agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'provider', type: 'select', required: false, options: [
          { value: 'groq', label: 'Groq' },
          { value: 'cerebras', label: 'Cerebras' },
        ], description: 'Preferred provider' },
        { name: 'model', type: 'string', required: false, description: 'Model override' },
        { name: 'temperature', type: 'number', required: false, default: 0.7, description: 'Temperature (0-2)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/live/set-llm' };
      },
    }),

    defineAction({
      id: 'flush-queue',
      name: 'Flush Queue',
      description: 'Clear all pending LLM requests (dangerous!)',
      dangerous: true,
      requiresConfirmation: true,
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Clear LLM request queues' };
      },
    }),

    defineAction({
      id: 'reset-cooldowns',
      name: 'Reset Session Cooldowns',
      description: 'Reset rate limit cooldowns for a session',
      params: [
        { name: 'session', type: 'session-id', required: true, description: 'Session to reset' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Reset cooldowns for session' };
      },
    }),
  ],
});

capabilityRegistry.register(llmCapability);
