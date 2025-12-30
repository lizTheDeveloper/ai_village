import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';
/**
 * Tests for Targeting Module - Phase 2 of AISystem Decomposition
 *
 * Tests perception-limited targeting for resources, plants, buildings, agents, and threats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { VisionComponent } from '../../components/VisionComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { SpatialMemoryComponent, addSpatialMemory } from '../../components/SpatialMemoryComponent.js';

import { ResourceTargeting, findNearestResource, findResourceTarget } from '../ResourceTargeting.js';
import { PlantTargeting, findNearestPlant, findNearestEdiblePlant } from '../PlantTargeting.js';
import { BuildingTargeting, findNearestBuilding, findNearestStorageBuilding } from '../BuildingTargeting.js';
import { AgentTargeting, findNearestAgent, findConversationPartner } from '../AgentTargeting.js';
import { ThreatTargeting, assessThreats, findNearestThreat } from '../ThreatTargeting.js';

describe('Targeting Module', () => {
  let world: WorldImpl;

  beforeEach(() => {
    world = new WorldImpl();
  });

  /**
   * Helper to create a test entity with components
   */
  function createEntity(
    components: Record<string, any>
  ): EntityImpl {
    const entity = world.createEntity() as EntityImpl;
    for (const [type, data] of Object.entries(components)) {
      entity.addComponent({ type, ...data });
    }
    return entity;
  }

  /**
   * Helper to create an agent with vision
   */
  function createAgentWithVision(
    position: { x: number; y: number },
    seenEntities: { agents?: string[]; resources?: string[]; plants?: string[] } = {}
  ): EntityImpl {
    const agent = createEntity({
      position: { x: position.x, y: position.y },
      vision: {
        range: 15,
        fieldOfView: 360,
        canSeeAgents: true,
        canSeeResources: true,
        seenAgents: seenEntities.agents || [],
        seenResources: seenEntities.resources || [],
        seenPlants: seenEntities.plants || [],
        heardSpeech: [],
      },
      agent: { name: 'TestAgent', behavior: 'idle' },
    });
    // Add SpatialMemoryComponent using the class
    agent.addComponent(new SpatialMemoryComponent());
    return agent;
  }

  // ============================================================================
  // ResourceTargeting Tests
  // ============================================================================

  describe('ResourceTargeting', () => {
    it('finds nearest visible resource', () => {
      const resource1 = createEntity({
        position: { x: 10, y: 0 },
        resource: { resourceType: 'wood', amount: 50, harvestable: true },
      });

      const resource2 = createEntity({
        position: { x: 5, y: 0 },
        resource: { resourceType: 'wood', amount: 30, harvestable: true },
      });

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { resources: [resource1.id, resource2.id] }
      );

      const targeting = new ResourceTargeting();
      const nearest = targeting.findNearest(agent, world);

      expect(nearest).not.toBeNull();
      expect(nearest!.entity.id).toBe(resource2.id); // Closer one
      expect(nearest!.resourceType).toBe('wood');
      expect(nearest!.distance).toBeCloseTo(5);
    });

    it('filters by resource type', () => {
      const wood = createEntity({
        position: { x: 5, y: 0 },
        resource: { resourceType: 'wood', amount: 50, harvestable: true },
      });

      const stone = createEntity({
        position: { x: 3, y: 0 },
        resource: { resourceType: 'stone', amount: 30, harvestable: true },
      });

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { resources: [wood.id, stone.id] }
      );

      const targeting = new ResourceTargeting();
      const nearest = targeting.findNearest(agent, world, { resourceType: 'wood' });

      expect(nearest).not.toBeNull();
      expect(nearest!.entity.id).toBe(wood.id);
    });

    it('returns null when no visible resources', () => {
      const agent = createAgentWithVision({ x: 0, y: 0 });

      const targeting = new ResourceTargeting();
      const nearest = targeting.findNearest(agent, world);

      expect(nearest).toBeNull();
    });

    it('excludes non-harvestable resources', () => {
      const depleted = createEntity({
        position: { x: 5, y: 0 },
        resource: { resourceType: 'wood', amount: 0, harvestable: true },
      });

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { resources: [depleted.id] }
      );

      const targeting = new ResourceTargeting();
      const nearest = targeting.findNearest(agent, world);

      expect(nearest).toBeNull();
    });

    it('finds all visible resources sorted by distance', () => {
      const far = createEntity({
        position: { x: 20, y: 0 },
        resource: { resourceType: 'wood', amount: 50, harvestable: true },
      });

      const near = createEntity({
        position: { x: 5, y: 0 },
        resource: { resourceType: 'stone', amount: 30, harvestable: true },
      });

      const mid = createEntity({
        position: { x: 10, y: 0 },
        resource: { resourceType: 'wood', amount: 20, harvestable: true },
      });

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { resources: [far.id, near.id, mid.id] }
      );

      const targeting = new ResourceTargeting();
      const all = targeting.findAll(agent, world);

      expect(all.length).toBe(3);
      expect(all[0]!.entity.id).toBe(near.id);
      expect(all[1]!.entity.id).toBe(mid.id);
      expect(all[2]!.entity.id).toBe(far.id);
    });

    it('standalone function works', () => {
      const resource = createEntity({
        position: { x: 5, y: 0 },
        resource: { resourceType: 'food', amount: 10, harvestable: true },
      });

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { resources: [resource.id] }
      );

      const nearest = findNearestResource(agent, world);
      expect(nearest).not.toBeNull();
      expect(nearest!.resourceType).toBe('food');
    });
  });

  // ============================================================================
  // PlantTargeting Tests
  // ============================================================================

  describe('PlantTargeting', () => {
    it('finds nearest visible plant with food', () => {
      const plant = createEntity({
        position: { x: 8, y: 0 },
        plant: { speciesId: 'berry-bush', fruitCount: 5, seedsProduced: 0, growthStage: 1.0 },
      });

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { plants: [plant.id] }
      );

      const targeting = new PlantTargeting();
      const nearest = targeting.findNearest(agent, world, { hasFood: true });

      expect(nearest).not.toBeNull();
      expect(nearest!.speciesId).toBe('berry-bush');
      expect(nearest!.fruitCount).toBe(5);
      expect(nearest!.isEdible).toBe(true);
    });

    it('filters by species', () => {
      const berry = createEntity({
        position: { x: 5, y: 0 },
        plant: { speciesId: 'berry-bush', fruitCount: 3, growthStage: 1.0 },
      });

      const wheat = createEntity({
        position: { x: 3, y: 0 },
        plant: { speciesId: 'wheat', fruitCount: 2, growthStage: 1.0 },
      });

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { plants: [berry.id, wheat.id] }
      );

      const targeting = new PlantTargeting();
      const nearest = targeting.findNearest(agent, world, { speciesId: 'berry-bush' });

      expect(nearest).not.toBeNull();
      expect(nearest!.entity.id).toBe(berry.id);
    });

    it('finds plants with seeds', () => {
      const withSeeds = createEntity({
        position: { x: 5, y: 0 },
        plant: { speciesId: 'berry-bush', fruitCount: 0, seedsProduced: 3, growthStage: 1.0 },
      });

      const noSeeds = createEntity({
        position: { x: 3, y: 0 },
        plant: { speciesId: 'berry-bush', fruitCount: 5, seedsProduced: 0, growthStage: 1.0 },
      });

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { plants: [withSeeds.id, noSeeds.id] }
      );

      const targeting = new PlantTargeting();
      const nearest = targeting.findNearest(agent, world, { hasSeeds: true });

      expect(nearest).not.toBeNull();
      expect(nearest!.entity.id).toBe(withSeeds.id);
      expect(nearest!.seedsProduced).toBe(3);
    });

    it('convenience methods work', () => {
      const ediblePlant = createEntity({
        position: { x: 5, y: 0 },
        plant: { speciesId: 'berry-bush', fruitCount: 3, growthStage: 1.0 },
      });

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { plants: [ediblePlant.id] }
      );

      const edible = findNearestEdiblePlant(agent, world);
      expect(edible).not.toBeNull();
      expect(edible!.isEdible).toBe(true);
    });
  });

  // ============================================================================
  // BuildingTargeting Tests
  // ============================================================================

  describe('BuildingTargeting', () => {
    it('finds nearest visible building', () => {
      const storage = createEntity({
        position: { x: 10, y: 0 },
        building: {
          buildingType: BuildingType.StorageChest,
          constructionProgress: 1.0,
          capacity: 100,
          storedItems: [],
        },
      });

      const agent = createAgentWithVision({ x: 0, y: 0 });
      // Add building to vision range via query (buildings aren't in seenBuildings by default)
      (agent.getComponent(ComponentType.Vision) as any).range = 15;

      const targeting = new BuildingTargeting();
      const nearest = targeting.findNearest(agent, world, { buildingType: BuildingType.StorageChest });

      expect(nearest).not.toBeNull();
      expect(nearest!.buildingType).toBe(BuildingType.StorageChest);
      expect(nearest!.isComplete).toBe(true);
    });

    it('filters by completion status', () => {
      const incomplete = createEntity({
        position: { x: 5, y: 0 },
        building: { buildingType: BuildingType.Tent, constructionProgress: 0.5 },
      });

      const complete = createEntity({
        position: { x: 10, y: 0 },
        building: { buildingType: BuildingType.Tent, constructionProgress: 1.0 },
      });

      const agent = createAgentWithVision({ x: 0, y: 0 });

      const targeting = new BuildingTargeting();
      const nearest = targeting.findNearest(agent, world, {
        buildingType: BuildingType.Tent,
        completed: true,
      });

      expect(nearest).not.toBeNull();
      expect(nearest!.entity.id).toBe(complete.id);
    });

    it('filters by available capacity', () => {
      const full = createEntity({
        position: { x: 5, y: 0 },
        building: {
          buildingType: BuildingType.StorageChest,
          constructionProgress: 1.0,
          capacity: 10,
          storedItems: new Array(10).fill('item'),
        },
      });

      const hasSpace = createEntity({
        position: { x: 10, y: 0 },
        building: {
          buildingType: BuildingType.StorageChest,
          constructionProgress: 1.0,
          capacity: 10,
          storedItems: ['item1', 'item2'],
        },
      });

      const agent = createAgentWithVision({ x: 0, y: 0 });

      const targeting = new BuildingTargeting();
      const nearest = targeting.findNearest(agent, world, {
        buildingType: BuildingType.StorageChest,
        hasCapacity: true,
      });

      expect(nearest).not.toBeNull();
      expect(nearest!.entity.id).toBe(hasSpace.id);
    });
  });

  // ============================================================================
  // AgentTargeting Tests
  // ============================================================================

  describe('AgentTargeting', () => {
    it('finds nearest visible agent', () => {
      const otherAgent = createEntity({
        position: { x: 5, y: 0 },
        agent: { name: 'Alice', behavior: 'idle' },
      });
      otherAgent.addComponent(createIdentityComponent('Alice'));

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { agents: [otherAgent.id] }
      );

      const targeting = new AgentTargeting();
      const nearest = targeting.findNearest(agent, world, { excludeSelf: true });

      expect(nearest).not.toBeNull();
      expect(nearest!.name).toBe('Alice');
    });

    it('excludes self from results', () => {
      const agent = createAgentWithVision({ x: 0, y: 0 });

      // Add self to seen agents
      const vision = agent.getComponent(ComponentType.Vision)!;
      (vision as any).seenAgents = [agent.id];

      const targeting = new AgentTargeting();
      const nearest = targeting.findNearest(agent, world, { excludeSelf: true });

      expect(nearest).toBeNull();
    });

    it('finds by name', () => {
      const alice = createEntity({
        position: { x: 10, y: 0 },
        agent: { name: 'Alice', behavior: 'gather' },
      });
      alice.addComponent(createIdentityComponent('Alice'));

      const bob = createEntity({
        position: { x: 5, y: 0 },
        agent: { name: 'Bob', behavior: 'idle' },
      });
      bob.addComponent(createIdentityComponent('Bob'));

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { agents: [alice.id, bob.id] }
      );

      const targeting = new AgentTargeting();
      const result = targeting.findByName(agent, world, 'Alice');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Alice');
      expect(result!.entity.id).toBe(alice.id);
    });

    it('filters by conversation availability', () => {
      const busy = createEntity({
        position: { x: 5, y: 0 },
        agent: { name: 'Busy', behavior: 'talk' },
        conversation: {
          partnerId: 'someone-else',
          messages: [],
          maxMessages: 10,
          startedAt: 0,
          lastMessageAt: 0,
          isActive: true,
        },
      });
      busy.addComponent(createIdentityComponent('Busy'));

      const available = createEntity({
        position: { x: 10, y: 0 },
        agent: { name: 'Free', behavior: 'idle' },
        conversation: {
          partnerId: null,
          messages: [],
          maxMessages: 10,
          startedAt: 0,
          lastMessageAt: 0,
          isActive: false,
        },
      });
      available.addComponent(createIdentityComponent('Free'));

      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { agents: [busy.id, available.id] }
      );

      const partner = findConversationPartner(agent, world);

      expect(partner).not.toBeNull();
      expect(partner!.name).toBe('Free');
      expect(partner!.inConversation).toBe(false);
    });
  });

  // ============================================================================
  // ThreatTargeting Tests
  // ============================================================================

  describe('ThreatTargeting', () => {
    it('detects predator threats', () => {
      // Create a prey animal
      const prey = createEntity({
        position: { x: 0, y: 0 },
        animal: { speciesId: 'rabbit' },
        vision: {
          range: 15,
          seenAgents: [],
          seenResources: [],
          seenPlants: [],
          heardSpeech: [],
        },
      });

      // Create a predator visible to prey
      const predator = createEntity({
        position: { x: 5, y: 0 },
        animal: {
          speciesId: 'wolf',
          isPredator: true,
          preySpecies: ['rabbit'],
          threatLevel: 80,
        },
        movement: { velocityX: 1, velocityY: 0 },
      });

      // Add predator to prey's vision
      const vision = prey.getComponent(ComponentType.Vision)!;
      (vision as any).seenAgents = [predator.id];

      const targeting = new ThreatTargeting();
      const threat = targeting.findNearest(prey, world);

      expect(threat).not.toBeNull();
      expect(threat!.threatType).toBe('predator');
      expect(threat!.threatLevel).toBe(80);
    });

    it('calculates flee direction from multiple threats', () => {
      const animal = createEntity({
        position: { x: 0, y: 0 },
        animal: { speciesId: 'rabbit' },
        vision: {
          range: 20,
          seenAgents: [],
          seenResources: [],
          seenPlants: [],
          heardSpeech: [],
        },
      });

      // Threats from multiple directions
      const threat1 = createEntity({
        position: { x: 5, y: 0 },
        animal: { isPredator: true, preySpecies: ['rabbit'], threatLevel: 50 },
      });

      const threat2 = createEntity({
        position: { x: 0, y: 5 },
        animal: { isPredator: true, preySpecies: ['rabbit'], threatLevel: 50 },
      });

      const vision = animal.getComponent(ComponentType.Vision)!;
      (vision as any).seenAgents = [threat1.id, threat2.id];

      const assessment = assessThreats(animal, world);

      expect(assessment.hasThreats).toBe(true);
      expect(assessment.totalThreats).toBe(2);
      expect(assessment.fleeDirection).not.toBeNull();

      // Should flee away from both (negative x and y)
      if (assessment.fleeDirection) {
        expect(assessment.fleeDirection.x).toBeLessThan(0);
        expect(assessment.fleeDirection.y).toBeLessThan(0);
      }
    });

    it('returns no threats when safe', () => {
      const animal = createEntity({
        position: { x: 0, y: 0 },
        animal: { speciesId: 'rabbit' },
        vision: {
          range: 15,
          seenAgents: [],
          seenResources: [],
          seenPlants: [],
          heardSpeech: [],
        },
      });

      const assessment = assessThreats(animal, world);

      expect(assessment.hasThreats).toBe(false);
      expect(assessment.totalThreats).toBe(0);
      expect(assessment.fleeDirection).toBeNull();
    });

    it('detects fire hazards', () => {
      const agent = createAgentWithVision({ x: 0, y: 0 });

      const fire = createEntity({
        position: { x: 5, y: 0 },
        resource: { resourceType: 'fire', dangerLevel: 100 },
      });

      const vision = agent.getComponent(ComponentType.Vision)!;
      (vision as any).seenResources = [fire.id];

      const threat = findNearestThreat(agent, world);

      expect(threat).not.toBeNull();
      expect(threat!.threatType).toBe('fire');
    });
  });

  // ============================================================================
  // Perception-Limited Targeting Tests
  // ============================================================================

  describe('Perception-Limited Targeting', () => {
    it('only finds entities in vision', () => {
      // Create resources - one in vision, one not
      const visible = createEntity({
        position: { x: 5, y: 0 },
        resource: { resourceType: 'wood', amount: 50, harvestable: true },
      });

      const invisible = createEntity({
        position: { x: 100, y: 0 },
        resource: { resourceType: 'gold', amount: 100, harvestable: true },
      });

      // Agent only sees the visible one
      const agent = createAgentWithVision(
        { x: 0, y: 0 },
        { resources: [visible.id] } // invisible NOT in seenResources
      );

      const all = findNearestResource(agent, world);

      expect(all).not.toBeNull();
      expect(all!.entity.id).toBe(visible.id);
      // Gold is not found even though it exists
    });

    it('uses findTarget to try visible then remembered', () => {
      const agent = createAgentWithVision({ x: 0, y: 0 });

      // No visible resources, but we have a remembered location
      const spatialMemory = agent.getComponent(ComponentType.SpatialMemory) as SpatialMemoryComponent;
      addSpatialMemory(
        spatialMemory,
        {
          type: 'resource_location',
          x: 50,
          y: 50,
          metadata: { resourceType: 'wood', category: 'resource:wood' },
        },
        100,
        80
      );

      const result = findResourceTarget(agent, world, { resourceType: 'wood' });

      expect(result.type).toBe('remembered');
      if (result.type === 'remembered') {
        expect(result.position.x).toBe(50);
        expect(result.position.y).toBe(50);
      }
    });

    it('returns unknown when nothing visible or remembered', () => {
      const agent = createAgentWithVision({ x: 0, y: 0 });

      const result = findResourceTarget(agent, world, { resourceType: 'diamond' });

      expect(result.type).toBe('unknown');
    });
  });
});
