import type { Component } from '../ecs/Component.js';
import type { WarState, Treaty } from './NationGovernanceComponent.js';

/**
 * FederationGovernanceComponent - Federal governance for multi-empire/nation alliances
 *
 * Per 06-POLITICAL-HIERARCHY.md (lines 2158-2324): Federations are voluntary alliances of empires/nations.
 * Population: 50B-5T | Territory: Multi-empire tier | Time Scale: 1 year/tick (pan-galactic)
 *
 * Federal governance operates at pan-galactic scale - rotating presidency,
 * unified military command, and common economic policies.
 */

/**
 * Federal representative (spec lines 2267-2271)
 */
export interface FederalRepresentative {
  memberStateId: string;
  representativeAgentId: string; // Soul agent
  votingPower: number; // Weighted by population if weighted voting
}

/**
 * Joint military operation (spec lines 2273-2285)
 */
export interface JointOperation {
  id: string;
  name: string;
  type: 'defense' | 'peacekeeping' | 'exploration' | 'humanitarian';

  participatingMembers: string[];
  fleetsCommitted: Map<string, string>; // Member ID → Fleet ID

  objective: string;
  status: 'planning' | 'active' | 'completed';

  startedTick: number;
}

/**
 * Federal law (spec lines 2287-2298)
 */
export interface FederalLaw {
  name: string;
  description: string;
  scope: 'trade' | 'military' | 'justice' | 'rights' | 'environment';

  // Enforcement
  enforcedInMembers: string[];
  complianceRate: number; // 0-1

  enactedTick: number;
  votingResults: Map<string, 'for' | 'against' | 'abstain'>;
}

/**
 * Diplomatic relation with another federation/empire (spec lines 2300-2309)
 */
export interface FederationRelation {
  targetId: string;
  targetName: string;
  targetType: 'federation' | 'empire' | 'nation';

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile';

  // Diplomacy
  treaties: string[];
}

/**
 * Federal treaty (extends base Treaty) (spec lines 2311-2316)
 */
export interface FederalTreaty extends Treaty {
  // All members bound by treaty
  bindingOnMembers: boolean;
}

/**
 * Federal war (extends base WarState) (spec lines 2318-2324)
 */
export interface FederalWar extends WarState {
  // Member participation (not all members required to join)
  participatingMembers: string[];
  nonParticipatingMembers: string[];
}

/**
 * Federation governance structure - multi-state alliance political layer
 *
 * Design principles:
 * - Pan-galactic simulation (1 year per tick)
 * - Rotating presidency among member states
 * - Unified military command for joint operations
 * - Common economic policies and trade union
 *
 * Spec reference: lines 2158-2324
 */
export interface FederationGovernanceComponent extends Component {
  type: 'federation_governance';

  // Identity
  name: string;
  foundedTick: number;

  // Member states (spec lines 2166-2177)
  memberEmpireIds: string[]; // Member empires
  memberNationIds: string[]; // Independent nations (non-empire)

  totalPopulation: number;
  totalSystems: number;

  // Leadership rotation
  currentPresidentEmpireId?: string;
  presidencyDuration: number; // Ticks
  nextRotationTick?: number;

  // Federal governance (spec lines 2182-2198)
  governanceType: 'confederal' | 'federal' | 'supranational';

  // Federal council (representatives from each member)
  councilRepresentatives: FederalRepresentative[];

  // Voting system
  votingSystem: 'unanimous' | 'majority' | 'weighted_by_population';

  // Federal institutions
  institutions: {
    supremeCourt?: string;
    federalBank?: string;
    tradeCommission?: string;
    militaryCommand?: string;
  };

  // Federal military (shared command) (spec lines 2203-2216)
  military: {
    // Unified command structure
    unifiedCommanderId?: string; // Grand Marshal (soul agent)

    // Member contributions
    memberFleets: Map<string, string>; // Member ID → Fleet ID

    // Total strength
    totalShips: number;
    totalReadiness: number;

    // Joint operations
    activeJointOperations: JointOperation[];
  };

  // Trade union (spec lines 2221-2232)
  tradeUnion: {
    // Free trade among members
    internalTariffs: number; // 0 = free trade
    externalTariffs: number; // Tariffs on non-members

    // Common market
    commonCurrency?: string;

    // Trade volume
    internalTradeVolume: number;
    externalTradeVolume: number;
  };

  // Federal laws (supersede member laws) (spec lines 2237)
  federalLaws: FederalLaw[];

  // Foreign policy (spec lines 2242-2251)
  foreignPolicy: {
    // Relations with other federations/empires
    diplomaticRelations: Map<string, FederationRelation>;

    // Treaties
    federalTreaties: FederalTreaty[];

    // Wars
    federalWars: FederalWar[];
  };

  // Cohesion and stability (spec lines 2256-2264)
  stability: {
    cohesion: number; // 0-1 (how unified is federation?)

    // Member satisfaction
    memberSatisfaction: Map<string, number>; // Member ID → satisfaction (0-1)

    // Withdrawal risk
    withdrawalRisk: Map<string, number>; // Member ID → risk (0-1)
  };

  // Update tracking
  lastPanGalacticUpdateTick: number;
}

/**
 * Create a new FederationGovernanceComponent with default values
 */
export function createFederationGovernanceComponent(
  federationName: string,
  foundedTick: number,
  governanceType: 'confederal' | 'federal' | 'supranational' = 'federal'
): FederationGovernanceComponent {
  const presidencyDuration = 60480000; // ~1 year real-time
  const votingSystem = governanceType === 'confederal' ? 'unanimous' :
    governanceType === 'supranational' ? 'majority' : 'weighted_by_population';

  return {
    type: 'federation_governance',
    version: 1,
    name: federationName,
    foundedTick,
    memberEmpireIds: [],
    memberNationIds: [],
    totalPopulation: 0,
    totalSystems: 0,
    presidencyDuration,
    governanceType,
    councilRepresentatives: [],
    votingSystem,
    institutions: {},
    military: {
      memberFleets: new Map(),
      totalShips: 0,
      totalReadiness: 0,
      activeJointOperations: [],
    },
    tradeUnion: {
      internalTariffs: 0, // Free trade among members by default
      externalTariffs: 0.05, // 5% default external tariffs
      internalTradeVolume: 0,
      externalTradeVolume: 0,
    },
    federalLaws: [],
    foreignPolicy: {
      diplomaticRelations: new Map(),
      federalTreaties: [],
      federalWars: [],
    },
    stability: {
      cohesion: 0.7, // Default moderate cohesion
      memberSatisfaction: new Map(),
      withdrawalRisk: new Map(),
    },
    lastPanGalacticUpdateTick: foundedTick,
  };
}
