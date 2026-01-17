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
        try {
          const response = await fetch(`${context.baseUrl}/api/headless/list`);
          if (!response.ok) {
            return { error: `Failed to fetch: ${response.status}` };
          }
          const data = await response.json();
          return {
            universes: data.games || [],
            total: data.total || 0,
          };
        } catch (err) {
          return { error: `Failed to connect: ${err instanceof Error ? err.message : 'unknown'}` };
        }
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
        const session = params.session as string;
        try {
          const response = await fetch(`${context.baseUrl}/api/headless/list`);
          if (!response.ok) {
            return { error: `Failed to fetch: ${response.status}` };
          }
          const data = await response.json();
          const universe = (data.games || []).find((g: any) => g.sessionId === session);
          if (!universe) {
            return { error: `Universe not found: ${session}` };
          }
          return {
            universe,
            dashboardUrl: `${context.baseUrl}/dashboard?session=${session}`,
          };
        } catch (err) {
          return { error: `Failed to connect: ${err instanceof Error ? err.message : 'unknown'}` };
        }
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
        try {
          const response = await fetch(`${context.baseUrl}/api/headless/spawn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: params.name || undefined,
              agentCount: params.agentCount || 5,
            }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return { success: false, error: err.error || `HTTP ${response.status}` };
          }
          const data = await response.json();
          return {
            success: true,
            sessionId: data.sessionId,
            agentCount: data.agentCount,
            status: data.status,
            dashboardUrl: data.dashboardUrl,
          };
        } catch (err) {
          return { success: false, error: `Failed to spawn: ${err instanceof Error ? err.message : 'unknown'}` };
        }
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
        try {
          const response = await fetch(`${context.baseUrl}/api/headless/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: params.session }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return { success: false, error: err.error || `HTTP ${response.status}` };
          }
          const data = await response.json();
          return {
            success: true,
            sessionId: data.sessionId,
            message: data.message || 'Universe stopped',
          };
        } catch (err) {
          return { success: false, error: `Failed to stop: ${err instanceof Error ? err.message : 'unknown'}` };
        }
      },
    }),

    defineAction({
      id: 'stop-all-universes',
      name: 'Stop All Universes',
      description: 'Stop all running headless game universes',
      dangerous: true,
      requiresConfirmation: true,
      params: [],
      handler: async (params, gameClient, context) => {
        try {
          const response = await fetch(`${context.baseUrl}/api/headless/stop-all`, {
            method: 'POST',
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return { success: false, error: err.error || `HTTP ${response.status}` };
          }
          const data = await response.json();
          return {
            success: true,
            stopped: data.stopped,
            count: data.count,
          };
        } catch (err) {
          return { success: false, error: `Failed to stop all: ${err instanceof Error ? err.message : 'unknown'}` };
        }
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
        // Fork requires the save/load service which runs in the game client
        // For now, return instructions
        return {
          success: false,
          message: 'Fork requires a running game client. Use the Time Travel panel in the game UI.',
        };
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
