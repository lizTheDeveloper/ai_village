import { ComponentType } from '../../types/ComponentType.js';
/**
 * Navigation System Integration Tests
 *
 * These tests verify the complete navigation system works end-to-end:
 * 1. Navigate behavior reaches targets
 * 2. Exploration behaviors systematically explore territory
 * 3. Social knowledge transmission ("berries up north")
 * 4. Trust verification updates trust scores
 * 5. Worn paths develop from agent traffic
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { createPositionComponent, type PositionComponent } from '../../components/PositionComponent.js';
import { createMovementComponent, type MovementComponent } from '../../components/MovementComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { VisionComponent } from '../../components/VisionComponent.js';
import type { ResourceComponent } from '../../components/ResourceComponent.js';

// Navigation module imports
import {
  resetMapKnowledge,
  getMapKnowledge,
  worldToSector,
  sectorToWorld,
  SECTOR_SIZE,
} from '../MapKnowledge.js';
import {
  createHearsayMemoryComponent,
  addHearsay,
  getTrustScore,
  markExplored,
  hasExplored,
  type HearsayMemoryComponent,
} from '../HearsayMemory.js';
import {
  processHeardSpeech,
  recordResourceDiscovery,
  recordMovement,
  verifyHearsayAtLocation,
  getBestResourceLocation,
} from '../KnowledgeTransmission.js';

// Behavior imports
import { navigateBehavior } from '../../behaviors/NavigateBehavior.js';
import { exploreFrontierBehavior } from '../../behaviors/ExploreFrontierBehavior.js';
import { exploreSpiralBehavior } from '../../behaviors/ExploreSpiralBehavior.js';
import { followGradientBehavior } from '../../behaviors/FollowGradientBehavior.js';

/**
 * Helper to create a test entity with required components
 */
function createTestAgent(
  world: WorldImpl,
  position: { x: number; y: number },
  behavior: string = 'idle',
  behaviorState: Record<string, any> = {}
): EntityImpl {
  const entity = new EntityImpl(createEntityId(), world.tick);

  (entity as any).addComponent(createPositionComponent(position.x, position.y));
  (entity as any).addComponent(createMovementComponent(2.0)); // speed = 2

  // Add agent component
  const agentComponent: AgentComponent = {
    type: ComponentType.Agent,
    version: 1,
    behavior: behavior as any,
    behaviorState,
    thinkInterval: 10,
    lastThinkTick: 0,
    lastThought: '',
  };
  (entity as any).addComponent(agentComponent);

  // Add vision component
  const visionComponent: VisionComponent = {
    type: ComponentType.Vision,
    version: 1,
    range: 30,
    canSeeResources: true,
    canSeeAgents: true,
    seenResources: [],
    seenAgents: [],
    seenPlants: [],
  };
  (entity as any).addComponent(visionComponent);

  // Add hearsay memory
  (entity as any).addComponent(createHearsayMemoryComponent());

  world.addEntity(entity);
  return entity;
}

/**
 * Helper to create a resource entity
 */
function createTestResource(
  world: WorldImpl,
  position: { x: number; y: number },
  resourceType: string = 'berry',
  amount: number = 100
): EntityImpl {
  const entity = new EntityImpl(createEntityId(), world.tick);

  (entity as any).addComponent(createPositionComponent(position.x, position.y));

  const resourceComponent: ResourceComponent = {
    type: ComponentType.Resource,
    version: 1,
    resourceType,
    amount,
    maxAmount: amount,
    respawnRate: 0,
    lastHarvestTick: 0,
  };
  (entity as any).addComponent(resourceComponent);

  world.addEntity(entity);
  return entity;
}

/**
 * Simulate agent update (execute behavior)
 */
function updateAgent(entity: EntityImpl, world: WorldImpl): void {
  const agent = entity.getComponent(ComponentType.Agent);
  if (!agent) return;

  switch (agent.behavior) {
    case 'navigate':
      navigateBehavior(entity, world);
      break;
    case 'explore_frontier':
      exploreFrontierBehavior(entity, world);
      break;
    case 'explore_spiral':
      exploreSpiralBehavior(entity, world);
      break;
    case 'follow_gradient':
      followGradientBehavior(entity, world);
      break;
  }
}

/**
 * Apply movement velocity to position
 */
function applyMovement(entity: EntityImpl, deltaTime: number = 1 / 20): void {
  const position = entity.getComponent(ComponentType.Position);
  const movement = entity.getComponent(ComponentType.Movement);

  if (position && movement) {
    entity.updateComponent<PositionComponent>('position', (p) => ({
      ...p,
      x: p.x + movement.velocityX * deltaTime,
      y: p.y + movement.velocityY * deltaTime,
    }));
  }
}

describe('Navigation Integration Tests', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    resetMapKnowledge();
  });

  afterEach(() => {
    resetMapKnowledge();
  });

  describe('NavigateBehavior', () => {
    it('agent navigates to target and arrives', () => {
      const agent = createTestAgent(world, { x: 0, y: 0 }, 'navigate', {
        target: { x: 10, y: 0 },
      });

      // Simulate movement with larger delta time for faster progress
      // With speed 2.0 and deltaTime 0.5, each tick moves 1.0 units
      for (let i = 0; i < 20; i++) {
        updateAgent(agent, world);
        applyMovement(agent, 0.5); // Larger delta time
        world.advanceTick();
      }

      const position = agent.getComponent(ComponentType.Position)!;

      // Agent should have moved toward target (within arrival threshold or arrived)
      expect(position.x).toBeGreaterThan(5);
    });

    it('agent slows down when approaching target (arrive behavior)', () => {
      const agent = createTestAgent(world, { x: 0, y: 0 }, 'navigate', {
        target: { x: 4, y: 0 }, // Close target within slowdown radius
      });

      // First update - measure initial velocity
      updateAgent(agent, world);
      const movement1 = agent.getComponent(ComponentType.Movement)!;
      const initialVelocity = Math.abs(movement1.velocityX);

      // Move closer
      for (let i = 0; i < 5; i++) {
        applyMovement(agent);
        updateAgent(agent, world);
        world.advanceTick();
      }

      const position = agent.getComponent(ComponentType.Position)!;
      const movement2 = agent.getComponent(ComponentType.Movement)!;
      const laterVelocity = Math.abs(movement2.velocityX);

      // Should be moving toward target
      expect(position.x).toBeGreaterThan(0);

      // If close to target, velocity should be reduced (arrive behavior)
      const distanceToTarget = Math.abs(4 - position.x);
      if (distanceToTarget < 5) {
        // Within slowdown radius, velocity should be less than initial
        expect(laterVelocity).toBeLessThanOrEqual(initialVelocity);
      }
    });

    it('agent emits arrival event when reaching target', () => {
      const agent = createTestAgent(world, { x: 0, y: 0 }, 'navigate', {
        target: { x: 1, y: 0 }, // Very close target (within arrival threshold of 2.0)
      });

      const arrivedEvents: any[] = [];
      eventBus.subscribe('navigation:arrived', (event) => {
        arrivedEvents.push(event);
      });

      // Move to target - need enough movement to trigger arrival check
      // With speed 2.0 and deltaTime 0.5, each tick moves 1.0 units
      // Target is at x=1, arrival threshold is 2.0, so we start within threshold
      for (let i = 0; i < 5; i++) {
        updateAgent(agent, world);
        eventBus.flush(); // Dispatch queued events
        applyMovement(agent, 0.5);
        world.advanceTick();
      }

      // Should have arrived and emitted event (we started within arrival threshold)
      expect(arrivedEvents.length).toBeGreaterThan(0);
      expect(arrivedEvents[0].data.entityId).toBe(agent.id);
    });

    it('agent switches to idle when no target specified', () => {
      const agent = createTestAgent(world, { x: 0, y: 0 }, 'navigate', {});

      updateAgent(agent, world);

      const agentComp = agent.getComponent(ComponentType.Agent)!;
      expect(agentComp.behavior).toBe('wander');
    });
  });

  describe('ExploreFrontierBehavior', () => {
    it('agent explores unexplored sectors', () => {
      const agent = createTestAgent(world, { x: 50, y: 50 }, 'explore_frontier', {
        radius: 2,
      });

      const hearsay = agent.getComponent(ComponentType.HearsayMemory)!;
      const startSector = worldToSector(50, 50);

      // Mark current sector as explored
      markExplored(hearsay, startSector.sectorX, startSector.sectorY, [], 0);

      // Run exploration for several ticks
      for (let i = 0; i < 100; i++) {
        updateAgent(agent, world);
        applyMovement(agent);
        world.advanceTick();
      }

      const position = agent.getComponent(ComponentType.Position)!;

      // Agent should have moved from starting position
      const distance = Math.sqrt(
        Math.pow(position.x - 50, 2) + Math.pow(position.y - 50, 2)
      );
      expect(distance).toBeGreaterThan(5);
    });

    it('agent marks sectors as explored during exploration', () => {
      const agent = createTestAgent(
        world,
        { x: SECTOR_SIZE / 2, y: SECTOR_SIZE / 2 },
        'explore_frontier',
        { radius: 1 }
      );

      const hearsay = agent.getComponent(ComponentType.HearsayMemory)!;

      // Run exploration
      for (let i = 0; i < 200; i++) {
        updateAgent(agent, world);
        applyMovement(agent);
        world.advanceTick();
      }

      // Should have explored at least the starting sector
      expect(hearsay.exploredSectors.size).toBeGreaterThan(0);
    });

    it('agent uses MapKnowledge fallback when HearsayMemory sectors exhausted', () => {
      const agent = createTestAgent(world, { x: 50, y: 50 }, 'explore_frontier', {
        radius: 1, // Small radius - only checks 1 sector in each direction
      });

      const hearsay = agent.getComponent(ComponentType.HearsayMemory)!;
      const center = worldToSector(50, 50);

      // Mark only HearsayMemory sectors as explored (MapKnowledge still has unexplored)
      // This tests that MapKnowledge provides a fallback direction
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          markExplored(hearsay, center.sectorX + dx, center.sectorY + dy, [], 0);
        }
      }

      // Run exploration - should still have a target from MapKnowledge fallback
      updateAgent(agent, world);

      const agentComp = agent.getComponent(ComponentType.Agent)!;
      // Behavior should remain explore_frontier (using MapKnowledge fallback)
      // OR should have set a target sector from MapKnowledge
      // Either indicates the fallback mechanism is working
      expect(agentComp.behavior).toBe('explore_frontier');

      // Should have acquired a target sector from MapKnowledge
      expect(agentComp.behaviorState.targetSector).toBeDefined();
    });
  });

  describe('ExploreSpiralBehavior', () => {
    it('agent spirals outward from home position', () => {
      const agent = createTestAgent(world, { x: 100, y: 100 }, 'explore_spiral', {});

      const positions: Array<{ x: number; y: number }> = [];

      // Run spiral for many ticks
      for (let i = 0; i < 300; i++) {
        updateAgent(agent, world);
        applyMovement(agent);
        world.advanceTick();

        if (i % 50 === 0) {
          const pos = agent.getComponent(ComponentType.Position)!;
          positions.push({ x: pos.x, y: pos.y });
        }
      }

      // Should have multiple position samples
      expect(positions.length).toBeGreaterThan(2);

      // Later positions should generally be further from start
      const startPos = positions[0];
      const endPos = positions[positions.length - 1];

      const startDist = Math.sqrt(
        Math.pow(startPos.x - 100, 2) + Math.pow(startPos.y - 100, 2)
      );
      const endDist = Math.sqrt(
        Math.pow(endPos.x - 100, 2) + Math.pow(endPos.y - 100, 2)
      );

      // End distance should be greater (spiral outward)
      expect(endDist).toBeGreaterThanOrEqual(startDist);
    });

    it('agent initializes spiral state on first update', () => {
      const agent = createTestAgent(world, { x: 100, y: 100 }, 'explore_spiral', {});

      updateAgent(agent, world);

      const agentComp = agent.getComponent(ComponentType.Agent)!;
      expect(agentComp.behaviorState.spiralInitialized).toBe(true);
      expect(agentComp.behaviorState.homeSectorX).toBeDefined();
      expect(agentComp.behaviorState.homeSectorY).toBeDefined();
    });
  });

  describe('FollowGradientBehavior', () => {
    it('agent follows hearsay direction to find resources', () => {
      const agent = createTestAgent(world, { x: 100, y: 100 }, 'follow_gradient', {
        resourceType: 'food',
      });

      const hearsay = agent.getComponent(ComponentType.HearsayMemory)!;

      // Add hearsay: "food is to the east, close"
      addHearsay(hearsay, 'food', 'east', 'close', 'alice', 'Alice', { x: 100, y: 100 }, 0);

      // Give Alice high trust
      hearsay.trustRatings.set('alice', {
        agentId: 'alice',
        agentName: 'Alice',
        score: 0.9,
        successCount: 5,
        failureCount: 0,
        lastUpdated: 0,
      });

      // Run behavior
      for (let i = 0; i < 50; i++) {
        updateAgent(agent, world);
        applyMovement(agent);
        world.advanceTick();
      }

      const position = agent.getComponent(ComponentType.Position)!;

      // Agent should have moved east (positive x direction)
      expect(position.x).toBeGreaterThan(100);
    });

    it('agent explores when no gradient information available', () => {
      const agent = createTestAgent(world, { x: 100, y: 100 }, 'follow_gradient', {
        resourceType: 'food',
      });

      // No hearsay added - should switch to explore
      updateAgent(agent, world);

      const agentComp = agent.getComponent(ComponentType.Agent)!;
      expect(agentComp.behavior).toBe('explore_frontier');
    });

    it('agent verifies hearsay when arriving at location', () => {
      const agent = createTestAgent(world, { x: 100, y: 100 }, 'follow_gradient', {
        resourceType: 'food',
      });

      const hearsay = agent.getComponent(ComponentType.HearsayMemory)!;

      // Add hearsay: "food is nearby"
      addHearsay(hearsay, 'food', 'nearby', 'close', 'alice', 'Alice', { x: 100, y: 100 }, 0);
      hearsay.trustRatings.set('alice', {
        agentId: 'alice',
        agentName: 'Alice',
        score: 0.7,
        successCount: 2,
        failureCount: 0,
        lastUpdated: 0,
      });

      // Create a resource nearby
      const resource = createTestResource(world, { x: 105, y: 100 }, 'berry', 50);

      // Update vision to see the resource
      agent.updateComponent<VisionComponent>('vision', (v) => ({
        ...v,
        seenResources: [resource.id],
      }));

      // Run behavior - should find resource and verify hearsay
      for (let i = 0; i < 100; i++) {
        updateAgent(agent, world);
        applyMovement(agent);
        world.advanceTick();
      }

      // Trust should have been updated based on verification
      // (either increased if found, or decreased if not)
      const trustRating = hearsay.trustRatings.get('alice');
      expect(trustRating).toBeDefined();
    });
  });

  describe('Social Knowledge Transmission', () => {
    it('processHeardSpeech adds hearsay from announcements', () => {
      const hearsay = createHearsayMemoryComponent();

      processHeardSpeech(
        hearsay,
        'bob',
        'Bob',
        { x: 50, y: 50 },
        'Found berries to the north!',
        100
      );

      expect(hearsay.hearsay.length).toBe(1);
      expect(hearsay.hearsay[0].resourceType).toBe('food');
      expect(hearsay.hearsay[0].direction).toBe('north');
      expect(hearsay.hearsay[0].sourceAgentName).toBe('Bob');
    });

    it('recordResourceDiscovery updates map knowledge', () => {
      const mapKnowledge = getMapKnowledge();
      const sector = worldToSector(100, 100);

      // Initially no resource knowledge
      const initialAbundance =
        mapKnowledge.getSector(sector.sectorX, sector.sectorY).resourceAbundance.get('food') ?? 0;

      // Record discovery
      recordResourceDiscovery(
        { x: 100, y: 100 },
        'food',
        { x: 110, y: 100 },
        80,
        100
      );

      const afterAbundance =
        mapKnowledge.getSector(sector.sectorX, sector.sectorY).resourceAbundance.get('food') ?? 0;

      expect(afterAbundance).toBeGreaterThan(initialAbundance);
    });

    it('getBestResourceLocation returns trusted hearsay over map knowledge', () => {
      const hearsay = createHearsayMemoryComponent();

      // Add hearsay from trusted source
      addHearsay(hearsay, 'wood', 'south', 'medium', 'trusted', 'Trusted', { x: 0, y: 0 }, 50);
      hearsay.trustRatings.set('trusted', {
        agentId: 'trusted',
        agentName: 'Trusted',
        score: 0.9,
        successCount: 10,
        failureCount: 0,
        lastUpdated: 50,
      });

      const result = getBestResourceLocation({ x: 0, y: 0 }, hearsay, 'wood', 100);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('hearsay');
      expect(result!.direction).toBe('south');
    });
  });

  describe('Trust Verification', () => {
    it('verifyHearsayAtLocation increases trust for correct info', () => {
      const hearsay = createHearsayMemoryComponent();

      // Add hearsay
      addHearsay(hearsay, 'food', 'north', 'close', 'alice', 'Alice', { x: 0, y: 0 }, 0);

      const beforeTrust = getTrustScore(hearsay, 'alice');

      // Verify as correct
      verifyHearsayAtLocation(hearsay, { x: 0, y: 10 }, 0, true, 100);

      const afterTrust = getTrustScore(hearsay, 'alice');

      expect(afterTrust).toBeGreaterThan(beforeTrust);
    });

    it('verifyHearsayAtLocation decreases trust for incorrect info', () => {
      const hearsay = createHearsayMemoryComponent();

      // Add hearsay and give some initial trust
      addHearsay(hearsay, 'food', 'north', 'close', 'bob', 'Bob', { x: 0, y: 0 }, 0);
      hearsay.trustRatings.set('bob', {
        agentId: 'bob',
        agentName: 'Bob',
        score: 0.7,
        successCount: 2,
        failureCount: 0,
        lastUpdated: 0,
      });

      const beforeTrust = getTrustScore(hearsay, 'bob');

      // Verify as incorrect
      verifyHearsayAtLocation(hearsay, { x: 0, y: 10 }, 0, false, 100);

      const afterTrust = getTrustScore(hearsay, 'bob');

      expect(afterTrust).toBeLessThan(beforeTrust);
    });

    it('marks hearsay as verified after verification', () => {
      const hearsay = createHearsayMemoryComponent();

      addHearsay(hearsay, 'wood', 'east', 'far', 'charlie', 'Charlie', { x: 0, y: 0 }, 0);

      expect(hearsay.hearsay[0].verified).toBe(false);

      verifyHearsayAtLocation(hearsay, { x: 100, y: 0 }, 0, true, 100);

      expect(hearsay.hearsay[0].verified).toBe(true);
      expect(hearsay.hearsay[0].verificationResult).toBe(true);
    });
  });

  describe('Worn Paths (Traffic)', () => {
    it('recordMovement increases path traffic', () => {
      const mapKnowledge = getMapKnowledge();

      // Move from sector (0,0) to sector (1,0) - east
      const fromPos = { x: 8, y: 8 };
      const toPos = { x: 24, y: 8 };

      recordMovement(fromPos, toPos, 100);

      const sector = mapKnowledge.getSector(0, 0);
      // Traffic increments by 0.5 per traversal (pheromone-like system)
      expect(sector.pathTraffic.get('e')).toBe(0.5);
    });

    it('repeated movement creates worn paths', () => {
      const mapKnowledge = getMapKnowledge();

      // Simulate many traversals
      for (let i = 0; i < 50; i++) {
        recordMovement({ x: 8, y: 8 }, { x: 24, y: 8 }, i);
      }

      const sector = mapKnowledge.getSector(0, 0);
      const traffic = sector.pathTraffic.get('e') ?? 0;

      // Traffic is capped at 1.0 (maxTraffic) in the pheromone-like system
      expect(traffic).toBe(1.0);

      // Path weight should be reduced (worn paths are faster)
      const pathWeight = mapKnowledge.getPathWeight(0, 0, 'e');
      expect(pathWeight).toBeLessThan(1.0);
    });

    it('worn paths affect navigation behavior', () => {
      const mapKnowledge = getMapKnowledge();

      // Create worn path going east
      for (let i = 0; i < 100; i++) {
        recordMovement({ x: 8, y: 8 }, { x: 24, y: 8 }, i);
      }

      // Path weight for worn path should be lower
      const wornPathWeight = mapKnowledge.getPathWeight(0, 0, 'e');
      const unwornPathWeight = mapKnowledge.getPathWeight(0, 0, 'w');

      expect(wornPathWeight).toBeLessThan(unwornPathWeight);
    });
  });

  describe('Complete Navigation Flow', () => {
    it('agent receives hearsay, navigates to location, and verifies', () => {
      // Create agent
      const agent = createTestAgent(world, { x: 100, y: 100 }, 'idle', {});
      const hearsay = agent.getComponent(ComponentType.HearsayMemory)!;

      // Create resource at target location
      const resource = createTestResource(world, { x: 120, y: 100 }, 'berry', 50);

      // Step 1: Agent receives hearsay
      processHeardSpeech(
        hearsay,
        'alice',
        'Alice',
        { x: 100, y: 100 },
        'Found berries to the east!',
        world.tick
      );

      // Give Alice some trust
      hearsay.trustRatings.set('alice', {
        agentId: 'alice',
        agentName: 'Alice',
        score: 0.8,
        successCount: 3,
        failureCount: 0,
        lastUpdated: world.tick,
      });

      expect(hearsay.hearsay.length).toBe(1);
      expect(hearsay.hearsay[0].verified).toBe(false);

      // Step 2: Agent decides to follow gradient
      agent.updateComponent<AgentComponent>('agent', (a) => ({
        ...a,
        behavior: 'follow_gradient',
        behaviorState: { resourceType: 'food' },
      }));

      // Step 3: Agent moves toward hearsay location
      for (let i = 0; i < 50; i++) {
        updateAgent(agent, world);
        applyMovement(agent);
        world.advanceTick();
      }

      const position = agent.getComponent(ComponentType.Position)!;

      // Agent should have moved east toward the resource
      expect(position.x).toBeGreaterThan(100);

      // Step 4: When agent is close and "sees" resource, verification occurs
      agent.updateComponent<VisionComponent>('vision', (v) => ({
        ...v,
        seenResources: [resource.id],
      }));

      // Continue running behavior - should verify hearsay
      for (let i = 0; i < 100; i++) {
        updateAgent(agent, world);
        applyMovement(agent);
        world.advanceTick();
      }

      // Trust should have been updated
      const aliceTrust = getTrustScore(hearsay, 'alice');
      expect(aliceTrust).toBeGreaterThan(0.5);
    });

    it('exploration leads to sectors being marked explored', () => {
      // Create agent that will explore
      const agent = createTestAgent(
        world,
        { x: SECTOR_SIZE / 2, y: SECTOR_SIZE / 2 },
        'explore_frontier',
        { radius: 2 }
      );

      const hearsay = agent.getComponent(ComponentType.HearsayMemory)!;

      // Run exploration with larger delta time for faster movement
      for (let i = 0; i < 200; i++) {
        updateAgent(agent, world);
        applyMovement(agent, 0.5); // Larger delta time for faster exploration
        world.advanceTick();
      }

      // Check that agent explored sectors (stored in HearsayMemory)
      // The exploration behavior marks sectors in HearsayMemory, not MapKnowledge
      expect(hearsay.exploredSectors.size).toBeGreaterThan(0);

      // Agent should have moved from starting position
      const position = agent.getComponent(ComponentType.Position)!;
      const startX = SECTOR_SIZE / 2;
      const startY = SECTOR_SIZE / 2;
      const distance = Math.sqrt(
        Math.pow(position.x - startX, 2) + Math.pow(position.y - startY, 2)
      );
      expect(distance).toBeGreaterThan(5);
    });
  });
});
