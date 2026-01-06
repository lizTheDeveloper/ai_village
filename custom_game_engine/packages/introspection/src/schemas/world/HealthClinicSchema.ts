/**
 * Health Clinic Component Schema
 *
 * Population health tracking and treatment facility
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { HealthClinicComponent } from '@ai-village/core';

export const HealthClinicSchema = autoRegister(
  defineComponent<HealthClinicComponent>({
    type: 'health_clinic',
    version: 1,
    category: 'world',

    fields: {
      treatments: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Treatments',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'clinic',
          order: 1,
          icon: '💊',
        },
        mutable: true,
      },

      recommendedStaff: {
        type: 'number',
        required: true,
        default: 1,
        displayName: 'Recommended Staff',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'staffing',
          order: 10,
        },
        mutable: true,
      },

      dataQuality: {
        type: 'enum',
        enumValues: ['full', 'basic'] as const,
        required: true,
        default: 'basic',
        displayName: 'Data Quality',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'metrics',
          order: 20,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🏥',
      color: '#E91E63',
      priority: 6,
    },

    llm: {
      promptSection: 'Health',
      summarize: (data: HealthClinicComponent) => {
        const pop = data.populationHealth;
        const total = pop.healthy + pop.sick + pop.critical;
        const healthyPct = total > 0 ? Math.round((pop.healthy / total) * 100) : 0;
        const diseases = data.diseases.length;
        const diseaseWarning = diseases > 0 ? ` (${diseases} disease outbreaks!)` : '';
        return `Health clinic: ${healthyPct}% healthy, ${pop.critical} critical, ${data.treatments} treatments${diseaseWarning}`;
      },
    },

    createDefault: (): HealthClinicComponent => ({
      type: 'health_clinic',
      version: 1,
      populationHealth: {
        healthy: 0,
        sick: 0,
        critical: 0,
      },
      diseases: [],
      malnutrition: {
        affected: 0,
        trend: 'stable',
      },
      trauma: {
        traumatized: 0,
        severe: 0,
        healing: 0,
      },
      mortality: [],
      dataQuality: 'basic',
      treatments: 0,
      recommendedStaff: 1,
    }),
  })
);
