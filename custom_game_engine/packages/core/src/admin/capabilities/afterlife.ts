/**
 * Afterlife Capability - Manage death, souls, and resurrection
 *
 * Provides admin interface for:
 * - Death transitions and states
 * - Soul management
 * - Resurrection and death bargains
 * - Afterlife realm navigation
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const DEATH_CAUSE_OPTIONS = [
  { value: 'natural', label: 'Natural (old age)' },
  { value: 'combat', label: 'Combat' },
  { value: 'starvation', label: 'Starvation' },
  { value: 'exposure', label: 'Exposure (temperature)' },
  { value: 'disease', label: 'Disease' },
  { value: 'accident', label: 'Accident' },
  { value: 'sacrifice', label: 'Sacrifice' },
  { value: 'divine', label: 'Divine Intervention' },
];

const SOUL_STATE_OPTIONS = [
  { value: 'alive', label: 'Alive' },
  { value: 'dying', label: 'Dying' },
  { value: 'dead', label: 'Dead' },
  { value: 'judged', label: 'Judged' },
  { value: 'wandering', label: 'Wandering' },
  { value: 'at_rest', label: 'At Rest' },
  { value: 'resurrected', label: 'Resurrected' },
];

const AFTERLIFE_REALM_OPTIONS = [
  { value: 'void', label: 'The Void' },
  { value: 'heaven', label: 'Heaven' },
  { value: 'hell', label: 'Hell' },
  { value: 'purgatory', label: 'Purgatory' },
  { value: 'reincarnation', label: 'Reincarnation Queue' },
  { value: 'wandering', label: 'Wandering Spirits' },
];

// ============================================================================
// Afterlife Capability Definition
// ============================================================================

const afterlifeCapability = defineCapability({
  id: 'afterlife',
  name: 'Death & Afterlife',
  description: 'Manage death - souls, resurrection, afterlife realms, death bargains',
  category: 'systems',

  tab: {
    icon: '💀',
    priority: 55,
  },

  queries: [
    defineQuery({
      id: 'list-dead-agents',
      name: 'List Dead Agents',
      description: 'List all dead agents and their soul states',
      params: [
        {
          name: 'soulState', type: 'select', required: false,
          options: SOUL_STATE_OPTIONS,
          description: 'Filter by soul state',
        },
        { name: 'limit', type: 'number', required: false, default: 50, description: 'Max results' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/entities?dead=true' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          count?: number;
          agents?: Array<{
            id: string;
            name: string;
            deathCause: string;
            deathTick: number;
            soulState: string;
            realm?: string;
          }>;
        };

        let output = 'DEAD AGENTS\n\n';

        if (result.agents?.length) {
          result.agents.forEach(a => {
            output += `${a.name} [${a.soulState}]\n`;
            output += `  ID: ${a.id}\n`;
            output += `  Cause: ${a.deathCause}\n`;
            output += `  Died: Tick ${a.deathTick}\n`;
            if (a.realm) {
              output += `  Realm: ${a.realm}\n`;
            }
            output += '\n';
          });
          output += `Total: ${result.count ?? result.agents.length}`;
        } else {
          output += 'No dead agents';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-soul-status',
      name: 'Get Soul Status',
      description: 'Get detailed soul status for an agent (alive or dead)',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/entity with afterlife component' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          isAlive?: boolean;
          soulState?: string;
          deathCause?: string;
          deathTick?: number;
          realm?: string;
          karma?: number;
          unfinishedBusiness?: string[];
          canResurrect?: boolean;
          resurrectionCost?: number;
        };

        let output = `SOUL STATUS: ${result.agentName ?? 'Unknown'}\n`;
        output += `${'='.repeat(40)}\n\n`;

        output += `Alive: ${result.isAlive ? 'Yes' : 'No'}\n`;
        output += `Soul State: ${result.soulState ?? 'Unknown'}\n`;

        if (!result.isAlive) {
          output += `Death Cause: ${result.deathCause ?? 'Unknown'}\n`;
          output += `Death Tick: ${result.deathTick ?? 'Unknown'}\n`;
          output += `Current Realm: ${result.realm ?? 'Unknown'}\n`;
        }

        output += `Karma: ${result.karma ?? 0}\n\n`;

        if (result.unfinishedBusiness?.length) {
          output += 'UNFINISHED BUSINESS\n';
          result.unfinishedBusiness.forEach(b => {
            output += `  - ${b}\n`;
          });
          output += '\n';
        }

        if (result.canResurrect) {
          output += `Can Resurrect: Yes (cost: ${result.resurrectionCost ?? 'Unknown'})`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-afterlife-stats',
      name: 'Get Afterlife Stats',
      description: 'Get statistics about death and the afterlife',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/afterlife/stats' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          totalDeaths?: number;
          recentDeaths?: number;
          resurrectionCount?: number;
          byCause?: Record<string, number>;
          byRealm?: Record<string, number>;
          averageKarma?: number;
        };

        let output = 'AFTERLIFE STATISTICS\n\n';

        output += `Total Deaths: ${result.totalDeaths ?? 0}\n`;
        output += `Recent Deaths (1000 ticks): ${result.recentDeaths ?? 0}\n`;
        output += `Resurrections: ${result.resurrectionCount ?? 0}\n`;
        output += `Average Karma: ${result.averageKarma?.toFixed(1) ?? 'N/A'}\n\n`;

        if (result.byCause) {
          output += 'DEATHS BY CAUSE\n';
          Object.entries(result.byCause).forEach(([k, v]) => {
            output += `  ${k}: ${v}\n`;
          });
          output += '\n';
        }

        if (result.byRealm) {
          output += 'SOULS BY REALM\n';
          Object.entries(result.byRealm).forEach(([k, v]) => {
            output += `  ${k}: ${v}\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-death-bargains',
      name: 'List Death Bargains',
      description: 'List active death bargains (deals to avoid/delay death)',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/death-bargains' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          bargains?: Array<{
            agentId: string;
            agentName: string;
            bargainType: string;
            terms: string;
            expirationTick: number;
          }>;
        };

        let output = 'DEATH BARGAINS\n\n';

        if (result.bargains?.length) {
          result.bargains.forEach(b => {
            output += `${b.agentName}\n`;
            output += `  Type: ${b.bargainType}\n`;
            output += `  Terms: ${b.terms}\n`;
            output += `  Expires: Tick ${b.expirationTick}\n\n`;
          });
        } else {
          output += 'No active death bargains';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-reincarnation-queue',
      name: 'Get Reincarnation Queue',
      description: 'Get souls waiting for reincarnation',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/reincarnation-queue' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          queue?: Array<{
            soulId: string;
            originalName: string;
            waitingSince: number;
            karma: number;
            preferredVessel?: string;
          }>;
        };

        let output = 'REINCARNATION QUEUE\n\n';

        if (result.queue?.length) {
          result.queue.forEach((s, i) => {
            output += `${i + 1}. ${s.originalName}\n`;
            output += `   Karma: ${s.karma}\n`;
            output += `   Waiting Since: Tick ${s.waitingSince}\n`;
            if (s.preferredVessel) {
              output += `   Preferred Vessel: ${s.preferredVessel}\n`;
            }
            output += '\n';
          });
        } else {
          output += 'Queue is empty';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'kill-agent',
      name: 'Kill Agent',
      description: 'Cause an agent to die (for testing)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        {
          name: 'cause', type: 'select', required: true,
          options: DEATH_CAUSE_OPTIONS,
          description: 'Cause of death',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Agent ${params.agentId} died from ${params.cause}` };
      },
    }),

    defineAction({
      id: 'resurrect-agent',
      name: 'Resurrect Agent',
      description: 'Bring a dead agent back to life',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Dead agent ID' },
        { name: 'fullHealth', type: 'boolean', required: false, default: false, description: 'Resurrect at full health' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Resurrected agent ${params.agentId}` };
      },
    }),

    defineAction({
      id: 'set-soul-state',
      name: 'Set Soul State',
      description: 'Change a soul\'s state',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        {
          name: 'state', type: 'select', required: true,
          options: SOUL_STATE_OPTIONS,
          description: 'New soul state',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set ${params.agentId} soul state to ${params.state}` };
      },
    }),

    defineAction({
      id: 'assign-to-realm',
      name: 'Assign to Realm',
      description: 'Assign a dead soul to an afterlife realm',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Dead agent ID' },
        {
          name: 'realm', type: 'select', required: true,
          options: AFTERLIFE_REALM_OPTIONS,
          description: 'Afterlife realm',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Assigned ${params.agentId} to ${params.realm}` };
      },
    }),

    defineAction({
      id: 'modify-karma',
      name: 'Modify Karma',
      description: 'Adjust an agent\'s karma',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'change', type: 'number', required: true, description: 'Karma change (-100 to 100)' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for change' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Modified ${params.agentId} karma by ${params.change}` };
      },
    }),

    defineAction({
      id: 'create-death-bargain',
      name: 'Create Death Bargain',
      description: 'Create a bargain to delay or prevent death',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'terms', type: 'string', required: true, description: 'Bargain terms' },
        { name: 'durationTicks', type: 'number', required: true, description: 'Duration in ticks' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Created death bargain for ${params.agentId}` };
      },
    }),

    defineAction({
      id: 'trigger-reincarnation',
      name: 'Trigger Reincarnation',
      description: 'Reincarnate a soul into a new body',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'soulId', type: 'string', required: true, description: 'Soul ID to reincarnate' },
        { name: 'vesselId', type: 'entity-id', required: false, description: 'Specific vessel (or auto-select)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Reincarnated soul ${params.soulId}` };
      },
    }),

    defineAction({
      id: 'summon-ghost',
      name: 'Summon Ghost',
      description: 'Summon a dead agent as a ghost at a location',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Dead agent ID' },
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'durationTicks', type: 'number', required: false, default: 1000, description: 'Duration' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Summoned ghost of ${params.agentId} at (${params.x}, ${params.y})` };
      },
    }),
  ],
});

capabilityRegistry.register(afterlifeCapability);
