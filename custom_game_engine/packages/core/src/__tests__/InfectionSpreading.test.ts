/**
 * Test infection spreading logic in BodySystem
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl, type World } from '../ecs/World.js';
import { BodySystem } from '../systems/BodySystem.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { createBodyComponentFromPlan } from '../components/BodyPlanRegistry.js';
import type { BodyComponent } from '../components/BodyComponent.js';

describe('BodySystem - Infection Spreading', () => {
  let world: World;
  let bodySystem: BodySystem;

  beforeEach(() => {
    world = new World();
    bodySystem = new BodySystem();
  });

  it('should initialize infection severity when infection starts', () => {
    const entity = world.createEntity();
    const body = createBodyComponentFromPlan('humanoid_standard');

    // Infect the left arm
    const leftArm = body.parts['left_arm'];
    leftArm.infected = true;

    entity.addComponent(body);
    world.registerSystem(bodySystem);

    // Run one update
    world.tick = 0;
    bodySystem.update(world);

    // Infection severity should be initialized
    expect(leftArm.infectionSeverity).toBeDefined();
    expect(leftArm.infectionSeverity).toBeGreaterThan(0);
  });

  it('should increase infection severity over time when untreated', () => {
    const entity = world.createEntity();
    const body = createBodyComponentFromPlan('humanoid_standard');

    // Infect the left arm
    const leftArm = body.parts['left_arm'];
    leftArm.infected = true;
    leftArm.infectionSeverity = 0.1;

    entity.addComponent(body);
    world.registerSystem(bodySystem);

    // Run multiple updates with large deltaTime
    world.tick = 0;
    const initialSeverity = leftArm.infectionSeverity;

    for (let i = 0; i < 10; i++) {
      world.tick += 100;
      bodySystem.update(world);
    }

    // Infection severity should have increased
    expect(leftArm.infectionSeverity).toBeGreaterThan(initialSeverity);
    expect(leftArm.infectionSeverity).toBeLessThanOrEqual(1.0);
  });

  it('should slow infection progression when bandaged', () => {
    const entity = world.createEntity();
    const body = createBodyComponentFromPlan('humanoid_standard');

    // Two infected arms - one bandaged, one not
    const leftArm = body.parts['left_arm'];
    const rightArm = body.parts['right_arm'];

    leftArm.infected = true;
    leftArm.infectionSeverity = 0.1;
    leftArm.bandaged = false;

    rightArm.infected = true;
    rightArm.infectionSeverity = 0.1;
    rightArm.bandaged = true;

    entity.addComponent(body);
    world.registerSystem(bodySystem);

    // Run multiple updates
    world.tick = 0;
    for (let i = 0; i < 20; i++) {
      world.tick += 100;
      bodySystem.update(world);
    }

    // Unbandaged arm should have worse infection
    expect(leftArm.infectionSeverity).toBeGreaterThan(rightArm.infectionSeverity!);
  });

  it('should identify adjacent body parts correctly', () => {
    const entity = world.createEntity();
    const body = createBodyComponentFromPlan('humanoid_standard');
    entity.addComponent(body);
    world.registerSystem(bodySystem);

    // Use reflection to access private method for testing
    const getAdjacentBodyParts = (bodySystem as any).getAdjacentBodyParts.bind(bodySystem);

    // Test torso adjacency - should connect to head, arms, legs
    const torsoAdjacent = getAdjacentBodyParts('torso', body);
    expect(torsoAdjacent).toContain('head');
    expect(torsoAdjacent.some((id: string) => id.includes('arm'))).toBe(true);
    expect(torsoAdjacent.some((id: string) => id.includes('leg'))).toBe(true);

    // Test arm-to-hand parent-child relationship
    const leftArmAdjacent = getAdjacentBodyParts('left_arm', body);
    expect(leftArmAdjacent).toContain('left_arm_hand'); // Child
    expect(leftArmAdjacent).toContain('torso'); // Parent (via type-based adjacency)
  });

  it('should spread infection to adjacent parts with probability', () => {
    const entity = world.createEntity();
    const body = createBodyComponentFromPlan('humanoid_standard');

    // Infect the left arm with high severity
    const leftArm = body.parts['left_arm'];
    leftArm.infected = true;
    leftArm.infectionSeverity = 0.9; // High severity = higher spread chance

    entity.addComponent(body);
    world.registerSystem(bodySystem);

    // Run many updates to eventually trigger spreading
    world.tick = 0;
    let spreadOccurred = false;

    for (let i = 0; i < 1000; i++) {
      world.tick += 100;
      bodySystem.update(world);

      // Check if infection spread to adjacent parts
      const hand = body.parts['left_arm_hand'];
      const torso = body.parts['torso'];

      if (hand?.infected || torso?.infected) {
        spreadOccurred = true;
        break;
      }
    }

    // With high severity and many iterations, spread should eventually occur
    // Note: This is probabilistic, so we can't guarantee it happens every time
    // but with 1000 iterations and high severity, it's very likely
    expect(spreadOccurred).toBe(true);
  });

  it('should not spread infection from non-infected parts', () => {
    const entity = world.createEntity();
    const body = createBodyComponentFromPlan('humanoid_standard');

    // No infections
    entity.addComponent(body);
    world.registerSystem(bodySystem);

    // Run multiple updates
    world.tick = 0;
    for (let i = 0; i < 100; i++) {
      world.tick += 100;
      bodySystem.update(world);
    }

    // No part should be infected
    for (const part of Object.values(body.parts)) {
      expect(part.infected).toBe(false);
    }
  });

  it('should handle insectoid body plan with different part types', () => {
    const entity = world.createEntity();
    const body = createBodyComponentFromPlan('insectoid_4arm');

    // Infect the thorax
    const thorax = body.parts['thorax'];
    thorax.infected = true;
    thorax.infectionSeverity = 0.1;

    entity.addComponent(body);
    world.registerSystem(bodySystem);

    // Use reflection to access private method
    const getAdjacentBodyParts = (bodySystem as any).getAdjacentBodyParts.bind(bodySystem);

    // Thorax should connect to head, arms, legs, abdomen
    const thoraxAdjacent = getAdjacentBodyParts('thorax', body);
    expect(thoraxAdjacent).toContain('head');
    expect(thoraxAdjacent).toContain('abdomen');
    expect(thoraxAdjacent.some((id: string) => id.includes('arm'))).toBe(true);
  });
});
