/**
 * Fates Advocacy Capability - Angel intercession with the Fates
 *
 * The player cannot directly communicate with the Fates unless they
 * find a way to do so in-game. However, the admin angel CAN speak
 * to the Fates and advocate on the player's behalf.
 *
 * This creates an interesting dynamic where:
 * - Player tells angel what they want
 * - Angel petitions the Fates
 * - Fates may or may not grant the request
 * - Player discovers ways to contact Fates directly (late game)
 *
 * Provides admin interface for:
 * - Petitioning the Fates on player's behalf
 * - Checking petition status
 * - Viewing Fate decisions and rationale
 * - Understanding what the Fates value
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const PETITION_TYPE_OPTIONS = [
  { value: 'mercy', label: 'Plea for Mercy (spare someone)' },
  { value: 'fortune', label: 'Request Fortune (bless someone)' },
  { value: 'guidance', label: 'Seek Guidance (what should I do?)' },
  { value: 'intervention', label: 'Divine Intervention (change fate)' },
  { value: 'knowledge', label: 'Request Knowledge (reveal hidden truth)' },
  { value: 'protection', label: 'Grant Protection (shield from harm)' },
];

const PETITION_URGENCY_OPTIONS = [
  { value: 'humble', label: 'Humble Request (patient)' },
  { value: 'earnest', label: 'Earnest Plea (hopeful)' },
  { value: 'desperate', label: 'Desperate Cry (urgent)' },
];

const OFFERING_TYPE_OPTIONS = [
  { value: 'none', label: 'No Offering' },
  { value: 'prayer', label: 'Sincere Prayer' },
  { value: 'sacrifice', label: 'Sacrifice (resources)' },
  { value: 'devotion', label: 'Promise of Devotion' },
  { value: 'narrative', label: 'Interesting Story (Fates love drama)' },
];

// ============================================================================
// Fates Advocacy Capability Definition
// ============================================================================

const fatesAdvocacyCapability = defineCapability({
  id: 'fates-advocacy',
  name: 'Fates Advocacy',
  description: 'Petition the Fates on behalf of the player. The angel speaks where mortals cannot.',
  category: 'systems',

  tab: {
    icon: '🕯️',
    priority: 8,
  },

  queries: [
    defineQuery({
      id: 'check-player-fates-access',
      name: 'Check Direct Fates Access',
      description: 'Check if player has found a way to speak directly to the Fates',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/player/fates-access' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          canContactDirectly?: boolean;
          method?: string;
          discoveredAt?: number;
          timesContacted?: number;
        };

        let output = 'FATES ACCESS STATUS\n\n';

        if (result.canContactDirectly) {
          output += 'Direct Access: DISCOVERED\n';
          output += `Method: ${result.method ?? 'Unknown ritual'}\n`;
          output += `Times Contacted: ${result.timesContacted ?? 0}\n\n`;
          output += 'You may now petition the Fates directly.';
        } else {
          output += 'Direct Access: NOT YET DISCOVERED\n\n';
          output += 'The Fates do not hear mortal voices easily.\n';
          output += 'I can advocate on your behalf, speaking\n';
          output += 'words you cannot yet utter to ears that\n';
          output += 'do not yet listen for you.\n\n';
          output += 'Perhaps one day you will find the way...';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-pending-petitions',
      name: 'View Pending Petitions',
      description: 'See petitions awaiting the Fates\' response',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/fates/petitions/pending' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          petitions?: Array<{
            id: string;
            type: string;
            subject: string;
            submittedTick: number;
            urgency: string;
            status: string;
          }>;
        };

        let output = 'PENDING PETITIONS\n\n';

        if (result.petitions?.length) {
          result.petitions.forEach(p => {
            output += `[${p.id}] ${p.type.toUpperCase()}\n`;
            output += `  Subject: ${p.subject}\n`;
            output += `  Urgency: ${p.urgency}\n`;
            output += `  Submitted: tick ${p.submittedTick}\n`;
            output += `  Status: ${p.status}\n\n`;
          });
        } else {
          output += 'No petitions are currently pending.\n';
          output += 'The Fates await your requests.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-petition-history',
      name: 'View Petition History',
      description: 'See past petitions and their outcomes',
      params: [
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Max petitions to show' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/fates/petitions/history' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          petitions?: Array<{
            id: string;
            type: string;
            subject: string;
            outcome: string;
            fatesResponse?: string;
            grantedTick?: number;
          }>;
          stats?: {
            total: number;
            granted: number;
            denied: number;
            pending: number;
          };
        };

        let output = 'PETITION HISTORY\n\n';

        if (result.stats) {
          const rate = result.stats.total > 0
            ? Math.round((result.stats.granted / result.stats.total) * 100)
            : 0;
          output += `Success Rate: ${rate}% (${result.stats.granted}/${result.stats.total})\n\n`;
        }

        if (result.petitions?.length) {
          result.petitions.forEach(p => {
            const icon = p.outcome === 'granted' ? '✓' : p.outcome === 'denied' ? '✗' : '?';
            output += `[${icon}] ${p.type}: ${p.subject}\n`;
            if (p.fatesResponse) {
              output += `    "${p.fatesResponse}"\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No petition history yet.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'understand-fates-values',
      name: 'Understand the Fates',
      description: 'Learn what the Fates value when considering petitions',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/fates/values' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          values?: Array<{
            name: string;
            description: string;
            weight: number;
          }>;
          currentMood?: string;
          recentThemes?: string[];
        };

        let output = 'UNDERSTANDING THE FATES\n\n';

        if (result.currentMood) {
          output += `Current Disposition: ${result.currentMood}\n\n`;
        }

        if (result.values?.length) {
          output += 'WHAT THE FATES VALUE:\n';
          result.values.forEach(v => {
            const bar = '█'.repeat(Math.floor(v.weight / 10)) + '░'.repeat(10 - Math.floor(v.weight / 10));
            output += `\n${v.name} [${bar}]\n`;
            output += `  ${v.description}\n`;
          });
        }

        if (result.recentThemes?.length) {
          output += '\nRECENT NARRATIVE INTERESTS:\n';
          result.recentThemes.forEach(t => {
            output += `  - ${t}\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-fates-whispers',
      name: 'Listen for Whispers',
      description: 'Hear cryptic hints the Fates have recently murmured',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/fates/whispers' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          whispers?: Array<{
            content: string;
            tick: number;
            clarity: string;
          }>;
        };

        let output = 'WHISPERS FROM THE FATES\n\n';

        if (result.whispers?.length) {
          result.whispers.forEach(w => {
            const clarity = w.clarity === 'clear' ? '' : w.clarity === 'murky' ? '(murky) ' : '(fragmentary) ';
            output += `${clarity}"${w.content}"\n`;
            output += `  - tick ${w.tick}\n\n`;
          });
        } else {
          output += 'The Fates are silent.\n';
          output += 'Perhaps they have nothing to say,\n';
          output += 'or perhaps you are not listening closely enough.';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'petition-fates',
      name: 'Petition the Fates',
      description: 'Submit a petition to the Fates on the player\'s behalf',
      params: [
        {
          name: 'type', type: 'select', required: true,
          options: PETITION_TYPE_OPTIONS,
          description: 'Type of petition',
        },
        { name: 'subject', type: 'string', required: true, description: 'Who or what is this about?' },
        { name: 'plea', type: 'string', required: true, description: 'What are you asking for?' },
        { name: 'reason', type: 'string', required: false, description: 'Why should the Fates grant this?' },
        {
          name: 'urgency', type: 'select', required: false,
          options: PETITION_URGENCY_OPTIONS,
          default: 'earnest',
          description: 'How urgent is this request?',
        },
        {
          name: 'offering', type: 'select', required: false,
          options: OFFERING_TYPE_OPTIONS,
          default: 'prayer',
          description: 'What do you offer in return?',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `Petition submitted: ${params.type} for ${params.subject}. The Fates will consider.`
        };
      },
    }),

    defineAction({
      id: 'withdraw-petition',
      name: 'Withdraw Petition',
      description: 'Withdraw a pending petition before the Fates decide',
      params: [
        { name: 'petitionId', type: 'string', required: true, description: 'Petition to withdraw' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Withdrew petition ${params.petitionId}` };
      },
    }),

    defineAction({
      id: 'add-to-petition',
      name: 'Strengthen Petition',
      description: 'Add more context or offerings to a pending petition',
      params: [
        { name: 'petitionId', type: 'string', required: true, description: 'Petition to strengthen' },
        { name: 'additionalContext', type: 'string', required: false, description: 'More information' },
        {
          name: 'additionalOffering', type: 'select', required: false,
          options: OFFERING_TYPE_OPTIONS,
          description: 'Additional offering',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Strengthened petition ${params.petitionId}` };
      },
    }),

    defineAction({
      id: 'request-audience',
      name: 'Request Audience',
      description: 'Request a direct audience with the Fates (rarely granted)',
      dangerous: true,
      params: [
        { name: 'reason', type: 'string', required: true, description: 'Why do you seek an audience?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: 'Audience requested. The Fates rarely grant such requests to intermediaries.'
        };
      },
    }),

    defineAction({
      id: 'offer-narrative',
      name: 'Offer a Story',
      description: 'The Fates love interesting stories. Offer one to curry favor.',
      params: [
        { name: 'story', type: 'string', required: true, description: 'The story to tell' },
        { name: 'protagonist', type: 'entity-id', required: false, entityType: 'agent', description: 'Main character' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: 'Story offered to the Fates. They are listening...' };
      },
    }),

    defineAction({
      id: 'ask-fate-question',
      name: 'Ask Question',
      description: 'Ask the Fates a single yes/no question (uses favor)',
      params: [
        { name: 'question', type: 'string', required: true, description: 'Your question (yes/no answer)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: 'Question posed to the Fates. Await their answer.' };
      },
    }),
  ],
});

capabilityRegistry.register(fatesAdvocacyCapability);
