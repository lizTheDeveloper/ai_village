/**
 * TechnologyUnlock Component Schema
 *
 * Global technology/building unlock tracker (singleton).
 * Tier 15: Automation/Manufacturing.
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Technology unlock component type
 */
export interface TechnologyUnlockComponent extends Component {
  type: 'technology_unlock';
  version: 1;

  unlockedBuildings: Map<string, {
    buildingType: string;
    unlockedTick: number;
    unlockedByCity?: string;
    era: 'primitive' | 'agricultural' | 'industrial' | 'modern' | 'information';
  }>;
  unlockedTechnologies: Map<string, {
    technologyId: string;
    name: string;
    unlockedTick: number;
    unlockedBy?: string;
    effect: string;
  }>;
  playerCityId: string | null;
  universityCollaborationEnabled: boolean;
  internetResearchBoostEnabled: boolean;
  globalResearchMultiplier: number;
}

/**
 * Technology unlock component schema
 */
export const TechnologyUnlockSchema = autoRegister(
  defineComponent<TechnologyUnlockComponent>({
    type: 'technology_unlock',
    version: 1,
    category: 'world',
    description: 'Global technology and building unlock tracker',

    fields: {
      unlockedBuildings: {
        type: 'object',
        required: true,
        default: new Map(),
        description: 'Map of buildingType → unlock info',
        displayName: 'Unlocked Buildings',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'unlocks', order: 1, icon: '🏛️' },
        mutable: true,
      },

      unlockedTechnologies: {
        type: 'object',
        required: true,
        default: new Map(),
        description: 'Map of technologyId → unlock info',
        displayName: 'Unlocked Technologies',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'unlocks', order: 2, icon: '🔬' },
        mutable: true,
      },

      playerCityId: {
        type: 'string',
        required: false,
        description: 'Player\'s city ID (the "first mover")',
        displayName: 'Player City',
        visibility: { player: false, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'text', group: 'meta', order: 1 },
        mutable: true,
      },

      universityCollaborationEnabled: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is university research collaboration enabled?',
        displayName: 'University Collaboration',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'research', order: 1 },
        mutable: true,
      },

      internetResearchBoostEnabled: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is internet research sharing enabled?',
        displayName: 'Internet Research Boost',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'research', order: 2 },
        mutable: true,
      },

      globalResearchMultiplier: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Research multiplier from internet (default 1.0, boosted when internet enabled)',
        displayName: 'Research Multiplier',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'slider', group: 'research', order: 3, min: 1.0, max: 10.0, step: 0.1 },
        mutable: true,
      },
    },

    ui: {
      icon: '🔓',
      color: '#FFD700',
      priority: 8,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'world_state',
      priority: 5,
      summarize: (data) => {
        const buildingCount = data.unlockedBuildings.size;
        const techCount = data.unlockedTechnologies.size;
        const boosts: string[] = [];
        if (data.universityCollaborationEnabled) boosts.push('university collaboration');
        if (data.internetResearchBoostEnabled) boosts.push(`internet boost (${data.globalResearchMultiplier}x)`);
        const boostStr = boosts.length > 0 ? ` - ${boosts.join(', ')}` : '';
        return `Technology: ${buildingCount} buildings, ${techCount} technologies unlocked${boostStr}`;
      },
    },

    validate: (data): data is TechnologyUnlockComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const t = data as Record<string, unknown>;

      return (
        t.type === 'technology_unlock' &&
        typeof t.universityCollaborationEnabled === 'boolean' &&
        typeof t.internetResearchBoostEnabled === 'boolean' &&
        typeof t.globalResearchMultiplier === 'number'
      );
    },

    createDefault: () => ({
      type: 'technology_unlock',
      version: 1,
      unlockedBuildings: new Map(),
      unlockedTechnologies: new Map(),
      playerCityId: null,
      universityCollaborationEnabled: false,
      internetResearchBoostEnabled: false,
      globalResearchMultiplier: 1.0,
    }),
  })
);
