/**
 * TileConstructionSystem - Manages tile-by-tile construction of voxel buildings.
 *
 * This system handles:
 * - Creating construction tasks from tile-based blueprints
 * - Tracking material delivery to construction sites
 * - Managing collaborative building (multiple agents)
 * - Placing tiles when construction completes
 * - XP rewards for building activities
 *
 * Per CLAUDE.md: No silent fallbacks - throws on invalid input.
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import {
  type TileBasedBlueprint,
  parseLayout,
  type WallMaterial,
  type DoorMaterial,
  type WindowMaterial,
  getTileBasedBlueprintRegistry,
} from '../buildings/TileBasedBlueprintRegistry.js';

// Minimal Tile interface for construction purposes
interface Tile {
  wall?: {
    material: WallMaterial;
    condition: number;
    insulation: number;
    constructedAt?: number;
  };
  door?: {
    material: DoorMaterial;
    state: 'open' | 'closed' | 'locked';
    constructedAt?: number;
  };
  window?: {
    material: WindowMaterial;
    condition: number;
    lightsThrough: boolean;
    constructedAt?: number;
  };
  floor?: string;
}

/**
 * Status of a construction tile.
 */
export type TileConstructionStatus = 'pending' | 'materials_needed' | 'in_progress' | 'placed';

/**
 * Individual tile in a construction task.
 */
export interface ConstructionTile {
  /** World X position */
  x: number;
  /** World Y position */
  y: number;
  /** Tile type */
  type: 'wall' | 'floor' | 'door' | 'window';
  /** Material ID for this tile */
  materialId: string;
  /** Materials delivered to this tile (0-1 typically, can be more for multi-material tiles) */
  materialsDelivered: number;
  /** Materials required for this tile */
  materialsRequired: number;
  /** Construction progress (0-100) */
  progress: number;
  /** Status of this tile */
  status: TileConstructionStatus;
  /** Entity ID of agent currently building this tile (if any) */
  currentBuilderId?: string;
  /** Game tick when construction started on this tile */
  startedAt?: number;
}

/**
 * State of a construction task.
 */
export type ConstructionTaskState = 'planned' | 'in_progress' | 'completed' | 'cancelled';

/**
 * A construction task representing tile-by-tile building of a structure.
 */
export interface ConstructionTask {
  /** Unique task ID */
  id: string;
  /** Blueprint ID this task is based on */
  blueprintId: string;
  /** Origin position in world coordinates */
  originPosition: { x: number; y: number };
  /** Rotation applied (0, 90, 180, 270) */
  rotation: number;
  /** All tiles to place */
  tiles: ConstructionTile[];
  /** Current task state */
  state: ConstructionTaskState;
  /** Game tick when task was created */
  createdAt: number;
  /** Game tick when construction started */
  startedAt?: number;
  /** Game tick when construction completed */
  completedAt?: number;
  /** Entity IDs of agents actively working on this task */
  activeBuilders: Set<string>;
  /** Entity ID of agent who created this task */
  createdBy?: string;
  /** Optional storage location for materials */
  materialStorageLocation?: { x: number; y: number };
  /** Total tiles count */
  readonly totalTiles: number;
  /** Tiles placed count */
  tilesPlaced: number;
}


/**
 * TileConstructionSystem - Manages tile-based construction.
 */
export class TileConstructionSystem implements System {
  public readonly id: SystemId = 'tile_construction';
  public readonly priority: number = 18; // After movement, before rendering
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  /** Active construction tasks */
  private tasks: Map<string, ConstructionTask> = new Map();

  /** Task counter for unique IDs */
  private taskCounter = 0;

  /**
   * Create a new construction task from a blueprint or blueprint ID.
   *
   * @param world - Game world
   * @param blueprintOrId - The tile-based blueprint to build or its ID
   * @param originX - World X origin
   * @param originY - World Y origin
   * @param rotation - Rotation in degrees (0, 90, 180, 270)
   * @param createdBy - Entity ID of the agent creating this task
   * @returns The created construction task
   * @throws Error if blueprint is invalid or position is blocked
   */
  createTask(
    world: World,
    blueprintOrId: TileBasedBlueprint | string,
    originX: number,
    originY: number,
    rotation: number = 0,
    createdBy?: string
  ): ConstructionTask {
    // Resolve blueprint from ID if string was passed
    let blueprint: TileBasedBlueprint;
    if (typeof blueprintOrId === 'string') {
      const registry = getTileBasedBlueprintRegistry();
      const found = registry.get(blueprintOrId);
      if (!found) {
        throw new Error(`Blueprint "${blueprintOrId}" not found`);
      }
      blueprint = found;
    } else {
      blueprint = blueprintOrId;
    }

    // Parse layout to get tile positions
    const parsedTiles = parseLayout(blueprint, originX, originY, rotation);

    if (parsedTiles.length === 0) {
      throw new Error(`Blueprint "${blueprint.id}" produced no tiles`);
    }

    // Validate placement - check no existing structures
    for (const tile of parsedTiles) {
      const worldTile = this.getWorldTile(world, tile.x, tile.y);
      if (worldTile?.wall || worldTile?.door || worldTile?.window) {
        throw new Error(
          `Cannot place construction at (${tile.x}, ${tile.y}) - tile already has structure`
        );
      }
    }

    // Create construction tiles
    const constructionTiles: ConstructionTile[] = parsedTiles.map((parsed) => ({
      x: parsed.x,
      y: parsed.y,
      type: parsed.type as 'wall' | 'floor' | 'door' | 'window',
      materialId: parsed.materialId,
      materialsDelivered: 0,
      materialsRequired: 1, // Each tile requires 1 material unit
      progress: 0,
      status: 'pending' as TileConstructionStatus,
    }));

    const taskId = `construction_${++this.taskCounter}_${Date.now()}`;

    const task: ConstructionTask = {
      id: taskId,
      blueprintId: blueprint.id,
      originPosition: { x: originX, y: originY },
      rotation,
      tiles: constructionTiles,
      state: 'planned',
      createdAt: world.tick,
      activeBuilders: new Set(),
      createdBy,
      totalTiles: constructionTiles.length,
      tilesPlaced: 0,
    };

    this.tasks.set(taskId, task);

    // Emit task created event
    world.eventBus.emit({
      type: 'construction:task_created',
      source: 'tile_construction_system',
      data: {
        taskId,
        blueprintId: blueprint.id,
        position: { x: originX, y: originY },
      },
    });

    return task;
  }

  /**
   * Start construction on a task.
   */
  startTask(world: World, taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Construction task "${taskId}" not found`);
    }

    if (task.state !== 'planned') {
      throw new Error(`Cannot start task "${taskId}" - current state: ${task.state}`);
    }

    task.state = 'in_progress';
    task.startedAt = world.tick;

    // Mark all tiles as needing materials
    for (const tile of task.tiles) {
      tile.status = 'materials_needed';
    }

    world.eventBus.emit({
      type: 'construction:task_started',
      source: 'tile_construction_system',
      data: { taskId, blueprintId: task.blueprintId },
    });
  }

  /**
   * Cancel a construction task.
   */
  cancelTask(world: World, taskId: string, reason?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Construction task "${taskId}" not found`);
    }

    task.state = 'cancelled';
    task.activeBuilders.clear();

    world.eventBus.emit({
      type: 'construction:task_cancelled',
      source: 'tile_construction_system',
      data: { taskId, reason },
    });
  }

  /**
   * Deliver material to a construction tile.
   *
   * @param world - Game world
   * @param taskId - Task ID
   * @param tileIndex - Index of tile in task.tiles array
   * @param builderId - Entity ID of delivering agent
   * @param amount - Amount of material to deliver (default: 1)
   * @returns True if material was accepted
   */
  deliverMaterial(
    world: World,
    taskId: string,
    tileIndex: number,
    builderId: string,
    amount: number = 1
  ): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Construction task "${taskId}" not found`);
    }

    if (tileIndex < 0 || tileIndex >= task.tiles.length) {
      throw new Error(`Invalid tile index ${tileIndex} for task "${taskId}"`);
    }

    const tile = task.tiles[tileIndex];
    if (!tile) {
      throw new Error(`Tile at index ${tileIndex} not found`);
    }

    // Can't deliver to placed tiles
    if (tile.status === 'placed') {
      return false;
    }

    // Deliver the material
    tile.materialsDelivered = Math.min(
      tile.materialsRequired,
      tile.materialsDelivered + amount
    );

    // Update status if we have enough materials
    if (tile.materialsDelivered >= tile.materialsRequired) {
      tile.status = 'in_progress';
    }

    // Track this builder
    task.activeBuilders.add(builderId);

    // Emit material delivered event
    world.eventBus.emit({
      type: 'construction:material_delivered',
      source: builderId,
      data: {
        taskId,
        tilePosition: { x: tile.x, y: tile.y },
        materialId: tile.materialId,
        builderId,
      },
    });

    // Grant XP for material delivery (5 XP)
    this.grantXp(world, builderId, 5);

    return true;
  }

  /**
   * Advance construction progress on a tile.
   *
   * @param world - Game world
   * @param taskId - Task ID
   * @param tileIndex - Index of tile
   * @param builderId - Entity ID of building agent
   * @param progressDelta - Amount of progress to add (0-100 scale)
   * @returns True if tile was completed this call
   */
  advanceProgress(
    world: World,
    taskId: string,
    tileIndex: number,
    builderId: string,
    progressDelta: number
  ): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Construction task "${taskId}" not found`);
    }

    if (tileIndex < 0 || tileIndex >= task.tiles.length) {
      throw new Error(`Invalid tile index ${tileIndex} for task "${taskId}"`);
    }

    const tile = task.tiles[tileIndex];
    if (!tile) {
      throw new Error(`Tile at index ${tileIndex} not found`);
    }

    // Can only advance if materials delivered and not placed
    if (tile.status !== 'in_progress') {
      return false;
    }

    // Track builder
    task.activeBuilders.add(builderId);
    tile.currentBuilderId = builderId;

    if (!tile.startedAt) {
      tile.startedAt = world.tick;
    }

    // Advance progress
    const previousProgress = tile.progress;
    tile.progress = Math.min(100, tile.progress + progressDelta);

    // Check if tile completed
    if (tile.progress >= 100 && previousProgress < 100) {
      // Place the tile in the world
      this.placeTile(world, task, tile);
      tile.status = 'placed';
      task.tilesPlaced++;

      // Emit tile placed event with collaborators
      world.eventBus.emit({
        type: 'construction:tile_placed',
        source: builderId,
        data: {
          taskId,
          tilePosition: { x: tile.x, y: tile.y },
          tileType: tile.type,
          materialId: tile.materialId,
          builderId,
          collaborators: Array.from(task.activeBuilders),
        },
      });

      // Grant XP for placement (10 XP)
      this.grantXp(world, builderId, 10);

      // Build relationships with collaborators
      this.buildRelationships(world, builderId, task.activeBuilders);

      // Check if entire task is complete
      if (task.tilesPlaced >= task.totalTiles) {
        task.state = 'completed';
        task.completedAt = world.tick;

        world.eventBus.emit({
          type: 'construction:task_completed',
          source: 'tile_construction_system',
          data: {
            taskId,
            blueprintId: task.blueprintId,
            position: task.originPosition,
          },
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Place a tile in the world.
   */
  private placeTile(world: World, _task: ConstructionTask, tile: ConstructionTile): void {
    const worldTile = this.getWorldTile(world, tile.x, tile.y);
    if (!worldTile) {
      throw new Error(`Cannot place tile at (${tile.x}, ${tile.y}) - tile not found in world`);
    }

    switch (tile.type) {
      case 'wall':
        worldTile.wall = {
          material: tile.materialId as WallMaterial,
          condition: 100,
          insulation: this.getWallInsulation(tile.materialId as WallMaterial),
          constructedAt: world.tick,
        };
        break;

      case 'door':
        worldTile.door = {
          material: tile.materialId as DoorMaterial,
          state: 'closed',
          constructedAt: world.tick,
        };
        break;

      case 'window':
        worldTile.window = {
          material: tile.materialId as WindowMaterial,
          condition: 100,
          lightsThrough: true,
          constructedAt: world.tick,
        };
        break;

      case 'floor':
        worldTile.floor = tile.materialId;
        break;
    }

    // Mark tile as modified for chunk updates
    this.markTileModified(world, tile.x, tile.y);
  }

  /**
   * Get wall insulation value for a material.
   */
  private getWallInsulation(material: WallMaterial): number {
    const insulations: Record<WallMaterial, number> = {
      wood: 50,
      stone: 80,
      mud_brick: 60,
      ice: 30,
      metal: 20,
      glass: 10,
      thatch: 40,
    };
    return insulations[material] ?? 50;
  }

  /**
   * Grant XP to a builder.
   */
  private grantXp(world: World, builderId: string, amount: number): void {
    world.eventBus.emit({
      type: 'progression:xp_gained',
      source: builderId,
      data: {
        skill: 'building',
        amount,
        builderId,
        xpGained: amount,
      },
    });
  }

  /**
   * Build relationships between collaborating agents.
   */
  private buildRelationships(
    world: World,
    builderId: string,
    collaborators: Set<string>
  ): void {
    for (const collaboratorId of collaborators) {
      if (collaboratorId === builderId) continue;

      world.eventBus.emit({
        type: 'relationship:improved',
        source: builderId,
        data: {
          targetAgent: collaboratorId,
          reason: 'collaborative_building',
          amount: 2, // +2 relationship per tile
        },
      });
    }
  }

  /**
   * Get a tile needing materials for a task.
   * Returns the first tile that needs materials.
   */
  getNextTileNeedingMaterials(taskId: string): { tile: ConstructionTile; index: number } | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    for (let i = 0; i < task.tiles.length; i++) {
      const tile = task.tiles[i];
      if (tile && tile.status === 'materials_needed') {
        return { tile, index: i };
      }
    }

    return null;
  }

  /**
   * Get a tile ready for construction (has materials but not placed).
   */
  getNextTileForConstruction(taskId: string): { tile: ConstructionTile; index: number } | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    for (let i = 0; i < task.tiles.length; i++) {
      const tile = task.tiles[i];
      if (tile && tile.status === 'in_progress' && tile.progress < 100) {
        return { tile, index: i };
      }
    }

    return null;
  }

  /**
   * Register an agent as working on a task.
   */
  registerBuilder(taskId: string, builderId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.activeBuilders.add(builderId);
    return true;
  }

  /**
   * Unregister an agent from a task.
   */
  unregisterBuilder(taskId: string, builderId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.activeBuilders.delete(builderId);

    // Clear current builder from any tiles
    for (const tile of task.tiles) {
      if (tile.currentBuilderId === builderId) {
        tile.currentBuilderId = undefined;
      }
    }
  }

  /**
   * Get a construction task by ID.
   */
  getTask(taskId: string): ConstructionTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all active tasks.
   */
  getAllTasks(): ConstructionTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get all in-progress tasks.
   */
  getActiveTasks(): ConstructionTask[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.state === 'in_progress'
    );
  }

  /**
   * Get tasks at a specific location.
   */
  getTasksAtPosition(x: number, y: number): ConstructionTask[] {
    return Array.from(this.tasks.values()).filter((task) => {
      return task.tiles.some((tile) => tile.x === x && tile.y === y);
    });
  }

  /**
   * System update - periodic maintenance tasks.
   * The actual construction work is done by behaviors calling advanceProgress.
   */
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Clean up completed/cancelled tasks after some time
    const now = world.tick;
    for (const [taskId, task] of this.tasks) {
      if (task.state === 'completed' || task.state === 'cancelled') {
        // Remove tasks that completed more than 5 minutes ago (6000 ticks at 20 TPS)
        const completedTick = task.completedAt ?? task.createdAt;
        if (now - completedTick > 6000) {
          this.tasks.delete(taskId);
        }
      }
    }
  }

  /**
   * Get world tile at position.
   * Returns undefined if no tile manager available.
   */
  private getWorldTile(world: World, x: number, y: number): Tile | undefined {
    // World should have a getTileAt method
    const worldWithTiles = world as World & {
      getTileAt?(x: number, y: number): any;
    };
    return worldWithTiles.getTileAt?.(x, y) as Tile | undefined;
  }

  /**
   * Mark tile as modified for chunk updates.
   */
  private markTileModified(world: World, x: number, y: number): void {
    const worldWithTiles = world as World & {
      markTileModified?(x: number, y: number): void;
    };
    worldWithTiles.markTileModified?.(x, y);
  }

  // ============================================================================
  // DEMOLITION METHODS
  // ============================================================================

  /**
   * Demolish a wall tile at the specified position.
   * Returns the material type if successfully demolished.
   *
   * @param world - Game world
   * @param x - World X position
   * @param y - World Y position
   * @param demolisherId - Entity ID performing demolition (for XP/events)
   * @returns Material type of demolished wall, or null if no wall
   */
  demolishWall(world: World, x: number, y: number, demolisherId?: string): string | null {
    const tile = this.getWorldTile(world, x, y);
    if (!tile?.wall) return null;

    const material = tile.wall.material;

    // Remove the wall from the tile
    tile.wall = undefined;
    this.markTileModified(world, x, y);

    // Emit demolition event
    world.eventBus.emit({
      type: 'construction:tile_demolished',
      source: demolisherId ?? 'system',
      data: {
        x,
        y,
        tileType: 'wall',
        material,
      },
    });

    // Award XP for demolition (half of building XP)
    if (demolisherId) {
      world.eventBus.emit({
        type: 'progression:xp_gained',
        source: demolisherId,
        data: {
          skill: 'building',
          amount: 5,
        },
      });
    }

    return material;
  }

  /**
   * Demolish a door tile at the specified position.
   */
  demolishDoor(world: World, x: number, y: number, demolisherId?: string): string | null {
    const tile = this.getWorldTile(world, x, y);
    if (!tile?.door) return null;

    const material = tile.door.material;

    // Remove the door from the tile
    tile.door = undefined;
    this.markTileModified(world, x, y);

    // Emit demolition event
    world.eventBus.emit({
      type: 'construction:tile_demolished',
      source: demolisherId ?? 'system',
      data: {
        x,
        y,
        tileType: 'door',
        material,
      },
    });

    if (demolisherId) {
      world.eventBus.emit({
        type: 'progression:xp_gained',
        source: demolisherId,
        data: {
          skill: 'building',
          amount: 5,
        },
      });
    }

    return material;
  }

  /**
   * Demolish a window tile at the specified position.
   */
  demolishWindow(world: World, x: number, y: number, demolisherId?: string): string | null {
    const tile = this.getWorldTile(world, x, y);
    if (!tile?.window) return null;

    const material = tile.window.material;

    // Remove the window from the tile
    tile.window = undefined;
    this.markTileModified(world, x, y);

    // Emit demolition event
    world.eventBus.emit({
      type: 'construction:tile_demolished',
      source: demolisherId ?? 'system',
      data: {
        x,
        y,
        tileType: 'window',
        material,
      },
    });

    if (demolisherId) {
      world.eventBus.emit({
        type: 'progression:xp_gained',
        source: demolisherId,
        data: {
          skill: 'building',
          amount: 5,
        },
      });
    }

    return material;
  }

  /**
   * Demolish any tile structure (wall, door, or window) at the position.
   * Tries in order: wall, door, window.
   */
  demolishAny(world: World, x: number, y: number, demolisherId?: string): { type: string; material: string } | null {
    const wallMaterial = this.demolishWall(world, x, y, demolisherId);
    if (wallMaterial) return { type: 'wall', material: wallMaterial };

    const doorMaterial = this.demolishDoor(world, x, y, demolisherId);
    if (doorMaterial) return { type: 'door', material: doorMaterial };

    const windowMaterial = this.demolishWindow(world, x, y, demolisherId);
    if (windowMaterial) return { type: 'window', material: windowMaterial };

    return null;
  }

  /**
   * Check if a tile has any structure that can be demolished.
   */
  canDemolish(world: World, x: number, y: number): boolean {
    const tile = this.getWorldTile(world, x, y);
    return !!(tile?.wall || tile?.door || tile?.window);
  }
}

/**
 * Singleton instance for easy access.
 */
let tileConstructionSystemInstance: TileConstructionSystem | null = null;

/**
 * Get or create the tile construction system instance.
 */
export function getTileConstructionSystem(): TileConstructionSystem {
  if (!tileConstructionSystemInstance) {
    tileConstructionSystemInstance = new TileConstructionSystem();
  }
  return tileConstructionSystemInstance;
}
