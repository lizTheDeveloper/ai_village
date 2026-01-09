/**
 * PracticeSkillBehavior - Agent practices skills during idle time
 *
 * Part of the Idle Behaviors & Personal Goals system.
 * Agents work on improving their skills without pressure.
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * PracticeSkillBehavior - Skill improvement
 */
export class PracticeSkillBehavior extends BaseBehavior {
  readonly name = 'idle' as const; // Maps to idle for now

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Stop all movement
    this.disableSteeringAndStop(entity);

    const state = this.getState(entity);
    const currentTick = world.tick;

    // Select skill to practice
    if (!state.practicingSkill) {
      const skill = this.selectSkillToPractice();
      this.updateState(entity, {
        practicingSkill: skill,
        practiceStart: currentTick,
      });

      // Generate initial monologue
      const monologue = this.generatePracticeMonologue(skill);
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: monologue,
      }));

      // Emit internal monologue event
      world.eventBus.emit({
        type: 'agent:internal_monologue',
        source: 'practice_skill_behavior',
        data: {
          agentId: entity.id,
          behaviorType: 'practice_skill',
          monologue,
          timestamp: currentTick,
        },
      });
    }

    // Update monologue occasionally
    const lastMonologue = (state.lastMonologue as number | undefined) ?? 0;
    if (currentTick - lastMonologue > 400) {
      const skill = state.practicingSkill as string;
      const monologue = this.generatePracticeMonologue(skill);
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
        source: 'practice_skill_behavior',
        data: {
          agentId: entity.id,
          behaviorType: 'practice_skill',
          monologue,
          timestamp: currentTick,
        },
      });
    }

    // Practice for ~25 seconds (500 ticks)
    const practiceStart = state.practiceStart as number;
    const ticksPracticing = currentTick - practiceStart;

    if (ticksPracticing > 500) {
      // Done practicing
      this.complete(entity);
      return { complete: true, reason: 'practice_complete' };
    }
  }

  /**
   * Select a skill to practice.
   */
  private selectSkillToPractice(): string {
    const skills = [
      'building',
      'farming',
      'gathering',
      'crafting',
      'cooking',
      'tool_making',
    ];

    return skills[Math.floor(Math.random() * skills.length)]!;
  }

  /**
   * Generate practice monologue.
   */
  private generatePracticeMonologue(skill: string): string {
    const monologues: Record<string, string[]> = {
      building: [
        'Thinking about construction techniques...',
        'How can I build more efficiently?',
        'Visualizing better building designs.',
      ],
      farming: [
        'Reviewing what I know about crops...',
        'Timing and technique matter in farming.',
        'Thinking about soil and seasons.',
      ],
      gathering: [
        'Mentally noting good resource spots.',
        'Efficient gathering takes practice.',
        'Planning better gathering routes.',
      ],
      crafting: [
        'Considering different crafting approaches.',
        'There\'s always a better way to make things.',
        'Thinking through the crafting process.',
      ],
      cooking: [
        'Reviewing recipes in my mind...',
        'Good cooking is an art and a science.',
        'Thinking about flavors and techniques.',
      ],
      tool_making: [
        'Tools are the foundation of progress.',
        'Better tools make everything easier.',
        'Considering tool improvements.',
      ],
    };

    const options = monologues[skill] || [
      'Practicing and improving...',
      'Getting better with each attempt.',
      'Focus and repetition build skill.',
    ];

    return options[Math.floor(Math.random() * options.length)]!;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function practiceSkillBehavior(entity: EntityImpl, world: World): void {
  const behavior = new PracticeSkillBehavior();
  behavior.execute(entity, world);
}
