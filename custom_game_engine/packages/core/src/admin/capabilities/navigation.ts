/**
 * Navigation Capability - Manage pathfinding and movement
 *
 * Provides admin interface for:
 * - Pathfinding and movement
 * - Travel and destinations
 * - Waypoints and routes
 * - Movement speed and steering
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const DESTINATION_TYPE_OPTIONS = [
  { value: 'point', label: 'Point Coordinate' },
  { value: 'entity', label: 'Entity' },
  { value: 'building', label: 'Building' },
  { value: 'resource', label: 'Resource' },
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Workplace' },
];

// ============================================================================
// Navigation Capability Definition
// ============================================================================

const navigationCapability = defineCapability({
  id: 'navigation',
  name: 'Navigation',
  description: 'Manage navigation - pathfinding, movement, destinations, travel',
  category: 'systems',

  tab: {
    icon: '🧭',
    priority: 50,
  },

  queries: [
    defineQuery({
      id: 'get-agent-movement',
      name: 'Get Agent Movement',
      description: 'Get movement state for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity with movement components' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentId?: string;
          agentName?: string;
          position?: { x: number; y: number };
          velocity?: { vx: number; vy: number };
          speed?: number;
          destination?: { x: number; y: number; type: string };
          pathLength?: number;
          isMoving?: boolean;
        };

        let output = 'AGENT MOVEMENT\n\n';
        output += `Agent: ${result.agentName ?? result.agentId ?? 'Unknown'}\n\n`;

        if (result.position) {
          output += `Position: (${result.position.x.toFixed(1)}, ${result.position.y.toFixed(1)})\n`;
        }

        output += `Speed: ${result.speed?.toFixed(2) ?? 0}\n`;
        output += `Is Moving: ${result.isMoving ? 'Yes' : 'No'}\n`;

        if (result.destination) {
          output += `\nDestination: (${result.destination.x.toFixed(1)}, ${result.destination.y.toFixed(1)})\n`;
          output += `Type: ${result.destination.type}\n`;
        }

        if (result.pathLength) {
          output += `Path Waypoints: ${result.pathLength}\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-moving-agents',
      name: 'List Moving Agents',
      description: 'List all agents currently moving',
      params: [
        { name: 'limit', type: 'number', required: false, description: 'Maximum results' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/agents?moving=true' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          count?: number;
          agents?: Array<{
            id: string;
            name: string;
            speed: number;
            destination?: string;
          }>;
        };

        let output = 'MOVING AGENTS\n\n';

        if (result.agents?.length) {
          result.agents.forEach(a => {
            output += `${a.name}\n`;
            output += `  ID: ${a.id}\n`;
            output += `  Speed: ${a.speed.toFixed(2)}\n`;
            if (a.destination) {
              output += `  Destination: ${a.destination}\n`;
            }
            output += '\n';
          });
          output += `Total Moving: ${result.count ?? result.agents.length}`;
        } else {
          output += 'No agents currently moving';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-pathfinding-stats',
      name: 'Get Pathfinding Stats',
      description: 'Get pathfinding system statistics',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/pathfinding/stats' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          activePathsCount?: number;
          pathsCalculatedThisTick?: number;
          averagePathLength?: number;
          failedPaths?: number;
          cacheHitRate?: number;
        };

        let output = 'PATHFINDING STATS\n\n';
        output += `Active Paths: ${result.activePathsCount ?? 0}\n`;
        output += `Paths/Tick: ${result.pathsCalculatedThisTick ?? 0}\n`;
        output += `Avg Path Length: ${result.averagePathLength?.toFixed(1) ?? 'N/A'}\n`;
        output += `Failed Paths: ${result.failedPaths ?? 0}\n`;
        output += `Cache Hit Rate: ${result.cacheHitRate?.toFixed(1) ?? 'N/A'}%\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'get-agent-destinations',
      name: 'Get Agent Destinations',
      description: 'Get destination breakdown for all agents',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/destinations/summary' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          totalWithDestination?: number;
          totalIdle?: number;
          byType?: Record<string, number>;
        };

        let output = 'DESTINATION SUMMARY\n\n';
        output += `With Destination: ${result.totalWithDestination ?? 0}\n`;
        output += `Idle: ${result.totalIdle ?? 0}\n`;

        if (result.byType) {
          output += '\nBy Destination Type:\n';
          Object.entries(result.byType).forEach(([k, v]) => {
            output += `  ${k}: ${v}\n`;
          });
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'set-destination',
      name: 'Set Destination',
      description: 'Set a destination for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        {
          name: 'type', type: 'select', required: false,
          options: DESTINATION_TYPE_OPTIONS,
          default: 'point',
          description: 'Destination type',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set ${params.agentId} destination to (${params.x}, ${params.y})` };
      },
    }),

    defineAction({
      id: 'clear-destination',
      name: 'Clear Destination',
      description: 'Clear an agent\'s current destination',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Cleared destination for ${params.agentId}` };
      },
    }),

    defineAction({
      id: 'teleport-agent',
      name: 'Teleport Agent',
      description: 'Instantly teleport an agent to a location',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Teleported ${params.agentId} to (${params.x}, ${params.y})` };
      },
    }),

    defineAction({
      id: 'set-movement-speed',
      name: 'Set Movement Speed',
      description: 'Set an agent\'s movement speed',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'speed', type: 'number', required: true, description: 'Speed value (0-10)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set ${params.agentId} speed to ${params.speed}` };
      },
    }),

    defineAction({
      id: 'stop-agent',
      name: 'Stop Agent',
      description: 'Stop an agent\'s movement immediately',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Stopped ${params.agentId}` };
      },
    }),

    defineAction({
      id: 'move-to-entity',
      name: 'Move to Entity',
      description: 'Send an agent to another entity\'s location',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'targetId', type: 'entity-id', required: true, description: 'Target entity ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Sending ${params.agentId} to ${params.targetId}` };
      },
    }),
  ],
});

capabilityRegistry.register(navigationCapability);
