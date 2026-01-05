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

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { RealityAnchorComponent } from '../components/RealityAnchorComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { DeityComponent } from '../components/DeityComponent.js';

export class RealityAnchorSystem implements System {
  public readonly id: SystemId = 'reality_anchor';
  public readonly priority = 18; // After intervention system
  public readonly requiredComponents = [CT.RealityAnchor] as const;

  private eventBus: EventBus | null = null;

  /** Update interval (ticks) */
  private readonly UPDATE_INTERVAL = 20; // Once per second at 20 TPS
  private lastUpdate = 0;

  public initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  public update(world: World): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdate < this.UPDATE_INTERVAL) {
      return;
    }

    this.lastUpdate = currentTick;

    // Process each reality anchor
    for (const anchor of world.query().with(CT.RealityAnchor).executeEntities()) {
      const anchorComp = anchor.components.get(CT.RealityAnchor) as RealityAnchorComponent;
      const position = anchor.components.get(CT.Position) as PositionComponent | undefined;

      if (!position) {
        continue;
      }

      this.updateAnchor(world, anchor.id, anchorComp, position, currentTick);
    }
  }

  /**
   * Update a single reality anchor
   */
  private updateAnchor(
    world: World,
    anchorId: string,
    anchor: RealityAnchorComponent,
    position: PositionComponent,
    currentTick: number
  ): void {
    // Skip if destroyed
    if (anchor.status === 'destroyed') {
      return;
    }

    // Handle power charging
    if (anchor.status === 'charging') {
      // Check if anchor has power available
      const anchorEntity = world.getEntity(anchorId);
      const powerComp = anchorEntity?.components.get(CT.Power) as any;

      if (!powerComp) {
        // No power component - can't charge
        return;
      }

      if (!powerComp.isPowered) {
        // Insufficient power - charging interrupted
        this.eventBus?.emit({
          type: 'reality_anchor:charging_interrupted',
          source: anchorId,
          data: {
            message: 'Reality Anchor charging interrupted: Insufficient power',
            powerLevel: anchor.powerLevel,
          },
        } as any);
        return;
      }

      // Power available - continue charging
      anchor.powerLevel = Math.min(1.0, anchor.powerLevel + 0.01);

      if (anchor.powerLevel >= 1.0) {
        anchor.status = 'ready';
        this.eventBus?.emit({
          type: 'reality_anchor:ready',
          source: anchorId,
          data: {},
        } as any);
      }
    }

    // Handle active field
    if (anchor.status === 'active') {
      this.maintainField(world, anchorId, anchor, position, currentTick);
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
    world: World,
    anchorId: string,
    anchor: RealityAnchorComponent,
    position: PositionComponent,
    currentTick: number
  ): void {
    // Check if anchor has sufficient power
    const anchorEntity = world.getEntity(anchorId);
    const powerComp = anchorEntity?.components.get(CT.Power) as any;

    if (!powerComp) {
      // No power component - field collapses
      this.fieldCollapse(world, anchorId, anchor, 'No power component');
      return;
    }

    // Check power status
    if (!powerComp.isPowered) {
      // Power lost - field collapses
      this.eventBus?.emit({
        type: 'reality_anchor:power_loss',
        source: anchorId,
        data: {
          message: 'Reality Anchor power loss: Field collapsing!',
          efficiency: powerComp.efficiency,
        },
      } as any);

      this.fieldCollapse(world, anchorId, anchor, 'Insufficient power');
      return;
    }

    // Check for partial power (25-75% efficiency)
    if (powerComp.efficiency < 1.0 && powerComp.efficiency >= 0.25) {
      this.eventBus?.emit({
        type: 'reality_anchor:power_insufficient',
        source: anchorId,
        data: {
          message: 'WARNING: Reality Anchor receiving partial power - field unstable!',
          efficiency: powerComp.efficiency,
        },
      } as any);

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
    }

    // Power consumption tracked via PowerComponent
    anchor.totalActiveTime++;

    // Detect entities in field
    const previousEntities = new Set(anchor.entitiesInField);
    anchor.entitiesInField.clear();

    // Check all entities for proximity
    for (const entity of world.query().executeEntities()) {
      const entityPos = entity.components.get(CT.Position) as PositionComponent | undefined;
      if (!entityPos) {
        continue;
      }

      const dx = entityPos.x - position.x;
      const dy = entityPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= anchor.fieldRadius) {
        anchor.entitiesInField.add(entity.id);

        // Check if this is a deity
        const deity = entity.components.get(CT.Deity) as DeityComponent | undefined;
        if (deity && !previousEntities.has(entity.id)) {
          this.godEnteredField(world, anchorId, anchor, entity.id, deity, currentTick);
        }
      }
    }

    // Check for entities that left the field
    for (const entityId of previousEntities) {
      if (!anchor.entitiesInField.has(entityId)) {
        const entity = world.getEntity(entityId);
        if (entity) {
          const deity = entity.components.get(CT.Deity) as DeityComponent | undefined;
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
    this.eventBus?.emit({
      type: 'reality_anchor:god_mortalized',
      source: anchorId,
      data: {
        godId,
        message: 'Divine intervention fails. The god has become mortal.',
      },
    } as any);

    // Check if this is the Supreme Creator
    const godEntity = world.getEntity(godId);
    if (godEntity?.components.has(CT.SupremeCreator)) {
      this.eventBus?.emit({
        type: 'reality_anchor:creator_mortalized',
        source: anchorId,
        data: {
          godId,
          message: 'The Supreme Creator has entered the field. It bleeds. It can be killed.',
        },
      } as any);
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
    this.eventBus?.emit({
      type: 'reality_anchor:god_restored',
      source: anchorId,
      data: {
        godId,
        message: 'Divine power restored. The god has left the field.',
      },
    } as any);
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

        this.eventBus?.emit({
          type: 'reality_anchor:overloading',
          source: anchorId,
          data: {
            message: 'WARNING: Reality anchor overloading! Field collapse imminent!',
            countdown: anchor.overloadCountdown,
          },
        } as any);
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
      this.eventBus?.emit({
        type: 'reality_anchor:god_restored',
        source: anchorId,
        data: {
          godId,
          message: 'Field collapse! Divine power restored!',
        },
      } as any);
    }

    anchor.mortalizedGods.clear();
    anchor.entitiesInField.clear();

    this.eventBus?.emit({
      type: 'reality_anchor:field_collapse',
      source: anchorId,
      data: {
        message: `Reality Anchor field collapsed: ${reason}`,
        reason,
      },
    } as any);
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

    const anchor = entity.components.get(CT.RealityAnchor) as RealityAnchorComponent | undefined;
    if (!anchor) {
      return false;
    }

    if (anchor.status !== 'ready') {
      return false;
    }

    anchor.status = 'active';
    anchor.lastActivatedAt = world.tick;

    this.eventBus?.emit({
      type: 'reality_anchor:activated',
      source: anchorId,
      data: {
        message: 'Reality anchor activated. Divine intervention nullified within field.',
      },
    } as any);

    return true;
  }

  /**
   * Check if a god is currently mortal (inside a reality anchor field)
   */
  public isGodMortal(world: World, godId: string): boolean {
    for (const anchor of world.query().with(CT.RealityAnchor).executeEntities()) {
      const anchorComp = anchor.components.get(CT.RealityAnchor) as RealityAnchorComponent;
      if (anchorComp.mortalizedGods.has(godId)) {
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
      const anchorComp = anchor.components.get(CT.RealityAnchor) as RealityAnchorComponent;
      const position = anchor.components.get(CT.Position) as PositionComponent | undefined;

      if (!position || anchorComp.status !== 'active') {
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
