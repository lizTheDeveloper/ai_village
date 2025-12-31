import type { Component } from '../ecs/Component.js';

/**
 * CombatStatsComponent - Combat-specific stats for an entity
 *
 * Used by agents and some animals for combat calculations
 */
export interface CombatStatsComponent extends Component {
  readonly type: 'combat_stats';
  readonly version: 1;

  /** Combat skill level */
  combatSkill: number;

  /** Hunting skill level */
  huntingSkill?: number;

  /** Stealth skill level */
  stealthSkill?: number;

  /** Display skill (for dominance challenges) */
  displaySkill?: number;

  /** Resource holding (for dominance challenges) */
  resourceHolding?: number;

  /** Crafting skill (affected by hand/arm injuries) */
  craftingSkill?: number;

  /** Social skill (affected by psychological injuries) */
  socialSkill?: number;

  /** Currently equipped weapon */
  weapon?: string | null;

  /** Currently equipped armor */
  armor?: string | null;
}

export function createCombatStatsComponent(data: {
  combatSkill: number;
  [key: string]: any;
}): CombatStatsComponent {
  if (data.combatSkill === undefined) {
    throw new Error('Combat skill is required');
  }

  return {
    type: 'combat_stats',
    version: 1,
    combatSkill: data.combatSkill,
    huntingSkill: data.huntingSkill || 0,
    stealthSkill: data.stealthSkill || 0,
    displaySkill: data.displaySkill || 0,
    resourceHolding: data.resourceHolding || 0,
    craftingSkill: data.craftingSkill || 0,
    socialSkill: data.socialSkill || 0,
    weapon: data.weapon || null,
    armor: data.armor || null,
  };
}
