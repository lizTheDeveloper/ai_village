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
import { ComponentType, ComponentType as CT } from '../../types/ComponentType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';

/**
 * FleeToHomeBehavior - Navigate to assigned bed when scared/hurt
 */
export class FleeToHomeBehavior extends BaseBehavior {
  readonly name = 'flee_to_home' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent(ComponentType.Position);
    const agent = entity.getComponent(ComponentType.Agent);

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
 * Standalone function for BehaviorRegistry (legacy).
 * @deprecated Use fleeToHomeBehaviorWithContext for new code
 */
export function fleeToHomeBehavior(entity: EntityImpl, world: World): void {
  const behavior = new FleeToHomeBehavior();
  behavior.execute(entity, world);
}

// ============================================================================
// Modern BehaviorContext Version
// ============================================================================

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('flee_to_home', fleeToHomeBehaviorWithContext);
 */
export function fleeToHomeBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  // Check if agent has an assigned bed
  if (!ctx.agent.assignedBed) {
    // No home to flee to - fall back to regular flee
    return ctx.switchTo('flee');
  }

  // Get bed entity
  const bedEntity = ctx.getEntity(ctx.agent.assignedBed);
  if (!bedEntity) {
    // Bed no longer exists - fall back
    return ctx.switchTo('flee');
  }

  const bedPos = getPosition(bedEntity);
  if (!bedPos) {
    return ctx.switchTo('flee');
  }

  // Navigate toward bed
  const distance = ctx.moveToward(bedPos, { arrivalDistance: 2.0 });

  // Check if arrived at home (within 2 tiles)
  if (distance <= 2.0) {
    ctx.stopMovement();

    // Emit event that agent reached home safely
    ctx.emit({
      type: 'agent:reached_home',
      data: {
        agentId: ctx.entity.id,
        bedId: ctx.agent.assignedBed,
        timestamp: ctx.tick,
      },
    });

    // Behavior complete - agent is now safe at home
    return ctx.complete('arrived_home');
  }

  // Continue fleeing to home
}
