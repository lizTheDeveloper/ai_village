/**
 * UpliftedTrait Component Schema
 *
 * Marks an entity as genetically uplifted to sapience.
 * Tracks origin, awakening moment, and relationship to uplifters.
 * Tier 16: Miscellaneous (agent/identity).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Uplifted trait component type
 */
export interface UpliftedTraitComponent extends Component {
  type: 'uplifted_trait';
  version: 1;

  programId: string;
  sourceSpeciesId: string;
  upliftedSpeciesId: string;
  generation: number;
  sapientSince: number;
  awakeningMoment?: {
    tick: number;
    generation: number;
    firstThought: string;
    firstQuestion: string;
    firstEmotion: string;
    firstWord: string;
    witnessIds: string[];
  };
  naturalBorn: boolean;
  givenName: string;
  chosenName?: string;
  understandsOrigin: boolean;
  attitude: 'grateful' | 'resentful' | 'neutral' | 'conflicted' | 'reverent' | 'rebellious';
  retainedInstincts: string[];
  enhancedAbilities: string[];
  legalStatus: 'citizen' | 'ward' | 'property' | 'undefined';
  culturalIdentity: 'uplifter' | 'source_species' | 'hybrid' | 'new';
  leadScientistId?: string;
  creatorRelationship?: string;
}

/**
 * Uplifted trait component schema
 */
export const UpliftedTraitSchema = autoRegister(
  defineComponent<UpliftedTraitComponent>({
    type: 'uplifted_trait',
    version: 1,
    category: 'agent',
    description: 'Marks an entity as genetically uplifted to sapience',

    fields: {
      programId: {
        type: 'string',
        required: true,
        default: '',
        description: 'Uplift program ID',
        displayName: 'Program ID',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'text', group: 'origin', order: 1 },
        mutable: false,
      },

      sourceSpeciesId: {
        type: 'string',
        required: true,
        default: '',
        description: 'Original animal species',
        displayName: 'Source Species',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'text', group: 'origin', order: 2, icon: '🧬' },
        mutable: false,
      },

      upliftedSpeciesId: {
        type: 'string',
        required: true,
        default: '',
        description: 'New uplifted species ID',
        displayName: 'Uplifted Species',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'text', group: 'origin', order: 3, icon: '✨' },
        mutable: false,
      },

      generation: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Which generation (0 = first uplifted)',
        displayName: 'Generation',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'readonly', group: 'origin', order: 4 },
        mutable: false,
      },

      sapientSince: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Tick of awakening',
        displayName: 'Sapient Since',
        visibility: { player: false, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'awakening', order: 1 },
        mutable: false,
      },

      naturalBorn: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'True if born sapient (gen 1+)',
        displayName: 'Natural Born',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'awakening', order: 2 },
        mutable: false,
      },

      givenName: {
        type: 'string',
        required: true,
        default: 'Unnamed',
        description: 'Name given by uplifters',
        displayName: 'Given Name',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: { widget: 'text', group: 'identity', order: 1, icon: '👤' },
        mutable: true,
      },

      chosenName: {
        type: 'string',
        required: false,
        description: 'Name they chose for themselves',
        displayName: 'Chosen Name',
        visibility: { player: true, llm: true, agent: true, user: true, dev: true },
        ui: { widget: 'text', group: 'identity', order: 2, icon: '✨' },
        mutable: true,
      },

      understandsOrigin: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Knows they were engineered',
        displayName: 'Understands Origin',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'awareness', order: 1 },
        mutable: true,
      },

      attitude: {
        type: 'string',
        required: true,
        default: 'neutral',
        description: 'Attitude towards uplifters',
        displayName: 'Attitude',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'dropdown', group: 'awareness', order: 2, icon: '💭' },
        mutable: true,
      },

      retainedInstincts: {
        type: 'array',
        required: true,
        default: [],
        description: 'Animal instincts still present',
        displayName: 'Retained Instincts',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'json', group: 'traits', order: 1 },
        mutable: true,
        itemType: 'string',
      },

      enhancedAbilities: {
        type: 'array',
        required: true,
        default: [],
        description: 'New sapient abilities',
        displayName: 'Enhanced Abilities',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'json', group: 'traits', order: 2 },
        mutable: true,
        itemType: 'string',
      },

      legalStatus: {
        type: 'string',
        required: true,
        default: 'undefined',
        description: 'Legal status in society',
        displayName: 'Legal Status',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'dropdown', group: 'social', order: 1, icon: '⚖️' },
        mutable: true,
      },

      culturalIdentity: {
        type: 'string',
        required: true,
        default: 'new',
        description: 'Cultural identity',
        displayName: 'Cultural Identity',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'dropdown', group: 'social', order: 2 },
        mutable: true,
      },
    },

    ui: {
      icon: '✨',
      color: '#9370DB',
      priority: 9,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'identity',
      priority: 9,
      summarize: (data) => {
        const name = data.chosenName || data.givenName;
        const genStr = data.generation === 0 ? 'first generation' : `generation ${data.generation}`;
        const attitude = data.attitude !== 'neutral' ? `, ${data.attitude}` : '';
        return `Uplifted (${data.sourceSpeciesId} → ${data.upliftedSpeciesId}): ${name}, ${genStr}${attitude}`;
      },
    },

    validate: (data): data is UpliftedTraitComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const u = data as any;

      return (
        u.type === 'uplifted_trait' &&
        typeof u.programId === 'string' &&
        typeof u.sourceSpeciesId === 'string' &&
        typeof u.generation === 'number' &&
        typeof u.givenName === 'string'
      );
    },

    createDefault: () => ({
      type: 'uplifted_trait',
      version: 1,
      programId: '',
      sourceSpeciesId: '',
      upliftedSpeciesId: '',
      generation: 0,
      sapientSince: 0,
      awakeningMoment: undefined,
      naturalBorn: false,
      givenName: 'Unnamed',
      chosenName: undefined,
      understandsOrigin: false,
      attitude: 'neutral',
      retainedInstincts: [],
      enhancedAbilities: [],
      legalStatus: 'undefined',
      culturalIdentity: 'new',
      leadScientistId: undefined,
      creatorRelationship: undefined,
    }),
  })
);
