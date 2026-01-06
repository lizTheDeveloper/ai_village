import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { GuardDutyComponent } from '@ai-village/core';

export const GuardDutySchema = autoRegister(
  defineComponent<GuardDutyComponent>({
    type: 'guard_duty',
    version: 1,
    category: 'agent',
    description: 'Guard assignment and state for security and threat detection',

    fields: {
      assignmentType: {
        type: 'string',
        required: true,
        description: 'Type of guard assignment (location, person, patrol)',
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
          order: 1,
        },
      },
      targetLocation: {
        type: 'object',
        required: false,
        description: 'Target location to guard (for location assignment)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Target',
          order: 1,
        },
      },
      targetPerson: {
        type: 'string',
        required: false,
        description: 'Target person to guard (for person assignment)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Target',
          order: 2,
        },
      },
      patrolRoute: {
        type: 'array',
        required: false,
        description: 'Patrol route (for patrol assignment)',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Patrol',
          order: 1,
        },
      },
      patrolIndex: {
        type: 'number',
        required: false,
        default: 0,
        description: 'Current patrol waypoint index',
        visibility: {
          player: false,
          llm: false,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Patrol',
          order: 2,
        },
      },
      alertness: {
        type: 'number',
        required: true,
        description: 'Alertness level (0-1, decays over time)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Status',
          order: 1,
        },
      },
      responseRadius: {
        type: 'number',
        required: true,
        description: 'Response radius for threat detection',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Status',
          order: 2,
        },
      },
      lastCheckTime: {
        type: 'number',
        required: false,
        default: 0,
        description: 'Last threat check time',
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
    },

    ui: {
      icon: '🛡️',
      color: '#3498DB',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Guard Duty',
      summarize: (data: GuardDutyComponent) => {
        const alertness = Math.round(data.alertness * 100);
        if (data.assignmentType === 'location') {
          return `Guarding location (${alertness}% alert, ${data.responseRadius}m radius)`;
        } else if (data.assignmentType === 'person') {
          return `Guarding person ${data.targetPerson} (${alertness}% alert)`;
        } else {
          const waypoints = data.patrolRoute?.length || 0;
          return `Patrolling ${waypoints} waypoints (${alertness}% alert)`;
        }
      },
    },

    createDefault: (): GuardDutyComponent => ({
      type: 'guard_duty',
      version: 1,
      assignmentType: 'location',
      alertness: 1.0,
      responseRadius: 10,
      lastCheckTime: 0,
    }),
  })
);
