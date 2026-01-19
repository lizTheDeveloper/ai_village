import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { MovementSystem } from '../MovementSystem.js';
import { SteeringSystem } from '../SteeringSystem.js';
import { AgentBrainSystem } from '../AgentBrainSystem.js';
import { createMovementComponent } from '../../components/MovementComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';
import { createSteeringComponent } from '../../components/SteeringComponent.js';
import { createVelocityComponent } from '../../components/VelocityComponent.js';
import { createInventoryComponent } from '../../components/InventoryComponent.js';
import { createVisionComponent } from '../../components/VisionComponent.js';
import { MemoryComponent } from '../../components/MemoryComponent.js';
import { createResourceComponent } from '../../components/ResourceComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Oscillation Detection Utilities
 *
 * Oscillation is detected when an agent moves back and forth without making progress.
 * This can happen due to:
 * 1. Conflicting velocity sources (AgentBrainSystem vs SteeringSystem)
 * 2. Rapid behavior switching
 * 3. Stuck between two targets
 */

interface PositionSample {
  tick: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

interface OscillationMetrics {
  /** Total distance traveled by summing frame-to-frame distances */
  totalDistanceTraveled: number;
  /** Net displacement (start to end) */
  netDisplacement: number;
  /** Ratio of net to total (1.0 = perfect efficiency, 0.0 = pure oscillation) */
  efficiencyRatio: number;
  /** Number of velocity sign reversals */
  directionReversals: number;
  /** Average position over time */
  averagePosition: { x: number; y: number };
  /** Position variance (high variance with low displacement = oscillation) */
  positionVariance: { x: number; y: number };
  /** Whether oscillation was detected */
  isOscillating: boolean;
}

/**
 * Track an agent's position over multiple ticks
 */
function trackPosition(
  harness: IntegrationTestHarness,
  agent: any,
  systems: { movement: MovementSystem; steering?: SteeringSystem; ai?: AgentBrainSystem },
  tickCount: number,
  deltaTime: number = 1 / 60
): PositionSample[] {
  const samples: PositionSample[] = [];
  const entities = Array.from(harness.world.entities.values());

  for (let tick = 0; tick < tickCount; tick++) {
    // Sample position before update
    const position = agent.getComponent(ComponentType.Position);
    const movement = agent.getComponent(ComponentType.Movement);

    samples.push({
      tick,
      x: position?.x ?? 0,
      y: position?.y ?? 0,
      velocityX: movement?.velocityX ?? 0,
      velocityY: movement?.velocityY ?? 0,
    });

    // Update systems in order
    if (systems.ai) {
      systems.ai.update(harness.world, entities, deltaTime);
    }
    if (systems.steering) {
      systems.steering.update(harness.world, entities, deltaTime);
    }
    systems.movement.update(harness.world, entities, deltaTime);
  }

  return samples;
}

/**
 * Analyze position samples to detect oscillation
 */
function analyzeOscillation(samples: PositionSample[]): OscillationMetrics {
  if (samples.length < 2) {
    return {
      totalDistanceTraveled: 0,
      netDisplacement: 0,
      efficiencyRatio: 1,
      directionReversals: 0,
      averagePosition: { x: 0, y: 0 },
      positionVariance: { x: 0, y: 0 },
      isOscillating: false,
    };
  }

  // Calculate total distance traveled
  let totalDistance = 0;
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  // Calculate net displacement
  const startX = samples[0].x;
  const startY = samples[0].y;
  const endX = samples[samples.length - 1].x;
  const endY = samples[samples.length - 1].y;
  const netDisplacement = Math.sqrt(
    Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
  );

  // Efficiency ratio (1.0 = straight line, 0.0 = no progress)
  const efficiencyRatio = totalDistance > 0.01 ? netDisplacement / totalDistance : 1;

  // Count direction reversals
  let directionReversals = 0;
  for (let i = 2; i < samples.length; i++) {
    const prevVx = samples[i - 1].velocityX;
    const prevVy = samples[i - 1].velocityY;
    const currVx = samples[i].velocityX;
    const currVy = samples[i].velocityY;

    // X direction reversal
    if (prevVx !== 0 && currVx !== 0 && Math.sign(prevVx) !== Math.sign(currVx)) {
      directionReversals++;
    }
    // Y direction reversal
    if (prevVy !== 0 && currVy !== 0 && Math.sign(prevVy) !== Math.sign(currVy)) {
      directionReversals++;
    }
  }

  // Calculate average position
  const sumX = samples.reduce((acc, s) => acc + s.x, 0);
  const sumY = samples.reduce((acc, s) => acc + s.y, 0);
  const avgX = sumX / samples.length;
  const avgY = sumY / samples.length;

  // Calculate position variance
  const varianceX = samples.reduce((acc, s) => acc + Math.pow(s.x - avgX, 2), 0) / samples.length;
  const varianceY = samples.reduce((acc, s) => acc + Math.pow(s.y - avgY, 2), 0) / samples.length;

  // Detect oscillation based on multiple criteria:
  // 1. Low efficiency (< 0.3) with movement happening
  // 2. High direction reversals (> 10% of samples)
  // 3. High variance but low displacement
  const reversalRate = directionReversals / samples.length;
  const variance = varianceX + varianceY;
  const hasMovement = totalDistance > 0.1;
  const lowEfficiency = efficiencyRatio < 0.3;
  const highReversals = reversalRate > 0.1;
  const highVarianceLowDisplacement = variance > 0.5 && netDisplacement < 2;

  const isOscillating = hasMovement && (
    lowEfficiency ||
    highReversals ||
    highVarianceLowDisplacement
  );

  return {
    totalDistanceTraveled: totalDistance,
    netDisplacement,
    efficiencyRatio,
    directionReversals,
    averagePosition: { x: avgX, y: avgY },
    positionVariance: { x: varianceX, y: varianceY },
    isOscillating,
  };
}

describe('Movement Oscillation Detection', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createMinimalWorld();
    harness.setupTestWorld({ includeTime: true });
  });

  describe('Oscillation Detection Algorithm', () => {
    it('should detect no oscillation for stationary agent', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createMovementComponent(0, 0, 1.0)); // Not moving
      // Note: createTestAgent already adds entity to world

      const movementSystem = new MovementSystem();

      // Manually track position without going through AgentBrainSystem
      const samples: PositionSample[] = [];
      const entities = Array.from(harness.world.entities.values());

      for (let tick = 0; tick < 100; tick++) {
        const position = agent.getComponent(ComponentType.Position);
        const movement = agent.getComponent(ComponentType.Movement) as any;

        samples.push({
          tick,
          x: position?.x ?? 0,
          y: position?.y ?? 0,
          velocityX: movement?.velocityX ?? 0,
          velocityY: movement?.velocityY ?? 0,
        });

        movementSystem.update(harness.world, entities, 1 / 60);
      }

      const metrics = analyzeOscillation(samples);

      expect(metrics.isOscillating).toBe(false);
      // Stationary agent should not oscillate (may have small drift)
      expect(metrics.directionReversals).toBe(0);
    });

    it('should detect no oscillation for agent moving in straight line', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createMovementComponent(1.0, 0, 1.0)); // Moving right steadily
      // Note: createTestAgent already adds entity to world

      const movementSystem = new MovementSystem();
      const samples: PositionSample[] = [];
      const entities = Array.from(harness.world.entities.values());

      for (let tick = 0; tick < 100; tick++) {
        const position = agent.getComponent(ComponentType.Position);
        const movement = agent.getComponent(ComponentType.Movement) as any;

        samples.push({
          tick,
          x: position?.x ?? 0,
          y: position?.y ?? 0,
          velocityX: movement?.velocityX ?? 0,
          velocityY: movement?.velocityY ?? 0,
        });

        movementSystem.update(harness.world, entities, 1 / 60);
      }

      const metrics = analyzeOscillation(samples);

      expect(metrics.isOscillating).toBe(false);
      expect(metrics.efficiencyRatio).toBeGreaterThan(0.9);
      expect(metrics.directionReversals).toBe(0);
    });

    it('should detect oscillation for agent with alternating velocity', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createMovementComponent(1.0, 0, 1.0));
      // Note: createTestAgent already adds entity to world

      const movementSystem = new MovementSystem();
      const samples: PositionSample[] = [];
      const entities = Array.from(harness.world.entities.values());

      // Simulate oscillating behavior by alternating velocity every 3 ticks
      for (let tick = 0; tick < 100; tick++) {
        const position = agent.getComponent(ComponentType.Position);
        const movement = agent.getComponent(ComponentType.Movement) as any;

        samples.push({
          tick,
          x: position?.x ?? 0,
          y: position?.y ?? 0,
          velocityX: movement?.velocityX ?? 0,
          velocityY: movement?.velocityY ?? 0,
        });

        // Alternate direction every 3 ticks for more obvious oscillation
        const direction = Math.floor(tick / 3) % 2 === 0 ? 1 : -1;
        agent.updateComponent('movement', (current: any) => ({
          ...current,
          velocityX: direction * 2.0, // Faster movement for more obvious oscillation
        }));

        movementSystem.update(harness.world, entities, 1 / 60);
      }

      const metrics = analyzeOscillation(samples);

      expect(metrics.isOscillating).toBe(true);
      expect(metrics.directionReversals).toBeGreaterThan(15);
      // With oscillation, efficiency should be low
      expect(metrics.efficiencyRatio).toBeLessThan(0.7);
    });
  });

  describe('Steering vs AgentBrainSystem Conflict Detection', () => {
    it('should not oscillate when MovementSystem syncs velocity to movement', () => {
      // Test that dual velocity systems (velocity component + movement component)
      // don't cause oscillation when properly synced
      const agent = harness.createTestAgent({ x: 10, y: 10 });

      agent.addComponent(createMovementComponent(0, 0, 1.0));
      agent.addComponent(createVelocityComponent(1.0, 0.5)); // SteeringSystem output
      // Note: createTestAgent already adds entity to world

      const steeringSystem = new SteeringSystem();
      const movementSystem = new MovementSystem();

      const samples: PositionSample[] = [];
      const entities = Array.from(harness.world.entities.values());

      // Add steering component with 'none' behavior (disabled)
      agent.addComponent(createSteeringComponent('none', 1.0, 2.0));

      for (let tick = 0; tick < 100; tick++) {
        const position = agent.getComponent(ComponentType.Position);
        const movement = agent.getComponent(ComponentType.Movement) as any;

        samples.push({
          tick,
          x: position?.x ?? 0,
          y: position?.y ?? 0,
          velocityX: movement?.velocityX ?? 0,
          velocityY: movement?.velocityY ?? 0,
        });

        // SteeringSystem runs first (priority), then MovementSystem
        steeringSystem.update(harness.world, entities, 1 / 60);
        movementSystem.update(harness.world, entities, 1 / 60);
      }

      const metrics = analyzeOscillation(samples);

      // Should move in a consistent direction without oscillation
      expect(metrics.isOscillating).toBe(false);
      expect(metrics.efficiencyRatio).toBeGreaterThan(0.8);
    });

    it('should detect oscillation if velocity is externally modified each tick', () => {
      // Simulates what happens if AgentBrainSystem and SteeringSystem both set velocity
      const agent = harness.createTestAgent({ x: 10, y: 10 });

      agent.addComponent(createMovementComponent(1.0, 0, 1.0));
      agent.addComponent(createVelocityComponent(-1.0, 0)); // Conflict!
      agent.addComponent(createSteeringComponent('seek', 1.0, 2.0));
      // Note: createTestAgent already adds entity to world

      const movementSystem = new MovementSystem();
      const samples: PositionSample[] = [];
      const entities = Array.from(harness.world.entities.values());

      for (let tick = 0; tick < 100; tick++) {
        const position = agent.getComponent(ComponentType.Position);
        const movement = agent.getComponent(ComponentType.Movement) as any;

        samples.push({
          tick,
          x: position?.x ?? 0,
          y: position?.y ?? 0,
          velocityX: movement?.velocityX ?? 0,
          velocityY: movement?.velocityY ?? 0,
        });

        // Simulate conflict: alternate between two velocity sources
        const aiVelocity = tick % 2 === 0 ? 1.0 : -1.0;
        agent.updateComponent('movement', (current: any) => ({
          ...current,
          velocityX: aiVelocity,
        }));

        // MovementSystem syncs velocity component to movement
        agent.updateComponent('velocity', (current: any) => ({
          ...current,
          vx: -aiVelocity, // Opposite direction
        }));

        movementSystem.update(harness.world, entities, 1 / 60);
      }

      const metrics = analyzeOscillation(samples);

      // This simulated conflict should cause oscillation
      expect(metrics.directionReversals).toBeGreaterThan(30);
    });
  });

  describe.skip('Regression: Steering Disable on Behavior Switch', () => {
    it('should disable steering when idleBehavior is called', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });

      agent.addComponent(createMovementComponent(1, 1, 1.0));
      // Use thinkOffset=20 so lastThinkTick=-20, making ticksSinceLastThink=20 at tick 0
      agent.addComponent(createAgentComponent('idle', 20, false, 20));
      agent.addComponent(createSteeringComponent('wander', 1.0, 2.0));
      agent.addComponent(createVelocityComponent(1, 1));
      agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    hungerDecayRate: 0.1,
    energyDecayRate: 0.1,
  })); // Required for AgentBrainSystem
      // Note: createTestAgent already adds entity to world

      const aiSystem = new AgentBrainSystem();

      // Call the behavior handler directly via AgentBrainSystem internal method
      // We use a trick: set the agent to idle and run AgentBrainSystem which will call idleBehavior
      const entities = Array.from(harness.world.entities.values());
      aiSystem.update(harness.world, entities, 1 / 60);

      // Check that steering was disabled by idleBehavior
      const steering = agent.getComponent(ComponentType.Steering) as any;
      expect(steering.behavior).toBe('none');

      // Check velocity is 0
      const movement = agent.getComponent(ComponentType.Movement) as any;
      expect(movement.velocityX).toBe(0);
      expect(movement.velocityY).toBe(0);
    });

    it('should disable steering when gatherBehavior is called', () => {
      // Create a resource entity nearby for the agent to target
      const resource = new EntityImpl(createEntityId(), 0);
      resource.addComponent(createPositionComponent(11, 10)); // Close to agent at (10, 10)
      resource.addComponent(createResourceComponent('wood', 100, 0)); // Harvestable wood
      harness.world.addEntity(resource);

      const agent = harness.createTestAgent({ x: 10, y: 10 });

      agent.addComponent(createMovementComponent(1, 1, 1.0));
      // Use thinkOffset=20 so lastThinkTick=-20, making ticksSinceLastThink=20 at tick 0
      agent.addComponent(createAgentComponent('gather', 20, false, 20));
      agent.addComponent(createSteeringComponent('wander', 1.0, 2.0));
      agent.addComponent(createVelocityComponent(1, 1));
      agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    hungerDecayRate: 0.1,
    energyDecayRate: 0.1,
  }));
      agent.addComponent(createInventoryComponent(10, 100));
      // Note: createTestAgent already adds entity to world

      const aiSystem = new AgentBrainSystem();
      const entities = Array.from(harness.world.entities.values());
      aiSystem.update(harness.world, entities, 1 / 60);

      // Check that steering was disabled by gatherBehavior
      const steering = agent.getComponent(ComponentType.Steering) as any;
      expect(steering.behavior).toBe('none');
    });

    it('should disable steering when followAgentBehavior is called', () => {
      // Create target agent
      const target = harness.createTestAgent({ x: 20, y: 20 });
      target.addComponent(createAgentComponent('wander', 20, false, 0));
      // Note: createTestAgent already adds entity to world

      const agent = harness.createTestAgent({ x: 10, y: 10 });
      agent.addComponent(createMovementComponent(1, 1, 1.0));
      // Use thinkOffset=20 so lastThinkTick=-20, making ticksSinceLastThink=20 at tick 0
      agent.addComponent(createAgentComponent('follow_agent', 20, false, 20));
      // Set the target ID in behaviorState
      agent.updateComponent('agent', (current: any) => ({
        ...current,
        behaviorState: { targetId: target.id },
      }));
      agent.addComponent(createSteeringComponent('seek', 1.0, 2.0));
      agent.addComponent(createVelocityComponent(1, 1));
      agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    hungerDecayRate: 0.1,
    energyDecayRate: 0.1,
  }));
      // Note: createTestAgent already adds entity to world

      const aiSystem = new AgentBrainSystem();
      const entities = Array.from(harness.world.entities.values());
      aiSystem.update(harness.world, entities, 1 / 60);

      // Check that steering was disabled
      const steering = agent.getComponent(ComponentType.Steering) as any;
      expect(steering.behavior).toBe('none');
    });

    it('should disable steering when talkBehavior is called', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });

      agent.addComponent(createMovementComponent(1, 1, 1.0));
      // Use thinkOffset=20 so lastThinkTick=-20, making ticksSinceLastThink=20 at tick 0
      agent.addComponent(createAgentComponent('talk', 20, false, 20));
      agent.addComponent(createSteeringComponent('seek', 1.0, 2.0));
      agent.addComponent(createVelocityComponent(1, 1));
      agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    hungerDecayRate: 0.1,
    energyDecayRate: 0.1,
  }));
      agent.addComponent({
        type: ComponentType.Conversation,
        version: 1,
        isActive: true,
        partnerId: 'test-partner',
        messages: [],
        lastMessageAt: 0,
      });
      // Note: createTestAgent already adds entity to world

      const aiSystem = new AgentBrainSystem();
      const entities = Array.from(harness.world.entities.values());
      aiSystem.update(harness.world, entities, 1 / 60);

      // Check that steering was disabled
      const steering = agent.getComponent(ComponentType.Steering) as any;
      expect(steering.behavior).toBe('none');
    });

    it('should disable steering when seekSleepBehavior is called', () => {
      const agent = harness.createTestAgent({ x: 10, y: 10 });

      agent.addComponent(createMovementComponent(1, 1, 1.0));
      // Use thinkOffset=20 so lastThinkTick=-20, making ticksSinceLastThink=20 at tick 0
      agent.addComponent(createAgentComponent('seek_sleep', 20, false, 20));
      agent.addComponent(createSteeringComponent('wander', 1.0, 2.0));
      agent.addComponent(createVelocityComponent(1, 1));
      agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    hungerDecayRate: 0.1,
    energyDecayRate: 0.1,
  }));
      agent.addComponent(createCircadianComponent());
      // Note: createTestAgent already adds entity to world

      const aiSystem = new AgentBrainSystem();
      const entities = Array.from(harness.world.entities.values());
      aiSystem.update(harness.world, entities, 1 / 60);

      // Check that steering was disabled
      const steering = agent.getComponent(ComponentType.Steering) as any;
      expect(steering.behavior).toBe('none');
    });
  });

  describe('Extended Duration Tests', () => {
    it('should not develop oscillation over 1000 ticks with full agent', () => {
      const agent = harness.createTestAgent({ x: 0, y: 0 });

      // Full agent setup matching AgentEntity.ts
      agent.addComponent(createMovementComponent(0, 0, 2.0));
      agent.addComponent(createAgentComponent('rest', 20, false, 0));
      agent.addComponent(createSteeringComponent('none', 2.0, 4.0));
      agent.addComponent(createVelocityComponent(0, 0));
      agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 0.8,
    health: 1.0,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  }));
      agent.addComponent(createCircadianComponent());
      agent.addComponent(createInventoryComponent(24, 100));
      agent.addComponent(createVisionComponent(10, 360, true, true));
      agent.addComponent(new MemoryComponent(agent.id));
      // Note: createTestAgent already adds entity to world

      const aiSystem = new AgentBrainSystem();
      const steeringSystem = new SteeringSystem();
      const movementSystem = new MovementSystem();

      // Run for 1000 ticks
      const samples = trackPosition(
        harness,
        agent,
        { movement: movementSystem, steering: steeringSystem, ai: aiSystem },
        1000
      );

      const metrics = analyzeOscillation(samples);

      // Should NOT be oscillating
      expect(metrics.isOscillating).toBe(false);
    });
  });
});
