import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

// Note: Doctrine removed - was duplicate of campaign type

export type ArmadaCampaignType =
  | 'conquest'    // Conquer territory
  | 'defense'     // Defend territory
  | 'liberation'  // Free occupied systems
  | 'punitive'    // Punish enemy (raiding)
  | 'exploration'; // Explore β-space frontier

// ============================================================================
// Interface
// ============================================================================

/**
 * Armada - multi-fleet campaign force (3-10 fleets)
 * Tier 4 of ship-fleet hierarchy
 *
 * Armadas conduct campaign-scale operations spanning multiple star systems.
 * Ships are abstracted to statistics at this level.
 */
export interface ArmadaComponent extends Component {
  type: 'armada';

  armadaId: string;
  name: string;

  /**
   * Armada composition
   */
  fleets: {
    fleetIds: string[];  // 2+ fleets
    totalSquadrons: number;
    totalShips: number;
    totalCrew: number;
  };

  /**
   * Armada commander (soul agent, supreme naval authority)
   */
  commanderId: string; // Soul agent (Grand Admiral)
  flagshipFleetId: string;

  /**
   * Campaign objective
   */
  campaign: {
    type: ArmadaCampaignType;
    targetSystems: string[];  // Systems to conquer/defend
    duration: number;         // Expected campaign length (ticks)
    progress: number;         // 0-1
    systemsConquered: string[];
    systemsLost: string[];
  };

  /**
   * Strategic strength (abstracted)
   */
  strength: {
    shipCount: number;        // Total ships across all fleets
    effectiveCombatPower: number; // Adjusted for coherence, morale
    territoryControlled: number;  // Systems under armada control
    supplyLines: {
      secure: string[];       // Systems with safe supply
      contested: string[];    // Systems under threat
      cut: string[];          // Systems isolated
    };
  };

  /**
   * Armada morale (aggregate of crew morale)
   */
  morale: {
    average: number;          // 0-1
    trend: 'rising' | 'stable' | 'falling';
    factors: {
      recentVictories: number;  // +morale
      recentDefeats: number;    // -morale
      supplySituation: 'good' | 'adequate' | 'poor'; // affects morale
      timeSinceLeave: number;   // Tick since last shore leave
    };
  };

  /**
   * Losses and reinforcements
   */
  attrition: {
    shipsLostTotal: number;
    crewLostTotal: number;
    replacementRate: number;  // Ships/tick arriving as reinforcements
    canSustainOperations: boolean; // Losses < replacements?
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createArmadaComponent(
  name: string,
  commanderId: string,
  flagshipFleetId: string,
  fleetIds: string[]
): ArmadaComponent {
  if (fleetIds.length < 2) {
    throw new Error(`Armada must have at least 2 fleets, got ${fleetIds.length}`);
  }

  if (!fleetIds.includes(flagshipFleetId)) {
    throw new Error('Flagship fleet must be one of the armada fleets');
  }

  return {
    type: 'armada',
    version: 1,
    armadaId: `armada_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    fleets: {
      fleetIds,
      totalSquadrons: 0,
      totalShips: 0,
      totalCrew: 0,
    },
    commanderId,
    flagshipFleetId,
    campaign: {
      type: 'defense',
      targetSystems: [],
      duration: 10000,
      progress: 0,
      systemsConquered: [],
      systemsLost: [],
    },
    strength: {
      shipCount: 0,
      effectiveCombatPower: 0,
      territoryControlled: 0,
      supplyLines: {
        secure: [],
        contested: [],
        cut: [],
      },
    },
    morale: {
      average: 0.7,
      trend: 'stable',
      factors: {
        recentVictories: 0,
        recentDefeats: 0,
        supplySituation: 'adequate',
        timeSinceLeave: 0,
      },
    },
    attrition: {
      shipsLostTotal: 0,
      crewLostTotal: 0,
      replacementRate: 0,
      canSustainOperations: true,
    },
  };
}

// ============================================================================
// Schema
// ============================================================================

export const ArmadaComponentSchema: ComponentSchema<ArmadaComponent> = {
  type: 'armada',
  version: 1,
  fields: [
    { name: 'armadaId', type: 'string', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'fleets', type: 'object', required: true },
    { name: 'commanderId', type: 'string', required: true },
    { name: 'flagshipFleetId', type: 'string', required: true },
    { name: 'campaign', type: 'object', required: true },
    { name: 'strength', type: 'object', required: true },
    { name: 'morale', type: 'object', required: true },
    { name: 'attrition', type: 'object', required: true },
  ],
  validate: (data: unknown): data is ArmadaComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'armada') return false;
    if (!('armadaId' in data) || typeof data.armadaId !== 'string') return false;
    if (!('name' in data) || typeof data.name !== 'string') return false;
    if (!('fleets' in data) || typeof data.fleets !== 'object') return false;
    if (!('commanderId' in data) || typeof data.commanderId !== 'string') return false;
    if (!('flagshipFleetId' in data) || typeof data.flagshipFleetId !== 'string') return false;
    return true;
  },
  createDefault: () =>
    createArmadaComponent('Default Armada', 'grandAdmiral1', 'fleet1', ['fleet1', 'fleet2']),
};
