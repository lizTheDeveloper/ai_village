/**
 * ContextActionRegistry - Registry of available context menu actions
 *
 * Manages action definitions, filtering, and execution.
 */

import { EntityImpl } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { EventBus } from '@ai-village/core';
import type { MenuContext } from './MenuContext.js';
import type { ContextAction } from './types.js';

// Component interfaces for type safety
interface BuildingComponent {
  canEnter?: boolean;
  locked?: boolean;
  health?: number;
}

interface HarvestableComponent {
  amount?: number;
  resourceType?: string;
}

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

    // Register default actions
    this.registerDefaultActions();
  }

  /**
   * Register a new action.
   */
  public register(action: ContextAction): void {
    // Validate required fields
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

    // Check for duplicates
    if (this.actions.has(action.id)) {
      throw new Error(`Action with duplicate ID already registered: ${action.id}`);
    }

    this.actions.set(action.id, action);
  }

  /**
   * Get action by ID.
   */
  public get(id: string): ContextAction | undefined {
    return this.actions.get(id);
  }

  /**
   * Get all registered actions.
   */
  public getAll(): ContextAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Get actions filtered by applicability to context.
   */
  public getApplicableActions(context: MenuContext): ContextAction[] {
    return this.getAll().filter(action => action.isApplicable(context));
  }

  /**
   * Get actions by category.
   */
  public getActionsByCategory(category: string): ContextAction[] {
    return this.getAll().filter(action => action.category === category);
  }

  /**
   * Execute an action.
   */
  public execute(actionId: string, context: MenuContext): void {
    const action = this.actions.get(actionId);

    // If action not found in registry, check if it's a submenu action
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

      // Emit success event
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: {
          actionId,
          success: true
        }
      });
    } catch (error) {
      // Emit failure event
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: {
          actionId,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      // Re-throw error
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

      // Emit success event
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: {
          actionId: action.id,
          success: true
        }
      });
    } catch (error) {
      // Emit failure event
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: {
          actionId: action.id,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      // Re-throw error
      throw error;
    }
  }

  // ============================================================================
  // Default Actions
  // ============================================================================

  private registerDefaultActions(): void {
    // Agent actions
    this.registerAgentActions();

    // Building actions
    this.registerBuildingActions();

    // Resource actions
    this.registerResourceActions();

    // Empty tile actions
    this.registerEmptyTileActions();

    // Selection actions
    this.registerSelectionActions();
  }

  private registerAgentActions(): void {
    // Move Here
    this.register({
      id: 'move_here',
      label: 'Move Here',
      icon: 'move',
      shortcut: 'M',
      category: 'movement',
      isApplicable: (ctx) => ctx.hasSelection() && ctx.isWalkable,
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:move', source: 'world', data: {
          target: ctx.worldPosition,
          entities: ctx.selectedEntities
        } });
      }
    });

    // Follow
    this.register({
      id: 'follow',
      label: 'Follow',
      icon: 'follow',
      shortcut: 'F',
      category: 'agent',
      isApplicable: (ctx) => ctx.targetType === 'agent' && ctx.hasSelection(),
      execute: (ctx, _world, eventBus) => {
        const selected = ctx.getSelectedEntities(_world);
        const firstSelected = selected[0];
        if (firstSelected) {
          eventBus.emit({ type: 'action:follow', source: 'world', data: {
            followerId: firstSelected.id,
            targetId: ctx.targetEntity
          } });
        }
      }
    });

    // Talk To
    this.register({
      id: 'talk_to',
      label: 'Talk To',
      icon: 'chat',
      shortcut: 'T',
      category: 'social',
      isApplicable: (ctx) => ctx.targetType === 'agent',
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'conversation:started', source: 'world', data: {
          participants: ctx.targetEntity ? [ctx.targetEntity] : [],
          initiator: ctx.targetEntity || ''
        } });
      }
    });

    // Inspect
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

        eventBus.emit({ type: 'ui:panel:open', source: 'world', data: {
          panelType,
          entityId: ctx.targetEntity
        } });
      }
    });
  }

  private registerBuildingActions(): void {
    // Enter
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

        const buildingComp = (building as EntityImpl).getComponent('building') as BuildingComponent | undefined;
        return !!(buildingComp && buildingComp.canEnter === true && buildingComp.locked !== true);
      },
      execute: (ctx, _world, eventBus) => {
        const selected = ctx.getSelectedEntities(_world);
        const firstSelected = selected[0];
        if (firstSelected) {
          eventBus.emit({ type: 'action:enter_building', source: 'world', data: {
            agentId: firstSelected.id,
            buildingId: ctx.targetEntity
          } });
        }
      }
    });

    // Repair
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

        const buildingComp = (building as EntityImpl).getComponent('building') as BuildingComponent | undefined;
        return !!(buildingComp && buildingComp.health !== undefined && buildingComp.health < 1.0);
      },
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:repair', source: 'world', data: {
          buildingId: ctx.targetEntity
        } });
      }
    });

    // Demolish
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
        eventBus.emit({ type: 'action:demolish', source: 'world', data: {
          buildingId: ctx.targetEntity
        } });
      }
    });
  }

  private registerResourceActions(): void {
    // Harvest
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

        const harvestable = (resource as EntityImpl).getComponent('harvestable') as HarvestableComponent | undefined;
        return !!(harvestable && harvestable.amount !== undefined && harvestable.amount > 0);
      },
      execute: (ctx, _world, eventBus) => {
        const resource = ctx.getTargetEntity(_world);
        const harvestable = resource ? (resource as EntityImpl).getComponent('harvestable') as HarvestableComponent | undefined : undefined;

        eventBus.emit({ type: 'action:harvest', source: 'world', data: {
          plantId: ctx.targetEntity ?? undefined,
          speciesId: harvestable?.resourceType ?? undefined
        } });
      }
    });

    // Assign Worker
    this.register({
      id: 'assign_worker',
      label: 'Assign Worker',
      icon: 'assign',
      shortcut: 'A',
      category: 'gathering',
      isApplicable: (ctx) => ctx.targetType === 'resource' && ctx.hasSelection(),
      execute: (ctx, _world, eventBus) => {
        const selected = ctx.getSelectedEntities(_world);
        const firstSelected = selected[0];
        if (firstSelected) {
          eventBus.emit({ type: 'action:assign_worker', source: 'world', data: {
            workerId: firstSelected.id,
            buildingId: ctx.targetEntity
          } });
        }
      }
    });

    // Prioritize (with submenu)
    this.register({
      id: 'prioritize',
      label: 'Prioritize',
      icon: 'priority',
      shortcut: 'P',
      category: 'gathering',
      hasSubmenu: true,
      submenu: [
        {
          id: 'priority_high',
          label: 'High Priority',
          icon: 'priority_high',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'action:set_priority', source: 'world', data: {
              resourceId: ctx.targetEntity,
              priority: 'high'
            } });
          }
        },
        {
          id: 'priority_normal',
          label: 'Normal Priority',
          icon: 'priority_normal',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'action:set_priority', source: 'world', data: {
              resourceId: ctx.targetEntity,
              priority: 'normal'
            } });
          }
        },
        {
          id: 'priority_low',
          label: 'Low Priority',
          icon: 'priority_low',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'action:set_priority', source: 'world', data: {
              resourceId: ctx.targetEntity,
              priority: 'low'
            } });
          }
        },
        {
          id: 'priority_forbid',
          label: 'Forbid',
          icon: 'priority_forbid',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'action:set_priority', source: 'world', data: {
              resourceId: ctx.targetEntity,
              priority: 'forbid'
            } });
          }
        }
      ],
      isApplicable: (ctx) => ctx.targetType === 'resource'
    });

    // Info
    this.register({
      id: 'info',
      label: 'Info',
      icon: 'info',
      category: 'info',
      isApplicable: (ctx) => ctx.targetEntity !== null,
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'ui:panel:open', source: 'world', data: {
          panelType: 'resource_info',
          entityId: ctx.targetEntity
        } });
      }
    });
  }

  private registerEmptyTileActions(): void {
    // Build (with submenu)
    this.register({
      id: 'build',
      label: 'Build',
      icon: 'build',
      shortcut: 'B',
      category: 'construction',
      hasSubmenu: true,
      submenu: [
        {
          id: 'build_residential',
          label: 'Residential Buildings',
          icon: 'house',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'ui:building_placement:open', source: 'world', data: {
              position: ctx.worldPosition
            } });
          }
        },
        {
          id: 'build_production',
          label: 'Production Buildings',
          icon: 'factory',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'ui:building_placement:open', source: 'world', data: {
              position: ctx.worldPosition
            } });
          }
        }
      ],
      isApplicable: (ctx) => ctx.targetType === 'empty_tile' && ctx.isBuildable
    });

    // Place Waypoint
    this.register({
      id: 'place_waypoint',
      label: 'Place Waypoint',
      icon: 'waypoint',
      shortcut: 'W',
      category: 'navigation',
      isApplicable: (ctx) => ctx.targetType === 'empty_tile',
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:place_waypoint', source: 'world', data: {
          position: ctx.worldPosition
        } });
      }
    });

    // Focus Camera
    this.register({
      id: 'focus_camera',
      label: 'Focus Camera',
      icon: 'camera',
      shortcut: 'C',
      category: 'camera',
      isApplicable: () => true,
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'camera:focus', source: 'world', data: {
          position: ctx.worldPosition
        } });
      }
    });

    // Tile Info - ALWAYS show this to ensure menu never fails to open
    this.register({
      id: 'tile_info',
      label: 'Inspect Position',
      icon: 'info',
      category: 'info',
      isApplicable: () => true, // Always show - provides fallback for debugging
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'ui:panel:open', source: 'world', data: {
          panelType: 'tile_inspector'
        } });
      }
    });
  }

  private registerSelectionActions(): void {
    // Move All Here
    this.register({
      id: 'move_all_here',
      label: 'Move All Here',
      icon: 'move_all',
      category: 'movement',
      isApplicable: (ctx) => ctx.hasSelection() && ctx.isWalkable && ctx.targetType === 'empty_tile',
      execute: (ctx, _world, eventBus) => {
        // Emit move action for each selected entity
        const selected = ctx.getSelectedEntities(_world);
        eventBus.emit({ type: 'action:move', source: 'world', data: {
          target: ctx.worldPosition,
          entities: selected.map(e => e.id)
        } });
      }
    });

    // Create Group
    this.register({
      id: 'create_group',
      label: 'Create Group',
      icon: 'group',
      shortcut: 'G',
      category: 'selection',
      isApplicable: (ctx) => ctx.getSelectedCount() > 1,
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:create_group', source: 'world', data: {
          entities: ctx.selectedEntities
        } });
      }
    });

    // Scatter
    this.register({
      id: 'scatter',
      label: 'Scatter',
      icon: 'scatter',
      category: 'movement',
      isApplicable: (ctx) => ctx.hasSelection() && ctx.targetType === 'empty_tile',
      execute: (ctx, _world, eventBus) => {
        eventBus.emit({ type: 'action:move', source: 'world', data: {
          target: ctx.worldPosition,
          entities: ctx.selectedEntities
        } });
      }
    });

    // Formation (with submenu)
    this.register({
      id: 'formation',
      label: 'Formation',
      icon: 'formation',
      category: 'movement',
      hasSubmenu: true,
      submenu: [
        {
          id: 'formation_line',
          label: 'Line Formation',
          icon: 'formation_line',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'action:set_formation', source: 'world', data: {
              groupId: ctx.selectedEntities[0] || '',
              formation: 'line'
            } });
          }
        },
        {
          id: 'formation_column',
          label: 'Column Formation',
          icon: 'formation_column',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'action:set_formation', source: 'world', data: {
              groupId: ctx.selectedEntities[0] || '',
              formation: 'column'
            } });
          }
        },
        {
          id: 'formation_circle',
          label: 'Circle Formation',
          icon: 'formation_circle',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'action:set_formation', source: 'world', data: {
              groupId: ctx.selectedEntities[0] || '',
              formation: 'circle'
            } });
          }
        },
        {
          id: 'formation_spread',
          label: 'Spread Formation',
          icon: 'formation_spread',
          isApplicable: () => true,
          execute: (ctx, _world, eventBus) => {
            eventBus.emit({ type: 'action:set_formation', source: 'world', data: {
              groupId: ctx.selectedEntities[0] || '',
              formation: 'spread'
            } });
          }
        }
      ],
      isApplicable: (ctx) => ctx.getSelectedCount() > 1
    });
  }
}
