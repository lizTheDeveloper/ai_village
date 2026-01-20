/**
 * Exploration Domain Events
 *
 * Events for resource discovery, stellar exploration, and mining operations.
 * Used for era progression gating (eras 10+).
 *
 * Event flow:
 * 1. exploration:mission_started → Ship begins survey
 * 2. exploration:resource_discovered → Resource found at location
 * 3. exploration:mission_completed → Survey complete, discoveries logged
 * 4. exploration:mining_operation_started → Begin extraction
 * 5. exploration:stockpile_full → Resources ready for transport
 * 6. exploration:rare_find → Exotic/rare resource discovered (analytics)
 *
 * See: packages/core/src/systems/ExplorationDiscoverySystem.ts
 */

import type { BaseEvent } from '../EventMap.js';

// ============================================================================
// Exploration Mission Events
// ============================================================================

/**
 * Ship begins exploration mission
 */
export interface ExplorationMissionStartedEvent extends BaseEvent {
  type: 'exploration:mission_started';
  domain: 'exploration';
  payload: {
    /** Ship entity ID */
    shipId: string;
    /** Target stellar phenomenon or planet ID */
    targetId: string;
    /** Target type */
    targetType: 'stellar_phenomenon' | 'planet';
    /** Mission type */
    missionType: 'survey' | 'resource_scan' | 'deep_analysis';
    /** Target coordinates */
    targetCoordinates: { x: number; y: number; z: number };
    /** Civilization conducting mission */
    civilizationId: string;
  };
}

/**
 * Resource discovered during exploration
 */
export interface ExplorationResourceDiscoveredEvent extends BaseEvent {
  type: 'exploration:resource_discovered';
  domain: 'exploration';
  payload: {
    /** Ship entity ID */
    shipId: string;
    /** Resource type discovered */
    resourceType: string;
    /** Location ID (stellar phenomenon or planet) */
    locationId: string;
    /** Location type */
    locationType: 'stellar_phenomenon' | 'planet';
    /** Estimated abundance (0-1) */
    abundance: number;
    /** Extraction difficulty (0-1) */
    difficulty: number;
    /** Civilization that discovered it */
    civilizationId: string;
    /** Is this resource era-gated? */
    isEraGated: boolean;
    /** Era requirement (if era-gated) */
    eraRequirement?: number;
  };
}

/**
 * Exploration mission completed
 */
export interface ExplorationMissionCompletedEvent extends BaseEvent {
  type: 'exploration:mission_completed';
  domain: 'exploration';
  payload: {
    /** Ship entity ID */
    shipId: string;
    /** Target that was surveyed */
    targetId: string;
    /** Target type */
    targetType: 'stellar_phenomenon' | 'planet';
    /** Resources discovered during mission */
    discoveredResources: string[]; // Resource type IDs
    /** Mission duration in ticks */
    duration: number;
    /** Final progress (0-100%) */
    progress: number;
    /** Civilization conducting mission */
    civilizationId: string;
  };
}

/**
 * Rare or exotic resource found (high difficulty/low abundance)
 */
export interface ExplorationRareFindEvent extends BaseEvent {
  type: 'exploration:rare_find';
  domain: 'exploration';
  payload: {
    /** Ship entity ID */
    shipId: string;
    /** Rare resource discovered */
    resourceType: string;
    /** Location ID */
    locationId: string;
    /** Rarity score (difficulty + (1 - abundance)) / 2 */
    rarityScore: number;
    /** Civilization that found it */
    civilizationId: string;
    /** Is this the first discovery of this resource? */
    isFirstDiscovery: boolean;
  };
}

// ============================================================================
// Mining Operation Events
// ============================================================================

/**
 * Mining operation started at a location
 */
export interface ExplorationMiningOperationStartedEvent extends BaseEvent {
  type: 'exploration:mining_operation_started';
  domain: 'exploration';
  payload: {
    /** Mining operation entity ID */
    operationId: string;
    /** Location being mined */
    locationId: string;
    /** Location type */
    locationType: 'stellar_phenomenon' | 'planet';
    /** Resource being extracted */
    resourceType: string;
    /** Ships assigned to mining */
    assignedShips: string[];
    /** Expected harvest rate (units per tick) */
    harvestRate: number;
    /** Extraction efficiency (0-1) */
    efficiency: number;
    /** Civilization conducting operation */
    civilizationId: string;
  };
}

/**
 * Mining stockpile reached threshold, ready for transport
 */
export interface ExplorationStockpileFullEvent extends BaseEvent {
  type: 'exploration:stockpile_full';
  domain: 'exploration';
  payload: {
    /** Mining operation entity ID */
    operationId: string;
    /** Resource type in stockpile */
    resourceType: string;
    /** Current stockpile amount */
    stockpile: number;
    /** Location ID */
    locationId: string;
    /** Civilization owning the operation */
    civilizationId: string;
    /** Suggested transport: create shipping mission */
    suggestTransport: boolean;
  };
}

/**
 * Mining operation ended (depleted, abandoned, or completed)
 */
export interface ExplorationMiningOperationEndedEvent extends BaseEvent {
  type: 'exploration:mining_operation_ended';
  domain: 'exploration';
  payload: {
    /** Mining operation entity ID */
    operationId: string;
    /** Resource type */
    resourceType: string;
    /** Total extracted during operation */
    totalExtracted: number;
    /** Reason for ending */
    reason: 'depleted' | 'abandoned' | 'completed' | 'destroyed';
    /** Location ID */
    locationId: string;
    /** Civilization conducting operation */
    civilizationId: string;
  };
}

// ============================================================================
// Era Progression Events
// ============================================================================

/**
 * Era advancement blocked due to missing gated resources
 */
export interface EraAdvancementBlockedEvent extends BaseEvent {
  type: 'era:advancement_blocked';
  domain: 'exploration';
  payload: {
    /** Civilization entity ID */
    civilizationId: string;
    /** Current era */
    currentEra: number;
    /** Target era (blocked) */
    targetEra: number;
    /** Missing gated resources */
    missingResources: string[];
    /** Suggested locations to find missing resources */
    suggestedLocations?: Array<{
      locationId: string;
      locationType: 'stellar_phenomenon' | 'planet';
      resourceType: string;
      estimatedAbundance: number;
    }>;
  };
}

// ============================================================================
// Discovery Analytics Events
// ============================================================================

/**
 * New stellar phenomenon discovered
 */
export interface StellarPhenomenonDiscoveredEvent extends BaseEvent {
  type: 'exploration:stellar_phenomenon_discovered';
  domain: 'exploration';
  payload: {
    /** Phenomenon entity ID */
    phenomenonId: string;
    /** Phenomenon type */
    phenomenonType: string;
    /** Ship that discovered it */
    shipId: string;
    /** System ID */
    systemId: string;
    /** Coordinates */
    coordinates: { x: number; y: number; z: number };
    /** Number of resources at this location */
    resourceCount: number;
    /** Civilization that discovered it */
    civilizationId: string;
  };
}

/**
 * Planet discovered and catalogued
 */
export interface PlanetDiscoveredEvent extends BaseEvent {
  type: 'exploration:planet_discovered';
  domain: 'exploration';
  payload: {
    /** Planet ID */
    planetId: string;
    /** Planet type */
    planetType: string;
    /** Ship that discovered it */
    shipId: string;
    /** System ID */
    systemId: string;
    /** Estimated resource richness (0-1) */
    resourceRichness: number;
    /** Civilization that discovered it */
    civilizationId: string;
    /** Is this planet habitable? */
    isHabitable: boolean;
  };
}

// ============================================================================
// Event Type Union
// ============================================================================

export type ExplorationEvent =
  | ExplorationMissionStartedEvent
  | ExplorationResourceDiscoveredEvent
  | ExplorationMissionCompletedEvent
  | ExplorationRareFindEvent
  | ExplorationMiningOperationStartedEvent
  | ExplorationStockpileFullEvent
  | ExplorationMiningOperationEndedEvent
  | EraAdvancementBlockedEvent
  | StellarPhenomenonDiscoveredEvent
  | PlanetDiscoveredEvent;
