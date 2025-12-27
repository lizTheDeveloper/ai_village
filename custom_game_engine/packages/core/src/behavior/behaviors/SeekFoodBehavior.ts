/**
 * SeekFoodBehavior - Find and consume food to satisfy hunger
 *
 * This behavior:
 * 1. First checks if agent has food in inventory → eat it
 * 2. If no food in inventory → gather food from environment
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { isFoodType } from '../../components/InventoryComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { GatherBehavior } from './GatherBehavior.js';

/** Hunger restored per food item */
const HUNGER_RESTORED = 25;

/**
 * SeekFoodBehavior - Eat food from inventory or gather if none available
 */
export class SeekFoodBehavior extends BaseBehavior {
  readonly name = 'seek_food' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const inventory = entity.getComponent<InventoryComponent>('inventory');
    const needs = entity.getComponent<NeedsComponent>('needs');

    // If no inventory or needs, can't eat - just wander
    if (!inventory || !needs) {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'No inventory or needs component' };
    }

    // Check if agent has food in inventory
    const foodSlot = this.findFoodInInventory(inventory);

    if (foodSlot) {
      // Eat food from inventory
      this.eatFood(entity, world, foodSlot.slotIndex, foodSlot.itemId, needs);

      // Check if still hungry
      if (needs.hunger < 70) {
        // Still hungry, continue seeking food
        return;
      } else {
        // Hunger satisfied, behavior complete
        this.switchTo(entity, 'wander', {});
        return { complete: true, reason: 'Hunger satisfied' };
      }
    } else {
      // No food in inventory - gather food
      // Delegate to GatherBehavior with preference for food
      const gatherBehavior = new GatherBehavior();

      // Set behavior state to prefer food resources
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          ...current.behaviorState,
          resourceType: 'berry', // Prefer berries as food
          seekingFood: true,
        },
      }));

      return gatherBehavior.execute(entity, world);
    }
  }

  private findFoodInInventory(inventory: InventoryComponent): { slotIndex: number; itemId: string; quantity: number } | null {
    for (let i = 0; i < inventory.slots.length; i++) {
      const slot = inventory.slots[i];
      if (slot && slot.itemId && slot.quantity > 0 && isFoodType(slot.itemId)) {
        return { slotIndex: i, itemId: slot.itemId, quantity: slot.quantity };
      }
    }
    return null;
  }

  private eatFood(
    entity: EntityImpl,
    world: World,
    slotIndex: number,
    foodType: string,
    needs: NeedsComponent
  ): void {
    // Consume food from inventory
    entity.updateComponent<InventoryComponent>('inventory', (current) => {
      const newSlots = [...current.slots];
      const slot = newSlots[slotIndex]!;

      newSlots[slotIndex] = {
        ...slot,
        quantity: slot.quantity - 1,
      };

      // Clear slot if empty
      if (newSlots[slotIndex]!.quantity <= 0) {
        newSlots[slotIndex] = { itemId: null, quantity: 0 };
      }

      return {
        ...current,
        slots: newSlots,
        currentWeight: Math.max(0, current.currentWeight - 1),
      };
    });

    // Restore hunger
    const newHunger = Math.min(100, needs.hunger + HUNGER_RESTORED);
    entity.updateComponent<NeedsComponent>('needs', (current) => ({
      ...current,
      hunger: newHunger,
    }));

    // Emit event
    world.eventBus.emit({
      type: 'agent:ate',
      source: entity.id,
      data: {
        agentId: entity.id,
        foodType,
        hungerRestored: HUNGER_RESTORED,
        amount: 1,
      },
    });

    console.log(`[SeekFoodBehavior] Agent ${entity.id} ate ${foodType}, hunger now ${newHunger}`);
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function seekFoodBehavior(entity: EntityImpl, world: World): void {
  const behavior = new SeekFoodBehavior();
  behavior.execute(entity, world);
}
