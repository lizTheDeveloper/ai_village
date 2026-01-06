/**
 * WanderBehavior - Frontier-seeking wandering with fallback to home bias
 *
 * Agents wander toward unexplored frontier sectors first (like slime molds).
 * When all nearby frontiers are explored, they fall back to home bias.
 * This creates natural "desire paths" rather than random ant trails.
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import { ExplorationStateComponent } from '../../components/ExplorationStateComponent.js';
import { DEFAULT_HOME_PREFERENCES } from '../../components/AgentComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType } from '../../types/ComponentType.js';
import { getPosition } from '../../utils/componentHelpers.js';

/** Maximum distance from home before biasing back (when no frontier) */
const MAX_WANDER_DISTANCE = 20;

/** Beyond this distance, strongly pull back to home */
const CRITICAL_DISTANCE = 32;

/** Bias strength toward frontier (0-1, higher = more direct paths) */
const FRONTIER_BIAS = 0.7;

/** Jitter amount for variety in movement (radians, ~10°) */
const WANDER_JITTER = Math.PI / 18;

/**
 * WanderBehavior - Frontier-seeking wandering
 *
 * Uses exploration state to head toward unexplored areas.
 * Creates direct "desire paths" rather than random walks.
 */
export class WanderBehavior extends BaseBehavior {
  readonly name = 'wander' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const movement = entity.getComponent<MovementComponent>(ComponentType.Movement);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);

    // Per CLAUDE.md: No silent fallbacks - crash on missing required components
    if (!movement) {
      throw new Error(`[WanderBehavior] Entity ${entity.id} missing required 'movement' component`);
    }
    if (!agent) {
      throw new Error(`[WanderBehavior] Entity ${entity.id} missing required 'agent' component`);
    }
    if (!position) {
      throw new Error(`[WanderBehavior] Entity ${entity.id} missing required 'position' component`);
    }

    // Clear idleStartTick when wandering (no longer idle)
    if (agent.idleStartTick !== undefined) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        idleStartTick: undefined,
      }));
    }

    // Enable steering system for wander behavior
    if (entity.hasComponent(ComponentType.Steering)) {
      entity.updateComponent(ComponentType.Steering, (current: any) => ({
        ...current,
        behavior: 'wander',
      }));
    }

    // Get or initialize wander angle and start tick
    let wanderAngle = agent.behaviorState?.wanderAngle as number | undefined;
    let wanderStartTick = agent.behaviorState?.wanderStartTick as number | undefined;

    // Initialize on first wander tick
    if (wanderAngle === undefined) {
      wanderAngle = Math.random() * Math.PI * 2;
    }
    if (wanderStartTick === undefined) {
      wanderStartTick = world.tick;
    }

    // Try frontier-seeking first, fall back to home bias
    const exploration = entity.getComponent(ComponentType.ExplorationState) as ExplorationStateComponent | undefined;

    if (exploration) {
      wanderAngle = this.applyFrontierBias(wanderAngle, position, exploration, agent, world);
    } else {
      // No exploration component - use simple home bias
      wanderAngle = this.applyHomeBias(wanderAngle, position, agent, world);
    }

    // Normalize angle to 0-2π range
    wanderAngle = wanderAngle % (Math.PI * 2);
    if (wanderAngle < 0) wanderAngle += Math.PI * 2;

    // Calculate velocity from angle
    const speed = movement.speed;
    const velocityX = Math.cos(wanderAngle) * speed;
    const velocityY = Math.sin(wanderAngle) * speed;

    // Update movement velocity
    entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
      ...current,
      velocityX,
      velocityY,
    }));

    // Save wander angle and start tick for next tick
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behaviorState: {
        ...current.behaviorState,
        wanderAngle,
        wanderStartTick,
      },
    }));
  }

  /**
   * Apply bias toward unexplored frontier sectors.
   * Creates direct paths to unexplored areas like slime molds.
   */
  private applyFrontierBias(
    wanderAngle: number,
    position: PositionComponent,
    exploration: ExplorationStateComponent,
    agent: AgentComponent,
    world: World
  ): number {
    // Get frontier sectors (unexplored areas adjacent to explored)
    const frontiers = exploration.getFrontierSectors();

    if (frontiers.length === 0) {
      // All explored - fall back to home bias
      return this.applyHomeBias(wanderAngle, position, agent, world);
    }

    // Find closest frontier sector
    const currentSector = exploration.worldToSector(position);
    let closestFrontier = frontiers[0]!; // Safe: we checked frontiers.length > 0 above
    let closestDist = Infinity;

    for (const frontier of frontiers) {
      const dx = frontier.x - currentSector.x;
      const dy = frontier.y - currentSector.y;
      const dist = dx * dx + dy * dy; // squared distance is fine for comparison
      if (dist < closestDist) {
        closestDist = dist;
        closestFrontier = frontier;
      }
    }

    // Calculate angle to closest frontier (convert sector to world coords)
    const frontierWorld = exploration.sectorToWorld({ x: closestFrontier.x, y: closestFrontier.y });
    const angleToFrontier = Math.atan2(
      frontierWorld.y - position.y,
      frontierWorld.x - position.x
    );

    // Apply bias toward frontier with small jitter for natural movement
    const jitter = (Math.random() - 0.5) * WANDER_JITTER;
    const angleDiff = this.normalizeAngle(angleToFrontier - wanderAngle);

    return wanderAngle + angleDiff * FRONTIER_BIAS + jitter;
  }

  /**
   * Get the home position for an agent.
   * Uses assigned bed if available, otherwise falls back to origin (0,0).
   */
  private getHomePosition(agent: AgentComponent, world: World): { x: number; y: number } | null {
    if (agent.assignedBed) {
      const bedEntity = world.entities.get(agent.assignedBed);
      if (bedEntity) {
        const bedPos = getPosition(bedEntity);
        return bedPos ? { x: bedPos.x, y: bedPos.y } : null;
      }
    }
    return null; // No home - agents will use origin (0,0) as fallback
  }

  /**
   * Apply progressive home bias based on distance from home.
   * Uses assigned bed as home anchor, or falls back to origin (0,0).
   * Fallback when no frontiers are available.
   */
  private applyHomeBias(
    wanderAngle: number,
    position: PositionComponent,
    agent: AgentComponent,
    world: World
  ): number {
    // Get home position (assigned bed or fallback to origin)
    const home = this.getHomePosition(agent, world) || { x: 0, y: 0 };
    const homeRadius = agent.homePreferences?.homeRadius ?? DEFAULT_HOME_PREFERENCES.homeRadius;

    // Calculate distance from home
    const dx = position.x - home.x;
    const dy = position.y - home.y;
    const distanceFromHome = Math.sqrt(dx * dx + dy * dy);

    // If outside home radius, bias toward home
    if (distanceFromHome > homeRadius) {
      const angleToHome = Math.atan2(-dy, -dx);
      // Progressive bias: stronger pull when farther from home
      const bias = Math.min(0.8, (distanceFromHome - homeRadius) / homeRadius);
      return wanderAngle + this.normalizeAngle(angleToHome - wanderAngle) * bias;
    }

    // Within home radius - normal random wander
    return wanderAngle + (Math.random() - 0.5) * WANDER_JITTER * 2;
  }

  /**
   * Normalize angle difference to -π to π range.
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function wanderBehavior(entity: EntityImpl, world: World): void {
  const behavior = new WanderBehavior();
  behavior.execute(entity, world);
}
