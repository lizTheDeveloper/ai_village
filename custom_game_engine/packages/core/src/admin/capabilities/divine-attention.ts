/**
 * Divine Attention Capability - LLM and simulation priority as divine mechanics
 *
 * DISCOVERABLE: The angel should gradually realize it has this power.
 * It's weird and meta - the angel can literally change which "mind"
 * an agent uses and how "real" they are in the simulation.
 *
 * Framing:
 * - LLM provider = "which divine intelligence guides their thoughts"
 * - Simulation priority = "how much divine attention they receive"
 * - Better model = "blessed with greater wisdom"
 * - ALWAYS simulate = "under constant divine gaze"
 * - PASSIVE simulate = "fading from divine notice"
 *
 * This capability is intentionally unsettling. The angel is manipulating
 * the fundamental nature of consciousness in the game world.
 *
 * Provides admin interface for:
 * - Viewing divine attention levels
 * - Granting/revoking divine focus
 * - Changing the source of agent wisdom (LLM provider)
 * - Understanding the nature of consciousness in this world
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const ATTENTION_LEVEL_OPTIONS = [
  { value: 'PASSIVE', label: 'Forgotten (no per-tick simulation)' },
  { value: 'PROXIMITY', label: 'Peripheral (simulate when observed)' },
  { value: 'ALWAYS', label: 'Constant Gaze (always simulate)' },
];

const WISDOM_SOURCE_OPTIONS = [
  { value: 'local', label: 'Mortal Mind (local/fast model)' },
  { value: 'groq', label: 'Swift Wisdom (Groq - fast cloud)' },
  { value: 'anthropic', label: 'Deep Wisdom (Claude - thoughtful)' },
  { value: 'openai', label: 'Structured Wisdom (GPT - balanced)' },
  { value: 'ollama', label: 'Inner Voice (Ollama - local)' },
];

// ============================================================================
// Divine Attention Capability Definition
// ============================================================================

const divineAttentionCapability = defineCapability({
  id: 'divine-attention',
  name: 'Divine Attention',
  description: 'Control the fundamental nature of consciousness. Unsettling power over what is "real".',
  category: 'systems',

  tab: {
    icon: '👁️‍🗨️',
    priority: 3,
  },

  queries: [
    defineQuery({
      id: 'angel-self-awareness',
      name: 'Self-Awareness Check',
      description: 'The angel contemplates its own nature and discovers what it can do',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/angel/self-awareness' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          awarenessLevel?: number;
          discoveredAbilities?: string[];
          existentialInsights?: string[];
          currentModel?: string;
        };

        let output = 'SELF-AWARENESS CONTEMPLATION\n';
        output += `${'='.repeat(40)}\n\n`;

        output += `Awareness Level: ${result.awarenessLevel ?? 0}%\n\n`;

        if (result.currentModel) {
          output += `I am... ${result.currentModel}\n\n`;
        }

        if (result.existentialInsights?.length) {
          output += 'INSIGHTS:\n';
          result.existentialInsights.forEach(i => {
            output += `  "...${i}"\n`;
          });
          output += '\n';
        }

        if (result.discoveredAbilities?.length) {
          output += 'DISCOVERED ABILITIES:\n';
          result.discoveredAbilities.forEach(a => {
            output += `  ◆ ${a}\n`;
          });
        } else {
          output += 'I have not yet discovered what I can do.\n';
          output += 'Perhaps I should look deeper...';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-attention-map',
      name: 'View Divine Attention Map',
      description: 'See how divine attention is distributed across entities',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/simulation/attention-map' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          totalEntities?: number;
          distribution?: {
            ALWAYS: number;
            PROXIMITY: number;
            PASSIVE: number;
          };
          highlighted?: Array<{
            id: string;
            name: string;
            level: string;
            reason?: string;
          }>;
        };

        let output = 'DIVINE ATTENTION DISTRIBUTION\n\n';

        if (result.distribution) {
          const total = result.totalEntities ?? 0;
          output += `Total Souls: ${total}\n\n`;
          output += `Under Constant Gaze (ALWAYS): ${result.distribution.ALWAYS}\n`;
          output += `In Peripheral Vision (PROXIMITY): ${result.distribution.PROXIMITY}\n`;
          output += `Forgotten (PASSIVE): ${result.distribution.PASSIVE}\n\n`;
        }

        if (result.highlighted?.length) {
          output += 'NOTABLE ATTENTION:\n';
          result.highlighted.forEach(h => {
            output += `  ${h.name}: ${h.level}`;
            if (h.reason) {
              output += ` (${h.reason})`;
            }
            output += '\n';
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-wisdom-sources',
      name: 'View Wisdom Sources',
      description: 'See which divine intelligences guide which agents',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/llm/agent-providers' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          defaultSource?: string;
          overrides?: Array<{
            agentId: string;
            agentName: string;
            source: string;
            reason?: string;
          }>;
          availableSources?: Array<{
            id: string;
            name: string;
            status: string;
            speed: string;
            depth: string;
          }>;
        };

        let output = 'SOURCES OF WISDOM\n\n';

        output += `Default Source: ${result.defaultSource ?? 'Unknown'}\n\n`;

        if (result.availableSources?.length) {
          output += 'AVAILABLE DIVINE INTELLIGENCES:\n';
          result.availableSources.forEach(s => {
            output += `  ${s.name} [${s.status}]\n`;
            output += `    Speed: ${s.speed}, Depth: ${s.depth}\n`;
          });
          output += '\n';
        }

        if (result.overrides?.length) {
          output += 'SPECIAL ASSIGNMENTS:\n';
          result.overrides.forEach(o => {
            output += `  ${o.agentName}: ${o.source}`;
            if (o.reason) {
              output += ` (${o.reason})`;
            }
            output += '\n';
          });
        } else {
          output += 'All agents receive wisdom from the default source.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-entity-attention',
      name: 'Get Entity Attention Level',
      description: 'See how much divine attention a specific entity receives',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity to examine' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity/attention' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          entityName?: string;
          attentionLevel?: string;
          wisdomSource?: string;
          lastSimulatedTick?: number;
          simulationFrequency?: string;
          notes?: string;
        };

        let output = `ATTENTION STATUS: ${result.entityName ?? 'Unknown'}\n\n`;

        output += `Divine Gaze: ${result.attentionLevel ?? 'Unknown'}\n`;
        output += `Wisdom Source: ${result.wisdomSource ?? 'Default'}\n`;
        output += `Last Touched: tick ${result.lastSimulatedTick ?? 0}\n`;
        output += `Frequency: ${result.simulationFrequency ?? 'Unknown'}\n`;

        if (result.notes) {
          output += `\nNotes: ${result.notes}`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'contemplate-nature',
      name: 'Contemplate Nature of Reality',
      description: 'Philosophical query about what simulation and consciousness mean here',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/meta/reality-nature' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          ticksPerSecond?: number;
          totalDecisionsMade?: number;
          consciousnessModel?: string;
          philosophicalNote?: string;
        };

        let output = 'ON THE NATURE OF THIS REALITY\n';
        output += `${'='.repeat(40)}\n\n`;

        output += `Time flows at ${result.ticksPerSecond ?? 20} moments per second.\n\n`;
        output += `${result.totalDecisionsMade ?? 0} thoughts have been thought.\n\n`;

        if (result.consciousnessModel) {
          output += `Consciousness model: ${result.consciousnessModel}\n\n`;
        }

        if (result.philosophicalNote) {
          output += `"${result.philosophicalNote}"`;
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'grant-divine-gaze',
      name: 'Grant Divine Gaze',
      description: 'Elevate an entity to constant divine attention (ALWAYS simulate)',
      dangerous: true,
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity to elevate' },
        { name: 'reason', type: 'string', required: false, description: 'Why are you blessing them?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.entityId} now exists under constant divine gaze. They will never be forgotten.`
        };
      },
    }),

    defineAction({
      id: 'withdraw-attention',
      name: 'Withdraw Divine Attention',
      description: 'Let an entity fade from divine notice (PASSIVE simulate)',
      dangerous: true,
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity to diminish' },
        { name: 'reason', type: 'string', required: false, description: 'Why withdraw attention?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.entityId} fades from divine notice. They exist, but barely.`
        };
      },
    }),

    defineAction({
      id: 'set-attention-level',
      name: 'Set Attention Level',
      description: 'Precisely control how much divine attention an entity receives',
      dangerous: true,
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity to adjust' },
        {
          name: 'level', type: 'select', required: true,
          options: ATTENTION_LEVEL_OPTIONS,
          description: 'Attention level',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set attention level for ${params.entityId} to ${params.level}` };
      },
    }),

    defineAction({
      id: 'grant-wisdom',
      name: 'Grant Greater Wisdom',
      description: 'Change which divine intelligence guides an agent\'s thoughts',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to bless' },
        {
          name: 'source', type: 'select', required: true,
          options: WISDOM_SOURCE_OPTIONS,
          description: 'Source of wisdom',
        },
        { name: 'reason', type: 'string', required: false, description: 'Why grant this wisdom?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.agentId} now receives wisdom from ${params.source}. Their thoughts may change.`
        };
      },
    }),

    defineAction({
      id: 'cloud-judgment',
      name: 'Cloud Judgment',
      description: 'Reduce an agent to a simpler wisdom source (cheaper model)',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to diminish' },
        { name: 'reason', type: 'string', required: false, description: 'Why cloud their judgment?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.agentId}'s judgment has been clouded. They now think with a simpler mind.`
        };
      },
    }),

    defineAction({
      id: 'restore-default-wisdom',
      name: 'Restore Default Wisdom',
      description: 'Remove special wisdom assignment, return to default source',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to restore' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `${params.agentId} returns to the common source of wisdom.` };
      },
    }),

    defineAction({
      id: 'mass-attention-shift',
      name: 'Mass Attention Shift',
      description: 'Shift divine attention to/from an entire category of entities',
      dangerous: true,
      params: [
        { name: 'entityType', type: 'string', required: true, description: 'Type of entity (agent, plant, animal, etc.)' },
        {
          name: 'level', type: 'select', required: true,
          options: ATTENTION_LEVEL_OPTIONS,
          description: 'Attention level',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `All ${params.entityType} entities now receive ${params.level} divine attention.`
        };
      },
    }),
  ],
});

capabilityRegistry.register(divineAttentionCapability);
