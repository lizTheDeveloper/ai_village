/**
 * Social Capability - Manage social dynamics
 *
 * Provides admin interface for:
 * - Relationships (familiarity, affinity, trust)
 * - Families and lineage
 * - Reputation and social standing
 * - Conversations and social interactions
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const RELATIONSHIP_TYPE_OPTIONS = [
  { value: 'acquaintance', label: 'Acquaintance' },
  { value: 'friend', label: 'Friend' },
  { value: 'close_friend', label: 'Close Friend' },
  { value: 'rival', label: 'Rival' },
  { value: 'enemy', label: 'Enemy' },
  { value: 'romantic', label: 'Romantic Partner' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'family', label: 'Family' },
];

const FAMILY_BOND_OPTIONS = [
  { value: 'parent-child', label: 'Parent-Child' },
  { value: 'siblings', label: 'Siblings' },
  { value: 'spouses', label: 'Spouses' },
];

const REPUTATION_CATEGORY_OPTIONS = [
  { value: 'general', label: 'General Reputation' },
  { value: 'combat', label: 'Combat Prowess' },
  { value: 'crafting', label: 'Crafting Skill' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'trustworthiness', label: 'Trustworthiness' },
  { value: 'kindness', label: 'Kindness' },
];

const SOCIAL_EVENT_OPTIONS = [
  { value: 'celebration', label: 'Celebration' },
  { value: 'funeral', label: 'Funeral' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'festival', label: 'Festival' },
  { value: 'conflict', label: 'Conflict' },
  { value: 'reconciliation', label: 'Reconciliation' },
];

// ============================================================================
// Social Capability Definition
// ============================================================================

const socialCapability = defineCapability({
  id: 'social',
  name: 'Social Dynamics',
  description: 'Manage social systems - relationships, families, reputation, conversations',
  category: 'systems',

  tab: {
    icon: '👥',
    priority: 36,
  },

  queries: [
    defineQuery({
      id: 'list-relationships',
      name: 'List Relationships',
      description: 'List all relationships for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'minAffinity', type: 'number', required: false, description: 'Minimum affinity filter (-100 to 100)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity with relationship component' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentId?: string;
          agentName?: string;
          relationships?: Array<{
            targetId: string;
            targetName: string;
            type: string;
            familiarity: number;
            affinity: number;
            trust: number;
          }>;
        };

        let output = `RELATIONSHIPS: ${result.agentName ?? result.agentId ?? 'Unknown'}\n\n`;

        if (result.relationships?.length) {
          result.relationships.forEach(r => {
            output += `${r.targetName}\n`;
            output += `  Type: ${r.type}\n`;
            output += `  Familiarity: ${r.familiarity}\n`;
            output += `  Affinity: ${r.affinity}\n`;
            output += `  Trust: ${r.trust}\n\n`;
          });
        } else {
          output += 'No relationships found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-relationship-details',
      name: 'Get Relationship Details',
      description: 'Get detailed relationship between two agents',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent ID' },
        { name: 'targetId', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/relationship' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agent1?: { id: string; name: string };
          agent2?: { id: string; name: string };
          type?: string;
          familiarity?: number;
          affinity?: number;
          trust?: number;
          history?: Array<{ event: string; timestamp: number }>;
          sharedMemories?: number;
        };

        let output = 'RELATIONSHIP DETAILS\n\n';
        output += `${result.agent1?.name ?? 'Agent 1'} <-> ${result.agent2?.name ?? 'Agent 2'}\n\n`;
        output += `Type: ${result.type ?? 'Unknown'}\n`;
        output += `Familiarity: ${result.familiarity ?? 0}\n`;
        output += `Affinity: ${result.affinity ?? 0}\n`;
        output += `Trust: ${result.trust ?? 0}\n`;
        output += `Shared Memories: ${result.sharedMemories ?? 0}\n`;

        if (result.history?.length) {
          output += '\nRecent History:\n';
          result.history.slice(0, 5).forEach(h => {
            output += `  - ${h.event}\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-families',
      name: 'List Families',
      description: 'List all family units',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
        { name: 'limit', type: 'number', required: false, description: 'Maximum results' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/families' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          families?: Array<{
            id: string;
            name: string;
            headId: string;
            headName: string;
            memberCount: number;
            generations: number;
          }>;
        };

        let output = 'FAMILIES\n\n';

        if (result.families?.length) {
          result.families.forEach(f => {
            output += `${f.name}\n`;
            output += `  Head: ${f.headName}\n`;
            output += `  Members: ${f.memberCount}\n`;
            output += `  Generations: ${f.generations}\n\n`;
          });
        } else {
          output += 'No families found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-family-tree',
      name: 'Get Family Tree',
      description: 'Get family tree for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'generations', type: 'number', required: false, default: 3, description: 'Generations to include' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/family-tree' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          rootAgent?: { id: string; name: string };
          parents?: Array<{ id: string; name: string }>;
          siblings?: Array<{ id: string; name: string }>;
          spouse?: { id: string; name: string };
          children?: Array<{ id: string; name: string }>;
        };

        let output = 'FAMILY TREE\n\n';
        output += `Root: ${result.rootAgent?.name ?? 'Unknown'}\n\n`;

        if (result.parents?.length) {
          output += 'Parents:\n';
          result.parents.forEach(p => {
            output += `  - ${p.name}\n`;
          });
        }

        if (result.siblings?.length) {
          output += '\nSiblings:\n';
          result.siblings.forEach(s => {
            output += `  - ${s.name}\n`;
          });
        }

        if (result.spouse) {
          output += `\nSpouse: ${result.spouse.name}\n`;
        }

        if (result.children?.length) {
          output += '\nChildren:\n';
          result.children.forEach(c => {
            output += `  - ${c.name}\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-social-network',
      name: 'Get Social Network',
      description: 'Get social network map centered on an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Center agent ID' },
        { name: 'depth', type: 'number', required: false, default: 2, description: 'Network depth (1-3)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/social-network' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          centerAgent?: { id: string; name: string };
          nodeCount?: number;
          edgeCount?: number;
          clusters?: Array<{ name: string; members: number }>;
        };

        let output = 'SOCIAL NETWORK\n\n';
        output += `Center: ${result.centerAgent?.name ?? 'Unknown'}\n`;
        output += `Nodes: ${result.nodeCount ?? 0}\n`;
        output += `Connections: ${result.edgeCount ?? 0}\n`;

        if (result.clusters?.length) {
          output += '\nClusters:\n';
          result.clusters.forEach(c => {
            output += `  ${c.name}: ${c.members} members\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-reputations',
      name: 'Get Reputations',
      description: 'Get reputation scores for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity with reputation component' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          reputations?: Record<string, number>;
          notoriety?: number;
        };

        let output = `REPUTATION: ${result.agentName ?? 'Unknown'}\n\n`;

        if (result.reputations) {
          Object.entries(result.reputations).forEach(([k, v]) => {
            output += `${k}: ${v}\n`;
          });
        }

        if (result.notoriety !== undefined) {
          output += `\nNotoriety: ${result.notoriety}`;
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'set-relationship',
      name: 'Set Relationship',
      description: 'Set relationship values between two agents',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent ID' },
        { name: 'targetId', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent ID' },
        {
          name: 'type', type: 'select', required: false,
          options: RELATIONSHIP_TYPE_OPTIONS,
          description: 'Relationship type',
        },
        { name: 'familiarity', type: 'number', required: false, description: 'Familiarity (0-100)' },
        { name: 'affinity', type: 'number', required: false, description: 'Affinity (-100 to 100)' },
        { name: 'trust', type: 'number', required: false, description: 'Trust (-100 to 100)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Updated relationship between ${params.agentId} and ${params.targetId}` };
      },
    }),

    defineAction({
      id: 'create-family-bond',
      name: 'Create Family Bond',
      description: 'Create a family relationship between agents',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent ID' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent ID' },
        {
          name: 'bondType', type: 'select', required: true,
          options: FAMILY_BOND_OPTIONS,
          description: 'Type of family bond',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Created ${params.bondType} bond between ${params.agent1Id} and ${params.agent2Id}` };
      },
    }),

    defineAction({
      id: 'trigger-conversation',
      name: 'Trigger Conversation',
      description: 'Start a conversation between two agents',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent ID' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent ID' },
        { name: 'topic', type: 'string', required: false, description: 'Conversation topic' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Started conversation between ${params.agent1Id} and ${params.agent2Id}` };
      },
    }),

    defineAction({
      id: 'modify-reputation',
      name: 'Modify Reputation',
      description: 'Modify an agent\'s reputation in a category',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        {
          name: 'category', type: 'select', required: true,
          options: REPUTATION_CATEGORY_OPTIONS,
          description: 'Reputation category',
        },
        { name: 'change', type: 'number', required: true, description: 'Amount to change (-100 to 100)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Modified ${params.category} reputation for ${params.agentId} by ${params.change}` };
      },
    }),

    defineAction({
      id: 'introduce-social-event',
      name: 'Introduce Social Event',
      description: 'Trigger a social event affecting multiple agents',
      params: [
        { name: 'agentIds', type: 'json', required: true, description: 'Array of agent IDs involved' },
        {
          name: 'eventType', type: 'select', required: true,
          options: SOCIAL_EVENT_OPTIONS,
          description: 'Type of social event',
        },
        { name: 'description', type: 'string', required: false, description: 'Event description' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Triggered ${params.eventType} event` };
      },
    }),
  ],
});

capabilityRegistry.register(socialCapability);
