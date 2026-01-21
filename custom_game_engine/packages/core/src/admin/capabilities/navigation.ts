/**
 * Navigation Admin Capability
 *
 * Comprehensive navigation control dashboard for LLM:
 * - Pathfinding and movement
 * - Travel and destinations
 * - Waypoints and routes
 * - Movement speed and steering
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// OPTIONS
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
// CAPABILITY DEFINITION
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
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const position = entity.getComponent('position') as any;
        const velocity = entity.getComponent('velocity') as any;
        const steering = entity.getComponent('steering') as any;
        const path = entity.getComponent('path') as any;
        const destination = entity.getComponent('destination') as any;

        const speed = velocity ? Math.sqrt((velocity.vx || 0) ** 2 + (velocity.vy || 0) ** 2) : 0;

        return {
          agentId,
          position: position ? { x: position.x, y: position.y } : null,
          velocity: velocity ? { vx: velocity.vx || 0, vy: velocity.vy || 0 } : null,
          speed,
          steering: steering ? {
            maxSpeed: steering.maxSpeed || 1,
            maxForce: steering.maxForce || 0.1,
          } : null,
          destination: destination ? {
            x: destination.x,
            y: destination.y,
            type: destination.destinationType || 'point',
          } : null,
          hasPath: path !== null && path !== undefined,
          pathLength: path?.waypoints?.length || 0,
          isMoving: speed > 0.01,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'AGENT MOVEMENT\n\n';
        output += `Agent: ${result.agentId}\n`;

        if (result.position) {
          output += `Position: (${result.position.x.toFixed(1)}, ${result.position.y.toFixed(1)})\n`;
        }

        output += `Speed: ${result.speed.toFixed(2)}\n`;
        output += `Is Moving: ${result.isMoving ? 'Yes' : 'No'}\n\n`;

        if (result.destination) {
          output += `Destination: (${result.destination.x.toFixed(1)}, ${result.destination.y.toFixed(1)})\n`;
          output += `Type: ${result.destination.type}\n`;
        }

        if (result.hasPath) {
          output += `Path: ${result.pathLength} waypoints\n`;
        }

        if (result.steering) {
          output += `\nSteering:\n`;
          output += `  Max Speed: ${result.steering.maxSpeed}\n`;
          output += `  Max Force: ${result.steering.maxForce}\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-moving-agents',
      name: 'List Moving Agents',
      description: 'List all agents currently in motion',
      params: [
        { name: 'minSpeed', type: 'number', required: false, description: 'Minimum speed threshold' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const minSpeed = (params.minSpeed as number) || 0.01;
        const movingAgents = world.query().with('agent', 'velocity', 'position').executeEntities();

        const results: Array<{
          id: string;
          name: string;
          position: { x: number; y: number };
          speed: number;
          hasDestination: boolean;
        }> = [];

        for (const entity of movingAgents) {
          const velocity = entity.getComponent('velocity') as any;
          const position = entity.getComponent('position') as any;
          const identity = entity.getComponent('identity') as any;
          const destination = entity.getComponent('destination') as any;

          const speed = Math.sqrt((velocity?.vx || 0) ** 2 + (velocity?.vy || 0) ** 2);

          if (speed >= minSpeed) {
            results.push({
              id: entity.id,
              name: identity?.name || entity.id,
              position: { x: position?.x || 0, y: position?.y || 0 },
              speed,
              hasDestination: destination !== null && destination !== undefined,
            });
          }
        }

        results.sort((a, b) => b.speed - a.speed);

        return {
          count: results.length,
          agents: results,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'MOVING AGENTS\n\n';
        output += `Count: ${result.count}\n\n`;

        for (const agent of result.agents) {
          output += `${agent.name}\n`;
          output += `  Speed: ${agent.speed.toFixed(2)}\n`;
          output += `  Position: (${agent.position.x.toFixed(1)}, ${agent.position.y.toFixed(1)})\n`;
          output += `  Has Destination: ${agent.hasDestination ? 'Yes' : 'No'}\n\n`;
        }

        if (result.count === 0) {
          output += 'No agents currently moving';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-pathfinding-stats',
      name: 'Get Pathfinding Stats',
      description: 'Get pathfinding system statistics',
      params: [],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentsWithPaths = world.query().with('path').executeEntities();
        const agentsWithDestinations = world.query().with('destination').executeEntities();
        const agentsWithSteering = world.query().with('steering').executeEntities();

        let totalPathLength = 0;
        let activePaths = 0;

        for (const entity of agentsWithPaths) {
          const path = entity.getComponent('path') as any;
          if (path?.waypoints) {
            totalPathLength += path.waypoints.length;
            if (!path.completed) {
              activePaths++;
            }
          }
        }

        return {
          agentsWithPaths: agentsWithPaths.length,
          agentsWithDestinations: agentsWithDestinations.length,
          agentsWithSteering: agentsWithSteering.length,
          activePaths,
          averagePathLength: agentsWithPaths.length > 0 ? totalPathLength / agentsWithPaths.length : 0,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'PATHFINDING STATS\n\n';
        output += `Agents with Paths: ${result.agentsWithPaths}\n`;
        output += `Agents with Destinations: ${result.agentsWithDestinations}\n`;
        output += `Agents with Steering: ${result.agentsWithSteering}\n`;
        output += `Active Paths: ${result.activePaths}\n`;
        output += `Average Path Length: ${result.averagePathLength.toFixed(1)} waypoints\n`;
        return output;
      },
    }),

    defineQuery({
      id: 'get-agent-destinations',
      name: 'Get Agent Destinations',
      description: 'List all agents with active destinations',
      params: [
        { name: 'destinationType', type: 'select', required: false, options: DESTINATION_TYPE_OPTIONS, description: 'Filter by type' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const destinationType = params.destinationType as string | undefined;
        const agentsWithDestinations = world.query().with('agent', 'destination', 'position').executeEntities();

        const results: Array<{
          id: string;
          name: string;
          currentPosition: { x: number; y: number };
          destination: { x: number; y: number };
          destinationType: string;
          distance: number;
        }> = [];

        for (const entity of agentsWithDestinations) {
          const dest = entity.getComponent('destination') as any;
          const pos = entity.getComponent('position') as any;
          const identity = entity.getComponent('identity') as any;

          if (destinationType && dest?.destinationType !== destinationType) {
            continue;
          }

          const dx = (dest?.x || 0) - (pos?.x || 0);
          const dy = (dest?.y || 0) - (pos?.y || 0);
          const distance = Math.sqrt(dx * dx + dy * dy);

          results.push({
            id: entity.id,
            name: identity?.name || entity.id,
            currentPosition: { x: pos?.x || 0, y: pos?.y || 0 },
            destination: { x: dest?.x || 0, y: dest?.y || 0 },
            destinationType: dest?.destinationType || 'point',
            distance,
          });
        }

        results.sort((a, b) => b.distance - a.distance);

        return {
          count: results.length,
          agents: results,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'AGENT DESTINATIONS\n\n';
        output += `Count: ${result.count}\n\n`;

        for (const agent of result.agents) {
          output += `${agent.name}\n`;
          output += `  From: (${agent.currentPosition.x.toFixed(1)}, ${agent.currentPosition.y.toFixed(1)})\n`;
          output += `  To: (${agent.destination.x.toFixed(1)}, ${agent.destination.y.toFixed(1)})\n`;
          output += `  Type: ${agent.destinationType}\n`;
          output += `  Distance: ${agent.distance.toFixed(1)}\n\n`;
        }

        if (result.count === 0) {
          output += 'No agents with destinations';
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
        { name: 'x', type: 'number', required: true, description: 'Destination X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Destination Y coordinate' },
        { name: 'destinationType', type: 'select', required: false, options: DESTINATION_TYPE_OPTIONS, description: 'Type' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const x = params.x as number;
        const y = params.y as number;
        const destinationType = (params.destinationType as string) || 'point';

        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const existing = entity.getComponent('destination');
        if (existing) {
          (entity as any).updateComponent('destination', (current: any) => ({
            ...current,
            x,
            y,
            destinationType,
            setAt: world.tick,
          }));
        } else {
          (entity as any).addComponent({
            type: 'destination',
            x,
            y,
            destinationType,
            setAt: world.tick,
          });
        }

        world.eventBus.emit({
          type: 'navigation:destination_set',
          source: agentId,
          data: { agentId, destination: { x, y }, destinationType, tick: world.tick },
        });

        return {
          success: true,
          message: `Destination set for ${agentId} to (${x}, ${y})`,
        };
      },
    }),

    defineAction({
      id: 'clear-destination',
      name: 'Clear Destination',
      description: 'Clear an agent\'s current destination',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;

        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const dest = entity.getComponent('destination');
        if (dest) {
          (entity as any).removeComponent('destination');
        }

        const path = entity.getComponent('path');
        if (path) {
          (entity as any).removeComponent('path');
        }

        return {
          success: true,
          message: `Destination cleared for ${agentId}`,
        };
      },
    }),

    defineAction({
      id: 'teleport-agent',
      name: 'Teleport Agent',
      description: 'Instantly move an agent to a new position',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'x', type: 'number', required: true, description: 'Target X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Target Y coordinate' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const x = params.x as number;
        const y = params.y as number;

        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const oldPos = entity.getComponent('position') as any;
        const oldX = oldPos?.x || 0;
        const oldY = oldPos?.y || 0;

        (entity as any).updateComponent('position', (current: any) => ({
          ...current,
          x,
          y,
        }));

        // Clear velocity
        const velocity = entity.getComponent('velocity');
        if (velocity) {
          (entity as any).updateComponent('velocity', (current: any) => ({
            ...current,
            vx: 0,
            vy: 0,
          }));
        }

        // Clear destination and path
        if (entity.getComponent('destination')) {
          (entity as any).removeComponent('destination');
        }
        if (entity.getComponent('path')) {
          (entity as any).removeComponent('path');
        }

        world.eventBus.emit({
          type: 'navigation:teleported',
          source: agentId,
          data: { agentId, from: { x: oldX, y: oldY }, to: { x, y }, tick: world.tick },
        });

        return {
          success: true,
          message: `Teleported ${agentId} from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${x}, ${y})`,
        };
      },
    }),

    defineAction({
      id: 'set-movement-speed',
      name: 'Set Movement Speed',
      description: 'Set the movement speed for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'maxSpeed', type: 'number', required: true, description: 'Maximum speed' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const maxSpeed = params.maxSpeed as number;

        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const steering = entity.getComponent('steering');
        if (steering) {
          (entity as any).updateComponent('steering', (current: any) => ({
            ...current,
            maxSpeed: Math.max(0.1, maxSpeed),
          }));

          return {
            success: true,
            message: `Max speed set to ${maxSpeed} for ${agentId}`,
          };
        }

        (entity as any).addComponent({
          type: 'steering',
          maxSpeed: Math.max(0.1, maxSpeed),
          maxForce: 0.1,
          mass: 1,
          arrivalRadius: 1,
        });

        return {
          success: true,
          message: `Steering component created with max speed ${maxSpeed} for ${agentId}`,
        };
      },
    }),

    defineAction({
      id: 'stop-agent',
      name: 'Stop Agent',
      description: 'Stop an agent immediately',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;

        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const velocity = entity.getComponent('velocity');
        if (velocity) {
          (entity as any).updateComponent('velocity', (current: any) => ({
            ...current,
            vx: 0,
            vy: 0,
          }));
        }

        if (entity.getComponent('destination')) {
          (entity as any).removeComponent('destination');
        }
        if (entity.getComponent('path')) {
          (entity as any).removeComponent('path');
        }

        return {
          success: true,
          message: `Agent ${agentId} stopped`,
        };
      },
    }),

    defineAction({
      id: 'move-to-entity',
      name: 'Move To Entity',
      description: 'Move an agent towards another entity',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to move' },
        { name: 'targetId', type: 'entity-id', required: true, description: 'Target entity ID' },
        { name: 'followDistance', type: 'number', required: false, description: 'Distance to maintain' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const targetId = params.targetId as string;
        const followDistance = (params.followDistance as number) || 1;

        const entity = world.getEntity(agentId);
        const target = world.getEntity(targetId);

        if (!entity) throw new Error(`Agent ${agentId} not found`);
        if (!target) throw new Error(`Target ${targetId} not found`);

        const targetPos = target.getComponent('position') as any;
        if (!targetPos) {
          throw new Error(`Target ${targetId} has no position`);
        }

        const existing = entity.getComponent('destination');
        if (existing) {
          (entity as any).updateComponent('destination', (current: any) => ({
            ...current,
            x: targetPos.x,
            y: targetPos.y,
            destinationType: 'entity',
            targetId,
            followDistance,
            setAt: world.tick,
          }));
        } else {
          (entity as any).addComponent({
            type: 'destination',
            x: targetPos.x,
            y: targetPos.y,
            destinationType: 'entity',
            targetId,
            followDistance,
            setAt: world.tick,
          });
        }

        return {
          success: true,
          message: `${agentId} moving to ${targetId} at (${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)})`,
        };
      },
    }),
  ],
});

capabilityRegistry.register(navigationCapability);

export { navigationCapability };
