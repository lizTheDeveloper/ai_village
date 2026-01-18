/**
 * ResearchBehavior - Agent conducting research at research buildings
 *
 * Agent navigates to a research building and conducts research to advance technology.
 * Handles:
 * - Finding appropriate research building
 * - Navigating to building
 * - Starting research project
 * - Accumulating research progress
 * - Earning research skill XP
 *
 * Part of Phase 13: Research & Discovery
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { ResearchSystem } from '../../systems/ResearchSystem.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType } from '../../types/ComponentType.js';

/** Distance at which agent can use a research building */
const RESEARCH_DISTANCE = 2.0;

/** Maximum distance to search for research buildings */
const MAX_BUILDING_SEARCH_DISTANCE = 50;

/**
 * State stored in agent.behaviorState for research
 */
interface ResearchBehaviorState {
  /** Research ID to conduct */
  researchId?: string;
  /** Target research building entity ID */
  targetBuildingId?: string;
  /** Whether we've started research */
  researchStarted?: boolean;
  /** Phase: 'find_building' | 'move_to_building' | 'researching' | 'complete' */
  phase?: 'find_building' | 'move_to_building' | 'researching' | 'complete';
  /** Tick when research started */
  startedTick?: number;
  /** Index signature for compatibility */
  [key: string]: unknown;
}

/**
 * ResearchBehavior - Navigate to research building and conduct research
 */
export class ResearchBehavior extends BaseBehavior {
  readonly name = 'research' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);

    if (!position || !agent) {
      return { complete: true, reason: 'Missing required components' };
    }

    // Disable steering so behavior controls movement
    this.disableSteering(entity);

    const state = agent.behaviorState as ResearchBehaviorState;
    const phase = state.phase ?? 'find_building';

    // Execute phase
    switch (phase) {
      case 'find_building':
        return this.findBuilding(entity, world, state);

      case 'move_to_building':
        return this.moveToBuilding(entity, world, state);

      case 'researching':
        return this.conductResearch(entity, world, state);

      case 'complete':
        return { complete: true, reason: 'Research complete' };

      default:
        return { complete: true, reason: `Unknown phase: ${phase}` };
    }
  }

  /**
   * Find nearest research building
   */
  private findBuilding(entity: EntityImpl, world: World, state: ResearchBehaviorState): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) {
      return { complete: true, reason: 'No position component' };
    }

    // Get research system to find research buildings
    const researchSystem = this.getResearchSystem(world);
    if (!researchSystem) {
      return { complete: true, reason: 'No research system available' };
    }

    // Check if we're already at a research building
    if (researchSystem.isAgentAtResearchBuilding(world, entity.id)) {
      // Transition to researching phase
      state.phase = 'researching';
      this.updateAgentState(entity, state);
      return;
    }

    // Find all research buildings
    const buildings = world.query()
      .with(ComponentType.Building)
      .with(ComponentType.Position)
      .executeEntities();

    let nearestBuilding: EntityImpl | null = null;
    let nearestDistance = Infinity;

    for (const building of buildings) {
      const buildingImpl = building as EntityImpl;
      const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
      const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);

      if (!buildingComp || !buildingPos || !buildingComp.isComplete) continue;

      // Check if this is a research building (has research functionality)
      const blueprint = (world as any).buildingRegistry?.tryGet(buildingComp.buildingType);
      if (!blueprint) continue;

      const hasResearch = blueprint.functionality.some((f: any) => f.type === 'research');
      if (!hasResearch) continue;

      // Calculate distance
      const dx = buildingPos.x - position.x;
      const dy = buildingPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance && distance < MAX_BUILDING_SEARCH_DISTANCE) {
        nearestDistance = distance;
        nearestBuilding = buildingImpl;
      }
    }

    if (!nearestBuilding) {
      return { complete: true, reason: 'No research building found nearby' };
    }

    // Set target and move to it
    state.targetBuildingId = nearestBuilding.id;
    state.phase = 'move_to_building';
    this.updateAgentState(entity, state);
  }

  /**
   * Move to target research building
   */
  private moveToBuilding(entity: EntityImpl, world: World, state: ResearchBehaviorState): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) {
      return { complete: true, reason: 'No position component' };
    }

    const targetId = state.targetBuildingId;
    if (!targetId) {
      return { complete: true, reason: 'No target building ID' };
    }

    const targetBuilding = world.getEntity(targetId);
    if (!targetBuilding) {
      // Building no longer exists, restart
      state.phase = 'find_building';
      state.targetBuildingId = undefined;
      this.updateAgentState(entity, state);
      return;
    }

    const targetPos = (targetBuilding as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
    if (!targetPos) {
      return { complete: true, reason: 'Target building has no position' };
    }

    // Calculate distance
    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If within research distance, start researching
    if (distance <= RESEARCH_DISTANCE) {
      state.phase = 'researching';
      this.updateAgentState(entity, state);
      return;
    }

    // Move toward building
    this.moveToward(entity, { x: targetPos.x, y: targetPos.y });
  }

  /**
   * Conduct research at building
   */
  private conductResearch(entity: EntityImpl, world: World, state: ResearchBehaviorState): BehaviorResult | void {
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    if (!agent) {
      return { complete: true, reason: 'No agent component' };
    }

    // Get research system
    const researchSystem = this.getResearchSystem(world);
    if (!researchSystem) {
      return { complete: true, reason: 'No research system available' };
    }

    // Check if still at research building
    if (!researchSystem.isAgentAtResearchBuilding(world, entity.id)) {
      // Not at building anymore, find another
      state.phase = 'find_building';
      state.researchStarted = false;
      this.updateAgentState(entity, state);
      return;
    }

    // Start research if not started (emit event)
    if (!state.researchStarted) {
      // Get available research
      const available = researchSystem.getAvailableResearch(world);
      if (available.length === 0) {
        return { complete: true, reason: 'No research available' };
      }

      // Pick first available research (or use specified researchId)
      const researchToStart = state.researchId ?? available[0]?.id;
      if (!researchToStart) {
        return { complete: true, reason: 'No research to start' };
      }

      // Emit event to start research
      world.eventBus?.emit({
        type: 'research:started',
        source: entity.id,
        data: {
          agentId: entity.id,
          researchId: researchToStart,
          researchers: [entity.id],
        },
      });

      state.researchStarted = true;
      state.researchId = researchToStart;
      state.startedTick = world.tick;
      this.updateAgentState(entity, state);
    }

    // Research ongoing - ResearchSystem handles progress accumulation
    // Stay at building for a while (e.g., 600 ticks = ~30 seconds at 20 TPS)
    const ticksElapsed = world.tick - (state.startedTick ?? world.tick);
    if (ticksElapsed > 600) {
      // Research session complete
      state.phase = 'complete';
      this.updateAgentState(entity, state);
      return { complete: true, reason: 'Research session complete' };
    }

    // Continue researching
    return;
  }

  /**
   * Get ResearchSystem from world
   */
  private getResearchSystem(world: World): ResearchSystem | null {
    interface WorldWithSystems {
      getSystem?: (name: string) => unknown;
    }
    const system = (world as unknown as WorldWithSystems).getSystem?.('research');
    return (system as ResearchSystem) ?? null;
  }

  /**
   * Update agent's behavior state
   */
  private updateAgentState(entity: EntityImpl, state: ResearchBehaviorState): void {
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behaviorState: state,
    }));
  }
}

/**
 * Factory function to create ResearchBehavior
 * @deprecated Use researchBehaviorWithContext instead for better performance
 */
export const researchBehavior = () => new ResearchBehavior();

// ============================================================================
// Modern BehaviorContext Implementation
// ============================================================================

import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('research', researchBehaviorWithContext);
 */
export function researchBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  const state = ctx.getAllState() as Record<string, unknown>;
  const phase = state.phase ?? 'find_building';

  // Execute phase
  switch (phase) {
    case 'find_building':
      return handleFindBuilding(ctx, state);

    case 'move_to_building':
      return handleMoveToBuilding(ctx, state);

    case 'researching':
      return handleConductResearch(ctx, state);

    case 'complete':
      return ctx.complete('Research complete');

    default:
      return ctx.complete(`Unknown phase: ${phase}`);
  }
}

function handleFindBuilding(ctx: BehaviorContext, state: Record<string, unknown>): ContextBehaviorResult | void {
  // Get research system
  const world = (ctx as unknown as { world: World }).world;
  interface WorldWithSystems {
    getSystem?: (name: string) => unknown;
  }
  interface ResearchSystemLike {
    isAgentAtResearchBuilding(world: World, agentId: string): boolean;
  }
  const researchSystem = (world as unknown as WorldWithSystems).getSystem?.('research') as ResearchSystemLike | undefined;

  if (!researchSystem) {
    return ctx.complete('No research system available');
  }

  // Check if we're already at a research building
  if (researchSystem.isAgentAtResearchBuilding(world, ctx.entity.id)) {
    // Transition to researching phase
    ctx.updateState({ phase: 'researching' });
    return;
  }

  // Find nearest research building
  const buildings = ctx.getEntitiesInRadius(MAX_BUILDING_SEARCH_DISTANCE, [CT.Building, CT.Position]);

  let nearestBuilding: { entity: import('../../ecs/Entity.js').Entity; position: { x: number; y: number } } | null = null;
  let nearestDistance = Infinity;

  for (const { entity: buildingEntity, position: buildingPos, distance } of buildings) {
    const buildingImpl = buildingEntity as EntityImpl;
    const buildingComp = buildingImpl.getComponent<BuildingComponent>(CT.Building);

    if (!buildingComp || !buildingComp.isComplete) continue;

    // Check if this is a research building
    interface WorldWithRegistry {
      buildingRegistry?: {
        tryGet(type: string): { functionality: Array<{ type: string }> } | undefined;
      };
    }
    const blueprint = (world as unknown as WorldWithRegistry).buildingRegistry?.tryGet(buildingComp.buildingType);
    if (!blueprint) continue;

    const hasResearch = blueprint.functionality.some((f) => f.type === 'research');
    if (!hasResearch) continue;

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestBuilding = { entity: buildingEntity, position: buildingPos };
    }
  }

  if (!nearestBuilding) {
    return ctx.complete('No research building found nearby');
  }

  // Set target and move to it
  ctx.updateState({
    targetBuildingId: nearestBuilding.entity.id,
    phase: 'move_to_building'
  });
}

function handleMoveToBuilding(ctx: BehaviorContext, state: Record<string, unknown>): ContextBehaviorResult | void {
  const targetId = state.targetBuildingId;
  if (!targetId) {
    return ctx.complete('No target building ID');
  }

  const targetBuilding = ctx.getEntity(targetId);
  if (!targetBuilding) {
    // Building no longer exists, restart
    ctx.updateState({ phase: 'find_building', targetBuildingId: undefined });
    return;
  }

  const targetPos = (targetBuilding as EntityImpl).getComponent<PositionComponent>(CT.Position);
  if (!targetPos) {
    return ctx.complete('Target building has no position');
  }

  // If within research distance, start researching
  if (ctx.isWithinRange(targetPos, RESEARCH_DISTANCE)) {
    ctx.stopMovement();
    ctx.updateState({ phase: 'researching' });
    return;
  }

  // Move toward building
  ctx.moveToward({ x: targetPos.x, y: targetPos.y }, {
    arrivalDistance: RESEARCH_DISTANCE
  });
}

function handleConductResearch(ctx: BehaviorContext, state: Record<string, unknown>): ContextBehaviorResult | void {
  // Get research system
  const world = (ctx as unknown as { world: World }).world;
  interface WorldWithSystems {
    getSystem?: (name: string) => unknown;
  }
  interface ResearchSystemLike {
    isAgentAtResearchBuilding(world: World, agentId: string): boolean;
    getAvailableResearch(world: World): Array<{ id: string }>;
  }
  const researchSystem = (world as unknown as WorldWithSystems).getSystem?.('research') as ResearchSystemLike | undefined;

  if (!researchSystem) {
    return ctx.complete('No research system available');
  }

  // Check if still at research building
  if (!researchSystem.isAgentAtResearchBuilding(world, ctx.entity.id)) {
    // Not at building anymore, find another
    ctx.updateState({
      phase: 'find_building',
      researchStarted: false
    });
    return;
  }

  // Start research if not started
  if (!state.researchStarted) {
    // Get available research
    const available = researchSystem.getAvailableResearch(world);
    if (available.length === 0) {
      return ctx.complete('No research available');
    }

    // Pick first available research (or use specified researchId)
    const researchToStart = state.researchId ?? available[0]?.id;
    if (!researchToStart) {
      return ctx.complete('No research to start');
    }

    // Emit event to start research
    ctx.emit({
      type: 'research:started',
      data: {
        agentId: ctx.entity.id,
        researchId: researchToStart,
        researchers: [ctx.entity.id],
      },
    });

    ctx.updateState({
      researchStarted: true,
      researchId: researchToStart,
      startedTick: ctx.tick
    });
  }

  // Research ongoing - ResearchSystem handles progress accumulation
  // Stay at building for a while (600 ticks = ~30 seconds at 20 TPS)
  const ticksElapsed = ctx.tick - ((state.startedTick as number | undefined) ?? ctx.tick);
  if (ticksElapsed > 600) {
    // Research session complete
    ctx.updateState({ phase: 'complete' });
    return ctx.complete('Research session complete');
  }

  // Continue researching
  return;
}
