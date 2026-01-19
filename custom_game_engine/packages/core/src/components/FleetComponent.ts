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
  | 'pirate_hunt'     // Hunt raiders
  | 'exploration'     // Map β-space
  | 'show_of_force'   // Intimidation
  | 'relief'          // Aid distressed system
  | 'blockade';       // Starve system

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
   * Fleet composition
   */
  squadrons: {
    squadronIds: string[];  // 3-10 squadrons
    totalShips: number;     // Sum of all ships
    totalCrew: number;      // Sum of all crew
    shipTypeBreakdown: Record<SpaceshipType, number>;
  };

  /**
   * Fleet admiral (soul agent, commands from flagship)
   */
  admiralId: string; // Soul agent
  flagshipSquadronId: string;
  flagshipShipId: string;

  /**
   * Fleet coherence (aggregated from squadrons)
   */
  coherence: {
    average: number;      // Mean squadron coherence
    distribution: {       // Histogram of squadron coherences
      low: number;        // Squadrons < 0.5 coherence
      medium: number;     // 0.5-0.7
      high: number;       // > 0.7
    };
    fleetCoherenceRating: 'poor' | 'adequate' | 'excellent';
  };

  /**
   * Fleet operational status
   */
  status: {
    readiness: number;    // 0-1, can fleet deploy?
    inCombat: boolean;
    currentSystem: string; // Star system ID
    destination?: string;  // System ID
    eta?: number;          // Ticks to arrival
  };

  /**
   * Fleet mission
   */
  mission: {
    type: FleetMissionType;
    objective: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    startTick: number;
    expectedDuration: number; // Ticks
    progress: number;         // 0-1
  };

  /**
   * Combat capability (statistical)
   */
  combat: {
    offensiveRating: number;  // 0-100
    defensiveRating: number;
    marineStrength: number;   // Total marines
    combatHistory: {
      battlesWon: number;
      battlesLost: number;
      shipsLost: number;
    };
  };

  /**
   * Supply and logistics
   */
  logistics: {
    supplyDepotSystemId?: string; // Where fleet resupplies
    fuelReserves: number;          // Days of β-navigation fuel
    repairCapability: number;      // Can repair X% hull per day
    rangeFromSupply: number;       // Max distance from depot
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createFleetComponent(
  name: string,
  admiralId: string,
  flagshipSquadronId: string,
  flagshipShipId: string,
  squadronIds: string[]
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
    squadrons: {
      squadronIds,
      totalShips: 0,
      totalCrew: 0,
      shipTypeBreakdown: {} as Record<SpaceshipType, number>,
    },
    admiralId,
    flagshipSquadronId,
    flagshipShipId,
    coherence: {
      average: 0,
      distribution: {
        low: 0,
        medium: 0,
        high: 0,
      },
      fleetCoherenceRating: 'adequate',
    },
    status: {
      readiness: 1.0,
      inCombat: false,
      currentSystem: 'unknown',
    },
    mission: {
      type: 'patrol',
      objective: 'Default patrol mission',
      priority: 'low',
      startTick: 0,
      expectedDuration: 1000,
      progress: 0,
    },
    combat: {
      offensiveRating: 0,
      defensiveRating: 0,
      marineStrength: 0,
      combatHistory: {
        battlesWon: 0,
        battlesLost: 0,
        shipsLost: 0,
      },
    },
    logistics: {
      fuelReserves: 100,
      repairCapability: 0.1,
      rangeFromSupply: 1000,
    },
  };
}

/**
 * Calculate fleet coherence from squadron coherences
 */
export function calculateFleetCoherence(squadronCoherences: number[]): {
  average: number;
  distribution: { low: number; medium: number; high: number };
  fleetCoherenceRating: 'poor' | 'adequate' | 'excellent';
} {
  if (squadronCoherences.length === 0) {
    throw new Error('Cannot calculate coherence for empty fleet');
  }

  const mean = squadronCoherences.reduce((sum, c) => sum + c, 0) / squadronCoherences.length;

  // Categorize squadrons
  const low = squadronCoherences.filter((c) => c < 0.5).length;
  const medium = squadronCoherences.filter((c) => c >= 0.5 && c < 0.7).length;
  const high = squadronCoherences.filter((c) => c >= 0.7).length;

  // Fleet coherence rating
  let rating: 'poor' | 'adequate' | 'excellent';
  if (mean < 0.5 || low > squadronCoherences.length * 0.5) {
    rating = 'poor'; // Too many low-coherence squadrons
  } else if (mean >= 0.7 && high > squadronCoherences.length * 0.7) {
    rating = 'excellent';
  } else {
    rating = 'adequate';
  }

  return {
    average: mean,
    distribution: { low, medium, high },
    fleetCoherenceRating: rating,
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
    { name: 'squadrons', type: 'object', required: true },
    { name: 'admiralId', type: 'string', required: true },
    { name: 'flagshipSquadronId', type: 'string', required: true },
    { name: 'flagshipShipId', type: 'string', required: true },
    { name: 'coherence', type: 'object', required: true },
    { name: 'status', type: 'object', required: true },
    { name: 'mission', type: 'object', required: true },
    { name: 'combat', type: 'object', required: true },
    { name: 'logistics', type: 'object', required: true },
  ],
  validate: (data: unknown): data is FleetComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'fleet') return false;
    if (!('fleetId' in data) || typeof data.fleetId !== 'string') return false;
    if (!('name' in data) || typeof data.name !== 'string') return false;
    if (!('squadrons' in data) || typeof data.squadrons !== 'object') return false;
    if (!('admiralId' in data) || typeof data.admiralId !== 'string') return false;
    if (!('flagshipSquadronId' in data) || typeof data.flagshipSquadronId !== 'string')
      return false;
    if (!('flagshipShipId' in data) || typeof data.flagshipShipId !== 'string') return false;
    return true;
  },
  createDefault: () =>
    createFleetComponent('Default Fleet', 'admiral1', 'squadron1', 'ship1', [
      'squadron1',
      'squadron2',
      'squadron3',
    ]),
};
