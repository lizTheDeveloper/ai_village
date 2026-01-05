/**
 * Universes Capability - Manage running game universes
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

const universesCapability = defineCapability({
  id: 'universes',
  name: 'Universes',
  description: 'Manage running game universes - spawn, stop, fork, and monitor',
  category: 'universes',

  tab: {
    icon: '🌌',
    priority: 5,
  },

  queries: [
    defineQuery({
      id: 'list-universes',
      name: 'List Running Universes',
      description: 'List all running game instances',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        // Delegate to metrics server's headless list
        return { universes: [], message: 'Delegate to /api/headless/list' };
      },
    }),

    defineQuery({
      id: 'get-universe',
      name: 'Get Universe Details',
      description: 'Get detailed info about a specific universe',
      params: [
        { name: 'session', type: 'session-id', required: true, description: 'Session ID of the universe' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/universe' };
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'spawn-universe',
      name: 'Spawn New Universe',
      description: 'Start a new headless game universe',
      params: [
        { name: 'name', type: 'string', required: false, description: 'Universe name (auto-generated if not provided)' },
        { name: 'agentCount', type: 'number', required: false, default: 5, description: 'Initial number of agents' },
        { name: 'seed', type: 'string', required: false, description: 'Random seed for deterministic generation' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/headless/spawn' };
      },
    }),

    defineAction({
      id: 'stop-universe',
      name: 'Stop Universe',
      description: 'Stop a running game universe',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'session', type: 'session-id', required: true, description: 'Session ID to stop' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/headless/stop' };
      },
    }),

    defineAction({
      id: 'fork-universe',
      name: 'Fork Universe',
      description: 'Create a new universe branch from a save point',
      params: [
        { name: 'session', type: 'session-id', required: true, description: 'Source session ID' },
        { name: 'saveName', type: 'string', required: true, description: 'Save point to fork from' },
        { name: 'newName', type: 'string', required: false, description: 'Name for the new universe' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/fork' };
      },
    }),
  ],
});

capabilityRegistry.register(universesCapability);
