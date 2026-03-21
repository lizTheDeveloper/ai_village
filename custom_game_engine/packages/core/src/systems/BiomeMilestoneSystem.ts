/**
 * BiomeMilestoneSystem — fires CIVILIZATION_MILESTONE events for world-level
 * geographic and ecological discoveries.
 *
 * Covered milestones:
 *  1. civilization:biome_discovered   — first agent to enter a new biome type
 *  2. civilization:biome_settled      — first structure built in a biome type
 *  3. civilization:biome_explored     — unique tile count for a biome exceeds threshold
 *  4. civilization:terrain_transformed — a tile's biome changes at runtime
 *  5. civilization:resource_extracted  — first mining/logging/farming in a new biome type
 *
 * State is tracked in-memory (system fields). On world reload the "first entry"
 * events may re-fire — acceptable for MVP. Persistence via a component can be
 * added when the Tech Lead approves a new CT entry.
 *
 * Performance:
 *  - Event-driven (entity:arrived, building:complete, terrain:modified, etc.)
 *  - onUpdate only inspects agent positions during initial warm-up
 *  - getTileAt uses chunk lookup — O(1), no full-tile scan
 *  - Biome exploration tracking uses a tile count heuristic, not full enumeration
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface Tile {
  biome?: string;
}

interface ChunkManager {
  getChunk?(x: number, y: number): { tiles?: Tile[][] } | undefined;
  getLoadedChunks?(): Array<{ x: number; y: number; tiles?: Tile[][] }>;
}

const CHUNK_SIZE = 32;

/** Minimum unique tiles visited before we fire biome_explored for a biome. */
const BIOME_EXPLORED_TILE_THRESHOLD = 80;

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export class BiomeMilestoneSystem extends BaseSystem {
  public readonly id: SystemId = 'biome_milestone';
  public readonly priority: number = 865; // After MilestoneSystem (860), before metrics
  public readonly requiredComponents: ReadonlyArray<CT> = [];
  public readonly activationComponents = [] as const;

  // In-memory tracking sets (re-populated on world reload).
  private readonly discoveredBiomes = new Set<string>();
  private readonly settledBiomes = new Set<string>();
  private readonly exploredBiomes = new Set<string>();
  private readonly extractedBiomes = new Set<string>();

  // tile-key → biome at last observation; used to detect terrain transformation.
  // Populated as agents visit tiles (low memory overhead).
  private readonly observedTileBiome = new Map<string, string>();

  // biome → count of unique tile keys visited
  private readonly visitedTileCount = new Map<string, number>();
  // biome → Set of tile keys (deduplication)
  private readonly visitedTileKeys = new Map<string, Set<string>>();

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getTileAt(world: World, x: number, y: number): Tile | null {
    const chunkManager = world.getChunkManager() as ChunkManager | null;
    if (!chunkManager?.getChunk) return null;
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunk = chunkManager.getChunk(chunkX, chunkY);
    if (!chunk?.tiles) return null;
    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const row = chunk.tiles[localY];
    if (!row) return null;
    return row[localX] ?? null;
  }

  private getAgentName(world: World, agentId: string): string {
    const entity = world.getEntity(agentId) as EntityImpl | undefined;
    if (!entity) return 'an explorer';
    const identity = entity.getComponent<IdentityComponent>(CT.Identity);
    return identity?.name ?? 'an explorer';
  }

  private tileKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  // ---------------------------------------------------------------------------
  // Core milestone handlers
  // ---------------------------------------------------------------------------

  private handleAgentAtPosition(
    world: World,
    agentId: string,
    x: number,
    y: number,
    tick: number
  ): void {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const tile = this.getTileAt(world, tileX, tileY);
    if (!tile?.biome) return;

    const biome = tile.biome;
    const key = this.tileKey(tileX, tileY);

    // --- 1. Biome discovered ---
    if (!this.discoveredBiomes.has(biome)) {
      this.discoveredBiomes.add(biome);
      const agentName = this.getAgentName(world, agentId);
      world.eventBus.emit({
        type: 'civilization:biome_discovered',
        data: {
          biomeType: biome,
          agentId,
          agentName,
          x: tileX,
          y: tileY,
          summary: `${agentName} became the first to enter the ${biome} biome.`,
          tick,
        },
        source: 'biome_milestone_system',
      });
    }

    // --- 3. Biome explored (unique tile tracking) ---
    let tileSet = this.visitedTileKeys.get(biome);
    if (!tileSet) {
      tileSet = new Set<string>();
      this.visitedTileKeys.set(biome, tileSet);
    }
    if (!tileSet.has(key)) {
      tileSet.add(key);
      const count = tileSet.size;
      this.visitedTileCount.set(biome, count);

      if (count >= BIOME_EXPLORED_TILE_THRESHOLD && !this.exploredBiomes.has(biome)) {
        this.exploredBiomes.add(biome);
        world.eventBus.emit({
          type: 'civilization:biome_explored',
          data: {
            biomeType: biome,
            uniqueTilesVisited: count,
            summary: `The ${biome} biome has been fully mapped — ${count} distinct tiles explored.`,
            tick,
          },
          source: 'biome_milestone_system',
        });
      }
    }

    // --- 4. Terrain transformation detection ---
    const previousBiome = this.observedTileBiome.get(key);
    if (previousBiome !== undefined && previousBiome !== biome) {
      world.eventBus.emit({
        type: 'civilization:terrain_transformed',
        data: {
          x: tileX,
          y: tileY,
          fromBiome: previousBiome,
          toBiome: biome,
          summary: `The land at (${tileX}, ${tileY}) transformed from ${previousBiome} to ${biome}.`,
          tick,
        },
        source: 'biome_milestone_system',
      });
    }
    this.observedTileBiome.set(key, biome);
  }

  private handleTerrainModified(world: World, x: number, y: number, tick: number): void {
    const key = this.tileKey(x, y);
    const previousBiome = this.observedTileBiome.get(key);
    if (previousBiome === undefined) {
      // We haven't observed this tile before; record the current biome.
      const tile = this.getTileAt(world, x, y);
      if (tile?.biome) {
        this.observedTileBiome.set(key, tile.biome);
      }
      return;
    }

    const tile = this.getTileAt(world, x, y);
    if (!tile?.biome) return;
    const newBiome = tile.biome;

    if (newBiome !== previousBiome) {
      this.observedTileBiome.set(key, newBiome);
      world.eventBus.emit({
        type: 'civilization:terrain_transformed',
        data: {
          x,
          y,
          fromBiome: previousBiome,
          toBiome: newBiome,
          summary: `The land at (${x}, ${y}) transformed from ${previousBiome} to ${newBiome}.`,
          tick,
        },
        source: 'biome_milestone_system',
      });
    }
  }

  private handleBuildingAtPosition(
    world: World,
    agentId: string,
    buildingType: string,
    x: number,
    y: number,
    tick: number
  ): void {
    const tile = this.getTileAt(world, Math.floor(x), Math.floor(y));
    if (!tile?.biome) return;
    const biome = tile.biome;

    if (!this.settledBiomes.has(biome)) {
      this.settledBiomes.add(biome);
      const agentName = this.getAgentName(world, agentId);
      world.eventBus.emit({
        type: 'civilization:biome_settled',
        data: {
          biomeType: biome,
          agentId,
          agentName,
          buildingType,
          x: Math.floor(x),
          y: Math.floor(y),
          summary: `${agentName} built the first structure in the ${biome} biome — a ${buildingType}.`,
          tick,
        },
        source: 'biome_milestone_system',
      });
    }
  }

  private handleResourceExtraction(
    world: World,
    agentId: string,
    resourceType: string,
    x: number,
    y: number,
    tick: number
  ): void {
    const tile = this.getTileAt(world, Math.floor(x), Math.floor(y));
    if (!tile?.biome) return;
    const biome = tile.biome;

    if (!this.extractedBiomes.has(biome)) {
      this.extractedBiomes.add(biome);
      const agentName = this.getAgentName(world, agentId);
      world.eventBus.emit({
        type: 'civilization:resource_extracted',
        data: {
          biomeType: biome,
          resourceType,
          agentId,
          agentName,
          x: Math.floor(x),
          y: Math.floor(y),
          summary: `${agentName} began the first ${resourceType} extraction in the ${biome} biome.`,
          tick,
        },
        source: 'biome_milestone_system',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Event subscriptions
  // ---------------------------------------------------------------------------

  public onInit(world: World): void {
    // Biome discovery + exploration tracking: fire on agent arrival at destination
    world.eventBus.on('entity:arrived', (event) => {
      const { entityId, x, y } = event.data as { entityId: string; x: number; y: number };
      if (!entityId || x === undefined || y === undefined) return;
      const entity = world.getEntity(entityId);
      if (!entity) return;
      // Only track agents
      if (!entity.hasComponent(CT.Agent)) return;
      this.handleAgentAtPosition(world, entityId, x, y, Number(world.tick));
    });

    // Also hook navigation:arrived (older event shape)
    world.eventBus.on('navigation:arrived', (event) => {
      const { agentId, destination } = event.data as {
        agentId?: string;
        destination?: { x: number; y: number };
      };
      if (!agentId || !destination) return;
      this.handleAgentAtPosition(world, agentId, destination.x, destination.y, Number(world.tick));
    });

    // Terrain modification — detect biome changes
    world.eventBus.on('terrain:modified', (event) => {
      const { x, y } = event.data as { x: number; y?: number };
      if (x === undefined) return;
      this.handleTerrainModified(world, Math.floor(x), Math.floor(y ?? 0), Number(world.tick));
    });

    // Building settlement — listen to both legacy and new event shapes
    world.eventBus.on('building:complete', (event) => {
      const data = event.data as {
        builderId?: string;
        buildingType?: string;
        position?: { x: number; y: number };
      };
      if (!data.position) return;
      const agentId = data.builderId ?? '';
      this.handleBuildingAtPosition(
        world,
        agentId,
        data.buildingType ?? 'building',
        data.position.x,
        data.position.y,
        Number(world.tick)
      );
    });

    world.eventBus.on('building:completed', (event) => {
      const data = event.data as {
        builderId?: string;
        buildingType?: string;
        location?: { x: number; y: number };
      };
      if (!data.location) return;
      const agentId = data.builderId ?? '';
      this.handleBuildingAtPosition(
        world,
        agentId,
        data.buildingType ?? 'building',
        data.location.x,
        data.location.y,
        Number(world.tick)
      );
    });

    // Resource extraction — farming (harvest completed)
    world.eventBus.on('harvest:completed', (event) => {
      const data = event.data as {
        agentId?: string;
        position?: { x: number; y: number };
      };
      if (!data.position) return;
      this.handleResourceExtraction(
        world,
        data.agentId ?? '',
        'plant',
        data.position.x,
        data.position.y,
        Number(world.tick)
      );
    });

    // Resource extraction — mining
    world.eventBus.on('exploration:mining_operation_started', (event) => {
      const data = event.data as {
        agentId?: string;
        resourceType?: string;
        location?: { x: number; y: number };
      };
      if (!data.location) return;
      this.handleResourceExtraction(
        world,
        data.agentId ?? '',
        data.resourceType ?? 'mineral',
        data.location.x,
        data.location.y,
        Number(world.tick)
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Periodic update — not needed for most logic (event-driven) but kept as
  // a lightweight hook for future use (e.g. scanning on-screen agents that
  // don't fire arrived events while standing still on load).
  // ---------------------------------------------------------------------------
  protected readonly throttleInterval = 200; // 10 seconds — minimal overhead

  protected onUpdate(_ctx: SystemContext): void {
    // All tracking is event-driven. Nothing to do here currently.
  }
}
