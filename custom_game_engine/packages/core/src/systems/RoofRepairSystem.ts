/**
 * RoofRepairSystem - Adds missing roofs to existing buildings
 *
 * One-time migration system to fix buildings that were created before roof rendering.
 * Can be removed after all saves have been migrated.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { RoofMaterial, WallMaterial, Tile } from '@ai-village/world';

export class RoofRepairSystem extends BaseSystem {
  readonly id = 'roof_repair' as const;
  readonly priority = 950;
  readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  private hasRun = false;

  /**
   * Check if a chunk is generated before calling getTileAt.
   * CRITICAL: Prevents expensive terrain generation (20-50ms per chunk!)
   */
  private isChunkGenerated(
    tileX: number,
    tileY: number,
    chunkManager: { getChunk: (x: number, y: number) => { generated?: boolean } | undefined } | undefined
  ): boolean {
    if (!chunkManager) return true; // No chunk manager, assume generated

    const CHUNK_SIZE = 32;
    const chunkX = Math.floor(tileX / CHUNK_SIZE);
    const chunkY = Math.floor(tileY / CHUNK_SIZE);
    const chunk = chunkManager.getChunk(chunkX, chunkY);

    return chunk?.generated === true;
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    // Only run once per session
    if (this.hasRun) return;
    this.hasRun = true;

    console.log('[RoofRepair] Checking for buildings missing roofs...');

    // Get chunk manager for generation checks
    const worldWithChunks = world as {
      getChunkManager?: () => {
        getChunk: (x: number, y: number) => { generated?: boolean } | undefined;
      } | undefined;
    };
    const chunkManager = typeof worldWithChunks.getChunkManager === 'function'
      ? worldWithChunks.getChunkManager()
      : undefined;

    const buildings = world.query()
      .with(CT.Building)
      .with(CT.Position)
      .executeEntities();

    let buildingsRepaired = 0;
    let tilesRepaired = 0;

    for (const building of buildings) {
      const buildingComp = building.components.get(CT.Building) as BuildingComponent;
      const position = building.components.get(CT.Position) as PositionComponent;

      // Determine roof material from building type or first wall material found
      const roofMaterial = this.inferRoofMaterial(world, position, buildingComp, chunkManager);

      if (!roofMaterial) {
        continue; // No walls found, skip this building
      }

      // Add roofs to all tiles within the building's footprint
      const repaired = this.addRoofsToBuilding(world, position, buildingComp, roofMaterial, chunkManager);

      if (repaired > 0) {
        buildingsRepaired++;
        tilesRepaired += repaired;
        console.log(`[RoofRepair] Added ${roofMaterial} roof to ${buildingComp.type} at (${position.x}, ${position.y}) - ${repaired} tiles`);
      }
    }

    if (buildingsRepaired > 0) {
      console.log(`[RoofRepair] ✅ Repaired ${buildingsRepaired} buildings (${tilesRepaired} tiles)`);
    } else {
      console.log('[RoofRepair] All buildings already have roofs!');
    }
  }

  /**
   * Infer appropriate roof material by scanning building tiles.
   * Returns the roof material that should be used based on wall materials.
   */
  private inferRoofMaterial(
    world: World,
    position: PositionComponent,
    building: BuildingComponent,
    chunkManager: { getChunk: (x: number, y: number) => { generated?: boolean } | undefined } | undefined
  ): RoofMaterial | null {
    if (!world.getTileAt) return null;

    // Sample a few tiles to find wall material
    const checkRadius = 10; // Check 10 tiles in each direction
    for (let dy = -checkRadius; dy <= checkRadius; dy++) {
      for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        const tx = position.x + dx;
        const ty = position.y + dy;

        // CRITICAL: Skip ungenerated chunks to avoid expensive terrain generation
        if (!this.isChunkGenerated(tx, ty, chunkManager)) {
          continue;
        }

        const tile = world.getTileAt(tx, ty) as Tile | null;

        if (tile?.wall) {
          return this.deriveRoofMaterial(tile.wall.material);
        }
      }
    }

    // Default based on building name
    const buildingType = building.type.toLowerCase();
    if (buildingType.includes('cottage') || buildingType.includes('wood')) {
      return 'thatch';
    }
    if (buildingType.includes('stone') || buildingType.includes('house')) {
      return 'tile';
    }
    if (buildingType.includes('metal')) {
      return 'metal';
    }

    return 'thatch'; // Default fallback
  }

  /**
   * Derive roof material from wall material (same logic as BuildingSystem).
   */
  private deriveRoofMaterial(wallMaterial: WallMaterial): RoofMaterial {
    switch (wallMaterial) {
      case 'wood':
      case 'thatch':
        return 'thatch';
      case 'stone':
      case 'mud_brick':
        return 'tile';
      case 'metal':
        return 'metal';
      case 'ice':
        return 'wood';
      case 'glass':
        return 'slate';
      default:
        return 'thatch';
    }
  }

  /**
   * Add roofs to all tiles that have walls/floors but no roof.
   */
  private addRoofsToBuilding(
    world: World,
    position: PositionComponent,
    building: BuildingComponent,
    roofMaterial: RoofMaterial,
    chunkManager: { getChunk: (x: number, y: number) => { generated?: boolean } | undefined } | undefined
  ): number {
    if (!world.getTileAt) return 0;

    let tilesRepaired = 0;
    const checkRadius = 15; // Check 15 tiles in each direction (should cover most buildings)

    for (let dy = -checkRadius; dy <= checkRadius; dy++) {
      for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        const tx = position.x + dx;
        const ty = position.y + dy;

        // CRITICAL: Skip ungenerated chunks to avoid expensive terrain generation
        if (!this.isChunkGenerated(tx, ty, chunkManager)) {
          continue;
        }

        const tile = world.getTileAt(tx, ty) as Tile | null;

        if (!tile) continue;

        // Add roof if tile has walls, floors, doors, or windows but no roof
        const needsRoof = (tile.wall || tile.floor || tile.door || tile.window) && !tile.roof;

        if (needsRoof) {
          tile.roof = {
            material: roofMaterial,
            condition: 100,
            constructedAt: world.tick,
          };
          tilesRepaired++;
        }
      }
    }

    return tilesRepaired;
  }
}
