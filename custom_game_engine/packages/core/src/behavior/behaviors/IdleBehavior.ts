/**
 * IdleBehavior - Agent stands still
 *
 * The default behavior when no other action is needed.
 * Stops movement and optionally emits idle events.
 * Tracks when agent became idle for boredom system.
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType, ComponentType as CT } from '../../types/ComponentType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';

/**
 * IdleBehavior - Agent does nothing
 *
 * Stops all movement and disables steering.
 * Tracks idle start time for boredom detection.
 */
export class IdleBehavior extends BaseBehavior {
  readonly name = 'idle' as const;

  /** Probability of emitting idle event (to avoid spam) */
  private readonly eventProbability: number;

  constructor(eventProbability: number = 0.25) {
    super();
    this.eventProbability = eventProbability;
  }

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Disable steering and stop all movement
    this.disableSteeringAndStop(entity);

    // Track when agent became idle (for boredom system)
    const agent = entity.getComponent(ComponentType.Agent);
    if (agent && agent.idleStartTick === undefined) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        idleStartTick: world.tick,
      }));
    }

    // Emit idle event occasionally for journaling system
    if (Math.random() < this.eventProbability) {
      world.eventBus.emit({
        type: 'agent:idle',
        source: entity.id,
        data: {
          agentId: entity.id,
          timestamp: Date.now(),
        },
      });
    }
  }
}

/**
 * Standalone function for use with BehaviorRegistry (legacy).
 * @deprecated Use idleBehaviorWithContext for new code
 */
export function idleBehavior(entity: EntityImpl, world: World): void {
  const behavior = new IdleBehavior();
  behavior.execute(entity, world);
}

// ============================================================================
// Modern BehaviorContext Version
// ============================================================================

/**
 * Probability of emitting idle event (to avoid spam)
 */
const IDLE_EVENT_PROBABILITY = 0.25;

/**
 * Modern idle behavior using BehaviorContext.
 *
 * This is the recommended pattern for new behaviors. It demonstrates:
 * - Using ctx for pre-fetched components (no manual getComponent calls)
 * - Using ctx.updateComponent with type-safe CT enum
 * - Using ctx.emit for events
 * - Using ctx.complete() for clear return semantics
 *
 * @example
 * // Register with BehaviorRegistry
 * registerBehaviorWithContext('idle', idleBehaviorWithContext);
 */
export function idleBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  // Stop all movement (steering and velocity)
  ctx.stopMovement();

  // Track when agent became idle (for boredom system)
  // Note: ctx.agent is pre-fetched, no need to call getComponent
  if (ctx.agent.idleStartTick === undefined) {
    ctx.updateComponent(CT.Agent, (current: AgentComponent) => ({
      ...current,
      idleStartTick: ctx.tick,
    }));
  }

  // Emit idle event occasionally for journaling system
  if (Math.random() < IDLE_EVENT_PROBABILITY) {
    ctx.emit({
      type: 'agent:idle',
      data: {
        agentId: ctx.entity.id,
        timestamp: Date.now(),
      },
    });
  }

  // Idle never completes on its own - it continues until switched
  // Returning void/undefined means "continue this behavior"
}
