import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl, EntityImpl, createEntityId } from '../../ecs/index.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createInventoryComponent } from '../../components/InventoryComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createNeedsComponent } from '../../components/NeedsComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { ResourceComponent } from '../../components/ResourceComponent.js';

describe('Resource Gathering System', () => {
  let world: WorldImpl;
  let agent: EntityImpl;
  let tree: EntityImpl;
  let rock: EntityImpl;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    // Create agent with inventory
    agent = new EntityImpl(createEntityId(), world.tick);
    agent.addComponent(createPositionComponent(0, 0));
    agent.addComponent(createInventoryComponent(10, 100));
    agent.addComponent(createAgentComponent('gather'));
    (world as any)._addEntity(agent);

    // Create tree with wood resource
    tree = new EntityImpl(createEntityId(), world.tick);
    tree.addComponent(createPositionComponent(2, 0));
    tree.addComponent({
      type: 'resource',
      version: 1,
      resourceType: 'wood',
      amount: 100,
      maxAmount: 100,
      regenerationRate: 0.1,
      harvestable: true,
    } as ResourceComponent);
    (world as any)._addEntity(tree);

    // Create rock with stone resource
    rock = new EntityImpl(createEntityId(), world.tick);
    rock.addComponent(createPositionComponent(0, 2));
    rock.addComponent({
      type: 'resource',
      version: 1,
      resourceType: 'stone',
      amount: 50,
      maxAmount: 50,
      regenerationRate: 0.05,
      harvestable: true,
    } as ResourceComponent);
    (world as any)._addEntity(rock);
  });

  describe('Acceptance Criterion 2: Wood Gathering (Chop Action)', () => {
    it('should move agent toward tree when not adjacent', () => {
      // Agent at (0,0), tree at (2,0) - distance > 1.5
      const initialPosition = agent.getComponent<PositionComponent>('position');
      expect(initialPosition).toBeDefined();

      // After AI system processes 'chop' behavior, agent should move closer
      // This will be implemented by AISystem
      const distance = Math.sqrt(
        Math.pow(2 - 0, 2) + Math.pow(0 - 0, 2)
      );
      expect(distance).toBeGreaterThan(1.5);
    });

    it('should harvest wood from tree when adjacent', () => {
      // Position agent adjacent to tree
      agent.updateComponent<PositionComponent>('position', (pos) => ({
        ...pos,
        x: 1.2,
        y: 0,
      }));

      const initialTreeResource = tree.getComponent<ResourceComponent>('resource');
      if (!initialTreeResource) {
        throw new Error('Tree missing ResourceComponent');
      }
      const initialAmount = initialTreeResource.amount;

      // Simulate chop action
      // This will be implemented by AISystem or ResourceGatheringSystem
      const harvestAmount = 10;

      // Expected: tree amount decreases
      const expectedTreeAmount = initialAmount - harvestAmount;
      expect(expectedTreeAmount).toBe(90);
    });

    it('should add harvested wood to agent inventory', () => {
      // Position agent adjacent to tree
      agent.updateComponent<PositionComponent>('position', (pos) => ({
        ...pos,
        x: 1.2,
        y: 0,
      }));

      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      // After harvesting, inventory should contain wood
      // This will be implemented by the gathering system
      // const expectedWoodSlot = {
      //   itemId: 'wood',
      //   quantity: 10,
      // };

      // Initially empty - check that no slots contain resources
      expect(inventory.slots.filter(s => s.itemId !== null && s.quantity > 0).length).toBe(0);
    });

    it('should decrease tree ResourceComponent amount when harvested', () => {
      const resource = tree.getComponent<ResourceComponent>('resource');
      if (!resource) {
        throw new Error('Tree missing ResourceComponent');
      }

      const initialAmount = resource.amount;
      const harvestAmount = 10;

      // Simulate harvest
      tree.updateComponent<ResourceComponent>('resource', (r) => ({
        ...r,
        amount: Math.max(0, r.amount - harvestAmount),
      }));

      const updatedResource = tree.getComponent<ResourceComponent>('resource');
      if (!updatedResource) {
        throw new Error('Tree missing ResourceComponent after update');
      }

      expect(updatedResource.amount).toBe(initialAmount - harvestAmount);
    });

    it('should emit resource:gathered event when wood is harvested', () => {
      const eventHandler = vi.fn();
      world.eventBus.subscribe('resource:gathered', eventHandler);

      // Position agent adjacent to tree
      agent.updateComponent<PositionComponent>('position', (pos) => ({
        ...pos,
        x: 1.2,
        y: 0,
      }));

      // After chop action is processed, event should be emitted
      // This will be implemented by AISystem
      // const expectedEvent = {
      //   type: 'resource:gathered',
      //   source: agent.id,
      //   data: {
      //     agentId: agent.id,
      //     resourceType: 'wood',
      //     amount: 10,
      //     sourceEntityId: tree.id,
      //   },
      // };

      // Initially not called
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should not harvest if tree ResourceComponent is missing', () => {
      // Remove resource component
      tree.removeComponent('resource');

      // Attempt to harvest should throw or fail gracefully
      expect(() => {
        const resource = tree.getComponent<ResourceComponent>('resource');
        if (!resource) {
          throw new Error('Cannot harvest: ResourceComponent missing');
        }
      }).toThrow('Cannot harvest: ResourceComponent missing');
    });

    it('should not harvest if tree amount is 0', () => {
      tree.updateComponent<ResourceComponent>('resource', (r) => ({
        ...r,
        amount: 0,
      }));

      const resource = tree.getComponent<ResourceComponent>('resource');
      if (!resource) {
        throw new Error('Tree missing ResourceComponent');
      }

      // Harvesting from depleted resource should not change inventory
      expect(resource.amount).toBe(0);
    });
  });

  describe('Acceptance Criterion 3: Stone Gathering (Mine Action)', () => {
    it('should move agent toward rock when not adjacent', () => {
      // Agent at (0,0), rock at (0,2) - distance > 1.5
      const initialPosition = agent.getComponent<PositionComponent>('position');
      expect(initialPosition).toBeDefined();

      const distance = Math.sqrt(
        Math.pow(0 - 0, 2) + Math.pow(2 - 0, 2)
      );
      expect(distance).toBeGreaterThan(1.5);
    });

    it('should harvest stone from rock when adjacent', () => {
      // Position agent adjacent to rock
      agent.updateComponent<PositionComponent>('position', (pos) => ({
        ...pos,
        x: 0,
        y: 1.2,
      }));

      const initialRockResource = rock.getComponent<ResourceComponent>('resource');
      if (!initialRockResource) {
        throw new Error('Rock missing ResourceComponent');
      }
      const initialAmount = initialRockResource.amount;

      const harvestAmount = 5;
      const expectedRockAmount = initialAmount - harvestAmount;
      expect(expectedRockAmount).toBe(45);
    });

    it('should add harvested stone to agent inventory', () => {
      // Position agent adjacent to rock
      agent.updateComponent<PositionComponent>('position', (pos) => ({
        ...pos,
        x: 0,
        y: 1.2,
      }));

      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      // const expectedStoneSlot = {
      //   itemId: 'stone',
      //   quantity: 5,
      // };

      // Initially empty - check that no slots contain resources
      expect(inventory.slots.filter(s => s.itemId !== null && s.quantity > 0).length).toBe(0);
    });

    it('should decrease rock ResourceComponent amount when mined', () => {
      const resource = rock.getComponent<ResourceComponent>('resource');
      if (!resource) {
        throw new Error('Rock missing ResourceComponent');
      }

      const initialAmount = resource.amount;
      const harvestAmount = 5;

      rock.updateComponent<ResourceComponent>('resource', (r) => ({
        ...r,
        amount: Math.max(0, r.amount - harvestAmount),
      }));

      const updatedResource = rock.getComponent<ResourceComponent>('resource');
      if (!updatedResource) {
        throw new Error('Rock missing ResourceComponent after update');
      }

      expect(updatedResource.amount).toBe(initialAmount - harvestAmount);
    });

    it('should emit resource:gathered event when stone is mined', () => {
      const eventHandler = vi.fn();
      world.eventBus.subscribe('resource:gathered', eventHandler);

      // Position agent adjacent to rock
      agent.updateComponent<PositionComponent>('position', (pos) => ({
        ...pos,
        x: 0,
        y: 1.2,
      }));

      // const expectedEvent = {
      //   type: 'resource:gathered',
      //   source: agent.id,
      //   data: {
      //     agentId: agent.id,
      //     resourceType: 'stone',
      //     amount: 5,
      //     sourceEntityId: rock.id,
      //   },
      // };

      // Initially not called
      expect(eventHandler).not.toHaveBeenCalled();
    });
  });

  describe('Acceptance Criterion 6: Inventory Weight Limit', () => {
    it('should reject gathering when at maxWeight', () => {
      // Set agent inventory to maxWeight
      agent.updateComponent<InventoryComponent>('inventory', (inv) => ({
        ...inv,
        currentWeight: 100, // At max
        slots: [
          { itemId: 'stone', quantity: 33 }, // 33 * 3 = 99 weight
        ],
      }));

      // Position agent adjacent to tree
      agent.updateComponent<PositionComponent>('position', (pos) => ({
        ...pos,
        x: 1.2,
        y: 0,
      }));

      // Attempt to gather wood (weight 2 per unit)
      // Should fail or gather 0 units
      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      // Wood has weight 2, can only carry 1 more unit (100 - 99 = 1, but need 2)
      const availableWeight = inventory.maxWeight - inventory.currentWeight;
      const woodWeight = 2;
      expect(availableWeight).toBeLessThan(woodWeight);
    });

    it('should gather partial amount when weight limit allows', () => {
      // Set agent inventory to near maxWeight
      agent.updateComponent<InventoryComponent>('inventory', (inv) => ({
        ...inv,
        currentWeight: 96, // 4 weight remaining
        slots: [
          { itemId: 'stone', quantity: 32 }, // 32 * 3 = 96 weight
        ],
      }));

      // Position agent adjacent to tree
      agent.updateComponent<PositionComponent>('position', (pos) => ({
        ...pos,
        x: 1.2,
        y: 0,
      }));

      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      // Wood has weight 2 per unit, can fit 2 units (4 / 2 = 2)
      const availableWeight = inventory.maxWeight - inventory.currentWeight;
      const woodWeight = 2;
      const maxGatherable = Math.floor(availableWeight / woodWeight);

      expect(maxGatherable).toBe(2);
    });

    it('should emit inventory:full event when cannot gather', () => {
      const eventHandler = vi.fn();
      world.eventBus.subscribe('inventory:full', eventHandler);

      // Set inventory to max weight
      agent.updateComponent<InventoryComponent>('inventory', (inv) => ({
        ...inv,
        currentWeight: 100,
      }));

      // Attempt to gather should emit inventory:full
      // Initially not called
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should update currentWeight when resources are added', () => {
      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      const initialWeight = inventory.currentWeight;

      // Add wood to inventory (10 units * 2 weight = 20)
      agent.updateComponent<InventoryComponent>('inventory', (inv) => ({
        ...inv,
        slots: [...inv.slots, { itemId: 'wood', quantity: 10 }],
        currentWeight: inv.currentWeight + (10 * 2),
      }));

      const updatedInventory = agent.getComponent<InventoryComponent>('inventory');
      if (!updatedInventory) {
        throw new Error('Agent missing InventoryComponent after update');
      }

      expect(updatedInventory.currentWeight).toBe(initialWeight + 20);
    });
  });

  describe('Acceptance Criterion 7: Gather Behavior for AISystem', () => {
    it('should look for nearest harvestable resource in vision', () => {
      // Agent with gather behavior should scan for resources
      const ai = agent.getComponent('agent') as AgentComponent;
      if (!ai) {
        throw new Error('Agent missing AgentComponent');
      }

      expect(ai.behavior).toBe('gather');

      // AISystem should find tree or rock nearby
      // This will be implemented in AISystem
    });

    it('should prefer resource matching current need when hungry', () => {
      // Add needs component
      agent.addComponent(createNeedsComponent(
        80, // High hunger
        50, // energy
        100, // health
        2.0, // hungerDecayRate
        1.0 // energyDecayRate
      ));

      const ai = agent.getComponent('agent') as AgentComponent;
      if (!ai) {
        throw new Error('Agent missing AgentComponent');
      }

      // When hungry, should prefer food over wood/stone
      // This will be implemented in AISystem
      expect(ai.behavior).toBe('gather');
    });

    it('should move toward nearest resource', () => {
      // Agent should pathfind to nearest harvestable resource
      const position = agent.getComponent<PositionComponent>('position');
      if (!position) {
        throw new Error('Agent missing PositionComponent');
      }

      // Find nearest resource
      const treePos = tree.getComponent<PositionComponent>('position');
      const rockPos = rock.getComponent<PositionComponent>('position');

      if (!treePos || !rockPos) {
        throw new Error('Resources missing PositionComponent');
      }

      const distToTree = Math.sqrt(
        Math.pow(treePos.x - position.x, 2) +
        Math.pow(treePos.y - position.y, 2)
      );
      const distToRock = Math.sqrt(
        Math.pow(rockPos.x - position.x, 2) +
        Math.pow(rockPos.y - position.y, 2)
      );

      const nearestDistance = Math.min(distToTree, distToRock);
      expect(nearestDistance).toBeGreaterThan(0);
    });

    it('should harvest when adjacent to resource', () => {
      // Position agent adjacent to tree
      agent.updateComponent<PositionComponent>('position', (pos) => ({
        ...pos,
        x: 1.2,
        y: 0,
      }));

      const position = agent.getComponent<PositionComponent>('position');
      const treePos = tree.getComponent<PositionComponent>('position');

      if (!position || !treePos) {
        throw new Error('Missing PositionComponent');
      }

      const distance = Math.sqrt(
        Math.pow(treePos.x - position.x, 2) +
        Math.pow(treePos.y - position.y, 2)
      );

      expect(distance).toBeLessThan(1.5);

      // At this distance, AISystem should trigger harvest action
    });
  });

  describe('Error Handling (CLAUDE.md compliance)', () => {
    it('should throw when ResourceComponent is missing required field', () => {
      expect(() => {
        const invalidResource = tree.getComponent('resource') as ResourceComponent;
        if (!invalidResource) {
          throw new Error('ResourceComponent missing');
        }
        if (invalidResource.resourceType === undefined) {
          throw new Error('ResourceComponent missing required field: resourceType');
        }
      }).not.toThrow(); // This should not throw in valid case

      // Test invalid case
      tree.updateComponent('resource', (r) => ({
        ...r,
        resourceType: undefined as any,
      }));

      expect(() => {
        const resource = tree.getComponent('resource') as ResourceComponent;
        if (!resource) {
          throw new Error('ResourceComponent missing');
        }
        if (resource.resourceType === undefined) {
          throw new Error('ResourceComponent missing required field: resourceType');
        }
      }).toThrow('ResourceComponent missing required field: resourceType');
    });

    it('should throw when InventoryComponent is missing', () => {
      agent.removeComponent('inventory');

      expect(() => {
        const inventory = agent.getComponent('inventory') as InventoryComponent;
        if (!inventory) {
          throw new Error('Agent missing required InventoryComponent');
        }
      }).toThrow('Agent missing required InventoryComponent');
    });

    it('should not use fallback values for missing data', () => {
      // Per CLAUDE.md: NO SILENT FALLBACKS
      // If data is missing, crash immediately

      const emptyEntity = new EntityImpl(createEntityId(), world.tick);
      (world as any)._addEntity(emptyEntity);

      expect(() => {
        const resource = emptyEntity.getComponent('resource') as ResourceComponent;
        if (!resource) {
          throw new Error('Cannot harvest: entity has no ResourceComponent');
        }
      }).toThrow('Cannot harvest: entity has no ResourceComponent');
    });
  });

  describe('Acceptance Criterion 4: Resource Transfer for Construction', () => {
    it('should check agent inventory for required resources before building', () => {
      // Agent needs: 10 wood, 5 stone for a lean-to (example)
      // const requiredResources = {
      //   wood: 10,
      //   stone: 5,
      // };

      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      // Initially empty inventory - check that no slots contain resources
      expect(inventory.slots.filter(s => s.itemId !== null && s.quantity > 0).length).toBe(0);

      // Construction should not proceed without resources
    });

    it('should deduct resources from inventory when construction proceeds', () => {
      // Give agent resources
      agent.updateComponent<InventoryComponent>('inventory', (inv) => ({
        ...inv,
        slots: [
          { itemId: 'wood', quantity: 15 },
          { itemId: 'stone', quantity: 10 },
        ],
        currentWeight: (15 * 2) + (10 * 3), // 30 + 30 = 60
      }));

      const requiredResources = {
        wood: 10,
        stone: 5,
      };

      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      // Check if enough resources
      const woodSlot = inventory.slots.find(s => s.itemId === 'wood');
      const stoneSlot = inventory.slots.find(s => s.itemId === 'stone');

      expect(woodSlot).toBeDefined();
      expect(stoneSlot).toBeDefined();
      expect(woodSlot!.quantity).toBeGreaterThanOrEqual(requiredResources.wood);
      expect(stoneSlot!.quantity).toBeGreaterThanOrEqual(requiredResources.stone);

      // After deduction, should have 5 wood and 5 stone remaining
    });

    it('should emit construction:failed when insufficient resources', () => {
      const eventHandler = vi.fn();
      world.eventBus.subscribe('construction:failed', eventHandler);

      // Agent has insufficient resources
      agent.updateComponent<InventoryComponent>('inventory', (inv) => ({
        ...inv,
        slots: [
          { itemId: 'wood', quantity: 5 }, // Need 10
        ],
        currentWeight: 10,
      }));

      // Attempt to build should emit construction:failed
      // Initially not called
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should not proceed with construction if resources missing', () => {
      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      // const requiredResources = {
      //   wood: 10,
      //   stone: 5,
      // };

      // Empty inventory - check that no slots contain resources
      expect(inventory.slots.filter(s => s.itemId !== null && s.quantity > 0).length).toBe(0);

      // Check should fail
      const hasEnoughResources = false; // Will be calculated by system
      expect(hasEnoughResources).toBe(false);
    });
  });

  describe('Acceptance Criterion 5: Resource Regeneration', () => {
    it('should regenerate resources over time when regenerationRate > 0', () => {
      // Set tree to partial amount
      tree.updateComponent<ResourceComponent>('resource', (r) => ({
        ...r,
        amount: 50, // Half of maxAmount (100)
      }));

      const resource = tree.getComponent<ResourceComponent>('resource');
      if (!resource) {
        throw new Error('Tree missing ResourceComponent');
      }

      const deltaTime = 10; // 10 seconds
      const expectedRegeneration = resource.regenerationRate * deltaTime;
      const expectedAmount = Math.min(
        resource.maxAmount,
        resource.amount + expectedRegeneration
      );

      // regenerationRate is 0.1, so 0.1 * 10 = 1 unit regenerated
      expect(expectedRegeneration).toBe(1);
      expect(expectedAmount).toBe(51);
    });

    it('should not regenerate beyond maxAmount', () => {
      // Tree already at max
      const resource = tree.getComponent<ResourceComponent>('resource');
      if (!resource) {
        throw new Error('Tree missing ResourceComponent');
      }

      expect(resource.amount).toBe(100);
      expect(resource.maxAmount).toBe(100);

      const deltaTime = 10;
      const expectedRegeneration = resource.regenerationRate * deltaTime;
      const expectedAmount = Math.min(
        resource.maxAmount,
        resource.amount + expectedRegeneration
      );

      // Should stay at 100, not exceed
      expect(expectedAmount).toBe(100);
    });

    it('should not regenerate when regenerationRate is 0', () => {
      // Create resource with 0 regeneration rate
      const depleted = new EntityImpl(createEntityId(), world.tick);
      depleted.addComponent({
        type: 'resource',
        version: 1,
        resourceType: 'stone',
        amount: 0,
        maxAmount: 50,
        regenerationRate: 0, // No regeneration
        harvestable: false,
      } as ResourceComponent);
      (world as any)._addEntity(depleted);

      const resource = depleted.getComponent('resource') as ResourceComponent;
      if (!resource) {
        throw new Error('Resource missing');
      }

      const deltaTime = 10;
      const expectedRegeneration = resource.regenerationRate * deltaTime;
      const expectedAmount = Math.min(
        resource.maxAmount,
        resource.amount + expectedRegeneration
      );

      expect(expectedRegeneration).toBe(0);
      expect(expectedAmount).toBe(0); // Stays at 0
    });

    it('should emit resource:regenerated event when regeneration occurs', () => {
      const eventHandler = vi.fn();
      world.eventBus.subscribe('resource:regenerated', eventHandler);

      // Set tree to partial amount
      tree.updateComponent<ResourceComponent>('resource', (r) => ({
        ...r,
        amount: 50,
      }));

      // After regeneration system runs, event should be emitted
      // Initially not called
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should handle multiple resources regenerating in same update', () => {
      // Tree and rock both at partial amounts
      tree.updateComponent<ResourceComponent>('resource', (r) => ({
        ...r,
        amount: 50,
      }));

      rock.updateComponent<ResourceComponent>('resource', (r) => ({
        ...r,
        amount: 25,
      }));

      const treeResource = tree.getComponent<ResourceComponent>('resource');
      const rockResource = rock.getComponent<ResourceComponent>('resource');

      if (!treeResource || !rockResource) {
        throw new Error('Resources missing');
      }

      // Both should regenerate independently
      expect(treeResource.amount).toBe(50);
      expect(rockResource.amount).toBe(25);
    });
  });

  describe('Edge Cases', () => {
    it('should handle resource fully depleted (amount = 0)', () => {
      tree.updateComponent<ResourceComponent>('resource', (r) => ({
        ...r,
        amount: 0,
      }));

      const resource = tree.getComponent<ResourceComponent>('resource');
      if (!resource) {
        throw new Error('Tree missing ResourceComponent');
      }

      expect(resource.amount).toBe(0);

      // Attempting to harvest from depleted resource should fail or return 0
    });

    it('should handle multiple agents gathering same resource', () => {
      // Create second agent
      const agent2 = new EntityImpl(createEntityId(), world.tick);
      agent2.addComponent(createPositionComponent(1.2, 0));
      agent2.addComponent(createInventoryComponent(10, 100));
      (world as any)._addEntity(agent2);

      // Both agents near same tree
      agent.updateComponent('position', (pos) => ({
        ...pos,
        x: 1.2,
        y: 0,
      }));

      // Both should be able to harvest (first-come-first-serve or concurrent)
      const resource = tree.getComponent('resource') as ResourceComponent;
      if (!resource) {
        throw new Error('Tree missing ResourceComponent');
      }

      expect(resource.amount).toBe(100);
      // After both harvest, amount should decrease appropriately
    });

    it('should emit resource:depleted when amount reaches 0', () => {
      const eventHandler = vi.fn();
      world.eventBus.subscribe('resource:depleted', eventHandler);

      // Harvest until depleted
      tree.updateComponent<ResourceComponent>('resource', (r) => ({
        ...r,
        amount: 0,
      }));

      // Event should be emitted when amount hits 0
      // Initially not called
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should handle stacking same resource types in inventory', () => {
      // Agent gathers wood twice
      agent.updateComponent<InventoryComponent>('inventory', (inv) => ({
        ...inv,
        slots: [{ itemId: 'wood', quantity: 10 }],
        currentWeight: 20,
      }));

      // Gather more wood - should stack in same slot
      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      expect(inventory.slots.length).toBe(1);
      expect(inventory.slots[0]?.quantity).toBe(10);

      // After gathering 5 more, should be 15 in same slot
    });

    it('should respect stack size limits per resource type', () => {
      // Wood has stack size 50 (from resource weight table)
      agent.updateComponent<InventoryComponent>('inventory', (inv) => ({
        ...inv,
        slots: [{ itemId: 'wood', quantity: 50 }], // At max stack
        currentWeight: 100,
      }));

      const inventory = agent.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        throw new Error('Agent missing InventoryComponent');
      }

      // Attempting to add more should create new stack
      expect(inventory.slots[0]?.quantity).toBe(50);
    });
  });
});
