import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../World';
import { InjurySystem } from '../systems/InjurySystem';
import type { Entity } from '../ecs/Entity';
import { createInjuryComponent } from '../components/InjuryComponent';

/**
 * Tests for InjurySystem - Acceptance Criterion 5
 *
 * Verifies:
 * - Injury types (laceration, puncture, blunt, burn, bite, exhaustion, psychological)
 * - Injury severity (minor, major, critical)
 * - Injury locations (head, torso, arms, legs, hands, feet)
 * - Skill penalties based on type and location
 * - Movement penalties for leg injuries
 * - Needs modifiers (hunger increases with blood loss, etc.)
 * - Healing time calculation
 * - Treatment requirements
 */
describe('InjurySystem', () => {
  let world: World;
  let system: InjurySystem;
  let agent: Entity;

  beforeEach(() => {
    world = new World();
    system = new InjurySystem();

    agent = world.createEntity();
    agent.addComponent('position', { x: 0, y: 0, z: 0 });
    agent.addComponent('agent', { name: 'Test Agent' });
    agent.addComponent('combat_stats', {
      combatSkill: 7,
      craftingSkill: 6,
      socialSkill: 5,
    });
    agent.addComponent('needs', {
      hunger: 50,
      energy: 60,
      health: 100,
    });
    agent.addComponent('movement', {
      baseSpeed: 5,
      currentSpeed: 5,
    });
  });

  describe('REQ-CON-008: Injuries', () => {
    it('should support all injury types', () => {
      const types = ['laceration', 'puncture', 'blunt', 'burn', 'bite', 'exhaustion', 'psychological'];

      types.forEach((injuryType) => {
        const testAgent = world.createEntity();
        testAgent.addComponent('injury', {
          injuryType: injuryType,
          severity: 'minor',
          location: 'torso',
        });

        system.update(world, world.getAllEntities(), 1);

        expect(testAgent.getComponent('injury').injuryType).toBe(injuryType);
      });
    });

    it('should support all severity levels', () => {
      const severities = ['minor', 'major', 'critical'];

      severities.forEach((severity) => {
        agent.addComponent('injury', {
          injuryType: 'laceration',
          severity: severity,
          location: 'torso',
        });

        system.update(world, world.getAllEntities(), 1);

        expect(agent.getComponent('injury').severity).toBe(severity);

        agent.removeComponent('injury');
      });
    });

    it('should support all injury locations', () => {
      const locations = ['head', 'torso', 'arms', 'legs', 'hands', 'feet'];

      locations.forEach((location) => {
        agent.addComponent('injury', {
          injuryType: 'laceration',
          severity: 'minor',
          location: location,
        });

        system.update(world, world.getAllEntities(), 1);

        expect(agent.getComponent('injury').location).toBe(location);

        agent.removeComponent('injury');
      });
    });

    it('should apply skill penalties for arm injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'arms',
      });

      system.update(world, world.getAllEntities(), 1);

      const stats = agent.getComponent('combat_stats');

      // Arm injury should reduce combat and crafting skills
      expect(stats.combatSkill).toBeLessThan(7);
      expect(stats.craftingSkill).toBeLessThan(6);
    });

    it('should apply skill penalties for hand injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'burn',
        severity: 'major',
        location: 'hands',
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const stats = agent.getComponent('combat_stats');

      // Hand injury should severely reduce crafting skill (2x penalty vs arms)
      // Major injury: -2 combat, -4 crafting (2x penalty for hands)
      expect(stats.craftingSkill).toBeLessThan(6); // 6 - 4 = 2
      expect(stats.combatSkill).toBeLessThan(7); // 7 - 2 = 5
      expect(stats.craftingSkill).toBeLessThan(stats.combatSkill); // Crafting more affected
    });

    it('should apply movement penalty for leg injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'blunt',
        severity: 'major',
        location: 'legs',
      });

      system.update(world, world.getAllEntities(), 1);

      const movement = agent.getComponent('movement');

      expect(movement.currentSpeed).toBeLessThan(5);
      expect(movement.penalty).toBeGreaterThan(0);
    });

    it('should apply severe movement penalty for foot injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'puncture',
        severity: 'major',
        location: 'feet',
      });

      system.update(world, world.getAllEntities(), 1);

      const movement = agent.getComponent('movement');

      expect(movement.currentSpeed).toBeLessThan(agent.getComponent('movement').baseSpeed / 2);
    });

    it('should prevent memory formation for critical head injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'blunt',
        severity: 'critical',
        location: 'head',
      });
      agent.addComponent('episodic_memory', { canFormMemories: true });

      system.update(world, Array.from(world.entities.values()), 1);

      const memory = agent.getComponent('episodic_memory');

      expect(memory.canFormMemories).toBe(false);
    });

    it('should allow memory formation for major head injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'blunt',
        severity: 'major',
        location: 'head',
      });
      agent.addComponent('episodic_memory', { canFormMemories: true });

      system.update(world, Array.from(world.entities.values()), 1);

      const memory = agent.getComponent('episodic_memory');

      expect(memory.canFormMemories).toBe(true);
    });

    it('should reduce socializing for psychological injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'psychological',
        severity: 'major',
        location: 'head',
      });

      system.update(world, world.getAllEntities(), 1);

      const stats = agent.getComponent('combat_stats');

      expect(stats.socialSkill).toBeLessThan(5);
    });

    it('should increase hunger decay rate for blood loss injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'torso',
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const needs = agent.getComponent('needs');

      // Blood loss increases hunger decay rate (major = 1.5x)
      expect(needs.hungerDecayRate).toBeGreaterThan(1);
      expect(needs.hungerDecayRate).toBe(1.5);
    });

    it('should increase energy decay rate for all injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'blunt',
        severity: 'major',
        location: 'torso',
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const needs = agent.getComponent('needs');

      // All injuries increase energy decay rate (major = 1.3x)
      expect(needs.energyDecayRate).toBeGreaterThan(1);
      expect(needs.energyDecayRate).toBe(1.3);
    });

    it('should calculate healing time based on severity', () => {
      const minorInjury = world.createEntity();
      minorInjury.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'minor',
        location: 'arms',
      });

      const majorInjury = world.createEntity();
      majorInjury.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'arms',
      });

      const criticalInjury = world.createEntity();
      criticalInjury.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'critical',
        location: 'arms',
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const minorTime = minorInjury.getComponent('injury').healingTime;
      const majorTime = majorInjury.getComponent('injury').healingTime;
      const criticalTime = criticalInjury.getComponent('injury').healingTime;

      expect(minorTime).toBeLessThan(majorTime);
      expect(majorTime).toBeLessThan(criticalTime);
    });

    it('should require treatment for major injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'torso',
      });

      system.update(world, world.getAllEntities(), 1);

      const injury = agent.getComponent('injury');

      expect(injury.requiresTreatment).toBe(true);
      expect(injury.treated).toBe(false);
    });

    it('should require treatment for critical injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'burn',
        severity: 'critical',
        location: 'torso',
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const injury = agent.getComponent('injury');

      expect(injury.requiresTreatment).toBe(true);
      expect(injury.untreatedDuration).toBe(0);
    });

    it('should not require treatment for minor injuries', () => {
      agent.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'minor',
        location: 'arms',
      });

      system.update(world, world.getAllEntities(), 1);

      const injury = agent.getComponent('injury');

      expect(injury.requiresTreatment).toBe(false);
    });

    it('should heal minor injuries over time', () => {
      agent.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'minor',
        location: 'arms',
        healingTime: 100,
        elapsed: 0,
      });

      // Simulate 100 time units passing
      for (let i = 0; i < 100; i++) {
        system.update(world, Array.from(world.entities.values()), 1);
      }

      expect(agent.hasComponent('injury')).toBe(false);
    });

    it('should not heal major injuries without treatment', () => {
      agent.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'torso',
        healingTime: 100,
        elapsed: 0,
        requiresTreatment: true,
        treated: false,
      });

      // Simulate 100 time units passing
      for (let i = 0; i < 100; i++) {
        system.update(world, Array.from(world.entities.values()), 1);
      }

      // Should still have injury - elapsed increments but healing doesn't progress
      expect(agent.hasComponent('injury')).toBe(true);
      expect(agent.getComponent('injury').elapsed).toBe(100);
    });

    it('should heal major injuries after treatment', () => {
      agent.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'torso',
        healingTime: 100,
        elapsed: 0,
        requiresTreatment: true,
        treated: true,
      });

      // Simulate 100 time units passing
      for (let i = 0; i < 100; i++) {
        system.update(world, Array.from(world.entities.values()), 1);
      }

      expect(agent.hasComponent('injury')).toBe(false);
    });

    it('should stack penalties for multiple injuries', () => {
      // Add injury component with multiple injuries array directly
      agent.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'arms',
        injuries: [
          { injuryType: 'laceration', severity: 'major', location: 'arms' },
          { injuryType: 'blunt', severity: 'minor', location: 'legs' },
        ],
      });

      system.update(world, world.getAllEntities(), 1);

      const stats = agent.getComponent('combat_stats');
      const movement = agent.getComponent('movement');

      // Both arm and leg penalties should apply
      expect(stats.combatSkill).toBeLessThan(7);
      expect(movement.currentSpeed).toBeLessThan(5);
    });
  });

  describe('error handling', () => {
    it('should throw when injury type is invalid', () => {
      expect(() => createInjuryComponent({
        injuryType: 'invalid_type' as any,
        severity: 'minor',
        location: 'torso',
      })).toThrow('Invalid injury type');
    });

    it('should throw when severity is invalid', () => {
      expect(() => createInjuryComponent({
        injuryType: 'laceration',
        severity: 'invalid' as any,
        location: 'torso',
      })).toThrow('Invalid injury severity');
    });

    it('should throw when location is invalid', () => {
      expect(() => createInjuryComponent({
        injuryType: 'laceration',
        severity: 'minor',
        location: 'invalid' as any,
      })).toThrow('Invalid injury location');
    });
  });
});
