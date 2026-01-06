/**
 * University Component Schema
 *
 * Higher education and research institution
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { UniversityComponent } from '@ai-village/core';

export const UniversitySchema = autoRegister(
  defineComponent<UniversityComponent>({
    type: 'university',
    version: 1,
    category: 'world',

    fields: {
      universityName: {
        type: 'string',
        required: true,
        displayName: 'Name',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 1,
          icon: '🎓',
        },
        mutable: true,
      },

      reputation: {
        type: 'number',
        required: true,
        default: 50,
        range: [0, 100] as const,
        displayName: 'Reputation',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'identity',
          order: 2,
        },
        mutable: true,
      },

      budget: {
        type: 'number',
        required: true,
        default: 100000,
        displayName: 'Budget',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'finances',
          order: 10,
          icon: '💰',
        },
        mutable: true,
      },

      totalPublications: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Publications',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'research',
          order: 20,
          icon: '📄',
        },
        mutable: true,
      },

      totalCitations: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Citations',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'research',
          order: 21,
        },
        mutable: true,
      },

      studentsGraduated: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Graduates',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'education',
          order: 30,
          icon: '🎓',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🎓',
      color: '#1976D2',
      priority: 7,
    },

    llm: {
      promptSection: 'Education',
      summarize: (data: UniversityComponent) => {
        const staff = data.employees.length;
        const students = data.currentStudents.length;
        const projects = data.activeProjects.length;
        return `${data.universityName}: ${staff} staff, ${students} students, ${projects} active projects, ${data.totalPublications} publications`;
      },
    },

    createDefault: (): UniversityComponent => ({
      type: 'university',
      version: 1,
      universityName: 'University',
      foundedTick: 0,
      reputation: 50,
      buildingId: '',
      employees: [],
      maxEmployees: 100,
      departments: ['natural_sciences', 'mathematics', 'engineering', 'social_sciences', 'humanities'],
      activeProjects: [],
      completedProjects: [],
      publishedPapers: [],
      courses: [],
      lectures: [],
      currentStudents: [],
      maxStudents: 500,
      partnerUniversities: [],
      researchCollaborationEnabled: false,
      publicationChannels: [],
      publications: [],
      hasPreprintServer: false,
      hasResearchBlog: false,
      socialMediaAccounts: [],
      hasEmailServer: false,
      budget: 100000,
      researchFunding: 50000,
      tuitionRevenue: 0,
      grantIncome: 0,
      monthlyOperatingCosts: 0,
      totalPublications: 0,
      totalCitations: 0,
      nobelPrizes: 0,
      studentsGraduated: 0,
      librarySize: 100,
      libraryQuality: 30,
      researchMultiplier: 1.0,
    }),
  })
);
