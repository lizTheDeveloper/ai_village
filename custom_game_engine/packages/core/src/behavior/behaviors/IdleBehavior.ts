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
import { ComponentType } from '../../types/ComponentType.js';

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
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
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
 * Standalone function for use with BehaviorRegistry.
 */
export function idleBehavior(entity: EntityImpl, world: World): void {
  const behavior = new IdleBehavior();
  behavior.execute(entity, world);
}
