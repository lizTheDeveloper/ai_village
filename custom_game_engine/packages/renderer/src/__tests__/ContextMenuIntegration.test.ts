import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContextMenuManager } from '../ContextMenuManager';
import { World, EventBusImpl } from '@ai-village/core';
import { Camera } from '../Camera';
import { InputHandler } from '../InputHandler';

describe('ContextMenu Integration', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let camera: Camera;
  let canvas: HTMLCanvasElement;
  let contextMenu: ContextMenuManager;
  let inputHandler: InputHandler;


  // Helper: Convert tile coordinates to screen coordinates
  // Entities use tile coordinates, but worldToScreen expects world pixels
  const TILE_SIZE = 16;
  function tileToScreen(tileX: number, tileY: number): { x: number; y: number } {
    const worldPixelX = tileX * TILE_SIZE;
    const worldPixelY = tileY * TILE_SIZE;
    return camera.worldToScreen(worldPixelX, worldPixelY);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    world = new World();
    eventBus = new EventBusImpl();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    // Mock getBoundingClientRect for context menu position calculations
    canvas.getBoundingClientRect = () => ({
      width: 800,
      height: 600,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {}
    });
    camera = new Camera(800, 600);
    contextMenu = new ContextMenuManager(world, eventBus, camera, canvas);
    inputHandler = new InputHandler(canvas, camera, eventBus);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Full workflow: Agent interaction', () => {
    it('should handle complete agent follow workflow', () => {
      // Setup: Create two agents
      const selectedAgent = world.createEntity();
      selectedAgent.addComponent({ type: 'position', version: 1, x: 10, y: 10 });
      selectedAgent.addComponent({ type: 'agent', version: 1, name: 'Follower' });
      selectedAgent.addComponent({ type: 'selectable', version: 1, selected: true });

      const targetAgent = world.createEntity();
      targetAgent.addComponent({ type: 'position', version: 1, x: 100, y: 100 });
      targetAgent.addComponent({ type: 'agent', version: 1, name: 'Leader' });

      // Step 1: Right-click on target agent
      const screenPos = tileToScreen(100, 100);
      contextMenu.open(screenPos.x, screenPos.y);

      expect(contextMenu.isOpen()).toBe(true);

      // Step 2: Verify "Follow" action is available
      const actions = contextMenu.getVisibleItems();
      const followAction = actions.find(a => a.actionId === 'follow');
      expect(followAction).toBeDefined();
      expect(followAction?.enabled).toBe(true);

      // Step 3: Execute follow action
      const actionHandler = vi.fn();
      eventBus.on('action:follow', actionHandler);

      contextMenu.executeAction(followAction!.id);
      eventBus.flush(); // Flush action event

      // Step 4: Verify action was executed
      expect(actionHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            followerId: selectedAgent.id,
            targetId: targetAgent.id
          })
        })
      );

      // Step 5: Verify menu closed
      expect(contextMenu.isOpen()).toBe(false);
    });

    it('should handle talk to workflow', () => {
      const agent1 = world.createEntity();
      agent1.addComponent({ type: 'position', version: 1, x: 10, y: 10 });
      agent1.addComponent({ type: 'agent', version: 1, name: 'Agent 1' });
      agent1.addComponent({ type: 'selectable', version: 1, selected: true });

      const agent2 = world.createEntity();
      agent2.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
      agent2.addComponent({ type: 'agent', version: 1, name: 'Agent 2' });

      const screenPos = tileToScreen(50, 50);
      contextMenu.open(screenPos.x, screenPos.y);

      const talkAction = contextMenu.getVisibleItems().find(a => a.actionId === 'talk_to');
      expect(talkAction).toBeDefined();

      const conversationHandler = vi.fn();
      eventBus.on('conversation:start', conversationHandler);

      contextMenu.executeAction(talkAction!.id);
      eventBus.flush(); // Flush conversation event

      expect(conversationHandler).toHaveBeenCalled();
      expect(contextMenu.isOpen()).toBe(false);
    });

    it('should handle inspect workflow', () => {
      const agent = world.createEntity();
      agent.addComponent({ type: 'position', version: 1, x: 75, y: 75 });
      agent.addComponent({ type: 'agent', version: 1, name: 'Test Agent', health: 100 });

      const screenPos = tileToScreen(75, 75);
      contextMenu.open(screenPos.x, screenPos.y);

      const inspectAction = contextMenu.getVisibleItems().find(a => a.actionId === 'inspect');
      expect(inspectAction).toBeDefined();

      const panelHandler = vi.fn();
      eventBus.on('ui:panel:open', panelHandler);

      contextMenu.executeAction(inspectAction!.id);
      eventBus.flush(); // Flush panel event

      expect(panelHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            panelType: 'agent_info',
            entityId: agent.id
          })
        })
      );
    });
  });

  describe('Full workflow: Building interaction', () => {
    it('should handle building demolish workflow with confirmation', () => {
      const building = world.createEntity();
      building.addComponent({ type: 'position', version: 1, x: 150, y: 150 });
      building.addComponent({ type: 'building', version: 1, buildingType: 'house',
        health: 1.0,
        canEnter: false,
        locked: false });

      const screenPos = tileToScreen(150, 150);
      contextMenu.open(screenPos.x, screenPos.y);

      const demolishAction = contextMenu.getVisibleItems().find(a => a.actionId === 'demolish');
      expect(demolishAction).toBeDefined();
      expect(demolishAction?.requiresConfirmation).toBe(true);

      // Step 1: Execute action shows confirmation
      const confirmationHandler = vi.fn();
      eventBus.on('ui:confirmation:show', confirmationHandler);

      contextMenu.executeAction(demolishAction!.id);
      eventBus.flush(); // Flush confirmation event

      expect(confirmationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionId: 'demolish',
            consequences: expect.arrayContaining([
              expect.stringContaining('removed'),
              expect.stringContaining('recovered')
            ])
          })
        })
      );

      // Step 2: User confirms
      const demolishHandler = vi.fn();
      eventBus.on('action:demolish', demolishHandler);

      const context = contextMenu.getContext();
      eventBus.emit({
        type: 'ui:confirmation:confirmed' as any,
        source: 'world',
        data: {
          actionId: 'demolish',
          context
        }
      } as any);
      eventBus.flush(); // Flush confirmation event (triggers confirmHandler)
      eventBus.flush(); // Flush action:demolish event (emitted by confirmHandler)

      expect(demolishHandler).toHaveBeenCalled();
    });

    it('should handle building repair workflow', () => {
      const building = world.createEntity();
      building.addComponent({ type: 'position', version: 1, x: 150, y: 150 });
      building.addComponent({ type: 'building', version: 1, buildingType: 'house',
        health: 0.6,
        canEnter: false,
        locked: false });

      const screenPos = tileToScreen(150, 150);
      contextMenu.open(screenPos.x, screenPos.y);

      const repairAction = contextMenu.getVisibleItems().find(a => a.actionId === 'repair');
      expect(repairAction).toBeDefined();

      const repairHandler = vi.fn();
      eventBus.on('action:repair', repairHandler);

      contextMenu.executeAction(repairAction!.id);
      eventBus.flush(); // Flush repair event

      expect(repairHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            buildingId: building.id
          })
        })
      );
    });

    it('should handle building enter workflow', () => {
      const building = world.createEntity();
      building.addComponent({ type: 'position', version: 1, x: 150, y: 150 });
      building.addComponent({ type: 'building', version: 1, buildingType: 'house',
        health: 1.0,
        canEnter: true,
        locked: false });

      const agent = world.createEntity();
      agent.addComponent({ type: 'position', version: 1, x: 130, y: 130 }); // Moved further away (28.3 units)
      agent.addComponent({ type: 'agent', version: 1, name: 'Agent' });
      agent.addComponent({ type: 'selectable', version: 1, selected: true });

      const screenPos = tileToScreen(150, 150);
      contextMenu.open(screenPos.x, screenPos.y);

      const enterAction = contextMenu.getVisibleItems().find(a => a.actionId === 'enter');
      expect(enterAction).toBeDefined();
      expect(enterAction?.enabled).toBe(true);

      const enterHandler = vi.fn();
      eventBus.on('action:enter_building', enterHandler);

      contextMenu.executeAction(enterAction!.id);
      eventBus.flush(); // Flush enter event

      expect(enterHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agentId: agent.id,
            buildingId: building.id
          })
        })
      );
    });
  });

  describe('Full workflow: Resource harvesting', () => {
    it('should handle harvest workflow', () => {
      const resource = world.createEntity();
      resource.addComponent({ type: 'position', version: 1, x: 200, y: 200 });
      resource.addComponent({ type: 'harvestable', version: 1, resourceType: 'berries',
        amount: 15,
        maxAmount: 20 });

      const screenPos = tileToScreen(200, 200);
      contextMenu.open(screenPos.x, screenPos.y);

      const harvestAction = contextMenu.getVisibleItems().find(a => a.actionId === 'harvest');
      expect(harvestAction).toBeDefined();
      expect(harvestAction?.enabled).toBe(true);

      const harvestHandler = vi.fn();
      eventBus.on('action:harvest', harvestHandler);

      contextMenu.executeAction(harvestAction!.id);
      eventBus.flush(); // Flush harvest event

      expect(harvestHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceId: resource.id,
            resourceType: 'berries'
          })
        })
      );
    });

    it('should handle assign worker workflow', () => {
      const resource = world.createEntity();
      resource.addComponent({ type: 'position', version: 1, x: 200, y: 200 });
      resource.addComponent({ type: 'harvestable', version: 1, resourceType: 'wood', amount: 10 });

      const worker = world.createEntity();
      worker.addComponent({ type: 'position', version: 1, x: 180, y: 180 }); // Moved further away (20 units distance)
      worker.addComponent({ type: 'agent', version: 1, name: 'Worker' });
      worker.addComponent({ type: 'selectable', version: 1, selected: true });

      const screenPos = tileToScreen(200, 200);
      contextMenu.open(screenPos.x, screenPos.y);

      const assignAction = contextMenu.getVisibleItems().find(a => a.actionId === 'assign_worker');
      expect(assignAction).toBeDefined();
      expect(assignAction?.enabled).toBe(true);

      const assignHandler = vi.fn();
      eventBus.on('action:assign_worker', assignHandler);

      contextMenu.executeAction(assignAction!.id);
      eventBus.flush(); // Flush assign event

      expect(assignHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workerId: worker.id,
            resourceId: resource.id
          })
        })
      );
    });

    it('should handle prioritize workflow with submenu', () => {
      const resource = world.createEntity();
      resource.addComponent({ type: 'position', version: 1, x: 200, y: 200 });
      resource.addComponent({ type: 'harvestable', version: 1, resourceType: 'stone', amount: 5 });

      const screenPos = tileToScreen(200, 200);
      contextMenu.open(screenPos.x, screenPos.y);

      const priorityAction = contextMenu.getVisibleItems().find(a => a.actionId === 'prioritize');
      expect(priorityAction).toBeDefined();
      expect(priorityAction?.hasSubmenu).toBe(true);

      // Open submenu
      contextMenu.hoverItem(priorityAction!.id);
      vi.advanceTimersByTime(300);

      const submenuItems = contextMenu.getSubmenuItems(priorityAction!.id);
      const highPriority = submenuItems?.find(item => item.actionId === 'priority_high');
      expect(highPriority).toBeDefined();

      const priorityHandler = vi.fn();
      eventBus.on('action:set_priority', priorityHandler);

      contextMenu.executeAction(highPriority!.id);
      eventBus.flush(); // Flush priority event

      expect(priorityHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceId: resource.id,
            priority: 'high'
          })
        })
      );
    });
  });

  describe('Full workflow: Multi-agent selection', () => {
    it('should handle move all here workflow', () => {
      const agents = [];
      for (let i = 0; i < 3; i++) {
        const agent = world.createEntity();
        agent.addComponent({ type: 'position', version: 1, x: 10 + i * 5, y: 10 + i * 5 });
        agent.addComponent('agent', { name: `Agent ${i}` });
        agent.addComponent({ type: 'selectable', version: 1, selected: true });
        agents.push(agent);
      }

      // Right-click on empty tile
      contextMenu.open(400, 300);

      const moveAllAction = contextMenu.getVisibleItems().find(a => a.actionId === 'move_all_here');
      expect(moveAllAction).toBeDefined();

      const moveHandler = vi.fn();
      eventBus.on('action:move', moveHandler);

      contextMenu.executeAction(moveAllAction!.id);
      eventBus.flush(); // Flush move events

      // Should emit move action for each agent
      expect(moveHandler).toHaveBeenCalledTimes(3);
    });

    it('should handle create group workflow', () => {
      for (let i = 0; i < 4; i++) {
        const agent = world.createEntity();
        agent.addComponent({ type: 'position', version: 1, x: 10 + i * 5, y: 10 + i * 5 });
        agent.addComponent('agent', { name: `Agent ${i}` });
        agent.addComponent({ type: 'selectable', version: 1, selected: true });
      }

      contextMenu.open(400, 300);

      const groupAction = contextMenu.getVisibleItems().find(a => a.actionId === 'create_group');
      expect(groupAction).toBeDefined();

      const groupHandler = vi.fn();
      eventBus.on('action:create_group', groupHandler);

      contextMenu.executeAction(groupAction!.id);
      eventBus.flush(); // Flush group event

      expect(groupHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agentIds: expect.arrayContaining([expect.any(String)])
          })
        })
      );
    });

    it('should handle formation submenu workflow', () => {
      for (let i = 0; i < 5; i++) {
        const agent = world.createEntity();
        agent.addComponent({ type: 'position', version: 1, x: 10 + i * 5, y: 10 + i * 5 });
        agent.addComponent('agent', { name: `Agent ${i}` });
        agent.addComponent({ type: 'selectable', version: 1, selected: true });
      }

      contextMenu.open(400, 300);

      const formationAction = contextMenu.getVisibleItems().find(a => a.actionId === 'formation');
      expect(formationAction).toBeDefined();
      expect(formationAction?.hasSubmenu).toBe(true);

      // Open submenu
      contextMenu.hoverItem(formationAction!.id);
      vi.advanceTimersByTime(300);

      const submenu = contextMenu.getSubmenuItems(formationAction!.id);
      const lineFormation = submenu?.find(item => item.actionId === 'formation_line');
      expect(lineFormation).toBeDefined();

      const formationHandler = vi.fn();
      eventBus.on('action:set_formation', formationHandler);

      contextMenu.executeAction(lineFormation!.id);
      eventBus.flush(); // Flush formation event

      expect(formationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            formationType: 'line'
          })
        })
      );
    });
  });

  describe('Full workflow: Empty tile actions', () => {
    it('should handle build submenu workflow', () => {
      contextMenu.open(400, 300);

      const buildAction = contextMenu.getVisibleItems().find(a => a.actionId === 'build');
      expect(buildAction).toBeDefined();
      expect(buildAction?.hasSubmenu).toBe(true);

      // Open building categories submenu
      contextMenu.hoverItem(buildAction!.id);
      vi.advanceTimersByTime(300);

      const categories = contextMenu.getSubmenuItems(buildAction!.id);
      expect(categories).toBeDefined();
      expect(categories!.length).toBeGreaterThan(0);

      const residentialCategory = categories?.find(c => c.label.includes('Residential'));
      expect(residentialCategory).toBeDefined();

      // Select category
      const buildUIHandler = vi.fn();
      eventBus.on('ui:building_placement:open', buildUIHandler);

      contextMenu.executeAction(residentialCategory!.id);
      eventBus.flush(); // Flush build UI event

      expect(buildUIHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: expect.any(String)
          })
        })
      );
    });

    it('should handle place waypoint workflow', () => {
      contextMenu.open(400, 300);

      const waypointAction = contextMenu.getVisibleItems().find(a => a.actionId === 'place_waypoint');
      expect(waypointAction).toBeDefined();

      const waypointHandler = vi.fn();
      eventBus.on('action:place_waypoint', waypointHandler);

      contextMenu.executeAction(waypointAction!.id);
      eventBus.flush(); // Flush waypoint event

      const worldPos = camera.screenToWorld(400, 300);
      expect(waypointHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            x: expect.closeTo(worldPos.x, 1),
            y: expect.closeTo(worldPos.y, 1)
          })
        })
      );
    });

    it('should handle focus camera workflow', () => {
      contextMenu.open(400, 300);

      const focusAction = contextMenu.getVisibleItems().find(a => a.actionId === 'focus_camera');
      expect(focusAction).toBeDefined();

      const cameraHandler = vi.fn();
      eventBus.on('camera:focus', cameraHandler);

      contextMenu.executeAction(focusAction!.id);
      eventBus.flush(); // Flush camera event

      const worldPos = camera.screenToWorld(400, 300);
      expect(cameraHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            x: expect.closeTo(worldPos.x, 1),
            y: expect.closeTo(worldPos.y, 1)
          })
        })
      );
    });
  });

  describe('InputHandler integration', () => {
    it('should open menu on right-click event', () => {
      const handler = vi.fn();
      eventBus.on('ui:contextmenu:opened', handler);

      // Simulate right-click
      eventBus.emit({
        type: 'input:rightclick' as any,
        source: 'world',
        data: { x: 400, y: 300 }
      } as any);
      eventBus.flush(); // Flush input:rightclick event (triggers rightClickHandler)
      eventBus.flush(); // Flush ui:contextmenu:opened event (emitted by open())

      expect(handler).toHaveBeenCalled();
      expect(contextMenu.isOpen()).toBe(true);
    });

    // Note: Camera drag prevention is InputHandler's responsibility, not ContextMenuManager's.
    // ContextMenuManager only emits ui:contextmenu:opened/closed events.
    // InputHandler should listen to these events and decide whether to allow camera drag.
    // These tests have been removed as they test the wrong component.
  });

  describe('Keyboard shortcut integration', () => {
    it('should execute action when shortcut pressed with menu open', () => {
      const agent = world.createEntity();
      agent.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
      agent.addComponent({ type: 'agent', version: 1, name: 'Agent' });

      const screenPos = tileToScreen(50, 50);
      contextMenu.open(screenPos.x, screenPos.y);

      const inspectAction = contextMenu.getVisibleItems().find(a => a.actionId === 'inspect');
      const shortcut = inspectAction?.shortcut;
      expect(shortcut).toBeDefined();

      const handler = vi.fn();
      eventBus.on('ui:panel:open', handler);

      contextMenu.handleKeyPress(shortcut!);
      eventBus.flush(); // Flush panel event

      expect(handler).toHaveBeenCalled();
      expect(contextMenu.isOpen()).toBe(false);
    });

    it('should support context-aware shortcuts without menu', () => {
      const agent = world.createEntity();
      agent.addComponent({ type: 'position', version: 1, x: 50, y: 50 });
      agent.addComponent({ type: 'agent', version: 1, name: 'Agent' });
      agent.addComponent({ type: 'selectable', version: 1, selected: true });

      const worldPos = camera.screenToWorld(400, 300);
      contextMenu.setHoverPosition(worldPos.x, worldPos.y);

      const moveHandler = vi.fn();
      eventBus.on('action:move', moveHandler);

      // Press 'M' for move without opening menu
      contextMenu.handleShortcut('m');
      eventBus.flush(); // Flush move event

      expect(moveHandler).toHaveBeenCalled();
    });
  });

  describe('Error recovery', () => {
    it('should emit failure event when action execution throws', () => {
      // Register a custom action that throws
      const throwingAction = {
        id: 'test_throwing_action',
        label: 'Throwing Test',
        icon: 'test',
        category: 'test' as const,
        isApplicable: () => true,
        execute: () => {
          throw new Error('Action execution failed');
        }
      };

      // Access the registry directly to register our test action
      const registry = (contextMenu as any).registry as any;
      registry.register(throwingAction);

      // Open menu at any position
      contextMenu.open(400, 300);

      // Find the throwing action in visible items
      const items = contextMenu.getVisibleItems();
      const throwingItem = items.find(item => item.actionId === 'test_throwing_action');
      expect(throwingItem).toBeDefined();

      // Listen for failure event
      const failHandler = vi.fn();
      eventBus.on('ui:contextmenu:action_executed', failHandler);

      // Execute the throwing action - should throw and emit failure event
      expect(() => {
        contextMenu.executeAction(throwingItem!.id);
      }).toThrow('Action execution failed');

      eventBus.flush(); // Flush ui:contextmenu:action_executed event

      // Verify failure event was emitted
      expect(failHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            success: false,
            actionId: 'test_throwing_action'
          })
        })
      );
    });

    it('should close menu on Escape even during animation', () => {
      contextMenu.open(400, 300);

      // Press Escape during animation
      contextMenu.handleKeyPress('Escape');

      expect(contextMenu.isOpen()).toBe(false);
    });
  });
});
