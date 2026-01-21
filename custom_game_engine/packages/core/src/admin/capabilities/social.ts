/**
 * Social Admin Capability
 *
 * Comprehensive social dynamics dashboard for LLM control:
 * - Relationships (familiarity, affinity, trust)
 * - Families and lineage
 * - Reputation and social standing
 * - Conversations and social interactions
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// OPTIONS
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
// CAPABILITY DEFINITION
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
    // ========================================================================
    // Relationship Queries
    // ========================================================================
    defineQuery({
      id: 'list-relationships',
      name: 'List Relationships',
      description: 'List all relationships for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'minAffinity', type: 'number', required: false, description: 'Minimum affinity filter (-100 to 100)' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const minAffinity = params.minAffinity as number | undefined;

        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const relationshipComp = entity.getComponent('relationship') as any;
        if (!relationshipComp) {
          return { relationships: [], message: 'Agent has no relationship component' };
        }

        const relationships: Array<{
          targetId: string;
          targetName: string;
          familiarity: number;
          affinity: number;
          trust: number;
          interactionCount: number;
          classification: string;
        }> = [];

        const relationshipMap = relationshipComp.relationships as Map<string, any> | undefined;
        if (relationshipMap) {
          for (const [targetId, rel] of relationshipMap) {
            if (minAffinity !== undefined && rel.affinity < minAffinity) {
              continue;
            }

            const targetEntity = world.getEntity(targetId);
            const targetIdentity = targetEntity?.getComponent('identity') as any;

            let classification = 'acquaintance';
            if (rel.affinity >= 70) classification = 'close_friend';
            else if (rel.affinity >= 40) classification = 'friend';
            else if (rel.affinity <= -50) classification = 'enemy';
            else if (rel.affinity <= -20) classification = 'rival';

            relationships.push({
              targetId,
              targetName: targetIdentity?.name || targetId,
              familiarity: rel.familiarity || 0,
              affinity: rel.affinity || 0,
              trust: rel.trust || 50,
              interactionCount: rel.interactionCount || 0,
              classification,
            });
          }
        }

        relationships.sort((a, b) => b.affinity - a.affinity);

        return {
          agentId,
          count: relationships.length,
          relationships,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'RELATIONSHIPS\n\n';

        if (result.message) {
          output += result.message;
          return output;
        }

        output += `Agent: ${result.agentId}\n`;
        output += `Total: ${result.count}\n\n`;

        for (const rel of result.relationships) {
          output += `${rel.targetName} (${rel.classification})\n`;
          output += `  Affinity: ${rel.affinity} | Trust: ${rel.trust} | Familiarity: ${rel.familiarity}\n`;
          output += `  Interactions: ${rel.interactionCount}\n\n`;
        }

        if (result.count === 0) {
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
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agent1Id = params.agent1Id as string;
        const agent2Id = params.agent2Id as string;

        const entity1 = world.getEntity(agent1Id);
        const entity2 = world.getEntity(agent2Id);

        if (!entity1) throw new Error(`Agent ${agent1Id} not found`);
        if (!entity2) throw new Error(`Agent ${agent2Id} not found`);

        const rel1 = entity1.getComponent('relationship') as any;
        const rel2 = entity2.getComponent('relationship') as any;
        const identity1 = entity1.getComponent('identity') as any;
        const identity2 = entity2.getComponent('identity') as any;

        const relationship1to2 = rel1?.relationships?.get(agent2Id);
        const relationship2to1 = rel2?.relationships?.get(agent1Id);

        return {
          agent1: {
            id: agent1Id,
            name: identity1?.name || agent1Id,
            towardsAgent2: relationship1to2 || null,
          },
          agent2: {
            id: agent2Id,
            name: identity2?.name || agent2Id,
            towardsAgent1: relationship2to1 || null,
          },
          mutual: relationship1to2 && relationship2to1,
          avgAffinity: relationship1to2 && relationship2to1
            ? (relationship1to2.affinity + relationship2to1.affinity) / 2
            : null,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'RELATIONSHIP DETAILS\n\n';
        output += `${result.agent1.name} <-> ${result.agent2.name}\n`;
        output += `Mutual: ${result.mutual ? 'Yes' : 'No'}\n`;
        if (result.avgAffinity !== null) {
          output += `Average Affinity: ${result.avgAffinity.toFixed(1)}\n`;
        }
        output += '\n';

        if (result.agent1.towardsAgent2) {
          const r = result.agent1.towardsAgent2;
          output += `${result.agent1.name} → ${result.agent2.name}:\n`;
          output += `  Affinity: ${r.affinity} | Trust: ${r.trust} | Familiarity: ${r.familiarity}\n`;
        }

        if (result.agent2.towardsAgent1) {
          const r = result.agent2.towardsAgent1;
          output += `${result.agent2.name} → ${result.agent1.name}:\n`;
          output += `  Affinity: ${r.affinity} | Trust: ${r.trust} | Familiarity: ${r.familiarity}\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-families',
      name: 'List Families',
      description: 'List all families in the world',
      params: [
        { name: 'minSize', type: 'number', required: false, description: 'Minimum family size' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const minSize = (params.minSize as number) || 1;
        const familyAgents = world.query().with('family').executeEntities();

        const familyMap = new Map<string, any[]>();
        for (const agent of familyAgents) {
          const family = agent.getComponent('family') as any;
          if (family?.familyId) {
            const existing = familyMap.get(family.familyId) || [];
            existing.push({
              id: agent.id,
              role: family.role,
              name: (agent.getComponent('identity') as any)?.name || agent.id,
            });
            familyMap.set(family.familyId, existing);
          }
        }

        const families: Array<{
          familyId: string;
          size: number;
          members: Array<{ id: string; name: string; role: string }>;
        }> = [];

        for (const [familyId, members] of familyMap) {
          if (members.length >= minSize) {
            families.push({ familyId, size: members.length, members });
          }
        }

        return {
          count: families.length,
          families: families.sort((a, b) => b.size - a.size),
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'FAMILIES\n\n';
        output += `Total: ${result.count}\n\n`;

        for (const family of result.families) {
          output += `Family ${family.familyId} (${family.size} members)\n`;
          for (const member of family.members) {
            output += `  - ${member.name} (${member.role || 'member'})\n`;
          }
          output += '\n';
        }

        if (result.count === 0) {
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
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const family = entity.getComponent('family') as any;
        const identity = entity.getComponent('identity') as any;

        if (!family) {
          return {
            agentId,
            name: identity?.name || agentId,
            message: 'Agent has no family component',
          };
        }

        const getAgentInfo = (id: string) => {
          const e = world.getEntity(id);
          const ident = e?.getComponent('identity') as any;
          return { id, name: ident?.name || id, alive: e !== null };
        };

        return {
          agent: { id: agentId, name: identity?.name || agentId },
          familyId: family.familyId,
          parents: (family.parentIds || []).map(getAgentInfo),
          children: (family.childIds || []).map(getAgentInfo),
          siblings: (family.siblingIds || []).map(getAgentInfo),
          spouse: family.spouseId ? getAgentInfo(family.spouseId) : null,
          generation: family.generation || 0,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'FAMILY TREE\n\n';

        if (result.message) {
          output += `${result.name}: ${result.message}`;
          return output;
        }

        output += `Agent: ${result.agent.name}\n`;
        output += `Family ID: ${result.familyId}\n`;
        output += `Generation: ${result.generation}\n\n`;

        if (result.spouse) {
          output += `Spouse: ${result.spouse.name}\n`;
        }

        if (result.parents.length > 0) {
          output += 'Parents:\n';
          for (const p of result.parents) {
            output += `  - ${p.name}${p.alive ? '' : ' (deceased)'}\n`;
          }
        }

        if (result.children.length > 0) {
          output += 'Children:\n';
          for (const c of result.children) {
            output += `  - ${c.name}${c.alive ? '' : ' (deceased)'}\n`;
          }
        }

        if (result.siblings.length > 0) {
          output += 'Siblings:\n';
          for (const s of result.siblings) {
            output += `  - ${s.name}${s.alive ? '' : ' (deceased)'}\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-social-network',
      name: 'Get Social Network',
      description: 'Get social network statistics',
      params: [],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agents = world.query().with('agent', 'relationship').executeEntities();

        let totalRelationships = 0;
        let totalAffinity = 0;
        let friendships = 0;
        let rivalries = 0;

        for (const agent of agents) {
          const rel = agent.getComponent('relationship') as any;
          const relationships = rel?.relationships as Map<string, any> | undefined;

          if (relationships) {
            for (const [_targetId, r] of relationships) {
              totalRelationships++;
              totalAffinity += r.affinity || 0;
              if (r.affinity >= 40) friendships++;
              if (r.affinity <= -20) rivalries++;
            }
          }
        }

        return {
          agentCount: agents.length,
          totalRelationships,
          averageAffinity: totalRelationships > 0 ? totalAffinity / totalRelationships : 0,
          friendships,
          rivalries,
          connectedness: agents.length > 0 ? totalRelationships / agents.length : 0,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'SOCIAL NETWORK STATS\n\n';
        output += `Agents: ${result.agentCount}\n`;
        output += `Total Relationships: ${result.totalRelationships}\n`;
        output += `Average Affinity: ${result.averageAffinity.toFixed(1)}\n`;
        output += `Friendships: ${result.friendships}\n`;
        output += `Rivalries: ${result.rivalries}\n`;
        output += `Connectedness: ${result.connectedness.toFixed(2)} relationships/agent\n`;
        return output;
      },
    }),

    defineQuery({
      id: 'get-reputations',
      name: 'Get Reputations',
      description: 'Get reputation scores for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const reputation = entity.getComponent('reputation') as any;
        const identity = entity.getComponent('identity') as any;

        if (!reputation) {
          return {
            agentId,
            name: identity?.name || agentId,
            message: 'Agent has no reputation component',
          };
        }

        return {
          agentId,
          name: identity?.name || agentId,
          general: reputation.general || 50,
          combat: reputation.combat || 50,
          crafting: reputation.crafting || 50,
          leadership: reputation.leadership || 50,
          trustworthiness: reputation.trustworthiness || 50,
          kindness: reputation.kindness || 50,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'REPUTATION\n\n';
        output += `Agent: ${result.name}\n\n`;

        if (result.message) {
          output += result.message;
          return output;
        }

        output += `General: ${result.general}\n`;
        output += `Combat: ${result.combat}\n`;
        output += `Crafting: ${result.crafting}\n`;
        output += `Leadership: ${result.leadership}\n`;
        output += `Trustworthiness: ${result.trustworthiness}\n`;
        output += `Kindness: ${result.kindness}\n`;
        return output;
      },
    }),
  ],

  actions: [
    // ========================================================================
    // Social Actions
    // ========================================================================
    defineAction({
      id: 'set-relationship',
      name: 'Set Relationship',
      description: 'Set relationship values between two agents',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent' },
        { name: 'familiarity', type: 'number', required: false, description: 'Familiarity (0-100)' },
        { name: 'affinity', type: 'number', required: false, description: 'Affinity (-100 to 100)' },
        { name: 'trust', type: 'number', required: false, description: 'Trust (0-100)' },
        { name: 'bidirectional', type: 'boolean', required: false, default: true, description: 'Apply to both directions' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agent1Id = params.agent1Id as string;
        const agent2Id = params.agent2Id as string;
        const familiarity = params.familiarity as number | undefined;
        const affinity = params.affinity as number | undefined;
        const trust = params.trust as number | undefined;
        const bidirectional = params.bidirectional !== false;

        const entity1 = world.getEntity(agent1Id);
        const entity2 = world.getEntity(agent2Id);

        if (!entity1) throw new Error(`Agent ${agent1Id} not found`);
        if (!entity2) throw new Error(`Agent ${agent2Id} not found`);

        const updateRelationship = (fromEntity: any, toId: string) => {
          fromEntity.updateComponent('relationship', (current: any) => {
            const relationships = new Map(current.relationships || []);
            const existing = relationships.get(toId) || {
              targetId: toId,
              familiarity: 0,
              affinity: 0,
              trust: 50,
              lastInteraction: world.tick,
              interactionCount: 0,
            };

            if (familiarity !== undefined) existing.familiarity = Math.max(0, Math.min(100, familiarity));
            if (affinity !== undefined) existing.affinity = Math.max(-100, Math.min(100, affinity));
            if (trust !== undefined) existing.trust = Math.max(0, Math.min(100, trust));
            existing.lastInteraction = world.tick;

            relationships.set(toId, existing);
            return { ...current, relationships };
          });
        };

        updateRelationship(entity1, agent2Id);
        if (bidirectional) {
          updateRelationship(entity2, agent1Id);
        }

        return {
          success: true,
          message: `Relationship updated${bidirectional ? ' (bidirectional)' : ''}`,
        };
      },
    }),

    defineAction({
      id: 'create-family-bond',
      name: 'Create Family Bond',
      description: 'Create a family relationship between agents',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent' },
        { name: 'bondType', type: 'select', required: true, options: FAMILY_BOND_OPTIONS, description: 'Type of bond' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agent1Id = params.agent1Id as string;
        const agent2Id = params.agent2Id as string;
        const bondType = params.bondType as string;

        const entity1 = world.getEntity(agent1Id);
        const entity2 = world.getEntity(agent2Id);

        if (!entity1) throw new Error(`Agent ${agent1Id} not found`);
        if (!entity2) throw new Error(`Agent ${agent2Id} not found`);

        world.eventBus.emit({
          type: 'family:bond_created',
          source: agent1Id,
          data: { agent1Id, agent2Id, bondType, tick: world.tick },
        });

        return {
          success: true,
          message: `Family bond created: ${bondType} between ${agent1Id} and ${agent2Id}`,
        };
      },
    }),

    defineAction({
      id: 'trigger-conversation',
      name: 'Trigger Conversation',
      description: 'Force two agents to have a conversation',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent' },
        { name: 'topic', type: 'string', required: false, description: 'Conversation topic' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agent1Id = params.agent1Id as string;
        const agent2Id = params.agent2Id as string;
        const topic = params.topic as string | undefined;

        const entity1 = world.getEntity(agent1Id);
        const entity2 = world.getEntity(agent2Id);

        if (!entity1) throw new Error(`Agent ${agent1Id} not found`);
        if (!entity2) throw new Error(`Agent ${agent2Id} not found`);

        world.eventBus.emit({
          type: 'conversation:started',
          source: agent1Id,
          data: {
            conversationId: `conv-${Date.now()}`,
            participants: [agent1Id, agent2Id],
            agent1: agent1Id,
            agent2: agent2Id,
            topics: topic ? [topic] : [],
            tick: world.tick,
          },
        });

        return {
          success: true,
          message: `Conversation triggered between agents${topic ? ` about "${topic}"` : ''}`,
        };
      },
    }),

    defineAction({
      id: 'modify-reputation',
      name: 'Modify Reputation',
      description: 'Modify an agent\'s reputation',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'category', type: 'select', required: true, options: REPUTATION_CATEGORY_OPTIONS, description: 'Category' },
        { name: 'change', type: 'number', required: true, description: 'Amount to change (-50 to +50)' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for change' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const category = params.category as string;
        const change = params.change as number;
        const reason = (params.reason as string) || 'Admin modification';

        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        world.eventBus.emit({
          type: 'social:reputation_changed',
          source: agentId,
          data: { agentId, category, change, reason, tick: world.tick },
        });

        return {
          success: true,
          message: `Reputation (${category}) changed by ${change > 0 ? '+' : ''}${change}: ${reason}`,
        };
      },
    }),

    defineAction({
      id: 'introduce-social-event',
      name: 'Introduce Social Event',
      description: 'Introduce a social event that affects relationships',
      params: [
        { name: 'eventType', type: 'select', required: true, options: SOCIAL_EVENT_OPTIONS, description: 'Event type' },
        { name: 'participantIds', type: 'string', required: true, description: 'Comma-separated participant IDs' },
        { name: 'description', type: 'string', required: false, description: 'Event description' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const eventType = params.eventType as string;
        const participantIdsStr = params.participantIds as string;
        const description = params.description as string | undefined;

        const participantIds = participantIdsStr.split(',').map(s => s.trim()).filter(Boolean);

        if (participantIds.length === 0) {
          throw new Error('No valid participant IDs provided');
        }

        for (const id of participantIds) {
          if (!world.getEntity(id)) {
            throw new Error(`Participant ${id} not found`);
          }
        }

        world.eventBus.emit({
          type: 'social:event_occurred',
          source: 'admin',
          data: {
            eventType,
            participantIds,
            description: description || `A ${eventType} occurred`,
            tick: world.tick,
          },
        });

        return {
          success: true,
          message: `Social event (${eventType}) introduced with ${participantIds.length} participants`,
        };
      },
    }),
  ],
});

capabilityRegistry.register(socialCapability);

export { socialCapability };
