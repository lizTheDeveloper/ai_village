/**
 * DimensionalRiftComponent - Tracks dimensional rifts/tears in spacetime
 *
 * Dimensional rifts are unstable tears in reality that can be created by:
 * - Divine rebellion events (when gods clash with the Supreme Creator)
 * - Failed magical experiments
 * - Megastructure catastrophic failures
 * - Natural cosmic phenomena
 * - Dimensional travel accidents
 *
 * Rifts can:
 * - Connect to other realms/dimensions
 * - Spawn entities from connected dimensions
 * - Destabilize local reality
 * - Be sealed by divine power or advanced technology
 * - Grow or shrink based on stability
 */

import type { Component } from '../ecs/Component.js';
import { ComponentType } from '../types/ComponentType.js';

export interface DimensionalRiftComponent extends Component {
  readonly type: ComponentType.DimensionalRift;
  readonly version: 1;

  /** Unique identifier for this rift */
  riftId: string;

  /** Severity of the rift */
  severity: RiftSeverity;

  /** How stable the rift is (0 = collapsing, 1 = perfectly stable) */
  stabilityLevel: number;

  /** Which dimension/realm this rift connects to (if any) */
  connectedRealm?: string;

  /** Tick when the rift was created */
  createdAt: number;

  /** What caused this rift to open */
  createdBy: RiftCreationSource;

  /** Entity ID that sealed this rift (if sealed) */
  sealedBy?: string;

  /** Tick when the rift was sealed (if sealed) */
  sealedAt?: number;

  /** Current size of the rift in world units */
  size: number;

  /** Rate at which the rift is growing/shrinking per tick */
  growthRate: number;

  /** Entities that have passed through this rift */
  entitiesPassed: string[];

  /** Whether the rift is currently spawning entities */
  isSpawning: boolean;

  /** Next tick when the rift will attempt to spawn */
  nextSpawnTick?: number;

  /** Total entities spawned through this rift */
  totalSpawned: number;

  /** Whether this rift has been observed by any agents */
  discovered: boolean;

  /** Agent IDs that have observed this rift */
  discoveredBy: string[];
}

export type RiftSeverity =
  | 'minor'        // Small tear, low impact, easy to seal
  | 'moderate'     // Noticeable tear, moderate impact
  | 'severe'       // Major tear, significant reality distortion
  | 'catastrophic'; // Reality-threatening, extremely difficult to seal

export type RiftCreationSource =
  | 'rebellion_event'      // Created by divine rebellion
  | 'magic_failure'        // Failed magical experiment
  | 'megastructure_failure' // Megastructure catastrophic failure
  | 'natural'              // Natural cosmic phenomenon
  | 'dimensional_travel'   // Accident during dimension travel
  | 'ritual'               // Intentional summoning ritual
  | 'reality_anchor'       // Side effect of reality anchor
  | 'unknown';             // Unknown source

/**
 * Create a dimensional rift component
 */
export function createDimensionalRift(
  riftId: string,
  severity: RiftSeverity,
  createdBy: RiftCreationSource,
  createdAt: number,
  options?: {
    connectedRealm?: string;
    stabilityLevel?: number;
    size?: number;
    growthRate?: number;
  }
): DimensionalRiftComponent {
  return {
    type: ComponentType.DimensionalRift,
    version: 1,
    riftId,
    severity,
    stabilityLevel: options?.stabilityLevel ?? getDefaultStability(severity),
    connectedRealm: options?.connectedRealm,
    createdAt,
    createdBy,
    size: options?.size ?? getDefaultSize(severity),
    growthRate: options?.growthRate ?? getDefaultGrowthRate(severity),
    entitiesPassed: [],
    isSpawning: false,
    totalSpawned: 0,
    discovered: false,
    discoveredBy: [],
  };
}

/**
 * Get default stability level based on severity
 */
function getDefaultStability(severity: RiftSeverity): number {
  switch (severity) {
    case 'minor': return 0.8;
    case 'moderate': return 0.6;
    case 'severe': return 0.4;
    case 'catastrophic': return 0.2;
  }
}

/**
 * Get default size based on severity
 */
function getDefaultSize(severity: RiftSeverity): number {
  switch (severity) {
    case 'minor': return 2;
    case 'moderate': return 5;
    case 'severe': return 10;
    case 'catastrophic': return 20;
  }
}

/**
 * Get default growth rate based on severity
 */
function getDefaultGrowthRate(severity: RiftSeverity): number {
  switch (severity) {
    case 'minor': return -0.01;      // Slowly closes
    case 'moderate': return 0;        // Stable
    case 'severe': return 0.01;       // Slowly grows
    case 'catastrophic': return 0.05; // Rapidly grows
  }
}

/**
 * Check if a rift is sealed
 */
export function isRiftSealed(rift: DimensionalRiftComponent): boolean {
  return rift.sealedBy !== undefined && rift.sealedAt !== undefined;
}

/**
 * Check if a rift is stable
 */
export function isRiftStable(rift: DimensionalRiftComponent): boolean {
  return rift.stabilityLevel >= 0.5;
}

/**
 * Check if a rift is growing
 */
export function isRiftGrowing(rift: DimensionalRiftComponent): boolean {
  return rift.growthRate > 0;
}

/**
 * Seal a rift
 */
export function sealRift(
  rift: DimensionalRiftComponent,
  sealedBy: string,
  sealedAt: number
): void {
  rift.sealedBy = sealedBy;
  rift.sealedAt = sealedAt;
  rift.stabilityLevel = 1.0;
  rift.growthRate = -0.1; // Rift starts closing
  rift.isSpawning = false;
}

/**
 * Mark a rift as discovered by an agent
 */
export function discoverRift(
  rift: DimensionalRiftComponent,
  agentId: string
): void {
  if (!rift.discovered) {
    rift.discovered = true;
  }
  if (!rift.discoveredBy.includes(agentId)) {
    rift.discoveredBy.push(agentId);
  }
}

/**
 * Get severity level as a number (for calculations)
 */
export function getSeverityLevel(severity: RiftSeverity): number {
  switch (severity) {
    case 'minor': return 1;
    case 'moderate': return 2;
    case 'severe': return 3;
    case 'catastrophic': return 4;
  }
}
