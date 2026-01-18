import type { Component } from '../ecs/Component.js';

/**
 * VillageGovernanceComponent - Political decision-making for village-level settlements
 *
 * Per 06-POLITICAL-HIERARCHY.md: Villages are the smallest political unit with direct governance.
 * Governance is personal - agents know their leaders, attend council meetings, participate in decisions.
 *
 * Integration with existing data systems:
 * - TownHallComponent: Population tracking, vital statistics
 * - CensusBureauComponent: Demographics, projections
 * - VillageGovernanceComponent: Political decisions, leadership, laws, priorities
 */

/**
 * Village proposal for council voting
 */
export interface VillageProposal {
  id: string;
  proposedBy: string; // Agent ID (soul agent when possible)
  type: 'build' | 'explore' | 'trade' | 'law' | 'custom';
  description: string;

  // Voting
  votesFor: string[]; // Agent IDs who voted yes
  votesAgainst: string[]; // Agent IDs who voted no
  status: 'voting' | 'approved' | 'rejected' | 'implemented';

  proposedTick: number;
  votingDeadline: number;
}

/**
 * Village law or custom
 */
export interface VillageLaw {
  id: string;
  name: string;
  description: string;
  enactedTick: number;
  penalty?: string; // E.g., "exile", "reduced rations"
  effects?: LawEffect[];
}

/**
 * Effect of a law on gameplay
 */
export interface LawEffect {
  type: 'resource_distribution' | 'building_restriction' | 'behavior_modifier' | 'custom';
  description: string;
  parameters?: Record<string, unknown>;
}

/**
 * Relationship with another village
 */
export interface VillageRelation {
  villageId: string; // Entity ID of other village
  villageName: string;

  relationship: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile';
  trustLevel: number; // 0-1

  // Trade
  tradeAgreements: string[]; // TradeAgreement IDs

  // History
  sharedHistory: string[]; // E.g., "Helped during famine Year 5"
}

/**
 * Village governance structure - political layer for village-level settlements
 *
 * Design principles:
 * - Elder IDs reference soul agents when possible (persistent leadership)
 * - Uses TownHall for population/voter counts
 * - Enables rule-based or LLM-driven decision making
 * - Simple majority voting for Phase 2
 */
export interface VillageGovernanceComponent extends Component {
  type: 'village_governance';

  // Identity
  villageName: string;
  foundedTick: number;

  // Leadership structure
  governanceType: 'elder_council' | 'chieftain' | 'direct_democracy';
  elderAgentIds: string[]; // Soul agent elders (3-7 typically)
  chiefElderId?: string; // Head elder (optional)

  // Terms
  termLengthTicks: number; // How long elders serve (e.g., 120000 = 100 minutes = ~1 season)
  lastElectionTick: number;
  nextElectionTick: number;

  // Council meetings
  lastMeetingTick: number;
  meetingInterval: number; // Ticks between meetings (e.g., 20000 = daily)

  // Active governance
  activeProposals: VillageProposal[];
  laws: VillageLaw[];

  // Priorities (set by council)
  resourcePriority: 'food' | 'materials' | 'defense' | 'growth';
  buildingQueue: string[]; // Building type IDs approved for construction

  // Relations
  neighborRelations: Map<string, VillageRelation>; // Other village IDs -> relations
}

/**
 * Create a new VillageGovernanceComponent with default values
 */
export function createVillageGovernanceComponent(
  villageName: string,
  foundedTick: number,
  governanceType: 'elder_council' | 'chieftain' | 'direct_democracy' = 'elder_council'
): VillageGovernanceComponent {
  // Default term length: 120000 ticks = 6000 seconds = 100 minutes (~1 season)
  const termLengthTicks = 120000;

  return {
    type: 'village_governance',
    version: 1,
    villageName,
    foundedTick,
    governanceType,
    elderAgentIds: [],
    termLengthTicks,
    lastElectionTick: foundedTick,
    nextElectionTick: foundedTick + termLengthTicks,
    lastMeetingTick: foundedTick,
    meetingInterval: 20000, // Daily meetings (20000 ticks = 16.67 minutes)
    activeProposals: [],
    laws: [],
    resourcePriority: 'food',
    buildingQueue: [],
    neighborRelations: new Map(),
  };
}
