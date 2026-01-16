/**
 * ObserveBehavior - Agent watches their surroundings
 *
 * Part of the Idle Behaviors & Personal Goals system.
 * Agents observe the world around them, gathering information
 * and enjoying the environment.
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * ObserveBehavior - Watch and learn
 */
export class ObserveBehavior extends BaseBehavior {
  readonly name = 'observe' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Stop all movement
    this.disableSteeringAndStop(entity);

    const state = this.getState(entity);
    const currentTick = world.tick;

    // Generate observation monologue occasionally
    const lastMonologue = (state.lastMonologue as number | undefined) ?? 0;

    if (currentTick - lastMonologue > 300) {
      // Update every ~15 seconds
      const monologue = this.generateObservationMonologue();
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: monologue,
        behaviorState: {
          ...current.behaviorState,
          lastMonologue: currentTick,
        },
      }));
    }

    // Observe for ~20 seconds (400 ticks)
    const observeStart = (state.observeStart as number | undefined) ?? currentTick;
    if (!state.observeStart) {
      this.updateState(entity, { observeStart: currentTick });
    }

    const ticksObserving = currentTick - observeStart;
    if (ticksObserving > 400) {
      // Done observing
      this.complete(entity);
      return { complete: true, reason: 'observation_complete' };
    }
  }

  /**
   * Generate observation monologue.
   */
  private generateObservationMonologue(): string {
    const observations = [
      'Watching the world go by...',
      'Interesting how everything works together.',
      'There\'s always something new to notice.',
      'Taking in the sights and sounds.',
      'I wonder what that is over there?',
      'Observing the patterns of daily life.',
      'The world is full of small details.',
    ];

    return observations[Math.floor(Math.random() * observations.length)]!;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use observeBehaviorWithContext instead
 */
export function observeBehavior(entity: EntityImpl, world: World): void {
  const behavior = new ObserveBehavior();
  behavior.execute(entity, world);
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('observe', observeBehaviorWithContext);
 */
export function observeBehaviorWithContext(ctx: import('../BehaviorContext.js').BehaviorContext): import('../BehaviorContext.js').BehaviorResult | void {
  // Stop all movement
  ctx.stopMovement();

  // Generate observation monologue occasionally
  const lastMonologue = ctx.getState<number>('lastMonologue') ?? 0;

  if (ctx.tick - lastMonologue > 300) {
    // Update every ~15 seconds
    const monologue = generateObservationMonologue();
    ctx.setThought(monologue);
    ctx.updateState({ lastMonologue: ctx.tick });
  }

  // Observe for ~20 seconds (400 ticks)
  const observeStart = ctx.getState<number>('observeStart') ?? ctx.tick;
  if (observeStart === ctx.tick) {
    ctx.updateState({ observeStart: ctx.tick });
  }

  const ticksObserving = ctx.tick - observeStart;
  if (ticksObserving > 400) {
    // Done observing
    return ctx.complete('observation_complete');
  }
}

/**
 * Generate observation monologue.
 * Helper function for observeBehaviorWithContext.
 */
function generateObservationMonologue(): string {
  const observations = [
    'Watching the world go by...',
    'Interesting how everything works together.',
    'There\'s always something new to notice.',
    'Taking in the sights and sounds.',
    'I wonder what that is over there?',
    'Observing the patterns of daily life.',
    'The world is full of small details.',
  ];

  return observations[Math.floor(Math.random() * observations.length)]!;
}
