/**
 * Jealousy Component Schema
 *
 * Tracks jealousy triggers for romantic competition.
 * NOT ALL SPECIES/INDIVIDUALS EXPERIENCE JEALOUSY - some species are
 * naturally polyamorous or have collective bonding.
 *
 * Phase 4+, Tier 10 - Social/Community Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Jealousy component type
 */
export interface JealousyComponent extends Component {
  type: 'jealousy';
  version: 1;

  activeJealousies: Array<{
    type: 'rival_affection' | 'mate_infidelity' | 'ex_moved_on' | 'mate_attention';
    rivalId: string;
    desiredId: string;
    intensity: number;
    discoveredAt: number;
    resolved: boolean;
    resolutionReason?: string;
    notes?: string;
  }>;
  resolvedJealousies: Array<{
    type: 'rival_affection' | 'mate_infidelity' | 'ex_moved_on' | 'mate_attention';
    rivalId: string;
    desiredId: string;
    intensity: number;
    discoveredAt: number;
    resolved: boolean;
    resolutionReason?: string;
    notes?: string;
  }>;
}

/**
 * Jealousy component schema
 */
export const JealousySchema = autoRegister(
  defineComponent<JealousyComponent>({
    type: 'jealousy',
    version: 1,
    category: 'social',

    fields: {
      activeJealousies: {
        type: 'array',
        required: true,
        default: [],
        description: 'Active jealousy situations',
        displayName: 'Active Jealousies',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'jealousy',
          order: 1,
          icon: '😠',
        },
        mutable: true,
        itemType: 'object',
      },

      resolvedJealousies: {
        type: 'array',
        required: true,
        default: [],
        description: 'Resolved jealousies (for memory/narrative)',
        displayName: 'Resolved Jealousies',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'jealousy',
          order: 2,
        },
        mutable: false,
        itemType: 'object',
      },
    },

    ui: {
      icon: '😠',
      color: '#DC143C',
      priority: 10,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'emotions',
      priority: 10,
      summarize: (data) => {
        if (!data.activeJealousies || data.activeJealousies.length === 0) {
          return '';
        }

        const typeDescriptions: Record<string, string> = {
          rival_affection: 'rival courting desired person',
          mate_infidelity: 'mate showing affection to another',
          ex_moved_on: 'ex-lover has new partner',
          mate_attention: 'competing for mate\'s attention',
        };

        const jealousies = data.activeJealousies.map(j => {
          const desc = typeDescriptions[j.type] || j.type;
          const intensityDesc = j.intensity > 0.7 ? 'intensely jealous' : j.intensity > 0.4 ? 'jealous' : 'mildly jealous';
          return `${intensityDesc}: ${desc}`;
        });

        return `Jealousy: ${jealousies.join('; ')}`;
      },
    },

    validate: (data): data is JealousyComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const j = data as any;

      return (
        j.type === 'jealousy' &&
        Array.isArray(j.activeJealousies) &&
        Array.isArray(j.resolvedJealousies)
      );
    },

    createDefault: () => ({
      type: 'jealousy',
      version: 1,
      activeJealousies: [],
      resolvedJealousies: [],
    }),
  })
);
