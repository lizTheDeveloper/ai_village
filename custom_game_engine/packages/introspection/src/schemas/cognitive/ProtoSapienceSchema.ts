/**
 * ProtoSapience Component Schema
 *
 * Tracks proto-sapient behaviors emerging during uplift.
 * Animals in late-stage uplift (generations N-3 to N-1) show proto-sapient
 * behaviors before full sapience emerges.
 * Tier 16: Miscellaneous (cognitive/evolution).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Proto-sapience component type
 */
export interface ProtoSapienceComponent extends Component {
  type: 'proto_sapience';
  version: 1;

  intelligence: number;
  preSapienceThreshold: number;
  sapienceThreshold: number;
  usesTools: boolean;
  createsTools: boolean;
  toolRecords: Array<{
    toolType: string;
    purpose: string;
    observedAt: number;
    teachingOthers: boolean;
  }>;
  teachesToolUse: boolean;
  communicationComplexity: number;
  hasProtocolanguage: boolean;
  communicationPatterns: Array<{
    pattern: string;
    meaning: string;
    consistency: number;
    sharedBy: string[];
  }>;
  vocabularySize: number;
  solvesPuzzles: boolean;
  plansFuture: boolean;
  abstractThinking: boolean;
  problemSolvingScore: number;
  behavioralTests: string[];
  passedMirrorTest: boolean;
  recognizesSelf: boolean;
  understandsOthersHaveMinds: boolean;
  mirrorTestAttempts: number;
  teachesYoung: boolean;
  learnsByObservation: boolean;
  socialLearningEvents: number;
  hasCulturalTraditions: boolean;
  traditions: string[];
  generationBorn: number;
  parentIntelligence: number;
  expectedGenerationToSapience: number;
}

/**
 * Proto-sapience component schema
 */
export const ProtoSapienceSchema = autoRegister(
  defineComponent<ProtoSapienceComponent>({
    type: 'proto_sapience',
    version: 1,
    category: 'cognitive',
    description: 'Tracks proto-sapient behaviors emerging during uplift',

    fields: {
      intelligence: {
        type: 'number',
        required: true,
        default: 0.5,
        description: 'Current intelligence level (0-1)',
        displayName: 'Intelligence',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'intelligence', order: 1, min: 0, max: 1, step: 0.01, icon: '🧠' },
        mutable: true,
      },

      sapienceThreshold: {
        type: 'number',
        required: true,
        default: 0.7,
        description: 'Threshold for full sapience',
        displayName: 'Sapience Threshold',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'intelligence', order: 2 },
        mutable: false,
      },

      usesTools: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Uses tools',
        displayName: 'Uses Tools',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'abilities', order: 1, icon: '🔧' },
        mutable: true,
      },

      createsTools: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Not just uses, but creates tools',
        displayName: 'Creates Tools',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'abilities', order: 2, icon: '⚒️' },
        mutable: true,
      },

      hasProtocolanguage: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Has developed proto-language',
        displayName: 'Proto-Language',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'communication', order: 1, icon: '💬' },
        mutable: true,
      },

      vocabularySize: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of distinct "words"',
        displayName: 'Vocabulary Size',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'communication', order: 2 },
        mutable: true,
      },

      passedMirrorTest: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Passed mirror self-recognition test',
        displayName: 'Passed Mirror Test',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'self_awareness', order: 1, icon: '🪞' },
        mutable: true,
      },

      understandsOthersHaveMinds: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Theory of mind',
        displayName: 'Theory of Mind',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'self_awareness', order: 2 },
        mutable: true,
      },

      hasCulturalTraditions: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Has cultural traditions',
        displayName: 'Cultural Traditions',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'culture', order: 1, icon: '🎭' },
        mutable: true,
      },

      traditions: {
        type: 'array',
        required: true,
        default: [],
        description: 'Observed cultural behaviors',
        displayName: 'Traditions',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'culture', order: 2 },
        mutable: true,
        itemType: 'string',
      },

      generationBorn: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Generation born',
        displayName: 'Generation',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'emergence', order: 1 },
        mutable: false,
      },

      expectedGenerationToSapience: {
        type: 'number',
        required: true,
        default: 10,
        description: 'Expected generation when sapience emerges',
        displayName: 'Expected Sapience Generation',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'emergence', order: 2 },
        mutable: false,
      },
    },

    ui: {
      icon: '🧠',
      color: '#FF6347',
      priority: 8,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'cognitive_state',
      priority: 8,
      summarize: (data) => {
        const progress = ((data.intelligence / data.sapienceThreshold) * 100).toFixed(0);
        const abilities: string[] = [];
        if (data.createsTools) abilities.push('creates tools');
        else if (data.usesTools) abilities.push('uses tools');
        if (data.hasProtocolanguage) abilities.push('proto-language');
        if (data.passedMirrorTest) abilities.push('self-aware');
        if (data.hasCulturalTraditions) abilities.push('cultural traditions');

        const abilitiesStr = abilities.length > 0 ? ` (${abilities.join(', ')})` : '';
        return `Proto-Sapience: ${progress}% to sapience${abilitiesStr}`;
      },
    },

    validate: (data): data is ProtoSapienceComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const p = data as Record<string, unknown>;

      // Validate required fields
      if (!('type' in p) || p.type !== 'proto_sapience') return false;
      if (!('intelligence' in p) || typeof p.intelligence !== 'number') return false;
      if (!('usesTools' in p) || typeof p.usesTools !== 'boolean') return false;
      if (!('hasProtocolanguage' in p) || typeof p.hasProtocolanguage !== 'boolean') return false;

      return true;
    },

    createDefault: () => ({
      type: 'proto_sapience',
      version: 1,
      intelligence: 0.5,
      preSapienceThreshold: 0.6,
      sapienceThreshold: 0.7,
      usesTools: false,
      createsTools: false,
      toolRecords: [],
      teachesToolUse: false,
      communicationComplexity: 0,
      hasProtocolanguage: false,
      communicationPatterns: [],
      vocabularySize: 0,
      solvesPuzzles: false,
      plansFuture: false,
      abstractThinking: false,
      problemSolvingScore: 0,
      behavioralTests: [],
      passedMirrorTest: false,
      recognizesSelf: false,
      understandsOthersHaveMinds: false,
      mirrorTestAttempts: 0,
      teachesYoung: false,
      learnsByObservation: false,
      socialLearningEvents: 0,
      hasCulturalTraditions: false,
      traditions: [],
      generationBorn: 0,
      parentIntelligence: 0.3,
      expectedGenerationToSapience: 10,
    }),
  })
);
