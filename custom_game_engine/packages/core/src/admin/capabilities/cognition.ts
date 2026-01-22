/**
 * Cognition Capability - Access agent minds and decision-making
 *
 * Provides admin interface for:
 * - Agent memories (episodic, semantic, procedural)
 * - Beliefs and knowledge
 * - Goals and motivations
 * - Decision history and reasoning
 * - Current thoughts and perceptions
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const MEMORY_TYPE_OPTIONS = [
  { value: 'episodic', label: 'Episodic (events)' },
  { value: 'semantic', label: 'Semantic (facts)' },
  { value: 'procedural', label: 'Procedural (skills)' },
  { value: 'spatial', label: 'Spatial (locations)' },
];

const BELIEF_CATEGORY_OPTIONS = [
  { value: 'self', label: 'About Self' },
  { value: 'others', label: 'About Others' },
  { value: 'world', label: 'About World' },
  { value: 'relationships', label: 'About Relationships' },
  { value: 'goals', label: 'About Goals' },
];

const GOAL_PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent (immediate)' },
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' },
  { value: 'background', label: 'Background' },
];

const EMOTION_OPTIONS = [
  { value: 'happy', label: 'Happy' },
  { value: 'sad', label: 'Sad' },
  { value: 'angry', label: 'Angry' },
  { value: 'fearful', label: 'Fearful' },
  { value: 'surprised', label: 'Surprised' },
  { value: 'disgusted', label: 'Disgusted' },
  { value: 'neutral', label: 'Neutral' },
];

// ============================================================================
// Cognition Capability Definition
// ============================================================================

const cognitionCapability = defineCapability({
  id: 'cognition',
  name: 'Cognition & Memory',
  description: 'Access agent minds - memories, beliefs, goals, decisions, thoughts',
  category: 'systems',

  tab: {
    icon: '🧠',
    priority: 15,
  },

  queries: [
    defineQuery({
      id: 'get-agent-thoughts',
      name: 'Get Agent Thoughts',
      description: 'Get current thoughts, perceptions, and mental state of an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity with brain/perception components' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          currentBehavior?: string;
          behaviorReason?: string;
          currentGoal?: string;
          mood?: string;
          recentPerceptions?: Array<{ type: string; description: string }>;
          lastDecision?: { behavior: string; reason: string; tick: number };
        };

        let output = `AGENT THOUGHTS: ${result.agentName ?? 'Unknown'}\n`;
        output += `${'='.repeat(40)}\n\n`;

        output += `Current Behavior: ${result.currentBehavior ?? 'idle'}\n`;
        if (result.behaviorReason) {
          output += `Reason: ${result.behaviorReason}\n`;
        }
        output += `Current Goal: ${result.currentGoal ?? 'none'}\n`;
        output += `Mood: ${result.mood ?? 'neutral'}\n\n`;

        if (result.recentPerceptions?.length) {
          output += 'RECENT PERCEPTIONS\n';
          result.recentPerceptions.slice(0, 5).forEach(p => {
            output += `  [${p.type}] ${p.description}\n`;
          });
          output += '\n';
        }

        if (result.lastDecision) {
          output += 'LAST DECISION\n';
          output += `  Chose: ${result.lastDecision.behavior}\n`;
          output += `  Reason: ${result.lastDecision.reason}\n`;
          output += `  At Tick: ${result.lastDecision.tick}\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-agent-memories',
      name: 'Get Agent Memories',
      description: 'Get memories stored by an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        {
          name: 'type', type: 'select', required: false,
          options: MEMORY_TYPE_OPTIONS,
          description: 'Filter by memory type',
        },
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Maximum memories to return' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/memories' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          totalMemories?: number;
          memories?: Array<{
            id: string;
            type: string;
            content: string;
            importance: number;
            tick: number;
            relatedEntities?: string[];
          }>;
        };

        let output = `MEMORIES: ${result.agentName ?? 'Unknown'}\n`;
        output += `Total: ${result.totalMemories ?? 0}\n\n`;

        if (result.memories?.length) {
          result.memories.forEach(m => {
            output += `[${m.type.toUpperCase()}] (importance: ${m.importance})\n`;
            output += `  ${m.content}\n`;
            output += `  Tick: ${m.tick}\n`;
            if (m.relatedEntities?.length) {
              output += `  Related: ${m.relatedEntities.join(', ')}\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No memories found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-agent-beliefs',
      name: 'Get Agent Beliefs',
      description: 'Get beliefs and knowledge held by an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        {
          name: 'category', type: 'select', required: false,
          options: BELIEF_CATEGORY_OPTIONS,
          description: 'Filter by belief category',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/beliefs' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          beliefs?: Array<{
            category: string;
            subject: string;
            belief: string;
            confidence: number;
            source: string;
          }>;
        };

        let output = `BELIEFS: ${result.agentName ?? 'Unknown'}\n\n`;

        if (result.beliefs?.length) {
          const grouped = new Map<string, typeof result.beliefs>();
          result.beliefs.forEach(b => {
            const list = grouped.get(b.category) || [];
            list.push(b);
            grouped.set(b.category, list);
          });

          grouped.forEach((beliefs, category) => {
            output += `${category.toUpperCase()}\n`;
            beliefs.forEach(b => {
              output += `  ${b.subject}: ${b.belief}\n`;
              output += `    Confidence: ${(b.confidence * 100).toFixed(0)}% | Source: ${b.source}\n`;
            });
            output += '\n';
          });
        } else {
          output += 'No beliefs found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-agent-goals',
      name: 'Get Agent Goals',
      description: 'Get current goals and motivations of an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/goals' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          activeGoal?: { name: string; progress: number; priority: string };
          goalStack?: Array<{ name: string; priority: string; status: string }>;
          longTermGoals?: Array<{ name: string; description: string }>;
        };

        let output = `GOALS: ${result.agentName ?? 'Unknown'}\n\n`;

        if (result.activeGoal) {
          output += 'ACTIVE GOAL\n';
          output += `  ${result.activeGoal.name}\n`;
          output += `  Progress: ${(result.activeGoal.progress * 100).toFixed(0)}%\n`;
          output += `  Priority: ${result.activeGoal.priority}\n\n`;
        }

        if (result.goalStack?.length) {
          output += 'GOAL STACK\n';
          result.goalStack.forEach((g, i) => {
            output += `  ${i + 1}. ${g.name} [${g.priority}] - ${g.status}\n`;
          });
          output += '\n';
        }

        if (result.longTermGoals?.length) {
          output += 'LONG-TERM GOALS\n';
          result.longTermGoals.forEach(g => {
            output += `  - ${g.name}: ${g.description}\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-decision-history',
      name: 'Get Decision History',
      description: 'Get recent decisions made by an agent with reasoning',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'limit', type: 'number', required: false, default: 10, description: 'Number of decisions' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/decisions' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          decisions?: Array<{
            tick: number;
            behavior: string;
            reason: string;
            alternatives?: string[];
            confidence: number;
          }>;
        };

        let output = `DECISION HISTORY: ${result.agentName ?? 'Unknown'}\n\n`;

        if (result.decisions?.length) {
          result.decisions.forEach(d => {
            output += `Tick ${d.tick}: ${d.behavior}\n`;
            output += `  Reason: ${d.reason}\n`;
            output += `  Confidence: ${(d.confidence * 100).toFixed(0)}%\n`;
            if (d.alternatives?.length) {
              output += `  Alternatives: ${d.alternatives.join(', ')}\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No decision history found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-knowledge-graph',
      name: 'Get Knowledge Graph',
      description: 'Get the agent\'s knowledge graph (who/what they know about)',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/knowledge' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          knownAgents?: Array<{ id: string; name: string; lastSeen: number }>;
          knownLocations?: Array<{ name: string; type: string; x: number; y: number }>;
          knownFacts?: number;
        };

        let output = `KNOWLEDGE: ${result.agentName ?? 'Unknown'}\n\n`;

        output += `Known Facts: ${result.knownFacts ?? 0}\n\n`;

        if (result.knownAgents?.length) {
          output += 'KNOWN AGENTS\n';
          result.knownAgents.forEach(a => {
            output += `  ${a.name} (last seen: tick ${a.lastSeen})\n`;
          });
          output += '\n';
        }

        if (result.knownLocations?.length) {
          output += 'KNOWN LOCATIONS\n';
          result.knownLocations.forEach(l => {
            output += `  ${l.name} [${l.type}] at (${l.x}, ${l.y})\n`;
          });
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'inject-memory',
      name: 'Inject Memory',
      description: 'Add a memory to an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        {
          name: 'type', type: 'select', required: true,
          options: MEMORY_TYPE_OPTIONS,
          description: 'Memory type',
        },
        { name: 'content', type: 'string', required: true, description: 'Memory content' },
        { name: 'importance', type: 'number', required: false, default: 0.5, description: 'Importance (0-1)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Injected ${params.type} memory for ${params.agentId}` };
      },
    }),

    defineAction({
      id: 'set-belief',
      name: 'Set Belief',
      description: 'Set or modify an agent\'s belief',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        {
          name: 'category', type: 'select', required: true,
          options: BELIEF_CATEGORY_OPTIONS,
          description: 'Belief category',
        },
        { name: 'subject', type: 'string', required: true, description: 'Subject of belief' },
        { name: 'belief', type: 'string', required: true, description: 'Belief content' },
        { name: 'confidence', type: 'number', required: false, default: 0.8, description: 'Confidence (0-1)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set belief about ${params.subject} for ${params.agentId}` };
      },
    }),

    defineAction({
      id: 'add-goal',
      name: 'Add Goal',
      description: 'Add a goal to an agent\'s goal stack',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'goal', type: 'string', required: true, description: 'Goal description' },
        {
          name: 'priority', type: 'select', required: true,
          options: GOAL_PRIORITY_OPTIONS,
          description: 'Goal priority',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Added ${params.priority} goal for ${params.agentId}: ${params.goal}` };
      },
    }),

    defineAction({
      id: 'clear-goal',
      name: 'Clear Goal',
      description: 'Remove a goal from an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'goalId', type: 'string', required: false, description: 'Specific goal ID (or clears active)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Cleared goal for ${params.agentId}` };
      },
    }),

    defineAction({
      id: 'set-mood',
      name: 'Set Mood',
      description: 'Set an agent\'s emotional state',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        {
          name: 'emotion', type: 'select', required: true,
          options: EMOTION_OPTIONS,
          description: 'Emotion to set',
        },
        { name: 'intensity', type: 'number', required: false, default: 0.7, description: 'Intensity (0-1)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set ${params.agentId} mood to ${params.emotion}` };
      },
    }),

    defineAction({
      id: 'forget-memory',
      name: 'Forget Memory',
      description: 'Remove a specific memory from an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'memoryId', type: 'string', required: true, description: 'Memory ID to remove' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Removed memory ${params.memoryId} from ${params.agentId}` };
      },
    }),

    defineAction({
      id: 'force-decision',
      name: 'Force Decision',
      description: 'Force an agent to make a specific behavior decision',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'behavior', type: 'string', required: true, description: 'Behavior to execute (e.g., wander, gather, build)' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for the decision' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Forced ${params.agentId} to ${params.behavior}` };
      },
    }),

    defineAction({
      id: 'share-knowledge',
      name: 'Share Knowledge',
      description: 'Transfer knowledge from one agent to another',
      params: [
        { name: 'fromAgentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Source agent' },
        { name: 'toAgentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Target agent' },
        { name: 'topic', type: 'string', required: false, description: 'Specific topic to share (or all)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Shared knowledge from ${params.fromAgentId} to ${params.toAgentId}` };
      },
    }),
  ],
});

capabilityRegistry.register(cognitionCapability);
