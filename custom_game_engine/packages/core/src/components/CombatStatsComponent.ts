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

/** Input type for factory use - accepts unknown values with runtime validation */
export type CombatStatsInput = Record<string, unknown>;

export function createCombatStatsComponent(data: CombatStatsInput): CombatStatsComponent {
  const combatSkill = data.combatSkill as number | undefined;
  const huntingSkill = data.huntingSkill as number | undefined;
  const stealthSkill = data.stealthSkill as number | undefined;
  const displaySkill = data.displaySkill as number | undefined;
  const resourceHolding = data.resourceHolding as number | undefined;
  const craftingSkill = data.craftingSkill as number | undefined;
  const socialSkill = data.socialSkill as number | undefined;
  const weapon = data.weapon as string | null | undefined;
  const armor = data.armor as string | null | undefined;

  if (combatSkill === undefined) {
    throw new Error('Combat skill is required');
  }

  return {
    type: 'combat_stats',
    version: 1,
    combatSkill,
    huntingSkill: huntingSkill || 0,
    stealthSkill: stealthSkill || 0,
    displaySkill: displaySkill || 0,
    resourceHolding: resourceHolding || 0,
    craftingSkill: craftingSkill || 0,
    socialSkill: socialSkill || 0,
    weapon: weapon || null,
    armor: armor || null,
  };
}
