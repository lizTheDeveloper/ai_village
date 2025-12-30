import { v4 as uuidv4 } from 'uuid';
import { ItemInstance, getQualityTier } from './ItemInstance';
import { ItemTraits } from './ItemTraits';

/**
 * Registry for active item instances in the world.
 * Manages instance lifecycle and uniqueness.
 */
export class ItemInstanceRegistry {
  private static instance: ItemInstanceRegistry | null = null;
  private instances: Map<string, ItemInstance> = new Map();

  private constructor() {}

  public static getInstance(): ItemInstanceRegistry {
    if (!ItemInstanceRegistry.instance) {
      ItemInstanceRegistry.instance = new ItemInstanceRegistry();
    }
    return ItemInstanceRegistry.instance;
  }

  /**
   * Create a new item instance.
   */
  public createInstance(params: {
    definitionId: string;
    quality?: number;
    condition?: number;
    materialOverride?: string;
    additionalTraits?: Partial<ItemTraits>;
    creator?: string;
    createdAt?: number;
    stackSize?: number;
    customName?: string;
  }): ItemInstance {
    const instance: ItemInstance = {
      instanceId: uuidv4(),
      definitionId: params.definitionId,
      quality: params.quality ?? 50,
      condition: params.condition ?? 100,
      stackSize: params.stackSize ?? 1,
      materialOverride: params.materialOverride,
      additionalTraits: params.additionalTraits,
      creator: params.creator,
      createdAt: params.createdAt,
      customName: params.customName,
    };

    this.instances.set(instance.instanceId, instance);
    return instance;
  }

  /**
   * Get an instance by ID.
   * @throws Error if instance doesn't exist
   */
  public get(instanceId: string): ItemInstance {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`ItemInstance '${instanceId}' not found in registry`);
    }
    return instance;
  }

  /**
   * Check if an instance exists.
   */
  public has(instanceId: string): boolean {
    return this.instances.has(instanceId);
  }

  /**
   * Remove an instance from the registry.
   */
  public remove(instanceId: string): void {
    this.instances.delete(instanceId);
  }

  /**
   * Get all instances.
   */
  public getAll(): ItemInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Check if two instances can stack together.
   * Instances can stack if they have:
   * - Same definitionId
   * - Same quality tier (not exact value)
   * - Same materialOverride
   * - Similar condition (within 10%)
   * - Same additionalTraits (deep equality)
   */
  public canStack(instance1: ItemInstance, instance2: ItemInstance): boolean {
    if (instance1.definitionId !== instance2.definitionId) {
      return false;
    }

    if (getQualityTier(instance1.quality) !== getQualityTier(instance2.quality)) {
      return false;
    }

    if (instance1.materialOverride !== instance2.materialOverride) {
      return false;
    }

    if (Math.abs(instance1.condition - instance2.condition) > 10) {
      return false;
    }

    // Deep equality check for additionalTraits
    const traits1 = JSON.stringify(instance1.additionalTraits || {});
    const traits2 = JSON.stringify(instance2.additionalTraits || {});
    if (traits1 !== traits2) {
      return false;
    }

    return true;
  }

  /**
   * Clear all instances (for testing).
   */
  public clear(): void {
    this.instances.clear();
  }

  /**
   * Reset singleton instance (for testing).
   */
  public static reset(): void {
    if (ItemInstanceRegistry.instance) {
      ItemInstanceRegistry.instance.clear();
      ItemInstanceRegistry.instance = null;
    }
  }
}

// Export singleton getter
export const itemInstanceRegistry = ItemInstanceRegistry.getInstance();
