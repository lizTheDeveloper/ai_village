/**
 * Social Admin Capability
 *
 * Comprehensive social dynamics dashboard for LLM control:
 * - Relationships (familiarity, affinity, trust)
 * - Families and lineage
 * - Reputation and social standing
 * - Conversations and social interactions
 */

import { defineCapability, defineQuery, defineAction, capabilityRegistry } from '../capability-registry.js';
import type { AdminContext, QueryResult, ActionResult } from '../types.js';

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
] as const;

const FAMILY_ROLE_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
] as const;

const REPUTATION_CATEGORY_OPTIONS = [
  { value: 'general', label: 'General Reputation' },
  { value: 'combat', label: 'Combat Prowess' },
  { value: 'crafting', label: 'Crafting Skill' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'trustworthiness', label: 'Trustworthiness' },
  { value: 'kindness', label: 'Kindness' },
] as const;

// ============================================================================
// QUERIES
// ============================================================================

const listRelationships = defineQuery({
  id: 'list-relationships',
  name: 'List Relationships',
  description: 'List all relationships for an agent',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID to get relationships for',
      required: true,
    },
    {
      name: 'minAffinity',
      type: 'number',
      description: 'Minimum affinity filter (-100 to 100)',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const minAffinity = params.minAffinity as number | undefined;

    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    const relationshipComp = entity.getComponent('relationship') as any;
    if (!relationshipComp) {
      return {
        success: true,
        data: { relationships: [], message: 'Agent has no relationship component' },
      };
    }

    const relationships: Array<{
      targetId: string;
      targetName: string;
      familiarity: number;
      affinity: number;
      trust: number;
      interactionCount: number;
      lastInteraction: number;
      classification: string;
    }> = [];

    const relationshipMap = relationshipComp.relationships as Map<string, any> | undefined;
    if (relationshipMap) {
      for (const [targetId, rel] of relationshipMap) {
        if (minAffinity !== undefined && rel.affinity < minAffinity) {
          continue;
        }

        // Get target name
        const targetEntity = world.getEntity(targetId);
        const targetIdentity = targetEntity?.getComponent('identity') as any;

        // Classify relationship based on metrics
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
          lastInteraction: rel.lastInteraction || 0,
          classification,
        });
      }
    }

    // Sort by affinity descending
    relationships.sort((a, b) => b.affinity - a.affinity);

    return {
      success: true,
      data: {
        agentId,
        count: relationships.length,
        relationships,
      },
    };
  },
});

const getRelationshipDetails = defineQuery({
  id: 'get-relationship-details',
  name: 'Get Relationship Details',
  description: 'Get detailed relationship between two agents',
  parameters: [
    {
      name: 'agent1Id',
      type: 'string',
      description: 'First agent ID',
      required: true,
    },
    {
      name: 'agent2Id',
      type: 'string',
      description: 'Second agent ID',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agent1Id = params.agent1Id as string;
    const agent2Id = params.agent2Id as string;

    const entity1 = world.getEntity(agent1Id);
    const entity2 = world.getEntity(agent2Id);

    if (!entity1) {
      return { success: false, error: `Agent ${agent1Id} not found` };
    }
    if (!entity2) {
      return { success: false, error: `Agent ${agent2Id} not found` };
    }

    const rel1 = entity1.getComponent('relationship') as any;
    const rel2 = entity2.getComponent('relationship') as any;

    const identity1 = entity1.getComponent('identity') as any;
    const identity2 = entity2.getComponent('identity') as any;

    const relationship1to2 = rel1?.relationships?.get(agent2Id);
    const relationship2to1 = rel2?.relationships?.get(agent1Id);

    return {
      success: true,
      data: {
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
      },
    };
  },
});

const listFamilies = defineQuery({
  id: 'list-families',
  name: 'List Families',
  description: 'List all families in the world',
  parameters: [
    {
      name: 'minSize',
      type: 'number',
      description: 'Minimum family size',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const minSize = (params.minSize as number) || 1;

    // Find agents with family components
    const familyAgents = world.query().with('family').executeEntities();

    // Group by family ID
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
        families.push({
          familyId,
          size: members.length,
          members,
        });
      }
    }

    return {
      success: true,
      data: {
        count: families.length,
        families: families.sort((a, b) => b.size - a.size),
      },
    };
  },
});

const getFamilyTree = defineQuery({
  id: 'get-family-tree',
  name: 'Get Family Tree',
  description: 'Get family tree for an agent',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID to get family tree for',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    const family = entity.getComponent('family') as any;
    const identity = entity.getComponent('identity') as any;

    if (!family) {
      return {
        success: true,
        data: {
          agentId,
          name: identity?.name || agentId,
          message: 'Agent has no family component',
        },
      };
    }

    // Helper to get agent info
    const getAgentInfo = (id: string) => {
      const e = world.getEntity(id);
      const ident = e?.getComponent('identity') as any;
      return {
        id,
        name: ident?.name || id,
        alive: e !== null,
      };
    };

    return {
      success: true,
      data: {
        agent: {
          id: agentId,
          name: identity?.name || agentId,
        },
        familyId: family.familyId,
        parents: (family.parentIds || []).map(getAgentInfo),
        children: (family.childIds || []).map(getAgentInfo),
        siblings: (family.siblingIds || []).map(getAgentInfo),
        spouse: family.spouseId ? getAgentInfo(family.spouseId) : null,
        generation: family.generation || 0,
      },
    };
  },
});

const getSocialNetwork = defineQuery({
  id: 'get-social-network',
  name: 'Get Social Network',
  description: 'Get social network statistics for an area or village',
  parameters: [
    {
      name: 'villageId',
      type: 'string',
      description: 'Village entity ID (optional)',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Get all agents with relationships
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
      success: true,
      data: {
        agentCount: agents.length,
        totalRelationships,
        averageAffinity: totalRelationships > 0 ? totalAffinity / totalRelationships : 0,
        friendships,
        rivalries,
        connectedness: agents.length > 0 ? totalRelationships / agents.length : 0,
      },
    };
  },
});

const getReputations = defineQuery({
  id: 'get-reputations',
  name: 'Get Reputations',
  description: 'Get reputation scores for an agent',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    const reputation = entity.getComponent('reputation') as any;
    const identity = entity.getComponent('identity') as any;

    if (!reputation) {
      return {
        success: true,
        data: {
          agentId,
          name: identity?.name || agentId,
          message: 'Agent has no reputation component',
        },
      };
    }

    return {
      success: true,
      data: {
        agentId,
        name: identity?.name || agentId,
        generalReputation: reputation.general || 50,
        combatReputation: reputation.combat || 50,
        craftingReputation: reputation.crafting || 50,
        leadershipReputation: reputation.leadership || 50,
        trustworthinessReputation: reputation.trustworthiness || 50,
        kindnessReputation: reputation.kindness || 50,
        reputationEvents: reputation.events || [],
      },
    };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

const setRelationship = defineAction({
  id: 'set-relationship',
  name: 'Set Relationship',
  description: 'Set relationship values between two agents',
  parameters: [
    {
      name: 'agent1Id',
      type: 'string',
      description: 'First agent ID',
      required: true,
    },
    {
      name: 'agent2Id',
      type: 'string',
      description: 'Second agent ID',
      required: true,
    },
    {
      name: 'familiarity',
      type: 'number',
      description: 'Familiarity (0-100)',
      required: false,
    },
    {
      name: 'affinity',
      type: 'number',
      description: 'Affinity (-100 to 100)',
      required: false,
    },
    {
      name: 'trust',
      type: 'number',
      description: 'Trust (0-100)',
      required: false,
    },
    {
      name: 'bidirectional',
      type: 'boolean',
      description: 'Apply to both directions (default true)',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agent1Id = params.agent1Id as string;
    const agent2Id = params.agent2Id as string;
    const familiarity = params.familiarity as number | undefined;
    const affinity = params.affinity as number | undefined;
    const trust = params.trust as number | undefined;
    const bidirectional = params.bidirectional !== false;

    const entity1 = world.getEntity(agent1Id);
    const entity2 = world.getEntity(agent2Id);

    if (!entity1) {
      return { success: false, error: `Agent ${agent1Id} not found` };
    }
    if (!entity2) {
      return { success: false, error: `Agent ${agent2Id} not found` };
    }

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

    // Update agent1's view of agent2
    updateRelationship(entity1, agent2Id);

    // Optionally update agent2's view of agent1
    if (bidirectional) {
      updateRelationship(entity2, agent1Id);
    }

    return {
      success: true,
      message: `Relationship updated${bidirectional ? ' (bidirectional)' : ''}`,
    };
  },
});

const createFamilyBond = defineAction({
  id: 'create-family-bond',
  name: 'Create Family Bond',
  description: 'Create a family relationship between agents',
  parameters: [
    {
      name: 'agent1Id',
      type: 'string',
      description: 'First agent ID',
      required: true,
    },
    {
      name: 'agent2Id',
      type: 'string',
      description: 'Second agent ID',
      required: true,
    },
    {
      name: 'bondType',
      type: 'select',
      description: 'Type of family bond',
      required: true,
      options: ['parent-child', 'siblings', 'spouses'],
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agent1Id = params.agent1Id as string;
    const agent2Id = params.agent2Id as string;
    const bondType = params.bondType as string;

    const entity1 = world.getEntity(agent1Id);
    const entity2 = world.getEntity(agent2Id);

    if (!entity1) {
      return { success: false, error: `Agent ${agent1Id} not found` };
    }
    if (!entity2) {
      return { success: false, error: `Agent ${agent2Id} not found` };
    }

    // Emit family bond event
    world.eventBus.emit({
      type: 'family:bond_created',
      source: agent1Id,
      data: {
        agent1Id,
        agent2Id,
        bondType,
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Family bond created: ${bondType} between ${agent1Id} and ${agent2Id}`,
    };
  },
});

const triggerConversation = defineAction({
  id: 'trigger-conversation',
  name: 'Trigger Conversation',
  description: 'Force two agents to have a conversation',
  parameters: [
    {
      name: 'agent1Id',
      type: 'string',
      description: 'First agent ID',
      required: true,
    },
    {
      name: 'agent2Id',
      type: 'string',
      description: 'Second agent ID',
      required: true,
    },
    {
      name: 'topic',
      type: 'string',
      description: 'Conversation topic (optional)',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agent1Id = params.agent1Id as string;
    const agent2Id = params.agent2Id as string;
    const topic = params.topic as string | undefined;

    const entity1 = world.getEntity(agent1Id);
    const entity2 = world.getEntity(agent2Id);

    if (!entity1) {
      return { success: false, error: `Agent ${agent1Id} not found` };
    }
    if (!entity2) {
      return { success: false, error: `Agent ${agent2Id} not found` };
    }

    // Emit conversation started event
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
});

const modifyReputation = defineAction({
  id: 'modify-reputation',
  name: 'Modify Reputation',
  description: 'Modify an agent\'s reputation',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent ID',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      description: 'Reputation category',
      required: true,
      options: REPUTATION_CATEGORY_OPTIONS.map(o => o.value),
    },
    {
      name: 'change',
      type: 'number',
      description: 'Amount to change (-50 to +50)',
      required: true,
    },
    {
      name: 'reason',
      type: 'string',
      description: 'Reason for change',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const category = params.category as string;
    const change = params.change as number;
    const reason = (params.reason as string) || 'Admin modification';

    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    // Emit reputation changed event
    world.eventBus.emit({
      type: 'social:reputation_changed',
      source: agentId,
      data: {
        agentId,
        category,
        change,
        reason,
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Reputation (${category}) changed by ${change > 0 ? '+' : ''}${change}: ${reason}`,
    };
  },
});

const introduceSocialEvent = defineAction({
  id: 'introduce-social-event',
  name: 'Introduce Social Event',
  description: 'Introduce a social event that affects relationships',
  parameters: [
    {
      name: 'eventType',
      type: 'select',
      description: 'Type of social event',
      required: true,
      options: ['celebration', 'funeral', 'wedding', 'festival', 'conflict', 'reconciliation'],
    },
    {
      name: 'participantIds',
      type: 'string',
      description: 'Comma-separated list of participant agent IDs',
      required: true,
    },
    {
      name: 'description',
      type: 'string',
      description: 'Event description',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const eventType = params.eventType as string;
    const participantIdsStr = params.participantIds as string;
    const description = params.description as string | undefined;

    const participantIds = participantIdsStr.split(',').map(s => s.trim()).filter(Boolean);

    if (participantIds.length === 0) {
      return { success: false, error: 'No valid participant IDs provided' };
    }

    // Verify participants exist
    for (const id of participantIds) {
      if (!world.getEntity(id)) {
        return { success: false, error: `Participant ${id} not found` };
      }
    }

    // Emit social event
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
});

// ============================================================================
// CAPABILITY REGISTRATION
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
    listRelationships,
    getRelationshipDetails,
    listFamilies,
    getFamilyTree,
    getSocialNetwork,
    getReputations,
  ],
  actions: [
    setRelationship,
    createFamilyBond,
    triggerConversation,
    modifyReputation,
    introduceSocialEvent,
  ],
});

capabilityRegistry.register(socialCapability);

export { socialCapability };
