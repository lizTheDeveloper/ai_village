/**
 * MovementIntentionSystem - Processes movement intentions and snaps positions on arrival
 *
 * This system implements Factorio-style movement optimization:
 * 1. Entities store movement INTENTION (destination + arrival time) instead of per-tick positions
 * 2. This system only processes entities that have ARRIVED at their destination
 * 3. On arrival: snap position to destination, clear intention, emit event
 *
 * This dramatically reduces position update overhead:
 * - Before: 20 entities × 20 TPS = 400 position updates/second
 * - After: 20 entities × ~2 arrivals/second = 40 position updates/second
 *
 * The renderer uses interpolatePosition() for smooth visual movement between updates.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MovementIntentionComponent } from '../components/MovementIntentionComponent.js';
import { hasArrived } from '../components/MovementIntentionComponent.js';

export class MovementIntentionSystem extends BaseSystem {
  public readonly id: SystemId = 'movement_intention';
  public readonly priority: number = 18; // Run before movement (20) but after steering (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    'position' as ComponentType,
    'movement_intention' as ComponentType,
  ];
  public readonly activationComponents = ['movement_intention'] as const;

  // Run every tick - arrival detection needs to be precise
  protected readonly throttleInterval = 0;

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const comps = ctx.components(entity);
      const intention = comps.optional<MovementIntentionComponent>('movement_intention');
      const position = comps.optional<PositionComponent>('position');

      if (!intention || !position) continue;

      // Check if entity has arrived this tick
      if (!intention.arrived && hasArrived(intention, ctx.tick)) {
        // Snap position to destination
        ctx.world.updateComponent(entity.id, 'position', {
          ...position,
          x: intention.destinationX,
          y: intention.destinationY,
          z: intention.destinationZ ?? position.z,
        });

        // Mark intention as arrived
        ctx.world.updateComponent(entity.id, 'movement_intention', {
          ...intention,
          arrived: true,
          isMoving: false,
        });

        // Emit arrival event
        ctx.events.emit('entity:arrived', {
          entityId: entity.id,
          x: intention.destinationX,
          y: intention.destinationY,
          z: intention.destinationZ,
          reason: intention.reason,
          targetEntityId: intention.targetEntityId,
        });
      }
    }
  }
}

// Register the system
export function registerMovementIntentionSystem(): void {
  // System will be registered via registerAllSystems
}
