/**
 * StatBonusTrait - Trait for items that provide stat/skill bonuses
 *
 * Enables magical items like:
 * - Ring of Combat Mastery (+5 combat skill)
 * - Gloves of Dexterity (+3 combat, +2 crafting)
 * - Cursed Berserker Helm (+10 combat, -5 social)
 * - Scholar's Spectacles (+5 research, +3 magic)
 *
 * Part of Phase 36: Equipment System - Combat Integration
 */

/**
 * Skill modifiers provided by an item.
 * All values can be positive or negative.
 */
export interface SkillModifiers {
  /** Combat skill bonus/penalty */
  combat?: number;

  /** Crafting skill bonus/penalty */
  crafting?: number;

  /** Farming skill bonus/penalty */
  farming?: number;

  /** Cooking skill bonus/penalty */
  cooking?: number;

  /** Building skill bonus/penalty */
  building?: number;

  /** Magic skill bonus/penalty */
  magic?: number;

  /** Social skill bonus/penalty */
  social?: number;

  /** Hunting skill bonus/penalty */
  hunting?: number;

  /** Gathering skill bonus/penalty */
  gathering?: number;

  /** Research skill bonus/penalty */
  research?: number;

  /** Medicine/healing skill bonus/penalty */
  medicine?: number;
}

/**
 * Stat modifiers provided by an item (future expansion).
 * All values can be positive or negative.
 */
export interface StatModifiers {
  /** Maximum health bonus/penalty */
  maxHealth?: number;

  /** Movement speed modifier (-1 to 1, where 0.2 = 20% faster) */
  moveSpeed?: number;

  /** Carry capacity bonus/penalty (kg) */
  carryWeight?: number;

  /** Mana pool bonus/penalty */
  maxMana?: number;

  /** Stamina pool bonus/penalty */
  maxStamina?: number;

  /** Health regeneration rate modifier */
  healthRegen?: number;

  /** Mana regeneration rate modifier */
  manaRegen?: number;

  /** Luck modifier (affects critical hits, item drops, etc.) */
  luck?: number;
}

/**
 * Duration types for bonuses.
 */
export type BonusDuration = 'permanent' | 'timed' | 'charged';

/**
 * StatBonusTrait - Provides skill/stat bonuses when equipped.
 *
 * Example usage:
 * ```typescript
 * const ringOfCombatMastery: ItemTraits = {
 *   statBonus: {
 *     skillModifiers: { combat: 5 },
 *     duration: 'permanent',
 *   },
 *   magical: {
 *     effects: ['Grants supernatural combat awareness'],
 *     passive: true,
 *     school: 'enchantment',
 *   },
 * };
 *
 * const cursedBerserkerHelm: ItemTraits = {
 *   statBonus: {
 *     skillModifiers: {
 *       combat: 10,   // Major bonus
 *       social: -5,   // But you're terrifying
 *     },
 *     duration: 'permanent',
 *   },
 *   armor: {
 *     defense: 8,
 *     armorClass: 'heavy',
 *     // ...
 *   },
 * };
 * ```
 */
export interface StatBonusTrait {
  /** Skill modifiers provided by this item */
  skillModifiers?: SkillModifiers;

  /** Stat modifiers provided by this item (optional future expansion) */
  statModifiers?: StatModifiers;

  /** How long the bonuses last */
  duration: BonusDuration;

  /** Number of charges (if duration is 'charged') */
  charges?: number;

  /** Maximum charges (for recharging) */
  maxCharges?: number;

  /** Time limit in ticks (if duration is 'timed') */
  timeLimit?: number;

  /** Description of the bonus effects for tooltips */
  description?: string;
}

/**
 * Check if an item has stat bonuses.
 */
export function hasStatBonuses(item: { traits?: { statBonus?: StatBonusTrait } }): boolean {
  return item.traits?.statBonus !== undefined;
}

/**
 * Get total skill modifier for a specific skill from a StatBonusTrait.
 */
export function getSkillModifier(
  trait: StatBonusTrait,
  skillName: keyof SkillModifiers
): number {
  return trait.skillModifiers?.[skillName] ?? 0;
}

/**
 * Get all skill modifiers from a StatBonusTrait as a Record.
 */
export function getAllSkillModifiers(trait: StatBonusTrait): Record<string, number> {
  const modifiers: Record<string, number> = {};

  if (!trait.skillModifiers) {
    return modifiers;
  }

  for (const [skill, value] of Object.entries(trait.skillModifiers)) {
    if (value !== undefined) {
      modifiers[skill] = value;
    }
  }

  return modifiers;
}

/**
 * Consume a charge from a charged item.
 * Returns updated trait or null if no charges remain.
 */
export function consumeCharge(trait: StatBonusTrait): StatBonusTrait | null {
  if (trait.duration !== 'charged') {
    return trait;
  }

  if (!trait.charges || trait.charges <= 0) {
    return null;
  }

  return {
    ...trait,
    charges: trait.charges - 1,
  };
}

/**
 * Recharge a charged item.
 * Returns updated trait with charges restored.
 */
export function rechargeItem(trait: StatBonusTrait, amount: number = 1): StatBonusTrait {
  if (trait.duration !== 'charged') {
    return trait;
  }

  const maxCharges = trait.maxCharges ?? trait.charges ?? 1;
  const currentCharges = trait.charges ?? 0;
  const newCharges = Math.min(maxCharges, currentCharges + amount);

  return {
    ...trait,
    charges: newCharges,
  };
}

/**
 * Check if a timed bonus has expired.
 */
export function hasExpired(trait: StatBonusTrait, elapsedTicks: number): boolean {
  if (trait.duration !== 'timed') {
    return false;
  }

  if (!trait.timeLimit) {
    return false;
  }

  return elapsedTicks >= trait.timeLimit;
}
