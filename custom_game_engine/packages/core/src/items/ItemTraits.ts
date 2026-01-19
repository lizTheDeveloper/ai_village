import { EdibleTrait } from './traits/EdibleTrait';
import { WeaponTrait } from './traits/WeaponTrait';
import { MagicalTrait } from './traits/MagicalTrait';
import { ContainerTrait } from './traits/ContainerTrait';
import { ToolTrait } from './traits/ToolTrait';
import { ArmorTrait } from './traits/ArmorTrait';
import { StatBonusTrait } from './traits/StatBonusTrait';
import { AmmoTrait } from './traits/AmmoTrait';
import { MaterialTrait } from './traits/MaterialTrait';

/**
 * Compositional trait bag for items.
 * Items can have zero or more traits.
 *
 * Example:
 * - A berry: { edible: {...} }
 * - A sword: { weapon: {...} }
 * - An enchanted sword: { weapon: {...}, magical: {...} }
 * - A chair: { tool: {...} } // Can also be thrown as weapon if needed
 * - Leather armor: { armor: {...} }
 * - Enchanted robe: { armor: {...}, magical: {...} }
 * - An arrow: { ammo: {...} }
 */
export interface ItemTraits {
  /** Item can be eaten for sustenance */
  edible?: EdibleTrait;

  /** Item can be used as a weapon */
  weapon?: WeaponTrait;

  /** Item has magical properties */
  magical?: MagicalTrait;

  /** Item can hold other items */
  container?: ContainerTrait;

  /** Item can be used as a tool for crafting/gathering */
  tool?: ToolTrait;

  /** Item provides protection when equipped (armor, shields, etc.) */
  armor?: ArmorTrait;

  /** Item provides skill/stat bonuses when equipped (Phase 36: Combat Integration) */
  statBonus?: StatBonusTrait;

  /** Item is ammunition for ranged weapons (Weapons Expansion) */
  ammo?: AmmoTrait;

  /** Item has material properties (building materials, resources, etc.) */
  material?: MaterialTrait;
}
