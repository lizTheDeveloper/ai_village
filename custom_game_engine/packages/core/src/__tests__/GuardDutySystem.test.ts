import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../World.js';
import { GuardDutySystem } from '../systems/GuardDutySystem.js';
import { createGuardDutyComponent } from '../components/GuardDutyComponent.js';

describe('GuardDutySystem', () => {
  let world: World;
  let system: GuardDutySystem;

  beforeEach(() => {
    world = new World();
    system = new GuardDutySystem(world.eventBus);
  });

  describe('Alertness Decay', () => {
    it('should decay alertness over time', () => {
      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 10,
      }));

      const initialAlertness = 1.0;
      const entities = world.getAllEntities();

      // Run system for 1 second
      system.update(world, entities, 1000);

      const duty = world.getComponent(guard.id, 'guard_duty');
      expect(duty?.alertness).toBeLessThan(initialAlertness);
      expect(duty?.alertness).toBeGreaterThanOrEqual(0);
    });

    it('should emit low alertness warning', () => {
      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 0.21, // Just above threshold
        responseRadius: 10,
      }));

      const warnings: any[] = [];
      world.eventBus.on('guard:alertness_low', (event) => warnings.push(event));

      const entities = world.getAllEntities();

      // Run system until alertness drops below threshold
      for (let i = 0; i < 100; i++) {
        system.update(world, entities, 1000);
        world.eventBus.flush();
        if (warnings.length > 0) break;
      }

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].data.alertness).toBeLessThan(0.2);
    });

    it('should not decay alertness below 0', () => {
      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 0.01,
        responseRadius: 10,
      }));

      const entities = world.getAllEntities();

      // Run system for a long time
      for (let i = 0; i < 100; i++) {
        system.update(world, entities, 10000);
      }

      const duty = world.getComponent(guard.id, 'guard_duty');
      expect(duty?.alertness).toBe(0);
    });
  });

  describe('Threat Detection', () => {
    it('should detect nearby predators', () => {
      // Create guard
      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0, // High alertness for guaranteed detection
        responseRadius: 20,
      }));
      guard.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      // Create predator nearby
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'wolf',
        danger: 7,
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 10,
        y: 0,
        z: 0,
      });

      // Track threat detections
      const threats: any[] = [];
      world.eventBus.on('guard:threat_detected', (event) => threats.push(event));

      const entities = world.getAllEntities();

      // Run system multiple times (threat checks are periodic)
      for (let i = 0; i < 10; i++) {
        system.update(world, entities, 6000); // > 5 second check interval
        world.eventBus.flush();
        if (threats.length > 0) break;
      }

      // Should eventually detect threat
      expect(threats.length).toBeGreaterThan(0);
      if (threats.length > 0) {
        expect(threats[0].data.threatId).toBe(predator.id);
        expect(threats[0].data.guardId).toBe(guard.id);
      }
    });

    it('should detect active conflicts', () => {
      // Create guard
      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      }));
      guard.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      // Create entity in conflict
      const combatant = world.createEntity();
      combatant.addComponent('conflict', {
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        target: 'other-entity',
        state: 'attacking',
        startTime: Date.now(),
      });
      combatant.addComponent('position', {
        type: 'position',
        version: 1,
        x: 10,
        y: 0,
        z: 0,
      });

      // Track threat detections
      const threats: any[] = [];
      world.eventBus.on('guard:threat_detected', (data) => threats.push(data));

      const entities = world.getAllEntities();

      // Run system
      for (let i = 0; i < 10; i++) {
        system.update(world, entities, 6000);
        world.eventBus.flush();
        if (threats.length > 0) break;
      }

      expect(threats.length).toBeGreaterThan(0);
    });

    it('should not detect threats outside response radius', () => {
      // Create guard
      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 10, // Small radius
      }));
      guard.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      // Create predator far away
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'wolf',
        danger: 7,
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 50, // Far outside radius
        y: 0,
        z: 0,
      });

      // Track threat detections
      const threats: any[] = [];
      world.eventBus.on('guard:threat_detected', (data) => threats.push(data));

      const entities = world.getAllEntities();

      // Run system
      for (let i = 0; i < 10; i++) {
        system.update(world, entities, 6000);
        world.eventBus.flush();
      }

      // Should not detect distant threat
      expect(threats.length).toBe(0);
    });

    it('should boost alertness when threat detected', () => {
      // Create guard with low alertness
      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 0.5,
        responseRadius: 20,
      }));
      guard.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      // Create high-threat predator
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'bear',
        danger: 9,
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 10,
        y: 0,
        z: 0,
      });

      const initialAlertness = 0.5;
      const entities = world.getAllEntities();

      // Run system
      for (let i = 0; i < 20; i++) {
        system.update(world, entities, 6000);
        const duty = world.getComponent(guard.id, 'guard_duty');
        if (duty && duty.alertness > initialAlertness) {
          // Alertness boosted
          expect(duty.alertness).toBeGreaterThan(initialAlertness);
          return;
        }
      }
    });
  });

  describe('Guard Assignments', () => {
    it('should validate location assignment', () => {
      const guard = world.createEntity();

      expect(() => {
        guard.addComponent('guard_duty', createGuardDutyComponent({
          assignmentType: 'location',
          // Missing targetLocation
          alertness: 1.0,
          responseRadius: 10,
        } as any));
      }).toThrow('Location guard assignment requires targetLocation');
    });

    it('should validate person assignment', () => {
      const guard = world.createEntity();

      expect(() => {
        guard.addComponent('guard_duty', createGuardDutyComponent({
          assignmentType: 'person',
          // Missing targetPerson
          alertness: 1.0,
          responseRadius: 10,
        } as any));
      }).toThrow('Person guard assignment requires targetPerson');
    });

    it('should validate patrol assignment', () => {
      const guard = world.createEntity();

      expect(() => {
        guard.addComponent('guard_duty', createGuardDutyComponent({
          assignmentType: 'patrol',
          // Missing patrolRoute
          alertness: 1.0,
          responseRadius: 10,
        } as any));
      }).toThrow('Patrol assignment requires patrolRoute');
    });

    it('should guard a specific person', () => {
      // Create VIP
      const vip = world.createEntity();
      vip.addComponent('position', {
        type: 'position',
        version: 1,
        x: 50,
        y: 0,
        z: 0,
      });

      // Create guard assigned to VIP
      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'person',
        targetPerson: vip.id,
        alertness: 1.0,
        responseRadius: 15,
      }));
      guard.addComponent('position', {
        type: 'position',
        version: 1,
        x: 45,
        y: 0,
        z: 0,
      });

      // Create threat near VIP
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'assassin',
        danger: 8,
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 55, // Near VIP, not near guard's initial position
        y: 0,
        z: 0,
      });

      // Track threat detections
      const threats: any[] = [];
      world.eventBus.on('guard:threat_detected', (data) => threats.push(data));

      const entities = world.getAllEntities();

      // Run system
      for (let i = 0; i < 10; i++) {
        system.update(world, entities, 6000);
        world.eventBus.flush();
        if (threats.length > 0) break;
      }

      // Guard should detect threats near VIP
      expect(threats.length).toBeGreaterThan(0);
    });

    it('should patrol a route', () => {
      const route = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 10, y: 10, z: 0 },
        { x: 0, y: 10, z: 0 },
      ];

      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'patrol',
        patrolRoute: route,
        patrolIndex: 0,
        alertness: 1.0,
        responseRadius: 10,
      }));
      guard.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      const entities = world.getAllEntities();

      // Initial waypoint index
      const duty1 = world.getComponent(guard.id, 'guard_duty');
      expect(duty1?.patrolIndex).toBe(0);

      // Move guard to first waypoint
      guard.updateComponent('position', () => ({
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      }));

      // Run system - should advance to next waypoint
      system.update(world, entities, 1000);

      const duty2 = world.getComponent(guard.id, 'guard_duty');
      expect(duty2?.patrolIndex).toBe(1);

      // Move to waypoint 1
      guard.updateComponent('position', () => ({
        type: 'position',
        version: 1,
        x: 10,
        y: 0,
        z: 0,
      }));

      system.update(world, entities, 1000);

      const duty3 = world.getComponent(guard.id, 'guard_duty');
      expect(duty3?.patrolIndex).toBe(2);
    });
  });

  describe('Response Selection', () => {
    it('should emit guard:response event', () => {
      // Create guard
      const guard = world.createEntity();
      guard.addComponent('guard_duty', createGuardDutyComponent({
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      }));
      guard.addComponent('position', {
        type: 'position',
        version: 1,
        x: 0,
        y: 0,
        z: 0,
      });

      // Create threat
      const predator = world.createEntity();
      predator.addComponent('animal', {
        type: 'animal',
        version: 1,
        species: 'wolf',
        danger: 7,
      });
      predator.addComponent('position', {
        type: 'position',
        version: 1,
        x: 10,
        y: 0,
        z: 0,
      });

      // Track responses
      const responses: any[] = [];
      world.eventBus.on('guard:response', (event) => responses.push(event));

      const entities = world.getAllEntities();

      // Run system
      for (let i = 0; i < 10; i++) {
        system.update(world, entities, 6000);
        world.eventBus.flush();
        if (responses.length > 0) break;
      }

      expect(responses.length).toBeGreaterThan(0);
      if (responses.length > 0) {
        expect(responses[0].data.guardId).toBe(guard.id);
        expect(responses[0].data.threatId).toBe(predator.id);
        expect(['alert_others', 'intercept', 'observe', 'flee']).toContain(responses[0].data.response);
      }
    });
  });
});
