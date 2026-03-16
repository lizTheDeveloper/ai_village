import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import {
  WorkingAnimalComponent,
  trainSkill,
  defaultSkillsForRole,
} from '../components/WorkingAnimalComponent.js';
import { AnimalComponent } from '../components/AnimalComponent.js';
import type { AnimalRole, WorkTask } from '../components/WorkingAnimalComponent.js';

/**
 * WorkingAnimalSystem - manages trained animals performing tasks
 * Priority: 68 (after AnimalSystem at 65, before TamingSystem at 70)
 *
 * Responsibilities:
 * - Per-tick: drain stamina while working, recover stamina while resting
 * - Track task duration and mark completion
 * - Apply skill XP gain during task execution
 * - Adjust efficiency based on stamina and skill level
 */
export class WorkingAnimalSystem extends BaseSystem {
  public readonly id: SystemId = 'working_animal';
  public readonly priority: number = 68;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Animal, CT.WorkingAnimal];
  protected readonly throttleInterval = 4; // Every 4 ticks = ~0.2 seconds

  // XP gain per tick while working
  private static readonly BASE_XP_PER_TICK = 0.5;
  // Stamina recovery per tick when resting
  private static readonly STAMINA_RECOVERY_PER_TICK = 0.2;

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const comps = ctx.components(entity);
      const animal = comps.optional<AnimalComponent>('animal');
      const working = comps.optional<WorkingAnimalComponent>('working_animal');
      if (!animal || !working) continue;

      if (working.currentTask) {
        this.tickTask(working, animal);
      } else {
        // Recover stamina when not working
        working.stamina = Math.min(100, working.stamina + WorkingAnimalSystem.STAMINA_RECOVERY_PER_TICK);
      }

      // Update efficiency: blend of stamina and primary skill level
      const primarySkill = working.skills[0];
      const skillBonus = primarySkill ? primarySkill.level : 0;
      // efficiency = 40% stamina + 60% skill level
      working.efficiency = Math.round(working.stamina * 0.4 + skillBonus * 0.6);
    }
  }

  private tickTask(working: WorkingAnimalComponent, _animal: AnimalComponent): void {
    const task = working.currentTask!;

    // Drain stamina
    working.stamina = Math.max(0, working.stamina - task.energyCost);

    // Gain XP for the task's primary skill
    const skillType = this.skillTypeForTask(task.taskType);
    trainSkill(working, skillType, WorkingAnimalSystem.BASE_XP_PER_TICK);

    // Decrement duration
    task.duration -= 1;
    if (task.duration <= 0) {
      working.currentTask = undefined;
    }

    // If exhausted, abandon task
    if (working.stamina <= 0) {
      working.currentTask = undefined;
    }
  }

  private skillTypeForTask(role: AnimalRole): string {
    const map: Record<AnimalRole, string> = {
      plow:  'plowing',
      guard: 'alertness',
      hunt:  'tracking',
      herd:  'herding',
      mount: 'endurance',
      pack:  'hauling',
    };
    return map[role] ?? role;
  }

  /**
   * Assign a role to a working animal, setting default skills if needed.
   * Call this when a tamed animal is first given a role.
   */
  public assignRole(
    workingAnimal: WorkingAnimalComponent,
    role: AnimalRole
  ): void {
    workingAnimal.role = role;
    // Add default skills for new role if not already present
    for (const skill of defaultSkillsForRole(role)) {
      if (!workingAnimal.skills.find(s => s.skillType === skill.skillType)) {
        workingAnimal.skills.push(skill);
      }
    }
  }

  /**
   * Assign a specific task to a working animal.
   * Returns false if the animal lacks stamina to start.
   */
  public assignTask(
    workingAnimal: WorkingAnimalComponent,
    task: WorkTask
  ): { success: boolean; reason: string } {
    if (workingAnimal.stamina < 10) {
      return { success: false, reason: 'Animal is too exhausted to work' };
    }
    workingAnimal.currentTask = { ...task };
    return { success: true, reason: 'Task assigned' };
  }

  /**
   * Rest the animal — clear task, stamina recovers on next ticks.
   */
  public restAnimal(workingAnimal: WorkingAnimalComponent): void {
    workingAnimal.currentTask = undefined;
  }
}
