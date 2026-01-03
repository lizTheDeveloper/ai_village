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

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World, ITile } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { EventBus } from '../events/EventBus.js';

/** Door auto-close timeout in ticks (5 seconds at 20 TPS) */
const DOOR_AUTO_CLOSE_TICKS = 100;

/** Distance at which agents trigger door opening */
const DOOR_TRIGGER_DISTANCE = 1.5;

interface WorldWithTiles extends World {
  getTileAt(x: number, y: number): ITile | undefined;
  setTileProperty?(x: number, y: number, property: string, value: unknown): void;
}

export class DoorSystem implements System {
  public readonly id: SystemId = 'door';
  public readonly priority: number = 19; // Run before MovementSystem (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Position, CT.Agent];

  private eventBus?: EventBus;

  /**
   * Track doors that have been opened (position key -> tick opened)
   */
  private openDoors: Map<string, number> = new Map();

  /**
   * Performance: Cache agent positions for current tick to avoid repeated queries
   */
  private cachedAgentPositions: Array<{ x: number; y: number }> | null = null;
  private cachedAgentTick = -1;

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const worldWithTiles = world as WorldWithTiles;

    // Skip if world doesn't support tile access
    if (typeof worldWithTiles.getTileAt !== 'function') {
      return;
    }

    // Cache agent positions for this tick
    if (this.cachedAgentTick !== world.tick) {
      this.cachedAgentPositions = [];
      const agents = world.query().with(CT.Position).with(CT.Agent).executeEntities();
      for (const agent of agents) {
        const impl = agent as EntityImpl;
        const pos = impl.getComponent<PositionComponent>(CT.Position);
        if (pos) {
          this.cachedAgentPositions.push({ x: pos.x, y: pos.y });
        }
      }
      this.cachedAgentTick = world.tick;
    }

    // Process auto-closing of doors that have been open too long
    this.processAutoClose(worldWithTiles);

    // Check for agents near doors and auto-open
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const position = impl.getComponent<PositionComponent>(CT.Position);

      if (!position) continue;

      // Check tiles around the agent for doors
      this.checkForNearbyDoors(worldWithTiles, position.x, position.y, entity.id);
    }
  }

  /**
   * Check for doors near an agent and auto-open them.
   */
  private checkForNearbyDoors(
    world: WorldWithTiles,
    agentX: number,
    agentY: number,
    agentId: string
  ): void {
    // Check a small radius around the agent
    const checkRadius = Math.ceil(DOOR_TRIGGER_DISTANCE);
    const triggerDistanceSquared = DOOR_TRIGGER_DISTANCE * DOOR_TRIGGER_DISTANCE;

    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      for (let dy = -checkRadius; dy <= checkRadius; dy++) {
        const tileX = Math.floor(agentX) + dx;
        const tileY = Math.floor(agentY) + dy;

        // Calculate squared distance to tile center
        const deltaX = tileX + 0.5 - agentX;
        const deltaY = tileY + 0.5 - agentY;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;

        if (distanceSquared > triggerDistanceSquared) continue;

        const tile = world.getTileAt(tileX, tileY);
        if (!tile?.door) continue;

        // Only process completed doors that are closed
        const progress = tile.door.constructionProgress ?? 100;
        if (progress < 100) continue;

        if (tile.door.state === 'closed') {
          this.openDoor(world, tileX, tileY, agentId);
        }
      }
    }
  }

  /**
   * Open a door at the specified position.
   */
  private openDoor(world: WorldWithTiles, x: number, y: number, agentId: string): void {
    const tile = world.getTileAt(x, y);
    if (!tile?.door || tile.door.state !== 'closed') return;

    // Update door state
    tile.door.state = 'open';
    tile.door.lastOpened = world.tick;

    // Track open door for auto-close
    const key = `${x},${y}`;
    this.openDoors.set(key, world.tick);

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'door:opened',
        source: agentId,
        data: { x, y, tick: world.tick },
      });
    }
  }

  /**
   * Close a door at the specified position.
   */
  private closeDoor(world: WorldWithTiles, x: number, y: number): void {
    const tile = world.getTileAt(x, y);
    if (!tile?.door || tile.door.state !== 'open') return;

    // Update door state
    tile.door.state = 'closed';

    // Remove from tracking
    const key = `${x},${y}`;
    this.openDoors.delete(key);

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'door:closed',
        source: 'door_system',
        data: { x, y, tick: world.tick ?? 0 },
      });
    }
  }

  /**
   * Process auto-closing of doors that have been open too long.
   */
  private processAutoClose(world: WorldWithTiles): void {
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
      this.closeDoor(world, doorX, doorY);
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
