/**
 * Conflict Component Schema
 *
 * Represents an active conflict.
 * Used for all conflict types: hunting, predator attacks, agent combat, dominance challenges.
 *
 * Phase 4+, Tier 10 - Social/Community Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Conflict component type
 */
export interface ConflictComponent extends Component {
  type: 'conflict';
  version: 1;

  conflictType: 'hunting' | 'predator_attack' | 'agent_combat' | 'dominance_challenge';
  target: string;
  state: string;
  startTime: number;
  endTime?: number;
  huntingState?: 'tracking' | 'stalking' | 'kill_success' | 'failed' | 'lost' | 'escape';
  cause?: string;
  surprise?: boolean;
  modifiers?: Array<{ type: string; value: number }>;
  attackerPower?: number;
  defenderPower?: number;
  outcome?: 'attacker_victory' | 'defender_victory' | 'mutual_injury' | 'stalemate' | 'death';
  winner?: string;
  combatants?: string[];
  trigger?: 'hunger' | 'territory' | 'provocation';
  metadata?: Record<string, any>;
  method?: 'combat' | 'display' | 'resource_seizure' | 'follower_theft';
  targetFollower?: string;
  consequence?: 'rank_swap' | 'demotion' | 'exile' | 'death';
  lethal?: boolean;
}

/**
 * Conflict component schema
 */
export const ConflictSchema = autoRegister(
  defineComponent<ConflictComponent>({
    type: 'conflict',
    version: 1,
    category: 'social',

    fields: {
      conflictType: {
        type: 'string',
        required: true,
        default: 'agent_combat',
        description: 'Type of conflict',
        displayName: 'Conflict Type',
        visibility: { player: false, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'conflict',
          order: 1,
          icon: '⚔️',
        },
        mutable: false,
        enumValues: ['hunting', 'predator_attack', 'agent_combat', 'dominance_challenge'],
      },

      target: {
        type: 'string',
        required: true,
        default: '',
        description: 'Target of the conflict (entity ID)',
        displayName: 'Target',
        visibility: { player: false, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'text',
          group: 'conflict',
          order: 2,
        },
        mutable: false,
      },

      state: {
        type: 'string',
        required: true,
        default: 'active',
        description: 'Current state of the conflict',
        displayName: 'State',
        visibility: { player: false, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'text',
          group: 'conflict',
          order: 3,
        },
        mutable: true,
      },

      startTime: {
        type: 'number',
        required: true,
        default: 0,
        description: 'When the conflict started (tick)',
        displayName: 'Start Time',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'timing',
          order: 1,
        },
        mutable: false,
      },

      endTime: {
        type: 'number',
        required: false,
        description: 'When the conflict should end (tick)',
        displayName: 'End Time',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'timing',
          order: 2,
        },
        mutable: false,
      },

      huntingState: {
        type: 'string',
        required: false,
        description: 'Hunting-specific state',
        displayName: 'Hunting State',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'hunting',
          order: 1,
        },
        mutable: true,
        enumValues: ['tracking', 'stalking', 'kill_success', 'failed', 'lost', 'escape'],
      },

      cause: {
        type: 'string',
        required: false,
        description: 'Cause of the conflict',
        displayName: 'Cause',
        visibility: { player: false, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'text',
          group: 'combat',
          order: 1,
        },
        mutable: false,
      },

      outcome: {
        type: 'string',
        required: false,
        description: 'Outcome of the conflict',
        displayName: 'Outcome',
        visibility: { player: false, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'result',
          order: 1,
        },
        mutable: true,
        enumValues: ['attacker_victory', 'defender_victory', 'mutual_injury', 'stalemate', 'death'],
      },

      winner: {
        type: 'string',
        required: false,
        description: 'Winner of the conflict (entity ID)',
        displayName: 'Winner',
        visibility: { player: false, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'text',
          group: 'result',
          order: 2,
        },
        mutable: true,
      },

      lethal: {
        type: 'boolean',
        required: false,
        description: 'Is this conflict lethal?',
        displayName: 'Lethal',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'conflict',
          order: 4,
          icon: '☠️',
        },
        mutable: false,
      },

      metadata: {
        type: 'object',
        required: false,
        description: 'Additional metadata for conflict context',
        displayName: 'Metadata',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'metadata',
          order: 1,
        },
        mutable: false,
      },
    },

    ui: {
      icon: '⚔️',
      color: '#8B0000',
      priority: 11,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'conflicts',
      priority: 11,
      summarize: (data) => {
        const typeDescriptions: Record<string, string> = {
          hunting: 'hunting',
          predator_attack: 'defending from predator',
          agent_combat: 'in combat',
          dominance_challenge: 'dominance challenge',
        };

        const typeDesc = typeDescriptions[data.conflictType] || data.conflictType;
        const lethalNote = data.lethal ? ' (lethal)' : '';

        let summary = `${typeDesc} with target${lethalNote}`;

        if (data.huntingState) {
          summary += ` | ${data.huntingState}`;
        }

        if (data.outcome) {
          const outcomeDesc = data.outcome.replace(/_/g, ' ');
          summary += ` | outcome: ${outcomeDesc}`;
        } else if (data.state) {
          summary += ` | state: ${data.state}`;
        }

        if (data.cause) {
          summary += ` | cause: ${data.cause}`;
        }

        return summary;
      },
    },

    validate: (data): data is ConflictComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const c = data as any;

      return (
        c.type === 'conflict' &&
        typeof c.conflictType === 'string' &&
        typeof c.target === 'string' &&
        typeof c.state === 'string' &&
        typeof c.startTime === 'number'
      );
    },

    createDefault: () => ({
      type: 'conflict',
      version: 1,
      conflictType: 'agent_combat',
      target: '',
      state: 'active',
      startTime: 0,
    }),
  })
);
