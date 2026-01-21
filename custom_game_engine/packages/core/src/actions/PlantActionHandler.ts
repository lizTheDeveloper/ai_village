import type { ActionHandler } from './ActionHandler.js';
import type { Action, ActionResult, ValidationResult } from './Action.js';
import type { World, ITile } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { InventoryComponent, InventorySlot } from '../components/InventoryComponent.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';

interface WorldWithTiles extends World {
  getTileAt(x: number, y: number): ITile | undefined;
}

/**
 * Handler for the Plant action.
 *
 * Allows agents to plant seeds in tilled soil.
 *
 * Requirements:
 * - Agent must be adjacent to target tile (distance <= √2)
 * - Tile must exist and be tilled
 * - Tile must have plantability > 0
 * - Agent must have a seed in inventory
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors return clear failure reasons
 * - Position validation is strict (no default positions)
 * - Seed item validation is strict (must exist in inventory)
 */
export class PlantActionHandler implements ActionHandler {
  public readonly type = ComponentType.Plant as const;
  public readonly description = 'Plant a seed in tilled soil';
  public readonly interruptible = true;

  /**
   * Calculate planting duration in ticks.
   *
   * Base duration: 3 seconds = 60 ticks (at 20 TPS)
   * Planting is quick compared to tilling.
   */
  getDuration(_action: Action, _world: World): number {
    return 60; // 3 seconds at 20 TPS
  }

  /**
   * Validate that the plant action can be performed.
   *
   * Checks:
   * 1. Action has targetPosition
   * 2. Actor entity exists
   * 3. Actor has position component
   * 4. Actor has inventory with seeds
   * 5. Target position is adjacent to actor (distance <= √2)
   * 6. World has getTileAt method
   * 7. Tile exists and is tilled
   * 8. Tile has plantability > 0
   */
  validate(action: Action, world: World): ValidationResult {
    // Check target position exists
    if (!action.targetPosition) {
      return {
        valid: false,
        reason: 'Plant action requires targetPosition',
      };
    }

    const targetPos = action.targetPosition;

    // Check actor exists
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      return {
        valid: false,
        reason: `Actor entity ${action.actorId} does not exist`,
      };
    }

    // Check actor has position
    const actorPos = actor.components.get(ComponentType.Position) as PositionComponent | undefined;
    if (!actorPos) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no position component`,
      };
    }

    // Check actor has inventory
    const inventory = actor.components.get(ComponentType.Inventory) as InventoryComponent | undefined;
    if (!inventory || !inventory.slots) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no inventory`,
      };
    }

    // Check actor has seeds
    const seedSlot = this.findSeedSlot(inventory, action.parameters?.seedType as string | undefined);
    if (!seedSlot) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no seeds in inventory`,
      };
    }

    // Check actor is adjacent to target (distance <= √2 ≈ 1.414)
    const dx = targetPos.x - actorPos.x;
    const dy = targetPos.y - actorPos.y;
    // PERFORMANCE: Use squared distance for comparison
    const MAX_PLANT_DISTANCE_SQUARED = 2; // (√2)^2 = 2
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > MAX_PLANT_DISTANCE_SQUARED) {
      const distance = Math.sqrt(distanceSquared); // Only for error message
      const MAX_PLANT_DISTANCE = 1.414; // √2 pre-computed
      return {
        valid: false,
        reason: `Target tile (${targetPos.x},${targetPos.y}) is too far from actor at (${actorPos.x.toFixed(1)},${actorPos.y.toFixed(1)}). Distance: ${distance.toFixed(2)}, max: ${MAX_PLANT_DISTANCE.toFixed(2)}`,
      };
    }

    // Check world has tile access
    const worldWithTiles = world as WorldWithTiles;
    if (typeof worldWithTiles.getTileAt !== 'function') {
      return {
        valid: false,
        reason: 'World does not have getTileAt method - tile access not available',
      };
    }

    // Check tile exists at target position
    const tile = worldWithTiles.getTileAt(targetPos.x, targetPos.y);
    if (!tile) {
      return {
        valid: false,
        reason: `No tile found at position (${targetPos.x},${targetPos.y})`,
      };
    }

    // Check tile is tilled
    if (!tile.tilled) {
      return {
        valid: false,
        reason: `Tile at (${targetPos.x},${targetPos.y}) is not tilled - cannot plant here`,
      };
    }

    // Check tile has plantability remaining
    if (tile.plantability <= 0) {
      return {
        valid: false,
        reason: `Tile at (${targetPos.x},${targetPos.y}) has no plantability remaining - re-till to plant again`,
      };
    }

    // Check no existing plant at this location
    const existingPlants = world.query().with(ComponentType.Plant).with(ComponentType.Position).executeEntities();
    for (const plantEntity of existingPlants) {
      const plantImpl = plantEntity as EntityImpl;
      const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);
      if (plantPos && Math.floor(plantPos.x) === targetPos.x && Math.floor(plantPos.y) === targetPos.y) {
        return {
          valid: false,
          reason: `Tile at (${targetPos.x},${targetPos.y}) already has a plant`,
        };
      }
    }

    // All checks passed
    return {
      valid: true,
    };
  }

  /**
   * Execute the plant action.
   *
   * - Removes seed from inventory
   * - Decrements tile plantability
   * - Emits seed:planted event for world to create plant entity
   */
  execute(action: Action, world: World): ActionResult {
    if (!action.targetPosition) {
      return {
        success: false,
        reason: 'Plant action requires targetPosition',
        effects: [],
        events: [],
      };
    }

    const targetPos = action.targetPosition;

    // Get actor and components
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      return {
        success: false,
        reason: `Actor entity ${action.actorId} does not exist`,
        effects: [],
        events: [],
      };
    }

    const actorImpl = actor as EntityImpl;
    const inventory = actorImpl.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!inventory) {
      return {
        success: false,
        reason: `Actor ${action.actorId} has no inventory`,
        effects: [],
        events: [],
      };
    }

    // Find and remove seed from inventory
    const seedSlot = this.findSeedSlot(inventory, action.parameters?.seedType as string | undefined);
    if (!seedSlot) {
      return {
        success: false,
        reason: 'No seeds available in inventory',
        effects: [],
        events: [],
      };
    }

    // Extract species ID from seed item ID (format: seed:speciesId)
    if (!seedSlot.itemId) {
      return {
        success: false,
        reason: 'Seed slot has no item ID',
        effects: [],
        events: [],
      };
    }
    const speciesIdOrNull = this.extractSpeciesId(seedSlot.itemId);
    if (!speciesIdOrNull) {
      return {
        success: false,
        reason: `Invalid seed item format: ${seedSlot.itemId}`,
        effects: [],
        events: [],
      };
    }
    const speciesId: string = speciesIdOrNull;

    // Remove one seed from inventory
    const slotIndex = inventory.slots.indexOf(seedSlot);
    if (slotIndex >= 0) {
      actorImpl.updateComponent<InventoryComponent>(ComponentType.Inventory, (inv) => {
        const newSlots = [...inv.slots];
        const slot = newSlots[slotIndex];
        if (slot && slot.quantity > 1) {
          newSlots[slotIndex] = { ...slot, quantity: slot.quantity - 1 };
        } else {
          // Remove empty slot
          newSlots[slotIndex] = { itemId: '', quantity: 0 };
        }
        // Recalculate weight
        const newWeight = newSlots.reduce((w, s) => w + (s.quantity * 0.1), 0);
        return { ...inv, slots: newSlots, currentWeight: newWeight };
      });
    }

    // Get tile and decrement plantability
    const worldWithTiles = world as WorldWithTiles;
    const tile = worldWithTiles.getTileAt(targetPos.x, targetPos.y);
    if (tile) {
      tile.plantability = Math.max(0, tile.plantability - 1);
      if (tile.plantability === 0) {
        tile.tilled = false; // No longer tilled when plantability exhausted
      }
    }


    // Emit seed:planted event for world to create plant entity
    return {
      success: true,
      effects: [],
      events: [
        {
          type: 'seed:planted' as const,
          source: 'plant-action-handler',
          data: {
            actionId: action.id,
            actorId: action.actorId,
            speciesId,
            position: { x: targetPos.x, y: targetPos.y },
            seedItemId: seedSlot.itemId,
          } as Record<string, unknown>,
        },
        {
          type: 'action:completed' as const,
          source: 'plant-action-handler',
          data: {
            actionId: action.id,
            actionType: action.type,
            actorId: action.actorId,
            position: targetPos,
          } as Record<string, unknown>,
        },
      ],
    };
  }

  /**
   * Find a seed slot in the inventory.
   * If seedType is specified, look for that specific seed.
   * Otherwise, return any seed.
   */
  private findSeedSlot(
    inventory: InventoryComponent,
    seedType?: string
  ): InventorySlot | undefined {
    for (const slot of inventory.slots) {
      if (!slot.itemId || slot.quantity <= 0) continue;

      // Check if this is a seed item
      if (slot.itemId.startsWith('seed:') || slot.itemId.includes('_seed')) {
        // If seedType specified, check for match
        if (seedType) {
          const extractedSpeciesId = this.extractSpeciesId(slot.itemId);
          if (extractedSpeciesId && (extractedSpeciesId === seedType || slot.itemId === seedType)) {
            return slot;
          }
        } else {
          // Return any seed
          return slot;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract species ID from seed item ID.
   * Formats:
   * - seed:wheat -> wheat
   * - wheat_seed -> wheat
   */
  private extractSpeciesId(itemId: string): string | null {
    if (itemId.startsWith('seed:')) {
      return itemId.slice(5); // Remove 'seed:' prefix
    }
    if (itemId.endsWith('_seed')) {
      return itemId.slice(0, -5); // Remove '_seed' suffix
    }
    // Try to parse as-is if it's a valid species
    return itemId;
  }

  /**
   * Called if the plant action is interrupted.
   */
  onInterrupt?(_action: Action, _world: World, _reason: string): [] {
    // No cleanup needed - seed is only removed on successful completion
    return [];
  }
}
