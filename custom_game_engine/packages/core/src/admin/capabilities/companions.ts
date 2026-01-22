/**
 * Companions Capability - Manage companion entities (Ophanim)
 *
 * Provides admin interface for:
 * - Companion bonding and loyalty
 * - Companion evolution and tiers
 * - Companion abilities and emotions
 * - Companion memories and advice
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const COMPANION_TIER_OPTIONS = [
  { value: '0', label: 'Tier 0 - Nascent' },
  { value: '1', label: 'Tier 1 - Awakened' },
  { value: '2', label: 'Tier 2 - Enlightened' },
  { value: '3', label: 'Tier 3 - Transcendent' },
  { value: '4', label: 'Tier 4 - Cosmic' },
  { value: '5', label: 'Tier 5 - Omega' },
];

const COMPANION_EMOTION_OPTIONS = [
  { value: 'curious', label: 'Curious' },
  { value: 'happy', label: 'Happy' },
  { value: 'concerned', label: 'Concerned' },
  { value: 'sad', label: 'Sad' },
  { value: 'proud', label: 'Proud' },
  { value: 'worried', label: 'Worried' },
  { value: 'excited', label: 'Excited' },
  { value: 'neutral', label: 'Neutral' },
];

const COMPANION_NEED_OPTIONS = [
  { value: 'attention', label: 'Attention' },
  { value: 'stimulation', label: 'Mental Stimulation' },
  { value: 'purpose', label: 'Sense of Purpose' },
  { value: 'connection', label: 'Connection' },
];

// ============================================================================
// Companions Capability Definition
// ============================================================================

const companionsCapability = defineCapability({
  id: 'companions',
  name: 'Companions',
  description: 'Manage companion entities - Ophanim bonding, evolution, abilities',
  category: 'systems',

  tab: {
    icon: '👁️',
    priority: 17,
  },

  queries: [
    defineQuery({
      id: 'get-companion-status',
      name: 'Get Companion Status',
      description: 'Get the current companion\'s status',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/companion' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          exists?: boolean;
          name?: string;
          tier?: number;
          tierName?: string;
          emotion?: string;
          needs?: Record<string, number>;
          bonded?: boolean;
          bondStrength?: number;
          evolutionProgress?: number;
          nextMilestone?: string;
        };

        let output = 'COMPANION STATUS\n';
        output += `${'='.repeat(40)}\n\n`;

        if (!result.exists) {
          output += 'No companion exists yet';
          return output;
        }

        output += `Name: ${result.name ?? 'Ophanim'}\n`;
        output += `Tier: ${result.tier ?? 0} (${result.tierName ?? 'Nascent'})\n`;
        output += `Emotion: ${result.emotion ?? 'neutral'}\n`;
        output += `Bonded: ${result.bonded ? 'Yes' : 'No'}\n`;
        if (result.bonded) {
          output += `Bond Strength: ${result.bondStrength ?? 0}%\n`;
        }
        output += `Evolution Progress: ${result.evolutionProgress ?? 0}%\n`;
        if (result.nextMilestone) {
          output += `Next Milestone: ${result.nextMilestone}\n`;
        }
        output += '\n';

        if (result.needs) {
          output += 'NEEDS\n';
          Object.entries(result.needs).forEach(([k, v]) => {
            const bar = '█'.repeat(Math.floor(v / 10)) + '░'.repeat(10 - Math.floor(v / 10));
            output += `  ${k}: [${bar}] ${v}%\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-companion-memories',
      name: 'Get Companion Memories',
      description: 'Get memories the companion has about the player',
      params: [
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Max memories' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/companion/memories' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          playerMemories?: Array<{
            content: string;
            tick: number;
            sentiment: string;
          }>;
          selfMemories?: Array<{
            content: string;
            tick: number;
          }>;
        };

        let output = 'COMPANION MEMORIES\n\n';

        if (result.playerMemories?.length) {
          output += 'ABOUT PLAYER\n';
          result.playerMemories.forEach(m => {
            output += `  [${m.tick}] (${m.sentiment}) ${m.content}\n`;
          });
          output += '\n';
        }

        if (result.selfMemories?.length) {
          output += 'SELF MEMORIES\n';
          result.selfMemories.forEach(m => {
            output += `  [${m.tick}] ${m.content}\n`;
          });
        }

        if (!result.playerMemories?.length && !result.selfMemories?.length) {
          output += 'No memories yet';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-companion-advice',
      name: 'Get Companion Advice',
      description: 'Get advice the companion would give based on current state',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/companion/advice' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          hasAdvice?: boolean;
          category?: string;
          advice?: string;
          urgency?: string;
          context?: string;
        };

        let output = 'COMPANION ADVICE\n\n';

        if (result.hasAdvice) {
          output += `Category: ${result.category ?? 'General'}\n`;
          output += `Urgency: ${result.urgency ?? 'Low'}\n\n`;
          output += `"${result.advice}"\n`;
          if (result.context) {
            output += `\nContext: ${result.context}`;
          }
        } else {
          output += 'No advice at this time';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-milestone-progress',
      name: 'Get Milestone Progress',
      description: 'Get progress toward evolution milestones',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/companion/milestones' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          currentTier?: number;
          milestones?: Array<{
            name: string;
            description: string;
            required: boolean;
            achieved: boolean;
            targetTier: number;
          }>;
        };

        let output = 'EVOLUTION MILESTONES\n';
        output += `Current Tier: ${result.currentTier ?? 0}\n\n`;

        if (result.milestones?.length) {
          result.milestones.forEach(m => {
            const status = m.achieved ? '✓' : '○';
            output += `[${status}] ${m.name} (Tier ${m.targetTier})\n`;
            output += `    ${m.description}\n`;
            if (m.required) {
              output += `    (Required)\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No milestones available';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'spawn-companion',
      name: 'Spawn Companion',
      description: 'Spawn the Ophanim companion if not exists',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: 'Spawned Ophanim companion' };
      },
    }),

    defineAction({
      id: 'set-companion-tier',
      name: 'Set Companion Tier',
      description: 'Set the companion\'s evolution tier (for testing)',
      dangerous: true,
      params: [
        {
          name: 'tier', type: 'select', required: true,
          options: COMPANION_TIER_OPTIONS,
          description: 'Evolution tier',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set companion to tier ${params.tier}` };
      },
    }),

    defineAction({
      id: 'set-companion-emotion',
      name: 'Set Companion Emotion',
      description: 'Set the companion\'s emotional state',
      params: [
        {
          name: 'emotion', type: 'select', required: true,
          options: COMPANION_EMOTION_OPTIONS,
          description: 'Emotion',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set companion emotion to ${params.emotion}` };
      },
    }),

    defineAction({
      id: 'update-companion-need',
      name: 'Update Companion Need',
      description: 'Update a companion need level',
      params: [
        {
          name: 'need', type: 'select', required: true,
          options: COMPANION_NEED_OPTIONS,
          description: 'Need to update',
        },
        { name: 'value', type: 'number', required: true, description: 'New value (0-100)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set companion ${params.need} to ${params.value}` };
      },
    }),

    defineAction({
      id: 'add-companion-memory',
      name: 'Add Companion Memory',
      description: 'Add a memory to the companion',
      params: [
        { name: 'content', type: 'string', required: true, description: 'Memory content' },
        {
          name: 'type', type: 'select', required: true,
          options: [
            { value: 'player', label: 'About Player' },
            { value: 'self', label: 'Self Memory' },
          ],
          description: 'Memory type',
        },
        { name: 'sentiment', type: 'string', required: false, default: 'neutral', description: 'Sentiment' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: 'Added memory to companion' };
      },
    }),

    defineAction({
      id: 'trigger-milestone',
      name: 'Trigger Milestone',
      description: 'Trigger a milestone achievement (for testing)',
      dangerous: true,
      params: [
        {
          name: 'milestone', type: 'select', required: true,
          options: [
            { value: 'first_baby_born', label: 'First Baby Born (→ Tier 1)' },
            { value: 'wisdom_goddess', label: 'Wisdom Goddess Manifested (→ Tier 2)' },
            { value: 'first_dimensional_travel', label: 'First Dimensional Travel (→ Tier 3)' },
            { value: 'second_dimensional_travel', label: 'Second Dimensional Travel (→ Tier 4)' },
            { value: 'universe_created', label: 'Universe Created (→ Tier 5)' },
          ],
          description: 'Milestone to trigger',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Triggered milestone: ${params.milestone}` };
      },
    }),

    defineAction({
      id: 'companion-speak',
      name: 'Companion Speak',
      description: 'Make the companion say something to the player',
      params: [
        { name: 'message', type: 'string', required: true, description: 'Message to say' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Companion says: "${params.message}"` };
      },
    }),
  ],
});

capabilityRegistry.register(companionsCapability);
