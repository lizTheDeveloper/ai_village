import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import { itemInstanceRegistry } from '../items/ItemInstanceRegistry.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import type { ToolTrait } from '../items/traits/ToolTrait.js';
import type { EventBus } from '../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

/**
 * Usage type for tool wear tracking.
 */
export type UsageType = 'crafting' | 'gathering';

/**
 * Options for applying tool wear.
 */
export interface ToolWearOptions {
  /** Agent ID for event payloads */
  agentId?: string;
  /**
   * Material hardness (0-100) of the material being worked.
   * Harder materials cause more tool wear:
   * - Hardness 25 (wood): 0.75x wear
   * - Hardness 50 (baseline): 1.0x wear
   * - Hardness 70 (granite): 1.4x wear
   * - Hardness 100: 2.0x wear
   */
  materialHardness?: number;
}

/**
 * System for managing tool durability and wear.
 *
 * Responsibilities:
 * - Apply durability loss when tools are used
 * - Prevent usage of broken tools (condition <= 0)
 * - Emit events for tool state changes (broken, low durability)
 * - Calculate quality-adjusted durability loss
 *
 * Integration:
 * - CraftingSystem calls applyToolWear after job completion
 * - ResourceGatheringSystem calls applyToolWear after gathering
 * - InventoryComponent uses helper methods to filter broken tools
 *
 * Per CLAUDE.md: No silent fallbacks, throws on errors.
 */
export class DurabilitySystem extends BaseSystem {
  public readonly id: SystemId = 'durability';
  public readonly priority: number = 56; // After CraftingSystem (55)
  public readonly requiredComponents = [] as const; // Manual processing, not entity-based
  protected readonly throttleInterval: number = 100; // Update every 100 ticks (5 seconds)

  private eventBus: EventBus | null = null;

  // Track which tools have emitted low durability warnings (prevent spam)
  private lowDurabilityWarningsEmitted: Set<string> = new Set();

  /**
   * Set the event bus for emitting durability events.
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * DurabilitySystem doesn't process entities per-tick.
   * Durability is applied on-demand via applyToolWear().
   */
  protected onUpdate(_ctx: SystemContext): void {
    // No per-tick processing needed
  }

  /**
   * Apply durability loss to a tool.
   *
   * @param itemInstanceId - Instance ID of the tool
   * @param usageType - Type of usage (crafting, gathering)
   * @param optionsOrAgentId - Options object or legacy agentId string for backwards compatibility
   * @throws If instance not found
   * @throws If item is not a tool
   * @throws If tool is already broken (condition <= 0)
   */
  applyToolWear(
    itemInstanceId: string,
    usageType: UsageType,
    optionsOrAgentId?: ToolWearOptions | string
  ): void {
    // Handle backwards compatibility - if string passed, treat as agentId
    const options: ToolWearOptions = typeof optionsOrAgentId === 'string'
      ? { agentId: optionsOrAgentId }
      : (optionsOrAgentId ?? {});

    const { agentId, materialHardness } = options;
    // Get instance (throws if not found)
    const instance = itemInstanceRegistry.get(itemInstanceId);

    // Get item definition to check if it's a tool
    const definition = itemRegistry.get(instance.definitionId);
    if (!definition) {
      throw new Error(
        `ItemDefinition '${instance.definitionId}' not found for instance '${itemInstanceId}'`
      );
    }

    // Check if item has tool trait
    const toolTrait = definition.traits?.tool;
    if (!toolTrait) {
      throw new Error(
        `Item '${instance.definitionId}' is not a tool. Cannot apply tool wear.`
      );
    }

    // Prevent using broken tools
    if (instance.condition <= 0) {
      throw new Error(
        `Cannot use broken tool '${instance.definitionId}' (instanceId: ${itemInstanceId}). ` +
        `Tool has 0 condition. Repair or craft a new tool.`
      );
    }

    // Calculate durability loss with quality and material hardness scaling
    const durabilityLoss = this.calculateDurabilityLoss(toolTrait, instance.quality, materialHardness);

    // Store previous condition for event
    const previousCondition = instance.condition;

    // Apply wear (clamp to 0, never negative)
    instance.condition = Math.max(0, instance.condition - durabilityLoss);

    // Emit tool_used event
    if (this.events) {
      this.events.emit('tool_used', {
        itemInstanceId,
        durabilityLost: durabilityLoss,
        remainingCondition: instance.condition,
        usageType,
      }, agentId || 'durability-system');

      // Check for low durability warning (crossing 20% threshold)
      if (previousCondition > 20 && instance.condition <= 20) {
        if (!this.lowDurabilityWarningsEmitted.has(itemInstanceId)) {
          this.lowDurabilityWarningsEmitted.add(itemInstanceId);
          this.events.emit('tool_low_durability', {
            itemInstanceId,
            condition: instance.condition,
            agentId: agentId,
            toolType: toolTrait.toolType,
          }, agentId || 'durability-system');
        }
      }

      // Check if tool broke (crossed 0 threshold)
      if (previousCondition > 0 && instance.condition === 0) {
        this.events.emit('tool_broken', {
          itemInstanceId,
          toolType: toolTrait.toolType,
          agentId: agentId,
        }, agentId || 'durability-system');
        // Remove from low durability tracking (it's broken now)
        this.lowDurabilityWarningsEmitted.delete(itemInstanceId);
      }
    }
  }

  /**
   * Calculate durability loss combining tool trait, item quality, and material hardness.
   *
   * Formula:
   * - Base loss from tool trait (0-1 scale, converted to 0-100)
   * - Quality factor reduces wear for high quality, increases for poor quality
   * - Material hardness increases wear for harder materials
   *
   * Quality tiers:
   * - Poor (0-39): 1.5x wear (wears faster)
   * - Normal (40-69): 1.0x wear (standard)
   * - Fine (70-84): 0.8x wear (lasts longer)
   * - Masterwork (85-94): 0.6x wear (lasts much longer)
   * - Legendary (95-100): 0.4x wear (lasts 2.5x longer than normal)
   *
   * Material hardness tiers:
   * - Soft (0-25, wood): 0.75x wear (gentle on tools)
   * - Medium (26-50): 1.0x wear (standard)
   * - Hard (51-75, stone): 1.5x wear (wears tools faster)
   * - Very hard (76-100, metal/crystal): 2.0x wear (harsh on tools)
   *
   * @param toolTrait - Tool trait from item definition
   * @param quality - Quality value (0-100)
   * @param materialHardness - Material hardness (0-100), undefined = no modifier
   * @returns Durability loss (0-100 scale)
   */
  private calculateDurabilityLoss(toolTrait: ToolTrait, quality: number, materialHardness?: number): number {
    const baseLoss = toolTrait.durabilityLoss * 100; // Convert 0-1 to 0-100
    const qualityFactor = this.getQualityWearFactor(quality);
    const hardnessFactor = this.getMaterialHardnessWearFactor(materialHardness);
    return baseLoss * qualityFactor * hardnessFactor;
  }

  /**
   * Get material hardness wear factor.
   * Harder materials cause more wear on tools.
   *
   * - Hardness 0-25 (wood): 0.75x wear
   * - Hardness 26-50: 1.0x wear
   * - Hardness 51-75 (stone): 1.5x wear
   * - Hardness 76-100 (metal): 2.0x wear
   */
  private getMaterialHardnessWearFactor(hardness?: number): number {
    if (hardness === undefined) return 1.0; // No hardness specified, no modifier
    if (hardness <= 25) return 0.75;  // Soft materials like wood
    if (hardness <= 50) return 1.0;   // Medium hardness
    if (hardness <= 75) return 1.5;   // Hard materials like stone
    return 2.0;                        // Very hard materials like metal ore
  }

  /**
   * Get quality wear factor.
   * Lower quality tools wear faster, higher quality wear slower.
   */
  private getQualityWearFactor(quality: number): number {
    if (quality < 40) return 1.5;  // Poor quality wears faster
    if (quality < 70) return 1.0;  // Normal wear
    if (quality < 85) return 0.8;  // Fine quality lasts longer
    if (quality < 95) return 0.6;  // Masterwork lasts much longer
    return 0.4;                     // Legendary lasts 2.5x longer
  }

  /**
   * Check if a tool is broken (condition <= 0).
   *
   * @param itemInstanceId - Instance ID of the tool
   * @returns True if broken, false otherwise
   * @throws If instance not found
   */
  isToolBroken(itemInstanceId: string): boolean {
    const instance = itemInstanceRegistry.get(itemInstanceId);
    return instance.condition <= 0;
  }

  /**
   * Check if a tool has low durability (<= 20%).
   *
   * @param itemInstanceId - Instance ID of the tool
   * @returns True if low durability, false otherwise
   * @throws If instance not found
   */
  hasLowDurability(itemInstanceId: string): boolean {
    const instance = itemInstanceRegistry.get(itemInstanceId);
    return instance.condition > 0 && instance.condition <= 20;
  }

  /**
   * Get estimated uses remaining for a tool.
   *
   * @param itemInstanceId - Instance ID of the tool
   * @returns Estimated number of uses remaining
   * @throws If instance not found
   * @throws If item is not a tool
   */
  getEstimatedUsesRemaining(itemInstanceId: string): number {
    const instance = itemInstanceRegistry.get(itemInstanceId);

    // Get tool trait to determine wear rate
    const definition = itemRegistry.get(instance.definitionId);
    if (!definition) {
      throw new Error(
        `ItemDefinition '${instance.definitionId}' not found for instance '${itemInstanceId}'`
      );
    }

    const toolTrait = definition.traits?.tool;
    if (!toolTrait) {
      throw new Error(
        `Item '${instance.definitionId}' is not a tool. Cannot calculate uses remaining.`
      );
    }

    // Calculate effective wear per use
    const wearPerUse = this.calculateDurabilityLoss(toolTrait, instance.quality);

    // Avoid division by zero
    if (wearPerUse === 0) {
      return Infinity; // Indestructible tool
    }

    return Math.floor(instance.condition / wearPerUse);
  }

  /**
   * Reset low durability warnings (for testing).
   */
  resetWarnings(): void {
    this.lowDurabilityWarningsEmitted.clear();
  }
}

// ============================================================================
// Singleton accessor for use by behaviors and other non-system code
// ============================================================================

let durabilitySystemInstance: DurabilitySystem | null = null;

/**
 * Get the global DurabilitySystem instance.
 * Creates one if it doesn't exist.
 *
 * Note: The event bus should be set via setEventBus() after getting the instance
 * if you want tool_used/tool_broken events to be emitted.
 */
export function getDurabilitySystem(): DurabilitySystem {
  if (!durabilitySystemInstance) {
    durabilitySystemInstance = new DurabilitySystem();
  }
  return durabilitySystemInstance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetDurabilitySystem(): void {
  if (durabilitySystemInstance) {
    durabilitySystemInstance.resetWarnings();
  }
  durabilitySystemInstance = null;
}
