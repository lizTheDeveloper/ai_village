/**
 * Magic effect expression.
 * TODO: Integrate with Phase 30 Magic System when available.
 * For now, this is a placeholder string format.
 */
export type EffectExpression = string;

/**
 * Type of magical energy or school the item uses.
 */
export type MagicType =
  // Core magic types
  | 'arcane'
  | 'elemental'
  | 'divine'
  | 'nature'
  | 'necromantic'
  | 'psionic'
  | 'void'
  | 'radiant'
  | 'shadow'
  | 'chaos'
  | 'order'
  // Elemental subtypes
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'water'
  | 'earth'
  | 'air'
  // Psionic subtypes
  | 'telekinesis'
  | 'psychic'
  | 'telepathy'
  // Divine subtypes
  | 'holy'
  | 'profane'
  // Schools of magic
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'transmutation'
  | 'abjuration'
  // Dark magic
  | 'necromancy'
  | 'entropy';

/**
 * Trait for items with magical properties.
 */
export interface MagicalTrait {
  /** Magical effects this item provides (optional for focus items) */
  effects?: EffectExpression[];

  /** Number of charges (optional - if missing, effects are passive) */
  charges?: number;

  /** Charges regained per hour (optional) */
  rechargeRate?: number;

  /** Mana cost to activate (optional) */
  manaCost?: number;

  /** Mana cost per use for weapons that consume mana on attack (optional) */
  manaPerUse?: number;

  /** Bonus to mana regeneration when equipped (optional) */
  manaRegen?: number;

  /** School of magic this belongs to (optional) */
  school?: string;

  /** Type of magical energy (arcane, elemental, divine, etc.) */
  magicType?: MagicType;

  /** Bonus to spell power when using this item as a focus (optional) */
  spellPowerBonus?: number;

  /** Spells that this item grants access to when equipped (optional) */
  grantsSpells?: string[];

  /** Whether effects are always active (vs activated) */
  passive?: boolean;

  /** Curse flag - negative effects that can't be easily removed */
  cursed?: boolean;
}
