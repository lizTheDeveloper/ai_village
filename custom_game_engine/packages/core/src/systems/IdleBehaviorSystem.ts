import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { NeedsComponent } from '../components/NeedsComponent';
import { PersonalityComponent } from '../components/PersonalityComponent';
import type { SpiritualComponent } from '../components/SpiritualComponent';
import { ActionQueue } from '../actions/ActionQueueClass';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

export type IdleBehaviorType =
  | 'reflect'
  | 'chat_idle'
  | 'amuse_self'
  | 'observe'
  | 'sit_quietly'
  | 'practice_skill'
  | 'wander_aimlessly'
  | 'pray';

interface BehaviorWeights {
  reflect: number;
  chat_idle: number;
  amuse_self: number;
  observe: number;
  sit_quietly: number;
  practice_skill: number;
  wander_aimlessly: number;
  pray: number;
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
  // Only run when action_queue components exist (O(1) activation check)
  public readonly activationComponents = [CT.ActionQueue] as const;
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

      // Optional spiritual component for prayer behavior
      const spiritual = comps.optional<SpiritualComponent>(CT.Spiritual);

      // Select idle behavior based on personality and mood
      const behavior = this.selectIdleBehavior(
        personality as PersonalityComponent,
        needs as NeedsComponent,
        spiritual as SpiritualComponent | undefined
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
  private selectIdleBehavior(
    personality: PersonalityComponent,
    needs: NeedsComponent,
    spiritual?: SpiritualComponent
  ): IdleBehaviorType {
    // Calculate base weights from personality
    const weights: BehaviorWeights = {
      reflect: personality.conscientiousness * 2,
      chat_idle: personality.extraversion * 2,
      amuse_self: personality.openness * 2,
      observe: personality.openness,
      sit_quietly: (1 - personality.extraversion),
      practice_skill: personality.conscientiousness,
      wander_aimlessly: 1.0,
      pray: 0.0 // Default: no prayer unless spiritual
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

    // Add prayer weighting for spiritual agents
    if (spiritual && personality.spirituality > 0.4 && spiritual.faith > 0.1) {
      // Base prayer weight scales with spirituality (0.8 - 2.0)
      weights.pray = personality.spirituality * 2;

      // Higher faith increases prayer likelihood
      if (spiritual.faith > 0.5) {
        weights.pray *= 1.5;
      }

      // Crisis of faith makes prayer much more likely
      if (spiritual.crisisOfFaith) {
        weights.pray *= 3;
      }

      // Low mood increases prayer (seeking comfort)
      const mood = needs.social + needs.energy + needs.hunger;
      if (mood < 1.5) {
        weights.pray *= 1.5;
      }
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
