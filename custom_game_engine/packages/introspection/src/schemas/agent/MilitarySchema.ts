import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { MilitaryComponent } from '@ai-village/core';

export const MilitarySchema = autoRegister(
  defineComponent<MilitaryComponent>({
    type: 'military',
    version: 1,
    category: 'agent',
    description: 'Military organization and squad management - Dwarf Fortress-style military squads with schedules and equipment',

    fields: {
      enlisted: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether agent is in the military',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Status',
          order: 1,
        },
      },
      squadId: {
        type: 'string',
        required: false,
        description: 'Squad ID (if enlisted)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Assignment',
          order: 1,
        },
      },
      rank: {
        type: 'string',
        required: true,
        default: 'recruit',
        description: 'Military rank (recruit, soldier, veteran, sergeant, captain, commander, general)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'Status',
          order: 2,
        },
      },
      role: {
        type: 'string',
        required: false,
        description: 'Combat role (melee, ranged, shield, medic, scout)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'Assignment',
          order: 2,
        },
      },
      assignedLoadout: {
        type: 'object',
        required: false,
        description: 'Equipment loadout assignment',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Equipment',
          order: 1,
        },
      },
      combatExperience: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Combat experience (0-100)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Statistics',
          order: 1,
        },
      },
      kills: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Kills (for morale/promotion)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Statistics',
          order: 2,
        },
      },
      timesWounded: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Times wounded in combat',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Statistics',
          order: 3,
        },
      },
      onDuty: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether currently on duty',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Status',
          order: 3,
        },
      },
      currentAssignment: {
        type: 'string',
        required: false,
        description: 'Current assigned activity (training, patrol, guard, hunt, defend, off_duty, rest)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'Assignment',
          order: 3,
        },
      },
      followingOrders: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Whether following orders or acting autonomously',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Behavior',
          order: 1,
        },
      },
      lastCombat: {
        type: 'number',
        required: false,
        description: 'Last combat tick',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Timestamps',
          order: 1,
        },
      },
      trainingProgress: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Training progress for current skill',
        visibility: {
          player: true,
          llm: false,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Training',
          order: 1,
        },
      },
      militia: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Whether this agent is a militia (part-time) or professional',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Status',
          order: 4,
        },
      },
    },

    ui: {
      icon: '⚔️',
      color: '#E74C3C',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Military Status',
      summarize: (data: MilitaryComponent) => {
        if (!data.enlisted) return 'Not enlisted in military';
        const type = data.militia ? 'militia' : 'professional';
        const status = data.onDuty ? 'on duty' : 'off duty';
        return `${data.rank} (${type}, ${status}) - ${data.combatExperience} XP, ${data.kills} kills`;
      },
    },

    createDefault: (): MilitaryComponent => ({
      type: 'military',
      version: 1,
      enlisted: false,
      rank: 'recruit',
      combatExperience: 0,
      kills: 0,
      timesWounded: 0,
      onDuty: false,
      followingOrders: true,
      trainingProgress: 0,
      militia: true,
    }),
  })
);
