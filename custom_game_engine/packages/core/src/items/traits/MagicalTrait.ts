/**
 * Magic effect expression.
 * TODO: Integrate with Phase 30 Magic System when available.
 * For now, this is a placeholder string format.
 */
export type EffectExpression = string;

/**
 * Trait for items with magical properties.
 */
export interface MagicalTrait {
  /** Magical effects this item provides */
  effects: EffectExpression[];

  /** Number of charges (optional - if missing, effects are passive) */
  charges?: number;

  /** Charges regained per hour (optional) */
  rechargeRate?: number;

  /** Mana cost to activate (optional) */
  manaCost?: number;

  /** School of magic this belongs to (optional) */
  school?: string;

  /** Whether effects are always active (vs activated) */
  passive?: boolean;

  /** Curse flag - negative effects that can't be easily removed */
  cursed?: boolean;
}
