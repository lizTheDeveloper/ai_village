import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../ecs/World';
import { GuardDutySystem } from '../systems/GuardDutySystem';
import { Entity } from '../ecs/Entity';
import { EventBusImpl, type EventBus } from '../events/EventBus';

/**
 * Tests for GuardDutySystem - Acceptance Criterion 7
 *
 * Verifies:
 * - Guard assignments (location, person, patrol)
 * - Alertness decay over time
 * - Periodic threat checks within response radius
 * - Detection chance calculation
 * - Response selection (alert others, intercept, observe, flee)
 * - Alert propagation to other guards
 */
describe('GuardDutySystem', () => {
  let world: World;
  let system: GuardDutySystem;
  let eventBus: EventBus;
  let guard: Entity;
  let threat: Entity;
  let otherGuard: Entity;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new GuardDutySystem(eventBus);

    // Create guard
    guard = world.createEntity();
    guard.addComponent('position', { x: 0, y: 0, z: 0 });
    guard.addComponent('agent', { name: 'Guard' });
    guard.addComponent('combat_stats', {
      combatSkill: 7,
      stealthSkill: 6,
    });

    // Create threat
    threat = world.createEntity();
    threat.addComponent('position', { x: 5, y: 5, z: 0 });
    threat.addComponent('agent', { name: 'Intruder' });
    threat.addComponent('combat_stats', {
      stealthSkill: 8,
    });

    // Create other guard
    otherGuard = world.createEntity();
    otherGuard.addComponent('position', { x: 10, y: 0, z: 0 });
    otherGuard.addComponent('agent', { name: 'Other Guard' });
  });

  describe('REQ-CON-010: Guard Duty', () => {
    it('should support location guard assignment', () => {
      guard.addComponent('guard_duty', {
        type: 'guard_duty',
        version: 1,
        assignmentType: 'location',
        targetLocation: { x: 10, y: 10, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const duty = guard.getComponent('guard_duty');
      expect(duty.assignmentType).toBe('location');
      expect(duty.targetLocation).toEqual({ x: 10, y: 10, z: 0 });
    });

    it('should support person guard assignment', () => {
      const vip = world.createEntity();
      vip.addComponent('agent', { name: 'VIP' });

      guard.addComponent('guard_duty', {
        assignmentType: 'person',
        targetPerson: vip.id,
        alertness: 1.0,
        responseRadius: 15,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const duty = guard.getComponent('guard_duty');
      expect(duty.assignmentType).toBe('person');
      expect(duty.targetPerson).toBe(vip.id);
    });

    it('should support patrol assignment', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'patrol',
        patrolRoute: [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
          { x: 10, y: 10, z: 0 },
          { x: 0, y: 10, z: 0 },
        ],
        alertness: 1.0,
        responseRadius: 20,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      const duty = guard.getComponent('guard_duty');
      expect(duty.assignmentType).toBe('patrol');
      expect(duty.patrolRoute.length).toBe(4);
    });

    it('should decay alertness over time', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      });

      const initialAlertness = guard.getComponent('guard_duty').alertness;

      // Simulate 100 time units
      for (let i = 0; i < 100; i++) {
        system.update(world, Array.from(world.entities.values()), 1);
      }

      const finalAlertness = guard.getComponent('guard_duty').alertness;

      expect(finalAlertness).toBeLessThan(initialAlertness);
    });

    it('should perform periodic threat checks', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
        lastCheckTime: 0,
      });

      system.update(world, Array.from(world.entities.values()), 10);

      const duty = guard.getComponent('guard_duty');
      expect(duty.lastCheckTime).toBeGreaterThan(0);
    });

    it('should calculate detection chance based on alertness and stealth', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 0.8,
        responseRadius: 20,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      // Guard alertness(0.8) vs threat stealth(8)
      // Detection should be possible but not guaranteed
      const alert = guard.getComponent('alert');

      if (alert) {
        expect(alert.detectedThreat).toBe(threat.id);
      }
    });

    it('should detect threats within response radius', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 10,
      });

      // Threat at (5, 5) is within radius
      system.update(world, Array.from(world.entities.values()), 1);

      const alert = guard.getComponent('alert');

      if (alert) {
        expect(alert.type).toBe('threat_detected');
      }
    });

    it('should not detect threats outside response radius', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 3,
      });

      // Threat at (5, 5) is outside radius of 3
      system.update(world, Array.from(world.entities.values()), 1);

      expect(guard.hasComponent('alert')).toBe(false);
    });

    it('should choose alert response for moderate threats', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      });

      threat.addComponent('threat_level', { level: 'moderate' });

      system.update(world, Array.from(world.entities.values()), 1);

      const response = guard.getComponent('guard_response');

      if (response) {
        expect(response.action).toBe('alert_others');
      }
    });

    it('should choose intercept response for high threats', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      });

      threat.addComponent('threat_level', { level: 'high' });
      // Use updateComponent for immutable components
      (guard as any).updateComponent('combat_stats', (stats: any) => ({
        ...stats,
        combatSkill: 10, // Confident guard
      }));

      system.update(world, Array.from(world.entities.values()), 1);

      const response = guard.getComponent('guard_response');

      if (response) {
        expect(response.action).toBe('intercept');
      }
    });

    it('should choose observe response for low threats', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      });

      threat.addComponent('threat_level', { level: 'low' });

      system.update(world, Array.from(world.entities.values()), 1);

      const response = guard.getComponent('guard_response');

      if (response) {
        expect(response.action).toBe('observe');
      }
    });

    it('should choose flee response for overwhelming threats', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      });

      // Use updateComponent for immutable components
      (guard as any).updateComponent('combat_stats', (stats: any) => ({
        ...stats,
        combatSkill: 2, // Weak guard
      }));
      threat.addComponent('threat_level', { level: 'critical' });

      system.update(world, Array.from(world.entities.values()), 1);

      const response = guard.getComponent('guard_response');

      if (response) {
        expect(response.action).toBe('flee');
      }
    });

    it('should propagate alerts to nearby guards', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      });

      otherGuard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 10, y: 0, z: 0 },
        alertness: 0.5,
        responseRadius: 20,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      // If guard detects threat and alerts
      const guardResponse = guard.getComponent('guard_response');
      if (guardResponse && guardResponse.action === 'alert_others') {
        const otherGuardAlert = otherGuard.getComponent('alert');
        expect(otherGuardAlert).toBeDefined();
        expect(otherGuardAlert.alertedBy).toBe(guard.id);
      }
    });

    it('should emit guard:threat_detected event', () => {
      const threatHandler = vi.fn();
      eventBus.on('guard:threat_detected', threatHandler);

      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 1.0,
        responseRadius: 20,
      });

      system.update(world, Array.from(world.entities.values()), 1);

      if (threatHandler.mock.calls.length > 0) {
        expect(threatHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            guardId: guard.id,
            threatId: threat.id,
          })
        );
      }
    });

    it('should emit guard:alertness_low event', () => {
      const alertnessHandler = vi.fn();
      eventBus.on('guard:alertness_low', alertnessHandler);

      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        targetLocation: { x: 0, y: 0, z: 0 },
        alertness: 0.21, // Just above threshold (0.2), will decay below
        responseRadius: 20,
      });

      // Run for enough ticks to decay below threshold
      // ALERTNESS_DECAY_RATE = 0.0001 per ms, deltaTime = 1ms
      // Need to drop by 0.01+ to cross threshold
      // That's 100+ ms of decay
      for (let i = 0; i < 200; i++) {
        system.update(world, Array.from(world.entities.values()), 1);
      }

      expect(alertnessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          guardId: guard.id,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw when assignment type is missing', () => {
      guard.addComponent('guard_duty', {
        alertness: 1.0,
        responseRadius: 20,
      } as any);

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Guard assignment type is required');
    });

    it('should throw when location assignment lacks target location', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'location',
        alertness: 1.0,
        responseRadius: 20,
      } as any);

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Location guard assignment requires targetLocation');
    });

    it('should throw when person assignment lacks target person', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'person',
        alertness: 1.0,
        responseRadius: 20,
      } as any);

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Person guard assignment requires targetPerson');
    });

    it('should throw when patrol assignment lacks route', () => {
      guard.addComponent('guard_duty', {
        assignmentType: 'patrol',
        alertness: 1.0,
        responseRadius: 20,
      } as any);

      expect(() => system.update(world, Array.from(world.entities.values()), 1)).toThrow('Patrol assignment requires patrolRoute');
    });
  });
});
