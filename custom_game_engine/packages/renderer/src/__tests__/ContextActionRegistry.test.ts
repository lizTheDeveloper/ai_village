import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextActionRegistry } from '../context-menu/ContextActionRegistry';
import { MenuContext } from '../context-menu/MenuContext';
import { WorldImpl, EventBusImpl } from '@ai-village/core';

describe('ContextActionRegistry', () => {
  let registry: ContextActionRegistry;
  let world: WorldImpl;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    world = new WorldImpl();
    eventBus = new EventBusImpl();
    registry = new ContextActionRegistry(world, eventBus);
  });

  describe('registration', () => {
    it('should register action with required fields', () => {
      const initialCount = registry.getAll().length;

      registry.register({
        id: 'test_action_unique_123',
        label: 'Test Action',
        icon: 'test-icon',
        execute: vi.fn(),
        isApplicable: () => true
      });

      const actions = registry.getAll();
      expect(actions).toHaveLength(initialCount + 1);
      expect(actions.some(a => a.id === 'test_action_unique_123')).toBe(true);
    });

    it('should allow optional shortcut', () => {
      registry.register({
        id: 'test_action_shortcut_456',
        label: 'Test Action',
        icon: 'test-icon',
        shortcut: 'Q',
        execute: vi.fn(),
        isApplicable: () => true
      });

      const action = registry.get('test_action_shortcut_456');
      expect(action?.shortcut).toBe('Q');
    });

    it('should allow actions with submenus', () => {
      registry.register({
        id: 'parent_action_unique_789',
        label: 'Parent',
        icon: 'parent-icon',
        hasSubmenu: true,
        submenu: [
          {
            id: 'child_action_unique',
            label: 'Child',
            icon: 'child-icon',
            execute: vi.fn(),
            isApplicable: () => true
          }
        ],
        isApplicable: () => true
      });

      const action = registry.get('parent_action_unique_789');
      expect(action?.hasSubmenu).toBe(true);
      expect(action?.submenu).toHaveLength(1);
    });

    it('should allow confirmation requirement', () => {
      registry.register({
        id: 'destructive_action_unique_abc',
        label: 'Delete',
        icon: 'delete-icon',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure?',
        consequences: ['Data will be lost'],
        execute: vi.fn(),
        isApplicable: () => true
      });

      const action = registry.get('destructive_action_unique_abc');
      expect(action?.requiresConfirmation).toBe(true);
      expect(action?.confirmationMessage).toBe('Are you sure?');
      expect(action?.consequences).toEqual(['Data will be lost']);
    });

    it('should throw when registering duplicate action ID', () => {
      registry.register({
        id: 'duplicate_test_unique_xyz',
        label: 'First',
        icon: 'icon',
        execute: vi.fn(),
        isApplicable: () => true
      });

      expect(() => {
        registry.register({
          id: 'duplicate_test_unique_xyz',
          label: 'Second',
          icon: 'icon',
          execute: vi.fn(),
          isApplicable: () => true
        });
      }).toThrow('duplicate');
    });

    it('should throw when action missing required fields', () => {
      expect(() => {
        registry.register({
          id: 'invalid_test_999',
          // Missing label
          icon: 'icon',
          execute: vi.fn(),
          isApplicable: () => true
        } as any);
      }).toThrow('label');
    });
  });

  describe('getApplicableActions', () => {
    beforeEach(() => {
      // Register test actions with unique IDs
      registry.register({
        id: 'always_applicable_test_xyz',
        label: 'Always',
        icon: 'icon',
        execute: vi.fn(),
        isApplicable: () => true
      });

      registry.register({
        id: 'never_applicable_test_xyz',
        label: 'Never',
        icon: 'icon',
        execute: vi.fn(),
        isApplicable: () => false
      });

      registry.register({
        id: 'agent_only_test_xyz',
        label: 'Agent Only',
        icon: 'icon',
        execute: vi.fn(),
        isApplicable: (context) => context.targetType === 'agent'
      });

      registry.register({
        id: 'requires_selection_test_xyz',
        label: 'Needs Selection',
        icon: 'icon',
        execute: vi.fn(),
        isApplicable: (context) => context.hasSelection()
      });
    });

    it('should filter actions based on context applicability', () => {
      const mockContext = {
        targetType: 'empty_tile',
        targetEntity: null,
        selectedEntities: [],
        worldPosition: { x: 0, y: 0, z: 0 },
        screenPosition: { x: 0, y: 0 },
        isWalkable: true,
        isBuildable: true,
        hasSelection: () => false,
        getSelectedCount: () => 0,
        hasSelectedAgents: () => false,
        getTargetEntity: () => null,
        getSelectedEntities: () => [],
        isActionApplicable: () => false
      } as MenuContext;

      const applicable = registry.getApplicableActions(mockContext);

      expect(applicable.some(a => a.id === 'always_applicable_test_xyz')).toBe(true);
      expect(applicable.some(a => a.id === 'never_applicable_test_xyz')).toBe(false);
      expect(applicable.some(a => a.id === 'agent_only_test_xyz')).toBe(false);
      expect(applicable.some(a => a.id === 'requires_selection_test_xyz')).toBe(false);
    });

    it('should include agent-specific actions for agent context', () => {
      const mockContext = {
        targetType: 'agent',
        targetEntity: 'agent1',
        selectedEntities: [],
        worldPosition: { x: 0, y: 0, z: 0 },
        screenPosition: { x: 0, y: 0 },
        isWalkable: true,
        isBuildable: false,
        hasSelection: () => false,
        getSelectedCount: () => 0,
        hasSelectedAgents: () => false,
        getTargetEntity: () => null,
        getSelectedEntities: () => [],
        isActionApplicable: () => false
      } as MenuContext;

      const applicable = registry.getApplicableActions(mockContext);

      expect(applicable.some(a => a.id === 'agent_only_test_xyz')).toBe(true);
    });

    it('should include selection actions when entities selected', () => {
      const mockContext = {
        targetType: 'empty_tile',
        targetEntity: null,
        selectedEntities: ['agent1'],
        worldPosition: { x: 0, y: 0, z: 0 },
        screenPosition: { x: 0, y: 0 },
        isWalkable: true,
        isBuildable: true,
        hasSelection: () => true,
        getSelectedCount: () => 1,
        hasSelectedAgents: () => true,
        getTargetEntity: () => null,
        getSelectedEntities: () => [],
        isActionApplicable: () => false
      } as MenuContext;

      const applicable = registry.getApplicableActions(mockContext);

      expect(applicable.some(a => a.id === 'requires_selection_test_xyz')).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute action with context', () => {
      const executeFn = vi.fn();
      registry.register({
        id: 'test_action_exec_111',
        label: 'Test',
        icon: 'icon',
        execute: executeFn,
        isApplicable: () => true
      });

      const mockContext = { targetType: 'empty_tile' } as MenuContext;
      registry.execute('test_action_exec_111', mockContext);

      expect(executeFn).toHaveBeenCalledWith(mockContext, world, eventBus);
    });

    it('should emit action_executed event on success', () => {
      const handler = vi.fn();
      eventBus.subscribe('ui:contextmenu:action_executed', handler);

      registry.register({
        id: 'test_action_emit_222',
        label: 'Test',
        icon: 'icon',
        execute: vi.fn(),
        isApplicable: () => true
      });

      const mockContext = { targetType: 'empty_tile' } as MenuContext;
      registry.execute('test_action_emit_222', mockContext);

      // Events are queued, need to flush
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui:contextmenu:action_executed',
          data: expect.objectContaining({
            actionId: 'test_action_emit_222',
            success: true
          })
        })
      );
    });

    it('should emit event with success=false on failure', () => {
      const handler = vi.fn();
      eventBus.subscribe('ui:contextmenu:action_executed', handler);

      registry.register({
        id: 'failing_action_test_333',
        label: 'Fail',
        icon: 'icon',
        execute: () => {
          throw new Error('Test error');
        },
        isApplicable: () => true
      });

      const mockContext = { targetType: 'empty_tile' } as MenuContext;

      expect(() => {
        registry.execute('failing_action_test_333', mockContext);
      }).toThrow('Test error');

      // Events are queued, need to flush
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui:contextmenu:action_executed',
          data: expect.objectContaining({
            actionId: 'failing_action_test_333',
            success: false
          })
        })
      );
    });

    it('should throw when executing non-existent action', () => {
      const mockContext = { targetType: 'empty_tile' } as MenuContext;

      expect(() => {
        registry.execute('non_existent_action_xyz', mockContext);
      }).toThrow('action');
    });
  });

  describe('getActionsByCategory', () => {
    beforeEach(() => {
      registry.register({
        id: 'move_test_cat_aaa',
        label: 'Move',
        icon: 'move-icon',
        category: 'test_movement',
        execute: vi.fn(),
        isApplicable: () => true
      });

      registry.register({
        id: 'attack_test_cat_bbb',
        label: 'Attack',
        icon: 'attack-icon',
        category: 'combat',
        execute: vi.fn(),
        isApplicable: () => true
      });

      registry.register({
        id: 'harvest_test_cat_ccc',
        label: 'Harvest',
        icon: 'harvest-icon',
        category: 'test_gathering',
        execute: vi.fn(),
        isApplicable: () => true
      });
    });

    it('should group actions by category', () => {
      const movement = registry.getActionsByCategory('test_movement');
      expect(movement.some(a => a.id === 'move_test_cat_aaa')).toBe(true);

      const combat = registry.getActionsByCategory('combat');
      expect(combat.some(a => a.id === 'attack_test_cat_bbb')).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const nonExistent = registry.getActionsByCategory('totally_non_existent_category_12345');
      expect(nonExistent).toHaveLength(0);
    });
  });

  describe('default actions', () => {
    it('should include Move Here action', () => {
      const action = registry.get('move_here');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Move');
    });

    it('should include Follow action', () => {
      const action = registry.get('follow');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Follow');
    });

    it('should include Talk To action', () => {
      const action = registry.get('talk_to');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Talk');
    });

    it('should include Inspect action', () => {
      const action = registry.get('inspect');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Inspect');
    });

    it('should include Enter action', () => {
      const action = registry.get('enter');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Enter');
    });

    it('should include Repair action', () => {
      const action = registry.get('repair');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Repair');
    });

    it('should include Demolish action', () => {
      const action = registry.get('demolish');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Demolish');
      expect(action?.requiresConfirmation).toBe(true);
    });

    it('should include Build action with submenu', () => {
      const action = registry.get('build');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Build');
      expect(action?.hasSubmenu).toBe(true);
    });

    it('should include Harvest action', () => {
      const action = registry.get('harvest');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Harvest');
    });

    it('should include Assign Worker action', () => {
      const action = registry.get('assign_worker');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Assign');
    });

    it('should include Prioritize action with submenu', () => {
      const action = registry.get('prioritize');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Priorit');
      expect(action?.hasSubmenu).toBe(true);
      expect(action?.submenu).toHaveLength(4); // High, Normal, Low, Forbid
    });

    it('should include Formation action with submenu', () => {
      const action = registry.get('formation');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Formation');
      expect(action?.hasSubmenu).toBe(true);
      expect(action?.submenu?.some(item => item.label.includes('Line'))).toBe(true);
      expect(action?.submenu?.some(item => item.label.includes('Column'))).toBe(true);
      expect(action?.submenu?.some(item => item.label.includes('Circle'))).toBe(true);
      expect(action?.submenu?.some(item => item.label.includes('Spread'))).toBe(true);
    });

    it('should include Create Group action', () => {
      const action = registry.get('create_group');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Group');
    });

    it('should include Scatter action', () => {
      const action = registry.get('scatter');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Scatter');
    });

    it('should include Place Waypoint action', () => {
      const action = registry.get('place_waypoint');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Waypoint');
    });

    it('should include Focus Camera action', () => {
      const action = registry.get('focus_camera');
      expect(action).toBeDefined();
      expect(action?.label).toContain('Focus');
    });

    it('should include Tile Info action', () => {
      const action = registry.get('tile_info');
      expect(action).toBeDefined();
      expect(action?.label).toBe('Inspect Position');
    });
  });

  describe('action shortcuts', () => {
    it('should assign unique shortcuts to actions', () => {
      const actions = registry.getAll();
      const shortcuts = actions
        .filter(a => a.shortcut)
        .map(a => a.shortcut);

      const uniqueShortcuts = new Set(shortcuts);
      expect(uniqueShortcuts.size).toBe(shortcuts.length);
    });

    it('should map M to move action', () => {
      const action = registry.get('move_here');
      expect(action?.shortcut?.toLowerCase()).toBe('m');
    });

    it('should map F to follow action', () => {
      const action = registry.get('follow');
      expect(action?.shortcut?.toLowerCase()).toBe('f');
    });

    it('should map I to inspect action', () => {
      const action = registry.get('inspect');
      expect(action?.shortcut?.toLowerCase()).toBe('i');
    });

    it('should map B to build action', () => {
      const action = registry.get('build');
      expect(action?.shortcut?.toLowerCase()).toBe('b');
    });

    it('should map H to harvest action', () => {
      const action = registry.get('harvest');
      expect(action?.shortcut?.toLowerCase()).toBe('h');
    });
  });

  describe('error handling', () => {
    it('should throw when creating registry without world', () => {
      expect(() => {
        new ContextActionRegistry(null as any, eventBus);
      }).toThrow('world');
    });

    it('should throw when creating registry without eventBus', () => {
      expect(() => {
        new ContextActionRegistry(world, null as any);
      }).toThrow('eventBus');
    });

    it('should throw when action execute function is missing', () => {
      expect(() => {
        registry.register({
          id: 'invalid_exec_test',
          label: 'Invalid',
          icon: 'icon',
          // Missing execute
          isApplicable: () => true
        } as any);
      }).toThrow('execute');
    });

    it('should throw when action isApplicable function is missing', () => {
      expect(() => {
        registry.register({
          id: 'invalid_applicable_test',
          label: 'Invalid',
          icon: 'icon',
          execute: vi.fn()
          // Missing isApplicable
        } as any);
      }).toThrow('isApplicable');
    });
  });
});
