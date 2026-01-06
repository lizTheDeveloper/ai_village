/**
 * Injury Component Schema
 *
 * Tracks active injuries on agents
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { InjuryComponent } from '@ai-village/core';

/**
 * Injury component schema
 */
export const InjurySchema = autoRegister(
  defineComponent<InjuryComponent>({
    type: 'injury',
    version: 1,
    category: 'physical',
    description: 'Active injuries with type, severity, and penalties',

    fields: {
      injuryType: {
        type: 'enum',
        enumValues: ['laceration', 'puncture', 'blunt', 'burn', 'bite', 'exhaustion', 'psychological'] as const,
        required: true,
        description: 'Type of injury sustained',
        displayName: 'Injury Type',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'injury',
          order: 1,
          icon: '🩹',
        },
        mutable: false,
      },

      severity: {
        type: 'enum',
        enumValues: ['minor', 'major', 'critical'] as const,
        required: true,
        description: 'Severity level of injury',
        displayName: 'Severity',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'injury',
          order: 2,
          icon: '⚠️',
        },
        mutable: false,
      },

      location: {
        type: 'enum',
        enumValues: ['head', 'torso', 'arms', 'legs', 'hands', 'feet'] as const,
        required: true,
        description: 'Body location of injury',
        displayName: 'Location',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'injury',
          order: 3,
        },
        mutable: false,
      },

      movementPenalty: {
        type: 'number',
        required: false,
        range: [0, 100] as const,
        description: 'Movement speed penalty percentage',
        displayName: 'Movement Penalty',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'penalties',
          order: 10,
          icon: '🚶',
        },
        mutable: true,
      },

      healingTime: {
        type: 'number',
        required: false,
        range: [0, 100000] as const,
        description: 'Ticks until healed',
        displayName: 'Healing Time',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'healing',
          order: 20,
        },
        mutable: true,
      },

      elapsed: {
        type: 'number',
        required: false,
        default: 0,
        range: [0, 100000] as const,
        description: 'Ticks since injury occurred',
        displayName: 'Elapsed Time',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'healing',
          order: 21,
        },
        mutable: true,
      },

      requiresTreatment: {
        type: 'boolean',
        required: false,
        description: 'Whether medical treatment is required',
        displayName: 'Requires Treatment',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'healing',
          order: 22,
          icon: '🏥',
        },
        mutable: false,
      },

      treated: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Whether injury has been treated',
        displayName: 'Treated',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'healing',
          order: 23,
        },
        mutable: true,
      },

      untreatedDuration: {
        type: 'number',
        required: false,
        default: 0,
        range: [0, 100000] as const,
        description: 'Duration untreated (for complications)',
        displayName: 'Untreated Duration',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'healing',
          order: 24,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🩹',
      color: '#F44336',
      priority: 7,
    },

    llm: {
      promptSection: 'health',
      summarize: (data: InjuryComponent) => {
        const treatment = data.requiresTreatment ? (data.treated ? 'treated' : 'NEEDS TREATMENT') : '';
        return `${data.severity} ${data.injuryType} (${data.location})${treatment ? ` ${treatment}` : ''}`;
      },
      priority: 8,
    },

    createDefault: (): InjuryComponent => ({
      type: 'injury',
      version: 1,
      injuryType: 'laceration',
      severity: 'minor',
      location: 'arms',
      skillPenalties: {},
      elapsed: 0,
      requiresTreatment: false,
      treated: false,
      untreatedDuration: 0,
    }),
  })
);
