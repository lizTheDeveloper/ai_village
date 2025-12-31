import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../World.js';
import { PredatorAttackSystem } from '../systems/PredatorAttackSystem.js';

describe('PredatorAttackSystem', () => {
  let world: World;
  let system: PredatorAttackSystem;

  beforeEach(() => {
    world = new World();
    system = new PredatorAttackSystem(world.eventBus);
  });

  describe('Predator Attack Flow', () => {
    it('should attack nearby agents when hungry', () => {
      // Create predator (wolf)
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'wolf',
        danger: 7,
        speed: 5,
        awareness: 6,
        aggression: 8,
        hunger: 85, // Very hungry
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      // Create agent
      const agent = world.createEntity();
      agent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Test Agent',
        species: 'human',
      });
      agent.addComponent('position', {
        type: 'position',
        version: 1,
        x: 5,
        y: 0,
        z: 0,
      });
      agent.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 3,
        huntingSkill: 2,
        stealthSkill: 1,
      });

      // Track events
      const events: any[] = [];
      world.eventBus.on('predator:attack', (data) => events.push({ type: 'attack', data }));
      world.eventBus.on('predator:repelled', (data) => events.push({ type: 'repelled', data }));
      world.eventBus.on('injury:inflicted', (data) => events.push({ type: 'injury', data }));

      // Run system
      const entities = world.getAllEntities();
      system.update(world, entities, 1000);

      // Flush event queue
      world.eventBus.flush();

      // Verify predator attacked
      expect(events.some(e => e.type === 'attack')).toBe(true);

      // Verify conflict was created
      const conflict = world.getComponent(predator.id, 'conflict');
      expect(conflict).toBeDefined();
      if (conflict) {
        expect(conflict.conflictType).toBe('predator_attack');
        expect(conflict.target).toBe(agent.id);
      }
    });

    it('should not attack if agent has high stealth and passes detection check', () => {
      // Create predator
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'wolf',
        danger: 7,
        speed: 5,
        awareness: 3, // Low awareness
        aggression: 8,
        hunger: 85,
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      // Create stealthy agent
      const agent = world.createEntity();
      agent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Stealthy Agent',
        species: 'human',
      });
      agent.addComponent('position', {
        type: 'position',
        version: 1,
        x: 5,
        y: 0,
        z: 0,
      });
      agent.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 3,
        huntingSkill: 2,
        stealthSkill: 10, // Very stealthy
      });

      // Track events
      const events: any[] = [];
      world.eventBus.on('predator:attack', (data) => events.push(data));

      // Run system multiple times (detection is probabilistic)
      const entities = world.getAllEntities();
      let attackCount = 0;
      for (let i = 0; i < 10; i++) {
        system.update(world, entities, 1000);
        world.eventBus.flush();
        if (events.length > attackCount) {
          attackCount = events.length;
        }
      }

      // With high stealth vs low awareness, attacks should be rare
      expect(attackCount).toBeLessThan(5);
    });

    it('should defend territory when agent enters', () => {
      // Create territorial predator
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'bear',
        danger: 8,
        speed: 4,
        awareness: 6,
        aggression: 7,
        hunger: 50, // Not hungry
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });
      predator.addComponent('territory', {
        type: 'territory',
        version: 1,
        center: { x: 0, y: 0, z: 0 },
        radius: 10,
      });

      // Create agent entering territory
      const agent = world.createEntity();
      agent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Test Agent',
        species: 'human',
      });
      agent.addComponent('position', {
        type: 'position',
        version: 1,
        x: 5,
        y: 0,
        z: 0,
      });
      agent.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 3,
      });

      // Track events
      const events: any[] = [];
      world.eventBus.on('predator:attack', (data) => events.push(data));

      // Run system
      const entities = world.getAllEntities();
      system.update(world, entities, 1000);
      world.eventBus.flush();

      // Verify territorial attack
      expect(events.length).toBeGreaterThan(0);
      const conflict = world.getComponent(predator.id, 'conflict');
      expect(conflict?.metadata?.trigger).toBe('territory');
    });

    it('should apply injury on successful attack', () => {
      // Create predator
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'wolf',
        danger: 9, // High danger
        speed: 5,
        awareness: 6,
        aggression: 8,
        hunger: 85,
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      // Create weak agent
      const agent = world.createEntity();
      agent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Weak Agent',
        species: 'human',
      });
      agent.addComponent('position', {
        type: 'position',
        version: 1,
        x: 5,
        y: 0,
        z: 0,
      });
      agent.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 1, // Very weak
      });
      agent.addComponent('episodic_memory', {
        type: 'episodic_memory',
        version: 1,
        memories: [],
      });

      // Track injury events
      const injuries: any[] = [];
      world.eventBus.on('injury:inflicted', (event) => injuries.push(event));

      // Run system multiple times until injury occurs
      const entities = world.getAllEntities();
      for (let i = 0; i < 20; i++) {
        system.update(world, entities, 1000);
        world.eventBus.flush();
        if (injuries.length > 0) break;
      }

      // Verify injury was applied
      expect(injuries.length).toBeGreaterThan(0);
      if (injuries.length > 0) {
        expect(['laceration', 'puncture', 'bite']).toContain(injuries[0].data.injuryType);
        expect(['minor', 'major', 'critical']).toContain(injuries[0].data.severity);
        expect(['head', 'torso', 'arms', 'legs']).toContain(injuries[0].data.location);
      }
      const injury = world.getComponent(agent.id, 'injury');
      expect(injury).toBeDefined();
    });

    it('should alert nearby agents of attack', () => {
      // Create predator
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'wolf',
        danger: 7,
        speed: 5,
        awareness: 6,
        aggression: 8,
        hunger: 85,
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      // Create target agent
      const target = world.createEntity();
      target.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Target',
        species: 'human',
      });
      target.addComponent('position', {
        type: 'position',
        version: 1,
        x: 5,
        y: 0,
        z: 0,
      });
      target.addComponent('combat_stats', {
        type: 'combat_stats',
        version: 1,
        combatSkill: 1,
      });

      // Create nearby agent
      const nearby = world.createEntity();
      nearby.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Nearby',
        species: 'human',
      });
      nearby.addComponent('position', {
        type: 'position',
        version: 1,
        x: 10,
        y: 0,
        z: 0,
      });

      // Track alerts
      const alerts: any[] = [];
      world.eventBus.on('guard:threat_detected', (data) => alerts.push(data));

      // Run system
      const entities = world.getAllEntities();
      system.update(world, entities, 1000);
      world.eventBus.flush();

      // Verify nearby agent was alerted
      expect(alerts.length).toBeGreaterThan(0);
      const alert = world.getComponent(nearby.id, 'alert');
      if (alert) {
        expect(alert.alertType).toBe('predator_attack');
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid danger level', () => {
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'wolf',
        danger: 15, // Invalid - must be 0-10
        speed: 5,
        awareness: 6,
        aggression: 8,
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      const agent = world.createEntity();
      agent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Test',
        species: 'human',
      });
      agent.addComponent('position', {
        type: 'position',
        version: 1,
        x: 5,
        y: 0,
        z: 0,
      });

      const entities = world.getAllEntities();
      expect(() => system.update(world, entities, 1000)).toThrow('Invalid danger level');
    });

    it('should throw if predator missing required component', () => {
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'wolf',
        danger: 7,
        speed: 5,
        awareness: 6,
        aggression: 8,
        hunger: 85,
      });
      // Missing position component

      const agent = world.createEntity();
      agent.addComponent('agent', {
        type: 'agent',
        version: 1,
        name: 'Test',
        species: 'human',
      });
      agent.addComponent('position', {
        type: 'position',
        version: 1,
        x: 5,
        y: 0,
        z: 0,
      });

      const entities = world.getAllEntities();
      expect(() => system.update(world, entities, 1000)).toThrow('Predator missing required component: position');
    });
  });
});
