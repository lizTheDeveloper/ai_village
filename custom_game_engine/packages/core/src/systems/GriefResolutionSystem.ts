/**
 * @status ENABLED
 * @reason New system for grief resolution through social mourning
 *
 * ## What This System Does
 * Manages the grief lifecycle for agents:
 * - Detects agents with mood.mourning === true who are idle/wandering
 * - Triggers mourn_together behavior so they seek out other grieving agents
 * - Gradually decays grief over time (grief doesn't last forever)
 * - Clears mourning flag when grief reaches zero
 *
 * ## Dependencies
 * - DeathTransitionSystem (priority 110): Sets mood.grief and mood.mourning
 * - MoodSystem: Manages emotional state
 * - AgentBrainSystem (priority 10): Executes the mourn_together behavior
 * - Components: mood, agent
 *
 * ## Architecture Notes
 * - Priority 115: Runs after DeathTransitionSystem (110)
 * - Throttled: 200 ticks (10 seconds) — grief changes slowly
 * - Only activates when 'mood' components exist
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';

/** Grief decays by this amount each update cycle */
const GRIEF_DECAY_PER_CYCLE = 2;

/** Minimum grief level to trigger mourning behavior */
const MOURN_BEHAVIOR_THRESHOLD = 20;

/** Behaviors that can be interrupted for mourning */
const INTERRUPTIBLE_BEHAVIORS = ['idle', 'wander', 'rest', 'observe', 'reflect', 'sit_quietly', 'amuse_self'];

/** Cooldown between mourn attempts (ticks) */
const MOURN_COOLDOWN = 400; // ~20 seconds

export class GriefResolutionSystem extends BaseSystem {
  public readonly id: SystemId = 'grief-resolution';
  public readonly priority: number = 115;
  public readonly requiredComponents: ReadonlyArray<string> = [CT.Mood, CT.Agent];
  public readonly activationComponents = [CT.Mood] as const;
  protected readonly throttleInterval = 200; // 10 seconds

  private lastMournAttempt: Map<string, number> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.world.tick;

    for (const entity of ctx.activeEntities) {
      const mood = entity.getComponent<MoodComponent>(CT.Mood);
      const agent = entity.getComponent<AgentComponent>(CT.Agent);

      if (!mood || !agent) continue;

      // Skip dead agents
      if (entity.hasComponent(CT.Afterlife)) continue;

      const grief = mood.grief ?? 0;

      if (grief <= 0) {
        // Clear mourning flag if grief is gone
        if (mood.mourning) {
          entity.updateComponent<MoodComponent>(CT.Mood, (current: MoodComponent) => ({
            ...current,
            mourning: false,
            grief: 0,
          }));
        }
        continue;
      }

      // Decay grief naturally over time
      const newGrief = Math.max(0, grief - GRIEF_DECAY_PER_CYCLE);
      const shouldStillMourn = newGrief > 10;

      entity.updateComponent<MoodComponent>(CT.Mood, (current: MoodComponent) => ({
        ...current,
        grief: newGrief,
        mourning: shouldStillMourn,
        emotionalState: shouldStillMourn ? 'grieving' : (current.emotionalState === 'grieving' ? 'melancholic' : current.emotionalState),
      }));

      // Try to trigger mourn_together behavior if grief is high enough
      if (newGrief >= MOURN_BEHAVIOR_THRESHOLD && shouldStillMourn) {
        // Only interrupt non-critical behaviors
        if (!INTERRUPTIBLE_BEHAVIORS.includes(agent.behavior)) continue;

        // Check cooldown
        const lastAttempt = this.lastMournAttempt.get(entity.id) ?? -MOURN_COOLDOWN;
        if (tick - lastAttempt < MOURN_COOLDOWN) continue;

        // Probability check — don't always mourn, grief is sometimes private
        // Higher grief = higher chance of seeking others
        const mournChance = Math.min(0.6, newGrief / 100);
        if (Math.random() > mournChance) continue;

        // Set behavior to mourn_together
        entity.updateComponent<AgentComponent>(CT.Agent, (current: AgentComponent) => ({
          ...current,
          behavior: 'mourn_together' as AgentComponent['behavior'],
          behaviorState: {},
        }));

        this.lastMournAttempt.set(entity.id, tick);
      }
    }
  }
}
