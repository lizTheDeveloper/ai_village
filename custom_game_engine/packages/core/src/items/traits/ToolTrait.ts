/**
 * Tool types for different crafting/gathering operations.
 */
export type ToolType =
  | 'axe'
  | 'pickaxe'
  | 'hammer'
  | 'saw'
  | 'hoe'
  | 'sickle'
  | 'knife'
  | 'needle'
  | 'chisel'
  | 'tongs'
  | 'bellows'
  | 'watering_can';

/**
 * Trait for items that can be used as tools.
 */
export interface ToolTrait {
  /** Type of tool */
  toolType: ToolType;

  /** Tool efficiency multiplier (1.0 = normal, 2.0 = twice as fast) */
  efficiency: number;

  /** Condition lost per use (0-1) */
  durabilityLoss: number;

  /** Bonus quality granted to crafted items (optional) */
  qualityBonus?: number;

  /** Whether this tool can be used for multiple operations */
  multiPurpose?: boolean;
}
