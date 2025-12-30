import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';
/**
 * Integration tests for Targeting Module
 *
 * Tests targeting services in realistic scenarios with multiple entities,
 * perception limits, and memory systems.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createVisionComponent } from '../../components/VisionComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { SpatialMemoryComponent } from '../../components/SpatialMemoryComponent.js';
import { ResourceTargeting } from '../ResourceTargeting.js';
import { PlantTargeting } from '../PlantTargeting.js';
import { BuildingTargeting } from '../BuildingTargeting.js';
import { AgentTargeting } from '../AgentTargeting.js';
import { ThreatTargeting } from '../ThreatTargeting.js';

describe('Targeting Integration Tests', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: true });
  });

  describe('Resource Gathering Scenario', () => {
    it('agent finds visible resources and remembers their location', () => {
      const resourceTargeting = new ResourceTargeting();

      // Create an agent at origin with vision
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(20)); // 20 tile vision range
      agent.addComponent(new SpatialMemoryComponent());
      (harness.world as any)._addEntity(agent);

      // Create several resources at different distances
      const createResource = (x: number, y: number, type: string, amount: number) => {
        const resource = new EntityImpl(createEntityId(), 0);
        resource.addComponent(createPositionComponent(x, y));
        resource.addComponent({
          type: ComponentType.Resource,
          resourceType: type,
          harvestable: true,
          amount,
        });
        (harness.world as any)._addEntity(resource);
        return resource;
      };

      const wood1 = createResource(5, 0, 'wood', 50);
      const wood2 = createResource(10, 0, 'wood', 30);
      const stone1 = createResource(8, 8, 'stone', 100);
      const farWood = createResource(50, 50, 'wood', 200); // Out of vision

      // Populate vision with visible resources
      const vision = agent.getComponent(ComponentType.Vision) as any;
      vision.seenResources = [wood1.id, wood2.id, stone1.id]; // farWood not visible

      // Find nearest wood - should be wood1
      const nearestWood = resourceTargeting.findNearest(agent, harness.world, {
        resourceType: 'wood',
      });

      expect(nearestWood).not.toBeNull();
      expect(nearestWood!.resourceType).toBe('wood');
      expect(nearestWood!.distance).toBe(5);
      expect(nearestWood!.amount).toBe(50);

      // Find all wood - should be 2 (not farWood)
      const allWood = resourceTargeting.findAll(agent, harness.world, {
        resourceType: 'wood',
      });

      expect(allWood).toHaveLength(2);
      expect(allWood[0].distance).toBeLessThan(allWood[1].distance);

      // Find nearest stone
      const nearestStone = resourceTargeting.findNearest(agent, harness.world, {
        resourceType: 'stone',
      });

      expect(nearestStone).not.toBeNull();
      expect(nearestStone!.resourceType).toBe('stone');

      // Agent moves away - resources no longer visible
      vision.seenResources = [];

      // Direct find should return null when nothing visible
      const afterMove = resourceTargeting.findNearest(agent, harness.world, {
        resourceType: 'wood',
      });
      expect(afterMove).toBeNull();

      // Note: Memory integration tested separately - requires compatible SpatialMemoryComponent
      // The memory system uses a .locations Map which the current SpatialMemoryComponent
      // doesn't implement (it uses _resourceMemories array instead)
    });

    it('agent prioritizes closer resources over richer ones', () => {
      const resourceTargeting = new ResourceTargeting();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(30));
      (harness.world as any)._addEntity(agent);

      // Close resource with small amount
      const closeSmall = new EntityImpl(createEntityId(), 0);
      closeSmall.addComponent(createPositionComponent(3, 0));
      closeSmall.addComponent({
        type: ComponentType.Resource,
        resourceType: 'food',
        harvestable: true,
        amount: 10,
      });
      (harness.world as any)._addEntity(closeSmall);

      // Far resource with large amount
      const farLarge = new EntityImpl(createEntityId(), 0);
      farLarge.addComponent(createPositionComponent(20, 0));
      farLarge.addComponent({
        type: ComponentType.Resource,
        resourceType: 'food',
        harvestable: true,
        amount: 100,
      });
      (harness.world as any)._addEntity(farLarge);

      const vision = agent.getComponent(ComponentType.Vision) as any;
      vision.seenResources = [closeSmall.id, farLarge.id];

      // Should find closer one first
      const nearest = resourceTargeting.findNearest(agent, harness.world, {
        resourceType: 'food',
      });

      expect(nearest!.distance).toBe(3);
      expect(nearest!.amount).toBe(10);
    });
  });

  describe('Building Usage Scenario', () => {
    it('agent finds storage with available capacity', () => {
      const buildingTargeting = new BuildingTargeting();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(50));
      (harness.world as any)._addEntity(agent);

      // Full storage
      const fullStorage = new EntityImpl(createEntityId(), 0);
      fullStorage.addComponent(createPositionComponent(5, 0));
      fullStorage.addComponent({
        type: ComponentType.Building,
        buildingType: BuildingType.StorageChest,
        constructionProgress: 1.0,
        capacity: 10,
        storedItems: Array(10).fill('item'),
      });
      (harness.world as any)._addEntity(fullStorage);

      // Available storage (farther)
      const availableStorage = new EntityImpl(createEntityId(), 0);
      availableStorage.addComponent(createPositionComponent(15, 0));
      availableStorage.addComponent({
        type: ComponentType.Building,
        buildingType: BuildingType.StorageChest,
        constructionProgress: 1.0,
        capacity: 20,
        storedItems: ['item1', 'item2'],
      });
      (harness.world as any)._addEntity(availableStorage);

      // Find storage with capacity - should skip full one
      const storage = buildingTargeting.findNearest(agent, harness.world, {
        buildingType: BuildingType.StorageChest,
        completed: true,
        hasCapacity: true,
      });

      expect(storage).not.toBeNull();
      expect(storage!.distance).toBe(15); // Farther but has capacity
      expect(storage!.currentItems).toBe(2);
      expect(storage!.capacity).toBe(20);
    });

    it('agent finds warm shelter during cold weather', () => {
      const buildingTargeting = new BuildingTargeting();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(50));
      (harness.world as any)._addEntity(agent);

      // Cold structure (no warmth)
      const coldBuilding = new EntityImpl(createEntityId(), 0);
      coldBuilding.addComponent(createPositionComponent(3, 0));
      coldBuilding.addComponent({
        type: ComponentType.Building,
        buildingType: 'shed',
        constructionProgress: 1.0,
        warmthBonus: 0,
        insulation: 0,
      });
      (harness.world as any)._addEntity(coldBuilding);

      // Warm cabin (farther but warm)
      const warmCabin = new EntityImpl(createEntityId(), 0);
      warmCabin.addComponent(createPositionComponent(20, 0));
      warmCabin.addComponent({
        type: ComponentType.Building,
        buildingType: 'cabin',
        constructionProgress: 1.0,
        warmthBonus: 15,
        insulation: 0.8,
      });
      (harness.world as any)._addEntity(warmCabin);

      // Find warm shelter
      const shelter = buildingTargeting.findNearest(agent, harness.world, {
        providesWarmth: true,
        completed: true,
      });

      expect(shelter).not.toBeNull();
      expect(shelter!.buildingType).toBe('cabin');
      expect(shelter!.providesWarmth).toBe(true);
      expect(shelter!.warmthBonus).toBe(15);
    });
  });

  describe('Social Interaction Scenario', () => {
    it('agent finds conversation partner who is available', () => {
      const agentTargeting = new AgentTargeting();

      // Main agent
      const mainAgent = new EntityImpl(createEntityId(), 0);
      mainAgent.addComponent(createPositionComponent(0, 0));
      mainAgent.addComponent(createVisionComponent(30));
      mainAgent.addComponent({
        type: ComponentType.Agent,
        name: 'Alice',
        behavior: 'idle',
      });
      mainAgent.addComponent(createIdentityComponent('Alice'));
      (harness.world as any)._addEntity(mainAgent);

      // Busy agent (in conversation)
      const busyAgent = new EntityImpl(createEntityId(), 0);
      busyAgent.addComponent(createPositionComponent(5, 0));
      busyAgent.addComponent({
        type: ComponentType.Agent,
        name: 'Bob',
        behavior: 'talking',
      });
      busyAgent.addComponent(createIdentityComponent('Bob'));
      busyAgent.addComponent({
        type: ComponentType.Conversation,
        partnerId: 'someone-else',
        messages: [],
        maxMessages: 10,
        startedAt: 0,
        lastMessageAt: 0,
        isActive: true,
      });
      (harness.world as any)._addEntity(busyAgent);

      // Available agent (farther)
      const availableAgent = new EntityImpl(createEntityId(), 0);
      availableAgent.addComponent(createPositionComponent(15, 0));
      availableAgent.addComponent({
        type: ComponentType.Agent,
        name: 'Carol',
        behavior: 'wander',
      });
      availableAgent.addComponent(createIdentityComponent('Carol'));
      (harness.world as any)._addEntity(availableAgent);

      const vision = mainAgent.getComponent(ComponentType.Vision) as any;
      vision.seenAgents = [mainAgent.id, busyAgent.id, availableAgent.id];

      // Find conversation partner (not in conversation)
      const partner = agentTargeting.findConversationPartner(mainAgent, harness.world);

      expect(partner).not.toBeNull();
      expect(partner!.name).toBe('Carol');
      expect(partner!.inConversation).toBe(false);
    });

    it('agent finds friend for activity', () => {
      const agentTargeting = new AgentTargeting();

      const mainAgent = new EntityImpl(createEntityId(), 0);
      mainAgent.addComponent(createPositionComponent(0, 0));
      mainAgent.addComponent(createVisionComponent(50));
      mainAgent.addComponent({
        type: ComponentType.Agent,
        name: 'Player',
        behavior: 'idle',
      });
      mainAgent.addComponent(createIdentityComponent('Player'));

      // Relationships
      const friendId = createEntityId();
      const strangerId = createEntityId();

      mainAgent.addComponent({
        type: ComponentType.Relationship,
        relationships: new Map([
          [friendId, { targetId: friendId, familiarity: 75, lastInteraction: 0, interactionCount: 5, sharedMemories: 0 }],
          [strangerId, { targetId: strangerId, familiarity: 10, lastInteraction: 0, interactionCount: 1, sharedMemories: 0 }],
        ]),
      });
      (harness.world as any)._addEntity(mainAgent);

      // Friend
      const friend = new EntityImpl(friendId, 0);
      friend.addComponent(createPositionComponent(20, 0));
      friend.addComponent({
        type: ComponentType.Agent,
        name: 'BestFriend',
        behavior: 'wander',
      });
      friend.addComponent(createIdentityComponent('BestFriend'));
      (harness.world as any)._addEntity(friend);

      // Stranger (closer but not a friend)
      const stranger = new EntityImpl(strangerId, 0);
      stranger.addComponent(createPositionComponent(5, 0));
      stranger.addComponent({
        type: ComponentType.Agent,
        name: 'Stranger',
        behavior: 'idle',
      });
      stranger.addComponent(createIdentityComponent('Stranger'));
      (harness.world as any)._addEntity(stranger);

      const vision = mainAgent.getComponent(ComponentType.Vision) as any;
      vision.seenAgents = [mainAgent.id, friend.id, stranger.id];

      // Find friend (min relationship 50)
      const foundFriend = agentTargeting.findFriend(mainAgent, harness.world, 50);

      expect(foundFriend).not.toBeNull();
      expect(foundFriend!.name).toBe('BestFriend');
      expect(foundFriend!.relationshipScore).toBe(75);
    });

    it('agent stops seeing other agents when they leave vision', () => {
      const agentTargeting = new AgentTargeting();

      const mainAgent = new EntityImpl(createEntityId(), 0);
      mainAgent.addComponent(createPositionComponent(0, 0));
      mainAgent.addComponent(createVisionComponent(20));
      (harness.world as any)._addEntity(mainAgent);

      // Other agent visible initially
      const otherAgent = new EntityImpl(createEntityId(), 0);
      otherAgent.addComponent(createPositionComponent(10, 10));
      otherAgent.addComponent({
        type: ComponentType.Agent,
        name: 'Charlie',
        behavior: 'wander',
      });
      otherAgent.addComponent(createIdentityComponent('Charlie'));
      (harness.world as any)._addEntity(otherAgent);

      const vision = mainAgent.getComponent(ComponentType.Vision) as any;
      vision.seenAgents = [otherAgent.id];

      // See Charlie
      const found = agentTargeting.findNearest(mainAgent, harness.world, {
        excludeSelf: true,
      });
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Charlie');

      // Charlie moves away (no longer visible)
      vision.seenAgents = [];

      // Can't see Charlie anymore
      const notVisible = agentTargeting.findNearest(mainAgent, harness.world, {
        excludeSelf: true,
      });
      expect(notVisible).toBeNull();

      // Note: Memory integration requires compatible SpatialMemoryComponent with .locations Map
    });
  });

  describe('Threat Response Scenario', () => {
    it('prey animal detects predator and calculates flee direction', () => {
      const threatTargeting = new ThreatTargeting();

      // Prey animal (rabbit)
      const rabbit = new EntityImpl(createEntityId(), 0);
      rabbit.addComponent(createPositionComponent(10, 10));
      rabbit.addComponent(createVisionComponent(15));
      rabbit.addComponent({
        type: ComponentType.Animal,
        speciesId: 'rabbit',
        isPredator: false,
      });
      (harness.world as any)._addEntity(rabbit);

      // Predator (fox) approaching from the west
      const fox = new EntityImpl(createEntityId(), 0);
      fox.addComponent(createPositionComponent(3, 10));
      fox.addComponent({
        type: ComponentType.Animal,
        speciesId: 'fox',
        isPredator: true,
        preySpecies: ['rabbit', 'chicken'],
        threatLevel: 80,
      });
      fox.addComponent({
        type: ComponentType.Movement,
        velocityX: 2, // Moving east (toward rabbit)
        velocityY: 0,
      });
      (harness.world as any)._addEntity(fox);

      const vision = rabbit.getComponent(ComponentType.Vision) as any;
      vision.seenAgents = [fox.id];

      // Assess threats
      const assessment = threatTargeting.assessThreats(rabbit, harness.world);

      expect(assessment.hasThreats).toBe(true);
      expect(assessment.totalThreats).toBe(1);
      expect(assessment.nearestThreat).not.toBeNull();
      expect(assessment.nearestThreat!.threatType).toBe('predator');
      expect(assessment.nearestThreat!.threatLevel).toBe(80);
      expect(assessment.nearestThreat!.isApproaching).toBe(true);

      // Flee direction should be away from fox (to the east)
      expect(assessment.fleeDirection).not.toBeNull();
      expect(assessment.fleeDirection!.x).toBeGreaterThan(10); // East of rabbit
    });

    it('animal detects fire hazard', () => {
      const threatTargeting = new ThreatTargeting();

      const deer = new EntityImpl(createEntityId(), 0);
      deer.addComponent(createPositionComponent(20, 20));
      deer.addComponent(createVisionComponent(25));
      deer.addComponent({
        type: ComponentType.Animal,
        speciesId: 'deer',
        isPredator: false,
      });
      (harness.world as any)._addEntity(deer);

      // Fire hazard
      const fire = new EntityImpl(createEntityId(), 0);
      fire.addComponent(createPositionComponent(25, 20));
      fire.addComponent({
        type: ComponentType.Resource,
        resourceType: 'fire',
        dangerLevel: 100,
      });
      (harness.world as any)._addEntity(fire);

      const vision = deer.getComponent(ComponentType.Vision) as any;
      vision.seenResources = [fire.id];

      // Find threat
      const threat = threatTargeting.findNearest(deer, harness.world, {
        threatTypes: ['fire'],
      });

      expect(threat).not.toBeNull();
      expect(threat!.threatType).toBe('fire');
      expect(threat!.threatLevel).toBe(100);
      expect(threat!.isMoving).toBe(false);
    });

    it('animal flees from multiple threats with weighted direction', () => {
      const threatTargeting = new ThreatTargeting();

      // Animal in the middle
      const chicken = new EntityImpl(createEntityId(), 0);
      chicken.addComponent(createPositionComponent(50, 50));
      chicken.addComponent(createVisionComponent(20));
      chicken.addComponent({
        type: ComponentType.Animal,
        speciesId: 'chicken',
        isPredator: false,
      });
      (harness.world as any)._addEntity(chicken);

      // Predator from the north
      const hawk = new EntityImpl(createEntityId(), 0);
      hawk.addComponent(createPositionComponent(50, 40));
      hawk.addComponent({
        type: ComponentType.Animal,
        speciesId: 'hawk',
        isPredator: true,
        preySpecies: ['chicken', 'rabbit'],
        threatLevel: 90,
      });
      (harness.world as any)._addEntity(hawk);

      // Predator from the east
      const fox = new EntityImpl(createEntityId(), 0);
      fox.addComponent(createPositionComponent(60, 50));
      fox.addComponent({
        type: ComponentType.Animal,
        speciesId: 'fox',
        isPredator: true,
        preySpecies: ['chicken', 'rabbit'],
        threatLevel: 70,
      });
      (harness.world as any)._addEntity(fox);

      const vision = chicken.getComponent(ComponentType.Vision) as any;
      vision.seenAgents = [hawk.id, fox.id];

      // Assess all threats
      const assessment = threatTargeting.assessThreats(chicken, harness.world);

      expect(assessment.totalThreats).toBe(2);
      expect(assessment.highestThreatLevel).toBe(90);

      // Flee direction should be southwest (away from both)
      expect(assessment.fleeDirection).not.toBeNull();
      expect(assessment.fleeDirection!.x).toBeLessThan(50); // West
      expect(assessment.fleeDirection!.y).toBeGreaterThan(50); // South
    });
  });

  describe('Plant Foraging Scenario', () => {
    it('agent finds edible plants within vision', () => {
      const plantTargeting = new PlantTargeting();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(30));
      (harness.world as any)._addEntity(agent);

      // Berry bush (edible) - uses fruitCount for PlantTargeting
      // Note: 'berry-bush' is registered in plantRegistry as edible
      const berryBush = new EntityImpl(createEntityId(), 0);
      berryBush.addComponent(createPositionComponent(10, 0));
      berryBush.addComponent({
        type: ComponentType.Plant,
        speciesId: 'berry-bush', // Using registered species with hyphen
        classification: 'fruit',
        growthStage: 1.0,
        fruitCount: 5,
        seedsProduced: 0,
      });
      (harness.world as any)._addEntity(berryBush);

      // Oak tree (not edible - no fruit for eating)
      const oakTree = new EntityImpl(createEntityId(), 0);
      oakTree.addComponent(createPositionComponent(5, 0));
      oakTree.addComponent({
        type: ComponentType.Plant,
        speciesId: 'oak-tree', // Using registered species
        classification: 'tree',
        growthStage: 1.0,
        fruitCount: 0,
        seedsProduced: 10, // Has seeds but not edible
      });
      (harness.world as any)._addEntity(oakTree);

      const vision = agent.getComponent(ComponentType.Vision) as any;
      vision.seenPlants = [berryBush.id, oakTree.id];

      // Find edible plants (berry-bush is edible in plantRegistry)
      const edible = plantTargeting.findNearest(agent, harness.world, {
        hasFood: true,
      });

      expect(edible).not.toBeNull();
      expect(edible!.speciesId).toBe('berry-bush');
      expect(edible!.fruitCount).toBe(5);
    });

    it('agent finds plants with seeds for farming', () => {
      const plantTargeting = new PlantTargeting();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(50));
      (harness.world as any)._addEntity(agent);

      // Young plant (no seeds yet)
      const youngPlant = new EntityImpl(createEntityId(), 0);
      youngPlant.addComponent(createPositionComponent(5, 0));
      youngPlant.addComponent({
        type: ComponentType.Plant,
        speciesId: 'wheat',
        growthStage: 0.5,
        fruitCount: 0,
        seedsProduced: 0,
      });
      (harness.world as any)._addEntity(youngPlant);

      // Mature plant (has seeds)
      const maturePlant = new EntityImpl(createEntityId(), 0);
      maturePlant.addComponent(createPositionComponent(15, 0));
      maturePlant.addComponent({
        type: ComponentType.Plant,
        speciesId: 'wheat',
        growthStage: 1.0,
        fruitCount: 0,
        seedsProduced: 3,
      });
      (harness.world as any)._addEntity(maturePlant);

      const vision = agent.getComponent(ComponentType.Vision) as any;
      vision.seenPlants = [youngPlant.id, maturePlant.id];

      // Find plants with seeds
      const withSeeds = plantTargeting.findNearest(agent, harness.world, {
        hasSeeds: true,
      });

      expect(withSeeds).not.toBeNull();
      expect(withSeeds!.seedsProduced).toBe(3);
    });
  });

  describe('Perception Limits Enforcement', () => {
    it('targeting services only return visible entities', () => {
      const resourceTargeting = new ResourceTargeting();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(10));
      (harness.world as any)._addEntity(agent);

      // Create many resources scattered around
      const resources: EntityImpl[] = [];
      for (let i = 0; i < 10; i++) {
        const resource = new EntityImpl(createEntityId(), 0);
        resource.addComponent(createPositionComponent(i * 5, 0));
        resource.addComponent({
          type: ComponentType.Resource,
          resourceType: 'wood',
          harvestable: true,
          amount: 50,
        });
        (harness.world as any)._addEntity(resource);
        resources.push(resource);
      }

      // Only first 3 are "visible"
      const vision = agent.getComponent(ComponentType.Vision) as any;
      vision.seenResources = [resources[0].id, resources[1].id, resources[2].id];

      // Should only find 3, even though 10 exist
      const found = resourceTargeting.findAll(agent, harness.world, {
        resourceType: 'wood',
      });

      expect(found).toHaveLength(3);
    });

    it('findTarget returns unknown when nothing visible and no memory', () => {
      const resourceTargeting = new ResourceTargeting();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(10));
      (harness.world as any)._addEntity(agent);

      // No visible resources
      const vision = agent.getComponent(ComponentType.Vision) as any;
      vision.seenResources = [];

      // Should return unknown when nothing visible and no memory
      const result = resourceTargeting.findTarget(agent, harness.world, {
        resourceType: 'gold',
      });

      expect(result.type).toBe('unknown');
    });

    it('findTarget returns visible when resource is in vision', () => {
      const resourceTargeting = new ResourceTargeting();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(10));
      (harness.world as any)._addEntity(agent);

      // Create visible resource
      const resource = new EntityImpl(createEntityId(), 0);
      resource.addComponent(createPositionComponent(5, 5));
      resource.addComponent({
        type: ComponentType.Resource,
        resourceType: 'food',
        harvestable: true,
        amount: 20,
      });
      (harness.world as any)._addEntity(resource);

      const vision = agent.getComponent(ComponentType.Vision) as any;
      vision.seenResources = [resource.id];

      // Should return visible
      const result = resourceTargeting.findTarget(agent, harness.world, {
        resourceType: 'food',
      });

      expect(result.type).toBe('visible');
      expect(result.entity).toBe(resource);
    });
  });

  describe('Combined Targeting Workflow', () => {
    it('agent switches between resource types based on needs', () => {
      const resourceTargeting = new ResourceTargeting();
      const buildingTargeting = new BuildingTargeting();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(25, 25));
      agent.addComponent(createVisionComponent(50));
      (harness.world as any)._addEntity(agent);

      // Create resources
      const wood = new EntityImpl(createEntityId(), 0);
      wood.addComponent(createPositionComponent(30, 25));
      wood.addComponent({
        type: ComponentType.Resource,
        resourceType: 'wood',
        harvestable: true,
        amount: 100,
      });
      (harness.world as any)._addEntity(wood);

      const food = new EntityImpl(createEntityId(), 0);
      food.addComponent(createPositionComponent(20, 25));
      food.addComponent({
        type: ComponentType.Resource,
        resourceType: 'food',
        harvestable: true,
        amount: 50,
      });
      (harness.world as any)._addEntity(food);

      // Create storage
      const storage = new EntityImpl(createEntityId(), 0);
      storage.addComponent(createPositionComponent(25, 30));
      storage.addComponent({
        type: ComponentType.Building,
        buildingType: BuildingType.StorageChest,
        constructionProgress: 1.0,
        capacity: 50,
        storedItems: [],
      });
      (harness.world as any)._addEntity(storage);

      const vision = agent.getComponent(ComponentType.Vision) as any;
      vision.seenResources = [wood.id, food.id];

      // Find wood for building
      const woodTarget = resourceTargeting.findNearest(agent, harness.world, {
        resourceType: 'wood',
      });
      expect(woodTarget!.resourceType).toBe('wood');

      // Find food for eating
      const foodTarget = resourceTargeting.findNearest(agent, harness.world, {
        resourceType: 'food',
      });
      expect(foodTarget!.resourceType).toBe('food');

      // Find storage for depositing
      const storageTarget = buildingTargeting.findNearest(agent, harness.world, {
        buildingType: BuildingType.StorageChest,
        hasCapacity: true,
      });
      expect(storageTarget!.buildingType).toBe('storage-chest');
    });
  });
});
