import { describe, it, expect, beforeEach } from 'vitest';
import { MenuContext } from '../context-menu/MenuContext';
import { World as World } from '@ai-village/core';
import { Camera } from '../Camera';

// TODO: Not implemented - tests skipped
describe.skip('MenuContext', () => {
  let world: World;
  let camera: Camera;
  let canvas: HTMLCanvasElement;


  // Helper: Convert tile coordinates to screen coordinates
  // Entities use tile coordinates, but worldToScreen expects world pixels
  const TILE_SIZE = 16;
  function tileToScreen(tileX: number, tileY: number): { x: number; y: number } {
    const worldPixelX = tileX * TILE_SIZE;
    const worldPixelY = tileY * TILE_SIZE;
    return camera.worldToScreen(worldPixelX, worldPixelY);
  }

  beforeEach(() => {
    world = new World();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    camera = new Camera(800, 600);
  });

  describe('fromClick', () => {
    it('should create context from screen coordinates', () => {
      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context).toBeDefined();
      expect(context.screenPosition).toEqual({ x: 400, y: 300 });
      expect(context.worldPosition).toBeDefined();
    });

    it('should detect empty tile when no entities at position', () => {
      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.targetType).toBe('empty_tile');
      expect(context.targetEntity).toBeNull();
    });

    it('should detect agent at position', () => {
      const agent = world.createEntity();
      agent.addComponent('position', { x: 50, y: 50 });
      agent.addComponent('agent', { name: 'Test Agent' });

      const screenPos = tileToScreen(50, 50);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.targetType).toBe('agent');
      expect(context.targetEntity).toBe(agent.id);
    });

    it('should detect building at position', () => {
      const building = world.createEntity();
      building.addComponent('position', { x: 100, y: 100 });
      building.addComponent('building', { type: 'house', health: 1.0 });

      const screenPos = tileToScreen(100, 100);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.targetType).toBe('building');
      expect(context.targetEntity).toBe(building.id);
    });

    it('should detect resource at position', () => {
      const resource = world.createEntity();
      resource.addComponent('position', { x: 75, y: 75 });
      resource.addComponent('harvestable', { resourceType: 'berries', amount: 10 });

      const screenPos = tileToScreen(75, 75);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.targetType).toBe('resource');
      expect(context.targetEntity).toBe(resource.id);
    });

    it('should prioritize agents over buildings when both present', () => {
      const building = world.createEntity();
      building.addComponent('position', { x: 50, y: 50 });
      building.addComponent('building', { type: 'house', health: 1.0 });

      const agent = world.createEntity();
      agent.addComponent('position', { x: 50, y: 50 });
      agent.addComponent('agent', { name: 'Agent' });

      const screenPos = tileToScreen(50, 50);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.targetType).toBe('agent');
      expect(context.targetEntity).toBe(agent.id);
    });

    it('should prioritize buildings over resources when both present', () => {
      const resource = world.createEntity();
      resource.addComponent('position', { x: 75, y: 75 });
      resource.addComponent('harvestable', { resourceType: 'wood', amount: 5 });

      const building = world.createEntity();
      building.addComponent('position', { x: 75, y: 75 });
      building.addComponent('building', { type: 'storage', health: 1.0 });

      const screenPos = tileToScreen(75, 75);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.targetType).toBe('building');
      expect(context.targetEntity).toBe(building.id);
    });

    it('should include all selected entities in context', () => {
      const agent1 = world.createEntity();
      agent1.addComponent('position', { x: 10, y: 10 });
      agent1.addComponent('agent', { name: 'Agent 1' });
      agent1.addComponent('selectable', { selected: true });

      const agent2 = world.createEntity();
      agent2.addComponent('position', { x: 20, y: 20 });
      agent2.addComponent('agent', { name: 'Agent 2' });
      agent2.addComponent('selectable', { selected: true });

      const agent3 = world.createEntity();
      agent3.addComponent('position', { x: 30, y: 30 });
      agent3.addComponent('agent', { name: 'Agent 3' });
      agent3.addComponent('selectable', { selected: false });

      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.selectedEntities).toHaveLength(2);
      expect(context.selectedEntities).toContain(agent1.id);
      expect(context.selectedEntities).toContain(agent2.id);
      expect(context.selectedEntities).not.toContain(agent3.id);
    });

    it('should include walkable state for empty tiles', () => {
      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.isWalkable).toBeDefined();
      expect(typeof context.isWalkable).toBe('boolean');
    });

    it('should include buildable state for empty tiles', () => {
      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.isBuildable).toBeDefined();
      expect(typeof context.isBuildable).toBe('boolean');
    });
  });

  describe('hasSelection', () => {
    it('should return true when entities are selected', () => {
      const agent = world.createEntity();
      agent.addComponent('position', { x: 10, y: 10 });
      agent.addComponent('agent', { name: 'Agent' });
      agent.addComponent('selectable', { selected: true });

      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.hasSelection()).toBe(true);
    });

    it('should return false when no entities selected', () => {
      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.hasSelection()).toBe(false);
    });
  });

  describe('getSelectedCount', () => {
    it('should return count of selected entities', () => {
      for (let i = 0; i < 5; i++) {
        const agent = world.createEntity();
        agent.addComponent('position', { x: i * 10, y: i * 10 });
        agent.addComponent('agent', { name: `Agent ${i}` });
        agent.addComponent('selectable', { selected: true });
      }

      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.getSelectedCount()).toBe(5);
    });

    it('should return 0 when nothing selected', () => {
      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.getSelectedCount()).toBe(0);
    });
  });

  describe('hasSelectedAgents', () => {
    it('should return true when agents are selected', () => {
      const agent = world.createEntity();
      agent.addComponent('position', { x: 10, y: 10 });
      agent.addComponent('agent', { name: 'Agent' });
      agent.addComponent('selectable', { selected: true });

      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.hasSelectedAgents()).toBe(true);
    });

    it('should return false when only buildings selected', () => {
      const building = world.createEntity();
      building.addComponent('position', { x: 50, y: 50 });
      building.addComponent('building', { type: 'house', health: 1.0 });
      building.addComponent('selectable', { selected: true });

      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.hasSelectedAgents()).toBe(false);
    });
  });

  describe('getTargetEntity', () => {
    it('should return entity object for target', () => {
      const agent = world.createEntity();
      agent.addComponent('position', { x: 50, y: 50 });
      agent.addComponent('agent', { name: 'Target' });

      const screenPos = tileToScreen(50, 50);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      const targetEntity = context.getTargetEntity(world);
      expect(targetEntity).toBeDefined();
      expect(targetEntity?.id).toBe(agent.id);
    });

    it('should return null when no target entity', () => {
      const context = MenuContext.fromClick(world, camera, 400, 300);

      const targetEntity = context.getTargetEntity(world);
      expect(targetEntity).toBeNull();
    });
  });

  describe('getSelectedEntities', () => {
    it('should return array of selected entity objects', () => {
      const agents = [];
      for (let i = 0; i < 3; i++) {
        const agent = world.createEntity();
        agent.addComponent('position', { x: i * 10, y: i * 10 });
        agent.addComponent('agent', { name: `Agent ${i}` });
        agent.addComponent('selectable', { selected: true });
        agents.push(agent);
      }

      const context = MenuContext.fromClick(world, camera, 400, 300);

      const selectedEntities = context.getSelectedEntities(world);
      expect(selectedEntities).toHaveLength(3);
      expect(selectedEntities.map(e => e.id)).toEqual(agents.map(a => a.id));
    });
  });

  describe('isActionApplicable', () => {
    it('should return true for "move_here" on walkable tile with agent selection', () => {
      const agent = world.createEntity();
      agent.addComponent('position', { x: 10, y: 10 });
      agent.addComponent('agent', { name: 'Agent' });
      agent.addComponent('selectable', { selected: true });

      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.isActionApplicable('move_here')).toBe(true);
    });

    it('should return false for "move_here" without selection', () => {
      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.isActionApplicable('move_here')).toBe(false);
    });

    it('should return true for "follow" on agent target with agent selected', () => {
      const selectedAgent = world.createEntity();
      selectedAgent.addComponent('position', { x: 10, y: 10 });
      selectedAgent.addComponent('agent', { name: 'Selected' });
      selectedAgent.addComponent('selectable', { selected: true });

      const targetAgent = world.createEntity();
      targetAgent.addComponent('position', { x: 50, y: 50 });
      targetAgent.addComponent('agent', { name: 'Target' });

      const screenPos = tileToScreen(50, 50);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.isActionApplicable('follow')).toBe(true);
    });

    it('should return false for "follow" without selection', () => {
      const targetAgent = world.createEntity();
      targetAgent.addComponent('position', { x: 50, y: 50 });
      targetAgent.addComponent('agent', { name: 'Target' });

      const screenPos = tileToScreen(50, 50);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.isActionApplicable('follow')).toBe(false);
    });

    it('should return true for "harvest" on resource with amount > 0', () => {
      const resource = world.createEntity();
      resource.addComponent('position', { x: 75, y: 75 });
      resource.addComponent('harvestable', { resourceType: 'berries', amount: 10 });

      const screenPos = tileToScreen(75, 75);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.isActionApplicable('harvest')).toBe(true);
    });

    it('should return false for "harvest" on depleted resource', () => {
      const resource = world.createEntity();
      resource.addComponent('position', { x: 75, y: 75 });
      resource.addComponent('harvestable', { resourceType: 'berries', amount: 0 });

      const screenPos = tileToScreen(75, 75);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.isActionApplicable('harvest')).toBe(false);
    });

    it('should return true for "repair" on damaged building', () => {
      const building = world.createEntity();
      building.addComponent('position', { x: 100, y: 100 });
      building.addComponent('building', { type: 'house', health: 0.5 });

      const screenPos = tileToScreen(100, 100);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.isActionApplicable('repair')).toBe(true);
    });

    it('should return false for "repair" on full health building', () => {
      const building = world.createEntity();
      building.addComponent('position', { x: 100, y: 100 });
      building.addComponent('building', { type: 'house', health: 1.0 });

      const screenPos = tileToScreen(100, 100);
      const context = MenuContext.fromClick(world, camera, screenPos.x, screenPos.y);

      expect(context.isActionApplicable('repair')).toBe(false);
    });

    it('should return true for "build" on buildable empty tile', () => {
      const context = MenuContext.fromClick(world, camera, 400, 300);
      // Assuming tile is buildable by default

      expect(context.isActionApplicable('build')).toBe(true);
    });

    it('should return true for "create_group" with multi-agent selection', () => {
      for (let i = 0; i < 3; i++) {
        const agent = world.createEntity();
        agent.addComponent('position', { x: i * 10, y: i * 10 });
        agent.addComponent('agent', { name: `Agent ${i}` });
        agent.addComponent('selectable', { selected: true });
      }

      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.isActionApplicable('create_group')).toBe(true);
    });

    it('should return false for "create_group" with single selection', () => {
      const agent = world.createEntity();
      agent.addComponent('position', { x: 10, y: 10 });
      agent.addComponent('agent', { name: 'Agent' });
      agent.addComponent('selectable', { selected: true });

      const context = MenuContext.fromClick(world, camera, 400, 300);

      expect(context.isActionApplicable('create_group')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw when world is missing', () => {
      expect(() => {
        MenuContext.fromClick(null as any, camera, 400, 300);
      }).toThrow('world');
    });

    it('should throw when camera is missing', () => {
      expect(() => {
        MenuContext.fromClick(world, null as any, 400, 300);
      }).toThrow('camera');
    });

    it('should throw when screen coordinates are invalid', () => {
      expect(() => {
        MenuContext.fromClick(world, camera, NaN, 300);
      }).toThrow();
    });

    it('should throw when screen coordinates are negative', () => {
      expect(() => {
        MenuContext.fromClick(world, camera, -10, 300);
      }).toThrow();
    });
  });
});
