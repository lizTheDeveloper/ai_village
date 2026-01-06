/**
 * Skills Component Schema
 *
 * Tracks agent expertise levels across skill domains.
 * Skills affect LLM context depth, action efficiency, and memory relevance.
 *
 * Phase 4, Tier 2 - Agent Components
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

/**
 * Skill level (0-5)
 */
export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Skill identifiers
 */
export type SkillId =
  | 'building'
  | 'architecture'
  | 'farming'
  | 'gathering'
  | 'cooking'
  | 'crafting'
  | 'social'
  | 'exploration'
  | 'combat'
  | 'hunting'
  | 'stealth'
  | 'animal_handling'
  | 'medicine'
  | 'research';

/**
 * Skills component type
 */
export interface SkillsComponent extends Component {
  type: 'skills';
  version: 1;

  levels: Record<SkillId, SkillLevel>;
  experience: Record<SkillId, number>;
  totalExperience: Record<SkillId, number>;
  affinities: Record<SkillId, number>;
  domains?: any; // SkillDomainData - kept as 'any' to avoid deep type coupling
  magicProgress?: any; // MagicSkillProgress - kept as 'any' to avoid deep type coupling
}

/**
 * Skill level names for display
 */
const SKILL_LEVEL_NAMES: Record<SkillLevel, string> = {
  0: 'Untrained',
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Expert',
  5: 'Master',
};

/**
 * Skill display names
 */
const SKILL_NAMES: Record<SkillId, string> = {
  building: 'Building',
  architecture: 'Architecture',
  farming: 'Farming',
  gathering: 'Gathering',
  cooking: 'Cooking',
  crafting: 'Crafting',
  social: 'Social',
  exploration: 'Exploration',
  combat: 'Combat',
  hunting: 'Hunting',
  stealth: 'Stealth',
  animal_handling: 'Animal Handling',
  medicine: 'Medicine',
  research: 'Research',
};

/**
 * All skill IDs for iteration
 */
const ALL_SKILL_IDS: readonly SkillId[] = [
  'building',
  'architecture',
  'farming',
  'gathering',
  'cooking',
  'crafting',
  'social',
  'exploration',
  'combat',
  'hunting',
  'stealth',
  'animal_handling',
  'medicine',
  'research',
] as const;

/**
 * Skills component schema
 */
export const SkillsSchema = autoRegister(
  defineComponent<SkillsComponent>({
    type: 'skills',
    version: 1,
    category: 'agent',

    fields: {
      levels: {
        type: 'map',
        itemType: 'number',
        required: true,
        description: 'Current skill levels (0-5) for each skill domain',
        displayName: 'Skill Levels',
        visibility: { player: true, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'skills',
          order: 1,
        },
        mutable: true,
      },

      experience: {
        type: 'map',
        itemType: 'number',
        required: true,
        description: 'Experience points toward next level for each skill',
        displayName: 'Current XP',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'skills',
          order: 2,
        },
        mutable: true,
      },

      totalExperience: {
        type: 'map',
        itemType: 'number',
        required: true,
        description: 'Total XP earned all-time for each skill (for stats)',
        displayName: 'Total XP',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'skills',
          order: 3,
        },
        mutable: true,
      },

      affinities: {
        type: 'map',
        itemType: 'number',
        required: true,
        description: 'Skill affinities (learning speed multiplier, 0.5-2.0)',
        displayName: 'Affinities',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'advanced',
          order: 1,
        },
        mutable: true,
      },

      domains: {
        type: 'object',
        required: false,
        description:
          'Extended domain data (familiarity, specializations, signature tasks)',
        displayName: 'Skill Domains',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'advanced',
          order: 2,
        },
        mutable: false, // Managed by skill systems, not directly editable
      },

      magicProgress: {
        type: 'object',
        required: false,
        description: 'Magic skill tree progress by paradigm ID',
        displayName: 'Magic Progress',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'advanced',
          order: 3,
        },
        mutable: false, // Managed by magic systems, not directly editable
      },
    },

    ui: {
      icon: '📊',
      color: '#2196F3',
      priority: 4,
    },

    llm: {
      promptSection: 'skills',
      priority: 4,
      summarize: (data) => {
        const trainedSkills: string[] = [];

        for (const skillId of ALL_SKILL_IDS) {
          const level = data.levels[skillId];
          if (level > 0) {
            const skillName = SKILL_NAMES[skillId];
            const levelName = SKILL_LEVEL_NAMES[level];
            trainedSkills.push(`${skillName}: ${levelName} (${level})`);
          }
        }

        if (trainedSkills.length === 0) {
          return 'No trained skills';
        }

        // Sort by level (highest first) for priority in prompts
        trainedSkills.sort((a, b) => {
          const levelA = parseInt(a.match(/\((\d)\)/)?.[1] || '0');
          const levelB = parseInt(b.match(/\((\d)\)/)?.[1] || '0');
          return levelB - levelA;
        });

        return trainedSkills.join(', ');
      },
    },

    validate: (data): data is SkillsComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const s = data as any;

      return (
        s.type === 'skills' &&
        typeof s.levels === 'object' &&
        typeof s.experience === 'object' &&
        typeof s.totalExperience === 'object' &&
        typeof s.affinities === 'object'
      );
    },

    createDefault: () => {
      const createDefaultMap = (): Record<SkillId, number> => ({
        building: 0,
        architecture: 0,
        farming: 0,
        gathering: 0,
        cooking: 0,
        crafting: 0,
        social: 0,
        exploration: 0,
        combat: 0,
        hunting: 0,
        stealth: 0,
        animal_handling: 0,
        medicine: 0,
        research: 0,
      });

      const createDefaultAffinities = (): Record<SkillId, number> => ({
        building: 1.0,
        architecture: 1.0,
        farming: 1.0,
        gathering: 1.0,
        cooking: 1.0,
        crafting: 1.0,
        social: 1.0,
        exploration: 1.0,
        combat: 1.0,
        hunting: 1.0,
        stealth: 1.0,
        animal_handling: 1.0,
        medicine: 1.0,
        research: 1.0,
      });

      return {
        type: 'skills',
        version: 1,
        levels: createDefaultMap() as Record<SkillId, SkillLevel>,
        experience: createDefaultMap(),
        totalExperience: createDefaultMap(),
        affinities: createDefaultAffinities(),
      };
    },
  })
);
