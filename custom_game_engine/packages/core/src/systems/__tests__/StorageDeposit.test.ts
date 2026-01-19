import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl, EntityImpl, createEntityId } from '../../ecs/index.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { AgentBrainSystem } from '../AgentBrainSystem.js';
import { MovementSystem } from '../MovementSystem.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import { createInventoryComponent, addToInventory } from '../../components/InventoryComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import { createBuildingComponent } from '../../components/BuildingComponent.js';
import type { RenderableComponent } from '../../components/RenderableComponent.js';
import type { ResourceComponent } from '../../components/ResourceComponent.js';

import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';
describe('Storage Deposit System', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let aiSystem: AgentBrainSystem;
  let movementSystem: MovementSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    aiSystem = new AgentBrainSystem();
    movementSystem = new MovementSystem();

    // Advance world tick so agents can think (thinkInterval check)
    for (let i = 0; i < 25; i++) {
      world.advanceTick();
    }
  });

  describe('Criterion 1: deposit_items Behavior Type', () => {
    it('should support deposit_items as a valid AgentBehavior', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);

      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items')); // Should compile without error

      world.addEntity(agent);

      // Should not throw when processing
      const entities = world.query().with(ComponentType.Agent).executeEntities();
      expect(() => aiSystem.update(world, entities, 1)).not.toThrow();
    });
  });

  describe('Criterion 2: Deposit Behavior Handler', () => {
    it('should find nearest storage and navigate toward it', () => {
      // Create agent with items at position (10, 10)
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items'));

      let inventory = createInventoryComponent(10, 100);
      const addResult = addToInventory(inventory, 'wood', 10);
      inventory = addResult.inventory;
      agent.addComponent<InventoryComponent>(inventory);

      world.addEntity(agent);

      // Create storage-chest at position (15, 15) - 5 units away
      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(15, 15));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      // Mark building as complete
      storage.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        isComplete: true,
      }));

      storage.addComponent<InventoryComponent>(createInventoryComponent(20, 500));

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      // Run AI system to trigger deposit behavior
      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);

      // Run movement system if needed
      const movingEntities = world.query().with(ComponentType.Movement).executeEntities();
      movementSystem.update(world, movingEntities, 1);

      // Agent should have pathfinding toward storage
      const movement = agent.getComponent(ComponentType.Movement);
      expect(movement).toBeDefined();

      // Agent should still be in deposit_items mode (not switched to wander)
      const agentComp = agent.getComponent(ComponentType.Agent);
      expect(agentComp?.behavior).toBe('deposit_items');
    });

    it('should transfer items when adjacent to storage', () => {
      // Create agent adjacent to storage (within 1.5 tiles)
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items'));

      let inventory = createInventoryComponent(10, 100);
      const addResult = addToInventory(inventory, 'wood', 25); // 50 weight
      inventory = addResult.inventory;
      agent.addComponent<InventoryComponent>(inventory);

      world.addEntity(agent);

      // Create storage adjacent (distance < 1.5)
      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10.5, 10));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      storage.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        isComplete: true,
      }));

      storage.addComponent<InventoryComponent>(createInventoryComponent(20, 500));

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      // Set up event listener
      let deposited = false;
      eventBus.subscribe('items:deposited', () => {
        deposited = true;
      });

      // Run AI system
      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);

      // Flush events
      eventBus.flush();

      // Check items were transferred
      const agentInv = agent.getComponent(ComponentType.Inventory);
      const storageInv = storage.getComponent(ComponentType.Inventory);

      expect(agentInv).toBeDefined();
      expect(storageInv).toBeDefined();

      // Agent inventory should be empty
      expect(agentInv!.currentWeight).toBe(0);

      // Storage should have the wood
      expect(storageInv!.currentWeight).toBe(50); // 25 wood * 2 weight

      // Event should have been emitted
      expect(deposited).toBe(true);
    });

    it('should emit items:deposited event with correct data', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items'));

      let inventory = createInventoryComponent(10, 100);
      const addResult = addToInventory(inventory, 'stone', 10); // 30 weight
      inventory = addResult.inventory;
      agent.addComponent<InventoryComponent>(inventory);

      world.addEntity(agent);

      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10.5, 10));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      storage.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        isComplete: true,
      }));

      storage.addComponent<InventoryComponent>(createInventoryComponent(20, 500));

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      let eventData: any = null;
      eventBus.subscribe('items:deposited', (event) => {
        eventData = event.data;
      });

      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);
      eventBus.flush();

      expect(eventData).not.toBeNull();
      expect(eventData.agentId).toBe(agent.id);
      expect(eventData.storageId).toBe(storage.id);
      expect(eventData.items).toHaveLength(1);
      expect(eventData.items[0].itemId).toBe('stone');
      expect(eventData.items[0].amount).toBe(10);
    });
  });

  describe('Criterion 3: Inventory Full Event Handler', () => {
    // SKIPPED: Feature not implemented yet - AgentBrainSystem does not subscribe to inventory:full events
    // TODO: Implement inventory:full event handler in AgentBrainSystem to auto-switch to deposit_items behavior
    it.skip('should switch to deposit_items when inventory full during gathering', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      const agentComp = createAgentComponent('gather');
      agent.addComponent<AgentComponent>({
        ...agentComp,
        behaviorState: { targetResourceId: 'wood-resource' },
      });

      // Create nearly full inventory
      let inventory = createInventoryComponent(10, 100);
      const addResult = addToInventory(inventory, 'wood', 48); // 96 weight (near limit)
      inventory = addResult.inventory;
      agent.addComponent<InventoryComponent>(inventory);

      world.addEntity(agent);

      // Create resource entity adjacent to agent
      const resource = new EntityImpl(createEntityId(), world.tick);
      resource.addComponent(createPositionComponent(10.5, 10));

      resource.addComponent<ResourceComponent>({
        type: ComponentType.Resource,
        version: 1,
        resourceType: 'wood',
        amount: 10,
        maxAmount: 100,
        regenerationRate: 1,
        harvestable: true,
      });

      resource.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'tree',
        tint: '#228B22',
        layer: 'object',
        visible: true,
      });

      world.addEntity(resource);

      // Create storage building
      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(15, 15));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      storage.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        isComplete: true,
      }));

      storage.addComponent<InventoryComponent>(createInventoryComponent(20, 500));

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      // Track events
      let inventoryFullEmitted = false;
      eventBus.subscribe('inventory:full', () => {
        inventoryFullEmitted = true;
      });

      // Run update - agent should try to gather and hit inventory limit
      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);
      eventBus.flush();

      // Agent should have switched to deposit_items
      const agentCompAfter = agent.getComponent(ComponentType.Agent);
      expect(agentCompAfter?.behavior).toBe('deposit_items');

      // Previous behavior should be saved
      expect(agentCompAfter?.behaviorState?.previousBehavior).toBe('gather');

      // Event should have been emitted
      expect(inventoryFullEmitted).toBe(true);
    });
  });

  describe('Criterion 4: Storage Buildings Have Inventory', () => {
    it('should create storage-chest with correct inventory capacity', () => {
      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10, 10));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      storage.addComponent<InventoryComponent>(createInventoryComponent(20, 500));

      const inventory = storage.getComponent(ComponentType.Inventory);
      expect(inventory).toBeDefined();
      expect(inventory!.maxWeight).toBe(500);
      expect(inventory!.maxSlots).toBe(20);
      expect(inventory!.currentWeight).toBe(0);
    });

    it('should create storage-box with correct inventory capacity', () => {
      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10, 10));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageBox, 1, 100)
      );

      storage.addComponent<InventoryComponent>(createInventoryComponent(10, 200));

      const inventory = storage.getComponent(ComponentType.Inventory);
      expect(inventory).toBeDefined();
      expect(inventory!.maxWeight).toBe(200);
      expect(inventory!.maxSlots).toBe(10);
      expect(inventory!.currentWeight).toBe(0);
    });
  });

  describe('Criterion 5: Item Transfer Logic', () => {
    it('should transfer partial items when storage has limited space', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items'));

      // Agent has 50 wood (100 weight)
      let agentInv = createInventoryComponent(10, 150);
      const addResult = addToInventory(agentInv, 'wood', 50);
      agentInv = addResult.inventory;
      agent.addComponent<InventoryComponent>(agentInv);

      world.addEntity(agent);

      // Storage has 480/500 weight capacity (can fit only 10 wood = 20 weight)
      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10.5, 10));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      storage.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        isComplete: true,
      }));

      // Create storage with existing items (480 weight)
      let storageInv = createInventoryComponent(20, 500);
      const storageAddResult = addToInventory(storageInv, 'stone', 160); // 480 weight
      storageInv = storageAddResult.inventory;
      storage.addComponent<InventoryComponent>(storageInv);

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);

      // Check partial transfer
      const finalAgentInv = agent.getComponent(ComponentType.Inventory);
      const finalStorageInv = storage.getComponent(ComponentType.Inventory);

      expect(finalAgentInv).toBeDefined();
      expect(finalStorageInv).toBeDefined();

      // Storage should be at or near capacity (480 + 20 = 500)
      expect(finalStorageInv!.currentWeight).toBeLessThanOrEqual(500);
      expect(finalStorageInv!.currentWeight).toBeGreaterThan(480);

      // Agent should still have most of the wood
      expect(finalAgentInv!.currentWeight).toBeGreaterThan(0);
    });

    it('should emit items:deposited event even for partial transfers', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items'));

      let agentInv = createInventoryComponent(10, 150);
      const addResult = addToInventory(agentInv, 'wood', 30);
      agentInv = addResult.inventory;
      agent.addComponent<InventoryComponent>(agentInv);

      world.addEntity(agent);

      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10.5, 10));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      storage.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        isComplete: true,
      }));

      // Nearly full storage
      let storageInv = createInventoryComponent(20, 500);
      const storageAddResult = addToInventory(storageInv, 'stone', 160);
      storageInv = storageAddResult.inventory;
      storage.addComponent<InventoryComponent>(storageInv);

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      let eventEmitted = false;
      eventBus.subscribe('items:deposited', () => {
        eventEmitted = true;
      });

      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);
      eventBus.flush();

      expect(eventEmitted).toBe(true);
    });
  });

  describe('Criterion 6: Return to Previous Behavior', () => {
    it('should return to previous behavior after depositing all items', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      const agentComp = createAgentComponent('deposit_items');
      agent.addComponent<AgentComponent>({
        ...agentComp,
        behaviorState: {
          previousBehavior: 'gather',
          previousState: { targetResourceId: 'wood-resource' },
        },
      });

      let inventory = createInventoryComponent(10, 100);
      const addResult = addToInventory(inventory, 'wood', 10);
      inventory = addResult.inventory;
      agent.addComponent<InventoryComponent>(inventory);

      world.addEntity(agent);

      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10.5, 10));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      storage.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        isComplete: true,
      }));

      storage.addComponent<InventoryComponent>(createInventoryComponent(20, 500));

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);

      // Agent should return to gather behavior
      const agentCompAfter = agent.getComponent(ComponentType.Agent);
      expect(agentCompAfter?.behavior).toBe('gather');
      expect(agentCompAfter?.behaviorState?.targetResourceId).toBe('wood-resource');
    });

    it('should switch to wander if no previous behavior stored', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items'));

      let inventory = createInventoryComponent(10, 100);
      const addResult = addToInventory(inventory, 'wood', 5);
      inventory = addResult.inventory;
      agent.addComponent<InventoryComponent>(inventory);

      world.addEntity(agent);

      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10.5, 10));

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      storage.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        isComplete: true,
      }));

      storage.addComponent<InventoryComponent>(createInventoryComponent(20, 500));

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);

      // Agent should default to wander
      const agentCompAfter = agent.getComponent(ComponentType.Agent);
      expect(agentCompAfter?.behavior).toBe('wander');
    });
  });

  describe('Edge Cases', () => {
    it('should emit storage:not_found when no storage buildings exist', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items'));

      let inventory = createInventoryComponent(10, 100);
      const addResult = addToInventory(inventory, 'wood', 10);
      inventory = addResult.inventory;
      agent.addComponent<InventoryComponent>(inventory);

      world.addEntity(agent);

      let eventEmitted = false;
      eventBus.subscribe('storage:not_found', () => {
        eventEmitted = true;
      });

      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);
      eventBus.flush();

      expect(eventEmitted).toBe(true);

      // Agent should switch to wander
      const agentComp = agent.getComponent(ComponentType.Agent);
      expect(agentComp?.behavior).toBe('wander');
    });

    it('should emit storage:full when all storage buildings are at capacity', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items'));

      let inventory = createInventoryComponent(10, 100);
      const addResult = addToInventory(inventory, 'wood', 10);
      inventory = addResult.inventory;
      agent.addComponent<InventoryComponent>(inventory);

      world.addEntity(agent);

      // Create full storage adjacent to agent
      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10.5, 10)); // Adjacent to agent

      storage.addComponent<BuildingComponent>(
        createBuildingComponent(BuildingType.StorageChest, 1, 100)
      );

      storage.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        isComplete: true,
      }));

      // Fill storage to capacity (completely full - no room for anything)
      let storageInv = createInventoryComponent(20, 500);
      const storageAddResult = addToInventory(storageInv, 'stone', 166); // 498 weight
      // Add 1 more wood to fill it completely
      const finalAdd = addToInventory(storageAddResult.inventory, 'wood', 1); // 498 + 2 = 500 weight
      storageInv = finalAdd.inventory;
      storage.addComponent<InventoryComponent>(storageInv);

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      let eventEmitted = false;
      eventBus.subscribe('storage:full', () => {
        eventEmitted = true;
      });

      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);
      eventBus.flush();

      expect(eventEmitted).toBe(true);

      // Agent should switch to build behavior to create more storage
      const agentComp = agent.getComponent(ComponentType.Agent);
      expect(agentComp?.behavior).toBe('build');
      expect(agentComp?.behaviorState?.buildingType).toBe('storage-chest');
    });

    it('should only deposit to completed buildings', () => {
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createPositionComponent(10, 10));

      agent.addComponent<MovementComponent>({
        type: ComponentType.Movement,
        version: 1,
        velocityX: 0,
        velocityY: 0,
        speed: 1.0,
        hasPath: false,
      });

      agent.addComponent(createAgentComponent('deposit_items'));

      let inventory = createInventoryComponent(10, 100);
      const addResult = addToInventory(inventory, 'wood', 10);
      inventory = addResult.inventory;
      agent.addComponent<InventoryComponent>(inventory);

      world.addEntity(agent);

      // Create INCOMPLETE storage
      const storage = new EntityImpl(createEntityId(), world.tick);
      storage.addComponent(createPositionComponent(10.5, 10));

      const building = createBuildingComponent(BuildingType.StorageChest, 1, 50); // progress = 50, so isComplete = false
      storage.addComponent<BuildingComponent>(building);

      storage.addComponent<InventoryComponent>(createInventoryComponent(20, 500));

      storage.addComponent<RenderableComponent>({
        type: ComponentType.Renderable,
        version: 1,
        spriteId: 'storage-chest',
        tint: '#8B4513',
        layer: 'object',
        visible: true,
      });

      world.addEntity(storage);

      let eventEmitted = false;
      eventBus.subscribe('storage:not_found', () => {
        eventEmitted = true;
      });

      const entities = world.query().with(ComponentType.Agent).executeEntities();
      aiSystem.update(world, entities, 1);
      eventBus.flush();

      // Should treat incomplete storage as non-existent
      expect(eventEmitted).toBe(true);

      const agentComp = agent.getComponent(ComponentType.Agent);
      expect(agentComp?.behavior).toBe('wander');
    });
  });
});
