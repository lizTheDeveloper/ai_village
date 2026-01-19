import type { Component } from '../ecs/Component.js';
import type { WarState, Treaty } from './NationGovernanceComponent.js';

/**
 * EmpireGovernanceComponent - Imperial governance for multi-nation empires
 *
 * Per 06-POLITICAL-HIERARCHY.md (lines 1716-1853): Empires are aggregations of nations.
 * Population: 500M-50B | Territory: Multi-planet tier | Time Scale: 1 month/tick (grand strategic)
 *
 * Imperial governance operates at grand strategic scale - emperors manage vassals,
 * imperial economy, and multi-system conflicts.
 */

/**
 * Imperial dynasty (spec lines 1855-1865)
 */
export interface Dynasty {
  name: string;
  founderAgentId: string; // Soul agent
  currentRulerAgentId: string;

  // Lineage
  rulers: DynastyRuler[];

  foundedTick: number;
  durationYears: number;
}

/**
 * Dynasty ruler record (spec lines 1867-1877)
 */
export interface DynastyRuler {
  agentId: string; // Soul agent
  name: string;
  title: string; // "Emperor Kara I", "Empress Zara the Great"

  reignStart: number;
  reignEnd?: number; // If deceased/abdicated

  achievements: string[];
  failings: string[];
}

/**
 * Separatist movement within empire (spec lines 1879-1897)
 */
export interface SeparatistMovement {
  id: string;
  name: string;

  // Leader
  leaderAgentId: string; // Soul agent

  // Support
  vassalNationId: string;
  supportLevel: number; // 0-1 (% of population supporting)

  // Goals
  goal: 'independence' | 'autonomy_increase' | 'regime_change';

  // Threat level
  threatLevel: 'minor' | 'moderate' | 'major' | 'existential';

  startedTick: number;
}

/**
 * Diplomatic relation with another empire (spec lines 1899-1914)
 */
export interface EmpireRelation {
  empireId: string;
  empireName: string;

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war';

  // Diplomatic standing
  respectLevel: number; // 0-1 (how much they respect this empire)
  fearLevel: number; // 0-1 (how much they fear this empire)

  // Trade
  interImperialTrade: number;

  // Treaties
  treaties: string[]; // Treaty IDs
}

/**
 * Imperial war (extends national WarState) (spec lines 1916-1922)
 */
export interface ImperialWar extends WarState {
  // Mobilization
  vassalsInvolved: string[];
  vassalContributions: Map<string, MilitaryContribution>;
}

/**
 * Military contribution from vassal (spec lines 1924-1929)
 */
export interface MilitaryContribution {
  vassalId: string;
  troopsCommitted: number;
  shipsCommitted: number;
  enthusiasm: number; // 0-1 (how willingly they contribute)
}

/**
 * Imperial treaty (extends national Treaty) (spec lines 1931-1936)
 */
export interface ImperialTreaty extends Treaty {
  // Imperial-specific
  vassalObligations?: string[]; // What vassals must do
}

/**
 * Empire governance structure - imperial political layer
 *
 * Design principles:
 * - Grand strategic simulation (1 month per tick)
 * - Emperor is a soul agent (LLM-controlled in Phase 3+)
 * - Nations aggregate upward to empire
 * - Empire can be part of Federation (Tier 5) or independent
 *
 * Spec reference: lines 1716-1853
 */
export interface EmpireGovernanceComponent extends Component {
  type: 'empire_governance';

  // Identity
  name: string;
  foundedTick: number;

  // Imperial structure (spec lines 1724-1737)
  coreNationIds: string[]; // Nations ruled directly by emperor
  capitalNationId?: string;

  // Periphery (vassals with autonomy)
  vassalNationIds: string[];
  autonomyLevels: Map<string, number>; // Nation ID → autonomy (0-1)

  // Total
  totalPopulation: number;
  totalSystems: number; // Star systems controlled
  totalPlanets: number;

  // Imperial leadership (spec lines 1742-1755)
  governanceType: 'absolute' | 'constitutional' | 'federal' | 'feudal';

  // Emperor (soul agent)
  emperorAgentId?: string;
  imperialDynasty?: Dynasty;

  // Imperial council
  councilMemberIds: string[]; // Soul agents (vassal kings, advisors)

  // Succession
  successionLaw: 'primogeniture' | 'election' | 'meritocracy' | 'divine_right';
  heirApparentId?: string;

  // Imperial economy (spec lines 1760-1773)
  economy: {
    imperialGDP: number; // Sum of vassal GDPs
    imperialBudget: number;

    // Tribute system
    tributeCollected: Map<string, number>; // Vassal ID → tribute
    tributeRate: number; // % of vassal GDP

    // Imperial expenditures
    imperialAdministration: number;
    imperialNavy: number;
    imperialInfrastructure: number; // Roads, communication across systems
    imperialResearch: number;
  };

  // Imperial military (spec lines 1778-1791)
  military: {
    // Imperial Navy (supreme command)
    imperialNavyId?: string; // NavyTier (aggregate of vassal navies)

    // Vassal militaries
    vassalNavies: Map<string, string>; // Vassal ID → Navy ID

    // Total forces
    totalShips: number;
    totalTroops: number;

    // Military doctrine
    imperialDoctrine: string; // "Carrier supremacy", "Battleship wall", etc.
  };

  // Imperial culture (spec lines 1796-1805)
  culture: {
    officialLanguage: string;
    officialReligion?: string;

    // Cultural policies
    assimilationPolicy: 'forced' | 'encouraged' | 'tolerant' | 'multicultural';

    // Cultural drift (vassals develop distinct cultures over time)
    culturalDivergence: Map<string, number>; // Vassal ID → divergence (0-1)
  };

  // Foreign policy (spec lines 1810-1821)
  foreignPolicy: {
    strategicPosture: 'expansionist' | 'consolidating' | 'defensive' | 'declining';

    // Relations with other empires
    diplomaticRelations: Map<string, EmpireRelation>;

    // Wars
    activeWars: ImperialWar[];

    // Treaties
    imperialTreaties: ImperialTreaty[];
  };

  // Technology (spec lines 1826-1831)
  technology: {
    imperialTechLevel: number; // 1-10

    // Tech spread (core → periphery)
    techSpreadRate: number; // How fast tech propagates to vassals
  };

  // Stability and legitimacy (spec lines 1836-1847)
  stability: {
    imperialLegitimacy: number; // 0-100 (how accepted is emperor's rule?)

    // Vassal loyalty
    vassalLoyalty: Map<string, number>; // Vassal ID → loyalty (0-1)

    // Rebellion risk
    rebellionRisk: Map<string, number>; // Vassal ID → risk (0-1)

    // Internal threats
    separatistMovements: SeparatistMovement[];
  };

  // Parent federation (if part of larger alliance) (spec lines 1852)
  parentFederationId?: string;

  // Update tracking
  lastGrandStrategicUpdateTick: number;
}

/**
 * Create a new EmpireGovernanceComponent with default values
 */
export function createEmpireGovernanceComponent(
  empireName: string,
  foundedTick: number,
  governanceType: 'absolute' | 'constitutional' | 'federal' | 'feudal' = 'absolute'
): EmpireGovernanceComponent {
  const successionLaw = governanceType === 'absolute' || governanceType === 'feudal' ? 'primogeniture' :
    governanceType === 'constitutional' ? 'election' : 'meritocracy';

  return {
    type: 'empire_governance',
    version: 1,
    name: empireName,
    foundedTick,
    coreNationIds: [],
    vassalNationIds: [],
    autonomyLevels: new Map(),
    totalPopulation: 0,
    totalSystems: 0,
    totalPlanets: 0,
    governanceType,
    councilMemberIds: [],
    successionLaw,
    economy: {
      imperialGDP: 0,
      imperialBudget: 0,
      tributeCollected: new Map(),
      tributeRate: 0.1, // 10% default tribute rate
      imperialAdministration: 0,
      imperialNavy: 0,
      imperialInfrastructure: 0,
      imperialResearch: 0,
    },
    military: {
      vassalNavies: new Map(),
      totalShips: 0,
      totalTroops: 0,
      imperialDoctrine: 'balanced_fleet',
    },
    culture: {
      officialLanguage: 'Common',
      assimilationPolicy: 'tolerant',
      culturalDivergence: new Map(),
    },
    foreignPolicy: {
      strategicPosture: 'consolidating',
      diplomaticRelations: new Map(),
      activeWars: [],
      imperialTreaties: [],
    },
    technology: {
      imperialTechLevel: 1,
      techSpreadRate: 0.5, // 50% propagation rate
    },
    stability: {
      imperialLegitimacy: 80, // Default moderate legitimacy
      vassalLoyalty: new Map(),
      rebellionRisk: new Map(),
      separatistMovements: [],
    },
    lastGrandStrategicUpdateTick: foundedTick,
  };
}
