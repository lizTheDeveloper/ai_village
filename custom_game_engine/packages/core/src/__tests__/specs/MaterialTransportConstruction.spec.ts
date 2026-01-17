import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';
import type { ConstructionTask } from '../../systems/TileConstructionSystem.js';

/**
 * Material Transport and Construction System Specifications
 *
 * Per work order: Block-by-block construction with realistic material transport.
 * Agents must physically fetch materials from storage/inventory and bring them
 * to the construction site before building.
 *
 * Key Features:
 * - Phase 1: Material Transport - Agents fetch materials from storage
 * - Phase 2: Building - After materials delivered, agents construct tile
 * - XP rewards: 5 XP per material delivered, 10 XP per tile placed
 * - Relationship improvement: +2 per tile built together
 * - Emergent parallelization: Multiple agents working independently = natural speedup
 *   (2 agents = 2x throughput, no artificial bonuses)
 *
 * See: VOXEL_BUILDING_SYSTEM_PLAN.md Section 4
 */
describe('Material Transport and Construction System', () => {
  let world: WorldImpl;

  beforeEach(() => {
    world = new WorldImpl();
  });

  describe('Construction Task Creation', () => {
    describe('blueprint to tasks', () => {
      it('should create construction task for each tile in blueprint', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const tasks = world.getConstructionTasks();

        expect(tasks).toHaveLength(9); // 8 walls + 1 floor
        expect(tasks[0].tilePosition).toEqual({ x: 10, y: 10 });
        expect(tasks[0].requiredMaterials).toEqual({ 'wood_wall': 1 });
        expect(tasks[0].status).toBe('pending');
      });

      it('should calculate material requirements for each task', () => {
        const blueprint = world.createBlueprint({
          id: 'room_with_door',
          layout: ['###', 'D.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
          defaultDoorMaterial: 'wood_door',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const tasks = world.getConstructionTasks();
        const doorTask = tasks.find(t => t.tileType === 'door');

        expect(doorTask).toBeDefined();
        expect(doorTask?.requiredMaterials).toEqual({ 'wood_door': 1 });
      });

      it('should set construction priority based on tile type', () => {
        const blueprint = world.createBlueprint({
          id: 'room_with_door',
          layout: ['###', 'D.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
          defaultDoorMaterial: 'wood_door',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const tasks = world.getConstructionTasks();
        const floorTask = tasks.find(t => t.tileType === 'floor');
        const wallTask = tasks.find(t => t.tileType === 'wall');
        const doorTask = tasks.find(t => t.tileType === 'door');

        // Priority: floor > wall > door (build bottom-up)
        expect(floorTask?.priority).toBeGreaterThan(wallTask?.priority ?? 0);
        expect(wallTask?.priority).toBeGreaterThan(doorTask?.priority ?? 0);
      });
    });

    describe('task status lifecycle', () => {
      it('should track task status: pending → material_transport → building → complete', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###'],
          defaultWallMaterial: 'wood_wall',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const task = world.getConstructionTasks()[0];

        expect(task.status).toBe('pending');

        // Agent claims task
        const agent = world.createAgent({ position: { x: 5, y: 5 } });
        agent.claimConstructionTask(task);

        expect(task.status).toBe('material_transport');

        // Agent delivers materials
        agent.inventory.addItem('wood_wall', 1);
        agent.deliverMaterials(task);

        expect(task.status).toBe('building');

        // Agent builds tile
        agent.workOnConstruction(task);
        world.tick(60); // Construction time

        expect(task.status).toBe('complete');
      });

      it('should allow task to be unclaimed if agent abandons it', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###'],
          defaultWallMaterial: 'wood_wall',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const task = world.getConstructionTasks()[0];
        const agent = world.createAgent({ position: { x: 5, y: 5 } });

        agent.claimConstructionTask(task);
        expect(task.claimedBy).toBe(agent.id);

        agent.abandonConstructionTask(task);
        expect(task.claimedBy).toBeUndefined();
        expect(task.status).toBe('pending');
      });
    });
  });

  describe('Material Transport Phase', () => {
    describe('material source detection', () => {
      it('should find materials in agent inventory', () => {
        const agent = world.createAgent({ position: { x: 5, y: 5 } });
        agent.inventory.addItem('wood_wall', 5);

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        const source = agent.findMaterialSource(task);

        expect(source.type).toBe('inventory');
        expect(source.hasEnoughMaterials).toBe(true);
      });

      it('should find materials in nearby storage', () => {
        const storage = world.createEntity();
        storage.addComponent('position', { x: 8, y: 8 });
        storage.addComponent('storage', { items: { 'wood_wall': 20 } });

        const agent = world.createAgent({ position: { x: 5, y: 5 } });

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        const source = agent.findMaterialSource(task);

        expect(source.type).toBe('storage');
        expect(source.entityId).toBe(storage.id);
        expect(source.hasEnoughMaterials).toBe(true);
      });

      it('should prefer closest material source', () => {
        const farStorage = world.createEntity();
        farStorage.addComponent('position', { x: 50, y: 50 });
        farStorage.addComponent('storage', { items: { 'wood_wall': 20 } });

        const nearStorage = world.createEntity();
        nearStorage.addComponent('position', { x: 12, y: 12 });
        nearStorage.addComponent('storage', { items: { 'wood_wall': 20 } });

        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        const source = agent.findMaterialSource(task);

        expect(source.entityId).toBe(nearStorage.id);
      });

      it('should return no source if materials unavailable', () => {
        const agent = world.createAgent({ position: { x: 5, y: 5 } });

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        const source = agent.findMaterialSource(task);

        expect(source).toBeNull();
      });
    });

    describe('material fetching behavior', () => {
      it('should navigate to storage to fetch materials', () => {
        const storage = world.createEntity();
        storage.addComponent('position', { x: 20, y: 20 });
        storage.addComponent('storage', { items: { 'stone_wall': 50 } });

        const agent = world.createAgent({ position: { x: 5, y: 5 } });

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'stone_wall': 1 },
        });

        agent.claimConstructionTask(task);
        agent.startMaterialFetch(task);

        // Agent should path to storage
        expect(agent.currentBehavior).toBe('fetch_materials');
        expect(agent.navigationTarget).toEqual({ x: 20, y: 20 });
      });

      it('should withdraw materials from storage on arrival', () => {
        const storage = world.createEntity();
        storage.addComponent('position', { x: 20, y: 20 });
        storage.addComponent('storage', { items: { 'stone_wall': 50 } });

        const agent = world.createAgent({ position: { x: 20, y: 20 } }); // Already at storage

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'stone_wall': 1 },
        });

        agent.claimConstructionTask(task);
        agent.withdrawMaterialsFromStorage(storage, task);

        expect(agent.inventory.getItem('stone_wall').count).toBe(1);
        expect(storage.getComponent('storage').items['stone_wall']).toBe(49);
      });

      it('should navigate to construction site after fetching materials', () => {
        const storage = world.createEntity();
        storage.addComponent('position', { x: 20, y: 20 });
        storage.addComponent('storage', { items: { 'stone_wall': 50 } });

        const agent = world.createAgent({ position: { x: 20, y: 20 } });

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'stone_wall': 1 },
        });

        agent.claimConstructionTask(task);
        agent.withdrawMaterialsFromStorage(storage, task);
        agent.startMaterialDelivery(task);

        expect(agent.currentBehavior).toBe('deliver_materials');
        expect(agent.navigationTarget).toEqual({ x: 10, y: 10 });
      });
    });

    describe('material delivery', () => {
      it('should deliver materials to construction site', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        agent.inventory.addItem('wood_wall', 1);

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        agent.claimConstructionTask(task);
        agent.deliverMaterials(task);

        expect(task.status).toBe('building');
        expect(task.materialsDelivered).toEqual({ 'wood_wall': 1 });
        expect(agent.inventory.getItem('wood_wall').count).toBe(0);
      });

      it('should earn XP for delivering materials', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        agent.inventory.addItem('wood_wall', 1);

        const initialXP = agent.xp;

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        agent.claimConstructionTask(task);
        agent.deliverMaterials(task);

        expect(agent.xp).toBe(initialXP + 5); // 5 XP per material delivered
      });

      it('should throw if delivering without required materials', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        // Agent has no materials in inventory

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        agent.claimConstructionTask(task);

        expect(() => {
          agent.deliverMaterials(task);
        }).toThrow('Agent does not have required materials');
      });
    });
  });

  describe('Building Phase', () => {
    describe('construction progress', () => {
      it('should increase tile progress when agent works on it', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        // Deliver materials first
        agent.inventory.addItem('wood_wall', 1);
        agent.claimConstructionTask(task);
        agent.deliverMaterials(task);

        // Start building
        agent.workOnConstruction(task);

        const tile = world.getTileAt(10, 10);
        expect(tile.wall?.progress).toBeGreaterThan(0);
        expect(tile.wall?.builderId).toBe(agent.id);
      });

      it('should complete tile when progress reaches 100', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        // Deliver materials
        agent.inventory.addItem('wood_wall', 1);
        agent.claimConstructionTask(task);
        agent.deliverMaterials(task);

        // Work until complete
        agent.workOnConstruction(task);
        world.tick(60); // Assume 60 seconds to build

        const tile = world.getTileAt(10, 10);
        expect(tile.wall?.progress).toBe(100);
        expect(task.status).toBe('complete');
      });

      it('should earn XP for completing tile', () => {
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        const initialXP = agent.xp;

        const task = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        // Deliver materials
        agent.inventory.addItem('wood_wall', 1);
        agent.claimConstructionTask(task);
        agent.deliverMaterials(task);

        // Complete construction
        agent.workOnConstruction(task);
        world.tick(60);

        expect(agent.xp).toBe(initialXP + 5 + 10); // 5 for delivery + 10 for placement
      });

      it('should calculate construction speed based on agent skill', () => {
        const novice = world.createAgent({ position: { x: 10, y: 10 } });
        novice.skills.construction = 1;

        const expert = world.createAgent({ position: { x: 10, y: 10 } });
        expert.skills.construction = 10;

        const task1 = world.createConstructionTask({
          tilePosition: { x: 10, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        const task2 = world.createConstructionTask({
          tilePosition: { x: 11, y: 10 },
          tileType: 'wall',
          requiredMaterials: { 'wood_wall': 1 },
        });

        // Setup both agents with materials
        novice.inventory.addItem('wood_wall', 1);
        novice.claimConstructionTask(task1);
        novice.deliverMaterials(task1);

        expert.inventory.addItem('wood_wall', 1);
        expert.claimConstructionTask(task2);
        expert.deliverMaterials(task2);

        // Both work for same duration
        novice.workOnConstruction(task1);
        expert.workOnConstruction(task2);
        world.tick(30);

        const noviceTile = world.getTileAt(10, 10);
        const expertTile = world.getTileAt(11, 10);

        expect(expertTile.wall?.progress).toBeGreaterThan(noviceTile.wall?.progress ?? 0);
      });
    });

    describe('multi-agent construction', () => {
      it('should allow multiple agents to work on same blueprint independently', () => {
        const blueprint = world.createBlueprint({
          id: 'large_room',
          layout: [
            '#####',
            '#...#',
            '#...#',
            '#...#',
            '#####'
          ],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const agent1 = world.createAgent({ position: { x: 10, y: 10 } });
        const agent2 = world.createAgent({ position: { x: 14, y: 10 } });

        agent1.inventory.addItem('wood_wall', 10);
        agent2.inventory.addItem('wood_wall', 10);

        const tasks = world.getConstructionTasks();

        // Each agent claims different tasks
        agent1.claimConstructionTask(tasks[0]);
        agent2.claimConstructionTask(tasks[1]);

        expect(tasks[0].claimedBy).toBe(agent1.id);
        expect(tasks[1].claimedBy).toBe(agent2.id);
      });

      it('should not allow multiple agents to claim same task', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###'],
          defaultWallMaterial: 'wood_wall',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const agent1 = world.createAgent({ position: { x: 10, y: 10 } });
        const agent2 = world.createAgent({ position: { x: 10, y: 10 } });

        const task = world.getConstructionTasks()[0];

        agent1.claimConstructionTask(task);

        expect(() => {
          agent2.claimConstructionTask(task);
        }).toThrow('Task already claimed by another agent');
      });

      it('should achieve emergent parallelization (2 agents = 2x throughput)', () => {
        const blueprint = world.createBlueprint({
          id: 'large_room',
          layout: [
            '######',
            '#....#',
            '#....#',
            '######'
          ],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        // Test 1: Single agent
        world.placeBlueprint(blueprint, 10, 10);
        const agent1 = world.createAgent({ position: { x: 10, y: 10 } });
        agent1.inventory.addItem('wood_wall', 100);
        agent1.inventory.addItem('wood_floor', 100);

        const startTime1 = world.tick;
        const tasks1 = world.getConstructionTasks();

        // Agent 1 completes all tasks
        tasks1.forEach(task => {
          agent1.claimConstructionTask(task);
          agent1.deliverMaterials(task);
          agent1.workOnConstruction(task);
        });

        world.tick(1000); // Wait for completion
        const singleAgentTime = world.tick - startTime1;

        // Test 2: Two agents
        world.reset();
        world.placeBlueprint(blueprint, 10, 10);

        const agentA = world.createAgent({ position: { x: 10, y: 10 } });
        const agentB = world.createAgent({ position: { x: 14, y: 10 } });

        agentA.inventory.addItem('wood_wall', 100);
        agentA.inventory.addItem('wood_floor', 100);
        agentB.inventory.addItem('wood_wall', 100);
        agentB.inventory.addItem('wood_floor', 100);

        const startTime2 = world.tick;
        const tasks2 = world.getConstructionTasks();

        // Agents work independently on different tasks
        const half = Math.floor(tasks2.length / 2);
        tasks2.slice(0, half).forEach(task => {
          agentA.claimConstructionTask(task);
          agentA.deliverMaterials(task);
          agentA.workOnConstruction(task);
        });

        tasks2.slice(half).forEach(task => {
          agentB.claimConstructionTask(task);
          agentB.deliverMaterials(task);
          agentB.workOnConstruction(task);
        });

        world.tick(1000);
        const twoAgentTime = world.tick - startTime2;

        // Two agents should complete in ~half the time (emergent parallelization)
        expect(twoAgentTime).toBeLessThan(singleAgentTime * 0.6);
      });
    });
  });

  describe('Social Effects of Collaborative Building', () => {
    describe('relationship improvement', () => {
      it('should improve relationship when agents build together', () => {
        const blueprint = world.createBlueprint({
          id: 'shared_house',
          layout: ['####', '#..#', '####'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const agent1 = world.createAgent({ position: { x: 10, y: 10 } });
        const agent2 = world.createAgent({ position: { x: 11, y: 10 } });

        agent1.inventory.addItem('wood_wall', 10);
        agent2.inventory.addItem('wood_wall', 10);

        const initialRelationship = agent1.getRelationshipWith(agent2);

        const tasks = world.getConstructionTasks();

        // Agent 1 builds first tile
        agent1.claimConstructionTask(tasks[0]);
        agent1.deliverMaterials(tasks[0]);
        agent1.workOnConstruction(tasks[0]);
        world.tick(60);

        // Agent 2 builds second tile (on same blueprint)
        agent2.claimConstructionTask(tasks[1]);
        agent2.deliverMaterials(tasks[1]);
        agent2.workOnConstruction(tasks[1]);
        world.tick(60);

        const finalRelationship = agent1.getRelationshipWith(agent2);

        expect(finalRelationship).toBeGreaterThan(initialRelationship);
      });

      it('should gain +2 relationship per tile built on same blueprint', () => {
        const blueprint = world.createBlueprint({
          id: 'shared_house',
          layout: ['###'],
          defaultWallMaterial: 'wood_wall',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const agent1 = world.createAgent({ position: { x: 10, y: 10 } });
        const agent2 = world.createAgent({ position: { x: 11, y: 10 } });

        agent1.inventory.addItem('wood_wall', 10);
        agent2.inventory.addItem('wood_wall', 10);

        const initialRelationship = agent1.getRelationshipWith(agent2);

        const tasks = world.getConstructionTasks();

        // Both agents work on blueprint
        agent1.claimConstructionTask(tasks[0]);
        agent1.deliverMaterials(tasks[0]);
        agent1.workOnConstruction(tasks[0]);
        world.tick(60); // Complete first tile

        agent2.claimConstructionTask(tasks[1]);
        agent2.deliverMaterials(tasks[1]);
        agent2.workOnConstruction(tasks[1]);
        world.tick(60); // Complete second tile

        const finalRelationship = agent1.getRelationshipWith(agent2);

        // Each agent completed 1 tile, so +2 relationship
        expect(finalRelationship).toBe(initialRelationship + 2);
      });

      it('should not improve relationship if agents work on different blueprints', () => {
        const blueprint1 = world.createBlueprint({
          id: 'house1',
          layout: ['###'],
          defaultWallMaterial: 'wood_wall',
        });

        const blueprint2 = world.createBlueprint({
          id: 'house2',
          layout: ['###'],
          defaultWallMaterial: 'wood_wall',
        });

        world.placeBlueprint(blueprint1, 10, 10);
        world.placeBlueprint(blueprint2, 20, 20);

        const agent1 = world.createAgent({ position: { x: 10, y: 10 } });
        const agent2 = world.createAgent({ position: { x: 20, y: 20 } });

        agent1.inventory.addItem('wood_wall', 10);
        agent2.inventory.addItem('wood_wall', 10);

        const initialRelationship = agent1.getRelationshipWith(agent2);

        const tasks = world.getConstructionTasks();

        // Agents work on separate blueprints
        const house1Tasks = tasks.filter(t => t.blueprintId === 'house1');
        const house2Tasks = tasks.filter(t => t.blueprintId === 'house2');

        agent1.claimConstructionTask(house1Tasks[0]);
        agent1.deliverMaterials(house1Tasks[0]);
        agent1.workOnConstruction(house1Tasks[0]);
        world.tick(60);

        agent2.claimConstructionTask(house2Tasks[0]);
        agent2.deliverMaterials(house2Tasks[0]);
        agent2.workOnConstruction(house2Tasks[0]);
        world.tick(60);

        const finalRelationship = agent1.getRelationshipWith(agent2);

        expect(finalRelationship).toBe(initialRelationship); // No change
      });
    });

    describe('team building effects', () => {
      it('should create "built together" memory', () => {
        const blueprint = world.createBlueprint({
          id: 'shared_house',
          layout: ['###'],
          defaultWallMaterial: 'wood_wall',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const agent1 = world.createAgent({ position: { x: 10, y: 10 } });
        const agent2 = world.createAgent({ position: { x: 11, y: 10 } });

        agent1.inventory.addItem('wood_wall', 10);
        agent2.inventory.addItem('wood_wall', 10);

        const tasks = world.getConstructionTasks();

        // Both agents work on blueprint
        agent1.claimConstructionTask(tasks[0]);
        agent1.deliverMaterials(tasks[0]);
        agent1.workOnConstruction(tasks[0]);
        world.tick(60);

        agent2.claimConstructionTask(tasks[1]);
        agent2.deliverMaterials(tasks[1]);
        agent2.workOnConstruction(tasks[1]);
        world.tick(60);

        // Check for memory
        const agent1Memories = agent1.getMemories();
        const builtTogetherMemory = agent1Memories.find(m => m.type === 'built_together');

        expect(builtTogetherMemory).toBeDefined();
        expect(builtTogetherMemory?.participants).toContain(agent2.id);
        expect(builtTogetherMemory?.blueprintId).toBe('shared_house');
      });
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw if claiming task that does not exist', () => {
      const agent = world.createAgent({ position: { x: 10, y: 10 } });

      // Create a minimal valid ConstructionTask object that doesn't exist in world's task registry
      // Testing error path: task has valid structure but is not registered in the system
      const nonexistentTask: ConstructionTask = {
        id: 'nonexistent',
        blueprintId: 'fake_blueprint',
        originPosition: { x: 0, y: 0 },
        rotation: 0,
        tiles: [],
        state: 'planned',
        createdAt: 0,
        activeBuilders: new Set(),
        totalTiles: 0,
        tilesPlaced: 0,
      };

      expect(() => {
        agent.claimConstructionTask(nonexistentTask);
      }).toThrow('Construction task not found');
    });

    it('should throw if delivering materials without claiming task', () => {
      const agent = world.createAgent({ position: { x: 10, y: 10 } });
      agent.inventory.addItem('wood_wall', 1);

      const task = world.createConstructionTask({
        tilePosition: { x: 10, y: 10 },
        tileType: 'wall',
        requiredMaterials: { 'wood_wall': 1 },
      });

      expect(() => {
        agent.deliverMaterials(task);
      }).toThrow('Task not claimed by this agent');
    });

    it('should throw if working on task without delivering materials', () => {
      const agent = world.createAgent({ position: { x: 10, y: 10 } });

      const task = world.createConstructionTask({
        tilePosition: { x: 10, y: 10 },
        tileType: 'wall',
        requiredMaterials: { 'wood_wall': 1 },
      });

      agent.claimConstructionTask(task);

      expect(() => {
        agent.workOnConstruction(task);
      }).toThrow('Materials not delivered for this task');
    });

    it('should throw if agent too far from construction site to work', () => {
      const agent = world.createAgent({ position: { x: 100, y: 100 } }); // Far away

      const task = world.createConstructionTask({
        tilePosition: { x: 10, y: 10 },
        tileType: 'wall',
        requiredMaterials: { 'wood_wall': 1 },
      });

      agent.inventory.addItem('wood_wall', 1);
      agent.claimConstructionTask(task);
      agent.deliverMaterials(task);

      expect(() => {
        agent.workOnConstruction(task);
      }).toThrow('Agent too far from construction site (max range: 2)');
    });

    it('should throw if withdrawing materials from storage without capacity', () => {
      const storage = world.createEntity();
      storage.addComponent('position', { x: 10, y: 10 });
      storage.addComponent('storage', { items: { 'stone_wall': 1 } });

      const agent = world.createAgent({ position: { x: 10, y: 10 } });
      agent.inventory.maxCapacity = 0; // No capacity

      const task = world.createConstructionTask({
        tilePosition: { x: 10, y: 10 },
        tileType: 'wall',
        requiredMaterials: { 'stone_wall': 1 },
      });

      expect(() => {
        agent.withdrawMaterialsFromStorage(storage, task);
      }).toThrow('Insufficient inventory capacity');
    });
  });
});
