/**
 * TileBuildBehavior - Place tiles in a construction task.
 *
 * This behavior handles the actual construction work after materials
 * have been delivered to the site. Agents stand at the tile location
 * and work to place the tile.
 *
 * State Machine:
 * 1. moving_to_tile - Navigate to the tile to build
 * 2. building - Working on placing the tile
 * 3. complete - Tile placed, check for more work
 *
 * Per CLAUDE.md: No silent fallbacks.
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { SkillsComponent } from '../../components/SkillsComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { getPosition } from '../../utils/componentHelpers.js';
import { ComponentType } from '../../types/ComponentType.js';
import {
  getTileConstructionSystem,
  type ConstructionTask,
} from '../../systems/TileConstructionSystem.js';

/**
 * Build state in the state machine.
 */
type BuildState = 'moving_to_tile' | 'building' | 'complete';

/**
 * Behavior state stored in agent.behaviorState.
 */
interface TileBuildState {
  /** Current state in the state machine */
  buildState: BuildState;
  /** Task ID we're working on */
  taskId: string;
  /** Tile index we're building */
  tileIndex: number;
  /** Work accumulated on current tile */
  workProgress: number;
}

/** Base build speed (progress per second) */
const BASE_BUILD_SPEED = 10;

/** How much building skill improves speed per level */
const SKILL_SPEED_MULTIPLIER = 0.15; // +15% per level

/**
 * TileBuildBehavior - Place tiles for voxel construction.
 */
export class TileBuildBehavior extends BaseBehavior {
  readonly name = 'tile_build' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = getPosition(entity);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);

    if (!position || !agent) {
      return { complete: true, reason: 'Missing required components' };
    }

    // Get behavior state
    const state = this.getBuildState(agent);
    if (!state) {
      return { complete: true, reason: 'No build state set' };
    }

    // Get the construction system
    const constructionSystem = getTileConstructionSystem();
    const task = constructionSystem.getTask(state.taskId);

    if (!task || task.state !== 'in_progress') {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Task not found or not in progress' };
    }

    // Execute state machine
    switch (state.buildState) {
      case 'moving_to_tile':
        return this.handleMovingToTile(entity, world, state, task);

      case 'building':
        return this.handleBuilding(entity, world, state, task);

      case 'complete':
        return this.checkForMoreWork(entity, world, task);
    }
  }

  /**
   * Move to the tile we're going to build.
   */
  private handleMovingToTile(
    entity: EntityImpl,
    _world: World,
    state: TileBuildState,
    task: ConstructionTask
  ): BehaviorResult | void {
    const tile = task.tiles[state.tileIndex];
    if (!tile) {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Tile not found' };
    }

    // Check if tile still needs building
    if (tile.status !== 'in_progress' || tile.progress >= 100) {
      this.updateBuildState(entity, {
        ...state,
        buildState: 'complete',
      });
      return { complete: false, reason: 'Tile already complete' };
    }

    const tilePosition = { x: tile.x, y: tile.y };
    const distance = this.moveToward(entity, tilePosition, {
      arrivalDistance: 1.5,
    });

    if (distance <= 1.5) {
      // Arrived at tile
      this.stopAllMovement(entity);

      // Register as builder
      const constructionSystem = getTileConstructionSystem();
      constructionSystem.registerBuilder(state.taskId, entity.id);

      this.updateBuildState(entity, {
        ...state,
        buildState: 'building',
        workProgress: 0,
      });
    }

    return { complete: false, reason: `Moving to build site (${distance.toFixed(1)} away)` };
  }

  /**
   * Build the tile - add progress until complete.
   */
  private handleBuilding(
    entity: EntityImpl,
    world: World,
    state: TileBuildState,
    task: ConstructionTask
  ): BehaviorResult | void {
    const tile = task.tiles[state.tileIndex];
    if (!tile) {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Tile not found' };
    }

    // Check if tile is done (another builder might have finished it)
    if (tile.status === 'placed' || tile.progress >= 100) {
      this.updateBuildState(entity, {
        ...state,
        buildState: 'complete',
      });
      return { complete: false, reason: 'Tile complete' };
    }

    // Calculate build speed based on skill
    const buildSpeed = this.calculateBuildSpeed(entity);

    // Advance construction
    const constructionSystem = getTileConstructionSystem();
    const completed = constructionSystem.advanceProgress(
      world,
      state.taskId,
      state.tileIndex,
      entity.id,
      buildSpeed
    );

    if (completed) {
      // Tile is done
      this.updateBuildState(entity, {
        ...state,
        buildState: 'complete',
      });
      return { complete: false, reason: 'Tile placed successfully' };
    }

    // Track progress for feedback
    const newProgress = (state.workProgress ?? 0) + buildSpeed;
    this.updateBuildState(entity, {
      ...state,
      workProgress: newProgress,
    });

    return {
      complete: false,
      reason: `Building tile (${Math.round(tile.progress)}% complete)`,
    };
  }

  /**
   * Check if there's more work to do on this task.
   */
  private checkForMoreWork(
    entity: EntityImpl,
    _world: World,
    task: ConstructionTask
  ): BehaviorResult | void {
    const constructionSystem = getTileConstructionSystem();

    // First check if there are tiles that need building
    const nextBuildTile = constructionSystem.getNextTileForConstruction(task.id);
    if (nextBuildTile) {
      this.updateBuildState(entity, {
        buildState: 'moving_to_tile',
        taskId: task.id,
        tileIndex: nextBuildTile.index,
        workProgress: 0,
      });
      return { complete: false, reason: 'Starting next tile' };
    }

    // Check if there are tiles needing materials - switch to transport
    const nextMaterialTile = constructionSystem.getNextTileNeedingMaterials(task.id);
    if (nextMaterialTile) {
      this.switchTo(entity, 'material_transport', {
        transportState: 'finding_storage',
        taskId: task.id,
        tileIndex: nextMaterialTile.index,
        materialId: nextMaterialTile.tile.materialId,
        carryingAmount: 0,
      });
      return { complete: true, reason: 'Switching to material transport' };
    }

    // Task is fully complete
    constructionSystem.unregisterBuilder(task.id, entity.id);
    this.switchTo(entity, 'wander', {});
    return { complete: true, reason: 'Construction task complete!' };
  }

  /**
   * Calculate build speed based on agent's building skill.
   */
  private calculateBuildSpeed(entity: EntityImpl): number {
    const skills = entity.getComponent<SkillsComponent>(ComponentType.Skills);

    const buildingLevel = skills?.levels?.building ?? 0;

    // Apply skill multiplier
    const speedMultiplier = 1 + (buildingLevel * SKILL_SPEED_MULTIPLIER);
    return BASE_BUILD_SPEED * speedMultiplier;
  }

  /**
   * Get build state from agent.
   */
  private getBuildState(agent: AgentComponent): TileBuildState | null {
    const state = agent.behaviorState as Partial<TileBuildState>;
    if (!state.taskId || state.tileIndex === undefined) {
      return null;
    }
    return {
      buildState: state.buildState ?? 'moving_to_tile',
      taskId: state.taskId,
      tileIndex: state.tileIndex,
      workProgress: state.workProgress ?? 0,
    };
  }

  /**
   * Update build state on agent.
   */
  private updateBuildState(
    entity: EntityImpl,
    state: TileBuildState
  ): void {
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behaviorState: state as unknown as Record<string, unknown>,
    }));
  }
}

/**
 * Factory function for behavior registry.
 */
export function tileBuildBehavior(entity: EntityImpl, world: World): void {
  const behavior = new TileBuildBehavior();
  behavior.execute(entity, world);
}
