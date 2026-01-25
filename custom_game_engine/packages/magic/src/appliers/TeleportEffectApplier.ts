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
import type {
  PositionComponentData,
  OrientationComponent,
  TeleportAnchorsComponent,
  StatsComponent,
  ResistanceComponent,
} from '../types/ComponentTypes.js';

// ============================================================================
// Extended Types for Teleport Effects
// ============================================================================

/** Extended result type for teleport effects with additional metadata */
interface TeleportEffectApplicationResult extends EffectApplicationResult {
  targetPlane?: string;
  targetsTeleported?: number;
  eventsTriggered?: string[];
}

// ============================================================================
// Type Guards
// ============================================================================

function isPositionComponent(component: unknown): component is PositionComponentData {
  if (typeof component !== 'object' || component === null) {
    return false;
  }
  const comp = component as Record<string, unknown>;
  return (
    'x' in comp &&
    'y' in comp &&
    typeof comp.x === 'number' &&
    typeof comp.y === 'number'
  );
}

function isOrientationComponent(component: unknown): component is OrientationComponent {
  if (typeof component !== 'object' || component === null) {
    return false;
  }
  const comp = component as Record<string, unknown>;
  return (
    'type' in comp &&
    'facing' in comp &&
    comp.type === 'orientation' &&
    typeof comp.facing === 'number'
  );
}

function isTeleportAnchorsComponent(component: unknown): component is TeleportAnchorsComponent {
  if (typeof component !== 'object' || component === null) {
    return false;
  }
  const comp = component as Record<string, unknown>;
  return (
    'type' in comp &&
    'anchors' in comp &&
    comp.type === 'teleport_anchors' &&
    Array.isArray(comp.anchors)
  );
}

function isStatsComponent(component: unknown): component is StatsComponent {
  if (typeof component !== 'object' || component === null) {
    return false;
  }
  const comp = component as Record<string, unknown>;
  return 'type' in comp && comp.type === 'stats';
}

function isResistanceComponent(component: unknown): component is ResistanceComponent {
  if (typeof component !== 'object' || component === null) {
    return false;
  }
  const comp = component as Record<string, unknown>;
  return 'type' in comp && comp.type === 'resistance';
}

// ============================================================================
// Helper Functions for Safe Property Access
// ============================================================================

/**
 * Safely get a number property from an object, with fallback
 */
function getNumberProp(obj: unknown, key: string, fallback: number): number {
  if (typeof obj !== 'object' || obj === null) {
    return fallback;
  }
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : fallback;
}

/**
 * Safely get a string property from an object, with fallback
 */
function getStringProp(obj: unknown, key: string, fallback?: string): string | undefined {
  if (typeof obj !== 'object' || obj === null) {
    return fallback;
  }
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : fallback;
}

/**
 * Safely get a boolean property from an object, with fallback
 */
function getBooleanProp(obj: unknown, key: string, fallback: boolean): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return fallback;
  }
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Safely get a location property from an object
 */
function getLocationProp(obj: unknown, key: string): { x: number; y: number } | undefined {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }
  const value = (obj as Record<string, unknown>)[key];
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const loc = value as Record<string, unknown>;
  if (typeof loc.x === 'number' && typeof loc.y === 'number') {
    return { x: loc.x, y: loc.y };
  }
  return undefined;
}

/**
 * Safely get an array property from an object
 */
function getArrayProp<T>(obj: unknown, key: string): T[] | undefined {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }
  const value = (obj as Record<string, unknown>)[key];
  return Array.isArray(value) ? value as T[] : undefined;
}

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
  ): TeleportEffectApplicationResult {

    // Validate target has position component
    const targetPosRaw = target.getComponent('position');
    if (!targetPosRaw || !isPositionComponent(targetPosRaw)) {
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
    const targetPos = targetPosRaw;

    // Get teleport type from effect (could be extended with additional types at runtime)
    // Widen to string to handle runtime extensions beyond base union type
    const teleportType: string = effect.teleportType;

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
    const pos = targetPos;
    const casterPosRaw = caster.getComponent('position');
    const casterPos = casterPosRaw && isPositionComponent(casterPosRaw) ? casterPosRaw : undefined;

    // For self/directional/random teleports, measure from current position to destination
    // For target teleports, measure from caster to target (range limits targeting, not destination)
    let rangeCheckDistance: number;

    // Extended teleport types that may not be in base union
    const isTargetTeleport = teleportType === 'target' || teleportType === 'target_to_caster' ||
                             teleportType === 'mass';
    const isSwapTeleport = teleportType === 'swap';

    if (isTargetTeleport || isSwapTeleport) {
      // Range check is caster-to-target distance (can we reach the target to teleport them?)
      if (casterPos) {
        // PERFORMANCE: Keep sqrt here as value is used for error message display
        rangeCheckDistance = Math.sqrt(
          (pos.x - casterPos.x) ** 2 + (pos.y - casterPos.y) ** 2
        );
      } else {
        rangeCheckDistance = 0; // No caster position, skip range check
      }
    } else {
      // Range check is distance we're teleporting
      // PERFORMANCE: Keep sqrt here as value is used for error message display
      rangeCheckDistance = Math.sqrt(
        (destination.x - pos.x) ** 2 + (destination.y - pos.y) ** 2
      );
    }

    const maxRange = context.scaledValues.get('range')?.value
      ?? getNumberProp(effect, 'range', effect.maxDistance ?? 100);

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
    // PERFORMANCE: Keep sqrt here as value is stored in result for logging/analytics
    const teleportDistance = Math.sqrt(
      (destination.x - pos.x) ** 2 + (destination.y - pos.y) ** 2
    );

    // Check resistance for unwilling teleport
    if (getBooleanProp(effect, 'allowsResistance', false) && target !== caster) {
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
    const terrainBlocked = getBooleanProp(context, 'terrainBlocked', false);
    const checkTerrain = getBooleanProp(effect, 'checkTerrain', false);
    if (terrainBlocked || (checkTerrain && this.isTerrainBlocked(destination.x, destination.y, world))) {
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
    if (getBooleanProp(effect, 'triggersEvents', false)) {
      eventsTriggered.push('teleport_departure', 'teleport_arrival');
    }

    // Build applied values object - EffectApplicationResult expects Record<string, number>
    const appliedValues: Record<string, number> = {
      x: destination.x,
      y: destination.y,
      distance: teleportDistance,
    };

    const duration = getNumberProp(effect, 'duration', -1);
    if (duration !== -1) {
      appliedValues.duration = duration;
    }

    const blinkInterval = getNumberProp(effect, 'blinkInterval', -1);
    if (blinkInterval !== -1) {
      appliedValues.blinkInterval = blinkInterval;
    }

    // Build result with proper typing
    const result: TeleportEffectApplicationResult = {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      eventsTriggered: eventsTriggered.length > 0 ? eventsTriggered : undefined,
      targetPlane: destination.targetPlane,
      targetsTeleported: teleportResult.targetsTeleported,
    };

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
    const targetPosRaw = target.getComponent('position');
    const casterPosRaw = caster.getComponent('position');

    switch (teleportType) {
      case 'self':
      case 'target': {
        // Use context.targetLocation if available, otherwise from effect
        const targetLocation = getLocationProp(context, 'targetLocation') || getLocationProp(effect, 'targetLocation');
        if (!targetLocation) {
          return { success: false, error: 'No target location specified' };
        }
        return { success: true, x: targetLocation.x, y: targetLocation.y };
      }

      case 'target_to_caster': {
        // Teleport target to caster's location
        if (!casterPosRaw || !isPositionComponent(casterPosRaw)) {
          return { success: false, error: 'Caster lacks position component' };
        }
        return { success: true, x: casterPosRaw.x, y: casterPosRaw.y };
      }

      case 'swap': {
        // Swap positions - destination is caster's current position
        // (caster will be moved to target's position in performTeleport)
        if (!casterPosRaw || !isPositionComponent(casterPosRaw)) {
          return { success: false, error: 'Caster lacks position component' };
        }
        return { success: true, x: casterPosRaw.x, y: casterPosRaw.y };
      }

      case 'directional': {
        // Teleport in a cardinal direction
        if (!targetPosRaw || !isPositionComponent(targetPosRaw)) {
          return { success: false, error: 'Target lacks position component' };
        }
        const direction = getStringProp(context, 'direction') || getStringProp(effect, 'direction') || 'north';
        const distance = getNumberProp(effect, 'distance', 10);

        const offset = this.getDirectionalOffset(direction, distance);
        return {
          success: true,
          x: targetPosRaw.x + offset.x,
          y: targetPosRaw.y + offset.y,
        };
      }

      case 'forward': {
        // Teleport in facing direction
        if (!targetPosRaw || !isPositionComponent(targetPosRaw)) {
          return { success: false, error: 'Target lacks position component' };
        }
        const orientationRaw = target.getComponent('orientation');
        if (!orientationRaw || !isOrientationComponent(orientationRaw)) {
          return { success: false, error: 'Target lacks orientation component' };
        }
        const distance = getNumberProp(effect, 'distance', 10);
        const dx = Math.cos(orientationRaw.facing) * distance;
        const dy = Math.sin(orientationRaw.facing) * distance;
        return {
          success: true,
          x: targetPosRaw.x + dx,
          y: targetPosRaw.y + dy,
        };
      }

      case 'self_random':
      case 'blink': {
        // Random teleport within range
        if (!targetPosRaw || !isPositionComponent(targetPosRaw)) {
          return { success: false, error: 'Target lacks position component' };
        }
        const maxRange = getNumberProp(context, 'range', getNumberProp(effect, 'range', effect.maxDistance ?? 15));
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * maxRange;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        return {
          success: true,
          x: targetPosRaw.x + dx,
          y: targetPosRaw.y + dy,
        };
      }

      case 'anchor': {
        // Teleport to marked anchor location
        const anchorName = getStringProp(context, 'anchorName') || getStringProp(effect, 'anchorName');
        const anchorsRaw = caster.getComponent('teleport_anchors');
        if (!anchorsRaw || !isTeleportAnchorsComponent(anchorsRaw)) {
          return { success: false, error: 'No teleport anchors found' };
        }
        const anchor = anchorsRaw.anchors.find((a) => a.name === anchorName);
        if (!anchor) {
          return { success: false, error: `Anchor '${anchorName}' not found` };
        }
        return { success: true, x: anchor.x, y: anchor.y };
      }

      case 'planar': {
        // Planar teleport (dimension shift)
        const targetLocation = getLocationProp(context, 'targetLocation') || getLocationProp(effect, 'targetLocation');
        const targetPlane = getStringProp(context, 'targetPlane') || getStringProp(effect, 'targetPlane');
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
        const targetLocation = getLocationProp(context, 'targetLocation') || getLocationProp(effect, 'targetLocation');
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
    const targetPosRaw = target.getComponent('position');
    if (!targetPosRaw || !isPositionComponent(targetPosRaw)) {
      return { success: false, error: 'Target lacks position component' };
    }

    // Handle swap teleport (exchange positions)
    if (teleportType === 'swap') {
      const casterPosRaw = caster.getComponent('position');
      if (!casterPosRaw || !isPositionComponent(casterPosRaw)) {
        return { success: false, error: 'Caster lacks position component' };
      }

      // Store original positions
      const originalTargetX = targetPosRaw.x;
      const originalTargetY = targetPosRaw.y;

      // Swap positions
      targetPosRaw.x = casterPosRaw.x;
      targetPosRaw.y = casterPosRaw.y;
      casterPosRaw.x = originalTargetX;
      casterPosRaw.y = originalTargetY;

      return { success: true };
    }

    // Handle mass teleport
    if (teleportType === 'mass') {
      const additionalTargets = getArrayProp<Entity>(context, 'additionalTargets') || [];
      let teleportedCount = 1; // Start with main target

      // Teleport main target
      targetPosRaw.x = destination.x;
      targetPosRaw.y = destination.y;

      // Teleport additional targets
      for (const entity of additionalTargets) {
        const posRaw = entity.getComponent('position');
        if (posRaw && isPositionComponent(posRaw)) {
          posRaw.x = destination.x;
          posRaw.y = destination.y;
          teleportedCount++;
        }
      }

      return { success: true, targetsTeleported: teleportedCount };
    }

    // Standard teleport
    targetPosRaw.x = destination.x;
    targetPosRaw.y = destination.y;

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
    const statsRaw = target.getComponent('stats');
    const stats = statsRaw && isStatsComponent(statsRaw) ? statsRaw : undefined;
    const willpower = stats?.willpower ?? 10;

    // Check teleport resistance trait
    const resistanceRaw = target.getComponent('resistance');
    const resistance = resistanceRaw && isResistanceComponent(resistanceRaw) ? resistanceRaw : undefined;
    const teleportResistance = resistance?.teleport ?? 0;

    // High willpower or resistance can resist
    // Resistance check: willpower > proficiency * 0.8 OR random < teleportResistance
    // Access techniqueProficiency safely
    const techniqueProficiency = context.casterMagic?.techniqueProficiency;
    const proficiency = (
      techniqueProficiency &&
      typeof techniqueProficiency === 'object' &&
      'teleport' in techniqueProficiency &&
      typeof techniqueProficiency.teleport === 'number'
    ) ? techniqueProficiency.teleport : 50;

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
