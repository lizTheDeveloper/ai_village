/**
 * Politics Admin Capability
 *
 * Comprehensive political governance dashboard for LLM control:
 * - Village, city, province, nation, federation governance
 * - Elections, proposals, council meetings
 * - Crisis escalation and delegation
 * - Political tier management
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// OPTIONS
// ============================================================================

const GOVERNANCE_TYPE_OPTIONS = [
  { value: 'direct_democracy', label: 'Direct Democracy' },
  { value: 'council', label: 'Council' },
  { value: 'chieftain', label: 'Chieftain' },
  { value: 'monarchy', label: 'Monarchy' },
  { value: 'republic', label: 'Republic' },
  { value: 'federation', label: 'Federation' },
] as const;

const POLITICAL_TIER_OPTIONS = [
  { value: 'village', label: 'Village (50-500)' },
  { value: 'city', label: 'City (500-10K)' },
  { value: 'province', label: 'Province (10K-1M)' },
  { value: 'nation', label: 'Nation (1M-100M)' },
  { value: 'empire', label: 'Empire (100M-10B)' },
  { value: 'federation', label: 'Federation (10B-1T)' },
  { value: 'galactic_council', label: 'Galactic Council (1T+)' },
] as const;

const PROPOSAL_TYPE_OPTIONS = [
  { value: 'build', label: 'Construction' },
  { value: 'explore', label: 'Exploration' },
  { value: 'trade', label: 'Trade Agreement' },
  { value: 'law', label: 'New Law' },
  { value: 'tax', label: 'Tax Policy' },
  { value: 'military', label: 'Military Policy' },
  { value: 'research', label: 'Research Priority' },
  { value: 'custom', label: 'Custom Proposal' },
] as const;

const CRISIS_TYPE_OPTIONS = [
  { value: 'military_attack', label: 'Military Attack' },
  { value: 'rebellion', label: 'Rebellion' },
  { value: 'famine', label: 'Famine' },
  { value: 'plague', label: 'Plague' },
  { value: 'natural_disaster', label: 'Natural Disaster' },
  { value: 'economic_collapse', label: 'Economic Collapse' },
  { value: 'diplomatic_incident', label: 'Diplomatic Incident' },
] as const;

const RESOURCE_PRIORITY_OPTIONS = [
  { value: 'food', label: 'Food Production' },
  { value: 'materials', label: 'Material Gathering' },
  { value: 'defense', label: 'Defense' },
  { value: 'growth', label: 'Population Growth' },
] as const;

// ============================================================================
// QUERIES
// ============================================================================

const listGovernanceEntities = defineQuery({
  id: 'list-governance-entities',
  name: 'List Governance Entities',
  description: 'List all political entities (villages, cities, nations, etc.)',
  parameters: [
    {
      name: 'tier',
      type: 'select',
      description: 'Filter by political tier',
      required: false,
      options: POLITICAL_TIER_OPTIONS.map(o => o.value),
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const tier = params.tier as string | undefined;
    const entities: Array<{
      id: string;
      name: string;
      tier: string;
      governanceType: string;
      population: number;
      elderCount: number;
    }> = [];

    // Query village governance
    if (!tier || tier === 'village') {
      const villages = world.query().with('village_governance').executeEntities();
      for (const entity of villages) {
        const gov = entity.getComponent('village_governance') as any;
        const townHall = entity.getComponent('town_hall') as any;
        entities.push({
          id: entity.id,
          name: gov?.villageName || 'Unknown Village',
          tier: 'village',
          governanceType: gov?.governanceType || 'council',
          population: townHall?.populationCount || 0,
          elderCount: gov?.elderAgentIds?.length || 0,
        });
      }
    }

    // Query city governance
    if (!tier || tier === 'city') {
      const cities = world.query().with('city_governance').executeEntities();
      for (const entity of cities) {
        const gov = entity.getComponent('city_governance') as any;
        entities.push({
          id: entity.id,
          name: gov?.cityName || 'Unknown City',
          tier: 'city',
          governanceType: gov?.governanceType || 'council',
          population: gov?.population || 0,
          elderCount: gov?.councilMemberIds?.length || 0,
        });
      }
    }

    // Query nation governance
    if (!tier || tier === 'nation') {
      const nations = world.query().with('nation').executeEntities();
      for (const entity of nations) {
        const nation = entity.getComponent('nation') as any;
        entities.push({
          id: entity.id,
          name: nation?.nationName || 'Unknown Nation',
          tier: 'nation',
          governanceType: nation?.governmentType || 'monarchy',
          population: nation?.totalPopulation || 0,
          elderCount: nation?.parliamentMemberIds?.length || 0,
        });
      }
    }

    return {
      success: true,
      data: {
        count: entities.length,
        entities,
      },
    };
  },
});

const getGovernanceDetails = defineQuery({
  id: 'get-governance-details',
  name: 'Get Governance Details',
  description: 'Get detailed information about a governance entity',
  parameters: [
    {
      name: 'entityId',
      type: 'string',
      description: 'Entity ID of the governance body',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const entityId = params.entityId as string;
    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, error: `Entity ${entityId} not found` };
    }

    // Try to get governance component
    const villageGov = entity.getComponent('village_governance') as any;
    const cityGov = entity.getComponent('city_governance') as any;
    const nationComp = entity.getComponent('nation') as any;
    const townHall = entity.getComponent('town_hall') as any;

    if (villageGov) {
      return {
        success: true,
        data: {
          tier: 'village',
          name: villageGov.villageName,
          governanceType: villageGov.governanceType,
          elderIds: villageGov.elderAgentIds || [],
          chiefElderId: villageGov.chiefElderId,
          resourcePriority: villageGov.resourcePriority,
          activeProposals: villageGov.activeProposals || [],
          lastElectionTick: villageGov.lastElectionTick,
          nextElectionTick: villageGov.nextElectionTick,
          termLengthTicks: villageGov.termLengthTicks,
          meetingInterval: villageGov.meetingInterval,
          lastMeetingTick: villageGov.lastMeetingTick,
          population: townHall?.populationCount || 0,
          recentDeaths: townHall?.recentDeaths?.length || 0,
        },
      };
    }

    if (cityGov) {
      return {
        success: true,
        data: {
          tier: 'city',
          name: cityGov.cityName,
          governanceType: cityGov.governanceType,
          councilMemberIds: cityGov.councilMemberIds || [],
          mayorId: cityGov.mayorId,
          population: cityGov.population,
          activeOrdinances: cityGov.activeOrdinances || [],
        },
      };
    }

    if (nationComp) {
      return {
        success: true,
        data: {
          tier: 'nation',
          name: nationComp.nationName,
          governmentType: nationComp.governmentType,
          leaderId: nationComp.leaderId,
          parliamentMemberIds: nationComp.parliamentMemberIds || [],
          totalPopulation: nationComp.totalPopulation,
          provinceCount: nationComp.provinces?.length || 0,
          laws: nationComp.laws || [],
          policies: nationComp.policies || [],
          economy: nationComp.economy,
          military: nationComp.military,
        },
      };
    }

    return { success: false, error: 'No governance component found on entity' };
  },
});

const listActiveProposals = defineQuery({
  id: 'list-active-proposals',
  name: 'List Active Proposals',
  description: 'List all proposals currently being voted on',
  parameters: [
    {
      name: 'tier',
      type: 'select',
      description: 'Filter by political tier',
      required: false,
      options: POLITICAL_TIER_OPTIONS.map(o => o.value),
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const proposals: Array<{
      entityId: string;
      entityName: string;
      tier: string;
      proposalId: string;
      type: string;
      description: string;
      status: string;
      votesFor: number;
      votesAgainst: number;
      votingDeadline: number;
    }> = [];

    // Collect proposals from villages
    const villages = world.query().with('village_governance').executeEntities();
    for (const entity of villages) {
      const gov = entity.getComponent('village_governance') as any;
      if (gov?.activeProposals) {
        for (const proposal of gov.activeProposals) {
          if (proposal.status === 'voting') {
            proposals.push({
              entityId: entity.id,
              entityName: gov.villageName,
              tier: 'village',
              proposalId: proposal.id || '',
              type: proposal.type,
              description: proposal.description,
              status: proposal.status,
              votesFor: proposal.votesFor?.length || 0,
              votesAgainst: proposal.votesAgainst?.length || 0,
              votingDeadline: proposal.votingDeadline,
            });
          }
        }
      }
    }

    return {
      success: true,
      data: {
        count: proposals.length,
        currentTick: world.tick,
        proposals,
      },
    };
  },
});

const getElectionStatus = defineQuery({
  id: 'get-election-status',
  name: 'Get Election Status',
  description: 'Get election status and upcoming elections',
  parameters: [],
  execute: async (_params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const elections: Array<{
      entityId: string;
      entityName: string;
      tier: string;
      lastElectionTick: number;
      nextElectionTick: number;
      ticksUntilElection: number;
      currentLeaderId: string | undefined;
    }> = [];

    const villages = world.query().with('village_governance').executeEntities();
    for (const entity of villages) {
      const gov = entity.getComponent('village_governance') as any;
      if (gov) {
        elections.push({
          entityId: entity.id,
          entityName: gov.villageName,
          tier: 'village',
          lastElectionTick: gov.lastElectionTick || 0,
          nextElectionTick: gov.nextElectionTick || 0,
          ticksUntilElection: Math.max(0, (gov.nextElectionTick || 0) - world.tick),
          currentLeaderId: gov.chiefElderId,
        });
      }
    }

    return {
      success: true,
      data: {
        currentTick: world.tick,
        count: elections.length,
        elections: elections.sort((a, b) => a.ticksUntilElection - b.ticksUntilElection),
      },
    };
  },
});

const queryGovernanceHistory = defineQuery({
  id: 'query-governance-history',
  name: 'Query Governance History',
  description: 'Query audit trail of governance decisions',
  parameters: [
    {
      name: 'actionType',
      type: 'select',
      description: 'Filter by action type',
      required: false,
      options: ['directive_issued', 'directive_received', 'vote_concluded', 'crisis_escalated'],
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum entries to return',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Find governance history entity
    const historyEntities = world.query().with('governance_history').executeEntities();
    if (historyEntities.length === 0) {
      return {
        success: true,
        data: { entries: [], message: 'No governance history recorded yet' },
      };
    }

    const history = historyEntities[0]?.getComponent('governance_history') as any;
    if (!history) {
      return { success: true, data: { entries: [] } };
    }

    let entries = history.entries || [];

    // Filter by action type if specified
    const actionType = params.actionType as string | undefined;
    if (actionType) {
      entries = entries.filter((e: any) => e.actionType === actionType);
    }

    // Limit results
    const limit = (params.limit as number) || 50;
    entries = entries.slice(-limit);

    return {
      success: true,
      data: {
        totalEntries: history.entries?.length || 0,
        filteredCount: entries.length,
        entries,
      },
    };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

const triggerElection = defineAction({
  id: 'trigger-election',
  name: 'Trigger Election',
  description: 'Force an immediate election in a governance entity',
  parameters: [
    {
      name: 'entityId',
      type: 'string',
      description: 'Entity ID of the governance body',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const entityId = params.entityId as string;
    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, error: `Entity ${entityId} not found` };
    }

    // Try village governance
    const villageGov = entity.getComponent('village_governance') as any;
    if (villageGov) {
      (entity as any).updateComponent('village_governance', (current: any) => ({
        ...current,
        nextElectionTick: world.tick, // Trigger immediate election
      }));

      return {
        success: true,
        message: `Election triggered for ${villageGov.villageName}. Will occur on next governance update.`,
      };
    }

    return { success: false, error: 'No governance component found on entity' };
  },
});

const createProposal = defineAction({
  id: 'create-proposal',
  name: 'Create Proposal',
  description: 'Create a new proposal for voting',
  parameters: [
    {
      name: 'entityId',
      type: 'string',
      description: 'Entity ID of the governance body',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      description: 'Type of proposal',
      required: true,
      options: PROPOSAL_TYPE_OPTIONS.map(o => o.value),
    },
    {
      name: 'description',
      type: 'string',
      description: 'Description of the proposal',
      required: true,
    },
    {
      name: 'proposerId',
      type: 'string',
      description: 'Agent ID proposing this (optional)',
      required: false,
    },
    {
      name: 'votingDuration',
      type: 'number',
      description: 'Voting period in ticks (default 1000)',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const entityId = params.entityId as string;
    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, error: `Entity ${entityId} not found` };
    }

    const proposalType = params.type as string;
    const description = params.description as string;
    const proposerId = (params.proposerId as string) || 'admin';
    const votingDuration = (params.votingDuration as number) || 1000;

    const villageGov = entity.getComponent('village_governance') as any;
    if (villageGov) {
      const newProposal = {
        id: `proposal-${Date.now()}`,
        type: proposalType,
        description,
        proposedBy: proposerId,
        proposedAt: world.tick,
        status: 'voting',
        votesFor: [],
        votesAgainst: [],
        votingDeadline: world.tick + votingDuration,
      };

      (entity as any).updateComponent('village_governance', (current: any) => ({
        ...current,
        activeProposals: [...(current.activeProposals || []), newProposal],
      }));

      return {
        success: true,
        message: `Proposal created: "${description}". Voting ends at tick ${newProposal.votingDeadline}.`,
        data: { proposalId: newProposal.id },
      };
    }

    return { success: false, error: 'No governance component found on entity' };
  },
});

const castVote = defineAction({
  id: 'cast-vote',
  name: 'Cast Vote',
  description: 'Cast a vote on a proposal as an agent',
  parameters: [
    {
      name: 'entityId',
      type: 'string',
      description: 'Entity ID of the governance body',
      required: true,
    },
    {
      name: 'proposalId',
      type: 'string',
      description: 'ID of the proposal to vote on',
      required: true,
    },
    {
      name: 'voterId',
      type: 'string',
      description: 'Agent ID casting the vote',
      required: true,
    },
    {
      name: 'vote',
      type: 'select',
      description: 'Vote stance',
      required: true,
      options: ['for', 'against'],
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const entityId = params.entityId as string;
    const proposalId = params.proposalId as string;
    const voterId = params.voterId as string;
    const vote = params.vote as 'for' | 'against';

    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, error: `Entity ${entityId} not found` };
    }

    const villageGov = entity.getComponent('village_governance') as any;
    if (villageGov) {
      (entity as any).updateComponent('village_governance', (current: any) => {
        const proposals = [...(current.activeProposals || [])];
        const proposal = proposals.find((p: any) => p.id === proposalId);

        if (!proposal) {
          throw new Error(`Proposal ${proposalId} not found`);
        }

        if (proposal.status !== 'voting') {
          throw new Error(`Proposal ${proposalId} is not in voting status`);
        }

        // Remove any existing vote from this voter
        proposal.votesFor = proposal.votesFor.filter((v: string) => v !== voterId);
        proposal.votesAgainst = proposal.votesAgainst.filter((v: string) => v !== voterId);

        // Add new vote
        if (vote === 'for') {
          proposal.votesFor.push(voterId);
        } else {
          proposal.votesAgainst.push(voterId);
        }

        return { ...current, activeProposals: proposals };
      });

      return {
        success: true,
        message: `Vote cast: ${voterId} voted ${vote} on proposal ${proposalId}`,
      };
    }

    return { success: false, error: 'No governance component found on entity' };
  },
});

const setResourcePriority = defineAction({
  id: 'set-resource-priority',
  name: 'Set Resource Priority',
  description: 'Set the resource priority for a governance entity',
  parameters: [
    {
      name: 'entityId',
      type: 'string',
      description: 'Entity ID of the governance body',
      required: true,
    },
    {
      name: 'priority',
      type: 'select',
      description: 'Resource priority',
      required: true,
      options: RESOURCE_PRIORITY_OPTIONS.map(o => o.value),
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const entityId = params.entityId as string;
    const priority = params.priority as string;

    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, error: `Entity ${entityId} not found` };
    }

    const villageGov = entity.getComponent('village_governance') as any;
    if (villageGov) {
      const oldPriority = villageGov.resourcePriority;
      (entity as any).updateComponent('village_governance', (current: any) => ({
        ...current,
        resourcePriority: priority,
      }));

      return {
        success: true,
        message: `Resource priority changed from ${oldPriority} to ${priority}`,
      };
    }

    return { success: false, error: 'No governance component found on entity' };
  },
});

const appointLeader = defineAction({
  id: 'appoint-leader',
  name: 'Appoint Leader',
  description: 'Appoint a new leader/chief for a governance entity',
  parameters: [
    {
      name: 'entityId',
      type: 'string',
      description: 'Entity ID of the governance body',
      required: true,
    },
    {
      name: 'leaderId',
      type: 'string',
      description: 'Agent ID to appoint as leader',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const entityId = params.entityId as string;
    const leaderId = params.leaderId as string;

    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, error: `Entity ${entityId} not found` };
    }

    // Verify the leader exists
    const leaderEntity = world.getEntity(leaderId);
    if (!leaderEntity) {
      return { success: false, error: `Agent ${leaderId} not found` };
    }

    const villageGov = entity.getComponent('village_governance') as any;
    if (villageGov) {
      const oldLeader = villageGov.chiefElderId;
      (entity as any).updateComponent('village_governance', (current: any) => ({
        ...current,
        chiefElderId: leaderId,
        elderAgentIds: current.elderAgentIds?.includes(leaderId)
          ? current.elderAgentIds
          : [leaderId, ...(current.elderAgentIds || [])],
      }));

      // Emit political elevation event
      world.eventBus.emit({
        type: 'governance:political_elevation',
        source: entityId,
        data: {
          agentId: leaderId,
          previousRole: oldLeader ? 'elder' : null,
          newRole: 'village_leader',
          powerLevel: 50,
          electionType: 'appointed',
          tick: world.tick,
        },
      });

      return {
        success: true,
        message: `${leaderId} appointed as chief elder of ${villageGov.villageName}`,
      };
    }

    const nationComp = entity.getComponent('nation') as any;
    if (nationComp) {
      (entity as any).updateComponent('nation', (current: any) => ({
        ...current,
        leaderId,
      }));

      return {
        success: true,
        message: `${leaderId} appointed as leader of ${nationComp.nationName}`,
      };
    }

    return { success: false, error: 'No governance component found on entity' };
  },
});

const issueDirecive = defineAction({
  id: 'issue-directive',
  name: 'Issue Directive',
  description: 'Issue a directive from higher tier to lower tier',
  parameters: [
    {
      name: 'fromEntityId',
      type: 'string',
      description: 'Entity ID issuing the directive',
      required: true,
    },
    {
      name: 'toEntityId',
      type: 'string',
      description: 'Entity ID receiving the directive',
      required: true,
    },
    {
      name: 'directive',
      type: 'string',
      description: 'The directive content',
      required: true,
    },
    {
      name: 'priority',
      type: 'select',
      description: 'Directive priority',
      required: false,
      options: ['routine', 'urgent', 'critical'],
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const fromEntityId = params.fromEntityId as string;
    const toEntityId = params.toEntityId as string;
    const directive = params.directive as string;
    const priority = (params.priority as string) || 'routine';

    const fromEntity = world.getEntity(fromEntityId);
    const toEntity = world.getEntity(toEntityId);

    if (!fromEntity) {
      return { success: false, error: `Source entity ${fromEntityId} not found` };
    }
    if (!toEntity) {
      return { success: false, error: `Target entity ${toEntityId} not found` };
    }

    // Emit directive event
    world.eventBus.emit({
      type: 'governance:directive_issued',
      source: fromEntityId,
      data: {
        directiveId: `directive-${Date.now()}`,
        directive,
        priority,
        targetEntityIds: [toEntityId],
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Directive issued: "${directive}" (priority: ${priority})`,
    };
  },
});

// ============================================================================
// CAPABILITY REGISTRATION
// ============================================================================

const politicsCapability = defineCapability({
  id: 'politics',
  name: 'Politics & Governance',
  description: 'Manage political systems - governance, elections, proposals, directives',
  category: 'systems',
  tab: {
    icon: '🏛️',
    priority: 35,
  },
  queries: [
    listGovernanceEntities,
    getGovernanceDetails,
    listActiveProposals,
    getElectionStatus,
    queryGovernanceHistory,
  ],
  actions: [
    triggerElection,
    createProposal,
    castVote,
    setResourcePriority,
    appointLeader,
    issueDirecive,
  ],
});

capabilityRegistry.register(politicsCapability);

export { politicsCapability };
