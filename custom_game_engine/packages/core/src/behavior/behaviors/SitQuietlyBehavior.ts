/**
 * SitQuietlyBehavior - Agent sits in contentment
 *
 * Part of the Idle Behaviors & Personal Goals system.
 * For agents who are content and don't need activity.
 * Different from generic idle - this is peaceful satisfaction.
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * SitQuietlyBehavior - Peaceful rest
 */
export class SitQuietlyBehavior extends BaseBehavior {
  readonly name = 'idle' as const; // Maps to idle for now

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Stop all movement
    this.disableSteeringAndStop(entity);

    const state = this.getState(entity);
    const currentTick = world.tick;

    // Generate peaceful monologue occasionally
    const lastMonologue = (state.lastMonologue as number | undefined) ?? 0;

    if (currentTick - lastMonologue > 400) {
      // Update every ~20 seconds
      const monologue = this.generatePeacefulMonologue();
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: monologue,
        behaviorState: {
          ...current.behaviorState,
          lastMonologue: currentTick,
        },
      }));

      // Emit internal monologue event
      world.eventBus.emit({
        type: 'agent:internal_monologue',
        source: 'sit_quietly_behavior',
        data: {
          agentId: entity.id,
          behaviorType: 'sit_quietly',
          monologue,
          timestamp: currentTick,
        },
      });
    }

    // Sit quietly indefinitely until interrupted
    // This behavior doesn't complete on its own
  }

  /**
   * Generate peaceful monologue.
   */
  private generatePeacefulMonologue(): string {
    const thoughts = [
      'Everything is peaceful right now.',
      'Just enjoying this moment.',
      'No need to rush anywhere.',
      'Feeling content and at ease.',
      'Sometimes it\'s good to just be.',
      'Life is good right now.',
      'Finding peace in the stillness.',
    ];

    return thoughts[Math.floor(Math.random() * thoughts.length)]!;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use sitQuietlyBehaviorWithContext instead
 */
export function sitQuietlyBehavior(entity: EntityImpl, world: World): void {
  const behavior = new SitQuietlyBehavior();
  behavior.execute(entity, world);
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('sit_quietly', sitQuietlyBehaviorWithContext);
 */
export function sitQuietlyBehaviorWithContext(ctx: import('../BehaviorContext.js').BehaviorContext): import('../BehaviorContext.js').BehaviorResult | void {
  // Stop all movement
  ctx.stopMovement();

  const lastMonologue = ctx.getState<number>('lastMonologue') ?? 0;

  if (ctx.tick - lastMonologue > 400) {
    // Update every ~20 seconds
    const monologue = generatePeacefulMonologue();
    ctx.setThought(monologue);
    ctx.updateState({ lastMonologue: ctx.tick });

    // Emit internal monologue event
    ctx.emit({
      type: 'agent:internal_monologue',
      source: 'sit_quietly_behavior',
      data: {
        agentId: ctx.entity.id,
        behaviorType: 'sit_quietly',
        monologue,
        timestamp: ctx.tick,
      },
    });
  }

  // Sit quietly indefinitely until interrupted
  // This behavior doesn't complete on its own
}

/**
 * Generate peaceful monologue.
 * Helper function for sitQuietlyBehaviorWithContext.
 */
function generatePeacefulMonologue(): string {
  const thoughts = [
    'Everything is peaceful right now.',
    'Just enjoying this moment.',
    'No need to rush anywhere.',
    'Feeling content and at ease.',
    'Sometimes it\'s good to just be.',
    'Life is good right now.',
    'Finding peace in the stillness.',
  ];

  return thoughts[Math.floor(Math.random() * thoughts.length)]!;
}
