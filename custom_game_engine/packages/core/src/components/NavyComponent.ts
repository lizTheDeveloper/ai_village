import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

export type NavyStrategicPosture =
  | 'defensive'  // Focus on territory defense
  | 'offensive'  // Focus on expansion
  | 'balanced';  // Mixed strategy

// ============================================================================
// Interface
// ============================================================================

/**
 * Navy - all military ships of a nation/faction
 * Tier 5 of ship-fleet hierarchy (top level)
 *
 * Navies are the total military spacefaring capability of a civilization.
 * They manage budgets, shipyards, doctrine, and deployment.
 */
export interface NavyComponent extends Component {
  type: 'navy';

  navyId: string;
  name: string;

  /**
   * Owning political entity (nation, empire, etc.)
   */
  nationId: string;

  /**
   * Navy composition
   */
  armadaIds: string[];
  reserveFleetIds: string[]; // Fleets not assigned to armadas

  /**
   * Aggregate statistics
   */
  totalShips: number;
  totalCrew: number;

  /**
   * Navy strength (statistical combat power)
   * Sum of all armada strengths plus reserves
   */
  navyStrength: number;

  /**
   * Annual budget (currency units)
   */
  budget: number;

  /**
   * Doctrine profile (affects strategy)
   * Each component 0-1, should sum to 1.0
   */
  doctrineProfile: {
    offense: number;   // Offensive operations weight
    defense: number;   // Defensive operations weight
    logistics: number; // Supply and support weight
  };

  /**
   * Admiralty council (soul agents)
   * High-ranking officers who make strategic decisions
   */
  admiraltyCouncil: string[]; // Soul agent IDs

  /**
   * Strategic posture
   */
  strategicPosture: NavyStrategicPosture;

  /**
   * Economic data
   */
  economy: {
    budgetSpent: number;      // This year
    maintenanceCost: number;  // Per ship per year
    personnelCost: number;    // Total crew salaries
  };

  /**
   * Technology level
   */
  technologyLevel: number; // 1-10

  /**
   * Ship type breakdown across entire navy
   */
  shipTypeBreakdown: Record<SpaceshipType, number>;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createNavyComponent(
  name: string,
  nationId: string,
  armadaIds: string[] = [],
  reserveFleetIds: string[] = [],
  budget: number = 100000
): NavyComponent {
  return {
    type: 'navy',
    version: 1,
    navyId: `navy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    nationId,
    armadaIds,
    reserveFleetIds,
    totalShips: 0,
    totalCrew: 0,
    navyStrength: 0,
    budget,
    doctrineProfile: {
      offense: 0.4,
      defense: 0.4,
      logistics: 0.2,
    },
    admiraltyCouncil: [],
    strategicPosture: 'balanced',
    economy: {
      budgetSpent: 0,
      maintenanceCost: 100, // Default per ship
      personnelCost: 0,
    },
    technologyLevel: 1,
    shipTypeBreakdown: {} as Record<SpaceshipType, number>,
  };
}

// ============================================================================
// Schema
// ============================================================================

export const NavyComponentSchema: ComponentSchema<NavyComponent> = {
  type: 'navy',
  version: 1,
  fields: [
    { name: 'navyId', type: 'string', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'nationId', type: 'string', required: true },
    { name: 'armadaIds', type: 'stringArray', required: true },
    { name: 'reserveFleetIds', type: 'stringArray', required: true },
    { name: 'totalShips', type: 'number', required: true },
    { name: 'totalCrew', type: 'number', required: true },
    { name: 'navyStrength', type: 'number', required: true },
    { name: 'budget', type: 'number', required: true },
    { name: 'doctrineProfile', type: 'object', required: true },
    { name: 'admiraltyCouncil', type: 'stringArray', required: true },
    { name: 'strategicPosture', type: 'string', required: true },
    { name: 'economy', type: 'object', required: true },
    { name: 'technologyLevel', type: 'number', required: true },
    { name: 'shipTypeBreakdown', type: 'object', required: true },
  ],
  validate: (data: unknown): data is NavyComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'navy') return false;
    if (!('navyId' in data) || typeof data.navyId !== 'string') return false;
    if (!('name' in data) || typeof data.name !== 'string') return false;
    if (!('nationId' in data) || typeof data.nationId !== 'string') return false;
    if (!('armadaIds' in data) || !Array.isArray(data.armadaIds)) return false;
    if (!('reserveFleetIds' in data) || !Array.isArray(data.reserveFleetIds)) return false;
    return true;
  },
  createDefault: () => createNavyComponent(
    'Default Navy',
    'nation1'
  ),
};
