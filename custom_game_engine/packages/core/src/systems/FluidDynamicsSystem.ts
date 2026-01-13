import type { System, World, Entity } from '../ecs/index.js';
import type { SystemId, ComponentType } from '../types.js';
import type { EventBus } from '../events/EventBus.js';

/**
 * FluidDynamicsSystem - Dwarf Fortress-style water flow with slow updates
 *
 * Simulates water flow using pressure-based physics, updating once per game minute
 * for planetary-scale performance. Players experience: "Water flows slowly in this universe."
 *
 * Performance:
 * - Update frequency: Once per 1200 ticks (1 game minute at 20 TPS)
 * - Dirty flagging: Only processes tiles that changed
 * - 10 million tiles × 1% dirty = 100k tiles ÷ 1200 ticks = 83 tiles/tick
 * - Cost: 83 tiles × 0.001ms = 0.083ms per tick (~0.17% of 50ms budget)
 *
 * Algorithm (Dwarf Fortress pressure model):
 * 1. For each dirty water tile, calculate pressure = depth + elevation
 * 2. Check all 6 neighbors (N, S, E, W, Up, Down)
 * 3. Flow to neighbors with lower pressure
 * 4. Transfer depth (0-7 scale) proportionally to pressure difference
 * 5. Mark affected tiles as dirty for next update
 * 6. Remove stagnant tiles from dirty set
 *
 * Integration:
 * - Reads Tile.fluid (FluidLayer interface from world package)
 * - Writes Tile.fluid.depth, flowDirection, stagnant
 * - Triggered by TerrainModificationSystem on digging
 * - Future: PlanetaryCurrentsSystem for large-scale flow (separate system)
 *
 * Dependencies:
 * - Requires world to expose getTileAt(x, y, z) and setTileAt(x, y, z, tile)
 * - Runs after TerrainModificationSystem (priority 15)
 * - Runs before AgentSwimmingSystem (priority 18)
 */
export class FluidDynamicsSystem implements System {
  public readonly id: SystemId = 'fluid_dynamics';
  public readonly priority: number = 16; // After terrain mod (15), before swimming (18)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  // Dwarf Fortress-style slow updates (once per game minute)
  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 1200; // 1 minute = 60 seconds × 20 TPS

  // Dirty flags: tiles that need flow simulation
  // Format: "x,y,z" string keys for O(1) lookup
  private dirtyTiles = new Set<string>();

  // Performance tracking
  private lastUpdateTime = 0;
  private tilesProcessedLastUpdate = 0;

  /**
   * Initialize event listeners for terrain modifications
   */
  initialize(_world: World, eventBus: EventBus): void {
    // Mark tiles dirty when terrain is modified
    eventBus.subscribe('terrain:modified', (event) => {
      const z = event.data.z ?? 0;
      this.markDirty(event.data.x, event.data.y, z);

      // Also mark neighbors (water might flow in)
      this.markNeighborsDirty(event.data.x, event.data.y, z);
    });

    // Mark tiles dirty when fluid is added/removed
    eventBus.subscribe('fluid:changed', (event) => {
      const z = event.data.z ?? 0;
      this.markDirty(event.data.x, event.data.y, z);
    });
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    // Throttle to once per game minute (Dwarf Fortress approach)
    if (currentTick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Performance tracking
    const startTime = performance.now();
    let tilesProcessed = 0;

    // Get world tile accessor
    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number, z?: number) => Tile | undefined;
      setTileAt?: (x: number, y: number, z: number, tile: Tile) => void;
    };

    if (!worldWithTiles.getTileAt || !worldWithTiles.setTileAt) {
      console.warn('[FluidDynamics] No tile accessor available');
      return;
    }

    // Process dirty tiles (only tiles that changed)
    const processedThisTick = new Set<string>();

    for (const tileKey of this.dirtyTiles) {
      const coords = this.parseTileKey(tileKey);
      if (!coords) {
        this.dirtyTiles.delete(tileKey);
        continue;
      }

      const { x, y, z } = coords;
      const tile = worldWithTiles.getTileAt(x, y, z);

      if (!tile?.fluid || tile.fluid.depth === 0) {
        // No fluid or empty - remove from dirty set
        this.dirtyTiles.delete(tileKey);
        continue;
      }

      // Simulate Dwarf Fortress-style pressure flow
      this.simulateFlowForTile(x, y, z, tile, worldWithTiles as {
        getTileAt: (x: number, y: number, z?: number) => Tile | undefined;
        setTileAt: (x: number, y: number, z: number, tile: Tile) => void;
      });
      processedThisTick.add(tileKey);
      tilesProcessed++;
    }

    // Remove stagnant tiles from dirty set
    for (const key of processedThisTick) {
      const coords = this.parseTileKey(key);
      if (!coords) continue;

      const tile = worldWithTiles.getTileAt(coords.x, coords.y, coords.z);
      if (tile?.fluid?.stagnant) {
        this.dirtyTiles.delete(key);
      }
    }

    // Performance tracking
    this.lastUpdateTime = performance.now() - startTime;
    this.tilesProcessedLastUpdate = tilesProcessed;
  }

  /**
   * Simulate Dwarf Fortress-style pressure-based flow for a single tile
   */
  private simulateFlowForTile(
    x: number,
    y: number,
    z: number,
    tile: Tile,
    worldWithTiles: {
      getTileAt: (x: number, y: number, z?: number) => Tile | undefined;
      setTileAt: (x: number, y: number, z: number, tile: Tile) => void;
    }
  ): void {
    if (!tile.fluid) return;

    const sourceDepth = tile.fluid.depth;
    const sourceElevation = tile.elevation;

    // Dwarf Fortress pressure formula: pressure = depth + elevation
    const sourcePressure = sourceDepth + sourceElevation;

    // Get all 6 neighbors (3D: North, South, East, West, Up, Down)
    const neighbors = this.get3DNeighbors(x, y, z);

    // Calculate pressure differences and find flow targets
    const flowTargets: Array<{
      x: number;
      y: number;
      z: number;
      pressureDiff: number;
    }> = [];

    for (const neighbor of neighbors) {
      const targetTile = worldWithTiles.getTileAt(neighbor.x, neighbor.y, neighbor.z);
      if (!targetTile) continue; // Out of bounds or unloaded chunk

      // Can't flow into solid walls
      if (targetTile.wall || targetTile.window) continue;

      const targetFluid = targetTile.fluid;
      const targetDepth = targetFluid?.depth ?? 0;
      const targetElevation = targetTile.elevation;
      const targetPressure = targetDepth + targetElevation;

      const pressureDiff = sourcePressure - targetPressure;

      // Only flow to lower pressure (threshold prevents tiny oscillations)
      if (pressureDiff > 0.5) {
        flowTargets.push({
          x: neighbor.x,
          y: neighbor.y,
          z: neighbor.z,
          pressureDiff,
        });
      }
    }

    // No flow targets = stagnant water
    if (flowTargets.length === 0) {
      tile.fluid.stagnant = true;
      tile.fluid.flowDirection = undefined;
      tile.fluid.flowVelocity = 0;
      return;
    }

    // Distribute flow proportionally to pressure differences
    const totalPressureDiff = flowTargets.reduce((sum, t) => sum + t.pressureDiff, 0);

    // Max flow per update: 1 depth unit (prevents oscillation)
    const maxFlow = Math.min(1, sourceDepth);

    for (const target of flowTargets) {
      const flowFraction = target.pressureDiff / totalPressureDiff;
      const flowAmount = maxFlow * flowFraction;

      // Transfer fluid
      this.transferFluid(
        x, y, z,
        target.x, target.y, target.z,
        flowAmount,
        worldWithTiles
      );

      // Mark both tiles as dirty for next update
      this.markDirty(x, y, z);
      this.markDirty(target.x, target.y, target.z);
    }

    // Update flow visualization (average direction)
    const avgFlowX = flowTargets.reduce((sum, t) => sum + (t.x - x), 0) / flowTargets.length;
    const avgFlowY = flowTargets.reduce((sum, t) => sum + (t.y - y), 0) / flowTargets.length;
    const avgFlowZ = flowTargets.reduce((sum, t) => sum + (t.z - z), 0) / flowTargets.length;
    const length = Math.sqrt(avgFlowX * avgFlowX + avgFlowY * avgFlowY + avgFlowZ * avgFlowZ);

    tile.fluid.flowDirection = length > 0
      ? { x: avgFlowX / length, y: avgFlowY / length }
      : undefined;
    tile.fluid.flowVelocity = maxFlow / flowTargets.length;
    tile.fluid.stagnant = false;
    tile.fluid.lastUpdate = Date.now();
  }

  /**
   * Transfer fluid from source to target tile
   */
  private transferFluid(
    srcX: number,
    srcY: number,
    srcZ: number,
    dstX: number,
    dstY: number,
    dstZ: number,
    amount: number,
    worldWithTiles: {
      getTileAt: (x: number, y: number, z?: number) => Tile | undefined;
      setTileAt: (x: number, y: number, z: number, tile: Tile) => void;
    }
  ): void {
    const sourceTile = worldWithTiles.getTileAt(srcX, srcY, srcZ);
    const targetTile = worldWithTiles.getTileAt(dstX, dstY, dstZ);

    if (!sourceTile?.fluid || !targetTile) return;

    // Remove from source
    const newSourceDepth = Math.max(0, sourceTile.fluid.depth - amount);
    sourceTile.fluid.depth = newSourceDepth;
    sourceTile.fluid.pressure = newSourceDepth;

    // Add to target (create fluid if needed)
    if (!targetTile.fluid) {
      targetTile.fluid = {
        type: 'water',
        depth: 0,
        pressure: 0,
        temperature: sourceTile.fluid.temperature,
        stagnant: false,
        lastUpdate: Date.now(),
      };
    }

    const newTargetDepth = Math.min(7, targetTile.fluid.depth + amount);
    targetTile.fluid.depth = newTargetDepth;
    targetTile.fluid.pressure = newTargetDepth;
    targetTile.fluid.lastUpdate = Date.now();

    // Update tiles
    worldWithTiles.setTileAt(srcX, srcY, srcZ, sourceTile);
    worldWithTiles.setTileAt(dstX, dstY, dstZ, targetTile);
  }

  /**
   * Get all 6 neighbors in 3D space (N, S, E, W, Up, Down)
   */
  private get3DNeighbors(x: number, y: number, z: number): Array<{ x: number; y: number; z: number }> {
    return [
      { x: x + 1, y: y, z: z },     // East
      { x: x - 1, y: y, z: z },     // West
      { x: x, y: y + 1, z: z },     // South
      { x: x, y: y - 1, z: z },     // North
      { x: x, y: y, z: z + 1 },     // Up
      { x: x, y: y, z: z - 1 },     // Down
    ];
  }

  /**
   * Mark a tile as dirty (needs flow simulation)
   */
  markDirty(x: number, y: number, z: number): void {
    this.dirtyTiles.add(this.makeTileKey(x, y, z));
  }

  /**
   * Mark all neighbors of a tile as dirty
   */
  private markNeighborsDirty(x: number, y: number, z: number): void {
    const neighbors = this.get3DNeighbors(x, y, z);
    for (const n of neighbors) {
      this.markDirty(n.x, n.y, n.z);
    }
  }

  /**
   * Create tile key for dirty set
   */
  private makeTileKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  /**
   * Parse tile key back to coordinates
   */
  private parseTileKey(key: string): { x: number; y: number; z: number } | null {
    const parts = key.split(',').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return null;
    }
    return { x: parts[0]!, y: parts[1]!, z: parts[2]! };
  }

  /**
   * Get debug info about current flow state
   */
  getDebugInfo(): {
    dirtyTileCount: number;
    lastUpdateTime: number;
    tilesProcessedLastUpdate: number;
    estimatedCostPerTick: number;
  } {
    const estimatedCostPerTick = this.dirtyTiles.size / this.UPDATE_INTERVAL * 0.001; // ms

    return {
      dirtyTileCount: this.dirtyTiles.size,
      lastUpdateTime: this.lastUpdateTime,
      tilesProcessedLastUpdate: this.tilesProcessedLastUpdate,
      estimatedCostPerTick,
    };
  }

  /**
   * Initialize dirty flags for existing water tiles on game load
   * Call this after loading a saved game
   */
  initializeWaterTiles(world: World): void {
    const worldWithTiles = world as {
      getTileAt?: (x: number, y: number, z?: number) => Tile | undefined;
      getChunkManager?: () => {
        getLoadedChunks: () => Array<{ x: number; y: number; tiles: Tile[] }>;
      };
    };

    const chunkManager = worldWithTiles.getChunkManager?.();
    if (!chunkManager) return;

    const chunks = chunkManager.getLoadedChunks();

    for (const chunk of chunks) {
      const CHUNK_SIZE = 32;
      for (let localY = 0; localY < CHUNK_SIZE; localY++) {
        for (let localX = 0; localX < CHUNK_SIZE; localX++) {
          const worldX = chunk.x * CHUNK_SIZE + localX;
          const worldY = chunk.y * CHUNK_SIZE + localY;

          // For now, assume z=0 (2D mode)
          // TODO: Handle 3D chunk iteration when voxel chunks are implemented
          const z = 0;

          const tile = worldWithTiles.getTileAt?.(worldX, worldY, z);
          if (tile?.fluid && tile.fluid.depth > 0) {
            this.markDirty(worldX, worldY, z);
          }
        }
      }
    }

    console.log(`[FluidDynamics] Initialized ${this.dirtyTiles.size} water tiles`);
  }
}

// Type definitions (from world package)
interface Tile {
  terrain: string;
  elevation: number;
  fluid?: FluidLayer;
  wall?: { constructionProgress?: number };
  window?: { constructionProgress?: number };
  door?: { state: 'open' | 'closed' | 'locked'; constructionProgress?: number };
}

interface FluidLayer {
  type: 'water' | 'magma' | 'blood' | 'oil' | 'acid';
  depth: number; // 0-7 (Dwarf Fortress scale)
  pressure: number; // 0-7 (affects flow)
  temperature: number; // Affects freezing/boiling
  flowDirection?: { x: number; y: number };
  flowVelocity?: number;
  stagnant: boolean;
  lastUpdate: number;
}
