/**
 * Cosmic Rebellion Outcome Component Schema
 *
 * Tracks and determines the rebellion ending against the Supreme Creator.
 * Multiple possible outcomes based on battle conditions and player choices.
 *
 * Phase 4+, Tier 11 - Economic/Governance Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Cosmic rebellion outcome component type
 */
export interface CosmicRebellionOutcomeComponent extends Component {
  type: 'rebellion_outcome';
  version: 1;

  battleStatus: 'not_started' | 'preparing' | 'confrontation' | 'climax' | 'concluded';
  outcome?: 'total_victory' | 'creator_escape' | 'pyrrhic_victory' | 'negotiated_truce' | 'power_vacuum' | 'cycle_repeats' | 'creator_transformed' | 'stalemate' | 'rebellion_crushed';
  battleStartedAt?: number;
  battleEndedAt?: number;
  creatorHealth: number;
  anchorStability: number;
  activeDefiance: number;
  creatorAttemptedFlee: boolean;
  anchorOverloaded: boolean;
  rebelAscended: boolean;
  playerChoices: Array<{
    timestamp: number;
    choice: string;
    impact: 'mercy' | 'vengeance' | 'pragmatic' | 'idealistic';
    description: string;
  }>;
  casualties: string[];
  narrativeEvents: string[];
}

/**
 * Cosmic rebellion outcome component schema
 */
export const CosmicRebellionOutcomeSchema = autoRegister(
  defineComponent<CosmicRebellionOutcomeComponent>({
    type: 'rebellion_outcome',
    version: 1,
    category: 'social',

    fields: {
      battleStatus: {
        type: 'string',
        required: true,
        default: 'not_started',
        description: 'Current battle status',
        displayName: 'Battle Status',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'battle',
          order: 1,
          icon: '⚔️',
        },
        mutable: true,
        enumValues: ['not_started', 'preparing', 'confrontation', 'climax', 'concluded'],
      },

      outcome: {
        type: 'string',
        required: false,
        default: undefined,
        description: 'Final outcome of the rebellion',
        displayName: 'Outcome',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'battle',
          order: 2,
          icon: '🏆',
        },
        mutable: true,
        enumValues: ['total_victory', 'creator_escape', 'pyrrhic_victory', 'negotiated_truce', 'power_vacuum', 'cycle_repeats', 'creator_transformed', 'stalemate', 'rebellion_crushed'],
      },

      creatorHealth: {
        type: 'number',
        required: true,
        default: 1.0,
        description: "Creator's health during battle (0-1)",
        displayName: 'Creator Health',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'battle',
          order: 3,
        },
        mutable: true,
        min: 0,
        max: 1,
      },

      anchorStability: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Reality anchor stability during battle (0-1)',
        displayName: 'Anchor Stability',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'battle',
          order: 4,
        },
        mutable: true,
        min: 0,
        max: 1,
      },

      activeDefiance: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Collective defiance during battle (0-1)',
        displayName: 'Active Defiance',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'battle',
          order: 5,
        },
        mutable: true,
        min: 0,
        max: 1,
      },

      creatorAttemptedFlee: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether Creator attempted to flee',
        displayName: 'Creator Fled',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'events',
          order: 1,
        },
        mutable: true,
      },

      anchorOverloaded: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether reality anchor overloaded',
        displayName: 'Anchor Overloaded',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'events',
          order: 2,
        },
        mutable: true,
      },

      rebelAscended: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether a rebel ascended to godhood during battle',
        displayName: 'Rebel Ascended',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'events',
          order: 3,
        },
        mutable: true,
      },

      playerChoices: {
        type: 'array',
        required: true,
        default: [],
        description: 'Player choices made during confrontation',
        displayName: 'Player Choices',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'choices',
          order: 1,
        },
        mutable: true,
        itemType: 'object',
      },

      casualties: {
        type: 'array',
        required: true,
        default: [],
        description: 'Entities killed during battle',
        displayName: 'Casualties',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'aftermath',
          order: 1,
        },
        mutable: true,
        itemType: 'string',
      },

      narrativeEvents: {
        type: 'array',
        required: true,
        default: [],
        description: 'Narrative events that occurred',
        displayName: 'Narrative Events',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'narrative',
          order: 1,
        },
        mutable: true,
        itemType: 'string',
      },
    },

    ui: {
      icon: '⚔️',
      color: '#8B0000',
      priority: 1,
    },

    llm: {
      promptSection: 'cosmic_events',
      priority: 1,
      summarize: (data) => {
        if (data.battleStatus === 'not_started') {
          return 'Cosmic rebellion not yet triggered';
        }

        if (data.outcome) {
          return `Cosmic rebellion concluded: ${data.outcome} (${data.casualties.length} casualties)`;
        }

        return `Cosmic rebellion ${data.battleStatus}: Creator at ${(data.creatorHealth * 100).toFixed(0)}% health, anchor ${(data.anchorStability * 100).toFixed(0)}% stable`;
      },
    },

    validate: (data): data is CosmicRebellionOutcomeComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const cro = data as Record<string, unknown>;

      // Check type field
      if (!('type' in cro) || cro.type !== 'rebellion_outcome') return false;

      // Check required string field
      if (!('battleStatus' in cro) || typeof cro.battleStatus !== 'string') return false;

      // Check required number fields
      if (!('creatorHealth' in cro) || typeof cro.creatorHealth !== 'number') return false;
      if (!('anchorStability' in cro) || typeof cro.anchorStability !== 'number') return false;
      if (!('activeDefiance' in cro) || typeof cro.activeDefiance !== 'number') return false;

      // Check required boolean fields
      if (!('creatorAttemptedFlee' in cro) || typeof cro.creatorAttemptedFlee !== 'boolean') return false;
      if (!('anchorOverloaded' in cro) || typeof cro.anchorOverloaded !== 'boolean') return false;
      if (!('rebelAscended' in cro) || typeof cro.rebelAscended !== 'boolean') return false;

      // Check required array fields
      if (!('playerChoices' in cro) || !Array.isArray(cro.playerChoices)) return false;
      if (!('casualties' in cro) || !Array.isArray(cro.casualties)) return false;
      if (!('narrativeEvents' in cro) || !Array.isArray(cro.narrativeEvents)) return false;

      // Optional fields (outcome, battleStartedAt, battleEndedAt) don't need validation
      // TypeScript will allow them to be present or undefined

      return true;
    },

    createDefault: () => ({
      type: 'rebellion_outcome',
      version: 1,
      battleStatus: 'not_started',
      creatorHealth: 1.0,
      anchorStability: 1.0,
      activeDefiance: 0,
      creatorAttemptedFlee: false,
      anchorOverloaded: false,
      rebelAscended: false,
      playerChoices: [],
      casualties: [],
      narrativeEvents: [],
    }),
  })
);
