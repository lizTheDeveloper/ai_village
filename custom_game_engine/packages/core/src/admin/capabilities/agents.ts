/**
 * Agents Capability - Manage AI agents
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

const SKILL_OPTIONS = [
  { value: 'building', label: 'Building' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'farming', label: 'Farming' },
  { value: 'gathering', label: 'Gathering' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'crafting', label: 'Crafting' },
  { value: 'social', label: 'Social' },
  { value: 'exploration', label: 'Exploration' },
  { value: 'combat', label: 'Combat' },
  { value: 'hunting', label: 'Hunting' },
  { value: 'stealth', label: 'Stealth' },
  { value: 'animal_handling', label: 'Animal Handling' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'research', label: 'Research' },
];

const NEED_OPTIONS = [
  { value: 'hunger', label: 'Hunger' },
  { value: 'energy', label: 'Energy' },
  { value: 'warmth', label: 'Warmth' },
  { value: 'social', label: 'Social' },
  { value: 'safety', label: 'Safety' },
];

const agentsCapability = defineCapability({
  id: 'agents',
  name: 'Agents',
  description: 'Manage AI agents - spawn, modify, query, and control behaviors',
  category: 'entities',

  tab: {
    icon: '🧑',
    priority: 10,
  },

  queries: [
    defineQuery({
      id: 'list-agents',
      name: 'List Agents',
      description: 'List all agents in the current game session',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID (default: active)' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entities' };
      },
      renderResult: (data: unknown) => {
        const agents = (data as { agents?: Array<{ name: string; id: string; x: number; y: number }> })?.agents || [];
        if (agents.length === 0) return 'No agents found';
        return agents.map(a => `${a.name} (${a.id}) at (${a.x}, ${a.y})`).join('\n');
      },
    }),

    defineQuery({
      id: 'get-agent',
      name: 'Get Agent Details',
      description: 'Get detailed information about a specific agent',
      params: [
        { name: 'id', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity' };
      },
    }),

    defineQuery({
      id: 'get-agent-prompt',
      name: 'Get Agent LLM Prompt',
      description: 'Get the current LLM prompt context for an agent',
      params: [
        { name: 'id', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/prompt' };
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'spawn-agent',
      name: 'Spawn Agent',
      description: 'Create a new AI agent at a specific location',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Agent name' },
        { name: 'x', type: 'number', required: true, description: 'X position' },
        { name: 'y', type: 'number', required: true, description: 'Y position' },
        { name: 'useLLM', type: 'boolean', required: false, default: true, description: 'Use LLM for decisions' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/spawn-agent' };
      },
    }),

    defineAction({
      id: 'teleport',
      name: 'Teleport Agent',
      description: 'Move an agent instantly to a new location',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to teleport' },
        { name: 'x', type: 'number', required: true, description: 'Destination X' },
        { name: 'y', type: 'number', required: true, description: 'Destination Y' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/teleport' };
      },
    }),

    defineAction({
      id: 'set-need',
      name: 'Set Agent Need',
      description: 'Modify an agent\'s need level',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Target agent' },
        { name: 'need', type: 'select', required: true, options: NEED_OPTIONS, description: 'Need to modify' },
        { name: 'value', type: 'number', required: true, description: 'Value (0.0 = critical, 1.0 = satisfied)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/set-need' };
      },
    }),

    defineAction({
      id: 'set-skill',
      name: 'Set Agent Skill',
      description: 'Set an agent\'s skill level',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Target agent' },
        { name: 'skill', type: 'select', required: true, options: SKILL_OPTIONS, description: 'Skill to set' },
        { name: 'level', type: 'number', required: true, description: 'Level (0-5)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/set-skill' };
      },
    }),

    defineAction({
      id: 'give-item',
      name: 'Give Item',
      description: 'Give an item to an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Target agent' },
        { name: 'itemType', type: 'string', required: true, description: 'Item type ID' },
        { name: 'amount', type: 'number', required: false, default: 1, description: 'Quantity' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/give-item' };
      },
    }),

    defineAction({
      id: 'trigger-behavior',
      name: 'Trigger Behavior',
      description: 'Force an agent to perform a specific behavior',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Target agent' },
        { name: 'behavior', type: 'string', required: true, description: 'Behavior to trigger' },
        { name: 'target', type: 'entity-id', required: false, description: 'Target entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/trigger-behavior' };
      },
    }),
  ],
});

capabilityRegistry.register(agentsCapability);
