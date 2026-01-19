import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

export type SquadronFormation =
  | 'line_ahead'      // Ships in line (good for broadside)
  | 'line_abreast'    // Ships side-by-side (wide front)
  | 'wedge'           // V formation (focus fire)
  | 'sphere'          // Defensive ball (protect flagship)
  | 'echelon'         // Diagonal steps (flanking)
  | 'scattered';      // No formation (independent)

export type SquadronMissionType =
  | 'patrol'          // Monitor area
  | 'escort'          // Protect trade ship
  | 'reconnaissance'  // Scout β-space branches
  | 'assault'         // Attack target
  | 'blockade'        // Prevent passage
  | 'rescue'          // Extract stranded ship
  | 'exploration';    // Map unknown regions

// ============================================================================
// Interface
// ============================================================================

/**
 * Squadron - tactical ship formation (3-10 ships)
 * Tier 2 of ship-fleet hierarchy
 */
export interface SquadronComponent extends Component {
  type: 'squadron';

  squadronId: string;
  name: string;

  /**
   * Squadron composition
   */
  ships: {
    shipIds: string[];  // 3-10 ships
    totalCrew: number;  // Sum of all crew
    shipTypes: Record<SpaceshipType, number>; // e.g., {courier_ship: 2, threshold_ship: 1}
  };

  /**
   * Squadron commander (soul agent, captain of flagship)
   */
  commanderId: string; // Soul agent
  flagshipId: string;  // Which ship is flagship

  /**
   * Squadron coherence (average of ship coherences)
   */
  coherence: {
    average: number;      // Mean coherence across all ships
    min: number;          // Weakest ship
    max: number;          // Strongest ship
    variance: number;     // Coherence spread (high = formation unstable)
  };

  /**
   * Formation type (affects combat, navigation)
   */
  formation: SquadronFormation;

  /**
   * Squadron mission
   */
  mission: {
    type: SquadronMissionType;
    targetLocation?: { x: number; y: number; z: number };
    targetEntityId?: string;
    escortedTradeAgreementId?: string; // If escorting trade
    status: 'planning' | 'en_route' | 'engaged' | 'completed';
  };

  /**
   * Combat readiness
   */
  combat: {
    totalFirepower: number;    // Sum of ship weapons
    totalMarines: number;      // Sum of marines across ships
    avgHullIntegrity: number;  // Health of squadron
    combatExperience: number;  // 0-1, improves coordination
  };

  /**
   * Supply state
   */
  logistics: {
    fuelReserves: number;      // β-navigation fuel (emotional energy)
    repairParts: number;
    foodSupply: number;        // Crew sustenance
    estimatedRange: number;    // How far squadron can go
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createSquadronComponent(
  name: string,
  commanderId: string,
  flagshipId: string,
  shipIds: string[]
): SquadronComponent {
  if (shipIds.length < 3 || shipIds.length > 10) {
    throw new Error(`Squadron must have 3-10 ships, got ${shipIds.length}`);
  }

  if (!shipIds.includes(flagshipId)) {
    throw new Error('Flagship must be one of the squadron ships');
  }

  return {
    type: 'squadron',
    version: 1,
    squadronId: `squadron_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    ships: {
      shipIds,
      totalCrew: 0,
      shipTypes: {} as Record<SpaceshipType, number>,
    },
    commanderId,
    flagshipId,
    coherence: {
      average: 0,
      min: 0,
      max: 0,
      variance: 0,
    },
    formation: 'line_ahead',
    mission: {
      type: 'patrol',
      status: 'planning',
    },
    combat: {
      totalFirepower: 0,
      totalMarines: 0,
      avgHullIntegrity: 1.0,
      combatExperience: 0,
    },
    logistics: {
      fuelReserves: 100,
      repairParts: 50,
      foodSupply: 100,
      estimatedRange: 1000,
    },
  };
}

/**
 * Calculate squadron coherence from constituent ship coherences
 */
export function calculateSquadronCoherence(shipCoherences: number[]): {
  average: number;
  min: number;
  max: number;
  variance: number;
} {
  if (shipCoherences.length === 0) {
    throw new Error('Cannot calculate coherence for empty squadron');
  }

  const average = shipCoherences.reduce((sum, c) => sum + c, 0) / shipCoherences.length;
  const min = Math.min(...shipCoherences);
  const max = Math.max(...shipCoherences);

  // Calculate variance (standard deviation)
  const variance =
    Math.sqrt(
      shipCoherences.reduce((sum, c) => sum + Math.pow(c - average, 2), 0) /
        shipCoherences.length
    ) || 0;

  return {
    average,
    min,
    max,
    variance,
  };
}

/**
 * Add a ship to a squadron
 * Returns updated squadron component
 */
export function addShipToSquadron(
  squadron: SquadronComponent,
  shipId: string,
  shipType: SpaceshipType,
  crewCount: number
): SquadronComponent {
  if (squadron.ships.shipIds.length >= 10) {
    throw new Error('Squadron already has maximum 10 ships');
  }

  const newShipIds = [...squadron.ships.shipIds, shipId];
  const newShipTypes = { ...squadron.ships.shipTypes };
  newShipTypes[shipType] = (newShipTypes[shipType] || 0) + 1;

  return {
    ...squadron,
    ships: {
      shipIds: newShipIds,
      totalCrew: squadron.ships.totalCrew + crewCount,
      shipTypes: newShipTypes,
    },
  };
}

// ============================================================================
// Schema
// ============================================================================

export const SquadronComponentSchema: ComponentSchema<SquadronComponent> = {
  type: 'squadron',
  version: 1,
  fields: [
    { name: 'squadronId', type: 'string', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'ships', type: 'object', required: true },
    { name: 'commanderId', type: 'string', required: true },
    { name: 'flagshipId', type: 'string', required: true },
    { name: 'coherence', type: 'object', required: true },
    { name: 'formation', type: 'string', required: true },
    { name: 'mission', type: 'object', required: true },
    { name: 'combat', type: 'object', required: true },
    { name: 'logistics', type: 'object', required: true },
  ],
  validate: (data: unknown): data is SquadronComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'squadron') return false;
    if (!('squadronId' in data) || typeof data.squadronId !== 'string') return false;
    if (!('name' in data) || typeof data.name !== 'string') return false;
    if (!('ships' in data) || typeof data.ships !== 'object') return false;
    if (!('commanderId' in data) || typeof data.commanderId !== 'string') return false;
    if (!('flagshipId' in data) || typeof data.flagshipId !== 'string') return false;
    return true;
  },
  createDefault: () =>
    createSquadronComponent('Default Squadron', 'commander1', 'ship1', [
      'ship1',
      'ship2',
      'ship3',
    ]),
};
