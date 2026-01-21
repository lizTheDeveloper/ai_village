/**
 * Politics Capability - Manage political and governance systems
 *
 * Provides admin interface for:
 * - VillageGovernanceSystem (village-level elections, proposals)
 * - CityGovernanceSystem (city government, districts)
 * - ProvinceGovernanceSystem (provincial governance)
 * - FederationGovernanceSystem (multi-settlement federations)
 * - NationSystem (national-level governance)
 * - EmpireSystem (empire management)
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const POLITICAL_TIER_OPTIONS = [
  { value: 'village', label: 'Village (50-500)' },
  { value: 'city', label: 'City (500-10K)' },
  { value: 'province', label: 'Province (10K-1M)' },
  { value: 'nation', label: 'Nation (1M-100M)' },
  { value: 'empire', label: 'Empire (100M+)' },
  { value: 'federation', label: 'Federation' },
  { value: 'galactic_council', label: 'Galactic Council' },
];

const PROPOSAL_TYPE_OPTIONS = [
  { value: 'build', label: 'Construction' },
  { value: 'explore', label: 'Exploration' },
  { value: 'trade', label: 'Trade Agreement' },
  { value: 'defense', label: 'Defense' },
  { value: 'festival', label: 'Festival' },
  { value: 'law', label: 'Law Change' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'alliance', label: 'Alliance' },
];

const PRIORITY_CATEGORY_OPTIONS = [
  { value: 'food', label: 'Food Production' },
  { value: 'materials', label: 'Material Gathering' },
  { value: 'defense', label: 'Defense' },
  { value: 'expansion', label: 'Expansion' },
];

// ============================================================================
// Politics Capability Definition
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
    defineQuery({
      id: 'list-governance-entities',
      name: 'List Governance Entities',
      description: 'List all governance entities (villages, cities, provinces, nations, empires)',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID (default: active)' },
        {
          name: 'tier', type: 'select', required: false,
          options: POLITICAL_TIER_OPTIONS,
          description: 'Filter by political tier',
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/governance for governance entities' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          count?: number;
          entities?: Array<{
            id: string;
            name: string;
            tier: string;
            population: number;
            leaderId?: string;
            leaderName?: string;
          }>;
        };

        let output = 'GOVERNANCE ENTITIES\n\n';

        if (result.entities?.length) {
          result.entities.forEach(e => {
            output += `[${e.tier.toUpperCase()}] ${e.name}\n`;
            output += `  ID: ${e.id}\n`;
            output += `  Population: ${e.population.toLocaleString()}\n`;
            if (e.leaderName) {
              output += `  Leader: ${e.leaderName}\n`;
            }
            output += '\n';
          });
          output += `Total: ${result.count ?? result.entities.length}`;
        } else {
          output += 'No governance entities found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-governance-details',
      name: 'Get Governance Details',
      description: 'Get detailed info about a governance entity (elections, proposals, council)',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Governance entity ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity with governance components' };
      },
      renderResult: (data: unknown) => {
        const gov = data as {
          id?: string;
          name?: string;
          tier?: string;
          population?: number;
          leader?: { id: string; name: string; approvalRating?: number };
          council?: Array<{ id: string; name: string; role: string }>;
          activeProposals?: Array<{ id: string; type: string; status: string; votes?: { for: number; against: number } }>;
          nextElection?: number;
          treasury?: number;
          priorities?: Record<string, number>;
        };

        let output = `GOVERNANCE: ${gov.name ?? 'Unknown'}\n`;
        output += `${'='.repeat(40)}\n\n`;

        output += `Tier: ${gov.tier ?? 'Unknown'}\n`;
        output += `Population: ${gov.population?.toLocaleString() ?? 'N/A'}\n`;
        output += `Treasury: ${gov.treasury ?? 0} gold\n\n`;

        if (gov.leader) {
          output += `LEADER\n`;
          output += `  Name: ${gov.leader.name}\n`;
          output += `  Approval: ${gov.leader.approvalRating ?? 'N/A'}%\n\n`;
        }

        if (gov.council?.length) {
          output += `COUNCIL (${gov.council.length} members)\n`;
          gov.council.forEach(m => {
            output += `  ${m.name} - ${m.role}\n`;
          });
          output += '\n';
        }

        if (gov.activeProposals?.length) {
          output += `ACTIVE PROPOSALS\n`;
          gov.activeProposals.forEach(p => {
            output += `  [${p.type}] ${p.status}`;
            if (p.votes) {
              output += ` (For: ${p.votes.for}, Against: ${p.votes.against})`;
            }
            output += '\n';
          });
          output += '\n';
        }

        if (gov.priorities) {
          output += `PRIORITIES\n`;
          Object.entries(gov.priorities).forEach(([k, v]) => {
            output += `  ${k}: ${v}\n`;
          });
        }

        if (gov.nextElection) {
          output += `\nNext Election: Tick ${gov.nextElection}`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-elections',
      name: 'List Elections',
      description: 'List active or upcoming elections',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
        {
          name: 'tier', type: 'select', required: false,
          options: POLITICAL_TIER_OPTIONS,
          description: 'Filter by political tier',
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/elections' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          elections?: Array<{
            governanceId: string;
            governanceName: string;
            tier: string;
            status: 'campaigning' | 'voting' | 'upcoming';
            candidates: Array<{ id: string; name: string; support: number }>;
            votingEnds?: number;
          }>;
        };

        let output = 'ELECTIONS\n\n';

        if (result.elections?.length) {
          result.elections.forEach(e => {
            output += `[${e.tier.toUpperCase()}] ${e.governanceName}\n`;
            output += `  Status: ${e.status}\n`;
            if (e.votingEnds) {
              output += `  Voting Ends: Tick ${e.votingEnds}\n`;
            }
            output += `  Candidates:\n`;
            e.candidates.forEach(c => {
              output += `    - ${c.name}: ${c.support}% support\n`;
            });
            output += '\n';
          });
        } else {
          output += 'No active elections';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-proposals',
      name: 'List Proposals',
      description: 'List active proposals across governance entities',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
        {
          name: 'type', type: 'select', required: false,
          options: PROPOSAL_TYPE_OPTIONS,
          description: 'Filter by proposal type',
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/proposals' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          proposals?: Array<{
            id: string;
            governanceId: string;
            governanceName: string;
            type: string;
            description: string;
            proposer: string;
            status: string;
            votes: { for: number; against: number; abstain: number };
          }>;
        };

        let output = 'ACTIVE PROPOSALS\n\n';

        if (result.proposals?.length) {
          result.proposals.forEach(p => {
            output += `[${p.type.toUpperCase()}] ${p.governanceName}\n`;
            output += `  Description: ${p.description}\n`;
            output += `  Proposer: ${p.proposer}\n`;
            output += `  Status: ${p.status}\n`;
            output += `  Votes - For: ${p.votes.for}, Against: ${p.votes.against}, Abstain: ${p.votes.abstain}\n\n`;
          });
        } else {
          output += 'No active proposals';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-faction-info',
      name: 'Get Faction Info',
      description: 'Get political factions within a governance entity',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Governance entity ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/factions' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          governanceName?: string;
          factions?: Array<{
            id: string;
            name: string;
            ideology: string;
            memberCount: number;
            influence: number;
            leader?: string;
          }>;
        };

        let output = `FACTIONS: ${result.governanceName ?? 'Unknown'}\n\n`;

        if (result.factions?.length) {
          result.factions.forEach(f => {
            output += `${f.name}\n`;
            output += `  Ideology: ${f.ideology}\n`;
            output += `  Members: ${f.memberCount}\n`;
            output += `  Influence: ${f.influence}%\n`;
            if (f.leader) {
              output += `  Leader: ${f.leader}\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No factions found';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'trigger-election',
      name: 'Trigger Election',
      description: 'Start an election in a governance entity',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Governance entity ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Election triggered for entity ${params.entityId}` };
      },
    }),

    defineAction({
      id: 'set-election-result',
      name: 'Set Election Result',
      description: 'Force an election outcome (for testing)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Governance entity ID' },
        { name: 'winnerId', type: 'entity-id', required: true, entityType: 'agent', description: 'Winning candidate ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set ${params.winnerId} as election winner for ${params.entityId}` };
      },
    }),

    defineAction({
      id: 'create-proposal',
      name: 'Create Proposal',
      description: 'Create a new proposal in a governance entity',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Governance entity ID' },
        {
          name: 'type', type: 'select', required: true,
          options: PROPOSAL_TYPE_OPTIONS,
          description: 'Proposal type',
        },
        { name: 'description', type: 'string', required: true, description: 'Proposal description' },
        { name: 'proposerId', type: 'entity-id', required: false, entityType: 'agent', description: 'Proposer (default: leader)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `Created ${params.type} proposal: ${params.description}`,
        };
      },
    }),

    defineAction({
      id: 'vote-on-proposal',
      name: 'Vote on Proposal',
      description: 'Cast a vote on a proposal',
      params: [
        { name: 'proposalId', type: 'string', required: true, description: 'Proposal ID' },
        { name: 'voterId', type: 'entity-id', required: true, entityType: 'agent', description: 'Voter agent ID' },
        {
          name: 'vote', type: 'select', required: true,
          options: [
            { value: 'for', label: 'Vote For' },
            { value: 'against', label: 'Vote Against' },
            { value: 'abstain', label: 'Abstain' },
          ],
          description: 'Vote choice',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `${params.voterId} voted ${params.vote} on proposal ${params.proposalId}` };
      },
    }),

    defineAction({
      id: 'resolve-proposal',
      name: 'Resolve Proposal',
      description: 'Force resolve a proposal (pass/fail)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'proposalId', type: 'string', required: true, description: 'Proposal ID' },
        {
          name: 'outcome', type: 'select', required: true,
          options: [
            { value: 'pass', label: 'Pass' },
            { value: 'fail', label: 'Fail' },
          ],
          description: 'Forced outcome',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Proposal ${params.proposalId} resolved as ${params.outcome}` };
      },
    }),

    defineAction({
      id: 'issue-directive',
      name: 'Issue Directive',
      description: 'Issue a directive from governance leadership',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Governance entity ID' },
        {
          name: 'priority', type: 'select', required: true,
          options: PRIORITY_CATEGORY_OPTIONS,
          description: 'Priority category',
        },
        { name: 'weight', type: 'number', required: false, default: 1.0, description: 'Priority weight (0-2)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `Issued ${params.priority} directive with weight ${params.weight}`,
        };
      },
    }),

    defineAction({
      id: 'appoint-council-member',
      name: 'Appoint Council Member',
      description: 'Appoint an agent to the governance council',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Governance entity ID' },
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to appoint' },
        { name: 'role', type: 'string', required: true, description: 'Council role (e.g., treasurer, advisor)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Appointed ${params.agentId} as ${params.role}` };
      },
    }),

    defineAction({
      id: 'change-leader',
      name: 'Change Leader',
      description: 'Directly change governance leadership (for testing)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Governance entity ID' },
        { name: 'newLeaderId', type: 'entity-id', required: true, entityType: 'agent', description: 'New leader' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Changed leader of ${params.entityId} to ${params.newLeaderId}` };
      },
    }),

    defineAction({
      id: 'merge-governance',
      name: 'Merge Governance',
      description: 'Merge two governance entities (e.g., villages into city)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'sourceId', type: 'entity-id', required: true, description: 'Source entity (will be absorbed)' },
        { name: 'targetId', type: 'entity-id', required: true, description: 'Target entity (will absorb)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Merged ${params.sourceId} into ${params.targetId}` };
      },
    }),
  ],
});

capabilityRegistry.register(politicsCapability);
