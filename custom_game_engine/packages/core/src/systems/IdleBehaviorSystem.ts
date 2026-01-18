import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { NeedsComponent } from '../components/NeedsComponent';
import { PersonalityComponent } from '../components/PersonalityComponent';
import { ActionQueue } from '../actions/ActionQueueClass';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

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
 *
 * @dependencies None - Reads personality and needs to select idle actions
 */
export class IdleBehaviorSystem extends BaseSystem {
  public readonly id: SystemId = 'idle_behavior';
  public readonly priority = 15; // Run after needs system
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Needs,
    CT.Personality,
    CT.ActionQueue
  ];
  protected readonly throttleInterval = 100; // SLOW - 5 seconds
  public readonly dependsOn = [] as const;

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      // Type-safe component access
      const comps = ctx.components(entity);
      const queue = comps.optional<ActionQueue>(CT.ActionQueue);

      // Skip if entity has queued actions or if queue is missing
      if (!queue || !queue.isEmpty()) {
        continue;
      }

      // Require needs and personality (guaranteed by requiredComponents)
      const { needs, personality } = comps.require(CT.Needs, CT.Personality);

      // Select idle behavior based on personality and mood
      const behavior = this.selectIdleBehavior(
        personality as PersonalityComponent,
        needs as NeedsComponent
      );

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

    // Should never reach here - weighted random selection is exhaustive
    throw new Error(`[IdleBehaviorSystem] Failed to select behavior from weighted selection (totalWeight: ${totalWeight})`)
  }
}
