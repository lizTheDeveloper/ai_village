import type { ActionHandler } from './ActionHandler.js';
import type { Action, ActionResult, ValidationResult } from './Action.js';
import type { World } from '../ecs/World.js';
import type { SoilSystem } from '../systems/SoilSystem.js';
import type { PositionComponent } from '../components/PositionComponent.js';

/**
 * Handler for the Till action.
 *
 * Allows agents to till grass/dirt tiles to prepare them for planting.
 *
 * Requirements:
 * - Agent must be adjacent to target tile (distance <= √2)
 * - Tile must exist and be accessible
 * - Tile must be grass or dirt terrain
 * - Uses SoilSystem.tillTile to perform the actual tilling
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors throw or return clear failure reasons
 * - Position validation is strict (no default positions)
 * - All terrain validation delegated to SoilSystem (which throws on invalid terrain)
 */
export class TillActionHandler implements ActionHandler {
  public readonly type = 'till' as const;
  public readonly description = 'Till a tile to prepare it for planting';
  public readonly interruptible = true;

  constructor(private soilSystem: SoilSystem) {
    if (!soilSystem) {
      throw new Error('TillActionHandler requires SoilSystem instance');
    }
  }

  /**
   * Calculate tilling duration in ticks.
   *
   * Base duration: 10 seconds = 200 ticks (at 20 TPS)
   * Modified by tool efficiency:
   * - Hoe: 100% efficiency = 10s (200 ticks)
   * - Shovel: 80% efficiency = 12.5s (250 ticks)
   * - Hands: 50% efficiency = 20s (400 ticks)
   *
   * Duration = baseTicks / toolEfficiency
   */
  getDuration(action: Action, world: World): number {
    const baseTicks = 200; // 10 seconds at 20 TPS

    // Check if actor has tools in inventory
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      // No actor found, use hands (slowest)
      return baseTicks * 2; // 400 ticks = 20s
    }

    const inventory = actor.components.get('inventory') as any;
    if (!inventory || !inventory.slots) {
      // No inventory, use hands
      return baseTicks * 2; // 400 ticks = 20s
    }

    // Check for hoe (best tool, 100% efficiency)
    const hasHoe = inventory.slots.some((slot: any) => slot?.itemId === 'hoe');
    if (hasHoe) {
      return baseTicks; // 200 ticks = 10s
    }

    // Check for shovel (medium tool, 80% efficiency)
    const hasShovel = inventory.slots.some((slot: any) => slot?.itemId === 'shovel');
    if (hasShovel) {
      return Math.round(baseTicks / 0.8); // 250 ticks = 12.5s
    }

    // Default to hands (50% efficiency)
    return baseTicks * 2; // 400 ticks = 20s
  }

  /**
   * Validate that the till action can be performed.
   *
   * Checks:
   * 1. Action has targetPosition
   * 2. Actor entity exists
   * 3. Actor has position component
   * 4. Target position is adjacent to actor (distance <= √2)
   * 5. World has getTileAt method (tile access available)
   * 6. Tile exists at target position
   *
   * SoilSystem will validate terrain type when executing.
   */
  validate(action: Action, world: World): ValidationResult {
    // Check target position exists
    if (!action.targetPosition) {
      return {
        valid: false,
        reason: 'Till action requires targetPosition',
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
    const actorPos = actor.components.get('position') as PositionComponent | undefined;
    if (!actorPos) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no position component`,
      };
    }

    // Check actor is adjacent to target (distance <= √2 ≈ 1.414)
    const dx = targetPos.x - actorPos.x;
    const dy = targetPos.y - actorPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MAX_TILL_DISTANCE = Math.sqrt(2); // Allow diagonal tilling

    if (distance > MAX_TILL_DISTANCE) {
      return {
        valid: false,
        reason: `Target tile (${targetPos.x},${targetPos.y}) is too far from actor at (${actorPos.x},${actorPos.y}). Distance: ${distance.toFixed(2)}, max: ${MAX_TILL_DISTANCE.toFixed(2)}`,
      };
    }

    // Check world has tile access
    const worldWithTiles = world as any;
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

    // All checks passed
    return {
      valid: true,
    };
  }

  /**
   * Execute the till action.
   *
   * Calls SoilSystem.tillTile which:
   * - Validates terrain type (grass/dirt only)
   * - Changes terrain to dirt
   * - Sets fertility based on biome
   * - Sets tilled=true, plantability=3
   * - Initializes nutrients
   * - Emits soil:tilled event
   *
   * If SoilSystem throws an error (invalid terrain), we catch it
   * and return a failed ActionResult with the error message.
   */
  execute(action: Action, world: World): ActionResult {
    if (!action.targetPosition) {
      // This should have been caught in validate()
      return {
        success: false,
        reason: 'Till action requires targetPosition',
        effects: [],
        events: [],
      };
    }

    const targetPos = action.targetPosition;

    // Get tile from world
    const worldWithTiles = world as any;
    const tile = worldWithTiles.getTileAt(targetPos.x, targetPos.y);

    if (!tile) {
      return {
        success: false,
        reason: `No tile found at position (${targetPos.x},${targetPos.y})`,
        effects: [],
        events: [],
      };
    }

    // Attempt to till the tile
    try {
      this.soilSystem.tillTile(world, tile, targetPos.x, targetPos.y);

      // Tilling succeeded - SoilSystem already emitted soil:tilled event
      return {
        success: true,
        effects: [],
        events: [
          {
            type: 'action:completed',
            source: 'till-action-handler',
            data: {
              actionId: action.id,
              actionType: action.type,
              actorId: action.actorId,
              position: targetPos,
            },
          },
        ],
      };
    } catch (error: any) {
      // SoilSystem threw an error (invalid terrain, etc.)
      // Return failed result with clear error message
      return {
        success: false,
        reason: error.message || 'Failed to till tile',
        effects: [],
        events: [
          {
            type: 'action:failed',
            source: 'till-action-handler',
            data: {
              actionId: action.id,
              actionType: action.type,
              actorId: action.actorId,
              position: targetPos,
              error: error.message,
            },
          },
        ],
      };
    }
  }

  /**
   * Called if the till action is interrupted.
   *
   * For tilling, interruption doesn't require special cleanup.
   * The tile state is only modified in execute(), so interrupting
   * before completion leaves the tile unchanged.
   */
  onInterrupt?(_action: Action, _world: World, _reason: string): [] {
    // No cleanup needed - tile is only modified on successful completion
    return [];
  }
}
