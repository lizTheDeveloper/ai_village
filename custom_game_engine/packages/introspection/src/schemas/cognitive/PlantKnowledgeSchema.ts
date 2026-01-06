/**
 * PlantKnowledge Component Schema
 *
 * Tracks agent's knowledge about plants and their properties.
 * Agents must discover properties through experimentation, teaching, or observation.
 * Tier 16: Miscellaneous (cognitive/knowledge).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Plant knowledge component type
 */
export interface PlantKnowledgeComponent extends Component {
  type: 'plant_knowledge';
  version: 1;

  knowledge: Record<string, {
    plantId: string;
    knowsEdible: boolean | 'unknown';
    knowsToxic: boolean | 'unknown';
    medicinal: 'unknown' | {
      knownTreats?: string[];
      estimatedEffectiveness?: number;
      knownPreparations?: string[];
      knownSideEffects?: string[];
      knowsToxicity?: boolean;
    };
    magical: 'unknown' | {
      knownMagicType?: string;
      estimatedPotency?: number;
      knownEffects?: string[];
      knownHarvestConditions?: string[];
    };
    crafting: 'unknown' | {
      knownDyeColor?: string;
      knowsFiber?: boolean;
      knowsOil?: boolean;
      knownScent?: string;
      knowsPoison?: boolean;
      knowsStructural?: boolean;
    };
    discoveryMethod: 'experimentation' | 'taught' | 'observation' | 'accident' | 'innate';
    discoveredAt: number;
    taughtBy?: string;
    confidence: 'uncertain' | 'likely' | 'confident' | 'certain';
    usageCount: number;
    misconceptions?: string[];
  }>;
  encounteredPlants: string[];
  herbalistSkill: number;
}

/**
 * Plant knowledge component schema
 */
export const PlantKnowledgeSchema = autoRegister(
  defineComponent<PlantKnowledgeComponent>({
    type: 'plant_knowledge',
    version: 1,
    category: 'cognitive',
    description: 'Agent\'s knowledge about plants and their properties',

    fields: {
      knowledge: {
        type: 'object',
        required: true,
        default: {},
        description: 'Knowledge entries keyed by plant species ID',
        displayName: 'Plant Knowledge',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'json', group: 'knowledge', order: 1, icon: '🌿' },
        mutable: true,
      },

      encounteredPlants: {
        type: 'array',
        required: true,
        default: [],
        description: 'Plants the agent has encountered but not studied',
        displayName: 'Encountered Plants',
        visibility: { player: false, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'knowledge', order: 2 },
        mutable: true,
        itemType: 'string',
      },

      herbalistSkill: {
        type: 'number',
        required: true,
        default: 10,
        description: 'Skill in discovering plant properties (0-100)',
        displayName: 'Herbalist Skill',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: { widget: 'slider', group: 'skills', order: 1, min: 0, max: 100, step: 1, icon: '🌿' },
        mutable: true,
      },
    },

    ui: {
      icon: '🌿',
      color: '#228B22',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'knowledge',
      priority: 6,
      summarize: (data) => {
        const knownCount = Object.keys(data.knowledge).length;
        if (knownCount === 0) return '';

        const medicinalCount = Object.values(data.knowledge).filter(k => k.medicinal !== 'unknown').length;
        const magicalCount = Object.values(data.knowledge).filter(k => k.magical !== 'unknown').length;
        const skill = data.herbalistSkill;

        const parts: string[] = [`knows ${knownCount} plants`];
        if (medicinalCount > 0) parts.push(`${medicinalCount} medicinal`);
        if (magicalCount > 0) parts.push(`${magicalCount} magical`);
        if (skill >= 70) parts.push('expert herbalist');
        else if (skill >= 40) parts.push('skilled herbalist');

        return `Plant Knowledge: ${parts.join(', ')}`;
      },
    },

    validate: (data): data is PlantKnowledgeComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const p = data as any;

      return (
        p.type === 'plant_knowledge' &&
        typeof p.knowledge === 'object' &&
        Array.isArray(p.encounteredPlants) &&
        typeof p.herbalistSkill === 'number'
      );
    },

    createDefault: () => ({
      type: 'plant_knowledge',
      version: 1,
      knowledge: {},
      encounteredPlants: [],
      herbalistSkill: 10,
    }),
  })
);
