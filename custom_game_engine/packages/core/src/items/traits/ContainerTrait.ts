/**
 * Trait for items that can hold other items.
 */
export interface ContainerTrait {
  /** Maximum number of item slots */
  capacity: number;

  /** Item categories this container accepts (if undefined, accepts all) */
  acceptedCategories?: string[];

  /** Whether this container preserves food/prevents spoilage */
  preserves?: boolean;

  /** Weight reduction multiplier for items inside (0-1, optional) */
  weightReduction?: number;

  /** Volume in liters (optional) */
  volume?: number;
}
