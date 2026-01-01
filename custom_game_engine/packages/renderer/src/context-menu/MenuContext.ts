/**
 * MenuContext - Context detection for radial menu
 *
 * Detects what was clicked and builds a context object with target info
 * and available actions.
 */

import { EntityImpl } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { Camera } from '../Camera.js';
import type { ContextType } from './types.js';

/**
 * Context information for menu actions.
 */
export class MenuContext {
  /** Screen coordinates of click */
  public readonly screenPosition: { x: number; y: number };

  /** World coordinates of click */
  public readonly worldPosition: { x: number; y: number; z: number };

  /** Type of target clicked */
  public readonly targetType: ContextType;

  /** ID of target entity (null for empty tiles) */
  public readonly targetEntity: string | null;

  /** IDs of currently selected entities */
  public readonly selectedEntities: string[];

  /** Whether the clicked tile is walkable */
  public readonly isWalkable: boolean;

  /** Whether the clicked tile is buildable */
  public readonly isBuildable: boolean;

  private constructor(
    screenPosition: { x: number; y: number },
    worldPosition: { x: number; y: number; z: number },
    targetType: ContextType,
    targetEntity: string | null,
    selectedEntities: string[],
    isWalkable: boolean,
    isBuildable: boolean
  ) {
    this.screenPosition = screenPosition;
    this.worldPosition = worldPosition;
    this.targetType = targetType;
    this.targetEntity = targetEntity;
    this.selectedEntities = selectedEntities;
    this.isWalkable = isWalkable;
    this.isBuildable = isBuildable;
  }

  /**
   * Create MenuContext from a screen click position.
   */
  public static fromClick(
    world: World,
    camera: Camera,
    screenX: number,
    screenY: number
  ): MenuContext {
    // Validate inputs
    if (!world) {
      throw new Error('MenuContext.fromClick requires valid world');
    }
    if (!camera) {
      throw new Error('MenuContext.fromClick requires valid camera');
    }
    if (isNaN(screenX) || isNaN(screenY)) {
      throw new Error('MenuContext.fromClick requires valid screen coordinates');
    }
    if (screenX < 0 || screenY < 0) {
      throw new Error('MenuContext.fromClick requires non-negative screen coordinates');
    }

    // Convert screen to world coordinates (in pixels)
    const worldPosPixels = camera.screenToWorld(screenX, screenY);

    // Convert world pixels to tile coordinates
    // NOTE: Tile size is 16 pixels (from Renderer.tileSize)
    const TILE_SIZE = 16;
    const worldPosTiles = {
      x: worldPosPixels.x / TILE_SIZE,
      y: worldPosPixels.y / TILE_SIZE,
      z: worldPosPixels.z
    };

    // Find entities at this position
    // Click radius in TILES (was in pixels before, which was too small)
    const clickRadiusTiles = 1.5; // 1.5 tiles = reasonable click tolerance
    const entitiesAtPosition = this.getEntitiesNearPosition(
      world,
      worldPosTiles.x,
      worldPosTiles.y,
      clickRadiusTiles
    );

    // Determine target type and entity with priority order: agent > building > resource
    let targetType: ContextType = 'empty_tile';
    let targetEntity: string | null = null;

    // Priority 1: Agents
    const agent = entitiesAtPosition.find(e => e.components.has('agent'));
    if (agent) {
      targetType = 'agent';
      targetEntity = agent.id;
    } else {
      // Priority 2: Buildings
      const building = entitiesAtPosition.find(e => e.components.has('building'));
      if (building) {
        targetType = 'building';
        targetEntity = building.id;
      } else {
        // Priority 3: Harvestable resources
        const resource = entitiesAtPosition.find(e => e.components.has('harvestable'));
        if (resource) {
          targetType = 'resource';
          targetEntity = resource.id;
        }
      }
    }

    // Get selected entities
    const selectedEntities = this.getSelectedEntityIds(world);

    // Check if tile is walkable and buildable (for empty tiles)
    // Use TILE coordinates for these checks
    const isWalkable = this.checkWalkable(world, worldPosTiles.x, worldPosTiles.y);
    const isBuildable = this.checkBuildable(world, worldPosTiles.x, worldPosTiles.y);

    return new MenuContext(
      { x: screenX, y: screenY },
      worldPosTiles, // Use tile coordinates for world position
      targetType,
      targetEntity,
      selectedEntities,
      isWalkable,
      isBuildable
    );
  }

  /**
   * Check if any entities are selected.
   */
  public hasSelection(): boolean {
    return this.selectedEntities.length > 0;
  }

  /**
   * Get count of selected entities.
   */
  public getSelectedCount(): number {
    return this.selectedEntities.length;
  }

  /**
   * Check if any selected entities are agents.
   */
  public hasSelectedAgents(): boolean {
    return this.selectedEntities.length > 0;
  }

  /**
   * Get the target entity object.
   */
  public getTargetEntity(world: World): Entity | null {
    if (!this.targetEntity) {
      return null;
    }
    return world.getEntity(this.targetEntity) || null;
  }

  /**
   * Get array of selected entity objects.
   */
  public getSelectedEntities(world: World): Entity[] {
    return this.selectedEntities
      .map(id => world.getEntity(id))
      .filter((e): e is Entity => e !== null);
  }

  /**
   * Check if a specific action is applicable to this context.
   * Used for basic action filtering.
   */
  public isActionApplicable(actionId: string): boolean {
    switch (actionId) {
      case 'move_here':
        return this.hasSelection() && this.isWalkable;

      case 'follow':
        return this.targetType === 'agent' && this.hasSelection();

      case 'talk_to':
        return this.targetType === 'agent';

      case 'inspect':
        return this.targetEntity !== null;

      case 'enter':
        return this.targetType === 'building';

      case 'repair':
        // Only shown for damaged buildings (health < 1.0)
        return this.targetType === 'building';

      case 'demolish':
        return this.targetType === 'building';

      case 'build':
        return this.targetType === 'empty_tile' && this.isBuildable;

      case 'harvest':
        return this.targetType === 'resource';

      case 'assign_worker':
        return this.targetType === 'resource' && this.hasSelection();

      case 'prioritize':
        return this.targetType === 'resource';

      case 'info':
        return this.targetEntity !== null;

      case 'move_all_here':
        return this.hasSelection() && this.isWalkable && this.targetType === 'empty_tile';

      case 'create_group':
        return this.getSelectedCount() > 1;

      case 'scatter':
        return this.hasSelection() && this.targetType === 'empty_tile';

      case 'formation':
        return this.getSelectedCount() > 1;

      case 'place_waypoint':
        return this.targetType === 'empty_tile';

      case 'focus_camera':
        return true; // Always available

      case 'tile_info':
        return this.targetType === 'empty_tile';

      default:
        return false;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get entities near a world position.
   * @param x - X coordinate in TILE units (not pixels)
   * @param y - Y coordinate in TILE units (not pixels)
   * @param radius - Detection radius in TILE units
   */
  private static getEntitiesNearPosition(
    world: World,
    x: number,
    y: number,
    radius: number
  ): Entity[] {
    const entities: Entity[] = [];
    const radiusSquared = radius * radius;

    // Query all entities with position components
    // NOTE: Entity positions are stored in TILE coordinates
    for (const entity of Array.from(world.entities.values())) {
      const pos = (entity as EntityImpl).getComponent('position') as any;
      if (!pos) continue;

      const dx = pos.x - x;
      const dy = pos.y - y;
      const distSquared = dx * dx + dy * dy;

      if (distSquared <= radiusSquared) {
        entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Get IDs of all selected entities.
   */
  private static getSelectedEntityIds(world: World): string[] {
    const selected: string[] = [];

    for (const entity of Array.from(world.entities.values())) {
      const selectable = (entity as EntityImpl).getComponent('selectable') as any;
      if (selectable && selectable.selected === true) {
        selected.push(entity.id);
      }
    }

    return selected;
  }

  /**
   * Check if a tile is walkable.
   */
  private static checkWalkable(_world: World, _x: number, _y: number): boolean {
    // Default to walkable (would integrate with terrain system)
    return true;
  }

  /**
   * Check if a tile is buildable.
   */
  private static checkBuildable(_world: World, _x: number, _y: number): boolean {
    // Default to buildable (would integrate with terrain/building system)
    return true;
  }
}
