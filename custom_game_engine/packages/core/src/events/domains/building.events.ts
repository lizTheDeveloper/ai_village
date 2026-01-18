/**
 * Building and construction events.
 * Covers building placement, construction progress, housing, and doors.
 */
import type { EntityId } from '../../types.js';

export interface BuildingEvents {
  // === Building Placement Events ===
  'building:placement:started': {
    blueprintId: string;
  };
  'building:placement:confirmed': {
    blueprintId: string;
    buildingId?: EntityId;
    position: { x: number; y: number };
    rotation: number;
  };
  'building:placement:cancelled': Record<string, never>; // No data
  'building:placement:complete': {
    buildingId: EntityId;
    blueprintId: string;
    position: { x: number; y: number };
    rotation: number;
    entityId?: EntityId;
  };
  'building:placement:failed': {
    blueprintId: string;
    position: { x: number; y: number };
    reason: 'terrain_invalid' | 'terrain_occupied' | 'resource_missing' | 'invalid_rotation';
  };

  // === Building Lifecycle Events ===
  'building:complete': {
    buildingId: EntityId;
    buildingType: string;
    entityId?: EntityId;
    position?: { x: number; y: number };
    builderId?: EntityId;
  };
  'building:completed': {
    buildingId: string;
    buildingType: string;
    location: { x: number; y: number };
    builderId?: string;
  };
  'building:spawned': {
    buildingId: EntityId;
    buildingType: string;
    cityId: string;
    position: { x: number; y: number };
    isComplete: boolean;
  };
  'building:destroyed': {
    buildingId: EntityId;
  };
  'building:claimed': {
    agentId: EntityId;
    buildingId: EntityId;
    buildingType: string;
    timestamp: number;
  };

  // === Building UI Events ===
  'building:menu:opened': Record<string, never>;
  'building:menu:closed': Record<string, never>;

  // === Building Condition Events ===
  'building:needs_repair': {
    buildingId: EntityId;
    buildingType: string;
    condition: number;
    position: { x: number; y: number };
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  'building:critical_repair': {
    buildingId: EntityId;
    buildingType: string;
    condition: number;
    position: { x: number; y: number };
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  'building:collapse_imminent': {
    buildingId: EntityId;
    buildingType: string;
    condition: number;
    position: { x: number; y: number };
    priority: 'low' | 'medium' | 'high' | 'critical';
  };

  // === Building Harmony Events ===
  'building:analyze_harmony': {
    buildingId: string;
  };
  'building:layout_provided': {
    buildingId: string;
    layout: unknown;
  };
  'building:harmony_analyzed': {
    buildingId: string;
    harmonyScore: number;
    aestheticScore?: number;
    functionalScore?: number;
    spatialScore?: number;
  };

  // === Construction Events ===
  'construction:started': {
    buildingId: EntityId;
    blueprintId: string;
    entityId?: EntityId;
    buildingType?: string;
    position?: { x: number; y: number };
    builderId?: EntityId;
  };
  'construction:gathering_resources': {
    buildingId: EntityId;
    agentId: EntityId;
    builderId?: EntityId;
  };
  'construction:failed': {
    buildingId: EntityId;
    reason: string;
    builderId?: EntityId;
    agentId: EntityId;
  };

  // === Tile Construction Events (Voxel Building System) ===
  'construction:task_created': {
    taskId: string;
    blueprintId?: string;
    position?: { x: number; y: number };
    builderId?: EntityId;
  };
  'construction:task_started': {
    taskId: string;
    blueprintId?: string;
  };
  'construction:task_cancelled': {
    taskId: string;
    reason?: string;
  };
  'construction:task_completed': {
    taskId: string;
    blueprintId?: string;
    position?: { x: number; y: number };
  };
  'construction:material_delivered': {
    taskId: string;
    tilePosition?: { x: number; y: number };
    materialId?: string;
    builderId?: string;
  };
  'construction:tile_placed': {
    taskId: string;
    tilePosition?: { x: number; y: number };
    tileType?: string;
    materialId?: string;
    builderId?: string;
    collaborators?: string[];
  };

  // === Demolition Events (Tile-Based Buildings) ===
  'construction:tile_demolished': {
    x: number;
    y: number;
    tileType: 'wall' | 'door' | 'window';
    material: string;
  };

  // === Door Events (Tile-Based Buildings) ===
  'door:opened': {
    x: number;
    y: number;
    tick: number;
  };
  'door:closed': {
    x: number;
    y: number;
    tick: number;
  };

  // === Housing Events ===
  'housing:dirty': {
    housingId: EntityId;
    buildingId?: EntityId;
    buildingType?: string;
    cleanlinessLevel: number;
  };
  'housing:full': {
    housingId: EntityId;
    buildingId?: EntityId;
    buildingType?: string;
    capacity: number;
    occupied: number;
  };
  'housing:cleaned': {
    housingId: EntityId;
    buildingId?: EntityId;
    buildingType?: string;
    agentId: EntityId;
    previousCleanliness?: number;
  };
}

export type BuildingEventType = keyof BuildingEvents;
export type BuildingEventData = BuildingEvents[BuildingEventType];
