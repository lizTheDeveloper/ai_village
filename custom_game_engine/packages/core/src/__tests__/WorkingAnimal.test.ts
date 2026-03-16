import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkingAnimalComponent,
  getOrCreateSkill,
  trainSkill,
  defaultSkillsForRole,
} from '../components/WorkingAnimalComponent.js';
import { WorkingAnimalSystem } from '../systems/WorkingAnimalSystem.js';
import type { AnimalRole, WorkTask } from '../components/WorkingAnimalComponent.js';

// ============================================================================
// WorkingAnimalComponent unit tests
// ============================================================================

describe('WorkingAnimalComponent', () => {
  describe('constructor validation', () => {
    it('should throw when role is missing', () => {
      expect(() =>
        new WorkingAnimalComponent({
          role: undefined as unknown as AnimalRole,
          skills: [],
          efficiency: 50,
          stamina: 100,
        })
      ).toThrow('WorkingAnimalComponent requires "role" field');
    });

    it('should throw when skills is missing', () => {
      expect(() =>
        new WorkingAnimalComponent({
          role: 'plow',
          skills: undefined as unknown as [],
          efficiency: 50,
          stamina: 100,
        })
      ).toThrow('WorkingAnimalComponent requires "skills" field');
    });

    it('should throw when efficiency is missing', () => {
      expect(() =>
        new WorkingAnimalComponent({
          role: 'guard',
          skills: [],
          efficiency: undefined as unknown as number,
          stamina: 100,
        })
      ).toThrow('WorkingAnimalComponent requires "efficiency" field');
    });

    it('should throw when stamina is missing', () => {
      expect(() =>
        new WorkingAnimalComponent({
          role: 'pack',
          skills: [],
          efficiency: 50,
          stamina: undefined as unknown as number,
        })
      ).toThrow('WorkingAnimalComponent requires "stamina" field');
    });

    it('should construct successfully with all required fields', () => {
      const comp = new WorkingAnimalComponent({
        role: 'hunt',
        skills: [{ skillType: 'tracking', level: 5, experience: 500 }],
        efficiency: 70,
        stamina: 80,
      });
      expect(comp.type).toBe('working_animal');
      expect(comp.role).toBe('hunt');
      expect(comp.skills).toHaveLength(1);
      expect(comp.efficiency).toBe(70);
      expect(comp.stamina).toBe(80);
      expect(comp.currentTask).toBeUndefined();
    });

    it('should deep copy skills array to avoid shared references', () => {
      const original = [{ skillType: 'plowing', level: 1, experience: 100 }];
      const comp = new WorkingAnimalComponent({
        role: 'plow',
        skills: original,
        efficiency: 50,
        stamina: 100,
      });
      original[0].level = 99;
      expect(comp.skills[0].level).toBe(1); // not mutated
    });

    it('should deep copy currentTask if provided', () => {
      const task: WorkTask = { taskType: 'plow', duration: 50, energyCost: 0.5 };
      const comp = new WorkingAnimalComponent({
        role: 'plow',
        skills: [],
        efficiency: 50,
        stamina: 100,
        currentTask: task,
      });
      task.duration = 999;
      expect(comp.currentTask!.duration).toBe(50); // not mutated
    });
  });
});

// ============================================================================
// getOrCreateSkill tests
// ============================================================================

describe('getOrCreateSkill', () => {
  it('should return existing skill', () => {
    const comp = new WorkingAnimalComponent({
      role: 'herd',
      skills: [{ skillType: 'herding', level: 5, experience: 500 }],
      efficiency: 50,
      stamina: 100,
    });
    const skill = getOrCreateSkill(comp, 'herding');
    expect(skill.level).toBe(5);
    expect(skill.experience).toBe(500);
    expect(comp.skills).toHaveLength(1); // no new skill added
  });

  it('should create a new skill at level 0 when not found', () => {
    const comp = new WorkingAnimalComponent({
      role: 'herd',
      skills: [],
      efficiency: 50,
      stamina: 100,
    });
    const skill = getOrCreateSkill(comp, 'alertness');
    expect(skill.skillType).toBe('alertness');
    expect(skill.level).toBe(0);
    expect(skill.experience).toBe(0);
    expect(comp.skills).toHaveLength(1);
  });

  it('should return the same reference on second call', () => {
    const comp = new WorkingAnimalComponent({
      role: 'guard',
      skills: [],
      efficiency: 50,
      stamina: 100,
    });
    const skill1 = getOrCreateSkill(comp, 'intimidation');
    const skill2 = getOrCreateSkill(comp, 'intimidation');
    expect(skill1).toBe(skill2); // same object reference
    expect(comp.skills).toHaveLength(1);
  });
});

// ============================================================================
// trainSkill tests
// ============================================================================

describe('trainSkill', () => {
  it('should add XP and not level up below threshold', () => {
    const comp = new WorkingAnimalComponent({
      role: 'plow',
      skills: [{ skillType: 'plowing', level: 0, experience: 0 }],
      efficiency: 50,
      stamina: 100,
    });
    const leveled = trainSkill(comp, 'plowing', 50);
    expect(leveled).toBe(false);
    expect(comp.skills[0].experience).toBe(50);
    expect(comp.skills[0].level).toBe(0);
  });

  it('should level up at exactly 100 XP', () => {
    const comp = new WorkingAnimalComponent({
      role: 'plow',
      skills: [{ skillType: 'plowing', level: 0, experience: 0 }],
      efficiency: 50,
      stamina: 100,
    });
    const leveled = trainSkill(comp, 'plowing', 100);
    expect(leveled).toBe(true);
    expect(comp.skills[0].level).toBe(1);
    expect(comp.skills[0].experience).toBe(100);
  });

  it('should level up multiple levels from large XP gain', () => {
    const comp = new WorkingAnimalComponent({
      role: 'pack',
      skills: [{ skillType: 'hauling', level: 0, experience: 0 }],
      efficiency: 50,
      stamina: 100,
    });
    const leveled = trainSkill(comp, 'hauling', 300);
    expect(leveled).toBe(true);
    expect(comp.skills[0].level).toBe(3);
  });

  it('should cap level at 100', () => {
    const comp = new WorkingAnimalComponent({
      role: 'mount',
      skills: [{ skillType: 'endurance', level: 99, experience: 9900 }],
      efficiency: 50,
      stamina: 100,
    });
    trainSkill(comp, 'endurance', 200); // would go to 101 without cap
    expect(comp.skills[0].level).toBe(100);
  });

  it('should create the skill if it does not exist', () => {
    const comp = new WorkingAnimalComponent({
      role: 'hunt',
      skills: [],
      efficiency: 50,
      stamina: 100,
    });
    trainSkill(comp, 'tracking', 50);
    expect(comp.skills).toHaveLength(1);
    expect(comp.skills[0].skillType).toBe('tracking');
  });
});

// ============================================================================
// defaultSkillsForRole tests
// ============================================================================

describe('defaultSkillsForRole', () => {
  it('should return plowing and hauling for plow role', () => {
    const skills = defaultSkillsForRole('plow');
    const types = skills.map(s => s.skillType);
    expect(types).toContain('plowing');
    expect(types).toContain('hauling');
  });

  it('should return alertness and intimidation for guard role', () => {
    const skills = defaultSkillsForRole('guard');
    const types = skills.map(s => s.skillType);
    expect(types).toContain('alertness');
    expect(types).toContain('intimidation');
  });

  it('should return tracking and pursuit for hunt role', () => {
    const skills = defaultSkillsForRole('hunt');
    const types = skills.map(s => s.skillType);
    expect(types).toContain('tracking');
    expect(types).toContain('pursuit');
  });

  it('should return herding and alertness for herd role', () => {
    const skills = defaultSkillsForRole('herd');
    const types = skills.map(s => s.skillType);
    expect(types).toContain('herding');
    expect(types).toContain('alertness');
  });

  it('should return endurance and obedience for mount role', () => {
    const skills = defaultSkillsForRole('mount');
    const types = skills.map(s => s.skillType);
    expect(types).toContain('endurance');
    expect(types).toContain('obedience');
  });

  it('should return hauling and endurance for pack role', () => {
    const skills = defaultSkillsForRole('pack');
    const types = skills.map(s => s.skillType);
    expect(types).toContain('hauling');
    expect(types).toContain('endurance');
  });

  it('should set all default skills at level 0 with 0 experience', () => {
    const skills = defaultSkillsForRole('guard');
    for (const skill of skills) {
      expect(skill.level).toBe(0);
      expect(skill.experience).toBe(0);
    }
  });
});

// ============================================================================
// WorkingAnimalSystem unit tests (no ECS world needed)
// ============================================================================

describe('WorkingAnimalSystem', () => {
  let system: WorkingAnimalSystem;
  let workingComp: WorkingAnimalComponent;

  beforeEach(() => {
    system = new WorkingAnimalSystem();
    workingComp = new WorkingAnimalComponent({
      role: 'guard',
      skills: [{ skillType: 'alertness', level: 10, experience: 1000 }],
      efficiency: 50,
      stamina: 100,
    });
  });

  describe('assignRole', () => {
    it('should change the role', () => {
      system.assignRole(workingComp, 'pack');
      expect(workingComp.role).toBe('pack');
    });

    it('should add default skills for the new role', () => {
      system.assignRole(workingComp, 'pack');
      const types = workingComp.skills.map(s => s.skillType);
      expect(types).toContain('hauling');
      expect(types).toContain('endurance');
    });

    it('should not duplicate skills that already exist', () => {
      // alertness is a skill for guard and herd; animal already has it
      system.assignRole(workingComp, 'herd');
      const alertnessSkills = workingComp.skills.filter(s => s.skillType === 'alertness');
      expect(alertnessSkills).toHaveLength(1);
    });
  });

  describe('assignTask', () => {
    it('should succeed when stamina >= 10', () => {
      const task: WorkTask = { taskType: 'guard', duration: 100, energyCost: 0.5 };
      const result = system.assignTask(workingComp, task);
      expect(result.success).toBe(true);
      expect(workingComp.currentTask).toBeDefined();
      expect(workingComp.currentTask!.taskType).toBe('guard');
    });

    it('should fail when stamina < 10', () => {
      workingComp.stamina = 5;
      const task: WorkTask = { taskType: 'guard', duration: 100, energyCost: 0.5 };
      const result = system.assignTask(workingComp, task);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('exhausted');
      expect(workingComp.currentTask).toBeUndefined();
    });

    it('should succeed at exactly stamina = 10', () => {
      workingComp.stamina = 10;
      const task: WorkTask = { taskType: 'guard', duration: 50, energyCost: 0.5 };
      const result = system.assignTask(workingComp, task);
      expect(result.success).toBe(true);
    });

    it('should deep copy the task to avoid external mutations', () => {
      const task: WorkTask = { taskType: 'guard', duration: 100, energyCost: 0.5 };
      system.assignTask(workingComp, task);
      task.duration = 999;
      expect(workingComp.currentTask!.duration).toBe(100);
    });
  });

  describe('restAnimal', () => {
    it('should clear the current task', () => {
      const task: WorkTask = { taskType: 'plow', duration: 100, energyCost: 0.5 };
      system.assignTask(workingComp, task);
      expect(workingComp.currentTask).toBeDefined();
      system.restAnimal(workingComp);
      expect(workingComp.currentTask).toBeUndefined();
    });

    it('should be safe to call when no task is active', () => {
      expect(workingComp.currentTask).toBeUndefined();
      expect(() => system.restAnimal(workingComp)).not.toThrow();
    });
  });
});
