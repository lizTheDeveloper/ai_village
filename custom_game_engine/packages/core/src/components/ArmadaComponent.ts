import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

export type ArmadaDoctrine =
  | 'aggressive'  // Focus on offensive operations
  | 'defensive'   // Protect territory
  | 'balanced'    // Mixed strategy
  | 'raider';     // Fast strikes, avoid pitched battles

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
   * Armada composition (3-10 fleets)
   */
  fleetIds: string[];

  /**
   * Lead fleet
   */
  flagshipFleetId: string;

  /**
   * Soul agent grand admiral (commands entire armada)
   */
  grandAdmiralAgentId?: string;

  /**
   * Aggregate statistics from fleets
   */
  totalShips: number;
  totalCrew: number;

  /**
   * Armada coherence (aggregated from fleets)
   * Average fleet coherence across all fleets
   */
  armadaCoherence: number;

  /**
   * Armada strength (statistical combat power)
   * Sum of all fleet strengths with doctrine modifiers
   */
  armadaStrength: number;

  /**
   * Supply level (0-1)
   * Low supply degrades coherence and combat strength
   */
  supplyLevel: number;

  /**
   * Strategic doctrine (affects combat bonuses)
   */
  doctrine: ArmadaDoctrine;

  /**
   * Current campaign
   */
  currentCampaign?: {
    name: string;
    type: ArmadaCampaignType;
    objective: string;
    targetSystems: string[];  // System IDs being contested
    progress: number;         // 0-1
    startTick: number;
    systemsConquered: number;
    systemsLost: number;
  };

  /**
   * Morale (affects combat strength)
   */
  morale: {
    average: number;          // 0-1
    trend: 'rising' | 'stable' | 'falling';
    recentVictories: number;
    recentDefeats: number;
  };

  /**
   * Attrition tracking
   */
  attrition: {
    shipsLostTotal: number;
    crewLostTotal: number;
    replacementRate: number;  // Ships/tick arriving as reinforcements
  };

  /**
   * Ship type breakdown across all fleets
   */
  shipTypeBreakdown: Record<SpaceshipType, number>;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createArmadaComponent(
  name: string,
  fleetIds: string[],
  flagshipFleetId: string,
  grandAdmiralAgentId?: string,
  doctrine: ArmadaDoctrine = 'balanced'
): ArmadaComponent {
  if (fleetIds.length < 3 || fleetIds.length > 10) {
    throw new Error(`Armada must have 3-10 fleets, got ${fleetIds.length}`);
  }

  if (!fleetIds.includes(flagshipFleetId)) {
    throw new Error('Flagship fleet must be one of the armada fleets');
  }

  return {
    type: 'armada',
    version: 1,
    armadaId: `armada_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    fleetIds,
    flagshipFleetId,
    grandAdmiralAgentId,
    totalShips: 0,
    totalCrew: 0,
    armadaCoherence: 0,
    armadaStrength: 0,
    supplyLevel: 1.0, // Fully supplied
    doctrine,
    morale: {
      average: 0.7, // Default morale
      trend: 'stable',
      recentVictories: 0,
      recentDefeats: 0,
    },
    attrition: {
      shipsLostTotal: 0,
      crewLostTotal: 0,
      replacementRate: 0,
    },
    shipTypeBreakdown: {} as Record<SpaceshipType, number>,
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
    { name: 'fleetIds', type: 'stringArray', required: true },
    { name: 'flagshipFleetId', type: 'string', required: true },
    { name: 'grandAdmiralAgentId', type: 'string', required: false },
    { name: 'totalShips', type: 'number', required: true },
    { name: 'totalCrew', type: 'number', required: true },
    { name: 'armadaCoherence', type: 'number', required: true },
    { name: 'armadaStrength', type: 'number', required: true },
    { name: 'supplyLevel', type: 'number', required: true },
    { name: 'doctrine', type: 'string', required: true },
    { name: 'currentCampaign', type: 'object', required: false },
    { name: 'morale', type: 'object', required: true },
    { name: 'attrition', type: 'object', required: true },
    { name: 'shipTypeBreakdown', type: 'object', required: true },
  ],
  validate: (data: unknown): data is ArmadaComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'armada') return false;
    if (!('armadaId' in data) || typeof data.armadaId !== 'string') return false;
    if (!('name' in data) || typeof data.name !== 'string') return false;
    if (!('fleetIds' in data) || !Array.isArray(data.fleetIds)) return false;
    if (!('flagshipFleetId' in data) || typeof data.flagshipFleetId !== 'string') return false;
    if (!('doctrine' in data) || typeof data.doctrine !== 'string') return false;
    return true;
  },
  createDefault: () => createArmadaComponent(
    'Default Armada',
    ['fleet1', 'fleet2', 'fleet3'],
    'fleet1'
  ),
};
