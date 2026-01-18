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
      const u = data as Record<string, unknown>;

      if (!('type' in u) || u.type !== 'uplifted_trait') return false;
      if (!('version' in u) || typeof u.version !== 'number') return false;

      if (!('programId' in u) || typeof u.programId !== 'string') return false;
      if (!('sourceSpeciesId' in u) || typeof u.sourceSpeciesId !== 'string') return false;
      if (!('upliftedSpeciesId' in u) || typeof u.upliftedSpeciesId !== 'string') return false;
      if (!('generation' in u) || typeof u.generation !== 'number') return false;
      if (!('sapientSince' in u) || typeof u.sapientSince !== 'number') return false;

      // Optional awakeningMoment
      if ('awakeningMoment' in u && u.awakeningMoment !== undefined) {
        if (typeof u.awakeningMoment !== 'object' || u.awakeningMoment === null) return false;
        const awakening = u.awakeningMoment as Record<string, unknown>;
        if (!('tick' in awakening) || typeof awakening.tick !== 'number') return false;
        if (!('generation' in awakening) || typeof awakening.generation !== 'number') return false;
        if (!('firstThought' in awakening) || typeof awakening.firstThought !== 'string') return false;
        if (!('firstQuestion' in awakening) || typeof awakening.firstQuestion !== 'string') return false;
        if (!('firstEmotion' in awakening) || typeof awakening.firstEmotion !== 'string') return false;
        if (!('firstWord' in awakening) || typeof awakening.firstWord !== 'string') return false;
        if (!('witnessIds' in awakening) || !Array.isArray(awakening.witnessIds)) return false;
        if (!awakening.witnessIds.every((item) => typeof item === 'string')) return false;
      }

      if (!('naturalBorn' in u) || typeof u.naturalBorn !== 'boolean') return false;
      if (!('givenName' in u) || typeof u.givenName !== 'string') return false;

      // Optional chosenName
      if ('chosenName' in u && u.chosenName !== undefined && typeof u.chosenName !== 'string') return false;

      if (!('understandsOrigin' in u) || typeof u.understandsOrigin !== 'boolean') return false;

      if (!('attitude' in u) || typeof u.attitude !== 'string') return false;
      const validAttitudes = ['grateful', 'resentful', 'neutral', 'conflicted', 'reverent', 'rebellious'];
      if (!validAttitudes.includes(u.attitude as string)) return false;

      if (!('retainedInstincts' in u) || !Array.isArray(u.retainedInstincts)) return false;
      if (!u.retainedInstincts.every((item) => typeof item === 'string')) return false;

      if (!('enhancedAbilities' in u) || !Array.isArray(u.enhancedAbilities)) return false;
      if (!u.enhancedAbilities.every((item) => typeof item === 'string')) return false;

      if (!('legalStatus' in u) || typeof u.legalStatus !== 'string') return false;
      const validLegalStatuses = ['citizen', 'ward', 'property', 'undefined'];
      if (!validLegalStatuses.includes(u.legalStatus as string)) return false;

      if (!('culturalIdentity' in u) || typeof u.culturalIdentity !== 'string') return false;
      const validCulturalIdentities = ['uplifter', 'source_species', 'hybrid', 'new'];
      if (!validCulturalIdentities.includes(u.culturalIdentity as string)) return false;

      // Optional leadScientistId
      if ('leadScientistId' in u && u.leadScientistId !== undefined && typeof u.leadScientistId !== 'string') return false;

      // Optional creatorRelationship
      if ('creatorRelationship' in u && u.creatorRelationship !== undefined && typeof u.creatorRelationship !== 'string') return false;

      return true;
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
