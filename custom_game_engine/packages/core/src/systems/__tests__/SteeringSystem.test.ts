import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SteeringSystem } from '../SteeringSystem.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createVelocityComponent } from '../../components/VelocityComponent.js';
import { SteeringComponent } from '../../components/SteeringComponent.js';
import { EntityImpl } from '../../ecs/Entity.js';
import type { Component } from '../../ecs/Component.js';

describe('SteeringSystem', () => {
  let world: World;
  let system: SteeringSystem;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new SteeringSystem();
  });

  describe('AC2: Navigation Reaches Targets', () => {
    it('should move agent toward target position (seek behavior)', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createVelocityComponent(0, 0));
      entity.addComponent(new SteeringComponent({
        behavior: 'seek',
        target: { x: 10, y: 10 },
        maxSpeed: 2.0,
        maxForce: 0.5,
      }));

      // Run multiple updates for physics to converge
      for (let i = 0; i < 10; i++) {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 0.1);
      }

      const velocity = entity.getComponent('Velocity');

      // Velocity should point toward target
      expect(velocity.vx).toBeGreaterThan(0);
      expect(velocity.vy).toBeGreaterThan(0);
    });

    it('should slow down when approaching target (arrive behavior)', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(8, 8)); // Close to target
      entity.addComponent(createVelocityComponent(2, 2));
      entity.addComponent(new SteeringComponent({
        behavior: 'arrive',
        target: { x: 10, y: 10 },
        maxSpeed: 2.0,
        maxForce: 0.5,
        slowingRadius: 5.0,
      }));

      const initialSpeed = Math.sqrt(2 * 2 + 2 * 2);

      // Run multiple updates for slowing behavior
      for (let i = 0; i < 10; i++) {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 0.1);
      }

      const velocity = entity.getComponent('Velocity');
      const finalSpeed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2);

      // Speed should decrease when within slowing radius
      expect(finalSpeed).toBeLessThan(initialSpeed);
    });

    it('should stop when reaching target within tolerance', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(9.9, 9.9)); // Very close
      entity.addComponent(createVelocityComponent(0.5, 0.5));
      entity.addComponent(new SteeringComponent({
        behavior: 'arrive',
        target: { x: 10, y: 10 },
        maxSpeed: 2.0,
        maxForce: 0.5,
        arrivalTolerance: 1.0,
      }));

      // Run multiple updates for arrival behavior
      for (let i = 0; i < 10; i++) {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 0.1);
      }

      const velocity = entity.getComponent('Velocity');
      const speed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2);

      expect(speed).toBeLessThan(0.5); // Significantly slowed down
    });

    it('should avoid obstacles using ray-casting', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createVelocityComponent(2, 0)); // Moving east
      entity.addComponent(new SteeringComponent({
        behavior: 'obstacle_avoidance',
        maxSpeed: 2.0,
        maxForce: 0.5,
        lookAheadDistance: 5.0,
      }));

      // Place obstacle in path
      const obstacle = world.createEntity() as EntityImpl;
      const collisionComponent: Component = {
        type: 'collision',
        version: 1,
        radius: 1.0
      };
      obstacle.addComponent(createPositionComponent(3, 0));
      obstacle.addComponent(collisionComponent);

      // Run multiple updates for avoidance behavior
      for (let i = 0; i < 10; i++) {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 0.1);
      }

      const velocity = entity.getComponent('Velocity');

      // Should steer away from obstacle (north or south)
      expect(Math.abs(velocity.vy)).toBeGreaterThan(0);
    });

    it('should navigate across chunk boundaries', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(255, 255)); // Edge of chunk
      entity.addComponent(createVelocityComponent(2, 2));
      entity.addComponent(new SteeringComponent({
        behavior: 'seek',
        target: { x: 300, y: 300 }, // Across chunk boundary
        maxSpeed: 2.0,
        maxForce: 0.5,
      }));

      // Run multiple updates for navigation
      for (let i = 0; i < 10; i++) {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 0.1);
      }

      const velocity = entity.getComponent('Velocity');

      // Should continue steering in correct direction (toward target)
      expect(velocity.vx).toBeGreaterThan(0);
      expect(velocity.vy).toBeGreaterThan(0);
    });
  });

  describe('wander behavior', () => {
    it('should produce coherent wandering (not random jitter)', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createVelocityComponent(1, 0));
      entity.addComponent(new SteeringComponent({
        behavior: 'wander',
        maxSpeed: 2.0,
        maxForce: 0.5,
        wanderRadius: 2.0,
        wanderDistance: 3.0,
        wanderJitter: 0.5,
      }));

      const velocities = [];
      for (let i = 0; i < 10; i++) {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 1.0);
        const vel = entity.getComponent('Velocity');
        velocities.push({ vx: vel.vx, vy: vel.vy });
      }

      // Check that velocity changes are smooth (not erratic)
      for (let i = 1; i < velocities.length; i++) {
        const deltaVx = velocities[i].vx - velocities[i - 1].vx;
        const deltaVy = velocities[i].vy - velocities[i - 1].vy;
        const change = Math.sqrt(deltaVx ** 2 + deltaVy ** 2);

        expect(change).toBeLessThan(1.0); // Smooth transitions
      }
    });
  });

  describe('steering force calculation', () => {
    it('should limit steering force to maxForce', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createVelocityComponent(0, 0));
      entity.addComponent(new SteeringComponent({
        behavior: 'seek',
        target: { x: 100, y: 100 }, // Far target
        maxSpeed: 2.0,
        maxForce: 0.5,
      }));

      system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 1.0);

      const velocity = entity.getComponent('Velocity');
      const acceleration = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2);

      // Acceleration should not exceed maxForce
      expect(acceleration).toBeLessThanOrEqual(0.5 + 0.01); // Small epsilon
    });

    it('should limit velocity to maxSpeed', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createVelocityComponent(5, 5)); // Excessive speed
      entity.addComponent(new SteeringComponent({
        behavior: 'seek',
        target: { x: 10, y: 10 },
        maxSpeed: 2.0,
        maxForce: 0.5,
      }));

      system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 1.0);

      const velocity = entity.getComponent('Velocity');
      const speed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2);

      expect(speed).toBeLessThanOrEqual(2.0 + 0.01);
    });
  });

  describe('AC10: No Silent Fallbacks (CLAUDE.md Compliance)', () => {
    it('should throw error for missing target in seek behavior', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createVelocityComponent(0, 0));
      entity.addComponent(new SteeringComponent({
        behavior: 'seek',
        maxSpeed: 2.0,
        maxForce: 0.5,
        // Missing target
      }));

      expect(() => {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 1.0);
      }).toThrow('target');
    });

    it('should throw error for invalid behavior type', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createVelocityComponent(0, 0));

      // Error should be thrown during component creation (fail fast)
      expect(() => {
        entity.addComponent(new SteeringComponent({
          behavior: 'invalid' as 'seek',
          maxSpeed: 2.0,
          maxForce: 0.5,
        }));
      }).toThrow('behavior');
    });

    it('should throw error for missing Position component', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createVelocityComponent(0, 0));
      entity.addComponent(new SteeringComponent({
        behavior: 'seek',
        target: { x: 10, y: 10 },
        maxSpeed: 2.0,
        maxForce: 0.5,
      }));

      expect(() => {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 1.0);
      }).toThrow(/Position/i);
    });

    it('should throw error for missing Velocity component', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(new SteeringComponent({
        behavior: 'seek',
        target: { x: 10, y: 10 },
        maxSpeed: 2.0,
        maxForce: 0.5,
      }));

      expect(() => {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 1.0);
      }).toThrow(/Velocity/i);
    });
  });

  describe('combined behaviors', () => {
    it('should blend seek and obstacle avoidance', () => {
      const entity = world.createEntity() as EntityImpl;
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createVelocityComponent(2, 0));
      entity.addComponent(new SteeringComponent({
        behavior: 'combined',
        behaviors: [
          { type: 'seek', target: { x: 10, y: 0 }, weight: 1.0 },
          { type: 'obstacle_avoidance', weight: 2.0 },
        ],
        maxSpeed: 2.0,
        maxForce: 0.5,
        lookAheadDistance: 6.0, // Must be > distance to obstacle (5 units)
      }));

      // Place obstacle
      const obstacle = world.createEntity() as EntityImpl;
      const collisionComponent: Component = {
        type: 'collision',
        version: 1,
        radius: 1.0
      };
      obstacle.addComponent(createPositionComponent(5, 0));
      obstacle.addComponent(collisionComponent);

      // Run multiple updates for combined behavior
      for (let i = 0; i < 10; i++) {
        system.update(world, world.query().with('steering').with('position').with('velocity').executeEntities(), 0.1);
      }

      const velocity = entity.getComponent('Velocity');

      // Should both seek target AND avoid obstacle
      expect(velocity.vx).toBeGreaterThan(0); // Still moving toward target
      expect(Math.abs(velocity.vy)).toBeGreaterThan(0); // But steering away
    });
  });
});
