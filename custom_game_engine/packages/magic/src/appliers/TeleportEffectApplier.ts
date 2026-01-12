/**
 * TeleportEffectApplier - Handles teleportation spell effects
 *
 * Applies teleportation to entities with support for:
 * - Self teleport to location
 * - Target teleport to location
 * - Position swapping between caster and target
 * - Directional teleport (forward, cardinal directions)
 * - Random teleport within range
 * - Anchor-based teleport (marked locations)
 * - Planar teleport (dimension shift)
 * - Mass teleport (multiple targets)
 * - Resistance checks for unwilling targets
 * - Terrain blocking validation
 * - Range scaling with proficiency
 */

import type { Entity, World } from '@ai-village/core';
import type {
  TeleportEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';

// ============================================================================
// TeleportEffectApplier
// ============================================================================

class TeleportEffectApplierClass implements EffectApplier<TeleportEffect> {
  public readonly category = 'teleport' as const;

  /**
   * Apply teleport effect to target entity.
   */
  apply(
    effect: TeleportEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Validate target has position component
    const targetPos = target.getComponent('position');
    if (!targetPos) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target lacks position component',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get teleport type from effect (with type assertion for tests)
    const teleportType = (effect as any).teleportType || effect.teleportType;

    // Calculate destination based on teleport type
    const destination = this.calculateDestination(
      effect,
      caster,
      target,
      context,
      teleportType
    );

    if (!destination.success) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: destination.error || 'Failed to calculate destination',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Validate range based on teleport type
    const pos = targetPos as any;
    const casterPos = caster.getComponent('position') as any;

    // For self/directional/random teleports, measure from current position to destination
    // For target teleports, measure from caster to target (range limits targeting, not destination)
    let rangeCheckDistance: number;

    if (teleportType === 'target' || teleportType === 'target_to_caster' || teleportType === 'swap' || teleportType === 'mass') {
      // Range check is caster-to-target distance (can we reach the target to teleport them?)
      if (casterPos) {
        rangeCheckDistance = Math.sqrt(
          (pos.x - casterPos.x) ** 2 + (pos.y - casterPos.y) ** 2
        );
      } else {
        rangeCheckDistance = 0; // No caster position, skip range check
      }
    } else {
      // Range check is distance we're teleporting
      rangeCheckDistance = Math.sqrt(
        (destination.x - pos.x) ** 2 + (destination.y - pos.y) ** 2
      );
    }

    const maxRange = context.scaledValues.get('range')?.value
      ?? (effect as any).range
      ?? effect.maxDistance
      ?? 100;

    if (rangeCheckDistance > maxRange && maxRange > 0) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: { distance: rangeCheckDistance, maxRange },
        resisted: false,
        error: `Destination out of range (${rangeCheckDistance.toFixed(1)} > ${maxRange})`,
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Store actual teleport distance for result
    const teleportDistance = Math.sqrt(
      (destination.x - pos.x) ** 2 + (destination.y - pos.y) ** 2
    );

    // Check resistance for unwilling teleport
    if ((effect as any).allowsResistance && target !== caster) {
      const resisted = this.checkResistance(target, context);
      if (resisted) {
        return {
          success: false,
          effectId: effect.id,
          targetId: target.id,
          appliedValues: { distance: teleportDistance },
          resisted: true,
          error: 'Target resisted teleportation',
          appliedAt: context.tick,
          casterId: caster.id,
          spellId: context.spell.id,
        };
      }
    }

    // Check terrain blocking
    if ((context as any).terrainBlocked || ((effect as any).checkTerrain && this.isTerrainBlocked(destination.x, destination.y, world))) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: { destinationX: destination.x, destinationY: destination.y },
        resisted: false,
        error: 'Destination blocked by terrain',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Perform teleport
    const teleportResult = this.performTeleport(
      effect,
      caster,
      target,
      destination,
      context,
      teleportType
    );

    if (!teleportResult.success) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: teleportResult.error,
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Trigger events if enabled
    const eventsTriggered: string[] = [];
    if ((effect as any).triggersEvents) {
      eventsTriggered.push('teleport_departure', 'teleport_arrival');
    }

    const result: any = {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        x: destination.x,
        y: destination.y,
        distance: teleportDistance,
        ...(destination.targetPlane && { targetPlane: destination.targetPlane }),
        ...(((effect as any).duration !== undefined) && { duration: (effect as any).duration }),
        ...(((effect as any).blinkInterval !== undefined) && { blinkInterval: (effect as any).blinkInterval }),
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      eventsTriggered: eventsTriggered.length > 0 ? eventsTriggered : undefined,
    };

    // Add top-level fields for mass teleport results
    if (teleportResult.targetsTeleported !== undefined) {
      result.targetsTeleported = teleportResult.targetsTeleported;
    }

    return result;
  }

  /**
   * Process teleport effect tick (for blink effects with duration).
   */
  tick(
    _activeEffect: ActiveEffect,
    _effect: TeleportEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // Future: Handle blink effect (repeated micro-teleports)
    // Would track blink interval and perform periodic random teleports
  }

  /**
   * Remove teleport effect (cleanup).
   */
  remove(
    _activeEffect: ActiveEffect,
    _effect: TeleportEffect,
    _target: Entity,
    _world: World
  ): void {
    // No cleanup needed for instant teleports
    // Future: Remove blink status icon
  }

  // ========== Helper Methods ==========

  /**
   * Calculate destination coordinates based on teleport type.
   */
  private calculateDestination(
    effect: TeleportEffect,
    caster: Entity,
    target: Entity,
    context: EffectContext,
    teleportType: string
  ): { success: true; x: number; y: number; targetPlane?: string } | { success: false; error: string } {
    const targetPos = target.getComponent('position');
    const casterPos = caster.getComponent('position');

    switch (teleportType) {
      case 'self':
      case 'target': {
        // Use context.targetLocation if available, otherwise from effect
        const targetLocation = (context as any).targetLocation || (effect as any).targetLocation;
        if (!targetLocation) {
          return { success: false, error: 'No target location specified' };
        }
        return { success: true, x: targetLocation.x, y: targetLocation.y };
      }

      case 'target_to_caster': {
        // Teleport target to caster's location
        if (!casterPos) {
          return { success: false, error: 'Caster lacks position component' };
        }
        const cPos = casterPos as any;
        return { success: true, x: cPos.x, y: cPos.y };
      }

      case 'swap': {
        // Swap positions - destination is caster's current position
        // (caster will be moved to target's position in performTeleport)
        if (!casterPos) {
          return { success: false, error: 'Caster lacks position component' };
        }
        const cPos = casterPos as any;
        return { success: true, x: cPos.x, y: cPos.y };
      }

      case 'directional': {
        // Teleport in a cardinal direction
        if (!targetPos) {
          return { success: false, error: 'Target lacks position component' };
        }
        const tPos = targetPos as any;
        const direction = (context as any).direction || (effect as any).direction;
        const distance = (effect as any).distance || 10;

        const offset = this.getDirectionalOffset(direction, distance);
        return {
          success: true,
          x: tPos.x + offset.x,
          y: tPos.y + offset.y,
        };
      }

      case 'forward': {
        // Teleport in facing direction
        if (!targetPos) {
          return { success: false, error: 'Target lacks position component' };
        }
        const tPos = targetPos as any;
        const orientation = target.getComponent('orientation') as any;
        if (!orientation) {
          return { success: false, error: 'Target lacks orientation component' };
        }
        const distance = (effect as any).distance || 10;
        const dx = Math.cos(orientation.facing) * distance;
        const dy = Math.sin(orientation.facing) * distance;
        return {
          success: true,
          x: tPos.x + dx,
          y: tPos.y + dy,
        };
      }

      case 'self_random':
      case 'blink': {
        // Random teleport within range
        if (!targetPos) {
          return { success: false, error: 'Target lacks position component' };
        }
        const tPos = targetPos as any;
        const maxRange = (context as any).range || (effect as any).range || effect.maxDistance || 15;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * maxRange;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        return {
          success: true,
          x: tPos.x + dx,
          y: tPos.y + dy,
        };
      }

      case 'anchor': {
        // Teleport to marked anchor location
        const anchorName = (context as any).anchorName || (effect as any).anchorName;
        const anchors = caster.getComponent('teleport_anchors') as any;
        if (!anchors) {
          return { success: false, error: 'No teleport anchors found' };
        }
        const anchor = anchors.anchors.find((a: any) => a.name === anchorName);
        if (!anchor) {
          return { success: false, error: `Anchor '${anchorName}' not found` };
        }
        return { success: true, x: anchor.x, y: anchor.y };
      }

      case 'planar': {
        // Planar teleport (dimension shift)
        const targetLocation = (context as any).targetLocation || (effect as any).targetLocation;
        const targetPlane = (context as any).targetPlane || (effect as any).targetPlane;
        if (!targetLocation) {
          return { success: false, error: 'No target location specified for planar shift' };
        }
        return {
          success: true,
          x: targetLocation.x,
          y: targetLocation.y,
          targetPlane,
        };
      }

      case 'mass': {
        // Mass teleport - same destination for all targets
        const targetLocation = (context as any).targetLocation || (effect as any).targetLocation;
        if (!targetLocation) {
          return { success: false, error: 'No target location specified' };
        }
        return { success: true, x: targetLocation.x, y: targetLocation.y };
      }

      default:
        return { success: false, error: `Unknown teleport type: ${teleportType}` };
    }
  }

  /**
   * Get directional offset for cardinal directions.
   */
  private getDirectionalOffset(direction: string, distance: number): { x: number; y: number } {
    switch (direction) {
      case 'north':
        return { x: 0, y: -distance };
      case 'south':
        return { x: 0, y: distance };
      case 'east':
        return { x: distance, y: 0 };
      case 'west':
        return { x: -distance, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }

  /**
   * Perform the actual teleport operation.
   */
  private performTeleport(
    _effect: TeleportEffect,
    caster: Entity,
    target: Entity,
    destination: { x: number; y: number; targetPlane?: string },
    context: EffectContext,
    teleportType: string
  ): { success: true; targetsTeleported?: number } | { success: false; error: string } {
    const targetPos = target.getComponent('position') as any;
    if (!targetPos) {
      return { success: false, error: 'Target lacks position component' };
    }

    // Handle swap teleport (exchange positions)
    if (teleportType === 'swap') {
      const casterPos = caster.getComponent('position') as any;
      if (!casterPos) {
        return { success: false, error: 'Caster lacks position component' };
      }

      // Store original positions
      const originalTargetX = targetPos.x;
      const originalTargetY = targetPos.y;

      // Swap positions
      targetPos.x = casterPos.x;
      targetPos.y = casterPos.y;
      casterPos.x = originalTargetX;
      casterPos.y = originalTargetY;

      return { success: true };
    }

    // Handle mass teleport
    if (teleportType === 'mass') {
      const additionalTargets = (context as any).additionalTargets || [];
      let teleportedCount = 1; // Start with main target

      // Teleport main target
      targetPos.x = destination.x;
      targetPos.y = destination.y;

      // Teleport additional targets
      for (const entity of additionalTargets) {
        const pos = entity.getComponent('position') as any;
        if (pos) {
          pos.x = destination.x;
          pos.y = destination.y;
          teleportedCount++;
        }
      }

      return { success: true, targetsTeleported: teleportedCount };
    }

    // Standard teleport
    targetPos.x = destination.x;
    targetPos.y = destination.y;

    // Handle planar shift (add/update plane component)
    if (destination.targetPlane) {
      // Future: Add plane/dimension component to track current plane
      // For now, just note it in the result
    }

    return { success: true };
  }

  /**
   * Check if target resists teleportation.
   */
  private checkResistance(target: Entity, context: EffectContext): boolean {
    // Check willpower resistance
    const stats = target.getComponent('stats') as any;
    const willpower = stats?.willpower ?? 10;

    // Check teleport resistance trait
    const resistance = target.getComponent('resistance') as any;
    const teleportResistance = resistance?.teleport ?? 0;

    // High willpower or resistance can resist
    // Resistance check: willpower > proficiency * 0.8 OR random < teleportResistance
    const proficiency = (context.casterMagic?.techniqueProficiency as any)?.teleport ?? 50;

    if (willpower > proficiency * 0.8) {
      return Math.random() < 0.5; // 50% chance to resist if high willpower
    }

    if (teleportResistance > 0 && Math.random() < teleportResistance) {
      return true; // Resisted based on resistance trait
    }

    return false;
  }

  /**
   * Check if terrain blocks teleportation to location.
   */
  private isTerrainBlocked(_x: number, _y: number, _world: World): boolean {
    // Future: Implement terrain collision checking
    // For now, always return false (no blocking)
    return false;
  }
}

export const TeleportEffectApplier = new TeleportEffectApplierClass();

// ============================================================================
// Registration Function
// ============================================================================

export function registerTeleportEffectApplier(): void {
  const executor = require('../SpellEffectExecutor.js').SpellEffectExecutor.getInstance();
  executor.registerApplier(TeleportEffectApplier);
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the teleport effect system.
 * Call this during game startup.
 */
export function initializeTeleportEffects(): void {
  registerTeleportEffectApplier();
}
