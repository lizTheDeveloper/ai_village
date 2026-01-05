/**
 * Universes Capability - Manage running game universes
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction, defineLink } from '../CapabilityRegistry.js';

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

    defineQuery({
      id: 'game-server-status',
      name: 'Game Server Status',
      description: 'Check if game server is running and get its URL',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        // Check if game is running on common ports
        const ports = [3000, 3001, 3002];
        for (const port of ports) {
          try {
            const response = await fetch(`http://localhost:${port}/`, { method: 'HEAD' });
            if (response.ok || response.status === 200) {
              return {
                running: true,
                url: `http://localhost:${port}`,
                port: port,
              };
            }
          } catch {
            // Port not responding
          }
        }
        return {
          running: false,
          message: 'Game server not running. Use "Start Game Server" action.',
        };
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'start-game-server',
      name: 'Start Game Server',
      description: 'Start the game dev server with Vite',
      requiresGame: false,
      params: [],
      handler: async (params, gameClient, context) => {
        // This would typically shell out to start the server
        // For now, return instructions
        return {
          success: true,
          message: 'Run ./start.sh gamehost in terminal to start the game server',
          data: {
            command: './start.sh gamehost',
            expectedUrl: 'http://localhost:3000',
          },
        };
      },
    }),

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

  links: [
    defineLink({
      id: 'open-game',
      name: 'Open Game',
      description: 'Open the game in a new browser tab',
      url: 'http://localhost:3000',
      icon: '🎮',
      embeddable: false,
    }),
    defineLink({
      id: 'open-game-session',
      name: 'Open Game (Session)',
      description: 'Open a specific game session',
      url: 'http://localhost:3000/?session={session}',
      icon: '🌌',
      embeddable: false,
    }),
  ],
});

capabilityRegistry.register(universesCapability);
