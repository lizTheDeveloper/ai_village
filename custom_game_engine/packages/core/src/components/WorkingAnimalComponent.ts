import type { Component } from '../ecs/Component.js';
import type { Position } from '../types.js';

export type AnimalRole =
  | 'plow'   // Farm work, tilling fields
  | 'guard'  // Protect area, alert to threats
  | 'hunt'   // Track and retrieve game
  | 'herd'   // Manage livestock
  | 'mount'  // Riding animal
  | 'pack';  // Carry supplies

export interface AnimalSkill {
  skillType: string;   // e.g. 'tracking', 'guarding', 'hauling', 'plowing', 'herding'
  level: number;       // 0-100
  experience: number;  // Increases with use; 100 XP per level
}

export interface WorkTask {
  taskType: AnimalRole;
  targetEntityId?: string;
  targetPosition?: Position;
  duration: number;    // Ticks remaining
  energyCost: number;  // Stamina per tick (e.g. 0.5)
}

export interface WorkingAnimalComponentData {
  role: AnimalRole;
  skills: AnimalSkill[];
  currentTask?: WorkTask;
  efficiency: number;  // 0-100
  stamina: number;     // 0-100
}

export class WorkingAnimalComponent implements Component {
  public readonly type = 'working_animal' as const;
  public readonly version = 1;

  public role: AnimalRole;
  public skills: AnimalSkill[];
  public currentTask?: WorkTask;
  public efficiency: number;
  public stamina: number;

  constructor(data: WorkingAnimalComponentData) {
    if (data.role === undefined || data.role === null) {
      throw new Error('WorkingAnimalComponent requires "role" field');
    }
    if (data.skills === undefined || data.skills === null) {
      throw new Error('WorkingAnimalComponent requires "skills" field');
    }
    if (data.efficiency === undefined || data.efficiency === null) {
      throw new Error('WorkingAnimalComponent requires "efficiency" field');
    }
    if (data.stamina === undefined || data.stamina === null) {
      throw new Error('WorkingAnimalComponent requires "stamina" field');
    }

    this.role = data.role;
    this.skills = data.skills.map(s => ({ ...s }));
    this.currentTask = data.currentTask ? { ...data.currentTask } : undefined;
    this.efficiency = data.efficiency;
    this.stamina = data.stamina;
  }
}

/**
 * Get or create a skill entry for a working animal.
 * Returns the existing skill or creates a new one at level 0.
 */
export function getOrCreateSkill(
  workingAnimal: WorkingAnimalComponent,
  skillType: string
): AnimalSkill {
  let skill = workingAnimal.skills.find(s => s.skillType === skillType);
  if (!skill) {
    skill = { skillType, level: 0, experience: 0 };
    workingAnimal.skills.push(skill);
  }
  return skill;
}

/**
 * Apply XP to a skill. 100 XP = 1 level (capped at 100).
 * Returns true if the animal leveled up.
 */
export function trainSkill(
  workingAnimal: WorkingAnimalComponent,
  skillType: string,
  xpGain: number
): boolean {
  const skill = getOrCreateSkill(workingAnimal, skillType);
  const prevLevel = skill.level;
  skill.experience += xpGain;

  // Level up: every 100 XP
  const newLevel = Math.min(100, Math.floor(skill.experience / 100));
  if (newLevel > prevLevel) {
    skill.level = newLevel;
    return true;
  }
  return false;
}

/**
 * Default skills per role for newly assigned working animals.
 */
export function defaultSkillsForRole(role: AnimalRole): AnimalSkill[] {
  const skillMap: Record<AnimalRole, string[]> = {
    plow:  ['plowing', 'hauling'],
    guard: ['alertness', 'intimidation'],
    hunt:  ['tracking', 'pursuit'],
    herd:  ['herding', 'alertness'],
    mount: ['endurance', 'obedience'],
    pack:  ['hauling', 'endurance'],
  };
  return (skillMap[role] ?? []).map(skillType => ({
    skillType,
    level: 0,
    experience: 0,
  }));
}
