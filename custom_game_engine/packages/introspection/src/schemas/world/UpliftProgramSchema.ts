/**
 * UpliftProgram Component Schema
 *
 * Tracks a multi-generational genetic uplift program.
 * Represents the breeding facility and ongoing uplift process.
 * Tier 16: Miscellaneous (world/systems).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Uplift program component type
 */
export interface UpliftProgramComponent extends Component {
  type: 'uplift_program';
  version: 1;

  programId: string;
  programName: string;
  sourceSpeciesId: string;
  targetSpeciesId: string;
  facilityId: string;
  leadScientistId: string;
  geneticistIds: string[];
  breedingPopulation: string[];
  populationSize: number;
  minimumPopulation: number;
  geneticDiversity: number;
  currentGeneration: number;
  targetGeneration: number;
  baseGenerations: number;
  acceleratedGenerations: number;
  stage: 'population_establishment' | 'genetic_baseline' | 'selective_breeding' | 'gene_editing' |
         'neural_enhancement' | 'pre_sapience' | 'emergence_threshold' | 'awakening' |
         'stabilization' | 'completed';
  progressToNextGeneration: number;
  progressToSapience: number;
  baselineIntelligence: number;
  currentIntelligence: number;
  targetIntelligence: number;
  technologies: Array<{
    techId: string;
    name: string;
    generationReduction: number;
    appliedAt: number;
  }>;
  researchPapers: string[];
  paperBonus: number;
  energyPerGeneration: number;
  materialsPerGeneration: Record<string, number>;
  totalEnergyConsumed: number;
  totalMaterialsConsumed: Record<string, number>;
  generationResults: Array<{
    generation: number;
    birthCount: number;
    survivalRate: number;
    averageIntelligence: number;
    neuralComplexity: number;
    mutations: string[];
    breakthroughs: string[];
    setbacks: string[];
    notableIndividuals: string[];
  }>;
  startedAt: number;
  lastGenerationAt: number;
  estimatedCompletionAt: number;
  notableEvents: string[];
}

/**
 * Uplift program component schema
 */
export const UpliftProgramSchema = autoRegister(
  defineComponent<UpliftProgramComponent>({
    type: 'uplift_program',
    version: 1,
    category: 'world',
    description: 'Tracks a multi-generational genetic uplift program',

    fields: {
      programName: {
        type: 'string',
        required: true,
        default: 'Unnamed Program',
        description: 'Program name',
        displayName: 'Program Name',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: { widget: 'text', group: 'identity', order: 1, icon: '🧬' },
        mutable: true,
      },

      sourceSpeciesId: {
        type: 'string',
        required: true,
        default: '',
        description: 'Source species being uplifted',
        displayName: 'Source Species',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'text', group: 'identity', order: 2 },
        mutable: false,
      },

      targetSpeciesId: {
        type: 'string',
        required: true,
        default: '',
        description: 'Target uplifted species ID',
        displayName: 'Target Species',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'text', group: 'identity', order: 3 },
        mutable: false,
      },

      stage: {
        type: 'string',
        required: true,
        default: 'population_establishment',
        description: 'Current stage of uplift',
        displayName: 'Stage',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'dropdown', group: 'progress', order: 1, icon: '🔬' },
        mutable: true,
      },

      currentGeneration: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Current generation number',
        displayName: 'Current Generation',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'progress', order: 2 },
        mutable: true,
      },

      targetGeneration: {
        type: 'number',
        required: true,
        default: 10,
        description: 'When sapience is expected',
        displayName: 'Target Generation',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'progress', order: 3 },
        mutable: true,
      },

      progressToSapience: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Overall progress to sapience (0-100)',
        displayName: 'Progress to Sapience',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'progress', order: 4, min: 0, max: 100, step: 1, icon: '📊' },
        mutable: true,
      },

      currentIntelligence: {
        type: 'number',
        required: true,
        default: 0.3,
        description: 'Current generation average intelligence',
        displayName: 'Current Intelligence',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'intelligence', order: 1, min: 0, max: 1, step: 0.01, icon: '🧠' },
        mutable: true,
      },

      targetIntelligence: {
        type: 'number',
        required: true,
        default: 0.7,
        description: 'Sapience threshold',
        displayName: 'Target Intelligence',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'intelligence', order: 2 },
        mutable: false,
      },

      populationSize: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Current breeding population size',
        displayName: 'Population Size',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'population', order: 1, icon: '👥' },
        mutable: true,
      },

      geneticDiversity: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Genetic diversity (0-1, track inbreeding)',
        displayName: 'Genetic Diversity',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'population', order: 2, min: 0, max: 1, step: 0.01 },
        mutable: true,
      },

      technologies: {
        type: 'array',
        required: true,
        default: [],
        description: 'Technology modifiers applied',
        displayName: 'Technologies',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'research', order: 1, icon: '🔬' },
        mutable: true,
        itemType: 'object',
      },

      generationResults: {
        type: 'array',
        required: true,
        default: [],
        description: 'History of each generation',
        displayName: 'Generation Results',
        visibility: { player: false, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'history', order: 1 },
        mutable: true,
        itemType: 'object',
      },

      notableEvents: {
        type: 'array',
        required: true,
        default: [],
        description: 'Major milestones',
        displayName: 'Notable Events',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'history', order: 2, icon: '📜' },
        mutable: true,
        itemType: 'string',
      },
    },

    ui: {
      icon: '🧬',
      color: '#00CED1',
      priority: 8,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'world_state',
      priority: 7,
      summarize: (data) => {
        const progress = data.progressToSapience.toFixed(0);
        const intelligence = (data.currentIntelligence * 100).toFixed(0);
        return `Uplift Program "${data.programName}": ${data.sourceSpeciesId} → ${data.targetSpeciesId}, Gen ${data.currentGeneration}/${data.targetGeneration}, ${progress}% progress, ${intelligence}% intelligence`;
      },
    },

    validate: (data): data is UpliftProgramComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const u = data as any;

      return (
        u.type === 'uplift_program' &&
        typeof u.programName === 'string' &&
        typeof u.currentGeneration === 'number' &&
        typeof u.stage === 'string'
      );
    },

    createDefault: () => ({
      type: 'uplift_program',
      version: 1,
      programId: `uplift_${Date.now()}`,
      programName: 'Unnamed Program',
      sourceSpeciesId: '',
      targetSpeciesId: '',
      facilityId: '',
      leadScientistId: '',
      geneticistIds: [],
      breedingPopulation: [],
      populationSize: 0,
      minimumPopulation: 20,
      geneticDiversity: 1.0,
      currentGeneration: 0,
      targetGeneration: 10,
      baseGenerations: 10,
      acceleratedGenerations: 10,
      stage: 'population_establishment',
      progressToNextGeneration: 0,
      progressToSapience: 0,
      baselineIntelligence: 0.3,
      currentIntelligence: 0.3,
      targetIntelligence: 0.7,
      technologies: [],
      researchPapers: [],
      paperBonus: 0,
      energyPerGeneration: 1000,
      materialsPerGeneration: {},
      totalEnergyConsumed: 0,
      totalMaterialsConsumed: {},
      generationResults: [],
      startedAt: 0,
      lastGenerationAt: 0,
      estimatedCompletionAt: 0,
      notableEvents: [],
    }),
  })
);
