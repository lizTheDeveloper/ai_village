/**
 * UpliftCandidate Component Schema
 *
 * Marks an animal as suitable for genetic uplift.
 * Tracks evaluation metrics for uplift potential.
 * Tier 16: Miscellaneous (cognitive/evolution).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Uplift candidate component type
 */
export interface UpliftCandidateComponent extends Component {
  type: 'uplift_candidate';
  version: 1;

  upliftPotential: number;
  preSapient: boolean;
  cognitiveMetrics: {
    neuralComplexity: number;
    problemSolving: number;
    socialIntelligence: number;
    toolUse: boolean;
    communication: number;
    selfAwareness: number;
  };
  socialStructure: 'solitary' | 'pair' | 'family' | 'pack' | 'hive' | 'flock';
  groupSize: number;
  geneticHealth: number;
  populationSize: number;
  inbreedingRisk: number;
  estimatedGenerations: number;
  estimatedYears: number;
  evaluated: boolean;
  evaluatedAt: number;
  evaluatedBy?: string;
  recommended: boolean;
  recommendedTemplateId?: string;
}

/**
 * Uplift candidate component schema
 */
export const UpliftCandidateSchema = autoRegister(
  defineComponent<UpliftCandidateComponent>({
    type: 'uplift_candidate',
    version: 1,
    category: 'cognitive',
    description: 'Marks an animal as suitable for genetic uplift',

    fields: {
      upliftPotential: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Overall uplift potential score (0-100)',
        displayName: 'Uplift Potential',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'evaluation', order: 1, min: 0, max: 100, step: 1, icon: '⭐' },
        mutable: true,
      },

      preSapient: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'High baseline intelligence',
        displayName: 'Pre-Sapient',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'evaluation', order: 2, icon: '🧠' },
        mutable: true,
      },

      cognitiveMetrics: {
        type: 'object',
        required: true,
        default: {
          neuralComplexity: 0,
          problemSolving: 0,
          socialIntelligence: 0,
          toolUse: false,
          communication: 0,
          selfAwareness: 0,
        },
        description: 'Cognitive evaluation metrics',
        displayName: 'Cognitive Metrics',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'metrics', order: 1 },
        mutable: true,
      },

      socialStructure: {
        type: 'string',
        required: true,
        default: 'solitary',
        description: 'Social organization type',
        displayName: 'Social Structure',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'dropdown', group: 'social', order: 1 },
        mutable: true,
      },

      groupSize: {
        type: 'number',
        required: true,
        default: 1,
        description: 'Current group/pack size',
        displayName: 'Group Size',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'social', order: 2 },
        mutable: true,
      },

      geneticHealth: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Genetic health (0-1)',
        displayName: 'Genetic Health',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'genetics', order: 1, min: 0, max: 1, step: 0.01 },
        mutable: true,
      },

      populationSize: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Estimated species population nearby',
        displayName: 'Population Size',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'genetics', order: 2 },
        mutable: true,
      },

      inbreedingRisk: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Genetic diversity risk (0-1)',
        displayName: 'Inbreeding Risk',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'genetics', order: 3, min: 0, max: 1, step: 0.01 },
        mutable: true,
      },

      estimatedGenerations: {
        type: 'number',
        required: true,
        default: 100,
        description: 'Base generations needed for uplift',
        displayName: 'Estimated Generations',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'estimates', order: 1, icon: '🔬' },
        mutable: true,
      },

      estimatedYears: {
        type: 'number',
        required: true,
        default: 100,
        description: 'Real-time years (with current tech)',
        displayName: 'Estimated Years',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'estimates', order: 2 },
        mutable: true,
      },

      evaluated: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Has been evaluated',
        displayName: 'Evaluated',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'status', order: 1 },
        mutable: true,
      },

      recommended: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Meets minimum criteria for uplift',
        displayName: 'Recommended',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'status', order: 2, icon: '✅' },
        mutable: true,
      },
    },

    ui: {
      icon: '🔬',
      color: '#4169E1',
      priority: 7,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'cognitive_state',
      priority: 7,
      summarize: (data) => {
        if (!data.evaluated) return '';
        const status = data.recommended ? 'RECOMMENDED' : 'not recommended';
        return `Uplift Candidate: ${data.upliftPotential}/100 potential, ${status} (${data.estimatedGenerations} generations, ~${data.estimatedYears} years)`;
      },
    },

    validate: (data): data is UpliftCandidateComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const u = data as any;

      return (
        u.type === 'uplift_candidate' &&
        typeof u.upliftPotential === 'number' &&
        typeof u.preSapient === 'boolean' &&
        typeof u.cognitiveMetrics === 'object' &&
        typeof u.evaluated === 'boolean'
      );
    },

    createDefault: () => ({
      type: 'uplift_candidate',
      version: 1,
      upliftPotential: 0,
      preSapient: false,
      cognitiveMetrics: {
        neuralComplexity: 0,
        problemSolving: 0,
        socialIntelligence: 0,
        toolUse: false,
        communication: 0,
        selfAwareness: 0,
      },
      socialStructure: 'solitary',
      groupSize: 1,
      geneticHealth: 1.0,
      populationSize: 0,
      inbreedingRisk: 0,
      estimatedGenerations: 100,
      estimatedYears: 100,
      evaluated: false,
      evaluatedAt: 0,
      evaluatedBy: undefined,
      recommended: false,
      recommendedTemplateId: undefined,
    }),
  })
);
