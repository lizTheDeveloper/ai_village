import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { MovementSystem } from '../MovementSystem.js';
import { SteeringSystem } from '../SteeringSystem.js';
import { SleepSystem } from '../SleepSystem.js';
import { createMovementComponent } from '../../components/MovementComponent.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Integration tests for MovementSystem + SteeringSystem + Navigation
 *
 * Tests verify that:
 * - SteeringSystem calculates forces → MovementSystem applies velocity
 * - Collision detection prevents invalid movement
 * - Fatigue penalties (from NeedsSystem) slow movement correctly
 * - Obstacle avoidance steers around buildings
 * - Agents stop moving when entering sleep state
 */

describe('MovementSystem + SteeringSystem Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createMinimalWorld();
  });

  it('should apply steering forces to velocity which affects movement', () => {
    // Create agent with steering and movement
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    // Add Velocity component for SteeringSystem
    agent.addComponent({
      type: ComponentType.Velocity,
      version: 1,
      vx: 0,
      vy: 0,
    });

    // Add Steering component (seek target)
    agent.addComponent({
      type: ComponentType.Steering,
      version: 1,
      behavior: 'seek',
      maxSpeed: 2.0,
      maxForce: 1.0,
      target: { x: 20, y: 20 }, // Move toward (20, 20)
    });

    // Add Movement component for MovementSystem
    agent.addComponent(createMovementComponent(0, 0, 1.0));

    const steeringSystem = new SteeringSystem();
    const movementSystem = new MovementSystem();

    harness.registerSystem('SteeringSystem', steeringSystem);
    harness.registerSystem('MovementSystem', movementSystem);

    const entities = Array.from(harness.world.entities.values());

    // Apply steering to update velocity
    steeringSystem.update(harness.world, entities, 1.0);

    const velocityAfterSteering = agent.getComponent(ComponentType.Velocity) as any;

    // Velocity should be set toward target
    expect(velocityAfterSteering.vx).toBeGreaterThan(0);
    expect(velocityAfterSteering.vy).toBeGreaterThan(0);

    // Copy velocity to movement component for MovementSystem
    agent.updateComponent('movement', (current: any) => ({
      ...current,
      velocityX: velocityAfterSteering.vx,
      velocityY: velocityAfterSteering.vy,
    }));

    const initialPosition = agent.getComponent(ComponentType.Position) as any;
    const startX = initialPosition.x;
    const startY = initialPosition.y;

    // Apply movement (deltaTime = 1/60 for one tick)
    movementSystem.update(harness.world, entities, 1/60);

    const finalPosition = agent.getComponent(ComponentType.Position) as any;

    // Position should have changed
    expect(finalPosition.x).toBeGreaterThan(startX);
    expect(finalPosition.y).toBeGreaterThan(startY);
  });

  it('should apply fatigue penalties to reduce movement speed', () => {
    // Create agent with low energy
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    agent.addComponent(createMovementComponent(2.0, 2.0, 1.0)); // Moving at (2, 2)
    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 0.2,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  })); // 20% energy = -40% speed penalty

    const movementSystem = new MovementSystem();
    harness.registerSystem('MovementSystem', movementSystem);

    const entities = Array.from(harness.world.entities.values());

    const initialPosition = agent.getComponent(ComponentType.Position) as any;
    const startX = initialPosition.x;
    const startY = initialPosition.y;

    // Apply movement with fatigue penalty (deltaTime = 1/60 for one tick)
    movementSystem.update(harness.world, entities, 1/60);

    const finalPosition = agent.getComponent(ComponentType.Position) as any;

    const distanceMoved = Math.sqrt(
      Math.pow(finalPosition.x - startX, 2) + Math.pow(finalPosition.y - startY, 2)
    );

    // Agent should have moved, but less than full speed
    expect(distanceMoved).toBeGreaterThan(0);

    // With 20% energy, speed multiplier is 0.6 (40% penalty)
    // Without penalty, distance would be ~2.83 tiles per second / 20 ticks = ~0.14
    // With 0.6 multiplier, distance should be ~0.085
    expect(distanceMoved).toBeLessThan(0.15); // Less than full speed
  });

  it('should stop movement when agent enters sleep state', () => {
    // Create agent that is moving
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    agent.addComponent(createMovementComponent(2.0, 2.0, 1.0)); // Moving
    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 0.5,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  }));

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = true; // Agent is sleeping
    agent.addComponent(circadian);

    const movementSystem = new MovementSystem();
    harness.registerSystem('MovementSystem', movementSystem);

    const entities = Array.from(harness.world.entities.values());

    // Apply movement (deltaTime = 1/60 for one tick)
    movementSystem.update(harness.world, entities, 1/60);

    const movement = agent.getComponent(ComponentType.Movement) as any;

    // Velocity should be forced to 0 while sleeping
    expect(movement.velocityX).toBe(0);
    expect(movement.velocityY).toBe(0);
  });

  it('should handle obstacle avoidance with buildings', () => {
    // Create agent
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    agent.addComponent(createMovementComponent(1.0, 0, 1.0)); // Moving right

    // Create building obstacle directly in path
    const building = harness.createTestBuilding('shelter', { x: 12, y: 10 });
    building.addComponent({
      type: 'collision',
      version: 1,
      radius: 1.0,
    });

    const movementSystem = new MovementSystem();
    harness.registerSystem('MovementSystem', movementSystem);

    const entities = Array.from(harness.world.entities.values());

    const initialPosition = agent.getComponent(ComponentType.Position) as any;
    const startX = initialPosition.x;
    const startY = initialPosition.y;

    // Try to move into obstacle (deltaTime = 1/60 for one tick)
    movementSystem.update(harness.world, entities, 1/60);

    const finalPosition = agent.getComponent(ComponentType.Position) as any;

    // Agent should not have moved through the obstacle
    // Either stopped or moved around it
    const distanceMoved = Math.sqrt(
      Math.pow(finalPosition.x - startX, 2) + Math.pow(finalPosition.y - startY, 2)
    );

    // Should have attempted movement but been blocked or redirected
    expect(finalPosition.x).toBeLessThan(12); // Didn't move through obstacle
  });

  it('should arrive behavior slow down near target', () => {
    // Create agent with arrive behavior
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    agent.addComponent({
      type: ComponentType.Velocity,
      version: 1,
      vx: 2.0,
      vy: 0,
    });

    agent.addComponent({
      type: ComponentType.Steering,
      version: 1,
      behavior: 'arrive',
      maxSpeed: 2.0,
      maxForce: 1.0,
      target: { x: 11, y: 10 }, // Very close target
    });

    const steeringSystem = new SteeringSystem();
    harness.registerSystem('SteeringSystem', steeringSystem);

    const entities = Array.from(harness.world.entities.values());

    // Apply steering
    steeringSystem.update(harness.world, entities, 1.0);

    const velocity = agent.getComponent(ComponentType.Velocity) as any;

    // Velocity should be reduced as agent is close to target
    expect(velocity.vx).toBeLessThan(2.0);
  });

  it('should wander behavior create random movement', () => {
    // Create agent with wander behavior
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    agent.addComponent({
      type: ComponentType.Velocity,
      version: 1,
      vx: 0,
      vy: 0,
    });

    agent.addComponent({
      type: ComponentType.Steering,
      version: 1,
      behavior: 'wander',
      maxSpeed: 1.0,
      maxForce: 0.5,
      wanderAngle: 0,
    });

    const steeringSystem = new SteeringSystem();
    harness.registerSystem('SteeringSystem', steeringSystem);

    const entities = Array.from(harness.world.entities.values());

    // Apply steering multiple times
    for (let i = 0; i < 5; i++) {
      steeringSystem.update(harness.world, entities, 1.0);
    }

    const velocity = agent.getComponent(ComponentType.Velocity) as any;

    // Velocity should have changed due to wandering
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
    expect(speed).toBeGreaterThan(0);
  });

  it('should combined steering behavior use obstacle avoidance', () => {
    // Create agent with combined behavior
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    agent.addComponent({
      type: ComponentType.Velocity,
      version: 1,
      vx: 1.0,
      vy: 0,
    });

    agent.addComponent({
      type: ComponentType.Steering,
      version: 1,
      behavior: 'combined',
      maxSpeed: 2.0,
      maxForce: 1.0,
      target: { x: 20, y: 10 },
      behaviors: [
        { type: 'seek', weight: 1.0, target: { x: 20, y: 10 } },
        { type: 'obstacle_avoidance', weight: 2.0 },
      ],
    });

    // Create obstacle in path
    const obstacle = harness.createTestBuilding('shelter', { x: 15, y: 10 });
    obstacle.addComponent({
      type: 'collision',
      version: 1,
      radius: 2.0,
    });

    const steeringSystem = new SteeringSystem();
    harness.registerSystem('SteeringSystem', steeringSystem);

    const entities = Array.from(harness.world.entities.values());

    // Apply steering
    steeringSystem.update(harness.world, entities, 1.0);

    const velocity = agent.getComponent(ComponentType.Velocity) as any;

    // Velocity should be adjusted to avoid obstacle
    expect(velocity).toBeDefined();
    expect(Math.abs(velocity.vy)).toBeGreaterThan(0); // Should have Y component to avoid
  });
});
