import type { Component } from '../ecs/Component.js';

/**
 * GalacticCouncilComponent - Galactic governance for multi-species cooperation
 *
 * Per 06-POLITICAL-HIERARCHY.md (lines 2482-2673): Galactic Council is the highest political tier.
 * Population: 5T+ | Territory: Galactic tier | Time Scale: 1 decade/tick (cosmic)
 *
 * Galactic governance operates at cosmic scale - secretary-general coordinates member states,
 * peacekeeping forces, universal laws, and responses to existential threats.
 */

/**
 * Species representation (spec lines 2569-2577)
 */
export interface Species {
  name: string;
  homeworld: string;
  population: number;
  techLevel: number;

  // Representation
  representativeAgentId?: string; // Soul agent
}

/**
 * Galactic delegate (spec lines 2579-2584)
 */
export interface GalacticDelegate {
  memberStateId: string;
  delegateAgentId: string; // Soul agent

  votingPower: number; // Based on population, tech level, contribution
}

/**
 * Peacekeeping mission (spec lines 2586-2598)
 */
export interface PeacekeepingMission {
  id: string;
  name: string;
  type: 'conflict_mediation' | 'humanitarian_aid' | 'border_patrol' | 'disaster_relief';

  location: string; // Sector ID
  fleetsDeployed: string[];

  objective: string;
  status: 'active' | 'completed' | 'failed';

  startedTick: number;
}

/**
 * Universal law (spec lines 2600-2613)
 */
export interface UniversalLaw {
  name: string;
  description: string;
  scope: 'war_crimes' | 'trade' | 'rights' | 'environment' | 'technology';

  // Enforcement
  enforcedInSectors: string[]; // Sector IDs
  complianceRate: number; // 0-1

  // Violations
  violations: LawViolation[];

  enactedTick: number;
}

/**
 * Law violation (spec lines 2615-2622)
 */
export interface LawViolation {
  violatorId: string; // Empire/federation ID
  violationType: string;
  evidence: string;

  // Sanctions
  sanctionsImposed?: string[];
}

/**
 * Galactic dispute (spec lines 2624-2638)
 */
export interface GalacticDispute {
  id: string;
  type: 'territorial' | 'trade' | 'resource' | 'cultural' | 'species_conflict';

  parties: string[]; // Federation/empire IDs

  description: string;

  // Mediation
  mediatorAgentId?: string; // Soul agent
  status: 'unresolved' | 'mediation' | 'resolved' | 'escalated_to_war';

  startedTick: number;
  resolvedTick?: number;
}

/**
 * Galactic research project (spec lines 2640-2653)
 */
export interface GalacticResearchProject {
  id: string;
  name: string;
  type: 'dyson_sphere' | 'faster_than_light' | 'artificial_intelligence' | 'life_extension';

  participatingStates: string[];

  totalCost: number;
  investedSoFar: number;
  progress: number; // 0-1

  startedTick: number;
  estimatedCompletionTick: number;
}

/**
 * Existential threat to galactic civilization (spec lines 2655-2665)
 */
export interface ExistentialThreat {
  type: 'gamma_ray_burst' | 'supernova' | 'black_hole' | 'dark_energy_anomaly';
  location: string; // Galactic coordinates
  severity: 'minor' | 'moderate' | 'major' | 'extinction_level';

  affectedSectors: string[];

  // Response
  responseFleets: string[];
  evacuationPlans: EvacuationPlan[];
}

/**
 * Evacuation plan (spec lines 2667-2672)
 */
export interface EvacuationPlan {
  sectorId: string;
  population: number;
  destinationSectors: string[];
  progress: number; // 0-1
}

/**
 * Galactic Council governance structure - highest political tier
 *
 * Design principles:
 * - Cosmic simulation (1 decade per tick)
 * - Secretary-General elected by council
 * - Multi-species cooperation and diplomacy
 * - Peacekeeping forces and universal laws
 * - Response to existential threats
 *
 * Spec reference: lines 2482-2673
 */
export interface GalacticCouncilComponent extends Component {
  type: 'galactic_council';

  // Identity
  name: string; // "Galactic Council", "Milky Way Assembly"
  foundedTick: number;

  // Membership (spec lines 2490-2499)
  memberFederationIds: string[];
  memberEmpireIds: string[]; // Independent empires (non-federated)

  totalPopulation: number; // Trillions
  totalSectors: number; // Galactic sectors

  // Species representation
  memberSpecies: Species[];

  // Council governance (spec lines 2504-2517)
  governanceType: 'democratic' | 'oligarchic' | 'hegemonic';

  // Secretary-General (soul agent, elected by council)
  secretaryGeneralAgentId?: string;
  termLength: number;

  // General Assembly
  assemblyDelegates: GalacticDelegate[];

  // Security Council (if hegemonic)
  securityCouncilMembers?: string[]; // Permanent/temporary members
  vetoMembers?: string[]; // Who has veto power

  // Galactic peacekeeping forces (spec lines 2522-2529)
  peacekeepingForces: {
    // Contributed by member states
    peacekeepingFleets: string[]; // Fleet IDs
    totalShips: number;

    // Active missions
    activeMissions: PeacekeepingMission[];
  };

  // Universal laws (spec lines 2534)
  universalLaws: UniversalLaw[];

  // Galactic economy (spec lines 2539-2548)
  economy: {
    // Shared currency
    galacticCurrency?: string;

    // Trade
    intergalacticTradeVolume: number;

    // Development fund
    developmentFund: number; // Aid for underdeveloped sectors
  };

  // Disputes and conflicts (spec lines 2553-2556)
  disputes: {
    activeDisputes: GalacticDispute[];
    resolvedDisputes: GalacticDispute[];
  };

  // Scientific cooperation (spec lines 2561-2566)
  science: {
    jointResearchProjects: GalacticResearchProject[];

    // Cosmic challenges
    existentialThreats: ExistentialThreat[]; // Gamma-ray bursts, supernovae, etc.
  };

  // Update tracking
  lastCosmicUpdateTick: number;
}

/**
 * Create a new GalacticCouncilComponent with default values
 */
export function createGalacticCouncilComponent(
  councilName: string,
  foundedTick: number,
  governanceType: 'democratic' | 'oligarchic' | 'hegemonic' = 'democratic'
): GalacticCouncilComponent {
  const termLength = 604800000; // ~10 years real-time

  return {
    type: 'galactic_council',
    version: 1,
    name: councilName,
    foundedTick,
    memberFederationIds: [],
    memberEmpireIds: [],
    totalPopulation: 0,
    totalSectors: 0,
    memberSpecies: [],
    governanceType,
    termLength,
    assemblyDelegates: [],
    securityCouncilMembers: governanceType === 'hegemonic' ? [] : undefined,
    vetoMembers: governanceType === 'hegemonic' ? [] : undefined,
    peacekeepingForces: {
      peacekeepingFleets: [],
      totalShips: 0,
      activeMissions: [],
    },
    universalLaws: [],
    economy: {
      intergalacticTradeVolume: 0,
      developmentFund: 0,
    },
    disputes: {
      activeDisputes: [],
      resolvedDisputes: [],
    },
    science: {
      jointResearchProjects: [],
      existentialThreats: [],
    },
    lastCosmicUpdateTick: foundedTick,
  };
}
