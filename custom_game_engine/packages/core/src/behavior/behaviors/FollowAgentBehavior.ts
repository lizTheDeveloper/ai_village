/**
 * FollowAgentBehavior - Follow another agent
 *
 * Agent follows a target agent, maintaining a comfortable distance (3-5 tiles).
 * Speeds up when too far, slows down when too close.
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';

/** Minimum distance to maintain from target */
const MIN_FOLLOW_DISTANCE = 3;

/** Maximum distance before speeding up */
const MAX_FOLLOW_DISTANCE = 5;

/** Speed multiplier when catching up */
const CATCH_UP_SPEED = 1.2;

/**
 * FollowAgentBehavior - Follow a target agent
 */
export class FollowAgentBehavior extends BaseBehavior {
  readonly name = 'follow_agent' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Disable steering system
    this.disableSteering(entity);

    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const movement = entity.getComponent<MovementComponent>(ComponentType.Movement)!;
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;

    const targetId = agent.behaviorState?.targetId as string | undefined;
    if (!targetId) {
      // No target
      return { complete: true, reason: 'No target to follow' };
    }

    const targetEntity = world.getEntity(targetId);
    if (!targetEntity) {
      // Target no longer exists
      return { complete: true, reason: 'Target no longer exists' };
    }

    const targetImpl = targetEntity as EntityImpl;
    const targetPos = targetImpl.getComponent<PositionComponent>(ComponentType.Position);
    if (!targetPos) {
      return { complete: true, reason: 'Target has no position' };
    }

    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);

    if (distanceSquared < MIN_FOLLOW_DISTANCE * MIN_FOLLOW_DISTANCE) {
      // Too close, stop
      entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));
    } else if (distanceSquared > MAX_FOLLOW_DISTANCE * MAX_FOLLOW_DISTANCE) {
      // Too far, speed up to catch up
      const velocityX = (dx / distance) * movement.speed * CATCH_UP_SPEED;
      const velocityY = (dy / distance) * movement.speed * CATCH_UP_SPEED;

      entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    } else {
      // Just right, match speed and follow
      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use followAgentBehaviorWithContext with BehaviorContext instead
 */
export function followAgentBehavior(entity: EntityImpl, world: World): void {
  const behavior = new FollowAgentBehavior();
  behavior.execute(entity, world);
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('follow_agent', followAgentBehaviorWithContext);
 */
export function followAgentBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  const targetId = ctx.getState<string>('targetId');
  if (!targetId) {
    // No target
    return ctx.complete('No target to follow');
  }

  const target = ctx.getEntity(targetId);
  if (!target) {
    // Target no longer exists
    return ctx.complete('Target no longer exists');
  }

  const targetEntity = target as EntityImpl;
  const targetPos = targetEntity.getComponent<PositionComponent>(ComponentType.Position);
  if (!targetPos) {
    return ctx.complete('Target has no position');
  }

  // Calculate squared distance (avoid sqrt for performance)
  const distanceSquared = ctx.distanceSquaredTo(targetPos);
  const distance = Math.sqrt(distanceSquared);

  if (distance < MIN_FOLLOW_DISTANCE) {
    // Too close, stop
    ctx.stopMovement();
  } else if (distance > MAX_FOLLOW_DISTANCE) {
    // Too far, speed up to catch up
    if (ctx.movement) {
      ctx.moveToward(targetPos, { speed: ctx.movement.speed * CATCH_UP_SPEED });
    }
  } else {
    // Just right, match speed and follow
    ctx.moveToward(targetPos);
  }
}
