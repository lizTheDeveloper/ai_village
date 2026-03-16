/**
 * MenuContext - Context detection for radial menu
 *
 * Detects what was clicked and builds a context object with target info
 * and available actions.
 */

import type { World, Entity } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
import type { Camera } from '../Camera.js';
import type { ContextType } from './types.js';

/**
 * Context information for menu actions.
 */
export class MenuContext {
  /** Screen coordinates of click */
  readonly screenPosition: { x: number; y: number };
  /** World coordinates of click */
  readonly worldPosition: { x: number; y: number; z: number };
  /** Type of target clicked */
  readonly targetType: ContextType;
  /** ID of target entity (null for empty tiles) */
  readonly targetEntity: string | null;
  /** IDs of currently selected entities */
  readonly selectedEntities: string[];
  /** Whether the clicked tile is walkable */
  readonly isWalkable: boolean;
  /** Whether the clicked tile is buildable */
  readonly isBuildable: boolean;

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
  static fromClick(world: World, camera: Camera, screenX: number, screenY: number): MenuContext {
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

    const worldPosPixels = camera.screenToWorld(screenX, screenY);
    const TILE_SIZE = 16;
    const worldPosTiles = {
      x: worldPosPixels.x / TILE_SIZE,
      y: worldPosPixels.y / TILE_SIZE,
      z: worldPosPixels.z,
    };

    const clickRadiusTiles = 1.5;
    const entitiesAtPosition = this.getEntitiesNearPosition(
      world,
      worldPosTiles.x,
      worldPosTiles.y,
      clickRadiusTiles
    );

    let targetType: ContextType = 'empty_tile';
    let targetEntity: string | null = null;

    const agent = entitiesAtPosition.find(e => e.components.has('agent'));
    if (agent) {
      targetType = 'agent';
      targetEntity = agent.id;
    } else {
      const building = entitiesAtPosition.find(e => e.components.has('building'));
      if (building) {
        targetType = 'building';
        targetEntity = building.id;
      } else {
        const resource = entitiesAtPosition.find(e => e.components.has('harvestable'));
        if (resource) {
          targetType = 'resource';
          targetEntity = resource.id;
        }
      }
    }

    const selectedEntities = this.getSelectedEntityIds(world);
    const isWalkable = this.checkWalkable(world, worldPosTiles.x, worldPosTiles.y);
    const isBuildable = this.checkBuildable(world, worldPosTiles.x, worldPosTiles.y);

    return new MenuContext(
      { x: screenX, y: screenY },
      worldPosTiles,
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
  hasSelection(): boolean {
    return this.selectedEntities.length > 0;
  }

  /**
   * Get count of selected entities.
   */
  getSelectedCount(): number {
    return this.selectedEntities.length;
  }

  /**
   * Check if any selected entities are agents.
   */
  hasSelectedAgents(): boolean {
    return this.selectedEntities.length > 0;
  }

  /**
   * Get the target entity object.
   */
  getTargetEntity(world: World): Entity | null {
    if (!this.targetEntity) {
      return null;
    }
    return world.getEntity(this.targetEntity) || null;
  }

  /**
   * Get array of selected entity objects.
   */
  getSelectedEntities(world: World): Entity[] {
    return this.selectedEntities
      .map(id => world.getEntity(id))
      .filter((e): e is Entity => e !== null && e !== undefined);
  }

  /**
   * Check if a specific action is applicable to this context.
   */
  isActionApplicable(actionId: string): boolean {
    switch (actionId) {
      case 'move_here': return this.hasSelection() && this.isWalkable;
      case 'follow': return this.targetType === 'agent' && this.hasSelection();
      case 'talk_to': return this.targetType === 'agent';
      case 'inspect': return this.targetEntity !== null;
      case 'enter': return this.targetType === 'building';
      case 'repair': return this.targetType === 'building';
      case 'demolish': return this.targetType === 'building';
      case 'build': return this.targetType === 'empty_tile' && this.isBuildable;
      case 'harvest': return this.targetType === 'resource';
      case 'assign_worker': return this.targetType === 'resource' && this.hasSelection();
      case 'prioritize': return this.targetType === 'resource';
      case 'info': return this.targetEntity !== null;
      case 'move_all_here': return this.hasSelection() && this.isWalkable && this.targetType === 'empty_tile';
      case 'create_group': return this.getSelectedCount() > 1;
      case 'scatter': return this.hasSelection() && this.targetType === 'empty_tile';
      case 'formation': return this.getSelectedCount() > 1;
      case 'place_waypoint': return this.targetType === 'empty_tile';
      case 'focus_camera': return true;
      case 'tile_info': return this.targetType === 'empty_tile';
      default: return false;
    }
  }

  private static getEntitiesNearPosition(world: World, x: number, y: number, radius: number): Entity[] {
    const entities: Entity[] = [];
    const radiusSquared = radius * radius;
    const positionedEntities = world.query().with(CT.Position).executeEntities();
    for (const entity of positionedEntities) {
      const pos = entity.getComponent('position') as { x: number; y: number } | undefined;
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

  private static getSelectedEntityIds(world: World): string[] {
    const selected: string[] = [];
    for (const entity of world.entities.values()) {
      const entityImpl = entity as Entity;
      const selectable = entityImpl.getComponent('selectable') as { selected?: boolean } | undefined;
      if (selectable && selectable.selected === true) {
        selected.push(entityImpl.id);
      }
    }
    return selected;
  }

  private static checkWalkable(_world: World, _x: number, _y: number): boolean {
    return true;
  }

  private static checkBuildable(_world: World, _x: number, _y: number): boolean {
    return true;
  }
}
