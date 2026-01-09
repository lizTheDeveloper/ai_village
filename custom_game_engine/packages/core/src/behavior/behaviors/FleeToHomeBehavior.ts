/**
 * FleeToHomeBehavior - Return to assigned bed when scared or hurt
 *
 * Triggered when:
 * - Agent is frightened/threatened
 * - Agent is injured (health < 30%)
 *
 * Part of Phase 4 of the Bed-as-Home system
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { getPosition } from '../../utils/componentHelpers.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * FleeToHomeBehavior - Navigate to assigned bed when scared/hurt
 */
export class FleeToHomeBehavior extends BaseBehavior {
  readonly name = 'flee_to_home' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);

    if (!position || !agent) {
      return { complete: true, reason: 'Missing required components' };
    }

    // Check if agent has an assigned bed
    if (!agent.assignedBed) {
      // No home to flee to - fall back to regular flee or wander
      this.switchTo(entity, 'flee');
      return { complete: true, reason: 'No assigned bed to flee to' };
    }

    // Get bed entity
    const bedEntity = world.entities.get(agent.assignedBed);
    if (!bedEntity) {
      // Bed no longer exists - clear assignment and fall back
      this.switchTo(entity, 'flee');
      return { complete: true, reason: 'Bed entity not found' };
    }

    const bedPos = getPosition(bedEntity);
    if (!bedPos) {
      this.switchTo(entity, 'flee');
      return { complete: true, reason: 'Bed has no position' };
    }

    // Navigate toward bed (with arrival slowdown)
    const distance = this.moveToward(entity, bedPos);

    // Check if arrived at home (within 2 tiles)
    if (distance <= 2.0) {
      this.stopAllMovement(entity);

      // Emit event that agent reached home safely
      world.eventBus.emit({
        type: 'agent:reached_home',
        source: entity.id,
        data: {
          agentId: entity.id,
          bedId: agent.assignedBed,
          timestamp: world.tick,
        },
      });

      // Behavior complete - agent is now safe at home
      return { complete: true, reason: 'arrived_home' };
    }

    // Continue fleeing to home - return void to keep behavior active
  }
}

/**
 * Standalone function for BehaviorRegistry.
 */
export function fleeToHomeBehavior(entity: EntityImpl, world: World): void {
  const behavior = new FleeToHomeBehavior();
  behavior.execute(entity, world);
}
