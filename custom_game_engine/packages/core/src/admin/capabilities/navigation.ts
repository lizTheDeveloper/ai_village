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

const MOVEMENT_MODE_OPTIONS = [
  { value: 'walking', label: 'Walking' },
  { value: 'running', label: 'Running' },
  { value: 'sneaking', label: 'Sneaking' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'flying', label: 'Flying' },
  { value: 'climbing', label: 'Climbing' },
] as const;

const PATHFINDING_ALGO_OPTIONS = [
  { value: 'astar', label: 'A* (Default)' },
  { value: 'dijkstra', label: 'Dijkstra' },
  { value: 'bfs', label: 'Breadth-First' },
  { value: 'direct', label: 'Direct Line' },
] as const;

const DESTINATION_TYPE_OPTIONS = [
  { value: 'point', label: 'Point Coordinate' },
  { value: 'entity', label: 'Entity' },
  { value: 'building', label: 'Building' },
  { value: 'resource', label: 'Resource' },
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Workplace' },
] as const;

// ============================================================================
// QUERIES
// ============================================================================

const getAgentMovement = defineQuery({
  id: 'get-agent-movement',
  name: 'Get Agent Movement',
  description: 'Get movement state for an agent',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    const position = entity.getComponent('position') as any;
    const velocity = entity.getComponent('velocity') as any;
    const steering = entity.getComponent('steering') as any;
    const path = entity.getComponent('path') as any;
    const destination = entity.getComponent('destination') as any;

    return {
      success: true,
      data: {
        agentId,
        position: position ? { x: position.x, y: position.y } : null,
        velocity: velocity ? { vx: velocity.vx || 0, vy: velocity.vy || 0 } : null,
        speed: velocity ? Math.sqrt((velocity.vx || 0) ** 2 + (velocity.vy || 0) ** 2) : 0,
        steering: steering ? {
          maxSpeed: steering.maxSpeed || 1,
          maxForce: steering.maxForce || 0.1,
          mass: steering.mass || 1,
          arrivalRadius: steering.arrivalRadius || 1,
        } : null,
        destination: destination ? {
          x: destination.x,
          y: destination.y,
          type: destination.destinationType || 'point',
          targetId: destination.targetId,
        } : null,
        path: path ? {
          hasPath: true,
          pathLength: path.waypoints?.length || 0,
          currentWaypointIndex: path.currentIndex || 0,
          remainingWaypoints: path.waypoints?.length - (path.currentIndex || 0) || 0,
        } : { hasPath: false },
        isMoving: velocity ? (velocity.vx !== 0 || velocity.vy !== 0) : false,
      },
    };
  },
});

const listMovingAgents = defineQuery({
  id: 'list-moving-agents',
  name: 'List Moving Agents',
  description: 'List all agents currently in motion',
  parameters: [
    {
      name: 'minSpeed',
      type: 'number',
      description: 'Minimum speed threshold',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
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

    // Sort by speed descending
    results.sort((a, b) => b.speed - a.speed);

    return {
      success: true,
      data: {
        count: results.length,
        agents: results,
      },
    };
  },
});

const getPathfindingStats = defineQuery({
  id: 'get-pathfinding-stats',
  name: 'Get Pathfinding Stats',
  description: 'Get pathfinding system statistics',
  parameters: [],
  execute: async (_params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Count agents with paths
    const agentsWithPaths = world.query().with('path').executeEntities();
    const agentsWithDestinations = world.query().with('destination').executeEntities();
    const agentsWithSteering = world.query().with('steering').executeEntities();

    let totalPathLength = 0;
    let completedPaths = 0;
    let activePaths = 0;

    for (const entity of agentsWithPaths) {
      const path = entity.getComponent('path') as any;
      if (path?.waypoints) {
        totalPathLength += path.waypoints.length;
        if (path.completed) {
          completedPaths++;
        } else {
          activePaths++;
        }
      }
    }

    return {
      success: true,
      data: {
        agentsWithPaths: agentsWithPaths.length,
        agentsWithDestinations: agentsWithDestinations.length,
        agentsWithSteering: agentsWithSteering.length,
        activePaths,
        completedPaths,
        averagePathLength: agentsWithPaths.length > 0 ? totalPathLength / agentsWithPaths.length : 0,
      },
    };
  },
});

const findPath = defineQuery({
  id: 'find-path',
  name: 'Find Path',
  description: 'Calculate a path between two points (dry run)',
  parameters: [
    {
      name: 'startX',
      type: 'number',
      description: 'Start X coordinate',
      required: true,
    },
    {
      name: 'startY',
      type: 'number',
      description: 'Start Y coordinate',
      required: true,
    },
    {
      name: 'endX',
      type: 'number',
      description: 'End X coordinate',
      required: true,
    },
    {
      name: 'endY',
      type: 'number',
      description: 'End Y coordinate',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const startX = params.startX as number;
    const startY = params.startY as number;
    const endX = params.endX as number;
    const endY = params.endY as number;

    // Calculate straight-line distance
    const dx = endX - startX;
    const dy = endY - startY;
    const straightLineDistance = Math.sqrt(dx * dx + dy * dy);

    // This would normally call the actual pathfinding system
    // For now, return an estimate
    return {
      success: true,
      data: {
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        straightLineDistance,
        estimatedPathLength: straightLineDistance * 1.2, // Assume 20% longer for obstacles
        reachable: true,
        message: 'Path calculation - actual implementation depends on navigation system',
      },
    };
  },
});

const getAgentDestinations = defineQuery({
  id: 'get-agent-destinations',
  name: 'Get Agent Destinations',
  description: 'List all agents with active destinations',
  parameters: [
    {
      name: 'destinationType',
      type: 'select',
      description: 'Filter by destination type',
      required: false,
      options: DESTINATION_TYPE_OPTIONS.map(o => o.value),
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
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

    // Sort by distance
    results.sort((a, b) => b.distance - a.distance);

    return {
      success: true,
      data: {
        count: results.length,
        agents: results,
      },
    };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

const setDestination = defineAction({
  id: 'set-destination',
  name: 'Set Destination',
  description: 'Set a destination for an agent',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID',
      required: true,
    },
    {
      name: 'x',
      type: 'number',
      description: 'Destination X coordinate',
      required: true,
    },
    {
      name: 'y',
      type: 'number',
      description: 'Destination Y coordinate',
      required: true,
    },
    {
      name: 'destinationType',
      type: 'select',
      description: 'Type of destination',
      required: false,
      options: DESTINATION_TYPE_OPTIONS.map(o => o.value),
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const x = params.x as number;
    const y = params.y as number;
    const destinationType = (params.destinationType as string) || 'point';

    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    // Add or update destination component
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

    // Emit destination set event
    world.eventBus.emit({
      type: 'navigation:destination_set',
      source: agentId,
      data: {
        agentId,
        destination: { x, y },
        destinationType,
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Destination set for ${agentId} to (${x}, ${y})`,
    };
  },
});

const clearDestination = defineAction({
  id: 'clear-destination',
  name: 'Clear Destination',
  description: 'Clear an agent\'s current destination',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;

    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    // Remove destination component
    const dest = entity.getComponent('destination');
    if (dest) {
      (entity as any).removeComponent('destination');
    }

    // Also clear any path
    const path = entity.getComponent('path');
    if (path) {
      (entity as any).removeComponent('path');
    }

    return {
      success: true,
      message: `Destination cleared for ${agentId}`,
    };
  },
});

const teleportAgent = defineAction({
  id: 'teleport-agent',
  name: 'Teleport Agent',
  description: 'Instantly move an agent to a new position',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID',
      required: true,
    },
    {
      name: 'x',
      type: 'number',
      description: 'Target X coordinate',
      required: true,
    },
    {
      name: 'y',
      type: 'number',
      description: 'Target Y coordinate',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const x = params.x as number;
    const y = params.y as number;

    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    const oldPos = entity.getComponent('position') as any;
    const oldX = oldPos?.x || 0;
    const oldY = oldPos?.y || 0;

    // Update position
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
    const dest = entity.getComponent('destination');
    if (dest) {
      (entity as any).removeComponent('destination');
    }
    const path = entity.getComponent('path');
    if (path) {
      (entity as any).removeComponent('path');
    }

    // Emit teleport event
    world.eventBus.emit({
      type: 'navigation:teleported',
      source: agentId,
      data: {
        agentId,
        from: { x: oldX, y: oldY },
        to: { x, y },
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Teleported ${agentId} from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${x}, ${y})`,
    };
  },
});

const setMovementSpeed = defineAction({
  id: 'set-movement-speed',
  name: 'Set Movement Speed',
  description: 'Set the movement speed for an agent',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID',
      required: true,
    },
    {
      name: 'maxSpeed',
      type: 'number',
      description: 'Maximum speed (tiles per second)',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const maxSpeed = params.maxSpeed as number;

    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
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

    // Create steering component if it doesn't exist
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
});

const stopAgent = defineAction({
  id: 'stop-agent',
  name: 'Stop Agent',
  description: 'Stop an agent immediately',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;

    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

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
      message: `Agent ${agentId} stopped`,
    };
  },
});

const moveToEntity = defineAction({
  id: 'move-to-entity',
  name: 'Move To Entity',
  description: 'Move an agent towards another entity',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent to move',
      required: true,
    },
    {
      name: 'targetId',
      type: 'string',
      description: 'Target entity ID',
      required: true,
    },
    {
      name: 'followDistance',
      type: 'number',
      description: 'Distance to maintain from target',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const targetId = params.targetId as string;
    const followDistance = (params.followDistance as number) || 1;

    const entity = world.getEntity(agentId);
    const target = world.getEntity(targetId);

    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }
    if (!target) {
      return { success: false, error: `Target ${targetId} not found` };
    }

    const targetPos = target.getComponent('position') as any;
    if (!targetPos) {
      return { success: false, error: `Target ${targetId} has no position` };
    }

    // Set destination to target's position
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
});

// ============================================================================
// CAPABILITY REGISTRATION
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
    getAgentMovement,
    listMovingAgents,
    getPathfindingStats,
    findPath,
    getAgentDestinations,
  ],
  actions: [
    setDestination,
    clearDestination,
    teleportAgent,
    setMovementSpeed,
    stopAgent,
    moveToEntity,
  ],
});

capabilityRegistry.register(navigationCapability);

export { navigationCapability };
