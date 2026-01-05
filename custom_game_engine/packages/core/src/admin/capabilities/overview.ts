/**
 * Overview Capability - Dashboard summary and quick actions
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

const overviewCapability = defineCapability({
  id: 'overview',
  name: 'Overview',
  description: 'Dashboard summary, system status, and quick actions',
  category: 'overview',

  tab: {
    icon: '🏠',
    priority: 0,
  },

  queries: [
    defineQuery({
      id: 'status',
      name: 'System Status',
      description: 'Get current system status including game connection and active sessions',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return {
          gameConnected: gameClient !== null,
          sessionId: context.sessionId || null,
          timestamp: new Date().toISOString(),
          server: 'metrics-server',
          port: 8766,
        };
      },
    }),

    defineQuery({
      id: 'list-sessions',
      name: 'List Sessions',
      description: 'List all game sessions (recent first)',
      params: [
        { name: 'limit', type: 'number', required: false, default: 10, description: 'Max sessions to return' },
        { name: 'includeTests', type: 'boolean', required: false, default: false, description: 'Include test sessions' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        // This will be implemented by the metrics server
        return { sessions: [], message: 'Delegate to metrics server' };
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'refresh',
      name: 'Refresh Dashboard',
      description: 'Force refresh all dashboard data',
      params: [],
      requiresGame: false,
      handler: async () => {
        return { success: true, message: 'Dashboard refreshed' };
      },
    }),
  ],
});

capabilityRegistry.register(overviewCapability);
