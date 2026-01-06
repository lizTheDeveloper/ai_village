/**
 * Seed Component Schema
 *
 * Represents a seed entity that can germinate into a plant.
 * Tier 16: Miscellaneous (physical/items).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Seed component type
 */
export interface SeedComponent extends Component {
  type: 'seed';
  version: 1;

  id: string;
  speciesId: string;
  genetics: {
    growthRate: number;
    yieldAmount: number;
    diseaseResistance: number;
    droughtTolerance: number;
    coldTolerance: number;
    flavorProfile: number;
  };
  generation: number;
  parentPlantIds: string[];
  viability: number;
  vigor: number;
  quality: number;
  ageInDays: number;
  dormant: boolean;
  dormancyRequirements?: {
    requiresColdStratification?: boolean;
    coldDaysRequired?: number;
    requiresLight?: boolean;
    requiresScarification?: boolean;
  };
  sourceType: 'wild' | 'cultivated' | 'traded' | 'generated';
  harvestMetadata?: {
    fromPlantId?: string;
    byAgentId?: string;
    timestamp?: number;
  };
  isHybrid: boolean;
  hybridParentSpecies?: [string, string];
}

/**
 * Seed component schema
 */
export const SeedSchema = autoRegister(
  defineComponent<SeedComponent>({
    type: 'seed',
    version: 1,
    category: 'physical',
    description: 'Seed entity that can germinate into a plant',

    fields: {
      id: {
        type: 'string',
        required: true,
        default: '',
        description: 'Unique seed ID',
        displayName: 'Seed ID',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: { widget: 'text', group: 'identity', order: 1 },
        mutable: false,
      },

      speciesId: {
        type: 'string',
        required: true,
        default: '',
        description: 'Plant species ID',
        displayName: 'Species',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: { widget: 'text', group: 'identity', order: 2, icon: '🌱' },
        mutable: false,
      },

      genetics: {
        type: 'object',
        required: true,
        default: {
          growthRate: 1.0,
          yieldAmount: 1.0,
          diseaseResistance: 50,
          droughtTolerance: 50,
          coldTolerance: 50,
          flavorProfile: 50,
        },
        description: 'Genetic traits',
        displayName: 'Genetics',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'genetics', order: 1, icon: '🧬' },
        mutable: false,
      },

      generation: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Generation number (breeding lineage)',
        displayName: 'Generation',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'genetics', order: 2 },
        mutable: false,
      },

      viability: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Chance to germinate (0-1)',
        displayName: 'Viability',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'slider', group: 'quality', order: 1, min: 0, max: 1, step: 0.01, icon: '🌱' },
        mutable: true,
      },

      vigor: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Growth speed modifier (0-100)',
        displayName: 'Vigor',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'quality', order: 2, min: 0, max: 100, step: 0.1 },
        mutable: true,
      },

      quality: {
        type: 'number',
        required: true,
        default: 0.75,
        description: 'Affects offspring quality (0-1)',
        displayName: 'Quality',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'slider', group: 'quality', order: 3, min: 0, max: 1, step: 0.01, icon: '✨' },
        mutable: true,
      },

      ageInDays: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Days since produced',
        displayName: 'Age (Days)',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'state', order: 1 },
        mutable: true,
      },

      dormant: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Needs conditions to break dormancy',
        displayName: 'Dormant',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'state', order: 2, icon: '💤' },
        mutable: true,
      },

      sourceType: {
        type: 'string',
        required: true,
        default: 'generated',
        description: 'Origin of this seed',
        displayName: 'Source Type',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'dropdown', group: 'origin', order: 1 },
        mutable: false,
      },

      isHybrid: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether this seed is from cross-breeding',
        displayName: 'Hybrid',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'genetics', order: 3, icon: '🌸' },
        mutable: false,
      },
    },

    ui: {
      icon: '🌱',
      color: '#8FBC8F',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'items',
      priority: 4,
      summarize: (data) => {
        const viability = (data.viability * 100).toFixed(0);
        const quality = (data.quality * 100).toFixed(0);
        const hybrid = data.isHybrid ? ' (hybrid)' : '';
        const dormant = data.dormant ? ' (dormant)' : '';
        return `Seed (${data.speciesId}): ${viability}% viability, ${quality}% quality${hybrid}${dormant}`;
      },
    },

    validate: (data): data is SeedComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const s = data as any;

      return (
        s.type === 'seed' &&
        typeof s.speciesId === 'string' &&
        typeof s.genetics === 'object' &&
        typeof s.viability === 'number' &&
        s.viability >= 0 &&
        s.viability <= 1
      );
    },

    createDefault: () => ({
      type: 'seed',
      version: 1,
      id: `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      speciesId: '',
      genetics: {
        growthRate: 1.0,
        yieldAmount: 1.0,
        diseaseResistance: 50,
        droughtTolerance: 50,
        coldTolerance: 50,
        flavorProfile: 50,
      },
      generation: 0,
      parentPlantIds: [],
      viability: 1.0,
      vigor: 1.0,
      quality: 0.75,
      ageInDays: 0,
      dormant: false,
      dormancyRequirements: undefined,
      sourceType: 'generated',
      harvestMetadata: undefined,
      isHybrid: false,
      hybridParentSpecies: undefined,
    }),
  })
);
