/**
 * ContextActionRegistry - Registry of available context menu actions
 *
 * Manages action definitions, filtering, and execution.
 */

import type { World } from '@ai-village/core';
import type { EventBus } from '@ai-village/core';
import type { MenuContext } from './MenuContext.js';
import type { ContextAction } from './types.js';

/**
 * Registry for context menu actions.
 */
export class ContextActionRegistry {
  private actions: Map<string, ContextAction> = new Map();
  private world: World;
  private eventBus: EventBus;

  constructor(world: World, eventBus: EventBus) {
    if (!world) {
      throw new Error('ContextActionRegistry requires valid world');
    }
    if (!eventBus) {
      throw new Error('ContextActionRegistry requires valid eventBus');
    }
    this.world = world;
    this.eventBus = eventBus;
    this.registerDefaultActions();
  }

  /**
   * Register a new action.
   */
  register(action: ContextAction): void {
    if (!action.id) {
      throw new Error('Action missing required field: id');
    }
    if (!action.label) {
      throw new Error('Action missing required field: label');
    }
    if (!action.isApplicable) {
      throw new Error('Action missing required field: isApplicable');
    }
    if (!action.hasSubmenu && !action.execute) {
      throw new Error('Action missing required field: execute (or hasSubmenu must be true)');
    }
    if (this.actions.has(action.id)) {
      throw new Error(`Action with duplicate ID already registered: ${action.id}`);
    }
    this.actions.set(action.id, action);
  }

  /**
   * Get action by ID.
   */
  get(id: string): ContextAction | undefined {
    return this.actions.get(id);
  }

  /**
   * Get all registered actions.
   */
  getAll(): ContextAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Get actions filtered by applicability to context.
   */
  getApplicableActions(context: MenuContext): ContextAction[] {
    return this.getAll().filter(action => action.isApplicable(context));
  }

  /**
   * Get actions by category.
   */
  getActionsByCategory(category: string): ContextAction[] {
    return this.getAll().filter(action => action.category === category);
  }

  /**
   * Execute an action.
   */
  execute(actionId: string, context: MenuContext): void {
    const action = this.actions.get(actionId);
    if (!action) {
      const submenuAction = this.findSubmenuAction(actionId);
      if (submenuAction) {
        return this.executeSubmenuAction(submenuAction, context);
      }
      throw new Error(`Cannot execute non-existent action: ${actionId}`);
    }

    try {
      if (action.execute) {
        action.execute(context, this.world, this.eventBus);
      }
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: { actionId, success: true },
      } as Parameters<EventBus['emit']>[0]);
    } catch (error) {
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: {
          actionId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      } as Parameters<EventBus['emit']>[0]);
      throw error;
    }
  }

  /**
   * Find a submenu action by ID.
   */
  private findSubmenuAction(actionId: string): ContextAction | null {
    for (const action of Array.from(this.actions.values())) {
      if (action.submenu) {
        const submenuAction = action.submenu.find(a => a.id === actionId);
        if (submenuAction) return submenuAction;
      }
    }
    return null;
  }

  /**
   * Execute a submenu action.
   */
  private executeSubmenuAction(action: ContextAction, context: MenuContext): void {
    try {
      if (action.execute) {
        action.execute(context, this.world, this.eventBus);
      }
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: { actionId: action.id, success: true },
      } as Parameters<EventBus['emit']>[0]);
    } catch (error) {
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: {
          actionId: action.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      } as Parameters<EventBus['emit']>[0]);
      throw error;
    }
  }

  // ============================================================================
  // Default Actions
  // ============================================================================

  private registerDefaultActions(): void {
    this.registerAgentActions();
    this.registerBuildingActions();
    this.registerResourceActions();
    this.registerEmptyTileActions();
    this.registerSelectionActions();
  }

  private registerAgentActions(): void {
    this.register({
      id: 'move_here',
      label: 'Move Here',
      icon: 'move',
      shortcut: 'M',
      category: 'movement',
      isApplicable: (ctx) => ctx.hasSelection() && ctx.isWalkable,
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:move', source: 'world', data: { target: ctx.worldPosition, entities: ctx.selectedEntities } } as Parameters<EventBus['emit']>[0]);
      },
    });

    this.register({
      id: 'follow',
      label: 'Follow',
      icon: 'follow',
      shortcut: 'F',
      category: 'agent',
      isApplicable: (ctx) => ctx.targetType === 'agent' && ctx.hasSelection(),
      execute: (ctx, world, eventBus) => {
        const selected = ctx.getSelectedEntities(world);
        const firstSelected = selected[0];
        if (firstSelected) {
          eventBus.emit({ type: 'action:follow', source: 'world', data: { followerId: firstSelected.id, targetId: ctx.targetEntity } } as Parameters<EventBus['emit']>[0]);
        }
      },
    });

    this.register({
      id: 'talk_to',
      label: 'Talk To',
      icon: 'chat',
      shortcut: 'T',
      category: 'social',
      isApplicable: (ctx) => ctx.targetType === 'agent',
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'conversation:started', source: 'world', data: { participants: ctx.targetEntity ? [ctx.targetEntity] : [], initiator: ctx.targetEntity || '' } } as Parameters<EventBus['emit']>[0]);
      },
    });

    this.register({
      id: 'inspect',
      label: 'Inspect',
      icon: 'inspect',
      shortcut: 'I',
      category: 'info',
      isApplicable: (ctx) => ctx.targetEntity !== null,
      execute: (ctx, _world, eventBus) => {
        const panelType = ctx.targetType === 'agent' ? 'agent_info' :
          ctx.targetType === 'building' ? 'building_info' : 'entity_info';
        eventBus.emit({ type: 'ui:panel:open', source: 'world', data: { panelType, entityId: ctx.targetEntity } } as Parameters<EventBus['emit']>[0]);
      },
    });
  }

  private registerBuildingActions(): void {
    this.register({
      id: 'enter',
      label: 'Enter',
      icon: 'door',
      shortcut: 'E',
      category: 'building',
      isApplicable: (ctx) => {
        if (ctx.targetType !== 'building' || !ctx.hasSelection()) return false;
        const building = ctx.getTargetEntity(this.world);
        if (!building) return false;
        const buildingComp = building.getComponent('building') as { canEnter?: boolean; locked?: boolean } | undefined;
        return !!(buildingComp && buildingComp.canEnter === true && buildingComp.locked !== true);
      },
      execute: (ctx, world, eventBus) => {
        const selected = ctx.getSelectedEntities(world);
        const firstSelected = selected[0];
        if (firstSelected) {
          eventBus.emit({ type: 'action:enter_building', source: 'world', data: { agentId: firstSelected.id, buildingId: ctx.targetEntity } } as Parameters<EventBus['emit']>[0]);
        }
      },
    });

    this.register({
      id: 'repair',
      label: 'Repair',
      icon: 'hammer',
      shortcut: 'R',
      category: 'building',
      isApplicable: (ctx) => {
        if (ctx.targetType !== 'building') return false;
        const building = ctx.getTargetEntity(this.world);
        if (!building) return false;
        const buildingComp = building.getComponent('building') as { health?: number } | undefined;
        return !!(buildingComp && buildingComp.health !== undefined && buildingComp.health < 1.0);
      },
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:repair', source: 'world', data: { buildingId: ctx.targetEntity } } as Parameters<EventBus['emit']>[0]);
      },
    });

    this.register({
      id: 'demolish',
      label: 'Demolish',
      icon: 'demolish',
      shortcut: 'D',
      category: 'building',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to demolish this building?',
      consequences: ['Building will be removed', 'Materials may be recovered'],
      isApplicable: (ctx) => ctx.targetType === 'building',
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:demolish', source: 'world', data: { buildingId: ctx.targetEntity } } as Parameters<EventBus['emit']>[0]);
      },
    });
  }

  private registerResourceActions(): void {
    this.register({
      id: 'harvest',
      label: 'Harvest',
      icon: 'harvest',
      shortcut: 'H',
      category: 'gathering',
      isApplicable: (ctx) => {
        if (ctx.targetType !== 'resource') return false;
        const resource = ctx.getTargetEntity(this.world);
        if (!resource) return false;
        const harvestable = resource.getComponent('harvestable') as { amount?: number; resourceType?: string } | undefined;
        return !!(harvestable && harvestable.amount !== undefined && harvestable.amount > 0);
      },
      execute: (ctx, world, eventBus) => {
        const resource = ctx.getTargetEntity(world);
        const harvestable = resource ? resource.getComponent('harvestable') as { resourceType?: string } | undefined : undefined;
        eventBus.emit({ type: 'action:harvest', source: 'world', data: { plantId: ctx.targetEntity ?? undefined, speciesId: harvestable?.resourceType ?? undefined } } as Parameters<EventBus['emit']>[0]);
      },
    });

    this.register({
      id: 'assign_worker',
      label: 'Assign Worker',
      icon: 'assign',
      shortcut: 'A',
      category: 'gathering',
      isApplicable: (ctx) => ctx.targetType === 'resource' && ctx.hasSelection(),
      execute: (ctx, world, eventBus) => {
        const selected = ctx.getSelectedEntities(world);
        const firstSelected = selected[0];
        if (firstSelected) {
          eventBus.emit({ type: 'action:assign_worker', source: 'world', data: { workerId: firstSelected.id, buildingId: ctx.targetEntity } } as Parameters<EventBus['emit']>[0]);
        }
      },
    });

    this.register({
      id: 'prioritize',
      label: 'Prioritize',
      icon: 'priority',
      shortcut: 'P',
      category: 'gathering',
      hasSubmenu: true,
      submenu: [
        {
          id: 'priority_high', label: 'High Priority', icon: 'priority_high',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'action:set_priority', source: 'world', data: { resourceId: ctx.targetEntity, priority: 'high' } } as Parameters<EventBus['emit']>[0]); },
        },
        {
          id: 'priority_normal', label: 'Normal Priority', icon: 'priority_normal',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'action:set_priority', source: 'world', data: { resourceId: ctx.targetEntity, priority: 'normal' } } as Parameters<EventBus['emit']>[0]); },
        },
        {
          id: 'priority_low', label: 'Low Priority', icon: 'priority_low',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'action:set_priority', source: 'world', data: { resourceId: ctx.targetEntity, priority: 'low' } } as Parameters<EventBus['emit']>[0]); },
        },
        {
          id: 'priority_forbid', label: 'Forbid', icon: 'priority_forbid',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'action:set_priority', source: 'world', data: { resourceId: ctx.targetEntity, priority: 'forbid' } } as Parameters<EventBus['emit']>[0]); },
        },
      ],
      isApplicable: (ctx) => ctx.targetType === 'resource',
    });

    this.register({
      id: 'info',
      label: 'Info',
      icon: 'info',
      category: 'info',
      isApplicable: (ctx) => ctx.targetEntity !== null,
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'ui:panel:open', source: 'world', data: { panelType: 'resource_info', entityId: ctx.targetEntity } } as Parameters<EventBus['emit']>[0]);
      },
    });
  }

  private registerEmptyTileActions(): void {
    this.register({
      id: 'build',
      label: 'Build',
      icon: 'build',
      shortcut: 'B',
      category: 'construction',
      hasSubmenu: true,
      submenu: [
        {
          id: 'build_residential', label: 'Residential Buildings', icon: 'house',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'ui:building_placement:open', source: 'world', data: { position: ctx.worldPosition } } as Parameters<EventBus['emit']>[0]); },
        },
        {
          id: 'build_production', label: 'Production Buildings', icon: 'factory',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'ui:building_placement:open', source: 'world', data: { position: ctx.worldPosition } } as Parameters<EventBus['emit']>[0]); },
        },
      ],
      isApplicable: (ctx) => ctx.targetType === 'empty_tile' && ctx.isBuildable,
    });

    this.register({
      id: 'place_waypoint',
      label: 'Place Waypoint',
      icon: 'waypoint',
      shortcut: 'W',
      category: 'navigation',
      isApplicable: (ctx) => ctx.targetType === 'empty_tile',
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:place_waypoint', source: 'world', data: { position: ctx.worldPosition } } as Parameters<EventBus['emit']>[0]);
      },
    });

    this.register({
      id: 'focus_camera',
      label: 'Focus Camera',
      icon: 'camera',
      shortcut: 'C',
      category: 'camera',
      isApplicable: () => true,
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'camera:focus', source: 'world', data: { position: ctx.worldPosition } } as Parameters<EventBus['emit']>[0]);
      },
    });

    this.register({
      id: 'tile_info',
      label: 'Inspect Position',
      icon: 'info',
      category: 'info',
      isApplicable: () => true,
      execute: (_ctx, _world, eventBus) => {
        eventBus.emit({ type: 'ui:panel:open', source: 'world', data: { panelType: 'tile_inspector' } } as Parameters<EventBus['emit']>[0]);
      },
    });
  }

  private registerSelectionActions(): void {
    this.register({
      id: 'move_all_here',
      label: 'Move All Here',
      icon: 'move_all',
      category: 'movement',
      isApplicable: (ctx) => ctx.hasSelection() && ctx.isWalkable && ctx.targetType === 'empty_tile',
      execute: (ctx, world, eventBus) => {
        const selected = ctx.getSelectedEntities(world);
        eventBus.emit({ type: 'action:move', source: 'world', data: { target: ctx.worldPosition, entities: selected.map(e => e.id) } } as Parameters<EventBus['emit']>[0]);
      },
    });

    this.register({
      id: 'create_group',
      label: 'Create Group',
      icon: 'group',
      shortcut: 'G',
      category: 'selection',
      isApplicable: (ctx) => ctx.getSelectedCount() > 1,
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:create_group', source: 'world', data: { entities: ctx.selectedEntities } } as Parameters<EventBus['emit']>[0]);
      },
    });

    this.register({
      id: 'scatter',
      label: 'Scatter',
      icon: 'scatter',
      category: 'movement',
      isApplicable: (ctx) => ctx.hasSelection() && ctx.targetType === 'empty_tile',
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:move', source: 'world', data: { target: ctx.worldPosition, entities: ctx.selectedEntities } } as Parameters<EventBus['emit']>[0]);
      },
    });

    this.register({
      id: 'formation',
      label: 'Formation',
      icon: 'formation',
      category: 'movement',
      hasSubmenu: true,
      submenu: [
        {
          id: 'formation_line', label: 'Line Formation', icon: 'formation_line',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'action:set_formation', source: 'world', data: { groupId: ctx.selectedEntities[0] || '', formation: 'line' } } as Parameters<EventBus['emit']>[0]); },
        },
        {
          id: 'formation_column', label: 'Column Formation', icon: 'formation_column',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'action:set_formation', source: 'world', data: { groupId: ctx.selectedEntities[0] || '', formation: 'column' } } as Parameters<EventBus['emit']>[0]); },
        },
        {
          id: 'formation_circle', label: 'Circle Formation', icon: 'formation_circle',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'action:set_formation', source: 'world', data: { groupId: ctx.selectedEntities[0] || '', formation: 'circle' } } as Parameters<EventBus['emit']>[0]); },
        },
        {
          id: 'formation_spread', label: 'Spread Formation', icon: 'formation_spread',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => { eventBus.emit({ type: 'action:set_formation', source: 'world', data: { groupId: ctx.selectedEntities[0] || '', formation: 'spread' } } as Parameters<EventBus['emit']>[0]); },
        },
      ],
      isApplicable: (ctx) => ctx.getSelectedCount() > 1,
    });
  }
}
