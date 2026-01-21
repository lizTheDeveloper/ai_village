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

import type { EntityId } from '../../types.js';

export interface ExplorationEvents {
  // === Exploration Mission Events ===

  /** Ship begins exploration mission */
  'exploration:mission_started': {
    shipId: EntityId;
    targetId: string;
    targetType: 'stellar_phenomenon' | 'planet';
    missionType: 'survey' | 'resource_scan' | 'deep_analysis';
    targetCoordinates: { x: number; y: number; z: number };
    civilizationId: EntityId;
  };

  /** Resource discovered during exploration */
  'exploration:resource_discovered': {
    shipId: EntityId;
    resourceType: string;
    locationId: string;
    locationType: 'stellar_phenomenon' | 'planet';
    abundance: number;
    difficulty: number;
    civilizationId: EntityId;
    isEraGated: boolean;
    eraRequirement?: number;
  };

  /** Exploration mission completed */
  'exploration:mission_completed': {
    shipId: EntityId;
    targetId: string;
    targetType: 'stellar_phenomenon' | 'planet';
    discoveredResources: string[];
    duration: number;
    progress: number;
    civilizationId: EntityId;
  };

  /** Rare or exotic resource found (high difficulty/low abundance) */
  'exploration:rare_find': {
    shipId: EntityId;
    resourceType: string;
    locationId: string;
    rarityScore: number;
    civilizationId: EntityId;
    isFirstDiscovery: boolean;
  };

  // === Mining Operation Events ===

  /** Mining operation started at a location */
  'exploration:mining_operation_started': {
    operationId: EntityId;
    locationId: string;
    locationType: 'stellar_phenomenon' | 'planet';
    resourceType: string;
    assignedShips: EntityId[];
    harvestRate: number;
    efficiency: number;
    civilizationId: EntityId;
  };

  /** Mining stockpile reached threshold, ready for transport */
  'exploration:stockpile_full': {
    operationId: EntityId;
    resourceType: string;
    stockpile: number;
    locationId: string;
    civilizationId: EntityId;
    suggestTransport: boolean;
  };

  /** Mining operation ended (depleted, abandoned, or completed) */
  'exploration:mining_operation_ended': {
    operationId: EntityId;
    resourceType: string;
    totalExtracted: number;
    reason: 'depleted' | 'abandoned' | 'completed' | 'destroyed';
    locationId: string;
    civilizationId: EntityId;
  };

  /** Mining accident occurred at operation */
  'exploration:mining_accident': {
    operationId: EntityId;
    shipId: EntityId;
    accidentType: 'radiation_exposure' | 'structural_failure' | 'equipment_malfunction' | 'asteroid_impact';
    damage: number;
    casualties: number;
    shipDestroyed: boolean;
    locationId: string;
    civilizationId: EntityId;
  };

  // === Era Progression Events ===

  /** Era advancement blocked due to missing gated resources */
  'era:advancement_blocked': {
    civilizationId: EntityId;
    currentEra: number;
    targetEra: number;
    missingResources: string[];
    suggestedLocations?: Array<{
      locationId: string;
      locationType: 'stellar_phenomenon' | 'planet';
      resourceType: string;
      estimatedAbundance: number;
    }>;
  };

  // === Discovery Analytics Events ===

  /** New stellar phenomenon discovered */
  'exploration:stellar_phenomenon_discovered': {
    phenomenonId: string;
    phenomenonType: string;
    shipId: EntityId;
    systemId: string;
    coordinates: { x: number; y: number; z: number };
    resourceCount: number;
    civilizationId: EntityId;
  };

  /** Planet discovered and catalogued */
  'exploration:planet_discovered': {
    planetId: string;
    planetType: string;
    shipId: EntityId;
    systemId: string;
    resourceRichness: number;
    civilizationId: EntityId;
    isHabitable: boolean;
  };
}
