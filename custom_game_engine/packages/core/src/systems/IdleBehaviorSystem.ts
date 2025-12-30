import type { World } from '../ecs/World.js';
import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { NeedsComponent } from '../components/NeedsComponent';
import { PersonalityComponent } from '../components/PersonalityComponent';
import { ActionQueue } from '../actions/ActionQueueClass';

export type IdleBehaviorType =
  | 'reflect'
  | 'chat_idle'
  | 'amuse_self'
  | 'observe'
  | 'sit_quietly'
  | 'practice_skill'
  | 'wander_aimlessly';

interface BehaviorWeights {
  reflect: number;
  chat_idle: number;
  amuse_self: number;
  observe: number;
  sit_quietly: number;
  practice_skill: number;
  wander_aimlessly: number;
}

/**
 * IdleBehaviorSystem selects varied idle behaviors based on personality and mood
 */
export class IdleBehaviorSystem implements System {
  public readonly id: SystemId = 'idle_behavior';
  public readonly priority = 15; // Run after needs system
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  update(world: World): void {
    // Get all entities
    const entities = Array.from((world as any).entities.values()) as any[];

    for (const entity of entities) {
      // Skip entities without required components
      if (!entity.components || !entity.components.has(CT.Needs) ||
          !entity.components.has(CT.Personality) ||
          !entity.components.has(CT.ActionQueue)) {
        continue;
      }

      const queue = entity.getComponent(CT.ActionQueue) as ActionQueue | null;

      // Skip if entity has queued actions or if queue is missing
      if (!queue || !queue.isEmpty()) {
        continue;
      }

      const needs = entity.getComponent(CT.Needs) as NeedsComponent | null;
      const personality = entity.getComponent(CT.Personality) as PersonalityComponent | null;

      if (!needs || !personality) {
        throw new Error(`Entity ${(entity as any).id} missing required component: needs or personality`);
      }

      // Select idle behavior based on personality and mood
      const behavior = this.selectIdleBehavior(personality, needs);

      // Enqueue the selected behavior with low priority
      queue.enqueue({
        type: behavior,
        priority: 0.2 + Math.random() * 0.1 // 0.2-0.3 priority
      });
    }
  }

  /**
   * Select an idle behavior based on personality and mood
   */
  private selectIdleBehavior(personality: PersonalityComponent, needs: NeedsComponent): IdleBehaviorType {
    // Calculate base weights from personality
    const weights: BehaviorWeights = {
      reflect: personality.conscientiousness * 2,
      chat_idle: personality.extraversion * 2,
      amuse_self: personality.openness * 2,
      observe: personality.openness,
      sit_quietly: (1 - personality.extraversion),
      practice_skill: personality.conscientiousness,
      wander_aimlessly: 1.0
    };

    // Adjust weights based on mood (derived from needs)
    if (needs.social < 0.3) {
      // Lonely - boost social behaviors
      weights.chat_idle *= 3;
    }

    if (needs.energy > 0.7 && needs.hunger > 0.7 && needs.social > 0.7) {
      // Content - boost quiet behaviors
      weights.sit_quietly *= 2;
    }

    if (needs.stimulation && needs.stimulation < 0.4) {
      // Bored - boost active behaviors
      weights.practice_skill *= 2;
      weights.wander_aimlessly *= 1.5;
    }

    // Select behavior using weighted random selection
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (const [behavior, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return behavior as IdleBehaviorType;
      }
    }

    // Fallback (should never reach here)
    return 'wander_aimlessly';
  }
}
