/**
 * Needs Component Schema
 *
 * Tracks agent's physical and social needs on a 0.0 to 1.0 scale.
 * 0.0 = critical/empty, 1.0 = full/healthy
 *
 * Phase 4, Tier 2 - Agent Components
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

/**
 * Needs component type
 */
export interface NeedsComponent extends Component {
  type: 'needs';
  version: 1;

  // Physical needs
  hunger: number;
  energy: number;
  health: number;
  thirst: number;
  temperature: number;

  // Social needs
  social: number; // Composite
  socialContact: number; // Need for any interaction
  socialDepth: number; // Need for meaningful conversation
  socialBelonging: number; // Need for community belonging

  // Mental needs
  stimulation: number;

  // Decay rates
  hungerDecayRate: number;
  energyDecayRate: number;

  // Starvation tracking
  ticksAtZeroHunger: number;
  starvationDayMemoriesIssued?: Set<number>;

  // Forward-compatibility
  bodyParts?: any; // NeedsBodyPart[] - kept as 'any' to avoid deep type coupling
}

/**
 * Needs component schema
 */
export const NeedsSchema = autoRegister(
  defineComponent<NeedsComponent>({
    type: 'needs',
    version: 1,
    category: 'agent',

    fields: {
      // ===== PHYSICAL NEEDS =====

      hunger: {
        type: 'number',
        required: true,
        default: 1.0,
        range: [0, 1] as const,
        description: 'Hunger level: 0 = starving, 1 = full',
        displayName: 'Hunger',
        visibility: { player: true, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'physical',
          order: 1,
          icon: '🍽️',
          color: '#FF9800',
        },
        mutable: true,
      },

      energy: {
        type: 'number',
        required: true,
        default: 1.0,
        range: [0, 1] as const,
        description: 'Energy level: 0 = exhausted, 1 = energized',
        displayName: 'Energy',
        visibility: { player: true, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'physical',
          order: 2,
          icon: '⚡',
          color: '#FFC107',
        },
        mutable: true,
      },

      health: {
        type: 'number',
        required: true,
        default: 1.0,
        range: [0, 1] as const,
        description: 'Health level: 0 = dead, 1 = healthy',
        displayName: 'Health',
        visibility: { player: true, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'physical',
          order: 3,
          icon: '❤️',
          color: '#F44336',
        },
        mutable: true,
      },

      thirst: {
        type: 'number',
        required: true,
        default: 1.0,
        range: [0, 1] as const,
        description: 'Hydration level: 0 = dehydrated, 1 = hydrated',
        displayName: 'Thirst',
        visibility: { player: true, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'physical',
          order: 4,
          icon: '💧',
          color: '#2196F3',
        },
        mutable: true,
      },

      temperature: {
        type: 'number',
        required: true,
        default: 37,
        range: [0, 50] as const,
        description: 'Body temperature in Celsius',
        displayName: 'Temperature',
        visibility: { player: false, llm: true, agent: false, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'physical',
          order: 5,
          icon: '🌡️',
        },
        mutable: true,
      },

      // ===== SOCIAL NEEDS =====

      social: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description:
          'Composite social need: 0 = lonely, 1 = satisfied (average of contact/depth/belonging)',
        displayName: 'Social (Composite)',
        visibility: { player: true, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'social',
          order: 1,
          icon: '👥',
          color: '#9C27B0',
        },
        mutable: false, // Calculated from sub-needs
      },

      socialContact: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description:
          'Need for social contact: 0 = desperate for any interaction, 1 = satisfied',
        displayName: 'Social Contact',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'social',
          order: 2,
          icon: '🗣️',
        },
        mutable: true,
      },

      socialDepth: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description:
          'Need for meaningful conversation: 0 = starving for depth, 1 = satisfied',
        displayName: 'Social Depth',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'social',
          order: 3,
          icon: '💭',
        },
        mutable: true,
      },

      socialBelonging: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description:
          'Need for belonging: 0 = isolated and disconnected, 1 = fully belonging',
        displayName: 'Social Belonging',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'social',
          order: 4,
          icon: '🏘️',
        },
        mutable: true,
      },

      // ===== MENTAL NEEDS =====

      stimulation: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Mental stimulation: 0 = bored, 1 = engaged',
        displayName: 'Stimulation',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'mental',
          order: 1,
          icon: '🧠',
        },
        mutable: true,
      },

      // ===== DECAY RATES =====

      hungerDecayRate: {
        type: 'number',
        required: true,
        default: 0.001,
        range: [0, 0.1] as const,
        description: 'Rate of hunger decay per game tick',
        displayName: 'Hunger Decay Rate',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'number',
          group: 'advanced',
          order: 1,
        },
        mutable: true,
      },

      energyDecayRate: {
        type: 'number',
        required: true,
        default: 0.0005,
        range: [0, 0.1] as const,
        description: 'Rate of energy decay per game tick',
        displayName: 'Energy Decay Rate',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'number',
          group: 'advanced',
          order: 2,
        },
        mutable: true,
      },

      // ===== STARVATION TRACKING =====

      ticksAtZeroHunger: {
        type: 'number',
        required: true,
        default: 0,
        description:
          'Tracks how many ticks hunger has been at exactly 0 (for starvation mechanics)',
        displayName: 'Ticks at Zero Hunger',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'advanced',
          order: 3,
        },
        mutable: false, // Managed by NeedsSystem
      },

      starvationDayMemoriesIssued: {
        type: 'object',
        required: false,
        description:
          'Set of starvation milestone days (1, 2, 3, 4) that have been recorded',
        displayName: 'Starvation Milestones',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'advanced',
          order: 4,
        },
        mutable: false, // Managed by NeedsSystem
      },

      // ===== FORWARD-COMPATIBILITY =====

      bodyParts: {
        type: 'array',
        itemType: 'object',
        required: false,
        description: 'Individual body part health tracking (future: combat system)',
        displayName: 'Body Parts',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'advanced',
          order: 5,
        },
        mutable: false, // Managed by combat/medical systems
      },
    },

    ui: {
      icon: '💚',
      color: '#4CAF50',
      priority: 2,
    },

    llm: {
      promptSection: 'needs',
      priority: 2,
      summarize: (data) => {
        const statuses: string[] = [];

        // Critical status first
        if (data.health < 0.2) statuses.push('critically injured');
        else if (data.health < 0.5) statuses.push('injured');

        if (data.hunger < 0.1) statuses.push('starving');
        else if (data.hunger < 0.3) statuses.push('very hungry');
        else if (data.hunger < 0.5) statuses.push('hungry');

        if (data.energy < 0.1) statuses.push('exhausted');
        else if (data.energy < 0.3) statuses.push('tired');

        if (data.thirst < 0.3) statuses.push('thirsty');

        // Social needs
        if (data.socialContact < 0.3) statuses.push('lonely');
        if (data.socialDepth < 0.4) statuses.push('craving meaningful conversation');
        if (data.socialBelonging < 0.3) statuses.push('feeling isolated');

        // Mental stimulation
        if (data.stimulation < 0.3) statuses.push('bored');

        // Temperature (only if extreme)
        if (data.temperature < 35) statuses.push('cold');
        else if (data.temperature > 39) statuses.push('feverish');

        if (statuses.length === 0) {
          return 'Healthy and content';
        }

        return statuses.join(', ');
      },
    },

    validate: (data): data is NeedsComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const n = data as Record<string, unknown>;

      // Required type field
      if (!('type' in n) || n.type !== 'needs') return false;

      // Physical needs (required)
      if (!('hunger' in n) || typeof n.hunger !== 'number') return false;
      if (!('energy' in n) || typeof n.energy !== 'number') return false;
      if (!('health' in n) || typeof n.health !== 'number') return false;
      if (!('thirst' in n) || typeof n.thirst !== 'number') return false;
      if (!('temperature' in n) || typeof n.temperature !== 'number') return false;

      // Social needs (required)
      if (!('social' in n) || typeof n.social !== 'number') return false;
      if (!('socialContact' in n) || typeof n.socialContact !== 'number') return false;
      if (!('socialDepth' in n) || typeof n.socialDepth !== 'number') return false;
      if (!('socialBelonging' in n) || typeof n.socialBelonging !== 'number') return false;

      // Mental needs (required)
      if (!('stimulation' in n) || typeof n.stimulation !== 'number') return false;

      // Decay rates (required)
      if (!('hungerDecayRate' in n) || typeof n.hungerDecayRate !== 'number') return false;
      if (!('energyDecayRate' in n) || typeof n.energyDecayRate !== 'number') return false;

      // Starvation tracking (required)
      if (!('ticksAtZeroHunger' in n) || typeof n.ticksAtZeroHunger !== 'number') return false;

      // Optional fields - starvationDayMemoriesIssued and bodyParts
      // No validation needed for optional fields

      return true;
    },

    createDefault: () => ({
      type: 'needs',
      version: 1,
      hunger: 1.0,
      energy: 1.0,
      health: 1.0,
      thirst: 1.0,
      temperature: 37,
      social: 0.5,
      socialContact: 0.5,
      socialDepth: 0.5,
      socialBelonging: 0.5,
      stimulation: 0.5,
      hungerDecayRate: 0.001,
      energyDecayRate: 0.0005,
      ticksAtZeroHunger: 0,
    }),
  })
);
