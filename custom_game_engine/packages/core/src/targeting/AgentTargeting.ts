/**
 * AgentTargeting - Find other agents for social interactions
 *
 * This class provides perception-limited agent targeting.
 * Used for finding agents to follow, talk to, meet with, etc.
 *
 * Part of Phase 2 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import {
  type TargetResult,
  rememberLocation,
  getRememberedLocation,
  forgetLocation,
} from '../services/TargetingAPI.js';
import {
  getAgent,
  getPosition,
  getVision,
  getConversation,
  getRelationship,
  getIdentity,
} from '../utils/componentHelpers.js';

/**
 * Options for agent targeting
 */
export interface AgentTargetingOptions {
  /** Exclude self from results */
  excludeSelf?: boolean;
  /** Filter by agent name */
  name?: string;
  /** Filter by current behavior */
  behavior?: string;
  /** Only find agents that are idle/available */
  idle?: boolean;
  /** Only find agents not in conversation */
  notInConversation?: boolean;
  /** Maximum distance to search */
  maxDistance?: number;
  /** Entity IDs to exclude */
  excludeIds?: Set<string>;
  /** Filter by relationship (friend, acquaintance, etc.) */
  relationshipType?: string;
  /** Minimum relationship score */
  minRelationship?: number;
}

/**
 * Agent target result
 */
export interface AgentTarget {
  entity: Entity;
  name: string;
  behavior: string;
  distance: number;
  position: { x: number; y: number };
  isIdle: boolean;
  inConversation: boolean;
  relationshipScore?: number;
}

/**
 * AgentTargeting Class
 *
 * Usage:
 * ```typescript
 * const targeting = new AgentTargeting();
 *
 * // Find someone to talk to
 * const other = targeting.findNearest(entity, world, {
 *   excludeSelf: true,
 *   notInConversation: true,
 * });
 *
 * // Find a friend
 * const friend = targeting.findNearest(entity, world, {
 *   excludeSelf: true,
 *   minRelationship: 50,
 * });
 *
 * // Find by name
 * const alice = targeting.findByName(entity, world, 'Alice');
 * ```
 */
export class AgentTargeting {
  /**
   * Find the nearest visible agent matching criteria.
   */
  findNearest(
    entity: EntityImpl,
    world: World,
    options: AgentTargetingOptions = {}
  ): AgentTarget | null {
    const position = getPosition(entity);
    const vision = getVision(entity);

    if (!position || !vision) return null;

    const seenAgents = vision.seenAgents || [];
    let nearest: AgentTarget | null = null;
    let nearestDist = Infinity;

    // Get this agent's relationship component for filtering by relationship
    const relationships = getRelationship(entity);

    for (const agentId of seenAgents) {
      // Exclude self
      if (options.excludeSelf && agentId === entity.id) continue;
      if (options.excludeIds?.has(agentId)) continue;

      const agentEntity = world.getEntity(agentId);
      if (!agentEntity) continue;

      const agent = getAgent(agentEntity);
      const agentPos = getPosition(agentEntity);
      const conversation = getConversation(agentEntity);
      const identity = getIdentity(agentEntity);

      if (!agent || !agentPos) continue;

      // Get agent name from identity component
      const agentName = identity?.name || 'Unknown';

      // Check name filter
      if (options.name && agentName !== options.name) continue;

      // Check behavior filter
      if (options.behavior && agent.behavior !== options.behavior) continue;

      // Check idle filter
      const isIdle = agent.behavior === 'idle' || agent.behavior === 'wander';
      if (options.idle && !isIdle) continue;

      // Check conversation filter - use isActive property instead of activeConversation
      const inConversation = conversation?.isActive ?? false;
      if (options.notInConversation && inConversation) continue;

      // Check relationship filter
      if (options.minRelationship !== undefined && relationships) {
        const relationshipData = relationships.relationships.get(agentId);
        const score = relationshipData?.familiarity ?? 0;
        if (score < options.minRelationship) continue;
      }

      // Calculate squared distance for comparison
      const distSquared = this.distanceSquared(position, agentPos);

      // Check max distance (using squared distance)
      if (options.maxDistance !== undefined) {
        const maxDistSquared = options.maxDistance * options.maxDistance;
        if (distSquared > maxDistSquared) continue;
      }

      // Get relationship score if available
      const relationshipScore = relationships?.relationships.get(agentId)?.familiarity;

      // Track nearest
      if (distSquared < nearestDist) {
        nearest = {
          entity: agentEntity,
          name: agentName,
          behavior: agent.behavior,
          distance: Math.sqrt(distSquared), // Only compute actual distance for the result
          position: { x: agentPos.x, y: agentPos.y },
          isIdle,
          inConversation,
          relationshipScore,
        };
        nearestDist = distSquared;
      }
    }

    // Remember location if found
    if (nearest) {
      rememberLocation(entity, `agent:${nearest.name}`, nearest.position, world.tick);
    }

    return nearest;
  }

  /**
   * Find all visible agents matching criteria.
   */
  findAll(
    entity: EntityImpl,
    world: World,
    options: AgentTargetingOptions = {}
  ): AgentTarget[] {
    const position = getPosition(entity);
    const vision = getVision(entity);

    if (!position || !vision) return [];

    const seenAgents = vision.seenAgents || [];
    const results: AgentTarget[] = [];
    const relationships = getRelationship(entity);

    for (const agentId of seenAgents) {
      if (options.excludeSelf && agentId === entity.id) continue;
      if (options.excludeIds?.has(agentId)) continue;

      const agentEntity = world.getEntity(agentId);
      if (!agentEntity) continue;

      const agent = getAgent(agentEntity);
      const agentPos = getPosition(agentEntity);
      const conversation = getConversation(agentEntity);
      const identity = getIdentity(agentEntity);

      if (!agent || !agentPos) continue;

      // Get agent name from identity component
      const agentName = identity?.name || 'Unknown';

      if (options.name && agentName !== options.name) continue;
      if (options.behavior && agent.behavior !== options.behavior) continue;

      const isIdle = agent.behavior === 'idle' || agent.behavior === 'wander';
      if (options.idle && !isIdle) continue;

      const inConversation = conversation?.isActive ?? false;
      if (options.notInConversation && inConversation) continue;

      if (options.minRelationship !== undefined && relationships) {
        const relationshipData = relationships.relationships.get(agentId);
        const score = relationshipData?.familiarity ?? 0;
        if (score < options.minRelationship) continue;
      }

      const distSquared = this.distanceSquared(position, agentPos);
      if (options.maxDistance !== undefined) {
        const maxDistSquared = options.maxDistance * options.maxDistance;
        if (distSquared > maxDistSquared) continue;
      }

      const relationshipScore = relationships?.relationships.get(agentId)?.familiarity;

      results.push({
        entity: agentEntity,
        name: agentName,
        behavior: agent.behavior,
        distance: Math.sqrt(distSquared), // Compute actual distance for result
        position: { x: agentPos.x, y: agentPos.y },
        isIdle,
        inConversation,
        relationshipScore,
      });
    }

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * Find agent by name.
   */
  findByName(
    entity: EntityImpl,
    world: World,
    name: string,
    maxDistance?: number
  ): AgentTarget | null {
    return this.findNearest(entity, world, {
      excludeSelf: true,
      name,
      maxDistance,
    });
  }

  /**
   * Find available conversation partners.
   */
  findConversationPartner(
    entity: EntityImpl,
    world: World,
    maxDistance?: number
  ): AgentTarget | null {
    return this.findNearest(entity, world, {
      excludeSelf: true,
      notInConversation: true,
      maxDistance,
    });
  }

  /**
   * Find friends (agents with positive relationship).
   */
  findFriend(
    entity: EntityImpl,
    world: World,
    minRelationship: number = 30,
    maxDistance?: number
  ): AgentTarget | null {
    return this.findNearest(entity, world, {
      excludeSelf: true,
      minRelationship,
      maxDistance,
    });
  }

  /**
   * Get remembered agent location.
   */
  getRemembered(
    entity: EntityImpl,
    agentName: string,
    maxAge?: number,
    currentTick?: number
  ): { x: number; y: number; tick: number } | null {
    const remembered = getRememberedLocation(entity, `agent:${agentName}`);

    if (!remembered) return null;

    if (maxAge !== undefined && currentTick !== undefined) {
      if (currentTick - remembered.tick > maxAge) {
        return null;
      }
    }

    return remembered;
  }

  /**
   * Forget remembered agent location.
   */
  forgetRemembered(entity: EntityImpl, agentName: string): void {
    forgetLocation(entity, `agent:${agentName}`);
  }

  /**
   * Combined targeting: Find visible agent or fall back to memory.
   */
  findTarget(
    entity: EntityImpl,
    world: World,
    options: AgentTargetingOptions = {}
  ): TargetResult {
    const position = getPosition(entity);
    if (!position) return { type: 'unknown' };

    // First: Try to find visible agent
    const visible = this.findNearest(entity, world, options);
    if (visible) {
      return {
        type: 'visible',
        entity: visible.entity,
        distance: visible.distance,
      };
    }

    // Second: Try remembered location (if searching by name)
    if (options.name) {
      const remembered = this.getRemembered(entity, options.name);
      if (remembered) {
        if (!options.maxDistance) {
          return {
            type: 'remembered',
            position: { x: remembered.x, y: remembered.y },
            tick: remembered.tick,
            category: `agent:${options.name}`,
          };
        }
        const distSquared = this.distanceSquared(position, remembered);
        const maxDistSquared = options.maxDistance * options.maxDistance;
        if (distSquared <= maxDistSquared) {
          return {
            type: 'remembered',
            position: { x: remembered.x, y: remembered.y },
            tick: remembered.tick,
            category: `agent:${options.name}`,
          };
        }
      }
    }

    return { type: 'unknown' };
  }

  /**
   * Calculate squared distance between two positions.
   * PERFORMANCE: Avoids expensive Math.sqrt - use for distance comparisons.
   */
  private distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
  }
}

// ============================================================================
// Standalone functions for simpler usage
// ============================================================================

const agentTargeting = new AgentTargeting();

/**
 * Find nearest visible agent.
 */
export function findNearestAgent(
  entity: Entity,
  world: World,
  options?: AgentTargetingOptions
): AgentTarget | null {
  return agentTargeting.findNearest(entity as EntityImpl, world, options);
}

/**
 * Find all visible agents.
 */
export function findAllAgents(
  entity: Entity,
  world: World,
  options?: AgentTargetingOptions
): AgentTarget[] {
  return agentTargeting.findAll(entity as EntityImpl, world, options);
}

/**
 * Find agent by name.
 */
export function findAgentByName(
  entity: Entity,
  world: World,
  name: string,
  maxDistance?: number
): AgentTarget | null {
  return agentTargeting.findByName(entity as EntityImpl, world, name, maxDistance);
}

/**
 * Find available conversation partner.
 */
export function findConversationPartner(
  entity: Entity,
  world: World,
  maxDistance?: number
): AgentTarget | null {
  return agentTargeting.findConversationPartner(entity as EntityImpl, world, maxDistance);
}

/**
 * Find friend (agent with positive relationship).
 */
export function findFriend(
  entity: Entity,
  world: World,
  minRelationship?: number,
  maxDistance?: number
): AgentTarget | null {
  return agentTargeting.findFriend(entity as EntityImpl, world, minRelationship, maxDistance);
}

/**
 * Find agent target (visible or remembered).
 */
export function findAgentTarget(
  entity: Entity,
  world: World,
  options?: AgentTargetingOptions
): TargetResult {
  return agentTargeting.findTarget(entity as EntityImpl, world, options);
}
