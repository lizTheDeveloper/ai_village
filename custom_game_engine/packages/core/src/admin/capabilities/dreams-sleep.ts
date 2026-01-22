/**
 * Dreams & Sleep Capability - Peer into the realm of agent dreams and influence sleep
 *
 * MYSTICAL POWER: The angel can see into dreams, send visions, and influence rest.
 * This is deeply intimate - dreams are where memories consolidate, fears surface,
 * and the subconscious speaks.
 *
 * Framing:
 * - Dreams = "the realm where memories dance"
 * - Sleep quality = "the depth of rest and restoration"
 * - Nightmares = "troubled visions that haunt the night"
 * - Visions = "prophetic messages sent from above"
 * - Sleep drive = "the weight of weariness"
 *
 * This capability lets the angel:
 * - Witness the private dreams of sleeping agents
 * - Send prophetic visions to guide or warn
 * - Soothe nightmares and grant restful sleep
 * - Gently wake or induce sleep when needed
 * - Connect dreamers in shared visions
 * - Plant subtle ideas that surface in dreams
 *
 * Provides admin interface for:
 * - Viewing current dreams and dream history
 * - Analyzing sleep patterns and quality
 * - Finding agents with shared dream content
 * - Identifying nightmare-afflicted agents
 * - Sending visions and influencing dreams
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const VISION_TYPE_OPTIONS = [
  { value: 'prophetic', label: 'Prophetic (future warning)' },
  { value: 'guidance', label: 'Guidance (gentle direction)' },
  { value: 'memory', label: 'Memory (recall the past)' },
  { value: 'mystical', label: 'Mystical (surreal experience)' },
  { value: 'nightmare', label: 'Nightmare (warning/fear)' },
  { value: 'comfort', label: 'Comfort (peace and safety)' },
];

const SLEEP_QUALITY_OPTIONS = [
  { value: 'poor', label: 'Poor (< 0.3)' },
  { value: 'fair', label: 'Fair (0.3-0.5)' },
  { value: 'good', label: 'Good (0.5-0.7)' },
  { value: 'excellent', label: 'Excellent (> 0.7)' },
];

// ============================================================================
// Dreams & Sleep Capability Definition
// ============================================================================

const dreamsSleepCapability = defineCapability({
  id: 'dreams-sleep',
  name: 'Dreams & Sleep',
  description: 'Peer into dreams, witness sleep patterns, and send visions to sleeping souls',
  category: 'systems',

  tab: {
    icon: '💤',
    priority: 6,
  },

  queries: [
    defineQuery({
      id: 'view-dream',
      name: 'View Current Dream',
      description: 'See what an agent is currently dreaming about (if sleeping)',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to observe' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/dreams/current-dream' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          isSleeping?: boolean;
          currentDream?: {
            memoryElements: string[];
            weirdElement: string;
            dreamNarrative: string;
            interpretation: string;
          };
          sleepDuration?: number;
          sleepQuality?: number;
        };

        let output = `DREAM OBSERVATION: ${result.agentName ?? 'Unknown'}\n`;
        output += `${'='.repeat(50)}\n\n`;

        if (!result.isSleeping) {
          output += 'This soul is awake - no dreams to witness.\n';
          output += 'Dreams only visit during sleep.';
          return output;
        }

        output += `Sleep Duration: ${result.sleepDuration?.toFixed(1) ?? 0} hours\n`;
        output += `Sleep Quality: ${((result.sleepQuality ?? 0) * 100).toFixed(0)}%\n\n`;

        if (result.currentDream) {
          const dream = result.currentDream;
          output += `DREAM NARRATIVE:\n`;
          output += `${dream.dreamNarrative}\n\n`;

          output += `SURREAL ELEMENT:\n`;
          output += `"${dream.weirdElement}"\n\n`;

          if (dream.memoryElements.length > 0) {
            output += `MEMORY FRAGMENTS:\n`;
            dream.memoryElements.forEach(mem => {
              output += `  • ${mem}\n`;
            });
            output += '\n';
          }

          if (dream.interpretation) {
            output += `DREAMER'S INTERPRETATION:\n`;
            output += `"${dream.interpretation}"`;
          }
        } else {
          output += 'This soul sleeps deeply, but no dream has yet formed.\n';
          output += 'Dreams emerge after the first hours of rest.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-sleep-patterns',
      name: 'View Sleep Patterns',
      description: 'See sleep schedules and quality across all agents',
      params: [
        {
          name: 'filterQuality',
          type: 'select',
          required: false,
          options: SLEEP_QUALITY_OPTIONS,
          description: 'Filter by sleep quality'
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/dreams/sleep-patterns' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          totalAgents?: number;
          sleeping?: number;
          awake?: number;
          patterns?: Array<{
            agentId: string;
            agentName: string;
            isSleeping: boolean;
            sleepDrive: number;
            sleepQuality: number;
            preferredSleepTime: number;
            energy: number;
          }>;
        };

        let output = 'SLEEP PATTERNS ACROSS THE REALM\n';
        output += `${'='.repeat(50)}\n\n`;

        output += `Total Souls: ${result.totalAgents ?? 0}\n`;
        output += `Currently Sleeping: ${result.sleeping ?? 0}\n`;
        output += `Currently Awake: ${result.awake ?? 0}\n\n`;

        if (result.patterns && result.patterns.length > 0) {
          output += 'INDIVIDUAL PATTERNS:\n';
          output += `${'─'.repeat(50)}\n`;

          result.patterns.forEach(p => {
            output += `${p.agentName} ${p.isSleeping ? '💤' : '👁️'}\n`;
            output += `  Sleep Drive: ${p.sleepDrive.toFixed(0)}/100`;
            if (p.sleepDrive > 80) {
              output += ` (exhausted)`;
            } else if (p.sleepDrive > 60) {
              output += ` (tired)`;
            }
            output += '\n';
            output += `  Energy: ${(p.energy * 100).toFixed(0)}%\n`;

            if (p.isSleeping) {
              output += `  Sleep Quality: ${(p.sleepQuality * 100).toFixed(0)}%\n`;
            } else {
              const hour = p.preferredSleepTime;
              output += `  Preferred Sleep: ${hour.toFixed(0)}:00\n`;
            }
            output += '\n';
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-dream-history',
      name: 'Get Dream History',
      description: 'View past dreams for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to examine' },
        { name: 'limit', type: 'number', required: false, default: 5, description: 'Number of dreams to retrieve' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/dreams/history' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          dreams?: Array<{
            tick: number;
            date: string;
            dreamNarrative: string;
            weirdElement: string;
            interpretation: string;
          }>;
        };

        let output = `DREAM HISTORY: ${result.agentName ?? 'Unknown'}\n`;
        output += `${'='.repeat(50)}\n\n`;

        if (!result.dreams || result.dreams.length === 0) {
          output += 'No dreams recorded for this soul.\n';
          output += 'Dreams are remembered only when significant.';
          return output;
        }

        result.dreams.forEach((dream, idx) => {
          output += `DREAM ${idx + 1} - ${dream.date}\n`;
          output += `${'─'.repeat(50)}\n`;
          output += `${dream.dreamNarrative}\n\n`;
          output += `Surreal: "${dream.weirdElement}"\n`;
          if (dream.interpretation) {
            output += `Meaning: "${dream.interpretation}"\n`;
          }
          output += '\n';
        });

        return output;
      },
    }),

    defineQuery({
      id: 'find-shared-dreams',
      name: 'Find Shared Dreams',
      description: 'Find agents who dreamed similar things - mystical connection',
      params: [
        { name: 'keyword', type: 'string', required: true, description: 'Word or concept to search for' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/dreams/shared-dreams' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          keyword?: string;
          matches?: Array<{
            agentId: string;
            agentName: string;
            dreamNarrative: string;
            date: string;
            relevance: number;
          }>;
        };

        let output = `SHARED DREAMS: "${result.keyword ?? ''}"\n`;
        output += `${'='.repeat(50)}\n\n`;

        if (!result.matches || result.matches.length === 0) {
          output += 'No shared dreams found.\n';
          output += 'The dreamscape does not echo with this concept.';
          return output;
        }

        output += `Found ${result.matches.length} souls who dreamed of this:\n\n`;

        result.matches.forEach(match => {
          output += `${match.agentName} - ${match.date}\n`;
          output += `  Relevance: ${(match.relevance * 100).toFixed(0)}%\n`;
          output += `  "${match.dreamNarrative}"\n\n`;
        });

        return output;
      },
    }),

    defineQuery({
      id: 'view-nightmare-afflicted',
      name: 'View Nightmare Afflicted',
      description: 'See agents troubled by nightmares or poor sleep',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/dreams/nightmare-afflicted' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          afflicted?: Array<{
            agentId: string;
            agentName: string;
            sleepQuality: number;
            sleepDrive: number;
            energy: number;
            nightmareCount?: number;
            lastNightmare?: string;
          }>;
        };

        let output = 'NIGHTMARE AFFLICTED SOULS\n';
        output += `${'='.repeat(50)}\n\n`;

        if (!result.afflicted || result.afflicted.length === 0) {
          output += 'All souls rest peacefully.\n';
          output += 'No nightmares trouble the sleeping.';
          return output;
        }

        output += `${result.afflicted.length} souls suffer from troubled sleep:\n\n`;

        result.afflicted.forEach(soul => {
          output += `${soul.agentName}\n`;
          output += `  Sleep Quality: ${(soul.sleepQuality * 100).toFixed(0)}% (poor)\n`;
          output += `  Energy: ${(soul.energy * 100).toFixed(0)}%\n`;
          output += `  Sleep Drive: ${soul.sleepDrive.toFixed(0)}/100\n`;

          if (soul.nightmareCount) {
            output += `  Recent Nightmares: ${soul.nightmareCount}\n`;
          }

          if (soul.lastNightmare) {
            output += `  Last Nightmare: "${soul.lastNightmare}"\n`;
          }

          output += '\n';
        });

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'send-vision',
      name: 'Send Vision',
      description: 'Send a prophetic dream/vision to a sleeping agent',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to receive vision' },
        {
          name: 'visionType',
          type: 'select',
          required: true,
          options: VISION_TYPE_OPTIONS,
          description: 'Type of vision'
        },
        { name: 'message', type: 'string', required: true, description: 'The vision content/message' },
        { name: 'symbolic', type: 'boolean', required: false, default: true, description: 'Make it symbolic/metaphorical?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `Vision sent to ${params.agentId}. When they sleep, they will receive: "${params.message}"`
        };
      },
    }),

    defineAction({
      id: 'soothe-nightmares',
      name: 'Soothe Nightmares',
      description: 'Calm an agent\'s troubled sleep and banish nightmares',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to soothe' },
        { name: 'duration', type: 'number', required: false, default: 24, description: 'Protection duration (game hours)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.agentId} is soothed. Their sleep will be peaceful for ${params.duration} hours.`
        };
      },
    }),

    defineAction({
      id: 'induce-sleep',
      name: 'Induce Sleep',
      description: 'Gently encourage an agent to feel sleepy (increases sleep drive)',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to make sleepy' },
        { name: 'intensity', type: 'number', required: false, default: 30, description: 'Sleep drive increase (0-50)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        // Validate intensity
        const intensity = Math.min(50, Math.max(0, typeof params.intensity === 'number' ? params.intensity : 30));

        return {
          success: true,
          message: `${params.agentId} feels a gentle wave of sleepiness (+${intensity} sleep drive). They may seek rest soon.`
        };
      },
    }),

    defineAction({
      id: 'wake-agent',
      name: 'Wake Agent',
      description: 'Gently wake a sleeping agent (DANGEROUS - disrupts rest)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to wake' },
        { name: 'gentle', type: 'boolean', required: false, default: true, description: 'Wake gently (reduces energy penalty)' },
        { name: 'reason', type: 'string', required: false, description: 'Why are you waking them?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        const method = params.gentle ? 'gently stirred' : 'abruptly awakened';
        let message = `${params.agentId} has been ${method} from sleep.`;

        if (!params.gentle) {
          message += ' They may feel groggy and disoriented.';
        }

        if (params.reason) {
          message += ` Reason: ${params.reason}`;
        }

        return { success: true, message };
      },
    }),

    defineAction({
      id: 'share-dream',
      name: 'Share Dream',
      description: 'Connect two sleeping agents\' dreams - mystical dream sharing',
      dangerous: true,
      params: [
        { name: 'agentId1', type: 'entity-id', required: true, entityType: 'agent', description: 'First dreamer' },
        { name: 'agentId2', type: 'entity-id', required: true, entityType: 'agent', description: 'Second dreamer' },
        { name: 'theme', type: 'string', required: false, description: 'Optional dream theme/content' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        let message = `${params.agentId1} and ${params.agentId2} now share a dream connection.`;

        if (params.theme) {
          message += ` Their dreams will intertwine around: "${params.theme}"`;
        } else {
          message += ' Their dreams will blend and echo each other.';
        }

        message += ' When both are asleep, they will experience a shared vision.';

        return { success: true, message };
      },
    }),

    defineAction({
      id: 'plant-memory-seed',
      name: 'Plant Memory Seed',
      description: 'Plant a subtle idea that may surface in dreams and influence thoughts',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to influence' },
        { name: 'concept', type: 'string', required: true, description: 'The idea/concept to plant' },
        { name: 'subtlety', type: 'number', required: false, default: 7, description: 'How subtle (1-10, 10=most subtle)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        const subtlety = Math.min(10, Math.max(1, typeof params.subtlety === 'number' ? params.subtlety : 7));

        let message = `Memory seed planted in ${params.agentId}: "${params.concept}"`;

        if (subtlety > 7) {
          message += '\n\nThe idea will emerge slowly, like a half-remembered dream.';
        } else if (subtlety > 4) {
          message += '\n\nThe concept will surface during quiet moments and dreams.';
        } else {
          message += '\n\nThe thought will appear clearly in their next dream.';
        }

        message += ' They may not know where it came from.';

        return { success: true, message };
      },
    }),

    defineAction({
      id: 'improve-sleep-location',
      name: 'Bless Sleep Location',
      description: 'Improve sleep quality for a specific location (bed/building)',
      params: [
        { name: 'locationId', type: 'entity-id', required: true, description: 'Bed or building to bless' },
        { name: 'bonus', type: 'number', required: false, default: 0.2, description: 'Sleep quality bonus (0.1-0.4)' },
        { name: 'duration', type: 'number', required: false, default: 168, description: 'Duration (game hours, default=1 week)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        const bonus = Math.min(0.4, Math.max(0.1, typeof params.bonus === 'number' ? params.bonus : 0.2));
        const bonusPercent = (bonus * 100).toFixed(0);

        return {
          success: true,
          message: `Sleep location ${params.locationId} blessed with +${bonusPercent}% sleep quality for ${params.duration} hours. All who rest here will sleep more deeply.`
        };
      },
    }),
  ],
});

capabilityRegistry.register(dreamsSleepCapability);
