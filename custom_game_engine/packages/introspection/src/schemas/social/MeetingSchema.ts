/**
 * Meeting Component Schema
 *
 * Component for agents who have called a meeting.
 * This allows other agents to hear the meeting call and decide whether to attend.
 *
 * Phase 4+, Tier 10 - Social/Community Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Meeting component type
 */
export interface MeetingComponent extends Component {
  type: 'meeting';
  version: 1;

  callerId: string;
  topic: string;
  location: { x: number; y: number };
  calledAt: number;
  duration: number;
  attendees: string[];
  status: 'calling' | 'active' | 'ended';
}

/**
 * Meeting component schema
 */
export const MeetingSchema = autoRegister(
  defineComponent<MeetingComponent>({
    type: 'meeting',
    version: 1,
    category: 'social',

    fields: {
      callerId: {
        type: 'string',
        required: true,
        default: '',
        description: 'ID of the agent who called the meeting',
        displayName: 'Caller ID',
        visibility: { player: false, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'text',
          group: 'meeting',
          order: 1,
          icon: '📢',
        },
        mutable: false,
      },

      topic: {
        type: 'string',
        required: true,
        default: '',
        description: 'What the meeting is about',
        displayName: 'Topic',
        visibility: { player: false, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'text',
          group: 'meeting',
          order: 2,
          icon: '💬',
        },
        mutable: false,
      },

      location: {
        type: 'object',
        required: true,
        default: { x: 0, y: 0 },
        description: 'Where to gather',
        displayName: 'Location',
        visibility: { player: false, llm: true, agent: true, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'meeting',
          order: 3,
        },
        mutable: false,
      },

      calledAt: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Game tick when meeting was called',
        displayName: 'Called At',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'timing',
          order: 1,
        },
        mutable: false,
      },

      duration: {
        type: 'number',
        required: true,
        default: 200,
        description: 'How long the meeting should last (in ticks)',
        displayName: 'Duration',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'timing',
          order: 2,
        },
        mutable: false,
      },

      attendees: {
        type: 'array',
        required: true,
        default: [],
        description: 'IDs of agents who have joined',
        displayName: 'Attendees',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'meeting',
          order: 4,
        },
        mutable: true,
        itemType: 'string',
      },

      status: {
        type: 'string',
        required: true,
        default: 'calling',
        description: 'Meeting lifecycle status',
        displayName: 'Status',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'meeting',
          order: 5,
          icon: '📋',
        },
        mutable: true,
        enumValues: ['calling', 'active', 'ended'],
      },
    },

    ui: {
      icon: '📢',
      color: '#4169E1',
      priority: 13,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'meetings',
      priority: 13,
      summarize: (data) => {
        const statusMap: Record<string, string> = {
          calling: 'calling meeting',
          active: 'meeting in progress',
          ended: 'meeting ended',
        };

        const status = statusMap[data.status] || data.status;
        const attendeeCount = data.attendees.length;

        return `${status}: "${data.topic}" (${attendeeCount} ${attendeeCount === 1 ? 'attendee' : 'attendees'})`;
      },
    },

    validate: (data): data is MeetingComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const m = data as any;

      return (
        m.type === 'meeting' &&
        typeof m.callerId === 'string' &&
        typeof m.topic === 'string' &&
        typeof m.location === 'object' &&
        typeof m.calledAt === 'number' &&
        typeof m.duration === 'number' &&
        Array.isArray(m.attendees) &&
        typeof m.status === 'string'
      );
    },

    createDefault: () => ({
      type: 'meeting',
      version: 1,
      callerId: '',
      topic: '',
      location: { x: 0, y: 0 },
      calledAt: 0,
      duration: 200,
      attendees: [],
      status: 'calling',
    }),
  })
);
