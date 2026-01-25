import type { ActionHandler } from './ActionHandler.js';
import type { Action, ActionResult, ValidationResult } from './Action.js';
import type { World, ITile } from '../ecs/World.js';
import type { SoilSystem } from '../systems/SoilSystem.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { InventoryComponent, InventorySlot } from '../components/InventoryComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';
import { getEfficiencyBonus } from '../components/SkillsComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import {  TILL_DURATION_WITH_HOE,
  TILL_DURATION_WITH_SHOVEL,
  TILL_DURATION_BY_HAND,
  DIAGONAL_DISTANCE,
} from '../constants/index.js';

interface WorldWithTiles extends World {
  getTileAt(x: number, y: number): ITile | undefined;
}

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
   * Also modified by farming skill level:
   * - Level 0: 0% speed bonus
   * - Level 5: 25% speed bonus (Master farmer)
   *
   * Duration = (baseTicks / toolEfficiency) * (1 - skillBonus)
   */
  getDuration(action: Action, world: World): number {
    // Check if actor has tools in inventory
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      // No actor found, use hands (slowest)
      return TILL_DURATION_BY_HAND;
    }

    const inventoryComp = actor.getComponent(ComponentType.Inventory);
    if (!inventoryComp || !inventoryComp.slots) {
      // No inventory, use hands
      return TILL_DURATION_BY_HAND;
    }

    // Calculate tool-based duration
    let toolDuration: number;

    // Check for hoe (best tool, 100% efficiency)
    const hasHoe = inventoryComp.slots.some((slot: InventorySlot) => slot?.itemId === 'hoe' && slot?.quantity > 0);
    if (hasHoe) {
      toolDuration = TILL_DURATION_WITH_HOE;
    } else {
      // Check for shovel (medium tool, 80% efficiency)
      const hasShovel = inventoryComp.slots.some((slot: InventorySlot) => slot?.itemId === 'shovel' && slot?.quantity > 0);
      if (hasShovel) {
        toolDuration = TILL_DURATION_WITH_SHOVEL;
      } else {
        // Default to hands (50% efficiency)
        toolDuration = TILL_DURATION_BY_HAND;
      }
    }

    // Apply skill efficiency bonus
    const skillsComp = actor.getComponent(ComponentType.Skills);
    if (skillsComp) {
      const farmingLevel = skillsComp.levels.farming;
      const skillBonus = getEfficiencyBonus(farmingLevel); // 0-25%
      const speedMultiplier = 1 - (skillBonus / 100);
      return Math.max(1, Math.round(toolDuration * speedMultiplier));
    }

    return toolDuration;
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
    const actorPos = actor.getComponent(ComponentType.Position);
    if (!actorPos) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no position component`,
      };
    }

    // Check actor is adjacent to target (distance <= √2 ≈ 1.414)
    const dx = targetPos.x - actorPos.x;
    const dy = targetPos.y - actorPos.y;
    // PERFORMANCE: Use squared distance for comparison
    const DIAGONAL_DISTANCE_SQUARED = DIAGONAL_DISTANCE * DIAGONAL_DISTANCE;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > DIAGONAL_DISTANCE_SQUARED) {
      const distance = Math.sqrt(distanceSquared); // Only for error message
      return {
        valid: false,
        reason: `Target tile (${targetPos.x},${targetPos.y}) is too far from actor at (${actorPos.x},${actorPos.y}). Distance: ${distance.toFixed(2)}, max: ${DIAGONAL_DISTANCE.toFixed(2)}`,
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
    const worldWithTiles = world as WorldWithTiles;
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
      // Pass agentId to tillTile for tool checking
      this.soilSystem.tillTile(world, tile, targetPos.x, targetPos.y, action.actorId);

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
    } catch (error: unknown) {
      // SoilSystem threw an error (invalid terrain, tool missing, etc.)
      // Return failed result with clear error message
      const err = error as Error;
      return {
        success: false,
        reason: err.message || 'Failed to till tile',
        effects: [],
        events: [
          {
            type: 'action:failed' as const,
            source: 'till-action-handler' as const,
            data: {
              actionId: action.id,
              actionType: action.type,
              actorId: action.actorId,
              position: targetPos,
              error: err.message,
            } as Record<string, unknown>,
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
