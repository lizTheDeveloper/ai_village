/**
 * Saves Capability - Time travel and universe branching
 *
 * Server-first architecture: All saves are stored on the multiverse server.
 * The timeline view shows snapshots as nodes, with canonical events highlighted.
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// Timeline entry from server
interface TimelineEntry {
  tick: number;
  timestamp: number;
  day: number;
  type: 'auto' | 'manual' | 'canonical';
  fileSize: number;
  checksum: string;
  filename: string;
  canonEvent?: {
    type: string;
    title: string;
    description: string;
    importance: number;
  };
  decayPolicy?: {
    neverDecay?: boolean;
    decayAfterTicks?: number;
    preservationReason?: string;
  };
}

interface ServerTimeline {
  universeId: string;
  snapshots: TimelineEntry[];
  lastUpdated: number;
}

const savesCapability = defineCapability({
  id: 'saves',
  name: 'Time Travel',
  description: 'Save/load game state, rewind time, and branch universes',
  category: 'infrastructure',

  tab: {
    icon: '⏱️',
    priority: 70,
  },

  queries: [
    defineQuery({
      id: 'list-saves',
      name: 'Timeline',
      description: 'Show all snapshots as a visual timeline',
      params: [
        { name: 'universeId', type: 'string', required: false, description: 'Universe ID (default: universe:main)' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const universeId = (params as { universeId?: string }).universeId || 'universe:main';

        try {
          // Fetch timeline from multiverse server via orchestration API
          const response = await fetch(`http://localhost:3001/api/multiverse/universe/${encodeURIComponent(universeId)}/timeline`);

          if (!response.ok) {
            if (response.status === 404) {
              return { error: `Universe '${universeId}' not found on server` };
            }
            throw new Error(`Server returned ${response.status}`);
          }

          const timeline: ServerTimeline = await response.json();

          // Sort snapshots by tick for timeline display
          const sortedSnapshots = [...timeline.snapshots].sort((a, b) => {
            // Sort by timestamp (when the save was created)
            return a.timestamp - b.timestamp;
          });

          // Calculate stats
          const stats = {
            total: sortedSnapshots.length,
            canonical: sortedSnapshots.filter(s => s.type === 'canonical').length,
            manual: sortedSnapshots.filter(s => s.type === 'manual').length,
            auto: sortedSnapshots.filter(s => s.type === 'auto').length,
            totalSize: sortedSnapshots.reduce((sum, s) => sum + s.fileSize, 0),
          };

          return {
            universeId: timeline.universeId,
            lastUpdated: timeline.lastUpdated,
            stats,
            snapshots: sortedSnapshots,
          };
        } catch (error: any) {
          // Check if it's a connection error
          if (error.cause?.code === 'ECONNREFUSED') {
            return {
              error: 'Multiverse server not running. Start with: ./start.sh server',
              snapshots: [],
            };
          }
          return { error: error.message, snapshots: [] };
        }
      },
    }),

    defineQuery({
      id: 'get-save',
      name: 'Get Snapshot Details',
      description: 'Get metadata for a specific snapshot',
      params: [
        { name: 'universeId', type: 'string', required: false, description: 'Universe ID (default: universe:main)' },
        { name: 'tick', type: 'number', required: true, description: 'Snapshot tick' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const { tick, universeId = 'universe:main' } = params as { tick: number; universeId?: string };

        try {
          const response = await fetch(
            `http://localhost:3001/api/universe/${encodeURIComponent(universeId)}/snapshot/${tick}`
          );

          if (!response.ok) {
            if (response.status === 404) {
              return { error: `Snapshot at tick ${tick} not found` };
            }
            throw new Error(`Server returned ${response.status}`);
          }

          const data = await response.json();
          return data;
        } catch (error: any) {
          return { error: error.message };
        }
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'save',
      name: 'Create Manual Save',
      description: 'Save current game state to server as a manual checkpoint',
      params: [
        { name: 'name', type: 'string', required: false, description: 'Save name (optional)' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected - cannot create save' };
        }

        try {
          // Send save command to game client via WebSocket
          gameClient.send(JSON.stringify({
            type: 'command',
            command: 'save',
            params: { name: (params as { name?: string }).name, type: 'manual' },
          }));

          return {
            success: true,
            message: 'Save command sent to game. Check timeline for new snapshot.',
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    }),

    defineAction({
      id: 'load',
      name: 'Load Snapshot (Rewind)',
      description: 'Rewind time to a previous snapshot',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'universeId', type: 'string', required: false, description: 'Universe ID (default: universe:main)' },
        { name: 'tick', type: 'number', required: true, description: 'Tick to load' },
      ],
      handler: async (params, gameClient, context) => {
        const { tick, universeId = 'universe:main' } = params as { tick: number; universeId?: string };

        if (!gameClient) {
          return { success: false, error: 'No game connected - cannot load save' };
        }

        try {
          // Send load command to game client
          gameClient.send(JSON.stringify({
            type: 'command',
            command: 'load',
            params: { universeId, tick },
          }));

          return {
            success: true,
            message: `Load command sent for tick ${tick}. Game will rewind to that point.`,
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    }),

    defineAction({
      id: 'fork',
      name: 'Fork Universe',
      description: 'Create a new universe branch from a snapshot',
      params: [
        { name: 'universeId', type: 'string', required: false, description: 'Source universe (default: universe:main)' },
        { name: 'tick', type: 'number', required: true, description: 'Tick to fork from' },
        { name: 'newName', type: 'string', required: false, description: 'Name for new universe' },
      ],
      handler: async (params, gameClient, context) => {
        const { tick, universeId = 'universe:main', newName } = params as {
          tick: number;
          universeId?: string;
          newName?: string;
        };

        try {
          const response = await fetch('http://localhost:3001/api/universe/fork', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceUniverseId: universeId,
              tick,
              name: newName || `Fork from ${universeId} @ tick ${tick}`,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.error || 'Fork failed' };
          }

          const data = await response.json();
          return {
            success: true,
            message: `Universe forked! New universe: ${data.universe?.id || 'created'}`,
            data,
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    }),

    defineAction({
      id: 'auto-save',
      name: 'Trigger Auto-Save',
      description: 'Force an immediate auto-save to server',
      params: [],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected - cannot trigger auto-save' };
        }

        try {
          gameClient.send(JSON.stringify({
            type: 'command',
            command: 'save',
            params: { type: 'auto' },
          }));

          return {
            success: true,
            message: 'Auto-save triggered. Check timeline for new snapshot.',
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    }),
  ],
});

capabilityRegistry.register(savesCapability);
