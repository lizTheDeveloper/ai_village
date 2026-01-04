/**
 * ZoneManager - Player-defined zone storage and queries
 *
 * Zones are player-designated areas that influence agent building placement.
 * This creates a planning layer where players provide guidance and agents
 * apply their intelligence within those constraints.
 *
 * Zone types:
 * - farming: Crops, wells, orchards
 * - storage: Chests, stockpiles, silos
 * - industry: Workshops, forges, crafting stations
 * - housing: Beds, homes, shelters
 * - social: Meeting areas, gathering spots
 * - pasture: Animal areas, fences
 * - wilderness: Leave untouched (no building)
 * - restricted: No building allowed (hard constraint)
 *
 * Usage:
 * ```typescript
 * const zoneManager = getZoneManager();
 *
 * // Player paints a farming zone
 * zoneManager.createZone('farming', 1);
 * zoneManager.addTilesToZone(zoneId, tiles);
 *
 * // Query zone at a tile
 * const zone = zoneManager.getZoneAt(x, y);
 *
 * // Get zone color for rendering
 * const color = zoneManager.getZoneColor('farming');
 * ```
 */

import type { BuildingType } from '../components/BuildingComponent.js';
import { BuildingType as BT } from '../types/BuildingType.js';

/**
 * Zone types that can be designated by players
 */
export type ZoneType =
  | 'farming'     // Crops, wells, orchards
  | 'storage'     // Chests, stockpiles, silos
  | 'industry'    // Workshops, forges, crafting
  | 'housing'     // Beds, homes, shelters
  | 'social'      // Meeting areas, gathering spots
  | 'pasture'     // Animal areas
  | 'wilderness'  // Leave untouched
  | 'restricted'; // No building allowed

/**
 * A zone is a player-designated area with a type and priority
 */
export interface Zone {
  readonly id: string;
  readonly type: ZoneType;
  readonly priority: number; // Higher = stronger influence (1-10)
  readonly tiles: Set<string>; // "x,y" keys
  readonly createdAt: number; // Tick when created
}

/**
 * Mapping of zone types to compatible building types.
 * Buildings in matching zones get a large placement bonus.
 * Buildings in non-matching zones get a penalty (but not forbidden).
 */
export const ZONE_BUILDING_AFFINITY: Record<ZoneType, readonly BuildingType[]> = {
  farming: [BT.Well, BT.FarmShed],
  storage: [BT.StorageChest, BT.StorageBox, BT.Barn],
  industry: [BT.Workbench, BT.Forge, BT.Windmill, BT.Workshop],
  housing: [BT.Tent, BT.Bed, BT.Bedroll, BT.LeanTo],
  social: [BT.Campfire],
  pasture: [BT.Barn, BT.Stable, BT.ChickenCoop, BT.Kennel],
  wilderness: [], // Nothing allowed
  restricted: [], // Nothing allowed
};

/**
 * Zone colors for rendering (RGBA, 0-1 scale with alpha)
 */
export const ZONE_COLORS: Record<ZoneType, { r: number; g: number; b: number; a: number }> = {
  farming: { r: 0.2, g: 0.7, b: 0.2, a: 0.3 },    // Green
  storage: { r: 0.6, g: 0.4, b: 0.2, a: 0.3 },    // Brown
  industry: { r: 0.5, g: 0.5, b: 0.5, a: 0.3 },   // Gray
  housing: { r: 0.2, g: 0.4, b: 0.8, a: 0.3 },    // Blue
  social: { r: 0.8, g: 0.6, b: 0.2, a: 0.3 },     // Yellow/Gold
  pasture: { r: 0.4, g: 0.8, b: 0.4, a: 0.3 },    // Light green
  wilderness: { r: 0.1, g: 0.5, b: 0.3, a: 0.2 }, // Dark green
  restricted: { r: 0.8, g: 0.2, b: 0.2, a: 0.3 }, // Red
};

/**
 * Get tile key for Map storage
 */
function getTileKey(x: number, y: number): string {
  return `${Math.floor(x)},${Math.floor(y)}`;
}

/**
 * Parse tile key back to coordinates
 */
function parseTileKey(key: string): { x: number; y: number } {
  const [xStr, yStr] = key.split(',');
  if (xStr === undefined || yStr === undefined) {
    throw new Error(`Invalid tile key: ${key}`);
  }
  return { x: parseInt(xStr, 10), y: parseInt(yStr, 10) };
}

/**
 * ZoneManager - Player zone storage and queries
 */
export class ZoneManager {
  private zones: Map<string, Zone> = new Map();
  private tileToZone: Map<string, string> = new Map(); // tile key -> zone id
  private zoneIdCounter: number = 0;

  /**
   * Create a new zone of the specified type
   * @returns The zone ID
   */
  createZone(type: ZoneType, priority: number = 5, tick: number = 0): string {
    if (priority < 1 || priority > 10) {
      throw new Error('Zone priority must be between 1 and 10');
    }

    const id = `zone_${this.zoneIdCounter++}`;
    const zone: Zone = {
      id,
      type,
      priority,
      tiles: new Set(),
      createdAt: tick,
    };

    this.zones.set(id, zone);
    return id;
  }

  /**
   * Add tiles to a zone
   * @throws Error if zone not found
   */
  addTilesToZone(zoneId: string, tiles: Array<{ x: number; y: number }>): void {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${zoneId}`);
    }

    for (const tile of tiles) {
      const key = getTileKey(tile.x, tile.y);

      // Remove from any existing zone first
      const existingZoneId = this.tileToZone.get(key);
      if (existingZoneId && existingZoneId !== zoneId) {
        const existingZone = this.zones.get(existingZoneId);
        if (existingZone) {
          existingZone.tiles.delete(key);
        }
      }

      // Add to new zone
      zone.tiles.add(key);
      this.tileToZone.set(key, zoneId);
    }
  }

  /**
   * Remove tiles from all zones
   */
  removeTilesFromZones(tiles: Array<{ x: number; y: number }>): void {
    for (const tile of tiles) {
      const key = getTileKey(tile.x, tile.y);
      const zoneId = this.tileToZone.get(key);

      if (zoneId) {
        const zone = this.zones.get(zoneId);
        if (zone) {
          zone.tiles.delete(key);
        }
        this.tileToZone.delete(key);
      }
    }
  }

  /**
   * Get the zone at a specific tile position
   * @returns Zone or null if no zone at this position
   */
  getZoneAt(x: number, y: number): Zone | null {
    const key = getTileKey(x, y);
    const zoneId = this.tileToZone.get(key);

    if (!zoneId) return null;

    return this.zones.get(zoneId) ?? null;
  }

  /**
   * Get zone type at a tile (convenience method)
   */
  getZoneTypeAt(x: number, y: number): ZoneType | null {
    const zone = this.getZoneAt(x, y);
    return zone?.type ?? null;
  }

  /**
   * Check if a building type is compatible with a zone type
   */
  isBuildingCompatible(buildingType: BuildingType, zoneType: ZoneType): boolean {
    const affinity = ZONE_BUILDING_AFFINITY[zoneType];
    return affinity.includes(buildingType);
  }

  /**
   * Get zone bonus/penalty for placing a building at a tile
   * @returns Score modifier: positive for good match, negative for mismatch, 0 for no zone
   */
  getZonePlacementScore(x: number, y: number, buildingType: BuildingType): number {
    const zone = this.getZoneAt(x, y);

    if (!zone) return 0; // No zone = neutral

    // Restricted and wilderness zones block all buildings
    if (zone.type === 'restricted' || zone.type === 'wilderness') {
      return -Infinity; // Hard block
    }

    const affinity = ZONE_BUILDING_AFFINITY[zone.type];

    if (affinity.includes(buildingType)) {
      // Good match: big bonus scaled by priority
      return 100 * zone.priority;
    } else {
      // Wrong zone: penalty (but not forbidden)
      return -50 * zone.priority;
    }
  }

  /**
   * Get a zone by ID
   */
  getZone(zoneId: string): Zone | null {
    return this.zones.get(zoneId) ?? null;
  }

  /**
   * Get all zones
   */
  getAllZones(): Zone[] {
    return Array.from(this.zones.values());
  }

  /**
   * Get all zones of a specific type
   */
  getZonesByType(type: ZoneType): Zone[] {
    return Array.from(this.zones.values()).filter((z) => z.type === type);
  }

  /**
   * Delete a zone
   */
  deleteZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);
    if (!zone) return;

    // Remove all tile mappings
    for (const tileKey of zone.tiles) {
      this.tileToZone.delete(tileKey);
    }

    this.zones.delete(zoneId);
  }

  /**
   * Get all tiles in a zone
   */
  getZoneTiles(zoneId: string): Array<{ x: number; y: number }> {
    const zone = this.zones.get(zoneId);
    if (!zone) return [];

    return Array.from(zone.tiles).map(parseTileKey);
  }

  /**
   * Get zone color for rendering
   */
  getZoneColor(type: ZoneType): { r: number; g: number; b: number; a: number } {
    return ZONE_COLORS[type];
  }

  /**
   * Clear all zones
   */
  clearAll(): void {
    this.zones.clear();
    this.tileToZone.clear();
    this.zoneIdCounter = 0;
  }

  /**
   * Serialize zones to ZoneSnapshot[] format for world persistence.
   * This is used by WorldSerializer for save/load.
   */
  serializeZones(): Array<{
    $schema: 'https://aivillage.dev/schemas/zone/v1';
    $version: number;
    id: string;
    type: ZoneType;
    priority: number;
    tiles: string[];
    createdAt: number;
  }> {
    const snapshots = [];

    for (const zone of this.zones.values()) {
      snapshots.push({
        $schema: 'https://aivillage.dev/schemas/zone/v1' as const,
        $version: 1,
        id: zone.id,
        type: zone.type,
        priority: zone.priority,
        tiles: Array.from(zone.tiles),
        createdAt: zone.createdAt,
      });
    }

    return snapshots;
  }

  /**
   * Deserialize zones from ZoneSnapshot[] format.
   * Clears existing zones and rebuilds from snapshots.
   */
  deserializeZones(snapshots: Array<{
    id: string;
    type: ZoneType;
    priority: number;
    tiles: string[];
    createdAt: number;
  }>): void {
    // Clear existing zones
    this.zones.clear();
    this.tileToZone.clear();

    // Find max zone ID to set counter
    let maxId = 0;
    for (const snapshot of snapshots) {
      const match = snapshot.id.match(/zone_(\d+)/);
      if (match && match[1]) {
        maxId = Math.max(maxId, parseInt(match[1], 10));
      }
    }
    this.zoneIdCounter = maxId + 1;

    // Restore zones
    for (const snapshot of snapshots) {
      const zone: Zone = {
        id: snapshot.id,
        type: snapshot.type,
        priority: snapshot.priority,
        tiles: new Set(snapshot.tiles),
        createdAt: snapshot.createdAt,
      };

      this.zones.set(zone.id, zone);

      // Rebuild tile->zone mapping
      for (const tileKey of zone.tiles) {
        this.tileToZone.set(tileKey, zone.id);
      }
    }

    console.log(`[ZoneManager] Deserialized ${snapshots.length} zones`);
  }

  /**
   * Serialize for save/load (legacy format for backward compatibility)
   * @deprecated Use serializeZones() instead
   */
  serialize(): object {
    const zonesData: Array<{
      id: string;
      type: ZoneType;
      priority: number;
      tiles: string[];
      createdAt: number;
    }> = [];

    for (const [, zone] of this.zones) {
      zonesData.push({
        id: zone.id,
        type: zone.type,
        priority: zone.priority,
        tiles: Array.from(zone.tiles),
        createdAt: zone.createdAt,
      });
    }

    return {
      zones: zonesData,
      zoneIdCounter: this.zoneIdCounter,
    };
  }

  /**
   * Deserialize from save
   */
  static deserialize(data: {
    zones: Array<{
      id: string;
      type: ZoneType;
      priority: number;
      tiles: string[];
      createdAt: number;
    }>;
    zoneIdCounter: number;
  }): ZoneManager {
    const manager = new ZoneManager();
    manager.zoneIdCounter = data.zoneIdCounter;

    for (const zoneData of data.zones) {
      const zone: Zone = {
        id: zoneData.id,
        type: zoneData.type,
        priority: zoneData.priority,
        tiles: new Set(zoneData.tiles),
        createdAt: zoneData.createdAt,
      };

      manager.zones.set(zone.id, zone);

      // Rebuild tile->zone mapping
      for (const tileKey of zone.tiles) {
        manager.tileToZone.set(tileKey, zone.id);
      }
    }

    return manager;
  }
}

// ============================================================================
// Singleton for world-level access
// ============================================================================

let globalZoneManager: ZoneManager | null = null;

/**
 * Get the global ZoneManager instance.
 * Creates one if it doesn't exist.
 */
export function getZoneManager(): ZoneManager {
  if (!globalZoneManager) {
    globalZoneManager = new ZoneManager();
  }
  return globalZoneManager;
}

/**
 * Set the global ZoneManager (e.g., when loading a save)
 */
export function setZoneManager(zoneManager: ZoneManager): void {
  globalZoneManager = zoneManager;
}

/**
 * Reset the global ZoneManager (e.g., for new game)
 */
export function resetZoneManager(): void {
  globalZoneManager = new ZoneManager();
}
