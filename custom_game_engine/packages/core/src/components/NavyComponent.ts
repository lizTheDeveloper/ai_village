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
   * Controlling faction
   */
  factionId: string; // Civilization, empire, etc.

  /**
   * Navy composition
   */
  assets: {
    totalArmadas: number;
    totalFleets: number;
    totalSquadrons: number;
    totalShips: number;
    totalCrew: number;

    // Ship type distribution
    shipTypeBreakdown: Record<SpaceshipType, number>;

    // Deployment
    activeDeployments: number;   // Ships deployed
    inReserve: number;            // Ships docked
    underConstruction: number;    // Ships being built
  };

  /**
   * Navy leadership (soul agent, supreme commander)
   */
  grandAdmiralId: string; // Soul agent

  /**
   * Economic foundation
   */
  economy: {
    annualBudget: number;     // Currency units
    budgetSpent: number;      // This year
    shipyardCapacity: number; // Ships/year production
    maintenanceCost: number;  // Per ship per year
    personnelCost: number;    // Crew salaries

    // Budget allocation
    budgetAllocation: {
      newConstruction: number;  // 0-1 (percentage)
      maintenance: number;
      personnel: number;
      researchAndDevelopment: number;
      reserves: number;
    };
  };

  /**
   * Doctrine and strategy
   */
  doctrine: {
    strategicPosture: 'defensive' | 'offensive' | 'balanced';
    preferredShipTypes: SpaceshipType[]; // Navy specialization
    tacticalDoctrine: string; // e.g., "carrier-focused", "battleship supremacy"

    // Officer training
    officerAcademyQuality: number; // 0-1, affects soul agent quality
    NCOTraining: number;           // 0-1, affects crew quality
  };

  /**
   * Political influence
   */
  politics: {
    militaryBudgetShare: number; // % of faction GDP
    politicalPower: number;      // Navy's influence on faction
    publicSupport: number;       // 0-1, civilian opinion
    veteranSoulAgents: number;   // Retired admirals (political capital)
  };

  /**
   * Technology and R&D
   */
  technology: {
    currentTechLevel: number;    // 1-10 (Stage 1-3 mapped here)
    researchProjects: Array<{
      shipTypeId: SpaceshipType;
      progress: number;          // 0-1
      cost: number;
    }>;

    // β-space research
    betaSpaceResearch: {
      coherenceThresholdReduction: number; // Research to lower threshold
      decoherenceRateMitigation: number;   // Research to slow decay
      observationPrecisionImprovement: number;
    };
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createNavyComponent(
  name: string,
  factionId: string,
  grandAdmiralId: string,
  annualBudget: number = 100000
): NavyComponent {
  return {
    type: 'navy',
    version: 1,
    navyId: `navy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    factionId,
    assets: {
      totalArmadas: 0,
      totalFleets: 0,
      totalSquadrons: 0,
      totalShips: 0,
      totalCrew: 0,
      shipTypeBreakdown: {} as Record<SpaceshipType, number>,
      activeDeployments: 0,
      inReserve: 0,
      underConstruction: 0,
    },
    grandAdmiralId,
    economy: {
      annualBudget,
      budgetSpent: 0,
      shipyardCapacity: 10,
      maintenanceCost: 100,
      personnelCost: 10,
      budgetAllocation: {
        newConstruction: 0.4,
        maintenance: 0.3,
        personnel: 0.2,
        researchAndDevelopment: 0.1,
        reserves: 0.0,
      },
    },
    doctrine: {
      strategicPosture: 'balanced',
      preferredShipTypes: [],
      tacticalDoctrine: 'balanced fleet composition',
      officerAcademyQuality: 0.5,
      NCOTraining: 0.5,
    },
    politics: {
      militaryBudgetShare: 0.15,
      politicalPower: 0.5,
      publicSupport: 0.7,
      veteranSoulAgents: 0,
    },
    technology: {
      currentTechLevel: 1,
      researchProjects: [],
      betaSpaceResearch: {
        coherenceThresholdReduction: 0,
        decoherenceRateMitigation: 0,
        observationPrecisionImprovement: 0,
      },
    },
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
    { name: 'factionId', type: 'string', required: true },
    { name: 'assets', type: 'object', required: true },
    { name: 'grandAdmiralId', type: 'string', required: true },
    { name: 'economy', type: 'object', required: true },
    { name: 'doctrine', type: 'object', required: true },
    { name: 'politics', type: 'object', required: true },
    { name: 'technology', type: 'object', required: true },
  ],
  validate: (data: unknown): data is NavyComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'navy') return false;
    if (!('navyId' in data) || typeof data.navyId !== 'string') return false;
    if (!('name' in data) || typeof data.name !== 'string') return false;
    if (!('factionId' in data) || typeof data.factionId !== 'string') return false;
    if (!('assets' in data) || typeof data.assets !== 'object') return false;
    if (!('grandAdmiralId' in data) || typeof data.grandAdmiralId !== 'string') return false;
    return true;
  },
  createDefault: () => createNavyComponent('Default Navy', 'faction1', 'grandAdmiral1'),
};
