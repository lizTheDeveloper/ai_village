/**
 * Personality Component Schema
 *
 * Defines Big Five personality traits + game-specific traits.
 * All traits are on a 0-1.0 scale.
 *
 * Phase 4, Tier 2 - Agent Components
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

/**
 * Personality component type
 */
export interface PersonalityComponent extends Component {
  type: 'personality';
  version: 1;

  // Big Five traits
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;

  // Game-specific traits
  workEthic: number;
  creativity: number;
  generosity: number;
  leadership: number;
  spirituality: number;
}

/**
 * Personality component schema
 */
export const PersonalitySchema = autoRegister(
  defineComponent<PersonalityComponent>({
    type: 'personality',
    version: 1,
    category: 'agent',

    fields: {
      // ===== BIG FIVE TRAITS =====

      openness: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Openness: 0 = cautious/traditional, 1 = curious/adventurous',
        displayName: 'Openness',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'big_five',
          order: 1,
          icon: '🔍',
        },
        mutable: true,
      },

      conscientiousness: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description:
          'Conscientiousness: 0 = spontaneous/flexible, 1 = organized/disciplined',
        displayName: 'Conscientiousness',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'big_five',
          order: 2,
          icon: '📋',
        },
        mutable: true,
      },

      extraversion: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Extraversion: 0 = quiet/introspective, 1 = outgoing/social',
        displayName: 'Extraversion',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'big_five',
          order: 3,
          icon: '💬',
        },
        mutable: true,
      },

      agreeableness: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description:
          'Agreeableness: 0 = independent/competitive, 1 = helpful/cooperative',
        displayName: 'Agreeableness',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'big_five',
          order: 4,
          icon: '🤝',
        },
        mutable: true,
      },

      neuroticism: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Neuroticism: 0 = resilient, 1 = sensitive',
        displayName: 'Neuroticism',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'big_five',
          order: 5,
          icon: '😰',
        },
        mutable: true,
      },

      // ===== GAME-SPECIFIC TRAITS =====

      workEthic: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Work ethic: 0 = relaxed/carefree, 1 = hardworking/dedicated',
        displayName: 'Work Ethic',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'game_traits',
          order: 1,
          icon: '💪',
        },
        mutable: true,
      },

      creativity: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Creativity: 0 = conventional, 1 = innovative',
        displayName: 'Creativity',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'game_traits',
          order: 2,
          icon: '🎨',
        },
        mutable: true,
      },

      generosity: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Generosity: 0 = self-focused, 1 = sharing/helping',
        displayName: 'Generosity',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'game_traits',
          order: 3,
          icon: '🎁',
        },
        mutable: true,
      },

      leadership: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Leadership: 0 = prefers to follow, 1 = natural leader',
        displayName: 'Leadership',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'game_traits',
          order: 4,
          icon: '👑',
        },
        mutable: true,
      },

      spirituality: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description:
          'Spirituality: 0 = skeptical/rational, 1 = deeply spiritual/divine connection',
        displayName: 'Spirituality',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'game_traits',
          order: 5,
          icon: '✨',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🎭',
      color: '#9C27B0',
      priority: 3,
    },

    llm: {
      promptSection: 'personality',
      priority: 3,
      summarize: (data) => {
        const traits: string[] = [];

        // Big Five (only show extreme values to keep prompt concise)
        if (data.openness > 0.7) traits.push('curious and adventurous');
        else if (data.openness < 0.3) traits.push('cautious and traditional');

        if (data.extraversion > 0.7) traits.push('outgoing and social');
        else if (data.extraversion < 0.3) traits.push('quiet and introspective');

        if (data.agreeableness > 0.7) traits.push('helpful and cooperative');
        else if (data.agreeableness < 0.3) traits.push('independent and competitive');

        if (data.conscientiousness > 0.7) traits.push('organized and disciplined');
        else if (data.conscientiousness < 0.3)
          traits.push('spontaneous and flexible');

        // Game-specific traits (always show if extreme)
        if (data.workEthic > 0.7) traits.push('hardworking and dedicated');
        else if (data.workEthic < 0.3) traits.push('relaxed and carefree');

        if (data.leadership > 0.7) traits.push('natural leader');
        else if (data.leadership < 0.3) traits.push('prefers to follow');

        if (data.spirituality > 0.7) traits.push('deeply spiritual');
        else if (data.spirituality < 0.3) traits.push('skeptical and rational');

        return traits.length > 0 ? traits.join(', ') : 'balanced temperament';
      },
    },

    validate: (data): data is PersonalityComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const p = data as Record<string, unknown>;

      return (
        'type' in p &&
        p.type === 'personality' &&
        'openness' in p &&
        typeof p.openness === 'number' &&
        p.openness >= 0 &&
        p.openness <= 1 &&
        'conscientiousness' in p &&
        typeof p.conscientiousness === 'number' &&
        p.conscientiousness >= 0 &&
        p.conscientiousness <= 1 &&
        'extraversion' in p &&
        typeof p.extraversion === 'number' &&
        p.extraversion >= 0 &&
        p.extraversion <= 1 &&
        'agreeableness' in p &&
        typeof p.agreeableness === 'number' &&
        p.agreeableness >= 0 &&
        p.agreeableness <= 1 &&
        'neuroticism' in p &&
        typeof p.neuroticism === 'number' &&
        p.neuroticism >= 0 &&
        p.neuroticism <= 1 &&
        'workEthic' in p &&
        typeof p.workEthic === 'number' &&
        p.workEthic >= 0 &&
        p.workEthic <= 1 &&
        'creativity' in p &&
        typeof p.creativity === 'number' &&
        p.creativity >= 0 &&
        p.creativity <= 1 &&
        'generosity' in p &&
        typeof p.generosity === 'number' &&
        p.generosity >= 0 &&
        p.generosity <= 1 &&
        'leadership' in p &&
        typeof p.leadership === 'number' &&
        p.leadership >= 0 &&
        p.leadership <= 1 &&
        'spirituality' in p &&
        typeof p.spirituality === 'number' &&
        p.spirituality >= 0 &&
        p.spirituality <= 1
      );
    },

    createDefault: () => ({
      type: 'personality',
      version: 1,
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
      workEthic: 0.5,
      creativity: 0.5,
      generosity: 0.5,
      leadership: 0.5,
      spirituality: 0.5,
    }),
  })
);
