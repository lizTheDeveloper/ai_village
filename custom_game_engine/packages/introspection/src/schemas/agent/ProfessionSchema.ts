/**
 * Profession Component Schema
 *
 * Defines agent profession and work simulation
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { ProfessionComponent } from '@ai-village/core';

/**
 * Profession component schema
 */
export const ProfessionSchema = autoRegister(
  defineComponent<ProfessionComponent>({
    type: 'profession',
    version: 1,
    category: 'agent',
    description: 'Agent profession and work simulation',

    fields: {
      role: {
        type: 'enum',
        enumValues: [
          'newspaper_reporter',
          'newspaper_editor',
          'tv_actor',
          'tv_director',
          'tv_producer',
          'tv_writer',
          'radio_dj',
          'radio_producer',
          'office_worker',
          'shopkeeper',
          'teacher',
          'librarian',
          'doctor',
          'nurse',
          'bureaucrat',
          'city_planner',
          'accountant',
          'generic_worker',
        ] as const,
        required: true,
        description: 'Profession role/job type',
        displayName: 'Role',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'profession',
          order: 1,
          icon: '💼',
        },
        mutable: false,
      },

      workplaceBuildingId: {
        type: 'string',
        required: true,
        description: 'Building ID where agent works',
        displayName: 'Workplace',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'profession',
          order: 2,
        },
        mutable: true,
      },

      cityDirectorId: {
        type: 'string',
        required: true,
        description: 'City director entity ID',
        displayName: 'City Director',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'management',
          order: 10,
        },
        mutable: false,
      },

      dailyOutputQuota: {
        type: 'number',
        required: true,
        default: 5,
        range: [0, 100] as const,
        description: 'Expected outputs per game day',
        displayName: 'Daily Quota',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'performance',
          order: 20,
        },
        mutable: true,
      },

      performance: {
        type: 'number',
        required: true,
        default: 0.7,
        range: [0, 1] as const,
        description: 'Performance rating (0.0-1.0)',
        displayName: 'Performance',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'performance',
          order: 21,
          icon: '📊',
        },
        mutable: true,
      },

      experienceDays: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 10000] as const,
        description: 'Experience in this profession (days)',
        displayName: 'Experience',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'performance',
          order: 22,
        },
        mutable: true,
      },

      salary: {
        type: 'number',
        required: true,
        default: 100,
        range: [0, 10000] as const,
        description: 'Salary (currency units per day)',
        displayName: 'Salary',
        visibility: {
          player: true,
          llm: false,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'economics',
          order: 30,
          icon: '💰',
        },
        mutable: true,
      },

      hiredTick: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Game tick when hired',
        displayName: 'Hired At',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'management',
          order: 11,
        },
        mutable: false,
      },
    },

    ui: {
      icon: '💼',
      color: '#2196F3',
      priority: 6,
    },

    llm: {
      promptSection: 'profession',
      summarize: (data: ProfessionComponent) => {
        const exp = data.experienceDays > 0 ? ` (${data.experienceDays}d exp)` : '';
        const perf = data.performance >= 0.8 ? 'excellent' : data.performance >= 0.6 ? 'good' : 'poor';
        return `${data.role}${exp} - ${perf} performance`;
      },
      priority: 7,
    },

    createDefault: (): ProfessionComponent => ({
      type: 'profession',
      version: 1,
      role: 'generic_worker',
      workplaceBuildingId: '',
      cityDirectorId: '',
      shift: { startHour: 9, endHour: 17 },
      dailyOutputQuota: 5,
      recentOutputs: [],
      performance: 0.7,
      experienceDays: 0,
      salary: 100,
      hiredTick: 0,
    }),
  })
);
