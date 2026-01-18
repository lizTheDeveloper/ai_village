import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

export type FleetMissionType =
  | 'defense'         // Defend system
  | 'invasion'        // Conquer system
  | 'patrol'          // Multi-system patrol
  | 'trade_escort'    // Protect trade route
  | 'exploration';    // Map β-space

// ============================================================================
// Interface
// ============================================================================

/**
 * Fleet - strategic squadron group (3-10 squadrons)
 * Tier 3 of ship-fleet hierarchy
 */
export interface FleetComponent extends Component {
  type: 'fleet';

  fleetId: string;
  name: string;

  /**
   * Fleet composition (3-10 squadrons)
   */
  squadronIds: string[];

  /**
   * Lead squadron
   */
  flagshipSquadronId: string;

  /**
   * Soul agent admiral (commands entire fleet)
   */
  admiralAgentId?: string;

  /**
   * Aggregate statistics from squadrons
   */
  totalShips: number;
  totalCrew: number;

  /**
   * Fleet coherence (aggregated from squadrons)
   * Weighted average of squadron coherences
   */
  fleetCoherence: number;

  /**
   * Fleet strength (statistical combat power)
   */
  fleetStrength: number;

  /**
   * Home port (station or planet)
   */
  homePortId?: string;

  /**
   * Operational range from home port
   */
  operationalRange: number;

  /**
   * Supply level (0-1)
   * Low supply degrades coherence and combat strength
   */
  supplyLevel: number;

  /**
   * Current fleet mission
   */
  currentMission?: {
    type: FleetMissionType;
    objective: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    startTick: number;
    expectedDuration: number;
    progress: number; // 0-1
  };

  /**
   * Ship type breakdown across all squadrons
   */
  shipTypeBreakdown: Record<SpaceshipType, number>;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createFleetComponent(
  name: string,
  squadronIds: string[],
  flagshipSquadronId: string,
  admiralAgentId?: string
): FleetComponent {
  if (squadronIds.length < 3 || squadronIds.length > 10) {
    throw new Error(`Fleet must have 3-10 squadrons, got ${squadronIds.length}`);
  }

  if (!squadronIds.includes(flagshipSquadronId)) {
    throw new Error('Flagship squadron must be one of the fleet squadrons');
  }

  return {
    type: 'fleet',
    version: 1,
    fleetId: `fleet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    squadronIds,
    flagshipSquadronId,
    admiralAgentId,
    totalShips: 0,
    totalCrew: 0,
    fleetCoherence: 0,
    fleetStrength: 0,
    operationalRange: 100, // Default range
    supplyLevel: 1.0, // Fully supplied
    shipTypeBreakdown: {} as Record<SpaceshipType, number>,
  };
}

// ============================================================================
// Schema
// ============================================================================

export const FleetComponentSchema: ComponentSchema<FleetComponent> = {
  type: 'fleet',
  version: 1,
  fields: [
    { name: 'fleetId', type: 'string', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'squadronIds', type: 'array', required: true },
    { name: 'flagshipSquadronId', type: 'string', required: true },
    { name: 'admiralAgentId', type: 'string', required: false },
    { name: 'totalShips', type: 'number', required: true },
    { name: 'totalCrew', type: 'number', required: true },
    { name: 'fleetCoherence', type: 'number', required: true },
    { name: 'fleetStrength', type: 'number', required: true },
    { name: 'homePortId', type: 'string', required: false },
    { name: 'operationalRange', type: 'number', required: true },
    { name: 'supplyLevel', type: 'number', required: true },
    { name: 'currentMission', type: 'object', required: false },
    { name: 'shipTypeBreakdown', type: 'object', required: true },
  ],
  validate: (data: unknown): data is FleetComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'fleet') return false;
    if (!('fleetId' in data) || typeof data.fleetId !== 'string') return false;
    if (!('name' in data) || typeof data.name !== 'string') return false;
    if (!('squadronIds' in data) || !Array.isArray(data.squadronIds)) return false;
    if (!('flagshipSquadronId' in data) || typeof data.flagshipSquadronId !== 'string') return false;
    return true;
  },
  createDefault: () => createFleetComponent(
    'Default Fleet',
    ['squadron1', 'squadron2', 'squadron3'],
    'squadron1'
  ),
};
