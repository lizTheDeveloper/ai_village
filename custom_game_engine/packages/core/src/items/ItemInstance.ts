import { ItemTraits } from './ItemTraits';
import type { ItemQuality } from '../types/ItemTypes.js';

// Re-export for backwards compatibility
export type { ItemQuality };

/**
 * Convert numeric quality (0-100) to quality tier.
 */
export function getQualityTier(quality: number): ItemQuality {
  if (quality < 40) return 'poor';
  if (quality < 70) return 'normal';
  if (quality < 85) return 'fine';
  if (quality < 95) return 'masterwork';
  return 'legendary';
}

/**
 * Runtime instance of an item.
 * Separate from ItemDefinition - definitions are templates, instances are actual objects.
 *
 * Instances track:
 * - Quality and condition (wear and tear)
 * - Material overrides (transmutation)
 * - Additional traits (enchantments, blessings, curses)
 * - Provenance (who crafted it, when)
 */
export interface ItemInstance {
  /** Unique instance ID (UUID) */
  instanceId: string;

  /** Reference to ItemDefinition template */
  definitionId: string;

  /** Override material (for transmutation) */
  materialOverride?: string;

  /** Additional traits beyond definition (enchantments, modifications) */
  additionalTraits?: Partial<ItemTraits>;

  /** Quality value 0-100 */
  quality: number;

  /** Condition 0-100 (100 = pristine, 0 = broken) */
  condition: number;

  /** Entity ID of the agent who crafted this */
  creator?: string;

  /** Game tick when this was created */
  createdAt?: number;

  /** Current stack size (for stackable items) */
  stackSize: number;

  /** Custom name (optional - for named legendary items) */
  customName?: string;
}
