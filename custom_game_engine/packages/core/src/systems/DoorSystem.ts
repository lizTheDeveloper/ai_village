/**
 * DoorSystem - Manages tile-based door mechanics.
 *
 * This system handles:
 * - Auto-opening doors when agents approach
 * - Auto-closing doors after a timeout
 * - Door state synchronization
 *
 * Per VOXEL_BUILDING_SPEC.md: Doors auto-close after 5 seconds (100 ticks at 20 TPS).
 */

import type { SystemId, ComponentType } from '../types.js';
import type { World, ITile } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

/** Door auto-close timeout in ticks (5 seconds at 20 TPS) */
const DOOR_AUTO_CLOSE_TICKS = 100;

/** Distance at which agents trigger door opening */
const DOOR_TRIGGER_DISTANCE = 1.5;

interface WorldWithTiles extends World {
  getTileAt(x: number, y: number): ITile | undefined;
  setTileProperty?(x: number, y: number, property: string, value: unknown): void;
}

export class DoorSystem extends BaseSystem {
  public readonly id: SystemId = 'door';
  public readonly priority: number = 19; // Run before MovementSystem (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Position, CT.Agent];
  // Only run when agent components exist (O(1) activation check)
  public readonly activationComponents = [CT.Agent] as const;
  protected readonly throttleInterval = 10; // FAST - 0.5 seconds

  /**
   * Track doors that have been opened (position key -> tick opened)
   */
  private openDoors: Map<string, number> = new Map();

  /**
   * Performance: Cache agent positions for current tick to avoid repeated queries
   */
  private cachedAgentPositions: Array<{ x: number; y: number; id: string }> | null = null;
  private cachedAgentTick = -1;

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const worldWithTiles = world as WorldWithTiles & { getDoorLocations?: () => ReadonlyArray<{ x: number; y: number }> };

    // Skip if world doesn't support tile access
    if (typeof worldWithTiles.getTileAt !== 'function') {
      return;
    }

    // Cache agent positions for this tick
    // Performance: Use pre-filtered entities from requiredComponents instead of querying
    if (this.cachedAgentTick !== ctx.tick) {
      this.cachedAgentPositions = [];
      for (const agent of ctx.activeEntities) {
        const impl = agent as EntityImpl;
        const pos = impl.getComponent<PositionComponent>(CT.Position);
        if (pos) {
          this.cachedAgentPositions.push({ x: pos.x, y: pos.y, id: agent.id });
        }
      }
      this.cachedAgentTick = ctx.tick;
    }

    // Process auto-closing of doors that have been open too long
    this.processAutoClose(worldWithTiles, ctx);

    // Optimized approach: Get door locations from World's spatial index
    // This is O(doors × agents) instead of O(agents × tile_radius²)
    this.processDoorsWithNearbyAgents(worldWithTiles, ctx);
  }

  /**
   * Process doors that have agents nearby - optimized approach.
   * Uses World's door location cache instead of scanning tiles.
   */
  private processDoorsWithNearbyAgents(world: WorldWithTiles & { getDoorLocations?: () => ReadonlyArray<{ x: number; y: number }> }, ctx: SystemContext): void {
    if (!this.cachedAgentPositions) return;

    // Get door locations from World's spatial index
    const doorLocations = world.getDoorLocations?.() ?? [];
    if (doorLocations.length === 0) return;

    const triggerDistanceSquared = DOOR_TRIGGER_DISTANCE * DOOR_TRIGGER_DISTANCE;

    for (const doorLoc of doorLocations) {
      const tile = world.getTileAt(doorLoc.x, doorLoc.y);
      if (!tile?.door) continue;

      // Only process completed doors that are closed
      const progress = tile.door.constructionProgress ?? 100;
      if (progress < 100) continue;
      if (tile.door.state !== 'closed') continue;

      // Check if any agent is near this door
      const doorCenterX = doorLoc.x + 0.5;
      const doorCenterY = doorLoc.y + 0.5;

      for (const agentPos of this.cachedAgentPositions) {
        const dx = doorCenterX - agentPos.x;
        const dy = doorCenterY - agentPos.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared <= triggerDistanceSquared) {
          // Agent is near door - open it
          this.openDoor(world, doorLoc.x, doorLoc.y, agentPos.id, ctx);
          break; // Only need one agent to trigger door
        }
      }
    }
  }


  /**
   * Open a door at the specified position.
   */
  private openDoor(world: WorldWithTiles, x: number, y: number, agentId: string, ctx: SystemContext): void {
    const tile = world.getTileAt(x, y);
    if (!tile?.door || tile.door.state !== 'closed') return;

    // Update door state
    tile.door.state = 'open';
    tile.door.lastOpened = world.tick;

    // Track open door for auto-close
    const key = `${x},${y}`;
    this.openDoors.set(key, world.tick);

    // Emit event
    ctx.emit('door:opened', { x, y, tick: world.tick }, agentId);
  }

  /**
   * Close a door at the specified position.
   */
  private closeDoor(world: WorldWithTiles, x: number, y: number, ctx: SystemContext): void {
    const tile = world.getTileAt(x, y);
    if (!tile?.door || tile.door.state !== 'open') return;

    // Update door state
    tile.door.state = 'closed';

    // Remove from tracking
    const key = `${x},${y}`;
    this.openDoors.delete(key);

    // Emit event
    ctx.emit('door:closed', { x, y, tick: world.tick ?? 0 }, 'door_system');
  }

  /**
   * Process auto-closing of doors that have been open too long.
   */
  private processAutoClose(world: WorldWithTiles, ctx: SystemContext): void {
    const currentTick = world.tick ?? 0;
    const toClose: string[] = [];

    for (const [key, openedTick] of this.openDoors) {
      if (currentTick - openedTick >= DOOR_AUTO_CLOSE_TICKS) {
        // Check if any agent is still near the door
        const parts = key.split(',');
        const doorX = Number(parts[0]);
        const doorY = Number(parts[1]);
        if (!this.isAgentNearDoor(world, doorX, doorY)) {
          toClose.push(key);
        } else {
          // Reset the timer if agent is still nearby
          this.openDoors.set(key, currentTick);
        }
      }
    }

    // Close doors that have timed out
    for (const key of toClose) {
      const parts = key.split(',');
      const doorX = Number(parts[0]);
      const doorY = Number(parts[1]);
      this.closeDoor(world, doorX, doorY, ctx);
    }
  }

  /**
   * Check if any agent is near a door position (using cached positions and squared distance).
   */
  private isAgentNearDoor(_world: World, doorX: number, doorY: number): boolean {
    if (!this.cachedAgentPositions) {
      return false;
    }

    const doorCenterX = doorX + 0.5;
    const doorCenterY = doorY + 0.5;
    const triggerDistanceSquared = DOOR_TRIGGER_DISTANCE * DOOR_TRIGGER_DISTANCE;

    for (const pos of this.cachedAgentPositions) {
      const dx = doorCenterX - pos.x;
      const dy = doorCenterY - pos.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared <= triggerDistanceSquared) {
        return true;
      }
    }

    return false;
  }
}
