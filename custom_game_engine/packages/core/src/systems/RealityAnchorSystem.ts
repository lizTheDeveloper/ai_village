/**
 * RealityAnchorSystem - Manages reality stabilization fields
 *
 * The reality anchor creates a field where divine intervention is impossible.
 * Within the field, gods revert to mortal status and can be killed.
 *
 * Key mechanics:
 * - Detects entities entering/leaving the field
 * - Nullifies divine powers within field radius
 * - Makes god avatars mortal (can take damage, can die)
 * - Consumes massive power to maintain
 * - Can overload and fail if stressed
 *
 * This is the tech path's ultimate weapon against the Supreme Creator.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { RealityAnchorComponent } from '../components/RealityAnchorComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { DeityComponent } from '../components/DeityComponent.js';
import type { PowerComponent } from '../components/PowerComponent.js';

export class RealityAnchorSystem extends BaseSystem {
  public readonly id: SystemId = 'reality_anchor';
  public readonly priority = 18; // After intervention system
  public readonly requiredComponents = [CT.RealityAnchor] as const;
  // Only run when reality anchor components exist (O(1) activation check)
  public readonly activationComponents = [CT.RealityAnchor] as const;

  /** Update interval (ticks) */
  protected readonly throttleInterval = 20; // Once per second at 20 TPS

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Process each reality anchor
    for (const anchor of ctx.activeEntities) {
      const anchorComp = anchor.getComponent<RealityAnchorComponent>(CT.RealityAnchor);
      const position = anchor.getComponent<PositionComponent>(CT.Position);

      if (!anchorComp || !position) {
        continue;
      }

      this.updateAnchor(ctx, anchor.id, anchorComp, position, currentTick);
    }
  }

  /**
   * Update a single reality anchor
   */
  private updateAnchor(
    ctx: SystemContext,
    anchorId: string,
    anchor: RealityAnchorComponent,
    position: PositionComponent,
    currentTick: number
  ): void {
    const world = ctx.world;

    // Skip if destroyed
    if (anchor.status === 'destroyed') {
      return;
    }

    // Handle power charging
    if (anchor.status === 'charging') {
      // Check if anchor has power available
      const anchorEntity = world.getEntity(anchorId);
      const powerComp = anchorEntity?.getComponent<PowerComponent>(CT.Power);

      if (!powerComp) {
        // No power component - can't charge
        return;
      }

      if (!powerComp.isPowered) {
        // Insufficient power - charging interrupted
        this.events.emitGeneric('reality_anchor:charging_interrupted', {
            message: 'Reality Anchor charging interrupted: Insufficient power',
            powerLevel: anchor.powerLevel,
          }, 'anchorId');
        return;
      }

      // Power available - continue charging
      anchor.powerLevel = Math.min(1.0, anchor.powerLevel + 0.01);

      if (anchor.powerLevel >= 1.0) {
        anchor.status = 'ready';
        this.events.emitGeneric('reality_anchor:ready', {}, 'anchorId');
      }
    }

    // Handle active field
    if (anchor.status === 'active') {
      this.maintainField(ctx, anchorId, anchor, position, currentTick);
    }

    // Handle overload
    if (anchor.isOverloading && anchor.overloadCountdown !== undefined) {
      anchor.overloadCountdown--;

      if (anchor.overloadCountdown <= 0) {
        this.catastrophicFailure(world, anchorId, anchor);
      }
    }
  }

  /**
   * Maintain active reality anchor field
   */
  private maintainField(
    ctx: SystemContext,
    anchorId: string,
    anchor: RealityAnchorComponent,
    position: PositionComponent,
    currentTick: number
  ): void {
    const world = ctx.world;

    // Check if anchor has sufficient power
    const anchorEntity = world.getEntity(anchorId);
    const powerComp = anchorEntity?.getComponent<PowerComponent>(CT.Power);

    if (!powerComp) {
      // No power component - field collapses
      this.fieldCollapse(world, anchorId, anchor, 'No power component');
      return;
    }

    // Check for partial power (25-100% efficiency) - handle this first
    if (powerComp.efficiency < 1.0 && powerComp.efficiency >= 0.25) {
      this.events.emitGeneric('reality_anchor:power_insufficient', {
          message: 'WARNING: Reality Anchor receiving partial power - field unstable!',
          efficiency: powerComp.efficiency,
        }, 'anchorId');

      // Field becomes unstable but doesn't collapse immediately
      // If efficiency < 0.5, start countdown to collapse
      if (powerComp.efficiency < 0.5) {
        // Field weakening - will collapse soon
        anchor.isOverloading = true;
        anchor.overloadCountdown = anchor.overloadCountdown ?? 100; // 5 seconds at 20 TPS
        anchor.overloadCountdown--;

        if (anchor.overloadCountdown <= 0) {
          this.fieldCollapse(world, anchorId, anchor, 'Sustained power insufficiency');
          return;
        }
      }
    } else if (powerComp.efficiency >= 1.0) {
      // Full power - reset overload countdown
      if (anchor.isOverloading) {
        anchor.isOverloading = false;
        anchor.overloadCountdown = undefined;
      }
    } else if (powerComp.efficiency < 0.25) {
      // Critical power loss - field collapses
      this.events.emitGeneric('reality_anchor:power_loss', {
          message: 'Reality Anchor power loss: Field collapsing!',
          efficiency: powerComp.efficiency,
        }, 'anchorId');

      this.fieldCollapse(world, anchorId, anchor, 'Insufficient power');
      return;
    }

    // Power consumption tracked via PowerComponent
    anchor.totalActiveTime++;

    // Detect entities in field
    const previousEntities = new Set(anchor.entitiesInField);
    anchor.entitiesInField.clear();

    // Use chunk-based spatial query instead of scanning all entities
    // This is O(nearby) instead of O(all entities in world)
    const nearbyEntities = ctx.getNearbyEntities(
      position,
      anchor.fieldRadius,
      [CT.Position] // Get all entities with position in radius
    );

    for (const { entity } of nearbyEntities) {
      anchor.entitiesInField.add(entity.id);

      // Check if this is a deity
      const deity = entity.getComponent<DeityComponent>(CT.Deity);
      if (deity && !previousEntities.has(entity.id)) {
        this.godEnteredField(world, anchorId, anchor, entity.id, deity, currentTick);
      }
    }

    // Check for entities that left the field
    for (const entityId of previousEntities) {
      if (!anchor.entitiesInField.has(entityId)) {
        const entity = world.getEntity(entityId);
        if (entity) {
          const deity = entity.getComponent<DeityComponent>(CT.Deity);
          if (deity) {
            this.godLeftField(world, anchorId, anchor, entityId, deity);
          }
        }
      }
    }

    // Check for stability issues
    const godCount = anchor.mortalizedGods.size;
    if (godCount > 1) {
      // Multiple gods in field = extreme stress
      this.checkStability(world, anchorId, anchor, godCount);
    }
  }

  /**
   * Handle a god entering the reality anchor field
   */
  private godEnteredField(
    world: World,
    anchorId: string,
    anchor: RealityAnchorComponent,
    godId: string,
    _deity: DeityComponent,
    _currentTick: number
  ): void {
    // Make god mortal
    anchor.mortalizedGods.add(godId);

    // Emit event
    this.events.emitGeneric('reality_anchor:god_mortalized', {
        godId,
        message: 'Divine intervention fails. The god has become mortal.',
      }, 'anchorId');

    // Check if this is the Supreme Creator
    const godEntity = world.getEntity(godId);
    if (godEntity?.components.has(CT.SupremeCreator)) {
      this.events.emitGeneric('reality_anchor:creator_mortalized', {
          godId,
          message: 'The Supreme Creator has entered the field. It bleeds. It can be killed.',
        }, 'anchorId');
    }
  }

  /**
   * Handle a god leaving the reality anchor field
   */
  private godLeftField(
    _world: World,
    anchorId: string,
    anchor: RealityAnchorComponent,
    godId: string,
    _deity: DeityComponent
  ): void {
    // Restore godhood
    anchor.mortalizedGods.delete(godId);

    // Emit event
    this.events.emitGeneric('reality_anchor:god_restored', {
        godId,
        message: 'Divine power restored. The god has left the field.',
      }, 'anchorId');
  }

  /**
   * Check field stability under stress
   */
  private checkStability(
    _world: World,
    anchorId: string,
    anchor: RealityAnchorComponent,
    godCount: number
  ): void {
    // Multiple gods in field puts extreme stress on the device
    const stressLevel = godCount / 3; // 3 gods = 100% stress
    const failureChance = Math.max(0, stressLevel - anchor.stabilizationQuality);

    if (Math.random() < failureChance * 0.01) { // 1% base chance per tick
      if (!anchor.isOverloading) {
        anchor.isOverloading = true;
        anchor.status = 'overloading';
        anchor.overloadCountdown = 600; // 30 seconds at 20 TPS

        this.events.emitGeneric('reality_anchor:overloading', {
            message: 'WARNING: Reality anchor overloading! Field collapse imminent!',
            countdown: anchor.overloadCountdown,
          }, 'anchorId');
      }
    }
  }

  /**
   * Handle field collapse from power loss or other causes
   */
  private fieldCollapse(
    _world: World,
    anchorId: string,
    anchor: RealityAnchorComponent,
    reason: string
  ): void {
    anchor.status = 'failed';
    anchor.isOverloading = false;
    anchor.powerLevel = 0;

    // Release all mortalized gods
    for (const godId of anchor.mortalizedGods) {
      this.events.emitGeneric('reality_anchor:god_restored', {
          godId,
          message: 'Field collapse! Divine power restored!',
        }, 'anchorId');
    }

    anchor.mortalizedGods.clear();
    anchor.entitiesInField.clear();

    this.events.emitGeneric('reality_anchor:field_collapse', {
        message: `Reality Anchor field collapsed: ${reason}`,
        reason,
      }, 'anchorId');
  }

  /**
   * Handle catastrophic failure
   */
  private catastrophicFailure(
    world: World,
    anchorId: string,
    anchor: RealityAnchorComponent
  ): void {
    this.fieldCollapse(world, anchorId, anchor, 'Catastrophic overload');
  }

  // ============ Public API ============

  /**
   * Activate a reality anchor
   */
  public activateAnchor(world: World, anchorId: string): boolean {
    const entity = world.getEntity(anchorId);
    if (!entity) {
      return false;
    }

    const anchor = entity.getComponent<RealityAnchorComponent>(CT.RealityAnchor);
    if (!anchor) {
      return false;
    }

    if (anchor.status !== 'ready') {
      return false;
    }

    anchor.status = 'active';
    anchor.lastActivatedAt = world.tick;

    this.events.emitGeneric('reality_anchor:activated', {
        message: 'Reality anchor activated. Divine intervention nullified within field.',
      }, 'anchorId');

    return true;
  }

  /**
   * Check if a god is currently mortal (inside a reality anchor field)
   */
  public isGodMortal(world: World, godId: string): boolean {
    for (const anchor of world.query().with(CT.RealityAnchor).executeEntities()) {
      const anchorComp = anchor.getComponent<RealityAnchorComponent>(CT.RealityAnchor);
      if (anchorComp && anchorComp.mortalizedGods.has(godId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if divine intervention is blocked at a position
   */
  public isDivineInterventionBlocked(world: World, x: number, y: number): boolean {
    for (const anchor of world.query().with(CT.RealityAnchor).executeEntities()) {
      const anchorComp = anchor.getComponent<RealityAnchorComponent>(CT.RealityAnchor);
      const position = anchor.getComponent<PositionComponent>(CT.Position);

      if (!anchorComp || !position || anchorComp.status !== 'active') {
        continue;
      }

      const dx = x - position.x;
      const dy = y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= anchorComp.fieldRadius) {
        return true;
      }
    }

    return false;
  }
}
