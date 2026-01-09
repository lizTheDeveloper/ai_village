/**
 * AmuseSelfBehavior - Agent entertains themselves
 *
 * Part of the Idle Behaviors & Personal Goals system.
 * Personality-appropriate self-entertainment when bored.
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PersonalityComponent } from '../../components/PersonalityComponent.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * AmuseSelfBehavior - Self-entertainment
 */
export class AmuseSelfBehavior extends BaseBehavior {
  readonly name = 'idle' as const; // Maps to idle for now

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Stop all movement
    this.disableSteeringAndStop(entity);

    const state = this.getState(entity);
    const currentTick = world.tick;

    // Initialize amusement type based on personality
    if (!state.amusementType) {
      const personality = entity.getComponent<PersonalityComponent>(ComponentType.Personality);
      const amusementType = this.selectAmusementType(personality);
      this.updateState(entity, {
        amusementType,
        amusementStart: currentTick,
      });

      // Generate initial monologue
      const monologue = this.generateAmusementMonologue(amusementType);
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: monologue,
      }));
    }

    // Update monologue occasionally
    const lastMonologue = (state.lastMonologue as number | undefined) ?? 0;
    if (currentTick - lastMonologue > 300) {
      const monologue = this.generateAmusementMonologue(state.amusementType as string);
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: monologue,
        behaviorState: {
          ...current.behaviorState,
          lastMonologue: currentTick,
        },
      }));
    }

    // Amuse self for ~15 seconds (300 ticks)
    const amusementStart = state.amusementStart as number;
    const ticksAmusing = currentTick - amusementStart;

    if (ticksAmusing > 300) {
      // Done amusing self
      this.complete(entity);
      return { complete: true, reason: 'amusement_complete' };
    }
  }

  /**
   * Select amusement type based on personality.
   */
  private selectAmusementType(personality: PersonalityComponent | undefined): string {
    if (!personality) {
      return 'daydream';
    }

    // High creativity → imaginative activities
    if (personality.creativity > 70) {
      const creative = ['imagine', 'daydream', 'create_stories', 'think_creatively'];
      return creative[Math.floor(Math.random() * creative.length)]!;
    }

    // High conscientiousness → organized activities
    if (personality.conscientiousness > 70) {
      const organized = ['plan', 'organize_thoughts', 'mental_practice'];
      return organized[Math.floor(Math.random() * organized.length)]!;
    }

    // High openness → curious activities
    if (personality.openness > 70) {
      const curious = ['wonder', 'philosophize', 'imagine_possibilities'];
      return curious[Math.floor(Math.random() * curious.length)]!;
    }

    // Default activities
    const defaults = ['daydream', 'hum', 'people_watch', 'think'];
    return defaults[Math.floor(Math.random() * defaults.length)]!;
  }

  /**
   * Generate amusement monologue based on type.
   */
  private generateAmusementMonologue(type: string): string {
    const monologues: Record<string, string[]> = {
      daydream: [
        'Lost in thought... so many possibilities.',
        'Imagining what could be...',
        'My mind wanders to interesting places.',
      ],
      imagine: [
        'What if I tried it this way instead?',
        'Creating something in my mind...',
        'The imagination has no limits.',
      ],
      plan: [
        'Mentally organizing my next steps.',
        'Planning ahead makes everything smoother.',
        'Thinking through the details...',
      ],
      wonder: [
        'I wonder how that works?',
        'So many questions, so many mysteries.',
        'The world is full of things to discover.',
      ],
      hum: [
        'Humming a little tune to myself...',
        'Music makes everything better.',
        'Just enjoying the simple pleasures.',
      ],
      people_watch: [
        'Watching others go about their day.',
        'Everyone has their own story.',
        'Interesting to see what people do.',
      ],
      think: [
        'Just thinking about things.',
        'Enjoying my own thoughts.',
        'Sometimes it\'s good to just think.',
      ],
    };

    const options = monologues[type] || monologues.think!;
    return options[Math.floor(Math.random() * options.length)]!;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function amuseSelfBehavior(entity: EntityImpl, world: World): void {
  const behavior = new AmuseSelfBehavior();
  behavior.execute(entity, world);
}
