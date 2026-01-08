/**
 * Combat Stats Component Schema
 *
 * Combat-specific statistics for agents
 * Phase 4, Tier 2 - Agent Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Combat stats component type
 * Matches: packages/core/src/components/CombatStatsComponent.ts
 */
export interface CombatStatsComponent extends Component {
  type: 'combat_stats';
  version: 1;
  combatSkill: number;
  huntingSkill?: number;
  stealthSkill?: number;
  displaySkill?: number;
  resourceHolding?: number;
  craftingSkill?: number;
  socialSkill?: number;
  weapon?: string | null;
  armor?: string | null;
}

/**
 * Combat stats component schema
 */
export const CombatStatsSchema = autoRegister(
  defineComponent<CombatStatsComponent>({
    type: 'combat_stats',
    version: 1,
    category: 'agent',

    fields: {
      combatSkill: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        description: 'Combat skill level (melee effectiveness)',
        displayName: 'Combat Skill',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'combat',
          order: 1,
          icon: '⚔️',
        },
        mutable: true,
      },

      huntingSkill: {
        type: 'number',
        required: false,
        default: 0,
        range: [0, 100] as const,
        description: 'Hunting skill level',
        displayName: 'Hunting',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'combat',
          order: 2,
          icon: '🏹',
        },
        mutable: true,
      },

      stealthSkill: {
        type: 'number',
        required: false,
        default: 0,
        range: [0, 100] as const,
        description: 'Stealth skill level',
        displayName: 'Stealth',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'combat',
          order: 3,
          icon: '🥷',
        },
        mutable: true,
      },

      displaySkill: {
        type: 'number',
        required: false,
        default: 0,
        range: [0, 100] as const,
        description: 'Display skill for dominance challenges',
        displayName: 'Display',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'social_combat',
          order: 10,
        },
        mutable: true,
      },

      resourceHolding: {
        type: 'number',
        required: false,
        default: 0,
        range: [0, 100] as const,
        description: 'Resource holding for dominance',
        displayName: 'Resource Holding',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'social_combat',
          order: 11,
        },
        mutable: true,
      },

      craftingSkill: {
        type: 'number',
        required: false,
        default: 0,
        range: [0, 100] as const,
        description: 'Crafting skill (affected by hand injuries)',
        displayName: 'Crafting',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'skills',
          order: 20,
          icon: '🔨',
        },
        mutable: true,
      },

      socialSkill: {
        type: 'number',
        required: false,
        default: 0,
        range: [0, 100] as const,
        description: 'Social skill (affected by psychological injuries)',
        displayName: 'Social',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'skills',
          order: 21,
          icon: '💬',
        },
        mutable: true,
      },

      weapon: {
        type: 'string',
        required: false,
        description: 'Currently equipped weapon ID',
        displayName: 'Weapon',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'equipment',
          order: 30,
          icon: '🗡️',
        },
        mutable: true,
      },

      armor: {
        type: 'string',
        required: false,
        description: 'Currently equipped armor ID',
        displayName: 'Armor',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'equipment',
          order: 31,
          icon: '🛡️',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '⚔️',
      color: '#F44336',
      priority: 5,
    },

    llm: {
      promptSection: 'combat',
      summarize: (data) => {
        const skills: string[] = [];
        if (data.combatSkill > 0) skills.push(`combat:${data.combatSkill}`);
        if (data.huntingSkill && data.huntingSkill > 0) skills.push(`hunting:${data.huntingSkill}`);
        if (data.stealthSkill && data.stealthSkill > 0) skills.push(`stealth:${data.stealthSkill}`);

        const equipment: string[] = [];
        // Only include weapon if it exists and is not null or 'none'
        if (data.weapon && data.weapon !== 'none') equipment.push(`weapon:${data.weapon}`);
        // Only include armor if it exists and is not null or 'none'
        if (data.armor && data.armor !== 'none') equipment.push(`armor:${data.armor}`);

        const parts: string[] = [];
        if (skills.length > 0) parts.push(skills.join(', '));
        if (equipment.length > 0) parts.push(equipment.join(', '));

        return parts.join(' | ') || 'No combat stats';
      },
      priority: 6,
    },

    validate: (data): data is CombatStatsComponent => {
      const d = data as any;

      if (!d || d.type !== 'combat_stats') return false;
      if (typeof d.combatSkill !== 'number' || d.combatSkill < 0 || d.combatSkill > 100) {
        throw new RangeError(`Invalid combatSkill: ${d.combatSkill} (must be 0-100)`);
      }

      // Validate optional skills
      const optionalSkills = ['huntingSkill', 'stealthSkill', 'displaySkill', 'resourceHolding', 'craftingSkill', 'socialSkill'];
      for (const skill of optionalSkills) {
        if (d[skill] !== undefined) {
          if (typeof d[skill] !== 'number' || d[skill] < 0 || d[skill] > 100) {
            throw new RangeError(`Invalid ${skill}: ${d[skill]} (must be 0-100)`);
          }
        }
      }

      // Validate optional equipment
      if (d.weapon !== undefined && d.weapon !== null && typeof d.weapon !== 'string') {
        return false;
      }
      if (d.armor !== undefined && d.armor !== null && typeof d.armor !== 'string') {
        return false;
      }

      return true;
    },

    createDefault: () => ({
      type: 'combat_stats',
      version: 1,
      combatSkill: 0,
      huntingSkill: 0,
      stealthSkill: 0,
      displaySkill: 0,
      resourceHolding: 0,
      craftingSkill: 0,
      socialSkill: 0,
      weapon: null,
      armor: null,
    }),
  })
);
